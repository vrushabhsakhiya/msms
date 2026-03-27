from django.contrib import admin
from django.contrib.auth.models import Group
from django.contrib import messages
from django.utils.html import format_html
from .models import User, Shop, UserRole, SystemSettings
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

# ── Customize Admin Site Branding ──────────────────────────────────────────

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('product_name',)
    
    def has_add_permission(self, request):
        return not SystemSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

# ── Customize Admin Site Branding ──────────────────────────────────────────
admin.site.site_header  = "MSMS Super Admin"
admin.site.site_title   = "MSMS Admin"
admin.site.index_title  = "Pharmacy Registration Requests"

# ── Hide built-in Group and Auth Token models (cleanup interface) ─────────────────────────────────
admin.site.unregister(Group)

try:
    admin.site.unregister(OutstandingToken)
    admin.site.unregister(BlacklistedToken)
except admin.sites.NotRegistered:
    pass

# ── Admin Actions ──────────────────────────────────────────────────────────
@admin.action(description="🗑️ Purge Orphaned Users (Free up emails)")
def purge_orphaned_users(modeladmin, request, queryset):
    """Deletes users who are NOT linked to any shop and are NOT superusers."""
    orphans = queryset.filter(shop__isnull=True, is_superuser=False)
    count = orphans.count()
    orphans.delete()
    messages.success(request, f"Successfully deleted {count} orphaned user accounts. Those emails are now free to reuse.")


@admin.action(description="✅ Approve selected pharmacies")
def approve_pharmacies(modeladmin, request, queryset):
    updated = queryset.update(status=Shop.STATUS_APPROVED)
    messages.success(request, f"{updated} pharmacy/ies approved. They can now login.")


@admin.action(description="❌ Reject & DELETE — permanently remove pharmacy and all users")
def reject_and_delete_pharmacies(modeladmin, request, queryset):
    """
    Permanently deletes the shop AND all its users (cascaded via ForeignKey).
    This action is IRREVERSIBLE.
    """
    count = queryset.count()
    # Cascade: User.shop ForeignKey has on_delete=CASCADE,
    # so all users of this shop are deleted automatically.
    queryset.delete()
    messages.error(
        request,
        f"{count} pharmacy/ies and ALL associated staff accounts permanently deleted. "
        f"This action cannot be undone."
    )


@admin.action(description="⏸ Suspend — block login but keep data")
def suspend_pharmacies(modeladmin, request, queryset):
    updated = queryset.update(status=Shop.STATUS_CANCELLED)
    messages.warning(request, f"{updated} pharmacy/ies suspended. Login blocked but data retained.")


@admin.action(description="🔄 Reset to Pending")
def reset_to_pending(modeladmin, request, queryset):
    updated = queryset.update(status=Shop.STATUS_PENDING)
    messages.info(request, f"{updated} pharmacy/ies reset to pending review.")



# ── Shop Admin (Only thing visible) ───────────────────────────────────────
@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    # List view columns
    list_display  = (
        'name', 'owner_name', 'contact_number',
        'staff_limit', 'status_badge', 'created_at'
    )
    list_filter   = ('status', 'created_at')
    search_fields = ('name', 'owner_name', 'license_number', 'contact_number')
    readonly_fields = ('created_at',)
    ordering      = ('-created_at',)  # Most recent first
    actions       = [approve_pharmacies, reject_and_delete_pharmacies, suspend_pharmacies, reset_to_pending]

    # Detail view layout
    fieldsets = (
        ('📋 Pharmacy Information', {
            'fields': (
                'name', 'owner_name', 'address',
                'contact_number', 'license_number', 'created_at'
            )
        }),
        ('⚙️ Configuration', {
            'fields': ('staff_limit',),
            'description': 'Limit how many staff members the pharmacy owner can create.',
        }),
        ('🔐 Registration Status', {
            'fields': ('status', 'admin_note'),
            'classes': ('wide',),
            'description': (
                '⚠️ Set status to "Approved" to grant login access. '
                '"Cancelled" blocks login permanently.'
            ),
        }),
    )

    def status_badge(self, obj):
        styles = {
            'pending':   ('#92400e', '#fef3c7', '⏳'),
            'approved':  ('#14532d', '#dcfce7', '✅'),
            'cancelled': ('#7f1d1d', '#fee2e2', '❌'),
        }
        color, bg, icon = styles.get(obj.status, ('#374151', '#f3f4f6', '?'))
        return format_html(
            '<span style="background:{bg};color:{color};padding:4px 12px;'
            'border-radius:20px;font-size:0.78rem;font-weight:700;">'
            '{icon} {label}</span>',
            bg=bg, color=color, icon=icon, label=obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    # Override to make admin note prominent in the change list
    def get_queryset(self, request):
        return super().get_queryset(request)


# ── User Admin ───────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'mobile', 'role', 'shop', 'is_active', 'date_joined')
    list_filter = ('is_active', 'shop')
    search_fields = ('username', 'email', 'mobile', 'full_name')
    ordering = ('-date_joined',)
    actions = [purge_orphaned_users]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Superadmin sees only Shop Owners ('admin' role) to prevent clutter with normal staff
        if request.user.is_superuser:
            return qs.filter(role='admin')
        return qs


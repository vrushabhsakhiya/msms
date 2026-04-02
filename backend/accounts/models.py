from django.contrib.auth.models import AbstractUser
from django.db import models

class Shop(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Approval'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_CANCELLED, 'Cancelled / Rejected'),
    ]

    name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='shop_logos/', null=True, blank=True)
    address = models.TextField()
    contact_number = models.CharField(max_length=15)
    license_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    staff_limit = models.IntegerField(default=5, help_text="Maximum allowed staff users for this shop (Admin controlled)")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_note = models.TextField(blank=True, help_text='Internal note for approval/rejection reason')
    updated_at = models.DateTimeField(auto_now=True)

    def is_approved(self):
        return self.status == self.STATUS_APPROVED

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"

class SystemSettings(models.Model):
    product_name = models.CharField(max_length=100, default='Pharmly')
    logo = models.ImageField(upload_to='branding/', null=True, blank=True)
    
    class Meta:
        verbose_name = "Branding Settings"
        verbose_name_plural = "Branding Settings"

    def save(self, *args, **kwargs):
        self.pk = 1 # Ensure only one record exists
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "System Branding Settings"

class UserRole(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='roles', null=True)
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    
    # Medicine Permissions
    can_view_medicine = models.BooleanField(default=True)
    can_add_medicine = models.BooleanField(default=False)
    can_edit_medicine = models.BooleanField(default=False)
    can_delete_medicine = models.BooleanField(default=False)
    
    # Sales Permissions
    can_view_sales = models.BooleanField(default=True)
    can_create_bill = models.BooleanField(default=True)
    can_edit_bill = models.BooleanField(default=False)
    can_delete_bill = models.BooleanField(default=False)
    
    # Reports Permissions
    can_view_reports = models.BooleanField(default=False)
    can_generate_reports = models.BooleanField(default=False)
    can_edit_reports = models.BooleanField(default=False)
    can_delete_reports = models.BooleanField(default=False)
    
    # Purchase Permissions
    can_view_purchases = models.BooleanField(default=False)
    can_add_purchase = models.BooleanField(default=False)
    can_edit_purchase = models.BooleanField(default=False)
    can_delete_purchase = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('shop', 'name')

    def __str__(self):
        return f"{self.name} ({self.shop.name if self.shop else 'Global'})"

class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Store Manager'),
        ('pharmacist', 'Pharmacist'),
        ('cashier', 'Cashier'),
        ('staff', 'General Staff'),
    )

    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    custom_role = models.ForeignKey(UserRole, on_delete=models.SET_NULL, null=True, blank=True)
    mobile = models.CharField(max_length=15, unique=True, null=True, blank=True)
    
    # Fields for MSMS Spec 3: User Management & Authentication
    full_name = models.CharField(max_length=100, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} @ {self.shop.name if self.shop else 'System'}"

class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action_type = models.CharField(max_length=50) # CREATE/UPDATE/DELETE
    module_name = models.CharField(max_length=50)
    record_id = models.IntegerField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action_type} - {self.module_name} ({self.created_at})"

class ResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    failed_attempts = models.IntegerField(default=0)

    def is_valid(self):
        from django.utils import timezone
        import datetime
        # Valid for 10 minutes
        expiry = self.created_at + datetime.timedelta(minutes=10)
        return not self.is_used and timezone.now() < expiry

class LoginOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    otp = models.CharField(max_length=8)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    failed_attempts = models.IntegerField(default=0)

    def is_valid(self):
        from django.utils import timezone
        import datetime
        # Valid for exactly 5 minutes
        expiry = self.created_at + datetime.timedelta(minutes=5)
        return not self.is_used and timezone.now() < expiry
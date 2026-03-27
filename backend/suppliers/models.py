from django.db import models
from django.core.validators import RegexValidator

# --- Custom Validators ---
mobile_validator = RegexValidator(
    regex=r'^[6-9][0-9]{9}$',
    message="Mobile number must be exactly 10 digits and start with 6-9."
)

gst_validator = RegexValidator(
    regex=r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$',
    message="Invalid GST number format."
)


class Supplier(models.Model):
    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='suppliers',
        null=True
    )
    
    # ── Basic Info ─────────────────────────────────────────────────────────
    # Optimization: db_index for fast lookups
    supplier_code = models.CharField(max_length=50, db_index=True)
    supplier_name = models.CharField(max_length=200, db_index=True)
    contact_person = models.CharField(max_length=100)
    mobile = models.CharField(max_length=10, validators=[mobile_validator], db_index=True)
    alternate_mobile = models.CharField(max_length=10, blank=True, null=True)
    
    email = models.EmailField(blank=True, null=True, db_index=True)
    gst_number = models.CharField(max_length=15, blank=True, null=True, validators=[gst_validator])
    pan_number = models.CharField(max_length=10, blank=True, null=True)
    
    address_line_1 = models.TextField(default='')
    address_line_2 = models.TextField(blank=True, default='')
    city = models.CharField(max_length=50, blank=True, default='')
    state = models.CharField(max_length=50, blank=True, default='')
    pincode = models.CharField(max_length=6, blank=True, default='')

    # ── Financial / Banking Info ───────────────────────────────────────────
    bank_name = models.CharField(max_length=100, blank=True, default='')
    account_number = models.CharField(max_length=50, blank=True, default='')
    ifsc_code = models.CharField(max_length=20, blank=True, default='')
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit_days = models.IntegerField(default=30)
    
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['supplier_name']
        unique_together = ('shop', 'supplier_code') # Multi-tenant isolation

    def __str__(self):
        return f"{self.supplier_name} ({self.supplier_code})"
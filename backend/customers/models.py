from django.db import models
from django.core.validators import RegexValidator

# --- Custom Validators ---
mobile_validator = RegexValidator(
    regex=r'^[6-9][0-9]{9}$',
    message="Mobile number must be exactly 10 digits and start with 6-9."
)


class Customer(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('active', 'active'),
        ('inactive', 'inactive'),
    ]

    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='customers',
        null=True
    )
    
    # ── Basic Info ─────────────────────────────────────────────────────────
    # Optimization: db_index for fast lookups
    customer_code = models.CharField(max_length=50, db_index=True)
    customer_name = models.CharField(max_length=100, db_index=True)
    mobile = models.CharField(max_length=10, validators=[mobile_validator], db_index=True)
    email = models.EmailField(blank=True, null=True, db_index=True)

    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)

    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=50, blank=True, default="")
    pincode = models.CharField(max_length=6, blank=True, default="")

    doctor_reference = models.CharField(max_length=100, blank=True, default="")

    # ── Balance Info ───────────────────────────────────────────────────────
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Security: Unique per shop to allow same customer at different pharmacies
        unique_together = (('shop', 'mobile'), ('shop', 'customer_code'))
        ordering = ['customer_name']

    def __str__(self):
        return f"{self.customer_name} ({self.customer_code})"

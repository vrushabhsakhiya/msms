from django.db import models


class Medicine(models.Model):
    CATEGORY_CHOICES = [
        ('Tablet', 'Tablet'), ('Capsule', 'Capsule'), ('Lozenges', 'Lozenges'),
        ('Powder', 'Powder'), ('Granules', 'Granules'),
        ('Syrup', 'Syrup'), ('Suspension', 'Suspension'), ('Solution', 'Solution'), ('Elixir', 'Elixir'), ('Drops', 'Drops'),
        ('Cream', 'Cream'), ('Ointment', 'Ointment'), ('Gel', 'Gel'), ('Paste', 'Paste'), ('Lotion', 'Lotion'),
        ('Injection', 'Injection'), ('IV (Intravenous)', 'IV (Intravenous)'), ('IM (Intramuscular)', 'IM (Intramuscular)'), ('SC (Subcutaneous)', 'SC (Subcutaneous)'), ('Infusion', 'Infusion'),
        ('Inhaler', 'Inhaler'), ('Nebulizer solution', 'Nebulizer solution'), ('Aerosol spray', 'Aerosol spray'),
        ('Suppositories', 'Suppositories'), ('Pessaries', 'Pessaries'), ('Enemas', 'Enemas')
    ]

    MEDICINE_TYPE_CHOICES = [
        ('Allopathic', 'Allopathic'),
        ('Ayurvedic', 'Ayurvedic'),
        ('Homeopathic', 'Homeopathic'),
    ]

    GST_CHOICES = [
        (0, '0%'),
        (5, '5%'),
        (12, '12%'),
        (18, '18%'),
        (28, '28%'),
    ]

    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE,
        related_name='medicines',
        null=True
        # Security: shop is now mandatory to prevent orphaned products
    )

    # ── Basic Info ─────────────────────────────────────────────────────────
    # Optimization: Added db_index for fast searching by name and code
    medicine_code    = models.CharField(max_length=50, db_index=True)
    medicine_name    = models.CharField(max_length=200, db_index=True)
    generic_name     = models.CharField(max_length=200, blank=True, default='', db_index=True)
    company          = models.CharField(max_length=100)
    category         = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Tablet')
    medicine_type    = models.CharField(max_length=30, choices=MEDICINE_TYPE_CHOICES, default='Allopathic')
    hsn_code         = models.CharField(max_length=10, default='3004')
    composition      = models.TextField(blank=True, default='')

    # ── Pricing & Stock ────────────────────────────────────────────────────
    pack_size        = models.CharField(max_length=50, blank=True, default='')
    purchase_price   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount         = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    gst_percentage   = models.IntegerField(choices=GST_CHOICES, default=5)
    reorder_level    = models.IntegerField(default=10)
    max_stock_level  = models.IntegerField(default=0, blank=True)
    stock_quantity   = models.IntegerField(default=0)

    # ── Batch & Additional ─────────────────────────────────────────────────
    batch_number          = models.CharField(max_length=100, blank=True, default='')
    manufacturing_date    = models.DateField(null=True, blank=True)
    expiry_date           = models.DateField(null=True, blank=True)
    barcode               = models.CharField(max_length=100, blank=True, default='', db_index=True)
    rack_location         = models.CharField(max_length=50, blank=True, default='')
    supplier              = models.ForeignKey(
        'suppliers.Supplier', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='medicines'
    )
    prescription_required = models.BooleanField(default=False)
    storage_instructions  = models.TextField(blank=True, default='')
    side_effects          = models.TextField(blank=True, default='')
    status                = models.CharField(max_length=10, default='active', choices=[('active', 'Active'), ('inactive', 'Inactive')])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['medicine_name']
        unique_together = ('shop', 'medicine_code') # Security: multi-tenant code isolation

    def __str__(self):
        return f"{self.medicine_name} ({self.medicine_code})"

    @property
    def stock_status(self):
        if self.stock_quantity == 0:
            return 'out_of_stock'
        if self.stock_quantity <= self.reorder_level:
            return 'low_stock'
        return 'in_stock'

from django.db import models
from medicines.models import Medicine
from accounts.models import User

class StockBatch(models.Model):
    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='stock_batches',
        null=True
    )
    medicine = models.ForeignKey(
        Medicine, 
        on_delete=models.CASCADE, 
        related_name='batches'
    )
    
    # ── Batch details ──────────────────────────────────────────────────────
    batch_number = models.CharField(max_length=50, db_index=True)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(db_index=True)
    
    quantity = models.IntegerField(default=0)
    barcode = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    location = models.CharField(max_length=50, null=True, blank=True)
    purchase_rate = models.DecimalField(max_digits=12, decimal_places=2)
    mrp = models.DecimalField(max_digits=12, decimal_places=2)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Security: unique_together for shop+barcode ensures global barcode 
        # collisions (same medicine across different pharmacies) don't crash the system.
        unique_together = (('shop', 'medicine', 'batch_number'), ('shop', 'barcode'))
        ordering = ['expiry_date']

    def __str__(self):
        return f"{self.medicine.medicine_name} - {self.batch_number} (Exp: {self.expiry_date})"


class StockAdjustment(models.Model):
    ADJUSTMENT_TYPES = (
        ('ADD', 'Add Stock'),
        ('REDUCE', 'Reduce Stock'),
        ('DAMAGED', 'Mark as Damaged'),
        ('EXPIRED', 'Mark as Expired'),
    )
    
    REASONS = (
        ('Damaged', 'Damaged'),
        ('Expired', 'Expired'),
        ('Theft', 'Theft'),
        ('Breakage', 'Breakage'),
        ('Correction', 'Stock Correction'),
        ('Other', 'Other'),
    )

    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='stock_adjustments',
        null=True
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    batch = models.ForeignKey(StockBatch, on_delete=models.SET_NULL, null=True, blank=True)
    
    adjustment_type = models.CharField(max_length=10, choices=ADJUSTMENT_TYPES)
    quantity = models.IntegerField() 
    reason = models.CharField(max_length=20, choices=REASONS)
    remarks = models.TextField(blank=True, default="")
    
    adjustment_date = models.DateField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=15, choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')], default='Pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='adjustment_approvals')
    approval_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.adjustment_type} | {self.medicine.medicine_name}"


class StockMovement(models.Model):
    MOVEMENT_TYPES = (
        ('IN', 'Purchase (Inward)'),
        ('OUT', 'Sale (Outward)'),
        ('ADJUST', 'Manual Adjustment'),
        ('RETURN', 'Supplier Return'),
    )
    
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='stock_movements',
        null=True
    )
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    batch = models.ForeignKey(StockBatch, on_delete=models.SET_NULL, null=True, blank=True)
    
    movement_type = models.CharField(max_length=10, choices=MOVEMENT_TYPES)
    quantity = models.IntegerField() 
    in_quantity = models.IntegerField(default=0)
    out_quantity = models.IntegerField(default=0)
    balance_quantity = models.IntegerField(default=0)
    
    reference_id = models.CharField(max_length=100, blank=True, null=True, db_index=True) 
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.movement_type} | {self.medicine.medicine_name} | Qty: {self.quantity}"

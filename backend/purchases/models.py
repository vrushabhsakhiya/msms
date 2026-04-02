from django.db import models
from suppliers.models import Supplier
from medicines.models import Medicine
from accounts.models import User

class Purchase(models.Model):
    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='purchases',
        null=True
    )
    
    # ── Purchase Order details ─────────────────────────────────────────────
    # Optimization: db_index for lookup
    purchase_code = models.CharField(max_length=50, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)

    invoice_number = models.CharField(max_length=100, db_index=True)
    invoice_date = models.DateField(db_index=True)

    # ── Totals ─────────────────────────────────────────────────────────────
    total_items = models.IntegerField()
    total_quantity = models.IntegerField()

    gross_amount = models.DecimalField(max_digits=15, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=15, decimal_places=2)
    net_amount = models.DecimalField(max_digits=15, decimal_places=2)

    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=15, decimal_places=2)

    payment_status = models.CharField(max_length=20)  # paid / pending / partial
    payment_mode = models.CharField(max_length=50, blank=True, null=True)
    
    # ── Status Tracking ───────────────────────────────────────────────────
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled')
    ]
    order_status = models.CharField(max_length=20, default='Delivered', choices=STATUS_CHOICES)
    expected_delivery_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True, default='')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('shop', 'purchase_code')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.purchase_code} | {self.supplier.supplier_name}"

    
class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, related_name='items', on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    batch = models.ForeignKey('inventory.StockBatch', on_delete=models.SET_NULL, null=True, blank=True)

    batch_number = models.CharField(max_length=50)
    expiry_date = models.DateField()

    quantity = models.IntegerField()
    free_quantity = models.IntegerField(default=0)

    purchase_rate = models.DecimalField(max_digits=15, decimal_places=2)
    mrp = models.DecimalField(max_digits=15, decimal_places=2)

    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    amount = models.DecimalField(max_digits=15, decimal_places=2)

    def __str__(self):
        return f"{self.medicine.medicine_name} - {self.batch_number}"

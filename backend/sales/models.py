from django.db import models
from medicines.models import Medicine
from customers.models import Customer
from accounts.models import User

class Sale(models.Model):
    # ── Multi-Tenant Partitioning ──────────────────────────────────────────
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='sales',
        null=True
    )
    
    # ── Invoice Details ───────────────────────────────────────────────────
    # Optimization: db_index for lookup
    invoice_number = models.CharField(max_length=50, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    customer_name = models.CharField(max_length=100, default="Walk-in Customer")
    customer_mobile = models.CharField(max_length=15, blank=True, default="", db_index=True)
    doctor_name = models.CharField(max_length=100, blank=True, default="")

    # ── Totals ─────────────────────────────────────────────────────────────
    total_items = models.IntegerField()
    total_quantity = models.IntegerField()

    gross_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    round_off = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)

    # ── Payment & Tracking ────────────────────────────────────────────────
    payment_mode = models.CharField(max_length=50, default="Cash")
    transaction_id = models.CharField(max_length=100, blank=True, default='')
    reference_number = models.CharField(max_length=100, blank=True, default='')
    amount_received = models.DecimalField(max_digits=12, decimal_places=2)
    return_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    STATUS_CHOICES = [
        ('Final', 'Final'), 
        ('Draft', 'Draft'), 
        ('Hold', 'Hold')
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Final')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Security: Multi-tenant unique constraint for invoice numbers
        unique_together = ('shop', 'invoice_number')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    batch = models.ForeignKey('inventory.StockBatch', on_delete=models.SET_NULL, null=True, blank=True)
    batch_number = models.CharField(max_length=50, blank=True, default="")

    quantity = models.IntegerField()
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.medicine.medicine_name} ({self.batch_number})"


class SaleReturn(models.Model):
    shop = models.ForeignKey(
        'accounts.Shop', 
        on_delete=models.CASCADE, 
        related_name='sale_returns',
        null=True
    )
    sale = models.ForeignKey(Sale, related_name='returns', on_delete=models.CASCADE)
    # Security: Multi-tenant return_number
    return_number = models.CharField(max_length=50, db_index=True)
    
    total_refund_amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True, default="")
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        unique_together = ('shop', 'return_number')

    def __str__(self):
        return self.return_number


class SaleReturnItem(models.Model):
    sale_return = models.ForeignKey(SaleReturn, related_name='items', on_delete=models.CASCADE)
    sale_item = models.ForeignKey(SaleItem, on_delete=models.CASCADE)
    
    return_quantity = models.IntegerField()
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Return for {self.sale_item.medicine.medicine_name}"

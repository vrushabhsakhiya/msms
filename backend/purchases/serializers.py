from decimal import Decimal
from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from inventory.models import StockBatch, StockMovement
from medicines.models import Medicine
from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.ReadOnlyField(source='medicine.medicine_name')

    class Meta:
        model = PurchaseItem
        fields = [
            'id', 'medicine', 'medicine_name', 'batch', 'batch_number', 
            'expiry_date', 'quantity', 'free_quantity', 'purchase_rate', 
            'mrp', 'discount_percentage', 'discount_amount', 'gst_percentage', 
            'gst_amount', 'amount'
        ]
        read_only_fields = ('purchase',)

    def validate_medicine(self, value):
        # Security: Ensure medicine belongs to the shop
        request = self.context.get('request')
        if value and request and hasattr(request, 'user'):
            if value.shop != request.user.shop:
                raise serializers.ValidationError("Invalid medicine for your shop.")
        return value


class PurchaseSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True)
    supplier_name = serializers.ReadOnlyField(source='supplier.supplier_name')

    class Meta:
        model = Purchase
        fields = [
            'id', 'purchase_code', 'supplier', 'supplier_name', 'invoice_number',
            'invoice_date', 'total_items', 'total_quantity', 'gross_amount',
            'discount_amount', 'gst_amount', 'net_amount', 'paid_amount',
            'balance_amount', 'payment_status', 'payment_mode', 'order_status',
            'expected_delivery_date', 'notes', 'items', 'created_by', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'purchase_code', 'created_by', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        shop = request.user.shop
        
        # 1. Preliminary Create to get ID
        purchase = Purchase.objects.create(shop=shop, **validated_data)
        
        # 2. Generate and Set Code (Ensure it exists for references)
        purchase.purchase_code = f"PO-{purchase.id:06d}"
        purchase.save(update_fields=['purchase_code'])

        for item_data in items_data:
            # 🛡️ Precise Pricing Validation
            purchase_rate = item_data.get('purchase_rate', Decimal('0'))
            mrp = item_data.get('mrp', Decimal('0'))
            
            if mrp < purchase_rate:
                raise serializers.ValidationError(
                    {"mrp": f"MRP cannot be less than purchase rate for {item_data['medicine'].medicine_name}"}
                )

            # Link purchase and create item
            PurchaseItem.objects.create(purchase=purchase, **item_data)

            medicine = item_data['medicine']
            batch_num = item_data['batch_number']
            expiry = item_data['expiry_date']
            total_qty = item_data['quantity'] + item_data.get('free_quantity', 0)

            # 🔥 Atomic Global Stock Update (Race Condition Prevention)
            Medicine.objects.filter(id=medicine.id).update(
                stock_quantity=F('stock_quantity') + total_qty
            )
            # Re-fetch for movement log consistency
            medicine.refresh_from_db()

            # 🔥 Atomic Stock Batch Update
            batch, created = StockBatch.objects.select_for_update().get_or_create(
                shop=shop,
                medicine=medicine,
                batch_number=batch_num,
                defaults={
                    'expiry_date': expiry,
                    'purchase_rate': purchase_rate,
                    'mrp': mrp,
                    'quantity': 0
                }
            )
            
            batch.quantity = F('quantity') + total_qty
            batch.save(update_fields=['quantity'])

            # 📋 Log Stock Movement
            StockMovement.objects.create(
                shop=shop,
                medicine=medicine,
                batch=batch,
                movement_type='IN',
                quantity=total_qty,
                in_quantity=total_qty,
                balance_quantity=medicine.stock_quantity,
                reference_id=purchase.purchase_code,
                created_by=validated_data.get('created_by')
            )

        return purchase

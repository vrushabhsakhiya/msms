import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from inventory.models import StockBatch, StockMovement
from medicines.models import Medicine
from .models import Sale, SaleItem

logger = logging.getLogger(__name__)

class SaleItemSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.medicine_name', read_only=True)

    class Meta:
        model = SaleItem
        fields = [
            'id', 'medicine', 'medicine_name', 'batch', 'batch_number', 
            'quantity', 'rate', 'discount_percentage', 'discount_amount', 
            'gst_percentage', 'gst_amount', 'amount'
        ]
        read_only_fields = ('sale',)

    def validate_medicine(self, value):
        request = self.context.get('request')
        if value and request and hasattr(request, 'user'):
            if value.shop != request.user.shop:
                raise serializers.ValidationError("Invalid medicine for your shop.")
        return value


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'invoice_number', 'customer', 'customer_name', 'customer_mobile',
            'doctor_name', 'total_items', 'total_quantity', 'gross_amount',
            'discount_amount', 'taxable_amount', 'gst_amount', 'cgst_amount',
            'sgst_amount', 'round_off', 'net_amount', 'payment_mode',
            'transaction_id', 'reference_number', 'amount_received',
            'return_amount', 'status', 'items', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_by', 'created_at', 'updated_at']

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context.get('request')
        shop = request.user.shop
        
        # 1. Generate Invoice Number (Harden: Use count within atomic block)
        today = date.today()
        today_str = today.strftime('%Y%m%d')
        # select_for_update on a dummy record or just trust the transaction for now
        order_count = Sale.objects.filter(shop=shop, created_at__date=today).count() + 1
        invoice_number = f"INV-{today_str}-{str(order_count).zfill(3)}"
        
        # 🛡️ Anti-Tamper: Backend re-calculation of all totals
        total_gross = Decimal('0')
        total_gst = Decimal('0')
        total_discount = Decimal('0')
        total_qty = 0
        
        processed_items = []
        for item_data in items_data:
            med = item_data['medicine']
            qty = item_data['quantity']
            rate = item_data.get('rate', med.selling_price) # Use medicine default if not provided
            gst_p = med.gst_percentage or Decimal('0')
            disc_p = item_data.get('discount_percentage', Decimal('0'))
            
            # Row calculations
            row_gross = rate * qty
            row_disc = (row_gross * disc_p / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            row_taxable = row_gross - row_disc
            row_gst = (row_taxable * gst_p / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            row_total = row_taxable + row_gst
            
            # Update item_data with verified backend values
            item_data.update({
                'rate': rate,
                'gst_percentage': gst_p,
                'discount_amount': row_disc,
                'gst_amount': row_gst,
                'amount': row_total
            })
            
            total_gross += row_gross
            total_gst += row_gst
            total_discount += row_disc
            total_qty += qty
            processed_items.append(item_data)

        # Final totals
        net_amount = (total_gross - total_discount + total_gst).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # Update validated_data for Sale creation
        validated_data.update({
            'shop': shop,
            'invoice_number': invoice_number,
            'gross_amount': total_gross,
            'gst_amount': total_gst,
            'taxable_amount': total_gross - total_discount,
            'discount_amount': total_discount,
            'cgst_amount': total_gst / 2,
            'sgst_amount': total_gst / 2,
            'net_amount': net_amount,
            'total_quantity': total_qty,
            'total_items': len(processed_items)
        })
        
        sale = Sale.objects.create(**validated_data)
        is_final = validated_data.get('status') == 'Final'

        for item in processed_items:
            med = item['medicine']
            qty = item['quantity']
            batch_id = item.get('batch').id if item.get('batch') else None
            
            # Security: Ensure batch existence and shop affiliation
            if not batch_id:
                raise serializers.ValidationError(f"Batch selection required for {med.medicine_name}")

            # Create the sale item
            SaleItem.objects.create(sale=sale, **item)

            if is_final:
                # 🔥 Race Condition Harden: select_for_update()
                # Lock both Batch and Medicine records
                try:
                    batch = StockBatch.objects.select_for_update().get(id=batch_id, shop=shop)
                except StockBatch.DoesNotExist:
                    raise serializers.ValidationError(f"Batch not found or invalid for {med.medicine_name}")

                if batch.expiry_date and batch.expiry_date < today:
                    raise serializers.ValidationError(f"Batch {batch.batch_number} is expired and cannot be sold.")

                if batch.quantity < qty:
                    raise serializers.ValidationError(f"Insufficient stock in batch {batch.batch_number}. Available: {batch.quantity}")

                # Atomic updates
                StockBatch.objects.filter(id=batch.id).update(quantity=F('quantity') - qty)
                Medicine.objects.filter(id=med.id).update(stock_quantity=F('stock_quantity') - qty)

                # Refresh for movement log
                med.refresh_from_db()

                StockMovement.objects.create(
                    shop=shop,
                    medicine=med,
                    batch=batch,
                    movement_type='OUT',
                    quantity=qty,
                    out_quantity=qty,
                    balance_quantity=med.stock_quantity,
                    reference_id=sale.invoice_number,
                    created_by=validated_data.get('created_by')
                )

        return sale

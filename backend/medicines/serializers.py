import datetime
from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from .models import Medicine
from suppliers.models import Supplier


class MedicineSerializer(serializers.ModelSerializer):
    stock_status   = serializers.ReadOnlyField()
    supplier_name  = serializers.CharField(source='supplier.supplier_name', read_only=True)
    days_to_expiry = serializers.SerializerMethodField()

    class Meta:
        model  = Medicine
        # Security: Explicitly listing fields to prevent future 'auto-exposure' 
        # of sensitive internal audit fields.
        fields = [
            'id', 'medicine_code', 'medicine_name', 'generic_name', 'company',
            'category', 'medicine_type', 'hsn_code', 'composition', 'pack_size',
            'purchase_price', 'mrp', 'selling_price', 'discount', 'gst_percentage',
            'reorder_level', 'max_stock_level', 'stock_quantity', 'batch_number',
            'manufacturing_date', 'expiry_date', 'barcode', 'rack_location',
            'supplier', 'supplier_name', 'prescription_required', 'status', 
            'stock_status', 'days_to_expiry', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'stock_quantity', 'created_at', 'updated_at']

    def get_days_to_expiry(self, obj):
        if obj.expiry_date:
            return (obj.expiry_date - datetime.date.today()).days
        return None

    def validate_supplier(self, value):
        """
        Security: Ensure the linked supplier belongs to the same shop as the user.
        """
        request = self.context.get('request')
        if value and request and hasattr(request, 'user'):
            if value.shop != request.user.shop:
                raise serializers.ValidationError("Invalid supplier for your shop.")
        return value

    def validate(self, data):
        # Precise Decimal Handling for financial validation
        purchase_price = data.get('purchase_price', Decimal('0'))
        mrp            = data.get('mrp', Decimal('0'))
        selling_price  = data.get('selling_price', Decimal('0'))
        expiry_date    = data.get('expiry_date')
        mfg_date       = data.get('manufacturing_date')

        # Logic Fix: Use Decimal objects directly for precise comparison
        if mrp and purchase_price and mrp < purchase_price:
            raise serializers.ValidationError(
                {"mrp": "MRP must be greater than or equal to Purchase Price."}
            )

        if selling_price and mrp and selling_price > mrp:
            raise serializers.ValidationError(
                {"selling_price": "Selling price cannot exceed MRP."}
            )

        if selling_price and purchase_price and selling_price < purchase_price:
            raise serializers.ValidationError(
                {"selling_price": "Selling price cannot be less than purchase price."}
            )

        # Date Validations
        today = datetime.date.today()
        if expiry_date:
            if expiry_date < today:
                raise serializers.ValidationError(
                    {"expiry_date": "Product is already expired or expires today."}
                )
            
            # Warn if expiry is very close (e.g. less than 30 days) - optional but good UX
            # threshold = today + datetime.timedelta(days=30)

        if mfg_date and expiry_date and expiry_date <= mfg_date:
            raise serializers.ValidationError(
                {"expiry_date": "Expiry date must be after manufacturing date."}
            )

        if mfg_date and mfg_date > today:
            raise serializers.ValidationError(
                {"manufacturing_date": "Manufacturing date cannot be in the future."}
            )

        return data
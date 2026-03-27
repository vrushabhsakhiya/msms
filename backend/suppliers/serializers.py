from rest_framework import serializers
from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        # Security: Explicit fields to prevent auto-exposure of internal fields
        fields = [
            'id', 'supplier_code', 'supplier_name', 'contact_person', 'mobile',
            'alternate_mobile', 'email', 'gst_number', 'pan_number', 'address_line_1',
            'address_line_2', 'city', 'state', 'pincode', 'bank_name', 'account_number',
            'ifsc_code', 'opening_balance', 'credit_limit', 'credit_days', 'is_active',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        """
        Architecture: Prefer processing a copy or using super() result to 
        safely handle blank strings for nullable fields.
        """
        ret = super().to_internal_value(data)
        # Convert empty strings to None for fields that should be NULL in DB
        nullable_fields = ['alternate_mobile', 'email', 'gst_number', 'pan_number']
        for field in nullable_fields:
            if field in ret and ret[field] == "":
                ret[field] = None
        return ret

    def _validate_unique_field(self, field_name, value, error_msg):
        # Helper to DRY up multi-tenant uniqueness checks
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return value
            
        shop = request.user.shop
        qs = Supplier.objects.filter(**{field_name: value, 'shop': shop})
        
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
            
        if qs.exists():
            raise serializers.ValidationError(error_msg)
        return value

    def validate_supplier_code(self, value):
        return self._validate_unique_field('supplier_code', value, "Supplier code already exists in your shop.")

    def validate_gst_number(self, value):
        if value:
            return self._validate_unique_field('gst_number', value, "GST number already registered in your shop.")
        return value

    def validate_mobile(self, value):
        if value:
            return self._validate_unique_field('mobile', value, "Mobile number already exists.")
        return value

    def validate_email(self, value):
        if value:
            return self._validate_unique_field('email', value, "Email already exists.")
        return value

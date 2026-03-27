from rest_framework import serializers
from .models import StockBatch, StockMovement, StockAdjustment

class StockBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockBatch
        fields = "__all__"

class StockAdjustmentSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.medicine_name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    
    class Meta:
        model = StockAdjustment
        fields = "__all__"

class StockMovementSerializer(serializers.ModelSerializer):
    medicine_name = serializers.CharField(source='medicine.medicine_name', read_only=True)
    medicine_code = serializers.CharField(source='medicine.medicine_code', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    user_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'medicine_name', 'medicine_code', 'batch_number', 
            'movement_type', 'quantity', 'reference_id', 
            'created_at', 'user_name'
        ]

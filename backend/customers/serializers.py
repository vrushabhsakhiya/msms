from rest_framework import serializers
from django.db.models import Sum
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    total_purchases = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()
    total_bills = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = "__all__"

    def _get_sales_aggregates(self, obj):
        # Cache the aggregates on the object for the lifetime of the request to prevent 3 duplicate queries per row
        if not hasattr(obj, '_sales_aggregates'):
            from sales.models import Sale  # Local import to prevent circular dependency
            
            aggregates = Sale.objects.filter(
                customer=obj, 
                status='Final'
            ).aggregate(
                total_net=Sum('net_amount'),
                total_received=Sum('amount_received')
            )
            
            # Also fetch the count in the same execution context
            aggregates['count'] = Sale.objects.filter(customer=obj, status='Final').count()
            
            obj._sales_aggregates = aggregates
            
        return obj._sales_aggregates

    def get_total_purchases(self, obj):
        aggregates = self._get_sales_aggregates(obj)
        return aggregates['total_net'] or 0

    def get_outstanding_balance(self, obj):
        aggregates = self._get_sales_aggregates(obj)
        net = aggregates['total_net'] or 0
        received = aggregates['total_received'] or 0
        
        # safely convert to float avoiding NoneType errors
        return float(net - received) + float(obj.opening_balance or 0)

    def get_total_bills(self, obj):
        aggregates = self._get_sales_aggregates(obj)
        return aggregates['count'] or 0


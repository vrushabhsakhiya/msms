from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PurchaseSerializer
from .models import Purchase, PurchaseItem
from accounts.permissions import HasPurchaseAccess
from django.db.models import Sum, F

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def create_purchase(request):
    serializer = PurchaseSerializer(data=request.data)
    if serializer.is_valid():
        purchase = serializer.save(created_by=request.user, shop=request.user.shop)
        
        # Override purchase code with strictly sequential database ID
        purchase.purchase_code = f"PO-{purchase.id:06d}"
        purchase.save()
        
        return Response({"message": "Purchase created & stock updated"}, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def get_purchases(request):
    purchases = Purchase.objects.filter(shop=request.user.shop).order_by('-created_at')
    serializer = PurchaseSerializer(purchases, many=True)
    return Response(serializer.data, status=200)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def delete_purchase(request, pk):
    """
    Security: Atomic reversal of stock updates when a purchase is deleted.
    Harden: Uses select_for_update() to prevent race conditions.
    """
    from django.db import transaction
    from inventory.models import StockBatch, StockMovement
    import logging # Added for error logging

    try:
        with transaction.atomic():
            purchase = Purchase.objects.select_for_update().get(pk=pk, shop=request.user.shop)

            for item in purchase.items.all().select_related('medicine'):
                total_qty = item.quantity + item.free_quantity

                # 1. Atomic decrement of global medicine stock
                Medicine.objects.filter(id=item.medicine.id).update(
                    stock_quantity=F('stock_quantity') - total_qty
                )

                # 2. Atomic decrement of batch stock
                try:
                    # select_for_update here is important to lock the batch
                    batch = StockBatch.objects.select_for_update().get(
                        shop=purchase.shop,
                        medicine=item.medicine,
                        batch_number=item.batch_number
                    )
                    batch.quantity = F('quantity') - total_qty
                    batch.save(update_fields=['quantity'])
                except StockBatch.DoesNotExist:
                    batch = None

                # 3. Log reverse movement
                # Refresh medicine for correct balance log
                item.medicine.refresh_from_db()
                StockMovement.objects.create(
                    shop=purchase.shop,
                    medicine=item.medicine,
                    batch=batch,
                    movement_type='OUT',
                    quantity=total_qty,
                    out_quantity=total_qty,
                    balance_quantity=item.medicine.stock_quantity,
                    reference_id=f"DEL-{purchase.purchase_code}",
                    created_by=request.user
                )

            purchase.delete()
        return Response({"message": "Purchase deleted and inventory reversed successfully."}, status=200)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=404)
    except Exception as e:
        logging.getLogger(__name__).error(f"Purchase Delete Error: {e}")
        return Response({"error": "Failed to delete purchase safely."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def purchase_report(request):
    """Overall Purchase Report with Stats."""
    from django.db.models import Avg, Count
    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    purchases = Purchase.objects.filter(shop=request.user.shop)
    if start_date: purchases = purchases.filter(created_at__date__gte=start_date)
    if end_date: purchases = purchases.filter(created_at__date__lte=end_date)

    # Corrected aggregation logic
    stats = purchases.aggregate(
        total_spent=Sum('net_amount'),
        avg_purchase=Avg('net_amount'),
        purchase_count=Count('id')
    )
    
    return Response({
        "summary": {
            "total_spent": round(float(stats['total_spent'] or 0), 2),
            "avg_purchase": round(float(stats['avg_purchase'] or 0), 2),
            "purchase_count": stats['purchase_count'] or 0,
        },
        "recent_purchases": PurchaseSerializer(
            purchases.order_by('-created_at')[:50], 
            many=True, 
            context={'request': request}
        ).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def gstr2_report(request):
    """GSTR-2 Report (Purchases) - Grouped by GST Slabs."""
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')

    purchase_items = PurchaseItem.objects.filter(purchase__shop=request.user.shop)
    
    if start_date: purchase_items = purchase_items.filter(purchase__created_at__date__gte=start_date)
    if end_date: purchase_items = purchase_items.filter(purchase__created_at__date__lte=end_date)

    report = purchase_items.values('gst_percentage').annotate(
        taxable_value=Sum('amount'),
        total_gst=Sum(F('amount') * F('gst_percentage') / 100),
        total_amount=Sum(F('amount') + (F('amount') * F('gst_percentage') / 100))
    ).order_by('gst_percentage')

    final_report = []
    for entry in report:
        total_gst = entry['total_gst'] or 0
        final_report.append({
            "gst_rate": f"{entry['gst_percentage']}%",
            "taxable_value": round(entry['taxable_value'] or 0, 2),
            "cgst": round(total_gst / 2, 2),
            "sgst": round(total_gst / 2, 2),
            "total_gst": round(total_gst, 2),
            "total_amount": round(entry['total_amount'] or 0, 2)
        })

    return Response({
        "slabs": final_report,
        "total": {
            "taxable": sum(r['taxable_value'] for r in final_report),
            "gst": sum(r['total_gst'] for r in final_report),
            "amount": sum(r['total_amount'] for r in final_report)
        }
    }, status=200)
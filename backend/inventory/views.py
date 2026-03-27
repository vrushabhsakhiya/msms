import logging
from datetime import date, timedelta
from django.db import transaction
from django.db.models import F, Sum, Q, Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from medicines.models import Medicine
from .models import StockBatch, StockMovement, StockAdjustment
from .serializers import StockBatchSerializer, StockMovementSerializer, StockAdjustmentSerializer
from accounts.permissions import IsAdminUser
from sales.models import Sale, SaleItem

try:
    from purchases.models import Purchase
except ImportError:
    Purchase = None

logger = logging.getLogger(__name__)

# --- Summary & Analytics ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_summary(request):
    shop = request.user.shop
    today = date.today()
    next_30 = today + timedelta(days=30)
    
    # Combined aggregation for performance
    medicine_stats = Medicine.objects.filter(shop=shop).aggregate(
        total_count=Count('id'),
        low_stock=Count('id', filter=Q(stock_quantity__lte=F('reorder_level'))),
        out_of_stock=Count('id', filter=Q(stock_quantity=0))
    )
    
    batch_stats = StockBatch.objects.filter(shop=shop, quantity__gt=0).aggregate(
        total_val=Sum(F('purchase_rate') * F('quantity')),
        expired=Count('id', filter=Q(expiry_date__lt=today)),
        near_expiry=Count('id', filter=Q(expiry_date__gte=today, expiry_date__lte=next_30))
    )

    return Response({
        "total_medicines": medicine_stats['total_count'],
        "total_stock_value": round(float(batch_stats['total_val'] or 0), 2),
        "low_stock_items": medicine_stats['low_stock'],
        "out_of_stock": medicine_stats['out_of_stock'],
        "expired_items": batch_stats['expired'],
        "near_expiry": batch_stats['near_expiry']
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """
    Consolidated dashboard view: Hardened against heavy N+1 and optimized for large datasets.
    """
    shop = request.user.shop
    today = date.today()
    last_7_days = today - timedelta(days=6)
    next_30 = today + timedelta(days=30)

    # 1. Financial Analytics
    today_sales_summary = Sale.objects.filter(shop=shop, created_at__date=today).aggregate(
        revenue=Sum('net_amount'),
        bills=Count('id'),
        collection=Sum('amount_received')
    )
    
    pending_payments = Sale.objects.filter(
        shop=shop, 
        amount_received__lt=F('net_amount')
    ).aggregate(pending=Sum(F('net_amount') - F('amount_received')))['pending'] or 0

    # 2. Charts & Trends
    sales_trend = Sale.objects.filter(
        shop=shop, 
        created_at__date__gte=last_7_days
    ).annotate(date=TruncDate('created_at')).values('date').annotate(
        total=Sum('net_amount')
    ).order_by('date')
    
    trend_data = []
    for i in range(7):
        curr_date = last_7_days + timedelta(days=i)
        found = next((item for item in sales_trend if item['date'] == curr_date), None)
        trend_data.append({
            "date": curr_date.strftime("%d %b"),
            "sales": float(found['total']) if found else 0
        })

    # Payment Mode Breakdown
    payment_modes = Sale.objects.filter(shop=shop, created_at__date=today).values('payment_mode').annotate(
        count=Count('id'),
        total=Sum('net_amount')
    )

    # 3. Operations & Alerts
    # Optimized: Use exists() or aggregate for dashboard counts
    alert_counts = Medicine.objects.filter(shop=shop).aggregate(
        low_stock=Count('id', filter=Q(stock_quantity__lte=F('reorder_level'))),
        out_of_stock=Count('id', filter=Q(stock_quantity=0))
    )
    expiring_soon = StockBatch.objects.filter(shop=shop, expiry_date__lte=next_30, quantity__gt=0).count()

    # 4. Activity Logs (Performance: select_related is mandatory here)
    recent_movements = StockMovement.objects.filter(shop=shop).select_related('medicine', 'created_by').order_by('-created_at')[:5]
    activity_data = [{
        "time": m.created_at.strftime("%I:%M %p"),
        "type": m.movement_type,
        "description": f"{m.get_movement_type_display()} - {m.medicine.medicine_name}",
        "user": m.created_by.first_name if m.created_by else "System",
        "amount": float(m.quantity)
    } for m in recent_movements]

    # 5. Top Selling Medicines
    top_selling = SaleItem.objects.filter(
        sale__shop=shop, 
        sale__created_at__date__gte=today - timedelta(days=30)
    ).values('medicine__medicine_name').annotate(
        total_qty=Sum('quantity')
    ).order_by('-total_qty')[:5]

    return Response({
        "summary": {
            "today_sales": float(today_sales_summary['revenue'] or 0),
            "today_bills": today_sales_summary['bills'] or 0,
            "today_collection": float(today_sales_summary['collection'] or 0),
            "pending_payments": float(pending_payments)
        },
        "charts": {
            "sales_trend": trend_data,
            "payment_mode": list(payment_modes)
        },
        "alerts": {
            "low_stock": alert_counts['low_stock'],
            "expiring_soon": expiring_soon,
            "out_of_stock": alert_counts['out_of_stock'],
            "pending_payments": float(pending_payments)
        },
        "recent_activity": activity_data,
        "top_selling": list(top_selling),
        "total_medicines": Medicine.objects.filter(shop=shop).count() # redundant with old STATS
    })


# --- Alerts & Logs ---

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_alerts(request):
    medicines = Medicine.objects.filter(
        shop=request.user.shop,
        stock_quantity__lte=F('reorder_level')
    ).values(
        'id', 'medicine_name', 'stock_quantity', 'reorder_level', 'updated_at'
    )
    
    data = []
    for med in medicines:
        data.append({
            **med,
            "difference": med['stock_quantity'] - med['reorder_level'],
            "suggested_qty": max(0, (med['reorder_level'] * 2) - med['stock_quantity'])
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expiry_alerts(request):
    today = date.today()
    alert_date = today + timedelta(days=90)
    
    # N+1 Fix: select_related('medicine')
    batches = StockBatch.objects.filter(
        shop=request.user.shop,
        expiry_date__lte=alert_date,
        quantity__gt=0
    ).select_related('medicine').order_by('expiry_date')
    
    data = []
    for b in batches:
        days = (b.expiry_date - today).days
        status = 'Notice'
        if days <= 0: status = 'Expired'
        elif days < 30: status = 'Critical'
        elif days < 60: status = 'Warning'
        
        data.append({
            "id": b.id,
            "medicine_name": b.medicine.medicine_name,
            "batch_number": b.batch_number,
            "expiry_date": b.expiry_date,
            "days_remaining": days,
            "current_stock": b.quantity,
            "status": status
        })
    return Response(data)


# --- Mutations ---

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def adjust_stock(request):
    """Creates a Pending Stock Adjustment request."""
    try:
        data = request.data
        med = Medicine.objects.get(id=data['medicine'], shop=request.user.shop)
        batch = StockBatch.objects.get(id=data['batch'], shop=request.user.shop) if data.get('batch') else None
        
        qty = int(data['quantity'])
        adj_type = data['adjustment_type'] # ADD, REDUCE, DAMAGED, EXPIRED
        
        if adj_type in ['REDUCE', 'DAMAGED', 'EXPIRED']:
            current_qty = batch.quantity if batch else med.stock_quantity
            if current_qty < qty:
                return Response({"error": "Insufficient stock for reduction."}, status=400)

        # Log Adjustment as Pending
        adj = StockAdjustment.objects.create(
            shop=request.user.shop,
            medicine=med,
            batch=batch,
            adjustment_type=adj_type,
            quantity=qty,
            reason=data['reason'],
            remarks=data.get('remarks', ''),
            created_by=request.user,
            status='Pending'
        )

        return Response({"message": "Adjustment request submitted for approval.", "id": adj.id}, status=201)
    except Exception as e:
        logger.error(f"Stock Adjustment Create Error: {e}")
        return Response({"error": "Failed to create adjustment request."}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
@transaction.atomic
def approve_adjustment(request, pk):
    """
    Race Condition Harden: Uses select_for_update() to lock records during approval.
    """
    try:
        adj = StockAdjustment.objects.select_for_update().get(pk=pk, shop=request.user.shop)
        if adj.status != 'Pending':
            return Response({"error": "Request already processed."}, status=400)
            
        action = request.data.get('action') # 'Approved' or 'Rejected'
        if action not in ['Approved', 'Rejected']:
            return Response({"error": "Invalid action."}, status=400)
            
        adj.status = action
        adj.approved_by = request.user
        adj.approval_date = timezone.now()
        adj.save()
        
        if action == 'Approved':
            # Security: Use F expression + select_for_update for rock-solid integrity
            med = Medicine.objects.select_for_update().get(id=adj.medicine.id)
            batch = StockBatch.objects.select_for_update().get(id=adj.batch.id) if adj.batch else None
            
            modifier = 1 if adj.adjustment_type == 'ADD' else -1
            
            if modifier == -1:
                current_qty = batch.quantity if batch else med.stock_quantity
                if current_qty < adj.quantity:
                    raise ValueError("Insufficient stock available at approval time.")
            
            if batch:
                batch.quantity = F('quantity') + (modifier * adj.quantity)
                batch.save()
            
            med.stock_quantity = F('stock_quantity') + (modifier * adj.quantity)
            med.save()

            # Refresh med if we need the new quantity for logging
            med.refresh_from_db()

            StockMovement.objects.create(
                shop=request.user.shop,
                medicine=med,
                batch=batch,
                movement_type='ADJUST',
                quantity=adj.quantity,
                in_quantity=adj.quantity if modifier == 1 else 0,
                out_quantity=adj.quantity if modifier == -1 else 0,
                balance_quantity=med.stock_quantity,
                reference_id=f"ADJ-{adj.id}",
                created_by=request.user
            )

        return Response({"message": f"Adjustment {action.lower()} successfully."})
    except Exception as e:
        logger.error(f"Adjustment Approval Error: {e}")
        return Response({"error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_movements(request):
    # N+1 Fix: select_related
    movements = StockMovement.objects.filter(shop=request.user.shop).select_related('medicine', 'batch', 'created_by')
    
    med_id = request.query_params.get('medicine')
    if med_id and str(med_id).isdigit():
        movements = movements.filter(medicine_id=med_id)
        
    m_type = request.query_params.get('type')
    if m_type:
        movements = movements.filter(movement_type=m_type)
        
    serializer = StockMovementSerializer(movements[:200], many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_batches(request, medicine_id):
    batches = StockBatch.objects.filter(
        shop=request.user.shop,
        medicine_id=medicine_id, 
        is_active=True
    ).order_by('expiry_date')
    serializer = StockBatchSerializer(batches, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    shop = request.user.shop
    today = date.today()
    notifications = []
    
    # 1. Expiry Alerts (Expiring within 30 days) - select_related medicine
    expiring_batches = StockBatch.objects.filter(
        shop=shop, expiry_date__lte=today + timedelta(days=30), quantity__gt=0
    ).select_related('medicine').order_by('expiry_date')[:10]
    
    for batch in expiring_batches:
        days_left = (batch.expiry_date - today).days
        level = "Critical" if days_left <= 0 else "Warning"
        notifications.append({
            "id": f"exp_{batch.id}",
            "type": "Expiry Alert",
            "desc": f"Batch {batch.batch_number} of {batch.medicine.medicine_name} {'expired' if days_left < 0 else 'expires'} on {batch.expiry_date}.",
            "time": "System",
            "icon": "Calendar",
            "color": "#ef4444" if days_left < 7 else "#f59e0b",
            "unread": True
        })
        
    # 2. Purchase Delivery Alerts (Pending)
    if Purchase:
        deliveries = Purchase.objects.filter(shop=shop, order_status='Pending').select_related('supplier').order_by('expected_delivery_date')[:5]
        for pur in deliveries:
            notifications.append({
                "id": f"del_{pur.id}",
                "type": "Delivery Alert",
                "desc": f"Pending delivery from {pur.supplier.supplier_name if pur.supplier else 'Unknown'}.",
                "time": "Logistics",
                "icon": "ShoppingCart",
                "color": "#3b82f6",
                "unread": True
            })
            
    return Response(notifications)

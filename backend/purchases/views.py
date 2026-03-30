import csv
import io
from datetime import date, timedelta
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import PurchaseSerializer
from .models import Purchase, PurchaseItem
from suppliers.models import Supplier
from medicines.models import Medicine
from inventory.models import StockBatch
from accounts.permissions import HasPurchaseAccess
from django.db.models import Sum, F, Max
from decimal import Decimal
from django.db import transaction

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def get_next_codes(request):
    """Suggests sequential PO and Invoice numbers starting from 001."""
    last_purchase = Purchase.objects.filter(shop=request.user.shop).order_by('-id').first()
    next_id = (last_purchase.id + 1) if last_purchase else 1
    
    return Response({
        "purchase_code": f"PO-{next_id:06d}",
        "invoice_number": f"INV-{next_id:06d}"
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
@parser_classes([MultiPartParser])
def import_purchases_csv(request):
    """
    Groups rows by Invoice Number + Supplier to create complex Purchase records from CSV.
    Expected columns: invoice_number, invoice_date, supplier_name, medicine_name, batch_number, expiry_date, quantity, purchase_rate, mrp, gst_percentage
    """
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file provided"}, status=400)

    try:
        decoded_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(decoded_file)
        
        # Normalize headers
        header_map = {}
        if reader.fieldnames:
            for field in reader.fieldnames:
                clean_field = field.strip().lower().replace(' ', '_').replace('_', '')
                header_map[clean_field] = field

        def get_val(row, *aliases):
            for alias in aliases:
                clean_alias = alias.lower().replace(' ', '').replace('_', '')
                if clean_alias in header_map:
                    return row.get(header_map[clean_alias])
            return None

        purchases_to_process = {} # Grouped by (invoice_number, supplier_name)

        with transaction.atomic():
            for idx, row in enumerate(reader):
                inv_no = get_val(row, 'invoice_number', 'inv_no', 'invoice')
                sup_name = get_val(row, 'supplier_name', 'supplier', 'vendor')
                
                if not inv_no or not sup_name:
                    continue
                
                key = (inv_no, sup_name)

                if key not in purchases_to_process:
                    # Get or Create Supplier
                    supplier, _ = Supplier.objects.get_or_create(
                        shop=request.user.shop, 
                        supplier_name__iexact=sup_name,
                        defaults={'supplier_name': sup_name, 'mobile': get_val(row, 'mobile', 'phone') or ''}
                    )
                    
                    p_date_str = get_val(row, 'invoice_date', 'date')
                    p_date = date.today().isoformat()
                    # Simple date format check
                    if p_date_str:
                        if '/' in p_date_str: # Convert DD/MM/YYYY to YYYY-MM-DD
                            try:
                                parts = p_date_str.split('/')
                                if len(parts[0]) == 4: p_date = "-".join(parts)
                                else: p_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
                            except: pass
                        else: p_date = p_date_str

                    purchases_to_process[key] = {
                        "shop": request.user.shop.id,
                        "supplier": supplier.id,
                        "invoice_number": inv_no,
                        "invoice_date": p_date,
                        "payment_status": "pending",
                        "items": []
                    }

                # Get/Create Medicine
                med_name = get_val(row, 'medicine_name', 'item_name', 'medicine', 'item')
                if not med_name: continue

                try:
                    medicine = Medicine.objects.get(shop=request.user.shop, medicine_name__iexact=med_name)
                except Medicine.DoesNotExist:
                    medicine = Medicine.objects.create(
                        shop=request.user.shop,
                        medicine_name=med_name,
                        category=get_val(row, 'category', 'type') or 'Tablet',
                        stock_quantity=0,
                        reorder_level=10
                    )

                p_rate = float(get_val(row, 'purchase_rate', 'rate', 'cost') or 0)
                qty = int(get_val(row, 'quantity', 'qty') or 0)
                gst_per = float(get_val(row, 'gst_percentage', 'gst', 'tax') or 12)
                
                base_amt = Decimal(str(p_rate)) * qty
                gst_amt = base_amt * (Decimal(str(gst_per)) / 100)

                purchases_to_process[key]["items"].append({
                    "medicine": medicine.id,
                    "quantity": qty,
                    "free_quantity": int(get_val(row, 'free_quantity', 'free') or 0),
                    "purchase_rate": p_rate,
                    "mrp": float(get_val(row, 'mrp') or p_rate * 1.2),
                    "batch_number": get_val(row, 'batch_number', 'batch_no', 'batch') or f"CSV-{date.today().strftime('%y%m%d')}-{idx}",
                    "expiry_date": get_val(row, 'expiry_date', 'expiry', 'exp') or (date.today() + timedelta(days=365)).isoformat(),
                    "discount_percentage": 0,
                    "discount_amount": 0,
                    "gst_percentage": gst_per,
                    "gst_amount": float(gst_amt),
                    "amount": float(base_amt), 
                })

            if not purchases_to_process:
                return Response({"error": "No valid purchase records found. Check if headers match: invoice_number, supplier_name, medicine_name, quantity, purchase_rate"}, status=400)

            # Save grouped purchases
            created_count = 0
            for p_data in purchases_to_process.values():
                items = p_data["items"]
                total_qty = sum(it["quantity"] + it["free_quantity"] for it in items)
                gross = sum(Decimal(str(it["purchase_rate"])) * it["quantity"] for it in items)
                gst = sum(Decimal(str(it["gst_amount"])) for it in items)
                net = gross + gst
                
                p_data.update({
                    "total_items": len(items),
                    "total_quantity": total_qty,
                    "gross_amount": float(gross),
                    "gst_amount": float(gst),
                    "net_amount": float(net),
                    "balance_amount": float(net),
                    "paid_amount": 0,
                    "payment_mode": "Cash"
                })

                serializer = PurchaseSerializer(data=p_data, context={'request': request})
                if serializer.is_valid():
                    purchase = serializer.save(created_by=request.user, shop=request.user.shop)
                    purchase.purchase_code = f"PO-CSV-{purchase.id:04d}"
                    purchase.save()
                    created_count += 1
                else:
                    return Response({"error": f"Invoice {p_data.get('invoice_number')} error: {serializer.errors}"}, status=400)

            return Response({"message": f"Successfully imported {created_count} purchases.", "count": created_count}, status=201)

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(error_details)
        return Response({"error": f"Import Failed: {str(e)}"}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def create_purchase(request):
    serializer = PurchaseSerializer(data=request.data, context={'request': request})
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
    """
    List purchases for the authenticated shop with server-side pagination.
    """
    from rest_framework.pagination import PageNumberPagination
    
    purchases = Purchase.objects.filter(shop=request.user.shop).select_related('supplier', 'created_by').order_by('-created_at')
    
    paginator = PageNumberPagination()
    paginator.page_size = request.query_params.get('page_size', 50)
    
    result_page = paginator.paginate_queryset(purchases, request)
    serializer = PurchaseSerializer(result_page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)

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


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, HasPurchaseAccess])
def update_status(request, pk):
    """Atomic update of payment status and order status."""
    try:
        purchase = Purchase.objects.get(pk=pk, shop=request.user.shop)
        
        # 1. Handle Payment Status Update
        if 'payment_status' in request.data:
            new_status = request.data['payment_status'].lower()
            if new_status == 'paid':
                purchase.payment_status = 'paid'
                purchase.paid_amount = purchase.net_amount
                purchase.balance_amount = 0
                purchase.payment_mode = request.data.get('payment_mode', purchase.payment_mode or 'Cash')
            elif new_status == 'pending':
                purchase.payment_status = 'pending'
                purchase.paid_amount = 0
                purchase.balance_amount = purchase.net_amount
            elif new_status == 'partial':
                purchase.payment_status = 'partial'
                purchase.paid_amount = Decimal(request.data.get('paid_amount', 0))
                purchase.balance_amount = purchase.net_amount - purchase.paid_amount

        # 2. Handle Order Status Update (e.g. Delivered vs Pending)
        if 'order_status' in request.data:
            purchase.order_status = request.data['order_status']
            
        purchase.save()
        return Response({"message": "Purchase details updated successfully."}, status=200)
    except Purchase.DoesNotExist:
        return Response({"error": "Purchase not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


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
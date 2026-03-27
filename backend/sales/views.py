import os
import logging
import random
from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Sum, F, Count, Avg, ExpressionWrapper, DecimalField
from django.db.models.functions import TruncDate
from django.template.loader import get_template
from django.http import HttpResponse

from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import SaleSerializer
from .models import Sale, SaleItem, SaleReturn, SaleReturnItem

from accounts.permissions import HasSalesAccess
from .notifications import NotificationService
from inventory.models import StockBatch, StockMovement
from customers.models import Customer
from medicines.models import Medicine

from xhtml2pdf import pisa

logger = logging.getLogger(__name__)

# --- Helper Functions ---
def save_invoice_locally(sale):
    """
    Generates PDF and saves it to MEDIA_ROOT for archival.
    """
    try:
        template = get_template('sales/invoice_pdf.html')
        html = template.render({'sale': sale})

        now = datetime.now()
        base_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
        # Structure: media/invoices/YYYY/MM/DD/
        day_dir = os.path.join(base_dir, now.strftime("%Y/%m/%d"))

        os.makedirs(day_dir, exist_ok=True)
        file_path = os.path.join(day_dir, f"Invoice_{sale.invoice_number}.pdf")

        with open(file_path, "w+b") as result_file:
            pisa.CreatePDF(html, dest=result_file)
            
        logger.info(f"Invoice archived locally: {file_path}")
    except Exception as e:
        logger.error(f"Invoice Archive Error: {e}")


# --- Endpoints ---
@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def send_e_invoice(request, sale_id):
    """Manual trigger to resend e-invoice via WhatsApp or SMS."""
    try:
        sale = Sale.objects.get(id=sale_id, shop=request.user.shop)
        method = request.data.get('method', 'whatsapp') 
        success = NotificationService.send_invoice(sale, method=method)
        if success:
           return Response({"message": f"Successfully sent via {method}"}, status=200)
        return Response({"error": "Failed to send notification."}, status=400)
    except Sale.DoesNotExist:
        return Response({"error": "Sale not found"}, status=404)
    except Exception as e:
        logger.error(f"E-Invoice Manual Send Error: {e}")
        return Response({"error": "Internal Server Error during send."}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSalesAccess])
@transaction.atomic
def create_sale(request):
    """
    Harden: Atomic sale creation with customer auto-linking and inventory updates.
    """
    try:
        data = request.data.copy() if hasattr(request.data, 'copy') else request.data
        customer_mobile = data.get('customer_mobile')
        customer_name = data.get('customer_name', 'Walk-in Customer')
        
        # Auto-link or Create Customer
        if customer_mobile and len(str(customer_mobile)) == 10:
            customer, created = Customer.objects.get_or_create(
                mobile=customer_mobile,
                shop=request.user.shop,
                defaults={
                    'customer_name': customer_name,
                    'customer_code': f"CUST-{random.randint(10000, 99999)}",
                    'status': 'active'
                }
            )
            if not created and customer.customer_name == "Walk-in Customer" and customer_name != "Walk-in Customer":
                customer.customer_name = customer_name
                customer.save(update_fields=['customer_name'])
                
            data['customer'] = customer.id

        serializer = SaleSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            sale = serializer.save(created_by=request.user)
            
            # Post-Sale Actions
            if sale.status == 'Final':
                 save_invoice_locally(sale)
                 if sale.customer_mobile:
                     NotificationService.send_invoice(sale, method="auto")

            return Response({
                "message": "Sale created successfully.", 
                "id": sale.id,
                "invoice_number": sale.invoice_number
            }, status=201)
        return Response(serializer.errors, status=400)
    except serializers.ValidationError as e:
        return Response(e.detail, status=400)
    except Exception as e:
        logger.error(f"Sale Creation Pipeline Error: {e}")
        return Response({"error": "Transaction failed during sale finalization."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def get_sales(request):
    """
    Paginated fetching with optimized related data.
    """
    sales = Sale.objects.filter(shop=request.user.shop).select_related(
        'customer', 'created_by'
    ).prefetch_related('items__medicine').order_by('-created_at')
    
    customer_id = request.query_params.get('customer_id')
    if customer_id and str(customer_id).isdigit():
        sales = sales.filter(customer_id=customer_id)
        
    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = 20
    
    result_page = paginator.paginate_queryset(sales, request)
    serializer = SaleSerializer(result_page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def delete_sale(request, pk):
    """
    Security: Atomic reversal of inventory when deleting a sale.
    Harden: Uses F() for atomic increment and select_for_update() for locking.
    """
    try:
        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(pk=pk, shop=request.user.shop)
            
            for item in sale.items.all().select_related('medicine'):
                # 1. Increment Medicine Global Stock
                Medicine.objects.filter(id=item.medicine.id).update(
                    stock_quantity=F('stock_quantity') + item.quantity
                )
                
                # 2. Increment Batch Stock
                if item.batch:
                    StockBatch.objects.filter(id=item.batch.id).update(
                        quantity=F('quantity') + item.quantity
                    )
                
                # 3. Log Reverse Movement
                item.medicine.refresh_from_db()
                StockMovement.objects.create(
                    shop=sale.shop,
                    medicine=item.medicine,
                    batch=item.batch,
                    movement_type='IN',
                    quantity=item.quantity,
                    in_quantity=item.quantity,
                    balance_quantity=item.medicine.stock_quantity,
                    reference_id=f"VOID-{sale.invoice_number}",
                    created_by=request.user
                )

            sale.delete()
        return Response({"message": "Sale voided and inventory restored."}, status=200)
    except Sale.DoesNotExist:
        return Response({"error": "Sale not found."}, status=404)
    except Exception as e:
        logger.error(f"Void Sale Error: {e}")
        return Response({"error": "Failed to void sale safely."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def get_invoice_pdf(request, id):
    try:
        sale = Sale.objects.select_related('customer', 'shop').prefetch_related(
            'items__medicine'
        ).get(id=id, shop=request.user.shop)
        
        template = get_template('sales/invoice_pdf.html')
        html = template.render({'sale': sale})
        
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{sale.invoice_number}.pdf"'
        
        pisa_status = pisa.CreatePDF(html, dest=response)
        if pisa_status.err:
            return Response({"error": "PDF Engine failed."}, status=500)
            
        return response
    except Sale.DoesNotExist:
        return Response({"error": "Sale record not found."}, status=404)
    except Exception as e:
        logger.error(f"In-Memory Invoice Gen Error: {e}")
        return Response({"error": "PDF generation failed."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def sales_report(request):
    """
    Performance: Fixed N+1 in recent_sales and optimized aggregates.
    """
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        payment_mode = request.query_params.get('payment_mode')
        customer_type = request.query_params.get('customer_type')

        sales = Sale.objects.filter(shop=request.user.shop)

        if start_date: sales = sales.filter(created_at__date__gte=start_date)
        if end_date: sales = sales.filter(created_at__date__lte=end_date)
            
        if payment_mode and payment_mode != 'All':
            sales = sales.filter(payment_mode=payment_mode)
        if customer_type == 'Walk-in':
            sales = sales.filter(customer__isnull=True)
        elif customer_type == 'Registered':
            sales = sales.filter(customer__isnull=False)

        stats = sales.aggregate(
            total_revenue=Sum('net_amount', output_field=DecimalField()),
            total_bills=Count('id'),
            avg_bill=Avg('net_amount'),
            total_discount=Sum('discount_amount'),
            total_tax=Sum('gst_amount')
        )

        payment_breakdown = sales.values('payment_mode').annotate(
            amount=Sum('net_amount'),
            count=Count('id')
        ).order_by('-amount')

        daily_trend = sales.annotate(date=TruncDate('created_at')).values('date').annotate(
            revenue=Sum('net_amount'),
            bills=Count('id')
        ).order_by('date')

        return Response({
            "summary": {
                "total_revenue": round(float(stats['total_revenue'] or 0), 2),
                "total_bills": stats['total_bills'] or 0,
                "avg_bill": round(float(stats['avg_bill'] or 0), 2),
                "total_discount": round(float(stats['total_discount'] or 0), 2),
                "total_tax": round(float(stats['total_tax'] or 0), 2),
            },
            "payment_breakdown": payment_breakdown,
            "daily_trend": daily_trend,
            "recent_sales": SaleSerializer(
                sales.order_by('-created_at')[:50], 
                many=True, 
                context={'request': request}
            ).data
        }, status=200)
    except Exception as e:
        logger.error(f"Sales Report Compiling Error: {e}")
        return Response({"error": "Failed to compile sales analytical data."}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def process_sale_return(request):
    """
    Harden: Handled strictly via transaction with selectable locking.
    """
    data = request.data
    try:
        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(id=data['sale_id'], shop=request.user.shop)
            
            # Create Return Header
            sale_return = SaleReturn.objects.create(
                shop=request.user.shop,
                sale=sale,
                return_number=f"RET-{random.randint(100000, 999999)}",
                total_refund_amount=0,
                reason=data.get('reason', ''),
                created_by=request.user
            )
            
            total_refund = Decimal('0')
            
            for item_data in data.get('items', []):
                sale_item = SaleItem.objects.select_for_update().get(
                    id=item_data['sale_item_id'], sale=sale
                )
                qty_to_return = int(item_data['return_quantity'])
                
                # Cross-check remaining returnable quantity
                already_returned = SaleReturnItem.objects.filter(sale_item=sale_item).aggregate(
                    Sum('return_quantity')
                )['return_quantity__sum'] or 0
                
                if (already_returned + qty_to_return) > sale_item.quantity:
                    raise ValueError(f"Max return exceeded for {sale_item.medicine.medicine_name}")
                    
                # Calculate Refund (Pro-rata)
                item_unit_price = sale_item.amount / sale_item.quantity
                item_refund = (item_unit_price * qty_to_return).quantize(Decimal('0.01'))
                
                SaleReturnItem.objects.create(
                    sale_return=sale_return,
                    sale_item=sale_item,
                    return_quantity=qty_to_return,
                    refund_amount=item_refund
                )
                
                total_refund += item_refund
                
                # Atomic Inventory Restock
                if sale_item.batch:
                    StockBatch.objects.filter(id=sale_item.batch.id).update(
                        quantity=F('quantity') + qty_to_return
                    )
                
                Medicine.objects.filter(id=sale_item.medicine.id).update(
                    stock_quantity=F('stock_quantity') + qty_to_return
                )
                
                # Refresh for log
                sale_item.medicine.refresh_from_db()
                StockMovement.objects.create(
                    shop=request.user.shop,
                    medicine=sale_item.medicine,
                    batch=sale_item.batch,
                    movement_type='RETURN',
                    quantity=qty_to_return,
                    in_quantity=qty_to_return,
                    balance_quantity=sale_item.medicine.stock_quantity,
                    reference_id=f"RET-{sale_return.return_number}",
                    created_by=request.user
                )
                
            sale_return.total_refund_amount = total_refund
            sale_return.save(update_fields=['total_refund_amount'])
                
        return Response({
            "message": "Return processed successfully.",
            "return_number": sale_return.return_number
        }, status=201)
        
    except Exception as e:
        logger.error(f"Sale Return Fault: {e}")
        return Response({"error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def profit_loss_report(request):
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        sales = Sale.objects.filter(shop=request.user.shop)
        if start_date: sales = sales.filter(created_at__date__gte=start_date)
        if end_date: sales = sales.filter(created_at__date__lte=end_date)

        summary = sales.aggregate(
            gross_sales=Sum('gross_amount'),
            total_discounts=Sum('discount_amount'),
            total_taxes=Sum('gst_amount'),
            net_revenue=Sum('net_amount')
        )

        # COGS Calculation (Optimized)
        sale_items = SaleItem.objects.filter(sale__in=sales)
        cogs_data = sale_items.annotate(
            item_cost=ExpressionWrapper(
                F('quantity') * F('medicine__purchase_price'),
                output_field=DecimalField()
            )
        ).aggregate(total_cogs=Sum('item_cost'))

        net_rev = Decimal(str(summary['net_revenue'] or 0))
        taxes = Decimal(str(summary['total_taxes'] or 0))
        cogs = Decimal(str(cogs_data['total_cogs'] or 0))
        
        # Operating Profit = (Revenue - Taxes) - COGS
        gross_profit = (net_rev - taxes) - cogs

        return Response({
            "revenue": {
                "gross_sales": round(float(summary['gross_sales'] or 0), 2),
                "discounts": round(float(summary['total_discounts'] or 0), 2),
                "taxes": round(float(taxes), 2),
                "net_revenue": round(float(net_rev), 2)
            },
            "expenses": {
                "cogs": round(float(cogs), 2),
                "other": 0
            },
            "profit": {
                "gross_profit": round(float(gross_profit), 2),
                "margin_percent": round(float(gross_profit / net_rev * 100), 2) if net_rev > 0 else 0
            }
        })
    except Exception as e:
        logger.error(f"Profit/Loss Calculation Error: {e}")
        return Response({"error": "Failed to generate financial statement."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def product_performance_report(request):
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        items = SaleItem.objects.filter(sale__shop=request.user.shop).select_related('medicine')
        if start_date: items = items.filter(sale__created_at__date__gte=start_date)
        if end_date: items = items.filter(sale__created_at__date__lte=end_date)

        best_sellers = items.values('medicine__medicine_name', 'medicine__medicine_code').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('amount'),
            total_cost=Sum(
                ExpressionWrapper(
                    F('quantity') * F('medicine__purchase_price'),
                    output_field=DecimalField()
                )
            ),
            order_count=Count('id')
        ).order_by('-total_qty')[:20]

        best_sellers_list = []
        for bs in best_sellers:
            revenue = Decimal(str(bs['total_revenue'] or 0))
            cost = Decimal(str(bs['total_cost'] or 0))
            profit = revenue - cost
            margin_pct = (profit / revenue * 100) if revenue > 0 else 0

            best_sellers_list.append({
                'medicine__medicine_name': bs['medicine__medicine_name'],
                'medicine__medicine_code': bs['medicine__medicine_code'],
                'total_qty': bs['total_qty'],
                'total_revenue': round(float(revenue), 2),
                'total_profit': round(float(profit), 2),
                'margin_pct': round(float(margin_pct), 2)
            })

        # Efficiently find slow moving meds (not sold in range)
        sold_med_ids = items.values_list('medicine_id', flat=True).distinct()
        slow_moving = Medicine.objects.filter(
            shop=request.user.shop
        ).exclude(id__in=sold_med_ids).only('medicine_name', 'medicine_code', 'stock_quantity')[:20]

        return Response({
            "best_sellers": best_sellers_list,
            "slow_moving": [
                {
                    "medicine_name": m.medicine_name, 
                    "medicine_code": m.medicine_code, 
                    "current_stock": m.stock_quantity
                } for m in slow_moving
            ]
        })
    except Exception as e:
        logger.error(f"Inventory Analytics Pipeline Error: {e}")
        return Response({"error": "Failed to generate performance reports."}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, HasSalesAccess])
def gstr1_report(request):
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        sales_items = SaleItem.objects.filter(sale__shop=request.user.shop)
        
        if start_date: sales_items = sales_items.filter(sale__created_at__date__gte=start_date)
        if end_date: sales_items = sales_items.filter(sale__created_at__date__lte=end_date)

        # GST Reverse Calculation for Inclusive Tax
        report = sales_items.values('gst_percentage').annotate(
            taxable_value=Sum(
                ExpressionWrapper(
                    F('amount') / (1 + F('gst_percentage') / 100),
                    output_field=DecimalField()
                )
            ),
            total_gst=Sum(
                ExpressionWrapper(
                    F('amount') - (F('amount') / (1 + F('gst_percentage') / 100)),
                    output_field=DecimalField()
                )
            ),
            total_amount=Sum('amount')
        ).order_by('gst_percentage')

        final_report = []
        for entry in report:
            total_gst = Decimal(str(entry['total_gst'] or 0))
            final_report.append({
                "gst_rate": f"{entry['gst_percentage']}%",
                "taxable_value": round(float(entry['taxable_value'] or 0), 2),
                "cgst": round(float(total_gst / 2), 2),
                "sgst": round(float(total_gst / 2), 2),
                "total_gst": round(float(total_gst), 2),
                "total_amount": round(float(entry['total_amount'] or 0), 2)
            })

        return Response({
            "slabs": final_report,
            "total": {
                "taxable": round(sum(r['taxable_value'] for r in final_report), 2),
                "gst": round(sum(r['total_gst'] for r in final_report), 2),
                "amount": round(sum(r['total_amount'] for r in final_report), 2)
            }
        }, status=200)
    except Exception as e:
        logger.error(f"GST R1 Serialization Error: {e}")
        return Response({"error": "Internal analytical failure during GST grouping."}, status=500)
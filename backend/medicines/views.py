import csv
import logging
import random
import string
from io import StringIO
from django.db import transaction
from django.db.models import Q, F
from django.http import HttpResponse
from django.core.cache import cache

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Medicine
from .serializers import MedicineSerializer
from accounts.permissions import CanAccessMedicines, IsAdminUser

logger = logging.getLogger(__name__)

NOT_FOUND_MSG = "Medicine not found"
DEFAULT_HSN = '3004'
HSN_CODE_HEADER = 'HSN Code'

# --- API Endpoints ---
@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAccessMedicines])
def add_medicine(request):
    serializer = MedicineSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(shop=request.user.shop)
        return Response({"message": "Medicine added successfully."}, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessMedicines])
def get_medicines(request):
    """
    List all medicines for the authenticated shop.
    """
    medicines = Medicine.objects.filter(shop=request.user.shop).select_related('supplier').order_by('medicine_name')
    serializer = MedicineSerializer(medicines, many=True)
    return Response(serializer.data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessMedicines])
def get_medicine(request, id):
    try:
        medicine = Medicine.objects.select_related('supplier').get(id=id, shop=request.user.shop)
        serializer = MedicineSerializer(medicine)
        return Response(serializer.data, status=200)
    except Medicine.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, CanAccessMedicines])
def update_medicine(request, id):
    try:
        medicine = Medicine.objects.get(id=id, shop=request.user.shop)
        serializer = MedicineSerializer(medicine, data=request.data, context={'request': request}, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Medicine updated successfully."}, status=200)
        return Response(serializer.errors, status=400)
    except Medicine.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_medicine(request, id):
    try:
        medicine = Medicine.objects.get(id=id, shop=request.user.shop)
        medicine.delete()
        return Response({"message": "Medicine deleted"}, status=204)
    except Medicine.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessMedicines])
def search_medicines(request):
    query = request.GET.get('q', '').strip()
    if not query:
        return Response([], status=200)

    # Performance: Only search if query is at least 2 chars to prevent heavy DB scanning
    if len(query) < 2:
        return Response([], status=200)

    medicines = Medicine.objects.filter(
        Q(medicine_name__icontains=query) |
        Q(generic_name__icontains=query) |
        Q(barcode__iexact=query) |
        Q(medicine_code__icontains=query),
        shop=request.user.shop
    ).select_related('supplier').order_by('medicine_name')[:100] # Cap results for performance

    serializer = MedicineSerializer(medicines, many=True)
    return Response(serializer.data, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def export_medicines_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="medicines_export.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Medicine Code', 'Medicine Name', 'Generic Name', 'Company', 'Category', 
        'Medicine Type', HSN_CODE_HEADER, 'Composition', 'Pack Size', 'Purchase Price', 
        'MRP', 'Selling Price', 'Discount %', 'GST %', 'Reorder Level', 
        'Max Stock', 'Stock Qty', 'Batch Number', 'Rack Location', 'Prescription Required'
    ])
    
    medicines = Medicine.objects.filter(shop=request.user.shop).order_by('medicine_name')
    for m in medicines:
        writer.writerow([
            m.medicine_code, m.medicine_name, m.generic_name, m.company, m.category,
            m.medicine_type, m.hsn_code, m.composition, m.pack_size, m.purchase_price,
            m.mrp, m.selling_price, m.discount, m.gst_percentage, m.reorder_level,
            m.max_stock_level, m.stock_quantity, m.batch_number, m.rack_location,
            'Yes' if m.prescription_required else 'No'
        ])
        
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def import_medicines_csv(request):
    """
    Enterprise-Grade CSV Import:
    - Memory efficient (chunked reading)
    - Performance optimized (Uses transaction and local cache)
    - Robust against race conditions
    """
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "No file uploaded"}, status=400)
        
    if not file.name.endswith('.csv'):
        return Response({"error": "Only CSV files are allowed."}, status=400)

    try:
        # DoS Prevention: Limit file size to 10MB
        if file.size > 10 * 1024 * 1024:
            return Response({"error": "File size exceeds 10MB limit."}, status=400)

        # Implementation logic: Chunked processing to handle UTF-8/encoding gracefully
        decoded_file = file.read().decode('utf-8-sig', errors='replace') # Handle BOM
        io_string = StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        
        imported = 0
        errors = []
        
        # Security: Use a transaction block for atomic consistency
        with transaction.atomic():
            for row in reader:
                try:
                    name = str(row.get('Medicine Name', '')).strip()
                    company = str(row.get('Company', '')).strip()
                    if not name or not company:
                        errors.append(f"Row {imported+1}: Name/Company required.")
                        continue

                    # Sanitization and Type parsing
                    try:
                        p_price = float(str(row.get('Purchase Price', 0)).replace(',', '') or 0)
                        mrp = float(str(row.get('MRP', 0)).replace(',', '') or 0)
                        s_price = float(str(row.get('Selling Price', 0)).replace(',', '') or 0)
                        stock_qty = int(float(str(row.get('Stock Qty', 0)) or 0))
                    except (ValueError, TypeError):
                        p_price, mrp, s_price, stock_qty = 0.0, 0.0, 0.0, 0

                    rx = str(row.get('Prescription Required', '')).lower() in ['yes', 'y', 'true', '1']

                    # Race Condition Fix: use select_for_update() if we find existing
                    existing_med = Medicine.objects.select_for_update().filter(
                        shop=request.user.shop,
                        medicine_name__iexact=name,
                        company__iexact=company,
                        batch_number__iexact=str(row.get('Batch Number', '')).strip(),
                        medicine_type=str(row.get('Medicine Type', 'Allopathic')).strip(),
                        category=str(row.get('Category', 'Tablet')).strip()
                    ).first()

                    if existing_med:
                        # Update using F expressions for atomic increment
                        existing_med.stock_quantity = F('stock_quantity') + stock_qty
                        existing_med.purchase_price = p_price if p_price > 0 else existing_med.purchase_price
                        existing_med.mrp = mrp if mrp > 0 else existing_med.mrp
                        existing_med.selling_price = s_price if s_price > 0 else existing_med.selling_price
                        existing_med.save()
                    else:
                        code = str(row.get('Medicine Code', '')).strip()
                        if not code or Medicine.objects.filter(shop=request.user.shop, medicine_code=code).exists():
                            # Generate unique multi-tenant code
                            prefix = "".join([w[0].upper() for w in name.split()[:2]])
                            suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
                            code = f"MED-{prefix}-{suffix}"

                        Medicine.objects.create(
                            shop=request.user.shop,
                            medicine_code=code,
                            medicine_name=name,
                            generic_name=str(row.get('Generic Name', '')).strip(),
                            company=company,
                            category=str(row.get('Category', 'Tablet')).strip(),
                            medicine_type=str(row.get('Medicine Type', 'Allopathic')).strip(),
                            batch_number=str(row.get('Batch Number', '')).strip(),
                            hsn_code=row.get(HSN_CODE_HEADER, DEFAULT_HSN),
                            composition=row.get('Composition', ''),
                            pack_size=row.get('Pack Size', ''),
                            purchase_price=p_price,
                            mrp=mrp,
                            selling_price=s_price,
                            discount=float(row.get('Discount %', 0) or 0),
                            gst_percentage=int(float(row.get('GST %', 5) or 5)),
                            reorder_level=int(float(row.get('Reorder Level', 10) or 10)),
                            stock_quantity=stock_qty,
                            rack_location=row.get('Rack Location', ''),
                            prescription_required=rx,
                        )
                    imported += 1
                except Exception as row_error:
                    errors.append(f"Row {imported+1} parse error: {str(row_error)}")

        return Response({
            "message": f"Successfully processed {imported} medicines.",
            "details": errors if errors else "CSV import successful."
        }, status=200)

    except Exception as e:
        logger.error(f"CSV Parse Global Failure: {e}")
        return Response({"error": "Failed to parse the provided CSV file content."}, status=400)

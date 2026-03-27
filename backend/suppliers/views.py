from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Supplier
from .serializers import SupplierSerializer
from accounts.permissions import IsAdminUser, CanAccessSuppliers

NOT_FOUND_MSG = "Supplier not found"

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def add_supplier(request):
    serializer = SupplierSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save(shop=request.user.shop)
        return Response({"message": "Supplier added"}, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessSuppliers])
def get_suppliers(request):
    """
    List all suppliers for the authenticated shop.
    """
    suppliers = Supplier.objects.filter(shop=request.user.shop).order_by('-id')
    serializer = SupplierSerializer(suppliers, many=True)
    return Response(serializer.data, status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessSuppliers])
def get_supplier(request, id):
    try:
        supplier = Supplier.objects.get(id=id, shop=request.user.shop)
        serializer = SupplierSerializer(supplier)
        return Response(serializer.data, status=200)
    except Supplier.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_supplier(request, id):
    try:
        supplier = Supplier.objects.get(id=id, shop=request.user.shop)
        partial = request.method == 'PATCH'
        serializer = SupplierSerializer(supplier, data=request.data, context={'request': request}, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Supplier updated"}, status=200)
        return Response(serializer.errors, status=400)
    except Supplier.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_supplier(request, id):
    try:
        supplier = Supplier.objects.get(id=id, shop=request.user.shop)
        supplier.delete()
        return Response({"message": "Supplier deleted"}, status=204)
    except Supplier.DoesNotExist:
        return Response({"error": "Supplier not found"}, status=404)
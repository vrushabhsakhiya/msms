from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Customer
from .serializers import CustomerSerializer
from accounts.permissions import IsAdminUser, CanAccessCustomers
import logging

logger = logging.getLogger(__name__)

NOT_FOUND_MSG = "Customer not found"
APP_ERROR_MSG = "An unexpected error occurred. Please contact support."

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanAccessCustomers])
def add_customer(request):
    try:
        # Strip potentially malicious shop ID injection from frontend 
        data = request.data.copy()
        if 'shop' in data:
            del data['shop']
            
        serializer = CustomerSerializer(data=data)
        if serializer.is_valid():
            serializer.save(shop=request.user.shop)
            return Response({"message": "Customer added"}, status=201)
        return Response(serializer.errors, status=400)
    except Exception as e:
        logger.error(f"Error adding customer: {str(e)}")
        return Response({"error": APP_ERROR_MSG}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessCustomers])
def get_customers(request):
    """
    Paginated customer list.
    """
    try:
        customers = Customer.objects.filter(shop=request.user.shop).order_by('-id')
        
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 20
        
        result_page = paginator.paginate_queryset(customers, request)
        serializer = CustomerSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
    except Exception as e:
        logger.error(f"Error fetching customers: {str(e)}")
        return Response({"error": "An unexpected error occurred."}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessCustomers])
def get_customer(request, id):
    try:
        customer = Customer.objects.get(id=id, shop=request.user.shop)
        serializer = CustomerSerializer(customer)
        return Response(serializer.data, status=200)
    except Customer.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)
    except Exception as e:
        logger.error(f"Error fetching customer: {str(e)}")
        return Response({"error": APP_ERROR_MSG}, status=500)

@api_view(['PUT'])
@permission_classes([IsAuthenticated, CanAccessCustomers])
def update_customer(request, id):
    try:
        # Ensure shop isolation
        customer = Customer.objects.get(id=id, shop=request.user.shop)
        
        data = request.data.copy()
        if 'shop' in data:
            del data['shop'] # prevent hijacking to another shop
            
        serializer = CustomerSerializer(customer, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Customer updated"}, status=200)
        return Response(serializer.errors, status=400)
    except Customer.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)
    except Exception as e:
        logger.error(f"Error updating customer: {str(e)}")
        return Response({"error": APP_ERROR_MSG}, status=500)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_customer(request, id):
    try:
        customer = Customer.objects.get(id=id, shop=request.user.shop)
        customer.delete()
        return Response({"message": "Customer deleted"}, status=204)
    except Customer.DoesNotExist:
        return Response({"error": NOT_FOUND_MSG}, status=404)
    except Exception as e:
        logger.error(f"Error deleting customer: {str(e)}")
        return Response({"error": APP_ERROR_MSG}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanAccessCustomers])
def search_customer_by_mobile(request):
    mobile = request.query_params.get('mobile', '').strip()
    if not mobile or not mobile.isdigit() or len(mobile) != 10:
        return Response({"error": "Valid 10-digit mobile number required"}, status=400)
    
    try:
        customer = Customer.objects.get(mobile=mobile, shop=request.user.shop)
        serializer = CustomerSerializer(customer)
        
        from sales.models import Sale
        bill_count = Sale.objects.filter(customer=customer, shop=request.user.shop).count()
        
        data = serializer.data
        data['bill_count'] = bill_count
        return Response(data, status=200)
    except Customer.DoesNotExist:
        return Response({"message": "New customer"}, status=404)
    except Exception as e:
        logger.error(f"Error searching customer: {str(e)}")
        return Response({"error": APP_ERROR_MSG}, status=500)

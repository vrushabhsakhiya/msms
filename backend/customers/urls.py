from django.urls import path
from .views import get_customers, add_customer, get_customer, update_customer, delete_customer, search_customer_by_mobile

urlpatterns = [
    path('', get_customers),
    path('add/', add_customer),
    path('search/', search_customer_by_mobile),
    path('<int:id>/', get_customer),
    path('update/<int:id>/', update_customer),
    path('delete/<int:id>/', delete_customer),
]

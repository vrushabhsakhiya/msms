from django.urls import path
from .views import get_purchases, create_purchase, gstr2_report, purchase_report, delete_purchase, update_status, import_purchases_csv, get_next_codes

urlpatterns = [
    path('', get_purchases),
    path('next-codes/', get_next_codes),
    path('add/', create_purchase),
    path('import-csv/', import_purchases_csv),
    path('delete/<int:pk>/', delete_purchase),
    path('update/<int:pk>/', update_status),
    path('gstr2/', gstr2_report),
    path('report/', purchase_report),
]
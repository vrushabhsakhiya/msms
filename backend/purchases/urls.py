from django.urls import path
from .views import get_purchases, create_purchase, gstr2_report, purchase_report, delete_purchase

urlpatterns = [
    path('', get_purchases),
    path('add/', create_purchase),
    path('delete/<int:pk>/', delete_purchase),
    path('gstr2/', gstr2_report),
    path('report/', purchase_report),
]
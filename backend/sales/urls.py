from django.urls import path
from .views import (
    get_sales, create_sale, sales_report, gstr1_report, 
    delete_sale, profit_loss_report, product_performance_report, 
    send_e_invoice, process_sale_return, get_invoice_pdf, import_sales_csv
)

urlpatterns = [
    path('', get_sales),
    path('add/', create_sale),
    path('import-csv/', import_sales_csv),
    path('delete/<int:pk>/', delete_sale),
    path('return/', process_sale_return),
    path('<int:id>/invoice/', get_invoice_pdf),
    path('report/', sales_report),
    path('gstr1/', gstr1_report),
    path('profit-loss/', profit_loss_report),
    path('performance/', product_performance_report),
    path('send-e-invoice/<int:sale_id>/', send_e_invoice),
]

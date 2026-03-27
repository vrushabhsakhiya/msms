from django.urls import path
from .views import (
    inventory_summary,
    dashboard_view,
    low_stock_alerts,
    expiry_alerts,
    adjust_stock,
    approve_adjustment,
    stock_movements,
    get_batches,
    get_notifications
)

urlpatterns = [
    path('summary/', inventory_summary),
    path('dashboard/', dashboard_view),
    path('notifications/', get_notifications),
    # Alerts
    path('alerts/low-stock/', low_stock_alerts),
    path('alerts/expiry/', expiry_alerts),
    # Actions
    path('adjust/', adjust_stock),
    path('adjust/approve/<int:pk>/', approve_adjustment),
    # Reports
    path('movements/', stock_movements),
    path('batches/<int:medicine_id>/', get_batches),
]
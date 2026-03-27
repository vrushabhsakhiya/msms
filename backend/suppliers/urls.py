from django.urls import path
from .views import *

urlpatterns = [
    path('', get_suppliers),
    path('add/', add_supplier),
    path('<int:id>/', get_supplier),
    path('update/<int:id>/', update_supplier),
    path('delete/<int:id>/', delete_supplier),
]
from django.urls import path
from .views import add_medicine, get_medicines, get_medicine, update_medicine, delete_medicine, search_medicines, export_medicines_csv, import_medicines_csv

urlpatterns = [
    path('',                    get_medicines),
    path('add/',                add_medicine),
    path('search/',             search_medicines),
    path('export/',             export_medicines_csv),
    path('import/',             import_medicines_csv),
    path('<int:id>/',           get_medicine),
    path('<int:id>/update/',    update_medicine),
    path('<int:id>/delete/',    delete_medicine),
]
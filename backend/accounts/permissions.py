"""
Role-Based Access Control (RBAC) — as per audit/2. User Roles & Permissions
=============================================================================

ADMIN        → Full CRUD on all modules, user mgmt, pricing, reports, audit logs
PHARMACIST   → Medicine master, inventory/adjustments, expiry monitoring,
               batch tracking, view purchases/suppliers (NO billing price changes)
STAFF        → Sales/billing, customer registration, view-only inventory,
               invoices, returns, daily sales report.
               NO access to: purchases, pricing changes, user management

Per audit/15. Business Rules:
  - Staff cannot access user management, pricing, or purchase modules
  - Only Admin can delete records or modify prices
"""
from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """Admin only — full access."""
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and request.user.role == 'admin'
        )


class IsPharmacistOrAdmin(permissions.BasePermission):
    """Admin or Pharmacist — medicine / inventory management."""
    message = "Only pharmacists and administrators can perform this action."

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and request.user.role in ['admin', 'pharmacist']
        )


class IsAnyStaff(permissions.BasePermission):
    """Any authenticated shop user (admin / pharmacist / staff)."""
    message = "Authentication required."

    def has_permission(self, request, view):
        return (
            bool(request.user and request.user.is_authenticated)
            and request.user.role in ['admin', 'staff', 'pharmacist']
        )


class CanAccessMedicines(permissions.BasePermission):
    """
    Medicines (spec §2):
      GET  → all roles (staff view-only)
      POST/PUT/PATCH → admin + pharmacist
      DELETE → admin only
    """
    message = "You do not have permission to modify medicines."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'GET':
            return role in ['admin', 'pharmacist', 'staff']
        if request.method == 'DELETE':
            return role == 'admin'
        # POST / PUT / PATCH
        return role in ['admin', 'pharmacist']


class CanAccessPurchases(permissions.BasePermission):
    """
    Purchases (spec §2):
      All methods → admin only
      Pharmacist can VIEW (GET) only
    """
    message = "Only administrators can manage purchases."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'GET':
            return role in ['admin', 'pharmacist']
        return role == 'admin'


class CanAccessSales(permissions.BasePermission):
    """
    Sales / Billing (spec §2):
      All roles can create bills and view sales.
      DELETE → admin only (returns/cancellations)
    """
    message = "You do not have permission to access sales."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'DELETE':
            return role == 'admin'
        return role in ['admin', 'pharmacist', 'staff']


class CanAccessCustomers(permissions.BasePermission):
    """
    Customers (spec §2):
      Staff + Admin → full CRUD
      Pharmacist → GET only
    """
    message = "You do not have permission to manage customers."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'GET':
            return role in ['admin', 'staff', 'pharmacist']
        return role in ['admin', 'staff']


class CanAccessSuppliers(permissions.BasePermission):
    """
    Suppliers (spec §2):
      Admin → full CRUD
      Pharmacist → GET (view purchase/supplier info)
      Staff → no access
    """
    message = "Only administrators and pharmacists can view suppliers."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'GET':
            return role in ['admin', 'pharmacist']
        return role == 'admin'


class CanAccessInventory(permissions.BasePermission):
    """
    Inventory / Stock Alerts (spec §2):
      Admin + Pharmacist → full access (adjustments, expiry monitoring)
      Staff → GET/view only
    """
    message = "You do not have permission to manage inventory."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        role = request.user.role
        if request.method == 'GET':
            return role in ['admin', 'pharmacist', 'staff']
        # POST/PUT/DELETE adjustments → admin and pharmacist
        return role in ['admin', 'pharmacist']


class CanAccessReports(permissions.BasePermission):
    """
    Reports (spec §2):
      Admin → all reports
      Staff → daily sales report only (enforced via frontend)
      Pharmacist → stock / expiry reports
    """
    message = "You do not have permission to access reports."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role in ['admin', 'pharmacist', 'staff']


class CanDeleteOrModifyPrices(permissions.BasePermission):
    """
    Spec §15: Only Admin can delete records or modify prices.
    """
    message = "Only administrators can delete records or modify prices."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.role == 'admin'


# ── Legacy aliases (keep existing references working) ──────────────────────
class IsStaffOrAdmin(IsAnyStaff): pass
class DynamicPermission(CanAccessMedicines): pass
class HasMedicineAccess(CanAccessMedicines): pass
class HasSalesAccess(CanAccessSales): pass
class HasPurchaseAccess(CanAccessPurchases): pass

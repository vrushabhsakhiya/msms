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
    """Medicines: Checks custom_role permissions or falls back to system roles."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_medicine
            if request.method == 'POST': return role.can_add_medicine
            if request.method in ['PUT', 'PATCH']: return role.can_edit_medicine
            if request.method == 'DELETE': return role.can_delete_medicine
        
        role = request.user.role
        if request.method == 'GET': return role in ['admin', 'pharmacist', 'staff']
        if request.method == 'DELETE': return role == 'admin'
        return role in ['admin', 'pharmacist']


class CanAccessPurchases(permissions.BasePermission):
    """Purchases: Checks custom_role permissions or falls back to admin only."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_purchases
            if request.method == 'POST': return role.can_add_purchase
            if request.method in ['PUT', 'PATCH']: return role.can_edit_purchase
            if request.method == 'DELETE': return role.can_delete_purchase

        role = request.user.role
        if request.method == 'GET': return role in ['admin', 'pharmacist']
        return role == 'admin'


class CanAccessSales(permissions.BasePermission):
    """Sales/Billing: Checks custom_role permissions."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_sales
            if request.method == 'POST': return role.can_create_bill
            if request.method in ['PUT', 'PATCH']: return role.can_edit_bill
            if request.method == 'DELETE': return role.can_delete_bill

        role = request.user.role
        if request.method == 'DELETE': return role == 'admin'
        return role in ['admin', 'pharmacist', 'staff']


class CanAccessCustomers(permissions.BasePermission):
    """Customers: Checks custom_role permissions (mapping to Sales module flags)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            # Using Sales module flags as proxy for Customer management
            if request.method == 'GET': return role.can_view_sales
            return role.can_create_bill

        role = request.user.role
        if request.method == 'GET': return role in ['admin', 'staff', 'pharmacist']
        return role in ['admin', 'staff']


class CanAccessSuppliers(permissions.BasePermission):
    """Suppliers: Checks custom_role permissions (mapping to Purchase module flags)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_purchases
            return role.can_add_purchase

        role = request.user.role
        if request.method == 'GET': return role in ['admin', 'pharmacist']
        return role == 'admin'


class CanAccessInventory(permissions.BasePermission):
    """Inventory: Checks custom_role permissions (mapping to Medicine module flags)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_medicine
            return role.can_add_medicine

        role = request.user.role
        if request.method == 'GET': return role in ['admin', 'pharmacist', 'staff']
        return role in ['admin', 'pharmacist']


class CanAccessReports(permissions.BasePermission):
    """Reports: Checks custom_role permissions."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated): return False
        
        if request.user.custom_role:
            role = request.user.custom_role
            if request.method == 'GET': return role.can_view_reports
            return role.can_generate_reports

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

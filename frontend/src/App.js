import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import AccessDenied from "./pages/AccessDenied";
import Medicines from "./pages/Medicines";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import Purchase from "./pages/Purchase";
import Billing from "./pages/Billing";
import Payments from "./pages/Payments";
import Invoice from "./pages/Invoice";
import SalesReport from "./pages/SalesReport";
import GSTRReport from "./pages/GSTRReport";
import GSTR2Report from "./pages/GSTR2Report";
import Reports from "./pages/Reports";
import Inventory from "./pages/Inventory";
import UserManagement from "./pages/UserManagement";
import RegisterShop from "./pages/RegisterShop";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

/**
 * App routing — per audit/2. User Roles & Permissions
 *
 * ADMIN      : Full access to all routes
 * PHARMACIST : Medicines(CRUD), Purchases(view), Suppliers(view),
 *              Inventory, Alerts, Billing, Payments
 * STAFF      : Dashboard, Medicines(view), Billing, Payments, Customers
 *
 * Per spec §15 (Validations):
 *   - Staff cannot access user management, pricing, or purchase modules
 *   - Only Admin can delete records or modify prices
 */
import ProfitLoss from "./pages/ProfitLoss";
import ProductPerformance from "./pages/ProductPerformance";
import PurchaseHistory from "./pages/PurchaseHistory";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<RegisterShop />} />
        <Route path="/invoice" element={<Invoice />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* ── Dashboard: all authenticated roles ── */}
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Dashboard />
          </PrivateRoute>
        } />

        {/* ── Profile & Settings ── */}
        <Route path="/profile" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Profile />
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Settings />
          </PrivateRoute>
        } />

        {/* ── Medicines: all roles (view-only enforced inside page for staff) ── */}
        <Route path="/medicines" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Medicines />
          </PrivateRoute>
        } />

        {/* ── Purchases: Admin & Manager */}
        <Route path="/purchase" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist"]}>
            <Purchase />
          </PrivateRoute>
        } />

        {/* ── Suppliers: Admin & Manager */}
        <Route path="/suppliers" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist"]}>
            <Suppliers />
          </PrivateRoute>
        } />

        {/* ── Billing: All roles ── */}
        <Route path="/billing" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Billing />
          </PrivateRoute>
        } />

        {/* ── Payments: All roles ── */}
        <Route path="/payments" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Payments />
          </PrivateRoute>
        } />

        {/* ── Customers: All roles can view customer DB ── */}
        <Route path="/customers" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist", "cashier", "staff"]}>
            <Customers />
          </PrivateRoute>
        } />

        {/* ── Inventory Module (Spec §9): Admin, Manager, Pharmacist ── */}
        <Route path="/inventory" element={
          <PrivateRoute allowedRoles={["admin", "manager", "pharmacist"]}>
            <Inventory />
          </PrivateRoute>
        } />

        {/* ── Reports: Admin only (spec §2.2 — staff gets daily sales via billing) ── */}
        {/* ── Reports Center (Admin & Manager) ── */}
        <Route path="/reports" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <Reports />
          </PrivateRoute>
        } />

        <Route path="/sales-report" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <SalesReport />
          </PrivateRoute>
        } />
        <Route path="/gstr-report" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <GSTRReport />
          </PrivateRoute>
        } />
        <Route path="/gstr2-report" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <GSTR2Report />
          </PrivateRoute>
        } />
        <Route path="/profit-loss" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <ProfitLoss />
          </PrivateRoute>
        } />
        <Route path="/product-performance" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <ProductPerformance />
          </PrivateRoute>
        } />
        <Route path="/purchase-history" element={
          <PrivateRoute allowedRoles={["admin", "manager"]}>
            <PurchaseHistory />
          </PrivateRoute>
        } />

        {/* ── User Management: Admin only (spec §2.2 — staff NO user mgmt) ── */}
        <Route path="/user-management" element={
          <PrivateRoute allowedRoles={["admin"]}>
            <UserManagement />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

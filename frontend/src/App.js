import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";

// ── Smart Loading: Lazy-loaded components for better initial performance ──
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const Medicines = lazy(() => import("./pages/Medicines"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Customers = lazy(() => import("./pages/Customers"));
const Purchase = lazy(() => import("./pages/Purchase"));
const Billing = lazy(() => import("./pages/Billing"));
const Payments = lazy(() => import("./pages/Payments"));
const Invoice = lazy(() => import("./pages/Invoice"));
const Reports = lazy(() => import("./pages/Reports"));
const SalesReport = lazy(() => import("./pages/SalesReport"));
const GSTRReport = lazy(() => import("./pages/GSTRReport"));
const GSTR2Report = lazy(() => import("./pages/GSTR2Report"));
const Inventory = lazy(() => import("./pages/Inventory"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const RegisterShop = lazy(() => import("./pages/RegisterShop"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const ProfitLoss = lazy(() => import("./pages/ProfitLoss"));
const ProductPerformance = lazy(() => import("./pages/ProductPerformance"));
const PurchaseHistory = lazy(() => import("./pages/PurchaseHistory"));

// Loading Fallback Component
const Loader = () => (
  <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-main)" }}>
    <div className="loader"></div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* ── Public Routes ── */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
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

          {/* ── Medicines ── */}
          <Route path="/medicines" element={
            <PrivateRoute requiredModule="medicine">
              <Medicines />
            </PrivateRoute>
          } />

          {/* ── Purchases ── */}
          <Route path="/purchase" element={
            <PrivateRoute requiredModule="purchase">
              <Purchase />
            </PrivateRoute>
          } />

          {/* ── Suppliers ── */}
          <Route path="/suppliers" element={
            <PrivateRoute requiredModule="purchase">
              <Suppliers />
            </PrivateRoute>
          } />

          {/* ── Billing ── */}
          <Route path="/billing" element={
            <PrivateRoute requiredModule="sales">
              <Billing />
            </PrivateRoute>
          } />

          {/* ── Payments ── */}
          <Route path="/payments" element={
            <PrivateRoute requiredModule="sales">
              <Payments />
            </PrivateRoute>
          } />

          {/* ── Customers ── */}
          <Route path="/customers" element={
            <PrivateRoute requiredModule="sales">
              <Customers />
            </PrivateRoute>
          } />

          {/* ── Inventory ── */}
          <Route path="/inventory" element={
            <PrivateRoute requiredModule="medicine">
              <Inventory />
            </PrivateRoute>
          } />

          {/* ── Reports Center ── */}
          <Route path="/reports" element={
            <PrivateRoute requiredModule="reports">
              <Reports />
            </PrivateRoute>
          } />

          <Route path="/sales-report" element={
            <PrivateRoute requiredModule="reports">
              <SalesReport />
            </PrivateRoute>
          } />
          <Route path="/gstr-report" element={
            <PrivateRoute requiredModule="reports">
              <GSTRReport />
            </PrivateRoute>
          } />
          <Route path="/gstr2-report" element={
            <PrivateRoute requiredModule="reports">
              <GSTR2Report />
            </PrivateRoute>
          } />
          <Route path="/profit-loss" element={
            <PrivateRoute requiredModule="reports">
              <ProfitLoss />
            </PrivateRoute>
          } />
          <Route path="/product-performance" element={
            <PrivateRoute requiredModule="reports">
              <ProductPerformance />
            </PrivateRoute>
          } />
          <Route path="/purchase-history" element={
            <PrivateRoute requiredModule="reports">
              <PurchaseHistory />
            </PrivateRoute>
          } />

          <Route path="/audit-logs" element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AuditLogs />
            </PrivateRoute>
          } />

          {/* ── User Management ── */}
          <Route path="/user-management" element={
            <PrivateRoute allowedRoles={["admin"]}>
              <UserManagement />
            </PrivateRoute>
          } />

          {/* ── 404 Catch-all ── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

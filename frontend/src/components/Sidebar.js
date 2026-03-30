import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  LayoutDashboard,
  Pill,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  AlertTriangle,
  BarChart3,
  LogOut,
  ShieldCheck,
  ClipboardList,
  UserCog,
  PackageSearch,
  Stethoscope,
  Receipt,
  Menu,
  ChevronLeft,
  ChevronRight,
  History,
} from "lucide-react";

/**
 * Sidebar navigation — per audit/2. User Roles & Permissions spec
 */
function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "staff").toLowerCase();
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const shopName = localStorage.getItem("shop_name") || "Pharmly";
  const [alertCount, setAlertCount] = useState(0);
  const [branding, setBranding] = useState({ product_name: "Pharmly", logo: null });

  useEffect(() => {
    fetchBranding();
    if (role === "admin" || role === "pharmacist") fetchAlerts();
  }, [role]);

  const fetchBranding = async () => {
    try {
      const res = await API.get("auth/branding/");
      setBranding(res.data);
    } catch (_) { }
  };

  const fetchAlerts = async () => {
    try {
      const res = await API.get("inventory/alerts/expiry/");
      setAlertCount(res.data.length);
    } catch (_) { }
  };

  const menuItems = [
    {
      group: null,
      items: [
        {
          name: "Dashboard",
          path: "/dashboard",
          icon: LayoutDashboard,
          module: null, // Always visible
        },
      ],
    },
    {
      group: "Inventory",
      items: [
        {
          name: "Medicines",
          path: "/medicines",
          icon: Pill,
          module: "medicine",
        },
        {
          name: "Inventory Dashboard",
          path: "/inventory",
          icon: PackageSearch,
          module: "medicine",
          badge: alertCount > 0 ? alertCount : null,
        },
      ],
    },
    {
      group: "Purchases",
      items: [
        {
          name: "Purchases",
          path: "/purchase",
          icon: ShoppingCart,
          module: "purchase",
        },
        {
          name: "Suppliers",
          path: "/suppliers",
          icon: Truck,
          module: "purchase",
        },
      ],
    },
    {
      group: "Sales",
      items: [
        {
          name: "Billing",
          path: "/billing",
          icon: FileText,
          module: "sales",
        },
        {
          name: "Payments",
          path: "/payments",
          icon: Receipt,
          module: "sales",
        },
        {
          name: "Customers",
          path: "/customers",
          icon: Users,
          module: "sales",
        },
      ],
    },
    {
      group: "Reports",
      items: [
        {
          name: "Reporting Center",
          path: "/reports",
          icon: BarChart3,
          module: "reports",
        },
        {
          name: "Sales Analysis",
          path: "/sales-report",
          icon: BarChart3,
          module: "reports",
        },
        {
          name: "GST Filings",
          path: "/gstr-report",
          icon: PackageSearch,
          module: "reports",
        },
      ],
    },
    {
      group: "Administration",
      items: [
        {
          name: "Manage Staff",
          path: "/user-management",
          icon: UserCog,
          module: "admin_only",
        },
        {
          name: "System Audit Logs",
          path: "/audit-logs",
          icon: History,
          module: "admin_only",
        },
      ],
    },
  ];

  return (
    <div className={`sidebar ${collapsed ? "collapsed" : ""}`} style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Logo ── */}
      <div className="sidebar-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {branding.logo ? (
            <img
              src={branding.logo}
              alt="Logo"
              style={{ width: "30px", height: "30px", objectFit: "contain" }}
            />
          ) : (
            <Pill className="text-primary" size={26} />
          )}
          {!collapsed && (
            <span style={{ fontSize: "1.3rem", fontWeight: "800" }}>
              {branding.product_name}
            </span>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "0 0.5rem" : "0 0.5rem 2rem 0.5rem" }}>
        {menuItems.map((section) => {
          const visible = section.items.filter(i => {
            if (role === 'admin') return true;
            if (i.module === 'admin_only') return false;
            if (!i.module) return true; // Dashboard etc
            return permissions[i.module]?.read === true;
          });
          if (visible.length === 0) return null;
          return (
            <div key={section.group || "main"} style={{ marginBottom: collapsed ? "0.5rem" : "1.25rem" }}>
              {section.group && !collapsed && (
                <div className="sidebar-group-label" style={{
                  fontSize: "0.67rem", fontWeight: "800", letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.35)", padding: "0.75rem 0.75rem 0.25rem",
                  textTransform: "uppercase",
                }}>
                  {section.group}
                </div>
              )}
              {visible.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onDoubleClick={() => setCollapsed(!collapsed)}
                    className={`nav-link ${active ? "active" : ""}`}
                    title={collapsed ? `${item.name} (Double-click to expand)` : ""}
                    style={{ position: "relative" }}
                  >
                    <div className="nav-item-icon">
                      <item.icon size={20} />
                    </div>
                    {!collapsed && <span>{item.name}</span>}

                    {item.badge && (
                      <span className={collapsed ? "badge-dot" : "badge-count"} style={{
                        position: collapsed ? "absolute" : "static",
                        top: collapsed ? "5px" : "auto",
                        right: collapsed ? "5px" : "auto",
                        background: "#ef4444", color: "white",
                        fontSize: "0.65rem", padding: collapsed ? "4px" : "2px 6px",
                        borderRadius: "10px", fontWeight: "800",
                        minWidth: collapsed ? "8px" : "auto",
                        height: collapsed ? "8px" : "auto",
                      }}>
                        {!collapsed && item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

    </div>
  );
}

export default Sidebar;

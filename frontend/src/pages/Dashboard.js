import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  ArrowRight,
  ShoppingCart,
  Calendar,
  Package,
  PlusCircle,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "staff").toLowerCase();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await API.get("inventory/dashboard/");
      setData(res.data);
    } catch (err) {
      console.error("Error loading dashboard", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: "flex", height: "70vh", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontWeight: "500" }}>
            Curating your pharmacy insights...
          </p>
        </div>
      </Layout>
    );
  }

  const summaryCards = [
    {
      label: "Today's Sales",
      value: `₹${data?.summary?.today_sales?.toLocaleString("en-IN") || 0}`,
      icon: ShoppingCart,
      color: "#10b981", // Emerald
      bg: "#ecfdf5",
      desc: `${data?.summary?.today_bills || 0} bills generated today`,
    },
    {
      label: "Today's Bills",
      value: data?.summary?.today_bills || 0,
      icon: FileText,
      color: "#3b82f6", // Blue
      bg: "#eff6ff",
      desc: "Total invoices issued",
    },
    {
      label: "Today's Collection",
      value: `₹${data?.summary?.today_collection?.toLocaleString("en-IN") || 0}`,
      icon: DollarSign,
      color: "#06b6d4", // Cyan
      bg: "#ecfeff",
      desc: "Total cash/UPI received",
    },
    {
      label: "Pending Payments",
      value: `₹${data?.summary?.pending_payments?.toLocaleString("en-IN") || 0}`,
      icon: Clock,
      color: "#f59e0b", // Amber
      bg: "#fffbeb",
      desc: "Outstanding from customers",
    },
  ];

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  const pieData = data?.charts?.payment_mode?.map(item => ({
    name: item.payment_mode,
    value: parseFloat(item.total)
  })) || [];

  return (
    <Layout title="Dashboard" subtitle={`Welcome back, ${role}. Here's what's happening today.`}>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", justifyContent: "flex-end" }}>
        <button className="filter-btn"><Calendar size={16} /> Last 7 Days</button>
        <button className="btn-primary" onClick={() => navigate("/billing")}>
          <PlusCircle size={18} /> Create New Sale
        </button>
      </div>

      {/* Top Row - Summary Cards */}
      <div className="dashboard-grid">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="card stat-card" style={{ padding: "1.25rem", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "12px", backgroundColor: card.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <card.icon size={22} color={card.color} />
              </div>
              <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", gap: "2px" }}>
                <TrendingUp size={12} /> +12%
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "#1e293b" }}>{card.value}</h3>
            <p style={{ margin: "4px 0 10px 0", fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>{card.label}</p>
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px", marginTop: "5px", fontSize: "0.8rem", color: "#94a3b8" }}>
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Middle Row - Charts */}
      <div className="chart-grid">
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>Sales Trend</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Last 7 Days</span>
          </div>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.charts?.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', color: 'var(--primary)' }}
                />
                <Line type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", marginBottom: "1.5rem" }}>Payment Modes</h3>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Alert Panels */}
      <div className="alert-grid">
        <div className="alert-panel red">
          <div>
            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Low Stock</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>{data?.alerts?.low_stock || 0}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--danger)" }}>Items</span>
            </div>
          </div>
          <Link to="/inventory" className="panel-action">View Details <ArrowRight size={14} /></Link>
        </div>
        <div className="alert-panel orange">
          <div>
            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Expiring Soon</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>{data?.alerts?.expiring_soon || 0}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--warning)" }}>Batches</span>
            </div>
          </div>
          <Link to="/inventory?filter=expiring" className="panel-action">View Details <ArrowRight size={14} /></Link>
        </div>
        <div className="alert-panel red">
          <div>
            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Out of Stock</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>{data?.alerts?.out_of_stock || 0}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--danger)" }}>Critical</span>
            </div>
          </div>
          <Link to="/purchase" className="panel-action">Create Purchase <ArrowRight size={14} /></Link>
        </div>
        <div className="alert-panel orange">
          <div>
            <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Pending Payments</h4>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>₹{data?.alerts?.pending_payments?.toLocaleString("en-IN") || 0}</span>
            </div>
          </div>
          <Link to="/customers" className="panel-action">View Ledger <ArrowRight size={14} /></Link>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>Recent Activity</h3>
            <button style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}>View All</button>
          </div>
          <div className="activity-list">
            {(data?.recent_activity || []).map((act, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-icon" style={{ backgroundColor: act.type === 'OUT' ? '#ecfdf5' : act.type === 'IN' ? '#eff6ff' : '#fef2f2' }}>
                  {act.type === 'OUT' ? <ShoppingCart size={20} color="#10b981" /> : act.type === 'IN' ? <Package size={20} color="#3b82f6" /> : <Activity size={20} color="#ef4444" />}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>{act.description}</h4>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>by {act.user} • {act.time}</p>
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>
                  {act.type === 'OUT' ? '-' : '+'}{act.amount}
                </div>
              </div>
            ))}
            {(!data?.recent_activity || data.recent_activity.length === 0) && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No recent activity</div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", marginBottom: "1.5rem" }}>Top Selling Products</h3>
          <div className="top-selling-list">
            {(data?.top_selling || []).map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.8rem", color: "#64748b" }}>
                  #{idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "600" }}>{item.medicine__medicine_name}</h4>
                  <div style={{ height: "6px", width: "100%", backgroundColor: "#f1f5f9", borderRadius: "3px", marginTop: "6px" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (item.total_qty / 500) * 100)}%`, backgroundColor: COLORS[idx % COLORS.length], borderRadius: "3px" }}></div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{item.total_qty}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Units sold</div>
                </div>
              </div>
            ))}
            {(!data?.top_selling || data.top_selling.length === 0) && (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No data available</div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;

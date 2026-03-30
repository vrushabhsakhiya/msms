import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  TrendingUp, FileText, Download, Printer, BadgePercent, ArrowUpRight, BarChart3
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "white", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <p style={{ margin: "0 0 6px 0", fontWeight: "700", color: "#1e293b" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: "2px 0", fontSize: "0.85rem", color: p.color, fontWeight: "600" }}>
            {p.name === "revenue" ? `₹${p.value.toLocaleString("en-IN")}` : `${p.value} Bills`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SalesReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    payment_mode: "All",
    customer_type: "All"
  });

  const handlePrint = useCallback(() => window.print(), []);

  // Ctrl+P shortcut
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrint]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const query = `?start_date=${filters.start_date}&end_date=${filters.end_date}&payment_mode=${filters.payment_mode}&customer_type=${filters.customer_type}`;
      const res = await API.get(`sales/report/${query}`);
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching sales report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [filters]);

  const downloadCSV = () => {
    if (!report) return;
    let csv = "Sales Analysis Report\n";
    csv += `Period: ${filters.start_date} to ${filters.end_date}\n\n`;
    csv += "Invoice No,Date,Customer,Mobile,Mode,Discount,Net Amount(₹)\n";
    report.recent_sales.forEach(sale => {
      csv += `"${sale.invoice_number}","${new Date(sale.created_at).toLocaleDateString()}","${sale.customer_name}","${sale.customer_mobile || "Walk-in"}","${sale.payment_mode}",${sale.discount_amount},${sale.net_amount}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Sales_Report_${filters.start_date}_to_${filters.end_date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Format trend data for Recharts
  const trendData = (report?.daily_trend || []).map(d => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    revenue: Number.parseFloat(d.revenue || 0),
    bills: d.bills || 0
  }));

  return (
    <Layout>
      {/* Header */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <TrendingUp size={32} className="text-secondary" /> Sales Analysis
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Comprehensive sales tracking and payment analytics</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-secondary" onClick={handlePrint} title="Print (Ctrl+P)">
            <Printer size={18} /> Print PDF
          </button>
          <button className="btn-primary" style={{ backgroundColor: "#065f46" }} onClick={downloadCSV}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card no-print" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Start Date</label>
            <input type="date" className="custom-input" value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>End Date</label>
            <input type="date" className="custom-input" value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Payment Mode</label>
            <select className="custom-input" value={filters.payment_mode}
              onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value })}>
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Customer Type</label>
            <select className="custom-input" value={filters.customer_type}
              onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })}>
              <option value="All">All Types</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Registered">Registered</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Loading report...</div>
      )}

      {report && (
        <div className="print-area">
          <style>{`
            @media print {
              .no-print, .sidebar, .navbar, .layout-header, header, footer, .btn-primary, .btn-secondary {
                display: none !important;
              }
              .layout-content, .main-content, .print-area {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                overflow: visible !important;
              }
              .card {
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
                margin-bottom: 2rem !important;
                padding: 1.5rem !important;
                overflow: visible !important;
              }
              table { width: 100% !important; border-collapse: collapse !important; }
              th, td { border: 1px solid #cbd5e1 !important; padding: 10px !important; font-size: 11px !important; }
              body { background: white !important; }
              .recharts-responsive-container { display: none !important; }
            }
          `}</style>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
            <SummaryCard title="Total Sales" value={`₹${report.summary.total_revenue.toLocaleString("en-IN")}`} color="#10b981" icon={<TrendingUp />} />
            <SummaryCard title="Total Invoices" value={report.summary.total_bills} color="#3b82f6" icon={<FileText />} />
            <SummaryCard title="Avg. Bill Value" value={`₹${report.summary.avg_bill.toLocaleString("en-IN")}`} color="#8b5cf6" icon={<ArrowUpRight />} />
            <SummaryCard title="Total Tax (GST)" value={`₹${report.summary.total_tax.toLocaleString("en-IN")}`} color="#f59e0b" icon={<BadgePercent />} />
          </div>

          {/* Charts */}
          <div className="no-print" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            {/* Sales Trend - AreaChart */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>Sales Trend</h3>
                <BarChart3 size={20} style={{ color: "#94a3b8" }} />
              </div>
              <div style={{ height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--primary)" fillOpacity={0.1} strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.1rem", fontWeight: "700" }}>By Payment Mode</h3>
              <div style={{ height: "180px", marginBottom: "1rem" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.payment_breakdown}>
                    <XAxis dataKey="payment_mode" hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {report.payment_breakdown.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {report.payment_breakdown.map((pm, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span style={{ fontWeight: "700", fontSize: "0.85rem" }}>{pm.payment_mode}</span>
                    </div>
                    <div style={{ fontWeight: "800" }}>₹{Number.parseFloat(pm.amount || 0).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <h3 style={{ margin: "0 0 1.5rem 0" }}>Recent Transactions</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date &amp; Time</th>
                  <th>Customer</th>
                  <th>Mode</th>
                  <th style={{ textAlign: "right" }}>Discount</th>
                  <th style={{ textAlign: "right" }}>Net Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.recent_sales.map(sale => (
                  <tr key={sale.id}>
                    <td style={{ fontWeight: "800", color: "var(--primary)" }}>{sale.invoice_number}</td>
                    <td>{new Date(sale.created_at).toLocaleString()}</td>
                    <td>{sale.customer_name}</td>
                    <td>{sale.payment_mode}</td>
                    <td style={{ textAlign: "right", color: "#dc2626" }}>-₹{sale.discount_amount}</td>
                    <td style={{ textAlign: "right", fontWeight: "800" }}>₹{Number.parseFloat(sale.net_amount).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

function SummaryCard({ title, value, color, icon }) {
  return (
    <div className="card" style={{ borderLeft: `5px solid ${color}`, display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ backgroundColor: `${color}15`, color, padding: "12px", borderRadius: "12px" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>{title}</div>
        <div style={{ fontSize: "1.25rem", fontWeight: "900" }}>{value}</div>
      </div>
    </div>
  );
}

export default SalesReport;

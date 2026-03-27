import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  BarChart3,
  TrendingUp,
  FileText,
  Calendar,
  Download,
  Printer,
  Filter,
  ChevronRight,
  CreditCard,
  BadgePercent,
  ArrowUpRight
} from "lucide-react";

function SalesReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    payment_mode: "All",
    customer_type: "All"
  });

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

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <TrendingUp size={32} className="text-secondary" /> Sales Analysis
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Comprehensive revenue tracking and payment analytics</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          <button className="btn-primary" style={{ backgroundColor: "#065f46" }}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Start Date</label>
            <input
              type="date"
              className="custom-input"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>End Date</label>
            <input
              type="date"
              className="custom-input"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Payment Mode</label>
            <select
              className="custom-input"
              value={filters.payment_mode}
              onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value })}
            >
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: "700" }}>Customer Type</label>
            <select
              className="custom-input"
              value={filters.customer_type}
              onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })}
            >
              <option value="All">All Types</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Registered">Registered</option>
            </select>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
            <SummaryCard title="Total Revenue" value={`₹${report.summary.total_revenue.toLocaleString()}`} color="#10b981" icon={<TrendingUp />} />
            <SummaryCard title="Total Invoices" value={report.summary.total_bills} color="#3b82f6" icon={<FileText />} />
            <SummaryCard title="Avg. Bill Value" value={`₹${report.summary.avg_bill}`} color="#8b5cf6" icon={<ArrowUpRight />} />
            <SummaryCard title="Total Tax (GST)" value={`₹${report.summary.total_tax.toLocaleString()}`} color="#f59e0b" icon={<BadgePercent />} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
            {/* Chart Placeholder */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0 }}>Revenue Trend</h3>
                <BarChart3 size={20} className="text-muted" />
              </div>
              <div style={{ height: "250px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center", color: "#94a3b8" }}>
                  <ActivityChart data={report.daily_trend} />
                </div>
              </div>
            </div>

            {/* Payment Mode Breakdown */}
            <div className="card">
              <h3 style={{ margin: "0 0 1.5rem 0" }}>By Payment Mode</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {report.payment_breakdown.map((pm, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: idx === 0 ? "#10b981" : idx === 1 ? "#3b82f6" : "#f59e0b" }}></div>
                      <span style={{ fontWeight: "700" }}>{pm.payment_mode}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "800" }}>₹{pm.amount.toLocaleString()}</div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{pm.count} Invoices</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Transaction List */}
          <div className="card">
            <h3 style={{ margin: "0 0 1.5rem 0" }}>Recent Transactions</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date & Time</th>
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
                    <td>
                      <div style={{ fontWeight: "600" }}>{sale.customer_name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{sale.customer_mobile || "Walk-in"}</div>
                    </td>
                    <td>
                      <span style={{
                        padding: "4px 8px",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        color: "#3b82f6",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: "800"
                      }}>
                        {sale.payment_mode.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "#dc2626" }}>-₹{sale.discount_amount}</td>
                    <td style={{ textAlign: "right", fontWeight: "800" }}>₹{parseFloat(sale.net_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}

function SummaryCard({ title, value, color, icon }) {
  return (
    <div className="card" style={{ borderLeft: `5px solid ${color}`, display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{
        backgroundColor: `${color}15`,
        color: color,
        padding: "12px",
        borderRadius: "12px"
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>{title}</div>
        <div style={{ fontSize: "1.25rem", fontWeight: "900" }}>{value}</div>
      </div>
    </div>
  );
}

function ActivityChart({ data }) {
  if (!data || data.length === 0) return <span>No trend data available for this range.</span>;

  const maxRev = Math.max(...data.map(d => d.revenue)) || 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "150px" }}>
      {data.map((d, i) => (
        <div
          key={i}
          title={`${d.date}: ₹${d.revenue}`}
          style={{
            width: "15px",
            height: `${(d.revenue / maxRev) * 100}%`,
            backgroundColor: "var(--primary)",
            borderRadius: "4px 4px 0 0",
            opacity: 0.7 + (i / data.length) * 0.3
          }}
        />
      ))}
    </div>
  );
}

export default SalesReport;

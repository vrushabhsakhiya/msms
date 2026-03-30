import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
    Calculator,
    TrendingUp,
    TrendingDown,
    Calendar,
    Printer,
    Download,
    Info
} from "lucide-react";

function ProfitLoss() {
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });
    const { start_date, end_date } = filters;

    useEffect(() => {
        const fetchPL = async () => {
            try {
                const res = await API.get(API_ENDPOINTS.sales.profitLoss({ start_date, end_date }));
                setData(res.data);
            } catch (err) {
                console.error("Error fetching P&L", err);
            }
        };

        fetchPL();
    }, [start_date, end_date]);

    const downloadCSV = () => {
      if (!data) return;

      let csv = "Profit & Loss Statement\n";
      csv += `Period: ${filters.start_date} to ${filters.end_date}\n\n`;
      
      csv += "Category,Description,Amount (₹)\n";
      csv += `REVENUE,Gross Sales,${data.revenue.gross_sales}\n`;
      csv += `REVENUE,Sales Discounts,-${data.revenue.discounts}\n`;
      csv += `REVENUE,GST Collected,-${data.revenue.taxes}\n`;
      csv += `REVENUE,Net Operating Revenue,${data.revenue.net_revenue - data.revenue.taxes}\n\n`;
      
      csv += `EXPENSES,Cost of Goods Sold (COGS),${data.expenses.cogs}\n`;
      csv += `EXPENSES,Other Operational Costs,${data.expenses.other}\n`;
      csv += `EXPENSES,Total Direct Expenses,${data.expenses.cogs + data.expenses.other}\n\n`;
      
      csv += `SUMMARY,ESTIMATED GROSS PROFIT,${data.profit.gross_profit}\n`;
      csv += `SUMMARY,Margin Percent,${data.profit.margin_percent}%\n`;

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Profit_Loss_Statement_${filters.start_date}_to_${filters.end_date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    return (
        <Layout>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Calculator size={32} className="text-secondary" /> Profit & Loss Statement
                    </h2>
                    <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Financial summary of revenue, costs and estimated margins</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                        <Printer size={18} /> Print PDF
                    </button>
                    <button className="btn-primary" style={{ backgroundColor: "#065f46" }} onClick={downloadCSV}>
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="card no-print" style={{ marginBottom: "2rem", padding: "1.2rem", display: "flex", alignItems: "center", gap: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Calendar size={20} className="text-muted" />
                    <input type="date" className="custom-input" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
                    <span>to</span>
                    <input type="date" className="custom-input" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
                </div>
            </div>

            {data && (
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
                                margin-bottom: 1.5rem !important;
                                padding: 1.5rem !important;
                                overflow: visible !important;
                                height: auto !important;
                                background: white !important;
                            }
                            body { background: white !important; }
                        }
                    `}</style>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                    {/* Revenue & Direct Costs */}
                    <div style={{ display: "grid", gap: "1.5rem" }}>
                        <div className="card">
                            <h3 style={{ margin: "0 0 1.5rem 0", color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
                                <TrendingUp size={20} /> Revenue
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <PLRow label="Gross Sales" value={data.revenue.gross_sales} />
                                <PLRow label="Less: Sales Discounts" value={data.revenue.discounts} negative />
                                <PLRow label="Less: GST Collected" value={data.revenue.taxes} negative />
                                <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "5px 0" }}></div>
                                <PLRow label="Net Operating Revenue" value={data.revenue.net_revenue - data.revenue.taxes} bold />
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ margin: "0 0 1.5rem 0", color: "#dc2626", display: "flex", alignItems: "center", gap: "10px" }}>
                                <TrendingDown size={20} /> Direct Expenses (COGS)
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <PLRow label="Cost of Goods Sold (Purchase Value)" value={data.expenses.cogs} />
                                <PLRow label="Other Operational Costs" value={data.expenses.other} />
                                <div style={{ height: "1px", backgroundColor: "#e2e8f0", margin: "5px 0" }}></div>
                                <PLRow label="Total Direct Expenses" value={data.expenses.cogs + data.expenses.other} bold />
                            </div>
                        </div>
                    </div>

                    {/* Profit Summary & Margin */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div className="card" style={{
                            backgroundColor: data.profit.gross_profit >= 0 ? "#f0fdf4" : "#fef2f2",
                            textAlign: "center",
                            padding: "2.5rem 1.5rem"
                        }}>
                            <div style={{ color: "#64748b", textTransform: "uppercase", fontSize: "0.8rem", fontWeight: "700", marginBottom: "10px" }}>
                                Estimated Gross Profit
                            </div>
                            <div style={{
                                fontSize: "3rem",
                                fontWeight: "900",
                                color: data.profit.gross_profit >= 0 ? "#16a34a" : "#dc2626"
                            }}>
                                ₹{data.profit.gross_profit.toLocaleString()}
                            </div>
                            <div style={{
                                marginTop: "1.5rem",
                                display: "inline-block",
                                padding: "8px 16px",
                                backgroundColor: "white",
                                borderRadius: "20px",
                                fontWeight: "800",
                                fontSize: "1.2rem",
                                color: data.profit.gross_profit >= 0 ? "#16a34a" : "#dc2626",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                            }}>
                                Margin: {data.profit.margin_percent}%
                            </div>
                        </div>

                        <div className="card">
                            <h4 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "8px" }}>
                                <Info size={16} className="text-muted" /> calculation Logic
                            </h4>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: "1.6" }}>
                                • Gross Sales: Inclusive of all taxes and discounts.<br />
                                • Net Revenue: Revenue excluding GST collected from customers.<br />
                                • COGS: Cost of inventory sold, based on purchase price recorded in medicine master.<br />
                                • Profit: Calculate as (Net Revenue - GST) - Purchase Cost.
                            </p>
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

function PLRow({ label, value, negative, bold }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
            <span style={{ color: "#475569", fontWeight: bold ? "800" : "400" }}>{label}</span>
            <span style={{
                fontWeight: "700",
                fontFamily: "monospace",
                color: negative ? "#dc2626" : "#1e293b",
                fontSize: bold ? "1.1rem" : "0.95rem"
            }}>
                {negative ? "-" : ""}₹{Math.abs(value).toLocaleString()}
            </span>
        </div>
    );
}

export default ProfitLoss;

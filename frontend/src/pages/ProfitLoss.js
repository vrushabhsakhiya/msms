import { useEffect, useState } from "react";
import API from "../services/api";
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
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    const fetchPL = async () => {
        try {
            setLoading(true);
            const res = await API.get(`sales/profit-loss/?start_date=${filters.start_date}&end_date=${filters.end_date}`);
            setData(res.data);
        } catch (err) {
            console.error("Error fetching P&L", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPL();
    }, [filters]);

    return (
        <Layout>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
                        <Calculator size={32} className="text-secondary" /> Profit & Loss Statement
                    </h2>
                    <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Financial summary of revenue, costs and estimated margins</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                        <Printer size={18} /> Print
                    </button>
                    <button className="btn-primary" style={{ backgroundColor: "#065f46" }}>
                        <Download size={18} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="card" style={{ marginBottom: "2rem", padding: "1.2rem", display: "flex", alignItems: "center", gap: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Calendar size={20} className="text-muted" />
                    <input type="date" className="custom-input" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
                    <span>to</span>
                    <input type="date" className="custom-input" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
                </div>
            </div>

            {data && (
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

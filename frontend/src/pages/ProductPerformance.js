import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
    BadgePercent,
    Hourglass,
    ShoppingCart,
    PackageSearch,
    Calendar,
    Download,
    Printer,
    ChevronRight
} from "lucide-react";

function ProductPerformance() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get(`sales/performance/?start_date=${filters.start_date}&end_date=${filters.end_date}`);
            setData(res.data);
        } catch (err) {
            console.error("Error fetching performance", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    return (
        <Layout>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
                        <BadgePercent size={32} className="text-secondary" /> Product Performance
                    </h2>
                    <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Identify your top-selling items and optimize slow-moving stock</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-secondary" onClick={() => window.print()}>
                        <Printer size={18} /> Print
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
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
                    {/* Best Sellers */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                            <ShoppingCart size={24} className="text-success" />
                            <h3 style={{ margin: 0 }}>Top 20 Best Sellers</h3>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th style={{ textAlign: "center" }}>Qty Sold</th>
                                        <th style={{ textAlign: "right" }}>Revenue</th>
                                        <th style={{ textAlign: "right" }}>Gross Profit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.best_sellers.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: "700" }}>{item.medicine__medicine_name}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.medicine__medicine_code}</div>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <span style={{ padding: "4px 10px", backgroundColor: "#f0fdf4", color: "#16a34a", borderRadius: "15px", fontWeight: "800", fontSize: "0.85rem" }}>
                                                    {item.total_qty} units
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "right", fontWeight: "800" }}>₹{parseFloat(item.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: "right" }}>
                                                <div style={{ fontWeight: "800", color: parseFloat(item.total_profit) >= 0 ? "#16a34a" : "#dc2626" }}>
                                                    ₹{parseFloat(item.total_profit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{parseFloat(item.margin_pct).toFixed(1)}% Margin</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Slow Moving */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
                            <Hourglass size={24} className="text-warning" />
                            <h3 style={{ margin: 0 }}>Slow Moving / Zero Sales</h3>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th style={{ textAlign: "right" }}>Current Stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.slow_moving.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{ fontWeight: "700" }}>{item.medicine_name}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.medicine_code}</div>
                                            </td>
                                            <td style={{ textAlign: "right" }}>
                                                <span style={{ color: item.current_stock < 10 ? "#dc2626" : "#64748b", fontWeight: "700" }}>
                                                    {item.current_stock} pcs
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.slow_moving.length === 0 && (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                                    No items identified as slow-moving for this period.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ProductPerformance;

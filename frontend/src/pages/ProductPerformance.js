import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
    BadgePercent,
    Hourglass,
    ShoppingCart,
    Calendar,
    Download,
    Printer
} from "lucide-react";

function ProductPerformance() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await API.get(API_ENDPOINTS.sales.performance(filters));
                setData(res.data);
            } catch (err) {
                console.error("Error fetching performance", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters.start_date, filters.end_date]);

    const downloadCSV = () => {
        if (!data) return;

        let csvContent = "Best Sellers Report\n";
        csvContent += "Medicine Name,Medicine Code,Quantity Sold,Total Revenue,Total Profit,Margin %\n";
        data.best_sellers.forEach(item => {
            csvContent += `"${item.medicine__medicine_name}","${item.medicine__medicine_code}",${item.total_qty},${item.total_revenue},${item.total_profit},${item.margin_pct}%\n`;
        });

        csvContent += "\n\nSlow Moving / Zero Sales Report\n";
        csvContent += "Medicine Name,Medicine Code,Current Stock\n";
        data.slow_moving.forEach(item => {
            csvContent += `"${item.medicine_name}","${item.medicine_code}",${item.current_stock}\n`;
        });

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.body.appendChild(document.createElement("a"));
        link.href = url;
        link.download = `Product_Performance_${filters.start_date}_to_${filters.end_date}.csv`;
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

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

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <div className="loader" style={{ margin: "0 auto 1rem" }}></div>
          Analyzing product performance...
        </div>
      )}

      {!loading && data && (
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
                padding: 0 !important;
                overflow: visible !important;
              }
              table { width: 100% !important; border-collapse: collapse !important; }
              th, td { border: 1px solid #cbd5e1 !important; padding: 10px !important; font-size: 11px !important; }
              body { background: white !important; }
            }
          `}</style>
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
                                            <td style={{ textAlign: "right", fontWeight: "800" }}>₹{Number.parseFloat(item.total_revenue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                            <td style={{ textAlign: "right" }}>
                                                <div style={{ fontWeight: "800", color: Number.parseFloat(item.total_profit) >= 0 ? "#16a34a" : "#dc2626" }}>
                                                    ₹{Number.parseFloat(item.total_profit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </div>
                                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{Number.parseFloat(item.margin_pct).toFixed(1)}% Margin</div>
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
            </div>
            )}
        </Layout>
    );
}

export default ProductPerformance;

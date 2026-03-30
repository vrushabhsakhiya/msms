import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import {
    TrendingUp,
    ShoppingCart,
    Receipt,
    FileText,
    Boxes,
    Users,
    PieChart,
    BadgePercent,
    Calculator,
    History
} from "lucide-react";

function Reports() {
    const navigate = useNavigate();

    const reportCategories = [
        {
            title: "Sales & Performance",
            reports: [
                { name: "Detailed Sales Report", icon: <TrendingUp />, path: "/sales-report", desc: "View daily, weekly & custom range sales analytics" },
                { name: "Payment Collection", icon: <Receipt />, path: "/payments", desc: "Track Cash, UPI and Card collections" },
                { name: "Product Performance", icon: <BadgePercent />, path: "/product-performance", desc: "Analyze best sellers vs slow moving inventory" },
            ]
        },
        {
            title: "Inventory & Compliance",
            reports: [
                { name: "Stock Status Report", icon: <Boxes />, path: "/inventory", desc: "Current stock valuation and level audit" },
                { name: "System Audit Logs", icon: <History />, path: "/audit-logs", desc: "Identify who made changes to records and when" },
                { name: "GSTR-1 (Sales GST)", icon: <Receipt />, path: "/gstr-report", desc: "Generate government compliant sales tax reports" },
                { name: "GSTR-2 (Purchase GST)", icon: <FileText />, path: "/gstr2-report", desc: "Track input tax credit on purchases" },
            ]
        },
        {
            title: "Financial Ledgers",
            reports: [
                { name: "Purchase History", icon: <ShoppingCart />, path: "/purchase-history", desc: "Complete log of supplier procurement" },
                { name: "Customer Ledgers", icon: <Users />, path: "/customers", desc: "Purchase history and billing records by patient" },
                { name: "Profit & Loss (P&L)", icon: <Calculator />, path: "/profit-loss", desc: "Estimate gross profit based on sales vs cost" },
            ]
        }
    ];

    return (
        <Layout
            title="Reporting Center"
            subtitle="Generate, analyze and export comprehensive business reports"
            icon={<PieChart size={24} />}
        >
            <div style={{ marginTop: "1rem" }}>

                <div style={{ display: "grid", gap: "2rem" }}>
                    {reportCategories.map((cat, idx) => (
                        <div key={idx}>
                            <h4 style={{
                                fontSize: "0.8rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "#94a3b8",
                                marginBottom: "1rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "10px"
                            }}>
                                <span style={{ backgroundColor: "#e2e8f0", height: "1px", flex: 1 }}></span>
                                {cat.title}
                                <span style={{ backgroundColor: "#e2e8f0", height: "1px", flex: 1 }}></span>
                            </h4>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
                                {cat.reports.map((report, ridx) => (
                                    <div
                                        key={ridx}
                                        className="card report-card"
                                        style={{
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "1.2rem",
                                            transition: "all 0.2s"
                                        }}
                                        onClick={() => navigate(report.path)}
                                    >
                                        <div style={{
                                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                                            color: "var(--primary)",
                                            padding: "12px",
                                            borderRadius: "12px"
                                        }}>
                                            {report.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: "0 0 5px 0", fontWeight: "700" }}>{report.name}</h4>
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: "1.4" }}>
                                                {report.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        .report-card:hover {
          border-color: var(--primary);
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          background-color: #f8fafc;
        }
      `}</style>
        </Layout>
    );
}

export default Reports;

import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import { History, Search, Trash2, Printer, Eye, Plus, X, CreditCard, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Payments() {
    const [activeTab, setActiveTab] = useState("customer"); // 'customer' or 'vendor'
    const [sales, setSales] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const role = (localStorage.getItem("role") || "staff").toLowerCase();
    const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    const canViewSales = role === "admin" || permissions?.sales?.read;
    const canViewPurchases = role === "admin" || permissions?.purchase?.read;
    const canDeleteSales = role === "admin" || permissions?.sales?.delete;
    const canDeletePurchases = role === "admin" || permissions?.purchase?.delete;

    const fetchAllData = async () => {
        setLoading(true);
        try {
            if (canViewSales) {
                try {
                    const salesRes = await API.get(API_ENDPOINTS.sales.list(), { silent: true });
                    setSales(salesRes.data);
                } catch(e) { setSales([]); }
            }
            if (canViewPurchases) {
                try {
                    const purchasesRes = await API.get(API_ENDPOINTS.purchases.list, { silent: true });
                    setPurchases(purchasesRes.data);
                } catch(e) { setPurchases([]); }
            }
        } catch (err) {
            console.error("Error fetching payments history", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        const data = activeTab === "customer" ? sales : purchases;
        const term = searchTerm.toLowerCase();

        if (activeTab === "customer") {
            setFilteredData(
                data.filter((s) =>
                    s.invoice_number.toLowerCase().includes(term) ||
                    s.customer_name?.toLowerCase().includes(term)
                )
            );
        } else {
            setFilteredData(
                data.filter((p) =>
                    p.purchase_code.toLowerCase().includes(term) ||
                    p.invoice_number.toLowerCase().includes(term) ||
                    p.supplier_name?.toLowerCase().includes(term)
                )
            );
        }
    }, [searchTerm, sales, purchases, activeTab]);

    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    const handleDelete = async (id, isSale) => {
        if (!window.confirm("Are you sure you want to permanently delete this bill? This will reverse the stock!")) {
            return;
        }
        try {
            const endpoint = isSale ? API_ENDPOINTS.sales.delete(id) : API_ENDPOINTS.purchases.delete(id);
            await API.delete(endpoint);
            alert("Bill successfully deleted and stock adjusted. ✅");
            fetchAllData();
        } catch (err) {
            alert("Error deleting bill: " + (err.response?.data?.error || "Unknown error"));
        }
    };

    return (
        <Layout>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                        <History size={28} className="text-primary" /> Payment & Billing Center
                    </h2>
                    <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Manage outgoing vendor payments and incoming customer billing
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ position: "relative" }}>
                        <Search style={{ position: "absolute", left: "15px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={18} />
                        <input
                            className="custom-input"
                            placeholder={activeTab === 'customer' ? "Search Invoice / Customer..." : "Search Code / Supplier..."}
                            style={{ paddingLeft: "45px", width: '250px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Excel-style Tabs */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '-1px', position: 'relative', zIndex: 1 }}>
                {canViewSales && (
                <button
                    onClick={() => { setActiveTab("customer"); setSearchTerm(""); }}
                    style={{
                        padding: '12px 25px',
                        border: '1px solid var(--border)',
                        borderBottom: activeTab === 'customer' ? '1px solid var(--card-bg)' : '1px solid var(--border)',
                        backgroundColor: activeTab === 'customer' ? 'var(--card-bg)' : '#f8f9fa',
                        color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <CreditCard size={18} /> Customer Billing (Incoming)
                </button>
                )}
                {canViewPurchases && (
                <button
                    onClick={() => { setActiveTab("vendor"); setSearchTerm(""); }}
                    style={{
                        padding: '12px 25px',
                        border: '1px solid var(--border)',
                        borderBottom: activeTab === 'vendor' ? '1px solid var(--card-bg)' : '1px solid var(--border)',
                        backgroundColor: activeTab === 'vendor' ? 'var(--card-bg)' : '#f8f9fa',
                        color: activeTab === 'vendor' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTopLeftRadius: '8px',
                        borderTopRightRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ShoppingCart size={18} /> Vendor Payments (Outgoing)
                </button>
                )}
            </div>

            <div className="card" style={{ borderTopLeftRadius: 0 }}>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            {activeTab === 'customer' ? (
                                <tr>
                                    <th>Invoice No.</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Payment Mode</th>
                                    <th style={{ textAlign: "right" }}>Net Amount</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th>Purchase Code</th>
                                    <th>Supplier</th>
                                    <th>Invoice No.</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Total Amount</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "3rem" }}>
                                        <div className="loading-spinner" style={{ marginInline: "auto", marginBottom: "1rem" }}></div>
                                        Fetching {activeTab} payment records...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                                        No {activeTab} payment records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id}>
                                        {activeTab === 'customer' ? (
                                            <>
                                                <td style={{ fontWeight: "700" }}>{item.invoice_number}</td>
                                                <td>{item.customer_name || "Walk-in Customer"}</td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td>
                                                    <span className="badge" style={{
                                                        backgroundColor: item.payment_mode === "Cash" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                                                        color: item.payment_mode === "Cash" ? "#10b981" : "#3b82f6"
                                                    }}>
                                                        {item.payment_mode}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: "800", textAlign: "right" }}>₹{item.net_amount}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ fontWeight: "700" }}>{item.purchase_code}</td>
                                                <td>{item.supplier_name}</td>
                                                <td>{item.invoice_number}</td>
                                                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: "800", textAlign: "right" }}>₹{item.net_amount}</td>
                                            </>
                                        )}
                                        <td style={{ textAlign: "right" }}>
                                            <button onClick={() => handleViewDetails(item)} title="View Details" style={{ background: "none", border: "none", color: "var(--info)", cursor: "pointer", marginRight: "10px" }}>
                                                <Eye size={18} />
                                            </button>
                                            {(activeTab === 'customer' ? canDeleteSales : canDeletePurchases) && (
                                                <button onClick={() => handleDelete(item.id, activeTab === 'customer')} title="Delete Bill" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer" }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail View Modal */}
            {isModalOpen && selectedItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{activeTab === 'customer' ? 'Customer Invoice Details' : 'Vendor Purchase Details'}</h3>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>{activeTab === 'customer' ? 'Invoice No.' : 'Purchase Code'}</small>
                                <strong>{activeTab === 'customer' ? selectedItem.invoice_number : selectedItem.purchase_code}</strong>
                            </div>
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>{activeTab === 'customer' ? 'Customer Name' : 'Supplier Name'}</small>
                                <strong>{activeTab === 'customer' ? selectedItem.customer_name : selectedItem.supplier_name}</strong>
                            </div>
                            <div>
                                <small style={{ color: 'var(--text-muted)', display: 'block' }}>Date</small>
                                <strong>{new Date(selectedItem.created_at).toLocaleString()}</strong>
                            </div>
                        </div>

                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Batch</th>
                                    <th>Qty</th>
                                    <th style={{ textAlign: 'right' }}>Price</th>
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedItem.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.medicine_name}</td>
                                        <td>{item.batch_number}</td>
                                        <td>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>₹{activeTab === 'customer' ? item.rate : item.purchase_rate}</td>
                                        <td style={{ textAlign: 'right' }}>₹{item.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'right', fontWeight: '800' }}>Grand Total</td>
                                    <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>₹{selectedItem.net_amount}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default Payments;


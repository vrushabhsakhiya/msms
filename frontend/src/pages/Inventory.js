import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import PropTypes from 'prop-types';
import {
    Package,
    AlertTriangle,
    Clock,
    Activity,
    PackageCheck,
    Search,
    ArrowRightLeft,
    Layers,
    FileText,
    Ban,
    Trash2,
    Info
} from "lucide-react";

// Helper component for Summary Cards
const SummaryCard = ({ title, value, icon, color, weight }) => (
    <div className="card summary-card" style={{ borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{title}</h4>
            <span style={{ color: color }}>{icon}</span>
        </div>
        <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: weight || '600', color: '#1e293b' }}>{value}</p>
    </div>
);

SummaryCard.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.element.isRequired,
    color: PropTypes.string,
    weight: PropTypes.string,
};

SummaryCard.defaultProps = {
    color: '#334155',
    weight: '600',
};

function Inventory() {
    const [summary, setSummary] = useState(null);
    const [activeTab, setActiveTab] = useState("overview"); // overview, alerts, adjustment, movement
    const [subTab, setSubTab] = useState("low-stock"); // low-stock, expiry
    const [loading, setLoading] = useState(true);

    // Data States
    const [lowStock, setLowStock] = useState([]);
    const [expiryAlerts, setExpiryAlerts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [batches, setBatches] = useState([]);

    // Filter States
    const [moveFilter, setMoveFilter] = useState({ medicine: "", type: "" });

    // Adjustment Form State
    const [adjForm, setAdjForm] = useState({
        medicine: "",
        batch: "",
        adjustment_type: "ADD",
        quantity: 0,
        reason: "Correction",
        remarks: ""
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const sRes = await API.get("inventory/summary/");
            setSummary(sRes.data);

            if (activeTab === "alerts") {
                const lRes = await API.get("inventory/alerts/low-stock/");
                setLowStock(lRes.data);
                const eRes = await API.get("inventory/alerts/expiry/");
                setExpiryAlerts(eRes.data);
            } else if (activeTab === "movement") {
                const query = `?medicine=${moveFilter.medicine}&type=${moveFilter.type}`;
                const mRes = await API.get(`inventory/movements/${query}`);
                setMovements(mRes.data);
            } else if (activeTab === "adjustment") {
                const mRes = await API.get("medicines/");
                setMedicines(mRes.data);
            }
        } catch (err) {
            console.error("Error fetching inventory data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, moveFilter]);

    const handleMedicineChange = async (medId) => {
        setAdjForm({ ...adjForm, medicine: medId, batch: "" });
        if (medId) {
            const res = await API.get(`inventory/batches/${medId}/`);
            setBatches(res.data);
        }
    };

    const handleAdjustment = async (e) => {
        e.preventDefault();
        try {
            await API.post("inventory/adjust/", adjForm);
            alert("Stock adjustment successfully recorded! ✅");
            setAdjForm({ medicine: "", batch: "", adjustment_type: "ADD", quantity: 0, reason: "Correction", remarks: "" });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || "Error adjusting stock ❌");
        }
    };

    const renderOverview = () => (
        <div className="inventory-dashboard">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <SummaryCard title="Total Medicines" value={summary?.total_medicines} icon={<Package size={24} />} color="#3b82f6" />
                <SummaryCard title="Total Stock Value" value={`₹${summary?.total_stock_value?.toLocaleString()}`} icon={<Layers size={24} />} color="#10b981" />
                <SummaryCard title="Low Stock Items" value={summary?.low_stock_items} icon={<AlertTriangle size={24} />} color="#f59e0b" weight="bold" />
                <SummaryCard title="Out of Stock" value={summary?.out_of_stock} icon={<Ban size={24} />} color="#ef4444" weight="bold" />
                <SummaryCard title="Expired Items" value={summary?.expired_items} icon={<Trash2 size={24} />} color="#dc2626" weight="bold" />
                <SummaryCard title="Near Expiry" value={summary?.near_expiry} icon={<Clock size={24} />} color="#f97316" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} className="text-warning" /> Low Stock Criticals</h3>
                        <button className="btn-secondary btn-sm" onClick={() => { setActiveTab("alerts"); setSubTab("low-stock"); }}>View All</button>
                    </div>
                    <table className="table mini-table">
                        <thead>
                            <tr><th>Medicine</th><th>Current</th><th>Min.Level</th></tr>
                        </thead>
                        <tbody>
                            {lowStock.slice(0, 5).map(m => (
                                <tr key={m.id}>
                                    <td>{m.medicine_name}</td>
                                    <td style={{ color: '#dc2626', fontWeight: '700' }}>{m.stock_quantity}</td>
                                    <td>{m.reorder_level}</td>
                                </tr>
                            ))}
                            {lowStock.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Stock levels healthy! ✅</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} className="text-primary" /> Upcoming Expiries</h3>
                        <button className="btn-secondary btn-sm" onClick={() => { setActiveTab("alerts"); setSubTab("expiry"); }}>View All</button>
                    </div>
                    <table className="table mini-table">
                        <thead>
                            <tr><th>Medicine</th><th>Batch</th><th>Exp.Date</th></tr>
                        </thead>
                        <tbody>
                            {expiryAlerts.slice(0, 5).map(b => (
                                <tr key={b.id}>
                                    <td>{b.medicine_name}</td>
                                    <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{b.batch_number}</td>
                                    <td style={{ color: b.days_remaining <= 0 ? '#dc2626' : '#f97316' }}>{new Date(b.expiry_date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {expiryAlerts.length === 0 && <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No expiries in next 90 days.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderAlerts = () => (
        <div className="card">
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setSubTab("low-stock")}
                    style={{ padding: '1rem 2rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: subTab === 'low-stock' ? '3px solid var(--primary)' : 'none', color: subTab === 'low-stock' ? 'var(--primary)' : '#64748b', fontWeight: '700' }}
                >
                    Low Stock Alerts ({lowStock.length})
                </button>
                <button
                    onClick={() => setSubTab("expiry")}
                    style={{ padding: '1rem 2rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: subTab === 'expiry' ? '3px solid var(--primary)' : 'none', color: subTab === 'expiry' ? 'var(--primary)' : '#64748b', fontWeight: '700' }}
                >
                    Expiry Alerts ({expiryAlerts.length})
                </button>
            </div>

            {subTab === "low-stock" ? (
                <table className="table">
                    <thead>
                        <tr><th>Medicine</th><th>Current Stock</th><th>Min. Reorder Level</th><th>Diff.</th><th>Suggested Qty.</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {lowStock.map(m => (
                            <tr key={m.id}>
                                <td style={{ fontWeight: '700' }}>{m.medicine_name}</td>
                                <td style={{ color: '#dc2626', fontWeight: '800' }}>{m.stock_quantity}</td>
                                <td style={{ color: '#f59e0b' }}>{m.reorder_level}</td>
                                <td><span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{m.difference}</span></td>
                                <td style={{ fontWeight: '600' }}>{m.suggested_qty}</td>
                                <td><button className="btn-primary btn-sm" style={{ borderSize: '1px', borderRadius: '8px' }}>Create PO</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <table className="table">
                    <thead>
                        <tr><th>Medicine</th><th>Batch No</th><th>Expiry Date</th><th>Days Remaining</th><th>Quantity</th><th>Alert</th></tr>
                    </thead>
                    <tbody>
                        {expiryAlerts.map(b => (
                            <tr key={b.id}>
                                <td style={{ fontWeight: 700 }}>{b.medicine_name}</td>
                                <td style={{ fontFamily: 'monospace' }}>{b.batch_number}</td>
                                <td>{new Date(b.expiry_date).toLocaleDateString()}</td>
                                <td style={{
                                    color: b.days_remaining <= 30 ? '#dc2626' : b.days_remaining < 60 ? '#f97316' : '#f59e0b',
                                    fontWeight: '800'
                                }}>{b.days_remaining} Days</td>
                                <td>{b.current_stock}</td>
                                <td>
                                    <span style={{
                                        backgroundColor: b.status === 'Expired' ? '#fee2e2' : b.status === 'Critical' ? '#ffedd5' : '#fef9c3',
                                        color: b.status === 'Expired' ? '#dc2626' : b.status === 'Critical' ? '#ea580c' : '#854d0e',
                                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800'
                                    }}>
                                        {b.status.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderAdjustment = () => (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
                <h3 style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '2rem' }}>Manual Stock Adjustment</h3>
                <form onSubmit={handleAdjustment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Adjustment Type</label>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                            {['ADD', 'REDUCE', 'DAMAGED', 'EXPIRED'].map(t => (
                                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                                    <input type="radio" checked={adjForm.adjustment_type === t} onChange={() => setAdjForm({ ...adjForm, adjustment_type: t })} /> {t.replace('_', ' ')}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Medicine</label>
                        <select required className="custom-input" value={adjForm.medicine} onChange={(e) => handleMedicineChange(e.target.value)}>
                            <option value="">Select Medicine...</option>
                            {medicines.map(m => <option key={m.id} value={m.id}>{m.medicine_name} ({m.medicine_code})</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Batch Number</label>
                        <select required className="custom-input" value={adjForm.batch} onChange={(e) => setAdjForm({ ...adjForm, batch: e.target.value })}>
                            <option value="">Select Batch...</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_number} (Qty: {b.quantity})</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Adjustment Quantity</label>
                        <input required type="number" className="custom-input" value={adjForm.quantity} onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label>Reason</label>
                        <select className="custom-input" value={adjForm.reason} onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}>
                            <option value="Correction">Stock Correction</option>
                            <option value="Damaged">Damaged</option>
                            <option value="Expired">Expired</option>
                            <option value="Theft">Theft</option>
                            <option value="Breakage">Breakage</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                        <label>Remarks</label>
                        <textarea className="custom-input" rows="3" value={adjForm.remarks} onChange={(e) => setAdjForm({ ...adjForm, remarks: e.target.value })} placeholder="Internal notes for tracking..."></textarea>
                    </div>

                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="button" className="btn-secondary" style={{ flex: 1 }}>Clear Form</button>
                        <button type="submit" className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <PackageCheck size={20} /> Save Adjustment
                        </button>
                    </div>
                </form>
            </div>

            <div className="card" style={{ backgroundColor: '#f0f9ff', marginTop: '2rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={18} className="text-primary" /> Audit Policy</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>Every adjustment is logged in the movement report with your username. Negative stock is strictly prevented by the system.</p>
            </div>
        </div>
    );

    const renderMovement = () => (
        <div className="card">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input className="custom-input" style={{ paddingLeft: '40px' }} placeholder="Search medicine in movements..." />
                </div>
                <select className="custom-input" style={{ width: '200px' }} value={moveFilter.type} onChange={(e) => setMoveFilter({ ...moveFilter, type: e.target.value })}>
                    <option value="">All Types</option>
                    <option value="IN">Purchases (IN)</option>
                    <option value="OUT">Sales (OUT)</option>
                    <option value="ADJUST">Adjustments</option>
                    <option value="RETURN">Returns</option>
                </select>
            </div>

            <table className="table">
                <thead>
                    <tr><th>Date & Time</th><th>Type</th><th>Medicine</th><th>Batch</th><th>Reference No.</th><th>Qty</th><th>User</th></tr>
                </thead>
                <tbody>
                    {movements.map(m => (
                        <tr key={m.id}>
                            <td style={{ fontSize: '0.85rem' }}>{new Date(m.created_at).toLocaleString()}</td>
                            <td>
                                <span style={{
                                    backgroundColor: m.movement_type === 'IN' ? '#dcfce7' : m.movement_type === 'OUT' ? '#fee2e2' : '#fef9c3',
                                    color: m.movement_type === 'IN' ? '#16a34a' : m.movement_type === 'OUT' ? '#dc2626' : '#854d0e',
                                    padding: '4px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: '800'
                                }}>
                                    {m.movement_type}
                                </span>
                            </td>
                            <td>{m.medicine_name} <br /><small style={{ color: '#94a3b8' }}>{m.medicine_code}</small></td>
                            <td style={{ fontFamily: 'monospace' }}>{m.batch_number}</td>
                            <td style={{ color: '#3b82f6', fontWeight: 600 }}>#{m.reference_id}</td>
                            <td style={{ fontWeight: 800 }}>{m.quantity}</td>
                            <td>{m.user_name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <Layout>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Activity className="text-secondary" size={36} /> Inventory & Stock Control
                    </h2>
                    <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '1.1rem' }}>Monitor real-time stock levels, Manage expiries, and Perform audits</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><Layers size={18} /> Overview</button>
                    <button className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}><AlertTriangle size={18} /> Alerts</button>
                    <button className={`nav-tab ${activeTab === 'adjustment' ? 'active' : ''}`} onClick={() => setActiveTab('adjustment')}><ArrowRightLeft size={18} /> Adjustments</button>
                    <button className={`nav-tab ${activeTab === 'movement' ? 'active' : ''}`} onClick={() => setActiveTab('movement')}><FileText size={18} /> Movements</button>
                </div>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'alerts' && renderAlerts()}
            {activeTab === 'adjustment' && renderAdjustment()}
            {activeTab === 'movement' && renderMovement()}

            <style>{`
        .nav-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 0.8rem 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0;
          background: white; cursor: pointer; color: #64748b; font-weight: 700;
          transition: all 0.2s;
        }
        .nav-tab.active { background: var(--primary); color: white; border-color: var(--primary); }
        .nav-tab:hover { border-color: var(--primary); color: var(--primary); }
        .nav-tab.active:hover { color: white; }

        .mini-table { font-size: 0.85rem; }
        .mini-table th { background-color: #f8fafc; padding: 0.5rem; }
      `}</style>
        </Layout>
    );
}


export default Inventory;

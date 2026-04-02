import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
  Users,
  Phone,
  Mail,
  Search,
  UserCircle,
  MapPin,
  Stethoscope,
  Edit2,
  CreditCard,
  X,
} from "lucide-react";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [form, setForm] = useState({
    customer_code: "",
    customer_name: "",
    mobile: "",
    alternate_mobile: "",
    email: "",
    date_of_birth: "",
    gender: "Male",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "Maharashtra",
    pincode: "",
    doctor_reference: "",
    credit_limit: 0,
    opening_balance: 0,
    notes: "",
    status: true,
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_ENDPOINTS.customers.list);
      setCustomers(res.data);
    } catch (err) {
      console.error("Error fetching customers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleEdit = (cust) => {
    setForm({
      ...cust,
      date_of_birth: cust.date_of_birth || "",
    });
    setEditingId(cust.id);
    setShowForm(true);
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    try {
      await API.put(API_ENDPOINTS.customers.update(editingId), form);
      alert("Customer profile updated successfully! ✅");
      fetchCustomers();
      setShowForm(false);
    } catch (err) {
      console.error("Error updating customer", err);
      alert("Error updating customer profile ❌");
    }
  };

  const handleLedger = async (cust) => {
    setLedgerCustomer(cust);
    setShowLedger(true);
    setLedgerLoading(true);
    try {
      const res = await API.get(API_ENDPOINTS.sales.list({ customer_id: cust.id }));
      setLedgerData(res.data);
    } catch (err) {
      console.error("Error fetching ledger", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    return (
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Layout>
      <div className="customers-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: '2rem', fontWeight: '800' }}>
              <Users size={32} className="text-primary" /> Customer Directory
            </h2>
            <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "1rem" }}>
              Total {customers.length} customers registered automatically via billing
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="card" style={{ padding: '0.75rem', marginBottom: '2rem' }}>
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              className="custom-input"
              placeholder="Search by name, mobile, or customer code..."
              style={{ paddingLeft: "42px" }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Customer Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Customer Info</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>Total Purchase</th>
                  <th style={thStyle}>Bills</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (loading) {
                    return (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Loading records...</td>
                      </tr>
                    );
                  }
                  if (filteredCustomers.length === 0) {
                    return (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>No customers found.</td>
                      </tr>
                    );
                  }
                  return filteredCustomers.map((cust, idx) => (
                    <tr key={cust.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>{idx + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "700", color: "#1e293b" }}>{cust.customer_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{cust.customer_code}</div>
                      </td>
                      <td style={tdStyle}>{cust.mobile}</td>
                      <td style={{ ...tdStyle, color: "#10b981", fontWeight: "700" }}>₹{Number.parseFloat(cust.total_purchases || 0).toLocaleString()}</td>
                      <td style={tdStyle}>
                        <span style={{ backgroundColor: "#eff6ff", color: "#3b82f6", padding: "2px 8px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600" }}>
                          {cust.total_bills || 0}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleLedger(cust)}
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#1e293b", color: "white" }}
                          >
                            <CreditCard size={14} /> Ledger
                          </button>
                          <button
                            onClick={() => handleEdit(cust)}
                            className="icon-btn"
                            style={{ backgroundColor: "#f1f5f9" }}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '500px', backgroundColor: 'white', height: '100%', padding: '2.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Edit Customer Profile</h3>
                <button className="icon-btn" onClick={() => setShowForm(false)}><X size={24} /></button>
              </div>

              <form onSubmit={saveCustomer}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label htmlFor="customer-name">Customer Name</label>
                    <input id="customer-name" className="custom-input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer-mobile">Mobile number</label>
                    <input id="customer-mobile" className="custom-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer-city">City</label>
                    <input id="customer-city" className="custom-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer-address">Address</label>
                    <textarea id="customer-address" className="custom-input" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} rows="2" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doctor-reference">Doctor Reference</label>
                    <input id="doctor-reference" className="custom-input" value={form.doctor_reference} onChange={(e) => setForm({ ...form, doctor_reference: e.target.value })} />
                  </div>
                </div>
                <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>Update Customer</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ledger Modal */}
        {showLedger && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '900px', backgroundColor: 'white', maxHeight: '90vh', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <UserCircle size={28} className="text-primary" /> Customer Profile & Ledger
                  </h3>
                </div>
                <button className="icon-btn" onClick={() => setShowLedger(false)}><X size={24} /></button>
              </div>

              <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                
                {/* Profile Details & Summary Cards */}
                {ledgerCustomer && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    
                    {/* Left: Info */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: '800' }}>{ledgerCustomer.customer_name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                        <Phone size={16} /> {ledgerCustomer.mobile} {ledgerCustomer.alternate_mobile && ` / ${ledgerCustomer.alternate_mobile}`}
                      </div>
                      {ledgerCustomer.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                          <Mail size={16} /> {ledgerCustomer.email}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
                        <MapPin size={16} /> {[ledgerCustomer.address_line_1, ledgerCustomer.city, ledgerCustomer.state].filter(Boolean).join(", ") || "No Address Provided"}
                      </div>
                      {ledgerCustomer.doctor_reference && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', marginTop: '4px' }}>
                          <Stethoscope size={16} className="text-primary"/> <span style={{ fontWeight: 600 }}>Ref:</span> {ledgerCustomer.doctor_reference}
                        </div>
                      )}
                    </div>

                    {/* Right: Financial Summary */}
                    <div style={{ flex: 1, borderLeft: '1px solid #cbd5e1', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Billing Appx:</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#3b82f6' }}>
                          ₹{ledgerData.reduce((sum, sale) => sum + Number.parseFloat(sale.net_amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem', textTransform: 'uppercase' }}>Total Payment Recvd:</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#10b981' }}>
                          ₹{ledgerData.reduce((sum, sale) => sum + Number.parseFloat(sale.amount_received || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.1rem', fontWeight: '700' }}>Recent Transactions</h4>

                {(() => {
                  if (ledgerLoading) {
                    return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading history...</div>;
                  }
                  if (ledgerData.length === 0) {
                    return <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px' }}>No past transactions found for this customer.</div>;
                  }
                  return (
                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #e2e8f0" }}>
                            <th style={thStyle}>Date & Time</th>
                            <th style={thStyle}>Invoice No.</th>
                            <th style={thStyle}>Items</th>
                            <th style={thStyle}>Total Amount</th>
                            <th style={thStyle}>Paid Amount</th>
                            <th style={thStyle}>Payment Mode</th>
                            <th style={thStyle}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerData.map((sale) => (
                            <tr key={sale.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={tdStyle}>
                                <div style={{ fontWeight: "600" }}>{new Date(sale.created_at).toLocaleDateString()}</div>
                                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td style={{ ...tdStyle, fontWeight: "600", color: "#3b82f6" }}>{sale.invoice_number}</td>
                              <td style={tdStyle}>{sale.total_quantity}</td>
                              <td style={{ ...tdStyle, fontWeight: '700', color: '#1e293b' }}>₹{Number.parseFloat(sale.net_amount).toFixed(2)}</td>
                              <td style={{ ...tdStyle, fontWeight: '700', color: '#10b981' }}>₹{Number.parseFloat(sale.amount_received).toFixed(2)}</td>
                              <td style={tdStyle}>
                                <span style={{ padding: "4px 8px", borderRadius: "6px", backgroundColor: "#e0e7ff", color: "#3730a3", fontSize: "0.8rem", fontWeight: "600" }}>
                                  {sale.payment_mode}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <span style={{ 
                                  padding: "4px 8px", 
                                  borderRadius: "4px", 
                                  fontSize: "0.8rem", 
                                  backgroundColor: sale.status === 'Final' ? '#dcfce7' : '#fef3c7',
                                  color: sale.status === 'Final' ? '#166534' : '#92400e',
                                  fontWeight: "600"
                                }}>
                                  {sale.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          .icon-btn {
            background: none;
            border: none;
            padding: 8px;
            cursor: pointer;
            border-radius: 8px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-btn:hover { background-color: #e2e8f0; }
        `}
      </style>
    </Layout>
  );
}

const thStyle = {
  padding: "15px 20px",
  textAlign: "left",
  fontSize: "0.85rem",
  textTransform: "uppercase",
  color: "#64748b",
  fontWeight: "700",
  letterSpacing: "0.5px"
};

const tdStyle = {
  padding: "15px 20px",
  fontSize: "0.95rem",
  color: "#475569"
};

export default Customers;

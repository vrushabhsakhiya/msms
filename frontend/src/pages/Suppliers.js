import { useEffect, useState, useCallback, useMemo } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
  UserPlus, Building, User, Phone, Mail, MapPin, Search,
  Warehouse, Edit, Trash2, ShieldCheck, ShieldAlert, CreditCard,
  Eye
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

const INITIAL_FORM = {
  supplier_code: "",
  supplier_name: "",
  contact_person: "",
  mobile: "",
  alternate_mobile: "",
  email: "",
  gst_number: "",
  pan_number: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  pincode: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  opening_balance: 0,
  credit_limit: 0,
  credit_days: 30,
  is_active: true,
  notes: ""
};

const CAN_EDIT_ROLES = ['admin'];

const GST_STATE_CODES = {
  "Jammu and Kashmir": "01", "Himachal Pradesh": "02", "Punjab": "03", "Chandigarh": "04",
  "Uttarakhand": "05", "Haryana": "06", "Delhi": "07", "Rajasthan": "08", "Uttar Pradesh": "09",
  "Bihar": "10", "Sikkim": "11", "Arunachal Pradesh": "12", "Nagaland": "13", "Manipur": "14",
  "Mizoram": "15", "Tripura": "16", "Meghalaya": "17", "Assam": "18", "West Bengal": "19",
  "Jharkhand": "20", "Odisha": "21", "Chhattisgarh": "22", "Madhya Pradesh": "23", "Gujarat": "24",
  "Dadra and Nagar Haveli and Daman and Diu": "26", "Maharashtra": "27", "Karnataka": "29",
  "Goa": "30", "Lakshadweep": "31", "Kerala": "32", "Tamil Nadu": "33", "Puducherry": "34",
  "Andaman and Nicobar Islands": "35", "Telangana": "36", "Andhra Pradesh": "37", "Ladakh": "38"
};

const INDIAN_STATES = Object.keys(GST_STATE_CODES).sort();

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);

  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const r = localStorage.getItem('role');
    if (r) setUserRole(r.toLowerCase());
  }, []);

  const canEdit = CAN_EDIT_ROLES.includes(userRole);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get(API_ENDPOINTS.suppliers.list);
      setSuppliers(res.data);
    } catch (err) {
      toast.error("Error fetching suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);


  const setF = (key, val) => {
    setForm(prev => {
      let finalVal = val;
      if (key === "pan_number" || key === "gst_number") {
        finalVal = val.toUpperCase();
      }

      const updated = { ...prev, [key]: finalVal };

      // Auto-generate code if name is entered and not editing
      if (key === "supplier_name" && !editId && !updated.supplier_code) {
        const num = String(suppliers.length + 1).padStart(5, "0");
        updated.supplier_code = `SUP-${num}`;
      }

      return updated;
    });

    // Clear error as user types
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.supplier_code.trim()) e.supplier_code = "Required";
    if (!form.supplier_name.trim()) e.supplier_name = "Required";
    else if (form.supplier_name.trim().length < 3) e.supplier_name = "Min 3 chars";

    if (!form.contact_person.trim()) e.contact_person = "Required";

    if (!form.mobile.trim()) e.mobile = "Required";
    else if (!/^\d{10}$/.test(form.mobile.trim())) e.mobile = "Must be 10 digits";

    if (form.alternate_mobile && !/^\d{10}$/.test(form.alternate_mobile.trim())) e.alternate_mobile = "Must be 10 digits";

    if (!form.email.trim()) e.email = "Required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Invalid email";

    // GST validation removed - now accepts any format or can be empty

    if (form.pan_number?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.pan_number.trim())) {
      e.pan_number = "Invalid format: AAAAA0000A";
    }

    if (!form.address_line_1.trim()) e.address_line_1 = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";

    if (!form.pincode.trim()) e.pincode = "Required";
    else if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Must be 6 digits";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      const g1 = ["supplier_code", "supplier_name", "contact_person", "mobile", "alternate_mobile", "email"];
      const g2 = ["gst_number", "pan_number", "address_line_1", "address_line_2", "city", "state", "pincode"];
      if (Object.keys(errors).some(k => g1.includes(k))) setActiveTab(0);
      else if (Object.keys(errors).some(k => g2.includes(k))) setActiveTab(1);
      toast.error("Please fix validation errors");
      return;
    }

    try {
      if (editId) {
        await API.put(API_ENDPOINTS.suppliers.update(editId), form);
        toast.success(`Supplier details updated!`);
      } else {
        await API.post(API_ENDPOINTS.suppliers.add, form);
        toast.success(`Supplier ${form.supplier_name} added successfully!`);
      }
      fetchSuppliers();
      setShowModal(false);
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') {
        const errs = {};
        for (const [k, v] of Object.entries(err.response.data)) {
          errs[k] = Array.isArray(v) ? v[0] : v;
        }
        setErrors(errs);
        toast.error(errs.gst_number || errs.mobile || "API Validation error");
      } else {
        toast.error("Failed to save supplier");
      }
    }
  };

  const toggleStatus = async (sup) => {
    if (!canEdit) return;
    try {
      const activeState = !sup.is_active;
      await API.patch(API_ENDPOINTS.suppliers.update(sup.id), { is_active: activeState });
      toast.success(`Supplier marked as ${activeState ? 'Active' : 'Inactive'}`);
      setSuppliers(prev => prev.map(s => s.id === sup.id ? { ...s, is_active: activeState } : s));
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setErrors({});
    setActiveTab(0);
    setShowModal(true);
  };

  const openEdit = (sup) => {
    setForm({
      ...INITIAL_FORM,
      ...sup,
      address_line_1: sup.address_line_1 || "",
      address_line_2: sup.address_line_2 || "",
      alternate_mobile: sup.alternate_mobile || "",
      pan_number: sup.pan_number || "",
      bank_name: sup.bank_name || "",
      account_number: sup.account_number || "",
      ifsc_code: sup.ifsc_code || "",
      notes: sup.notes || "",
    });
    setEditId(sup.id);
    setErrors({});
    setActiveTab(0);
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      await API.delete(API_ENDPOINTS.suppliers.delete(id));
      toast.success("Supplier removed from system");
      fetchSuppliers();
    } catch (err) {
      toast.error("Failed to delete supplier");
    }
  };

  const filtered = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return suppliers.filter(sup => {
      const matchesSearch =
        sup.supplier_name?.toLowerCase().includes(s) ||
        sup.contact_person?.toLowerCase().includes(s) ||
        sup.mobile?.includes(s) ||
        sup.gst_number?.toLowerCase().includes(s) ||
        sup.supplier_code?.toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && sup.is_active) ||
        (statusFilter === "inactive" && !sup.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const inp = (k, extra = {}) => ({
    className: `custom-input ${errors[k] ? "error" : ""}`,
    value: form[k] ?? "",
    onChange: (e) => setF(k, e.target.value),
    ...extra,
  });

  const errSpan = (k) => errors[k] && (
    <span style={{ fontSize: "0.74rem", color: "#dc2626", marginTop: "2px", display: "block" }}>{errors[k]}</span>
  );

  return (
    <Layout
      title="Supplier Management"
      subtitle="Manage supply chain partnerships and procurement contacts"
      icon={<Building size={24} />}
    >
      <Toaster position="top-right" />

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: "0.75rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="search-wrapper" style={{ maxWidth: "400px" }}>
          <Search className="search-icon" size={16} />
          <input
            className="custom-input"
            placeholder="Search by name, GST, mobile, code..."
            style={{ paddingLeft: "42px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", gap: "4px" }}>
            {["all", "active", "inactive"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 16px", border: "none", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer",
                  background: statusFilter === s ? "#fff" : "transparent",
                  color: statusFilter === s ? "var(--primary)" : "#64748b",
                  boxShadow: statusFilter === s ? "0 2px 4px rgba(0,0,0,0.05)" : "none"
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {canEdit && (
            <>
              <div
                className="custom-input"
                disabled={loading}
                style={{
                  margin: 0,
                  backgroundColor: "var(--primary-light)",
                  borderLeft: "4px solid var(--primary)",
                  boxShadow: "none",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  height: "38px"
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)", whiteSpace: "nowrap" }}>
                  {suppliers.length} Total
                </span>
              </div>
              <button className="btn-primary" onClick={openAdd} style={{ padding: "8px 20px", height: "38px" }}>
                <UserPlus size={16} /> Add Supplier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Supplier List Table */}
      <div className="table-container card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table" style={{ margin: 0 }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              <th>Supplier Info</th>
              <th>Contact Details</th>
              <th>GST & Address</th>
              <th>Status / Balance</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "3rem" }}>Loading suppliers...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "3rem" }}>No suppliers found.</td></tr>
            ) : (
              filtered.map((sup) => (
                <tr key={sup.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: sup.is_active ? "#e0f2fe" : "#f1f5f9", color: sup.is_active ? "var(--primary)" : "#94a3b8" }}>
                        <Warehouse size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: sup.is_active ? "inherit" : "#94a3b8" }}>
                          {sup.supplier_name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", fontFamily: "monospace" }}>
                          {sup.supplier_code}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                        <User size={13} className="text-muted" /> {sup.contact_person}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Phone size={13} /> <a href={`tel:${sup.mobile}`} style={{ color: "var(--primary)", textDecoration: "none" }}>{sup.mobile}</a>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={13} /> <a href={`mailto:${sup.email}`} style={{ color: "var(--primary)", textDecoration: "none" }}>{sup.email}</a>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "monospace", padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", width: "fit-content" }}>
                        <ShieldCheck size={14} color="#10b981" /> {sup.gst_number || "No GST"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                        <MapPin size={13} /> {sup.city}, {sup.state}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div
                        onClick={() => toggleStatus(sup)}
                        style={{
                          width: "36px", height: "18px", background: sup.is_active ? "#10b981" : "#cbd5e1", borderRadius: "10px",
                          position: "relative", cursor: "pointer", transition: "0.3s"
                        }}
                      >
                        <div style={{
                          width: "14px", height: "14px", background: "#fff", borderRadius: "50%", position: "absolute",
                          top: "2px", left: sup.is_active ? "20px" : "2px", transition: "0.3s"
                        }} />
                      </div>
                      <div style={{ fontWeight: "600", color: sup.opening_balance > 0 ? "var(--danger)" : "var(--text-main)" }}>
                        ₹{Number(sup.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                      <button onClick={() => toast("Redirecting to ledger...")} className="btn-icon" title="View Ledger" style={{ color: "var(--info)" }}>
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <>
                          <button onClick={() => openEdit(sup)} className="btn-icon" title="Edit" style={{ color: "var(--primary)" }}>
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDelete(sup.id, sup.supplier_name)} className="btn-icon" title="Delete" style={{ color: "var(--danger)" }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "800px", padding: 0, backgroundColor: "#fff" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Building size={20} className="text-primary" /> {editId ? "Edit Supplier Details" : "Add New Supplier"}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              {[
                { label: "Basic Info", icon: <User size={14} /> },
                { label: "Compliance & Address", icon: <ShieldAlert size={14} /> },
                { label: "Financials", icon: <CreditCard size={14} /> }
              ].map((t, i) => {
                const hasErr = Object.keys(errors).length > 0 && (
                  (i === 0 && ["supplier_code", "supplier_name", "contact_person", "mobile", "email"].some(k => errors[k])) ||
                  (i === 1 && ["gst_number", "pan_number", "address_line_1", "city", "state", "pincode"].some(k => errors[k]))
                );
                return (
                  <button
                    key={i} type="button" onClick={() => setActiveTab(i)}
                    style={{
                      flex: 1, padding: "15px", border: "none", background: activeTab === i ? "#fff" : "transparent",
                      borderBottom: activeTab === i ? "2px solid var(--primary)" : "2px solid transparent",
                      fontWeight: activeTab === i ? "700" : "500", color: hasErr ? "var(--danger)" : (activeTab === i ? "var(--primary)" : "var(--text-muted)"),
                      cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontSize: "0.85rem"
                    }}>
                    {t.icon} {t.label} {hasErr && <span style={{ width: "6px", height: "6px", background: "var(--danger)", borderRadius: "50%" }} />}
                  </button>
                )
              })}
            </div>

            <div style={{ padding: "1.5rem 2.5rem", maxHeight: "70vh", overflowY: "auto", backgroundColor: "#fff" }}>
              {activeTab === 0 && (
                <fieldset className="premium-fieldset">
                  <legend className="premium-legend">Supplier Identity</legend>
                  <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                    <div className="form-group">
                      <label>Supplier Name *</label>
                      <input {...inp("supplier_name")} placeholder="e.g. Reliance Pharma" />
                      {errSpan("supplier_name")}
                    </div>
                    <div className="form-group">
                      <label>Supplier Code *</label>
                      <input {...inp("supplier_code")} placeholder="SUP-00001" disabled={!!editId} style={{ backgroundColor: "#f1f5f9" }} />
                      {errSpan("supplier_code")}
                    </div>
                    <div className="form-group">
                      <label>Contact Person *</label>
                      <div style={{ position: "relative" }}>
                        <User size={14} style={{ position: "absolute", left: "12px", top: "14px", color: "#94a3b8" }} />
                        <input {...inp("contact_person")} style={{ paddingLeft: "35px" }} placeholder="Manager Name" />
                      </div>
                      {errSpan("contact_person")}
                    </div>
                    <div className="form-group">
                      <label>Email Address *</label>
                      <div style={{ position: "relative" }}>
                        <Mail size={14} style={{ position: "absolute", left: "12px", top: "14px", color: "#94a3b8" }} />
                        <input {...inp("email")} type="email" style={{ paddingLeft: "35px" }} placeholder="vendor@email.com" />
                      </div>
                      {errSpan("email")}
                    </div>
                    <div className="form-group">
                      <label>Mobile Number *</label>
                      <div style={{ position: "relative" }}>
                        <Phone size={14} style={{ position: "absolute", left: "12px", top: "14px", color: "#94a3b8" }} />
                        <input {...inp("mobile")} type="tel" style={{ paddingLeft: "35px" }} placeholder="10 digits" maxLength={10} />
                      </div>
                      {errSpan("mobile")}
                    </div>
                    <div className="form-group">
                      <label>Alternate Mobile</label>
                      <input {...inp("alternate_mobile")} type="tel" placeholder="Secondary contact" maxLength={10} />
                      {errSpan("alternate_mobile")}
                    </div>
                  </div>
                </fieldset>
              )}

              {activeTab === 1 && (
                <fieldset className="premium-fieldset">
                  <legend className="premium-legend">Taxation & Location</legend>
                  <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                    <div className="form-group">
                      <label>GST Number</label>
                      <div style={{ position: "relative" }}>
                        <input
                          {...inp("gst_number")}
                          placeholder="22AAAAA0000A1Z5 (Optional)"
                          style={{ textTransform: "uppercase", paddingRight: "35px" }}
                          maxLength={15}
                        />
                        {/* Validation icon removed */}
                      </div>
                      {errSpan("gst_number")}
                    </div>
                    <div className="form-group">
                      <label>PAN Number</label>
                      <input {...inp("pan_number")} placeholder="AAAAA0000A" style={{ textTransform: "uppercase" }} maxLength={10} />
                      {errSpan("pan_number")}
                    </div>
                    <div className="form-group">
                      <label>Address Line 1 *</label>
                      <input {...inp("address_line_1")} placeholder="Building, Street Name" />
                      {errSpan("address_line_1")}
                    </div>
                    <div className="form-group">
                      <label>Address Line 2</label>
                      <input {...inp("address_line_2")} placeholder="Landmark, Area" />
                    </div>
                    <div className="form-group">
                      <label>State *</label>
                      <select {...inp("state")}>
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errSpan("state")}
                    </div>
                    <div className="form-group">
                      <label>City *</label>
                      <input {...inp("city")} placeholder="City" />
                      {errSpan("city")}
                    </div>
                    <div className="form-group">
                      <label>PIN Code *</label>
                      <input {...inp("pincode")} maxLength={6} placeholder="6 digits" />
                      {errSpan("pincode")}
                    </div>
                    <div className="form-group" style={{ visibility: "hidden" }}>
                      <label>Spacer</label>
                      <input disabled />
                    </div>
                  </div>
                </fieldset>
              )}

              {activeTab === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <fieldset className="premium-fieldset">
                    <legend className="premium-legend">Financial Controls</legend>
                    <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                      <div className="form-group">
                        <label>Opening Bal (₹)</label>
                        <input {...inp("opening_balance")} type="number" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label>Credit Limit (₹)</label>
                        <input {...inp("credit_limit")} type="number" step="0.01" />
                      </div>
                      <div className="form-group">
                        <label>Credit Days</label>
                        <input {...inp("credit_days")} type="number" />
                      </div>
                      <div className="form-group">
                        <label>Bank Name</label>
                        <input {...inp("bank_name")} placeholder="e.g. ICICI Bank" />
                      </div>
                      <div className="form-group">
                        <label>IFSC Code</label>
                        <input {...inp("ifsc_code")} style={{ textTransform: "uppercase" }} maxLength={11} placeholder="IFSC" />
                      </div>
                      <div className="form-group">
                        <label>Account Number</label>
                        <input {...inp("account_number")} placeholder="Enter bank account no" />
                      </div>
                      <div className="form-group">
                        <label>Additional Notes</label>
                        <input {...inp("notes")} placeholder="Special instructions..." />
                      </div>
                      <div className="form-group">
                        <label>Supplier Status</label>
                        <div style={{
                          flexDirection: "row",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: form.is_active ? "var(--primary-light)" : "#f8fafc",
                          padding: "0 16px",
                          borderRadius: "10px",
                          border: `1px solid ${form.is_active ? "var(--primary)" : "#e2e8f0"}`,
                          height: "42px",
                          transition: "0.3s all ease"
                        }}>
                          <span style={{ fontWeight: "700", fontSize: "0.85rem", color: form.is_active ? "var(--primary)" : "#475569" }}>
                            {form.is_active ? "Active" : "Inactive"}
                          </span>
                          <div
                            onClick={() => setF("is_active", !form.is_active)}
                            style={{
                              width: "38px",
                              height: "20px",
                              background: form.is_active ? "var(--primary)" : "#cbd5e1",
                              borderRadius: "12px",
                              position: "relative",
                              cursor: "pointer",
                              transition: "0.3s"
                            }}
                          >
                            <div style={{
                              width: "14px",
                              height: "14px",
                              background: "#fff",
                              borderRadius: "50%",
                              position: "absolute",
                              top: "3px",
                              left: form.is_active ? "21px" : "3px",
                              transition: "0.3s"
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "1.25rem 2rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" style={{
                background: "transparent", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", color: "#475569", cursor: "pointer",
                visibility: activeTab > 0 ? "visible" : "hidden"
              }} onClick={() => setActiveTab(t => t - 1)}>
                ← Previous
              </button>

              <div style={{ display: "flex", gap: "12px" }}>
                <button type="button" className="btn-secondary" style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1" }} onClick={() => setShowModal(false)}>Cancel</button>

                {activeTab < 2 ? (
                  <button type="button" className="btn-primary" style={{ minWidth: "120px" }} onClick={() => setActiveTab(t => t + 1)}>
                    Next Phase →
                  </button>
                ) : (
                  <button type="button" className="btn-primary" style={{ minWidth: "150px" }} onClick={handleSave}>
                    ✓ {editId ? "Update Supplier" : "Register Supplier"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .btn-icon {
          background: #f1f5f9;
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
        }
        .btn-icon:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }
        .grid-cols-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .premium-fieldset {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          background: #fff;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .premium-legend {
          padding: 0 12px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
          background: #fff;
          border-radius: 6px;
          margin-left: 10px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          animation: slideUp 0.3s ease-out;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Layout>
  );
}

export default Suppliers;

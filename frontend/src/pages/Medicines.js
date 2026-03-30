import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
  Plus, Pill, Search, AlertTriangle, CheckCircle, XCircle,
  Clock, Trash2, Pencil, X, ChevronRight, Package2,
  FlaskConical, Layers, Calculator, FileDown, Upload
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;
const CATEGORIES = [
  "Tablet", "Capsule", "Lozenges",
  "Powder", "Granules",
  "Syrup", "Suspension", "Solution", "Elixir", "Drops",
  "Cream", "Ointment", "Gel", "Paste", "Lotion",
  "Injection", "IV (Intravenous)", "IM (Intramuscular)", "SC (Subcutaneous)", "Infusion",
  "Inhaler", "Nebulizer solution", "Aerosol spray",
  "Suppositories", "Pessaries", "Enemas"
];
const MED_TYPES = ["Allopathic", "Ayurvedic", "Homeopathic"];

const EMPTY_FORM = {
  // Tab 1
  medicine_name: "", generic_name: "", medicine_code: "",
  company: "", category: "Tablet", medicine_type: "Allopathic",
  hsn_code: "3004", composition: "",
  // Tab 2
  pack_size: "", purchase_price: "", mrp: "", selling_price: "",
  discount: "0", gst_percentage: 5, reorder_level: "10",
  max_stock_level: "", stock_quantity: "0",
  // Tab 3
  rack_location: "",
  prescription_required: false, storage_instructions: "", side_effects: "",
};

// ─── Stock Badge ──────────────────────────────────────────────────────────
function StockBadge({ qty, reorder, expiryDays }) {
  if (expiryDays !== null && expiryDays <= 30) {
    return (
      <span style={{ background: "#fef3c7", color: "#b45309", padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
        <Clock size={11} /> Near Expiry
      </span>
    );
  }
  if (qty === 0) return (
    <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <XCircle size={11} /> Out of Stock
    </span>
  );
  if (qty <= reorder) return (
    <span style={{ background: "#ffedd5", color: "#c2410c", padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <AlertTriangle size={11} /> Low Stock
    </span>
  );
  return (
    <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <CheckCircle size={11} /> In Stock
    </span>
  );
}

// ─── Category Badge ───────────────────────────────────────────────────────
const CAT_COLORS = {
  Tablet: "#e0f2fe:#0369a1", Capsule: "#fce7f3:#be185d",
  Syrup: "#d1fae5:#065f46", Injection: "#fef3c7:#b45309",
  Cream: "#ede9fe:#6d28d9", Drops: "#e0f2fe:#0369a1",
  Powder: "#f0fdf4:#15803d", Ointment: "#fef9c3:#854d0e",
};
function CatBadge({ cat }) {
  const [bg, color] = (CAT_COLORS[cat] || "#f1f5f9:#475569").split(":");
  return (
    <span style={{ background: bg, color, padding: "2px 9px", borderRadius: "12px", fontSize: "0.73rem", fontWeight: "700" }}>{cat}</span>
  );
}

// ─── GST Calculator Panel ─────────────────────────────────────────────────
function GSTCalc({ form }) {
  const pp = parseFloat(form.purchase_price) || 0;
  const gst = parseFloat(form.gst_percentage) || 0;
  const mrp = parseFloat(form.mrp) || 0;
  const sp = parseFloat(form.selling_price) || 0;
  const gstAmt = pp * (gst / 100);
  const costPrice = pp + gstAmt;
  const margin = mrp - costPrice;
  const marginPct = costPrice > 0 ? ((margin / costPrice) * 100).toFixed(2) : "0.00";

  return (
    <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1rem", border: "1px solid #e2e8f0", marginTop: "0.5rem", fontSize: "0.82rem" }}>
      <div style={{ fontWeight: "700", marginBottom: "0.6rem", color: "var(--bg-sidebar)", display: "flex", alignItems: "center", gap: "6px" }}>
        <Calculator size={14} /> Real-time Price Breakdown
      </div>
      {[
        ["Purchase Price", fmt(pp)],
        [`GST @ ${gst}%`, `+${fmt(gstAmt)}`],
        ["Cost Price (incl. GST)", fmt(costPrice), "#15803d"],
        [`Margin`, `${fmt(margin)} (${marginPct}%)`, margin >= 0 ? "#15803d" : "#dc2626"],
        ["MRP", fmt(mrp), "#1e40af"],
        ["Selling Price", fmt(sp)],
      ].map(([label, val, color]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #f1f5f9", color: color || "var(--text-main)" }}>
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <strong>{val}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const role = (localStorage.getItem("role") || "staff").toLowerCase();
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const canEdit = role === "admin" || permissions?.medicine?.update || permissions?.medicine?.create;
  const canDelete = role === "admin" || permissions?.medicine?.delete;
  const fileInputRef = useRef(null);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    if (type === "success") {
      toast.success(message, { duration });
    } else if (type === "error") {
      toast.error(message, { duration });
    } else if (type === "warning") {
      toast(message, { duration, icon: "⚠️" });
    } else {
      toast(message, { duration });
    }
  }, []);

  const fetchAll = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const mRes = await API.get(API_ENDPOINTS.medicines.list({ page }));
      setMedicines(mRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-generate medicine code from name
  const setF = (key, val) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val };
      // Auto-code if name changes
      if (key === "medicine_name") {
        const words = val.trim().split(/\s+/).slice(0, 2).map(w => w.slice(0, 3).toUpperCase());
        const num = String(Math.floor(Math.random() * 10000)).padStart(5, "0");
        updated.medicine_code = `MED-${words.join("")}-${num}`;
      }
      // Auto selling price from discount & MRP
      if (key === "discount" || key === "mrp") {
        const mrp = parseFloat(key === "mrp" ? val : updated.mrp) || 0;
        const disc = parseFloat(key === "discount" ? val : updated.discount) || 0;
        updated.selling_price = (mrp * (1 - disc / 100)).toFixed(2);
      }
      return updated;
    });
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: "" }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setActiveTab(0);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (med) => {
    setForm({
      medicine_name: med.medicine_name || "", generic_name: med.generic_name || "",
      medicine_code: med.medicine_code || "", company: med.company || "",
      category: med.category || "Tablet", medicine_type: med.medicine_type || "Allopathic",
      hsn_code: med.hsn_code || "3004", composition: med.composition || "",
      pack_size: med.pack_size || "", purchase_price: med.purchase_price || "",
      mrp: med.mrp || "", selling_price: med.selling_price || "",
      discount: med.discount || "0", gst_percentage: med.gst_percentage || 5,
      reorder_level: med.reorder_level || "10", max_stock_level: med.max_stock_level || "",
      stock_quantity: med.stock_quantity || "0",
      rack_location: med.rack_location || "", supplier: med.supplier || "",
      prescription_required: med.prescription_required || false,
      storage_instructions: med.storage_instructions || "", side_effects: med.side_effects || "",
    });
    setEditId(med.id);
    setActiveTab(0);
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.medicine_name.trim()) e.medicine_name = "Required";
    if (!form.company.trim()) e.company = "Required";
    if (!form.medicine_code.trim()) e.medicine_code = "Required";
    if (!form.purchase_price) e.purchase_price = "Required";
    if (!form.mrp) e.mrp = "Required";
    else if (parseFloat(form.mrp) < parseFloat(form.purchase_price))
      e.mrp = "MRP must be ≥ Purchase Price";
    if (!form.selling_price) e.selling_price = "Required";
    if (!form.pack_size) e.pack_size = "Required";
    if (!form.reorder_level) e.reorder_level = "Required";
    setErrors(e);
    return e; // Return errors directly
  };

  const handleSave = async (e, keepOpen = false) => {
    e?.preventDefault();

    const tab0Keys = ["medicine_name", "generic_name", "medicine_code", "company", "hsn_code", "category", "medicine_type", "composition"];
    const tab1Keys = ["pack_size", "purchase_price", "mrp", "selling_price", "reorder_level", "discount", "gst_percentage"];
    const tab2Keys = ["rack_location", "supplier", "prescription_required"];

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      if (Object.keys(validationErrors).some(k => tab0Keys.includes(k))) setActiveTab(0);
      else if (Object.keys(validationErrors).some(k => tab1Keys.includes(k))) setActiveTab(1);
      else if (Object.keys(validationErrors).some(k => tab2Keys.includes(k))) setActiveTab(2);
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.manufacturing_date || payload.manufacturing_date === "") delete payload.manufacturing_date;
      if (!payload.expiry_date || payload.expiry_date === "") delete payload.expiry_date;
      if (!payload.supplier || payload.supplier === "") delete payload.supplier;
      if (payload.max_stock_level === "") payload.max_stock_level = 0;

      if (editId) {
        await API.put(API_ENDPOINTS.medicines.update(editId), payload);
        addToast(`Medicine "${form.medicine_name}" updated successfully`, "info");
      } else {
        await API.post(API_ENDPOINTS.medicines.add, payload);
        addToast(`Medicine "${form.medicine_name}" added successfully`, "success");
      }
      await fetchAll();
      if (keepOpen) {
        setForm(EMPTY_FORM);
        setActiveTab(0);
        setEditId(null);
        setErrors({});
      } else {
        setShowModal(false);
      }
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        const fieldErrors = {};
        Object.keys(data).forEach(k => {
          fieldErrors[k] = Array.isArray(data[k]) ? data[k].join(" ") : data[k];
        });
        setErrors(fieldErrors);
        addToast("Please fix the validation errors.", "error", 5000);

        // Auto-switch to tab with errors
        if (Object.keys(fieldErrors).some(k => tab0Keys.includes(k))) setActiveTab(0);
        else if (Object.keys(fieldErrors).some(k => tab1Keys.includes(k))) setActiveTab(1);
        else if (Object.keys(fieldErrors).some(k => tab2Keys.includes(k))) setActiveTab(2);
      } else {
        addToast("Failed to save medicine. Please try again.", "error", 5000);
      }
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async (id, name) => {
    const { confirm } = window; // Destructure at the top of the function
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    
    try {
      await API.delete(API_ENDPOINTS.medicines.delete(id));
        addToast(`Medicine "${name}" deleted.`, "warning");
        fetchAll();
      } catch (error) {
        addToast("Delete failed.", "error");
      }
    };

    const handleExportCSV = async () => {
      try {
        const response = await API.get(API_ENDPOINTS.medicines.exportCsv, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'medicines.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast("Export downloaded successfully.", "success");
      } catch (err) {
        addToast("Failed to export medicines.", "error");
      }
    };

    const handleImportCSV = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      setSaving(true);
      addToast("Importing medicines... Please wait.", "info");

      try {
        await API.post(API_ENDPOINTS.medicines.importCsv, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        addToast("Medicines imported successfully!", "success");
        fetchAll();
      } catch (err) {
        if (err.response?.data?.details) {
          addToast(`Import failed: ${err.response.data.details[0]}`, "error", 6000);
        } else {
          addToast("Failed to import medicines. Check file format.", "error");
        }
      } finally {
        setSaving(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    // ── Filtering ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
      return medicines.filter(m => {
        const s = searchTerm.toLowerCase();
        const matchSearch = (
          m.medicine_name?.toLowerCase().includes(s) ||
          m.company?.toLowerCase().includes(s) ||
          m.medicine_code?.toLowerCase().includes(s)
        );
        const matchCat = filterCat === "All" || m.category === filterCat;
        let statusMatch = true;
        if (filterStatus !== "All") {
          if (filterStatus === "in_stock") statusMatch = m.stock_quantity > m.reorder_level;
          if (filterStatus === "low_stock") statusMatch = m.stock_quantity > 0 && m.stock_quantity <= m.reorder_level;
          if (filterStatus === "out_of_stock") statusMatch = m.stock_quantity === 0;
        }
        return matchSearch && matchCat && statusMatch;
      });
    }, [medicines, searchTerm, filterCat, filterStatus]);

    // ── Tab Navigation ─────────────────────────────────────────────────────
    const TABS = [
      { label: "Basic Info", icon: <Pill size={14} /> },
      { label: "Pricing & Stock", icon: <Calculator size={14} /> },
      { label: "Storage & Details", icon: <Layers size={14} /> },
    ];

    const inp = (k, extra = {}) => ({
      className: "custom-input",
      value: form[k] ?? "",
      onChange: (e) => setF(k, e.target.value),
      style: { borderColor: errors[k] ? "#ef4444" : undefined, ...extra.style },
      ...extra,
    });
    const errSpan = (k) => errors[k] && (
      <span style={{ fontSize: "0.74rem", color: "#dc2626", marginTop: "2px", display: "block" }}>{errors[k]}</span>
    );

    // ── Stats ──────────────────────────────────────────────────────────────
    const stats = {
      total: medicines.length,
      inStock: medicines.filter(m => m.stock_quantity > m.reorder_level).length,
      low: medicines.filter(m => m.stock_quantity > 0 && m.stock_quantity <= m.reorder_level).length,
      out: medicines.filter(m => m.stock_quantity === 0).length,
    };

    return (
      <Layout>
        <Toaster position="top-right" />

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <FlaskConical size={30} style={{ color: "var(--primary)" }} />
            <div>
              <h2 style={{ margin: 0 }}>Medicine Master</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
                Complete medicine catalogue · {stats.total} SKUs
              </p>
            </div>
          </div>
          {canEdit && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImportCSV}
              />
              {(role === "admin" || permissions?.medicine?.create) && (
                <button className="btn-primary" onClick={openAdd}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.1rem", borderRadius: "10px", fontSize: "0.9rem" }}>
                  <Plus size={16} /> Add Medicine
                </button>
              )}
              {(role === "admin" || permissions?.medicine?.create) && (
                <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1rem", borderRadius: "10px", fontSize: "0.88rem", background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                  <Upload size={15} /> CSV Import
                </button>
              )}
              <button onClick={handleExportCSV} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1rem", borderRadius: "10px", fontSize: "0.88rem", background: "#f8fafc", border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)" }}>
                <FileDown size={15} /> Export
              </button>
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Total SKUs", val: stats.total, color: "#0369a1", bg: "#e0f2fe" },
            { label: "In Stock", val: stats.inStock, color: "#15803d", bg: "#dcfce7" },
            { label: "Low Stock", val: stats.low, color: "#c2410c", bg: "#ffedd5" },
            { label: "Out of Stock", val: stats.out, color: "#991b1b", bg: "#fee2e2" },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: "0.85rem 1rem", borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: s.color }}>{s.val}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ── */}
        <div className="card" style={{ padding: "0.75rem", marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <div className="search-wrapper" style={{ minWidth: "200px" }}>
            <Search className="search-icon" size={16} />
            <input
              className="custom-input" style={{ paddingLeft: "42px" }}
              placeholder="Search by medicine name, company"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="custom-input" style={{ width: "140px" }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="custom-input" style={{ width: "140px" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          {(searchTerm || filterCat !== "All" || filterStatus !== "All") && (
            <button onClick={() => { setSearchTerm(""); setFilterCat("All"); setFilterStatus("All"); }}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.4rem 0.8rem", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Clear ×
            </button>
          )}
          <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Showing {filtered.length} of {medicines.length}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ padding: 0, borderRadius: "14px", overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Code / Category</th>
                <th style={{ textAlign: "center" }}>Stock</th>
                <th>Pricing</th>
                <th>Status</th>
                {canEdit && <th style={{ textAlign: "center" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  Loading medicines...
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  <Package2 size={40} style={{ opacity: 0.15, marginBottom: "0.5rem", display: "block", margin: "0 auto 0.5rem" }} />
                  No medicines found.{canEdit && " Click 'Add Medicine' to get started."}
                </td></tr>
              )}
              {filtered.map(med => {
                const lowStock = med.stock_quantity > 0 && med.stock_quantity <= med.reorder_level;
                const outStock = med.stock_quantity === 0;
                const expDays = med.days_to_expiry;
                return (
                  <tr key={med.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ padding: "8px", borderRadius: "10px", background: "var(--primary-light)", color: "var(--primary)", flexShrink: 0 }}>
                          <Pill size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                            {med.medicine_name}
                            {med.prescription_required && (
                              <span style={{ background: "#fee2e2", color: "#991b1b", fontSize: "0.65rem", fontWeight: "800", padding: "1px 5px", borderRadius: "4px" }}>Rx</span>
                            )}
                          </div>
                          {med.generic_name && (
                            <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{med.generic_name}</div>
                          )}
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{med.company}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", fontSize: "0.85rem", fontFamily: "monospace" }}>{med.medicine_code}</div>
                      <CatBadge cat={med.category} />
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{med.medicine_type}</div>
                    </td>
                    <td>
                      {med.rack_location && (
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>📍 {med.rack_location}</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: "800", fontSize: "1.1rem", color: outStock ? "#ef4444" : lowStock ? "#f97316" : "var(--success)" }}>
                        {med.stock_quantity}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>/ {med.reorder_level} reorder</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "800", fontSize: "0.95rem" }}>
                        {fmt(med.selling_price)}
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginLeft: "2px" }}>
                          {["Tablet", "Capsule", "Lozenges"].includes(med.category) ? "/ Strip" :
                            ["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(med.category) ? "/ Bottle" :
                              ["Injection", "IV (Intravenous)", "IM (Intramuscular)", "SC (Subcutaneous)", "Infusion"].includes(med.category) ? "/ Vial" :
                                ["Cream", "Ointment", "Gel", "Paste", "Lotion"].includes(med.category) ? "/ Tube" :
                                  ["Inhaler", "Nebulizer solution", "Aerosol spray"].includes(med.category) ? "/ Canister" :
                                    "/ Unit"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                        MRP {fmt(med.mrp)}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>GST {med.gst_percentage}%</div>
                    </td>
                    <td>
                      <StockBadge qty={med.stock_quantity} reorder={med.reorder_level} expiryDays={expDays} />
                    </td>
                    {canEdit && (
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          {(role === "admin" || permissions?.medicine?.update) && (
                            <button onClick={() => openEdit(med)}
                              style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", color: "#1d4ed8", display: "inline-flex" }}>
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(med.id, med.medicine_name)}
                              style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", color: "#dc2626", display: "inline-flex" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ─── ADD / EDIT MODAL ─── */}
        {showModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "1rem" }}>
            <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "680px", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5)" }}>

              {/* Modal Header */}
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "1.1rem" }}>
                  <Pill size={18} style={{ color: "var(--primary)" }} />
                  {editId ? "Edit Medicine" : "Add New Medicine"}
                </h3>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", flexShrink: 0 }}>
                {TABS.map((t, i) => (
                  <button key={i} onClick={() => setActiveTab(i)} style={{
                    flex: 1, padding: "0.8rem 0.5rem", border: "none", background: "none", cursor: "pointer",
                    fontWeight: activeTab === i ? "700" : "500", fontSize: "0.85rem",
                    color: activeTab === i ? "var(--primary)" : "var(--text-muted)",
                    borderBottom: `3px solid ${activeTab === i ? "var(--primary)" : "transparent"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>
                    {t.icon} {t.label}
                    {i === 1 && (errors.mrp || errors.purchase_price || errors.pack_size) && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2.5rem" }}>
                {activeTab === 0 && (
                  <fieldset className="premium-fieldset">
                    <legend className="premium-legend">Basic Identification</legend>
                    <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                      <div className="form-group">
                        <label>Medicine Name *</label>
                        <input {...inp("medicine_name", { placeholder: "e.g. Paracetamol 500mg" })} />
                        {errSpan("medicine_name")}
                      </div>
                      <div className="form-group">
                        <label>Generic Name</label>
                        <input {...inp("generic_name", { placeholder: "e.g. Acetaminophen" })} />
                      </div>
                      <div className="form-group">
                        <label>Medicine Code *</label>
                        <input {...inp("medicine_code", { placeholder: "MED-XXXXX (auto-generated)", style: { backgroundColor: "#f1f5f9" }, disabled: true })} />
                        {errSpan("medicine_code")}
                      </div>
                      <div className="form-group">
                        <label>Manufacturer *</label>
                        <input {...inp("company", { placeholder: "e.g. Sun Pharma" })} />
                        {errSpan("company")}
                      </div>
                      <div className="form-group">
                        <label>Category *</label>
                        <select className="custom-input" value={form.category} onChange={e => setF("category", e.target.value)} style={{ backgroundColor: "#fff" }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>HSN Code</label>
                        <input {...inp("hsn_code", { placeholder: "e.g. 3004" })} />
                      </div>
                      <div className="form-group">
                        <label>Medicine Type</label>
                        <div style={{ display: "flex", gap: "12px", height: "42px", alignItems: "center", background: "#f8fafc", padding: "0 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          {MED_TYPES.map(t => (
                            <label key={t} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem", color: form.medicine_type === t ? "var(--primary)" : "#64748b", margin: 0 }}>
                              <input type="radio" name="medicine_type" value={t} checked={form.medicine_type === t} onChange={e => setF("medicine_type", e.target.value)} style={{ margin: 0 }} />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Composition / Salt</label>
                        <input {...inp("composition", { placeholder: "e.g. Paracetamol IP 500mg" })} />
                      </div>
                    </div>
                  </fieldset>
                )}

                {activeTab === 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <fieldset className="premium-fieldset">
                      <legend className="premium-legend">Pricing & Inventory</legend>
                      <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                        <div className="form-group">
                          <label>
                            {["Tablet", "Capsule", "Lozenges"].includes(form.category) ? "Pack Size (e.g. 10 Tabs/Strip)" :
                              ["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(form.category) ? "Bottle Size (e.g. 100ml)" :
                                ["Injection", "IV (Intravenous)", "IM (Intramuscular)", "SC (Subcutaneous)", "Infusion"].includes(form.category) ? "Vial Size" :
                                  ["Cream", "Ointment", "Gel", "Paste", "Lotion"].includes(form.category) ? "Tube Size (e.g. 20g)" :
                                    ["Inhaler", "Nebulizer solution", "Aerosol spray"].includes(form.category) ? "Canister Size (e.g. 200 md)" :
                                      "Pack Size *"}
                          </label>
                          <input {...inp("pack_size", { placeholder: "e.g. 10 Tablets" })} />
                          {errSpan("pack_size")}
                        </div>
                        <div className="form-group">
                          <label>GST Rate (%) *</label>
                          <input {...inp("gst_percentage", { type: "number", min: "0", max: "100", placeholder: "e.g. 18" })} />
                        </div>
                        <div className="form-group">
                          <label>
                            {["Tablet", "Capsule", "Lozenges"].includes(form.category) ? "Purchase Price / Strip (₹) *" :
                              ["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(form.category) ? "Purchase Price / Bottle (₹) *" :
                                "Purchase Price (₹) *"}
                          </label>
                          <input {...inp("purchase_price", { type: "number", step: "0.01", placeholder: "0.00" })} />
                          {errSpan("purchase_price")}
                        </div>
                        <div className="form-group">
                          <label>
                            {["Tablet", "Capsule", "Lozenges"].includes(form.category) ? "MRP / Strip (₹) *" :
                              ["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(form.category) ? "MRP / Bottle (₹) *" :
                                "MRP (₹) *"}
                          </label>
                          <input {...inp("mrp", { type: "number", step: "0.01", placeholder: "0.00" })} />
                          {errSpan("mrp")}
                        </div>
                        <div className="form-group">
                          <label>Discount (%)</label>
                          <input {...inp("discount", { type: "number", step: "0.01", placeholder: "0" })} />
                        </div>
                        <div className="form-group">
                          <label>
                            {["Tablet", "Capsule", "Lozenges"].includes(form.category) ? "Selling Price / Strip (₹) *" :
                              "Selling Price (₹) *"}
                          </label>
                          <input {...inp("selling_price", { type: "number", step: "0.01", placeholder: "Auto", style: { backgroundColor: "#f1f5f9" }, disabled: true })} />
                        </div>
                        <div className="form-group">
                          <label>Reorder Level *</label>
                          <input {...inp("reorder_level", { type: "number", min: "1", placeholder: "10" })} />
                        </div>
                        <div className="form-group">
                          <label>Max Stock Level</label>
                          <input {...inp("max_stock_level", { type: "number", placeholder: "Optional" })} />
                        </div>
                      </div>
                    </fieldset>
                    <GSTCalc form={form} />
                  </div>
                )}

                {activeTab === 2 && (
                  <fieldset className="premium-fieldset">
                    <legend className="premium-legend"> Storage Details</legend>
                    <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
                      <div className="form-group">
                        <label>Rack Location</label>
                        <input {...inp("rack_location", { placeholder: "e.g. A-Row-3" })} />
                      </div>
                      <div className="form-group">
                        <label>Rx Requirement</label>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "0 12px", borderRadius: "10px", border: "1px solid #e2e8f0", height: "42px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                            <input type="checkbox" checked={form.prescription_required} onChange={e => setF("prescription_required", e.target.checked)} />
                            <span style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: "700" }}>Rx Required</span>
                          </label>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Storage Instructions</label>
                        <input {...inp("storage_instructions", { placeholder: "e.g. Store below 25°C" })} />
                      </div>
                      <div className="form-group">
                        <label>Side Effects</label>
                        <input {...inp("side_effects", { placeholder: "Known side effects..." })} />
                      </div>
                    </div>
                  </fieldset>
                )}
              </div>

              {/* Modal Footer — Tab Nav + Save Buttons */}
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9", display: "flex", gap: "0.6rem", flexShrink: 0, flexWrap: "wrap", background: "#fafafa" }}>
                {activeTab > 0 && (
                  <button onClick={() => setActiveTab(activeTab - 1)}
                    style={{ padding: "0.6rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                    ← Previous
                  </button>
                )}
                {activeTab < 2 && (
                  <button onClick={() => setActiveTab(activeTab + 1)} className="btn-primary"
                    style={{ padding: "0.6rem 1.1rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem" }}>
                    Next <ChevronRight size={15} />
                  </button>
                )}
                {activeTab === 2 && !editId && (
                  <button onClick={(e) => handleSave(e, true)} disabled={saving}
                    style={{ padding: "0.6rem 1.1rem", borderRadius: "10px", border: "none", background: "#15803d", color: "white", cursor: "pointer", fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    Save & Add New
                  </button>
                )}
                <button onClick={handleSave} disabled={saving} className="btn-primary"
                  style={{ padding: "0.6rem 1.2rem", borderRadius: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.88rem", marginLeft: "auto" }}>
                  {saving ? "Saving..." : editId ? "💾 Update Medicine" : "✅ Save & Close"}
                </button>
                <button onClick={() => setShowModal(false)}
                  style={{ padding: "0.6rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: "600", color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: translateX(0) } }
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
        .custom-input, select.custom-input, textarea.custom-input {
          width: 100% !important;
          height: 42px !important;
          padding: 0 12px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          font-size: 0.9rem !important;
          box-sizing: border-box !important;
          background-color: #fff;
        }
        textarea.custom-input {
          padding: 10px 12px !important;
          resize: none !important;
        }
      `}</style>
      </Layout>
    );
  }

  export default Medicines;

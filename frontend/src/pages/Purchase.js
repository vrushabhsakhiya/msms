import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
  ShoppingBag,
  Plus,
  Truck,
  Calendar,
  Package,
  Trash2,
  Tag,
  Info,
  Receipt,
  FileText
} from "lucide-react";

function Purchase() {
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  const role = (localStorage.getItem("role") || "staff").toLowerCase();
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const canCreatePurchase = role === "admin" || permissions?.purchase?.create;

  const [form, setForm] = useState({
    purchase_code: `PO-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
    supplier: "",
    invoice_number: `INV-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`,
    invoice_date: new Date().toISOString().split("T")[0],
    total_items: 0,
    total_quantity: 0,
    gross_amount: 0,
    gst_amount: 0,
    net_amount: 0,
    balance_amount: 0,
    payment_status: "pending",
    payment_mode: "Cash",
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    medicine: "",
    quantity: 0,
    free_quantity: 0,
    purchase_rate: 0,
    mrp: 0,
    gst_percentage: 12,
    amount: 0,
    expiry_date: "",
    batch_number: "",
    expiry_months: "",
    category: "",
  });

  useEffect(() => {
    fetchSuppliers();
    fetchMedicines();
    fetchNextCodes();
  }, []);

  const fetchNextCodes = async () => {
    try {
        const res = await API.get(API_ENDPOINTS.purchases.nextCodes);
        setForm(prev => ({
            ...prev,
            purchase_code: res.data.purchase_code,
            invoice_number: res.data.invoice_number
        }));
    } catch (e) { console.error("Error fetching next codes", e); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await API.get(API_ENDPOINTS.suppliers.list);
      setSuppliers(res.data);
    } catch (err) {
      console.error("Error fetching suppliers", err);
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await API.get(API_ENDPOINTS.medicines.list());
      setMedicines(res.data);
    } catch (err) {
      console.error("Error fetching medicines", err);
    }
  };

  const addMonths = (date, months) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + Number.parseInt(months, 10));
    return d.toISOString().split("T")[0];
  };

  const addItem = (e) => {
    e.preventDefault();
    if (
      !currentItem.medicine ||
      currentItem.quantity <= 0 ||
      !currentItem.batch_number ||
      !currentItem.expiry_date
    ) {
      alert(
        "Please ensure all medicine details (Batch, Expiry, Qty) are provided.",
      );
      return;
    }

    const rawAmount = currentItem.quantity * currentItem.purchase_rate;
    const amount = Math.round(rawAmount * 100) / 100;
    const itemWithAmount = { ...currentItem, amount };

    const newItems = [...form.items, itemWithAmount];
    const totalQty = newItems.reduce((acc, i) => acc + Number.parseInt(i.quantity || 0, 10) + Number.parseInt(i.free_quantity || 0, 10), 0);
    const gross = Math.round(newItems.reduce((acc, i) => acc + (Number.parseFloat(i.amount) || 0), 0) * 100) / 100;
    const gst = Math.round(gross * (currentItem.gst_percentage / 100) * 100) / 100;
    const net = Math.round((gross + gst) * 100) / 100;

    setForm({
      ...form,
      items: newItems,
      total_items: newItems.length,
      total_quantity: totalQty,
      gross_amount: gross,
      gst_amount: gst,
      net_amount: net,
      balance_amount: net,
    });

    setCurrentItem({
      medicine: "",
      quantity: 0,
      free_quantity: 0,
      purchase_rate: 0,
      mrp: 0,
      gst_percentage: 12,
      amount: 0,
      expiry_date: "",
      batch_number: "",
      expiry_months: "",
      category: ""
    });
  };

  const removeItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    const totalQty = newItems.reduce((acc, i) => acc + Number.parseInt(i.quantity || 0, 10) + Number.parseInt(i.free_quantity || 0, 10), 0);
    const gross = Math.round(newItems.reduce((acc, i) => acc + (Number.parseFloat(i.amount) || 0), 0) * 100) / 100;
    const gst = Math.round(gross * 0.12 * 100) / 100; // Default 12% for cleanup
    const net = Math.round((gross + gst) * 100) / 100;

    setForm({
      ...form,
      items: newItems,
      total_items: newItems.length,
      total_quantity: totalQty,
      gross_amount: gross,
      gst_amount: gst,
      net_amount: net,
      balance_amount: net,
    });
  };

  const createPurchase = async () => {
    if (!form.supplier || !form.invoice_number || form.items.length === 0) {
      alert("Please select a vendor, enter Invoice No, and add medications to the list.");
      return;
    }
    setLoading(true);
    try {
      await API.post(API_ENDPOINTS.purchases.add, form);
      alert("Inventory Replenished Successfully! ✅");
      setForm({
        purchase_code: `PO-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
        supplier: "",
        invoice_number: `INV-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`,
        invoice_date: new Date().toISOString().split("T")[0],
        total_items: 0,
        total_quantity: 0,
        gross_amount: 0,
        gst_amount: 0,
        net_amount: 0,
        balance_amount: 0,
        payment_status: "pending",
        payment_mode: "Cash",
        items: [],
      });
      fetchNextCodes();
    } catch (err) {
      const errMsg = err.response?.data ? JSON.stringify(err.response.data) : "Procurement entry failed. Check all fields.";
      alert("Error: " + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await API.post(API_ENDPOINTS.purchases.importCsv, formData);
      alert(res.data.message || "Import Successful!");
      fetchMedicines(); // Refresh stock counts
    } catch (err) {
      alert(err.response?.data?.error || "Error importing CSV");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const exportToCSV = () => {
    if (form.items.length === 0) return alert("Add items to stage before exporting template/order.");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "invoice_number,invoice_date,supplier_name,medicine_name,batch_number,expiry_date,quantity,free_quantity,purchase_rate,mrp,gst_percentage\n";
    
    form.items.forEach(it => {
        const med = medicines.find((m) => m.id === Number(it.medicine));
        const supplier = suppliers.find((s) => s.id === Number(form.supplier));
        csvContent += `${form.invoice_number},${form.invoice_date},${supplier?.supplier_name || 'Generic'},${med?.medicine_name},${it.batch_number},${it.expiry_date},${it.quantity},${it.free_quantity},${it.purchase_rate},${it.mrp},${it.gst_percentage}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchase_order_${form.invoice_number}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <ShoppingBag size={28} className="text-primary" /> Procurement Entry
          </h2>
          <p
            style={{
              margin: "5px 0 0 0",
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            Inward mapping of supplier stock to store inventory
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {canCreatePurchase && (
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="file"
                    id="csv-import"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleImportCSV}
                />
                <button 
                    className="btn-secondary" 
                    onClick={exportToCSV}
                    style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                    <FileText size={16} /> Export Staged
                </button>
            </div>
          )}
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              backgroundColor: "white",
              border: "1px solid var(--border)",
              fontWeight: "700",
            }}
          >
            <Tag
              size={16}
              className="text-primary"
              style={{ marginRight: "8px" }}
            />
            {form.purchase_code}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Vendor Header */}
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Truck size={14} /> Vendor Partner
                </label>
                <select
                  className="custom-input"
                  value={form.supplier}
                  onChange={(e) =>
                    setForm({ ...form, supplier: e.target.value })
                  }
                >
                  <option value="">Select registered vendor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Receipt size={14} /> Invoice Number
                </label>
                <input
                  type="text"
                  className="custom-input"
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                  readOnly
                  placeholder="e.g. INV-9901"
                  value={form.invoice_number}
                />
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} /> Invoice Date
                </label>
                <input
                  type="date"
                  className="custom-input"
                  value={form.invoice_date}
                  onChange={(e) =>
                    setForm({ ...form, invoice_date: e.target.value })
                  }
                />
              </div>

            </div>
          </div>


          {/* Item List */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Identity & Qty</th>
                  <th>Costing</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "4rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Package
                        size={48}
                        style={{ opacity: 0.1, marginBottom: "1rem" }}
                      />
                      <p>No inventory items staged for procurement.</p>
                    </td>
                  </tr>
                ) : (
                  form.items.map((it, idx) => (
                    <tr key={idx}>
                      <td>
                          <div style={{ fontWeight: "700" }}>
                          {
                             medicines.find((m) => m.id === Number(it.medicine))
                               ?.medicine_name
                          }
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--primary)",
                            fontWeight: "800",
                          }}
                        >
                          EXP: {it.expiry_date}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                          BATCH: {it.batch_number}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Quantity: {it.quantity} {it.free_quantity > 0 && <span style={{color: '#10b981', fontWeight: 600}}> (+{it.free_quantity} Free)</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>
                          ₹{it.purchase_rate} / unit
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          MRP: ₹{it.mrp}
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "800",
                          fontSize: "1rem",
                        }}
                      >
                        ₹{it.amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => removeItem(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--danger)",
                            cursor: "pointer",
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div
            className="card"
            style={{ backgroundColor: "var(--bg-sidebar)", color: "white" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div style={{ display: "flex", gap: "2.5rem" }}>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Line Items
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>
                    {form.total_items}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Units Staged
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>
                    {form.total_quantity}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      opacity: 0.6,
                      textTransform: "uppercase",
                    }}
                  >
                    Tax Component
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800" }}>
                    ₹{form.gst_amount.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#2dd4bf",
                    fontWeight: "700",
                  }}
                >
                  NET ACCOUNT PAYABLE
                </div>
                <div
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: "900",
                    color: "white",
                  }}
                >
                  ₹{form.net_amount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {canCreatePurchase ? (
            <button
                className="btn-primary"
                style={{ padding: "1.2rem", fontSize: "1.2rem" }}
                onClick={createPurchase}
                disabled={form.items.length === 0 || loading}
            >
                {loading
                ? "Synching Inventory..."
                : "CONFIRM RECEIPT & UPDATE LEDGER"}
            </button>
          ) : (
            <div className="card" style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', textAlign: 'center', padding: '1.2rem' }}>
                <p style={{ margin: 0, color: '#9a3412', fontWeight: '700' }}>
                    <Info size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Read-Only: You do not have permission to commit new purchases.
                </p>
            </div>
          )}
        </div>

        {/* Item staging panel */}
        <div className="card" style={{ position: "sticky", top: "2rem", opacity: canCreatePurchase ? 1 : 0.6, pointerEvents: canCreatePurchase ? 'auto' : 'none' }}>
          <h3
            style={{
              margin: "0 0 1.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Plus size={20} className="text-primary" /> {canCreatePurchase ? "Stage Medication" : "Procurement Restricted"}
          </h3>
          <form onSubmit={addItem}>
            <div className="form-group" style={{ position: "relative", marginBottom: "1rem" }}>
              <label htmlFor="medicine-search">Search & Select Medicine</label>
              <input
                id="medicine-search"
                type="text"
                className="custom-input"
                placeholder="Start typing medicine name..."
                value={currentItem.medicineSearch || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentItem({ ...currentItem, medicineSearch: val, medicine: "" });
                }}
                onFocus={() => setCurrentItem(prev => ({ ...prev, showSuggestions: true }))}
                onBlur={() => setTimeout(() => setCurrentItem(prev => ({ ...prev, showSuggestions: false })), 200)}
              />
              {currentItem.showSuggestions && currentItem.medicineSearch && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  backgroundColor: "white", border: "1px solid var(--border)",
                  borderRadius: "8px", maxHeight: "200px", overflowY: "auto",
                  zIndex: 1000, boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  marginTop: "4px"
                }}>
                  {medicines.filter(m => 
                    m.medicine_name.toLowerCase().includes(currentItem.medicineSearch.toLowerCase())
                  ).map(m => (
                    <div
                      key={m.id}
                      style={{ padding: "0.75rem 1rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                      onMouseDown={() => {
                        setCurrentItem({
                          ...currentItem,
                          medicine: m.id,
                          medicineSearch: m.medicine_name,
                          category: m.category,
                          gst_percentage: m.gst_percentage || 12,
                          mrp: m.mrp || 0,
                          purchase_rate: m.purchase_price || 0,
                          showSuggestions: false
                        });
                      }}
                    >
                      <div style={{ fontWeight: "700" }}>{m.medicine_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.company} ({m.category})</div>
                    </div>
                  ))}
                </div>
              )}
              {currentItem.medicine && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#3b82f6', fontWeight: '700', padding: '6px 10px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  ✓ Selected Category: {currentItem.category}
                </div>
              )}
            </div>
            <div className="grid-cols-2">
              <div className="form-group">
                <label htmlFor="purchased-qty">
                  {(() => {
                    const cat = currentItem.category;
                    if (["Tablet", "Capsule", "Lozenges"].includes(cat)) return "Purchase (Strips)";
                    if (["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(cat)) return "Purchase (Bottles)";
                    if (["Injection", "IV (Intravenous)", "IM (Intramuscular)", "SC (Subcutaneous)", "Infusion"].includes(cat)) return "Purchase (Vials/Ampoules)";
                    if (["Cream", "Ointment", "Gel", "Paste", "Lotion"].includes(cat)) return "Purchase (Tubes)";
                    if (["Powder", "Granules"].includes(cat)) return "Purchase (Sachets/Units)";
                    if (["Inhaler", "Nebulizer solution", "Aerosol spray"].includes(cat)) return "Purchase (Canisters)";
                    if (["Suppositories", "Pessaries", "Enemas"].includes(cat)) return "Purchase (Packs/Units)";
                    return "Purchased Qty";
                  })()}
                </label>
                <input
                  id="purchased-qty"
                  required
                  type="number"
                  className="custom-input"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, quantity: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="free-qty">
                  Free / Bonus Qty
                </label>
                <input
                  id="free-qty"
                  type="number"
                  className="custom-input"
                  min="0"
                  value={currentItem.free_quantity}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, free_quantity: e.target.value })
                  }
                />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label htmlFor="unit-cost">
                  {(() => {
                    const cat = currentItem.category;
                    if (["Tablet", "Capsule", "Lozenges"].includes(cat)) return "Rate per Strip (₹)";
                    if (["Syrup", "Suspension", "Solution", "Elixir", "Drops"].includes(cat)) return "Unit Rate/Bottle (₹)";
                    if (["Injection", "IV (Intravenous)", "IM (Intramuscular)", "SC (Subcutaneous)", "Infusion"].includes(cat)) return "Rate per Vial/Ampoule (₹)";
                    if (["Cream", "Ointment", "Gel", "Paste", "Lotion"].includes(cat)) return "Rate per Tube (₹)";
                    if (["Inhaler", "Nebulizer solution", "Aerosol spray"].includes(cat)) return "Rate per Canister (₹)";
                    return "Unit Cost (₹)";
                  })()}
                </label>
                <input
                  id="unit-cost"
                  required
                  type="number"
                  className="custom-input"
                  value={currentItem.purchase_rate}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      purchase_rate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid-cols-2">
              <div className="form-group">
                <label htmlFor="batch-number">Batch Number</label>
                <input
                  id="batch_number"
                  required
                  className="custom-input"
                  placeholder="BT-2026"
                  value={currentItem.batch_number}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      batch_number: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="marked-mrp">MRP (Marked)</label>
                <input
                  id="marked-mrp"
                  required
                  type="number"
                  className="custom-input"
                  value={currentItem.mrp}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, mrp: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid-cols-2" style={{ gap: "1.5rem" }}>
              <div className="form-group">
                <label htmlFor="expiry-date">Expiration Date</label>
                <input
                  id="expiry-date"
                  required
                  type="date"
                  className="custom-input"
                  value={currentItem.expiry_date}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      expiry_date: e.target.value,
                      expiry_months: ""
                    })
                  }
                />
                {currentItem.expiry_date && (
                  <div style={{ fontSize: "0.75rem", marginTop: "4px", color: "var(--primary)", fontWeight: "700" }}>
                    Selected: {(() => {
                      const [y, m, d] = currentItem.expiry_date.split("-");
                      return `${m}-${d}-${y}`;
                    })()}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="validity-months">Validity (In Months)</label>
                <input
                  id="validity-months"
                  type="number"
                  className="custom-input"
                  placeholder="e.g. 24"
                  value={currentItem.expiry_months}
                  onChange={(e) => {
                    const months = e.target.value;
                    const newDate = months ? addMonths(new Date(), months) : "";
                    setCurrentItem({
                      ...currentItem,
                      expiry_months: months,
                      expiry_date: newDate
                    });
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="custom-input"
              style={{
                width: "100%",
                marginTop: "1rem",
                backgroundColor: "#f8fafc",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Receipt size={18} /> Stage to List
            </button>
          </form>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              backgroundColor: "var(--primary-light)",
              borderRadius: "12px",
              display: "flex",
              gap: "12px",
            }}
          >
            <Info size={20} className="text-primary" />
            <p
              style={{
                margin: 0,
                fontSize: "0.7rem",
                color: "var(--primary-hover)",
                lineHeight: "1.4",
              }}
            >
              Stock staging does not update inventory immediately. Use 'Confirm
              Receipt' to finalize ledger updates.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Purchase;

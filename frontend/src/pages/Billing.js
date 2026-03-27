import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  Search,
  Trash2,
  Printer,
  ShoppingCart,
  Calendar,
  Info,
  Plus,
  Minus,
  Tag,
} from "lucide-react";

function Billing() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [quickScan, setQuickScan] = useState(true); // Default ON
  const [billItems, setBillItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bill, setBill] = useState({
    invoice_number: `INV-${Date.now().toString().slice(-6)}`,
    customer_name: "",
    customer_mobile: "",
    doctor_name: "",
    total_items: 0,
    total_quantity: 0,
    gross_amount: 0,
    discount_amount: 0,
    taxable_amount: 0,
    gst_amount: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    round_off: 0,
    net_amount: 0,
    payment_mode: "Cash",
    amount_received: 0,
    status: "Final", // Final, Draft, Hold
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("medicine-search")?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        document.getElementById("customer-search")?.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        createSale("Draft");
      } else if (e.key === "F9") {
        e.preventDefault();
        createSale("Final");
      } else if (e.key === "Escape") {
        setSearchResults([]);
        setSelectedMedicine(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [billItems, bill]); // Added dependencies for shortcuts to work with latest state

  const handleSearch = async (value) => {
    setSearch(value);
    if (value.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await API.get(`medicines/search/?q=${value}`);
      setSearchResults(res.data);

      // Barcode Quick Scan Logic: If exactly one match and quickScan is on
      if (quickScan && res.data.length === 1 && (res.data[0].barcode === value || res.data[0].medicine_code === value)) {
        await autoAddByBarcode(res.data[0]);
      }
    } catch (err) {
      console.error("Search error", err);
    }
  };

  const autoAddByBarcode = async (med) => {
    try {
      const batchRes = await API.get(`inventory/batches/${med.id}/`);
      const availableBatches = batchRes.data.filter(b => b.quantity > 0 && new Date(b.expiry_date) > new Date());

      if (availableBatches.length > 0) {
        // Use the first available batch (usually the one soonest to expire as per backend sorting)
        const batch = availableBatches[0];

        // Use a simplified version of selectBatch logic
        setBillItems(prevItems => {
          const existing = prevItems.find(it => it.medicine_id === med.id && it.batch_number === batch.batch_number);
          if (existing) {
            if (existing.quantity + 1 > batch.quantity) return prevItems;
            return prevItems.map(it => it === existing ? { ...it, quantity: it.quantity + 1 } : it);
          } else {
            return [...prevItems, {
              id: Date.now(),
              medicine_id: med.id,
              medicine_name: med.medicine_name,
              batch: batch.id,
              batch_number: batch.batch_number,
              expiry_date: batch.expiry_date,
              rate: batch.mrp,
              quantity: 1,
              discount_percent: 0,
              gst_percentage: med.gst_percentage || 12,
              available_stock: batch.quantity,
            }];
          }
        });

        setSearch("");
        setSearchResults([]);
      } else {
        alert(`No stock available for scanned item: ${med.medicine_name}`);
      }
    } catch (err) {
      console.error("Auto-add error", err);
    }
  };

  const fetchCustomers = async (query) => {
    try {
      const res = await API.get(`customers/search/?q=${query}`);
      setCustomers(res.data);
    } catch (err) {
      console.error("Error fetching customers", err);
    }
  };

  const showBatches = async (med) => {
    setSelectedMedicine(med);
    try {
      const res = await API.get(`inventory/batches/${med.id}/`);
      setBatches(res.data);
      if (res.data.length === 0) {
        alert("No stock available for this medicine!");
        setSelectedMedicine(null);
      }
    } catch (err) {
      alert("Error fetching batches");
    }
  };

  const selectBatch = (batch) => {
    const existingItem = billItems.find(
      (item) =>
        item.medicine_id === selectedMedicine.id &&
        item.batch_number === batch.batch_number,
    );

    if (existingItem) {
      if (existingItem.quantity + 1 > batch.quantity) {
        alert("Not enough stock in this batch!");
        return;
      }
      setBillItems(
        billItems.map((item) =>
          item.medicine_id === selectedMedicine.id &&
            item.batch_number === batch.batch_number
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setBillItems([
        ...billItems,
        {
          id: Date.now(), // Temporary unique ID for table row
          medicine_id: selectedMedicine.id,
          medicine_name: selectedMedicine.medicine_name,
          batch: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          rate: batch.mrp,
          quantity: 1,
          discount_percent: 0,
          gst_percentage: selectedMedicine.gst_percentage || 12,
          available_stock: batch.quantity,
        },
      ]);
    }

    setSearch("");
    setSearchResults([]);
    setSelectedMedicine(null);
    setBatches([]);
    document.getElementById("medicine-search")?.focus();
  };

  const removeItem = (tempId) => {
    setBillItems(billItems.filter((item) => item.id !== tempId));
  };

  const updateItem = (tempId, field, value) => {
    setBillItems(
      billItems.map((item) => {
        if (item.id === tempId) {
          let newValue = value;
          if (field === "quantity") {
            newValue = parseInt(value) || 0;
            if (newValue > item.available_stock) {
              alert(`Only ${item.available_stock} items available`);
              newValue = item.available_stock;
            }
          }
          if (field === "discount_percent") {
            newValue = parseFloat(value) || 0;
            if (newValue > 100) newValue = 100;
          }
          return { ...item, [field]: newValue };
        }
        return item;
      }),
    );
  };

  useEffect(() => {
    let grossTotal = 0;
    let discTotal = 0;
    let taxableTotal = 0;
    let gstTotal = 0;

    billItems.forEach((item) => {
      const itemGross = item.rate * item.quantity;
      const itemDisc = (itemGross * item.discount_percent) / 100;
      const itemTaxable = itemGross - itemDisc;

      // Reverse GST calculation if the rate is MRP (inclusive)
      // Base = MRP / (1 + GST/100)
      const basePrice = itemTaxable / (1 + item.gst_percentage / 100);
      const itemGst = itemTaxable - basePrice;

      grossTotal += itemGross;
      discTotal += itemDisc;
      taxableTotal += basePrice;
      gstTotal += itemGst;
    });

    const netVal = taxableTotal + gstTotal;
    const roundedNet = Math.round(netVal);
    const roundOffVal = roundedNet - netVal;

    setBill((prev) => ({
      ...prev,
      gross_amount: parseFloat(grossTotal.toFixed(2)),
      discount_amount: parseFloat(discTotal.toFixed(2)),
      taxable_amount: parseFloat(taxableTotal.toFixed(2)),
      gst_amount: parseFloat(gstTotal.toFixed(2)),
      cgst_amount: parseFloat((gstTotal / 2).toFixed(2)),
      sgst_amount: parseFloat((gstTotal / 2).toFixed(2)),
      round_off: parseFloat(roundOffVal.toFixed(2)),
      net_amount: roundedNet,
      total_items: billItems.length,
      total_quantity: billItems.reduce((acc, item) => acc + item.quantity, 0),
      amount_received: roundedNet,
    }));

  }, [billItems]);

  const createSale = async (statusArg = "Final") => {
    if (billItems.length === 0) {
      alert("Please add at least one medicine to generate bill");
      return;
    }
    
    // Auto-status is purely driven by whether a mobile number was provided
    // The backend gracefully handles get_or_create on the mobile.

    try {
      const billData = {
        ...bill,
        status: statusArg,
        items: billItems.map((it) => ({
          medicine: it.medicine_id,
          batch: it.batch,
          batch_number: it.batch_number,
          quantity: it.quantity,
          rate: it.rate,
          discount_percent: it.discount_percent,
          gst_percentage: it.gst_percentage,
          amount: (it.rate * it.quantity * (100 - it.discount_percent)) / 100,
        })),
      };
      const res = await API.post("sales/add/", billData);
      if (statusArg === "Final") {
        navigate("/invoice", { state: { ...billData, id: res.data.id, invoice_number: res.data.invoice_number } });
      } else {
        alert(`Bill saved as ${statusArg}`);
        setBillItems([]);
        setBill(prev => ({ ...prev, invoice_number: `INV-${Date.now().toString().slice(-6)}` }));
      }
    } catch (err) {
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : (err.message || "Unknown error");
      alert("Error generating bill: " + errorDetail);
    }
  };

  const clearBill = () => {
    if (window.confirm("Are you sure you want to clear the entire bill?")) {
      setBillItems([]);
    }
  };

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "var(--primary)", fontWeight: 800 }}>Billing Console</h2>
          <div style={{ display: "flex", gap: "10px", marginTop: "5px", alignItems: "center" }}>
            <span className="shortcut-badge">F2: Search Medicine</span>
            <span className="shortcut-badge">F4: Customer</span>
            <span className="shortcut-badge">F8: Draft</span>
            <span className="shortcut-badge">F9: Print</span>
            <div style={{ marginLeft: "10px", display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "2px 10px", borderRadius: "20px", border: "1px solid var(--border)", fontSize: "0.75rem", fontWeight: "700" }}>
              Quick Scan:
              <label className="switch">
                <input type="checkbox" checked={quickScan} onChange={(e) => setQuickScan(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              padding: "4px 12px",
              borderRadius: "6px",
              backgroundColor: "white",
              border: "1px solid var(--border)",
              fontWeight: "700",
              fontSize: "0.9rem"
            }}
          >
            <Tag size={14} className="text-primary" style={{ marginRight: "6px" }} />
            {bill.invoice_number}
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Date: {new Date().toLocaleDateString()} | Time: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="billing-grid">
        {/* Left Panel: 60% */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Medicine Search Section */}
          <div className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                  size={18}
                />
                <input
                  id="medicine-search"
                  placeholder="Search Medicine (Name / Generic / Barcode)..."
                  className="custom-input"
                  style={{ paddingLeft: "40px" }}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoComplete="off"
                />

                {searchResults.length > 0 && (
                  <div className="search-results-dropdown">
                    {searchResults.map((m) => (
                      <div
                        key={m.id}
                        className="search-item"
                        onClick={() => showBatches(m)}
                      >
                        <div>
                          <div style={{ fontWeight: "700" }}>{m.medicine_name}</div>
                          <div className="info-text">{m.generic_name} | {m.company}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className={`badge ${m.stock_quantity < 10 ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}>
                            Stock: {m.stock_quantity}
                          </span>
                          <div className="info-text">Rack: {m.rack_number || 'N/A'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={`btn-secondary ${quickScan ? 'active' : ''}`}
                title="Toggle Barcode Quick Scan"
                onClick={() => setQuickScan(!quickScan)}
                style={{ backgroundColor: quickScan ? 'var(--primary-light)' : '', color: quickScan ? 'var(--primary)' : '' }}
              >
                <Search size={18} />
              </button>
            </div>
          </div>

          {/* Batch Selection Detail */}
          {selectedMedicine && (
            <div className="card" style={{ border: "2px solid var(--primary)", animation: "fadeIn 0.3s ease" }}>
              <h4 style={{ margin: "0 0 1rem 0" }}>Select Batch: {selectedMedicine.medicine_name}</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>MRP</th>
                      <th>Stock</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: "700" }}>{b.batch_number}</td>
                        <td>
                          <span style={{ color: new Date(b.expiry_date) < new Date() ? 'var(--danger)' : 'inherit' }}>
                            {b.expiry_date}
                          </span>
                        </td>
                        <td style={{ fontWeight: "700" }}>₹{b.mrp}</td>
                        <td>{b.quantity}</td>
                        <td>
                          <button
                            className="btn-primary"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => selectBatch(b)}
                            disabled={b.quantity <= 0 || new Date(b.expiry_date) < new Date()}
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bill Items Table */}
          <div className="table-container" style={{ flex: 1, minHeight: "400px" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>Sr.</th>
                  <th>Medicine Name & Batch</th>
                  <th style={{ width: "100px" }}>Qty</th>
                  <th style={{ width: "90px" }}>Rate</th>
                  <th style={{ width: "80px" }}>Disc%</th>
                  <th style={{ width: "60px" }}>GST%</th>
                  <th style={{ textAlign: "right", width: "100px" }}>Amount</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {billItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
                      <ShoppingCart size={48} style={{ opacity: 0.1, marginBottom: "1rem" }} />
                      <p>Start adding medicines to the bill using search (F2)</p>
                    </td>
                  </tr>
                ) : (
                  billItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: "700" }}>{item.medicine_name}</div>
                        <div className="info-text">
                          Batch: {item.batch_number} | Exp: {item.expiry_date}
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="qty-input"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                          min="1"
                        />
                        <div className="info-text" style={{ textAlign: "center", marginTop: "2px" }}>
                          Avail: {item.available_stock}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>₹{item.rate}</td>
                      <td>
                        <input
                          type="number"
                          className="qty-input"
                          style={{ width: "50px" }}
                          value={item.discount_percent}
                          onChange={(e) => updateItem(item.id, "discount_percent", e.target.value)}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{item.gst_percentage}%</td>
                      <td style={{ textAlign: "right", fontWeight: "800" }}>
                        ₹{((item.rate * item.quantity * (100 - item.discount_percent)) / 100).toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ border: "none", background: "none", color: "var(--danger)", cursor: "pointer" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: 40% */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Customer Section */}
          <div className="card">
            <h4 style={{ margin: "0 0 1rem 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Customer Details
              <button
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                onClick={() => navigate("/customers")}
              >
                <Plus size={12} style={{ marginRight: "4px" }} /> New Customer
              </button>
            </h4>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <label>Customer Mobile</label>
              <input
                id="customer-search"
                type="text"
                className="custom-input"
                placeholder="Enter Mobile Number..."
                value={bill.customer_mobile}
                onChange={async (e) => {
                  const val = e.target.value;
                  setBill(prev => ({ ...prev, customer_mobile: val }));
                  if (val.length === 10) {
                    try {
                      const res = await API.get(`customers/search/?mobile=${val}`);
                      if (res.data && res.data.id) {
                        setBill(prev => ({
                          ...prev,
                          customer_name: res.data.customer_name,
                          doctor_name: res.data.doctor_name || prev.doctor_name
                        }));
                        // Add customer info to state so we can display history
                        setBill(prev => ({ ...prev, _customerInfo: res.data, isNewMatch: false }));
                      } else {
                        if (bill.customer_name === "Walk-in Customer") {
                          setBill(prev => ({ ...prev, customer_name: "" }));
                        }
                        setBill(prev => ({ ...prev, _customerInfo: null, isNewMatch: val.length === 10 }));
                      }
                    } catch (err) {
                      setBill(prev => ({ ...prev, _customerInfo: null, isNewMatch: val.length === 10 }));
                    }
                  } else if (val.length > 0) {
                    setBill(prev => ({ ...prev, _customerInfo: null, isNewMatch: false }));
                  } else if (bill.customer_name === "") {
                    setBill(prev => ({ ...prev, _customerInfo: null, isNewMatch: false }));
                  }
                }}
              />
              {bill._customerInfo && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.8rem', color: '#1e40af' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>✓ <strong>Registered Member Match:</strong></span>
                    <span>Total Bills: <strong>{bill._customerInfo.bill_count || 0}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Outstanding: <strong>₹{bill._customerInfo.outstanding_balance || 0}</strong></span>
                    <span>Total Purchase: <strong>₹{bill._customerInfo.total_purchases || 0}</strong></span>
                  </div>
                </div>
              )}
              {bill.isNewMatch && !bill._customerInfo && (
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '0.8rem', color: '#166534' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>✨ <strong>New Customer:</strong> Will be auto-registered upon checkout.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  list="customer-names"
                  className="custom-input"
                  value={bill.customer_name}
                  placeholder="Walk-in Customer"
                  onChange={(e) => {
                    const val = e.target.value;
                    setBill(prev => ({ ...prev, customer_name: val }));

                    if (val.length > 2) {
                      fetchCustomers(val);
                    }

                    if (val === "") {
                      // Do nothing, let user type
                    }

                    const match = customers.find(c => c.customer_name === val);
                    if (match) {
                      setBill(prev => ({
                        ...prev,
                        customer_mobile: match.mobile,
                        doctor_name: match.doctor_name || prev.doctor_name,
                        _customerInfo: match 
                      }));
                    } else {
                        setBill(prev => ({
                          ...prev,
                          _customerInfo: null
                        }));
                    }
                  }}
                />
                <datalist id="customer-names">
                  {customers.map(c => (
                    <option key={c.id} value={c.customer_name}>
                      {c.mobile}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  className="custom-input"
                  value={bill.doctor_name}
                  onChange={(e) => setBill({ ...bill, doctor_name: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Amount Summary Panel */}
          <div className="card" style={{ backgroundColor: "#fdfdfd" }}>
            <h4 style={{ margin: "0 0 1rem 0" }}>Bill Summary</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div className="summary-item">
                <span>Items / Total Qty</span>
                <span style={{ fontWeight: 600 }}>{bill.total_items} / {bill.total_quantity}</span>
              </div>
              <div className="summary-item">
                <span>Gross Amount</span>
                <span>₹{bill.gross_amount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span style={{ color: "var(--success)", fontWeight: 500 }}>Total Discount</span>
                <span style={{ color: "var(--success)" }}>-₹{bill.discount_amount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Taxable Amount</span>
                <span>₹{bill.taxable_amount.toFixed(2)}</span>
              </div>
              <div className="summary-item" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span>CGST / SGST</span>
                <span>₹{bill.cgst_amount.toFixed(2)} / ₹{bill.sgst_amount.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span>Total GST</span>
                <span>₹{bill.gst_amount.toFixed(2)}</span>
              </div>
              <div className="summary-item" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <span>Round Off</span>
                <span>{bill.round_off >= 0 ? "+" : ""}{bill.round_off.toFixed(2)}</span>
              </div>
              <div className="summary-item total">
                <span>Net Payable</span>
                <span style={{ fontSize: "1.5rem", color: "var(--primary)" }}>₹{bill.net_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Payment Mode</label>
              <select
                className="custom-input"
                value={bill.payment_mode}
                onChange={(e) => setBill({ ...bill, payment_mode: e.target.value })}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR Scan</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="NetBanking">Net Banking</option>
              </select>
            </div>

            <div className="grid-cols-2" style={{ marginTop: "10px" }}>
              <div className="form-group">
                <label>Amount Received</label>
                <input
                  type="number"
                  className="custom-input"
                  style={{ fontWeight: 700, fontSize: "1rem" }}
                  value={bill.amount_received}
                  onChange={(e) => setBill({ ...bill, amount_received: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Balance Return</label>
                <input
                  type="text"
                  className="custom-input"
                  style={{ fontWeight: 700, color: "var(--primary)", backgroundColor: "#f0f9ff" }}
                  readOnly
                  value={`₹${Math.max(0, bill.amount_received - bill.net_amount).toFixed(2)}`}
                />
              </div>
            </div>

            <div className="billing-actions">
              <button
                className="btn-primary btn-xl"
                onClick={() => createSale("Final")}
                disabled={billItems.length === 0}
              >
                <Printer size={20} style={{ marginRight: "10px" }} /> GENERATE & PRINT (F9)
              </button>
              <button className="btn-secondary" onClick={() => createSale("Draft")}>
                Save as Draft (F8)
              </button>
              <button className="btn-warning" onClick={() => createSale("Hold")}>
                Hold Bill
              </button>
              <button
                className="btn-secondary"
                style={{ backgroundColor: "#e2e8f0", color: "#475569" }}
                onClick={() => alert("Generating Print Preview...")}
              >
                Print Preview
              </button>
              <button className="btn-danger" onClick={clearBill}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Billing;

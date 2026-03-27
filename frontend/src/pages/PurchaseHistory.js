import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  ShoppingCart,
  Search,
  Calendar,
  FileText,
  Eye,
  X,
  PackageCheck
} from "lucide-react";

function PurchaseHistory() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await API.get("purchases/");
      setPurchases(res.data);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => {
    const matchSearch = (
      p.purchase_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    let matchDate = true;
    if (dateFrom && dateTo) {
      matchDate = p.invoice_date >= dateFrom && p.invoice_date <= dateTo;
    } else if (dateFrom) {
      matchDate = p.invoice_date >= dateFrom;
    } else if (dateTo) {
      matchDate = p.invoice_date <= dateTo;
    }
    return matchSearch && matchDate;
  });

  return (
    <Layout
      title="Purchase History"
      subtitle="Complete ledger of all past procurements and inventory receipts"
      icon={<ShoppingCart size={24} />}
    >
      {/* Filters */}
      <div className="card" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "250px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="custom-input"
            style={{ paddingLeft: "36px", border: "none" }}
            placeholder="Search PO Code, Invoice No, or Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f8fafc", padding: "4px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <Calendar size={16} style={{ color: "var(--text-muted)" }} />
          <input
            type="date"
            className="custom-input"
            style={{ border: "none", backgroundColor: "transparent", padding: "5px 0", cursor: "pointer" }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>to</span>
          <input
            type="date"
            className="custom-input"
            style={{ border: "none", backgroundColor: "transparent", padding: "5px 0", cursor: "pointer" }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(searchTerm || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearchTerm(""); setDateFrom(""); setDateTo(""); }}
            style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600" }}
          >
            Clear ×
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt Details</th>
                <th>Vendor Info</th>
                <th>Items & Quantities</th>
                <th>Financials</th>
                <th>Payment Status</th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    Loading history...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <FileText size={48} style={{ opacity: 0.1, margin: "0 auto 1rem auto", display: "block" }} />
                    No purchases found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: "700", color: "var(--primary)" }}>{p.purchase_code}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>INV: {p.invoice_number}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "4px" }}>
                        {new Date(p.invoice_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "700" }}>{p.supplier_name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>Supplier Record</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "600" }}>{p.total_items} Unique Items</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.total_quantity} Total Units Stored</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: "800", fontSize: "1rem" }}>₹{parseFloat(p.net_amount).toFixed(2)}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Base: ₹{parseFloat(p.gross_amount).toFixed(2)} | GST: ₹{parseFloat(p.gst_amount).toFixed(2)}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "700",
                        background: p.payment_status === "paid" ? "#dcfce7" : p.payment_status === "partial" ? "#fef3c7" : "#fee2e2",
                        color: p.payment_status === "paid" ? "#166534" : p.payment_status === "partial" ? "#92400e" : "#991b1b"
                      }}>
                        {p.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        onClick={() => setSelectedPurchase(p)}
                        style={{
                          background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 10px",
                          borderRadius: "8px", color: "var(--primary)", cursor: "pointer", display: "inline-flex", gap: "5px", alignItems: "center", fontWeight: "600", fontSize: "0.8rem"
                        }}
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedPurchase && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}><PackageCheck size={20} className="text-primary"/> Purchase Voucher: {selectedPurchase.purchase_code}</h3>
                <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Vendor: {selectedPurchase.supplier_name} • Invoice: {selectedPurchase.invoice_number} ({new Date(selectedPurchase.invoice_date).toLocaleDateString()})
                </p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                style={{ background: "#f1f5f9", border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, backgroundColor: "#f8fafc" }}>
              <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead style={{ backgroundColor: "#f1f5f9" }}>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch & Expiry</th>
                      <th style={{ textAlign: "center" }}>Qty (+Free)</th>
                      <th style={{ textAlign: "right" }}>Cost (₹)</th>
                      <th style={{ textAlign: "right" }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items && selectedPurchase.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600" }}>{it.medicine_name}</td>
                        <td>
                          <div style={{ fontSize: "0.8rem", fontWeight: "700" }}>{it.batch_number}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{it.expiry_date}</div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ fontWeight: "800" }}>{it.quantity}</span>
                          {it.free_quantity > 0 && <span style={{ color: "#10b981", fontSize: "0.8rem", marginLeft: "4px" }}>(+{it.free_quantity})</span>}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.85rem" }}>
                          {parseFloat(it.purchase_rate).toFixed(2)}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MRP: {parseFloat(it.mrp).toFixed(2)}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700" }}>
                          {parseFloat(it.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
				  <tfoot>
				    <tr>
					  <td colSpan="4" style={{textAlign: "right", fontWeight: "700", paddingTop: "1rem"}}>Net Total Amount:</td>
					  <td style={{textAlign: "right", fontWeight: "900", fontSize: "1.1rem", color: "var(--primary)", paddingTop: "1rem"}}>₹{parseFloat(selectedPurchase.net_amount).toFixed(2)}</td>
					</tr>
				  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default PurchaseHistory;

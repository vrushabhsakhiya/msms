import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import {
  ShoppingCart,
  Search,
  Calendar,
  FileText,
  Eye,
  X,
  PackageCheck,
  Download,
  Printer
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
      const res = await API.get(API_ENDPOINTS.purchases.list);
      setPurchases(res.data);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (purchases.length === 0) return;

    let csv = "Purchase History Report\n";
    // Sync headers with Table UI
    csv += "PO Code,Invoice Number,Date,Supplier,Unique Items,Total Units,Net Amount(₹),Base Amount(₹),GST Amount(₹),Status\n";

    filteredPurchases.forEach(p => {
      csv += `"${p.purchase_code}","${p.invoice_number}","${p.invoice_date}","${p.supplier_name}",${p.total_items},${p.total_quantity},${p.net_amount},${p.gross_amount},${p.gst_amount},"${p.payment_status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Purchase_History_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "1.5rem" }}>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={18} /> Print PDF
        </button>
        <button className="btn-primary" style={{ backgroundColor: "#065f46" }} onClick={downloadCSV}>
          <Download size={18} /> Export CSV
        </button>
      </div>
      {/* Filters */}
      <div className="card no-print" style={{ padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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
      <div className="card print-content" style={{ padding: 0, overflow: "hidden" }}>
        <style>{`
          @media print {
            /* Hide EVERYTHING except the table area */
            .sidebar, .navbar, .no-print, .layout-header, header, footer, 
            aside, nav, .user-profile, .btn-secondary, .btn-primary,
            [class*="header"], [class*="sidebar"], [class*="navbar"] { 
              display: none !important; 
            }
            
            /* Remove margins and expand to full width */
            .layout-content, .main-content, .table-container, .card.print-content, .layout-main {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              overflow: visible !important;
              height: auto !important;
              background-color: white !important;
              position: static !important;
            }
            
            /* Clean up table for PDF */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
            }
            
            /* Hide Actions column in Print (Column 5) */
            th:nth-child(5), td:nth-child(5) {
              display: none !important;
            }
            
            th, td {
              border: 1px solid #cbd5e1 !important;
              padding: 12px 8px !important;
              font-size: 11px !important;
              word-wrap: break-word !important;
              overflow: visible !important;
            }
            
            body {
              background: white !important;
              min-width: 100% !important;
              margin: 0 !important;
            }
          }
        `}</style>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt Details</th>
                <th>Vendor Info</th>
                <th>Items & Quantities</th>
                <th>Financials</th>
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
                      <div style={{ fontWeight: "800", fontSize: "1rem" }}>₹{Number.parseFloat(p.net_amount).toFixed(2)}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Base: ₹{Number.parseFloat(p.gross_amount).toFixed(2)} | GST: ₹{Number.parseFloat(p.gst_amount).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                        <button
                          onClick={() => setSelectedPurchase(p)}
                          style={{
                            background: "#eff6ff", border: "1px solid #bfdbfe", padding: "6px 10px",
                            borderRadius: "8px", color: "var(--primary)", cursor: "pointer", display: "inline-flex", gap: "5px", alignItems: "center", fontWeight: "600", fontSize: "0.8rem"
                          }}
                        >
                          <Eye size={16} /> View
                        </button>
                        {p.payment_status?.toLowerCase() !== "paid" && (
                          <button
                            onClick={async () => {
                              if (window.confirm("Mark this invoice as Paid? This will update your ledger.")) {
                                try {
                                  await API.patch(API_ENDPOINTS.purchases.update(p.id), { payment_status: "paid" });
                                  fetchPurchases();
                                } catch (err) {
                                  alert("Failed to update status");
                                }
                              }
                            }}
                            style={{
                              background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px",
                              borderRadius: "8px", color: "#166534", cursor: "pointer", display: "inline-flex", gap: "5px", alignItems: "center", fontWeight: "600", fontSize: "0.8rem"
                            }}
                          >
                            <PackageCheck size={16} /> Mark Paid
                          </button>
                        )}
                      </div>
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
                    {selectedPurchase?.items?.map((it, idx) => (
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
                          {Number.parseFloat(it.purchase_rate).toFixed(2)}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MRP: {Number.parseFloat(it.mrp).toFixed(2)}</div>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "700" }}>
                          {Number.parseFloat(it.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
				  <tfoot>
				    <tr>
					  <td colSpan="4" style={{textAlign: "right", fontWeight: "700", paddingTop: "1rem"}}>Net Total Amount:</td>
					  <td style={{textAlign: "right", fontWeight: "900", fontSize: "1.1rem", color: "var(--primary)", paddingTop: "1rem"}}>₹{Number.parseFloat(selectedPurchase.net_amount).toFixed(2)}</td>
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

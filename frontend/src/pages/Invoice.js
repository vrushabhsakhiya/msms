import { useLocation, useNavigate } from "react-router-dom";
import { Printer, ArrowLeft, Pill, CheckCircle, Smartphone, MapPin, Mail, Globe, MessageSquare, Send } from "lucide-react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";

function Invoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const bill = location.state;

  if (!bill) {
    return (
      <div style={{ padding: "100px", textAlign: "center" }}>
        <h2>No bill data found.</h2>
        <button className="btn-primary" onClick={() => navigate("/billing")}>
          Back to Billing
        </button>
      </div>
    );
  }

  // Helper to convert number to words (simple version)
  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convert = (n) => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
      return '';
    };

    if (num === 0) return 'Zero';
    let res = "";
    if (num >= 1000) {
      res += convert(Math.floor(num / 1000)) + " Thousand ";
      num %= 1000;
    }
    res += convert(num);
    return res + " Only";
  };

  const sendNotification = async (method) => {
    if (!bill.customer_mobile) {
      alert("No customer mobile number provided!");
      return;
    }
    try {
      const res = await API.post(API_ENDPOINTS.sales.sendEInvoice(bill.id), { method });
      alert(res.data.message);
    } catch (err) {
      alert("Error sending notification: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  return (
    <div
      style={{
        padding: "40px 20px",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      <div
        id="invoice-print-area"
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "2.5rem",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Header: Store Info & Logo */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--primary)", marginBottom: "8px" }}>
              <Pill size={32} />
              <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "900", letterSpacing: "-0.5px" }}>
                HEALTHCARE PHARMA
              </h1>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: "1.5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={12} /> 123 Wellness Ave, Medical District, City - 400001
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Smartphone size={12} /> +91 98765 43210 | <Mail size={12} /> contact@healthcarepharma.com
              </div>
              <div style={{ fontWeight: "700", marginTop: "4px", color: "#475569" }}>
                GSTIN: 27AAAAA0000A1Z5
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "1.5rem", fontWeight: "800" }}>TAX INVOICE</h2>
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>Invoice No: <span style={{ color: "#1e293b", fontWeight: "700" }}>{bill.invoice_number}</span></div>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>Date: <span style={{ color: "#1e293b", fontWeight: "700" }}>{new Date().toLocaleDateString()}</span></div>
              <div style={{ fontSize: "0.9rem", color: "#64748b" }}>Time: <span style={{ color: "#1e293b", fontWeight: "700" }}>{new Date().toLocaleTimeString()}</span></div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", padding: "1.5rem", backgroundColor: "#f8fafc", borderRadius: "8px", marginBottom: "2rem" }}>
          <div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8" }}>Customer Details</h4>
            <div style={{ fontWeight: "700", fontSize: "1.1rem" }}>{bill.customer_name}</div>
            <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Mo: {bill.customer_mobile || "N/A"}</div>
            {bill.doctor_name && <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Dr: {bill.doctor_name}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8" }}>Payment Status</h4>
            <div style={{ fontWeight: "700", fontSize: "1.1rem", color: "#10b981" }}>{bill.payment_mode.toUpperCase()}</div>
            <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Status: {bill.status || "Paid"}</div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#1e293b", color: "white" }}>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem" }}>#</th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem" }}>Medicine Description</th>
              <th style={{ padding: "12px", textAlign: "left", fontSize: "0.85rem" }}>Batch</th>
              <th style={{ padding: "12px", textAlign: "center", fontSize: "0.85rem" }}>Qty</th>
              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem" }}>MRP</th>
              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem" }}>Disc%</th>
              <th style={{ padding: "12px", textAlign: "right", fontSize: "0.85rem" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px", fontSize: "0.9rem" }}>{i + 1}</td>
                <td style={{ padding: "12px", fontWeight: "600", fontSize: "0.9rem" }}>{item.medicine_name}</td>
                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#64748b" }}>{item.batch_number}</td>
                <td style={{ padding: "12px", textAlign: "center", fontSize: "0.9rem" }}>{item.quantity}</td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: "0.9rem" }}>{parseFloat(item.rate).toFixed(2)}</td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: "0.9rem" }}>{item.discount_percent}%</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: "700", fontSize: "0.9rem" }}>
                  {((item.rate * item.quantity * (100 - item.discount_percent)) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary and Tax Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
          <div>
            <div style={{ padding: "1rem", border: "1px dashed #e2e8f0", borderRadius: "8px", height: "fit-content" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8" }}>Amount in Words</h4>
              <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>
                {numberToWords(Math.round(bill.net_amount))}
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8" }}>Terms & Conditions</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "0.7rem", color: "#94a3b8", lineHeight: "1.5" }}>
                <li>• Medicines once sold will not be taken back or exchanged.</li>
                <li>• Please consult a doctor before using any medicine.</li>
                <li>• Subject to local jurisdiction.</li>
              </ul>
            </div>
          </div>

          <div style={{ backgroundColor: "#f8fafc", padding: "1.5rem", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
              <span color="#64748b">Gross Amount:</span>
              <span>₹{parseFloat(bill.gross_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem", color: "#10b981" }}>
              <span>Total Discount:</span>
              <span>-₹{parseFloat(bill.discount_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
              <span>Taxable Subtotal:</span>
              <span>₹{parseFloat(bill.taxable_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.8rem", color: "#64748b" }}>
              <span>CGST:</span>
              <span>₹{parseFloat(bill.cgst_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.8rem", color: "#64748b" }}>
              <span>SGST:</span>
              <span>₹{parseFloat(bill.sgst_amount).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
              <span>Round Off:</span>
              <span>{bill.round_off >= 0 ? "+" : ""}{parseFloat(bill.round_off).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "2px solid #1e293b" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: "800" }}>Net Payable:</span>
              <span style={{ fontSize: "1.25rem", fontWeight: "900", color: "var(--primary)" }}>₹{parseFloat(bill.net_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "3rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "60px" }}></div>
            <div style={{ borderTop: "1px solid #e2e8f0", width: "150px", padding: "8px", fontSize: "0.8rem", color: "#64748b" }}>
              Customer's Signature
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ height: "60px", color: "rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" }}>
              Seal & Signature
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", width: "200px", padding: "8px", fontSize: "0.8rem", fontWeight: "700" }}>
              For HEALTHCARE PHARMA
            </div>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ maxWidth: "850px", margin: "2rem auto 0", display: "flex", justifyContent: "space-between", gap: "10px" }}>
        <button onClick={() => navigate("/billing")} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowLeft size={18} /> Back to Billing
        </button>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => sendNotification("whatsapp")}
            className="btn-success"
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#25D366" }}
          >
            <MessageSquare size={18} /> Send WhatsApp
          </button>
          <button
            onClick={() => sendNotification("sms")}
            className="btn-info"
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "#0ea5e9", color: "white" }}
          >
            <Send size={18} /> Send SMS
          </button>
          <button onClick={() => window.print()} className="btn-primary" style={{ padding: "0.75rem 2.5rem", fontSize: "1rem" }}>
            <Printer size={20} style={{ marginRight: "10px" }} /> Print Invoice
          </button>
        </div>
      </div>

      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            body { padding: 0 !important; margin: 0 !important; background-color: white !important; }
            #invoice-print-area { box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; padding: 0 !important; }
            .main-content { margin-left: 0 !important; padding: 0 !important; }
          }
        `}
      </style>
    </div>
  );
}

export default Invoice;

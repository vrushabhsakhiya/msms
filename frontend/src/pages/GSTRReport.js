import { useEffect, useState } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import Layout from "../components/Layout";
import { Download, Printer, Calendar, BadgePercent, Receipt } from "lucide-react";

function GSTRReport() {
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First of current month
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await API.get(API_ENDPOINTS.sales.gstr1(filters));
        setReport(res.data);
      } catch (err) {
        console.error("Error fetching GSTR1", err);
      }
    };

    fetchReport();
  }, [filters]);

  const exportCSV = () => {
    if (!report) return;

    let csv = "GSTR-1 Sales Report Breakdown\n";
    csv += `Period: ${filters.start_date} to ${filters.end_date}\n\n`;
    
    // Slab Table Headers
    csv += "GST Rate,Taxable Amount,CGST,SGST,Total GST,Gross Total\n";
    
    // Slab Rows
    report.slabs.forEach(slab => {
      csv += `"${slab.gst_rate}","${slab.taxable_value}","${slab.cgst}","${slab.sgst}","${slab.total_gst}","${slab.total_amount}"\n`;
    });

    // Grand Totals at the bottom
    csv += "\nGrand Totals\n";
    csv += `Taxable Value,${report.total.taxable}\n`;
    csv += `Total Output GST,${report.total.gst}\n`;
    csv += `Total CGST,${report.total.gst / 2}\n`;
    csv += `Total SGST,${report.total.gst / 2}\n`;
    csv += `TOTAL INVOICE VALUE,${report.total.amount}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GSTR1_Report_${filters.start_date}_to_${filters.end_date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Receipt size={32} className="text-primary" /> GSTR-1 Sales Report
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Government compliant GST sales tax breakdown by slabs</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
          <button className="btn-primary" style={{ backgroundColor: "#065f46" }} onClick={exportCSV}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card no-print" style={{ marginBottom: "2rem", padding: "1.2rem", display: "flex", alignItems: "center", gap: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Calendar size={20} className="text-muted" />
          <input type="date" className="custom-input" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          <span>to</span>
          <input type="date" className="custom-input" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
      </div>

      {report && (
        <div className="print-area">
          <style>{`
            @media print {
              .no-print, .sidebar, .navbar, .layout-header, header, footer, .btn-primary, .btn-secondary {
                display: none !important;
              }
              .layout-content, .main-content, .print-area {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                overflow: visible !important;
              }
              .card {
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
                margin-bottom: 1rem !important;
                overflow: visible !important;
                height: auto !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              th, td {
                border: 1px solid #cbd5e1 !important;
                padding: 8px !important;
                font-size: 11px !important;
              }
              body {
                background: white !important;
              }
            }
          `}</style>
          {/* GST Summary Hub */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="card" style={{ backgroundColor: "#f8fafc" }}>
              <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: "700", marginBottom: "5px" }}>TAXABLE VALUE</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>₹{report.total.taxable.toLocaleString()}</div>
            </div>
            <div className="card" style={{ backgroundColor: "#eff6ff" }}>
              <div style={{ color: "#3b82f6", fontSize: "0.8rem", fontWeight: "700", marginBottom: "5px" }}>TOTAL OUTPUT GST</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#2563eb" }}>₹{report.total.gst.toLocaleString()}</div>
              <div style={{ fontSize: "0.7rem", color: "#60a5fa", marginTop: "5px" }}>CGST: {report.total.gst / 2} | SGST: {report.total.gst / 2}</div>
            </div>
            <div className="card" style={{ backgroundColor: "#f0fdf4" }}>
              <div style={{ color: "#16a34a", fontSize: "0.8rem", fontWeight: "700", marginBottom: "5px" }}>TOTAL INVOICE VALUE</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#16a34a" }}>₹{report.total.amount.toLocaleString()}</div>
            </div>
          </div>

          {/* Slab-wise Table */}
          <div className="card">
            <h3 style={{ margin: "0 0 1.5rem 0" }}>Slab-wise Breakdown</h3>
            <table className="table">
              <thead style={{ backgroundColor: "#f8fafc" }}>
                <tr>
                  <th>GST Rate</th>
                  <th style={{ textAlign: "right" }}>Taxable Amount</th>
                  <th style={{ textAlign: "right" }}>CGST</th>
                  <th style={{ textAlign: "right" }}>SGST</th>
                  <th style={{ textAlign: "right" }}>Total GST</th>
                  <th style={{ textAlign: "right" }}>Gross Total</th>
                </tr>
              </thead>
              <tbody>
                {report.slabs.map((slab, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: "800" }}><BadgePercent size={14} style={{ marginRight: "5px" }} /> {slab.gst_rate}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.taxable_value.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.cgst.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.sgst.toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: "700" }}>₹{slab.total_gst.toLocaleString()}</td>
                    <td style={{ textAlign: "right", fontWeight: "800" }}>₹{slab.total_amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ backgroundColor: "#f1f5f9", fontWeight: "900" }}>
                <tr>
                  <td>Grand Total</td>
                  <td style={{ textAlign: "right" }}>₹{report.total.taxable.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>₹{(report.total.gst / 2).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>₹{(report.total.gst / 2).toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>₹{report.total.gst.toLocaleString()}</td>
                  <td style={{ textAlign: "right" }}>₹{report.total.amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
      )}
    </Layout>
  );
}

export default GSTRReport;

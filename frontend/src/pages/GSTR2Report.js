import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { FileText, Download, Printer, Calendar, ShieldCheck } from "lucide-react";

function GSTR2Report() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await API.get(`purchases/gstr2/?start_date=${filters.start_date}&end_date=${filters.end_date}`);
      setReport(res.data);
    } catch (err) {
      console.error("Error fetching GSTR2", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filters]);

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "800", fontSize: "2rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={32} className="text-secondary" /> GSTR-2 Purchase Report
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Track Input Tax Credit (ITC) from supplier procurement</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print
          </button>
          <button className="btn-primary" style={{ backgroundColor: "#065f46" }}>
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="card" style={{ marginBottom: "2rem", padding: "1.2rem", display: "flex", alignItems: "center", gap: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Calendar size={20} className="text-muted" />
          <input type="date" className="custom-input" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
          <span>to</span>
          <input type="date" className="custom-input" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
        </div>
      </div>

      {report && (
        <>
          {/* GST Summary Hub */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
            <div className="card" style={{ backgroundColor: "#f8fafc", borderLeft: "5px solid #64748b" }}>
              <div style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: "700", marginBottom: "5px" }}>TOTAL PURCHASE VALUE (TAXABLE)</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>₹{report.total.taxable.toLocaleString()}</div>
            </div>
            <div className="card" style={{ backgroundColor: "#fffbeb", borderLeft: "5px solid #f59e0b" }}>
              <div style={{ color: "#d97706", fontSize: "0.8rem", fontWeight: "700", marginBottom: "5px" }}>ELIGIBLE INPUT TAX CREDIT (ITC)</div>
              <div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#d97706" }}>₹{report.total.gst.toLocaleString()}</div>
              <div style={{ fontSize: "0.7rem", color: "#fbbf24", marginTop: "5px" }}>CGST: {report.total.gst / 2} | SGST: {report.total.gst / 2}</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ margin: "0 0 1.5rem 0" }}>Purchase GST Analysis</h3>
            <table className="table">
              <thead style={{ backgroundColor: "#f8fafc" }}>
                <tr>
                  <th>GST Rate</th>
                  <th style={{ textAlign: "right" }}>Base Purchase Value</th>
                  <th style={{ textAlign: "right" }}>CGST Input</th>
                  <th style={{ textAlign: "right" }}>SGST Input</th>
                  <th style={{ textAlign: "right" }}>Total Tax Credit</th>
                  <th style={{ textAlign: "right" }}>Gross Pay to Supplier</th>
                </tr>
              </thead>
              <tbody>
                {report.slabs.map((slab, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: "800" }}>{slab.gst_rate}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.taxable_value.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.cgst.toLocaleString()}</td>
                    <td style={{ textAlign: "right" }}>₹{slab.sgst.toLocaleString()}</td>
                    <td style={{ textAlign: "right", color: "#d97706", fontWeight: "700" }}>₹{slab.total_gst.toLocaleString()}</td>
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

          <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "10px", color: "#64748b", fontSize: "0.85rem" }}>
            <ShieldCheck size={18} className="text-success" />
            <span>These values are calculated based on recorded purchases. Ensure all supplier invoices are entered correctly for accurate ITC filings.</span>
          </div>
        </>
      )}
    </Layout>
  );
}

export default GSTR2Report;

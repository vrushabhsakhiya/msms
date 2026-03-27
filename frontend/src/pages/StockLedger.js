import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  User,
  Tag,
  Clock,
} from "lucide-react";

function StockLedger() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const res = await API.get("inventory/ledger/");
      setLedger(res.data);
    } catch (err) {
      console.error("Error fetching ledger", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLedger = ledger.filter(
    (item) =>
      item.medicine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              padding: "12px",
              borderRadius: "14px",
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
            }}
          >
            <History size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800" }}>
              Audit Ledger
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.95rem",
              }}
            >
              Blockchain-style immutable record of every tablet that enters or
              leaves the store
            </p>
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{ marginBottom: "1.5rem", padding: "0.75rem" }}
      >
        <div style={{ position: "relative" }}>
          <Search
            style={{
              position: "absolute",
              left: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
            size={20}
          />
          <input
            className="custom-input"
            placeholder="Audit scan: type medicine name, batch number, or invoice ID..."
            style={{ border: "none", paddingLeft: "50px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Medication Detail</th>
              <th>Identity</th>
              <th>Action Type</th>
              <th>Flow Qty</th>
              <th>Reference Doc</th>
              <th>Officer</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", padding: "5rem" }}
                >
                  Synthesizing movement history...
                </td>
              </tr>
            ) : filteredLedger.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign: "center",
                    padding: "5rem",
                    color: "var(--text-muted)",
                  }}
                >
                  No ledger entries found for the current query.
                </td>
              </tr>
            ) : (
              filteredLedger.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Clock size={14} />{" "}
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{ fontWeight: "800", color: "var(--bg-sidebar)" }}
                    >
                      {item.medicine_name}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Tag size={12} className="text-muted" />
                      <span style={{ fontSize: "0.75rem", fontWeight: "700" }}>
                        {item.batch_number}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: "800",
                        fontSize: "0.75rem",
                        color:
                          item.movement_type === "IN"
                            ? "var(--success)"
                            : "var(--danger)",
                        backgroundColor:
                          item.movement_type === "IN" ? "#ecfdf5" : "#fff1f2",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        width: "fit-content",
                      }}
                    >
                      {item.movement_type === "IN" ? (
                        <ArrowDownLeft size={14} />
                      ) : (
                        <ArrowUpRight size={14} />
                      )}
                      {item.movement_type === "IN" ? "INWARD" : "OUTWARD"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "1.1rem", fontWeight: "900" }}>
                      {item.quantity}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--primary)",
                        fontWeight: "700",
                        fontSize: "0.85rem",
                      }}
                    >
                      <FileText size={14} /> {item.reference_id}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                      }}
                    >
                      <User size={14} className="text-muted" /> {item.user_name}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

export default StockLedger;

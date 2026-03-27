import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { AlertTriangle, Calendar, Package } from "lucide-react";

function ExpiryAlert() {
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await API.get("inventory/expiry-alert/");
      setMedicines(res.data);
    } catch (err) {
      console.error("Error loading expiry alerts", err);
    }
  };

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <AlertTriangle className="text-danger" style={{ color: "#ef4444" }} />
          Expiry Alerts
        </h2>
        <div
          className="card"
          style={{
            padding: "0.5rem 1rem",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            border: "1px solid #fee2e2",
            backgroundColor: "#fef2f2",
          }}
        >
          <AlertTriangle size={18} style={{ color: "#ef4444" }} />
          <span style={{ color: "#991b1b", fontWeight: "600" }}>
            {medicines.length} Medicines Near Expiry
          </span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-container" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Manufacturer</th>
                <th>Expiry Date</th>
                <th>Remaining Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {medicines.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Package
                      size={48}
                      style={{ opacity: 0.1, marginBottom: "1rem" }}
                    />
                    <p>Great! No medicines are nearing expiry.</p>
                  </td>
                </tr>
              ) : (
                medicines.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: "600" }}>{m.medicine_name}</td>
                    <td>{m.company}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          color: "#991b1b",
                          fontWeight: "500",
                        }}
                      >
                        <Calendar size={14} />
                        {m.expiry_date}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: "700",
                          color: m.stock_quantity < 10 ? "#ef4444" : "inherit",
                        }}
                      >
                        {m.stock_quantity}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{
                          padding: "0.4rem 0.8rem",
                          fontSize: "0.75rem",
                          backgroundColor: "#ef4444",
                        }}
                      >
                        Clearance Sale
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

export default ExpiryAlert;

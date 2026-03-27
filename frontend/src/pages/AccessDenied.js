import { useNavigate } from "react-router-dom";
import { ShieldOff, ArrowLeft } from "lucide-react";

/**
 * Shown when a user tries to navigate to a route their role cannot access.
 * Per audit/2. User Roles & Permissions spec.
 */
function AccessDenied() {
    const navigate = useNavigate();
    const role = (localStorage.getItem("role") || "staff").toLowerCase();

    const roleLabel = { admin: "Administrator", pharmacist: "Pharmacist", staff: "Staff" }[role] || role;

    const roleGuide = {
        admin: "You have full access. If you see this, please contact support.",
        pharmacist: "Pharmacist access: Medicines, Inventory, Expiry Alerts, view Suppliers/Purchases.",
        staff: "Staff access: Dashboard, Billing, Medicines (view), Customers, Payments.",
    };

    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)",
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                background: "white", borderRadius: "20px", padding: "3rem",
                maxWidth: "480px", width: "90%", textAlign: "center",
                boxShadow: "0 20px 60px -10px rgba(0,0,0,0.12)",
                border: "1px solid #fecaca",
            }}>
                {/* Icon */}
                <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: "#fee2e2", display: "flex", alignItems: "center",
                    justifyContent: "center", margin: "0 auto 1.5rem",
                }}>
                    <ShieldOff size={36} style={{ color: "#dc2626" }} />
                </div>

                {/* Title */}
                <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.6rem", color: "#1e293b" }}>
                    Access Denied
                </h1>
                <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.95rem" }}>
                    Your role <strong style={{ color: "#dc2626" }}>({roleLabel})</strong> does not have
                    permission to view this page.
                </p>

                {/* Role guide */}
                <div style={{
                    background: "#f8fafc", borderRadius: "12px", padding: "1rem",
                    border: "1px solid #e2e8f0", marginBottom: "2rem", textAlign: "left",
                }}>
                    <p style={{ margin: "0 0 0.4rem", fontWeight: "700", fontSize: "0.85rem", color: "#374151" }}>
                        Your access level:
                    </p>
                    <p style={{ margin: 0, fontSize: "0.84rem", color: "#6b7280", lineHeight: 1.6 }}>
                        {roleGuide[role] || "Please contact your administrator."}
                    </p>
                </div>

                <button
                    onClick={() => navigate("/dashboard")}
                    style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        padding: "0.75rem 1.5rem", borderRadius: "12px",
                        background: "#1e40af", color: "white", border: "none",
                        cursor: "pointer", fontWeight: "700", fontSize: "0.95rem",
                    }}
                >
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
        </div>
    );
}

export default AccessDenied;

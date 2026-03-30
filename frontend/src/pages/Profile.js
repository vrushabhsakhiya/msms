import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Shield, Mail, Key, Store } from "lucide-react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";

function Profile() {
    const userName = localStorage.getItem("user") || "AdminUser";
    const userRole = localStorage.getItem("role") || "staff";
    const userEmail = localStorage.getItem("email") || "user@example.com";
    const shopName = localStorage.getItem("shop_name") || "Pharmly";
    const [ownerName, setOwnerName] = useState("Loading...");

    useEffect(() => {
        // Fetch users and find the admin to get owner loosely if not directly available
        // Or better, fetch shop details if an endpoint exists. For now, try fetching users.
        const fetchShopInfo = async () => {
            try {
                const res = await API.get(API_ENDPOINTS.auth.users);
                const adminUser = res.data.find(u => u.role === 'admin');
                if (adminUser) setOwnerName(adminUser.full_name || adminUser.username);
                else setOwnerName("System Admin");
            } catch (err) {
                setOwnerName("Registered Owner");
            }
        };
        fetchShopInfo();
    }, []);

    return (
        <Layout title="My Profile" subtitle="Manage your account details and security.">
            <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>

                {/* Profile Header Block */}
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", backgroundColor: "#e2e8f0", flexShrink: 0 }}>
                        <img
                            src={`https://ui-avatars.com/api/?name=${userName}&background=e2e8f0&color=0f172a&bold=true&size=150`}
                            alt="User Badge"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", color: "#1e293b" }}>{userName}</h2>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "4px 0 0 0", color: "#64748b", fontWeight: "600", fontSize: "0.9rem" }}>
                            <Mail size={14} /> {userEmail}
                        </div>
                        <span style={{ display: "inline-block", marginTop: "10px", padding: "4px 10px", backgroundColor: "var(--primary)", color: "white", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", borderRadius: "12px", letterSpacing: "1px" }}>
                            {userRole}
                        </span>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* Organization Block */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ backgroundColor: "#e0f2fe", padding: "8px", borderRadius: "8px", color: "#0284c7" }}>
                            <Store size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: "700" }}>Organization</h4>
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                                You are a registered member under Medical Store: <strong style={{ color: "#334155" }}>{shopName}</strong>.<br />
                                Store Owner: <strong style={{ color: "#334155" }}>{ownerName}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Role Block */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ backgroundColor: "#e2e8f0", padding: "8px", borderRadius: "8px" }}><Shield size={20} color="#334155" /></div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: "700" }}>Your Role & Access</h4>
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                                You are assigned the <strong style={{ textTransform: "uppercase", color: "var(--primary)" }}>{userRole}</strong> role.
                                {userRole === 'admin'
                                    ? " You have full, unrestricted access to all modules and configurations."
                                    : userRole === 'pharmacist'
                                        ? " You have access to Inventory, Billing, and Alerts, but cannot manage users or settings."
                                        : " You have restricted access to Billing and Customers only."}
                            </p>
                        </div>
                    </div>

                    {/* Security Block */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ backgroundColor: "#fee2e2", padding: "8px", borderRadius: "8px", color: "#dc2626" }}><Key size={20} /></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: "700" }}>Password & Security</h4>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Two-Factor Authentication (OTP) is actively protecting your account.</p>
                                </div>
                                <button className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", background: "white", color: "#dc2626", border: "1px solid #fca5a5" }}>Change Password</button>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </Layout>
    );
}

export default Profile;

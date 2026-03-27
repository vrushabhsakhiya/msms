import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Settings as SettingsIcon, Store, Bell, Palette, CheckCircle2 } from "lucide-react";
import API from "../services/api";
import toast, { Toaster } from "react-hot-toast";

function Settings() {
    const [activeTab, setActiveTab] = useState("pharmacy");
    const [loading, setLoading] = useState(false);
    const [shopInfo, setShopInfo] = useState({
        name: localStorage.getItem("shop_name") || "",
        gst_number: "27AADCB2230M1Z2",
        print_header: "Thank you for choosing us!",
        address: ""
    });

    const isAdmin = (localStorage.getItem("role") || "").toLowerCase() === "admin";

    const handleSave = async () => {
        setLoading(true);
        try {
            // Placeholder: In a real app, we'd have a specific endpoint for shop settings
            // For now, we simulate success and update localStorage if name changed
            localStorage.setItem("shop_name", shopInfo.name);
            toast.success("Settings updated successfully!", { icon: <CheckCircle2 size={20} color="#10b981" /> });
        } catch (err) {
            toast.error("Failed to update settings.");
        } finally {
            setLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "pharmacy":
                return (
                    <>
                        <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem", color: "#1e293b", fontWeight: "700" }}>Pharmacy Configuration</h3>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>Shop Name</label>
                            <input
                                type="text"
                                className="custom-input"
                                value={shopInfo.name}
                                onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                                readOnly={!isAdmin}
                                style={{ backgroundColor: !isAdmin ? "#f8fafc" : "#fff" }}
                            />
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
                                {isAdmin ? "Specify the official name of your pharmacy." : "Only admins can change the registered shop name."}
                            </p>
                        </div>

                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>GST Number</label>
                            <input
                                type="text"
                                className="custom-input"
                                value={shopInfo.gst_number}
                                onChange={(e) => setShopInfo({ ...shopInfo, gst_number: e.target.value.toUpperCase() })}
                                placeholder="Enter GST Number"
                            />
                        </div>

                        <div style={{ marginBottom: "2rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem", color: "#475569" }}>Invoice Header / Print Text</label>
                            <textarea
                                className="custom-input"
                                rows="3"
                                style={{ height: "auto", padding: "10px" }}
                                value={shopInfo.print_header}
                                onChange={(e) => setShopInfo({ ...shopInfo, print_header: e.target.value })}
                                placeholder="Thank you for shopping!"
                            ></textarea>
                            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>This text appears at the bottom of printed invoices.</p>
                        </div>

                        <button
                            className="btn-primary"
                            style={{ padding: "0.75rem 2rem", borderRadius: "10px", fontWeight: "700" }}
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save Configuration"}
                        </button>
                    </>
                );
            case "appearance":
                return (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                        <Palette size={48} color="#94a3b8" style={{ marginBottom: "1rem" }} />
                        <h4 style={{ color: "#1e293b", margin: "0 0 0.5rem 0" }}>Theme Customization</h4>
                        <p style={{ color: "#64748b", margin: 0 }}>Visual theme and dark mode settings will be available in the next update.</p>
                    </div>
                );
            case "notifications":
                return (
                    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                        <Bell size={48} color="#94a3b8" style={{ marginBottom: "1rem" }} />
                        <h4 style={{ color: "#1e293b", margin: "0 0 0.5rem 0" }}>Alert Preferences</h4>
                        <p style={{ color: "#64748b", margin: 0 }}>Configure WhatsApp and Email alert triggers here.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <Layout title="Settings" subtitle="Manage your pharmacy identity and application preferences.">
            <Toaster position="top-right" />
            <div className="card" style={{ padding: "0", maxWidth: "900px", margin: "0 auto", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", minHeight: "500px" }}>
                    {/* Settings Sidebar */}
                    <div style={{ width: "240px", backgroundColor: "#f8fafc", borderRight: "1px solid #e2e8f0", padding: "1.5rem 1rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", paddingLeft: "0.5rem" }}>
                            General
                        </div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            <li
                                onClick={() => setActiveTab("pharmacy")}
                                style={{
                                    padding: "0.85rem 1rem",
                                    backgroundColor: activeTab === "pharmacy" ? "#fff" : "transparent",
                                    borderRadius: "10px",
                                    fontWeight: "600",
                                    color: activeTab === "pharmacy" ? "var(--primary)" : "#64748b",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "0.5rem",
                                    boxShadow: activeTab === "pharmacy" ? "0 4px 12px -2px rgba(0,0,0,0.08)" : "none",
                                    transition: "0.2s"
                                }}
                            >
                                <Store size={18} /> Pharmacy Details
                            </li>
                            <li
                                onClick={() => setActiveTab("appearance")}
                                style={{
                                    padding: "0.85rem 1rem",
                                    backgroundColor: activeTab === "appearance" ? "#fff" : "transparent",
                                    borderRadius: "10px",
                                    fontWeight: "600",
                                    color: activeTab === "appearance" ? "var(--primary)" : "#64748b",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "0.5rem",
                                    boxShadow: activeTab === "appearance" ? "0 4px 12px -2px rgba(0,0,0,0.08)" : "none",
                                    transition: "0.2s"
                                }}
                            >
                                <Palette size={18} /> Appearance
                            </li>
                            <li
                                onClick={() => setActiveTab("notifications")}
                                style={{
                                    padding: "0.85rem 1rem",
                                    backgroundColor: activeTab === "notifications" ? "#fff" : "transparent",
                                    borderRadius: "10px",
                                    fontWeight: "600",
                                    color: activeTab === "notifications" ? "var(--primary)" : "#64748b",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "0.5rem",
                                    boxShadow: activeTab === "notifications" ? "0 4px 12px -2px rgba(0,0,0,0.08)" : "none",
                                    transition: "0.2s"
                                }}
                            >
                                <Bell size={18} /> Notifications
                            </li>
                        </ul>
                    </div>

                    {/* Settings Content Area */}
                    <div style={{ flex: 1, padding: "2.5rem", backgroundColor: "#fff" }}>
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default Settings;

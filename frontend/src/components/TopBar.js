import { Search, Bell, ChevronDown, AlertTriangle, Calendar, CreditCard, ShoppingCart, User as UserIcon, Settings, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../services/api";

function TopBar({ title, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem("user") || "AdminUser";
  const userRole = localStorage.getItem("role") || "staff";
  const userEmail = localStorage.getItem("email") || "user@example.com";

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await API.get("inventory/notifications/");
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Icon mapper helper
  const getIcon = (iconName, size, color) => {
    switch (iconName) {
      case "AlertTriangle": return <AlertTriangle size={size} color={color} />;
      case "Calendar": return <Calendar size={size} color={color} />;
      case "CreditCard": return <CreditCard size={size} color={color} />;
      case "ShoppingCart": return <ShoppingCart size={size} color={color} />;
      default: return <Bell size={size} color={color} />;
    }
  };

  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname.split("/").pop();
    if (!path || path === "dashboard") return "Dashboard Overview";
    return path.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="top-bar">
      {/* Left Side: Title & Subtitle */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.25rem",
            fontWeight: "800",
            color: "white",
          }}
        >
          {getPageTitle()}
        </h2>
        <p
          style={{
            margin: "0.1rem 0 0 0",
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.8rem",
          }}
        >
          {subtitle || "Manage your pharmacy efficiently"}
        </p>
      </div>

      {/* Right Side: Search, Bell, Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgba(255,255,255,0.4)",
            }}
          />
          <input
            type="text"
            placeholder="Quick Search..."
            style={{
              padding: "0.6rem 1rem 0.6rem 2.5rem",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              outline: "none",
              fontSize: "0.85rem",
              width: "240px",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "white",
              transition: "0.2s",
            }}
            onFocus={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.1)")}
            onBlur={(e) => (e.target.style.backgroundColor = "rgba(255,255,255,0.05)")}
          />
        </div>

        <div style={{ position: "relative" }} ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              color: "white",
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  width: "8px",
                  height: "8px",
                  backgroundColor: "var(--danger)",
                  borderRadius: "50%",
                  border: "2px solid var(--bg-sidebar)",
                }}
              ></span>
            )}
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                width: "360px",
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                border: "1px solid #f1f5f9",
                zIndex: 2000,
                overflow: "hidden",
                animation: "fadeIn 0.2s ease-out",
                color: "var(--text-main)"
              }}
            >
              {/* ... Notifications content continues (kept standard white for readability) ... */}
              <div style={{ padding: "1.25rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "700" }}>Notifications</h4>
                <button style={{ border: "none", background: "none", color: "var(--primary)", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}>Mark all seen</button>
              </div>
              <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "12px", backgroundColor: n.unread ? "#f8fafc" : "transparent" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: n.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {getIcon(n.icon, 18, n.color)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b" }}>{n.type}</span>
                          <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{n.time}</span>
                        </div>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: "1.4" }}>{n.desc}</p>
                      </div>
                      {n.unread && <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary)", marginTop: "6px" }}></div>}
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: "0.75rem", textAlign: "center", backgroundColor: "#f8fafc" }}>
                <button style={{ border: "none", background: "none", fontSize: "0.85rem", fontWeight: "600", color: "#64748b", cursor: "pointer" }}>View All Notifications</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }} ref={profileRef}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.25rem 0.75rem 0.25rem 0.25rem",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "#e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${userName}&background=e2e8f0&color=0f172a&bold=true`}
                alt="User"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  color: "white",
                }}
              >
                {userName.length > 10 ? userName.substring(0, 8) + '...' : userName}
              </span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>
                {userRole}
              </span>
            </div>
            <ChevronDown
              size={14}
              color="rgba(255,255,255,0.4)"
              style={{ marginLeft: "4px", transform: showProfileMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "0.2s" }}
            />
          </div>

          {showProfileMenu && (
            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "0",
                width: "260px",
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                border: "1px solid #f1f5f9",
                zIndex: 2000,
                overflow: "hidden",
                animation: "fadeIn 0.2s ease-out",
                color: "var(--text-main)"
              }}
            >
              <div style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f8fafc" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden" }}>
                  <img src={`https://ui-avatars.com/api/?name=${userName}&background=e2e8f0&color=0f172a&bold=true`} alt="U" style={{ width: "100%" }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "700" }}>{userName}</h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{userRole}</p>
                </div>
              </div>
              <div style={{ padding: "0.5rem" }}>
                <button onClick={() => { setShowProfileMenu(false); navigate("/profile"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "0.6rem 0.75rem", border: "none", background: "none", borderRadius: "8px", cursor: "pointer", color: "#475569", fontSize: "0.85rem" }}>
                  <UserIcon size={16} /> My Profile
                </button>
                <button onClick={() => { setShowProfileMenu(false); navigate("/settings"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "0.6rem 0.75rem", border: "none", background: "none", borderRadius: "8px", cursor: "pointer", color: "#475569", fontSize: "0.85rem" }}>
                  <Settings size={16} /> Settings
                </button>
                <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "0.25rem", paddingTop: "0.25rem" }}>
                  <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "0.6rem 0.75rem", border: "none", background: "none", borderRadius: "8px", cursor: "pointer", color: "#ef4444", fontSize: "0.85rem", fontWeight: "600" }}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopBar;

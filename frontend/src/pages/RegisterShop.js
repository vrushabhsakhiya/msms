import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import {
  Pill,
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  MapPin,
  BadgeCheck,
  PhoneCall,
  ClockIcon,
  CheckCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

function RegisterShop() {
  const [form, setForm] = useState({
    shop_name: "",
    owner_name: "",
    address: "",
    contact_number: "",
    license_number: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!form.shop_name.trim()) e.shop_name = "Required";
    if (!form.owner_name.trim()) e.owner_name = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.contact_number.trim()) e.contact_number = "Required";
    if (!form.license_number.trim()) e.license_number = "Drug License Number is required";
    if (!form.username.trim()) e.username = "Required";
    if (!form.email.trim()) e.email = "Required";
    if (!form.mobile.trim()) e.mobile = "Required";
    else if (!/^\d{10}$/.test(form.mobile)) e.mobile = "10 digits required";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 6) e.password = "Min 6 chars";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (field, val) => {
    setForm({ ...form, [field]: val });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await API.post("auth/register-shop/", form);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      const errorObj = err.response?.data;
      if (errorObj && typeof errorObj === "object") {
        // Show field-level errors inline
        const fieldErrors = {};
        const generalMessages = [];
        Object.keys(errorObj).forEach((key) => {
          const msg = Array.isArray(errorObj[key])
            ? errorObj[key].join(" ")
            : String(errorObj[key]);
          // Map known field keys
          if (["shop_name", "owner_name", "address", "contact_number", "license_number",
            "username", "email", "mobile", "password"].includes(key)) {
            fieldErrors[key] = msg;
          } else if (key === "non_field_errors") {
            generalMessages.push(msg);
          } else {
            generalMessages.push(`${key}: ${msg}`);
          }
        });
        if (Object.keys(fieldErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        if (generalMessages.length > 0) {
          alert("Registration failed:\n" + generalMessages.join("\n"));
        }
      } else {
        alert("Registration failed. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const errStyle = { fontSize: "0.76rem", color: "var(--danger)", marginTop: "3px", display: "block" };
  const inp = (field) => ({
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: "10px",
    border: `1.5px solid ${errors[field] ? "var(--danger)" : "#e2e8f0"}`,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    background: "#f8fafc",
    color: "var(--text-main)",
  });

  const labelStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "600",
    fontSize: "0.85rem",
    color: "var(--bg-sidebar)",
    marginBottom: "4px",
  };

  // ---- Success / Pending Approval Screen ----
  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at top left, var(--bg-sidebar), #062e2c)",
          padding: "2rem 1rem",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "480px",
            padding: "3rem",
            borderRadius: "24px",
            boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5)",
            backgroundColor: "rgba(255,255,255,0.99)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              padding: "1.5rem",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              color: "#d97706",
              marginBottom: "1.5rem",
            }}
          >
            <ClockIcon size={52} />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: "800", color: "var(--bg-sidebar)" }}>
            Registration Submitted!
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Your pharmacy <strong style={{ color: "var(--bg-sidebar)" }}>{form.shop_name}</strong> has been registered
            and is <strong style={{ color: "#d97706" }}>pending approval</strong> by the platform administrator.
          </p>

          <div
            style={{
              background: "#f8fafc",
              borderRadius: "14px",
              padding: "1.25rem",
              marginTop: "1.5rem",
              textAlign: "left",
              border: "1px solid #e2e8f0",
            }}
          >
            {[
              "Application submitted ✅",
              "Admin review in progress ⏳",
              "Approval notification sent to your email",
              "Login access granted after approval",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "0.5rem 0",
                  borderBottom: i < 3 ? "1px solid #f1f5f9" : "none",
                  fontSize: "0.88rem",
                  color: i === 0 ? "var(--success)" : i === 1 ? "#d97706" : "var(--text-muted)",
                  fontWeight: i < 2 ? "600" : "400",
                }}
              >
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                {step}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/")}
            className="btn-primary"
            style={{
              width: "100%",
              marginTop: "2rem",
              padding: "1rem",
              borderRadius: "14px",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            Go to Login <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ---- Registration Form ----
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top left, var(--bg-sidebar), #062e2c)",
        padding: "2rem 1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "920px",
          padding: "3rem",
          borderRadius: "2rem",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.5)",
          backgroundColor: "rgba(255,255,255,0.99)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "1.25rem",
              borderRadius: "20px",
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
              marginBottom: "1rem",
            }}
          >
            <Building2 size={48} />
          </div>
          <h2 style={{ margin: 0, fontSize: "2rem", fontWeight: "800", color: "var(--bg-sidebar)" }}>
            Pharmacy Onboarding
          </h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Register your pharmacy — our admin team will review and approve your account
          </p>
          {/* Steps indicator */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
            {["Store Details", "Admin Review", "Login Access"].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.8rem",
                  color: i === 0 ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: i === 0 ? "700" : "400",
                }}
              >
                <span
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: i === 0 ? "var(--primary)" : "#e2e8f0",
                    color: i === 0 ? "white" : "var(--text-muted)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  {i + 1}
                </span>
                {s}
                {i < 2 && <span style={{ color: "#e2e8f0", margin: "0 4px" }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleRegister} noValidate>
          <div className="grid-cols-2" style={{ gap: "3rem" }}>
            {/* Left: Store Info */}
            <div>
              <h3
                style={{
                  marginBottom: "1.5rem",
                  fontSize: "1rem",
                  fontWeight: "700",
                  borderBottom: "2px solid var(--primary-light)",
                  paddingBottom: "0.5rem",
                  color: "var(--bg-sidebar)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Building2 size={18} /> Store Information
              </h3>

              <div className="form-group">
                <label style={labelStyle}><Building2 size={13} /> Medical Store Name *</label>
                <input
                  required
                  placeholder="e.g. Apollo Pharmacy"
                  style={inp("shop_name")}
                  value={form.shop_name}
                  onChange={(e) => set("shop_name", e.target.value)}
                />
                {errors.shop_name && <span style={errStyle}>{errors.shop_name}</span>}
              </div>

              <div className="form-group">
                <label style={labelStyle}><User size={13} /> Owner Name *</label>
                <input
                  required
                  placeholder="Full legal name"
                  style={inp("owner_name")}
                  value={form.owner_name}
                  onChange={(e) => set("owner_name", e.target.value)}
                />
                {errors.owner_name && <span style={errStyle}>{errors.owner_name}</span>}
              </div>

              <div className="form-group">
                <label style={labelStyle}><MapPin size={13} /> Shop Address *</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Full address with pincode"
                  style={{ ...inp("address"), height: "auto", resize: "vertical" }}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
                {errors.address && <span style={errStyle}>{errors.address}</span>}
              </div>

              <div className="grid-cols-2">
                <div className="form-group">
                  <label style={labelStyle}><PhoneCall size={13} /> Store Contact *</label>
                  <input
                    required
                    placeholder="Store number"
                    style={inp("contact_number")}
                    value={form.contact_number}
                    onChange={(e) => set("contact_number", e.target.value)}
                  />
                  {errors.contact_number && <span style={errStyle}>{errors.contact_number}</span>}
                </div>
                <div className="form-group">
                  <label style={labelStyle}><BadgeCheck size={13} /> Drug License No. *</label>
                  <input
                    required
                    placeholder="e.g. MH-DL-2024-XXXXX"
                    style={inp("license_number")}
                    value={form.license_number}
                    onChange={(e) => set("license_number", e.target.value)}
                  />
                  {errors.license_number && <span style={errStyle}>{errors.license_number}</span>}
                </div>
              </div>
            </div>

            {/* Right: Admin Credentials */}
            <div>
              <h3
                style={{
                  marginBottom: "1.5rem",
                  fontSize: "1rem",
                  fontWeight: "700",
                  borderBottom: "2px solid #dcfce7",
                  paddingBottom: "0.5rem",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ShieldCheck size={18} /> Owner Login Credentials
              </h3>

              <div className="form-group">
                <label style={labelStyle}><User size={13} /> Username *</label>
                <input
                  required
                  placeholder="Used to login"
                  style={inp("username")}
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                />
                {errors.username && <span style={errStyle}>{errors.username}</span>}
              </div>

              <div className="form-group">
                <label style={labelStyle}><Mail size={13} /> Business Email *</label>
                <input
                  required
                  type="email"
                  placeholder="email@pharmacy.com"
                  style={inp("email")}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
                {errors.email && <span style={errStyle}>{errors.email}</span>}
              </div>

              <div className="form-group">
                <label style={labelStyle}><Phone size={13} /> Personal Mobile *</label>
                <input
                  required
                  placeholder="10-digit number"
                  maxLength={10}
                  style={inp("mobile")}
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
                />
                {errors.mobile && <span style={errStyle}>{errors.mobile}</span>}
              </div>

              <div className="form-group">
                <label style={labelStyle}><Lock size={13} /> Secure Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    style={{ ...inp("password"), paddingRight: "2.8rem" }}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      padding: 0,
                      display: "flex",
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <span style={errStyle}>{errors.password}</span>}
              </div>

              {/* Info box */}
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: "#eff6ff",
                  borderRadius: "12px",
                  border: "1px solid #bfdbfe",
                  fontSize: "0.83rem",
                  color: "#1e40af",
                  lineHeight: 1.6,
                }}
              >
                <strong>ℹ️ Note:</strong> After registration, your pharmacy will be reviewed by our admin team.
                Login access is granted only after approval. You will be notified via email.
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: "100%",
              padding: "1.1rem",
              marginTop: "2rem",
              fontSize: "1.1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              borderRadius: "1rem",
              fontWeight: "700",
              opacity: loading ? 0.8 : 1,
            }}
            disabled={loading}
          >
            {loading ? "Submitting Registration..." : <>Submit Pharmacy Registration <ArrowRight size={22} /></>}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "1.75rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Already have an approved account?{" "}
            <Link
              to="/"
              style={{ color: "var(--primary)", fontWeight: "700", textDecoration: "none" }}
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterShop;

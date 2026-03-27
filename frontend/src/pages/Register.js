import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import {
  Pill,
  User,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
} from "lucide-react";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    role: "staff",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = "Username is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Enter a valid email";
    if (!form.mobile.trim()) newErrors.mobile = "Mobile is required";
    else if (!/^\d{10}$/.test(form.mobile))
      newErrors.mobile = "Enter a valid 10-digit number";
    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6)
      newErrors.password = "Minimum 6 characters";
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await API.post("auth/register/", payload);
      alert("Registration Successful! Please login. ✅");
      navigate("/");
    } catch (err) {
      console.error(err);
      const errorObj = err.response?.data;
      if (errorObj && typeof errorObj === "object") {
        const messages = Object.keys(errorObj).map(
          (key) => `${key}: ${errorObj[key]}`
        );
        alert("Registration failed:\n" + messages.join("\n"));
      } else {
        alert("Registration failed. Please check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "0.85rem 1.1rem",
    borderRadius: "10px",
    border: `1.5px solid ${errors[field] ? "var(--danger)" : "#e2e8f0"}`,
    fontSize: "0.95rem",
    fontFamily: "inherit",
    outline: "none",
    background: "#f8fafc",
    color: "var(--text-main)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  const roleColors = {
    staff: { bg: "#e0f2fe", color: "#0369a1" },
    pharmacist: { bg: "#dcfce7", color: "#15803d" },
    admin: { bg: "#fef3c7", color: "#b45309" },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top left, var(--bg-sidebar), #062e2c)",
        padding: "2rem 1rem",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "fixed",
          top: "-80px",
          right: "-80px",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "rgba(0,123,255,0.08)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-60px",
          left: "-60px",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: "rgba(40,167,69,0.07)",
          pointerEvents: "none",
        }}
      />

      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "2.75rem",
          borderRadius: "24px",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.55)",
          backgroundColor: "rgba(255,255,255,0.99)",
          backdropFilter: "blur(12px)",
          animation: "fadeIn 0.4s ease forwards",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "1.1rem",
              borderRadius: "20px",
              backgroundColor: "var(--primary-light)",
              color: "var(--primary)",
              marginBottom: "1.25rem",
            }}
          >
            <Pill size={44} />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.8rem",
              fontWeight: "800",
              color: "var(--bg-sidebar)",
            }}
          >
            Create Account
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              marginTop: "0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Join the MSMS Medical Management Team
          </p>
        </div>

        <form onSubmit={handleRegister} noValidate>
          {/* Row 1: Username + Email */}
          <div className="grid-cols-2" style={{ marginBottom: "1.1rem" }}>
            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <User size={14} /> Username
              </label>
              <input
                required
                placeholder="e.g. john_doe"
                style={inputStyle("username")}
                value={form.username}
                onChange={(e) => handleChange("username", e.target.value)}
                disabled={loading}
              />
              {errors.username && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "3px", display: "block" }}>
                  {errors.username}
                </span>
              )}
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <Mail size={14} /> Email
              </label>
              <input
                required
                type="email"
                placeholder="email@example.com"
                style={inputStyle("email")}
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={loading}
              />
              {errors.email && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "3px", display: "block" }}>
                  {errors.email}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Mobile + Role */}
          <div className="grid-cols-2" style={{ marginBottom: "1.1rem" }}>
            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <Phone size={14} /> Mobile
              </label>
              <input
                required
                placeholder="10-digit number"
                maxLength={10}
                style={inputStyle("mobile")}
                value={form.mobile}
                onChange={(e) =>
                  handleChange("mobile", e.target.value.replace(/\D/g, ""))
                }
                disabled={loading}
              />
              {errors.mobile && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "3px", display: "block" }}>
                  {errors.mobile}
                </span>
              )}
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <ShieldCheck size={14} /> Role
              </label>
              <select
                style={{
                  ...inputStyle("role"),
                  cursor: "pointer",
                  appearance: "auto",
                }}
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                disabled={loading}
              >
                <option value="staff">Staff</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin">Admin</option>
              </select>
              {/* Role badge */}
              <span
                style={{
                  display: "inline-block",
                  marginTop: "6px",
                  padding: "2px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  background: roleColors[form.role]?.bg,
                  color: roleColors[form.role]?.color,
                }}
              >
                {form.role.charAt(0).toUpperCase() + form.role.slice(1)} Access
              </span>
            </div>
          </div>

          {/* Row 3: Password + Confirm Password */}
          <div className="grid-cols-2" style={{ marginBottom: "1.75rem" }}>
            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <Lock size={14} /> Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  style={{ ...inputStyle("password"), paddingRight: "2.8rem" }}
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
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
              {errors.password && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "3px", display: "block" }}>
                  {errors.password}
                </span>
              )}
            </div>

            <div className="form-group">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: "600",
                  fontSize: "0.88rem",
                  color: "var(--bg-sidebar)",
                  marginBottom: "0.4rem",
                }}
              >
                <Lock size={14} /> Confirm
              </label>
              <div style={{ position: "relative" }}>
                <input
                  required
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  style={{
                    ...inputStyle("confirmPassword"),
                    paddingRight: "2.8rem",
                  }}
                  value={form.confirmPassword}
                  onChange={(e) =>
                    handleChange("confirmPassword", e.target.value)
                  }
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute",
                    right: "10px",
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
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "3px", display: "block" }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary"
            style={{
              width: "100%",
              fontSize: "1.05rem",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              borderRadius: "14px",
              fontWeight: "700",
              letterSpacing: "0.3px",
              opacity: loading ? 0.8 : 1,
            }}
            disabled={loading}
          >
            {loading ? (
              "Creating Account..."
            ) : (
              <>
                <UserPlus size={20} /> Register Account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--success)",
              fontSize: "0.78rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "1.25rem",
            }}
          >
            <ShieldCheck size={13} /> 256-bit Encrypted Registration
          </div>

          <div
            style={{
              paddingTop: "1.25rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              Already have an account?{" "}
              <Link
                to="/"
                style={{
                  color: "var(--primary)",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;

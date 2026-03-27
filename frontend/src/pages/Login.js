import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { Pill, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const loginUser = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password.", { duration: 5000 });
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("auth/login/", { email, password });

      if (res.data.require_otp) {
        setStep(2);
        toast.success(res.data.message || "OTP sent securely to your email", { duration: 4000, icon: '✉️' });
        return;
      }

      // Fallback if backend doesn't require OTP
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user", res.data.user);
      localStorage.setItem("shop_name", res.data.shop_name);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      toast.success(`Login successful! Welcome, ${res.data.user}`, { duration: 3000, icon: '✅' });
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        if (data.locked) {
          toast(data.locked[0] || "Account locked after 5 failed attempts. Try after 15 minutes.", { duration: 15000, icon: '⚠️', style: { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' } });
        } else if (data.non_field_errors) {
          toast.error(Array.isArray(data.non_field_errors) ? data.non_field_errors.join(" ") : data.non_field_errors, { duration: 5000 });
        } else if (data.detail) {
          toast.error(data.detail, { duration: 5000 });
        } else {
          toast.error("Login failed. Please check your credentials.", { duration: 5000 });
        }
      } else {
        toast.error("Cannot connect to server. Please try again.", { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) {
      toast.error("Please enter the One-Time Password.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("auth/verify-login-otp/", { email, otp });

      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user", res.data.user);
      localStorage.setItem("shop_name", res.data.shop_name);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      toast.success(`Login successful! Verified securely.`, { duration: 3000, icon: '✅' });
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      if (err.response?.data?.error) {
        toast.error(err.response.data.error, { duration: 5000 });
      } else if (err.response?.data?.locked) {
        toast(err.response.data.locked[0] || "Account locked", { duration: 15000, icon: '⚠️', style: { background: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5' } });
      } else {
        toast.error("Invalid OTP or expired. Please try again.", { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      const res = await API.post("auth/resend-login-otp/", { email });
      toast.success(res.data.message || "New OTP sent successfully!");
      setOtp("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resend OTP.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step === 1) loginUser();
      else verifyOTP();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(circle at top left, var(--bg-sidebar), #062e2c)", padding: "1rem",
      }}
    >
      <Toaster position="top-right" />
      <div
        className="card"
        style={{
          width: "100%", maxWidth: "420px", padding: "3rem", borderRadius: "24px",
          boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.5)",
          backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", padding: "1.25rem", borderRadius: "20px", backgroundColor: "var(--primary-light)", color: "var(--primary)", marginBottom: "1.5rem" }}>
            <Pill size={48} />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.85rem", fontWeight: "800", color: "var(--bg-sidebar)" }}>Medical Portal</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.95rem" }}>Authorization required for pharmacist access</p>
        </div>

        {step === 1 ? (
          <>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "var(--bg-sidebar)" }}>
                <Mail size={16} /> Email Address
              </label>
              <input
                type="email"
                value={email}
                placeholder="your@email.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="custom-input"
                style={{ padding: "0.85rem 1.25rem" }}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "var(--bg-sidebar)" }}>
                <Lock size={16} /> Secure Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="custom-input"
                  style={{ padding: "0.85rem 1.25rem", paddingRight: "3rem" }}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)"
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", fontSize: "0.88rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--bg-sidebar)", fontWeight: "500" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--primary)" }}
                />
                Remember Me
              </label>
              <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600" }} onClick={() => toast("Contact your administrator to reset password.", { icon: "ℹ️" })}>
                Forgot Password?
              </span>
            </div>

            <button
              onClick={loginUser}
              className="btn-primary"
              style={{ width: "100%", fontSize: "1.1rem", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", borderRadius: "14px", opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              disabled={loading}
            >
              {loading ? <>⏳ Processing...</> : <>Verify Credentials <ArrowRight size={20} /></>}
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <p style={{ margin: "0 0 1rem 0", color: "var(--text-main)", fontSize: "0.95rem" }}>
                For your security, please enter the One-Time Password sent to you.
              </p>
            </div>
            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", color: "var(--bg-sidebar)" }}>
                <ShieldCheck size={16} /> Authorization OTP
              </label>
              <input
                type="text"
                value={otp}
                placeholder="Enter 8-character OTP"
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={handleKeyDown}
                className="custom-input"
                style={{ padding: "0.85rem 1.25rem", textAlign: "center", letterSpacing: "2px", fontWeight: "700", fontSize: "1.1rem" }}
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              onClick={verifyOTP}
              className="btn-primary"
              style={{ width: "100%", fontSize: "1.1rem", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", borderRadius: "14px", opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              disabled={loading}
            >
              {loading ? <>⏳ Authenticating...</> : <>Complete Secure Login <ShieldCheck size={20} /></>}
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                onClick={resendOTP}
                style={{ border: "none", background: "none", color: "var(--primary)", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
              >
                Didn't receive it? Resend OTP
              </button>
            </div>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--success)", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <ShieldCheck size={14} /> 256-bit Encrypted Session
          </div>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px dashed #e2e8f0" }}>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: 0 }}>
              New pharmacy?{" "}
              <Link to="/register" style={{ color: "var(--primary)", fontWeight: "700", textDecoration: "none" }}>
                Register your pharmacy →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

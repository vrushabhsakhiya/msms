import { useState, useEffect } from "react";
import API from "../services/api";
import { API_ENDPOINTS } from "../services/endpoints";
import { useNavigate, Link } from "react-router-dom";
import { Pill, Mail, Lock, ShieldCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Redirect if already logged in
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/dashboard");
      return;
    }

    // 2. Remembered email
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [navigate]);

  const loginUser = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter credentials.");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post(API_ENDPOINTS.auth.login, { email, password });
      if (res.data.require_otp) {
        setStep(2);
        toast.success(res.data.message || "OTP sent to your email.");
        return;
      }
    } catch (err) {
      toast.error(err.response?.data?.non_field_errors?.[0] || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) return toast.error("Enter OTP.");
    setLoading(true);
    try {
      const res = await API.post(API_ENDPOINTS.auth.verifyLoginOtp, { email, otp });
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("user", res.data.user);
      localStorage.setItem("shop_name", res.data.shop_name);
      localStorage.setItem("permissions", JSON.stringify(res.data.permissions || {}));
      
      if (rememberMe) localStorage.setItem("rememberedEmail", email);
      else localStorage.removeItem("rememberedEmail");

      toast.success("Login Successful!");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      toast.error(err.response?.data?.error || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const recoverPassword = async () => {
    if (!email.trim()) return toast.error("Enter your email.");
    setLoading(true);
    try {
      await API.post(API_ENDPOINTS.auth.forgotPassword, { email });
      setStep(4);
      setOtp("");
      toast.success("Reset OTP sent if account exists.");
    } catch (err) {
      toast.error("Process failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!otp.trim() || !newPassword.trim()) return toast.error("Both OTP and New Password are required.");
    setLoading(true);
    try {
      await API.post(API_ENDPOINTS.auth.resetPassword, { email, otp, new_password: newPassword });
      toast.success("Password reset! Please login now.");
      setStep(1);
      setPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step === 1) loginUser();
      else if (step === 2) verifyOTP();
      else if (step === 3) recoverPassword();
      else if (step === 4) resetPassword();
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at top left, var(--bg-sidebar), #062e2c)", padding: "1rem" }}>
      <Toaster position="top-right" />
      <div className="card" style={{ width: "100%", maxWidth: "420px", padding: "3rem", borderRadius: "24px", boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.5)", backgroundColor: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", padding: "1.25rem", borderRadius: "20px", backgroundColor: "var(--primary-light)", color: "var(--primary)", marginBottom: "1.5rem" }}>
            <Pill size={48} />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.85rem", fontWeight: "800", color: "var(--bg-sidebar)" }}>
             {step === 3 || step === 4 ? "Account Recovery" : "Medical Portal"}
          </h2>
        </div>

        {step === 1 && (
          <>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label><Mail size={16} /> Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" placeholder="pharmacist@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label><Lock size={16} /> Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" placeholder="••••••••" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2rem", fontSize: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember
              </label>
              <span style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600" }} onClick={() => setStep(3)}>Forgot Password?</span>
            </div>
            <button onClick={loginUser} className="btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#64748b" }}>Login security code sent to {email}</p>
            <div className="form-group" style={{ marginBottom: "2rem" }}>
              <label><ShieldCheck size={16} /> Enter 8-character OTP</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" style={{ textAlign: "center", letterSpacing: "3px", fontWeight: "800" }} autoFocus />
            </div>
            <button onClick={verifyOTP} className="btn-primary" style={{ width: "100%" }} disabled={loading}>Verify & Continue</button>
            <button onClick={() => setStep(1)} className="btn-link" style={{ width: "100%", marginTop: "1rem" }}>Back to Login</button>
          </>
        )}

        {step === 3 && (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Enter your registered email to receive a recovery code.</p>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label><Mail size={16} /> Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" placeholder="email@pharmacy.com" />
            </div>
            <button onClick={recoverPassword} className="btn-primary" style={{ width: "100%" }} disabled={loading}>Send Recovery OTP</button>
            <button onClick={() => setStep(1)} className="btn-link" style={{ width: "100%", marginTop: "1rem" }}>Cancel</button>
          </>
        )}

        {step === 4 && (
          <>
            <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Recovery code sent. Create a new secure password.</p>
            <div className="form-group" style={{ marginBottom: "1rem" }}>
              <label>6-Digit Reset Code</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" />
            </div>
            <div className="form-group" style={{ marginBottom: "1.5rem" }}>
              <label>New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={handleKeyDown} className="custom-input" />
            </div>
            <button onClick={resetPassword} className="btn-primary" style={{ width: "100%" }} disabled={loading}>Reset Password</button>
            <button onClick={() => setStep(3)} className="btn-link" style={{ width: "100%", marginTop: "1rem" }}>Resend Code</button>
          </>
        )}

        <div style={{ textAlign: "center", marginTop: "2rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
           <p style={{ fontSize: "0.88rem" }}>New pharmacy? <Link to="/register" style={{ color: "var(--primary)", fontWeight: "700" }}>Register Shop →</Link></p>
        </div>
      </div>
    </div>
  );
}

export default Login;

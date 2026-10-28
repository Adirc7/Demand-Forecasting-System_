import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { validateEmail, validatePassword } from "../utils/validation";
import "./Login.css";

const FEATURES = [
  { icon: "📈", title: "AI demand forecasts", text: "7- and 30-day predictions for every SKU." },
  { icon: "🔔", title: "Smart reorder alerts", text: "Know what to restock before it runs out." },
  { icon: "📊", title: "Reports in one click", text: "Revenue, stock health and model accuracy." },
];

export default function Login() {
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, login, resetPassword } = useAuth();
  const navigate = useNavigate();

  // If a user is already logged in, do not let them access the Login page. Redirect them into the app.
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const switchMode = (forgot) => {
    setIsForgotPass(forgot);
    setErr("");
    setMsg("");
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setErr(emailErr);
      return;
    }

    setSubmitting(true);
    try {
      if (isForgotPass) {
        try {
          await resetPassword(email);
          setMsg("Password reset link sent! Check your inbox.");
          setIsForgotPass(false);
        } catch (error) {
          setErr(error.message || "Failed to send reset link.");
        }
        return;
      }

      const passErr = validatePassword(pass);
      if (passErr) {
        setErr(passErr);
        return;
      }

      try {
        await login(email, pass);
        navigate('/dashboard');
      } catch (error) {
        if (error.code === 'auth/invalid-credential' || (error.message && error.message.includes('auth/invalid-credential'))) {
          setErr("Invalid email or password.");
        } else {
          setErr(error.message || "Authentication failed.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Brand panel */}
      <aside className="login-aside">
        <div className="login-brand">
          <span className="login-mark">D</span>
          <span className="login-brand-name">Dropex<span>AI</span></span>
        </div>

        <div className="login-pitch">
          <h1>Smarter inventory, powered by demand forecasting.</h1>
          <p>Forecast demand, prevent stock-outs and keep the right products on hand — all in one place.</p>
          <ul className="login-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="lf-icon" aria-hidden="true">{f.icon}</span>
                <span>
                  <strong>{f.title}</strong>
                  <em>{f.text}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="login-foot">© {new Date().getFullYear()} Dropex.lk · Smart Inventory AI</p>
      </aside>

      {/* Form panel */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="login-mark">D</span>
            <span className="login-brand-name">Dropex<span>AI</span></span>
          </div>

          <h2>{isForgotPass ? "Reset your password" : "Welcome back"}</h2>
          <p className="login-sub">
            {isForgotPass
              ? "Enter your work email and we'll send you a reset link."
              : "Sign in to your staff account to continue."}
          </p>

          {err && <div className="login-alert error" role="alert">{err}</div>}
          {msg && <div className="login-alert success" role="status">{msg}</div>}

          <form onSubmit={handleLoginSubmit} noValidate>
            <label className="login-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            {!isForgotPass && (
              <>
                <div className="login-label-row">
                  <label className="login-label" htmlFor="login-pass">Password</label>
                  <button type="button" className="login-link" onClick={() => switchMode(true)}>Forgot password?</button>
                </div>
                <div className="login-pass-wrap">
                  <input
                    id="login-pass"
                    className="login-input"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="login-toggle"
                    onClick={() => setShowPass((s) => !s)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </>
            )}

            <button className="login-submit" type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : isForgotPass ? "Send reset link" : "Sign in"}
            </button>

            {isForgotPass && (
              <button type="button" className="login-link login-back" onClick={() => switchMode(false)}>
                ← Back to sign in
              </button>
            )}
          </form>

          <p className="login-note">Authorized Dropex staff only. Access is role-based.</p>
        </div>
      </main>
    </div>
  );
}

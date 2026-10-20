import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./LoginPage.css";

const DEMO_ACCOUNTS = [
  { label: "Demo Beneficiary", email: "beneficiary@example.test", password: "password123", role: "beneficiary" },
  { label: "Demo Beneficiary 2", email: "beneficiary2@example.test", password: "password123", role: "beneficiary" },
  { label: "Demo Reviewer", email: "reviewer@example.test", password: "password123", role: "reviewer" },
  { label: "Demo Admin", email: "admin@example.test", password: "password123", role: "admin" },
];

const ROLE_REDIRECT = {
  beneficiary: "/portal/profile",
  reviewer: "/reviewer/queue",
  admin: "/admin",
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_REDIRECT[user.role] || "/portal/profile");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">🏛️</div>
          <h1>Gramin Seva</h1>
          <p className="login-subtitle">Government Scheme Correction Portal</p>
        </div>

        {/* Demo Quick-Fill Buttons */}
        <div className="demo-section">
          <span className="demo-label">Quick Demo Access</span>
          <div className="demo-buttons">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                className={`demo-btn demo-btn--${acc.role}`}
                onClick={() => fillDemo(acc)}
                type="button"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error" role="alert">⚠️ {error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Sign In →"}
          </button>
        </form>

        <p className="login-footer">All demo accounts use password: <strong>password123</strong></p>
      </div>
    </div>
  );
};

export default LoginPage;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import "./ProfilePage.css";

const SCHEME_LABELS = { PMAY_G: "PMAY-G (Pradhan Mantri Awas Yojana – Gramin)", MGNREGS: "MGNREGS (Mahatma Gandhi NREGS)" };
const SCHEME_COLORS = { PMAY_G: "scheme--pmay", MGNREGS: "scheme--mgnregs" };

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.role !== "beneficiary") { setLoading(false); return; }
    api.get("/beneficiaries/me")
      .then((res) => setProfile(res.data.data))
      .catch((err) => setError(err.response?.data?.error?.message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => { await logout(); navigate("/login"); };

  const Field = ({ label, value }) =>
    value ? (
      <div className="profile-field">
        <span className="field-label">{label}</span>
        <span className="field-value">{value}</span>
      </div>
    ) : null;

  return (
    <div className="portal-bg">
      {/* Navbar */}
      <nav className="portal-nav">
        <div className="nav-brand">🏛️ Gramin Seva</div>
        <div className="nav-actions">
          <span className={`role-badge role--${user?.role}`}>{user?.role}</span>
          <button className="nav-btn" onClick={() => navigate("/portal/requests")}>My Requests</button>
          <button className="nav-btn nav-btn--logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="portal-content">
        <div className="page-header">
          <h1>Beneficiary Profile</h1>
          <p>Your registered scheme information</p>
        </div>

        {loading && (
          <div className="loading-card">
            <div className="spinner-lg" />
            <p>Loading your profile…</p>
          </div>
        )}

        {error && (
          <div className="error-card" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Non-beneficiary notice */}
        {!loading && user?.role !== "beneficiary" && (
          <div className="info-card">
            <h3>👋 Welcome, {user?.name}</h3>
            <p>You are logged in as <strong>{user?.role}</strong>. Beneficiary profile data is only available for beneficiary accounts.</p>
          </div>
        )}

        {profile && (
          <>
            {/* Scheme Banner */}
            <div className={`scheme-banner ${SCHEME_COLORS[profile.scheme] || ""}`}>
              <div className="scheme-icon">🏡</div>
              <div>
                <div className="scheme-name">{SCHEME_LABELS[profile.scheme] || profile.scheme}</div>
                <div className="scheme-id">Beneficiary ID: {profile.beneficiaryId}</div>
              </div>
              <div className="scheme-version">Record v{profile.recordVersion}</div>
            </div>

            {/* Details Card */}
            <div className="profile-card">
              <h2 className="card-title">Personal Details</h2>
              <div className="profile-grid">
                <Field label="Full Name" value={profile.name} />
                <Field label="Village" value={profile.village} />
                <Field label="District" value={profile.district} />
                <Field label="Gram Panchayat" value={profile.gramPanchayat} />
                <Field label="Contact Number" value={profile.contactNumber} />
                {profile.scheme === "MGNREGS" && (
                  <Field label="Job Card Holder" value={profile.jobCardHolderName} />
                )}
              </div>

              <div className="card-actions">
                <button className="action-btn" onClick={() => navigate("/portal/requests")}>
                  📋 View My Requests
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import { VerificationBadge } from "../components/VerificationReport";
import "./ReviewerQueuePage.css";

const STATUS_FILTERS = ["ALL", "SUBMITTED", "UNDER_REVIEW", "NEEDS_INFO", "APPROVED", "REJECTED"];

const ReviewerQueuePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [schemeFilter, setSchemeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (schemeFilter !== "ALL") params.scheme = schemeFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/reviewer/requests", { params });
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load requests queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, schemeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="reviewer-bg">
      {/* Navbar */}
      <nav className="reviewer-nav">
        <div className="nav-brand">🏛️ Gramin Seva — Reviewer Console</div>
        <div className="nav-actions">
          <span className="reviewer-badge">Reviewer: {user?.name}</span>
          <button className="nav-btn nav-btn--logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="reviewer-container">
        {/* Header */}
        <div className="queue-header">
          <div>
            <h1>Correction Requests Queue</h1>
            <p>Review submitted changes, verify supporting documents, and issue official decisions.</p>
          </div>
          <button className="refresh-btn" onClick={fetchRequests} disabled={loading}>
            🔄 Refresh Queue
          </button>
        </div>

        {/* Filter Controls */}
        <div className="filters-card">
          <div className="status-tabs">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                className={`tab-btn ${statusFilter === s ? "tab-btn--active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          <form className="search-row" onSubmit={handleSearchSubmit}>
            <div className="scheme-select-wrap">
              <label>Scheme:</label>
              <select value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value)}>
                <option value="ALL">All Schemes</option>
                <option value="PMAY_G">PMAY-G</option>
                <option value="MGNREGS">MGNREGS</option>
              </select>
            </div>

            <div className="search-input-wrap">
              <input
                type="text"
                placeholder="Search by Request ID, Beneficiary ID, or Field..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="search-btn">
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Queue Table */}
        {error && <div className="queue-error">⚠️ {error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="spinner-lg" />
            <p>Loading review queue...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📂</span>
            <h3>No requests found</h3>
            <p>There are no correction requests matching the selected filter criteria.</p>
          </div>
        ) : (
          <div className="table-card">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Beneficiary</th>
                  <th>Scheme</th>
                  <th>Field</th>
                  <th>Proposed Change</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.requestId} className="queue-row">
                    <td className="id-cell">{r.requestId}</td>
                    <td className="beneficiary-cell">{r.beneficiaryId}</td>
                    <td>
                      <span className={`scheme-tag scheme-tag--${r.scheme.toLowerCase()}`}>{r.scheme}</span>
                    </td>
                    <td className="field-cell">{r.field}</td>
                    <td className="change-cell">
                      <span className="change-diff">
                        <span className="diff-old">{r.oldValue || "(empty)"}</span>
                        <span className="diff-arrow">→</span>
                        <span className="diff-new">{r.proposedValue}</span>
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status--${r.status.toLowerCase()}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <button
                        className="review-btn"
                        onClick={() => navigate(`/reviewer/requests/${r.requestId}`)}
                      >
                        Inspect Case →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerQueuePage;

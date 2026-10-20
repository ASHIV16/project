import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import "./AdminDashboardPage.css";

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reseedLoading, setReseedLoading] = useState(false);
  const [reseedSuccess, setReseedSuccess] = useState("");

  // Filters for Audit Log
  const [actionFilter, setActionFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Stats from Member 4 API
      const statsRes = await api.get("/admin/stats");
      setStats(statsRes.data.data);

      // 2. Fetch Audit Logs from Member 4 API
      const params = {};
      if (actionFilter !== "ALL") params.action = actionFilter;
      if (search.trim()) params.search = search.trim();

      const logsRes = await api.get("/admin/audit-logs", { params });
      setAuditLogs(logsRes.data.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleReseed = async () => {
    if (!window.confirm("Are you sure you want to re-seed demo data? This will reset the database fixtures.")) {
      return;
    }

    setReseedLoading(true);
    setReseedSuccess("");
    try {
      await api.post("/admin/reseed");
      setReseedSuccess("Database reseeded successfully with fresh test fixtures!");
      await fetchData();
      setTimeout(() => setReseedSuccess(""), 4000);
    } catch (err) {
      alert("Failed to reseed database: " + (err.response?.data?.error?.message || err.message));
    } finally {
      setReseedLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Safe percentage helper
  const calcPercent = (val, total) => {
    if (!total || total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  return (
    <div className="admin-bg">
      {/* Top Navbar */}
      <nav className="admin-nav">
        <div className="nav-brand">🏛️ Gramin Seva — Admin Operations</div>
        <div className="nav-actions">
          <span className="admin-badge">Admin: {user?.name}</span>
          <button className="nav-btn" onClick={() => navigate("/reviewer/queue")}>
            Reviewer Queue
          </button>
          <button className="nav-btn nav-btn--logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="admin-container">
        {/* Header */}
        <div className="admin-header-row">
          <div>
            <h1>Operations Dashboard & Audit Trail</h1>
            <p>System metrics, scheme throughput analysis, and immutable governance logs</p>
          </div>
          <div className="header-actions">
            <button
              className="reseed-btn"
              onClick={handleReseed}
              disabled={reseedLoading}
              title="Resets test data to known baseline"
            >
              {reseedLoading ? "Reseeding..." : "🌱 Re-Seed Demo Data"}
            </button>
            <button className="refresh-btn" onClick={fetchData} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {reseedSuccess && <div className="success-banner">✅ {reseedSuccess}</div>}
        {error && <div className="error-banner">⚠️ {error}</div>}

        {loading && !stats ? (
          <div className="loading-card">
            <div className="spinner-lg" />
            <p>Compiling analytics and audit streams...</p>
          </div>
        ) : stats ? (
          <>
            {/* 4 Metric Summary Widgets */}
            <div className="stats-grid">
              <div className="metric-card metric--blue">
                <div className="metric-icon">📑</div>
                <div className="metric-content">
                  <span className="metric-label">Total Requests</span>
                  <span className="metric-value">{stats.totalRequests}</span>
                  <span className="metric-sub">Across all schemes</span>
                </div>
              </div>

              <div className="metric-card metric--amber">
                <div className="metric-icon">⏳</div>
                <div className="metric-content">
                  <span className="metric-label">Pending Review</span>
                  <span className="metric-value">{stats.pendingReview}</span>
                  <span className="metric-sub">Awaiting decision</span>
                </div>
              </div>

              <div className="metric-card metric--green">
                <div className="metric-icon">✅</div>
                <div className="metric-content">
                  <span className="metric-label">Approval Rate</span>
                  <span className="metric-value">{stats.approvalRate}%</span>
                  <span className="metric-sub">
                    {stats.byStatus?.APPROVED || 0} approved / {(stats.byStatus?.REJECTED || 0)} rejected
                  </span>
                </div>
              </div>

              <div className="metric-card metric--purple">
                <div className="metric-icon">👥</div>
                <div className="metric-content">
                  <span className="metric-label">Beneficiaries</span>
                  <span className="metric-value">{stats.totalBeneficiaries}</span>
                  <span className="metric-sub">Linked scheme records</span>
                </div>
              </div>
            </div>

            {/* Middle Row: Scheme Distribution & Status Breakdown */}
            <div className="charts-grid">
              {/* Scheme Distribution Card */}
              <div className="admin-card">
                <h3 className="card-title">Scheme Breakdown</h3>
                <div className="scheme-breakdown-list">
                  <div className="scheme-row">
                    <div className="scheme-row-header">
                      <span className="scheme-name">🏡 PMAY-G (Housing Scheme)</span>
                      <span className="scheme-count">
                        {stats.byScheme?.PMAY_G || 0} (
                        {calcPercent(stats.byScheme?.PMAY_G, stats.totalRequests)}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill fill--pmay"
                        style={{
                          width: `${calcPercent(stats.byScheme?.PMAY_G, stats.totalRequests)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="scheme-row">
                    <div className="scheme-row-header">
                      <span className="scheme-name">💼 MGNREGS (Rural Employment)</span>
                      <span className="scheme-count">
                        {stats.byScheme?.MGNREGS || 0} (
                        {calcPercent(stats.byScheme?.MGNREGS, stats.totalRequests)}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill fill--mgnregs"
                        style={{
                          width: `${calcPercent(stats.byScheme?.MGNREGS, stats.totalRequests)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Card */}
              <div className="admin-card">
                <h3 className="card-title">Status Distribution</h3>
                <div className="status-chips-grid">
                  <div className="status-chip chip--submitted">
                    <span className="chip-label">Submitted</span>
                    <span className="chip-count">{stats.byStatus?.SUBMITTED || 0}</span>
                  </div>
                  <div className="status-chip chip--review">
                    <span className="chip-label">Under Review</span>
                    <span className="chip-count">{stats.byStatus?.UNDER_REVIEW || 0}</span>
                  </div>
                  <div className="status-chip chip--info">
                    <span className="chip-label">Needs Info</span>
                    <span className="chip-count">{stats.byStatus?.NEEDS_INFO || 0}</span>
                  </div>
                  <div className="status-chip chip--approved">
                    <span className="chip-label">Approved</span>
                    <span className="chip-count">{stats.byStatus?.APPROVED || 0}</span>
                  </div>
                  <div className="status-chip chip--rejected">
                    <span className="chip-label">Rejected</span>
                    <span className="chip-count">{stats.byStatus?.REJECTED || 0}</span>
                  </div>
                  <div className="status-chip chip--draft">
                    <span className="chip-label">Draft</span>
                    <span className="chip-count">{stats.byStatus?.DRAFT || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Filterable Immutable Audit Trail */}
            <div className="admin-card audit-trail-card">
              <div className="audit-header">
                <div>
                  <h3 className="card-title">Governance Audit Trail</h3>
                  <p className="card-subtitle">
                    Immutable event stream recording all lifecycle modifications and reviewer decisions
                  </p>
                </div>

                <form className="audit-filter-form" onSubmit={handleSearchSubmit}>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="audit-select"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="SUBMIT_REQUEST">SUBMIT_REQUEST</option>
                    <option value="REQUEST_APPROVED">REQUEST_APPROVED</option>
                    <option value="REQUEST_INFO">REQUEST_INFO</option>
                    <option value="REQUEST_REJECTED">REQUEST_REJECTED</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Search logs by request, actor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="audit-search-input"
                  />
                  <button type="submit" className="audit-search-btn">
                    Filter
                  </button>
                </form>
              </div>

              {auditLogs.length === 0 ? (
                <div className="no-logs">No audit records found matching criteria.</div>
              ) : (
                <div className="table-responsive">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Request ID</th>
                        <th>Actor</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log._id}>
                          <td className="log-time">
                            {new Date(log.createdAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="log-id">{log.requestId}</td>
                          <td className="log-actor">{log.actorId}</td>
                          <td>
                            <span className={`actor-role-badge role--${log.actorRole}`}>
                              {log.actorRole}
                            </span>
                          </td>
                          <td>
                            <span className={`action-badge action--${log.action.toLowerCase()}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="log-reason">{log.reason || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AdminDashboardPage;

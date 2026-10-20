import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import "./ProfilePage.css";
import "./RequestsPage.css";

const STATUS_CONFIG = {
  DRAFT:        { label: "Draft",        color: "status--draft" },
  SUBMITTED:    { label: "Submitted",    color: "status--submitted" },
  UNDER_REVIEW: { label: "Under Review", color: "status--review" },
  NEEDS_INFO:   { label: "Needs Info",   color: "status--info" },
  APPROVED:     { label: "Approved",     color: "status--approved" },
  REJECTED:     { label: "Rejected",     color: "status--rejected" },
};

const SCHEME_FIELDS = {
  PMAY_G: [
    { value: "name", label: "Full Name" },
    { value: "village", label: "Village" },
    { value: "district", label: "District" },
    { value: "contactNumber", label: "Contact Number" },
  ],
  MGNREGS: [
    { value: "jobCardHolderName", label: "Job Card Holder Name" },
    { value: "village", label: "Village" },
    { value: "gramPanchayat", label: "Gram Panchayat" },
    { value: "contactNumber", label: "Contact Number" },
  ],
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "" };
  return <span className={`status-badge ${cfg.color}`}>{cfg.label}</span>;
};

const RequestsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State for New Request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheme, setScheme] = useState("PMAY_G");
  const [field, setField] = useState("name");
  const [proposedValue, setProposedValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  const fetchMyRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/requests/mine");
      setRequests(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const handleSchemeChange = (newScheme) => {
    setScheme(newScheme);
    const available = SCHEME_FIELDS[newScheme] || [];
    if (available.length > 0) setField(available[0].value);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError("");

    try {
      // Step 1: Create Draft (Member 3 API)
      const draftRes = await api.post("/requests", {
        scheme,
        field,
        proposedValue,
        reason,
      });

      const newReq = draftRes.data.data;
      const requestId = newReq.requestId;

      // Step 2: Upload Evidence File if selected (Member 2 API)
      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);

        await api.post(`/requests/${requestId}/documents`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      // Step 3: Submit Request into Reviewer Queue
      await api.post(`/requests/${requestId}/submit`);

      // Reset and close
      setIsModalOpen(false);
      setProposedValue("");
      setReason("");
      setEvidenceFile(null);
      await fetchMyRequests();
    } catch (err) {
      setModalError(err.response?.data?.error?.message || "Submission failed. Please check inputs.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="portal-bg">
      {/* Navbar */}
      <nav className="portal-nav">
        <div className="nav-brand">🏛️ Gramin Seva</div>
        <div className="nav-actions">
          <span className={`role-badge role--${user?.role}`}>{user?.role}</span>
          <button className="nav-btn" onClick={() => navigate("/portal/profile")}>
            Profile
          </button>
          <button className="nav-btn nav-btn--logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="portal-content">
        <div className="page-header-row">
          <div className="page-header">
            <h1>My Correction Requests</h1>
            <p>Track your submitted correction requests and check verification statuses</p>
          </div>
          <button className="create-request-btn" onClick={() => setIsModalOpen(true)}>
            + New Request
          </button>
        </div>

        {error && <div className="error-card">⚠️ {error}</div>}

        {loading ? (
          <div className="loading-card">
            <div className="spinner-lg" />
            <p>Loading your requests...</p>
          </div>
        ) : (
          <div className="requests-card">
            <div className="requests-header">
              <span>{requests.length} Requests Found</span>
              <button className="refresh-link" onClick={fetchMyRequests}>
                🔄 Refresh
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="empty-requests">
                <span className="empty-icon">📭</span>
                <p>You haven't submitted any correction requests yet.</p>
                <button className="action-btn" onClick={() => setIsModalOpen(true)}>
                  Create Your First Request
                </button>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((req) => (
                  <div key={req.requestId} className="request-row">
                    <div className="req-id">{req.requestId}</div>
                    <div className="req-change">
                      <span className="req-field">
                        Scheme: <strong>{req.scheme}</strong> | Field: <strong>{req.field}</strong>
                      </span>
                      <span className="req-values">
                        <span className="old-val">{req.oldValue || "(empty)"}</span>
                        <span className="arrow">→</span>
                        <span className="new-val">{req.proposedValue}</span>
                      </span>
                      <span className="req-reason">"{req.reason}"</span>
                      {req.decisionReason && (
                        <span className="req-decision-note">
                          Decision note: {req.decisionReason}
                        </span>
                      )}
                    </div>
                    <div className="req-meta">
                      <StatusBadge status={req.status} />
                      <span className="req-date">
                        {new Date(req.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Create Correction Request</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Scheme</label>
                  <select
                    value={scheme}
                    onChange={(e) => handleSchemeChange(e.target.value)}
                    required
                  >
                    <option value="PMAY_G">PMAY-G (Pradhan Mantri Awas Yojana)</option>
                    <option value="MGNREGS">MGNREGS (Mahatma Gandhi NREGS)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Field to Correct</label>
                  <select
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    required
                  >
                    {(SCHEME_FIELDS[scheme] || []).map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Proposed New Value</label>
                  <input
                    type="text"
                    placeholder="Enter the correct value as per your documents"
                    value={proposedValue}
                    onChange={(e) => setProposedValue(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reason for Correction</label>
                  <textarea
                    rows="2"
                    placeholder="E.g., Spelling mismatch on card vs Aadhaar"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Supporting Document Evidence (PDF, PNG, JPG - max 5MB)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setEvidenceFile(e.target.files[0] || null)}
                  />
                  <small className="field-hint">
                    Uploaded file is securely verified by Member 2 automated checks.
                  </small>
                </div>

                {modalError && <div className="modal-error">⚠️ {modalError}</div>}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-btn btn--cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn btn--approve"
                  disabled={modalLoading}
                >
                  {modalLoading ? "Submitting Request..." : "Submit for Verification →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;

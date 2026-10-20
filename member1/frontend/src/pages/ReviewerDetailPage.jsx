import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import { VerificationReport } from "../components/VerificationReport";
import "./ReviewerDetailPage.css";

const ReviewerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [request, setRequest] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State for Decisions
  const [modalType, setModalType] = useState(null); // 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
  const [reasonInput, setReasonInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Request Details (Member 3 API)
      const reqRes = await api.get(`/requests/${id}`);
      setRequest(reqRes.data.data);

      // 2. Fetch Attached Documents (Member 2 API)
      try {
        const docRes = await api.get(`/requests/${id}/documents`);
        setDocuments(docRes.data.data || []);
      } catch (docErr) {
        console.warn("Could not load documents:", docErr.message);
      }

      // 3. Fetch Verification Checks (Member 2 API)
      try {
        const verRes = await api.get(`/requests/${id}/verification`);
        setVerification(verRes.data.data || null);
      } catch (verErr) {
        console.warn("No automated verification found:", verErr.message);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to load request details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDecision = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError("");

    try {
      await api.post(`/requests/${id}/decision`, {
        action: modalType,
        reason: reasonInput,
      });

      setModalType(null);
      setReasonInput("");
      await fetchData(); // Refresh request state
    } catch (err) {
      setActionError(err.response?.data?.error?.message || "Failed to submit decision.");
    } finally {
      setActionLoading(false);
    }
  };

  const isTerminal = request && ["APPROVED", "REJECTED"].includes(request.status);

  return (
    <div className="detail-bg">
      {/* Navbar */}
      <nav className="detail-nav">
        <div className="nav-left">
          <button className="back-btn" onClick={() => navigate("/reviewer/queue")}>
            ← Back to Queue
          </button>
          <span className="nav-title">Case: {id}</span>
        </div>
        <div className="nav-right">
          <span className="role-tag">Reviewer Console</span>
          <button className="nav-btn nav-btn--logout" onClick={logout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="detail-container">
        {loading ? (
          <div className="loading-card">
            <div className="spinner-lg" />
            <p>Loading case data and evidence...</p>
          </div>
        ) : error ? (
          <div className="error-card">⚠️ {error}</div>
        ) : request ? (
          <>
            {/* Top Summary Banner */}
            <div className="case-banner">
              <div className="banner-main">
                <span className="banner-id">{request.requestId}</span>
                <span className={`status-badge status--${request.status.toLowerCase()}`}>
                  {request.status.replace("_", " ")}
                </span>
                <span className="banner-scheme">{request.scheme}</span>
              </div>
              <div className="banner-sub">
                <span>Beneficiary ID: <strong>{request.beneficiaryId}</strong></span>
                <span>•</span>
                <span>Submitted: {new Date(request.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="detail-grid">
              {/* Left Column: Data Comparison & Justification */}
              <div className="detail-col-left">
                <div className="card comparison-card">
                  <h3 className="card-heading">Field Correction Details</h3>
                  <div className="field-tag-row">
                    <span className="field-label-tag">Target Field:</span>
                    <span className="field-name-tag">{request.field}</span>
                  </div>

                  <div className="diff-grid">
                    <div className="diff-box diff-box--old">
                      <span className="diff-label">Current Official Record</span>
                      <div className="diff-val">{request.oldValue || "(Empty / Unset)"}</div>
                    </div>
                    <div className="diff-box diff-box--new">
                      <span className="diff-label">Proposed New Value</span>
                      <div className="diff-val">{request.proposedValue}</div>
                    </div>
                  </div>

                  <div className="reason-section">
                    <h4 className="reason-title">Beneficiary's Justification</h4>
                    <p className="reason-text">"{request.reason}"</p>
                  </div>

                  {request.decisionReason && (
                    <div className="decision-reason-box">
                      <h4 className="reason-title">Official Decision Remarks</h4>
                      <p className="reason-text">{request.decisionReason}</p>
                    </div>
                  )}
                </div>

                {/* Evidence Documents Pane */}
                <div className="card documents-card">
                  <h3 className="card-heading">Supporting Documents ({documents.length})</h3>
                  {documents.length === 0 ? (
                    <p className="no-docs-text">⚠️ No supporting documents uploaded with this request.</p>
                  ) : (
                    <div className="docs-list">
                      {documents.map((doc) => (
                        <div key={doc._id} className="doc-item">
                          <div className="doc-info">
                            <span className="doc-icon">📎</span>
                            <div>
                              <div className="doc-name">{doc.originalName}</div>
                              <div className="doc-meta">
                                {(doc.size / 1024).toFixed(1)} KB • {doc.mimeType}
                              </div>
                            </div>
                          </div>
                          <a
                            href={`http://localhost:5001/api/requests/${id}/documents/${doc._id}/download`}
                            className="doc-download-btn"
                            target="_blank"
                            rel="noreferrer"
                          >
                            ⬇️ Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Automated Verification Engine & Decision Bar */}
              <div className="detail-col-right">
                {/* Decision Panel */}
                <div className="card action-card">
                  <h3 className="card-heading">Reviewer Decision Bar</h3>
                  {isTerminal ? (
                    <div className="terminal-state-banner">
                      <span>🔒 This request is in terminal status: <strong>{request.status}</strong>.</span>
                      <p>No further actions can be taken on this case.</p>
                    </div>
                  ) : (
                    <div className="decision-buttons-stack">
                      <button
                        className="decision-btn btn--approve"
                        onClick={() => setModalType("APPROVE")}
                      >
                        ✅ Approve Correction
                      </button>
                      <button
                        className="decision-btn btn--reject"
                        onClick={() => setModalType("REJECT")}
                      >
                        ❌ Reject Request
                      </button>
                      <button
                        className="decision-btn btn--info"
                        onClick={() => setModalType("REQUEST_INFO")}
                      >
                        ⚠️ Request More Information
                      </button>
                    </div>
                  )}
                </div>

                {/* Embedded Verification Report Component from Member 2 */}
                <VerificationReport
                  checks={verification?.checks || []}
                  overallStatus={verification?.overallStatus || "PENDING"}
                  ocrText={verification?.ocrExtractedText}
                />
              </div>
            </div>
          </>
        ) : null}

        {/* Modal for Decision Confirmation */}
        {modalType && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-header">
                <h3>
                  {modalType === "APPROVE" && "✅ Confirm Approval"}
                  {modalType === "REJECT" && "❌ Confirm Rejection"}
                  {modalType === "REQUEST_INFO" && "⚠️ Request Information"}
                </h3>
                <button className="modal-close-btn" onClick={() => setModalType(null)}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleDecision}>
                <div className="modal-body">
                  {modalType === "APPROVE" && (
                    <p className="modal-desc">
                      Approving this request will <strong>immediately and atomically mutate</strong> the
                      official beneficiary record for <code>{request?.beneficiaryId}</code>.
                    </p>
                  )}
                  {modalType === "REJECT" && (
                    <p className="modal-desc">
                      Please state the official reason for rejecting this correction request.
                      (<strong>Mandatory</strong>).
                    </p>
                  )}
                  {modalType === "REQUEST_INFO" && (
                    <p className="modal-desc">
                      Specify what additional proof or documents the beneficiary must provide.
                      (<strong>Mandatory</strong>).
                    </p>
                  )}

                  <label className="modal-label">
                    {modalType === "APPROVE" ? "Remarks / Audit Notes (Optional)" : "Mandatory Justification / Remarks"}
                  </label>
                  <textarea
                    className="modal-textarea"
                    rows="3"
                    placeholder="Enter official reviewer notes..."
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    required={modalType !== "APPROVE"}
                  />

                  {actionError && <div className="modal-error">⚠️ {actionError}</div>}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="modal-btn btn--cancel"
                    onClick={() => setModalType(null)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`modal-btn ${modalType === "APPROVE" ? "btn--approve" : modalType === "REJECT" ? "btn--reject" : "btn--info"}`}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : `Confirm ${modalType}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerDetailPage;

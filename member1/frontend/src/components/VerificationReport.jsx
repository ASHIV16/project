import React from "react";
import "./VerificationReport.css";

/**
 * VerificationBadge
 * Shows high-visibility status pill (PASS / FLAG / FAIL)
 */
export const VerificationBadge = ({ status }) => {
  const normStatus = (status || "").toUpperCase();
  const config = {
    PASS: { label: "PASSED", icon: "✅", className: "badge--pass" },
    FLAG: { label: "FLAGGED", icon: "⚠️", className: "badge--flag" },
    FAIL: { label: "FAILED", icon: "❌", className: "badge--fail" },
  }[normStatus] || { label: normStatus || "PENDING", icon: "⏳", className: "badge--pending" };

  return (
    <span className={`verification-badge ${config.className}`}>
      <span className="badge-icon">{config.icon}</span>
      <span className="badge-text">{config.label}</span>
    </span>
  );
};

/**
 * VerificationReport
 * Detailed checklist breakdown with icons, check names, and contextual notes.
 * Used by Member 3 in the Reviewer Interface.
 */
export const VerificationReport = ({ checks = [], overallStatus = "PENDING", ocrText = null }) => {
  return (
    <div className="verification-card">
      <div className="verification-card-header">
        <div className="header-left">
          <span className="header-icon">🛡️</span>
          <div>
            <h3 className="header-title">Automated Verification Engine</h3>
            <p className="header-subtitle">Deterministic rule checks and document validation</p>
          </div>
        </div>
        <VerificationBadge status={overallStatus} />
      </div>

      <div className="checks-list">
        {checks.length === 0 ? (
          <div className="no-checks">No automated checks run yet.</div>
        ) : (
          checks.map((item, idx) => {
            const isPass = item.status === "PASS";
            const isFlag = item.status === "FLAG";
            const isFail = item.status === "FAIL";

            return (
              <div
                key={item.name || idx}
                className={`check-item ${isPass ? "check--pass" : isFlag ? "check--flag" : "check--fail"}`}
              >
                <div className="check-status-col">
                  {isPass && <span className="status-symbol pass-symbol">✓</span>}
                  {isFlag && <span className="status-symbol flag-symbol">!</span>}
                  {isFail && <span className="status-symbol fail-symbol">✕</span>}
                </div>

                <div className="check-details-col">
                  <div className="check-name-row">
                    <span className="check-name">{formatCheckName(item.name)}</span>
                    <span className={`check-pill check-pill--${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="check-message">{item.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {ocrText && (
        <div className="ocr-snippet-box">
          <div className="ocr-title">📝 OCR Extracted Document Text</div>
          <pre className="ocr-content">{ocrText}</pre>
        </div>
      )}
    </div>
  );
};

const formatCheckName = (name = "") => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default VerificationReport;

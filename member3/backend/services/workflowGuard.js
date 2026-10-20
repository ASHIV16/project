// ── Enums & Rules from interface contracts ───────────────────
const SchemeType = {
  PMAY_G: "PMAY_G",
  MGNREGS: "MGNREGS",
};

const RequestStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  NEEDS_INFO: "NEEDS_INFO",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const ALLOWED_FIELDS = {
  [SchemeType.PMAY_G]: ["name", "village", "district", "contactNumber"],
  [SchemeType.MGNREGS]: ["jobCardHolderName", "village", "gramPanchayat", "contactNumber"],
};

// ── State Transition Map ─────────────────────────────────────
const VALID_TRANSITIONS = {
  [RequestStatus.DRAFT]: [RequestStatus.SUBMITTED],
  [RequestStatus.SUBMITTED]: [RequestStatus.UNDER_REVIEW, RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.NEEDS_INFO],
  [RequestStatus.UNDER_REVIEW]: [RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.NEEDS_INFO],
  [RequestStatus.NEEDS_INFO]: [RequestStatus.SUBMITTED],
  [RequestStatus.APPROVED]: [], // Terminal
  [RequestStatus.REJECTED]: [], // Terminal
};

/**
 * isValidTransition — verifies whether moving from currentStatus to nextStatus is allowed
 */
const isValidTransition = (currentStatus, nextStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
};

module.exports = {
  SchemeType,
  RequestStatus,
  ALLOWED_FIELDS,
  VALID_TRANSITIONS,
  isValidTransition,
};

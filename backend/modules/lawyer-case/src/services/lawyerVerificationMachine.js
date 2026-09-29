/**
 * Lawyer Verification State Machine
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Strict 5-Stage Verification Lifecycle:
 * pending_verification -> documents_submitted -> admin_review -> verified -> active
 * Suspended/Rejected terminal or recoverable states.
 */

export const VERIFICATION_STATES = {
  PENDING_VERIFICATION: 'pending_verification',
  DOCUMENTS_SUBMITTED: 'documents_submitted',
  ADMIN_REVIEW: 'admin_review',
  VERIFIED: 'verified',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
};

const ALLOWED_TRANSITIONS = {
  [VERIFICATION_STATES.PENDING_VERIFICATION]: [
    VERIFICATION_STATES.DOCUMENTS_SUBMITTED,
    VERIFICATION_STATES.REJECTED,
  ],
  [VERIFICATION_STATES.DOCUMENTS_SUBMITTED]: [
    VERIFICATION_STATES.ADMIN_REVIEW,
    VERIFICATION_STATES.REJECTED,
  ],
  [VERIFICATION_STATES.ADMIN_REVIEW]: [
    VERIFICATION_STATES.VERIFIED,
    VERIFICATION_STATES.DOCUMENTS_SUBMITTED, // If additional docs requested
    VERIFICATION_STATES.REJECTED,
  ],
  [VERIFICATION_STATES.VERIFIED]: [
    VERIFICATION_STATES.ACTIVE,
    VERIFICATION_STATES.SUSPENDED,
  ],
  [VERIFICATION_STATES.ACTIVE]: [
    VERIFICATION_STATES.SUSPENDED,
    VERIFICATION_STATES.ADMIN_REVIEW, // For re-audit
  ],
  [VERIFICATION_STATES.SUSPENDED]: [
    VERIFICATION_STATES.ADMIN_REVIEW,
    VERIFICATION_STATES.ACTIVE,
  ],
  [VERIFICATION_STATES.REJECTED]: [
    VERIFICATION_STATES.DOCUMENTS_SUBMITTED, // Re-apply
  ],
};

export class LawyerVerificationManager {
  static canTransition(currentState, nextState) {
    const validNextStates = ALLOWED_TRANSITIONS[currentState] || [];
    return validNextStates.includes(nextState);
  }

  static transition(lawyer, nextState, metadata = {}) {
    const current = lawyer.verification_status || VERIFICATION_STATES.PENDING_VERIFICATION;
    
    if (!this.canTransition(current, nextState)) {
      throw new Error(
        `Invalid state transition: Cannot move lawyer verification from '${current}' to '${nextState}'`
      );
    }

    // Validation rules per state
    if (nextState === VERIFICATION_STATES.DOCUMENTS_SUBMITTED) {
      if (!metadata.documents || metadata.documents.length === 0) {
        throw new Error('Mandatory verification documents (Bar Council ID / Degree) must be submitted.');
      }
    }

    if (nextState === VERIFICATION_STATES.VERIFIED) {
      if (!metadata.reviewedByAdminId) {
        throw new Error('Lawyers cannot be marked verified without designated Admin reviewer audit ID.');
      }
      if (!lawyer.bar_registration_number) {
        throw new Error('Valid State Bar Council registration number is required to verify.');
      }
    }

    return {
      ...lawyer,
      verification_status: nextState,
      updated_at: new Date().toISOString(),
      audit_log: [
        ...(lawyer.audit_log || []),
        {
          from: current,
          to: nextState,
          timestamp: new Date().toISOString(),
          actorId: metadata.actorId || 'system',
          remarks: metadata.remarks || '',
        },
      ],
    };
  }
}

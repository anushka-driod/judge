/**
 * Lawyer Complaint & Grievance Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Implements user grievance logging, admin internal mediation,
 * and formal statutory Bar Council escalation guidelines (Advocates Act, 1961 Section 35).
 */

export const COMPLAINT_CATEGORIES = {
  NON_RESPONSIVE: 'non_responsive',
  UNEXPECTED_FEES: 'unexpected_fees',
  FAILURE_TO_APPEAR: 'failure_to_appear',
  BREACH_OF_CONFIDENTIALITY: 'breach_of_confidentiality',
  SUSPECTED_MISCONDUCT: 'suspected_misconduct',
  OTHER: 'other',
};

export const COMPLAINT_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_INVESTIGATION: 'under_investigation',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
  ESCALATED_TO_BAR_COUNCIL: 'escalated_to_bar_council',
};

export class ComplaintService {
  /**
   * Registers a user complaint against an advocate.
   */
  static fileComplaint({ userId, lawyerId, caseId, category, description, evidenceDocs = [] }) {
    if (!description || description.trim().length < 20) {
      throw new Error('Complaint description must contain sufficient factual detail (minimum 20 characters).');
    }

    const complaint = {
      id: `comp-${Date.now()}`,
      user_id: userId,
      lawyer_id: lawyerId,
      case_id: caseId || null,
      category,
      description,
      supporting_evidence: evidenceDocs,
      status: COMPLAINT_STATUS.SUBMITTED,
      admin_notes: null,
      regulatory_escalation_info: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
    };

    // If suspected professional misconduct, attach official statutory grievance procedure
    if (category === COMPLAINT_CATEGORIES.SUSPECTED_MISCONDUCT) {
      complaint.regulatory_escalation_info = {
        governingBody: 'State Bar Council Disciplinary Committee',
        statutoryProvision: 'Section 35 of the Advocates Act, 1961',
        procedure: [
          'EarnLaw internal review will determine if platform suspension is warranted within 48 hours.',
          'For formal professional misconduct inquiries, a complaint in Form No. 1 must be filed before the Secretary of the concerned State Bar Council.',
          'The petition must be accompanied by an affidavit and prescribed court fee stamp.',
        ],
        disclaimer: 'EarnLaw mediates platform service standards but cannot adjudicate statutory Bar Council disciplinary powers.',
      };
    }

    return complaint;
  }

  /**
   * Admin mediation / review update.
   */
  static resolveComplaint(complaint, { status, adminNotes, actionTaken }) {
    if (!Object.values(COMPLAINT_STATUS).includes(status)) {
      throw new Error(`Invalid complaint resolution status: ${status}`);
    }

    return {
      ...complaint,
      status,
      admin_notes: adminNotes || '',
      action_taken: actionTaken || 'None',
      resolved_at: new Date().toISOString(),
    };
  }
}

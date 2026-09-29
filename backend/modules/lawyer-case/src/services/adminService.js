/**
 * Admin Dashboard & Oversight Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Implements:
 * - Reviewing pending lawyer verification applications
 * - Verifying / Rejecting lawyer credentials with audit logs
 * - Reviewing and resolving user complaints
 * - Managing lawyer specializations
 * - Platform compliance metrics
 */

import { LawyerVerificationManager, VERIFICATION_STATES } from './lawyerVerificationMachine.js';
import { COMPLAINT_STATUS } from './complaintService.js';

export class AdminService {
  /**
   * Approves and verifies an advocate after Bar Council authentication.
   */
  static verifyLawyer(lawyer, adminId, remarks) {
    // 1. Move to admin_review if in documents_submitted
    let current = lawyer;
    if (current.verification_status === VERIFICATION_STATES.DOCUMENTS_SUBMITTED) {
      current = LawyerVerificationManager.transition(current, VERIFICATION_STATES.ADMIN_REVIEW, {
        actorId: adminId,
        remarks: 'Admin opened credentials verification review.',
      });
    }

    // 2. Move to verified
    current = LawyerVerificationManager.transition(current, VERIFICATION_STATES.VERIFIED, {
      actorId: adminId,
      reviewedByAdminId: adminId,
      remarks: remarks || 'Verified active Bar Council registration and practicing certificates.',
    });

    // 3. Activate for discovery
    current = LawyerVerificationManager.transition(current, VERIFICATION_STATES.ACTIVE, {
      actorId: adminId,
      remarks: 'Lawyer is now publicly active on EarnLaw marketplace.',
    });

    return current;
  }

  /**
   * Rejects or requests re-submission of lawyer credentials.
   */
  static rejectLawyer(lawyer, adminId, reason) {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Mandatory rejection reason required for audit compliance.');
    }

    return LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.REJECTED, {
      actorId: adminId,
      remarks: reason,
    });
  }

  /**
   * Suspends a lawyer account pending grievance investigation.
   */
  static suspendLawyer(lawyer, adminId, reason) {
    return LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.SUSPENDED, {
      actorId: adminId,
      remarks: reason,
    });
  }

  /**
   * Updates complaint status with formal action taken.
   */
  static reviewComplaint(complaint, adminId, { newStatus, adminNotes, actionTaken }) {
    if (!Object.values(COMPLAINT_STATUS).includes(newStatus)) {
      throw new Error(`Invalid complaint status: ${newStatus}`);
    }

    return {
      ...complaint,
      status: newStatus,
      reviewed_by_admin_id: adminId,
      admin_notes: adminNotes || '',
      action_taken: actionTaken || 'None',
      resolved_at: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.DISMISSED].includes(newStatus)
        ? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
  }
}

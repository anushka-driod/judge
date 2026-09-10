/**
 * Case Tracking & Resolution Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Implements:
 * - 10-stage Case Status Lifecycle
 * - Audit-backed case timeline events
 * - Formal Case Resolution workflow
 */

export const CASE_STATUSES = {
  CREATED: 'created',
  UNDER_REVIEW: 'under_review',
  CONSULTATION_PENDING: 'consultation_pending',
  CONSULTATION_COMPLETED: 'consultation_completed',
  ACTION_REQUIRED: 'action_required',
  IN_PROGRESS: 'in_progress',
  AWAITING_RESPONSE: 'awaiting_response',
  HEARING: 'hearing',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

const timelineEventsStore = {};

export class CaseTrackingService {
  /**
   * Updates the status of a case and logs an audit event.
   */
  static updateStatus(caseObj, newStatus, { actorType = 'user', actorId = '', remarks = '' } = {}) {
    if (!Object.values(CASE_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid case status: '${newStatus}'`);
    }

    const previousStatus = caseObj.current_status;
    const updatedCase = {
      ...caseObj,
      current_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Log timeline event
    this.recordTimelineEvent({
      caseId: caseObj.id,
      actorType,
      actorId,
      eventType: 'status_changed',
      title: `Status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
      description: remarks || `Case transitioned from ${previousStatus} to ${newStatus}.`,
    });

    return updatedCase;
  }

  /**
   * Records an official milestone or timeline event.
   */
  static recordTimelineEvent({ caseId, actorType, actorId, eventType, title, description }) {
    if (!timelineEventsStore[caseId]) {
      timelineEventsStore[caseId] = [];
    }

    const event = {
      id: `evt-${Date.now()}-${timelineEventsStore[caseId].length + 1}`,
      case_id: caseId,
      actor_type: actorType, // 'user', 'lawyer', 'system', 'admin'
      actor_id: actorId,
      event_type: eventType,
      title,
      description,
      created_at: new Date().toISOString(),
    };

    timelineEventsStore[caseId].unshift(event); // newest first
    return event;
  }

  /**
   * Retrieves full chronologically audited timeline for a case.
   */
  static getTimeline(caseId) {
    return timelineEventsStore[caseId] || [];
  }

  /**
   * Formally closes and resolves a case.
   */
  static resolveCase(caseObj, { resolutionNotes, forumDecision = null, settlementAmount = null }) {
    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      throw new Error('Valid resolution summary or final order notes must be provided.');
    }

    const resolved = {
      ...caseObj,
      current_status: CASE_STATUSES.RESOLVED,
      resolution_notes: resolutionNotes,
      settlement_details: {
        decision: forumDecision,
        amount: settlementAmount,
      },
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.recordTimelineEvent({
      caseId: caseObj.id,
      actorType: 'lawyer',
      actorId: caseObj.assigned_lawyer_id || 'system',
      eventType: 'case_resolved',
      title: 'Case Successfully Resolved',
      description: resolutionNotes,
    });

    return resolved;
  }
}

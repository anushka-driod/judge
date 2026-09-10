/**
 * Second Opinion & Peer Review Workflow Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Facilitates independent advocate review of ongoing cases.
 * Ensures objective, professional peer review without AI bias or defamatory claims.
 */

export const SECOND_OPINION_STATUS = {
  REQUESTED: 'requested',
  IN_REVIEW: 'in_review',
  DELIVERED: 'delivered',
  DECLINED: 'declined',
};

export class SecondOpinionService {
  /**
   * Initializes a second opinion request.
   */
  static createRequest({ caseId, userId, originalLawyerId, secondLawyerId, userReason }) {
    if (originalLawyerId === secondLawyerId) {
      throw new Error('Second opinion advocate must be distinct from the primary consulting lawyer.');
    }
    if (!userReason || userReason.trim().length < 15) {
      throw new Error('Please provide specific reasons or questions for the independent second review.');
    }

    return {
      id: `secop-${Date.now()}`,
      case_id: caseId,
      user_id: userId,
      original_lawyer_id: originalLawyerId,
      second_lawyer_id: secondLawyerId,
      user_reason: userReason,
      status: SECOND_OPINION_STATUS.REQUESTED,
      second_lawyer_review: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Lawyer B submits independent findings.
   */
  static submitReview(secondOpinion, { alternativeStrategy, risksIdentified, recommendedAction, remarks }) {
    if (!secondOpinion || secondOpinion.status !== SECOND_OPINION_STATUS.REQUESTED) {
      throw new Error('Review can only be submitted for active requested second opinions.');
    }

    const reviewDocument = {
      alternativeStrategy: alternativeStrategy || '',
      risksIdentified: risksIdentified || [],
      recommendedAction: recommendedAction || '',
      formalRemarks: remarks || '',
      completedAt: new Date().toISOString(),
    };

    return {
      ...secondOpinion,
      status: SECOND_OPINION_STATUS.DELIVERED,
      second_lawyer_review: reviewDocument,
      updated_at: new Date().toISOString(),
    };
  }
}

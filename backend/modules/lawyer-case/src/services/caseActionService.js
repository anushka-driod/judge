/**
 * Case Action & Self-Help Management Service
 * Member 4: Legal Knowledge + Lawyer System Lead
 *
 * Distinguishes between:
 * - 'self_help' mode (guided step-by-step citizen roadmaps)
 * - 'lawyer_consultation' mode (lawyer-approved legal action plans)
 */

export const ACTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const CASE_MODES = {
  SELF_HELP: 'self_help',
  LAWYER_CONSULTATION: 'lawyer_consultation',
  PENDING_SELECTION: 'pending_selection',
};

// Procedural roadmap templates for common citizen legal matters in India
export const SELF_HELP_TEMPLATES = {
  consumer_dispute: [
    {
      title: 'Collate Purchase Invoice, Payment Receipts & Warranty Proof',
      description: 'Collect all physical or digital receipts showing vendor details, date, and exact price paid.',
      whyItMatters: 'Consumer commissions require verified proof of consideration to establish consumer status under Section 2(7).',
      requiredDocumentType: 'invoice',
      priority: 'high',
      dueDays: 3,
    },
    {
      title: 'Preserve Written Communications & Refusal Evidence',
      description: 'Export email threads, chat logs, or registered letters showing vendor refusal or failure to remediate.',
      whyItMatters: 'Demonstrates deficiency in service and proves pre-litigation attempt to resolve.',
      requiredDocumentType: 'correspondence',
      priority: 'high',
      dueDays: 5,
    },
    {
      title: 'Dispatch Formal Statutory Demand Notice (15-Day Cure Period)',
      description: 'Send registered legal notice giving 15 days to refund/replace before approaching the commission.',
      whyItMatters: 'Courts view reasonable notice favorably and vendors frequently settle at notice stage.',
      requiredDocumentType: 'legal_notice',
      priority: 'high',
      dueDays: 10,
    },
    {
      title: 'File Online Grievance on National Consumer Helpline (NCH / 1915)',
      description: 'Lodge free pre-litigation conciliation complaint via consumerhelpline.gov.in.',
      whyItMatters: 'Official government portal resolves over 60% of e-commerce & retail disputes without litigation costs.',
      requiredDocumentType: 'helpline_docket',
      priority: 'medium',
      dueDays: 15,
    },
    {
      title: 'E-Daakhil Online Commission Filing (If Conciliation Fails)',
      description: 'Register and submit complaint directly on the e-Daakhil portal (edaakhil.nic.in) for District Forum.',
      whyItMatters: 'Allows ordinary consumers to file and track cases without compulsory advocate engagement.',
      requiredDocumentType: 'complaint_petition',
      priority: 'high',
      dueDays: 30,
    },
  ],
  cheque_bounce: [
    {
      title: 'Obtain Original Dishonoured Cheque & Bank Return Memo',
      description: 'Collect the official slip stamped by the bank stating the reason for return (e.g. Funds Insufficient).',
      whyItMatters: 'The 30-day statutory limitation under Section 138 of the NI Act starts from the date of the memo.',
      requiredDocumentType: 'bank_return_memo',
      priority: 'high',
      dueDays: 2,
    },
    {
      title: 'Send Statutory 15-Day Demand Notice via Speed Post / Registered AD',
      description: 'Draft and dispatch notice demanding payment of the cheque amount within 15 days of receipt.',
      whyItMatters: 'Failure to issue notice within 30 days of bank memo forfeits the right to file criminal complaint.',
      requiredDocumentType: 'statutory_notice',
      priority: 'high',
      dueDays: 7,
    },
    {
      title: 'Track Postal Delivery and Secure Delivery Confirmation (POD)',
      description: 'Download the delivery tracking report from the India Post website showing date of delivery.',
      whyItMatters: 'The 15-day cure clock begins precisely from the date of delivery to the drawer.',
      requiredDocumentType: 'postal_receipt',
      priority: 'high',
      dueDays: 16,
    },
  ],
};

export class CaseActionService {
  /**
   * Initializes or assigns a case action plan.
   */
  static generateSelfHelpPlan(caseId, categorySlug) {
    const template = SELF_HELP_TEMPLATES[categorySlug] || SELF_HELP_TEMPLATES.consumer_dispute;
    const now = Date.now();

    return template.map((item, index) => ({
      id: `act-${caseId}-${index + 1}`,
      case_id: caseId,
      assigned_by_type: 'system_procedural_guide',
      assigned_by_id: 'earnlaw_self_help',
      title: item.title,
      description: item.description,
      why_it_matters: item.whyItMatters,
      required_document_type: item.requiredDocumentType,
      priority: item.priority,
      due_date: new Date(now + item.dueDays * 86400000).toISOString().split('T')[0],
      status: index === 0 ? ACTION_STATUS.IN_PROGRESS : ACTION_STATUS.PENDING,
      sort_order: index + 1,
      completed_at: null,
      created_at: new Date().toISOString(),
    }));
  }

  /**
   * Updates an action's state and automatically calculates milestone progress.
   */
  static updateActionStatus(actions, actionId, newStatus) {
    let updatedTarget = null;

    const updatedActions = actions.map((action) => {
      if (action.id === actionId) {
        updatedTarget = {
          ...action,
          status: newStatus,
          completed_at: newStatus === ACTION_STATUS.COMPLETED ? new Date().toISOString() : null,
        };
        return updatedTarget;
      }
      return action;
    });

    if (!updatedTarget) {
      throw new Error(`Action with ID ${actionId} not found in plan`);
    }

    const completedCount = updatedActions.filter((a) => a.status === ACTION_STATUS.COMPLETED).length;
    const progressPercentage = Math.round((completedCount / updatedActions.length) * 100);

    return {
      actions: updatedActions,
      progressPercentage,
      isFullyCompleted: completedCount === updatedActions.length,
    };
  }
}

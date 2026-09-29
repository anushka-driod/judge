import LawyerPortalService, { VERIFICATION_STATUSES } from '../services/lawyerPortalService.js';

export const LawyerPortalController = {
  // 1. Lawyer Auth & Profile
  async register(req, res) {
    try {
      const result = await LawyerPortalService.registerLawyer(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await LawyerPortalService.loginLawyer(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ success: false, error: err.message });
    }
  },

  async getMe(req, res) {
    try {
      const lawyer = await LawyerPortalService.getLawyerProfile(req.user.lawyerId || req.user.email);
      if (!lawyer) {
        return res.status(404).json({ success: false, error: 'Lawyer profile not found.' });
      }
      res.json({
        success: true,
        lawyer,
        verification_status: lawyer.verification_status,
        isVerified: lawyer.verification_status === VERIFICATION_STATUSES.VERIFIED,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async updateProfile(req, res) {
    try {
      const lawyerId = req.user.lawyerId || req.user.id;
      const updated = await LawyerPortalService.updateLawyerProfile(lawyerId, req.body);
      res.json({ success: true, lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // Verification Guard Helper
  async checkVerification(req, res) {
    const identifier = req.user.lawyerId || req.user.email || req.user.id;
    const lawyer = await LawyerPortalService.getLawyerProfile(identifier);
    if (!lawyer) {
      res.status(404).json({ success: false, error: 'Lawyer profile not found.' });
      return null;
    }
    if (lawyer.verification_status !== VERIFICATION_STATUSES.VERIFIED) {
      res.status(403).json({
        success: false,
        error: `Lawyer portal access restricted. Current verification status is '${lawyer.verification_status}'.`,
        verification_status: lawyer.verification_status,
        remarks: lawyer.admin_remarks,
      });
      return null;
    }
    return lawyer;
  },

  // 2. Lawyer Dashboard
  async getDashboard(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const dashboard = await LawyerPortalService.getDashboardMetrics(lawyer.id);
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // 3. Consultation Requests
  async getRequests(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const requests = await LawyerPortalService.getConsultationRequests(lawyer.id);
      res.json({ success: true, count: requests.length, requests });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getRequestById(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const request = await LawyerPortalService.getConsultationRequestById(req.params.id, lawyer.id);
      if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });
      res.json({ success: true, request });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async acceptRequest(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const accepted = await LawyerPortalService.acceptConsultationRequest(
        req.params.id,
        lawyer.id,
        req.body.remarks
      );
      res.json({ success: true, message: 'Consultation request accepted.', request: accepted });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async rejectRequest(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const rejected = await LawyerPortalService.rejectConsultationRequest(
        req.params.id,
        lawyer.id,
        req.body.reason
      );
      res.json({ success: true, message: 'Consultation request rejected.', request: rejected });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async requestMoreInfo(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const updated = await LawyerPortalService.requestMoreInfo(
        req.params.id,
        lawyer.id,
        req.body.questions
      );
      res.json({ success: true, message: 'Additional information requested.', request: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 4. Case Workspace
  async getCases(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const cases = await LawyerPortalService.getLawyerCases(lawyer.id);
      res.json({ success: true, count: cases.length, cases });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getCaseById(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const workspace = await LawyerPortalService.getCaseWorkspace(req.params.caseId, lawyer.id);
      res.json({ success: true, ...workspace });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  },

  async getCaseDocuments(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const workspace = await LawyerPortalService.getCaseWorkspace(req.params.caseId, lawyer.id);
      res.json({ success: true, documents: workspace.sharedDocuments });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  },

  // 5. Case AI / RAG Grounded Research
  async getCaseAiResearch(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const research = await LawyerPortalService.getCaseAiResearch(req.params.caseId, lawyer.id);
      res.json(research);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // 6. Case Notes
  async getCaseNotes(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const notes = await LawyerPortalService.getCaseNotes(req.params.caseId, lawyer.id, req.user.role);
      res.json({ success: true, count: notes.length, notes });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async addCaseNote(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const note = await LawyerPortalService.addCaseNote(req.params.caseId, lawyer.id, {
        type: req.body.type,
        content: req.body.content,
        authorName: lawyer.name,
      });
      res.status(201).json({ success: true, note });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 7. Action Plan
  async getActionPlan(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const actions = await LawyerPortalService.getActionPlan(req.params.caseId);
      res.json({ success: true, actions });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async addActionItem(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const item = await LawyerPortalService.addActionItem(req.params.caseId, lawyer.id, req.body);
      res.status(201).json({ success: true, item });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async updateActionItem(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const updated = await LawyerPortalService.updateActionItem(
        req.params.caseId,
        req.params.actionId,
        req.body
      );
      res.json({ success: true, item: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 8. Messages & Chat
  async getMessages(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const messages = await LawyerPortalService.getCaseMessages(
        req.params.caseId,
        lawyer.id,
        req.user.role
      );
      res.json({ success: true, count: messages.length, messages });
    } catch (err) {
      res.status(403).json({ success: false, error: err.message });
    }
  },

  async sendMessage(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const msg = await LawyerPortalService.sendCaseMessage(req.params.caseId, {
        senderId: lawyer.id,
        senderName: lawyer.name,
        senderRole: 'lawyer',
        text: req.body.text,
        attachments: req.body.attachments,
      });
      res.status(201).json({ success: true, message: msg });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 9. Timeline
  async getTimeline(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const timeline = await LawyerPortalService.getCaseTimeline(req.params.caseId);
      res.json({ success: true, timeline });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async addTimelineEvent(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const ev = await LawyerPortalService.addCaseTimelineEvent(req.params.caseId, {
        event: req.body.event,
        description: req.body.description,
        actor: lawyer.name,
      });
      res.status(201).json({ success: true, timelineEvent: ev });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 10. Availability & Consultations
  async getAvailability(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const availability = await LawyerPortalService.getLawyerAvailability(lawyer.id);
      res.json({ success: true, ...availability });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async updateAvailability(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const updated = await LawyerPortalService.updateLawyerAvailability(lawyer.id, req.body);
      res.json({ success: true, availability: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async getConsultations(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const requests = await LawyerPortalService.getConsultationRequests(lawyer.id);
      const consultations = requests.filter((r) => r.status === 'accepted' || r.status === 'completed');
      res.json({ success: true, count: consultations.length, consultations });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 11. Earnings
  async getEarnings(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const earnings = await LawyerPortalService.getLawyerEarnings(lawyer.id);
      res.json({ success: true, ...earnings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // 12. Calls
  async initiateCall(req, res) {
    try {
      const lawyer = await LawyerPortalController.checkVerification(req, res);
      if (!lawyer) return;

      const session = await LawyerPortalService.initiateCallSession(req.body.caseId, lawyer.id, {
        consultationType: req.body.consultationType || 'video',
      });
      res.status(201).json({ success: true, session });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async endCall(req, res) {
    try {
      const session = await LawyerPortalService.endCallSession(req.params.callId, req.body);
      res.json({ success: true, session });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  // 13. Admin Oversight APIs
  async adminGetLawyers(req, res) {
    try {
      const list = await LawyerPortalService.adminListLawyers(req.query.status);
      res.json({ success: true, count: list.length, lawyers: list });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async adminGetLawyerById(req, res) {
    try {
      const lawyer = await LawyerPortalService.adminGetLawyerById(req.params.id);
      res.json({ success: true, lawyer });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  },

  async adminReviewLawyer(req, res) {
    try {
      const updated = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        VERIFICATION_STATUSES.UNDER_REVIEW,
        req.body.remarks || 'Application placed under formal administrative review.',
        req.user?.email || 'admin@vidhisetu.in'
      );
      res.json({ success: true, message: 'Status updated to UNDER_REVIEW.', lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async adminApproveLawyer(req, res) {
    try {
      const updated = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        VERIFICATION_STATUSES.VERIFIED,
        req.body.remarks || 'Bar Council registration & credentials verified.',
        req.user?.email || 'admin@vidhisetu.in'
      );
      res.json({ success: true, message: 'Lawyer verified successfully.', lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async adminRejectLawyer(req, res) {
    try {
      const updated = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        VERIFICATION_STATUSES.REJECTED,
        req.body.reason || 'Verification criteria not satisfied.',
        req.user?.email || 'admin@vidhisetu.in'
      );
      res.json({ success: true, message: 'Lawyer application rejected.', lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async adminRequestInfo(req, res) {
    try {
      const updated = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        VERIFICATION_STATUSES.PENDING,
        req.body.remarks || 'Additional documentation required from applicant.',
        req.user?.email || 'admin@vidhisetu.in'
      );
      res.json({ success: true, message: 'Additional info requested.', lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async adminSuspendLawyer(req, res) {
    try {
      const updated = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        VERIFICATION_STATUSES.SUSPENDED,
        req.body.reason || 'Practice access suspended pending inquiry.',
        req.user?.email || 'admin@vidhisetu.in'
      );
      res.json({ success: true, message: 'Lawyer account suspended.', lawyer: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async adminGetAuditLogs(req, res) {
    try {
      const logs = LawyerPortalService.getAuditLogs(parseInt(req.query.limit || '50', 10));
      res.json({ success: true, count: logs.length, auditLogs: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  // 14. Client Consent Endpoints
  async grantConsent(req, res) {
    try {
      const { caseId } = req.params;
      const { lawyerId, sharedDocumentIds, consentScope } = req.body;
      const clientId = req.user?.id || 'usr_001';

      const consent = await LawyerPortalService.grantClientConsent(
        caseId,
        clientId,
        lawyerId,
        { sharedDocumentIds, consentScope }
      );
      res.status(201).json({ success: true, consent });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async revokeConsent(req, res) {
    try {
      const { caseId } = req.params;
      const { lawyerId } = req.body;
      const clientId = req.user?.id || 'usr_001';

      const consent = await LawyerPortalService.revokeClientConsent(caseId, clientId, lawyerId);
      res.json({ success: true, message: 'Consent successfully revoked.', consent });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },
};

export default LawyerPortalController;

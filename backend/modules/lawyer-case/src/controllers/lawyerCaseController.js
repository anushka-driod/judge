/**
 * Express Controller for Member 4 Modules
 * Full Suite: Legal Knowledge, Lawyers, Matching, Consultations,
 * Self-Help, Action Plans, Documents, Case Tracking, Reminders,
 * Second Opinions, Complaints & Admin Panel
 */

import { LawyerMatchingEngine } from '../services/matchingEngine.js';
import { CaseActionService, ACTION_STATUS } from '../services/caseActionService.js';
import { SecondOpinionService } from '../services/secondOpinionService.js';
import { ComplaintService } from '../services/complaintService.js';
import { LegalKnowledgeService } from '../services/legalKnowledgeService.js';
import { CaseTrackingService, CASE_STATUSES } from '../services/caseTrackingService.js';
import { DocumentService } from '../services/documentService.js';
import { ReminderService } from '../services/reminderService.js';
import { AdminService } from '../services/adminService.js';
import LawyerPortalService from '../../../../src/services/lawyerPortalService.js';

async function getAllVerifiedLawyers() {
  const portalLawyers = await LawyerPortalService.adminListLawyers();

  // STRICT RULE: Only return approved/active advocates!
  // Pending, rejected, and suspended advocates are strictly excluded from the citizen directory.
  const activeAdvocates = portalLawyers.filter((l) => {
    const status = String(l.verification_status || '').toUpperCase();
    return status === 'VERIFIED' || status === 'ACTIVE';
  });

  return activeAdvocates.map((l) => {
    const specs = Array.isArray(l.specializations)
      ? l.specializations
      : (typeof l.specializations === 'string' ? JSON.parse(l.specializations) : []);
    const langs = Array.isArray(l.languages)
      ? l.languages
      : (typeof l.languages === 'string' ? JSON.parse(l.languages) : []);
    const barNum = l.bar_registration_number || l.barRegistrationNumber || l.barNumber || null;
    const courtName = l.primary_court || l.primaryCourt || null;
    const city = l.location_city || l.city || null;
    const state = l.state_bar_council || l.state || null;

    return {
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      photoUrl: l.photoUrl || null,
      bar_registration_number: barNum,
      barCouncilId: barNum,
      state_bar_council: state,
      years_of_experience: Number(l.years_of_experience || l.yearsOfExperience || 0),
      experienceYears: Number(l.years_of_experience || l.yearsOfExperience || 0),
      primary_court: courtName,
      court: courtName,
      location_city: city,
      location: city && state ? `${city}, ${state}` : city || state || null,
      languages: langs,
      specializations: specs,
      practiceAreas: specs,
      consultation_fee: Number(l.consultation_fee || l.consultationFee || 0),
      consultationFee: Number(l.consultation_fee || l.consultationFee || 0),
      consultation_modes: l.consultation_modes || l.consultationModes || [],
      verification_status: 'VERIFIED',
      isVerifiedAdvocate: true,
      is_available: l.is_available !== false,
      source: 'VidhiSetu Verified Advocate',
      rating: l.rating_avg || null,
      rating_avg: l.rating_avg || null,
      reviewCount: l.review_count || 0,
      profile_bio: l.profile_bio || l.bio || '',
      bio: l.profile_bio || l.bio || '',
      availableDays: l.availability?.workingDays || [],
      timeSlots: l.availability?.slots || [],
    };
  });
}

let casesStore = {};
let consultationsStore = [];
let caseActionsStore = {};
let complaintsStore = [];
let secondOpinionsStore = [];

export const LawyerCaseController = {
  // 1. Legal Knowledge Base
  getLaws(req, res) {
    const laws = LegalKnowledgeService.getLaws(req.query);
    res.json({ success: true, count: laws.length, laws });
  },

  getLawById(req, res) {
    const law = LegalKnowledgeService.getLawById(req.params.id);
    if (!law) return res.status(404).json({ success: false, message: 'Law not found' });
    res.json({ success: true, law });
  },

  getPrecedents(req, res) {
    const precedents = LegalKnowledgeService.getPrecedents(req.query);
    res.json({ success: true, count: precedents.length, precedents });
  },

  getCaseRelationships(req, res) {
    const relationships = LegalKnowledgeService.getCaseRelationships(req.params.id);
    res.json({ success: true, count: relationships.length, relationships });
  },

  addCaseRelationship(req, res) {
    try {
      const rel = LegalKnowledgeService.addCaseRelationship(req.body);
      res.status(201).json({ success: true, relationship: rel });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 2. Lawyer Directory & Recommendations (Only Approved/Active Advocates)
  async getLawyers(req, res) {
    try {
      const { search, maxFee, city } = req.query;
      let results = await getAllVerifiedLawyers();

      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            (Array.isArray(l.specializations) && l.specializations.some((s) => s.toLowerCase().includes(q))) ||
            (l.location_city && l.location_city.toLowerCase().includes(q))
        );
      }
      if (maxFee) {
        results = results.filter((l) => (l.consultation_fee || 0) <= Number(maxFee));
      }
      if (city) {
        results = results.filter((l) => (l.location_city || '').toLowerCase() === city.toLowerCase());
      }

      res.json({ success: true, count: results.length, lawyers: results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getLawyerById(req, res) {
    try {
      const verifiedLawyers = await getAllVerifiedLawyers();
      const lawyer = verifiedLawyers.find((l) => l.id === req.params.id);
      if (!lawyer) {
        return res.status(404).json({
          success: false,
          code: 'ADVOCATE_NOT_AVAILABLE',
          message: 'Advocate not found or not currently active for consultations.',
        });
      }
      res.json({ success: true, lawyer });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getRecommendations(req, res) {
    const { category, jurisdiction, city, court, mode, minExperience } = req.query;
    const verifiedLawyers = await getAllVerifiedLawyers();

    const scored = LawyerMatchingEngine.rankLawyers(
      {
        category: category || '',
        jurisdiction: jurisdiction || '',
        city: city || '',
        preferredCourt: court || '',
        preferredMode: mode || 'video',
        minExperience: Number(minExperience) || 0,
      },
      verifiedLawyers
    );

    res.json({ success: true, count: scored.length, matches: scored });
  },

  // 3. Consultations (Validated, Persisted, and Synchronized with Advocate Portal)
  async bookConsultation(req, res) {
    try {
      const { caseId, lawyerId, scheduledDate, timeSlot, consultationMode, userNotes, legalIssue, caseTitle } = req.body;
      const verifiedLawyers = await getAllVerifiedLawyers();
      const lawyer = verifiedLawyers.find((l) => l.id === lawyerId);

      // Prevent users from requesting consultations with pending, rejected, or suspended advocates
      if (!lawyer) {
        return res.status(400).json({
          success: false,
          code: 'ADVOCATE_NOT_AVAILABLE',
          message: 'Cannot request consultation with an unverified, suspended, or inactive advocate.',
        });
      }

      const userId = req.user?.id || req.body.userId || 'usr_001';
      const userName = req.user?.name || req.body.userName || 'Client';
      const userEmail = req.user?.email || req.body.userEmail || '';
      const userPhone = req.user?.phone || req.body.userPhone || '';
      const isPaid = Boolean(req.body.transactionRef || req.body.paymentId);

      const booking = {
        id: `cons-${Date.now()}`,
        case_id: caseId || `case-${Date.now()}`,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        user_phone: userPhone,
        lawyer_id: lawyerId,
        lawyer_name: lawyer.name,
        scheduled_date: scheduledDate || new Date().toISOString().split('T')[0],
        time_slot: timeSlot || '10:00 AM',
        consultation_mode: consultationMode || 'video',
        fee_amount: lawyer.consultation_fee || 1000,
        payment_status: isPaid ? 'PAYMENT_SUCCESSFUL' : 'PENDING_PAYMENT',
        transaction_ref: req.body.transactionRef || req.body.paymentId || null,
        status: 'pending',
        meeting_link: isPaid && consultationMode === 'video' ? `https://meet.vidhisetu.in/room-${Date.now()}` : null,
        user_notes: userNotes || legalIssue || '',
        legal_issue: legalIssue || userNotes || 'Legal consultation request',
        case_title: caseTitle || 'Consultation Request',
        created_at: new Date().toISOString(),
      };

      consultationsStore.push(booking);

      // Synchronize request to LawyerPortalService so advocate sees it in /lawyer/requests
      LawyerPortalService.addConsultationRequest({
        id: booking.id,
        caseId: booking.case_id,
        clientId: userId,
        clientName: userName,
        clientEmail: userEmail,
        clientPhone: userPhone,
        lawyerId: lawyerId,
        caseTitle: booking.case_title,
        category: req.body.category || 'Citizen Consultation Request',
        shortSummary: booking.user_notes,
        jurisdiction: lawyer.primary_jurisdiction || 'General',
        sharedDocuments: req.body.sharedDocuments || [],
        consultationType: booking.consultation_mode,
        requestedDate: booking.scheduled_date,
        requestedTime: booking.time_slot,
        durationMinutes: 30,
        feeAmount: booking.fee_amount,
        paymentStatus: booking.payment_status,
        transactionRef: booking.transaction_ref,
        status: booking.status,
        clientNotes: booking.user_notes,
        meetingLink: booking.meeting_link,
        createdAt: booking.created_at,
      });

      // Update case status to consultation_pending
      if (casesStore[booking.case_id]) {
        casesStore[booking.case_id] = CaseTrackingService.updateStatus(
          casesStore[booking.case_id],
          CASE_STATUSES.CONSULTATION_PENDING,
          { actorType: 'user', remarks: `Initiated consultation with ${lawyer.name}` }
        );
      }

      res.status(201).json({ success: true, consultation: booking });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getMyConsultations(req, res) {
    const userId = req.user?.id || req.query.userId;
    const lawyerId = req.user?.lawyerId || req.query.lawyerId;
    const role = (req.user?.role || '').toLowerCase();

    // Pull real-time status updates from LawyerPortalService.consultationRequests
    const portalRequests = LawyerPortalService.getConsultationRequestsList();
    for (const pr of portalRequests) {
      const match = consultationsStore.find((c) => c.id === pr.id);
      if (match) {
        match.status = pr.status;
        match.meeting_link = pr.meetingLink || match.meeting_link;
        match.lawyer_remarks = pr.lawyerRemarks || match.lawyer_remarks;
        match.rejection_reason = pr.rejectionReason || match.rejection_reason;
      }
    }

    let results = consultationsStore;
    if (role === 'admin') {
      return res.json({ success: true, count: results.length, consultations: results });
    }

    if (lawyerId) {
      results = results.filter((c) => c.lawyer_id === lawyerId);
    } else if (userId) {
      results = results.filter((c) => c.user_id === userId);
    }

    res.json({ success: true, count: results.length, consultations: results });
  },

  getConsultationById(req, res) {
    const { id } = req.params;
    const consultation = consultationsStore.find((c) => c.id === id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found.' });
    }

    // Strict access control: only citizen who booked it, assigned lawyer, or admin
    const userId = req.user?.id;
    const lawyerId = req.user?.lawyerId;
    const role = (req.user?.role || '').toLowerCase();

    const isOwnerCitizen = userId && consultation.user_id === userId;
    const isAssignedLawyer = lawyerId && consultation.lawyer_id === lawyerId;
    const isAdmin = role === 'admin';

    if (!isOwnerCitizen && !isAssignedLawyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_CONSULTATION_ACCESS',
        error: 'Unauthorized. You do not have permission to view another client\'s consultation details.',
      });
    }

    // Sync latest status
    const portalReq = LawyerPortalService.getConsultationRequestsList().find((r) => r.id === id);
    if (portalReq) {
      consultation.status = portalReq.status;
      consultation.meeting_link = portalReq.meetingLink || consultation.meeting_link;
      consultation.lawyer_remarks = portalReq.lawyerRemarks || consultation.lawyer_remarks;
      consultation.rejection_reason = portalReq.rejectionReason || consultation.rejection_reason;
    }

    res.json({ success: true, consultation });
  },

  // 4. Case Action Plans
  getActionPlan(req, res) {
    const { id } = req.params;
    const { category } = req.query;

    if (!caseActionsStore[id]) {
      caseActionsStore[id] = CaseActionService.generateSelfHelpPlan(id, category || 'consumer_dispute');
    }

    const actions = caseActionsStore[id];
    const completed = actions.filter((a) => a.status === ACTION_STATUS.COMPLETED).length;
    const progress = Math.round((completed / actions.length) * 100);

    res.json({
      success: true,
      caseId: id,
      progressPercentage: progress,
      actions,
    });
  },

  updateActionStatus(req, res) {
    const { id, actionId } = req.params;
    const { status } = req.body;

    if (!caseActionsStore[id]) {
      return res.status(404).json({ success: false, message: 'Case action plan not initialized' });
    }

    try {
      const updated = CaseActionService.updateActionStatus(caseActionsStore[id], actionId, status);
      caseActionsStore[id] = updated.actions;
      res.json({ success: true, ...updated });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 5. Case Documents Vault
  registerDocument(req, res) {
    try {
      const doc = DocumentService.registerDocument({
        ...req.body,
        caseId: req.params.id,
      });
      res.status(201).json({ success: true, document: doc });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  getDocuments(req, res) {
    const docs = DocumentService.getCaseDocuments(req.params.id);
    res.json({ success: true, count: docs.length, documents: docs });
  },

  verifyDocument(req, res) {
    try {
      const doc = DocumentService.verifyDocument(req.params.id, req.params.docId, req.body.lawyerId);
      res.json({ success: true, document: doc });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 6. Case Tracking, Timeline & Resolution
  getTimeline(req, res) {
    const timeline = CaseTrackingService.getTimeline(req.params.id);
    res.json({ success: true, count: timeline.length, timeline });
  },

  updateCaseStatus(req, res) {
    const { id } = req.params;
    const { status, remarks, actorType, actorId } = req.body;
    if (!casesStore[id]) return res.status(404).json({ success: false, message: 'Case not found' });

    try {
      casesStore[id] = CaseTrackingService.updateStatus(casesStore[id], status, {
        actorType,
        actorId,
        remarks,
      });
      res.json({ success: true, case: casesStore[id] });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  resolveCase(req, res) {
    const { id } = req.params;
    if (!casesStore[id]) return res.status(404).json({ success: false, message: 'Case not found' });

    try {
      casesStore[id] = CaseTrackingService.resolveCase(casesStore[id], req.body);
      res.json({ success: true, case: casesStore[id] });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 7. Reminders & Deadlines
  createReminder(req, res) {
    try {
      const reminder = ReminderService.createReminder(req.body);
      res.status(201).json({ success: true, reminder });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  getReminders(req, res) {
    const { userId, caseId } = req.query;
    if (caseId) {
      return res.json({ success: true, reminders: ReminderService.getRemindersForCase(caseId) });
    }
    res.json({ success: true, reminders: ReminderService.getRemindersForUser(userId || 'usr_001') });
  },

  dismissReminder(req, res) {
    try {
      const rem = ReminderService.dismissReminder(req.params.id);
      res.json({ success: true, reminder: rem });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  },

  // 8. Second Opinions
  requestSecondOpinion(req, res) {
    try {
      const secOp = SecondOpinionService.createRequest(req.body);
      secondOpinionsStore.push(secOp);
      res.status(201).json({ success: true, secondOpinion: secOp });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 9. Complaints & Grievances
  fileComplaint(req, res) {
    try {
      const complaint = ComplaintService.fileComplaint(req.body);
      complaintsStore.push(complaint);
      res.status(201).json({ success: true, complaint });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // 10. Admin Management Panel
  async adminVerifyLawyer(req, res) {
    try {
      const verified = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        'VERIFIED',
        req.body.remarks || 'Application approved after administrative review.',
        req.user.id
      );
      res.json({ success: true, lawyer: verified });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  async adminRejectLawyer(req, res) {
    try {
      const rejected = await LawyerPortalService.adminUpdateLawyerStatus(
        req.params.id,
        'REJECTED',
        req.body.reason || 'Application rejected after administrative review.',
        req.user.id
      );
      res.json({ success: true, lawyer: rejected });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  adminGetComplaints(req, res) {
    res.json({ success: true, count: complaintsStore.length, complaints: complaintsStore });
  },

  adminUpdateComplaint(req, res) {
    const complaint = complaintsStore.find((c) => c.id === req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

    try {
      const reviewed = AdminService.reviewComplaint(complaint, req.body.adminId || 'admin_super', req.body);
      const idx = complaintsStore.findIndex((c) => c.id === req.params.id);
      complaintsStore[idx] = reviewed;
      res.json({ success: true, complaint: reviewed });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  getNotifications(req, res) {
    res.json({
      success: true,
      notifications: [
        {
          id: 'notif-01',
          title: 'VidhiSetu Verified Legal Network',
          message: 'Welcome to VidhiSetu. Your account is active. Consult verified advocates or get AI guidance.',
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  },
};

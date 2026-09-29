/**
 * Express Controller for Member 4 Modules
 * Full Suite: Legal Knowledge, Lawyers, Matching, Consultations,
 * Self-Help, Action Plans, Documents, Case Tracking, Reminders,
 * Second Opinions, Complaints & Admin Panel
 */

import { LawyerVerificationManager, VERIFICATION_STATES } from '../services/lawyerVerificationMachine.js';
import { LawyerMatchingEngine } from '../services/matchingEngine.js';
import { CaseActionService, ACTION_STATUS } from '../services/caseActionService.js';
import { SecondOpinionService } from '../services/secondOpinionService.js';
import { ComplaintService } from '../services/complaintService.js';
import { LegalKnowledgeService } from '../services/legalKnowledgeService.js';
import { CaseTrackingService, CASE_STATUSES } from '../services/caseTrackingService.js';
import { DocumentService } from '../services/documentService.js';
import { ReminderService } from '../services/reminderService.js';
import { AdminService } from '../services/adminService.js';

// In-Memory store for development and API integration
let lawyersStore = [
  {
    id: 'law-kar-01',
    name: 'Adv. Rajeshwar Rao',
    email: 'rajeshwar.rao@earnlaw.in',
    phone: '+91 98450 11223',
    bar_registration_number: 'KAR/2012/5894',
    state_bar_council: 'Karnataka',
    years_of_experience: 14,
    primary_jurisdiction: 'Karnataka',
    primary_court: 'High Court of Karnataka & Labour Court',
    location_city: 'Bengaluru',
    languages: ['English', 'Kannada', 'Hindi'],
    specializations: ['labour_law', 'employment_disputes', 'consumer_protection'],
    consultation_fee: 1200,
    consultation_modes: ['video', 'phone', 'in_person'],
    verification_status: VERIFICATION_STATES.ACTIVE,
    is_available: true,
    rating_avg: 4.9,
    profile_bio: 'Specialist in wrongful employment dismissal, severance recovery, and industrial tribunal litigation.',
  },
  {
    id: 'law-del-02',
    name: 'Adv. Meenakshi Sundaram',
    email: 'meenakshi.s@earnlaw.in',
    phone: '+91 98100 44556',
    bar_registration_number: 'D/2009/4120',
    state_bar_council: 'Delhi',
    years_of_experience: 16,
    primary_jurisdiction: 'Delhi',
    primary_court: 'Delhi High Court & NCDRC',
    location_city: 'New Delhi',
    languages: ['English', 'Hindi', 'Tamil'],
    specializations: ['consumer_protection', 'rera_property', 'contract_disputes'],
    consultation_fee: 1500,
    consultation_modes: ['video', 'phone'],
    verification_status: VERIFICATION_STATES.ACTIVE,
    is_available: true,
    rating_avg: 4.85,
    profile_bio: 'Extensive litigation experience before the National Consumer Disputes Redressal Commission.',
  },
];

let casesStore = {
  'case-101': {
    id: 'case-101',
    user_id: 'usr-aarav-01',
    title: 'Wrongful Job Termination Without Notice',
    category_id: 'labour_law',
    case_mode: 'pending_selection',
    current_status: CASE_STATUSES.CREATED,
    jurisdiction: 'Karnataka',
    forum: 'Labour Court / Industrial Tribunal',
    summary: 'Terminated abruptly after 3 years without notice pay or severance.',
    assigned_lawyer_id: null,
  },
};

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

  // 2. Lawyer Directory & Recommendations
  getLawyers(req, res) {
    const { search, maxFee, city } = req.query;
    let results = [...lawyersStore];

    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.specializations.some((s) => s.includes(q)) ||
          l.location_city.toLowerCase().includes(q)
      );
    }
    if (maxFee) {
      results = results.filter((l) => l.consultation_fee <= Number(maxFee));
    }
    if (city) {
      results = results.filter((l) => l.location_city.toLowerCase() === city.toLowerCase());
    }

    res.json({ success: true, count: results.length, lawyers: results });
  },

  getLawyerById(req, res) {
    const lawyer = lawyersStore.find((l) => l.id === req.params.id);
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });
    res.json({ success: true, lawyer });
  },

  getRecommendations(req, res) {
    const { category, jurisdiction, city, court, mode, minExperience } = req.query;

    const scored = LawyerMatchingEngine.rankLawyers(
      {
        category: category || '',
        jurisdiction: jurisdiction || '',
        city: city || '',
        preferredCourt: court || '',
        preferredMode: mode || 'video',
        minExperience: Number(minExperience) || 0,
      },
      lawyersStore
    );

    res.json({ success: true, count: scored.length, matches: scored });
  },

  // 3. Consultations
  bookConsultation(req, res) {
    const { caseId, lawyerId, scheduledDate, timeSlot, consultationMode, userNotes } = req.body;
    const lawyer = lawyersStore.find((l) => l.id === lawyerId);
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });

    const isPaid = Boolean(req.body.transactionRef || req.body.paymentId);
    const booking = {
      id: `cons-${Date.now()}`,
      case_id: caseId || `case-${Date.now()}`,
      user_id: req.body.userId || 'usr_001',
      lawyer_id: lawyerId,
      lawyer_name: lawyer.name,
      scheduled_date: scheduledDate,
      time_slot: timeSlot,
      consultation_mode: consultationMode || 'video',
      fee_amount: lawyer.consultation_fee,
      payment_status: isPaid ? 'PAYMENT_SUCCESSFUL' : 'PENDING_PAYMENT',
      transaction_ref: req.body.transactionRef || req.body.paymentId || null,
      status: isPaid ? 'accepted' : 'pending_payment',
      meeting_link: isPaid && consultationMode === 'video' ? `https://meet.earnlaw.in/room-${Date.now()}` : null,
      user_notes: userNotes || '',
      created_at: new Date().toISOString(),
    };

    consultationsStore.push(booking);

    // Update case status to consultation_pending
    if (casesStore[caseId]) {
      casesStore[caseId] = CaseTrackingService.updateStatus(
        casesStore[caseId],
        CASE_STATUSES.CONSULTATION_PENDING,
        { actorType: 'user', remarks: `Initiated consultation with ${lawyer.name}` }
      );
    }

    res.status(201).json({ success: true, consultation: booking });
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
  adminVerifyLawyer(req, res) {
    const lawyer = lawyersStore.find((l) => l.id === req.params.id);
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });

    try {
      const verified = AdminService.verifyLawyer(lawyer, req.body.adminId || 'admin_super', req.body.remarks);
      const idx = lawyersStore.findIndex((l) => l.id === req.params.id);
      lawyersStore[idx] = verified;
      res.json({ success: true, lawyer: verified });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  adminRejectLawyer(req, res) {
    const lawyer = lawyersStore.find((l) => l.id === req.params.id);
    if (!lawyer) return res.status(404).json({ success: false, message: 'Lawyer not found' });

    try {
      const rejected = AdminService.rejectLawyer(lawyer, req.body.adminId || 'admin_super', req.body.reason);
      const idx = lawyersStore.findIndex((l) => l.id === req.params.id);
      lawyersStore[idx] = rejected;
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
};

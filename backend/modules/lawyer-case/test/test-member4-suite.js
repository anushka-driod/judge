/**
 * Comprehensive Test Suite for Member 4:
 * Legal Knowledge + Lawyer System + Case Management
 * Can be run via: node backend/modules/lawyer-case/test/test-member4-suite.js
 */

import { LawyerVerificationManager, VERIFICATION_STATES } from '../src/services/lawyerVerificationMachine.js';
import { LawyerMatchingEngine } from '../src/services/matchingEngine.js';
import { CaseActionService, ACTION_STATUS } from '../src/services/caseActionService.js';
import { SecondOpinionService, SECOND_OPINION_STATUS } from '../src/services/secondOpinionService.js';
import { ComplaintService, COMPLAINT_CATEGORIES, COMPLAINT_STATUS } from '../src/services/complaintService.js';
import { LegalKnowledgeService, RELATIONSHIP_TYPES } from '../src/services/legalKnowledgeService.js';
import { CaseTrackingService, CASE_STATUSES } from '../src/services/caseTrackingService.js';
import { DocumentService, DOCUMENT_TYPES } from '../src/services/documentService.js';
import { ReminderService, REMINDER_TYPES } from '../src/services/reminderService.js';
import { AdminService } from '../src/services/adminService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('EarnLaw Member 4 — Comprehensive System Verification Suite');
console.log('================================================================\n');

// 1. Test Lawyer Verification State Machine
console.log('1. Testing Lawyer Verification State Machine:');
try {
  let lawyer = {
    id: 'law-101',
    name: 'Adv. Suresh Kumar',
    bar_registration_number: 'KAR/2015/7841',
    verification_status: VERIFICATION_STATES.PENDING_VERIFICATION,
  };

  let threw = false;
  try {
    LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.ACTIVE);
  } catch (err) {
    threw = true;
  }
  assert(threw, 'Direct jump from pending_verification to active is rejected');

  lawyer = LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.DOCUMENTS_SUBMITTED, {
    documents: ['bar_council_id.pdf', 'llb_degree.pdf'],
  });
  assert(lawyer.verification_status === VERIFICATION_STATES.DOCUMENTS_SUBMITTED, 'Transitioned to documents_submitted');

  lawyer = LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.ADMIN_REVIEW, {
    actorId: 'admin-01',
    remarks: 'Documents authenticated with State Bar portal',
  });
  assert(lawyer.verification_status === VERIFICATION_STATES.ADMIN_REVIEW, 'Transitioned to admin_review');

  lawyer = LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.VERIFIED, {
    reviewedByAdminId: 'admin-01',
  });
  assert(lawyer.verification_status === VERIFICATION_STATES.VERIFIED, 'Transitioned to verified');

  lawyer = LawyerVerificationManager.transition(lawyer, VERIFICATION_STATES.ACTIVE);
  assert(lawyer.verification_status === VERIFICATION_STATES.ACTIVE, 'Transitioned to active on marketplace');
} catch (e) {
  console.error(e);
  failed++;
}

// 2. Test Multi-Factor Lawyer Matching Engine
console.log('\n2. Testing Multi-Factor Lawyer Matching Engine:');
try {
  const dummyLawyers = [
    {
      id: 'law-karnataka-labour',
      name: 'Adv. Meenakshi Sundaram',
      bar_registration_number: 'KAR/2010/1234',
      primary_jurisdiction: 'Karnataka',
      primary_court: 'High Court of Karnataka & Labour Court',
      location_city: 'Bengaluru',
      years_of_experience: 15,
      consultation_fee: 1500,
      consultation_modes: ['video', 'phone', 'in_person'],
      specializations: ['labour_law', 'employment_disputes', 'service_matters'],
      verification_status: 'verified',
      is_available: true,
    },
    {
      id: 'law-delhi-consumer',
      name: 'Adv. Vikas Chopra',
      bar_registration_number: 'D/2018/9876',
      primary_jurisdiction: 'Delhi',
      primary_court: 'Delhi High Court & NCDRC',
      location_city: 'New Delhi',
      years_of_experience: 7,
      consultation_fee: 800,
      consultation_modes: ['video', 'phone'],
      specializations: ['consumer_protection', 'e_commerce'],
      verification_status: 'verified',
      is_available: true,
    },
    {
      id: 'law-unverified',
      name: 'Unverified Advocate',
      bar_registration_number: 'TEMP/999',
      primary_jurisdiction: 'Karnataka',
      specializations: ['labour_law'],
      verification_status: 'pending_verification',
      is_available: true,
    },
  ];

  const caseContext = {
    category: 'labour_law',
    jurisdiction: 'Karnataka',
    city: 'Bengaluru',
    preferredCourt: 'Labour Court',
    preferredMode: 'video',
  };

  const matches = LawyerMatchingEngine.rankLawyers(caseContext, dummyLawyers);

  assert(matches.length === 2, 'Unverified lawyers were strictly excluded from recommendations');
  assert(matches[0].lawyerId === 'law-karnataka-labour', 'Labour law advocate in Bengaluru ranked #1');
  assert(matches[0].matchScore >= 90, `Top advocate scored high match (${matches[0].matchScore}/100)`);
  assert(matches[0].matchReasons.length >= 4, 'Includes clear multi-factor explanation reasons');
} catch (e) {
  console.error(e);
  failed++;
}

// 3. Test Legal Knowledge & Case Relationships Graph
console.log('\n3. Testing Legal Knowledge & Case Relationships Graph:');
try {
  const laws = LegalKnowledgeService.getLaws({ actName: 'Consumer Protection' });
  assert(laws.length > 0, 'Retrieved Consumer Protection Act statutory provisions');
  assert(laws[0].plain_meaning !== undefined, 'Statute contains citizen-friendly plain meaning');

  const rel = LegalKnowledgeService.addCaseRelationship({
    sourceCaseId: 'case-sc-imperia-2020',
    targetCaseId: 'case-sc-pioneer-2019',
    relationshipType: RELATIONSHIP_TYPES.FOLLOWS,
    description: 'Affirmed right of buyer to concurrent remedies.',
  });
  assert(rel.relationship_type === 'follows', 'Case relationship (follows) registered successfully');

  const caseRels = LegalKnowledgeService.getCaseRelationships('case-sc-imperia-2020');
  assert(caseRels.length > 0, 'Retrieved case precedent relationship links');
} catch (e) {
  console.error(e);
  failed++;
}

// 4. Test Case Tracking & Timeline Events
console.log('\n4. Testing Case Tracking & Resolution:');
try {
  let testCase = {
    id: 'case-track-99',
    user_id: 'usr-01',
    current_status: CASE_STATUSES.CREATED,
  };

  testCase = CaseTrackingService.updateStatus(testCase, CASE_STATUSES.IN_PROGRESS, {
    actorType: 'lawyer',
    actorId: 'law-101',
    remarks: 'Dispatched 15-day statutory demand notice',
  });
  assert(testCase.current_status === CASE_STATUSES.IN_PROGRESS, 'Case transitioned to in_progress');

  const timeline = CaseTrackingService.getTimeline('case-track-99');
  assert(timeline.length > 0, 'Timeline event audited in chronological store');

  // Case Resolution
  const resolved = CaseTrackingService.resolveCase(testCase, {
    resolutionNotes: 'Opposing party paid full severance amount of ₹1,85,000 via mutual settlement deed.',
    settlementAmount: 185000,
  });
  assert(resolved.current_status === CASE_STATUSES.RESOLVED, 'Case transitioned to resolved status');
  assert(resolved.resolved_at !== undefined, 'Case timestamped with official resolved_at date');
} catch (e) {
  console.error(e);
  failed++;
}

// 5. Test Document Management & Lawyer Verification
console.log('\n5. Testing Document Management & Lawyer Verification:');
try {
  const doc = DocumentService.registerDocument({
    caseId: 'case-track-99',
    userId: 'usr-01',
    title: 'Bank Return Memo Slip',
    documentType: DOCUMENT_TYPES.BANK_MEMO,
    fileName: 'cheque_return_memo.pdf',
    fileUrl: 'https://storage.earnlaw.in/docs/memo_991.pdf',
    fileSizeBytes: 245000,
  });
  assert(doc.id !== undefined, 'Document metadata registered in store');
  assert(doc.is_verified_by_lawyer === false, 'New document starts unverified');

  const verifiedDoc = DocumentService.verifyDocument('case-track-99', doc.id, 'law-101');
  assert(verifiedDoc.is_verified_by_lawyer === true, 'Assigned advocate verified documentary evidence');
  assert(verifiedDoc.verified_lawyer_id === 'law-101', 'Audited with verified lawyer ID');
} catch (e) {
  console.error(e);
  failed++;
}

// 6. Test Reminders & Deadline Tracking
console.log('\n6. Testing Reminders & Deadline Tracking:');
try {
  const reminder = ReminderService.createReminder({
    userId: 'usr-01',
    caseId: 'case-track-99',
    title: 'Limitation Window Warning: 15-day Notice Response Due',
    description: 'Check if employer has deposited severance dues.',
    reminderDate: '2026-09-25T10:00:00Z',
    reminderType: REMINDER_TYPES.STATUTORY_LIMITATION,
  });
  assert(reminder.id !== undefined, 'Statutory limitation reminder created');

  const userReminders = ReminderService.getRemindersForUser('usr-01');
  assert(userReminders.length > 0, 'Retrieved active reminders for user');

  const dismissed = ReminderService.dismissReminder(reminder.id);
  assert(dismissed.status === 'dismissed', 'Reminder marked dismissed');
} catch (e) {
  console.error(e);
  failed++;
}

// 7. Test Admin Management (Verification, Rejection, Complaints)
console.log('\n7. Testing Admin Management:');
try {
  let applicantLawyer = {
    id: 'law-applicant-1',
    name: 'Adv. Tarun Grover',
    bar_registration_number: 'P/2016/5412',
    verification_status: VERIFICATION_STATES.DOCUMENTS_SUBMITTED,
  };

  const approved = AdminService.verifyLawyer(applicantLawyer, 'admin_super', 'All certificates verified.');
  assert(approved.verification_status === VERIFICATION_STATES.ACTIVE, 'Admin successfully approved and activated lawyer');

  const complaint = ComplaintService.fileComplaint({
    userId: 'usr-01',
    lawyerId: 'law-applicant-1',
    category: COMPLAINT_CATEGORIES.UNEXPECTED_FEES,
    description: 'Demanded additional unreceipted documentation fees.',
  });

  const reviewedComplaint = AdminService.reviewComplaint(complaint, 'admin_super', {
    newStatus: COMPLAINT_STATUS.RESOLVED,
    adminNotes: 'Fee reconciled and refunded via platform wallet.',
    actionTaken: 'Formal warning issued to advocate.',
  });
  assert(reviewedComplaint.status === COMPLAINT_STATUS.RESOLVED, 'Admin successfully resolved grievance');
} catch (e) {
  console.error(e);
  failed++;
}

// 8. Test Second Opinion Workflow
console.log('\n8. Testing Second Opinion Workflow:');
try {
  let threwSameLawyer = false;
  try {
    SecondOpinionService.createRequest({
      caseId: 'case-99',
      userId: 'usr-1',
      originalLawyerId: 'law-1',
      secondLawyerId: 'law-1',
      userReason: 'Need validation on limitation period.',
    });
  } catch (err) {
    threwSameLawyer = true;
  }
  assert(threwSameLawyer, 'Requesting second opinion from the same lawyer is rejected');

  const validReq = SecondOpinionService.createRequest({
    caseId: 'case-99',
    userId: 'usr-1',
    originalLawyerId: 'law-1',
    secondLawyerId: 'law-2',
    userReason: 'Need independent confirmation on notice limitation period.',
  });
  assert(validReq.status === SECOND_OPINION_STATUS.REQUESTED, 'Second opinion request created');

  const reviewed = SecondOpinionService.submitReview(validReq, {
    alternativeStrategy: 'File petition under Section 35 e-Daakhil without notice delay.',
    risksIdentified: ['Delay in filing may cross 2-year limitation.'],
    recommendedAction: 'Immediate online lodgement with interim prayer.',
  });
  assert(reviewed.status === SECOND_OPINION_STATUS.DELIVERED, 'Second opinion review delivered');
} catch (e) {
  console.error(e);
  failed++;
}

console.log('\n================================================================');
console.log(`Execution Summary: ${passed} Passed | ${failed} Failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}

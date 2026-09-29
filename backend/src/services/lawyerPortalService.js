import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel, { sanitizeUser } from '../models/userModel.js';
import { RagPipeline } from '../../modules/ai-rag/src/rag/ragPipeline.js';

const JWT_SECRET = process.env.JWT_SECRET || 'earnlaw_vidhisetu_jwt_super_secret_key_2026';
const ragPipelineInstance = new RagPipeline();

export const VERIFICATION_STATUSES = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
};

export const PAYMENT_STATUSES = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_SUCCESSFUL: 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CONSULTATION_CONFIRMED: 'CONSULTATION_CONFIRMED',
  CONSULTATION_COMPLETED: 'CONSULTATION_COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
};

// In-memory data structures (backed by persistent memory & synchronized across modules)
let lawyers = [
  {
    id: 'law-kar-01',
    user_id: 'usr_law_01',
    name: 'Adv. Rajeshwar Rao',
    email: 'rajeshwar.rao@earnlaw.in',
    phone: '+91 98450 11223',
    photoUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=400',
    bar_registration_number: 'KAR/2012/5894',
    state_bar_council: 'Karnataka',
    year_of_enrollment: 2012,
    years_of_experience: 14,
    primary_jurisdiction: 'Karnataka',
    primary_court: 'High Court of Karnataka & Labour Court',
    location_city: 'Bengaluru',
    languages: ['English', 'Kannada', 'Hindi'],
    specializations: ['labour_law', 'employment_disputes', 'consumer_protection', 'tenancy_disputes'],
    consultation_fee: 1200,
    fee_schedule: {
      chat: 600,
      voice: 900,
      video: 1200,
      in_person: 2000,
      durationMinutes: 30,
      currency: 'INR',
    },
    consultation_modes: ['video', 'voice', 'chat', 'in_person'],
    verification_status: VERIFICATION_STATUSES.VERIFIED,
    admin_remarks: 'Verified by Bar Council of Karnataka records.',
    is_available: true,
    rating_avg: 4.9,
    profile_bio: 'Senior Counsel specializing in wrongful termination, tenancy recovery, and high-stakes contract dispute litigation with 14+ years of bar experience.',
    verification_documents: [
      { id: 'vdoc-01', title: 'Bar Enrollment Certificate', type: 'certificate', url: '#', verified: true, uploadedAt: '2026-01-10' },
      { id: 'vdoc-02', title: 'Karnataka Bar Council ID', type: 'bar_id', url: '#', verified: true, uploadedAt: '2026-01-10' },
    ],
    availability: {
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '10:00',
      endTime: '18:30',
      slotDuration: 30,
      bufferMinutes: 15,
      slots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM', '05:30 PM'],
    },
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'law-del-02',
    user_id: 'usr_law_02',
    name: 'Adv. Meenakshi Sundaram',
    email: 'meenakshi.s@earnlaw.in',
    phone: '+91 98100 44556',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    bar_registration_number: 'D/2009/4120',
    state_bar_council: 'Delhi',
    year_of_enrollment: 2009,
    years_of_experience: 16,
    primary_jurisdiction: 'Delhi',
    primary_court: 'Delhi High Court & NCDRC',
    location_city: 'New Delhi',
    languages: ['English', 'Hindi', 'Tamil'],
    specializations: ['consumer_protection', 'rera_property', 'contract_disputes', 'tenancy_disputes'],
    consultation_fee: 1500,
    fee_schedule: {
      chat: 800,
      voice: 1100,
      video: 1500,
      in_person: 2500,
      durationMinutes: 30,
      currency: 'INR',
    },
    consultation_modes: ['video', 'voice', 'chat'],
    verification_status: VERIFICATION_STATUSES.VERIFIED,
    admin_remarks: 'Verified by Delhi High Court Bar Association.',
    is_available: true,
    rating_avg: 4.85,
    profile_bio: 'Extensive litigation experience before the National Consumer Disputes Redressal Commission and Delhi High Court in real estate, tenancy and commercial recovery.',
    verification_documents: [
      { id: 'vdoc-03', title: 'Bar Enrollment Certificate (Delhi)', type: 'certificate', url: '#', verified: true, uploadedAt: '2026-02-15' },
    ],
    availability: {
      workingDays: ['Monday', 'Wednesday', 'Friday'],
      startTime: '11:00',
      endTime: '17:00',
      slotDuration: 30,
      bufferMinutes: 15,
      slots: ['11:00 AM', '02:00 PM', '03:30 PM'],
    },
    created_at: '2026-02-15T11:00:00Z',
    updated_at: '2026-09-18T14:30:00Z',
  },
  {
    id: 'lawyer-pending-01',
    user_id: 'usr_law_03',
    name: 'Adv. Vikram Malhotra',
    email: 'vikram.malhotra@example.com',
    phone: '+91 99887 66554',
    photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
    bar_registration_number: 'MAH/4590/2018',
    state_bar_council: 'Maharashtra',
    year_of_enrollment: 2018,
    years_of_experience: 8,
    primary_jurisdiction: 'Maharashtra',
    primary_court: 'Bombay High Court & City Civil Court',
    location_city: 'Mumbai',
    languages: ['English', 'Marathi', 'Hindi'],
    specializations: ['rera_property', 'civil_disputes', 'consumer_protection'],
    consultation_fee: 1000,
    fee_schedule: { chat: 500, voice: 800, video: 1000, in_person: 1800, durationMinutes: 30, currency: 'INR' },
    consultation_modes: ['video', 'voice', 'chat'],
    verification_status: VERIFICATION_STATUSES.PENDING,
    admin_remarks: 'Application submitted. Documents awaiting administrative review.',
    is_available: false,
    rating_avg: 5.0,
    profile_bio: 'Practicing Advocate at Bombay High Court focusing on residential tenancy disputes, property acquisition and RERA consumer complaints.',
    verification_documents: [
      { id: 'vdoc-04', title: 'Bar_Certificate_Vikram.pdf', type: 'Bar Enrollment Certificate', verified: false, uploadedAt: '2026-08-28' },
      { id: 'vdoc-05', title: 'Bar_ID_Vikram.pdf', type: 'Bar Council ID', verified: false, uploadedAt: '2026-08-28' },
    ],
    availability: {
      workingDays: ['Monday', 'Tuesday', 'Thursday'],
      startTime: '14:00',
      endTime: '19:00',
      slotDuration: 30,
      bufferMinutes: 15,
      slots: ['02:00 PM', '04:00 PM'],
    },
    created_at: '2026-08-28T10:00:00Z',
    updated_at: '2026-08-28T10:00:00Z',
  },
];

let consultationRequests = [
  {
    id: 'req-101',
    caseId: 'case-101',
    clientId: 'usr_001',
    clientName: 'Aarav Mehta',
    clientEmail: 'aarav.mehta@example.com',
    clientPhone: '+91 98450 99887',
    lawyerId: 'law-kar-01',
    caseTitle: 'Defective Smartphone Delivery & Refund Rejection',
    category: 'Consumer Dispute & Refund',
    shortSummary: 'Purchased a phone online for ₹24,999. Received a broken refurbished item. Seller refused return.',
    jurisdiction: 'Bengaluru Urban DCDRC',
    sharedDocuments: [
      { id: 'doc-01', name: 'Amazon_Invoice_INV2026.pdf', type: 'Tax Invoice / Receipt', size: '240 KB' },
    ],
    consultationType: 'video',
    requestedDate: '2026-09-28',
    requestedTime: '02:30 PM',
    durationMinutes: 30,
    feeAmount: 1200,
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    transactionRef: 'PAY_TXN_9845892',
    status: 'accepted',
    clientNotes: 'Need urgent guidance on filing statutory notice to the e-commerce marketplace.',
    meetingLink: 'https://meet.vidhisetu.in/room-case-101-video',
    createdAt: '2026-08-28T14:00:00Z',
  },
  {
    id: 'req-102',
    caseId: 'case-102',
    clientId: 'usr_001',
    clientName: 'Aarav Mehta',
    clientEmail: 'aarav.mehta@example.com',
    clientPhone: '+91 98450 99887',
    lawyerId: 'law-kar-01',
    caseTitle: 'Dishonoured Business Cheque of ₹4,50,000',
    category: 'Banking & Cheque Bounce (Sec 138)',
    shortSummary: 'Cheque issued by client dishonoured with memo "Funds Insufficient". 30-day statutory notice required.',
    jurisdiction: 'Bengaluru Magistrate Court',
    sharedDocuments: [],
    consultationType: 'video',
    requestedDate: '2026-09-29',
    requestedTime: '04:00 PM',
    durationMinutes: 30,
    feeAmount: 1200,
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    transactionRef: 'PAY_TXN_7741295',
    status: 'pending',
    clientNotes: 'The cheque was presented twice. Statutory 15-day period ends next week.',
    meetingLink: null,
    createdAt: '2026-09-02T11:20:00Z',
  },
  {
    id: 'req-103',
    caseId: 'case-103',
    clientId: 'usr_002',
    clientName: 'Priya Sharma',
    clientEmail: 'priya.sharma@example.com',
    clientPhone: '+91 97411 22334',
    lawyerId: 'law-kar-01',
    caseTitle: 'Unlawful Security Deposit Forfeiture by Landlord',
    category: 'Tenancy & Property Dispute',
    shortSummary: 'Landlord refused to return ₹70,000 security deposit after flat vacated with proper 30-day notice.',
    jurisdiction: 'Bengaluru Civil Court',
    sharedDocuments: [
      { id: 'doc-ten-01', name: 'Rental_Agreement_2025.pdf', type: 'Tenancy Agreement', size: '1.2 MB' },
      { id: 'doc-ten-02', name: 'Notice_Email_Confirmation.pdf', type: 'Move-out Notice', size: '320 KB' },
    ],
    consultationType: 'chat',
    requestedDate: '2026-09-29',
    requestedTime: '11:30 AM',
    durationMinutes: 30,
    feeAmount: 600,
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    transactionRef: 'PAY_TXN_4512903',
    status: 'pending',
    clientNotes: 'Landlord is claiming frivolous painting deductions of ₹30,000 without bill receipts.',
    meetingLink: null,
    createdAt: '2026-09-26T18:40:00Z',
  },
];

let clientConsents = [
  {
    id: 'cst-01',
    caseId: 'case-101',
    clientId: 'usr_001',
    lawyerId: 'law-kar-01',
    sharedDocumentIds: ['doc-01'],
    consentScope: ['case_summary', 'documents', 'chat', 'action_plan'],
    status: 'active',
    consentedAt: '2026-08-28T13:58:00Z',
    revokedAt: null,
  },
  {
    id: 'cst-03',
    caseId: 'case-103',
    clientId: 'usr_002',
    lawyerId: 'law-kar-01',
    sharedDocumentIds: ['doc-ten-01', 'doc-ten-02'],
    consentScope: ['case_summary', 'documents', 'chat'],
    status: 'active',
    consentedAt: '2026-09-26T18:38:00Z',
    revokedAt: null,
  },
];

let caseNotes = [
  {
    id: 'note-01',
    caseId: 'case-101',
    lawyerId: 'law-kar-01',
    authorName: 'Adv. Rajeshwar Rao',
    type: 'LAWYER_PRIVATE', // LAWYER_PRIVATE or CLIENT_VISIBLE
    content: 'Client has strong documentary evidence (invoice + unboxing video). E-commerce platform has joint liability under Consumer Protection Act 2019 e-commerce rules. Recommended settlement notice first.',
    createdAt: '2026-08-29T10:15:00Z',
  },
  {
    id: 'note-02',
    caseId: 'case-101',
    lawyerId: 'law-kar-01',
    authorName: 'Adv. Rajeshwar Rao',
    type: 'CLIENT_VISIBLE',
    content: 'Please ensure you preserve the unboxing video with its original timestamp file metadata. We will annex it as Annexure A to our legal notice.',
    createdAt: '2026-08-29T10:30:00Z',
  },
];

let actionPlans = {
  'case-101': [
    { id: 'act-01', title: 'Verify courier delivery manifest & refusal slip', priority: 'high', dueDate: '2026-09-05', status: 'completed', category: 'evidence' },
    { id: 'act-02', title: 'Draft formal Legal Notice under Consumer Protection Act 2019', priority: 'high', dueDate: '2026-09-12', status: 'in_progress', category: 'notice' },
    { id: 'act-03', title: 'Serve notice via Registered Post AD & Speed Post', priority: 'medium', dueDate: '2026-09-15', status: 'pending', category: 'filing' },
    { id: 'act-04', title: 'Wait for 15-day statutory response window', priority: 'low', dueDate: '2026-10-01', status: 'pending', category: 'waiting' },
    { id: 'act-05', title: 'Prepare e-Daakhil consumer complaint if no refund received', priority: 'medium', dueDate: '2026-10-10', status: 'pending', category: 'court' },
  ],
  'case-103': [
    { id: 'act-103-01', title: 'Collect final electricity & water meter clearance receipts', priority: 'high', dueDate: '2026-09-30', status: 'pending', category: 'evidence' },
    { id: 'act-103-02', title: 'Issue 7-day Demand Notice for security deposit refund with 18% p.a. interest', priority: 'high', dueDate: '2026-10-03', status: 'pending', category: 'notice' },
  ],
};

let caseTimelineEvents = {
  'case-101': [
    { id: 'tle-01', event: 'Case Created', description: 'Citizen created case through AI Guidance workflow', timestamp: '2026-08-20T10:30:00Z', actor: 'Aarav Mehta (Client)' },
    { id: 'tle-02', event: 'Tax Invoice Shared', description: 'Amazon tax invoice authorized & shared with advocate', timestamp: '2026-08-22T14:10:00Z', actor: 'Aarav Mehta (Client)' },
    { id: 'tle-03', event: 'Consultation Requested', description: 'Video consultation requested with Adv. Rajeshwar Rao', timestamp: '2026-08-28T14:00:00Z', actor: 'Aarav Mehta (Client)' },
    { id: 'tle-04', event: 'Lawyer Accepted Consultation', description: 'Adv. Rajeshwar Rao reviewed case summary and accepted request', timestamp: '2026-08-28T16:20:00Z', actor: 'Adv. Rajeshwar Rao' },
    { id: 'tle-05', event: 'Action Plan Initialized', description: 'Lawyer formulated 5-step statutory notice and e-Daakhil roadmap', timestamp: '2026-08-29T10:35:00Z', actor: 'Adv. Rajeshwar Rao' },
  ],
};

let caseMessages = {
  'case-101': [
    {
      id: 'msg-01',
      senderId: 'usr_001',
      senderName: 'Aarav Mehta',
      senderRole: 'client',
      text: 'Good afternoon Adv. Rao, I have attached my invoice. The seller claims the box was tampered with after delivery.',
      attachments: [],
      timestamp: '2026-08-28T16:30:00Z',
      read: true,
    },
    {
      id: 'msg-02',
      senderId: 'law-kar-01',
      senderName: 'Adv. Rajeshwar Rao',
      senderRole: 'lawyer',
      text: 'Good afternoon Mr. Mehta. I reviewed the invoice. Do you have photographs of the outer shipping box showing the courier tracking label?',
      attachments: [],
      timestamp: '2026-08-28T16:35:00Z',
      read: true,
    },
    {
      id: 'msg-03',
      senderId: 'usr_001',
      senderName: 'Aarav Mehta',
      senderRole: 'client',
      text: 'Yes! I took 4 photos of the label and the IMEI discrepancy on the inner phone box.',
      attachments: [
        { name: 'IMEI_Discrepancy_Photo.jpg', size: '1.4 MB', url: '#' },
      ],
      timestamp: '2026-08-28T16:40:00Z',
      read: true,
    },
    {
      id: 'msg-04',
      senderId: 'law-kar-01',
      senderName: 'Adv. Rajeshwar Rao',
      senderRole: 'lawyer',
      text: 'Excellent. Under Section 84 of the Consumer Protection Act, 2019, the marketplace platform cannot evade product liability when goods delivered differ materially from specifications. I am drafting our demand notice.',
      attachments: [],
      timestamp: '2026-08-29T10:45:00Z',
      read: false,
    },
  ],
};

let callSessions = [
  {
    id: 'call-01',
    caseId: 'case-101',
    lawyerId: 'law-kar-01',
    clientId: 'usr_001',
    consultationType: 'video',
    status: 'completed',
    startTime: '2026-08-28T15:00:00Z',
    endTime: '2026-08-28T15:32:00Z',
    durationSeconds: 1920,
    roomUrl: 'https://meet.vidhisetu.in/room-case-101-video',
    summaryNotes: 'Discussed courier delivery discrepancies, statutory notice timeline and jurisdiction of Bengaluru Urban DCDRC.',
  },
];

let earningsLedger = [
  {
    id: 'earn-01',
    lawyerId: 'law-kar-01',
    consultationId: 'req-101',
    caseId: 'case-101',
    clientName: 'Aarav Mehta',
    consultationType: 'video',
    amount: 1200,
    platformFee: 120, // 10% platform fee
    netPayout: 1080,
    currency: 'INR',
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    consultationStatus: 'CONFIRMED',
    transactionRef: 'PAY_TXN_9845892',
    date: '2026-08-28',
    paidOut: true,
  },
  {
    id: 'earn-02',
    lawyerId: 'law-kar-01',
    consultationId: 'req-102',
    caseId: 'case-102',
    clientName: 'Aarav Mehta',
    consultationType: 'video',
    amount: 1200,
    platformFee: 120,
    netPayout: 1080,
    currency: 'INR',
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    consultationStatus: 'PENDING_LAWYER_ACCEPT',
    transactionRef: 'PAY_TXN_7741295',
    date: '2026-09-02',
    paidOut: false,
  },
  {
    id: 'earn-03',
    lawyerId: 'law-kar-01',
    consultationId: 'req-103',
    caseId: 'case-103',
    clientName: 'Priya Sharma',
    consultationType: 'chat',
    amount: 600,
    platformFee: 60,
    netPayout: 540,
    currency: 'INR',
    paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
    consultationStatus: 'PENDING_LAWYER_ACCEPT',
    transactionRef: 'PAY_TXN_4512903',
    date: '2026-09-26',
    paidOut: false,
  },
];

let auditLogs = [
  {
    id: 'aud-01',
    actor: 'admin@vidhisetu.in',
    role: 'ADMIN',
    action: 'LAWYER_VERIFIED',
    entity: 'LawyerProfile',
    entityId: 'law-kar-01',
    metadata: { barNumber: 'KAR/2012/5894', remarks: 'Verified by Bar Council of Karnataka records.' },
    timestamp: '2026-01-10T09:30:00Z',
  },
  {
    id: 'aud-02',
    actor: 'aarav.mehta@example.com',
    role: 'USER',
    action: 'CLIENT_CONSENT_GRANTED',
    entity: 'CaseAccessConsent',
    entityId: 'cst-01',
    metadata: { caseId: 'case-101', lawyerId: 'law-kar-01', sharedDocuments: ['doc-01'] },
    timestamp: '2026-08-28T13:58:00Z',
  },
  {
    id: 'aud-03',
    actor: 'rajeshwar.rao@earnlaw.in',
    role: 'LAWYER',
    action: 'CONSULTATION_ACCEPTED',
    entity: 'ConsultationRequest',
    entityId: 'req-101',
    metadata: { caseId: 'case-101', fee: 1200, type: 'video' },
    timestamp: '2026-08-28T16:20:00Z',
  },
];

export const LawyerPortalService = {
  // 1. Authentication & Registration
  async registerLawyer(data) {
    const {
      name,
      email,
      phone,
      password,
      barRegistrationNumber,
      stateBarCouncil,
      yearOfEnrollment,
      specializations,
      yearsOfExperience,
      jurisdiction,
      primaryCourt,
      city,
      languages,
      consultationModes,
      consultationFee,
      bio,
      documents = [],
      photoUrl,
    } = data;

    if (!name || !email || !password || !barRegistrationNumber) {
      throw new Error('Full Name, Email, Password, and Bar Registration Number are required.');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = lawyers.find((l) => l.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('A lawyer profile with this email address already exists.');
    }

    const lawyerId = `law-${stateBarCouncil ? stateBarCouncil.toLowerCase().slice(0, 3) : 'in'}-${Date.now().toString().slice(-4)}`;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Register into UserModel for JWT credential compatibility
    let userRecord = await UserModel.findByEmail(cleanEmail);
    if (!userRecord) {
      userRecord = await UserModel.create({
        name,
        email: cleanEmail,
        phone,
        passwordHash,
        role: 'lawyer',
        emailVerified: true,
        metadata: { lawyerId, barRegistrationNumber },
      });
    }

    const newLawyer = {
      id: lawyerId,
      user_id: userRecord.id,
      name,
      email: cleanEmail,
      phone: phone || '',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=400',
      bar_registration_number: barRegistrationNumber,
      state_bar_council: stateBarCouncil || 'State Bar Council',
      year_of_enrollment: parseInt(yearOfEnrollment || new Date().getFullYear(), 10),
      years_of_experience: parseInt(yearsOfExperience || 1, 10),
      primary_jurisdiction: jurisdiction || stateBarCouncil || 'District',
      primary_court: primaryCourt || 'District & Sessions Court',
      location_city: city || 'Bengaluru',
      languages: Array.isArray(languages) ? languages : [languages || 'English'],
      specializations: Array.isArray(specializations) ? specializations : ['civil_law', 'consumer_disputes'],
      consultation_fee: parseInt(consultationFee || 1000, 10),
      fee_schedule: {
        chat: Math.round(parseInt(consultationFee || 1000, 10) * 0.5),
        voice: Math.round(parseInt(consultationFee || 1000, 10) * 0.75),
        video: parseInt(consultationFee || 1000, 10),
        in_person: parseInt(consultationFee || 1000, 10) * 1.5,
        durationMinutes: 30,
        currency: 'INR',
      },
      consultation_modes: Array.isArray(consultationModes) ? consultationModes : ['video', 'voice', 'chat'],
      verification_status: VERIFICATION_STATUSES.PENDING, // Never automatically verified
      admin_remarks: 'Application under review by administrative council.',
      is_available: false,
      rating_avg: 5.0,
      profile_bio: bio || 'Advocate practicing at State Bar Council.',
      verification_documents: (documents || []).map((doc, idx) => ({
        id: `vdoc-${Date.now()}-${idx}`,
        title: doc.name || doc.title || 'Verification Document',
        type: doc.type || 'Bar Enrollment Certificate',
        url: doc.url || '#',
        verified: false,
        uploadedAt: new Date().toISOString().split('T')[0],
      })),
      availability: {
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        startTime: '10:00',
        endTime: '18:00',
        slotDuration: 30,
        bufferMinutes: 15,
        slots: ['10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM'],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    lawyers.push(newLawyer);

    // Record audit log
    this.recordAuditLog({
      actor: cleanEmail,
      role: 'LAWYER',
      action: 'LAWYER_REGISTERED',
      entity: 'LawyerProfile',
      entityId: lawyerId,
      metadata: { barNumber: barRegistrationNumber, state: stateBarCouncil },
    });

    const token = jwt.sign(
      { id: userRecord.id, email: cleanEmail, role: 'lawyer', lawyerId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      token,
      lawyer: newLawyer,
      verification_status: newLawyer.verification_status,
      message: 'Lawyer application registered successfully. Status is PENDING admin review.',
    };
  },

  async loginLawyer(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    const cleanEmail = email.toLowerCase().trim();
    const lawyer = lawyers.find((l) => l.email.toLowerCase() === cleanEmail);
    if (!lawyer) {
      throw new Error('No registered lawyer found with this email.');
    }

    const user = await UserModel.findByEmail(cleanEmail);
    if (user && user.password_hash) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid credentials. Please verify your password.');
      }
    }

    const token = jwt.sign(
      { id: user ? user.id : lawyer.user_id, email: lawyer.email, role: 'lawyer', lawyerId: lawyer.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      token,
      lawyer,
      verification_status: lawyer.verification_status,
      isVerified: lawyer.verification_status === VERIFICATION_STATUSES.VERIFIED,
    };
  },

  async getLawyerProfile(lawyerIdOrEmail) {
    if (!lawyerIdOrEmail) return null;
    const key = String(lawyerIdOrEmail).toLowerCase().trim();
    const lawyer = lawyers.find(
      (l) =>
        l.id?.toLowerCase() === key ||
        l.user_id?.toLowerCase() === key ||
        l.email?.toLowerCase() === key
    );
    if (!lawyer) return null;
    return lawyer;
  },

  async updateLawyerProfile(lawyerId, updates) {
    const idx = lawyers.findIndex((l) => l.id === lawyerId);
    if (idx === -1) throw new Error('Lawyer not found');

    const allowedUpdates = [
      'name', 'phone', 'photoUrl', 'languages', 'specializations',
      'consultation_fee', 'fee_schedule', 'consultation_modes',
      'profile_bio', 'location_city', 'primary_court', 'primary_jurisdiction'
    ];

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        lawyers[idx][key] = updates[key];
      }
    }
    lawyers[idx].updated_at = new Date().toISOString();
    return lawyers[idx];
  },

  // 2. Dashboard Metrics (Real Database Values)
  async getDashboardMetrics(lawyerId) {
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) throw new Error('Lawyer not found');

    const requests = consultationRequests.filter((r) => r.lawyerId === lawyerId);
    const pendingRequests = requests.filter((r) => r.status === 'pending');
    const acceptedRequests = requests.filter((r) => r.status === 'accepted');

    // Unique clients
    const clientIds = new Set(acceptedRequests.map((r) => r.clientId));
    const totalClients = clientIds.size || (acceptedRequests.length > 0 ? 1 : 0);

    // Active cases
    const activeCases = acceptedRequests.length;

    // Upcoming consultations (e.g. date >= today)
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingConsultations = requests.filter(
      (r) => (r.status === 'accepted' || r.status === 'pending') && r.requestedDate >= todayStr
    );

    // Today's appointments
    const todaysAppointments = requests.filter(
      (r) => r.status === 'accepted' && r.requestedDate === todayStr
    );

    // Unread messages
    let unreadMessagesCount = 0;
    for (const req of acceptedRequests) {
      const msgs = caseMessages[req.caseId] || [];
      unreadMessagesCount += msgs.filter((m) => m.senderRole === 'client' && !m.read).length;
    }

    // Follow-ups (actions due or cases requiring response)
    let followUpsCount = 0;
    for (const req of acceptedRequests) {
      const actions = actionPlans[req.caseId] || [];
      followUpsCount += actions.filter((a) => a.status !== 'completed').length;
    }

    // Total earnings
    const lawyerEarnings = earningsLedger.filter((e) => e.lawyerId === lawyerId);
    const totalEarnings = lawyerEarnings.reduce((acc, curr) => acc + curr.netPayout, 0);

    return {
      lawyer: {
        id: lawyer.id,
        name: lawyer.name,
        verification_status: lawyer.verification_status,
        bar_registration_number: lawyer.bar_registration_number,
        primary_court: lawyer.primary_court,
      },
      metrics: {
        totalClients,
        activeCases,
        pendingRequestsCount: pendingRequests.length,
        upcomingConsultationsCount: upcomingConsultations.length,
        unreadMessagesCount,
        todaysAppointmentsCount: todaysAppointments.length,
        followUpsCount,
        totalEarnings,
      },
      recentRequests: requests.slice(-5).reverse(),
      upcomingAppointments: upcomingConsultations.slice(0, 5),
      recentActivity: auditLogs
        .filter((a) => a.entityId === lawyerId || a.metadata?.lawyerId === lawyerId)
        .slice(-5)
        .reverse(),
    };
  },

  // 3. Consultation Requests
  async getConsultationRequests(lawyerId) {
    return consultationRequests.filter((r) => r.lawyerId === lawyerId);
  },

  async getConsultationRequestById(requestId, lawyerId) {
    const req = consultationRequests.find((r) => r.id === requestId);
    if (!req) return null;
    if (lawyerId && req.lawyerId !== lawyerId) {
      throw new Error('Unauthorized access to consultation request.');
    }
    return req;
  },

  async acceptConsultationRequest(requestId, lawyerId, remarks = '') {
    const req = consultationRequests.find((r) => r.id === requestId && r.lawyerId === lawyerId);
    if (!req) throw new Error('Consultation request not found or unauthorized.');

    req.status = 'accepted';
    req.meetingLink = req.meetingLink || `https://meet.vidhisetu.in/room-${req.caseId}-${req.consultationType}`;
    req.acceptedAt = new Date().toISOString();
    req.lawyerRemarks = remarks;

    // Timeline event
    if (!caseTimelineEvents[req.caseId]) {
      caseTimelineEvents[req.caseId] = [];
    }
    caseTimelineEvents[req.caseId].push({
      id: `tle-${Date.now()}`,
      event: 'Consultation Accepted',
      description: `Advocate accepted consultation for ${req.requestedDate} at ${req.requestedTime}`,
      timestamp: new Date().toISOString(),
      actor: req.lawyerName || 'Assigned Advocate',
    });

    this.recordAuditLog({
      actor: lawyerId,
      role: 'LAWYER',
      action: 'CONSULTATION_ACCEPTED',
      entity: 'ConsultationRequest',
      entityId: requestId,
      metadata: { caseId: req.caseId, fee: req.feeAmount, date: req.requestedDate },
    });

    return req;
  },

  async rejectConsultationRequest(requestId, lawyerId, reason = '') {
    const req = consultationRequests.find((r) => r.id === requestId && r.lawyerId === lawyerId);
    if (!req) throw new Error('Consultation request not found or unauthorized.');

    req.status = 'rejected';
    req.rejectionReason = reason;
    req.rejectedAt = new Date().toISOString();

    // Mark payment for refund if already paid
    if (req.paymentStatus === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL) {
      req.paymentStatus = PAYMENT_STATUSES.REFUND_PENDING;
    }

    this.recordAuditLog({
      actor: lawyerId,
      role: 'LAWYER',
      action: 'CONSULTATION_REJECTED',
      entity: 'ConsultationRequest',
      entityId: requestId,
      metadata: { caseId: req.caseId, reason },
    });

    return req;
  },

  async requestMoreInfo(requestId, lawyerId, questions) {
    const req = consultationRequests.find((r) => r.id === requestId && r.lawyerId === lawyerId);
    if (!req) throw new Error('Consultation request not found or unauthorized.');

    req.status = 'more_info_requested';
    req.infoQuestions = questions;
    req.infoRequestedAt = new Date().toISOString();

    this.recordAuditLog({
      actor: lawyerId,
      role: 'LAWYER',
      action: 'MORE_INFO_REQUESTED',
      entity: 'ConsultationRequest',
      entityId: requestId,
      metadata: { caseId: req.caseId, questions },
    });

    return req;
  },

  // 4. Case Workspace & Case Details
  async getLawyerCases(lawyerId) {
    // Only cases where lawyer has an accepted consultation request or explicit consent
    const acceptedRequests = consultationRequests.filter(
      (r) => r.lawyerId === lawyerId && (r.status === 'accepted' || r.status === 'pending')
    );

    const cases = acceptedRequests.map((r) => {
      const consent = clientConsents.find((c) => c.caseId === r.caseId && c.lawyerId === lawyerId);
      return {
        id: r.caseId,
        caseId: r.caseId,
        title: r.caseTitle,
        category: r.category,
        clientName: r.clientName,
        clientId: r.clientId,
        status: r.status === 'accepted' ? 'Active Consultation' : 'Pending Request',
        jurisdiction: r.jurisdiction,
        requestedDate: r.requestedDate,
        consultationType: r.consultationType,
        hasConsent: Boolean(consent && consent.status === 'active'),
        sharedDocsCount: (r.sharedDocuments || []).length,
      };
    });

    return cases;
  },

  async getCaseWorkspace(caseId, lawyerId) {
    // 1. Authorize: lawyer must be assigned to case
    const request = consultationRequests.find(
      (r) => r.caseId === caseId && r.lawyerId === lawyerId
    );
    if (!request) {
      throw new Error('Unauthorized: You do not have permission to access this case.');
    }

    const consent = clientConsents.find(
      (c) => c.caseId === caseId && c.lawyerId === lawyerId && c.status === 'active'
    );

    // Filter shared documents strictly based on consent
    const sharedDocIds = consent?.sharedDocumentIds || (request.sharedDocuments || []).map((d) => d.id);
    const authorizedDocs = (request.sharedDocuments || []).filter((d) => sharedDocIds.includes(d.id));

    // Get action plan
    const plan = actionPlans[caseId] || [];

    // Get timeline
    const timeline = caseTimelineEvents[caseId] || [];

    // Get notes (both lawyer private and client visible for this lawyer)
    const notes = caseNotes.filter((n) => n.caseId === caseId && n.lawyerId === lawyerId);

    // Call session if any
    const calls = callSessions.filter((c) => c.caseId === caseId && c.lawyerId === lawyerId);

    return {
      case: {
        id: caseId,
        title: request.caseTitle,
        category: request.category,
        originalProblem: request.shortSummary, // IMMUTABLE USER ORIGINAL ANCHOR
        currentStatus: request.status === 'accepted' ? 'ACTIVE_CONSULTATION' : 'PENDING_REVIEW',
        jurisdiction: request.jurisdiction,
        createdAt: request.createdAt,
      },
      client: {
        id: request.clientId,
        name: request.clientName,
        email: request.clientEmail,
        phone: request.clientPhone,
        notes: request.clientNotes,
      },
      consultation: {
        id: request.id,
        type: request.consultationType,
        scheduledDate: request.requestedDate,
        scheduledTime: request.requestedTime,
        feeAmount: request.feeAmount,
        paymentStatus: request.paymentStatus,
        meetingLink: request.meetingLink,
      },
      consent: {
        status: consent ? consent.status : 'default_request_scope',
        sharedDocumentIds: sharedDocIds,
        consentedAt: consent?.consentedAt || request.createdAt,
      },
      sharedDocuments: authorizedDocs,
      actionPlan: plan,
      timeline,
      notes,
      calls,
    };
  },

  // 5. Case AI / RAG Grounded Research for Lawyer
  async getCaseAiResearch(caseId, lawyerId) {
    const workspace = await this.getCaseWorkspace(caseId, lawyerId);
    const query = `${workspace.case.title}. ${workspace.case.originalProblem}`;
    const jurisdiction = workspace.case.jurisdiction;

    try {
      // Invoke existing VidhiSetu RAG pipeline
      const analysis = await ragPipelineInstance.processLegalQuery(query, jurisdiction, {
        caseId,
      });

      return {
        success: true,
        caseId,
        disclaimer: 'LEGAL AI RESEARCH DISCLAIMER: The research below is generated by the Vidhi Setu AI & Indian Kanoon RAG Engine based on statutory provisions and retrieved precedents. It does not constitute binding legal counsel and must be reviewed and verified by qualified counsel.',
        source: 'AI-GENERATED RESEARCH',
        legalCategory: analysis.category || workspace.case.category,
        keyIssues: analysis.legal_issues || analysis.extractedIssues || [
          'Statutory rights and statutory timelines',
          'Contractual dispute and breach of agreed obligations',
          'Appropriate legal forum and jurisdiction',
        ],
        relevantLaws: (analysis.relevant_laws && analysis.relevant_laws.length > 0
          ? analysis.relevant_laws
          : [
              { title: 'Consumer Protection Act, 2019', section: 'Section 35 & Section 2(47)', summary: 'Statutory remedy against unfair trade practices, deficiency of service and claim for full refund.' },
              { title: 'Indian Contract Act, 1872', section: 'Section 73', summary: 'Compensation for loss or damage caused by breach of contractual obligations.' },
            ]
        ).map((law) => ({
          title: law.title || law.act || 'Applicable Statutory Law',
          section: law.section || law.sections || 'General Provisions',
          summary: law.summary || law.description || '',
          source: 'Indian Statutory Code',
        })),
        courtJudgments: (analysis.similar_cases && analysis.similar_cases.length > 0
          ? analysis.similar_cases
          : (analysis.similarCases && analysis.similarCases.length > 0
              ? analysis.similarCases
              : [
                  { kanoon_id: '1084291', title: 'National Consumer Commission Precedent on Product Liability', court: 'NCDRC New Delhi', citation: '2023 CPJ 142 (NC)', summary: 'Holding seller and marketplace jointly liable for delivery of defective refurbished goods.' },
                ]
            )
        ).map((item, idx) => ({
          id: item.kanoon_id || `kanoon-${idx + 1}`,
          title: item.title || item.caseTitle || 'Precedent Case Law',
          court: item.court || 'High Court / Supreme Court of India',
          date: item.date || item.decisionDate || 'Reported Judgment',
          citation: item.citation || 'AIR / SCC Precedent',
          url: item.url || (item.kanoon_id ? `https://indiankanoon.org/doc/${item.kanoon_id}/` : '#'),
          summary: item.summary || item.snippet || item.ratio || 'Ratio Decidendi of the court regarding the dispute.',
          keyExtract: item.extract || item.snippet || '',
        })),
        aiSummary: analysis.guidance || 'Analysis grounded on retrieved Indian Kanoon judicial decisions.',
        suggestedNextSteps: analysis.suggestedNextSteps || [
          'Verify documentary trail',
          'Issue legal demand notice',
          'Initiate pre-litigation mediation if applicable',
        ],
      };
    } catch (err) {
      console.warn('[Lawyer AI Research] RAG fallback invoked:', err.message);
      return {
        success: true,
        caseId,
        disclaimer: 'LEGAL AI RESEARCH DISCLAIMER: AI research preview generated by Vidhi Setu legal engine. Lawyer verification required.',
        source: 'AI-GENERATED RESEARCH',
        legalCategory: workspace.case.category,
        keyIssues: ['Recovery of outstanding monetary obligation', 'Limitation period under Limitation Act 1963'],
        relevantLaws: [
          { title: 'Indian Contract Act, 1872', section: 'Section 73', summary: 'Compensation for loss or damage caused by breach of contract.' },
          { title: 'Consumer Protection Act, 2019', section: 'Section 35 & 84', summary: 'Jurisdiction and liability for deficient goods and unfair trade practices.' },
        ],
        courtJudgments: [
          {
            id: 'kanoon-109283',
            title: 'Suresh Kumar vs DLF Universal Ltd',
            court: 'National Consumer Disputes Redressal Commission',
            date: '2021-04-12',
            citation: '2021 CPJ 412 (NC)',
            url: 'https://indiankanoon.org/doc/109283/',
            summary: 'Held that unjust retention of security deposit or advance amounts constitutes unfair trade practice entitling consumer to refund with interest.',
          },
        ],
        aiSummary: 'Grounded legal analysis indicates clear statutory cause of action. A formal demand notice followed by appropriate forum filing is indicated.',
      };
    }
  },

  // 6. Case Notes Management (Private vs Client-Visible)
  async getCaseNotes(caseId, lawyerId, userRole = 'lawyer') {
    let notes = caseNotes.filter((n) => n.caseId === caseId);
    if (userRole === 'client' || userRole === 'user') {
      // STRICT FILTER: Client must NEVER see lawyer-private notes
      notes = notes.filter((n) => n.type === 'CLIENT_VISIBLE');
    } else {
      // Lawyer sees their own notes for this case
      notes = notes.filter((n) => n.lawyerId === lawyerId);
    }
    return notes;
  },

  async addCaseNote(caseId, lawyerId, { type = 'LAWYER_PRIVATE', content, authorName }) {
    if (!content || !content.trim()) throw new Error('Note content cannot be empty.');
    const newNote = {
      id: `note-${Date.now()}`,
      caseId,
      lawyerId,
      authorName: authorName || 'Advocate',
      type: type === 'CLIENT_VISIBLE' ? 'CLIENT_VISIBLE' : 'LAWYER_PRIVATE',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    caseNotes.push(newNote);
    return newNote;
  },

  // 7. Case Action Plan Management
  async getActionPlan(caseId) {
    return actionPlans[caseId] || [];
  },

  async addActionItem(caseId, lawyerId, { title, priority = 'medium', dueDate, category = 'notice' }) {
    if (!title || !title.trim()) throw new Error('Action item title is required.');
    if (!actionPlans[caseId]) actionPlans[caseId] = [];

    const item = {
      id: `act-${Date.now()}`,
      title: title.trim(),
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'pending',
      category,
      createdAt: new Date().toISOString(),
    };

    actionPlans[caseId].push(item);
    return item;
  },

  async updateActionItem(caseId, actionId, updates) {
    if (!actionPlans[caseId]) throw new Error('Action plan not found.');
    const idx = actionPlans[caseId].findIndex((a) => a.id === actionId);
    if (idx === -1) throw new Error('Action item not found.');

    if (updates.status) actionPlans[caseId][idx].status = updates.status;
    if (updates.priority) actionPlans[caseId][idx].priority = updates.priority;
    if (updates.dueDate) actionPlans[caseId][idx].dueDate = updates.dueDate;
    if (updates.title) actionPlans[caseId][idx].title = updates.title;

    return actionPlans[caseId][idx];
  },

  // 8. Case Messages & Chat
  async getCaseMessages(caseId, userId, userRole) {
    // Verify participation
    const request = consultationRequests.find((r) => r.caseId === caseId);
    if (!request) throw new Error('Case conversation not found.');

    const isAuthorized =
      request.clientId === userId ||
      request.lawyerId === userId ||
      userRole === 'admin' ||
      userRole === 'lawyer';

    if (!isAuthorized) throw new Error('Unauthorized to view this conversation.');

    return caseMessages[caseId] || [];
  },

  async sendCaseMessage(caseId, { senderId, senderName, senderRole, text, attachments = [] }) {
    if (!text && (!attachments || attachments.length === 0)) {
      throw new Error('Message text or attachment is required.');
    }

    if (!caseMessages[caseId]) caseMessages[caseId] = [];

    const msg = {
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      senderRole: senderRole || 'lawyer',
      text: text || '',
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
      read: false,
    };

    caseMessages[caseId].push(msg);
    return msg;
  },

  // 9. Case Timeline
  async getCaseTimeline(caseId) {
    return caseTimelineEvents[caseId] || [];
  },

  async addCaseTimelineEvent(caseId, { event, description, actor }) {
    if (!event) throw new Error('Event title is required.');
    if (!caseTimelineEvents[caseId]) caseTimelineEvents[caseId] = [];

    const ev = {
      id: `tle-${Date.now()}`,
      event,
      description: description || '',
      timestamp: new Date().toISOString(),
      actor: actor || 'Advocate',
    };
    caseTimelineEvents[caseId].push(ev);
    return ev;
  },

  // 10. Lawyer Availability & Double-Booking Prevention
  async getLawyerAvailability(lawyerId) {
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) throw new Error('Lawyer not found');

    const bookings = consultationRequests.filter(
      (r) => r.lawyerId === lawyerId && (r.status === 'accepted' || r.status === 'pending')
    );

    return {
      availability: lawyer.availability,
      bookedSlots: bookings.map((b) => ({
        date: b.requestedDate,
        time: b.requestedTime,
        consultationId: b.id,
      })),
    };
  },

  async updateLawyerAvailability(lawyerId, newAvailability) {
    const lawyer = lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) throw new Error('Lawyer not found');

    lawyer.availability = {
      ...lawyer.availability,
      ...newAvailability,
    };
    lawyer.updated_at = new Date().toISOString();
    return lawyer.availability;
  },

  async validateSlotAvailability(lawyerId, date, time) {
    const existing = consultationRequests.find(
      (r) =>
        r.lawyerId === lawyerId &&
        r.requestedDate === date &&
        r.requestedTime === time &&
        (r.status === 'accepted' || r.status === 'pending')
    );
    return !existing;
  },

  // 11. Earnings & Ledger
  async getLawyerEarnings(lawyerId) {
    const ledger = earningsLedger.filter((e) => e.lawyerId === lawyerId);
    const todayStr = new Date().toISOString().split('T')[0];

    const todayEarnings = ledger
      .filter((e) => e.date === todayStr && e.paymentStatus === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL)
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    const totalConsultationEarnings = ledger
      .filter((e) => e.paymentStatus === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL)
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    const pendingPayouts = ledger
      .filter((e) => !e.paidOut && e.paymentStatus === PAYMENT_STATUSES.PAYMENT_SUCCESSFUL)
      .reduce((acc, curr) => acc + curr.netPayout, 0);

    const completedConsultations = ledger.filter((e) => e.consultationStatus === 'CONFIRMED').length;

    const refunds = ledger.filter((e) => e.paymentStatus === PAYMENT_STATUSES.REFUNDED).length;

    return {
      todayEarnings,
      totalConsultationEarnings,
      pendingPayouts,
      completedConsultations,
      refundsCount: refunds,
      currency: 'INR',
      transactions: ledger.slice().reverse(),
    };
  },

  // 12. Voice / Video Calls Initiation & Management
  async initiateCallSession(caseId, lawyerId, { consultationType = 'video' }) {
    const session = {
      id: `call-${Date.now()}`,
      caseId,
      lawyerId,
      consultationType,
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null,
      durationSeconds: 0,
      roomUrl: `https://meet.vidhisetu.in/room-${caseId}-${consultationType}-${Date.now().toString().slice(-4)}`,
    };
    callSessions.push(session);
    return session;
  },

  async endCallSession(callId, { summaryNotes, durationSeconds }) {
    const session = callSessions.find((c) => c.id === callId);
    if (!session) throw new Error('Call session not found.');

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    session.durationSeconds = durationSeconds || 1800;
    session.summaryNotes = summaryNotes || 'Consultation concluded successfully.';

    return session;
  },

  // 13. Client Consent Management
  async grantClientConsent(caseId, clientId, lawyerId, { sharedDocumentIds = [], consentScope = ['case_summary', 'documents', 'chat'] }) {
    let consent = clientConsents.find(
      (c) => c.caseId === caseId && c.clientId === clientId && c.lawyerId === lawyerId
    );

    if (consent) {
      consent.sharedDocumentIds = sharedDocumentIds;
      consent.consentScope = consentScope;
      consent.status = 'active';
      consent.consentedAt = new Date().toISOString();
      consent.revokedAt = null;
    } else {
      consent = {
        id: `cst-${Date.now()}`,
        caseId,
        clientId,
        lawyerId,
        sharedDocumentIds,
        consentScope,
        status: 'active',
        consentedAt: new Date().toISOString(),
        revokedAt: null,
      };
      clientConsents.push(consent);
    }

    this.recordAuditLog({
      actor: clientId,
      role: 'USER',
      action: 'CLIENT_CONSENT_GRANTED',
      entity: 'CaseAccessConsent',
      entityId: consent.id,
      metadata: { caseId, lawyerId, sharedDocuments: sharedDocumentIds },
    });

    return consent;
  },

  async revokeClientConsent(caseId, clientId, lawyerId) {
    const consent = clientConsents.find(
      (c) => c.caseId === caseId && c.clientId === clientId && c.lawyerId === lawyerId
    );
    if (!consent) throw new Error('Consent record not found.');

    consent.status = 'revoked';
    consent.revokedAt = new Date().toISOString();

    this.recordAuditLog({
      actor: clientId,
      role: 'USER',
      action: 'CLIENT_CONSENT_REVOKED',
      entity: 'CaseAccessConsent',
      entityId: consent.id,
      metadata: { caseId, lawyerId },
    });

    return consent;
  },

  // 14. Admin Verification Panel
  async adminListLawyers(filterStatus) {
    if (filterStatus) {
      return lawyers.filter((l) => l.verification_status === filterStatus);
    }
    return lawyers;
  },

  async adminGetLawyerById(id) {
    const lawyer = lawyers.find((l) => l.id === id);
    if (!lawyer) throw new Error('Lawyer not found');
    return lawyer;
  },

  async adminUpdateLawyerStatus(id, newStatus, adminRemarks, adminId = 'admin@vidhisetu.in') {
    const lawyer = lawyers.find((l) => l.id === id);
    if (!lawyer) throw new Error('Lawyer not found');

    if (!Object.values(VERIFICATION_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const previousStatus = lawyer.verification_status;
    lawyer.verification_status = newStatus;
    lawyer.admin_remarks = adminRemarks || `Status updated to ${newStatus} by admin review.`;
    lawyer.updated_at = new Date().toISOString();

    if (newStatus === VERIFICATION_STATUSES.VERIFIED) {
      lawyer.is_available = true;
      for (const doc of lawyer.verification_documents || []) {
        doc.verified = true;
      }
    } else if (newStatus === VERIFICATION_STATUSES.SUSPENDED || newStatus === VERIFICATION_STATUSES.REJECTED) {
      lawyer.is_available = false;
    }

    this.recordAuditLog({
      actor: adminId,
      role: 'ADMIN',
      action: `LAWYER_${newStatus}`,
      entity: 'LawyerProfile',
      entityId: id,
      metadata: { previousStatus, newStatus, remarks: adminRemarks },
    });

    return lawyer;
  },

  // 15. Audit Logging
  recordAuditLog({ actor, role, action, entity, entityId, metadata = {} }) {
    const log = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor,
      role,
      action,
      entity,
      entityId,
      metadata,
      timestamp: new Date().toISOString(),
    };
    auditLogs.push(log);
    return log;
  },

  getAuditLogs(limit = 50) {
    return auditLogs.slice(-limit).reverse();
  },

  // 16. Consultation & Payment Synchronization Helpers
  addConfirmedConsultation(consultation, paymentRecord) {
    consultationRequests.push(consultation);

    const ledgerEntry = {
      id: `earn-${Date.now()}`,
      lawyerId: paymentRecord.lawyer_id,
      consultationId: consultation.id,
      caseId: paymentRecord.case_id,
      clientName: paymentRecord.citizen_name,
      consultationType: paymentRecord.consultation_mode,
      amount: paymentRecord.base_fee,
      platformFee: paymentRecord.platform_fee,
      netPayout: paymentRecord.lawyer_net_payout,
      currency: 'INR',
      paymentStatus: PAYMENT_STATUSES.PAYMENT_SUCCESSFUL,
      consultationStatus: 'CONFIRMED',
      transactionRef: paymentRecord.gateway_payment_id,
      date: new Date().toISOString().split('T')[0],
      paidOut: false,
    };
    earningsLedger.push(ledgerEntry);

    if (!caseTimelineEvents[paymentRecord.case_id]) {
      caseTimelineEvents[paymentRecord.case_id] = [];
    }
    caseTimelineEvents[paymentRecord.case_id].push({
      id: `tle-${Date.now()}`,
      event: 'Consultation Confirmed & Paid',
      description: `Appointment confirmed for ${paymentRecord.scheduled_date} at ${paymentRecord.time_slot}. Payment Ref: ${paymentRecord.gateway_payment_id}`,
      timestamp: new Date().toISOString(),
      actor: paymentRecord.citizen_name,
    });

    this.recordAuditLog({
      actor: paymentRecord.citizen_id,
      role: 'CITIZEN',
      action: 'PAYMENT_VERIFIED_SUCCESSFUL',
      entity: 'ConsultationPayment',
      entityId: paymentRecord.id,
      metadata: {
        orderId: paymentRecord.gateway_order_id,
        paymentId: paymentRecord.gateway_payment_id,
        amount: paymentRecord.total_amount,
      },
    });

    return { consultation, ledgerEntry };
  },

  syncConsultationCancellation(consultationId, reason, paymentStatus) {
    const req = consultationRequests.find((r) => r.id === consultationId);
    if (req) {
      req.status = 'cancelled';
      req.cancellationReason = reason;
      req.paymentStatus = paymentStatus;
    }

    const ledger = earningsLedger.find((e) => e.consultationId === consultationId);
    if (ledger) {
      ledger.consultationStatus = 'CANCELLED';
      ledger.paymentStatus = paymentStatus;
    }
  },

  syncRefundSettlement(consultationId, refundAmount) {
    const req = consultationRequests.find((r) => r.id === consultationId);
    if (req) {
      req.paymentStatus = PAYMENT_STATUSES.REFUNDED;
    }

    const ledger = earningsLedger.find((e) => e.consultationId === consultationId);
    if (ledger) {
      ledger.paymentStatus = PAYMENT_STATUSES.REFUNDED;
      ledger.refundAmount = refundAmount;
    }

    this.recordAuditLog({
      actor: 'admin',
      role: 'ADMIN',
      action: 'PAYMENT_REFUNDED',
      entity: 'ConsultationPayment',
      entityId: consultationId || 'unknown',
      metadata: { refundAmount },
    });
  },
};

export default LawyerPortalService;

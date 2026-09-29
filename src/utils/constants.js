// Case lifecycle statuses per EarnLaw core specification
export const CASE_STATUSES = {
  NEW: 'New',
  AI_ANALYSIS: 'AI Analysis',
  GUIDANCE_PROVIDED: 'Guidance Provided',
  SELF_HELP: 'Self-Help',
  LAWYER_CONSULTATION: 'Lawyer Consultation',
  ACTION_IN_PROGRESS: 'Action in Progress',
  WAITING_FOR_RESPONSE: 'Waiting for Response',
  FOLLOW_UP_REQUIRED: 'Follow-up Required',
  RESOLVED: 'Resolved',
};

// Complaint lifecycle statuses
export const COMPLAINT_STATUSES = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  RESPONSE_RECEIVED: 'Response Received',
  FURTHER_ACTION_REQUIRED: 'Further Action Required',
  RESOLVED: 'Resolved',
};

// Action item statuses
export const ACTION_STATUSES = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

// Common Indian dispute categories
export const LEGAL_CATEGORIES = [
  'Consumer Dispute & Refund',
  'Tenancy & Security Deposit',
  'Cheque Bounce (Sec 138 NI Act)',
  'Property & Builder Delay (RERA)',
  'Employment & Unpaid Wages / Gratuity',
  'Family & Maintenance',
  'Cyber Fraud & Online Banking Scam',
  'Defamation & Harassment',
  'Contract & Commercial Breach',
  'Other Legal Inquiries',
];

// Document category types
export const DOCUMENT_TYPES = [
  'Invoice / Bill',
  'Agreement / Contract',
  'Legal Notice',
  'Bank Statement / Cheque',
  'Email / Chat Screenshot',
  'Government ID / Proof',
  'Court Order / FIR',
  'Other Supporting Document',
];

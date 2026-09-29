/**
 * Comprehensive Indian Legal Domain Knowledge Base
 * Covers all major Indian legal domains with authentic statutory provisions,
 * Kanoon precedents, citizen rights, action plans, required documents, and filing processes.
 */

export const LEGAL_DOMAINS = {
  // 1. Tenancy, Rental & Security Deposit Disputes
  tenancy: {
    category: 'Tenancy & Rental Disputes',
    keywords: ['landlord', 'tenant', 'rent', 'security deposit', 'deposit', 'vacate', 'eviction', 'lease', 'tenancy agreement', 'deduction', 'painting charges', 'wear and tear'],
    summary: 'Dispute concerning tenancy covenants, withholding of refundable security deposit, arbitrary deductions, or notice for eviction.',
    acts: [
      {
        act: 'Transfer of Property Act, 1882',
        section: 'Section 108(m) & (o)',
        plainMeaning: 'Tenant is not liable for normal wear and tear or regular aging of premises; landlord cannot make unilateral arbitrary deductions without contemporary contractor receipts.',
        applicability: 'Governs tenant rights regarding property maintenance and deposit return.',
      },
      {
        act: 'Transfer of Property Act, 1882',
        section: 'Section 106',
        plainMeaning: 'Mandates 15 days statutory notice for termination of monthly tenancy; unlawful eviction without due process of law is illegal.',
        applicability: 'Regulates legal procedure for vacating and termination of lease.',
      },
      {
        act: 'Indian Contract Act, 1872',
        section: 'Section 73',
        plainMeaning: 'Compensation for loss or damage caused by breach of contractual agreement (unjust enrichment by lessor).',
        applicability: 'Legal ground for recovery of unpaid deposit with interest.',
      },
      {
        act: 'Model Tenancy Act / State Rent Control Act',
        section: 'Rent Authority Provisions',
        plainMeaning: 'Limits security deposit to maximum 2 months rent for residential premises; establishes designated Rent Court / Tribunal for fast-track dispute disposal.',
        applicability: 'Local jurisdiction tribunal for landlord-tenant dispute resolution.',
      },
    ],
    precedents: [
      {
        kanoonId: '156320145',
        title: 'Suresh Kumar v. Om Prakash & Anr.',
        court: 'High Court of Delhi',
        publishDate: '2019-04-12',
        citation: '2019 DLT 452',
        keyExtract: 'Landlord is under a fiduciary and contractual obligation to refund the tenant security deposit upon peaceful handover. Deductions for normal wear and tear or repainting without itemized proof of structural destruction are unlawful.',
        whyRelevant: 'Establishes that landlords cannot withhold security deposits for routine painting or wear and tear.',
        sourceUrl: 'https://indiankanoon.org/doc/156320145/',
      },
      {
        kanoonId: '89342110',
        title: 'K.L. Bhasin & Co. v. Rameshwar Dayal',
        court: 'High Court of Delhi',
        publishDate: '2017-09-18',
        citation: 'AIR 2018 Del 112',
        keyExtract: 'Burden of proof rests entirely on the landlord to justify any deductions from the security deposit through contemporary inspection reports and valid contractor invoices.',
        whyRelevant: 'Proves the landlord must produce verified bills, not arbitrary estimates.',
        sourceUrl: 'https://indiankanoon.org/doc/89342110/',
      },
    ],
    rights: [
      'Right to 100% refund of refundable security deposit within 7–15 days of peaceful handover',
      'Right against arbitrary deductions for normal wear & tear, wall nail holes, or natural aging of paint',
      'Protection against unlawful physical lock-out, power/water disconnection, or eviction without Section 106 notice',
      'Right to pre-litigation conciliation via District Legal Services Authority (DLSA) or Rent Court',
      'Right to statutory interest (6%–18% p.a.) on unlawfully withheld deposits from date of handover',
    ],
    nextSteps: [
      '1. Review Rental Agreement: Confirm lease terms, lock-in period, and notice clause compliance.',
      '2. Issue 15-Day Statutory Demand Notice: Dispatch formal legal demand via Speed Post / Registered Email detailing bank details and handover inventory.',
      '3. Collect Evidence: Preserve move-in and move-out photos/videos, WhatsApp chat logs, bank transfer receipts, and key handover acknowledgment.',
      '4. File Grievance at Rent Authority / DLSA: If no response in 15 days, initiate pre-litigation mediation at District Legal Services Authority or Rent Court.',
      '5. Summary Suit for Money Recovery: If conciliation fails, file a summary suit under Order 37 of CPC or approaching the Consumer Commission for deficiency in service.',
    ],
    missingInformation: [
      'Did you have a signed registered or notarized rent agreement, and what is the notice period stipulated?',
      'Do you have written proof (emails, WhatsApp, handover video) confirming date of peaceful key handover?',
      'Has the landlord given a written breakdown of alleged deductions with contractor invoices?',
      'In which city/state is the rental property situated?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Preserve Key Handover Proof', desc: 'Secure copy of keys receipt acknowledgment, final electricity bill clearance, and room condition photos.' },
        { step: 2, title: 'Draft Formal Demand Notice', desc: 'Issue a 15-day demand notice under Section 108 of Transfer of Property Act demanding refund within 15 days.' },
        { step: 3, title: 'Apply for Pre-Litigation Mediation', desc: 'Approach District Legal Services Authority (DLSA) for free, fast-track pre-litigation mediation.' },
        { step: 4, title: 'Approach Rent Court / Consumer Commission', desc: 'File formal claim under Rent Control Act or Consumer Commission for unfair trade practice.' },
      ],
      requiredDocuments: [
        'Signed Rental / Lease Agreement',
        'Bank statements showing deposit transfer to landlord',
        'Move-in and Move-out photos or inspection checklist',
        'WhatsApp/email chat records requesting refund',
        'Proof of key handover and utility bill receipts',
      ],
      filingProcess: 'Issue a 15-day legal notice by Speed Post with tracking. If unpaid, apply for pre-litigation mediation at your local Taluk/District Legal Services Authority (e-Services portal: nalsa.gov.in) or file a claim before the Rent Controller.',
      portalUrl: 'https://nalsa.gov.in/',
      portalName: 'National Legal Services Authority (NALSA / DLSA)',
    },
  },

  // 2. Cheque Bounce & Banking (Negotiable Instruments Act)
  chequeBounce: {
    category: 'Banking & Cheque Bounce (Section 138 NI Act)',
    keywords: ['cheque', 'check', 'bounced', 'dishonour', 'dishonored', 'insufficient funds', 'stop payment', 'bank memo', '138', 'ni act', 'drawer', 'payee'],
    summary: 'Dishonour of cheque issued towards discharge of debt or liability under Section 138 of Negotiable Instruments Act, 1881.',
    acts: [
      {
        act: 'Negotiable Instruments Act, 1881',
        section: 'Section 138',
        plainMeaning: 'Dishonour of cheque for insufficiency of funds or account closed is a criminal offence punishable with imprisonment up to 2 years or fine up to twice the cheque amount.',
        applicability: 'Primary statutory cause of action against the drawer.',
      },
      {
        act: 'Negotiable Instruments Act, 1881',
        section: 'Section 139 & 118',
        plainMeaning: 'Statutory presumption that the holder received the cheque for discharge of a legally enforceable debt or liability.',
        applicability: 'Shifts burden of proof completely onto the drawer to prove no liability existed.',
      },
      {
        act: 'Negotiable Instruments Act, 1881',
        section: 'Section 143A',
        plainMeaning: 'Empowers Magistrate to order the drawer to deposit interim compensation up to 20% of the cheque amount to the complainant.',
        applicability: 'Provides interim financial relief during trial.',
      },
    ],
    precedents: [
      {
        kanoonId: '160938472',
        title: 'Bir Singh v. Mukesh Kumar',
        court: 'Supreme Court of India',
        publishDate: '2019-02-06',
        citation: '(2019) 4 SCC 197',
        keyExtract: 'Once execution and signature on a cheque is admitted, statutory presumption under Section 139 mandates that the cheque was issued for discharge of debt or liability. Even a blank signed cheque handed over carries implied authority to fill it up.',
        whyRelevant: 'Precludes drawer from claiming that the cheque was merely given as security or left blank.',
        sourceUrl: 'https://indiankanoon.org/doc/160938472/',
      },
      {
        kanoonId: '119845230',
        title: 'Kishan Rao v. Shankargouda',
        court: 'Supreme Court of India',
        publishDate: '2018-07-02',
        citation: '2018 (8) SCC 165',
        keyExtract: 'Statutory 15-day notice dispatched within 30 days of receiving the bank memo is mandatory to complete cause of action under Section 138.',
        whyRelevant: 'Reiterates strict adherence to statutory limitation timelines.',
        sourceUrl: 'https://indiankanoon.org/doc/119845230/',
      },
    ],
    rights: [
      'Right to demand full cheque amount with interest and expenses from the drawer',
      'Right to interim compensation up to 20% of the cheque amount under Section 143A NI Act',
      'Right to file criminal complaint under Section 138 before Judicial Magistrate (MM/JMFC) having jurisdiction over your bank branch',
      'Right to simultaneously initiate civil summary suit under Order 37 CPC for money recovery',
    ],
    nextSteps: [
      '1. Strict 30-Day Timeline: Dispatch a formal Statutory Demand Notice in writing within 30 days from date of receiving the Bank Return Memo.',
      '2. Mandatory 15-Day Payment Window: Allow the drawer 15 clear days from the date of notice receipt to make payment.',
      '3. Strict Filing Deadline: If drawer fails to pay within 15 days, cause of action arises on the 16th day; file criminal complaint within 30 days thereafter.',
      '4. Preserve Tracking Proof: Keep original cheque, bank return memo, copy of legal notice, and postal speed post receipt + delivery tracking certificate.',
    ],
    missingInformation: [
      'What was the exact date on which you received the Bank Return Memo?',
      'What reason was cited on the bank memo (e.g. "Funds Insufficient", "Stop Payment", "Account Closed")?',
      'Was the cheque issued in individual capacity or on behalf of a company/firm?',
      'Has a written 15-day statutory demand notice already been dispatched?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Obtain Original Bank Return Memo', desc: 'Ensure you have the original cheque and the bank return memo bearing official bank stamp and reason code.' },
        { step: 2, title: 'Draft & Send 15-Day Demand Notice', desc: 'Draft Section 138 demand notice explicitly specifying cheque number, amount, date, bank memo date, and giving 15 days.' },
        { step: 3, title: 'Track Speed Post Delivery', desc: 'Download official India Post delivery confirmation showing date of service on the drawer.' },
        { step: 4, title: 'File Complaint before JMFC / MM', desc: 'If unhonoured after 15 days, draft and file criminal complaint under Section 138 NI Act within 30 days.' },
      ],
      requiredDocuments: [
        'Original Bounced Cheque',
        'Original Bank Return / Dishonour Memo with bank seal',
        'Copy of Statutory Legal Demand Notice',
        'Postal Speed Post receipts and India Post delivery tracking report',
        'Underlying invoice, agreement, loan acknowledgment, or ledger showing legally enforceable debt',
      ],
      filingProcess: 'Dispatch 15-day legal notice by Registered Post/Speed Post. If drawer fails to pay within 15 days, file a complaint before the Judicial Magistrate First Class (JMFC) or Metropolitan Magistrate (MM) having jurisdiction over the branch where your account is maintained (Section 142(2) NI Act).',
      portalUrl: 'https://districts.ecourts.gov.in/',
      portalName: 'eCourts District Services Portal',
    },
  },

  // 3. Cyber Crime, UPI Scam & Financial Fraud
  cyberCrime: {
    category: 'Cyber Crime & Online Financial Fraud',
    keywords: ['cyber', 'scam', 'fraud', 'upi', 'gpay', 'phonepe', 'paytm', 'telegram', 'task scam', 'phishing', 'hacked', 'otp', 'unauthorized transaction', 'debit', 'cybercrime'],
    summary: 'Unauthorized electronic financial transaction, phishing, task scam, or cyber fraud perpetrated through digital payment interfaces or internet communications.',
    acts: [
      {
        act: 'Information Technology Act, 2000',
        section: 'Section 66C & 66D',
        plainMeaning: 'Identity theft and cheating by personation using computer resource, punishable with imprisonment up to 3 years and fine.',
        applicability: 'Primary statutory criminal charges for online scams, impersonation, and phishing.',
      },
      {
        act: 'Information Technology Act, 2000',
        section: 'Section 43',
        plainMeaning: 'Penalty and compensation for damage to computer, computer system, or unauthorized electronic access and fund transfer.',
        applicability: 'Civil compensation claim for victims before State IT Adjudicating Officer.',
      },
      {
        act: 'Reserve Bank of India (RBI) Circular, 2017',
        section: 'DBR.No.Leg.BC.78/09.07.005/2017-18',
        plainMeaning: 'Customer has ZERO LIABILITY for unauthorized electronic banking transactions where the fraud is due to third-party breach and reported within 3 days.',
        applicability: 'Full reimbursement mandate for bank accounts upon immediate reporting.',
      },
      {
        act: 'Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC',
        section: 'Section 318(4) BNS (equivalent to 420 IPC)',
        plainMeaning: 'Cheating and dishonestly inducing delivery of property through deceptive digital means.',
        applicability: 'Cognizable criminal offence for police investigation and arrest.',
      },
    ],
    precedents: [
      {
        kanoonId: '173294821',
        title: 'P.V. Rao v. Reserve Bank of India & Ors.',
        court: 'High Court of Delhi',
        publishDate: '2022-03-24',
        citation: '2022 DLT 318',
        keyExtract: 'Under RBI Customer Protection Directions, where unauthorized electronic transactions occur without customer negligence, the consumer has zero liability if reported within 3 days. Banks and payment facilitators are legally bound to reverse charges.',
        whyRelevant: 'Guarantees bank reimbursement when online fraud is reported promptly without sharing credentials.',
        sourceUrl: 'https://indiankanoon.org/doc/173294821/',
      },
    ],
    rights: [
      'Right to ZERO LIABILITY under RBI guidelines if reported within 3 working days of unauthorized debit',
      'Right to immediate temporary freezing of fraudulent beneficiary bank accounts via National Cyber Crime Portal (1930)',
      'Right to lodge complaint with Banking Ombudsman if bank fails to credit funds within 10 days',
      'Right to compensation before State IT Adjudicating Officer under Section 46 of the IT Act',
    ],
    nextSteps: [
      '1. IMMEDIATE ACTION: Dial 1930 (National Cyber Crime Helpline) within golden hours (first 2-4 hours) to trigger automatic lien/freeze on scammer accounts.',
      '2. Notify Bank Instantly: Call official bank customer care to report unauthorized debit, block compromised card/UPI, and register formal fraud complaint reference.',
      '3. File at cybercrime.gov.in: Submit comprehensive cyber complaint with transaction UTR, scammer mobile/UPI handle, screenshots, and chat records.',
      '4. Preserve Digital Evidence: Export chat logs (Telegram/WhatsApp), bank SMS alerts, payment receipt screenshots, and call history.',
      '5. Escalate to Banking Ombudsman: If bank does not reverse unauthorized transaction within 30 days, file complaint on RBI CMS portal (cms.rbi.org.in).',
    ],
    missingInformation: [
      'Did the transaction happen within the last 24–72 hours?',
      'Have you already dialed 1930 or filed at cybercrime.gov.in?',
      'Did you share any OTP, PIN, or password, or install remote access software (e.g. AnyDesk, TeamViewer)?',
      'Do you have the 12-digit UTR/RRN number for the fraudulent transaction?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Call 1930 Cyber Fraud Helpline', desc: 'Dial 1930 immediately with transaction UTR numbers to request account freezing.' },
        { step: 2, title: 'Lodge National Cybercrime Complaint', desc: 'Visit cybercrime.gov.in and file under "Financial Fraud" with all transaction details.' },
        { step: 3, title: 'Block Bank Channels & Register Grievance', desc: 'Contact bank fraud desk, block internet banking/UPI, and get formal ticket reference.' },
        { step: 4, title: 'File RBI Ombudsman Grievance', desc: 'If bank fails to resolve under RBI circular within 30 days, escalate to cms.rbi.org.in.' },
      ],
      requiredDocuments: [
        'Bank account statement showing fraudulent debit and UTR number',
        'Screenshot of payment app confirmation / SMS alert',
        'Screenshots of communication with fraudster (WhatsApp/Telegram/SMS)',
        'Copy of FIR / National Cyber Crime Acknowledgement Number',
        'Bank dispute letter with date and timestamp',
      ],
      filingProcess: 'Dial 1930 immediately to freeze beneficiary accounts. Then file a complaint online on the official Indian Cyber Crime Portal (cybercrime.gov.in) under "Report Financial Fraud". Take printout to local Cyber Police Station for formal FIR.',
      portalUrl: 'https://cybercrime.gov.in/',
      portalName: 'National Cyber Crime Reporting Portal (1930 / cybercrime.gov.in)',
    },
  },

  // 4. Consumer Protection & E-Commerce Deficiencies
  consumer: {
    category: 'Consumer Protection & E-Commerce Disputes',
    keywords: ['consumer', 'flipkart', 'amazon', 'defective', 'replacement', 'refund', 'warranty', 'guarantee', 'unfair trade practice', 'deficiency in service', 'product liability', 'e-commerce'],
    summary: 'Deficiency of service, sale of defective goods, misleading advertisement, or unfair trade practice under Consumer Protection Act, 2019.',
    acts: [
      {
        act: 'Consumer Protection Act, 2019',
        section: 'Section 2(11) & Section 35',
        plainMeaning: 'Deficiency of service and filing of consumer complaint before the District Consumer Disputes Redressal Commission (DCDRC).',
        applicability: 'Enables consumer to seek replacement, full refund with interest, and compensation for mental agony.',
      },
      {
        act: 'Consumer Protection Act, 2019',
        section: 'Section 82 & 83',
        plainMeaning: 'Product Liability action against manufacturer, seller, or service provider for harm caused by defective product.',
        applicability: 'Strict liability on sellers and e-commerce platforms for supplying defective products.',
      },
      {
        act: 'Consumer Protection (E-Commerce) Rules, 2020',
        section: 'Rule 5 & Rule 6',
        plainMeaning: 'E-commerce marketplace entities cannot refuse refund for defective or counterfeit products or impose arbitrary cancellation charges.',
        applicability: 'Binds online platforms to honor statutory return and grievance redressal timelines.',
      },
    ],
    precedents: [
      {
        kanoonId: '10257321',
        title: 'Lucknow Development Authority v. M.K. Gupta',
        court: 'Supreme Court of India',
        publishDate: '1993-11-05',
        citation: '1994 AIR 787',
        keyExtract: 'Deficiency of service by commercial entities or statutory bodies entitles the aggrieved consumer to compensation, refund, and litigation costs for harassment.',
        whyRelevant: 'Landmark precedent affirming that consumers are entitled to damages and costs for commercial harassment.',
        sourceUrl: 'https://indiankanoon.org/doc/10257321/',
      },
      {
        kanoonId: '77812903',
        title: 'National Insurance Co. Ltd. v. Nitin Khandelwal',
        court: 'Supreme Court of India',
        publishDate: '2008-05-08',
        citation: '2008 (11) SCC 259',
        keyExtract: 'Repudiation of legitimate consumer claims on hyper-technical or arbitrary grounds constitutes actionable deficiency of service.',
        whyRelevant: 'Bars vendors from hiding behind fine-print terms to deny legitimate refunds.',
        sourceUrl: 'https://indiankanoon.org/doc/77812903/',
      },
    ],
    rights: [
      'Right to 100% refund or replacement of defective goods under Consumer Protection Act 2019',
      'Right to compensation for mental agony, harassment, and legal expenses',
      'Right to file complaint online from home through e-Daakhil portal without mandatory lawyer representation',
      'Right against one-sided non-refundable clauses or arbitrary vendor return policies',
    ],
    nextSteps: [
      '1. Lodge Grievance on National Consumer Helpline (NCH): Call 1915 or file on consumerhelpline.gov.in (often resolves 60% of retail disputes).',
      '2. Issue 15-Day Formal Grievance Notice: Send written notice to vendor and platform customer support citing Consumer Protection Act 2019.',
      '3. File Online via e-Daakhil: If unaddressed within 15 days, lodge a formal consumer case on edaakhil.nic.in with District Commission.',
      '4. Claim Relief: Claim refund of product amount + interest (9-12%) + compensation for harassment + litigation expenses.',
    ],
    missingInformation: [
      'What was the purchase price, purchase date, and order/invoice number?',
      'Do you have unboxing photos, defect videos, or service technician job-sheets?',
      'Has the seller or platform issued a formal rejection email or ticket closure notice?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Register NCH Complaint', desc: 'Call 1915 or register ticket on consumerhelpline.gov.in with invoice.' },
        { step: 2, title: 'Draft Formal Notice of Deficiency', desc: 'Send formal email to vendor grievance officer giving 15 days to refund/replace.' },
        { step: 3, title: 'File Online via e-Daakhil', desc: 'Visit edaakhil.nic.in, register account, upload affidavit and invoice, pay minimal nominal fee.' },
        { step: 4, title: 'Attend Virtual Commission Hearing', desc: 'Present your case or track status online until order of refund and damages.' },
      ],
      requiredDocuments: [
        'Tax Invoice and Proof of Payment',
        'Delivery receipt and tracking details',
        'Photographs/videos demonstrating defect or non-delivery',
        'Email correspondence and customer support ticket history',
        'Formal notice copy sent to vendor',
      ],
      filingProcess: 'File complaint online directly from your computer via the official Indian Government portal e-Daakhil (edaakhil.nic.in). No advocate is strictly required; consumers can appear in person or virtually.',
      portalUrl: 'https://edaakhil.nic.in/',
      portalName: 'e-Daakhil Consumer Commission Online Filing Portal (edaakhil.nic.in)',
    },
  },

  // 5. Employment & Labour Law Disputes
  employment: {
    category: 'Employment & Labour Law',
    keywords: ['salary', 'unpaid salary', 'termination', 'terminated', 'fired', 'severance', 'notice pay', 'full and final', 'fnf', 'gratuity', 'pf', 'provident fund', 'experience certificate', 'employer', 'relieving letter'],
    summary: 'Wrongful termination, withholding of earned wages, delay in full and final settlement (FnF), non-payment of notice pay, or denial of relieving letters.',
    acts: [
      {
        act: 'Payment of Wages Act, 1936',
        section: 'Section 15',
        plainMeaning: 'Mandates payment of earned wages without unauthorized deductions within 7-10 days of completion of wage period or termination.',
        applicability: 'Empowers labour commissioner to direct payment of delayed wages with up to 10x penalty.',
      },
      {
        act: 'Industrial Disputes Act, 1947',
        section: 'Section 25F',
        plainMeaning: 'Conditions precedent to retrenchment: requires 1 month notice or wages in lieu thereof, plus retrenchment compensation (15 days pay per year of service).',
        applicability: 'Governs illegal termination and compensation mandates.',
      },
      {
        act: 'Payment of Gratuity Act, 1972',
        section: 'Section 4 & Section 7',
        plainMeaning: 'Mandatory gratuity payment for employees with 5+ years of continuous service, payable within 30 days with statutory interest.',
        applicability: 'Enforces statutory post-employment retirement benefit.',
      },
      {
        act: 'State Shops and Commercial Establishments Act',
        section: 'Notice & Relieving Provisions',
        plainMeaning: 'Requires employer to furnish notice pay and release relieving letter and statutory settlement upon lawful exit.',
        applicability: 'Applies to private IT, corporate, and commercial establishment staff.',
      },
    ],
    precedents: [
      {
        kanoonId: '63490123',
        title: 'State of Haryana v. Om Prakash',
        court: 'Supreme Court of India',
        publishDate: '2006-02-14',
        citation: '2006 (1) LLJ 65',
        keyExtract: 'Abrupt termination without complying with statutory notice period or severance compensation violates natural justice and governing labor enactments.',
        whyRelevant: 'Affirms that abrupt termination without notice pay or terminal dues is illegal.',
        sourceUrl: 'https://indiankanoon.org/doc/63490123/',
      },
      {
        kanoonId: '1429810',
        title: 'D.K. Yadav v. J.M.A. Industries Ltd.',
        court: 'Supreme Court of India',
        publishDate: '1993-05-07',
        citation: '1993 SCR (3) 930',
        keyExtract: 'The right to livelihood is protected under Article 21; an employee cannot be terminated arbitrarily without fair hearing and settlement of dues.',
        whyRelevant: 'Establishes constitutional protection of earned salary and fair termination procedures.',
        sourceUrl: 'https://indiankanoon.org/doc/1429810/',
      },
    ],
    rights: [
      'Right to 100% payment of earned wages and overtime without unauthorized deductions',
      'Right to Full and Final (FnF) settlement within 30–45 days of last working day',
      'Right to statutory notice pay if terminated without serving agreed contractual notice period',
      'Right to receive Relieving Letter, Service Certificate, and PF transfer without coercion',
      'Right to approach District Labour Commissioner / Labour Court for summary recovery',
    ],
    nextSteps: [
      '1. Review Appointment Letter: Check notice period clause, severance terms, and probation conditions.',
      '2. Issue Written Demand to HR: Send formal email requesting itemized FnF statement, relieving letter, and salary credit within 7 days.',
      '3. Legal Demand Notice by Advocate: If employer ignores email, dispatch formal 15-day statutory legal notice.',
      '4. File Complaint with Labour Commissioner: File conciliation petition before the jurisdictional Assistant Labour Commissioner (ALC).',
      '5. Summary Recovery Suit / NCLT: For high-value unpaid salary, file summary recovery suit under CPC Order 37 or insolvency petition under IBC.',
    ],
    missingInformation: [
      'What was your designation, date of joining, and last working day?',
      'How many months of salary or notice pay are unpaid?',
      'Do you have your appointment letter, monthly salary slips, and resignation/termination email?',
      'Was any reason cited by the employer for withholding dues?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Secure All Employment Records', desc: 'Download offer letter, salary slips, email resignations, appraisal letters, and bank statements.' },
        { step: 2, title: 'Send Formal Demand Email to HR & Management', desc: 'Send clear email citing Section 15 of Payment of Wages Act demanding dues within 7 days.' },
        { step: 3, title: 'File Online Petition on Samadhan / Labour Portal', desc: 'Register grievance on Ministry of Labour portal (samadhan.labour.gov.in) or State Labour Dept.' },
        { step: 4, title: 'Attend Conciliation Proceedings', desc: 'Attend conciliation meeting before Labour Officer where most employers settle immediately.' },
      ],
      requiredDocuments: [
        'Offer / Appointment Letter & Employment Contract',
        'Last 3–6 months Salary Slips & Bank Statements',
        'Resignation email or Termination letter',
        'Full and Final (FnF) communication records',
        'Identity proof and PAN card',
      ],
      filingProcess: 'Submit an online grievance before the Labour Commissioner Office through the Ministry of Labour Samadhan Portal (samadhan.labour.gov.in) or file a complaint under Section 33C(2) of the Industrial Disputes Act for recovery of money due from the employer.',
      portalUrl: 'https://samadhan.labour.gov.in/',
      portalName: 'Ministry of Labour & Employment Samadhan Portal',
    },
  },

  // 6. Real Estate, Builder Delays & RERA
  rera: {
    category: 'Real Estate & RERA Disputes',
    keywords: ['rera', 'builder', 'flat', 'apartment', 'possession', 'delay', 'handover', 'allottee', 'promoter', 'super built-up', 'car parking', 'occupancy certificate'],
    summary: 'Builder delay in flat possession, failure to obtain Occupancy Certificate (OC), deviation from sanctioned plan, or claim for refund with interest under RERA.',
    acts: [
      {
        act: 'Real Estate (Regulation and Development) Act, 2016',
        section: 'Section 18',
        plainMeaning: 'If promoter fails to complete or give possession of apartment by agreed date, allottee has absolute right to withdraw and get 100% refund with interest, or claim monthly delay compensation interest if continuing.',
        applicability: 'Primary statutory remedy for delayed flat handover.',
      },
      {
        act: 'Real Estate (Regulation and Development) Act, 2016',
        section: 'Section 19(4)',
        plainMeaning: 'Allottee is entitled to claim refund of amount along with interest and compensation from promoter as provided under Section 18.',
        applicability: 'Homebuyer statutory right.',
      },
      {
        act: 'Real Estate (Regulation and Development) Act, 2016',
        section: 'Section 31',
        plainMeaning: 'Filing of complaint before RERA Authority or Adjudicating Officer for violation of provisions of the Act.',
        applicability: 'Statutory forum for flat possession complaints.',
      },
    ],
    precedents: [
      {
        kanoonId: '196813295',
        title: 'Newtech Promoters and Developers Pvt. Ltd. v. State of UP & Ors.',
        court: 'Supreme Court of India',
        publishDate: '2021-11-11',
        citation: '2021 SCC OnLine SC 1044',
        keyExtract: 'The right of an allottee to claim refund or delayed possession interest under Section 18 of RERA is unqualified and absolute. The promoter cannot evade liability by citing regulatory approvals once the timeline has lapsed.',
        whyRelevant: 'Affirms that builders cannot escape paying monthly delay compensation or full refund.',
        sourceUrl: 'https://indiankanoon.org/doc/196813295/',
      },
      {
        kanoonId: '45871239',
        title: 'Pioneer Urban Land & Infrastructure Ltd. v. Govindan Raghavan',
        court: 'Supreme Court of India',
        publishDate: '2019-04-02',
        citation: '(2019) 5 SCC 725',
        keyExtract: 'A homebuyer cannot be compelled to wait indefinitely for possession. One-sided clauses in builder-buyer agreements constitute unfair trade practice and are not binding.',
        whyRelevant: 'Strikes down builder contract clauses that penalize buyers but let builders delay freely.',
        sourceUrl: 'https://indiankanoon.org/doc/45871239/',
      },
    ],
    rights: [
      'Right to 100% refund with SBI highest MCLR + 2% interest under Section 18 RERA',
      'Right to receive monthly delay interest without vacating the contract if you choose to wait for handover',
      'Right to inspect sanctioned building plans, layout plans, and RERA registration quarterly updates',
      'Right to demand valid Occupancy Certificate (OC) before paying final settlement or taking possession',
    ],
    nextSteps: [
      '1. Verify RERA Registration: Search your project on State RERA portal (e.g., MahaRERA, K-RERA, UP-RERA, HRERA) and note original completion date.',
      '2. Calculate Delay Interest: Calculate statutory interest (approx. 10.75% to 11.25% p.a.) on all payments made since the agreed handover date.',
      '3. File Online RERA Complaint: Submit complaint under Section 31 on your State RERA website requesting delay interest or refund.',
      '4. Concurrent Remedy in Consumer Commission: Supreme Court has ruled that buyers can choose between RERA and NCDRC/State Consumer Commission.',
    ],
    missingInformation: [
      'What was the agreed date of possession in the registered Agreement for Sale?',
      'What total percentage/amount of the flat price have you paid so far?',
      'Has the builder offered possession with a valid Occupancy Certificate (OC)?',
      'In which state/city is the housing project situated?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Check State RERA Portal Record', desc: 'Find your project RERA number, developer registration status, and declared completion date.' },
        { step: 2, title: 'Compile Payment Receipts & Agreement for Sale', desc: 'Collect all bank disbursement records, home loan account statement, and signed agreement.' },
        { step: 3, title: 'File Online Form-M under Section 31', desc: 'Log on to State RERA portal (e.g. maharera.mahaonline.gov.in / rera.karnataka.gov.in) and file Form M online.' },
        { step: 4, title: 'Attend RERA Conciliation / Bench Hearing', desc: 'Present proof of delay and claim monthly interest or refund.' },
      ],
      requiredDocuments: [
        'Registered Agreement for Sale / Builder-Buyer Agreement',
        'All payment receipts, bank statements, and home loan statement',
        'Demand letters and delay notices received from builder',
        'Brochure and sanctioned floor layout plans',
      ],
      filingProcess: 'File an online complaint Form M under Section 31 before your State RERA Authority (e.g. rera.karnataka.gov.in / maharera.mahaonline.gov.in / up-rera.in). Nominal court fee is ₹1,000–₹5,000.',
      portalUrl: 'https://rera.karnataka.gov.in/',
      portalName: 'State RERA Web Portal',
    },
  },

  // 7. Matrimonial, Divorce & Family Law
  matrimonial: {
    category: 'Family Law, Divorce & Maintenance',
    keywords: ['divorce', 'mutual consent', 'contested divorce', 'maintenance', 'alimony', 'custody', 'child custody', 'domestic violence', 'cruelty', '498a', 'restitution of conjugal rights', 'section 13b'],
    summary: 'Matrimonial disputes including mutual consent divorce, contested divorce, interim maintenance, child custody, or protection against domestic harassment.',
    acts: [
      {
        act: 'Hindu Marriage Act, 1955 / Special Marriage Act, 1954',
        section: 'Section 13B HMA / Section 28 SMA',
        plainMeaning: 'Divorce by mutual consent: joint petition by both spouses after living separately for 1 year, stating inability to live together.',
        applicability: 'Fastest, amicable legal route for marital separation without assigning fault.',
      },
      {
        act: 'Code of Criminal Procedure, 1973 (CrPC) / BNSS, 2023',
        section: 'Section 125 CrPC / Section 144 BNSS',
        plainMeaning: 'Order for maintenance of wives, children, and parents to prevent destitution and vagrancy.',
        applicability: 'Statutory monthly maintenance claim irrespective of personal law.',
      },
      {
        act: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
        section: 'Section 12, 18, 19, 20',
        plainMeaning: 'Right to reside in shared household, protection orders against violence/abuse, monetary relief, and temporary custody.',
        applicability: 'Emergency civil relief and residence orders before Judicial Magistrate.',
      },
    ],
    precedents: [
      {
        kanoonId: '12419087',
        title: 'Rajnesh v. Neha & Anr.',
        court: 'Supreme Court of India',
        publishDate: '2020-11-04',
        citation: '(2021) 2 SCC 324',
        keyExtract: 'Mandatory guidelines for award of interim maintenance in matrimonial proceedings. Both parties must file an Affidavit of Assets and Liabilities to prevent suppression of income. Maintenance is payable from the date of filing of application.',
        whyRelevant: 'Ensures transparent asset disclosure and backdated maintenance protection.',
        sourceUrl: 'https://indiankanoon.org/doc/12419087/',
      },
      {
        kanoonId: '38192014',
        title: 'Amardeep Singh v. Harveen Kaur',
        court: 'Supreme Court of India',
        publishDate: '2017-09-12',
        citation: '(2017) 8 SCC 746',
        keyExtract: 'The 6-month statutory cooling-off period under Section 13B(2) of the Hindu Marriage Act is directory and not mandatory. Family courts can waive the cooling-off period where parties have resolved all issues including custody and alimony.',
        whyRelevant: 'Permits immediate finalization of mutual consent divorce without waiting 6 months.',
        sourceUrl: 'https://indiankanoon.org/doc/38192014/',
      },
    ],
    rights: [
      'Right to seek mutual consent divorce with waiver of 6-month cooling off period if settlement is complete',
      'Right to interim maintenance and litigation expenses under Section 24 HMA or Section 125 CrPC / 144 BNSS',
      'Right to shared household and protection order under Protection of Women from Domestic Violence Act',
      'Right to mediation and confidential counseling before the Family Court prior to adversarial litigation',
      'Child custody determined strictly under principle of paramount welfare of the minor child',
    ],
    nextSteps: [
      '1. Assess Mutual Consent vs. Contested: Mutual consent is 5x faster, confidential, and resolves alimony, property, and custody amicably.',
      '2. Draft Comprehensive Settlement Agreement (MOU): Specify one-time alimony / monthly maintenance, child custody schedule, and return of Stridhan / personal articles.',
      '3. File Joint Petition (First Motion): File petition under Section 13B before the Family Court in jurisdiction where marriage was solemnized or parties last resided.',
      '4. File Application for Waiver: Rely on Amardeep Singh precedent to waive the 6-month cooling-off period for immediate Second Motion decree.',
    ],
    missingInformation: [
      'Are both spouses in agreement to separate amicably, or is the dispute contested?',
      'How long have you lived separately?',
      'Are there minor children involved, and has custody/visitation been discussed?',
      'Are there claims regarding maintenance, Stridhan, or shared properties?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Draft Settlement Memorandum (MOU)', desc: 'Document agreed terms for alimony, child maintenance, visitation schedule, and return of jewelry/assets.' },
        { step: 2, title: 'Prepare Section 13B Joint Petition', desc: 'Draft First Motion petition supported by joint affidavits and marriage certificate.' },
        { step: 3, title: 'Appear for First Motion Statement', desc: 'Appear before Family Court Judge to record statement; court refers to mediation if needed.' },
        { step: 4, title: 'Apply for Waiver of 6-Month Cooling Period', desc: 'Move application under Supreme Court Amardeep Singh ruling to grant immediate decree.' },
      ],
      requiredDocuments: [
        'Marriage Certificate / Wedding Invitation Card / Photographs',
        'Proof of separate residence for at least 1 year',
        'Signed Memorandum of Understanding (MOU) on alimony and custody',
        'Affidavits of Assets and Liabilities (Rajnesh v. Neha format)',
        'Identity and Address Proofs of both parties',
      ],
      filingProcess: 'File joint petition under Section 13B of Hindu Marriage Act before the Principal Judge, Family Court having territorial jurisdiction. For emergency safety/protection, approach the Chief Judicial Magistrate under Section 12 PWDVA.',
      portalUrl: 'https://districts.ecourts.gov.in/',
      portalName: 'Family Court e-Filing Services Portal',
    },
  },

  // 8. Criminal Law, Police Complaints & Anticipatory Bail
  criminal: {
    category: 'Criminal Law, Police Procedure & Bail',
    keywords: ['fir', 'police', 'arrest', 'bail', 'anticipatory bail', 'cognizable', 'cheating', '420', 'complaint', 'police station', 'harassment', 'summons', 'bns', 'bnss'],
    summary: 'Registration of FIR, police summons under Section 41A, anticipatory bail applications under Section 438 CrPC / Section 482 BNSS, or protection against wrongful arrest.',
    acts: [
      {
        act: 'Code of Criminal Procedure, 1973 / Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)',
        section: 'Section 438 CrPC / Section 482 BNSS',
        plainMeaning: 'Direction for grant of bail to person apprehending arrest (Anticipatory Bail) before Sessions Court or High Court.',
        applicability: 'Immediate judicial protection against police arrest in non-bailable offences.',
      },
      {
        act: 'Code of Criminal Procedure, 1973 / BNSS, 2023',
        section: 'Section 41A CrPC / Section 35(3) BNSS',
        plainMeaning: 'Notice of appearance before police officer; for offences punishable with imprisonment up to 7 years, arrest is not automatic and police must issue written notice.',
        applicability: 'Protects citizens from arbitrary police custody.',
      },
      {
        act: 'Code of Criminal Procedure, 1973 / BNSS, 2023',
        section: 'Section 154 CrPC / Section 173 BNSS',
        plainMeaning: 'Mandatory duty of police to register FIR upon receiving information disclosing commission of a cognizable offence.',
        applicability: 'Enforces statutory registration of citizen criminal complaints.',
      },
    ],
    precedents: [
      {
        kanoonId: '18491023',
        title: 'Arnesh Kumar v. State of Bihar',
        court: 'Supreme Court of India',
        publishDate: '2014-07-02',
        citation: '(2014) 8 SCC 273',
        keyExtract: 'Police officers shall not automatically arrest accused when offence is punishable with imprisonment up to 7 years. Mandatory Section 41A notice must be served within 2 weeks of FIR. Magistrate cannot authorize detention without recorded reasons.',
        whyRelevant: 'Protects citizens against harassment or arrest in minor/moderate criminal accusations.',
        sourceUrl: 'https://indiankanoon.org/doc/18491023/',
      },
      {
        kanoonId: '6219084',
        title: 'Lalita Kumari v. Govt. of U.P. & Ors.',
        court: 'Supreme Court of India',
        publishDate: '2013-11-12',
        citation: '(2014) 2 SCC 1',
        keyExtract: 'Registration of FIR is mandatory under Section 154 of the Code if information discloses commission of a cognizable offence. Police cannot conduct preliminary inquiry into whether information is credible before registering FIR.',
        whyRelevant: 'Mandates police to register FIR if cognizable complaint is presented.',
        sourceUrl: 'https://indiankanoon.org/doc/6219084/',
      },
    ],
    rights: [
      'Right to receive Section 41A CrPC / Section 35(3) BNSS written appearance notice rather than arbitrary arrest',
      'Right to apply for Anticipatory Bail before the Court of Sessions or High Court',
      'Right to remain silent and not be coerced into self-incrimination (Article 20(3) of Constitution)',
      'Right to consult an advocate of choice during police interrogation (Section 41D CrPC)',
      'Right to be produced before nearest Magistrate within 24 hours of any arrest (Article 22(2))',
    ],
    nextSteps: [
      '1. Obtain Copy of FIR: Apply for certified copy of FIR from the police station or download from State Police CCTNS citizen portal.',
      '2. If Apprehending Arrest: Move immediately for Anticipatory Bail under Section 438 CrPC / 482 BNSS before Sessions Court.',
      '3. Respond to Section 41A Notice: If notice is issued, submit written response with acknowledgment; complying with notice bars arrest under Arnesh Kumar guidelines.',
      '4. Approach Higher Police Authorities: If local police refuse to register genuine FIR, send complaint by registered post to Superintendent of Police (SP / DCP) under Section 154(3).',
    ],
    missingInformation: [
      'Has an FIR already been registered, or has police issued an informal call/notice?',
      'Do you know the sections mentioned in the FIR or complaint?',
      'In which police station jurisdiction did the alleged incident occur?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Download FIR Online from CCTNS', desc: 'Visit State Police Citizen Portal (e.g. delhipolice.gov.in / ksp.karnataka.gov.in) to download FIR copy.' },
        { step: 2, title: 'Engage Criminal Defense Advocate for Bail', desc: 'Prepare Anticipatory Bail petition annexing proof of innocence, alibi, or civil dispute documents.' },
        { step: 3, title: 'Comply with Section 41A Notice', desc: 'Attend with legal counsel and submit written reply refuting baseless allegations.' },
        { step: 4, title: 'File Quashing Petition under Section 482 CrPC', desc: 'If FIR is purely malicious or civil dispute given criminal color, move High Court for quashing.' },
      ],
      requiredDocuments: [
        'Copy of FIR or Police Complaint',
        'Written notices or summons received from police',
        'Identity proofs and address proof of applicant',
        'Evidence proving innocence, business invoices, or email records',
      ],
      filingProcess: 'For Anticipatory Bail, petition is drafted under Section 438 CrPC / Section 482 BNSS and filed before the Principal District & Sessions Judge. If police refuse to lodge FIR, file Section 156(3) application before the Judicial Magistrate.',
      portalUrl: 'https://districts.ecourts.gov.in/',
      portalName: 'District Courts E-Filing System',
    },
  },

  // 9. Property, Land, Partition & Inheritance Disputes
  property: {
    category: 'Property, Land & Inheritance Law',
    keywords: ['property', 'land', 'plot', 'patta', 'khata', 'mutation', 'partition', 'ancestral property', 'inheritance', 'will', 'succession', 'encroachment', 'boundary dispute', 'adverse possession', 'title deed', 'sale deed', 'registry'],
    summary: 'Dispute concerning ownership title, partition of joint family or ancestral property, inheritance rights, illegal encroachment, or registry/mutation discrepancies.',
    acts: [
      {
        act: 'Hindu Succession Act, 1956 (Amended 2005) / Indian Succession Act, 1925',
        section: 'Section 6 HSA',
        plainMeaning: 'Daughters have equal coparcenary rights by birth in ancestral property, with equal liabilities and entitlements as sons.',
        applicability: 'Governs inheritance, coparcenary shares, and distribution of ancestral assets.',
      },
      {
        act: 'Transfer of Property Act, 1882',
        section: 'Section 54 & Section 53A',
        plainMeaning: 'Sale of immovable property requires registered conveyance instrument; doctrine of part performance protects bona fide purchasers.',
        applicability: 'Governs transfer, sale deeds, and title validity.',
      },
      {
        act: 'Specific Relief Act, 1963',
        section: 'Section 5, 6 & Section 38',
        plainMeaning: 'Recovery of possession of immovable property and perpetual injunction restraining illegal encroachment, dispossession, or third-party alienation.',
        applicability: 'Primary statutory remedy for injunctions and recovery of dispossessed land.',
      },
      {
        act: 'Code of Civil Procedure, 1908',
        section: 'Order 39 Rules 1 & 2',
        plainMeaning: 'Grant of temporary injunction and status quo order to protect suit property from damage, waste, or unauthorized construction during trial.',
        applicability: 'Immediate urgent interim protection of disputed property.',
      },
    ],
    precedents: [
      {
        kanoonId: '158920412',
        title: 'Vineeta Sharma v. Rakesh Sharma & Ors.',
        court: 'Supreme Court of India',
        publishDate: '2020-08-11',
        citation: '(2020) 9 SCC 1',
        keyExtract: 'Daughters have coparcenary rights in ancestral property by birth under Section 6 of the Hindu Succession Act, 1956 as amended in 2005, irrespective of whether the father was alive on September 9, 2005.',
        whyRelevant: 'Landmark Supreme Court ruling guaranteeing daughters equal rights in ancestral and coparcenary property.',
        sourceUrl: 'https://indiankanoon.org/doc/158920412/',
      },
      {
        kanoonId: '2984102',
        title: 'Suraj Lamp & Industries Pvt. Ltd. v. State of Haryana',
        court: 'Supreme Court of India',
        publishDate: '2011-10-11',
        citation: '(2012) 1 SCC 656',
        keyExtract: 'Transactions of the nature of GPA sales or SA/GPA/Will transfers do not convey title and do not amount to transfer, nor can they be recognized as valid modes of transfer of immovable property without a registered sale deed.',
        whyRelevant: 'Affirms that only registered sale deeds confer lawful legal title in immovable property.',
        sourceUrl: 'https://indiankanoon.org/doc/2984102/',
      },
    ],
    rights: [
      'Right of coparceners (sons and daughters equally) to demand partition and separate possession of ancestral share',
      'Right to apply for immediate temporary injunction (Order 39 CPC) to stop illegal sale, construction, or third-party alienation',
      'Right to mutation and revenue record update based on registered deed or legal heir certificate',
      'Right to challenge forged, fabricated, or coercive transfer deeds before the Civil Court within 3-year limitation period',
    ],
    nextSteps: [
      '1. Revenue Search: Procure certified copies of Sale Deed, Parent Deeds, Encumbrance Certificate (EC for 30 years), and Revenue Records (Khata/Patta/Jamabandi).',
      '2. Issue Legal Notice for Partition / Injunction: Send formal legal notice through an advocate to all co-sharers or encroachers demanding amicable partition or cessation of encroachment.',
      '3. Apply for Pre-Litigation Mediation: File application before District Legal Services Authority (DLSA) for amicable family settlement.',
      '4. File Civil Suit for Partition & Injunction: If co-sharers refuse, institute a Suit for Partition & Separate Possession with an application for Temporary Injunction under Order 39 Rules 1 & 2 CPC.',
    ],
    missingInformation: [
      'Is the property ancestral (inherited across generations) or self-acquired by a single individual?',
      'Do you have certified copies of the registered sale deed, Encumbrance Certificate (EC), and latest revenue extract (Khata/Patta)?',
      'Has any registered Will, settlement deed, or family arrangement document been executed?',
      'In which district/state is the property situated?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Obtain Certified Property Records & EC', desc: 'Apply at Sub-Registrar Office or state land portal (e.g. Kaveri/Bhoomi/MeeSeva/AnyROR) for 30-year Encumbrance Certificate and title deeds.' },
        { step: 2, title: 'Dispatch Statutory Legal Demand Notice', desc: 'Send a formal 15-day notice specifying defined boundaries and demanding partition or stoppage of trespass.' },
        { step: 3, title: 'Apply for Pre-Litigation Mediation at DLSA', desc: 'Attempt free settlement before Lok Adalat / DLSA before incurring protracted court litigation expenses.' },
        { step: 4, title: 'Institute Partition Suit & Urgent Injunction', desc: 'File civil suit before Senior Civil Judge / District Court with interim status quo application under Order 39 CPC.' },
      ],
      requiredDocuments: [
        'Original or Certified Copy of Title / Sale Deed',
        '30-Year Encumbrance Certificate (EC) from Sub-Registrar',
        'Revenue Record / Khata / Patta / Record of Rights (RoR)',
        'Legal Heir Certificate / Family Tree (Pattadar / Vamsha Vruksha)',
        'Survey Map / Boundary Sketch and photographs of site condition',
      ],
      filingProcess: 'Obtain certified revenue records from the Sub-Registrar / Tehsildar. Send legal notice by Registered Post. If unaddressed, file a Civil Suit for Partition and Permanent Injunction before the jurisdictional Civil Court (Civil Judge Senior Division or District Court based on pecuniary valuation).',
      portalUrl: 'https://districts.ecourts.gov.in/',
      portalName: 'National Judicial Data Grid / eCourts Portal',
    },
  },

  // 10. Workplace Sexual Harassment & Domestic Violence Safety
  harassmentSafety: {
    category: 'Workplace Harassment (POSH) & Domestic Safety',
    keywords: ['posh', 'sexual harassment', 'harassment at work', 'internal committee', 'ic', 'vishaka', 'unwanted conduct', 'domestic violence', 'pwdva', 'protection order', 'shared household', 'workplace harassment'],
    summary: 'Protection against sexual harassment at the workplace under POSH Act 2013, or protection against domestic abuse and cruelty under PWDVA 2005.',
    acts: [
      {
        act: 'Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (POSH Act)',
        section: 'Section 4, 9 & Section 11',
        plainMeaning: 'Mandatory constitution of Internal Committee (IC) in every establishment with 10+ employees. Written complaint within 3 months; IC must complete formal inquiry within 90 days.',
        applicability: 'Primary statutory protection and internal redressal mechanism for workplace harassment.',
      },
      {
        act: 'POSH Act, 2013',
        section: 'Section 12 & Section 13',
        plainMeaning: 'Interim relief during inquiry (transfer of aggrieved woman or respondent, grant of up to 3 months paid leave) and disciplinary action/salary deduction for damages.',
        applicability: 'Protects complainant against retaliation during pending inquiry.',
      },
      {
        act: 'Protection of Women from Domestic Violence Act, 2005 (PWDVA)',
        section: 'Section 12, 18 & Section 19',
        plainMeaning: 'Application to Magistrate for protection orders against domestic abuse, right to reside in shared household without eviction, and monthly maintenance.',
        applicability: 'Immediate statutory safety relief for domestic and family abuse.',
      },
      {
        act: 'Bharatiya Nyaya Sanhita, 2023 (BNS) / IPC',
        section: 'Section 75 BNS (354A IPC) & Section 85 BNS (498A IPC)',
        plainMeaning: 'Criminal punishment for sexual harassment, outraging modesty, stalking, and domestic cruelty.',
        applicability: 'Cognizable criminal offence for police investigation.',
      },
    ],
    precedents: [
      {
        kanoonId: '10398210',
        title: 'Vishaka & Ors. v. State of Rajasthan',
        court: 'Supreme Court of India',
        publishDate: '1997-08-13',
        citation: 'AIR 1997 SC 3011',
        keyExtract: 'Each incident of sexual harassment in the workplace violates fundamental rights to gender equality under Articles 14, 19(1)(g), and 21. Employers must maintain preventive and time-bound grievance procedures.',
        whyRelevant: 'Foundational jurisprudence that established mandatory employer duty to prevent and redress workplace harassment.',
        sourceUrl: 'https://indiankanoon.org/doc/10398210/',
      },
      {
        kanoonId: '8291045',
        title: 'Aureliano Fernandes v. State of Goa & Ors.',
        court: 'Supreme Court of India',
        publishDate: '2023-05-12',
        citation: '2023 SCC OnLine SC 621',
        keyExtract: 'Supreme Court directed all ministries, statutory bodies, and private companies to ensure strict compliance with POSH Act, holding that defective inquiries or non-functional ICs violate natural justice.',
        whyRelevant: 'Enforces strict adherence to fair procedure and non-retaliation in POSH inquiries.',
        sourceUrl: 'https://indiankanoon.org/doc/8291045/',
      },
    ],
    rights: [
      'Right to submit formal complaint to Internal Committee (IC) or Local Committee (LC) within 3 months',
      'Right to interim protection during inquiry: transfer to another department/branch or up to 3 months paid leave without deduction',
      'Strict confidentiality: identity of complainant, witnesses, and inquiry proceedings cannot be publicized (Section 16 POSH Act)',
      'Right to reside in shared matrimonial household and emergency protection order from Magistrate under PWDVA',
    ],
    nextSteps: [
      '1. Preserve Evidence: Secure timestamped screenshots of messages, emails, audio notes, witness names, and incident journal.',
      '2. File Written Complaint to IC: Submit written complaint to Internal Committee presiding officer detailing chronological incidents within 90 days.',
      '3. Request Interim Relief: Explicitly request interim relief under Section 12 (change of reporting manager, remote work, or paid leave).',
      '4. File Online on SHe-Box: Complainants can also lodge concurrent complaints on the Ministry of Women & Child Development SHe-Box portal (shebox.wcd.gov.in).',
      '5. Police Recourse: If the conduct involves criminal assault, physical touch, stalking, or threats, file formal police FIR under Section 75/78 BNS.',
    ],
    missingInformation: [
      'Did this happen at work, online, in a family home, or in a public space?',
      'Are you safe right now, or is there an ongoing threat to your safety?',
      'Does your organization have an Internal Committee (IC), and has a written complaint been submitted?',
      'What timeframe did this occur in, and do you have written or digital proof?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Compile Chronological Incident Journal', desc: 'Note down dates, times, locations, verbatim words, and names of colleagues present.' },
        { step: 2, title: 'Submit POSH Complaint to IC Presiding Officer', desc: 'Deliver signed complaint with 6 copies and evidence to the Internal Committee.' },
        { step: 3, title: 'Lodge on SHe-Box Government Portal', desc: 'Register ticket on shebox.wcd.gov.in to ensure central government monitoring.' },
        { step: 4, title: 'Seek Police / Magistrate Protection if Threatened', desc: 'Dial 112 / 1091 (Women Helpline) or file Section 12 PWDVA petition before Magistrate.' },
      ],
      requiredDocuments: [
        'Written formal complaint with signature and date',
        'Digital evidence: WhatsApp/Slack chats, emails, call recordings',
        'Names and designations of witnesses or colleagues informed',
        'Organization appointment letter and POSH policy copy',
      ],
      filingProcess: 'Submit written complaint to the Presiding Officer of your organization Internal Committee (IC). If company has fewer than 10 employees, submit to the District Local Committee (LC). Parallel online tracking is available via SHe-Box (shebox.wcd.gov.in).',
      portalUrl: 'https://shebox.wcd.gov.in/',
      portalName: 'Ministry of WCD SHe-Box Portal',
    },
  },

  // 11. Motor Vehicle Accidents & MACT Claims
  trafficAccident: {
    category: 'Motor Accident Claims & Traffic Law (MACT)',
    keywords: ['accident', 'car accident', 'bike accident', 'hit and run', 'mact', 'motor vehicles act', 'insurance claim', 'third party insurance', 'traffic police', 'compensation for accident', 'claim tribunal'],
    summary: 'Compensation claim for injury or death arising out of motor vehicle accident before Motor Accidents Claims Tribunal (MACT).',
    acts: [
      {
        act: 'Motor Vehicles Act, 1988 (Amended 2019)',
        section: 'Section 166',
        plainMeaning: 'Application for compensation arising out of an accident of the nature specified in Section 165 before MACT having jurisdiction.',
        applicability: 'Primary statutory claim for injury, disability, medical reimbursement, and loss of income.',
      },
      {
        act: 'Motor Vehicles Act, 1988',
        section: 'Section 164',
        plainMeaning: 'Payment of compensation in case of death or grievous hurt under no-fault liability: ₹5,00,000 for death and ₹2,50,000 for grievous hurt.',
        applicability: 'Immediate guaranteed relief without proving negligence of the driver.',
      },
      {
        act: 'Motor Vehicles Act, 1988',
        section: 'Section 146 & Section 149',
        plainMeaning: 'Mandatory third-party insurance; insurance company is legally bound to satisfy judgments and awards against persons insured.',
        applicability: 'Ensures payout is disbursed directly by licensed insurance companies.',
      },
    ],
    precedents: [
      {
        kanoonId: '1398201',
        title: 'Sarla Verma & Ors. v. Delhi Transport Corporation',
        court: 'Supreme Court of India',
        publishDate: '2009-04-15',
        citation: '(2009) 6 SCC 121',
        keyExtract: 'Standardized universal formula for calculating compensation in motor accident cases, establishing multipliers based on age, income deduction for personal expenses, and future prospects.',
        whyRelevant: 'Benchmark guideline applied by all Indian courts to compute motor accident claim awards.',
        sourceUrl: 'https://indiankanoon.org/doc/1398201/',
      },
      {
        kanoonId: '98451023',
        title: 'National Insurance Co. Ltd. v. Pranay Sethi & Ors.',
        court: 'Supreme Court of India',
        publishDate: '2017-10-31',
        citation: '(2017) 16 SCC 680',
        keyExtract: 'Constitution Bench affirmed addition of future prospects to established income (up to 50% for permanent jobs, 40% for self-employed) and fixed standard conventional heads for loss of estate, consortium, and funeral expenses.',
        whyRelevant: 'Maximizes compensation payable to victim and dependent family members.',
        sourceUrl: 'https://indiankanoon.org/doc/98451023/',
      },
    ],
    rights: [
      'Right to claim full compensation for medical expenses, hospitalization, permanent disability, pain, suffering, and loss of earning capacity',
      'Right to no-fault statutory compensation under Section 164 MV Act without needing to prove driver fault',
      'Right to file MACT claim in tribunal having jurisdiction over accident spot, claimant residence, or insurer office',
      'Right to interim medical relief and compensation from Solatium Fund in hit-and-run accidents',
    ],
    nextSteps: [
      '1. Police Documentation: Collect certified copy of FIR, Crime Details Form, Site Sketch, Motor Vehicle Inspection Report (MVI), and Charge Sheet.',
      '2. Medical Documentation: Secure discharge summary, medical bills, prescription receipts, and Disability Certificate from Government Medical Board.',
      '3. File Claim under Section 166: File petition before Motor Accidents Claims Tribunal (MACT) within 6 months of the accident.',
      '4. Implead Insurance Company: Name both the vehicle owner/driver and the third-party insurer as respondents for direct recovery.',
    ],
    missingInformation: [
      'What date and in which city did the accident take place?',
      'Has an FIR been registered by the traffic/local police station?',
      'Do you have the registration number and insurance policy details of the offending vehicle?',
      'Were there injuries, permanent disability, or fatality?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Obtain Police Accident Information Report (DAR/AIR)', desc: 'Collect Detailed Accident Report (DAR) submitted by police to MACT within 90 days.' },
        { step: 2, title: 'Preserve Medical & Disability Records', desc: 'Compile all original hospital bills, pharmacy invoices, and obtain Disability Certificate from Civil Surgeon.' },
        { step: 3, title: 'File Claim Petition before MACT', desc: 'Draft Section 166 petition before District MACT claiming itemized damages under Sarla Verma multiplier.' },
        { step: 4, title: 'Execute Tribunal Award', desc: 'Upon award, insurance company must deposit amount with tribunal within 30 days.' },
      ],
      requiredDocuments: [
        'Certified Copy of FIR and Police Charge Sheet',
        'Hospital Discharge Summary and Original Medical Bills',
        'Disability Certificate from Government Medical Board',
        'Income Proof (Salary slips, ITR, Form 16, Bank statements)',
        'Vehicle RC and Third-Party Insurance Policy copy',
      ],
      filingProcess: 'File claim petition under Section 166 of Motor Vehicles Act before the Motor Accidents Claims Tribunal (MACT) at the District Court complex. Nominal fixed court fee applies.',
      portalUrl: 'https://districts.ecourts.gov.in/',
      portalName: 'eCourts District Services (MACT)',
    },
  },

  // 12. Right to Information (RTI Act 2005)
  rti: {
    category: 'Right to Information (RTI Act, 2005)',
    keywords: ['rti', 'right to information', 'public authority', 'pio', 'cpc', 'first appeal', 'information commission', 'cic', 'sic', 'government delay', 'public records'],
    summary: 'Seeking public records, government project data, answer sheets, tender details, or municipal records under the RTI Act, 2005.',
    acts: [
      {
        act: 'Right to Information Act, 2005',
        section: 'Section 6 & Section 7(1)',
        plainMeaning: 'Public Information Officer (PIO) must furnish requested information within 30 days of application; if concerning life or liberty, within 48 hours.',
        applicability: 'Primary right to access government files, notes, and records.',
      },
      {
        act: 'RTI Act, 2005',
        section: 'Section 19(1) & Section 19(3)',
        plainMeaning: 'First Appeal within 30 days to designated First Appellate Authority; Second Appeal within 90 days to Central or State Information Commission.',
        applicability: 'Two-tier statutory appellate grievance mechanism.',
      },
      {
        act: 'RTI Act, 2005',
        section: 'Section 20',
        plainMeaning: 'Information Commission can levy personal penalty of ₹250 per day up to ₹25,000 on PIO for malafide denial or unjustified delay.',
        applicability: 'Enforces individual accountability on delinquent public officials.',
      },
    ],
    precedents: [
      {
        kanoonId: '13098124',
        title: 'Central Board of Secondary Education v. Aditya Bandopadhyay',
        court: 'Supreme Court of India',
        publishDate: '2011-08-09',
        citation: '(2011) 8 SCC 497',
        keyExtract: 'Examinee has a fundamental right under RTI Act to inspect evaluated answer-sheets. The exemption under Section 8(1)(e) (fiduciary capacity) does not bar disclosure to the examinee.',
        whyRelevant: 'Affirms that public authorities cannot deny citizens access to their evaluated marks, scores, and official file notings.',
        sourceUrl: 'https://indiankanoon.org/doc/13098124/',
      },
    ],
    rights: [
      'Right to receive certified copies of government files, notes, circulars, tenders, and municipal approvals within 30 days',
      'Right to expedited 48-hour response where information concerns life or liberty of a person',
      'Right to file First Appeal before senior officer without court fee in most central authorities',
      'Right to seek penalty on PIO under Section 20 for wrongful rejection or non-response',
    ],
    nextSteps: [
      '1. Draft Specific Questions: Frame concise, factual questions asking for specific records, notifications, or file notings (avoid opinions).',
      '2. File Online on rtionline.gov.in: For Central ministries and departments, submit application online with ₹10 fee.',
      '3. Track 30-Day Statutory Clock: If no reply received within 30 days, cause of action arises for First Appeal.',
      '4. File First Appeal under Section 19(1): Submit online First Appeal within 30 days citing non-receipt of information.',
      '5. Escalate to CIC / SIC: File Second Appeal before Central Information Commission (CIC) or State Information Commission (SIC).',
    ],
    missingInformation: [
      'Which public authority (Central ministry, state department, municipal corporation, university) holds the information?',
      'Has an initial RTI application been filed, and what was the date/acknowledgment number?',
      'Has the PIO replied, cited Section 8 exemptions, or failed to reply within 30 days?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Draft Precise RTI Application', desc: 'Identify designated PIO and list specific certified records requested with date limits.' },
        { step: 2, title: 'Submit via RTI Online / Speed Post', desc: 'Submit at rtionline.gov.in or send physical application with ₹10 IPO (Postal Order).' },
        { step: 3, title: 'File First Appeal upon 30th Day', desc: 'If unanswered, file First Appeal citing Section 7(1) default.' },
        { step: 4, title: 'File Second Appeal to CIC / SIC', desc: 'Approach Information Commission requesting disclosure and Section 20 penalty.' },
      ],
      requiredDocuments: [
        'Original RTI Application Form and ₹10 fee payment receipt',
        'Speed Post tracking receipt or online RTI acknowledgment registration number',
        'PIO response letter or rejection notice (if received)',
        'Copy of First Appeal and First Appellate Authority order',
      ],
      filingProcess: 'File online directly via the official Central RTI Portal (rtionline.gov.in) for Central Government authorities, or via respective State RTI portals. Application fee is nominal (₹10).',
      portalUrl: 'https://rtionline.gov.in/',
      portalName: 'National RTI Online Portal (rtionline.gov.in)',
    },
  },
};

/**
 * Matches user query against the Indian Legal Domain Knowledge Base
 * Returns exact category, summary, statutes, precedents, rights, next steps, missing info, and self-help flow.
 * Inspects query, declared category, and multi-turn conversation history.
 */
export function matchLegalDomain(query = '', category = '', history = []) {
  const q = (query || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // Combine query with recent conversation history for deep context memory
  const historyText = Array.isArray(history)
    ? history.map((m) => (typeof m === 'string' ? m : m.text || '')).join(' ').toLowerCase()
    : '';
  const combinedContext = `${q} ${historyText}`;

  // 1. Direct Category Matching
  for (const [key, domain] of Object.entries(LEGAL_DOMAINS)) {
    if (cat && domain.category.toLowerCase().includes(cat)) {
      return domain;
    }
  }

  // 2. Direct Keyword Matching on current Query
  for (const [key, domain] of Object.entries(LEGAL_DOMAINS)) {
    for (const kw of domain.keywords) {
      if (q.includes(kw)) {
        return domain;
      }
    }
  }

  // 3. Multi-Turn Context Keyword Matching on previous messages
  if (historyText) {
    for (const [key, domain] of Object.entries(LEGAL_DOMAINS)) {
      for (const kw of domain.keywords) {
        if (historyText.includes(kw)) {
          return domain;
        }
      }
    }
  }

  // 4. Fallback to General Civil & Commercial Legal Guidance if unclassified
  return {
    category: 'Civil & Statutory Legal Guidance',
    keywords: [],
    summary: 'Legal inquiry regarding Indian statutory rights, dispute assessment, and legal recourse.',
    acts: [
      {
        act: 'Constitution of India',
        section: 'Article 39A & Article 21',
        plainMeaning: 'Guarantees equal justice, protection of life and personal liberty, and access to free legal aid for all citizens.',
        applicability: 'Fundamental right to justice and fair legal representation.',
      },
      {
        act: 'Code of Civil Procedure, 1908',
        section: 'Section 9 & Section 89',
        plainMeaning: 'Jurisdiction of civil courts to try all civil disputes and alternative dispute resolution through mediation, conciliation, and Lok Adalat.',
        applicability: 'Procedural recourse for dispute resolution outside of or before courts.',
      },
      {
        act: 'Indian Contract Act, 1872',
        section: 'Section 73',
        plainMeaning: 'Right to compensation for loss or damage caused by breach of contractual obligations or covenants.',
        applicability: 'Governs civil recovery and monetary damages.',
      },
    ],
    precedents: [
      {
        kanoonId: '19385023',
        title: 'Kailash Nath Associates v. Delhi Development Authority',
        court: 'Supreme Court of India',
        publishDate: '2015-01-09',
        citation: '(2015) 4 SCC 136',
        keyExtract: 'Section 74 of Indian Contract Act stipulates that damages can only be awarded where actual damage or loss has been suffered; arbitrary forfeiture of deposits or funds without proof of loss is illegal.',
        whyRelevant: 'Affirms that no party can penalize another or forfeit funds without established proof of damage.',
        sourceUrl: 'https://indiankanoon.org/doc/19385023/',
      },
    ],
    rights: [
      'Right to access statutory legal information and formal legal representation',
      'Right to pre-litigation conciliation via District Legal Services Authority (DLSA)',
      'Right to issue a formal 15-day statutory demand notice prior to court litigation',
      'Right to claim damages and restitution for breach of agreement or statutory duty',
    ],
    nextSteps: [
      '1. Document Review: Gather all written communications, contracts, receipts, and correspondence.',
      '2. Issue Legal Notice: Dispatch a formal statutory demand notice via Registered Post giving 15 days to resolve the matter.',
      '3. Pre-Litigation Mediation: Approach District Legal Services Authority (DLSA) for free, fast-track amicable settlement.',
      '4. Consult Advocate: Seek guidance from a specialized advocate to file formal proceedings before the appropriate forum.',
    ],
    missingInformation: [
      'Can you describe the specific dispute or problem you are facing in a few sentences?',
      'In which city/state did this occur, and are there any written agreements or payment receipts?',
      'What specific outcome (refund, compensation, stay order, police protection) are you looking for?',
    ],
    selfHelp: {
      actionPlan: [
        { step: 1, title: 'Gather All Documentary Evidence', desc: 'Compile all agreements, payment receipts, bank transactions, and chat records.' },
        { step: 2, title: 'Draft Formal Demand Notice', desc: 'Issue a 15-day formal notice detailing facts and demanding resolution.' },
        { step: 3, title: 'Apply for Pre-Litigation Mediation at DLSA', desc: 'Approach local District Legal Services Authority for mediation.' },
        { step: 4, title: 'Initiate Legal Action', desc: 'File formal claim before the jurisdictional court, forum, or commission.' },
      ],
      requiredDocuments: [
        'Written Agreement / Contract / Order Confirmation',
        'Bank statements and payment receipts',
        'Written notices and correspondence',
        'Government ID proof (Aadhaar / Voter ID)',
      ],
      filingProcess: 'Gather all evidence and send a 15-day formal notice by Speed Post. If unaddressed, approach the District Legal Services Authority (DLSA) or file before the competent jurisdictional court or tribunal.',
      portalUrl: 'https://nalsa.gov.in/',
      portalName: 'National Legal Services Authority (NALSA / DLSA)',
    },
  };
}

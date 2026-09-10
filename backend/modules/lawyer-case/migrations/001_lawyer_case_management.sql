-- =========================================================================
-- EarnLaw: Legal Knowledge, Lawyer System, and Case Management Schema
-- Created by Member 4 (Legal Knowledge & Case Management Lead)
-- For execution on AnuDB (PostgreSQL) by Member 2
-- =========================================================================

-- 1. Legal Categories Master
CREATE TABLE IF NOT EXISTS legal_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    common_statutes JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Statutory Laws & Sections Master
CREATE TABLE IF NOT EXISTS laws (
    id VARCHAR(64) PRIMARY KEY,
    act_name VARCHAR(255) NOT NULL,
    section_number VARCHAR(50) NOT NULL,
    section_title VARCHAR(255) NOT NULL,
    description TEXT,
    plain_meaning TEXT,
    penalty_or_remedy TEXT,
    jurisdiction VARCHAR(100) DEFAULT 'India (Central)',
    forum VARCHAR(255),
    source_url TEXT,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Precedents & Legal Cases Metadata (Shared with Member 3 AI/RAG)
CREATE TABLE IF NOT EXISTS legal_cases (
    id VARCHAR(64) PRIMARY KEY,
    case_name VARCHAR(255) NOT NULL,
    case_number VARCHAR(100),
    court VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    case_type VARCHAR(100),
    judgment_date DATE,
    citation VARCHAR(255),
    judges JSONB DEFAULT '[]'::jsonb,
    parties JSONB DEFAULT '{}'::jsonb,
    source VARCHAR(100) DEFAULT 'Indian Kanoon',
    source_url TEXT,
    summary TEXT,
    key_principle TEXT,
    ratio_decidendi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Judgments Detailed Content
CREATE TABLE IF NOT EXISTS judgments (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    full_text TEXT,
    facts TEXT,
    issues JSONB DEFAULT '[]'::jsonb,
    arguments TEXT,
    court_reasoning TEXT,
    legal_principles TEXT,
    conclusion TEXT,
    decision VARCHAR(100),
    source_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Case-Law Mappings (Links Judgments with Statutory Sections)
CREATE TABLE IF NOT EXISTS case_laws (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    law_id VARCHAR(64) REFERENCES laws(id) ON DELETE CASCADE,
    section_number VARCHAR(50) NOT NULL,
    relevance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Case Relationships (Precedent Hierarchy Graph)
-- Relationship Types: 'cites', 'cited_by', 'follows', 'distinguishes', 'overrules', 'refers_to'
CREATE TABLE IF NOT EXISTS case_relationships (
    id SERIAL PRIMARY KEY,
    source_case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    target_case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Lawyers Master (With 5-Stage Verification State Machine)
-- Statuses: pending_verification -> documents_submitted -> admin_review -> verified -> active / suspended
CREATE TABLE IF NOT EXISTS lawyers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    bar_registration_number VARCHAR(100) NOT NULL UNIQUE,
    state_bar_council VARCHAR(100) NOT NULL,
    years_of_experience INT NOT NULL DEFAULT 0,
    primary_jurisdiction VARCHAR(100) NOT NULL,
    primary_court VARCHAR(255) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    languages JSONB DEFAULT '["English"]'::jsonb,
    specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
    consultation_fee INT NOT NULL DEFAULT 500,
    consultation_modes JSONB DEFAULT '["video", "phone", "in_person"]'::jsonb,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    is_available BOOLEAN DEFAULT TRUE,
    profile_bio TEXT,
    rating_avg NUMERIC(3, 2) DEFAULT 5.0,
    total_consultations INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Lawyer Verification Document Submissions
CREATE TABLE IF NOT EXISTS lawyer_verification_docs (
    id SERIAL PRIMARY KEY,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_status VARCHAR(30) DEFAULT 'pending',
    admin_remarks TEXT,
    reviewed_by VARCHAR(64),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Cases Master (Self-Help and Lawyer Consulted Cases)
-- Statuses: created, under_review, consultation_pending, consultation_completed, action_required, in_progress, awaiting_response, hearing, resolved, closed
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    category_id VARCHAR(64) REFERENCES legal_categories(id),
    case_mode VARCHAR(30) NOT NULL DEFAULT 'pending_selection',
    current_status VARCHAR(50) NOT NULL DEFAULT 'created',
    jurisdiction VARCHAR(100),
    forum VARCHAR(255),
    summary TEXT,
    ai_guidance_ref VARCHAR(64),
    assigned_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Consultations
-- Statuses: requested, accepted, rejected, scheduled, completed, cancelled
CREATE TABLE IF NOT EXISTS consultations (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    consultation_mode VARCHAR(30) NOT NULL,
    fee_amount INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'requested',
    meeting_link TEXT,
    user_notes TEXT,
    lawyer_advice_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Case Action Plans
-- Statuses: pending, in_progress, completed, cancelled
CREATE TABLE IF NOT EXISTS case_actions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    assigned_by_type VARCHAR(30) NOT NULL,
    assigned_by_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    why_it_matters TEXT,
    required_document_type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    status VARCHAR(30) DEFAULT 'pending',
    sort_order INT DEFAULT 1,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Case Documents (Metadata Storage & Access Control)
CREATE TABLE IF NOT EXISTS case_documents (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(64) NOT NULL,
    is_verified_by_lawyer BOOLEAN DEFAULT FALSE,
    verified_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Case Timeline & Milestone Events
CREATE TABLE IF NOT EXISTS case_timeline_events (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(64),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Reminders & Deadlines (Powers Notification & Follow-Up Engine)
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    is_triggered BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Second Opinions (Peer Review between Independent Advocates)
CREATE TABLE IF NOT EXISTS second_opinions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    original_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    second_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    user_reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'requested',
    second_lawyer_review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Lawyer Complaints & Grievances (With Bar Council Escalation)
CREATE TABLE IF NOT EXISTS lawyer_complaints (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id) ON DELETE RESTRICT,
    case_id VARCHAR(64) REFERENCES cases(id),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    supporting_evidence JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'submitted',
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

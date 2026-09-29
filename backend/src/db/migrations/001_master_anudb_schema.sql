-- =========================================================================
-- EarnLaw / VidhiSetu: Master AnuDB (PostgreSQL) Schema Definition
-- Maintained by Member 2 (Backend & AnuDB Database Lead)
-- In Collaboration with Member 3 (AI/RAG) & Member 4 (Legal Knowledge & Lawyers)
-- =========================================================================

-- Optional pgvector extension for Member 3's semantic vector searches
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- 1. USERS & ACCESS CONTROL (Member 2 Core)
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user', -- 'user', 'lawyer', 'admin'
    email_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    reset_token VARCHAR(255),
    reset_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    user_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- User Login Audit & Session Logs
CREATE TABLE IF NOT EXISTS user_login_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'success', 'failed_bad_password', 'failed_unverified', 'failed_not_found'
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_email ON user_login_logs(email);

-- =========================================================================
-- 2. LEGAL KNOWLEDGE BASE & STATUTES (Member 4 & Member 3)
-- =========================================================================
CREATE TABLE IF NOT EXISTS legal_categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    common_statutes JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_laws_act_section ON laws(act_name, section_number);

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

CREATE INDEX IF NOT EXISTS idx_legal_cases_court ON legal_cases(court);
CREATE INDEX IF NOT EXISTS idx_legal_cases_date ON legal_cases(judgment_date);

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

CREATE TABLE IF NOT EXISTS legal_issues (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) REFERENCES legal_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plain_explanation TEXT,
    common_remedies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_laws (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    law_id VARCHAR(64) REFERENCES laws(id) ON DELETE CASCADE,
    section_number VARCHAR(50) NOT NULL,
    relevance TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_relationships (
    id SERIAL PRIMARY KEY,
    source_case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    target_case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL, -- 'cites', 'cited_by', 'follows', 'distinguishes', 'overrules'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 3. LAWYER SYSTEM (Member 4 Domain)
-- =========================================================================
CREATE TABLE IF NOT EXISTS lawyers (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_lawyers_city ON lawyers(location_city);
CREATE INDEX IF NOT EXISTS idx_lawyers_verification ON lawyers(verification_status);

CREATE TABLE IF NOT EXISTS lawyer_verification_docs (
    id SERIAL PRIMARY KEY,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_status VARCHAR(30) DEFAULT 'pending',
    admin_remarks TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- =========================================================================
-- 4. CITIZEN CASES (Member 2 & 4 Integration)
-- =========================================================================
CREATE TABLE IF NOT EXISTS cases (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category_id VARCHAR(64) REFERENCES legal_categories(id),
    case_mode VARCHAR(30) NOT NULL DEFAULT 'pending_selection', -- 'self_help', 'lawyer_consultation'
    current_status VARCHAR(50) NOT NULL DEFAULT 'created',
    jurisdiction VARCHAR(100),
    forum VARCHAR(255),
    summary TEXT,
    assigned_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(current_status);

-- =========================================================================
-- 5. AI/RAG RESEARCH & GUIDANCE (Member 3 & Member 2 Integration)
-- =========================================================================
CREATE TABLE IF NOT EXISTS legal_queries (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    jurisdiction VARCHAR(100),
    legal_category VARCHAR(100),
    extracted_facts JSONB DEFAULT '[]'::jsonb,
    identified_issues JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queries_case ON legal_queries(case_id);
CREATE INDEX IF NOT EXISTS idx_queries_user ON legal_queries(user_id);

CREATE TABLE IF NOT EXISTS case_matches (
    id SERIAL PRIMARY KEY,
    query_id VARCHAR(64) REFERENCES legal_queries(id) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES legal_cases(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 4) NOT NULL,
    relevance_reason TEXT,
    rank INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_guidance (
    id VARCHAR(64) PRIMARY KEY,
    query_id VARCHAR(64) UNIQUE REFERENCES legal_queries(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    legal_issues JSONB DEFAULT '[]'::jsonb,
    applicable_laws JSONB DEFAULT '[]'::jsonb,
    relevant_cases JSONB DEFAULT '[]'::jsonb,
    analysis TEXT,
    possible_options JSONB DEFAULT '[]'::jsonb,
    missing_information JSONB DEFAULT '[]'::jsonb,
    confidence VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    sources JSONB DEFAULT '[]'::jsonb,
    disclaimer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- 6. CONSULTATIONS & CASE WORKFLOW (Member 4)
-- =========================================================================
CREATE TABLE IF NOT EXISTS consultations (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    scheduled_date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    consultation_mode VARCHAR(30) NOT NULL, -- 'video', 'phone', 'in_person'
    fee_amount INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'requested', -- 'requested', 'accepted', 'rejected', 'scheduled', 'completed', 'cancelled'
    meeting_link TEXT,
    user_notes TEXT,
    lawyer_advice_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_actions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    assigned_by_type VARCHAR(30) NOT NULL, -- 'ai_guidance', 'lawyer'
    assigned_by_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    why_it_matters TEXT,
    required_document_type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    due_date DATE,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    sort_order INT DEFAULT 1,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_documents (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_verified_by_lawyer BOOLEAN DEFAULT FALSE,
    verified_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_timeline_events (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    actor_type VARCHAR(20) NOT NULL, -- 'citizen', 'lawyer', 'system', 'admin'
    actor_id VARCHAR(64),
    event_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL, -- 'limitation', 'hearing', 'document_submission'
    is_triggered BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS second_opinions (
    id VARCHAR(64) PRIMARY KEY,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    second_lawyer_id VARCHAR(64) REFERENCES lawyers(id),
    user_reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'requested', -- 'requested', 'in_review', 'completed', 'declined'
    second_lawyer_review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lawyer_complaints (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id VARCHAR(64) REFERENCES lawyers(id) ON DELETE RESTRICT,
    case_id VARCHAR(64) REFERENCES cases(id),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    supporting_evidence JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'submitted', -- 'submitted', 'under_review', 'escalated_bar_council', 'resolved'
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

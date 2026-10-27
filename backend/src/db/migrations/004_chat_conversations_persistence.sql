-- =========================================================================
-- EarnLaw / VidhiSetu: Chat Conversations & Multi-Turn Message Persistence
-- Phase 3: Permanent User Data Retention & Authorized Context Recovery
-- =========================================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General Legal Guidance',
    is_pinned BOOLEAN DEFAULT FALSE,
    conversation_summary TEXT,
    detected_emotion VARCHAR(50),
    preferred_language VARCHAR(20) DEFAULT 'auto',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON chat_conversations(updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL, -- 'user', 'ai', 'system'
    message_text TEXT NOT NULL,
    detected_emotion VARCHAR(50),
    detected_laws JSONB DEFAULT '[]'::jsonb,
    detected_precedents JSONB DEFAULT '[]'::jsonb,
    suggested_next_steps JSONB DEFAULT '[]'::jsonb,
    fact_gathering_questions JSONB DEFAULT '[]'::jsonb,
    agent_steps JSONB DEFAULT '[]'::jsonb,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at ASC);

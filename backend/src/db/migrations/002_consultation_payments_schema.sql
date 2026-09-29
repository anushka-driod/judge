-- =========================================================================
-- EarnLaw / VidhiSetu: Consultation Payments & Financial Ledger Schema
-- Phase 1: Real Payment Lifecycle, Escrow, Invoicing & Refunds
-- =========================================================================

CREATE TABLE IF NOT EXISTS consultation_payments (
    id VARCHAR(64) PRIMARY KEY,
    consultation_id VARCHAR(64) REFERENCES consultations(id) ON DELETE SET NULL,
    case_id VARCHAR(64) REFERENCES cases(id) ON DELETE SET NULL,
    citizen_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id VARCHAR(64) NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    gateway_name VARCHAR(30) NOT NULL DEFAULT 'razorpay',
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    gateway_payment_id VARCHAR(100) UNIQUE,
    gateway_signature VARCHAR(255),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    base_fee INT NOT NULL,               -- Lawyer consultation base fee (in INR)
    platform_fee INT NOT NULL,           -- Platform fee (10%)
    gst_amount INT NOT NULL,             -- GST (18% on fees)
    total_amount INT NOT NULL,           -- Final total charged (base_fee + gst_amount)
    lawyer_net_payout INT NOT NULL,      -- Net payable to advocate (base_fee - platform_fee)
    payment_status VARCHAR(50) NOT NULL, -- 'PENDING_PAYMENT', 'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED'
    failure_reason TEXT,
    refund_id VARCHAR(100),
    refund_amount INT,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    invoice_number VARCHAR(100) UNIQUE,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON consultation_payments(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON consultation_payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_citizen ON consultation_payments(citizen_id);
CREATE INDEX IF NOT EXISTS idx_payments_lawyer ON consultation_payments(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_payments_consultation ON consultation_payments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON consultation_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON consultation_payments(idempotency_key);

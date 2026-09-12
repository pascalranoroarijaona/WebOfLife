-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 048)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors & Entropy Audit Table
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    internal_energy NUMERIC(20, 8) NOT NULL,
    temperature NUMERIC(12, 4) NOT NULL,
    entropy_generation_rate NUMERIC(20, 10) NOT NULL CHECK (entropy_generation_rate >= 0.0),
    cycle_type VARCHAR(50) NOT NULL CHECK (cycle_type IN ('Carbon', 'Nitrogen', 'Phosphorus', 'Water')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Entropy Violation Audit Log (Second Law Enforcement)
CREATE TABLE IF NOT EXISTS thermodynamic_entropy_violations (
    violation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID REFERENCES thermodynamic_states(state_id) ON DELETE SET NULL,
    entity_id VARCHAR(255) NOT NULL,
    attempted_s_gen NUMERIC(20, 10) NOT NULL,
    error_message TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Monad Stock Transactions & Blockchain Ledger Integration
CREATE TABLE IF NOT EXISTS thermodynamic_monad_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_monad_blocks(block_id) ON DELETE CASCADE,
    state_id UUID REFERENCES thermodynamic_states(state_id),
    source_stock VARCHAR(100) NOT NULL,
    target_stock VARCHAR(100) NOT NULL,
    flux_magnitude NUMERIC(20, 8) NOT NULL,
    entropy_delta NUMERIC(20, 10) NOT NULL,
    transaction_status VARCHAR(30) NOT NULL CHECK (transaction_status IN ('COMMITTED', 'REJECTED_ENTROPY_VIOLATION')),
    signature VARCHAR(128) NOT NULL
);

-- Indexing for high-performance time-series queries
CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity ON thermodynamic_states(entity_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_entropy_violations_detected ON thermodynamic_entropy_violations(detected_at);
CREATE INDEX IF NOT EXISTS idx_monad_transactions_block ON thermodynamic_monad_transactions(block_id);
-- ============================================================================
-- Web of Life Database, UML & Thermodynamic Blockchain Architecture
-- Sprint 047 Schema Extension: Thermodynamic State Vector & Entropy Guard
-- ============================================================================

BEGIN;

-- 1. Core Thermodynamic State Vectors Table
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monad_id UUID NOT NULL,
    internal_energy NUMERIC(20, 8) NOT NULL,
    temperature NUMERIC(12, 4) NOT NULL,
    entropy NUMERIC(20, 8) NOT NULL,
    entropy_generation_rate NUMERIC(20, 8) NOT NULL CHECK (entropy_generation_rate >= 0.0),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid validation lookups and time-series queries
CREATE INDEX IF NOT EXISTS idx_thermodynamic_vectors_monad_time 
ON thermodynamic_state_vectors (monad_id, recorded_at DESC);

-- 2. Thermodynamic Entropy Violations Audit Ledger
CREATE TABLE IF NOT EXISTS thermodynamic_entropy_violations (
    violation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    monad_id UUID NOT NULL,
    violating_entropy_generation_rate NUMERIC(20, 8) NOT NULL,
    error_message TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Biogeochemical Stocks & Monad Transactions Ledger
CREATE TABLE IF NOT EXISTS monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monad_id UUID NOT NULL,
    carbon_stock NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    nitrogen_stock NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    phosphorus_stock NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    water_stock NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Thermodynamic Blockchain Block Signatures & State Transitions
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    entropy_state_hash VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
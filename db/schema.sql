-- ============================================================================
-- Web of Life Database Schema: Sprint 037
-- Thermodynamic State Vector & Non-Negative Entropy Assertion Ledger
-- ============================================================================

-- Enable TimescaleDB extension for time-series ledger data
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors (Time-Series Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0),
    internal_energy DOUBLE PRECISION NOT NULL,
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0),
    exergy DOUBLE PRECISION NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    violation_notes TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for optimized time-series queries
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_thermo_states_pod_time 
ON thermodynamic_state_vectors (earth_pod_id, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic Monad Stock Transactions & Flux Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id),
    pod_id UUID NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    carbon_flux DOUBLE PRECISION NOT NULL,
    nitrogen_flux DOUBLE PRECISION NOT NULL,
    phosphorus_flux DOUBLE PRECISION NOT NULL,
    water_flux DOUBLE PRECISION NOT NULL,
    validation_status VARCHAR(32) NOT NULL CHECK (validation_status IN ('PASSED', 'FAILED_ENTROPY', 'FAILED_TEMPERATURE', 'FAILED_EXERGY')),
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monad_tx_block_hash 
ON thermodynamic_monad_transactions (block_hash);

-- ----------------------------------------------------------------------------
-- 3. Second Law Compliance Audit Log
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS second_law_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id),
    violation_type VARCHAR(64) NOT NULL,
    error_message TEXT NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_detected 
ON second_law_audit_log (detected_at DESC);
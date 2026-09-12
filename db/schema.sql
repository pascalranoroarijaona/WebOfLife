-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 035 Update)
-- ============================================================================

-- Drop existing tables if re-initializing (respecting dependency order)
DROP TABLE IF EXISTS thermodynamic_audit_log CASCADE;
DROP TABLE IF EXISTS thermodynamic_states CASCADE;
DROP TABLE IF EXISTS earth_pods CASCADE;
DROP TABLE IF EXISTS blockchain_blocks CASCADE;

-- ============================================================================
-- 1. Blockchain Ledger & Immutable Blocks
-- ============================================================================
CREATE TABLE blockchain_blocks (
    block_id VARCHAR(64) PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nonce BIGINT NOT NULL,
    signature TEXT NOT NULL
);

-- ============================================================================
-- 2. EarthPod Entity Storage
-- ============================================================================
CREATE TABLE earth_pods (
    pod_id VARCHAR(64) PRIMARY KEY,
    pod_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE'
);

-- ============================================================================
-- 3. Thermodynamic State Vectors (Sprint 035 Second Law Compliance)
-- ============================================================================
CREATE TABLE thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    pod_id VARCHAR(64) NOT NULL REFERENCES earth_pods(pod_id) ON DELETE CASCADE,
    block_id VARCHAR(64) REFERENCES blockchain_blocks(block_id),
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0.0),
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0.0),
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0.0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermodynamic_states_pod ON thermodynamic_states(pod_id);
CREATE INDEX idx_thermodynamic_states_entropy ON thermodynamic_states(entropy);

-- ============================================================================
-- 4. Thermodynamic Audit & Violation Logs
-- ============================================================================
CREATE TABLE thermodynamic_audit_log (
    audit_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    violation_type VARCHAR(64),
    error_message TEXT NOT NULL,
    failed_value DOUBLE PRECISION NOT NULL,
    asserted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
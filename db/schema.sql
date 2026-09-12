-- ============================================================================
-- Web of Life Database Schema: Sprint 054 Extension
-- Thermodynamic State Vector Stock Conservation Asserter & Ledger Integration
-- ============================================================================

-- Enable TimescaleDB extension if not already present
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Thermodynamic State Vectors Table (Time-series hypertable)
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    earth_pod_id UUID NOT NULL,
    stocks JSONB NOT NULL, -- Key-value map of element stocks (C, N, P, H2O, Energy)
    total_entropy DOUBLE PRECISION NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Convert to TimescaleDB hypertable for optimal time-series query performance
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- 2. Boundary Fluxes Table (Tracks energetic and mass inputs/outputs per interval)
CREATE TABLE IF NOT EXISTS thermodynamic_boundary_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    earth_pod_id UUID NOT NULL,
    stock_key VARCHAR(64) NOT NULL,
    influx_rate DOUBLE PRECISION NOT NULL,
    outflux_rate DOUBLE PRECISION NOT NULL,
    flux_source VARCHAR(128) NOT NULL, -- e.g., 'SOLAR_RADIATION', 'DEEP_VENT', 'RADIOGENIC'
    delta_time DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('thermodynamic_boundary_fluxes', 'timestamp', if_not_exists => TRUE);

-- 3. Conservation Validation Audit Ledger (Records StateValidator assertions)
CREATE TABLE IF NOT EXISTS conservation_validation_audits (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL,
    earth_pod_id UUID NOT NULL,
    previous_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    current_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    is_valid BOOLEAN NOT NULL,
    first_law_satisfied BOOLEAN NOT NULL,
    second_law_satisfied BOOLEAN NOT NULL,
    max_residual DOUBLE PRECISION NOT NULL,
    violation_details JSONB DEFAULT NULL,
    blockchain_tx_hash VARCHAR(64) UNIQUE
);

SELECT create_hypertable('conservation_validation_audits', 'timestamp', if_not_exists => TRUE);

-- 4. Thermodynamic Blockchain Ledger (Immutable audit trail for thermodynamic proofs)
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_index BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_signature VARCHAR(128) NOT NULL,
    audit_id UUID REFERENCES conservation_validation_audits(audit_id)
);

-- Indexes for performance and referential lookups
CREATE INDEX IF NOT EXISTS idx_state_vectors_pod_time ON thermodynamic_state_vectors(earth_pod_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_boundary_fluxes_pod_time ON thermodynamic_boundary_fluxes(earth_pod_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conservation_audits_valid ON conservation_validation_audits(is_valid) WHERE is_valid = FALSE;
CREATE INDEX IF NOT EXISTS idx_blockchain_hash ON thermodynamic_blockchain_blocks(block_hash);
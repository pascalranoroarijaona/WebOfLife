-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 041: Thermodynamic State Vector Non-Negative Entropy Assertion
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Enums for Thermodynamic Validation and State Monads
CREATE TYPE validation_error_code AS ENUM (
    'NEGATIVE_ENTROPY_VIOLATION',
    'INVALID_STATE_VECTOR'
);

CREATE TYPE monad_status AS ENUM (
    'PENDING',
    'SUCCESS',
    'FAILED'
);

-- Thermodynamic State Vectors Table (Time-Series Hypertable)
CREATE TABLE thermodynamic_state_vectors (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    earth_pod_id UUID NOT NULL,
    energy DOUBLE PRECISION NOT NULL,
    entropy DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    biomass DOUBLE PRECISION NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT chk_entropy_non_negative CHECK (entropy >= 0.0)
);

-- Convert to TimescaleDB hypertable for optimal time-series analytics
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- Thermodynamic Validation Audit Log (Tracks Result Monad returns)
CREATE TABLE thermodynamic_validation_audit_logs (
    id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id),
    success BOOLEAN NOT NULL,
    error_code validation_error_code,
    error_message TEXT,
    invalid_value DOUBLE PRECISION,
    CONSTRAINT fk_state_vector FOREIGN KEY (state_vector_id) REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE
);

-- Blockchain Block Transaction Signatures for Thermodynamic Cycles
CREATE TABLE thermodynamic_blockchain_blocks (
    block_hash VARCHAR(64) PRIMARY KEY,
    previous_block_hash VARCHAR(64) REFERENCES thermodynamic_blockchain_blocks(block_hash),
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_signature TEXT NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id),
    monad_status monad_status NOT NULL DEFAULT 'PENDING'
);

-- Indexes for performance
CREATE INDEX idx_thermodynamic_vectors_pod_time ON thermodynamic_state_vectors (earth_pod_id, timestamp DESC);
CREATE INDEX idx_validation_audit_success ON thermodynamic_validation_audit_logs (success, timestamp DESC);
CREATE INDEX idx_blockchain_timestamp ON thermodynamic_blockchain_blocks (timestamp DESC);
-- ============================================================================
-- Web of Life: Sprint 050 Database Schema
-- Thermodynamic State Vector Non-Negative Entropy Monad Pipe & Ledger
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors Table
-- Stores snapshots of the thermodynamic state of ecological and biochemical pods.
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    internal_energy NUMERIC(18, 6) NOT NULL,
    entropy NUMERIC(18, 6) NOT NULL,
    temperature NUMERIC(18, 6) NOT NULL,
    solar_flux NUMERIC(18, 6) DEFAULT 0.000000,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast time-series retrieval by pod
CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_pod_time 
ON thermodynamic_states(pod_id, timestamp DESC);

-- 2. Thermodynamic State Transformations & Monad Validations Ledger
-- Records every monadic pipeline execution, including entropy checks, 
-- delta S calculations, validation status, and potential rollbacks.
CREATE TABLE IF NOT EXISTS thermodynamic_transformations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initial_state_id UUID NOT NULL REFERENCES thermodynamic_states(id) ON DELETE CASCADE,
    candidate_state_id UUID NOT NULL REFERENCES thermodynamic_states(id) ON DELETE CASCADE,
    result_state_id UUID NOT NULL REFERENCES thermodynamic_states(id) ON DELETE CASCADE,
    delta_entropy NUMERIC(18, 6) NOT NULL,
    solar_input NUMERIC(18, 6) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    rejection_reason TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for auditing validation failures and second law violations
CREATE INDEX IF NOT EXISTS idx_thermo_trans_validity 
ON thermodynamic_transformations(is_valid, executed_at DESC);

-- 3. Thermodynamic Blockchain Block Signatures
-- Immutably anchors validated thermodynamic monad pipelines into cryptographic blocks.
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    transformation_id UUID NOT NULL REFERENCES thermodynamic_transformations(id) ON DELETE CASCADE,
    merkle_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for blockchain traversal
CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash 
ON thermodynamic_blocks(block_hash);

-- ============================================================================
-- End of Sprint 050 Schema Definition
-- ============================================================================
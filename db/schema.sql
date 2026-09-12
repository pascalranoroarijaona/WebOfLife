-- ============================================================================
-- WEB OF LIFE DATABASE SCHEMA - SPRINT 057
-- Thermodynamic State Vector Stock Conservation & Delta Ledger
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. THERMODYNAMIC PODS & STATE VECTORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID REFERENCES pods(pod_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    solar_flux_input DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_dissipation DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. STOCKS & CONSERVATION LEDGERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    stock_key VARCHAR(100) NOT NULL,
    stock_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'mol/kg',
    CONSTRAINT unique_vector_stock UNIQUE (vector_id, stock_key)
);

CREATE TABLE IF NOT EXISTS boundary_flux_rates (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    stock_key VARCHAR(100) NOT NULL,
    net_rate DOUBLE PRECISION NOT NULL, -- Net inflows minus outflows per unit time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. STATE VALIDATOR AUDIT LEDGERS (Sprint 057 Integration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS state_validation_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_vector_id UUID REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    current_vector_id UUID REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    delta_t DOUBLE PRECISION NOT NULL,
    tolerance DOUBLE PRECISION NOT NULL DEFAULT 1e-6,
    is_valid BOOLEAN NOT NULL,
    max_tolerance DOUBLE PRECISION NOT NULL,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_discrepancies (
    discrepancy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES state_validation_audits(audit_id) ON DELETE CASCADE,
    stock_key VARCHAR(100) NOT NULL,
    expected_delta DOUBLE PRECISION NOT NULL,
    actual_delta DOUBLE PRECISION NOT NULL,
    discrepancy_value DOUBLE PRECISION NOT NULL,
    exceeds_tolerance BOOLEAN NOT NULL
);

-- ============================================================================
-- 4. BLOCKCHAIN TRANSACTIONS & PROOFS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    audit_id UUID REFERENCES state_validation_audits(audit_id) ON DELETE SET NULL,
    payload_hash VARCHAR(64) NOT NULL,
    fee DOUBLE PRECISION DEFAULT 0.0
);
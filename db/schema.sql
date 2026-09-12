-- ============================================================================
-- Web of Life Database & Time-Series Ledger Schema
-- Sprint 031: Thermodynamic State Vector Validation & Monad Stock Transactions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors Table (Hypertable for Time-Series Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID DEFAULT uuid_generate_v4(),
    simulation_step BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temperature DOUBLE PRECISION NOT NULL,
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    dissipation_rate DOUBLE PRECISION DEFAULT 0.0 CHECK (dissipation_rate >= 0),
    solar_input DOUBLE PRECISION DEFAULT 0.0 CHECK (solar_input >= 0),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_errors TEXT[],
    PRIMARY KEY (vector_id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 2. Monad Stocks Ledger (Carbon, Nitrogen, Phosphorus, Water pools)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_stocks (
    stock_id UUID DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    stock_type VARCHAR(64) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER', 'ENTHALPY'
    stock_amount DOUBLE PRECISION NOT NULL CHECK (stock_amount >= 0),
    PRIMARY KEY (stock_id, timestamp),
    FOREIGN KEY (vector_id, timestamp) REFERENCES thermodynamic_state_vectors(vector_id, timestamp) ON DELETE CASCADE
);

SELECT create_hypertable('monad_stocks', 'timestamp', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Transitions & First/Second Law Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_transitions (
    transition_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prior_vector_id UUID NOT NULL,
    next_vector_id UUID NOT NULL,
    net_stock_change DOUBLE PRECISION NOT NULL,
    solar_input_bound DOUBLE PRECISION NOT NULL,
    first_law_satisfied BOOLEAN NOT NULL,
    second_law_satisfied BOOLEAN NOT NULL,
    tolerance_used DOUBLE PRECISION NOT NULL DEFAULT 1e-6,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Blockchain Transaction Signatures & Audit Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_audit_ledger (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    transition_id UUID REFERENCES thermodynamic_transitions(transition_id),
    validator_signature VARCHAR(256) NOT NULL,
    payload_checksum VARCHAR(64) NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-performance retrieval
CREATE INDEX IF NOT EXISTS idx_state_vectors_step ON thermodynamic_state_vectors(simulation_step);
CREATE INDEX IF NOT EXISTS idx_monad_stocks_type ON monad_stocks(stock_type);
CREATE INDEX IF NOT EXISTS idx_transitions_laws ON thermodynamic_transitions(first_law_satisfied, second_law_satisfied);
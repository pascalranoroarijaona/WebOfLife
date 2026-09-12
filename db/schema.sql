-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Relational Schema
-- Sprint 055 Update: Thermodynamic State Vector Stock Conservation & Flux Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Thermodynamic Elemental Tracking
CREATE TYPE elemental_type AS ENUM ('C', 'N', 'P', 'H2O', 'ENERGY');

-- Thermodynamic State Vectors Table
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entropy_j_k NUMERIC(20, 8) NOT NULL,
    free_energy_j NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Stocks Table (Tracks individual pool masses/energies)
CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id VARCHAR(255) PRIMARY KEY,
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    element elemental_type NOT NULL,
    stock_value NUMERIC(20, 8) NOT NULL CHECK (stock_value >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flux Vectors Table (Tracks boundary flux rates between stocks)
CREATE TABLE IF NOT EXISTS flux_vectors (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id VARCHAR(255) REFERENCES thermodynamic_stocks(stock_id),
    target_id VARCHAR(255) REFERENCES thermodynamic_stocks(stock_id),
    element elemental_type NOT NULL,
    rate NUMERIC(20, 8) NOT NULL, -- Units per second
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delta Calculation Ledger (Persists results from ThermodynamicStateValidator)
CREATE TABLE IF NOT EXISTS delta_calculation_ledger (
    calculation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    stock_id VARCHAR(255) REFERENCES thermodynamic_stocks(stock_id),
    element elemental_type NOT NULL,
    expected_delta NUMERIC(20, 8) NOT NULL,
    net_inflow NUMERIC(20, 8) NOT NULL,
    net_outflow NUMERIC(20, 8) NOT NULL,
    is_conserved BOOLEAN NOT NULL,
    delta_time NUMERIC(15, 6) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blockchain Block Transactions for Thermodynamic State Validation
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    validator_signature TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization during time-series validation
CREATE INDEX idx_thermodynamic_stocks_vector ON thermodynamic_stocks(vector_id);
CREATE INDEX idx_flux_vectors_source_target ON flux_vectors(source_id, target_id);
CREATE INDEX idx_delta_ledger_stock ON delta_calculation_ledger(stock_id, calculated_at);
CREATE INDEX idx_blockchain_hash ON thermodynamic_blockchain_blocks(block_hash);
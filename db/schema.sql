-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 071 Update: Thermodynamic State Vector Discrepancy & Absolute Deltas
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Elemental types for thermodynamic tracking
CREATE TYPE elemental_stock_key AS ENUM ('carbon', 'nitrogen', 'phosphorus', 'water', 'energy');

-- Thermodynamic Stock Vectors representing mass and energy states
CREATE TABLE IF NOT EXISTS thermodynamic_stock_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    carbon NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    nitrogen NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    phosphorus NUMERIC(18, 6) NOT NULL DEFAULT 0.00000,
    water NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    energy NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic State Vector Discrepancy Log (Sprint 071)
CREATE TABLE IF NOT EXISTS thermodynamic_state_discrepancies (
    discrepancy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_vector_id UUID REFERENCES thermodynamic_stock_vectors(vector_id),
    expected_vector_id UUID REFERENCES thermodynamic_stock_vectors(vector_id),
    delta_carbon NUMERIC(18, 6) NOT NULL,
    delta_nitrogen NUMERIC(18, 6) NOT NULL,
    delta_phosphorus NUMERIC(18, 6) NOT NULL,
    delta_water NUMERIC(18, 6) NOT NULL,
    delta_energy NUMERIC(18, 6) NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable Blockchain Transactions for Monad Stock Transformations
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_index BIGINT NOT NULL,
    previous_hash VARCHAR(64),
    monad_process_id UUID NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_stock_vectors(vector_id),
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and time-series aggregation
CREATE INDEX IF NOT EXISTS idx_thermo_vectors_entity ON thermodynamic_stock_vectors(entity_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_discrepancies_validated ON thermodynamic_state_discrepancies(validated_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_block ON blockchain_transactions(block_index);
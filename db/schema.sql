-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Relational Schema
-- Sprint 066: Thermodynamic State Vector Inventory Discrepancy Evaluator Core
-- ============================================================================

-- Drop existing experimental constraints if upgrading
DROP TABLE IF EXISTS state_discrepancy_audit_ledger CASCADE;
DROP TABLE IF EXISTS thermodynamic_state_vectors CASCADE;

-- Core Thermodynamic State Vectors Table
CREATE TABLE thermodynamic_state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    carbon_inventory NUMERIC(18, 8) NOT NULL,
    nitrogen_inventory NUMERIC(18, 8) NOT NULL,
    phosphorus_inventory NUMERIC(18, 8) NOT NULL,
    water_inventory NUMERIC(18, 8) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Audit Ledger for State Vector Inventory Discrepancy Evaluations (Sprint 066)
CREATE TABLE state_discrepancy_audit_ledger (
    audit_id SERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL,
    transaction_hash VARCHAR(64) UNIQUE NOT NULL,
    expected_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    actual_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    is_valid BOOLEAN NOT NULL,
    evaluation_payload JSONB NOT NULL, -- Stores full DiscrepancyResult array structure
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for time-series optimization and rapid ledger validation
CREATE INDEX idx_state_vectors_entity_time ON thermodynamic_state_vectors(entity_id, timestamp DESC);
CREATE INDEX idx_discrepancy_ledger_valid ON state_discrepancy_audit_ledger(is_valid);
CREATE INDEX idx_discrepancy_ledger_block ON state_discrepancy_audit_ledger(block_height DESC);

-- Blockchain Transaction Integration for Thermodynamic Conservation Proofs
COMMENT ON TABLE state_discrepancy_audit_ledger IS 'Sprint 066: Cryptographic proof ledger storing StateValidator evaluation outputs enforcing First & Second Thermodynamic Laws.';
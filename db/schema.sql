-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 081 Update: State Validator & Discrepancy Evaluation Tables
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Compartments tracking biogeochemical stocks (Carbon, Nitrogen, Phosphorus, Water)
CREATE TABLE IF NOT EXISTS thermodynamic_compartments (
    compartment_id VARCHAR(64) PRIMARY KEY,
    compartment_name VARCHAR(255) NOT NULL,
    cycle_type VARCHAR(32) NOT NULL CHECK (cycle_type IN ('CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic State Vectors recorded over time
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compartment_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_compartments(compartment_id),
    total_mass DOUBLE PRECISION NOT NULL CHECK (total_mass >= 0),
    internal_energy DOUBLE PRECISION NOT NULL,
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discrepancy Evaluation Reports (Matching StateValidator output)
CREATE TABLE IF NOT EXISTS thermodynamic_discrepancy_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_valid BOOLEAN NOT NULL,
    total_mass_discrepancy DOUBLE PRECISION NOT NULL,
    total_energy_discrepancy DOUBLE PRECISION NOT NULL,
    tolerance_mass DOUBLE PRECISION NOT NULL,
    tolerance_energy DOUBLE PRECISION NOT NULL,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compartment-level breakdown of discrepancies per evaluation report
CREATE TABLE IF NOT EXISTS compartment_discrepancy_details (
    detail_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES thermodynamic_discrepancy_reports(report_id) ON DELETE CASCADE,
    compartment_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_compartments(compartment_id),
    mass_discrepancy DOUBLE PRECISION NOT NULL,
    energy_discrepancy DOUBLE PRECISION NOT NULL
);

-- Thermodynamic Monad Stock Transactions & Ledger Blocks
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_compartment_id VARCHAR(64) REFERENCES thermodynamic_compartments(compartment_id),
    target_compartment_id VARCHAR(64) REFERENCES thermodynamic_compartments(compartment_id),
    mass_delta DOUBLE PRECISION NOT NULL,
    energy_delta DOUBLE PRECISION NOT NULL,
    report_id UUID REFERENCES thermodynamic_discrepancy_reports(report_id),
    block_hash VARCHAR(64) NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_state_vectors_compartment ON thermodynamic_state_vectors(compartment_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_valid ON thermodynamic_discrepancy_reports(is_valid, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_monad_transactions_hash ON thermodynamic_monad_transactions(block_hash);
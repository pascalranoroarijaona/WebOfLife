-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 061)
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_structures (
    structure_id VARCHAR(64) PRIMARY KEY,
    cycle_type VARCHAR(32) NOT NULL, -- CARBON, NITROGEN, PHOSPHORUS, WATER
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    structure_id VARCHAR(64) REFERENCES thermodynamic_structures(structure_id),
    stocks JSONB NOT NULL, -- Key-value pairs of stock concentrations/masses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS validation_reports (
    report_id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    previous_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    current_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    total_absolute_discrepancy NUMERIC(20, 10) NOT NULL,
    is_mass_conserved BOOLEAN NOT NULL,
    tolerance NUMERIC(20, 10) NOT NULL,
    records JSONB NOT NULL, -- Array of DiscrepancyRecord
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_block_ledger (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    report_id INT REFERENCES validation_reports(report_id),
    entropy_delta NUMERIC(20, 10) NOT NULL,
    solar_flux_input NUMERIC(20, 10) NOT NULL,
    signature VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_state_vectors_timestamp ON state_vectors(timestamp);
CREATE INDEX IF NOT EXISTS idx_validation_reports_conserved ON validation_reports(is_mass_conserved);
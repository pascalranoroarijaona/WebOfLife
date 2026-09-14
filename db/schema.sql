-- Updated Schema & Ledger Definitions for Sprint 015
-- Web of Life Database, UML & Thermodynamic Blockchain Architecture

CREATE TABLE IF NOT EXISTS h3_validation_logs (
    id SERIAL PRIMARY KEY,
    payload_input TEXT,
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    validated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    entropy_delta NUMERIC(18, 9) DEFAULT 0.000000000
);

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id SERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    trophic_energy_stock NUMERIC(20, 8) NOT NULL,
    spatial_index_token VARCHAR(15),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_h3_validation_timestamp ON h3_validation_logs(validated_at);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_block_hash ON thermodynamic_blocks(current_hash);
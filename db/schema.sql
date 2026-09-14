-- Updated Schema & Ledger Definitions for Sprint 018
-- Web of Life Database, UML & Thermodynamic Blockchain Architect

CREATE TABLE IF NOT EXISTS spatial_cells (
    cell_id VARCHAR(15) PRIMARY KEY,
    resolution INT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    solar_flux_joules NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_h3_length CHECK (LENGTH(cell_id) = 15 AND cell_id ~ '^[0-9a-fA-F]{15}$')
);

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_cells(cell_id),
    biomass_grams NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    entropy_joules_per_k NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_flows (
    flow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    energy_transferred_joules NUMERIC(18, 6) NOT NULL CHECK (energy_transferred_joules >= 0),
    flow_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_index SERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL UNIQUE,
    merkle_root VARCHAR(64) NOT NULL,
    solar_input_validator VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index INT REFERENCES blockchain_blocks(block_index),
    flow_id UUID REFERENCES thermodynamic_flows(flow_id),
    signature VARCHAR(128) NOT NULL
);

-- Indexing for high-performance spatial-thermodynamic lookups
CREATE INDEX IF NOT EXISTS idx_spatial_cells_id ON spatial_cells(cell_id);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_stocks_cell ON thermodynamic_stocks(cell_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_hash ON blockchain_blocks(current_hash);
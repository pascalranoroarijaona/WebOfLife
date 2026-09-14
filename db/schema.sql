-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 003)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SPATIAL & H3 GRID TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_spatial_cells (
    cell_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    base_cell INT NOT NULL CHECK (base_cell >= 0 AND base_cell <= 121),
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_resolution ON h3_spatial_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_spatial_base_cell ON h3_spatial_cells(base_cell);

-- ============================================================================
-- 2. THERMODYNAMIC STOCKS & MONAD TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS earth_pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_spatial_cells(cell_index),
    biomass_stock DECIMAL(18, 6) NOT NULL DEFAULT 0.0 CHECK (biomass_stock >= 0),
    carbon_stock DECIMAL(18, 6) NOT NULL DEFAULT 0.0 CHECK (carbon_stock >= 0),
    water_stock DECIMAL(18, 6) NOT NULL DEFAULT 0.0 CHECK (water_stock >= 0),
    informational_entropy DECIMAL(18, 6) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_earth_pods_cell ON earth_pods(cell_index);

-- ============================================================================
-- 3. THERMODYNAMIC BLOCKCHAIN LEDGER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_input_joules DECIMAL(24, 6) NOT NULL CHECK (solar_input_joules >= 0),
    work_consumed_joules DECIMAL(24, 6) NOT NULL CHECK (work_consumed_joules >= 0),
    entropy_delta DECIMAL(24, 6) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocks_height ON thermodynamic_blocks(block_height);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID NOT NULL REFERENCES thermodynamic_blocks(block_id),
    source_pod_id UUID REFERENCES earth_pods(pod_id),
    target_pod_id UUID REFERENCES earth_pods(pod_id),
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_spatial_cells(cell_index),
    matter_flow_delta DECIMAL(18, 6) NOT NULL,
    energy_flow_joules DECIMAL(18, 6) NOT NULL,
    thermodynamic_law_compliance VARCHAR(32) NOT NULL DEFAULT 'FIRST_SECOND_LAWS_VERIFIED',
    tx_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_block ON thermodynamic_transactions(block_id);
CREATE INDEX IF NOT EXISTS idx_tx_cell ON thermodynamic_transactions(cell_index);
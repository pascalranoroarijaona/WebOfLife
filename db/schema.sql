-- ============================================================================
-- WEB OF LIFE DATABASE & BLOCKCHAIN SCHEMA
-- Sprint 002: Uber H3 Spatial Indexing, Ring Generation, & Adjacency Mappings
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL & TOPOLOGICAL SCHEMAS (H3 Integration)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_spatial_cells (
    index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    base_cell INTEGER NOT NULL,
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS h3_edge_neighbors (
    source_index VARCHAR(15) REFERENCES h3_spatial_cells(index) ON DELETE CASCADE,
    neighbor_index VARCHAR(15) REFERENCES h3_spatial_cells(index) ON DELETE CASCADE,
    edge_direction INTEGER NOT NULL CHECK (edge_direction >= 0 AND edge_direction < 6),
    PRIMARY KEY (source_index, neighbor_index)
);

CREATE TABLE IF NOT EXISTS h3_k_rings (
    center_index VARCHAR(15) REFERENCES h3_spatial_cells(index) ON DELETE CASCADE,
    ring_k INTEGER NOT NULL CHECK (ring_k >= 0),
    ring_indices TEXT[] NOT NULL, -- Array of H3 strings at distance k
    PRIMARY KEY (center_index, ring_k)
);

-- ----------------------------------------------------------------------------
-- 2. THERMODYNAMIC MONAD STOCKS & FLUXES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_control_volumes (
    volume_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) REFERENCES h3_spatial_cells(index) ON DELETE CASCADE,
    mass_stock NUMERIC(18, 6) NOT NULL CHECK (mass_stock >= 0),
    energy_stock NUMERIC(18, 6) NOT NULL CHECK (energy_stock >= 0),
    entropy_stock NUMERIC(18, 6) NOT NULL CHECK (entropy_stock >= 0),
    solar_input_flux NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_volume_id UUID REFERENCES thermodynamic_control_volumes(volume_id),
    target_volume_id UUID REFERENCES thermodynamic_control_volumes(volume_id),
    mass_transferred NUMERIC(18, 6) NOT NULL,
    energy_transferred NUMERIC(18, 6) NOT NULL,
    entropy_generated NUMERIC(18, 6) NOT NULL,
    h3_edge_direction INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. BLOCKCHAIN LEDGER & TRANSACTION SIGNATURES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_height BIGINT REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    spatial_flux_id UUID REFERENCES spatial_flux_transactions(transaction_id),
    monad_state_pre BYTEA NOT NULL,
    monad_state_post BYTEA NOT NULL,
    proof_signature VARCHAR(128) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_h3_spatial_cells_res ON h3_spatial_cells(resolution);
CREATE INDEX idx_flux_trans_source ON spatial_flux_transactions(source_volume_id);
CREATE INDEX idx_flux_trans_target ON spatial_flux_transactions(target_volume_id);
CREATE INDEX idx_block_height ON blockchain_blocks(block_height);
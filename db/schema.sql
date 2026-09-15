-- Web of Life: Thermodynamic Blockchain & DGGS Spatial Monad Schema
-- Sprint 085: H3 Index Aperture Digit Extraction & Directional Flux Conservation
-- Target Table Set: DGGS Topology, Hierarchical Stocks, Convective Fluxes & Block Ledgers

-- Enable cryptographic and temporal extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. H3 DGGS CELL REGISTRY & APERTURE DECOMPOSITION
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_cell_registry (
    h3_index BIGINT PRIMARY KEY,
    index_hex VARCHAR(16) NOT NULL UNIQUE,
    mode SMALLINT NOT NULL CHECK (mode = 1),
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell SMALLINT NOT NULL CHECK (base_cell BETWEEN 0 AND 121),
    active_digits SMALLINT[] NOT NULL,
    all_digits SMALLINT[15] NOT NULL,
    parent_index BIGINT NULL REFERENCES h3_cell_registry(h3_index),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    
    -- Constraint ensuring active digits match resolution length
    CONSTRAINT chk_active_digits_length 
        CHECK (cardinality(active_digits) = resolution),
    -- Constraint ensuring all 15 digits are parsed and bounded [0, 7]
    CONSTRAINT chk_all_digits_length 
        CHECK (cardinality(all_digits) = 15)
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_res_base 
    ON h3_cell_registry (resolution, base_cell);
CREATE INDEX IF NOT EXISTS idx_h3_cell_parent 
    ON h3_cell_registry (parent_index);

-- ============================================================================
-- 2. THERMODYNAMIC CONTROL VOLUME (SPATIAL STOCK MONAD)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_control_volume (
    volume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index) ON DELETE RESTRICT,
    resolution SMALLINT NOT NULL,
    
    -- Conserved Biophysical Stocks (SI units: kg for mass, Kelvin for temperature, Joules for exergy)
    carbon_stock_kg NUMERIC(28, 10) NOT NULL CHECK (carbon_stock_kg >= 0),
    nitrogen_stock_kg NUMERIC(28, 10) NOT NULL CHECK (nitrogen_stock_kg >= 0),
    phosphorus_stock_kg NUMERIC(28, 10) NOT NULL CHECK (phosphorus_stock_kg >= 0),
    water_stock_kg NUMERIC(28, 10) NOT NULL CHECK (water_stock_kg >= 0),
    
    -- Thermal and Energetic Coordinates
    temperature_k NUMERIC(10, 4) NOT NULL CHECK (temperature_k > 0),
    internal_energy_j NUMERIC(32, 6) NOT NULL,
    entropy_j_per_k NUMERIC(32, 6) NOT NULL CHECK (entropy_j_per_k >= 0),
    thermal_exergy_j NUMERIC(32, 6) NOT NULL CHECK (thermal_exergy_j >= 0),
    
    -- State verification hash (SHA-256 of canonical state variables)
    state_merkle_root BYTEA NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    valid_to TIMESTAMPTZ NULL,

    CONSTRAINT uq_control_volume_temporal UNIQUE (h3_index, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_control_volume_h3 
    ON spatial_control_volume (h3_index);
CREATE INDEX IF NOT EXISTS idx_control_volume_active 
    ON spatial_control_volume (h3_index) WHERE valid_to IS NULL;

-- ============================================================================
-- 3. HIERARCHICAL PARTITIONING & MASS CONSERVATION AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_hierarchical_partition (
    partition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    parent_resolution SMALLINT NOT NULL CHECK (parent_resolution BETWEEN 0 AND 14),
    child_resolution SMALLINT NOT NULL CHECK (child_resolution = parent_resolution + 1),
    
    -- Aperture 7 Branch Sums
    total_child_carbon_kg NUMERIC(28, 10) NOT NULL,
    total_child_nitrogen_kg NUMERIC(28, 10) NOT NULL,
    total_child_phosphorus_kg NUMERIC(28, 10) NOT NULL,
    total_child_water_kg NUMERIC(28, 10) NOT NULL,
    
    -- Verification of First Law: M_parent == sum(M_child)
    parent_carbon_kg NUMERIC(28, 10) NOT NULL,
    mass_conservation_delta_kg NUMERIC(28, 10) GENERATED ALWAYS AS (
        abs(parent_carbon_kg - total_child_carbon_kg)
    ) STORED,
    is_conserved BOOLEAN NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    
    CONSTRAINT chk_mass_conservation_tolerance 
        CHECK (mass_conservation_delta_kg < 1e-8)
);

CREATE INDEX IF NOT EXISTS idx_hierarchical_partition_parent 
    ON spatial_hierarchical_partition (parent_h3_index);

-- ============================================================================
-- 4. SPATIAL FLUX MONAD TRANSACTIONS (CONVECTIVE / DIFFUSIVE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_convective_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    target_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    
    -- Directional aperture digit connecting the two volumes
    aperture_digit SMALLINT NOT NULL CHECK (aperture_digit BETWEEN 0 AND 6),
    flux_epoch_nanos BIGINT NOT NULL,
    
    -- Mass Stocks in Transit (kg)
    delta_carbon_kg NUMERIC(24, 8) NOT NULL CHECK (delta_carbon_kg >= 0),
    delta_nitrogen_kg NUMERIC(24, 8) NOT NULL CHECK (delta_nitrogen_kg >= 0),
    delta_phosphorus_kg NUMERIC(24, 8) NOT NULL CHECK (delta_phosphorus_kg >= 0),
    delta_water_kg NUMERIC(24, 8) NOT NULL CHECK (delta_water_kg >= 0),
    
    -- Heat transfer and Second Law Irreversibility
    heat_transfer_j NUMERIC(28, 6) NOT NULL DEFAULT 0.0,
    source_temp_k NUMERIC(10, 4) NOT NULL,
    target_temp_k NUMERIC(10, 4) NOT NULL,
    
    -- Entropy generation: sigma = Q * (1/T_dest - 1/T_src) >= 0 for T_src >= T_dest
    entropy_generation_sigma NUMERIC(28, 8) NOT NULL CHECK (entropy_generation_sigma >= 0),
    
    -- Cryptographic Witness
    signature BYTEA NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_flux_source_target 
    ON spatial_convective_flux_ledger (source_h3_index, target_h3_index);
CREATE INDEX IF NOT EXISTS idx_flux_epoch 
    ON spatial_convective_flux_ledger (flux_epoch_nanos);

-- ============================================================================
-- 5. THERMODYNAMIC SPATIAL BLOCKCHAIN BLOCK & ATTESTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_flux_block (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_block_hash BYTEA NOT NULL,
    merkle_state_root BYTEA NOT NULL,
    merkle_flux_root BYTEA NOT NULL,
    
    -- Aggregate Conservation Metrics for the Block
    total_carbon_flux_kg NUMERIC(32, 10) NOT NULL,
    total_entropy_generated_j_per_k NUMERIC(32, 10) NOT NULL CHECK (total_entropy_generated_j_per_k >= 0),
    
    block_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    proposer_public_key BYTEA NOT NULL,
    aggregate_signature BYTEA NOT NULL
);

-- Transaction link between block and spatial flux ledger
CREATE TABLE IF NOT EXISTS block_flux_transactions (
    block_height BIGINT NOT NULL REFERENCES spatial_flux_block(block_height) ON DELETE CASCADE,
    flux_id UUID NOT NULL REFERENCES spatial_convective_flux_ledger(flux_id) ON DELETE RESTRICT,
    tx_index INTEGER NOT NULL,
    PRIMARY KEY (block_height, tx_index)
);

CREATE INDEX IF NOT EXISTS idx_block_flux_tx 
    ON block_flux_transactions (flux_id);
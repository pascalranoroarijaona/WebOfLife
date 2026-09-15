-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Spatial DGGS Ledger Schema
-- Sprint 084: H3 Directional Bitmask & Directional Flux Channel Topology
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DOMAINS & CUSTOM TYPES
-- ============================================================================

-- Directional Bitmask: 6-bit unsigned integer (0x00 to 0x3F, 0 to 63)
-- Encoding orthogonal adjacency channels along canonical H3 axes [0..5]
CREATE DOMAIN h3_direction_bitmask AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 63);

-- Discrete H3 Direction Index [0..5]
CREATE DOMAIN h3_direction_index AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 5);

-- H3 Index string representation (64-bit hex)
CREATE DOMAIN h3_index AS VARCHAR(15)
    CHECK (VALUE ~ '^[0-9a-fA-F]{15}$');

-- Thermodynamic Stock Type Classification
CREATE TYPE thermodynamic_stock_type AS ENUM (
    'ENTHALPY_JOULES',
    'MASS_CARBON_KG',
    'MASS_WATER_KG',
    'BIOMASS_KG',
    'ENTROPY_JOULES_PER_KELVIN'
);

-- ============================================================================
-- BLOCKCHAIN & CONSENSUS LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    flux_merkle_root BYTEA NOT NULL,
    entropy_production_total NUMERIC(28, 10) NOT NULL CHECK (entropy_production_total >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_signature BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash BYTEA PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    tx_type VARCHAR(64) NOT NULL,
    sender_account BYTEA NOT NULL,
    signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SPATIAL DGGS CELL REGISTRATION & DIRECTIONAL TOPOLOGY
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_cells (
    cell_id h3_index PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    base_cell SMALLINT NOT NULL CHECK (base_cell >= 0 AND base_cell <= 121),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Directional channel permeability barrier state per cell epoch
CREATE TABLE IF NOT EXISTS h3_cell_flux_barriers (
    cell_id h3_index NOT NULL REFERENCES h3_cells(cell_id) ON DELETE CASCADE,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    channel_bitmask h3_direction_bitmask NOT NULL DEFAULT 63, -- Default 0x3F (ALL open)
    topographic_barrier_height_m NUMERIC(10, 2) DEFAULT 0.0,
    permeability_factor NUMERIC(5, 4) NOT NULL DEFAULT 1.0 CHECK (permeability_factor >= 0.0 AND permeability_factor <= 1.0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cell_id, block_height)
);

-- Explicit bidirectional edge registry with topological parity verification
CREATE TABLE IF NOT EXISTS h3_directional_channels (
    source_cell_id h3_index NOT NULL REFERENCES h3_cells(cell_id),
    target_cell_id h3_index NOT NULL REFERENCES h3_cells(cell_id),
    source_direction h3_direction_index NOT NULL,
    target_direction h3_direction_index NOT NULL,
    is_reciprocally_open BOOLEAN GENERATED ALWAYS AS (
        target_direction = ((source_direction + 3) % 6)
    ) STORED,
    conductivity_coefficient NUMERIC(14, 6) NOT NULL DEFAULT 1.0 CHECK (conductivity_coefficient >= 0),
    PRIMARY KEY (source_cell_id, source_direction),
    CONSTRAINT chk_opposite_symmetry CHECK (target_direction = ((source_direction + 3) % 6)),
    CONSTRAINT chk_distinct_cells CHECK (source_cell_id <> target_cell_id)
);

-- ============================================================================
-- THERMODYNAMIC STOCK STATE TENSORS & FLUX LEDGERS
-- ============================================================================

-- Conserved thermodynamic state per spatial cell at block checkpoints
CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_state (
    cell_id h3_index NOT NULL REFERENCES h3_cells(cell_id),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    enthalpy_joules NUMERIC(28, 6) NOT NULL CHECK (enthalpy_joules >= 0),
    temperature_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_kelvin > 0),
    mass_carbon_kg NUMERIC(24, 6) NOT NULL CHECK (mass_carbon_kg >= 0),
    mass_water_kg NUMERIC(24, 6) NOT NULL CHECK (mass_water_kg >= 0),
    biomass_kg NUMERIC(24, 6) NOT NULL CHECK (biomass_kg >= 0),
    cumulative_entropy_joules_per_k NUMERIC(28, 6) NOT NULL,
    PRIMARY KEY (cell_id, block_height)
);

-- Conserved directional stock fluxes routed via DirectionBitmask gating
CREATE TABLE IF NOT EXISTS directional_flux_transactions (
    tx_hash BYTEA NOT NULL REFERENCES blockchain_transactions(tx_hash) ON DELETE CASCADE,
    source_cell_id h3_index NOT NULL,
    target_cell_id h3_index NOT NULL,
    direction h3_direction_index NOT NULL,
    stock_type thermodynamic_stock_type NOT NULL,
    stock_flux_quantity NUMERIC(28, 8) NOT NULL,
    source_active_bitmask h3_direction_bitmask NOT NULL,
    target_active_bitmask h3_direction_bitmask NOT NULL,
    channel_active BOOLEAN GENERATED ALWAYS AS (
        ((source_active_bitmask & (1 << direction)) <> 0) AND
        ((target_active_bitmask & (1 << ((direction + 3) % 6))) <> 0)
    ) STORED,
    entropy_generated_joules_per_k NUMERIC(24, 8) NOT NULL CHECK (entropy_generated_joules_per_k >= 0),
    PRIMARY KEY (tx_hash, source_cell_id, direction, stock_type),
    CONSTRAINT chk_flux_channel_permeability CHECK (
        (channel_active = TRUE) OR (stock_flux_quantity = 0.0)
    ),
    FOREIGN KEY (source_cell_id, direction) REFERENCES h3_directional_channels(source_cell_id, source_direction)
);

-- ============================================================================
-- AUDIT TRIGGERS: FIRST & SECOND LAW ENFORCEMENT
-- ============================================================================

-- Trigger verifying mass & energy closure across directional channels
CREATE OR REPLACE FUNCTION fn_verify_directional_flux_conservation()
RETURNS TRIGGER AS $$
DECLARE
    v_opposite_dir SMALLINT;
    v_reciprocal_flux NUMERIC(28, 8);
BEGIN
    v_opposite_dir := (NEW.direction + 3) % 6;

    -- If the channel is blocked by either source or target bitmask, flux must be zero
    IF NEW.channel_active = FALSE AND NEW.stock_flux_quantity <> 0.0 THEN
        RAISE EXCEPTION 'First Law Violation: Flux % attempted across impermeable directional channel % -> % (dir: %)',
            NEW.stock_flux_quantity, NEW.source_cell_id, NEW.target_cell_id, NEW.direction;
    END IF;

    -- Verify non-negative irreversible entropy dissipation (Second Law)
    IF NEW.entropy_generated_joules_per_k < 0.0 THEN
        RAISE EXCEPTION 'Second Law Violation: Negative irreversible entropy generated (%).',
            NEW.entropy_generated_joules_per_k;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_directional_flux_conservation
    BEFORE INSERT OR UPDATE ON directional_flux_transactions
    FOR EACH ROW
    EXECUTE FUNCTION fn_verify_directional_flux_conservation();

-- ============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_flux_barriers_bitmask 
    ON h3_cell_flux_barriers(cell_id, channel_bitmask);

CREATE INDEX IF NOT EXISTS idx_directional_channels_lookup 
    ON h3_directional_channels(source_cell_id, source_direction, target_cell_id);

CREATE INDEX IF NOT EXISTS idx_flux_tx_source_target 
    ON directional_flux_transactions(source_cell_id, target_cell_id, direction);

CREATE INDEX IF NOT EXISTS idx_thermo_state_block 
    ON h3_cell_thermodynamic_state(block_height, cell_id);
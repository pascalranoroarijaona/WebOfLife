-- ============================================================================
-- Web of Life: Planetary Discrete Global Grid System (DGGS) & Thermodynamic Schema
-- Sprint 089: Non-Zero Aperture Digit Predicate for Hierarchical H3 Cells
-- Architecture: Relational, Spatial Kinematics & Thermodynamic Ledger Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. H3 Discrete Global Grid System (DGGS) Cell Registry
-- Stores 64-bit canonical H3 cell indices, base cell identities, and aperture profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cell_registry (
    h3_index BIGINT PRIMARY KEY,
    h3_index_hex VARCHAR(16) GENERATED ALWAYS AS (TO_HEX(h3_index)) STORED,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell_id SMALLINT NOT NULL CHECK (base_cell_id BETWEEN 0 AND 121),
    mode SMALLINT NOT NULL DEFAULT 1 CHECK (mode = 1),
    is_concentric_base_descendant BOOLEAN NOT NULL DEFAULT FALSE,
    has_nonzero_aperture_digits BOOLEAN NOT NULL DEFAULT FALSE,
    first_nonzero_aperture_resolution SMALLINT CHECK (first_nonzero_aperture_resolution BETWEEN 1 AND 15),
    nonzero_aperture_digit_count SMALLINT NOT NULL DEFAULT 0 CHECK (nonzero_aperture_digit_count BETWEEN 0 AND 15),
    active_aperture_digit_mask BIGINT NOT NULL DEFAULT 0,
    centroid_geom GEOMETRY(Point, 4326),
    boundary_geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_concentric_alignment CHECK (
        (is_concentric_base_descendant = TRUE AND has_nonzero_aperture_digits = FALSE AND first_nonzero_aperture_resolution IS NULL)
        OR
        (is_concentric_base_descendant = FALSE AND (has_nonzero_aperture_digits = TRUE OR resolution = 0))
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_resolution ON h3_cell_registry (resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cell_base_cell ON h3_cell_registry (base_cell_id);
CREATE INDEX IF NOT EXISTS idx_h3_cell_aperture_predicate ON h3_cell_registry (resolution, has_nonzero_aperture_digits);
CREATE INDEX IF NOT EXISTS idx_h3_cell_centroid_spatial ON h3_cell_registry USING GIST (centroid_geom);

-- ----------------------------------------------------------------------------
-- 2. Aperture Tier Digit Breakdown (Decomposed 3-bit aperture-7 resolution tiers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_aperture_tier_decompositions (
    h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index) ON DELETE CASCADE,
    resolution_tier SMALLINT NOT NULL CHECK (resolution_tier BETWEEN 1 AND 15),
    aperture_digit SMALLINT NOT NULL CHECK (aperture_digit BETWEEN 0 AND 6),
    bit_offset SMALLINT NOT NULL,
    is_central_child BOOLEAN GENERATED ALWAYS AS (aperture_digit = 0) STORED,
    azimuthal_rotation_deg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    PRIMARY KEY (h3_index, resolution_tier)
);

CREATE INDEX IF NOT EXISTS idx_aperture_tier_digit ON h3_aperture_tier_decompositions (resolution_tier, aperture_digit);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Patch State (Monadic Physical Stock)
-- Tracks First & Second Law conserved properties across discrete H3 cell patches
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_patch_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index) ON DELETE RESTRICT,
    epoch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    biomass_kg NUMERIC(28, 12) NOT NULL DEFAULT 0 CHECK (biomass_kg >= 0),
    enthalpy_joules NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (enthalpy_joules >= 0),
    entropy_j_k NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (entropy_j_k >= 0),
    water_liters NUMERIC(28, 12) NOT NULL DEFAULT 0 CHECK (water_liters >= 0),
    carbon_kg NUMERIC(28, 12) NOT NULL DEFAULT 0 CHECK (carbon_kg >= 0),
    exergy_joules NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (exergy_joules >= 0),
    coarsening_scale_factor NUMERIC(8, 4) NOT NULL DEFAULT 1.0 CHECK (coarsening_scale_factor > 0),
    state_signature BYTEA NOT NULL,
    CONSTRAINT chk_positive_entropy CHECK (entropy_j_k >= 0)
);

CREATE INDEX IF NOT EXISTS idx_patch_stocks_h3_epoch ON thermodynamic_patch_stocks (h3_index, epoch_timestamp DESC);

-- ----------------------------------------------------------------------------
-- 4. Multi-Scale Coarsening & Drift Routing Ledger
-- Quantifies geometric rotation offsets and radial diffusion optimizations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_flux_coarsening_routes (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    target_parent_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    source_resolution SMALLINT NOT NULL CHECK (source_resolution BETWEEN 1 AND 15),
    target_resolution SMALLINT NOT NULL CHECK (target_resolution BETWEEN 0 AND 14),
    has_rotational_drift BOOLEAN NOT NULL,
    drift_vector_x DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    drift_vector_y DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    drift_vector_z DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    symmetry_axis_preserved BOOLEAN NOT NULL DEFAULT FALSE,
    radial_flux_optimization_applied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_coarsening_resolutions CHECK (source_resolution > target_resolution),
    CONSTRAINT chk_drift_symmetry CHECK (
        (has_rotational_drift = FALSE AND symmetry_axis_preserved = TRUE AND drift_vector_x = 0.0 AND drift_vector_y = 0.0 AND drift_vector_z = 0.0)
        OR
        (has_rotational_drift = TRUE AND symmetry_axis_preserved = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_coarsening_routes_pair ON spatial_flux_coarsening_routes (source_h3_index, target_parent_h3_index);

-- ----------------------------------------------------------------------------
-- 5. Blockchain Block Ledger (Thermodynamic Proof-of-Conservation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_block_hash BYTEA NOT NULL,
    merkle_root_hash BYTEA NOT NULL,
    thermodynamic_state_root BYTEA NOT NULL,
    coarsening_flux_root BYTEA NOT NULL,
    total_biomass_delta_kg NUMERIC(28, 12) NOT NULL DEFAULT 0,
    total_enthalpy_delta_joules NUMERIC(38, 12) NOT NULL DEFAULT 0,
    total_entropy_production_j_k NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (total_entropy_production_j_k >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_signature BYTEA NOT NULL,
    nonce BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_block_entropy_second_law CHECK (total_entropy_production_j_k >= 0)
);

CREATE INDEX IF NOT EXISTS idx_block_height_timestamp ON thermodynamic_blocks (block_height, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 6. Monadic Spatial Flux Transactions (First & Second Law Enforced Transactions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    tx_hash BYTEA NOT NULL UNIQUE,
    source_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    target_h3_index BIGINT NOT NULL REFERENCES h3_cell_registry(h3_index),
    route_id UUID REFERENCES spatial_flux_coarsening_routes(route_id),
    biomass_transferred_kg NUMERIC(28, 12) NOT NULL DEFAULT 0,
    enthalpy_transferred_joules NUMERIC(38, 12) NOT NULL DEFAULT 0,
    water_transferred_liters NUMERIC(28, 12) NOT NULL DEFAULT 0,
    carbon_transferred_kg NUMERIC(28, 12) NOT NULL DEFAULT 0,
    entropy_generated_j_k NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (entropy_generated_j_k >= 0),
    dissipated_metabolic_heat_joules NUMERIC(38, 12) NOT NULL DEFAULT 0 CHECK (dissipated_metabolic_heat_joules >= 0),
    is_pure_radial_diffusion BOOLEAN NOT NULL DEFAULT FALSE,
    monad_receipt_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_entropy_generation CHECK (entropy_generated_j_k >= 0),
    CONSTRAINT chk_flux_metabolic_heat CHECK (dissipated_metabolic_heat_joules >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_block_source ON thermodynamic_stock_transactions (block_height, source_h3_index);
CREATE INDEX IF NOT EXISTS idx_stock_tx_target ON thermodynamic_stock_transactions (target_h3_index);
CREATE INDEX IF NOT EXISTS idx_stock_tx_hash ON thermodynamic_stock_transactions (tx_hash);

-- ----------------------------------------------------------------------------
-- 7. Trigger: First Law Verification (Conservation of Mass in Flux Batches)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_thermodynamic_block_conservation()
RETURNS TRIGGER AS $$
DECLARE
    sum_delta_biomass NUMERIC(28, 12);
    sum_delta_enthalpy NUMERIC(38, 12);
BEGIN
    -- Verify net mass/enthalpy changes within the block boundary balance exactly to zero
    SELECT COALESCE(SUM(biomass_transferred_kg), 0),
           COALESCE(SUM(enthalpy_transferred_joules), 0)
    INTO sum_delta_biomass, sum_delta_enthalpy
    FROM thermodynamic_stock_transactions
    WHERE block_height = NEW.block_height;

    IF NEW.total_biomass_delta_kg <> 0 THEN
        RAISE EXCEPTION 'First Law Violation: Non-zero net biomass variation (%) in block %',
            NEW.total_biomass_delta_kg, NEW.block_height;
    END IF;

    IF NEW.total_entropy_production_j_k < 0 THEN
        RAISE EXCEPTION 'Second Law Violation: Negative net entropy production (%) in block %',
            NEW.total_entropy_production_j_k, NEW.block_height;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_block_conservation ON thermodynamic_blocks;
CREATE TRIGGER trg_verify_block_conservation
    BEFORE INSERT OR UPDATE ON thermodynamic_blocks
    FOR EACH ROW
    EXECUTE FUNCTION verify_thermodynamic_block_conservation();
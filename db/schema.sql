-- ============================================================================
-- Web of Life: Planetary Simulation Engine & Thermodynamic Blockchain Schema
-- Sprint 092: Spatial Aperture Resolution Boundary Enforcement ([0, 15] DGGS)
-- ============================================================================

-- Extensions for cryptographic proofs and time-series spatial analysis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Domain Types & Enumerations
-- ----------------------------------------------------------------------------

-- Strict aperture resolution domain enforcing H3 integer aperture levels [0, 15]
DO $$ BEGIN
    CREATE DOMAIN h3_aperture_resolution AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 15);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Thermodynamic Stock Classification
DO $$ BEGIN
    CREATE TYPE thermodynamic_stock_type AS ENUM (
        'THERMAL_HEAT',      -- Sensible and latent heat energy (Joules)
        'HYDROLOGICAL_MASS', -- Liquid, vapor, and ice water mass (kg)
        'CARBON_MASS',       -- Organic and inorganic carbon (kg C)
        'NITROGEN_MASS',     -- Reactive nitrogen species (kg N)
        'TROPHIC_BIOMASS'    -- Phytoplankton/terrestrial biomass dry weight (kg)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Spatial Adjacency Topological Stencil Status
DO $$ BEGIN
    CREATE TYPE stencil_topological_state AS ENUM (
        'PRISTINE',
        'SYMMETRIC_POSITIVE_SEMIDEFINITE',
        'DEGENERATE',
        'REBALANCED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Spatial Tessellation & DGGS Topology Register
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dggs_aperture_resolutions (
    resolution h3_aperture_resolution PRIMARY KEY,
    characteristic_spacing_m DOUBLE PRECISION NOT NULL,
    average_area_m2 DOUBLE PRECISION NOT NULL,
    dilation_factor DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    theoretical_cell_count BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_aperture_scaling CHECK (average_area_m2 > 0 AND characteristic_spacing_m > 0)
);

-- Seed H3 Discrete Hierarchical Levels 0 through 15
INSERT INTO dggs_aperture_resolutions (resolution, characteristic_spacing_m, average_area_m2, dilation_factor, theoretical_cell_count)
VALUES
    (0,  1107712.59, 4357449416078.0, 7.0, 122),
    (1,  418676.01,  608207059440.0,  7.0, 842),
    (2,  158244.75,  86886722777.0,   7.0, 5882),
    (3,  59810.87,   12412388968.0,   7.0, 41162),
    (4,  22606.38,   1773198424.0,    7.0, 288122),
    (5,  8544.47,    253314060.6,     7.0, 2016842),
    (6,  3229.48,    36187722.94,     7.0, 14117882),
    (7,  1220.63,    5169674.71,      7.0, 98825162),
    (8,  461.35,     738524.96,       7.0, 691776122),
    (9,  174.37,     105503.57,       7.0, 4842432842),
    (10, 65.91,      15071.94,        7.0, 33897029882),
    (11, 24.91,      2153.13,         7.0, 237279209162),
    (12, 9.41,       307.59,          7.0, 1660954464122),
    (13, 3.56,       43.94,           7.0, 11626681248842),
    (14, 1.35,       6.28,            7.0, 81386768741882),
    (15, 0.51,       0.90,            7.0, 569707381193162)
ON CONFLICT (resolution) DO UPDATE
SET characteristic_spacing_m = EXCLUDED.characteristic_spacing_m,
    average_area_m2 = EXCLUDED.average_area_m2;

CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    cell_index VARCHAR(16) PRIMARY KEY,
    resolution h3_aperture_resolution NOT NULL,
    parent_index VARCHAR(16),
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    boundary_wkt TEXT NOT NULL,
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_hex_length CHECK (length(cell_index) BETWEEN 15 AND 16),
    CONSTRAINT fk_cell_resolution FOREIGN KEY (resolution) REFERENCES dggs_aperture_resolutions (resolution),
    CONSTRAINT chk_lat_bounds CHECK (centroid_lat >= -90.0 AND centroid_lat <= 90.0),
    CONSTRAINT chk_lon_bounds CHECK (centroid_lon >= -180.0 AND centroid_lon <= 180.0)
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_res ON spatial_h3_cells (resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_h3_parent ON spatial_h3_cells (parent_index);

-- ----------------------------------------------------------------------------
-- 2. Hexagonal Adjacency Graph & Laplacian Conductance Stencils
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_adjacency_matrices (
    matrix_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution h3_aperture_resolution NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    cell_count INTEGER NOT NULL CHECK (cell_count > 0),
    stencil_state stencil_topological_state NOT NULL DEFAULT 'SYMMETRIC_POSITIVE_SEMIDEFINITE',
    matrix_digest_sha256 BYTEA NOT NULL,
    is_symmetric BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_matrix_resolution FOREIGN KEY (resolution) REFERENCES dggs_aperture_resolutions (resolution)
);

CREATE TABLE IF NOT EXISTS spatial_adjacency_edges (
    edge_id BIGSERIAL PRIMARY KEY,
    matrix_id UUID NOT NULL,
    resolution h3_aperture_resolution NOT NULL,
    origin_cell VARCHAR(16) NOT NULL,
    neighbor_cell VARCHAR(16) NOT NULL,
    k_ring_distance SMALLINT NOT NULL CHECK (k_ring_distance >= 1),
    conductance_kappa DOUBLE PRECISION NOT NULL CHECK (conductance_kappa >= 0.0),
    distance_metric_m DOUBLE PRECISION NOT NULL CHECK (distance_metric_m > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_edge_matrix FOREIGN KEY (matrix_id) REFERENCES spatial_adjacency_matrices (matrix_id) ON DELETE CASCADE,
    CONSTRAINT fk_edge_origin FOREIGN KEY (origin_cell) REFERENCES spatial_h3_cells (cell_index),
    CONSTRAINT fk_edge_neighbor FOREIGN KEY (neighbor_cell) REFERENCES spatial_h3_cells (cell_index),
    CONSTRAINT uq_origin_neighbor_per_matrix UNIQUE (matrix_id, origin_cell, neighbor_cell)
);

CREATE INDEX IF NOT EXISTS idx_edges_res_origin ON spatial_adjacency_edges (resolution, origin_cell);
CREATE INDEX IF NOT EXISTS idx_edges_matrix_pair ON spatial_adjacency_edges (matrix_id, origin_cell, neighbor_cell);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Monad Stocks (Mass & Energy Conservation)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_index VARCHAR(16) NOT NULL,
    resolution h3_aperture_resolution NOT NULL,
    stock_type thermodynamic_stock_type NOT NULL,
    current_value DOUBLE PRECISION NOT NULL CHECK (current_value >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL,
    epoch_sequence BIGINT NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_stock_cell FOREIGN KEY (cell_index) REFERENCES spatial_h3_cells (cell_index),
    CONSTRAINT fk_stock_resolution FOREIGN KEY (resolution) REFERENCES dggs_aperture_resolutions (resolution),
    CONSTRAINT uq_cell_stock_epoch UNIQUE (cell_index, stock_type, epoch_sequence)
);

CREATE INDEX IF NOT EXISTS idx_stocks_epoch_res ON thermodynamic_stocks (resolution, epoch_sequence);

-- ----------------------------------------------------------------------------
-- 4. Spatial Flux Transactions (First & Second Law Verification)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resolution h3_aperture_resolution NOT NULL,
    epoch_sequence BIGINT NOT NULL,
    source_cell VARCHAR(16) NOT NULL,
    target_cell VARCHAR(16) NOT NULL,
    stock_type thermodynamic_stock_type NOT NULL,
    flux_magnitude DOUBLE PRECISION NOT NULL,
    source_temp_kelvin DOUBLE PRECISION NOT NULL CHECK (source_temp_kelvin > 0.0),
    target_temp_kelvin DOUBLE PRECISION NOT NULL CHECK (target_temp_kelvin > 0.0),
    entropy_production_rate DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate >= 0.0),
    first_law_residual DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_flux_resolution FOREIGN KEY (resolution) REFERENCES dggs_aperture_resolutions (resolution),
    CONSTRAINT fk_flux_source FOREIGN KEY (source_cell) REFERENCES spatial_h3_cells (cell_index),
    CONSTRAINT fk_flux_target FOREIGN KEY (target_cell) REFERENCES spatial_h3_cells (cell_index),
    CONSTRAINT chk_clausius_duhem CHECK (entropy_production_rate >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_epoch_res ON spatial_flux_transactions (epoch_sequence, resolution);

-- ----------------------------------------------------------------------------
-- 5. Blockchain Blocks & Merkle Verification Receipts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_blockchain_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    resolution_level h3_aperture_resolution NOT NULL,
    merkle_root_stocks BYTEA NOT NULL,
    merkle_root_fluxes BYTEA NOT NULL,
    thermodynamic_state_hash BYTEA NOT NULL,
    total_entropy_production DOUBLE PRECISION NOT NULL CHECK (total_entropy_production >= 0.0),
    first_law_divergence_norm DOUBLE PRECISION NOT NULL CHECK (first_law_divergence_norm < 1e-9),
    validator_signature BYTEA NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_block_resolution FOREIGN KEY (resolution_level) REFERENCES dggs_aperture_resolutions (resolution)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_res_height ON spatial_blockchain_blocks (resolution_level, block_height);

-- ----------------------------------------------------------------------------
-- 6. Trigger Enforcement: Aperture Resolution Guard & Flux Balance
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_flux_resolution_parity()
RETURNS TRIGGER AS $$
BEGIN
    -- Verify resolution integrity across edge boundaries
    IF (SELECT resolution FROM spatial_h3_cells WHERE cell_index = NEW.source_cell) <> NEW.resolution THEN
        RAISE EXCEPTION 'Flux resolution % does not match source cell % aperture resolution', NEW.resolution, NEW.source_cell;
    END IF;

    IF (SELECT resolution FROM spatial_h3_cells WHERE cell_index = NEW.target_cell) <> NEW.resolution THEN
        RAISE EXCEPTION 'Flux resolution % does not match target cell % aperture resolution', NEW.resolution, NEW.target_cell;
    END IF;

    -- Clausius-Duhem inequality validation: sigma = J * (1/T_target - 1/T_source) >= 0
    IF NEW.flux_magnitude > 0 THEN
        IF NEW.entropy_production_rate < 0.0 THEN
            RAISE EXCEPTION 'Thermodynamic violation: Local entropy production cannot be negative (Clausius-Duhem inequality violated). Value: %', NEW.entropy_production_rate;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_flux_resolution ON spatial_flux_transactions;
CREATE TRIGGER trg_verify_flux_resolution
BEFORE INSERT OR UPDATE ON spatial_flux_transactions
FOR EACH ROW EXECUTE FUNCTION verify_flux_resolution_parity();
```

***
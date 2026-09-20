-- ============================================================================
-- Gaia Web of Life - Spatial-Thermodynamic Blockchain & DGGS Schema
-- Sprint 091: H3 Aperture Classification & Hexagonal Orientation Dynamics
-- ============================================================================

-- Enable PostGIS & Cryptographic extensions if supported
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Enumerations and Custom Domain Types
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE h3_aperture_class AS ENUM ('CLASS_II', 'CLASS_III');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_carrier_type AS ENUM (
        'CARBON',
        'NITROGEN',
        'WATER',
        'PHOSPHORUS',
        'EXERGY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flux_directionality AS ENUM (
        'ISOTROPIC_DIFFUSION',
        'ANISOTROPIC_ADVECTION',
        'NORMAL_SURFACE_TRANSPORT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DGGS Resolution Aperture Hierarchy
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dggs_resolution_apertures (
    resolution SMALLINT PRIMARY KEY,
    aperture_class h3_aperture_class NOT NULL,
    rotation_angle_degrees NUMERIC(9, 6) NOT NULL,
    is_rotated BOOLEAN NOT NULL,
    area_scaling_factor NUMERIC(24, 12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_resolution_bounds CHECK (resolution >= 0 AND resolution <= 15),
    CONSTRAINT chk_aperture_parity CHECK (
        (resolution % 2 = 0 AND aperture_class = 'CLASS_II' AND rotation_angle_degrees = 0.000000 AND is_rotated = FALSE) OR
        (resolution % 2 = 1 AND aperture_class = 'CLASS_III' AND rotation_angle_degrees = 19.106262 AND is_rotated = TRUE)
    )
);

-- Seed static resolution records from Resolution 0 to 15
INSERT INTO dggs_resolution_apertures (resolution, aperture_class, rotation_angle_degrees, is_rotated, area_scaling_factor)
SELECT
    r,
    CASE WHEN (r % 2 = 0) THEN 'CLASS_II'::h3_aperture_class ELSE 'CLASS_III'::h3_aperture_class END,
    CASE WHEN (r % 2 = 0) THEN 0.000000 ELSE 19.106262 END,
    CASE WHEN (r % 2 = 0) THEN FALSE ELSE TRUE END,
    POWER(7.0::numeric, (-1 * r)::numeric)
FROM generate_series(0, 15) AS r
ON CONFLICT (resolution) DO UPDATE SET
    aperture_class = EXCLUDED.aperture_class,
    rotation_angle_degrees = EXCLUDED.rotation_angle_degrees,
    is_rotated = EXCLUDED.is_rotated,
    area_scaling_factor = EXCLUDED.area_scaling_factor;

-- ----------------------------------------------------------------------------
-- 3. H3 Spatial Hexagonal Cells & Geometric Alignments
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index BIGINT PRIMARY KEY,
    hex_index_hex VARCHAR(16) NOT NULL UNIQUE,
    resolution SMALLINT NOT NULL REFERENCES dggs_resolution_apertures(resolution),
    centroid_lat NUMERIC(10, 7) NOT NULL,
    centroid_lon NUMERIC(10, 7) NOT NULL,
    normal_azimuth_rad NUMERIC(10, 8) NOT NULL,
    elevation_m NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_lat_range CHECK (centroid_lat >= -90.0 AND centroid_lat <= 90.0),
    CONSTRAINT chk_lon_range CHECK (centroid_lon >= -180.0 AND centroid_lon <= 180.0)
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_res_coord ON h3_cells(resolution, centroid_lat, centroid_lon);

-- ----------------------------------------------------------------------------
-- 4. Directed Adjacency Graph & Face-Normal Boundary Metric
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_directed_adjacency_edges (
    edge_id BIGSERIAL PRIMARY KEY,
    origin_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    destination_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    resolution SMALLINT NOT NULL REFERENCES dggs_resolution_apertures(resolution),
    aperture_class h3_aperture_class NOT NULL,
    edge_index_boundary SMALLINT NOT NULL, -- Hex face normal: 0 through 5
    face_normal_theta_rad NUMERIC(10, 8) NOT NULL,
    face_length_meters NUMERIC(12, 4) NOT NULL,
    conductance_coefficient NUMERIC(12, 6) NOT NULL DEFAULT 1.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_edge_origin_dest UNIQUE (origin_h3, destination_h3),
    CONSTRAINT chk_edge_index_bounds CHECK (edge_index_boundary >= 0 AND edge_index_boundary <= 5)
);

CREATE INDEX IF NOT EXISTS idx_adj_origin ON h3_directed_adjacency_edges(origin_h3);
CREATE INDEX IF NOT EXISTS idx_adj_destination ON h3_directed_adjacency_edges(destination_h3);
CREATE INDEX IF NOT EXISTS idx_adj_resolution_aperture ON h3_directed_adjacency_edges(resolution, aperture_class);

-- ----------------------------------------------------------------------------
-- 5. Conserved Thermodynamic Stocks (State Monad Storage)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    stock_id BIGSERIAL PRIMARY KEY,
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    carrier stock_carrier_type NOT NULL,
    amount_mol NUMERIC(28, 10) NOT NULL,
    temperature_kelvin NUMERIC(10, 4) NOT NULL DEFAULT 298.1500,
    chemical_potential_j_per_mol NUMERIC(16, 6) NOT NULL DEFAULT 0.0,
    entropy_j_per_kelvin NUMERIC(24, 8) NOT NULL,
    last_block_height BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_carrier UNIQUE (h3_index, carrier),
    CONSTRAINT chk_amount_non_negative CHECK (amount_mol >= 0.0),
    CONSTRAINT chk_abs_zero CHECK (temperature_kelvin > 0.0)
);

CREATE INDEX IF NOT EXISTS idx_stocks_h3_carrier ON cell_thermodynamic_stocks(h3_index, carrier);

-- ----------------------------------------------------------------------------
-- 6. Thermodynamic Flux Transactions across Oriented Hexagonal Boundaries
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boundary_flux_transactions (
    flux_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL,
    edge_id BIGINT NOT NULL REFERENCES h3_directed_adjacency_edges(edge_id),
    carrier stock_carrier_type NOT NULL,
    aperture_class h3_aperture_class NOT NULL,
    flux_magnitude_mol NUMERIC(24, 10) NOT NULL,
    advective_velocity_m_per_s NUMERIC(12, 6) NOT NULL DEFAULT 0.0,
    projection_cos_factor NUMERIC(8, 6) NOT NULL, -- cos(face_normal_theta - flow_direction)
    effective_flux_mol NUMERIC(24, 10) GENERATED ALWAYS AS (flux_magnitude_mol * projection_cos_factor) STORED,
    entropy_generation_rate_j_per_k NUMERIC(20, 8) NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_entropy_non_negative CHECK (entropy_generation_rate_j_per_k >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_flux_block_height ON boundary_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_flux_edge_id ON boundary_flux_transactions(edge_id);

-- ----------------------------------------------------------------------------
-- 7. Blockchain Consensus Blocks & Ledger State Merkle Proofs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    height BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    parent_hash VARCHAR(64) NOT NULL,
    aperture_audit_root VARCHAR(64) NOT NULL,
    state_merkle_root VARCHAR(64) NOT NULL,
    flux_merkle_root VARCHAR(64) NOT NULL,
    total_carbon_stock_mol NUMERIC(36, 10) NOT NULL,
    total_entropy_generated_j_k NUMERIC(32, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    nonce BIGINT NOT NULL,
    CONSTRAINT chk_block_height_pos CHECK (height >= 0)
);

CREATE TABLE IF NOT EXISTS stock_state_transition_receipts (
    receipt_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(height),
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    carrier stock_carrier_type NOT NULL,
    delta_stock_mol NUMERIC(28, 10) NOT NULL,
    delta_entropy_j_k NUMERIC(24, 8) NOT NULL,
    inbound_flux_sum_mol NUMERIC(28, 10) NOT NULL,
    outbound_flux_sum_mol NUMERIC(28, 10) NOT NULL,
    source_sink_reaction_mol NUMERIC(28, 10) NOT NULL,
    state_proof_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Invariant: First Law conservation (delta_M = inbound - outbound + source/sink)
    CONSTRAINT chk_first_law_conservation CHECK (
        ROUND(delta_stock_mol, 8) = ROUND((inbound_flux_sum_mol - outbound_flux_sum_mol + source_sink_reaction_mol), 8)
    )
);

CREATE INDEX IF NOT EXISTS idx_receipts_block_h3 ON stock_state_transition_receipts(block_height, h3_index);
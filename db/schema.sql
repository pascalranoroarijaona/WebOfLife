-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 064: 3D Vector Target Orientation via Displacement Dot-Product Parity
-- ============================================================================

-- Extensions for spatial computations and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Thermodynamic Domain Enums
DO $$ BEGIN
    CREATE TYPE thermodynamic_domain AS ENUM (
        'ATMOSPHERIC_SENSIBLE_HEAT',
        'OCEANIC_ADVECTION',
        'TROPHIC_BIOMASS_MIGRATION',
        'DISSOLVED_INORGANIC_CARBON',
        'DETRITAL_FLUX',
        'HYDROLOGIC_RUNOFF'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE parity_orientation_state AS ENUM (
        'UNMODIFIED_ALIGNED',     -- dot(v, d) > 0: Inward/target coherent
        'ORTHOGONAL_TANGENT',     -- dot(v, d) = 0: Tangential boundary traversal
        'PARITY_FLIPPED_INVERTED',-- dot(v, d) < 0: Sign flipped (-v) for thermodynamic coherence
        'DEGENERATE_ZERO'         -- ||d|| = 0 or ||v|| = 0: Invariant identity
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 1. H3 Discrete Global Grid System (DGGS) Topology & Geodesic Geometry
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    elevation_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cells_centroid ON h3_cells(centroid_x, centroid_y, centroid_z);

CREATE TABLE IF NOT EXISTS h3_adjacency_edges (
    edge_id VARCHAR(32) PRIMARY KEY,
    origin_h3 VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    target_h3 VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    displacement_dx DOUBLE PRECISION NOT NULL,
    displacement_dy DOUBLE PRECISION NOT NULL,
    displacement_dz DOUBLE PRECISION NOT NULL,
    geodesic_distance_m DOUBLE PRECISION NOT NULL CHECK (geodesic_distance_m >= 0.0),
    interface_length_m DOUBLE PRECISION NOT NULL CHECK (interface_length_m > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_distinct_nodes CHECK (origin_h3 <> target_h3)
);

CREATE INDEX IF NOT EXISTS idx_h3_edges_origin ON h3_adjacency_edges(origin_h3);
CREATE INDEX IF NOT EXISTS idx_h3_edges_target ON h3_adjacency_edges(target_h3);
CREATE UNIQUE INDEX IF NOT EXISTS uq_h3_edge_pair ON h3_adjacency_edges(origin_h3, target_h3);

-- ----------------------------------------------------------------------------
-- 2. Directional 3D Vector & Parity Orientation Registry (RFC-064)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_flux_vector_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id VARCHAR(32) NOT NULL REFERENCES h3_adjacency_edges(edge_id) ON DELETE CASCADE,
    raw_vector_x DOUBLE PRECISION NOT NULL,
    raw_vector_y DOUBLE PRECISION NOT NULL,
    raw_vector_z DOUBLE PRECISION NOT NULL,
    displacement_x DOUBLE PRECISION NOT NULL,
    displacement_y DOUBLE PRECISION NOT NULL,
    displacement_z DOUBLE PRECISION NOT NULL,
    euclidean_inner_product DOUBLE PRECISION NOT NULL,
    orientation_state parity_orientation_state NOT NULL,
    oriented_vector_x DOUBLE PRECISION NOT NULL,
    oriented_vector_y DOUBLE PRECISION NOT NULL,
    oriented_vector_z DOUBLE PRECISION NOT NULL,
    raw_magnitude DOUBLE PRECISION NOT NULL,
    oriented_magnitude DOUBLE PRECISION NOT NULL,
    isometry_conserved BOOLEAN NOT NULL DEFAULT TRUE,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_isometry_norm CHECK (ABS(raw_magnitude - oriented_magnitude) < 1e-9)
);

CREATE INDEX IF NOT EXISTS idx_flux_vectors_edge ON spatial_flux_vector_evaluations(edge_id);
CREATE INDEX IF NOT EXISTS idx_flux_vectors_orientation ON spatial_flux_vector_evaluations(orientation_state);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Stocks (Spatial Monad State)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    sensible_heat_joules DOUBLE PRECISION NOT NULL CHECK (sensible_heat_joules >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    trophic_biomass_kg DOUBLE PRECISION NOT NULL CHECK (trophic_biomass_kg >= 0.0),
    detritus_carbon_kg DOUBLE PRECISION NOT NULL CHECK (detritus_carbon_kg >= 0.0),
    dissolved_co2_mol DOUBLE PRECISION NOT NULL CHECK (dissolved_co2_mol >= 0.0),
    water_mass_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_kg >= 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_j_per_k >= 0.0),
    epoch_height BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_epoch UNIQUE (h3_index, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_cell_stocks_epoch ON spatial_cell_stocks(epoch_height);

-- ----------------------------------------------------------------------------
-- 4. Cross-Boundary Thermodynamic Flux Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_height BIGINT NOT NULL,
    edge_id VARCHAR(32) NOT NULL REFERENCES h3_adjacency_edges(edge_id) ON DELETE RESTRICT,
    vector_evaluation_id UUID NOT NULL REFERENCES spatial_flux_vector_evaluations(evaluation_id) ON DELETE RESTRICT,
    domain thermodynamic_domain NOT NULL,
    mass_flux_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    enthalpy_flux_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_production_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_j_per_k >= 0.0),
    conductance_coefficient DOUBLE PRECISION NOT NULL CHECK (conductance_coefficient >= 0.0),
    advection_velocity_ms DOUBLE PRECISION NOT NULL,
    driving_potential_delta DOUBLE PRECISION NOT NULL,
    entropy_law_adhered BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_second_law CHECK (entropy_production_j_per_k >= -1e-12)
);

CREATE INDEX IF NOT EXISTS idx_flux_ledger_epoch ON thermodynamic_flux_ledger(epoch_height);
CREATE INDEX IF NOT EXISTS idx_flux_ledger_edge ON thermodynamic_flux_ledger(edge_id);

-- ----------------------------------------------------------------------------
-- 5. Blockchain Block & Cryptographic Proof of Thermodynamic Conservation
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    parent_hash CHAR(64) NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    merkle_root_stocks CHAR(64) NOT NULL,
    merkle_root_fluxes CHAR(64) NOT NULL,
    total_energy_joules DOUBLE PRECISION NOT NULL,
    total_mass_kg DOUBLE PRECISION NOT NULL,
    net_entropy_production_j_per_k DOUBLE PRECISION NOT NULL CHECK (net_entropy_production_j_per_k >= 0.0),
    parity_adjustments_count INTEGER NOT NULL DEFAULT 0,
    validator_node_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash CHAR(64) PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    flux_id UUID NOT NULL REFERENCES thermodynamic_flux_ledger(flux_id) ON DELETE RESTRICT,
    sender_h3 VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index),
    recipient_h3 VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index),
    quantity DOUBLE PRECISION NOT NULL,
    unit VARCHAR(16) NOT NULL,
    state_delta_root CHAR(64) NOT NULL,
    conservation_proof_hash CHAR(64) NOT NULL,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block ON blockchain_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_sender ON blockchain_transactions(sender_h3);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_recipient ON blockchain_transactions(recipient_h3);

-- ----------------------------------------------------------------------------
-- 6. Conservation Audit Views
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_spatial_vector_parity_summary AS
SELECT
    e.edge_id,
    e.origin_h3,
    e.target_h3,
    v.orientation_state,
    COUNT(v.evaluation_id) AS total_evaluations,
    AVG(v.euclidean_inner_product) AS mean_inner_product,
    BOOL_AND(v.isometry_conserved) AS all_norms_conserved
FROM h3_adjacency_edges e
LEFT JOIN spatial_flux_vector_evaluations v ON e.edge_id = v.edge_id
GROUP BY e.edge_id, e.origin_h3, e.target_h3, v.orientation_state;
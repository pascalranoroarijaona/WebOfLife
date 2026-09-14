-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 048: Geometric Interface Contact & Lateral Thermodynamic Fluxes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. Discrete Global Grid: H3 Spatial Topography & Cell Metadata
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index            VARCHAR(16) PRIMARY KEY,
    resolution          SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon         BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat        DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon        DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    centroid_geom       GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
                            ST_SetSRID(ST_MakePoint(centroid_lon, centroid_lat), 4326)
                        ) STORED,
    cell_area_m2        DOUBLE PRECISION NOT NULL CHECK (cell_area_m2 > 0.0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_resolution ON spatial_h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_geom ON spatial_h3_cells USING GIST(centroid_geom);

-- ----------------------------------------------------------------------------
-- 2. Geometric Interface Contact Edges (RFC-048)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_shared_boundaries (
    boundary_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_h3               VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE RESTRICT,
    neighbor_h3             VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE RESTRICT,
    is_adjacent             BOOLEAN NOT NULL DEFAULT TRUE,
    vertex_a_lat            DOUBLE PRECISION NOT NULL CHECK (vertex_a_lat BETWEEN -90.0 AND 90.0),
    vertex_a_lon            DOUBLE PRECISION NOT NULL CHECK (vertex_a_lon BETWEEN -180.0 AND 180.0),
    vertex_b_lat            DOUBLE PRECISION NOT NULL CHECK (vertex_b_lat BETWEEN -90.0 AND 90.0),
    vertex_b_lon            DOUBLE PRECISION NOT NULL CHECK (vertex_b_lon BETWEEN -180.0 AND 180.0),
    vertex_a_geom           GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
                                ST_SetSRID(ST_MakePoint(vertex_a_lon, vertex_a_lat), 4326)
                            ) STORED,
    vertex_b_geom           GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
                                ST_SetSRID(ST_MakePoint(vertex_b_lon, vertex_b_lat), 4326)
                            ) STORED,
    shared_boundary_geom    GEOMETRY(LineString, 4326) GENERATED ALWAYS AS (
                                ST_MakeLine(
                                    ST_SetSRID(ST_MakePoint(vertex_a_lon, vertex_a_lat), 4326),
                                    ST_SetSRID(ST_MakePoint(vertex_b_lon, vertex_b_lat), 4326)
                                )
                            ) STORED,
    shared_length_meters    DOUBLE PRECISION NOT NULL CHECK (shared_length_meters >= 0.0),
    geodesic_distance_m     DOUBLE PRECISION NOT NULL CHECK (geodesic_distance_m > 0.0),
    symmetric_pair_hash     BYTEA GENERATED ALWAYS AS (
                                digest(
                                    LEAST(origin_h3, neighbor_h3) || ':' || GREATEST(origin_h3, neighbor_h3),
                                    'sha256'
                                )
                            ) STORED,
    computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_non_self_adjacency CHECK (origin_h3 <> neighbor_h3),
    CONSTRAINT uq_origin_neighbor_pair UNIQUE (origin_h3, neighbor_h3)
);

CREATE INDEX IF NOT EXISTS idx_h3_shared_boundaries_origin ON spatial_h3_shared_boundaries(origin_h3);
CREATE INDEX IF NOT EXISTS idx_h3_shared_boundaries_neighbor ON spatial_h3_shared_boundaries(neighbor_h3);
CREATE INDEX IF NOT EXISTS idx_h3_shared_boundaries_pair_hash ON spatial_h3_shared_boundaries(symmetric_pair_hash);
CREATE INDEX IF NOT EXISTS idx_h3_shared_boundaries_geom ON spatial_h3_shared_boundaries USING GIST(shared_boundary_geom);

-- ----------------------------------------------------------------------------
-- 3. Lateral Thermodynamic Transport Conductance & Flux Time-Series
-- ----------------------------------------------------------------------------

CREATE TYPE transport_flux_type AS ENUM (
    'THERMAL_FOURIER',
    'FICKIAN_GEOCHEMICAL',
    'BAROCLINIC_MOISTURE',
    'MASS_ADVECTION',
    'ECOLOGICAL_MIGRATION'
);

CREATE TABLE IF NOT EXISTS lateral_transport_conductance (
    conductance_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_id             UUID NOT NULL REFERENCES spatial_h3_shared_boundaries(boundary_id) ON DELETE CASCADE,
    flux_type               transport_flux_type NOT NULL,
    conductivity_tensor     DOUBLE PRECISION NOT NULL CHECK (conductivity_tensor >= 0.0),
    effective_conductance   DOUBLE PRECISION NOT NULL CHECK (effective_conductance >= 0.0), -- C_ij = sigma_ij * L_ij / D_ij
    calibrated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_boundary_flux_type UNIQUE (boundary_id, flux_type)
);

CREATE TABLE IF NOT EXISTS lateral_thermodynamic_fluxes (
    flux_id                 UUID DEFAULT uuid_generate_v4(),
    block_height            BIGINT NOT NULL,
    timestamp               TIMESTAMPTZ NOT NULL,
    origin_h3               VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    neighbor_h3             VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    flux_type               transport_flux_type NOT NULL,
    potential_origin        DOUBLE PRECISION NOT NULL, -- Psi_i (e.g. Temperature T_i, Concentration C_i, Pressure P_i)
    potential_neighbor      DOUBLE PRECISION NOT NULL, -- Psi_j
    extensive_flux_value    DOUBLE PRECISION NOT NULL, -- Phi_{i->j} = -C_ij * (Psi_j - Psi_i)
    extensive_flux_unit     VARCHAR(16) NOT NULL,      -- 'W', 'kg/s', 'mol/s', etc.
    entropy_production_rate DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate >= -1e-12), -- S_prod >= 0
    PRIMARY KEY (block_height, flux_id, timestamp),
    CONSTRAINT chk_flux_non_self CHECK (origin_h3 <> neighbor_h3)
);

-- Indexing for rapid physical gradient and lateral transport audits
CREATE INDEX IF NOT EXISTS idx_lateral_fluxes_origin_time ON lateral_thermodynamic_fluxes(origin_h3, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lateral_fluxes_block_height ON lateral_thermodynamic_fluxes(block_height);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Ledger: Conservation & Entropy Verification
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height            BIGINT PRIMARY KEY,
    block_hash              BYTEA NOT NULL UNIQUE,
    parent_hash             BYTEA NOT NULL,
    state_merkle_root       BYTEA NOT NULL,
    flux_merkle_root        BYTEA NOT NULL,
    global_internal_energy  DOUBLE PRECISION NOT NULL, -- Total internal energy U (Joules)
    global_entropy          DOUBLE PRECISION NOT NULL, -- Total entropy S (J/K)
    entropy_delta           DOUBLE PRECISION NOT NULL CHECK (entropy_delta >= -1e-12), -- Second Law: dS >= 0
    net_flux_residual       DOUBLE PRECISION NOT NULL, -- First Law verification: sum(Phi_ij) == 0 within machine epsilon
    is_conservative         BOOLEAN GENERATED ALWAYS AS (ABS(net_flux_residual) < 1e-9) STORED,
    timestamp               TIMESTAMPTZ NOT NULL,
    validator_node_id       TEXT NOT NULL,
    signature               BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS thermodynamic_block_transactions (
    tx_id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height            BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    tx_index                INTEGER NOT NULL,
    origin_h3               VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    neighbor_h3             VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    boundary_length_meters  DOUBLE PRECISION NOT NULL CHECK (boundary_length_meters >= 0.0),
    transferred_mass_kg     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    transferred_energy_j    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_generated_j_k   DOUBLE PRECISION NOT NULL CHECK (entropy_generated_j_k >= -1e-12),
    tx_hash                 BYTEA NOT NULL UNIQUE,
    CONSTRAINT uq_block_tx_index UNIQUE (block_height, tx_index)
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_origin_neighbor ON thermodynamic_block_transactions(origin_h3, neighbor_h3);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_block_height ON thermodynamic_block_transactions(block_height);

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Anti-Symmetry & Conservation Audit Views
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_lateral_flux_antisymmetry_audit AS
SELECT 
    f1.block_height,
    f1.flux_type,
    f1.origin_h3,
    f1.neighbor_h3,
    f1.extensive_flux_value AS flux_forward,
    f2.extensive_flux_value AS flux_reverse,
    (f1.extensive_flux_value + f2.extensive_flux_value) AS net_antisymmetry_error
FROM lateral_thermodynamic_fluxes f1
JOIN lateral_thermodynamic_fluxes f2
    ON  f1.block_height = f2.block_height
    AND f1.flux_type    = f2.flux_type
    AND f1.origin_h3    = f2.neighbor_h3
    AND f1.neighbor_h3  = f2.origin_h3;
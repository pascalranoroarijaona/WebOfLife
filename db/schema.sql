-- Web of Life Thermodynamic Blockchain Ledger & Spatial Topology Schema
-- Sprint 057: Forward Geodesic Azimuth Vectorization & Directional Advective Transport

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ---------------------------------------------------------------------
-- Enumerations & Domain Constraints
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE thermodynamic_stock_type AS ENUM (
        'MASS_CARBON_KG',
        'SENSIBLE_HEAT_JOULES',
        'LIQUID_WATER_KG',
        'TROPHIC_BIOMASS_KG',
        'ENTROPY_J_K'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE advection_medium_type AS ENUM (
        'ATMOSPHERIC_BOUNDARY_LAYER',
        'OCEANIC_SURFACE_CURRENT',
        'RIVERINE_DRAINAGE',
        'ANIMAL_MIGRATORY_VECTOR',
        'AEROSOL_SPORE_PLUME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE geodesic_boundary_condition AS ENUM (
        'STANDARD_GEODESIC',
        'ANTIPODAL_SINGULARITY',
        'NORTH_POLE_ORIGIN',
        'SOUTH_POLE_ORIGIN',
        'ANTIMERIDIAN_CROSSING',
        'COINCIDENT_ZERO_DISPLACEMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------
-- Table: h3_hex_cells
-- Description: Spatial partition nodes representing hexagonal cells in H3.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_hex_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    centroid_geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)
    ) STORED,
    surface_area_sq_meters DOUBLE PRECISION NOT NULL CHECK (surface_area_sq_meters > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_hex_cells_geom ON h3_hex_cells USING GIST (centroid_geom);

-- ---------------------------------------------------------------------
-- Table: h3_geodesic_edges
-- Description: Great-circle directed arcs linking adjacent H3 cells with 
-- forward initial azimuth and local tangent plane normal projections.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_geodesic_edges (
    edge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_h3 BIGINT NOT NULL REFERENCES h3_hex_cells(h3_index) ON DELETE RESTRICT,
    dest_h3 BIGINT NOT NULL REFERENCES h3_hex_cells(h3_index) ON DELETE RESTRICT,
    boundary_length_meters DOUBLE PRECISION NOT NULL CHECK (boundary_length_meters >= 0.0),
    great_circle_distance_meters DOUBLE PRECISION NOT NULL CHECK (great_circle_distance_meters >= 0.0),
    initial_azimuth_rad DOUBLE PRECISION NOT NULL CHECK (initial_azimuth_rad >= 0.0 AND initial_azimuth_rad < 2.0 * PI()),
    initial_azimuth_deg DOUBLE PRECISION NOT NULL CHECK (initial_azimuth_deg >= 0.0 AND initial_azimuth_deg < 360.0),
    unit_u_east DOUBLE PRECISION NOT NULL CHECK (unit_u_east BETWEEN -1.0 AND 1.0),
    unit_v_north DOUBLE PRECISION NOT NULL CHECK (unit_v_north BETWEEN -1.0 AND 1.0),
    boundary_state geodesic_boundary_condition NOT NULL DEFAULT 'STANDARD_GEODESIC',
    is_adjacent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_origin_dest_edge UNIQUE (origin_h3, dest_h3),
    CONSTRAINT chk_unit_vector_norm CHECK (
        ABS((unit_u_east * unit_u_east + unit_v_north * unit_v_north) - 1.0) < 1e-6 
        OR (unit_u_east = 0.0 AND unit_v_north = 0.0)
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_geodesic_edges_origin ON h3_geodesic_edges(origin_h3);
CREATE INDEX IF NOT EXISTS idx_h3_geodesic_edges_dest ON h3_geodesic_edges(dest_h3);

-- ---------------------------------------------------------------------
-- Table: cell_thermodynamic_stocks
-- Description: State of conserved thermodynamic stocks residing in each cell.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES h3_hex_cells(h3_index) ON DELETE RESTRICT,
    stock_type thermodynamic_stock_type NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    entropy_j_k DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    epoch_height BIGINT NOT NULL,
    CONSTRAINT uq_cell_stock_type UNIQUE (h3_index, stock_type, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_cell_thermo_stocks_lookup ON cell_thermodynamic_stocks(h3_index, epoch_height);

-- ---------------------------------------------------------------------
-- Table: directional_advection_fluxes
-- Description: Directed advective fluxes computed along geodesic edges.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS directional_advection_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id UUID NOT NULL REFERENCES h3_geodesic_edges(edge_id) ON DELETE RESTRICT,
    epoch_height BIGINT NOT NULL,
    medium_type advection_medium_type NOT NULL,
    stock_type thermodynamic_stock_type NOT NULL,
    velocity_u_east DOUBLE PRECISION NOT NULL,
    velocity_v_north DOUBLE PRECISION NOT NULL,
    projected_normal_speed DOUBLE PRECISION NOT NULL,
    routing_coefficient DOUBLE PRECISION NOT NULL CHECK (routing_coefficient BETWEEN 0.0 AND 1.0),
    transferred_mass_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (transferred_mass_kg >= 0.0),
    sensible_heat_flux_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (sensible_heat_flux_joules >= 0.0),
    entropy_production_j_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_j_k >= 0.0),
    delta_t_seconds DOUBLE PRECISION NOT NULL CHECK (delta_t_seconds > 0.0),
    flux_merkle_leaf BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directional_advection_edge ON directional_advection_fluxes(edge_id, epoch_height);

-- ---------------------------------------------------------------------
-- Table: thermodynamic_blockchain_blocks
-- Description: Consensus ledger blocks anchoring spatial transport states.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    state_root_hash BYTEA NOT NULL,
    advection_merkle_root BYTEA NOT NULL,
    total_conserved_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_conserved_mass_kg >= 0.0),
    total_sensible_heat_joules DOUBLE PRECISION NOT NULL CHECK (total_sensible_heat_joules >= 0.0),
    system_total_entropy_j_k DOUBLE PRECISION NOT NULL,
    entropy_delta_j_k DOUBLE PRECISION NOT NULL CHECK (entropy_delta_j_k >= -1e-12), -- Second Law: dS >= 0
    first_law_epsilon_residual DOUBLE PRECISION NOT NULL CHECK (ABS(first_law_epsilon_residual) < 1e-9), -- Conservation
    validator_node_id UUID NOT NULL,
    signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- Table: geodesic_advection_transactions
-- Description: Auditable balance-transfers of conserved thermodynamic mass/heat
-- signed cryptographically by peer validators.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geodesic_advection_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash BYTEA NOT NULL UNIQUE,
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blockchain_blocks(block_height) ON DELETE CASCADE,
    origin_h3 BIGINT NOT NULL REFERENCES h3_hex_cells(h3_index),
    dest_h3 BIGINT NOT NULL REFERENCES h3_hex_cells(h3_index),
    geodesic_azimuth_deg DOUBLE PRECISION NOT NULL,
    geodesic_distance_m DOUBLE PRECISION NOT NULL,
    stock_type thermodynamic_stock_type NOT NULL,
    stock_amount DOUBLE PRECISION NOT NULL CHECK (stock_amount >= 0.0),
    temperature_origin_k DOUBLE PRECISION NOT NULL,
    temperature_dest_k DOUBLE PRECISION NOT NULL,
    entropy_generated_j_k DOUBLE PRECISION NOT NULL CHECK (entropy_generated_j_k >= 0.0),
    nonce BIGINT NOT NULL,
    witness_signature BYTEA NOT NULL,
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geodesic_tx_block ON geodesic_advection_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_geodesic_tx_endpoints ON geodesic_advection_transactions(origin_h3, dest_h3);

-- ---------------------------------------------------------------------
-- Table: geodesic_calculation_audit_logs
-- Description: Guardrail checks, boundary logs, and singularity audits.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS geodesic_calculation_audit_logs (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    computed_bearing_rad DOUBLE PRECISION NOT NULL,
    computed_bearing_deg DOUBLE PRECISION NOT NULL,
    computed_distance_m DOUBLE PRECISION NOT NULL,
    boundary_state geodesic_boundary_condition NOT NULL,
    clamped_trig_argument DOUBLE PRECISION NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
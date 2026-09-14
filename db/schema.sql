-- Web of Life: Relational & Time-Series Thermodynamic Ledger Schema
-- Sprint 037: Canonical 15-Character Hexadecimal H3 Index Specification & Validation Pattern

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ---------------------------------------------------------------------
-- DOMAIN DEFINITION: Canonical H3 Spatial Index (RFC-037)
-- Strictly enforced 15-character hexadecimal index (case-insensitive in input, normalized to lowercase)
-- ---------------------------------------------------------------------
CREATE DOMAIN canonical_h3_index AS VARCHAR(15)
  CHECK (VALUE ~* '^[0-9a-f]{15}$');

COMMENT ON DOMAIN canonical_h3_index IS 'RFC-037: 15-character hexadecimal canonical H3 spatial index bitfield string';

-- ---------------------------------------------------------------------
-- SPATIAL MESH & CELL CONTROL VOLUMES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_cells (
    h3_index canonical_h3_index PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell SMALLINT NOT NULL CHECK (base_cell BETWEEN 0 AND 121),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    cell_area_m2 DOUBLE PRECISION NOT NULL CHECK (cell_area_m2 > 0),
    boundary_perimeter_m DOUBLE PRECISION NOT NULL CHECK (boundary_perimeter_m > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_cells_resolution ON spatial_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_cells_base_cell ON spatial_cells(base_cell);

-- ---------------------------------------------------------------------
-- CELL ADJACENCY TOPOLOGY
-- Bidirectional connectivity graph for finite volume boundary fluxes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_adjacency_edges (
    source_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    target_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    shared_boundary_length_m DOUBLE PRECISION NOT NULL CHECK (shared_boundary_length_m > 0),
    advection_normal_azimuth DOUBLE PRECISION NOT NULL CHECK (advection_normal_azimuth >= 0 AND advection_normal_azimuth < 360.0),
    is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (source_h3, target_h3),
    CONSTRAINT chk_no_self_adjacency CHECK (source_h3 <> target_h3)
);

CREATE INDEX IF NOT EXISTS idx_spatial_adj_target ON spatial_adjacency_edges(target_h3);

-- ---------------------------------------------------------------------
-- THERMODYNAMIC STOCK STATE (EarthPod State Vector)
-- Conserved thermodynamic stocks: Mass (water, carbon) and Internal Energy
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    h3_index canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL,
    epoch_height BIGINT NOT NULL CHECK (epoch_height >= 0),
    -- Water mass stocks in kg (First Law: conserved)
    water_mass_continental_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_continental_kg >= 0.0),
    water_mass_oceanic_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_oceanic_kg >= 0.0),
    water_mass_vapor_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_vapor_kg >= 0.0),
    -- Carbon mass stocks in kg (Conserved biogeochemical elemental mass)
    carbon_mass_biomass_kg DOUBLE PRECISION NOT NULL CHECK (carbon_mass_biomass_kg >= 0.0),
    carbon_mass_detritus_kg DOUBLE PRECISION NOT NULL CHECK (carbon_mass_detritus_kg >= 0.0),
    carbon_mass_soil_organic_kg DOUBLE PRECISION NOT NULL CHECK (carbon_mass_soil_organic_kg >= 0.0),
    carbon_mass_atmospheric_co2_kg DOUBLE PRECISION NOT NULL CHECK (carbon_mass_atmospheric_co2_kg >= 0.0),
    -- Energy & Entropy stocks
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0.0),
    mean_temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (mean_temperature_kelvin > 0.0),
    entropy_production_rate_w_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate_w_k >= 0.0), -- Second Law: \dot{S}_{gen} >= 0
    solar_insolation_watts_m2 DOUBLE PRECISION NOT NULL CHECK (solar_insolation_watts_m2 >= 0.0),
    state_vector_hash BYTEA NOT NULL,
    PRIMARY KEY (h3_index, timestamp)
);

-- Register as hypertable for time-series scalability
SELECT create_hypertable('thermodynamic_cell_stocks', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_cell_stocks_epoch ON thermodynamic_cell_stocks(epoch_height);

-- ---------------------------------------------------------------------
-- BOUNDARY ADVECTIVE & DIFFUSIVE MASS-ENERGY FLUXES
-- Finite-volume exchanges between adjacent canonical H3 cells
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3 canonical_h3_index NOT NULL,
    target_h3 canonical_h3_index NOT NULL,
    epoch_height BIGINT NOT NULL CHECK (epoch_height >= 0),
    timestamp TIMESTAMPTZ NOT NULL,
    water_mass_flux_kg_s DOUBLE PRECISION NOT NULL,
    carbon_mass_flux_kg_s DOUBLE PRECISION NOT NULL,
    thermal_energy_flux_watts DOUBLE PRECISION NOT NULL,
    entropy_generation_flux_w_k DOUBLE PRECISION NOT NULL CHECK (entropy_generation_flux_w_k >= 0.0),
    flux_signature BYTEA NOT NULL,
    CONSTRAINT fk_boundary_edge FOREIGN KEY (source_h3, target_h3) 
        REFERENCES spatial_adjacency_edges(source_h3, target_h3) ON DELETE RESTRICT,
    CONSTRAINT chk_flux_distinct_nodes CHECK (source_h3 <> target_h3)
);

SELECT create_hypertable('boundary_flux_transactions', 'timestamp', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_epoch ON boundary_flux_transactions(epoch_height);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_source ON boundary_flux_transactions(source_h3, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_target ON boundary_flux_transactions(target_h3, timestamp DESC);

-- ---------------------------------------------------------------------
-- THERMODYNAMIC BLOCKCHAIN LEDGER: BLOCKS & PROOFS
-- Enforces Mass Balance (\Delta M = 0) and Entropy Invariants across epochs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    spatial_merkle_root BYTEA NOT NULL,
    state_entropy_merkle_root BYTEA NOT NULL,
    total_water_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_water_mass_kg >= 0.0),
    total_carbon_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_carbon_mass_kg >= 0.0),
    total_internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (total_internal_energy_joules >= 0.0),
    total_entropy_generated_j_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_generated_j_k >= 0.0),
    mass_conservation_residual DOUBLE PRECISION NOT NULL CHECK (ABS(mass_conservation_residual) < 1e-6),
    validator_node_address VARCHAR(42) NOT NULL,
    prover_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_blocks_timestamp ON ledger_blocks(epoch_timestamp DESC);

-- ---------------------------------------------------------------------
-- SPATIAL MONAD TRANSACTION LOG
-- Audit ledger connecting discrete TypeScript SpatialMonad operations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_monad_mutations (
    mutation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES ledger_blocks(block_height) ON DELETE RESTRICT,
    h3_index canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    monad_bind_depth INTEGER NOT NULL CHECK (monad_bind_depth >= 0),
    operator_name VARCHAR(64) NOT NULL,
    initial_state_hash BYTEA NOT NULL,
    resulting_state_hash BYTEA NOT NULL,
    delta_water_mass_kg DOUBLE PRECISION NOT NULL,
    delta_carbon_mass_kg DOUBLE PRECISION NOT NULL,
    delta_energy_joules DOUBLE PRECISION NOT NULL,
    delta_entropy_j_k DOUBLE PRECISION NOT NULL CHECK (delta_entropy_j_k >= -1e-9),
    execution_time_us INTEGER NOT NULL CHECK (execution_time_us >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monad_mutations_block ON spatial_monad_mutations(block_height);
CREATE INDEX IF NOT EXISTS idx_monad_mutations_cell ON spatial_monad_mutations(h3_index);
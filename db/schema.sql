-- ============================================================================
-- Web of Life: Planetary Thermodynamic Ledger & Spatial Mesh Schema
-- Sprint 046: Geodesic Haversine Distance Metric & Spatial Adjacency Tensors
-- ============================================================================

-- Planetary constants & thermodynamic configuration
CREATE TABLE IF NOT EXISTS planetary_parameters (
    parameter_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    value NUMERIC(28, 10) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO planetary_parameters (parameter_id, name, value, unit, description)
VALUES 
    ('EARTH_RADIUS_METERS', 'Mean Earth Volumetric Radius', 6371007.0, 'meters', 'Planetary geoid baseline for great-circle haversine metric evaluation'),
    ('STEFAN_BOLTZMANN', 'Stefan-Boltzmann Constant', 0.00000005670374419, 'W/(m^2*K^4)', 'Radiative boundary Stefan-Boltzmann constant'),
    ('BOLTZMANN_CONSTANT', 'Boltzmann Constant', 0.00000000000000000000001380649, 'J/K', 'Microscopic thermodynamic entropy baseline')
ON CONFLICT (parameter_id) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Discrete H3 Hexagonal Manifold Cells
CREATE TABLE IF NOT EXISTS h3_cells (
    cell_index VARCHAR(15) PRIMARY KEY, -- 64-bit hexadecimal H3 index
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat NUMERIC(10, 7) NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng NUMERIC(11, 7) NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    surface_area_m2 NUMERIC(24, 6) NOT NULL CHECK (surface_area_m2 > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cells_coords ON h3_cells(centroid_lat, centroid_lng);

-- Geodesic Spatial Adjacency & Metric Conductance Matrix
-- Tracks edge relationships and cached great-circle Haversine distances (d_ij)
CREATE TABLE IF NOT EXISTS h3_cell_adjacencies (
    cell_index_a VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    cell_index_b VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    geodesic_distance_meters NUMERIC(18, 6) NOT NULL CHECK (geodesic_distance_meters >= 0.0),
    boundary_length_meters NUMERIC(18, 6) NOT NULL CHECK (boundary_length_meters > 0.0),
    topological_order SMALLINT NOT NULL DEFAULT 1 CHECK (topological_order >= 1),
    is_direct_neighbor BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cell_index_a, cell_index_b),
    CONSTRAINT chk_canonical_pair_ordering CHECK (cell_index_a < cell_index_b)
);

CREATE INDEX IF NOT EXISTS idx_h3_adjacencies_a ON h3_cell_adjacencies(cell_index_a);
CREATE INDEX IF NOT EXISTS idx_h3_adjacencies_b ON h3_cell_adjacencies(cell_index_b);
CREATE INDEX IF NOT EXISTS idx_h3_adjacencies_dist ON h3_cell_adjacencies(geodesic_distance_meters);

-- Thermodynamic State Snapshot per Cell (Time-Series Monad Stock State)
CREATE TABLE IF NOT EXISTS cell_thermodynamic_states (
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    block_height BIGINT NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    internal_energy_joules NUMERIC(36, 6) NOT NULL CHECK (internal_energy_joules >= 0.0),
    entropy_joules_per_kelvin NUMERIC(36, 6) NOT NULL CHECK (entropy_joules_per_kelvin >= 0.0),
    temperature_kelvin NUMERIC(12, 6) NOT NULL CHECK (temperature_kelvin > 0.0),
    sensible_heat_stock_joules NUMERIC(36, 6) NOT NULL,
    latent_heat_stock_joules NUMERIC(36, 6) NOT NULL,
    biomass_carbon_stock_kg NUMERIC(28, 6) NOT NULL CHECK (biomass_carbon_stock_kg >= 0.0),
    atmospheric_moisture_kg NUMERIC(28, 6) NOT NULL CHECK (atmospheric_moisture_kg >= 0.0),
    chemical_potential_j_per_mol NUMERIC(20, 6) NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    PRIMARY KEY (cell_index, block_height)
);

CREATE INDEX IF NOT EXISTS idx_cell_thermo_epoch ON cell_thermodynamic_states(epoch_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cell_thermo_block ON cell_thermodynamic_states(block_height);

-- Inter-Cell Thermodynamic Spatial Transport Flux Ledger
-- Records non-equilibrium mass, heat, and entropy fluxes governed by geodesic distance
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    cell_source VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    cell_target VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    flux_carrier_type VARCHAR(64) NOT NULL, -- 'SENSIBLE_HEAT', 'VAPOR_DIFFUSION', 'TROPHIC_BIOMASS', 'OCEANIC_CARBON'
    geodesic_distance_meters NUMERIC(18, 6) NOT NULL CHECK (geodesic_distance_meters > 0.0),
    potential_gradient NUMERIC(24, 10) NOT NULL, -- Delta Phi (T_j - T_i, C_j - C_i)
    effective_conductance NUMERIC(24, 10) NOT NULL CHECK (effective_conductance >= 0.0), -- Gamma_ij = kappa * A_ij / d_ij
    net_flux_amount NUMERIC(32, 10) NOT NULL, -- J_ij = -Gamma_ij * Delta Phi
    entropy_production_joules_per_k NUMERIC(28, 10) NOT NULL CHECK (entropy_production_joules_per_k >= 0.0), -- sigma_s >= 0 (2nd Law)
    source_energy_delta_joules NUMERIC(36, 6) NOT NULL,
    target_energy_delta_joules NUMERIC(36, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tx_signature BYTEA NOT NULL,
    CONSTRAINT chk_flux_energy_conservation CHECK (source_energy_delta_joules + target_energy_delta_joules = 0.0) -- 1st Law Invariance
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_block ON spatial_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_cells ON spatial_flux_transactions(cell_source, cell_target);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_type ON spatial_flux_transactions(flux_carrier_type);

-- Thermodynamic Blockchain Canonical Blocks
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    flux_merkle_root BYTEA NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    total_entropy_production_j_per_k NUMERIC(32, 10) NOT NULL CHECK (total_entropy_production_j_per_k >= 0.0),
    net_energy_variance_joules NUMERIC(20, 10) NOT NULL DEFAULT 0.0 CHECK (net_energy_variance_joules = 0.0),
    transaction_count INTEGER NOT NULL CHECK (transaction_count >= 0),
    validator_node_id VARCHAR(128) NOT NULL,
    block_signature BYTEA NOT NULL,
    mined_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_thermo_blocks_time ON thermodynamic_blocks(mined_timestamp DESC);

-- View: Geodesic Metric Transport Tensors across Adjacent Cell Pairs
CREATE OR REPLACE VIEW v_spatial_conductance_tensor AS
SELECT 
    adj.cell_index_a,
    adj.cell_index_b,
    adj.geodesic_distance_meters,
    adj.boundary_length_meters,
    ca.centroid_lat AS lat_a,
    ca.centroid_lng AS lng_a,
    cb.centroid_lat AS lat_b,
    cb.centroid_lng AS lng_b,
    (adj.boundary_length_meters / NULLIF(adj.geodesic_distance_meters, 0.0)) AS geometric_conductance_factor
FROM h3_cell_adjacencies adj
JOIN h3_cells ca ON adj.cell_index_a = ca.cell_index
JOIN h3_cells cb ON adj.cell_index_b = cb.cell_index;
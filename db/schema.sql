-- ============================================================================
-- Web of Life Thermodynamic DGGS & Blockchain Ledger Schema
-- Sprint 069: Cartesian 3D Boundary Vertex Extraction & Interfacial Flux Topology
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL DISCRETE GLOBAL GRID (H3) TOPOLOGY & CARTESIAN 3D BOUNDARIES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index VARCHAR(16) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    vertex_count SMALLINT NOT NULL CHECK (vertex_count IN (5, 6)),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    radius DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (radius > 0.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_centroid_norm CHECK (
        abs(sqrt(centroid_x * centroid_x + centroid_y * centroid_y + centroid_z * centroid_z) - radius) < 1e-7
    )
);

CREATE TABLE IF NOT EXISTS spatial_h3_boundary_vertices (
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    vertex_index SMALLINT NOT NULL CHECK (vertex_index BETWEEN 0 AND 6),
    lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90.0 AND 90.0),
    lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180.0 AND 180.0),
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    radius DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (radius > 0.0),
    is_loop_closure BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (h3_index, vertex_index),
    CONSTRAINT check_vertex_norm CHECK (
        abs(sqrt(x * x + y * y + z * z) - radius) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_boundary_coords 
    ON spatial_h3_boundary_vertices (x, y, z);

-- ----------------------------------------------------------------------------
-- 2. DUAL INTERFACIAL TRANSPORT EDGES (CONSERVATIVE FLUX CHANNELS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_interfacial_edges (
    edge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_a VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    cell_b VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    v1_x DOUBLE PRECISION NOT NULL,
    v1_y DOUBLE PRECISION NOT NULL,
    v1_z DOUBLE PRECISION NOT NULL,
    v2_x DOUBLE PRECISION NOT NULL,
    v2_y DOUBLE PRECISION NOT NULL,
    v2_z DOUBLE PRECISION NOT NULL,
    edge_vector_x DOUBLE PRECISION NOT NULL,
    edge_vector_y DOUBLE PRECISION NOT NULL,
    edge_vector_z DOUBLE PRECISION NOT NULL,
    normal_x DOUBLE PRECISION NOT NULL,
    normal_y DOUBLE PRECISION NOT NULL,
    normal_z DOUBLE PRECISION NOT NULL,
    geodesic_length DOUBLE PRECISION NOT NULL CHECK (geodesic_length > 0.0),
    thermal_conductance_kappa DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (thermal_conductance_kappa > 0.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_distinct_cells CHECK (cell_a <> cell_b),
    CONSTRAINT check_unique_directed_edge UNIQUE (cell_a, cell_b)
);

CREATE INDEX IF NOT EXISTS idx_edges_cell_a ON spatial_h3_interfacial_edges(cell_a);
CREATE INDEX IF NOT EXISTS idx_edges_cell_b ON spatial_h3_interfacial_edges(cell_b);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC STOCK BALANCES (STATE TENSORS PER H3 CELL)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    epoch_height BIGINT NOT NULL,
    mass_kg NUMERIC(28, 8) NOT NULL CHECK (mass_kg >= 0),
    internal_energy_joules NUMERIC(28, 8) NOT NULL,
    entropy_j_per_k NUMERIC(28, 8) NOT NULL CHECK (entropy_j_per_k >= 0),
    exergy_joules NUMERIC(28, 8) NOT NULL,
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (h3_index, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_epoch 
    ON thermodynamic_stocks (epoch_height, h3_index);

-- ----------------------------------------------------------------------------
-- 4. INTERFACIAL TRANSPORT TRANSACTIONS (FIRST & SECOND LAW VERIFICATION)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS interfacial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id UUID NOT NULL REFERENCES spatial_h3_interfacial_edges(edge_id),
    epoch_height BIGINT NOT NULL,
    mass_flux_kg NUMERIC(24, 8) NOT NULL,
    heat_flux_joules NUMERIC(24, 8) NOT NULL,
    entropy_production_j_per_k NUMERIC(24, 8) NOT NULL CHECK (entropy_production_j_per_k >= 0),
    delta_t_seconds DOUBLE PRECISION NOT NULL CHECK (delta_t_seconds > 0),
    is_conservative_antisymmetric BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_epoch 
    ON interfacial_flux_transactions (epoch_height, edge_id);

-- ----------------------------------------------------------------------------
-- 5. BLOCKCHAIN THERMODYNAMIC CONSENSUS BLOCKS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_thermodynamic_blocks (
    epoch_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    state_tensor_root BYTEA NOT NULL,
    interfacial_flux_merkle_root BYTEA NOT NULL,
    boundary_geometry_merkle_root BYTEA NOT NULL,
    net_mass_delta_kg NUMERIC(28, 8) NOT NULL DEFAULT 0.0,
    net_entropy_production_j_per_k NUMERIC(28, 8) NOT NULL CHECK (net_entropy_production_j_per_k >= 0),
    first_law_residual_joules NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    validator_node_signature BYTEA NOT NULL,
    timestamp_utc TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT check_first_law_conservation CHECK (abs(net_mass_delta_kg) < 1e-5),
    CONSTRAINT check_first_law_energy_balance CHECK (abs(first_law_residual_joules) < 1e-4)
);

CREATE INDEX IF NOT EXISTS idx_blocks_timestamp 
    ON blockchain_thermodynamic_blocks (timestamp_utc);
-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & DGGS Adjacency Ledger Schema
-- Sprint 078: Pentagonal Coordination Invariant Enforcement in H3 DGGS
-- ============================================================================

-- Extensions required for cryptographic integrity, UUIDs, and time-series
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enumeration of cell topological geometries across the icosahedral grid
CREATE TYPE h3_cell_topology_type AS ENUM (
    'HEXAGONAL',
    'PENTAGONAL_DISCLINATION'
);

-- Enumeration of coordination violation classes
CREATE TYPE h3_coordination_violation_type AS ENUM (
    'PENTAGONAL_COORDINATION_VIOLATION',
    'HEXAGONAL_COORDINATION_VIOLATION',
    'BOUNDARY_TRUNCATION_VIOLATION'
);

-- Enumeration of thermodynamic state variables carried by spatial stocks
CREATE TYPE thermodynamic_carrier_type AS ENUM (
    'BIOMASS_CARBON_MOLES',
    'THERMAL_ENERGY_JOULES',
    'ENTROPY_JOULES_PER_KELVIN',
    'WATER_MASS_KG',
    'EXERGY_JOULES'
);

-- ----------------------------------------------------------------------------
-- 1. H3 DGGS Manifold Cells Table
-- Captures discrete global grid cells, their topological classification,
-- and invariant target coordination number (z = 5 for pentagons, z = 6 for hexagons).
-- ----------------------------------------------------------------------------
CREATE TABLE h3_grid_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- 64-bit integer represented as 15-character hex string
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    topology_type h3_cell_topology_type NOT NULL,
    is_pentagon BOOLEAN NOT NULL GENERATED ALWAYS AS (
        topology_type = 'PENTAGONAL_DISCLINATION'
    ) STORED,
    expected_coordination_number SMALLINT NOT NULL GENERATED ALWAYS AS (
        CASE 
            WHEN topology_type = 'PENTAGONAL_DISCLINATION' THEN 5 
            ELSE 6 
        END
    ) STORED,
    latitude_rad DOUBLE PRECISION NOT NULL CHECK (latitude_rad BETWEEN -PI()/2 AND PI()/2),
    longitude_rad DOUBLE PRECISION NOT NULL CHECK (longitude_rad BETWEEN -PI() AND PI()),
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_h3_grid_cells_resolution_pentagon 
    ON h3_grid_cells (resolution, is_pentagon);

-- ----------------------------------------------------------------------------
-- 2. H3 Directed Dual Graph Adjacency Edges
-- Tracks topological edges connecting cell pairs.
-- Every pentagonal cell must have strictly 5 outgoing and 5 incoming dual edges.
-- ----------------------------------------------------------------------------
CREATE TABLE h3_adjacency_edges (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id) ON DELETE CASCADE,
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id) ON DELETE CASCADE,
    boundary_length_m DOUBLE PRECISION NOT NULL CHECK (boundary_length_m > 0.0),
    normal_vector_x DOUBLE PRECISION NOT NULL,
    normal_vector_y DOUBLE PRECISION NOT NULL,
    normal_vector_z DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_origin_neighbor UNIQUE (origin_cell_id, neighbor_cell_id),
    CONSTRAINT chk_no_self_adjacency CHECK (origin_cell_id <> neighbor_cell_id)
);

CREATE INDEX idx_h3_adjacency_origin ON h3_adjacency_edges (origin_cell_id);
CREATE INDEX idx_h3_adjacency_neighbor ON h3_adjacency_edges (neighbor_cell_id);

-- ----------------------------------------------------------------------------
-- 3. Coordination Invariant Validation Audit Log
-- Logs execution and assertion failures of assertValidNeighborCountForCell.
-- Reifies PentagonalCoordinationViolationError and HexagonalCoordinationViolationError.
-- ----------------------------------------------------------------------------
CREATE TABLE h3_coordination_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id),
    is_pentagon BOOLEAN NOT NULL,
    observed_neighbor_count SMALLINT NOT NULL CHECK (observed_neighbor_count >= 0),
    expected_neighbor_count SMALLINT NOT NULL CHECK (expected_neighbor_count IN (5, 6)),
    violation_type h3_coordination_violation_type,
    is_valid BOOLEAN NOT NULL GENERATED ALWAYS AS (
        observed_neighbor_count = expected_neighbor_count
    ) STORED,
    assertion_error_message TEXT,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_h3_coordination_audit_block_cell 
    ON h3_coordination_audit_log (block_height, cell_id);
CREATE INDEX idx_h3_coordination_violations 
    ON h3_coordination_audit_log (violation_type) 
    WHERE violation_type IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Stocks Monad Table (State S_i)
-- Maintains intensive and extensive thermodynamic stock balances at each cell.
-- ----------------------------------------------------------------------------
CREATE TABLE cell_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id) ON DELETE RESTRICT,
    block_height BIGINT NOT NULL,
    carrier thermodynamic_carrier_type NOT NULL,
    stock_value NUMERIC(38, 18) NOT NULL CHECK (stock_value >= 0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    chemical_potential_j_mol DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_production_rate_w_k DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    state_merkle_root BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_cell_stock_block_carrier UNIQUE (cell_id, block_height, carrier)
);

CREATE INDEX idx_cell_thermo_stocks_lookup 
    ON cell_thermodynamic_stocks (block_height, cell_id, carrier);

-- ----------------------------------------------------------------------------
-- 5. Inter-Cell Directional Flux Tensors (Flow J_ij)
-- Models finite volume mass, energy, and entropy flux across cell facets.
-- Closed boundary condition: sum of fluxes for closed manifold = 0.
-- ----------------------------------------------------------------------------
CREATE TABLE spatial_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    edge_id UUID NOT NULL REFERENCES h3_adjacency_edges(edge_id),
    origin_cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id),
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_id),
    carrier thermodynamic_carrier_type NOT NULL,
    flux_density_j_per_m2_s DOUBLE PRECISION NOT NULL,
    total_flux_rate DOUBLE PRECISION NOT NULL, -- J_ij * boundary_length or area
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0.0), -- Second Law: \dot{\sigma} >= 0
    conservative_closure_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_flux_entropy_second_law CHECK (entropy_generation_rate >= 0.0)
);

CREATE INDEX idx_flux_tx_block_origin 
    ON spatial_flux_transactions (block_height, origin_cell_id);

-- ----------------------------------------------------------------------------
-- 6. DGGS Topology & Thermodynamic Block Transactions
-- Cryptographic anchoring of discrete manifold state transitions.
-- ----------------------------------------------------------------------------
CREATE TABLE dggs_blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    thermodynamic_stock_merkle_root BYTEA NOT NULL,
    topology_invariant_merkle_root BYTEA NOT NULL,
    pentagonal_disclination_count SMALLINT NOT NULL CHECK (pentagonal_disclination_count = 12),
    total_entropy_production_w_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_w_k >= 0.0),
    conservative_mass_divergence_error DOUBLE PRECISION NOT NULL CHECK (abs(conservative_mass_divergence_error) < 1e-12),
    validator_signature BYTEA NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ----------------------------------------------------------------------------
-- View: Cell Adjacency Coordination Real-time Check
-- Materializes live neighbor counts vs geometric invariant.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_cell_coordination_status AS
SELECT 
    c.cell_id,
    c.resolution,
    c.topology_type,
    c.is_pentagon,
    c.expected_coordination_number,
    COUNT(e.neighbor_cell_id) AS current_neighbor_count,
    CASE 
        WHEN c.is_pentagon AND COUNT(e.neighbor_cell_id) <> 5 THEN 'PENTAGONAL_COORDINATION_VIOLATION'
        WHEN NOT c.is_pentagon AND COUNT(e.neighbor_cell_id) <> 6 THEN 'HEXAGONAL_COORDINATION_VIOLATION'
        ELSE 'VALID'
    END AS coordination_status
FROM h3_grid_cells c
LEFT JOIN h3_adjacency_edges e 
    ON c.cell_id = e.origin_cell_id AND e.is_active = TRUE
GROUP BY 
    c.cell_id, 
    c.resolution, 
    c.topology_type, 
    c.is_pentagon, 
    c.expected_coordination_number;
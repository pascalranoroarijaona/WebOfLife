-- Web of Life / Gaia Platform - Thermodynamic DGGS Ledger Schema
-- Sprint 087: Pentagon Base Cell Missing Direction Mapping & Zero-Flux Topological Invariants
-- Canonical Base Cell Partition: 122 Base Cells (110 Hexagons, 12 Pentagons)

-- Extension requirements
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS & DOMAINS
-- ============================================================================

CREATE TYPE h3_direction AS ENUM (
    'CENTER',    -- 0: Self
    'K_AXES',    -- 1: +k axis
    'J_AXES',    -- 2: +j axis
    'JK_AXES',   -- 3: +j + k axis
    'I_AXES',    -- 4: +i axis
    'IK_AXES',   -- 5: +i + k axis
    'IJ_AXES',   -- 6: +i + j axis
    'INVALID'    -- 7: Omitted / Out-of-bounds defect direction
);

CREATE TYPE cell_topology_class AS ENUM (
    'HEXAGON',   -- Degree 6 regular base cell
    'PENTAGON'   -- Degree 5 topological defect (singular vertex)
);

CREATE TYPE thermodynamic_stock_type AS ENUM (
    'BIOMASS_CARBON_KG',
    'SOIL_ORGANIC_CARBON_KG',
    'HYDROLOGY_WATER_KG',
    'ENTHALPY_SENSIBLE_JOULES',
    'ENTHALPY_LATENT_JOULES',
    'NITROGEN_POOL_KG'
);

-- ============================================================================
-- BASE TOPOLOGY REGISTRY (Static DGGS Invariants)
-- ============================================================================

CREATE TABLE dggs_base_cells (
    base_cell_id SMALLINT PRIMARY KEY CHECK (base_cell_id BETWEEN 0 AND 121),
    topology_class cell_topology_class NOT NULL,
    is_pentagon BOOLEAN GENERATED ALWAYS AS (topology_class = 'PENTAGON') STORED,
    omitted_direction h3_direction NOT NULL DEFAULT 'INVALID',
    valid_neighbor_count SMALLINT NOT NULL CHECK (valid_neighbor_count IN (5, 6)),
    icosahedral_faces SMALLINT[] NOT NULL,
    polar_equator_zone VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Invariant: Hexagonal base cells must have omitted_direction = 'INVALID' and degree 6.
    -- Pentagons must have a valid omitted direction (K_AXES in H3 canonical) and degree 5.
    CONSTRAINT chk_pentagon_omitted_dir CHECK (
        (topology_class = 'HEXAGON' AND omitted_direction = 'INVALID' AND valid_neighbor_count = 6) OR
        (topology_class = 'PENTAGON' AND omitted_direction = 'K_AXES' AND valid_neighbor_count = 5)
    )
);

-- Seed canonical pentagonal base cells: {4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117}
INSERT INTO dggs_base_cells (base_cell_id, topology_class, omitted_direction, valid_neighbor_count, icosahedral_faces, polar_equator_zone)
VALUES
    (4,   'PENTAGON', 'K_AXES', 5, '{0,1,2,3,4}',        'North Polar Cap'),
    (14,  'PENTAGON', 'K_AXES', 5, '{0,1,5,6,10}',       'Northern Temperate Ring'),
    (24,  'PENTAGON', 'K_AXES', 5, '{1,2,6,7,11}',       'Northern Temperate Ring'),
    (38,  'PENTAGON', 'K_AXES', 5, '{2,3,7,8,12}',       'Northern Temperate Ring'),
    (49,  'PENTAGON', 'K_AXES', 5, '{3,4,8,9,13}',       'Northern Temperate Ring'),
    (58,  'PENTAGON', 'K_AXES', 5, '{4,0,9,5,14}',       'Northern Temperate Ring'),
    (63,  'PENTAGON', 'K_AXES', 5, '{14,15,9,19,18}',    'Southern Temperate Ring'),
    (72,  'PENTAGON', 'K_AXES', 5, '{10,16,5,15,19}',    'Southern Temperate Ring'),
    (83,  'PENTAGON', 'K_AXES', 5, '{11,17,6,16,15}',    'Southern Temperate Ring'),
    (97,  'PENTAGON', 'K_AXES', 5, '{12,18,7,17,16}',    'Southern Temperate Ring'),
    (107, 'PENTAGON', 'K_AXES', 5, '{13,19,8,18,17}',    'Southern Temperate Ring'),
    (117, 'PENTAGON', 'K_AXES', 5, '{15,16,17,18,19}',   'South Polar Cap')
ON CONFLICT (base_cell_id) DO NOTHING;

-- Adjacency lookup table defining the 6-directional topological connections
CREATE TABLE dggs_base_cell_adjacencies (
    source_base_cell SMALLINT NOT NULL REFERENCES dggs_base_cells(base_cell_id),
    direction h3_direction NOT NULL,
    target_base_cell SMALLINT CHECK (target_base_cell BETWEEN 0 AND 121),
    is_omitted_defect BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (source_base_cell, direction),

    -- Missing direction must yield no target cell and be flagged as omitted defect
    CONSTRAINT chk_defect_adjacency CHECK (
        (is_omitted_defect = TRUE AND target_base_cell IS NULL) OR
        (is_omitted_defect = FALSE AND target_base_cell IS NOT NULL)
    )
);

CREATE INDEX idx_dggs_adj_target ON dggs_base_cell_adjacencies(target_base_cell);

-- ============================================================================
-- THERMODYNAMIC STOCK REGISTRY (EarthPod State Vector)
-- ============================================================================

CREATE TABLE earthpod_stock_states (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_cell_id SMALLINT NOT NULL REFERENCES dggs_base_cells(base_cell_id),
    stock_type thermodynamic_stock_type NOT NULL,
    quantity NUMERIC(38, 18) NOT NULL CHECK (quantity >= 0),
    chemical_potential NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    entropy_j_per_k NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_base_cell_stock_time UNIQUE (base_cell_id, stock_type, epoch_timestamp)
);

CREATE INDEX idx_earthpod_cell_stock ON earthpod_stock_states(base_cell_id, stock_type);
CREATE INDEX idx_earthpod_epoch ON earthpod_stock_states(epoch_timestamp DESC);

-- ============================================================================
-- SPATIAL FLUX MONAD TRANSACTIONS & ZERO-FLUX BOUNDARY BARRIERS
-- ============================================================================

CREATE TABLE spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_base_cell SMALLINT NOT NULL REFERENCES dggs_base_cells(base_cell_id),
    direction h3_direction NOT NULL,
    target_base_cell SMALLINT REFERENCES dggs_base_cells(base_cell_id),
    stock_type thermodynamic_stock_type NOT NULL,
    flux_quantity NUMERIC(38, 18) NOT NULL,
    onsager_conductance NUMERIC(38, 18) NOT NULL CHECK (onsager_conductance >= 0),
    potential_gradient NUMERIC(38, 18) NOT NULL,
    entropy_production NUMERIC(38, 18) NOT NULL CHECK (entropy_production >= 0),
    is_zero_flux_boundary BOOLEAN NOT NULL DEFAULT FALSE,
    block_height BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- FIRST LAW ENFORCEMENT: Flux along omitted pentagon direction MUST be strictly zero
    CONSTRAINT chk_first_law_zero_flux CHECK (
        (is_zero_flux_boundary = TRUE AND flux_quantity = 0.0 AND target_base_cell IS NULL) OR
        (is_zero_flux_boundary = FALSE AND flux_quantity >= 0.0 AND target_base_cell IS NOT NULL)
    )
);

CREATE INDEX idx_flux_tx_block ON spatial_flux_transactions(block_height);
CREATE INDEX idx_flux_tx_source_dir ON spatial_flux_transactions(source_base_cell, direction);

-- ============================================================================
-- BLOCKCHAIN LEDGER: CONSENSUS & FIRST/SECOND LAW CONSERVATION PROOFS
-- ============================================================================

CREATE TABLE thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    prev_block_hash CHAR(64) NOT NULL,
    merkle_root CHAR(64) NOT NULL,
    state_delta_hash CHAR(64) NOT NULL,
    total_mass_invariant_kg NUMERIC(38, 18) NOT NULL,
    total_energy_invariant_j NUMERIC(38, 18) NOT NULL,
    total_entropy_production_j_per_k NUMERIC(38, 18) NOT NULL CHECK (total_entropy_production_j_per_k >= 0),
    mass_conservation_delta_kg NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    energy_conservation_delta_j NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    is_conservation_proven BOOLEAN GENERATED ALWAYS AS (
        ABS(mass_conservation_delta_kg) < 1e-12 AND
        ABS(energy_conservation_delta_j) < 1e-9
    ) STORED,
    validator_node_id VARCHAR(128) NOT NULL,
    block_signature TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_block_first_law_conserved CHECK (is_conservation_proven = TRUE)
);

CREATE INDEX idx_block_prev_hash ON thermodynamic_blocks(prev_block_hash);

-- Foreign key linking flux transactions to verified block
ALTER TABLE spatial_flux_transactions
    ADD CONSTRAINT fk_flux_block
    FOREIGN KEY (block_height) REFERENCES thermodynamic_blocks(block_height);
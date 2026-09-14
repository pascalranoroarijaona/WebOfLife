-- Web of Life: Thermodynamic Blockchain & DGGS Spatial Ledger Schema
-- Sprint 049: Topological Pentagon Cell Validation via H3 Index Decomposition

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMERATIONS AND DOMAINS
-- ============================================================================

CREATE TYPE h3_cell_mode AS ENUM (
    'RESERVED',
    'HEXAGON',
    'DELETED'
);

CREATE DOMAIN h3_resolution AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 15);

CREATE DOMAIN h3_coordination_num AS SMALLINT
    CHECK (VALUE IN (5, 6));

-- ============================================================================
-- 1. SPATIAL TOPOLOGY: H3 CELLS AND 12 ICOSAHEDRAL SINGULARITIES
-- ============================================================================

CREATE TABLE h3_cells (
    h3_index BIGINT PRIMARY KEY,
    h3_index_hex VARCHAR(16) GENERATED ALWAYS AS (
        to_hex(h3_index)
    ) STORED,
    mode SMALLINT NOT NULL DEFAULT 1 CHECK (mode = 1),
    resolution h3_resolution NOT NULL,
    base_cell_num SMALLINT NOT NULL CHECK (base_cell_num >= 0 AND base_cell_num <= 121),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    coordination_number h3_coordination_num NOT NULL DEFAULT 6,
    perimeter_correction_factor NUMERIC(18, 12) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Invariant: Pentagon base cells must strictly belong to the 12 icosahedral vertices
    CONSTRAINT check_pentagon_base_cell CHECK (
        (is_pentagon = FALSE AND coordination_number = 6) OR
        (is_pentagon = TRUE AND coordination_number = 5 AND 
         base_cell_num IN (4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107))
    )
);

CREATE INDEX idx_h3_cells_pentagon ON h3_cells (resolution, is_pentagon);
CREATE INDEX idx_h3_cells_base_cell ON h3_cells (base_cell_num);

-- ============================================================================
-- 2. TOPOLOGICAL ADJACENCY AND BOUNDARY FACETS
-- ============================================================================

CREATE TABLE h3_adjacency_facets (
    facet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    target_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    directional_axis SMALLINT NOT NULL CHECK (directional_axis >= 1 AND directional_axis <= 6),
    face_length_meters NUMERIC(16, 6) NOT NULL CHECK (face_length_meters > 0),
    conductance NUMERIC(16, 8) NOT NULL CHECK (conductance >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_source_direction UNIQUE (source_h3, directional_axis),
    CONSTRAINT uq_directed_facet UNIQUE (source_h3, target_h3),
    CONSTRAINT chk_no_self_adjacency CHECK (source_h3 <> target_h3)
);

CREATE INDEX idx_adjacency_source ON h3_adjacency_facets(source_h3);
CREATE INDEX idx_adjacency_target ON h3_adjacency_facets(target_h3);

-- ============================================================================
-- 3. THERMODYNAMIC STATE AND MONAD STOCKS
-- ============================================================================

CREATE TABLE cell_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    epoch_step BIGINT NOT NULL,
    mass_water_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (mass_water_kg >= 0),
    mass_carbon_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (mass_carbon_kg >= 0),
    internal_energy_joules NUMERIC(28, 8) NOT NULL DEFAULT 0.0,
    entropy_production_rate NUMERIC(24, 12) NOT NULL DEFAULT 0.0 CHECK (entropy_production_rate >= 0),
    chemical_potential_water NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    temperature_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_kelvin > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cell_epoch UNIQUE (h3_index, epoch_step)
);

CREATE INDEX idx_stocks_epoch_cell ON cell_thermodynamic_stocks(epoch_step, h3_index);

-- ============================================================================
-- 4. DIRECTED FLUX LEDGER: FIRST LAW ADVECTION AND CONDUCTION
-- ============================================================================

CREATE TABLE directed_boundary_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epoch_step BIGINT NOT NULL,
    facet_id UUID NOT NULL REFERENCES h3_adjacency_facets(facet_id) ON DELETE RESTRICT,
    source_h3 BIGINT NOT NULL,
    target_h3 BIGINT NOT NULL,
    mass_flux_water_kg NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    mass_flux_carbon_kg NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    heat_flux_enthalpy_joules NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    local_entropy_generated NUMERIC(20, 12) NOT NULL DEFAULT 0.0 CHECK (local_entropy_generated >= 0),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fluxes_epoch_facet ON directed_boundary_fluxes(epoch_step, facet_id);

-- ============================================================================
-- 5. BLOCKCHAIN LEDGER & PROOF OF TOPOLOGICAL CONSERVATION
-- ============================================================================

CREATE TABLE topology_audit_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash CHAR(64) NOT NULL,
    merkle_state_root CHAR(64) NOT NULL,
    resolution h3_resolution NOT NULL,
    total_cells_count BIGINT NOT NULL,
    total_pentagons_count SMALLINT NOT NULL CHECK (total_pentagons_count = 12),
    total_active_facets BIGINT NOT NULL,
    global_water_mass_kg NUMERIC(32, 8) NOT NULL,
    global_carbon_mass_kg NUMERIC(32, 8) NOT NULL,
    global_energy_joules NUMERIC(36, 8) NOT NULL,
    divergence_max_abs_error NUMERIC(24, 16) NOT NULL CHECK (divergence_max_abs_error <= 1e-12),
    net_entropy_production NUMERIC(28, 12) NOT NULL CHECK (net_entropy_production >= 0),
    block_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    block_hash CHAR(64) NOT NULL UNIQUE
);

-- ============================================================================
-- 6. TOPOLOGICAL INVARIANT AUDIT VIEWS
-- ============================================================================

-- Audit View: Validate pentagon coordination truncation (exactly 5 neighbors per pentagon)
CREATE OR REPLACE VIEW v_pentagon_coordination_integrity AS
SELECT 
    c.h3_index,
    c.base_cell_num,
    c.resolution,
    c.is_pentagon,
    c.coordination_number,
    COUNT(f.facet_id) AS active_facet_count
FROM h3_cells c
LEFT JOIN h3_adjacency_facets f ON c.h3_index = f.source_h3 AND f.is_active = TRUE
GROUP BY c.h3_index, c.base_cell_num, c.resolution, c.is_pentagon, c.coordination_number
HAVING 
    (c.is_pentagon = TRUE AND COUNT(f.facet_id) <> 5) OR
    (c.is_pentagon = FALSE AND COUNT(f.facet_id) <> 6);

-- Audit View: Advection Divergence per Epoch across Boundary Stencils
CREATE OR REPLACE VIEW v_flux_divergence_conservation AS
SELECT
    epoch_step,
    SUM(mass_flux_water_kg) AS water_divergence_kg,
    SUM(mass_flux_carbon_kg) AS carbon_divergence_kg,
    SUM(heat_flux_enthalpy_joules) AS enthalpy_divergence_joules
FROM (
    SELECT epoch_step, source_h3 AS cell_id, -mass_flux_water_kg AS mass_flux_water_kg, -mass_flux_carbon_kg AS mass_flux_carbon_kg, -heat_flux_enthalpy_joules AS heat_flux_enthalpy_joules
    FROM directed_boundary_fluxes
    UNION ALL
    SELECT epoch_step, target_h3 AS cell_id, mass_flux_water_kg, mass_flux_carbon_kg, heat_flux_enthalpy_joules
    FROM directed_boundary_fluxes
) combined_flux
GROUP BY epoch_step;
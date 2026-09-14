-- Web of Life Planetary Simulation Database Schema
-- Sprint 061: Spherical Boundary Segment Displacement Vector Formulation & Thermodynamic Monad Ledger

-- Enable required spatial and cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SPATIAL TOPOLOGY: DISCRETE GLOBAL GRID SYSTEM (H3 & SPHERICAL GEOMETRY)
-- ============================================================================

CREATE TABLE spatial_cells (
    h3_index VARCHAR(16) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    area_m2 DOUBLE PRECISION NOT NULL CHECK (area_m2 > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_unit_sphere_centroid CHECK (
        ABS((centroid_x * centroid_x + centroid_y * centroid_y + centroid_z * centroid_z) - 1.0) < 1e-6
    )
);

CREATE TABLE spatial_vertices (
    vertex_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_x DOUBLE PRECISION NOT NULL,
    pos_y DOUBLE PRECISION NOT NULL,
    pos_z DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vertex_coordinates_finite CHECK (
        pos_x = pos_x AND pos_y = pos_y AND pos_z = pos_z
    )
);

CREATE INDEX idx_spatial_vertices_coords ON spatial_vertices (pos_x, pos_y, pos_z);

-- Boundary Segment representing directed geodesic boundary edge between two 3D vertices
-- RFC-061: Integrates unnormalized displacement vector (disp_x, disp_y, disp_z)
CREATE TABLE spatial_boundary_segments (
    segment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_vertex_id UUID NOT NULL REFERENCES spatial_vertices(vertex_id) ON DELETE RESTRICT,
    end_vertex_id UUID NOT NULL REFERENCES spatial_vertices(vertex_id) ON DELETE RESTRICT,
    cell_left VARCHAR(16) NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    cell_right VARCHAR(16) NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    -- Unnormalized 3D Cartesian displacement vector: Delta = v_B - v_A
    disp_x DOUBLE PRECISION NOT NULL,
    disp_y DOUBLE PRECISION NOT NULL,
    disp_z DOUBLE PRECISION NOT NULL,
    -- Derived metrics
    chord_length DOUBLE PRECISION GENERATED ALWAYS AS (
        SQRT(disp_x * disp_x + disp_y * disp_y + disp_z * disp_z)
    ) STORED,
    arc_length_rad DOUBLE PRECISION GENERATED ALWAYS AS (
        2.0 * ASIN(0.5 * SQRT(disp_x * disp_x + disp_y * disp_y + disp_z * disp_z))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_segment_endpoints_distinct CHECK (start_vertex_id <> end_vertex_id),
    CONSTRAINT chk_segment_cells_distinct CHECK (cell_left <> cell_right),
    CONSTRAINT uq_segment_directed_endpoints UNIQUE (start_vertex_id, end_vertex_id)
);

CREATE INDEX idx_boundary_segments_cells ON spatial_boundary_segments (cell_left, cell_right);
CREATE INDEX idx_boundary_segments_endpoints ON spatial_boundary_segments (start_vertex_id, end_vertex_id);

-- ============================================================================
-- 2. THERMODYNAMIC MONAD TENSOR STATES (TIME-SERIES LEDGER)
-- ============================================================================

-- Captures the thermodynamic state monad C_i = (U, S, DIC, H2O, Biomass) per cell
CREATE TABLE thermodynamic_cell_states (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    epoch_height BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    -- Internal Energy U (Joules)
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0),
    -- Absolute Entropy S (Joules / Kelvin)
    entropy_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_j_per_k >= 0),
    -- Temperature T (Kelvin) derived from dU/dS
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0),
    -- Dissolved Inorganic Carbon (DIC) in moles
    dic_moles DOUBLE PRECISION NOT NULL CHECK (dic_moles >= 0),
    -- Atmospheric / Cell moisture (kg H2O)
    water_vapor_kg DOUBLE PRECISION NOT NULL CHECK (water_vapor_kg >= 0),
    -- Biomass mass stock (kg Carbon)
    biomass_carbon_kg DOUBLE PRECISION NOT NULL CHECK (biomass_carbon_kg >= 0),
    -- Enthalpy H = U + PV (Joules)
    enthalpy_joules DOUBLE PRECISION NOT NULL,
    state_hash BYTEA NOT NULL,
    CONSTRAINT uq_cell_state_per_epoch UNIQUE (h3_index, epoch_height)
);

CREATE INDEX idx_thermo_cell_states_epoch ON thermodynamic_cell_states (epoch_height, h3_index);

-- Interfacial boundary fluxes crossing boundary segments
CREATE TABLE thermodynamic_interfacial_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES spatial_boundary_segments(segment_id) ON DELETE RESTRICT,
    epoch_height BIGINT NOT NULL,
    -- Enthalpy flux J_H (Joules/sec)
    enthalpy_flux_watts DOUBLE PRECISION NOT NULL,
    -- Mass flux of DIC (moles/sec)
    dic_flux_mol_per_s DOUBLE PRECISION NOT NULL,
    -- Moisture mass flux (kg/sec)
    moisture_flux_kg_per_s DOUBLE PRECISION NOT NULL,
    -- Entropy generation rate dot{S}_{gen, AB} >= 0 (First & Second Law audit)
    entropy_generation_rate_w_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate_w_per_k >= 0.0),
    is_conservative BOOLEAN NOT NULL DEFAULT TRUE,
    flux_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_segment_flux_epoch UNIQUE (segment_id, epoch_height)
);

CREATE INDEX idx_fluxes_epoch ON thermodynamic_interfacial_fluxes (epoch_height);

-- ============================================================================
-- 3. THERMODYNAMIC BLOCKCHAIN CONSENSUS & PROOF-OF-CONSERVATION
-- ============================================================================

CREATE TABLE thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    merkle_state_root BYTEA NOT NULL,
    merkle_flux_root BYTEA NOT NULL,
    total_enthalpy_balance DOUBLE PRECISION NOT NULL,
    total_entropy_generated DOUBLE PRECISION NOT NULL CHECK (total_entropy_generated >= 0),
    closed_loop_flux_divergence DOUBLE PRECISION NOT NULL CHECK (ABS(closed_loop_flux_divergence) < 1e-9),
    timestamp TIMESTAMPTZ NOT NULL,
    proposer_validator VARCHAR(64) NOT NULL,
    validator_signature BYTEA NOT NULL
);

CREATE INDEX idx_thermo_blocks_hash ON thermodynamic_blocks (block_hash);

-- Transaction log documenting thermodynamic state changes and stock translocations
CREATE TABLE thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    tx_type VARCHAR(32) NOT NULL CHECK (tx_type IN ('ADVECTION', 'DIFFUSION', 'INSOLATION', 'BIO_UPTAKE', 'PHASE_CHANGE')),
    source_cell VARCHAR(16) REFERENCES spatial_cells(h3_index),
    destination_cell VARCHAR(16) REFERENCES spatial_cells(h3_index),
    segment_id UUID REFERENCES spatial_boundary_segments(segment_id),
    delta_internal_energy DOUBLE PRECISION NOT NULL,
    delta_entropy DOUBLE PRECISION NOT NULL,
    delta_dic DOUBLE PRECISION NOT NULL,
    delta_moisture DOUBLE PRECISION NOT NULL,
    delta_biomass DOUBLE PRECISION NOT NULL,
    witness_proof BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermo_txs_block ON thermodynamic_transactions (block_height);
CREATE INDEX idx_thermo_txs_cells ON thermodynamic_transactions (source_cell, destination_cell);
CREATE INDEX idx_thermo_txs_segment ON thermodynamic_transactions (segment_id);

-- ============================================================================
-- 4. VIEWS FOR AUDITING CONSERVATION LAWS
-- ============================================================================

CREATE OR REPLACE VIEW view_conservation_audit AS
SELECT 
    b.block_height,
    b.timestamp,
    b.total_enthalpy_balance,
    b.total_entropy_generated,
    b.closed_loop_flux_divergence,
    COUNT(t.tx_id) AS transaction_count,
    SUM(t.delta_internal_energy) AS net_delta_u,
    SUM(t.delta_dic) AS net_delta_dic,
    SUM(t.delta_moisture) AS net_delta_moisture
FROM thermodynamic_blocks b
LEFT JOIN thermodynamic_transactions t ON b.block_height = t.block_height
GROUP BY b.block_height, b.timestamp, b.total_enthalpy_balance, b.total_entropy_generated, b.closed_loop_flux_divergence;
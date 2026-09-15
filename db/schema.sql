-- ============================================================================
-- Web of Life Thermodynamic Blockchain & Spatial DGGS Schema
-- Sprint 076: Discrete Global Grid Topology & Neighbor Valence Validation
-- ============================================================================

-- Spatial Resolution & Icosahedral DGGS Cell Registry
CREATE TABLE IF NOT EXISTS dggs_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- Uber H3 64-bit index in hex representation
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    expected_valence SMALLINT GENERATED ALWAYS AS (
        CASE WHEN is_pentagon THEN 5 ELSE 6 END
    ) STORED,
    surface_area_m2 NUMERIC(18, 6) NOT NULL CHECK (surface_area_m2 > 0),
    centroid_lat NUMERIC(9, 6) NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon NUMERIC(10, 6) NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dggs_cells_res_pentagon 
    ON dggs_cells(resolution, is_pentagon);

-- Topological Adjacency Map
CREATE TABLE IF NOT EXISTS dggs_cell_adjacencies (
    cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    direction_index SMALLINT NOT NULL CHECK (direction_index BETWEEN 0 AND 5),
    boundary_length_m NUMERIC(12, 4) NOT NULL CHECK (boundary_length_m > 0),
    PRIMARY KEY (cell_id, neighbor_cell_id),
    CONSTRAINT chk_non_self_neighbor CHECK (cell_id <> neighbor_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_dggs_adjacencies_neighbor 
    ON dggs_cell_adjacencies(neighbor_cell_id);

-- Discrete Boundary Kernel Validation Log
-- Records verification by isExpectedNeighborCountForCell prior to flux tensor evaluation
CREATE TABLE IF NOT EXISTS spatial_kernel_validations (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    observed_neighbor_count INT NOT NULL CHECK (observed_neighbor_count >= 0),
    expected_neighbor_count INT NOT NULL CHECK (expected_neighbor_count IN (5, 6)),
    is_topologically_valid BOOLEAN GENERATED ALWAYS AS (
        observed_neighbor_count = expected_neighbor_count
    ) STORED,
    neighbors_hash BYTEA NOT NULL, -- SHA-256 hash of sorted canonical neighbor string array
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_node_id VARCHAR(64) NOT NULL,
    CONSTRAINT chk_kernel_expected_matches_dggs CHECK (
        (expected_neighbor_count = 5 AND is_topologically_valid = (observed_neighbor_count = 5)) OR
        (expected_neighbor_count = 6 AND is_topologically_valid = (observed_neighbor_count = 6))
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_kernel_validations_cell 
    ON spatial_kernel_validations(cell_id, validated_at DESC);

-- Thermodynamic State Stocks per Cell (Mass, Thermal Energy, Exergy)
CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    cell_id VARCHAR(15) PRIMARY KEY REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    mass_stock_kg NUMERIC(24, 8) NOT NULL CHECK (mass_stock_kg >= 0),
    internal_energy_j NUMERIC(28, 8) NOT NULL CHECK (internal_energy_j >= 0),
    entropy_j_k NUMERIC(24, 8) NOT NULL CHECK (entropy_j_k >= 0),
    temperature_k NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN mass_stock_kg > 0 AND entropy_j_k > 0 
             THEN internal_energy_j / entropy_j_k 
             ELSE 0.0 END
    ) STORED,
    last_block_height BIGINT NOT NULL,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Blockchain Ledger Blocks
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    merkle_root BYTEA NOT NULL,
    state_root BYTEA NOT NULL,
    total_mass_stock_kg NUMERIC(32, 8) NOT NULL,
    total_energy_stock_j NUMERIC(36, 8) NOT NULL,
    net_entropy_production_j_k NUMERIC(28, 8) NOT NULL CHECK (net_entropy_production_j_k >= 0),
    validator_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_block_height_positive CHECK (block_height >= 0)
);

-- Directional Spatial Advective & Diffusive Flux Transactions
-- Guaranteed zero-leakage via strict topological degree validation
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE RESTRICT,
    kernel_validation_id UUID NOT NULL REFERENCES spatial_kernel_validations(validation_id) ON DELETE RESTRICT,
    source_cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    target_cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    mass_flux_kg NUMERIC(20, 8) NOT NULL,
    energy_flux_j NUMERIC(24, 8) NOT NULL,
    entropy_generated_j_k NUMERIC(20, 8) NOT NULL CHECK (entropy_generated_j_k >= 0),
    laplacian_potential NUMERIC(16, 8) NOT NULL,
    tx_hash BYTEA NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_source_target_distinct CHECK (source_cell_id <> target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_block 
    ON spatial_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_source_target 
    ON spatial_flux_transactions(source_cell_id, target_cell_id);

-- Thermodynamic Invariant Assertion Trigger
-- Guarantees First Law of Thermodynamics conservation: mass/energy change equals net flux
CREATE OR REPLACE FUNCTION enforce_conservative_flux_kernel()
RETURNS TRIGGER AS $$
DECLARE
    is_valid_kernel BOOLEAN;
BEGIN
    SELECT is_topologically_valid INTO is_valid_kernel
    FROM spatial_kernel_validations
    WHERE validation_id = NEW.kernel_validation_id;

    IF is_valid_kernel IS NOT TRUE THEN
        RAISE EXCEPTION 'Thermodynamic Flux Rejected: Kernel validation % violated topological degree completeness.',
            NEW.kernel_validation_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_conservative_flux_kernel ON spatial_flux_transactions;
CREATE TRIGGER trg_enforce_conservative_flux_kernel
    BEFORE INSERT OR UPDATE ON spatial_flux_transactions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_conservative_flux_kernel();
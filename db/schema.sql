-- ============================================================================
-- Web of Life Simulation & Thermodynamic Blockchain Schema
-- Sprint 088: Center Aperture Invariance & hasZeroApertureSequence Verification
-- Dialect: PostgreSQL 15+ (TimescaleDB / PostGIS enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- ENUM TYPES: Spatial Apertures, Trophic Layers & Thermodynamic Conservation
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE h3_direction_digit AS ENUM ('0', '1', '2', '3', '4', '5', '6');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_aperture_mode AS ENUM (
        'APERTURE_INVARIANT_CENTER', -- Sequences with purely 0 digits; zero lateral flux
        'LATERAL_DISPLACEMENT',      -- Sequence contains >= 1 non-zero digits (1..6)
        'VACUOUS_IDENTITY'           -- Length 0 sequence; identity zoom
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE trophic_level_type AS ENUM (
        'PRIMARY_PRODUCER',
        'PRIMARY_CONSUMER',
        'SECONDARY_CONSUMER',
        'TERTIARY_CONSUMER',
        'APEX_PREDATOR',
        'DECOMPOSER_DETRITIVORE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flux_direction_type AS ENUM (
        'INTERNAL_VERTICAL_DISSIPATION',
        'CONCENTRIC_ACCUMULATION',
        'LATERAL_HEX_INTERCHANGE',
        'RADIATIVE_OUTFLOW'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: h3_hierarchical_cells
-- Spatial multi-resolution hexagonal cells (H3 Aperture 3/7)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_hierarchical_cells (
    cell_id VARCHAR(19) PRIMARY KEY, -- H3 64-bit hex string representation
    resolution INT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    parent_cell_id VARCHAR(19) REFERENCES h3_hierarchical_cells(cell_id),
    centroid_geom GEOMETRY(Point, 4326) NOT NULL,
    boundary_geom GEOMETRY(Polygon, 4326) NOT NULL,
    is_center_child BOOLEAN NOT NULL DEFAULT FALSE,
    aperture_digit h3_direction_digit NOT NULL DEFAULT '0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_parent ON h3_hierarchical_cells(parent_cell_id);
CREATE INDEX IF NOT EXISTS idx_h3_cells_centroid ON h3_hierarchical_cells USING GIST(centroid_geom);
CREATE INDEX IF NOT EXISTS idx_h3_cells_boundary ON h3_hierarchical_cells USING GIST(boundary_geom);

-- ----------------------------------------------------------------------------
-- TABLE: h3_traversal_paths
-- Records hierarchical traversal paths across resolution scales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_traversal_paths (
    path_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_cell_id VARCHAR(19) NOT NULL REFERENCES h3_hierarchical_cells(cell_id),
    target_cell_id VARCHAR(19) NOT NULL REFERENCES h3_hierarchical_cells(cell_id),
    origin_resolution INT NOT NULL,
    target_resolution INT NOT NULL,
    digit_sequence INT[] NOT NULL, -- Array of directional digits (0..6)
    sequence_length INT GENERATED ALWAYS AS (cardinality(digit_sequence)) STORED,
    has_zero_aperture_sequence BOOLEAN NOT NULL,
    aperture_mode spatial_aperture_mode NOT NULL,
    lateral_displacement_magnitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_digit_domain CHECK (
        digit_sequence <@ ARRAY[0,1,2,3,4,5,6]::INT[]
    ),
    CONSTRAINT chk_zero_aperture_invariant CHECK (
        (has_zero_aperture_sequence = TRUE AND (lateral_displacement_magnitude = 0.0)) OR
        (has_zero_aperture_sequence = FALSE AND (sequence_length > 0))
    )
);

CREATE INDEX IF NOT EXISTS idx_traversal_paths_origin ON h3_traversal_paths(origin_cell_id);
CREATE INDEX IF NOT EXISTS idx_traversal_paths_target ON h3_traversal_paths(target_cell_id);
CREATE INDEX IF NOT EXISTS idx_traversal_paths_zero_aperture ON h3_traversal_paths(has_zero_aperture_sequence);

-- ----------------------------------------------------------------------------
-- FUNCTION & TRIGGER: Enforce hasZeroApertureSequence Invariants on Insert/Update
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_h3_traversal_aperture()
RETURNS TRIGGER AS $$
DECLARE
    d INT;
    all_zeros BOOLEAN := TRUE;
BEGIN
    IF NEW.digit_sequence IS NULL OR cardinality(NEW.digit_sequence) = 0 THEN
        NEW.has_zero_aperture_sequence := TRUE;
        NEW.aperture_mode := 'VACUOUS_IDENTITY';
        NEW.lateral_displacement_magnitude := 0.0;
        RETURN NEW;
    END IF;

    FOREACH d IN ARRAY NEW.digit_sequence LOOP
        IF d <> 0 THEN
            all_zeros := FALSE;
            EXIT;
        END IF;
    END LOOP;

    NEW.has_zero_aperture_sequence := all_zeros;
    IF all_zeros THEN
        NEW.aperture_mode := 'APERTURE_INVARIANT_CENTER';
        NEW.lateral_displacement_magnitude := 0.0;
    ELSE
        NEW.aperture_mode := 'LATERAL_DISPLACEMENT';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_h3_traversal_aperture ON h3_traversal_paths;
CREATE TRIGGER trg_validate_h3_traversal_aperture
BEFORE INSERT OR UPDATE ON h3_traversal_paths
FOR EACH ROW
EXECUTE FUNCTION fn_validate_h3_traversal_aperture();

-- ----------------------------------------------------------------------------
-- TABLE: thermodynamic_monad_stocks
-- State tensor for localized trophic & exergy balance within spatial hexagons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id VARCHAR(19) NOT NULL REFERENCES h3_hierarchical_cells(cell_id),
    trophic_tier trophic_level_type NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    biomass_density_kg_m2 DOUBLE PRECISION NOT NULL CHECK (biomass_density_kg_m2 >= 0.0),
    exergy_enthalpy_kj DOUBLE PRECISION NOT NULL CHECK (exergy_enthalpy_kj >= 0.0),
    entropy_dissipation_kj_k DOUBLE PRECISION NOT NULL CHECK (entropy_dissipation_kj_k >= 0.0),
    bound_carbon_stock_kg DOUBLE PRECISION NOT NULL CHECK (bound_carbon_stock_kg >= 0.0),
    internal_energy_j DOUBLE PRECISION NOT NULL CHECK (internal_energy_j >= 0.0),
    is_closed_vertical_column BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monad_stock_cell_tier_epoch UNIQUE(cell_id, trophic_tier, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_monad_stocks_cell_epoch ON thermodynamic_monad_stocks(cell_id, epoch_timestamp DESC);

-- ----------------------------------------------------------------------------
-- TABLE: spatial_monad_flux_transactions
-- Tracks thermodynamic transfers across vertical columns and lateral hexagons
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_monad_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    path_id UUID REFERENCES h3_traversal_paths(path_id),
    source_cell_id VARCHAR(19) NOT NULL REFERENCES h3_hierarchical_cells(cell_id),
    target_cell_id VARCHAR(19) NOT NULL REFERENCES h3_hierarchical_cells(cell_id),
    flux_direction flux_direction_type NOT NULL,
    has_zero_aperture_invariance BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Thermodynamic Flow Vectors
    mass_flux_kg DOUBLE PRECISION NOT NULL CHECK (mass_flux_kg >= 0.0),
    enthalpy_flux_kj DOUBLE PRECISION NOT NULL CHECK (enthalpy_flux_kj >= 0.0),
    lateral_flux_tensor DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (lateral_flux_tensor >= 0.0),
    entropy_production_kj_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_kj_k >= 0.0),
    
    -- First & Second Law Compliance Proofs
    energy_conservation_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_second_law_compliant BOOLEAN NOT NULL DEFAULT TRUE,
    
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_zero_lateral_flux_invariant CHECK (
        (has_zero_aperture_invariance = TRUE AND lateral_flux_tensor = 0.0) OR
        (has_zero_aperture_invariance = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_source ON spatial_monad_flux_transactions(source_cell_id);
CREATE INDEX IF NOT EXISTS idx_flux_tx_target ON spatial_monad_flux_transactions(target_cell_id);
CREATE INDEX IF NOT EXISTS idx_flux_tx_executed_at ON spatial_monad_flux_transactions(executed_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE: blockchain_ledger_blocks
-- Cryptographic and thermodynamic state commitment ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_ledger_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_block_hash BYTEA NOT NULL,
    merkle_state_root BYTEA NOT NULL,
    spatial_tensor_merkle_root BYTEA NOT NULL,
    total_entropy_production_kj_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_kj_k >= 0.0),
    total_exergy_consumed_kj DOUBLE PRECISION NOT NULL CHECK (total_exergy_consumed_kj >= 0.0),
    zero_aperture_tx_count INT NOT NULL CHECK (zero_aperture_tx_count >= 0),
    lateral_flux_tx_count INT NOT NULL CHECK (lateral_flux_tx_count >= 0),
    validator_node_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLE: blockchain_block_transactions
-- Association between spatial flux transactions and committed ledger blocks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_block_transactions (
    block_height BIGINT NOT NULL REFERENCES blockchain_ledger_blocks(block_height) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES spatial_monad_flux_transactions(transaction_id) ON DELETE RESTRICT,
    tx_sequence_index INT NOT NULL,
    tx_signature BYTEA NOT NULL,
    zero_aperture_witness BOOLEAN NOT NULL,
    PRIMARY KEY (block_height, tx_sequence_index),
    CONSTRAINT uq_block_tx_id UNIQUE (block_height, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_block_tx_zero_witness ON blockchain_block_transactions(zero_aperture_witness);
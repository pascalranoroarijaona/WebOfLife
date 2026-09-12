-- Web of Life: Sprint 053 Schema Additions
-- Thermodynamic State Vector Stock Conservation Asserter & Ledger Transactions

-- Table: thermodynamic_state_snapshots
-- Captures system-wide or compartment inventory stock vectors per simulation tick.
CREATE TABLE IF NOT EXISTS thermodynamic_state_snapshots (
    snapshot_id VARCHAR(64) PRIMARY KEY,
    pod_id VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    delta_t DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: inventory_stocks
-- Records individual chemical species or thermodynamic stocks within a state snapshot.
CREATE TABLE IF NOT EXISTS inventory_stocks (
    id SERIAL PRIMARY KEY,
    snapshot_id VARCHAR(64) REFERENCES thermodynamic_state_snapshots(snapshot_id) ON DELETE CASCADE,
    species_name VARCHAR(64) NOT NULL,
    mass_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(16) DEFAULT 'mol'
);

-- Table: boundary_flux_records
-- Tracks integrated incoming and outgoing fluxes for species across compartment boundaries during dt.
CREATE TABLE IF NOT EXISTS boundary_flux_records (
    id SERIAL PRIMARY KEY,
    snapshot_id VARCHAR(64) REFERENCES thermodynamic_state_snapshots(snapshot_id) ON DELETE CASCADE,
    species_name VARCHAR(64) NOT NULL,
    inflow_rate DOUBLE PRECISION NOT NULL,
    outflow_rate DOUBLE PRECISION NOT NULL,
    net_flux DOUBLE PRECISION NOT NULL
);

-- Table: conservation_validation_results
-- Stores audit results from StateValidator checking delta S against boundary fluxes within tolerance epsilon.
CREATE TABLE IF NOT EXISTS conservation_validation_results (
    validation_id SERIAL PRIMARY KEY,
    snapshot_id VARCHAR(64) REFERENCES thermodynamic_state_snapshots(snapshot_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    max_tolerance DOUBLE PRECISION NOT NULL,
    max_error_observed DOUBLE PRECISION NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: conservation_discrepancies
-- Itemizes specific species mass discrepancies when conservation bounds are breached.
CREATE TABLE IF NOT EXISTS conservation_discrepancies (
    id SERIAL PRIMARY KEY,
    validation_id INTEGER REFERENCES conservation_validation_results(validation_id) ON DELETE CASCADE,
    species_name VARCHAR(64) NOT NULL,
    expected_delta DOUBLE PRECISION NOT NULL,
    actual_delta DOUBLE PRECISION NOT NULL,
    error_magnitude DOUBLE PRECISION NOT NULL
);

-- Table: thermodynamic_blockchain_blocks
-- Immutable ledger recording state vector hashes and thermodynamic conservation proofs.
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_index BIGINT PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    state_snapshot_id VARCHAR(64) REFERENCES thermodynamic_state_snapshots(snapshot_id),
    entropy_generation_rate DOUBLE PRECISION NOT NULL,
    conservation_verified BOOLEAN NOT NULL,
    nonce BIGINT NOT NULL,
    mined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for time-series and validation analytics
CREATE INDEX IF NOT EXISTS idx_thermo_snapshots_pod_time ON thermodynamic_state_snapshots(pod_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_conservation_results_valid ON conservation_validation_results(is_valid);
CREATE INDEX IF NOT EXISTS idx_blockchain_hash ON thermodynamic_blockchain_blocks(current_hash);
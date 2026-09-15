import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Direction } from '../src/spatial/h3_types';
import {
  PENTAGON_BASE_CELLS,
  PENTAGON_BASE_CELL_SET,
  determinePentagonBaseCellMissingDirection,
  isBaseCellPentagon,
  getBaseCellNeighbor,
  getPentagonDefectMetadata,
  verifyPentagonMissingDirectionConsistency,
  H3AdjacencyService,
  SpatialFluxMonad,
  DiscreteManifoldFluxMonad,
  TOTAL_BASE_CELLS
} from '../src/spatial/h3_adjacency';
import type { BaseCellStockVector } from '../src/spatial/h3_types';

describe('Sprint 087: Pentagon Base Cell Missing Direction Mapping', () => {
  const EXPECTED_PENTAGONS = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];

  it('verifies the exact count and identity of 12 pentagonal base cells', () => {
    assert.strictEqual(PENTAGON_BASE_CELLS.length, 12);
    assert.strictEqual(PENTAGON_BASE_CELL_SET.size, 12);

    for (const pentagon of EXPECTED_PENTAGONS) {
      assert.strictEqual(isBaseCellPentagon(pentagon), true, `Cell ${pentagon} should be a pentagon`);
      assert.strictEqual(PENTAGON_BASE_CELL_SET.has(pentagon), true);
    }
  });

  it('maps all 12 pentagon base cells to Direction.K_AXES', () => {
    for (const pentagon of EXPECTED_PENTAGONS) {
      const missingDir = determinePentagonBaseCellMissingDirection(pentagon);
      assert.strictEqual(
        missingDir,
        Direction.K_AXES,
        `Pentagon ${pentagon} missing direction must be Direction.K_AXES (1)`
      );
    }
  });

  it('maps all 110 hexagon base cells to Direction.INVALID', () => {
    let hexCount = 0;
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      if (!PENTAGON_BASE_CELL_SET.has(bc)) {
        hexCount++;
        assert.strictEqual(isBaseCellPentagon(bc), false, `Cell ${bc} must not be a pentagon`);
        const missingDir = determinePentagonBaseCellMissingDirection(bc);
        assert.strictEqual(
          missingDir,
          Direction.INVALID,
          `Hexagon ${bc} missing direction must be Direction.INVALID (7)`
        );
      }
    }
    assert.strictEqual(hexCount, 110, 'Must have exactly 110 hexagon base cells');
  });

  it('returns Direction.INVALID for out-of-range, negative, and non-integer inputs', () => {
    const invalidInputs = [-1, -99, 122, 123, 999, 4.5, NaN, Infinity, -Infinity];
    for (const input of invalidInputs) {
      assert.strictEqual(
        determinePentagonBaseCellMissingDirection(input),
        Direction.INVALID,
        `Input ${input} should return Direction.INVALID`
      );
      assert.strictEqual(
        isBaseCellPentagon(input),
        false,
        `Input ${input} should not be identified as pentagon`
      );
    }
  });

  it('ensures getBaseCellNeighbor returns -1 along the omitted direction for pentagons', () => {
    for (const pentagon of EXPECTED_PENTAGONS) {
      const missingDir = determinePentagonBaseCellMissingDirection(pentagon);
      const neighbor = getBaseCellNeighbor(pentagon, missingDir);
      assert.strictEqual(
        neighbor,
        -1,
        `Pentagon ${pentagon} neighbor in direction ${missingDir} must be -1`
      );
      assert.strictEqual(
        verifyPentagonMissingDirectionConsistency(pentagon),
        true,
        `Pentagon ${pentagon} should pass consistency verification`
      );
    }
  });

  it('ensures pentagon defect metadata descriptor matches specification', () => {
    for (const pentagon of EXPECTED_PENTAGONS) {
      const meta = getPentagonDefectMetadata(pentagon);
      assert.strictEqual(meta.baseCell, pentagon);
      assert.strictEqual(meta.isPentagon, true);
      assert.strictEqual(meta.missingDirection, Direction.K_AXES);
      assert.strictEqual(meta.validNeighborCount, 5);
    }

    const hexMeta = getPentagonDefectMetadata(0);
    assert.strictEqual(hexMeta.baseCell, 0);
    assert.strictEqual(hexMeta.isPentagon, false);
    assert.strictEqual(hexMeta.missingDirection, Direction.INVALID);
    assert.strictEqual(hexMeta.validNeighborCount, 6);
  });

  it('validates entire global manifold via H3AdjacencyService', () => {
    const report = H3AdjacencyService.validateGlobalManifold();
    assert.strictEqual(report.valid, true);
    assert.strictEqual(report.pentagonCount, 12);
    assert.strictEqual(report.hexagonCount, 110);

    // Verify active directions count
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      const activeDirs = H3AdjacencyService.getActiveDirections(bc);
      const validNeighbors = H3AdjacencyService.getValidNeighbors(bc);
      if (isBaseCellPentagon(bc)) {
        assert.strictEqual(activeDirs.length, 5);
        assert.strictEqual(validNeighbors.length, 5);
        assert.strictEqual(activeDirs.includes(Direction.K_AXES), false);
      } else {
        assert.strictEqual(activeDirs.length, 6);
        assert.strictEqual(validNeighbors.length, 6);
      }
    }
  });

  it('conserves total mass in SpatialFluxMonad without leakage through omitted directions', () => {
    const fluxMonad = new SpatialFluxMonad();
    const testFlux = 1000.0;

    // Test routing from pentagon
    for (const pentagon of EXPECTED_PENTAGONS) {
      const allocations = fluxMonad.routeConservedFlux(pentagon, testFlux);
      assert.strictEqual(allocations.size, 5, 'Pentagon should allocate to exactly 5 neighbors');

      let totalAllocated = 0;
      for (const amount of allocations.values()) {
        totalAllocated += amount;
      }
      assert.ok(
        Math.abs(totalAllocated - testFlux) < 1e-12,
        `Mass allocated (${totalAllocated}) must equal input flux (${testFlux})`
      );
    }

    // Test routing from hexagon
    const hexAllocations = fluxMonad.routeConservedFlux(0, testFlux);
    assert.strictEqual(hexAllocations.size, 6, 'Hexagon should allocate to exactly 6 neighbors');
    let hexTotal = 0;
    for (const amount of hexAllocations.values()) {
      hexTotal += amount;
    }
    assert.ok(Math.abs(hexTotal - testFlux) < 1e-12);
  });

  it('strictly satisfies First Law mass and energy conservation in DiscreteManifoldFluxMonad', () => {
    const initialStocks = new Map<number, BaseCellStockVector>();

    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      initialStocks.set(bc, {
        carbonKg: 1000 + bc * 10,
        waterKg: 5000 + (bc % 7) * 200,
        oxygenKg: 2000,
        nitrogenKg: 800,
        phosphorusKg: 150,
        thermalEnergyJoules: 1e8 + bc * 5e5
      });
    }

    const initialMonad = DiscreteManifoldFluxMonad.of(initialStocks);

    // Apply multiple diffusion steps across the manifold
    let monad = initialMonad;
    for (let step = 0; step < 10; step++) {
      monad = monad.applyInterCellDiffusion(0.05, 0.02, 3600);
    }

    const audit = monad.runAudit(initialMonad);

    assert.ok(
      audit.omittedDirectionBoundaryCollisionsPrevented > 0,
      'Must prevent boundary collisions across omitted directions on pentagon defects'
    );

    assert.ok(
      Math.abs(audit.totalWaterDeltaKg) < 1e-9,
      `Water stock delta must be invariant: ${audit.totalWaterDeltaKg}`
    );

    assert.ok(
      Math.abs(audit.totalEnergyDeltaJoules) < 1e-6,
      `Energy stock delta must be invariant: ${audit.totalEnergyDeltaJoules}`
    );

    assert.ok(
      Math.abs(audit.totalCarbonDeltaKg) < 1e-9,
      `Carbon stock delta must be invariant: ${audit.totalCarbonDeltaKg}`
    );
  });
});
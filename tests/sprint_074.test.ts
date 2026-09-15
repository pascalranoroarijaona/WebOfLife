import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  PentagonalCoordinationViolationError,
  H3AdjacencyGraph
} from '../src/spatial/h3_adjacency';
import {
  SpatialFluxMonad,
  CellThermodynamicState
} from '../src/spatial/spatial_flux_monad';

describe('Sprint 074: PentagonalCoordinationViolationError and Topological Invariants', () => {
  it('instantiates PentagonalCoordinationViolationError with structured properties and message', () => {
    const cellIndex = '8828308281fffff';
    const expected = 5;
    const actual = 6;
    const err = new PentagonalCoordinationViolationError(cellIndex, expected, actual);

    assert.strictEqual(err.name, 'PentagonalCoordinationViolationError');
    assert.strictEqual(err.cellIndex, cellIndex);
    assert.strictEqual(err.expectedCount, expected);
    assert.strictEqual(err.actualCount, actual);
    assert.strictEqual(
      err.message,
      `Pentagonal coordination violation at cell '${cellIndex}': expected ${expected} neighbors, but found ${actual}.`
    );
  });

  it('correctly satisfies instanceof checks for Error and PentagonalCoordinationViolationError', () => {
    const err = new PentagonalCoordinationViolationError('0x821c07fffffffff', 5, 4);

    assert.ok(err instanceof Error);
    assert.ok(err instanceof PentagonalCoordinationViolationError);
    assert.strictEqual(err.actualCount, 4);
    assert.strictEqual(err.expectedCount, 5);
  });

  it('validates graph adjacency and rejects over-coordinated pentagonal cells in H3AdjacencyGraph', () => {
    const graph = new H3AdjacencyGraph();
    const pentagonCell = '0x821c07fffffffff';
    const corruptedNeighbors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];

    graph.addCell(pentagonCell, corruptedNeighbors, true);

    assert.throws(
      () => graph.validateCoordination(pentagonCell),
      (thrown: unknown) => {
        assert.ok(thrown instanceof PentagonalCoordinationViolationError);
        assert.strictEqual(thrown.cellIndex, pentagonCell);
        assert.strictEqual(thrown.expectedCount, 5);
        assert.strictEqual(thrown.actualCount, 6);
        return true;
      }
    );
  });

  it('validates graph adjacency and rejects under-coordinated pentagonal cells', () => {
    const graph = new H3AdjacencyGraph();
    const pentagonCell = '0x821c07fffffffff';
    const truncatedNeighbors = ['c1', 'c2', 'c3', 'c4'];

    graph.addCell(pentagonCell, truncatedNeighbors, true);

    assert.throws(
      () => graph.validateCoordination(pentagonCell),
      (thrown: unknown) => {
        assert.ok(thrown instanceof PentagonalCoordinationViolationError);
        assert.strictEqual(thrown.cellIndex, pentagonCell);
        assert.strictEqual(thrown.expectedCount, 5);
        assert.strictEqual(thrown.actualCount, 4);
        return true;
      }
    );
  });

  it('passes validation when pentagon has exact coordination degree 5', () => {
    const graph = new H3AdjacencyGraph();
    const pentagonCell = '0x821c07fffffffff';
    const validNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];

    graph.addCell(pentagonCell, validNeighbors, true);
    assert.doesNotThrow(() => graph.validateCoordination(pentagonCell));
  });

  it('enforces pentagonal coordination inside SpatialFluxMonad', () => {
    const pentagonCell = '0x821c07fffffffff';
    const states = new Map<string, CellThermodynamicState>([
      [
        pentagonCell,
        {
          cellIndex: pentagonCell,
          isPentagon: true,
          carbonKg: 1000,
          waterKg: 5000,
          mineralsKg: 200,
          oxygenKg: 800,
          thermalEnergyMJ: 3000,
          temperatureKelvin: 288.15
        }
      ]
    ]);

    // Corrupted neighbor adjacency with 6 neighbors instead of 5
    const adjacency = new Map<string, string[]>([
      [pentagonCell, ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']]
    ]);

    const monad = SpatialFluxMonad.of(states, adjacency);

    assert.throws(
      () => monad.assertTopologicalInvariants(),
      (thrown: unknown) => {
        assert.ok(thrown instanceof PentagonalCoordinationViolationError);
        assert.strictEqual(thrown.cellIndex, pentagonCell);
        assert.strictEqual(thrown.expectedCount, 5);
        assert.strictEqual(thrown.actualCount, 6);
        return true;
      }
    );
  });

  it('computes edge flux when invariants are preserved', () => {
    const pentagonCell = '0x821c07fffffffff';
    const hex1 = 'hex1';
    const hex2 = 'hex2';
    const hex3 = 'hex3';
    const hex4 = 'hex4';
    const hex5 = 'hex5';

    const states = new Map<string, CellThermodynamicState>([
      [
        pentagonCell,
        {
          cellIndex: pentagonCell,
          isPentagon: true,
          carbonKg: 1000,
          waterKg: 5000,
          mineralsKg: 200,
          oxygenKg: 800,
          thermalEnergyMJ: 3000,
          temperatureKelvin: 288.15
        }
      ],
      [
        hex1,
        {
          cellIndex: hex1,
          isPentagon: false,
          carbonKg: 1200,
          waterKg: 5200,
          mineralsKg: 220,
          oxygenKg: 780,
          thermalEnergyMJ: 3100,
          temperatureKelvin: 289.15
        }
      ]
    ]);

    const adjacency = new Map<string, string[]>([
      [pentagonCell, [hex1, hex2, hex3, hex4, hex5]],
      [hex1, [pentagonCell, 'h2', 'h3', 'h4', 'h5', 'h6']]
    ]);

    const monad = SpatialFluxMonad.of(states, adjacency);
    assert.doesNotThrow(() => monad.assertTopologicalInvariants());

    const fluxes = monad.computeIntercellFluxes(1.0, 0.05, 0.1);
    assert.ok(fluxes.length >= 1);
    const edge = fluxes.find((f) => f.fromCell === pentagonCell && f.toCell === hex1);
    assert.ok(edge !== undefined);
    assert.ok(edge.deltaCarbonKg > 0);
  });
});
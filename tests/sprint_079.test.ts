import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  H3_PENTAGON_NEIGHBOR_COUNT,
  H3_HEXAGON_NEIGHBOR_COUNT,
  isPentagonNeighborArrayLengthValid,
  isHexagonNeighborArrayLengthValid,
  H3AdjacencyValidator
} from '../src/spatial/h3_adjacency.js';

import {
  CellTopologyType,
  CellSpatialState
} from '../src/spatial/h3_types.js';

import {
  PentagonalSpatialFluxMonad,
  PentagonalFluxConservationError
} from '../src/spatial/spatial_flux_monad.js';

describe('Sprint 079 - Pentagonal Adjacency Predicate & Flux Monad Tests', () => {
  describe('Constants Verification', () => {
    it('should assert topological invariant counts', () => {
      assert.strictEqual(H3_PENTAGON_NEIGHBOR_COUNT, 5);
      assert.strictEqual(H3_HEXAGON_NEIGHBOR_COUNT, 6);
    });
  });

  describe('isPentagonNeighborArrayLengthValid - Valid Configurations', () => {
    it('should return true for scalar integer 5', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(5), true);
    });

    it('should return true for array of 5 strings (H3 index representations)', () => {
      const neighbors = ['85283473fffffff', '85283477fffffff', '8528347bfffffff', '85283463fffffff', '85283467fffffff'];
      assert.strictEqual(isPentagonNeighborArrayLengthValid(neighbors), true);
    });

    it('should return true for array of 5 numeric values', () => {
      const neighbors = [1, 2, 3, 4, 5];
      assert.strictEqual(isPentagonNeighborArrayLengthValid(neighbors), true);
    });

    it('should return true for array of 5 arbitrary objects', () => {
      const neighbors = [{}, {}, {}, {}, {}];
      assert.strictEqual(isPentagonNeighborArrayLengthValid(neighbors), true);
    });
  });

  describe('isPentagonNeighborArrayLengthValid - Invalid Configurations', () => {
    it('should return false for hexagonal scalar 6', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(6), false);
    });

    it('should return false for hexagonal array of length 6', () => {
      const hexNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
      assert.strictEqual(isPentagonNeighborArrayLengthValid(hexNeighbors), false);
    });

    it('should return false for other scalar counts', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(0), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(1), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(4), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(7), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(-5), false);
    });

    it('should return false for arrays with length != 5', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid([]), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(['a']), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(['a', 'b', 'c', 'd']), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(['a', 'b', 'c', 'd', 'e', 'f', 'g']), false);
    });
  });

  describe('isPentagonNeighborArrayLengthValid - Boundary and Malformed Inputs', () => {
    it('should return false for null and undefined', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(null), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(undefined), false);
    });

    it('should return false for floating point / non-integer numbers', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(5.00001), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(5.5), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(4.99999), false);
    });

    it('should return false for NaN, +Infinity, and -Infinity', () => {
      assert.strictEqual(isPentagonNeighborArrayLengthValid(NaN), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(Infinity), false);
      assert.strictEqual(isPentagonNeighborArrayLengthValid(-Infinity), false);
    });

    it('should return false for non-array objects with length property', () => {
      const pseudoArray = { length: 5 } as unknown as readonly unknown[];
      assert.strictEqual(isPentagonNeighborArrayLengthValid(pseudoArray), false);
    });
  });

  describe('H3AdjacencyValidator & Hexagonal Predicate', () => {
    it('should validate hexagonal configurations via isHexagonNeighborArrayLengthValid', () => {
      assert.strictEqual(isHexagonNeighborArrayLengthValid(6), true);
      assert.strictEqual(isHexagonNeighborArrayLengthValid([1, 2, 3, 4, 5, 6]), true);
      assert.strictEqual(isHexagonNeighborArrayLengthValid(5), false);
      assert.strictEqual(isHexagonNeighborArrayLengthValid([1, 2, 3, 4, 5]), false);
      assert.strictEqual(isHexagonNeighborArrayLengthValid(null), false);
    });

    it('should correctly dispatch validation by CellTopologyType', () => {
      assert.strictEqual(H3AdjacencyValidator.isValidForType(CellTopologyType.PENTAGON, 5), true);
      assert.strictEqual(H3AdjacencyValidator.isValidForType(CellTopologyType.PENTAGON, 6), false);
      assert.strictEqual(H3AdjacencyValidator.isValidForType(CellTopologyType.HEXAGON, 6), true);
      assert.strictEqual(H3AdjacencyValidator.isValidForType(CellTopologyType.HEXAGON, 5), false);
      assert.strictEqual(H3AdjacencyValidator.expectedNeighborCount(CellTopologyType.PENTAGON), 5);
      assert.strictEqual(H3AdjacencyValidator.expectedNeighborCount(CellTopologyType.HEXAGON), 6);
    });
  });

  describe('Thermodynamic Integration - PentagonalSpatialFluxMonad', () => {
    const makeCell = (id: string, isPent: boolean, carbon: number, water: number): CellSpatialState => ({
      cellIndex: id,
      isPentagon: isPent,
      areaM2: 10000,
      elevationM: 50,
      stocks: {
        carbonMol: carbon,
        waterKg: water,
        mineralsMol: 100,
        oxygenMol: 50,
        thermalEnergyJ: 1e7
      }
    });

    it('should throw PentagonalFluxConservationError if center cell is not pentagonal', () => {
      const hexCenter = makeCell('hex_center', false, 500, 1000);
      const fiveNeighbors = [
        makeCell('n1', false, 100, 1000),
        makeCell('n2', false, 100, 1000),
        makeCell('n3', false, 100, 1000),
        makeCell('n4', false, 100, 1000),
        makeCell('n5', false, 100, 1000)
      ];

      assert.throws(
        () => PentagonalSpatialFluxMonad.of(hexCenter, fiveNeighbors),
        PentagonalFluxConservationError
      );
    });

    it('should throw PentagonalFluxConservationError if neighbor array length is not 5', () => {
      const pentCenter = makeCell('pent_center', true, 500, 1000);
      const fourNeighbors = [
        makeCell('n1', false, 100, 1000),
        makeCell('n2', false, 100, 1000),
        makeCell('n3', false, 100, 1000),
        makeCell('n4', false, 100, 1000)
      ];

      assert.throws(
        () => PentagonalSpatialFluxMonad.of(pentCenter, fourNeighbors),
        PentagonalFluxConservationError
      );

      const sixNeighbors = [
        ...fourNeighbors,
        makeCell('n5', false, 100, 1000),
        makeCell('n6', false, 100, 1000)
      ];

      assert.throws(
        () => PentagonalSpatialFluxMonad.of(pentCenter, sixNeighbors),
        PentagonalFluxConservationError
      );
    });

    it('should correctly compute pairwise fluxes and conserve mass/energy across 5 faces', () => {
      const pentCenter = makeCell('pent_0', true, 1000, 5000);
      const fiveNeighbors = [
        makeCell('n_1', false, 1200, 5200),
        makeCell('n_2', false, 800, 4800),
        makeCell('n_3', false, 1100, 5100),
        makeCell('n_4', false, 950, 4900),
        makeCell('n_5', false, 1050, 5050)
      ];

      const monad = PentagonalSpatialFluxMonad.of(pentCenter, fiveNeighbors);
      const diffusionCoeffs = {
        diffCarbon: 0.1,
        diffWater: 0.2,
        diffMinerals: 0.05,
        diffOxygen: 0.15,
        thermalConductivity: 1.5
      };

      const resolved = monad.computeDiffusion(diffusionCoeffs, 10).resolve();

      assert.strictEqual(resolved.pairwiseFluxes.length, 5);

      // Verify that total divergence matches sum of individual facet deltas
      let expectedCarbonDiv = 0;
      for (const flux of resolved.pairwiseFluxes) {
        expectedCarbonDiv += flux.deltas.carbonMol;
      }

      assert.ok(Math.abs(resolved.totalDivergence.carbonMol - expectedCarbonDiv) < 1e-12);
      assert.ok(pentCenter.stocks.carbonMol !== undefined);
      assert.strictEqual(
        resolved.updatedCenter.stocks.carbonMol,
        pentCenter.stocks.carbonMol + resolved.totalDivergence.carbonMol
      );
    });
  });
});
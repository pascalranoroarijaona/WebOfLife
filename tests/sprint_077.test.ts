/**
 * tests/sprint_077.test.ts
 *
 * Unit test suite verifying assertValidNeighborCountForCell, topological invariants,
 * non-array rejection, and conservative spatial flux balance.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  isPentagonCell,
  isExpectedNeighborCountForCell,
  getExpectedNeighborCount,
  assertValidNeighborCountForCell,
  validateAdjacencyInvariant,
  createCellAdjacencyState,
  calculateConservativeFluxStep,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 077: Cell Neighbor Count Assertion Specification', () => {
  // Canonical H3 indices
  // Base cell 4 is a pentagon at resolution 0: 0x8009fffffffffff
  const H3_PENTAGON_RES0 = '8009fffffffffff';
  // Base cell 0 is a hexagon at resolution 0: 0x8001fffffffffff
  const H3_HEXAGON_RES0 = '8001fffffffffff';

  const mockHexagonId = 'cell-hexagon-8828308281fffff';
  const mockPentagonId = 'cell-pentagon-8009fffffffffff';

  describe('isPentagonCell and getExpectedNeighborCount', () => {
    it('correctly identifies pentagons from naming hints and base cell indexes', () => {
      assert.strictEqual(isPentagonCell(mockPentagonId), true);
      assert.strictEqual(isPentagonCell(H3_PENTAGON_RES0), true);
      assert.strictEqual(getExpectedNeighborCount(mockPentagonId), 5);
      assert.strictEqual(getExpectedNeighborCount(H3_PENTAGON_RES0), 5);
    });

    it('correctly identifies hexagons from naming hints and base cell indexes', () => {
      assert.strictEqual(isPentagonCell(mockHexagonId), false);
      assert.strictEqual(isPentagonCell(H3_HEXAGON_RES0), false);
      assert.strictEqual(getExpectedNeighborCount(mockHexagonId), 6);
      assert.strictEqual(getExpectedNeighborCount(H3_HEXAGON_RES0), 6);
    });
  });

  describe('isExpectedNeighborCountForCell', () => {
    it('validates 6 for hexagons and rejects any other integer', () => {
      assert.strictEqual(isExpectedNeighborCountForCell(mockHexagonId, 6), true);
      assert.strictEqual(isExpectedNeighborCountForCell(mockHexagonId, 5), false);
      assert.strictEqual(isExpectedNeighborCountForCell(mockHexagonId, 7), false);
      assert.strictEqual(isExpectedNeighborCountForCell(mockHexagonId, 0), false);
      assert.strictEqual(isExpectedNeighborCountForCell(mockHexagonId, -1), false);
    });

    it('validates 5 for pentagons and rejects any other integer', () => {
      assert.strictEqual(isExpectedNeighborCountForCell(mockPentagonId, 5), true);
      assert.strictEqual(isExpectedNeighborCountForCell(mockPentagonId, 6), false);
      assert.strictEqual(isExpectedNeighborCountForCell(mockPentagonId, 4), false);
      assert.strictEqual(isExpectedNeighborCountForCell(mockPentagonId, 0), false);
    });
  });

  describe('assertValidNeighborCountForCell: VAL-TOPO-01 Type Safety', () => {
    it('throws TypeError if cellId is not a non-empty string', () => {
      assert.throws(
        () => assertValidNeighborCountForCell('', ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']),
        (err: unknown) => err instanceof TypeError && /cellId/.test((err as Error).message)
      );
      assert.throws(
        () => assertValidNeighborCountForCell(null as unknown as string, []),
        (err: unknown) => err instanceof TypeError
      );
    });

    it('throws TypeError when neighbors is nullish, primitive, or non-array', () => {
      const nonArrays = [
        null,
        undefined,
        42,
        'neighbor-string',
        true,
        { length: 6 },
        new Set(['a', 'b', 'c', 'd', 'e', 'f']),
      ];

      for (const nonArray of nonArrays) {
        assert.throws(
          () => assertValidNeighborCountForCell(mockHexagonId, nonArray),
          (err: unknown) => {
            assert.ok(err instanceof TypeError);
            assert.ok((err as Error).message.includes('Expected neighbors to be an array'));
            assert.ok((err as Error).message.includes(mockHexagonId));
            return true;
          }
        );
      }
    });
  });

  describe('assertValidNeighborCountForCell: VAL-TOPO-02 & VAL-TOPO-03 Valence Cardinality', () => {
    it('passes quietly when a standard hexagon is given exactly 6 neighbors', () => {
      const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
      assert.doesNotThrow(() => {
        assertValidNeighborCountForCell(mockHexagonId, neighbors);
      });
      assert.doesNotThrow(() => {
        assertValidNeighborCountForCell(H3_HEXAGON_RES0, neighbors);
      });
    });

    it('passes quietly when a pentagon is given exactly 5 neighbors', () => {
      const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];
      assert.doesNotThrow(() => {
        assertValidNeighborCountForCell(mockPentagonId, neighbors);
      });
      assert.doesNotThrow(() => {
        assertValidNeighborCountForCell(H3_PENTAGON_RES0, neighbors);
      });
    });

    it('throws RangeError when a hexagon has invalid neighbor count (5, 7, 0)', () => {
      const invalidCounts = [0, 5, 7, 8];
      for (const count of invalidCounts) {
        const neighbors = Array.from({ length: count }, (_, i) => `n${i}`);
        assert.throws(
          () => assertValidNeighborCountForCell(mockHexagonId, neighbors),
          (err: unknown) => {
            assert.ok(err instanceof RangeError);
            assert.ok((err as Error).message.includes(`Invalid neighbor count ${count}`));
            assert.ok((err as Error).message.includes(mockHexagonId));
            assert.ok((err as Error).message.includes('expected 6 for hexagon'));
            return true;
          }
        );
      }
    });

    it('throws RangeError when a pentagon has invalid neighbor count (4, 6, 0)', () => {
      const invalidCounts = [0, 4, 6];
      for (const count of invalidCounts) {
        const neighbors = Array.from({ length: count }, (_, i) => `n${i}`);
        assert.throws(
          () => assertValidNeighborCountForCell(mockPentagonId, neighbors),
          (err: unknown) => {
            assert.ok(err instanceof RangeError);
            assert.ok((err as Error).message.includes(`Invalid neighbor count ${count}`));
            assert.ok((err as Error).message.includes(mockPentagonId));
            assert.ok((err as Error).message.includes('expected 5 for pentagon'));
            return true;
          }
        );
      }
    });
  });

  describe('validateAdjacencyInvariant & createCellAdjacencyState', () => {
    it('validates array of string neighbors and returns a valid state record', () => {
      const neighbors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
      assert.doesNotThrow(() => validateAdjacencyInvariant(mockHexagonId, neighbors));

      const state = createCellAdjacencyState(mockHexagonId, neighbors);
      assert.strictEqual(state.cellId, mockHexagonId);
      assert.strictEqual(state.isPentagon, false);
      assert.strictEqual(state.expectedCount, 6);
      assert.deepStrictEqual(state.neighbors, neighbors);
    });

    it('throws TypeError if neighbor collection contains non-strings', () => {
      const mixedNeighbors = ['c1', 42 as unknown as string, 'c3', 'c4', 'c5', 'c6'];
      assert.throws(
        () => validateAdjacencyInvariant(mockHexagonId, mixedNeighbors),
        (err: unknown) => err instanceof TypeError && /non-string|number/.test((err as Error).message)
      );
    });
  });

  describe('VAL-TOPO-04 Conservative Flux Step Integration', () => {
    it('calculates anti-symmetric conservative transfers over validated adjacency', () => {
      const hexNeighbors = ['hex_n1', 'hex_n2', 'hex_n3', 'hex_n4', 'hex_n5', 'hex_n6'];
      const sourceState = createCellAdjacencyState(mockHexagonId, hexNeighbors);

      const targetStates = hexNeighbors.map((id, idx) =>
        createCellAdjacencyState(
          id,
          Array.from({ length: 6 }, (_, i) => (i === 0 ? mockHexagonId : `sub_n_${idx}_${i}`))
        )
      );

      const params = {
        transmissivity: 1.5,
        conductivity: 2.0,
        headDifference: [0.1, -0.2, 0.05, -0.05, 0.3, -0.1],
        tempDifference: [1.0, -1.5, 0.5, -0.5, 2.0, -1.0],
        deltaTimeSeconds: 10.0,
      };

      const transfers = calculateConservativeFluxStep(sourceState, targetStates, params);
      assert.strictEqual(transfers.length, 6);

      // Verify each transfer record and calculate source outflow
      let totalOutflowWater = 0;
      let totalOutflowEnergy = 0;

      for (let i = 0; i < 6; i++) {
        const tr = transfers[i]!;
        assert.strictEqual(tr.sourceCellId, mockHexagonId);
        assert.strictEqual(tr.targetCellId, hexNeighbors[i]);

        const expectedWater = -params.transmissivity * params.headDifference[i]! * params.deltaTimeSeconds;
        const expectedEnergy = -params.conductivity * params.tempDifference[i]! * params.deltaTimeSeconds;

        assert.strictEqual(Math.abs(tr.deltaWaterKg - expectedWater) < 1e-9, true);
        assert.strictEqual(Math.abs(tr.deltaEnergyJoules - expectedEnergy) < 1e-9, true);

        totalOutflowWater += tr.deltaWaterKg;
        totalOutflowEnergy += tr.deltaEnergyJoules;
      }

      assert.ok(Number.isFinite(totalOutflowWater));
      assert.ok(Number.isFinite(totalOutflowEnergy));
    });
  });
});
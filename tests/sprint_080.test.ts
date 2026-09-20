import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  assertPentagonalNeighborArrayType,
  assertPentagonDegree,
  validatePentagonAdjacency,
  H3AdjacencyGraph,
  PentagonalFluxMonad,
  type SpatialCellState,
  type CellStockVector
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 080: assertPentagonalNeighborArrayType & Topology Defensive Guards', () => {
  describe('assertPentagonalNeighborArrayType - Valid inputs', () => {
    it('should accept an empty array', () => {
      assert.doesNotThrow(() => {
        assertPentagonalNeighborArrayType([]);
      });
    });

    it('should accept a 5-element array of H3 indexes', () => {
      const pentagonNeighbors = [
        '8828308281fffff',
        '8828308283fffff',
        '8828308285fffff',
        '8828308287fffff',
        '8828308289fffff'
      ];
      assert.doesNotThrow(() => {
        assertPentagonalNeighborArrayType(pentagonNeighbors);
      });
    });

    it('should accept numeric and mixed-content arrays', () => {
      assert.doesNotThrow(() => {
        assertPentagonalNeighborArrayType([1, 2, 3, 4, 5]);
      });
      assert.doesNotThrow(() => {
        assertPentagonalNeighborArrayType(['hex1', { id: 'hex2' }, 42]);
      });
    });
  });

  describe('assertPentagonalNeighborArrayType - Non-array rejections', () => {
    it('should throw TypeError for null with expected diagnostic message', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(null),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received null.'));
          return true;
        }
      );
    });

    it('should throw TypeError for undefined', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(undefined),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received undefined.'));
          return true;
        }
      );
    });

    it('should throw TypeError for string primitives', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType('8828308281fffff'),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received string.'));
          return true;
        }
      );
    });

    it('should throw TypeError for numeric values', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(42),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received number.'));
          return true;
        }
      );
    });

    it('should throw TypeError for booleans', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(true),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received boolean.'));
          return true;
        }
      );
    });

    it('should throw TypeError for plain objects and array-like structures', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType({ 0: 'a', 1: 'b', length: 2 }),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received object.'));
          return true;
        }
      );

      assert.throws(
        () => assertPentagonalNeighborArrayType({}),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received object.'));
          return true;
        }
      );
    });

    it('should throw TypeError for Set and Map instances', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(new Set(['a', 'b'])),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received object.'));
          return true;
        }
      );

      assert.throws(
        () => assertPentagonalNeighborArrayType(new Map()),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received object.'));
          return true;
        }
      );
    });

    it('should throw TypeError for functions and symbols', () => {
      assert.throws(
        () => assertPentagonalNeighborArrayType(() => {}),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received function.'));
          return true;
        }
      );

      assert.throws(
        () => assertPentagonalNeighborArrayType(Symbol('pentagon')),
        (err: unknown) => {
          assert(err instanceof TypeError);
          assert(err.message.includes('Expected an Array, received symbol.'));
          return true;
        }
      );
    });
  });

  describe('assertPentagonDegree & validatePentagonAdjacency', () => {
    it('should allow up to 5 neighbors', () => {
      assert.doesNotThrow(() => assertPentagonDegree([1, 2, 3, 4, 5], 5));
      assert.doesNotThrow(() => assertPentagonDegree([], 5));
    });

    it('should throw RangeError if neighbor count exceeds 5', () => {
      assert.throws(
        () => assertPentagonDegree([1, 2, 3, 4, 5, 6], 5),
        (err: unknown) => {
          assert(err instanceof RangeError);
          assert(err.message.includes('max 5 permitted'));
          return true;
        }
      );
    });

    it('should validate pentagon adjacency comprehensively', () => {
      assert.doesNotThrow(() => {
        validatePentagonAdjacency('8028fffffffffff', ['n1', 'n2', 'n3', 'n4', 'n5']);
      });

      assert.throws(() => {
        validatePentagonAdjacency('', ['n1']);
      }, TypeError);

      assert.throws(() => {
        validatePentagonAdjacency('8028fffffffffff', 'not-an-array');
      }, TypeError);

      assert.throws(() => {
        validatePentagonAdjacency('8028fffffffffff', ['1', '2', '3', '4', '5', '6']);
      }, RangeError);
    });
  });

  describe('H3AdjacencyGraph Integration', () => {
    it('should register and retrieve pentagonal neighbors accurately', () => {
      const graph = new H3AdjacencyGraph();
      const pentagonIndex = '8028fffffffffff';
      const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];

      graph.registerPentagon(pentagonIndex, neighbors);
      assert.strictEqual(graph.hasCell(pentagonIndex), true);
      assert.deepStrictEqual(graph.getNeighbors(pentagonIndex), neighbors);
    });

    it('should reject invalid non-array neighbor inputs in registerPentagon', () => {
      const graph = new H3AdjacencyGraph();
      assert.throws(() => {
        graph.registerPentagon('8028fffffffffff', null);
      }, TypeError);

      assert.throws(() => {
        graph.registerPentagon('8028fffffffffff', { 0: 'n1', length: 1 });
      }, TypeError);
    });

    it('should reject more than 5 neighbors in registerPentagon', () => {
      const graph = new H3AdjacencyGraph();
      assert.throws(() => {
        graph.registerPentagon('8028fffffffffff', ['1', '2', '3', '4', '5', '6']);
      }, RangeError);
    });
  });

  describe('PentagonalFluxMonad Thermodynamic Invariants & Guard Execution', () => {
    const makeStocks = (val: number): CellStockVector => ({
      carbon: val * 100,
      water: val * 500,
      minerals: val * 50,
      oxygen: val * 200,
      thermalEnergy: val * 1000
    });

    const sourceState: SpatialCellState = {
      h3Index: '8028fffffffffff',
      isPentagon: true,
      stocks: makeStocks(10)
    };

    const initialNeighbors = new Map<string, SpatialCellState>([
      ['n1', { h3Index: 'n1', isPentagon: false, stocks: makeStocks(1) }],
      ['n2', { h3Index: 'n2', isPentagon: false, stocks: makeStocks(1) }],
      ['n3', { h3Index: 'n3', isPentagon: false, stocks: makeStocks(1) }],
      ['n4', { h3Index: 'n4', isPentagon: false, stocks: makeStocks(1) }],
      ['n5', { h3Index: 'n5', isPentagon: false, stocks: makeStocks(1) }]
    ]);

    const initialTotalStocks: CellStockVector = {
      carbon: (sourceState.stocks.carbon ?? 0) + 5 * (1 * 100),
      water: (sourceState.stocks.water ?? 0) + 5 * (1 * 500),
      minerals: (sourceState.stocks.minerals ?? 0) + 5 * (1 * 50),
      oxygen: (sourceState.stocks.oxygen ?? 0) + 5 * (1 * 200),
      thermalEnergy: (sourceState.stocks.thermalEnergy ?? 0) + 5 * (1 * 1000)
    };

    it('should perform conservative advective transfer and verify First Law', () => {
      const monad = PentagonalFluxMonad.of(sourceState, initialNeighbors);
      const neighborIds = ['n1', 'n2', 'n3', 'n4', 'n5'];
      const transferCoeffs = [0.02, 0.02, 0.02, 0.02, 0.02];

      const stepped = monad.advectPentagonalFlux(neighborIds, transferCoeffs, 1.0);
      assert.strictEqual(stepped.getError(), null);

      const isConserved = stepped.verifyThermodynamicInvariants(initialTotalStocks, 1e-9);
      assert.strictEqual(isConserved, true);

      const result = stepped.getResult();
      assert(result.source.stocks.carbon < (sourceState.stocks.carbon ?? 0));
      const n1 = result.neighbors.get('n1');
      assert(n1 !== undefined);
      assert(n1.stocks.carbon > (initialNeighbors.get('n1')?.stocks.carbon ?? 0));
    });

    it('should fail cleanly with TypeError when candidate neighbors is not an Array', () => {
      const monad = PentagonalFluxMonad.of(sourceState, initialNeighbors);
      const malformedNeighbors = { 0: 'n1', 1: 'n2', length: 2 };

      const stepped = monad.advectPentagonalFlux(malformedNeighbors, [0.05, 0.05], 1.0);
      const err = stepped.getError();

      assert(err instanceof TypeError);
      assert(err.message.includes('Expected an Array, received object.'));
      assert.throws(() => stepped.getResult(), TypeError);
    });

    it('should fail cleanly when candidate neighbors exceeds degree 5', () => {
      const monad = PentagonalFluxMonad.of(sourceState, initialNeighbors);
      const stepped = monad.advectPentagonalFlux(['1', '2', '3', '4', '5', '6'], [], 1.0);
      const err = stepped.getError();

      assert(err instanceof RangeError);
      assert(err.message.includes('max 5 permitted'));
    });
  });
});
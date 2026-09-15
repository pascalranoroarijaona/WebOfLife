import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  assertPentagonalNeighborStringElements,
  assertPentagonalNeighborCount,
  assertHexagonalNeighborCount,
  validatePentagonalNeighbors,
  H3AdjacencyValidator,
  SpatialFluxMonad,
  ConservedStockDelta,
  H3AdjacencyRecord,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 081: assertPentagonalNeighborStringElements & Spatial Adjacency Invariants', () => {
  const validPentagonNeighbors = [
    '85283473fffffff',
    '8528347bfffffff',
    '85283477fffffff',
    '8528340bfffffff',
    '85283407fffffff',
  ] as const;

  it('TC-081-01: passes without error for valid 5-element string neighbor arrays', () => {
    assert.doesNotThrow(() => {
      assertPentagonalNeighborStringElements(validPentagonNeighbors);
    });

    const validated: readonly string[] = validPentagonNeighbors;
    assert.strictEqual(validated.length, 5);
  });

  it('TC-081-02: throws Error when any element is an empty string', () => {
    const invalidNeighbors = ['85283473fffffff', ''];
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(invalidNeighbors);
      },
      {
        name: 'Error',
        message: 'Pentagonal neighbor array element at index 1 must be a non-empty string',
      }
    );
  });

  it('TC-081-03: throws Error when any element is whitespace only', () => {
    const invalidNeighbors = ['85283473fffffff', '   '];
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(invalidNeighbors);
      },
      {
        name: 'Error',
        message: 'Pentagonal neighbor array element at index 1 must be a non-empty string',
      }
    );
  });

  it('TC-081-04: throws TypeError when an element is null', () => {
    const invalidNeighbors = ['85283473fffffff', null, '85283477fffffff'];
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(invalidNeighbors);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor array element at index 1 must be a string, received null',
      }
    );
  });

  it('TC-081-05: throws TypeError when an element is a number', () => {
    const invalidNeighbors = ['85283473fffffff', 12345];
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(invalidNeighbors);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor array element at index 1 must be a string, received number',
      }
    );
  });

  it('TC-081-06: throws TypeError when an element is undefined', () => {
    const invalidNeighbors = ['85283473fffffff', undefined];
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(invalidNeighbors);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor array element at index 1 must be a string, received undefined',
      }
    );
  });

  it('TC-081-07: throws TypeError when input collection is not an array', () => {
    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(null as unknown as readonly unknown[]);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor collection must be an array, received null',
      }
    );

    assert.throws(
      () => {
        assertPentagonalNeighborStringElements(undefined as unknown as readonly unknown[]);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor collection must be an array, received undefined',
      }
    );

    assert.throws(
      () => {
        assertPentagonalNeighborStringElements('85283473fffffff' as unknown as readonly unknown[]);
      },
      {
        name: 'TypeError',
        message: 'Pentagonal neighbor collection must be an array, received string',
      }
    );
  });

  it('TC-081-08: empty array passes element string assertion (cardinality checked separately)', () => {
    assert.doesNotThrow(() => {
      assertPentagonalNeighborStringElements([]);
    });
  });

  it('TC-081-09: validatePentagonalNeighbors enforces both cardinality (5) and non-empty strings', () => {
    const valid = validatePentagonalNeighbors(validPentagonNeighbors);
    assert.strictEqual(valid.length, 5);

    // Cardinality failure
    assert.throws(
      () => {
        validatePentagonalNeighbors(['85283473fffffff']);
      },
      {
        name: 'Error',
        message: 'Pentagonal cell must have exactly 5 neighbors, received 1',
      }
    );

    // Element corruption failure
    assert.throws(
      () => {
        validatePentagonalNeighbors([
          '85283473fffffff',
          '8528347bfffffff',
          '   ',
          '8528340bfffffff',
          '85283407fffffff',
        ]);
      },
      {
        name: 'Error',
        message: 'Pentagonal neighbor array element at index 2 must be a non-empty string',
      }
    );
  });

  it('TC-081-10: H3AdjacencyValidator validates full adjacency records', () => {
    const record: H3AdjacencyRecord = {
      cellIndex: '85283473fffffff',
      isPentagon: true,
      neighbors: validPentagonNeighbors,
    };

    assert.doesNotThrow(() => {
      H3AdjacencyValidator.validateAdjacencyRecord(record);
    });

    const hexRecord: H3AdjacencyRecord = {
      cellIndex: '85283473fffffff',
      isPentagon: false,
      neighbors: [
        '85283473fffffff',
        '8528347bfffffff',
        '85283477fffffff',
        '8528340bfffffff',
        '85283407fffffff',
        '8528340fffeffff',
      ],
    };

    assert.doesNotThrow(() => {
      H3AdjacencyValidator.validateAdjacencyRecord(hexRecord);
    });
  });

  it('TC-081-11: SpatialFluxMonad distributes flux conserved across validated pentagonal neighbors', () => {
    const initialStocks: ConservedStockDelta = {
      carbonKg: 500,
      waterKg: 1000,
      oxygenKg: 200,
      nitrogenKg: 150,
      phosphorusKg: 20,
      energyJoules: 1e6,
    };

    const monad = new SpatialFluxMonad('85283473fffffff', validPentagonNeighbors, initialStocks);

    const fluxVector: ConservedStockDelta = {
      carbonKg: 50,
      waterKg: 100,
      oxygenKg: 10,
      nitrogenKg: 5,
      phosphorusKg: 1,
      energyJoules: 1e5,
    };

    const fluxTensors = [fluxVector, fluxVector, fluxVector, fluxVector, fluxVector];
    const distributed = monad.distributePentagonalFlux(fluxTensors);

    assert.strictEqual(distributed.size, 5);
    for (const neighbor of validPentagonNeighbors) {
      assert.ok(distributed.has(neighbor));
      assert.strictEqual(distributed.get(neighbor)?.carbonKg, 50);
    }
  });

  it('TC-081-12: SpatialFluxMonad throws on stock deficit violation', () => {
    const initialStocks: ConservedStockDelta = {
      carbonKg: 10,
      waterKg: 10,
      oxygenKg: 10,
      nitrogenKg: 10,
      phosphorusKg: 10,
      energyJoules: 100,
    };

    const monad = new SpatialFluxMonad('85283473fffffff', validPentagonNeighbors, initialStocks);

    const excessiveFlux: ConservedStockDelta = {
      carbonKg: 50,
      waterKg: 10,
      oxygenKg: 1,
      nitrogenKg: 1,
      phosphorusKg: 1,
      energyJoules: 10,
    };

    assert.throws(
      () => {
        monad.distributePentagonalFlux([
          excessiveFlux,
          excessiveFlux,
          excessiveFlux,
          excessiveFlux,
          excessiveFlux,
        ]);
      },
      /Insufficient carbon stock/
    );
  });
});
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridEngine, IH3GridQuery } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 004: Uber H3 Geospatial Partitioning Engine Base Initialization', () => {
  it('should initialize H3GridEngine with correct resolution and cells', () => {
    const engine = new H3GridEngine(3);
    const query: IH3GridQuery = {
      resolution: 3,
      baseIndexes: ['831f18fffffffff', '831f19fffffffff'],
    };

    engine.initializeGrid(query);

    const cell1 = engine.getCell('831f18fffffffff');
    assert.notStrictEqual(cell1, undefined);
    assert.strictEqual(cell1?.resolution, 3);
    assert.strictEqual(cell1?.h3Index, '831f18fffffffff');
    assert.ok((cell1?.solarIrradiance ?? 0) >= 0);
  });

  it('should retrieve adjacent cells correctly', () => {
    const engine = new H3GridEngine(3);
    const adj = engine.getAdjacentCells('831f18fffffffff');
    assert.strictEqual(Array.isArray(adj), true);
    assert.strictEqual(adj.length, 6);
  });

  it('should propagate cell state conserving thermodynamic rules', () => {
    const engine = new H3GridEngine(3);
    engine.initializeGrid({ resolution: 3, baseIndexes: ['831f18fffffffff'] });

    const before = engine.getCell('831f18fffffffff');
    assert.notStrictEqual(before, undefined);
    const initialCarbon = before?.carbonStock ?? 0;

    engine.propagateCellState('831f18fffffffff', 1.0);

    const after = engine.getCell('831f18fffffffff');
    assert.notStrictEqual(after, undefined);
    assert.notStrictEqual(after?.carbonStock, initialCarbon);
  });

  it('should support SpatialMonad state transitions and rollback', () => {
    const monad = new SpatialMonad<string>();
    monad.run(() => {
      monad.setValue(new Map([['cellA', 'forest']]));
    });

    const val1 = monad.getValue();
    assert.ok(val1 instanceof Map);
    assert.strictEqual((val1 as Map<string, string>).get('cellA'), 'forest');

    monad.run(() => {
      monad.setValue(new Map([['cellA', 'desert']]));
    });

    const val2 = monad.getValue();
    assert.ok(val2 instanceof Map);
    assert.strictEqual((val2 as Map<string, string>).get('cellA'), 'desert');

    const rolledBack = monad.rollback();
    assert.strictEqual(rolledBack, true);
    const val3 = monad.getValue();
    assert.ok(val3 instanceof Map);
    assert.strictEqual((val3 as Map<string, string>).get('cellA'), 'forest');
  });
});
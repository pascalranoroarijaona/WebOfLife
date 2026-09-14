import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridManager } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';
import { H3Adjacency } from '../src/spatial/h3_adjacency.js';

describe('Sprint 13: Null-Check Guard Clauses for H3 String Payloads', () => {
  it('should successfully process valid H3 strings', () => {
    const validStr = '8a2a1072b59ffff';
    const result = H3GridManager.guardPayload(validStr);
    assert.strictEqual(result, validStr);
  });

  it('should throw ThermodynamicSpatialError on null payload', () => {
    assert.throws(() => {
      H3GridManager.guardPayload(null);
    }, /ThermodynamicSpatialError/);
  });

  it('should throw ThermodynamicSpatialError on undefined payload', () => {
    assert.throws(() => {
      H3GridManager.guardPayload(undefined);
    }, /ThermodynamicSpatialError/);
  });

  it('should throw ThermodynamicSpatialError on empty or whitespace strings', () => {
    assert.throws(() => {
      H3GridManager.guardPayload('   ');
    }, /ThermodynamicSpatialError/);
    assert.throws(() => {
      H3GridManager.guardPayload('');
    }, /ThermodynamicSpatialError/);
  });

  it('should handle SpatialMonad containment for null/undefined spatial inputs', () => {
    const emptyMonad = SpatialMonad.of(null);
    assert.strictEqual(emptyMonad.isCorrupted(), true);
    assert.strictEqual(emptyMonad.getStock(), null);

    const undefinedMonad = SpatialMonad.of(undefined);
    assert.strictEqual(undefinedMonad.isCorrupted(), true);

    const validMonad = SpatialMonad.of('8a2a1072b59ffff');
    assert.strictEqual(validMonad.isCorrupted(), false);
    assert.strictEqual(validMonad.getStock(), '8a2a1072b59ffff');
  });

  it('should integrate with spatial adjacency checks cleanly', () => {
    const adj = H3Adjacency.getAdjacentIndices('8a2a1072b59ffff');
    assert.ok(Array.isArray(adj));
    assert.strictEqual(adj.length, 3);

    assert.throws(() => {
      H3Adjacency.getAdjacentIndices(null);
    }, /ThermodynamicSpatialError/);
  });
});
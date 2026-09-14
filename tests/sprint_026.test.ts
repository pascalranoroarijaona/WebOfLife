import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Resolution, assertH3Resolution, ThermodynamicSpatialError } from '../src/spatial/h3_grid.js';

describe('Sprint 026: Resolution Tier (0-15) Boundary Check', () => {
  it('should validate boundary resolutions correctly', () => {
    // Valid resolutions
    assert.strictEqual(isValidH3Resolution(0), true);
    assert.strictEqual(isValidH3Resolution(7), true);
    assert.strictEqual(isValidH3Resolution(15), true);

    // Out-of-bounds / invalid resolutions
    assert.strictEqual(isValidH3Resolution(-1), false);
    assert.strictEqual(isValidH3Resolution(16), false);
    assert.strictEqual(isValidH3Resolution(3.5), false);
    assert.strictEqual(isValidH3Resolution(NaN), false);
    assert.strictEqual(isValidH3Resolution(Infinity), false);
  });

  it('should assert valid resolutions without throwing', () => {
    assert.doesNotThrow(() => assertH3Resolution(0));
    assert.doesNotThrow(() => assertH3Resolution(8));
    assert.doesNotThrow(() => assertH3Resolution(15));
  });

  it('should throw ThermodynamicSpatialError on invalid resolution assertions', () => {
    assert.throws(() => {
      assertH3Resolution(16);
    }, (err: unknown) => {
      return err instanceof ThermodynamicSpatialError && err.name === 'ThermodynamicSpatialError';
    });

    assert.throws(() => {
      assertH3Resolution(-5);
    }, (err: unknown) => {
      return err instanceof ThermodynamicSpatialError;
    });

    assert.throws(() => {
      assertH3Resolution(4.2);
    }, (err: unknown) => {
      return err instanceof ThermodynamicSpatialError;
    });
  });
});
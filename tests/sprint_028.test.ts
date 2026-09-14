import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidResolution, assertValidResolution, H3GridManager } from '../src/spatial/h3_grid.js';

describe('Sprint 028: Resolution Tier (0-15) Boundary Check Function', () => {
  it('should validate boundary values 0 and 15 successfully', () => {
    assert.strictEqual(isValidResolution(0), true);
    assert.strictEqual(isValidResolution(15), true);
    assert.doesNotThrow(() => assertValidResolution(0));
    assert.doesNotThrow(() => assertValidResolution(15));
  });

  it('should validate intermediate resolutions correctly', () => {
    for (let r = 1; r <= 14; r++) {
      assert.strictEqual(isValidResolution(r), true);
      assert.doesNotThrow(() => assertValidResolution(r));
    }
  });

  it('should reject out-of-bounds negative values', () => {
    assert.strictEqual(isValidResolution(-1), false);
    assert.strictEqual(isValidResolution(-100), false);
    assert.throws(() => assertValidResolution(-1), RangeError);
  });

  it('should reject out-of-bounds values exceeding maximum (15)', () => {
    assert.strictEqual(isValidResolution(16), false);
    assert.strictEqual(isValidResolution(100), false);
    assert.throws(() => assertValidResolution(16), RangeError);
  });

  it('should reject non-integer floating-point values', () => {
    assert.strictEqual(isValidResolution(3.14), false);
    assert.strictEqual(isValidResolution(0.5), false);
    assert.strictEqual(isValidResolution(14.99), false);
    assert.throws(() => assertValidResolution(3.14), RangeError);
  });

  it('should initialize H3GridManager correctly with valid resolutions and throw on invalid', () => {
    const manager = new H3GridManager(7);
    assert.strictEqual(manager.getDefaultResolution(), 7);
    assert.doesNotThrow(() => manager.validateTier(12));
    assert.throws(() => manager.validateTier(20), RangeError);
  });
});
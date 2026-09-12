import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isWithinTolerance } from '../src/thermodynamics/state_validator.js';

describe('Sprint 075: Thermodynamic State Vector Elemental Tolerance Comparison Guard', () => {
  it('should return true when diff is well within tolerance', () => {
    assert.strictEqual(isWithinTolerance(0.5, 1.0), true);
    assert.strictEqual(isWithinTolerance(-0.5, 1.0), true);
    assert.strictEqual(isWithinTolerance(0.0, 0.0), true);
  });

  it('should return true when diff equals tolerance (exact boundary matches)', () => {
    assert.strictEqual(isWithinTolerance(1.0, 1.0), true);
    assert.strictEqual(isWithinTolerance(-1.0, 1.0), true);
    assert.strictEqual(isWithinTolerance(1.0, -1.0), true);
  });

  it('should return false when diff exceeds tolerance (out-of-bounds deviations)', () => {
    assert.strictEqual(isWithinTolerance(1.0001, 1.0), false);
    assert.strictEqual(isWithinTolerance(-1.5, 1.0), false);
    assert.strictEqual(isWithinTolerance(0.0001, 0.0), false);
  });

  it('should handle edge cases such as NaN inputs gracefully', () => {
    assert.strictEqual(isWithinTolerance(NaN, 1.0), false);
    assert.strictEqual(isWithinTolerance(1.0, NaN), false);
    assert.strictEqual(isWithinTolerance(NaN, NaN), false);
  });

  it('should handle floating-point precision bounds correctly', () => {
    const diff = 0.1 + 0.2 - 0.3; // Floating point tiny delta
    assert.strictEqual(isWithinTolerance(diff, 1e-10), true);
  });
});
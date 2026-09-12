import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
import { EntropyInspectable, Result } from '../src/thermodynamics/types.js';

describe('Sprint 043: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
  it('should successfully validate a state with positive entropy', () => {
    const state = { entropy: 100.5, name: 'ValidState' };
    const result: Result<typeof state, string> = assertNonNegativeEntropy(state);

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value.entropy, 100.5);
      assert.strictEqual(result.value.name, 'ValidState');
    }
  });

  it('should successfully validate a state with zero entropy (Third Law crystalline limit)', () => {
    const state = { entropy: 0, name: 'AbsoluteZeroCrystal' };
    const result = assertNonNegativeEntropy(state);

    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value.entropy, 0);
    }
  });

  it('should intercept and reject a state with negative entropy without throwing', () => {
    const state = { entropy: -10.2, name: 'ImpossibleState' };
    const result = assertNonNegativeEntropy(state);

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.includes('cannot be negative'));
      assert.ok(result.error.includes('Second Law'));
    }
  });

  it('should handle malformed states with missing entropy property', () => {
    const state = { energy: 500, name: 'NoEntropy' } as unknown as EntropyInspectable;
    const result = assertNonNegativeEntropy(state);

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.includes('missing or non-numeric entropy property'));
    }
  });

  it('should handle malformed states with null or undefined', () => {
    const resNull = assertNonNegativeEntropy(null as unknown as EntropyInspectable);
    assert.strictEqual(resNull.success, false);

    const resUndefined = assertNonNegativeEntropy(undefined as unknown as EntropyInspectable);
    assert.strictEqual(resUndefined.success, false);
  });

  it('should handle entropy values that are NaN', () => {
    const state = { entropy: NaN, name: 'NanState' };
    const result = assertNonNegativeEntropy(state);

    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.ok(result.error.includes('entropy is NaN'));
    }
  });
});
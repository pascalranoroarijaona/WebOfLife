import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';

describe('Sprint 044: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
  it('should return success for zero entropy', () => {
    const state = { entropy: 0.0 };
    const result = assertNonNegativeEntropy(state);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value.entropy, 0.0);
    }
  });

  it('should return success for positive entropy', () => {
    const state = { entropy: 154.2 };
    const result = assertNonNegativeEntropy(state);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value.entropy, 154.2);
    }
  });

  it('should return error for negative entropy (Second Law Violation)', () => {
    const state = { entropy: -0.001 };
    const result = assertNonNegativeEntropy(state);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Second Law Violation: Entropy cannot be negative/);
    }
  });

  it('should return error for NaN entropy', () => {
    const state = { entropy: NaN };
    const result = assertNonNegativeEntropy(state);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Invalid entropy value/);
    }
  });

  it('should return error for undefined or missing entropy', () => {
    const state = {} as any;
    const result = assertNonNegativeEntropy(state);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.match(result.error, /Invalid entropy value/);
    }
  });
});
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy, ThermodynamicStateLike } from '../src/thermodynamics/state_validator.js';

describe('Sprint 042: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
  it('should return success for valid zero or positive entropy states', () => {
    const validZeroState: ThermodynamicStateLike = { entropy: 0, energy: 100, temperature: 300 };
    const validPosState: ThermodynamicStateLike = { entropy: 1542.5, energy: 5000, temperature: 298.15 };

    const resZero = assertNonNegativeEntropy(validZeroState);
    assert.strictEqual(resZero.success, true);
    if (resZero.success) {
      assert.strictEqual(resZero.value.entropy, 0);
    }

    const resPos = assertNonNegativeEntropy(validPosState);
    assert.strictEqual(resPos.success, true);
    if (resPos.success) {
      assert.strictEqual(resPos.value.entropy, 1542.5);
    }
  });

  it('should return failure for negative entropy states', () => {
    const negativeState: ThermodynamicStateLike = { entropy: -10.5, energy: 1000 };
    const res = assertNonNegativeEntropy(negativeState);

    assert.strictEqual(res.success, false);
    if (!res.success) {
      assert.match(res.error, /Second Law Violation/);
      assert.match(res.error, /-10.5/);
    }
  });

  it('should intercept malformed or non-numeric entropy states gracefully', () => {
    const missingNumberState = { entropy: NaN, energy: 500 } as unknown as ThermodynamicStateLike;
    const invalidTypeState = { entropy: "not-a-number" as unknown as number, energy: 200 };

    const resNaN = assertNonNegativeEntropy(missingNumberState);
    assert.strictEqual(resNaN.success, false);
    if (!resNaN.success) {
      assert.match(resNaN.error, /entropy is NaN/);
    }

    const resType = assertNonNegativeEntropy(invalidTypeState);
    assert.strictEqual(resType.success, false);
    if (!resType.success) {
      assert.match(resType.error, /Invalid entropy/);
    }
  });
});
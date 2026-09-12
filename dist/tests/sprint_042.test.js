import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
describe('Sprint 042: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
    it('should return success for valid zero or positive entropy states', () => {
        const validZeroState = { entropy: 0, energy: 100, internalEnergy: 100, temperature: 300, entropyGenerationRate: 0, stocks: {} };
        const validPosState = { entropy: 1542.5, energy: 5000, internalEnergy: 5000, temperature: 298.15, entropyGenerationRate: 1.0, stocks: {} };
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
        const negativeState = { entropy: -10.5, energy: 1000, internalEnergy: 1000, temperature: 300, entropyGenerationRate: 0, stocks: {} };
        const res = assertNonNegativeEntropy(negativeState);
        assert.strictEqual(res.success, false);
        if (!res.success) {
            const errStr = typeof res.error === 'string' ? res.error : res.error.message;
            assert.match(errStr, /Second Law Violation/);
            assert.match(errStr, /-10.5/);
        }
    });
    it('should intercept malformed or non-numeric entropy states gracefully', () => {
        const missingNumberState = { entropy: NaN, energy: 500, internalEnergy: 500, temperature: 300, entropyGenerationRate: 0, stocks: {} };
        const invalidTypeState = { entropy: "not-a-number", energy: 200, internalEnergy: 200, temperature: 300, entropyGenerationRate: 0, stocks: {} };
        const resNaN = assertNonNegativeEntropy(missingNumberState);
        assert.strictEqual(resNaN.success, false);
        if (!resNaN.success) {
            const errStr = typeof resNaN.error === 'string' ? resNaN.error : resNaN.error.message;
            assert.match(errStr, /entropy is NaN/);
        }
        const resType = assertNonNegativeEntropy(invalidTypeState);
        assert.strictEqual(resType.success, false);
        if (!resType.success) {
            const errStr = typeof resType.error === 'string' ? resType.error : resType.error.message;
            assert.match(errStr, /Invalid entropy/);
        }
    });
});

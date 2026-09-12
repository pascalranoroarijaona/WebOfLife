import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
describe('Sprint 039: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
    it('Test case 1: Valid state vector with positive entropy returns success: true', () => {
        const validState = { entropy: 1500.5, internalEnergy: 100000 };
        const result = assertNonNegativeEntropy(validState);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 1500.5);
        }
    });
    it('Test case 2: State vector with zero entropy returns success: true (absolute zero boundary)', () => {
        const zeroEntropyState = { entropy: 0.0 };
        const result = assertNonNegativeEntropy(zeroEntropyState);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 0.0);
        }
    });
    it('Test case 3: State vector with negative entropy returns success: false with descriptive error message', () => {
        const invalidState = { entropy: -10.5 };
        const result = assertNonNegativeEntropy(invalidState);
        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.match(result.error, /Second Law Violation: Entropy cannot be negative/);
            assert.match(result.error, /-10.5/);
        }
    });
    it('Test case 4: Malformed/null state objects gracefully handled without throwing', () => {
        // @ts-ignore
        const nullResult = assertNonNegativeEntropy(null);
        assert.strictEqual(nullResult.success, false);
        if (!nullResult.success) {
            assert.match(nullResult.error, /Invalid state object provided for entropy validation/);
        }
        const missingEntropyResult = assertNonNegativeEntropy({ internalEnergy: 500 });
        assert.strictEqual(missingEntropyResult.success, false);
        if (!missingEntropyResult.success) {
            assert.match(missingEntropyResult.error, /Entropy metric is missing or not a valid number/);
        }
    });
    it('Supports state objects with getEntropy() method implementation', () => {
        const dynamicState = {
            getEntropy: () => 42.0
        };
        const result = assertNonNegativeEntropy(dynamicState);
        assert.strictEqual(result.success, true);
        const negativeDynamicState = {
            getEntropy: () => -5.2
        };
        const negResult = assertNonNegativeEntropy(negativeDynamicState);
        assert.strictEqual(negResult.success, false);
        if (!negResult.success) {
            assert.match(negResult.error, /Second Law Violation/);
        }
    });
});

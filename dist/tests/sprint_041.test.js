import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
describe('Sprint 041: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
    it('should return success for a state vector with zero entropy', () => {
        const state = {
            energy: 1000,
            entropy: 0,
            temperature: 300,
            biomass: 50,
            internalEnergy: 1000,
            totalEntropy: 0
        };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 0);
        }
    });
    it('should return success for a state vector with positive entropy', () => {
        const state = {
            energy: 5000,
            entropy: 125.4,
            temperature: 298.15,
            biomass: 200,
            internalEnergy: 5000,
            totalEntropy: 125.4
        };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 125.4);
        }
    });
    it('should return failure with NEGATIVE_ENTROPY_VIOLATION when entropy is negative', () => {
        const state = {
            energy: 1000,
            entropy: -5.2,
            temperature: 295,
            biomass: 10,
            internalEnergy: 1000,
            totalEntropy: -5.2
        };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, false);
        if (!result.success) {
            const err = result.error;
            assert.strictEqual(err.code, 'NEGATIVE_ENTROPY_VIOLATION');
            assert.strictEqual(err.invalidValue, -5.2);
            assert.ok(err.message.includes('Second Law Violation'));
        }
    });
    it('should return failure with INVALID_STATE_VECTOR when entropy is missing or invalid', () => {
        const malformedState = {
            energy: 1000,
            entropy: NaN,
            temperature: 300,
            biomass: 50
        };
        const result = assertNonNegativeEntropy(malformedState);
        assert.strictEqual(result.success, false);
        if (!result.success) {
            const err = result.error;
            assert.strictEqual(err.code, 'INVALID_STATE_VECTOR');
            assert.ok(isNaN(err.invalidValue));
        }
    });
    it('should handle null or undefined state gracefully', () => {
        const result = assertNonNegativeEntropy(null);
        assert.strictEqual(result.success, false);
        if (!result.success) {
            const err = result.error;
            assert.strictEqual(err.code, 'INVALID_STATE_VECTOR');
        }
    });
});

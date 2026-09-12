import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
describe('Sprint 045: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
    it('1. Valid state vector with positive entropy (S > 0) returns success result', () => {
        const state = { entropy: 150.5 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 150.5);
        }
    });
    it('2. State vector with zero entropy (S = 0) returns success result', () => {
        const state = { entropy: 0 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.value.entropy, 0);
        }
    });
    it('3. Invalid state vector with negative entropy (S < 0) returns failure result with detailed error message', () => {
        const state = { entropy: -12.4 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.ok(result.error.includes('Second Law Infraction'));
            assert.ok(result.error.includes('S = -12.4'));
        }
    });
    it('4. Malformed state object (missing or NaN entropy property) returns failure result without throwing', () => {
        const missingState = {};
        const missingResult = assertNonNegativeEntropy(missingState);
        assert.strictEqual(missingResult.success, false);
        if (!missingResult.success) {
            assert.ok(missingResult.error.includes('Invalid entropy') || missingResult.error.includes('missing'));
        }
        const nanState = { entropy: Number.NaN };
        const nanResult = assertNonNegativeEntropy(nanState);
        assert.strictEqual(nanResult.success, false);
        if (!nanResult.success) {
            assert.ok(nanResult.error.includes('entropy is NaN'));
        }
        const nullState = null;
        const nullResult = assertNonNegativeEntropy(nullState);
        assert.strictEqual(nullResult.success, false);
    });
});

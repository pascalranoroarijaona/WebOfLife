import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
describe('Sprint 038: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
    it('should return success for valid positive entropy', () => {
        const state = { energy: 1000, entropy: 10.5 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.isOk(), true);
        if (result.isOk() && 'value' in result) {
            assert.strictEqual(result.value, true);
        }
    });
    it('should return success for boundary zero entropy', () => {
        const state = { energy: 500, entropy: 0 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.isOk(), true);
        if (result.isOk() && 'value' in result) {
            assert.strictEqual(result.value, true);
        }
    });
    it('should return failure for negative entropy', () => {
        const state = { energy: 100, entropy: -1.2 };
        const result = assertNonNegativeEntropy(state);
        assert.strictEqual(result.isErr(), true);
        if (result.isErr()) {
            assert.match(result.error ?? '', /Negative entropy detected/);
        }
    });
    it('should return failure for non-numeric or missing entropy attributes', () => {
        const state1 = { energy: 100, entropy: NaN };
        const result1 = assertNonNegativeEntropy(state1);
        assert.strictEqual(result1.isErr(), true);
        if (result1.isErr()) {
            assert.match(result1.error ?? '', /Invalid entropy value/);
        }
        const state2 = { energy: 100, entropy: 'ten' };
        const result2 = assertNonNegativeEntropy(state2);
        assert.strictEqual(result2.isErr(), true);
        if (result2.isErr()) {
            assert.match(result2.error ?? '', /Invalid entropy value/);
        }
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta } from '../src/thermodynamics/state_validator.js';
describe('Sprint 074: Thermodynamic State Vector Discrepancy Absolute Difference', () => {
    it('should compute absolute differences correctly for matching keys', () => {
        const actual = { carbon: 900, nitrogen: 3800000, phosphorus: 4.1e9 };
        const expected = { carbon: 850, nitrogen: 3900000, phosphorus: 4.0e9 };
        const delta = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(delta.carbon, 50);
        assert.strictEqual(delta.nitrogen, 100000);
        assert.strictEqual(delta.phosphorus, 100000000);
    });
    it('should handle missing keys gracefully by defaulting missing values to 0', () => {
        const actual = { carbon: 850, water: 1338000000 };
        const expected = { carbon: 850, nitrogen: 5000 };
        const delta = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(delta.carbon, 0);
        assert.strictEqual(delta.water, 1338000000);
        assert.strictEqual(delta.nitrogen, 5000);
    });
    it('should maintain referential purity and return an immutable new object record', () => {
        const actual = { carbon: 100 };
        const expected = { carbon: 120 };
        const delta = computeAbsoluteStockDelta(actual, expected);
        assert.notStrictEqual(delta, actual);
        assert.notStrictEqual(delta, expected);
        assert.strictEqual(delta.carbon, 20);
    });
});

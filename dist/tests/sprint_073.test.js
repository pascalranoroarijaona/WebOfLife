import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 073 - Thermodynamic State Vector Discrepancy Absolute Difference Math Function', () => {
    it('should compute zero deltas for exact state matches', () => {
        const actual = new StateVector({ stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 } });
        const expected = new StateVector({ stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 } });
        const deltas = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(deltas.carbon, 0);
        assert.strictEqual(deltas.nitrogen, 0);
        assert.strictEqual(deltas.phosphorus, 0);
        assert.strictEqual(deltas.water, 0);
    });
    it('should correctly handle positive and negative stock deviations resulting in absolute values', () => {
        const actual = new StateVector({ stocks: { carbon: 900, nitrogen: 3800000, phosphorus: 4.1e9, water: 1300000000 } });
        const expected = new StateVector({ stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4.0e9, water: 1338000000 } });
        const deltas = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(deltas.carbon, 50); // |900 - 850| = 50
        assert.strictEqual(deltas.nitrogen, 100000); // |3800000 - 3900000| = 100000
        assert.strictEqual(deltas.phosphorus, 100000000); // |4.1e9 - 4.0e9| = 1e8
        assert.strictEqual(deltas.water, 38000000); // |1300000000 - 1338000000| = 38000000
    });
    it('should handle partial or missing elemental keys under strict type safety (defaulting to 0)', () => {
        const actual = new StateVector({ stocks: { carbon: 500 } });
        const expected = new StateVector({ stocks: { nitrogen: 200, carbon: 450 } });
        const deltas = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(deltas.carbon, 50); // |500 - 450| = 50
        assert.strictEqual(deltas.nitrogen, 200); // |0 - 200| = 200
    });
});

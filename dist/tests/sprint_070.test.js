import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 070: Thermodynamic State Vector Discrepancy Absolute Difference Math Function', () => {
    it('1. Identical state vectors yield zero absolute deltas across all elemental keys', () => {
        const vecA = new ThermodynamicStateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const vecB = new ThermodynamicStateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const deltas = computeAbsoluteStockDelta(vecA, vecB);
        assert.strictEqual(deltas['carbon'], 0);
        assert.strictEqual(deltas['nitrogen'], 0);
        assert.strictEqual(deltas['phosphorus'], 0);
        assert.strictEqual(deltas['water'], 0);
    });
    it('2. Positive and negative deviations correctly resolve to positive absolute magnitudes', () => {
        const vecA = new ThermodynamicStateVector({
            stocks: { carbon: 900, nitrogen: 3800000 }
        });
        const vecB = new ThermodynamicStateVector({
            stocks: { carbon: 850, nitrogen: 3900000 }
        });
        const deltas = computeAbsoluteStockDelta(vecA, vecB);
        assert.strictEqual(deltas['carbon'], 50);
        assert.strictEqual(deltas['nitrogen'], 100000);
    });
    it('3. Sparse or partially populated stock records handle missing keys gracefully via zero-defaults', () => {
        const vecA = new ThermodynamicStateVector({
            stocks: { carbon: 500, phosphorus: 100 }
        });
        const vecB = new ThermodynamicStateVector({
            stocks: { carbon: 400, water: 5000 }
        });
        const deltas = computeAbsoluteStockDelta(vecA, vecB);
        assert.strictEqual(deltas['carbon'], 100);
        assert.strictEqual(deltas['phosphorus'], 100);
        assert.strictEqual(deltas['water'], 5000);
    });
});

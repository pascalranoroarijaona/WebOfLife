import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 069: Thermodynamic State Vector Discrepancy Absolute Difference Math Function', () => {
    it('should compute absolute differences correctly between raw stock records', () => {
        const actual = { carbon: 900, water: 1330000, nitrogen: 3900000 };
        const expected = { carbon: 850, water: 1338000000, phosphorus: 4e9 };
        const deltas = computeAbsoluteStockDelta(actual, expected);
        assert.strictEqual(deltas['carbon'], 50); // |900 - 850|
        assert.strictEqual(deltas['water'], 1336670000); // |1330000 - 1338000000|
        assert.strictEqual(deltas['nitrogen'], 3900000); // |3900000 - 0|
        assert.strictEqual(deltas['phosphorus'], 4e9); // |0 - 4e9|
    });
    it('should compute absolute differences correctly with StateVector instances', () => {
        const actualVec = new StateVector({
            stocks: { carbon: 500, energy: 1000 }
        });
        const expectedVec = new StateVector({
            stocks: { carbon: 520, energy: 950, entropy: 10 }
        });
        const deltas = computeAbsoluteStockDelta(actualVec, expectedVec);
        assert.strictEqual(deltas['carbon'], 20);
        assert.strictEqual(deltas['energy'], 50);
        assert.strictEqual(deltas['entropy'], 10);
    });
    it('should handle identical actual and expected states resulting in zero deltas', () => {
        const state = { carbon: 100, hydrogen: 200 };
        const deltas = computeAbsoluteStockDelta(state, state);
        assert.strictEqual(deltas['carbon'], 0);
        assert.strictEqual(deltas['hydrogen'], 0);
    });
});

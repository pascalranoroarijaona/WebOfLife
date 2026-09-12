import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVector } from '../src/thermodynamics/state_vector.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 066: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('should validate exact matches between expected and actual state vectors', () => {
        const expected = new StateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const actual = new StateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const tolerances = {
            carbon: 1.0,
            nitrogen: 10.0,
            phosphorus: 100.0,
            water: 1000.0
        };
        const validator = new StateValidator(tolerances);
        const result = validator.evaluateDiscrepancy(expected, actual, tolerances);
        assert.strictEqual(result.isValid, true);
        for (const d of Object.values(result.discrepancies)) {
            assert.strictEqual(d.exceeded, false);
            assert.strictEqual(d.absoluteDifference, 0);
        }
    });
    it('should pass when variance is within defined per-element tolerances', () => {
        const expected = new StateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const actual = new StateVector({
            stocks: { carbon: 850.5, nitrogen: 3900005, phosphorus: 4e9 + 50, water: 1338000500 }
        });
        const tolerances = {
            carbon: 1.0,
            nitrogen: 10.0,
            phosphorus: 100.0,
            water: 1000.0
        };
        const validator = new StateValidator(tolerances);
        const result = validator.evaluateDiscrepancy(expected, actual, tolerances);
        assert.strictEqual(result.isValid, true);
        for (const d of Object.values(result.discrepancies)) {
            assert.strictEqual(d.exceeded, false);
            assert.ok(d.absoluteDifference <= d.tolerance);
        }
    });
    it('should invalidate when major deviations exceed individual elemental tolerances', () => {
        const expected = new StateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
        });
        const actual = new StateVector({
            stocks: { carbon: 855, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 } // carbon exceeds tolerance 1.0
        });
        const tolerances = {
            carbon: 1.0,
            nitrogen: 10.0,
            phosphorus: 100.0,
            water: 1000.0
        };
        const validator = new StateValidator(tolerances);
        const result = validator.evaluateDiscrepancy(expected, actual, tolerances);
        assert.strictEqual(result.isValid, false);
        const discrepanciesArr = Object.values(result.discrepancies);
        const carbonDisc = discrepanciesArr.find((d) => d.element === 'carbon');
        assert.ok(carbonDisc);
        assert.strictEqual(carbonDisc?.exceeded, true);
        assert.strictEqual(carbonDisc?.absoluteDifference, 5);
        const nitrogenDisc = discrepanciesArr.find((d) => d.element === 'nitrogen');
        assert.strictEqual(nitrogenDisc?.exceeded, false);
    });
});

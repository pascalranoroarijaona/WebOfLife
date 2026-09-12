import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 063: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('should correctly evaluate discrepancies within default tolerances', () => {
        const validator = new StateValidator(1e-6);
        const actual = new StateVector({
            stocks: { carbon: 100.0, nitrogen: 50.0, phosphorus: 10.0 }
        });
        const expected = new StateVector({
            stocks: { carbon: 100.0000005, nitrogen: 50.0, phosphorus: 10.0000001 }
        });
        const result = validator.evaluateDiscrepancy(actual, expected);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.maxToleranceExceeded, undefined);
        assert.ok((result.discrepancies['carbon']?.absoluteDifference ?? 0) <= 1e-6);
    });
    it('should flag discrepancy when tolerance is exceeded', () => {
        const validator = new StateValidator(1e-6);
        const actual = new StateVector({
            stocks: { carbon: 100.0, nitrogen: 50.0 }
        });
        const expected = new StateVector({
            stocks: { carbon: 100.01, nitrogen: 50.0 }
        });
        const result = validator.evaluateDiscrepancy(actual, expected);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.withinTolerance, false);
        assert.strictEqual((result.discrepancies['carbon']?.absoluteDifference ?? result.discrepancies['carbon']?.delta), 0.01);
    });
    it('should support custom elemental tolerances', () => {
        const validator = new StateValidator(1e-6);
        const actual = new StateVector({
            stocks: { carbon: 100.0, water: 5000.0 }
        });
        const expected = new StateVector({
            stocks: { carbon: 100.005, water: 5005.0 }
        });
        const customTolerances = {
            carbon: 0.01,
            water: 10.0
        };
        const result = validator.evaluateDiscrepancy(actual, expected, customTolerances);
        assert.strictEqual(result.isValid, true);
    });
    it('should validate First Law mass conservation', () => {
        const vector = new StateVector({
            energy: 1000,
            stocks: { carbon: 500, nitrogen: 300, phosphorus: 200 }
        });
        const isConserved = StateValidator.validateFirstLaw(vector, 1000);
        assert.strictEqual(isConserved, true);
        const isNotConserved = StateValidator.validateFirstLaw(vector, 1050);
        assert.strictEqual(isNotConserved, false);
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 079: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    const defaultTolerances = {
        carbon: 1e-3,
        nitrogen: 1e-3,
        phosphorus: 1e-3,
        water: 1e-3,
        energy: 1e-2,
    };
    const validator = new ThermodynamicStateValidator(defaultTolerances);
    it('should validate exact matches successfully (isValid: true)', () => {
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0, phosphorus: 4e9, water: 1338000000.0, energy: 1e12 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0, phosphorus: 4e9, water: 1338000000.0, energy: 1e12 }
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, true);
        assert.strictEqual(report.maxDiscrepancy, 0);
        assert.deepStrictEqual(report.discrepancies, {});
    });
    it('should accept minor fluctuations within individual elemental tolerances', () => {
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850.0005, nitrogen: 3900000.0002, phosphorus: 4e9, water: 1338000000.0, energy: 1e12 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0, phosphorus: 4e9, water: 1338000000.0, energy: 1e12 }
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, true);
        assert.ok(report.maxDiscrepancy <= 1e-3);
    });
    it('should detect boundary violations on Carbon, Nitrogen, Phosphorus, and Energy triggering isValid: false with detailed logs', () => {
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 855.0, nitrogen: 3900005.0, phosphorus: 4.000005e9, water: 1338000000.0, energy: 1.0001e12 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0, phosphorus: 4e9, water: 1338000000.0, energy: 1e12 }
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, false);
        assert.ok(report.maxDiscrepancy >= 5.0);
        assert.ok(report.discrepancies['carbon']);
        assert.strictEqual(report.discrepancies['carbon'].absoluteDifference, 5.0);
        assert.ok(report.discrepancies['nitrogen']);
        assert.ok(report.discrepancies['phosphorus']);
    });
    it('should support dynamic tolerances override per evaluation call', () => {
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 852.0 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0 }
        });
        // Default tolerance for carbon is 1e-3, so this should fail
        let report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, false);
        // Override tolerance to allow up to 5.0 difference
        report = validator.evaluate(actual, expected, { carbon: 10.0 });
        assert.strictEqual(report.isValid, true);
    });
});

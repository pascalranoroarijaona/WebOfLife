import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 068: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('should validate exact state vector matches with zero discrepancy', () => {
        const validator = new StateValidator(1e-6);
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 },
            energy: 1e12
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 },
            energy: 1e12
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, true);
        assert.strictEqual(report.maxDiscrepancy, 0);
    });
    it('should accept state vectors within tolerance bounds', () => {
        const validator = new StateValidator({
            carbon: 1e-3,
            nitrogen: 1e-3,
            phosphorus: 1e-3,
            water: 1e-3,
            energy: 1e-2
        });
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850.0005, nitrogen: 3900000.0001, phosphorus: 4e9, water: 1338000000 },
            energy: 1e12 + 0.001
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0, phosphorus: 4e9, water: 1338000000 },
            energy: 1e12
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, true);
        assert.ok(report.maxDiscrepancy <= 1e-3);
    });
    it('should detect state vectors exceeding tolerance bounds per element', () => {
        const validator = new StateValidator({
            carbon: 1e-6,
            nitrogen: 1e-6
        });
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850.005, nitrogen: 3900000.0 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0, nitrogen: 3900000.0 }
        });
        const report = validator.evaluate(actual, expected);
        assert.strictEqual(report.isValid, false);
        const discrepancies = Array.isArray(report.discrepancies) ? report.discrepancies : Object.values(report.discrepancies ?? {});
        const carbonDisc = discrepancies.find((d) => d.element === 'carbon' || d.stockKey === 'carbon');
        const nitrogenDisc = discrepancies.find((d) => d.element === 'nitrogen' || d.stockKey === 'nitrogen');
        assert.strictEqual(carbonDisc?.exceeded, true);
        assert.strictEqual(nitrogenDisc?.exceeded, false);
        assert.ok(report.maxDiscrepancy >= 0.005);
    });
    it('should handle custom tolerance overrides correctly', () => {
        const validator = new StateValidator({
            carbon: 1e-6
        });
        const actual = new ThermodynamicStateVector({
            stocks: { carbon: 850.00005 }
        });
        const expected = new ThermodynamicStateVector({
            stocks: { carbon: 850.0 }
        });
        // Override default carbon tolerance with a stricter one
        const reportStrict = validator.evaluate(actual, expected, { carbon: 1e-8 });
        assert.strictEqual(reportStrict.isValid, false);
        const strictDiscs = Array.isArray(reportStrict.discrepancies) ? reportStrict.discrepancies : Object.values(reportStrict.discrepancies ?? {});
        const strictCarbon = strictDiscs.find((d) => d.element === 'carbon' || d.stockKey === 'carbon');
        assert.strictEqual(strictCarbon?.exceeded, true);
        // Override with a looser tolerance
        const reportLoose = validator.evaluate(actual, expected, { carbon: 1e-4 });
        assert.strictEqual(reportLoose.isValid, true);
        const looseDiscs = Array.isArray(reportLoose.discrepancies) ? reportLoose.discrepancies : Object.values(reportLoose.discrepancies ?? {});
        const looseCarbon = looseDiscs.find((d) => d.element === 'carbon' || d.stockKey === 'carbon');
        assert.strictEqual(looseCarbon?.exceeded, false);
    });
});

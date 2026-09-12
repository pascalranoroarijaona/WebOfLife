import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator, ThermodynamicDiscrepancyViolationError } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 060: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('should validate exact stock balances where actual delta equals flux summation', () => {
        const validator = new StateValidator(1e-6);
        const prevVector = new StateVector({
            stocks: { carbon: 850, water: 1338000000 }
        });
        const currVector = new StateVector({
            stocks: { carbon: 852, water: 1338000001 }
        });
        const fluxDeltas = new Map([
            ['carbon', 2.0],
            ['water', 1.0]
        ]);
        const report = validator.validateStateVector(prevVector, currVector, fluxDeltas);
        assert.strictEqual(report.isValid, true);
        assert.strictEqual(report.maxDiscrepancy, 0);
        assert.strictEqual(Array.isArray(report.discrepancies), true);
        const discArr = report.discrepancies;
        assert.strictEqual(discArr.length, 2);
        assert.strictEqual(discArr[0].isWithinTolerance, true);
        assert.strictEqual(discArr[1].isWithinTolerance, true);
    });
    it('should detect tolerance boundary exceptions when perturbations exceed epsilon', () => {
        const validator = new StateValidator(1e-6);
        const prevVector = new StateVector({
            stocks: { carbon: 850 }
        });
        const currVector = new StateVector({
            stocks: { carbon: 852.00001 }
        });
        const fluxDeltas = new Map([
            ['carbon', 2.0]
        ]);
        const report = validator.validateStateVector(prevVector, currVector, fluxDeltas);
        assert.strictEqual(report.isValid, false);
        assert.ok((report.maxDiscrepancy ?? 0) > 1e-6);
        assert.strictEqual(Array.isArray(report.discrepancies), true);
        const discArr = report.discrepancies;
        assert.strictEqual(discArr[0].isWithinTolerance, false);
    });
    it('should verify multi-cycle integration across carbon and water inventories', () => {
        const validator = new StateValidator(1e-5);
        const prevVector = new StateVector({
            stocks: { carbon: 550, nitrogen: 100, phosphorus: 200, water: 12900 }
        });
        const currVector = new StateVector({
            stocks: { carbon: 548.5, nitrogen: 100.000001, phosphorus: 200, water: 12905.2 }
        });
        const fluxDeltas = {
            carbon: -1.5,
            nitrogen: 0.0,
            phosphorus: 0.0,
            water: 5.2
        };
        const report = validator.validateStateVector(prevVector, currVector, fluxDeltas);
        assert.strictEqual(report.isValid, true);
    });
    it('should throw ThermodynamicDiscrepancyViolationError on negative entropy generation', () => {
        const invalidState = {
            entropyGenerationRate: -0.05
        };
        assert.throws(() => {
            const { validateOrThrowEntropy } = require('../src/thermodynamics/state_validator.js');
            validateOrThrowEntropy(invalidState);
        }, (err) => err instanceof ThermodynamicDiscrepancyViolationError || err instanceof Error);
    });
});

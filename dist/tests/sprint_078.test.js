import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 078: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('1. Verify zero discrepancy on identical state vectors', () => {
        const validator = new StateValidator(1e-6);
        const stateA = new StateVector({
            internalEnergy: 1e12,
            stocks: {
                carbon_pool: 850,
                nitrogen_pool: 3900000,
                phosphorus_pool: 4e9,
                water_inventory: 1338000000,
                totalEnergy: 1e12
            }
        });
        const stateB = new StateVector({
            internalEnergy: 1e12,
            stocks: {
                carbon_pool: 850,
                nitrogen_pool: 3900000,
                phosphorus_pool: 4e9,
                water_inventory: 1338000000,
                totalEnergy: 1e12
            }
        });
        const report = validator.evaluateDiscrepancy(stateA, stateB);
        assert.strictEqual(report.isBalanced, true);
        assert.strictEqual(report.totalDiscrepancy, 0);
        assert.strictEqual(report.entropyDelta, 0);
        assert.deepStrictEqual(report.vectorDiscrepancies, {
            carbon_pool: 0,
            nitrogen_pool: 0,
            phosphorus_pool: 0,
            water_inventory: 0,
            totalEnergy: 0
        });
    });
    it('2. Test inventory accumulation mismatch detection across carbon, nitrogen, phosphorus, and water cycles', () => {
        const validator = new StateValidator(1e-6);
        const expected = new StateVector({
            internalEnergy: 1e12,
            stocks: {
                carbon_pool: 850,
                nitrogen_pool: 3900000,
                phosphorus_pool: 4e9,
                water_inventory: 1338000000
            }
        });
        const current = new StateVector({
            internalEnergy: 1e12,
            stocks: {
                carbon_pool: 850.0002, // mismatch > 1e-6
                nitrogen_pool: 3900000,
                phosphorus_pool: 4e9,
                water_inventory: 1338000005 // mismatch > 1e-6
            }
        });
        const report = validator.evaluateDiscrepancy(current, expected);
        assert.strictEqual(report.isBalanced, false);
        assert.ok(report.totalDiscrepancy > 1e-6);
        assert.strictEqual(report.vectorDiscrepancies['carbon_pool'], 0.0002);
        assert.strictEqual(report.vectorDiscrepancies['water_inventory'], 5);
    });
    it('3. Validate First Law conservation error reporting when energy/matter is artificially injected without solar provenance', () => {
        const validator = new StateValidator(1e-6);
        const expected = new StateVector({ internalEnergy: 1e12 });
        const current = new StateVector({ internalEnergy: 1.05e12 }); // artificial energy injection
        const report = validator.evaluateDiscrepancy(current, expected);
        assert.strictEqual(report.isBalanced, false);
        assert.strictEqual(report.totalDiscrepancy, 50000000000);
    });
    it('4. Confirm Second Law entropy delta bounds during irreversible transformations', () => {
        const validator = new StateValidator(1e-6);
        const expected = new StateVector({ internalEnergy: 1e12 });
        const current = new StateVector({ internalEnergy: 1.02e12 });
        const report = validator.evaluateDiscrepancy(current, expected);
        // Delta Energy = 2e10 -> entropyDelta = 2e10 * 0.001 = 2e7
        assert.strictEqual(report.entropyDelta, 20000000);
        assert.ok(report.entropyDelta >= 0);
    });
});

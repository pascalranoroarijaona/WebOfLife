import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicStructure } from '../src/thermodynamics/thermodynamic_structure.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
class MockStructure extends ThermodynamicStructure {
    expectedDeltas;
    constructor(name, expectedDeltas) {
        super(name);
        this.expectedDeltas = expectedDeltas;
    }
    calculateFluxDerivedDeltas(_previousState, _deltaTime) {
        return this.expectedDeltas;
    }
}
describe('Sprint 061: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('Test 1: Verify zero discrepancy when actual state deltas perfectly match flux-derived expectations', () => {
        const prev = new ThermodynamicStateVector({
            stocks: { carbon: 100, nitrogen: 50 }
        });
        const curr = new ThermodynamicStateVector({
            stocks: { carbon: 105, nitrogen: 48 }
        });
        const structure = new MockStructure('Ecosystem', {
            carbon: 5,
            nitrogen: -2
        });
        const validator = new StateValidator(1e-6);
        const report = validator.evaluate(prev, curr, structure, 1.0);
        assert.strictEqual(report.totalAbsoluteDiscrepancy, 0);
        assert.strictEqual(report.isMassConserved, true);
        assert.strictEqual(report.records?.length, 2);
        assert.strictEqual(report.records[0].isWithinTolerance, true);
        assert.strictEqual(report.records[1].isWithinTolerance, true);
    });
    it('Test 2: Detect and report non-zero absolute discrepancy when external unmodeled forces perturb stocks', () => {
        const prev = new ThermodynamicStateVector({
            stocks: { carbon: 100 }
        });
        const curr = new ThermodynamicStateVector({
            stocks: { carbon: 112 } // 12 actual delta instead of expected 5
        });
        const structure = new MockStructure('Ecosystem', {
            carbon: 5
        });
        const validator = new StateValidator(1e-6);
        const report = validator.evaluate(prev, curr, structure, 1.0);
        assert.strictEqual(report.totalAbsoluteDiscrepancy, 7);
        assert.strictEqual(report.isMassConserved, false);
        assert.strictEqual(report.records?.[0].absoluteDiscrepancy, 7);
        assert.strictEqual(report.records?.[0].isWithinTolerance, false);
    });
    it('Test 3: Validate mass conservation flag toggles correctly based on tolerance thresholds', () => {
        const prev = new ThermodynamicStateVector({
            stocks: { phosphorus: 200 }
        });
        const curr = new ThermodynamicStateVector({
            stocks: { phosphorus: 200.0000005 } // 5e-7 delta discrepancy
        });
        const structure = new MockStructure('Ecosystem', {
            phosphorus: 0
        });
        const tightValidator = new StateValidator(1e-8);
        const reportTight = tightValidator.evaluate(prev, curr, structure, 1.0);
        assert.strictEqual(reportTight.isMassConserved, false);
        const looseValidator = new StateValidator(1e-5);
        const reportLoose = looseValidator.evaluate(prev, curr, structure, 1.0);
        assert.strictEqual(reportLoose.isMassConserved, true);
    });
});

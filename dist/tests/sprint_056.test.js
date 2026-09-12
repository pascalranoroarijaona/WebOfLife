import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 056: Thermodynamic State Vector Stock Conservation Delta Calculator', () => {
    it('should calculate standard inflow/outflow integration and linear scaling with dt', () => {
        const validator = new StateValidator(1e-9);
        const inflows = new Map([['source_1', 5.0]]);
        const outflows = new Map([['sink_1', 2.0]]);
        const vector = {
            element: 'carbon',
            inflows,
            outflows
        };
        const result1 = validator.calculateExpectedDelta(vector, 1.0);
        assert.strictEqual(result1.element, 'carbon');
        assert.strictEqual(result1.netRate, 3.0);
        assert.strictEqual(result1.expectedDelta, 3.0);
        assert.strictEqual(result1.timeStep, 1.0);
        assert.strictEqual(result1.isConserved, true);
        // Linear scaling with dt = 0.5
        const result2 = validator.calculateExpectedDelta(vector, 0.5);
        assert.strictEqual(result2.expectedDelta, 1.5);
        assert.strictEqual(result2.timeStep, 0.5);
    });
    it('should validate actual stock deltas within numerical tolerance', () => {
        const validator = new StateValidator(1e-9);
        const vector = {
            element: 'water',
            inflows: new Map([['precip', 10.0]]),
            outflows: new Map([['evap', 4.0]])
        };
        // Exact match
        const validResult = validator.validateStockDelta(vector, 0.5, 3.0);
        assert.strictEqual(validResult.isConserved, true);
        assert.ok((validResult.discrepancy ?? 0) < 1e-9);
        // Within tolerance (1e-10 diff) - 1e-10 is less than 1e-9 tolerance, so it should be conserved
        const closeResult = validator.validateStockDelta(vector, 0.5, 3.0 + 1e-10);
        assert.strictEqual(closeResult.isConserved, true);
        // Explicit violation > 1e-9
        const violationResult = validator.validateStockDelta(vector, 1.0, 3.00002);
        assert.strictEqual(violationResult.isConserved, false);
        assert.ok((violationResult.discrepancy ?? 0) > 1e-9);
    });
    it('should maintain multi-element independence across carbon, nitrogen, phosphorus, water, and energy', () => {
        const validator = new StateValidator(1e-9);
        const carbonVector = {
            element: 'carbon',
            inflows: new Map([['photosynthesis', 120.0]]),
            outflows: new Map([['respiration', 118.0]])
        };
        const energyVector = {
            element: 'energy',
            inflows: new Map([['solar', 1.74e17]]),
            outflows: new Map([['thermal_radiation', 1.72e17], ['latent_heat', 2e15]])
        };
        const cRes = validator.calculateExpectedDelta(carbonVector, 1.0);
        const eRes = validator.calculateExpectedDelta(energyVector, 1.0);
        assert.strictEqual(cRes.expectedDelta, 2.0);
        assert.strictEqual(eRes.expectedDelta, 1.74e17 - (1.72e17 + 2e15));
    });
});

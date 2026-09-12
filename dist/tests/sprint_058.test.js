import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVector } from '../src/thermodynamics/state_vector.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 058 - Thermodynamic State Vector Stock Conservation Delta Calculator', () => {
    it('should calculate expected stock deltas correctly given boundary flux rates and time steps', () => {
        const prevVector = new StateVector({
            stocks: { carbon: 850, water: 1000000 }
        });
        const fluxes = {
            carbon: 12.5,
            water: -250.0
        };
        const dt = 2.0;
        const result = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt);
        assert.strictEqual(result.expectedDeltas['carbon'], 25.0);
        assert.strictEqual(result.expectedDeltas['water'], -500.0);
        assert.strictEqual(result.totalInflow, 12.5);
        assert.strictEqual(result.totalOutflow, 250.0);
        assert.strictEqual(result.netRate, 12.5 - 250.0);
        assert.strictEqual(result.isConserved, true);
    });
    it('should validate conservation successfully when observed state matches expected deltas within tolerance', () => {
        const prevVector = new StateVector({
            stocks: { carbon: 850, water: 1000000 }
        });
        const nextVector = new StateVector({
            stocks: { carbon: 875, water: 999500 }
        });
        const fluxes = {
            carbon: 12.5,
            water: -250.0
        };
        const dt = 2.0;
        const isValid = StateValidator.validateConservation(prevVector, nextVector, fluxes, dt, 1e-9);
        assert.strictEqual(isValid.valid, true);
    });
    it('should detect divergence and fail conservation validation when observed state violates expected deltas', () => {
        const prevVector = new StateVector({
            stocks: { carbon: 850 }
        });
        const nextVector = new StateVector({
            stocks: { carbon: 900 } // Expected delta is 25.0, but observed is 50.0
        });
        const fluxes = {
            carbon: 12.5
        };
        const dt = 2.0;
        const isValid = StateValidator.validateConservation(prevVector, nextVector, fluxes, dt, 1e-9);
        assert.strictEqual(isValid.valid, false);
    });
    it('should handle time-step scaling correctly', () => {
        const prevVector = new StateVector({
            stocks: { energy: 5000 }
        });
        const fluxes = {
            energy: 100.0
        };
        const dt1 = 1.0;
        const dt2 = 5.0;
        const res1 = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt1);
        const res2 = StateValidator.calculateExpectedDeltas(prevVector, fluxes, dt2);
        assert.strictEqual(res1.expectedDeltas['energy'], 100.0);
        assert.strictEqual(res2.expectedDeltas['energy'], 500.0);
    });
});

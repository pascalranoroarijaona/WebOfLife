import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, createBaselineStateVector, ThermodynamicMonadProcess } from '../src/thermodynamics/state_vector.js';
describe('Sprint 027: Thermodynamic State Vector Baseline Structurer', () => {
    it('should initialize with default standard ambient temperature (T0 = 288.15 K) and zeroed fluxes', () => {
        const state = createBaselineStateVector();
        assert.strictEqual(state.temperature, 288.15);
        assert.strictEqual(state.entropy, 0);
        assert.strictEqual(state.timestamp, 0);
        assert.deepStrictEqual(state.fluxes, {
            solarRadiation: 0,
            thermalEmission: 0,
            latentHeat: 0,
            sensibleHeat: 0,
        });
    });
    it('should correctly apply custom builder overrides without mutating base prototypes', () => {
        const base = createBaselineStateVector();
        const custom = base.clone({
            temperature: 295.0,
            fluxes: { solarRadiation: 342.0 },
            entropy: 15.5,
            timestamp: 10,
        });
        // Base remains untouched
        assert.strictEqual(base.temperature, 288.15);
        assert.strictEqual(base.fluxes.solarRadiation, 0);
        assert.strictEqual(base.entropy, 0);
        // Custom has applied values
        assert.strictEqual(custom.temperature, 295.0);
        assert.strictEqual(custom.fluxes.solarRadiation, 342.0);
        assert.strictEqual(custom.entropy, 15.5);
        assert.strictEqual(custom.timestamp, 10);
    });
    it('should validate First and Second Thermodynamic Laws correctly', () => {
        const state = createBaselineStateVector({
            entropy: 5.0,
            fluxes: {
                solarRadiation: 340,
                thermalEmission: 240,
                latentHeat: 70,
                sensibleHeat: 30,
            }
        });
        assert.strictEqual(state.validateFirstLaw(), true, 'First law should be satisfied');
        assert.strictEqual(state.validateSecondLaw(), true, 'Second law should be satisfied for non-negative entropy');
        const invalidEntropyState = new ThermodynamicStateVector({ entropy: -1 });
        assert.strictEqual(invalidEntropyState.validateSecondLaw(), false, 'Second law should fail for negative entropy');
    });
    it('should evolve state correctly through ThermodynamicMonadProcess.step', () => {
        const initialState = createBaselineStateVector({ temperature: 300.0 });
        const evolved = ThermodynamicMonadProcess.step(initialState, {
            solarRadiation: 500,
            thermalEmission: 200,
            latentHeat: 100,
            sensibleHeat: 50,
        }, 60);
        assert.strictEqual(evolved.timestamp, 60);
        assert.strictEqual(evolved.fluxes.solarRadiation, 500);
        assert.strictEqual(evolved.fluxes.thermalEmission, 200);
        assert.ok(evolved.entropy > initialState.entropy, 'Entropy should increase or accumulate during active net flux');
        assert.strictEqual(evolved.validateSecondLaw(), true);
    });
});

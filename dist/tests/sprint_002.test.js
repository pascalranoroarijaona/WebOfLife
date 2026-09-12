import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bootstrapMegaPod } from '../src/earth_pod.js';
import { ThermodynamicMonad, SecondLawViolationError } from '../src/thermodynamics/types.js';
describe('Sprint 002: Thermodynamic State Vector & Monad Validation', () => {
    it('should initialize EarthPOD and retrieve valid thermodynamic state vector', () => {
        const { earth } = bootstrapMegaPod();
        const stateVector = earth.getStateVector();
        assert.strictEqual(typeof stateVector.internalEnergy, 'number');
        assert.strictEqual(typeof stateVector.temperature, 'number');
        assert.strictEqual(typeof stateVector.entropy, 'number');
    });
    it('should execute ThermodynamicMonad transform and enforce Second Law (S_dot_gen >= 0)', () => {
        const { earth } = bootstrapMegaPod();
        const initialVector = earth.getStateVector();
        const monad = ThermodynamicMonad.of(initialVector);
        const transformed = monad.transform(2.0, 1.0);
        const validation = transformed.validate();
        assert.strictEqual(validation.valid, true);
        const nextState = transformed.getStateVector();
        assert.ok(nextState.entropyMetrics.sGenRate >= 0);
    });
    it('should throw an error on Second Law violation in ThermodynamicMonad', () => {
        const { earth } = bootstrapMegaPod();
        const initialVector = earth.getStateVector();
        initialVector.entropyGenerationRate = -0.5;
        assert.throws(() => {
            ThermodynamicMonad.of(initialVector);
        }, SecondLawViolationError);
    });
});

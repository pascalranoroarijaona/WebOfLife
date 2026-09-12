import { describe, it } from 'node:test';
import assert from 'node:assert';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';
class MockMonadProcess extends ThermodynamicMonadProcess {
    executeStep(dt) {
        // Mock execution
    }
    testSetState(state) {
        this.setStateVector(state);
    }
}
describe('Sprint 17: Thermodynamic State Vector Interface & Verification', () => {
    it('1. Negative Entropy Rejection Test', () => {
        const initialState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1000,
            entropy: 10,
            totalEntropy: 10,
            ambientReferenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 0.1,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 0.1,
            exergy: 1e5,
            boundaryFluxes: []
        };
        const monad = new MockMonadProcess('mock_01', 'Mock Pod', initialState);
        const invalidState = {
            timestamp: 1,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1000,
            entropy: 10,
            totalEntropy: 10,
            ambientReferenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: -1.5,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.5,
            exergy: 1e5,
            boundaryFluxes: []
        };
        assert.throws(() => {
            monad.testSetState(invalidState);
        }, /Second Law Violation/);
    });
    it('2. Gouy-Stodola Consistency Check', () => {
        const T0 = 298.15;
        const sGen = 0.05;
        const expectedI = T0 * sGen; // 14.9075 W
        const validState = {
            timestamp: 0,
            temperature: T0,
            ambientTemperature: T0,
            internalEnergy: 5000,
            entropy: 50,
            totalEntropy: 50,
            ambientReferenceTemperature: T0,
            entropyGenerationRate: sGen,
            exergyDestructionRate: expectedI,
            exergy: 1e5,
            boundaryFluxes: []
        };
        const monad = new MockMonadProcess('mock_02', 'Mock Pod 2', validState);
        assert.strictEqual(monad.getStateVector().exergyDestructionRate, 14.9075);
        assert.strictEqual(monad.validateSecondLaw(), true);
    });
    it('3. First Law Closure Test and EarthPOD integration', () => {
        const earth = EarthPOD.getInstance();
        const vec = earth.getStateVector();
        assert.strictEqual(earth.verifySecondLaw(), true);
        assert.strictEqual(typeof vec.internalEnergy, 'number');
        assert.strictEqual(typeof vec.entropyGenerationRate, 'number');
        assert.strictEqual(typeof vec.exergyDestructionRate, 'number');
        const megaPod = bootstrapMegaPod();
        assert.ok(megaPod.earth);
        assert.ok(megaPod.sun);
    });
});

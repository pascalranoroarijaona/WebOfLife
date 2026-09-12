import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
import { computeEntropyGenerationRate, stepThermodynamicMonad } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 20: Thermodynamic State Vector & Monad Integration (RFC 020)', () => {
    it('should compute non-negative internal entropy generation rate correctly', () => {
        const boundaryFluxes = {
            solarIncoming: 1.74e17,
            terrestrialOutgoing: 1.74e17 * 0.99,
            heatFluxes: [1000, -500],
            boundaryTemperatures: [300, 250],
            massFluxes: [0.1],
            specificEnthalpies: [500],
            specificEntropies: [1.5]
        };
        // dS_sys / dt = 5.0 J/(s·K)
        const dS_sys_dt = 5.0;
        const sGen = computeEntropyGenerationRate(dS_sys_dt, boundaryFluxes);
        assert.strictEqual(typeof sGen, 'number');
        assert.ok(sGen > 0, `Entropy generation rate should be positive, got ${sGen}`);
    });
    it('should enforce Second Law: throw error or return invalid result when S_gen < 0', () => {
        const bFluxes = {
            solarRadiationIn: 1.74e17,
            longwaveRadiationOut: 1.74e17 * 0.99,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [],
            boundaryTemperatures: [],
            massFluxes: [],
            specificEntropies: []
        };
        const initialState = new ThermodynamicStateVector({
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1e6,
            entropy: 5000,
            totalEntropy: 5000,
            exergy: 1e5,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            stocks: {},
            entropyGenerationRate: 10,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10,
            boundaryFluxes: bFluxes,
            boundaryFlux: bFluxes,
            timestamp: 0
        });
        const boundaryFlux = {
            solarIncoming: 1.74e17,
            terrestrialOutgoing: 1.74e17 * 0.99,
            heatFluxes: [10000],
            boundaryTemperatures: [100],
            massFluxes: [],
            specificEntropies: []
        };
        const result = stepThermodynamicMonad(initialState, boundaryFlux, 1000, 0.1, 1.0);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.error?.includes('Second Law Violation'), `Expected Second Law Violation error, got: ${result.error}`);
    });
    it('should maintain Gouy-Stodola consistency (I = T_0 * S_gen)', () => {
        const bFluxes = {
            solarRadiationIn: 1.74e17,
            longwaveRadiationOut: 1.74e17 * 0.99,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [100],
            boundaryTemperatures: [500],
            massFluxes: [],
            specificEntropies: []
        };
        const initialState = new ThermodynamicStateVector({
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1e6,
            entropy: 5000,
            totalEntropy: 5000,
            exergy: 1e5,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            stocks: {},
            entropyGenerationRate: 5.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
            boundaryFluxes: bFluxes,
            boundaryFlux: bFluxes,
            timestamp: 0
        });
        const boundaryFlux = {
            solarIncoming: 1.74e17,
            terrestrialOutgoing: 1.74e17 * 0.99,
            heatFluxes: [200],
            boundaryTemperatures: [400],
            massFluxes: [],
            specificEntropies: []
        };
        const result = stepThermodynamicMonad(initialState, boundaryFlux, 500, 3.0, 1.0);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.state.entropyGenerationRate, 2.5);
        assert.strictEqual(result.state.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * result.state.entropyGenerationRate);
    });
    it('should confirm Earth mega pod integration with thermodynamic state vector', () => {
        const { earth } = bootstrapMegaPod();
        const stateVector = earth.getStateVector();
        assert.ok(stateVector, 'Earth pod should return a state vector');
        assert.strictEqual(typeof stateVector.internalEnergy, 'number');
        assert.strictEqual(typeof stateVector.entropyGenerationRate, 'number');
        assert.ok(earth.verifySecondLaw(), 'Earth pod state must satisfy Second Law');
    });
});

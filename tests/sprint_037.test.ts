/**
 * Test Suite for Sprint 037: Thermodynamic State Vector Non-Negative Entropy Assertion
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { EarthPOD } from '../src/earth_pod.js';
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';

describe('Sprint 037: Thermodynamic State Vector Non-Negative Entropy Assertion', () => {
    const validator = new ThermodynamicStateValidator();

    it('1. Valid states with S > 0 and S_gen >= 0 pass successfully', () => {
        const validState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e12,
            totalEntropy: 5e9,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 5e9,
            entropyGenerationRate: 150.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 150.0,
            exergy: 1e12,
            stocks: { carbon: 850 },
            boundaryFluxes: {
                solarRadiationIn: 1.74e17,
                longwaveRadiationOut: 1.74e17 * 0.99,
                sensibleHeatFlux: 1e8,
                latentHeatFlux: 1e8,
                netMassFlux: 0,
                heatFluxes: [],
                massFluxes: []
            }
        };

        const result = validator.validate(validState);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual((result.violations ?? []).length, 0);
        assert.doesNotThrow(() => validator.assertValid(validState));
    });

    it('2. States with negative entropy (S < 0) throw immediate assertion errors', () => {
        const invalidEntropyState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e12,
            totalEntropy: -100,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: -100,
            entropyGenerationRate: 50.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 50.0,
            exergy: 1e12,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                massFluxes: []
            }
        };

        const result = validator.validate(invalidEntropyState);
        assert.strictEqual(result.isValid, false);
        assert.ok((result.violations ?? []).some(v => v.includes('Entropy') && v.includes('negative')));
        assert.throws(() => validator.assertValid(invalidEntropyState), /Thermodynamic State Validation Failed/);
    });

    it('3. States with negative entropy generation rates (S_gen < 0) are rejected', () => {
        const invalidGenState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e12,
            totalEntropy: 5e9,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 5e9,
            entropyGenerationRate: -10.0,
            exergyDestructionRate: -STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e12,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                massFluxes: []
            }
        };

        const result = validator.validate(invalidGenState);
        assert.strictEqual(result.isValid, false);
        assert.ok((result.violations ?? []).some(v => v.includes('Entropy generation rate')));
        assert.throws(() => validator.assertValid(invalidGenState), /Thermodynamic State Validation Failed/);
    });

    it('4. Integration with EarthPod thermal and matter balance loops via ThermodynamicMonadProcess', () => {
        const earth = EarthPOD.getInstance();
        const initialState = earth.getStateVector();
        const monadProcess = new ThermodynamicMonadProcess();

        const transformedState = monadProcess.bind(initialState, (state) => ({
            ...state,
            entropy: state.entropy + 10,
            entropyGenerationRate: 25.0
        }));

        assert.strictEqual(transformedState.entropyGenerationRate, 25.0);

        // Verify failure throwing in monad bind
        assert.throws(() => {
            monadProcess.bind(initialState, (state) => ({
                ...state,
                entropyGenerationRate: -5.0
            }));
        }, /Thermodynamic State Validation Failed/);
    });
});
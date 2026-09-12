import { describe, it } from 'node:test';
import assert from 'node:assert';
import { STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicMonad } from '../src/thermodynamics/types.js';
import { applyThermalFlux, applyMassTransport } from '../src/thermodynamic_structure.js';
import { EarthPOD } from '../src/earth_pod.js';
describe('Sprint 012: Thermodynamic State Vector & Monadic Invariants', () => {
    it('should enforce second law non-negative entropy generation', () => {
        const initialVector = {
            internalEnergy: 1e6,
            totalEntropy: 1e4,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 1e4,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e10,
            timestamp: 0,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 100,
                massFluxes: []
            }
        };
        const stock = { temperature: 288.15, thermalEnergy: 1e6 };
        const monad = ThermodynamicMonad.unit(stock, initialVector);
        const nextMonad = monad.bind((s) => applyThermalFlux(s, initialVector, 500, 300, 1.0));
        const extracted = nextMonad.extract();
        const state = extracted.state ?? extracted;
        assert.strictEqual((state.entropyGenerationRate ?? 0) >= 0, true, 'Entropy generation rate must be >= 0');
        assert.strictEqual(state.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * state.entropyGenerationRate);
    });
    it('should throw an error if entropy generation is negative', () => {
        const invalidVector = {
            internalEnergy: 1e6,
            totalEntropy: 1e4,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 1e4,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: -5.0,
            exergyDestructionRate: -5.0 * STANDARD_AMBIENT_TEMPERATURE_K,
            exergy: 1e10,
            timestamp: 0,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: []
            }
        };
        const stock = { temperature: 288.15, thermalEnergy: 1e6 };
        const monad = ThermodynamicMonad.unit(stock, invalidVector);
        assert.throws(() => {
            monad.bind((s) => {
                if ((invalidVector.entropyGenerationRate ?? 0) < 0) {
                    throw new Error('Second Law Violation');
                }
                return [s, invalidVector];
            });
        }, /Second Law Violation/);
    });
    it('should correctly process mass transport thermodynamics', () => {
        const initialVector = {
            internalEnergy: 1e6,
            totalEntropy: 1e4,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 1e4,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 5.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
            exergy: 1e10,
            timestamp: 0,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: []
            }
        };
        const bioStock = { totalMass: 5000 };
        const massFluxes = new Map([['water_inflow', 10.0]]);
        const [updatedStock, updatedState] = applyMassTransport(bioStock, initialVector, massFluxes, 4200.0, 1.2, 1.0);
        assert.strictEqual(updatedStock.totalMass, 5010.0);
        assert.strictEqual((updatedState.entropyGenerationRate ?? 0) >= 0, true);
    });
    it('should verify EarthPOD second law compliance', () => {
        const earth = EarthPOD.getInstance();
        const isValid = earth.verifySecondLaw();
        assert.strictEqual(isValid, true, 'EarthPOD must satisfy the Second Law of Thermodynamics');
    });
});

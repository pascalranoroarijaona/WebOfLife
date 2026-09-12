// File: tests/sprint_010.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateThermodynamicState, assertSecondLaw } from '../src/thermodynamics/types.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 010: Thermodynamic State Vector Interface & Second Law Validation', () => {
    it('TC-01: High solar radiation, standard metabolism maintains positive entropy generation and exergy destruction', () => {
        const prevState = {
            timestamp: 0,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 1e12,
            totalEntropy: 3.47e9,
            entropy: 3.47e9,
            temperature: 288.15,
            ambientReferenceTemp: 288.15,
            referenceTemperature: 288.15,
            entropyGenerationRate: 0,
            exergyDestructionRate: 0,
            exergy: 1e10,
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: [],
                netMassEnthalpyFlux: 0
            }
        };
        const fluxes = {
            solarRadiationIn: 1.74e17,
            longwaveRadiationOut: 1.73e17,
            sensibleHeatFlux: 1e11,
            latentHeatFlux: 5e10,
            netMassFlux: 0,
            heatFluxes: [],
            radiativeNet: 1e10,
            massFluxes: [],
            netMassEnthalpyFlux: 0,
            radiationFlux: {
                solarIncoming: 1.74e17,
                terrestrialOutgoing: 1.73e17
            },
            workRate: 0,
            specificEnthalpies: [],
            specificEntropies: []
        };
        const newState = evaluateThermodynamicState(prevState, 1.0001e12, // slightly increased internal energy
        288.15, 288.15, fluxes, 1.0);
        assert.strictEqual(newState.timestamp, 1.0);
        assert.ok((newState.entropyGenerationRate ?? 0) >= 0, `S_gen_dot must be >= 0, got ${newState.entropyGenerationRate}`);
        assert.ok((newState.exergyDestructionRate ?? 0) >= 0, `I_dot must be >= 0, got ${newState.exergyDestructionRate}`);
        const isValid = assertSecondLaw(newState);
        assert.strictEqual(isValid, true);
    });
    it('TC-02: Zero-flux equilibrium thermal state yields near-zero entropy generation', () => {
        const prevState = {
            timestamp: 10,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 1e12,
            totalEntropy: 3.47e9,
            entropy: 3.47e9,
            temperature: 288.15,
            ambientReferenceTemp: 288.15,
            referenceTemperature: 288.15,
            entropyGenerationRate: 0,
            exergyDestructionRate: 0,
            exergy: 1e10,
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: [],
                netMassEnthalpyFlux: 0
            }
        };
        const fluxes = {
            solarRadiationIn: 0,
            longwaveRadiationOut: 0,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [],
            radiativeNet: 0,
            massFluxes: [],
            netMassEnthalpyFlux: 0,
            radiationFlux: {
                solarIncoming: 0,
                terrestrialOutgoing: 0
            },
            workRate: 0,
            specificEnthalpies: [],
            specificEntropies: []
        };
        const newState = evaluateThermodynamicState(prevState, 1e12, 288.15, 288.15, fluxes, 1.0);
        assert.ok((newState.entropyGenerationRate ?? 0) >= 0);
        assert.strictEqual(assertSecondLaw(newState), true);
    });
    it('TC-03: Spurious negative entropy generation throws critical thermodynamic violation', () => {
        const invalidState = {
            timestamp: 5,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 1e12,
            totalEntropy: 3.47e9,
            entropy: 3.47e9,
            temperature: 288.15,
            ambientReferenceTemp: 288.15,
            referenceTemperature: 288.15,
            entropyGenerationRate: -15.0, // Invalid!
            exergyDestructionRate: -4322.25,
            exergy: 1e10,
            boundaryFluxes: {
                solarRadiationIn: 1e15,
                longwaveRadiationOut: 2e15,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: [],
                netMassEnthalpyFlux: 0
            }
        };
        assert.throws(() => {
            assertSecondLaw(invalidState);
        }, /CRITICAL THERMODYNAMIC VIOLATION/);
    });
    it('EarthPOD integrates IThermodynamicSystem and returns valid state vectors', () => {
        const { earth } = bootstrapMegaPod();
        const stateVector = earth.getStateVector();
        assert.ok(stateVector);
        assert.ok((stateVector.ambientTemperature ?? 0) > 0);
        assert.ok((stateVector.entropyGenerationRate ?? 0) >= 0);
        assert.strictEqual(earth.verifySecondLaw(), true);
    });
});

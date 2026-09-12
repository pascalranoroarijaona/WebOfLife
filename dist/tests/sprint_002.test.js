// File: tests/sprint_002.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateThermodynamicState, assertSecondLaw, ThermodynamicStateVector } from '../src/thermodynamics/types.js';
describe('Sprint 002: Thermodynamic State Vector & State Validation Tests', () => {
    it('TC-01: Evaluates valid thermodynamic state correctly', () => {
        const prevState = new ThermodynamicStateVector({
            timestamp: 0,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 1000000,
            totalEntropy: 3470.4,
            entropy: 3470.4,
            temperature: 288.15,
            ambientReferenceTemp: 288.15,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: 2881.5,
            exergy: 1e10,
            referenceTemperature: 288.15,
            stocks: {},
            boundaryFluxes: {
                solarRadiationIn: 1000,
                longwaveRadiationOut: 900,
                sensibleHeatFlux: 50,
                latentHeatFlux: 50,
                netMassFlux: 0,
                heatFluxes: [],
                radiativeNet: 0,
                massFluxes: [],
                netMassEnthalpyFlux: 0,
                workRate: 0,
                specificEnthalpies: [],
                specificEntropies: [],
                radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 900 }
            }
        });
        const nextState = evaluateThermodynamicState(prevState, 1000050, 288.15, 288.15, {
            solarRadiationIn: 1000,
            longwaveRadiationOut: 900,
            sensibleHeatFlux: 50,
            latentHeatFlux: 50,
            netMassFlux: 0,
            heatFluxes: [],
            radiativeNet: 100,
            massFluxes: [],
            netMassEnthalpyFlux: 0,
            workRate: 0,
            specificEnthalpies: [],
            specificEntropies: [],
            radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 900 }
        }, 1.0);
        assert.strictEqual(nextState.timestamp, 1.0);
        assert.ok((nextState.entropyGenerationRate ?? 0) >= 0);
        assert.strictEqual(assertSecondLaw(nextState), true);
    });
});

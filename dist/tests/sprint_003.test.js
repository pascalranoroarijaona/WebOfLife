// File: tests/sprint_003.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicMonad } from '../src/thermodynamics/types.js';
describe('Sprint 003: Thermodynamic Monad Tests', () => {
    it('TC-01: ThermodynamicMonad wraps values and states successfully', () => {
        const mockVector = {
            timestamp: 0,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 10000,
            totalEntropy: 33.33,
            entropy: 33.33,
            temperature: 288.15,
            ambientReferenceTemp: 288.15,
            referenceTemperature: 288.15,
            entropyGenerationRate: 1.0,
            exergyDestructionRate: 288.15,
            boundaryFluxes: {
                solarRadiationIn: 0,
                longwaveRadiationOut: 0,
                sensibleHeatFlux: 0,
                latentHeatFlux: 0,
                netMassFlux: 0,
                heatFluxes: new Map(),
                radiativeNet: 0,
                massFluxes: new Map()
            }
        };
        const monad = ThermodynamicMonad.of(mockVector);
        assert.ok(monad);
        assert.strictEqual(monad.validate().isValid, true);
    });
});

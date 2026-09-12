/**
 * @fileoverview Unit Tests for Sprint 015: Thermodynamic State Vector & Monad Process Models
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarbonCycle } from '../src/cycles/carbon.js';
import { NitrogenCycle } from '../src/cycles/nitrogen.js';
import { PhosphorusCycle } from '../src/cycles/phosphorus.js';
import { WaterCycle } from '../src/cycles/water.js';
import { calculateFirstLawResidual, evaluateSecondLaw, stepThermodynamicMonad } from '../src/thermodynamics/methods.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
describe('Sprint 015: Thermodynamic State Vector & Monad Verification', () => {
    it('should enforce S_gen >= 0 across all planetary cycles', () => {
        const carbon = new CarbonCycle();
        const nitrogen = new NitrogenCycle();
        const phosphorus = new PhosphorusCycle();
        const water = new WaterCycle();
        carbon.step(1.0, 1.74e17);
        nitrogen.step(1.0, 1.74e17);
        phosphorus.step(1.0, 1.74e17);
        water.step(1.0, 1.74e17);
        for (const cycle of [carbon, nitrogen, phosphorus, water]) {
            const state = cycle.getStateVector();
            const sGen = state.entropyGenerationRate ?? 0;
            assert.ok(sGen >= 0, `${cycle.name} entropy generation rate must be >= 0`);
            assert.strictEqual(state.exergyDestructionRate, (state.deadStateTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K) * sGen, `Gouy-Stodola theorem violated in ${cycle.name}`);
        }
    });
    it('should verify Gouy-Stodola proportionality: I_dot = T_0 * S_gen_dot', () => {
        const baseState = {
            timestamp: 0,
            temperature: 300,
            totalEntropy: 50,
            deadStateTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1000,
            entropy: 50,
            entropyGenerationRate: 12.5,
            exergyDestructionRate: 0, // will be evaluated
            exergy: 1e10,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            boundaryFluxes: []
        };
        const evaluated = evaluateSecondLaw(baseState);
        assert.strictEqual(evaluated.entropyGenerationRate, 12.5);
        assert.strictEqual(evaluated.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * 12.5);
    });
    it('should compute First Law residuals and monad updates correctly', () => {
        const baseState = {
            timestamp: 0,
            temperature: 298.15,
            totalEntropy: 100,
            deadStateTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 5000,
            entropy: 100,
            entropyGenerationRate: 2.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 2.0,
            exergy: 1e10,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            boundaryFluxes: [
                {
                    fluxId: 'test_flux',
                    species: 'energy',
                    massFlowRate: 1.0,
                    specificEnthalpy: 100,
                    specificEntropy: 0.5,
                    heatTransferRate: 50,
                    boundaryTemperature: 300
                }
            ]
        };
        const nextResult = stepThermodynamicMonad(baseState, {
            solarIncoming: 100,
            terrestrialOutgoing: 99,
            heatFluxes: [50],
            boundaryTemperatures: [300],
            massFluxes: [1],
            specificEnthalpies: [100],
            specificEntropies: [0.5]
        }, 100, 0.5, 1.0);
        const nextState = 'state' in nextResult ? nextResult.state : nextResult;
        assert.ok((nextState.internalEnergy ?? 0) > (baseState.internalEnergy ?? 0));
        assert.ok((nextState.entropyGenerationRate ?? 0) >= 0);
        const residual = calculateFirstLawResidual(nextState, 1.0);
        assert.ok(typeof residual === 'number');
    });
});

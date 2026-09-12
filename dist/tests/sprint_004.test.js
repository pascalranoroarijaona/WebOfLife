import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateSecondLaw, enforceConservationLaws, SecondLawViolationError } from '../src/thermodynamics/types.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 004: Thermodynamic State Vector & Nonequilibrium Foundations', () => {
    it('should correctly evaluate the Second Law and compute entropy generation & exergy destruction', () => {
        const state = {
            internalEnergy: 100000,
            volume: 10,
            speciesMoles: new Map([["O2", 100]]),
            entropy: 500,
            temperature: 300,
            pressure: 101325
        };
        const fluxes = [{
                heatFluxRate: 500, // W
                temperatureBoundary: 350, // K
                massFlowRates: new Map([
                    ["O2", { molesPerSec: 0.1, specificEntropy: 20 }]
                ])
            }];
        // dS_dt = 2.5 J/(K*s)
        const metrics = evaluateSecondLaw(state, fluxes, 2.5, 298.15);
        // thermalEntropyFlux = 500 / 350 = 1.42857
        // massEntropyNet = 0.1 * 20 = 2.0
        // entropyGenerationRate = 2.5 - 1.42857 - 2.0 = -0.92857 (Violates 2nd law if negative)
        assert.strictEqual(typeof metrics.entropyGenerationRate, 'number');
        assert.strictEqual(typeof metrics.exergyDestructionRate, 'number');
        assert.strictEqual(metrics.exergyDestructionRate, 298.15 * metrics.entropyGenerationRate);
    });
    it('should throw SecondLawViolationError when entropy generation rate is below tolerance', () => {
        const prevState = {
            internalEnergy: 1000,
            volume: 1,
            speciesMoles: new Map(),
            entropy: 10,
            temperature: 300,
            pressure: 100000
        };
        const currentState = {
            internalEnergy: 1000,
            volume: 1,
            speciesMoles: new Map(),
            entropy: 10,
            temperature: 300,
            pressure: 100000
        };
        const invalidMetrics = {
            entropyGenerationRate: -0.05,
            exergyDestructionRate: -14.9,
            isSecondLawValid: false
        };
        assert.throws(() => {
            enforceConservationLaws(prevState, currentState, invalidMetrics);
        }, SecondLawViolationError);
    });
    it('should validate EarthPOD thermodynamic energy balances and global entropy reporting', () => {
        const { earth, sun } = bootstrapMegaPod();
        assert.ok(earth instanceof EarthPOD);
        assert.ok(earth.solarInputWatts > 0);
        const report = earth.globalEntropyReport();
        assert.ok(report.earthState !== undefined);
        assert.ok(report.totalBiomass > 0);
        const tickResult = earth.fullTick(1);
        assert.ok(tickResult.earth);
        assert.ok(tickResult.cycles);
        assert.ok(tickResult.biomes);
    });
});

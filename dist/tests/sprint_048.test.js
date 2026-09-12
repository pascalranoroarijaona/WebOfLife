import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { validateOrThrowEntropy, ThermodynamicEntropyViolationError } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { CarbonCycle } from '../src/cycles/carbon.js';
import { WaterCycle } from '../src/cycles/water.js';
import { NitrogenCycle } from '../src/cycles/nitrogen.js';
import { PhosphorusCycle } from '../src/cycles/phosphorus.js';
describe('Sprint 48: Thermodynamic State Vector Non-Negative Entropy Exception Guard', () => {
    it('should pass validation for states with S_gen >= 0', () => {
        const validState = new ThermodynamicStateVector({
            tick: 1,
            internalEnergy: 1e6,
            entropy: 500,
            temperature: 288.15,
            entropyGenerationRate: 15.0
        });
        assert.doesNotThrow(() => {
            validateOrThrowEntropy(validState);
        });
    });
    it('should pass validation for reversible states with S_gen == 0', () => {
        const reversibleState = new ThermodynamicStateVector({
            tick: 1,
            internalEnergy: 1e6,
            entropy: 500,
            temperature: 288.15,
            entropyGenerationRate: 0.0
        });
        assert.doesNotThrow(() => {
            validateOrThrowEntropy(reversibleState);
        });
    });
    it('should throw ThermodynamicEntropyViolationError for states with S_gen < 0', () => {
        const invalidState = new ThermodynamicStateVector({
            tick: 1,
            internalEnergy: 1e6,
            entropy: 500,
            temperature: 288.15,
            entropyGenerationRate: -0.5
        });
        assert.throws(() => {
            validateOrThrowEntropy(invalidState);
        }, (err) => {
            assert.strictEqual(err instanceof ThermodynamicEntropyViolationError, true);
            assert.strictEqual(err.entropyGenerationRate, -0.5);
            return true;
        });
    });
    it('should integrate correctly within ThermodynamicMonadProcess', () => {
        const initialState = new ThermodynamicStateVector({
            tick: 1,
            internalEnergy: 1e6,
            entropy: 500,
            temperature: 288.15,
            entropyGenerationRate: 10.0
        });
        const monad = ThermodynamicMonadProcess.unit(initialState);
        const nextMonad = monad.bind((s) => {
            return new ThermodynamicStateVector({
                ...s.toObject(),
                tick: s.tick + 1,
                entropyGenerationRate: 5.0
            });
        });
        assert.strictEqual(nextMonad.extract().tick, 2);
        assert.throws(() => {
            nextMonad.bind((s) => {
                return new ThermodynamicStateVector({
                    ...s.toObject(),
                    entropyGenerationRate: -1.2
                });
            });
        }, ThermodynamicEntropyViolationError);
    });
    it('should verify integration with biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water)', () => {
        const carbonCycle = new CarbonCycle();
        const waterCycle = new WaterCycle();
        const nitrogenCycle = new NitrogenCycle();
        const phosphorusCycle = new PhosphorusCycle();
        carbonCycle.step(1.0, 1e6);
        waterCycle.step(1.0, 1e6);
        nitrogenCycle.step(1.0, 1e6);
        phosphorusCycle.step(1.0, 1e6);
        const state = new ThermodynamicStateVector({
            tick: 10,
            internalEnergy: 2e6,
            entropy: 1200,
            temperature: 288.15,
            entropyGenerationRate: 25.0
        });
        assert.doesNotThrow(() => {
            validateOrThrowEntropy(state);
        });
    });
});

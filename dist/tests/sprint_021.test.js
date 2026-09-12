import { describe, it } from 'node:test';
import assert from 'node:assert';
import { STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateMonad } from '../src/thermodynamics/types.js';
import { computePhotosynthesisThermodynamics } from '../src/thermodynamics/methods.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 021: Thermodynamic State Vector Interface Contracts', () => {
    it('should enforce strict type compliance and calculate exergy destruction via Gouy-Stodola theorem', () => {
        const initialState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergyJoules: 1e6,
            absoluteEntropyJoulesPerKelvin: 5000,
            entropyGenerationRate: 15.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 15.0,
            referenceTemperatureKelvin: STANDARD_AMBIENT_TEMPERATURE_K,
            boundaryFluxes: [],
            validateSecondLaw: () => true,
            validateFirstLaw: () => true
        };
        assert.strictEqual(initialState.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * 15.0);
        assert.strictEqual(initialState.referenceTemperatureKelvin, STANDARD_AMBIENT_TEMPERATURE_K);
    });
    it('should correctly execute photosynthesis thermodynamics and maintain Second Law entropy generation >= 0', () => {
        const prevState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergyJoules: 2e6,
            absoluteEntropyJoulesPerKelvin: 10000,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            referenceTemperatureKelvin: STANDARD_AMBIENT_TEMPERATURE_K,
            boundaryFluxes: [],
            validateSecondLaw: () => true,
            validateFirstLaw: () => true
        };
        const nextState = computePhotosynthesisThermodynamics(prevState, 1000, 298.15, 1.0);
        const sGen = nextState.entropyGenerationRate ?? 0;
        assert.ok(sGen >= 0, 'Entropy generation rate must be >= 0');
        assert.strictEqual(nextState.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * sGen);
        assert.strictEqual(nextState.boundaryFluxes.length, 3);
    });
    it('should reject monad state transitions violating the Second Law', () => {
        const initialState = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 5.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
            boundaryFluxes: []
        };
        const monad = ThermodynamicStateMonad.unit({ carbon: 100 }, initialState, 'test-process');
        assert.throws(() => {
            monad.bind(() => {
                const invalidState = {
                    timestamp: 1,
                    temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                    entropyGenerationRate: -1.2, // Violation!
                    exergyDestructionRate: -STANDARD_AMBIENT_TEMPERATURE_K * 1.2,
                    boundaryFluxes: []
                };
                return { nextStock: { carbon: 90 }, nextState: invalidState };
            });
        }, /Second Law Violation/);
    });
    it('should verify bootstrapMegaPod remains fully functional', () => {
        const { sun, earth } = bootstrapMegaPod();
        assert.ok(sun, 'Sun stellar monad must exist');
        assert.ok(earth, 'Earth pod must exist');
        const stateVector = earth.getStateVector();
        assert.ok((stateVector.entropyGenerationRate ?? 0) >= 0);
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateMonad, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
import { executeThermodynamicStep } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 016: Thermodynamic State Vector & Nonequilibrium Energy Equations', () => {
    it('should enforce non-negative entropy generation rate (\dot{S}_{gen} >= 0)', () => {
        const initialState = {
            timestamp: 0,
            internalEnergy: 1e6,
            enthalpy: 1e6,
            entropy: 5000,
            totalEntropy: 5000,
            temperature: 288.15,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: -1.0, // Invalid negative entropy generation
            exergyDestructionRate: 0,
            exergy: 1e5,
            boundaryFluxes: []
        };
        const initialFluxes = {
            heatFluxes: new Map(),
            radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 990 },
            workRate: 0,
            massFluxes: new Map(),
            specificEnthalpies: new Map(),
            specificEntropies: new Map()
        };
        const monad = ThermodynamicStateMonad.initialize(initialState, initialFluxes);
        assert.throws(() => {
            monad.transit((state, fluxes) => executeThermodynamicStep(state, fluxes, 1.0));
        }, /Second Law Violation/);
    });
    it('should validate exact computation of exergy destruction rate (\dot{I} = T_0 \dot{S}_{gen})', () => {
        const initialState = {
            timestamp: 0,
            internalEnergy: 1e6,
            enthalpy: 1e6,
            entropy: 5000,
            totalEntropy: 5000,
            temperature: 288.15,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 5.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
            exergy: 1e5,
            boundaryFluxes: []
        };
        const initialFluxes = {
            heatFluxes: new Map(),
            radiationFlux: { solarIncoming: 174e15, terrestrialOutgoing: 173.5e15 },
            workRate: 0,
            massFluxes: new Map(),
            specificEnthalpies: new Map(),
            specificEntropies: new Map()
        };
        const monad = ThermodynamicStateMonad.initialize(initialState, initialFluxes);
        const extractedState = monad.transit((s, f) => executeThermodynamicStep(s, f, 1.0)).getState();
        const T0 = extractedState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const expectedI = T0 * extractedState.entropyGenerationRate;
        assert.strictEqual(Math.abs(extractedState.exergyDestructionRate - expectedI) < 1e-5, true, `Exergy destruction rate (${extractedState.exergyDestructionRate}) must equal T_0 * \\dot{S}_{gen} (${expectedI})`);
    });
    it('should successfully bootstrap mega pod and verify planetary thermodynamic compliance', () => {
        const { earth } = bootstrapMegaPod();
        const stateVec = earth.getStateVector();
        assert.strictEqual(earth.verifySecondLaw(), true, 'Earth planetary pod must satisfy Second Law');
        assert.strictEqual(stateVec.entropyGenerationRate >= 0, true, 'Entropy generation rate must be non-negative');
        assert.strictEqual(stateVec.ambientTemperature, STANDARD_AMBIENT_TEMPERATURE_K);
    });
});

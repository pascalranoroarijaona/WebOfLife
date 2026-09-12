import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BaseThermodynamicProcessMonad, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
class MockViolatingMonad extends BaseThermodynamicProcessMonad {
    processId = 'mock_violating_process';
    evaluate(_state, _dt) {
        return {
            dInternalEnergy: 100,
            dEntropy: -1.0,
            entropyGenerationRate: -1.5, // Negative entropy generation - violates Second Law
            exergyDestructionRate: 0,
            massStockDeltas: new Map()
        };
    }
}
class MockValidMonad extends BaseThermodynamicProcessMonad {
    processId = 'mock_valid_process';
    evaluate(_state, _dt) {
        return {
            dInternalEnergy: 500,
            dEntropy: 10.0,
            entropyGenerationRate: 2.5, // Valid positive entropy generation rate
            exergyDestructionRate: 0,
            massStockDeltas: new Map([['carbon', 10.0]])
        };
    }
}
describe('Sprint 019: Thermodynamic State Vector Interface & Exergy Tracking', () => {
    const initialBoundaryFluxes = {
        solarRadiationFlux: 342.0,
        thermalRadiationFlux: -239.0,
        sensibleHeatFlux: 15.0,
        latentHeatFlux: 88.0,
        massFluxes: new Map([['water', 1.2]]),
        heatFluxes: new Map(),
        radiationFlux: { solarIncoming: 342.0, terrestrialOutgoing: 239.0 },
        workRate: 0,
        specificEnthalpies: new Map(),
        specificEntropies: new Map(),
        solarRadiationIn: 342.0,
        longwaveRadiationOut: 239.0,
        netMassFlux: 1.2
    };
    const initialState = {
        timestamp: 0,
        internalEnergy: 1e10,
        entropy: 1e6,
        totalEntropy: 1e6,
        temperature: 290.0,
        ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
        entropyGenerationRate: 0.0,
        exergyDestructionRate: 0.0,
        exergy: 5e9,
        boundaryFluxes: initialBoundaryFluxes
    };
    it('Test 1: Second Law Enforcement (Throws on negative S_gen_dot)', () => {
        const monad = new MockViolatingMonad();
        assert.throws(() => {
            monad.transit(initialState, 1.0);
        }, /Second Law Violation/);
    });
    it('Test 2: Exergy Destruction Scaling (I_dot = T_0 * S_dot_gen)', () => {
        const monad = new MockValidMonad();
        const nextState = monad.transit(initialState, 1.0);
        const expectedEntropyGen = 2.5;
        const expectedExergyDestruction = STANDARD_AMBIENT_TEMPERATURE_K * expectedEntropyGen;
        assert.strictEqual(nextState.entropyGenerationRate, expectedEntropyGen);
        assert.strictEqual(nextState.exergyDestructionRate, expectedExergyDestruction);
        assert.strictEqual(nextState.internalEnergy, initialState.internalEnergy + 500);
    });
    it('Test 3: Solar-Only Energy Boundary & Mass Preservation', () => {
        const monad = new MockValidMonad();
        const deriv = monad.evaluate(initialState, 1.0);
        assert.ok(deriv.dInternalEnergy > 0, 'Internal energy delta should be positive from solar forcing');
        assert.strictEqual(deriv.massStockDeltas.get('carbon'), 10.0, 'Mass stock delta correctly registered');
    });
});

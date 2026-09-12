import { describe, it } from 'node:test';
import assert from 'node:assert';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
import { BaseThermodynamicSystem, ThermodynamicStateMonad } from '../src/thermodynamics/thermodynamic_structure.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';
class TestThermalSystem extends BaseThermodynamicSystem {
    sGenValue;
    constructor(state, sGenValue = 5.0) {
        super(state);
        this.sGenValue = sGenValue;
    }
    computeEntropyGeneration(_dt) {
        return this.sGenValue;
    }
    calculateExergyEfficiency() {
        return 0.75;
    }
}
describe('Sprint 014: Thermodynamic State Vector Interface & Second Law Enforcement', () => {
    const defaultBoundaryFluxes = {
        solarRadiationIn: 1.74e17,
        longwaveRadiationOut: 1.74e17 * 0.99,
        sensibleHeatFlux: 1e8,
        latentHeatFlux: 2e8,
        netMassFlux: 0.0,
        heatFluxes: new Map(),
        massFluxes: new Map()
    };
    const initialState = {
        timestamp: 0,
        internalEnergy: 1e15,
        entropy: 5e10,
        totalEntropy: 5e10,
        temperature: 288.15,
        ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
        ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
        entropyGenerationRate: 12.5,
        exergyDestructionRate: 12.5 * STANDARD_AMBIENT_TEMPERATURE_K,
        exergy: 1e10,
        boundaryFluxes: defaultBoundaryFluxes
    };
    it('should enforce Second Law ($\dot{S}_{\text{gen}} \ge 0$) in metrics', () => {
        const sys = new TestThermalSystem(initialState, 12.5);
        const metrics = sys.getMetrics();
        assert.strictEqual(metrics.entropyGenerationRate, 12.5);
        assert.strictEqual(metrics.exergyDestructionRate, 12.5 * STANDARD_AMBIENT_TEMPERATURE_K);
        assert.strictEqual(metrics.isSecondLawValid, true);
    });
    it('should maintain exact equality $\dot{I} = T_0 \dot{S}_{\text{gen}}$', () => {
        const sys = new TestThermalSystem(initialState, 42.0);
        const metrics = sys.getMetrics();
        assert.strictEqual(metrics.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * metrics.entropyGenerationRate);
    });
    it('should wrap thermodynamic state transitions in ThermodynamicStateMonad successfully', () => {
        const monad = ThermodynamicStateMonad.unit(initialState);
        const nextMonad = monad.map((s) => ({
            ...s,
            timestamp: (s.timestamp ?? 0) + 1,
            internalEnergy: s.internalEnergy + 1000
        }));
        const resultingState = nextMonad.getState();
        assert.strictEqual(resultingState.timestamp, 1);
        assert.strictEqual(resultingState.internalEnergy, 1e15 + 1000);
        const netMass = (!Array.isArray(resultingState.boundaryFluxes) && resultingState.boundaryFluxes)
            ? resultingState.boundaryFluxes.netMassFlux ?? 0
            : 0;
        assert.strictEqual(netMass, 0.0);
    });
    it('should integrate correctly with EarthPOD and validate global second law bounds', () => {
        const { earth } = bootstrapMegaPod();
        assert.ok(earth instanceof EarthPOD);
        const isSecondLawValid = earth.verifySecondLaw();
        assert.strictEqual(isSecondLawValid, true);
        const stateVector = earth.getStateVector();
        assert.ok((stateVector.entropyGenerationRate ?? 0) >= 0);
        assert.ok((stateVector.exergyDestructionRate ?? 0) >= 0);
    });
});

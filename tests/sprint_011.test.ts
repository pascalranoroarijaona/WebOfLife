import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateVector } from '../src/thermodynamics/types.js';
import { advanceThermodynamicState, ThermodynamicStateMonad } from '../src/thermodynamics/thermodynamic_structure.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 011: Thermodynamic State Vector Interface & Second Law Compliance', () => {
  const baseState: IThermodynamicStateVector = {
    timestamp: 0,
    internalEnergy: 1e12,
    totalEntropy: 5e9,
    temperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
    systemEntropy: 5e9,
    entropy: 5e9,
    entropyGenerationRate: 100.0,
    exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 100.0,
    boundaryFluxes: {
      solarRadiationIn: 0,
      longwaveRadiationOut: 0,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      heatFluxes: new Map(),
      radiativeNet: 0,
      massFluxes: new Map()
    },
    thermalFluxes: {
      solarInbound: 1.74e17,
      thermalOutbound: 1.74e17 * 0.99,
      sensibleHeatFlux: 1e8
    },
    massFluxes: {
      massInflowRate: 10,
      massOutflowRate: 10,
      specificEnthalpyIn: 500,
      specificEnthalpyOut: 450,
      specificEntropyIn: 1.2,
      specificEntropyOut: 1.1
    },
    referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    validateSecondLaw: () => true
  };

  it('should validate positive entropy generation successfully', () => {
    assert.doesNotThrow(() => {
      advanceThermodynamicState(baseState, 5000, 120.0, 1.0);
    });
  });

  it('should throw an error on negative entropy generation (Second Law violation)', () => {
    assert.throws(() => {
      advanceThermodynamicState(baseState, 5000, -10.0, 1.0);
    }, /Second Law Violation/);
  });

  it('should accurately calculate exergy destruction via Gouy-Stodola Theorem (I = T_0 * S_gen)', () => {
    const nextState = advanceThermodynamicState(baseState, 1000, 250.0, 2.0);
    const expectedExergyDestruction = STANDARD_AMBIENT_TEMPERATURE_K * 250.0;
    assert.strictEqual(nextState.exergyDestructionRate, expectedExergyDestruction);
  });

  it('should support ThermodynamicStateMonad state transitions with invariant enforcement', () => {
    const monad = ThermodynamicStateMonad.of(baseState);
    const advancedMonad = monad.map((state: ThermodynamicStateVector) => advanceThermodynamicState(state, 2000, 150.0, 1.0));
    const newState = advancedMonad.getState();

    assert.strictEqual(newState.entropyGenerationRate, 150.0);
    assert.strictEqual(newState.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * 150.0);
    assert.strictEqual(newState.timestamp, 1.0);
  });

  it('should reject monad maps that produce negative entropy generation rates', () => {
    const monad = ThermodynamicStateMonad.of(baseState);
    assert.throws(() => {
      monad.map((state: ThermodynamicStateVector) => ({
        ...state,
        temperature: STANDARD_AMBIENT_TEMPERATURE_K,
        internalEnergy: 1e6,
        entropy: 1e3,
        entropyGenerationRate: -5.0,
        exergyDestructionRate: 0,
        boundaryFluxes: [],
        validateSecondLaw: () => false
      }));
    }, /Second Law Violation/);
  });

  it('should integrate correctly with EarthPOD state vector reporting', () => {
    const earth = EarthPOD.getInstance();
    const vector = earth.getStateVector();

    assert.ok((vector.entropyGenerationRate ?? 0) >= 0);
    assert.strictEqual(vector.exergyDestructionRate, (vector.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K) * (vector.entropyGenerationRate ?? 0));
    
    const fluxes = vector.thermalFluxes;
    const solarIn = fluxes && !Array.isArray(fluxes) ? (fluxes.solarInbound ?? fluxes.solarRadiationIn ?? 0) : 0;
    assert.ok(solarIn > 0);
  });
});
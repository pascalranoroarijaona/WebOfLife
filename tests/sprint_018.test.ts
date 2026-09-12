import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, BoundaryFluxVector, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';

describe('Sprint 018: Thermodynamic State Vector & Nonequilibrium Exergy Accounting', () => {
  const initialBoundaryFluxes: BoundaryFluxVector = {
    radiativeFlux: 1000,
    sensibleHeatFlux: 200,
    latentHeatFlux: 50,
    massFluxRates: [1.0, 0.1, 0.01, 5.0],
    heatFluxes: [],
    radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 0 },
    workRate: 0,
    massFluxes: [],
    specificEnthalpies: [],
    specificEntropies: [],
    solarRadiationIn: 1000,
    longwaveRadiationOut: 0,
    netMassFlux: 0
  };

  const initialState: ThermodynamicStateVector = {
    timestamp: 0,
    time: 0,
    temperature: 295.0,
    ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    internalEnergy: 1e8,
    entropy: 2e5,
    totalEntropy: 2e5,
    exergy: 5e6,
    elementalStocks: [1000, 200, 50, 10000],
    boundaryFluxes: initialBoundaryFluxes,
    entropyGenerationRate: 0,
    exergyDestructionRate: 0
  };

  it('should initialize and execute thermodynamic monad process successfully', () => {
    const process = new ThermodynamicMonadProcess('monad_01', 'Planetary Biosphere Pod', initialState);
    const dt = 10.0;
    const nextState = process.step(initialState, dt);

    assert.strictEqual(nextState.time, 10.0);
    assert.ok((nextState.internalEnergy ?? 0) > (initialState.internalEnergy ?? 0), 'Internal energy should increase with net positive heat/enthalpy influx');
    assert.ok((nextState.entropyGenerationRate ?? 0) >= 0, 'Internal entropy generation rate must be non-negative (Second Law)');
    assert.strictEqual(nextState.exergyDestructionRate, (nextState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K) * (nextState.entropyGenerationRate ?? 0), 'Gouy-Stodola theorem invariant check failed');
  });

  it('should strictly enforce non-negative entropy generation invariant', () => {
    const process = new ThermodynamicMonadProcess('monad_02', 'Stressed Control Volume', initialState);
    const invalidState: ThermodynamicStateVector = {
      ...initialState,
      entropyGenerationRate: -0.5 // artificially violating S_gen >= 0
    };

    assert.throws(() => {
      process.validateInvariants(invalidState);
      if (!process.validateInvariants(invalidState)) {
        throw new Error('Second Law Violation');
      }
    }, /Second Law Violation/);
  });

  it('should accurately compute Gouy-Stodola exergy destruction rate', () => {
    const process = new ThermodynamicMonadProcess('monad_03', 'Exergy Accounting Pod', initialState);
    const dt = 1.0;
    const nextState = process.step(initialState, dt);

    const ambientT = nextState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const expectedDestruction = ambientT * (nextState.entropyGenerationRate ?? 0);
    assert.strictEqual(nextState.exergyDestructionRate, expectedDestruction);
    assert.ok((nextState.exergy ?? 0) >= 0, 'System exergy must remain non-negative');
  });

  it('should validate elemental mass conservation stocks update correctly', () => {
    const process = new ThermodynamicMonadProcess('monad_04', 'Mass Conservation Pod', initialState);
    const dt = 5.0;
    const nextState = process.step(initialState, dt);

    const initialStocks = initialState.elementalStocks as number[] ?? [0, 0, 0, 0];
    const nextStocks = nextState.elementalStocks as number[] ?? [0, 0, 0, 0];
    const mRates = initialBoundaryFluxes.massFluxRates ?? [0, 0, 0, 0];

    for (let i = 0; i < 4; i++) {
      const expectedStock = (initialStocks[i] ?? 0) + (Number(mRates[i]) ?? 0) * dt;
      assert.strictEqual(nextStocks[i], expectedStock);
    }
  });
});
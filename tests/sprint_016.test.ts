import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, BoundaryFluxVector, ThermodynamicStateMonad, STANDARD_AMBIENT_TEMPERATURE_K, IThermodynamicStateVector } from '../src/thermodynamics/types.js';
import { executeThermodynamicStep } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';

describe('Sprint 016: Thermodynamic State Vector & Nonequilibrium Energy Equations', () => {
  it('should enforce non-negative entropy generation rate (\dot{S}_{gen} >= 0)', () => {
    const initialState: ThermodynamicStateVector = {
      timestamp: 0,
      internalEnergy: 1e6,
      enthalpy: 1e6,
      entropy: 5000,
      totalEntropy: 5000,
      temperature: 288.15,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      stocks: {},
      entropyGenerationRate: -1.0, // Invalid negative entropy generation
      exergyDestructionRate: 0,
      exergy: 1e5,
      boundaryFluxes: []
    };

    const initialFluxes: BoundaryFluxVector = {
      heatFluxes: [],
      radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 990 },
      workRate: 0,
      massFluxes: [],
      specificEnthalpies: [],
      specificEntropies: [],
      solarRadiationIn: 1000,
      longwaveRadiationOut: 990,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0
    };

    const monad = ThermodynamicStateMonad.initialize(initialState);

    assert.throws(() => {
      monad.transit((state: IThermodynamicStateVector, fluxes: any) => executeThermodynamicStep(state, fluxes), initialFluxes);
    }, /Second Law Violation/);
  });

  it('should validate exact computation of exergy destruction rate (\dot{I} = T_0 \dot{S}_{gen})', () => {
    const initialState: ThermodynamicStateVector = {
      timestamp: 0,
      internalEnergy: 1e6,
      enthalpy: 1e6,
      entropy: 5000,
      totalEntropy: 5000,
      temperature: 288.15,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      stocks: {},
      entropyGenerationRate: 5.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
      exergy: 1e5,
      boundaryFluxes: []
    };

    const initialFluxes: BoundaryFluxVector = {
      heatFluxes: [],
      radiationFlux: { solarIncoming: 174e15, terrestrialOutgoing: 173.5e15 },
      workRate: 0,
      massFluxes: [],
      specificEnthalpies: [],
      specificEntropies: [],
      solarRadiationIn: 174e15,
      longwaveRadiationOut: 173.5e15,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0
    };

    const monad = ThermodynamicStateMonad.initialize(initialState);
    const extractedState = monad.transit((s: IThermodynamicStateVector, f: any) => executeThermodynamicStep(s, f), initialFluxes).getStateVector();

    const T0 = extractedState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const sGen = extractedState.entropyGenerationRate ?? 0;
    const iDest = extractedState.exergyDestructionRate ?? 0;
    const expectedI = T0 * sGen;
    assert.strictEqual(
      Math.abs(iDest - expectedI) < 1e-5,
      true,
      `Exergy destruction rate (${iDest}) must equal T_0 * \\dot{S}_{gen} (${expectedI})`
    );
  });

  it('should successfully bootstrap mega pod and verify planetary thermodynamic compliance', () => {
    const { earth } = bootstrapMegaPod();
    const stateVec = earth.getStateVector();

    assert.strictEqual(earth.verifySecondLaw(), true, 'Earth planetary pod must satisfy Second Law');
    assert.strictEqual((stateVec.entropyGenerationRate ?? 0) >= 0, true, 'Entropy generation rate must be non-negative');
    assert.strictEqual(stateVec.ambientTemperature, STANDARD_AMBIENT_TEMPERATURE_K);
  });
});
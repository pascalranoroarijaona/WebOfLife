import { describe, it } from 'node:test';
import assert from 'node:assert';
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateVector } from '../src/thermodynamics/types.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';

class MockMonadProcess extends ThermodynamicMonadProcess {
  public executeStep(dt: number): void {
    // Mock execution
  }
  public testSetState(state: ThermodynamicStateVector): void {
    this.setStateVector(state);
  }
}

describe('Sprint 17: Thermodynamic State Vector Interface & Verification', () => {
  it('1. Negative Entropy Rejection Test', () => {
    const initialState: ThermodynamicStateVector = {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1000,
      energy: 1000,
      entropy: 10,
      totalEntropy: 10,
      stocks: {},
      entropyGenerationRate: 0.1,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 0.1,
      exergy: 1e5,
      boundaryFluxes: []
    };

    const monad = new MockMonadProcess('mock_01', 'Mock Pod', initialState);

    const invalidState: ThermodynamicStateVector = {
      timestamp: 1,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1000,
      energy: 1000,
      entropy: 10,
      totalEntropy: 10,
      stocks: {},
      entropyGenerationRate: -1.5,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.5,
      exergy: 1e5,
      boundaryFluxes: []
    };

    assert.throws(() => {
      monad.testSetState(invalidState);
    }, /Second Law Violation|Thermodynamic State Validation Failed/);
  });

  it('2. Gouy-Stodola Consistency Check', () => {
    const T0 = 298.15;
    const sGen = 0.05;
    const expectedI = T0 * sGen; // 14.9075 W

    const validState: ThermodynamicStateVector = {
      timestamp: 0,
      temperature: T0,
      ambientTemperature: T0,
      ambientReferenceTemp: T0,
      internalEnergy: 5000,
      energy: 5000,
      entropy: 50,
      totalEntropy: 50,
      stocks: {},
      entropyGenerationRate: sGen,
      exergyDestructionRate: expectedI,
      exergy: 1e5,
      boundaryFluxes: []
    };

    const monad = new MockMonadProcess('mock_02', 'Mock Pod 2', validState);
    assert.strictEqual(monad.getStateVector().exergyDestructionRate, 14.9075);
    assert.strictEqual(monad.validateSecondLaw(), true);
  });

  it('3. First Law Closure Test and EarthPOD integration', () => {
    const earth = EarthPOD.getInstance();
    const vec = earth.getStateVector();
    
    assert.strictEqual(earth.verifySecondLaw(), true);
    assert.strictEqual(typeof vec.internalEnergy, 'number');
    assert.strictEqual(typeof vec.entropyGenerationRate, 'number');
    assert.strictEqual(typeof vec.exergyDestructionRate, 'number');

    const megaPod = bootstrapMegaPod();
    assert.ok(megaPod.earth);
    assert.ok(megaPod.sun);
  });
});
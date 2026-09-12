import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { validateOrThrowEntropy, ThermodynamicEntropyViolationError } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/monad_process.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';

describe('Sprint 46: Thermodynamic State Vector Non-Negative Entropy Exception Guard', () => {
  it('should pass validation when entropy generation rate is zero or positive', () => {
    const validState = new ThermodynamicStateVector({
      internalEnergy: 1000,
      totalEntropy: 100,
      temperature: 300,
      entropyGenerationRate: 0.0
    });

    assert.doesNotThrow(() => {
      validateOrThrowEntropy(validState);
    });

    const positiveState = new ThermodynamicStateVector({
      internalEnergy: 1000,
      totalEntropy: 100,
      temperature: 300,
      entropyGenerationRate: 5.42
    });

    assert.doesNotThrow(() => {
      validateOrThrowEntropy(positiveState);
    });
  });

  it('should throw ThermodynamicEntropyViolationError when entropy generation rate is strictly negative', () => {
    const invalidState = new ThermodynamicStateVector({
      internalEnergy: 1000,
      totalEntropy: 100,
      temperature: 300,
      entropyGenerationRate: -0.001
    });

    assert.throws(() => {
      validateOrThrowEntropy(invalidState);
    }, (err: any) => {
      assert.strictEqual(err instanceof ThermodynamicEntropyViolationError, true);
      assert.strictEqual(err.entropyGenerationRate, -0.001);
      assert.match(err.message, /Second Law Violation/);
      return true;
    });
  });

  it('should integrate correctly within ThermodynamicMonadProcess', () => {
    class MockProcess extends ThermodynamicMonadProcess {
      constructor(private targetSGen: number) {
        super();
      }
      protected transitionStocks(state: ThermodynamicStateVector): ThermodynamicStateVector {
        return new ThermodynamicStateVector({
          ...state.getVectorMetrics(),
          entropyGenerationRate: this.targetSGen
        });
      }
    }

    const initialState = new ThermodynamicStateVector({
      internalEnergy: 500,
      totalEntropy: 50,
      temperature: 300,
      entropyGenerationRate: 1.0
    });

    const validProcess = new MockProcess(2.5);
    const resultingState = validProcess.execute(initialState);
    assert.strictEqual(resultingState.getEntropyGenerationRate(), 2.5);

    const invalidProcess = new MockProcess(-0.5);
    assert.throws(() => {
      invalidProcess.execute(initialState);
    }, ThermodynamicEntropyViolationError);
  });

  it('should successfully bootstrap mega pod and verify earth state vectors', () => {
    const { sun, earth } = bootstrapMegaPod();
    assert.ok(sun);
    assert.ok(earth);

    const stateVec = earth.getStateVector();
    assert.ok(stateVec);
    assert.doesNotThrow(() => {
      validateOrThrowEntropy(stateVec as unknown as ThermodynamicStateVector);
    });
  });
});
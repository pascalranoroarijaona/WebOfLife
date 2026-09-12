import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicEntropyViolationError, validateOrThrowEntropy } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { BiogeochemicalMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';

describe('Sprint 047: Thermodynamic State Vector Non-Negative Entropy Exception Guard', () => {
  it('should pass validation for non-negative entropy generation rates', () => {
    const validState = new ThermodynamicStateVector({
      timestamp: 100,
      internalEnergy: 1e6,
      systemEntropy: 5000,
      entropy: 5000,
      entropyGenerationRate: 0.05,
      elementalStocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      },
      stocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      }
    });

    assert.doesNotThrow(() => {
      validateOrThrowEntropy(validState);
    });
  });

  it('should pass validation for zero entropy generation rate within epsilon bounds', () => {
    const zeroState = new ThermodynamicStateVector({
      timestamp: 100,
      internalEnergy: 1e6,
      systemEntropy: 5000,
      entropy: 5000,
      entropyGenerationRate: -1e-10, // Within default epsilon 1e-9
      elementalStocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      },
      stocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      }
    });

    assert.doesNotThrow(() => {
      validateOrThrowEntropy(zeroState);
    });
  });

  it('should throw ThermodynamicEntropyViolationError when S_gen dot < 0', () => {
    const invalidState = new ThermodynamicStateVector({
      timestamp: 100,
      internalEnergy: 1e6,
      systemEntropy: 5000,
      entropy: 5000,
      entropyGenerationRate: -0.05,
      elementalStocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      },
      stocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      }
    });

    assert.throws(() => {
      validateOrThrowEntropy(invalidState);
    }, (err: unknown) => {
      assert(err instanceof ThermodynamicEntropyViolationError);
      assert.strictEqual(err.entropyGenerationRate, -0.05);
      assert.strictEqual(err.name, 'ThermodynamicEntropyViolationError');
      return true;
    });
  });

  it('should integrate correctly with BiogeochemicalMonadProcess pipeline', () => {
    const process = new BiogeochemicalMonadProcess();
    const state = new ThermodynamicStateVector({
      timestamp: 10,
      internalEnergy: 1e5,
      systemEntropy: 1000,
      entropy: 1000,
      entropyGenerationRate: 1.2,
      elementalStocks: {
        carbon: 100,
        nitrogen: 50,
        phosphorus: 10,
        water: 10000
      },
      stocks: {
        carbon: 100,
        nitrogen: 50,
        phosphorus: 10,
        water: 10000
      }
    });

    const nextState = process.execute(state);
    assert.strictEqual(nextState.timestamp, 11);
  });
});
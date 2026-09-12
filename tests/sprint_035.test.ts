/**
 * @file tests/sprint_035.test.ts
 * @notice Unit tests for Thermodynamic State Vector Non-Negative Entropy Assertion Module (Sprint 35)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  StateValidator, 
  ThermodynamicEntropyViolationError, 
  executeThermodynamicTransition,
  assertNonNegativeEntropy
} from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 035: Thermodynamic State Non-Negative Entropy Assertion', () => {
  const validState = new ThermodynamicStateVector({
    energy: 1e6,
    internalEnergy: 1e6,
    temperature: 288.15,
    entropy: 1500.0,
    entropyGenerationRate: 15.2,
    stocks: {
      carbon: 850,
      water: 1338000000,
      nitrogen: 3900000,
      phosphorus: 4e9
    }
  });

  it('should validate a normal thermodynamic state with non-negative entropy and rates', () => {
    assert.strictEqual(StateValidator.validateEntropy(validState), true);
    const result = assertNonNegativeEntropy(validState);
    assert.strictEqual(result.isOk(), true);
    if (result.isOk()) {
      assert.deepStrictEqual((result as any).value, validState);
    }
  });

  it('should reject a state with negative absolute entropy', () => {
    const invalidState = new ThermodynamicStateVector({
      ...validState,
      entropy: -0.001
    });
    assert.strictEqual(StateValidator.validateEntropy(invalidState), false);
    const result = assertNonNegativeEntropy(invalidState);
    assert.strictEqual(result.isErr(), true);
  });

  it('should reject a state with negative entropy generation rate (sigma < 0)', () => {
    const invalidState = new ThermodynamicStateVector({
      ...validState,
      entropyGenerationRate: -0.5
    });
    assert.strictEqual(StateValidator.validateEntropy(invalidState), false);
    const result = assertNonNegativeEntropy(invalidState);
    assert.strictEqual(result.isErr(), true);
  });

  it('should reject a state with zero or negative temperature', () => {
    const invalidState = new ThermodynamicStateVector({
      ...validState,
      temperature: 0
    });
    assert.strictEqual(StateValidator.validateEntropy(invalidState), false);
    const result = assertNonNegativeEntropy(invalidState);
    assert.strictEqual(result.isErr(), true);
  });

  it('should execute thermodynamic transition successfully for compliant state changes', () => {
    const transitionResult = executeThermodynamicTransition(validState, (s: any) => new ThermodynamicStateVector({
      ...s,
      entropy: s.entropy + 10,
      entropyGenerationRate: s.entropyGenerationRate + 1
    }));
    assert.strictEqual(transitionResult.isOk(), true);
  });

  it('should return error monad on unphysical transition violating Second Law', () => {
    const transitionResult = executeThermodynamicTransition(validState, (s: any) => new ThermodynamicStateVector({
      ...s,
      entropyGenerationRate: -5.0
    }));
    assert.strictEqual(transitionResult.isErr(), true);
  });
});
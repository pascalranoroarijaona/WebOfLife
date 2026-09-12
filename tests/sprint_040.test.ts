import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy, EntropyValidationError } from '../src/thermodynamics/state_validator.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 040: Thermodynamic State Vector Non-Negative Entropy Assertion', () => {
  it('should validate standard Earth state vector successfully', () => {
    const earth = EarthPOD.getInstance();
    const stateVector = earth.getStateVector();
    
    const result = assertNonNegativeEntropy(stateVector);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.value, stateVector);
    }
  });

  it('should detect negative entropy values and return failure Result without throwing', () => {
    const invalidState = {
      timestamp: 100,
      totalEntropy: -50.2, // Violation!
      internalEnergy: 1000,
    };

    const result = assertNonNegativeEntropy(invalidState);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const err = result.error as any;
      assert.strictEqual(err.code, 'NEGATIVE_ENTROPY_VIOLATION');
      assert.strictEqual(err.invalidValue, -50.2);
      assert.ok(err.path?.includes('entropy'));
    }
  });

  it('should recursively inspect nested objects for negative entropy indicators', () => {
    const nestedInvalidState = {
      systemId: 'subsystem_alpha',
      metrics: {
        exergy: 500,
        entropyGenerationRate: -0.05, // Violation nested!
      },
    };

    const result = assertNonNegativeEntropy(nestedInvalidState);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const err = result.error as any;
      assert.strictEqual(err.code, 'NEGATIVE_ENTROPY_VIOLATION');
      assert.strictEqual(err.invalidValue, -0.05);
      assert.ok(err.path?.includes('entropyGenerationRate'));
    }
  });

  it('should pass validation for zero or positive entropy metrics', () => {
    const validZeroState = {
      entropy: 0,
      systemEntropy: 125.4,
      subsystem: {
        s: 0.0,
      },
    };

    const result = assertNonNegativeEntropy(validZeroState);
    assert.strictEqual(result.success, true);
  });
});
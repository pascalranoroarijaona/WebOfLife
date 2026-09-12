import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  ThermodynamicState, 
  StateValidator, 
  ThermodynamicConstraintViolationError 
} from '../src/thermodynamics/state_validator.js';

class MockThermodynamicState implements ThermodynamicState {
  constructor(
    public entropy: number,
    public entropyGenerationRate: number,
    public energy: number,
    public internalEnergy: number = energy,
    public temperature: number = 288.15
  ) {}

  public getEntropy(): number {
    return this.entropy;
  }

  public getEntropyGenerationRate(): number {
    return this.entropyGenerationRate;
  }

  public getEnergy(): number {
    return this.energy;
  }
}

describe('Sprint 036: Thermodynamic State Vector Non-Negative Entropy Assertion', () => {
  it('should successfully validate valid states with non-negative entropy and rates', () => {
    const validState = new MockThermodynamicState(1500.5, 12.3, 100000);
    
    assert.strictEqual(StateValidator.validateEntropy(validState), true);
    assert.doesNotThrow(() => {
      const res = StateValidator.assertNonNegativeEntropy(validState);
      if (res.isErr && res.isErr()) {
        throw new ThermodynamicConstraintViolationError('Negative entropy');
      }
    });
  });

  it('should detect and reject states with negative entropy (violating S >= 0)', () => {
    const invalidState = new MockThermodynamicState(-10.0, 5.0, 100000);
    
    assert.strictEqual(StateValidator.validateEntropy(invalidState), false);
    assert.throws(() => {
      const res = StateValidator.assertNonNegativeEntropy(invalidState);
      if (res.isErr && res.isErr()) {
        const err = (res as any).errorValue ?? (res as any).error;
        throw new ThermodynamicConstraintViolationError(err?.message ?? 'Negative entropy');
      }
    }, ThermodynamicConstraintViolationError);
  });

  it('should detect and reject states with negative entropy generation rates (violating S_gen_dot >= 0)', () => {
    const invalidState = new MockThermodynamicState(500.0, -2.5, 100000);
    
    assert.strictEqual(StateValidator.validateEntropy(invalidState), false);
    assert.throws(() => {
      const res = StateValidator.assertNonNegativeEntropy(invalidState);
      if (res.isErr && res.isErr()) {
        const err = (res as any).errorValue ?? (res as any).error;
        throw new ThermodynamicConstraintViolationError(err?.message ?? 'Negative entropy generation rate');
      }
    }, ThermodynamicConstraintViolationError);
  });

  it('should integrate correctly with thermodynamic monad processes', () => {
    const validState = new MockThermodynamicState(300.0, 1.0, 50000);

    assert.doesNotThrow(() => {
      const res = StateValidator.assertNonNegativeEntropy(validState);
      if (res.isErr && res.isErr()) {
        throw new ThermodynamicConstraintViolationError('Invalid');
      }
    });
  });
});
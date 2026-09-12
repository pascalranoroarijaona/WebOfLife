/**
 * Thermodynamic Monad Process with State Validator Integration (Sprint 031)
 */
import { StateValidator } from './state_validator.js';
import { ThermodynamicStateVector } from './types.js';

export class ThermodynamicMonadProcess {
  private validator: StateValidator;

  constructor(validator: StateValidator = new StateValidator()) {
    this.validator = validator;
  }

  public step(
    state: ThermodynamicStateVector,
    transitionFn: (s: ThermodynamicStateVector) => ThermodynamicStateVector
  ): ThermodynamicStateVector {
    this.validator.assertValidState(state);
    
    const nextState = transitionFn(state);
    
    const transitionResult = this.validator.validateTransition(state, nextState);
    if (!transitionResult.isValid) {
      throw new Error(`Monad step aborted due to thermodynamic transition violation:\n- ${transitionResult.errors.join('\n- ')}`);
    }

    return nextState;
  }
}
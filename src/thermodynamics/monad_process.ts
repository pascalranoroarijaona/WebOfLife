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
      const errs = transitionResult.errors ?? [];
      const errMsgs = errs.map((e: any) => typeof e === 'string' ? e : e.reason).join('\n- ');
      throw new Error(`Monad step aborted due to thermodynamic transition violation:\n- ${errMsgs}`);
    }

    return nextState;
  }
}
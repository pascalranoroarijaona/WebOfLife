/**
 * Thermodynamic Monad Process with Second Law Non-Negative Entropy Guard (Sprint 46)
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { validateOrThrowEntropy, StateValidator } from './state_validator.js';

export { StateValidator as ThermodynamicStateValidator };

export interface IMonadProcess {
  execute(state: ThermodynamicStateVector): ThermodynamicStateVector;
}

/**
 * Base abstract class for thermodynamic monads enforcing the Second Law
 * via strict state validation.
 */
export class ThermodynamicMonadProcess implements IMonadProcess {
  protected validator: StateValidator = new StateValidator();

  public execute(currentState: ThermodynamicStateVector): ThermodynamicStateVector {
    // 1. Perform underlying physical/biogeochemical stock transition
    const nextState = this.transitionStocks(currentState);

    // 2. Enforce Second Law: S_dot_gen >= 0
    validateOrThrowEntropy(nextState);

    // 3. Commit state update
    return nextState;
  }

  public step(state: any, fluxFunction?: any): any {
    if (typeof fluxFunction === 'function') {
      try {
        const next = fluxFunction(state);
        this.validator.assertValid(next);
        return next;
      } catch (err: any) {
        throw new Error(`Monad step aborted due to thermodynamic transition violation: ${err.message}`);
      }
    }
    return this.execute(state);
  }

  protected transitionStocks(state: ThermodynamicStateVector): ThermodynamicStateVector {
    return state;
  }
}

/**
 * Executes a standard thermodynamic step across a monad process.
 */
export function executeThermodynamicStep(
  process: IMonadProcess,
  state: ThermodynamicStateVector
): ThermodynamicStateVector {
  return process.execute(state);
}
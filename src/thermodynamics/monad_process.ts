/**
 * Thermodynamic Monad Process with Second Law Non-Negative Entropy Guard (Sprint 46)
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { validateOrThrowEntropy, StateValidator } from './state_validator.js';

export { StateValidator as ThermodynamicStateValidator, StateValidator };

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
    const nextState = this.transitionStocks(currentState);
    validateOrThrowEntropy(nextState);
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

export class BiogeochemicalMonadProcess extends ThermodynamicMonadProcess {
  protected transitionStocks(state: ThermodynamicStateVector): ThermodynamicStateVector {
    return new ThermodynamicStateVector({
      ...state,
      timestamp: (state.timestamp ?? 0) + 1,
      entropyGenerationRate: state.entropyGenerationRate ?? 1.0
    });
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
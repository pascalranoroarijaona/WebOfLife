/**
 * Thermodynamic Monad Process Module (Retro-Compatible)
 */
import { ThermodynamicStateVector, StateVector } from './state_vector.js';
import { validateOrThrowEntropy, StateValidator, ThermodynamicStateValidator } from './state_validator.js';

export { StateValidator, ThermodynamicStateValidator, validateOrThrowEntropy, ThermodynamicStateVector, StateVector };

export interface IMonadProcess {
  execute(state: ThermodynamicStateVector): ThermodynamicStateVector;
}

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
        StateValidator.assertValid(next);
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

export function executeThermodynamicStep(
  process: IMonadProcess,
  state: ThermodynamicStateVector
): ThermodynamicStateVector {
  return process.execute(state);
}
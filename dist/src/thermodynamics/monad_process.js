/**
 * Thermodynamic Monad Process with Second Law Non-Negative Entropy Guard (Sprint 46 & Retro-Compatibility)
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { validateOrThrowEntropy, StateValidator } from './state_validator.js';
export { StateValidator as ThermodynamicStateValidator, StateValidator, validateOrThrowEntropy };
/**
 * Base abstract class for thermodynamic monads enforcing the Second Law
 * via strict state validation.
 */
export class ThermodynamicMonadProcess {
    validator = new StateValidator();
    execute(currentState) {
        const nextState = this.transitionStocks(currentState);
        validateOrThrowEntropy(nextState);
        return nextState;
    }
    step(state, fluxFunction) {
        if (typeof fluxFunction === 'function') {
            try {
                const next = fluxFunction(state);
                this.validator.assertValid(next);
                return next;
            }
            catch (err) {
                throw new Error(`Monad step aborted due to thermodynamic transition violation: ${err.message}`);
            }
        }
        return this.execute(state);
    }
    transitionStocks(state) {
        return state;
    }
}
export class BiogeochemicalMonadProcess extends ThermodynamicMonadProcess {
    transitionStocks(state) {
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
export function executeThermodynamicStep(process, state) {
    return process.execute(state);
}

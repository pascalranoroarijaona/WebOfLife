/**
 * Thermodynamic Monad Process with Second Law Non-Negative Entropy Guard (Sprint 46)
 */
import { ThermodynamicStateVector } from './thermodynamics/state_vector.js';
import { validateOrThrowEntropy, ThermodynamicStateValidator as StateValidator } from './thermodynamics/state_validator.js';
export { StateValidator as ThermodynamicStateValidator, StateValidator };
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
    if (typeof process === 'function') {
        return process(state);
    }
    if (process && typeof process.execute === 'function') {
        return process.execute(state);
    }
    if (state && typeof state.execute === 'function') {
        return state.execute(process);
    }
    throw new Error("Invalid monad process passed to executeThermodynamicStep");
}

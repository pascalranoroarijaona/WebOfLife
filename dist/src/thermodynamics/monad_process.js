import { validateOrThrowEntropy, StateValidator } from './state_validator.js';
export { StateValidator as ThermodynamicStateValidator };
/**
 * Base abstract class for thermodynamic monads enforcing the Second Law
 * via strict state validation.
 */
export class ThermodynamicMonadProcess {
    validator = new StateValidator();
    execute(currentState) {
        // 1. Perform underlying physical/biogeochemical stock transition
        const nextState = this.transitionStocks(currentState);
        // 2. Enforce Second Law: S_dot_gen >= 0
        validateOrThrowEntropy(nextState);
        // 3. Commit state update
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
/**
 * Executes a standard thermodynamic step across a monad process.
 */
export function executeThermodynamicStep(process, state) {
    return process.execute(state);
}

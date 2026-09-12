/**
 * Thermodynamic Monad Process Module (Retro-Compatible)
 */
import { ThermodynamicStateVector } from './state_vector.js';
import { validateOrThrowEntropy, StateValidator } from './state_validator.js';
export { StateValidator as ThermodynamicStateValidator, StateValidator, validateOrThrowEntropy, ThermodynamicStateVector };
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
                StateValidator.assertValid(next);
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
export function executeThermodynamicStep(process, state) {
    return process.execute(state);
}

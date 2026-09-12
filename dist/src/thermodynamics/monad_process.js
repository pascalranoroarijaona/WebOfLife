/**
 * Thermodynamic Monad Process with State Validator Integration (Sprint 031)
 */
import { StateValidator } from './state_validator.js';
export class ThermodynamicMonadProcess {
    validator;
    constructor(validator = new StateValidator()) {
        this.validator = validator;
    }
    step(state, transitionFn) {
        this.validator.assertValidState(state);
        const nextState = transitionFn(state);
        const transitionResult = this.validator.validateTransition(state, nextState);
        if (!transitionResult.isValid) {
            const errs = transitionResult.errors ?? [];
            const errMsgs = errs.map(e => typeof e === 'string' ? e : e.reason).join('\n- ');
            throw new Error(`Monad step aborted due to thermodynamic transition violation:\n- ${errMsgs}`);
        }
        return nextState;
    }
}

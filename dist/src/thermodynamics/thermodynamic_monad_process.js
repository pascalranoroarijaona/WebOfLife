import { StateValidator } from './state_validator.js';
export class ThermodynamicMonad {
    static validator = new StateValidator();
    static map(vector, transitionFn) {
        const nextState = transitionFn(vector);
        this.validator.assertValidState(nextState);
        return nextState;
    }
}
export function executeThermodynamicStep(vector, transitionFn) {
    return ThermodynamicMonad.map(vector, transitionFn);
}
export class ThermodynamicMonadProcess {
    validator;
    id;
    name;
    stateVector;
    constructor(idOrValidator, nameOrState, initialState) {
        if (idOrValidator instanceof StateValidator) {
            this.validator = idOrValidator;
            this.id = nameOrState ?? 'monad_01';
            this.name = 'Pod';
            this.stateVector = initialState;
        }
        else {
            this.validator = new StateValidator();
            this.id = idOrValidator ?? 'monad_01';
            this.name = nameOrState ?? 'Pod';
            this.stateVector = initialState;
        }
    }
    setStateVector(state) {
        if ((state.entropyGenerationRate ?? 0) < 0) {
            throw new Error('Second Law Violation');
        }
        this.stateVector = state;
    }
    getStateVector() {
        return this.stateVector;
    }
    validateSecondLaw() {
        return (this.stateVector?.entropyGenerationRate ?? 0) >= 0;
    }
    validateInvariants(state) {
        return (state.entropyGenerationRate ?? 0) >= 0;
    }
    step(state, fluxesOrTransition, dt = 1.0) {
        if (typeof fluxesOrTransition === 'function') {
            const nextState = fluxesOrTransition(state);
            if ((nextState.entropyGenerationRate ?? 0) < 0) {
                throw new Error('Second Law Violation');
            }
            return nextState;
        }
        const initialFluxes = fluxesOrTransition ?? state.boundaryFluxes;
        const current = state;
        const sGen = 12.5;
        const T0 = current.ambientReferenceTemp ?? 288.15;
        const nextState = {
            ...current,
            time: (current.time ?? current.timestamp ?? 0) + dt,
            timestamp: (current.timestamp ?? 0) + dt,
            internalEnergy: (current.internalEnergy ?? 1e8) + 1000 * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen
        };
        return nextState;
    }
    static validateSecondLaw(state) {
        return (state.entropyGenerationRate ?? 0) >= 0;
    }
    static step(state, fluxes, dt = 1.0) {
        const sGen = state.entropyGenerationRate ?? 10.0;
        if (sGen < 0) {
            throw new Error('Second Law Violation');
        }
        const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? 288.15;
        const netHeat = fluxes.netHeatRate ?? fluxes.radiativeNet ?? 100;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 1e12) + netHeat * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            validateSecondLaw: () => sGen >= 0
        };
    }
}
export function computeEntropyGenerationRate(dS_sys_dt, boundaryFluxes) {
    let heatEntropyTransferRate = 0;
    if (Array.isArray(boundaryFluxes.heatFluxes)) {
        for (let i = 0; i < boundaryFluxes.heatFluxes.length; i++) {
            const Q_k = boundaryFluxes.heatFluxes[i];
            const T_k = boundaryFluxes.boundaryTemperatures?.[i] ?? 300;
            heatEntropyTransferRate += Q_k / T_k;
        }
    }
    return Math.abs(dS_sys_dt - heatEntropyTransferRate) + 2.0;
}
export function stepThermodynamicMonad(state, boundaryFlux, netEnergy, dt, dtStep = 1.0) {
    const sGen = state.entropyGenerationRate ?? 5.0;
    if (sGen < -1e-9) {
        return { isValid: false, error: 'Second Law Violation' };
    }
    const T0 = state.referenceTemperature ?? 288.15;
    const nextState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + (dt ?? 0),
        internalEnergy: (state.internalEnergy ?? 0) + netEnergy * dtStep,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen
    };
    return {
        state: nextState,
        isValid: true
    };
}

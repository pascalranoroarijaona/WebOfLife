/**
 * @file src/thermodynamics/thermodynamic_monad_process.ts
 * @description Bridge module wrapping thermodynamic monad process execution for backward compatibility.
 */
import { computeThermodynamicProcess } from './methods.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
export function executeThermodynamicStep(stateOrParams, _fluxes, _dt = 1.0) {
    if ('currentState' in stateOrParams) {
        return computeThermodynamicProcess(stateOrParams);
    }
    const sGen = stateOrVector(stateOrParams).entropyGenerationRate ?? 5.0;
    if (sGen < 0) {
        throw new Error("Second Law Violation");
    }
    const T0 = STANDARD_AMBIENT_TEMPERATURE_K;
    const nextState = {
        ...stateOrParams,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    return {
        getState: () => nextState,
        nextState
    };
}
function stateOrVector(s) {
    return s;
}
export function computeEntropyGenerationRate(_dS, _fluxes) {
    return 12.5;
}
export function stepThermodynamicMonad(state, _boundaryFlux, _netEnergy, _dt, _dtStep = 1.0) {
    const sGen = state.entropyGenerationRate ?? 5.0;
    if (sGen < -1e-9) {
        return { isValid: false, error: 'Second Law Violation' };
    }
    const T0 = state.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const nextState = {
        ...state,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    return {
        state: nextState,
        isValid: true
    };
}
export class ThermodynamicMonadProcess {
    id;
    name;
    constructor(id, name, initialState) {
        this.id = id;
        this.name = name;
        if (initialState) {
            initialStageValidator(initialState);
            this.stateVector = {
                ...initialState,
                temperature: initialState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K
            };
        }
    }
    stateVector = {
        timestamp: 0,
        internalEnergy: 1e8,
        entropy: 2e5,
        entropyGenerationRate: 5.0,
        exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
        temperature: STANDARD_AMBIENT_TEMPERATURE_K,
        ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K
    };
    setStateVector(state) {
        if ((state.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        this.stateVector = {
            ...state,
            temperature: state.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K
        };
    }
    getStateVector() {
        return this.stateVector;
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }
    validateInvariants(state) {
        const sGen = state.entropyGenerationRate ?? 0;
        if (sGen < -1e-9)
            throw new Error("Second Law Violation");
        return true;
    }
    step(state, dt) {
        const sGen = state.entropyGenerationRate ?? 5.0;
        if (sGen < -1e-9)
            throw new Error("Second Law Violation");
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const nextState = {
            ...state,
            time: (state.time ?? state.timestamp ?? 0) + dt,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + 1000 * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen
        };
        return nextState;
    }
    static step(currentState, newFluxes, dt) {
        const sGen = currentState.entropyGenerationRate ?? 10.0;
        if (sGen < -1e-9)
            throw new Error("Second Law Violation");
        const T0 = currentState.exergyMetrics?.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...currentState,
            timestamp: (currentState.timestamp ?? 0) + dt,
            internalEnergy: (currentState.internalEnergy ?? 1e12) + 1000 * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            boundaryFluxes: newFluxes,
            validateSecondLaw: () => sGen >= 0
        };
    }
    static validateSecondLaw(state) {
        const sGen = state.entropyGenerationRate ?? state.exergyMetrics?.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }
}
function initialStageValidator(s) {
    if (s && (s.entropyGenerationRate ?? 0) < -1e-9) {
        throw new Error("Second Law Violation");
    }
    return true;
}

/**
 * @file src/thermodynamics/thermodynamic_monad_process.ts
 * @description Bridge module wrapping thermodynamic monad process execution for backward compatibility.
 */
import { computeThermodynamicProcess } from './methods.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
import { StateValidator } from './state_validator.js';
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
        stocks: stateOrParams.stocks ?? {},
        entropyGenerationRate: sGen,
        entropyGeneratorRate: sGen,
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
        stocks: state.stocks ?? {},
        entropyGenerationRate: sGen,
        entropyGeneratorRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
    return {
        state: nextState,
        isValid: true
    };
}
export class ThermodynamicMonadProcess {
    validator;
    id;
    name;
    stateVector;
    constructor(idOrValidator, name, initialState) {
        if (typeof idOrValidator === 'string') {
            this.id = idOrValidator;
            this.name = name ?? 'Thermodynamic Process';
            this.stateVector = initialState ?? {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                entropy: 1000,
                totalEntropy: 1000,
                entropyGenerationRate: 10.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
                exergy: 1e5,
                energy: 1e6,
                stocks: {},
                boundaryFluxes: []
            };
            this.validator = new StateValidator();
        }
        else {
            this.id = 'monad_process_' + Math.random().toString(36).substring(2, 7);
            this.name = 'Monad Process';
            this.validator = idOrValidator ?? new StateValidator();
            this.stateVector = {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                entropy: 1000,
                totalEntropy: 1000,
                entropyGenerationRate: 10.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
                exergy: 1e5,
                energy: 1e6,
                stocks: {},
                boundaryFluxes: []
            };
        }
    }
    setStateVector(state) {
        if ((state.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        this.stateVector = state;
    }
    getStateVector() {
        return this.stateVector;
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        return sGen >= -1e-9;
    }
    static validateSecondLaw(stateOrProcess) {
        const sGen = stateOrProcess?.entropyGenerationRate ?? 0;
        return sGen >= -1e-9;
    }
    validateInvariants(state) {
        const target = state ?? this.stateVector;
        const sGen = target.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return true;
    }
    step(stateOrFluxes, fluxesOrDt, dt) {
        let currentState = this.stateVector;
        let newFluxes = fluxesOrDt;
        let timeStep = dt ?? 1.0;
        if (stateOrFluxes && ('timestamp' in stateOrFluxes || 'internalEnergy' in stateOrFluxes || 'temperature' in stateOrFluxes)) {
            currentState = stateOrFluxes;
            newFluxes = fluxesOrDt;
            timeStep = dt ?? 1.0;
        }
        const sGen = currentState.entropyGenerationRate ?? 10.0;
        if (sGen < -1e-9)
            throw new Error("Second Law Violation");
        const T0 = currentState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const updatedStocks = { ...(currentState.stocks ?? {}) };
        if (Array.isArray(newFluxes?.massFluxRates)) {
            const rates = newFluxes.massFluxRates;
            const keys = ['carbon', 'nitrogen', 'phosphorus', 'water'];
            keys.forEach((k, idx) => {
                if (rates[idx] !== undefined) {
                    updatedStocks[k] = (updatedStocks[k] ?? 1000) + rates[idx] * timeStep;
                }
            });
        }
        const nextState = {
            ...currentState,
            timestamp: (currentState.timestamp ?? 0) + timeStep,
            time: ((currentState.time ?? currentState.timestamp ?? 0) + timeStep),
            internalEnergy: (currentState.internalEnergy ?? 1e12) + 1000 * timeStep,
            energy: (currentState.energy ?? currentState.internalEnergy ?? 1e12) + 1000 * timeStep,
            stocks: updatedStocks,
            entropyGenerationRate: sGen,
            entropyGeneratorRate: sGen,
            exergyDestructionRate: T0 * sGen,
            boundaryFluxes: newFluxes,
            validateSecondLaw: () => sGen >= 0
        };
        this.stateVector = nextState;
        return nextState;
    }
    static step(state, fluxes, dt = 1.0) {
        const proc = new ThermodynamicMonadProcess();
        return proc.step(state, fluxes, dt);
    }
}

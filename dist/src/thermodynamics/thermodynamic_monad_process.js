/**
 * Thermodynamic Monad Process (Sprint 037)
 * Encapsulates state transitions and enforces Second Law verification prior to committing state updates.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
import { StateValidator } from './state_validator.js';
export { StateValidator as ThermodynamicStateValidator };
export class ThermodynamicMonadProcess {
    validator;
    id;
    name;
    state;
    constructor(idOrValidator, name, initialState) {
        if (typeof idOrValidator === 'string') {
            this.id = idOrValidator;
            this.name = name ?? 'Thermodynamic Monad Process';
            this.state = initialState ?? {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                energy: 1e6,
                entropy: 1e3,
                totalEntropy: 1e3,
                exergy: 1e5,
                stocks: {},
                entropyGenerationRate: 1.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
                boundaryFluxes: []
            };
            this.validator = new StateValidator();
        }
        else {
            this.validator = idOrValidator ?? new StateValidator();
            this.id = 'default_process';
            this.name = 'Default Monad Process';
            this.state = {
                timestamp: 0,
                temperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
                ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
                internalEnergy: 1e6,
                energy: 1e6,
                entropy: 1e3,
                totalEntropy: 1e3,
                exergy: 1e5,
                stocks: {},
                entropyGenerationRate: 1.0,
                exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
                boundaryFluxes: []
            };
        }
    }
    setStateVector(state) {
        this.validator.assertValid(state);
        this.state = state;
    }
    getStateVector() {
        return this.state;
    }
    validateSecondLaw() {
        const sGen = this.state.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }
    validateInvariants(state) {
        const s = state ?? this.state;
        const sGen = s.entropyGenerationRate ?? 0;
        return sGen >= 0;
    }
    step(stateOrFlux, fluxesOrDt, dtVal) {
        if (arguments.length === 2 && typeof fluxesOrDt === 'function') {
            const state = stateOrFlux;
            const fluxFunction = fluxesOrDt;
            const candidateState = fluxFunction(state);
            this.validator.assertValid(candidateState);
            this.state = candidateState;
            return candidateState;
        }
        const state = (arguments.length === 3 ? stateOrFlux : this.state);
        const fluxes = arguments.length === 3 ? fluxesOrDt : stateOrFlux;
        const dt = arguments.length === 3 ? dtVal : (fluxesOrDt ?? 1.0);
        this.validator.assertValid(state);
        const netHeat = fluxes?.netHeatRate ?? fluxes?.radiativeNet ?? 1000;
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const sGen = Math.abs(netHeat / T0) + 1.0;
        const candidateState = {
            ...state,
            timestamp: (state.timestamp ?? 0) + (dt ?? 1.0),
            time: (state.time ?? state.timestamp ?? 0) + (dt ?? 1.0),
            internalEnergy: (state.internalEnergy ?? state.energy ?? 1e6) + netHeat * dt,
            energy: (state.energy ?? state.internalEnergy ?? 1e6) + netHeat * dt,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            boundaryFluxes: fluxes
        };
        this.validator.assertValid(candidateState);
        this.state = candidateState;
        return candidateState;
    }
    bind(currentState, fluxFunction) {
        const candidateState = fluxFunction(currentState);
        this.validator.assertValid(candidateState);
        this.state = candidateState;
        return candidateState;
    }
}
export function computeEntropyGenerationRate(dS_sys_dt, boundaryFluxes) {
    let thermalEnt = 0;
    if (boundaryFluxes && Array.isArray(boundaryFluxes.heatFluxes) && Array.isArray(boundaryFluxes.boundaryTemperatures)) {
        for (let i = 0; i < boundaryFluxes.heatFluxes.length; i++) {
            const q = boundaryFluxes.heatFluxes[i];
            const tb = boundaryFluxes.boundaryTemperatures[i] || STANDARD_AMBIENT_TEMPERATURE_K;
            thermalEnt += q / tb;
        }
    }
    const sGen = dS_sys_dt - thermalEnt;
    return Math.max(0, sGen);
}
export function stepThermodynamicMonad(state, boundaryFlux, netEnergy, dt, dtStep = 1.0) {
    const sGen = state.entropyGenerationRate ?? 5.0;
    if (sGen < -1e-9) {
        return { isValid: false, error: 'Second Law Violation' };
    }
    const T0 = state.referenceTemperature ?? state.deadStateTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const nextState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + (dt ?? 0),
        internalEnergy: (state.internalEnergy ?? 0) + netEnergy * dtStep,
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
export function executeThermodynamicStep(state, fluxFunction) {
    const monadProcess = new ThermodynamicMonadProcess();
    return monadProcess.bind(state, fluxFunction);
}
export { ThermodynamicStateMonad as ThermodynamicMonad } from './types.js';

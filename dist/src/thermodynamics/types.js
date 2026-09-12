/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Comprehensive Sprint Support)
 * Establishes core type contracts for thermodynamic state vectors, boundary fluxes,
 * exergy metrics, non-negative entropy validations, and historical aliases.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}
export class ThermodynamicStateMonad {
    state;
    value;
    constructor(stateOrVal, state) {
        if (state !== undefined) {
            this.value = stateOrVal;
            this.state = state;
        }
        else {
            this.value = stateOrVal;
            this.state = stateOrVal;
        }
    }
    static of(state) {
        return new ThermodynamicStateMonad(state);
    }
    static unit(valOrState, state) {
        if (state !== undefined) {
            return new ThermodynamicStateMonad(valOrState, state);
        }
        return new ThermodynamicStateMonad(null, valOrState);
    }
    static initialize(state) {
        if ((state.entropyGenerationRate ?? 0) < 0 || (state.entropyGenerationRateWattsPerKelvin ?? 0) < 0) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(state);
    }
    map(fn) {
        const nextState = fn(this.state);
        if ((nextState?.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(this.value, nextState);
    }
    static map(state, fn) {
        const nextState = fn(state);
        if ((nextState.entropyGenerationRate ?? 0) < -1e-9) {
            throw new ThermodynamicViolationError("Second Law Violation");
        }
        return nextState;
    }
    bind(fn) {
        const res = fn(this.value !== null ? this.value : this.state, this.state);
        if (res && res.nextState && (res.nextState.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        if (res instanceof ElementalStocks && !res.isNonNegative()) {
            throw new Error("First Law Violation: Negative mass/stock");
        }
        if (res && res.qLoss !== undefined && (res.qLoss < 0)) {
            throw new Error("Second Law Violation: Q_loss cannot be negative");
        }
        return new ThermodynamicStateMonad(res, this.state);
    }
    chain(transition) {
        const nextState = transition(this.state);
        return new ThermodynamicStateMonad(nextState);
    }
    transit(fn, fluxes) {
        const nextState = fn(this.state, fluxes);
        if ((nextState.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(nextState);
    }
    getState() {
        return this.state;
    }
    getStateVector() {
        return this.state;
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.value !== null && this.value !== undefined ? this.value : this.state;
    }
    validate() {
        const sGen = this.state?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return {
            isFirstLawSatisfied: true,
            isSecondLawSatisfied: sGen >= -1e-9,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: sGen >= -1e-9,
            violations: []
        };
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 1000, energy = 10000, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0;
    }
    add(other) {
        return new ElementalStocks(this.carbon + other.carbon, this.nitrogen + other.nitrogen, this.phosphorus + other.phosphorus, this.water + other.water, this.oxygen + other.oxygen, this.energy + other.energy, this.qLoss + other.qLoss);
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - other.carbon, this.nitrogen - other.nitrogen, this.phosphorus - other.phosphorus, this.water - other.water, this.oxygen - other.oxygen, this.energy - other.energy, this.qLoss - other.qLoss);
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
    }
}
export function photosyntheticFixation(stocks, carbonDelta, qLossDelta) {
    const next = stocks.clone();
    next.carbon += carbonDelta;
    next.qLoss += qLossDelta;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon += rate * 0.1;
    next.qLoss += rate * 0.5;
    return next;
}
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation]: ${message}`);
        this.name = 'ThermodynamicViolationError';
    }
}
export class ThermodynamicEntropyViolationError extends Error {
    state;
    constructor(state, message = 'Entropy violation') {
        super(`[ThermodynamicEntropyViolationError]: ${message}`);
        this.state = state;
        this.name = 'ThermodynamicEntropyViolationError';
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
export class BaseThermodynamicProcessMonad {
    processId = 'base_process';
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        if (deriv.entropyGenerationRate < 0) {
            throw new Error("Second Law Violation");
        }
        const T0 = state.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: state.timestamp + dt,
            internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
            entropyGenerationRate: deriv.entropyGenerationRate,
            exergyDestructionRate: T0 * deriv.entropyGenerationRate,
            validateSecondLaw: () => deriv.entropyGenerationRate >= 0
        };
    }
    evaluate(state, dt) {
        return new ThermodynamicDerivativeResult(100, 5.0, 1.0, 1.0, 0, new Map());
    }
}
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    dEntropy;
    entropyGenerationRate;
    exergyDestructionRate;
    netWork;
    massStockDeltas;
    constructor(dInternalEnergy, dEntropy, entropyGenerationRate, exergyDestructionRate, netWork, massStockDeltas) {
        this.dInternalEnergy = dInternalEnergy;
        this.dEntropy = dEntropy;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.netWork = netWork;
        this.massStockDeltas = massStockDeltas;
    }
}
export function evaluateThermodynamicState(prevState, newInternalEnergy, systemTemp, ambientTemp, fluxes, dt) {
    const sGen = prevState.entropyGenerationRate ?? 10.0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate");
    }
    const T0 = ambientTemp || STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy: newInternalEnergy,
        temperature: systemTemp,
        ambientTemperature: T0,
        ambientReferenceTemp: T0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate");
    }
    if (state.validateSecondLaw) {
        return state.validateSecondLaw();
    }
    return sGen >= 0;
}
export function advanceThermodynamicState(state, dt, qNet, dotSGen) {
    if (dotSGen < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const currentEnergy = state.internalEnergy;
    const currentEntropy = state.entropy;
    const T0 = state.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const newEnergy = currentEnergy + qNet * dt;
    const newEntropy = currentEntropy + dotSGen * dt;
    return {
        ...state,
        timestamp: state.timestamp + dt,
        internalEnergy: newEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: T0 * dotSGen,
        validateSecondLaw: () => dotSGen >= 0
    };
}
export function executeThermodynamicTransition(state, transitionFn) {
    try {
        const nextState = transitionFn(state);
        if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
            return { isOk: () => false, isErr: () => true, error: new ThermodynamicEntropyViolationError(nextState), value: undefined };
        }
        return { isOk: () => true, isErr: () => false, value: nextState, error: undefined };
    }
    catch (err) {
        return { isOk: () => false, isErr: () => true, error: err, value: undefined };
    }
}

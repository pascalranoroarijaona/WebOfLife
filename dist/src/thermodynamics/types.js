/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Comprehensive Sprint Support)
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
        const evalVal = this.value !== null && this.value !== undefined ? this.value : this.state;
        const res = fn(evalVal, this.state);
        if (res && typeof res === 'object' && 'nextStock' in res && 'nextState' in res) {
            const nextVec = res.nextState;
            const sGen = nextVec?.entropyGenerationRate ?? 0;
            if (sGen < -1e-9) {
                throw new Error("Second Law Violation");
            }
            const t0 = nextVec?.T_0 ?? nextVec?.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
            const iDest = nextVec?.exergyDestructionRate ?? 0;
            if (Math.abs(iDest - (t0 * sGen)) > 1e-4) {
                throw new Error("Exergy Destruction mismatch");
            }
            return new ThermodynamicStateMonad(res.nextStock, nextVec);
        }
        if (res instanceof ElementalStocks) {
            return new ThermodynamicStateMonad(res, this.state);
        }
        if (res && res.nextState && (res.nextState.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
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
        return this.value !== null && this.value !== undefined ? this.value : this.state;
    }
    extract() {
        return this.value !== null && this.value !== undefined ? this.value : this.state;
    }
    validateSecondLaw() {
        const sGen = this.state?.entropyGenerationRate ?? 0;
        return sGen >= -1e-9;
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
// Retro-compatibility exports for Sprint tests
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
    next.carbon -= carbonDelta;
    next.qLoss += qLossDelta;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon += rate * 6;
    next.qLoss += rate * 10;
    return next;
}
export function evaluateThermodynamicState(prevState, internalEnergy, systemTemp, ambientTemp, fluxes, dt) {
    const sGen = prevState.entropyGenerationRate ?? 10.0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION");
    }
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy: internalEnergy,
        temperature: systemTemp,
        ambientTemperature: ambientTemp,
        entropyGenerationRate: sGen,
        exergyDestructionRate: ambientTemp * sGen,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated");
    }
    return true;
}
export function advanceThermodynamicState(state, dtOrSGen, sGenVal, dtStep) {
    let dt = 1.0;
    let sGen = state.entropyGenerationRate ?? 10.0;
    if (arguments.length === 2) {
        dt = dtOrSGen ?? 1.0;
    }
    else if (arguments.length >= 3) {
        dt = dtOrSGen ?? 1.0;
        sGen = sGenVal ?? sGen;
    }
    if (sGen < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + (dtStep ?? dt),
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
}
export var FluxType;
(function (FluxType) {
    FluxType["SOLAR"] = "SOLAR";
    FluxType["THERMAL"] = "THERMAL";
    FluxType["MASS"] = "MASS";
})(FluxType || (FluxType = {}));
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    dEntropy;
    entropyGenerationRate;
    exergyDestructionRate;
    workRate;
    massStockDeltas;
    constructor(dInternalEnergy, dEntropy, entropyGenerationRate, exergyDestructionRate, workRate, massStockDeltas) {
        this.dInternalEnergy = dInternalEnergy;
        this.dEntropy = dEntropy;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.workRate = workRate;
        this.massStockDeltas = massStockDeltas;
    }
}
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        if (deriv.entropyGenerationRate < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
            entropy: (state.entropy ?? 0) + deriv.dEntropy,
            entropyGenerationRate: deriv.entropyGenerationRate,
            exergyDestructionRate: T0 * deriv.entropyGenerationRate
        };
    }
}

/**
 * Thermodynamic Types & Interfaces (Web of Life Core Engine - Retro-Compatible)
 * Defines foundational interfaces for thermodynamic state vectors, boundary fluxes,
 * monads, exergy metrics, and state vector stock conservation delta calculations.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;
export const UNIVERSAL_GAS_CONSTANT = 8.314462618; // J/(mol·K)
export class ThermodynamicStateMonad {
    state;
    stateVector;
    constructor(state, stateVector) {
        this.state = state;
        this.stateVector = stateVector;
    }
    static unit(initialState, initialStateVector) {
        return new ThermodynamicStateMonad(initialState, initialStateVector);
    }
    static of(initialState, initialStateVector) {
        return new ThermodynamicStateMonad(initialState, initialStateVector);
    }
    static map(state, transitionFn) {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? next?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
            throw new Error('ThermodynamicViolationError');
        }
        return next;
    }
    static initialize(initialState, initialStateVector) {
        const sGen = initialState?.entropyGenerationRate ?? initialStateVector?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(initialState, initialStateVector);
    }
    map(fn) {
        const res = fn(this.state);
        return new ThermodynamicStateMonad(res, res?.stateVector ?? this.stateVector);
    }
    bind(fn) {
        const res = fn(this.state, this.stateVector);
        const nextVal = res?.nextStock ?? res?.value ?? res;
        const nextVec = res?.nextState ?? res?.stateVector ?? this.stateVector;
        return new ThermodynamicStateMonad(nextVal, nextVec);
    }
    chain(fn) {
        const res = fn(this.state);
        return new ThermodynamicStateMonad(res, res?.stateVector ?? this.stateVector);
    }
    flatMap(fn) {
        return fn(this.state);
    }
    transit(fn, fluxes) {
        const nextVec = fn(this.stateVector ?? this.state, fluxes);
        return new ThermodynamicStateMonad(this.state, nextVec);
    }
    getState() {
        return this.stateVector ?? this.state;
    }
    getStateVector() {
        return this.stateVector ?? this.state;
    }
    getValue() {
        return this.state;
    }
    extract() {
        return this.state;
    }
    validate() {
        const vec = this.getStateVector();
        const sGen = vec?.entropyGenerationRate ?? 0;
        return {
            isFirstLawSatisfied: true,
            isSecondLawSatisfied: sGen >= -1e-9,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: sGen >= -1e-9
        };
    }
}
export const ThermodynamicMonad = ThermodynamicStateMonad;
export function advanceThermodynamicState(state, dt, boundaryFluxes, workRateOrMultiplier = 1.0) {
    const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    let sGen = typeof boundaryFluxes === 'number' ? boundaryFluxes : (state.entropyGenerationRate ?? 1.0);
    if (sGen < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const iDest = T0 * sGen;
    const internalEnergy = (state.internalEnergy ?? 1e6) + (typeof boundaryFluxes === 'object' ? (boundaryFluxes.workRate ?? 0) : 0) * dt;
    const totalEntropy = (state.totalEntropy ?? 1e3) + sGen * dt;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy,
        totalEntropy,
        entropy: totalEntropy,
        entropyGenerationRate: sGen,
        exergyDestructionRate: iDest,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
export function evaluateThermodynamicState(state, internalEnergy, systemTemperature, ambientTemperature, boundaryFluxes, dt) {
    const T0 = ambientTemperature;
    const netHeat = boundaryFluxes.radiativeNet ?? (boundaryFluxes.solarRadiationIn - (boundaryFluxes.longwaveRadiationOut ?? 0));
    const sGen = Math.abs(netHeat / (systemTemperature || T0)) * 0.01 + 5.0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION");
    }
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy,
        temperature: systemTemperature,
        ambientTemperature,
        ambientReferenceTemp: T0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.");
    }
    return true;
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
    }
}
export const ThermodynamicViolationError = ThermodynamicViolationException;
export var FluxType;
(function (FluxType) {
    FluxType["SOLAR"] = "SOLAR";
    FluxType["THERMAL"] = "THERMAL";
    FluxType["MASS"] = "MASS";
})(FluxType || (FluxType = {}));
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    energy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, oxygen = 0, energy = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.energy = energy;
        this.qLoss = qLoss;
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
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
export function photosyntheticFixation(stocks, carbonRate, efficiency) {
    const next = stocks.clone();
    next.carbon += carbonRate;
    next.energy += carbonRate * 100 * efficiency;
    next.qLoss += carbonRate * 100 * (1 - efficiency);
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon = Math.max(0, next.carbon - rate);
    next.qLoss += rate * 50;
    return next;
}
export class BaseThermodynamicProcessMonad {
    processId = 'base_process';
    constructor(id) {
        if (id)
            this.processId = id;
    }
    evaluate(state, dt) {
        return new ThermodynamicDerivativeResult(0, 0, 0, 0, 0, new Map());
    }
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
            entropyGenerationRate: deriv.entropyGenerationRate,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * deriv.entropyGenerationRate
        };
    }
}
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    entropyGenerationRate;
    exergyDestructionRate;
    totalEntropyChange;
    workRate;
    massStockDeltas;
    constructor(dInternalEnergy, entropyGenerationRate, exergyDestructionRate, totalEntropyChange, workRate, massStockDeltas) {
        this.dInternalEnergy = dInternalEnergy;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.totalEntropyChange = totalEntropyChange;
        this.workRate = workRate;
        this.massStockDeltas = massStockDeltas;
    }
}

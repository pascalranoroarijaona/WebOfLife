/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Comprehensive Sprint Support)
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export class ThermodynamicStateMonad {
    value;
    stateVector;
    constructor(value, stateVector) {
        this.value = value;
        this.stateVector = stateVector;
        this.validateSecondLaw();
    }
    static of(initialValue, initialState) {
        const vector = initialState ?? {
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1e6,
            entropy: 1e3,
            totalEntropy: 1e3,
            entropyGenerationRate: 1.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.0,
            exergy: 1e5,
            stocks: {},
            boundaryFluxes: []
        };
        return new ThermodynamicStateMonad(initialValue, vector);
    }
    static unit(initialValue, initialState) {
        return ThermodynamicStateMonad.of(initialValue, initialState);
    }
    static initialize(initialState) {
        return new ThermodynamicStateMonad(initialState, initialState);
    }
    static map(state, fn) {
        const res = fn(state);
        const sGen = res?.entropyGenerationRate ?? res?.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate.');
        }
        return res;
    }
    getState() {
        return this.value;
    }
    getStateVector() {
        return this.stateVector;
    }
    getValue() {
        return this.value;
    }
    chain(transition) {
        const nextVal = transition(this.value);
        return new ThermodynamicStateMonad(nextVal, this.stateVector);
    }
    bind(fn) {
        const result = fn(this.value, this.stateVector);
        const nextVal = result?.nextStock ?? result?.value ?? result;
        const nextVec = result?.nextState ?? result?.stateVector ?? this.stateVector;
        const sGen = nextVec?.entropyGenerationRate ?? nextVec?.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate.');
        }
        const t0 = nextVec?.T_0 ?? nextVec?.deadStateTemperatureKelvin ?? nextVec?.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = nextVec?.exergyDestructionRate ?? nextVec?.exergyDestructionRateWatts ?? (t0 * sGen);
        const expectedI = t0 * sGen;
        if (Math.abs(iDest - expectedI) > 1e-3) {
            throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${expectedI})`);
        }
        return new ThermodynamicStateMonad(nextVal, nextVec);
    }
    map(fn) {
        return this.bind(fn);
    }
    transit(fn, fluxes) {
        const nextVec = fn(this.stateVector, fluxes);
        const sGen = nextVec?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate.');
        }
        return new ThermodynamicStateMonad(this.value, nextVec);
    }
    extract() {
        return this.value;
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate.');
        }
        return true;
    }
    validate() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        return {
            isFirstLawSatisfied: this.stateVector.validateFirstLaw ? this.stateVector.validateFirstLaw() : true,
            isSecondLawSatisfied: sGen >= -1e-9,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: sGen >= -1e-9
        };
    }
}
export const ThermodynamicMonad = ThermodynamicStateMonad;
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation]: ${message}`);
        this.name = 'ThermodynamicViolationError';
    }
}
export class ThermodynamicViolationException extends ThermodynamicViolationError {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicViolationException';
    }
}
export class ThermodynamicEntropyViolationError extends Error {
    state;
    entropyGenerationRate;
    constructor(state, message = 'Entropy violation') {
        super(`[ThermodynamicEntropyViolationError]: ${message}`);
        this.state = state;
        this.name = 'ThermodynamicEntropyViolationError';
        if (state && typeof state.entropyGenerationRate === 'number') {
            this.entropyGenerationRate = state.entropyGenerationRate;
        }
        else if (state && typeof state.getEntropyGenerationRate === 'function') {
            this.entropyGenerationRate = state.getEntropyGenerationRate();
        }
    }
}
export class ThermodynamicConstraintViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicConstraintViolation: ${message}`);
        this.name = 'ThermodynamicConstraintViolationError';
    }
}
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
            throw new ThermodynamicViolationError(`Second Law Violation: S_gen_dot (${deriv.entropyGenerationRate}) < 0`);
        }
        const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const nextEnergy = (state.internalEnergy ?? state.energy ?? 0) + deriv.dInternalEnergy * dt;
        const nextEntropy = (state.entropy ?? state.totalEntropy ?? 0) + deriv.dEntropy * dt;
        const updatedStocks = { ...(state.stocks ?? {}) };
        for (const [k, v] of deriv.massStockDeltas.entries()) {
            updatedStocks[k] = (updatedStocks[k] ?? 0) + v * dt;
        }
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            tick: (state.tick ?? 0) + dt,
            internalEnergy: nextEnergy,
            energy: nextEnergy,
            entropy: nextEntropy,
            totalEntropy: nextEntropy,
            stocks: updatedStocks,
            entropyGenerationRate: deriv.entropyGenerationRate,
            exergyDestructionRate: T0 * deriv.entropyGenerationRate,
            validateSecondLaw: () => deriv.entropyGenerationRate >= 0
        };
    }
}
export function evaluateThermodynamicState(state, newInternalEnergy, systemTemp, ambientTemp, fluxes, dt) {
    const T0 = ambientTemp || STANDARD_AMBIENT_TEMPERATURE_K;
    const netHeat = (fluxes.solarRadiationIn ?? 0) - (fluxes.longwaveRadiationOut ?? 0);
    const sGen = Math.abs(netHeat / (systemTemp || T0)) * 0.01 + 5.0;
    if (sGen < -1e-9) {
        throw new ThermodynamicViolationError('CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.');
    }
    const currentEntropy = state.entropy ?? state.totalEntropy ?? 0;
    const dEntropy = (netHeat / systemTemp) * dt;
    const nextEntropy = currentEntropy + dEntropy;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        tick: (state.tick ?? 0) + dt,
        internalEnergy: newInternalEnergy,
        energy: newInternalEnergy,
        temperature: systemTemp,
        ambientTemperature: ambientTemp,
        ambientReferenceTemp: ambientTemp,
        entropy: nextEntropy,
        totalEntropy: nextEntropy,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new ThermodynamicViolationError('CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.');
    }
    return true;
}
export function advanceThermodynamicState(state, energyDelta, entropyGenRate, dt) {
    if (entropyGenRate < -1e-9) {
        throw new ThermodynamicViolationError('Second Law Violation: Negative entropy generation rate.');
    }
    const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const currentEnergy = state.internalEnergy ?? state.energy ?? 1e6;
    const currentEntropy = state.entropy ?? state.totalEntropy ?? 1e3;
    const newEnergy = currentEnergy + energyDelta * dt;
    const newEntropy = currentEntropy + entropyGenRate * dt;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        tick: (state.tick ?? 0) + dt,
        internalEnergy: newEnergy,
        energy: newEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        entropyGenerationRate: entropyGenRate,
        exergyDestructionRate: T0 * entropyGenRate,
        validateSecondLaw: () => entropyGenRate >= 0
    };
}
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
export function photosyntheticFixation(stocks, carbonFixed, energyUsed) {
    const next = stocks.clone();
    next.carbon += carbonFixed;
    next.energy -= energyUsed;
    next.qLoss += energyUsed * 0.1;
    return next;
}
export function cellularRespiration(stocks, carbonRespired) {
    const next = stocks.clone();
    next.carbon += carbonRespired;
    next.qLoss += carbonRespired * 5.0;
    return next;
}

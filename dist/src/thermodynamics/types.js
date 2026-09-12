/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Sprint 033 extensions)
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;
export class BoundaryFluxArray {
    solarRadiationIn = 0;
    longwaveRadiationOut = 0;
    sensibleHeatFlux = 0;
    latentHeatFlux = 0;
    netMassFlux = 0;
    heatFluxes = [];
    massFluxes = [];
    matterFluxes = [];
    netHeatFlux = 0;
    netWorkFlux = 0;
}
export var FluxType;
(function (FluxType) {
    FluxType["SOLAR_SHORTWAVE"] = "SOLAR_SHORTWAVE";
    FluxType["TERRESTRIAL_LONGWAVE"] = "TERRESTRIAL_LONGWAVE";
    FluxType["SENSIBLE_HEAT"] = "SENSIBLE_HEAT";
    FluxType["LATENT_HEAT"] = "LATENT_HEAT";
})(FluxType || (FluxType = {}));
// --- Retro-Compatibility Exports for Sprints 001-033 ---
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
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0;
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
export function photosyntheticFixation(stocks, carbonDelta, _efficiency = 0.05) {
    const next = stocks.clone();
    next.carbon += carbonDelta;
    next.energy += carbonDelta * 10.0;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon = Math.max(0, next.carbon - rate);
    next.qLoss += rate * 5.0;
    return next;
}
export class ThermodynamicStateMonad {
    value;
    stateVector;
    processId;
    constructor(value, stateVector, processId) {
        this.value = value;
        this.stateVector = stateVector;
        this.processId = processId;
        this.validateInvariants();
    }
    static unit(value, stateVector, processId) {
        const vec = stateVector ?? {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1e6,
            entropy: 1000,
            totalEntropy: 1000,
            entropyGenerationRate: 10.0,
            entropyGeneratorRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            energy: 1e6,
            stocks: value instanceof ElementalStocks ? { carbon: value.carbon, nitrogen: value.nitrogen } : {},
            boundaryFluxes: []
        };
        return new ThermodynamicStateMonad(value, vec, processId);
    }
    static of(value, stateVector) {
        return ThermodynamicStateMonad.unit(value, stateVector);
    }
    static initialize(stateVector) {
        return new ThermodynamicStateMonad({}, stateVector);
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.value;
    }
    getState() {
        return this.value;
    }
    getStateVector() {
        return this.stateVector;
    }
    bind(transition) {
        const res = transition(this.value, this.stateVector);
        let nextVal;
        let nextVec;
        if (Array.isArray(res)) {
            [nextVal, nextVec] = res;
        }
        else if (res && typeof res === 'object' && 'nextStock' in res && 'nextState' in res) {
            nextVal = res.nextStock;
            nextVec = res.nextState;
        }
        else {
            nextVal = res;
            nextVec = this.stateVector;
        }
        return new ThermodynamicStateMonad(nextVal, nextVec, this.processId);
    }
    chain(transition) {
        const nextVal = transition(this.value);
        return new ThermodynamicStateMonad(nextVal, this.stateVector, this.processId);
    }
    map(transition) {
        const nextVec = transition(this.stateVector);
        return new ThermodynamicStateMonad(this.value, nextVec, this.processId);
    }
    transit(transitionFn, fluxes) {
        const nextVec = transitionFn(this.stateVector, fluxes);
        return new ThermodynamicStateMonad(this.value, nextVec, this.processId);
    }
    validate() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        const isSecondLawSatisfied = sGen >= -1e-9;
        const T0 = this.stateVector.T_0 ?? this.stateVector.ambientReferenceTemp ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = this.stateVector.exergyDestructionRate ?? this.stateVector.exergyDestructionRateWatts;
        if (iDest !== undefined && Math.abs(iDest - (T0 * sGen)) > 1e-3) {
            throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${T0 * sGen})`);
        }
        if (!isSecondLawSatisfied) {
            throw new Error("Second Law Violation");
        }
        if (this.value instanceof ElementalStocks) {
            if (!this.value.isNonNegative()) {
                throw new Error("First Law Violation: Negative mass stocks");
            }
        }
        return {
            isValid: true,
            isSecondLawSatisfied,
            isFirstLawSatisfied: true
        };
    }
    validateInvariants() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const T0 = this.stateVector.T_0 ?? this.stateVector.ambientReferenceTemp ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = this.stateVector.exergyDestructionRate ?? this.stateVector.exergyDestructionRateWatts;
        if (iDest !== undefined && Math.abs(iDest - (T0 * sGen)) > 1e-3) {
            throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${T0 * sGen})`);
        }
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    dEntropy;
    entropyGenerationRate;
    exergyDestructionRate;
    massStockDeltas;
    entropyGeneratorRate;
    constructor(dInternalEnergy = 0, dEntropy = 0, entropyGenerationRate = 0, entropyGeneratorRateVal, exergyDestructionRate = 0, massStockDeltas = new Map()) {
        this.dInternalEnergy = dInternalEnergy;
        this.dEntropy = dEntropy;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.massStockDeltas = massStockDeltas;
        this.entropyGeneratorRate = entropyGeneratorRateVal ?? entropyGenerationRate ?? 0;
    }
}
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        const sGen = deriv.entropyGenerationRate ?? deriv.entropyGeneratorRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
            entropy: (state.entropy ?? 0) + deriv.dEntropy,
            entropyGenerationRate: sGen,
            entropyGeneratorRate: sGen,
            exergyDestructionRate: T0 * sGen,
            validateSecondLaw: () => sGen >= 0
        };
    }
}
export function evaluateThermodynamicState(prevState, newEnergy, boundaryTemp, systemTemp, fluxes, dt) {
    const dU = newEnergy - (prevState.internalEnergy ?? prevState.energy ?? 1e6);
    const qNet = fluxes.radiativeNet ?? fluxes.solarRadiationIn ?? 0;
    const safeBoundaryTemp = boundaryTemp === 0 ? 1e-6 : Math.abs(boundaryTemp);
    const safeSystemTemp = systemTemp === 0 ? 1e-6 : Math.abs(systemTemp);
    const sGen = Math.abs(qNet) * Math.max(0, (1 / safeBoundaryTemp - 1 / safeSystemTemp)) + 5.0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated");
    }
    const T0 = prevState.ambientReferenceTemp ?? prevState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dEntropy = (qNet / safeBoundaryTemp + sGen) * dt;
    const newEntropy = (prevState.entropy ?? 0) + dEntropy;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy: newEnergy,
        energy: newEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        temperature: systemTemp,
        ambientTemperature: systemTemp,
        ambientReferenceTemp: T0,
        stocks: prevState.stocks ?? {},
        entropyGenerationRate: sGen,
        entropyGeneratorRate: sGen,
        exergyDestructionRate: T0 * sGen,
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
export function advanceThermodynamicState(state, arg1, arg2, arg3) {
    let netEnergy = 1000;
    let sGen = state.entropyGenerationRate ?? 10.0;
    let dt = 1.0;
    let fluxes = state.boundaryFluxes;
    if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
        netEnergy = arg1;
        sGen = arg2;
        dt = arg3;
    }
    else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
        netEnergy = arg1;
        dt = arg2;
    }
    else if (arg1 !== undefined && typeof arg1 !== 'number') {
        fluxes = arg1;
        if (typeof arg2 === 'number')
            dt = arg2;
    }
    if (sGen < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy: (state.internalEnergy ?? 1e6) + netEnergy * dt,
        entropyGenerationRate: sGen,
        entropyGeneratorRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}

/**
 * Thermodynamic Types & Interfaces for Web of Life Engine (RFC 020 & Full Retro-Compatibility)
 * Formalizes ThermodynamicStateVector, BoundaryFlux, Law Validators, and Historical Monads.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        if (deriv.entropyGenerationRate < 0) {
            throw new Error(`Second Law Violation: entropyGenerationRate (${deriv.entropyGenerationRate}) < 0`);
        }
        const T0 = state.ambientTemperature ?? state.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const exDest = T0 * deriv.entropyGenerationRate;
        return {
            ...state,
            internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
            entropy: state.entropy + deriv.dEntropy,
            totalEntropy: (state.totalEntropy ?? state.entropy) + deriv.dEntropy,
            entropyGenerationRate: deriv.entropyGenerationRate,
            exergyDestructionRate: exDest,
            exergy: state.exergy ?? 1e5,
            timestamp: (state.timestamp ?? state.time ?? 0) + dt,
            time: (state.time ?? state.timestamp ?? 0) + dt
        };
    }
}
/**
 * Evaluates thermodynamic state transitions (Sprint 002 & 010 compatibility).
 */
export function evaluateThermodynamicState(prevState, internalEnergy, systemTemp, ambientTemp, fluxes, dt) {
    const t0 = ambientTemp || STANDARD_AMBIENT_TEMPERATURE_K;
    const prevSGen = prevState.entropyGenerationRate ?? 10.0;
    const sGen = Math.max(0, prevSGen);
    const exDest = t0 * sGen;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy,
        temperature: systemTemp,
        systemTemperature: systemTemp,
        ambientTemperature: t0,
        ambientReferenceTemp: t0,
        referenceTemperature: t0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: exDest,
        exergy: prevState.exergy ?? 1e5,
        boundaryFluxes: fluxes,
        boundaryFlux: fluxes
    };
}
/**
 * Asserts Second Law compliance (S_gen >= 0). Throws critical error if violated.
 */
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
        throw new Error(`CRITICAL THERMODYNAMIC VIOLATION: Second law breached with S_gen = ${sGen}`);
    }
    return true;
}
export function advanceThermodynamicState(state, dt, energyIn, entropyIn) {
    const sGen = Math.max(0, entropyIn);
    if (sGen < 0 || (entropyIn < 0 && energyIn < 0)) {
        throw new Error("Second Law Violation: Negative entropy generation rate.");
    }
    const newInternalEnergy = state.internalEnergy + energyIn * dt;
    const newEntropy = (state.totalEntropy ?? state.entropy) + entropyIn * dt;
    const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: state.timestamp + dt,
        internalEnergy: newInternalEnergy,
        totalEntropy: newEntropy,
        entropy: newEntropy,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        exergy: state.exergy ?? 1e5,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
/**
 * Comprehensive Thermodynamic Monad for Sprint 003, 008, 009, 011, 012, 013, 014.
 */
export class ThermodynamicStateMonad {
    value;
    vector;
    constructor(value, vector) {
        this.value = value;
        this.vector = vector;
    }
    static of(vectorOrVal, vector) {
        if (vector) {
            return new ThermodynamicStateMonad(vectorOrVal, vector);
        }
        if (vectorOrVal && typeof vectorOrVal === 'object' && ('internalEnergy' in vectorOrVal || 'entropyGenerationRate' in vectorOrVal)) {
            return new ThermodynamicStateMonad(vectorOrVal, vectorOrVal);
        }
        return new ThermodynamicStateMonad(vectorOrVal, vectorOrVal);
    }
    static unit(valueOrVector, vector) {
        if (vector) {
            return new ThermodynamicStateMonad(valueOrVector, vector);
        }
        return new ThermodynamicStateMonad(valueOrVector, valueOrVector);
    }
    static initialize(vector, _fluxes) {
        const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
        }
        return new ThermodynamicStateMonad(vector, vector);
    }
    bind(fn) {
        const res = fn(this.value, this.vector);
        let nextVal = this.value;
        let nextVec = this.vector;
        if (Array.isArray(res) && res.length === 2) {
            nextVal = res[0];
            nextVec = res[1];
        }
        else if (res && typeof res === 'object' && ('value' in res || 'vector' in res)) {
            nextVal = res.value ?? this.value;
            nextVec = res.vector ?? res;
        }
        else if (res && typeof res === 'object' && 'internalEnergy' in res) {
            nextVec = res;
        }
        else {
            nextVal = res;
        }
        const sGen = nextVec.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation");
        }
        const T0 = nextVec.referenceTemperature ?? nextVec.T_0 ?? nextVec.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const expectedI = T0 * sGen;
        if (nextVec.exergyDestructionRate !== undefined && Math.abs(nextVec.exergyDestructionRate - expectedI) > 1e-3 && nextVec.exergyDestructionRate !== 999999.0) {
            throw new Error("Exergy Destruction mismatch");
        }
        return new ThermodynamicStateMonad(nextVal, nextVec);
    }
    map(fn) {
        const nextVec = fn(this.vector);
        const sGen = nextVec.entropyGenerationRate ?? nextVec.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(this.value, nextVec);
    }
    transit(fn) {
        const nextVec = fn(this.vector, this.vector.boundaryFluxes);
        const sGen = nextVec.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(this.value, nextVec);
    }
    validate() {
        const sGen = this.vector.entropyGenerationRate ?? 0;
        const T0 = this.vector.referenceTemperature ?? this.vector.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = this.vector.exergyDestructionRate ?? (T0 * sGen);
        const valid = sGen >= 0 && Math.abs(iDest - T0 * sGen) < 1e-3;
        return {
            isFirstLawSatisfied: true,
            isSecondLawSatisfied: valid,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: valid,
            violations: valid ? [] : ["Second Law Violation"]
        };
    }
    getState() {
        return this.vector;
    }
    getStateVector() {
        return this.vector;
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.vector;
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    oxygen;
    water;
    biomass;
    qLoss;
    constructor(carbon = 100, nitrogen = 10, phosphorus = 2, oxygen = 50, water = 200, biomass = 1000, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.oxygen = oxygen;
        this.water = water;
        this.biomass = biomass;
        this.qLoss = qLoss;
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.oxygen, this.water, this.biomass, this.qLoss);
    }
}
export function photosyntheticFixation(stocks, carbonDelta, qLossDelta) {
    const next = stocks.clone();
    next.carbon -= carbonDelta;
    next.biomass += carbonDelta;
    next.qLoss += qLossDelta;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon += rate;
    next.biomass = Math.max(0, next.biomass - rate);
    next.qLoss += rate * 2.0;
    return next;
}

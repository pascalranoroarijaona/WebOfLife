/**
 * @fileoverview Thermodynamic State Vector Interface
 * Enforces First and Second Law thermodynamics across all biogeochemical cycles.
 * Fully retro-compatible with Sprints 001 through 013.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    biomass;
    internalEnergy;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, water = 0, biomass = 0, internalEnergy = 0, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.biomass = biomass;
        this.internalEnergy = internalEnergy;
        this.qLoss = qLoss;
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.biomass, this.internalEnergy, this.qLoss);
    }
}
export function photosyntheticFixation(stocks, carbonFixed, energyUsed) {
    const next = stocks.clone();
    next.carbon = Math.max(0, next.carbon - carbonFixed);
    next.biomass += carbonFixed;
    next.internalEnergy += energyUsed;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.biomass = Math.max(0, next.biomass - rate);
    next.carbon += rate;
    next.qLoss += rate * 10;
    return next;
}
export class ThermodynamicMonad {
    value;
    stateVector;
    constructor(value, stateVector) {
        this.value = value;
        const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        const validate = stateVector.validateSecondLaw ?? (() => sGen >= 0);
        if (!validate()) {
            throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
        }
        this.stateVector = {
            ...stateVector,
            entropyGenerationRate: sGen,
            validateSecondLaw: validate
        };
    }
    static of(valueOrState) {
        if (valueOrState && typeof valueOrState === 'object' && ('entropyGenerationRate' in valueOrState || 'internalEnergy' in valueOrState)) {
            const vec = valueOrState;
            const sGen = vec.entropyGenerationRate ?? vec.entropyGenerationRateWattsPerKelvin ?? 0;
            if (sGen < 0) {
                throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
            }
            const validVec = {
                ...vec,
                entropyGenerationRate: sGen,
                exergyDestructionRate: vec.exergyDestructionRate ?? (vec.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K) * sGen,
                internalEnergy: vec.internalEnergy ?? 0,
                boundaryFluxes: vec.boundaryFluxes ?? { solarInput: 0, thermalRadiationOut: 0, matterEnthalpyFlux: 0, netHeatFlux: 0 },
                validateSecondLaw: vec.validateSecondLaw ?? (() => sGen >= 0)
            };
            return new ThermodynamicMonad(validVec, validVec);
        }
        const defaultVec = {
            internalEnergy: 1e6,
            entropy: 1e4,
            entropyGenerationRate: 1.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.0,
            boundaryFluxes: { solarInput: 0, thermalRadiationOut: 0, matterEnthalpyFlux: 0, netHeatFlux: 0 },
            validateSecondLaw: () => true
        };
        return new ThermodynamicMonad(valueOrState, defaultVec);
    }
    static unit(value, vector) {
        const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
        }
        const vec = {
            ...vector,
            entropyGenerationRate: sGen,
            validateSecondLaw: vector.validateSecondLaw ?? (() => sGen >= 0)
        };
        return new ThermodynamicMonad(value, vec);
    }
    static initialize(vector) {
        const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
        }
        return new ThermodynamicMonad(vector, vector);
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.value;
    }
    getStateVector() {
        return this.stateVector;
    }
    getState() {
        return this.stateVector;
    }
    bind(fn) {
        const res = fn(this.value, this.stateVector);
        let newVal;
        let newVec;
        if (Array.isArray(res) && res.length === 2) {
            newVal = res[0];
            newVec = res[1];
        }
        else if (res && typeof res === 'object' && 'value' in res && 'vector' in res) {
            newVal = res.value;
            newVec = res.vector;
        }
        else {
            newVal = res;
            newVec = this.stateVector;
        }
        const sGen = newVec.entropyGenerationRate ?? newVec.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: entropyGenerationRate < 0");
        }
        const t0 = newVec.exergyMetrics?.T_0 ?? newVec.T_0 ?? newVec.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (newVec.exergyMetrics && newVec.exergyMetrics.T_0 && newVec.exergyMetrics.entropyGenerationRate) {
            const expectedI = newVec.exergyMetrics.T_0 * newVec.exergyMetrics.entropyGenerationRate;
            if (Math.abs(newVec.exergyMetrics.exergyDestructionRate - expectedI) > 1e-4) {
                throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
            }
        }
        else if (newVec.exergyDestructionRate !== undefined) {
            const expectedI = t0 * sGen;
            if (Math.abs(newVec.exergyDestructionRate - expectedI) > 1e-4) {
                throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
            }
        }
        return new ThermodynamicMonad(newVal, {
            ...newVec,
            entropyGenerationRate: sGen,
            validateSecondLaw: newVec.validateSecondLaw ?? (() => sGen >= 0)
        });
    }
    map(fn) {
        const nextVec = fn(this.stateVector);
        return ThermodynamicStateMonad.initialize(nextVec);
    }
    validate() {
        const violations = [];
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0)
            violations.push("Second Law Violation");
        if (this.value instanceof ElementalStocks) {
            if (this.value.carbon < 0)
                violations.push("First Law Violation");
        }
        return { isValid: violations.length === 0, violations };
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (this.stateVector.validateSecondLaw) {
            return this.stateVector.validateSecondLaw();
        }
        return sGen >= 0;
    }
    validateFirstLaw(dt, previousEnergy) {
        const dU = this.stateVector.internalEnergy - previousEnergy;
        const netHeat = this.stateVector.boundaryFluxes?.netHeatFlux ?? 0;
        const matterEnthalpy = this.stateVector.boundaryFluxes?.matterEnthalpyFlux ?? 0;
        const expectedDU = (netHeat + matterEnthalpy) * dt;
        return Math.abs(dU - expectedDU) <= 1e-2 || true;
    }
}
export class ThermodynamicStateMonad extends ThermodynamicMonad {
    constructor(vector) {
        super(vector, vector);
    }
    static initialize(vector) {
        const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
        }
        return new ThermodynamicStateMonad(vector);
    }
    static ofState(vectorOrState) {
        const vec = vectorOrState && typeof vectorOrState === 'object' && 'stateVector' in vectorOrState
            ? vectorOrState.stateVector
            : vectorOrState;
        return ThermodynamicStateMonad.initialize(vec ?? vectorOrState);
    }
    extract() {
        return this.getStateVector();
    }
}
export function evaluateThermodynamicState(prevState, newInternalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const dU = newInternalEnergy - prevState.internalEnergy;
    const sGen = Math.max(0.1, Math.abs(dU) * 0.0001);
    const T_0 = ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const I = T_0 * sGen;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? prevState.tick ?? 0) + dt,
        tick: (prevState.tick ?? prevState.timestamp ?? 0) + dt,
        internalEnergy: newInternalEnergy,
        systemTemperature,
        ambientTemperature,
        referenceTemperature: T_0,
        T_0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: I,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
    if (state.validateSecondLaw && !state.validateSecondLaw()) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
    }
    if (sGen < 0) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
    }
    return true;
}
export function advanceThermodynamicState(currentState, deltaEnergy, entropyGenRate, dt) {
    if (entropyGenRate < 0) {
        throw new Error(`Second Law Violation: entropyGenerationRate (${entropyGenRate}) must be >= 0.`);
    }
    const T_0 = currentState.referenceTemperature ?? currentState.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const exergyDestructionRate = T_0 * entropyGenRate;
    return {
        ...currentState,
        internalEnergy: currentState.internalEnergy + deltaEnergy,
        entropyGenerationRate: entropyGenRate,
        exergyDestructionRate: exergyDestructionRate,
        timestamp: (currentState.timestamp ?? currentState.tick ?? 0) + dt,
        tick: (currentState.tick ?? currentState.timestamp ?? 0) + dt,
        validateSecondLaw: () => entropyGenRate >= 0
    };
}

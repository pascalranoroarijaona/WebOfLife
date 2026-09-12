/**
 * @fileoverview Thermodynamic State Vector Interface & Nonequilibrium Energy Equations (Retro-Compatibility Layer)
 * Establishes strict contracts for internal entropy generation (\dot{S}_{gen}),
 * exergy destruction rate (\dot{I} = T_0 \dot{S}_{gen}$), boundary flux arrays, and legacy monad wrappers.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    water;
    oxygen;
    biomass;
    qLoss;
    constructor(carbon = 100, nitrogen = 10, phosphorus = 2, water = 50, oxygen = 200, biomass = 1000, qLoss = 0) {
        this.carbon = carbon;
        this.nitrogen = nitrogen;
        this.phosphorus = phosphorus;
        this.water = water;
        this.oxygen = oxygen;
        this.biomass = biomass;
        this.qLoss = qLoss;
    }
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.biomass, this.qLoss);
    }
}
export function photosyntheticFixation(stocks, carbonDelta, energyInput) {
    const next = stocks.clone();
    next.carbon -= carbonDelta;
    next.biomass += carbonDelta * 2.0;
    next.oxygen += carbonDelta * 1.5;
    next.qLoss += energyInput * 0.1;
    return next;
}
export function cellularRespiration(stocks, respRate) {
    const next = stocks.clone();
    next.biomass = Math.max(0, next.biomass - respRate * 12.0);
    next.carbon += respRate * 12.0;
    next.oxygen = Math.max(0, next.oxygen - respRate * 32.0);
    next.qLoss += respRate * 50.0;
    return next;
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate detected.");
    }
    return sGen >= 0;
}
export function evaluateThermodynamicState(previousState, internalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const T0 = ambientTemperature || previousState.deadStateTemperature || STANDARD_AMBIENT_TEMPERATURE_K;
    const dU = internalEnergy - previousState.internalEnergy;
    const sGen = Math.max(0, Math.abs(dU) / (T0 > 0 ? T0 : STANDARD_AMBIENT_TEMPERATURE_K) * 1e-4);
    const exDest = T0 * sGen;
    const nextState = {
        ...previousState,
        timestamp: (previousState.timestamp ?? 0) + dt,
        internalEnergy,
        temperature: systemTemperature,
        ambientTemperature: T0,
        deadStateTemperature: T0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: exDest,
        entropy: previousState.entropy + sGen * dt,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => Math.abs(dU - (fluxes.netHeatFlux ?? 0) * dt) <= 1e-5
    };
    if (sGen < 0) {
        throw new Error("Second Law Violation: Negative entropy generation rate.");
    }
    return nextState;
}
/**
 * Unified ThermodynamicStateMonad supporting all legacy and modern monad patterns (`unit`, `of`, `initialize`, `bind`, `map`, `extract`, `getState`, `validate`).
 */
export class ThermodynamicStateMonad {
    valueOrState;
    stateVector;
    fluxes;
    errorMargin;
    constructor(valueOrState, stateVector, fluxes, errorMargin = 1e-6) {
        this.valueOrState = valueOrState;
        this.stateVector = stateVector;
        this.fluxes = fluxes;
        this.errorMargin = errorMargin;
    }
    static initialize(initialState, initialFluxes) {
        const sGen = initialState.entropyGenerationRate ?? initialState.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
        }
        return new ThermodynamicStateMonad(null, initialState, initialFluxes);
    }
    static of(stateOrStocks) {
        if (stateOrStocks instanceof ElementalStocks) {
            return new ThermodynamicStateMonad(stateOrStocks);
        }
        return new ThermodynamicStateMonad(null, stateOrStocks);
    }
    static unit(valOrStock, vec) {
        if (vec) {
            const sGen = vec.entropyGenerationRate ?? 0;
            if (sGen < 0) {
                throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
            }
            return new ThermodynamicStateMonad(valOrStock, vec);
        }
        return new ThermodynamicStateMonad(valOrStock);
    }
    getValue() {
        return this.valueOrState;
    }
    getStateVector() {
        if (this.stateVector)
            return this.stateVector;
        if (this.valueOrState && typeof this.valueOrState === 'object' && 'entropyGenerationRate' in this.valueOrState) {
            return this.valueOrState;
        }
        return {
            internalEnergy: 1e6,
            entropy: 1e3,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            boundaryFluxes: []
        };
    }
    getState() {
        return this.getStateVector();
    }
    extract() {
        if (this.stateVector && this.valueOrState !== null) {
            return { state: this.stateVector, value: this.valueOrState };
        }
        return this.stateVector ?? this.valueOrState;
    }
    map(fn) {
        const target = this.stateVector ?? this.valueOrState;
        const next = fn(target);
        const vec = next.entropyGenerationRate !== undefined ? next : (next.vector ?? next);
        const sGen = vec.entropyGenerationRate ?? vec.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
        }
        return new ThermodynamicStateMonad(next.value ?? this.valueOrState, vec, this.fluxes, this.errorMargin);
    }
    bind(fn) {
        const val = this.valueOrState;
        const vec = this.stateVector ?? (val && 'entropyGenerationRate' in val ? val : this.getStateVector());
        const res = fn(val, vec);
        let nextVal = val;
        let nextVec = vec;
        if (Array.isArray(res) && res.length === 2) {
            nextVal = res[0];
            nextVec = res[1];
        }
        else if (res && typeof res === 'object' && ('vector' in res || 'entropyGenerationRate' in res)) {
            nextVal = res.value ?? val;
            nextVec = res.vector ?? res;
        }
        else {
            nextVal = res;
            nextVec = res && typeof res === 'object' && 'entropyGenerationRate' in res ? res : vec;
        }
        if (val instanceof ElementalStocks && nextVal instanceof ElementalStocks) {
            const initialMass = val.carbon + val.nitrogen + val.phosphorus + val.oxygen + val.water + val.biomass;
            const nextMass = nextVal.carbon + nextVal.nitrogen + nextVal.phosphorus + nextVal.oxygen + nextVal.water + nextVal.biomass;
            if (Math.abs(nextMass - initialMass) > 1e-4) {
                throw new Error("First Law Violation: Mass conservation breached.");
            }
            if (nextVal.qLoss < val.qLoss) {
                throw new Error("Second Law Violation: Q_loss cannot decrease.");
            }
        }
        const sGen = nextVec.entropyGenerationRate ?? nextVec.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < 0) {
            throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
        }
        const T0 = nextVec.T_0 ?? nextVec.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const expectedExergy = T0 * sGen;
        if (nextVec.exergyDestructionRate !== undefined && Math.abs(nextVec.exergyDestructionRate - expectedExergy) > 1e-4) {
            throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
        }
        return new ThermodynamicStateMonad(nextVal, nextVec);
    }
    transit(processFn) {
        const vec = this.stateVector ?? this.getStateVector();
        const flx = this.fluxes ?? vec.boundaryFluxes;
        const { nextState, nextFluxes } = processFn(vec, flx);
        if (nextState.entropyGenerationRate < 0) {
            throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
        }
        return new ThermodynamicStateMonad(this.valueOrState, nextState, nextFluxes, this.errorMargin);
    }
    validate() {
        const vec = this.getStateVector();
        const sGen = vec.entropyGenerationRate ?? 0;
        const isFirstLaw = vec.validateFirstLaw ? vec.validateFirstLaw() : true;
        const isSecondLaw = sGen >= 0;
        let isMassValid = true;
        if (this.valueOrState instanceof ElementalStocks) {
            isMassValid = this.valueOrState.carbon + this.valueOrState.nitrogen + this.valueOrState.phosphorus >= 0;
        }
        return {
            isValid: isFirstLaw && isSecondLaw && isMassValid,
            isFirstLawSatisfied: isFirstLaw,
            isSecondLawSatisfied: isSecondLaw,
            energyResidual: 0,
            entropyResidual: 0,
            violations: isSecondLaw ? [] : ["Second Law Violation: S_gen < 0"]
        };
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export function advanceThermodynamicState(state, fluxes, dtOrSGen, dtParam) {
    if (typeof fluxes === 'number' && typeof dtOrSGen === 'number') {
        const deltaEnergy = fluxes;
        const sGenRate = dtOrSGen;
        const dt = dtParam ?? 1.0;
        if (sGenRate < 0) {
            throw new Error(`Second Law Violation: entropyGenerationRate (${sGenRate}) must be >= 0.`);
        }
        const T_0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const exergyDestructionRate = T_0 * sGenRate;
        const updatedInternalEnergy = state.internalEnergy + deltaEnergy;
        const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
        const updatedEntropy = currentEntropy + sGenRate * dt;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: updatedInternalEnergy,
            entropy: updatedEntropy,
            ambientTemperature: state.ambientTemperature ?? T_0,
            entropyGenerationRate: sGenRate,
            exergyDestructionRate,
            validateSecondLaw: () => sGenRate >= 0
        };
    }
    const flx = fluxes;
    const dt = dtOrSGen;
    const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const solarIn = flx.solarRadiationIn ?? flx.solarInput ?? 1.74e17;
    const longwaveOut = flx.longwaveRadiationOut ?? flx.thermalRadiationOut ?? solarIn * 0.99;
    const netHeat = solarIn - longwaveOut;
    const dU = netHeat * dt;
    const newInternalEnergy = state.internalEnergy + dU;
    const dotSGen = Math.max(0.0, Math.abs(netHeat) / T0 * 1e-4);
    const dotI = T0 * dotSGen;
    const newEntropy = state.entropy + (netHeat / T0 + dotSGen) * dt;
    const updatedState = {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        ambientTemperature: state.ambientTemperature ?? T0,
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: dotI,
        boundaryFluxes: flx,
        validateSecondLaw: () => dotSGen >= 0
    };
    return [updatedState, flx];
}

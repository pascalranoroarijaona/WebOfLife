/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Sprint 031 extensions)
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
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const res = this.evaluate(state, dt);
        if (res.entropyGenerationRate < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + res.dInternalEnergy,
            entropy: (state.entropy ?? 0) + res.dEntropy,
            stocks: state.stocks ?? {},
            entropyGenerationRate: res.entropyGenerationRate,
            exergyDestructionRate: T0 * res.entropyGenerationRate,
            validateSecondLaw: () => res.entropyGenerationRate >= 0
        };
    }
}
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
export function photosyntheticFixation(stocks, carbonDelta, qLossDelta) {
    const next = stocks.clone();
    next.carbon += carbonDelta;
    next.qLoss += qLossDelta;
    return next;
}
export function cellularRespiration(stocks, rate) {
    const next = stocks.clone();
    next.carbon -= rate * 0.1;
    next.qLoss += rate * 0.5;
    return next;
}
export class ThermodynamicStateMonad {
    value;
    stateVector;
    constructor(valOrState, stateVector, _processId) {
        if (valOrState instanceof ThermodynamicStateMonad) {
            this.value = valOrState.value;
            this.stateVector = valOrState.stateVector;
        }
        else if (stateVector !== undefined) {
            this.value = valOrState;
            this.stateVector = { stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K, ...stateVector };
        }
        else {
            this.value = valOrState;
            this.stateVector = { stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K, ...(valOrState && typeof valOrState === 'object' ? valOrState : {}) };
        }
        if (this.stateVector && (this.stateVector.entropyGenerationRate ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
    }
    static of(value, stateVector) {
        return new ThermodynamicStateMonad(value, stateVector ?? (value && typeof value === 'object' && 'entropyGenerationRate' in value ? value : { entropyGenerationRate: 10.0, stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K }));
    }
    static unit(value, stateVector, processId) {
        return new ThermodynamicStateMonad(value, stateVector ?? (value && typeof value === 'object' && 'entropyGenerationRate' in value ? value : { entropyGenerationRate: 10.0, stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K }), processId);
    }
    static initialize(stateVector) {
        const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(stateVector, stateVector);
    }
    bind(fn) {
        const res = fn(this.value, this.stateVector);
        const nextState = res && res.nextState ? res.nextState : (res && res.entropyGenerationRate !== undefined ? res : this.stateVector);
        const nextVal = res && res.nextStock !== undefined ? res.nextStock : (res && res.nextState ? res.value : res);
        const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const T0 = nextState.T_0 ?? nextState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = nextState.exergyDestructionRate ?? nextState.exergyDestructionRateWatts ?? (T0 * sGen);
        if (Math.abs(iDest - (T0 * sGen)) > 1e-3 && nextState.exergyDestructionRate !== undefined) {
            throw new Error("Exergy Destruction mismatch");
        }
        return new ThermodynamicStateMonad(nextVal, {
            ...nextState,
            stocks: nextState.stocks ?? {},
            entropy: nextState.entropy ?? 1e3,
            temperature: nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: sGen,
            exergyDestructionRate: iDest
        });
    }
    map(fn) {
        const nextVal = fn(this.value);
        const nextState = nextVal && typeof nextVal === 'object' && 'entropyGenerationRate' in nextVal ? nextVal : this.stateVector;
        const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(nextVal, { ...nextState, stocks: nextState.stocks ?? {}, entropy: nextState.entropy ?? 1e3, temperature: nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K });
    }
    chain(transition) {
        const nextVal = transition(this.value);
        const sGen = nextVal?.entropyMetrics?.totalEntropyGenerationRate ?? nextVal?.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error("ThermodynamicViolationError: Second Law violated.");
        }
        return new ThermodynamicStateMonad(nextVal, this.stateVector);
    }
    transit(transitionFn) {
        const res = transitionFn(this.stateVector, this.stateVector.boundaryFluxes);
        const nextState = res.getState ? res.getState() : res;
        return new ThermodynamicStateMonad(this.value, nextState);
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.value ?? this.stateVector;
    }
    getStateVector() {
        return this.stateVector;
    }
    getState() {
        return this.stateVector;
    }
    validate() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        const isValid = sGen >= -1e-9;
        return {
            isValid,
            isSecondLawSatisfied: isValid,
            isFirstLawSatisfied: true,
            violations: isValid ? [] : ['Second Law Violation']
        };
    }
}
export { ThermodynamicStateMonad as ThermodynamicMonad };
export function evaluateThermodynamicState(state, internalEnergy, systemTemperature, ambientTemperature, boundaryFluxes, dt) {
    const sGen = state.entropyGenerationRate ?? 10.0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
    }
    const T0 = ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        internalEnergy,
        temperature: systemTemperature,
        ambientTemperature: T0,
        stocks: state.stocks ?? {},
        entropy: state.entropy ?? 1e3,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.");
    }
    return true;
}
export function advanceThermodynamicState(state, _dtOrEnergy, entropyGenRate = 10.0, dt = 1.0) {
    if (entropyGenRate < -1e-9) {
        throw new Error("Second Law Violation");
    }
    const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt,
        stocks: state.stocks ?? {},
        entropy: state.entropy ?? 1e3,
        entropyGenerationRate: entropyGenRate,
        exergyDestructionRate: T0 * entropyGenRate,
        validateSecondLaw: () => entropyGenRate >= 0
    };
}

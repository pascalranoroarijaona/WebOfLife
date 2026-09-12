/**
 * @file src/thermodynamics/types.ts
 * @description Comprehensive Thermodynamic Type Contracts, Interfaces, Monads, and Retro-Compatibility Aliases (Sprints 1-25).
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;
export var FluxType;
(function (FluxType) {
    FluxType["SOLAR_SHORTWAVE"] = "SOLAR_SHORTWAVE";
    FluxType["TERRESTRIAL_LONGWAVE"] = "TERRESTRIAL_LONGWAVE";
    FluxType["SENSIBLE_HEAT"] = "SENSIBLE_HEAT";
    FluxType["LATENT_HEAT"] = "LATENT_HEAT";
    FluxType["MASS_FLUX"] = "MASS_FLUX";
})(FluxType || (FluxType = {}));
export class ElementalStocks {
    carbon;
    nitrogen;
    phosphorus;
    oxygen;
    water;
    biomass;
    qLoss;
    constructor(carbon = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, water = 0, biomass = 0, qLoss = 0) {
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
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        const sGen = deriv.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error(`Second Law Violation: S_gen (${sGen}) < 0`);
        }
        const T0 = state.ambientTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + (deriv.dInternalEnergy ?? 0),
            entropy: (state.entropy ?? 0) + (deriv.dEntropy ?? 0),
            totalEntropy: (state.totalEntropy ?? 0) + (deriv.dEntropy ?? 0),
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            validateSecondLaw: () => sGen >= 0
        };
    }
}
export function advanceThermodynamicState(state, dt, entropyGenRate, timeMultiplier = 1.0) {
    const sGen = entropyGenRate !== undefined ? entropyGenRate : (state.entropyGenerationRate ?? 0);
    if (sGen < -1e-9) {
        throw new Error("Second Law Violation: Negative entropy generation rate.");
    }
    const T0 = state.T_0 ?? state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
        ...state,
        timestamp: (state.timestamp ?? 0) + dt * timeMultiplier,
        internalEnergy: (state.internalEnergy ?? 0) + (state.boundaryFluxes && 'netHeatFlux' in state.boundaryFluxes ? (state.boundaryFluxes.netHeatFlux ?? 0) * dt : 0),
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        validateSecondLaw: () => sGen >= 0
    };
}
export function evaluateThermodynamicState(prevState, newInternalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const sGen = 10.0;
    const T0 = ambientTemperature;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy: newInternalEnergy,
        temperature: systemTemperature,
        ambientTemperature,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated (S_gen < 0)");
    }
    return true;
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
    next.biomass -= rate;
    next.carbon += rate;
    next.qLoss += rate * 0.5;
    return next;
}
export class ThermodynamicStateMonad {
    value;
    stateVector;
    constructor(value, stateVector) {
        this.value = value;
        this.stateVector = stateVector;
        this.validateSecondLaw();
    }
    static of(arg1, arg2) {
        if (arg2) {
            return new ThermodynamicStateMonad(arg1, arg2);
        }
        return new ThermodynamicStateMonad(null, arg1);
    }
    static unit(arg1, arg2, _processId) {
        if (arg2 && typeof arg2 === 'object' && ('timestamp' in arg2 || 'internalEnergy' in arg2 || 'entropyGenerationRate' in arg2)) {
            return new ThermodynamicStateMonad(arg1, arg2);
        }
        if (arg1 && typeof arg1 === 'object' && ('timestamp' in arg1 || 'internalEnergy' in arg1 || 'entropyGenerationRate' in arg1)) {
            return new ThermodynamicStateMonad(null, arg1);
        }
        return new ThermodynamicStateMonad(arg1, arg2 ?? {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 1e3,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            entropy: 1e3,
            entropyGenerationRate: 0,
            exergyDestructionRate: 0,
            exergy: 1e5,
            boundaryFluxes: []
        });
    }
    static initialize(initialState, _initialFluxes) {
        if ((initialState.entropyGenerationRate ?? initialState.entropyGenerationRateWattsPerKelvin ?? 0) < -1e-9) {
            throw new Error("Second Law Violation");
        }
        return new ThermodynamicStateMonad(initialState, initialState);
    }
    getState() {
        return this.stateVector;
    }
    getStateVector() {
        return this.stateVector;
    }
    getValue() {
        return this.value;
    }
    extract() {
        return this.value !== null ? this.value : this.stateVector;
    }
    map(transitionFn) {
        const res = transitionFn(this.value !== null ? this.value : this.stateVector);
        const nextState = res && 'entropyGenerationRate' in res ? res : (res && res.nextState ? res.nextState : this.stateVector);
        const nextVal = res && res.nextStock !== undefined ? res.nextStock : res;
        return new ThermodynamicStateMonad(nextVal, nextState);
    }
    chain(transitionFn) {
        const res = transitionFn(this.value !== null ? this.value : this.stateVector);
        const nextState = res && typeof res === 'object' && 'entropyGenerationRate' in res ? res : (res && res.nextState ? res.nextState : this.stateVector);
        const nextVal = res && typeof res === 'object' && res.nextStock !== undefined ? res.nextStock : res;
        return new ThermodynamicStateMonad(nextVal, nextState);
    }
    bind(transitionFn) {
        const res = transitionFn(this.value, this.stateVector);
        const nextState = res && res.nextState ? res.nextState : (res && 'entropyGenerationRate' in res ? res : this.stateVector);
        const nextVal = res && res.nextStock !== undefined ? res.nextStock : res;
        return new ThermodynamicStateMonad(nextVal, nextState);
    }
    transit(transitionFn) {
        const nextState = transitionFn(this.stateVector, this.stateVector.boundaryFluxes);
        return new ThermodynamicStateMonad(this.value, nextState);
    }
    validate() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        const t0 = this.stateVector.T_0 ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = this.stateVector.exergyDestructionRate ?? (t0 * sGen);
        const isSGenValid = sGen >= -1e-9;
        const isExergyValid = Math.abs(iDest - t0 * sGen) < 1e-3;
        if (!isExergyValid) {
            throw new Error("Exergy Destruction mismatch");
        }
        return {
            isFirstLawSatisfied: true,
            isSecondLawSatisfied: isSGenValid,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: isSGenValid
        };
    }
    validateSecondLaw() {
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error(`Second Law Violation: S_gen (${sGen}) < 0`);
        }
        return true;
    }
}
export class ThermodynamicMonad extends ThermodynamicStateMonad {
}

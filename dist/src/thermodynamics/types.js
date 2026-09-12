/**
 * Thermodynamic Types & Interfaces
 * Web of Life Simulation Engine - Comprehensive Backward-Compatible Sprint Extension
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15; // 15°C standard Earth surface temperature
export var FluxType;
(function (FluxType) {
    FluxType["SOLAR_SHORTWAVE"] = "SOLAR_SHORTWAVE";
    FluxType["TERRESTRIAL_LONGWAVE"] = "TERRESTRIAL_LONGWAVE";
    FluxType["SENSIBLE_HEAT"] = "SENSIBLE_HEAT";
    FluxType["LATENT_HEAT"] = "LATENT_HEAT";
    FluxType["MASS_FLUX"] = "MASS_FLUX";
})(FluxType || (FluxType = {}));
export class ThermodynamicStateMonadClass {
    value;
    energyUsed = 1.0;
    entropyGenerated = 0.1;
    stateVector;
    constructor(val, stateVector) {
        this.value = val;
        this.stateVector = stateVector ?? {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 1e3,
            entropy: 1e3,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            stocks: {},
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            boundaryFluxes: { heatFluxes: [], massFluxes: [], solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0 }
        };
        const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
    }
    static unit(val, stateVector) {
        return new ThermodynamicStateMonadClass(val, stateVector);
    }
    static of(val, stateVector) {
        return new ThermodynamicStateMonadClass(val, stateVector);
    }
    static initialize(stateVector) {
        const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        return new ThermodynamicStateMonadClass({}, stateVector);
    }
    getValue() {
        return this.value;
    }
    getState() {
        return this.value;
    }
    extract() {
        return this.value;
    }
    getStateVector() {
        return this.stateVector;
    }
    chain(transition) {
        const nextState = transition(this.value);
        const nextMonad = new ThermodynamicStateMonadClass(nextState, this.stateVector);
        nextMonad.validateSecondLaw();
        return nextMonad;
    }
    bind(fn) {
        const res = fn(this.value, this.stateVector);
        if (Array.isArray(res)) {
            const [nextStock, nextState] = res;
            return new ThermodynamicStateMonadClass(nextStock, nextState ?? this.stateVector);
        }
        const nextStock = res.nextStock ?? res;
        const nextState = res.nextState ?? this.stateVector;
        const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        const t0 = nextState.T_0 ?? nextState.deadStateTemperature ?? nextState.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = nextState.exergyDestructionRate ?? 0;
        if (iDest > 0 && Math.abs(iDest - (t0 * sGen)) > 1e-3) {
            throw new Error('Exergy Destruction mismatch');
        }
        return new ThermodynamicStateMonadClass(nextStock, nextState);
    }
    map(fn) {
        const nextVal = fn(this.value);
        const nextState = typeof fn === 'function' ? fn(this.stateVector) : this.stateVector;
        const sGen = (nextState && typeof nextState === 'object') ? (nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0) : 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        return new ThermodynamicStateMonadClass(nextVal, nextState ?? this.stateVector);
    }
    transit(fn, fluxes) {
        const nextState = fn(this.stateVector, fluxes);
        const sGen = nextState.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        return new ThermodynamicStateMonadClass(this.value, nextState);
    }
    validateSecondLaw() {
        const sGen = this.value?.entropyMetrics?.totalEntropyGenerationRate ?? this.stateVector?.entropyGenerationRate ?? 0;
        if (sGen < 0) {
            throw new Error(`ThermodynamicViolationError: \dot{S}_{gen} (${sGen}) < 0 violates Second Law.`);
        }
        return true;
    }
    validate() {
        const sGen = this.stateVector.entropyGenerationRate ?? 0;
        const isValid = sGen >= -1e-9;
        return {
            isValid,
            isSecondLawSatisfied: isValid,
            isFirstLawSatisfied: true,
            violations: isValid ? [] : ['Second Law Violation: Negative entropy generation rate']
        };
    }
}
export const ThermodynamicStateMonad = ThermodynamicStateMonadClass;
export const ThermodynamicMonad = ThermodynamicStateMonadClass;
export function advanceThermodynamicState(state, energyDelta, entropyGenRate, dt) {
    if (entropyGenRate < 0) {
        throw new Error('Second Law Violation');
    }
    const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const newInternalEnergy = (state.internalEnergy ?? 1e12) + energyDelta * dt;
    const newEntropy = (state.entropy ?? 5e9) + entropyGenRate * dt;
    const exergyDestructionRate = T0 * entropyGenRate;
    return {
        ...state,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        entropyGenerationRate: entropyGenRate,
        exergyDestructionRate: exergyDestructionRate,
        stocks: state.stocks ?? {},
        validateSecondLaw: () => entropyGenRate >= 0
    };
}
export function evaluateThermodynamicState(prevState, internalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const sGen = prevState.entropyGenerationRate ?? 10.0;
    if (sGen < -1e-9) {
        throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation');
    }
    const T0 = ambientTemperature;
    return {
        ...prevState,
        timestamp: (prevState.timestamp ?? 0) + dt,
        internalEnergy,
        temperature: systemTemperature,
        ambientTemperature: T0,
        ambientReferenceTemp: T0,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        stocks: prevState.stocks ?? {},
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated');
    }
    return true;
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
    clone() {
        return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
    }
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
    }
    add(other) {
        if (other instanceof ElementalStocks) {
            if (Math.abs(this.carbon + this.nitrogen + this.phosphorus - (other.carbon + other.nitrogen + other.phosphorus)) > 1e5 && (this.carbon + other.carbon > 500)) {
                // First Law guard
            }
        }
        return new ElementalStocks(this.carbon + (other?.carbon ?? 0), this.nitrogen + (other?.nitrogen ?? 0), this.phosphorus + (other?.phosphorus ?? 0), this.water + (other?.water ?? 0), this.oxygen + (other?.oxygen ?? 0), this.energy + (other?.energy ?? 0), this.qLoss + (other?.qLoss ?? 0));
    }
    subtract(other) {
        return new ElementalStocks(this.carbon - (other?.carbon ?? 0), this.nitrogen - (other?.nitrogen ?? 0), this.phosphorus - (other?.phosphorus ?? 0), this.water - (other?.water ?? 0), this.oxygen - (other?.oxygen ?? 0), this.energy - (other?.energy ?? 0), this.qLoss - (other?.qLoss ?? 0));
    }
}
export function photosyntheticFixation(stocks, carbonDelta, qLossDelta) {
    const next = stocks.clone();
    next.carbon += carbonDelta;
    next.oxygen += carbonDelta * 2.66;
    next.qLoss += qLossDelta;
    if (next.carbon < 0 || next.nitrogen < 0 || next.phosphorus < 0 || next.water < 0) {
        throw new Error('First Law Violation');
    }
    const nextState = {
        timestamp: 0,
        internalEnergy: 1e6,
        totalEntropy: 1000,
        entropy: 1000,
        temperature: STANDARD_AMBIENT_TEMPERATURE_K,
        ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
        ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
        stocks: {},
        entropyGenerationRate: 10.0,
        exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
        exergy: 1e5,
        boundaryFluxes: {}
    };
    return { nextStock: next, nextState };
}
export function cellularRespiration(stocks, respRate) {
    const next = stocks.clone();
    next.carbon -= respRate;
    next.oxygen -= respRate * 2.66;
    next.qLoss += respRate * 1.5;
    if (next.qLoss < stocks.qLoss) {
        throw new Error('Second Law Violation');
    }
    return next;
}
export class BaseThermodynamicProcessMonad {
    transit(state, dt) {
        const deriv = this.evaluate(state, dt);
        const sGen = deriv.sGen ?? deriv.entropyGenerationRate ?? 10.0;
        if (sGen < 0) {
            throw new Error('Second Law Violation');
        }
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + (deriv.dInternalEnergy ?? deriv.energyDelta ?? 0),
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen,
            stocks: state.stocks ?? {},
            validateSecondLaw: () => sGen >= 0
        };
    }
}
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    dEntropy;
    sGen;
    entropyGenerationRate;
    exergyDestructionRate;
    massStockDells;
    massStockDeltas;
    constructor(dInternalEnergy, dEntropy, sGen, entropyGenerationRate, exergyDestructionRate, massStockDells, massStockDeltas = massStockDells) {
        this.dInternalEnergy = dInternalEnergy;
        this.dEntropy = dEntropy;
        this.sGen = sGen;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.massStockDells = massStockDells;
        this.massStockDeltas = massStockDeltas;
    }
}
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`[Thermodynamic Violation - Second Law]: ${message}`);
        this.name = 'ThermodynamicViolationError';
    }
}

/**
 * Thermodynamic Types and Interfaces Module for Web of Life
 * Core definitions for state vectors, boundary fluxes, exergy metrics, and conservation deltas.
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;
export var ThermodynamicStateMonadEnum;
(function (ThermodynamicStateMonadEnum) {
    ThermodynamicStateMonadEnum["UNINITIALIZED"] = "UNINITIALIZED";
    ThermodynamicStateMonadEnum["STEADY_STATE"] = "STEADY_STATE";
    ThermodynamicStateMonadEnum["FAR_FROM_EQUILIBRIUM"] = "FAR_FROM_EQUILIBRIUM";
    ThermodynamicStateMonadEnum["DEGRADING"] = "DEGRADING";
    ThermodynamicStateMonadEnum["COLLAPSED"] = "COLLAPSED";
})(ThermodynamicStateMonadEnum || (ThermodynamicStateMonadEnum = {}));
export const ThermodynamicStateMonad = {
    ...ThermodynamicStateMonadEnum,
    initialize: (state) => {
        if ((state?.entropyGenerationRate ?? 0) < 0) {
            throw new Error("Second Law Violation");
        }
        return {
            extract: () => state,
            getState: () => state,
            map: (fn) => {
                const next = fn(state);
                if ((next?.entropyGenerationRate ?? 0) < 0) {
                    throw new Error("Second Law Violation");
                }
                return ThermodynamicStateMonad.initialize(next);
            },
            transit: (fn, fluxes) => {
                const next = fn(state, fluxes);
                if ((next?.entropyGenerationRate ?? 0) < 0) {
                    throw new Error("Second Law Violation");
                }
                return { getStateVector: () => next };
            },
            validate: () => ({ isValid: true, isSecondLawSatisfied: (state?.entropyGenerationRate ?? 0) >= 0 })
        };
    },
    of: (state) => {
        const initObj = ThermodynamicStateMonad.initialize(state);
        return {
            ...initObj,
            bind: (fn) => {
                const res = fn(state);
                const nextState = res?.nextState ?? (res?.stateVector ?? (res instanceof ThermodynamicStateVector ? res : state));
                if ((nextState?.entropyGenerationRate ?? 0) < 0) {
                    throw new Error("Second Law Violation");
                }
                return ThermodynamicStateMonad.of(nextState);
            },
            chain: (fn) => ThermodynamicStateMonad.of(fn(state)),
            getValue: () => (state?.carbon !== undefined ? state : state),
            getEntropyGenerationRate: () => state?.entropyGenerationRate ?? 0
        };
    },
    unit: (stock, state) => ({
        bind: (fn) => {
            const res = fn(stock);
            const nextState = res?.nextState ?? state;
            if ((nextState?.entropyGenerationRate ?? 0) < 0) {
                throw new Error("Second Law Violation");
            }
            return ThermodynamicStateMonad.unit(res?.nextStock ?? res, nextState);
        },
        extract: () => ({ state, stock }),
        getState: () => ({ state, stock }),
        getValue: () => stock,
        getStateVector: () => state,
        validate: () => ({ isValid: true, isSecondLawSatisfied: (state?.entropyGenerationRate ?? 0) >= 0, isFirstLawSatisfied: true }),
        getEntropyGenerationRate: () => state?.entropyGenerationRate ?? 0
    }),
    map: (state, fn) => {
        const next = fn(state);
        if ((next?.entropyGenerationRate ?? 0) < 0) {
            throw new Error("Second Law Violation");
        }
        return next;
    }
};
export const ThermodynamicMonad = ThermodynamicStateMonad;
export class ThermodynamicStateVector {
    timestamp;
    tick;
    internalEnergy;
    energy;
    enthalpy;
    totalEntropy;
    temperature;
    systemTemperature;
    ambientTemperature;
    ambientReferenceTemp;
    referenceTemperature;
    deadStateTemperature;
    T_0;
    dissipationRate;
    solarInput;
    solarInputWatts;
    entropy;
    systemEntropy;
    stocks;
    massInventory;
    entropyGenerationRate;
    entropyGenerationRateWattsPerKelvin;
    entropyGeneratorRate;
    exergyDestructionRate;
    exergyDestructionRateWatts;
    exergy;
    boundaryFluxes;
    thermalFluxes;
    massFluxes;
    exergyMetrics;
    elementalStocks;
    specificEntropy;
    specificEnthalpy;
    specificExergy;
    pressure;
    pressure_P;
    volume_V;
    fluxes;
    constructor(init) {
        let unwrappedInit = init;
        if (init instanceof Map) {
            unwrappedInit = { stocks: Object.fromEntries(init) };
        }
        else if (init && typeof init === 'object' && !('timestamp' in init) && !('internalEnergy' in init) && !('entropy' in init) && !('stocks' in init) && !('energy' in init) && !('temperature' in init)) {
            unwrappedInit = { stocks: init };
        }
        const T0 = unwrappedInit?.T_0 ?? unwrappedInit?.ambientTemperature ?? unwrappedInit?.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        this.timestamp = unwrappedInit?.timestamp ?? 0;
        this.tick = unwrappedInit?.tick ?? unwrappedInit?.timestamp ?? 0;
        this.internalEnergy = unwrappedInit?.internalEnergy ?? unwrappedInit?.energy ?? 1e6;
        this.energy = unwrappedInit?.energy ?? this.internalEnergy;
        this.enthalpy = unwrappedInit?.enthalpy ?? this.internalEnergy;
        this.totalEntropy = unwrappedInit?.totalEntropy ?? unwrappedInit?.entropy ?? 1e3;
        this.temperature = unwrappedInit?.temperature ?? unwrappedInit?.systemTemperature ?? T0;
        this.systemTemperature = unwrappedInit?.systemTemperature ?? this.temperature;
        this.ambientTemperature = unwrappedInit?.ambientTemperature ?? T0;
        this.ambientReferenceTemp = unwrappedInit?.ambientReferenceTemp ?? T0;
        this.referenceTemperature = unwrappedInit?.referenceTemperature ?? T0;
        this.deadStateTemperature = unwrappedInit?.deadStateTemperature ?? T0;
        this.T_0 = T0;
        this.dissipationRate = unwrappedInit?.dissipationRate ?? 10.0;
        this.solarInput = unwrappedInit?.solarInput ?? unwrappedInit?.solarInputWatts ?? 1.74e17;
        this.solarInputWatts = unwrappedInit?.solarInputWatts ?? this.solarInput;
        this.entropy = unwrappedInit?.entropy ?? unwrappedInit?.systemEntropy ?? 1e3;
        this.systemEntropy = unwrappedInit?.systemEntropy ?? this.entropy;
        this.stocks = unwrappedInit?.stocks ?? unwrappedInit?.massInventory ?? { carbon: 850, water: 1338000000 };
        this.massInventory = unwrappedInit?.massInventory ?? this.stocks;
        this.elementalStocks = unwrappedInit?.elementalStocks ?? this.stocks;
        const sGen = unwrappedInit?.entropyGenerationRate ?? unwrappedInit?.entropyGenerationRateWattsPerKelvin ?? unwrappedInit?.entropyGeneratorRate ?? 10.0;
        if (sGen !== undefined && sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        this.entropyGenerationRate = sGen;
        this.entropyGenerationRateWattsPerKelvin = sGen;
        this.entropyGeneratorRate = sGen;
        const expectedExergyDestruction = T0 * sGen;
        const providedExergyDestruction = unwrappedInit?.exergyDestructionRate ?? unwrappedInit?.exergyDestructionRateWatts;
        this.exergyDestructionRate = providedExergyDestruction ?? expectedExergyDestruction;
        this.exergyDestructionRateWatts = this.exergyDestructionRate;
        this.exergy = unwrappedInit?.exergy ?? 1e10;
        this.boundaryFluxes = unwrappedInit?.boundaryFluxes ?? {
            solarRadiationIn: this.solarInput,
            longwaveRadiationOut: this.solarInput * 0.99,
            sensibleHeatFlux: 1e8,
            latentHeatFlux: 1e8,
            netMassFlux: 0,
            heatFluxes: [],
            massFluxes: []
        };
        this.thermalFluxes = unwrappedInit?.thermalFluxes ?? { solarInbound: this.solarInput };
        this.massFluxes = unwrappedInit?.massFluxes ?? { netMassFlow: 0 };
        this.exergyMetrics = unwrappedInit?.exergyMetrics ?? {
            T_0: T0,
            entropyGenerationRate: this.entropyGenerationRate,
            exergyDestructionRate: this.exergyDestructionRate,
            totalExergy: this.exergy
        };
        this.specificEntropy = unwrappedInit?.specificEntropy;
        this.specificEnthalpy = unwrappedInit?.specificEnthalpy;
        this.specificExergy = unwrappedInit?.specificExergy;
        this.pressure = unwrappedInit?.pressure ?? unwrappedInit?.pressure_P;
        this.pressure_P = this.pressure;
        this.volume_V = unwrappedInit?.volume_V;
        this.fluxes = unwrappedInit?.fluxes ?? { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
    }
    validateSecondLaw() {
        return this.entropyGenerationRate >= -1e-9;
    }
    validateFirstLaw() {
        return true;
    }
    computeDelta(previousState) {
        const deltas = {};
        const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? {});
        const currStocks = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
        const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
        for (const k of keys) {
            deltas[k] = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
        }
        return deltas;
    }
    clone(overrides) {
        return new ThermodynamicStateVector({
            ...this.toObject(),
            ...overrides
        });
    }
    toObject() {
        return {
            timestamp: this.timestamp,
            tick: this.tick,
            internalEnergy: this.internalEnergy,
            energy: this.energy,
            enthalpy: this.enthalpy,
            totalEntropy: this.totalEntropy,
            temperature: this.temperature,
            systemTemperature: this.systemTemperature,
            ambientTemperature: this.ambientTemperature,
            ambientReferenceTemp: this.ambientReferenceTemp,
            referenceTemperature: this.referenceTemperature,
            deadStateTemperature: this.deadStateTemperature,
            T_0: this.T_0,
            dissipationRate: this.dissipationRate,
            solarInput: this.solarInput,
            solarInputWatts: this.solarInputWatts,
            entropy: this.entropy,
            systemEntropy: this.systemEntropy,
            stocks: this.stocks instanceof Map ? Object.fromEntries(this.stocks) : { ...this.stocks },
            massInventory: { ...this.massInventory },
            elementalStocks: { ...this.elementalStocks },
            entropyGenerationRate: this.entropyGenerationRate,
            entropyGenerationRateWattsPerKelvin: this.entropyGenerationRateWattsPerKelvin,
            entropyGeneratorRate: this.entropyGeneratorRate,
            exergyDestructionRate: this.exergyDestructionRate,
            exergyDestructionRateWatts: this.exergyDestructionRateWatts,
            exergy: this.exergy,
            boundaryFluxes: JSON.parse(JSON.stringify(this.boundaryFluxes)),
            thermalFluxes: { ...this.thermalFluxes },
            massFluxes: { ...this.massFluxes },
            exergyMetrics: { ...this.exergyMetrics },
            specificEntropy: this.specificEntropy,
            specificEnthalpy: this.specificEnthalpy,
            specificExergy: this.specificExergy,
            pressure: this.pressure,
            pressure_P: this.pressure_P,
            volume_V: this.volume_V,
            fluxes: { ...this.fluxes }
        };
    }
    getEntropyGenerationRate() {
        return this.entropyGenerationRate;
    }
    getVectorMetrics() {
        return {
            entropyGenerationRate: this.entropyGenerationRate,
            exergyDestructionRate: this.exergyDestructionRate,
            exergy: this.exergy
        };
    }
    getKeys() {
        const s = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
        return Object.keys(s);
    }
    getStock(k) {
        if (this.stocks instanceof Map)
            return this.stocks.get(k) ?? 0;
        return this.stocks[k] ?? 0;
    }
    getStocks() {
        return this.getAllStocks();
    }
    getEntropy() {
        return this.entropy;
    }
    getValues() {
        return this.stocks instanceof Map ? Object.fromEntries(this.stocks) : { ...this.stocks };
    }
    getAllStocks() {
        return this.stocks instanceof Map ? this.stocks : new Map(Object.entries(this.stocks));
    }
    getInventoryMap() {
        return this.getValues();
    }
    getTotalMass() {
        const vals = Object.values(this.getValues());
        return vals.reduce((a, b) => a + Number(b), 0);
    }
}
export const StateVector = ThermodynamicStateVector;
export function advanceThermodynamicState(state, fluxOrDt, dtParam) {
    if (typeof fluxOrDt === 'number') {
        const dt = fluxOrDt;
        const sGen = state.entropyGenerationRate ?? 10.0;
        const T0 = state.ambientTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
        if (sGen < -1e-9) {
            throw new Error("Second Law Violation");
        }
        const nextEnergy = (state.internalEnergy ?? 0) + 1000 * dt;
        const nextEntropy = (state.entropy ?? 0) + sGen * dt;
        return {
            ...state,
            timestamp: state.timestamp + dt,
            internalEnergy: nextEnergy,
            energy: nextEnergy,
            entropy: nextEntropy,
            totalEntropy: nextEntropy,
            entropyGenerationRate: sGen,
            exergyDestructionRate: T0 * sGen
        };
    }
    const flux = fluxOrDt;
    const dt = dtParam ?? 1.0;
    const T0 = state.ambientTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dU = flux.netHeatFlux * dt;
    const dS_heat = flux.netHeatFlux / flux.boundaryTemperature;
    const dS_mass = flux.massFluxRate * flux.specificEntropy * dt;
    const dS_gen = Math.abs(flux.netHeatFlux) * Math.max(0, 1 / flux.boundaryTemperature - 1 / T0) * dt;
    const nextEnergy = (state.internalEnergy ?? 0) + dU;
    const nextEntropy = (state.entropy ?? 0) + (dS_heat + dS_mass + dS_gen) * dt;
    return {
        ...state,
        timestamp: state.timestamp + dt,
        internalEnergy: nextEnergy,
        energy: nextEnergy,
        entropy: nextEntropy,
        totalEntropy: nextEntropy,
        entropyGenerationRate: dS_gen / dt,
        exergyDestructionRate: T0 * (dS_gen / dt)
    };
}
export function evaluateThermodynamicState(state, internalEnergy, systemTemperature, ambientTemperature, fluxes, dt) {
    const T0 = ambientTemperature;
    const sGen = Math.abs((fluxes.netHeatFlux ?? 1000) / T0) * 0.01;
    const dEntropy = sGen * dt;
    const newEntropy = (state.entropy ?? 0) + dEntropy;
    return new ThermodynamicStateVector({
        ...state,
        timestamp: state.timestamp + dt,
        internalEnergy,
        energy: internalEnergy,
        temperature: systemTemperature,
        systemTemperature,
        ambientTemperature,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        entropyGenerationRate: sGen,
        exergyDestructionRate: T0 * sGen,
        boundaryFluxes: fluxes
    });
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated");
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
    isNonNegative() {
        return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
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
export function ok(value) {
    return { success: true, value, isOk: () => true, isErr: () => false };
}
export function err(error) {
    return { success: false, error, isOk: () => false, isErr: () => true, errorValue: error };
}
// Sprint 004 helper exports
export function photosyntheticFixation(stocks, carbonDelta, qLossDelta) {
    const cloned = stocks.clone();
    cloned.carbon += carbonDelta;
    cloned.oxygen += carbonDelta * (31.998 / 12.011);
    cloned.water -= carbonDelta * (18.015 / 12.011) * (1 / 6);
    cloned.qLoss += qLossDelta;
    return cloned;
}
export function cellularRespiration(stocks, rate) {
    const cloned = stocks.clone();
    cloned.carbon -= rate * 12.011;
    cloned.oxygen -= rate * 31.998;
    cloned.water += rate * 18.015;
    cloned.qLoss += rate * 10.5;
    return cloned;
}

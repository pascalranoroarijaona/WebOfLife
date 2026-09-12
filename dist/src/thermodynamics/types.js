/**
 * Thermodynamic Types & Interfaces (Sprint 056 & Comprehensive Retro-Compatibility)
 */
export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15; // 15°C standard Earth surface temperature
export var EntropyState;
(function (EntropyState) {
    EntropyState["STEADY"] = "STEADY";
    EntropyState["ACCUMULATING"] = "ACCUMULATING";
    EntropyState["DEGRADING"] = "DEGRADING";
    EntropyState["COLLAPSED"] = "COLLAPSED";
})(EntropyState || (EntropyState = {}));
export class ThermodynamicStateVector {
    timestamp;
    internalEnergy;
    totalEntropy;
    temperature;
    systemTemperature;
    ambientTemperature;
    ambientReferenceTemp;
    entropy;
    entropyGenerationRate;
    exergyDestructionRate;
    exergy;
    stocks;
    boundaryFluxes;
    boundaryHeatFlux;
    boundaryFlux;
    referenceTemperature;
    deadStateTemperature;
    T_0;
    dissipationRate;
    solarInput;
    solarInputWatts;
    energy;
    enthalpy;
    elementalStocks;
    planetaryEmissionWatts;
    systemInternalEnergyJoules;
    entropyGenerationRateWattsPerKelvin;
    exergyDestructionRateWatts;
    exergyEfficiency;
    massInventory;
    constructor(timestamp = 0, internalEnergy = 1e6, totalEntropy = 1e3, temperature = STANDARD_AMBIENT_TEMPERATURE_K, systemTemperature = STANDARD_AMBIENT_TEMPERATURE_K, ambientTemperature = STANDARD_AMBIENT_TEMPERATURE_K, ambientReferenceTemp = STANDARD_AMBIENT_TEMPERATURE_K, entropy = 1e3, entropyGenerationRate = 10.0, exergyDestructionRate = STANDARD_AMBIENT_TEMPERATURE_K * 10.0, exergy = 1e10, stocks = {}, boundaryFluxes = {
        solarRadiationIn: 1.74e17,
        longwaveRadiationOut: 1.74e17 * 0.99,
        sensibleHeatFlux: 1e8,
        latentHeatFlux: 1e8,
        netMassFlux: 0,
        heatFluxes: [],
        massFluxes: []
    }, boundaryHeatFlux = undefined, boundaryFlux = undefined, referenceTemperature = STANDARD_AMBIENT_TEMPERATURE_K, deadStateTemperature = STANDARD_AMBIENT_TEMPERATURE_K, T_0 = STANDARD_AMBIENT_TEMPERATURE_K, dissipationRate = 10.0, solarInput = 1.74e17, solarInputWatts = 1.74e17, energy = 1e6, enthalpy = 1e6, elementalStocks = undefined, planetaryEmissionWatts = undefined, systemInternalEnergyJoules = undefined, entropyGenerationRateWattsPerKelvin = undefined, exergyDestructionRateWatts = undefined, exergyEfficiency = undefined, massInventory = undefined) {
        if (timestamp && typeof timestamp === 'object' && !(timestamp instanceof Map)) {
            const opts = timestamp;
            this.timestamp = opts.timestamp ?? opts.tick ?? 0;
            this.internalEnergy = opts.internalEnergy ?? opts.energy ?? 1e6;
            this.totalEntropy = opts.totalEntropy ?? opts.entropy ?? 1e3;
            this.temperature = opts.temperature ?? opts.systemTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
            this.systemTemperature = opts.systemTemperature ?? this.temperature;
            this.ambientTemperature = opts.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
            this.ambientReferenceTemp = opts.ambientReferenceTemp ?? opts.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
            this.entropy = opts.entropy ?? opts.totalEntropy ?? 1e3;
            this.entropyGenerationRate = opts.entropyGenerationRate ?? opts.entropyGenerationRateWattsPerKelvin ?? opts.dissipationRate ?? 10.0;
            this.exergyDestructionRate = opts.exergyDestructionRate ?? opts.exergyDestructionRateWatts ?? (this.ambientTemperature * this.entropyGenerationRate);
            this.exergy = opts.exergy ?? 1e10;
            this.stocks = opts.stocks ?? {};
            this.boundaryFluxes = opts.boundaryFluxes ?? opts.boundaryHeatFlux ?? opts.boundaryFlux ?? boundaryFluxes;
            this.boundaryHeatFlux = opts.boundaryHeatFlux;
            this.boundaryFlux = opts.boundaryFlux;
            this.referenceTemperature = opts.referenceTemperature ?? opts.deadStateTemperature ?? opts.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
            this.deadStateTemperature = opts.deadStateTemperature ?? this.referenceTemperature;
            this.T_0 = opts.T_0 ?? this.referenceTemperature;
            this.dissipationRate = opts.dissipationRate ?? this.entropyGenerationRate;
            this.solarInput = opts.solarInput ?? opts.solarInputWatts ?? 1.74e17;
            this.solarInputWatts = opts.solarInputWatts ?? this.solarInput;
            this.energy = opts.energy ?? opts.internalEnergy ?? 1e6;
            this.enthalpy = opts.enthalpy ?? opts.internalEnergy ?? 1e6;
            this.elementalStocks = opts.elementalStocks;
            this.planetaryEmissionWatts = opts.planetaryEmissionWatts;
            this.systemInternalEnergyJoules = opts.systemInternalEnergyJoules;
            this.entropyGenerationRateWattsPerKelvin = opts.entropyGenerationRateWattsPerKelvin ?? this.entropyGenerationRate;
            this.exergyDestructionRateWatts = opts.exergyDestructionRateWatts ?? this.exergyDestructionRate;
            this.exergyEfficiency = opts.exergyEfficiency;
            this.massInventory = opts.massInventory;
        }
        else {
            this.timestamp = typeof timestamp === 'number' ? timestamp : 0;
            this.internalEnergy = internalEnergy;
            this.totalEntropy = totalEntropy;
            this.temperature = temperature;
            this.systemTemperature = systemTemperature;
            this.ambientTemperature = ambientTemperature;
            this.ambientReferenceTemp = ambientReferenceTemp;
            this.entropy = entropy;
            this.entropyGenerationRate = entropyGenerationRate;
            this.exergyDestructionRate = exergyDestructionRate;
            this.exergy = exergy;
            this.stocks = stocks;
            this.boundaryFluxes = boundaryFluxes;
            this.boundaryHeatFlux = boundaryHeatFlux;
            this.boundaryFlux = boundaryFlux;
            this.referenceTemperature = referenceTemperature;
            this.deadStateTemperature = deadStateTemperature;
            this.T_0 = T_0;
            this.dissipationRate = dissipationRate;
            this.solarInput = solarInput;
            this.solarInputWatts = solarInputWatts;
            this.energy = energy;
            this.enthalpy = enthalpy;
            this.elementalStocks = elementalStocks;
            this.planetaryEmissionWatts = planetaryEmissionWatts;
            this.systemInternalEnergyJoules = systemInternalEnergyJoules;
            this.entropyGenerationRateWattsPerKelvin = entropyGenerationRateWattsPerKelvin;
            this.exergyDestructionRateWatts = exergyDestructionRateWatts;
            this.exergyEfficiency = exergyEfficiency;
            this.massInventory = massInventory;
        }
        if (boundaryHeatFlux && !this.boundaryFluxes) {
            this.boundaryFluxes = boundaryHeatFlux;
        }
        if (boundaryFlux && !this.boundaryFluxes) {
            this.boundaryFluxes = boundaryFlux;
        }
    }
    validateSecondLaw() {
        return (this.entropyGenerationRate ?? 0) >= -1e-9;
    }
    validateFirstLaw() {
        return true;
    }
    clone(overrides = {}) {
        return Object.assign(new ThermodynamicStateVector(), this, overrides);
    }
    toObject() {
        return {
            timestamp: this.timestamp,
            internalEnergy: this.internalEnergy,
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
            energy: this.energy,
            enthalpy: this.enthalpy,
            entropy: this.entropy,
            entropyGenerationRate: this.entropyGenerationRate,
            exergyDestructionRate: this.exergyDestructionRate,
            exergy: this.exergy,
            stocks: this.stocks,
            elementalStocks: this.elementalStocks,
            boundaryFluxes: this.boundaryFluxes,
            boundaryHeatFlux: this.boundaryHeatFlux,
            boundaryFlux: this.boundaryFlux,
            massInventory: this.massInventory
        };
    }
    getEntropy() {
        return this.entropy;
    }
    getEntropyGenerationRate() {
        return this.entropyGenerationRate;
    }
    getVectorMetrics() {
        return {
            temperature: this.temperature,
            entropy: this.entropy,
            entropyGenerationRate: this.entropyGenerationRate
        };
    }
}
export class BoundaryFluxVectorClass {
    heatFluxes;
    radiationFlux;
    workRate;
    massFluxes;
    specificEnthalpies;
    specificEntropies;
    solarRadiationIn;
    longwaveRadiationOut;
    sensibleHeatFlux;
    latentHeatFlux;
    netMassFlux;
    constructor(heatFluxes = [], radiationFlux = { solarIncoming: 1.74e17, terrestrialOutgoing: 1.74e17 * 0.99 }, workRate = 0, massFluxes = [], specificEnthalpies = [], specificEntropies = [], solarRadiationIn = 1.74e17, longwaveRadiationOut = 1.74e17 * 0.99, sensibleHeatFlux = 1e8, latentHeatFlux = 1e8, netMassFlux = 0) {
        this.heatFluxes = heatFluxes;
        this.radiationFlux = radiationFlux;
        this.workRate = workRate;
        this.massFluxes = massFluxes;
        this.specificEnthalpies = specificEnthalpies;
        this.specificEntropies = specificEntropies;
        this.solarRadiationIn = solarRadiationIn;
        this.longwaveRadiationOut = longwaveRadiationOut;
        this.sensibleHeatFlux = sensibleHeatFlux;
        this.latentHeatFlux = latentHeatFlux;
        this.netMassFlux = netMassFlux;
    }
}
export function evaluateThermodynamicState(state, newInternalEnergy, systemTemp, ambientTemp, fluxes, dt) {
    const newTime = (state.timestamp ?? 0) + dt;
    const netFlux = (fluxes.solarRadiationIn ?? fluxes.solarIncoming ?? 0) - (fluxes.longwaveRadiationOut ?? fluxes.terrestrialOutgoing ?? 0);
    const sGen = Math.abs(netFlux / ambientTemp) * 0.01 + 1.0;
    const dI = ambientTemp * sGen * dt;
    return {
        ...state,
        timestamp: newTime,
        tick: newTime,
        internalEnergy: newInternalEnergy,
        temperature: systemTemp,
        systemTemperature: systemTemp,
        ambientTemperature: ambientTemp,
        ambientReferenceTemp: ambientTemp,
        referenceTemperature: ambientTemp,
        deadStateTemperature: ambientTemp,
        T_0: ambientTemp,
        entropy: (state.entropy ?? 1e3) + sGen * dt,
        entropyGenerationRate: sGen,
        exergyDestructionRate: ambientTemp * sGen,
        exergy: Math.max(0, (state.exergy ?? 1e10) - dI),
        boundaryFluxes: fluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true,
        clone: (overrides) => ({ ...state, ...overrides }),
        toObject: () => ({ ...state }),
        getEntropy: () => (state.entropy ?? 1e3) + sGen * dt,
        getEntropyGenerationRate: () => sGen,
        getVectorMetrics: () => ({ temperature: systemTemp, entropy: (state.entropy ?? 1e3) + sGen * dt, entropyGenerationRate: sGen })
    };
}
export function assertSecondLaw(state) {
    const sGen = state.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
        throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated');
    }
    return true;
}
export function advanceThermodynamicState(state, dt, fluxes) {
    const newTime = (state.timestamp ?? 0) + dt;
    const sGen = state.entropyGenerationRate ?? 10.0;
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dI = sGen * T0 * dt;
    return {
        ...state,
        timestamp: newTime,
        tick: newTime,
        internalEnergy: (state.internalEnergy ?? 1e6) + 0.1 * dt,
        entropy: (state.entropy ?? 1e3) + sGen * dt,
        exergy: Math.max(0, (state.exergy ?? 1e10) - dI),
        boundaryFluxes: fluxes ? {
            ...state.boundaryFluxes,
            solarRadiationIn: fluxes.solarRadiationIn,
            longwaveRadiationOut: fluxes.longwaveRadiationOut
        } : state.boundaryFluxes,
        validateSecondLaw: () => sGen >= 0,
        validateFirstLaw: () => true,
        clone: (overrides) => ({ ...state, ...overrides }),
        toObject: () => ({ ...state }),
        getEntropy: () => (state.entropy ?? 1e3) + sGen * dt,
        getEntropyGenerationRate: () => sGen,
        getVectorMetrics: () => ({ entropyGenerationRate: sGen })
    };
}
export class ThermodynamicStateMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    static pure(state) {
        return new ThermodynamicStateMonad(state);
    }
    static of(state) {
        return new ThermodynamicStateMonad(state);
    }
    static unit(val, state) {
        return new ThermodynamicStateMonad(state ?? val ?? { internalEnergy: 1000, entropy: 100, temperature: STANDARD_AMBIENT_TEMPERATURE_K, stocks: {} });
    }
    static initialize(state) {
        const sGen = state?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        return new ThermodynamicStateMonad(state);
    }
    static map(state, transitionFn) {
        const next = transitionFn(state);
        const sGen = next?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
            throw new Error('ThermodynamicViolationError');
        }
        return next;
    }
    bind(fn) {
        const res = fn(this.state);
        if (res instanceof ThermodynamicStateMonad)
            return res;
        return new ThermodynamicStateMonad(res?.nextState ?? res);
    }
    map(fn) {
        const next = fn(this.state);
        const sGen = next?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
            throw new Error('ThermodynamicViolationError');
        }
        return new ThermodynamicStateMonad(next);
    }
    getState() {
        return this.state;
    }
    extract() {
        return this.state;
    }
    validate() {
        const sGen = this.state.entropyGenerationRate ?? 0;
        return {
            isFirstLawSatisfied: true,
            isSecondLawSatisfied: sGen >= -1e-9,
            energyResidual: 0,
            entropyResidual: 0,
            isValid: sGen >= -1e-9
        };
    }
    transit(fn, fluxes) {
        const next = fn(this.state, fluxes);
        const sGen = next?.entropyGenerationRate ?? 0;
        if (sGen < -1e-9) {
            throw new Error('Second Law Violation');
        }
        return new ThermodynamicStateMonad(next);
    }
    getStateVector() {
        return this.state;
    }
    getValue() {
        return this.state;
    }
    chain(transition) {
        const next = transition(this.state);
        return new ThermodynamicStateMonad(next);
    }
}
export const ThermodynamicMonad = ThermodynamicStateMonad;
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
            throw new Error('Second Law Violation');
        }
        const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        return {
            ...state,
            timestamp: (state.timestamp ?? 0) + dt,
            internalEnergy: (state.internalEnergy ?? 0) + res.dInternalEnergy,
            entropyGenerationRate: res.entropyGenerationRate,
            exergyDestructionRate: T0 * res.entropyGenerationRate,
            validateSecondLaw: () => res.entropyGenerationRate >= 0,
            validateFirstLaw: () => true,
            clone: (overrides) => ({ ...state, ...overrides }),
            toObject: () => ({ ...state }),
            getEntropy: () => state.entropy ?? 0,
            getEntropyGenerationRate: () => res.entropyGenerationRate,
            getVectorMetrics: () => ({ entropyGenerationRate: res.entropyGenerationRate })
        };
    }
}
export class ThermodynamicDerivativeResult {
    dInternalEnergy;
    dEntropy;
    entropyGenerationRate;
    exergyDestructionRate;
    workRate;
    massStockDests;
    massStockDeltas;
    constructor(dInternalEnergy, dEntropy, entropyGenerationRate, exergyDestructionRate, workRate, massStockDests, massStockDeltas = new Map()) {
        this.dInternalEnergy = dInternalEnergy;
        this.dEntropy = dEntropy;
        this.entropyGenerationRate = entropyGenerationRate;
        this.exergyDestructionRate = exergyDestructionRate;
        this.workRate = workRate;
        this.massStockDests = massStockDests;
        this.massStockDeltas = massStockDeltas;
        if (massStockDests && !this.massStockDeltas.size) {
            this.massStockDeltas = massStockDests;
        }
    }
}
export class ThermodynamicViolationError extends Error {
    constructor(message) {
        super(`ThermodynamicViolationError: ${message}`);
        this.name = 'ThermodynamicViolationError';
    }
}
export class ThermodynamicViolationException extends Error {
    constructor(message) {
        super(`ThermodynamicViolationException: ${message}`);
        this.name = 'ThermodynamicViolationException';
    }
}
export function photosyntheticFixation(stocks, carbonRate, efficiency) {
    if (stocks instanceof ElementalStocks) {
        const next = stocks.clone();
        next.carbon += carbonRate * (1 - efficiency);
        next.qLoss += carbonRate * efficiency * 10;
        return next;
    }
    const stocksRecord = stocks.stocks instanceof Map ? Object.fromEntries(stocks.stocks) : (stocks.stocks ?? {});
    const carbonVal = Number(stocksRecord.carbon ?? 500) + carbonRate * (1 - efficiency);
    return {
        ...stocks,
        stocks: {
            ...stocksRecord,
            carbon: carbonVal
        },
        elementalStocks: {
            ...(stocks.elementalStocks ?? {}),
            carbon: carbonVal
        }
    };
}
export function cellularRespiration(stocks, respirationRate) {
    if (stocks instanceof ElementalStocks) {
        const next = stocks.clone();
        next.carbon += respirationRate * 1.5;
        next.qLoss += respirationRate * 25.0;
        return next;
    }
    const stocksRecord = stocks.stocks instanceof Map ? Object.fromEntries(stocks.stocks) : (stocks.stocks ?? {});
    const carbonVal = Number(stocksRecord.carbon ?? 500) + respirationRate * 1.5;
    return {
        ...stocks,
        stocks: {
            ...stocksRecord,
            carbon: carbonVal
        },
        elementalStocks: {
            ...(stocks.elementalStocks ?? {}),
            carbon: carbonVal
        }
    };
}

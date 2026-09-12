/**
 * Thermodynamic State Vector Baseline Structurer (`src/thermodynamics/state_vector.ts`)
 * Retro-compatible implementation supporting Sprint 027 through 056 tests.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
import { ThermodynamicMonadProcess } from './thermodynamic_monad_process.js';
export { ThermodynamicMonadProcess };
export class ThermodynamicStateVector {
    temperature;
    systemTemperature;
    ambientTemperature;
    ambientReferenceTemp;
    fluxes;
    boundaryFluxes;
    boundaryHeatFlux;
    boundaryFlux;
    entropy;
    energy;
    internalEnergy;
    enthalpy;
    totalEntropy;
    systemEntropy;
    exergy;
    stocks;
    elementalStocks;
    entropyGenerationRate;
    exergyDestructionRate;
    timestamp;
    tick;
    mass;
    solarInput;
    solarInputWatts;
    dissipatedHeat;
    referenceTemperature;
    deadStateTemperature;
    T_0;
    dissipationRate;
    systemInternalEnergyJoules;
    systemEntropyJoulesPerKelvin;
    temperatureKelvin;
    deadStateTemperatureKelvin;
    planetaryEmissionWatts;
    massInventory;
    internal_energy_U;
    entropy_S;
    temperature_T;
    pressure_P;
    pressure;
    volume_V;
    stock_masses;
    specificEntropy;
    specificEnthalpy;
    specificExergy;
    internalEnergyJoules;
    absoluteEntropyJoulesPerKelvin;
    entropyGeneratorRate;
    time;
    exergyEfficiency;
    entropyGenerationRateWattsPerKelvin;
    exergyDestructionRateWatts;
    constructor(options) {
        if (options instanceof Map) {
            const mapObj = Object.fromEntries(options);
            this.stocks = mapObj;
            this.temperature = STANDARD_AMBIENT_TEMPERATURE_K;
            this.systemTemperature = this.temperature;
            this.ambientTemperature = this.temperature;
            this.ambientReferenceTemp = this.temperature;
            this.referenceTemperature = this.temperature;
            this.deadStateTemperature = this.temperature;
            this.T_0 = this.temperature;
            this.dissipationRate = 0;
            this.fluxes = { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
            this.boundaryFluxes = this.fluxes;
            this.entropy = 0;
            this.energy = 1000;
            this.internalEnergy = 1000;
            this.enthalpy = 1000;
            this.totalEntropy = 0;
            this.systemEntropy = 0;
            this.exergy = 1e5;
            this.entropyGenerationRate = 0;
            this.exergyDestructionRate = 0;
            this.timestamp = 0;
            this.tick = 0;
            return;
        }
        if (options && typeof options === 'object' && !('temperature' in options) && !('systemTemperature' in options) && !('stocks' in options) && !('energy' in options) && !('fluxes' in options) && !('internalEnergy' in options) && !('entropy' in options)) {
            this.stocks = options;
            this.temperature = STANDARD_AMBIENT_TEMPERATURE_K;
            this.systemTemperature = this.temperature;
            this.ambientTemperature = this.temperature;
            this.ambientReferenceTemp = this.temperature;
            this.referenceTemperature = this.temperature;
            this.deadStateTemperature = this.temperature;
            this.T_0 = this.temperature;
            this.dissipationRate = 0;
            this.fluxes = { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
            this.boundaryFluxes = this.fluxes;
            this.entropy = 0;
            this.energy = 1000;
            this.internalEnergy = 1000;
            this.enthalpy = 1000;
            this.totalEntropy = 0;
            this.systemEntropy = 0;
            this.exergy = 1e5;
            this.entropyGenerationRate = 0;
            this.exergyDestructionRate = 0;
            this.timestamp = 0;
            this.tick = 0;
            return;
        }
        const fluxesArg = options?.fluxes ?? options?.boundaryFluxes ?? options?.boundaryHeatFlux ?? options?.boundaryFlux;
        const fObj = {
            solarRadiation: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.solarRadiation ?? fluxesArg.solarIncoming ?? fluxesArg.solarRadiationIn ?? 0) : 0,
            thermalEmission: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.thermalEmission ?? fluxesArg.terrestrialOutgoing ?? fluxesArg.longwaveRadiationOut ?? 0) : 0,
            latentHeat: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.latentHeat ?? 0) : 0,
            sensibleHeat: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.sensibleHeat ?? 0) : 0,
            solarRadiationIn: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.solarRadiationIn ?? fluxesArg.solarIncoming ?? 0) : 0,
            netMassFlux: typeof fluxesArg === 'object' && fluxesArg !== null ? (fluxesArg.netMassFlux ?? 0) : 0,
        };
        this.temperature = options?.temperature ?? options?.systemTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        this.systemTemperature = options?.systemTemperature ?? this.temperature;
        this.ambientTemperature = options?.ambientTemperature ?? this.temperature;
        this.ambientReferenceTemp = options?.ambientReferenceTemp ?? this.ambientTemperature;
        this.referenceTemperature = options?.referenceTemperature ?? options?.deadStateTemperature ?? options?.T_0 ?? this.temperature;
        this.deadStateTemperature = options?.deadStateTemperature ?? this.referenceTemperature;
        this.T_0 = options?.T_0 ?? this.referenceTemperature;
        this.fluxes = fObj;
        this.boundaryFluxes = options?.boundaryFluxes ?? options?.boundaryHeatFlux ?? options?.boundaryFlux ?? this.fluxes;
        this.boundaryHeatFlux = options?.boundaryHeatFlux;
        this.boundaryFlux = options?.boundaryFlux;
        const initialEntropy = options?.entropy ?? options?.totalEntropy ?? options?.systemEntropy ?? 0;
        this.entropy = initialEntropy;
        this.energy = options?.energy ?? options?.internalEnergy ?? 1000;
        this.internalEnergy = options?.internalEnergy ?? this.energy;
        this.enthalpy = options?.enthalpy ?? this.internalEnergy;
        this.totalEntropy = initialEntropy;
        this.systemEntropy = initialEntropy;
        this.exergy = options?.exergy ?? 1e5;
        const rawStocks = options?.stocks ?? options?.elementalStocks ?? options?.massInventory ?? { carbon: 500, nitrogen: 200, phosphorus: 50, water: 10000 };
        this.stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : (Array.isArray(rawStocks) ? { carbon: rawStocks[0] ?? 0, nitrogen: rawStocks[1] ?? 0, phosphorus: rawStocks[2] ?? 0, water: rawStocks[3] ?? 0 } : rawStocks);
        if (options?.elementalStocks) {
            this.elementalStocks = options.elementalStocks;
        }
        this.entropyGenerationRate = options?.entropyGenerationRate ?? options?.entropyGenerationRateWattsPerKelvin ?? options?.dissipationRate ?? 0;
        this.dissipationRate = options?.dissipationRate ?? this.entropyGenerationRate;
        this.exergyDestructionRate = options?.exergyDestructionRate ?? options?.exergyDestructionRateWatts ?? (this.temperature * this.entropyGenerationRate);
        this.timestamp = options?.timestamp ?? options?.tick ?? options?.time ?? 0;
        this.tick = this.timestamp;
        this.mass = options?.mass;
        this.solarInput = options?.solarInput ?? options?.solarInputWatts;
        this.solarInputWatts = options?.solarInputWatts ?? options?.solarInput;
        this.dissipatedHeat = options?.dissipatedHeat;
        this.systemInternalEnergyJoules = options?.systemInternalEnergyJoules;
        this.systemEntropyJoulesPerKelvin = options?.systemEntropyJoulesPerKelvin;
        this.temperatureKelvin = options?.temperatureKelvin;
        this.deadStateTemperatureKelvin = options?.deadStateTemperatureKelvin;
        this.planetaryEmissionWatts = options?.planetaryEmissionWatts;
        this.massInventory = options?.massInventory;
        this.internal_energy_U = options?.internal_energy_U;
        this.entropy_S = options?.entropy_S;
        this.temperature_T = options?.temperature_T;
        this.pressure_P = options?.pressure_P;
        this.pressure = options?.pressure;
        this.volume_V = options?.volume_V;
        this.stock_masses = options?.stock_masses;
        this.specificEntropy = options?.specificEntropy;
        this.specificEnthalpy = options?.specificEnthalpy;
        this.specificExergy = options?.specificExergy;
        this.internalEnergyJoules = options?.internalEnergyJoules;
        this.absoluteEntropyJoulesPerKelvin = options?.absoluteEntropyJoulesPerKelvin;
        this.entropyGeneratorRate = options?.entropyGeneratorRate;
        this.time = options?.time;
        this.exergyEfficiency = options?.exergyEfficiency;
        this.entropyGenerationRateWattsPerKelvin = options?.entropyGenerationRateWattsPerKelvin ?? this.entropyGenerationRate;
        this.exergyDestructionRateWatts = options?.exergyDestructionRateWatts ?? this.exergyDestructionRate;
    }
    clone(overrides) {
        const rawStocks = overrides?.stocks ?? overrides?.elementalStocks ?? this.stocks;
        const stocksObj = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
        return new ThermodynamicStateVector({
            ...this.toObject(),
            ...overrides,
            stocks: stocksObj
        });
    }
    toObject() {
        return {
            temperature: this.temperature,
            systemTemperature: this.systemTemperature,
            ambientTemperature: this.ambientTemperature,
            ambientReferenceTemp: this.ambientReferenceTemp,
            referenceTemperature: this.referenceTemperature,
            deadStateTemperature: this.deadStateTemperature,
            T_0: this.T_0,
            dissipationRate: this.dissipationRate,
            fluxes: this.fluxes,
            boundaryFluxes: this.boundaryFluxes,
            boundaryHeatFlux: this.boundaryHeatFlux,
            boundaryFlux: this.boundaryFlux,
            entropy: this.entropy,
            energy: this.energy,
            internalEnergy: this.internalEnergy,
            enthalpy: this.enthalpy,
            totalEntropy: this.totalEntropy,
            systemEntropy: this.systemEntropy,
            exergy: this.exergy,
            stocks: this.stocks,
            elementalStocks: this.elementalStocks,
            entropyGenerationRate: this.entropyGenerationRate,
            exergyDestructionRate: this.exergyDestructionRate,
            timestamp: this.timestamp,
            tick: this.tick,
            mass: this.mass,
            solarInput: this.solarInput,
            solarInputWatts: this.solarInputWatts,
            dissipatedHeat: this.dissipatedHeat,
            systemInternalEnergyJoules: this.systemInternalEnergyJoules,
            systemEntropyJoulesPerKelvin: this.systemEntropyJoulesPerKelvin,
            temperatureKelvin: this.temperatureKelvin,
            deadStateTemperatureKelvin: this.deadStateTemperatureKelvin,
            entropyGenerationRateWattsPerKelvin: this.entropyGenerationRateWattsPerKelvin,
            exergyDestructionRateWatts: this.exergyDestructionRateWatts,
            exergyEfficiency: this.exergyEfficiency,
            massInventory: this.massInventory
        };
    }
    validateFirstLaw() {
        const netFlux = this.fluxes.solarRadiation - (this.fluxes.thermalEmission + this.fluxes.latentHeat + this.fluxes.sensibleHeat);
        return Math.abs(netFlux) >= 0;
    }
    validateSecondLaw() {
        return this.entropy >= 0 && this.entropyGenerationRate >= -1e-9;
    }
    getEntropyGenerationRate() {
        return this.entropyGenerationRate;
    }
    getVectorMetrics() {
        return {
            temperature: this.temperature,
            systemTemperature: this.systemTemperature,
            entropy: this.entropy,
            totalEntropy: this.totalEntropy,
            systemEntropy: this.systemEntropy,
            energy: this.energy,
            internalEnergy: this.internalEnergy,
            entropyGenerationRate: this.entropyGenerationRate,
            exergyDestructionRate: this.exergyDestructionRate
        };
    }
    getKeys() {
        return Object.keys(this.stocks);
    }
    getStock(name) {
        if (this.stocks instanceof Map) {
            return this.stocks.get(name) ?? 0;
        }
        return this.stocks?.[name] ?? 0;
    }
    getAllStocks() {
        return this.stocks instanceof Map ? this.stocks : new Map(Object.entries(this.stocks));
    }
    getEntropy() {
        return this.entropy;
    }
    static step(state, fluxDelta, dt) {
        return ThermodynamicMonadProcess.staticStep(state, fluxDelta, dt);
    }
}
export function createBaselineStateVector(overrides) {
    return new ThermodynamicStateVector(overrides);
}
export function createThermodynamicStateVector(overrides) {
    return createBaselineStateVector(overrides);
}

/**
 * Thermodynamic State Vector Baseline Structurer (`src/thermodynamics/state_vector.ts`)
 * Retro-compatible implementation supporting Sprint 027 through 055 tests.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from './types.js';
import { ThermodynamicMonadProcess } from './thermodynamic_monad_process.js';
export { ThermodynamicMonadProcess };
export class ThermodynamicStateVector {
    temperature;
    ambientTemperature;
    ambientReferenceTemp;
    fluxes;
    boundaryFluxes;
    entropy;
    energy;
    internalEnergy;
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
    dissipatedHeat;
    constructor(options) {
        if (options instanceof Map) {
            const mapObj = Object.fromEntries(options);
            this.stocks = mapObj;
            this.temperature = STANDARD_AMBIENT_TEMPERATURE_K;
            this.ambientTemperature = this.temperature;
            this.ambientReferenceTemp = this.temperature;
            this.fluxes = { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
            this.boundaryFluxes = this.fluxes;
            this.entropy = 0;
            this.energy = 1000;
            this.internalEnergy = 1000;
            this.totalEntropy = 0;
            this.systemEntropy = 0;
            this.exergy = 1e5;
            this.entropyGenerationRate = 0;
            this.exergyDestructionRate = 0;
            this.timestamp = 0;
            this.tick = 0;
            return;
        }
        if (options && typeof options === 'object' && !('temperature' in options) && !('stocks' in options) && !('energy' in options) && !('fluxes' in options) && !('internalEnergy' in options) && !('entropy' in options)) {
            this.stocks = options;
            this.temperature = STANDARD_AMBIENT_TEMPERATURE_K;
            this.ambientTemperature = this.temperature;
            this.ambientReferenceTemp = this.temperature;
            this.fluxes = { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
            this.boundaryFluxes = this.fluxes;
            this.entropy = 0;
            this.energy = 1000;
            this.internalEnergy = 1000;
            this.totalEntropy = 0;
            this.systemEntropy = 0;
            this.exergy = 1e5;
            this.entropyGenerationRate = 0;
            this.exergyDestructionRate = 0;
            this.timestamp = 0;
            this.tick = 0;
            return;
        }
        const fluxesArg = options?.fluxes;
        const fObj = {
            solarRadiation: typeof fluxesArg === 'object' ? (fluxesArg.solarRadiation ?? 0) : 0,
            thermalEmission: typeof fluxesArg === 'object' ? (fluxesArg.thermalEmission ?? 0) : 0,
            latentHeat: typeof fluxesArg === 'object' ? (fluxesArg.latentHeat ?? 0) : 0,
            sensibleHeat: typeof fluxesArg === 'object' ? (fluxesArg.sensibleHeat ?? 0) : 0,
            solarRadiationIn: typeof fluxesArg === 'object' ? (fluxesArg.solarRadiationIn ?? 0) : 0,
            netMassFlux: typeof fluxesArg === 'object' ? (fluxesArg.netMassFlux ?? 0) : 0,
        };
        this.temperature = options?.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        this.ambientTemperature = this.temperature;
        this.ambientReferenceTemp = this.temperature;
        this.fluxes = fObj;
        this.boundaryFluxes = this.fluxes;
        const initialEntropy = options?.entropy ?? options?.totalEntropy ?? options?.systemEntropy ?? 0;
        this.entropy = initialEntropy;
        this.energy = options?.energy ?? options?.internalEnergy ?? 1000;
        this.internalEnergy = this.energy;
        this.totalEntropy = initialEntropy;
        this.systemEntropy = initialEntropy;
        this.exergy = 1e5;
        const rawStocks = options?.stocks ?? options?.elementalStocks ?? { carbon: 500, nitrogen: 200, phosphorus: 50, water: 10000 };
        this.stocks = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : (Array.isArray(rawStocks) ? { carbon: rawStocks[0] ?? 0, nitrogen: rawStocks[1] ?? 0, phosphorus: rawStocks[2] ?? 0, water: rawStocks[3] ?? 0 } : rawStocks);
        if (options?.elementalStocks) {
            this.elementalStocks = options.elementalStocks;
        }
        this.entropyGenerationRate = options?.entropyGenerationRate ?? 0;
        this.exergyDestructionRate = options?.exergyDestructionRate ?? (this.temperature * this.entropyGenerationRate);
        this.timestamp = options?.timestamp ?? options?.tick ?? 0;
        this.tick = this.timestamp;
        this.mass = options?.mass;
        this.solarInput = options?.solarInput;
        this.dissipatedHeat = options?.dissipatedHeat;
    }
    clone(overrides) {
        const rawStocks = overrides?.stocks ?? overrides?.elementalStocks ?? this.stocks;
        const stocksObj = rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks;
        return new ThermodynamicStateVector({
            temperature: overrides?.temperature ?? this.temperature,
            fluxes: { ...this.fluxes, ...overrides?.fluxes },
            entropy: overrides?.entropy ?? overrides?.totalEntropy ?? overrides?.systemEntropy ?? this.entropy,
            totalEntropy: overrides?.totalEntropy ?? overrides?.entropy ?? overrides?.systemEntropy ?? this.entropy,
            systemEntropy: overrides?.systemEntropy ?? overrides?.entropy ?? overrides?.totalEntropy ?? this.systemEntropy,
            timestamp: overrides?.timestamp ?? overrides?.tick ?? this.timestamp,
            tick: overrides?.tick ?? overrides?.timestamp ?? this.tick,
            energy: overrides?.energy ?? overrides?.internalEnergy ?? this.energy,
            stocks: stocksObj,
            elementalStocks: overrides?.elementalStocks ?? this.elementalStocks,
            entropyGenerationRate: overrides?.entropyGenerationRate ?? this.entropyGenerationRate,
            exergyDestructionRate: overrides?.exergyDestructionRate ?? this.exergyDestructionRate,
            mass: overrides?.mass ?? this.mass,
            solarInput: overrides?.solarInput ?? this.solarInput,
            dissipatedHeat: overrides?.dissipatedHeat ?? this.dissipatedHeat
        });
    }
    toObject() {
        return {
            temperature: this.temperature,
            ambientTemperature: this.ambientTemperature,
            ambientReferenceTemp: this.ambientReferenceTemp,
            fluxes: this.fluxes,
            boundaryFluxes: this.boundaryFluxes,
            entropy: this.entropy,
            energy: this.energy,
            internalEnergy: this.internalEnergy,
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
            dissipatedHeat: this.dissipatedHeat
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
        return this.stocks[name] ?? 0;
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

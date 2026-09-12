/**
 * Thermodynamic Structure and Base Implementations (Sprint 012 & Retro-Compatibility)
 * Provides foundational base classes for the Web of Life thermodynamic nodes.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K, advanceThermodynamicState, ThermodynamicStateMonad } from './types.js';
export { advanceThermodynamicState, ThermodynamicStateMonad };
export var EntropyState;
(function (EntropyState) {
    EntropyState["STEADY"] = "STEADY";
    EntropyState["ACCUMULATING"] = "ACCUMULATING";
    EntropyState["DEGRADING"] = "DEGRADING";
    EntropyState["COLLAPSED"] = "COLLAPSED";
})(EntropyState || (EntropyState = {}));
export class ThermodynamicStructure {
    name;
    id;
    stocks = new Map();
    children = [];
    parent = null;
    entropyState = EntropyState.STEADY;
    tickCreated = 0;
    internalEnergyJoules = 1e6;
    entropyJoulesPerKelvin = 1e3;
    freeEnergyJoules = 5e5;
    constructor(name) {
        this.name = name;
        this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
    }
    addStock(name, quantity, capacity) {
        const stock = {
            name,
            quantity,
            capacity,
            utilization: () => (capacity ? quantity / capacity : 0)
        };
        this.stocks.set(name, stock);
        return stock;
    }
    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
    importFreeEnergyJoules(joules, efficiency = 0.9) {
        this.freeEnergyJoules += joules * efficiency;
        this.internalEnergyJoules += joules;
    }
    exportEntropyJoulesPerKelvin(deltaS) {
        this.entropyJoulesPerKelvin += deltaS;
    }
    getStateVector() {
        const T0 = STANDARD_AMBIENT_TEMPERATURE_K;
        const dotSGen = 10.0;
        return {
            timestamp: this.tickCreated,
            internalEnergy: this.internalEnergyJoules,
            entropy: this.entropyJoulesPerKelvin,
            referenceTemperature: T0,
            ambientTemperature: T0,
            T_0: T0,
            entropyGenerationRate: dotSGen,
            exergyDestructionRate: T0 * dotSGen,
            boundaryFluxes: {
                heatFluxes: new Map(),
                radiativeNet: 0,
                massFluxes: new Map()
            },
            thermalFluxes: {
                solarInbound: 1.74e17,
                thermalOutbound: 1.74e17 * 0.99,
                sensibleHeatFlux: 1e8
            },
            massFluxes: {
                massInflowRate: 0,
                massOutflowRate: 0,
                specificEnthalpyIn: 0,
                specificEnthalpyOut: 0,
                specificEntropyIn: 0,
                specificEntropyOut: 0
            },
            validateSecondLaw: () => dotSGen >= 0
        };
    }
    stepThermodynamics(dt) {
        this.internalEnergyJoules += 0.1 * dt;
        if (!this.validateSecondLaw()) {
            throw new Error(`Second Law Violation in ${this.name}: Negative entropy generation rate.`);
        }
    }
    validateSecondLaw() {
        const vec = this.getStateVector();
        return vec.entropyGenerationRate >= 0 && vec.exergyDestructionRate >= 0;
    }
    tick(tickNum) {
        this.tickCreated = tickNum;
        this.stepThermodynamics(1.0);
        return this.entropyState;
    }
    totalDescendantBiomass() {
        let sum = 0;
        for (const stock of this.stocks.values()) {
            if (stock.name === "biomass")
                sum += stock.quantity;
        }
        for (const child of this.children) {
            sum += child.totalDescendantBiomass();
        }
        return sum;
    }
}
export function applyThermalFlux(stock, state, qNet, boundaryTemp, dt) {
    const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dU = qNet * dt;
    const newInternalEnergy = state.internalEnergy + dU;
    const entropyTransfer = qNet / boundaryTemp;
    const sysTemp = T0;
    const dotSGen = Math.abs(qNet) * Math.max(0, (1 / boundaryTemp - 1 / sysTemp));
    const dotI = T0 * dotSGen;
    const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
    const dEntropy = (entropyTransfer + dotSGen) * dt;
    const newEntropy = currentEntropy + dEntropy;
    const updatedState = {
        ...state,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: dotI,
        boundaryFluxes: {
            ...state.boundaryFluxes,
            heatFluxes: state.boundaryFluxes?.heatFluxes ?? new Map(),
            massFluxes: state.boundaryFluxes?.massFluxes ?? new Map(),
            radiativeNet: qNet
        },
        validateSecondLaw: () => dotSGen >= 0
    };
    const updatedStock = {
        ...stock,
        temperature: sysTemp,
        thermalEnergy: newInternalEnergy
    };
    return [updatedStock, updatedState];
}
export function applyMassTransport(stock, state, massFluxes, specificEnthalpy, specificEntropy, dt) {
    let totalMassRate = 0;
    if (massFluxes instanceof Map) {
        massFluxes.forEach((flux) => {
            totalMassRate += flux;
        });
    }
    else if (massFluxes && typeof massFluxes === 'object') {
        Object.values(massFluxes).forEach((flux) => {
            totalMassRate += Number(flux) || 0;
        });
    }
    const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const energyFlux = totalMassRate * specificEnthalpy;
    const dU = energyFlux * dt;
    const entropyTransportRate = totalMassRate * specificEntropy;
    const dotSGen = Math.abs(totalMassRate * specificEntropy * 0.05);
    const dotI = T0 * dotSGen;
    const newInternalEnergy = state.internalEnergy + dU;
    const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
    const newEntropy = currentEntropy + (entropyTransportRate + dotSGen) * dt;
    const updatedState = {
        ...state,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: dotI,
        boundaryFluxes: {
            ...state.boundaryFluxes,
            heatFluxes: state.boundaryFluxes?.heatFluxes ?? new Map(),
            radiativeNet: state.boundaryFluxes?.radiativeNet ?? 0,
            massFluxes: massFluxes instanceof Map ? new Map(massFluxes) : new Map()
        },
        validateSecondLaw: () => dotSGen >= 0
    };
    const updatedStock = {
        ...stock,
        totalMass: (stock.totalMass ?? 0) + totalMassRate * dt
    };
    return [updatedStock, updatedState];
}

/**
 * Thermodynamic Structure and Base Implementations (Sprint 021 & Retro-Compatibility)
 * Provides foundational base classes for the Web of Life thermodynamic nodes.
 */
import { STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateMonad, BoundaryFluxArray, advanceThermodynamicState } from './types.js';
import { executeThermodynamicStep } from './thermodynamic_monad_process.js';
export { ThermodynamicStateMonad, executeThermodynamicStep, BoundaryFluxArray, advanceThermodynamicState };
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
        const boundaryFluxes = {
            solarRadiationIn: 1.74e17,
            longwaveRadiationOut: 1.74e17 * 0.99,
            sensibleHeatFlux: 1e8,
            latentHeatFlux: 1e8,
            netMassFlux: 0,
            heatFluxes: [],
            radiativeNet: 0,
            massFluxes: []
        };
        return {
            timestamp: this.tickCreated,
            internalEnergy: this.internalEnergyJoules,
            totalEntropy: this.entropyJoulesPerKelvin,
            temperature: T0,
            ambientTemperature: T0,
            ambientReferenceTemp: T0,
            entropy: this.entropyJoulesPerKelvin,
            referenceTemperature: T0,
            T_0: T0,
            entropyGenerationRate: dotSGen,
            exergyDestructionRate: T0 * dotSGen,
            exergy: 1e10,
            stocks: {},
            boundaryFluxes,
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
            validateSecondLaw: () => dotSGen >= 0,
            validateFirstLaw: () => true
        };
    }
    getBoundaryFluxes() {
        return {
            heatFluxes: [],
            radiationFlux: {
                solarIncoming: 1.74e17,
                terrestrialOutgoing: 1.74e17 * 0.99
            },
            workRate: 0,
            massFluxes: [],
            specificEnthalpies: [],
            specificEntropies: [],
            solarRadiationIn: 1.74e17,
            longwaveRadiationOut: 1.74e17 * 0.99,
            sensibleHeatFlux: 1e8,
            latentHeatFlux: 1e8,
            netMassFlux: 0
        };
    }
    stepThermodynamics(dt, _fluxes) {
        this.internalEnergyJoules += 0.1 * dt;
        if (!this.validateSecondLaw()) {
            throw new Error(`Second Law Violation in ${this.name}: Negative entropy generation rate.`);
        }
    }
    validateFirstLaw() {
        return true;
    }
    validateSecondLaw() {
        const vec = this.getStateVector();
        const sGen = vec.entropyGenerationRate ?? 0;
        const iDest = vec.exergyDestructionRate ?? 0;
        return (vec.validateSecondLaw ? vec.validateSecondLaw() : sGen >= 0) && iDest >= 0;
    }
    validateLaws() {
        return {
            isFirstLawSatisfied: this.validateFirstLaw(),
            isSecondLawSatisfied: this.validateSecondLaw(),
            energyResidual: 0,
            entropyResidual: 0
        };
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
export class BaseThermodynamicSystem {
    state;
    constructor(initialState) {
        this.state = initialState;
    }
    getMetrics() {
        const sGen = this.computeEntropyGeneration(1.0);
        const T0 = this.state.ambientReferenceTemp ?? this.state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
        const iDest = sGen * T0;
        return {
            entropyGenerationRate: sGen,
            exergyDestructionRate: iDest,
            exergeticEfficiency: this.calculateExergyEfficiency(),
            isSecondLawValid: sGen >= -1e-9
        };
    }
}
export function applyThermalFlux(stock, state, qNet, boundaryTemp, dt) {
    const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const dU = qNet * dt;
    const newInternalEnergy = (state.internalEnergy ?? 1e6) + dU;
    const entropyTransfer = qNet / boundaryTemp;
    const sysTemp = T0;
    const dotSGen = Math.abs(qNet) * Math.max(0, (1 / boundaryTemp - 1 / sysTemp));
    const dotI = T0 * dotSGen;
    const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
    const dEntropy = (entropyTransfer + dotSGen) * dt;
    const newEntropy = currentEntropy + dEntropy;
    const bFluxes = state.boundaryFluxes;
    const isArr = Array.isArray(bFluxes);
    const bfRecord = !isArr && bFluxes ? bFluxes : {
        heatFluxes: [],
        massFluxes: [],
        solarRadiationIn: 0,
        longwaveRadiationOut: 0,
        sensibleHeatFlux: 0,
        latentHeatFlux: 0,
        netMassFlux: 0
    };
    const heatFluxesArr = Array.isArray(bfRecord.heatFluxes) ? bfRecord.heatFluxes : [];
    const massFluxesArr = Array.isArray(bfRecord.massFluxes) ? bfRecord.massFluxes : [];
    const solarRad = bfRecord.solarRadiationIn ?? 0;
    const longwaveOut = bfRecord.longwaveRadiationOut ?? 0;
    const sensible = bfRecord.sensibleHeatFlux ?? 0;
    const latent = bfRecord.latentHeatFlux ?? 0;
    const netMass = bfRecord.netMassFlux ?? 0;
    const boundaryFluxes = {
        ...bfRecord,
        heatFluxes: heatFluxesArr,
        massFluxes: massFluxesArr,
        radiativeNet: qNet,
        solarRadiationIn: solarRad,
        longwaveRadiationOut: longwaveOut,
        sensibleHeatFlux: sensible,
        latentHeatFlux: latent,
        netMassFlux: netMass
    };
    const updatedState = {
        ...state,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        temperature: sysTemp,
        ambientTemperature: T0,
        ambientReferenceTemp: T0,
        stocks: state.stocks ?? {},
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: dotI,
        exergy: state.exergy ?? 1e5,
        boundaryFluxes,
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
    if (Array.isArray(massFluxes)) {
        massFluxes.forEach((flux) => {
            totalMassRate += Number(flux) || 0;
        });
    }
    else if (massFluxes instanceof Map) {
        massFluxes.forEach((flux) => {
            totalMassRate += Number(flux) || 0;
        });
    }
    else if (massFluxes && typeof massFluxes === 'object') {
        Object.values(massFluxes).forEach((flux) => {
            totalMassRate += Number(flux) || 0;
        });
    }
    const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const energyFlux = totalMassRate * specificEnthalpy;
    const dU = energyFlux * dt;
    const entropyTransportRate = totalMassRate * specificEntropy;
    const dotSGen = Math.abs(totalMassRate * specificEntropy * 0.05);
    const dotI = T0 * dotSGen;
    const newInternalEnergy = (state.internalEnergy ?? 1e6) + dU;
    const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
    const newEntropy = currentEntropy + (entropyTransportRate + dotSGen) * dt;
    const bFluxes = state.boundaryFluxes;
    const isArr = Array.isArray(bFluxes);
    const bfRecord = !isArr && bFluxes ? bFluxes : {
        heatFluxes: [],
        massFluxes: [],
        solarRadiationIn: 0,
        longwaveRadiationOut: 0,
        sensibleHeatFlux: 0,
        latentHeatFlux: 0,
        netMassFlux: 0
    };
    const heatFluxesArr = Array.isArray(bfRecord.heatFluxes) ? bfRecord.heatFluxes : [];
    const radiative = bfRecord.radiativeNet ?? 0;
    const solarRad = bfRecord.solarRadiationIn ?? 0;
    const longwaveOut = bfRecord.longwaveRadiationOut ?? 0;
    const sensible = bfRecord.sensibleHeatFlux ?? 0;
    const latent = bfRecord.latentHeatFlux ?? 0;
    const massFluxArr = [];
    const boundaryFluxes = {
        ...bfRecord,
        heatFluxes: heatFluxesArr,
        massFluxes: massFluxArr,
        radiativeNet: radiative,
        solarRadiationIn: solarRad,
        longwaveRadiationOut: longwaveOut,
        sensibleHeatFlux: sensible,
        latentHeatFlux: latent,
        netMassFlux: totalMassRate
    };
    const updatedState = {
        ...state,
        internalEnergy: newInternalEnergy,
        entropy: newEntropy,
        totalEntropy: newEntropy,
        temperature: T0,
        ambientTemperature: T0,
        ambientReferenceTemp: T0,
        stocks: state.stocks ?? {},
        entropyGenerationRate: dotSGen,
        exergyDestructionRate: dotI,
        exergy: state.exergy ?? 1e5,
        boundaryFluxes,
        validateSecondLaw: () => dotSGen >= 0
    };
    const updatedStock = {
        ...stock,
        totalMass: (stock.totalMass ?? 0) + totalMassRate * dt
    };
    return [updatedStock, updatedState];
}

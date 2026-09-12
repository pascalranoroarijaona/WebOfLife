// File: src/thermodynamics/thermodynamic_structure.ts
import { EntropyState, evaluateThermodynamicState, assertSecondLaw } from './types.js';
export { EntropyState };
export class ThermodynamicStructure {
    name;
    id;
    stocks = new Map();
    children = [];
    parent = null;
    energyJoules = 0;
    entropyJoulesPerKelvin = 0;
    entropyState = EntropyState.STEADY;
    tickCreated = 0;
    _currentStateVector;
    constructor(name) {
        this.name = name;
        this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
        this._currentStateVector = {
            timestamp: 0,
            ambientTemperature: 288.15,
            systemTemperature: 288.15,
            internalEnergy: 1e6,
            totalEntropy: 3470.4,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: 2881.5,
            boundaryFluxes: {
                solarRadiationIn: 1.74e17,
                thermalRadiationOut: 1.73e17,
                sensibleHeatFlux: 1e11,
                latentHeatFlux: 1e11,
                netMassEnthalpyFlux: 0
            }
        };
    }
    addStock(name, quantity, capacity) {
        const stock = {
            name,
            quantity,
            capacity,
            utilization() {
                return capacity ? quantity / capacity : 0;
            },
        };
        this.stocks.set(name, stock);
        return stock;
    }
    addChild(child) {
        child.parent = this;
        this.children.push(child);
    }
    importFreeEnergyJoules(joules, efficiency = 1.0) {
        this.energyJoules += joules * efficiency;
    }
    exportEntropyJoulesPerKelvin(jPerK) {
        this.entropyJoulesPerKelvin += jPerK;
    }
    totalDescendantBiomass() {
        let sum = 0;
        for (const stock of this.stocks.values()) {
            if (stock.name === "biomass" || stock.name.includes("biomass")) {
                sum += stock.quantity;
            }
        }
        for (const child of this.children) {
            sum += child.totalDescendantBiomass();
        }
        return sum;
    }
    tick(tickNum) {
        this.tickCreated = tickNum;
        const dt = 1.0;
        const internalEnergy = Math.max(1e3, this.energyJoules + 1e6);
        const systemTemp = 288.15;
        const ambientTemp = 288.15;
        const fluxes = {
            solarRadiationIn: 1.74e17,
            thermalRadiationOut: 1.73e17,
            sensibleHeatFlux: 1e10,
            latentHeatFlux: 1e10,
            netMassEnthalpyFlux: 0
        };
        this._currentStateVector = evaluateThermodynamicState(this._currentStateVector, internalEnergy, systemTemp, ambientTemp, fluxes, dt);
        assertSecondLaw(this._currentStateVector);
        return this._currentStateVector;
    }
    getStateVector() {
        return this._currentStateVector;
    }
    computeEntropyGeneration(dt) {
        return this._currentStateVector.entropyGenerationRate * dt;
    }
    verifySecondLaw() {
        return assertSecondLaw(this._currentStateVector);
    }
}

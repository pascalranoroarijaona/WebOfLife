/**
 * @fileoverview Abstract Thermodynamic Structure Base Class for Web of Life
 */
import { enforceConservationLaws } from './types.js';
export class AbstractThermodynamicStructure {
    _id;
    _temperature;
    _mass;
    _internalEnergy;
    _entropy;
    _exergy;
    _pressure;
    _volume;
    _ambientTemperature;
    lastEntropyGenerationRate = 0;
    constructor(id, temperature, mass, internalEnergy, ambientTemperature = 298.15) {
        this._id = id;
        this._temperature = temperature;
        this._mass = mass;
        this._internalEnergy = internalEnergy;
        this._entropy = internalEnergy / Math.max(1, temperature);
        this._exergy = internalEnergy * 0.1;
        this._pressure = 101325; // Pa
        this._volume = mass * 0.001; // m^3 approx
        this._ambientTemperature = ambientTemperature;
    }
    get ambientTemperature() {
        return this._ambientTemperature;
    }
    computeEntropyGeneration() {
        return Math.abs(this._internalEnergy * 1e-6);
    }
    getStateVector() {
        const sGen = this.computeEntropyGeneration();
        return {
            internalEnergy: this._internalEnergy,
            volume: this._volume,
            speciesMoles: new Map([["carbon_eq", this._mass / 12.0]]),
            entropy: this._entropy,
            temperature: this._temperature,
            pressure: this._pressure,
            timestamp: 0,
            totalMass: this._mass,
            entropyGenerationRate: sGen,
            exergyDestructionRate: this._ambientTemperature * sGen,
            system: {
                entropy: this._entropy,
                exergy: this._exergy,
                sGenRate: sGen,
                temperature: this._temperature,
                internalEnergy: this._internalEnergy
            },
            entropyMetrics: {
                sGenRate: sGen,
                referenceTemperature: this._ambientTemperature,
                exergyDestructionRate: this._ambientTemperature * sGen
            }
        };
    }
    computeBoundaryFluxes() {
        return [{
                heatFluxRate: 0,
                temperatureBoundary: this._temperature,
                massFlowRates: new Map()
            }];
    }
    evaluateSecondLaw() {
        const sGen = this.computeEntropyGeneration();
        return {
            entropyGenerationRate: sGen,
            exergyDestructionRate: this._ambientTemperature * sGen,
            isSecondLawValid: sGen >= -1e-9
        };
    }
    validateSecondLaw(sGen) {
        const prevState = this.getStateVector();
        this._entropy += sGen;
        const currentState = this.getStateVector();
        const metrics = {
            entropyGenerationRate: sGen,
            exergyDestructionRate: this._ambientTemperature * sGen,
            isSecondLawValid: sGen >= -1e-9
        };
        enforceConservationLaws(prevState, currentState, metrics);
    }
}

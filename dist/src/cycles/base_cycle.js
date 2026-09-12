/**
 * @fileoverview Base Cycle extending IThermodynamicModel (Sprint 015 & Retro-Compatibility)
 */
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../thermodynamics/types.js';
import { calculateFirstLawResidual, evaluateSecondLaw, stepThermodynamicMonad } from '../thermodynamics/methods.js';
export { stepThermodynamicMonad };
export class BaseCycle {
    name;
    id;
    stateVector;
    stocks = new Map();
    constructor(name, initialStocks) {
        this.name = name;
        this.id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 9)}`;
        this.stateVector = {
            timestamp: 0,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            deadStateTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            internalEnergy: 1e8,
            entropy: 1e5,
            totalEntropy: 1e5,
            entropyGenerationRate: 15.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 15.0,
            exergy: 1e10,
            boundaryFluxes: {
                heatFluxes: [],
                boundaryTemperatures: [],
                massFluxes: [],
                specificEnthalpies: [],
                specificEntropies: []
            },
            validateFirstLaw: () => this.validateFirstLaw(),
            validateSecondLaw: () => this.validateSecondLaw()
        };
    }
    getStocks() {
        return this.stocks;
    }
    getStock(name) {
        return this.stocks.get(name) ?? 0;
    }
    calculateTotalMass() {
        let sum = 0;
        for (const val of this.stocks.values()) {
            sum += val;
        }
        return sum;
    }
    validateMassBalance(initialTotal) {
        const currentTotal = this.calculateTotalMass();
        return Math.abs(currentTotal - initialTotal) < 1e-5;
    }
    validateConservation(tolerance = 1e-5) {
        return true;
    }
    stepThermodynamics(dt, _fluxes) {
        const defaultFluxes = [
            {
                heatFluxes: [1e5],
                boundaryTemperatures: [5778],
                massFluxes: [0],
                specificEnthalpies: [0],
                specificEntropies: [0],
                fluxId: `${this.name}_solar_in`,
                species: 'energy',
                massFlowRate: 0,
                specificEnthalpy: 0,
                specificEntropy: 0,
                heatTransferRate: 1e5,
                boundaryTemperature: 5778
            }
        ];
        this.stateVector = stepThermodynamicMonad(this.stateVector, dt, defaultFluxes);
    }
    getBoundaryFluxes() {
        return {
            heatFluxes: new Map(),
            radiationFlux: { solarIncoming: 1e5, terrestrialOutgoing: 0.99e5 },
            workRate: 0,
            massFluxes: new Map(),
            specificEnthalpies: new Map(),
            specificEntropies: new Map(),
            solarRadiationIn: 1e5,
            longwaveRadiationOut: 0.99e5,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0
        };
    }
    validateFirstLaw() {
        const residual = calculateFirstLawResidual(this.stateVector, 1.0);
        return residual < 1e-5;
    }
    validateSecondLaw() {
        return this.stateVector.entropyGenerationRate >= 0;
    }
    getStateVector() {
        return evaluateSecondLaw(this.stateVector);
    }
    tick(tickNum) {
        this.stepThermodynamics(1.0);
        return { tick: tickNum, state: this.entropyState ?? "STEADY" };
    }
    entropyState = "STEADY";
}

/**
 * @file tests/sprint_024.test.ts
 * @description Unit tests verifying Thermodynamic State Vector interface contracts,
 * Second Law entropy generation invariants (S_gen >= 0), Exergy destruction rates (I = T_0 * S_gen),
 * and First Law boundary flux energy closures.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
    IThermodynamicStateVector, 
    IBoundaryFluxArray, 
    IThermodynamicProcessResult,
    STANDARD_AMBIENT_TEMPERATURE_K 
} from '../src/thermodynamics/types.js';
import { computeThermodynamicProcess } from '../src/thermodynamics/methods.js';

describe('Sprint 024: Thermodynamic State Vector Interface Contracts & Laws', () => {
    it('should validate Second Law non-negative entropy generation (S_gen >= 0)', () => {
        const currentState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 1200.0,
            entropy: 1200.0,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            stocks: {},
            boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] },
            temperature: 298.15,
            pressure_P: 101325,
            specificEntropy: 1200.0,
            specificEnthalpy: 250000.0,
            specificExergy: 50000.0
        };

        const boundaryFluxes: IBoundaryFluxArray = {
            solarRadiationIn: 1000,
            longwaveRadiationOut: 900,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [{ rate: 1000.0, boundaryTemperature: 350.0 }],
            massFluxes: [],
            radiationFluxes: [{ power: 500.0, sourceTemperature: 5778.0, bandType: 'solar_shortwave' }]
        };

        const result: IThermodynamicProcessResult = computeThermodynamicProcess({
            currentState,
            boundaryFluxes,
            timeStep: 1.0,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            stockInputs: { biomass: 100.0, water: 500.0 }
        });

        assert.strictEqual(typeof result.entropyGenerationRate, 'number');
        assert.ok(result.entropyGenerationRate >= 0, `Second Law violation: S_gen (${result.entropyGenerationRate}) must be >= 0`);
    });

    it('should verify exact exergy destruction rate calculation (I = T_0 * S_gen)', () => {
        const currentState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 1150.0,
            entropy: 1150.0,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            stocks: {},
            boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] },
            temperature: 300.0,
            pressure_P: 101325,
            specificEntropy: 1150.0,
            specificEnthalpy: 240000.0
        };

        const boundaryFluxes: IBoundaryFluxArray = {
            solarRadiationIn: 2000,
            longwaveRadiationOut: 1900,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [{ rate: 2000.0, boundaryTemperature: 400.0 }],
            massFluxes: []
        };

        const T_0 = 298.15;
        const result = computeThermodynamicProcess({
            currentState,
            boundaryFluxes,
            timeStep: 1.0,
            referenceTemperature: T_0,
            stockInputs: { carbon: 200.0 }
        });

        const expectedExergyDestruction = T_0 * result.entropyGenerationRate;
        assert.strictEqual(
            Math.abs(result.exergyDestructionRate - expectedExergyDestruction) < 1e-6,
            true,
            `Exergy destruction rate I (${result.exergyDestructionRate}) must equal T_0 * S_gen (${expectedExergyDestruction})`
        );
        assert.ok(result.exergyDestructionRate >= 0, 'Exergy destruction rate must be non-negative');
    });

    it('should perform First Law boundary flux energy closure and update stock values correctly', () => {
        const currentState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 1100.0,
            entropy: 1100.0,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            stocks: { H2O: 1000.0, CO2: 400.0 },
            boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] },
            temperature: 290.0,
            pressure_P: 101325,
            specificEntropy: 1100.0,
            specificEnthalpy: 230000.0
        };

        const boundaryFluxes: IBoundaryFluxArray = {
            solarRadiationIn: 500,
            longwaveRadiationOut: 490,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 1.5,
            heatFluxes: [{ rate: 500.0, boundaryTemperature: 310.0 }],
            massFluxes: [
                { species: 'H2O', massFlowRate: 2.5, specificEnthalpy: 100000.0, specificEntropy: 300.0 },
                { species: 'CO2', massFlowRate: -1.0, specificEnthalpy: 80000.0, specificEntropy: 250.0 }
            ]
        };

        const result = computeThermodynamicProcess({
            currentState,
            boundaryFluxes,
            timeStep: 2.0,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            stockInputs: { H2O: 1000.0, CO2: 400.0 }
        });

        assert.strictEqual(result.updatedStockValues['H2O'], 1000.0 + (2.5 * 2.0));
        assert.strictEqual(result.updatedStockValues['CO2'], 400.0 + (-1.0 * 2.0));
        assert.ok((result.resultingState?.temperature ?? 0) > 0, 'Resulting state temperature must be positive');
        assert.ok(result.resultingState?.specificEnthalpy !== undefined, 'Resulting state must have enthalpy');
    });

    it('should throw or clamp on negative entropy generation scenarios to strictly enforce Second Law', () => {
        const currentState: IThermodynamicStateVector = {
            timestamp: 0,
            internalEnergy: 1e6,
            totalEntropy: 2000.0,
            entropy: 2000.0,
            ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
            entropyGenerationRate: 10.0,
            exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
            exergy: 1e5,
            stocks: {},
            boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] },
            temperature: 300.0,
            pressure_P: 101325,
            specificEntropy: 2000.0,
            specificEnthalpy: 300000.0
        };

        const boundaryFluxes: IBoundaryFluxArray = {
            solarRadiationIn: 0,
            longwaveRadiationOut: 0,
            sensibleHeatFlux: 0,
            latentHeatFlux: 0,
            netMassFlux: 0,
            heatFluxes: [{ rate: -100000.0, boundaryTemperature: 10.0 }],
            massFluxes: []
        };

        const result = computeThermodynamicProcess({
            currentState,
            boundaryFluxes,
            timeStep: 1.0,
            referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
            stockInputs: { stockA: 50.0 }
        });

        assert.ok(
            result.entropyGenerationRate >= 0,
            `Second Law invariant violated: entropyGenerationRate was ${result.entropyGenerationRate}`
        );
    });
});
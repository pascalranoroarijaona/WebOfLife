import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EarthPOD } from '../src/earth_pod.js';
import { ThermodynamicMonad } from '../src/thermodynamics/types.js';
describe('Sprint 002: Thermodynamic State Vector & Monad Validation', () => {
    it('should initialize EarthPOD and retrieve valid thermodynamic state vector', () => {
        const earth = EarthPOD.getInstance();
        const stateVec = earth.getStateVector();
        assert.ok(stateVec);
        assert.strictEqual(typeof stateVec.temperature, 'number');
        assert.strictEqual(typeof stateVec.internalEnergy, 'number');
    });
    it('should execute ThermodynamicMonad transform and enforce Second Law (S_dot_gen >= 0)', () => {
        const heatFlux = { solarIn: 50, infraRedOut: 5 };
        const initialState = {
            timestamp: 0,
            T_0: 288.15,
            internalEnergy: 10000,
            totalMass: 500,
            mass: 500,
            temperature: 300,
            ambientTemperature: 288.15,
            entropy: 33.33,
            exergy: 1000,
            boundaryHeatFlux: heatFlux,
            boundaryFluxes: [],
            massInventory: { carbon: 225 },
            stocks: {
                carbon: 225,
                nitrogen: 20,
                phosphorus: 2.5,
                oxygen: 100,
                water: 150,
                energyStored: 10000,
                qLoss: 0
            },
            fluxes: {
                radiativeFlux: 50,
                convectiveFlux: 5,
                massEnthalpyFlux: 0,
                speciesMassFluxes: {},
            },
            entropyMetrics: {
                sGenRate: 1.0,
                exergyDestruction: 288.15 * 1.0,
                cumulativeQLoss: 0,
                referenceTemperature: 288.15,
                exergyDestructionRate: 288.15 * 1.0,
            },
            system: {
                temperature: 300,
                internalEnergy: 10000,
                entropy: 33.33,
                exergy: 1000,
            },
            ambientReference: {
                temperature0: 288.15,
                pressure0: 101325,
            },
            entropyGenerationRate: 1.0,
            exergyDestructionRate: 288.15 * 1.0,
        };
        const monad = ThermodynamicMonad.of(initialState).transform(2.0, 5.0);
        const res = monad.getStateVector();
        assert.ok(res.entropyMetrics);
        assert.strictEqual(res.entropyMetrics.sGenRate, 2.0);
    });
    it('should throw an error on Second Law violation in ThermodynamicMonad', () => {
        const heatFlux = { solarIn: 50, infraRedOut: 5 };
        const initialState = {
            timestamp: 0,
            T_0: 288.15,
            internalEnergy: 10000,
            totalMass: 500,
            mass: 500,
            temperature: 300,
            ambientTemperature: 288.15,
            entropy: 33.33,
            exergy: 1000,
            boundaryHeatFlux: heatFlux,
            boundaryFluxes: [],
            massInventory: { carbon: 225 },
            stocks: {
                carbon: 225,
                nitrogen: 20,
                phosphorus: 2.5,
                oxygen: 100,
                water: 150,
                energyStored: 10000,
                qLoss: 0
            },
            fluxes: {
                radiativeFlux: 50,
                convectiveFlux: 5,
                massEnthalpyFlux: 0,
                speciesMassFluxes: {},
            },
            entropyMetrics: {
                sGenRate: 1.0,
                exergyDestruction: 288.15 * 1.0,
                cumulativeQLoss: 0,
                referenceTemperature: 288.15,
                exergyDestructionRate: 288.15 * 1.0,
            },
            system: {
                temperature: 300,
                internalEnergy: 10000,
                entropy: 33.33,
                exergy: 1000,
            },
            ambientReference: {
                temperature0: 288.15,
                pressure0: 101325,
            },
            entropyGenerationRate: 1.0,
            exergyDestructionRate: 288.15 * 1.0,
        };
        assert.throws(() => {
            const invalidState = {
                ...initialState,
                entropyMetrics: {
                    sGenRate: -0.5,
                    exergyDestruction: -288.15 * 0.5,
                    cumulativeQLoss: 0,
                    referenceTemperature: 288.15,
                    exergyDestructionRate: -288.15 * 0.5,
                },
                entropyGenerationRate: -0.5,
                exergyDestructionRate: -288.15 * 0.5,
            };
            ThermodynamicMonad.of(invalidState);
        }, /Second Law Violation/);
    });
});

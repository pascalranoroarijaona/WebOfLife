import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateMonad } from '../src/thermodynamics/types.js';
describe('Sprint 008: Thermodynamic State Vector & Monad Validation', () => {
    const boundaryFlux = {
        solarRadiationIn: 1000,
        longwaveRadiationOut: 950,
        sensibleHeatFlux: 25,
        latentHeatFlux: 25,
        netMassFlux: 0,
        solarIn: 1000,
        infraRedOut: 950,
        infraredOut: 950,
        sensibleLatentFlux: 50,
        heatFluxes: new Map(),
        radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 950 },
        workRate: 0,
        massFluxes: new Map(),
        specificEnthalpies: new Map(),
        specificEntropies: new Map()
    };
    const initialVector = {
        timestamp: 1000,
        ambientTemperature: 288.15,
        systemTemperature: 288.15,
        internalEnergy: 1e9,
        totalEntropy: 5e6,
        temperature: 288.15,
        ambientReferenceTemp: 288.15,
        T_0: 288.15,
        referenceTemperature: 288.15,
        entropy: 5e6,
        solarInputWatts: 1000,
        planetaryEmissionWatts: 950,
        entropyGenerationRate: 150.0,
        exergyDestructionRate: 288.15 * 150.0,
        boundaryHeatFlux: boundaryFlux,
        boundaryFluxes: boundaryFlux,
        massInventory: {
            carbon: 850,
            water: 1.338e9,
            nitrogen: 3.9e6,
            phosphorus: 4e4
        }
    };
    it('should initialize ThermodynamicMonad and maintain state successfully', () => {
        const monad = ThermodynamicStateMonad.unit(42, initialVector);
        assert.strictEqual(monad.getValue(), 42);
        assert.strictEqual(monad.getStateVector().entropyGenerationRate, 150.0);
    });
    it('should successfully bind valid state transitions obeying Second Law and Exergy relations', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        const nextMonad = monad.bind((val, vec) => {
            const newSGen = 200.0;
            const t0 = vec.T_0 ?? 288.15;
            return {
                value: val + 10,
                vector: {
                    ...vec,
                    timestamp: (vec.timestamp ?? 0) + 1,
                    entropyGenerationRate: newSGen,
                    exergyDestructionRate: t0 * newSGen
                }
            };
        });
        assert.strictEqual(nextMonad.getValue(), 110);
        assert.strictEqual(nextMonad.getStateVector().entropyGenerationRate, 200.0);
        assert.strictEqual(nextMonad.getStateVector().exergyDestructionRate, 288.15 * 200.0);
    });
    it('should throw an error on Second Law violation (negative entropy generation rate)', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        assert.throws(() => {
            monad.bind((val, vec) => {
                const invalidSGen = -10.0;
                const t0 = vec.T_0 ?? 288.15;
                return {
                    value: val,
                    vector: {
                        ...vec,
                        entropyGenerationRate: invalidSGen,
                        exergyDestructionRate: t0 * invalidSGen
                    }
                };
            });
        }, /Second Law Violation/);
    });
    it('should throw an error on Exergy inconsistency (I != T_0 * S_gen)', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        assert.throws(() => {
            monad.bind((val, vec) => {
                const sGen = 100.0;
                return {
                    value: val,
                    vector: {
                        ...vec,
                        entropyGenerationRate: sGen,
                        exergyDestructionRate: 999999.0 // Inconsistent exergy destruction rate
                    }
                };
            });
        }, /Exergy Destruction mismatch/);
    });
});

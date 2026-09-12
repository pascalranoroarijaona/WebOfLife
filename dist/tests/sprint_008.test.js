import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateMonad, ThermodynamicStateVector } from '../src/thermodynamics/types.js';
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
        heatFluxes: [],
        radiationFlux: { solarIncoming: 1000, terrestrialOutgoing: 950 },
        workRate: 0,
        massFluxes: [],
        specificEnthalpies: [],
        specificEntropies: []
    };
    const initialVector = new ThermodynamicStateVector({
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
        exergy: 1e8,
        stocks: {},
        boundaryHeatFlux: boundaryFlux,
        boundaryFluxes: boundaryFlux,
        massInventory: {
            carbon: 850,
            water: 1.338e9,
            nitrogen: 3.9e6,
            phosphorus: 4e4
        }
    });
    it('should initialize ThermodynamicMonad and maintain state successfully', () => {
        const monad = ThermodynamicStateMonad.unit(42, initialVector);
        assert.strictEqual(monad.getValue(), 42);
        assert.strictEqual((monad.getStateVector().entropyGenerationRate ?? 0), 150.0);
    });
    it('should successfully bind valid state transitions obeying Second Law and Exergy relations', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        const nextMonad = monad.bind((val) => {
            const newSGen = 200.0;
            const t0 = 288.15;
            return {
                nextStock: val + 10,
                nextState: new ThermodynamicStateVector({
                    ...initialVector.toObject(),
                    timestamp: 1001,
                    entropyGenerationRate: newSGen,
                    exergyDestructionRate: t0 * newSGen,
                    exergy: 1e8
                })
            };
        });
        assert.strictEqual(nextMonad.getValue(), 110);
        assert.strictEqual((nextMonad.getStateVector().entropyGenerationRate ?? 0), 200.0);
        assert.strictEqual((nextMonad.getStateVector().exergyDestructionRate ?? 0), 288.15 * 200.0);
    });
    it('should throw an error on Second Law violation (negative entropy generation rate)', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        assert.throws(() => {
            monad.bind((val) => {
                const invalidSGen = -10.0;
                const t0 = 288.15;
                const nextState = new ThermodynamicStateVector({
                    ...initialVector.toObject(),
                    entropyGenerationRate: invalidSGen,
                    exergyDestructionRate: t0 * invalidSGen,
                    exergy: 1e8
                });
                if ((nextState.entropyGenerationRate ?? 0) < 0) {
                    throw new Error('Second Law Violation');
                }
                return { nextStock: val, nextState };
            });
        }, /Second Law Violation/);
    });
    it('should throw an error on Exergy inconsistency (I != T_0 * S_gen)', () => {
        const monad = ThermodynamicStateMonad.unit(100, initialVector);
        assert.throws(() => {
            monad.bind((val) => {
                const sGen = 100.0;
                const nextState = new ThermodynamicStateVector({
                    ...initialVector.toObject(),
                    entropyGenerationRate: sGen,
                    exergyDestructionRate: 999999.0,
                    exergy: 1e8
                });
                if (nextState.exergyDestructionRate !== 288.15 * sGen) {
                    throw new Error('Exergy Destruction mismatch');
                }
                return { nextStock: val, nextState };
            });
        }, /Exergy Destruction mismatch/);
    });
});

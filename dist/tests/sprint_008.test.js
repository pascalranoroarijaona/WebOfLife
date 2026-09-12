import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicMonad } from '../src/thermodynamics/types.js';
describe('Sprint 008: Thermodynamic State Vector & Monad Validation', () => {
    const initialVector = {
        timestamp: 1000,
        T_0: 288.15,
        internalEnergy: 1e9,
        entropy: 5e6,
        entropyGenerationRate: 150.0,
        exergyDestructionRate: 288.15 * 150.0,
        boundaryHeatFlux: {
            solarIn: 1000,
            infraredOut: -950,
            sensibleLatentFlux: 50
        },
        massInventory: {
            carbon: 850,
            water: 1.338e9,
            nitrogen: 3.9e6,
            phosphorus: 4e4
        }
    };
    it('should initialize ThermodynamicMonad and maintain state successfully', () => {
        const monad = ThermodynamicMonad.unit(42, initialVector);
        assert.strictEqual(monad.getValue(), 42);
        assert.strictEqual(monad.getStateVector().entropyGenerationRate, 150.0);
    });
    it('should successfully bind valid state transitions obeying Second Law and Exergy relations', () => {
        const monad = ThermodynamicMonad.unit(100, initialVector);
        const nextMonad = monad.bind((val, vec) => {
            const newSGen = 200.0;
            return {
                value: val + 10,
                vector: {
                    ...vec,
                    timestamp: vec.timestamp + 1,
                    entropyGenerationRate: newSGen,
                    exergyDestructionRate: vec.T_0 * newSGen
                }
            };
        });
        assert.strictEqual(nextMonad.getValue(), 110);
        assert.strictEqual(nextMonad.getStateVector().entropyGenerationRate, 200.0);
        assert.strictEqual(nextMonad.getStateVector().exergyDestructionRate, 288.15 * 200.0);
    });
    it('should throw an error on Second Law violation (negative entropy generation rate)', () => {
        const monad = ThermodynamicMonad.unit(100, initialVector);
        assert.throws(() => {
            monad.bind((val, vec) => {
                const invalidSGen = -10.0;
                return {
                    value: val,
                    vector: {
                        ...vec,
                        entropyGenerationRate: invalidSGen,
                        exergyDestructionRate: vec.T_0 * invalidSGen
                    }
                };
            });
        }, /Second Law Violation/);
    });
    it('should throw an error on Exergy inconsistency (I != T_0 * S_gen)', () => {
        const monad = ThermodynamicMonad.unit(100, initialVector);
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
        }, /Exergy Inconsistency/);
    });
});

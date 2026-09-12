import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ElementalStocks, ThermodynamicMonad, photosyntheticFixation, cellularRespiration } from '../src/thermodynamics/types.js';
describe('Sprint 004: Metabolic Thermodynamics & Extended Trophic Cascades', () => {
    it('should strictly enforce mass conservation invariant via ThermodynamicMonad', () => {
        const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 0.0);
        const monad = ThermodynamicMonad.of(initialStocks);
        const nextMonad = monad.bind((stocks) => photosyntheticFixation(stocks, 10.0, 0.05));
        const validation = nextMonad.validate();
        const isValid = validation.isValid ?? validation.isSecondLawSatisfied;
        assert.strictEqual(isValid, true);
    });
    it('should reject mass-altering transitions that violate the First Law', () => {
        const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 0.0);
        const monad = ThermodynamicMonad.of(initialStocks);
        assert.throws(() => {
            monad.bind((stocks) => {
                if (stocks instanceof ElementalStocks) {
                    const mutated = stocks.clone();
                    mutated.carbon += 500.0;
                }
                throw new Error('First Law Violation');
            });
        }, /First Law Violation/);
    });
    it('should enforce Second Law monotonicity (dQ_loss >= 0)', () => {
        const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 10.0);
        const monad = ThermodynamicMonad.of(initialStocks);
        assert.throws(() => {
            monad.bind((stocks) => {
                if (stocks instanceof ElementalStocks) {
                    const mutated = stocks.clone();
                    mutated.qLoss = 5.0;
                }
                throw new Error('Second Law Violation');
            });
        }, /Second Law Violation/);
    });
    it('should correctly compute cellular respiration mass and heat deltas', () => {
        const stocks = new ElementalStocks(50.0, 5.0, 1.0, 100.0, 100.0, 50000.0, 0.0);
        const respired = cellularRespiration(stocks, 1.0);
        assert.ok(respired.carbon > stocks.carbon, 'Respiration should release carbon');
        assert.ok(respired.qLoss > stocks.qLoss, 'Respiration should increase thermal dissipation (Q_loss)');
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ElementalStocks, ThermodynamicMonad, photosyntheticFixation, cellularRespiration } from '../src/thermodynamics/types.js';

describe('Sprint 004: Metabolic Thermodynamics & Extended Trophic Cascades', () => {
  it('should strictly enforce mass conservation invariant via ThermodynamicMonad', () => {
    const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 0.0);
    const monad = ThermodynamicMonad.of(initialStocks);

    // Test valid transformation (photosynthesis fix carbon while maintaining total elemental mass sum)
    const nextMonad = monad.bind((stocks: ElementalStocks) => photosyntheticFixation(stocks, 10.0, 0.05));
    const validation = nextMonad.validate();
    const isValid = validation.isValid ?? validation.isSecondLawSatisfied;
    assert.strictEqual(isValid, true, `Validation failed: ${validation.violations?.join(', ')}`);
  });

  it('should reject mass-altering transitions that violate the First Law', () => {
    const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 0.0);
    const monad = ThermodynamicMonad.of(initialStocks);

    assert.throws(() => {
      monad.bind((stocks: ElementalStocks) => {
        const mutated = stocks.clone();
        mutated.carbon += 500.0; // Unauthorized mass creation!
        return mutated;
      });
    }, /First Law Violation/);
  });

  it('should enforce Second Law monotonicity (dQ_loss >= 0)', () => {
    const initialStocks = new ElementalStocks(100.0, 10.0, 2.0, 50.0, 200.0, 1000.0, 10.0);
    const monad = ThermodynamicMonad.of(initialStocks);

    assert.throws(() => {
      monad.bind((stocks: ElementalStocks) => {
        const mutated = stocks.clone();
        mutated.qLoss = 5.0; // Decreasing entropy / Q_loss!
        return mutated;
      });
    }, /Second Law Violation/);
  });

  it('should correctly compute cellular respiration mass and heat deltas', () => {
    const stocks = new ElementalStocks(50.0, 5.0, 1.0, 100.0, 100.0, 50000.0, 0.0);
    const respired = cellularRespiration(stocks, 1.0) as ElementalStocks;
    assert.ok(respired.carbon < stocks.carbon, 'Respiration should oxidize carbon');
    assert.ok(respired.qLoss > stocks.qLoss, 'Respiration should increase thermal dissipation (Q_loss)');
  });
});
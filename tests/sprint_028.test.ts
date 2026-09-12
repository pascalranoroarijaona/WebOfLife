import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  ElementalStocks, 
  ThermodynamicLedger, 
  BiomePatch, 
  DetritivoreMonad, 
  ThermodynamicStateValidator 
} from '../src/thermodynamics/state_validator.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';

describe('Sprint 028: Spatial Equilibrium, Trophic Cascade & Thermodynamic Validation', () => {
  it('should correctly initialize and compute elemental stocks arithmetic', () => {
    const stock1 = new ElementalStocks(100, 50, 20, 500);
    const stock2 = new ElementalStocks(20, 10, 5, 100);

    assert.strictEqual(stock1.isNonNegative(), true);
    const sum = stock1.add(stock2);
    assert.strictEqual(sum.carbon, 120);
    assert.strictEqual(sum.nitrogen, 60);

    const diff = stock1.subtract(stock2);
    assert.strictEqual(diff.carbon, 80);
    assert.strictEqual(diff.nitrogen, 40);
  });

  it('should record thermodynamic dissipation and maintain non-negative entropy', () => {
    const ledger = new ThermodynamicLedger();
    assert.strictEqual(ledger.totalEntropy, 0.0);

    ledger.recordDissipation(2981.5, 298.15);
    assert.strictEqual(ledger.totalDissipatedHeat, 2981.5);
    assert.strictEqual(ledger.totalEntropy, 10.0);

    assert.throws(() => {
      ledger.recordDissipation(-100);
    }, /cannot be negative/);
  });

  it('should audit mass conservation precisely', () => {
    const ledger = new ThermodynamicLedger();
    const initialMass = new ElementalStocks(1000, 200, 50, 10000);
    const discrepancy1 = ledger.auditMassConservation(initialMass);
    assert.strictEqual(discrepancy1, 0.0);

    const modifiedMass = new ElementalStocks(1000, 200, 50, 10000);
    const discrepancy2 = ledger.auditMassConservation(modifiedMass);
    assert.strictEqual(discrepancy2, 0.0);

    const alteredMass = new ElementalStocks(1005, 200, 50, 10000);
    const discrepancy3 = ledger.auditMassConservation(alteredMass);
    assert.strictEqual(discrepancy3, 5.0);
  });

  it('should handle BiomePatch nutrient queries and consumption', () => {
    const initialPool = new ElementalStocks(500, 100, 50, 2000);
    const patch = new BiomePatch([34.0, -118.0], 1000.0, initialPool);

    const queried = patch.queryNutrients();
    assert.strictEqual(queried.carbon, 500);

    const demand = new ElementalStocks(100, 50, 10, 500);
    const fulfilled = patch.consumeNutrients(demand);
    assert.strictEqual(fulfilled.carbon, 100);
    assert.strictEqual(patch.nutrientPool.carbon, 400);
  });

  it('should execute detritivore scavenging with mass preservation and residue return', () => {
    const initialPool = new ElementalStocks(1000, 200, 100, 5000);
    const patch = new BiomePatch([0.0, 0.0], 5000.0, initialPool);
    const ledger = new ThermodynamicLedger();

    const carcass = new ElementalStocks(200, 40, 20, 800);
    const [assimilated, residue] = DetritivoreMonad.scavenge(carcass, patch, ledger);

    assert.strictEqual(assimilated.carbon, 200 * 0.15);
    assert.strictEqual(residue.carbon, 200 * 0.85);
    assert.strictEqual(ledger.totalDissipatedHeat, 200 * 10.5);
  });

  it('should validate thermodynamic state vectors with the state validator wrapper', () => {
    const validator = new ThermodynamicStateValidator();
    const earth = EarthPOD.getInstance();
    const vec = earth.getStateVector();

    assert.strictEqual(validator.validateStateVector(vec), true);
    assert.doesNotThrow(() => {
      validator.assertNonNegativeEntropy(vec);
    });

    const invalidVec = { ...vec, entropyGenerationRate: -5.0 };
    assert.strictEqual(validator.validateStateVector(invalidVec), false);
    assert.throws(() => {
      validator.assertNonNegativeEntropy(invalidVec);
    });
  });

  it('should successfully pass bootstrapMegaPod integration test', () => {
    const { sun, earth } = bootstrapMegaPod();
    assert.ok(sun);
    assert.ok(earth);
    const report = earth.globalEntropyReport();
    assert.ok(report);
  });
});
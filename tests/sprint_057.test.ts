import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 057: StateValidator & Thermodynamic Conservation Delta Calculator', () => {
  it('should correctly scale flux rates by simulation time step (dt)', () => {
    const validator = new StateValidator(1e-6);
    const initialVector = new ThermodynamicStateVector({
      stocks: { carbon_pool: 1000.0, water_pool: 50000.0 }
    });

    const fluxRates = new Map<string, number>([
      ['carbon_pool', 5.2],
      ['water_pool', -12.5]
    ]);

    const dt = 1.0;
    const expectedDeltas = validator.calculateExpectedDeltas(initialVector, fluxRates, dt);

    assert.strictEqual(expectedDeltas.get?.('carbon_pool'), 5.2);
    assert.strictEqual(expectedDeltas.get?.('water_pool'), -12.5);
  });

  it('should validate exact mass conservation (First Law conformity)', () => {
    const validator = new StateValidator(1e-6);
    const prevVector = new ThermodynamicStateVector({
      stocks: { carbon_pool: 1000.0, water_pool: 50000.0, solar_energy: 0.0 }
    });

    const currentVector = new ThermodynamicStateVector({
      stocks: { carbon_pool: 1005.2, water_pool: 49987.5, solar_energy: 342.0 }
    });

    const fluxRates = new Map<string, number>([
      ['carbon_pool', 5.2],
      ['water_pool', -12.5],
      ['solar_energy', 342.0]
    ]);

    const result = validator.validateConservation(prevVector, currentVector, fluxRates, 1.0);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.maxTolerance, 1e-6);
    const discMap = result.discrepancies instanceof Map ? result.discrepancies : new Map(Object.entries(result.discrepancies ?? {}));
    const carbonDisc: any = discMap.get('carbon_pool') ?? (result.discrepancies as any)?.['carbon_pool'];
    const waterDisc: any = discMap.get('water_pool') ?? (result.discrepancies as any)?.['water_pool'];
    const solarDisc: any = discMap.get('solar_energy') ?? (result.discrepancies as any)?.['solar_energy'];

    assert.strictEqual(carbonDisc?.error ?? 0, 0.0);
    assert.strictEqual(waterDisc?.error ?? 0, 0.0);
    assert.strictEqual(solarDisc?.error ?? 0, 0.0);
  });

  it('should identify mass conservation violations (First Law breaches)', () => {
    const validator = new StateValidator(1e-6);
    const prevVector = new ThermodynamicStateVector({
      stocks: { water_pool: 50000.0 }
    });

    // Actual change is -15.0 g, whereas expected flux rate is -12.5 g/s * 1.0s = -12.5 g
    const currentVector = new ThermodynamicStateVector({
      stocks: { water_pool: 49985.0 }
    });

    const fluxRates = new Map<string, number>([
      ['water_pool', -12.5]
    ]);

    const result = validator.validateConservation(prevVector, currentVector, fluxRates, 1.0);

    assert.strictEqual(result.isValid, false);
    const discMap = result.discrepancies instanceof Map ? result.discrepancies : new Map(Object.entries(result.discrepancies ?? {}));
    const disc: any = discMap.get('water_pool') ?? (result.discrepancies as any)?.['water_pool'];
    const diff = disc?.error ?? 0;
    assert.ok(diff > 1e-6);
    assert.strictEqual(diff, 2.5);
  });
});
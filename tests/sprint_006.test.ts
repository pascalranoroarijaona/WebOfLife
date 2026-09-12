import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarbonCycle } from '../src/cycles/carbon.js';
import { WaterCycle } from '../src/cycles/water.js';
import { NitrogenCycle } from '../src/cycles/nitrogen.js';
import { PhosphorusCycle } from '../src/cycles/phosphorus.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 006 - Biogeochemical CyclePOD Instances', () => {
  it('Carbon Cycle maintains strict mass conservation across 1,000 steps', () => {
    const carbon = new CarbonCycle();
    const initialStocks = new Map(carbon.getStocks());
    let initialTotal = 0;
    for (const val of initialStocks.values()) initialTotal += (val as number);

    for (let i = 0; i < 1000; i++) {
      carbon.step(1.0, 1.74e17);
    }

    let finalTotal = 0;
    for (const val of carbon.getStocks().values()) finalTotal += (val as number);
    assert.strictEqual(carbon.validateMassBalance(initialTotal), true);
    assert.ok(Math.abs(finalTotal - initialTotal) < 1e-10);
  });

  it('Water Cycle maintains strict mass conservation across 1,000 steps', () => {
    const water = new WaterCycle();
    let initialTotal = 0;
    for (const val of water.getStocks().values()) initialTotal += (val as number);

    for (let i = 0; i < 1000; i++) {
      water.step(1.0, 1.74e17);
    }

    let finalTotal = 0;
    for (const val of water.getStocks().values()) finalTotal += (val as number);
    assert.strictEqual(water.validateMassBalance(initialTotal), true);
    assert.ok(Math.abs(finalTotal - initialTotal) < 1e-10);
  });

  it('Nitrogen Cycle maintains strict mass conservation across 1,000 steps', () => {
    const nitrogen = new NitrogenCycle();
    let initialTotal = 0;
    for (const val of nitrogen.getStocks().values()) initialTotal += (val as number);

    for (let i = 0; i < 1000; i++) {
      nitrogen.step(1.0, 1.74e17);
    }

    let finalTotal = 0;
    for (const val of nitrogen.getStocks().values()) finalTotal += (val as number);
    assert.strictEqual(nitrogen.validateMassBalance(initialTotal), true);
    assert.ok(Math.abs(finalTotal - initialTotal) < 1e-10);
  });

  it('Phosphorus Cycle maintains strict mass conservation across 1,000 steps', () => {
    const phosphorus = new PhosphorusCycle();
    let initialTotal = 0;
    for (const val of phosphorus.getStocks().values()) initialTotal += (val as number);

    for (let i = 0; i < 1000; i++) {
      phosphorus.step(1.0, 1.74e17);
    }

    let finalTotal = 0;
    for (const val of phosphorus.getStocks().values()) finalTotal += (val as number);
    assert.strictEqual(phosphorus.validateMassBalance(initialTotal), true);
    assert.ok(Math.abs(finalTotal - initialTotal) < 1e-10);
  });

  it('EarthPOD orchestrates all four cycle instances successfully', () => {
    const earth = EarthPOD.getInstance();
    assert.doesNotThrow(() => {
      earth.step(1.0, earth.solarInputWatts);
    });
  });
});
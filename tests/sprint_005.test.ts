import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarbonCyclePOD } from '../src/cycles/carbon.js';
import { WaterCyclePOD } from '../src/cycles/water.js';
import { NitrogenCyclePOD } from '../src/cycles/nitrogen.js';
import { PhosphorusCyclePOD } from '../src/cycles/phosphorus.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('RFC 005 Biogeochemical CyclePOD Instances', () => {
  it('CarbonCyclePOD maintains strict mass conservation across steps', () => {
    const carbon = new CarbonCyclePOD();
    const initialStocks = carbon.getStocks();
    const initialValues = Array.from(initialStocks.values()) as number[];
    const initialSum = initialValues.reduce((a: number, b: number) => a + b, 0);

    for (let i = 0; i < 1000; i++) {
      carbon.step(1.0, 1.0);
    }

    const finalStocks = carbon.getStocks();
    const finalValues = Array.from(finalStocks.values()) as number[];
    const finalSum = finalValues.reduce((a: number, b: number) => a + b, 0);

    assert.strictEqual(
      Math.abs(finalSum - initialSum) < 1e-7,
      true,
      `Carbon mass conservation violated: diff = ${Math.abs(finalSum - initialSum)}`
    );
  });

  it('WaterCyclePOD maintains strict mass conservation across steps', () => {
    const water = new WaterCyclePOD();
    const initialValues = Array.from(water.getStocks().values()) as number[];
    const initialSum = initialValues.reduce((a: number, b: number) => a + b, 0);

    for (let i = 0; i < 1000; i++) {
      water.step(1.0, 1.0);
    }

    const finalValues = Array.from(water.getStocks().values()) as number[];
    const finalSum = finalValues.reduce((a: number, b: number) => a + b, 0);
    assert.strictEqual(Math.abs(finalSum - initialSum) < 1e-7, true);
  });

  it('NitrogenCyclePOD maintains strict mass conservation across steps', () => {
    const nitrogen = new NitrogenCyclePOD();
    const initialValues = Array.from(nitrogen.getStocks().values()) as number[];
    const initialSum = initialValues.reduce((a: number, b: number) => a + b, 0);

    for (let i = 0; i < 1000; i++) {
      nitrogen.step(1.0, 1.0);
    }

    const finalValues = Array.from(nitrogen.getStocks().values()) as number[];
    const finalSum = finalValues.reduce((a: number, b: number) => a + b, 0);
    assert.strictEqual(Math.abs(finalSum - initialSum) < 1e-7, true);
  });

  it('PhosphorusCyclePOD maintains strict mass conservation across steps', () => {
    const phosphorus = new PhosphorusCyclePOD();
    const initialValues = Array.from(phosphorus.getStocks().values()) as number[];
    const initialSum = initialValues.reduce((a: number, b: number) => a + b, 0);

    for (let i = 0; i < 1000; i++) {
      phosphorus.step(1.0, 1.0);
    }

    const finalValues = Array.from(phosphorus.getStocks().values()) as number[];
    const finalSum = finalValues.reduce((a: number, b: number) => a + b, 0);
    assert.strictEqual(Math.abs(finalSum - initialSum) < 1e-7, true);
  });

  it('EarthPOD integrates biogeochemical cycles globally', () => {
    const earth = EarthPOD.getInstance();
    assert.ok(earth);
    const tickResult = earth.fullTick(1);
    assert.ok(tickResult.earth);
    assert.ok(tickResult.cycles);
  });
});
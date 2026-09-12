import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CarbonCycle } from '../src/cycles/carbon.js';
import { WaterCycle } from '../src/cycles/water.js';
import { NitrogenCycle } from '../src/cycles/nitrogen.js';
import { PhosphorusCycle } from '../src/cycles/phosphorus.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 007: Biogeochemical CyclePOD Instances and Mass-Conservative Transfer Dynamics', () => {
  it('should maintain strict First Law mass conservation in Carbon Cycle over 10,000 steps', () => {
    const carbonCycle = new CarbonCycle();
    const initialMass = carbonCycle.calculateTotalMass();

    for (let i = 0; i < 10000; i++) {
      carbonCycle.step(1.0, 1.0);
    }

    assert.strictEqual(carbonCycle.validateConservation(1e-5), true);
    const finalMass = carbonCycle.calculateTotalMass();
    assert.strictEqual(Math.abs(finalMass - initialMass) <= 1e-5, true);
  });

  it('should maintain strict First Law mass conservation in Water Cycle over 10,000 steps', () => {
    const waterCycle = new WaterCycle();
    const initialMass = waterCycle.calculateTotalMass();

    for (let i = 0; i < 10000; i++) {
      waterCycle.step(1.0, 1.2);
    }

    assert.strictEqual(waterCycle.validateConservation(1e-5), true);
    const finalMass = waterCycle.calculateTotalMass();
    assert.strictEqual(Math.abs(finalMass - initialMass) <= 1e-5, true);
  });

  it('should maintain strict First Law mass conservation in Nitrogen Cycle over 10,000 steps', () => {
    const nitrogenCycle = new NitrogenCycle();
    const initialMass = nitrogenCycle.calculateTotalMass();

    for (let i = 0; i < 10000; i++) {
      nitrogenCycle.step(1.0, 1.0);
    }

    assert.strictEqual(nitrogenCycle.validateConservation(1e-5), true);
    const finalMass = nitrogenCycle.calculateTotalMass();
    assert.strictEqual(Math.abs(finalMass - initialMass) <= 1e-5, true);
  });

  it('should maintain strict First Law mass conservation in Phosphorus Cycle over 10,000 steps', () => {
    const phosphorusCycle = new PhosphorusCycle();
    const initialMass = phosphorusCycle.calculateTotalMass();

    for (let i = 0; i < 10000; i++) {
      phosphorusCycle.step(1.0, 1.0);
    }

    assert.strictEqual(phosphorusCycle.validateConservation(1e-5), true);
    const finalMass = phosphorusCycle.calculateTotalMass();
    assert.strictEqual(Math.abs(finalMass - initialMass) <= 1e-5, true);
  });

  it('should prevent negative reservoir bounds under high depletion or extreme solar input regimes', () => {
    const carbonCycle = new CarbonCycle({
      initialStocks: {
        atmosphere: 10,
        terrestrial_biosphere: 5,
        ocean_surface: 10,
        lithosphere: 100,
      }
    });

    // Run with massive solar input trying to drain atmosphere instantly
    for (let i = 0; i < 100; i++) {
      carbonCycle.step(100.0, 5.0);
    }

    assert.strictEqual(carbonCycle.getStock('atmosphere') >= 0, true);
    assert.strictEqual(carbonCycle.getStock('terrestrial_biosphere') >= 0, true);
    assert.strictEqual(carbonCycle.validateConservation(1e-5), true);
  });

  it('should execute planetary step integration correctly inside EarthPOD', () => {
    const earth = EarthPOD.getInstance();
    const initialCarbonMass = earth.carbonCycle.calculateTotalMass();

    earth.step(1.0, 1.0);

    assert.strictEqual(earth.carbonCycle.validateConservation(1e-5), true);
    assert.strictEqual(earth.waterCycle.validateConservation(1e-5), true);
    assert.strictEqual(earth.nitrogenCycle.validateConservation(1e-5), true);
    assert.strictEqual(earth.phosphorusCycle.validateConservation(1e-5), true);
  });
});
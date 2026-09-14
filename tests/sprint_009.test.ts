import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  THERMODYNAMIC_CONSTANTS,
  TemperatureNormalizationEngine
} from '../src/thermodynamics/constants.js';

describe('Sprint 009: Centralized Physical Constants & Temperature Normalization Engine', () => {
  const normalizer = new TemperatureNormalizationEngine();

  it('should verify fundamental thermodynamic constants', () => {
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN, 5.670374419e-8);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.SOLAR_CONSTANT_TOA, 1361.0);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN, 273.15);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.DEFAULT_ALBEDO, 0.3);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R, 8.314462618);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, 200.0);
    assert.strictEqual(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, 350.0);
  });

  it('should correctly convert Celsius and Kelvin with bounding/clamping', () => {
    // Standard conversion
    const k25 = normalizer.toKelvin(25, 'C');
    assert.strictEqual(k25, 298.15);
    assert.strictEqual(normalizer.toCelsius(298.15), 25);

    // Kelvin scale direct input
    const k300 = normalizer.toKelvin(300, 'K');
    assert.strictEqual(k300, 300);

    // Lower planetary bound clamping (200 K)
    const tooColdCelsius = normalizer.toCelsius(-100); // 173.15 K -> clamped to 200 K
    assert.strictEqual(tooColdCelsius, 200 - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN);
    const clampedLow = normalizer.toKelvin(100, 'K');
    assert.strictEqual(clampedLow, 200.0);

    // Upper planetary bound clamping (350 K)
    const clampedHigh = normalizer.toKelvin(400, 'K');
    assert.strictEqual(clampedHigh, 350.0);
  });

  it('should compute Arrhenius kinetics scalars accurately', () => {
    const tempK = 298.15; // 25°C
    const Ea = 60000; // 60 kJ/mol
    const scalar = normalizer.getArrheniusScalar(tempK, Ea);

    assert.ok(scalar > 0);
    assert.ok(scalar < 1);

    // Expected value validation: exp(-60000 / (8.314462618 * 298.15))
    const expected = Math.exp(-60000 / (8.314462618 * 298.15));
    assert.strictEqual(scalar, expected);
  });

  it('should calculate Stefan-Boltzmann Blackbody Radiation correctly', () => {
    const tempK = 300;
    const emissivity = 0.95;
    const radiation = normalizer.calculateBlackbodyRadiation(tempK, emissivity);

    const expected = emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(300, 4);
    assert.strictEqual(radiation, expected);
  });
});
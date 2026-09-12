import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateMonad, ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 009: Thermodynamic State Vector & Second Law Monad', () => {
  const baseVector: ThermodynamicStateVector = {
    timestamp: Date.now(),
    ambientTemperature: 288.15,
    systemTemperature: 288.15,
    internalEnergy: 1.5e24,
    totalEntropy: 5.0e21,
    entropy: 5.0e21,
    referenceTemperature: 288.15,
    entropyGenerationRate: 1.2e13,
    exergyDestructionRate: 255.0 * 1.2e13,
    boundaryFluxes: {
      heatFluxes: new Map(),
      radiativeNet: 0,
      massFluxes: new Map()
    },
    systemInternalEnergyJoules: 1.5e24,
    systemEntropyJoulesPerKelvin: 5.0e21,
    temperatureKelvin: 288.15,
    deadStateTemperatureKelvin: 255.0,
    solarInputWatts: 1.74e17,
    planetaryEmissionWatts: 1.74e17,
    thermalFluxes: [],
    massFluxes: [],
    entropyGenerationRateWattsPerKelvin: 1.2e13,
    exergyDestructionRateWatts: 255.0 * 1.2e13,
    exergyEfficiency: 0.65
  };

  it('should successfully initialize ThermodynamicStateMonad with valid state', () => {
    const monad = ThermodynamicStateMonad.initialize(baseVector);
    assert.deepStrictEqual(monad.extract(), baseVector);
  });

  it('should reject initialization if entropy generation rate is negative', () => {
    const invalidVector: ThermodynamicStateVector = {
      ...baseVector,
      entropyGenerationRate: -100,
      entropyGenerationRateWattsPerKelvin: -100
    };
    assert.throws(() => {
      ThermodynamicStateMonad.initialize(invalidVector);
    }, /Second Law Violation/);
  });

  it('should enforce Second Law ($\dot{S}_{\text{gen}} \ge 0$) across state transitions', () => {
    const monad = ThermodynamicStateMonad.initialize(baseVector);
    
    const validNext = monad.map((current) => {
      const t0 = current.deadStateTemperatureKelvin ?? 255.0;
      return {
        ...current,
        timestamp: (current.timestamp ?? 0) + 1000,
        entropyGenerationRate: 1.5e13,
        entropyGenerationRateWattsPerKelvin: 1.5e13,
        exergyDestructionRate: t0 * 1.5e13,
        exergyDestructionRateWatts: t0 * 1.5e13
      };
    });

    assert.strictEqual(validNext.extract().entropyGenerationRateWattsPerKelvin, 1.5e13);

    assert.throws(() => {
      monad.map((current) => ({
        ...current,
        entropyGenerationRate: -5.0,
        entropyGenerationRateWattsPerKelvin: -5.0,
        exergyDestructionRate: 0,
        exergyDestructionRateWatts: 0
      }));
    }, /Second Law Violation/);
  });

  it('should enforce Gouy-Stodola theorem consistency ($\dot{I} = T_0 \dot{S}_{\text{gen}}$)', () => {
    const monad = ThermodynamicStateMonad.initialize(baseVector);

    assert.throws(() => {
      monad.map((current) => ({
        ...current,
        entropyGenerationRate: 2.0e13,
        entropyGenerationRateWattsPerKelvin: 2.0e13,
        exergyDestructionRate: 999.0, // Incorrect inconsistent exergy destruction
        exergyDestructionRateWatts: 999.0
      }));
    }, /Exergy Destruction mismatch/);
  });
});
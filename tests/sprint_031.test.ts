import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/monad_process.js';
import { ThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';

describe('Sprint 031: Thermodynamic State Vector Validation & Monad Methods', () => {
  it('should validate a correct thermodynamic state vector successfully', () => {
    const validator = new StateValidator();
    const validState = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 5000,
      entropy: 5000,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 10.5,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.5,
      exergy: 1e5,
      temperature: 298.15,
      stocks: { carbon: 850, water: 1338000000 },
      dissipationRate: 10.5,
      solarInput: 0,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const result = validator.validateState(validState);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual((result.errors ?? []).length, 0);
  });

  it('should catch missing temperature or invalid stocks', () => {
    const validator = new StateValidator();
    const invalidState: any = {
      temperature: NaN,
      stocks: null,
      entropy: 100
    };

    const result = validator.validateState(invalidState);
    assert.strictEqual(result.isValid, false);
    const errs = result.errors ?? [];
    assert.ok(errs.some((e: any) => (typeof e === 'string' ? e : e.reason).includes('temperature') || (typeof e === 'string' ? e : e.reason).includes('Invalid')));
    assert.ok(errs.some((e: any) => (typeof e === 'string' ? e : e.reason).includes('stocks') || (typeof e === 'string' ? e : e.reason).includes('Missing')));
  });

  it('should enforce Second Law non-negative entropy and dissipation checks', () => {
    const validator = new StateValidator();
    const badEntropyState = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: -10,
      entropy: -10,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 300,
      stocks: { carbon: 100 },
      dissipationRate: -5,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const result = validator.validateState(badEntropyState);
    assert.strictEqual(result.isValid, false);
    const errs = result.errors ?? [];
    assert.ok(errs.some((e: any) => (typeof e === 'string' ? e : e.reason).includes('Entropy must be non-negative')));
    assert.ok(errs.some((e: any) => (typeof e === 'string' ? e : e.reason).includes('Dissipation rate cannot be negative')));
  });

  it('should enforce First Law conservation across valid stock transitions', () => {
    const validator = new StateValidator();
    const prior = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 1000,
      entropy: 1000,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298,
      stocks: { carbon: 100, nitrogen: 50 },
      solarInput: 10,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const next = new ThermodynamicStateVector({
      timestamp: 1,
      internalEnergy: 1e6,
      totalEntropy: 1010,
      entropy: 1010,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298.5,
      stocks: { carbon: 105, nitrogen: 55 },
      solarInput: 10,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const result = validator.validateTransition(prior, next);
    assert.strictEqual(result.isValid, true);
  });

  it('should reject First Law violations when stock delta does not match solar input', () => {
    const validator = new StateValidator(1e-5);
    const prior = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 1000,
      entropy: 1000,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298,
      stocks: { carbon: 100 },
      solarInput: 5,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const next = new ThermodynamicStateVector({
      timestamp: 1,
      internalEnergy: 1e6,
      totalEntropy: 1000,
      entropy: 1000,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298,
      stocks: { carbon: 200 }, // delta = 100, solar = 5 -> violation
      solarInput: 5,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const result = validator.validateTransition(prior, next);
    assert.strictEqual(result.isValid, false);
    const errs = result.errors ?? [];
    assert.ok(errs.some((e: any) => (typeof e === 'string' ? e : e.reason).includes('First Law Violation')));
  });

  it('should successfully execute ThermodynamicMonadProcess steps on compliant states', () => {
    const monadProcess = new ThermodynamicMonadProcess();
    const initialState = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 500,
      entropy: 500,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298,
      stocks: { biomass: 50 },
      solarInput: 5,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const transitionFn = (s: ThermodynamicStateVector): ThermodynamicStateVector => {
      const stocksRecord = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
      const biomassVal = Number((stocksRecord as any)?.biomass ?? 0);
      const currentEntropy = s.entropy ?? 0;
      return new ThermodynamicStateVector({
        ...s.toObject(),
        stocks: { ...stocksRecord, biomass: biomassVal + 5 },
        entropy: currentEntropy + 2,
        totalEntropy: currentEntropy + 2
      });
    };

    const finalState = monadProcess.step(initialState, transitionFn);
    const finalStocks = finalState.stocks instanceof Map ? Object.fromEntries(finalState.stocks) : finalState.stocks;
    assert.strictEqual((finalStocks as any).biomass, 55);
  });

  it('should throw an error in ThermodynamicMonadProcess when transition violates thermodynamic laws', () => {
    const monadProcess = new ThermodynamicMonadProcess();
    const initialState = new ThermodynamicStateVector({
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 500,
      entropy: 500,
      systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K,
      exergy: 1e5,
      temperature: 298,
      stocks: { biomass: 50 },
      solarInput: 0,
      boundaryFluxes: { solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    });

    const badTransitionFn = (s: ThermodynamicStateVector): ThermodynamicStateVector => {
      const stocksRecord = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
      const biomassVal = Number((stocksRecord as any)?.biomass ?? 0);
      return new ThermodynamicStateVector({
        ...s.toObject(),
        stocks: { ...stocksRecord, biomass: biomassVal + 1000 } // Violation
      });
    };

    assert.throws(() => {
      monadProcess.step(initialState, badTransitionFn);
    }, /Monad step aborted due to thermodynamic transition violation/);
  });
});
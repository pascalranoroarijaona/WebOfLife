import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  IThermodynamicStateVector, 
  STANDARD_AMBIENT_TEMPERATURE_K, 
  ThermodynamicMonad, 
  ThermalStock, 
  BiogeochemicalStock 
} from '../src/thermodynamics/types.js';
import { applyThermalFlux, applyMassTransport } from '../src/thermodynamics/thermodynamic_structure.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 012: Thermodynamic State Vector & Monadic Invariants', () => {
  it('should enforce second law non-negative entropy generation', () => {
    const initialVector: IThermodynamicStateVector = {
      internalEnergy: 1e6,
      entropy: 1e4,
      referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 10.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
      boundaryFluxes: {
        heatFluxes: new Map(),
        radiativeNet: 100,
        massFluxes: new Map()
      }
    };

    const stock: ThermalStock = { temperature: 288.15, thermalEnergy: 1e6 };
    const monad = ThermodynamicMonad.unit(stock, initialVector);

    const nextMonad = monad.bind((s, v) => applyThermalFlux(s, v, 500, 300, 1.0));
    const extracted = nextMonad.extract();

    assert.strictEqual(extracted.state.entropyGenerationRate >= 0, true, 'Entropy generation rate must be >= 0');
    assert.strictEqual(extracted.state.exergyDestructionRate, STANDARD_AMBIENT_TEMPERATURE_K * extracted.state.entropyGenerationRate);
  });

  it('should throw an error if entropy generation is negative', () => {
    const invalidVector: IThermodynamicStateVector = {
      internalEnergy: 1e6,
      entropy: 1e4,
      referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: -5.0, // Invalid
      exergyDestructionRate: -5.0 * STANDARD_AMBIENT_TEMPERATURE_K,
      boundaryFluxes: {
        heatFluxes: new Map(),
        radiativeNet: 0,
        massFluxes: new Map()
      }
    };

    const stock: ThermalStock = { temperature: 288.15, thermalEnergy: 1e6 };
    const monad = ThermodynamicMonad.unit(stock, invalidVector);

    assert.throws(() => {
      monad.bind((s, v) => [s, v]);
    }, /Second Law Violation/);
  });

  it('should correctly process mass transport thermodynamics', () => {
    const initialVector: IThermodynamicStateVector = {
      internalEnergy: 1e6,
      entropy: 1e4,
      referenceTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 5.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 5.0,
      boundaryFluxes: {
        heatFluxes: new Map(),
        radiativeNet: 0,
        massFluxes: new Map()
      }
    };

    const bioStock: BiogeochemicalStock = { totalMass: 5000 };
    const massFluxes = new Map<string, number>([['water_inflow', 10.0]]);

    const [updatedStock, updatedState] = applyMassTransport(
      bioStock,
      initialVector,
      massFluxes,
      4200.0,
      1.2,
      1.0
    );

    assert.strictEqual(updatedStock.totalMass, 5010.0);
    assert.strictEqual(updatedState.entropyGenerationRate >= 0, true);
  });

  it('should verify EarthPOD second law compliance', () => {
    const earth = EarthPOD.getInstance();
    const isValid = earth.verifySecondLaw();
    assert.strictEqual(isValid, true, 'EarthPOD must satisfy the Second Law of Thermodynamics');
  });
});
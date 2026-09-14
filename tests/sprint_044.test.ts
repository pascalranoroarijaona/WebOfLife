import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  STP_CONSTANTS,
  computeAugustRocheMagnusSatVaporPressure,
} from '../src/thermodynamics/constants.js';
import {
  isValidH3Index,
  getH3Resolution,
  getH3CellAreaM2,
  createDefaultH3CellThermodynamicState,
  computeAtmosphericInternalEnergy,
  computeReferenceEntropy,
  SpatialMonad,
  DefaultH3CellState,
} from '../src/spatial/h3_state_tensor.js';

describe('Sprint 044: Baseline STP H3 Cell Thermodynamic State Tensor', () => {
  const sampleRes8Cell = '882685623ffffff';
  const sampleRes0Cell = '80283ffffffffff';
  const sampleRes7Cell = '872830828ffffff';
  const sampleRes9Cell = '8928308280fffff';

  it('validates H3 hexadecimal indices and resolution parsing', () => {
    assert.strictEqual(isValidH3Index(sampleRes8Cell), true);
    assert.strictEqual(isValidH3Index(sampleRes0Cell), true);
    assert.strictEqual(isValidH3Index(sampleRes7Cell), true);
    assert.strictEqual(isValidH3Index(sampleRes9Cell), true);
    assert.strictEqual(isValidH3Index('invalid_hex'), false);
    assert.strictEqual(isValidH3Index('123'), false);

    assert.strictEqual(getH3Resolution(sampleRes0Cell), 0);
    assert.strictEqual(getH3Resolution(sampleRes7Cell), 7);
    assert.strictEqual(getH3Resolution(sampleRes8Cell), 8);
    assert.strictEqual(getH3Resolution(sampleRes9Cell), 9);

    assert.throws(() => getH3Resolution('not-an-h3-index'), TypeError);
  });

  it('computes area scaling across DGGS resolution levels', () => {
    const areaRes0 = getH3CellAreaM2(sampleRes0Cell);
    assert.strictEqual(areaRes0, STP_CONSTANTS.H3_BASE_AREA_RES_0);

    const areaRes7 = getH3CellAreaM2(sampleRes7Cell);
    const expectedRes7 = STP_CONSTANTS.H3_BASE_AREA_RES_0 * Math.pow(7, -7);
    assert.ok(Math.abs(areaRes7 - expectedRes7) < 1e-3);

    const areaRes8 = getH3CellAreaM2(sampleRes8Cell);
    const expectedRes8 = STP_CONSTANTS.H3_BASE_AREA_RES_0 * Math.pow(7, -8);
    assert.ok(Math.abs(areaRes8 - expectedRes8) < 1e-3);
  });

  it('verifies August-Roche-Magnus water vapor saturation at STP baseline', () => {
    const satPressure = computeAugustRocheMagnusSatVaporPressure(STP_CONSTANTS.T_STANDARD);
    // At 288.15 K (15 C), saturation vapor pressure is ~1705.62 Pa
    assert.ok(Math.abs(satPressure - 1705.62) < 0.5);

    const baselinePartialH2O = satPressure * STP_CONSTANTS.BASELINE_RELATIVE_HUMIDITY;
    assert.ok(Math.abs(baselinePartialH2O - 1023.37) < 0.5);
  });

  it('creates default baseline STP state satisfying First Law mass conservation', () => {
    const state = createDefaultH3CellThermodynamicState(sampleRes8Cell);

    assert.strictEqual(state.h3Index, sampleRes8Cell);
    assert.strictEqual(state.resolution, 8);
    assert.strictEqual(state.temperatureKelvin, 288.15);
    assert.strictEqual(state.atmosphere.surfacePressurePa, 101325.0);

    // Conservation check: Column atmospheric mass = P0 * Area / g0
    const expectedAtmMassKg = state.areaM2 * (STP_CONSTANTS.P_STANDARD / STP_CONSTANTS.STANDARD_GRAVITY);
    const reconstructedAtmMassKg =
      state.atmosphere.nitrogenMoles * STP_CONSTANTS.MOLAR_MASS_N2 +
      state.atmosphere.oxygenMoles * STP_CONSTANTS.MOLAR_MASS_O2 +
      state.atmosphere.co2Moles * STP_CONSTANTS.MOLAR_MASS_CO2 +
      state.atmosphere.waterVaporMoles * STP_CONSTANTS.MOLAR_MASS_H2O;

    const relativeError = Math.abs(reconstructedAtmMassKg - expectedAtmMassKg) / expectedAtmMassKg;
    // Must be conserved within small relative error (allowing for trace gases fraction)
    assert.ok(relativeError < 0.015, `Column atmospheric mass deviation: ${relativeError}`);
  });

  it('verifies surface stock density baselines proportional to area', () => {
    const state = createDefaultH3CellThermodynamicState(sampleRes8Cell);
    const area = state.areaM2;

    // Hydrosphere: 50 kg/m2
    assert.strictEqual(state.hydrosphere.liquidWaterKg, area * 50.0);
    assert.strictEqual(state.hydrosphere.iceKg, 0.0);
    assert.strictEqual(state.hydrosphere.salinityPsu, 0.0);

    // Lithosphere: SOC 12 kg/m2, Mineral 1288 kg/m2, Soil moisture 200 kg/m2
    assert.strictEqual(state.lithosphere.soilOrganicCarbonKg, area * 12.0);
    assert.strictEqual(state.lithosphere.inorganicMineralKg, area * 1288.0);
    assert.strictEqual(state.lithosphere.soilMoistureKg, area * 200.0);

    // Biosphere: autotroph 2.50 kg/m2, heterotroph 0.015 kg/m2, detritus 0.75 kg/m2
    assert.strictEqual(state.biosphere.autotrophBiomassKg, area * 2.50);
    assert.strictEqual(state.biosphere.heterotrophBiomassKg, area * 0.015);
    assert.strictEqual(state.biosphere.detritusKg, area * 0.75);
  });

  it('ensures internal energy and entropy are strictly positive at STP baseline', () => {
    const state = createDefaultH3CellThermodynamicState(sampleRes8Cell);

    assert.ok(state.internalEnergyJoules > 0, 'Internal energy must be strictly positive');
    assert.ok(state.entropyJoulesPerKelvin > 0, 'Reference entropy must be strictly positive');
    assert.ok(Number.isFinite(state.internalEnergyJoules));
    assert.ok(Number.isFinite(state.entropyJoulesPerKelvin));
  });

  it('enforces deep immutability across state tensor and child stocks', () => {
    const state = createDefaultH3CellThermodynamicState(sampleRes8Cell);

    assert.strictEqual(Object.isFrozen(state), true);
    assert.strictEqual(Object.isFrozen(state.atmosphere), true);
    assert.strictEqual(Object.isFrozen(state.hydrosphere), true);
    assert.strictEqual(Object.isFrozen(state.lithosphere), true);
    assert.strictEqual(Object.isFrozen(state.biosphere), true);

    // Mutation attempts in strict mode must throw
    assert.throws(() => {
      // @ts-expect-error mutating readonly property
      state.temperatureKelvin = 300.0;
    }, TypeError);

    assert.throws(() => {
      // @ts-expect-error mutating readonly property
      state.atmosphere.surfacePressurePa = 90000;
    }, TypeError);
  });

  it('correctly applies partial overrides while maintaining consistency', () => {
    const customTemp = 305.15; // 32 deg C
    const customSalinity = 35.0; // Oceanic cell
    const state = createDefaultH3CellThermodynamicState(sampleRes8Cell, {
      temperatureKelvin: customTemp,
      hydrosphere: { salinityPsu: customSalinity },
    });

    assert.strictEqual(state.temperatureKelvin, 305.15);
    assert.strictEqual(state.hydrosphere.salinityPsu, 35.0);
    // Preserves baseline liquid water stock
    assert.strictEqual(state.hydrosphere.liquidWaterKg, state.areaM2 * 50.0);
  });

  it('rejects unphysical inputs with strict runtime guard assertions', () => {
    assert.throws(() => {
      createDefaultH3CellThermodynamicState(sampleRes8Cell, {
        temperatureKelvin: -10,
      });
    }, RangeError);

    assert.throws(() => {
      createDefaultH3CellThermodynamicState(sampleRes8Cell, {
        temperatureKelvin: 0,
      });
    }, RangeError);

    assert.throws(() => {
      createDefaultH3CellThermodynamicState(sampleRes8Cell, {
        hydrosphere: { liquidWaterKg: -500 },
      });
    }, RangeError);

    assert.throws(() => {
      createDefaultH3CellThermodynamicState('invalid_h3');
    }, TypeError);
  });

  it('integrates seamlessly with SpatialMonad functor and bind operations', () => {
    const initialCell = createDefaultH3CellThermodynamicState(sampleRes8Cell);
    const monad = SpatialMonad.of(initialCell);

    // Functor map: extract internal energy density
    const energyDensityMonad = monad.map((s) => s.internalEnergyJoules / s.areaM2);
    assert.ok(energyDensityMonad.value > 0);

    // Monad flatMap: adiabatic temperature perturbation
    const perturbedMonad = monad.flatMap((s: DefaultH3CellState) => {
      const updatedState = createDefaultH3CellThermodynamicState(s.h3Index, {
        temperatureKelvin: s.temperatureKelvin + 5.0,
      });
      return SpatialMonad.of(updatedState);
    });

    assert.strictEqual(perturbedMonad.value.temperatureKelvin, 293.15);
    assert.ok(perturbedMonad.value.internalEnergyJoules > initialCell.internalEnergyJoules);
  });
});
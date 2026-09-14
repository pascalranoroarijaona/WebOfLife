// =============================================================================
// WEB OF LIFE - SPRINT 042 TEST SUITE
// H3CellThermodynamicState Interface & Spatial Thermodynamic Tensor
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  H3CellThermodynamicRecord,
  H3StateTensorContainer,
  evaluateRadiativeStep,
  evaluatePhaseTransitions,
  stepThermodynamicCell,
  computeStefanBoltzmannLongwave,
  computeCompositeHeatCapacity,
  computeInternalEnergy
} from '../src/spatial/h3_state_tensor.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';
import { STEFAN_BOLTZMANN_CONSTANT } from '../src/thermodynamics/constants.js';

describe('Sprint 042 - H3 Spatial Thermodynamic State Tensor', () => {
  const sampleCellId = '8828308281fffff';
  const areaM2 = 1.0e6;
  const elevationM = 150.0;
  const heatCapacityJK = 1.0e9;
  const initialTempK = 288.15;
  const initialEnergyJ = heatCapacityJK * initialTempK;

  const validRecord = new H3CellThermodynamicRecord(
    sampleCellId,
    areaM2,
    elevationM,
    initialEnergyJ,
    initialTempK,
    heatCapacityJK,
    0.3, // albedo
    0.98, // emissivity
    342.0, // shortwaveInWm2
    102.6, // shortwaveOutWm2 (0.3 * 342)
    380.0, // longwaveOutWm2
    15.0, // sensibleHeatFluxWm2
    80.0, // latentHeatFluxWm2
    1.2e8, // entropyJPerK
    0.05, // entropyProductionRateJKs
    1.0e7, // dryAirMassKg
    2.5e5, // totalWaterMassKg
    2.0e5, // liquidWaterMassKg
    0.0, // iceMassKg
    5.0e4, // vaporMassKg
    1.0e4, // carbonMassKg
    5.0e3, // nitrogenMassKg
    1.0e2 // phosphorusMassKg
  );

  it('instantiates valid H3CellThermodynamicRecord and enforces immutability', () => {
    assert.strictEqual(validRecord.h3Index, sampleCellId);
    assert.strictEqual(validRecord.temperatureK, initialTempK);
    assert.strictEqual(validRecord.areaM2, areaM2);
    assert.strictEqual(validRecord.totalWaterMassKg, 2.5e5);
    assert.strictEqual(validRecord.liquidWaterMassKg + validRecord.iceMassKg + validRecord.vaporMassKg, 2.5e5);

    const updated = validRecord.withUpdates({ temperatureK: 290.0 });
    assert.strictEqual(updated.temperatureK, 290.0);
    assert.strictEqual(validRecord.temperatureK, initialTempK);
    assert.notStrictEqual(validRecord, updated);
  });

  it('rejects unphysical temperatures <= 0 K', () => {
    assert.throws(
      () => validRecord.withUpdates({ temperatureK: 0.0 }),
      /temperature must be strictly > 0 K/
    );
    assert.throws(
      () => validRecord.withUpdates({ temperatureK: -15.0 }),
      /temperature must be strictly > 0 K/
    );
  });

  it('rejects negative elemental mass stocks', () => {
    assert.throws(
      () => validRecord.withUpdates({ dryAirMassKg: -1.0 }),
      /mass stocks must be non-negative/
    );
    assert.throws(
      () => validRecord.withUpdates({ carbonMassKg: -0.5 }),
      /mass stocks must be non-negative/
    );
    assert.throws(
      () => validRecord.withUpdates({ liquidWaterMassKg: -10.0 }),
      /mass stocks must be non-negative/
    );
  });

  it('rejects water mass partition non-closure', () => {
    assert.throws(
      () =>
        new H3CellThermodynamicRecord(
          sampleCellId,
          areaM2,
          elevationM,
          initialEnergyJ,
          initialTempK,
          heatCapacityJK,
          0.3,
          0.98,
          342.0,
          102.6,
          380.0,
          15.0,
          80.0,
          1.2e8,
          0.05,
          1.0e7,
          3.0e5, // Mismatched total: 3.0e5 != 2.0e5 + 0.0 + 5.0e4 (2.5e5)
          2.0e5,
          0.0,
          5.0e4,
          1.0e4,
          5.0e3,
          1.0e2
        ),
      /water mass closure failure/
    );
  });

  it('rejects albedo and emissivity outside valid physical interval [0, 1]', () => {
    assert.throws(
      () => validRecord.withUpdates({ albedo: 1.05 }),
      /albedo must be in \[0.0, 1.0\]/
    );
    assert.throws(
      () => validRecord.withUpdates({ albedo: -0.01 }),
      /albedo must be in \[0.0, 1.0\]/
    );
    assert.throws(
      () => validRecord.withUpdates({ emissivity: 1.2 }),
      /emissivity must be in \[0.0, 1.0\]/
    );
    assert.throws(
      () => validRecord.withUpdates({ emissivity: -0.1 }),
      /emissivity must be in \[0.0, 1.0\]/
    );
  });

  it('verifies First Law mass summation and flux computations', () => {
    const expectedMass =
      validRecord.dryAirMassKg +
      validRecord.totalWaterMassKg +
      validRecord.carbonMassKg +
      validRecord.nitrogenMassKg +
      validRecord.phosphorusMassKg;
    assert.strictEqual(validRecord.totalMassKg, expectedMass);

    const netRad = validRecord.netRadiativeFluxWm2;
    assert.strictEqual(netRad, 342.0 - 102.6 - 380.0);

    const netEnergy = validRecord.netEnergyFluxWm2;
    assert.strictEqual(netEnergy, netRad - 15.0 - 80.0);
  });

  it('operates H3StateTensorContainer and aggregates conserved quantities', () => {
    const container = new H3StateTensorContainer();
    assert.strictEqual(container.size, 0);

    container.set(validRecord);
    assert.strictEqual(container.size, 1);
    assert.strictEqual(container.has(sampleCellId), true);
    assert.strictEqual(container.get(sampleCellId), validRecord);

    const secondCellId = '8828308283fffff';
    const cell2 = validRecord.withUpdates({
      h3Index: secondCellId,
      internalEnergyJ: validRecord.internalEnergyJ * 2,
      dryAirMassKg: 2.0e7
    });
    container.set(cell2);

    assert.strictEqual(container.size, 2);
    assert.strictEqual(
      container.computeTotalInternalEnergyJ(),
      validRecord.internalEnergyJ + cell2.internalEnergyJ
    );
    assert.strictEqual(
      container.computeTotalMassKg(),
      validRecord.totalMassKg + cell2.totalMassKg
    );
    assert.strictEqual(
      container.computeTotalEntropyJPerK(),
      validRecord.entropyJPerK + cell2.entropyJPerK
    );
  });

  it('calculates Stefan-Boltzmann longwave emission accurately', () => {
    const tempK = 300.0;
    const emissivity = 0.95;
    const expectedEmission = emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(tempK, 4);
    const calculated = computeStefanBoltzmannLongwave(tempK, emissivity);

    assert.ok(Math.abs(calculated - expectedEmission) < 1e-9);
  });

  it('evaluates pure radiative step with positive Second Law entropy production', () => {
    const dt = 3600; // 1 hour
    const stepped = evaluateRadiativeStep(validRecord, dt);

    assert.ok(stepped.temperatureK > 0);
    assert.ok(stepped.entropyProductionRateJKs >= 0);
    assert.ok(stepped.longwaveOutWm2 > 0);
  });

  it('evaluates water phase transition freezing and melting equilibrium', () => {
    const freezingCell = validRecord.withUpdates({
      temperatureK: 260.0, // Below freezing
      liquidWaterMassKg: 1000.0,
      iceMassKg: 0.0,
      vaporMassKg: 5.0e4,
      totalWaterMassKg: 51000.0
    });

    const frozen = evaluatePhaseTransitions(freezingCell, 60);
    assert.ok(frozen.iceMassKg > 0);
    assert.ok(frozen.liquidWaterMassKg < 1000.0);
    assert.strictEqual(frozen.totalWaterMassKg, 51000.0);
    assert.ok(
      Math.abs(frozen.totalWaterMassKg - (frozen.liquidWaterMassKg + frozen.iceMassKg + frozen.vaporMassKg)) < 1e-6
    );

    const meltingCell = frozen.withUpdates({
      temperatureK: 285.0 // Above freezing
    });
    const melted = evaluatePhaseTransitions(meltingCell, 60);
    assert.ok(melted.liquidWaterMassKg > frozen.liquidWaterMassKg);
    assert.strictEqual(melted.totalWaterMassKg, 51000.0);
  });

  it('chains transitions cleanly within SpatialMonad', () => {
    const dt = 100;
    const monad = SpatialMonad.of<H3CellThermodynamicRecord>(validRecord)
      .map((s: H3CellThermodynamicRecord) => evaluateRadiativeStep(s, dt))
      .bind((s: H3CellThermodynamicRecord) => SpatialMonad.of(evaluatePhaseTransitions(s, dt)));

    const result = monad.unwrap();
    assert.ok(result instanceof H3CellThermodynamicRecord);
    assert.ok(result.temperatureK > 0);
    assert.ok(result.totalMassKg > 0);
  });

  it('executes stepThermodynamicCell with inter-cell boundary advection', () => {
    const boundary = {
      energyFluxInWatts: 5.0e6,
      waterFluxInKgPerS: 2.0,
      dryAirFluxInKgPerS: 10.0,
      carbonFluxInKgPerS: 0.1,
      nitrogenFluxInKgPerS: 0.05,
      phosphorusFluxInKgPerS: 0.01
    };
    const dt = 10;
    const stepped = stepThermodynamicCell(validRecord, dt, boundary);

    assert.ok(stepped.internalEnergyJ > 0);
    assert.strictEqual(
      stepped.dryAirMassKg,
      validRecord.dryAirMassKg + boundary.dryAirFluxInKgPerS * dt
    );
    assert.ok(stepped.liquidWaterMassKg >= validRecord.liquidWaterMassKg);
  });

  it('verifies helper functions: heat capacity and internal energy derivations', () => {
    const cComposite = computeCompositeHeatCapacity(
      1.0e7,
      2.0e5,
      0.0,
      5.0e4,
      areaM2
    );
    assert.ok(cComposite > 0);

    const uDerived = computeInternalEnergy(cComposite, initialTempK, 2.0e5, 5.0e4);
    assert.ok(uDerived > 0);
  });
});
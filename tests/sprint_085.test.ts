/**
 * Test Suite for Sprint 085: H3 Aperture Digit Extraction & Thermodynamic Flux Monads
 * Uses Node.js built-in test runner (node:test) and strict assertions (node:assert).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  extractH3IndexApertureDigits,
  H3SpatialIndexCodec,
  H3AdjacencyCoordinator,
} from '../src/spatial/h3_adjacency.js';
import {
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3PaddingError,
  BiophysicalStockVector,
} from '../src/spatial/h3_types.js';
import { SpatialFluxMonad } from '../src/spatial/spatial_flux_monad.js';
import { H3GridUtils } from '../src/spatial/h3_grid.js';

describe('Sprint 085: extractH3IndexApertureDigits & H3 Adjacency', () => {
  it('should correctly parse a Resolution 0 base cell index', () => {
    // Mode 1, Res 0, Base Cell 4, all 15 digits = 7
    const index = H3SpatialIndexCodec.encodeIndex(1, 0, 4, []);
    const decomp = extractH3IndexApertureDigits(index, {
      validateMode: true,
      validateBaseCell: true,
      validatePaddingDigits: true,
    });

    assert.strictEqual(decomp.resolution, 0);
    assert.strictEqual(decomp.baseCell, 4);
    assert.strictEqual(decomp.mode, 1);
    assert.strictEqual(decomp.activeDigits.length, 0);
    assert.strictEqual(decomp.allDigits.length, 15);
    assert.ok(decomp.allDigits.every((d: number) => d === 7));
    assert.strictEqual(decomp.isValid, true);
  });

  it('should correctly parse intermediate resolution cells (Resolution 7)', () => {
    const digits = [1, 2, 0, 4, 6, 3, 5] as const;
    const index = H3SpatialIndexCodec.encodeIndex(1, 7, 42, digits);
    const hex = H3SpatialIndexCodec.toHexString(index);

    const decomp = extractH3IndexApertureDigits(hex, {
      validateMode: true,
      validateBaseCell: true,
      validatePaddingDigits: true,
    });

    assert.strictEqual(decomp.resolution, 7);
    assert.strictEqual(decomp.baseCell, 42);
    assert.deepStrictEqual(decomp.activeDigits, [1, 2, 0, 4, 6, 3, 5]);
    assert.strictEqual(decomp.allDigits.length, 15);

    // First 7 digits match activeDigits, remaining 8 digits must be 7
    assert.deepStrictEqual(decomp.allDigits.slice(0, 7), [1, 2, 0, 4, 6, 3, 5]);
    assert.ok(decomp.allDigits.slice(7).every((d: number) => d === 7));
    assert.strictEqual(decomp.isValid, true);
  });

  it('should correctly parse maximum resolution 15 index digits', () => {
    const fullDigits = [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0] as const;
    const index = H3SpatialIndexCodec.encodeIndex(1, 15, 12, fullDigits);
    const decomp = extractH3IndexApertureDigits(index, {
      validateMode: true,
      validateBaseCell: true,
      validatePaddingDigits: true,
    });

    assert.strictEqual(decomp.resolution, 15);
    assert.strictEqual(decomp.baseCell, 12);
    assert.strictEqual(decomp.activeDigits.length, 15);
    assert.deepStrictEqual(decomp.activeDigits, fullDigits);
    assert.ok(decomp.allDigits.every((d: number) => d <= 6));
    assert.strictEqual(decomp.isValid, true);
  });

  it('should accept uppercase and lowercase hex strings with or without 0x prefix', () => {
    const index = H3SpatialIndexCodec.encodeIndex(1, 4, 15, [2, 3, 4, 5]);
    const hex = H3SpatialIndexCodec.toHexString(index);

    const fromPlain = extractH3IndexApertureDigits(hex);
    const fromPrefix = extractH3IndexApertureDigits('0x' + hex.toUpperCase());

    assert.strictEqual(fromPlain.index, fromPrefix.index);
    assert.strictEqual(fromPlain.resolution, 4);
    assert.strictEqual(fromPlain.baseCell, 15);
    assert.deepStrictEqual(fromPlain.activeDigits, [2, 3, 4, 5]);
  });

  it('should throw InvalidH3ModeError if mode is invalid and validateMode is true', () => {
    // Mode 2 instead of 1
    const invalidModeIndex = H3SpatialIndexCodec.encodeIndex(2, 5, 10, [1, 2, 3, 4, 5]);
    assert.throws(
      () => {
        extractH3IndexApertureDigits(invalidModeIndex, { validateMode: true });
      },
      InvalidH3ModeError
    );
  });

  it('should throw InvalidH3BaseCellError if base cell is > 121 and validation is true', () => {
    const invalidBaseCellIndex = H3SpatialIndexCodec.encodeIndex(1, 3, 125, [0, 1, 2]);
    assert.throws(
      () => {
        extractH3IndexApertureDigits(invalidBaseCellIndex, { validateBaseCell: true });
      },
      InvalidH3BaseCellError
    );
  });

  it('should throw InvalidH3PaddingError if padding digits are corrupted', () => {
    // Manually corrupt bit 0 (digit 15) to 0 instead of 7 for a Res 3 cell
    const valid = H3SpatialIndexCodec.encodeIndex(1, 3, 20, [1, 2, 3]);
    const corrupted = valid & ~(0x07n); // Set digit 15 to 0

    assert.throws(
      () => {
        extractH3IndexApertureDigits(corrupted, { validatePaddingDigits: true });
      },
      InvalidH3PaddingError
    );
  });
});

describe('Sprint 085: H3AdjacencyCoordinator & Vectors', () => {
  const coordinator = new H3AdjacencyCoordinator();

  it('should compute zero displacement vector for central aperture digit 0', () => {
    const [ux, uy] = coordinator.computeDirectionalVector(0, 3);
    assert.strictEqual(ux, 0.0);
    assert.strictEqual(uy, 0.0);
  });

  it('should compute unit vectors for peripheral aperture digits 1 through 6', () => {
    for (let d = 1; d <= 6; d++) {
      const [ux, uy] = coordinator.computeDirectionalVector(d as any, 2);
      const magnitude = Math.sqrt(ux * ux + uy * uy);
      assert.ok(Math.abs(magnitude - 1.0) < 1e-10, `Magnitude of digit ${d} vector must be 1.0`);
    }
  });

  it('should generate adjacent aperture neighbor indices', () => {
    const index = H3SpatialIndexCodec.encodeIndex(1, 3, 10, [1, 2, 3]);
    const neighbors = coordinator.getApertureNeighbors(index);
    assert.strictEqual(neighbors.length, 5); // 6 peripheral digits minus current digit 3
  });
});

describe('Sprint 085: SpatialFluxMonad & Thermodynamic Invariants', () => {
  const sampleStocks: BiophysicalStockVector = {
    carbonKg: 7000.0,
    nitrogenKg: 1400.0,
    phosphorusKg: 350.0,
    waterKg: 28000.0,
    oxygenKg: 5600.0,
    mineralKg: 10500.0,
    thermalJoules: 1.0e9,
  };

  it('should instantiate monad and preserve extensive state stocks', () => {
    const index = H3SpatialIndexCodec.encodeIndex(1, 4, 30, [1, 3, 5, 0]);
    const monad = SpatialFluxMonad.of(index, sampleStocks);

    assert.strictEqual(monad.cellIndex, index);
    assert.strictEqual(monad.stocks.carbonKg, 7000.0);
    assert.strictEqual(monad.stocks.waterKg, 28000.0);
    assert.strictEqual(monad.apertureData.resolution, 4);
    assert.deepStrictEqual(monad.apertureData.activeDigits, [1, 3, 5, 0]);
  });

  it('should partition stocks across 7 child apertures with exact First-Law mass conservation', () => {
    const index = H3SpatialIndexCodec.encodeIndex(1, 2, 10, [2, 4]);
    const monad = SpatialFluxMonad.of(index, sampleStocks);

    const partitions = monad.partitionStocksToChildren();
    assert.strictEqual(partitions.length, 7);

    let sumC = 0;
    let sumN = 0;
    let sumP = 0;
    let sumWtr = 0;
    let sumO2 = 0;
    let sumMin = 0;
    let sumTh = 0;

    for (const p of partitions) {
      sumC += p.childStocks.carbonKg;
      sumN += p.childStocks.nitrogenKg;
      sumP += p.childStocks.phosphorusKg;
      sumWtr += p.childStocks.waterKg;
      sumO2 += p.childStocks.oxygenKg;
      sumMin += p.childStocks.mineralKg;
      sumTh += p.childStocks.thermalJoules;
    }

    assert.ok(Math.abs(sumC - sampleStocks.carbonKg) < 1e-11, 'Carbon mass strictly conserved');
    assert.ok(Math.abs(sumN - sampleStocks.nitrogenKg) < 1e-11, 'Nitrogen mass strictly conserved');
    assert.ok(Math.abs(sumP - sampleStocks.phosphorusKg) < 1e-11, 'Phosphorus mass strictly conserved');
    assert.ok(Math.abs(sumWtr - sampleStocks.waterKg) < 1e-11, 'Water mass strictly conserved');
    assert.ok(Math.abs(sumO2 - sampleStocks.oxygenKg) < 1e-11, 'Oxygen mass strictly conserved');
    assert.ok(Math.abs(sumMin - sampleStocks.mineralKg) < 1e-11, 'Mineral mass strictly conserved');
    assert.ok(Math.abs(sumTh - sampleStocks.thermalJoules) < 1e-6, 'Thermal energy strictly conserved');
  });

  it('should partition stocks with non-uniform weights conserving mass and energy', () => {
    const weights = [0.25, 0.15, 0.10, 0.10, 0.10, 0.15, 0.15]; // Sums to 1.0
    const index = H3SpatialIndexCodec.encodeIndex(1, 1, 5, [6]);
    const monad = SpatialFluxMonad.of(index, sampleStocks);

    const partitions = monad.partitionStocksToChildren(weights);
    const sumCarbon = partitions.reduce((acc: number, p: any) => acc + p.childStocks.carbonKg, 0);

    assert.ok(Math.abs(sumCarbon - sampleStocks.carbonKg) < 1e-11);
    assert.strictEqual(partitions[0].childStocks.carbonKg, sampleStocks.carbonKg * 0.25);
  });

  it('should route directional advective flux and produce non-negative Second-Law entropy', () => {
    const srcIndex = H3SpatialIndexCodec.encodeIndex(1, 3, 12, [1, 2, 3]);
    const tgtIndex = H3SpatialIndexCodec.encodeIndex(1, 3, 12, [1, 2, 4]);

    const sourceMonad = SpatialFluxMonad.of(srcIndex, sampleStocks);
    const fluxFraction = 0.2;
    const sourceTempK = 300.0;
    const targetTempK = 280.0;

    const { nextSource, transfer } = sourceMonad.routeDirectionalAdvectiveFlux(
      4, // Peripheral aperture direction 4
      tgtIndex,
      fluxFraction,
      sourceTempK,
      targetTempK
    );

    // Verify source inventory reduced by 20%
    assert.ok(Math.abs(nextSource.stocks.carbonKg - sampleStocks.carbonKg * 0.8) < 1e-10);
    assert.ok(Math.abs(nextSource.stocks.waterKg - sampleStocks.waterKg * 0.8) < 1e-10);

    // Verify transfer inventory is exactly 20%
    assert.ok(Math.abs(transfer.transferredStocks.carbonKg - sampleStocks.carbonKg * 0.2) < 1e-10);
    assert.ok(Math.abs(transfer.transferredStocks.waterKg - sampleStocks.waterKg * 0.2) < 1e-10);

    // Second Law: Entropy production must be strictly positive for thermal gradient
    assert.ok(transfer.entropyProducedJoulesPerKelvin > 0.0, 'Entropy production must be positive');

    // Receiver ingest test
    const targetMonadInitial = SpatialFluxMonad.of(tgtIndex, {
      carbonKg: 0,
      nitrogenKg: 0,
      phosphorusKg: 0,
      waterKg: 0,
      oxygenKg: 0,
      mineralKg: 0,
      thermalJoules: 0,
    });
    const targetMonadUpdated = targetMonadInitial.receiveAdvectiveFlux(transfer);

    assert.ok(Math.abs(targetMonadUpdated.stocks.carbonKg - sampleStocks.carbonKg * 0.2) < 1e-10);
  });
});

describe('Sprint 085: H3GridUtils Hierarchical Navigation', () => {
  it('should navigate from child cell to parent cell', () => {
    const digits = [3, 5, 2, 6];
    const childIndex = H3SpatialIndexCodec.encodeIndex(1, 4, 18, digits);

    const parentIndex = H3GridUtils.cellToParent(childIndex);
    const parentDecomp = extractH3IndexApertureDigits(parentIndex);

    assert.strictEqual(parentDecomp.resolution, 3);
    assert.strictEqual(parentDecomp.baseCell, 18);
    assert.deepStrictEqual(parentDecomp.activeDigits, [3, 5, 2]);
  });

  it('should generate all 7 aperture children for an H3 cell', () => {
    const parentIndex = H3SpatialIndexCodec.encodeIndex(1, 2, 7, [1, 4]);
    const children = H3GridUtils.cellToChildren(parentIndex);

    assert.strictEqual(children.length, 7);

    for (let d = 0; d < 7; d++) {
      const decomp = extractH3IndexApertureDigits(children[d]);
      assert.strictEqual(decomp.resolution, 3);
      assert.strictEqual(decomp.baseCell, 7);
      assert.deepStrictEqual(decomp.activeDigits, [1, 4, d]);
    }
  });

  it('should validate well-formed cells and reject corrupt ones', () => {
    const valid = H3SpatialIndexCodec.encodeIndex(1, 3, 50, [0, 6, 2]);
    assert.strictEqual(H3GridUtils.isValidCell(valid), true);

    const invalid = H3SpatialIndexCodec.encodeIndex(3, 3, 50, [0, 6, 2]); // Invalid mode 3
    assert.strictEqual(H3GridUtils.isValidCell(invalid), false);
  });
});
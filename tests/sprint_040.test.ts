// =============================================================================
// SPRINT 040 TEST SUITE: H3_GLOBAL_CANONICAL_INDEX_PATTERN & SPATIAL TOKEN PIPELINE
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  H3_GLOBAL_CANONICAL_INDEX_PATTERN,
  extractCanonicalH3Tokens,
  H3Grid,
  SpatialPartitionMonad,
  BiogeochemicalStocks,
  ThermodynamicState
} from '../src/spatial/h3_grid.js';

describe('RFC-040: H3_GLOBAL_CANONICAL_INDEX_PATTERN & Spatial Extraction Suite', () => {

  describe('Regex Architecture & Morphology Guarantees', () => {
    it('should have global flag set and source matching 15 hex chars with word boundaries', () => {
      assert.strictEqual(H3_GLOBAL_CANONICAL_INDEX_PATTERN.global, true);
      assert.strictEqual(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, '\\b[0-9a-fA-F]{15}\\b');
    });

    it('should match canonical 15-character lowercase H3 indices', () => {
      const sample = '8826856235fffff';
      const matches = sample.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.ok(matches);
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0], sample);
    });

    it('should match canonical 15-character uppercase and mixed-case H3 indices', () => {
      const sample = '8F2830828052D25';
      const matches = sample.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.ok(matches);
      assert.strictEqual(matches.length, 1);
      assert.strictEqual(matches[0], sample);
    });

    it('should reject 14-character hex strings', () => {
      const sample = '8826856235ffff'; // 14 hex chars
      const matches = sample.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.strictEqual(matches, null);
    });

    it('should reject 16-character hex strings due to word boundary enforcement', () => {
      const sample = '8826856235ffffff'; // 16 hex chars
      const matches = sample.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.strictEqual(matches, null);
    });

    it('should reject 15-character strings with non-hexadecimal characters', () => {
      const sample = '8826856235ggggg'; // non-hex 'g'
      const matches = sample.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.strictEqual(matches, null);
    });

    it('should reject embedded 15-character slices within 32-character hashes or UUIDs', () => {
      // 32-character MD5 hash
      const md5 = 'd41d8cd98f00b204e9800998ecf8427e';
      const matches = md5.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.strictEqual(matches, null);
    });

    it('should reject embedded 15-character slices within 24-character ObjectIds', () => {
      const objectId = '507f191e810c19729de860ea';
      const matches = objectId.match(new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'g'));
      assert.strictEqual(matches, null);
    });
  });

  describe('Bulk Extraction & Canonical Normalization', () => {
    it('should extract multiple discrete tokens from unstructured logs and JSON payloads', () => {
      const payload = `
        [2025-01-01T00:00:00Z] Pod cell telemetry:
        Cell Primary: 8826856235fffff
        Cell Secondary: 8a2a1072b59ffff
        Invalid hash: 507f191e810c19729de860ea
        Short token: 1234abcd
        Overlong token: 8826856235ffffffff
        Cell Tertiary: 8F2830828052D25
      `;

      const tokens = extractCanonicalH3Tokens(payload);
      assert.strictEqual(tokens.length, 3);
      assert.ok(tokens.includes('8826856235fffff'));
      assert.ok(tokens.includes('8a2a1072b59ffff'));
      assert.ok(tokens.includes('8f2830828052d25')); // Normalized to lowercase
    });

    it('should deduplicate repeating tokens', () => {
      const payload = '8826856235fffff 8826856235FFFFF 8826856235fffff';
      const tokens = extractCanonicalH3Tokens(payload);
      assert.strictEqual(tokens.length, 1);
      assert.strictEqual(tokens[0], '8826856235fffff');
    });

    it('should handle empty or invalid input gracefully', () => {
      assert.deepStrictEqual(extractCanonicalH3Tokens(''), []);
      assert.deepStrictEqual(extractCanonicalH3Tokens(null as unknown as string), []);
      assert.deepStrictEqual(extractCanonicalH3Tokens(undefined as unknown as string), []);
      assert.deepStrictEqual(H3Grid.extractCanonicalTokens(''), []);
    });

    it('should validate single tokens via H3Grid.isValidCanonicalIndex', () => {
      assert.strictEqual(H3Grid.isValidCanonicalIndex('8826856235fffff'), true);
      assert.strictEqual(H3Grid.isValidCanonicalIndex('8F2830828052D25'), true);
      assert.strictEqual(H3Grid.isValidCanonicalIndex('8826856235ffff'), false);
      assert.strictEqual(H3Grid.isValidCanonicalIndex('8826856235ffffff'), false);
      assert.strictEqual(H3Grid.isValidCanonicalIndex('8826856235ggggg'), false);
    });

    it('should normalize valid indices and reject invalid ones via H3Grid.normalizeIndex', () => {
      assert.strictEqual(H3Grid.normalizeIndex('8F2830828052D25'), '8f2830828052d25');
      assert.strictEqual(H3Grid.normalizeIndex('invalid_token'), null);
    });
  });

  describe('Thermodynamic & Mass Conservation Monadic Invariants', () => {
    const initialStocks: BiogeochemicalStocks = {
      carbonKg: 5000.0,
      waterKg: 20000.0,
      nitrogenKg: 350.0,
      phosphorusKg: 45.0,
      oxygenKg: 1200.0,
    };

    const initialThermodynamics: ThermodynamicState = {
      energyJoules: 1.0e6,
      entropyJoulesPerKelvin: 50.0,
      ambientTemperatureKelvin: 298.15,
    };

    it('should conserve mass strictly (delta M = 0) upon spatial index binding', () => {
      const monad = new SpatialPartitionMonad(initialStocks, initialThermodynamics, new Set());
      const payload = 'Detected cell: 8826856235fffff and neighbor 8a2a1072b59ffff';

      const nextMonad = monad.bindPayloadSpatialIndices(payload);
      const nextStocks = nextMonad.getStocks();

      // Verify mass vector parity
      assert.strictEqual(nextStocks.carbonKg, initialStocks.carbonKg);
      assert.strictEqual(nextStocks.waterKg, initialStocks.waterKg);
      assert.strictEqual(nextStocks.nitrogenKg, initialStocks.nitrogenKg);
      assert.strictEqual(nextStocks.phosphorusKg, initialStocks.phosphorusKg);
      assert.strictEqual(nextStocks.oxygenKg, initialStocks.oxygenKg);

      // Verify cell partition binding
      const indexed = nextMonad.getIndexedCells();
      assert.strictEqual(indexed.length, 2);
      assert.ok(indexed.includes('8826856235fffff'));
      assert.ok(indexed.includes('8a2a1072b59ffff'));
    });

    it('should calculate non-zero Landauer/computational entropy dissipation while decreasing available free energy', () => {
      const monad = new SpatialPartitionMonad(initialStocks, initialThermodynamics, new Set());
      const payload = 'A'.repeat(5000) + ' 8826856235fffff';

      const nextMonad = monad.bindPayloadSpatialIndices(payload);
      const nextThermo = nextMonad.getThermodynamics();

      // Energy must decrease by work done
      assert.ok(nextThermo.energyJoules < initialThermodynamics.energyJoules);
      // Entropy must strictly increase
      assert.ok(nextThermo.entropyJoulesPerKelvin > initialThermodynamics.entropyJoulesPerKelvin);
      // Ambient temperature remains invariant
      assert.strictEqual(nextThermo.ambientTemperatureKelvin, initialThermodynamics.ambientTemperatureKelvin);
    });

    it('should guarantee immutability of parent monad upon child binding', () => {
      const initialCells = new Set(['8826856235fffff']);
      const monad = new SpatialPartitionMonad(initialStocks, initialThermodynamics, initialCells);
      const nextMonad = monad.bindPayloadSpatialIndices('New cell: 8a2a1072b59ffff');

      assert.strictEqual(monad.getIndexedCells().length, 1);
      assert.strictEqual(nextMonad.getIndexedCells().length, 2);
    });
  });
});
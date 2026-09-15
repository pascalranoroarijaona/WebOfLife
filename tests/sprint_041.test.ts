/**
 * Test Suite: Sprint 041 - Canonical H3 Token Extraction & Spatial Substrate
 * Adheres strictly to node:test and node:assert standards.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractUniqueCanonicalH3Tokens,
  isValidH3CellString,
  H3Grid,
  SpatialTelemetryIngestor
} from '../src/spatial/h3_grid.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 041: Canonical H3 Token Extraction Helper', () => {
  const SAMPLE_INDEX_1_UPPER = '882681E049FFFFF';
  const SAMPLE_INDEX_1_LOWER = '882681e049fffff';
  const SAMPLE_INDEX_2 = '882681e049bffff';
  const SAMPLE_INDEX_3 = '85283473fffffff';

  it('extracts and canonicalizes tokens with mixed casing, deduplicating to lowercase', () => {
    const prose = `Cell stream contains ${SAMPLE_INDEX_1_UPPER} and later duplicates ${SAMPLE_INDEX_1_LOWER}.`;
    const tokens = extractUniqueCanonicalH3Tokens(prose);

    assert.strictEqual(tokens.length, 1);
    assert.strictEqual(tokens[0], SAMPLE_INDEX_1_LOWER);
  });

  it('preserves exact FIFO discovery order across multiple unique indices', () => {
    const prose = `Sensor cluster: ${SAMPLE_INDEX_1_UPPER}, then ${SAMPLE_INDEX_2}, followed by ${SAMPLE_INDEX_3}.`;
    const tokens = extractUniqueCanonicalH3Tokens(prose);

    assert.strictEqual(tokens.length, 3);
    assert.strictEqual(tokens[0], SAMPLE_INDEX_1_LOWER);
    assert.strictEqual(tokens[1], SAMPLE_INDEX_2);
    assert.strictEqual(tokens[2], SAMPLE_INDEX_3);
  });

  it('resiliently parses tokens delimited by JSON quotes, brackets, newlines, and URI queries', () => {
    const payload = JSON.stringify({
      primary: SAMPLE_INDEX_1_LOWER,
      neighbors: [SAMPLE_INDEX_2, SAMPLE_INDEX_3],
      uri: `https://earth.monad/telemetry?h3=${SAMPLE_INDEX_1_UPPER}&res=8\nnext=${SAMPLE_INDEX_2}`
    });

    const tokens = extractUniqueCanonicalH3Tokens(payload);
    assert.strictEqual(tokens.length, 3);
    assert.deepStrictEqual(tokens, [SAMPLE_INDEX_1_LOWER, SAMPLE_INDEX_2, SAMPLE_INDEX_3]);
  });

  it('rejects false positives: 14-char, 16-char, 32-char UUIDs, and invalid mode bits', () => {
    const falsePositives = [
      '882681e049ffff',                     // 14 chars
      '882681e049ffffff',                   // 16 chars
      'd41d8cd98f00b204e9800998ecf8427e',   // 32-char MD5
      '0123456789abcde',                   // 15 chars, invalid mode (Mode 0)
      '782681e049fffff',                   // 15 chars, invalid mode (does not start with 8)
      '982681e049fffff'                    // 15 chars, non-zero edgeMode / invalid cell
    ].join(' ');

    const tokens = extractUniqueCanonicalH3Tokens(falsePositives);
    assert.strictEqual(tokens.length, 0);
  });

  it('safely handles empty, null, undefined, and non-string inputs', () => {
    assert.deepStrictEqual(extractUniqueCanonicalH3Tokens(''), []);
    assert.deepStrictEqual(extractUniqueCanonicalH3Tokens(null as unknown as string), []);
    assert.deepStrictEqual(extractUniqueCanonicalH3Tokens(undefined as unknown as string), []);
    assert.deepStrictEqual(extractUniqueCanonicalH3Tokens(42 as unknown as string), []);
    assert.deepStrictEqual(extractUniqueCanonicalH3Tokens('No spatial telemetry in this sentence.'), []);
  });

  it('validates H3 cell strings directly via isValidH3CellString', () => {
    assert.strictEqual(isValidH3CellString(SAMPLE_INDEX_1_LOWER), true);
    assert.strictEqual(isValidH3CellString(SAMPLE_INDEX_1_UPPER), true);
    assert.strictEqual(isValidH3CellString('882681e049fffff'), true);
    assert.strictEqual(isValidH3CellString('85283473fffffff'), true);

    // Rejections
    assert.strictEqual(isValidH3CellString(''), false);
    assert.strictEqual(isValidH3CellString('882681e049ffff'), false);
    assert.strictEqual(isValidH3CellString('782681e049fffff'), false);
    assert.strictEqual(isValidH3CellString('not_hex_token_!'), false);
  });

  it('integrates with H3Grid static and instance methods', () => {
    const grid = new H3Grid();
    const raw = `Raw telemetry: ${SAMPLE_INDEX_1_UPPER}, ${SAMPLE_INDEX_2}`;

    const staticExtracted = H3Grid.extractUniqueCanonicalTokens(raw);
    const instanceExtracted = grid.extractTokens(raw);
    const parsedTokens = grid.parseTokens(raw);

    assert.deepStrictEqual(staticExtracted, [SAMPLE_INDEX_1_LOWER, SAMPLE_INDEX_2]);
    assert.deepStrictEqual(instanceExtracted, [SAMPLE_INDEX_1_LOWER, SAMPLE_INDEX_2]);
    assert.deepStrictEqual(parsedTokens, [SAMPLE_INDEX_1_LOWER, SAMPLE_INDEX_2]);

    for (const token of staticExtracted) {
      grid.activateCell(token);
    }

    assert.strictEqual(grid.getActiveCellCount(), 2);
    assert.strictEqual(grid.hasCell(SAMPLE_INDEX_1_UPPER), true);
    assert.strictEqual(grid.hasCell(SAMPLE_INDEX_2), true);

    const cell1 = grid.getCell(SAMPLE_INDEX_1_LOWER);
    assert.ok(cell1);
    assert.strictEqual(cell1.index, SAMPLE_INDEX_1_LOWER);
    assert.strictEqual(cell1.resolution, 8);
    assert.strictEqual(cell1.mode, 1);
  });

  it('verifies thermodynamic mass conservation across spatial telemetry ingestion', () => {
    const state = {
      massStockTotal: 50000.0,
      activeCells: new Set<string>()
    };

    const telemetryLog = `Ingesting stream: ${SAMPLE_INDEX_1_LOWER} and ${SAMPLE_INDEX_2} with duplicate ${SAMPLE_INDEX_1_UPPER}`;

    const result = SpatialTelemetryIngestor.ingestSafely(
      state,
      telemetryLog,
      (token: string, currentState: { massStockTotal: number; activeCells: Set<string> }) => {
        currentState.activeCells.add(token);
        // Mass is conserved (zero transmutation)
        return currentState;
      }
    );

    assert.strictEqual(result.deltaMass, 0);
    assert.strictEqual(result.nextState.massStockTotal, 50000.0);
    assert.strictEqual(result.extractedTokens.length, 2);
    assert.strictEqual(result.nextState.activeCells.size, 2);
  });

  it('preserves EarthPOD biophysical stocks without drift when parsing telemetry', () => {
    const earth = EarthPOD.getInstance();
    const initialBiomass = earth.totalDescendantBiomass();

    // Ingest telemetry into the grid substrate
    const telemetry = `Atmospheric carbon flux over ${SAMPLE_INDEX_1_UPPER} and ${SAMPLE_INDEX_2}`;
    const tokens = extractUniqueCanonicalH3Tokens(telemetry);

    assert.strictEqual(tokens.length, 2);
    const finalBiomass = earth.totalDescendantBiomass();
    assert.strictEqual(finalBiomass, initialBiomass);
  });
});
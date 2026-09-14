import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CANONICAL_H3_REGEX,
  matchesCanonicalH3Pattern,
  isValidH3Index,
  SpatialTransferMonad,
  H3Grid,
  type CellThermodynamicStocks,
  type SpatialFluxDelta
} from '../src/spatial/h3_grid.js';
import { H3AdjacencyGraph } from '../src/spatial/h3_adjacency.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 038: Canonical H3 Pattern Matching Engine', () => {
  describe('CANONICAL_H3_REGEX and matchesCanonicalH3Pattern validation', () => {
    it('should validate positive canonical 15-character hex tokens', () => {
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339fffff'), true);
      assert.strictEqual(matchesCanonicalH3Pattern('8026fffffffffff'), true);
      assert.strictEqual(matchesCanonicalH3Pattern('8f2681a339fffff'), true);
      assert.strictEqual(matchesCanonicalH3Pattern('000000000000000'), true);
      assert.strictEqual(matchesCanonicalH3Pattern('fffffffffffffff'), true);
    });

    it('should reject invalid string lengths', () => {
      assert.strictEqual(matchesCanonicalH3Pattern(''), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339ffff'), false); // length 14
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339ffffff'), false); // length 16
      assert.strictEqual(matchesCanonicalH3Pattern('a'), false);
    });

    it('should reject uppercase hexadecimal characters', () => {
      assert.strictEqual(matchesCanonicalH3Pattern('882681A339FFFFF'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339FFFFF'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('FFFFFFFFFFFFFFF'), false);
    });

    it('should reject non-hex characters', () => {
      assert.strictEqual(matchesCanonicalH3Pattern('882681g339fffff'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681z339fffff'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681-339fffff'), false);
    });

    it('should reject leading, trailing, or internal whitespace', () => {
      assert.strictEqual(matchesCanonicalH3Pattern(' 882681a339fffff'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339fffff '), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681a339fffff\n'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('882681a 39fffff'), false);
    });

    it('should reject prefixes or symbols', () => {
      assert.strictEqual(matchesCanonicalH3Pattern('0x882681a339ffff'), false);
      assert.strictEqual(matchesCanonicalH3Pattern('#882681a339ffff'), false);
    });

    it('should gracefully handle non-string runtime types', () => {
      assert.strictEqual(matchesCanonicalH3Pattern(undefined as unknown as string), false);
      assert.strictEqual(matchesCanonicalH3Pattern(null as unknown as string), false);
      assert.strictEqual(matchesCanonicalH3Pattern(12345 as unknown as string), false);
      assert.strictEqual(matchesCanonicalH3Pattern({} as unknown as string), false);
    });

    it('should maintain statelessness across repeated invocations (no lastIndex state pollution)', () => {
      const valid = '882681a339fffff';
      for (let i = 0; i < 500; i++) {
        assert.strictEqual(matchesCanonicalH3Pattern(valid), true);
      }
      assert.strictEqual(CANONICAL_H3_REGEX.lastIndex, 0);
    });
  });

  describe('Semantic check: isValidH3Index', () => {
    it('should validate physically valid H3 cells', () => {
      assert.strictEqual(isValidH3Index('882681a339fffff'), true);
      assert.strictEqual(isValidH3Index('8026fffffffffff'), true);
      assert.strictEqual(isValidH3Index('8f2681a339fffff'), true);
    });

    it('should reject syntactically canonical strings that violate semantic H3 mode/cell layout', () => {
      // 000000000000000 has mode 0 (not Mode 1)
      assert.strictEqual(isValidH3Index('000000000000000'), false);
      // fffffffffffffff has mode 15 (not Mode 1)
      assert.strictEqual(isValidH3Index('fffffffffffffff'), false);
    });

    it('should reject invalid syntactic strings', () => {
      assert.strictEqual(isValidH3Index('invalid_token'), false);
      assert.strictEqual(isValidH3Index('882681A339FFFFF'), false);
    });
  });

  describe('First Law Mass-Energy Conservation in SpatialTransferMonad', () => {
    const srcCellKey = '882681a339fffff';
    const dstCellKey = '8026fffffffffff';

    const initialStocksSrc: CellThermodynamicStocks = {
      carbonMol: 100.0,
      waterMol: 500.0,
      nitrogenMol: 50.0,
      phosphorusMol: 10.0,
      oxygenMol: 80.0,
      enthalpyJoules: 10000.0
    };

    const initialStocksDst: CellThermodynamicStocks = {
      carbonMol: 20.0,
      waterMol: 100.0,
      nitrogenMol: 10.0,
      phosphorusMol: 2.0,
      oxygenMol: 15.0,
      enthalpyJoules: 2000.0
    };

    const initialGrid = new Map<string, CellThermodynamicStocks>([
      [srcCellKey, initialStocksSrc],
      [dstCellKey, initialStocksDst]
    ]);

    it('should conserve planetary matter and enthalpy exactly on valid transfers', () => {
      const monad = new SpatialTransferMonad(initialGrid);
      const flux: SpatialFluxDelta = {
        deltaCarbonMol: 15.0,
        deltaWaterMol: 50.0,
        deltaNitrogenMol: 5.0,
        deltaPhosphorusMol: 1.5,
        deltaOxygenMol: 10.0,
        deltaEnthalpyJoules: 1500.0
      };

      const result = monad.transferFlux(srcCellKey, dstCellKey, flux);
      assert.strictEqual(result.transferred, true);

      const nextSrc = result.nextGrid.get(srcCellKey)!;
      const nextDst = result.nextGrid.get(dstCellKey)!;

      // First Law Checksums: delta(universe) === 0
      const totalCarbonBefore = initialStocksSrc.carbonMol! + initialStocksDst.carbonMol!;
      const totalCarbonAfter = nextSrc.carbonMol! + nextDst.carbonMol!;
      assert.strictEqual(Math.abs(totalCarbonAfter - totalCarbonBefore) < 1e-12, true);

      const totalWaterBefore = initialStocksSrc.waterMol! + initialStocksDst.waterMol!;
      const totalWaterAfter = nextSrc.waterMol! + nextDst.waterMol!;
      assert.strictEqual(Math.abs(totalWaterAfter - totalWaterBefore) < 1e-12, true);

      const totalEnthalpyBefore = initialStocksSrc.enthalpyJoules! + initialStocksDst.enthalpyJoules!;
      const totalEnthalpyAfter = nextSrc.enthalpyJoules! + nextDst.enthalpyJoules!;
      assert.strictEqual(Math.abs(totalEnthalpyAfter - totalEnthalpyBefore) < 1e-9, true);
    });

    it('should reject transfer and prevent thermodynamic leaks if tokens are non-canonical', () => {
      const monad = new SpatialTransferMonad(initialGrid);
      const flux: SpatialFluxDelta = {
        deltaCarbonMol: 10.0,
        deltaWaterMol: 10.0,
        deltaNitrogenMol: 1.0,
        deltaPhosphorusMol: 0.5,
        deltaOxygenMol: 2.0,
        deltaEnthalpyJoules: 500.0
      };

      // Uppercase token
      const malformedDst = '8026FFFFFFFFFFF';
      const result = monad.transferFlux(srcCellKey, malformedDst, flux);
      assert.strictEqual(result.transferred, false);
      assert.strictEqual(result.nextGrid, initialGrid);

      // Verify source cell unchanged
      const srcStock = result.nextGrid.get(srcCellKey)!;
      assert.strictEqual(srcStock.carbonMol, initialStocksSrc.carbonMol);
    });

    it('should reject transfer when source stocks are insufficient', () => {
      const monad = new SpatialTransferMonad(initialGrid);
      const excessiveFlux: SpatialFluxDelta = {
        deltaCarbonMol: 500.0, // exceeds available 100.0
        deltaWaterMol: 10.0,
        deltaNitrogenMol: 1.0,
        deltaPhosphorusMol: 0.5,
        deltaOxygenMol: 2.0,
        deltaEnthalpyJoules: 500.0
      };

      const result = monad.transferFlux(srcCellKey, dstCellKey, excessiveFlux);
      assert.strictEqual(result.transferred, false);
      assert.strictEqual(result.nextGrid, initialGrid);
    });
  });

  describe('SpatialMonad and Topology Graph Invariants', () => {
    it('should construct SpatialMonad when canonical H3 index is supplied', () => {
      const cell = '882681a339fffff';
      const monad = SpatialMonad.of(cell, { biomass: 42.0 });
      assert.strictEqual(monad.getIndex(), cell);
      assert.strictEqual(monad.getValue().biomass, 42.0);

      const mapped = monad.map((v) => ({ biomass: v.biomass * 2 }));
      assert.strictEqual(mapped.getValue().biomass, 84.0);
    });

    it('should throw error when constructing SpatialMonad with non-canonical index', () => {
      assert.throws(() => {
        SpatialMonad.of('INVALID_CELL_INDEX', { biomass: 10.0 });
      }, /Invalid canonical H3 pattern/);
    });

    it('should guard cell insertion in H3Grid', () => {
      const grid = new H3Grid(8);
      assert.strictEqual(grid.addCell('882681a339fffff'), true);
      assert.strictEqual(grid.addCell('invalid_cell'), false);
      assert.strictEqual(grid.hasCell('882681a339fffff'), true);
      assert.strictEqual(grid.hasCell('invalid_cell'), false);
      assert.strictEqual(grid.cellCount(), 1);
    });

    it('should guard edges in H3AdjacencyGraph', () => {
      const graph = new H3AdjacencyGraph();
      const cellA = '882681a339fffff';
      const cellB = '8026fffffffffff';

      assert.strictEqual(graph.addEdge(cellA, cellB), true);
      assert.strictEqual(graph.addEdge(cellA, 'MALFORMED'), false);
      assert.strictEqual(graph.areAdjacent(cellA, cellB), true);
      assert.strictEqual(graph.getNeighbors(cellA).length, 1);
      assert.strictEqual(graph.getNeighbors('MALFORMED').length, 0);
    });
  });
});
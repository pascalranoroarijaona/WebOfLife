// =============================================================================
// SPRINT 086 TEST SUITE: PENTAGON APERTURE EXTRACTION & BOUNDARY FLUX MONAD
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert";
import { extractPentagonApertureDigits, H3PentagonApertureParser, buildH3Index, SpatialFluxMonad, } from "../src/spatial/h3_adjacency.js";
describe("Sprint 086 — Directional Aperture Parsing & Pentagonal Boundary Flux", () => {
    it("TC-01: Base Pentagons at Resolution 0 (Base Cell 4)", () => {
        // Base cell 4 at res 0 in standard H3 hex
        const h3Hex = "8009fffffffffff";
        const result = extractPentagonApertureDigits(h3Hex);
        assert.strictEqual(result.isPentagonBaseCell, true);
        assert.strictEqual(result.resolution, 0);
        assert.strictEqual(result.baseCell, 4);
        assert.deepStrictEqual(result.allDigits, []);
        assert.deepStrictEqual(result.nonZeroDigits, []);
        assert.strictEqual(result.isPurePentagon, true);
        assert.strictEqual(result.leadingNonZeroDigit, null);
        assert.strictEqual(result.leadingNonZeroResolution, null);
        assert.strictEqual(result.leadingCenterCount, 0);
        assert.strictEqual(result.hasInvalidPentagonDigit, false);
    });
    it("TC-02: Pure Pentagons at Higher Resolutions (Base Cell 14, Res 3 with all zeros)", () => {
        const h3Hex = buildH3Index(14, 3, [0, 0, 0]);
        const result = extractPentagonApertureDigits(h3Hex);
        assert.strictEqual(result.isPentagonBaseCell, true);
        assert.strictEqual(result.resolution, 3);
        assert.strictEqual(result.baseCell, 14);
        assert.deepStrictEqual(result.allDigits, [0, 0, 0]);
        assert.deepStrictEqual(result.nonZeroDigits, []);
        assert.strictEqual(result.isPurePentagon, true);
        assert.strictEqual(result.leadingNonZeroDigit, null);
        assert.strictEqual(result.leadingNonZeroResolution, null);
        assert.strictEqual(result.leadingCenterCount, 3);
        assert.strictEqual(result.hasInvalidPentagonDigit, false);
    });
    it("TC-03: Pentagon Children with Non-Zero Aperture Digits (Base Cell 24, Digits [0, 2, 5])", () => {
        const h3Hex = buildH3Index(24, 3, [0, 2, 5]);
        const result = extractPentagonApertureDigits(h3Hex);
        assert.strictEqual(result.isPentagonBaseCell, true);
        assert.strictEqual(result.resolution, 3);
        assert.strictEqual(result.baseCell, 24);
        assert.deepStrictEqual(result.allDigits, [0, 2, 5]);
        assert.deepStrictEqual(result.nonZeroDigits, [2, 5]);
        assert.strictEqual(result.leadingNonZeroDigit, 2);
        assert.strictEqual(result.leadingNonZeroResolution, 2);
        assert.strictEqual(result.leadingCenterCount, 1);
        assert.strictEqual(result.isPurePentagon, false);
        assert.strictEqual(result.hasInvalidPentagonDigit, false);
    });
    it("TC-04: Invalid Pentagon Digit Detection (Base Cell 4, Digits [0, 1, 3])", () => {
        const h3Hex = buildH3Index(4, 3, [0, 1, 3]);
        const result = extractPentagonApertureDigits(h3Hex);
        assert.strictEqual(result.isPentagonBaseCell, true);
        assert.strictEqual(result.hasInvalidPentagonDigit, true);
        assert.deepStrictEqual(result.allDigits, [0, 1, 3]);
        assert.strictEqual(result.leadingNonZeroDigit, 1);
        assert.strictEqual(result.leadingNonZeroResolution, 2);
    });
    it("TC-05: Non-Pentagon Hexagonal Base Cells (Base Cell 0, Digits [1, 2])", () => {
        const h3Hex = buildH3Index(0, 2, [1, 2]);
        const result = extractPentagonApertureDigits(h3Hex);
        assert.strictEqual(result.isPentagonBaseCell, false);
        assert.strictEqual(result.isPurePentagon, false);
        assert.deepStrictEqual(result.allDigits, [1, 2]);
        assert.deepStrictEqual(result.nonZeroDigits, [1, 2]);
        // Digit 1 is valid for hexagonal base cells
        assert.strictEqual(result.hasInvalidPentagonDigit, false);
        assert.strictEqual(result.leadingNonZeroDigit, 1);
        assert.strictEqual(result.leadingNonZeroResolution, 1);
        assert.strictEqual(result.leadingCenterCount, 0);
    });
    it("TC-06: Verification of All 12 Icosahedral Pentagonal Base Cells", () => {
        const expectedBaseCells = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
        for (const bc of expectedBaseCells) {
            assert.strictEqual(H3PentagonApertureParser.isPentagonBase(bc), true);
            const hex = buildH3Index(bc, 1, [0]);
            const res = extractPentagonApertureDigits(hex);
            assert.strictEqual(res.isPentagonBaseCell, true);
            assert.strictEqual(res.isPurePentagon, true);
        }
    });
    it("TC-07: Error Handling for Malformed or Out-of-Bounds Indices", () => {
        assert.throws(() => extractPentagonApertureDigits("invalid_hex"), /Invalid hexadecimal/);
        // Mode 0 instead of Mode 1
        const invalidModeHex = "0009fffffffffff";
        assert.throws(() => extractPentagonApertureDigits(invalidModeHex), /Invalid H3 cell mode/);
    });
    it("TC-08: Thermodynamic Invariant Conservation Across Pentagonal Singularity", () => {
        const pentagonHex = buildH3Index(4, 1, [0]);
        const neighborHex = buildH3Index(4, 1, [2]);
        const source = {
            h3Index: pentagonHex,
            state: {
                carbonKg: 500.0,
                waterKg: 1000.0,
                mineralsKg: 300.0,
                oxygenKg: 250.0,
                energyJoules: 1e8,
            },
            areaM2: 50000.0,
            temperatureK: 298.15,
        };
        const neighbor = {
            h3Index: neighborHex,
            state: {
                carbonKg: 300.0,
                waterKg: 800.0,
                mineralsKg: 200.0,
                oxygenKg: 210.0,
                energyJoules: 8e7,
            },
            areaM2: 60000.0,
            temperatureK: 290.15,
        };
        // Valid pentagonal directional facet d = 2
        const { updatedSource, updatedNeighbor, exchange } = SpatialFluxMonad.applyExchange(source, neighbor, 2, 60.0 // dt = 60s
        );
        // Assert First Law: Absolute Conservation of Mass
        const initialMass = source.state.carbonKg +
            source.state.waterKg +
            source.state.mineralsKg +
            source.state.oxygenKg +
            neighbor.state.carbonKg +
            neighbor.state.waterKg +
            neighbor.state.mineralsKg +
            neighbor.state.oxygenKg;
        const finalMass = updatedSource.state.carbonKg +
            updatedSource.state.waterKg +
            updatedSource.state.mineralsKg +
            updatedSource.state.oxygenKg +
            updatedNeighbor.state.carbonKg +
            updatedNeighbor.state.waterKg +
            updatedNeighbor.state.mineralsKg +
            updatedNeighbor.state.oxygenKg;
        const massDelta = Math.abs(finalMass - initialMass);
        assert.ok(massDelta < 1e-12, `Mass divergence detected: ${massDelta}`);
        // Assert First Law: Conservation of Energy
        const initialEnergy = source.state.energyJoules + neighbor.state.energyJoules;
        const finalEnergy = updatedSource.state.energyJoules + updatedNeighbor.state.energyJoules;
        const energyDelta = Math.abs(finalEnergy - initialEnergy);
        assert.ok(energyDelta < 1e-6, `Energy divergence detected: ${energyDelta}`);
        // Assert Second Law: Non-negative entropy generation
        assert.ok(exchange.entropyGeneratedJPerK >= 0.0, `Second Law violated: sigma = ${exchange.entropyGeneratedJPerK}`);
        // Assert Suppressed Facet: Direction 1 must produce zero transfer on a pentagon
        const suppressedExchange = SpatialFluxMonad.computeFacetFlux(source, neighbor, 1, 60.0);
        assert.strictEqual(suppressedExchange.transfer.deltaCarbonKg, 0.0);
        assert.strictEqual(suppressedExchange.transfer.deltaWaterKg, 0.0);
        assert.strictEqual(suppressedExchange.transfer.deltaMineralsKg, 0.0);
        assert.strictEqual(suppressedExchange.transfer.deltaOxygenKg, 0.0);
        assert.strictEqual(suppressedExchange.transfer.deltaEnergyJoules, 0.0);
        assert.strictEqual(suppressedExchange.entropyGeneratedJPerK, 0.0);
    });
});

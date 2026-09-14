import { describe, it } from "node:test";
import assert from "node:assert";
import { assertValidCoordinatePair, isValidCoordinatePair, CoordinateBoundaryError, H3AdjacencyService, SpatialTransportMonad, } from "../src/spatial/h3_adjacency.js";
describe("Sprint 056: assertValidCoordinatePair & Geodesic Boundary Guard", () => {
    describe("1. Nominal Geodesic Coordinates", () => {
        it("should accept Prime Meridian and Equator (0, 0)", () => {
            assert.doesNotThrow(() => assertValidCoordinatePair(0, 0));
            assert.strictEqual(isValidCoordinatePair(0, 0), true);
        });
        it("should accept cardinal extremes on boundaries", () => {
            assert.doesNotThrow(() => assertValidCoordinatePair(90, 0)); // North Pole
            assert.doesNotThrow(() => assertValidCoordinatePair(-90, 0)); // South Pole
            assert.doesNotThrow(() => assertValidCoordinatePair(0, 180)); // Antimeridian East
            assert.doesNotThrow(() => assertValidCoordinatePair(0, -180)); // Antimeridian West
            assert.strictEqual(isValidCoordinatePair(90, 180), true);
            assert.strictEqual(isValidCoordinatePair(-90, -180), true);
        });
        it("should accept typical world city coordinates", () => {
            // Paris
            assert.doesNotThrow(() => assertValidCoordinatePair(48.8566, 2.3522));
            // Sydney
            assert.doesNotThrow(() => assertValidCoordinatePair(-33.8688, 151.2093));
            // Tokyo
            assert.doesNotThrow(() => assertValidCoordinatePair(35.6762, 139.6503));
            // San Francisco
            assert.doesNotThrow(() => assertValidCoordinatePair(37.7749, -122.4194));
        });
        it("should accept composite object formats { lat, lon } and { latitude, longitude }", () => {
            assert.doesNotThrow(() => assertValidCoordinatePair({ lat: 10, lon: 20 }));
            assert.doesNotThrow(() => assertValidCoordinatePair({ latitude: -12.5, longitude: 45.2 }));
            assert.strictEqual(isValidCoordinatePair({ lat: 10, lon: 20 }), true);
            assert.strictEqual(isValidCoordinatePair({ latitude: -12.5, longitude: 45.2 }), true);
        });
    });
    describe("2. Boundary Tolerance & Longitude Wrapping", () => {
        it("should accept float within epsilon clamping tolerance", () => {
            // 90 + 1e-10 is within default epsilon of 1e-9
            assert.doesNotThrow(() => assertValidCoordinatePair(90.0000000001, 0));
            // -90 - 1e-10
            assert.doesNotThrow(() => assertValidCoordinatePair(-90.0000000001, 0));
        });
        it("should reject latitude outside [-90, +90] beyond epsilon", () => {
            assert.throws(() => assertValidCoordinatePair(90.01, 0), (err) => {
                assert(err instanceof CoordinateBoundaryError);
                assert.strictEqual(err.latitude, 90.01);
                assert.match(err.message, /Latitude must be within \[-90, \+90\] degrees/);
                return true;
            });
            assert.throws(() => assertValidCoordinatePair(-90.01, 0), (err) => {
                assert(err instanceof CoordinateBoundaryError);
                assert.strictEqual(err.latitude, -90.01);
                return true;
            });
        });
        it("should reject longitude outside [-180, +180] in strict mode", () => {
            assert.throws(() => assertValidCoordinatePair(0, 180.01), (err) => {
                assert(err instanceof CoordinateBoundaryError);
                assert.strictEqual(err.longitude, 180.01);
                assert.match(err.message, /Longitude must be within \[-180, \+180\] degrees/);
                return true;
            });
            assert.throws(() => assertValidCoordinatePair(0, -180.01), (err) => {
                assert(err instanceof CoordinateBoundaryError);
                return true;
            });
        });
        it("should allow longitude in [0, 360] range when allowNormalizedPositiveLon is enabled", () => {
            // 350 deg lon should throw in strict mode
            assert.throws(() => assertValidCoordinatePair(0, 350));
            // 350 deg lon passes when allowNormalizedPositiveLon is true
            assert.doesNotThrow(() => assertValidCoordinatePair(0, 350, { allowNormalizedPositiveLon: true }));
            // Still rejects > 360 + epsilon
            assert.throws(() => assertValidCoordinatePair(0, 360.5, { allowNormalizedPositiveLon: true }));
        });
    });
    describe("3. IEEE 754 Sanity & Type Violations", () => {
        it("should reject NaN for latitude and longitude", () => {
            assert.throws(() => assertValidCoordinatePair(NaN, 0), CoordinateBoundaryError);
            assert.throws(() => assertValidCoordinatePair(0, NaN), CoordinateBoundaryError);
            assert.strictEqual(isValidCoordinatePair(NaN, 0), false);
            assert.strictEqual(isValidCoordinatePair(0, NaN), false);
        });
        it("should reject +/- Infinity", () => {
            assert.throws(() => assertValidCoordinatePair(Infinity, 0), CoordinateBoundaryError);
            assert.throws(() => assertValidCoordinatePair(0, -Infinity), CoordinateBoundaryError);
            assert.strictEqual(isValidCoordinatePair(Infinity, 0), false);
        });
        it("should reject non-numeric and null/undefined values", () => {
            assert.throws(() => assertValidCoordinatePair(null, 0), CoordinateBoundaryError);
            assert.throws(() => assertValidCoordinatePair(undefined, 0), CoordinateBoundaryError);
            assert.throws(() => assertValidCoordinatePair("10", 20), CoordinateBoundaryError);
            assert.throws(() => assertValidCoordinatePair({}), CoordinateBoundaryError);
        });
    });
    describe("4. Context Reporting in CoordinateBoundaryError", () => {
        it("should attach contextual description when provided as string or option", () => {
            try {
                assertValidCoordinatePair(95, 0, "TestLayer.fluxKernel");
                assert.fail("Should have thrown");
            }
            catch (err) {
                assert(err instanceof CoordinateBoundaryError);
                assert.strictEqual(err.violationContext, "TestLayer.fluxKernel");
                assert.match(err.message, /in TestLayer\.fluxKernel/);
            }
            try {
                assertValidCoordinatePair({ lat: 100, lon: 0 }, { context: "AdjacencyMatrix.build" });
                assert.fail("Should have thrown");
            }
            catch (err) {
                assert(err instanceof CoordinateBoundaryError);
                assert.strictEqual(err.violationContext, "AdjacencyMatrix.build");
                assert.match(err.message, /in AdjacencyMatrix\.build/);
            }
        });
    });
    describe("5. H3AdjacencyService Gating & Calculations", () => {
        it("should calculate great-circle distance accurately between valid coordinates", () => {
            // Equator 1 degree longitude separation ~ 111.19 km
            const d = H3AdjacencyService.getGreatCircleDistance(0, 0, 0, 1);
            assert(Math.abs(d - 111195) < 200);
        });
        it("should reject invalid coordinates in distance calculation", () => {
            assert.throws(() => H3AdjacencyService.getGreatCircleDistance(91, 0, 0, 0), CoordinateBoundaryError);
            assert.throws(() => H3AdjacencyService.getGreatCircleDistance(0, 0, 0, -181), CoordinateBoundaryError);
        });
        it("should calculate bearings and reject invalid coordinates", () => {
            // Due north from Equator
            const bearingNorth = H3AdjacencyService.latLonToBearing(0, 0, 10, 0);
            assert(Math.abs(bearingNorth - 0) < 1e-4);
            // Due east along Equator
            const bearingEast = H3AdjacencyService.latLonToBearing(0, 0, 0, 10);
            assert(Math.abs(bearingEast - 90) < 1e-4);
            assert.throws(() => H3AdjacencyService.latLonToBearing(95, 0, 0, 0), CoordinateBoundaryError);
        });
        it("should find nearest neighbors with strict candidate coordinate validation", () => {
            const candidates = [
                { id: "p1", lat: 10, lon: 10 },
                { id: "p2", lat: 1, lon: 1 },
                { id: "p3", lat: 50, lon: 50 },
            ];
            const nearest = H3AdjacencyService.findKNearestNeighbors(0, 0, candidates, 2);
            assert.strictEqual(nearest.length, 2);
            assert.strictEqual(nearest[0].item.id, "p2");
            assert.strictEqual(nearest[1].item.id, "p1");
            // With corrupted candidate
            const corruptedCandidates = [
                { id: "p1", lat: 10, lon: 10 },
                { id: "corrupt", lat: 120, lon: 10 },
            ];
            assert.throws(() => H3AdjacencyService.findKNearestNeighbors(0, 0, corruptedCandidates, 2), CoordinateBoundaryError);
        });
    });
    describe("6. Thermodynamic Invariants & SpatialTransportMonad Conservation", () => {
        const nodeA = {
            cellId: "cell_A",
            coords: { lat: 10.0, lon: 20.0 },
            stock: {
                carbonKg: 5000,
                nitrogenKg: 1000,
                phosphorusKg: 200,
                waterKg: 80000,
                oxygenKg: 1500,
                thermalJoules: 1e9,
            },
            hydraulicHeadMeters: 50.0,
            temperatureKelvin: 295.15,
        };
        const nodeB = {
            cellId: "cell_B",
            coords: { lat: 10.5, lon: 20.5 },
            stock: {
                carbonKg: 3000,
                nitrogenKg: 800,
                phosphorusKg: 150,
                waterKg: 60000,
                oxygenKg: 1200,
                thermalJoules: 8e8,
            },
            hydraulicHeadMeters: 20.0,
            temperatureKelvin: 290.15,
        };
        it("should enforce exact First Law mass and thermal conservation under advection", () => {
            const monad0 = SpatialTransportMonad.of([nodeA, nodeB]);
            const initialTotal = monad0.totalStock();
            // Step advective transfer from A (head 50m) to B (head 20m)
            const crossSectionM2 = 500.0;
            const dtSeconds = 3600.0;
            const monad1 = monad0.stepAdvection("cell_A", "cell_B", crossSectionM2, dtSeconds);
            const finalTotal = monad1.totalStock();
            // Verify absolute First Law closure: sum(Delta) = 0
            const deltaCarbon = Math.abs(finalTotal.carbonKg - initialTotal.carbonKg);
            const deltaNitrogen = Math.abs(finalTotal.nitrogenKg - initialTotal.nitrogenKg);
            const deltaPhosphorus = Math.abs(finalTotal.phosphorusKg - initialTotal.phosphorusKg);
            const deltaWater = Math.abs(finalTotal.waterKg - initialTotal.waterKg);
            const deltaOxygen = Math.abs(finalTotal.oxygenKg - initialTotal.oxygenKg);
            const deltaThermal = Math.abs(finalTotal.thermalJoules - initialTotal.thermalJoules);
            assert(deltaCarbon < 1e-9, `Carbon drift: ${deltaCarbon}`);
            assert(deltaNitrogen < 1e-9, `Nitrogen drift: ${deltaNitrogen}`);
            assert(deltaPhosphorus < 1e-9, `Phosphorus drift: ${deltaPhosphorus}`);
            assert(deltaWater < 1e-9, `Water drift: ${deltaWater}`);
            assert(deltaOxygen < 1e-9, `Oxygen drift: ${deltaOxygen}`);
            assert(deltaThermal < 1e-4, `Thermal drift: ${deltaThermal}`);
            // Verify transfer occurred in the direction of hydraulic gradient (A -> B)
            const nextA = monad1.get("cell_A");
            const nextB = monad1.get("cell_B");
            assert(nextA.stock.waterKg < nodeA.stock.waterKg);
            assert(nextB.stock.waterKg > nodeB.stock.waterKg);
        });
        it("should abort transport and prevent thermodynamic leakage if coordinates are corrupted", () => {
            const corruptedNode = {
                ...nodeB,
                cellId: "cell_corrupt",
                coords: { lat: 999.0, lon: 0.0 }, // Invalid latitude
            };
            assert.throws(() => SpatialTransportMonad.of([nodeA, corruptedNode]), CoordinateBoundaryError);
        });
    });
});

import { describe, it } from "node:test";
import assert from "node:assert";
import { calculateH3SharedBoundaryLength, getH3SharedBoundary, haversineDistance, EARTH_MEAN_RADIUS_METERS, H3AdjacencyGraph, getPentagonIndexes, getGridDisk, latLngToH3Cell, areNeighbors, } from "../src/spatial/h3_adjacency.js";
import { SpatialMonad, executeLateralThermodynamicTransportStep, } from "../src/monads/spatial_monad.js";
describe("Sprint 048 - Geometric Interface Contact Calculator (RFC-048)", () => {
    describe("Mathematical Foundations & Haversine Distance", () => {
        it("should compute zero distance for identical coordinates", () => {
            const coord = [37.7749, -122.4194];
            const d = haversineDistance(coord, coord);
            assert.strictEqual(d, 0.0);
        });
        it("should calculate correct pole-to-pole distance (~half circumference)", () => {
            const northPole = [90.0, 0.0];
            const southPole = [-90.0, 0.0];
            const d = haversineDistance(northPole, southPole);
            const expected = Math.PI * EARTH_MEAN_RADIUS_METERS;
            assert.ok(Math.abs(d - expected) < 1.0, `Expected ~${expected}, got ${d}`);
        });
        it("should satisfy exact symmetry for arbitrary coordinates", () => {
            const a = [48.8566, 2.3522];
            const b = [-33.8688, 151.2093];
            const dAB = haversineDistance(a, b);
            const dBA = haversineDistance(b, a);
            assert.strictEqual(dAB, dBA);
        });
    });
    describe("Topological Adjacency & Boundary Length Calculations", () => {
        it("should return 0.0 for identical origin and neighbor cells", () => {
            const cell = latLngToH3Cell(37.7749, -122.4194, 2);
            const length = calculateH3SharedBoundaryLength(cell, cell);
            const boundary = getH3SharedBoundary(cell, cell);
            assert.strictEqual(length, 0.0);
            assert.strictEqual(boundary.lengthMeters, 0.0);
            assert.strictEqual(boundary.isAdjacent, false);
        });
        it("should return 0.0 for non-adjacent (2-ring) cells", () => {
            const origin = latLngToH3Cell(0.0, 0.0, 2);
            const disk2 = getGridDisk(origin, 2);
            const disk1 = new Set(getGridDisk(origin, 1));
            const twoRingCell = disk2.find((c) => !disk1.has(c));
            assert.ok(twoRingCell, "Should identify a 2-ring cell");
            const length = calculateH3SharedBoundaryLength(origin, twoRingCell);
            assert.strictEqual(length, 0.0);
        });
        it("should return 0.0 for invalid or empty cell inputs", () => {
            assert.strictEqual(calculateH3SharedBoundaryLength("", "invalid"), 0.0);
            assert.strictEqual(calculateH3SharedBoundaryLength("invalid", "invalid"), 0.0);
        });
        it("should compute strictly positive shared edge lengths for adjacent 1-ring neighbors across resolutions 0, 1, 2, and 3", () => {
            const resolutions = [0, 1, 2, 3];
            for (const res of resolutions) {
                const origin = latLngToH3Cell(45.0, 10.0, res);
                const disk1 = getGridDisk(origin, 1);
                const neighbor = disk1.find((c) => c !== origin && areNeighbors(origin, c));
                assert.ok(neighbor, `Found valid neighbor at res ${res}`);
                const length = calculateH3SharedBoundaryLength(origin, neighbor);
                const boundary = getH3SharedBoundary(origin, neighbor);
                assert.ok(length > 0.0, `Length should be > 0 at resolution ${res}, got ${length}`);
                assert.strictEqual(boundary.isAdjacent, true);
                assert.ok(boundary.lengthMeters > 0.0);
                assert.ok(Array.isArray(boundary.vertexA) && boundary.vertexA.length === 2);
                assert.ok(Array.isArray(boundary.vertexB) && boundary.vertexB.length === 2);
            }
        });
        it("should enforce exact mathematical symmetry L_ij === L_ji for all adjacent pairs", () => {
            const origin = latLngToH3Cell(52.52, 13.405, 3);
            const neighbors = getGridDisk(origin, 1).filter((c) => c !== origin);
            for (const neighbor of neighbors) {
                const lAB = calculateH3SharedBoundaryLength(origin, neighbor);
                const lBA = calculateH3SharedBoundaryLength(neighbor, origin);
                assert.strictEqual(lAB, lBA, `Edge length between ${origin} and ${neighbor} must be symmetric`);
                const bAB = getH3SharedBoundary(origin, neighbor);
                const bBA = getH3SharedBoundary(neighbor, origin);
                assert.strictEqual(bAB.lengthMeters, bBA.lengthMeters);
                assert.deepStrictEqual(bAB.vertexA, bBA.vertexA);
                assert.deepStrictEqual(bAB.vertexB, bBA.vertexB);
            }
        });
    });
    describe("Pentagonal Cell Interface Verification", () => {
        it("should correctly calculate shared boundary lengths for resolution-1 pentagons and their 5 neighbors", () => {
            const pentagons = getPentagonIndexes(1);
            assert.strictEqual(pentagons.length, 12, "H3 resolution 1 must contain exactly 12 pentagons");
            for (const pentagon of pentagons) {
                const neighbors = getGridDisk(pentagon, 1).filter((c) => c !== pentagon);
                assert.strictEqual(neighbors.length, 5, `Pentagon ${pentagon} must have exactly 5 adjacent neighbors`);
                for (const neighbor of neighbors) {
                    const length = calculateH3SharedBoundaryLength(pentagon, neighbor);
                    const revLength = calculateH3SharedBoundaryLength(neighbor, pentagon);
                    assert.ok(length > 0.0, `Shared length between pentagon ${pentagon} and neighbor ${neighbor} must be > 0`);
                    assert.strictEqual(length, revLength, `Pentagonal shared edge length must be symmetric`);
                    const boundary = getH3SharedBoundary(pentagon, neighbor);
                    assert.strictEqual(boundary.isAdjacent, true);
                }
            }
        });
    });
    describe("Class Hierarchy & Calculator Integration", () => {
        it("H3BoundaryCalculator and H3AdjacencyGraph should calculate and cache boundaries correctly", () => {
            const graph = new H3AdjacencyGraph();
            const origin = latLngToH3Cell(35.6762, 139.6503, 2);
            const neighbor = getGridDisk(origin, 1).find((c) => c !== origin);
            graph.addAdjacency(origin, neighbor);
            const neighbors = graph.getNeighbors(origin);
            assert.ok(neighbors.includes(neighbor));
            const len1 = graph.calculateSharedBoundaryLength(origin, neighbor);
            const len2 = graph.calculateSharedBoundaryLength(origin, neighbor); // Cached
            assert.ok(len1 > 0.0);
            assert.strictEqual(len1, len2);
        });
    });
    describe("Thermodynamic Conservation & First Law Invariant", () => {
        it("should strictly conserve thermal energy (sum of deltas = 0) in closed lateral transport", () => {
            const origin = latLngToH3Cell(0.0, 0.0, 3);
            const neighbors = getGridDisk(origin, 1).filter((c) => c !== origin);
            const cells = new Map();
            const adjacencyList = new Map();
            const centroidDistances = new Map();
            // Populate origin with high temperature
            cells.set(origin, {
                h3Index: origin,
                energyJoules: 1e9,
                waterKg: 1000,
                carbonKg: 50,
                oxygenKg: 20,
                mineralsKg: 10,
                temperatureKelvin: 350.0,
                heightColumnMeters: 100.0,
                conductivity: 2.5,
            });
            adjacencyList.set(origin, neighbors);
            // Populate neighbors with lower temperature
            for (const n of neighbors) {
                cells.set(n, {
                    h3Index: n,
                    energyJoules: 5e8,
                    waterKg: 1000,
                    carbonKg: 50,
                    oxygenKg: 20,
                    mineralsKg: 10,
                    temperatureKelvin: 280.0,
                    heightColumnMeters: 100.0,
                    conductivity: 2.5,
                });
                adjacencyList.set(n, [origin]);
                centroidDistances.set(`${origin}_${n}`, 50000.0);
                centroidDistances.set(`${n}_${origin}`, 50000.0);
            }
            const dt = 3600.0; // 1 hour step
            const deltas = executeLateralThermodynamicTransportStep(cells, adjacencyList, centroidDistances, dt);
            let sumDeltaEnergy = 0.0;
            for (const delta of deltas.values()) {
                sumDeltaEnergy += delta.deltaEnergy;
            }
            // Energy conservation verified within machine precision
            assert.ok(Math.abs(sumDeltaEnergy) < 1e-9, `Total energy delta should be 0.0, got ${sumDeltaEnergy}`);
            // Verify Second Law direction: Hot origin lost energy, colder neighbors gained energy
            const originDelta = deltas.get(origin);
            assert.ok(originDelta.deltaEnergy < 0, "Origin cell at higher temperature must transfer heat to colder neighbors");
            for (const n of neighbors) {
                assert.ok(deltas.get(n).deltaEnergy > 0, "Colder neighbor cells must gain thermal energy");
            }
        });
        it("SpatialMonad step applies conservative state transitions across multiple steps", () => {
            const monad = new SpatialMonad();
            const origin = latLngToH3Cell(10.0, 10.0, 3);
            const neighbor = getGridDisk(origin, 1).find((c) => c !== origin);
            monad.registerCell({
                h3Index: origin,
                energyJoules: 1_000_000,
                waterKg: 100,
                carbonKg: 10,
                oxygenKg: 5,
                mineralsKg: 2,
                temperatureKelvin: 320.0,
                heightColumnMeters: 50.0,
                conductivity: 1.8,
            });
            monad.registerCell({
                h3Index: neighbor,
                energyJoules: 1_000_000,
                waterKg: 100,
                carbonKg: 10,
                oxygenKg: 5,
                mineralsKg: 2,
                temperatureKelvin: 290.0,
                heightColumnMeters: 50.0,
                conductivity: 1.8,
            });
            monad.connectNeighbors(origin, neighbor, 25000.0);
            const initialTotalEnergy = monad.getCell(origin).energyJoules + monad.getCell(neighbor).energyJoules;
            for (let step = 0; step < 5; step++) {
                monad.step(60.0);
            }
            const finalTotalEnergy = monad.getCell(origin).energyJoules + monad.getCell(neighbor).energyJoules;
            assert.ok(Math.abs(finalTotalEnergy - initialTotalEnergy) < 1e-9, `Energy conservation must hold across all steps: initial=${initialTotalEnergy}, final=${finalTotalEnergy}`);
        });
    });
});

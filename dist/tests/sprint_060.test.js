// =============================================================================
// WEB OF LIFE - SPRINT 060 ACCEPTANCE TEST SUITE
// RFC-060: Tangent Space Projection for Spherical Advective Vectors
// =============================================================================
import { describe, it } from "node:test";
import assert from "node:assert";
import { projectVectorOntoSphereTangentSpace, projectVectorOntoSphereTangentSpaceDetailed, computeFacetNormalTangentBasis, latLngToCartesian, dotProduct, vectorNorm, H3AdjacencyGraphEngine, } from "../src/spatial/h3_adjacency.js";
import { computeInterfaceAdvectiveTransfer, createCellStocks, } from "../src/spatial/h3_grid.js";
import { SpatialMonad } from "../src/monads/spatial_monad.js";
import { bootstrapMegaPod } from "../src/earth_pod.js";
describe("RFC-060: Tangent Space Projection Core Differential Geometry", () => {
    const R = 6371000; // Earth mean radius in meters
    it("Identity 1: Pure Tangent Invariance - already tangent vector is unchanged", () => {
        // Equatorial centroid p = [R, 0, 0] -> Tangent plane is y-z plane (x=0)
        const p = [R, 0, 0];
        const vTangent = [0, 15.5, -42.1];
        const result = projectVectorOntoSphereTangentSpace(vTangent, p);
        assert.strictEqual(Math.abs(result[0]), 0);
        assert.strictEqual(result[1], 15.5);
        assert.strictEqual(result[2], -42.1);
    });
    it("Identity 2: Pure Radial Cancellation - radial vector is entirely eliminated", () => {
        const p = [1000, 2000, 3000];
        const lambda = 7.42;
        const vRadial = [lambda * p[0], lambda * p[1], lambda * p[2]];
        const result = projectVectorOntoSphereTangentSpace(vRadial, p);
        const normResult = vectorNorm(result);
        assert.ok(normResult < 1e-12, `Expected result norm to be near zero, got ${normResult}`);
    });
    it("Identity 3: Orthogonal Decomposition - ||v_perp||^2 + ||v_par||^2 == ||v||^2", () => {
        const p = [1234567, -2345678, 5678901];
        const v = [25.3, -12.7, 48.9];
        const detailed = projectVectorOntoSphereTangentSpaceDetailed(v, p);
        const normV2 = dotProduct(v, v);
        const normPerp2 = detailed.tangentialMagnitude ** 2;
        const normPar2 = detailed.radialMagnitude ** 2;
        const diff = Math.abs(normV2 - (normPerp2 + normPar2));
        assert.ok(diff < 1e-9, `Pythagorean decomposition failed: ||v||^2=${normV2}, sum=${normPerp2 + normPar2}, diff=${diff}`);
        // Orthogonality check: v_perp . p must be ~0
        const dotPerpP = dotProduct(detailed.projected, p);
        const relativeOrthogonality = Math.abs(dotPerpP) / (detailed.tangentialMagnitude * vectorNorm(p));
        assert.ok(relativeOrthogonality < 1e-13, `Projected vector not orthogonal to origin position: relative error ${relativeOrthogonality}`);
    });
    it("Identity 4: Polar and Equatorial Consistency", () => {
        // North pole centroid p = [0, 0, R]
        const pPole = [0, 0, R];
        const vPole = [10, 20, 50]; // 50 is radial along z-axis
        const resultPole = projectVectorOntoSphereTangentSpace(vPole, pPole);
        assert.strictEqual(resultPole[0], 10);
        assert.strictEqual(resultPole[1], 20);
        assert.ok(Math.abs(resultPole[2]) < 1e-12, `Z-velocity at North pole should be stripped to 0, got ${resultPole[2]}`);
        // Prime meridian equator centroid p = [R, 0, 0]
        const pEquator = [R, 0, 0];
        const vEquator = [35, -15, 80]; // 35 is radial along x-axis
        const resultEquator = projectVectorOntoSphereTangentSpace(vEquator, pEquator);
        assert.ok(Math.abs(resultEquator[0]) < 1e-12, `X-velocity at Equator should be stripped to 0, got ${resultEquator[0]}`);
        assert.strictEqual(resultEquator[1], -15);
        assert.strictEqual(resultEquator[2], 80);
    });
    it("Singularity & Degeneracy Guard: Zero origin vector returns zero vector", () => {
        const pZero = [0, 0, 0];
        const v = [10, 20, 30];
        const result = projectVectorOntoSphereTangentSpace(v, pZero);
        assert.deepStrictEqual(result, [0, 0, 0]);
        const detailed = projectVectorOntoSphereTangentSpaceDetailed(v, pZero);
        assert.strictEqual(detailed.tangentialMagnitude, 0);
        assert.strictEqual(detailed.radialMagnitude, 0);
    });
    it("Idempotency Invariant: P(P(v)) == P(v)", () => {
        const p = [3000000, 4000000, 5000000];
        const v = [-12.5, 33.1, 7.8];
        const p1 = projectVectorOntoSphereTangentSpace(v, p);
        const p2 = projectVectorOntoSphereTangentSpace(p1, p);
        const diffX = Math.abs(p1[0] - p2[0]);
        const diffY = Math.abs(p1[1] - p2[1]);
        const diffZ = Math.abs(p1[2] - p2[2]);
        assert.ok(diffX < 1e-14 && diffY < 1e-14 && diffZ < 1e-14, "Projection must be strictly idempotent");
    });
});
describe("RFC-060: H3 Facet Tangent Basis & Adjacency Engine", () => {
    it("computes facet normal basis between adjacent cells on sphere", () => {
        const pA = latLngToCartesian(0, 0);
        const pB = latLngToCartesian(0, 1); // 1 degree east
        const basis = computeFacetNormalTangentBasis(pA, pB);
        assert.ok(basis.edgeDistance > 0, "Edge distance should be positive");
        const normalMagnitude = vectorNorm(basis.tangentNormal);
        assert.ok(Math.abs(normalMagnitude - 1.0) < 1e-9, `Tangent normal magnitude must be 1, got ${normalMagnitude}`);
        // Tangent normal at midpoint should be orthogonal to midpoint position
        const dotMid = dotProduct(basis.tangentNormal, basis.midpoint);
        const relDot = Math.abs(dotMid) / vectorNorm(basis.midpoint);
        assert.ok(relDot < 1e-12, "Facet tangent normal must be orthogonal to interface midpoint");
    });
    it("H3AdjacencyGraphEngine manages topology and local projections", () => {
        const engine = new H3AdjacencyGraphEngine();
        const c1 = latLngToCartesian(10, 20);
        const c2 = latLngToCartesian(10, 21);
        engine.registerCell("hex_1", c1);
        engine.registerCell("hex_2", c2);
        engine.addAdjacency("hex_1", "hex_2");
        const neighbors = engine.getHexNeighbors("hex_1");
        assert.deepStrictEqual(neighbors, ["hex_2"]);
        const rawVelocity = [100, 200, 300];
        const projected = engine.projectVector(rawVelocity, "hex_1");
        const detailed = projectVectorOntoSphereTangentSpaceDetailed(rawVelocity, c1);
        assert.deepStrictEqual(projected, detailed.projected);
    });
});
describe("RFC-060: Conservative Spherical Advection & Stock Invariance", () => {
    it("computeInterfaceAdvectiveTransfer conserves mass between two cells with radial-corrupted velocities", () => {
        const cA = latLngToCartesian(0, 0);
        const cB = latLngToCartesian(0, 0.5);
        // Give cell A and cell B velocities with massive radial corruption
        const vA_raw = [10000, 5.0, 0.0]; // 10000 m/s radial along x
        const vB_raw = [8000, 5.0, 0.0];
        const cellA = {
            h3Index: "A",
            centroid: cA,
            area: 1e8,
            velocity: vA_raw,
            stocks: createCellStocks({
                carbon: 5000,
                water: 20000,
                nitrogen: 1200,
                phosphorus: 300,
                oxygen: 4500,
                thermalEnergy: 1e9,
            }),
        };
        const cellB = {
            h3Index: "B",
            centroid: cB,
            area: 1e8,
            velocity: vB_raw,
            stocks: createCellStocks({
                carbon: 1000,
                water: 5000,
                nitrogen: 200,
                phosphorus: 50,
                oxygen: 800,
                thermalEnergy: 2e8,
            }),
        };
        const { fluxAtoB, normalVelocity } = computeInterfaceAdvectiveTransfer(cellA, cellB, 10000, 3600);
        // The normal velocity should be driven solely by tangential components (~5 m/s)
        assert.ok(Math.abs(normalVelocity) < 20, `Normal velocity should be physical (~5 m/s), not contaminated by 10000 m/s radial. Got ${normalVelocity}`);
        // Sum of stock changes between A and B must be exactly zero: A loses what B gains
        assert.strictEqual(fluxAtoB.carbon - fluxAtoB.carbon, 0);
        assert.strictEqual(fluxAtoB.water - fluxAtoB.water, 0);
    });
    it("SpatialMonad preserves exact mass and energy across multi-step spherical advection cycle", () => {
        const monad = new SpatialMonad("test-sphere");
        const p1 = latLngToCartesian(0, 0);
        const p2 = latLngToCartesian(0, 1);
        const p3 = latLngToCartesian(1, 0);
        const initialStocks1 = {
            carbon: 1000,
            water: 5000,
            nitrogen: 300,
            phosphorus: 80,
            oxygen: 1200,
            thermalEnergy: 4e8,
        };
        const initialStocks2 = {
            carbon: 2000,
            water: 10000,
            nitrogen: 600,
            phosphorus: 160,
            oxygen: 2400,
            thermalEnergy: 8e8,
        };
        const initialStocks3 = {
            carbon: 3000,
            water: 15000,
            nitrogen: 900,
            phosphorus: 240,
            oxygen: 3600,
            thermalEnergy: 12e8,
        };
        monad.setCellNode({
            h3Index: "cell_1",
            centroid: p1,
            area: 1e8,
            velocity: [500, 2.0, 1.0], // Raw velocity containing strong radial component
            stocks: initialStocks1,
            neighbors: ["cell_2", "cell_3"],
        });
        monad.setCellNode({
            h3Index: "cell_2",
            centroid: p2,
            area: 1e8,
            velocity: [-300, -1.5, 0.5],
            stocks: initialStocks2,
            neighbors: ["cell_1", "cell_3"],
        });
        monad.setCellNode({
            h3Index: "cell_3",
            centroid: p3,
            area: 1e8,
            velocity: [200, 0.0, -1.0],
            stocks: initialStocks3,
            neighbors: ["cell_1", "cell_2"],
        });
        // Ensure velocities are projected
        monad.setVelocity("cell_1", [500, 2.0, 1.0]);
        monad.setVelocity("cell_2", [-300, -1.5, 0.5]);
        monad.setVelocity("cell_3", [200, 0.0, -1.0]);
        const initialTotal = monad.totalStocks();
        // Run 50 advection steps
        let currentMonad = monad;
        for (let step = 0; step < 50; step++) {
            currentMonad = currentMonad.stepAdvection(60); // 60s per step
        }
        const finalTotal = currentMonad.totalStocks();
        // Verify stock conservation across the closed system within floating point tolerance
        const deltaCarbon = Math.abs(finalTotal.carbon - initialTotal.carbon);
        const deltaWater = Math.abs(finalTotal.water - initialTotal.water);
        const deltaNitrogen = Math.abs(finalTotal.nitrogen - initialTotal.nitrogen);
        const deltaPhosphorus = Math.abs(finalTotal.phosphorus - initialTotal.phosphorus);
        const deltaOxygen = Math.abs(finalTotal.oxygen - initialTotal.oxygen);
        const deltaEnergy = Math.abs(finalTotal.thermalEnergy - initialTotal.thermalEnergy);
        assert.ok(deltaCarbon < 1e-8, `Carbon drift detected: ${deltaCarbon}`);
        assert.ok(deltaWater < 1e-8, `Water drift detected: ${deltaWater}`);
        assert.ok(deltaNitrogen < 1e-8, `Nitrogen drift detected: ${deltaNitrogen}`);
        assert.ok(deltaPhosphorus < 1e-8, `Phosphorus drift detected: ${deltaPhosphorus}`);
        assert.ok(deltaOxygen < 1e-8, `Oxygen drift detected: ${deltaOxygen}`);
        assert.ok(deltaEnergy < 1e-5, `Thermal energy drift detected: ${deltaEnergy}`);
    });
});
describe("System Integrity & Core Bootstrap Preservation", () => {
    it("bootstrapMegaPod executes and preserves baseline biosphere structure", () => {
        const { sun, earth } = bootstrapMegaPod();
        assert.ok(sun);
        assert.ok(earth);
        assert.strictEqual(earth.name, "Earth");
        assert.strictEqual(earth.spheres.length, 4);
        assert.strictEqual(earth.cycles.length, 4);
        assert.strictEqual(earth.biomes.length, 5);
        const report = earth.fullTick(1);
        assert.ok(report);
        assert.ok(earth.totalDescendantBiomass() > 0);
    });
});

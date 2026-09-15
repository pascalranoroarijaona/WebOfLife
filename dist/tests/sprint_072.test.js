import { describe, it } from 'node:test';
import assert from 'node:assert';
import { orderSharedBoundaryEndpointsByCentroid, orderSharedBoundaryEndpointsByCentroid3D, H3AdjacencyGraph, } from '../src/spatial/h3_adjacency.js';
import { computeOrientedEdgeFlux, SpatialFluxMonad, } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 072 - RFC-072: Centroid-Relative Boundary Ordering & Outward Normal Orientation', () => {
    it('INV-072-1: Outward normal dot product with centroid displacement is strictly positive', () => {
        // Cell A at origin (0, 0), Cell B at (2, 0)
        // Shared vertical boundary at x = 1 from y = -1 to y = 1
        const centroidA = [0, 0];
        const centroidB = [2, 0];
        const p1 = [1, -1];
        const p2 = [1, 1];
        const result = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);
        // Centroid displacement d = (2, 0)
        const [nx, ny] = result.outwardNormal;
        const dot = nx * (centroidB[0] - centroidA[0]) + ny * (centroidB[1] - centroidA[1]);
        assert.ok(dot > 0, `Expected outward normal dot product to be positive, got ${dot}`);
        // Normal should point toward +x: [1, 0]
        assert.strictEqual(Math.abs(nx - 1.0) < 1e-10, true);
        assert.strictEqual(Math.abs(ny) < 1e-10, true);
        assert.strictEqual(result.isFlipped, false);
    });
    it('INV-072-2: Skew-symmetric inversion check: n_{B->A} == -n_{A->B}', () => {
        const centroidA = [0, 0];
        const centroidB = [2, 0];
        const p1 = [1, -1];
        const p2 = [1, 1];
        const resAtoB = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);
        const resBtoA = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidB, centroidA);
        // The outward normal for B->A must be opposite of A->B
        assert.strictEqual(Math.abs(resAtoB.outwardNormal[0] + resBtoA.outwardNormal[0]) < 1e-12, true);
        assert.strictEqual(Math.abs(resAtoB.outwardNormal[1] + resBtoA.outwardNormal[1]) < 1e-12, true);
        // Endpoints must be inverted
        assert.deepStrictEqual(resAtoB.orderedEndpoints[0], resBtoA.orderedEndpoints[1]);
        assert.deepStrictEqual(resAtoB.orderedEndpoints[1], resBtoA.orderedEndpoints[0]);
    });
    it('INV-072-3: Unit length normal verification: ||n|| = 1.0', () => {
        const centroidA = [3.5, 4.2];
        const centroidB = [7.1, 8.9];
        // Arbitrary inclined edge
        const p1 = [5.0, 7.0];
        const p2 = [6.0, 5.5];
        const res = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);
        const mag = Math.hypot(res.outwardNormal[0], res.outwardNormal[1]);
        assert.ok(Math.abs(mag - 1.0) < 1e-12, `Normal magnitude must be 1.0, got ${mag}`);
    });
    it('INV-072-4: Endpoints are strictly permuted, never altered or drifted', () => {
        const centroidA = [0, 0];
        const centroidB = [0, 2];
        const p1 = [-1, 1];
        const p2 = [1, 1];
        // Candidate edge from (-1, 1) to (1, 1). Right-hand normal candidate: (dy, -dx) = (0, -2) -> [0, -1]
        // Displacement d = (0, 2). Dot product = -1 * 2 = -2 < 0. Must flip!
        const res = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);
        assert.strictEqual(res.isFlipped, true);
        assert.deepStrictEqual(res.orderedEndpoints[0], p2);
        assert.deepStrictEqual(res.orderedEndpoints[1], p1);
        // Normal pointing toward (0, 1)
        assert.strictEqual(Math.abs(res.outwardNormal[0]) < 1e-10, true);
        assert.strictEqual(Math.abs(res.outwardNormal[1] - 1.0) < 1e-10, true);
    });
    it('3D Spherical S^2 ordering: correctly orients boundary and outward normal', () => {
        // Equator setup:
        // Cell A at lon 0 deg (x=1, y=0, z=0)
        // Cell B at lon 90 deg (x=0, y=1, z=0)
        // Shared boundary arc at lon 45 deg from lat -30 deg to lat +30 deg
        const centroidA = [1, 0, 0];
        const centroidB = [0, 1, 0];
        const rad45 = Math.PI / 4;
        const rad30 = Math.PI / 6;
        const cos30 = Math.cos(rad30);
        const sin30 = Math.sin(rad30);
        const p1 = [cos30 * Math.cos(rad45), cos30 * Math.sin(rad45), -sin30];
        const p2 = [cos30 * Math.cos(rad45), cos30 * Math.sin(rad45), sin30];
        const result = orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB);
        // Normal dot displacement
        const dx = centroidB[0] - centroidA[0];
        const dy = centroidB[1] - centroidA[1];
        const dz = centroidB[2] - centroidA[2];
        const dot = result.outwardNormal[0] * dx + result.outwardNormal[1] * dy + result.outwardNormal[2] * dz;
        assert.ok(dot > 0, `3D outward normal dot product must be positive, got ${dot}`);
        const normLen = Math.hypot(result.outwardNormal[0], result.outwardNormal[1], result.outwardNormal[2]);
        assert.ok(Math.abs(normLen - 1.0) < 1e-10, '3D normal must be unit length');
    });
    it('H3AdjacencyGraph: caching and getOrientedBoundary correctly caches results', () => {
        const graph = new H3AdjacencyGraph();
        graph.registerCell('hexA', [0, 0]);
        graph.registerCell('hexB', [10, 0]);
        graph.registerEdge('hexA', 'hexB', [5, -5], [5, 5]);
        const boundary1 = graph.getOrientedBoundary('hexA', 'hexB');
        const boundary2 = graph.getOrientedBoundary('hexA', 'hexB');
        assert.strictEqual(boundary1, boundary2, 'Subsequent calls must return cached reference');
        assert.deepStrictEqual(boundary1.start, [5, -5]);
        assert.deepStrictEqual(boundary1.end, [5, 5]);
        assert.ok(boundary1.outwardNormal[0] > 0.99);
        const reverseBoundary = graph.getOrientedBoundary('hexB', 'hexA');
        assert.deepStrictEqual(reverseBoundary.start, [5, 5]);
        assert.deepStrictEqual(reverseBoundary.end, [5, -5]);
        assert.ok(reverseBoundary.outwardNormal[0] < -0.99);
    });
    it('Thermodynamic First Law: Exact skew-symmetric flux balance between two cells', () => {
        const stateA = {
            thermalEnergyJoules: 100000,
            waterMassKg: 500,
            carbonMassKg: 50,
            oxygenMassKg: 10,
            mineralMassKg: 5,
        };
        const stateB = {
            thermalEnergyJoules: 50000,
            waterMassKg: 200,
            carbonMassKg: 20,
            oxygenMassKg: 4,
            mineralMassKg: 2,
        };
        const centroidA = [0, 0];
        const centroidB = [10, 0];
        const p1 = [5, -5];
        const p2 = [5, 5];
        const fluxAtoB = computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, p1, p2, 1.0 // dt = 1s
        );
        const fluxBtoA = computeOrientedEdgeFlux(stateB, stateA, centroidB, centroidA, p1, p2, 1.0);
        // Exact skew-symmetry of flux deltas
        assert.ok(Math.abs(fluxAtoB.deltas.deltaThermalJoules + fluxBtoA.deltas.deltaThermalJoules) < 1e-10);
        assert.ok(Math.abs(fluxAtoB.deltas.deltaWaterKg + fluxBtoA.deltas.deltaWaterKg) < 1e-10);
        assert.ok(Math.abs(fluxAtoB.deltas.deltaCarbonKg + fluxBtoA.deltas.deltaCarbonKg) < 1e-10);
        assert.ok(Math.abs(fluxAtoB.deltas.deltaOxygenKg + fluxBtoA.deltas.deltaOxygenKg) < 1e-10);
        assert.ok(Math.abs(fluxAtoB.deltas.deltaMineralKg + fluxBtoA.deltas.deltaMineralKg) < 1e-10);
    });
    it('SpatialFluxMonad: Zero-sum conservation over multiple simulation steps', () => {
        const graph = new H3AdjacencyGraph();
        graph.registerCell('C1', [0, 0]);
        graph.registerCell('C2', [2, 0]);
        graph.registerEdge('C1', 'C2', [1, -1], [1, 1]);
        const initialC1 = {
            thermalEnergyJoules: 200000,
            waterMassKg: 1000,
            carbonMassKg: 100,
            oxygenMassKg: 50,
            mineralMassKg: 20,
        };
        const initialC2 = {
            thermalEnergyJoules: 100000,
            waterMassKg: 500,
            carbonMassKg: 50,
            oxygenMassKg: 25,
            mineralMassKg: 10,
        };
        const initialTotalThermal = initialC1.thermalEnergyJoules + initialC2.thermalEnergyJoules;
        const initialTotalWater = initialC1.waterMassKg + initialC2.waterMassKg;
        const initialTotalCarbon = initialC1.carbonMassKg + initialC2.carbonMassKg;
        const monad = new SpatialFluxMonad(graph, {
            C1: initialC1,
            C2: initialC2,
        });
        // Run 10 steps
        for (let t = 0; t < 10; t++) {
            monad.step(0.5);
        }
        const finalC1 = monad.getCellState('C1');
        const finalC2 = monad.getCellState('C2');
        const finalTotalThermal = finalC1.thermalEnergyJoules + finalC2.thermalEnergyJoules;
        const finalTotalWater = finalC1.waterMassKg + finalC2.waterMassKg;
        const finalTotalCarbon = finalC1.carbonMassKg + finalC2.carbonMassKg;
        assert.ok(Math.abs(finalTotalThermal - initialTotalThermal) < 1e-8, 'Thermal energy must be strictly conserved');
        assert.ok(Math.abs(finalTotalWater - initialTotalWater) < 1e-8, 'Water mass must be strictly conserved');
        assert.ok(Math.abs(finalTotalCarbon - initialTotalCarbon) < 1e-8, 'Carbon mass must be strictly conserved');
    });
});

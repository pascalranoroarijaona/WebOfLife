// =============================================================================
// WEB OF LIFE - SPRINT 068 TEST SUITE
// RFC-068: Shared Boundary Vertex Extraction in 3D Spherical Manifold
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractSharedBoundaryVertices3D, computeSharedInterfaceGeometry3D, transferStocksAcrossBoundary3D, SpatialAdjacencyGraph, h3LatLngToCell, h3GridDisk, h3GetPentagons, EARTH_RADIUS_METERS, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 068: Shared Boundary Vertex Extraction in 3D Spherical Manifold', () => {
    // Test cell indices at resolution 7
    const cellCenter = h3LatLngToCell(37.7749, -122.4194, 7);
    const disk = h3GridDisk(cellCenter, 1);
    const neighborCell = disk.find((c) => c !== cellCenter);
    const nonNeighborCell = h3LatLngToCell(48.8566, 2.3522, 7); // Paris, France
    it('TC-068-01: Shared vertices for adjacent hexagonal cells', () => {
        const vertices = extractSharedBoundaryVertices3D(cellCenter, neighborCell, EARTH_RADIUS_METERS);
        assert.ok(vertices !== null, 'Expected non-null shared boundary vertices for adjacent cells');
        assert.strictEqual(vertices.length, 2, 'Must return exactly 2 endpoint vertices');
        const [v1, v2] = vertices;
        // Both vertices must lie on the sphere of radius R
        const r1 = Math.hypot(v1[0], v1[1], v1[2]);
        const r2 = Math.hypot(v2[0], v2[1], v2[2]);
        assert.ok(Math.abs(r1 - EARTH_RADIUS_METERS) < 1.0, `v1 radius error: ${Math.abs(r1 - EARTH_RADIUS_METERS)}`);
        assert.ok(Math.abs(r2 - EARTH_RADIUS_METERS) < 1.0, `v2 radius error: ${Math.abs(r2 - EARTH_RADIUS_METERS)}`);
        // Vertices must be distinct
        const distBetweenEndpoints = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
        assert.ok(distBetweenEndpoints > 10.0, 'Endpoints must be distinct');
    });
    it('TC-068-02: Non-adjacent cell query returns null', () => {
        const result = extractSharedBoundaryVertices3D(cellCenter, nonNeighborCell, EARTH_RADIUS_METERS);
        assert.strictEqual(result, null, 'Non-adjacent cells must yield null');
    });
    it('TC-068-03: Self-adjacency check (cellA === cellB) returns null', () => {
        const result = extractSharedBoundaryVertices3D(cellCenter, cellCenter, EARTH_RADIUS_METERS);
        assert.strictEqual(result, null, 'Self-adjacency check must return null without throwing');
    });
    it('TC-068-04: Boundary edge length matches Great Circle Distance', () => {
        const geom = computeSharedInterfaceGeometry3D(cellCenter, neighborCell, undefined, undefined, 1.0, EARTH_RADIUS_METERS);
        assert.ok(geom !== null, 'Boundary geometry should not be null');
        const { v1, v2, lengthMeters } = geom;
        const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (EARTH_RADIUS_METERS * EARTH_RADIUS_METERS);
        const expectedLength = EARTH_RADIUS_METERS * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
        assert.ok(Math.abs(lengthMeters - expectedLength) < 1e-6, 'Length must match spherical arc calculation');
        assert.ok(lengthMeters > 500 && lengthMeters < 3000, `H3 Res 7 edge length in expected range: ${lengthMeters}m`);
    });
    it('TC-068-05: Normal vector antisymmetry across interfaces', () => {
        const geomAB = computeSharedInterfaceGeometry3D(cellCenter, neighborCell, undefined, undefined, 1.0, EARTH_RADIUS_METERS);
        const geomBA = computeSharedInterfaceGeometry3D(neighborCell, cellCenter, undefined, undefined, 1.0, EARTH_RADIUS_METERS);
        assert.ok(geomAB !== null);
        assert.ok(geomBA !== null);
        const nAB = geomAB.normalAtoB;
        const nBA = geomBA.normalAtoB;
        const dotProduct = nAB[0] * nBA[0] + nAB[1] * nBA[1] + nAB[2] * nBA[2];
        assert.ok(Math.abs(dotProduct - (-1.0)) < 1e-7, `Normal vector dot product must be -1.0 within 1e-7, got: ${dotProduct}`);
    });
    it('TC-068-06: Pentagonal-hexagonal neighbor boundary extraction', () => {
        const pentagons = h3GetPentagons(3);
        if (pentagons.length > 0) {
            const pentagon = pentagons[0];
            const pentagonNeighbors = h3GridDisk(pentagon, 1).filter((c) => c !== pentagon);
            assert.ok(pentagonNeighbors.length > 0, 'Pentagon should have neighbors');
            const hexNeighbor = pentagonNeighbors[0];
            const vertices = extractSharedBoundaryVertices3D(pentagon, hexNeighbor, EARTH_RADIUS_METERS);
            assert.ok(vertices !== null, 'Pentagon-hexagon shared interface must be resolvable');
            assert.strictEqual(vertices.length, 2, 'Must yield 2 boundary endpoints');
        }
    });
    it('TC-068-07: First Law conservation and non-negative entropy generation', () => {
        const geom = computeSharedInterfaceGeometry3D(cellCenter, neighborCell, undefined, undefined, 10.0, EARTH_RADIUS_METERS);
        assert.ok(geom !== null);
        const stateA = {
            massWaterKg: 10000.0,
            massCarbonKg: 500.0,
            massMineralsKg: 250.0,
            massOxygenKg: 300.0,
            enthalpyJoules: 1e9,
            temperatureKelvin: 295.15,
            volumeM3: 50000.0,
        };
        const stateB = {
            massWaterKg: 8000.0,
            massCarbonKg: 600.0,
            massMineralsKg: 200.0,
            massOxygenKg: 320.0,
            enthalpyJoules: 9.5e8,
            temperatureKelvin: 288.15,
            volumeM3: 50000.0,
        };
        const velocityMidpoint = [0.5, -0.2, 0.1];
        const dt = 60.0; // 1 minute step
        const transfer = transferStocksAcrossBoundary3D(geom, stateA, stateB, velocityMidpoint, 1e-5, // D_w
        1e-6, // D_c
        1e-7, // D_m
        1e-5, // D_o
        0.6, // k_th
        dt);
        // Exact Zero-Sum Conservation across shared facet
        assert.strictEqual(transfer.deltaCellA.massWaterKg + transfer.deltaCellB.massWaterKg, 0.0, 'Water mass conservation violated');
        assert.strictEqual(transfer.deltaCellA.massCarbonKg + transfer.deltaCellB.massCarbonKg, 0.0, 'Carbon mass conservation violated');
        assert.strictEqual(transfer.deltaCellA.massMineralsKg + transfer.deltaCellB.massMineralsKg, 0.0, 'Mineral mass conservation violated');
        assert.strictEqual(transfer.deltaCellA.massOxygenKg + transfer.deltaCellB.massOxygenKg, 0.0, 'Oxygen mass conservation violated');
        assert.strictEqual(transfer.deltaCellA.enthalpyJoules + transfer.deltaCellB.enthalpyJoules, 0.0, 'Enthalpy conservation violated');
        // Second Law Compliance: Irreversible entropy generation rate >= 0
        assert.ok(transfer.entropyGenerationJoulesPerKelvin >= 0.0, `Entropy generation must be non-negative, got: ${transfer.entropyGenerationJoulesPerKelvin}`);
    });
    it('SpatialAdjacencyGraph caching and edge transmissibility', () => {
        const graph = new SpatialAdjacencyGraph(EARTH_RADIUS_METERS);
        const edge1 = graph.getSharedEdge(cellCenter, neighborCell);
        const edge2 = graph.getSharedEdge(cellCenter, neighborCell);
        assert.strictEqual(edge1, edge2, 'Repeated call must return cached reference');
        const edgeReverse = graph.getSharedEdge(neighborCell, cellCenter);
        assert.ok(edgeReverse !== null);
        assert.strictEqual(edgeReverse.cellA, neighborCell);
        assert.strictEqual(edgeReverse.cellB, cellCenter);
        assert.strictEqual(edgeReverse.normalAtoB[0], -edge1.normalAtoB[0]);
        const transmissibility = graph.computeEdgeTransmissibility(cellCenter, neighborCell);
        assert.ok(transmissibility > 0, `Transmissibility must be positive: ${transmissibility}`);
    });
});

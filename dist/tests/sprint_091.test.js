import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApertureClassForResolution, getResolutionApertureInfo, computeH3EdgeNormals, computeInterfaceFluxDeltas, H3AdjacencyGraph, CLASS_III_ROTATION_RADIANS, CLASS_III_ROTATION_DEGREES, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 091: H3 Aperture Classification & Orientation Dynamics', () => {
    it('correctly maps even resolutions to CLASS_II and odd resolutions to CLASS_III up to res 15', () => {
        const expected = [
            'CLASS_II', // 0
            'CLASS_III', // 1
            'CLASS_II', // 2
            'CLASS_III', // 3
            'CLASS_II', // 4
            'CLASS_III', // 5
            'CLASS_II', // 6
            'CLASS_III', // 7
            'CLASS_II', // 8
            'CLASS_III', // 9
            'CLASS_II', // 10
            'CLASS_III', // 11
            'CLASS_II', // 12
            'CLASS_III', // 13
            'CLASS_II', // 14
            'CLASS_III', // 15
        ];
        for (let r = 0; r <= 15; r++) {
            const cls = getApertureClassForResolution(r);
            assert.strictEqual(cls, expected[r], `Resolution ${r} must be ${expected[r]}`);
        }
    });
    it('throws RangeError on negative resolutions or non-integers', () => {
        assert.throws(() => getApertureClassForResolution(-1), RangeError);
        assert.throws(() => getApertureClassForResolution(-10), RangeError);
        assert.throws(() => getApertureClassForResolution(1.5), RangeError);
        assert.throws(() => getApertureClassForResolution(2.7), RangeError);
        assert.throws(() => getApertureClassForResolution(NaN), RangeError);
        assert.throws(() => getApertureClassForResolution(Infinity), RangeError);
        assert.throws(() => getApertureClassForResolution(-Infinity), RangeError);
    });
    it('computes accurate resolution aperture info metadata', () => {
        const infoEven = getResolutionApertureInfo(2);
        assert.strictEqual(infoEven.resolution, 2);
        assert.strictEqual(infoEven.apertureClass, 'CLASS_II');
        assert.strictEqual(infoEven.rotationAngleDegrees, 0.0);
        assert.strictEqual(infoEven.isRotated, false);
        const infoOdd = getResolutionApertureInfo(3);
        assert.strictEqual(infoOdd.resolution, 3);
        assert.strictEqual(infoOdd.apertureClass, 'CLASS_III');
        assert.strictEqual(infoOdd.rotationAngleDegrees, CLASS_III_ROTATION_DEGREES);
        assert.strictEqual(infoOdd.isRotated, true);
    });
    it('computes rotated edge normal vectors according to SO(2) rotation', () => {
        const normalsClassII = computeH3EdgeNormals(0);
        assert.strictEqual(normalsClassII.apertureClass, 'CLASS_II');
        assert.strictEqual(normalsClassII.rotationRadians, 0.0);
        // Edge 0 at angle 0: nx = 1, ny = 0
        assert.strictEqual(Math.round(normalsClassII.normalVectors[0].nx), 1);
        assert.strictEqual(Math.round(normalsClassII.normalVectors[0].ny), 0);
        const normalsClassIII = computeH3EdgeNormals(1);
        assert.strictEqual(normalsClassIII.apertureClass, 'CLASS_III');
        assert.strictEqual(normalsClassIII.rotationRadians, CLASS_III_ROTATION_RADIANS);
        // Edge 0 at angle alpha: cos(alpha) ≈ 0.944911, sin(alpha) ≈ 0.327327
        const edge0 = normalsClassIII.normalVectors[0];
        assert.ok(Math.abs(edge0.nx - Math.cos(CLASS_III_ROTATION_RADIANS)) < 1e-9);
        assert.ok(Math.abs(edge0.ny - Math.sin(CLASS_III_ROTATION_RADIANS)) < 1e-9);
    });
    it('delegates aperture classification cleanly through H3AdjacencyGraph', () => {
        const graphDefault = new H3AdjacencyGraph(4);
        assert.strictEqual(graphDefault.getResolutionApertureClass(), 'CLASS_II');
        assert.strictEqual(graphDefault.getResolutionApertureClass(5), 'CLASS_III');
        assert.strictEqual(graphDefault.getApertureClass(7), 'CLASS_III');
        const graphUnset = new H3AdjacencyGraph();
        assert.throws(() => graphUnset.getResolutionApertureClass(), RangeError);
        assert.strictEqual(graphUnset.getResolutionApertureClass(8), 'CLASS_II');
        graphDefault.registerCell('841f91bffffffff', ['841f918ffffffff', '841f919ffffffff']);
        const neighbors = graphDefault.getNeighbors('841f91bffffffff');
        assert.strictEqual(neighbors.length, 2);
        const edges = graphDefault.getDirectedEdges('841f91bffffffff');
        assert.strictEqual(edges.length, 2);
        assert.strictEqual(edges[0].origin, '841f91bffffffff');
        assert.strictEqual(edges[0].destination, '841f918ffffffff');
        assert.strictEqual(edges[0].directionIndex, 0);
    });
    it('preserves strict First Law mass-energy conservation during flux transport', () => {
        const stateI = {
            carbon_kg: 500,
            water_kg: 1000,
            oxygen_kg: 250,
            nitrogen_kg: 80,
            minerals_kg: 40,
            thermal_energy_kj: 20000,
        };
        const neighborState = (factor) => ({
            carbon_kg: 400 * factor,
            water_kg: 900 * factor,
            oxygen_kg: 200 * factor,
            nitrogen_kg: 70 * factor,
            minerals_kg: 35 * factor,
            thermal_energy_kj: 18000 * factor,
        });
        const neighbors = [
            neighborState(1.0),
            neighborState(0.9),
            neighborState(1.1),
            neighborState(0.95),
            neighborState(1.05),
            neighborState(0.98),
        ];
        const field = {
            vx: 1.5,
            vy: -0.5,
            diffusionCoefficient: 0.05,
            thermalConductivity: 0.8,
        };
        // Test on both CLASS_II (res = 8) and CLASS_III (res = 9)
        for (const testRes of [8, 9]) {
            const geometry = {
                resolution: testRes,
                edgeLengthMeters: 100,
                heightMeters: 10,
            };
            const { deltaSelf, deltaNeighbors } = computeInterfaceFluxDeltas(stateI, neighbors, geometry, field, 1.0);
            const netDeltaCarbon = deltaSelf.carbon_kg + deltaNeighbors.reduce((acc, n) => acc + n.carbon_kg, 0);
            const netDeltaWater = deltaSelf.water_kg + deltaNeighbors.reduce((acc, n) => acc + n.water_kg, 0);
            const netDeltaEnergy = deltaSelf.thermal_energy_kj + deltaNeighbors.reduce((acc, n) => acc + n.thermal_energy_kj, 0);
            assert.ok(Math.abs(netDeltaCarbon) < 1e-9, `Carbon conservation failed at res ${testRes}`);
            assert.ok(Math.abs(netDeltaWater) < 1e-9, `Water conservation failed at res ${testRes}`);
            assert.ok(Math.abs(netDeltaEnergy) < 1e-9, `Energy conservation failed at res ${testRes}`);
        }
    });
});

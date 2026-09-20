// =============================================================================
// WEB OF LIFE - SPRINT 091 TEST SUITE
// Aperture-7 Orientation Dynamics & Class II vs Class III Alignment
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getApertureClassForResolution, getResolutionApertureInfo, computeH3EdgeNormals, computeInterfaceFluxDeltas, analyzeApertureStructure, calculateApertureHexagonalOffset, computeCoarseningDriftVector, coarsenHexagonalPatchFlux, CLASS_III_ROTATION_DEGREES, CLASS_III_ROTATION_RADIANS, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 091: Aperture-7 Orientation Dynamics & Coarsening Operators', () => {
    it('verifies alternating Class II and Class III aperture classifications up to resolution 15', () => {
        for (let r = 0; r <= 15; r++) {
            const expectedClass = r % 2 === 0 ? 'CLASS_II' : 'CLASS_III';
            assert.strictEqual(getApertureClassForResolution(r), expectedClass);
            const info = getResolutionApertureInfo(r);
            assert.strictEqual(info.resolution, r);
            assert.strictEqual(info.apertureClass, expectedClass);
            if (expectedClass === 'CLASS_III') {
                assert.strictEqual(info.isRotated, true);
                assert.ok(Math.abs(info.rotationAngleDegrees - CLASS_III_ROTATION_DEGREES) < 1e-6);
                assert.ok(Math.abs(info.rotationAngleRadians - CLASS_III_ROTATION_RADIANS) < 1e-6);
            }
            else {
                assert.strictEqual(info.isRotated, false);
                assert.strictEqual(info.rotationAngleDegrees, 0.0);
                assert.strictEqual(info.rotationAngleRadians, 0.0);
            }
        }
    });
    it('computes edge normal vectors with aperture rotation angles', () => {
        const normalsClassII = computeH3EdgeNormals(0);
        assert.strictEqual(normalsClassII.normalVectors.length, 6);
        assert.strictEqual(normalsClassII.rotationRadians, 0.0);
        const normalsClassIII = computeH3EdgeNormals(1);
        assert.strictEqual(normalsClassIII.normalVectors.length, 6);
        assert.ok(Math.abs(normalsClassIII.rotationRadians - CLASS_III_ROTATION_RADIANS) < 1e-9);
        for (const n of normalsClassIII.normalVectors) {
            const mag = Math.hypot(n.nx, n.ny);
            assert.ok(Math.abs(mag - 1.0) < 1e-9, 'Normal vector must be unit length');
        }
    });
    it('computes multi-channel interface flux deltas and conserves matter and energy', () => {
        const stateI = {
            carbon_kg: 100.0,
            water_kg: 500.0,
            oxygen_kg: 50.0,
            nitrogen_kg: 20.0,
            minerals_kg: 10.0,
            thermal_energy_kj: 10000.0,
        };
        const neighbors = [
            { carbon_kg: 80.0, water_kg: 400.0, oxygen_kg: 40.0, nitrogen_kg: 15.0, minerals_kg: 8.0, thermal_energy_kj: 8000.0 },
            { carbon_kg: 90.0, water_kg: 450.0, oxygen_kg: 45.0, nitrogen_kg: 18.0, minerals_kg: 9.0, thermal_energy_kj: 9000.0 },
        ];
        const geom = {
            resolution: 7,
            edgeLengthMeters: 1220.0,
            heightMeters: 100.0,
        };
        const field = {
            vx: 2.0,
            vy: 1.5,
            diffusionCoefficient: 0.1,
            thermalConductivity: 1.5,
        };
        const result = computeInterfaceFluxDeltas(stateI, neighbors, geom, field, 1.0);
        assert.ok(result.deltaNeighbors.length === 2);
        const sumNeighborCarbon = result.deltaNeighbors.reduce((acc, n) => acc + n.carbon_kg, 0);
        const sumNeighborWater = result.deltaNeighbors.reduce((acc, n) => acc + n.water_kg, 0);
        const sumNeighborEnergy = result.deltaNeighbors.reduce((acc, n) => acc + n.thermal_energy_kj, 0);
        assert.ok(Math.abs(result.deltaSelf.carbon_kg + sumNeighborCarbon) < 1e-9, 'Carbon flux must be strictly conservative');
        assert.ok(Math.abs(result.deltaSelf.water_kg + sumNeighborWater) < 1e-9, 'Water flux must be strictly conservative');
        assert.ok(Math.abs(result.deltaSelf.thermal_energy_kj + sumNeighborEnergy) < 1e-9, 'Thermal energy flux must be strictly conservative');
    });
    it('analyzes hierarchical aperture sequence and coarsening drift vector', () => {
        const centerIndex = '8828308281fffff';
        const analysis = analyzeApertureStructure(centerIndex);
        assert.strictEqual(typeof analysis.resolution, 'number');
        assert.ok(Array.isArray(analysis.digitSequence));
        const offset = calculateApertureHexagonalOffset(centerIndex);
        assert.ok(Number.isFinite(offset.x));
        assert.ok(Number.isFinite(offset.y));
        const drift = computeCoarseningDriftVector(centerIndex, '872830828ffffff');
        assert.ok(Number.isFinite(drift.x));
        assert.ok(Number.isFinite(drift.y));
    });
    it('coarsens hexagonal children patch fluxes into parent cell with thermodynamic closure', () => {
        const children = [
            { stock: { carbonMol: 10, waterKg: 50, mineralsMol: 2, oxygenMol: 5, enthalpyJoules: 1000 } },
            { stock: { carbonMol: 20, waterKg: 70, mineralsMol: 3, oxygenMol: 7, enthalpyJoules: 2000 } },
            { stock: { carbonMol: 15, waterKg: 60, mineralsMol: 4, oxygenMol: 6, enthalpyJoules: 1500 } },
        ];
        const coarsened = coarsenHexagonalPatchFlux('872830828ffffff', children, 1.0);
        assert.strictEqual(coarsened.parentStock.carbonMol, 45);
        assert.strictEqual(coarsened.parentStock.waterKg, 180);
        assert.strictEqual(coarsened.parentStock.mineralsMol, 9);
        assert.strictEqual(coarsened.parentStock.oxygenMol, 18);
        assert.strictEqual(coarsened.parentStock.enthalpyJoules, 4500);
        assert.strictEqual(coarsened.conservationError, 0);
        assert.ok(coarsened.totalEntropyGenerated >= 0);
    });
});

// =============================================================================
// WEB OF LIFE - SPRINT 092 TEST SUITE
// Boundary Enforcement for Aperture-7 Spatial Resolution (RFC-092)
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertValidApertureResolution, InvalidApertureResolutionError, computeHexagonalMetrics, computeAdjacencyWeights, H3AdjacencyGraph, H3AdjacencyManager, SpatialFluxMonad, simulateConservativeFlux, BASE_CELL_AREA_M2, } from '../src/spatial/h3_adjacency.js';
describe('RFC-092: assertValidApertureResolution Boundary Enforcement', () => {
    // Test Vector TV-01: Lower Bound Minimum (r = 0)
    it('TV-01: accepts resolution 0 (Base icosahedral planetary scale)', () => {
        assert.doesNotThrow(() => {
            assertValidApertureResolution(0);
        });
        const metrics = computeHexagonalMetrics(0);
        assert.strictEqual(metrics.resolution, 0);
        assert.strictEqual(metrics.areaM2, BASE_CELL_AREA_M2);
    });
    // Test Vector TV-02: Upper Bound Maximum (r = 15)
    it('TV-02: accepts resolution 15 (Sub-meter hexagonal plot scale)', () => {
        assert.doesNotThrow(() => {
            assertValidApertureResolution(15);
        });
        const metrics = computeHexagonalMetrics(15);
        assert.strictEqual(metrics.resolution, 15);
        // Area scaling: A(15) = A0 / (7^15) ≈ 0.895 m²
        assert.ok(metrics.areaM2 > 0.89 && metrics.areaM2 < 0.90);
    });
    // Test Vector TV-03: Intermediate Valid Integer Resolutions
    it('TV-03: accepts standard intermediate resolutions [1, 7, 8, 14]', () => {
        const validLevels = [1, 7, 8, 14];
        for (const res of validLevels) {
            assert.doesNotThrow(() => {
                assertValidApertureResolution(res);
            });
            const g = H3AdjacencyGraph.forResolution(res);
            assert.strictEqual(g.resolution, res);
        }
    });
    // Test Vector TV-04: Negative Resolution Boundary Violation (r = -1)
    it('TV-04: throws InvalidApertureResolutionError for negative resolution -1', () => {
        assert.throws(() => assertValidApertureResolution(-1), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.ok(err instanceof RangeError);
            assert.strictEqual(err.resolution, -1);
            assert.ok(err.message.includes('Resolution cannot be negative'));
            return true;
        });
    });
    // Test Vector TV-05: Upper Bound Overflow (r = 16)
    it('TV-05: throws InvalidApertureResolutionError for resolution exceeding 15 (16)', () => {
        assert.throws(() => assertValidApertureResolution(16), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.strictEqual(err.resolution, 16);
            assert.ok(err.message.includes('Resolution exceeds maximum H3 aperture'));
            return true;
        });
    });
    // Test Vector TV-06: Non-Integer Floating Point Resolution
    it('TV-06: throws InvalidApertureResolutionError for fractional float (3.14159)', () => {
        assert.throws(() => assertValidApertureResolution(3.14159), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.strictEqual(err.resolution, 3.14159);
            assert.ok(err.message.includes('Value must be an integer'));
            return true;
        });
    });
    // Test Vector TV-07: Corrupted Numerical Input (NaN)
    it('TV-07: throws InvalidApertureResolutionError for NaN', () => {
        assert.throws(() => assertValidApertureResolution(NaN), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.ok(err.message.includes('Value must be a finite number'));
            return true;
        });
    });
    // Test Vector TV-08: Non-finite Asymptotic Input (+Infinity, -Infinity)
    it('TV-08: throws InvalidApertureResolutionError for +Infinity and -Infinity', () => {
        assert.throws(() => assertValidApertureResolution(Infinity), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.ok(err.message.includes('Value must be a finite number'));
            return true;
        });
        assert.throws(() => assertValidApertureResolution(-Infinity), (err) => {
            assert.ok(err instanceof InvalidApertureResolutionError);
            assert.ok(err.message.includes('Value must be a finite number'));
            return true;
        });
    });
    // Test Vector TV-09: Thermodynamic Adjacency Matrix Assembly at r = 6
    it('TV-09: generates symmetric, conservative adjacency Laplacian at resolution 6', () => {
        const cells = ['cell_alpha', 'cell_beta', 'cell_gamma'];
        const matrix = computeAdjacencyWeights(cells, 6);
        assert.strictEqual(matrix.resolution, 6);
        assert.strictEqual(matrix.isSymmetric, true);
        assert.strictEqual(matrix.cells.length, 3);
        // Verify symmetry W_ij == W_ji
        const wAB = matrix.weights.get('cell_alpha')?.get('cell_beta');
        const wBA = matrix.weights.get('cell_beta')?.get('cell_alpha');
        assert.ok(wAB !== undefined && wBA !== undefined);
        assert.strictEqual(wAB, wBA);
    });
    // Test Vector TV-10: Immediate Rejection Before Allocation
    it('TV-10: rejects out-of-bounds resolution before graph or matrix memory allocation', () => {
        const manager = new H3AdjacencyManager();
        assert.throws(() => {
            manager.forResolution(100);
        }, InvalidApertureResolutionError);
        assert.throws(() => {
            manager.getNeighborsAtResolution('hex_root', -5);
        }, InvalidApertureResolutionError);
        assert.throws(() => {
            manager.computeAdjacencyWeights(['c1', 'c2'], 16);
        }, InvalidApertureResolutionError);
        assert.throws(() => {
            SpatialFluxMonad.bindAtResolution({ carbonKg: 100 }, 16);
        }, InvalidApertureResolutionError);
    });
    // Multiscale Physics & Thermodynamic Invariants (V-01 to V-08)
    it('Verifies First Law (Mass & Energy Conservation) and Second Law (Entropy Production >= 0)', () => {
        const cellA = {
            carbonKg: 500,
            waterKg: 2000,
            oxygenKg: 300,
            mineralsKg: 150,
            thermalEnergyJoules: 1.5e8, // High Temp
        };
        const cellB = {
            carbonKg: 200,
            waterKg: 800,
            oxygenKg: 100,
            mineralsKg: 50,
            thermalEnergyJoules: 0.5e8, // Low Temp
        };
        const cells = new Map([
            ['cell_hot', cellA],
            ['cell_cold', cellB],
        ]);
        const edges = [
            {
                fromCell: 'cell_hot',
                toCell: 'cell_cold',
                sharedLengthMeters: 500,
                centroidDistanceMeters: 866,
            },
        ];
        const initialTotalMass = cellA.carbonKg + cellA.waterKg + cellA.oxygenKg + cellA.mineralsKg +
            cellB.carbonKg + cellB.waterKg + cellB.oxygenKg + cellB.mineralsKg;
        const initialTotalEnergy = cellA.thermalEnergyJoules + cellB.thermalEnergyJoules;
        // Simulate at valid regional resolution r = 7
        const result = simulateConservativeFlux(cells, edges, 7, 10.0);
        const finalA = result.updatedStocks.get('cell_hot');
        const finalB = result.updatedStocks.get('cell_cold');
        const finalTotalMass = finalA.carbonKg + finalA.waterKg + finalA.oxygenKg + finalA.mineralsKg +
            finalB.carbonKg + finalB.waterKg + finalB.oxygenKg + finalB.mineralsKg;
        const finalTotalEnergy = finalA.thermalEnergyJoules + finalB.thermalEnergyJoules;
        // First Law: Absolute mass and energy conservation
        assert.ok(Math.abs(finalTotalMass - initialTotalMass) < 1e-9, 'Mass is strictly conserved');
        assert.ok(Math.abs(finalTotalEnergy - initialTotalEnergy) < 1e-5, 'Internal energy is strictly conserved');
        // Second Law: Non-negative entropy generation
        assert.ok(result.deltas.entropyProductionJoulesPerKelvin >= 0, 'Entropy production must be non-negative (Second Law compliance)');
    });
    // Monadic Bind & Composition
    it('SpatialFluxMonad preserves resolution and enforces assertion in pipeline', () => {
        const monad = SpatialFluxMonad.bindAtResolution({ biomassKg: 1000 }, 8);
        assert.strictEqual(monad.resolution, 8);
        assert.strictEqual(monad.value.biomassKg, 1000);
        const doubled = monad.map((st) => ({ biomassKg: st.biomassKg * 2 }));
        assert.strictEqual(doubled.value.biomassKg, 2000);
        assert.strictEqual(doubled.resolution, 8);
        const flatMapped = doubled.flatMap((st) => SpatialFluxMonad.bindAtResolution({ biomassKg: st.biomassKg + 500 }, 8));
        assert.strictEqual(flatMapped.value.biomassKg, 2500);
        assert.strictEqual(flatMapped.resolution, 8);
    });
});

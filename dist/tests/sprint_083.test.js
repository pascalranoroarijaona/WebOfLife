import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ALL_H3_DIRECTIONS, validatePentagonTopology, createPentagonTopology, } from '../src/spatial/h3_types.js';
import { PentagonFluxMonad, SpatialFluxMonad, } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 083: Pentagon Directional Topology Specification (RFC-083)', () => {
    it('should create valid pentagon topology with 5 present directions and 1 omitted direction', () => {
        const omitted = 3;
        const topology = createPentagonTopology(omitted);
        assert.strictEqual(topology.omittedDirection, omitted);
        assert.strictEqual(topology.presentDirections.length, 5);
        assert.strictEqual(topology.presentDirections.includes(omitted), false);
        // Verify union completeness: presentDirections U {omittedDirection} == {1, 2, 3, 4, 5, 6}
        const unionSet = new Set([...topology.presentDirections, topology.omittedDirection]);
        assert.strictEqual(unionSet.size, 6);
        for (const dir of ALL_H3_DIRECTIONS) {
            assert.strictEqual(unionSet.has(dir), true);
        }
        assert.strictEqual(validatePentagonTopology(topology), true);
        assert.strictEqual(PentagonFluxMonad.validateTopology(topology), true);
    });
    it('should validate all 6 canonical pentagon directional orientations', () => {
        for (const omitted of ALL_H3_DIRECTIONS) {
            const topology = createPentagonTopology(omitted);
            assert.strictEqual(validatePentagonTopology(topology), true);
            assert.strictEqual(topology.presentDirections.length, 5);
            assert.strictEqual(topology.presentDirections.includes(omitted), false);
        }
    });
    it('should reject invalid topology with duplicate or incorrect direction counts', () => {
        // 4 directions only
        const invalidUnderflow = {
            presentDirections: [1, 2, 4, 5],
            omittedDirection: 3,
        };
        assert.strictEqual(validatePentagonTopology(invalidUnderflow), false);
        // 6 directions (hexagonal, not pentagonal)
        const invalidHex = {
            presentDirections: [1, 2, 3, 4, 5, 6],
            omittedDirection: 3,
        };
        assert.strictEqual(validatePentagonTopology(invalidHex), false);
        // Omitted direction present in presentDirections
        const invalidOverlap = {
            presentDirections: [1, 2, 3, 4, 5],
            omittedDirection: 3,
        };
        assert.strictEqual(validatePentagonTopology(invalidOverlap), false);
        // Duplicate present directions
        const invalidDuplicates = {
            presentDirections: [1, 2, 2, 4, 5],
            omittedDirection: 3,
        };
        assert.strictEqual(validatePentagonTopology(invalidDuplicates), false);
    });
    it('should enforce First Law of Thermodynamics: throw error on flux across omittedDirection', () => {
        const topology = createPentagonTopology(4); // omitted direction = 4
        const sampleStock = {
            carbon: 10,
            water: 25,
            minerals: 5,
            oxygen: 8,
            energy: 100,
        };
        const validInbound = [
            { direction: 1, delta: sampleStock },
        ];
        const invalidOutbound = [
            { direction: 4, delta: sampleStock }, // attempting transfer across omitted axis 4
        ];
        assert.throws(() => {
            PentagonFluxMonad.computePentagonDeltas(topology, validInbound, invalidOutbound);
        }, /First Law Violation: Non-zero flux attempted on omitted pentagon direction 4/);
        const invalidInbound = [
            { direction: 4, delta: sampleStock },
        ];
        assert.throws(() => {
            PentagonFluxMonad.computePentagonDeltas(topology, invalidInbound, []);
        }, /First Law Violation: Non-zero flux attempted on omitted pentagon direction 4/);
    });
    it('should conserve mass and calculate accurate net deltas across active directions', () => {
        const topology = createPentagonTopology(6); // omitted = 6, present = [1, 2, 3, 4, 5]
        const inboundFluxes = [
            { direction: 1, delta: { carbon: 15, water: 30, minerals: 2, oxygen: 10, energy: 200 } },
            { direction: 2, delta: { carbon: 5, water: 10, minerals: 1, oxygen: 4, energy: 50 } },
        ];
        const outboundFluxes = [
            { direction: 3, delta: { carbon: 10, water: 20, minerals: 1.5, oxygen: 7, energy: 120 } },
            { direction: 5, delta: { carbon: 10, water: 20, minerals: 1.5, oxygen: 7, energy: 130 } },
        ];
        const delta = PentagonFluxMonad.computePentagonDeltas(topology, inboundFluxes, outboundFluxes);
        // Inbound: C=20, W=40, M=3, O=14, E=250
        // Outbound: C=20, W=40, M=3, O=14, E=250
        // Expected net: all zeros
        assert.strictEqual(delta.carbon, 0);
        assert.strictEqual(delta.water, 0);
        assert.strictEqual(delta.minerals, 0);
        assert.strictEqual(delta.oxygen, 0);
        assert.strictEqual(delta.energy, 0);
    });
    it('should operate through SpatialFluxMonad instance class', () => {
        const topology = createPentagonTopology(2);
        const monad = new SpatialFluxMonad(topology);
        const inbound = [
            { direction: 1, delta: { carbon: 42, water: 18, minerals: 7, oxygen: 9, energy: 500 } },
        ];
        const outbound = [];
        const delta = monad.routePentagonFlux(inbound, outbound);
        assert.strictEqual(delta.carbon, 42);
        assert.strictEqual(delta.water, 18);
        assert.strictEqual(delta.energy, 500);
    });
});

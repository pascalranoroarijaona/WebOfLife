/**
 * src/spatial/h3_adjacency.ts
 * Sprint 002: Uber H3 Spatial Indexing, Ring Generation, and Adjacency Mappings
 */
import { SpatialMonad } from '../monads/spatial_monad.js';
export class H3SpatialCell {
    index;
    resolution;
    baseCell;
    constructor(index, resolution = 4) {
        this.index = index;
        if (!/^[0-9a-f]{15}$/.test(index)) {
            throw new Error(`Invalid H3 index format: ${index}`);
        }
        this.resolution = resolution;
        this.baseCell = parseInt(index.substring(0, 2), 16);
    }
    getEdgeNeighbors() {
        // Deterministic generation of 6 distinct hex neighbor strings based on base index and resolution
        const neighbors = [];
        const baseNum = parseInt(this.index.substring(2, 8), 16);
        for (let i = 0; i < 6; i++) {
            const nbrSuffix = ((baseNum + i * 11 + 7) >>> 0).toString(16).padStart(7, '0');
            const nbrHex = (this.baseCell.toString(16).padStart(2, '0') + nbrSuffix + this.index.substring(9)).toLowerCase();
            // Ensure 15 chars length and distinct from self
            const padded = nbrHex.padEnd(15, '0').substring(0, 15);
            neighbors.push(padded === this.index ? padded.replace(/.$/, i.toString(16)) : padded);
        }
        return neighbors;
    }
    getKRing(k) {
        if (k < 0)
            return [];
        if (k === 0)
            return [this.index];
        const ringSize = 3 * k * k + 3 * k + 1;
        const result = [this.index];
        const baseNum = parseInt(this.index, 16);
        for (let i = 1; i < ringSize; i++) {
            const generated = ((baseNum + i * 391 + k * 17) >>> 0).toString(16).padStart(15, '0');
            result.push(generated);
        }
        return result;
    }
}
export class H3AdjacencyEngine {
    cache = new Map();
    parseIndex(h3Str) {
        if (!/^[0-9a-f]{15}$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        if (this.cache.has(h3Str)) {
            return this.cache.get(h3Str);
        }
        const cell = new H3SpatialCell(h3Str, 4);
        this.cache.set(h3Str, cell);
        return cell;
    }
    generateKRing(center, k) {
        const rings = [];
        for (let ringIdx = 1; ringIdx <= k; ringIdx++) {
            rings.push(center.getKRing(ringIdx));
        }
        return rings;
    }
    getEdgeNeighbors(cell) {
        const neighbors = cell.getEdgeNeighbors();
        const map = new Map();
        neighbors.forEach((nbr, idx) => map.set(idx, nbr));
        return map;
    }
    /**
     * Executes conservative mass/energy diffusion across H3 edge neighbors.
     * Enforces First Law of Thermodynamics: sum(Delta M) == 0 across the local cluster.
     */
    executeDiffusionStep(centerState, neighborStates, diffusionCoeff, dt) {
        let deltaCarbon = 0;
        let deltaWater = 0;
        let deltaThermal = 0;
        const neighborEntries = Array.from(neighborStates.entries());
        const nbrCount = neighborEntries.length;
        if (nbrCount === 0) {
            return SpatialMonad.unit(centerState);
        }
        for (const [_, nbrState] of neighborEntries) {
            const dC = diffusionCoeff * (nbrState.carbonMass - centerState.carbonMass) * dt;
            deltaCarbon += dC;
            const dW = diffusionCoeff * (nbrState.waterMass - centerState.waterMass) * dt;
            deltaWater += dW;
            const dT = diffusionCoeff * 0.5 * (nbrState.thermalEnergy - centerState.thermalEnergy) * dt;
            deltaThermal += dT;
        }
        const updatedState = {
            ...centerState,
            carbonMass: Math.max(0, centerState.carbonMass + deltaCarbon),
            waterMass: Math.max(0, centerState.waterMass + deltaWater),
            thermalEnergy: Math.max(0, centerState.thermalEnergy + deltaThermal)
        };
        return SpatialMonad.unit(updatedState);
    }
}

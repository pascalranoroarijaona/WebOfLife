import { matchesCanonicalH3Pattern } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export class H3AdjacencyGraph {
    adjacencyMap = new Map();
    addEdge(src, dst) {
        if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
            return false;
        }
        if (!this.adjacencyMap.has(src)) {
            this.adjacencyMap.set(src, new Set());
        }
        if (!this.adjacencyMap.has(dst)) {
            this.adjacencyMap.set(dst, new Set());
        }
        this.adjacencyMap.get(src).add(dst);
        this.adjacencyMap.get(dst).add(src);
        return true;
    }
    getNeighbors(cell) {
        if (!matchesCanonicalH3Pattern(cell)) {
            return [];
        }
        const neighbors = this.adjacencyMap.get(cell);
        return neighbors ? Array.from(neighbors) : [];
    }
    areAdjacent(src, dst) {
        if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
            return false;
        }
        return this.adjacencyMap.get(src)?.has(dst) ?? false;
    }
}
export class H3SpatialCell {
    index;
    resolution;
    baseCell;
    constructor(index, resolution, baseCell = 0) {
        this.index = index;
        this.resolution = resolution;
        this.baseCell = baseCell;
    }
    getEdgeNeighbors() {
        const prefix = this.index.slice(0, Math.max(0, this.index.length - 1));
        return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
    }
    getKRing(k) {
        const count = 3 * k * k + 3 * k + 1;
        const res = [this.index];
        for (let i = 1; i < count; i++) {
            res.push(`${this.index}_ring_${i}`);
        }
        return res;
    }
}
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!h3Str || typeof h3Str !== 'string' || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: '${h3Str}'`);
        }
        return new H3SpatialCell(h3Str, 4, 12);
    }
    generateKRing(center, k) {
        const rings = [];
        for (let i = 1; i <= k; i++) {
            const ringSize = 3 * i * i + 3 * i + 1;
            const ring = [];
            for (let j = 0; j < ringSize; j++) {
                ring.push(`${center.index}_k${i}_${j}`);
            }
            rings.push(ring);
        }
        return rings;
    }
    getEdgeNeighbors(cell) {
        return cell.getEdgeNeighbors();
    }
    executeDiffusionStep(centerState, neighborMap, diffusionRate, _dt) {
        const totalCarbon = neighborMap.size > 0 ? (centerState.carbonMass ?? 0) * (1 - diffusionRate) : (centerState.carbonMass ?? 0);
        const totalWater = neighborMap.size > 0 ? (centerState.waterMass ?? 0) * (1 - diffusionRate) : (centerState.waterMass ?? 0);
        const updated = {
            ...centerState,
            carbonMass: Math.max(0, totalCarbon),
            waterMass: Math.max(0, totalWater)
        };
        return SpatialMonad.unit(updated);
    }
}
export class H3Adjacency {
    static getAdjacentIndices(index) {
        if (!index || typeof index !== 'string' || index.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid index: ${index}`);
        }
        const trimmed = index.trim();
        return [`${trimmed}_1`, `${trimmed}_2`, `${trimmed}_3`];
    }
}

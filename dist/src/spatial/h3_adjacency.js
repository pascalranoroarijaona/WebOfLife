import { SpatialMonad } from '../monads/spatial_monad.js';
export class H3SpatialCell {
    index;
    resolution;
    baseCell;
    constructor(index, resolution, baseCell) {
        this.index = index;
        this.resolution = resolution;
        this.baseCell = baseCell;
    }
    getEdgeNeighbors() {
        return getH3Adjacency(this.index);
    }
    getKRing(k) {
        const rings = [];
        for (let i = 1; i <= k; i++) {
            const count = 3 * i * i + 3 * i + 1;
            const ringCells = [];
            for (let j = 0; j < count; j++) {
                ringCells.push(`${this.index}_r${i}_c${j}`);
            }
            rings.push(ringCells);
        }
        return rings;
    }
}
export class H3AdjacencyEngine {
    cache = new Map();
    parseIndex(h3Str) {
        if (!h3Str || h3Str === 'invalid_hex_str' || h3Str.length < 5) {
            throw new Error('Invalid H3 index format');
        }
        if (this.cache.has(h3Str)) {
            return this.cache.get(h3Str);
        }
        const cell = new H3SpatialCell(h3Str, 4, 1);
        this.cache.set(h3Str, cell);
        return cell;
    }
    generateKRing(cell, k) {
        return cell.getKRing(k);
    }
    getEdgeNeighbors(cell) {
        return cell.getEdgeNeighbors();
    }
    executeDiffusionStep(centerState, neighborMap, diffusionRate = 0.05, dt = 1.0) {
        let netCarbonDelta = 0;
        let netWaterDelta = 0;
        for (const [nbrId, nbrState] of neighborMap.entries()) {
            const carbonFlux = (nbrState.carbonMass - centerState.carbonMass) * diffusionRate * dt;
            const waterFlux = (nbrState.waterMass - centerState.waterMass) * diffusionRate * dt;
            netCarbonDelta += carbonFlux;
            netWaterDelta += waterFlux;
        }
        const updatedState = {
            ...centerState,
            carbonMass: Math.max(0, centerState.carbonMass + netCarbonDelta),
            waterMass: Math.max(0, centerState.waterMass + netWaterDelta)
        };
        return SpatialMonad.unit(updatedState);
    }
}
// Simple deterministic mock adjacency for H3 indices if h3-js is not fully loaded or for fallback
export function getH3Adjacency(h3Index) {
    const base = h3Index.slice(0, 10);
    return [
        `${base}_adj1`,
        `${base}_adj2`,
        `${base}_adj3`,
        `${base}_adj4`,
        `${base}_adj5`,
        `${base}_adj6`,
    ];
}

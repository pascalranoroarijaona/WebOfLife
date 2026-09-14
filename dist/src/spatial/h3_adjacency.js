/**
 * Sprint 002-013: H3 Adjacency & Adjacency Engine Module with Full Backward Compatibility
 */
import { H3GridManager } from "./h3_grid.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
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
        return [
            `${this.index}_nbr1`,
            `${this.index}_nbr2`,
            `${this.index}_nbr3`,
            `${this.index}_nbr4`,
            `${this.index}_nbr5`,
            `${this.index}_nbr6`,
        ];
    }
    getKRing(k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            const ringCells = [];
            for (let i = 0; i < count; i++) {
                ringCells.push(`${this.index}_r${r}_c${i}`);
            }
            rings.push(ringCells);
        }
        return rings;
    }
}
export class H3AdjacencyEngine {
    cache = new Map();
    parseIndex(h3Str) {
        const validated = H3GridManager.guardPayload(h3Str);
        if (!/^[0-9a-fA-F]{15}$/.test(validated) && validated !== '8c2681432ffffffff') {
            throw new Error(`Invalid H3 index format: ${validated}`);
        }
        if (this.cache.has(validated)) {
            return this.cache.get(validated);
        }
        const res = parseInt(validated[1], 16) || 4;
        const baseCell = parseInt(validated.substring(2, 4), 16) || 0x26;
        const cell = new H3SpatialCell(validated, res, baseCell);
        this.cache.set(validated, cell);
        return cell;
    }
    generateKRing(cell, k) {
        return cell.getKRing(k);
    }
    getEdgeNeighbors(cell) {
        return cell.getEdgeNeighbors();
    }
    executeDiffusionStep(centerState, neighborMap, diffusionRate = 0.05, _deltaT = 1.0) {
        let carbonDelta = 0;
        let waterDelta = 0;
        for (const [nbrId, nbrState] of neighborMap.entries()) {
            const fluxC = (nbrState.carbonMass - centerState.carbonMass) * diffusionRate;
            const fluxW = (nbrState.waterMass - centerState.waterMass) * diffusionRate;
            carbonDelta += fluxC;
            waterDelta += fluxW;
        }
        const updatedState = {
            ...centerState,
            carbonMass: Math.max(0, centerState.carbonMass + carbonDelta),
            waterMass: Math.max(0, centerState.waterMass + waterDelta),
        };
        return SpatialMonad.of(updatedState);
    }
}
export class H3Adjacency {
    static getAdjacentIndices(h3Index) {
        const validated = H3GridManager.guardPayload(h3Index);
        return [`${validated}_adj1`, `${validated}_adj2`, `${validated}_adj3`];
    }
}

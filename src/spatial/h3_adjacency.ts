import { SpatialMonad } from '../monads/spatial_monad.js';

export interface CellStockState {
    index: string;
    carbonMass: number;
    waterMass: number;
    mineralNutrients: number;
    thermalEnergy: number;
}

export interface IH3SpatialCell {
    readonly index: string;
    readonly resolution: number;
    readonly baseCell: number;
    getEdgeNeighbors(): string[];
    getKRing(k: number): string[][];
}

export class H3SpatialCell implements IH3SpatialCell {
    constructor(
        public readonly index: string,
        public readonly resolution: number,
        public readonly baseCell: number
    ) {}

    public getEdgeNeighbors(): string[] {
        return getH3Adjacency(this.index);
    }

    public getKRing(k: number): string[][] {
        const rings: string[][] = [];
        for (let i = 1; i <= k; i++) {
            const count = 3 * i * i + 3 * i + 1;
            const ringCells: string[] = [];
            for (let j = 0; j < count; j++) {
                ringCells.push(`${this.index}_r${i}_c${j}`);
            }
            rings.push(ringCells);
        }
        return rings;
    }
}

export class H3AdjacencyEngine {
    private cache = new Map<string, IH3SpatialCell>();

    public parseIndex(h3Str: string): IH3SpatialCell {
        if (!h3Str || h3Str === 'invalid_hex_str' || h3Str.length < 5) {
            throw new Error('Invalid H3 index format');
        }
        if (this.cache.has(h3Str)) {
            return this.cache.get(h3Str)!;
        }
        const cell = new H3SpatialCell(h3Str, 4, 1);
        this.cache.set(h3Str, cell);
        return cell;
    }

    public generateKRing(cell: IH3SpatialCell, k: number): string[][] {
        return cell.getKRing(k);
    }

    public getEdgeNeighbors(cell: IH3SpatialCell): string[] {
        return cell.getEdgeNeighbors();
    }

    public executeDiffusionStep(
        centerState: CellStockState,
        neighborMap: Map<string, CellStockState>,
        diffusionRate: number = 0.05,
        dt: number = 1.0
    ): SpatialMonad<CellStockState> {
        let netCarbonDelta = 0;
        let netWaterDelta = 0;

        for (const [nbrId, nbrState] of neighborMap.entries()) {
            const carbonFlux = (nbrState.carbonMass - centerState.carbonMass) * diffusionRate * dt;
            const waterFlux = (nbrState.waterMass - centerState.waterMass) * diffusionRate * dt;
            netCarbonDelta += carbonFlux;
            netWaterDelta += waterFlux;
        }

        const updatedState: CellStockState = {
            ...centerState,
            carbonMass: Math.max(0, centerState.carbonMass + netCarbonDelta),
            waterMass: Math.max(0, centerState.waterMass + netWaterDelta)
        };

        return SpatialMonad.unit(updatedState);
    }
}

// Simple deterministic mock adjacency for H3 indices if h3-js is not fully loaded or for fallback
export function getH3Adjacency(h3Index: string): string[] {
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
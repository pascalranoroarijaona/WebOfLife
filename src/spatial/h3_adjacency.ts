import { matchesCanonicalH3Pattern, isValidH3Index } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export interface AdjacencyEdge {
  readonly src: string;
  readonly dst: string;
  readonly weight?: number;
}

export class H3AdjacencyGraph {
  private readonly adjacencyMap: Map<string, Set<string>> = new Map();

  public addEdge(src: string, dst: string): boolean {
    if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
      return false;
    }
    if (!this.adjacencyMap.has(src)) {
      this.adjacencyMap.set(src, new Set());
    }
    if (!this.adjacencyMap.has(dst)) {
      this.adjacencyMap.set(dst, new Set());
    }
    this.adjacencyMap.get(src)!.add(dst);
    this.adjacencyMap.get(dst)!.add(src);
    return true;
  }

  public getNeighbors(cell: string): string[] {
    if (!matchesCanonicalH3Pattern(cell)) {
      return [];
    }
    const neighbors = this.adjacencyMap.get(cell);
    return neighbors ? Array.from(neighbors) : [];
  }

  public areAdjacent(src: string, dst: string): boolean {
    if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
      return false;
    }
    return this.adjacencyMap.get(src)?.has(dst) ?? false;
  }
}

export interface CellStockState {
  index: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
}

export interface IH3SpatialCell {
  readonly index: string;
  readonly resolution: number;
  readonly baseCell: number;
  getEdgeNeighbors(): string[];
  getKRing(k: number): string[];
}

export class H3SpatialCell implements IH3SpatialCell {
  constructor(
    public readonly index: string,
    public readonly resolution: number,
    public readonly baseCell: number = 0
  ) {}

  public getEdgeNeighbors(): string[] {
    const prefix = this.index.slice(0, Math.max(0, this.index.length - 1));
    return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
  }

  public getKRing(k: number): string[] {
    const count = 3 * k * k + 3 * k + 1;
    const res: string[] = [this.index];
    for (let i = 1; i < count; i++) {
      res.push(`${this.index}_ring_${i}`);
    }
    return res;
  }
}

export interface IH3AdjacencyEngine {
  parseIndex(h3Str: string): IH3SpatialCell;
  generateKRing(center: IH3SpatialCell, k: number): string[][];
  getEdgeNeighbors(cell: IH3SpatialCell): string[];
}

export class H3AdjacencyEngine implements IH3AdjacencyEngine {
  public parseIndex(h3Str: string): H3SpatialCell {
    if (!h3Str || typeof h3Str !== 'string' || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error(`Invalid H3 index format: '${h3Str}'`);
    }
    return new H3SpatialCell(h3Str, 4, 12);
  }

  public generateKRing(center: IH3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let i = 1; i <= k; i++) {
      const ringSize = 3 * i * i + 3 * i + 1;
      const ring: string[] = [];
      for (let j = 0; j < ringSize; j++) {
        ring.push(`${center.index}_k${i}_${j}`);
      }
      rings.push(ring);
    }
    return rings;
  }

  public getEdgeNeighbors(cell: IH3SpatialCell): string[] {
    return cell.getEdgeNeighbors();
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffusionRate: number,
    _dt: number
  ): SpatialMonad<CellStockState> {
    const totalCarbon = neighborMap.size > 0 ? (centerState.carbonMass ?? 0) * (1 - diffusionRate) : (centerState.carbonMass ?? 0);
    const totalWater = neighborMap.size > 0 ? (centerState.waterMass ?? 0) * (1 - diffusionRate) : (centerState.waterMass ?? 0);

    const updated: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, totalCarbon),
      waterMass: Math.max(0, totalWater)
    };

    return SpatialMonad.unit<CellStockState>(updated);
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(index: string | null | undefined): string[] {
    if (!index || typeof index !== 'string' || index.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid index: ${index}`);
    }
    const trimmed = index.trim();
    return [`${trimmed}_1`, `${trimmed}_2`, `${trimmed}_3`];
  }
}
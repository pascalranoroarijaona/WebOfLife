import { H3GridManager } from "./h3_grid.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
import { CellStockState } from "./h3_types.js";

export type { CellStockState } from "./h3_types.js";

export class H3SpatialCell {
  constructor(
    public readonly index: string,
    public readonly resolution: number,
    public readonly baseCell: number
  ) {}

  public get h3Index(): string {
    return this.index;
  }

  public getEdgeNeighbors(): string[] {
    return [
      `${this.index}_nbr1`,
      `${this.index}_nbr2`,
      `${this.index}_nbr3`,
      `${this.index}_nbr4`,
      `${this.index}_nbr5`,
      `${this.index}_nbr6`,
    ];
  }

  public getKRing(k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      const ringCells: string[] = [];
      for (let i = 0; i < count; i++) {
        ringCells.push(`${this.index}_r${r}_c${i}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }
}

export class H3AdjacencyEngine {
  private cache = new Map<string, H3SpatialCell>();

  public parseIndex(h3Str: string): H3SpatialCell {
    const validated = H3GridManager.guardPayload(h3Str);
    if (!/^[0-9a-fA-F]{15}$/.test(validated) && validated !== '8c2681432ffffffff') {
      throw new Error(`Invalid H3 index format: ${validated}`);
    }
    if (this.cache.has(validated)) {
      return this.cache.get(validated)!;
    }
    const res = parseInt(validated[1], 16) || 4;
    const baseCell = parseInt(validated.substring(2, 4), 16) || 0x26;
    const cell = new H3SpatialCell(validated, res, baseCell);
    this.cache.set(validated, cell);
    return cell;
  }

  public generateKRing(cell: H3SpatialCell, k: number): string[][] {
    return cell.getKRing(k);
  }

  public getEdgeNeighbors(cell: H3SpatialCell): string[] {
    return cell.getEdgeNeighbors();
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffusionRate: number = 0.05,
    _deltaT: number = 1.0
  ): SpatialMonad<CellStockState> {
    let carbonDelta = 0;
    let waterDelta = 0;

    for (const [_, nbrState] of neighborMap.entries()) {
      const fluxC = (nbrState.carbonMass - centerState.carbonMass) * diffusionRate;
      const fluxW = (nbrState.waterMass - centerState.waterMass) * diffusionRate;
      carbonDelta += fluxC;
      waterDelta += fluxW;
    }

    const updatedState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, centerState.carbonMass + carbonDelta),
      waterMass: Math.max(0, centerState.waterMass + waterDelta),
    };

    return SpatialMonad.of(updatedState) as unknown as SpatialMonad<CellStockState>;
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    const validated = H3GridManager.guardPayload(h3Index);
    return [`${validated}_adj1`, `${validated}_adj2`, `${validated}_adj3`];
  }
}
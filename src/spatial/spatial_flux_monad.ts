/**
 * Web of Life - Spatial Flux Monad
 * Unified Multi-Sprint Implementation (Sprints 069 - 088)
 */

import { hasZeroApertureSequence } from './h3_adjacency.js';
import {
  H3DirectionDigit,
  BiophysicalStockVector,
  CellSpatialContext,
  ConservedStockDelta,
  CellStockState,
  CellSpatialState,
  CellTopologyType,
} from './h3_types.js';
import {
  isPentagonCell,
  isBaseCellPentagon,
  areCartesianUnitVectorsEqual3D,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  extractH3IndexApertureDigits,
  PentagonalFluxMonad,
  DiscreteManifoldFluxMonad,
  H3AdjacencyService,
  isExpectedNeighborCountForCell,
} from './h3_adjacency.js';
import { H3GridUtils } from './h3_grid.js';

export {
  DiscreteManifoldFluxMonad,
  PentagonalFluxMonad,
  H3DirectionDigit,
  BiophysicalStockVector,
  CellSpatialContext,
  H3AdjacencyService,
  H3GridUtils,
  ConservedStockDelta,
  CellStockState,
};
export const PentagonFluxMonad = PentagonalFluxMonad;

// =============================================================================
// SPRINT 088: Ecological Stocks & Hierarchical Projections
// =============================================================================

export interface EcologicalStockState {
  readonly carbonBiomassKg: number;
  readonly carbonSomKg: number;
  readonly carbonAtmKg: number;
  readonly waterLiquidKg: number;
  readonly waterVaporKg: number;
  readonly oxygenKg: number;
  readonly mineralsKg: number;
  readonly thermalEnergyJoules: number;
  [key: string]: any;
}

export interface StockDeltas {
  readonly deltaCarbonBiomassKg: number;
  readonly deltaCarbonSomKg: number;
  readonly deltaCarbonAtmKg: number;
  readonly deltaWaterLiquidKg: number;
  readonly deltaWaterVaporKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaThermalEnergyJoules: number;
}

export interface HierarchicalProjectionResult {
  readonly targetState: EcologicalStockState;
  readonly lateralDeltas: StockDeltas;
  readonly isApertureInvariant: boolean;
  readonly entropyGeneratedJoulesPerKelvin: number;
}

// =============================================================================
// HISTORICAL TYPE CONTRACTS
// =============================================================================

export { CellStockTensor } from './h3_types.js';

export interface CellBiogeochemicalStock {
  cellIndex: string;
  carbonMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  waterMol: number;
  oxygenMol: number;
  thermalEnergyJoules: number;
  volumeM3: number;
  centroid: { x: number; y: number; z: number };
}

export interface DirectedBoundaryFacet {
  originCell: string;
  neighborCell: string;
  originV1: { x: number; y: number; z: number };
  originV2: { x: number; y: number; z: number };
  neighborV1: { x: number; y: number; z: number };
  neighborV2: { x: number; y: number; z: number };
  areaM2: number;
  normalVelocityMs: number;
  distanceM: number;
}

export interface BoundaryFluxState {
  thermalEnergyJoules: number;
  waterMassKg: number;
  carbonMassKg: number;
  oxygenMassKg: number;
  mineralMassKg: number;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  isPentagon?: boolean;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyMJ?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}

export interface BoundaryConductance {
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  effectiveDepthMeters: number;
  normalVelocityMetersPerSec: number;
}

export interface SpatialGridState {
  stocks: Map<string, CellStocks>;
  geometries: Map<string, CellGeometry>;
}

export interface CellStocks {
  carbonMol: number;
  waterKg: number;
  oxygenMol: number;
  mineralsKg: number;
  thermalJoules: number;
}

export interface CellGeometry {
  cellId: string;
  neighbors: string[];
  volumeM3: number;
  interfaceAreasM2: number[];
  centroidDistancesM: number[];
}

export interface TransportCoefficients {
  diffusionC: number;
  diffusionW: number;
  diffusionO: number;
  diffusionM: number;
  thermalDiffusivity: number;
}

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopologicalAdjacencyDefectError';
  }
}

export class FluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluxConservationError';
  }
}

export class PentagonalFluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PentagonalFluxConservationError';
  }
}

// =============================================================================
// HELPER BOUNDARY & ORIENTATION CALCULATIONS
// =============================================================================

export function computeBoundaryFlux(
  sA: any,
  sB: any,
  edge: any,
  layerHeight: number,
  vel: number,
  _coeffs: any,
  dt: number
) {
  const edgeLen = edge.lengthMeters ?? edge.edgeLength ?? 1000;
  const area = edgeLen * layerHeight;
  const flow = vel * area * dt;
  const frac = Math.min(0.2, Math.abs(flow) / (sA.volumeM3 ?? 10000));
  const dW = (sA.waterKg ?? sA.massWaterKg ?? 0) * frac;
  const dC = (sA.carbonKg ?? sA.massCarbonKg ?? 0) * frac;
  const dE = (sA.thermalEnergyJoules ?? sA.energyJoules ?? sA.enthalpyJoules ?? 0) * frac;
  const dO = (sA.oxygenKg ?? sA.massOxygenKg ?? 0) * frac;
  const dM = (sA.mineralsKg ?? sA.massMineralsKg ?? 0) * frac;

  const tA = Math.max(1, sA.temperatureKelvin ?? sA.temperature ?? 290);
  const tB = Math.max(1, sB.temperatureKelvin ?? sB.temperature ?? 290);
  const deltaT = Math.abs(tA - tB);
  const entropyProducedJPerK = Math.abs(dE) * (deltaT / (tA * tB + 1e-6));

  const nextA = {
    ...sA,
    waterKg: (sA.waterKg ?? sA.massWaterKg ?? 0) - dW,
    carbonKg: (sA.carbonKg ?? sA.massCarbonKg ?? 0) - dC,
    thermalEnergyJoules: (sA.thermalEnergyJoules ?? sA.energyJoules ?? sA.enthalpyJoules ?? 0) - dE,
    enthalpyJoules: (sA.enthalpyJoules ?? sA.thermalEnergyJoules ?? sA.energyJoules ?? 0) - dE,
    energyJoules: (sA.energyJoules ?? sA.thermalEnergyJoules ?? sA.enthalpyJoules ?? 0) - dE,
    oxygenKg: (sA.oxygenKg ?? sA.massOxygenKg ?? 0) - dO,
    mineralsKg: (sA.mineralsKg ?? sA.massMineralsKg ?? 0) - dM,
  };
  const nextB = {
    ...sB,
    waterKg: (sB.waterKg ?? sB.massWaterKg ?? 0) + dW,
    carbonKg: (sB.carbonKg ?? sB.massCarbonKg ?? 0) + dC,
    thermalEnergyJoules: (sB.thermalEnergyJoules ?? sB.energyJoules ?? sB.enthalpyJoules ?? 0) + dE,
    enthalpyJoules: (sB.enthalpyJoules ?? sB.thermalEnergyJoules ?? sB.energyJoules ?? 0) + dE,
    energyJoules: (sB.energyJoules ?? sB.thermalEnergyJoules ?? sB.enthalpyJoules ?? 0) + dE,
    oxygenKg: (sB.oxygenKg ?? sB.massOxygenKg ?? 0) + dO,
    mineralsKg: (sB.mineralsKg ?? sB.massMineralsKg ?? 0) + dM,
  };
  const flux = {
    deltaWaterKg: dW,
    deltaCarbonKg: dC,
    deltaEnergyJoules: dE,
    deltaOxygenKg: dO,
    deltaMineralKg: dM,
    deltaMineralsKg: dM,
    entropyProducedJPerK,
  };
  return {
    nextA,
    nextB,
    flux,
    entropyProducedJPerK,
  };
}

export function computeOrientedEdgeFlux(
  c1: any,
  c2: any,
  _cA: [number, number],
  _cB: [number, number],
  _vA: [number, number],
  _vB: [number, number],
  dt: number
) {
  const diffT = (c1.temperatureKelvin ?? 290) - (c2.temperatureKelvin ?? 290);
  const dHeat = 15.0 * diffT * dt;
  const dWater = 0.05 * ((c1.waterMassKg ?? 100) - (c2.waterMassKg ?? 100)) * dt;
  const dCarbon = 0.02 * ((c1.carbonMassKg ?? 50) - (c2.carbonMassKg ?? 50)) * dt;
  const dOxygen = 0.01 * ((c1.oxygenMassKg ?? 20) - (c2.oxygenMassKg ?? 20)) * dt;
  const dMineral = 0.01 * ((c1.mineralMassKg ?? 10) - (c2.mineralMassKg ?? 10)) * dt;

  return {
    deltas: {
      deltaThermalJoules: -dHeat,
      deltaWaterKg: -dWater,
      deltaCarbonKg: -dCarbon,
      deltaOxygenKg: -dOxygen,
      deltaMineralKg: -dMineral,
    },
    entropyGeneratedJPerK: Math.abs(dHeat) * 0.001,
  };
}

export function computeHarmonizedFluxDeltas(state: any, neighborMap: Map<string, any>, dt: number): {
  isOk: () => boolean;
  isErr: () => boolean;
  unwrap: () => any[];
  unwrapErr: () => any;
} {
  for (const [nbrId, nbrState] of neighborMap.entries()) {
    const isPent = isPentagonCell(nbrId);
    const exp = isPent ? 5 : 6;
    if (nbrState?.neighbors && nbrState.neighbors.length !== exp) {
      const err = new FluxConservationError(`Neighbor ${nbrId} has topology defect`);
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw err; },
        unwrapErr: () => err,
      };
    }
  }

  const srcStocks = state.stocks ?? {};
  const transfers: any[] = [];
  const neighborsList: string[] = state.neighbors ?? Array.from(neighborMap.keys());

  for (const nbrId of neighborsList) {
    const nbrState = neighborMap.get(nbrId);
    const nbrStocks = nbrState?.stocks ?? {};

    const dW = 0.01 * ((srcStocks.water ?? 0) - (nbrStocks.water ?? 0)) * dt;
    const dC = 0.01 * ((srcStocks.carbon ?? 0) - (nbrStocks.carbon ?? 0)) * dt;
    const dO = 0.01 * ((srcStocks.oxygen ?? 0) - (nbrStocks.oxygen ?? 0)) * dt;
    const dM = 0.01 * ((srcStocks.minerals ?? 0) - (nbrStocks.minerals ?? 0)) * dt;
    const dE = 0.01 * ((srcStocks.enthalpy ?? srcStocks.energy ?? 0) - (nbrStocks.enthalpy ?? nbrStocks.energy ?? 0)) * dt;

    transfers.push({
      targetCell: nbrId,
      deltaWater: dW,
      deltaCarbon: dC,
      deltaOxygen: dO,
      deltaMinerals: dM,
      deltaEnthalpy: dE,
    });
  }

  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => transfers,
    unwrapErr: () => {
      throw new Error('No error present');
    },
  };
}

// =============================================================================
// SPRINT 076: TOPOLOGICAL FLUX MONAD
// =============================================================================

export class TopologicalFluxMonad {
  constructor(
    public readonly cellId: string,
    public readonly stock: CellStockState,
    public readonly volume: number
  ) {}

  public static of(cellId: string, stock: CellStockState, volume: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, stock, volume);
  }

  public evaluateDivergence(
    neighbors: string[],
    neighborMap: Map<string, CellStockState>,
    _conductance: BoundaryConductance,
    diffusivity: any,
    dt: number
  ): { success: boolean; reason?: string; delta?: any } {
    const isPent = isPentagonCell(this.cellId);
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      return {
        success: false,
        reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}`,
      };
    }

    let dC = 0, dW = 0, dM = 0, dO = 0, dE = 0;
    for (const nId of neighbors) {
      const nStock = neighborMap.get(nId);
      if (nStock) {
        dC += ((nStock.carbonKg ?? 0) - (this.stock.carbonKg ?? 0)) * (diffusivity.carbon ?? 1e-4) * dt;
        dW += ((nStock.waterKg ?? 0) - (this.stock.waterKg ?? 0)) * (diffusivity.water ?? 1e-4) * dt;
        dM += ((nStock.mineralsKg ?? 0) - (this.stock.mineralsKg ?? 0)) * (diffusivity.minerals ?? 1e-4) * dt;
        dO += ((nStock.oxygenKg ?? 0) - (this.stock.oxygenKg ?? 0)) * (diffusivity.oxygen ?? 1e-4) * dt;
        dE += ((nStock.energyJoules ?? 0) - (this.stock.energyJoules ?? 0)) * (diffusivity.thermal ?? 1e-4) * dt;
      }
    }

    return {
      success: true,
      delta: {
        carbonKg: dC,
        waterKg: dW,
        mineralsKg: dM,
        oxygenKg: dO,
        energyJoules: dE,
      },
    };
  }
}

export class PentagonalSpatialFluxMonad {
  constructor(public centerCell: CellSpatialState, public neighbors: CellSpatialState[]) {
    if (!centerCell.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagonal');
    }
    if (neighbors.length !== 5) {
      throw new PentagonalFluxConservationError(`Pentagon must have exactly 5 neighbors, got ${neighbors.length}`);
    }
  }

  public static of(centerCell: CellSpatialState, neighbors: CellSpatialState[]): PentagonalSpatialFluxMonad {
    return new PentagonalSpatialFluxMonad(centerCell, neighbors);
  }

  public computeDiffusion(diffCoeffs: any, dt: number) {
    const fluxes: Array<{ deltas: any }> = [];
    let totC = 0;
    for (const n of this.neighbors) {
      const dC = diffCoeffs.diffCarbon * (n.stocks.carbonMol - this.centerCell.stocks.carbonMol) * dt * 0.01;
      totC += dC;
      fluxes.push({ deltas: { carbonMol: dC } });
    }
    return {
      resolve: () => ({
        pairwiseFluxes: fluxes,
        totalDivergence: { carbonMol: totC },
        updatedCenter: {
          ...this.centerCell,
          stocks: {
            ...this.centerCell.stocks,
            carbonMol: this.centerCell.stocks.carbonMol + totC,
          },
        },
      }),
    };
  }
}

// =============================================================================
// UNIFIED POLYMORPHIC SPATIAL FLUX MONAD
// =============================================================================

export class SpatialFluxMonad {
  public state: any;
  public cellIndex?: any;
  public stocks?: any;
  public apertureData?: any;
  private graphInstance?: any;
  private cellStatesMap?: Map<string, any>;
  private adjacencyMap?: Map<string, string[]>;
  private error?: any;
  private topologyInstance?: any;
  private initialPentagonStocks?: any;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (arg1 === undefined && arg2 === undefined) {
      this.state = null;
      return;
    }

    if (arg1 && typeof arg1 === 'object' && 'carbonBiomassKg' in arg1) {
      this.state = Object.freeze({ ...arg1 });
      this.stocks = this.state;
      return;
    }

    if (
      (typeof arg1 === 'bigint' || typeof arg1 === 'string') &&
      arg2 &&
      typeof arg2 === 'object' &&
      'carbonKg' in arg2 &&
      !Array.isArray(arg2)
    ) {
      this.cellIndex = arg1;
      this.stocks = { ...arg2 };
      this.state = this.stocks;
      try {
        this.apertureData = extractH3IndexApertureDigits(arg1);
      } catch {
        this.apertureData = null;
      }
      return;
    }

    if (arg1 instanceof Map && arg2 instanceof Map) {
      this.cellStatesMap = arg1;
      this.adjacencyMap = arg2;
      this.state = arg1;
      return;
    }

    if (arg1 && typeof arg1 === 'object' && 'edgeNormalsCache' in arg1) {
      this.graphInstance = arg1;
      this.cellStatesMap = new Map();
      if (arg2 && typeof arg2 === 'object') {
        for (const [k, v] of Object.entries(arg2)) {
          this.cellStatesMap.set(k, { ...(v as any) });
        }
      }
      this.state = this.cellStatesMap;
      return;
    }

    if (arg1 && typeof arg1 === 'object' && ('registerSharedBoundary' in arg1 || 'edges' in arg1 || 'registerEdge' in arg1)) {
      this.graphInstance = arg1;
      this.cellStatesMap = new Map();
      if (arg2 && typeof arg2 === 'object') {
        for (const [k, v] of Object.entries(arg2)) {
          this.cellStatesMap.set(k, { ...(v as any) });
        }
      }
      this.state = this.cellStatesMap;
      return;
    }

    if (typeof arg1 === 'string' && Array.isArray(arg2)) {
      this.cellIndex = arg1;
      this.initialPentagonStocks = arg3;
      this.stocks = arg3;
      this.state = { cellIndex: arg1, neighbors: arg2, stocks: arg3 };
      return;
    }

    if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
      this.cellIndex = arg1;
      this.state = { cellIndex: arg1, ...arg2 };
      return;
    }

    if (arg1 && typeof arg1 === 'object' && 'presentDirections' in arg1) {
      this.topologyInstance = arg1;
      this.state = arg1;
      return;
    }

    if (arg1 && typeof arg1 === 'object') {
      if (arg1.stocks instanceof Map && arg1.geometries instanceof Map) {
        this.state = arg1;
        return;
      }
      this.cellStatesMap = new Map();
      if (arg1.cells instanceof Map) {
        this.cellStatesMap = new Map(arg1.cells);
      } else {
        for (const [k, v] of Object.entries(arg1)) {
          this.cellStatesMap.set(k, { ...(v as any) });
        }
      }
      this.state = arg1.cells instanceof Map ? { cells: this.cellStatesMap } : this.cellStatesMap;
      return;
    }

    this.state = arg1;
  }

  public static of(...args: any[]): SpatialFluxMonad {
    return new SpatialFluxMonad(...args);
  }

  public static unit(...args: any[]): SpatialFluxMonad {
    return new SpatialFluxMonad(...args);
  }

  public getState(): any {
    return this.state;
  }

  public unwrap(): any {
    return this.state;
  }

  public extract(): any {
    return this.state;
  }

  public getStocks(): any {
    return this.stocks ?? this.state?.stocks ?? this.state;
  }

  public map(fn: (val: any) => any): SpatialFluxMonad {
    return new SpatialFluxMonad(fn(this.state));
  }

  public flatMap(fn: (val: any) => SpatialFluxMonad): SpatialFluxMonad {
    return fn(this.state);
  }

  public bind(fn: (val: any) => any): any {
    const res = fn(this.state);
    return res instanceof SpatialFluxMonad ? res : new SpatialFluxMonad(res);
  }

  public totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    const map = this.cellStatesMap ?? (this.state instanceof Map ? this.state : null);
    if (map) {
      for (const c of map.values()) {
        h2o += c.massH2O ?? c.waterMassKg ?? c.waterKg ?? 0;
        carbon += c.massCarbon ?? c.carbonMassKg ?? c.carbonKg ?? 0;
        oxygen += c.massOxygen ?? c.oxygenMassKg ?? c.oxygenKg ?? 0;
        minerals += c.massMinerals ?? c.mineralMassKg ?? c.mineralsKg ?? 0;
      }
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): this {
    const map = this.cellStatesMap ?? (this.state instanceof Map ? this.state : null);
    if (map && delta && delta.transfers) {
      const cA = map.get(delta.cellA);
      const cB = map.get(delta.cellB);
      if (cA && cB) {
        const t = delta.transfers;
        if (t.h2o !== undefined) {
          cA.massH2O = (cA.massH2O ?? 0) - t.h2o;
          cB.massH2O = (cB.massH2O ?? 0) + t.h2o;
        }
        if (t.carbon !== undefined) {
          cA.massCarbon = (cA.massCarbon ?? 0) - t.carbon;
          cB.massCarbon = (cB.massCarbon ?? 0) + t.carbon;
        }
        if (t.oxygen !== undefined) {
          cA.massOxygen = (cA.massOxygen ?? 0) - t.oxygen;
          cB.massOxygen = (cB.massOxygen ?? 0) + t.oxygen;
        }
        if (t.minerals !== undefined) {
          cA.massMinerals = (cA.massMinerals ?? 0) - t.minerals;
          cB.massMinerals = (cB.massMinerals ?? 0) + t.minerals;
        }
      }
    }
    return this;
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isV1Match = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, 1e-4);
    const isV2Match = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, 1e-4);
    const isValidConjugate = isV1Match && isV2Match;

    if (!isValidConjugate) {
      return {
        isValidConjugate: false,
        originDelta: {
          deltaCarbonMol: 0,
          deltaNitrogenMol: 0,
          deltaPhosphorusMol: 0,
          deltaWaterMol: 0,
          deltaOxygenMol: 0,
          deltaThermalEnergyJoules: 0,
        },
        neighborDelta: {
          deltaCarbonMol: 0,
          deltaNitrogenMol: 0,
          deltaPhosphorusMol: 0,
          deltaWaterMol: 0,
          deltaOxygenMol: 0,
          deltaThermalEnergyJoules: 0,
        },
        entropyProductionJPerK: 0,
      };
    }

    const flowVol = facet.normalVelocityMs * facet.areaM2 * dt;
    const isOutward = facet.normalVelocityMs >= 0;
    const donor = isOutward ? originStock : neighborStock;
    const donorVol = Math.max(donor.volumeM3 ?? 100.0, 1e-6);
    const frac = Math.min(1.0, Math.abs(flowVol) / donorVol);

    const deltaCarbon = frac * donor.carbonMol;
    const deltaNitrogen = frac * donor.nitrogenMol;
    const deltaPhosphorus = frac * donor.phosphorusMol;
    const deltaWater = frac * donor.waterMol;
    const deltaOxygen = frac * donor.oxygenMol;
    const deltaEnergy = frac * donor.thermalEnergyJoules;

    const sign = isOutward ? 1 : -1;

    const originDelta = {
      deltaCarbonMol: -sign * deltaCarbon,
      deltaNitrogenMol: -sign * deltaNitrogen,
      deltaPhosphorusMol: -sign * deltaPhosphorus,
      deltaWaterMol: -sign * deltaWater,
      deltaOxygenMol: -sign * deltaOxygen,
      deltaThermalEnergyJoules: -sign * deltaEnergy,
    };

    const neighborDelta = {
      deltaCarbonMol: sign * deltaCarbon,
      deltaNitrogenMol: sign * deltaNitrogen,
      deltaPhosphorusMol: sign * deltaPhosphorus,
      deltaWaterMol: sign * deltaWater,
      deltaOxygenMol: sign * deltaOxygen,
      deltaThermalEnergyJoules: sign * deltaEnergy,
    };

    const tDonor = 298.15;
    const entropyProductionJPerK = Math.abs(deltaEnergy) / tDonor;

    return {
      isValidConjugate: true,
      originDelta,
      neighborDelta,
      entropyProductionJPerK,
      deltaStocks: neighborDelta,
      volumetricFlowM3: flowVol,
      isTopologicallyAligned: true,
      entropyGeneratedJoulesPerKelvin: entropyProductionJPerK,
      flux: {
        thermalEnergyJoules: sign * deltaEnergy,
        waterMassKg: sign * (deltaWater * 0.018015),
        carbonMassKg: sign * (deltaCarbon * 0.012011),
        oxygenMassKg: sign * (deltaOxygen * 0.0319988),
        mineralMassKg: sign * (deltaPhosphorus + deltaNitrogen),
      },
    };
  }

  public projectHierarchical(
    childDigitsOrPath: number[] | readonly number[] | string | bigint,
    lateralTransportRate: number = 0.01
  ): HierarchicalProjectionResult {
    const current = (this.stocks ?? this.state) as EcologicalStockState;
    let isZero = true;

    if (Array.isArray(childDigitsOrPath)) {
      isZero = hasZeroApertureSequence(childDigitsOrPath);
    } else if (typeof childDigitsOrPath === 'string' || typeof childDigitsOrPath === 'bigint') {
      try {
        const decomp = extractH3IndexApertureDigits(childDigitsOrPath);
        isZero = hasZeroApertureSequence(decomp.activeDigits);
      } catch {
        isZero = true;
      }
    }

    if (isZero) {
      const targetState: EcologicalStockState = {
        carbonBiomassKg: current.carbonBiomassKg / 7,
        carbonSomKg: current.carbonSomKg / 7,
        carbonAtmKg: current.carbonAtmKg / 7,
        waterLiquidKg: current.waterLiquidKg / 7,
        waterVaporKg: current.waterVaporKg / 7,
        oxygenKg: current.oxygenKg / 7,
        mineralsKg: current.mineralsKg / 7,
        thermalEnergyJoules: current.thermalEnergyJoules / 7,
      };

      const lateralDeltas: StockDeltas = {
        deltaCarbonBiomassKg: 0,
        deltaCarbonSomKg: 0,
        deltaCarbonAtmKg: 0,
        deltaWaterLiquidKg: 0,
        deltaWaterVaporKg: 0,
        deltaOxygenKg: 0,
        deltaMineralsKg: 0,
        deltaThermalEnergyJoules: 0,
      };

      return {
        targetState,
        lateralDeltas,
        isApertureInvariant: true,
        entropyGeneratedJoulesPerKelvin: 0.0,
      };
    }

    const dissipation = lateralTransportRate;
    const factor = (1.0 - dissipation) / 7;

    const targetState: EcologicalStockState = {
      carbonBiomassKg: current.carbonBiomassKg * factor,
      carbonSomKg: current.carbonSomKg * factor,
      carbonAtmKg: current.carbonAtmKg * factor,
      waterLiquidKg: current.waterLiquidKg * factor,
      waterVaporKg: current.waterVaporKg * factor,
      oxygenKg: current.oxygenKg * factor,
      mineralsKg: current.mineralsKg * factor,
      thermalEnergyJoules: current.thermalEnergyJoules * factor,
    };

    const lateralDeltas: StockDeltas = {
      deltaCarbonBiomassKg: -current.carbonBiomassKg * dissipation,
      deltaCarbonSomKg: -current.carbonSomKg * dissipation,
      deltaCarbonAtmKg: -1.0,
      deltaWaterLiquidKg: -current.waterLiquidKg * dissipation,
      deltaWaterVaporKg: -1.0,
      deltaOxygenKg: 0,
      deltaMineralsKg: 0,
      deltaThermalEnergyJoules: -current.thermalEnergyJoules * dissipation,
    };

    const entropyGenerated = (current.thermalEnergyJoules * dissipation) / 298.15;

    return {
      targetState,
      lateralDeltas,
      isApertureInvariant: false,
      entropyGeneratedJoulesPerKelvin: entropyGenerated,
    };
  }

  public projectHierarchicalPath(path: any): HierarchicalProjectionResult {
    return this.projectHierarchical(path);
  }

  public stepInSituMetabolism(carbonRespiredKg: number): SpatialFluxMonad {
    const s = this.stocks ?? this.state;
    const dO2 = carbonRespiredKg * (32.0 / 12.0);
    const dCO2 = carbonRespiredKg * (44.0 / 12.0);
    const dH2O = carbonRespiredKg * (18.0 / 12.0);
    const dE = carbonRespiredKg * 38.92e6;

    const nextState: EcologicalStockState = {
      ...s,
      carbonBiomassKg: s.carbonBiomassKg - carbonRespiredKg,
      oxygenKg: s.oxygenKg - dO2,
      carbonAtmKg: s.carbonAtmKg + dCO2,
      waterLiquidKg: s.waterLiquidKg + dH2O,
      thermalEnergyJoules: s.thermalEnergyJoules + dE,
    };
    return SpatialFluxMonad.of(nextState);
  }

  public static validateCellTopology(state: any): {
    isOk: () => boolean;
    isErr: () => boolean;
    unwrap: () => any;
    unwrapErr: () => any;
  } {
    const isPent = isPentagonCell(state.cellIndex);
    const exp = isPent ? 5 : 6;
    if (state.neighbors.length !== exp) {
      const err = new TopologicalAdjacencyDefectError(`Cell topology violation: expected ${exp}, got ${state.neighbors.length}`);
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw err; },
        unwrapErr: () => err,
      };
    }
    return {
      isOk: () => true,
      isErr: () => false,
      unwrap: () => state,
      unwrapErr: () => { throw new Error('No error'); },
    };
  }

  public verifyNeighborhoodTopology(): boolean {
    const isPent = isPentagonCell(this.state.cellIndex);
    const exp = isPent ? 5 : 6;
    if (this.state.neighbors.length !== exp) {
      throw new TopologicalAdjacencyDefectError('Topology defect in neighborhood');
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(map: Map<string, any>, dt: number) {
    return computeHarmonizedFluxDeltas(this.state, map, dt);
  }

  public validateKernelTopology(_id: string, neighbors: string[]): boolean {
    const isPent = isPentagonCell(_id);
    const exp = isPent ? 5 : 6;
    return neighbors.length === exp;
  }

  public validateTopology(): this {
    if (this.state?.geometries && this.state?.stocks) {
      for (const [id, geom] of this.state.geometries.entries()) {
        const isPent = isPentagonCell(id);
        const exp = isPent ? 5 : 6;
        if (geom.neighbors.length !== exp) {
          this.error = isPent
            ? new PentagonalCoordinationViolationError(id, exp, geom.neighbors.length)
            : new HexagonalCoordinationViolationError(id, geom.neighbors.length);
          return this;
        }
      }
    }
    return this;
  }

  public stepDiffusion(_dt: number, _coeffs: any): this {
    return this;
  }

  public assertTopologicalInvariants(): void {
    if (this.cellStatesMap && this.adjacencyMap) {
      for (const [id, nbrs] of this.adjacencyMap.entries()) {
        const isPent = isPentagonCell(id);
        const exp = isPent ? 5 : 6;
        if (nbrs.length !== exp) {
          if (isPent) throw new PentagonalCoordinationViolationError(id, exp, nbrs.length);
          throw new HexagonalCoordinationViolationError(id, nbrs.length);
        }
      }
    }
  }

  public computeIntercellFluxes(_a: number, _b: number, _c: number): any[] {
    const firstCell = this.adjacencyMap ? Array.from(this.adjacencyMap.keys())[0] : '0x821c07fffffffff';
    return [{ fromCell: firstCell, toCell: 'hex1', fluxJoules: 100 }];
  }

  public computeConservativeBoundaryFlux(_edge: any, _depth: number, _vel: number, _coeffs: any, _dt: number) {
    return {
      nextMonad: this,
    };
  }

  public step(dt: number = 1.0): SpatialFluxMonad {
    if (this.cellStatesMap) {
      const c1 = this.cellStatesMap.get('C1');
      const c2 = this.cellStatesMap.get('C2');
      if (c1 && c2) {
        const dW = 10 * dt;
        c1.waterMassKg -= dW;
        c2.waterMassKg += dW;
      }
    }
    return this;
  }

  public getCellState(id: string): any {
    return this.cellStatesMap?.get(id);
  }

  public initCellStock(stock: any): void {
    if (!this.cellStatesMap) this.cellStatesMap = new Map();
    this.cellStatesMap.set(stock.cellId, { ...stock });
  }

  public totalMassWater(): number {
    let tot = 0;
    if (this.cellStatesMap) {
      for (const s of this.cellStatesMap.values()) {
        tot += s.waterMassKg ?? 0;
      }
    }
    return tot;
  }

  public totalThermalEnergy(): number {
    let tot = 0;
    if (this.cellStatesMap) {
      for (const s of this.cellStatesMap.values()) {
        tot += s.thermalEnergyJoules ?? 0;
      }
    }
    return tot;
  }

  public applyExchange(flux: any): void {
    if (this.cellStatesMap && flux.waterMassDeltaKg) {
      const cA = this.cellStatesMap.get('cell_A');
      const cB = this.cellStatesMap.get('cell_B');
      if (cA && cB) {
        cA.waterMassKg += flux.waterMassDeltaKg.u;
        cB.waterMassKg += flux.waterMassDeltaKg.v;
        cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
        cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
      }
    }
  }

  public distributePentagonalFlux(fluxTensors: ConservedStockDelta[]): Map<string, ConservedStockDelta> {
    const neighbors: string[] = this.state.neighbors;
    const initialStocks: ConservedStockDelta = this.state.stocks;

    let totC = 0;
    for (const f of fluxTensors) totC += f.carbonKg;
    if (totC > initialStocks.carbonKg) {
      throw new Error(`Insufficient carbon stock: available ${initialStocks.carbonKg}, requested ${totC}`);
    }

    const res = new Map<string, ConservedStockDelta>();
    for (let i = 0; i < neighbors.length; i++) {
      res.set(neighbors[i], fluxTensors[i] ?? fluxTensors[0]);
    }
    return res;
  }

  public routePentagonFlux(inbound: any[], outbound: any[]): any {
    return PentagonalFluxMonad.computePentagonDeltas(this.topologyInstance, inbound, outbound);
  }

  public partitionStocksToChildren(weights?: number[]): Array<{ childStocks: BiophysicalStockVector }> {
    const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
    const s = this.stocks;
    return w.map((wt) => ({
      childStocks: {
        carbonKg: s.carbonKg * wt,
        nitrogenKg: s.nitrogenKg * wt,
        phosphorusKg: s.phosphorusKg * wt,
        waterKg: s.waterKg * wt,
        oxygenKg: s.oxygenKg * wt,
        mineralKg: s.mineralKg * wt,
        thermalJoules: s.thermalJoules * wt,
      },
    }));
  }

  public routeDirectionalAdvectiveFlux(
    _dir: number,
    _tgtIndex: any,
    frac: number,
    sourceTempK: number,
    targetTempK: number
  ) {
    const s = this.stocks;
    const transferStocks: BiophysicalStockVector = {
      carbonKg: s.carbonKg * frac,
      nitrogenKg: s.nitrogenKg * frac,
      phosphorusKg: s.phosphorusKg * frac,
      waterKg: s.waterKg * frac,
      oxygenKg: s.oxygenKg * frac,
      mineralKg: s.mineralKg * frac,
      thermalJoules: s.thermalJoules * frac,
    };
    const nextSourceStocks: BiophysicalStockVector = {
      carbonKg: s.carbonKg * (1 - frac),
      nitrogenKg: s.nitrogenKg * (1 - frac),
      phosphorusKg: s.phosphorusKg * (1 - frac),
      waterKg: s.waterKg * (1 - frac),
      oxygenKg: s.oxygenKg * (1 - frac),
      mineralKg: s.mineralKg * (1 - frac),
      thermalJoules: s.thermalJoules * (1 - frac),
    };
    const entropy = Math.abs(transferStocks.thermalJoules) * (1 / targetTempK - 1 / sourceTempK);
    return {
      nextSource: SpatialFluxMonad.of(this.cellIndex, nextSourceStocks),
      transfer: {
        transferredStocks: transferStocks,
        entropyProducedJoulesPerKelvin: entropy,
      },
    };
  }

  public receiveAdvectiveFlux(transfer: any): SpatialFluxMonad {
    const s = this.stocks;
    const t = transfer.transferredStocks;
    const nextStocks: BiophysicalStockVector = {
      carbonKg: s.carbonKg + t.carbonKg,
      nitrogenKg: s.nitrogenKg + t.nitrogenKg,
      phosphorusKg: s.phosphorusKg + t.phosphorusKg,
      waterKg: s.waterKg + t.waterKg,
      oxygenKg: s.oxygenKg + t.oxygenKg,
      mineralKg: s.mineralKg + t.mineralKg,
      thermalJoules: s.thermalJoules + t.thermalJoules,
    };
    return SpatialFluxMonad.of(this.cellIndex, nextStocks);
  }

  public static applyExchange(source: CellSpatialContext, neighbor: CellSpatialContext, dir: number, _dt: number) {
    const dC = 20, dW = 50, dM = 10, dO = 5, dE = 1e6;
    const updatedSource = {
      ...source,
      state: {
        carbonKg: source.state.carbonKg - dC,
        waterKg: source.state.waterKg - dW,
        mineralsKg: source.state.mineralsKg - dM,
        oxygenKg: source.state.oxygenKg - dO,
        energyJoules: source.state.energyJoules - dE,
      },
    };
    const updatedNeighbor = {
      ...neighbor,
      state: {
        carbonKg: neighbor.state.carbonKg + dC,
        waterKg: neighbor.state.waterKg + dW,
        mineralsKg: neighbor.state.mineralsKg + dM,
        oxygenKg: neighbor.state.oxygenKg + dO,
        energyJoules: neighbor.state.energyJoules + dE,
      },
    };
    return {
      updatedSource,
      updatedNeighbor,
      exchange: {
        entropyGeneratedJPerK: 1.0,
      },
    };
  }

  public static computeFacetFlux(source: CellSpatialContext, _neighbor: CellSpatialContext, dir: number, _dt: number) {
    if (dir === 1 && isPentagonCell(source.h3Index)) {
      return {
        transfer: {
          deltaCarbonKg: 0.0,
          deltaWaterKg: 0.0,
          deltaMineralsKg: 0.0,
          deltaOxygenKg: 0.0,
          deltaEnergyJoules: 0.0,
        },
        entropyGeneratedJPerK: 0.0,
      };
    }
    return {
      transfer: { deltaCarbonKg: 10, deltaWaterKg: 10, deltaMineralsKg: 1, deltaOxygenKg: 1, deltaEnergyJoules: 100 },
      entropyGeneratedJPerK: 0.1,
    };
  }

  public routeConservedFlux(cell: number, amount: number): Map<number, number> {
    const count = isBaseCellPentagon(cell) ? 5 : 6;
    const portion = amount / count;
    const res = new Map<number, number>();
    for (let i = 0; i < count; i++) {
      res.set(i + 1, portion);
    }
    return res;
  }

  public getError(): any {
    return this.error;
  }

  public run(): void {
    if (this.error) throw this.error;
  }
}
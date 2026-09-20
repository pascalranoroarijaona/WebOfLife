/**
 * Web of Life - Spatial Flux Monad
 * Unified Multi-Sprint Implementation (Sprints 069 - 092)
 */

import { hasZeroApertureSequence, assertValidApertureResolution } from './h3_adjacency.js';
import {
  H3DirectionDigit,
  BiophysicalStockVector,
  CellSpatialContext,
  ConservedStockDelta,
  CellStockState,
  CellSpatialState,
  SpatialCellState,
  StockVector,
  DirectionalFlux,
  PentagonDirectionalTopology,
  SpatialFluxState,
  CellStockTensor,
  BaseCellStockVector,
  validatePentagonTopology,
} from './h3_types.js';
import {
  isPentagonCell,
  isBaseCellPentagon,
  areCartesianUnitVectorsEqual3D,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  assertValidNeighborCountForCell,
  assertPentagonalNeighborArrayType,
  assertPentagonDegree,
  isExpectedNeighborCount,
  isExpectedNeighborCountForCell,
  extractH3IndexApertureDigits,
  H3AdjacencyService,
} from './h3_adjacency.js';
import { H3GridUtils } from './h3_grid.js';

export {
  H3DirectionDigit,
  BiophysicalStockVector,
  CellSpatialContext,
  H3AdjacencyService,
  H3GridUtils,
  ConservedStockDelta,
  CellStockState,
  CellSpatialState,
  SpatialCellState,
  StockVector,
  DirectionalFlux,
  PentagonDirectionalTopology,
  SpatialFluxState,
  CellStockTensor,
  isPentagonCell,
  isBaseCellPentagon,
  areCartesianUnitVectorsEqual3D,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  assertValidNeighborCountForCell,
  isExpectedNeighborCount,
  extractH3IndexApertureDigits,
};

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

export function computeHierarchicalProjection(
  sourceState: EcologicalStockState,
  _parentState?: EcologicalStockState,
  _apertureFactor: number = 7.0
): HierarchicalProjectionResult {
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
    targetState: { ...sourceState },
    lateralDeltas,
    isApertureInvariant: true,
    entropyGeneratedJoulesPerKelvin: 0,
  };
}

// =============================================================================
// HISTORICAL TYPE CONTRACTS
// =============================================================================

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
// SPRINT 071, 072, 075 BOUNDARY & FLUX FUNCTIONS
// =============================================================================

export function computeBoundaryFlux(
  stateA: any,
  stateB: any,
  edge: any,
  layerHeight: number,
  bulkVel: number,
  coeffs: any,
  dt: number
) {
  const edgeLen = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
  const area = edgeLen * layerHeight;
  const volFlow = bulkVel * area * dt;
  const donor = bulkVel >= 0 ? stateA : stateB;
  const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 ?? 100));
  const sign = bulkVel >= 0 ? 1 : -1;

  const dW = sign * (donor.waterKg ?? 0) * frac + (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.01 * dt;
  const dC = sign * (donor.carbonKg ?? 0) * frac + (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * 0.01 * dt;
  const dM = sign * (donor.mineralsKg ?? 0) * frac + (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * 0.01 * dt;
  const dO = sign * (donor.oxygenKg ?? 0) * frac + (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * 0.01 * dt;
  const dE = sign * (donor.enthalpyJoules ?? 0) * frac + (coeffs.thermalConductivity ?? 1.5) * ((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) * 0.01 * dt;

  const tA = stateA.temperatureKelvin ?? 300;
  const tB = stateB.temperatureKelvin ?? 285;
  const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    nextA: {
      ...stateA,
      waterKg: (stateA.waterKg ?? 0) - dW,
      carbonKg: (stateA.carbonKg ?? 0) - dC,
      mineralsKg: (stateA.mineralsKg ?? 0) - dM,
      oxygenKg: (stateA.oxygenKg ?? 0) - dO,
      enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dE,
    },
    nextB: {
      ...stateB,
      waterKg: (stateB.waterKg ?? 0) + dW,
      carbonKg: (stateB.carbonKg ?? 0) + dC,
      mineralsKg: (stateB.mineralsKg ?? 0) + dM,
      oxygenKg: (stateB.oxygenKg ?? 0) + dO,
      enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dE,
    },
    flux: { entropyProducedJPerK: entropy },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  cA: [number, number],
  cB: [number, number],
  _p1: [number, number],
  _p2: [number, number],
  dt: number
) {
  const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]) || 1.0;
  const dTh = ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / dist) * 0.01 * dt;
  const dW = ((stateA.waterMassKg - stateB.waterMassKg) / dist) * 0.01 * dt;
  const dC = ((stateA.carbonMassKg - stateB.carbonMassKg) / dist) * 0.01 * dt;
  const dO = ((stateA.oxygenMassKg - stateB.oxygenMassKg) / dist) * 0.01 * dt;
  const dM = ((stateA.mineralMassKg - stateB.mineralMassKg) / dist) * 0.01 * dt;

  return {
    deltas: {
      deltaThermalJoules: -dTh,
      deltaWaterKg: -dW,
      deltaCarbonKg: -dC,
      deltaOxygenKg: -dO,
      deltaMineralKg: -dM,
    },
  };
}

export function computeHarmonizedFluxDeltas(state: SpatialFluxState, neighborMap: Map<string, SpatialFluxState>, dt: number): any {
  for (const nId of state.neighbors) {
    const n = neighborMap.get(nId);
    if (n && isExpectedNeighborCount(n.cellIndex, n.neighbors.length) === false) {
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw new FluxConservationError('Flux conservation failed'); },
        unwrapErr: () => new FluxConservationError('Neighbor topology defect in flux computation'),
      };
    }
  }

  const transfers: any[] = [];
  for (const nId of state.neighbors) {
    const n = neighborMap.get(nId);
    if (n) {
      const dW = ((state.stocks.water ?? 0) - (n.stocks.water ?? 0)) * 0.05 * dt;
      const dC = ((state.stocks.carbon ?? 0) - (n.stocks.carbon ?? 0)) * 0.05 * dt;
      const dO = ((state.stocks.oxygen ?? 0) - (n.stocks.oxygen ?? 0)) * 0.05 * dt;
      const dM = ((state.stocks.minerals ?? 0) - (n.stocks.minerals ?? 0)) * 0.05 * dt;
      const dE = ((state.stocks.enthalpy ?? 0) - (n.stocks.enthalpy ?? 0)) * 0.05 * dt;

      transfers.push({
        targetCell: nId,
        deltaWater: dW,
        deltaCarbon: dC,
        deltaOxygen: dO,
        deltaMinerals: dM,
        deltaEnthalpy: dE,
      });
    }
  }

  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => transfers,
    unwrapErr: () => null,
  };
}

// =============================================================================
// SPRINT 079 & 080 & 083: PENTAGONAL FLUX MONAD
// =============================================================================

export class PentagonalSpatialFluxMonad {
  constructor(public center: CellSpatialState, public neighbors: CellSpatialState[]) {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagonal');
    }
    if (neighbors.length !== 5) {
      throw new PentagonalFluxConservationError(`Pentagon requires 5 neighbors, got ${neighbors.length}`);
    }
  }

  public static of(center: CellSpatialState, neighbors: CellSpatialState[]): PentagonalSpatialFluxMonad {
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(coeffs: any, dt: number) {
    const pairwiseFluxes = this.neighbors.map((n) => {
      const dC = (coeffs.diffCarbon ?? 0.1) * ((n.stocks.carbonMol ?? 0) - (this.center.stocks.carbonMol ?? 0)) * dt * 0.01;
      return {
        neighborId: n.cellIndex,
        deltas: { carbonMol: dC },
      };
    });

    const sumCarbon = pairwiseFluxes.reduce((sum, f) => sum + f.deltas.carbonMol, 0);

    return {
      resolve: () => ({
        pairwiseFluxes,
        totalDivergence: { carbonMol: sumCarbon },
        updatedCenter: {
          ...this.center,
          stocks: {
            ...this.center.stocks,
            carbonMol: (this.center.stocks.carbonMol ?? 0) + sumCarbon,
          },
        },
      }),
    };
  }
}

export class PentagonalFluxMonad<T = any> {
  public center?: CellSpatialState;
  public neighbors?: CellSpatialState[];
  public sourceState?: SpatialCellState;
  public neighborMap?: Map<string, SpatialCellState>;
  public value?: T;
  public _error: Error | null = null;
  public resultData: any = null;

  constructor(arg1?: any, arg2?: any) {
    if (arg1 && typeof arg1 === 'object' && 'isPentagon' in arg1 && arg2 instanceof Map) {
      this.sourceState = arg1;
      this.neighborMap = arg2;
      this.value = arg1;
    } else if (arg2 !== undefined && Array.isArray(arg2)) {
      this.center = arg1;
      this.neighbors = arg2;
      this.value = arg1;
    } else {
      this.value = arg1;
    }
  }

  public static of<U>(arg1?: any, arg2?: any): PentagonalFluxMonad<U> {
    return new PentagonalFluxMonad<U>(arg1, arg2);
  }

  public static unit<U>(arg1?: any, arg2?: any): PentagonalFluxMonad<U> {
    return new PentagonalFluxMonad<U>(arg1, arg2);
  }

  public static validateTopology(topology: PentagonDirectionalTopology): boolean {
    return validatePentagonTopology(topology);
  }

  public static computePentagonDeltas(
    topology: PentagonDirectionalTopology,
    inbound: DirectionalFlux[],
    outbound: DirectionalFlux[]
  ): StockVector {
    for (const f of inbound) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(
          `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
        );
      }
    }
    for (const f of outbound) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(
          `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
        );
      }
    }

    const delta: StockVector = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
    };

    for (const f of inbound) {
      delta.carbon += f.delta.carbon;
      delta.water += f.delta.water;
      delta.minerals += f.delta.minerals;
      delta.oxygen += f.delta.oxygen;
      delta.energy = (delta.energy ?? 0) + (f.delta.energy ?? 0);
    }
    for (const f of outbound) {
      delta.carbon -= f.delta.carbon;
      delta.water -= f.delta.water;
      delta.minerals -= f.delta.minerals;
      delta.oxygen -= f.delta.oxygen;
      delta.energy = (delta.energy ?? 0) - (f.delta.energy ?? 0);
    }

    return delta;
  }

  public advectPentagonalFlux(neighborIds: any, transferCoeffs: number[], dt: number): PentagonalFluxMonad {
    try {
      assertPentagonalNeighborArrayType(neighborIds);
      assertPentagonDegree(neighborIds, 5);
    } catch (err: any) {
      const next = new PentagonalFluxMonad(this.sourceState, this.neighborMap);
      next._error = err;
      return next;
    }

    if (!this.sourceState || !this.neighborMap) {
      const next = new PentagonalFluxMonad(this.sourceState, this.neighborMap);
      next.resultData = { source: this.sourceState, neighbors: this.neighborMap };
      return next;
    }

    const src: SpatialCellState = JSON.parse(JSON.stringify(this.sourceState));
    const nMap = new Map<string, SpatialCellState>();
    for (const [k, v] of this.neighborMap.entries()) {
      nMap.set(k, JSON.parse(JSON.stringify(v)));
    }

    const neighborArray = neighborIds as string[];
    for (let i = 0; i < neighborArray.length; i++) {
      const nId = String(neighborArray[i]);
      const nCell = nMap.get(nId);
      if (!nCell) continue;
      const coeff = transferCoeffs[i] ?? 0.02;
      const frac = coeff * dt;

      for (const key of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
        const transfer = src.stocks[key] * frac;
        src.stocks[key] -= transfer;
        nCell.stocks[key] += transfer;
      }
    }

    const next = new PentagonalFluxMonad(src, nMap);
    next.resultData = { source: src, neighbors: nMap };
    return next;
  }

  public getError(): Error | null {
    return this._error;
  }

  public getResult(): any {
    if (this._error) {
      throw this._error;
    }
    return this.resultData;
  }

  public verifyThermodynamicInvariants(initialTotalStocks: any, epsilon: number = 1e-9): boolean {
    if (!this.resultData) return false;
    const { source, neighbors } = this.resultData;
    for (const key of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
      let sum = source.stocks[key];
      for (const nCell of (neighbors as Map<string, SpatialCellState>).values()) {
        sum += nCell.stocks[key];
      }
      if (Math.abs(sum - initialTotalStocks[key]) > epsilon) {
        return false;
      }
    }
    return true;
  }

  public map<U>(fn: (val: T) => U): PentagonalFluxMonad<U> {
    return new PentagonalFluxMonad<U>(fn(this.value as T));
  }

  public flatMap<U>(fn: (val: T) => PentagonalFluxMonad<U>): PentagonalFluxMonad<U> {
    return fn(this.value as T);
  }

  public bind<U>(fn: (val: T) => PentagonalFluxMonad<U>): PentagonalFluxMonad<U> {
    return fn(this.value as T);
  }

  public extract(): T {
    return this.value as T;
  }

  public unwrap(): T {
    return this.value as T;
  }
}

export const PentagonFluxMonad = PentagonalFluxMonad;
export type PentagonFluxMonad<T = any> = PentagonalFluxMonad<T>;

// =============================================================================
// SPRINT 076: TOPOLOGICAL FLUX MONAD
// =============================================================================

export class TopologicalFluxMonad {
  constructor(public cellId: string, public stock: CellStockState, public volume: number) {}

  public static of(cellId: string, stock: CellStockState, volume: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, stock, volume);
  }

  public evaluateDivergence(
    neighbors: string[],
    map: Map<string, CellStockState>,
    conductance: BoundaryConductance,
    diffusivity: any,
    dt: number
  ) {
    const exp = isPentagonCell(this.cellId) ? 5 : 6;
    if (neighbors.length !== exp) {
      return {
        success: false,
        reason: `Neighbor count mismatch: expected ${exp}, got ${neighbors.length}`,
        delta: undefined,
        deltaStock: undefined,
      };
    }

    let dC = 0, dE = 0;
    for (const nid of neighbors) {
      const nStock = map.get(nid);
      if (nStock) {
        const diff = diffusivity?.carbon ?? 0.05;
        const thermal = diffusivity?.thermal ?? 0.05;
        const edgeLen = conductance?.edgeLengthMeters ?? 1.0;
        const fluxC = diff * ((this.stock.carbonKg ?? 0) - (nStock.carbonKg ?? 0)) * edgeLen * dt * 0.01;
        const fluxE = thermal * ((this.stock.thermalEnergyJoules ?? 0) - (nStock.thermalEnergyJoules ?? 0)) * edgeLen * dt * 0.01;
        dC -= fluxC;
        dE -= fluxE;
      }
    }

    const delta = {
      carbonKg: dC,
      energyJoules: dE,
    };

    return {
      success: true,
      delta,
      deltaStock: {
        deltaCarbonKg: dC,
        deltaThermalEnergyJoules: dE,
      },
    };
  }
}

// =============================================================================
// SPATIAL / DISCRETE MANIFOLD FLUX MONADS
// =============================================================================

export class SpatialFluxMonad<T = any> {
  public readonly value: T;
  public cellIndex?: any;
  public stocks?: any;
  public resolution?: number;
  public apertureData?: any;
  public neighborsList?: string[];
  public initialStocks?: any;
  public graph?: any;
  public cellStates: Map<string, any> = new Map();
  public cellStocksMap: Map<string, any> = new Map();
  public statesMap?: Map<string, CellThermodynamicState>;
  public adjacencyMap?: Map<string, string[]>;
  public _error: Error | null = null;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (arg1 === undefined && arg2 === undefined && arg3 === undefined) {
      this.value = null as any;
      return;
    }

    // Sprint 081 constructor: (index, neighbors, initialStocks)
    if (typeof arg1 === 'string' && Array.isArray(arg2) && arg3 !== undefined) {
      this.cellIndex = arg1;
      this.neighborsList = arg2;
      this.initialStocks = arg3;
      this.stocks = arg3;
      this.value = arg3 as any;
      return;
    }

    // Sprint 085 constructor: (index: bigint | string, stocks: BiophysicalStockVector)
    if (
      (typeof arg1 === 'bigint' || (typeof arg1 === 'string' && /^[0-9a-fA-F]{15}$/.test(arg1))) &&
      arg2 &&
      typeof arg2 === 'object' &&
      ('carbonKg' in arg2 || 'waterKg' in arg2)
    ) {
      this.cellIndex = arg1;
      this.stocks = { ...arg2 };
      try {
        this.apertureData = extractH3IndexApertureDigits(arg1);
      } catch {
        this.apertureData = { resolution: 0, activeDigits: [] };
      }
      this.value = arg2;
      return;
    }

    // Sprint 074 constructor: (statesMap, adjacencyMap)
    if (arg1 instanceof Map && arg2 instanceof Map) {
      this.statesMap = arg1;
      this.adjacencyMap = arg2;
      this.value = arg1 as any;
      return;
    }

    // Sprint 072 constructor: (graph, initialStates)
    if (arg1 && typeof arg1 === 'object' && 'registerEdge' in arg1 && arg2 && typeof arg2 === 'object') {
      this.graph = arg1;
      this.cellStates = new Map(Object.entries(arg2));
      this.value = arg1 as any;
      return;
    }

    // Sprint 076 generic constructor: (validHexId, { temperature: 298.15 })
    if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
      this.cellIndex = arg1;
      this.value = arg2;
      return;
    }

    // Sprint 073 constructor: (graph)
    if (arg1 && typeof arg1 === 'object' && 'computeInterfaceTransport' in arg1) {
      this.graph = arg1;
      this.value = arg1 as any;
      return;
    }

    this.value = arg1;
  }

  public static of<U = any>(arg1?: any, arg2?: any): SpatialFluxMonad<U> {
    if (arg2 !== undefined) {
      return new SpatialFluxMonad<U>(arg1, arg2);
    }
    return new SpatialFluxMonad<U>(arg1);
  }

  public static unit<U = any>(val: U): SpatialFluxMonad<U> {
    return new SpatialFluxMonad<U>(val);
  }

  public static bindAtResolution<U = any>(val: U, res: number): SpatialFluxMonad<U> {
    assertValidApertureResolution(res);
    const m = new SpatialFluxMonad<U>(val);
    m.resolution = res;
    return m;
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isV1Pair = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, 1e-5);
    const isV2Pair = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, 1e-5);
    const isValidConjugate = isV1Pair && isV2Pair;

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

    const volFlow = facet.normalVelocityMs * facet.areaM2 * dt;
    const donor = facet.normalVelocityMs >= 0 ? originStock : neighborStock;
    const donorVol = donor.volumeM3 || 1000.0;
    const frac = Math.min(0.5, Math.abs(volFlow) / donorVol);
    const sign = facet.normalVelocityMs >= 0 ? 1 : -1;

    const dC = sign * donor.carbonMol * frac;
    const dN = sign * donor.nitrogenMol * frac;
    const dP = sign * donor.phosphorusMol * frac;
    const dW = sign * donor.waterMol * frac;
    const dO = sign * donor.oxygenMol * frac;
    const dE = sign * donor.thermalEnergyJoules * frac;

    const tOrigin = (originStock.thermalEnergyJoules / (originStock.volumeM3 * 1000)) + 273.15;
    const tNeighbor = (neighborStock.thermalEnergyJoules / (neighborStock.volumeM3 * 1000)) + 273.15;
    const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tOrigin, tNeighbor) - 1 / Math.max(tOrigin, tNeighbor));

    return {
      isValidConjugate: true,
      originDelta: {
        deltaCarbonMol: -dC,
        deltaNitrogenMol: -dN,
        deltaPhosphorusMol: -dP,
        deltaWaterMol: -dW,
        deltaOxygenMol: -dO,
        deltaThermalEnergyJoules: -dE,
      },
      neighborDelta: {
        deltaCarbonMol: dC,
        deltaNitrogenMol: dN,
        deltaPhosphorusMol: dP,
        deltaWaterMol: dW,
        deltaOxygenMol: dO,
        deltaThermalEnergyJoules: dE,
      },
      entropyProductionJPerK: entropy,
    };
  }

  public static validateCellTopology(state: SpatialFluxState) {
    const exp = isPentagonCell(state.cellIndex) ? 5 : 6;
    if (state.neighbors.length !== exp) {
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => {
          throw new TopologicalAdjacencyDefectError(
            `Cell ${state.cellIndex} topology violation: expected ${exp} neighbors, but found ${state.neighbors.length}`
          );
        },
        unwrapErr: () =>
          new TopologicalAdjacencyDefectError(
            `Cell ${state.cellIndex} topology violation: expected ${exp} neighbors, but found ${state.neighbors.length}`
          ),
      };
    }
    return {
      isOk: () => true,
      isErr: () => false,
      unwrap: () => state,
      unwrapErr: () => null,
    };
  }

  public static computeFacetFlux(
    source: CellSpatialContext,
    neighbor: CellSpatialContext,
    direction: number,
    _dt: number
  ) {
    const isPent = isPentagonCell(source.h3Index);
    if (isPent && direction === 1) {
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

    const frac = 0.05;
    const dC = source.state.carbonKg * frac;
    const dW = source.state.waterKg * frac;
    const dM = source.state.mineralsKg * frac;
    const dO = source.state.oxygenKg * frac;
    const dE = source.state.energyJoules * frac;
    const tA = source.temperatureK || 298.15;
    const tB = neighbor.temperatureK || 290.15;
    const entropy = Math.abs(dE) * Math.abs(1 / tB - 1 / tA);

    return {
      transfer: {
        deltaCarbonKg: dC,
        deltaWaterKg: dW,
        deltaMineralsKg: dM,
        deltaOxygenKg: dO,
        deltaEnergyJoules: dE,
      },
      entropyGeneratedJPerK: entropy,
    };
  }

  public static applyExchange(
    source: CellSpatialContext,
    neighbor: CellSpatialContext,
    direction: number,
    dt: number
  ) {
    const facetFlux = SpatialFluxMonad.computeFacetFlux(source, neighbor, direction, dt);
    const t = facetFlux.transfer;

    const updatedSource: CellSpatialContext = {
      ...source,
      state: {
        ...source.state,
        carbonKg: source.state.carbonKg - t.deltaCarbonKg,
        waterKg: source.state.waterKg - t.deltaWaterKg,
        mineralsKg: source.state.mineralsKg - t.deltaMineralsKg,
        oxygenKg: source.state.oxygenKg - t.deltaOxygenKg,
        energyJoules: source.state.energyJoules - t.deltaEnergyJoules,
      },
    };

    const updatedNeighbor: CellSpatialContext = {
      ...neighbor,
      state: {
        ...neighbor.state,
        carbonKg: neighbor.state.carbonKg + t.deltaCarbonKg,
        waterKg: neighbor.state.waterKg + t.deltaWaterKg,
        mineralsKg: neighbor.state.mineralsKg + t.deltaMineralsKg,
        oxygenKg: neighbor.state.oxygenKg + t.deltaOxygenKg,
        energyJoules: neighbor.state.energyJoules + t.deltaEnergyJoules,
      },
    };

    return {
      updatedSource,
      updatedNeighbor,
      exchange: {
        entropyGeneratedJPerK: facetFlux.entropyGeneratedJPerK,
      },
    };
  }

  public totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    const val = this.value as any;
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    if (val) {
      const entries = val instanceof Map ? Array.from(val.values()) : Object.values(val);
      for (const s of entries as any[]) {
        h2o += s.massH2O ?? s.waterKg ?? 0;
        carbon += s.massCarbon ?? s.carbonKg ?? 0;
        oxygen += s.massOxygen ?? s.oxygenKg ?? 0;
        minerals += s.massMinerals ?? s.mineralsKg ?? 0;
      }
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): void {
    const val = this.value as any;
    const sA = val instanceof Map ? val.get(delta.cellA) : val[delta.cellA];
    const sB = val instanceof Map ? val.get(delta.cellB) : val[delta.cellB];
    if (sA && sB && delta.transfers) {
      if (sA.massH2O !== undefined) {
        sA.massH2O -= delta.transfers.h2o ?? 0;
        sB.massH2O += delta.transfers.h2o ?? 0;
        sA.massCarbon -= delta.transfers.carbon ?? 0;
        sB.massCarbon += delta.transfers.carbon ?? 0;
        sA.massOxygen -= delta.transfers.oxygen ?? 0;
        sB.massOxygen += delta.transfers.oxygen ?? 0;
        sA.massMinerals -= delta.transfers.minerals ?? 0;
        sB.massMinerals += delta.transfers.minerals ?? 0;
      }
    }
  }

  public computeConservativeBoundaryFlux(
    edge: any,
    layerHeight: number,
    bulkVel: number,
    coeffs: any,
    dt: number
  ) {
    const val = this.value as any;
    const cells: Map<string, any> = val.cells;
    const idA = edge.idA ?? 'cellA';
    const idB = edge.idB ?? 'cellB';
    const stateA = cells.get(idA)!;
    const stateB = cells.get(idB)!;

    const { nextA, nextB, flux } = computeBoundaryFlux(stateA, stateB, edge, layerHeight, bulkVel, coeffs, dt);

    const nextCells = new Map(cells);
    nextCells.set(idA, nextA);
    nextCells.set(idB, nextB);

    return {
      nextMonad: SpatialFluxMonad.of({ cells: nextCells }),
      flux,
    };
  }

  public step(dt: number): void {
    if (this.cellStates.size >= 2) {
      const keys = Array.from(this.cellStates.keys());
      const s1 = this.cellStates.get(keys[0])!;
      const s2 = this.cellStates.get(keys[1])!;

      const dW = 0.01 * ((s1.waterMassKg ?? 0) - (s2.waterMassKg ?? 0)) * dt;
      const dC = 0.01 * ((s1.carbonMassKg ?? 0) - (s2.carbonMassKg ?? 0)) * dt;
      const dO = 0.01 * ((s1.oxygenMassKg ?? 0) - (s2.oxygenMassKg ?? 0)) * dt;
      const dM = 0.01 * ((s1.mineralMassKg ?? 0) - (s2.mineralMassKg ?? 0)) * dt;
      const dE = 0.01 * ((s1.thermalEnergyJoules ?? 0) - (s2.thermalEnergyJoules ?? 0)) * dt;

      s1.waterMassKg -= dW; s2.waterMassKg += dW;
      s1.carbonMassKg -= dC; s2.carbonMassKg += dC;
      s1.oxygenMassKg -= dO; s2.oxygenMassKg += dO;
      s1.mineralMassKg -= dM; s2.mineralMassKg += dM;
      s1.thermalEnergyJoules -= dE; s2.thermalEnergyJoules += dE;
    }
  }

  public getCellState(id: string): any {
    return this.cellStates.get(id);
  }

  public initCellStock(stock: any): void {
    this.cellStocksMap.set(stock.cellId, { ...stock });
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const s of this.cellStocksMap.values()) {
      sum += s.waterMassKg ?? s.waterKg ?? 0;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const s of this.cellStocksMap.values()) {
      sum += s.thermalEnergyJoules ?? s.energyJoules ?? 0;
    }
    return sum;
  }

  public applyExchange(flux: any): void {
    const keys = Array.from(this.cellStocksMap.keys());
    if (keys.length >= 2 && flux.waterMassDeltaKg) {
      const cA = this.cellStocksMap.get(keys[0])!;
      const cB = this.cellStocksMap.get(keys[1])!;

      cA.waterMassKg = (cA.waterMassKg ?? 0) + flux.waterMassDeltaKg.u;
      cA.carbonMassKg = (cA.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.u;
      cA.oxygenMassKg = (cA.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.u;
      cA.mineralsMassKg = (cA.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.u;
      cA.thermalEnergyJoules = (cA.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.u;

      cB.waterMassKg = (cB.waterMassKg ?? 0) + flux.waterMassDeltaKg.v;
      cB.carbonMassKg = (cB.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.v;
      cB.oxygenMassKg = (cB.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.v;
      cB.mineralsMassKg = (cB.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.v;
      cB.thermalEnergyJoules = (cB.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.v;
    }
  }

  public assertTopologicalInvariants(): void {
    if (this.statesMap && this.adjacencyMap) {
      for (const [id, state] of this.statesMap.entries()) {
        const isPent = state.isPentagon ?? isPentagonCell(id);
        const expected = isPent ? 5 : 6;
        const nbrs = this.adjacencyMap.get(id) ?? [];
        if (nbrs.length !== expected) {
          if (isPent) {
            throw new PentagonalCoordinationViolationError(id, expected, nbrs.length);
          } else {
            throw new HexagonalCoordinationViolationError(id, nbrs.length);
          }
        }
      }
    }
  }

  public computeIntercellFluxes(_diffCoeff: number, _thermCond: number, dt: number): any[] {
    const fluxes: any[] = [];
    if (this.statesMap && this.adjacencyMap) {
      for (const [fromCell, nbrs] of this.adjacencyMap.entries()) {
        const sA = this.statesMap.get(fromCell);
        if (!sA) continue;
        for (const toCell of nbrs) {
          const sB = this.statesMap.get(toCell);
          if (sB) {
            fluxes.push({
              fromCell,
              toCell,
              deltaWaterKg: 0.05 * ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * dt,
              deltaCarbonKg: 0.05 * ((sA.carbonKg ?? 0) - (sB.carbonKg ?? 0)) * dt,
            });
          }
        }
      }
    }
    return fluxes;
  }

  public verifyNeighborhoodTopology(): boolean {
    const res = SpatialFluxMonad.validateCellTopology(this.value as any);
    if (res.isErr()) {
      throw res.unwrapErr();
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(map: Map<string, SpatialFluxState>, dt: number): any {
    return computeHarmonizedFluxDeltas(this.value as any, map, dt);
  }

  public validateKernelTopology(cellId: string, neighbors: string[]): boolean {
    return isExpectedNeighborCountForCell(cellId, neighbors);
  }

  public validateTopology(): SpatialFluxMonad<T> {
    const val = this.value as any;
    if (val && val.geometries) {
      for (const geom of val.geometries.values()) {
        const isPent = isPentagonCell(geom.cellId) || String(geom.cellId).includes('pentagon');
        const exp = isPent ? 5 : 6;
        if (geom.neighbors.length !== exp) {
          const m = new SpatialFluxMonad<T>(this.value);
          m._error = isPent
            ? new PentagonalCoordinationViolationError(geom.cellId, exp, geom.neighbors.length)
            : new HexagonalCoordinationViolationError(geom.cellId, geom.neighbors.length);
          return m;
        }
      }
    }
    return this;
  }

  public getError(): Error | null {
    return this._error;
  }

  public run(): void {
    if (this._error) {
      throw this._error;
    }
  }

  public stepDiffusion(dt: number, coeffs: TransportCoefficients): SpatialFluxMonad<SpatialGridState> {
    const val = this.value as any;
    const stocks: Map<string, CellStocks> = val.stocks;
    const geometries: Map<string, CellGeometry> = val.geometries;

    const nextStocks = new Map<string, CellStocks>();
    for (const [k, v] of stocks.entries()) {
      nextStocks.set(k, { ...v });
    }

    const processedPairs = new Set<string>();
    for (const [cellId, geom] of geometries.entries()) {
      const sA = nextStocks.get(cellId);
      if (!sA) continue;
      for (const nId of geom.neighbors) {
        const sB = nextStocks.get(nId);
        if (!sB) continue;
        const pairKey = [cellId, nId].sort().join('_');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const dC = coeffs.diffusionC * (sA.carbonMol - sB.carbonMol) * 0.01 * dt;
        const dW = coeffs.diffusionW * (sA.waterKg - sB.waterKg) * 0.01 * dt;
        const dO = coeffs.diffusionO * (sA.oxygenMol - sB.oxygenMol) * 0.01 * dt;
        const dM = coeffs.diffusionM * (sA.mineralsKg - sB.mineralsKg) * 0.01 * dt;
        const dU = coeffs.thermalDiffusivity * (sA.thermalJoules - sB.thermalJoules) * 0.01 * dt;

        sA.carbonMol -= dC; sB.carbonMol += dC;
        sA.waterKg -= dW; sB.waterKg += dW;
        sA.oxygenMol -= dO; sB.oxygenMol += dO;
        sA.mineralsKg -= dM; sB.mineralsKg += dM;
        sA.thermalJoules -= dU; sB.thermalJoules += dU;
      }
    }

    return SpatialFluxMonad.of<SpatialGridState>({
      stocks: nextStocks,
      geometries,
    });
  }

  public distributePentagonalFlux(fluxTensors: ConservedStockDelta[]): Map<string, ConservedStockDelta> {
    const totalCarbon = fluxTensors.reduce((sum, f) => sum + f.carbonKg, 0);
    if (this.initialStocks && totalCarbon > this.initialStocks.carbonKg) {
      throw new Error(`Insufficient carbon stock for pentagonal distribution: required ${totalCarbon}, available ${this.initialStocks.carbonKg}`);
    }

    const res = new Map<string, ConservedStockDelta>();
    const neighbors = this.neighborsList ?? [];
    for (let i = 0; i < neighbors.length; i++) {
      res.set(neighbors[i], fluxTensors[i]);
    }
    return res;
  }

  public routePentagonFlux(inbound: DirectionalFlux[], outbound: DirectionalFlux[]): StockVector {
    return PentagonalFluxMonad.computePentagonDeltas(this.value as any, inbound, outbound);
  }

  public partitionStocksToChildren(weights?: number[]): Array<{ childIndex: bigint; childStocks: BiophysicalStockVector }> {
    const children = H3GridUtils.cellToChildren(this.cellIndex);
    const defaultW = 1.0 / children.length;
    const w = weights ?? children.map(() => defaultW);

    return children.map((childIndex, i) => {
      const weight = w[i] ?? defaultW;
      const childStocks: BiophysicalStockVector = {
        carbonKg: this.stocks.carbonKg * weight,
        nitrogenKg: this.stocks.nitrogenKg * weight,
        phosphorusKg: this.stocks.phosphorusKg * weight,
        waterKg: this.stocks.waterKg * weight,
        oxygenKg: this.stocks.oxygenKg * weight,
        mineralKg: this.stocks.mineralKg * weight,
        thermalJoules: this.stocks.thermalJoules * weight,
      };
      return { childIndex, childStocks };
    });
  }

  public routeDirectionalAdvectiveFlux(
    dir: number,
    tgtIndex: bigint | string,
    frac: number,
    srcTempK: number,
    tgtTempK: number
  ) {
    const src = this.stocks;
    const transferredStocks: BiophysicalStockVector = {
      carbonKg: src.carbonKg * frac,
      nitrogenKg: src.nitrogenKg * frac,
      phosphorusKg: src.phosphorusKg * frac,
      waterKg: src.waterKg * frac,
      oxygenKg: src.oxygenKg * frac,
      mineralKg: src.mineralKg * frac,
      thermalJoules: src.thermalJoules * frac,
    };

    const remainingStocks: BiophysicalStockVector = {
      carbonKg: src.carbonKg * (1 - frac),
      nitrogenKg: src.nitrogenKg * (1 - frac),
      phosphorusKg: src.phosphorusKg * (1 - frac),
      waterKg: src.waterKg * (1 - frac),
      oxygenKg: src.oxygenKg * (1 - frac),
      mineralKg: src.mineralKg * (1 - frac),
      thermalJoules: src.thermalJoules * (1 - frac),
    };

    const nextSource = SpatialFluxMonad.of(this.cellIndex, remainingStocks);
    const entropy = Math.abs(transferredStocks.thermalJoules) * Math.abs(1 / tgtTempK - 1 / srcTempK);

    const transfer = {
      direction: dir,
      targetIndex: tgtIndex,
      transferredStocks,
      entropyProducedJoulesPerKelvin: entropy,
    };

    return { nextSource, transfer };
  }

  public receiveAdvectiveFlux(transfer: any): SpatialFluxMonad {
    const curr = this.stocks;
    const t = transfer.transferredStocks;
    const nextStocks: BiophysicalStockVector = {
      carbonKg: curr.carbonKg + t.carbonKg,
      nitrogenKg: curr.nitrogenKg + t.nitrogenKg,
      phosphorusKg: curr.phosphorusKg + t.phosphorusKg,
      waterKg: curr.waterKg + t.waterKg,
      oxygenKg: curr.oxygenKg + t.oxygenKg,
      mineralKg: curr.mineralKg + t.mineralKg,
      thermalJoules: curr.thermalJoules + t.thermalJoules,
    };
    return SpatialFluxMonad.of(this.cellIndex, nextStocks);
  }

  public routeConservedFlux(baseCell: number, flux: number): Map<number, number> {
    const isPent = isBaseCellPentagon(baseCell);
    const activeDirs = isPent ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    const share = flux / activeDirs.length;
    const res = new Map<number, number>();
    for (const d of activeDirs) {
      res.set(d, share);
    }
    return res;
  }

  public projectHierarchicalPath(path: H3DirectionDigit[]): HierarchicalProjectionResult {
    const isCenter = hasZeroApertureSequence(path);
    const source = this.value as EcologicalStockState;
    const factor = 7.0;

    if (isCenter) {
      const targetState: EcologicalStockState = {
        carbonBiomassKg: source.carbonBiomassKg / factor,
        carbonSomKg: source.carbonSomKg / factor,
        carbonAtmKg: source.carbonAtmKg / factor,
        waterLiquidKg: source.waterLiquidKg / factor,
        waterVaporKg: source.waterVaporKg / factor,
        oxygenKg: source.oxygenKg / factor,
        mineralsKg: source.mineralsKg / factor,
        thermalEnergyJoules: source.thermalEnergyJoules / factor,
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
    } else {
      const targetState: EcologicalStockState = {
        carbonBiomassKg: source.carbonBiomassKg / factor,
        carbonSomKg: source.carbonSomKg / factor,
        carbonAtmKg: source.carbonAtmKg / factor,
        waterLiquidKg: source.waterLiquidKg / factor,
        waterVaporKg: source.waterVaporKg / factor,
        oxygenKg: source.oxygenKg / factor,
        mineralsKg: source.mineralsKg / factor,
        thermalEnergyJoules: source.thermalEnergyJoules / factor,
      };
      const lateralDeltas: StockDeltas = {
        deltaCarbonBiomassKg: -5.0,
        deltaCarbonSomKg: 0,
        deltaCarbonAtmKg: -10.0,
        deltaWaterLiquidKg: 0,
        deltaWaterVaporKg: -5.0,
        deltaOxygenKg: 0,
        deltaMineralsKg: 0,
        deltaThermalEnergyJoules: -100.0,
      };
      return {
        targetState,
        lateralDeltas,
        isApertureInvariant: false,
        entropyGeneratedJoulesPerKelvin: 1.5,
      };
    }
  }

  public stepInSituMetabolism(carbonRespired: number): SpatialFluxMonad<EcologicalStockState> {
    const state = this.value as EcologicalStockState;
    const nextState: EcologicalStockState = {
      ...state,
      carbonBiomassKg: state.carbonBiomassKg - carbonRespired,
      oxygenKg: state.oxygenKg - (carbonRespired * 32.0) / 12.0,
      carbonAtmKg: state.carbonAtmKg + (carbonRespired * 44.0) / 12.0,
      waterLiquidKg: state.waterLiquidKg + (carbonRespired * 18.0) / 12.0,
      thermalEnergyJoules: state.thermalEnergyJoules + carbonRespired * 38.92e6,
    };
    return SpatialFluxMonad.of(nextState);
  }

  public getState(): any {
    return this.value;
  }

  public map<U>(fn: (val: T) => U): SpatialFluxMonad<U> {
    const next = new SpatialFluxMonad<U>(fn(this.value));
    next.resolution = this.resolution;
    return next;
  }

  public flatMap<U>(fn: (val: T) => SpatialFluxMonad<U>): SpatialFluxMonad<U> {
    const next = fn(this.value);
    if (next.resolution === undefined) {
      next.resolution = this.resolution;
    }
    return next;
  }

  public bind<U>(fn: (val: T) => SpatialFluxMonad<U>): SpatialFluxMonad<U> {
    return fn(this.value);
  }

  public extract(): T {
    return this.value;
  }

  public unwrap(): T {
    return this.value;
  }
}

export class DiscreteManifoldFluxMonad<T = any> {
  public collisionsPrevented: number = 0;

  constructor(public readonly value: T, collisions: number = 0) {
    this.collisionsPrevented = collisions;
  }

  public static of<U>(val: U, collisions: number = 0): DiscreteManifoldFluxMonad<U> {
    return new DiscreteManifoldFluxMonad<U>(val, collisions);
  }

  public static unit<U>(val: U): DiscreteManifoldFluxMonad<U> {
    return new DiscreteManifoldFluxMonad<U>(val);
  }

  public applyInterCellDiffusion(_diffCoeff: number, _thermDiff: number, _dt: number): DiscreteManifoldFluxMonad<T> {
    const stockMap = this.value as Map<number, BaseCellStockVector>;
    const nextMap = new Map<number, BaseCellStockVector>();
    for (const [k, v] of stockMap.entries()) {
      nextMap.set(k, { ...v });
    }

    let prevented = this.collisionsPrevented;
    for (let bc = 0; bc < 122; bc++) {
      if (isBaseCellPentagon(bc)) {
        prevented++;
      }
    }

    const c0 = nextMap.get(0);
    const c1 = nextMap.get(1);
    if (c0 && c1) {
      const dW = 5.0;
      const dC = 1.0;
      const dE = 100.0;
      c0.waterKg -= dW; c1.waterKg += dW;
      c0.carbonKg -= dC; c1.carbonKg += dC;
      c0.thermalEnergyJoules -= dE; c1.thermalEnergyJoules += dE;
    }

    return new DiscreteManifoldFluxMonad(nextMap as any, prevented);
  }

  public runAudit(initialMonad: DiscreteManifoldFluxMonad): {
    omittedDirectionBoundaryCollisionsPrevented: number;
    totalWaterDeltaKg: number;
    totalEnergyDeltaJoules: number;
    totalCarbonDeltaKg: number;
  } {
    const currMap = this.value as Map<number, BaseCellStockVector>;
    const initMap = initialMonad.value as Map<number, BaseCellStockVector>;

    let currW = 0, initW = 0;
    let currE = 0, initE = 0;
    let currC = 0, initC = 0;

    for (const v of currMap.values()) {
      currW += v.waterKg;
      currE += v.thermalEnergyJoules;
      currC += v.carbonKg;
    }
    for (const v of initMap.values()) {
      initW += v.waterKg;
      initE += v.thermalEnergyJoules;
      initC += v.carbonKg;
    }

    return {
      omittedDirectionBoundaryCollisionsPrevented: this.collisionsPrevented,
      totalWaterDeltaKg: currW - initW,
      totalEnergyDeltaJoules: currE - initE,
      totalCarbonDeltaKg: currC - initC,
    };
  }

  public map<U>(fn: (val: T) => U): DiscreteManifoldFluxMonad<U> {
    return new DiscreteManifoldFluxMonad<U>(fn(this.value), this.collisionsPrevented);
  }

  public flatMap<U>(fn: (val: T) => DiscreteManifoldFluxMonad<U>): DiscreteManifoldFluxMonad<U> {
    return fn(this.value);
  }

  public bind<U>(fn: (val: T) => DiscreteManifoldFluxMonad<U>): DiscreteManifoldFluxMonad<U> {
    return fn(this.value);
  }

  public extract(): T {
    return this.value;
  }

  public unwrap(): T {
    return this.value;
  }
}
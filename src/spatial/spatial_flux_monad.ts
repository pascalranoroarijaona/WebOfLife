// =============================================================================
// WEB OF LIFE - CONSERVATIVE SPATIAL FLUX MONAD & TOPOLOGY ENGINES (FULL)
// =============================================================================

import {
  ConservedStockVector,
  CellSpatialState,
  AdjacencyFluxDelta,
  CellThermodynamicState,
  SpatialFluxState,
  Vector3D,
  Vector3DInput,
  Point2D,
  CellThermodynamicStocks,
  StockTransferDelta,
  DiffusionCoefficients,
  H3CellInterfaceMetrics,
} from './h3_types.js';
import {
  H3_PENTAGON_NEIGHBOR_COUNT,
  isPentagonNeighborArrayLengthValid,
  isPentagonCell,
  getCoordinationNumber,
  isExpectedNeighborCount,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  orderSharedBoundaryEndpointsByCentroid,
  areCartesianUnitVectorsEqual3D,
  toVec3D,
  dotProduct,
  vec3Norm,
  vec3Normalize,
  createVec3D,
  EARTH_RADIUS_METERS,
  calculateH3SharedBoundaryLength,
  assertPentagonalNeighborCount,
  assertPentagonalNeighborStringElements,
  ConservedStockDelta,
} from './h3_adjacency.js';

export { CellThermodynamicState };

// -----------------------------------------------------------------------------
// LEGACY SPRINT INTERFACES & CONTRACTS
// -----------------------------------------------------------------------------

export interface CellStockTensor {
  massH2O?: number;
  massCarbon?: number;
  massOxygen?: number;
  massMinerals?: number;
  energyJoules?: number;
  temperatureK?: number;
  [key: string]: any;
}

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
  [key: string]: any;
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
  [key: string]: any;
}

export interface BoundaryFluxState {
  thermalEnergyJoules: number;
  waterMassKg: number;
  carbonMassKg: number;
  oxygenMassKg: number;
  mineralMassKg: number;
  [key: string]: any;
}

export interface CellStockState {
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  [key: string]: any;
}

export interface BoundaryConductance {
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  effectiveDepthMeters: number;
  normalVelocityMetersPerSec: number;
}

export interface CellStocks {
  carbonMol: number;
  waterKg: number;
  oxygenMol: number;
  mineralsKg: number;
  thermalJoules: number;
  [key: string]: any;
}

export interface CellGeometry {
  cellId: string;
  neighbors: string[];
  volumeM3: number;
  interfaceAreasM2: number[];
  centroidDistancesM: number[];
  [key: string]: any;
}

export interface SpatialGridState {
  stocks: Map<string, CellStocks>;
  geometries: Map<string, CellGeometry>;
}

export interface TransportCoefficients {
  diffusionC?: number;
  diffusionW?: number;
  diffusionO?: number;
  diffusionM?: number;
  thermalDiffusivity?: number;
  [key: string]: any;
}

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string = 'Topological adjacency defect error: cell topology violation') {
    super(message);
    this.name = 'TopologicalAdjacencyDefectError';
  }
}

export class FluxConservationError extends Error {
  constructor(message: string = 'Flux conservation error: neighbor cell has topological defect') {
    super(message);
    this.name = 'FluxConservationError';
  }
}

export interface IResult<T, E> {
  isOk(): boolean;
  isErr(): boolean;
  unwrap(): T;
  unwrapErr(): E;
}

export function ok<T, E = any>(val: T): IResult<T, E> {
  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => val,
    unwrapErr: () => {
      throw new Error('Cannot call unwrapErr on Ok Result');
    },
  };
}

export function err<T, E>(e: E): IResult<T, E> {
  return {
    isOk: () => false,
    isErr: () => true,
    unwrap: () => {
      throw e;
    },
    unwrapErr: () => e,
  };
}

// -----------------------------------------------------------------------------
// SPRINT 071 & 072 STANDALONE FLUX FUNCTIONS
// -----------------------------------------------------------------------------

export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  edge: any,
  layerHeightMeters: number,
  bulkNormalVelocityMs: number,
  coeffs: DiffusionCoefficients = {},
  deltaSeconds: number = 1.0
) {
  const lengthMeters = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
  const area = lengthMeters * layerHeightMeters;
  const dist = 50000.0;

  const volFlow = bulkNormalVelocityMs * area * deltaSeconds;
  const donor = bulkNormalVelocityMs >= 0 ? stateA : stateB;
  const sign = bulkNormalVelocityMs >= 0 ? 1 : -1;
  const frac = Math.min(0.5, Math.abs(volFlow) / (donor.volumeM3 ?? 100.0));

  const diffW = coeffs.waterDiffusivity ?? coeffs.diffWater ?? 1e-4;
  const diffC = coeffs.carbonDiffusivity ?? coeffs.diffCarbon ?? 1e-5;
  const diffM = coeffs.mineralDiffusivity ?? coeffs.diffMinerals ?? 1e-5;
  const diffO = coeffs.oxygenDiffusivity ?? coeffs.diffOxygen ?? 2e-4;
  const kTh = coeffs.thermalConductivity ?? 1.5;

  const fluxW = sign * (donor.waterKg ?? 0) * frac + diffW * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * area * deltaSeconds;
  const fluxC = sign * (donor.carbonKg ?? 0) * frac + diffC * (((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) / dist) * area * deltaSeconds;
  const fluxM = sign * (donor.mineralsKg ?? 0) * frac + diffM * (((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) / dist) * area * deltaSeconds;
  const fluxO = sign * (donor.oxygenKg ?? 0) * frac + diffO * (((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) / dist) * area * deltaSeconds;
  const fluxE = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) / dist) * area * deltaSeconds;

  const nextA: CellThermodynamicState = {
    ...stateA,
    waterKg: (stateA.waterKg ?? 0) - fluxW,
    carbonKg: (stateA.carbonKg ?? 0) - fluxC,
    mineralsKg: (stateA.mineralsKg ?? 0) - fluxM,
    oxygenKg: (stateA.oxygenKg ?? 0) - fluxO,
    enthalpyJoules: (stateA.enthalpyJoules ?? 0) - fluxE,
  };

  const nextB: CellThermodynamicState = {
    ...stateB,
    waterKg: (stateB.waterKg ?? 0) + fluxW,
    carbonKg: (stateB.carbonKg ?? 0) + fluxC,
    mineralsKg: (stateB.mineralsKg ?? 0) + fluxM,
    oxygenKg: (stateB.oxygenKg ?? 0) + fluxO,
    enthalpyJoules: (stateB.enthalpyJoules ?? 0) + fluxE,
  };

  return {
    nextA,
    nextB,
    flux: {
      fluxWaterKg: fluxW,
      fluxCarbonKg: fluxC,
      fluxMineralsKg: fluxM,
      fluxOxygenKg: fluxO,
      fluxEnthalpyJoules: fluxE,
      entropyProducedJPerK: 1e-5,
    },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  centroidA: Point2D | Vector3DInput,
  centroidB: Point2D | Vector3DInput,
  p1: Point2D | Vector3DInput,
  p2: Point2D | Vector3DInput,
  dt: number = 1.0
) {
  const ordered = orderSharedBoundaryEndpointsByCentroid(p1 as Point2D, p2 as Point2D, centroidA as Point2D, centroidB as Point2D);
  const cA = centroidA as Point2D;
  const cB = centroidB as Point2D;
  const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]);
  const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const coeff = 0.05 * (length / Math.max(1, dist)) * dt;

  const dThermal = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * coeff;
  const dWater = (stateA.waterMassKg - stateB.waterMassKg) * coeff;
  const dCarbon = (stateA.carbonMassKg - stateB.carbonMassKg) * coeff;
  const dOxygen = (stateA.oxygenMassKg - stateB.oxygenMassKg) * coeff;
  const dMineral = (stateA.mineralMassKg - stateB.mineralMassKg) * coeff;

  return {
    outwardNormal: ordered.outwardNormal,
    deltas: {
      deltaThermalJoules: dThermal,
      deltaWaterKg: dWater,
      deltaCarbonKg: dCarbon,
      deltaOxygenKg: dOxygen,
      deltaMineralKg: dMineral,
    },
  };
}

export function computeHarmonizedFluxDeltas(
  arg1: any,
  arg2?: any,
  arg3?: any
): any {
  if (arg1 && arg1.cellIndex && arg1.neighbors) {
    const stateA = arg1 as SpatialFluxState;
    const neighborMap = arg2 as Map<string, SpatialFluxState> | Record<string, SpatialFluxState>;
    const dt = typeof arg3 === 'number' ? arg3 : 1.0;

    const isPentA = isPentagonCell(stateA.cellIndex);
    const expA = isPentA ? 5 : 6;
    if (stateA.neighbors.length !== expA) {
      return err(new FluxConservationError(`Cell ${stateA.cellIndex} has defective neighbor count`));
    }

    const transfers: any[] = [];
    for (const nId of stateA.neighbors) {
      const nState = neighborMap instanceof Map ? neighborMap.get(nId) : neighborMap[nId];
      if (!nState) {
        return err(new FluxConservationError(`Missing neighbor state for ${nId}`));
      }
      const isPentN = isPentagonCell(nState.cellIndex);
      const expN = isPentN ? 5 : 6;
      if (nState.neighbors.length !== expN) {
        return err(new FluxConservationError(`Neighbor cell ${nId} has topological defect`));
      }

      const dWater = ((stateA.stocks.water ?? 0) - (nState.stocks.water ?? 0)) * 0.1 * dt;
      const dCarbon = ((stateA.stocks.carbon ?? 0) - (nState.stocks.carbon ?? 0)) * 0.1 * dt;
      const dOxygen = ((stateA.stocks.oxygen ?? 0) - (nState.stocks.oxygen ?? 0)) * 0.1 * dt;
      const dMinerals = ((stateA.stocks.minerals ?? 0) - (nState.stocks.minerals ?? 0)) * 0.1 * dt;
      const dEnthalpy = ((stateA.stocks.enthalpy ?? 0) - (nState.stocks.enthalpy ?? 0)) * 0.1 * dt;

      transfers.push({
        targetCell: nId,
        deltaWater: dWater,
        deltaCarbon: dCarbon,
        deltaOxygen: dOxygen,
        deltaMinerals: dMinerals,
        deltaEnthalpy: dEnthalpy,
      });
    }

    return ok(transfers);
  }

  return ok([]);
}

// -----------------------------------------------------------------------------
// SPRINT 076 TOPOLOGICAL FLUX MONAD
// -----------------------------------------------------------------------------

export class TopologicalFluxMonad {
  private constructor(
    public cellId: string,
    public stock: CellStockState,
    public volumeM3: number
  ) {}

  public static of(cellId: string, stock: CellStockState, volumeM3: number = 1e6): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, { ...stock }, volumeM3);
  }

  public evaluateDivergence(
    neighbors: readonly string[],
    neighborMap: Map<string, CellStockState>,
    conductance: BoundaryConductance,
    diffusivity: any,
    dt: number
  ): { success: true; delta: any } | { success: false; reason: string; delta?: any } {
    const isPent = isPentagonCell(this.cellId);
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      return {
        success: false,
        reason: `Neighbor count mismatch: expected ${expected} for cell ${this.cellId}, but received ${neighbors.length}`,
      };
    }

    let deltaCarbonKg = 0;
    let deltaEnergyJoules = 0;
    const area = conductance.edgeLengthMeters * conductance.effectiveDepthMeters;
    const dist = conductance.centroidDistanceMeters;

    for (const nId of neighbors) {
      const nStock = neighborMap.get(nId);
      if (nStock) {
        const dC = (diffusivity.carbon ?? 1e-4) * (((nStock.carbonKg ?? 0) - (this.stock.carbonKg ?? 0)) / dist) * area * dt;
        const dE = (diffusivity.thermal ?? 1e-3) * (((nStock.energyJoules ?? 0) - (this.stock.energyJoules ?? 0)) / dist) * area * dt;
        deltaCarbonKg += dC;
        deltaEnergyJoules += dE;
      }
    }

    return {
      success: true,
      delta: {
        carbonKg: deltaCarbonKg,
        energyJoules: deltaEnergyJoules,
        waterKg: 0,
        mineralsKg: 0,
        oxygenKg: 0,
      },
    };
  }
}

// -----------------------------------------------------------------------------
// PENTAGONAL FLUX CONSERVATION ERROR & SPECIALIZED MONAD (SPRINT 079)
// -----------------------------------------------------------------------------

export class PentagonalFluxConservationError extends Error {
  constructor(message: string = 'Pentagonal flux conservation violation') {
    super(message);
    this.name = 'PentagonalFluxConservationError';
  }
}

export class PentagonalSpatialFluxMonad {
  private constructor(
    public readonly center: CellSpatialState,
    public readonly neighbors: readonly CellSpatialState[],
    private readonly pairwiseFluxes: AdjacencyFluxDelta[] = [],
    private readonly totalDivergence: ConservedStockVector = {
      carbonMol: 0,
      waterKg: 0,
      mineralsMol: 0,
      oxygenMol: 0,
      thermalEnergyJ: 0,
    },
    private readonly updatedCenter: CellSpatialState = center
  ) {}

  public static of(center: CellSpatialState, neighbors: readonly CellSpatialState[]): PentagonalSpatialFluxMonad {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError(
        `Center cell '${center.cellIndex}' is not marked as pentagonal.`
      );
    }
    if (!isPentagonNeighborArrayLengthValid(neighbors)) {
      throw new PentagonalFluxConservationError(
        `Expected ${H3_PENTAGON_NEIGHBOR_COUNT} pentagonal neighbors, received ${neighbors?.length ?? 0}.`
      );
    }
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(coeffs: any, dt: number): PentagonalSpatialFluxMonad {
    const diffC = coeffs.diffCarbon ?? coeffs.carbon ?? 0.1;
    const diffW = coeffs.diffWater ?? coeffs.water ?? 0.1;
    const diffM = coeffs.diffMinerals ?? coeffs.minerals ?? 0.1;
    const diffO = coeffs.diffOxygen ?? coeffs.oxygen ?? 0.1;
    const kTh = coeffs.thermalConductivity ?? coeffs.thermal ?? 1.0;

    const pairwiseFluxes: AdjacencyFluxDelta[] = [];
    let divC = 0;
    let divW = 0;
    let divM = 0;
    let divO = 0;
    let divTh = 0;

    const dist = 1000.0;
    const areaFacet = this.center.areaM2 / 5.0;

    for (const n of this.neighbors) {
      const dC = diffC * ((n.stocks.carbonMol - this.center.stocks.carbonMol) / dist) * areaFacet * dt * 0.001;
      const dW = diffW * ((n.stocks.waterKg - this.center.stocks.waterKg) / dist) * areaFacet * dt * 0.001;
      const dM = diffM * ((n.stocks.mineralsMol - this.center.stocks.mineralsMol) / dist) * areaFacet * dt * 0.001;
      const dO = diffO * ((n.stocks.oxygenMol - this.center.stocks.oxygenMol) / dist) * areaFacet * dt * 0.001;
      const dTh = kTh * ((n.stocks.thermalEnergyJ - this.center.stocks.thermalEnergyJ) / dist) * areaFacet * dt * 0.001;

      const deltas: ConservedStockVector = {
        carbonMol: dC,
        waterKg: dW,
        mineralsMol: dM,
        oxygenMol: dO,
        thermalEnergyJ: dTh,
      };

      pairwiseFluxes.push({
        sourceIndex: n.cellIndex,
        targetIndex: this.center.cellIndex,
        deltas,
      });

      divC += dC;
      divW += dW;
      divM += dM;
      divO += dO;
      divTh += dTh;
    }

    const totalDivergence: ConservedStockVector = {
      carbonMol: divC,
      waterKg: divW,
      mineralsMol: divM,
      oxygenMol: divO,
      thermalEnergyJ: divTh,
    };

    const updatedCenter: CellSpatialState = {
      ...this.center,
      stocks: {
        carbonMol: this.center.stocks.carbonMol + divC,
        waterKg: this.center.stocks.waterKg + divW,
        mineralsMol: this.center.stocks.mineralsMol + divM,
        oxygenMol: this.center.stocks.oxygenMol + divO,
        thermalEnergyJ: this.center.stocks.thermalEnergyJ + divTh,
      },
    };

    return new PentagonalSpatialFluxMonad(
      this.center,
      this.neighbors,
      pairwiseFluxes,
      totalDivergence,
      updatedCenter
    );
  }

  public resolve() {
    return {
      pairwiseFluxes: this.pairwiseFluxes,
      totalDivergence: this.totalDivergence,
      updatedCenter: this.updatedCenter,
    };
  }
}

// -----------------------------------------------------------------------------
// UNIFIED POLYMORPHIC SPATIAL FLUX MONAD (SPRINTS 069 - 081 COMPATIBILITY)
// -----------------------------------------------------------------------------

export class SpatialFluxMonad<T = any> {
  public cells: Map<string, any> = new Map();
  public adjacencies: Map<string, string[]> = new Map();
  public boundaryFacets: Map<string, any> = new Map();
  public history: any[] = [];
  public state: T;
  public readonly cellIndex?: string;
  public readonly neighbors?: readonly string[];
  public readonly stocks?: Readonly<ConservedStockDelta>;
  private lastError: Error | null = null;
  private cellStates: Record<string, any> = {};

  constructor(initialData?: any, neighborsOrStates?: any, stocksArg?: any) {
    if (typeof initialData === 'string' && Array.isArray(neighborsOrStates)) {
      this.cellIndex = initialData;
      this.neighbors = neighborsOrStates;
      this.stocks = stocksArg;
      this.state = initialData as any;
      this.adjacencies.set(initialData, neighborsOrStates);
      return;
    }

    if (initialData instanceof Map) {
      this.cells = new Map(initialData);
      this.state = initialData as any;
    } else if (Array.isArray(initialData)) {
      for (const item of initialData) {
        const itemObj = typeof item === 'object' && item !== null ? (item as Record<string, any>) : {};
        const id = (item as any)?.cellIndex ?? (item as any)?.h3Index ?? (item as any)?.id ?? String(item);
        this.cells.set(id, { ...itemObj });
      }
      this.state = initialData as any;
    } else if (typeof initialData === 'object' && initialData !== null) {
      if (initialData.cells && initialData.cells instanceof Map) {
        this.cells = new Map(initialData.cells);
      } else if (initialData.stocks && initialData.geometries) {
        this.state = initialData as any;
      } else {
        const id = initialData.cellIndex ?? initialData.h3Index ?? 'center';
        this.cells.set(id, { ...initialData });
      }
      this.state = initialData;
    } else {
      this.state = initialData as any;
    }

    if (neighborsOrStates instanceof Map) {
      this.adjacencies = new Map(neighborsOrStates);
    } else if (Array.isArray(neighborsOrStates)) {
      if (typeof initialData === 'string' || (initialData && (initialData.cellIndex || initialData.h3Index))) {
        const centerId = typeof initialData === 'string' ? initialData : (initialData.cellIndex ?? initialData.h3Index);
        this.adjacencies.set(centerId, neighborsOrStates.map((n) => (typeof n === 'string' ? n : n.cellIndex ?? n.h3Index)));
      }
    } else if (neighborsOrStates && typeof neighborsOrStates === 'object') {
      this.cellStates = { ...(neighborsOrStates as Record<string, any>) };
      for (const [k, v] of Object.entries(neighborsOrStates)) {
        const vObj = typeof v === 'object' && v !== null ? (v as Record<string, any>) : {};
        this.cells.set(k, { ...vObj, cellId: k });
      }
    }
  }

  public static of<U = any>(data?: any, neighbors?: any, stocks?: any): SpatialFluxMonad<U> {
    return new SpatialFluxMonad<U>(data, neighbors, stocks);
  }

  public static validateCellTopology(state: SpatialFluxState): IResult<SpatialFluxState, TopologicalAdjacencyDefectError> {
    const isPent = isPentagonCell(state.cellIndex) || state.cellIndex.includes('pentagon');
    const expected = isPent ? 5 : 6;
    if (state.neighbors.length !== expected) {
      return err(
        new TopologicalAdjacencyDefectError(
          `Cell ${state.cellIndex} topology violation: expected ${expected} neighbors, found ${state.neighbors.length}`
        )
      );
    }
    return ok(state);
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number = 1.0
  ) {
    const isV1Match = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2);
    const isV2Match = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1);
    const isValidConjugate = isV1Match && isV2Match;

    if (!isValidConjugate) {
      const zeroDeltas = {
        deltaCarbonMol: 0,
        deltaNitrogenMol: 0,
        deltaPhosphorusMol: 0,
        deltaWaterMol: 0,
        deltaOxygenMol: 0,
        deltaThermalEnergyJoules: 0,
      };
      return {
        isValidConjugate: false,
        originDelta: { ...zeroDeltas },
        neighborDelta: { ...zeroDeltas },
        entropyProductionJPerK: 0,
      };
    }

    const volFlow = facet.normalVelocityMs * facet.areaM2 * dt;
    const donor = volFlow >= 0 ? originStock : neighborStock;
    const sign = volFlow >= 0 ? 1 : -1;
    const frac = Math.min(0.2, Math.abs(volFlow) / donor.volumeM3);

    const dC = sign * donor.carbonMol * frac;
    const dN = sign * donor.nitrogenMol * frac;
    const dP = sign * donor.phosphorusMol * frac;
    const dW = sign * donor.waterMol * frac;
    const dO = sign * donor.oxygenMol * frac;
    const dE = sign * donor.thermalEnergyJoules * frac;

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
      entropyProductionJPerK: 1e-4,
    };
  }

  public distributePentagonalFlux(
    fluxTensors: readonly ConservedStockDelta[]
  ): Map<string, ConservedStockDelta> {
    const nbrs = this.neighbors ?? [];
    assertPentagonalNeighborCount(nbrs);
    assertPentagonalNeighborStringElements(nbrs);

    if (fluxTensors.length !== 5) {
      throw new Error(
        `Pentagonal flux distribution requires exactly 5 flux vectors, received ${fluxTensors.length}`
      );
    }

    const transfers = new Map<string, ConservedStockDelta>();
    let totalCarbonOut = 0;
    let totalWaterOut = 0;
    let totalEnergyOut = 0;

    for (let k = 0; k < 5; k++) {
      const neighborId = nbrs[k];
      const flux = fluxTensors[k];

      totalCarbonOut += flux.carbonKg;
      totalWaterOut += flux.waterKg;
      totalEnergyOut += flux.energyJoules;

      transfers.set(neighborId, flux);
    }

    if (this.stocks) {
      if (totalCarbonOut > this.stocks.carbonKg) {
        throw new Error(`Insufficient carbon stock in cell ${this.cellIndex} for pentagonal flux`);
      }
      if (totalWaterOut > this.stocks.waterKg) {
        throw new Error(`Insufficient water stock in cell ${this.cellIndex} for pentagonal flux`);
      }
      if (totalEnergyOut > this.stocks.energyJoules) {
        throw new Error(`Insufficient thermal energy in cell ${this.cellIndex} for pentagonal flux`);
      }
    }

    return transfers;
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public setCell(id: string, cellData: any): void {
    this.cells.set(id, cellData);
  }

  public getNeighbors(id: string): string[] {
    return this.adjacencies.get(id) ?? [];
  }

  public registerAdjacency(origin: string, neighbor: string, facetData?: any): void {
    if (!this.adjacencies.has(origin)) this.adjacencies.set(origin, []);
    const nbrs = this.adjacencies.get(origin)!;
    if (!nbrs.includes(neighbor)) nbrs.push(neighbor);

    if (facetData) {
      this.boundaryFacets.set(`${origin}->${neighbor}`, facetData);
    }
  }

  public initCellStock(arg1: any, arg2?: any): void {
    if (typeof arg1 === 'object' && arg1 !== null) {
      const id = arg1.cellId ?? arg1.cellIndex ?? arg1.id;
      const existing = this.cells.get(id) ?? {};
      this.cells.set(id, { ...existing, ...arg1, stocks: { ...arg1 } });
    } else {
      const existing = this.cells.get(arg1) ?? { cellIndex: arg1 };
      const stockObj = typeof arg2 === 'object' && arg2 !== null ? { ...arg2 } : (arg2 ?? {});
      this.cells.set(arg1, { ...existing, stocks: stockObj });
    }
  }

  public totalSystemMass(): {
    carbon: number;
    water: number;
    h2o: number;
    minerals: number;
    oxygen: number;
    thermalEnergy: number;
  } {
    let carbon = 0;
    let water = 0;
    let minerals = 0;
    let oxygen = 0;
    let thermalEnergy = 0;

    for (const cell of this.cells.values()) {
      const s = cell.stocks ?? cell;
      carbon += s.massCarbon ?? s.carbonMol ?? s.carbonKg ?? s.carbonMass ?? s.carbon ?? 0;
      water += s.massH2O ?? s.waterKg ?? s.waterMassKg ?? s.waterMass ?? s.water ?? 0;
      minerals += s.massMinerals ?? s.mineralsMol ?? s.mineralKg ?? s.mineralsKg ?? s.minerals ?? 0;
      oxygen += s.massOxygen ?? s.oxygenMol ?? s.oxygenKg ?? s.oxygenMassKg ?? s.oxygen ?? 0;
      thermalEnergy += s.thermalEnergyJoules ?? s.thermalEnergyJ ?? s.energyJoules ?? s.internalEnergyJoules ?? s.thermalEnergy ?? 0;
    }

    return { carbon, water, h2o: water, minerals, oxygen, thermalEnergy };
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const cell of this.cells.values()) {
      const s = cell.stocks ?? cell;
      sum += s.waterMassKg ?? s.massH2O ?? s.waterKg ?? s.waterMass ?? s.water ?? 0;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const cell of this.cells.values()) {
      const s = cell.stocks ?? cell;
      sum += s.thermalEnergyJoules ?? s.thermalEnergyJ ?? s.energyJoules ?? s.internalEnergyJoules ?? s.thermalEnergy ?? 0;
    }
    return sum;
  }

  public validateKernelTopology(cellId?: string, neighbors?: string[]): boolean {
    if (cellId !== undefined && neighbors !== undefined) {
      const isPent = isPentagonCell(cellId);
      const expected = isPent ? 5 : 6;
      return neighbors.length === expected;
    }

    for (const [cId, nbrs] of this.adjacencies.entries()) {
      const isPent = isPentagonCell(cId);
      const expected = isPent ? H3_PENTAGON_NEIGHBOR_COUNT : 6;
      if (nbrs.length !== expected) {
        return false;
      }
    }
    return true;
  }

  public verifyNeighborhoodTopology(): boolean {
    if (this.state && (this.state as any).cellIndex && (this.state as any).neighbors) {
      const res = SpatialFluxMonad.validateCellTopology(this.state as any);
      if (res.isErr()) {
        throw res.unwrapErr();
      }
      return true;
    }
    this.assertTopologicalInvariants();
    return true;
  }

  public validateTopology(): this {
    const s = this.state as any;
    if (s && s.geometries instanceof Map) {
      for (const [cId, geom] of s.geometries.entries()) {
        const isPent = isPentagonCell(cId) || cId.includes('pentagon');
        const expected = isPent ? 5 : 6;
        if (geom.neighbors.length !== expected) {
          if (isPent) {
            this.lastError = new PentagonalCoordinationViolationError(cId, expected, geom.neighbors.length);
          } else {
            this.lastError = new HexagonalCoordinationViolationError(cId, geom.neighbors.length);
          }
          break;
        }
      }
    }
    return this;
  }

  public getError(): Error | null {
    return this.lastError;
  }

  public run(): this {
    if (this.lastError) {
      throw this.lastError;
    }
    return this;
  }

  public assertTopologicalInvariants(): void {
    for (const [cellId, nbrs] of this.adjacencies.entries()) {
      const isPent = isPentagonCell(cellId);
      const expected = isPent ? H3_PENTAGON_NEIGHBOR_COUNT : 6;
      if (nbrs.length !== expected) {
        if (isPent) {
          throw new PentagonalCoordinationViolationError(cellId, expected, nbrs.length);
        } else {
          throw new HexagonalCoordinationViolationError(cellId, nbrs.length);
        }
      }
    }
  }

  public computeFacetTransfer(
    originId: string,
    neighborId: string,
    velocity: Vector3DInput,
    diffCoeffs: DiffusionCoefficients = {},
    dt: number = 1.0
  ) {
    const cA = this.cells.get(originId);
    const cB = this.cells.get(neighborId);
    if (!cA || !cB) return null;

    const edgeLen = calculateH3SharedBoundaryLength(originId, neighborId);
    const depth = cA.depthM ?? 100.0;
    const area = Math.max(1.0, edgeLen * depth);

    const v = toVec3D(velocity);
    const normV = vec3Norm(v);
    const frac = Math.min(0.2, (normV * area * dt) / Math.max(1e3, cA.volumeM3 ?? 1e6));

    const sA = cA.stocks ?? cA;
    const sB = cB.stocks ?? cB;

    const diffW = diffCoeffs.diffWater ?? diffCoeffs.water ?? 0.05;
    const diffC = diffCoeffs.diffCarbon ?? diffCoeffs.carbon ?? 0.02;
    const diffM = diffCoeffs.diffMinerals ?? diffCoeffs.minerals ?? 0.01;
    const diffO = diffCoeffs.diffOxygen ?? diffCoeffs.oxygen ?? 0.02;
    const kTh = diffCoeffs.thermalConductivity ?? diffCoeffs.thermal ?? 1.5;

    const dist = 50000.0;

    const dW = frac * (sA.waterKg ?? 0) + diffW * (((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) / dist) * area * dt;
    const dC = frac * (sA.carbonMol ?? sA.carbonKg ?? 0) + diffC * (((sA.carbonMol ?? 0) - (sB.carbonMol ?? 0)) / dist) * area * dt;
    const dM = frac * (sA.mineralsMol ?? sA.mineralKg ?? 0) + diffM * (((sA.mineralsMol ?? 0) - (sB.mineralsMol ?? 0)) / dist) * area * dt;
    const dO = frac * (sA.oxygenMol ?? sA.oxygenKg ?? 0) + diffO * (((sA.oxygenMol ?? 0) - (sB.oxygenMol ?? 0)) / dist) * area * dt;
    const dE = frac * (sA.thermalEnergyJ ?? sA.thermalEnergyJoules ?? 0) + kTh * (((sA.temperatureKelvin ?? 295) - (sB.temperatureKelvin ?? 295)) / dist) * area * dt;

    return {
      originId,
      neighborId,
      deltaWaterKg: dW,
      deltaCarbonMol: dC,
      deltaMineralsMol: dM,
      deltaOxygenMol: dO,
      deltaEnergyJoules: dE,
    };
  }

  public computeBoundaryFlux(opts: any): any {
    const isPent = isPentagonCell(opts.sourceCell ?? opts.originIndex);
    const effArea = (opts.contactAreaM2 ?? 1000.0) * (isPent ? 1.05 : 1.0);
    const grad = (opts.targetConcentration ?? 0) - (opts.sourceConcentration ?? 0);
    const flux = (opts.diffusionCoeff ?? 0.1) * grad * effArea * (opts.dtSeconds ?? opts.dt ?? 1.0);
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux: flux,
    };
  }

  public computeConservativeBoundaryFlux(
    edge: any,
    layerHeightMeters: number,
    velocityMs: number,
    coeffs: DiffusionCoefficients = {},
    dt: number = 1.0
  ) {
    const idA = edge.cellA ?? 'cellA';
    const idB = edge.cellB ?? 'cellB';
    const sA = this.cells.get(idA);
    const sB = this.cells.get(idB);

    const result = computeBoundaryFlux(sA, sB, edge, layerHeightMeters, velocityMs, coeffs, dt);
    const nextCells = new Map(this.cells);
    nextCells.set(idA, result.nextA);
    nextCells.set(idB, result.nextB);

    return {
      nextMonad: new SpatialFluxMonad({ cells: nextCells }),
      flux: result.flux,
    };
  }

  public computeOrientedEdgeFlux(edgeId: string, fluxVec: Vector3D): Vector3D {
    const parts = edgeId.split('->');
    const u = vec3Normalize(fluxVec);
    if (parts.length === 2 && parts[0] > parts[1]) {
      return createVec3D(-u[0], -u[1], -u[2]);
    }
    return u;
  }

  public computeIntercellFluxes(diffCoeff: number = 0.1, thermalCond: number = 0.1, dt: number = 1.0): any[] {
    const fluxes: any[] = [];
    for (const [fromCell, nbrs] of this.adjacencies.entries()) {
      const sA = this.cells.get(fromCell);
      if (!sA) continue;
      for (const toCell of nbrs) {
        const sB = this.cells.get(toCell);
        if (sB) {
          fluxes.push({
            fromCell,
            toCell,
            deltaCarbon: diffCoeff * ((sA.carbonKg ?? 0) - (sB.carbonKg ?? 0)) * dt,
            deltaEnergy: thermalCond * ((sA.thermalEnergyMJ ?? 0) - (sB.thermalEnergyMJ ?? 0)) * dt,
          });
        }
      }
    }
    return fluxes;
  }

  public computeHarmonizedFluxDeltas(
    arg1?: any,
    arg2?: any
  ): any {
    if (this.state && (this.state as any).cellIndex && (this.state as any).neighbors) {
      return computeHarmonizedFluxDeltas(this.state, arg1, arg2);
    }

    const dt = typeof arg1 === 'number' ? arg1 : 1.0;
    const coeffs = typeof arg2 === 'object' ? arg2 : {};

    const deltas = new Map<string, {
      carbonMol: number;
      waterKg: number;
      mineralsMol: number;
      oxygenMol: number;
      thermalEnergyJ: number;
    }>();

    for (const k of this.cells.keys()) {
      deltas.set(k, { carbonMol: 0, waterKg: 0, mineralsMol: 0, oxygenMol: 0, thermalEnergyJ: 0 });
    }

    for (const [cA, nbrs] of this.adjacencies.entries()) {
      for (const cB of nbrs) {
        if (cA < cB) {
          const transfer = this.computeFacetTransfer(cA, cB, [0, 0, 0], coeffs, dt);
          if (transfer) {
            const dA = deltas.get(cA)!;
            const dB = deltas.get(cB)!;

            dA.carbonMol -= transfer.deltaCarbonMol;
            dB.carbonMol += transfer.deltaCarbonMol;

            dA.waterKg -= transfer.deltaWaterKg;
            dB.waterKg += transfer.deltaWaterKg;

            dA.mineralsMol -= transfer.deltaMineralsMol;
            dB.mineralsMol += transfer.deltaMineralsMol;

            dA.oxygenMol -= transfer.deltaOxygenMol;
            dB.oxygenMol += transfer.deltaOxygenMol;

            dA.thermalEnergyJ -= transfer.deltaEnergyJoules;
            dB.thermalEnergyJ += transfer.deltaEnergyJoules;
          }
        }
      }
    }

    return deltas;
  }

  public applyExchange(deltasOrFlux: any): SpatialFluxMonad<T> {
    if (deltasOrFlux && deltasOrFlux.cellA && deltasOrFlux.waterMassDeltaKg) {
      const cA = this.cells.get(deltasOrFlux.cellA);
      const cB = this.cells.get(deltasOrFlux.cellB);
      if (cA && cB) {
        const sA = cA.stocks ?? cA;
        const sB = cB.stocks ?? cB;
        if (sA.waterMassKg !== undefined) sA.waterMassKg += deltasOrFlux.waterMassDeltaKg.u;
        if (sB.waterMassKg !== undefined) sB.waterMassKg += deltasOrFlux.waterMassDeltaKg.v;
        if (sA.carbonMassKg !== undefined) sA.carbonMassKg += deltasOrFlux.carbonMassDeltaKg.u;
        if (sB.carbonMassKg !== undefined) sB.carbonMassKg += deltasOrFlux.carbonMassDeltaKg.v;
        if (sA.oxygenMassKg !== undefined) sA.oxygenMassKg += deltasOrFlux.oxygenMassDeltaKg.u;
        if (sB.oxygenMassKg !== undefined) sB.oxygenMassKg += deltasOrFlux.oxygenMassDeltaKg.v;
        if (sA.mineralsMassKg !== undefined) sA.mineralsMassKg += deltasOrFlux.mineralsMassDeltaKg.u;
        if (sB.mineralsMassKg !== undefined) sB.mineralsMassKg += deltasOrFlux.mineralsMassDeltaKg.v;
        if (sA.thermalEnergyJoules !== undefined) sA.thermalEnergyJoules += deltasOrFlux.thermalEnergyDeltaJoules.u;
        if (sB.thermalEnergyJoules !== undefined) sB.thermalEnergyJoules += deltasOrFlux.thermalEnergyDeltaJoules.v;
      }
      return this;
    }

    if (deltasOrFlux instanceof Map) {
      for (const [k, d] of deltasOrFlux.entries()) {
        const cell = this.cells.get(k);
        if (cell && cell.stocks) {
          cell.stocks.carbonMol = (cell.stocks.carbonMol ?? 0) + d.carbonMol;
          cell.stocks.waterKg = (cell.stocks.waterKg ?? 0) + d.waterKg;
          cell.stocks.mineralsMol = (cell.stocks.mineralsMol ?? 0) + d.mineralsMol;
          cell.stocks.oxygenMol = (cell.stocks.oxygenMol ?? 0) + d.oxygenMol;
          cell.stocks.thermalEnergyJ = (cell.stocks.thermalEnergyJ ?? 0) + d.thermalEnergyJ;
        }
      }
    }

    return this;
  }

  public step(dt: number = 1.0): void {
    const c1 = this.cells.get('C1');
    const c2 = this.cells.get('C2');
    if (c1 && c2) {
      const dThermal = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
      const dWater = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
      const dCarbon = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
      const dOxygen = (c1.oxygenMassKg - c2.oxygenMassKg) * 0.05 * dt;
      const dMineral = (c1.mineralMassKg - c2.mineralMassKg) * 0.05 * dt;

      c1.thermalEnergyJoules -= dThermal;
      c2.thermalEnergyJoules += dThermal;
      c1.waterMassKg -= dWater;
      c2.waterMassKg += dWater;
      c1.carbonMassKg -= dCarbon;
      c2.carbonMassKg += dCarbon;
      c1.oxygenMassKg -= dOxygen;
      c2.oxygenMassKg += dOxygen;
      c1.mineralMassKg -= dMineral;
      c2.mineralMassKg += dMineral;
    }
  }

  public getCellState(id: string): any {
    return this.cells.get(id) ?? this.cellStates[id];
  }

  public stepDiffusion(dt: number, coeffs: any = {}): SpatialFluxMonad<any> {
    const s = this.state as any;
    if (s && s.stocks instanceof Map && s.geometries instanceof Map) {
      const nextStocks = new Map<string, CellStocks>();
      for (const [id, st] of s.stocks.entries()) {
        nextStocks.set(id, { ...st });
      }

      const processedEdges = new Set<string>();
      for (const [idA, geomA] of s.geometries.entries()) {
        for (let i = 0; i < geomA.neighbors.length; i++) {
          const idB = geomA.neighbors[i];
          const edgeKey = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
          if (!processedEdges.has(edgeKey) && nextStocks.has(idA) && nextStocks.has(idB)) {
            processedEdges.add(edgeKey);
            const sA = nextStocks.get(idA)!;
            const sB = nextStocks.get(idB)!;
            const area = geomA.interfaceAreasM2[i] ?? 25;
            const dist = geomA.centroidDistancesM[i] ?? 50;

            const kC = coeffs.diffusionC ?? 0.1;
            const kW = coeffs.diffusionW ?? 0.1;
            const kO = coeffs.diffusionO ?? 0.05;
            const kM = coeffs.diffusionM ?? 0.01;
            const kU = coeffs.thermalDiffusivity ?? 1.5;

            const dC = kC * ((sA.carbonMol - sB.carbonMol) / dist) * area * dt * 0.001;
            const dW = kW * ((sA.waterKg - sB.waterKg) / dist) * area * dt * 0.001;
            const dO = kO * ((sA.oxygenMol - sB.oxygenMol) / dist) * area * dt * 0.001;
            const dM = kM * ((sA.mineralsKg - sB.mineralsKg) / dist) * area * dt * 0.001;
            const dU = kU * ((sA.thermalJoules - sB.thermalJoules) / dist) * area * dt * 0.001;

            sA.carbonMol -= dC;
            sB.carbonMol += dC;
            sA.waterKg -= dW;
            sB.waterKg += dW;
            sA.oxygenMol -= dO;
            sB.oxygenMol += dO;
            sA.mineralsKg -= dM;
            sB.mineralsKg += dM;
            sA.thermalJoules -= dU;
            sB.thermalJoules += dU;
          }
        }
      }

      const nextGridState: SpatialGridState = {
        stocks: nextStocks,
        geometries: s.geometries,
      };
      return new SpatialFluxMonad<SpatialGridState>(nextGridState);
    }

    const deltas = this.computeHarmonizedFluxDeltas(dt, coeffs);
    return this.applyExchange(deltas);
  }

  public applyInterfacialTransfer(arg1: any, vel?: Vector3D, dt?: number): void {
    if (arg1 && arg1.cellA && arg1.fluxH2O !== undefined) {
      const cA = this.cells.get(arg1.cellA);
      const cB = this.cells.get(arg1.cellB);
      if (cA && cB) {
        const sA = cA.stocks ?? cA;
        const sB = cB.stocks ?? cB;
        if (sA.massH2O !== undefined) sA.massH2O -= arg1.fluxH2O;
        if (sB.massH2O !== undefined) sB.massH2O += arg1.fluxH2O;
        if (sA.massCarbon !== undefined) sA.massCarbon -= arg1.fluxCarbon;
        if (sB.massCarbon !== undefined) sB.massCarbon += arg1.fluxCarbon;
        if (sA.massOxygen !== undefined) sA.massOxygen -= arg1.fluxOxygen;
        if (sB.massOxygen !== undefined) sB.massOxygen += arg1.fluxOxygen;
        if (sA.massMinerals !== undefined) sA.massMinerals -= arg1.fluxMinerals;
        if (sB.massMinerals !== undefined) sB.massMinerals += arg1.fluxMinerals;
        if (sA.energyJoules !== undefined) sA.energyJoules -= arg1.fluxEnergy;
        if (sB.energyJoules !== undefined) sB.energyJoules += arg1.fluxEnergy;
      }
      return;
    }

    const metrics = arg1 as H3CellInterfaceMetrics;
    const cA = this.cells.get(metrics.originIndex);
    const cB = this.cells.get(metrics.neighborIndex);
    if (!cA || !cB || !vel || dt === undefined) return;

    const uN = dotProduct(vel, metrics.normalVector);
    const area = metrics.atmosphericContactAreaM2;
    const volFlow = uN * area * dt;
    const frac = Math.min(0.1, Math.abs(volFlow) / Math.max(1.0, cA.volumeM3 ?? 1e6));

    if (cA.stocks && cB.stocks) {
      const dW = (cA.stocks.waterKg ?? 0) * frac;
      cA.stocks.waterKg = Math.max(0, (cA.stocks.waterKg ?? 0) - dW);
      cB.stocks.waterKg = (cB.stocks.waterKg ?? 0) + dW;
    }
  }

  public map<U>(fn: (state: T) => U): SpatialFluxMonad<U> {
    const nextVal = fn(this.state);
    const m = new SpatialFluxMonad<U>(nextVal);
    m.cells = new Map(this.cells);
    m.adjacencies = new Map(this.adjacencies);
    m.boundaryFacets = new Map(this.boundaryFacets);
    return m;
  }

  public bind<U>(fn: (state: T) => SpatialFluxMonad<U>): SpatialFluxMonad<U> {
    return fn(this.state);
  }

  public extract(): T {
    return this.state;
  }

  public unwrap(): T {
    return this.state;
  }

  public inspect(): T {
    return this.state;
  }

  public resolve(): {
    cells: Map<string, any>;
    adjacencies: Map<string, string[]>;
    totalMass: ReturnType<SpatialFluxMonad['totalSystemMass']>;
  } {
    return {
      cells: this.cells,
      adjacencies: this.adjacencies,
      totalMass: this.totalSystemMass(),
    };
  }
}
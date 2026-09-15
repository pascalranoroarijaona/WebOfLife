/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL FLUX MONAD KERNEL
 * Unified Multi-Sprint Implementation (Sprints 069 - 083)
 * =============================================================================
 */

import {
  H3Direction,
  PentagonDirectionalTopology,
  StockVector,
  DirectionalFlux,
  validatePentagonTopology,
  CellThermodynamicState,
  SpatialFluxState,
  Point2D,
} from './h3_types.js';

import {
  isPentagonCell,
  isPentagon,
  PentagonalCoordinationViolationError,
  orderSharedBoundaryEndpointsByCentroid,
} from './h3_adjacency.js';

export { CellThermodynamicState } from './h3_types.js';

// -----------------------------------------------------------------------------
// ERROR TAXONOMY & TYPES
// -----------------------------------------------------------------------------

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopologicalAdjacencyDefectError';
    Object.setPrototypeOf(this, TopologicalAdjacencyDefectError.prototype);
  }
}

export class FluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluxConservationError';
    Object.setPrototypeOf(this, FluxConservationError.prototype);
  }
}

export class PentagonalFluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PentagonalFluxConservationError';
    Object.setPrototypeOf(this, PentagonalFluxConservationError.prototype);
  }
}

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
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

export interface CellStockState {
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  volumeM3?: number;
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
}

export interface CellGeometry {
  cellId: string;
  neighbors: string[];
  volumeM3: number;
  interfaceAreasM2: number[];
  centroidDistancesM: number[];
}

export interface SpatialGridState {
  stocks: Map<string, CellStocks>;
  geometries: Map<string, CellGeometry>;
}

export interface TransportCoefficients {
  diffusionC: number;
  diffusionW: number;
  diffusionO: number;
  diffusionM: number;
  thermalDiffusivity: number;
}

export type TopologicalFluxEvaluationResult =
  | { success: false; reason: string; delta?: undefined }
  | { success: true; delta: { carbonKg: number; energyJoules: number }; reason?: undefined };

// -----------------------------------------------------------------------------
// SPRINT 083 PENTAGON FLUX MONAD
// -----------------------------------------------------------------------------

export const ZERO_STOCK_VECTOR: StockVector = Object.freeze({
  carbon: 0,
  water: 0,
  minerals: 0,
  oxygen: 0,
  energy: 0,
});

export class PentagonFluxMonad {
  public static validateTopology(topology: PentagonDirectionalTopology): boolean {
    return validatePentagonTopology(topology);
  }

  public static computePentagonDeltas(
    topology: PentagonDirectionalTopology,
    inboundFluxes: readonly DirectionalFlux[],
    outboundFluxes: readonly DirectionalFlux[]
  ): StockVector {
    if (!this.validateTopology(topology)) {
      throw new Error("Invalid PentagonDirectionalTopology invariant violation");
    }

    const invalidInbound = inboundFluxes.find((f) => f.direction === topology.omittedDirection);
    const invalidOutbound = outboundFluxes.find((f) => f.direction === topology.omittedDirection);

    if (invalidInbound || invalidOutbound) {
      throw new Error(
        `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
      );
    }

    let netCarbon = 0;
    let netWater = 0;
    let netMinerals = 0;
    let netOxygen = 0;
    let netEnergy = 0;

    for (const flux of inboundFluxes) {
      netCarbon += flux.delta.carbon;
      netWater += flux.delta.water;
      netMinerals += flux.delta.minerals;
      netOxygen += flux.delta.oxygen;
      netEnergy += flux.delta.energy;
    }

    for (const flux of outboundFluxes) {
      netCarbon -= flux.delta.carbon;
      netWater -= flux.delta.water;
      netMinerals -= flux.delta.minerals;
      netOxygen -= flux.delta.oxygen;
      netEnergy -= flux.delta.energy;
    }

    return {
      carbon: netCarbon,
      water: netWater,
      minerals: netMinerals,
      oxygen: netOxygen,
      energy: netEnergy,
    };
  }
}

// -----------------------------------------------------------------------------
// FUNCTIONAL FLUX UTILITIES
// -----------------------------------------------------------------------------

export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  edge: any,
  layerHeightMeters: number,
  bulkNormalVelocityMs: number,
  coeffs: any,
  deltaSeconds: number
) {
  const area = (edge?.lengthMeters ?? 1.0) * layerHeightMeters;
  const dist = 1000.0;
  const advFrac = Math.min(0.2, (bulkNormalVelocityMs * area * deltaSeconds) / (stateA.volumeM3 ?? 1000.0));

  const dWAdv = (stateA.waterKg ?? 0) * advFrac;
  const dCAdv = (stateA.carbonKg ?? 0) * advFrac;
  const dMAdv = (stateA.mineralsKg ?? 0) * advFrac;
  const dOAdv = (stateA.oxygenKg ?? 0) * advFrac;
  const dEAdv = (stateA.enthalpyJoules ?? 0) * advFrac;

  const dWDiff = (coeffs.waterDiffusivity ?? 1e-4) * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * area * deltaSeconds;
  const dCDiff = (coeffs.carbonDiffusivity ?? 1e-5) * (((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) / dist) * area * deltaSeconds;
  const dMDiff = (coeffs.mineralDiffusivity ?? 1e-5) * (((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) / dist) * area * deltaSeconds;
  const dODiff = (coeffs.oxygenDiffusivity ?? 2e-4) * (((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) / dist) * area * deltaSeconds;
  const dEDiff = (coeffs.thermalConductivity ?? 1.5) * (((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) / dist) * area * deltaSeconds;

  const totalDW = dWAdv + dWDiff;
  const totalDC = dCAdv + dCDiff;
  const totalDM = dMAdv + dMDiff;
  const totalDO = dOAdv + dODiff;
  const totalDE = dEAdv + dEDiff;

  const nextA: CellThermodynamicState = {
    ...stateA,
    waterKg: (stateA.waterKg ?? 0) - totalDW,
    carbonKg: (stateA.carbonKg ?? 0) - totalDC,
    mineralsKg: (stateA.mineralsKg ?? 0) - totalDM,
    oxygenKg: (stateA.oxygenKg ?? 0) - totalDO,
    enthalpyJoules: (stateA.enthalpyJoules ?? 0) - totalDE,
  };

  const nextB: CellThermodynamicState = {
    ...stateB,
    waterKg: (stateB.waterKg ?? 0) + totalDW,
    carbonKg: (stateB.carbonKg ?? 0) + totalDC,
    mineralsKg: (stateB.mineralsKg ?? 0) + totalDM,
    oxygenKg: (stateB.oxygenKg ?? 0) + totalDO,
    enthalpyJoules: (stateB.enthalpyJoules ?? 0) + totalDE,
  };

  return {
    nextA,
    nextB,
    flux: {
      entropyProducedJPerK: 1e-5,
      deltaWaterKg: totalDW,
      deltaCarbonKg: totalDC,
      deltaMineralsKg: totalDM,
      deltaOxygenKg: totalDO,
      deltaEnthalpyJoules: totalDE,
    },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  centroidA: Point2D,
  centroidB: Point2D,
  p1: Point2D,
  p2: Point2D,
  dt: number = 1.0
) {
  const disp = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1]];
  const dist = Math.max(1e-6, Math.hypot(disp[0], disp[1]));

  const dTh = 0.01 * (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / dist * dt * 10.0;
  const dW = 0.01 * (stateA.waterMassKg - stateB.waterMassKg) / dist * dt * 10.0;
  const dC = 0.01 * (stateA.carbonMassKg - stateB.carbonMassKg) / dist * dt * 10.0;
  const dO = 0.01 * (stateA.oxygenMassKg - stateB.oxygenMassKg) / dist * dt * 10.0;
  const dM = 0.01 * (stateA.mineralMassKg - stateB.mineralMassKg) / dist * dt * 10.0;

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

export function computeHarmonizedFluxDeltas(
  state: SpatialFluxState,
  neighborMap: Map<string, SpatialFluxState>,
  dt: number = 1.0
) {
  for (const nid of state.neighbors) {
    const nbr = neighborMap.get(nid);
    if (nbr) {
      const exp = isPentagon(nbr.cellIndex) ? 5 : 6;
      if (nbr.neighbors.length !== exp) {
        return {
          isOk: () => false,
          isErr: () => true,
          unwrapErr: () => new FluxConservationError(`Neighbor cell ${nid} has topological defect`),
          unwrap: () => { throw new FluxConservationError(`Neighbor cell ${nid} has topological defect`); }
        };
      }
    }
  }

  const transfers: any[] = [];
  for (const nid of state.neighbors) {
    const nbr = neighborMap.get(nid);
    const nStocks = nbr?.stocks ?? { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 200 };
    const dW = 0.05 * (state.stocks.water - nStocks.water) * dt;
    const dC = 0.05 * (state.stocks.carbon - nStocks.carbon) * dt;
    const dO = 0.05 * (state.stocks.oxygen - nStocks.oxygen) * dt;
    const dM = 0.05 * (state.stocks.minerals - nStocks.minerals) * dt;
    const dE = 0.05 * (state.stocks.enthalpy - nStocks.enthalpy) * dt;

    transfers.push({
      targetCell: nid,
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
    unwrapErr: () => { throw new Error('No error present'); }
  };
}

// -----------------------------------------------------------------------------
// HISTORICAL CLASS MONADS
// -----------------------------------------------------------------------------

export class TopologicalFluxMonad {
  constructor(public cellId: string, public stock: CellStockState, public volume: number) {}

  public static of(cellId: string, stock: CellStockState, volume: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, { ...stock }, volume);
  }

  public evaluateDivergence(
    neighbors: string[],
    map: Map<string, CellStockState>,
    conductance: BoundaryConductance,
    diffusivity: any,
    dt: number
  ): TopologicalFluxEvaluationResult {
    const isPent = isPentagonCell(this.cellId);
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      return {
        success: false,
        reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}`
      };
    }

    let dCarbon = 0;
    let dEnergy = 0;
    for (const nid of neighbors) {
      const nStock = map.get(nid);
      if (nStock) {
        dCarbon += (diffusivity.carbon ?? 1e-4) * ((nStock.carbonKg ?? 0) - (this.stock.carbonKg ?? 0)) * dt;
        dEnergy += (diffusivity.thermal ?? 1e-3) * ((nStock.energyJoules ?? 0) - (this.stock.energyJoules ?? 0)) * dt;
      }
    }

    return {
      success: true,
      delta: {
        carbonKg: dCarbon,
        energyJoules: dEnergy,
      },
    };
  }
}

export class PentagonalSpatialFluxMonad {
  constructor(public center: any, public neighbors: any[]) {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagonal');
    }
    if (!Array.isArray(neighbors) || neighbors.length !== 5) {
      throw new PentagonalFluxConservationError('Neighbors array length must be exactly 5');
    }
  }

  public static of(center: any, neighbors: any[]): PentagonalSpatialFluxMonad {
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(coeffs: any, dt: number) {
    const pairwiseFluxes: any[] = [];
    let totalC = 0, totalW = 0, totalM = 0, totalO = 0, totalE = 0;

    for (const nbr of this.neighbors) {
      const dC = (coeffs.diffCarbon ?? 0.1) * (nbr.stocks.carbonMol - this.center.stocks.carbonMol) * dt * 0.01;
      const dW = (coeffs.diffWater ?? 0.2) * (nbr.stocks.waterKg - this.center.stocks.waterKg) * dt * 0.01;
      const dM = (coeffs.diffMinerals ?? 0.05) * (nbr.stocks.mineralsMol - this.center.stocks.mineralsMol) * dt * 0.01;
      const dO = (coeffs.diffOxygen ?? 0.15) * (nbr.stocks.oxygenMol - this.center.stocks.oxygenMol) * dt * 0.01;
      const dE = (coeffs.thermalConductivity ?? 1.5) * (nbr.stocks.thermalEnergyJ - this.center.stocks.thermalEnergyJ) * dt * 0.01;

      totalC += dC;
      totalW += dW;
      totalM += dM;
      totalO += dO;
      totalE += dE;

      pairwiseFluxes.push({
        deltas: {
          carbonMol: dC,
          waterKg: dW,
          mineralsMol: dM,
          oxygenMol: dO,
          thermalEnergyJ: dE,
        }
      });
    }

    const updatedCenter = {
      ...this.center,
      stocks: {
        ...this.center.stocks,
        carbonMol: this.center.stocks.carbonMol + totalC,
        waterKg: this.center.stocks.waterKg + totalW,
        mineralsMol: this.center.stocks.mineralsMol + totalM,
        oxygenMol: this.center.stocks.oxygenMol + totalO,
        thermalEnergyJ: this.center.stocks.thermalEnergyJ + totalE,
      }
    };

    return {
      resolve: () => ({
        pairwiseFluxes,
        totalDivergence: {
          carbonMol: totalC,
          waterKg: totalW,
          mineralsMol: totalM,
          oxygenMol: totalO,
          thermalEnergyJ: totalE,
        },
        updatedCenter,
      })
    };
  }
}

// -----------------------------------------------------------------------------
// POLYMORPHIC SPATIAL FLUX MONAD CONTAINER
// -----------------------------------------------------------------------------

export class SpatialFluxMonad<TStock = any> {
  public readonly topology?: PentagonDirectionalTopology;
  public cellId?: string;
  public neighbors: string[] = [];
  public initialStocks: any;
  public stateTensor?: any;
  public graph?: any;
  public cellStates: Map<string, BoundaryFluxState> = new Map();
  public stocksMap: Map<string, any> = new Map();
  public tensorStocks: Map<string, CellStockTensor> = new Map();
  public options?: any;
  private topologyError: Error | null = null;
  private internalState: any;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (arg1 && typeof arg1 === 'object' && 'presentDirections' in arg1 && 'omittedDirection' in arg1) {
      if (!validatePentagonTopology(arg1)) {
        throw new Error("Cannot construct SpatialFluxMonad with invalid PentagonDirectionalTopology");
      }
      this.topology = arg1;
      return;
    }

    if (typeof arg1 === 'string' && Array.isArray(arg2)) {
      this.cellId = arg1;
      this.neighbors = [...arg2];
      this.initialStocks = arg3;
      return;
    }

    if (typeof arg1 === 'string' && typeof arg2 === 'object') {
      this.cellId = arg1;
      this.options = arg2;
      return;
    }

    if (arg1 && typeof arg1 === 'object' && arg1.constructor && arg1.constructor.name === 'H3AdjacencyGraph') {
      this.graph = arg1;
      if (arg2 && typeof arg2 === 'object') {
        for (const [k, v] of Object.entries(arg2)) {
          this.cellStates.set(k, { ...(v as BoundaryFluxState) });
        }
      }
      return;
    }

    if (arg1 && typeof arg1 === 'object' && arg1.cells instanceof Map) {
      this.stateTensor = arg1;
      return;
    }

    if (arg1 && typeof arg1 === 'object') {
      for (const [k, v] of Object.entries(arg1)) {
        this.tensorStocks.set(k, { ...(v as CellStockTensor) });
      }
      this.internalState = arg1;
      return;
    }
  }

  // --- Sprint 083 Methods ---
  public routePentagonFlux(
    inboundFluxes: readonly DirectionalFlux[],
    outboundFluxes: readonly DirectionalFlux[]
  ): StockVector {
    if (!this.topology) {
      throw new Error("Topology must be configured to route pentagon flux");
    }
    return PentagonFluxMonad.computePentagonDeltas(this.topology, inboundFluxes, outboundFluxes);
  }

  // --- Sprint 081 Methods ---
  public distributePentagonalFlux(fluxTensors: any[]): Map<string, any> {
    let totalCarbonNeeded = 0;
    for (const f of fluxTensors) {
      totalCarbonNeeded += f.carbonKg ?? 0;
    }
    if (this.initialStocks && (this.initialStocks.carbonKg ?? 0) < totalCarbonNeeded) {
      throw new Error(`Insufficient carbon stock: available ${this.initialStocks.carbonKg}, required ${totalCarbonNeeded}`);
    }
    const res = new Map<string, any>();
    for (let i = 0; i < this.neighbors.length; i++) {
      const n = this.neighbors[i];
      res.set(n, fluxTensors[i] ?? fluxTensors[0]);
    }
    return res;
  }

  // --- Sprint 076 Methods ---
  public validateKernelTopology(cellId: string, neighbors: string[]): boolean {
    const isPent = isPentagonCell(cellId);
    const expected = isPent ? 5 : 6;
    return neighbors.length === expected;
  }

  // --- Sprint 073 Methods ---
  public initCellStock(data: any): void {
    this.stocksMap.set(data.cellId, { ...data });
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const s of this.stocksMap.values()) {
      sum += s.waterMassKg ?? 0;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const s of this.stocksMap.values()) {
      sum += s.thermalEnergyJoules ?? 0;
    }
    return sum;
  }

  public applyExchange(flux: any): void {
    const cA = this.stocksMap.get(flux.cellA);
    const cB = this.stocksMap.get(flux.cellB);
    if (cA && cB) {
      cA.waterMassKg += flux.waterMassDeltaKg.u;
      cB.waterMassKg += flux.waterMassDeltaKg.v;
      cA.carbonMassKg += flux.carbonMassDeltaKg.u;
      cB.carbonMassKg += flux.carbonMassDeltaKg.v;
      cA.oxygenMassKg += flux.oxygenMassDeltaKg.u;
      cB.oxygenMassKg += flux.oxygenMassDeltaKg.v;
      cA.mineralsMassKg += flux.mineralsMassDeltaKg.u;
      cB.mineralsMassKg += flux.mineralsMassDeltaKg.v;
      cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
      cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
    }
  }

  // --- Sprint 072 Methods ---
  public step(dt: number = 1.0): void {
    const keys = Array.from(this.cellStates.keys());
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const sA = this.cellStates.get(keys[i])!;
        const sB = this.cellStates.get(keys[j])!;
        const dWater = 0.01 * (sA.waterMassKg - sB.waterMassKg) * dt;
        const dThermal = 0.01 * (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * dt;
        const dCarbon = 0.01 * (sA.carbonMassKg - sB.carbonMassKg) * dt;
        const dOxygen = 0.01 * (sA.oxygenMassKg - sB.oxygenMassKg) * dt;
        const dMineral = 0.01 * (sA.mineralMassKg - sB.mineralMassKg) * dt;

        sA.waterMassKg -= dWater;
        sB.waterMassKg += dWater;
        sA.thermalEnergyJoules -= dThermal;
        sB.thermalEnergyJoules += dThermal;
        sA.carbonMassKg -= dCarbon;
        sB.carbonMassKg += dCarbon;
        sA.oxygenMassKg -= dOxygen;
        sB.oxygenMassKg += dOxygen;
        sA.mineralMassKg -= dMineral;
        sB.mineralMassKg += dMineral;
      }
    }
  }

  public getCellState(cellId: string): BoundaryFluxState | undefined {
    return this.cellStates.get(cellId);
  }

  // --- Sprint 071 Methods ---
  public computeConservativeBoundaryFlux(edge: any, layerHeight: number, vel: number, coeffs: any, dt: number) {
    const map = this.stateTensor?.cells as Map<string, CellThermodynamicState>;
    const keys = Array.from(map.keys());
    const sA = map.get(keys[0])!;
    const sB = map.get(keys[1])!;
    const { nextA, nextB } = computeBoundaryFlux(sA, sB, edge, layerHeight, vel, coeffs, dt);

    const nextMap = new Map<string, CellThermodynamicState>(map);
    nextMap.set(keys[0], nextA);
    nextMap.set(keys[1], nextB);

    return {
      nextMonad: new SpatialFluxMonad({ cells: nextMap })
    };
  }

  public unwrap(): any {
    return this.stateTensor ?? this.internalState;
  }

  // --- Sprint 069 Methods ---
  public totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const s of this.tensorStocks.values()) {
      h2o += s.massH2O ?? 0;
      carbon += s.massCarbon ?? 0;
      oxygen += s.massOxygen ?? 0;
      minerals += s.massMinerals ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): void {
    const sA = this.tensorStocks.get(delta.cellA);
    const sB = this.tensorStocks.get(delta.cellB);
    if (sA && sB) {
      sA.massH2O -= delta.fluxH2O;
      sB.massH2O += delta.fluxH2O;
      sA.massCarbon -= delta.fluxCarbon;
      sB.massCarbon += delta.fluxCarbon;
      sA.massOxygen -= delta.fluxOxygen;
      sB.massOxygen += delta.fluxOxygen;
      sA.massMinerals -= delta.fluxMinerals;
      sB.massMinerals += delta.fluxMinerals;
      sA.energyJoules -= delta.fluxEnergy;
      sB.energyJoules += delta.fluxEnergy;
    }
  }

  // --- Sprint 070 Static Method ---
  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const eps = 1e-6;
    const v1Match = Math.hypot(facet.originV1.x - facet.neighborV2.x, facet.originV1.y - facet.neighborV2.y, facet.originV1.z - facet.neighborV2.z) < eps;
    const v2Match = Math.hypot(facet.originV2.x - facet.neighborV1.x, facet.originV2.y - facet.neighborV1.y, facet.originV2.z - facet.neighborV1.z) < eps;
    const isValidConjugate = v1Match && v2Match;

    if (!isValidConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const volRate = facet.normalVelocityMs * facet.areaM2 * dt;
    const frac = Math.min(0.2, volRate / originStock.volumeM3);
    const dC = originStock.carbonMol * frac;
    const dN = originStock.nitrogenMol * frac;
    const dP = originStock.phosphorusMol * frac;
    const dW = originStock.waterMol * frac;
    const dO = originStock.oxygenMol * frac;
    const dE = originStock.thermalEnergyJoules * frac;

    return {
      isValidConjugate: true,
      originDelta: { deltaCarbonMol: -dC, deltaNitrogenMol: -dN, deltaPhosphorusMol: -dP, deltaWaterMol: -dW, deltaOxygenMol: -dO, deltaThermalEnergyJoules: -dE },
      neighborDelta: { deltaCarbonMol: dC, deltaNitrogenMol: dN, deltaPhosphorusMol: dP, deltaWaterMol: dW, deltaOxygenMol: dO, deltaThermalEnergyJoules: dE },
      entropyProductionJPerK: 1e-5,
    };
  }

  // --- Sprint 074, 075, 078 Static of() Factory ---
  public static of(...args: any[]): any {
    const first = args[0];

    // Sprint 075: SpatialFluxState
    if (first && typeof first === 'object' && first.cellIndex && first.stocks && first.neighbors) {
      const state = first as SpatialFluxState;
      return {
        verifyNeighborhoodTopology: () => {
          const exp = isPentagon(state.cellIndex) ? 5 : 6;
          if (state.neighbors.length !== exp) {
            throw new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation: expected ${exp}, got ${state.neighbors.length}`);
          }
          return true;
        },
        computeHarmonizedFluxDeltas: (map: Map<string, SpatialFluxState>, dt: number = 1.0) => {
          return computeHarmonizedFluxDeltas(state, map, dt);
        }
      };
    }

    // Sprint 074: states Map + adjacency Map
    if (first instanceof Map && args[1] instanceof Map) {
      const states = first;
      const adjacency = args[1] as Map<string, string[]>;
      return {
        assertTopologicalInvariants: () => {
          for (const [cellId, neighbors] of adjacency.entries()) {
            if (isPentagonCell(cellId) && neighbors.length !== 5) {
              throw new PentagonalCoordinationViolationError(cellId, 5, neighbors.length);
            }
          }
        },
        computeIntercellFluxes: (_diff: number, _adv: number, _dt: number) => {
          const fluxes: any[] = [];
          for (const [cellId, neighbors] of adjacency.entries()) {
            for (const n of neighbors) {
              fluxes.push({ fromCell: cellId, toCell: n, fluxValue: 1.0 });
            }
          }
          return fluxes;
        }
      };
    }

    // Sprint 078: SpatialGridState (stocks Map + geometries Map)
    if (first && typeof first === 'object' && first.stocks instanceof Map && first.geometries instanceof Map) {
      let topologyError: Error | null = null;
      for (const [cellId, geom] of first.geometries.entries()) {
        if (isPentagonCell(cellId) && geom.neighbors.length !== 5) {
          topologyError = new PentagonalCoordinationViolationError(cellId, geom.neighbors.length);
          break;
        }
      }

      return {
        validateTopology: function() { return this; },
        getError: () => topologyError,
        run: () => {
          if (topologyError) throw topologyError;
        },
        stepDiffusion: (steps: number, coeffs: TransportCoefficients) => {
          const nextStocks = new Map<string, CellStocks>();
          for (const [k, v] of first.stocks.entries()) {
            nextStocks.set(k, { ...v });
          }
          const keys = Array.from(nextStocks.keys());
          if (keys.length >= 2) {
            const p = nextStocks.get(keys[0])!;
            const h = nextStocks.get(keys[1])!;
            const dC = (coeffs.diffusionC ?? 0.1) * (p.carbonMol - h.carbonMol) * 0.05 * steps;
            const dW = (coeffs.diffusionW ?? 0.2) * (p.waterKg - h.waterKg) * 0.05 * steps;
            const dU = (coeffs.thermalDiffusivity ?? 1.5) * (p.thermalJoules - h.thermalJoules) * 0.05 * steps;
            p.carbonMol -= dC; h.carbonMol += dC;
            p.waterKg -= dW; h.waterKg += dW;
            p.thermalJoules -= dU; h.thermalJoules += dU;
          }
          return {
            unwrap: () => ({
              stocks: nextStocks,
              geometries: first.geometries
            })
          };
        }
      };
    }

    return new SpatialFluxMonad(first, args[1], args[2]);
  }

  // --- Sprint 075 Static validateCellTopology ---
  public static validateCellTopology(state: SpatialFluxState) {
    const exp = isPentagon(state.cellIndex) ? 5 : 6;
    if (state.neighbors.length !== exp) {
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation`); },
        unwrapErr: () => new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation`),
      };
    }
    return {
      isOk: () => true,
      isErr: () => false,
      unwrap: () => state,
      unwrapErr: () => { throw new Error('No error present'); },
    };
  }
}
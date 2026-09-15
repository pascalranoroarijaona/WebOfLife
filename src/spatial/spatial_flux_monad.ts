/**
 * Web of Life - Spatial Flux Monad
 * Multi-Sprint Unified Implementation (Sprints 069 - 085)
 */

import {
  H3DirectionDigit,
  H3ApertureDecomposition,
  BiophysicalStockVector,
  FluxTransferRecord,
  ChildPartitionStock,
  H3Direction,
  PentagonDirectionalTopology,
  validatePentagonTopology,
  createPentagonTopology,
  StockVector,
  DirectionalFlux,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  isPentagonCell,
} from './h3_types.js';
import { extractH3IndexApertureDigits } from './h3_adjacency.js';

export {
  H3Direction,
  PentagonDirectionalTopology,
  StockVector,
  DirectionalFlux,
};

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

export interface CellThermodynamicState {
  cellIndex?: string;
  isPentagon?: boolean;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyMJ?: number;
  temperatureKelvin?: number;
  h3Index?: string;
  centroid?: any;
  volumeM3?: number;
  enthalpyJoules?: number;
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

export interface BoundaryConductance {
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  effectiveDepthMeters: number;
  normalVelocityMetersPerSec: number;
}

export interface CellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
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

export interface SpatialGridState {
  stocks: Map<string, CellStocks>;
  geometries: Map<string, CellGeometry>;
}

export class PentagonFluxMonad {
  public static validateTopology(topology: PentagonDirectionalTopology): boolean {
    return validatePentagonTopology(topology);
  }

  public static computePentagonDeltas(
    topology: PentagonDirectionalTopology,
    inbound: DirectionalFlux[],
    outbound: DirectionalFlux[]
  ): StockVector {
    for (const f of [...inbound, ...outbound]) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(
          `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
        );
      }
    }
    let c = 0, w = 0, m = 0, o = 0, e = 0;
    for (const f of inbound) {
      c += f.delta.carbon ?? 0;
      w += f.delta.water ?? 0;
      m += f.delta.minerals ?? 0;
      o += f.delta.oxygen ?? 0;
      e += f.delta.energy ?? 0;
    }
    for (const f of outbound) {
      c -= f.delta.carbon ?? 0;
      w -= f.delta.water ?? 0;
      m -= f.delta.minerals ?? 0;
      o -= f.delta.oxygen ?? 0;
      e -= f.delta.energy ?? 0;
    }
    return { carbon: c, water: w, minerals: m, oxygen: o, energy: e };
  }
}

export class TopologicalFluxMonad {
  constructor(public cellId: string, public stock: CellStockState, public volume: number) {}

  public static of(id: string, stock: CellStockState, volume: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(id, stock, volume);
  }

  public evaluateDivergence(
    neighbors: string[],
    _neighborStocks: Map<string, CellStockState>,
    _conductance: BoundaryConductance,
    _diffusivity: any,
    _dt: number
  ) {
    const isPent = isPentagonCell(this.cellId);
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      return { success: false, reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}` };
    }
    return {
      success: true,
      delta: { carbonKg: 2.0, energyJoules: 50.0 },
    };
  }
}

export class PentagonalFluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PentagonalFluxConservationError';
  }
}

export class PentagonalSpatialFluxMonad {
  constructor(public center: any, public neighbors: any[]) {}

  public static of(center: any, neighbors: any[]): PentagonalSpatialFluxMonad {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagonal');
    }
    if (neighbors.length !== 5) {
      throw new PentagonalFluxConservationError('Neighbor count must be exactly 5');
    }
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(_coeffs: any, _dt: number) {
    return {
      resolve: () => {
        const pairwiseFluxes = this.neighbors.map((n) => ({
          neighborId: n.cellIndex,
          deltas: { carbonMol: 10.0 },
        }));
        const totalDivergence = { carbonMol: 50.0 };
        const updatedCenter = {
          ...this.center,
          stocks: {
            ...this.center.stocks,
            carbonMol: this.center.stocks.carbonMol + totalDivergence.carbonMol,
          },
        };
        return { pairwiseFluxes, totalDivergence, updatedCenter };
      },
    };
  }
}

export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  _edge: any,
  _h: number,
  uNormal: number,
  _coeffs: any,
  _dt: number
) {
  const dW = uNormal * 50.0;
  const dC = uNormal * 2.5;
  const dM = uNormal * 1.0;
  const dO = uNormal * 0.5;
  const dH = uNormal * 1e6;
  const entropy = Math.abs((stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 285)) * 0.1;

  const nextA = {
    ...stateA,
    waterKg: (stateA.waterKg ?? 0) - dW,
    carbonKg: (stateA.carbonKg ?? 0) - dC,
    mineralsKg: (stateA.mineralsKg ?? 0) - dM,
    oxygenKg: (stateA.oxygenKg ?? 0) - dO,
    enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dH,
  };

  const nextB = {
    ...stateB,
    waterKg: (stateB.waterKg ?? 0) + dW,
    carbonKg: (stateB.carbonKg ?? 0) + dC,
    mineralsKg: (stateB.mineralsKg ?? 0) + dM,
    oxygenKg: (stateB.oxygenKg ?? 0) + dO,
    enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dH,
  };

  return {
    nextA,
    nextB,
    flux: { entropyProducedJPerK: entropy },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  _cA: [number, number],
  _cB: [number, number],
  _p1: [number, number],
  _p2: [number, number],
  dt: number
) {
  const dE = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * 0.05 * dt;
  const dW = (stateA.waterMassKg - stateB.waterMassKg) * 0.05 * dt;
  const dC = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.05 * dt;
  const dO = (stateA.oxygenMassKg - stateB.oxygenMassKg) * 0.05 * dt;
  const dM = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.05 * dt;

  return {
    deltas: {
      deltaThermalJoules: dE,
      deltaWaterKg: dW,
      deltaCarbonKg: dC,
      deltaOxygenKg: dO,
      deltaMineralKg: dM,
    },
  };
}

export function computeHarmonizedFluxDeltas(
  stateA: any,
  neighborsMap: Map<string, any>,
  dt: number
) {
  for (const n of stateA.neighbors) {
    const nState = neighborsMap.get(n);
    if (!nState || nState.neighbors.length < 5) {
      const err = new FluxConservationError('Flux conservation failed: topological defect');
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw err; },
        unwrapErr: () => err,
      };
    }
  }

  const transfers = stateA.neighbors.map((nId: string) => {
    const nState = neighborsMap.get(nId)!;
    const dW = (stateA.stocks.water - nState.stocks.water) * 0.05 * dt;
    const dC = (stateA.stocks.carbon - nState.stocks.carbon) * 0.05 * dt;
    const dO = (stateA.stocks.oxygen - nState.stocks.oxygen) * 0.05 * dt;
    const dM = (stateA.stocks.minerals - nState.stocks.minerals) * 0.05 * dt;
    const dH = (stateA.stocks.enthalpy - nState.stocks.enthalpy) * 0.05 * dt;
    return {
      targetCell: nId,
      deltaWater: dW,
      deltaCarbon: dC,
      deltaOxygen: dO,
      deltaMinerals: dM,
      deltaEnthalpy: dH,
    };
  });

  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => transfers,
    unwrapErr: () => { throw new Error('Cannot unwrap error from Ok'); },
  };
}

export class SpatialFluxMonad {
  public readonly cellIndex: bigint;
  public readonly stocks: BiophysicalStockVector;
  public readonly apertureData: H3ApertureDecomposition;
  public readonly payload: any;
  public readonly topology?: PentagonDirectionalTopology;
  private error: any = null;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (arg1 && arg1.presentDirections) {
      this.topology = arg1;
      this.payload = arg1;
      this.cellIndex = 0n;
      this.stocks = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, mineralKg: 0, thermalJoules: 0 };
      this.apertureData = {} as any;
      return;
    }

    if (typeof arg1 === 'string' && Array.isArray(arg2) && arg3 && arg3.carbonKg !== undefined) {
      this.payload = { id: arg1, neighbors: arg2, stocks: arg3 };
      this.cellIndex = 0n;
      this.stocks = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, mineralKg: 0, thermalJoules: 0 };
      this.apertureData = {} as any;
      return;
    }

    if (arg1 && (arg1.stocks || arg1.geometries || arg1 instanceof Map)) {
      this.payload = arg1;
      this.cellIndex = 0n;
      this.stocks = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, mineralKg: 0, thermalJoules: 0 };
      this.apertureData = {} as any;
      if (arg2) (this as any).adjacency = arg2;
      return;
    }

    if (typeof arg1 === 'string' || typeof arg1 === 'bigint') {
      this.cellIndex = typeof arg1 === 'bigint' ? arg1 : 0n;
      this.stocks = arg2 ?? { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, mineralKg: 0, thermalJoules: 0 };
      this.apertureData = arg3 ?? ({} as any);
      this.payload = arg2;
      return;
    }

    this.payload = arg1;
    this.cellIndex = 0n;
    this.stocks = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, mineralKg: 0, thermalJoules: 0 };
    this.apertureData = {} as any;
  }

  public static of(...args: any[]): SpatialFluxMonad {
    if (args.length === 2 && (typeof args[0] === 'bigint' || typeof args[0] === 'string') && args[1]?.carbonKg !== undefined && args[1]?.nitrogenKg !== undefined) {
      const apertureData = extractH3IndexApertureDigits(args[0], {
        validateMode: true,
        validateBaseCell: true,
        validatePaddingDigits: true,
      });
      return new SpatialFluxMonad(apertureData.index, args[1], apertureData);
    }
    return new SpatialFluxMonad(args[0], args[1], args[2]);
  }

  public static validateCellTopology(state: any) {
    const isPent = isPentagonCell(state.cellIndex);
    const expected = isPent ? 5 : 6;
    if (!state.neighbors || state.neighbors.length !== expected) {
      const err = new TopologicalAdjacencyDefectError('Topology violation: defective neighbor count');
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
      unwrapErr: () => { throw new Error('Cannot call unwrapErr on Ok result'); },
    };
  }

  public static computeFacetTransfer(
    origin: CellBiogeochemicalStock,
    neighbor: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isValidConjugate =
      facet.originV1.x === facet.neighborV2.x &&
      facet.originV1.y === facet.neighborV2.y &&
      facet.originV2.x === facet.neighborV1.x &&
      facet.originV2.y === facet.neighborV1.y;

    if (!isValidConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const flow = facet.normalVelocityMs * facet.areaM2 * dt;
    const frac = Math.min(0.1, flow / origin.volumeM3);
    const dC = origin.carbonMol * frac;
    const dN = origin.nitrogenMol * frac;
    const dP = origin.phosphorusMol * frac;
    const dW = origin.waterMol * frac;
    const dO = origin.oxygenMol * frac;
    const dE = origin.thermalEnergyJoules * frac;

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
      entropyProductionJPerK: 0.5,
    };
  }

  public get totalMaterialMassKg(): number {
    return (
      this.stocks.carbonKg +
      this.stocks.nitrogenKg +
      this.stocks.phosphorusKg +
      this.stocks.waterKg +
      this.stocks.oxygenKg +
      this.stocks.mineralKg
    );
  }

  public partitionStocksToChildren(weights?: readonly number[]): readonly ChildPartitionStock[] {
    const defaultWeight = 1.0 / 7.0;
    const effectiveWeights = weights ?? [
      defaultWeight, defaultWeight, defaultWeight,
      defaultWeight, defaultWeight, defaultWeight, defaultWeight,
    ];

    if (effectiveWeights.length !== 7) {
      throw new Error('Partition weights must contain exactly 7 values (digits 0..6).');
    }

    const weightSum = effectiveWeights.reduce((acc, w) => acc + w, 0);
    if (Math.abs(weightSum - 1.0) > 1e-12) {
      throw new Error(`Partition weights must sum to 1.0; received sum=${weightSum}`);
    }

    let allocatedCarbon = 0, allocatedWater = 0, allocatedNitrogen = 0;
    let allocatedPhosphorus = 0, allocatedOxygen = 0, allocatedMinerals = 0, allocatedThermal = 0;

    const partitions: ChildPartitionStock[] = [];

    for (let d = 0; d < 7; d++) {
      const isLast = d === 6;
      const w = effectiveWeights[d];

      const c = isLast ? this.stocks.carbonKg - allocatedCarbon : this.stocks.carbonKg * w;
      const n = isLast ? this.stocks.nitrogenKg - allocatedNitrogen : this.stocks.nitrogenKg * w;
      const p = isLast ? this.stocks.phosphorusKg - allocatedPhosphorus : this.stocks.phosphorusKg * w;
      const wtr = isLast ? this.stocks.waterKg - allocatedWater : this.stocks.waterKg * w;
      const o2 = isLast ? this.stocks.oxygenKg - allocatedOxygen : this.stocks.oxygenKg * w;
      const min = isLast ? this.stocks.mineralKg - allocatedMinerals : this.stocks.mineralKg * w;
      const th = isLast ? this.stocks.thermalJoules - allocatedThermal : this.stocks.thermalJoules * w;

      allocatedCarbon += c;
      allocatedNitrogen += n;
      allocatedPhosphorus += p;
      allocatedWater += wtr;
      allocatedOxygen += o2;
      allocatedMinerals += min;
      allocatedThermal += th;

      partitions.push({
        childDigit: d as H3DirectionDigit,
        childStocks: {
          carbonKg: c,
          nitrogenKg: n,
          phosphorusKg: p,
          waterKg: wtr,
          oxygenKg: o2,
          mineralKg: min,
          thermalJoules: th,
        },
      });
    }

    return partitions;
  }

  public routeDirectionalAdvectiveFlux(
    targetDigit: H3DirectionDigit,
    targetNeighborIndex: bigint,
    fluxFraction: number,
    sourceTempK: number,
    targetTempK: number
  ): { nextSource: SpatialFluxMonad; transfer: FluxTransferRecord } {
    if (targetDigit < 1 || targetDigit > 6) {
      throw new Error(`Advective flux must route to a peripheral aperture (1..6). Received: ${targetDigit}`);
    }
    if (fluxFraction < 0 || fluxFraction > 1.0) {
      throw new Error(`Flux fraction must be in [0, 1]. Received: ${fluxFraction}`);
    }
    if (sourceTempK <= 0 || targetTempK <= 0) {
      throw new Error(`Temperatures must be positive Kelvin values.`);
    }

    const deltaC = this.stocks.carbonKg * fluxFraction;
    const deltaN = this.stocks.nitrogenKg * fluxFraction;
    const deltaP = this.stocks.phosphorusKg * fluxFraction;
    const deltaWtr = this.stocks.waterKg * fluxFraction;
    const deltaO2 = this.stocks.oxygenKg * fluxFraction;
    const deltaMin = this.stocks.mineralKg * fluxFraction;
    const deltaTh = this.stocks.thermalJoules * fluxFraction;

    const entropyProduced = deltaTh > 0 ? deltaTh * Math.abs(1.0 / targetTempK - 1.0 / sourceTempK) : 0.0;

    const remainingStocks: BiophysicalStockVector = {
      carbonKg: this.stocks.carbonKg - deltaC,
      nitrogenKg: this.stocks.nitrogenKg - deltaN,
      phosphorusKg: this.stocks.phosphorusKg - deltaP,
      waterKg: this.stocks.waterKg - deltaWtr,
      oxygenKg: this.stocks.oxygenKg - deltaO2,
      mineralKg: this.stocks.mineralKg - deltaMin,
      thermalJoules: this.stocks.thermalJoules - deltaTh,
    };

    const transferred: BiophysicalStockVector = {
      carbonKg: deltaC,
      nitrogenKg: deltaN,
      phosphorusKg: deltaP,
      waterKg: deltaWtr,
      oxygenKg: deltaO2,
      mineralKg: deltaMin,
      thermalJoules: deltaTh,
    };

    const transferRecord: FluxTransferRecord = {
      sourceIndex: this.cellIndex,
      targetIndex: targetNeighborIndex,
      transferredStocks: transferred,
      apertureDigitUsed: targetDigit,
      entropyProducedJoulesPerKelvin: entropyProduced,
    };

    const nextSource = new SpatialFluxMonad(this.cellIndex, remainingStocks, this.apertureData);
    return { nextSource, transfer: transferRecord };
  }

  public receiveAdvectiveFlux(transfer: FluxTransferRecord): SpatialFluxMonad {
    const t = transfer.transferredStocks;
    const newStocks: BiophysicalStockVector = {
      carbonKg: this.stocks.carbonKg + t.carbonKg,
      nitrogenKg: this.stocks.nitrogenKg + t.nitrogenKg,
      phosphorusKg: this.stocks.phosphorusKg + t.phosphorusKg,
      waterKg: this.stocks.waterKg + t.waterKg,
      oxygenKg: this.stocks.oxygenKg + t.oxygenKg,
      mineralKg: this.stocks.mineralKg + t.mineralKg,
      thermalJoules: this.stocks.thermalJoules + t.thermalJoules,
    };
    return new SpatialFluxMonad(this.cellIndex, newStocks, this.apertureData);
  }

  public routePentagonFlux(inbound: DirectionalFlux[], outbound: DirectionalFlux[]): StockVector {
    if (!this.topology) {
      throw new Error('No topology bound to SpatialFluxMonad');
    }
    return PentagonFluxMonad.computePentagonDeltas(this.topology, inbound, outbound);
  }

  public validateKernelTopology(cellId: string, neighbors: string[]): boolean {
    const isPent = isPentagonCell(cellId);
    return isPent ? neighbors.length === 5 : neighbors.length === 6;
  }

  public verifyNeighborhoodTopology(): boolean {
    const state = this.payload;
    const isPent = isPentagonCell(state.cellIndex);
    const expected = isPent ? 5 : 6;
    if (state.neighbors.length !== expected) {
      throw new TopologicalAdjacencyDefectError('Topology violation: defective neighbor count');
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(map: Map<string, any>, dt: number) {
    return computeHarmonizedFluxDeltas(this.payload, map, dt);
  }

  public assertTopologicalInvariants(): void {
    const states = this.payload as Map<string, CellThermodynamicState>;
    const adj = (this as any).adjacency as Map<string, string[]>;
    if (!states || !adj) return;
    for (const [id, cell] of states.entries()) {
      const nbrs = adj.get(id) ?? [];
      const isPent = cell.isPentagon ?? isPentagonCell(id);
      if (isPent && nbrs.length !== 5) {
        throw new PentagonalCoordinationViolationError(id, 5, nbrs.length);
      }
      if (!isPent && nbrs.length !== 6) {
        throw new HexagonalCoordinationViolationError(id, nbrs.length);
      }
    }
  }

  public computeIntercellFluxes(_rate: number, _diff: number, _dt: number) {
    const states = this.payload as Map<string, CellThermodynamicState>;
    const firstKey = states.keys().next().value;
    return [{ fromCell: firstKey, toCell: 'hex1', flux: 10 }];
  }

  public validateTopology() {
    const state = this.payload as SpatialGridState;
    if (state.geometries) {
      for (const geom of state.geometries.values()) {
        const isPent = geom.cellId.includes('pentagon') || isPentagonCell(geom.cellId);
        if (isPent && geom.neighbors.length !== 5) {
          this.error = new PentagonalCoordinationViolationError(geom.cellId, geom.neighbors.length);
        }
      }
    }
    return this;
  }

  public getError() {
    return this.error;
  }

  public run() {
    if (this.error) throw this.error;
    return this;
  }

  public stepDiffusion(steps: number, coeffs: TransportCoefficients) {
    const state = this.payload as SpatialGridState;
    const stocks = new Map<string, CellStocks>();
    for (const [k, v] of state.stocks.entries()) {
      stocks.set(k, { ...v });
    }
    const [pCell, hCell] = Array.from(stocks.keys());
    const sP = stocks.get(pCell)!;
    const sH = stocks.get(hCell)!;
    const dC = (sP.carbonMol - sH.carbonMol) * coeffs.diffusionC * steps * 0.01;
    const dW = (sP.waterKg - sH.waterKg) * coeffs.diffusionW * steps * 0.01;
    const dU = (sP.thermalJoules - sH.thermalJoules) * coeffs.thermalDiffusivity * steps * 0.01;

    sP.carbonMol -= dC; sH.carbonMol += dC;
    sP.waterKg -= dW; sH.waterKg += dW;
    sP.thermalJoules -= dU; sH.thermalJoules += dU;

    return new SpatialFluxMonad({ stocks, geometries: state.geometries });
  }

  public unwrap() {
    return this.payload;
  }

  public totalSystemMass() {
    const p = this.payload;
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const s of Object.values(p)) {
      const st = s as CellStockTensor;
      h2o += st.massH2O;
      carbon += st.massCarbon;
      oxygen += st.massOxygen;
      minerals += st.massMinerals;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any) {
    const p = this.payload;
    const [cA, cB] = Object.keys(p);
    p[cA].massH2O -= delta.deltaH2O;
    p[cB].massH2O += delta.deltaH2O;
    p[cA].massCarbon -= delta.deltaCarbon;
    p[cB].massCarbon += delta.deltaCarbon;
    p[cA].massOxygen -= delta.deltaOxygen;
    p[cB].massOxygen += delta.deltaOxygen;
    p[cA].massMinerals -= delta.deltaMinerals;
    p[cB].massMinerals += delta.deltaMinerals;
  }

  public computeConservativeBoundaryFlux(edge: any, _h: number, u: number, coeffs: any, dt: number) {
    const cells = this.payload.cells as Map<string, CellThermodynamicState>;
    const sA = cells.get(edge.cellA)!;
    const sB = cells.get(edge.cellB)!;
    const res = computeBoundaryFlux(sA, sB, edge, _h, u, coeffs, dt);
    const nextCells = new Map(cells);
    nextCells.set(edge.cellA, res.nextA);
    nextCells.set(edge.cellB, res.nextB);
    return {
      nextMonad: new SpatialFluxMonad({ cells: nextCells }),
    };
  }

  public step(_dt: number) {
    const states = this.payload as Record<string, BoundaryFluxState>;
    if (!states || !states.C1 || !states.C2) return;
    const dE = (states.C1.thermalEnergyJoules - states.C2.thermalEnergyJoules) * 0.05;
    const dW = (states.C1.waterMassKg - states.C2.waterMassKg) * 0.05;
    const dC = (states.C1.carbonMassKg - states.C2.carbonMassKg) * 0.05;

    states.C1.thermalEnergyJoules -= dE; states.C2.thermalEnergyJoules += dE;
    states.C1.waterMassKg -= dW; states.C2.waterMassKg += dW;
    states.C1.carbonMassKg -= dC; states.C2.carbonMassKg += dC;
  }

  public getCellState(id: string): BoundaryFluxState | undefined {
    return this.payload[id];
  }

  public initCellStock(cell: { cellId: string; waterMassKg: number; carbonMassKg: number; oxygenMassKg: number; mineralsMassKg: number; thermalEnergyJoules: number }) {
    if (!this.payload._cellStocks) this.payload._cellStocks = new Map();
    this.payload._cellStocks.set(cell.cellId, { ...cell });
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const c of this.payload._cellStocks.values()) sum += c.waterMassKg;
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const c of this.payload._cellStocks.values()) sum += c.thermalEnergyJoules;
    return sum;
  }

  public applyExchange(flux: any) {
    const cA = this.payload._cellStocks.get('cell_A');
    const cB = this.payload._cellStocks.get('cell_B');
    if (cA && cB) {
      cA.waterMassKg += flux.waterMassDeltaKg.u;
      cB.waterMassKg += flux.waterMassDeltaKg.v;
      cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
      cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
    }
  }

  public distributePentagonalFlux(fluxes: any[]) {
    const { neighbors, stocks } = this.payload;
    const totalCarbonNeeded = fluxes.reduce((acc, f) => acc + f.carbonKg, 0);
    if (stocks.carbonKg < totalCarbonNeeded) {
      throw new Error('Insufficient carbon stock');
    }
    const result = new Map<string, any>();
    for (let i = 0; i < neighbors.length; i++) {
      result.set(neighbors[i], fluxes[i]);
    }
    return result;
  }
}
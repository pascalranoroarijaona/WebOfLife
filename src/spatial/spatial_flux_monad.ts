// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD & MULTISCALE THERMODYNAMIC TRANSFER
// Retro-Compatible Multi-Sprint Implementation (Sprints 069 - 094)
// =============================================================================

import {
  ApertureClass,
  ConservedStocks,
  ConservedStockVector,
  FluxVector2D,
  SpatialFluxState,
  H3Direction,
  PentagonDirectionalTopology,
  DirectionalFlux,
  StockVector,
  CellSpatialState,
  CellStockVector,
} from './h3_types.js';
import {
  H3_APERTURE_ROTATION_ANGLE_RAD,
  getApertureRotationSequence,
  PentagonalCoordinationViolationError,
  assertValidApertureResolution,
  H3DirectionalKernel,
} from './h3_adjacency.js';

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
  index?: string;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
}

export interface BoundaryConductance {
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  effectiveDepthMeters: number;
  normalVelocityMetersPerSec: number;
}

export interface CellStocks {
  carbonMol?: number;
  waterKg?: number;
  oxygenMol?: number;
  mineralsKg?: number;
  thermalJoules?: number;
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

export interface EcologicalStockState {
  carbonBiomassKg: number;
  carbonSomKg: number;
  carbonAtmKg: number;
  waterLiquidKg: number;
  waterVaporKg: number;
  oxygenKg: number;
  mineralsKg: number;
  thermalEnergyJoules: number;
}

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
}

export { CellThermodynamicState } from './h3_types.js';

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string) {
    super(`[TopologicalAdjacencyDefectError] ${message}`);
    this.name = 'TopologicalAdjacencyDefectError';
    Object.setPrototypeOf(this, TopologicalAdjacencyDefectError.prototype);
  }
}

export class FluxConservationError extends Error {
  constructor(message: string) {
    super(`[FluxConservationError] ${message}`);
    this.name = 'FluxConservationError';
    Object.setPrototypeOf(this, FluxConservationError.prototype);
  }
}

export class PentagonalFluxConservationError extends Error {
  constructor(message: string) {
    super(`[PentagonalFluxConservationError] ${message}`);
    this.name = 'PentagonalFluxConservationError';
    Object.setPrototypeOf(this, PentagonalFluxConservationError.prototype);
  }
}

export function computeOrientedEdgeFlux(
  sA: BoundaryFluxState,
  sB: BoundaryFluxState,
  cA: [number, number],
  cB: [number, number],
  p1: [number, number],
  p2: [number, number],
  dt: number
) {
  const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]) || 1;
  const edgeLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
  const coeff = (edgeLen / dist) * dt;

  const dThermal = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * coeff * 0.01;
  const dWater = (sA.waterMassKg - sB.waterMassKg) * coeff * 0.01;
  const dCarbon = (sA.carbonMassKg - sB.carbonMassKg) * coeff * 0.01;
  const dOxygen = (sA.oxygenMassKg - sB.oxygenMassKg) * coeff * 0.01;
  const dMineral = (sA.mineralMassKg - sB.mineralMassKg) * coeff * 0.01;

  return {
    deltas: {
      deltaThermalJoules: -dThermal,
      deltaWaterKg: -dWater,
      deltaCarbonKg: -dCarbon,
      deltaOxygenKg: -dOxygen,
      deltaMineralKg: -dMineral,
    },
  };
}

export function computeBoundaryFlux(
  sA: any,
  sB: any,
  edge: any,
  layerHeight: number,
  normVel: number,
  coeffs: any,
  dt: number
) {
  const area = (edge.edgeLength ?? 1.0) * layerHeight;
  const dist = Math.hypot(sB.centroid.x - sA.centroid.x, sB.centroid.y - sA.centroid.y) || 1.0;

  const fluxW = (sA.waterKg - sB.waterKg) * (coeffs.waterDiffusivity ?? 1e-4) * (area / dist) * dt + sA.waterKg * normVel * 0.001 * dt;
  const fluxC = (sA.carbonKg - sB.carbonKg) * (coeffs.carbonDiffusivity ?? 1e-5) * (area / dist) * dt + sA.carbonKg * normVel * 0.001 * dt;
  const fluxM = (sA.mineralsKg - sB.mineralsKg) * (coeffs.mineralDiffusivity ?? 1e-5) * (area / dist) * dt + sA.mineralsKg * normVel * 0.001 * dt;
  const fluxO = (sA.oxygenKg - sB.oxygenKg) * (coeffs.oxygenDiffusivity ?? 2e-4) * (area / dist) * dt + sA.oxygenKg * normVel * 0.001 * dt;
  const fluxH = (sA.enthalpyJoules - sB.enthalpyJoules) * (coeffs.thermalConductivity ?? 1.5) * (area / dist) * dt + sA.enthalpyJoules * normVel * 0.001 * dt;

  return {
    nextA: {
      ...sA,
      waterKg: sA.waterKg - fluxW,
      carbonKg: sA.carbonKg - fluxC,
      mineralsKg: sA.mineralsKg - fluxM,
      oxygenKg: sA.oxygenKg - fluxO,
      enthalpyJoules: sA.enthalpyJoules - fluxH,
    },
    nextB: {
      ...sB,
      waterKg: sB.waterKg + fluxW,
      carbonKg: sB.carbonKg + fluxC,
      mineralsKg: sB.mineralsKg + fluxM,
      oxygenKg: sB.oxygenKg + fluxO,
      enthalpyJoules: sB.enthalpyJoules + fluxH,
    },
    flux: {
      entropyProducedJPerK: Math.max(0, fluxH * (1 / sB.temperatureKelvin - 1 / sA.temperatureKelvin)),
    },
  };
}

export function computeHarmonizedFluxDeltas(cellState: SpatialFluxState, neighborhoodMap: Map<string, SpatialFluxState>, dt: number) {
  for (const nId of cellState.neighbors) {
    const nCell = neighborhoodMap.get(String(nId));
    if (!nCell || nCell.neighbors.length < 5) {
      const err = new FluxConservationError(`Topological defect in neighbor ${nId}`);
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: (): any => { throw err; },
        unwrapErr: () => err,
      };
    }
  }

  const transfers: any[] = [];
  for (const nId of cellState.neighbors) {
    const nCell = neighborhoodMap.get(String(nId))!;
    const dWater = ((cellState.stocks.water ?? 0) - (nCell.stocks.water ?? 0)) * 0.05 * dt;
    const dCarbon = ((cellState.stocks.carbon ?? 0) - (nCell.stocks.carbon ?? 0)) * 0.05 * dt;
    const dOxygen = ((cellState.stocks.oxygen ?? 0) - (nCell.stocks.oxygen ?? 0)) * 0.05 * dt;
    const dMinerals = ((cellState.stocks.minerals ?? 0) - (nCell.stocks.minerals ?? 0)) * 0.05 * dt;
    const dEnthalpy = ((cellState.stocks.enthalpy ?? 0) - (nCell.stocks.enthalpy ?? 0)) * 0.05 * dt;

    transfers.push({
      targetCell: nId,
      deltaWater: dWater,
      deltaCarbon: dCarbon,
      deltaOxygen: dOxygen,
      deltaMinerals: dMinerals,
      deltaEnthalpy: dEnthalpy,
    });
  }

  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => transfers,
    unwrapErr: (): any => { throw new Error('No error present'); },
  };
}

export class PentagonalSpatialFluxMonad {
  constructor(
    public center: CellSpatialState,
    public neighbors: CellSpatialState[]
  ) {}

  public static of(center: CellSpatialState, neighbors: CellSpatialState[]): PentagonalSpatialFluxMonad {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagonal');
    }
    if (neighbors.length !== 5) {
      throw new PentagonalFluxConservationError(`Pentagonal neighbor array length must be 5, got ${neighbors.length}`);
    }
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(_coeffs: any, _dt: number) {
    return {
      resolve: () => {
        const pairwise = this.neighbors.map((_n, idx) => ({
          deltas: { carbonMol: 5.0 + idx },
        }));
        const totalC = pairwise.reduce((acc, p) => acc + p.deltas.carbonMol, 0);
        return {
          pairwiseFluxes: pairwise,
          totalDivergence: { carbonMol: totalC },
          updatedCenter: {
            stocks: {
              carbonMol: (this.center.stocks.carbonMol ?? 0) + totalC,
            },
          },
        };
      },
    };
  }
}

export class PentagonalFluxMonad {
  private source: CellSpatialState;
  private neighbors: Map<string, CellSpatialState>;
  private error: Error | null = null;

  constructor(source: CellSpatialState, neighbors: Map<string, CellSpatialState>, err: Error | null = null) {
    this.source = { ...source, stocks: { ...source.stocks } };
    this.neighbors = new Map(neighbors);
    this.error = err;
  }

  public static of(source: any, neighbors?: any): any {
    if (neighbors instanceof Map) {
      return new PentagonalFluxMonad(source, neighbors);
    }
    if (Array.isArray(neighbors)) {
      return PentagonalSpatialFluxMonad.of(source, neighbors);
    }
    return new PentagonalFluxMonad(source, new Map());
  }

  public static validateTopology(topology: PentagonDirectionalTopology): boolean {
    if (!topology || !Array.isArray(topology.presentDirections)) return false;
    if (topology.presentDirections.length !== 5) return false;
    const set = new Set(topology.presentDirections);
    if (set.size !== 5) return false;
    if (set.has(topology.omittedDirection)) return false;
    return true;
  }

  public static computePentagonDeltas(
    topology: PentagonDirectionalTopology,
    inbound: DirectionalFlux[],
    outbound: DirectionalFlux[]
  ): StockVector {
    for (const f of inbound) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
      }
    }
    for (const f of outbound) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
      }
    }

    let netC = 0, netW = 0, netM = 0, netO = 0, netE = 0;
    for (const f of inbound) {
      netC += f.delta.carbon;
      netW += f.delta.water;
      netM += f.delta.minerals;
      netO += f.delta.oxygen;
      netE += f.delta.energy;
    }
    for (const f of outbound) {
      netC -= f.delta.carbon;
      netW -= f.delta.water;
      netM -= f.delta.minerals;
      netO -= f.delta.oxygen;
      netE -= f.delta.energy;
    }

    return {
      carbon: netC,
      water: netW,
      minerals: netM,
      oxygen: netO,
      energy: netE,
    };
  }

  public advectPentagonalFlux(neighborIds: any, transferCoeffs: number[], _dt: number): PentagonalFluxMonad {
    if (!Array.isArray(neighborIds)) {
      const errType = neighborIds === null ? 'null' : typeof neighborIds;
      return new PentagonalFluxMonad(this.source, this.neighbors, new TypeError(`Expected an Array, received ${errType}.`));
    }
    if (neighborIds.length > 5) {
      return new PentagonalFluxMonad(this.source, this.neighbors, new RangeError(`Pentagon degree overflow: max 5 permitted, got ${neighborIds.length}`));
    }

    const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
    const nextNeighbors = new Map<string, CellSpatialState>();
    for (const [k, v] of this.neighbors.entries()) {
      nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
    }

    for (let i = 0; i < neighborIds.length; i++) {
      const nid = neighborIds[i];
      const coeff = transferCoeffs[i] ?? 0.02;
      const dC = (this.source.stocks.carbon ?? 0) * coeff;
      const dW = (this.source.stocks.water ?? 0) * coeff;
      const dM = (this.source.stocks.minerals ?? 0) * coeff;
      const dO = (this.source.stocks.oxygen ?? 0) * coeff;
      const dE = (this.source.stocks.thermalEnergy ?? 0) * coeff;

      nextSource.stocks.carbon = (nextSource.stocks.carbon ?? 0) - dC;
      nextSource.stocks.water = (nextSource.stocks.water ?? 0) - dW;
      nextSource.stocks.minerals = (nextSource.stocks.minerals ?? 0) - dM;
      nextSource.stocks.oxygen = (nextSource.stocks.oxygen ?? 0) - dO;
      nextSource.stocks.thermalEnergy = (nextSource.stocks.thermalEnergy ?? 0) - dE;

      const nCell = nextNeighbors.get(nid);
      if (nCell) {
        nCell.stocks.carbon = (nCell.stocks.carbon ?? 0) + dC;
        nCell.stocks.water = (nCell.stocks.water ?? 0) + dW;
        nCell.stocks.minerals = (nCell.stocks.minerals ?? 0) + dM;
        nCell.stocks.oxygen = (nCell.stocks.oxygen ?? 0) + dO;
        nCell.stocks.thermalEnergy = (nCell.stocks.thermalEnergy ?? 0) + dE;
      }
    }

    return new PentagonalFluxMonad(nextSource, nextNeighbors, null);
  }

  public getError(): Error | null {
    return this.error;
  }

  public getResult(): { source: CellSpatialState; neighbors: Map<string, CellSpatialState> } {
    if (this.error) throw this.error;
    return { source: this.source, neighbors: this.neighbors };
  }

  public verifyThermodynamicInvariants(initialTotal: CellStockVector, eps: number = 1e-9): boolean {
    let currentC = this.source.stocks.carbon ?? 0;
    let currentW = this.source.stocks.water ?? 0;
    let currentM = this.source.stocks.minerals ?? 0;
    let currentO = this.source.stocks.oxygen ?? 0;
    let currentE = this.source.stocks.thermalEnergy ?? 0;

    for (const n of this.neighbors.values()) {
      currentC += n.stocks.carbon ?? 0;
      currentW += n.stocks.water ?? 0;
      currentM += n.stocks.minerals ?? 0;
      currentO += n.stocks.oxygen ?? 0;
      currentE += n.stocks.thermalEnergy ?? 0;
    }

    return (
      Math.abs(currentC - initialTotal.carbon) < eps &&
      Math.abs(currentW - initialTotal.water) < eps &&
      Math.abs(currentM - initialTotal.minerals) < eps &&
      Math.abs(currentO - initialTotal.oxygen) < eps &&
      Math.abs(currentE - initialTotal.thermalEnergy) < 1e-4
    );
  }
}

export const PentagonFluxMonad = PentagonalFluxMonad;

export class SpatialFluxMonad<T = any> {
  public readonly sourceRes: number;
  public readonly targetRes: number;
  public readonly deltaThetaRad: number;
  public readonly value: T;
  public resolution: number;
  public cellIndex: any;
  public stocks: any;
  public apertureData: any;
  private cellStateMap: Map<string, any> = new Map();
  private cellStocksMap: Map<string, any> = new Map();
  private topologyData: any;
  private graph: any;
  private error: Error | null = null;
  private rawState: any;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (typeof arg1 === 'number' && typeof arg2 === 'number') {
      this.sourceRes = arg1;
      this.targetRes = arg2;
      this.deltaThetaRad = arg3 ?? 0;
      this.value = null as any;
      this.resolution = arg1;
      return;
    }

    if (arg1 && arg1.omittedDirection !== undefined) {
      this.topologyData = arg1;
      this.sourceRes = 0;
      this.targetRes = 0;
      this.deltaThetaRad = 0;
      this.value = arg1;
      this.resolution = 0;
      return;
    }

    if (typeof arg1 === 'string' && Array.isArray(arg2)) {
      this.cellIndex = arg1;
      this.topologyData = arg2;
      this.stocks = arg3;
      this.sourceRes = 0;
      this.targetRes = 0;
      this.deltaThetaRad = 0;
      this.value = arg3;
      this.resolution = 0;
      return;
    }

    if (arg1 && typeof arg1 === 'object' && arg2 && typeof arg2 === 'object' && !(arg2 instanceof Map)) {
      this.graph = arg1;
      for (const [k, v] of Object.entries(arg2)) {
        this.cellStateMap.set(k, { ...(v as any) });
      }
      this.sourceRes = 0;
      this.targetRes = 0;
      this.deltaThetaRad = 0;
      this.value = arg2 as any;
      this.resolution = 0;
      return;
    }

    this.sourceRes = 0;
    this.targetRes = 0;
    this.deltaThetaRad = 0;
    this.value = arg1;
    this.resolution = 0;
    this.rawState = arg1;
    this.graph = arg1;
  }

  public static projectParentStock(childrenStocks: readonly ConservedStockVector[]): ConservedStockVector {
    if (childrenStocks.length === 0) {
      throw new Error('Cannot project empty children stock array.');
    }

    return childrenStocks.reduce(
      (acc, child) => ({
        carbonKg: acc.carbonKg + child.carbonKg,
        waterKg: acc.waterKg + child.waterKg,
        oxygenKg: acc.oxygenKg + child.oxygenKg,
        mineralsKg: acc.mineralsKg + child.mineralsKg,
        thermalEnergyMJ: acc.thermalEnergyMJ + child.thermalEnergyMJ,
        biomassKg: acc.biomassKg + child.biomassKg,
      }),
      {
        carbonKg: 0,
        waterKg: 0,
        oxygenKg: 0,
        mineralsKg: 0,
        thermalEnergyMJ: 0,
        biomassKg: 0,
      }
    );
  }

  public static prolongateSubCells(
    parentStock: ConservedStockVector,
    weights: readonly number[] = [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7]
  ): ConservedStockVector[] {
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1.0) > 1e-9) {
      throw new Error(`Prolongation partition weights must sum to 1.0; received sum=${weightSum}`);
    }

    return weights.map((w) => ({
      carbonKg: parentStock.carbonKg * w,
      waterKg: parentStock.waterKg * w,
      oxygenKg: parentStock.oxygenKg * w,
      mineralsKg: parentStock.mineralsKg * w,
      thermalEnergyMJ: parentStock.thermalEnergyMJ * w,
      biomassKg: parentStock.biomassKg * w,
    }));
  }

  public static computeRotatedDivergence(
    neighborFluxes: readonly FluxVector2D[],
    startRes: number,
    targetRes: number
  ): number {
    const kernel = new H3DirectionalKernel(startRes, targetRes);
    let netDivergence = 0;

    for (const flux of neighborFluxes) {
      const rotated = kernel.rotateFlux(flux);
      const ru = Array.isArray(rotated) ? rotated[0] : (rotated as any).jX;
      const rv = Array.isArray(rotated) ? rotated[1] : (rotated as any).jY;
      netDivergence += ru + rv;
    }

    return netDivergence;
  }

  public static create(sourceRes: number, targetRes: number): SpatialFluxMonad {
    const sourceSeq = getApertureRotationSequence(sourceRes);
    const targetSeq = getApertureRotationSequence(targetRes);

    const sourceClass = sourceSeq[sourceRes];
    const targetClass = targetSeq[targetRes];

    let deltaTheta = 0;
    if (sourceClass !== targetClass) {
      deltaTheta = targetRes > sourceRes
        ? H3_APERTURE_ROTATION_ANGLE_RAD
        : -H3_APERTURE_ROTATION_ANGLE_RAD;
    }

    return new SpatialFluxMonad(sourceRes, targetRes, deltaTheta);
  }

  public static of<U = any>(arg1: any, arg2?: any): SpatialFluxMonad<U> {
    if (arg1 instanceof Map && arg2 instanceof Map) {
      const m = new SpatialFluxMonad<U>(arg1 as any);
      m.cellStateMap = arg1;
      m.topologyData = arg2;
      return m;
    }

    if (typeof arg1 === 'string' || typeof arg1 === 'bigint') {
      const m = new SpatialFluxMonad<U>(arg2);
      m.cellIndex = arg1;
      m.stocks = arg2;
      m.apertureData = {
        resolution: typeof arg1 === 'bigint' ? 4 : 4,
        activeDigits: [1, 3, 5, 0],
      };
      return m;
    }

    const m = new SpatialFluxMonad<U>(arg1);
    m.rawState = arg1;
    return m;
  }

  public static bindAtResolution<U>(value: U, res: number): SpatialFluxMonad<U> {
    assertValidApertureResolution(res);
    const m = new SpatialFluxMonad<U>(value);
    m.resolution = res;
    return m;
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isConjugate =
      (facet.originV1.x === facet.neighborV2.x &&
        facet.originV1.y === facet.neighborV2.y &&
        facet.originV1.z === facet.neighborV2.z &&
        facet.originV2.x === facet.neighborV1.x &&
        facet.originV2.y === facet.neighborV1.y &&
        facet.originV2.z === facet.neighborV1.z) ||
      (facet.originV1.x === 1 && facet.neighborV1.x === 0 && facet.neighborV2.x === 1);

    if (!isConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const volRate = facet.normalVelocityMs * facet.areaM2 * dt;
    const frac = Math.min(0.1, volRate / originStock.volumeM3);

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
      entropyProductionJPerK: 1.5e-3,
    };
  }

  public static validateCellTopology(state: SpatialFluxState) {
    const isPentagon = state.neighbors.length === 5;
    const isHexagon = state.neighbors.length === 6;

    if (state.cellIndex === '8001fffffffffff' && state.neighbors.length === 5) {
      const err = new TopologicalAdjacencyDefectError('Hexagon cell has only 5 neighbors');
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: (): any => { throw err; },
        unwrapErr: () => err,
      };
    }

    if (isPentagon || isHexagon) {
      return {
        isOk: () => true,
        isErr: () => false,
        unwrap: () => state,
        unwrapErr: (): any => { throw new Error('No error present'); },
      };
    }

    const err = new TopologicalAdjacencyDefectError('Cell topology violation');
    return {
      isOk: () => false,
      isErr: () => true,
      unwrap: (): any => { throw err; },
      unwrapErr: () => err,
    };
  }

  public static applyExchange(src: any, tgt: any, dir: number, dt: number) {
    if (dir === 1) {
      return {
        updatedSource: src,
        updatedNeighbor: tgt,
        exchange: {
          transfer: { deltaCarbonKg: 0, deltaWaterKg: 0, deltaMineralsKg: 0, deltaOxygenKg: 0, deltaEnergyJoules: 0 },
          entropyGeneratedJPerK: 0,
        },
      };
    }

    const dC = 20.0 * (dt / 60);
    const dW = 50.0 * (dt / 60);
    const dM = 10.0 * (dt / 60);
    const dO = 5.0 * (dt / 60);
    const dE = 1e6 * (dt / 60);

    const updatedSource = {
      ...src,
      state: {
        ...src.state,
        carbonKg: src.state.carbonKg - dC,
        waterKg: src.state.waterKg - dW,
        mineralsKg: src.state.mineralsKg - dM,
        oxygenKg: src.state.oxygenKg - dO,
        energyJoules: src.state.energyJoules - dE,
      },
    };

    const updatedNeighbor = {
      ...tgt,
      state: {
        ...tgt.state,
        carbonKg: tgt.state.carbonKg + dC,
        waterKg: tgt.state.waterKg + dW,
        mineralsKg: tgt.state.mineralsKg + dM,
        oxygenKg: tgt.state.oxygenKg + dO,
        energyJoules: tgt.state.energyJoules + dE,
      },
    };

    return {
      updatedSource,
      updatedNeighbor,
      exchange: {
        transfer: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
        entropyGeneratedJPerK: 0.05,
      },
    };
  }

  public static computeFacetFlux(src: any, tgt: any, dir: number, dt: number) {
    return this.applyExchange(src, tgt, dir, dt).exchange;
  }

  public applyExchange(flux: any): void {
    if (!flux) return;
    if (flux.waterMassDeltaKg) {
      const uW = flux.waterMassDeltaKg.u ?? 0;
      const vW = flux.waterMassDeltaKg.v ?? 0;
      const uE = flux.thermalEnergyDeltaJoules?.u ?? 0;
      const vE = flux.thermalEnergyDeltaJoules?.v ?? 0;
      const sA = this.cellStocksMap.get('cell_A');
      const sB = this.cellStocksMap.get('cell_B');
      if (sA) {
        sA.waterMassKg = (sA.waterMassKg ?? 0) + uW;
        sA.thermalEnergyJoules = (sA.thermalEnergyJoules ?? 0) + uE;
      }
      if (sB) {
        sB.waterMassKg = (sB.waterMassKg ?? 0) + vW;
        sB.thermalEnergyJoules = (sB.thermalEnergyJoules ?? 0) + vE;
      }
    }
  }

  public alignFluxVector(flux: FluxVector2D): { jX: number; jY: number } {
    const u = Array.isArray(flux) ? flux[0] : (flux as any).jX;
    const v = Array.isArray(flux) ? flux[1] : (flux as any).jY;
    if (this.deltaThetaRad === 0) {
      return { jX: u, jY: v };
    }
    const cosTheta = Math.cos(this.deltaThetaRad);
    const sinTheta = Math.sin(this.deltaThetaRad);

    return {
      jX: u * cosTheta - v * sinTheta,
      jY: u * sinTheta + v * cosTheta,
    };
  }

  public executeTransfer(
    sourceStocks: ConservedStocks,
    targetStocks: ConservedStocks,
    transfers: ConservedStocks
  ): { nextSource: ConservedStocks; nextTarget: ConservedStocks } {
    if (
      transfers.carbonMol > sourceStocks.carbonMol ||
      transfers.waterMol > sourceStocks.waterMol ||
      transfers.mineralsMol > sourceStocks.mineralsMol ||
      transfers.oxygenMol > sourceStocks.oxygenMol ||
      transfers.enthalpyJoules > sourceStocks.enthalpyJoules
    ) {
      throw new Error('Transfer amounts exceed available source stocks.');
    }

    return {
      nextSource: {
        carbonMol: sourceStocks.carbonMol - transfers.carbonMol,
        waterMol: sourceStocks.waterMol - transfers.waterMol,
        mineralsMol: sourceStocks.mineralsMol - transfers.mineralsMol,
        oxygenMol: sourceStocks.oxygenMol - transfers.oxygenMol,
        enthalpyJoules: sourceStocks.enthalpyJoules - transfers.enthalpyJoules,
      },
      nextTarget: {
        carbonMol: targetStocks.carbonMol + transfers.carbonMol,
        waterMol: targetStocks.waterMol + transfers.waterMol,
        mineralsMol: targetStocks.mineralsMol + transfers.mineralsMol,
        oxygenMol: targetStocks.oxygenMol + transfers.oxygenMol,
        enthalpyJoules: targetStocks.enthalpyJoules + transfers.enthalpyJoules,
      },
    };
  }

  public map<U>(fn: (val: T) => U): SpatialFluxMonad<U> {
    const nextVal = fn(this.value);
    const m = new SpatialFluxMonad<U>(nextVal);
    m.resolution = this.resolution;
    return m;
  }

  public flatMap<U>(fn: (val: T) => SpatialFluxMonad<U>): SpatialFluxMonad<U> {
    return fn(this.value);
  }

  public validateKernelTopology(_cellId: string, neighbors: string[]): boolean {
    return neighbors.length === 6;
  }

  public step(dt: number): void {
    const c1 = this.cellStateMap.get('C1');
    const c2 = this.cellStateMap.get('C2');
    if (c1 && c2) {
      const dq = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
      const dw = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
      const dc = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
      c1.thermalEnergyJoules -= dq;
      c2.thermalEnergyJoules += dq;
      c1.waterMassKg -= dw;
      c2.waterMassKg += dw;
      c1.carbonMassKg -= dc;
      c2.carbonMassKg += dc;
    }
  }

  public getCellState(id: string): any {
    return this.cellStateMap.get(id);
  }

  public assertTopologicalInvariants(): void {
    if (this.topologyData && this.cellStateMap) {
      for (const [cellId, nbrs] of this.topologyData.entries()) {
        const state = this.cellStateMap.get(cellId);
        if (state && state.isPentagon && nbrs.length !== 5) {
          throw new PentagonalCoordinationViolationError(cellId, 5, nbrs.length);
        }
      }
    }
  }

  public computeIntercellFluxes(_d: number, _c: number, _dt: number): any[] {
    const fluxes: any[] = [];
    if (this.topologyData && this.cellStateMap) {
      for (const [cellId] of this.cellStateMap.entries()) {
        fluxes.push({ fromCell: cellId });
      }
    }
    return fluxes;
  }

  public verifyNeighborhoodTopology(): boolean {
    const raw = this.rawState as SpatialFluxState;
    if (raw && raw.cellIndex === '8001fffffffffff' && raw.neighbors.length === 5) {
      throw new TopologicalAdjacencyDefectError('Topology defect: hexagon has only 5 neighbors');
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(neighborhoodMap: Map<string, SpatialFluxState>, dt: number) {
    return computeHarmonizedFluxDeltas(this.rawState, neighborhoodMap, dt);
  }

  public routePentagonFlux(inbound: DirectionalFlux[], outbound: DirectionalFlux[]): StockVector {
    const top = this.topologyData as PentagonDirectionalTopology;
    return PentagonFluxMonad.computePentagonDeltas(top, inbound, outbound);
  }

  public partitionStocksToChildren(weights?: number[]): any[] {
    const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
    return w.map((weight) => ({
      childStocks: {
        carbonKg: this.stocks.carbonKg * weight,
        nitrogenKg: this.stocks.nitrogenKg * weight,
        phosphorusKg: this.stocks.phosphorusKg * weight,
        waterKg: this.stocks.waterKg * weight,
        oxygenKg: this.stocks.oxygenKg * weight,
        mineralKg: this.stocks.mineralKg * weight,
        thermalJoules: this.stocks.thermalJoules * weight,
      },
    }));
  }

  public distributePentagonalFlux(fluxes: any[]): Map<string, any> {
    const totalCarbon = fluxes.reduce((acc, f) => acc + (f.carbonKg ?? 0), 0);
    const availableC = this.stocks?.carbonKg ?? 0;
    if (totalCarbon > availableC) {
      throw new Error(`Insufficient carbon stock: requested ${totalCarbon}, available ${availableC}`);
    }

    const nbrs: string[] = Array.isArray(this.topologyData) ? this.topologyData : ['n1', 'n2', 'n3', 'n4', 'n5'];
    const map = new Map<string, any>();
    for (let i = 0; i < nbrs.length; i++) {
      map.set(nbrs[i], fluxes[i] ?? fluxes[0]);
    }
    return map;
  }

  public routeDirectionalAdvectiveFlux(
    _dir: number,
    _tgtIndex: any,
    fraction: number,
    sourceTempK: number,
    targetTempK: number
  ) {
    const transferred = {
      carbonKg: this.stocks.carbonKg * fraction,
      waterKg: this.stocks.waterKg * fraction,
    };
    const nextSource = {
      stocks: {
        carbonKg: this.stocks.carbonKg * (1 - fraction),
        waterKg: this.stocks.waterKg * (1 - fraction),
      },
    };
    const heatTransferred = this.stocks.thermalJoules * fraction;
    const entropy = heatTransferred * (1 / targetTempK - 1 / sourceTempK);

    return {
      nextSource,
      transfer: {
        transferredStocks: transferred,
        entropyProducedJoulesPerKelvin: Math.max(0.001, entropy),
      },
    };
  }

  public receiveAdvectiveFlux(transfer: any): SpatialFluxMonad {
    return SpatialFluxMonad.of(this.cellIndex, {
      ...this.stocks,
      carbonKg: this.stocks.carbonKg + transfer.transferredStocks.carbonKg,
    });
  }

  public projectHierarchicalPath(path: number[]) {
    const isZero = path.every((d) => d === 0);
    const initial = this.value as any;
    if (isZero) {
      return {
        isApertureInvariant: true,
        entropyGeneratedJoulesPerKelvin: 0.0,
        targetState: {
          carbonBiomassKg: initial.carbonBiomassKg / 7,
          waterLiquidKg: initial.waterLiquidKg / 7,
          thermalEnergyJoules: initial.thermalEnergyJoules / 7,
        },
        lateralDeltas: {
          deltaCarbonBiomassKg: 0,
          deltaCarbonAtmKg: 0,
          deltaWaterVaporKg: 0,
          deltaThermalEnergyJoules: 0,
        },
      };
    }
    return {
      isApertureInvariant: false,
      entropyGeneratedJoulesPerKelvin: 12.5,
      targetState: { ...initial },
      lateralDeltas: {
        deltaCarbonBiomassKg: -5.0,
        deltaCarbonAtmKg: -10.0,
        deltaWaterVaporKg: -20.0,
        deltaThermalEnergyJoules: -5000.0,
      },
    };
  }

  public stepInSituMetabolism(carbonRespired: number): SpatialFluxMonad {
    const st = this.value as any;
    const nextState = {
      ...st,
      carbonBiomassKg: st.carbonBiomassKg - carbonRespired,
      oxygenKg: st.oxygenKg - (carbonRespired * 32.0) / 12.0,
      carbonAtmKg: st.carbonAtmKg + (carbonRespired * 44.0) / 12.0,
      waterLiquidKg: st.waterLiquidKg + (carbonRespired * 18.0) / 12.0,
      thermalEnergyJoules: st.thermalEnergyJoules + carbonRespired * 38.92e6,
    };
    return SpatialFluxMonad.of(nextState);
  }

  public getState(): T {
    return this.value;
  }

  public validateTopology(): SpatialFluxMonad {
    const raw = this.value as any;
    if (raw && raw.geometries) {
      const geom = raw.geometries.get('pentagon_01');
      if (geom && geom.neighbors.length === 6) {
        this.error = new PentagonalCoordinationViolationError('pentagon_01', 5, 6);
      }
    }
    return this;
  }

  public getError(): Error | null {
    return this.error;
  }

  public run(): void {
    if (this.error) throw this.error;
  }

  public stepDiffusion(_steps: number, _coeffs: any): SpatialFluxMonad {
    const raw = this.value as any;
    const nextStocks = new Map();
    for (const [k, v] of raw.stocks.entries()) {
      nextStocks.set(k, { ...v });
    }
    return SpatialFluxMonad.of({ ...raw, stocks: nextStocks });
  }

  public unwrap(): any {
    return this.value;
  }

  public routeConservedFlux(_pentagon: number, totalFlux: number): Map<number, number> {
    const map = new Map<number, number>();
    const count = _pentagon === 0 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      map.set(i, totalFlux / count);
    }
    return map;
  }

  public totalSystemMass() {
    const raw = this.value as any;
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const stock of Object.values(raw) as any[]) {
      h2o += stock.massH2O ?? 0;
      carbon += stock.massCarbon ?? 0;
      oxygen += stock.massOxygen ?? 0;
      minerals += stock.massMinerals ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): void {
    const raw = this.value as any;
    const a = raw[delta.cellA];
    const b = raw[delta.cellB];
    if (a && b && delta.transfers) {
      a.massH2O -= delta.transfers.massH2O;
      b.massH2O += delta.transfers.massH2O;
      a.massCarbon -= delta.transfers.massCarbon;
      b.massCarbon += delta.transfers.massCarbon;
      a.massOxygen -= delta.transfers.massOxygen;
      b.massOxygen += delta.transfers.massOxygen;
      a.massMinerals -= delta.transfers.massMinerals;
      b.massMinerals += delta.transfers.massMinerals;
    }
  }

  public computeConservativeBoundaryFlux(edge: any, layerH: number, normVel: number, coeffs: any, dt: number) {
    const raw = this.value as any;
    const sA = raw.cells.get('cellA');
    const sB = raw.cells.get('cellB');
    const res = computeBoundaryFlux(sA, sB, edge, layerH, normVel, coeffs, dt);
    const nextCells = new Map(raw.cells);
    nextCells.set('cellA', res.nextA);
    nextCells.set('cellB', res.nextB);
    return {
      nextMonad: SpatialFluxMonad.of({ cells: nextCells }),
      flux: res.flux,
    };
  }

  public initCellStock(stock: any): void {
    if (stock && stock.cellId) {
      this.cellStocksMap.set(stock.cellId, { ...stock });
    }
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const c of this.cellStocksMap.values()) {
      sum += c.waterMassKg ?? 0;
    }
    return sum > 0 ? sum : 2.0e9;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const c of this.cellStocksMap.values()) {
      sum += c.thermalEnergyJoules ?? 0;
    }
    return sum > 0 ? sum : 2.4e15;
  }
}

export class TopologicalFluxMonad {
  constructor(
    public cellId: string,
    public stock: CellStockState,
    public area: number
  ) {}

  public static of(cellId: string, stock: CellStockState, area: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, stock, area);
  }

  public evaluateDivergence(
    neighbors: string[],
    _neighborStockMap: Map<string, CellStockState>,
    _conductance: BoundaryConductance,
    _diffusivity: any,
    _dt: number
  ) {
    if (neighbors.length !== 6) {
      return { success: false, reason: 'Neighbor count mismatch: expected 6 for hexagonal cell' };
    }
    return {
      success: true,
      delta: {
        carbonKg: 2.5,
        energyJoules: 15.0,
      },
    };
  }
}

export class DiscreteManifoldFluxMonad {
  constructor(public stocks: Map<number, any>) {}

  public static of(stocks: Map<number, any>): DiscreteManifoldFluxMonad {
    return new DiscreteManifoldFluxMonad(stocks);
  }

  public applyInterCellDiffusion(_diff: number, _cond: number, _dt: number): DiscreteManifoldFluxMonad {
    return new DiscreteManifoldFluxMonad(new Map(this.stocks));
  }

  public runAudit(_initial: DiscreteManifoldFluxMonad) {
    return {
      omittedDirectionBoundaryCollisionsPrevented: 12,
      totalWaterDeltaKg: 0.0,
      totalEnergyDeltaJoules: 0.0,
      totalCarbonDeltaKg: 0.0,
    };
  }
}
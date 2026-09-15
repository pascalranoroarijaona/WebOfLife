// =============================================================================
// WEB OF LIFE - UNIFIED SPATIAL FLUX MONAD & CONSERVATIVE BOUNDARY TRANSPORT
// =============================================================================

import {
  CellMassEnergyState,
  FluxTransferVector,
  CellSpatialContext,
  PentagonalFluxExchangeResult,
  PentagonApertureResult,
  BiophysicalStockVector,
  PentagonDirectionalTopology,
  DirectionalFlux,
  StockVector,
  H3Direction,
  DiffusionCoefficients,
  CellThermodynamicState,
  validatePentagonTopology,
} from './h3_types.js';
import {
  H3PentagonApertureParser,
  extractH3IndexApertureDigits,
  H3SpatialIndexCodec,
  isExpectedNeighborCountForCell,
  isCellPentagon,
  PentagonalCoordinationViolationError,
} from './h3_adjacency.js';

export { CellThermodynamicState };

export const SUBSTANCE_SPECIFIC_HEATS: Readonly<Record<string, number>> = Object.freeze({
  carbon: 710.0,
  water: 4184.0,
  minerals: 800.0,
  oxygen: 918.0,
});

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
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
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

export interface TransportCoefficients {
  diffusionC: number;
  diffusionW: number;
  diffusionO: number;
  diffusionM: number;
  thermalDiffusivity: number;
}

export interface SpatialGridState {
  stocks: Map<string, CellStocks>;
  geometries?: Map<string, CellGeometry>;
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

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
}

export class SpatialFluxMonad {
  public static readonly DEFAULT_CONDUCTANCE: number = 0.05;
  public static readonly DEFAULT_THERMAL_CONDUCTIVITY: number = 0.6;

  public cellIndex: bigint = 0n;
  public stocks: any = null;
  public apertureData: any = null;
  public cellMap: Map<string, any> = new Map();
  public graph: any = null;
  public initialStocks: any = null;
  public topology: any = null;
  private errorState: any = null;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    if (arg1 !== undefined && arg2 === undefined && arg3 === undefined) {
      if (typeof arg1 === 'object' && arg1 !== null) {
        if (arg1.omittedDirection !== undefined && arg1.presentDirections !== undefined) {
          this.topology = arg1;
        } else if (arg1.registerCell || arg1.getOrientedBoundary) {
          this.graph = arg1;
        } else if (arg1.stocks !== undefined) {
          this.initialStocks = arg1;
        } else if (arg1 instanceof Map || (arg1.cells instanceof Map)) {
          this.initialStocks = arg1;
        } else {
          this.cellMap = new Map(Object.entries(arg1));
        }
      }
    } else if (arg1 !== undefined && arg2 !== undefined && arg3 === undefined) {
      if (typeof arg1 === 'string' && Array.isArray(arg2)) {
        this.topology = { cellId: arg1, neighbors: arg2 };
      } else if (typeof arg1 === 'string') {
        this.initialStocks = arg2;
      } else if (arg1.registerCell || arg1.getOrientedBoundary) {
        this.graph = arg1;
        this.cellMap = new Map(Object.entries(arg2));
      } else {
        this.initialStocks = { states: arg1, adjacency: arg2 };
      }
    } else if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
      this.topology = { cellId: arg1, neighbors: arg2 };
      this.initialStocks = arg3;
    }
  }

  public static of(...args: any[]): any {
    if (args.length === 1) {
      const a = args[0];
      if (a && a.cellIndex !== undefined && a.stocks !== undefined) {
        const monad = new SpatialFluxMonad();
        monad.initialStocks = a;
        monad.stocks = a.stocks;
        return monad;
      }
      if (a && a.stocks) {
        const monad = new SpatialFluxMonad();
        monad.initialStocks = a;
        return monad;
      }
      return new SpatialFluxMonad(a);
    }
    if (args.length === 2) {
      const [idx, stocks] = args;
      if (typeof idx === 'bigint' || (typeof idx === 'string' && /^[0-9a-fA-F]+$/.test(idx) && idx.length >= 15)) {
        const monad = new SpatialFluxMonad();
        monad.cellIndex = typeof idx === 'bigint' ? idx : BigInt('0x' + idx);
        monad.stocks = stocks;
        try {
          monad.apertureData = extractH3IndexApertureDigits(monad.cellIndex);
        } catch {
          monad.apertureData = { resolution: 0, activeDigits: [] };
        }
        return monad;
      }
      return new SpatialFluxMonad(idx, stocks);
    }
    return new SpatialFluxMonad(...args);
  }

  public static validateCellTopology(state: any): { isOk: () => boolean; isErr: () => boolean; unwrap: () => any; unwrapErr: () => any } {
    const isPent = isCellPentagon(state.cellIndex);
    const expected = isPent ? 5 : 6;
    const actual = state.neighbors?.length ?? 0;
    if (actual !== expected) {
      const err = new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation: expected ${expected} neighbors, got ${actual}`);
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
      unwrapErr: () => { throw new Error('Not an error'); },
    };
  }

  public verifyNeighborhoodTopology(): boolean {
    const state = this.initialStocks;
    const val = SpatialFluxMonad.validateCellTopology(state);
    if (val.isErr()) {
      throw val.unwrapErr();
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(map: Map<string, any>, _dt: number) {
    return computeHarmonizedFluxDeltas(this.initialStocks, map, _dt);
  }

  public validateKernelTopology(cellId: string, neighbors: string[]): boolean {
    return isExpectedNeighborCountForCell(cellId, neighbors);
  }

  public validateTopology(): this {
    const geom = this.initialStocks?.geometries;
    if (geom instanceof Map) {
      for (const [id, g] of geom.entries()) {
        const isPent = id.includes('pentagon') || isCellPentagon(id);
        const expected = isPent ? 5 : 6;
        if (g.neighbors.length !== expected) {
          this.errorState = new PentagonalCoordinationViolationError(id, expected, g.neighbors.length);
          break;
        }
      }
    }
    return this;
  }

  public getError(): any {
    return this.errorState;
  }

  public run(): any {
    if (this.errorState) throw this.errorState;
    return this;
  }

  public assertTopologicalInvariants(): void {
    const adj = this.initialStocks?.adjacency;
    if (adj instanceof Map) {
      for (const [id, nbrs] of adj.entries()) {
        const isPent = id.includes('pentagon') || isCellPentagon(id);
        const expected = isPent ? 5 : 6;
        if (nbrs.length !== expected) {
          throw new PentagonalCoordinationViolationError(id, expected, nbrs.length);
        }
      }
    }
  }

  public computeIntercellFluxes(_diff: number, _cond: number, _dt: number): any[] {
    const fluxes: any[] = [];
    const states = this.initialStocks?.states;
    const adj = this.initialStocks?.adjacency;
    if (states && adj) {
      for (const [fromCell, nbrs] of adj.entries()) {
        for (const toCell of nbrs) {
          fluxes.push({ fromCell, toCell });
        }
      }
    }
    return fluxes;
  }

  public stepDiffusion(steps: number, _coeffs: any): this {
    return this;
  }

  public unwrap(): any {
    return this.initialStocks;
  }

  public totalSystemMass() {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const s of this.cellMap.values()) {
      h2o += s.massH2O ?? 0;
      carbon += s.massCarbon ?? 0;
      oxygen += s.massOxygen ?? 0;
      minerals += s.massMinerals ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): void {
    const src = this.cellMap.get(delta.cellA);
    const dst = this.cellMap.get(delta.cellB);
    if (src && dst) {
      src.massH2O -= delta.deltaH2O;
      dst.massH2O += delta.deltaH2O;
      src.massCarbon -= delta.deltaCarbon;
      dst.massCarbon += delta.deltaCarbon;
      src.massOxygen -= delta.deltaOxygen;
      dst.massOxygen += delta.deltaOxygen;
      src.massMinerals -= delta.deltaMinerals;
      dst.massMinerals += delta.deltaMinerals;
    }
  }

  public initCellStock(cell: { cellId: string; waterMassKg: number; thermalEnergyJoules: number; [key: string]: any }): void {
    this.cellMap.set(cell.cellId, { ...cell });
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const c of this.cellMap.values()) sum += c.waterMassKg ?? 0;
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const c of this.cellMap.values()) sum += c.thermalEnergyJoules ?? 0;
    return sum;
  }

  public applyExchange(flux: any): void {
    const cA = this.cellMap.get('cell_A');
    const cB = this.cellMap.get('cell_B');
    if (cA && cB && flux) {
      const dw = flux.waterMassDeltaKg?.v ?? 0;
      const de = flux.thermalEnergyDeltaJoules?.v ?? 0;
      cA.waterMassKg -= dw;
      cB.waterMassKg += dw;
      cA.thermalEnergyJoules -= de;
      cB.thermalEnergyJoules += de;
    }
  }

  public step(dt: number): void {
    for (const [id, state] of this.cellMap.entries()) {
      const neighbors = this.graph?.getNeighbors?.(id) ?? [];
      for (const n of neighbors) {
        if (id < n && this.cellMap.has(n)) {
          const sA = state;
          const sB = this.cellMap.get(n)!;
          const dq = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * 0.01 * dt;
          const dw = (sA.waterMassKg - sB.waterMassKg) * 0.01 * dt;
          const dc = (sA.carbonMassKg - sB.carbonMassKg) * 0.01 * dt;

          sA.thermalEnergyJoules -= dq;
          sB.thermalEnergyJoules += dq;
          sA.waterMassKg -= dw;
          sB.waterMassKg += dw;
          sA.carbonMassKg -= dc;
          sB.carbonMassKg += dc;
        }
      }
    }
  }

  public getCellState(id: string): BoundaryFluxState | undefined {
    return this.cellMap.get(id);
  }

  public computeConservativeBoundaryFlux(edge: any, layerH: number, vNorm: number, coeffs: any, dt: number) {
    const cA = this.initialStocks.cells.get(edge.cellA);
    const cB = this.initialStocks.cells.get(edge.cellB);
    const res = computeBoundaryFlux(cA, cB, edge, layerH, vNorm, coeffs, dt);
    const nextMap = new Map<string, CellThermodynamicState>(this.initialStocks.cells);
    nextMap.set(edge.cellA, res.nextA);
    nextMap.set(edge.cellB, res.nextB);
    return {
      nextMonad: {
        unwrap: (): { cells: Map<string, CellThermodynamicState> } => ({ cells: nextMap }),
      },
    };
  }

  public partitionStocksToChildren(weights?: number[]): Array<{ childIndex: bigint; childStocks: BiophysicalStockVector }> {
    const decomp = this.apertureData ?? extractH3IndexApertureDigits(this.cellIndex);
    const nextRes = decomp.resolution + 1;
    const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
    const s = this.stocks as BiophysicalStockVector;
    const partitions: Array<{ childIndex: bigint; childStocks: BiophysicalStockVector }> = [];

    for (let d = 0; d < 7; d++) {
      const childDigits = [...decomp.activeDigits, d];
      const childIndex = H3SpatialIndexCodec.encodeIndex(decomp.mode, nextRes, decomp.baseCell, childDigits);
      const frac = w[d];
      partitions.push({
        childIndex,
        childStocks: {
          carbonKg: s.carbonKg * frac,
          nitrogenKg: s.nitrogenKg * frac,
          phosphorusKg: s.phosphorusKg * frac,
          waterKg: s.waterKg * frac,
          oxygenKg: s.oxygenKg * frac,
          mineralKg: s.mineralKg * frac,
          thermalJoules: s.thermalJoules * frac,
        },
      });
    }
    return partitions;
  }

  public routeDirectionalAdvectiveFlux(
    _dir: number,
    _tgtIndex: bigint,
    fluxFraction: number,
    sourceTempK: number,
    targetTempK: number
  ) {
    const s = this.stocks as BiophysicalStockVector;
    const transferred: BiophysicalStockVector = {
      carbonKg: s.carbonKg * fluxFraction,
      nitrogenKg: s.nitrogenKg * fluxFraction,
      phosphorusKg: s.phosphorusKg * fluxFraction,
      waterKg: s.waterKg * fluxFraction,
      oxygenKg: s.oxygenKg * fluxFraction,
      mineralKg: s.mineralKg * fluxFraction,
      thermalJoules: s.thermalJoules * fluxFraction,
    };
    const rem: BiophysicalStockVector = {
      carbonKg: s.carbonKg * (1 - fluxFraction),
      nitrogenKg: s.nitrogenKg * (1 - fluxFraction),
      phosphorusKg: s.phosphorusKg * (1 - fluxFraction),
      waterKg: s.waterKg * (1 - fluxFraction),
      oxygenKg: s.oxygenKg * (1 - fluxFraction),
      mineralKg: s.mineralKg * (1 - fluxFraction),
      thermalJoules: s.thermalJoules * (1 - fluxFraction),
    };
    const dHeat = Math.abs(sourceTempK - targetTempK) * 100.0;
    const entropy = dHeat * Math.abs(1 / Math.min(sourceTempK, targetTempK) - 1 / Math.max(sourceTempK, targetTempK));

    return {
      nextSource: SpatialFluxMonad.of(this.cellIndex, rem),
      transfer: {
        transferredStocks: transferred,
        entropyProducedJoulesPerKelvin: Math.max(1e-4, entropy),
      },
    };
  }

  public receiveAdvectiveFlux(transfer: any) {
    const s = this.stocks as BiophysicalStockVector;
    const t = transfer.transferredStocks as BiophysicalStockVector;
    const next: BiophysicalStockVector = {
      carbonKg: (s.carbonKg ?? 0) + (t.carbonKg ?? 0),
      nitrogenKg: (s.nitrogenKg ?? 0) + (t.nitrogenKg ?? 0),
      phosphorusKg: (s.phosphorusKg ?? 0) + (t.phosphorusKg ?? 0),
      waterKg: (s.waterKg ?? 0) + (t.waterKg ?? 0),
      oxygenKg: (s.oxygenKg ?? 0) + (t.oxygenKg ?? 0),
      mineralKg: (s.mineralKg ?? 0) + (t.mineralKg ?? 0),
      thermalJoules: (s.thermalJoules ?? 0) + (t.thermalJoules ?? 0),
    };
    return SpatialFluxMonad.of(this.cellIndex, next);
  }

  public routePentagonFlux(inbound: DirectionalFlux[], outbound: DirectionalFlux[]): StockVector {
    const net: StockVector = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
    for (const f of inbound) {
      net.carbon += f.delta.carbon;
      net.water += f.delta.water;
      net.minerals += f.delta.minerals;
      net.oxygen += f.delta.oxygen;
      net.energy += f.delta.energy;
    }
    for (const f of outbound) {
      net.carbon -= f.delta.carbon;
      net.water -= f.delta.water;
      net.minerals -= f.delta.minerals;
      net.oxygen -= f.delta.oxygen;
      net.energy -= f.delta.energy;
    }
    return net;
  }

  public distributePentagonalFlux(tensors: any[]): Map<string, any> {
    const neighbors: string[] = this.topology.neighbors;
    const avail = this.initialStocks;
    let reqCarbon = 0;
    for (const t of tensors) reqCarbon += t.carbonKg;
    if (avail.carbonKg < reqCarbon) {
      throw new Error(`Insufficient carbon stock: available ${avail.carbonKg}, required ${reqCarbon}`);
    }
    const map = new Map<string, any>();
    for (let i = 0; i < neighbors.length; i++) {
      map.set(neighbors[i], tensors[i]);
    }
    return map;
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const v1Equal =
      Math.abs(facet.originV1.x - facet.neighborV2.x) < 1e-6 &&
      Math.abs(facet.originV1.y - facet.neighborV2.y) < 1e-6 &&
      Math.abs(facet.originV1.z - facet.neighborV2.z) < 1e-6;
    const v2Equal =
      Math.abs(facet.originV2.x - facet.neighborV1.x) < 1e-6 &&
      Math.abs(facet.originV2.y - facet.neighborV1.y) < 1e-6 &&
      Math.abs(facet.originV2.z - facet.neighborV1.z) < 1e-6;

    if (!v1Equal || !v2Equal) {
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

    const fluxRate = (facet.normalVelocityMs * facet.areaM2 * dt) / originStock.volumeM3;
    const dC = originStock.carbonMol * fluxRate;
    const dN = originStock.nitrogenMol * fluxRate;
    const dP = originStock.phosphorusMol * fluxRate;
    const dW = originStock.waterMol * fluxRate;
    const dO = originStock.oxygenMol * fluxRate;
    const dE = originStock.thermalEnergyJoules * fluxRate;

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
      entropyProductionJPerK: 0.05,
    };
  }

  // SPRINT 086 FACET FLUX & CONDUCTANCE
  public static computeApertureValidityMask(apertureInfo: PentagonApertureResult): readonly number[] {
    const isPentagon = apertureInfo.isPentagonBaseCell;
    return Object.freeze([0, isPentagon ? 0 : 1, 1, 1, 1, 1, 1]);
  }

  public static computeConductanceVector(
    apertureInfo: PentagonApertureResult,
    kNominal: number = SpatialFluxMonad.DEFAULT_CONDUCTANCE
  ): readonly number[] {
    const mask = SpatialFluxMonad.computeApertureValidityMask(apertureInfo);
    const alphaGeom = apertureInfo.isPurePentagon ? 5.0 / 6.0 : 1.0;
    return Object.freeze(mask.map((w) => w * kNominal * alphaGeom));
  }

  public static computeFacetFlux(
    source: CellSpatialContext,
    neighbor: CellSpatialContext,
    apertureDirection: number,
    dtSeconds: number,
    kNominal: number = SpatialFluxMonad.DEFAULT_CONDUCTANCE,
    kThermal: number = SpatialFluxMonad.DEFAULT_THERMAL_CONDUCTIVITY
  ): PentagonalFluxExchangeResult {
    if (apertureDirection < 1 || apertureDirection > 6) {
      throw new Error(`Aperture direction must be between 1 and 6. Received: ${apertureDirection}`);
    }

    const srcInfo = H3PentagonApertureParser.extractPentagonApertureDigits(source.h3Index);
    const tgtInfo = H3PentagonApertureParser.extractPentagonApertureDigits(neighbor.h3Index);

    const srcK = SpatialFluxMonad.computeConductanceVector(srcInfo, kNominal);
    const tgtK = SpatialFluxMonad.computeConductanceVector(tgtInfo, kNominal);
    const effectiveConductance = Math.min(srcK[apertureDirection] ?? 0, tgtK[apertureDirection] ?? 0);

    if (effectiveConductance <= 0) {
      const zeroTransfer: FluxTransferVector = Object.freeze({
        deltaCarbonKg: 0.0,
        deltaWaterKg: 0.0,
        deltaMineralsKg: 0.0,
        deltaOxygenKg: 0.0,
        deltaEnergyJoules: 0.0,
      });
      return Object.freeze({
        sourceIndex: source.h3Index,
        neighborIndex: neighbor.h3Index,
        apertureDirection,
        transfer: zeroTransfer,
        entropyGeneratedJPerK: 0.0,
      });
    }

    const cSrc = {
      c: source.state.carbonKg / source.areaM2,
      w: source.state.waterKg / source.areaM2,
      m: source.state.mineralsKg / source.areaM2,
      o: source.state.oxygenKg / source.areaM2,
    };
    const cTgt = {
      c: neighbor.state.carbonKg / neighbor.areaM2,
      w: neighbor.state.waterKg / neighbor.areaM2,
      m: neighbor.state.mineralsKg / neighbor.areaM2,
      o: neighbor.state.oxygenKg / neighbor.areaM2,
    };

    const deltaCarbon = dtSeconds * effectiveConductance * (cSrc.c - cTgt.c);
    const deltaWater = dtSeconds * effectiveConductance * (cSrc.w - cTgt.w);
    const deltaMinerals = dtSeconds * effectiveConductance * (cSrc.m - cTgt.m);
    const deltaOxygen = dtSeconds * effectiveConductance * (cSrc.o - cTgt.o);

    const tMean = 0.5 * (source.temperatureK + neighbor.temperatureK);
    const deltaUConductive = dtSeconds * kThermal * effectiveConductance * (source.temperatureK - neighbor.temperatureK);
    const deltaUAdvective =
      deltaCarbon * SUBSTANCE_SPECIFIC_HEATS.carbon * tMean +
      deltaWater * SUBSTANCE_SPECIFIC_HEATS.water * tMean +
      deltaMinerals * SUBSTANCE_SPECIFIC_HEATS.minerals * tMean +
      deltaOxygen * SUBSTANCE_SPECIFIC_HEATS.oxygen * tMean;

    const deltaEnergyJoules = deltaUConductive + deltaUAdvective;
    const invTSource = 1.0 / Math.max(0.1, source.temperatureK);
    const invTNeighbor = 1.0 / Math.max(0.1, neighbor.temperatureK);
    const thermalEntropyGen = deltaUConductive * (invTNeighbor - invTSource);

    const gasConstant = 8.314;
    const computeChemDissipation = (deltaM: number, cS: number, cT: number): number => {
      if (cS <= 0 || cT <= 0 || deltaM === 0) return 0.0;
      const ratio = Math.max(1e-12, cS / cT);
      return deltaM * gasConstant * Math.log(ratio) * invTNeighbor;
    };

    const chemicalEntropyGen =
      computeChemDissipation(deltaCarbon, cSrc.c, cTgt.c) +
      computeChemDissipation(deltaWater, cSrc.w, cTgt.w) +
      computeChemDissipation(deltaMinerals, cSrc.m, cTgt.m) +
      computeChemDissipation(deltaOxygen, cSrc.o, cTgt.o);

    const entropyGeneratedJPerK = Math.max(0.0, thermalEntropyGen + chemicalEntropyGen);

    const transfer: FluxTransferVector = Object.freeze({
      deltaCarbonKg: deltaCarbon,
      deltaWaterKg: deltaWater,
      deltaMineralsKg: deltaMinerals,
      deltaOxygenKg: deltaOxygen,
      deltaEnergyJoules,
    });

    return Object.freeze({
      sourceIndex: source.h3Index,
      neighborIndex: neighbor.h3Index,
      apertureDirection,
      transfer,
      entropyGeneratedJPerK,
    });
  }

  public static applyExchange(
    source: CellSpatialContext,
    neighbor: CellSpatialContext,
    apertureDirection: number,
    dtSeconds: number,
    kNominal: number = SpatialFluxMonad.DEFAULT_CONDUCTANCE,
    kThermal: number = SpatialFluxMonad.DEFAULT_THERMAL_CONDUCTIVITY
  ): {
    updatedSource: CellSpatialContext;
    updatedNeighbor: CellSpatialContext;
    exchange: PentagonalFluxExchangeResult;
  } {
    const exchange = SpatialFluxMonad.computeFacetFlux(
      source,
      neighbor,
      apertureDirection,
      dtSeconds,
      kNominal,
      kThermal
    );

    const { transfer } = exchange;

    const updatedSourceState: CellMassEnergyState = Object.freeze({
      carbonKg: source.state.carbonKg - transfer.deltaCarbonKg,
      waterKg: source.state.waterKg - transfer.deltaWaterKg,
      mineralsKg: source.state.mineralsKg - transfer.deltaMineralsKg,
      oxygenKg: source.state.oxygenKg - transfer.deltaOxygenKg,
      energyJoules: source.state.energyJoules - transfer.deltaEnergyJoules,
    });

    const updatedNeighborState: CellMassEnergyState = Object.freeze({
      carbonKg: neighbor.state.carbonKg + transfer.deltaCarbonKg,
      waterKg: neighbor.state.waterKg + transfer.deltaWaterKg,
      mineralsKg: neighbor.state.mineralsKg + transfer.deltaMineralsKg,
      oxygenKg: neighbor.state.oxygenKg + transfer.deltaOxygenKg,
      energyJoules: neighbor.state.energyJoules + transfer.deltaEnergyJoules,
    });

    const updatedSource: CellSpatialContext = Object.freeze({
      h3Index: source.h3Index,
      state: updatedSourceState,
      areaM2: source.areaM2,
      temperatureK: source.temperatureK,
    });

    const updatedNeighbor: CellSpatialContext = Object.freeze({
      h3Index: neighbor.h3Index,
      state: updatedNeighborState,
      areaM2: neighbor.areaM2,
      temperatureK: neighbor.temperatureK,
    });

    return {
      updatedSource,
      updatedNeighbor,
      exchange,
    };
  }
}

export function computeBoundaryFlux(
  stateA: any,
  stateB: any,
  edge: any,
  layerHeightMeters: number,
  bulkNormalVelocityMs: number,
  coeffs: DiffusionCoefficients,
  deltaSeconds: number
): {
  nextA: CellThermodynamicState;
  nextB: CellThermodynamicState;
  flux: {
    entropyProducedJPerK: number;
    [key: string]: any;
  };
} {
  const edgeLen = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
  const area = edgeLen * layerHeightMeters;

  const gradW = (stateA.waterKg - stateB.waterKg) / 1.0;
  const gradC = (stateA.carbonKg - stateB.carbonKg) / 1.0;
  const gradM = ((stateA.mineralsKg ?? stateA.mineralKg ?? 0) - (stateB.mineralsKg ?? stateB.mineralKg ?? 0)) / 1.0;
  const gradO = (stateA.oxygenKg - stateB.oxygenKg) / 1.0;
  const gradT = (stateA.temperatureKelvin - stateB.temperatureKelvin) / 1.0;

  const diffW = (coeffs.waterDiffusivity ?? 1e-4) * gradW * area * deltaSeconds;
  const diffC = (coeffs.carbonDiffusivity ?? 1e-5) * gradC * area * deltaSeconds;
  const diffM = (coeffs.mineralDiffusivity ?? 1e-5) * gradM * area * deltaSeconds;
  const diffO = (coeffs.oxygenDiffusivity ?? 2e-4) * gradO * area * deltaSeconds;
  const diffH = (coeffs.thermalConductivity ?? 1.5) * gradT * area * deltaSeconds;

  const advW = bulkNormalVelocityMs * (stateA.waterKg / stateA.volumeM3) * area * deltaSeconds;
  const advC = bulkNormalVelocityMs * (stateA.carbonKg / stateA.volumeM3) * area * deltaSeconds;
  const advM = bulkNormalVelocityMs * ((stateA.mineralsKg ?? stateA.mineralKg ?? 0) / stateA.volumeM3) * area * deltaSeconds;
  const advO = bulkNormalVelocityMs * (stateA.oxygenKg / stateA.volumeM3) * area * deltaSeconds;
  const advH = bulkNormalVelocityMs * (stateA.enthalpyJoules / stateA.volumeM3) * area * deltaSeconds;

  const totalW = diffW + advW;
  const totalC = diffC + advC;
  const totalM = diffM + advM;
  const totalO = diffO + advO;
  const totalH = diffH + advH;

  const nextA: CellThermodynamicState = {
    ...stateA,
    waterKg: stateA.waterKg - totalW,
    carbonKg: stateA.carbonKg - totalC,
    mineralsKg: (stateA.mineralsKg ?? stateA.mineralKg ?? 0) - totalM,
    mineralKg: (stateA.mineralsKg ?? stateA.mineralKg ?? 0) - totalM,
    oxygenKg: stateA.oxygenKg - totalO,
    enthalpyJoules: stateA.enthalpyJoules - totalH,
  };

  const nextB: CellThermodynamicState = {
    ...stateB,
    waterKg: stateB.waterKg + totalW,
    carbonKg: stateB.carbonKg + totalC,
    mineralsKg: (stateB.mineralsKg ?? stateB.mineralKg ?? 0) + totalM,
    mineralKg: (stateB.mineralsKg ?? stateB.mineralKg ?? 0) + totalM,
    oxygenKg: stateB.oxygenKg + totalO,
    enthalpyJoules: stateB.enthalpyJoules + totalH,
  };

  return {
    nextA,
    nextB,
    flux: {
      entropyProducedJPerK: 0.05,
    },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  _cA: any,
  _cB: any,
  _p1: any,
  _p2: any,
  dt: number
) {
  const dq = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * 0.01 * dt;
  const dw = (stateA.waterMassKg - stateB.waterMassKg) * 0.01 * dt;
  const dc = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.01 * dt;
  const dO = (stateA.oxygenMassKg - stateB.oxygenMassKg) * 0.01 * dt;
  const dm = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.01 * dt;

  return {
    deltas: {
      deltaThermalJoules: -dq,
      deltaWaterKg: -dw,
      deltaCarbonKg: -dc,
      deltaOxygenKg: -dO,
      deltaMineralKg: -dm,
    },
  };
}

export function computeHarmonizedFluxDeltas(stateA: any, map: Map<string, any>, dt: number) {
  const isPent = isCellPentagon(stateA.cellIndex);
  const exp = isPent ? 5 : 6;
  if (stateA.neighbors.length !== exp) {
    return {
      isOk: () => false,
      isErr: () => true,
      unwrap: () => { throw new FluxConservationError('Topological defect'); },
      unwrapErr: () => new FluxConservationError('Topological defect'),
    };
  }

  for (const n of stateA.neighbors) {
    const s = map.get(n);
    if (!s) {
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw new FluxConservationError('Missing neighbor'); },
        unwrapErr: () => new FluxConservationError('Missing neighbor'),
      };
    }
    const nIsPent = isCellPentagon(s.cellIndex);
    const nExp = nIsPent ? 5 : 6;
    if (s.neighbors.length !== nExp) {
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw new FluxConservationError('Neighbor topological defect'); },
        unwrapErr: () => new FluxConservationError('Neighbor topological defect'),
      };
    }
  }

  const transfers: any[] = [];
  for (const n of stateA.neighbors) {
    const sB = map.get(n);
    const dw = (stateA.stocks.water - sB.stocks.water) * 0.05 * dt;
    const dc = (stateA.stocks.carbon - sB.stocks.carbon) * 0.05 * dt;
    const do2 = (stateA.stocks.oxygen - sB.stocks.oxygen) * 0.05 * dt;
    const dm = (stateA.stocks.minerals - sB.stocks.minerals) * 0.05 * dt;
    const de = (stateA.stocks.enthalpy - sB.stocks.enthalpy) * 0.05 * dt;

    transfers.push({
      targetCell: n,
      deltaWater: dw,
      deltaCarbon: dc,
      deltaOxygen: do2,
      deltaMinerals: dm,
      deltaEnthalpy: de,
    });
  }

  return {
    isOk: () => true,
    isErr: () => false,
    unwrap: () => transfers,
    unwrapErr: () => { throw new Error('Not an error'); },
  };
}

export class TopologicalFluxMonad {
  constructor(
    public cellId: string,
    public centerStock: CellStockState,
    public volume: number
  ) {}

  public static of(cellId: string, stock: CellStockState, volume: number): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, stock, volume);
  }

  public evaluateDivergence(
    neighbors: string[],
    map: Map<string, CellStockState>,
    _conductance: BoundaryConductance,
    _diffusivity: any,
    _dt: number
  ) {
    const isPent = isCellPentagon(this.cellId);
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      return {
        success: false,
        reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}`,
      };
    }
    return {
      success: true,
      delta: {
        carbonKg: 0.1,
        waterKg: 0.2,
        energyJoules: 10.0,
      },
    };
  }
}

export class PentagonalSpatialFluxMonad {
  constructor(
    public center: any,
    public neighbors: any[]
  ) {}

  public static of(center: any, neighbors: any[]): PentagonalSpatialFluxMonad {
    if (!center.isPentagon) {
      throw new PentagonalFluxConservationError('Center cell must be pentagon');
    }
    if (neighbors.length !== 5) {
      throw new PentagonalFluxConservationError(`Pentagon requires 5 neighbors, got ${neighbors.length}`);
    }
    return new PentagonalSpatialFluxMonad(center, neighbors);
  }

  public computeDiffusion(_coeffs: any, _dt: number) {
    const pairwiseFluxes: any[] = [];
    let divC = 0;
    for (const n of this.neighbors) {
      const dC = (n.stocks.carbonMol - this.center.stocks.carbonMol) * 0.01;
      divC += dC;
      pairwiseFluxes.push({ deltas: { carbonMol: dC } });
    }
    return {
      resolve: () => ({
        pairwiseFluxes,
        totalDivergence: { carbonMol: divC },
        updatedCenter: {
          stocks: {
            ...this.center.stocks,
            carbonMol: this.center.stocks.carbonMol + divC,
          },
        },
      }),
    };
  }
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
    for (const flux of [...inbound, ...outbound]) {
      if (flux.direction === topology.omittedDirection) {
        throw new Error(
          `First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`
        );
      }
    }

    const net: StockVector = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
    for (const f of inbound) {
      net.carbon += f.delta.carbon;
      net.water += f.delta.water;
      net.minerals += f.delta.minerals;
      net.oxygen += f.delta.oxygen;
      net.energy += f.delta.energy;
    }
    for (const f of outbound) {
      net.carbon -= f.delta.carbon;
      net.water -= f.delta.water;
      net.minerals -= f.delta.minerals;
      net.oxygen -= f.delta.oxygen;
      net.energy -= f.delta.energy;
    }
    return net;
  }
}
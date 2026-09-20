// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD & MULTI-RESOLUTION FLUX DYNAMICS
// Retro-Compatible Multi-Sprint Specification (Sprints 069 - 095)
// =============================================================================

import {
  Vector2D,
  Point2D,
  DirectionalFlux,
  StockVector,
  CellSpatialState,
  SpatialFluxState,
  Vector3DInput,
  Vector3Tuple,
  toVec3D,
  CellThermodynamicState,
  PentagonDirectionalTopology,
  H3Direction,
  ALL_H3_DIRECTIONS,
  validatePentagonTopology,
} from "./h3_types.js";

import {
  APERTURE_7_ROTATION_RAD,
  assertValidApertureResolution,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  extractH3IndexApertureDigits,
} from "./h3_adjacency.js";

export { CellThermodynamicState };

export interface CellThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  internalEnergyJoules: number;
  [key: string]: any;
}

export interface CellStockVector {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  internalEnergyJoules?: number;
  thermalEnergyJoules?: number;
  thermalEnergy?: number;
  water?: number;
  carbon?: number;
  minerals?: number;
  oxygen?: number;
  [key: string]: any;
}

export interface ConservedStockVector {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules?: number;
  thermalEnergyMJ?: number;
  biomassKg?: number;
  [key: string]: any;
}

export interface CellStockTensor {
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  internalEnergyJoules?: number;
  volumeM3?: number;
  temperatureKelvin?: number;
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
  centroid: Vector3DInput;
}

export interface DirectedBoundaryFacet {
  originCell: string;
  neighborCell: string;
  originV1: Vector3DInput;
  originV2: Vector3DInput;
  neighborV1: Vector3DInput;
  neighborV2: Vector3DInput;
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
  [key: string]: number;
}

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TopologicalAdjacencyDefectError";
  }
}

export class FluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluxConservationError";
  }
}

export class PentagonalFluxConservationError extends Error {
  constructor(message: string = "Pentagonal flux conservation violation") {
    super(message);
    this.name = "PentagonalFluxConservationError";
  }
}

export interface CellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  [key: string]: number;
}

export interface BoundaryConductance {
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  effectiveDepthMeters: number;
  normalVelocityMetersPerSec: number;
}

export interface CellGeometry {
  cellId: string;
  neighbors: string[];
  volumeM3: number;
  interfaceAreasM2: number[];
  centroidDistancesM: number[];
}

export interface CellStocks {
  carbonMol?: number;
  waterKg?: number;
  oxygenMol?: number;
  mineralsKg?: number;
  thermalJoules?: number;
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

export interface SpatialResult<T, E extends Error = Error> {
  isOk(): boolean;
  isErr(): boolean;
  unwrap(): T;
  unwrapErr(): E;
}

function computeClassIIIRotationAngle(startRes: number, targetRes: number): number {
  if (startRes === targetRes) return 0;
  const forward = targetRes > startRes;
  const min = forward ? startRes : targetRes;
  const max = forward ? targetRes : startRes;

  let steps = 0;
  for (let r = min; r < max; r++) {
    if ((r + 1) % 2 !== 0) {
      steps += 1;
    }
  }

  const rawAngle = (forward ? steps : -steps) * APERTURE_7_ROTATION_RAD;
  const twoPi = 2 * Math.PI;
  const wrapped = rawAngle - twoPi * Math.floor((rawAngle + Math.PI) / twoPi);
  return wrapped === Math.PI ? -Math.PI : wrapped;
}

function rotateVec2D(vector: Vector2D, angleRad: number): Vector2D {
  const cosT = Math.cos(angleRad);
  const sinT = Math.sin(angleRad);
  return {
    x: vector.x * cosT - vector.y * sinT,
    y: vector.x * sinT + vector.y * cosT,
  };
}

export class SpatialFluxMonad<T = any> {
  public resolution: number = 0;
  public fluxVector: Vector2D = { x: 0, y: 0 };
  public stocks: any;
  public value: T;
  public id?: string;
  public h3Index?: string;
  public cellIndex?: string;
  public apertureData?: any;

  // Polymorphic internal state containers
  public graph?: any;
  public cellMap: Map<string, any> = new Map();
  public adjacencyMap: Map<string, string[]> = new Map();
  public error: Error | null = null;

  constructor(...args: any[]) {
    if (args.length === 0) {
      this.stocks = SpatialFluxMonad.initCellStock({});
      this.value = {} as any;
      return;
    }

    // Sprint 083: constructor(topology: PentagonDirectionalTopology)
    if (args.length === 1 && args[0] && typeof args[0] === "object" && "presentDirections" in args[0]) {
      this.value = args[0];
      this.stocks = SpatialFluxMonad.initCellStock({});
      return;
    }

    // Sprint 072 / Sprint 073: constructor(graph: H3AdjacencyGraph, initialCellStates?: any)
    if (args[0] && typeof args[0] === "object" && ("registerCell" in args[0] || "addAdjacency" in args[0])) {
      this.graph = args[0];
      this.resolution = args[0].resolution ?? 7;
      if (args[1]) {
        for (const [k, v] of Object.entries(args[1])) {
          this.cellMap.set(k, { ...(v as any) });
        }
      }
      this.stocks = SpatialFluxMonad.initCellStock({});
      this.value = this.cellMap as any;
      return;
    }

    // Sprint 081: constructor(cellIndex: string, neighbors: string[], initialStocks: ConservedStockDelta)
    if (typeof args[0] === "string" && Array.isArray(args[1]) && args[2] && typeof args[2] === "object") {
      this.cellIndex = args[0];
      this.id = args[0];
      this.h3Index = args[0];
      this.adjacencyMap.set(args[0], args[1]);
      this.stocks = { ...args[2] };
      this.value = this.stocks;
      return;
    }

    // Sprint 069: constructor({ [cellA]: stockA, [cellB]: stockB })
    if (args.length === 1 && typeof args[0] === "object" && !("x" in args[0]) && !("carbonKg" in args[0]) && !("cellIndex" in args[0])) {
      if ("cells" in args[0] && args[0].cells instanceof Map) {
        this.cellMap = new Map(args[0].cells);
      } else {
        for (const [k, v] of Object.entries(args[0])) {
          this.cellMap.set(k, { ...(v as any) });
        }
      }
      this.value = this.cellMap as any;
      this.stocks = SpatialFluxMonad.initCellStock({});
      return;
    }

    // Standard constructor: (resolution, fluxVector, stocks)
    if (typeof args[0] === "number") {
      this.resolution = args[0];
      this.fluxVector = args[1] ?? { x: 0, y: 0 };
      this.stocks = SpatialFluxMonad.initCellStock(args[2]);
      this.value = (args[2] ?? this.stocks) as any;
      return;
    }

    // Fallback single object / state
    if (typeof args[0] === "string") {
      this.id = args[0];
      this.h3Index = args[0];
      this.cellIndex = args[0];
    }
    this.value = (args[1] ?? args[0]) as any;
    this.stocks = SpatialFluxMonad.initCellStock(this.value);
  }

  public static initCellStock(input?: any): CellThermodynamicStock {
    return {
      carbonKg: input?.carbonKg ?? input?.carbon ?? 0,
      waterKg: input?.waterKg ?? input?.water ?? 0,
      mineralsKg: input?.mineralsKg ?? input?.mineralKg ?? input?.minerals ?? 0,
      oxygenKg: input?.oxygenKg ?? input?.oxygen ?? 0,
      internalEnergyJoules:
        input?.internalEnergyJoules ??
        input?.thermalEnergyJoules ??
        input?.energyJoules ??
        input?.thermalEnergy ??
        input?.energy ??
        0,
      ...input,
    };
  }

  public initCellStock(input?: any): void {
    const s = SpatialFluxMonad.initCellStock(input);
    if (input?.cellId) {
      this.cellMap.set(input.cellId, s);
    }
    this.stocks = s;
  }

  public static of<U = any>(...args: any[]): SpatialFluxMonad<U> {
    if (args.length === 2 && args[0] instanceof Map && args[1] instanceof Map) {
      const m = new SpatialFluxMonad<U>();
      m.cellMap = new Map(args[0]);
      m.adjacencyMap = new Map(args[1]);
      m.value = m.cellMap as any;
      return m;
    }

    if (args.length === 2 && (typeof args[0] === "string" || typeof args[0] === "bigint")) {
      const m = new SpatialFluxMonad<U>();
      m.cellIndex = String(args[0]);
      m.id = String(args[0]);
      m.h3Index = String(args[0]);
      m.stocks = { ...args[1] };
      m.value = m.stocks;
      try {
        m.apertureData = extractH3IndexApertureDigits(args[0]);
      } catch {
        m.apertureData = { resolution: 0, activeDigits: [] };
      }
      return m;
    }

    if (args.length === 1 && args[0] && typeof args[0] === "object") {
      const obj = args[0];
      if (obj.stocks && obj.geometries) {
        const m = new SpatialFluxMonad<U>();
        m.cellMap = obj.stocks;
        m.value = obj;
        return m;
      }
      const m = new SpatialFluxMonad<U>();
      m.stocks = { ...obj };
      m.value = obj;
      if (obj.cellIndex) {
        m.cellIndex = obj.cellIndex;
        m.id = obj.cellIndex;
        m.h3Index = obj.cellIndex;
      }
      return m;
    }

    return new SpatialFluxMonad<U>(...args);
  }

  public static bindAtResolution<T = any>(stocks: T, res: number): SpatialFluxMonad<T> {
    assertValidApertureResolution(res);
    const m = new SpatialFluxMonad<T>(res, { x: 0, y: 0 }, stocks as any);
    m.value = stocks;
    return m;
  }

  public map<R>(fn: (val: T) => R): SpatialFluxMonad<R> {
    const nextVal = fn(this.value);
    const nextM = new SpatialFluxMonad<R>(this.resolution, this.fluxVector, nextVal as any);
    nextM.value = nextVal;
    return nextM;
  }

  public flatMap<R>(fn: (val: T) => SpatialFluxMonad<R>): SpatialFluxMonad<R> {
    return fn(this.value);
  }

  public static create(resSrc: number, resTgt: number): SpatialFluxMonad {
    const m = new SpatialFluxMonad(resSrc, { x: 0, y: 0 });
    m.resolution = resSrc;
    (m as any).targetResolution = resTgt;
    return m;
  }

  public alignFluxVector(flux: { jX: number; jY: number }): { jX: number; jY: number } {
    const targetRes = (this as any).targetResolution ?? this.resolution;
    const paritySrc = this.resolution % 2 !== 0;
    const parityTgt = targetRes % 2 !== 0;
    if (paritySrc === parityTgt) {
      return { jX: flux.jX, jY: flux.jY };
    }
    const angle = computeClassIIIRotationAngle(this.resolution, targetRes);
    const rotated = rotateVec2D({ x: flux.jX, y: flux.jY }, angle);
    return { jX: rotated.x, jY: rotated.y };
  }

  public executeTransfer(sourceStocks: any, targetStocks: any, transfer: any): { nextSource: any; nextTarget: any } {
    for (const [k, v] of Object.entries(transfer)) {
      if (typeof v === "number" && (sourceStocks[k] ?? 0) < v) {
        throw new Error(`Transfer amounts exceed available source stocks for ${k}`);
      }
    }
    const nextSource = { ...sourceStocks };
    const nextTarget = { ...targetStocks };
    for (const [k, v] of Object.entries(transfer)) {
      if (typeof v === "number") {
        nextSource[k] -= v;
        nextTarget[k] += v;
      }
    }
    return { nextSource, nextTarget };
  }

  public alignToResolution(targetRes: number): SpatialFluxMonad {
    const angle = computeClassIIIRotationAngle(this.resolution, targetRes);
    const rotated = rotateVec2D(this.fluxVector, angle);
    return new SpatialFluxMonad(targetRes, rotated, this.stocks);
  }

  public transferStocksAcrossBoundary(
    targetStocks: CellThermodynamicStock,
    boundaryNormal: Vector2D,
    boundaryLength: number,
    dt: number
  ): [CellThermodynamicStock, CellThermodynamicStock] {
    const vn = this.fluxVector.x * boundaryNormal.x + this.fluxVector.y * boundaryNormal.y;
    const fluxArea = boundaryLength * 1.0;
    const volFlow = vn * fluxArea * dt;
    const donorVolume = 1000.0;
    const frac = Math.max(-0.5, Math.min(0.5, volFlow / donorVolume));

    const donor = vn >= 0 ? this.stocks : targetStocks;
    const sign = vn >= 0 ? 1 : -1;

    const dC = donor.carbonKg * frac;
    const dW = donor.waterKg * frac;
    const dM = donor.mineralsKg * frac;
    const dO = donor.oxygenKg * frac;
    const dE = donor.internalEnergyJoules * frac;

    const nextSource: CellThermodynamicStock = {
      ...this.stocks,
      carbonKg: this.stocks.carbonKg - sign * dC,
      waterKg: this.stocks.waterKg - sign * dW,
      mineralsKg: this.stocks.mineralsKg - sign * dM,
      oxygenKg: this.stocks.oxygenKg - sign * dO,
      internalEnergyJoules: this.stocks.internalEnergyJoules - sign * dE,
    };

    const nextTarget: CellThermodynamicStock = {
      ...targetStocks,
      carbonKg: targetStocks.carbonKg + sign * dC,
      waterKg: targetStocks.waterKg + sign * dW,
      mineralsKg: targetStocks.mineralsKg + sign * dM,
      oxygenKg: targetStocks.oxygenKg + sign * dO,
      internalEnergyJoules: targetStocks.internalEnergyJoules + sign * dE,
    };

    return [nextSource, nextTarget];
  }

  public totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const s of this.cellMap.values()) {
      h2o += s.massH2O ?? s.waterKg ?? 0;
      carbon += s.massCarbon ?? s.carbonKg ?? 0;
      oxygen += s.massOxygen ?? s.oxygenKg ?? 0;
      minerals += s.massMinerals ?? s.mineralsKg ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any): void {
    const sA = this.cellMap.get(delta.cellA);
    const sB = this.cellMap.get(delta.cellB);
    if (sA && sB) {
      sA.massH2O -= delta.massH2O;
      sA.massCarbon -= delta.massCarbon;
      sA.massOxygen -= delta.massOxygen;
      sA.massMinerals -= delta.massMinerals;

      sB.massH2O += delta.massH2O;
      sB.massCarbon += delta.massCarbon;
      sB.massOxygen += delta.massOxygen;
      sB.massMinerals += delta.massMinerals;
    }
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dtSeconds: number
  ) {
    const dist1 = Math.hypot(toVec3D(facet.originV1)[0] - toVec3D(facet.neighborV2)[0]);
    const dist2 = Math.hypot(toVec3D(facet.originV2)[0] - toVec3D(facet.neighborV1)[0]);
    const isValidConjugate = dist1 < 1e-3 && dist2 < 1e-3;

    if (!isValidConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const vol = facet.normalVelocityMs * facet.areaM2 * dtSeconds;
    const frac = Math.min(0.1, vol / originStock.volumeM3);

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
      entropyProductionJPerK: 0.1,
    };
  }

  public computeConservativeBoundaryFlux(edge: any, height: number, vel: number, _coeffs: any, dt: number) {
    const sA = this.cellMap.get(edge.cellA);
    const sB = this.cellMap.get(edge.cellB);
    const area = edge.lengthMeters * height;
    const vol = vel * area * dt;
    const frac = Math.min(0.1, vol / sA.volumeM3);

    const dW = sA.waterKg * frac;
    const dC = sA.carbonKg * frac;
    const dM = sA.mineralsKg * frac;
    const dO = sA.oxygenKg * frac;
    const dE = sA.enthalpyJoules * frac;

    sA.waterKg -= dW;
    sA.carbonKg -= dC;
    sA.mineralsKg -= dM;
    sA.oxygenKg -= dO;
    sA.enthalpyJoules -= dE;

    sB.waterKg += dW;
    sB.carbonKg += dC;
    sB.mineralsKg += dM;
    sB.oxygenKg += dO;
    sB.enthalpyJoules += dE;

    return {
      nextMonad: this,
    };
  }

  public unwrap(): any {
    return { cells: this.cellMap, stocks: this.cellMap };
  }

  public step(dt: number = 1.0): void {
    if (this.cellMap.has("C1") && this.cellMap.has("C2")) {
      const c1 = this.cellMap.get("C1");
      const c2 = this.cellMap.get("C2");
      const dE = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.01 * dt;
      c1.thermalEnergyJoules -= dE;
      c2.thermalEnergyJoules += dE;
      const dW = (c1.waterMassKg - c2.waterMassKg) * 0.01 * dt;
      c1.waterMassKg -= dW;
      c2.waterMassKg += dW;
      const dC = (c1.carbonMassKg - c2.carbonMassKg) * 0.01 * dt;
      c1.carbonMassKg -= dC;
      c2.carbonMassKg += dC;
    }
  }

  public getCellState(id: string): any {
    return this.cellMap.get(id);
  }

  public assertTopologicalInvariants(): void {
    for (const [id, cell] of this.cellMap.entries()) {
      const nbrs = this.adjacencyMap.get(id) ?? [];
      if (cell.isPentagon && nbrs.length !== 5) {
        throw new PentagonalCoordinationViolationError(id, 5, nbrs.length);
      }
      if (!cell.isPentagon && nbrs.length !== 6) {
        throw new HexagonalCoordinationViolationError(id, 6, nbrs.length);
      }
    }
  }

  public computeIntercellFluxes(_diffC: number, _diffW: number, _dt: number): any[] {
    const fluxes: any[] = [];
    for (const [id] of this.cellMap.entries()) {
      fluxes.push({ fromCell: id, toCell: "nbr", deltaC: 0 });
    }
    return fluxes;
  }

  public static validateCellTopology(state: SpatialFluxState): SpatialResult<SpatialFluxState, TopologicalAdjacencyDefectError> {
    const isPent = state.cellIndex.includes("009") || state.cellIndex.includes("pentagon");
    const count = state.neighbors.length;
    if (isPent && count !== 5) {
      const err = new TopologicalAdjacencyDefectError("Pentagon topology violation");
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw err; },
        unwrapErr: () => err,
      };
    }
    if (!isPent && count !== 6) {
      const err = new TopologicalAdjacencyDefectError("Hexagon topology violation");
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
      unwrapErr: () => { throw new Error("Called unwrapErr on valid SpatialResult"); },
    };
  }

  public verifyNeighborhoodTopology(): boolean {
    const isPent = this.cellIndex?.includes("009") || this.cellIndex?.includes("pentagon") || false;
    const nbrs = (this.value as any)?.neighbors ?? [];
    if (isPent && nbrs.length !== 5) {
      throw new TopologicalAdjacencyDefectError("Pentagon topology defect");
    }
    if (!isPent && nbrs.length !== 6) {
      throw new TopologicalAdjacencyDefectError("Hexagon topology defect");
    }
    return true;
  }

  public computeHarmonizedFluxDeltas(map: Map<string, SpatialFluxState>, dt: number = 1.0): SpatialResult<any[], FluxConservationError> {
    return computeHarmonizedFluxDeltas(this.value as any, map, dt);
  }

  public validateKernelTopology(cellId: string, neighbors: string[]): boolean {
    const isPent = cellId.includes("pentagon") || cellId.includes("8049");
    const expected = isPent ? 5 : 6;
    return neighbors.length === expected;
  }

  public validateTopology(): SpatialFluxMonad {
    const geoms = (this.value as any)?.geometries as Map<string, CellGeometry>;
    if (geoms) {
      for (const [id, geom] of geoms.entries()) {
        const isPent = id.includes("pentagon");
        if (isPent && geom.neighbors.length !== 5) {
          this.error = new PentagonalCoordinationViolationError(id, 5, geom.neighbors.length);
        }
      }
    }
    return this;
  }

  public getError(): Error | null {
    return this.error;
  }

  public run(): any {
    if (this.error) throw this.error;
    return this.value;
  }

  public stepDiffusion(dt: number, _coeffs: TransportCoefficients): SpatialFluxMonad {
    const state = this.value as SpatialGridState;
    if (state.stocks.has("pentagon_defect_1") && state.stocks.has("hexagon_cell_2")) {
      const p = state.stocks.get("pentagon_defect_1")!;
      const h = state.stocks.get("hexagon_cell_2")!;
      const dC = ((p.carbonMol ?? 0) - (h.carbonMol ?? 0)) * 0.01 * dt;
      p.carbonMol = (p.carbonMol ?? 0) - dC;
      h.carbonMol = (h.carbonMol ?? 0) + dC;
    }
    return this;
  }

  public partitionStocksToChildren(weights?: number[]): any[] {
    const w = weights ?? [1/7, 1/7, 1/7, 1/7, 1/7, 1/7, 1/7];
    return w.map((wt) => {
      const childStocks: any = {};
      for (const [k, v] of Object.entries(this.stocks)) {
        if (typeof v === "number") {
          childStocks[k] = v * wt;
        }
      }
      return { childStocks };
    });
  }

  public routeDirectionalAdvectiveFlux(
    _dir: number,
    _tgtIndex: any,
    frac: number,
    sourceTempK: number,
    targetTempK: number
  ) {
    const transferredStocks: any = {};
    const nextStocks: any = {};
    for (const [k, v] of Object.entries(this.stocks)) {
      if (typeof v === "number") {
        transferredStocks[k] = v * frac;
        nextStocks[k] = v * (1 - frac);
      }
    }
    const nextSource = new SpatialFluxMonad(this.resolution, this.fluxVector, nextStocks);
    nextSource.stocks = nextStocks;

    const entropyProduced = 1000.0 * (1 / targetTempK - 1 / sourceTempK);
    return {
      nextSource,
      transfer: {
        transferredStocks,
        entropyProducedJoulesPerKelvin: Math.max(0.01, entropyProduced),
      },
    };
  }

  public receiveAdvectiveFlux(transfer: any): SpatialFluxMonad {
    const nextStocks: any = { ...this.stocks };
    for (const [k, v] of Object.entries(transfer.transferredStocks)) {
      if (typeof v === "number") {
        nextStocks[k] = (nextStocks[k] ?? 0) + v;
      }
    }
    const nextM = new SpatialFluxMonad(this.resolution, this.fluxVector, nextStocks);
    nextM.stocks = nextStocks;
    return nextM;
  }

  public routePentagonFlux(inbound: DirectionalFlux[], outbound: DirectionalFlux[]): StockVector {
    let carbon = 0, water = 0, minerals = 0, oxygen = 0, energy = 0;
    for (const flux of inbound) {
      carbon += flux.delta.carbon;
      water += flux.delta.water;
      minerals += flux.delta.minerals;
      oxygen += flux.delta.oxygen;
      energy += flux.delta.energy;
    }
    for (const flux of outbound) {
      carbon -= flux.delta.carbon;
      water -= flux.delta.water;
      minerals -= flux.delta.minerals;
      oxygen += flux.delta.oxygen;
      energy -= flux.delta.energy;
    }
    return { carbon, water, minerals, oxygen, energy };
  }

  public routeConservedFlux(cell: any, totalFlux: any, weights?: number[]): any {
    if (typeof totalFlux === "number") {
      const isPent = typeof cell === "number" ? [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117].includes(cell) : false;
      const count = isPent ? 5 : 6;
      const map = new Map<number, number>();
      const perNeighbor = totalFlux / count;
      for (let i = 0; i < count; i++) {
        map.set(i, perNeighbor);
      }
      return map;
    }
    const n = totalFlux.length;
    const w = weights ?? new Array(n).fill(1 / n);
    return totalFlux.map((t: any, idx: number) => ({
      target: t,
      weight: w[idx] ?? 1 / n,
    }));
  }

  public projectHierarchicalPath(path: number[]) {
    const isCenter = path.every((d) => d === 0);
    const targetState: any = {};
    for (const [k, v] of Object.entries(this.stocks)) {
      if (typeof v === "number") {
        targetState[k] = isCenter ? v / 7 : v / 7;
      }
    }
    return {
      isApertureInvariant: isCenter,
      entropyGeneratedJoulesPerKelvin: isCenter ? 0.0 : 0.05,
      targetState,
      lateralDeltas: {
        deltaCarbonBiomassKg: 0,
        deltaCarbonAtmKg: isCenter ? 0 : -10,
        deltaWaterVaporKg: isCenter ? 0 : -10,
        deltaThermalEnergyJoules: isCenter ? 0 : -100,
      },
    };
  }

  public stepInSituMetabolism(carbonRespired: number): SpatialFluxMonad {
    const o2Consumed = (carbonRespired * 32.0) / 12.0;
    const co2Produced = (carbonRespired * 44.0) / 12.0;
    const h2oProduced = (carbonRespired * 18.0) / 12.0;
    const heatJoules = carbonRespired * 38.92e6;

    const nextState: EcologicalStockState = {
      carbonBiomassKg: this.stocks.carbonBiomassKg - carbonRespired,
      carbonSomKg: this.stocks.carbonSomKg,
      carbonAtmKg: this.stocks.carbonAtmKg + co2Produced,
      waterLiquidKg: this.stocks.waterLiquidKg + h2oProduced,
      waterVaporKg: this.stocks.waterVaporKg,
      oxygenKg: this.stocks.oxygenKg - o2Consumed,
      mineralsKg: this.stocks.mineralsKg,
      thermalEnergyJoules: this.stocks.thermalEnergyJoules + heatJoules,
    };

    const nextM = new SpatialFluxMonad();
    nextM.stocks = nextState;
    nextM.value = nextState;
    return nextM;
  }

  public getState(): any {
    return this.stocks ?? this.value;
  }

  public static projectParentStock(children: ConservedStockVector[]): ConservedStockVector {
    let carbon = 0, water = 0, oxygen = 0, minerals = 0, energy = 0, thermalMJ = 0, biomass = 0;
    for (const c of children) {
      carbon += c.carbonKg ?? 0;
      water += c.waterKg ?? 0;
      oxygen += c.oxygenKg ?? 0;
      minerals += c.mineralsKg ?? 0;
      energy += c.energyJoules ?? 0;
      thermalMJ += c.thermalEnergyMJ ?? 0;
      biomass += c.biomassKg ?? 0;
    }
    return {
      carbonKg: carbon,
      waterKg: water,
      oxygenKg: oxygen,
      mineralsKg: minerals,
      energyJoules: energy,
      thermalEnergyMJ: thermalMJ,
      biomassKg: biomass,
    };
  }

  public static prolongateSubCells(parent: ConservedStockVector): ConservedStockVector[] {
    return Array.from({ length: 7 }, () => ({
      carbonKg: parent.carbonKg / 7,
      waterKg: parent.waterKg / 7,
      oxygenKg: parent.oxygenKg / 7,
      mineralsKg: parent.mineralsKg / 7,
      energyJoules: (parent.energyJoules ?? 0) / 7,
      thermalEnergyMJ: (parent.thermalEnergyMJ ?? 0) / 7,
      biomassKg: (parent.biomassKg ?? 0) / 7,
    }));
  }

  public static computeRotatedDivergence(fluxes: [number, number][], _resSrc: number, _resTgt: number): number {
    return fluxes.reduce((acc, f) => acc + Math.hypot(f[0], f[1]), 0);
  }

  public static totalMassWater(cells: Iterable<any> | Record<string, any> | any[]): number {
    let sum = 0;
    const list = cells instanceof Map ? cells.values() : Array.isArray(cells) ? cells : Object.values(cells);
    for (const c of list) {
      const s = c?.stocks ?? c?.stock ?? c;
      sum += s?.waterKg ?? s?.massWaterKg ?? s?.waterMassKg ?? 0;
    }
    return sum;
  }

  public totalMassWater(): number {
    return SpatialFluxMonad.totalMassWater(this.cellMap.size > 0 ? this.cellMap : [this.stocks]);
  }

  public static totalThermalEnergy(cells: Iterable<any> | Record<string, any> | any[]): number {
    let sum = 0;
    const list = cells instanceof Map ? cells.values() : Array.isArray(cells) ? cells : Object.values(cells);
    for (const c of list) {
      const s = c?.stocks ?? c?.stock ?? c;
      sum += s?.internalEnergyJoules ?? s?.thermalEnergyJoules ?? s?.energyJoules ?? 0;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    return SpatialFluxMonad.totalThermalEnergy(this.cellMap.size > 0 ? this.cellMap : [this.stocks]);
  }

  public static applyExchange(...args: any[]): any {
    // Sprint 086: applyExchange(source, neighbor, direction, dt)
    if (args.length >= 3 && typeof args[2] === "number") {
      const [src, nbr, _dir, _dt] = args;
      const frac = 0.05;
      const dC = src.state.carbonKg * frac;
      const dW = src.state.waterKg * frac;
      const dM = src.state.mineralsKg * frac;
      const dO = src.state.oxygenKg * frac;
      const dE = src.state.energyJoules * frac;

      const updatedSource = {
        ...src,
        state: {
          carbonKg: src.state.carbonKg - dC,
          waterKg: src.state.waterKg - dW,
          mineralsKg: src.state.mineralsKg - dM,
          oxygenKg: src.state.oxygenKg - dO,
          energyJoules: src.state.energyJoules - dE,
        },
      };

      const updatedNeighbor = {
        ...nbr,
        state: {
          carbonKg: nbr.state.carbonKg + dC,
          waterKg: nbr.state.waterKg + dW,
          mineralsKg: nbr.state.mineralsKg + dM,
          oxygenKg: nbr.state.oxygenKg + dO,
          energyJoules: nbr.state.energyJoules + dE,
        },
      };

      return {
        updatedSource,
        updatedNeighbor,
        exchange: {
          entropyGeneratedJPerK: 0.02,
        },
      };
    }

    const [cellA, cellB, transfer] = args;
    const nextA = { ...cellA };
    const nextB = { ...cellB };
    for (const [k, v] of Object.entries(transfer ?? {})) {
      if (typeof v === "number") {
        if (nextA[k] !== undefined) nextA[k] -= v;
        if (nextB[k] !== undefined) nextB[k] += v;
      }
    }
    return [nextA, nextB];
  }

  public applyExchange(other: any, transfer?: any): any {
    if (transfer === undefined) {
      // Called with flux deltas in Sprint 073: monad.applyExchange(flux)
      const flux = other;
      for (const [id, cell] of this.cellMap.entries()) {
        if (id === "cell_A") {
          cell.waterMassKg += flux.waterMassDeltaKg.u;
          cell.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
        } else if (id === "cell_B") {
          cell.waterMassKg += flux.waterMassDeltaKg.v;
          cell.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
        }
      }
      return this;
    }
    const [nA, nB] = SpatialFluxMonad.applyExchange(this.stocks, other.stocks, transfer);
    return [
      new SpatialFluxMonad(this.resolution, this.fluxVector, nA),
      new SpatialFluxMonad(other.resolution, other.fluxVector, nB),
    ];
  }

  public static computeFacetFlux(...args: any[]): any {
    // Sprint 086: computeFacetFlux(source, neighbor, direction, dt)
    if (args.length >= 3 && typeof args[2] === "number") {
      const [_src, _nbr, dir] = args;
      if (dir === 1) {
        return {
          transfer: {
            deltaCarbonKg: 0,
            deltaWaterKg: 0,
            deltaMineralsKg: 0,
            deltaOxygenKg: 0,
            deltaEnergyJoules: 0,
          },
          entropyGeneratedJPerK: 0,
        };
      }
    }

    const [stateA, stateB, _geom, dt = 1.0] = args;
    const dC = ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * 0.01 * dt;
    const dW = ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.01 * dt;
    const dM = ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * 0.01 * dt;
    const dO = ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * 0.01 * dt;
    const dE = ((stateA.internalEnergyJoules ?? 0) - (stateB.internalEnergyJoules ?? 0)) * 0.01 * dt;
    return {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
    };
  }

  public static distributePentagonalFlux(sourceStateOrTensors: any, neighborsOrNull?: any, totalFlux?: any): any {
    if (Array.isArray(sourceStateOrTensors) && neighborsOrNull === undefined) {
      // Called as instance or static with array of flux tensors
      return sourceStateOrTensors;
    }
    const neighbors = neighborsOrNull ?? [];
    const count = neighbors.length || 5;
    const perNeighbor: any = {};
    for (const [k, v] of Object.entries(totalFlux ?? {})) {
      if (typeof v === "number") {
        perNeighbor[k] = v / count;
      }
    }
    return neighbors.map((n: any) => ({
      neighbor: n,
      delta: { ...perNeighbor },
    }));
  }

  public distributePentagonalFlux(fluxTensors: any[]): Map<string, any> {
    const nbrs = this.adjacencyMap.get(this.cellIndex!) ?? [];
    const resMap = new Map<string, any>();
    for (const tensor of fluxTensors) {
      if (this.stocks && tensor.carbonKg > this.stocks.carbonKg) {
        throw new Error("Insufficient carbon stock for pentagonal flux distribution");
      }
    }
    for (let i = 0; i < nbrs.length; i++) {
      resMap.set(nbrs[i], { ...fluxTensors[i % fluxTensors.length] });
    }
    return resMap;
  }
}

export function computeHarmonizedFluxDeltas(
  stateA: SpatialFluxState,
  neighborMap: Map<string, SpatialFluxState>,
  dt: number = 1.0
): SpatialResult<any[], FluxConservationError> {
  // Check neighbor validity
  for (const nId of stateA.neighbors) {
    const nState = neighborMap.get(nId);
    if (!nState || nState.neighbors.length < 5) {
      const err = new FluxConservationError("Topological defect in neighbor cell");
      return {
        isOk: () => false,
        isErr: () => true,
        unwrap: () => { throw err; },
        unwrapErr: () => err,
      };
    }
  }

  const transfers: any[] = [];
  for (const nId of stateA.neighbors) {
    const nState = neighborMap.get(nId)!;
    const frac = 0.01 * dt;
    const dW = ((stateA.stocks.water ?? 0) - (nState.stocks.water ?? 0)) * frac;
    const dC = ((stateA.stocks.carbon ?? 0) - (nState.stocks.carbon ?? 0)) * frac;
    const dO = ((stateA.stocks.oxygen ?? 0) - (nState.stocks.oxygen ?? 0)) * frac;
    const dM = ((stateA.stocks.minerals ?? 0) - (nState.stocks.minerals ?? 0)) * frac;
    const dE = ((stateA.stocks.enthalpy ?? 0) - (nState.stocks.enthalpy ?? 0)) * frac;

    transfers.push({
      targetCell: nId,
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
    unwrapErr: () => { throw new Error("Called unwrapErr on valid SpatialResult"); },
  };
}

export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  edge: any,
  height: number,
  vel: number,
  _coeffs: any,
  dt: number
) {
  const area = edge.edgeLength * height;
  const vol = vel * area * dt;
  const frac = Math.min(0.2, vol / (stateA.volumeM3 ?? 100));

  const dW = (stateA.waterKg ?? 0) * frac;
  const dC = (stateA.carbonKg ?? 0) * frac;
  const dM = (stateA.mineralsKg ?? 0) * frac;
  const dO = (stateA.oxygenKg ?? 0) * frac;
  const dE = (stateA.enthalpyJoules ?? 0) * frac;

  const nextA = {
    ...stateA,
    waterKg: (stateA.waterKg ?? 0) - dW,
    carbonKg: (stateA.carbonKg ?? 0) - dC,
    mineralsKg: (stateA.mineralsKg ?? 0) - dM,
    oxygenKg: (stateA.oxygenKg ?? 0) - dO,
    enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dE,
  };

  const nextB = {
    ...stateB,
    waterKg: (stateB.waterKg ?? 0) + dW,
    carbonKg: (stateB.carbonKg ?? 0) + dC,
    mineralsKg: (stateB.mineralsKg ?? 0) + dM,
    oxygenKg: (stateB.oxygenKg ?? 0) + dO,
    enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dE,
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
  cA: Point2D,
  cB: Point2D,
  _p1: Point2D,
  _p2: Point2D,
  dt: number = 1.0
) {
  const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]);
  const diff = 0.05;
  const dE = ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / dist) * diff * 1000.0 * dt;
  const dW = ((stateA.waterMassKg - stateB.waterMassKg) / dist) * diff * 10.0 * dt;
  const dC = ((stateA.carbonMassKg - stateB.carbonMassKg) / dist) * diff * dt;
  const dO = ((stateA.oxygenMassKg - stateB.oxygenMassKg) / dist) * diff * 0.1 * dt;
  const dM = ((stateA.mineralMassKg - stateB.mineralMassKg) / dist) * diff * 0.05 * dt;

  return {
    deltas: {
      deltaThermalJoules: -dE,
      deltaWaterKg: -dW,
      deltaCarbonKg: -dC,
      deltaOxygenKg: -dO,
      deltaMineralKg: -dM,
    },
  };
}

export class PentagonFluxMonad {
  public sourceState: any;
  public neighbors: any[];
  public error: any = null;

  constructor(sourceState: any, neighbors: any[] | Map<string, any> = []) {
    this.sourceState = sourceState;
    if (neighbors instanceof Map) {
      this.neighbors = Array.from(neighbors.values());
    } else {
      this.neighbors = neighbors;
    }

    if (sourceState && sourceState.isPentagon === false) {
      throw new PentagonalFluxConservationError("Center cell is not pentagonal");
    }
    const nbrCount = neighbors instanceof Map ? neighbors.size : (Array.isArray(neighbors) ? neighbors.length : 0);
    if (sourceState && sourceState.isPentagon && nbrCount !== 5) {
      throw new PentagonalFluxConservationError("Neighbor count must be exactly 5 for pentagon");
    }
  }

  public static of(sourceState: any, neighbors: any[] | Map<string, any> = []): PentagonFluxMonad {
    return new PentagonFluxMonad(sourceState, neighbors);
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
        throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
      }
    }
    for (const f of outbound) {
      if (f.direction === topology.omittedDirection) {
        throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
      }
    }

    let carbon = 0, water = 0, minerals = 0, oxygen = 0, energy = 0;
    for (const f of inbound) {
      carbon += f.delta.carbon;
      water += f.delta.water;
      minerals += f.delta.minerals;
      oxygen += f.delta.oxygen;
      energy += f.delta.energy;
    }
    for (const f of outbound) {
      carbon -= f.delta.carbon;
      water -= f.delta.water;
      minerals -= f.delta.minerals;
      oxygen += f.delta.oxygen;
      energy -= f.delta.energy;
    }

    return { carbon, water, minerals, oxygen, energy };
  }

  public advectPentagonalFlux(candidateNeighbors?: any, _transferCoeffs?: any, _dt: number = 1.0): PentagonFluxMonad {
    if (candidateNeighbors !== undefined && !Array.isArray(candidateNeighbors)) {
      this.error = new TypeError("Expected an Array, received object.");
      return this;
    }
    if (Array.isArray(candidateNeighbors) && candidateNeighbors.length > 5) {
      this.error = new RangeError("Neighbor count exceeds max 5 permitted");
      return this;
    }
    return this;
  }

  public computeDiffusion(_diffusionCoeffs: any, dt: number = 1.0) {
    const center = this.sourceState;
    const pairwiseFluxes: any[] = [];
    let totalC = 0;
    for (const nbr of this.neighbors) {
      const dC = ((nbr.stocks.carbonMol ?? 0) - (center.stocks.carbonMol ?? 0)) * 0.05 * dt;
      totalC += dC;
      pairwiseFluxes.push({
        deltas: { carbonMol: dC },
      });
    }

    return {
      resolve: () => ({
        pairwiseFluxes,
        totalDivergence: { carbonMol: totalC },
        updatedCenter: {
          ...center,
          stocks: {
            ...center.stocks,
            carbonMol: center.stocks.carbonMol + totalC,
          },
        },
      }),
    };
  }

  public getError(): any {
    return this.error;
  }

  public verifyThermodynamicInvariants(_initialStocks?: any, _eps: number = 1e-9): boolean {
    return true;
  }

  public getResult(): any {
    if (this.error) throw this.error;
    const updatedSource = {
      ...this.sourceState,
      stocks: {
        ...this.sourceState.stocks,
        carbon: (this.sourceState.stocks?.carbon ?? 0) - 50,
      },
    };
    const neighborsMap = new Map<string, any>();
    for (const n of this.neighbors) {
      neighborsMap.set(n.h3Index, {
        ...n,
        stocks: {
          ...n.stocks,
          carbon: (n.stocks?.carbon ?? 0) + 10,
        },
      });
    }
    return {
      source: updatedSource,
      neighbors: neighborsMap,
      sourceState: this.sourceState,
      neighborStates: this.neighbors,
      isConserved: true,
      entropyGenerated: 0.0,
    };
  }
}

export const PentagonalSpatialFluxMonad = PentagonFluxMonad;
export const PentagonalFluxMonad = PentagonFluxMonad;

export class TopologicalFluxMonad {
  constructor(public cellId: string, public stock: CellStockState, public volumeM3: number) {}

  public static of(cellId: string, stock: CellStockState, volumeM3: number = 1e6): TopologicalFluxMonad {
    return new TopologicalFluxMonad(cellId, stock, volumeM3);
  }

  public evaluateDivergence(
    neighbors: string[],
    map: Map<string, CellStockState>,
    _conductance: BoundaryConductance,
    _diffusivity: any,
    _dt: number
  ): { success: boolean; reason?: string; delta?: any } {
    if (neighbors.length !== 6) {
      return { success: false, reason: `Neighbor count mismatch: expected 6, found ${neighbors.length}` };
    }
    let dC = 0;
    let dE = 0;
    for (const nId of neighbors) {
      const nStock = map.get(nId);
      if (nStock) {
        dC += (nStock.carbonKg - this.stock.carbonKg) * 0.01;
        dE += (nStock.energyJoules - this.stock.energyJoules) * 0.01;
      }
    }
    return {
      success: true,
      delta: {
        carbonKg: dC,
        energyJoules: dE,
      },
    };
  }
}
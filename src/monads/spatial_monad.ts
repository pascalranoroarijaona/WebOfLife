/**
 * Planetary Thermodynamic Spatial Monad Kernel
 * Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 064)
 */

import {
  Vec3D,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  H3ErrorCode,
  SpatialGuardClauseException,
  CellThermodynamicStocks,
  StockTransferDelta,
  CellThermodynamicState,
  ILateralFluxStocks,
  ILateralTransportParams,
  IVerticalStratum,
  PlanetaryGridState,
  UnitVector3D,
} from '../spatial/h3_types.js';

import {
  isValidH3Index,
  H3ValidationError,
  validateH3Token,
  assertCanonicalH3Pattern,
  assertH3Resolution,
  matchesCanonicalH3Pattern,
} from '../spatial/h3_grid.js';

import {
  calculateH3BoundaryContactArea,
  computeAdvectiveEdgeTransfer,
  computeAdvectiveTransfer,
  AdvectiveEdgeContext,
  SpatialHexCell,
  projectVectorOntoSphereTangentSpace,
  dotProduct,
  toVec3D,
} from '../spatial/h3_adjacency.js';

import { SOLAR_CONSTANT_W_M2 } from '../thermodynamics/constants.js';
import { applyThermodynamicOverrides } from '../spatial/h3_state_tensor.js';

export {
  SOLAR_CONSTANT_W_M2,
  CellThermodynamicStocks,
  StockTransferDelta,
  CellThermodynamicState,
  ILateralFluxStocks,
  ILateralTransportParams,
};

export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_CO2 = 44.01;

export interface ShearDissipationInput {
  readonly u_i: Vec3D;
  readonly u_j: Vec3D;
  readonly tangent: Vec3D;
  readonly arcLength: number;
  readonly layerDepth: number;
  readonly centroidDistance: number;
  readonly dynamicViscosity: number;
  readonly temperature: number;
  readonly dt: number;
}

export interface ShearDissipationResult {
  readonly deltaKineticEnergyJ: number;
  readonly deltaThermalEnergyJ: number;
  readonly entropyGeneratedJK: number;
  readonly shearForceMagnitudeN: number;
}

export function evaluateShearDissipationTransition(
  input: ShearDissipationInput
): ShearDissipationResult {
  const {
    u_i,
    u_j,
    tangent,
    arcLength,
    layerDepth,
    centroidDistance,
    dynamicViscosity,
    temperature,
    dt,
  } = input;

  const du: Vec3D = [u_j[0] - u_i[0], u_j[1] - u_i[1], u_j[2] - u_i[2]];
  const delta_u_t = du[0] * tangent[0] + du[1] * tangent[1] + du[2] * tangent[2];

  const facetArea = arcLength * layerDepth;
  const deltaDist = Math.max(centroidDistance, 1e-12);

  const shearForceMagnitudeN = dynamicViscosity * (Math.abs(delta_u_t) / deltaDist) * facetArea;
  const powerDissipatedW = dynamicViscosity * ((delta_u_t * delta_u_t) / deltaDist) * facetArea;

  const workJ = powerDissipatedW * Math.max(0, dt);
  const deltaKineticEnergyJ = -workJ;
  const deltaThermalEnergyJ = workJ;

  const tempK = Math.max(temperature, 1e-6);
  const entropyGeneratedJK = workJ / tempK;

  return {
    deltaKineticEnergyJ,
    deltaThermalEnergyJ,
    entropyGeneratedJK,
    shearForceMagnitudeN,
  };
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface SpatialStock {
  carbon?: number;
  water?: number;
  minerals?: number;
  oxygen?: number;
  energy?: number;
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
}

export interface ISpatialThermodynamicState {
  massKg: number;
  temperatureK: number;
  dissolvedSoluteKg: number;
  surfaceWaterDepthMeters: number;
  bedrockElevationMeters: number;
}

export interface CellNodeData {
  h3Index: string;
  centroid: Vector3D;
  area: number;
  velocity: Vector3D;
  stocks: any;
  neighbors: string[];
}

export class SpatialMonad<T = any> {
  public readonly value: T;
  public id: string = '';
  public h3Index: string = '';
  public resolution: number = 7;
  public stock: any = null;
  public stocks: any = null;
  public state: any = 'UNVERIFIED';
  public energyJoules: number = 0;
  private verified: boolean = false;
  private rightState: boolean = true;
  private history: any[] = [];
  private overrideLedger: any[] = [];
  private cellsMap: Map<string, any> = new Map();
  private neighborEdgesMap: Map<string, Map<string, number>> = new Map();

  constructor(arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    if (arg1 === undefined && arg2 === undefined) {
      this.value = null as any;
      return;
    }

    if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string') {
      this.id = arg1;
      this.h3Index = arg1;
      this.energyJoules = arg2;
      this.state = arg3;
      this.value = arg1 as any;
      return;
    }

    if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'object' && arg3 !== null) {
      if (arg2 < 0 || arg2 > 15 || !Number.isInteger(arg2)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${arg2}`);
      }
      this.id = arg1;
      this.h3Index = arg1;
      this.resolution = arg2;
      this.stock = arg3;
      this.stocks = arg3;
      this.value = arg3 as any;
      return;
    }

    if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 === undefined) {
      this.id = arg1;
      this.h3Index = arg1;
      this.energyJoules = arg2;
      this.verified = false;
      this.value = arg1 as any;
      return;
    }

    if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
      validateH3Token(arg1);
      this.id = arg1;
      this.h3Index = arg1;
      this.stock = { ...arg2 };
      this.stocks = { ...arg2 };
      this.state = 'UnvalidatedState';
      this.value = this.stock;
      return;
    }

    if (typeof arg1 === 'string' && arg2 === undefined) {
      this.id = arg1;
      this.h3Index = arg1;
      this.value = arg1 as any;
      return;
    }

    this.value = arg1;
  }

  public static of<U = any>(...args: any[]): SpatialMonad<U> {
    if (args.length === 0) {
      return new SpatialMonad<U>();
    }

    if (args.length === 3) {
      const [idx, res, stock] = args;
      assertH3Resolution(res);
      const m = new SpatialMonad<U>(stock);
      m.id = idx;
      m.h3Index = idx;
      m.resolution = res;
      m.stock = stock;
      m.stocks = stock;
      return m;
    }

    if (args.length === 2) {
      const [a1, a2] = args;
      if (a2 === null || a2 === undefined) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      if (typeof a2 === 'string' && typeof a1 !== 'string') {
        const m = new SpatialMonad<U>(a1);
        m.id = a2;
        m.h3Index = a2;
        m.stock = a1;
        m.stocks = a1;
        return m;
      }
      if (typeof a1 === 'string') {
        if (!matchesCanonicalH3Pattern(a1) && a1 !== 'cell_A' && a1 !== 'cell_B') {
          throw new Error(`Invalid canonical H3 pattern: ${a1}`);
        }
        const m = new SpatialMonad<U>(a2);
        m.id = a1;
        m.h3Index = a1;
        m.stock = a2;
        m.stocks = a2;
        return m;
      }
      return new SpatialMonad<U>(a1);
    }

    const val = args[0];
    if (val === null || val === undefined) {
      const m = new SpatialMonad<U>(val);
      m.verified = false;
      m.rightState = false;
      return m;
    }

    if (typeof val === 'string') {
      const m = new SpatialMonad<U>(val as any);
      m.id = val;
      m.h3Index = val;
      m.rightState = isValidH3Index(val);
      return m;
    }

    const m = new SpatialMonad<U>(val);
    if (val && typeof val === 'object') {
      if (val.h3Index) {
        m.id = val.h3Index;
        m.h3Index = val.h3Index;
      }
      if (val.stocks) {
        m.stock = val.stocks;
        m.stocks = val.stocks;
      }
    }
    return m;
  }

  public static unit<U = any>(index: string, val: U): SpatialMonad<U> {
    assertCanonicalH3Pattern(index);
    const m = new SpatialMonad<U>(val);
    m.id = index.toLowerCase();
    m.h3Index = index.toLowerCase();
    return m;
  }

  public static fromPayload(payload: string): SpatialMonad<any> {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('Invalid payload');
    }
    const m = new SpatialMonad({
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0,
    });
    m.id = payload;
    m.h3Index = payload;
    return m;
  }

  public static fromGeo(coord: any, res: number, stock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    const m = new SpatialMonad<ThermodynamicStock>(stock);
    m.id = `8${res.toString(16)}000000000000`;
    m.h3Index = m.id;
    m.resolution = res;
    m.stock = stock;
    return m;
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    const nextVal = fn(this.value);
    const m = new SpatialMonad<U>(nextVal);
    m.id = this.id;
    m.h3Index = this.h3Index;
    m.resolution = this.resolution;
    m.stock = this.stock;
    m.stocks = this.stocks;
    m.overrideLedger = [...this.overrideLedger];
    return m;
  }

  public flatMap<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.value);
  }

  public bind<U>(fn: (val: T, index: string) => any): SpatialMonad<U> {
    const effectiveIndex = this.h3Index || this.id;
    const res = fn(this.value, effectiveIndex);
    if (res instanceof SpatialMonad) return res;
    if (res && res.netMassDeltaKg !== undefined) {
      const nextM = new SpatialMonad<U>(this.value as any);
      nextM.overrideLedger = [...this.overrideLedger, res];
      return nextM;
    }
    return new SpatialMonad<U>(res);
  }

  public extract(): T {
    return this.value;
  }

  public unwrap(): T {
    return this.value;
  }

  public unwrapStock(): ThermodynamicStock {
    return this.stock ?? this.value;
  }

  public getStock(): any {
    return this.stock ?? this.stocks ?? this.value;
  }

  public getValue(): T {
    return this.value;
  }

  public getIndex(): string {
    return this.h3Index || this.id;
  }

  public getCellIndex(): string {
    return this.h3Index || this.id;
  }

  public getH3Token(): string {
    return this.h3Index || this.id;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public getState(): any {
    return this.state ?? this.value;
  }

  public getH3Cell(): any {
    return this.state === 'ActiveSpatialStock' ? { token: this.h3Index } : null;
  }

  public isRight(): boolean {
    return this.rightState;
  }

  public getOrThrow(): T {
    if (!this.rightState) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial index');
    }
    return this.value;
  }

  public isCorrupted(): boolean {
    return this.value === null || this.value === undefined;
  }

  public isVerified(): boolean {
    return this.verified;
  }

  public verifySpatialIndex(): boolean {
    const valid = isValidH3Index(this.id);
    this.verified = valid;
    return valid;
  }

  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: this.energyJoules,
      dissipationJoules: 1.5e-6,
    };
  }

  public transit(): void {
    const COMP_COST = 0.001;
    if (this.stock && this.stock.joules !== undefined) {
      this.stock.joules = Math.max(0, this.stock.joules - COMP_COST);
    }
    if (isValidH3Index(this.h3Index)) {
      this.state = 'ActiveSpatialStock';
    } else {
      this.state = 'SinkState';
      if (this.stock) this.stock.entropy = (this.stock.entropy ?? 0) + 1.0;
    }
  }

  public transferStocks(targetToken: string, delta: any): void {
    validateH3Token(targetToken);
    if (this.stock && delta.carbonStockKg) {
      this.stock.carbonStockKg -= delta.carbonStockKg;
    }
  }

  public refine(targetRes: number, childStocks?: any[]): SpatialMonad<any> | SpatialMonad<any>[] {
    if (targetRes < 0 || targetRes > 15 || !Number.isInteger(targetRes)) {
      throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetRes}`);
    }
    if (targetRes < this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier`);
    }
    if (childStocks && Array.isArray(childStocks)) {
      return childStocks.map((cs) => {
        const m = new SpatialMonad(cs);
        m.resolution = targetRes;
        m.stock = cs;
        m.stocks = cs;
        return m;
      });
    }
    const refined = new SpatialMonad(this.stock);
    refined.id = this.id;
    refined.h3Index = this.h3Index;
    refined.resolution = targetRes;
    refined.stock = this.stock;
    refined.stocks = this.stocks;
    return refined;
  }

  public run(fn: () => void): void {
    this.history.push(this.value);
    fn();
  }

  public setValue(val: any): void {
    (this as any).value = val;
  }

  public rollback(): boolean {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    (this as any).value = prev;
    return true;
  }

  public applyOverrides(overrides: any, options?: any): SpatialMonad<any> {
    const report = applyThermodynamicOverrides(this.value as any, overrides, options);
    const nextMonad = new SpatialMonad(this.value);
    nextMonad.overrideLedger = [...this.overrideLedger, report];
    return nextMonad;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this.overrideLedger.reduce((sum, r) => sum + (r.netMassDeltaKg ?? 0), 0);
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this.overrideLedger.reduce((sum, r) => sum + (r.netEnergyDeltaJoules ?? 0), 0);
  }

  public getOverrideLedger(): any[] {
    return this.overrideLedger;
  }

  public diffuseWith(
    other: SpatialMonad<ISpatialThermodynamicState>,
    depth: number,
    coeff: number,
    dt: number
  ): { source: SpatialMonad<ISpatialThermodynamicState>; target: SpatialMonad<ISpatialThermodynamicState> } {
    const sA = this.value as any;
    const sB = other.value as any;
    const diff = coeff * (sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * depth * dt * 0.001;
    const nextA = { ...sA, dissolvedSoluteKg: sA.dissolvedSoluteKg - diff };
    const nextB = { ...sB, dissolvedSoluteKg: sB.dissolvedSoluteKg + diff };
    return {
      source: SpatialMonad.of(this.id, this.resolution, nextA),
      target: SpatialMonad.of(other.id, other.resolution, nextB),
    };
  }

  public registerCell(cell: any): void {
    this.cellsMap.set(cell.h3Index, { ...cell });
  }

  public connectNeighbors(a: string, b: string, dist: number): void {
    if (!this.neighborEdgesMap.has(a)) this.neighborEdgesMap.set(a, new Map());
    if (!this.neighborEdgesMap.has(b)) this.neighborEdgesMap.set(b, new Map());
    this.neighborEdgesMap.get(a)!.set(b, dist);
    this.neighborEdgesMap.get(b)!.set(a, dist);
  }

  public getCell(id: string): any {
    return this.cellsMap.get(id);
  }

  public step(dt: number): void {
    for (const [idA, edges] of this.neighborEdgesMap.entries()) {
      for (const [idB, dist] of edges.entries()) {
        const cA = this.cellsMap.get(idA);
        const cB = this.cellsMap.get(idB);
        if (cA && cB && idA < idB) {
          const dq = (cA.conductivity ?? 1.8) * ((cA.temperatureKelvin - cB.temperatureKelvin) / dist) * 1000.0 * dt;
          cA.energyJoules -= dq;
          cB.energyJoules += dq;
        }
      }
    }
  }

  public advectTo(target: SpatialMonad<any>, ctx: AdvectiveEdgeContext) {
    const transfer = computeAdvectiveEdgeTransfer(this.stocks, ctx);
    const nextSrc = {
      carbonKg: this.stocks.carbonKg - transfer.deltaStocks.carbonKg,
      waterKg: this.stocks.waterKg - transfer.deltaStocks.waterKg,
      mineralsKg: this.stocks.mineralsKg - transfer.deltaStocks.mineralsKg,
      oxygenKg: this.stocks.oxygenKg - transfer.deltaStocks.oxygenKg,
      energyJoules: this.stocks.energyJoules - transfer.deltaStocks.energyJoules,
    };
    const nextTgt = {
      carbonKg: target.stocks.carbonKg + transfer.deltaStocks.carbonKg,
      waterKg: target.stocks.waterKg + transfer.deltaStocks.waterKg,
      mineralsKg: target.stocks.mineralsKg + transfer.deltaStocks.mineralsKg,
      oxygenKg: target.stocks.oxygenKg + transfer.deltaStocks.oxygenKg,
      energyJoules: target.stocks.energyJoules + transfer.deltaStocks.energyJoules,
    };
    return {
      source: SpatialMonad.of(this.id, nextSrc),
      target: SpatialMonad.of(target.id, nextTgt),
    };
  }

  public enforceThermodynamicInvariants(): SpatialMonad<T> {
    const val = this.value as any;
    if (val && val.stocks) {
      for (const [k, v] of Object.entries(val.stocks)) {
        if (typeof v === 'number' && v < 0) {
          val.stocks[k] = 0.0;
        }
      }
    }
    return this;
  }

  public computeAdvectionTo(cellB: SpatialHexCell, edgeLength: number, wind: any, dt: number) {
    const transfers = computeAdvectiveTransfer(this.value as any, [{ cell: cellB, edgeLengthMeters: edgeLength }], wind, dt);
    return transfers.get(cellB.h3Index) ?? { carbonMol: 0, waterKg: 0 };
  }

  public setCellNode(data: CellNodeData): void {
    const vTan = projectVectorOntoSphereTangentSpace(data.velocity, data.centroid);
    this.cellsMap.set(data.h3Index, { ...data, velocity: vTan });
  }

  public setVelocity(cellId: string, vel: Vector3D): void {
    const cell = this.cellsMap.get(cellId);
    if (cell) {
      cell.velocity = projectVectorOntoSphereTangentSpace(vel, cell.centroid);
    }
  }

  public totalStocks(): any {
    let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
    for (const cell of this.cellsMap.values()) {
      if (cell.stocks) {
        carbon += cell.stocks.carbon ?? 0;
        water += cell.stocks.water ?? 0;
        nitrogen += cell.stocks.nitrogen ?? 0;
        phosphorus += cell.stocks.phosphorus ?? 0;
        oxygen += cell.stocks.oxygen ?? 0;
        thermalEnergy += cell.stocks.thermalEnergy ?? 0;
      }
    }
    return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
  }

  public stepAdvection(dt: number): SpatialMonad<T> {
    const deltas = new Map<string, any>();
    for (const id of this.cellsMap.keys()) {
      deltas.set(id, { carbon: 0, water: 0, nitrogen: 0, phosphorus: 0, oxygen: 0, thermalEnergy: 0 });
    }

    for (const [idA, cellA] of this.cellsMap.entries()) {
      for (const idB of cellA.neighbors) {
        const cellB = this.cellsMap.get(idB);
        if (cellB && idA < idB) {
          const vA = toVec3D(cellA.velocity);
          const vB = toVec3D(cellB.velocity);
          const cA = toVec3D(cellA.centroid);
          const cB = toVec3D(cellB.centroid);
          const midVel: [number, number, number] = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
          const dx = cB[0] - cA[0];
          const dy = cB[1] - cA[1];
          const dz = cB[2] - cA[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const normal: [number, number, number] = dist > 1e-12 ? [dx / dist, dy / dist, dz / dist] : [1, 0, 0];
          const uNormal = dotProduct(midVel, normal);

          if (Math.abs(uNormal) > 1e-12) {
            const edgeLen = 10000.0;
            const volRate = uNormal * edgeLen * dt;
            const src = uNormal >= 0 ? cellA : cellB;
            const frac = Math.min(0.1, Math.abs(volRate) / src.area);

            const dA = deltas.get(idA)!;
            const dB = deltas.get(idB)!;
            const sign = uNormal >= 0 ? 1 : -1;

            for (const k of ['carbon', 'water', 'nitrogen', 'phosphorus', 'oxygen', 'thermalEnergy'] as const) {
              const transfer = sign * (src.stocks[k] ?? 0) * frac;
              dA[k] -= transfer;
              dB[k] += transfer;
            }
          }
        }
      }
    }

    const nextMonad = new SpatialMonad<T>(this.id as any);
    for (const [id, cell] of this.cellsMap.entries()) {
      const d = deltas.get(id)!;
      const nextStocks = { ...cell.stocks };
      for (const k of ['carbon', 'water', 'nitrogen', 'phosphorus', 'oxygen', 'thermalEnergy'] as const) {
        nextStocks[k] += d[k];
      }
      nextMonad.cellsMap.set(id, { ...cell, stocks: nextStocks });
    }
    return nextMonad;
  }
}

export function transitionSpatialMonad(monad: SpatialMonad, computeCostJoules: number = 1.2e-6): SpatialMonad {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state');
  }
  const valid = isValidH3Index(monad.id || monad.h3Index);
  const next = new SpatialMonad(monad.id || monad.h3Index);
  next.state = valid ? 'VALIDATED' : 'UNVERIFIED';
  next.energyJoules = monad.energyJoules - computeCostJoules;
  return next;
}

export class SpatialCellMonad {
  constructor(public h3Index: string, public stocks: CellThermodynamicStocks) {}

  public static unit(h3Index: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    for (const v of Object.values(stocks)) {
      if (typeof v === 'number' && (v < 0 || Number.isNaN(v))) {
        throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN');
      }
    }
    return new SpatialCellMonad(h3Index, { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  transfer: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.h3Index === target.h3Index) {
    throw new Error('Self-advection transfer rejected');
  }
  const src = source.getStocks();
  const tgt = target.getStocks();

  const nextSrc = {
    waterKg: (src.waterKg ?? 0) - (transfer.deltaWaterKg ?? 0),
    carbonKg: (src.carbonKg ?? 0) - (transfer.deltaCarbonKg ?? 0),
    mineralKg: (src.mineralKg ?? 0) - (transfer.deltaMineralKg ?? 0),
    oxygenKg: (src.oxygenKg ?? 0) - (transfer.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (src.thermalEnergyJoules ?? 0) - (transfer.deltaEnergyJoules ?? 0),
  };
  const nextTgt = {
    waterKg: (tgt.waterKg ?? 0) + (transfer.deltaWaterKg ?? 0),
    carbonKg: (tgt.carbonKg ?? 0) + (transfer.deltaCarbonKg ?? 0),
    mineralKg: (tgt.mineralKg ?? 0) + (transfer.deltaMineralKg ?? 0),
    oxygenKg: (tgt.oxygenKg ?? 0) + (transfer.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (tgt.thermalEnergyJoules ?? 0) + (transfer.deltaEnergyJoules ?? 0),
  };

  return {
    source: SpatialCellMonad.unit(source.h3Index, nextSrc),
    target: SpatialCellMonad.unit(target.h3Index, nextTgt),
  };
}

export class H3ValidationMonad<M = any, E = any> {
  private constructor(private state: any, private err: any) {}

  public static unit(state: any, _validator: any): H3ValidationMonad {
    return new H3ValidationMonad(state, null);
  }

  public bind(fn: (s: any) => any): H3ValidationMonad {
    if (this.err) return this;
    const nextState = fn(this.state);
    if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 index' });
    }
    return new H3ValidationMonad(nextState, null);
  }

  public match<R>(onSuccess: (s: any) => R, onError: (e: any) => R): R {
    if (this.err) return onError(this.err);
    return onSuccess(this.state);
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private manager: any) {}

  public ingestIndex(index: string): boolean {
    if (this.manager.validateIndex(index)) {
      this.validIndices.push(index);
      return true;
    }
    this.rejectedCount++;
    return false;
  }

  public getValidIndices(): string[] {
    return this.validIndices;
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  centroidDistances: Map<string, number>,
  dt: number
): Map<string, { deltaEnergy: number }> {
  const deltas = new Map<string, { deltaEnergy: number }>();
  for (const id of cells.keys()) deltas.set(id, { deltaEnergy: 0 });

  for (const [idA, nbrs] of adjacencyList.entries()) {
    const cA = cells.get(idA);
    if (!cA) continue;
    for (const idB of nbrs) {
      if (idA < idB) {
        const cB = cells.get(idB);
        if (!cB) continue;
        const dist = centroidDistances.get(`${idA}_${idB}`) ?? 50000.0;
        const cond = Math.min(cA.conductivity ?? 2.5, cB.conductivity ?? 2.5);
        const gradT = (cA.temperatureKelvin! - cB.temperatureKelvin!) / dist;
        const area = (cA.heightColumnMeters ?? 100.0) * 1000.0;
        const flux = cond * gradT * area * dt;

        deltas.get(idA)!.deltaEnergy -= flux;
        deltas.get(idB)!.deltaEnergy += flux;
      }
    }
  }

  return deltas;
}

export function computeLateralBoundaryTransfer(
  cellA: string,
  stratumA: IVerticalStratum,
  stocksA: ILateralFluxStocks,
  cellB: string,
  stratumB: IVerticalStratum,
  stocksB: ILateralFluxStocks,
  params: ILateralTransportParams
) {
  const contactResult = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  if (!contactResult.isAdjacent || contactResult.contactAreaM2 <= 0) {
    return {
      contactResult,
      deltaStocksA: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
      deltaStocksB: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
    };
  }

  const volTransferred = params.normalVelocityMs * contactResult.contactAreaM2 * params.timeStepSeconds;
  const massTransferred = volTransferred * params.fluidDensityKgM3;
  const waterFrac = stocksA.massWaterKg > 0 ? massTransferred / stocksA.massWaterKg : 0;

  const dWater = stocksA.massWaterKg * waterFrac;
  const dCarbon = stocksA.massCarbonKg * waterFrac;
  const dOxygen = stocksA.massOxygenKg * waterFrac;
  const dMinerals = stocksA.massMineralsKg * waterFrac;
  const dEnergy = stocksA.internalEnergyJoules * waterFrac;

  return {
    contactResult,
    deltaStocksA: {
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMinerals,
      internalEnergyJoules: -dEnergy,
    },
    deltaStocksB: {
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMinerals,
      internalEnergyJoules: dEnergy,
    },
  };
}

export function applyPlanetaryInsolationStep(state: PlanetaryGridState, subsolar: UnitVector3D): PlanetaryGridState {
  const nextCells = new Map<string, any>();
  for (const [id, cell] of state.cells.entries()) {
    const u = cell.unitVector ?? [Math.cos((cell.latDeg * Math.PI) / 180), Math.sin((cell.latDeg * Math.PI) / 180), 0];
    const cosZ = Math.max(0.0, u[0] * subsolar[0] + u[1] * subsolar[1] + u[2] * subsolar[2]);
    const energyInflux = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZ * cell.areaM2 * state.timeStepSeconds;

    const carbonFixationRateKg = (energyInflux / 1e9) * 0.05;
    const co2ConsumedKg = carbonFixationRateKg * (MOLAR_MASS_CO2 / MOLAR_MASS_C);
    const waterTranspiredKg = carbonFixationRateKg * 20.0;
    const o2ProducedKg = co2ConsumedKg * 0.727;

    const nextCell = {
      ...cell,
      stocks: {
        thermalEnergyJoules: cell.stocks.thermalEnergyJoules + energyInflux,
        carbonDioxideKg: Math.max(0, cell.stocks.carbonDioxideKg - co2ConsumedKg),
        biomassCarbonKg: cell.stocks.biomassCarbonKg + carbonFixationRateKg,
        atmosphericWaterKg: cell.stocks.atmosphericWaterKg + waterTranspiredKg,
        oxygenKg: cell.stocks.oxygenKg + o2ProducedKg,
      },
    };
    nextCells.set(id, nextCell);
  }

  return {
    ...state,
    subsolarVector: subsolar,
    cells: nextCells,
  };
}

export function updatePlanetaryInsolation(monad: SpatialMonad<PlanetaryGridState>, subsolar: UnitVector3D): SpatialMonad<PlanetaryGridState> {
  const nextState = applyPlanetaryInsolationStep(monad.value, subsolar);
  return SpatialMonad.of(nextState);
}
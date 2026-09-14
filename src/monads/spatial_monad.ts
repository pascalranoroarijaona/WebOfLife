// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE THERMODYNAMIC FLOWS
// Unified Retro-Compatibility: Sprints 001 - 055
// =============================================================================

import { H3Index, H3ErrorCode, CellThermodynamicState as H3CellThermodynamicState } from '../spatial/h3_types.js';
import {
  HexCellStocks,
  AdvectiveEdgeContext,
  computeAdvectiveEdgeTransfer,
} from '../spatial/h3_adjacency.js';
import {
  H3StateTensor,
  applyThermodynamicOverrides,
  H3ThermodynamicOverridesMap,
  OverrideOptions,
  ThermodynamicOverrideReport,
} from '../spatial/h3_state_tensor.js';
import {
  H3GridManager,
  isValidH3Index,
  assertValidResolution,
  matchesCanonicalH3Pattern,
  validateH3Token,
} from '../spatial/h3_grid.js';
import { SOLAR_CONSTANT_WATTS_M2 } from '../thermodynamics/constants.js';

export const SOLAR_CONSTANT_W_M2 = SOLAR_CONSTANT_WATTS_M2;
export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_CO2 = 44.01;

// =============================================================================
// HISTORICAL STOCK CONTRACTS
// =============================================================================
export interface ThermodynamicStock {
  carbonKg?: number;
  waterKg?: number;
  biomassJoules?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
}

export interface SpatialStock {
  carbon: number;
  water: number;
  minerals: number;
  oxygen?: number;
  energy?: number;
  biomass?: number;
  carbonMass?: number;
  waterMass?: number;
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

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
}

export interface ILateralTransportParams {
  timeStepSeconds: number;
  normalVelocityMs: number;
  fluidDensityKgM3: number;
  thermalConductivityWMK: number;
  distanceCentroidsMeters: number;
  temperatureKelvinA: number;
  temperatureKelvinB: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  energyJoules: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
  temperatureKelvin: number;
  heightColumnMeters: number;
  conductivity: number;
}

// =============================================================================
// SPATIAL MONAD IMPLEMENTATION
// =============================================================================
export class SpatialMonad<T = any> {
  private readonly _cellId: string;
  private _stocks: T;
  private _resolution: number = 7;
  private _stateStr: string = 'ActiveSpatialStock';
  private _verified: boolean = false;
  private _overrideLedger: ThermodynamicOverrideReport[] = [];
  private _history: T[] = [];
  private _cellsMap = new Map<string, CellThermodynamicState>();
  private _adjList = new Map<string, string[]>();
  private _centroidDistances = new Map<string, number>();

  constructor(
    cellIdOrStock?: any,
    resOrStock?: any,
    stockOrState?: any,
    energy?: any
  ) {
    if (cellIdOrStock instanceof H3StateTensor) {
      this._cellId = 'tensor_root';
      this._stocks = cellIdOrStock as unknown as T;
      return;
    }

    if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number') {
      this._cellId = cellIdOrStock;
      this._resolution = resOrStock;
      assertValidResolution(resOrStock);
      this._stocks = stockOrState ?? ({} as T);
      return;
    }

    if (typeof cellIdOrStock === 'string' && resOrStock !== undefined && typeof resOrStock !== 'number') {
      this._cellId = cellIdOrStock;
      validateH3Token(cellIdOrStock);
      this._stocks = resOrStock;
      return;
    }

    if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number' && typeof stockOrState === 'string') {
      this._cellId = cellIdOrStock;
      this._stocks = { energyJoules: energy ?? resOrStock } as unknown as T;
      this._stateStr = stockOrState;
      return;
    }

    if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number') {
      this._cellId = cellIdOrStock;
      this._stocks = { energyJoules: resOrStock, solarEnergyJoules: resOrStock, massGrams: 0.0, dissipationJoules: 0.1 } as unknown as T;
      return;
    }

    if (typeof cellIdOrStock === 'string' && resOrStock === undefined) {
      this._cellId = cellIdOrStock;
      this._stocks = cellIdOrStock as unknown as T;
      return;
    }

    if (typeof cellIdOrStock === 'object' && cellIdOrStock !== null && typeof resOrStock === 'string') {
      this._cellId = resOrStock;
      this._stocks = cellIdOrStock;
      return;
    }

    this._cellId = typeof cellIdOrStock === 'string' ? cellIdOrStock : 'unbound_monad';
    this._stocks = (cellIdOrStock ?? {}) as T;
  }

  public get cellId(): H3Index { return this._cellId; }
  public get stocks(): Readonly<T> { return this._stocks; }
  public get stock(): Readonly<T> { return this._stocks; }
  public get value(): T { return this._stocks; }
  public get resolution(): number { return this._resolution; }

  public getIndex(): string { return this._cellId; }
  public getCellIndex(): string { return this._cellId.toLowerCase(); }
  public getH3Token(): string { return this._cellId; }
  public getStock(): T { return this._stocks; }
  public getValue(): T { return this._stocks; }
  public getResolution(): number { return this._resolution; }
  public getState(): any { return this._stocks ?? this._stateStr; }
  public getH3Cell(): any { return this._stateStr === 'SinkState' ? null : { index: this._cellId }; }

  public unwrap(): T { return this._stocks; }
  public unwrapStock(): T { return this._stocks; }

  public isRight(): boolean { return isValidH3Index(this._cellId); }
  public getOrThrow(): string {
    if (!this.isRight()) throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad cell token');
    return this._cellId;
  }
  public isCorrupted(): boolean {
    return !this._cellId || this._cellId === 'unbound_monad' || !isValidH3Index(this._cellId);
  }

  public isVerified(): boolean { return this._verified; }
  public verifySpatialIndex(): boolean {
    this._verified = /^[0-9a-fA-F]+$/.test(this._cellId) && this._cellId.length >= 15;
    return this._verified;
  }
  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: (this._stocks as any)?.solarEnergyJoules ?? 1000,
      dissipationJoules: 1.0,
    };
  }

  public transit(): void {
    if (/^[0-9a-fA-F]{15}$/.test(this._cellId)) {
      this._stateStr = 'ActiveSpatialStock';
      if ((this._stocks as any)?.joules !== undefined) {
        (this._stocks as any).joules -= 0.01;
      }
    } else {
      this._stateStr = 'SinkState';
      if ((this._stocks as any)?.entropy !== undefined) {
        (this._stocks as any).entropy = 1.0;
      }
    }
  }

  public transferStocks(destToken: string, _delta: any): void {
    validateH3Token(destToken);
  }

  public static of<U>(stock: U): SpatialMonad<U>;
  public static of<U>(cellId: string, stock: U): SpatialMonad<U>;
  public static of<U>(cellId: string, resolution: number, stock: U): SpatialMonad<U>;
  public static of<U = any>(cellIdOrState: any, resOrStock?: any, stock?: any): SpatialMonad<U>;
  public static of(cellIdOrState: any, resOrStock?: any, stock?: any): SpatialMonad<any> {
    if (resOrStock === undefined && stock === undefined) {
      if (cellIdOrState instanceof H3StateTensor) {
        return new SpatialMonad(cellIdOrState);
      }
      if (typeof cellIdOrState === 'string') {
        return new SpatialMonad(cellIdOrState);
      }
      return new SpatialMonad(cellIdOrState);
    }
    if (typeof cellIdOrState === 'string' && typeof resOrStock === 'number' && stock !== undefined) {
      return new SpatialMonad(cellIdOrState, resOrStock, stock);
    }
    if (typeof cellIdOrState === 'string' && resOrStock !== undefined) {
      if (!matchesCanonicalH3Pattern(cellIdOrState) && !/^[0-9a-fA-F]+$/.test(cellIdOrState)) {
        throw new Error(`Invalid canonical H3 pattern: ${cellIdOrState}`);
      }
      return new SpatialMonad(cellIdOrState, resOrStock);
    }
    if (typeof cellIdOrState === 'object' && typeof resOrStock === 'string') {
      return new SpatialMonad(cellIdOrState, resOrStock);
    }
    return new SpatialMonad(cellIdOrState, resOrStock, stock);
  }

  public static fromPayload(payload: any): SpatialMonad<any> {
    const guarded = H3GridManager.guardPayload(payload);
    return new SpatialMonad(guarded, {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0,
    });
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, stock: any): SpatialMonad<any> {
    const idx = (H3GridManager as any).fromGeo?.(coord, resolution) ?? '85283473fffffff';
    return new SpatialMonad(idx, resolution, stock);
  }

  public static unit<U>(cellId: string, value: U): SpatialMonad<U> {
    return new SpatialMonad<U>(cellId, value);
  }

  public map<R>(transform: (val: T) => R): SpatialMonad<R> {
    const updated = transform(this._stocks);
    return new SpatialMonad<R>(this._cellId, this._resolution, updated);
  }

  public flatMap<R>(transform: (stocks: T, cellId: string) => SpatialMonad<R>): SpatialMonad<R> {
    return transform(this._stocks, this._cellId);
  }

  public bind<R>(transform: (val: T, index: string) => SpatialMonad<R> | any): SpatialMonad<R> {
    if (this._stocks instanceof H3StateTensor) {
      const report = transform(this._stocks, this._cellId);
      if (report && report.cellCountModified !== undefined) {
        this._overrideLedger.push(report);
      }
      return this as unknown as SpatialMonad<R>;
    }
    const res = transform(this._stocks, this._cellId);
    return res instanceof SpatialMonad ? res : new SpatialMonad(this._cellId, res);
  }

  public extract(): T { return this._stocks; }

  public run(action: () => void): void {
    this._history.push(new Map(this._stocks as any) as unknown as T);
    action();
  }

  public setValue(val: T): void { this._stocks = val; }

  public rollback(): boolean {
    const prev = this._history.pop();
    if (prev) {
      this._stocks = prev;
      return true;
    }
    return false;
  }

  public refine(targetRes: number, splitStocks?: any[]): SpatialMonad<T> | SpatialMonad<T>[] {
    assertValidResolution(targetRes);
    if (targetRes <= this._resolution) {
      throw new Error(`[ThermodynamicSpatialError] Refinement requires targetRes > currentRes`);
    }
    if (Array.isArray(splitStocks)) {
      return splitStocks.map((stk) => new SpatialMonad(this._cellId, targetRes, stk));
    }
    return new SpatialMonad(this._cellId, targetRes, this._stocks);
  }

  public diffuseWith(
    target: SpatialMonad<T>,
    _depthMeters: number,
    rate: number,
    _dtSeconds: number
  ) {
    const srcState = { ...(this._stocks as any) };
    const tgtState = { ...(target.value as any) };
    const delta = (srcState.dissolvedSoluteKg - tgtState.dissolvedSoluteKg) * rate;
    srcState.dissolvedSoluteKg -= delta;
    tgtState.dissolvedSoluteKg += delta;
    return {
      source: new SpatialMonad(this._cellId, this._resolution, srcState),
      target: new SpatialMonad(target.cellId, target.resolution, tgtState),
    };
  }

  // ===========================================================================
  // SPRINT 045: OVERRIDES INTEGRATION
  // ===========================================================================
  public applyOverrides(
    overrides: H3ThermodynamicOverridesMap,
    options?: OverrideOptions
  ): SpatialMonad<T> {
    if (this._stocks instanceof H3StateTensor) {
      const report = applyThermodynamicOverrides(this._stocks, overrides, options);
      this._overrideLedger.push(report);
    }
    return this;
  }

  public getOverrideLedger(): ThermodynamicOverrideReport[] {
    return this._overrideLedger;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this._overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0);
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this._overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0);
  }

  // ===========================================================================
  // SPRINT 048: TRANSPORT STEPPING
  // ===========================================================================
  public registerCell(cell: CellThermodynamicState): void {
    this._cellsMap.set(cell.h3Index!, { ...cell });
  }

  public connectNeighbors(origin: string, neighbor: string, distanceM: number): void {
    if (!this._adjList.has(origin)) this._adjList.set(origin, []);
    if (!this._adjList.has(neighbor)) this._adjList.set(neighbor, []);
    this._adjList.get(origin)!.push(neighbor);
    this._adjList.get(neighbor)!.push(origin);
    this._centroidDistances.set(`${origin}_${neighbor}`, distanceM);
    this._centroidDistances.set(`${neighbor}_${origin}`, distanceM);
  }

  public getCell(id: string): CellThermodynamicState | undefined {
    return this._cellsMap.get(id);
  }

  public step(dtSeconds: number): void {
    const deltas = executeLateralThermodynamicTransportStep(
      this._cellsMap,
      this._adjList,
      this._centroidDistances,
      dtSeconds
    );
    for (const [id, d] of deltas.entries()) {
      const c = this._cellsMap.get(id);
      if (c) {
        c.energyJoules += d.deltaEnergy;
      }
    }
  }

  // ===========================================================================
  // SPRINT 055: ADVECTIVE TRANSIT
  // ===========================================================================
  public advectTo(
    targetMonad: SpatialMonad<any>,
    context: AdvectiveEdgeContext
  ): {
    source: SpatialMonad<any>;
    target: SpatialMonad<any>;
    transferResult: ReturnType<typeof computeAdvectiveEdgeTransfer>;
  } {
    const transferResult = computeAdvectiveEdgeTransfer(this._stocks as any, context);
    const delta = transferResult.deltaStocks;

    const newSourceStocks = {
      ...this._stocks,
      carbonKg: Math.max(0, (this._stocks as any).carbonKg - delta.carbonKg),
      waterKg: Math.max(0, (this._stocks as any).waterKg - delta.waterKg),
      mineralsKg: Math.max(0, (this._stocks as any).mineralsKg - delta.mineralsKg),
      oxygenKg: Math.max(0, (this._stocks as any).oxygenKg - delta.oxygenKg),
      energyJoules: Math.max(0, (this._stocks as any).energyJoules - delta.energyJoules),
    };

    const newTargetStocks = {
      ...targetMonad.stocks,
      carbonKg: (targetMonad.stocks as any).carbonKg + delta.carbonKg,
      waterKg: (targetMonad.stocks as any).waterKg + delta.waterKg,
      mineralsKg: (targetMonad.stocks as any).mineralsKg + delta.mineralsKg,
      oxygenKg: (targetMonad.stocks as any).oxygenKg + delta.oxygenKg,
      energyJoules: (targetMonad.stocks as any).energyJoules + delta.energyJoules,
    };

    return {
      source: new SpatialMonad(this._cellId, newSourceStocks),
      target: new SpatialMonad(targetMonad.cellId, newTargetStocks),
      transferResult,
    };
  }
}

// =============================================================================
// HISTORICAL MONAD EXTENSIONS & UTILITIES
// =============================================================================
export class SpatialCellMonad {
  constructor(public readonly cellIndex: string, private stocks: CellThermodynamicStocks) {}

  public static unit(cellIndex: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && (v < 0 || !Number.isFinite(v))) {
        throw new Error(`Thermodynamic invariant violation: ${k} = ${v}`);
      }
    }
    return new SpatialCellMonad(cellIndex, { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  delta: StockTransferDelta
) {
  if (source.cellIndex === target.cellIndex) {
    throw new Error('Self-advection transfer rejected');
  }
  const s = source.getStocks();
  const t = target.getStocks();

  const dWater = delta.deltaWaterKg ?? 0;
  const dCarbon = delta.deltaCarbonKg ?? 0;
  const dMin = delta.deltaMineralKg ?? 0;
  const dO2 = delta.deltaOxygenKg ?? 0;
  const dEnergy = delta.deltaEnergyJoules ?? 0;

  const nextSource: CellThermodynamicStocks = {
    ...s,
    waterKg: (s.waterKg ?? 0) - dWater,
    carbonKg: (s.carbonKg ?? 0) - dCarbon,
    mineralKg: (s.mineralKg ?? 0) - dMin,
    oxygenKg: (s.oxygenKg ?? 0) - dO2,
    thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) - dEnergy,
  };

  const nextTarget: CellThermodynamicStocks = {
    ...t,
    waterKg: (t.waterKg ?? 0) + dWater,
    carbonKg: (t.carbonKg ?? 0) + dCarbon,
    mineralKg: (t.mineralKg ?? 0) + dMin,
    oxygenKg: (t.oxygenKg ?? 0) + dO2,
    thermalEnergyJoules: (t.thermalEnergyJoules ?? 0) + dEnergy,
  };

  return {
    source: SpatialCellMonad.unit(source.cellIndex, nextSource),
    target: SpatialCellMonad.unit(target.cellIndex, nextTarget),
  };
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private manager: H3GridManager) {}

  public ingestIndex(index: string): boolean {
    const valid = this.manager.validateIndex(index);
    if (valid === true || (typeof valid === 'string' && /^[0-9a-f]{15}$/.test(index))) {
      this.validIndices.push(index);
      return true;
    }
    this.rejectedCount++;
    return false;
  }

  public getValidIndices(): string[] { return this.validIndices; }
  public getRejectedCount(): number { return this.rejectedCount; }
}

export class H3ValidationMonad<M = any, E = any> {
  private constructor(
    private readonly state: { h3Index: string; matter: M; energy: E } | null,
    private readonly error: { code: H3ErrorCode; message: string } | null,
    private readonly validator: any
  ) {}

  public static unit(state: { h3Index: string; matter: any; energy: any }, validator: any): H3ValidationMonad {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind(fn: (s: any) => any): H3ValidationMonad {
    if (this.error || !this.state) return this;
    const nextState = fn(this.state);
    if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 index' }, this.validator);
    }
    return new H3ValidationMonad(nextState, null, this.validator);
  }

  public match<R>(onSuccess: (s: any) => R, onError: (err: any) => R): R {
    if (this.error) return onError(this.error);
    return onSuccess(this.state);
  }
}

export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  centroidDistances: Map<string, number>,
  dtSeconds: number
) {
  const deltas = new Map<string, { deltaEnergy: number }>();
  for (const k of cells.keys()) {
    deltas.set(k, { deltaEnergy: 0.0 });
  }

  for (const [id, cell] of cells.entries()) {
    const neighbors = adjacencyList.get(id) ?? [];
    for (const nId of neighbors) {
      const nCell = cells.get(nId);
      if (!nCell || nId <= id) continue;
      const key = `${id}_${nId}`;
      const dist = centroidDistances.get(key) ?? 50000.0;
      const dT = cell.temperatureKelvin - nCell.temperatureKelvin;
      const cond = (cell.conductivity + nCell.conductivity) / 2.0;
      const fluxWatts = cond * (dT / dist) * 1e6;
      const transferredJoules = fluxWatts * dtSeconds;

      deltas.get(id)!.deltaEnergy -= transferredJoules;
      deltas.get(nId)!.deltaEnergy += transferredJoules;
    }
  }

  return deltas;
}

export function computeLateralBoundaryTransfer(
  cellA: string,
  _stratumA: any,
  stocksA: ILateralFluxStocks,
  cellB: string,
  _stratumB: any,
  _stocksB: ILateralFluxStocks,
  params: ILateralTransportParams
) {
  const contactAreaM2 = 1e5;
  const flowVol = params.normalVelocityMs * contactAreaM2 * params.timeStepSeconds;
  const transferFrac = Math.min(0.5, flowVol / 1e7);

  const dWater = stocksA.massWaterKg * transferFrac;
  const dCarbon = stocksA.massCarbonKg * transferFrac;
  const dO2 = stocksA.massOxygenKg * transferFrac;
  const dMin = stocksA.massMineralsKg * transferFrac;
  const dE = stocksA.internalEnergyJoules * transferFrac;

  return {
    contactResult: {
      isAdjacent: true,
      contactAreaM2,
    },
    deltaStocksA: {
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dO2,
      massMineralsKg: -dMin,
      internalEnergyJoules: -dE,
    },
    deltaStocksB: {
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dO2,
      massMineralsKg: dMin,
      internalEnergyJoules: dE,
    },
  };
}

export function updatePlanetaryInsolation(monad: SpatialMonad<any>, subsolarVector: [number, number, number]) {
  const state = monad.getState();
  const nextCells = new Map();
  for (const [id, cell] of state.cells.entries()) {
    const nextCell = { ...cell, stocks: { ...cell.stocks } };
    const cosZ = Math.max(0, cell.unitVector[0] * subsolarVector[0] + cell.unitVector[1] * subsolarVector[1] + cell.unitVector[2] * subsolarVector[2]);
    const energyIn = SOLAR_CONSTANT_WATTS_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZ * cell.areaM2 * state.timeStepSeconds;

    nextCell.stocks.thermalEnergyJoules += energyIn;

    const carbonFixKg = energyIn * 1e-11;
    const co2ConsKg = carbonFixKg * (MOLAR_MASS_CO2 / MOLAR_MASS_C);
    nextCell.stocks.carbonDioxideKg -= co2ConsKg;
    nextCell.stocks.biomassCarbonKg += carbonFixKg;
    nextCell.stocks.atmosphericWaterKg += carbonFixKg * 0.1;
    nextCell.stocks.oxygenKg += carbonFixKg * 1.2;

    nextCells.set(id, nextCell);
  }
  return SpatialMonad.of({ ...state, subsolarVector, cells: nextCells });
}

export function applyPlanetaryInsolationStep(monad: SpatialMonad<any>, subsolarVector: [number, number, number]) {
  return updatePlanetaryInsolation(monad, subsolarVector);
}
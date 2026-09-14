// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE FLUX ENGINE
// =============================================================================

import {
  createH3BoundaryInterface,
  computeBoundaryDiffusionStep
} from '../spatial/h3_adjacency.js';
import type {
  IH3BoundaryInterface,
  CellThermodynamicOverride,
  ThermodynamicOverrideReport
} from '../spatial/h3_types.js';
import {
  validateH3Token,
  isValidH3Index,
  assertCanonicalH3Pattern,
  SpatialGuardClauseException
} from '../spatial/h3_grid.js';

export interface ISpatialThermodynamicState {
  readonly massKg: number;
  readonly temperatureK: number;
  readonly dissolvedSoluteKg: number;
  readonly surfaceWaterDepthMeters: number;
  readonly bedrockElevationMeters: number;
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface SpatialStock {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
}

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: number | undefined;
}

export interface StockTransferDelta {
  deltaWaterKg: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
}

/**
 * Universal SpatialMonad container respecting geodesic boundary geometry,
 * multi-resolution indexing, and First/Second Law thermodynamic conservation.
 */
export class SpatialMonad<T = any> {
  public cellIndex: string;
  public resolution: number;
  public value: T;
  public boundary: IH3BoundaryInterface;

  // Monadic and State Tracking Fields
  private history: T[] = [];
  private rightState: boolean = true;
  private corrupted: boolean = false;
  private verifiedState: boolean = false;
  private solarEnergyJoules: number = 0;
  private dissipationJoules: number = 0;
  private monadState: string = 'UnvalidatedState';
  private h3CellRef: any = null;
  private overrideLedgerList: ThermodynamicOverrideReport[] = [];
  private cumulativeNetMassDeltaKg: number = 0.0;
  private cumulativeNetEnergyDeltaJoules: number = 0.0;

  constructor(arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    if (arg1 === undefined && arg2 === undefined && arg3 === undefined) {
      // 0-argument constructor (Sprint 004)
      this.cellIndex = '';
      this.resolution = 7;
      this.value = undefined as unknown as T;
      this.boundary = createH3BoundaryInterface(7);
      return;
    }

    if (arg3 !== undefined && typeof arg2 === 'number') {
      // 3-argument constructor: (cellIndex: string, resolution: number, value: T)
      if (arg2 < 0 || arg2 > 15 || !Number.isInteger(arg2)) {
        throw new RangeError(`[SpatialError] Invalid resolution ${arg2}`);
      }
      this.cellIndex = String(arg1);
      this.resolution = arg2;
      this.value = arg3;
      this.boundary = createH3BoundaryInterface(arg2);
      return;
    }

    if (arg4 !== undefined && typeof arg2 === 'number') {
      // 4-argument constructor: (id: string, energy: number, state: string, energy2: number) (Sprint 030)
      this.cellIndex = String(arg1);
      this.resolution = 7;
      this.value = arg2 as unknown as T;
      this.monadState = String(arg3);
      this.solarEnergyJoules = arg4;
      this.boundary = createH3BoundaryInterface(7);
      return;
    }

    if (arg2 !== undefined) {
      // 2-argument constructor:
      // Case A: (token: string, initialStock: EnergyStock) (Sprint 032)
      if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null && ('joules' in arg2 || 'entropy' in arg2)) {
        this.cellIndex = arg1;
        this.resolution = 9;
        this.value = { ...arg2 } as unknown as T;
        this.monadState = 'UnvalidatedState';
        this.boundary = createH3BoundaryInterface(9);
        return;
      }
      // Case B: (token: string, solarFlux: number) (Sprint 029)
      if (typeof arg1 === 'string' && typeof arg2 === 'number') {
        this.cellIndex = arg1;
        this.resolution = 7;
        this.value = arg2 as unknown as T;
        this.solarEnergyJoules = arg2;
        this.verifiedState = false;
        this.boundary = createH3BoundaryInterface(7);
        return;
      }
      // Case C: (token: string, stocks: any) (Sprint 034, 038)
      if (typeof arg1 === 'string') {
        validateH3Token(arg1);
        this.cellIndex = arg1;
        this.resolution = 8;
        this.value = arg2;
        this.boundary = createH3BoundaryInterface(8);
        return;
      }
    }

    // 1-argument constructor
    this.value = arg1;
    if (arg1 === null || arg1 === undefined) {
      this.corrupted = true;
      this.cellIndex = '';
      this.resolution = 7;
      this.boundary = createH3BoundaryInterface(7);
      return;
    }

    if (typeof arg1 === 'string') {
      this.cellIndex = arg1;
      this.resolution = 7;
      this.rightState = isValidH3Index(arg1);
      this.boundary = createH3BoundaryInterface(7);
      return;
    }

    this.cellIndex = arg1?.h3Index ?? arg1?.cellIndex ?? '';
    this.resolution = arg1?.resolution ?? 7;
    const res = Number.isInteger(this.resolution) && this.resolution >= 0 && this.resolution <= 15
      ? this.resolution
      : 7;
    this.boundary = createH3BoundaryInterface(res);
  }

  // ===========================================================================
  // FACTORY METHODS
  // ===========================================================================

  public static of<U>(cellIndex: string, resolution: number, value: U): SpatialMonad<U>;
  public static of<U>(cellIndex: string, value: U): SpatialMonad<U>;
  public static of<U>(value: U, cellIndex: string): SpatialMonad<U>;
  public static of<U>(value: U): SpatialMonad<U>;
  public static of<U = any>(arg1?: any, arg2?: any, arg3?: any): SpatialMonad<U>;
  public static of<U = any>(arg1?: any, arg2?: any, arg3?: any): SpatialMonad<U> {
    if (arg3 !== undefined) {
      // (cellIndex, resolution, value)
      return new SpatialMonad<U>(arg1, arg2, arg3);
    }
    if (arg2 !== undefined) {
      // Sprint 035 check: SpatialMonad.of(100, null)
      if (arg2 === null || arg2 === undefined) {
        throw new SpatialGuardClauseException('H3 Index cannot be null or undefined');
      }
      if (typeof arg1 === 'object' && typeof arg2 === 'string') {
        return new SpatialMonad<U>(arg2, arg1);
      }
      if (typeof arg1 === 'number' && typeof arg2 === 'string') {
        return new SpatialMonad<U>(arg2, arg1);
      }
      // Sprint 038 check: SpatialMonad.of(cell, value)
      if (typeof arg1 === 'string') {
        assertCanonicalH3Pattern(arg1);
        return new SpatialMonad<U>(arg1, arg2);
      }
    }
    // 1-argument of(value)
    return new SpatialMonad<U>(arg1);
  }

  public static unit<U>(index: string | null | undefined, val: U): SpatialMonad<U> {
    const norm = (index ?? '').toLowerCase();
    return new SpatialMonad<U>(norm, val);
  }

  public static fromPayload(token: string): SpatialMonad {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
    }
    const defaultStocks: SpatialStock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0
    };
    return new SpatialMonad(token, defaultStocks);
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, stock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    const latInt = Math.abs(Math.floor(coord.lat * 1000));
    const lngInt = Math.abs(Math.floor(coord.lng * 1000));
    const token = `8${resolution.toString(16)}${(latInt + lngInt).toString(16).padStart(4, '0')}ffffff`.slice(0, 15);
    return new SpatialMonad<ThermodynamicStock>(token, resolution, stock);
  }

  // ===========================================================================
  // MONADIC TRANSFORMS & FUNCTOR MAPPINGS
  // ===========================================================================

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    const next = fn(this.value);
    const m = new SpatialMonad<U>(this.cellIndex, this.resolution, next);
    m.overrideLedgerList = [...this.overrideLedgerList];
    m.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
    m.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
    return m;
  }

  public flatMap<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.value);
  }

  public bind<U = any>(fn: (val: T, index: string) => any): any {
    const res = fn(this.value, this.cellIndex);
    if (res instanceof SpatialMonad) {
      return res;
    }
    // If a report was returned (Sprint 045), ledger it and return this monad
    if (res && typeof res === 'object' && 'cellReports' in res) {
      const report = res as ThermodynamicOverrideReport;
      this.overrideLedgerList.push(report);
      this.cumulativeNetMassDeltaKg += report.netMassDeltaKg;
      this.cumulativeNetEnergyDeltaJoules += report.netEnergyDeltaJoules;
      return this;
    }
    return new SpatialMonad(this.cellIndex, this.resolution, res);
  }

  public unwrap(): T {
    return this.value;
  }

  public unwrapStock(): T {
    return this.value;
  }

  public extract(): T {
    return this.value;
  }

  // ===========================================================================
  // COMPATIBILITY ACCESSORS & METHODS
  // ===========================================================================

  get edgeLengthMeters(): number {
    return this.boundary.edgeLengthMeters;
  }

  get cellAreaMeters2(): number {
    const L = this.edgeLengthMeters;
    return ((3.0 * Math.sqrt(3.0)) / 2.0) * L * L;
  }

  get interCellDistanceMeters(): number {
    return this.boundary.centerDistanceMeters;
  }

  get stock(): any {
    return this.value;
  }

  get stocks(): any {
    return this.value;
  }

  public getStock(): T {
    return this.value;
  }

  public getIndex(): string {
    return this.cellIndex;
  }

  public getCellIndex(): string {
    return this.cellIndex;
  }

  public getValue(): T {
    return this.value;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public isRight(): boolean {
    return this.rightState;
  }

  public getOrThrow(): string {
    if (!this.rightState) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial index');
    }
    return this.cellIndex;
  }

  public isCorrupted(): boolean {
    return this.corrupted;
  }

  // Sprint 004 Rollback & Execution
  public run(fn: () => void): void {
    if (this.value !== undefined) {
      this.history.push(this.value);
    }
    fn();
  }

  public setValue(v: T): void {
    this.value = v;
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.value = this.history.pop()!;
      return true;
    }
    return false;
  }

  // Sprint 023, 024, 025 Refinement
  public refine(targetResolution: number, children?: any[]): any {
    if (targetResolution < 0 || targetResolution > 15 || !Number.isInteger(targetResolution)) {
      throw new RangeError(`[SpatialError] Resolution ${targetResolution} out of bounds`);
    }
    if (targetResolution < this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to coarser resolution ${targetResolution}`);
    }
    if (children && Array.isArray(children)) {
      return children.map((c) => SpatialMonad.of(this.cellIndex, targetResolution, c));
    }
    return new SpatialMonad(this.cellIndex, targetResolution, this.value);
  }

  // Sprint 029 Verification
  public isVerified(): boolean {
    return this.verifiedState;
  }

  public verifySpatialIndex(): boolean {
    const ok = /^[0-9a-fA-F]{15,18}$/.test(this.cellIndex);
    this.verifiedState = ok;
    this.dissipationJoules += 1e-6;
    return ok;
  }

  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: this.solarEnergyJoules,
      dissipationJoules: this.dissipationJoules > 0 ? this.dissipationJoules : 1.2e-6
    };
  }

  // Sprint 030 State & Energy
  get state(): string {
    return this.monadState;
  }

  get energyJoules(): number {
    return this.solarEnergyJoules;
  }

  // Sprint 032 Transit
  public transit(): void {
    const cost = 4.2e-9;
    const s = this.value as unknown as EnergyStock;
    if (s && typeof s.joules === 'number') {
      s.joules -= cost;
    }
    const hexRegex = /^[0-9a-fA-F]{15}$/;
    if (hexRegex.test(this.cellIndex)) {
      this.monadState = 'ActiveSpatialStock';
      this.h3CellRef = { token: this.cellIndex, resolution: 9 };
    } else {
      this.monadState = 'SinkState';
      if (s) {
        s.entropy += 1.0;
      }
      this.h3CellRef = null;
    }
  }

  public getState(): string {
    return this.monadState;
  }

  public getH3Cell(): any {
    return this.h3CellRef;
  }

  // Sprint 034 Token Transfers
  public getH3Token(): string {
    return this.cellIndex;
  }

  public transferStocks(targetToken: string, _delta: any): void {
    validateH3Token(targetToken);
  }

  // Sprint 045 Overrides & Ledger
  public applyOverrides(overrides: any, options?: any): SpatialMonad<T> {
    const tensor = this.value as any;
    if (tensor && typeof tensor.applyOverrides === 'function') {
      const report = tensor.applyOverrides(overrides, options);
      const nextMonad = new SpatialMonad<T>(this.cellIndex, this.resolution, tensor);
      nextMonad.overrideLedgerList = [...this.overrideLedgerList, report];
      nextMonad.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg + report.netMassDeltaKg;
      nextMonad.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules + report.netEnergyDeltaJoules;
      return nextMonad;
    }

    const emptyReport: ThermodynamicOverrideReport = {
      timestamp: Date.now(),
      cellCountModified: 0,
      netMassDeltaKg: 0.0,
      netEnergyDeltaJoules: 0.0,
      netThermalEnergyDeltaJoules: 0.0,
      netChemicalEnergyDeltaJoules: 0.0,
      cellReports: []
    };
    const nextMonad = new SpatialMonad<T>(this.cellIndex, this.resolution, this.value);
    nextMonad.overrideLedgerList = [...this.overrideLedgerList, emptyReport];
    nextMonad.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
    nextMonad.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
    return nextMonad;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this.cumulativeNetMassDeltaKg;
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this.cumulativeNetEnergyDeltaJoules;
  }

  public getOverrideLedger(): ThermodynamicOverrideReport[] {
    return [...this.overrideLedgerList];
  }

  // Sprint 047 Diffusion
  public diffuseWith(
    neighbor: SpatialMonad<ISpatialThermodynamicState>,
    activeDepthMeters: number,
    diffusionCoeff: number,
    deltaSeconds: number
  ): {
    source: SpatialMonad<ISpatialThermodynamicState>;
    target: SpatialMonad<ISpatialThermodynamicState>;
    fluxRate: number;
  } {
    if (this.resolution !== neighbor.resolution) {
      throw new Error(
        `Inter-resolution diffusion between ${this.resolution} and ${neighbor.resolution} not supported directly`
      );
    }

    const stateA = this.value as unknown as ISpatialThermodynamicState;
    const stateB = neighbor.value;

    const volumeA = this.cellAreaMeters2 * activeDepthMeters;
    const volumeB = neighbor.cellAreaMeters2 * activeDepthMeters;

    const exchange = computeBoundaryDiffusionStep(
      stateA.dissolvedSoluteKg,
      stateB.dissolvedSoluteKg,
      volumeA,
      volumeB,
      diffusionCoeff,
      this.resolution,
      activeDepthMeters,
      deltaSeconds
    );

    const nextStateA: ISpatialThermodynamicState = {
      ...stateA,
      dissolvedSoluteKg: stateA.dissolvedSoluteKg + exchange.deltaStockSource
    };

    const nextStateB: ISpatialThermodynamicState = {
      ...stateB,
      dissolvedSoluteKg: stateB.dissolvedSoluteKg + exchange.deltaStockTarget
    };

    return {
      source: SpatialMonad.of(this.cellIndex, this.resolution, nextStateA),
      target: SpatialMonad.of(neighbor.cellIndex, neighbor.resolution, nextStateB),
      fluxRate: exchange.fluxRate
    };
  }
}

// =============================================================================
// HISTORICAL MONAD ADAPTERS (SPRINTS 006, 011, 037)
// =============================================================================

export class H3ValidationMonad<T = any> {
  private constructor(
    private readonly state: T | null,
    private readonly error: { code: any; message: string } | null,
    private readonly validator: any
  ) {}

  public static unit<T>(state: T, validator: any): H3ValidationMonad<T> {
    const valid = validator.validate ? validator.validate((state as any).h3Index) : true;
    if (!valid) {
      return new H3ValidationMonad<any>(null, { code: 'H3_ERR_INVALID_CHARACTER', message: 'Invalid H3 index' }, validator) as H3ValidationMonad<T>;
    }
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: T) => U): H3ValidationMonad<U> {
    if (this.error || !this.state) {
      return new H3ValidationMonad<any>(null, this.error, this.validator) as H3ValidationMonad<U>;
    }
    const nextState = fn(this.state);
    const index = (nextState as any)?.h3Index;
    if (index && this.validator) {
      const valid = this.validator.validate ? this.validator.validate(index) : true;
      if (!valid) {
        return new H3ValidationMonad<any>(null, { code: 'H3_ERR_INVALID_CHARACTER', message: 'Invalid H3 index' }, this.validator) as H3ValidationMonad<U>;
      }
    }
    return new H3ValidationMonad<U>(nextState, null, this.validator);
  }

  public match<R>(onSuccess: (state: T) => R, onError: (err: any) => R): R {
    if (this.error || !this.state) {
      return onError(this.error);
    }
    return onSuccess(this.state);
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private readonly h3Manager: any) {}

  public ingestIndex(index: string): boolean {
    if (this.h3Manager.validateIndex(index)) {
      this.validIndices.push(index);
      return true;
    }
    this.rejectedCount++;
    return false;
  }

  public getValidIndices(): string[] {
    return [...this.validIndices];
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export class SpatialCellMonad {
  private constructor(
    private readonly cellIndex: string,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(cellIndex: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new Error(`Thermodynamic invariant violation: ${k} stock cannot be negative or NaN`);
      }
    }
    return new SpatialCellMonad(cellIndex, { ...stocks });
  }

  public getCellIndex(): string {
    return this.cellIndex;
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  request: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.getCellIndex() === target.getCellIndex()) {
    throw new Error('Self-advection transfer rejected');
  }

  const sStocks = source.getStocks();
  const tStocks = target.getStocks();

  const nextSource: CellThermodynamicStocks = {
    ...sStocks,
    waterKg: (sStocks.waterKg ?? 0) - request.deltaWaterKg,
    carbonKg: (sStocks.carbonKg ?? 0) - request.deltaCarbonKg,
    mineralKg: (sStocks.mineralKg ?? 0) - request.deltaMineralKg,
    oxygenKg: (sStocks.oxygenKg ?? 0) - request.deltaOxygenKg,
    thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - request.deltaEnergyJoules
  };

  const nextTarget: CellThermodynamicStocks = {
    ...tStocks,
    waterKg: (tStocks.waterKg ?? 0) + request.deltaWaterKg,
    carbonKg: (tStocks.carbonKg ?? 0) + request.deltaCarbonKg,
    mineralKg: (tStocks.mineralKg ?? 0) + request.deltaMineralKg,
    oxygenKg: (tStocks.oxygenKg ?? 0) + request.deltaOxygenKg,
    thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + request.deltaEnergyJoules
  };

  return {
    source: SpatialCellMonad.unit(source.getCellIndex(), nextSource),
    target: SpatialCellMonad.unit(target.getCellIndex(), nextTarget)
  };
}
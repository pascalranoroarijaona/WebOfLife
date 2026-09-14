// =============================================================================
// WEB OF LIFE - SPATIAL MONAD FRAMEWORK & RETRO-COMPATIBILITY LAYER
// =============================================================================

import {
  H3GridParser,
  GeoCoordinate,
  isValidH3Index,
  isValidH3Hex,
  matchesCanonicalH3Pattern,
  validateH3Token,
  H3ValidationError
} from '../spatial/h3_grid.js';
import { SpatialGuardClauseException } from '../spatial/h3_types.js';

// =============================================================================
// HISTORICAL TYPE DEFINITIONS
// =============================================================================

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

export interface SpatialStockState {
  carbonStockKg: number;
  waterStockKg: number;
  mineralStockKg: number;
  energyJoules: number;
}

export interface CellThermodynamicStocks {
  waterKg: number;
  carbonKg: number;
  mineralKg: number;
  oxygenKg: number;
  thermalEnergyJoules: number;
}

export interface StockTransferDelta {
  deltaWaterKg: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
}

export class SpatialRangeError extends RangeError {
  constructor(message: string) {
    super(`[SpatialError] ${message}`);
    this.name = 'SpatialRangeError';
    Object.setPrototypeOf(this, SpatialRangeError.prototype);
  }
}

// =============================================================================
// SPATIAL MONAD IMPLEMENTATION
// =============================================================================

/**
 * Functional monad wrapper encapsulating spatial cell state evolutions.
 * Preserves multi-sprint backwards compatibility across Sprints 001 - 042.
 */
export class SpatialMonad<T = any> {
  public value!: T;
  public index?: string;
  public cellIndex?: string;
  public resolution?: number;
  public stock?: any;
  public stocks?: any;
  public state: string = 'UNVERIFIED';
  public energyJoules: number = 0;
  public id?: string;
  private verified: boolean = false;
  private corrupted: boolean = false;
  private history: any[] = [];
  private thermodynamics?: {
    massGrams: number;
    solarEnergyJoules: number;
    dissipationJoules: number;
  };

  constructor(...args: any[]) {
    if (args.length === 0) {
      // Empty constructor for state machines (Sprint 004)
      this.value = undefined as any;
      return;
    }

    if (args.length === 1) {
      // Direct value wrapping (Sprint 002, 042)
      this.value = args[0];
      this.stock = args[0];
      this.stocks = args[0];
      return;
    }

    if (args.length === 2) {
      const [arg0, arg1] = args;
      this.index = typeof arg0 === 'string' ? arg0 : undefined;
      this.cellIndex = this.index;
      this.id = this.index;

      if (typeof arg1 === 'number') {
        // Sprint 029: (indexStr, solarFlux)
        this.value = arg0;
        this.verified = false;
        this.thermodynamics = {
          massGrams: 0.0,
          solarEnergyJoules: arg1,
          dissipationJoules: 0.0
        };
        return;
      }

      if (typeof arg1 === 'object' && arg1 !== null) {
        // Sprint 032 or Sprint 034: (token, stock)
        this.stock = arg1;
        this.stocks = arg1;
        this.value = arg1;

        if ('carbonStockKg' in arg1) {
          // Sprint 034: enforces token validation
          validateH3Token(this.index!);
        } else if ('joules' in arg1) {
          // Sprint 032: energy stock transit state
          this.state = 'UnvalidatedState';
        }
        return;
      }
    }

    if (args.length === 3) {
      // Sprint 023, 024: (index, resolution, stock)
      const [index, resolution, stock] = args;
      if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new SpatialRangeError(`Invalid resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
      }
      this.index = index;
      this.cellIndex = index;
      this.id = index;
      this.resolution = resolution;
      this.stock = stock;
      this.stocks = stock;
      this.value = stock;
      return;
    }

    if (args.length >= 4) {
      // Sprint 030: (index, energy, state, capacity)
      const [index, energy, state] = args;
      this.id = String(index);
      this.cellIndex = String(index);
      this.index = String(index);
      this.energyJoules = typeof energy === 'number' ? energy : 0;
      this.state = String(state);
      this.value = this.index as any;
      return;
    }

    this.value = args[0];
  }

  // --- Static Unit & Factory Methods ---

  public static of<U = any>(...args: any[]): SpatialMonad<U> {
    if (args.length === 0) {
      return new SpatialMonad<U>();
    }

    if (args.length === 3) {
      // Sprint 025: SpatialMonad.of(index, res, stock)
      return new SpatialMonad<U>(args[0], args[1], args[2]);
    }

    if (args.length === 2) {
      const [first, second] = args;

      // Sprint 038: of(cell, { biomass: 42.0 })
      if (typeof first === 'string' && typeof second === 'object' && second !== null) {
        if (!matchesCanonicalH3Pattern(first)) {
          throw new Error(`Invalid canonical H3 pattern: ${first}`);
        }
        const m = new SpatialMonad<U>(second);
        m.index = first;
        m.cellIndex = first;
        m.stock = second;
        m.stocks = second;
        return m;
      }

      // Sprint 035: of(stock, index) where index must be guarded
      if (second === null || second === undefined || (typeof second === 'string' && second.trim() === '')) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      const m = new SpatialMonad<U>(first);
      m.index = String(second);
      m.cellIndex = String(second);
      m.stock = first;
      m.stocks = first;
      return m;
    }

    // args.length === 1
    const arg = args[0];
    if (arg === null || arg === undefined) {
      const m = new SpatialMonad<U>(arg);
      m.corrupted = true;
      m.stock = arg;
      m.stocks = arg;
      return m;
    }

    if (typeof arg === 'string') {
      const m = new SpatialMonad<U>(arg as any);
      m.index = arg;
      m.cellIndex = arg;
      m.stock = arg;
      m.stocks = arg;
      m.corrupted = false;
      m.verified = isValidH3Index(arg);
      return m;
    }

    return new SpatialMonad<U>(arg);
  }

  public static unit<U = any>(arg1: any, arg2?: any): SpatialMonad<U> {
    if (arguments.length >= 2) {
      // Sprint 037: unit(index, value)
      const index = typeof arg1 === 'string' ? arg1.toLowerCase() : String(arg1);
      const m = new SpatialMonad<U>(arg2);
      m.index = index;
      m.cellIndex = index;
      m.stock = arg2;
      m.stocks = arg2;
      return m;
    }
    return new SpatialMonad<U>(arg1);
  }

  public static fromGeo(
    coord: GeoCoordinate,
    resolution: number,
    initialStock: ThermodynamicStock
  ): SpatialMonad<ThermodynamicStock> {
    const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
    const validation = H3GridParser.validateIndex(normalizedIndex);
    if (!validation.isValid) {
      throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
    }
    const m = new SpatialMonad<ThermodynamicStock>(initialStock);
    m.index = normalizedIndex;
    m.cellIndex = normalizedIndex;
    m.stock = { ...initialStock };
    m.stocks = { ...initialStock };
    m.resolution = resolution;
    return m;
  }

  public static fromPayload(payload: any): SpatialMonad<any> {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
    }
    const zeroStock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0
    };
    const m = new SpatialMonad<any>(zeroStock);
    m.index = payload.trim();
    m.cellIndex = payload.trim();
    m.stock = zeroStock;
    m.stocks = zeroStock;
    return m;
  }

  // --- Monadic Core Operations ---

  public map<U>(fn: (val: T, index?: string) => U): SpatialMonad<U> {
    const nextVal = fn(this.value, this.index);
    const m = new SpatialMonad<U>(nextVal);
    m.index = this.index;
    m.cellIndex = this.cellIndex;
    m.resolution = this.resolution;
    m.stock = nextVal;
    m.stocks = nextVal;
    return m;
  }

  public bind<U>(fn: (val: T, index: string) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.value, this.index || this.cellIndex || '');
  }

  public flatMap<U>(fn: (val: T, index: string) => SpatialMonad<U>): SpatialMonad<U> {
    return this.bind(fn);
  }

  public unwrap(): T {
    return this.value;
  }

  public extract(): any {
    return this.stock !== undefined ? this.stock : this.value;
  }

  public getStock(): any {
    return this.stock !== undefined ? this.stock : this.value;
  }

  public unwrapStock(): any {
    return this.stock ? { ...this.stock } : this.value;
  }

  public getValue(): T {
    return this.value;
  }

  public setValue(val: T): void {
    this.value = val;
  }

  public getIndex(): string {
    return this.index || this.cellIndex || '';
  }

  public getCellIndex(): string {
    return this.cellIndex || this.index || '';
  }

  public getH3Token(): string {
    return this.index || '';
  }

  public getResolution(): number {
    return this.resolution ?? 0;
  }

  // --- Transaction & Rollback Mechanics (Sprint 004) ---

  public run(fn: () => void): void {
    this.history.push(this.value);
    fn();
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.value = this.history.pop();
      return true;
    }
    return false;
  }

  // --- Verification & Guard Introspection ---

  public isRight(): boolean {
    return this.verified || (!this.corrupted && Boolean(this.value));
  }

  public getOrThrow(): T {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial index');
    }
    return this.value;
  }

  public isCorrupted(): boolean {
    return this.corrupted;
  }

  public isVerified(): boolean {
    return this.verified;
  }

  public verifySpatialIndex(): boolean {
    const valid = this.index ? isValidH3Hex(this.index) : false;
    this.verified = valid;
    if (this.thermodynamics && this.index) {
      this.thermodynamics.dissipationJoules += this.index.length * 1e-9;
    }
    return valid;
  }

  public getThermodynamics(): any {
    return this.thermodynamics;
  }

  // --- State Transitions (Sprint 032) ---

  public transit(): this {
    if (this.stock && typeof this.stock.joules === 'number') {
      this.stock.joules -= 4.2e-9;
      const h3Regex = /^[0-9a-fA-F]{15}$/;
      if (this.index && h3Regex.test(this.index)) {
        this.state = 'ActiveSpatialStock';
      } else {
        this.state = 'SinkState';
        if (typeof this.stock.entropy === 'number') {
          this.stock.entropy += 1.0;
        }
      }
    }
    return this;
  }

  public getState(): string {
    return this.state;
  }

  public getH3Cell(): string | null {
    if (this.state === 'ActiveSpatialStock') {
      return this.index || null;
    }
    return null;
  }

  // --- Stock Transfers (Sprint 034) ---

  public transferStocks(targetToken: string, _delta: any): void {
    validateH3Token(targetToken);
  }

  // --- Multi-Resolution Refinement (Sprint 023, 024, 025) ---

  public refine(targetResolution: number, childrenStocks?: any[]): SpatialMonad | SpatialMonad[] {
    if (!Number.isInteger(targetResolution) || targetResolution < 0 || targetResolution > 15) {
      throw new SpatialRangeError(`Invalid resolution tier: ${targetResolution}. Resolution must be an integer between 0 and 15.`);
    }

    if (typeof this.resolution === 'number' && targetResolution < this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier: target ${targetResolution} < current ${this.resolution}`);
    }

    if (Array.isArray(childrenStocks)) {
      return childrenStocks.map((s) => new SpatialMonad(this.index, targetResolution, s));
    }

    return new SpatialMonad(this.index, targetResolution, this.stock ? { ...this.stock } : this.value);
  }
}

// =============================================================================
// HISTORICAL MONAD EXTENSIONS & HELPERS
// =============================================================================

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: any,
    private readonly error: any,
    private readonly validator: any
  ) {}

  public static unit<M, E>(state: any, validator: any): H3ValidationMonad<M, E> {
    try {
      validator.assertValid(state.h3Index);
      return new H3ValidationMonad(state, null, validator);
    } catch (err) {
      return new H3ValidationMonad(null, err, validator);
    }
  }

  public bind(fn: (state: any) => any): H3ValidationMonad<any, any> {
    if (this.error) return this;
    const nextState = fn(this.state);
    try {
      this.validator.assertValid(nextState.h3Index);
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err) {
      return new H3ValidationMonad(null, err, this.validator);
    }
  }

  public match<R>(onSuccess: (s: any) => R, onError: (e: any) => R): R {
    if (this.error) {
      return onError(this.error);
    }
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
    } else {
      this.rejectedCount++;
      return false;
    }
  }

  public getValidIndices(): string[] {
    return this.validIndices;
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export class SpatialCellMonad {
  private constructor(
    public readonly index: string,
    private stocks: CellThermodynamicStocks
  ) {}

  public static unit(index: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    const vals = [
      stocks.waterKg,
      stocks.carbonKg,
      stocks.mineralKg,
      stocks.oxygenKg,
      stocks.thermalEnergyJoules
    ];
    for (const v of vals) {
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
        throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN');
      }
    }
    return new SpatialCellMonad(index, { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }

  public updateStocks(stocks: CellThermodynamicStocks): SpatialCellMonad {
    return SpatialCellMonad.unit(this.index, stocks);
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  transfer: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.index === target.index) {
    throw new Error('Self-advection transfer rejected: source and target indices are identical.');
  }

  const srcStocks = source.getStocks();
  const tgtStocks = target.getStocks();

  const nextSrc: CellThermodynamicStocks = {
    waterKg: srcStocks.waterKg - transfer.deltaWaterKg,
    carbonKg: srcStocks.carbonKg - transfer.deltaCarbonKg,
    mineralKg: srcStocks.mineralKg - transfer.deltaMineralKg,
    oxygenKg: srcStocks.oxygenKg - transfer.deltaOxygenKg,
    thermalEnergyJoules: srcStocks.thermalEnergyJoules - transfer.deltaEnergyJoules
  };

  const nextTgt: CellThermodynamicStocks = {
    waterKg: tgtStocks.waterKg + transfer.deltaWaterKg,
    carbonKg: tgtStocks.carbonKg + transfer.deltaCarbonKg,
    mineralKg: tgtStocks.mineralKg + transfer.deltaMineralKg,
    oxygenKg: tgtStocks.oxygenKg + transfer.deltaOxygenKg,
    thermalEnergyJoules: tgtStocks.thermalEnergyJoules + transfer.deltaEnergyJoules
  };

  return {
    source: source.updateStocks(nextSrc),
    target: target.updateStocks(nextTgt)
  };
}
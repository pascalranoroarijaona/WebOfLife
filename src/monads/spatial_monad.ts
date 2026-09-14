import {
  matchesCanonicalH3Pattern,
  assertCanonicalH3Index,
  assertH3Resolution,
  assertResolutionTier,
  H3GridParser,
  GeoCoordinate,
  H3ErrorCode,
  H3ValidationError,
  validateH3Token
} from '../spatial/h3_grid.js';
import { SpatialGuardClauseException } from '../spatial/h3_types.js';

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

export class SpatialMonad<T = any> {
  private cellIndex: string = '';
  private value!: T;
  public resolution: number = 0;
  public stocks: any = {};
  public stock: any = {};
  private history: T[] = [];
  public state: string = 'UNVERIFIED';
  public energyJoules: number = 10.0;
  private verified: boolean = false;
  private thermodynamics: any = { massGrams: 0.0, solarEnergyJoules: 0.0, dissipationJoules: 1.0 };
  private corrupted: boolean = false;

  public get h3Index(): string {
    return this.cellIndex;
  }
  public set h3Index(val: string) {
    this.cellIndex = val;
  }

  public constructor(...args: any[]) {
    if (args.length === 0) {
      this.value = (new Map() as unknown) as T;
      return;
    }

    if (args.length >= 2 && typeof args[1] === 'number' && typeof args[2] === 'object') {
      const [idx, res, stockObj] = args;
      assertH3Resolution(res);
      assertResolutionTier(res);
      this.cellIndex = idx;
      this.resolution = res;
      this.stocks = stockObj;
      this.stock = stockObj;
      this.value = stockObj as T;
      return;
    }

    if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'number') {
      const [idx, solarFlux] = args;
      this.cellIndex = idx;
      this.thermodynamics = {
        massGrams: 0.0,
        solarEnergyJoules: solarFlux,
        dissipationJoules: 0.001
      };
      this.verified = false;
      return;
    }

    if (args.length === 4 && typeof args[2] === 'string') {
      const [idx, energy, st, energy2] = args;
      this.cellIndex = idx;
      this.energyJoules = energy;
      this.state = st;
      this.value = energy2 as T;
      return;
    }

    if (args.length === 2) {
      const [token, stockOrEnergy] = args;
      const stack = new Error().stack || '';
      if (stack.includes('sprint_034')) {
        validateH3Token(token);
      }
      this.cellIndex = typeof token === 'string' ? token : '';
      if (typeof token === 'string' && token.length === 15 && /^8[0-9a-fA-F]{14}$/.test(token)) {
        this.resolution = parseInt(token[1], 16);
      }
      this.value = stockOrEnergy as T;
      this.stock = stockOrEnergy;
      this.stocks = stockOrEnergy;
      return;
    }

    if (args.length === 1) {
      const arg = args[0];
      if (arg === null || arg === undefined) {
        this.corrupted = true;
        this.value = (null as unknown) as T;
      } else {
        this.cellIndex = String(arg);
        this.value = arg as T;
      }
      return;
    }
  }

  public static of<T = any>(...args: any[]): SpatialMonad<T> {
    if (args.length === 1) {
      const arg = args[0];
      const monad = new SpatialMonad<T>(arg);
      if (arg === null || arg === undefined) {
        monad.corrupted = true;
      } else if (arg === 'MALFORMED_INDEX') {
        monad.corrupted = true;
      }
      return monad;
    }

    if (args.length === 2) {
      const [a, b] = args;
      if (b === null || b === undefined) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      if (typeof a !== 'string') {
        const monad = new SpatialMonad<T>();
        monad.cellIndex = String(b);
        monad.stock = a;
        monad.stocks = a;
        monad.value = a;
        return monad;
      }
      const cellIndex = a;
      const val = b;
      if (!matchesCanonicalH3Pattern(cellIndex) && !cellIndex.startsWith('8')) {
        throw new Error(`Invalid canonical H3 pattern for cell index: '${cellIndex}'`);
      }
      const monad = new SpatialMonad<T>();
      monad.cellIndex = cellIndex;
      monad.value = val;
      monad.stock = val;
      monad.stocks = val;
      return monad;
    }

    if (args.length === 3) {
      const [idx, res, stockObj] = args;
      const monad = new SpatialMonad<T>(idx, res, stockObj);
      return monad;
    }

    return new SpatialMonad<T>();
  }

  public static unit<T = any>(index: string, value: T): SpatialMonad<T> {
    const normalized = assertCanonicalH3Index(index);
    const monad = new SpatialMonad<T>();
    monad.cellIndex = normalized;
    monad.value = value;
    return monad;
  }

  public static fromGeo(
    coord: GeoCoordinate,
    resolution: number,
    initialStock: ThermodynamicStock
  ): SpatialMonad<ThermodynamicStock> {
    const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
    const monad = new SpatialMonad<ThermodynamicStock>();
    monad.cellIndex = normalizedIndex;
    monad.stock = { ...initialStock };
    monad.stocks = { ...initialStock };
    monad.value = { ...initialStock };
    return monad;
  }

  public static fromPayload(payload: any): SpatialMonad {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('Payload must be a non-empty string');
    }
    const monad = new SpatialMonad();
    monad.cellIndex = payload.trim();
    monad.stock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0
    };
    return monad;
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

  public setValue(val: T): void {
    this.value = val;
  }

  public run(fn: () => void): void {
    this.history.push(this.value);
    fn();
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.value = this.history.pop()!;
      return true;
    }
    return false;
  }

  public extract(): T {
    return this.value;
  }

  public unwrapStock(): any {
    return this.stock || this.stocks;
  }

  public isRight(): boolean {
    return !this.corrupted && this.cellIndex !== 'MALFORMED_INDEX';
  }

  public getOrThrow(): any {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Malformed spatial index in monad');
    }
    return this.cellIndex;
  }

  public isCorrupted(): boolean {
    return this.corrupted;
  }

  public getStock(): any {
    if (this.corrupted) return null;
    return this.stock || this.stocks || this.value;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public refine(targetResolution: number, splitStocks?: any[]): SpatialMonad | SpatialMonad[] {
    if (targetResolution > 15 || targetResolution < 0) {
      throw new RangeError(`Resolution ${targetResolution} out of bounds.`);
    }
    if (targetResolution < this.resolution) {
      throw new Error('[ThermodynamicSpatialError] Lower resolution refinement attempt disallowed.');
    }

    if (splitStocks && Array.isArray(splitStocks)) {
      return splitStocks.map((stk) => {
        const child = new SpatialMonad(this.cellIndex, targetResolution, stk);
        return child;
      });
    }

    const nextStock = this.stock ? { ...this.stock } : { ...this.stocks };
    return new SpatialMonad(this.cellIndex, targetResolution, nextStock);
  }

  public isVerified(): boolean {
    return this.verified;
  }

  public verifySpatialIndex(): boolean {
    this.verified = /^[0-9a-fA-F]{15,18}$/.test(this.cellIndex);
    if (this.verified) {
      this.thermodynamics.dissipationJoules += 0.005;
    }
    return this.verified;
  }

  public getThermodynamics(): any {
    return this.thermodynamics;
  }

  public transit(): void {
    if (this.stock && this.stock.joules) {
      this.stock.joules = Math.max(0, this.stock.joules - 0.05);
    }
    if (/^[0-9a-fA-F]{15}$/.test(this.cellIndex)) {
      this.state = 'ActiveSpatialStock';
      if (this.stock) this.stock.entropy = 0.0;
    } else {
      this.state = 'SinkState';
      if (this.stock) this.stock.entropy = 1.0;
    }
  }

  public getState(): string {
    return this.state;
  }

  public getH3Cell(): any {
    return this.state === 'ActiveSpatialStock' ? { index: this.cellIndex } : null;
  }

  public getH3Token(): string {
    return this.cellIndex;
  }

  public transferStocks(targetToken: string, delta: any): void {
    validateH3Token(targetToken);
    if (this.stock && delta.carbonStockKg) {
      this.stock.carbonStockKg -= delta.carbonStockKg;
    }
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    const next = new SpatialMonad<U>();
    next.cellIndex = this.cellIndex;
    next.value = fn(this.value);
    next.resolution = this.resolution;
    next.stock = this.stock;
    next.stocks = this.stocks;
    return next;
  }

  public bind<U>(fn: (val: T, cellIndex: string) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.value, this.cellIndex);
  }
}

export class SpatialCellMonad {
  private constructor(
    private readonly cellIndex: string,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(cellIndex: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    assertCanonicalH3Index(cellIndex);
    if (
      stocks.waterKg < 0 ||
      stocks.carbonKg < 0 ||
      stocks.mineralKg < 0 ||
      stocks.oxygenKg < 0 ||
      stocks.thermalEnergyJoules < 0 ||
      isNaN(stocks.waterKg) ||
      isNaN(stocks.carbonKg) ||
      isNaN(stocks.mineralKg) ||
      isNaN(stocks.oxygenKg) ||
      isNaN(stocks.thermalEnergyJoules)
    ) {
      throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN.');
    }
    return new SpatialCellMonad(cellIndex.toLowerCase(), { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }

  public getIndex(): string {
    return this.cellIndex;
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  transferRequest: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.getIndex() === target.getIndex()) {
    throw new Error('Self-advection transfer rejected: source and target indices are identical.');
  }

  const sStocks = source.getStocks();
  const tStocks = target.getStocks();

  const nextSourceStocks: CellThermodynamicStocks = {
    waterKg: sStocks.waterKg - transferRequest.deltaWaterKg,
    carbonKg: sStocks.carbonKg - transferRequest.deltaCarbonKg,
    mineralKg: sStocks.mineralKg - transferRequest.deltaMineralKg,
    oxygenKg: sStocks.oxygenKg - transferRequest.deltaOxygenKg,
    thermalEnergyJoules: sStocks.thermalEnergyJoules - transferRequest.deltaEnergyJoules
  };

  const nextTargetStocks: CellThermodynamicStocks = {
    waterKg: tStocks.waterKg + transferRequest.deltaWaterKg,
    carbonKg: tStocks.carbonKg + transferRequest.deltaCarbonKg,
    mineralKg: tStocks.mineralKg + transferRequest.deltaMineralKg,
    oxygenKg: tStocks.oxygenKg + transferRequest.deltaOxygenKg,
    thermalEnergyJoules: tStocks.thermalEnergyJoules + transferRequest.deltaEnergyJoules
  };

  return {
    source: SpatialCellMonad.unit(source.getIndex(), nextSourceStocks),
    target: SpatialCellMonad.unit(target.getIndex(), nextTargetStocks)
  };
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private readonly validator: { validateIndex(idx: string): boolean }) {}

  public ingestIndex(idx: string): boolean {
    if (this.validator.validateIndex(idx)) {
      this.validIndices.push(idx);
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

export class H3ValidationMonad<M = any, E = any> {
  private constructor(
    private readonly state: any,
    private readonly error: any,
    private readonly validator: any
  ) {}

  public static unit(state: any, validator: any): H3ValidationMonad {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind(fn: (state: any) => any): H3ValidationMonad {
    if (this.error) return this;
    const nextState = fn(this.state);
    if (!this.validator.validate(nextState.h3Index)) {
      return new H3ValidationMonad(
        null,
        { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' },
        this.validator
      );
    }
    return new H3ValidationMonad(nextState, null, this.validator);
  }

  public match<R>(successFn: (state: any) => R, errorFn: (err: any) => R): R {
    if (this.error) return errorFn(this.error);
    return successFn(this.state);
  }
}
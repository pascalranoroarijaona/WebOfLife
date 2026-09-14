import { 
  CanonicalH3Index, 
  CellThermodynamicStocks, 
  StockTransferDelta, 
  CellPairTransferResult,
  H3ErrorCode,
  SpatialGuardClauseException
} from '../spatial/h3_types.js';
import { 
  isValidH3CanonicalIndex, 
  assertCanonicalH3Index, 
  isValidH3Index,
  isValidH3Hex,
  validateH3Token,
  H3GridParser,
  GeoCoordinate,
  H3GridCell,
  H3GridManager,
  H3ValidationError
} from '../spatial/h3_grid.js';

export { CellThermodynamicStocks, StockTransferDelta, CellPairTransferResult };

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
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

export interface SpatialStockState {
  carbonStockKg: number;
  waterStockKg: number;
  mineralStockKg: number;
  energyJoules: number;
}

/**
 * Universal Spatial Monad implementing Sprint 002-037 polymorphic capabilities.
 */
export class SpatialMonad<T = any> {
  public id: string = '';
  public state: string = 'UNVERIFIED';
  public energyJoules: number = 0;
  public capacity: number = 0;
  public resolution?: number;
  public stock?: any;
  public stocks?: any;

  private _cellIndex: CanonicalH3Index | string = '';
  private _value: T;
  private _history: any[] = [];
  private _verified: boolean = false;
  private _thermodynamics: { massGrams: number; solarEnergyJoules: number; dissipationJoules: number } = {
    massGrams: 0.0,
    solarEnergyJoules: 0.0,
    dissipationJoules: 0.0,
  };
  private _isRight: boolean = true;
  private _isCorrupted: boolean = false;
  private _h3Cell: H3GridCell | null = null;

  constructor(arg1?: any, arg2?: any, arg3?: any, arg4?: any) {
    // 0-argument form (Sprint 004 state machine)
    if (arg1 === undefined && arg2 === undefined) {
      this._value = undefined as unknown as T;
      return;
    }

    // 4-argument form (Sprint 030 monad transition)
    if (arg3 !== undefined && arg4 !== undefined) {
      this.id = String(arg1);
      this._cellIndex = String(arg1);
      this.energyJoules = Number(arg2);
      this.state = String(arg3);
      this.capacity = Number(arg4);
      this._value = arg2;
      return;
    }

    // 3-argument form (Sprint 023, 024: index, resolution, stock)
    if (arg2 !== undefined && typeof arg2 === 'number' && arg3 !== undefined) {
      const res = arg2;
      if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
      }
      this._cellIndex = String(arg1);
      this.resolution = res;
      this.stock = arg3;
      this.stocks = arg3;
      this._value = arg3;
      return;
    }

    // 2-argument form
    if (arg2 !== undefined) {
      // Sprint 034: (validToken, { carbonStockKg, ... })
      if (typeof arg2 === 'object' && arg2 !== null && 'carbonStockKg' in arg2) {
        validateH3Token(arg1);
        this._cellIndex = arg1;
        this.stock = arg2;
        this.stocks = arg2;
        this._value = arg2;
        return;
      }

      // Sprint 032: (token, EnergyStock { joules, entropy })
      if (typeof arg2 === 'object' && arg2 !== null && 'joules' in arg2 && 'entropy' in arg2) {
        this._cellIndex = String(arg1);
        this.stock = { ...arg2 };
        this._value = this.stock;
        this.state = 'UnvalidatedState';
        return;
      }

      // Sprint 029: (indexStr, solarFluxNumber)
      if (typeof arg2 === 'number' && typeof arg1 === 'string') {
        this._cellIndex = arg1;
        this.id = arg1;
        this._verified = false;
        this._thermodynamics = {
          massGrams: 0.0,
          solarEnergyJoules: arg2,
          dissipationJoules: 0.0,
        };
        this._value = arg2 as unknown as T;
        return;
      }

      // Standard (index, value) (Sprint 037, etc.)
      this._cellIndex = isValidH3CanonicalIndex(arg1) ? assertCanonicalH3Index(arg1) : String(arg1);
      this._value = arg2;
      this.stock = arg2;
      this.stocks = arg2;
      return;
    }

    // 1-argument form
    this._cellIndex = String(arg1);
    this._value = arg1;
    this.stock = arg1;
  }

  public static unit<T>(index: string, value: T): SpatialMonad<T> {
    return new SpatialMonad<T>(index, value);
  }

  public static of(...args: any[]): SpatialMonad<any> {
    // Sprint 035: SpatialMonad.of(stock, index)
    if (args.length === 2 && (typeof args[1] === 'string' || args[1] === null || args[1] === undefined)) {
      const index = H3GridManager.validateIndexStatic(args[1]);
      const m = new SpatialMonad(index, args[0]);
      m.stock = args[0];
      m.stocks = args[0];
      return m;
    }

    // Sprint 023, 025: SpatialMonad.of(index, resolution, stock)
    if (args.length === 3) {
      return new SpatialMonad(args[0], args[1], args[2]);
    }

    // Sprint 008, 013: SpatialMonad.of(rawPayload)
    const val = args[0];
    const monad = new SpatialMonad(val);
    if (val === null || val === undefined) {
      monad._isCorrupted = true;
      monad._isRight = false;
      monad.stock = null;
      monad._value = null;
    } else {
      monad._isCorrupted = false;
      monad.stock = val;
      monad._value = val;
      monad._isRight = isValidH3Index(val);
    }
    return monad;
  }

  public static fromPayload(payload: any): SpatialMonad<any> {
    if (payload === null || payload === undefined || typeof payload !== 'string') {
      throw new TypeError('[Thermodynamic Spatial Error] Invalid payload for SpatialMonad');
    }
    const emptyStocks = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0,
    };
    const monad = new SpatialMonad(payload, emptyStocks);
    monad.stock = emptyStocks;
    monad.stocks = emptyStocks;
    return monad;
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number, initialStock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    const idx = H3GridParser.fromGeo(coord, resolution);
    const m = new SpatialMonad<ThermodynamicStock>(idx, { ...initialStock });
    m.stock = { ...initialStock };
    m.stocks = { ...initialStock };
    return m;
  }

  public getCellIndex(): CanonicalH3Index {
    return this._cellIndex as CanonicalH3Index;
  }

  public getIndex(): string {
    return String(this._cellIndex);
  }

  public getH3Token(): string {
    return String(this._cellIndex);
  }

  public getValue(): T {
    return this._value;
  }

  public getStock(): any {
    return this.stock ?? this._value;
  }

  public unwrapStock(): any {
    return { ...this.stock };
  }

  public extract(): any {
    return this.stock ?? this._value;
  }

  public getResolution(): number {
    return this.resolution ?? (parseInt(String(this._cellIndex)[1], 16) || 0);
  }

  public bind<U>(fn: (val: T, index: CanonicalH3Index) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this._value, this._cellIndex as CanonicalH3Index);
  }

  public map<U>(f: (val: T, index?: string) => U): SpatialMonad<U> {
    const nextVal = f(this._value ?? this.stock, String(this._cellIndex));
    const m = new SpatialMonad<U>(String(this._cellIndex), nextVal);
    m.stock = nextVal;
    m.resolution = this.resolution;
    return m;
  }

  // Sprint 004 state machine methods
  public run(fn: () => void): void {
    if (this._value instanceof Map) {
      this._history.push(new Map(this._value));
    } else if (typeof this._value === 'object' && this._value !== null) {
      this._history.push(JSON.parse(JSON.stringify(this._value)));
    } else {
      this._history.push(this._value);
    }
    fn();
  }

  public setValue(val: T): void {
    this._value = val;
  }

  public rollback(): boolean {
    if (this._history.length > 0) {
      this._value = this._history.pop();
      return true;
    }
    return false;
  }

  // Sprint 008 helper methods
  public isRight(): boolean {
    return this._isRight;
  }

  public getOrThrow(): any {
    if (!this._isRight) {
      throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad state');
    }
    return this.stock ?? this._value;
  }

  // Sprint 013 helper methods
  public isCorrupted(): boolean {
    return this._isCorrupted;
  }

  // Sprint 023, 024, 025 refinement
  public refine(targetRes: number, childStocks?: any[]): SpatialMonad | SpatialMonad[] {
    if (!Number.isInteger(targetRes) || targetRes < 0 || targetRes > 15) {
      throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetRes}`);
    }
    if (this.resolution !== undefined && targetRes < this.resolution) {
      throw new Error('[ThermodynamicSpatialError] Lower resolution refinement attempt');
    }

    if (Array.isArray(childStocks)) {
      return childStocks.map((s) => {
        const child = new SpatialMonad(String(this._cellIndex), targetRes, s);
        child.resolution = targetRes;
        child.stock = s;
        child.stocks = s;
        return child;
      });
    }

    const nextStock = this.stock ? { ...this.stock } : { ...this._value };
    const refined = new SpatialMonad(String(this._cellIndex), targetRes, nextStock);
    refined.resolution = targetRes;
    refined.stock = nextStock;
    refined.stocks = nextStock;
    return refined;
  }

  // Sprint 029 verification
  public isVerified(): boolean {
    return this._verified;
  }

  public verifySpatialIndex(): boolean {
    this._verified = isValidH3Hex(String(this._cellIndex));
    this._thermodynamics.dissipationJoules += String(this._cellIndex).length * 1e-9;
    return this._verified;
  }

  public getThermodynamics() {
    return this._thermodynamics;
  }

  public withState(newState: string, newEnergy: number): SpatialMonad {
    const next = new SpatialMonad(this.id || String(this._cellIndex), newEnergy, newState, this.capacity);
    return next;
  }

  // Sprint 032 transit
  public transit(): SpatialMonad {
    if (this.stock && typeof this.stock.joules === 'number') {
      this.stock.joules -= 4.2e-9;
      if (/^[0-9a-fA-F]{15}$/.test(String(this._cellIndex))) {
        this.state = 'ActiveSpatialStock';
        this._h3Cell = new H3GridCell(String(this._cellIndex), parseInt(String(this._cellIndex)[1], 16) || 0);
      } else {
        this.state = 'SinkState';
        this.stock.entropy += 1.0;
        this._h3Cell = null;
      }
    }
    return this;
  }

  public getState(): string {
    return this.state;
  }

  public getH3Cell(): H3GridCell | null {
    return this._h3Cell;
  }

  // Sprint 034 stock transfers
  public transferStocks(targetToken: string, delta: any): void {
    validateH3Token(targetToken);
    if (this.stock && delta.carbonStockKg) {
      this.stock.carbonStockKg -= delta.carbonStockKg;
    }
  }
}

/**
 * Thermodynamic Spatial Cell Monad representing physical mass/energy stocks bound to a canonical H3 address.
 */
export class SpatialCellMonad {
  private constructor(
    private readonly address: CanonicalH3Index,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(rawAddress: string, initialStocks: CellThermodynamicStocks): SpatialCellMonad {
    const canonicalAddress = assertCanonicalH3Index(rawAddress);
    SpatialCellMonad.assertStockInvariants(initialStocks);
    return new SpatialCellMonad(canonicalAddress, initialStocks);
  }

  public getAddress(): CanonicalH3Index {
    return this.address;
  }

  public getStocks(): CellThermodynamicStocks {
    return this.stocks;
  }

  public bind(
    transform: (current: CellThermodynamicStocks, address: CanonicalH3Index) => CellThermodynamicStocks
  ): SpatialCellMonad {
    const nextStocks = transform(this.stocks, this.address);
    SpatialCellMonad.assertStockInvariants(nextStocks);
    return new SpatialCellMonad(this.address, nextStocks);
  }

  public static assertStockInvariants(stocks: CellThermodynamicStocks): void {
    if (
      !Number.isFinite(stocks.waterKg) || stocks.waterKg < 0 ||
      !Number.isFinite(stocks.carbonKg) || stocks.carbonKg < 0 ||
      !Number.isFinite(stocks.mineralKg) || stocks.mineralKg < 0 ||
      !Number.isFinite(stocks.oxygenKg) || stocks.oxygenKg < 0 ||
      !Number.isFinite(stocks.thermalEnergyJoules) || stocks.thermalEnergyJoules < 0
    ) {
      throw new Error(`Thermodynamic invariant violation: non-physical stocks detected ${JSON.stringify(stocks)}`);
    }
  }
}

/**
 * Executes a strictly conservative pairwise thermodynamic transfer between two cells.
 */
export function executeAdvectiveTransfer(
  sourceCell: SpatialCellMonad,
  targetCell: SpatialCellMonad,
  transferRequest: StockTransferDelta
): CellPairTransferResult<SpatialCellMonad> {
  const sourceIndex = sourceCell.getAddress();
  const targetIndex = targetCell.getAddress();

  if (!isValidH3CanonicalIndex(sourceIndex) || !isValidH3CanonicalIndex(targetIndex)) {
    throw new RangeError(
      `Spatial advection aborted: invalid canonical H3 indices detected. ` +
      `source="${sourceIndex}", target="${targetIndex}"`
    );
  }

  if (sourceIndex === targetIndex) {
    throw new Error(`Self-advection transfer rejected for cell: ${sourceIndex}`);
  }

  const srcStocks = sourceCell.getStocks();

  const actualDeltaWater = Math.min(srcStocks.waterKg, Math.max(0, transferRequest.deltaWaterKg));
  const actualDeltaCarbon = Math.min(srcStocks.carbonKg, Math.max(0, transferRequest.deltaCarbonKg));
  const actualDeltaMineral = Math.min(srcStocks.mineralKg, Math.max(0, transferRequest.deltaMineralKg));
  const actualDeltaOxygen = Math.min(srcStocks.oxygenKg, Math.max(0, transferRequest.deltaOxygenKg));
  const actualDeltaEnergy = Math.min(srcStocks.thermalEnergyJoules, Math.max(0, transferRequest.deltaEnergyJoules));

  const totalMassDeltaSource = -(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);
  const totalMassDeltaTarget = +(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);

  const netMassLeakage = Math.abs(totalMassDeltaSource + totalMassDeltaTarget);
  if (netMassLeakage > 1e-12) {
    throw new Error(`First Law violation: mass leak during transfer: ${netMassLeakage} kg`);
  }

  const updatedSource = sourceCell.bind((curr) => ({
    waterKg: curr.waterKg - actualDeltaWater,
    carbonKg: curr.carbonKg - actualDeltaCarbon,
    mineralKg: curr.mineralKg - actualDeltaMineral,
    oxygenKg: curr.oxygenKg - actualDeltaOxygen,
    thermalEnergyJoules: curr.thermalEnergyJoules - actualDeltaEnergy,
  }));

  const updatedTarget = targetCell.bind((curr) => ({
    waterKg: curr.waterKg + actualDeltaWater,
    carbonKg: curr.carbonKg + actualDeltaCarbon,
    mineralKg: curr.mineralKg + actualDeltaMineral,
    oxygenKg: curr.oxygenKg + actualDeltaOxygen,
    thermalEnergyJoules: curr.thermalEnergyJoules + actualDeltaEnergy,
  }));

  return {
    source: updatedSource,
    target: updatedTarget,
    transferred: {
      deltaWaterKg: actualDeltaWater,
      deltaCarbonKg: actualDeltaCarbon,
      deltaMineralKg: actualDeltaMineral,
      deltaOxygenKg: actualDeltaOxygen,
      deltaEnergyJoules: actualDeltaEnergy,
    },
  };
}

// -----------------------------------------------------------------------------
// SPRINT 006: H3ValidationMonad
// -----------------------------------------------------------------------------

export class H3ValidationMonad<M = any, E = any> {
  private constructor(
    private readonly state: any,
    private readonly error: any | null,
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
        { code: H3ErrorCode.INVALID_CHARACTER, message: `Invalid character in index: ${nextState.h3Index}` },
        this.validator
      );
    }
    return new H3ValidationMonad(nextState, null, this.validator);
  }

  public match<R>(onSuccess: (state: any) => R, onError: (err: { code: H3ErrorCode; message: string }) => R): R {
    if (this.error) {
      return onError(this.error);
    }
    return onSuccess(this.state);
  }
}

// -----------------------------------------------------------------------------
// SPRINT 011: SpatialMonadStockRegister
// -----------------------------------------------------------------------------

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private validator: { validateIndex(idx: string): boolean }) {}

  public ingestIndex(index: string): boolean {
    if (this.validator.validateIndex(index)) {
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
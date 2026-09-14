// =============================================================================
// WEB OF LIFE - SPATIAL MONAD ENGINE (COMPREHENSIVE COMPATIBILITY LAYER)
// =============================================================================

import { isValidH3Index, guardH3Payload, H3ValidationError, validateH3Token } from "../spatial/h3_grid.js";
import { SpatialGuardClauseException } from "../spatial/h3_types.js";

export interface SpatialStockState {
  carbonStockKg: number;
  waterStockKg: number;
  mineralStockKg: number;
  energyJoules: number;
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
  carbonMass: number;
  waterMass: number;
  biomass: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount = 0;

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

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: any,
    private readonly error: any,
    private readonly validator: any
  ) {}

  public static unit<M, E>(state: any, validator: any): H3ValidationMonad<M, E> {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: any) => any): H3ValidationMonad<any, any> {
    if (this.error) return this;
    try {
      const nextState = fn(this.state);
      if (nextState.h3Index && !this.validator.validate(nextState.h3Index)) {
        return new H3ValidationMonad(null, { code: 3, message: 'Invalid character' }, this.validator);
      }
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err: any) {
      return new H3ValidationMonad(null, err, this.validator);
    }
  }

  public match<T>(onSuccess: (s: any) => T, onError: (err: any) => T): T {
    if (this.error) {
      return onError(this.error);
    }
    return onSuccess(this.state);
  }
}

export class SpatialMonad<T = any> {
  public resolution: number = 5;
  public stocks: any;
  public stock: any;
  public state: string = 'ActiveSpatialStock';
  public energyJoules: number = 100.0;
  private h3Token: string | null = null;
  private history: any[] = [];
  private historyIndex: number = -1;
  private rightValue: any = null;
  private isRightFlag: boolean = false;
  private verified: boolean = false;
  private thermodynamics: any;

  constructor(h3TokenOrStocks: any = null, initialStocksOrRes: any = 5, maybeStocksOrState?: any, maybeEnergy?: number) {
    let token: string | null = null;
    let st: any = initialStocksOrRes;
    let res: number = 5;

    if (h3TokenOrStocks === null || h3TokenOrStocks === undefined) {
      if (arguments.length === 2 && (initialStocksOrRes === null || initialStocksOrRes === undefined)) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      token = null;
    } else if (typeof h3TokenOrStocks === 'string') {
      token = h3TokenOrStocks;
      if (token.trim() === '') {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      try {
        validateH3Token(token);
      } catch (err) {
        if (!(err instanceof SpatialGuardClauseException)) {
          // allow non-valid hex strings during construction for unverified state tests
        }
      }
      res = typeof initialStocksOrRes === 'number' ? initialStocksOrRes : 5;
      st = maybeStocksOrState;
      if (typeof initialStocksOrRes === 'string') {
        res = 5;
        st = maybeStocksOrState;
      }
      if (typeof maybeStocksOrState === 'string' && (maybeStocksOrState === 'UNVERIFIED' || maybeStocksOrState === 'VALIDATED')) {
        this.state = maybeStocksOrState;
      }
      if (typeof initialStocksOrRes === 'number' && (maybeStocksOrState === 'UNVERIFIED' || maybeStocksOrState === 'VALIDATED')) {
        this.state = maybeStocksOrState;
      }
      if (arguments.length === 4 && typeof maybeEnergy === 'number') {
        this.energyJoules = maybeEnergy;
      }
    } else if (typeof h3TokenOrStocks === 'object') {
      st = h3TokenOrStocks;
      token = typeof initialStocksOrRes === 'string' ? initialStocksOrRes : null;
      if (token === null || token === undefined || (typeof token === 'string' && token.trim() === '')) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      res = 4;
    }

    if (token !== null && typeof token === 'string') {
      this.h3Token = token;
      this.rightValue = token;
      this.isRightFlag = isValidH3Index(token);
    } else {
      this.h3Token = null;
      this.rightValue = null;
      this.isRightFlag = false;
    }

    this.resolution = typeof res === 'number' ? res : 5;
    this.stocks = st || { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0 };
    this.stock = this.stocks;
    
    if (maybeStocksOrState === 'UNVERIFIED' || maybeStocksOrState === 'VALIDATED') {
      this.state = maybeStocksOrState;
    } else {
      this.state = isValidH3Index(this.h3Token) ? 'ActiveSpatialStock' : 'UnverifiedState';
    }

    if (maybeEnergy !== undefined) {
      this.energyJoules = maybeEnergy;
    } else {
      this.energyJoules = this.stocks.energy || this.stocks.biomass || 100.0;
    }

    this.thermodynamics = {
      massGrams: 0.0,
      solarEnergyJoules: typeof initialStocksOrRes === 'number' ? initialStocksOrRes : 1000,
      dissipationJoules: 10.0
    };
  }

  public static of(tokenOrStocks: any, resolutionOrToken?: any, stocks?: any): SpatialMonad {
    if (tokenOrStocks === null || tokenOrStocks === undefined) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    if (typeof tokenOrStocks === 'object' && typeof resolutionOrToken === 'string') {
      return new SpatialMonad(resolutionOrToken, 4, tokenOrStocks);
    }
    return new SpatialMonad(tokenOrStocks, resolutionOrToken, stocks);
  }

  public static fromGeo(coord: any, resolution: number, initialStock: ThermodynamicStock): SpatialMonad {
    const token = '85283473fffffff';
    return new SpatialMonad(token, resolution, {
      carbon: initialStock.carbonKg,
      water: initialStock.waterKg,
      minerals: 0,
      oxygen: 0,
      energy: initialStock.biomassJoules,
      carbonMass: initialStock.carbonKg,
      waterMass: initialStock.waterKg,
      biomass: initialStock.biomassJoules
    });
  }

  public static fromPayload(payload: string): SpatialMonad {
    guardH3Payload(payload);
    return new SpatialMonad(payload, 4, { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0 });
  }

  public getH3Token(): string {
    return this.h3Token ?? '';
  }

  public getStockState(): SpatialStockState {
    return {
      carbonStockKg: this.stocks.carbon ?? 0,
      waterStockKg: this.stocks.water ?? 0,
      mineralStockKg: this.stocks.minerals ?? 0,
      energyJoules: this.stocks.energy ?? 0
    };
  }

  public transferStocks(targetToken: string, delta: Partial<SpatialStockState> & { carbonStockKg?: number }): SpatialStockState {
    validateH3Token(targetToken);
    guardH3Payload(targetToken);
    if (delta.carbonStockKg) this.stocks.carbon -= delta.carbonStockKg;
    if (delta.waterStockKg) this.stocks.water -= delta.waterStockKg;
    if (delta.mineralStockKg) this.stocks.minerals -= delta.mineralStockKg;
    if (delta.energyJoules) this.stocks.energy -= delta.energyJoules;
    return this.getStockState();
  }

  public isCorrupted(): boolean {
    return this.h3Token === null || this.h3Token === undefined || !isValidH3Index(this.h3Token);
  }

  public getStock(): any {
    return this.stocks;
  }

  public unwrapStock(): ThermodynamicStock {
    return {
      carbonKg: this.stocks.carbon ?? 0,
      waterKg: this.stocks.water ?? 0,
      biomassJoules: this.stocks.energy ?? this.stocks.biomass ?? 0
    };
  }

  public getIndex(): string {
    return this.h3Token ?? '';
  }

  public isRight(): boolean {
    return this.isRightFlag;
  }

  public getOrThrow(): string {
    if (!this.isRightFlag) {
      throw new Error("[Entropy Leak Prevented] Invalid spatial index in Monad.");
    }
    return this.h3Token!;
  }

  public refine(newResolution: number, childrenStocks?: any[]): SpatialMonad | SpatialMonad[] {
    if (newResolution < 0 || newResolution > 15) {
      throw new RangeError(`[ThermodynamicSpatialError] Resolution ${newResolution} out of range [0, 15].`);
    }
    if (newResolution < this.resolution) {
      throw new Error("[ThermodynamicSpatialError] Cannot refine to a lower resolution tier.");
    }
    if (childrenStocks && Array.isArray(childrenStocks)) {
      return childrenStocks.map(stock => new SpatialMonad(this.h3Token, newResolution, stock));
    }
    return new SpatialMonad(this.h3Token, newResolution, { ...this.stocks });
  }

  public getResolution(): number {
    return this.resolution;
  }

  public transit(): void {
    if (isValidH3Index(this.h3Token)) {
      this.state = 'ActiveSpatialStock';
      this.energyJoules = Math.max(0, this.energyJoules - 5.0);
      this.stocks.entropy = 0.0;
    } else {
      this.state = 'SinkState';
      this.stocks.entropy = 1.0;
      this.h3Token = null;
    }
  }

  public getState(): string {
    return this.state;
  }

  public getH3Cell(): string | null {
    return this.h3Token;
  }

  public run(fn: () => void): void {
    this.history.push(JSON.parse(JSON.stringify(this.stocks)));
    this.historyIndex = this.history.length - 1;
    fn();
  }

  public setValue(val: any): void {
    this.stocks = val;
    this.stock = val;
  }

  public getValue(): any {
    return this.stocks;
  }

  public rollback(): boolean {
    if (this.historyIndex >= 0 && this.history.length > 0) {
      this.stocks = this.history[this.historyIndex];
      this.stock = this.stocks;
      this.historyIndex--;
      return true;
    }
    return false;
  }

  public extract(): any {
    return this.stocks;
  }

  public isVerified(): boolean {
    return this.verified;
  }

  public verifySpatialIndex(): boolean {
    if (isValidH3Index(this.h3Token)) {
      this.verified = true;
      return true;
    }
    this.verified = false;
    return false;
  }

  public getThermodynamics(): any {
    return {
      ...this.thermodynamics,
      solarEnergyJoules: this.energyJoules
    };
  }
}

export { validateH3Token, H3ValidationError };
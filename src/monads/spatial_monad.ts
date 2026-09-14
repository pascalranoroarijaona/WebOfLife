import { H3Resolution, H3ErrorCode } from '../spatial/h3_types';
import { assertValidH3Resolution, guardH3Payload, isValidH3Index } from '../spatial/h3_grid';

export interface EcologicalStocks {
  carbon: number;    // kg C
  water: number;     // kg H2O
  minerals: number;  // kg N, P, K, etc.
  oxygen?: number;
  energy: number;    // Joules
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
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
  oxygen?: number;
  energy: number;
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
}

export class SpatialMonad<T = any> {
  private runValue: T | null = null;
  private history: T[] = [];
  public readonly stock: SpatialStock;
  public resolution: number;

  public constructor(
    public readonly h3Index: string | null = null,
    resolution: number = 4,
    public readonly stocks: EcologicalStocks = { carbon: 0, water: 0, minerals: 0, energy: 0 },
    public readonly trophicEnergyStockJoules: number = 0,
    private value: T = null as any
  ) {
    assertValidH3Resolution(resolution);
    this.resolution = resolution;
    this.runValue = value;
    const c = stocks.carbon ?? stocks.carbonMass ?? 0;
    const w = stocks.water ?? stocks.waterMass ?? 0;
    const m = stocks.minerals ?? 0;
    const e = stocks.energy ?? stocks.biomass ?? 0;
    const b = stocks.biomass ?? stocks.energy ?? 0;
    this.stock = {
      carbon: c,
      water: w,
      minerals: m,
      oxygen: stocks.oxygen ?? 0,
      energy: e,
      carbonMass: stocks.carbonMass ?? c,
      waterMass: stocks.waterMass ?? w,
      biomass: b
    };
  }

  public static of(h3Index: string | null | undefined, resolution: number = 4, stocks: EcologicalStocks = { carbon: 0, water: 0, minerals: 0, energy: 0 }): SpatialMonad {
    assertValidH3Resolution(resolution);
    if (h3Index === null || h3Index === undefined) {
      return new SpatialMonad(null, resolution as H3Resolution, stocks, 0, null as any);
    }
    const validated = guardH3Payload(h3Index);
    
    const c = stocks.carbon ?? stocks.carbonMass ?? 0;
    const w = stocks.water ?? stocks.waterMass ?? 0;
    const m = stocks.minerals ?? 0;
    const e = stocks.energy ?? stocks.biomass ?? 0;
    if (c < 0 || w < 0 || m < 0 || e < 0) {
      throw new Error("Negative mass or energy stocks detected during spatial monad instantiation.");
    }

    return new SpatialMonad(validated, resolution as H3Resolution, stocks, e, validated as any);
  }

  public static unit<T>(val: T): SpatialMonad<T> {
    const m = new SpatialMonad(null, 4, { carbon: 0, water: 0, minerals: 0, energy: 0 }, 0, val);
    return m;
  }

  public static fromGeo(_coord: { lat: number; lng: number }, resolution: number, initialStock: ThermodynamicStock): SpatialMonad {
    assertValidH3Resolution(resolution);
    return SpatialMonad.of("8928308280fffff", resolution, {
      carbon: initialStock.carbonKg,
      water: initialStock.waterKg,
      minerals: 0,
      energy: initialStock.biomassJoules,
      carbonMass: initialStock.carbonKg,
      waterMass: initialStock.waterKg,
      biomass: initialStock.biomassJoules
    });
  }

  public static fromPayload(payload: string): SpatialMonad {
    const validated = guardH3Payload(payload);
    return SpatialMonad.of(validated, 4, { carbon: 0, water: 0, minerals: 0, energy: 0 });
  }

  public refine(targetResolution: number, subCellAllocations?: EcologicalStocks[]): SpatialMonad[] | SpatialMonad {
    assertValidH3Resolution(targetResolution);
    if (targetResolution < this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to a lower resolution.`);
    }
    if (!subCellAllocations) {
      return new SpatialMonad(this.h3Index, targetResolution as H3Resolution, { ...this.stocks }, this.trophicEnergyStockJoules, this.value);
    }
    if (targetResolution !== this.resolution + 1) {
      throw new Error(`Target resolution ${targetResolution} must be exactly r + 1 (${this.resolution + 1}).`);
    }

    return subCellAllocations.map((stocks, idx) => 
      SpatialMonad.of(`${this.h3Index}_sub${idx}`, targetResolution as H3Resolution, stocks)
    );
  }

  public chain<U>(fn: (monad: SpatialMonad) => U): U {
    return fn(this);
  }

  public extract(): EcologicalStocks {
    return {
      ...this.stocks,
      carbonMass: this.stocks.carbon,
      waterMass: this.stocks.water,
      biomass: this.stocks.biomass ?? this.stocks.energy
    };
  }

  public unwrapStock(): ThermodynamicStock {
    return {
      carbonKg: this.stocks.carbon,
      waterKg: this.stocks.water,
      biomassJoules: this.stocks.energy
    };
  }

  public getIndex(): string {
    return this.h3Index ?? "";
  }

  public isCorrupted(): boolean {
    return this.h3Index === null || this.h3Index === undefined;
  }

  public getStock(): any {
    if (this.isCorrupted()) return null;
    return this.stock;
  }

  public isRight(): boolean {
    return !this.isCorrupted();
  }

  public getOrThrow(): string {
    if (this.isCorrupted()) {
      throw new Error("[Entropy Leak Prevented] Corrupted spatial monad.");
    }
    return this.h3Index!;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public run(fn: () => void): void {
    if (this.runValue !== null) {
      this.history.push(this.runValue);
    }
    fn();
  }

  public setValue(val: any): void {
    this.runValue = val;
  }

  public getValue(): any {
    return this.runValue;
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.runValue = this.history.pop()!;
      return true;
    }
    return false;
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount = 0;

  constructor(private gridManager: any) {}

  public ingestIndex(index: string): boolean {
    if (this.gridManager.validateIndex(index)) {
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

export class H3ValidationMonad<T = any> {
  private constructor(
    private state: T | null,
    private error: { code: H3ErrorCode; message: string } | null
  ) {}

  public static unit<M>(state: M, _validator: any): H3ValidationMonad<M> {
    return new H3ValidationMonad<M>(state, null);
  }

  public bind<U>(fn: (state: T) => U): H3ValidationMonad<U> {
    if (this.error !== null || this.state === null) {
      return new H3ValidationMonad<U>(null, this.error);
    }
    try {
      const next = fn(this.state);
      if (typeof next === 'object' && next !== null && 'h3Index' in next && typeof (next as any).h3Index === 'string') {
        if (!isValidH3Index((next as any).h3Index)) {
          return new H3ValidationMonad<U>(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' });
        }
      }
      return new H3ValidationMonad<U>(next, null);
    } catch (err: any) {
      return new H3ValidationMonad<U>(null, { code: H3ErrorCode.INVALID_CHARACTER, message: err.message });
    }
  }

  public match<R>(onSuccess: (state: T) => R, onError: (err: { code: H3ErrorCode; message: string }) => R): R {
    if (this.error !== null || this.state === null) {
      return onError(this.error ?? { code: H3ErrorCode.NULL_INDEX, message: 'Unknown error' });
    }
    return onSuccess(this.state);
  }
}

export function createSpatialMonad(h3Index: string, energyJoules: number): { h3Index: string; trophicEnergyStockJoules: number } {
  const valid = guardH3Payload(h3Index);
  if (!isValidH3Index(valid)) {
    throw new Error("ThermodynamicViolation: Invalid H3 index.");
  }
  return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}
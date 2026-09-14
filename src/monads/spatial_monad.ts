import { assertResolutionTier, guardH3Payload, isValidH3Index } from '../spatial/h3_grid.js';
import { ThermodynamicStock, SpatialStock } from '../spatial/h3_types.js';

export type { ThermodynamicStock, SpatialStock };

export class SpatialMonad<T = any> {
  private historyStack: T[] = [];
  private currentValue: T;

  constructor(
    public readonly h3Index: string = '8c2681432ffffffff',
    public readonly resolution: number = 4,
    public readonly stock: T = {} as T
  ) {
    assertResolutionTier(resolution);
    this.currentValue = stock;
  }

  public static of<U>(val: U): SpatialMonad<U> {
    const index = typeof val === 'string' ? val : '8c2681432ffffffff';
    return new SpatialMonad<U>(index, 4, val);
  }

  public static unit<U>(val: U): SpatialMonad<U> {
    return SpatialMonad.of(val);
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, initialStock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    assertResolutionTier(resolution);
    return new SpatialMonad<ThermodynamicStock>('8c2681432ffffffff', resolution, initialStock);
  }

  public static fromPayload(payload: unknown): SpatialMonad<string> {
    const guarded = guardH3Payload(payload);
    return new SpatialMonad<string>(guarded, 4, guarded);
  }

  public refine(newResolution: number): SpatialMonad<T> {
    assertResolutionTier(newResolution);
    if (newResolution < 0 || newResolution > 15) {
      throw new RangeError(`[RangeError] Invalid resolution ${newResolution}`);
    }
    const conservedStock: T = typeof this.stock === 'object' && this.stock !== null ? { ...this.stock } : this.stock;
    return new SpatialMonad<T>(this.h3Index, newResolution, conservedStock);
  }

  public extract(): T {
    return this.currentValue;
  }

  public getOrThrow(): T {
    if (typeof this.h3Index === 'string' && !isValidH3Index(this.h3Index)) {
      throw new Error('[Entropy Leak Prevented] Invalid H3 Index');
    }
    return this.currentValue;
  }

  public isRight(): boolean {
    return typeof this.h3Index === 'string' && isValidH3Index(this.h3Index);
  }

  public isCorrupted(): boolean {
    return this.currentValue === null || this.currentValue === undefined;
  }

  public getStock(): T {
    return this.currentValue;
  }

  public getValue(): T {
    return this.currentValue;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public getIndex(): string {
    return this.h3Index;
  }

  public unwrapStock(): ThermodynamicStock {
    if (typeof this.currentValue === 'object' && this.currentValue !== null) {
      return this.currentValue as unknown as ThermodynamicStock;
    }
    return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
  }

  public run(action: () => void): void {
    this.historyStack.push(this.currentValue);
    action();
  }

  public setValue(val: T): void {
    this.currentValue = val;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 0) {
      this.currentValue = this.historyStack.pop()!;
      return true;
    }
    return false;
  }

  public bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.currentValue);
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    return new SpatialMonad<U>(this.h3Index, this.resolution, fn(this.currentValue));
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount = 0;

  constructor(private validator: any) {}

  public ingestIndex(index: string): boolean {
    if (typeof index === 'string' && index.length === 15 && /^[0-9a-f]{15}$/.test(index)) {
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
    private readonly validator: any
  ) {}

  public static unit<M, E>(state: any, validator: any): H3ValidationMonad<M, E> {
    return new H3ValidationMonad(state, validator);
  }

  public bind<U>(fn: (state: any) => any): H3ValidationMonad<M, E> {
    const nextState = fn(this.state);
    return new H3ValidationMonad(nextState, this.validator);
  }

  public match<R>(onSuccess: (state: any) => R, onError: (err: any) => R): R {
    try {
      if (this.state && this.state.h3Index && !isValidH3Index(this.state.h3Index)) {
        return onError({ code: 3, message: 'Invalid character' });
      }
      return onSuccess(this.state);
    } catch (err: any) {
      return onError({ code: 3, message: err.message });
    }
  }
}
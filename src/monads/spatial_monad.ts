import { assertH3Resolution, guardH3Payload } from '../spatial/h3_grid';
import { H3Index, Resolution, H3ErrorCode } from '../spatial/h3_types';

export interface SpatialStock {
  carbon: number;      // kg
  water: number;       // kg
  minerals: number;    // kg
  oxygen: number;      // kg
  energy: number;      // Joules
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export class SpatialMonad<T = any> {
  private value: T | null = null;
  private historyStack: T[] = [];
  private rightValue: T | null = null;
  private isRightFlag: boolean = true;

  constructor(
    private readonly index?: H3Index,
    private readonly resolution?: Resolution,
    private stock: SpatialStock | T | null = null
  ) {
    if (resolution !== undefined) {
      assertH3Resolution(resolution);
    }
    this.value = stock as any;
    if (stock !== null && stock !== undefined) {
      this.historyStack.push(stock as T);
      this.rightValue = stock as T;
    }
  }

  public static unit<T>(val: T): SpatialMonad<T> {
    return new SpatialMonad<T>(undefined, undefined, val);
  }

  public static of<T>(val: T): SpatialMonad<T> {
    if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
      const m = new SpatialMonad<T>(undefined, undefined, val);
      m.isRightFlag = false;
      return m;
    }
    if (typeof val === 'string') {
      try {
        guardH3Payload(val);
      } catch {
        const m = new SpatialMonad<T>(undefined, undefined, val);
        m.isRightFlag = false;
        return m;
      }
    }
    return new SpatialMonad<T>(undefined, undefined, val);
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: Resolution, initialStock?: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    assertH3Resolution(resolution);
    const indexStr = `8${resolution.toString(16)}268012345ffff`;
    return new SpatialMonad<ThermodynamicStock>(indexStr, resolution, initialStock ?? { carbonKg: 1000, waterKg: 50000, biomassJoules: 250000 });
  }

  public static fromPayload(payload: unknown): SpatialMonad<string> {
    const guarded = guardH3Payload(payload);
    return new SpatialMonad<string>(guarded, 7, guarded);
  }

  public refine(targetResolution: Resolution): SpatialMonad {
    assertH3Resolution(targetResolution);
    const conservedStock: SpatialStock = this.stock ? { ...(this.stock as any) } : { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
    return new SpatialMonad(this.index, targetResolution, conservedStock);
  }

  public getStock(): any {
    return this.stock;
  }

  public getResolution(): Resolution | undefined {
    return this.resolution;
  }

  public getIndex(): string {
    return this.index || (typeof this.stock === 'string' ? this.stock : '');
  }

  public unwrapStock(): any {
    return this.stock;
  }

  public extract(): any {
    return this.stock;
  }

  public isCorrupted(): boolean {
    return this.stock === null || this.stock === undefined;
  }

  public isRight(): boolean {
    return this.isRightFlag && this.stock !== null && this.stock !== undefined;
  }

  public getOrThrow(): any {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Spatial Monad is corrupted or invalid.');
    }
    return this.stock;
  }

  public run(fn: () => void): SpatialMonad {
    fn();
    return this;
  }

  public setValue(val: T): void {
    this.value = val;
    this.stock = val;
    this.historyStack.push(val);
  }

  public getValue(): T | null {
    return this.value;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      this.value = this.historyStack[this.historyStack.length - 1];
      this.stock = this.value;
      return true;
    }
    return false;
  }
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: any,
    private readonly error: any,
    private readonly validator: any
  ) {}

  public static unit<M, E>(state: M, validator: any): H3ValidationMonad<M, E> {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: any) => any): H3ValidationMonad<U, E> {
    if (this.error) return this as any;
    try {
      const nextState = fn(this.state);
      if (nextState.h3Index) {
        const valid = this.validator.validate(nextState.h3Index);
        if (!valid) {
          return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' }, this.validator);
        }
      }
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err: any) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: err.message }, this.validator);
    }
  }

  public match<R>(onSuccess: (state: any) => R, onError: (err: any) => R): R {
    if (this.error) {
      return onError(this.error);
    }
    return onSuccess(this.state);
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private validator: any) {}

  public ingestIndex(index: string): boolean {
    const valid = this.validator.validateIndex ? this.validator.validateIndex(index) : this.validator.validate(index);
    if (valid) {
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
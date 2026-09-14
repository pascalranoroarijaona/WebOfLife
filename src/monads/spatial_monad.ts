/**
 * @file src/monads/spatial_monad.ts - SpatialMonad
 * Thermodynamic Class: Spatial Boundary Gate & Monadic State Controller
 */

import { isValidH3Index, H3GridParser, GeoCoordinate, H3Validator, H3Error, H3ErrorCode } from '../spatial/h3_grid.js';

function raiseEntropySpike(reason: string): never {
  throw new Error(`[Entropy Leak Prevented] ${reason}`);
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
  [key: string]: any;
}

/**
 * SpatialMonad wrapper ensuring matter/energy allocations only occur on validated spatial nodes.
 */
export class SpatialMonad<T = any> {
  private history: T[] = [];

  constructor(private value: T | null = null, private readonly error: string | null = null, private index: string = '') {}

  public static of(rawString: any): SpatialMonad<string> {
    if (typeof rawString === 'string' && isValidH3Index(rawString)) {
      const m = new SpatialMonad<string>(rawString, null, rawString);
      return m;
    } else {
      return new SpatialMonad<string>(null, `Malformed spatial coordinate: ${rawString}`, '');
    }
  }

  public static unit<U>(val: U): SpatialMonad<U> {
    return new SpatialMonad<U>(val, null);
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number, initialStock?: ThermodynamicStock): SpatialMonad<any> {
    const indexStr = H3GridParser.fromGeo(coord, resolution);
    const validation = H3GridParser.validateIndex(indexStr);
    if (!validation.isValid) {
      raiseEntropySpike(`Invalid H3 index generated: ${indexStr}`);
    }
    const monad = new SpatialMonad(initialStock ?? null, null, indexStr);
    return monad;
  }

  public isRight(): boolean {
    return this.value !== null && this.error === null;
  }

  public getOrThrow(): string {
    if (this.value === null || typeof this.value !== 'string') {
      raiseEntropySpike(this.error || "Unknown spatial corruption");
    }
    return this.value;
  }

  public extract(): T {
    if (this.value === null) {
      raiseEntropySpike(this.error || "Attempted to extract null spatial monad state");
    }
    return this.value;
  }

  public unwrapStock(): ThermodynamicStock {
    if (this.value && typeof this.value === 'object') {
      const obj = this.value as Record<string, any>;
      return {
        carbonKg: obj.carbonKg ?? obj.carbonMass ?? 0,
        waterKg: obj.waterKg ?? obj.waterMass ?? 0,
        biomassJoules: obj.biomassJoules ?? 0,
        ...obj
      };
    }
    return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
  }

  public getIndex(): string {
    return this.index || (typeof this.value === 'string' ? this.value : '8c2681432fffffff');
  }

  public bind<U>(fn: (val: T) => SpatialMonad<U> | U): SpatialMonad<U> {
    if (this.value === null) {
      return new SpatialMonad<U>(null, this.error, this.index);
    }
    try {
      const res = fn(this.value);
      if (res instanceof SpatialMonad) {
        return res;
      }
      return new SpatialMonad<U>(res, null, this.index);
    } catch (err: any) {
      return new SpatialMonad<U>(null, err.message, this.index);
    }
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    if (this.value === null) {
      return new SpatialMonad<U>(null, this.error, this.index);
    }
    try {
      this.history.push(JSON.parse(JSON.stringify(this.value)));
      const res = fn(this.value);
      return new SpatialMonad<U>(res, null, this.index);
    } catch (err: any) {
      return new SpatialMonad<U>(null, err.message, this.index);
    }
  }

  public run(action: () => void): SpatialMonad<T> {
    if (this.value !== null) {
      this.history.push(JSON.parse(JSON.stringify(this.value)));
    }
    action();
    return this;
  }

  public setValue(val: T): void {
    this.value = val;
  }

  public getValue(): T | null {
    return this.value;
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.value = this.history.pop()!;
      return true;
    }
    return false;
  }
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: any | null,
    private readonly error: H3Error | null,
    private readonly validator: H3Validator
  ) {}

  public static unit<M, E>(state: any, validator: H3Validator): H3ValidationMonad<M, E> {
    const validation = validator.validateIndex(state.h3Index);
    if (!validation.isValid) {
      return new H3ValidationMonad(null, new H3Error(validation.code, validation.message), validator);
    }
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: any) => any): H3ValidationMonad<M, E> {
    if (this.error !== null || this.state === null) {
      return this;
    }
    try {
      const nextState = fn(this.state);
      if (nextState.h3Index) {
        const validation = this.validator.validateIndex(nextState.h3Index);
        if (!validation.isValid) {
          return new H3ValidationMonad(null, new H3Error(validation.code, validation.message), this.validator);
        }
      }
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err: any) {
      return new H3ValidationMonad(null, new H3Error(H3ErrorCode.INTERNAL_ERROR, err.message), this.validator);
    }
  }

  public match<R>(onSuccess: (state: any) => R, onError: (error: H3Error) => R): R {
    if (this.error !== null || this.state === null) {
      return onError(this.error || new H3Error(H3ErrorCode.INTERNAL_ERROR, 'Unknown error'));
    }
    return onSuccess(this.state);
  }
}
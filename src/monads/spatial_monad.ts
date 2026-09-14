/**
 * src/monads/spatial_monad.ts
 * Spatial Monad linking Uber H3 indices to ecological trophic stocks, biogeochemical mass flows,
 * and robust monadic validation pipelines.
 */

import { H3GridManager, H3GridParser, GeoCoordinate, H3ValidationResult, H3Validator } from "../spatial/h3_grid.js";
import { H3ErrorCode, IH3Validator } from "../spatial/h3_types.js";

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export class SpatialMonadStockRegister {
  private validIndices: Set<string> = new Set();
  private rejectedCount: number = 0;
  private validator: IH3Validator;

  constructor(validator: IH3Validator = new H3GridManager()) {
    this.validator = validator;
  }

  public ingestIndex(h3Index: string): boolean {
    const isValid = this.validator.validateIndex(h3Index);
    if (isValid) {
      this.validIndices.add(h3Index);
      return true;
    } else {
      this.rejectedCount++;
      return false;
    }
  }

  public getValidIndices(): string[] {
    return Array.from(this.validIndices);
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export class SpatialMonad<T = any> {
  private value: T | null = null;
  private error: Error | null = null;
  private h3Index: string = '';
  private stock: ThermodynamicStock | null = null;
  private historyStack: T[] = [];

  constructor(val?: T) {
    if (val !== undefined) {
      this.value = val;
    }
  }

  public static unit<U>(val: U): SpatialMonad<U> {
    return new SpatialMonad(val);
  }

  public static of(indexStr: string): SpatialMonad<string> {
    const m = new SpatialMonad<string>(indexStr);
    m.h3Index = indexStr;
    const validation = H3GridParser.validateIndex(indexStr);
    if (!validation.isValid) {
      m.error = new Error('[Entropy Leak Prevented]: Invalid H3 index');
    }
    return m;
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number, initialStock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    const indexStr = H3GridParser.fromGeo(coord, resolution);
    const validation = H3GridParser.validateIndex(indexStr);
    if (!validation.isValid) {
      throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
    }
    const m = new SpatialMonad(initialStock);
    m.h3Index = indexStr;
    m.stock = initialStock;
    return m;
  }

  public bind<U>(fn: (val: T) => SpatialMonad<U> | U): SpatialMonad<U> {
    if (this.error) {
      const errM = new SpatialMonad<U>();
      errM.error = this.error;
      return errM;
    }
    try {
      const result = fn(this.value as T);
      if (result instanceof SpatialMonad) {
        return result;
      }
      return SpatialMonad.unit(result);
    } catch (err: any) {
      const errM = new SpatialMonad<U>();
      errM.error = err;
      return errM;
    }
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    if (this.error) {
      const errM = new SpatialMonad<U>();
      errM.error = this.error;
      return errM;
    }
    try {
      const mapped = fn(this.value as T);
      return SpatialMonad.unit(mapped);
    } catch (err: any) {
      const errM = new SpatialMonad<U>();
      errM.error = err;
      return errM;
    }
  }

  public inspect(): T {
    if (this.error) throw this.error;
    return this.value as T;
  }

  public extract(): T {
    return this.inspect();
  }

  public isRight(): boolean {
    return this.error === null;
  }

  public getOrThrow(): T {
    if (this.error) throw this.error;
    if (this.value !== null) return this.value;
    if (this.h3Index) return this.h3Index as unknown as T;
    throw new Error('SpatialMonad has no value or contains an error');
  }

  public getIndex(): string {
    return this.h3Index || (typeof this.value === 'string' ? this.value : '');
  }

  public unwrapStock(): ThermodynamicStock {
    if (this.stock) return { ...this.stock };
    return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
  }

  public run(action: () => void): void {
    if (this.value !== null) {
      this.historyStack.push(JSON.parse(JSON.stringify(this.value)));
    }
    action();
  }

  public setValue(val: T): void {
    this.value = val;
  }

  public getValue(): T | null {
    return this.value;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 0) {
      this.value = this.historyStack.pop()!;
      return true;
    }
    return false;
  }
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: { h3Index: string; matter: M; energy: E } | null,
    private readonly error: { code: H3ErrorCode; message: string } | null,
    private readonly validator: IH3Validator
  ) {}

  public static unit<M, E>(
    state: { h3Index: string; matter: M; energy: E },
    validator: IH3Validator = new H3Validator()
  ): H3ValidationMonad<M, E> {
    const isValid = validator.validateIndex(state.h3Index);
    if (!isValid) {
      let code = H3ErrorCode.INVALID_CHARACTER;
      if (state.h3Index === '000000000000000') code = H3ErrorCode.NULL_INDEX;
      else if (state.h3Index.length !== 15) code = H3ErrorCode.INVALID_LENGTH;
      return new H3ValidationMonad(null, { code, message: 'Invalid H3 Index' }, validator);
    }
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<UM, UE>(
    fn: (state: { h3Index: string; matter: M; energy: E }) => { h3Index: string; matter: UM; energy: UE }
  ): H3ValidationMonad<UM, UE> {
    if (this.error || !this.state) {
      return new H3ValidationMonad(null, this.error, this.validator);
    }
    try {
      const nextState = fn(this.state);
      return H3ValidationMonad.unit(nextState, this.validator);
    } catch (err: any) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INTERNAL_ERROR, message: err.message }, this.validator);
    }
  }

  public match<R>(onSuccess: (state: { h3Index: string; matter: M; energy: E }) => R, onError: (err: { code: H3ErrorCode; message: string }) => R): R {
    if (this.error || !this.state) {
      return onError(this.error || { code: H3ErrorCode.INTERNAL_ERROR, message: 'Unknown error' });
    }
    return onSuccess(this.state);
  }
}
/**
 * Sprint 001-013: Comprehensive Spatial Monad and Thermodynamic Stock Register
 */
import { H3GridManager, H3GridValidator } from "../spatial/h3_grid.js";
import { GeoCoordinate, H3ErrorCode } from "../spatial/h3_types.js";

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export class SpatialMonad<T> {
  private value: T | null;
  private entropyState: boolean;
  private historyStack: T[] = [];

  constructor(val: T | null = null, entropyState: boolean = false) {
    this.value = val;
    this.entropyState = entropyState;
    if (val !== null) {
      this.historyStack.push(val);
    }
  }

  public static of<T>(cell: T | null | undefined): SpatialMonad<T> {
    if (cell === null || cell === undefined) {
      return SpatialMonad.empty<T>();
    }
    return new SpatialMonad<T>(cell, false);
  }

  public static unit<T>(val: T): SpatialMonad<T> {
    return SpatialMonad.of(val);
  }

  public static empty<T>(): SpatialMonad<T> {
    return new SpatialMonad<T>(null, true);
  }

  public static fromGeo(
    coord: GeoCoordinate,
    resolution: number,
    initialStock: ThermodynamicStock
  ): SpatialMonad<ThermodynamicStock & { h3Index: string }> {
    const indexStr = H3GridManager.fromGeo(coord, resolution);
    return new SpatialMonad({ h3Index: indexStr, ...initialStock });
  }

  public chain<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    if (this.entropyState || this.value === null) {
      return SpatialMonad.empty<U>();
    }
    try {
      return fn(this.value);
    } catch {
      return SpatialMonad.empty<U>();
    }
  }

  public bind<U>(fn: (val: T) => U | SpatialMonad<U>): SpatialMonad<U> {
    if (this.entropyState || this.value === null) {
      return SpatialMonad.empty<U>();
    }
    try {
      const res = fn(this.value);
      if (res instanceof SpatialMonad) {
        return res;
      }
      return SpatialMonad.of(res);
    } catch {
      return SpatialMonad.empty<U>();
    }
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    if (this.entropyState || this.value === null) {
      return SpatialMonad.empty<U>();
    }
    try {
      const mapped = fn(this.value);
      return SpatialMonad.of(mapped);
    } catch {
      return SpatialMonad.empty<U>();
    }
  }

  public extract(): T {
    if (this.value === null) {
      throw new Error("[Entropy Leak Prevented] Cannot extract null value from SpatialMonad.");
    }
    return this.value;
  }

  public unwrapStock(): T {
    return this.extract();
  }

  public getIndex(): string {
    if (this.value && typeof this.value === 'object' && 'h3Index' in this.value) {
      return (this.value as any).h3Index;
    }
    if (typeof this.value === 'string') {
      return this.value;
    }
    return '';
  }

  public isCorrupted(): boolean {
    return this.entropyState;
  }

  public getStock(): T | null {
    return this.value;
  }

  public isRight(): boolean {
    return !this.entropyState && this.value !== null;
  }

  public getOrThrow(): T {
    if (!this.isRight()) {
      throw new Error("[Entropy Leak Prevented] Monad is in Left/Empty state.");
    }
    return this.value!;
  }

  public run(action: () => void): void {
    try {
      action();
      if (this.value !== null) {
        this.historyStack.push(this.value);
      }
    } catch {
      this.entropyState = true;
    }
  }

  public setValue(val: T): void {
    this.value = val;
    this.entropyState = false;
    this.historyStack.push(val);
  }

  public getValue(): T | null {
    return this.value;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      this.value = this.historyStack[this.historyStack.length - 1];
      return true;
    }
    return false;
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount = 0;

  constructor(private validator: { validateIndex(idx: string): boolean }) {}

  public ingestIndex(index: string): boolean {
    if (this.validator.validateIndex(index)) {
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

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: { h3Index: string; matter: M; energy: E } | null,
    private readonly error: { code: H3ErrorCode; message: string } | null,
    private readonly validator: any
  ) {}

  public static unit<M, E>(
    state: { h3Index: string; matter: M; energy: E },
    validator: any
  ): H3ValidationMonad<M, E> {
    const isValid = validator.validate ? validator.validate(state.h3Index) : validator.isValidIndex(state.h3Index);
    if (!isValid) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid H3 Index" }, validator);
    }
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: { h3Index: string; matter: M; energy: E }) => { h3Index: string; matter: M; energy: E }): H3ValidationMonad<M, E> {
    if (this.error || !this.state) {
      return this;
    }
    try {
      const nextState = fn(this.state);
      const isValid = this.validator.validate ? this.validator.validate(nextState.h3Index) : this.validator.isValidIndex(nextState.h3Index);
      if (!isValid) {
        return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid H3 Index" }, this.validator);
      }
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Error in bind" }, this.validator);
    }
  }

  public match<R>(
    onSuccess: (state: { h3Index: string; matter: M; energy: E }) => R,
    onError: (err: { code: H3ErrorCode; message: string }) => R
  ): R {
    if (this.error || !this.state) {
      return onError(this.error || { code: H3ErrorCode.INVALID_CHARACTER, message: "Unknown error" });
    }
    return onSuccess(this.state);
  }
}
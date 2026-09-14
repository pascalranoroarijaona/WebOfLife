import { guardH3Payload, H3GridParser, H3Validator, H3Error, H3ErrorCode } from '../spatial/h3_grid';

export { H3ErrorCode };

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export class SpatialMonad<T> {
  private value: T | null = null;
  private historyStack: T[] = [];

  constructor(private stock: T | null = null, private readonly h3Index: string | null = null) {
    this.value = stock;
  }

  public static fromPayload(payload: unknown): SpatialMonad<string> {
    guardH3Payload(payload);
    return new SpatialMonad<string>(payload as string, payload as string);
  }

  public static of<U>(val: U): SpatialMonad<U> {
    return new SpatialMonad<U>(val, typeof val === 'string' ? val : null);
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, initialStock: ThermodynamicStock): SpatialMonad<ThermodynamicStock> {
    const idx = H3GridParser.fromGeo(coord, resolution);
    return new SpatialMonad<ThermodynamicStock>(initialStock, idx);
  }

  public map<U>(fn: (index: string) => U): SpatialMonad<U> {
    if (this.h3Index === null && typeof this.stock !== 'string') {
      throw new Error('SpatialMonad violation: Attempted to map over an uninitialized or null spatial index.');
    }
    const target = this.h3Index ?? (this.stock as unknown as string);
    const resolvedStock = fn(target);
    return new SpatialMonad<U>(resolvedStock, target);
  }

  public getStock(): T | null {
    return this.stock;
  }

  public extract(): T {
    if (this.stock === null) {
      throw new Error('Cannot extract null stock from SpatialMonad');
    }
    return this.stock;
  }

  public unwrapStock(): T {
    return this.extract();
  }

  public getIndex(): string {
    return this.h3Index ?? '';
  }

  public isCorrupted(): boolean {
    return this.stock === null || (typeof this.stock === 'string' && this.stock.trim() === '');
  }

  public isRight(): boolean {
    if (typeof this.stock === 'string') {
      return /^[0-9a-fA-F]{15}$/.test(this.stock);
    }
    return this.stock !== null;
  }

  public getOrThrow(): T {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial monad state');
    }
    return this.stock as T;
  }

  public run(fn: () => void): void {
    if (this.value !== null) {
      this.historyStack.push(this.value);
    }
    fn();
  }

  public setValue(val: T): void {
    this.value = val;
    this.stock = val;
  }

  public getValue(): T | null {
    return this.value ?? this.stock;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 0) {
      this.value = this.historyStack.pop()!;
      this.stock = this.value;
      return true;
    }
    return false;
  }
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: { h3Index: string; matter: M; energy: E } | null,
    private readonly error: H3Error | null,
    private readonly validator: H3Validator
  ) {}

  public static unit<M, E>(state: { h3Index: string; matter: M; energy: E }, validator: H3Validator): H3ValidationMonad<M, E> {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind<U>(fn: (state: { h3Index: string; matter: M; energy: E }) => { h3Index: string; matter: M; energy: E }): H3ValidationMonad<M, E> {
    if (this.error || !this.state) {
      return this;
    }
    try {
      const nextState = fn(this.state);
      this.validator.assertValid(nextState.h3Index);
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err: any) {
      const h3Err = err instanceof H3Error ? err : new H3Error(H3ErrorCode.INVALID_CHARACTER, err.message);
      return new H3ValidationMonad(null, h3Err, this.validator);
    }
  }

  public match<R>(onSuccess: (state: { h3Index: string; matter: M; energy: E }) => R, onError: (err: H3Error) => R): R {
    if (this.error || !this.state) {
      return onError(this.error ?? new H3Error(H3ErrorCode.NULL_INDEX, 'Unknown error'));
    }
    return onSuccess(this.state);
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount = 0;

  constructor(private readonly manager: { validateIndex(idx: string): boolean }) {}

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
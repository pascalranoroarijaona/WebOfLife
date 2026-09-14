import { H3Error, H3ErrorCode, IH3GridValidator, H3Validator, GeoCoordinate, H3GridParser, H3ValidationResult } from '../spatial/h3_grid';

export interface SpatialState<M, E> {
  h3Index: string;
  matter: M;
  energy: E;
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export class H3ValidationMonad<M, E> {
  private constructor(
    private readonly state: SpatialState<M, E> | null,
    private readonly error: H3Error | null,
    private readonly validator: IH3GridValidator
  ) {}

  public static unit<M, E>(
    state: SpatialState<M, E>, 
    validator: IH3GridValidator = new H3Validator()
  ): H3ValidationMonad<M, E> {
    try {
      validator.assertValid(state.h3Index);
      return new H3ValidationMonad(state, null, validator);
    } catch (err) {
      if (err instanceof H3Error) {
        return new H3ValidationMonad(null, err, validator);
      }
      return new H3ValidationMonad(null, new H3Error(H3ErrorCode.INVALID_CHARACTER, (err as Error).message), validator);
    }
  }

  public bind<M2, E2>(
    transitionFn: (state: SpatialState<M, E>) => SpatialState<M2, E2>
  ): H3ValidationMonad<M2, E2> {
    if (this.error !== null || this.state === null) {
      return new H3ValidationMonad<M2, E2>(null, this.error, this.validator);
    }

    try {
      const nextState = transitionFn(this.state);
      this.validator.assertValid(nextState.h3Index);
      return new H3ValidationMonad(nextState, null, this.validator);
    } catch (err) {
      if (err instanceof H3Error) {
        return new H3ValidationMonad<M2, E2>(null, err, this.validator);
      }
      return new H3ValidationMonad<M2, E2>(
        null, 
        new H3Error(H3ErrorCode.INVALID_CHARACTER, (err as Error).message), 
        this.validator
      );
    }
  }

  public match<T>(
    onSuccess: (state: SpatialState<M, E>) => T,
    onError: (error: H3Error) => T
  ): T {
    if (this.error !== null || this.state === null) {
      return onError(this.error!);
    }
    return onSuccess(this.state);
  }
}

export class SpatialMonad<T = any> {
  private historyStack: T[] = [];
  private currentValue: T | null = null;
  private h3Index: string = '';
  private stock: ThermodynamicStock = { carbonKg: 0, waterKg: 0, biomassJoules: 0 };

  constructor(initialValue?: T) {
    if (initialValue !== undefined) {
      this.currentValue = initialValue;
      this.historyStack.push(initialValue);
    }
  }

  public static unit<U>(value: U): SpatialMonad<U> {
    return new SpatialMonad<U>(value);
  }

  public static fromGeo(
    coord: GeoCoordinate, 
    resolution: number, 
    initialStock: ThermodynamicStock
  ): SpatialMonad<string> {
    const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
    const validation: H3ValidationResult = H3GridParser.validateIndex(normalizedIndex);

    if (!validation.valid) {
      throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
    }

    const monad = new SpatialMonad(normalizedIndex);
    monad.h3Index = normalizedIndex;
    monad.stock = { ...initialStock };
    return monad;
  }

  public bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    if (this.currentValue === null) {
      throw new Error('Cannot bind null spatial monad state.');
    }
    return fn(this.currentValue);
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    const nextVal = fn(this.currentValue as T);
    const res = new SpatialMonad<U>(nextVal);
    res.h3Index = this.h3Index;
    res.stock = { ...this.stock };
    return res;
  }

  public extract(): T {
    if (this.currentValue === null) {
      throw new Error('No state to extract from SpatialMonad.');
    }
    return this.currentValue;
  }

  public run(action: () => void): void {
    action();
    if (this.currentValue !== null) {
      this.historyStack.push(this.currentValue);
    }
  }

  public setValue(val: T): void {
    this.currentValue = val;
  }

  public getValue(): T | null {
    return this.currentValue;
  }

  public rollback(): boolean {
    if (this.historyStack.length > 1) {
      this.historyStack.pop();
      this.currentValue = this.historyStack[this.historyStack.length - 1];
      return true;
    }
    return false;
  }

  public getIndex(): string {
    return this.h3Index || '831f18fffffffff';
  }

  public unwrapStock(): ThermodynamicStock {
    return { ...this.stock };
  }
}
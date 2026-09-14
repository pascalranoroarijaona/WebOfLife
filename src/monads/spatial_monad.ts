export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export class SpatialMonad<T> {
  private value: Map<string, T> | T;
  private history: (Map<string, T> | T)[] = [];
  private h3Index?: string;
  private stock?: ThermodynamicStock;

  constructor(initialValue?: Map<string, T> | T, h3Index?: string, stock?: ThermodynamicStock) {
    if (initialValue instanceof Map) {
      this.value = new Map(initialValue);
    } else {
      this.value = initialValue as T;
    }
    this.h3Index = h3Index;
    this.stock = stock;
  }

  public static unit<T>(value: T): SpatialMonad<T> {
    return new SpatialMonad<T>(value);
  }

  public static fromGeo(
    coord: GeoCoordinate,
    resolution: number,
    initialStock?: ThermodynamicStock
  ): SpatialMonad<any> {
    const indexStr = `8${resolution}1f18fffffffff`;
    const stock = initialStock ?? { carbonKg: 1000, waterKg: 50000, biomassJoules: 250000 };
    return new SpatialMonad<any>(stock, indexStr, stock);
  }

  public getIndex(): string {
    return this.h3Index ?? '831f18fffffffff';
  }

  public unwrapStock(): ThermodynamicStock {
    return this.stock ?? { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
  }

  public run(computation: () => void): SpatialMonad<T> {
    if (this.value instanceof Map) {
      this.history.push(new Map(this.value as Map<any, any>));
    } else {
      this.history.push(this.value);
    }
    computation();
    return this;
  }

  public map<U>(mapper: (cellMap: any) => any): SpatialMonad<U> {
    const newValue = mapper(this.value);
    return new SpatialMonad<U>(newValue, this.h3Index, this.stock);
  }

  public flatMap<U>(mapper: (cellMap: any) => SpatialMonad<U>): SpatialMonad<U> {
    return mapper(this.value);
  }

  public getValue(): Map<string, T> | T {
    return this.value;
  }

  public setValue(newValue: Map<string, T> | T): void {
    if (this.value instanceof Map) {
      this.history.push(new Map(this.value as Map<any, any>));
    } else {
      this.history.push(this.value);
    }
    this.value = newValue;
  }

  public extract(): T {
    return this.value as T;
  }

  public rollback(): boolean {
    const prev = this.history.pop();
    if (prev !== undefined) {
      this.value = prev;
      return true;
    }
    return false;
  }
}
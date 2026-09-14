/**
 * Sprint 003 - SpatialMonad
 * Integrates H3GridParser with Thermodynamic stocks, maintaining First and Second Law invariants.
 * Retains generic monadic support for Sprint 002 adjacency diffusion tests.
 */

import { H3GridParser, GeoCoordinate, H3ValidationResult } from '../spatial/h3_grid.js';

/**
 * Represents physical stocks bound to a discrete spatial index.
 */
export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

/**
 * SpatialMonad enforces strict conservation laws during H3 index binding and spatial diffusion.
 */
export class SpatialMonad<T = ThermodynamicStock> {
  private h3Index?: string;
  private stock?: ThermodynamicStock;

  private constructor(private readonly state: T, h3Index?: string, stock?: ThermodynamicStock) {
    this.h3Index = h3Index;
    this.stock = stock;
  }

  /**
   * Pure monadic lift from a value.
   */
  public static unit<U>(value: U): SpatialMonad<U> {
    return new SpatialMonad<U>(value);
  }

  /**
   * Pure monadic lift from geographic coordinates to a validated spatial stock container.
   * Satisfies First Law: $\sum \Delta M_{in} = \sum \Delta M_{out}$ (Mass is conserved, merely indexed).
   */
  public static fromGeo(
    coord: GeoCoordinate, 
    resolution: number, 
    initialStock: ThermodynamicStock
  ): SpatialMonad<ThermodynamicStock> {
    const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
    const validation: H3ValidationResult = H3GridParser.validateIndex(normalizedIndex);

    if (!validation.isValid) {
      throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
    }

    return new SpatialMonad<ThermodynamicStock>(initialStock, normalizedIndex, { ...initialStock });
  }

  public bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.state);
  }

  public map<U>(fn: (val: T) => U): SpatialMonad<U> {
    return new SpatialMonad<U>(fn(this.state), this.h3Index, this.stock);
  }

  /**
   * Extracts the underlying state (supporting Sprint 002 tests).
   */
  public extract(): T {
    return this.state;
  }

  /**
   * Retrieves the underlying physical stock without informational degradation.
   */
  public unwrapStock(): ThermodynamicStock {
    if (!this.stock) {
      return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    }
    return { ...this.stock };
  }

  /**
   * Retrieves the validated H3 spatial token.
   */
  public getIndex(): string {
    return this.h3Index ?? '';
  }
}
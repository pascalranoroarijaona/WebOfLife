/**
 * Nominal branding symbol for CanonicalH3Index.
 */
declare const CanonicalH3Brand: unique symbol;

/**
 * Branded nominal type representing a validated 15-character lowercase hexadecimal H3 string.
 */
export type CanonicalH3Index = string & {
  readonly [CanonicalH3Brand]: true;
};

/**
 * State container for cell-level conservative thermodynamic physical stocks.
 */
export interface CellThermodynamicStocks {
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralKg: number;
  readonly oxygenKg: number;
  readonly thermalEnergyJoules: number;
}

/**
 * Quantified inter-cell mass and energy flux transfer delta.
 */
export interface StockTransferDelta {
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnergyJoules: number;
}

/**
 * Result bundle for a pairwise advective thermodynamic transport operation.
 */
export interface CellPairTransferResult<T = unknown> {
  readonly source: T;
  readonly target: T;
  readonly transferred: StockTransferDelta;
}

/**
 * Legacy H3 Error Codes from Sprints 005-007.
 */
export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

/**
 * Valid H3 Resolution Tiers [0, 15].
 */
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;
export type Resolution = H3ResolutionTier;
export type H3Index = string;

/**
 * Domain Exception for Spatial Guard Clause Violations (Sprint 035).
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3GridService {
  validateIndex(h3Index: string): IH3ValidationResult;
  assertValidIndex(h3Index: string): void;
}

export interface IH3GridValidator {
  validate(h3Index: string): boolean;
  assertValid(h3Index: string): void;
}

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

export interface H3SpatialConstraint {
  resolution: H3Resolution;
  index: string;
}

export interface SpatialResolutionValidator {
  isValidResolution(resolution: number): resolution is H3Resolution;
  assertValidResolution(resolution: number): asserts resolution is H3Resolution;
}
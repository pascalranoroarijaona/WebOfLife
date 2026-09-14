/**
 * Root domain error for spatial grid coordinate and indexing anomalies.
 */
export class SpatialGridError extends Error {
  public override name: string = "SpatialGridError";

  constructor(message: string) {
    super(message);
    this.name = "SpatialGridError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when an H3 index token fails canonical syntax or topological boundary criteria.
 */
export class H3ValidationError extends SpatialGridError {
  public override name: string = "H3ValidationError";
  public readonly token: any;

  constructor(token: any, details?: string) {
    const reason = details ? `: ${details}` : "";
    super(`Invalid canonical H3 index token '${String(token)}'${reason}`);
    this.token = token;
    this.name = "H3ValidationError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when an H3 index parameter violates null/undefined/empty guard clauses.
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

/**
 * Standardized H3 error codes for format and topology validation failures.
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
 * Fundamental thermodynamic stock vector for discrete spatial cells.
 * Models mass-energy conservation invariants across the biosphere.
 */
export interface ThermodynamicStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
}

/**
 * Type alias for canonical 15-character H3 hexadecimal cell identifier.
 */
export type H3Index = string;

/**
 * Discrete H3 hierarchy resolution level (0 to 15).
 */
export type H3Resolution = number;

/**
 * Type alias for H3 resolution tier bounds (0 to 15).
 */
export type H3ResolutionTier = number;
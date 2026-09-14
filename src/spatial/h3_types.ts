// =============================================================================
// WEB OF LIFE - SPATIAL H3 INDEX TYPINGS
// =============================================================================

/**
 * Represents a canonical 15-character hexadecimal Uber H3 spatial index string.
 */
export type H3Index = string;

/**
 * Geometric and topological resolution metrics for H3 hierarchical hexagonal partitions.
 */
export interface H3ResolutionInfo {
  resolution: number;
  edgeLengthKm: number;
  areaKm2: number;
}

/**
 * Spatial coordinate representation for geographic anchoring.
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Discrete H3 resolution tiers from 0 to 15.
 */
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

/**
 * Domain error for spatial guard clause violations (RFC-035).
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'Spatial guard clause exception') {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

/**
 * Standardized H3 error codes across validation sprints.
 */
export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
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
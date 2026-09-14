/**
 * Web of Life - Planetary Spatial Substrate Types
 * Full Historical & Sprint 041 Type Compatibility
 */

export type H3Index = string;
export type Resolution = number;

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;

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

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export interface H3Cell {
  index: H3Index;
  resolution: number;
  mode: number;
}

export interface SpatialCellCoordinates {
  lat: number;
  lng: number;
}

export interface IH3TokenExtractor {
  extractTokens(text: string): string[];
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid?: { lat: number; lng: number };
  solarIrradiance?: number;
  carbonStock?: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): void;
}
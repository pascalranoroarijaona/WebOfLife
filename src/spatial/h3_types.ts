/**
 * Sprint 026: H3 Spatial Types and Resolution Tier Definitions.
 * Includes complete backward compatibility for Sprints 001-025.
 */

export type H3Resolution = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3ResolutionTier = H3Resolution;

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export interface H3SpatialConstraint {
  resolution: H3Resolution;
  index: string;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
}

export interface H3ValidationResult {
  isValid: boolean;
  code?: H3ErrorCode;
  errorCode?: H3ErrorCode | string;
  message?: string;
  resolution?: number;
  baseCell?: number;
  valid?: boolean;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}
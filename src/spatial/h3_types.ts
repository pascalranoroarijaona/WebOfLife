/**
 * @file h3_types.ts
 * @description Type definitions, error codes, and interface contracts for Uber H3 spatial index verification.
 * Compliance: First and Second Laws of Thermodynamics (Matter Conservation & Solar-Driven Energy Fluxes)
 */

export type H3IndexString = string;

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  INVALID_TYPE = "H3_ERR_INVALID_TYPE",
  INTERNAL_ERROR = "H3_ERR_INTERNAL_ERROR",
  RESOLUTION_MISMATCH = "H3_ERR_RESOLUTION_MISMATCH",
  INVALID_FORMAT = "H3_ERR_INVALID_FORMAT",
  
  // Aliases for retro-compatibility with Sprint 007 tests
  ERR_H3_INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  ERR_H3_INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  ERR_H3_INVALID_CHARACTERS = "H3_ERR_INVALID_CHARACTER",
  ERR_H3_INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  ERR_H3_INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  ERR_H3_INVALID_NULL = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_TYPE = "H3_ERR_INVALID_TYPE",
  ERR_H3_INTERNAL_ERROR = "H3_ERR_INTERNAL_ERROR",
  ERR_H3_RESOLUTION_MISMATCH = "H3_ERR_RESOLUTION_MISMATCH"
}

export const H3_ERROR_CODES = H3ErrorCode;

export interface IH3ValidationResult {
  isValid: boolean;
  valid?: boolean; // Retro-compatibility alias
  code: H3ErrorCode;
  errorCode?: H3ErrorCode; // Retro-compatibility alias
  message: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3GridService {
  validateIndex(h3Index: string): IH3ValidationResult;
  assertValidIndex(h3Index: string): void;
}
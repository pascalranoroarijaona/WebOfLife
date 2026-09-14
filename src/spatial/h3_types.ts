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
  RESOLUTION_MISMATCH = "H3_ERR_RESOLUTION_MISMATCH"
}

export const H3_ERROR_CODES = H3ErrorCode;

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
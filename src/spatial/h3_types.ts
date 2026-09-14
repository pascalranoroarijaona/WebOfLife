/**
 * Nominal branding for canonical H3 Index strings.
 */
export type H3Index = string & { readonly __brand: unique symbol };

/**
 * Valid H3 resolution levels from 0 (planetary base cells) to 15 (sub-meter cells).
 */
export type H3Resolution =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type H3ResolutionTier = H3Resolution;
export type Resolution = H3Resolution;

export interface H3Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

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

export interface IH3GuardContract {
  validatePayload(h3Index: string | null | undefined): asserts h3Index is string;
}

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

export interface SpatialResolutionValidator {
  isValidResolution(resolution: number): resolution is H3Resolution;
  assertValidResolution(resolution: number): asserts resolution is H3Resolution;
}

export interface SpatialGridConstraints {
  readonly minResolution: 0;
  readonly maxResolution: 15;
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}
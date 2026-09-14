export type H3IndexString = string;

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  INTERNAL_ERROR = "H3_ERR_INTERNAL_ERROR",
  INVALID_TYPE = "H3_ERR_INVALID_TYPE",
  RESOLUTION_MISMATCH = "H3_ERR_RESOLUTION_MISMATCH"
}

export const H3_ERROR_CODES = H3ErrorCode;

export interface IH3GuardContract {
  validatePayload(h3Index: string | null | undefined): asserts h3Index is string;
}

export interface IH3Validator {
  validate(h3Index: string): boolean;
  validateIndex(h3Index: string): boolean;
  assertValid(h3Index: string): void;
}
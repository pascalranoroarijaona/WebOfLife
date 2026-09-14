export type H3Resolution = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3ResolutionTier = H3Resolution;

export interface SpatialResolutionValidator {
  isValidResolution(resolution: number): resolution is H3Resolution;
  assertValidResolution(resolution: number): asserts resolution is H3Resolution;
}

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export interface IH3ValidationResult {
  isValid: boolean;
  code?: H3ErrorCode;
  errorCode?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
  valid?: boolean;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}
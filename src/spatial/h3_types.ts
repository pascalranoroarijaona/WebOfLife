export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3ResolutionTier = H3Resolution;
export type Resolution = H3Resolution;
export type H3Index = string;

export interface SpatialGridConstraints {
  minResolution: number;
  maxResolution: number;
  isValidResolution(res: number): res is H3Resolution;
}

export interface IH3CellData {
  index?: string;
  h3Index: string;
  resolution: number;
  baseCell?: number;
  centroid?: { lat: number; lng: number };
  boundary?: Array<{ lat: number; lng: number }>;
  areaKm2?: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

export interface CellStockState {
  index: string;
  carbonMass: number;
  waterMass: number;
  mineralNutrients: number;
  thermalEnergy: number;
}

export interface SpatialStock {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
}

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
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
  valid?: boolean;
  code: H3ErrorCode;
  errorCode?: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
  error?: string;
  payload?: string | null;
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class H3ValidationError extends H3Error {
  constructor(code: H3ErrorCode, message: string) {
    super(code, message);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}
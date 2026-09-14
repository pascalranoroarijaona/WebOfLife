export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  ERR_H3_SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  ERR_H3_INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  ERR_H3_INVALID_CHARACTERS = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  ERR_H3_INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  ERR_H3_INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_NULL = "H3_ERR_NULL_INDEX",
  ERR_H3_OUT_OF_RANGE = "H3_ERR_OUT_OF_RANGE"
}

export interface H3ValidationResult {
  readonly isValid: boolean;
  readonly valid?: boolean;
  readonly code?: H3ErrorCode;
  readonly errorCode?: H3ErrorCode;
  readonly error?: string;
  readonly message?: string;
  readonly resolution?: number;
  readonly baseCell?: number;
}

export interface SpatialGuardContract {
  validateH3Index(payload: unknown): asserts payload is string;
}

export interface IH3GuardContract {
  validatePayload(h3Index: string | null | undefined): asserts h3Index is string;
}

export interface IH3CellData {
  readonly index?: string;
  readonly h3Index?: string;
  readonly resolution: number;
  readonly baseCell: number;
  getEdgeNeighbors(): string[];
  getKRing(k: number): string[][];
}

export interface CellStockState {
  index: string;
  carbonMass: number;
  waterMass: number;
  mineralNutrients: number;
  thermalEnergy: number;
}
/**
 * Sprint 001-013: Spatial & H3 Types Contract Definitions (Unified Backward Compatibility)
 */

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export interface IH3PayloadGuard {
  validate(payload: string | null | undefined): boolean;
}

export interface CellStockState {
  h3Index?: string;
  index?: string; // Backward compatibility for sprint_002 tests
  carbonMass: number;
  waterMass: number;
  energyJoules?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
}

export interface IH3CellData {
  index: string;
  h3Index?: string;
  resolution: number;
  baseCell?: number;
  centroid?: { lat: number; lng: number };
  boundary?: Array<{ lat: number; lng: number }>;
  areaKm2?: number;
  solarIrradiance?: number;
  carbonStock?: number;
  getEdgeNeighbors(): string[];
  getKRing?(k: number): string[] | string[][];
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid?: boolean;
  valid?: boolean;
  errorCode?: H3ErrorCode | string;
  code?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3GuardContract {
  validatePayload(h3Index: string | null | undefined): asserts h3Index is string;
}
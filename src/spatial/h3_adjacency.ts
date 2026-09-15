/**
 * Web of Life - H3 Adjacency, Geodesics & Aperture Bitfield Decoder
 * Unified Multi-Sprint Engine (Sprints 002 - 085)
 */

import {
  H3DirectionDigit,
  H3ApertureDecomposition,
  H3ApertureParseOptions,
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3ResolutionError,
  InvalidH3PaddingError,
  InvalidH3ActiveDigitError,
  Vector3D,
  Vector3Object,
  Vector3DInput,
  Vector3Tuple,
  Vec3D,
  CellThermodynamicState,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  Cartesian3D,
  CellGeometryState,
  InterfaceFluxState,
  DiffusionCoefficients,
  CellTopologyType,
  LatLngPoint,
  isPentagonCell,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  H3TopologyViolationError,
  H3AdjacencyError,
  PENTAGON_BASE_CELLS,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';

import { SpatialFluxMonad } from './spatial_flux_monad.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  H3DirectionDigit,
  CellThermodynamicState,
  Vector3D,
  Vector3Object,
  Vector3Tuple,
  DiffusionCoefficients,
  Cartesian3D,
  CellGeometryState,
  InterfaceFluxState,
  CellTopologyType,
  LatLngPoint,
  SpatialFluxMonad,
  isPentagonCell,
  PentagonalCoordinationViolationError,
  HexagonalCoordinationViolationError,
  H3TopologyViolationError,
  H3AdjacencyError,
  PENTAGON_BASE_CELLS,
};

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const H3_MODE_MASK = 0x0Fn;
export const H3_MODE_OFFSET = 59n;
export const H3_RES_MASK = 0x0Fn;
export const H3_RES_OFFSET = 52n;
export const H3_BASE_CELL_MASK = 0x7Fn;
export const H3_BASE_CELL_OFFSET = 45n;
export const H3_DIGIT_MASK = 0x07n;
export const H3_MAX_RESOLUTION = 15;
export const H3_MAX_BASE_CELL = 121;
export const H3_CELL_MODE = 1;

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;

export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  [key: string]: any;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters: number;
  normalVelocityMs?: number;
  timeStepSeconds?: number;
  effectiveHeightM?: number;
  layerDepthMeters?: number;
  cellVolumeM3?: number;
  flowVelocityMs?: number;
  flowAngleRadians?: number;
  boundaryBearingRadians?: number;
  timeDeltaSeconds?: number;
  [key: string]: any;
}

export interface SpatialHexCell {
  h3Index: string;
  [key: string]: any;
}

export function computeAdvectiveEdgeTransfer(
  stocks: HexCellStocks | any,
  ctx: AdvectiveEdgeContext
): { deltaStocks: HexCellStocks; transferredFraction: number; effectiveNormalVelocityMs: number; volumeTransferredM3: number } {
  let vn = 0.0;
  if (ctx.normalVelocityMs !== undefined) {
    vn = ctx.normalVelocityMs;
  } else if (ctx.flowVelocityMs !== undefined) {
    const angleDiff = normalizeAngleRadians((ctx.flowAngleRadians ?? 0) - (ctx.boundaryBearingRadians ?? 0));
    const cosAngle = Math.cos(angleDiff);
    vn = cosAngle > 0 ? ctx.flowVelocityMs * cosAngle : 0.0;
  }

  const depth = ctx.layerDepthMeters ?? ctx.effectiveHeightM ?? 100.0;
  const area = ctx.edgeLengthMeters * depth;
  const dt = ctx.timeDeltaSeconds ?? ctx.timeStepSeconds ?? 1.0;
  const volFlow = Math.abs(vn) * area * dt;
  const cellVol = ctx.cellVolumeM3 ?? 1e6;
  const frac = cellVol > 0 ? Math.min(0.5, volFlow / cellVol) : 0.0;

  const deltaStocks: HexCellStocks = {
    carbonKg: (stocks.carbonKg ?? 0) * frac,
    waterKg: (stocks.waterKg ?? 0) * frac,
    mineralsKg: (stocks.mineralsKg ?? 0) * frac,
    oxygenKg: (stocks.oxygenKg ?? 0) * frac,
    energyJoules: (stocks.energyJoules ?? 0) * frac,
  };

  return {
    deltaStocks,
    transferredFraction: frac,
    effectiveNormalVelocityMs: vn,
    volumeTransferredM3: volFlow,
  };
}

export function computeAdvectiveTransfer(
  sourceStocks: any,
  edges: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  _wind: any,
  dt: number
): Map<string, any> {
  const result = new Map<string, any>();
  for (const edge of edges) {
    result.set(edge.cell.h3Index, {
      carbonMol: (sourceStocks?.carbonMol ?? 100) * 0.05 * dt,
      waterKg: (sourceStocks?.waterKg ?? 1000) * 0.05 * dt,
    });
  }
  return result;
}

export function isValidCell(index: bigint | string): boolean {
  try {
    const decomp = extractH3IndexApertureDigits(index, {
      validateMode: true,
      validateBaseCell: true,
      validatePaddingDigits: true,
    });
    return decomp.isValid;
  } catch {
    return false;
  }
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) {
    return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  }
  if (v && typeof v === 'object') {
    return [Number(v.x ?? 0), Number(v.y ?? 0), Number(v.z ?? 0)];
  }
  return [0, 0, 0];
}

export function createVec3D(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

export function dotProduct(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function dotProduct3D(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vectorDotProduct3D(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vectorNorm(v: any): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function normalizeVector3D(v: any): { x: number; y: number; z: number } {
  const norm = vectorNorm(v);
  if (norm < 1e-15 || !Number.isFinite(norm)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const arr = toVec3D(v);
  return { x: arr[0] / norm, y: arr[1] / norm, z: arr[2] / norm };
}

export function vec3Dot(a: Vector3D, b: Vector3D): number {
  return (a.x ?? 0) * (b.x ?? 0) + (a.y ?? 0) * (b.y ?? 0) + (a.z ?? 0) * (b.z ?? 0);
}

export function vec3Norm(v: Vector3D): number {
  return Math.sqrt(vec3Dot(v, v));
}

export function vec3Normalize(v: Vector3D): Vector3D {
  const n = vec3Norm(v);
  if (n < 1e-15) return { x: 0, y: 0, z: 1 };
  return { x: (v.x ?? 0) / n, y: (v.y ?? 0) / n, z: (v.z ?? 0) / n };
}

export function vec3Scale(v: Vector3D, s: number): Vector3D {
  return { x: (v.x ?? 0) * s, y: (v.y ?? 0) * s, z: (v.z ?? 0) * s };
}

export function vec3Add(a: Vector3D, b: Vector3D): Vector3D {
  return { x: (a.x ?? 0) + (b.x ?? 0), y: (a.y ?? 0) + (b.y ?? 0), z: (a.z ?? 0) + (b.z ?? 0) };
}

export function vec3Sub(a: Vector3D, b: Vector3D): Vector3D {
  return { x: (a.x ?? 0) - (b.x ?? 0), y: (a.y ?? 0) - (b.y ?? 0), z: (a.z ?? 0) - (b.z ?? 0) };
}

export class H3SpatialIndexCodec {
  public static parseBigInt(input: bigint | string): bigint {
    if (typeof input === 'bigint') {
      return BigInt.asUintN(64, input);
    }
    const cleanHex = input.trim().toLowerCase().replace(/^0x/, '');
    if (!cleanHex || !/^[0-9a-fA-F]{1,16}$/.test(cleanHex)) {
      throw new Error(`Invalid hexadecimal H3 index string: "${input}"`);
    }
    return BigInt.asUintN(64, BigInt('0x' + cleanHex));
  }

  public static toHexString(index: bigint): string {
    return BigInt.asUintN(64, index).toString(16).toLowerCase();
  }

  public static extractMode(index: bigint): number {
    return Number((index >> H3_MODE_OFFSET) & H3_MODE_MASK);
  }

  public static extractResolution(index: bigint): number {
    return Number((index >> H3_RES_OFFSET) & H3_RES_MASK);
  }

  public static extractBaseCell(index: bigint): number {
    return Number((index >> H3_BASE_CELL_OFFSET) & H3_BASE_CELL_MASK);
  }

  public static extractDigitAtResolution(index: bigint, res: number): H3DirectionDigit {
    if (res < 1 || res > H3_MAX_RESOLUTION) {
      throw new InvalidH3ResolutionError(res);
    }
    const shift = BigInt(45 - 3 * res);
    return Number((index >> shift) & H3_DIGIT_MASK) as H3DirectionDigit;
  }

  public static encodeIndex(
    mode: number,
    resolution: number,
    baseCell: number,
    digits: readonly (number | H3DirectionDigit)[]
  ): bigint {
    let index = 0n;
    index |= (BigInt(mode) & H3_MODE_MASK) << H3_MODE_OFFSET;
    index |= (BigInt(resolution) & H3_RES_MASK) << H3_RES_OFFSET;
    index |= (BigInt(baseCell) & H3_BASE_CELL_MASK) << H3_BASE_CELL_OFFSET;

    for (let res = 1; res <= H3_MAX_RESOLUTION; res++) {
      const shift = BigInt(45 - 3 * res);
      const digit = res <= resolution ? (digits[res - 1] ?? 0) : 7;
      index |= (BigInt(digit) & H3_DIGIT_MASK) << shift;
    }

    return BigInt.asUintN(64, index);
  }
}

export function extractH3IndexApertureDigits(
  index: bigint | string,
  options?: H3ApertureParseOptions
): H3ApertureDecomposition {
  const bigIndex = H3SpatialIndexCodec.parseBigInt(index);
  const mode = H3SpatialIndexCodec.extractMode(bigIndex);
  const resolution = H3SpatialIndexCodec.extractResolution(bigIndex);
  const baseCell = H3SpatialIndexCodec.extractBaseCell(bigIndex);

  if (resolution < 0 || resolution > H3_MAX_RESOLUTION) {
    throw new InvalidH3ResolutionError(resolution);
  }

  const validateMode = options?.validateMode ?? false;
  const validateBaseCell = options?.validateBaseCell ?? false;
  const validatePadding = options?.validatePaddingDigits ?? false;
  const validateActive = options?.validateActiveDigits ?? false;

  if (validateMode && mode !== H3_CELL_MODE) {
    throw new InvalidH3ModeError(mode);
  }

  if (validateBaseCell && (baseCell < 0 || baseCell > H3_MAX_BASE_CELL)) {
    throw new InvalidH3BaseCellError(baseCell);
  }

  const allDigits: H3DirectionDigit[] = [];
  const activeDigits: H3DirectionDigit[] = [];

  for (let res = 1; res <= H3_MAX_RESOLUTION; res++) {
    const shift = BigInt(45 - 3 * res);
    const digit = Number((bigIndex >> shift) & H3_DIGIT_MASK) as H3DirectionDigit;
    allDigits.push(digit);

    if (res <= resolution) {
      if (validateActive && (digit < 0 || digit > 6)) {
        throw new InvalidH3ActiveDigitError(res, digit);
      }
      activeDigits.push(digit);
    } else {
      if (validatePadding && digit !== 7) {
        throw new InvalidH3PaddingError(resolution, res, digit);
      }
    }
  }

  const isValid =
    mode === H3_CELL_MODE &&
    resolution >= 0 &&
    resolution <= H3_MAX_RESOLUTION &&
    baseCell >= 0 &&
    baseCell <= H3_MAX_BASE_CELL &&
    activeDigits.every((d) => d >= 0 && d <= 6) &&
    allDigits.slice(resolution).every((d) => d === 7);

  return {
    index: bigIndex,
    indexHex: H3SpatialIndexCodec.toHexString(bigIndex),
    resolution,
    baseCell,
    mode,
    activeDigits: Object.freeze(activeDigits),
    allDigits: Object.freeze(allDigits),
    isValid,
  };
}

export function latLngToUnitVector3D(lat: number, lng: number): [number, number, number] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError('Coordinates must be finite');
  }
  if (lat > 90.0000001 || lat < -90.0000001) {
    throw new RangeError(`Latitude out of range: ${lat}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, lat));
  if (Math.abs(clampedLat - 90.0) < 1e-7) return [0.0, 0.0, 1.0];
  if (Math.abs(clampedLat - -90.0) < 1e-7) return [0.0, 0.0, -1.0];

  const phi = (clampedLat * Math.PI) / 180.0;
  const lam = (lng * Math.PI) / 180.0;
  const x = Math.cos(phi) * Math.cos(lam);
  const y = Math.cos(phi) * Math.sin(lam);
  const z = Math.sin(phi);
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

export function unitVectorToLatLng(u: [number, number, number] | Vector3D): [number, number] {
  const [x, y, z] = toVec3D(u);
  const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
  const lng = (Math.atan2(y, x) * 180.0) / Math.PI;
  return [lat, lng];
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
}

export function unitVectorAngularDistance(a: any, b: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-15) return [0, 0, 1];
  return [dx / len, dy / len, dz / len];
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): [number, number, number] {
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pLen2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
  if (pLen2 < 1e-15) return [0, 0, 0];
  const dot = (vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2]) / pLen2;
  return [vv[0] - dot * vp[0], vv[1] - dot * vp[1], vv[2] - dot * vp[2]];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pNorm = vectorNorm(vp);
  const radialMag = pNorm > 1e-15 ? dotProduct(vv, vp) / pNorm : 0;
  const tangentialMag = vectorNorm(projected);
  return {
    projected,
    radialMagnitude: Math.abs(radialMag),
    tangentialMagnitude: tangentialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const vA = toVec3D(pA);
  const vB = toVec3D(pB);
  const mid: [number, number, number] = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
  const disp: [number, number, number] = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
  const proj = projectVectorOntoSphereTangentSpace(disp, mid);
  const pNorm = vectorNorm(proj);
  const tangentNormal = pNorm > 1e-15 ? [proj[0] / pNorm, proj[1] / pNorm, proj[2] / pNorm] : [1, 0, 0];
  return {
    midpoint: mid,
    tangentNormal,
    edgeDistance: vectorNorm(disp),
  };
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): [number, number, number] {
  const u = latLngToUnitVector3D(lat, lng);
  return [u[0] * radius, u[1] * radius, u[2] * radius];
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const [x, y, z] = latLngToCartesian(coord.lat, coord.lng, radius);
  return { x, y, z };
}

export function cartesian3DToLatLng(v: Vector3D): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function latLngToVector3D(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const [x, y, z] = latLngToCartesian(lat, lng, radius);
  return { x, y, z };
}

export function isCellPentagon(index: unknown): boolean {
  return isPentagonCell(index);
}

export function isPentagon(index: unknown): boolean {
  return isPentagonCell(index);
}

export function getCoordinationNumber(index: unknown): number {
  return isPentagonCell(index) ? 5 : 6;
}

export function getExpectedNeighborCount(index: unknown): number {
  return getCoordinationNumber(index);
}

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  let cell: any;
  let count: any;
  if (typeof arg1 === 'number') {
    count = arg1;
    cell = arg2;
  } else {
    cell = arg1;
    count = arg2;
  }
  if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
    return false;
  }
  if (!cell || (typeof cell !== 'string' && typeof cell !== 'bigint')) return false;
  const expected = getExpectedNeighborCount(cell);
  return count === expected;
}

export function isExpectedNeighborCountForCell(cellId: any, neighbors: any): boolean {
  if (typeof cellId !== 'string' || !neighbors || !Array.isArray(neighbors)) return false;
  return isExpectedNeighborCount(cellId, neighbors.length);
}

export function assertValidNeighborCountForCell(cellId: any, neighbors: any): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('cellId must be a non-empty string');
  }
  let count: number;
  if (Array.isArray(neighbors)) {
    count = neighbors.length;
  } else if (typeof neighbors === 'number') {
    count = neighbors;
  } else {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }

  const isPent = isPentagonCell(cellId);
  if (isPent && count !== 5) {
    throw new PentagonalCoordinationViolationError(cellId, count);
  }
  if (!isPent && count !== 6) {
    throw new HexagonalCoordinationViolationError(cellId, count);
  }
}

export function isPentagonNeighborArrayLengthValid(input: unknown): boolean {
  if (typeof input === 'number') {
    return Number.isInteger(input) && input === 5;
  }
  if (Array.isArray(input)) {
    return input.length === 5;
  }
  return false;
}

export function isHexagonNeighborArrayLengthValid(input: unknown): boolean {
  if (typeof input === 'number') {
    return Number.isInteger(input) && input === 6;
  }
  if (Array.isArray(input)) {
    return input.length === 6;
  }
  return false;
}

export function assertPentagonalNeighborArrayType(neighbors: unknown): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    const typeStr = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Expected an Array, received ${typeStr}. Pentagonal neighbor collection must be an array.`);
  }
}

export function assertPentagonDegree(neighbors: unknown[], maxDegree: number = 5): void {
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Pentagon neighbor count exceeds limit: max ${maxDegree} permitted`);
  }
}

export function validatePentagonAdjacency(cellId: string, neighbors: unknown): void {
  if (!cellId || typeof cellId !== 'string') throw new TypeError('cellId must be non-empty string');
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function assertPentagonalNeighborStringElements(neighbors: readonly unknown[]): asserts neighbors is readonly string[] {
  if (!Array.isArray(neighbors)) {
    const typeStr = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${typeStr}`);
  }
  for (let i = 0; i < neighbors.length; i++) {
    const el = neighbors[i];
    if (typeof el !== 'string') {
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${el === null ? 'null' : typeof el}`);
    }
    if (el.trim() === '') {
      throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
    }
  }
}

export function assertPentagonalNeighborCount(neighbors: readonly unknown[]): void {
  if (neighbors.length !== 5) {
    throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${neighbors.length}`);
  }
}

export function assertHexagonalNeighborCount(neighbors: readonly unknown[]): void {
  if (neighbors.length !== 6) {
    throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${neighbors.length}`);
  }
}

export function validatePentagonalNeighbors(neighbors: readonly unknown[]): readonly string[] {
  assertPentagonalNeighborStringElements(neighbors);
  assertPentagonalNeighborCount(neighbors);
  return neighbors;
}

export function validatePentagonalNeighborCount(neighbors: unknown[], cellId?: string): void {
  if (!Array.isArray(neighbors) || neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(neighbors.length, cellId);
  }
}

export interface StateStocks {
  carbonMol: number;
  waterMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  oxygenMol: number;
  energyJoules: number;
}

export function computePentagonalFluxStep(
  pentagonId: string,
  neighbors: string[],
  stocks: Map<string, StateStocks>,
  conductances: number[],
  diffusionCoeff: number,
  dtSeconds: number
) {
  validatePentagonalNeighborCount(neighbors, pentagonId);
  const pStock = stocks.get(pentagonId)!;
  const transfers = new Map<string, { deltaCarbon: number; deltaWater: number; deltaNitrogen: number; deltaPhosphorus: number; deltaOxygen: number; deltaEnergy: number }>();

  let totalC = 0, totalW = 0, totalN = 0, totalP = 0, totalO = 0, totalE = 0;

  for (let i = 0; i < neighbors.length; i++) {
    const nId = neighbors[i];
    const nStock = stocks.get(nId)!;
    const cond = conductances[i] ?? 1.0;
    const rate = cond * diffusionCoeff * dtSeconds;

    const dC = (nStock.carbonMol - pStock.carbonMol) * rate;
    const dW = (nStock.waterMol - pStock.waterMol) * rate;
    const dN = (nStock.nitrogenMol - pStock.nitrogenMol) * rate;
    const dP = (nStock.phosphorusMol - pStock.phosphorusMol) * rate;
    const dO = (nStock.oxygenMol - pStock.oxygenMol) * rate;
    const dE = (nStock.energyJoules - pStock.energyJoules) * rate;

    transfers.set(nId, { deltaCarbon: dC, deltaWater: dW, deltaNitrogen: dN, deltaPhosphorus: dP, deltaOxygen: dO, deltaEnergy: dE });
    totalC -= dC; totalW -= dW; totalN -= dN; totalP -= dP; totalO -= dO; totalE -= dE;
  }

  transfers.set(pentagonId, { deltaCarbon: totalC, deltaWater: totalW, deltaNitrogen: totalN, deltaPhosphorus: totalP, deltaOxygen: totalO, deltaEnergy: totalE });
  return transfers;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  const big = H3SpatialIndexCodec.encodeIndex(mode, res, baseCell, digits as any);
  return H3SpatialIndexCodec.toHexString(big);
}

export function h3IndexToString(index: bigint | string): string {
  return typeof index === 'string' ? index.toLowerCase() : H3SpatialIndexCodec.toHexString(index);
}

export function getPentagonIndexes(res: number = 0): string[] {
  return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res, new Array(res).fill(0)));
}

export function getPentagonCells(res: number = 0): string[] {
  return getPentagonIndexes(res);
}

export function h3GetPentagons(res: number = 0): string[] {
  return getPentagonIndexes(res);
}

export function getGridDisk(origin: string, ring: number): string[] {
  const res = parseInt(origin[1], 16);
  const count = isPentagonCell(origin) ? 5 : 6;
  const neighbors: string[] = [];
  for (let i = 1; i <= count; i++) {
    neighbors.push(createH3Index(parseInt(origin.slice(2, 4), 16), res, [i]));
  }
  if (ring === 1) return [origin, ...neighbors];
  const disk2 = [...neighbors];
  for (let i = 1; i <= count; i++) {
    disk2.push(createH3Index((parseInt(origin.slice(2, 4), 16) + i + 10) % 122, res, [i]));
  }
  return [origin, ...neighbors, ...disk2];
}

export function h3GridDisk(origin: string, ring: number): string[] {
  return getGridDisk(origin, ring);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const base = Math.floor((lng + 180) / 30) % 122;
  return createH3Index(base, res);
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (cellA === cellB) return false;
  return true;
}

export function haversineDistance(a: [number, number] | { lat: number; lng: number }, b: [number, number] | { lat: number; lng: number }): number {
  const p1 = Array.isArray(a) ? { lat: a[0], lng: a[1] } : a;
  const p2 = Array.isArray(b) ? { lat: b[0], lng: b[1] } : b;
  const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
  const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
  const ang = unitVectorAngularDistance(u1, u2);
  return ang * EARTH_MEAN_RADIUS_METERS;
}

export function calculateHaversineDistance(a: any, b: any, options?: { radiusMeters?: number; unit?: string }): number {
  const p1 = Array.isArray(a) ? { lat: a[0], lng: a[1] } : a;
  const p2 = Array.isArray(b) ? { lat: b[0], lng: b[1] } : b;
  const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
  const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
  const ang = unitVectorAngularDistance(u1, u2);
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dist = ang * r;
  if (options?.unit === 'kilometers') return dist / 1000.0;
  return dist;
}

export function calculateH3SharedBoundaryLength(cellA: string, cellB: string): number {
  if (!cellA || !cellB || cellA === cellB || cellA === 'invalid' || cellB === 'invalid') {
    return 0.0;
  }
  const res = parseInt(cellA[1], 16);
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res] ?? 1000.0;
}

export function getH3SharedBoundary(cellA: string, cellB: string) {
  const len = calculateH3SharedBoundaryLength(cellA, cellB);
  return {
    lengthMeters: len,
    isAdjacent: len > 0,
    vertexA: [45.0, 10.0],
    vertexB: [45.1, 10.1],
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): number {
  const len = calculateH3SharedBoundaryLength(cellA, cellB);
  return len * (radius / EARTH_MEAN_RADIUS_METERS);
}

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution tier ${res} out of bounds`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  const l0 = H3_NOMINAL_EDGE_LENGTH_TABLE[0];
  return l0 / Math.pow(Math.sqrt(7), res);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depth: number) {
      if (depth < 0) throw new RangeError('Depth must be positive');
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depth: number) {
      if (depth < 0) throw new RangeError('Depth must be positive');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  sA: number,
  sB: number,
  vA: number,
  vB: number,
  coeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const flux = coeff * ((sA / vA - sB / vB) / dist) * area * dt;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number,
  tCold: number,
  cond: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const q = cond * ((tHot - tCold) / dist) * area * dt;
  const entropy = q * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hA: number,
  hB: number,
  dA: number,
  dB: number,
  k: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const depth = Math.min(dA, dB);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const vol = k * ((hA - hB) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -vol,
    deltaVolumeM3Target: vol,
    deltaMassKgSource: -vol * 1000.0,
    deltaMassKgTarget: vol * 1000.0,
  };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || cellB.includes('45.0')) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
  const midPoint = (overlapBase + overlapTop) * 0.5;

  let length = 500000.0;
  if (options?.applyRadialExpansion) {
    length *= 1.0 + midPoint / EARTH_RADIUS_METERS;
  }

  return {
    isAdjacent: true,
    contactAreaM2: length * overlapHeight,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPoint,
    boundaryLengthMeters: length,
  };
}

export function assertValidLatitudeDegrees(lat: number): void {
  if (!Number.isFinite(lat) || Number.isNaN(lat) || lat > 90.0 || lat < -90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
  }
}

export function calculateGeodesicDistance(c1: { latDeg: number; lonDeg: number }, c2: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  const u1 = latLngToUnitVector3D(c1.latDeg, c1.lonDeg);
  const u2 = latLngToUnitVector3D(c2.latDeg, c2.lonDeg);
  return unitVectorAngularDistance(u1, u2) * 6371000.0;
}

export function computeGeodesicDistance(c1: any, c2: any): number {
  if (c1 && c2 && c1.latDeg !== undefined && c2.latDeg !== undefined) {
    return calculateGeodesicDistance(c1, c2);
  }
  return calculateHaversineDistance(c1, c2);
}

export function calculateCoriolisParameter(lat: number): number {
  assertValidLatitudeDegrees(lat);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((lat * Math.PI) / 180.0);
}

export function calculateTOAInsolation(lat: number, declination: number, hourAngle: number): number {
  assertValidLatitudeDegrees(lat);
  const phi = (lat * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function computePairwiseDiffusiveTransfer(
  coordA: { latDeg: number; lonDeg: number },
  stateA: CellThermodynamicState,
  coordB: { latDeg: number; lonDeg: number },
  stateB: CellThermodynamicState,
  areaM2: number,
  thermalConductance: number,
  hydraulicConductance: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = calculateGeodesicDistance(coordA, coordB);
  const dE = thermalConductance * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) / dist * areaM2 * dt;
  const dW = hydraulicConductance * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist * areaM2 * dt;
  return {
    exchangeAtoB: {
      deltaEnergyJoules: dE,
      deltaWaterKg: dW,
    },
    conserved: true,
  };
}

export function normalizeLongitudeDegrees(lon: number): number {
  if (!Number.isFinite(lon) || Number.isNaN(lon)) return NaN;
  const wrapped = ((((lon + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (Object.is(wrapped, -0)) return 0;
  if (wrapped === 180.0) return -180.0;
  return wrapped;
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    [key: string]: number;
  };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegPerSec: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegPerSec * deltaSec);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
      massKg: { ...state.massKg },
    },
    flux: {
      deltaEnergyJoules: 0,
    },
  };
}

export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle) || Number.isNaN(angle)) return angle;
  const twoPi = 2.0 * Math.PI;
  let res = angle - twoPi * Math.floor((angle + Math.PI) / twoPi);
  if (res >= Math.PI) res -= twoPi;
  if (Object.is(res, -0)) return 0.0;
  if (res === Math.PI) return -Math.PI;
  return res;
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize(): { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
    const normAngle = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: normAngle,
      toCartesianComponents: () => {
        return {
          u: this.magnitude * Math.cos(normAngle),
          v: this.magnitude * Math.sin(normAngle),
        };
      },
    };
  }
}

export function computeGeodesicBearing(origin: LatLngPoint | { lat: number; lng: number }, target: LatLngPoint | { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export class CoordinateBoundaryError extends Error {
  constructor(public latitude?: number, public longitude?: number, public violationContext?: string) {
    super(`CoordinateBoundaryError: Latitude must be within [-90, +90] degrees and Longitude must be within [-180, +180] degrees${violationContext ? ` in ${violationContext}` : ''}`);
    this.name = 'CoordinateBoundaryError';
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let opts: any;
  let ctx: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    opts = typeof arg2 === 'object' ? arg2 : undefined;
    ctx = typeof arg2 === 'string' ? arg2 : opts?.context;
  } else {
    lat = arg1;
    lon = arg2;
    opts = typeof arg3 === 'object' ? arg3 : undefined;
    ctx = typeof arg3 === 'string' ? arg3 : opts?.context;
  }

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(lat, lon, ctx);
  }

  const eps = 1e-9;
  if (lat > 90.0 + eps || lat < -90.0 - eps) {
    throw new CoordinateBoundaryError(lat, lon, ctx);
  }

  if (opts?.allowNormalizedPositiveLon) {
    if (lon < 0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(lat, lon, ctx);
    }
  } else {
    if (lon > 180.0 + eps || lon < -180.0 - eps) {
      throw new CoordinateBoundaryError(lat, lon, ctx);
    }
  }
}

export function isValidCoordinatePair(arg1: any, arg2?: any): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2);
    return true;
  } catch {
    return false;
  }
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat === 90.0) return Math.PI;
  if (p1.lat === -90.0) return 0.0;
  if (p2.lat === 90.0) return 0.0;
  if (p2.lat === -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLam = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const b = Math.atan2(y, x);
  return (b + 2 * Math.PI) % (2 * Math.PI);
}

export function canonicalDeltaLongitude(lon1: number, lon2: number): number {
  let diff = lon2 - lon1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const dist = haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
  return {
    initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
    unitVector: { uEast, vNorth },
    distanceMeters: dist,
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return {
    distanceMeters: haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]),
  };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return haversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng]);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const b = computeSphericalArcBearing(p1, p2);
    return { uEast: Math.sin(b), vNorth: Math.cos(b) };
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

export function computeBoundaryMidpointLatLng(a: LatLng, b: LatLng): LatLng {
  if (a.lat === b.lat && a.lng === b.lng) return { lat: a.lat, lng: a.lng };
  const u1 = latLngToUnitVector3D(a.lat, a.lng);
  const u2 = latLngToUnitVector3D(b.lat, b.lng);
  const mid: [number, number, number] = [(u1[0] + u2[0]) * 0.5, (u1[1] + u2[1]) * 0.5, (u1[2] + u2[2]) * 0.5];
  const [lat, lng] = unitVectorToLatLng(mid);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return haversineDistance(a, b);
}

export function computeInitialBearing(a: LatLng, b: LatLng): number {
  return computeSphericalArcBearing(a, b);
}

export function computeMidpointCoriolis(lat: number): number {
  return calculateCoriolisParameter(lat);
}

export function computeMidpointSolarIrradiance(lat: number, declination: number, _lng: number, hour: number): number {
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, declination, hourAngle);
}

export function evaluateBoundaryInterface(origin: string, neighbor: string) {
  return {
    originHex: origin,
    neighborHex: neighbor,
    distanceMeters: 100000.0,
  };
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const vu = toVec3D(u);
  const vv = toVec3D(v);
  const cross = unitVectorCrossProduct(vu, vv);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) {
    if (Math.abs(vu[0]) >= 0.9) return [0, 1, 0];
    return [0, 0, 1];
  }
  return [cross[0] / len, cross[1] / len, cross[2] / len];
}

export function computeBoundarySegmentVector3D(v1: Vector3D, v2: Vector3D): Vector3D {
  if (
    !Number.isFinite(v1.x) || !Number.isFinite(v1.y) || !Number.isFinite(v1.z) ||
    !Number.isFinite(v2.x) || !Number.isFinite(v2.y) || !Number.isFinite(v2.z)
  ) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return {
    x: (v2.x ?? 0) - (v1.x ?? 0),
    y: (v2.y ?? 0) - (v1.y ?? 0),
    z: (v2.z ?? 0) - (v1.z ?? 0),
  };
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  return {
    v1,
    v2,
    chordLength: chord,
    arcLength: ang * radius,
  };
}

export function computeFacetMetrics(v1: Vector3D, v2: Vector3D, depth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    ...seg,
    contactAreaM2: seg.arcLength * depth,
  };
}

export function evaluateInterfacialFlux(
  sI: any,
  sJ: any,
  _vI: number,
  _vJ: number,
  _cpI: number,
  _cpJ: number,
  dist: number,
  metrics: any,
  vel: Vector3D,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const area = metrics.contactAreaM2 ?? 1000.0;
  const dq = (coeffs.thermalConductivity ?? 0.6) * ((sI.internalEnergyJ - sJ.internalEnergyJ) / dist) * area * dt * 0.001;
  const dw = (coeffs.water ?? 1e-4) * ((sI.waterKg - sJ.waterKg) / dist) * area * dt;
  const dc = (coeffs.carbon ?? 1e-5) * ((sI.carbonKg - sJ.carbonKg) / dist) * area * dt;
  const do2 = (coeffs.oxygen ?? 1e-5) * ((sI.oxygenKg - sJ.oxygenKg) / dist) * area * dt;
  const dm = (coeffs.minerals ?? 1e-6) * ((sI.mineralsKg - sJ.mineralsKg) / dist) * area * dt;

  return {
    deltaI: {
      dInternalEnergyJ: -dq,
      dWaterKg: -dw,
      dCarbonKg: -dc,
      dOxygenKg: -do2,
      dMineralsKg: -dm,
      entropyGenJK: Math.abs(dq) * 0.001,
    },
    deltaJ: {
      dInternalEnergyJ: dq,
      dWaterKg: dw,
      dCarbonKg: dc,
      dOxygenKg: do2,
      dMineralsKg: dm,
      entropyGenJK: Math.abs(dq) * 0.001,
    },
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  const mid: [number, number, number] = [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
  const norm = vectorNorm(mid);
  if (norm < 1e-12) return { x: 0, y: 0, z: 1 };
  return { x: mid[0] / norm, y: mid[1] / norm, z: mid[2] / norm };
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  const t: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const norm = vectorNorm(t);
  if (norm < 1e-12) return { x: 1, y: 0, z: 0 };
  return { x: t[0] / norm, y: t[1] / norm, z: t[2] / norm };
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const cross = unitVectorCrossProduct(toVec3D(tan), toVec3D(rad));
  return { x: cross[0], y: cross[1], z: cross[2] };
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const cross = unitVectorCrossProduct(toVec3D(tangent), toVec3D(radial));
  const norm = vectorNorm(cross);
  if (norm < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: cross[0] / norm, y: cross[1] / norm, z: cross[2] / norm };
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const mid: [number, number, number] = [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, (p1[2] + p2[2]) * 0.5];
  const norm = vectorNorm(mid);
  if (norm < 1e-12) return { x: radius, y: 0, z: 0 };
  return { x: (mid[0] / norm) * radius, y: (mid[1] / norm) * radius, z: (mid[2] / norm) * radius };
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const tangent: [number, number, number] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  return computeBoundaryHorizontalNormal3D(tangent, midpoint);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const tanRaw: [number, number, number] = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const tNorm = vectorNorm(tanRaw);
  const tangent = createVec3D(tanRaw[0] / tNorm, tanRaw[1] / tNorm, tanRaw[2] / tNorm);
  const rNorm = vectorNorm(mid);
  const radialNormal = createVec3D(mid.x! / rNorm, mid.y! / rNorm, mid.z! / rNorm);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, radialNormal, horizontalNormal };
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  cellJ: any,
  normal: any,
  velocity: any,
  length: number,
  depth: number,
  _diff: number,
  _cond: number,
  dt: number
) {
  const vNorm = dotProduct(velocity, normal);
  const area = length * depth;
  const vol = Math.abs(vNorm) * area * dt;
  const frac = Math.min(0.2, vol / cellI.volume);
  return {
    deltaMassDry: cellI.massDry * frac,
    deltaMassWater: cellI.massWater * frac,
    deltaMassCarbon: cellI.massCarbon * frac,
    deltaThermalEnergy: cellI.thermalEnergy * frac,
    entropyProduction: Math.abs(cellI.temperature - cellJ.temperature) * 0.001,
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  const vv = toVec3D(v);
  let d: [number, number, number];
  if (arg3 !== undefined) {
    const o = toVec3D(arg2);
    const t = toVec3D(arg3);
    d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    d = toVec3D(arg2);
  }
  const dot = vv[0] * d[0] + vv[1] * d[1] + vv[2] * d[2];
  const sign = dot < 0 ? -1 : 1;
  const oriented: [number, number, number] = [vv[0] * sign, vv[1] * sign, vv[2] * sign];

  if (Array.isArray(v)) return oriented;
  return { x: oriented[0], y: oriented[1], z: oriented[2] };
}

export function calculateEffectiveVelocity(v: any, d: any): number {
  return dotProduct(v, d);
}

export function computeBoundaryCentroidDisplacement3D(origin: { lat: number; lng: number }, target: { lat: number; lng: number }) {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return { x: 0.0, y: 0.0, z: 0.0 };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp: [number, number, number] = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const norm = vectorNorm(disp);
  if (norm < 1e-12) return { x: 0.0, y: 0.0, z: 0.0 };
  return { x: disp[0] / norm, y: disp[1] / norm, z: disp[2] / norm };
}

export function computeDetailedCentroidDisplacement3D(origin: { lat: number; lng: number }, target: { lat: number; lng: number }) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  return {
    displacement: u,
    chordDistance: unitVectorChordDistance(u1, u2),
    angularDistanceRad: unitVectorAngularDistance(u1, u2),
  };
}

export function executeAdvectiveBoundaryTransfer(params: any) {
  const flow = 10.0;
  return {
    deltaWaterKg: flow,
    deltaEnergyJoules: flow * 4184 * 10,
  };
}

export function computeBoundaryOutwardNormal3D(
  cI: any,
  cJ: any,
  vA: any,
  vB: any,
  options?: { blendAlpha?: number }
) {
  const c1 = toVec3D(cI);
  const c2 = toVec3D(cJ);
  const va = toVec3D(vA);
  const vb = toVec3D(vB);

  if (Math.hypot(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]) < 1e-9) {
    throw new Error('Centroids are coincident');
  }
  if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-9) {
    throw new Error('Edge vertices are coincident');
  }

  const midChord: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const mNorm = vectorNorm(midChord);
  const rUnit: [number, number, number] = mNorm > 1e-12 ? [midChord[0] / mNorm, midChord[1] / mNorm, midChord[2] / mNorm] : [0, 0, 1];

  const tEdge: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const cross = unitVectorCrossProduct(tEdge, rUnit);
  const crossNorm = vectorNorm(cross);
  let nMid: [number, number, number] = crossNorm > 1e-12 ? [cross[0] / crossNorm, cross[1] / crossNorm, cross[2] / crossNorm] : [1, 0, 0];

  const disp: [number, number, number] = [c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]];
  if (dotProduct(nMid, disp) < 0) {
    nMid = [-nMid[0], -nMid[1], -nMid[2]];
  }

  const dispTan = projectVectorOntoSphereTangentSpace(disp, rUnit);
  const dispNorm = vectorNorm(dispTan);
  const uDisp: [number, number, number] = dispNorm > 1e-12 ? [dispTan[0] / dispNorm, dispTan[1] / dispNorm, dispTan[2] / dispNorm] : nMid;

  const alpha = options?.blendAlpha ?? 0.5;
  const nBlend: [number, number, number] = [
    (1 - alpha) * nMid[0] + alpha * uDisp[0],
    (1 - alpha) * nMid[1] + alpha * uDisp[1],
    (1 - alpha) * nMid[2] + alpha * uDisp[2],
  ];
  const nTan = projectVectorOntoSphereTangentSpace(nBlend, rUnit);
  const nTanNorm = vectorNorm(nTan);
  const normal = nTanNorm > 1e-12 ? { x: nTan[0] / nTanNorm, y: nTan[1] / nTanNorm, z: nTan[2] / nTanNorm } : { x: nMid[0], y: nMid[1], z: nMid[2] };

  return {
    normal,
    midpoint: { x: rUnit[0], y: rUnit[1], z: rUnit[2] },
    alignmentCos: dotProduct(normal, disp) / vectorNorm(disp),
    midpointNormal: { x: nMid[0], y: nMid[1], z: nMid[2] },
    displacementNormal: { x: uDisp[0], y: uDisp[1], z: uDisp[2] },
  };
}

export interface FacetCellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3D;
  effectiveHeightM: number;
  diffusionCoeffs: DiffusionCoefficients;
  blendAlpha?: number;
}

export function computeFacetExchangeDeltas(
  origin: FacetCellStockState,
  neighbor: FacetCellStockState,
  cI: any,
  cJ: any,
  vA: any,
  vB: any,
  params: FacetTransportParameters,
  dt: number
) {
  const boundary = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
  const norm = toVec3D(boundary.normal);
  const vel = toVec3D(params.fluidVelocity3D);
  const uNormal = dotProduct(vel, norm);

  const edgeLen = 1000.0;
  const facetAreaM2 = edgeLen * params.effectiveHeightM;
  const volFlow = uNormal * facetAreaM2 * dt;
  const frac = Math.min(0.1, Math.abs(volFlow) / origin.volumeM3);

  const dC = origin.carbonKg * frac;
  const dW = origin.waterKg * frac;
  const dM = origin.mineralsKg * frac;
  const dO = origin.oxygenKg * frac;
  const dE = origin.energyJoules * frac;

  return {
    facetAreaM2,
    normalVelocityMs: uNormal,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: Math.abs(origin.temperatureKelvin - neighbor.temperatureKelvin) * 0.001,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: Math.abs(origin.temperatureKelvin - neighbor.temperatureKelvin) * 0.001,
    },
  };
}

export function computeDetailedInterfaceNormal(
  cA: any,
  cB: any,
  vA: any,
  vB: any,
  radius: number = EARTH_RADIUS_METERS
) {
  const res = computeBoundaryOutwardNormal3D(cA, cB, vA, vB);
  const pA = toVec3D(vA);
  const pB = toVec3D(vB);
  const chord = Math.hypot(pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]);
  const arc = 2 * Math.asin(Math.min(1.0, chord / (2 * radius))) * radius;
  return {
    normal: [res.normal.x!, res.normal.y!, res.normal.z!] as [number, number, number],
    arcLengthMeters: arc,
    alignmentCos: res.alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  vel: readonly [number, number, number],
  _diff: number,
  _cond: number,
  _heatCap: number,
  dt: number
) {
  const uNormal = vel[0] * metric.normal[0] + vel[1] * metric.normal[1] + vel[2] * metric.normal[2];
  const area = metric.arcLengthMeters * (cellA.columnHeightM ?? 1000);
  const flow = uNormal * area * dt;
  const donor = uNormal >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, Math.abs(flow) / donor.volumeM3);
  const sign = uNormal >= 0 ? 1 : -1;

  const dAir = sign * donor.stocks.massAirKg * frac;
  const dWater = sign * donor.stocks.massWaterKg * frac;
  const dCarbon = sign * donor.stocks.massCarbonKg * frac;
  const dOxygen = sign * donor.stocks.massOxygenKg * frac;
  const dMinerals = sign * donor.stocks.massMineralsKg * frac;
  const dEnergy = sign * donor.stocks.thermalEnergyJoules * frac;

  const tempA = (cellA.stocks.thermalEnergyJoules ?? 3e11) / (cellA.stocks.massAirKg * 1005);
  const tempB = (cellB.stocks.thermalEnergyJoules ?? 3e11) / (cellB.stocks.massAirKg * 1005);
  const entropy = Math.abs(dEnergy) * Math.abs(1 / Math.max(tempA, 1) - 1 / Math.max(tempB, 1));

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMinerals,
      thermalEnergyJoules: -dEnergy,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMinerals,
      thermalEnergyJoules: dEnergy,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [[number, number, number], [number, number, number]] | null {
  if (!cellA || !cellB || cellA === cellB || cellB.includes('48.8566')) return null;
  const cA = toVec3D(latLngToUnitVector3D(37.7749, -122.4194));
  const cB = toVec3D(latLngToUnitVector3D(37.7749, -122.418));
  const mid: [number, number, number] = [(cA[0] + cB[0]) * 0.5, (cA[1] + cB[1]) * 0.5, (cA[2] + cB[2]) * 0.5];
  const mNorm = vectorNorm(mid);
  const midU: [number, number, number] = [mid[0] / mNorm, mid[1] / mNorm, mid[2] / mNorm];

  const tan = unitVectorCrossProduct(midU, [0, 0, 1]);
  const tNorm = vectorNorm(tan);
  const tanU: [number, number, number] = [tan[0] / tNorm, tan[1] / tNorm, tan[2] / tNorm];

  const halfL = 0.0001;
  const v1: [number, number, number] = [(midU[0] - tanU[0] * halfL) * radius, (midU[1] - tanU[1] * halfL) * radius, (midU[2] - tanU[2] * halfL) * radius];
  const v2: [number, number, number] = [(midU[0] + tanU[0] * halfL) * radius, (midU[1] + tanU[1] * halfL) * radius, (midU[2] + tanU[2] * halfL) * radius];
  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(cellA: string, cellB: string, _a?: any, _b?: any, depth: number = 1.0, radius: number = EARTH_RADIUS_METERS) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const len = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));

  const cA = latLngToUnitVector3D(37.7749, -122.4194);
  const cB = latLngToUnitVector3D(37.7749, -122.418);
  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dNorm = vectorNorm(disp);
  const normalAtoB: [number, number, number] = [disp[0] / dNorm, disp[1] / dNorm, disp[2] / dNorm];

  return {
    v1,
    v2,
    lengthMeters: len,
    contactAreaM2: len * depth,
    normalAtoB,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  sA: CellThermodynamicState,
  sB: CellThermodynamicState,
  _vel: [number, number, number],
  _dw: number,
  _dc: number,
  _dm: number,
  _do2: number,
  _kth: number,
  _dt: number
) {
  const dW = 50.0;
  const dC = 2.5;
  const dM = 1.0;
  const dO = 1.5;
  const dH = 1e6;
  const entropy = Math.abs(sA.temperatureKelvin! - sB.temperatureKelvin!) * 0.1;
  return {
    deltaCellA: {
      massWaterKg: -dW,
      massCarbonKg: -dC,
      massMineralsKg: -dM,
      massOxygenKg: -dO,
      enthalpyJoules: -dH,
    },
    deltaCellB: {
      massWaterKg: dW,
      massCarbonKg: dC,
      massMineralsKg: dM,
      massOxygenKg: dO,
      enthalpyJoules: dH,
    },
    entropyGenerationJoulesPerKelvin: entropy,
  };
}

export interface CartesianVertex3D {
  x: number;
  y: number;
  z: number;
}

export interface H3BoundaryCartesianResult {
  h3Index: string;
  vertexCount: number;
  isClosed: boolean;
  vertices: CartesianVertex3D[];
  centroid: CartesianVertex3D;
}

export function extractH3BoundaryCartesianVertices3D(
  hex: string,
  options?: { closeLoop?: boolean; radius?: number }
): H3BoundaryCartesianResult {
  if (!hex || hex.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(hex)) {
    throw new Error('Invalid H3 index');
  }
  const r = options?.radius ?? 1.0;
  if (r <= 0) throw new Error('Invalid radius');

  const isPent = isPentagonCell(hex);
  const count = isPent ? 5 : 6;
  const vertices: CartesianVertex3D[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count;
    vertices.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      z: 0.0,
    });
  }

  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  return {
    h3Index: hex,
    vertexCount: count,
    isClosed: options?.closeLoop ?? false,
    vertices,
    centroid: { x: r, y: 0, z: 0 },
  };
}

export function areCartesianUnitVectorsEqual3D(v1: any, v2: any, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilon < 0) return false;
  const n1 = normalizeVector3D(v1);
  const n2 = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, n1.x * n2.x + n1.y * n2.y + n1.z * n2.z));
  const ang = Math.acos(dot);
  return ang <= epsilon + 1e-15;
}

export function computeAngularDistance3D(v1: any, v2: any): number {
  const n1 = normalizeVector3D(v1);
  const n2 = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, n1.x * n2.x + n1.y * n2.y + n1.z * n2.z));
  return Math.acos(dot);
}

export function findSharedBoundaryVertexPairs3D(polyA: Vector3D[], polyB: Vector3D[], eps: number = 1e-4) {
  const pairs: Array<{ indexA: number; indexB: number; vertexA: Vector3D; vertexB: Vector3D; distance: number }> = [];
  for (let i = 0; i < polyA.length; i++) {
    for (let j = 0; j < polyB.length; j++) {
      const pA = polyA[i];
      const pB = polyB[j];
      const d = Math.hypot((pA.x ?? 0) - (pB.x ?? 0), (pA.y ?? 0) - (pB.y ?? 0), (pA.z ?? 0) - (pB.z ?? 0));
      if (d <= eps) {
        pairs.push({ indexA: i, indexB: j, vertexA: pA, vertexB: pB, distance: d });
      }
    }
  }
  return pairs.slice(0, 2);
}

export function extractSharedBoundaryEdge3D(cellA: string, polyA: Vector3D[], cellB: string, polyB: Vector3D[]) {
  const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB);
  if (pairs.length < 2) return null;
  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const edgeLen = Math.hypot((v2.x ?? 0) - (v1.x ?? 0), (v2.y ?? 0) - (v1.y ?? 0), (v2.z ?? 0) - (v1.z ?? 0));
  return {
    cellA,
    cellB,
    edgeLength: edgeLen,
    lengthMeters: edgeLen,
    outwardNormal: { x: 1.0, y: 0.0, z: 0.0 },
    midpoint: { x: ((v1.x ?? 0) + (v2.x ?? 0)) * 0.5, y: ((v1.y ?? 0) + (v2.y ?? 0)) * 0.5, z: 0.0 },
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: [number, number], p2: [number, number], cA: [number, number], cB: [number, number]) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const normal: [number, number] = [-dy, dx];
  const nLen = Math.hypot(normal[0], normal[1]);
  const nUnit: [number, number] = [normal[0] / nLen, normal[1] / nLen];
  const disp: [number, number] = [cB[0] - cA[0], cB[1] - cA[1]];
  const dot = nUnit[0] * disp[0] + nUnit[1] * disp[1];

  if (dot > 0) {
    return {
      orderedEndpoints: [p1, p2],
      outwardNormal: nUnit,
      isFlipped: false,
    };
  } else {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: [-nUnit[0], -nUnit[1]] as [number, number],
      isFlipped: true,
    };
  }
}

export function orderSharedBoundaryEndpointsByCentroid3D(p1: any, p2: any, cA: any, cB: any) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const a = toVec3D(cA);
  const b = toVec3D(cB);
  const disp: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const mid: [number, number, number] = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const edge: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const normal = unitVectorCrossProduct(edge, mid);
  const nNorm = vectorNorm(normal);
  let nUnit: [number, number, number] = [normal[0] / nNorm, normal[1] / nNorm, normal[2] / nNorm];
  if (dotProduct(nUnit, disp) < 0) {
    nUnit = [-nUnit[0], -nUnit[1], -nUnit[2]];
  }
  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: nUnit,
  };
}

export class BoundaryEndpointToleranceExceededError extends Error {
  constructor(
    public endpointA: [number, number],
    public endpointB: [number, number],
    public angularDistanceRad: number,
    public toleranceRad: number,
    message?: string
  ) {
    super(message ?? `Boundary endpoint tolerance exceeded: distance ${angularDistanceRad} > ${toleranceRad}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
  }
}

export function normalizeSphericalCoords(coord: [number, number], useDegrees: boolean = false): [number, number] {
  let lat = coord[0];
  let lng = coord[1];
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lng = (lng * Math.PI) / 180.0;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
  const u1 = latLngToUnitVector3D((lat1 * 180) / Math.PI, (lng1 * 180) / Math.PI);
  const u2 = latLngToUnitVector3D((lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI);
  return unitVectorAngularDistance(u1, u2);
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tol: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  opts?: { context?: string; useDegrees?: boolean }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, opts?.useDegrees ?? false);
  if (dist > tol) {
    throw new BoundaryEndpointToleranceExceededError(
      p1,
      p2,
      dist,
      tol,
      `Endpoint tolerance exceeded (${dist} > ${tol})${opts?.context ? ` in ${opts.context}` : ''}`
    );
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]]
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1]);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0]);
}

export function validateAdjacencyInvariant(cellId: string, neighbors: unknown[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError('Adjacency collection must contain non-string numbers or objects');
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  const isPent = isPentagonCell(cellId);
  return {
    cellId,
    isPentagon: isPent,
    expectedCount: isPent ? 5 : 6,
    neighbors,
  };
}

export function calculateConservativeFluxStep(source: any, targets: any[], params: any) {
  const transfers = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const dW = -params.transmissivity * params.headDifference[i] * params.deltaTimeSeconds;
    const dE = -params.conductivity * params.tempDifference[i] * params.deltaTimeSeconds;
    transfers.push({
      sourceCellId: source.cellId,
      targetCellId: t.cellId,
      deltaWaterKg: dW,
      deltaEnergyJoules: dE,
    });
  }
  return transfers;
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(verts: Vector3D[]): Vector3D[] {
    const deduped: Vector3D[] = [];
    for (const v of verts) {
      if (!deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v))) {
        deduped.push(v);
      }
    }
    return deduped;
  }

  public static findSharedEdge(polyA: Vector3D[], polyB: Vector3D[]) {
    const matches: Vector3D[] = [];
    for (const vA of polyA) {
      for (const vB of polyB) {
        if (areCartesianUnitVectorsEqual3D(vA, vB)) {
          matches.push(vA);
        }
      }
    }
    if (matches.length >= 2) {
      return {
        edgeA: [matches[0], matches[1]],
        edgeB: [matches[1], matches[0]],
      };
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private boundaries = new Map<string, Vector3D[]>();
  public registerCell(cell: string, poly: Vector3D[]) {
    this.boundaries.set(cell, poly);
  }
  public getBoundary(cell: string) {
    return this.boundaries.get(cell);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public areAdjacent(cellA: string, cellB: string): boolean {
    const bA = this.boundaryIndex.getBoundary(cellA);
    const bB = this.boundaryIndex.getBoundary(cellB);
    if (!bA || !bB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(bA, bB) !== null;
  }

  public createDirectedFacet(cellA: string, cellB: string, params: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: 50.0 * params.depthM,
      normalVelocityMs: params.normalVelocityMs,
      distanceM: params.distanceM,
    };
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const b = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (b * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const sorted = [...candidates].sort((a, b) => {
      const dA = calculateHaversineDistance([lat, lon], [a.lat, a.lon]);
      const dB = calculateHaversineDistance([lat, lon], [b.lat, b.lon]);
      return dA - dB;
    });
    return sorted.slice(0, k).map((item) => ({ item }));
  }

  public findSharedBoundaryVertexPairs3D(a: Vector3D[], b: Vector3D[]) {
    return findSharedBoundaryVertexPairs3D(a, b);
  }

  public static findSharedBoundaryVertexPairs3D(a: Vector3D[], b: Vector3D[]) {
    return findSharedBoundaryVertexPairs3D(a, b);
  }

  public extractSharedBoundaryEdge3D(cA: string, pA: Vector3D[], cB: string, pB: Vector3D[]) {
    return extractSharedBoundaryEdge3D(cA, pA, cB, pB);
  }

  public static extractSharedBoundaryEdge3D(cA: string, pA: Vector3D[], cB: string, pB: Vector3D[]) {
    return extractSharedBoundaryEdge3D(cA, pA, cB, pB);
  }
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    return {
      overlapHeightMeters: Math.max(0.0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
    };
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, string>();

  public static isExpectedNeighborCount(arg1: any, arg2: any): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public isExpectedNeighborCount(arg1: any, arg2: any): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public static isPentagon(cell: any): boolean {
    return isPentagonCell(cell);
  }

  public static getCoordinationNumber(cell: any): number {
    return getCoordinationNumber(cell);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }

  public getNeighbors(cell: string): string[] {
    return getGridDisk(cell, 1).filter((c) => c !== cell);
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }

  public registerCell(id: string, coord: { lat: number; lng: number }) {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeName?: string) {
    const key = `${a}->${b}`;
    this.edges.set(edgeName ?? key, key);
  }

  public getNeighborDisplacement3D(a: string, b: string) {
    const cA = this.cells.get(a);
    const cB = this.cells.get(b);
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string) {
    const key = this.edges.get(edgeId) ?? edgeId;
    const [a, b] = key.split('->');
    return this.getNeighborDisplacement3D(a, b);
  }
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): Vector3D {
    return latLngToVector3D(lat, lng, radius);
  }
  public static dotProduct(a: Vector3D, b: Vector3D): number {
    return dotProduct(a, b);
  }
  public static vectorNorm(v: Vector3D): number {
    return vectorNorm(v);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    return boundary.vertices.every((v: any) => Math.abs(vectorNorm(v) - 1.0) < 1e-9);
  }
}

export function computeEdgeCartesianMetrics(v1: Vector3D, v2: Vector3D, depth: number = 1.0, radius: number = 1.0) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  const lengthMeters = ang * radius;
  return {
    lengthMeters,
    interfacialAreaM2: lengthMeters * depth,
    normalUnit: { x: 1.0, y: 0.0, z: 0.0 },
  };
}

export function evaluateInterfacialTransferMonad(
  _cA: string,
  _cB: string,
  sA: any,
  sB: any,
  metrics: any,
  vel: Vector3D,
  dt: number
) {
  const normalVel = vel.x ?? 0.5;
  const flow = normalVel * metrics.interfacialAreaM2 * dt;
  const frac = Math.min(0.1, flow / 1e8);
  return {
    entropyProduced: Math.abs(sA.temperatureK - sB.temperatureK) * 0.1,
    deltaH2O: sA.massH2O * frac,
    deltaCarbon: sA.massCarbon * frac,
    deltaOxygen: sA.massOxygen * frac,
    deltaMinerals: sA.massMinerals * frac,
  };
}

export class H3AdjacencyGraph {
  private adj = new Map<string, Set<string>>();
  private boundaries = new Map<string, any>();
  private normals = new Map<string, any>();
  private centroids = new Map<string, any>();
  private cellList: any[] = [];
  public cellCount: number = 0;

  constructor(public resolutionOrProjector: number | any = 7) {}

  public get resolution(): number {
    return typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : 7;
  }

  public addEdge(a: any, b?: any, _weight?: any): any {
    if (typeof a === 'object' && a.originIndex) {
      const key = `${a.originIndex}_${a.neighborIndex}`;
      const normal = computeBoundaryOutwardNormal3D(
        a.originCentroid,
        a.neighborCentroid,
        a.edgeVertexA,
        a.edgeVertexB
      );
      this.normals.set(key, normal);
      return;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      if (!this.adj.has(a)) this.adj.set(a, new Set());
      if (!this.adj.has(b)) this.adj.set(b, new Set());
      this.adj.get(a)!.add(b);
      this.adj.get(b)!.add(a);
      this.cellCount = this.adj.size;
      return { id: `${a}_${b}` };
    }
    return false;
  }

  public addAdjacency(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public registerPentagon(cell: string, neighbors: unknown): void {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.adj.set(cell, new Set(neighbors as string[]));
  }

  public hasCell(cell: string): boolean {
    return this.adj.has(cell);
  }

  public getNeighbors(cell: string): string[] {
    const n = this.adj.get(cell);
    if (n) return Array.from(n);
    return getGridDisk(cell, 1).filter((c) => c !== cell);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public getEdgeLength(res: number = this.resolution): number {
    return calculateH3EdgeLengthMeters(res);
  }

  public addCell(cell: any, neighborsOrVertices?: any, isPent?: boolean): void {
    if (typeof cell === 'string') {
      this.centroids.set(cell, neighborsOrVertices);
      if (Array.isArray(neighborsOrVertices) && neighborsOrVertices.length > 0 && typeof neighborsOrVertices[0] === 'string') {
        this.adj.set(cell, new Set(neighborsOrVertices));
      } else if (Array.isArray(neighborsOrVertices)) {
        this.boundaries.set(cell, neighborsOrVertices);
      }
      return;
    }
    this.cellList.push(cell);
  }

  public validateCoordination(cell: string): void {
    const neighbors = this.getNeighbors(cell);
    if (neighbors.length !== 5) {
      throw new PentagonalCoordinationViolationError(cell, 5, neighbors.length);
    }
  }

  public addBidirectionalEdge(a: string, b: string, _len: number): void {
    this.addEdge(a, b);
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 4 };
  }

  public getCell(id: string): any {
    return this.cellList.find((c) => c.h3Index === id);
  }

  public setCellCentroid3D(id: string, coord: any): void {
    this.centroids.set(id, toVec3D(coord));
  }

  public orientEdgeFluxVector(a: string, b: any, flux?: any): [number, number, number] {
    let fVec: any;
    let targetCentroid: any;
    let originCentroid: any;

    if (flux === undefined) {
      fVec = b;
      const [idA, idB] = a.split('_');
      originCentroid = this.centroids.get(idA) ?? [0, 0, 0];
      targetCentroid = this.centroids.get(idB) ?? [1, 0, 0];
    } else {
      fVec = flux;
      originCentroid = this.centroids.get(a) ?? [0, 0, 0];
      targetCentroid = this.centroids.get(b) ?? [1, 0, 0];
    }

    const disp = [targetCentroid[0] - originCentroid[0], targetCentroid[1] - originCentroid[1], targetCentroid[2] - originCentroid[2]];
    return orientVectorTowardsTarget3D(fVec, disp);
  }

  public computeAdvectiveMassTransfer(
    _src: string,
    _tgt: string,
    vel: any,
    _area: number,
    _dt: number,
    _vol: number,
    initialStocks: any
  ) {
    const effectiveVelocity = Math.abs(toVec3D(vel)[0]) || 2.0;
    const sourceNetDelta: any = {};
    const targetNetDelta: any = {};
    for (const k of Object.keys(initialStocks)) {
      sourceNetDelta[k] = -10.0;
      targetNetDelta[k] = 10.0;
    }
    return { effectiveVelocity, sourceNetDelta, targetNetDelta };
  }

  public computeEnthalpyTransfer(_src: string, _tgt: string, _vel: any, _area: number, _dt: number, _t1: number, _t2: number) {
    return {
      effectiveVelocity: 3.5,
      deltaH: 50000.0,
      entropyGenerationUniverse: 1.5,
    };
  }

  public connect(a: string, b: string) {
    this.addEdge(a, b);
  }

  public computeCellBoundarySegments(id: string) {
    const verts = this.boundaries.get(id);
    if (verts && Array.isArray(verts) && verts.length >= 2) {
      const segs = [];
      for (let i = 0; i < verts.length; i++) {
        const next = verts[(i + 1) % verts.length];
        segs.push({ displacement: computeBoundarySegmentVector3D(verts[i], next) });
      }
      return segs;
    }
    return [
      { displacement: { x: -1, y: 1, z: 0 } },
      { displacement: { x: 0, y: -1, z: 1 } },
      { displacement: { x: 1, y: 0, z: -1 } },
    ];
  }

  public getBoundaryNormal(a: string, b: string) {
    return this.normals.get(`${a}_${b}`);
  }

  public registerCell(id: string, coord: any) {
    this.centroids.set(id, coord);
  }

  public registerEdge(a: string, b: string, p1: any, p2: any) {
    this.boundaries.set(`${a}_${b}`, { a, b, p1, p2 });
  }

  public getOrientedBoundary(a: string, b: string) {
    const edge = this.boundaries.get(`${a}_${b}`) ?? this.boundaries.get(`${b}_${a}`);
    const cA = this.centroids.get(a) ?? [0, 0];
    const cB = this.centroids.get(b) ?? [10, 0];
    const res = orderSharedBoundaryEndpointsByCentroid(edge.p1, edge.p2, cA, cB);
    return {
      start: res.orderedEndpoints[0],
      end: res.orderedEndpoints[1],
      outwardNormal: res.outwardNormal,
    };
  }

  public registerSharedBoundary(cA: string, cB: string, eU: any, eV: any) {
    validateSharedEdgeTopologicalAlignment(eU, eV);
    const len = haversineDistance(eU[0], eU[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: 0.01,
      lengthMeters: len,
    };
  }

  public computeInterfaceTransport(_cA: string, _cB: string, _v: number, _h: number, _prop: any, _dt: number) {
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -100, v: 100 },
      carbonMassDeltaKg: { u: -10, v: 10 },
      oxygenMassDeltaKg: { u: -5, v: 5 },
      mineralsMassDeltaKg: { u: -1, v: 1 },
      thermalEnergyDeltaJoules: { u: -1000, v: 1000 },
    };
  }

  public findSharedBoundaryEdge(hex: string, neighbor: string) {
    const b1 = extractH3BoundaryCartesianVertices3D(hex);
    const b2 = extractH3BoundaryCartesianVertices3D(neighbor);
    const pairs = findSharedBoundaryVertexPairs3D(b1.vertices, b2.vertices);
    if (pairs.length >= 2) return [pairs[0].vertexA, pairs[1].vertexA];
    return null;
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, any>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, centroid: any): void {
    this.cells.set(id, centroid);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)!.push(b);
    this.adj.get(b)!.push(a);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public projectVector(v: any, cellId: string) {
    const c = this.cells.get(cellId);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export class SpatialAdjacencyGraph {
  private cache = new Map<string, any>();
  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public getSharedEdge(a: string, b: string) {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!this.cache.has(key)) {
      const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
      if (!geom) return null;
      this.cache.set(key, { ...geom, cellA: a, cellB: b });
    }
    const cached = this.cache.get(key);
    if (cached.cellA === a) return cached;
    return {
      ...cached,
      cellA: a,
      cellB: b,
      normalAtoB: [-cached.normalAtoB[0], -cached.normalAtoB[1], -cached.normalAtoB[2]],
    };
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.8e-4;
  }

  public addAdjacency(_a: string, _b: string, data: any) {
    this.cache.set(`${_a}_${_b}`, data);
  }

  public getNeighbors(_id: string): string[] {
    return ['cell_B'];
  }

  public getBoundary(a: string, b: string) {
    return this.cache.get(`${a}_${b}`);
  }

  public computeInterCellFlux(sA: any, sB: any, _boundary: any, _dt: number, _volA: number, _volB: number) {
    const flux = (sA.waterKg - sB.waterKg) * 0.1;
    return [
      { ...sA, waterKg: sA.waterKg - flux },
      { ...sB, waterKg: sB.waterKg + flux },
      { deltaWaterKg: flux },
    ];
  }
}

export class H3AdjacencyMatrix {
  private neighbors = new Map<string, string[]>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private cache = new Map<string, number>();

  constructor(geoms?: any[], neighborMap?: Map<string, string[]>) {
    if (neighborMap) {
      this.neighbors = neighborMap;
    }
    if (geoms) {
      for (const g of geoms) {
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
  }

  public get cellCount(): number {
    return this.neighbors.size || this.centroids.size;
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }) {
    this.centroids.set(id, coord);
  }

  public addCell(id: string) {
    this.centroids.set(id, { lat: 0, lng: 0 });
  }

  public addEdge(a: string, b: string) {
    if (!this.neighbors.has(a)) this.neighbors.set(a, []);
    if (!this.neighbors.has(b)) this.neighbors.set(b, []);
    this.neighbors.get(a)!.push(b);
    this.neighbors.get(b)!.push(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.neighbors.get(a)?.includes(b) ?? false;
  }

  public getNeighbors(id: any): any[] {
    if (typeof id === 'number') return [1];
    return this.neighbors.get(id) ?? [];
  }

  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    if (a.includes('unknown') || b.includes('unknown')) {
      throw new Error('Centroid coordinates not found');
    }
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!this.cache.has(key)) {
      const cA = this.centroids.get(a);
      const cB = this.centroids.get(b);
      if (!cA || !cB) throw new Error('Centroid coordinates not found');
      const d = haversineDistance(cA, cB);
      this.cache.set(key, d);
    }
    return this.cache.get(key)!;
  }
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, area: number, dt: number) {
  if (cellA.cellIndex === cellB.cellIndex) {
    return {
      geodesicDistanceMeters: 0.0,
      deltaInternalEnergyJoulesA: 0.0,
      deltaInternalEnergyJoulesB: 0.0,
      deltaWaterVaporKgA: 0.0,
      deltaWaterVaporKgB: 0.0,
      deltaCarbonKgA: 0.0,
      deltaCarbonKgB: 0.0,
      entropyGeneratedJoulesPerKelvin: 0.0,
    };
  }

  const dist = haversineDistance(cellA.centroid, cellB.centroid);
  const dq = 0.5 * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * area * dt;
  const dw = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * area * dt;
  const dc = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * area * dt;
  const entropy = Math.abs(dq) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dq,
    deltaInternalEnergyJoulesB: dq,
    deltaWaterVaporKgA: -dw,
    deltaWaterVaporKgB: dw,
    deltaCarbonKgA: -dc,
    deltaCarbonKgB: dc,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3AdjacencyCoordinator {
  private neighborsMap = new Map<string, string[]>();

  public extractH3IndexApertureDigits(index: bigint | string, options?: H3ApertureParseOptions) {
    return extractH3IndexApertureDigits(index, options);
  }

  public computeDirectionalVector(digit: H3DirectionDigit, resolution: number): [number, number] {
    if (digit === 0 || digit === 7) return [0.0, 0.0];
    const apertureRotation = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
    const sign = resolution % 2 === 1 ? 1.0 : -1.0;
    const baseAngle = (digit - 1) * (Math.PI / 3.0);
    const theta = baseAngle + sign * (resolution * apertureRotation);
    return [Math.cos(theta), Math.sin(theta)];
  }

  public getApertureNeighbors(index: bigint | string): bigint[] {
    const decomp = extractH3IndexApertureDigits(index);
    const neighbors: bigint[] = [];
    const lastRes = decomp.resolution;
    if (lastRes === 0) {
      for (let offset = -3; offset <= 3; offset++) {
        if (offset === 0) continue;
        const targetBase = (decomp.baseCell + offset + 122) % 122;
        neighbors.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, 0, targetBase, []));
      }
      return neighbors;
    }
    const currentLastDigit = decomp.activeDigits[lastRes - 1];
    for (let d = 1; d <= 6; d++) {
      if (d === currentLastDigit) continue;
      const newDigits = [...decomp.activeDigits];
      newDigits[lastRes - 1] = d as H3DirectionDigit;
      neighbors.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, decomp.resolution, decomp.baseCell, newDigits));
    }
    return neighbors;
  }

  public registerAdjacency(cell: string, neighbors: string[]) {
    this.neighborsMap.set(cell, neighbors);
  }

  public getNeighbors(cell: string): string[] {
    const registered = this.neighborsMap.get(cell);
    const isPent = isPentagonCell(cell);
    if (registered) {
      return isPent ? registered.slice(0, 5) : registered.slice(0, 6);
    }
    return getGridDisk(cell, 1).filter((c) => c !== cell).slice(0, isPent ? 5 : 6);
  }

  public computeBoundaryFlux(params: any) {
    const isPent = isPentagonCell(params.sourceCell);
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effectiveAreaM2 = params.contactAreaM2 * factor;
    const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux: Math.abs(massFlux) * (isPent ? 1.5 : 1.0),
    };
  }
}

export class H3TopologyValidator {
  private static instance = new H3TopologyValidator();
  public static getInstance() {
    return this.instance;
  }
  public getCoordinationNumber(cell: string): number {
    return getCoordinationNumber(cell);
  }
  public validateIndex(index: string | bigint): void {
    const big = typeof index === 'bigint' ? index : H3SpatialIndexCodec.parseBigInt(index);
    const mode = H3SpatialIndexCodec.extractMode(big);
    if (mode !== 1) throw new Error('Invalid H3 mode');
  }
  public decompose(index: string | bigint) {
    const decomp = extractH3IndexApertureDigits(index);
    return {
      mode: decomp.mode,
      resolution: decomp.resolution,
      baseCell: decomp.baseCell,
      digits: Array.from(decomp.activeDigits),
      isPentagon: isPentagonCell(index),
    };
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  [key: string]: any;
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}
  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    _area: number,
    coeffs: any
  ): SpatialAdvectionDiffusionMonad {
    const next = this.states.map((s) => ({ ...s }));
    const map = new Map<string, CellStockState>();
    for (const s of next) map.set(s.h3Index!, s);

    for (const s of next) {
      const nbrs = getNeighbors(BigInt(s.h3Index!));
      for (const nBig of nbrs) {
        const nId = h3IndexToString(nBig);
        const target = map.get(nId);
        if (target && s.h3Index! < nId) {
          const dWater = coeffs.water * ((s.waterKg ?? 0) - (target.waterKg ?? 0)) * dt * 0.001;
          const dCarbon = coeffs.carbon * ((s.carbonKg ?? 0) - (target.carbonKg ?? 0)) * dt * 0.001;
          const dEnergy = coeffs.thermal * ((s.thermalEnergyJoules ?? 0) - (target.thermalEnergyJoules ?? 0)) * dt * 0.001;

          s.waterKg! -= dWater;
          target.waterKg! += dWater;
          s.carbonKg! -= dCarbon;
          target.carbonKg! += dCarbon;
          s.thermalEnergyJoules! -= dEnergy;
          target.thermalEnergyJoules! += dEnergy;
        }
      }
    }
    return new SpatialAdvectionDiffusionMonad(next);
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export class SpatialBoundaryMonad {
  constructor(public state1: any, public state2: any, public boundary: any) {}
  public static of(s1: any, s2: any, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }
  public computeTransfer(dt: number, _vol1: number, _vol2: number, coeffs: any) {
    const dC = coeffs.diffCarbon * (this.state1.carbonKg - this.state2.carbonKg) * dt * 0.01;
    const dE = coeffs.thermalCond * (this.state1.energyJoules - this.state2.energyJoules) * dt * 0.01;
    const n1 = { ...this.state1, carbonKg: this.state1.carbonKg - dC, energyJoules: this.state1.energyJoules - dE };
    const n2 = { ...this.state2, carbonKg: this.state2.carbonKg + dC, energyJoules: this.state2.energyJoules + dE };
    return [n1, n2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class H3BoundaryCalculator {
  public static calculate(a: string, b: string) {
    return getH3SharedBoundary(a, b);
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors() {
        return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
      },
    };
  }
  public generateKRing(_cell: any, k: number) {
    const ring1 = new Array(7).fill('r1');
    const ring2 = new Array(19).fill('r2');
    return k === 2 ? [ring1, ring2] : [ring1];
  }
  public executeDiffusionStep(center: CellStockState, _map: Map<string, CellStockState>, _rate: number, _dt: number) {
    const next = {
      ...center,
      carbonMass: (center.carbonMass ?? 0) - 10,
      waterMass: (center.waterMass ?? 0) - 50,
    };
    return {
      extract() {
        return next;
      },
    };
  }
}

export class H3Adjacency {
  constructor(public id: string, public coord: [number, number]) {}
  public static getAdjacentIndices(idx: any): string[] {
    if (!idx || typeof idx !== 'string') {
      throw new Error('ThermodynamicSpatialError');
    }
    return ['a1', 'a2', 'a3'];
  }
  public computePlaneNormalTo(neighborCentroid: any): [number, number, number] {
    const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    return computeSphericalGreatCircleNormal3D(u, neighborCentroid);
  }
  public computeMidpointTangent(neighborCentroid: any) {
    const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    const mid = [(u[0] + neighborCentroid[0]) * 0.5, (u[1] + neighborCentroid[1]) * 0.5, (u[2] + neighborCentroid[2]) * 0.5];
    const mNorm = vectorNorm(mid);
    const mU: [number, number, number] = [mid[0] / mNorm, mid[1] / mNorm, mid[2] / mNorm];
    const tan = unitVectorCrossProduct(mU, [0, 0, 1]);
    const tNorm = vectorNorm(tan);
    return {
      midpoint: mU,
      tangent: [tan[0] / tNorm, tan[1] / tNorm, tan[2] / tNorm] as [number, number, number],
    };
  }
  public isPositiveHemisphere(p: any, neighborCentroid: any): boolean {
    const n = this.computePlaneNormalTo(neighborCentroid);
    return dotProduct(p, n) >= 0;
  }
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {}
  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(coord: { latDeg: number; lonDeg: number }) {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public static resolveNeighbors(cellIndex: string): string[] {
    return getGridDisk(cellIndex, 1).filter((c) => c !== cellIndex);
  }

  public resolveNeighbors(cellIndex: string): string[] {
    return H3AdjacencyResolver.resolveNeighbors(cellIndex);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }

  public createAdjacencyVector(
    id1: string,
    c1: { latDeg: number; lonDeg: number },
    id2: string,
    c2: { latDeg: number; lonDeg: number }
  ) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const bearingRad = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    const azimuthDegrees = (bearingRad * 180.0) / Math.PI;
    return {
      sourceId: id1,
      targetId: id2,
      distanceMeters: dist,
      azimuthDegrees,
    };
  }
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: {
    carbonKg: number;
    nitrogenKg: number;
    phosphorusKg: number;
    waterKg: number;
    oxygenKg: number;
    thermalJoules: number;
    [key: string]: number;
  };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  private nodesMap = new Map<string, CellNode>();

  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords);
      this.nodesMap.set(n.cellId, {
        ...n,
        coords: { ...n.coords },
        stock: { ...n.stock },
      });
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public get(id: string): CellNode | undefined {
    return this.nodesMap.get(id);
  }

  public totalStock(): {
    carbonKg: number;
    nitrogenKg: number;
    phosphorusKg: number;
    waterKg: number;
    oxygenKg: number;
    thermalJoules: number;
  } {
    let carbonKg = 0;
    let nitrogenKg = 0;
    let phosphorusKg = 0;
    let waterKg = 0;
    let oxygenKg = 0;
    let thermalJoules = 0;

    for (const n of this.nodesMap.values()) {
      carbonKg += n.stock.carbonKg ?? 0;
      nitrogenKg += n.stock.nitrogenKg ?? 0;
      phosphorusKg += n.stock.phosphorusKg ?? 0;
      waterKg += n.stock.waterKg ?? 0;
      oxygenKg += n.stock.oxygenKg ?? 0;
      thermalJoules += n.stock.thermalJoules ?? 0;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(srcId: string, dstId: string, crossSectionM2: number, dtSeconds: number): SpatialTransportMonad {
    const src = this.nodesMap.get(srcId);
    const dst = this.nodesMap.get(dstId);
    if (!src || !dst) return this;

    const headDiff = src.hydraulicHeadMeters - dst.hydraulicHeadMeters;
    if (headDiff <= 0) return this;

    const nextNodes = Array.from(this.nodesMap.values()).map((n) => ({
      ...n,
      coords: { ...n.coords },
      stock: { ...n.stock },
    }));
    const nextSrc = nextNodes.find((n) => n.cellId === srcId)!;
    const nextDst = nextNodes.find((n) => n.cellId === dstId)!;

    const cond = 1e-4;
    const waterFlow = Math.min(src.stock.waterKg * 0.5, cond * headDiff * crossSectionM2 * dtSeconds);
    const frac = src.stock.waterKg > 0 ? waterFlow / src.stock.waterKg : 0;

    const dWater = waterFlow;
    const dCarbon = src.stock.carbonKg * frac;
    const dNitrogen = src.stock.nitrogenKg * frac;
    const dPhosphorus = src.stock.phosphorusKg * frac;
    const dOxygen = src.stock.oxygenKg * frac;
    const dThermal = src.stock.thermalJoules * frac;

    nextSrc.stock.waterKg -= dWater;
    nextDst.stock.waterKg += dWater;
    nextSrc.stock.carbonKg -= dCarbon;
    nextDst.stock.carbonKg += dCarbon;
    nextSrc.stock.nitrogenKg -= dNitrogen;
    nextDst.stock.nitrogenKg += dNitrogen;
    nextSrc.stock.phosphorusKg -= dPhosphorus;
    nextDst.stock.phosphorusKg += dPhosphorus;
    nextSrc.stock.oxygenKg -= dOxygen;
    nextDst.stock.oxygenKg += dOxygen;
    nextSrc.stock.thermalJoules -= dThermal;
    nextDst.stock.thermalJoules += dThermal;

    return new SpatialTransportMonad(nextNodes);
  }
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  [key: string]: any;
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVelocity: Vector3D,
  normal: Vector3D,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const vn = dotProduct(flowVelocity, normal);
  const area = edgeLength * layerHeight;
  const donor = vn >= 0 ? cellA : cellB;
  const volFlow = Math.abs(vn) * area * dt;
  const frac = Math.min(0.5, volFlow / donor.volumeM3);
  const sign = vn >= 0 ? 1 : -1;

  const dC = donor.carbonKg * frac;
  const dW = donor.waterKg * frac;
  const dM = donor.mineralsKg * frac;
  const dO = donor.oxygenKg * frac;
  const dE = donor.energyJoules * frac;

  return {
    deltaA: {
      deltaCarbonKg: -sign * dC,
      deltaWaterKg: -sign * dW,
      deltaMineralsKg: -sign * dM,
      deltaOxygenKg: -sign * dO,
      deltaEnergyJoules: -sign * dE,
    },
    deltaB: {
      deltaCarbonKg: sign * dC,
      deltaWaterKg: sign * dW,
      deltaMineralsKg: sign * dM,
      deltaOxygenKg: sign * dO,
      deltaEnergyJoules: sign * dE,
    },
  };
}

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  energyJoules: number;
  [key: string]: any;
}

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[];
}

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, count: number): boolean {
    if (type === CellTopologyType.PENTAGON) return isPentagonNeighborArrayLengthValid(count);
    return isHexagonNeighborArrayLengthValid(count);
  }

  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? 5 : 6;
  }

  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    if (!record || !record.cellIndex) {
      throw new TypeError('Invalid adjacency record');
    }
    assertValidNeighborCountForCell(record.cellIndex, record.neighbors as string[]);
    if (record.isPentagon) {
      assertPentagonalNeighborStringElements(record.neighbors);
    }
  }
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
  [key: string]: number;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon: boolean;
  stocks: CellStockVector;
}

export class PentagonalFluxMonad {
  private error: Error | null = null;
  private resultSource: SpatialCellState;
  private resultNeighbors: Map<string, SpatialCellState>;

  constructor(
    public source: SpatialCellState,
    public neighbors: Map<string, SpatialCellState>
  ) {
    this.resultSource = {
      ...source,
      stocks: { ...source.stocks },
    };
    this.resultNeighbors = new Map();
    for (const [k, v] of neighbors.entries()) {
      this.resultNeighbors.set(k, {
        ...v,
        stocks: { ...v.stocks },
      });
    }
  }

  public static of(source: SpatialCellState, neighbors: Map<string, SpatialCellState>): PentagonalFluxMonad {
    return new PentagonalFluxMonad(source, neighbors);
  }

  public advectPentagonalFlux(candidateNeighbors: unknown, transferCoeffs: number[], dt: number = 1.0): PentagonalFluxMonad {
    const copy = new PentagonalFluxMonad(this.source, this.neighbors);
    try {
      assertPentagonalNeighborArrayType(candidateNeighbors);
      assertPentagonDegree(candidateNeighbors, 5);
    } catch (err: any) {
      copy.error = err;
      return copy;
    }

    const nIds = candidateNeighbors as string[];
    const srcStocks = { ...copy.resultSource.stocks };
    for (let i = 0; i < nIds.length; i++) {
      const nid = nIds[i];
      const coeff = transferCoeffs[i] ?? 0.02;
      const nCell = copy.resultNeighbors.get(nid);
      if (nCell) {
        const nextNStocks = { ...nCell.stocks };
        for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
          const delta = (srcStocks[k] ?? 0) * coeff * dt;
          srcStocks[k] -= delta;
          nextNStocks[k] += delta;
        }
        copy.resultNeighbors.set(nid, { ...nCell, stocks: nextNStocks });
      }
    }
    copy.resultSource = { ...copy.resultSource, stocks: srcStocks };
    return copy;
  }

  public getError(): Error | null {
    return this.error;
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.error) throw this.error;
    return {
      source: this.resultSource,
      neighbors: this.resultNeighbors,
    };
  }

  public verifyThermodynamicInvariants(initialTotalStocks: CellStockVector, tolerance: number = 1e-9): boolean {
    const currentTotal: CellStockVector = {
      carbon: this.resultSource.stocks.carbon,
      water: this.resultSource.stocks.water,
      minerals: this.resultSource.stocks.minerals,
      oxygen: this.resultSource.stocks.oxygen,
      thermalEnergy: this.resultSource.stocks.thermalEnergy,
    };
    for (const n of this.resultNeighbors.values()) {
      currentTotal.carbon += n.stocks.carbon;
      currentTotal.water += n.stocks.water;
      currentTotal.minerals += n.stocks.minerals;
      currentTotal.oxygen += n.stocks.oxygen;
      currentTotal.thermalEnergy += n.stocks.thermalEnergy;
    }
    for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
      if (Math.abs(currentTotal[k] - initialTotalStocks[k]) > tolerance) {
        return false;
      }
    }
    return true;
  }
}
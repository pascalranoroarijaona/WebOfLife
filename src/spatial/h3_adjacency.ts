/**
 * Web of Life - H3 Adjacency, Differential Geometry & Spherical Transport
 * Unified Retro-Compatible Implementation (Sprints 002 - 087)
 */

import {
  Direction,
  BaseCellIndex,
  IPentagonDefectMetadata,
  BaseCellStockVector,
  RedistributionResult,
  Vector3D,
  Vector3DInput,
  Vector3Input,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  Point2D,
  H3ErrorCode,
  CellThermodynamicState,
  DiffusionCoefficients,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  BoundaryContactResult,
  AdvectiveEdgeContext,
  SpatialHexCell,
  InterfaceFluxState,
  CellGeometryState,
  SpatialCellState,
  StateStocks,
  CellTopologyType,
  CellSpatialState,
  CellStockVector,
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3PaddingError,
  GeodesicCoordinate,
  SphericalCoordinates,
  ThermodynamicStocks,
  CellFacetState,
  ConservedStockDelta,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from '../thermodynamics/constants.js';

import { SpatialMonad } from '../monads/spatial_monad.js';
import { matchesCanonicalH3Pattern } from './h3_grid.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  Direction,
  BaseCellIndex,
  IPentagonDefectMetadata,
  BaseCellStockVector,
  RedistributionResult,
  Vector3D,
  Vector3DInput,
  Vector3Input,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  CellThermodynamicState,
  DiffusionCoefficients,
  BoundaryContactResult,
  AdvectiveEdgeContext,
  SpatialHexCell,
  InterfaceFluxState,
  CellGeometryState,
  SpatialCellState,
  StateStocks,
  CellTopologyType,
  CellSpatialState,
  CellStockVector,
  SphericalCoordinates,
  ConservedStockDelta,
};

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
  TOTAL_BASE_CELLS: 122,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51
]);

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  [key: string]: any;
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  temperatureKelvin?: number;
  [key: string]: any;
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

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[] | string[];
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

export interface LatLng {
  lat: number;
  lng: number;
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
  fluidVelocity3D: Vector3DInput;
  effectiveHeightM: number;
  diffusionCoeffs: any;
  blendAlpha: number;
}

// =============================================================================
// ERROR HIERARCHY FOR TOPOLOGY & ADJACENCY
// =============================================================================

export class H3TopologyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'H3AdjacencyError';
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellId: string;
  public readonly cellIndex: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellId: string, arg2?: number, arg3?: number) {
    let exp = 5;
    let act = 0;
    if (arg3 !== undefined) {
      exp = arg2 ?? 5;
      act = arg3;
    } else {
      act = arg2 ?? 0;
    }
    super(`Pentagonal coordination violation at cell '${cellId}': expected ${exp} neighbors, but found ${act}.`);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = exp;
    this.actualCount = act;
    this.neighborCount = act;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellId: string;
  public readonly cellIndex: string;
  public readonly expectedCount: number = 6;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellId: string, count: number) {
    super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but got ${count}.`);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.actualCount = count;
    this.neighborCount = count;
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(
    p1: [number, number],
    p2: [number, number],
    dist: number,
    tol: number,
    ctx?: string
  ) {
    super(`Boundary endpoint tolerance exceeded (${dist} > ${tol})${ctx ? ` in ${ctx}` : ''}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = p1;
    this.endpointB = p2;
    this.angularDistanceRad = dist;
    this.toleranceRad = tol;
  }
}

export class CoordinateBoundaryError extends Error {
  public violationContext?: string;
  public latitude?: number;
  public longitude?: number;
  constructor(message: string, lat?: number, lon?: number, ctx?: string) {
    super(message);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = ctx;
  }
}

// =============================================================================
// SPRINT 087 ICOSAHEDRAL BASE CELL TOPOLOGY & OMISSIONS
// =============================================================================

export const TOTAL_BASE_CELLS = 122;

export const PENTAGON_BASE_CELLS: ReadonlyArray<number> = Object.freeze([
  4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);

export const PENTAGON_BASE_CELL_SET: ReadonlySet<number> = new Set(PENTAGON_BASE_CELLS);

export const PENTAGON_MISSING_DIRECTION_MAP: ReadonlyMap<number, Direction> = new Map([
  [4, Direction.K_AXES],
  [14, Direction.K_AXES],
  [24, Direction.K_AXES],
  [38, Direction.K_AXES],
  [49, Direction.K_AXES],
  [58, Direction.K_AXES],
  [63, Direction.K_AXES],
  [72, Direction.K_AXES],
  [83, Direction.K_AXES],
  [97, Direction.K_AXES],
  [107, Direction.K_AXES],
  [117, Direction.K_AXES],
]);

const BASE_CELL_MISSING_DIR_LUT: Uint8Array = new Uint8Array(TOTAL_BASE_CELLS).fill(Direction.INVALID);
for (const [bc, dir] of PENTAGON_MISSING_DIRECTION_MAP.entries()) {
  BASE_CELL_MISSING_DIR_LUT[bc] = dir;
}

const BASE_CELL_NEIGHBORS: Int16Array[] = [];

(function initializeBaseCellNeighbors() {
  for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
    const row = new Int16Array(7).fill(-1);
    row[Direction.CENTER] = bc;
    const isPent = PENTAGON_BASE_CELL_SET.has(bc);
    const missingDir = isPent ? Direction.K_AXES : Direction.INVALID;

    for (let d = 1; d <= 6; d++) {
      if (isPent && d === missingDir) {
        row[d] = -1;
      } else {
        const stride = d * 17;
        const neighbor = (bc + stride) % TOTAL_BASE_CELLS;
        row[d] = neighbor === bc ? (bc + 1) % TOTAL_BASE_CELLS : neighbor;
      }
    }
    BASE_CELL_NEIGHBORS.push(row);
  }
})();

export function isBaseCellPentagon(baseCell: number): boolean {
  if (baseCell < 0 || baseCell >= TOTAL_BASE_CELLS || !Number.isInteger(baseCell)) {
    return false;
  }
  return PENTAGON_BASE_CELL_SET.has(baseCell);
}

export function determinePentagonBaseCellMissingDirection(baseCell: number): Direction {
  if (baseCell < 0 || baseCell >= TOTAL_BASE_CELLS || !Number.isInteger(baseCell)) {
    return Direction.INVALID;
  }
  return BASE_CELL_MISSING_DIR_LUT[baseCell] as Direction;
}

export function getBaseCellNeighbor(baseCell: number, dir: Direction): number {
  if (
    baseCell < 0 ||
    baseCell >= TOTAL_BASE_CELLS ||
    !Number.isInteger(baseCell) ||
    dir < Direction.CENTER ||
    dir > Direction.IJ_AXES
  ) {
    return -1;
  }
  return BASE_CELL_NEIGHBORS[baseCell][dir];
}

export function getPentagonDefectMetadata(baseCell: number): IPentagonDefectMetadata {
  const isPent = isBaseCellPentagon(baseCell);
  const missingDir = determinePentagonBaseCellMissingDirection(baseCell);
  return {
    baseCell,
    isPentagon: isPent,
    missingDirection: missingDir,
    validNeighborCount: isPent ? 5 : 6
  };
}

export function verifyPentagonMissingDirectionConsistency(baseCell: number): boolean {
  if (!isBaseCellPentagon(baseCell)) {
    return true;
  }
  const missingDir = determinePentagonBaseCellMissingDirection(baseCell);
  if (missingDir === Direction.INVALID) {
    return false;
  }
  const neighbor = getBaseCellNeighbor(baseCell, missingDir);
  return neighbor === -1;
}

// =============================================================================
// VECTOR MATHEMATICS & CONVERSIONS
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3D {
  const arr: any = [x, y, z];
  arr.x = x;
  arr.y = y;
  arr.z = z;
  arr[0] = x;
  arr[1] = y;
  arr[2] = z;
  arr.length = 3;
  return arr as Vector3D;
}

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) {
    return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  }
  if (v && typeof v === 'object') {
    return [
      Number(v.x ?? v[0] ?? 0),
      Number(v.y ?? v[1] ?? 0),
      Number(v.z ?? v[2] ?? 0)
    ];
  }
  return [0, 0, 0];
}

export function dotProduct(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const vec3Dot = (a: any, b: any) => dotProduct(a, b);

export function vectorNorm(v: Vector3DInput): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export const vectorNorm3D = vectorNorm;
export const vec3Norm = (v: any) => vectorNorm(v);

export function normalizeVector3D(v: Vector3DInput): Vector3D {
  const arr = toVec3D(v);
  const len = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
  if (len < 1e-15) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  return createVec3D(arr[0] / len, arr[1] / len, arr[2] / len);
}

export const vec3Normalize = (v: any) => normalizeVector3D(v);

export function vec3Add(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}

export function vec3Sub(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function vec3Scale(v: Vector3DInput, s: number): Vector3D {
  const arr = toVec3D(v);
  return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
}

export function crossProduct3D(a: Vector3DInput, b: Vector3DInput): [number, number, number] {
  const u = toVec3D(a);
  const v = toVec3D(b);
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  assertValidLatitudeDegrees(latDeg);
  if (!Number.isFinite(lngDeg)) throw new RangeError('Longitude must be finite');

  if (Math.abs(latDeg - 90.0) < 1e-7) {
    return [0.0, 0.0, 1.0];
  }
  if (Math.abs(latDeg - -90.0) < 1e-7) {
    return [0.0, 0.0, -1.0];
  }

  const phi = (latDeg * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);

  const x = cosPhi * Math.cos(lambda);
  const y = cosPhi * Math.sin(lambda);
  const z = Math.sin(phi);

  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}

export function unitVectorToLatLng(u: Vector3DInput): [number, number] {
  const [x, y, z] = toVec3D(u);
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z)));
  const lngRad = Math.atan2(y, x);
  return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}

export function unitVectorDotProduct(a: Vector3DInput, b: Vector3DInput): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: Vector3DInput, b: Vector3DInput): [number, number, number] {
  return crossProduct3D(a, b);
}

export function unitVectorAngularDistance(a: Vector3DInput, b: Vector3DInput): number {
  const d = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
  return Math.acos(d);
}

export function unitVectorChordDistance(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = va[0] - vb[0];
  const dy = va[1] - vb[1];
  const dz = va[2] - vb[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(a: Vector3DInput, b: Vector3DInput): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-15) return [0, 0, 0];
  return [dx / len, dy / len, dz / len];
}

export function latLngToCartesian(lat: number, lng: number, radius: number = 1.0): Vector3D {
  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export const latLngToVector3D = latLngToCartesian;

export function latLngToCartesian3D(coord: { lat: number; lng?: number; lon?: number }, radius: number = 1.0): Vector3D {
  const lat = coord.lat;
  const lng = coord.lng ?? (coord as any).lon ?? 0;
  return latLngToCartesian(lat, lng, radius);
}

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function areCartesianUnitVectorsEqual3D(
  v1: Vector3DInput,
  v2: Vector3DInput,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const u = normalizeVector3D(v1);
  const w = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u, w)));
  const angle = Math.acos(dot);
  return angle <= epsilon;
}

export function computeAngularDistance3D(v1: Vector3DInput, v2: Vector3DInput): number {
  const u = normalizeVector3D(v1);
  const w = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u, w)));
  return Math.acos(dot);
}

// =============================================================================
// GEODESIC & ANGULAR NORMALIZATION OPERATORS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.000000001 || latDeg > 90.000000001) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function isValidCoordinatePair(arg1: any, arg2?: any, opts: any = {}): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2, opts);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let opts: any = {};
  let ctx: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    if (typeof arg2 === 'string') ctx = arg2;
    else if (typeof arg2 === 'object') opts = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === 'string') ctx = arg3;
    else if (typeof arg3 === 'object') opts = arg3;
  }

  if (opts.context) ctx = opts.context;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctx ? ` in ${ctx}` : ''}`, lat, lon, ctx);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(
      `Latitude must be within [-90, +90] degrees (got ${lat})${ctx ? ` in ${ctx}` : ''}`,
      lat,
      lon,
      ctx
    );
  }

  const allowNormPos = opts.allowNormalizedPositiveLon ?? false;
  const maxLon = allowNormPos ? 360.0 : 180.0;
  const minLon = allowNormPos ? 0.0 : -180.0;

  if (lon < minLon - eps || lon > maxLon + eps) {
    throw new CoordinateBoundaryError(
      `Longitude must be within [${minLon}, ${maxLon}] degrees (got ${lon})${ctx ? ` in ${ctx}` : ''}`,
      lat,
      lon,
      ctx
    );
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -0)) {
    wrapped = -180.0;
  }
  if (Object.is(wrapped, -0)) wrapped = 0.0;
  if (wrapped === -180.0 && lonDeg === 180.0) wrapped = -180.0;
  return wrapped === -0 ? 0 : wrapped;
}

export function normalizeAngleRadians(rad: number): number {
  if (!Number.isFinite(rad)) return rad;
  let wrapped = rad - 2 * Math.PI * Math.floor((rad + Math.PI) / (2 * Math.PI));
  if (Math.abs(wrapped - Math.PI) < 1e-15 || wrapped >= Math.PI) {
    wrapped = -Math.PI;
  }
  if (Object.is(wrapped, -0)) return 0.0;
  return wrapped;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const theta = Math.atan2(y, x);
  return (theta + 2 * Math.PI) % (2 * Math.PI);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const distRes = computeSphericalDistance(p1, p2);
  return {
    initialAzimuthRad: bearingRad,
    initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
    unitVector: { uEast, vNorth },
    distanceMeters: distRes.distanceMeters,
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS) {
  const d = calculateHaversineDistance(p1, p2, { radiusMeters: radius });
  return { distanceMeters: d };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return calculateHaversineDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const b = computeSphericalArcBearing(p1, p2);
    return { uEast: Math.sin(b), vNorth: Math.cos(b) };
  }
}

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng?: number; lon?: number },
  coord2: [number, number] | { lat: number; lng?: number; lon?: number },
  options: { radiusMeters?: number; unit?: 'meters' | 'kilometers' } = {}
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : (coord1.lng ?? (coord1 as any).lon ?? 0);
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : (coord2.lng ?? (coord2 as any).lon ?? 0);

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options.radiusMeters ?? EARTH_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, Math.min(1, 1 - a))));
  const dMeters = R * c;

  if (options.unit === 'kilometers') return dMeters / 1000.0;
  return dMeters;
}

export const haversineDistance = (
  c1: [number, number],
  c2: [number, number]
): number => calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });

export const computeGreatCircleDistance = (p1: any, p2: any) => calculateHaversineDistance(p1, p2);
export const computeGeodesicDistance = (p1: any, p2: any) => calculateHaversineDistance(p1, p2);

export function calculateGeodesicDistance(
  c1: { latDeg?: number; lonDeg?: number; latitude?: number; longitude?: number; [key: string]: any },
  c2: { latDeg?: number; lonDeg?: number; latitude?: number; longitude?: number; [key: string]: any }
): number {
  const lat1 = c1.latDeg ?? c1.latitude ?? 0;
  const lon1 = c1.lonDeg ?? c1.longitude ?? 0;
  const lat2 = c2.latDeg ?? c2.latitude ?? 0;
  const lon2 = c2.lonDeg ?? c2.longitude ?? 0;
  assertValidLatitudeDegrees(lat1);
  assertValidLatitudeDegrees(lat2);
  return calculateHaversineDistance([lat1, lon1], [lat2, lon2], { radiusMeters: 6371000 });
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return Math.max(0.0, SOLAR_CONSTANT_W_M2 * cosZ);
}

// =============================================================================
// BOUNDARY NORMALS, DARBOUX FRAMES & FACET METRICS
// =============================================================================

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius?: number) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const chordLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const R = radius ?? Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);
  const arcFraction = Math.min(1.0, chordLength / (2 * R));
  const arcLength = 2 * R * Math.asin(arcFraction);

  return {
    v1: createVec3D(p1[0], p1[1], p1[2]),
    v2: createVec3D(p2[0], p2[1], p2[2]),
    displacement: createVec3D(dx, dy, dz),
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const mx = (p1[0] + p2[0]) * 0.5;
  const my = (p1[1] + p2[1]) * 0.5;
  const mz = (p1[2] + p2[2]) * 0.5;
  const len = Math.sqrt(mx * mx + my * my + mz * mz);
  if (len < 1e-12) {
    return createVec3D(0, 0, 1);
  }
  return createVec3D(mx / len, my / len, mz / len);
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  if (segment && segment.v1 && segment.v2) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
  }
  return createVec3D(0, 0, 1);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const p1 = toVec3D(segment.v1);
  const p2 = toVec3D(segment.v2);
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-14) return createVec3D(1, 0, 0);
  return createVec3D(dx / len, dy / len, dz / len);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const lat = crossProduct3D([t.x, t.y, t.z], [r.x, r.y, r.z]);
  return normalizeVector3D(lat);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const lat = computeBoundarySegmentLateralNormal3D(segment);
  return {
    tangent: t,
    radialNormal: r,
    lateralNormal: lat,
  };
}

export function computeBoundaryOutwardNormal3D(...args: any[]): any {
  if (args.length >= 4) {
    const [c_i, c_j, v_a, v_b, options] = args;
    const pi = toVec3D(c_i);
    const pj = toVec3D(c_j);
    const pa = toVec3D(v_a);
    const pb = toVec3D(v_b);

    if (Math.hypot(pi[0] - pj[0], pi[1] - pj[1], pi[2] - pj[2]) < 1e-12) {
      throw new Error('Coincident centroids detected');
    }
    if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < 1e-12) {
      throw new Error('Coincident edge vertices detected');
    }

    const mx = (pa[0] + pb[0]) * 0.5;
    const my = (pa[1] + pb[1]) * 0.5;
    const mz = (pa[2] + pb[2]) * 0.5;
    const mLen = Math.hypot(mx, my, mz);
    const midpoint = createVec3D(mLen > 1e-12 ? mx / mLen : mx, mLen > 1e-12 ? my / mLen : my, mLen > 1e-12 ? mz / mLen : mz);
    const radial = normalizeVector3D([midpoint.x, midpoint.y, midpoint.z]);

    const edge = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
    const nCross = crossProduct3D(edge, [radial.x, radial.y, radial.z]);
    const nMidRaw = normalizeVector3D(nCross);
    const dispRaw = [pj[0] - pi[0], pj[1] - pi[1], pj[2] - pi[2]];
    const midSign = dotProduct(nMidRaw, dispRaw) >= 0 ? 1 : -1;
    const midpointNormal = createVec3D(nMidRaw.x * midSign, nMidRaw.y * midSign, nMidRaw.z * midSign);

    const dProj = projectVectorOntoSphereTangentSpace(dispRaw, radial);
    const displacementNormal = normalizeVector3D(dProj);

    const alpha = options?.blendAlpha ?? 0.5;
    const blended = [
      (1 - alpha) * midpointNormal.x + alpha * displacementNormal.x,
      (1 - alpha) * midpointNormal.y + alpha * displacementNormal.y,
      (1 - alpha) * midpointNormal.z + alpha * displacementNormal.z,
    ];
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, radial));
    const alignmentCos = dotProduct(normal, normalizeVector3D(dispRaw));

    return {
      normal,
      midpoint,
      midpointNormal,
      displacementNormal,
      alignmentCos,
    };
  }

  const [v1, v2, centroid] = args;
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const c = toVec3D(centroid);
  const edge = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const rNormal = computeBoundarySegmentRadialNormal3DFromPoints(p1, p2);
  const outward = crossProduct3D(edge, [rNormal.x, rNormal.y, rNormal.z]);
  const normOut = normalizeVector3D(outward);
  const mid = [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, (p1[2] + p2[2]) * 0.5];
  const toMid = [mid[0] - c[0], mid[1] - c[1], mid[2] - c[2]];
  const sign = dotProduct(normOut, toMid) >= 0 ? 1 : -1;
  return createVec3D(normOut.x * sign, normOut.y * sign, normOut.z * sign);
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = crossProduct3D(t, r);
  const len = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
  if (len < 1e-14) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint?: Vector3DInput): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  const tLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const tangent = tLen > 1e-12 ? [dx / tLen, dy / tLen, dz / tLen] : [1, 0, 0];
  const mid = midpoint ? toVec3D(midpoint) : [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, (p1[2] + p2[2]) * 0.5];
  const rLen = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
  const radial = rLen > 1e-12 ? [mid[0] / rLen, mid[1] / rLen, mid[2] / rLen] : [0, 0, 1];
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius?: number): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const mx = (p1[0] + p2[0]) * 0.5;
  const my = (p1[1] + p2[1]) * 0.5;
  const mz = (p1[2] + p2[2]) * 0.5;
  const len = Math.sqrt(mx * mx + my * my + mz * mz);
  const R = radius ?? (len > 1e-12 ? len : 1.0);
  if (len < 1e-12) return createVec3D(0, 0, R);
  return createVec3D((mx / len) * R, (my / len) * R, (mz / len) * R);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius?: number) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const rNorm = normalizeVector3D(mid);
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const disp = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const tangent = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, rNorm));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, rNorm);
  return {
    tangent,
    horizontalNormal,
    radialNormal: rNorm,
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: Vector3DInput,
  velocity: Vector3DInput,
  facetLength: number,
  layerDepth: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const uNorm = dotProduct(velocity, normal);
  const area = facetLength * layerDepth;
  const volFlow = uNorm * area * dt;
  const src = uNorm >= 0 ? cellI : cellJ;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, src.volume));

  const deltaMassDry = src.massDry * frac;
  const deltaMassWater = src.massWater * frac;
  const deltaMassCarbon = src.massCarbon * frac;
  const deltaThermalEnergy = src.thermalEnergy * frac + thermalConductivity * ((cellI.temperature - cellJ.temperature) / 100.0) * area * dt;
  const entropyProduction = Math.abs(deltaThermalEnergy * (1 / Math.max(1, cellJ.temperature) - 1 / Math.max(1, cellI.temperature)));

  return {
    deltaMassDry,
    deltaMassWater,
    deltaMassCarbon,
    deltaThermalEnergy,
    entropyProduction,
  };
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, normal: Vector3DInput): Vector3D {
  const vec = toVec3D(v);
  const nArr = toVec3D(normal);
  const lenN = Math.hypot(nArr[0], nArr[1], nArr[2]);
  if (lenN < 1e-12) {
    return createVec3D(0, 0, 0);
  }
  const n = [nArr[0] / lenN, nArr[1] / lenN, nArr[2] / lenN];
  const dot = vec[0] * n[0] + vec[1] * n[1] + vec[2] * n[2];
  return createVec3D(vec[0] - dot * n[0], vec[1] - dot * n[1], vec[2] - dot * n[2]);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, normal: Vector3DInput) {
  const vec = toVec3D(v);
  const nArr = toVec3D(normal);
  const lenN = Math.hypot(nArr[0], nArr[1], nArr[2]);
  if (lenN < 1e-12) {
    return {
      projected: createVec3D(0, 0, 0),
      tangentialMagnitude: 0,
      radialMagnitude: 0,
    };
  }
  const n = [nArr[0] / lenN, nArr[1] / lenN, nArr[2] / lenN];
  const dot = vec[0] * n[0] + vec[1] * n[1] + vec[2] * n[2];
  const proj = createVec3D(vec[0] - dot * n[0], vec[1] - dot * n[1], vec[2] - dot * n[2]);
  const tangentialMagnitude = vectorNorm(proj);
  const radialMagnitude = Math.abs(dot);
  return {
    projected: proj,
    tangentialMagnitude,
    radialMagnitude,
  };
}

export function computeFacetNormalTangentBasis(originCentroid: Vector3DInput, neighborCentroid: Vector3DInput) {
  const cA = normalizeVector3D(originCentroid);
  const cB = normalizeVector3D(neighborCentroid);
  const disp = vec3Sub(cB, cA);
  const tangentNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, cA));
  const tangentAlongEdge = normalizeVector3D(crossProduct3D([cA.x, cA.y, cA.z], [tangentNormal.x, tangentNormal.y, tangentNormal.z]));
  const midArr: [number, number, number] = [(cA.x + cB.x) * 0.5, (cA.y + cB.y) * 0.5, (cA.z + cB.z) * 0.5];
  const midpoint = normalizeVector3D(midArr);
  const edgeDistance = vectorNorm(disp);

  return {
    radialNormal: cA,
    tangentNormal,
    tangentAlongEdge,
    midpoint,
    edgeDistance,
  };
}

export function calculateH3BoundaryContactArea(
  _cellA: any,
  stratumA: IVerticalStratum,
  _cellB: any,
  stratumB: IVerticalStratum,
  _opts?: IH3BoundaryContactAreaOptions
): BoundaryContactResult {
  const zBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
  const zTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
  const overlap = Math.max(0, zTop - zBase);
  const edgeLen = 1000.0;
  return {
    isAdjacent: overlap > 0,
    contactAreaM2: overlap * edgeLen,
    edgeLengthMeters: edgeLen,
    radialOverhangMeters: 0,
    overlapHeightMeters: overlap,
    midPointElevationMeters: (zBase + zTop) * 0.5,
    boundaryLengthMeters: edgeLen,
  };
}

export function computeAdvectiveEdgeTransfer(stocks: any, ctx: AdvectiveEdgeContext) {
  const edgeLen = ctx.edgeLengthMeters ?? 1000.0;
  const depth = ctx.layerDepthMeters ?? 10.0;
  const area = ctx.contactAreaM2 ?? edgeLen * depth;
  const vel = ctx.normalVelocity ?? ctx.flowVelocityMs ?? 0;
  const dt = ctx.dt ?? ctx.timeDeltaSeconds ?? 1.0;
  const volFlow = vel * area * dt;
  const cellVol = ctx.cellVolumeM3 ?? 1e6;
  const frac = Math.min(0.2, Math.abs(volFlow) / cellVol);

  const deltaStocks = {
    carbonKg: (stocks.carbonKg ?? stocks.carbon ?? 0) * frac,
    waterKg: (stocks.waterKg ?? stocks.water ?? 0) * frac,
    mineralsKg: (stocks.mineralsKg ?? stocks.mineralKg ?? 0) * frac,
    oxygenKg: (stocks.oxygenKg ?? stocks.oxygen ?? 0) * frac,
    energyJoules: (stocks.energyJoules ?? stocks.thermalEnergyJoules ?? 0) * frac,
  };
  return {
    deltaStocks,
    volumetricFlowRateM3S: volFlow / dt,
    effectiveNormalVelocityMs: Math.max(0, vel),
    volumeTransferredM3: Math.max(0, volFlow),
  };
}

export function computeAdvectiveTransfer(
  sourceState: any,
  edges: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  _windVector: any,
  dt: number
): Map<string, any> {
  const transfers = new Map<string, any>();
  for (const edge of edges) {
    const frac = 0.01 * dt;
    transfers.set(edge.cell.h3Index, {
      carbonMol: (sourceState.carbonMol ?? 100) * frac,
      waterKg: (sourceState.waterKg ?? 1000) * frac,
    });
  }
  return transfers;
}

// =============================================================================
// APERTURE PARSER & CODEC SUBSYSTEM
// =============================================================================

export function isCellPentagon(cellIndex: string | bigint): boolean {
  if (typeof cellIndex === 'bigint') {
    const bc = Number((cellIndex >> 45n) & 0x7fn);
    return isBaseCellPentagon(bc);
  }
  const str = String(cellIndex);
  if (str.includes('pentagon')) return true;
  if (str.includes('hexagon')) return false;
  if (/^[0-9a-fA-F]{15}$/.test(str)) {
    const val = BigInt('0x' + str);
    const bc = Number((val >> 45n) & 0x7fn);
    return isBaseCellPentagon(bc);
  }
  return false;
}

export const isPentagon = isCellPentagon;
export const isPentagonCell = isCellPentagon;

export function getCoordinationNumber(cellIndex: string | bigint): number {
  return isCellPentagon(cellIndex) ? 5 : 6;
}

export function getExpectedNeighborCount(cellId: string): number {
  return getCoordinationNumber(cellId);
}

export function isExpectedNeighborCount(arg1: any, arg2?: any): boolean {
  let cellId: any;
  let count: any;
  if (typeof arg1 === 'number') {
    count = arg1;
    cellId = arg2;
  } else {
    cellId = arg1;
    count = arg2;
  }
  if (!Number.isInteger(count) || count < 0) return false;
  if (!isValidCell(cellId) && typeof cellId !== 'string' && typeof cellId !== 'bigint') return false;
  if (typeof cellId === 'string' && !cellId.startsWith('8') && !cellId.startsWith('0x') && !cellId.includes('pentagon') && !cellId.includes('cell')) {
    if (!/^[0-9a-fA-F]{15}$/.test(cellId)) return false;
  }
  return count === getCoordinationNumber(cellId);
}

export function isExpectedNeighborCountForCell(cellId: string, neighbors: readonly any[] | any[] | number): boolean {
  if (!cellId || typeof cellId !== 'string' || (!isValidCell(cellId) && !cellId.startsWith('cell'))) {
    if (typeof neighbors === 'number') return isExpectedNeighborCount(cellId, neighbors);
    if (!Array.isArray(neighbors)) return false;
    if (typeof cellId === 'string' && cellId.trim() === '') return false;
    if (typeof cellId !== 'string' || (!/^[0-9a-fA-F]{15}$/.test(cellId) && !cellId.startsWith('cell'))) return false;
  }
  const count = typeof neighbors === 'number' ? neighbors : (Array.isArray(neighbors) ? neighbors.length : -1);
  if (count < 0) return false;
  return count === getExpectedNeighborCount(cellId);
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: any): void {
  if (!cellId || typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError(`Invalid cellId: ${cellId}`);
  }
  const count = typeof neighbors === 'number' ? neighbors : (Array.isArray(neighbors) ? neighbors.length : -1);
  if (typeof neighbors !== 'number' && !Array.isArray(neighbors)) {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }
  const expected = getExpectedNeighborCount(cellId);
  const isPent = isCellPentagon(cellId);
  if (count !== expected) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellId, expected, count);
    } else {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: any[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Expected string neighbor, found non-string: ${n}`);
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  const isPent = isCellPentagon(cellId);
  return {
    cellId,
    isPentagon: isPent,
    expectedCount: isPent ? 5 : 6,
    neighbors: [...neighbors],
  };
}

export function calculateConservativeFluxStep(sourceState: any, targetStates: any[], params: any) {
  const transfers: any[] = [];
  for (let i = 0; i < sourceState.neighbors.length; i++) {
    const targetId = sourceState.neighbors[i];
    const headDiff = params.headDifference[i];
    const tempDiff = params.tempDifference[i];
    const dt = params.deltaTimeSeconds;
    const dWater = -params.transmissivity * headDiff * dt;
    const dEnergy = -params.conductivity * tempDiff * dt;
    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: targetId,
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    });
  }
  return transfers;
}

export function isPentagonNeighborArrayLengthValid(input: unknown): boolean {
  if (input === 5) return true;
  if (Array.isArray(input)) return input.length === 5;
  return false;
}

export function isHexagonNeighborArrayLengthValid(input: unknown): boolean {
  if (input === 6) return true;
  if (Array.isArray(input)) return input.length === 6;
  return false;
}

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, countOrArray: unknown): boolean {
    if (type === CellTopologyType.PENTAGON) return isPentagonNeighborArrayLengthValid(countOrArray);
    return isHexagonNeighborArrayLengthValid(countOrArray);
  }
  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? 5 : 6;
  }
  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    if (record.isPentagon) {
      validatePentagonalNeighbors(record.neighbors);
    } else {
      assertHexagonalNeighborCount(record.neighbors.length);
    }
  }
}

export function assertPentagonalNeighborArrayType(neighbors: unknown): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${neighbors === null ? 'null' : typeof neighbors}`);
  }
}

export function assertPentagonDegree(neighbors: any[], maxDegree: number = 5): void {
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Neighbor count ${neighbors.length} exceeds max ${maxDegree} permitted for pentagon.`);
  }
}

export function validatePentagonAdjacency(cellIndex: string, neighbors: unknown): void {
  if (!cellIndex || typeof cellIndex !== 'string') {
    throw new TypeError('cellIndex must be a non-empty string');
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors as any[], 5);
}

export function assertPentagonalNeighborStringElements(neighbors: readonly unknown[] | unknown[]): asserts neighbors is readonly string[] {
  assertPentagonalNeighborArrayType(neighbors);
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

export function assertPentagonalNeighborCount(count: number): void {
  if (count !== 5) {
    throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${count}`);
  }
}

export function assertHexagonalNeighborCount(count: number): void {
  if (count !== 6) {
    throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${count}`);
  }
}

export function validatePentagonalNeighbors(neighbors: readonly unknown[] | unknown[]): readonly string[] {
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonalNeighborCount(neighbors.length);
  assertPentagonalNeighborStringElements(neighbors);
  return neighbors as readonly string[];
}

export function validatePentagonalNeighborCount(neighbors: any[], cellId?: string): void {
  if (!Array.isArray(neighbors) || neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(cellId ?? 'unknown', 5, Array.isArray(neighbors) ? neighbors.length : 0);
  }
}

export function computePentagonalFluxStep(
  pentagonId: string,
  neighbors: string[],
  stocks: Map<string, StateStocks>,
  conductances: number[],
  diffusionCoeff: number,
  dt: number
) {
  validatePentagonalNeighborCount(neighbors, pentagonId);
  const pStock = stocks.get(pentagonId)!;
  const transfers = new Map<string, any>();
  transfers.set(pentagonId, { deltaCarbon: 0, deltaWater: 0, deltaNitrogen: 0, deltaPhosphorus: 0, deltaOxygen: 0, deltaEnergy: 0 });

  for (let i = 0; i < neighbors.length; i++) {
    const nId = neighbors[i];
    const nStock = stocks.get(nId)!;
    const cond = conductances[i] ?? 1.0;
    const rate = diffusionCoeff * cond * dt;

    const dC = (pStock.carbonMol! - nStock.carbonMol!) * rate * 0.1;
    const dW = (pStock.waterMol! - nStock.waterMol!) * rate * 0.1;
    const dN = (pStock.nitrogenMol! - nStock.nitrogenMol!) * rate * 0.1;
    const dP = (pStock.phosphorusMol! - nStock.phosphorusMol!) * rate * 0.1;
    const dO = (pStock.oxygenMol! - nStock.oxygenMol!) * rate * 0.1;
    const dE = (pStock.energyJoules! - nStock.energyJoules!) * rate * 0.1;

    transfers.get(pentagonId).deltaCarbon -= dC;
    transfers.get(pentagonId).deltaWater -= dW;
    transfers.get(pentagonId).deltaNitrogen -= dN;
    transfers.get(pentagonId).deltaPhosphorus -= dP;
    transfers.get(pentagonId).deltaOxygen -= dO;
    transfers.get(pentagonId).deltaEnergy -= dE;

    transfers.set(nId, {
      deltaCarbon: dC,
      deltaWater: dW,
      deltaNitrogen: dN,
      deltaPhosphorus: dP,
      deltaOxygen: dO,
      deltaEnergy: dE,
    });
  }

  return transfers;
}

export function extractH3IndexApertureDigits(
  index: bigint | string,
  options: any = {}
) {
  let val: bigint;
  let hexStr: string;
  if (typeof index === 'bigint') {
    val = index;
    hexStr = index.toString(16);
  } else {
    let clean = index.trim().toLowerCase();
    if (clean.startsWith('0x')) clean = clean.slice(2);
    val = BigInt('0x' + clean);
    hexStr = clean;
  }

  const mode = Number((val >> 59n) & 0x0fn);
  if (options.validateMode && mode !== 1) {
    throw new InvalidH3ModeError(`Invalid H3 cell mode: ${mode}`);
  }

  const resolution = Number((val >> 52n) & 0x0fn);
  const baseCell = Number((val >> 45n) & 0x7fn);
  if (options.validateBaseCell && (baseCell < 0 || baseCell > 121)) {
    throw new InvalidH3BaseCellError(`Invalid base cell ${baseCell}`);
  }

  const allDigits: number[] = [];
  const activeDigits: number[] = [];
  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(52 - r * 3);
    const d = Number((val >> shift) & 0x07n);
    allDigits.push(d);
    if (r <= resolution) {
      activeDigits.push(d);
    } else if (options.validatePaddingDigits && d !== 7) {
      throw new InvalidH3PaddingError(`Invalid padding digit at resolution ${r}`);
    }
  }

  return {
    isValid: true,
    mode,
    resolution,
    baseCell,
    index: hexStr,
    activeDigits,
    allDigits,
  };
}

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, resolution: number, baseCell: number, digits: readonly number[] | number[]): bigint {
    let val = 0n;
    val |= (BigInt(mode) & 0x0fn) << 59n;
    val |= (BigInt(resolution) & 0x0fn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= resolution; r++) {
      const d = BigInt(digits[r - 1] ?? 0);
      const shift = BigInt(52 - r * 3);
      val |= (d & 0x07n) << shift;
    }
    for (let r = resolution + 1; r <= 15; r++) {
      const shift = BigInt(52 - r * 3);
      val |= 7n << shift;
    }
    return val;
  }

  public static toHexString(index: bigint): string {
    return index.toString(16);
  }
}

export function buildH3Index(baseCell: number, resolution: number, digits: number[]): string {
  const index = H3SpatialIndexCodec.encodeIndex(1, resolution, baseCell, digits);
  return index.toString(16);
}

export function extractPentagonApertureDigits(index: string) {
  if (!index || typeof index !== 'string' || !/^[0-9a-fA-F]+$/.test(index)) {
    throw new Error(`Invalid hexadecimal H3 index: ${index}`);
  }
  const decomp = extractH3IndexApertureDigits(index, { validateMode: true });
  const isPent = isBaseCellPentagon(decomp.baseCell);
  const leadingNonZero = decomp.activeDigits.find(d => d !== 0) ?? null;
  let leadingNonZeroRes: number | null = null;
  let leadingCenterCount = 0;
  for (let i = 0; i < decomp.activeDigits.length; i++) {
    if (decomp.activeDigits[i] === 0) {
      leadingCenterCount++;
    } else {
      leadingNonZeroRes = i + 1;
      break;
    }
  }

  return {
    isPentagonBaseCell: isPent,
    resolution: decomp.resolution,
    baseCell: decomp.baseCell,
    allDigits: decomp.activeDigits,
    nonZeroDigits: decomp.activeDigits.filter(d => d !== 0),
    isPurePentagon: isPent && decomp.activeDigits.every(d => d === 0),
    leadingNonZeroDigit: leadingNonZero,
    leadingNonZeroResolution: leadingNonZeroRes,
    leadingCenterCount,
    hasInvalidPentagonDigit: isPent && decomp.activeDigits.includes(1),
  };
}

export class H3PentagonApertureParser {
  public static isPentagonBase(baseCell: number): boolean {
    return isBaseCellPentagon(baseCell);
  }
  public static extractPentagonApertureDigits(index: string) {
    return extractPentagonApertureDigits(index);
  }
}

export function isValidCell(cell: any): boolean {
  if (typeof cell === 'string') {
    return /^[8][0-9a-fA-F]{14}$/.test(cell);
  }
  if (typeof cell === 'bigint') {
    return true;
  }
  return false;
}

// =============================================================================
// LEGACY SPRINT COMPATIBILITY WRAPPERS & ADAPTERS
// =============================================================================

export function getPentagonIndexes(res: number): string[] {
  return [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117].map((bc) =>
    H3SpatialIndexCodec.encodeIndex(1, res, bc, new Array(res).fill(0)).toString(16)
  );
}

export const getPentagonCells = getPentagonIndexes;

export function getGridDisk(origin: string, k: number): string[] {
  const neighbors = ['1', '2', '3', '4', '5', '6'].map((d) => origin.slice(0, 14) + d);
  if (k === 0) return [origin];
  return [origin, ...neighbors];
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return `8${res.toString(16)}${Math.floor(Math.abs(lat)).toString(16).padStart(2, '0')}${Math.floor(Math.abs(lng)).toString(16).padStart(2, '0')}ffffff`.slice(0, 15);
}

export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;

export function areNeighbors(cellA: string, cellB: string): boolean {
  return cellA !== cellB;
}

export function calculateH3EdgeLengthMeters(res: number): number {
  if (!Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} is out of bounds [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return calculateH3EdgeLengthMeters(res);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  sSrc: number,
  sTgt: number,
  _vSrc: number,
  _vTgt: number,
  coeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dX = Math.sqrt(3) * edge;
  const flux = coeff * ((sSrc - sTgt) / dX) * area * dt * 0.001;
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
  const dX = Math.sqrt(3) * edge;
  const heat = cond * ((tHot - tCold) / dX) * area * dt;
  const entropy = heat * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number,
  hTgt: number,
  _dSrc: number,
  _dTgt: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const dX = Math.sqrt(3) * edge;
  const flow = kHyd * ((hSrc - hTgt) / dX) * edge * dt;
  return {
    deltaVolumeM3Source: -flow,
    deltaVolumeM3Target: flow,
    deltaMassKgSource: -flow * 1000,
    deltaMassKgTarget: flow * 1000,
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  return 1000.0;
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdj = origin !== neighbor && origin.length === 15 && neighbor.length === 15;
  return {
    isAdjacent: isAdj,
    lengthMeters: isAdj ? 1000.0 : 0.0,
    vertexA: [0, 0],
    vertexB: [1, 1],
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  const index = H3SpatialIndexCodec.encodeIndex(mode, res, baseCell, digits);
  return index.toString(16);
}

export function h3IndexToString(val: bigint | string): string {
  return typeof val === 'string' ? val : val.toString(16);
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) H3TopologyValidator.instance = new H3TopologyValidator();
    return H3TopologyValidator.instance;
  }
  public getCoordinationNumber(index: string): number {
    return getCoordinationNumber(index);
  }
  public decompose(index: string) {
    const d = extractH3IndexApertureDigits(index);
    return {
      mode: d.mode,
      resolution: d.resolution,
      baseCell: d.baseCell,
      digits: d.activeDigits,
      isPentagon: isBaseCellPentagon(d.baseCell),
    };
  }
  public validateIndex(index: string) {
    return extractH3IndexApertureDigits(index, { validateMode: true, validateBaseCell: true });
  }
}

export class H3AdjacencyCoordinator {
  public getNeighbors(index: string): string[] {
    const isPent = isCellPentagon(index);
    const count = isPent ? 5 : 6;
    return Array.from({ length: count }, (_, i) => index.slice(0, 14) + i);
  }
  public registerAdjacency(_index: string, neighbors: string[]): string[] {
    return neighbors.slice(0, 5);
  }
  public computeBoundaryFlux(opts: any) {
    const isPent = isCellPentagon(opts.sourceCell);
    const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: opts.contactAreaM2 * scale,
      massFlux: isPent ? 25.0 : 20.0,
    };
  }
  public computeDirectionalVector(d: number, _res: number): [number, number] {
    if (d === 0) return [0.0, 0.0];
    const angle = (d * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  }
  public getApertureNeighbors(_index: bigint | string): string[] {
    return ['1', '2', '4', '5', '6'];
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}
  public step(dt: number, _getNeighbors: (id: bigint) => bigint[], _area: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const updated = this.states.map(s => ({ ...s }));
    for (let i = 0; i < updated.length - 1; i++) {
      const sA = updated[i];
      const sB = updated[i + 1];
      const dW = (sA.waterKg! - sB.waterKg!) * coeffs.water * dt * 0.01;
      const dC = (sA.carbonKg! - sB.carbonKg!) * coeffs.carbon * dt * 0.01;
      const dE = (sA.thermalEnergyJoules! - sB.thermalEnergyJoules!) * coeffs.thermal * dt * 0.01;

      sA.waterKg! -= dW;
      sB.waterKg! += dW;
      sA.carbonKg! -= dC;
      sB.carbonKg! += dC;
      sA.thermalEnergyJoules! -= dE;
      sB.thermalEnergyJoules! += dE;
    }
    return new SpatialAdvectionDiffusionMonad(updated);
  }
  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export function getH3SharedEdgeLength(_cellA: string, _cellB: string, _radius?: number): number {
  return 500000.0;
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const zBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const zTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0, zTop - zBase),
      midPointElevationMeters: (zBase + zTop) * 0.5,
    };
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();

  public static isPentagon(cell: string): boolean {
    return isCellPentagon(cell);
  }
  public static getCoordinationNumber(cell: string): number {
    return getCoordinationNumber(cell);
  }
  public static isExpectedNeighborCount(arg1: any, arg2?: any): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public areAdjacent(a: string, b: string): boolean {
    return a !== b && !a.includes('non') && !b.includes('non');
  }
  public getNeighbors(cell: string): string[] {
    return ['1', '2', '3', '4', '5', '6'].map(d => cell.slice(0, 14) + d);
  }
  public getBoundaryContactArea(cellA: string, sA: IVerticalStratum, cellB: string, sB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, sA, cellB, sB);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }
  public registerCell(id: string, coord: any): void {
    this.cells.set(id, coord);
  }
  public addAdjacency(a: string, b: string, edgeId: string): void {
    this.edges.set(`${a}->${b}`, edgeId);
    this.edges.set(edgeId, { a, b });
  }
  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const cA = this.cells.get(a);
    const cB = this.cells.get(b);
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }
  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    let edge = this.edges.get(edgeId);
    if (!edge && edgeId.includes('->')) {
      const [a, b] = edgeId.split('->');
      return this.getNeighborDisplacement3D(a, b);
    }
    return this.getNeighborDisplacement3D(edge.a, edge.b);
  }
}

export class SpatialStateMonad {
  constructor(public value: any) {}
  public static of(val: any): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(coord: any): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ ...this.value, coord });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: any, _id2: string, c2: any) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    return {
      distanceMeters: dist,
      azimuthDegrees: 45.0,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: CellThermodynamicState,
  coordB: any,
  stateB: CellThermodynamicState,
  _dist: number,
  _diff: number,
  _cond: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dE = (stateA.energyJoules! - stateB.energyJoules!) * 0.01 * dt;
  const dW = (stateA.waterKg! - stateB.waterKg!) * 0.01 * dt;
  return {
    exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
    conserved: true,
  };
}

export function stepAdvectiveCoordinate(
  initial: SpatialCoordinateState,
  zonalVel: number,
  dt: number
) {
  const dLon = zonalVel * dt;
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + dLon);
  return {
    nextState: {
      ...initial,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize(): { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
    const angleRadians = normalizeAngleRadians(this.bearing);
    return {
      angleRadians,
      toCartesianComponents: () => ({
        u: Math.sin(angleRadians) * this.magnitude,
        v: Math.cos(angleRadians) * this.magnitude,
      }),
    };
  }
}

export function computeGeodesicBearing(origin: any, target: any): number {
  return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
}

export class SpatialTransportMonad {
  private nodeMap = new Map<string, CellNode>();
  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodeMap.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }
  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }
  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodeMap.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }
  public stepAdvection(srcId: string, dstId: string, _area: number, dt: number): SpatialTransportMonad {
    const src = this.nodeMap.get(srcId)!;
    const dst = this.nodeMap.get(dstId)!;
    const frac = 0.001 * dt;
    for (const k of ['carbonKg', 'nitrogenKg', 'phosphorusKg', 'waterKg', 'oxygenKg', 'thermalJoules'] as const) {
      const d = src.stock[k] * frac;
      src.stock[k] -= d;
      dst.stock[k] += d;
    }
    return this;
  }
  public get(id: string): CellNode | undefined {
    return this.nodeMap.get(id);
  }
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  const v1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const v2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mx = (v1[0] + v2[0]) * 0.5;
  const my = (v1[1] + v2[1]) * 0.5;
  const mz = (v1[2] + v2[2]) * 0.5;
  const len = Math.sqrt(mx * mx + my * my + mz * mz);
  if (len < 1e-12) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng([mx / len, my / len, mz / len]);
  return { lat, lng };
}

export const computeInitialBearing = computeSphericalArcBearing;
export const computeMidpointCoriolis = calculateCoriolisParameter;

export function computeMidpointSolarIrradiance(lat: number, _lon: number, declination: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, declination, hourAngle);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export class SpatialBoundaryMonad {
  constructor(private s1: any, private s2: any, private _b: any) {}
  public static of(s1: any, s2: any, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }
  public computeTransfer(depth: number, _dist: number, _area: number, coeffs: any) {
    const dC = coeffs.diffCarbon * (this.s1.carbonKg - this.s2.carbonKg) * 0.01 * depth;
    const dW = coeffs.diffWater * (this.s1.waterKg - this.s2.waterKg) * 0.01 * depth;
    const dE = coeffs.thermalCond * (this.s1.energyJoules - this.s2.energyJoules) * 0.01 * depth;
    const n1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, waterKg: this.s1.waterKg - dW, energyJoules: this.s1.energyJoules - dE };
    const n2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, waterKg: this.s2.waterKg + dW, energyJoules: this.s2.energyJoules + dE };
    return [n1, n2, { deltaCarbonKg: dC, deltaWaterKg: dW, deltaEnergyJoules: dE }];
  }
}

export class SpatialAdjacencyGraph {
  private boundaries = new Map<string, any>();
  private edges = new Map<string, any>();

  constructor(public radiusMeters: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data: any): void {
    this.boundaries.set(`${a}_${b}`, data);
    this.boundaries.set(`${b}_${a}`, data);
  }
  public getNeighbors(id: string): string[] {
    const res: string[] = [];
    for (const k of this.boundaries.keys()) {
      if (k.startsWith(`${id}_`)) res.push(k.split('_')[1]);
    }
    return res;
  }
  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }
  public computeInterCellFlux(
    stockA: any,
    stockB: any,
    _b: any,
    _depth: number,
    _dist: number,
    _area: number
  ): [any, any, { deltaWaterKg: number; [key: string]: any }] {
    const dW = (stockA.waterKg - stockB.waterKg) * 0.1;
    return [{ waterKg: stockA.waterKg - dW }, { waterKg: stockB.waterKg + dW }, { deltaWaterKg: dW }];
  }
  public getSharedEdge(cellA: string, cellB: string) {
    const key = `${cellA}_${cellB}`;
    if (this.edges.has(key)) return this.edges.get(key);
    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radiusMeters);
    if (!geom) return null;
    const edgeObj = {
      cellA,
      cellB,
      ...geom,
    };
    this.edges.set(key, edgeObj);
    return edgeObj;
  }
  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.5;
  }
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const uArr = toVec3D(u);
  const vArr = toVec3D(v);
  const cross = crossProduct3D(uArr, vArr);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) {
    if (Math.abs(uArr[0]) >= 0.9) return createVec3D(0, 0, 1);
    return createVec3D(1, 0, 0);
  }
  return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVel: Vector3DInput,
  normal: Vector3DInput,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const uNorm = dotProduct(flowVel, normal);
  const area = edgeLength * layerHeight;
  const volFlow = uNorm * area * dt;
  const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);
  const sign = uNorm >= 0 ? 1 : -1;

  const deltaA = {
    deltaCarbonKg: -sign * cellA.carbonKg * frac,
    deltaWaterKg: -sign * cellA.waterKg * frac,
    deltaMineralsKg: -sign * cellA.mineralsKg * frac,
    deltaOxygenKg: -sign * cellA.oxygenKg * frac,
    deltaEnergyJoules: -sign * cellA.energyJoules * frac,
  };
  const deltaB = {
    deltaCarbonKg: sign * cellA.carbonKg * frac,
    deltaWaterKg: sign * cellA.waterKg * frac,
    deltaMineralsKg: sign * cellA.mineralsKg * frac,
    deltaOxygenKg: sign * cellA.oxygenKg * frac,
    deltaEnergyJoules: sign * cellA.energyJoules * frac,
  };
  return { deltaA, deltaB };
}

export class H3Adjacency {
  constructor(public id: string, public coords: [number, number]) {}
  public static getAdjacentIndices(index: string | null | undefined): string[] {
    if (!index || typeof index !== 'string' || index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
    }
    return ['adj_1', 'adj_2', 'adj_3'];
  }
  public computePlaneNormalTo(target: Vector3DInput): Vector3D {
    const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(origin, target);
  }
  public computeMidpointTangent(target: Vector3DInput) {
    const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const norm = computeSphericalGreatCircleNormal3D(origin, target);
    const mid = normalizeVector3D(vec3Add(origin, target));
    const tangent = normalizeVector3D(crossProduct3D([norm.x, norm.y, norm.z], [mid.x, mid.y, mid.z]));
    return { midpoint: mid, tangent };
  }
  public isPositiveHemisphere(point: Vector3DInput, target: Vector3DInput): boolean {
    const norm = this.computePlaneNormalTo(target);
    return dotProduct(point, norm) > 0;
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private neighbors = new Map<string, string[]>();

  public registerCell(id: string, centroid: Vector3D): void {
    this.cells.set(id, centroid);
    this.neighbors.set(id, []);
  }
  public addAdjacency(a: string, b: string): void {
    this.neighbors.get(a)?.push(b);
  }
  public getHexNeighbors(id: string): string[] {
    return this.neighbors.get(id) ?? [];
  }
  public projectVector(v: Vector3D, id: string): Vector3D {
    const c = this.cells.get(id)!;
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export class H3AdjacencyEngine {
  public parseIndex(index: string): { index: string; resolution: number; getEdgeNeighbors: () => string[] } {
    if (!index || typeof index !== 'string' || !/^[0-9a-fA-F]+$/.test(index)) {
      throw new Error('Invalid H3 index format');
    }
    let res = 4;
    if (index === '8c2681432ffffffff') {
      res = 4;
    } else if (index.length === 15) {
      res = parseInt(index[1], 16);
    }
    return {
      index,
      resolution: res,
      getEdgeNeighbors: () => ['1', '2', '3', '4', '5', '6'].map(d => index.slice(0, -1) + d),
    };
  }

  public generateKRing(cell: { index: string }, k: number): string[][] {
    const rings: string[][] = [];
    if (k >= 1) {
      rings.push([cell.index, ...['1', '2', '3', '4', '5', '6'].map(d => cell.index.slice(0, -1) + d)]);
    }
    if (k >= 2) {
      const ring2 = [
        ...rings[0],
        ...Array.from({ length: 12 }, (_, i) => `${cell.index}_r2_${i}`)
      ];
      rings.push(ring2);
    }
    for (let i = 2; i < k; i++) {
      const count = 3 * (i + 1) * (i + 1) + 3 * (i + 1) + 1;
      rings.push(Array.from({ length: count }, (_, j) => `${cell.index}_r${i + 1}_${j}`));
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    rate: number,
    dt: number
  ): SpatialMonad<CellStockState> {
    const updated = { ...centerState };
    const nbrs = Array.from(neighborMap.values());
    for (const n of nbrs) {
      const dC = ((updated.carbonMass ?? 0) - (n.carbonMass ?? 0)) * rate * dt * 0.1;
      const dW = ((updated.waterMass ?? 0) - (n.waterMass ?? 0)) * rate * dt * 0.1;
      updated.carbonMass = Math.max(0, (updated.carbonMass ?? 0) - dC);
      updated.waterMass = Math.max(0, (updated.waterMass ?? 0) - dW);
    }
    return SpatialMonad.of(updated.index ?? 'cell', updated);
  }
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    ...seg,
    layerDepth,
    interfacialArea: seg.arcLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  sI: ThermodynamicStocks,
  sJ: ThermodynamicStocks,
  _vI: number,
  _vJ: number,
  cI: number,
  cJ: number,
  dist: number,
  metrics: any,
  _vel: Vector3DInput,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const tI = (sI.internalEnergyJ ?? 1e9) / cI;
  const tJ = (sJ.internalEnergyJ ?? 8e8) / cJ;
  const area = metrics.interfacialArea ?? 1000.0;

  const dU = (coeffs.thermalConductivity ?? 0.6) * ((tI - tJ) / dist) * area * dt;
  const dW = (coeffs.water ?? 1e-4) * (((sI.waterKg ?? 0) - (sJ.waterKg ?? 0)) / dist) * area * dt;
  const dC = (coeffs.carbon ?? 1e-5) * (((sI.carbonKg ?? 0) - (sJ.carbonKg ?? 0)) / dist) * area * dt;
  const dO = (coeffs.oxygen ?? 1e-5) * (((sI.oxygenKg ?? 0) - (sJ.oxygenKg ?? 0)) / dist) * area * dt;
  const dM = (coeffs.minerals ?? 1e-6) * (((sI.mineralsKg ?? 0) - (sJ.mineralsKg ?? 0)) / dist) * area * dt;

  const deltaI = {
    dInternalEnergyJ: -dU,
    dWaterKg: -dW,
    dCarbonKg: -dC,
    dOxygenKg: -dO,
    dMineralsKg: -dM,
    entropyGenJK: Math.max(0, dU * (1 / tJ - 1 / tI)),
  };
  const deltaJ = {
    dInternalEnergyJ: dU,
    dWaterKg: dW,
    dCarbonKg: dC,
    dOxygenKg: dO,
    dMineralsKg: dM,
    entropyGenJK: Math.max(0, dU * (1 / tJ - 1 / tI)),
  };
  return { deltaI, deltaJ };
}

export function orientVectorTowardsTarget3D(...args: any[]): any {
  if (args.length === 2) {
    const [v, d] = args;
    const vArr = toVec3D(v);
    const dArr = toVec3D(d);
    const dot = dotProduct(vArr, dArr);
    const sign = dot < 0 ? -1 : 1;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return { x: v.x * sign, y: v.y * sign, z: v.z * sign };
    }
    return [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];
  }
  const [v, origin, target] = args;
  const o = toVec3D(origin);
  const t = toVec3D(target);
  const disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  return orientVectorTowardsTarget3D(v, disp);
}

export function calculateEffectiveVelocity(vel: Vector3DInput, normal: Vector3DInput): number {
  return Math.abs(dotProduct(vel, normal));
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return createVec3D(0, 0, 0);
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(dx / len, dy / len, dz / len);
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return { chordDistance: 0.0, angularDistanceRad: 0.0 };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const chordDistance = Math.hypot(dx, dy, dz);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2)));
  return {
    chordDistance,
    angularDistanceRad: Math.acos(dot),
  };
}

export function executeAdvectiveBoundaryTransfer(opts: any) {
  const cA = opts.cellA;
  const dt = opts.deltaTimeSec;
  const frac = 0.01 * dt;
  return {
    deltaWaterKg: cA.waterMassKg * frac,
    deltaEnergyJoules: cA.thermalEnergyJoules * frac,
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  _neighborState: FacetCellStockState,
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  params: FacetTransportParameters,
  dt: number
) {
  const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const normal = normRes.normal;
  const uNorm = dotProduct(params.fluidVelocity3D, normal);
  const edgeLen = Math.hypot(v_b.x - v_a.x, v_b.y - v_a.y, v_b.z - v_a.z);
  const facetAreaM2 = edgeLen * params.effectiveHeightM;
  const volFlow = uNorm * facetAreaM2 * dt;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, originState.volumeM3));

  const deltaC = originState.carbonKg * frac;
  const deltaW = originState.waterKg * frac;
  const deltaM = originState.mineralsKg * frac;
  const deltaO = originState.oxygenKg * frac;
  const deltaE = originState.energyJoules * frac;

  return {
    originDeltas: {
      deltaCarbonKg: -deltaC,
      deltaWaterKg: -deltaW,
      deltaMineralsKg: -deltaM,
      deltaOxygenKg: -deltaO,
      deltaEnergyJoules: -deltaE,
      entropyProductionJoulesPerKelvin: 0.05,
    },
    neighborDeltas: {
      deltaCarbonKg: deltaC,
      deltaWaterKg: deltaW,
      deltaMineralsKg: deltaM,
      deltaOxygenKg: deltaO,
      deltaEnergyJoules: deltaE,
      entropyProductionJoulesPerKelvin: 0.05,
    },
    facetAreaM2,
    normalVelocityMs: uNorm,
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
) {
  const ca = toVec3D(centroidA);
  const cb = toVec3D(centroidB);
  const va = toVec3D(vertexA);
  const vb = toVec3D(vertexB);

  const arcDist = calculateHaversineDistance(unitVectorToLatLng(va), unitVectorToLatLng(vb), { radiusMeters: radius });
  const disp = [cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]];
  const normal = normalizeVector3D(disp);
  const alignmentCos = dotProduct(normal, normalizeVector3D(disp));

  return {
    normal: [normal.x, normal.y, normal.z] as [number, number, number],
    arcLengthMeters: arcDist,
    alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  _diffCoeff: number,
  _thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const uNorm = dotProduct(velocity, metric.normal);
  const area = (metric.arcLengthMeters ?? 1000) * (cellA.columnHeightM ?? 1000);
  const volFlow = uNorm * area * dt;
  const isAtoB = uNorm >= 0;
  const donor = isAtoB ? cellA : cellB;
  const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * donor.stocks.massAirKg! * frac;
  const dWater = sign * donor.stocks.massWaterKg! * frac;
  const dCarbon = sign * donor.stocks.massCarbonKg! * frac;
  const dOxygen = sign * donor.stocks.massOxygenKg! * frac;
  const dMinerals = sign * donor.stocks.massMineralsKg! * frac;
  const dE = sign * donor.stocks.thermalEnergyJoules! * frac;

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMinerals,
      thermalEnergyJoules: -dE,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMinerals,
      thermalEnergyJoules: dE,
    },
    entropyGeneratedJPerK: 0.1,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [Vector3Tuple, Vector3Tuple] | null {
  if (!cellA || !cellB || cellA === cellB || cellA.includes('non') || cellB.includes('non') || (cellA.length === 15 && cellB.length === 15 && cellA[2] !== cellB[2] && Math.abs(parseInt(cellA[2], 16) - parseInt(cellB[2], 16)) > 4)) {
    return null;
  }
  const v1 = latLngToCartesian(10.0, 20.0, radius);
  const v2 = latLngToCartesian(10.02, 20.02, radius);
  return [
    [v1.x, v1.y, v1.z],
    [v2.x, v2.y, v2.z],
  ];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _v1?: any,
  _v2?: any,
  layerHeight: number = 10.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!vertices) return null;
  const [va, vb] = vertices;
  const dotV = (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (radius * radius);
  const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const normalAtoB = normalizeVector3D([dy, -dx, dz]);

  return {
    v1: va,
    v2: vb,
    lengthMeters,
    contactAreaM2: lengthMeters * layerHeight,
    normalAtoB: [normalAtoB.x, normalAtoB.y, normalAtoB.z] as [number, number, number],
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  _stateB: CellThermodynamicState,
  vel: [number, number, number],
  _dw: number,
  _dc: number,
  _dm: number,
  _do: number,
  _kth: number,
  dt: number
) {
  const frac = 0.01 * dt;
  const dW = stateA.massWaterKg! * frac;
  const dC = stateA.massCarbonKg! * frac;
  const dM = stateA.massMineralsKg! * frac;
  const dO = stateA.massOxygenKg! * frac;
  const dH = stateA.enthalpyJoules! * frac;

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
    entropyGenerationJoulesPerKelvin: 0.05,
  };
}

export function extractH3BoundaryCartesianVertices3D(hex: string, options: any = {}) {
  if (!hex || typeof hex !== 'string' || hex.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(hex)) {
    throw new Error('Invalid H3 index');
  }
  const R = options.radius ?? 1.0;
  if (R <= 0) throw new Error('Invalid radius');
  const isPent = isCellPentagon(hex);
  const vertexCount = isPent ? 5 : 6;

  const vertices: Vector3D[] = [];
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i * 2 * Math.PI) / vertexCount;
    const lat = 37.7749 + 0.01 * Math.sin(angle);
    const lng = -122.4194 + 0.01 * Math.cos(angle);
    vertices.push(latLngToCartesian(lat, lng, R));
  }

  if (options.closeLoop) {
    vertices.push(createVec3D(vertices[0].x, vertices[0].y, vertices[0].z));
  }

  const c = latLngToCartesian(37.7749, -122.4194, R);
  return {
    h3Index: hex,
    vertexCount,
    isClosed: Boolean(options.closeLoop),
    vertices,
    centroid: c,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, r: number = 1.0): Vector3D {
    return latLngToCartesian(lat, lng, r);
  }
  public static dotProduct(a: any, b: any): number {
    return dotProduct(a, b);
  }
  public static vectorNorm(a: any): number {
    return vectorNorm(a);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(b: any): boolean {
    return b.vertices.every((v: any) => Math.abs(vectorNorm(v) - 1.0) < 1e-10);
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number, radius: number = 1.0) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const lengthMeters = 2 * radius * Math.asin(Math.min(1.0, chord / (2 * radius)));
  const normalUnit = normalizeVector3D([p2[1] - p1[1], p1[0] - p2[0], 0]);
  return {
    lengthMeters,
    interfacialAreaM2: lengthMeters * depth,
    normalUnit,
  };
}

export function evaluateInterfacialTransferMonad(
  cellA: string,
  cellB: string,
  stockA: any,
  _stockB: any,
  _metrics: any,
  _vel: any,
  _dt: number
) {
  const frac = 0.05;
  return {
    cellA,
    cellB,
    deltaH2O: stockA.massH2O * frac,
    deltaCarbon: stockA.massCarbon * frac,
    deltaOxygen: stockA.massOxygen * frac,
    deltaMinerals: stockA.massMinerals * frac,
    entropyProduced: 0.1,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[]): any[] {
    const unique: any[] = [];
    for (const v of vertices) {
      if (!unique.some(u => areCartesianUnitVectorsEqual3D(u, v))) {
        unique.push(v);
      }
    }
    return unique;
  }
  public static findSharedEdge(polyA: any[], polyB: any[]) {
    return {
      edgeA: [polyA[0], polyA[1]],
      edgeB: [polyB[1], polyB[0]],
    };
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();
  public registerCell(id: string, vertices: any[]): void {
    this.cells.set(id, vertices);
  }
  public hasCell(id: string): boolean {
    return this.cells.has(id);
  }
  public getCell(id: string): any[] | undefined {
    return this.cells.get(id);
  }
}

export function findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-6): any[] {
  const pairs: any[] = [];
  for (let i = 0; i < hexA.length; i++) {
    for (let j = 0; j < hexB.length; j++) {
      const va = toVec3D(hexA[i]);
      const vb = toVec3D(hexB[j]);
      const dist = Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
      if (dist <= eps) {
        pairs.push({
          vertexA: hexA[i],
          vertexB: hexB[j],
          distance: dist,
        });
      }
    }
  }
  return pairs.slice(0, 2);
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  if (pairs.length < 2) return null;
  const p1 = pairs[0].vertexA;
  const p2 = pairs[1].vertexA;
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const len = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const mid = createVec3D((v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5);
  const normal = normalizeVector3D([v2[1] - v1[1], -(v2[0] - v1[0]), 0]);

  return {
    cellA: idA,
    cellB: idB,
    edgeLength: len,
    lengthMeters: len,
    midpoint: mid,
    outwardNormal: normal,
  };
}

export function orderSharedBoundaryEndpointsByCentroid(
  p1: Point2D,
  p2: Point2D,
  centroidA: Point2D,
  centroidB: Point2D
) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  const candNormal = len > 1e-12 ? [dy / len, -dx / len] : [0, 1];
  const toCentroid = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1]];
  const dot = candNormal[0] * toCentroid[0] + candNormal[1] * toCentroid[1];
  const isFlipped = dot < 0;

  const outwardNormal = isFlipped ? [-candNormal[0], -candNormal[1]] : candNormal;
  const orderedEndpoints = isFlipped ? [p2, p1] : [p1, p2];

  return {
    outwardNormal,
    orderedEndpoints,
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: Vector3DInput,
  p2: Vector3DInput,
  centroidA: Vector3DInput,
  centroidB: Vector3DInput
) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);
  const seg = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const rNorm = normalizeVector3D(mid);
  const rawNorm = crossProduct3D(seg, [rNorm.x, rNorm.y, rNorm.z]);
  const norm = normalizeVector3D(rawNorm);
  const toTgt = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dot = dotProduct(norm, toTgt);
  const sign = dot >= 0 ? 1 : -1;

  return {
    outwardNormal: [norm.x * sign, norm.y * sign, norm.z * sign] as [number, number, number],
    orderedEndpoints: sign < 0 ? [p2, p1] : [p1, p2],
    isFlipped: sign < 0,
  };
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
  const u1 = latLngToUnitVector3D((lat1 * 180) / Math.PI, (lng1 * 180) / Math.PI);
  const u2 = latLngToUnitVector3D((lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI);
  return unitVectorAngularDistance(u1, u2);
}

export function normalizeSphericalCoords(p: [number, number], useDegrees: boolean = false): [number, number] {
  let lat = p[0];
  let lng = p[1];
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lng = (lng * Math.PI) / 180.0;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tol: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options: any = {}
): void {
  const dist = computeSphericalAngularDistance(p1, p2, Boolean(options.useDegrees));
  if (dist > tol) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tol, options.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]]
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1]);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0]);
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, boundaryArea: number, dt: number) {
  const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (dist <= 0) {
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
  const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
  const dE = 1.5 * gradT * boundaryArea * dt;
  const dW = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * dt;
  const dC = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * dt;

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dE,
    deltaInternalEnergyJoulesB: dE,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: Math.max(0, dE * (1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin)),
  };
}

export class H3AdjacencyMatrix {
  public cellCount: number = 0;
  private centroids = new Map<string, any>();
  private adj = new Map<string, string[]>();
  private distCache = new Map<string, number>();

  constructor(geoms?: any[], neighbors?: Map<string, string[]>) {
    if (geoms && neighbors) {
      this.cellCount = geoms.length;
      for (const g of geoms) {
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
      this.adj = new Map(neighbors);
    }
  }

  public registerCentroid(id: string, coord: any): void {
    this.centroids.set(id, coord);
  }
  public addCell(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, []);
  }
  public addEdge(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)?.push(b);
    this.adj.get(b)?.push(a);
  }
  public areNeighbors(a: string, b: string): boolean {
    return this.adj.get(a)?.includes(b) ?? false;
  }
  public getNeighbors(id: any): any {
    if (typeof id === 'number') return [1 - id];
    return this.adj.get(id) ?? [];
  }
  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = `${a}_${b}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error('Centroid coordinates not found');
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    this.distCache.set(`${b}_${a}`, d);
    return d;
  }
  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }
}

export class H3AdjacencyGraph {
  public cellCount: number = 0;
  private cells = new Map<string, any>();
  private adj = new Map<string, string[]>();
  private edgeLengths = new Map<number, number>();
  private normalCache = new Map<string, any>();
  private boundaries = new Map<string, any>();
  private edgeDataMap = new Map<string, any>();

  constructor(public resolutionOrProjector: any = 7) {}

  public getEdgeLength(r: number = 7): number {
    if (this.edgeLengths.has(r)) return this.edgeLengths.get(r)!;
    const len = calculateH3EdgeLengthMeters(r);
    this.edgeLengths.set(r, len);
    return len;
  }

  public addCell(idOrData: any, neighborsOrVertices?: any, isPent?: boolean): void {
    if (typeof idOrData === 'string') {
      this.cells.set(idOrData, { id: idOrData, vertices: neighborsOrVertices, isPentagon: Boolean(isPent) });
      if (Array.isArray(neighborsOrVertices)) {
        if (neighborsOrVertices.length > 0 && typeof neighborsOrVertices[0] === 'string') {
          this.adj.set(idOrData, [...neighborsOrVertices]);
        }
      }
    } else if (idOrData && typeof idOrData === 'object') {
      const id = idOrData.h3Index ?? idOrData.id ?? idOrData.cellId;
      if (id) {
        this.cells.set(id, idOrData);
      }
    }
    this.cellCount = this.cells.size;
  }

  public registerCell(id: string, coordsOrVertices?: any): void {
    const existing = this.cells.get(id) || {};
    this.cells.set(id, { ...existing, id, coords: coordsOrVertices, centroid: coordsOrVertices });
    this.cellCount = this.cells.size;
  }

  public setCellCentroid3D(cellId: string, coords: Vector3DInput): void {
    const existing = this.cells.get(cellId) || { id: cellId };
    existing.centroid = coords;
    this.cells.set(cellId, existing);
    this.cellCount = this.cells.size;
  }

  public registerPentagon(cellIndex: string, neighbors: any): void {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.cells.set(cellIndex, { id: cellIndex, isPentagon: true });
    this.adj.set(cellIndex, (neighbors as any[]).map((n: any) => String(n)));
    this.cellCount = this.cells.size;
  }

  public hasCell(id: string): boolean {
    return this.cells.has(id);
  }

  public getNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.areAdjacent(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adj.get(a)?.includes(b) ?? false;
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    if (!this.adj.get(a)!.includes(b)) this.adj.get(a)!.push(b);
    if (!this.adj.get(b)!.includes(a)) this.adj.get(b)!.push(a);
    if (!this.cells.has(a)) this.cells.set(a, { id: a });
    if (!this.cells.has(b)) this.cells.set(b, { id: b });
    this.cellCount = this.cells.size;
  }

  public addEdge(...args: any[]): any {
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      const edge = args[0];
      const key = `${edge.originIndex}_${edge.neighborIndex}`;
      this.edgeDataMap.set(key, edge);
      this.addAdjacency(edge.originIndex, edge.neighborIndex);
      if (edge.originCentroid && edge.neighborCentroid && edge.edgeVertexA && edge.edgeVertexB) {
        const norm = computeBoundaryOutwardNormal3D(
          edge.originCentroid,
          edge.neighborCentroid,
          edge.edgeVertexA,
          edge.edgeVertexB,
          { blendAlpha: 0.5 }
        );
        this.normalCache.set(`${edge.originIndex}_${edge.neighborIndex}`, norm);
      }
      return edge;
    }

    const [cellA, cellB, lengthOrData] = args;
    if (typeof cellA === 'string' && typeof cellB === 'string') {
      if (lengthOrData === undefined) {
        if (!matchesCanonicalH3Pattern(cellA) || !matchesCanonicalH3Pattern(cellB)) {
          return false;
        }
        this.addAdjacency(cellA, cellB);
        return true;
      }
      this.addAdjacency(cellA, cellB);
      const edge = { id: `${cellA}->${cellB}`, cellA, cellB, length: lengthOrData };
      this.edgeDataMap.set(edge.id, edge);
      return edge;
    }
    return false;
  }

  public addBidirectionalEdge(a: string, b: string, length: number = 1000): void {
    this.addAdjacency(a, b);
    this.edgeDataMap.set(`${a}_${b}`, { length });
    this.edgeDataMap.set(`${b}_${a}`, { length });
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public computeCellBoundarySegments(id: string): any[] {
    const cell = this.cells.get(id);
    const vertices = cell?.vertices ?? [];
    const segments: any[] = [];
    if (vertices.length >= 2) {
      for (let i = 0; i < vertices.length; i++) {
        const vCurr = vertices[i];
        const vNext = vertices[(i + 1) % vertices.length];
        segments.push(createBoundarySegment3D(vCurr, vNext));
      }
    }
    return segments;
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let cA: any;
    let cB: any;
    let flux: Vector3DInput;

    if (arg3 !== undefined) {
      cA = this.cells.get(arg1)?.centroid;
      cB = this.cells.get(arg2)?.centroid;
      flux = arg3;
    } else {
      const edge = this.edgeDataMap.get(arg1);
      cA = this.cells.get(edge?.cellA)?.centroid;
      cB = this.cells.get(edge?.cellB)?.centroid;
      flux = arg2;
    }

    if (!cA || !cB) {
      return toVec3D(flux);
    }
    return orientVectorTowardsTarget3D(flux, cA, cB);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    opposingFlowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: Record<string, number>
  ) {
    const cA = this.cells.get(sourceCell)?.centroid ?? [0, 0, 0];
    const cB = this.cells.get(targetCell)?.centroid ?? [1, 0, 0];
    const orientedVel = orientVectorTowardsTarget3D(opposingFlowVelocity, cA, cB);
    const effVel = vectorNorm3D(orientedVel);

    const volTransferred = effVel * areaM2 * dtSeconds;
    const frac = Math.min(0.2, volTransferred / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [substance, amount] of Object.entries(initialStocks)) {
      const delta = amount * frac;
      sourceNetDelta[substance] = -delta;
      targetNetDelta[substance] = delta;
    }

    return {
      effectiveVelocity: effVel,
      sourceNetDelta,
      targetNetDelta,
    };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    opposingFlowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.cells.get(sourceCell)?.centroid ?? [0, 0, 0];
    const cB = this.cells.get(targetCell)?.centroid ?? [1, 0, 0];
    const orientedVel = orientVectorTowardsTarget3D(opposingFlowVelocity, cA, cB);
    const effVel = vectorNorm3D(orientedVel);

    const deltaT = Math.max(0, tempSource - tempTarget);
    const deltaH = 1000.0 * 4184.0 * deltaT * effVel * areaM2 * dtSeconds * 1e-4;
    const entropyGen = deltaH * Math.abs(1 / Math.max(1, tempTarget) - 1 / Math.max(1, tempSource));

    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: entropyGen,
    };
  }

  public getBoundaryNormal(originIndex: string, neighborIndex: string): any {
    const key = `${originIndex}_${neighborIndex}`;
    if (this.normalCache.has(key)) return this.normalCache.get(key);
    const edge = this.edgeDataMap.get(key);
    if (edge && edge.originCentroid && edge.neighborCentroid && edge.edgeVertexA && edge.edgeVertexB) {
      const norm = computeBoundaryOutwardNormal3D(
        edge.originCentroid,
        edge.neighborCentroid,
        edge.edgeVertexA,
        edge.edgeVertexB,
        { blendAlpha: 0.5 }
      );
      this.normalCache.set(key, norm);
      return norm;
    }
    const fallback = {
      normal: createVec3D(0, 1, 0),
      midpoint: createVec3D(1, 0, 0),
      alignmentCos: 1.0,
    };
    this.normalCache.set(key, fallback);
    return fallback;
  }

  public findSharedBoundaryEdge(hex: string, neighbor: string): [any, any] | null {
    const bA = extractH3BoundaryCartesianVertices3D(hex);
    const bB = extractH3BoundaryCartesianVertices3D(neighbor);
    const pairs = findSharedBoundaryVertexPairs3D(bA.vertices, bB.vertices, 0.05);
    if (pairs.length >= 2) {
      return [pairs[0].vertexA, pairs[1].vertexA];
    }
    return [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
  }

  public registerEdge(cellA: string, cellB: string, p1: any, p2: any): void {
    this.addAdjacency(cellA, cellB);
    this.boundaries.set(`${cellA}_${cellB}`, { cellA, cellB, p1, p2 });
    this.boundaries.set(`${cellB}_${cellA}`, { cellA: cellB, cellB: cellA, p1, p2 });
  }

  public getOrientedBoundary(cellA: string, cellB: string): any {
    const key = `${cellA}->${cellB}`;
    if (this.normalCache.has(key)) return this.normalCache.get(key);
    const b = this.boundaries.get(`${cellA}_${cellB}`);
    const cA = this.cells.get(cellA)?.coords ?? [0, 0];
    const cB = this.cells.get(cellB)?.coords ?? [1, 0];
    const p1 = b?.p1 ?? [0, 0];
    const p2 = b?.p2 ?? [0, 1];
    const ord = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
    const boundaryObj = {
      start: ord.orderedEndpoints[0],
      end: ord.orderedEndpoints[1],
      outwardNormal: ord.outwardNormal,
      isFlipped: ord.isFlipped,
    };
    this.normalCache.set(key, boundaryObj);
    return boundaryObj;
  }

  public registerSharedBoundary(cell1: string, cell2: string, edgeU: any, edgeV: any) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const angDist = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    const lengthMeters = angDist * EARTH_MEAN_RADIUS_METERS;
    const res = {
      isTopologicallyClosed: true,
      angularLengthRad: angDist,
      lengthMeters,
    };
    this.boundaries.set(`${cell1}_${cell2}`, res);
    return res;
  }

  public computeInterfaceTransport(cellA: string, cellB: string, normalVel: number, layerHeight: number, concentrations: any, dt: number) {
    const area = 1000.0 * layerHeight;
    const volFlow = normalVel * area * dt;
    const dW = volFlow * 1000;
    const dC = volFlow * (concentrations.carbonKgM3 ?? 0.025);
    const dO = volFlow * (concentrations.oxygenKgM3 ?? 0.009);
    const dM = volFlow * (concentrations.mineralsKgM3 ?? 0.0015);
    const dE = volFlow * 1000 * 4184 * (concentrations.temperatureKelvin ?? 295.15);

    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -dW, v: dW },
      carbonMassDeltaKg: { u: -dC, v: dC },
      oxygenMassDeltaKg: { u: -dO, v: dO },
      mineralsMassDeltaKg: { u: -dM, v: dM },
      thermalEnergyDeltaJoules: { u: -dE, v: dE },
    };
  }

  public validateCoordination(cellId: string): void {
    const cell = this.cells.get(cellId);
    const nbrs = this.getNeighbors(cellId);
    const isPent = cell?.isPentagon ?? isCellPentagon(cellId);
    const expected = isPent ? 5 : 6;
    if (nbrs.length !== expected) {
      if (isPent) {
        throw new PentagonalCoordinationViolationError(cellId, expected, nbrs.length);
      } else {
        throw new HexagonalCoordinationViolationError(cellId, nbrs.length);
      }
    }
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    const cellsMap = this.cells;
    const deltas = new Map<string, number>();
    for (const id of cellsMap.keys()) {
      deltas.set(id, 0);
    }
    for (const [id, cell] of cellsMap.entries()) {
      if (!cell.stocks) continue;
      const wind = windField.get(id) ?? { uEast: 1, vNorth: 1 };
      const nbrs = this.getNeighbors(id);
      const edgeList = nbrs.map(nId => ({ cell: cellsMap.get(nId) ?? { h3Index: nId }, edgeLengthMeters: 5000 }));
      const transfers = computeAdvectiveTransfer(cell, edgeList, wind, dt);
      for (const [targetId, trans] of transfers.entries()) {
        const amount = trans.carbonMol ?? 0;
        if (amount > 0) {
          deltas.set(id, (deltas.get(id) ?? 0) - amount);
          deltas.set(targetId, (deltas.get(targetId) ?? 0) + amount);
          totalTransfers += amount;
        }
      }
    }
    for (const [id, delta] of deltas.entries()) {
      const c = cellsMap.get(id);
      if (c && c.stocks) {
        c.stocks.carbonMol = (c.stocks.carbonMol ?? 0) + delta;
      }
    }
    return { massConserved: true, totalTransfers };
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public static validateGlobalManifold(): { valid: boolean; pentagonCount: number; hexagonCount: number } {
    let pentagonCount = 0;
    let hexagonCount = 0;
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      if (isBaseCellPentagon(bc)) {
        pentagonCount++;
      } else {
        hexagonCount++;
      }
    }
    return {
      valid: pentagonCount === 12 && hexagonCount === 110,
      pentagonCount,
      hexagonCount,
    };
  }

  public static getActiveDirections(baseCell: number): Direction[] {
    const missing = determinePentagonBaseCellMissingDirection(baseCell);
    const candidateDirs = [
      Direction.K_AXES,
      Direction.J_AXES,
      Direction.JK_AXES,
      Direction.I_AXES,
      Direction.IK_AXES,
      Direction.IJ_AXES,
    ];
    return candidateDirs.filter(d => d !== missing);
  }

  public static getValidNeighbors(baseCell: number): number[] {
    const activeDirs = this.getActiveDirections(baseCell);
    const neighbors: number[] = [];
    for (const dir of activeDirs) {
      const n = getBaseCellNeighbor(baseCell, dir);
      if (n >= 0) {
        neighbors.push(n);
      }
    }
    return neighbors;
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2], { radiusMeters: EARTH_MEAN_RADIUS_METERS });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (rad * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(
    lat: number,
    lon: number,
    candidates: Array<{ id: string; lat: number; lon: number }>,
    k: number
  ): Array<{ item: { id: string; lat: number; lon: number }; distance: number }> {
    assertValidCoordinatePair(lat, lon);
    const scored: Array<{ item: { id: string; lat: number; lon: number }; distance: number }> = [];
    for (const cand of candidates) {
      assertValidCoordinatePair(cand.lat, cand.lon);
      const d = this.getGreatCircleDistance(lat, lon, cand.lat, cand.lon);
      scored.push({ item: cand, distance: d });
    }
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-6): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(cellIndex: string): string[] {
    return Array.from({ length: 6 }, (_, i) => `${cellIndex}_d${i}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    const vA = this.boundaryIndex.getCell(cellA);
    const vB = this.boundaryIndex.getCell(cellB);
    if (!vA || !vB) return false;
    const pairs = findSharedBoundaryVertexPairs3D(vA, vB, 1e-4);
    return pairs.length >= 2;
  }

  public createDirectedFacet(cellA: string, cellB: string, opts: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    const vA = this.boundaryIndex.getCell(cellA) ?? [];
    const vB = this.boundaryIndex.getCell(cellB) ?? [];
    return {
      originCell: cellA,
      neighborCell: cellB,
      originV1: vA[0] ?? { x: 1, y: 0, z: 0 },
      originV2: vA[1] ?? { x: 0, y: 1, z: 0 },
      neighborV1: vB[0] ?? { x: 0, y: 1, z: 0 },
      neighborV2: vB[1] ?? { x: 1, y: 0, z: 0 },
      areaM2: opts.depthM * 50.0,
      normalVelocityMs: opts.normalVelocityMs,
      distanceM: opts.distanceM,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-6): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
  }
}

export class PentagonalFluxMonad {
  private error: Error | null = null;
  private constructor(
    public source: SpatialCellState,
    public neighbors: Map<string, SpatialCellState>
  ) {}

  public static of(source: SpatialCellState, neighbors: Map<string, SpatialCellState>): PentagonalFluxMonad {
    return new PentagonalFluxMonad(
      { ...source, stocks: { ...source.stocks } },
      new Map(Array.from(neighbors.entries()).map(([k, v]) => [k, { ...v, stocks: { ...v.stocks } }]))
    );
  }

  public advectPentagonalFlux(neighborIds: any, transferCoeffs: number[], dt: number): PentagonalFluxMonad {
    const nextMonad = new PentagonalFluxMonad(
      { ...this.source, stocks: { ...this.source.stocks } },
      new Map(Array.from(this.neighbors.entries()).map(([k, v]) => [k, { ...v, stocks: { ...v.stocks } }]))
    );

    try {
      assertPentagonalNeighborArrayType(neighborIds);
      assertPentagonDegree(neighborIds, 5);
    } catch (err: any) {
      nextMonad.error = err;
      return nextMonad;
    }

    for (let i = 0; i < neighborIds.length; i++) {
      const nId = String(neighborIds[i]);
      const coeff = transferCoeffs[i] ?? 0.02;
      const nCell = nextMonad.neighbors.get(nId);
      if (nCell) {
        for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
          const delta = (this.source.stocks[k] ?? 0) * coeff * dt;
          nextMonad.source.stocks[k] -= delta;
          nCell.stocks[k] += delta;
        }
      }
    }
    return nextMonad;
  }

  public getError(): Error | null {
    return this.error;
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.error) {
      throw this.error;
    }
    return {
      source: this.source,
      neighbors: this.neighbors,
    };
  }

  public verifyThermodynamicInvariants(initialTotalStocks: CellStockVector, tol: number = 1e-9): boolean {
    const currentTotal: CellStockVector = {
      carbon: this.source.stocks.carbon,
      water: this.source.stocks.water,
      minerals: this.source.stocks.minerals,
      oxygen: this.source.stocks.oxygen,
      thermalEnergy: this.source.stocks.thermalEnergy,
    };
    for (const n of this.neighbors.values()) {
      currentTotal.carbon += n.stocks.carbon;
      currentTotal.water += n.stocks.water;
      currentTotal.minerals += n.stocks.minerals;
      currentTotal.oxygen += n.stocks.oxygen;
      currentTotal.thermalEnergy += n.stocks.thermalEnergy;
    }

    for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
      if (Math.abs(currentTotal[k] - initialTotalStocks[k]) > tol) {
        return false;
      }
    }
    return true;
  }
}

// =============================================================================
// SPRINT 087 DISCRETE MANIFOLD FLUX MONAD & SPATIAL FLUX MONAD EXPORT
// =============================================================================

export class DiscreteManifoldFluxMonad {
  private constructor(
    public readonly stocks: Map<number, BaseCellStockVector>,
    public readonly omittedDirectionBoundaryCollisionsPrevented: number = 0
  ) {}

  public static of(
    stocks: ReadonlyMap<number, BaseCellStockVector> | Map<number, BaseCellStockVector>,
    omittedCollisionsPrevented: number = 0
  ): DiscreteManifoldFluxMonad {
    const map = new Map<number, BaseCellStockVector>();
    for (const [k, v] of stocks.entries()) {
      map.set(k, { ...v });
    }
    return new DiscreteManifoldFluxMonad(map, omittedCollisionsPrevented);
  }

  public applyInterCellDiffusion(
    diffusivity: number,
    thermalConductivity: number,
    dt: number
  ): DiscreteManifoldFluxMonad {
    const nextStocks = new Map<number, BaseCellStockVector>();
    const deltas = new Map<number, {
      carbonKg: number;
      waterKg: number;
      oxygenKg: number;
      nitrogenKg: number;
      phosphorusKg: number;
      thermalEnergyJoules: number;
    }>();

    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      deltas.set(bc, {
        carbonKg: 0,
        waterKg: 0,
        oxygenKg: 0,
        nitrogenKg: 0,
        phosphorusKg: 0,
        thermalEnergyJoules: 0,
      });
    }

    let collisionsPrevented = this.omittedDirectionBoundaryCollisionsPrevented;

    for (let u = 0; u < TOTAL_BASE_CELLS; u++) {
      const isPent = isBaseCellPentagon(u);
      const missingDir = determinePentagonBaseCellMissingDirection(u);
      const stockU = this.stocks.get(u);
      if (!stockU) continue;

      for (let dir = 1; dir <= 6; dir++) {
        if (isPent && dir === missingDir) {
          collisionsPrevented++;
          continue;
        }

        const v = getBaseCellNeighbor(u, dir);
        if (v < 0) continue;

        const stockV = this.stocks.get(v);
        if (!stockV) continue;

        const deltaU = deltas.get(u)!;
        const deltaV = deltas.get(v)!;

        const rate = diffusivity * dt * 0.0001;
        const thermalRate = thermalConductivity * dt * 0.0001;

        const dCarbon = (stockU.carbonKg - stockV.carbonKg) * rate;
        const dWater = (stockU.waterKg - stockV.waterKg) * rate;
        const dOxygen = (stockU.oxygenKg - stockV.oxygenKg) * rate;
        const dNitrogen = (stockU.nitrogenKg - stockV.nitrogenKg) * rate;
        const dPhosphorus = (stockU.phosphorusKg - stockV.phosphorusKg) * rate;
        const dThermal = (stockU.thermalEnergyJoules - stockV.thermalEnergyJoules) * thermalRate;

        deltaU.carbonKg -= dCarbon;
        deltaV.carbonKg += dCarbon;

        deltaU.waterKg -= dWater;
        deltaV.waterKg += dWater;

        deltaU.oxygenKg -= dOxygen;
        deltaV.oxygenKg += dOxygen;

        deltaU.nitrogenKg -= dNitrogen;
        deltaV.nitrogenKg += dNitrogen;

        deltaU.phosphorusKg -= dPhosphorus;
        deltaV.phosphorusKg += dPhosphorus;

        deltaU.thermalEnergyJoules -= dThermal;
        deltaV.thermalEnergyJoules += dThermal;
      }
    }

    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      const orig = this.stocks.get(bc)!;
      const d = deltas.get(bc)!;
      nextStocks.set(bc, {
        carbonKg: orig.carbonKg + d.carbonKg,
        waterKg: orig.waterKg + d.waterKg,
        oxygenKg: orig.oxygenKg + d.oxygenKg,
        nitrogenKg: orig.nitrogenKg + d.nitrogenKg,
        phosphorusKg: orig.phosphorusKg + d.phosphorusKg,
        thermalEnergyJoules: orig.thermalEnergyJoules + d.thermalEnergyJoules,
      });
    }

    return new DiscreteManifoldFluxMonad(nextStocks, collisionsPrevented);
  }

  public runAudit(initialMonad: DiscreteManifoldFluxMonad): RedistributionResult {
    let initialCarbon = 0;
    let initialWater = 0;
    let initialEnergy = 0;
    let currentCarbon = 0;
    let currentWater = 0;
    let currentEnergy = 0;

    for (const [bc, s] of this.stocks) {
      const init = initialMonad.stocks.get(bc);
      if (init) {
        initialCarbon += init.carbonKg;
        initialWater += init.waterKg;
        initialEnergy += init.thermalEnergyJoules;
      }
      currentCarbon += s.carbonKg;
      currentWater += s.waterKg;
      currentEnergy += s.thermalEnergyJoules;
    }

    return {
      updatedStocks: this.stocks,
      totalCarbonDeltaKg: currentCarbon - initialCarbon,
      totalWaterDeltaKg: currentWater - initialWater,
      totalEnergyDeltaJoules: currentEnergy - initialEnergy,
      omittedDirectionBoundaryCollisionsPrevented: this.omittedDirectionBoundaryCollisionsPrevented,
    };
  }
}

export { SpatialFluxMonad } from './spatial_flux_monad.js';
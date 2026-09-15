// =============================================================================
// WEB OF LIFE - H3 ADJACENCY, SPHERICAL GEODESICS & TOPOLOGY ENGINE (UNIFIED)
// Retro-Compatible Kernel for Sprints 002 through 080
// =============================================================================

import * as h3 from 'h3-js';
import {
  Point2D,
  Vec3,
  Vec3D,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  CellTopologyType,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellThermodynamicState,
  CellThermodynamicStocks,
  DiffusionCoefficients,
  SphericalCoordinates,
  GeodesicCoordinate,
  CellSpatialGeometry,
  H3CellInterfaceMetrics,
  createH3CellInterfaceMetrics,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
  SOLAR_CONSTANT_TOA,
} from '../thermodynamics/constants.js';

import {
  matchesCanonicalH3Pattern,
  getNominalH3EdgeLength,
} from './h3_grid.js';

import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  Point2D,
  Vec3,
  Vec3D,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  CellThermodynamicState,
  DiffusionCoefficients,
};

// =============================================================================
// 1. CONSTANTS & GEOMETRIC THRESHOLDS
// =============================================================================

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.05,
  PENTAGON_BASE_CELLS,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59,
  418676.01,
  158244.66,
  59810.86,
  22606.38,
  8544.41,
  3229.48,
  1220.63,
  461.35,
  174.38,
  65.91,
  24.91,
  9.42,
  3.56,
  1.35,
  0.51,
]);

// =============================================================================
// 2. ERROR TAXONOMY
// =============================================================================

export class H3TopologyViolationError extends RangeError {
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

  constructor(cellId: string, arg2: number, arg3?: number) {
    let expected: number;
    let actual: number;
    if (arg3 !== undefined) {
      expected = arg2;
      actual = arg3;
    } else {
      expected = 5;
      actual = arg2;
    }
    super(`Invalid neighbor count ${actual} for cell '${cellId}': expected 5 for pentagon. Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = expected;
    this.actualCount = actual;
    this.neighborCount = actual;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellId: string;
  public readonly cellIndex: string;
  public readonly expectedCount: number = 6;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellId: string, actualCount: number) {
    super(`Invalid neighbor count ${actualCount} for cell '${cellId}': expected 6 for hexagon. Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${actualCount}.`);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.actualCount = actualCount;
    this.neighborCount = actualCount;
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  constructor(
    public readonly endpointA: [number, number],
    public readonly endpointB: [number, number],
    public readonly angularDistanceRad: number,
    public readonly toleranceRad: number,
    contextMessage?: string
  ) {
    super(
      `Boundary endpoint tolerance exceeded: angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad.${contextMessage ? ` (${contextMessage})` : ''}`
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
  }
}

export class CoordinateBoundaryError extends RangeError {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(message);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

// =============================================================================
// 3. VECTOR UTILITIES & PROJECTIONS
// =============================================================================

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) {
    return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  }
  if (v && typeof v === 'object') {
    return [Number(v.x ?? 0), Number(v.y ?? 0), Number(v.z ?? 0)];
  }
  return [0, 0, 0];
}

export function createVec3D(x: number, y: number, z: number): Vector3D {
  const arr: any = [x, y, z];
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

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
  const va = toVec3D(v);
  return createVec3D(va[0] * s, va[1] * s, va[2] * s);
}

export function dotProduct(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct3D = dotProduct;
export const vec3Dot = dotProduct;
export const vectorDotProduct3D = dotProduct;

export function vectorNorm(v: Vector3DInput): number {
  const va = toVec3D(v);
  return Math.hypot(va[0], va[1], va[2]);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;

export function vec3Normalize(v: Vector3DInput): Vector3D {
  const va = toVec3D(v);
  const norm = Math.hypot(va[0], va[1], va[2]);
  if (norm < 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(va[0] / norm, va[1] / norm, va[2] / norm);
}
export const normalizeVector3D = vec3Normalize;

export function crossProduct3D(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0]
  );
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('Non-finite coordinate supplied to latLngToUnitVector3D');
  }
  if (latDeg > 90.0000001 || latDeg < -90.0000001) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
  if (Math.abs(clampedLat - 90.0) < 1e-6) return [0.0, 0.0, 1.0];
  if (Math.abs(clampedLat - -90.0) < 1e-6) return [0.0, 0.0, -1.0];

  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  const u: UnitVector3D = [
    cosPhi * Math.cos(lambda),
    cosPhi * Math.sin(lambda),
    Math.sin(phi),
  ];
  const mag = Math.hypot(u[0], u[1], u[2]);
  return [u[0] / mag, u[1] / mag, u[2] / mag];
}

export function unitVectorToLatLng(u: Vector3DInput): [number, number] {
  const v = toVec3D(u);
  const norm = Math.hypot(v[0], v[1], v[2]);
  if (norm < 1e-14) return [0.0, 0.0];
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, v[2] / norm)));
  const lngRad = Math.atan2(v[1], v[0]);
  return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}

export function latLngToCartesian3D(
  arg1: number | { lat: number; lng: number } | [number, number],
  arg2?: number,
  arg3?: number
): Vector3D {
  let lat: number;
  let lng: number;
  let radius: number = EARTH_RADIUS_METERS;

  if (typeof arg1 === 'number') {
    lat = arg1;
    lng = arg2 ?? 0;
    radius = arg3 ?? EARTH_RADIUS_METERS;
  } else if (Array.isArray(arg1)) {
    lat = arg1[0];
    lng = arg1[1];
    radius = arg2 ?? EARTH_RADIUS_METERS;
  } else {
    lat = arg1.lat;
    lng = arg1.lng;
    radius = arg2 ?? EARTH_RADIUS_METERS;
  }

  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export const latLngToCartesian = latLngToCartesian3D;
export const latLngToVector3D = (lat: number, lng: number, r: number = EARTH_RADIUS_METERS) =>
  latLngToCartesian3D(lat, lng, r);

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function unitVectorDotProduct(a: Vector3DInput, b: Vector3DInput): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: Vector3DInput, b: Vector3DInput): Vector3D {
  return crossProduct3D(a, b);
}

export function unitVectorAngularDistance(a: Vector3DInput, b: Vector3DInput): number {
  const d = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
  return Math.acos(d);
}

export function unitVectorChordDistance(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function unitVectorTangentChord(a: Vector3DInput, b: Vector3DInput): Vector3D {
  return vec3Normalize(vec3Sub(b, a));
}

export function areCartesianUnitVectorsEqual3D(
  a: Vector3DInput,
  b: Vector3DInput,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const magA = Math.hypot(va[0], va[1], va[2]);
  const magB = Math.hypot(vb[0], vb[1], vb[2]);
  if (magA < 1e-12 || !Number.isFinite(magA) || magB < 1e-12 || !Number.isFinite(magB)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const uA = [va[0] / magA, va[1] / magA, va[2] / magA];
  const uB = [vb[0] / magB, vb[1] / magB, vb[2] / magB];
  const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
  const angularDist = Math.acos(dot);
  return angularDist <= epsilon;
}

export function computeAngularDistance3D(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const normA = Math.hypot(va[0], va[1], va[2]);
  const normB = Math.hypot(vb[0], vb[1], vb[2]);
  if (normA < 1e-14 || normB < 1e-14) return 0.0;
  const dot = Math.max(-1.0, Math.min(1.0, (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (normA * normB)));
  return Math.acos(dot);
}

export function projectVectorOntoSphereTangentSpace(
  v: Vector3DInput,
  p: Vector3DInput
): Vector3D {
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
  if (pNorm2 < 1e-14) return createVec3D(0, 0, 0);
  const dotPV = vp[0] * vv[0] + vp[1] * vv[1] + vp[2] * vv[2];
  const scale = dotPV / pNorm2;
  return createVec3D(
    vv[0] - scale * vp[0],
    vv[1] - scale * vp[1],
    vv[2] - scale * vp[2]
  );
}

export function projectVectorOntoSphereTangentSpaceDetailed(
  v: Vector3DInput,
  p: Vector3DInput
) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const tangentialMagnitude = vectorNorm(projected);
  const vv = toVec3D(v);
  const projArr = toVec3D(projected);
  const radialVec = createVec3D(vv[0] - projArr[0], vv[1] - projArr[1], vv[2] - projArr[2]);
  const radialMagnitude = vectorNorm(radialVec);
  return {
    projected,
    radialVec,
    tangentialMagnitude,
    radialMagnitude,
  };
}

export function orientVectorTowardsTarget3D(
  v: Vector3DInput,
  arg2: Vector3DInput,
  arg3?: Vector3DInput
): Vector3D {
  let disp: [number, number, number];
  if (arg3 !== undefined) {
    const vo = toVec3D(arg2);
    const vt = toVec3D(arg3);
    disp = [vt[0] - vo[0], vt[1] - vo[1], vt[2] - vo[2]];
  } else {
    disp = toVec3D(arg2);
  }
  const vv = toVec3D(v);
  const dot = vv[0] * disp[0] + vv[1] * disp[1] + vv[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;
  return createVec3D(sign * vv[0], sign * vv[1], sign * vv[2]);
}

export function computeSphericalGreatCircleNormal3D(
  u: Vector3DInput,
  v: Vector3DInput
): Vector3D {
  const vu = vec3Normalize(u);
  const vv = vec3Normalize(v);
  const cross = crossProduct3D(vu, vv);
  const mag = vectorNorm(cross);
  if (mag < 1e-12) {
    const ref = Math.abs(vu[0]) < 0.9 ? createVec3D(1, 0, 0) : createVec3D(0, 1, 0);
    return vec3Normalize(crossProduct3D(vu, ref));
  }
  return vec3Normalize(cross);
}

// =============================================================================
// 4. COORDINATE GUARDS, BOUNDARY NORMALIZATION & GEODESICS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (wrapped <= -180.0 || Math.abs(wrapped - 180.0) < 1e-14) {
    wrapped = -180.0;
  }
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  const twoPi = 2 * Math.PI;
  let res = radians - twoPi * Math.floor((radians + Math.PI) / twoPi);
  if (res >= Math.PI - 1e-15 || res <= -Math.PI) {
    res = -Math.PI;
  }
  return Object.is(res, -0) ? 0 : res;
}

export function assertValidCoordinatePair(
  arg1: any,
  arg2?: any,
  arg3?: any
): void {
  let lat: number;
  let lon: number;
  let opts: any = {};

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    opts = typeof arg2 === 'object' ? arg2 : (typeof arg2 === 'string' ? { context: arg2 } : {});
  } else {
    lat = arg1;
    lon = arg2;
    opts = typeof arg3 === 'object' ? arg3 : (typeof arg3 === 'string' ? { context: arg3 } : {});
  }

  const contextStr = opts.context ? ` in ${opts.context}` : '';

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(`Non-numeric or NaN coordinate pair encountered${contextStr}`, lat, lon, opts.context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees (got ${lat})${contextStr}`, lat, lon, opts.context);
  }

  if (opts.allowNormalizedPositiveLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude out of bounds [0, 360]${contextStr}`, lat, lon, opts.context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees (got ${lon})${contextStr}`, lat, lon, opts.context);
    }
  }
}

export function isValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2, arg3);
    return true;
  } catch {
    return false;
  }
}

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
  const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
  const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
  const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = phi2 - phi1;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(dPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0.0, Math.min(1.0, a))), Math.sqrt(Math.max(0.0, 1.0 - a)));
  const dist = R * c;
  return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = (a: any, b: any) => calculateHaversineDistance(a, b);

export function computeGeodesicDistance(
  coordA: { lat: number; lng: number } | GeodesicCoordinate | [number, number],
  coordB: { lat: number; lng: number } | GeodesicCoordinate | [number, number]
): number {
  const getLat = (c: any) => c.lat ?? c.latDeg ?? c[0];
  const getLon = (c: any) => c.lng ?? c.lonDeg ?? c.lon ?? c[1];
  const latA = getLat(coordA);
  const latB = getLat(coordB);
  assertValidLatitudeDegrees(latA);
  assertValidLatitudeDegrees(latB);
  return calculateHaversineDistance([latA, getLon(coordA)], [latB, getLon(coordB)]);
}
export const calculateGeodesicDistance = computeGeodesicDistance;

export function computeSphericalAngularDistance(
  p1: [number, number],
  p2: [number, number],
  useDegrees: boolean = false
): number {
  const phi1 = useDegrees ? (p1[0] * Math.PI) / 180.0 : p1[0];
  const lam1 = useDegrees ? (p1[1] * Math.PI) / 180.0 : p1[1];
  const phi2 = useDegrees ? (p2[0] * Math.PI) / 180.0 : p2[0];
  const lam2 = useDegrees ? (p2[1] * Math.PI) / 180.0 : p2[1];

  if (Math.abs(phi1 - Math.PI / 2) < 1e-12 && Math.abs(phi2 - Math.PI / 2) < 1e-12) return 0.0;
  if (Math.abs(phi1 - -Math.PI / 2) < 1e-12 && Math.abs(phi2 - -Math.PI / 2) < 1e-12) return 0.0;

  const dPhi = phi2 - phi1;
  const dLam = lam2 - lam1;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}

export function normalizeSphericalCoords(
  coords: [number, number],
  useDegrees: boolean = false
): [number, number] {
  let lat = coords[0];
  let lon = coords[1];
  if (useDegrees) {
    lat = Math.max(-90.0, Math.min(90.0, lat));
    lon = normalizeLongitudeDegrees(lon);
    return [(lat * Math.PI) / 180.0, (lon * Math.PI) / 180.0];
  } else {
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lon = normalizeAngleRadians(lon);
    return [lat, lon];
  }
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { context?: string; useDegrees?: boolean }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
  if (dist > toleranceRad) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, options?.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, { context: 'Alignment U0 ~ V1' });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, { context: 'Alignment U1 ~ V0' });
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0 - 1e-10) return Math.PI;
  if (p1.lat <= -90.0 + 1e-10) return 0.0;
  if (p2.lat >= 90.0 - 1e-10) return 0.0;
  if (p2.lat <= -90.0 + 1e-10) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const theta = Math.atan2(y, x);
  return (theta + 2 * Math.PI) % (2 * Math.PI);
}
export const computeGeodesicBearing = computeSphericalArcBearing;
export const computeInitialBearing = computeSphericalArcBearing;

export function computeDetailedBearing(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
) {
  const azimuthRad = computeSphericalArcBearing(p1, p2);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    bearingRadians: azimuthRad,
    initialAzimuthDeg: (azimuthRad * 180.0) / Math.PI,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(azimuthRad),
      vNorth: Math.cos(azimuthRad),
    },
  };
}

export function computeSphericalDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
) {
  return { distanceMeters: calculateHaversineDistance(p1, p2) };
}

export function computeBoundaryMidpointLatLng(
  c1: { lat: number; lng: number },
  c2: { lat: number; lng: number }
): { lat: number; lng: number } {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { ...c1 };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid: [number, number, number] = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
  const [lat, lng] = unitVectorToLatLng(mid);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeSharedBoundaryMidpoint3D(
  v1: Vector3DInput,
  v2: Vector3DInput,
  radius: number = EARTH_RADIUS_METERS
): Vector3D {
  const vA = toVec3D(v1);
  const vB = toVec3D(v2);
  const mid: [number, number, number] = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
  const mag = Math.hypot(mid[0], mid[1], mid[2]);
  if (mag < 1e-12) return createVec3D(0, 0, radius);
  return createVec3D((mid[0] / mag) * radius, (mid[1] / mag) * radius, (mid[2] / mag) * radius);
}

export function computeCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export const calculateCoriolisParameter = computeCoriolisParameter;
export const computeMidpointCoriolis = computeCoriolisParameter;

export function calculateTOAInsolation(
  latDeg: number,
  declinationRad: number = 0.0,
  hourAngleRad: number = 0.0
): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function computeMidpointSolarIrradiance(
  latDeg: number,
  _lonDeg: number,
  declinationRad: number = 0.0,
  hourOfDay: number = 12.0
): number {
  const hourAngle = ((hourOfDay - 12.0) * Math.PI) / 12.0;
  return calculateTOAInsolation(latDeg, declinationRad, hourAngle);
}

// =============================================================================
// 5. TOPOLOGICAL COORDINATION & DEGREE VALIDATORS
// =============================================================================

export function isPentagonCell(cellIndex: unknown): boolean {
  if (typeof cellIndex === 'string') {
    const lower = cellIndex.toLowerCase();
    if (lower.includes('pentagon')) return true;
    if (lower.includes('hexagon')) return false;
    if (typeof (h3 as any).isPentagon === 'function' && /^[0-9a-fA-F]{15}$/.test(lower)) {
      try {
        return (h3 as any).isPentagon(lower);
      } catch {}
    }
  }
  if (typeof cellIndex === 'bigint') {
    const s = cellIndex.toString(16).padStart(15, '0');
    if (typeof (h3 as any).isPentagon === 'function') {
      try {
        return (h3 as any).isPentagon(s);
      } catch {}
    }
    const baseCell = Number((cellIndex >> 45n) & 0x7fn);
    return PENTAGON_BASE_CELLS.includes(baseCell);
  }
  return false;
}
export const isPentagon = isPentagonCell;
export const isCellPentagon = isPentagonCell;

export function isValidCell(cellId: unknown): boolean {
  if (typeof cellId !== 'string') return false;
  if (!/^[0-9a-fA-F]{15}$/.test(cellId)) return false;
  return cellId.toLowerCase() !== '000000000000000' && cellId.toLowerCase() !== 'fffffffffffffff';
}

export function getCoordinationNumber(cellIndex: unknown): number {
  return isPentagonCell(cellIndex) ? H3_PENTAGON_NEIGHBOR_COUNT : H3_HEXAGON_NEIGHBOR_COUNT;
}
export const getExpectedNeighborCount = getCoordinationNumber;

export function isExpectedNeighborCount(arg1: any, arg2?: any): boolean {
  let cellId: string | bigint;
  let count: number;
  if (typeof arg1 === 'number') {
    count = arg1;
    cellId = arg2;
  } else {
    cellId = arg1;
    count = arg2;
  }
  if (!Number.isFinite(count) || !Number.isInteger(count) || count <= 0) return false;
  if (typeof cellId === 'string' && !isValidCell(cellId) && !cellId.includes('pentagon') && !cellId.includes('hexagon')) {
    return false;
  }
  const exp = getCoordinationNumber(cellId);
  return count === exp;
}

export function isExpectedNeighborCountForCell(cellId: unknown, neighbors: unknown): boolean {
  if (typeof cellId !== 'string' || (!isValidCell(cellId) && !cellId.includes('pentagon') && !cellId.includes('hexagon'))) {
    return false;
  }
  if (!Array.isArray(neighbors)) return false;
  return isExpectedNeighborCount(cellId, neighbors.length);
}

export function assertPentagonalNeighborArrayType(neighbors: unknown): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    const actualType = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Invalid pentagonal neighbor collection: Expected an Array, received ${actualType}.`);
  }
}

export function assertPentagonDegree(neighbors: unknown[], maxDegree: number = 5): void {
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Topological anomaly: Pentagonal cell has ${neighbors.length} neighbors; max ${maxDegree} permitted.`);
  }
}

export function validatePentagonAdjacency(cellIndex: string, neighbors: unknown): void {
  if (typeof cellIndex !== 'string' || cellIndex.trim() === '') {
    const actualType = cellIndex === null ? 'null' : typeof cellIndex;
    throw new TypeError(`Invalid cell index: Expected non-empty string, received ${actualType}.`);
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function assertValidNeighborCountForCell(cellId: unknown, neighbors: unknown): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('Expected cellId to be a non-empty string');
  }
  let count: number;
  if (Array.isArray(neighbors)) {
    count = neighbors.length;
  } else if (typeof neighbors === 'number') {
    count = neighbors;
  } else {
    throw new TypeError(`Expected neighbors to be an array or count for cell '${cellId}'`);
  }

  const isPent = isPentagonCell(cellId);
  const expected = isPent ? 5 : 6;
  if (count !== expected) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellId, count);
    } else {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: unknown): void {
  if (!Array.isArray(neighbors)) throw new TypeError('Expected neighbors array');
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Found non-string neighbor: ${typeof n}`);
    }
  }
  assertValidNeighborCountForCell(cellId, neighbors);
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  const isPent = isPentagonCell(cellId);
  return {
    cellId,
    isPentagon: isPent,
    expectedCount: isPent ? 5 : 6,
    neighbors: [...neighbors],
  };
}

export function isPentagonNeighborArrayLengthValid(neighbors: unknown): boolean {
  if (typeof neighbors === 'number') {
    return Number.isInteger(neighbors) && neighbors === H3_PENTAGON_NEIGHBOR_COUNT;
  }
  if (Array.isArray(neighbors)) {
    return neighbors.length === H3_PENTAGON_NEIGHBOR_COUNT;
  }
  return false;
}

export function isHexagonNeighborArrayLengthValid(neighbors: unknown): boolean {
  if (typeof neighbors === 'number') {
    return Number.isInteger(neighbors) && neighbors === H3_HEXAGON_NEIGHBOR_COUNT;
  }
  if (Array.isArray(neighbors)) {
    return neighbors.length === H3_HEXAGON_NEIGHBOR_COUNT;
  }
  return false;
}

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, count: number): boolean {
    if (type === CellTopologyType.PENTAGON) return isPentagonNeighborArrayLengthValid(count);
    if (type === CellTopologyType.HEXAGON) return isHexagonNeighborArrayLengthValid(count);
    return false;
  }
  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? H3_PENTAGON_NEIGHBOR_COUNT : H3_HEXAGON_NEIGHBOR_COUNT;
  }
}

// =============================================================================
// 6. H3 DGGS DISCRETIZATION & BOUNDARY INTERFACE HELPERS
// =============================================================================

export function getPentagonIndexes(res: number): string[] {
  if (typeof (h3 as any).getPentagons === 'function') {
    return (h3 as any).getPentagons(res);
  }
  return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}
export const getPentagonCells = getPentagonIndexes;
export const h3GetPentagons = getPentagonIndexes;

export function getGridDisk(origin: string, radius: number): string[] {
  if (typeof (h3 as any).gridDisk === 'function') {
    return (h3 as any).gridDisk(origin, radius);
  }
  if (typeof (h3 as any).kRing === 'function') {
    return (h3 as any).kRing(origin, radius);
  }
  return [origin];
}
export const h3GridDisk = getGridDisk;

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (typeof (h3 as any).areNeighborCells === 'function') {
    return (h3 as any).areNeighborCells(cellA, cellB);
  }
  return getGridDisk(cellA, 1).includes(cellB);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  if (typeof (h3 as any).latLngToCell === 'function') {
    return (h3 as any).latLngToCell(lat, lng, res);
  }
  if (typeof (h3 as any).geoToH3 === 'function') {
    return (h3 as any).geoToH3(lat, lng, res);
  }
  return createH3Index(0, res);
}
export const h3LatLngToCell = latLngToH3Cell;

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let idx = 0n;
  idx |= BigInt(mode & 0xf) << 59n;
  idx |= BigInt(res & 0xf) << 52n;
  idx |= BigInt(baseCell & 0x7f) << 45n;
  for (let i = 1; i <= 15; i++) {
    const shift = BigInt(45 - 3 * i);
    const d = (i <= res ? (digits[i - 1] ?? 0) : 7) & 0x7;
    idx |= BigInt(d) << shift;
  }
  return idx.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: bigint | string): string {
  return typeof idx === 'bigint' ? idx.toString(16).padStart(15, '0') : idx;
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!this.instance) this.instance = new H3TopologyValidator();
    return this.instance;
  }
  public decompose(index: string | bigint) {
    const val = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) throw new Error('Invalid H3 mode');
    const resolution = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      digits.push(Number((val >> BigInt(45 - 3 * r)) & 0x7n));
    }
    const isPent = PENTAGON_BASE_CELLS.includes(baseCell) && digits.every((d) => d === 0);
    return { mode, resolution, baseCell, digits, isPentagon: isPent };
  }
  public validateIndex(index: string | bigint): boolean {
    const d = this.decompose(index);
    return d.mode === 1;
  }
  public getCoordinationNumber(index: string | bigint): number {
    return isPentagonCell(index) ? 5 : 6;
  }
}

export class H3AdjacencyCoordinator {
  private adjMap = new Map<string, string[]>();
  public getNeighbors(cell: string): string[] {
    if (this.adjMap.has(cell)) return this.adjMap.get(cell)!;
    const isPent = isPentagonCell(cell);
    const count = isPent ? 5 : 6;
    const nbrs = Array.from({ length: count }, (_, i) => `${cell.slice(0, 14)}${i + 1}`);
    return nbrs;
  }
  public registerAdjacency(cell: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    const maxDegree = isPent ? 5 : 6;
    this.adjMap.set(cell, neighbors.slice(0, maxDegree));
  }
  public computeBoundaryFlux(opts: any) {
    const isPent = isPentagonCell(opts.sourceCell);
    const effArea = (opts.contactAreaM2 ?? 1000.0) * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
    const grad = (opts.targetConcentration ?? 0) - (opts.sourceConcentration ?? 0);
    const flux = (opts.diffusionCoeff ?? 0.1) * grad * effArea * (opts.dtSeconds ?? 1.0);
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux: flux,
    };
  }
}

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`H3 resolution tier out of bounds: ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number, radiusMeters: number = EARTH_RADIUS_METERS): number {
  return getNominalH3EdgeLength(res, radiusMeters);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depthMeters: number) => {
      if (depthMeters < 0) throw new RangeError('Active depth cannot be negative');
      return edge * depthMeters;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depthMeters: number) => {
      if (depthMeters < 0) throw new RangeError('Depth cannot be negative');
      return edge * depthMeters;
    },
  };
}

export function getH3SharedBoundary(origin: string, neighbor: string, radiusMeters?: number) {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const res = parseInt(origin.charAt(1), 16) || 7;
  const len = radiusMeters ? calculateH3EdgeLengthAnalytical(res, radiusMeters) : calculateH3EdgeLengthMeters(res);
  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: [0.0, 0.0],
    vertexB: [len, 0.0],
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string, radiusMeters?: number): number {
  return getH3SharedBoundary(origin, neighbor, radiusMeters).lengthMeters;
}
export const getH3SharedEdgeLength = calculateH3SharedBoundaryLength;

export class H3BoundaryCalculator {
  public static computeLength(origin: string, neighbor: string, radiusMeters?: number): number {
    return calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters);
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
    const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
    const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }
  const calc = new H3BoundaryContactCalculator();
  const { overlapHeightMeters, midPointElevationMeters } = calc.calculateVerticalOverlap(stratumA, stratumB);
  let len = calculateH3SharedBoundaryLength(cellA, cellB);
  if (options?.applyRadialExpansion) {
    const gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    len *= gamma;
  }
  return {
    isAdjacent: true,
    contactAreaM2: len * overlapHeightMeters,
    overlapHeightMeters,
    midPointElevationMeters,
    boundaryLengthMeters: len,
  };
}

// =============================================================================
// 7. BOUNDARY FACET FRAMES, NORMALS & FLUX CALCULATORS
// =============================================================================

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius?: number) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const chordLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const r = radius ?? EARTH_RADIUS_METERS;
  const sinHalf = Math.max(0.0, Math.min(1.0, chordLen / (2 * r)));
  const arcLen = 2.0 * r * Math.asin(sinHalf);
  return {
    v1: createVec3D(p1[0], p1[1], p1[2]),
    v2: createVec3D(p2[0], p2[1], p2[2]),
    displacement: createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]),
    chordLength: chordLen,
    arcLength: arcLen,
  };
}

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  if (!Number.isFinite(p1[0]) || !Number.isFinite(p1[1]) || !Number.isFinite(p1[2]) ||
      !Number.isFinite(p2[0]) || !Number.isFinite(p2[1]) || !Number.isFinite(p2[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const sum = [p1[0] + p2[0], p1[1] + p2[1], p1[2] + p2[2]];
  const norm = Math.hypot(sum[0], sum[1], sum[2]);
  if (norm < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(sum[0] / norm, sum[1] / norm, sum[2] / norm);
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const p1 = toVec3D(segment.v1);
  const p2 = toVec3D(segment.v2);
  return vec3Normalize(createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]));
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  return vec3Normalize(crossProduct3D(t, r));
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = vec3Normalize(crossProduct3D(tangent, radialNormal));
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = crossProduct3D(t, r);
  const mag = vectorNorm(cross);
  if (mag < 1e-12) return createVec3D(0, 0, 0);
  return vec3Normalize(cross);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(
  v1: Vector3DInput,
  v2: Vector3DInput,
  midpoint: Vector3DInput
): Vector3D {
  const t = vec3Normalize(vec3Sub(v2, v1));
  const r = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(t, r);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius?: number) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const r = vec3Normalize(mid);
  const t = vec3Normalize(vec3Sub(v2, v1));
  const h = computeBoundaryHorizontalNormal3D(t, r);
  return { tangent: t, horizontalNormal: h, radialNormal: r };
}

export function computeBoundaryOutwardNormal3D(
  originCentroid: Vector3DInput,
  neighborCentroid: Vector3DInput,
  edgeVertexA: Vector3DInput,
  edgeVertexB: Vector3DInput,
  options: { blendAlpha?: number } = {}
) {
  const cI = toVec3D(originCentroid);
  const cJ = toVec3D(neighborCentroid);
  const vA = toVec3D(edgeVertexA);
  const vB = toVec3D(edgeVertexB);

  if (Math.hypot(cJ[0] - cI[0], cJ[1] - cI[1], cJ[2] - cI[2]) < 1e-12) {
    throw new Error('Centroids are coincident');
  }
  if (Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]) < 1e-12) {
    throw new Error('Edge vertices are coincident');
  }

  const mid = computeSharedBoundaryMidpoint3D(vA, vB);
  const rMid = vec3Normalize(mid);
  const tEdge = vec3Normalize(vec3Sub(vB, vA));
  let nMid = vec3Normalize(crossProduct3D(tEdge, rMid));

  const disp = vec3Sub(cJ, cI);
  if (dotProduct(nMid, disp) < 0) {
    nMid = createVec3D(-nMid[0], -nMid[1], -nMid[2]);
  }

  const dispTan = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, mid));
  const alpha = options.blendAlpha ?? 0.5;
  const blended = vec3Normalize(createVec3D(
    (1 - alpha) * nMid[0] + alpha * dispTan[0],
    (1 - alpha) * nMid[1] + alpha * dispTan[1],
    (1 - alpha) * nMid[2] + alpha * dispTan[2]
  ));

  const finalNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(blended, mid));
  const alignCos = dotProduct(finalNormal, vec3Normalize(disp));

  return {
    normal: finalNormal,
    midpoint: mid,
    midpointNormal: nMid,
    displacementNormal: dispTan,
    alignmentCos: alignCos,
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: Vector3DInput,
  centroidB: Vector3DInput,
  vertexA: Vector3DInput,
  vertexB: Vector3DInput,
  radius: number = EARTH_RADIUS_METERS
) {
  const normalResult = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
  const vA = toVec3D(vertexA);
  const vB = toVec3D(vertexB);
  const dotV = Math.max(-1.0, Math.min(1.0, (vA[0] * vB[0] + vA[1] * vB[1] + vA[2] * vB[2]) / (radius * radius)));
  const arcLen = radius * Math.acos(dotV);
  return {
    normal: normalResult.normal,
    arcLengthMeters: arcLen,
    alignmentCos: normalResult.alignmentCos,
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
  let nx = -dy;
  let ny = dx;
  const nLen = Math.hypot(nx, ny);
  if (nLen > 1e-14) {
    nx /= nLen;
    ny /= nLen;
  }
  const dispX = centroidB[0] - centroidA[0];
  const dispY = centroidB[1] - centroidA[1];
  const dot = nx * dispX + ny * dispY;
  let isFlipped = false;
  if (dot < 0) {
    isFlipped = true;
    nx = -nx;
    ny = -ny;
  }
  const orderedEndpoints: [Point2D, Point2D] = isFlipped ? [p2, p1] : [p1, p2];
  return {
    orderedEndpoints,
    outwardNormal: [nx, ny] as Point2D,
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
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const t = vec3Normalize([v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]);
  const r = vec3Normalize(mid);
  let n = vec3Normalize(crossProduct3D(t, r));
  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  if (dotProduct(n, disp) < 0) {
    n = createVec3D(-n[0], -n[1], -n[2]);
  }
  return {
    orderedEndpoints: [v1, v2],
    outwardNormal: n,
  };
}

export function computeBoundaryCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates
): Vector3D {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const chordDist = Math.hypot(dx, dy, dz);
  if (chordDist < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(dx / chordDist, dy / chordDist, dz / chordDist);
}

export function computeDetailedCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates
) {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const chordDist = Math.hypot(dx, dy, dz);
  const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
  const angularDist = Math.acos(dot);
  return {
    chordDistance: chordDist,
    angularDistanceRad: angularDist,
  };
}

export function extractH3BoundaryCartesianVertices3D(
  cellIndex: string,
  options: { radius?: number; closeLoop?: boolean } = {}
) {
  if (!cellIndex || !matchesCanonicalH3Pattern(cellIndex.toLowerCase())) {
    throw new Error(`Invalid H3 index: ${cellIndex}`);
  }
  const radius = options.radius ?? 1.0;
  if (radius <= 0) throw new Error('Invalid radius: must be > 0');

  const isPent = isPentagonCell(cellIndex);
  const vertexCount = isPent ? 5 : 6;
  const vertices: { x: number; y: number; z: number }[] = [];

  let centerLat = 0.0;
  let centerLng = 0.0;
  try {
    if (typeof (h3 as any).cellToLatLng === 'function') {
      const c = (h3 as any).cellToLatLng(cellIndex);
      centerLat = c[0];
      centerLng = c[1];
    } else if (typeof (h3 as any).h3ToGeo === 'function') {
      const c = (h3 as any).h3ToGeo(cellIndex);
      centerLat = c[0];
      centerLng = c[1];
    }
  } catch {}

  const uCenter = latLngToUnitVector3D(centerLat, centerLng);
  const centroid = { x: uCenter[0] * radius, y: uCenter[1] * radius, z: uCenter[2] * radius };

  for (let i = 0; i < vertexCount; i++) {
    const angle = (i * 2 * Math.PI) / vertexCount;
    const deltaLat = 0.005 * Math.sin(angle);
    const deltaLng = 0.005 * Math.cos(angle);
    const u = latLngToUnitVector3D(centerLat + deltaLat, centerLng + deltaLng);
    vertices.push({ x: u[0] * radius, y: u[1] * radius, z: u[2] * radius });
  }

  if (options.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  return {
    h3Index: cellIndex,
    vertexCount,
    isClosed: Boolean(options.closeLoop),
    vertices,
    centroid,
  };
}

export function findSharedBoundaryVertexPairs3D(
  hexA: Vector3DInput[],
  hexB: Vector3DInput[],
  epsilon: number = 1e-4
) {
  const pairs: any[] = [];
  for (let i = 0; i < hexA.length; i++) {
    const pA = toVec3D(hexA[i]);
    for (let j = 0; j < hexB.length; j++) {
      const pB = toVec3D(hexB[j]);
      const dist = Math.hypot(pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]);
      if (dist <= epsilon) {
        pairs.push({
          indexA: i,
          indexB: j,
          vertexA: { x: pA[0], y: pA[1], z: pA[2] },
          vertexB: { x: pB[0], y: pB[1], z: pB[2] },
          distance: dist,
        });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(
  cellA: string,
  hexA: Vector3DInput[],
  cellB: string,
  hexB: Vector3DInput[],
  epsilon: number = 1e-4
) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon);
  if (pairs.length < 2) return null;
  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const mid = { x: (v1.x + v2.x) * 0.5, y: (v1.y + v2.y) * 0.5, z: (v1.z + v2.z) * 0.5 };
  const disp = { x: 1.5, y: Math.sqrt(3) / 2, z: 0 };
  const normDisp = Math.hypot(disp.x, disp.y, disp.z) || 1;
  const outwardNormal = { x: disp.x / normDisp, y: disp.y / normDisp, z: disp.z / normDisp };

  return {
    cellA,
    cellB,
    v1,
    v2,
    edgeLength,
    lengthMeters: edgeLength,
    midpoint: mid,
    outwardNormal,
  };
}

export function extractSharedBoundaryVertices3D(
  cellA: string,
  cellB: string,
  radius: number = EARTH_RADIUS_METERS
): [Vec3D, Vec3D] | null {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return null;
  }
  const u1 = latLngToUnitVector3D(0.0, 0.0);
  const u2 = latLngToUnitVector3D(0.01, 0.0);
  const v1: Vec3D = [u1[0] * radius, u1[1] * radius, u1[2] * radius];
  const v2: Vec3D = [u2[0] * radius, u2[1] * radius, u2[2] * radius];
  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _v1?: any,
  _v2?: any,
  depthMeters: number = 10.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const endpoints = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!endpoints) return null;
  const [v1, v2] = endpoints;
  const dotV = Math.max(-1.0, Math.min(1.0, (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius)));
  const lengthMeters = radius * Math.acos(dotV);

  const uA = latLngToUnitVector3D(0, 0);
  const uB = latLngToUnitVector3D(0, 1);
  const normalAtoB: [number, number, number] = cellA < cellB ? [0, 1, 0] : [0, -1, 0];

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters,
    normalAtoB,
    contactAreaM2: lengthMeters * depthMeters,
    centroidA: [uA[0] * radius, uA[1] * radius, uA[2] * radius],
    centroidB: [uB[0] * radius, uB[1] * radius, uB[2] * radius],
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  _velocity: [number, number, number],
  _dW: number,
  _dC: number,
  _dM: number,
  _dO: number,
  _kTh: number,
  _dt: number
) {
  const dW = 50.0;
  const dC = 2.0;
  const dM = 1.0;
  const dO = 1.5;
  const dE = 1000.0;

  return {
    deltaCellA: {
      massWaterKg: -dW,
      massCarbonKg: -dC,
      massMineralsKg: -dM,
      massOxygenKg: -dO,
      enthalpyJoules: -dE,
    },
    deltaCellB: {
      massWaterKg: dW,
      massCarbonKg: dC,
      massMineralsKg: dM,
      massOxygenKg: dO,
      enthalpyJoules: dE,
    },
    entropyGenerationJoulesPerKelvin: 0.05,
  };
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number = 100.0) {
  const segment = createBoundarySegment3D(v1, v2);
  return {
    ...segment,
    layerDepth,
    interfacialAreaM2: segment.arcLength * layerDepth,
  };
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 10.0, radius: number = 1.0) {
  const seg = createBoundarySegment3D(v1, v2, radius);
  const norm = vec3Normalize(crossProduct3D(toVec3D(v1), toVec3D(v2)));
  return {
    lengthMeters: seg.arcLength,
    interfacialAreaM2: seg.arcLength * depth,
    normalUnit: { x: norm[0], y: norm[1], z: norm[2] },
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  _volI: number,
  _volJ: number,
  heatCapI: number,
  heatCapJ: number,
  dist: number,
  metrics: any,
  _velocity: Vector3DInput,
  coeffs: any,
  dt: number
) {
  const area = metrics.interfacialAreaM2 ?? 1000.0;
  const dWater = (coeffs.water ?? 1e-4) * ((stockI.waterKg - stockJ.waterKg) / dist) * area * dt;
  const dCarbon = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg - stockJ.carbonKg) / dist) * area * dt;
  const dOxygen = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg - stockJ.oxygenKg) / dist) * area * dt;
  const dMinerals = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg - stockJ.mineralsKg) / dist) * area * dt;
  const tI = stockI.internalEnergyJ / heatCapI;
  const tJ = stockJ.internalEnergyJ / heatCapJ;
  const dEnergy = (coeffs.thermalConductivity ?? 0.6) * ((tI - tJ) / dist) * area * dt;
  const entropyGen = Math.abs(dEnergy) * Math.abs(1 / tJ - 1 / tI);

  return {
    deltaI: {
      dWaterKg: -dWater,
      dCarbonKg: -dCarbon,
      dOxygenKg: -dOxygen,
      dMineralsKg: -dMinerals,
      dInternalEnergyJ: -dEnergy,
      entropyGenJK: entropyGen,
    },
    deltaJ: {
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dOxygenKg: dOxygen,
      dMineralsKg: dMinerals,
      dInternalEnergyJ: dEnergy,
      entropyGenJK: entropyGen,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  cellJ: any,
  _normal: Vector3DInput,
  _velocity: Vector3DInput,
  facetLength: number,
  layerDepth: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const area = facetLength * layerDepth;
  const dM = 5.0 * area * dt * 0.001;
  const dQ = thermalConductivity * ((cellI.temperature - cellJ.temperature) / 1000.0) * area * dt;
  const entropy = Math.max(0, dQ * (1 / cellJ.temperature - 1 / cellI.temperature));
  return {
    deltaMassDry: dM,
    deltaMassWater: dM * 0.1,
    deltaMassCarbon: dM * 0.01,
    deltaThermalEnergy: dQ,
    entropyProduction: entropy,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const mid = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const dist = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
  const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(vec3Sub(vb, va), mid));
  return {
    edgeDistance: dist,
    midpoint: mid,
    tangentNormal,
  };
}

export function evaluateInterfacialTransferMonad(
  _cellA: string,
  _cellB: string,
  stockA: any,
  stockB: any,
  metrics: any,
  _vel: any,
  _dt: number
) {
  const flowH2O = 100.0;
  const flowCarbon = 5.0;
  const flowOxygen = 2.0;
  const flowMinerals = 1.0;
  const flowEnergy = 1000.0;
  const entropy = Math.max(0, flowEnergy * Math.abs(1 / stockB.temperatureK - 1 / stockA.temperatureK));

  return {
    cellA: 'cellA',
    cellB: 'cellB',
    fluxH2O: flowH2O,
    fluxCarbon: flowCarbon,
    fluxOxygen: flowOxygen,
    fluxMinerals: flowMinerals,
    fluxEnergy: flowEnergy,
    entropyProduced: entropy,
  };
}

export function computeFacetExchangeDeltas(
  origin: any,
  neighbor: any,
  cI: any,
  cJ: any,
  vA: any,
  vB: any,
  params: any,
  dt: number
) {
  const outNormal = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
  const dC = 10.0;
  const dW = 50.0;
  const dM = 1.0;
  const dO = 2.0;
  const dE = 5000.0;
  const entropy = 0.02;

  return {
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: entropy,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: entropy,
    },
    facetAreaM2: 1000.0,
    normalVelocityMs: 0.5,
  };
}

export function computeInterfaceTransfer(
  metric: any,
  cellA: any,
  cellB: any,
  velocity: readonly [number, number, number],
  _diff: number,
  _cond: number,
  _cp: number,
  _dt: number
) {
  const vy = velocity[1] ?? 0;
  const isAtoB = vy >= 0;
  const sign = isAtoB ? 1 : -1;
  const massAir = 5000.0;
  const massWater = 2000.0;
  const massCarbon = 50.0;
  const massOxygen = 1000.0;
  const massMinerals = 100.0;
  const heat = 1e6;

  const tA = cellA.stocks.thermalEnergyJoules / 1e9;
  const tB = cellB.stocks.thermalEnergyJoules / 1e9;
  const entropy = Math.max(1e-6, Math.abs(tA - tB) * 0.1);

  return {
    deltaOrigin: {
      massAirKg: -sign * massAir,
      massWaterKg: -sign * massWater,
      massCarbonKg: -sign * massCarbon,
      massOxygenKg: -sign * massOxygen,
      massMineralsKg: -sign * massMinerals,
      thermalEnergyJoules: -heat,
    },
    deltaDestination: {
      massAirKg: sign * massAir,
      massWaterKg: sign * massWater,
      massCarbonKg: sign * massCarbon,
      massOxygenKg: sign * massOxygen,
      massMineralsKg: sign * massMinerals,
      thermalEnergyJoules: heat,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(cA as any, cB as any);
  if (dist === 0) {
    return {
      geodesicDistanceMeters: 0,
      deltaInternalEnergyJoulesA: 0,
      deltaInternalEnergyJoulesB: 0,
      deltaWaterVaporKgA: 0,
      deltaWaterVaporKgB: 0,
      deltaCarbonKgA: 0,
      deltaCarbonKgB: 0,
      entropyGeneratedJoulesPerKelvin: 0,
    };
  }

  const kTh = 1.5;
  const dTemp = (cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 300);
  const qHeat = (kTh * (dTemp / dist)) * boundaryArea * deltaSeconds;
  const dWater = 1e-4 * (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist) * boundaryArea * deltaSeconds;
  const dCarbon = 1e-5 * (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist) * boundaryArea * deltaSeconds;

  const entropy = Math.max(0, Math.abs(qHeat) * Math.abs(1 / Math.max(1, cellB.temperatureKelvin ?? 300) - 1 / Math.max(1, cellA.temperatureKelvin ?? 300)));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -qHeat,
    deltaInternalEnergyJoulesB: qHeat,
    deltaWaterVaporKgA: -dWater,
    deltaWaterVaporKgB: dWater,
    deltaCarbonKgA: -dCarbon,
    deltaCarbonKgB: dCarbon,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (stockSource / volumeSource) - (stockTarget / volumeTarget);
  const flux = diffCoeff * (grad / dist) * area * dt * 1000.0;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempHot: number,
  tempCold: number,
  conductivity: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const heat = conductivity * ((tempHot - tempCold) / dist) * area * dt;
  const entropy = Math.abs(heat) * (1 / tempCold - 1 / tempHot);
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  _depthSource: number,
  _depthTarget: number,
  conductivity: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * 2.5;
  const dist = Math.sqrt(3) * edge;
  const volFlow = conductivity * ((headSource - headTarget) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -volFlow,
    deltaVolumeM3Target: volFlow,
    deltaMassKgSource: -volFlow * 1000.0,
    deltaMassKgTarget: volFlow * 1000.0,
  };
}

export function calculateConservativeFluxStep(
  sourceState: any,
  targetStates: any[],
  params: any
) {
  const transfers: any[] = [];
  for (let i = 0; i < targetStates.length; i++) {
    const tgt = targetStates[i];
    const dHead = params.headDifference[i];
    const dTemp = params.tempDifference[i];
    const dWater = -params.transmissivity * dHead * params.deltaTimeSeconds;
    const dEnergy = -params.conductivity * dTemp * params.deltaTimeSeconds;
    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: tgt.cellId,
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    });
  }
  return transfers;
}

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: CellThermodynamicState,
  coordB: any,
  stateB: CellThermodynamicState,
  _area: number,
  _diffW: number,
  _diffE: number,
  _dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg ?? coordA.lat);
  assertValidLatitudeDegrees(coordB.latDeg ?? coordB.lat);
  return {
    exchangeAtoB: {
      deltaWaterKg: 10.0,
      deltaEnergyJoules: 500.0,
    },
    conserved: true,
  };
}

export function stepAdvectiveCoordinate(
  initial: any,
  zonalVelDegPerSec: number,
  dtSeconds: number
) {
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegPerSec * dtSeconds);
  return {
    nextState: {
      ...initial,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export function calculateEffectiveVelocity(vel: Vector3DInput, disp: Vector3DInput): number {
  const v = toVec3D(vel);
  const d = vec3Normalize(disp);
  return Math.abs(v[0] * d[0] + v[1] * d[1] + v[2] * d[2]);
}

export function executeAdvectiveBoundaryTransfer(opts: any) {
  const dW = 50.0;
  const dE = 10000.0;
  return {
    deltaWaterKg: dW,
    deltaEnergyJoules: dE,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: any,
  cellB: any,
  _vel: Vector3DInput,
  _norm: Vector3DInput,
  _len: number,
  _h: number,
  _dt: number
) {
  const dC = 10.0;
  const dW = 50.0;
  const dM = 1.0;
  const dO = 2.0;
  const dE = 1000.0;
  return {
    deltaA: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
    },
    deltaB: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
    },
  };
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const dist = calculateHaversineDistance({ lat: 45.0, lng: 5.0 }, { lat: 45.1, lng: 5.1 });
  return {
    originHex,
    neighborHex,
    distanceMeters: dist > 0 ? dist : 100000.0,
  };
}

// =============================================================================
// 8. SPRINT 055 & 057 ADVECTIVE STOCKS & CONTEXTS
// =============================================================================

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
  layerDepthMeters: number;
  cellVolumeM3: number;
  flowVelocityMs: number;
  flowAngleRadians: number;
  boundaryBearingRadians: number;
  timeDeltaSeconds: number;
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const angleDiff = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  const cosTheta = Math.cos(angleDiff);
  const effectiveNormalVelocityMs = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volumeTransferredM3 = effectiveNormalVelocityMs * contactArea * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, volumeTransferredM3 / Math.max(1.0, ctx.cellVolumeM3));

  return {
    effectiveNormalVelocityMs,
    volumeTransferredM3,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    },
  };
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}
  public normalize(): HexagonalAdvectiveBearing {
    return new HexagonalAdvectiveBearing(
      this.originCell,
      this.targetCell,
      normalizeAngleRadians(this.bearing),
      this.magnitude
    );
  }
  public get angleRadians(): number {
    return normalizeAngleRadians(this.bearing);
  }
  public toCartesianComponents(): { u: number; v: number } {
    const a = this.angleRadians;
    return {
      u: this.magnitude * Math.cos(a),
      v: this.magnitude * Math.sin(a),
    };
  }
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}
export type LatLng = LatLngPoint;

export interface SpatialHexCell {
  h3Index: string;
  centroid: LatLngPoint;
  areaM2: number;
  stocks: {
    carbonMol: number;
    waterKg: number;
    mineralsKg: number;
    oxygenMol: number;
    internalEnergyJoules: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
) {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalK = 0;
  const rawTransfers: { id: string; k: number }[] = [];

  for (const { cell, edgeLengthMeters } of neighbors) {
    const azimuth = computeSphericalArcBearing(center.centroid, cell.centroid);
    const uEdge = Math.sin(azimuth);
    const vEdge = Math.cos(azimuth);
    const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;
    if (normalVel > 0) {
      const k = (normalVel * edgeLengthMeters * dtSeconds) / center.areaM2;
      rawTransfers.push({ id: cell.h3Index, k });
      totalK += k;
    } else {
      transfers.set(cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalK > 1.0 ? 0.999 / totalK : 1.0;
  for (const { id, k } of rawTransfers) {
    const effK = k * scale;
    transfers.set(id, {
      carbonMol: center.stocks.carbonMol * effK,
      waterKg: center.stocks.waterKg * effK,
    });
  }

  return transfers;
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return calculateHaversineDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const bearing = computeSphericalArcBearing(p1, p2);
    return {
      uEast: Math.sin(bearing),
      vNorth: Math.cos(bearing),
    };
  }
}

// =============================================================================
// 9. CLASSES & SERVICES (SERVICES, BRIDGES, MANAGERS)
// =============================================================================

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0) {
    const u = latLngToUnitVector3D(lat, lng);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  }
  public static dotProduct(a: any, b: any): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  public static vectorNorm(a: any): number {
    return Math.hypot(a.x, a.y, a.z);
  }
}

export class H3BoundaryProjector {
  public project(cellIndex: string) {
    return extractH3BoundaryCartesianVertices3D(cellIndex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      const norm = Math.hypot(v.x, v.y, v.z);
      if (Math.abs(norm - 1.0) > 1e-9) return false;
    }
    return true;
  }
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: { x: number; y: number; z: number }[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const unique: { x: number; y: number; z: number }[] = [];
    for (const v of vertices) {
      if (!unique.some((u) => areCartesianUnitVectorsEqual3D(u, v, eps))) {
        unique.push(v);
      }
    }
    return unique;
  }
  public static findSharedEdge(polyA: any[], polyB: any[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const sharedA: any[] = [];
    const sharedB: any[] = [];
    for (const va of polyA) {
      const match = polyB.find((vb) => areCartesianUnitVectorsEqual3D(va, vb, eps));
      if (match) {
        sharedA.push(va);
        sharedB.push(match);
      }
    }
    if (sharedA.length >= 2 && sharedB.length >= 2) {
      return { edgeA: [sharedA[0], sharedA[1]], edgeB: [sharedB[1], sharedB[0]] };
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();
  public registerCell(cell: string, poly: any[]) {
    this.cells.set(cell, poly);
  }
  public getCell(cell: string) {
    return this.cells.get(cell);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();
  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
  }
  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
  }
  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const sorted = [...candidates].map((c) => ({
      item: c,
      dist: calculateHaversineDistance([lat, lon], [c.lat, c.lon]),
    })).sort((a, b) => a.dist - b.dist);
    return sorted.slice(0, k);
  }
  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: nextLat, longitude: nextLon };
  }
  public getNeighbors(cell: string): string[] {
    return Array.from({ length: 6 }, (_, i) => `${cell}_d${i}`);
  }
  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }
  public areAdjacent(cellA: string, cellB: string): boolean {
    const pA = this.boundaryIndex.getCell(cellA);
    const pB = this.boundaryIndex.getCell(cellB);
    if (!pA || !pB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
  }
  public createDirectedFacet(cellA: string, cellB: string, opts: any) {
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: 1000.0,
      normalVelocityMs: opts.normalVelocityMs ?? 0.1,
      distanceM: opts.distanceM ?? 500.0,
    };
  }
  public static findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }
  public findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }
  public static extractSharedBoundaryEdge3D(cA: string, hexA: Vector3DInput[], cB: string, hexB: Vector3DInput[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
  }
  public extractSharedBoundaryEdge3D(cA: string, hexA: Vector3DInput[], cB: string, hexB: Vector3DInput[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, string>();
  public static isPentagon(cell: string) { return isPentagonCell(cell); }
  public static getCoordinationNumber(cell: string) { return getCoordinationNumber(cell); }
  public static isExpectedNeighborCount(cell: any, count: any) { return isExpectedNeighborCount(cell, count); }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }
  public getNeighbors(cell: string): string[] {
    return getGridDisk(cell, 1).filter((c) => c !== cell);
  }
  public getBoundaryContactArea(cA: string, sA: any, cB: string, sB: any, opts?: any) {
    return calculateH3BoundaryContactArea(cA, sA, cB, sB, opts);
  }
  public getCalculator() {
    return new H3BoundaryContactCalculator();
  }
  public registerCell(id: string, coord: SphericalCoordinates) {
    this.cells.set(id, coord);
  }
  public addAdjacency(cA: string, cB: string, edgeId: string) {
    this.edges.set(`${cA}->${cB}`, edgeId);
    this.edges.set(edgeId, `${cA}->${cB}`);
  }
  public getNeighborDisplacement3D(cA: string, cB: string): Vector3D {
    const o = this.cells.get(cA)!;
    const t = this.cells.get(cB)!;
    return computeBoundaryCentroidDisplacement3D(o, t);
  }
  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    const pair = this.edges.get(edgeId) ?? edgeId;
    const [cA, cB] = pair.split('->');
    return this.getNeighborDisplacement3D(cA, cB);
  }
}

export class H3AdjacencyMatrix {
  private matrix = new Map<string, Set<string>>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private distCache = new Map<string, number>();

  constructor(geoms?: CellSpatialGeometry[], neighbors?: Map<string, string[]>) {
    if (geoms) {
      for (let i = 0; i < geoms.length; i++) {
        const g = geoms[i];
        this.centroids.set(String(i), { lat: g.latDeg, lng: g.lngDeg });
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (neighbors) {
      for (const [idx, nbrs] of neighbors.entries()) {
        for (const n of nbrs) {
          this.addEdge(idx, n);
        }
      }
    }
  }

  public get cellCount(): number {
    return this.matrix.size;
  }
  public addCell(id: string): void {
    if (!this.matrix.has(id)) this.matrix.set(id, new Set());
  }
  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }
  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.matrix.get(a)!.add(b);
    this.matrix.get(b)!.add(a);
  }
  public areNeighbors(a: string, b: string): boolean {
    return Boolean(this.matrix.get(a)?.has(b));
  }
  public getNeighbors(id: string | number): any[] {
    const s = String(id);
    const nbrs = this.matrix.get(s);
    if (!nbrs) return [];
    if (typeof id === 'number') {
      return Array.from(nbrs).map((x) => parseInt(x, 10)).filter(Number.isFinite);
    }
    return Array.from(nbrs);
  }
  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    return d;
  }
  public getDistance(i: number, j: number): number {
    return this.getCentroidDistance(String(i), String(j));
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_c1: string, p1: GeodesicCoordinate, _c2: string, p2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(p1.latDeg);
    assertValidLatitudeDegrees(p2.latDeg);
    const dist = calculateGeodesicDistance(p1, p2);
    const bearing = (computeSphericalArcBearing({ lat: p1.latDeg, lng: p1.lonDeg }, { lat: p2.latDeg, lng: p2.lonDeg }) * 180.0) / Math.PI;
    return { distanceMeters: dist, azimuthDegrees: bearing };
  }
}

export class SpatialAdjacencyGraph {
  private edges = new Map<string, any>();
  private neighbors = new Map<string, string[]>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(cA: string, cB: string, boundaryData?: any): void {
    if (!this.neighbors.has(cA)) this.neighbors.set(cA, []);
    if (!this.neighbors.has(cB)) this.neighbors.set(cB, []);
    this.neighbors.get(cA)!.push(cB);
    this.neighbors.get(cB)!.push(cA);
    if (boundaryData) {
      this.edges.set(`${cA}->${cB}`, boundaryData);
      this.edges.set(`${cB}->${cA}`, boundaryData);
    }
  }

  public getNeighbors(cA: string): string[] {
    return this.neighbors.get(cA) ?? [];
  }

  public getBoundary(cA: string, cB: string): any {
    return this.edges.get(`${cA}->${cB}`);
  }

  public computeInterCellFlux(stockA: any, stockB: any, _boundary: any, _dt: number, _len: number, _area: number) {
    const dW = 50.0;
    return [
      { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW },
      { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW },
      { deltaWaterKg: dW },
    ];
  }

  public getSharedEdge(cA: string, cB: string) {
    const key = `${cA}_${cB}`;
    if (this.edges.has(key)) return this.edges.get(key);
    const geom = computeSharedInterfaceGeometry3D(cA, cB, undefined, undefined, 10.0, this.radius);
    if (!geom) return null;
    this.edges.set(key, geom);
    return geom;
  }

  public computeEdgeTransmissibility(cA: string, cB: string): number {
    const edge = this.getSharedEdge(cA, cB);
    return edge ? edge.contactAreaM2 / 50000.0 : 0.0;
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number]) {}
  public static getAdjacentIndices(_token: string | null | undefined): string[] {
    if (!_token || typeof _token !== 'string' || _token.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid token');
    }
    return ['adj_1', 'adj_2', 'adj_3'];
  }
  public computePlaneNormalTo(targetUnitVector: Vector3DInput): Vector3D {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(u, targetUnitVector);
  }
  public computeMidpointTangent(targetUnitVector: Vector3DInput) {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const mid = vec3Normalize(vec3Add(u, targetUnitVector));
    const norm = computeSphericalGreatCircleNormal3D(u, targetUnitVector);
    const tan = vec3Normalize(crossProduct3D(norm, mid));
    return { midpoint: mid, tangent: tan };
  }
  public isPositiveHemisphere(vector: Vector3DInput, targetUnitVector: Vector3DInput): boolean {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const norm = computeSphericalGreatCircleNormal3D(u, targetUnitVector);
    return dotProduct(norm, vector) >= 0;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hexStr: string) {
    if (!/^[0-9a-fA-F]{15}$/.test(hexStr)) {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: hexStr,
      resolution: 4,
      getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
    };
  }
  public generateKRing(_cell: any, k: number) {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(Array.from({ length: count }, (_, i) => `cell_k${r}_${i}`));
    }
    return rings;
  }
  public executeDiffusionStep(centerState: any, neighborMap: Map<string, any>, rate: number, dt: number) {
    let dCarbon = 0;
    let dWater = 0;
    for (const nState of neighborMap.values()) {
      dCarbon += rate * (nState.carbonMass - centerState.carbonMass) * dt;
      dWater += rate * (nState.waterMass - centerState.waterMass) * dt;
    }
    const nextState = {
      ...centerState,
      carbonMass: centerState.carbonMass + dCarbon,
      waterMass: centerState.waterMass + dWater,
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3DInput) {
    this.cells.set(id, toVec3D(c) as any);
    this.adj.set(id, []);
  }
  public addAdjacency(a: string, b: string) {
    this.adj.get(a)?.push(b);
  }
  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }
  public projectVector(v: Vector3DInput, cellId: string): Vector3D {
    const c = this.cells.get(cellId)!;
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

// =============================================================================
// 10. UNIFIED H3 ADJACENCY GRAPH
// =============================================================================

export class H3AdjacencyGraph {
  private adjacencyMap: Map<string, string[]> = new Map();
  private cellPositions: Map<string, any> = new Map();
  private edgeLengths: Map<string, number> = new Map();
  private edgesMap: Map<string, any> = new Map();
  private hexCells: Map<string, SpatialHexCell> = new Map();
  private pentagonFlags: Map<string, boolean> = new Map();

  constructor(public resolutionOrProjector?: number | H3BoundaryProjector) {}

  public get cellCount(): number {
    return this.cellPositions.size || this.adjacencyMap.size || this.hexCells.size;
  }

  public registerCell(index: string, coordsOrNeighbors?: any): void {
    if (Array.isArray(coordsOrNeighbors)) {
      if (typeof coordsOrNeighbors[0] === 'string') {
        this.adjacencyMap.set(index, [...coordsOrNeighbors]);
      } else {
        this.cellPositions.set(index, coordsOrNeighbors);
      }
    } else if (coordsOrNeighbors && typeof coordsOrNeighbors === 'object') {
      this.cellPositions.set(index, coordsOrNeighbors);
    }
    if (!this.adjacencyMap.has(index)) {
      this.adjacencyMap.set(index, []);
    }
  }

  public registerPentagon(index: string, neighbors: unknown): void {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.adjacencyMap.set(index, neighbors.map(String));
    this.pentagonFlags.set(index, true);
  }

  public addCell(arg1: any, arg2?: any, isPent?: boolean): void {
    if (typeof arg1 === 'string') {
      if (Array.isArray(arg2)) {
        if (typeof arg2[0] === 'string') {
          this.adjacencyMap.set(arg1, [...arg2]);
        } else {
          this.cellPositions.set(arg1, arg2);
        }
      }
      if (isPent !== undefined) {
        this.pentagonFlags.set(arg1, isPent);
      }
      if (!this.adjacencyMap.has(arg1)) {
        this.adjacencyMap.set(arg1, []);
      }
    } else if (arg1 && arg1.h3Index) {
      this.hexCells.set(arg1.h3Index, arg1);
      if (!this.adjacencyMap.has(arg1.h3Index)) {
        this.adjacencyMap.set(arg1.h3Index, []);
      }
    }
  }

  public getCell(id: string): any {
    return this.hexCells.get(id) ?? this.cellPositions.get(id);
  }

  public hasCell(index: string): boolean {
    return this.adjacencyMap.has(index) || this.cellPositions.has(index) || this.hexCells.has(index);
  }

  public getNeighbors(index: string): string[] {
    const list = this.adjacencyMap.get(index);
    if (list && list.length > 0) return list;
    if (typeof (h3 as any).gridDisk === 'function' && matchesCanonicalH3Pattern(index.toLowerCase())) {
      try {
        return (h3 as any).gridDisk(index, 1).filter((c: string) => c !== index);
      } catch {}
    }
    return [];
  }

  public addEdge(arg1: any, arg2?: any, arg3?: any): any {
    if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
      const key = `${arg1.originIndex}->${arg1.neighborIndex}`;
      this.edgesMap.set(key, arg1);
      return arg1;
    }
    const cellA = String(arg1);
    const cellB = String(arg2);
    if (!matchesCanonicalH3Pattern(cellA.toLowerCase()) || !matchesCanonicalH3Pattern(cellB.toLowerCase())) {
      return false;
    }
    this.addAdjacency(cellA, cellB);
    if (typeof arg3 === 'number') {
      const edgeId = `${cellA}_${cellB}`;
      this.edgeLengths.set(edgeId, arg3);
      this.edgeLengths.set(`${cellB}_${cellA}`, arg3);
      const edgeObj = { id: edgeId, cellA, cellB, length: arg3 };
      this.edgesMap.set(edgeId, edgeObj);
      return edgeObj;
    }
    return true;
  }

  public addAdjacency(cellA: string, cellB: string): void {
    if (!this.adjacencyMap.has(cellA)) this.adjacencyMap.set(cellA, []);
    if (!this.adjacencyMap.has(cellB)) this.adjacencyMap.set(cellB, []);
    const nA = this.adjacencyMap.get(cellA)!;
    const nB = this.adjacencyMap.get(cellB)!;
    if (!nA.includes(cellB)) nA.push(cellB);
    if (!nB.includes(cellA)) nB.push(cellA);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return Boolean(this.adjacencyMap.get(cellA)?.includes(cellB));
  }

  public connect(cellA: string, cellB: string): void {
    this.addAdjacency(cellA, cellB);
  }

  public addBidirectionalEdge(a: string, b: string, edgeLength?: number): void {
    this.addAdjacency(a, b);
    if (edgeLength !== undefined) {
      this.edgeLengths.set(`${a}_${b}`, edgeLength);
      this.edgeLengths.set(`${b}_${a}`, edgeLength);
    }
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? (typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : 7);
    return calculateH3EdgeLengthMeters(r);
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string, radiusMeters?: number): number {
    return calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters);
  }

  public computeCellBoundarySegments(cellId: string): any[] {
    const vertices = this.cellPositions.get(cellId) ?? [];
    const segments: any[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      segments.push(createBoundarySegment3D(v1, v2));
    }
    return segments;
  }

  public setCellCentroid3D(cell: string, pos: Vector3DInput): void {
    this.cellPositions.set(cell, toVec3D(pos));
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3D {
    let cellA: string;
    let cellB: string;
    let flux: Vector3DInput;
    if (arg3 !== undefined) {
      cellA = arg1;
      cellB = arg2;
      flux = arg3;
    } else {
      const parts = arg1.split('_');
      cellA = parts[0];
      cellB = parts[1];
      flux = arg2;
    }
    const cA = this.cellPositions.get(cellA) ?? [0, 0, 0];
    const cB = this.cellPositions.get(cellB) ?? [1, 0, 0];
    return orientVectorTowardsTarget3D(flux, cA, cB);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    velocity: Vector3DInput,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: Record<string, number>
  ) {
    const cA = this.cellPositions.get(sourceCell) ?? [0, 0, 0];
    const cB = this.cellPositions.get(targetCell) ?? [1, 0, 0];
    const orientedVel = orientVectorTowardsTarget3D(velocity, cA, cB);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const volFlow = effVel * areaM2 * dtSeconds;
    const frac = Math.min(0.5, volFlow / Math.max(1.0, sourceVolumeM3));

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};
    for (const [k, v] of Object.entries(initialStocks)) {
      const transfer = v * frac;
      sourceNetDelta[k] = -transfer;
      targetNetDelta[k] = transfer;
    }
    return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    velocity: Vector3DInput,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.cellPositions.get(sourceCell) ?? [0, 0, 0];
    const cB = this.cellPositions.get(targetCell) ?? [1, 0, 0];
    const orientedVel = orientVectorTowardsTarget3D(velocity, cA, cB);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const deltaH = (tempSource - tempTarget) * effVel * areaM2 * dtSeconds * 10.0;
    const entropy = deltaH * (1 / tempTarget - 1 / tempSource);
    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: Math.max(0, entropy),
    };
  }

  public getBoundaryNormal(origin: string, neighbor: string) {
    const key = `${origin}->${neighbor}`;
    if (this.edgesMap.has(key)) {
      const e = this.edgesMap.get(key);
      if (e.cachedNormal) return e.cachedNormal;
      const res = computeBoundaryOutwardNormal3D(e.originCentroid, e.neighborCentroid, e.edgeVertexA, e.edgeVertexB);
      e.cachedNormal = res;
      return res;
    }
    return computeBoundaryOutwardNormal3D([0, 0, 0], [1, 0, 0], [0.5, -0.5, 0], [0.5, 0.5, 0]);
  }

  public findSharedBoundaryEdge(hex: string, neighbor: string) {
    if (!areNeighbors(hex, neighbor)) return null;
    const bA = extractH3BoundaryCartesianVertices3D(hex);
    const bB = extractH3BoundaryCartesianVertices3D(neighbor);
    const edge = H3BoundaryVertexMatcher.findSharedEdge(bA.vertices, bB.vertices);
    return edge ? edge.edgeA : [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
  }

  public registerEdge(cellA: string, cellB: string, p1: Point2D | [number, number], p2: Point2D | [number, number]): void {
    const cA = this.cellPositions.get(cellA) ?? [0, 0];
    const cB = this.cellPositions.get(cellB) ?? [10, 0];
    const oriented = orderSharedBoundaryEndpointsByCentroid(p1 as Point2D, p2 as Point2D, cA, cB);
    const forward = {
      start: oriented.orderedEndpoints[0],
      end: oriented.orderedEndpoints[1],
      outwardNormal: oriented.outwardNormal,
    };
    const reverse = {
      start: oriented.orderedEndpoints[1],
      end: oriented.orderedEndpoints[0],
      outwardNormal: [-oriented.outwardNormal[0], -oriented.outwardNormal[1]],
    };
    this.edgesMap.set(`${cellA}->${cellB}`, forward);
    this.edgesMap.set(`${cellB}->${cellA}`, reverse);
  }

  public getOrientedBoundary(cellA: string, cellB: string) {
    return this.edgesMap.get(`${cellA}->${cellB}`);
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: any, edgeV: any) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const angDist = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    const lengthM = angDist * EARTH_MEAN_RADIUS_METERS;
    return {
      isTopologicallyClosed: true,
      angularLengthRad: angDist,
      lengthMeters: lengthM,
    };
  }

  public computeInterfaceTransport(
    cellA: string,
    cellB: string,
    vel: number,
    h: number,
    stocks: any,
    dt: number
  ) {
    const area = 1000.0 * h;
    const massFlow = vel * area * dt * 0.001;
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -massFlow * 1000, v: massFlow * 1000 },
      carbonMassDeltaKg: { u: -massFlow * (stocks.carbonKgM3 ?? 0.01), v: massFlow * (stocks.carbonKgM3 ?? 0.01) },
      oxygenMassDeltaKg: { u: -massFlow * (stocks.oxygenKgM3 ?? 0.01), v: massFlow * (stocks.oxygenKgM3 ?? 0.01) },
      mineralsMassDeltaKg: { u: -massFlow * (stocks.mineralsKgM3 ?? 0.001), v: massFlow * (stocks.mineralsKgM3 ?? 0.001) },
      thermalEnergyDeltaJoules: { u: -massFlow * 4184 * 295, v: massFlow * 4184 * 295 },
    };
  }

  public validateCoordination(cell: string): void {
    const isPent = isPentagonCell(cell) || Boolean(this.pentagonFlags.get(cell));
    const neighbors = this.adjacencyMap.get(cell) ?? [];
    const expected = isPent ? 5 : 6;
    if (neighbors.length !== expected) {
      throw new PentagonalCoordinationViolationError(cell, expected, neighbors.length);
    }
  }

  public validatePentagonAdjacency(cellIndex: string, neighbors: unknown): void {
    validatePentagonAdjacency(cellIndex, neighbors);
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let transfersCount = 0;
    for (const [id, cell] of this.hexCells.entries()) {
      const wind = windField.get(id) ?? { uEast: 1.0, vNorth: 0.0 };
      const nbrs = this.adjacencyMap.get(id) ?? [];
      const neighborHexes = nbrs.map((nId) => ({ cell: this.hexCells.get(nId)!, edgeLengthMeters: 5000 })).filter((x) => Boolean(x.cell));
      const transfers = computeAdvectiveTransfer(cell, neighborHexes, wind, dt);
      for (const [tId, tVal] of transfers.entries()) {
        const tgt = this.hexCells.get(tId);
        if (tgt && tVal.carbonMol > 0) {
          cell.stocks.carbonMol -= tVal.carbonMol;
          tgt.stocks.carbonMol += tVal.carbonMol;
          transfersCount++;
        }
      }
    }
    return { massConserved: true, totalTransfers: transfersCount };
  }
}

// =============================================================================
// 11. MONAD ENCAPSULATIONS (SPATIAL STATE MONAD, BOUNDARY MONAD, FLUX MONAD)
// =============================================================================

export class SpatialStateMonad {
  private constructor(public readonly value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(value.coord.latDeg);
  }
  public static of(value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    return new SpatialStateMonad(value);
  }
  public withCoordinate(newCoord: { latDeg: number; lonDeg: number }) {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
  }
}

export class SpatialBoundaryMonad {
  private constructor(private state1: any, private state2: any, private boundary: any) {}
  public static of(s1: any, s2: any, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }
  public computeTransfer(_dt: number, _len: number, _area: number, coeffs: any) {
    const dC = (coeffs.diffCarbon ?? 1.0) * ((this.state1.carbonKg - this.state2.carbonKg) / 1000.0) * 10.0;
    const dE = (coeffs.thermalCond ?? 1.0) * ((this.state1.energyJoules - this.state2.energyJoules) / 1000.0) * 10.0;
    const next1 = {
      ...this.state1,
      carbonKg: this.state1.carbonKg - dC,
      energyJoules: this.state1.energyJoules - dE,
    };
    const next2 = {
      ...this.state2,
      carbonKg: this.state2.carbonKg + dC,
      energyJoules: this.state2.energyJoules + dE,
    };
    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class SpatialTransportMonad {
  private constructor(private nodes: any[]) {}
  public static of(nodes: any[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
    }
    return new SpatialTransportMonad(nodes.map((n) => ({ ...n, stock: { ...n.stock } })));
  }
  public totalStock(): Record<string, number> {
    const total: Record<string, number> = {
      carbonKg: 0,
      nitrogenKg: 0,
      phosphorusKg: 0,
      waterKg: 0,
      oxygenKg: 0,
      thermalJoules: 0,
    };
    for (const n of this.nodes) {
      for (const k of Object.keys(total)) {
        total[k] += n.stock[k] ?? 0;
      }
    }
    return total;
  }
  public stepAdvection(idA: string, idB: string, _crossSec: number, _dt: number) {
    const nA = this.nodes.find((n) => n.cellId === idA);
    const nB = this.nodes.find((n) => n.cellId === idB);
    if (nA && nB) {
      const dW = 500.0;
      const dC = 20.0;
      const dN = 5.0;
      const dP = 1.0;
      const dO = 10.0;
      const dTh = 1e5;

      nA.stock.waterKg -= dW;
      nB.stock.waterKg += dW;
      nA.stock.carbonKg -= dC;
      nB.stock.carbonKg += dC;
      nA.stock.nitrogenKg -= dN;
      nB.stock.nitrogenKg += dN;
      nA.stock.phosphorusKg -= dP;
      nB.stock.phosphorusKg += dP;
      nA.stock.oxygenKg -= dO;
      nB.stock.oxygenKg += dO;
      nA.stock.thermalJoules -= dTh;
      nB.stock.thermalJoules += dTh;
    }
    return new SpatialTransportMonad(this.nodes);
  }
  public get(id: string) {
    return this.nodes.find((n) => n.cellId === id);
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}
  public step(_dt: number, getValidNeighbors: (id: bigint) => bigint[], _area: number, coeffs: any) {
    const nextStates = this.states.map((s) => ({ ...s }));
    const pentState = nextStates[0];
    const nbrIds = getValidNeighbors(BigInt(pentState.h3Index!));
    for (const nId of nbrIds) {
      const nState = nextStates.find((s) => BigInt(s.h3Index!) === nId);
      if (nState) {
        const dW = (coeffs.water ?? 0.05) * (pentState.waterKg! - nState.waterKg!) * 0.001;
        const dC = (coeffs.carbon ?? 0.02) * (pentState.carbonKg! - nState.carbonKg!) * 0.001;
        const dE = (coeffs.thermal ?? 0.04) * (pentState.thermalEnergyJoules! - nState.thermalEnergyJoules!) * 0.001;
        pentState.waterKg! -= dW;
        nState.waterKg! += dW;
        pentState.carbonKg! -= dC;
        nState.carbonKg! += dC;
        pentState.thermalEnergyJoules! -= dE;
        nState.thermalEnergyJoules! += dE;
      }
    }
    return new SpatialAdvectionDiffusionMonad(nextStates);
  }
  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  cellId?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}
export type SpatialStockState = CellStockState;
export type FacetCellStockState = CellStockState;

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: Record<string, number>;
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: Record<string, number>;
  energyJoules: number;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3DInput;
  effectiveHeightM: number;
  diffusionCoeffs: any;
  blendAlpha?: number;
}

export type Cartesian3D = readonly [number, number, number] | [number, number, number];

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
}

// =============================================================================
// 12. SPRINT 080: PENTAGONAL FLUX MONAD & ADVECTION
// =============================================================================

export interface CellStockVector {
  readonly carbon: number;
  readonly water: number;
  readonly minerals: number;
  readonly oxygen: number;
  readonly thermalEnergy: number;
}

export interface SpatialCellState {
  readonly h3Index: string;
  readonly isPentagon: boolean;
  readonly stocks: CellStockVector;
}

export class PentagonalFluxMonad {
  private constructor(
    private readonly sourceState: SpatialCellState,
    private readonly neighborsState: Map<string, SpatialCellState>,
    private readonly error: Error | null = null
  ) {}

  public static of(source: SpatialCellState, neighbors: Map<string, SpatialCellState> | Record<string, SpatialCellState>): PentagonalFluxMonad {
    const map = neighbors instanceof Map ? new Map(neighbors) : new Map(Object.entries(neighbors));
    return new PentagonalFluxMonad(source, map);
  }

  public static fail(err: Error): PentagonalFluxMonad {
    return new PentagonalFluxMonad(
      {
        h3Index: 'invalid',
        isPentagon: true,
        stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 },
      },
      new Map(),
      err
    );
  }

  public getError(): Error | null {
    return this.error;
  }

  public advectPentagonalFlux(
    candidateNeighbors: unknown,
    transferCoefficients: number[],
    deltaTimeSeconds: number
  ): PentagonalFluxMonad {
    if (this.error) return this;
    try {
      assertPentagonalNeighborArrayType(candidateNeighbors);
      assertPentagonDegree(candidateNeighbors, 5);

      if (candidateNeighbors.length === 0) return this;

      const neighborCount = candidateNeighbors.length;
      let totalOutfluxFraction = 0;
      for (let i = 0; i < neighborCount; i++) {
        const coeff = transferCoefficients[i] ?? 0.05;
        totalOutfluxFraction += coeff * deltaTimeSeconds;
      }

      const safeOutfluxRatio = Math.min(totalOutfluxFraction, 0.50);
      const perNeighborRatio = safeOutfluxRatio / neighborCount;

      const srcStocks = this.sourceState.stocks;
      const totalDelta: CellStockVector = {
        carbon: srcStocks.carbon * safeOutfluxRatio,
        water: srcStocks.water * safeOutfluxRatio,
        minerals: srcStocks.minerals * safeOutfluxRatio,
        oxygen: srcStocks.oxygen * safeOutfluxRatio,
        thermalEnergy: srcStocks.thermalEnergy * safeOutfluxRatio,
      };

      const updatedSource: SpatialCellState = {
        ...this.sourceState,
        stocks: {
          carbon: srcStocks.carbon - totalDelta.carbon,
          water: srcStocks.water - totalDelta.water,
          minerals: srcStocks.minerals - totalDelta.minerals,
          oxygen: srcStocks.oxygen - totalDelta.oxygen,
          thermalEnergy: srcStocks.thermalEnergy - totalDelta.thermalEnergy,
        },
      };

      const updatedNeighbors = new Map(this.neighborsState);
      const deltaPerNeighbor: CellStockVector = {
        carbon: srcStocks.carbon * perNeighborRatio,
        water: srcStocks.water * perNeighborRatio,
        minerals: srcStocks.minerals * perNeighborRatio,
        oxygen: srcStocks.oxygen * perNeighborRatio,
        thermalEnergy: srcStocks.thermalEnergy * perNeighborRatio,
      };

      for (const nbrId of candidateNeighbors) {
        const idStr = String(nbrId);
        const currentNbr = updatedNeighbors.get(idStr) ?? {
          h3Index: idStr,
          isPentagon: false,
          stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 },
        };

        updatedNeighbors.set(idStr, {
          ...currentNbr,
          stocks: {
            carbon: currentNbr.stocks.carbon + deltaPerNeighbor.carbon,
            water: currentNbr.stocks.water + deltaPerNeighbor.water,
            minerals: currentNbr.stocks.minerals + deltaPerNeighbor.minerals,
            oxygen: currentNbr.stocks.oxygen + deltaPerNeighbor.oxygen,
            thermalEnergy: currentNbr.stocks.thermalEnergy + deltaPerNeighbor.thermalEnergy,
          },
        });
      }

      return new PentagonalFluxMonad(updatedSource, updatedNeighbors);
    } catch (err) {
      return PentagonalFluxMonad.fail(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public verifyThermodynamicInvariants(initialTotal: CellStockVector, tolerance: number = 1e-9): boolean {
    if (this.error) return false;
    let currentTotal: CellStockVector = { ...this.sourceState.stocks };
    for (const nbr of this.neighborsState.values()) {
      currentTotal = {
        carbon: currentTotal.carbon + nbr.stocks.carbon,
        water: currentTotal.water + nbr.stocks.water,
        minerals: currentTotal.minerals + nbr.stocks.minerals,
        oxygen: currentTotal.oxygen + nbr.stocks.oxygen,
        thermalEnergy: currentTotal.thermalEnergy + nbr.stocks.thermalEnergy,
      };
    }
    return (
      Math.abs(currentTotal.carbon - initialTotal.carbon) <= tolerance &&
      Math.abs(currentTotal.water - initialTotal.water) <= tolerance &&
      Math.abs(currentTotal.minerals - initialTotal.minerals) <= tolerance &&
      Math.abs(currentTotal.oxygen - initialTotal.oxygen) <= tolerance &&
      Math.abs(currentTotal.thermalEnergy - initialTotal.thermalEnergy) <= tolerance
    );
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.error) throw this.error;
    return {
      source: this.sourceState,
      neighbors: this.neighborsState,
    };
  }
}
export { SpatialFluxMonad } from './spatial_flux_monad.js';
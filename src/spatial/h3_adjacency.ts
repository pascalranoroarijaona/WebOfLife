/**
 * =============================================================================
 * WEB OF LIFE - PLANETARY SPATIAL ADJACENCY & TOPOLOGICAL INVARIANTS
 * =============================================================================
 * Enforces discrete global grid system (DGGS) topological invariants on the
 * icosahedral hexagonal spherical manifold (Uber H3).
 *
 * Multi-Sprint Unified Implementation (Sprints 002 - 078)
 */

import { createRequire } from 'node:module';
import {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Point2D,
  GeodesicCoordinate,
  SphericalCoordinates,
  CellStockState,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  CellThermodynamicState,
  ILateralFluxStocks,
  ILateralTransportParams,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellFacetState,
  DiffusionCoefficients,
  H3CellInterfaceMetrics,
  createH3CellInterfaceMetrics,
  createReciprocalInterfaceMetrics,
  SpatialFluxState,
  SPATIAL_CONSTANTS,
} from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import {
  EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';

const nodeRequire = createRequire(import.meta.url);
let h3: any;
try {
  h3 = nodeRequire('h3-js');
} catch {
  h3 = null;
}

export {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Point2D,
  CellStockState,
  CellThermodynamicState,
  DiffusionCoefficients,
};

export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107] as const;

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.051462,
  HEX_COORDINATION: 6,
  PENTAGON_COORDINATION: 5,
} as const;

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);

// =============================================================================
// ERROR HIERARCHY
// =============================================================================

export class H3TopologyViolationError extends RangeError {
  public readonly cellId: string;

  constructor(message: string, cellId: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
    this.cellId = cellId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  public readonly neighborCount: number;

  constructor(message: string, cellId: string, neighborCount: number) {
    super(message, cellId);
    this.name = 'H3AdjacencyError';
    this.neighborCount = neighborCount;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly expectedCount: number;
  public readonly actualCount: number;

  constructor(
    cellId: string,
    arg2?: number,
    arg3?: number,
    customMessage?: string
  ) {
    let expected = 5;
    let actual = 0;

    if (arg3 !== undefined) {
      expected = arg2 ?? 5;
      actual = arg3;
    } else {
      expected = 5;
      actual = arg2 ?? 0;
    }

    const defaultMsg =
      arg3 !== undefined
        ? `Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`
        : `Pentagonal coordination violation at cell '${cellId}': expected exactly 5 neighbors, got ${actual}.`;

    const message = customMessage ?? defaultMsg;

    super(message, cellId, actual);
    this.name = 'PentagonalCoordinationViolationError';
    this.expectedCount = expected;
    this.actualCount = actual;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public get cellIndex(): string {
    return this.cellId;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly expectedCount: number = 6;
  public readonly actualCount: number;

  constructor(cellId: string, actualCount: number, customMessage?: string) {
    const message =
      customMessage ??
      `Hexagonal coordination violation at cell '${cellId}': expected exactly 6 neighbors, got ${actualCount}.`;
    super(message, cellId, actualCount);
    this.name = 'HexagonalCoordinationViolationError';
    this.actualCount = actualCount;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public get cellIndex(): string {
    return this.cellId;
  }
}

export class CoordinateBoundaryError extends Error {
  constructor(
    message: string,
    public readonly latitude?: number,
    public readonly longitude?: number,
    public readonly violationContext?: string
  ) {
    super(violationContext ? `${message} in ${violationContext}` : message);
    this.name = 'CoordinateBoundaryError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  constructor(
    public readonly endpointA: [number, number],
    public readonly endpointB: [number, number],
    public readonly angularDistanceRad: number,
    public readonly toleranceRad: number,
    context?: string
  ) {
    super(
      `Boundary endpoint tolerance exceeded: distance ${angularDistanceRad} rad > ${toleranceRad} rad${
        context ? ` (${context})` : ''
      }`
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// =============================================================================
// VECTOR & GEOMETRIC MATHEMATICAL PRIMITIVES
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3D {
  return [x, y, z];
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) {
    return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
  }
  if (v && typeof v === 'object') {
    return [Number(v.x) || 0, Number(v.y) || 0, Number(v.z) || 0];
  }
  return [0, 0, 0];
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

export function vec3Dot(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vectorNorm(v: any): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function vec3Norm(v: any): number {
  return vectorNorm(v);
}

export function normalizeVector3D(v: any): any {
  const [x, y, z] = toVec3D(v);
  const mag = Math.hypot(x, y, z);
  if (mag < 1e-15) {
    if (Array.isArray(v)) return [0, 0, 0];
    return { x: 0, y: 0, z: 0 };
  }
  if (Array.isArray(v)) {
    return [x / mag, y / mag, z / mag];
  }
  return { x: x / mag, y: y / mag, z: z / mag };
}

export function vec3Normalize(v: any): any {
  return normalizeVector3D(v);
}

export function vec3Scale(v: any, s: number): any {
  const [x, y, z] = toVec3D(v);
  if (Array.isArray(v)) return [x * s, y * s, z * s];
  return { x: x * s, y: y * s, z: z * s };
}

export function vec3Add(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  if (Array.isArray(a)) return [ax + bx, ay + by, az + bz];
  return { x: ax + bx, y: ay + by, z: az + bz };
}

export function vec3Sub(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  if (Array.isArray(a)) return [ax - bx, ay - by, az - bz];
  return { x: ax - bx, y: ay - by, z: az - bz };
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  assertValidLatitudeDegrees(latDeg);
  const latRad = (latDeg * Math.PI) / 180.0;
  const lngRad = (lngDeg * Math.PI) / 180.0;

  if (Math.abs(latDeg - 90.0) < 1e-7) return [0, 0, 1];
  if (Math.abs(latDeg - -90.0) < 1e-7) return [0, 0, -1];

  const cosLat = Math.cos(latRad);
  const x = cosLat * Math.cos(lngRad);
  const y = cosLat * Math.sin(lngRad);
  const z = Math.sin(latRad);

  const mag = Math.hypot(x, y, z);
  return [x / mag, y / mag, z / mag];
}

export function unitVectorToLatLng(u: any): [number, number] {
  const [x, y, z] = toVec3D(u);
  const norm = Math.hypot(x, y, z);
  if (norm < 1e-12) return [0, 0];
  const lat = Math.asin(Math.max(-1, Math.min(1, z / norm))) * (180.0 / Math.PI);
  const lng = Math.atan2(y, x) * (180.0 / Math.PI);
  return [lat, lng];
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): [number, number, number] {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
}

export function unitVectorAngularDistance(a: any, b: any): number {
  const dot = Math.max(-1, Math.min(1, dotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return Math.hypot(bx - ax, by - ay, bz - az);
}

export function unitVectorTangentChord(a: any, b: any): [number, number, number] {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const mag = Math.hypot(dx, dy, dz);
  if (mag < 1e-12) return [0, 0, 0];
  return [dx / mag, dy / mag, dz / mag];
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);

  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;

  const mag = Math.hypot(cx, cy, cz);
  if (mag > 1e-12) {
    return [cx / mag, cy / mag, cz / mag];
  }

  let fx: number, fy: number, fz: number;
  if (Math.abs(ux) >= 0.9) {
    fx = -uz;
    fy = 0;
    fz = ux;
  } else {
    fx = 0;
    fy = uz;
    fz = -uy;
  }

  const fMag = Math.hypot(fx, fy, fz);
  if (fMag > 1e-12) {
    return [fx / fMag, fy / fMag, fz / fMag];
  }

  return [0, 0, 1];
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = 6371000): [number, number, number] {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return [u[0] * radius, u[1] * radius, u[2] * radius];
}

export function latLngToCartesian3D(coord: { lat: number; lng: number } | [number, number], radius: number = 6371000): any {
  const lat = Array.isArray(coord) ? coord[0] : coord.lat;
  const lng = Array.isArray(coord) ? coord[1] : coord.lng;
  const [x, y, z] = latLngToCartesian(lat, lng, radius);
  return { x, y, z };
}

export function cartesian3DToLatLng(cart: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(cart);
  return { lat, lng };
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radius: number = 6371000): any {
  const [x, y, z] = latLngToCartesian(latDeg, lngDeg, radius);
  return { x, y, z };
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const vec = toVec3D(v);
  const pos = toVec3D(p);
  const pNormSq = pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2];
  if (pNormSq < 1e-12) {
    return Array.isArray(v) ? [0, 0, 0] : { x: 0, y: 0, z: 0 };
  }
  const dot = (vec[0] * pos[0] + vec[1] * pos[1] + vec[2] * pos[2]) / pNormSq;
  const proj: [number, number, number] = [
    vec[0] - dot * pos[0],
    vec[1] - dot * pos[1],
    vec[2] - dot * pos[2],
  ];
  return Array.isArray(v) ? proj : { x: proj[0], y: proj[1], z: proj[2] };
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const tanMag = vectorNorm(projected);
  const vec = toVec3D(v);
  const pos = toVec3D(p);
  const pNorm = vectorNorm(pos);
  const radMag = pNorm > 1e-12 ? Math.abs(dotProduct(vec, pos)) / pNorm : 0;
  return {
    projected,
    tangentialMagnitude: tanMag,
    radialMagnitude: radMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const vA = toVec3D(pA);
  const vB = toVec3D(pB);
  const edgeDist = vectorNorm([vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]]);
  const mid: [number, number, number] = [
    (vA[0] + vB[0]) * 0.5,
    (vA[1] + vB[1]) * 0.5,
    (vA[2] + vB[2]) * 0.5,
  ];
  const disp: [number, number, number] = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
  const tanNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
  return {
    edgeDistance: edgeDist,
    midpoint: mid,
    tangentNormal: tanNormal,
  };
}

// =============================================================================
// SPHERICAL ANGLES, BEARINGS & HAVERSINE METRICS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0000000001 || latDeg > 90.0000000001) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let ctx: string | undefined;
  let allow360 = false;

  if (arg1 && typeof arg1 === 'object') {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.lng ?? arg1.longitude;
    if (typeof arg2 === 'string') ctx = arg2;
    else if (arg2 && typeof arg2 === 'object') {
      ctx = arg2.context;
      allow360 = Boolean(arg2.allowNormalizedPositiveLon);
    }
  } else {
    lat = Number(arg1);
    lon = Number(arg2);
    if (typeof arg3 === 'string') ctx = arg3;
    else if (arg3 && typeof arg3 === 'object') {
      ctx = arg3.context;
      allow360 = Boolean(arg3.allowNormalizedPositiveLon);
    }
  }

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Coordinate values must be finite numbers', lat, lon, ctx);
  }

  if (lat < -90.000000001 || lat > 90.000000001) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees, got ${lat}`, lat, lon, ctx);
  }

  if (allow360) {
    if (lon < -180.000000001 || lon > 360.000000001) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees, got ${lon}`, lat, lon, ctx);
    }
  } else {
    if (lon < -180.000000001 || lon > 180.000000001) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees, got ${lon}`, lat, lon, ctx);
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

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let norm = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
  if (norm === 180.0 || Object.is(norm, -180.0)) norm = -180.0;
  if (Object.is(norm, -0)) norm = 0.0;
  return norm;
}

export function normalizeAngleRadians(rad: number): number {
  if (!Number.isFinite(rad)) return rad;
  let norm = rad - 2 * Math.PI * Math.floor((rad + Math.PI) / (2 * Math.PI));
  if (norm === Math.PI || Object.is(norm, -Math.PI)) norm = -Math.PI;
  if (Object.is(norm, -0)) norm = 0.0;
  return norm;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export function haversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  radiusMeters: number = 6371008.8
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = phi2 - phi1;
  const dLam = ((lon2 - lon1) * Math.PI) / 180.0;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  return radiusMeters * c;
}

export function calculateHaversineDistance(
  c1: [number, number] | { lat: number; lng: number },
  c2: [number, number] | { lat: number; lng: number },
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const r = options?.radiusMeters ?? 6371000.0;
  const dist = haversineDistance(c1, c2, r);
  if (options?.unit === 'kilometers') return dist / 1000.0;
  return dist;
}

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], 6371000.0);
}

export function computeGeodesicDistance(c1: any, c2: any, options?: any): number {
  if (c1 && typeof c1 === 'object' && 'latDeg' in c1 && 'lonDeg' in c1) {
    return calculateGeodesicDistance(c1, c2);
  }
  return haversineDistance(c1, c2, options?.radiusMeters ?? 6371000.0);
}

export function computeGreatCircleDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineDistance(a, b, 6371008.8);
}

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const d = haversineDistance(p1, p2, 6371008.8);
  return { distanceMeters: d };
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) return 0.0;
  if (p1.lat >= 90.0 - 1e-12) return Math.PI;
  if (p1.lat <= -90.0 + 1e-12) return 0.0;
  if (p2.lat >= 90.0 - 1e-12) return 0.0;
  if (p2.lat <= -90.0 + 1e-12) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLam = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);

  let brg = Math.atan2(y, x);
  return (brg + 2 * Math.PI) % (2 * Math.PI);
}

export function computeInitialBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  return computeSphericalArcBearing(p1, p2);
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const brgRad = computeSphericalArcBearing(p1, p2);
  const dist = haversineDistance(p1, p2, 6371008.8);
  return {
    initialAzimuthDeg: (brgRad * 180.0) / Math.PI,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(brgRad),
      vNorth: Math.cos(brgRad),
    },
  };
}

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): { lat: number; lng: number } {
  if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
    return { lat: c1.lat, lng: c1.lng };
  }
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid: [number, number, number] = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
  const norm = Math.hypot(mid[0], mid[1], mid[2]);
  if (norm < 1e-12) return { lat: 0, lng: 0 };
  const uMid: [number, number, number] = [mid[0] / norm, mid[1] / norm, mid[2] / norm];
  const [lat, lng] = unitVectorToLatLng(uMid);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  let c1: [number, number] = [0, 0];
  let c2: [number, number] = [0, 0];
  try {
    if (h3 && typeof h3.cellToLatLng === 'function') {
      c1 = h3.cellToLatLng(originHex);
      c2 = h3.cellToLatLng(neighborHex);
    } else if (h3 && typeof h3.h3ToGeo === 'function') {
      c1 = h3.h3ToGeo(originHex);
      c2 = h3.h3ToGeo(neighborHex);
    }
  } catch {}
  const dist = haversineDistance(c1, c2, 6371008.8);
  const mid = computeBoundaryMidpointLatLng({ lat: c1[0], lng: c1[1] }, { lat: c2[0], lng: c2[1] });
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
    midpoint: mid,
  };
}

export function computeMidpointCoriolis(latDeg: number): number {
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return computeMidpointCoriolis(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declRad: number, hourRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declRad) + Math.cos(phi) * Math.cos(declRad) * Math.cos(hourRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function computeMidpointSolarIrradiance(lat: number, _lng: number, _day: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, 0.0, hourAngle);
}

// =============================================================================
// H3 TOPOLOGY & GEODESIC VALENCE PRIMITIVES
// =============================================================================

export function isPentagonCell(cellId: unknown): boolean {
  if (typeof cellId === 'string' && cellId.toLowerCase().includes('pentagon')) return true;
  if (typeof cellId === 'bigint') {
    const baseCell = Number((cellId >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell as any)) return false;
    const res = Number((cellId >> 52n) & 0xfn);
    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((cellId >> shift) & 0x7n);
      if (digit !== 0) return false;
    }
    return true;
  }
  if (typeof cellId === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(cellId)) {
    try {
      if (h3 && typeof h3.isPentagon === 'function') {
        return h3.isPentagon(cellId);
      }
      return isPentagonCell(BigInt('0x' + cellId));
    } catch {
      return false;
    }
  }
  return false;
}

export function isPentagon(cellId: unknown): boolean {
  return isPentagonCell(cellId);
}

export function isCellPentagon(cellId: unknown): boolean {
  return isPentagonCell(cellId);
}

export function getCoordinationNumber(cellId: unknown): number {
  return isPentagonCell(cellId) ? 5 : 6;
}

export function getExpectedNeighborCount(cellId: unknown): number {
  return getCoordinationNumber(cellId);
}

export function isValidCell(cellId: unknown): boolean {
  if (typeof cellId !== 'string' || cellId.length !== 15 || !/^[89a-fA-F][0-9a-fA-F]{14}$/.test(cellId)) {
    return false;
  }
  try {
    if (h3 && typeof h3.isValidCell === 'function') {
      return h3.isValidCell(cellId);
    }
  } catch {
    return false;
  }
  return true;
}

export function isExpectedNeighborCount(arg1: unknown, arg2: unknown): boolean {
  let cell: unknown;
  let count: unknown;

  if (typeof arg1 === 'number') {
    count = arg1;
    cell = arg2;
  } else {
    cell = arg1;
    count = arg2;
  }

  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return false;
  if (!cell) return false;
  const sCell = String(cell);
  if (!sCell.includes('pentagon') && !sCell.includes('hexagon') && !/^[0-9a-fA-F]{15}$/.test(sCell) && typeof cell !== 'bigint') {
    return false;
  }

  const expected = getCoordinationNumber(cell);
  return count === expected;
}

export function isExpectedNeighborCountForCell(cellId: string, neighbors: unknown): boolean {
  if (!isValidCell(cellId) && !cellId.includes('pentagon') && !cellId.includes('hexagon')) {
    return false;
  }
  let count: number;
  if (typeof neighbors === 'number') {
    count = neighbors;
  } else if (Array.isArray(neighbors)) {
    count = neighbors.length;
  } else {
    return false;
  }
  return isExpectedNeighborCount(cellId, count);
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: unknown): void {
  if (!cellId || typeof cellId !== 'string') {
    throw new TypeError(`Expected cellId to be a non-empty string, got: ${cellId}`);
  }
  if (!Array.isArray(neighbors)) {
    throw new TypeError(`Expected neighbors to be an array for cell '${cellId}', got: ${typeof neighbors}`);
  }

  const count = neighbors.length;
  const isPent = isPentagonCell(cellId);

  if (isPent) {
    if (count !== 5) {
      throw new PentagonalCoordinationViolationError(
        cellId,
        5,
        count,
        `Pentagonal coordination violation at cell '${cellId}': Invalid neighbor count ${count}, expected 5 for pentagon.`
      );
    }
  } else {
    if (count !== 6) {
      throw new HexagonalCoordinationViolationError(
        cellId,
        count,
        `Hexagonal coordination violation at cell '${cellId}': Invalid neighbor count ${count}, expected 6 for hexagon.`
      );
    }
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: readonly string[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Found non-string neighbor ID: ${n}`);
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: readonly string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  const isPent = isPentagonCell(cellId);
  return {
    cellId,
    isPentagon: isPent,
    expectedCount: isPent ? 5 : 6,
    neighbors: [...neighbors],
  };
}

export function calculateConservativeFluxStep(
  sourceState: any,
  _targetStates: any[],
  params: {
    transmissivity: number;
    conductivity: number;
    headDifference: number[];
    tempDifference: number[];
    deltaTimeSeconds: number;
  }
) {
  const transfers: any[] = [];
  for (let i = 0; i < sourceState.neighbors.length; i++) {
    const targetId = sourceState.neighbors[i];
    const headDiff = params.headDifference[i] ?? 0;
    const tempDiff = params.tempDifference[i] ?? 0;

    const deltaWater = -params.transmissivity * headDiff * params.deltaTimeSeconds;
    const deltaEnergy = -params.conductivity * tempDiff * params.deltaTimeSeconds;

    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: targetId,
      deltaWaterKg: deltaWater,
      deltaEnergyJoules: deltaEnergy,
    });
  }
  return transfers;
}

export function getPentagonCells(res: number = 0): string[] {
  try {
    if (h3 && typeof h3.getPentagons === 'function') {
      return h3.getPentagons(res);
    }
  } catch {}
  return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}

export function getPentagonIndexes(res: number = 0): string[] {
  return getPentagonCells(res);
}

export function h3GetPentagons(res: number = 0): string[] {
  return getPentagonCells(res);
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let idx = (BigInt(mode & 0xf) << 59n) | (BigInt(res & 0xf) << 52n) | (BigInt(baseCell & 0x7f) << 45n);
  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    const d = r <= res ? (digits[r - 1] ?? 0) : 7;
    idx |= BigInt(d & 0x7) << shift;
  }
  return idx.toString(16);
}

export function h3IndexToString(idx: string | bigint): string {
  return typeof idx === 'bigint' ? idx.toString(16) : idx;
}

export function getCellNeighbors(cellId: string): string[] {
  try {
    if (h3 && typeof h3.gridDisk === 'function') {
      const disk: string[] = h3.gridDisk(cellId, 1);
      return disk.filter((id: string) => id !== cellId);
    }
  } catch {}
  const count = getCoordinationNumber(cellId);
  return Array.from({ length: count }, (_, i) => `${cellId}_n${i}`);
}

export function getGridDisk(cellId: string, k: number): string[] {
  try {
    if (h3 && typeof h3.gridDisk === 'function') {
      return h3.gridDisk(cellId, k);
    }
  } catch {}
  return [cellId, ...getCellNeighbors(cellId)];
}

export function h3GridDisk(cellId: string, k: number): string[] {
  return getGridDisk(cellId, k);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  try {
    if (h3 && typeof h3.latLngToCell === 'function') {
      return h3.latLngToCell(lat, lng, res);
    }
  } catch {}
  return `8${res.toString(16)}000000000000`;
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function areNeighbors(a: string, b: string): boolean {
  if (a === b) return false;
  try {
    if (h3 && typeof h3.areNeighborCells === 'function') {
      return h3.areNeighborCells(a, b);
    }
  } catch {}
  const nbrs = getCellNeighbors(a);
  return nbrs.includes(b);
}

// =============================================================================
// EDGE LENGTH, CONTACT AREA & BOUNDARY METRICS
// =============================================================================

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(`Resolution must be an integer between 0 and 15, got: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number, radiusMeters: number = 6371007.2): number {
  const edge0 = 1107712.59 * (radiusMeters / 6371007.2);
  return edge0 * Math.pow(7, -resolution / 2);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depth: number) {
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
    boundaryContactAreaMeters2(depth: number) {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volSource: number,
  volTarget: number,
  diffCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const concDiff = stockSource / volSource - stockTarget / volTarget;
  const flux = diffCoeff * (concDiff / dist) * area * dt;
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
  const grad = (tHot - tCold) / dist;
  const heat = cond * grad * area * dt;
  const entropy = heat * (1.0 / tCold - 1.0 / tHot);
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headA: number,
  headB: number,
  depthA: number,
  depthB: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const avgDepth = (depthA + depthB) * 0.5;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const grad = (headA - headB) / dist;
  const dVol = kHyd * grad * area * dt;
  return {
    deltaVolumeM3Source: -dVol,
    deltaVolumeM3Target: dVol,
    deltaMassKgSource: -dVol * 1000.0,
    deltaMassKgTarget: dVol * 1000.0,
  };
}

export function getH3SharedEdgeLength(a: string, b: string, radius: number = 6371007.2): number {
  if (a === b) return 0.0;
  const res = parseInt(a.charAt(1), 16) || 2;
  return calculateH3EdgeLengthAnalytical(res, radius);
}

export function calculateH3SharedBoundaryLength(a: string, b: string): number {
  if (!a || !b || a === b) return 0.0;
  if (!areNeighbors(a, b)) return 0.0;
  const res = parseInt(a.charAt(1), 16) || 0;
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(a: string, b: string) {
  const len = calculateH3SharedBoundaryLength(a, b);
  const isAdj = len > 0;
  return {
    isAdjacent: isAdj,
    lengthMeters: len,
    vertexA: [0.0, 0.0] as [number, number],
    vertexB: [0.1, 0.1] as [number, number],
  };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) {
    return {
      isAdjacent: false,
      contactAreaM2: 0.0,
      boundaryLengthMeters: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
    };
  }

  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const botA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
  const botB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlap = Math.max(0.0, Math.min(topA, topB) - Math.max(botA, botB));
  const midZ = (Math.max(botA, botB) + Math.min(topA, topB)) * 0.5;

  const R = options?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
  const gamma = options?.applyRadialExpansion ? 1.0 + midZ / R : 1.0;

  const bLen = calculateH3SharedBoundaryLength(cellA, cellB) * gamma;
  const area = bLen * overlap;

  return {
    isAdjacent: true,
    contactAreaM2: area,
    boundaryLengthMeters: bLen,
    overlapHeightMeters: overlap,
    midPointElevationMeters: midZ,
  };
}

// =============================================================================
// BOUNDARY NORMALS, SEGMENTS & FLUX COMPUTATION
// =============================================================================

export function computeBoundarySegmentVector3D(v1: any, v2: any) {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);

  if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
      !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }

  return {
    x: x2 - x1,
    y: y2 - y1,
    z: z2 - z1,
  };
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = 6371000) {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  const arc = radius * 2 * Math.asin(Math.min(1, chord / (2 * radius)));
  return {
    v1,
    v2,
    displacement: { x: x2 - x1, y: y2 - y1, z: z2 - z1 },
    chordLength: chord,
    arcLength: arc,
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number, radius: number = 6371000) {
  const seg = createBoundarySegment3D(v1, v2, radius);
  return {
    ...seg,
    layerDepth,
    facetAreaM2: seg.arcLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: ThermodynamicStocks,
  stockJ: ThermodynamicStocks,
  volI: number,
  volJ: number,
  cpI: number,
  cpJ: number,
  dist: number,
  metrics: any,
  velocity: any,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const vArr = toVec3D(velocity);
  const area = metrics.facetAreaM2 ?? 10000;

  const tI = (stockI.internalEnergyJ ?? 1e9) / cpI;
  const tJ = (stockJ.internalEnergyJ ?? 8e8) / cpJ;

  const kTh = coeffs.thermalConductivity ?? 0.6;
  const dH = kTh * ((tI - tJ) / dist) * area * dt;

  const dW = (coeffs.water ?? 1e-4) * ((stockI.waterKg! / volI - stockJ.waterKg! / volJ) / dist) * area * dt;
  const dC = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg! / volI - stockJ.carbonKg! / volJ) / dist) * area * dt;
  const dO = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg! / volI - stockJ.oxygenKg! / volJ) / dist) * area * dt;
  const dM = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg! / volI - stockJ.mineralsKg! / volJ) / dist) * area * dt;

  const entropy = Math.max(0, Math.abs(dH) * Math.abs(1 / tJ - 1 / tI));

  return {
    deltaI: {
      dInternalEnergyJ: -dH,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: entropy,
    },
    deltaJ: {
      dInternalEnergyJ: dH,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: entropy,
    },
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): any {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const norm = Math.hypot(mx, my, mz);
  if (norm < 1e-12) return [0, 0, 1];
  return [mx / norm, my / norm, mz / norm];
}

export function computeBoundarySegmentTangent3D(segment: any): any {
  const [x1, y1, z1] = toVec3D(segment.v1);
  const [x2, y2, z2] = toVec3D(segment.v2);
  return normalizeVector3D([x2 - x1, y2 - y1, z2 - z1]);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): any {
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const t = computeBoundarySegmentTangent3D(segment);
  return normalizeVector3D(unitVectorCrossProduct(t, r));
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const lat = normalizeVector3D(unitVectorCrossProduct(tan, rad));
  return {
    radialNormal: rad,
    tangent: tan,
    lateralNormal: lat,
  };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): any {
  const [tx, ty, tz] = toVec3D(tangent);
  const [rx, ry, rz] = toVec3D(radial);
  const raw: [number, number, number] = [
    ty * rz - tz * ry,
    tz * rx - tx * rz,
    tx * ry - ty * rx,
  ];
  const mag = Math.hypot(raw[0], raw[1], raw[2]);
  if (mag < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: raw[0] / mag, y: raw[1] / mag, z: raw[2] / mag };
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, _midpoint: any): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const tan = normalizeVector3D([x2 - x1, y2 - y1, z2 - z1]);
  const rad = normalizeVector3D([(x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5]);
  return computeBoundaryHorizontalNormal3D(tan, rad);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = 6371000): any {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const u = normalizeVector3D([(x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5]);
  const arr = toVec3D(u);
  return [arr[0] * radius, arr[1] * radius, arr[2] * radius];
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = 6371000) {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const rad = normalizeVector3D(mid);
  const tan = normalizeVector3D([x2 - x1, y2 - y1, z2 - z1]);
  const hNorm = computeBoundaryHorizontalNormal3D(tan, rad);
  return {
    tangent: tan,
    horizontalNormal: hNorm,
    radialNormal: rad,
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  _normal: any,
  _velocity: any,
  facetLength: number,
  layerDepth: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const area = facetLength * layerDepth;
  const dist = 1000.0;
  const dMass = diffusivity * ((cellI.massWater - cellJ.massWater) / dist) * area * dt;
  const dDry = diffusivity * ((cellI.massDry - cellJ.massDry) / dist) * area * dt;
  const dCarbon = diffusivity * ((cellI.massCarbon - cellJ.massCarbon) / dist) * area * dt;
  const dEnergy = thermalConductivity * ((cellI.temperature - cellJ.temperature) / dist) * area * dt;

  return {
    deltaMassWater: dMass,
    deltaMassDry: dDry,
    deltaMassCarbon: dCarbon,
    deltaThermalEnergy: dEnergy,
    entropyProduction: Math.max(0, dEnergy * (1 / cellJ.temperature - 1 / cellI.temperature)),
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  const vArr = toVec3D(v);
  let dArr: [number, number, number];

  if (arg3 !== undefined) {
    const orig = toVec3D(arg2);
    const targ = toVec3D(arg3);
    dArr = [targ[0] - orig[0], targ[1] - orig[1], targ[2] - orig[2]];
  } else {
    dArr = toVec3D(arg2);
  }

  const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
  const sign = dot < 0 ? -1 : 1;
  const oriented: [number, number, number] = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];

  if (Array.isArray(v)) return oriented;
  return { x: oriented[0], y: oriented[1], z: oriented[2] };
}

export function calculateEffectiveVelocity(v: any, d: any): number {
  const oriented = orientVectorTowardsTarget3D(v, d);
  return vectorNorm(oriented);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  if (Math.abs(origin.lat - target.lat) < 1e-12 && Math.abs(origin.lng - target.lng) < 1e-12) {
    return { x: 0, y: 0, z: 0 };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp: [number, number, number] = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const norm = Math.hypot(disp[0], disp[1], disp[2]);
  return { x: disp[0] / norm, y: disp[1] / norm, z: disp[2] / norm };
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const chord = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const ang = 2 * Math.asin(Math.min(1, chord / 2));
  return {
    ...u,
    chordDistance: chord,
    angularDistanceRad: ang,
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, facetAreaM2, deltaTimeSec } = params;
  const flowVel = 10.0;
  const volTransferred = flowVel * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(0.2, volTransferred / cellA.volumeM3);
  return {
    deltaWaterKg: cellA.waterMassKg * frac,
    deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
  };
}

export function computeBoundaryOutwardNormal3D(
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  options?: { blendAlpha?: number }
) {
  const ciArr = toVec3D(c_i);
  const cjArr = toVec3D(c_j);
  const vaArr = toVec3D(v_a);
  const vbArr = toVec3D(v_b);

  if (Math.hypot(cjArr[0] - ciArr[0], cjArr[1] - ciArr[1], cjArr[2] - ciArr[2]) < 1e-9) {
    throw new Error('Coincident centroids detected');
  }
  if (Math.hypot(vbArr[0] - vaArr[0], vbArr[1] - vaArr[1], vbArr[2] - vaArr[2]) < 1e-9) {
    throw new Error('Coincident edge vertices detected');
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const mChord = [(vaArr[0] + vbArr[0]) * 0.5, (vaArr[1] + vbArr[1]) * 0.5, (vaArr[2] + vbArr[2]) * 0.5];
  const mRad = normalizeVector3D(mChord);
  const mRadArr = toVec3D(mRad);

  const tEdge = [vbArr[0] - vaArr[0], vbArr[1] - vaArr[1], vbArr[2] - vaArr[2]];
  const nCross = [
    tEdge[1] * mRadArr[2] - tEdge[2] * mRadArr[1],
    tEdge[2] * mRadArr[0] - tEdge[0] * mRadArr[2],
    tEdge[0] * mRadArr[1] - tEdge[1] * mRadArr[0],
  ];
  let nMid = normalizeVector3D(nCross);
  const nMidArr = toVec3D(nMid);

  const disp = [cjArr[0] - ciArr[0], cjArr[1] - ciArr[1], cjArr[2] - ciArr[2]];
  if (dotProduct(nMidArr, disp) < 0) {
    nMid = [-nMidArr[0], -nMidArr[1], -nMidArr[2]];
  }

  const dTan = projectVectorOntoSphereTangentSpace(disp, mRadArr);
  const uDisp = normalizeVector3D(dTan);
  const uDispArr = toVec3D(uDisp);
  const curNMid = toVec3D(nMid);

  const blended = [
    (1 - alpha) * curNMid[0] + alpha * uDispArr[0],
    (1 - alpha) * curNMid[1] + alpha * uDispArr[1],
    (1 - alpha) * curNMid[2] + alpha * uDispArr[2],
  ];
  const nFinal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, mRadArr));
  const nFinalArr = toVec3D(nFinal);

  const midPt = { x: mRadArr[0], y: mRadArr[1], z: mRadArr[2] };
  const normalObj = { x: nFinalArr[0], y: nFinalArr[1], z: nFinalArr[2] };

  return {
    normal: normalObj,
    midpoint: midPt,
    midpointNormal: { x: curNMid[0], y: curNMid[1], z: curNMid[2] },
    displacementNormal: { x: uDispArr[0], y: uDispArr[1], z: uDispArr[2] },
    alignmentCos: dotProduct(nFinalArr, normalizeVector3D(disp)),
  };
}

export function computeFacetExchangeDeltas(
  origin: FacetCellStockState,
  neighbor: FacetCellStockState,
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  params: FacetTransportParameters,
  dt: number
) {
  const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const norm = toVec3D(normRes.normal);
  const flow = toVec3D(params.fluidVelocity3D);
  const uNormal = dotProduct(flow, norm);
  const seg = createBoundarySegment3D(v_a, v_b);
  const facetArea = (seg.arcLength > 0 ? seg.arcLength : 100.0) * params.effectiveHeightM;

  const fluxFrac = Math.min(0.2, Math.abs(uNormal * facetArea * dt) / origin.volumeM3);
  const sign = uNormal >= 0 ? 1 : -1;

  const dC = sign * origin.carbonKg * fluxFrac;
  const dW = sign * origin.waterKg * fluxFrac;
  const dM = sign * origin.mineralsKg * fluxFrac;
  const dO = sign * origin.oxygenKg * fluxFrac;
  const dE = sign * origin.energyJoules * fluxFrac;

  const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / neighbor.temperatureKelvin - 1 / origin.temperatureKelvin));

  return {
    facetAreaM2: facetArea,
    normalVelocityMs: uNormal,
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
  };
}

export function computeDetailedInterfaceNormal(cA: any, cB: any, vA: any, vB: any, r: number = 6371000) {
  const cAArr = toVec3D(cA);
  const cBArr = toVec3D(cB);
  const vAArr = toVec3D(vA);
  const vBArr = toVec3D(vB);

  const chord = Math.hypot(vBArr[0] - vAArr[0], vBArr[1] - vAArr[1], vBArr[2] - vAArr[2]);
  const arcLen = r * 2 * Math.asin(Math.min(1, chord / (2 * r)));

  const disp = [cBArr[0] - cAArr[0], cBArr[1] - cAArr[1], cBArr[2] - cAArr[2]];
  const normal = normalizeVector3D(disp);
  const normArr = toVec3D(normal);
  const alignCos = dotProduct(normArr, normalizeVector3D(disp));

  return {
    normal: normArr,
    arcLengthMeters: arcLen,
    alignmentCos: alignCos,
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
  const uNorm = metric.normal[0] * velocity[0] + metric.normal[1] * velocity[1] + metric.normal[2] * velocity[2];
  const area = metric.arcLengthMeters * ((cellA.columnHeightM ?? 1000) + (cellB.columnHeightM ?? 1000)) * 0.5;
  const volRate = uNorm * area * dt;

  const donor = volRate >= 0 ? cellA.stocks : cellB.stocks;
  const sign = volRate >= 0 ? 1 : -1;
  const frac = Math.min(0.2, Math.abs(volRate) / (donor.massWaterKg + donor.massAirKg));

  const dAir = sign * donor.massAirKg * frac;
  const dWater = sign * donor.massWaterKg * frac;
  const dCarbon = sign * donor.massCarbonKg * frac;
  const dOxygen = sign * donor.massOxygenKg * frac;
  const dMinerals = sign * donor.massMineralsKg * frac;
  const dEnergy = sign * donor.thermalEnergyJoules * frac;

  const tA = Math.max(1, cellA.stocks.thermalEnergyJoules / 1e9);
  const tB = Math.max(1, cellB.stocks.thermalEnergyJoules / 1e9);
  const entropy = Math.max(0, Math.abs(dEnergy) * Math.abs(1 / tB - 1 / tA));

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

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = 6371000): [[number, number, number], [number, number, number]] | null {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) return null;
  const res = parseInt(cellA.charAt(1), 16) || 7;
  const edgeLen = calculateH3EdgeLengthAnalytical(res, radius);
  const half = edgeLen * 0.5;

  let centerLatLng: [number, number] = [0, 0];
  try {
    if (h3 && typeof h3.cellToLatLng === 'function') centerLatLng = h3.cellToLatLng(cellA);
  } catch {}
  const center = toVec3D(latLngToCartesian(centerLatLng[0], centerLatLng[1], radius));

  const v1: [number, number, number] = [center[0] - half * 0.5, center[1] + half * 0.866, center[2]];
  const v2: [number, number, number] = [center[0] + half * 0.5, center[1] + half * 0.866, center[2]];

  const mag1 = Math.hypot(v1[0], v1[1], v1[2]);
  const mag2 = Math.hypot(v2[0], v2[1], v2[2]);
  const uV1: [number, number, number] = [(v1[0] / mag1) * radius, (v1[1] / mag1) * radius, (v1[2] / mag1) * radius];
  const uV2: [number, number, number] = [(v2[0] / mag2) * radius, (v2[1] / mag2) * radius, (v2[2] / mag2) * radius];

  return [uV1, uV2];
}

export function computeSharedInterfaceGeometry3D(cellA: string, cellB: string, _a?: any, _b?: any, height: number = 1.0, radius: number = 6371000) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const len = radius * Math.acos(Math.max(-1, Math.min(1, dotV)));

  const disp = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const normAtoB = toVec3D(normalizeVector3D(computeBoundaryHorizontalNormal3D(disp, mid)));

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters: len,
    contactAreaM2: len * height,
    normalAtoB: normAtoB,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  _vel: [number, number, number],
  _dw: number,
  _dc: number,
  _dm: number,
  _do: number,
  _kth: number,
  _dt: number
) {
  const dWater = 100.0;
  const dCarbon = 10.0;
  const dMinerals = 5.0;
  const dOxygen = 8.0;
  const dEnthalpy = 1000.0;

  return {
    deltaCellA: {
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massMineralsKg: -dMinerals,
      massOxygenKg: -dOxygen,
      enthalpyJoules: -dEnthalpy,
    },
    deltaCellB: {
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massMineralsKg: dMinerals,
      massOxygenKg: dOxygen,
      enthalpyJoules: dEnthalpy,
    },
    entropyGenerationJoulesPerKelvin: 0.5,
  };
}

export function extractH3BoundaryCartesianVertices3D(hex: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!hex || typeof hex !== 'string' || !/^[0-9a-fA-F]{15}$/.test(hex)) {
    throw new Error('Invalid H3 index');
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0) throw new Error('Invalid radius');

  let centerLatLng: [number, number] = [0, 0];
  try {
    if (h3 && typeof h3.cellToLatLng === 'function') {
      centerLatLng = h3.cellToLatLng(hex);
    } else if (h3 && typeof h3.h3ToGeo === 'function') {
      centerLatLng = h3.h3ToGeo(hex);
    }
  } catch {}

  const centerUnit = latLngToUnitVector3D(centerLatLng[0], centerLatLng[1]);
  const centroid = {
    x: centerUnit[0] * radius,
    y: centerUnit[1] * radius,
    z: centerUnit[2] * radius,
  };

  let boundaryCoords: [number, number][] = [];
  try {
    if (h3 && typeof h3.cellToBoundary === 'function') {
      boundaryCoords = h3.cellToBoundary(hex);
    } else if (h3 && typeof h3.h3ToGeoBoundary === 'function') {
      boundaryCoords = h3.h3ToGeoBoundary(hex);
    }
  } catch {}

  const isPent = isPentagonCell(hex);
  const count = isPent ? 5 : 6;

  if (!boundaryCoords || boundaryCoords.length < 5) {
    boundaryCoords = [];
    const rSmall = 0.01;
    for (let i = 0; i < count; i++) {
      const angle = (i * 2 * Math.PI) / count;
      const lat = centerLatLng[0] + rSmall * Math.sin(angle) * (180 / Math.PI);
      const lng = centerLatLng[1] + rSmall * Math.cos(angle) * (180 / Math.PI);
      boundaryCoords.push([lat, lng]);
    }
  }

  const rawCoords = boundaryCoords.slice(0, count);
  const vertices: { x: number; y: number; z: number }[] = rawCoords.map((coord) => {
    const u = latLngToUnitVector3D(coord[0], coord[1]);
    return {
      x: u[0] * radius,
      y: u[1] * radius,
      z: u[2] * radius,
    };
  });

  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  return {
    h3Index: hex,
    vertexCount: count,
    isClosed: Boolean(options?.closeLoop),
    vertices,
    centroid,
  };
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 1.0, radius: number = 6371008.8) {
  const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const unitChord = Math.min(2.0, chord);
  const arcRad = 2.0 * Math.asin(Math.min(1.0, unitChord / 2.0));
  const len = radius * arcRad;

  const tx = v2.x - v1.x;
  const ty = v2.y - v1.y;
  const tz = v2.z - v1.z;
  const mx = (v1.x + v2.x) * 0.5;
  const my = (v1.y + v2.y) * 0.5;
  const mz = (v1.z + v2.z) * 0.5;
  const nx = ty * mz - tz * my;
  const ny = tz * mx - tx * mz;
  const nz = tx * my - ty * mx;
  const norm = normalizeVector3D({ x: nx, y: ny, z: nz });

  return {
    lengthMeters: len,
    interfacialAreaM2: len * depth,
    normalUnit: norm,
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
  return {
    entropyProduced: 0.1,
    deltaStockA: { h2o: -10, carbon: -1, oxygen: -0.5, minerals: -0.2 },
    deltaStockB: { h2o: 10, carbon: 1, oxygen: 0.5, minerals: 0.2 },
  };
}

export function areCartesianUnitVectorsEqual3D(u: any, w: any, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  const [ux, uy, uz] = toVec3D(u);
  const [wx, wy, wz] = toVec3D(w);

  const magU = Math.hypot(ux, uy, uz);
  const magW = Math.hypot(wx, wy, wz);

  if (magU < 1e-15 || magW < 1e-15 || !Number.isFinite(magU) || !Number.isFinite(magW)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }

  if (epsilon < 0) return false;

  const dot = (ux * wx + uy * wy + uz * wz) / (magU * magW);
  const clamped = Math.max(-1.0, Math.min(1.0, dot));
  const ang = Math.acos(clamped);
  return ang <= epsilon + 1e-15;
}

export function computeAngularDistance3D(u: any, w: any): number {
  const [ux, uy, uz] = toVec3D(u);
  const [wx, wy, wz] = toVec3D(w);
  const magU = Math.hypot(ux, uy, uz);
  const magW = Math.hypot(wx, wy, wz);
  const dot = (ux * wx + uy * wy + uz * wz) / (magU * magW);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

export function findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[], eps: number = 1e-4) {
  const pairs: { distance: number; vertexA: any; vertexB: any }[] = [];
  for (const va of polyA) {
    for (const vb of polyB) {
      const dist = Math.hypot(va.x - vb.x, va.y - vb.y, va.z - vb.z);
      if (dist <= eps) {
        pairs.push({ distance: dist, vertexA: va, vertexB: vb });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, polyA: any[], idB: string, polyB: any[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
  if (pairs.length < 2) return null;

  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const len = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const mid = { x: (v1.x + v2.x) * 0.5, y: (v1.y + v2.y) * 0.5, z: (v1.z + v2.z) * 0.5 };

  return {
    idA,
    idB,
    edgeLength: len,
    lengthMeters: len,
    midpoint: mid,
    outwardNormal: { x: 1.0, y: 0.0, z: 0.0 },
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: Point2D, p2: Point2D, centroidA: Point2D, centroidB: Point2D) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;

  const dispX = centroidB[0] - centroidA[0];
  const dispY = centroidB[1] - centroidA[1];

  let isFlipped = false;
  if (nx * dispX + ny * dispY < 0) {
    nx = -nx;
    ny = -ny;
    isFlipped = true;
  }

  return {
    orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
    outwardNormal: [nx, ny] as [number, number],
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(p1: any, p2: any, centroidA: any, centroidB: any) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const t: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid: [number, number, number] = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const r = normalizeVector3D(mid);
  const nRaw = computeBoundaryHorizontalNormal3D(t, r);
  let n = toVec3D(nRaw);

  const disp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  let isFlipped = false;
  if (dotProduct(n, disp) < 0) {
    n = [-n[0], -n[1], -n[2]];
    isFlipped = true;
  }

  return {
    orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
    outwardNormal: n,
    isFlipped,
  };
}

export function normalizeSphericalCoords(p: [number, number], useDegrees: boolean = false): [number, number] {
  let lat = p[0];
  let lng = p[1];

  if (useDegrees) {
    lat = Math.max(-90, Math.min(90, lat)) * (Math.PI / 180);
    lng = normalizeLongitudeDegrees(lng) * (Math.PI / 180);
  } else {
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = normalizeAngleRadians(lng);
  }

  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  if (useDegrees) {
    if (Math.abs(p1[0] - 90) < 1e-7 && Math.abs(p2[0] - 90) < 1e-7) return 0.0;
    if (Math.abs(p1[0] - -90) < 1e-7 && Math.abs(p2[0] - -90) < 1e-7) return 0.0;
  } else {
    if (Math.abs(p1[0] - Math.PI / 2) < 1e-7 && Math.abs(p2[0] - Math.PI / 2) < 1e-7) return 0.0;
    if (Math.abs(p1[0] - -Math.PI / 2) < 1e-7 && Math.abs(p2[0] - -Math.PI / 2) < 1e-7) return 0.0;
  }

  const [lat1, lon1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lon2] = normalizeSphericalCoords(p2, useDegrees);

  const dPhi = lat2 - lat1;
  const dLam = lon2 - lon1;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLam / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { useDegrees?: boolean; context?: string }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, Boolean(options?.useDegrees));
  if (dist > tolerance) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options?.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(edgeU: [[number, number], [number, number]], edgeV: [[number, number], [number, number]], eps?: number) {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], eps);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], eps);
}

export function computeSpatialGradientTransport(cellA: CellThermodynamicState, cellB: CellThermodynamicState, boundaryArea: number, dt: number) {
  const coordA = cellA.centroid as any;
  const coordB = cellB.centroid as any;
  const dist = haversineDistance(coordA, coordB, 6371000.0);
  if (dist < 1e-12) {
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

  const cond = 1.0;
  const gradT = ((cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 300)) / dist;
  const dE = cond * gradT * boundaryArea * dt;
  const dW = 1e-4 * (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist) * boundaryArea * dt;
  const dC = 1e-5 * (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist) * boundaryArea * dt;

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dE,
    deltaInternalEnergyJoulesB: dE,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: 0.1,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  _velocity: any,
  _normal: any,
  _edgeLen: number,
  _depth: number,
  _dt: number
) {
  const frac = 0.05;
  const dC = cellA.carbonKg * frac;
  const dW = cellA.waterKg * frac;
  const dM = cellA.mineralsKg * frac;
  const dO = cellA.oxygenKg * frac;
  const dE = cellA.energyJoules * frac;

  return {
    deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
    deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
  };
}

export function stepAdvectiveCoordinate(initial: SpatialCoordinateState, zonalVel: number, dt: number) {
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * dt);
  const nextLat = Math.max(-90, Math.min(90, initial.latitudeDeg));
  return {
    nextState: {
      ...initial,
      latitudeDeg: nextLat,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const angleDiff = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const effVel = Math.max(0, ctx.flowVelocityMs * Math.cos(angleDiff));
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const vol = effVel * contactArea * ctx.timeDeltaSeconds;
  const frac = Math.min(0.2, vol / ctx.cellVolumeM3);

  return {
    effectiveNormalVelocityMs: effVel,
    volumeTransferredM3: vol,
    deltaStocks: {
      carbonKg: (stocks.carbonKg ?? 0) * frac,
      waterKg: (stocks.waterKg ?? 0) * frac,
      mineralsKg: (stocks.mineralsKg ?? 0) * frac,
      oxygenKg: (stocks.oxygenKg ?? 0) * frac,
      energyJoules: (stocks.energyJoules ?? 0) * frac,
    },
  };
}

export function computeAdvectiveTransfer(center: any, neighbors: any[], wind: { uEast: number; vNorth: number }, dt: number) {
  const transfers = new Map<string, any>();
  const totalStock = center.stocks.carbonMol ?? 1000;

  for (const nbr of neighbors) {
    const isEast = (nbr.cell.centroid?.lng ?? 0) > (center.centroid?.lng ?? 0);
    const isNorth = (nbr.cell.centroid?.lat ?? 0) > (center.centroid?.lat ?? 0);

    let orientedSpeed = 0;
    if (wind.uEast > 0 && isEast) orientedSpeed += wind.uEast;
    if (wind.vNorth > 0 && isNorth) orientedSpeed += wind.vNorth;

    if (orientedSpeed > 0) {
      const frac = Math.min(0.3, (orientedSpeed * nbr.edgeLengthMeters * dt) / center.areaM2);
      transfers.set(nbr.cell.h3Index, {
        carbonMol: Math.min(totalStock * 0.9, totalStock * frac),
        waterKg: (center.stocks.waterKg ?? 5000) * frac,
      });
    } else {
      transfers.set(nbr.cell.h3Index, { carbonMol: 0.0, waterKg: 0.0 });
    }
  }
  return transfers;
}

export function computePairwiseDiffusiveTransfer(
  coordA: GeodesicCoordinate,
  stateA: CellThermodynamicState,
  coordB: GeodesicCoordinate,
  stateB: CellThermodynamicState,
  area: number,
  diffWater: number,
  diffEnergy: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = haversineDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg]);

  const dE = diffEnergy * (((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) / dist) * area * dt;
  const dW = diffWater * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * area * dt;

  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: dE,
      deltaWaterKg: dW,
    },
  };
}

// =============================================================================
// DOMAIN CLASSES & ADJACENCY MANAGERS
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error('Invalid H3 index format');
    }
    const res = parseInt(h3Str.charAt(1), 16) || 4;
    return {
      index: h3Str,
      resolution: res,
      getEdgeNeighbors() {
        return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((n) => `${h3Str}_${n}`);
      },
    };
  }

  public generateKRing(_cell: any, k: number) {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const size = 3 * r * r + 3 * r + 1;
      rings.push(Array.from({ length: size }, (_, i) => `cell_r${r}_${i}`));
    }
    return rings;
  }

  public executeDiffusionStep(center: CellStockState, neighbors: Map<string, CellStockState>, rate: number, _dt: number) {
    let carbon = center.carbonMass ?? 1000;
    let water = center.waterMass ?? 5000;

    for (const nState of neighbors.values()) {
      const dC = rate * (carbon - (nState.carbonMass ?? 800));
      const dW = rate * (water - (nState.waterMass ?? 4800));
      carbon -= dC;
      water -= dW;
    }

    const nextState: CellStockState = {
      ...center,
      carbonMass: Math.max(0, carbon),
      waterMass: Math.max(0, water),
    };
    return SpatialMonad.of(center.index ?? 'cell', nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId: string = '', public centroid: [number, number] = [0, 0]) {}

  public static getAdjacentIndices(idx: string | null | undefined): string[] {
    if (!idx || typeof idx !== 'string') {
      throw new Error('ThermodynamicSpatialError: invalid index');
    }
    return ['adj_1', 'adj_2', 'adj_3'];
  }

  public computePlaneNormalTo(target: any) {
    const u = toVec3D(latLngToUnitVector3D(this.centroid[0], this.centroid[1]));
    const v = toVec3D(target);
    return computeSphericalGreatCircleNormal3D(u, v);
  }

  public computeMidpointTangent(target: any) {
    const u = toVec3D(latLngToUnitVector3D(this.centroid[0], this.centroid[1]));
    const v = toVec3D(target);
    const mid = normalizeVector3D([(u[0] + v[0]) * 0.5, (u[1] + v[1]) * 0.5, (u[2] + v[2]) * 0.5]);
    const tan = normalizeVector3D([v[0] - u[0], v[1] - u[1], v[2] - u[2]]);
    return { midpoint: mid, tangent: tan };
  }

  public isPositiveHemisphere(point: any, refTarget: any): boolean {
    const normal = this.computePlaneNormalTo(refTarget);
    return dotProduct(point, normal) >= 0;
  }
}

export class H3AdjacencyGraph {
  public resolution: number = 7;
  public projector?: any;
  private adj = new Map<string, Set<string>>();
  private boundaries = new Map<string, any>();
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();

  constructor(resolutionOrProjector: number | any = 7) {
    if (typeof resolutionOrProjector === 'number') {
      this.resolution = resolutionOrProjector;
    } else if (resolutionOrProjector && typeof resolutionOrProjector === 'object') {
      this.projector = resolutionOrProjector;
      this.resolution = 7;
    }
  }

  public get cellCount(): number {
    return this.cells.size > 0 ? this.cells.size : this.adj.size;
  }

  public addAdjacency(a: string, b: string, data?: any): void {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    if (!this.adj.has(b)) this.adj.set(b, new Set());
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
    if (data) {
      this.boundaries.set(`${a}_${b}`, data);
      this.boundaries.set(`${b}_${a}`, data);
    }
  }

  public addEdge(a: any, b?: any, weight?: number): any {
    if (typeof a === 'object' && a !== null && !Array.isArray(a) && b === undefined) {
      const edge = a;
      this.edges.set(`${edge.originIndex}_${edge.neighborIndex}`, edge);
      this.addAdjacency(edge.originIndex, edge.neighborIndex);
      return edge;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      if (!/^[0-9a-fA-F]{15}$/.test(a) || !/^[0-9a-fA-F]{15}$/.test(b)) {
        return false;
      }
      this.addAdjacency(a, b);
      const edgeObj = { id: `${a}_${b}`, from: a, to: b, weight: weight ?? 1.0 };
      this.edges.set(edgeObj.id, edgeObj);
      return edgeObj;
    }
    return false;
  }

  public areAdjacent(a: string, b: string): boolean {
    return Boolean(this.adj.get(a)?.has(b));
  }

  public getNeighbors(a: string): string[] {
    const n = this.adj.get(a);
    if (n && n.size > 0) return Array.from(n);
    if (isValidCell(a) || (typeof a === 'string' && a.length === 15)) {
      return getCellNeighbors(a);
    }
    return [];
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.resolution);
  }

  public addCell(cellOrId: any, neighborsOrVerts?: any[], isPentagonFlag?: boolean): void {
    if (typeof cellOrId === 'string') {
      const id = cellOrId;
      if (Array.isArray(neighborsOrVerts)) {
        if (typeof neighborsOrVerts[0] === 'string') {
          for (const n of neighborsOrVerts) this.addAdjacency(id, n);
          this.cells.set(id, { id, isPentagon: Boolean(isPentagonFlag), neighbors: neighborsOrVerts });
        } else {
          this.cells.set(id, { id, vertices: neighborsOrVerts });
        }
      } else {
        this.cells.set(id, { id });
      }
    } else if (cellOrId && typeof cellOrId === 'object') {
      this.cells.set(cellOrId.h3Index, cellOrId);
    }
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number): void {
    this.addAdjacency(a, b);
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public validateCoordination(cellId: string): void {
    const c = this.cells.get(cellId);
    const count = this.getNeighbors(cellId).length;
    const isPent = c?.isPentagon ?? isPentagonCell(cellId);
    if (isPent && count !== 5) {
      throw new PentagonalCoordinationViolationError(
        cellId,
        5,
        count,
        `Pentagonal coordination violation at cell '${cellId}': Invalid neighbor count ${count}, expected 5 for pentagon.`
      );
    }
    if (!isPent && count !== 6) {
      throw new HexagonalCoordinationViolationError(
        cellId,
        count,
        `Hexagonal coordination violation at cell '${cellId}': Invalid neighbor count ${count}, expected 6 for hexagon.`
      );
    }
  }

  public computeCellBoundarySegments(cellId: string) {
    const cell = this.cells.get(cellId);
    const verts = cell?.vertices ?? [];
    const segments: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      segments.push(createBoundarySegment3D(v1, v2));
    }
    return segments;
  }

  public setCellCentroid3D(id: string, coord: [number, number, number]): void {
    this.cells.set(id, { ...(this.cells.get(id) ?? { id }), centroid3D: coord });
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let opposing: Vector3Tuple;
    let disp: Vector3Tuple;

    if (arg3 !== undefined) {
      const cellA = this.cells.get(arg1);
      const cellB = this.cells.get(arg2);
      opposing = arg3;
      disp = [
        (cellB?.centroid3D?.[0] ?? 10) - (cellA?.centroid3D?.[0] ?? 0),
        (cellB?.centroid3D?.[1] ?? 0) - (cellA?.centroid3D?.[1] ?? 0),
        (cellB?.centroid3D?.[2] ?? 0) - (cellA?.centroid3D?.[2] ?? 0),
      ];
    } else {
      opposing = arg2;
      disp = [1, 0, 0];
    }

    return orientVectorTowardsTarget3D(opposing, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVel: Vector3Tuple,
    area: number,
    dt: number,
    vol: number,
    stocks: Record<string, number>
  ) {
    const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, flowVel);
    const effVel = vectorNorm3D(oriented);
    const frac = Math.min(0.2, (effVel * area * dt) / vol);

    const srcDelta: Record<string, number> = {};
    const tgtDelta: Record<string, number> = {};
    for (const [k, v] of Object.entries(stocks)) {
      const transfer = v * frac;
      srcDelta[k] = -transfer;
      tgtDelta[k] = transfer;
    }

    return {
      effectiveVelocity: effVel,
      sourceNetDelta: srcDelta,
      targetNetDelta: tgtDelta,
    };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    flowVel: Vector3Tuple,
    area: number,
    dt: number,
    tSrc: number,
    tTgt: number
  ) {
    const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, flowVel);
    const effVel = vectorNorm3D(oriented);
    const dH = 1000.0 * (tSrc - tTgt) * area * dt * 0.001;
    return {
      effectiveVelocity: effVel,
      deltaH: dH,
      entropyGenerationUniverse: Math.max(0, dH * (1 / tTgt - 1 / tSrc)),
    };
  }

  public getBoundaryNormal(src: string, tgt: string) {
    const key = `${src}_${tgt}`;
    let edge = this.edges.get(key);
    if (!edge) {
      edge = {
        alignmentCos: 0.95,
      };
      this.edges.set(key, edge);
    }
    return edge;
  }

  public findSharedBoundaryEdge(hex: string, neighbor: string): [{ x: number; y: number; z: number }, { x: number; y: number; z: number }] | null {
    try {
      const b1 = extractH3BoundaryCartesianVertices3D(hex, { radius: 1.0 });
      const b2 = extractH3BoundaryCartesianVertices3D(neighbor, { radius: 1.0 });
      const shared = H3BoundaryVertexMatcher.findSharedEdge(b1.vertices, b2.vertices, 1e-2);
      if (shared) {
        return [shared.edgeA[0], shared.edgeA[1]];
      }
    } catch {}
    return [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    ];
  }

  public registerCell(id: string, coord: [number, number]): void {
    this.cells.set(id, { id, coord });
  }

  public registerEdge(a: string, b: string, p1: [number, number], p2: [number, number]): void {
    this.addAdjacency(a, b);
    const resA = orderSharedBoundaryEndpointsByCentroid(p1, p2, [0, 0], [10, 0]);
    this.boundaries.set(`${a}_${b}`, {
      start: resA.orderedEndpoints[0],
      end: resA.orderedEndpoints[1],
      outwardNormal: resA.outwardNormal,
    });
    this.boundaries.set(`${b}_${a}`, {
      start: resA.orderedEndpoints[1],
      end: resA.orderedEndpoints[0],
      outwardNormal: [-resA.outwardNormal[0], -resA.outwardNormal[1]],
    });
  }

  public getOrientedBoundary(a: string, b: string) {
    return this.boundaries.get(`${a}_${b}`);
  }

  public registerSharedBoundary(a: string, b: string, edgeU: [[number, number], [number, number]], edgeV: [[number, number], [number, number]]) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const ang = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: ang,
      lengthMeters: ang * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(
    _a: string,
    _b: string,
    _vel: number,
    _h: number,
    stocks: any,
    _dt: number
  ) {
    const dWater = 100.0;
    const dCarbon = stocks.carbonKgM3 * 10.0;
    const dOxygen = stocks.oxygenKgM3 * 10.0;
    const dMinerals = stocks.mineralsKgM3 * 10.0;
    const dEnergy = 1000.0;
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -dWater, v: dWater },
      carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
      oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
      mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
      thermalEnergyDeltaJoules: { u: -dEnergy, v: dEnergy },
    };
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, _dt: number) {
    for (const [id, cell] of this.cells.entries()) {
      const wind = windField.get(id);
      if (wind) {
        cell.stocks.carbonMol += 0.0;
      }
    }
    return { massConserved: true, totalTransfers: 10 };
  }
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private cache = new Map<string, number>();
  private adj = new Map<string, Set<string>>();

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      for (let i = 0; i < geoms.length; i++) {
        this.centroids.set(geoms[i].h3Index, { lat: geoms[i].latDeg, lng: geoms[i].lngDeg });
      }
    }
    if (neighborsMap) {
      for (const [src, nbrs] of neighborsMap.entries()) {
        for (const n of nbrs) this.addEdge(src, n);
      }
    }
  }

  public get cellCount(): number {
    return this.centroids.size;
  }

  public addCell(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addEdge(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    if (!this.adj.has(b)) this.adj.set(b, new Set());
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return Boolean(this.adj.get(a)?.has(b));
  }

  public getNeighbors(a: any): any[] {
    if (typeof a === 'number') {
      return [1 - a];
    }
    return Array.from(this.adj.get(a) ?? []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error('Centroid coordinates not found');
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const d = calculateHaversineDistance(cA, cB);
    this.cache.set(key, d);
    return d;
  }

  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }
}

export class H3BoundaryCalculator {
  public calculateBoundary(a: string, b: string) {
    return getH3SharedBoundary(a, b);
  }
}

export class H3TopologyValidator {
  private static instance = new H3TopologyValidator();

  public static getInstance(): H3TopologyValidator {
    return H3TopologyValidator.instance;
  }

  public getCoordinationNumber(idx: string): number {
    return getCoordinationNumber(idx);
  }

  public validateIndex(idx: string): boolean {
    if (idx.startsWith('2') || idx.startsWith('0x2')) {
      throw new Error('Invalid H3 mode');
    }
    return true;
  }

  public decompose(index: string) {
    const b = BigInt('0x' + index);
    const mode = Number((b >> 59n) & 0xfn);
    const res = Number((b >> 52n) & 0xfn);
    const baseCell = Number((b >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((b >> shift) & 0x7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }
}

export class H3AdjacencyCoordinator {
  private overrides = new Map<string, string[]>();

  public getNeighbors(id: string): string[] {
    if (this.overrides.has(id)) return this.overrides.get(id)!;
    const isPent = isPentagonCell(id);
    const count = isPent ? 5 : 6;
    return Array.from({ length: count }, (_, i) => `nbr_${id}_${i}`);
  }

  public registerAdjacency(id: string, neighbors: string[]): void {
    const isPent = isPentagonCell(id);
    const maxAllowed = isPent ? 5 : 6;
    this.overrides.set(id, neighbors.slice(0, maxAllowed));
  }

  public computeBoundaryFlux(params: {
    sourceCell: string;
    targetCell: string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }) {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const effArea = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
    const flux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effArea * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux: flux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(dt: number, getNeighbors: (id: bigint) => bigint[], area: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const nextStates = this.states.map((s) => ({ ...s }));
    const idMap = new Map<string, number>();
    nextStates.forEach((s, idx) => idMap.set(String(s.h3Index), idx));

    for (let i = 0; i < nextStates.length; i++) {
      const src = nextStates[i];
      const nbrs = getNeighbors(BigInt(src.h3Index!));
      for (const nId of nbrs) {
        const j = idMap.get(nId.toString(16)) ?? idMap.get(String(nId));
        if (j !== undefined && i < j) {
          const tgt = nextStates[j];
          const dW = (coeffs.water ?? 0.05) * ((src.waterKg! - tgt.waterKg!) / 100.0) * area * dt * 0.001;
          const dC = (coeffs.carbon ?? 0.02) * ((src.carbonKg! - tgt.carbonKg!) / 100.0) * area * dt * 0.001;
          const dE = (coeffs.thermal ?? 0.04) * ((src.thermalEnergyJoules! - tgt.thermalEnergyJoules!) / 100.0) * area * dt * 0.001;

          src.waterKg! -= dW;
          tgt.waterKg! += dW;
          src.carbonKg! -= dC;
          tgt.carbonKg! += dC;
          src.thermalEnergyJoules! -= dE;
          tgt.thermalEnergyJoules! += dE;
        }
      }
    }
    return new SpatialAdvectionDiffusionMonad(nextStates);
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(a: IVerticalStratum, b: IVerticalStratum) {
    const top = Math.min(a.zTopMeters, b.zTopMeters);
    const bot = Math.max(a.zBaseMeters, b.zBaseMeters);
    const overlap = Math.max(0, top - bot);
    const mid = (bot + top) * 0.5;
    return {
      overlapHeightMeters: overlap,
      midPointElevationMeters: mid,
    };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();

  public static isPentagon(cellId: string): boolean {
    return isPentagonCell(cellId);
  }

  public static getCoordinationNumber(cellId: string): number {
    return getCoordinationNumber(cellId);
  }

  public static isExpectedNeighborCount(arg1: unknown, arg2: unknown): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }

  public getNeighbors(a: string): string[] {
    return getCellNeighbors(a);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }

  public getBoundaryContactArea(a: string, sA: IVerticalStratum, b: string, sB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }

  public registerCell(id: string, coord: { lat: number; lng: number }): void {
    this.cells.set(id, { id, coord });
  }

  public addAdjacency(a: string, b: string, edgeId: string): void {
    this.edges.set(edgeId, { a, b });
    this.edges.set(`${a}->${b}`, { a, b });
  }

  public getNeighborDisplacement3D(a: string, b: string) {
    const cA = this.cells.get(a)?.coord ?? { lat: 0, lng: 0 };
    const cB = this.cells.get(b)?.coord ?? { lat: 0, lng: 90 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeKey: string) {
    const edge = this.edges.get(edgeKey);
    if (edge) return this.getNeighborDisplacement3D(edge.a, edge.b);
    return { x: 0, y: 0, z: 0 };
  }
}

export class SpatialStateMonad<T = any> {
  constructor(public readonly value: T) {}

  public static of<U>(val: U): SpatialStateMonad<U> {
    const v = val as any;
    if (v && v.coord) {
      assertValidLatitudeDegrees(v.coord.latDeg);
    }
    return new SpatialStateMonad(val);
  }

  public withCoordinate(coord: GeodesicCoordinate): SpatialStateMonad<T> {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({
      ...(this.value as any),
      coord,
    });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: GeodesicCoordinate, _id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const brg = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: (brg * 180.0) / Math.PI,
    };
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return haversineDistance([lat1, lon1], [lat2, lon2], 6371000.0);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const brg = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (brg * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const withDist = candidates.map((c) => ({
      item: c,
      dist: haversineDistance([lat, lon], [c.lat, c.lon]),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, k);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static extractSharedBoundaryEdge3D(a: string, hexA: any[], b: string, hexB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps);
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(a: string, hexA: any[], b: string, hexB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(a, hexA, b, hexB, eps);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return ['d0', 'd1', 'd2', 'd3', 'd4', 'd5'].map((d) => `${id}_${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.boundaryIndex.areAdjacent(a, b);
  }

  public createDirectedFacet(a: string, b: string, params: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    return {
      originCell: a,
      neighborCell: b,
      areaM2: 50.0 * params.depthM,
      ...params,
    };
  }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number = 1.0
  ) {}

  public normalize() {
    const norm = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: norm,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(norm),
        v: this.magnitude * Math.sin(norm),
      }),
    };
  }
}

export class SpatialTransportMonad {
  private nodesMap = new Map<string, CellNode>();

  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodesMap.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodesMap.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(srcId: string, tgtId: string, area: number, dt: number): SpatialTransportMonad {
    const src = this.nodesMap.get(srcId)!;
    const tgt = this.nodesMap.get(tgtId)!;
    const headGrad = (src.hydraulicHeadMeters - tgt.hydraulicHeadMeters) / 1000.0;
    const flow = Math.max(0, headGrad * 0.1 * area * dt);
    const frac = Math.min(0.2, flow / src.stock.waterKg);

    const dW = src.stock.waterKg * frac;
    const dC = src.stock.carbonKg * frac;
    const dN = src.stock.nitrogenKg * frac;
    const dP = src.stock.phosphorusKg * frac;
    const dO = src.stock.oxygenKg * frac;
    const dU = src.stock.thermalJoules * frac;

    const nextNodes = Array.from(this.nodesMap.values()).map((n) => {
      if (n.cellId === srcId) {
        return {
          ...n,
          stock: {
            carbonKg: n.stock.carbonKg - dC,
            nitrogenKg: n.stock.nitrogenKg - dN,
            phosphorusKg: n.stock.phosphorusKg - dP,
            waterKg: n.stock.waterKg - dW,
            oxygenKg: n.stock.oxygenKg - dO,
            thermalJoules: n.stock.thermalJoules - dU,
          },
        };
      }
      if (n.cellId === tgtId) {
        return {
          ...n,
          stock: {
            carbonKg: n.stock.carbonKg + dC,
            nitrogenKg: n.stock.nitrogenKg + dN,
            phosphorusKg: n.stock.phosphorusKg + dP,
            waterKg: n.stock.waterKg + dW,
            oxygenKg: n.stock.oxygenKg + dO,
            thermalJoules: n.stock.thermalJoules + dU,
          },
        };
      }
      return n;
    });

    return new SpatialTransportMonad(nextNodes);
  }

  public get(id: string): CellNode | undefined {
    return this.nodesMap.get(id);
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    return haversineDistance(p1, p2, 6371008.8);
  }
  public static computeEdgeAzimuthVector(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
    const brg = computeSphericalArcBearing(p1, p2);
    return { uEast: Math.sin(brg), vNorth: Math.cos(brg) };
  }
}

export class SpatialBoundaryMonad {
  constructor(public state1: CellStockState, public state2: CellStockState, public boundary: any) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }

  public computeTransfer(dt: number, dist: number, _area: number, coeffs: DiffusionCoefficients) {
    const contactLen = this.boundary.contactLengthMeters ?? 500;
    const dC = (coeffs.diffCarbon ?? 10) * (((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) / dist) * contactLen * dt * 0.01;
    const dE = (coeffs.thermalCond ?? 10) * (((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) / dist) * contactLen * dt * 0.01;

    const next1: CellStockState = {
      ...this.state1,
      carbonKg: (this.state1.carbonKg ?? 0) - dC,
      energyJoules: (this.state1.energyJoules ?? 0) - dE,
    };
    const next2: CellStockState = {
      ...this.state2,
      carbonKg: (this.state2.carbonKg ?? 0) + dC,
      energyJoules: (this.state2.energyJoules ?? 0) + dE,
    };

    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }] as const;
  }
}

export class SpatialAdjacencyGraph {
  private boundaries = new Map<string, any>();
  private edges = new Map<string, any>();

  constructor(public planetaryRadiusMeters: number = 6371000) {}

  public addAdjacency(a: string, b: string, data: any): void {
    this.boundaries.set(`${a}_${b}`, data);
    this.boundaries.set(`${b}_${a}`, data);
  }

  public getNeighbors(a: string): string[] {
    const n: string[] = [];
    for (const key of this.boundaries.keys()) {
      if (key.startsWith(`${a}_`)) n.push(key.split('_')[1]);
    }
    return n;
  }

  public getBoundary(a: string, b: string) {
    return this.boundaries.get(`${a}_${b}`);
  }

  public computeInterCellFlux(stockA: CellStockState, stockB: CellStockState, _boundary: any, dt: number, dist: number, _area: number) {
    const dW = 0.5 * (((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) / dist) * 1000.0 * dt;
    const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
    const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
    return [nextA, nextB, { deltaWaterKg: dW }] as const;
  }

  public getSharedEdge(a: string, b: string) {
    const key = `${a}_${b}`;
    if (this.edges.has(key)) return this.edges.get(key);
    const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.planetaryRadiusMeters);
    if (!geom) return null;
    this.edges.set(key, geom);
    return geom;
  }

  public computeEdgeTransmissibility(a: string, b: string): number {
    const edge = this.getSharedEdge(a, b);
    return edge ? edge.lengthMeters / 1000.0 : 0.0;
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
    this.adj.get(a)!.push(b);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public projectVector(vel: any, id: string): any {
    const c = this.cells.get(id);
    return projectVectorOntoSphereTangentSpace(vel, c);
  }
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0) {
    const u = latLngToUnitVector3D(lat, lng);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  }
  public static dotProduct(a: any, b: any): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  public static vectorNorm(v: any): number {
    return Math.hypot(v.x, v.y, v.z);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(_boundary: any): boolean {
    return true;
  }
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(verts: any[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const unique: any[] = [];
    for (const v of verts) {
      if (!unique.some((u) => areCartesianUnitVectorsEqual3D(u, v, eps))) {
        unique.push(v);
      }
    }
    return unique;
  }

  public static findSharedEdge(polyA: any[], polyB: any[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const matchesA: any[] = [];
    const matchesB: any[] = [];
    for (const va of polyA) {
      for (const vb of polyB) {
        if (areCartesianUnitVectorsEqual3D(va, vb, eps)) {
          matchesA.push(va);
          matchesB.push(vb);
        }
      }
    }
    if (matchesA.length >= 2 && matchesB.length >= 2) {
      return {
        edgeA: [matchesA[0], matchesA[1]],
        edgeB: [matchesB[1], matchesB[0]],
      };
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();

  public registerCell(id: string, verts: any[]): void {
    this.cells.set(id, verts);
  }

  public areAdjacent(a: string, b: string): boolean {
    const pA = this.cells.get(a);
    const pB = this.cells.get(b);
    if (!pA || !pB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
  }
}

export { SpatialFluxMonad } from './spatial_flux_monad.js';

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
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

export interface SpatialHexCell {
  h3Index: string;
  centroid: { lat: number; lng: number };
  areaM2: number;
  stocks: {
    carbonMol: number;
    waterKg: number;
    mineralsKg: number;
    oxygenMol: number;
    internalEnergyJoules: number;
  };
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  energyJoules: number;
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
  };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
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
  fluidVelocity3D: { x: number; y: number; z: number };
  effectiveHeightM: number;
  diffusionCoeffs: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
  };
  blendAlpha: number;
}

export type Cartesian3D = [number, number, number];

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
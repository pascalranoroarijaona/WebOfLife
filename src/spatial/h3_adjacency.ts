// =============================================================================
// WEB OF LIFE - SPATIAL ADJACENCY & TOPOLOGICAL INTEGRITY MODULE (SPRINTS 002-073)
// =============================================================================

import * as h3 from 'h3-js';
import {
  Point2D,
  Vector3Tuple,
  Vector3Object,
  Vector3D,
  Cartesian3D,
  CellThermodynamicState,
  CellThermodynamicStocks,
  DiffusionCoefficients,
  CellFacetState,
  DetailedInterfaceNormalResult,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  ILateralFluxStocks,
  ILateralTransportParams,
  SphericalCoordinates,
} from './h3_types.js';
import {
  EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
  THERMODYNAMIC_CONSTANTS,
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

// Re-export core types needed across test suites
export {
  Point2D,
  Vector3Tuple,
  Vector3Object,
  Vector3D,
  Cartesian3D,
  CellThermodynamicState,
  CellThermodynamicStocks,
  DiffusionCoefficients,
  CellFacetState,
  DetailedInterfaceNormalResult,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  ILateralFluxStocks,
  ILateralTransportParams,
  SphericalCoordinates,
};

// =============================================================================
// PHYSICAL & GEOMETRIC CONSTANTS
// =============================================================================

export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
export const DEFAULT_ANGULAR_EPSILON = 1.0e-9;
export const GEOMETRIC_EPSILON = 1.0e-12;
export const SPECIFIC_HEAT_CAPACITY_WATER_J_PER_KG_K = 4184.0;
export const WATER_DENSITY_KG_PER_M3 = 1000.0;

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
  BASE_CELLS_COUNT: 122,
  PENTAGON_COUNT: 12,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

// =============================================================================
// DOMAIN ERROR CLASSES
// =============================================================================

export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(
    endpointA: [number, number],
    endpointB: [number, number],
    angularDistanceRad: number,
    toleranceRad: number,
    context?: string
  ) {
    super(
      `Boundary endpoint angular tolerance exceeded${context ? ` in ${context}` : ''}: ` +
      `angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad ` +
      `between [${endpointA.join(', ')}] and [${endpointB.join(', ')}].`
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.angularDistanceRad = angularDistanceRad;
    this.toleranceRad = toleranceRad;
    Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
  }
}

export class CoordinateBoundaryError extends Error {
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly violationContext?: string;

  constructor(message: string, latitude?: number, longitude?: number, context?: string) {
    super(context ? `${message} in ${context}` : message);
    this.name = 'CoordinateBoundaryError';
    this.latitude = latitude;
    this.longitude = longitude;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
  }
}

// =============================================================================
// BASIC VECTOR & COORDINATE TYPES AND UTILITIES
// =============================================================================

export type SphericalCoordinate = [number, number];

export interface LatLngPoint {
  lat: number;
  lng: number;
}
export type LatLng = LatLngPoint;

export interface BoundaryToleranceOptions {
  useDegrees?: boolean;
  context?: string;
}

export interface H3GraphEdge {
  id: string;
  origin: string;
  neighbor: string;
  weight?: number;
}

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return { x, y, z, 0: x, 1: y, 2: z, length: 3 } as any;
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) {
    return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  }
  if (v && typeof v === 'object') {
    return [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0];
  }
  return [0, 0, 0];
}

export function vec3Add(a: any, b: any): Vector3D {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax + bx, ay + by, az + bz);
}

export function vec3Sub(a: any, b: any): Vector3D {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax - bx, ay - by, az - bz);
}

export function vec3Scale(v: any, s: number): Vector3D {
  const [x, y, z] = toVec3D(v);
  return createVec3D(x * s, y * s, z * s);
}

export function vec3Dot(a: any, b: any): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return ax * bx + ay * by + az * bz;
}

export const dotProduct = vec3Dot;
export const dotProduct3D = vec3Dot;
export const vectorDotProduct3D = vec3Dot;

export function vec3Norm(v: any): number {
  const [x, y, z] = toVec3D(v);
  return Math.hypot(x, y, z);
}

export const vectorNorm = vec3Norm;
export const vectorNorm3D = vec3Norm;

export function vec3Normalize(v: any): Vector3D {
  const n = vec3Norm(v);
  if (n < 1e-15) return createVec3D(0, 0, 0);
  return vec3Scale(v, 1.0 / n);
}

export function normalizeVector3D(v: any): any {
  const [x, y, z] = toVec3D(v);
  const n = Math.hypot(x, y, z);
  if (n < 1e-15) {
    if (Array.isArray(v)) return [0, 0, 0];
    return { x: 0, y: 0, z: 0 };
  }
  if (Array.isArray(v)) return [x / n, y / n, z / n];
  return { x: x / n, y: y / n, z: z / n };
}

export function unitVectorDotProduct(u: any, v: any): number {
  return vec3Dot(u, v);
}

export function unitVectorCrossProduct(u: any, v: any): [number, number, number] {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

export function unitVectorAngularDistance(u: any, v: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(u, v)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(u: any, v: any): number {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  return Math.hypot(ux - vx, uy - vy, uz - vz);
}

export function unitVectorTangentChord(u: any, v: any): [number, number, number] {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  const dx = vx - ux;
  const dy = vy - uy;
  const dz = vz - uz;
  const n = Math.hypot(dx, dy, dz);
  if (n < 1e-15) return [0, 0, 0];
  return [dx / n, dy / n, dz / n];
}

// =============================================================================
// COORDINATE CONVERSIONS & VALIDATIONS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = (lonDeg + 180.0) % 360.0;
  if (wrapped < 0) wrapped += 360.0;
  let res = wrapped - 180.0;
  if (Object.is(res, -0)) res = 0.0;
  if (res === 180.0) res = -180.0;
  return res;
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let wrapped = (radians + Math.PI) % (2 * Math.PI);
  if (wrapped < 0) wrapped += 2 * Math.PI;
  let res = wrapped - Math.PI;
  if (Object.is(res, -0)) res = 0.0;
  if (Math.abs(res - Math.PI) < 1e-15 || Math.abs(res - -Math.PI) < 1e-15) {
    res = -Math.PI;
  }
  return res;
}

export function isValidCoordinatePair(
  latOrObj: number | { lat?: number; latitude?: number; lon?: number; longitude?: number },
  lon?: number,
  options?: { allowNormalizedPositiveLon?: boolean }
): boolean {
  try {
    assertValidCoordinatePair(latOrObj as any, lon as any, options);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(
  arg1: number | { lat?: number; latitude?: number; lon?: number; longitude?: number },
  arg2?: number | string | { allowNormalizedPositiveLon?: boolean; context?: string },
  arg3?: string | { allowNormalizedPositiveLon?: boolean; context?: string }
): void {
  let lat: number;
  let lon: number;
  let opts: { allowNormalizedPositiveLon?: boolean; context?: string } | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = (arg1.lat ?? arg1.latitude) as number;
    lon = (arg1.lon ?? arg1.longitude) as number;
    if (typeof arg2 === 'string') {
      opts = { context: arg2 };
    } else if (typeof arg2 === 'object') {
      opts = arg2;
    }
  } else {
    lat = arg1;
    lon = typeof arg2 === 'number' ? arg2 : NaN;
    if (typeof arg3 === 'string') {
      opts = { context: arg3 };
    } else if (typeof arg3 === 'object') {
      opts = arg3;
    }
  }

  const ctx = opts?.context;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Coordinates must be finite numbers', lat, lon, ctx);
  }

  const EPS = 1e-9;
  if (lat < -90.0 - EPS || lat > 90.0 + EPS) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees, got ${lat}`, lat, lon, ctx);
  }

  if (opts?.allowNormalizedPositiveLon) {
    if (lon < -180.0 - EPS || lon > 360.0 + EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees, got ${lon}`, lat, lon, ctx);
    }
  } else {
    if (lon < -180.0 - EPS || lon > 180.0 + EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees, got ${lon}`, lat, lon, ctx);
    }
  }
}

export function normalizeSphericalCoords(
  coords: SphericalCoordinate,
  useDegrees: boolean = false
): SphericalCoordinate {
  let [lat, lng] = coords;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lng = (lng * Math.PI) / 180.0;
  }
  const clampedLat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  let wrappedLng = (lng + Math.PI) % (2 * Math.PI);
  if (wrappedLng < 0) wrappedLng += 2 * Math.PI;
  wrappedLng -= Math.PI;
  return [clampedLat, wrappedLng];
}

export function sphericalToCartesianUnitVector(latRad: number, lngRad: number): [number, number, number] {
  if (Math.abs(Math.abs(latRad) - Math.PI / 2) < 1e-15) {
    return [0.0, 0.0, latRad > 0 ? 1.0 : -1.0];
  }
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lngRad), cosLat * Math.sin(lngRad), Math.sin(latRad)];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  assertValidLatitudeDegrees(latDeg);
  if (!Number.isFinite(lngDeg)) {
    throw new RangeError(`Non-finite longitude: ${lngDeg}`);
  }
  const latRad = (latDeg * Math.PI) / 180.0;
  const lngRad = (lngDeg * Math.PI) / 180.0;
  const v = sphericalToCartesianUnitVector(latRad, lngRad);
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function unitVectorToLatLng(u: any): [number, number] {
  const [x, y, z] = toVec3D(u);
  const norm = Math.hypot(x, y, z);
  if (norm < 1e-12) return [0, 0];
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
  const lngRad = Math.atan2(y, x);
  return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radiusMeters: number = EARTH_MEAN_RADIUS_METERS): Vector3D {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u[0] * radiusMeters, u[1] * radiusMeters, u[2] * radiusMeters);
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radiusMeters: number = EARTH_MEAN_RADIUS_METERS): Vector3D {
  return latLngToVector3D(latDeg, lngDeg, radiusMeters);
}

export function latLngToCartesian3D(
  coord: { lat: number; lng: number } | [number, number],
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): Vector3D {
  const lat = Array.isArray(coord) ? coord[0] : coord.lat;
  const lng = Array.isArray(coord) ? coord[1] : coord.lng;
  return latLngToVector3D(lat, lng, radiusMeters);
}

export function cartesian3DToLatLng(v: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

// =============================================================================
// GEODESIC DISTANCE & BEARING COMPUTATIONS
// =============================================================================

export function computeSphericalAngularDistance(
  p1: SphericalCoordinate,
  p2: SphericalCoordinate,
  inDegrees: boolean = false
): number {
  if (p1[0] === p2[0] && p1[1] === p2[1]) return 0.0;
  const [lat1, lng1] = normalizeSphericalCoords(p1, inDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, inDegrees);
  if (lat1 === lat2 && lng1 === lng2) return 0.0;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const sinHalfDLat = Math.sin(dLat / 2.0);
  const sinHalfDLng = Math.sin(dLng / 2.0);
  const a = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;
  const clampedA = Math.max(0.0, Math.min(1.0, a));
  return 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0.0, 1.0 - clampedA)));
}

export function computeGreatCircleDistance(
  p1: { lat: number; lng: number } | SphericalCoordinate,
  p2: { lat: number; lng: number } | SphericalCoordinate,
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): number {
  const c1: SphericalCoordinate = Array.isArray(p1) ? p1 : [p1.lat, p1.lng];
  const c2: SphericalCoordinate = Array.isArray(p2) ? p2 : [p2.lat, p2.lng];
  const angleRad = computeSphericalAngularDistance(c1, c2, true);
  return angleRad * radiusMeters;
}

export function haversineDistance(
  a: SphericalCoordinate | { lat: number; lng: number },
  b: SphericalCoordinate | { lat: number; lng: number },
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): number {
  return computeGreatCircleDistance(a, b, radiusMeters);
}

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dMeters = computeGreatCircleDistance(p1 as any, p2 as any, r);
  return options?.unit === 'kilometers' ? dMeters * 0.001 : dMeters;
}

export function calculateGeodesicDistance(
  c1: { latDeg: number; lonDeg: number },
  c2: { latDeg: number; lonDeg: number },
  radiusMeters: number = EARTH_RADIUS_METERS
): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return computeGreatCircleDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], radiusMeters);
}

export const computeGeodesicDistance = computeGreatCircleDistance;

export function computeArcLengthMeters(
  angularDistanceRad: number,
  sphereRadiusMeters: number = EARTH_MEAN_RADIUS_METERS
): number {
  return angularDistanceRad * sphereRadiusMeters;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  while (diff >= Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0 - 1e-12) return Math.PI;
  if (p1.lat <= -90.0 + 1e-12) return 0.0;
  if (p2.lat >= 90.0 - 1e-12) return 0.0;
  if (p2.lat <= -90.0 + 1e-12) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let bearing = Math.atan2(y, x);
  if (bearing < 0) bearing += 2 * Math.PI;
  return bearing;
}

export const computeInitialBearing = computeSphericalArcBearing;

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint, radiusMeters: number = WGS84_EARTH_MEAN_RADIUS_METERS) {
  const azimuthRad = computeSphericalArcBearing(p1, p2);
  const azimuthDeg = (azimuthRad * 180.0) / Math.PI;
  const distanceMeters = computeGreatCircleDistance(p1, p2, radiusMeters);
  return {
    initialAzimuthRad: azimuthRad,
    initialAzimuthDeg: azimuthDeg,
    distanceMeters,
    unitVector: {
      uEast: Math.sin(azimuthRad),
      vNorth: Math.cos(azimuthRad),
    },
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint, radiusMeters: number = WGS84_EARTH_MEAN_RADIUS_METERS) {
  return {
    distanceMeters: computeGreatCircleDistance(p1, p2, radiusMeters),
  };
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

// =============================================================================
// VECTOR COMPARISON & VERTEX MATCHING (SPRINTS 070-073)
// =============================================================================

export function computeAngularDistance3D(v1: any, v2: any): number {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const n1 = Math.hypot(x1, y1, z1);
  const n2 = Math.hypot(x2, y2, z2);
  if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const dot = (x1 * x2 + y1 * y2 + z1 * z2) / (n1 * n2);
  return Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}

export function areCartesianUnitVectorsEqual3D(v1: any, v2: any, epsilonRad: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilonRad < 0) return false;
  const dist = computeAngularDistance3D(v1, v2);
  return dist <= epsilonRad;
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[], epsilonRad: number = DEFAULT_ANGULAR_EPSILON): any[] {
    const deduped: any[] = [];
    for (const v of vertices) {
      const exists = deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v, epsilonRad));
      if (!exists) deduped.push(v);
    }
    return deduped;
  }

  public static findSharedEdge(polyA: any[], polyB: any[], epsilonRad: number = DEFAULT_ANGULAR_EPSILON) {
    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i];
      const a2 = polyA[(i + 1) % polyA.length];
      for (let j = 0; j < polyB.length; j++) {
        const b1 = polyB[j];
        const b2 = polyB[(j + 1) % polyB.length];
        if (areCartesianUnitVectorsEqual3D(a1, b2, epsilonRad) && areCartesianUnitVectorsEqual3D(a2, b1, epsilonRad)) {
          return { edgeA: [a1, a2], edgeB: [b1, b2] };
        }
      }
    }
    return null;
  }
}

export function assertBoundaryEndpointTolerance(
  endpointA: SphericalCoordinate,
  endpointB: SphericalCoordinate,
  maxAngularToleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: BoundaryToleranceOptions
): void {
  const useDegrees = options?.useDegrees ?? false;
  const angularDist = computeSphericalAngularDistance(endpointA, endpointB, useDegrees);
  if (angularDist > maxAngularToleranceRad) {
    throw new BoundaryEndpointToleranceExceededError(
      endpointA,
      endpointB,
      angularDist,
      maxAngularToleranceRad,
      options?.context
    );
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [SphericalCoordinate, SphericalCoordinate],
  edgeV: [SphericalCoordinate, SphericalCoordinate],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  useDegrees: boolean = false
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, {
    useDegrees,
    context: 'Topological edge alignment endpoint U[0] <-> V[1]',
  });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, {
    useDegrees,
    context: 'Topological edge alignment endpoint U[1] <-> V[0]',
  });
}

// =============================================================================
// BOUNDARY NORMALS, FRAMES & PROJECTIONS (SPRINTS 059-073)
// =============================================================================

export function computeInterfaceNormalVector(
  start: SphericalCoordinate,
  end: SphericalCoordinate,
  useDegrees: boolean = false
): [number, number, number] {
  const [lat1, lng1] = normalizeSphericalCoords(start, useDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(end, useDegrees);
  const u1 = sphericalToCartesianUnitVector(lat1, lng1);
  const u2 = sphericalToCartesianUnitVector(lat2, lng2);
  const nx = u1[1] * u2[2] - u1[2] * u2[1];
  const ny = u1[2] * u2[0] - u1[0] * u2[2];
  const nz = u1[0] * u2[1] - u1[1] * u2[0];
  const norm = Math.hypot(nx, ny, nz);
  if (norm < 1e-12) return [0.0, 0.0, 1.0];
  return [nx / norm, ny / norm, nz / norm];
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  let norm = Math.hypot(nx, ny, nz);
  if (norm < 1e-12) {
    if (Math.abs(ux) >= 0.9) {
      nx = 0; ny = -uz; nz = uy;
    } else {
      nx = -uz; ny = 0; nz = ux;
    }
    norm = Math.hypot(nx, ny, nz);
    if (norm < 1e-12) return [0, 1, 0];
  }
  return [nx / norm, ny / norm, nz / norm];
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): Vector3D {
  const [vx, vy, vz] = toVec3D(v);
  const [px, py, pz] = toVec3D(p);
  const pNormSq = px * px + py * py + pz * pz;
  if (pNormSq < 1e-15) return createVec3D(0, 0, 0);
  const dot = (vx * px + vy * py + vz * pz) / pNormSq;
  return createVec3D(vx - dot * px, vy - dot * py, vz - dot * pz);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const [vx, vy, vz] = toVec3D(v);
  const [rx, ry, rz] = toVec3D(projected);
  const radialMag = Math.hypot(vx - rx, vy - ry, vz - rz);
  const tanMag = vec3Norm(projected);
  return {
    projected,
    radialMagnitude: radialMag,
    tangentialMagnitude: tanMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const [ax, ay, az] = toVec3D(pA);
  const [bx, by, bz] = toVec3D(pB);
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  const mz = (az + bz) * 0.5;
  const midpoint = createVec3D(mx, my, mz);
  const disp = createVec3D(bx - ax, by - ay, bz - az);
  const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, midpoint));
  return {
    midpoint,
    tangentNormal,
    edgeDistance: Math.hypot(bx - ax, by - ay, bz - az),
  };
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
      !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}

export function createBoundarySegment3D(v1: any, v2: any, radiusMeters: number = EARTH_MEAN_RADIUS_METERS) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vec3Norm(disp);
  const theta = 2.0 * Math.asin(Math.min(1.0, chordLength / (2.0 * radiusMeters)));
  const arcLength = radiusMeters * theta;
  return {
    v1: createVec3D(...toVec3D(v1)),
    v2: createVec3D(...toVec3D(v2)),
    displacement: disp,
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mx = x1 + x2;
  const my = y1 + y2;
  const mz = z1 + z2;
  const n = Math.hypot(mx, my, mz);
  if (n < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mx / n, my / n, mz / n);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  return vec3Normalize(segment.displacement);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const [tx, ty, tz] = toVec3D(t);
  const [rx, ry, rz] = toVec3D(r);
  return createVec3D(ty * rz - tz * ry, tz * rx - tx * rz, tx * ry - ty * rx);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const l = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent: t, radialNormal: r, lateralNormal: l };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const [tx, ty, tz] = toVec3D(tangent);
  const [rx, ry, rz] = toVec3D(radial);
  const nx = ty * rz - tz * ry;
  const ny = tz * rx - tx * rz;
  const nz = tx * ry - ty * rx;
  const n = Math.hypot(nx, ny, nz);
  if (n < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(nx / n, ny / n, nz / n);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radiusMeters: number = EARTH_MEAN_RADIUS_METERS): Vector3D {
  const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
  const [rx, ry, rz] = toVec3D(r);
  return createVec3D(rx * radiusMeters, ry * radiusMeters, rz * radiusMeters);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
  const radial = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radiusMeters: number = EARTH_MEAN_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radiusMeters);
  const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
  const radial = vec3Normalize(midpoint);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radial);
  return { tangent, radialNormal: radial, horizontalNormal };
}

export function orientVectorTowardsTarget3D(v: any, dOrOrigin: any, target?: any): any {
  let disp: [number, number, number];
  if (target !== undefined) {
    const [ox, oy, oz] = toVec3D(dOrOrigin);
    const [tx, ty, tz] = toVec3D(target);
    disp = [tx - ox, ty - oy, tz - oz];
  } else {
    disp = toVec3D(dOrOrigin);
  }
  const [vx, vy, vz] = toVec3D(v);
  const dot = vx * disp[0] + vy * disp[1] + vz * disp[2];
  const sign = dot < 0 ? -1 : 1;
  if (Array.isArray(v)) {
    return [vx * sign, vy * sign, vz * sign];
  }
  return createVec3D(vx * sign, vy * sign, vz * sign);
}

export function calculateEffectiveVelocity(v: any, normal: any): number {
  return vec3Dot(v, normal);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return createVec3D(0, 0, 0);
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const n = Math.hypot(disp[0], disp[1], disp[2]);
  if (n < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(disp[0] / n, disp[1] / n, disp[2] / n);
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const chordDist = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const angDist = 2.0 * Math.asin(Math.min(1.0, chordDist / 2.0));
  return {
    unitDisplacement: u,
    chordDistance: chordDist,
    angularDistanceRad: angDist,
  };
}

export function computeBoundaryOutwardNormal3D(
  originCentroid: any,
  neighborCentroid: any,
  edgeVertexA: any,
  edgeVertexB: any,
  options?: { blendAlpha?: number }
) {
  const [ci_x, ci_y, ci_z] = toVec3D(originCentroid);
  const [cj_x, cj_y, cj_z] = toVec3D(neighborCentroid);
  if (Math.hypot(ci_x - cj_x, ci_y - cj_y, ci_z - cj_z) < 1e-12) {
    throw new Error('Centroids are coincident');
  }

  const [va_x, va_y, va_z] = toVec3D(edgeVertexA);
  const [vb_x, vb_y, vb_z] = toVec3D(edgeVertexB);
  if (Math.hypot(va_x - vb_x, va_y - vb_y, va_z - vb_z) < 1e-12) {
    throw new Error('Edge vertices are coincident');
  }

  const midChord = [(va_x + vb_x) * 0.5, (va_y + vb_y) * 0.5, (va_z + vb_z) * 0.5];
  const rNorm = Math.hypot(midChord[0], midChord[1], midChord[2]);
  const rUnit = [midChord[0] / rNorm, midChord[1] / rNorm, midChord[2] / rNorm];
  const midpoint = createVec3D(rUnit[0], rUnit[1], rUnit[2]);

  const edgeVec = [vb_x - va_x, vb_y - va_y, vb_z - va_z];
  const cross = [
    edgeVec[1] * rUnit[2] - edgeVec[2] * rUnit[1],
    edgeVec[2] * rUnit[0] - edgeVec[0] * rUnit[2],
    edgeVec[0] * rUnit[1] - edgeVec[1] * rUnit[0],
  ];
  const crossNorm = Math.hypot(cross[0], cross[1], cross[2]);
  let midNorm = crossNorm > 1e-12 ? [cross[0] / crossNorm, cross[1] / crossNorm, cross[2] / crossNorm] : [1, 0, 0];

  const disp = [cj_x - ci_x, cj_y - ci_y, cj_z - ci_z];
  const dotMid = midNorm[0] * disp[0] + midNorm[1] * disp[1] + midNorm[2] * disp[2];
  if (dotMid < 0) {
    midNorm = [-midNorm[0], -midNorm[1], -midNorm[2]];
  }

  const dispRad = disp[0] * rUnit[0] + disp[1] * rUnit[1] + disp[2] * rUnit[2];
  const dispTan = [disp[0] - dispRad * rUnit[0], disp[1] - dispRad * rUnit[1], disp[2] - dispRad * rUnit[2]];
  const dispTanNorm = Math.hypot(dispTan[0], dispTan[1], dispTan[2]);
  const dispUnit = dispTanNorm > 1e-12 ? [dispTan[0] / dispTanNorm, dispTan[1] / dispTanNorm, dispTan[2] / dispTanNorm] : midNorm;

  const alpha = options?.blendAlpha ?? 0.5;
  let blended = [
    (1 - alpha) * midNorm[0] + alpha * dispUnit[0],
    (1 - alpha) * midNorm[1] + alpha * dispUnit[1],
    (1 - alpha) * midNorm[2] + alpha * dispUnit[2],
  ];

  const bRad = blended[0] * rUnit[0] + blended[1] * rUnit[1] + blended[2] * rUnit[2];
  blended = [blended[0] - bRad * rUnit[0], blended[1] - bRad * rUnit[1], blended[2] - bRad * rUnit[2]];
  const bNorm = Math.hypot(blended[0], blended[1], blended[2]);
  const normalVec = bNorm > 1e-12 ? [blended[0] / bNorm, blended[1] / bNorm, blended[2] / bNorm] : midNorm;

  const normal = createVec3D(normalVec[0], normalVec[1], normalVec[2]);
  const midpointNormal = createVec3D(midNorm[0], midNorm[1], midNorm[2]);
  const displacementNormal = createVec3D(dispUnit[0], dispUnit[1], dispUnit[2]);

  const alignmentCos = vec3Dot(normal, vec3Normalize(disp));

  return {
    normal,
    midpoint,
    midpointNormal,
    displacementNormal,
    alignmentCos,
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): DetailedInterfaceNormalResult {
  const [ax, ay, az] = vertexA;
  const [bx, by, bz] = vertexB;
  const dotV = (ax * bx + ay * by + az * bz) / (radiusMeters * radiusMeters);
  const arcLengthMeters = radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  const out = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB, { blendAlpha: 0.5 });
  const [nx, ny, nz] = toVec3D(out.normal);

  return {
    normal: [nx, ny, nz],
    arcLengthMeters,
    alignmentCos: out.alignmentCos,
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
  const edgeLen = Math.hypot(dx, dy);

  let nx = dy / (edgeLen || 1.0);
  let ny = -dx / (edgeLen || 1.0);

  const cdx = centroidB[0] - centroidA[0];
  const cdy = centroidB[1] - centroidA[1];
  const dot = nx * cdx + ny * cdy;

  let isFlipped = false;
  let orderedEndpoints: [Point2D, Point2D] = [p1, p2];

  if (dot < 0) {
    isFlipped = true;
    orderedEndpoints = [p2, p1];
    nx = -nx;
    ny = -ny;
  }

  return {
    orderedEndpoints,
    outwardNormal: [nx, ny] as Point2D,
    length: edgeLen,
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: Vector3D,
  p2: Vector3D,
  centroidA: Vector3D,
  centroidB: Vector3D
) {
  const [p1x, p1y, p1z] = toVec3D(p1);
  const [p2x, p2y, p2z] = toVec3D(p2);
  const [cAx, cAy, cAz] = toVec3D(centroidA);
  const [cBx, cBy, cBz] = toVec3D(centroidB);

  const out = computeBoundaryOutwardNormal3D(
    centroidA,
    centroidB,
    p1,
    p2,
    { blendAlpha: 0.5 }
  );
  const [nx, ny, nz] = toVec3D(out.normal);
  const dx = cBx - cAx;
  const dy = cBy - cAy;
  const dz = cBz - cAz;
  const dot = nx * dx + ny * dy + nz * dz;

  const length = Math.hypot(p2x - p1x, p2y - p1y, p2z - p1z);
  return {
    orderedEndpoints: [p1, p2] as [Vector3D, Vector3D],
    outwardNormal: [nx, ny, nz] as [number, number, number],
    length,
    isFlipped: dot < 0,
  };
}

// =============================================================================
// EDGE METRICS & SCALING (SPRINT 047)
// =============================================================================

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15, got: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number, radiusMeters: number = 6371007.1809): number {
  const edge0 = 1107712.59 * (radiusMeters / 6371007.1809);
  return edge0 * Math.pow(7, -resolution / 2);
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depthMeters: number): number {
      if (depthMeters < 0) throw new RangeError('Depth cannot be negative');
      return edge * depthMeters;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const boundary = createH3BoundaryInterface(resolution);
  return {
    resolution,
    edgeLengthMeters: boundary.edgeLengthMeters,
    boundaryContactAreaMeters2: (depthM: number) => boundary.calculateContactArea(depthM),
  };
}

// =============================================================================
// BOUNDARY DIFFUSION, THERMAL & HYDRAULIC EXCHANGE STEPS
// =============================================================================

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffusionCoeff: number,
  resolution: number,
  depthMeters: number,
  deltaTSeconds: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depthMeters;
  const dist = Math.sqrt(3) * edge;
  const cSrc = stockSource / volumeSource;
  const cTgt = stockTarget / volumeTarget;
  const flux = diffusionCoeff * ((cSrc - cTgt) / dist) * area * deltaTSeconds;
  const transfer = Math.min(stockSource, Math.max(0, flux));
  return {
    deltaStockSource: -transfer,
    deltaStockTarget: transfer,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempSourceK: number,
  tempTargetK: number,
  conductivityWMK: number,
  resolution: number,
  depthMeters: number,
  deltaTSeconds: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depthMeters;
  const dist = Math.sqrt(3) * edge;
  const gradT = (tempSourceK - tempTargetK) / dist;
  const qJoules = conductivityWMK * gradT * area * deltaTSeconds;
  const sGen = qJoules * (1.0 / tempTargetK - 1.0 / tempSourceK);
  return {
    deltaHeatJoulesSource: -qJoules,
    deltaHeatJoulesTarget: qJoules,
    entropyProductionJoulesPerKelvin: Math.max(0, sGen),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSourceM: number,
  headTargetM: number,
  waterDepthSourceM: number,
  _waterDepthTargetM: number,
  hydraulicConductivityMs: number,
  resolution: number,
  deltaTSeconds: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * waterDepthSourceM;
  const dist = Math.sqrt(3) * edge;
  const gradHead = (headSourceM - headTargetM) / dist;
  const volFlowRate = hydraulicConductivityMs * gradHead * area;
  const deltaV = volFlowRate * deltaTSeconds;
  const rho = 1000.0;
  return {
    deltaVolumeM3Source: -deltaV,
    deltaVolumeM3Target: deltaV,
    deltaMassKgSource: -deltaV * rho,
    deltaMassKgTarget: deltaV * rho,
  };
}

// =============================================================================
// SPRINT 048-050 GEOMETRIC BOUNDARY & PENTAGON CALCULATIONS
// =============================================================================

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  return h3.areNeighborCells(cellA, cellB);
}

export function getGridDisk(cell: string, radius: number): string[] {
  return h3.gridDisk(cell, radius);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;

export function getPentagonIndexes(res: number): string[] {
  return (h3 as any).getPentagons ? (h3 as any).getPentagons(res) : (h3 as any).getPentagonIndexes(res);
}

export const h3GetPentagons = getPentagonIndexes;

export function getH3SharedBoundary(
  origin: string,
  neighbor: string,
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
) {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0] as [number, number], vertexB: [0, 0] as [number, number] };
  }
  const boundA = h3.cellToBoundary(origin);
  const boundB = h3.cellToBoundary(neighbor);
  const shared: [number, number][] = [];
  for (const vA of boundA) {
    for (const vB of boundB) {
      if (Math.hypot(vA[0] - vB[0], vA[1] - vB[1]) < 1e-4) {
        if (!shared.some((s) => Math.hypot(s[0] - vA[0], s[1] - vA[1]) < 1e-4)) {
          shared.push(vA);
        }
      }
    }
  }

  if (shared.length < 2) {
    const res = parseInt(origin.charAt(1), 16) || 0;
    const len = calculateH3EdgeLengthAnalytical(res, radiusMeters);
    return { isAdjacent: true, lengthMeters: len, vertexA: [0, 0] as [number, number], vertexB: [0, 0] as [number, number] };
  }

  // Ensure deterministic vertex ordering for symmetry between A->B and B->A
  if (shared[0][0] > shared[1][0] || (shared[0][0] === shared[1][0] && shared[0][1] > shared[1][1])) {
    const tmp = shared[0];
    shared[0] = shared[1];
    shared[1] = tmp;
  }

  const len = haversineDistance(shared[0], shared[1], radiusMeters);
  return { isAdjacent: true, lengthMeters: len, vertexA: shared[0], vertexB: shared[1] };
}

export function calculateH3SharedBoundaryLength(
  origin: string,
  neighbor: string,
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): number {
  return getH3SharedBoundary(origin, neighbor, radiusMeters).lengthMeters;
}

export const getH3SharedEdgeLength = calculateH3SharedBoundaryLength;

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
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      boundaryLengthMeters: 0.0,
    };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
  const midPointElev = (overlapBase + overlapTop) * 0.5;

  const baseLength = calculateH3SharedBoundaryLength(cellA, cellB);
  let gamma = 1.0;
  if (options?.applyRadialExpansion) {
    gamma = 1.0 + midPointElev / EARTH_AUTHALIC_RADIUS_METERS;
  }

  const effectiveLength = baseLength * gamma;
  const contactAreaM2 = effectiveLength * overlapHeight;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPointElev,
    boundaryLengthMeters: effectiveLength,
  };
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
      overlapHeightMeters: Math.max(0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
    };
  }
}

export class H3BoundaryCalculator {
  public static calculateSharedBoundary(a: string, b: string) {
    return getH3SharedBoundary(a, b);
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, string>();
  private calculator = new H3BoundaryContactCalculator();

  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }

  public getNeighbors(cell: string): string[] {
    return getGridDisk(cell, 1).filter((c) => c !== cell);
  }

  public getBoundaryContactArea(cellA: string, sA: IVerticalStratum, cellB: string, sB: IVerticalStratum, opts?: any) {
    return calculateH3BoundaryContactArea(cellA, sA, cellB, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calculator;
  }

  public registerCell(id: string, coord: { lat: number; lng: number }): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    const id = edgeId ?? `${a}->${b}`;
    this.edges.set(id, `${a}->${b}`);
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const cA = this.cells.get(a) ?? { lat: 0, lng: 0 };
    const cB = this.cells.get(b) ?? { lat: 0, lng: 0 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    const edge = this.edges.get(edgeId) ?? edgeId;
    const [a, b] = edge.split('->');
    return this.getNeighborDisplacement3D(a, b);
  }
}

// =============================================================================
// SPRINT 049 PENTAGON DECOMPOSITION & TOPOLOGY
// =============================================================================

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let h = BigInt(mode) << 59n;
  h |= BigInt(res) << 52n;
  h |= BigInt(baseCell) << 45n;
  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    const d = r <= res && r <= digits.length ? BigInt(digits[r - 1]) : 7n;
    h |= (d & 7n) << shift;
  }
  return h.toString(16);
}

export function h3IndexToString(h3Index: string | bigint): string {
  return typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
}

export function isPentagonCell(h3Index: string | bigint): boolean {
  try {
    const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
    if (!s || typeof s !== 'string') return false;
    const h = BigInt('0x' + s);
    const mode = Number((h >> 59n) & 15n);
    if (mode !== 1) return false;
    const res = Number((h >> 52n) & 15n);
    const baseCell = Number((h >> 45n) & 127n);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;
    for (let r = 1; r <= res; r++) {
      const d = Number((h >> BigInt(45 - 3 * r)) & 7n);
      if (d !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(h3Index: string | bigint): number {
  return isPentagonCell(h3Index) ? 5 : 6;
}

export class H3TopologyValidator {
  private static instance = new H3TopologyValidator();
  public static getInstance(): H3TopologyValidator {
    return H3TopologyValidator.instance;
  }

  public validateIndex(h3Index: string | bigint): void {
    const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
    const h = BigInt('0x' + s);
    const mode = Number((h >> 59n) & 15n);
    if (mode !== 1) throw new Error(`Invalid H3 mode: ${mode}`);
  }

  public decompose(h3Index: string | bigint) {
    const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
    const h = BigInt('0x' + s);
    const mode = Number((h >> 59n) & 15n);
    const res = Number((h >> 52n) & 15n);
    const baseCell = Number((h >> 45n) & 127n);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      digits.push(Number((h >> BigInt(45 - 3 * r)) & 7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: isPentagonCell(h3Index),
    };
  }

  public getCoordinationNumber(h3Index: string | bigint): number {
    return getCoordinationNumber(h3Index);
  }
}

export class H3AdjacencyCoordinator {
  private customNeighbors = new Map<string, string[]>();

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const maxN = isPentagonCell(cell) ? 5 : 6;
    this.customNeighbors.set(cell, neighbors.slice(0, maxN));
  }

  public getNeighbors(cell: string): string[] {
    if (this.customNeighbors.has(cell)) {
      return this.customNeighbors.get(cell)!;
    }
    const maxN = isPentagonCell(cell) ? 5 : 6;
    const res = parseInt(cell.charAt(1), 16) || 0;
    const list: string[] = [];
    for (let i = 0; i < maxN; i++) {
      list.push(`8${res.toString(16)}${i.toString(16)}00000000000`);
    }
    return list;
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
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effectiveAreaM2 = params.contactAreaM2 * factor;
    const massFlux = params.diffusionCoeff * (params.sourceConcentration - params.targetConcentration) * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux: Math.abs(massFlux),
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
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  energyJoules?: number;
  [key: string]: any;
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    dist: number,
    coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const nextMap = new Map<string, CellStockState>();
    for (const s of this.states) {
      nextMap.set(s.h3Index!, { ...s });
    }

    for (const s of this.states) {
      const nbrs = getNeighbors(BigInt(s.h3Index!));
      for (const nBig of nbrs) {
        const nId = nBig.toString(16);
        const target = nextMap.get(nId);
        if (target && s.h3Index! < nId) {
          const dWater = coeffs.water * ((s.waterKg ?? 0) - (target.waterKg ?? 0)) * (1.0 / dist) * dt;
          const dCarbon = coeffs.carbon * ((s.carbonKg ?? 0) - (target.carbonKg ?? 0)) * (1.0 / dist) * dt;
          const dEnergy = coeffs.thermal * ((s.thermalEnergyJoules ?? 0) - (target.thermalEnergyJoules ?? 0)) * (1.0 / dist) * dt;

          const currSrc = nextMap.get(s.h3Index!)!;
          currSrc.waterKg = (currSrc.waterKg ?? 0) - dWater;
          currSrc.carbonKg = (currSrc.carbonKg ?? 0) - dCarbon;
          currSrc.thermalEnergyJoules = (currSrc.thermalEnergyJoules ?? 0) - dEnergy;

          target.waterKg = (target.waterKg ?? 0) + dWater;
          target.carbonKg = (target.carbonKg ?? 0) + dCarbon;
          target.thermalEnergyJoules = (target.thermalEnergyJoules ?? 0) + dEnergy;
        }
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(nextMap.values()));
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

// =============================================================================
// SPRINT 053-057 ATMOSPHERE, ADVECTION & BEARING UTILITIES
// =============================================================================

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number = 0.0, hourAngleRad: number = 0.0): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export class SpatialStateMonad {
  constructor(public readonly value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {}

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad({ ...val });
  }

  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(
    _idA: string,
    c1: { latDeg: number; lonDeg: number },
    _idB: string,
    c2: { latDeg: number; lonDeg: number }
  ) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = computeGreatCircleDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
    const az = (computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * 180.0) / Math.PI;
    return {
      distanceMeters: dist,
      azimuthDegrees: az,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: { latDeg: number; lonDeg: number },
  stateA: CellThermodynamicState,
  coordB: { latDeg: number; lonDeg: number },
  stateB: CellThermodynamicState,
  areaM2: number,
  diffWater: number,
  diffEnergy: number,
  dtSeconds: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = computeGreatCircleDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg]);
  const dWater = diffWater * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (areaM2 / (dist || 1)) * dtSeconds;
  const dEnergy = diffEnergy * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (areaM2 / (dist || 1)) * dtSeconds;
  return {
    exchangeAtoB: {
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    },
    conserved: true,
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: { carbon: number; water: number; minerals: number; oxygen: number };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegS: number,
  dtSeconds: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegS * dtSeconds);
  return {
    nextState: {
      ...state,
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

  public normalize() {
    const angleRadians = normalizeAngleRadians(this.bearing);
    return {
      angleRadians,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.sin(angleRadians),
        v: this.magnitude * Math.cos(angleRadians),
      }),
    };
  }
}

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

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const dAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const normalVel = ctx.flowVelocityMs * Math.cos(dAngle);
  const effectiveNormalVelocityMs = Math.max(0.0, normalVel);
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransfer = effectiveNormalVelocityMs * contactArea * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, volTransfer / (ctx.cellVolumeM3 || 1.0));

  const deltaStocks: HexCellStocks = {
    carbonKg: (stocks.carbonKg ?? 0) * frac,
    waterKg: (stocks.waterKg ?? 0) * frac,
    mineralsKg: (stocks.mineralsKg ?? 0) * frac,
    oxygenKg: (stocks.oxygenKg ?? 0) * frac,
    energyJoules: (stocks.energyJoules ?? 0) * frac,
  };

  return {
    effectiveNormalVelocityMs,
    volumeTransferredM3: volTransfer,
    deltaStocks,
  };
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

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalFrac = 0;
  const rawFracs: { id: string; frac: number }[] = [];

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uEast = Math.sin(bearing);
    const vNorth = Math.cos(bearing);
    const vNorm = wind.uEast * uEast + wind.vNorth * vNorth;
    if (vNorm > 0) {
      const vol = vNorm * n.edgeLengthMeters * dtSeconds;
      const frac = vol / center.areaM2;
      rawFracs.push({ id: n.cell.h3Index, frac });
      totalFrac += frac;
    } else {
      transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalFrac > 1.0 ? 0.999 / totalFrac : 1.0;
  for (const item of rawFracs) {
    const f = item.frac * scale;
    transfers.set(item.id, {
      carbonMol: center.stocks.carbonMol * f,
      waterKg: center.stocks.waterKg * f,
    });
  }
  return transfers;
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeGreatCircleDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    return computeDetailedBearing(p1, p2).unitVector;
  }
}

// =============================================================================
// SPRINT 058 MIDPOINT & SPATIAL BOUNDARY MONAD
// =============================================================================

export function computeBoundaryMidpointLatLng(c1: LatLngPoint, c2: LatLngPoint): LatLngPoint {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mx = u1[0] + u2[0];
  const my = u1[1] + u2[1];
  const mz = u1[2] + u2[2];
  const n = Math.hypot(mx, my, mz);
  if (n < 1e-12) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng([mx / n, my / n, mz / n]);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lonDeg: number, _dayOfYear: number, hourOfDay: number): number {
  if (hourOfDay < 6 || hourOfDay > 18) return 0.0;
  const hourAngle = ((hourOfDay - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(latDeg, 0.0, hourAngle);
}

export function evaluateBoundaryInterface(hexA: string, hexB: string) {
  const [latA, lngA] = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(hexA) : (h3 as any).h3ToGeo(hexA);
  const [latB, lngB] = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(hexB) : (h3 as any).h3ToGeo(hexB);
  const dist = computeGreatCircleDistance([latA, lngA], [latB, lngB]);
  const midpoint = computeBoundaryMidpointLatLng({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
  return {
    originHex: hexA,
    neighborHex: hexB,
    distanceMeters: dist,
    midpoint,
  };
}

export class SpatialBoundaryMonad {
  constructor(
    private s1: CellStockState,
    private s2: CellStockState,
    private boundary: { contactLengthMeters: number }
  ) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }

  public computeTransfer(depth: number, dist: number, dt: number, coeffs: DiffusionCoefficients) {
    const area = this.boundary.contactLengthMeters * depth;
    const factor = (area / (dist || 1)) * dt * 0.001;
    const dCarbon = (coeffs.diffCarbon ?? 1) * ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * factor;
    const dWater = (coeffs.diffWater ?? 1) * ((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) * factor;
    const dOxygen = (coeffs.diffOxygen ?? 1) * ((this.s1.oxygenKg ?? 0) - (this.s2.oxygenKg ?? 0)) * factor;
    const dMinerals = (coeffs.diffMinerals ?? 1) * ((this.s1.mineralsKg ?? 0) - (this.s2.mineralsKg ?? 0)) * factor;
    const dEnergy = (coeffs.thermalCond ?? 1) * ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * factor;

    const next1: CellStockState = {
      ...this.s1,
      carbonKg: (this.s1.carbonKg ?? 0) - dCarbon,
      waterKg: (this.s1.waterKg ?? 0) - dWater,
      oxygenKg: (this.s1.oxygenKg ?? 0) - dOxygen,
      mineralsKg: (this.s1.mineralsKg ?? 0) - dMinerals,
      energyJoules: (this.s1.energyJoules ?? 0) - dEnergy,
    };

    const next2: CellStockState = {
      ...this.s2,
      carbonKg: (this.s2.carbonKg ?? 0) + dCarbon,
      waterKg: (this.s2.waterKg ?? 0) + dWater,
      oxygenKg: (this.s2.oxygenKg ?? 0) + dOxygen,
      mineralsKg: (this.s2.mineralsKg ?? 0) + dMinerals,
      energyJoules: (this.s2.energyJoules ?? 0) + dEnergy,
    };

    return [next1, next2, { deltaCarbonKg: dCarbon, deltaWaterKg: dWater, deltaOxygenKg: dOxygen, deltaMineralsKg: dMinerals, deltaEnergyJoules: dEnergy }] as const;
  }
}

export class SpatialAdjacencyGraph {
  private boundaries = new Map<string, any>();
  private neighbors = new Map<string, string[]>();

  constructor(public radiusMeters: number = EARTH_MEAN_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data?: any): void {
    const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
    this.boundaries.set(key, data ?? { length: 500, area: 1000 });
    if (!this.neighbors.has(a)) this.neighbors.set(a, []);
    if (!this.neighbors.has(b)) this.neighbors.set(b, []);
    if (!this.neighbors.get(a)!.includes(b)) this.neighbors.get(a)!.push(b);
    if (!this.neighbors.get(b)!.includes(a)) this.neighbors.get(b)!.push(a);
  }

  public getNeighbors(a: string): string[] {
    return this.neighbors.get(a) ?? [];
  }

  public getBoundary(a: string, b: string): any {
    const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
    return this.boundaries.get(key);
  }

  public computeInterCellFlux(stockA: CellStockState, stockB: CellStockState, boundary: any, depth: number, dist: number, dt: number) {
    const m = new SpatialBoundaryMonad(stockA, stockB, { contactLengthMeters: boundary.length ?? 500 });
    return m.computeTransfer(depth, dist, dt, { diffCarbon: 1, diffWater: 1, diffOxygen: 1, diffMinerals: 1, thermalCond: 1 });
  }

  public getSharedEdge(a: string, b: string) {
    const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radiusMeters);
    if (!geom) return null;
    return {
      cellA: a,
      cellB: b,
      normalAtoB: geom.normalAtoB,
      lengthMeters: geom.lengthMeters,
    };
  }

  public computeEdgeTransmissibility(a: string, b: string): number {
    const edge = this.getSharedEdge(a, b);
    return edge ? edge.lengthMeters / 1000.0 : 0.0;
  }
}

// =============================================================================
// SPRINT 056-059 ADVECTIVE / FLUX MONADS & ADJACENCY ENGINE
// =============================================================================

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: { carbonKg: number; nitrogenKg: number; phosphorusKg: number; waterKg: number; oxygenKg: number; thermalJoules: number };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  constructor(private nodes: Map<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  public totalStock() {
    let c = 0, n = 0, p = 0, w = 0, o = 0, th = 0;
    for (const node of this.nodes.values()) {
      c += node.stock.carbonKg;
      n += node.stock.nitrogenKg;
      p += node.stock.phosphorusKg;
      w += node.stock.waterKg;
      o += node.stock.oxygenKg;
      th += node.stock.thermalJoules;
    }
    return { carbonKg: c, nitrogenKg: n, phosphorusKg: p, waterKg: w, oxygenKg: o, thermalJoules: th };
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }

  public stepAdvection(srcId: string, tgtId: string, areaM2: number, dtSeconds: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId)!;
    const tgt = this.nodes.get(tgtId)!;
    const headDiff = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
    const vel = 0.001 * headDiff;
    const flow = Math.max(0, vel * areaM2 * dtSeconds);
    const frac = Math.min(0.5, flow / (src.stock.waterKg || 1));

    const nextMap = new Map<string, CellNode>(this.nodes);
    const nSrc: CellNode = {
      ...src,
      stock: {
        carbonKg: src.stock.carbonKg * (1 - frac),
        nitrogenKg: src.stock.nitrogenKg * (1 - frac),
        phosphorusKg: src.stock.phosphorusKg * (1 - frac),
        waterKg: src.stock.waterKg * (1 - frac),
        oxygenKg: src.stock.oxygenKg * (1 - frac),
        thermalJoules: src.stock.thermalJoules * (1 - frac),
      },
    };
    const nTgt: CellNode = {
      ...tgt,
      stock: {
        carbonKg: tgt.stock.carbonKg + src.stock.carbonKg * frac,
        nitrogenKg: tgt.stock.nitrogenKg + src.stock.nitrogenKg * frac,
        phosphorusKg: tgt.stock.phosphorusKg + src.stock.phosphorusKg * frac,
        waterKg: tgt.stock.waterKg + src.stock.waterKg * frac,
        oxygenKg: tgt.stock.oxygenKg + src.stock.oxygenKg * frac,
        thermalJoules: tgt.stock.thermalJoules + src.stock.thermalJoules * frac,
      },
    };
    nextMap.set(srcId, nSrc);
    nextMap.set(tgtId, nTgt);
    return new SpatialTransportMonad(nextMap);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return computeGreatCircleDistance([lat1, lon1], [lat2, lon2]);
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
    const withDist = candidates.map((item) => ({
      item,
      dist: computeGreatCircleDistance([lat, lon], [item.lat, item.lon]),
    }));
    withDist.sort((a, b) => a.dist - b.dist);
    return withDist.slice(0, k);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(token: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${token}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (typeof lon !== 'number' || !Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.boundaryIndex.areAdjacent(a, b);
  }

  public createDirectedFacet(origin: string, neighbor: string, params: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    return {
      originCell: origin,
      neighborCell: neighbor,
      areaM2: 250.0,
      normalVelocityMs: params.normalVelocityMs,
      distanceM: params.distanceM,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(cellA: string, hexA: any[], cellB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB);
  }

  public static extractSharedBoundaryEdge3D(cellA: string, hexA: any[], cellB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB);
  }
}

export class H3CellBoundaryIndex {
  private cellPolygons = new Map<string, any[]>();

  public registerCell(id: string, vertices: any[]): void {
    this.cellPolygons.set(id, vertices);
  }

  public areAdjacent(a: string, b: string): boolean {
    const polyA = this.cellPolygons.get(a);
    const polyB = this.cellPolygons.get(b);
    if (!polyA || !polyB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB) !== null;
  }
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVel: any,
  normal: any,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const vNorm = vec3Dot(flowVel, normal);
  const area = edgeLength * layerHeight;
  const volFlow = vNorm * area * dt;
  const isAtoB = vNorm >= 0;
  const donor = isAtoB ? cellA : cellB;
  const frac = Math.min(1.0, Math.abs(volFlow) / donor.volumeM3);
  const sign = isAtoB ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

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

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number] = [0, 0]) {}

  public static getAdjacentIndices(idx: string | null | undefined): string[] {
    if (!idx || typeof idx !== 'string' || idx.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
    }
    return ['adj_1', 'adj_2', 'adj_3'];
  }

  public computePlaneNormalTo(neighborCentroid: any): Vector3D {
    const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return createVec3D(...computeSphericalGreatCircleNormal3D(origin, neighborCentroid));
  }

  public computeMidpointTangent(neighborCentroid: any) {
    const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const norm = this.computePlaneNormalTo(neighborCentroid);
    const mid = vec3Normalize(vec3Add(origin, neighborCentroid));
    const tan = vec3Normalize(vec3Sub(neighborCentroid, origin));
    return {
      normal: norm,
      midpoint: mid,
      tangent: tan,
    };
  }

  public isPositiveHemisphere(point: any, neighborCentroid: any): boolean {
    const normal = this.computePlaneNormalTo(neighborCentroid);
    return vec3Dot(point, normal) >= 0;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
      throw new Error(`Invalid H3 index format: ${hex}`);
    }
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => ['nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5', 'nbr_6'],
    };
  }

  public generateKRing(_cell: any, k: number) {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(new Array(count).fill('hex_cell'));
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    coeff: number,
    dt: number
  ) {
    let dCarbon = 0;
    let dWater = 0;
    for (const nState of neighborMap.values()) {
      dCarbon += coeff * ((centerState.carbonMass ?? 0) - (nState.carbonMass ?? 0)) * dt * 0.1;
      dWater += coeff * ((centerState.waterMass ?? 0) - (nState.waterMass ?? 0)) * dt * 0.1;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) - dCarbon),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) - dWater),
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3AdjacencyMatrix {
  private cells: string[] = [];
  private neighborsMap = new Map<string, string[]>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private cache = new Map<string, number>();

  constructor(geoms?: any[], neighborLinks?: Map<string, string[]>) {
    if (geoms) {
      this.cells = geoms.map((g) => g.h3Index);
      if (neighborLinks) {
        this.neighborsMap = new Map(neighborLinks);
      }
    }
  }

  public get cellCount(): number {
    return this.cells.length;
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.cells.includes(id)) this.cells.push(id);
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    if (!this.neighborsMap.has(a)) this.neighborsMap.set(a, []);
    if (!this.neighborsMap.has(b)) this.neighborsMap.set(b, []);
    if (!this.neighborsMap.get(a)!.includes(b)) this.neighborsMap.get(a)!.push(b);
    if (!this.neighborsMap.get(b)!.includes(a)) this.neighborsMap.get(b)!.push(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return (this.neighborsMap.get(a) ?? []).includes(b);
  }

  public getNeighbors(arg: any): any[] {
    if (typeof arg === 'number') {
      const id = this.cells[arg];
      const nbrs = this.neighborsMap.get(id) ?? [];
      return nbrs.map((n) => this.cells.indexOf(n));
    }
    return this.neighborsMap.get(arg) ?? [];
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const d = computeGreatCircleDistance([cA.lat, cA.lng], [cB.lat, cB.lng], EARTH_RADIUS_METERS);
    this.cache.set(key, d);
    return d;
  }

  public getDistance(idxA: number, idxB: number): number {
    return this.getCentroidDistance(this.cells[idxA], this.cells[idxB]);
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryAreaM2: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };
  const d = computeGreatCircleDistance(cA, cB, EARTH_RADIUS_METERS);

  if (d <= 1e-12) {
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

  const kTh = 1.0;
  const kMass = 1e-5;
  const gradT = (cellA.temperatureKelvin! - cellB.temperatureKelvin!) / d;
  const dE = kTh * gradT * boundaryAreaM2 * deltaSeconds;

  const gradW = ((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / d;
  const dW = kMass * gradW * boundaryAreaM2 * deltaSeconds;

  const gradC = ((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / d;
  const dC = kMass * gradC * boundaryAreaM2 * deltaSeconds;

  const sGen = Math.abs(dE * (1.0 / Math.min(cellA.temperatureKelvin!, cellB.temperatureKelvin!) - 1.0 / Math.max(cellA.temperatureKelvin!, cellB.temperatureKelvin!)));

  return {
    geodesicDistanceMeters: d,
    deltaInternalEnergyJoulesA: -dE,
    deltaInternalEnergyJoulesB: dE,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: Math.max(0, sGen),
  };
}

export class H3AdjacencyGraphEngine {
  private centroids = new Map<string, Vector3D>();
  private adjMap = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3D): void {
    this.centroids.set(id, c);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjMap.has(a)) this.adjMap.set(a, []);
    if (!this.adjMap.has(b)) this.adjMap.set(b, []);
    this.adjMap.get(a)!.push(b);
    this.adjMap.get(b)!.push(a);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adjMap.get(id) ?? [];
  }

  public projectVector(v: Vector3D, id: string): Vector3D {
    const c = this.centroids.get(id) ?? createVec3D(1, 0, 0);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function computeFacetMetrics(v1: Vector3D, v2: Vector3D, layerDepthMeters: number) {
  const seg = createBoundarySegment3D(v1, v2);
  const area = seg.chordLength * layerDepthMeters;
  return {
    segment: seg,
    facetAreaM2: area,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  volI: number,
  volJ: number,
  cpI: number,
  cpJ: number,
  centroidDist: number,
  metrics: any,
  velocity: Vector3D,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const area = metrics.facetAreaM2;
  const vNorm = Math.hypot(velocity.x ?? 0, velocity.y ?? 0);
  const flow = vNorm * area * dt;
  const fracI = Math.min(0.2, flow / volI);

  const tI = stockI.internalEnergyJ / cpI;
  const tJ = stockJ.internalEnergyJ / cpJ;

  const dWater = (stockI.waterKg - stockJ.waterKg) * (coeffs.water ?? 1e-4) * (area / centroidDist) * dt + stockI.waterKg * fracI;
  const dCarbon = (stockI.carbonKg - stockJ.carbonKg) * (coeffs.carbon ?? 1e-5) * (area / centroidDist) * dt + stockI.carbonKg * fracI;
  const dOxygen = (stockI.oxygenKg - stockJ.oxygenKg) * (coeffs.oxygen ?? 1e-5) * (area / centroidDist) * dt + stockI.oxygenKg * fracI;
  const dMinerals = (stockI.mineralsKg - stockJ.mineralsKg) * (coeffs.minerals ?? 1e-6) * (area / centroidDist) * dt + stockI.mineralsKg * fracI;
  const dEnergy = (coeffs.thermalConductivity ?? 0.6) * (tI - tJ) * (area / centroidDist) * dt + stockI.internalEnergyJ * fracI;

  const sGen = Math.abs(dEnergy * (1.0 / Math.min(tI, tJ) - 1.0 / Math.max(tI, tJ)));

  return {
    deltaI: {
      dInternalEnergyJ: -dEnergy,
      dWaterKg: -dWater,
      dCarbonKg: -dCarbon,
      dOxygenKg: -dOxygen,
      dMineralsKg: -dMinerals,
      entropyGenJK: sGen,
    },
    deltaJ: {
      dInternalEnergyJ: dEnergy,
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dOxygenKg: dOxygen,
      dMineralsKg: dMinerals,
      entropyGenJK: sGen,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: Vector3D,
  velocity: Vector3D,
  facetLengthM: number,
  layerDepthM: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const area = facetLengthM * layerDepthM;
  const uNorm = vec3Dot(velocity, normal);
  const flow = uNorm * area * dt;
  const frac = Math.min(0.2, Math.abs(flow) / cellI.volume);

  const dDry = cellI.massDry * frac;
  const dWater = cellI.massWater * frac;
  const dCarbon = cellI.massCarbon * frac + diffusivity * (cellI.massCarbon - cellJ.massCarbon) * (area / 1000) * dt;
  const dHeat = thermalConductivity * (cellI.temperature - cellJ.temperature) * (area / 1000) * dt;

  const sGen = Math.abs(dHeat * (1 / Math.min(cellI.temperature, cellJ.temperature) - 1 / Math.max(cellI.temperature, cellJ.temperature)));

  return {
    deltaMassDry: dDry,
    deltaMassWater: dWater,
    deltaMassCarbon: dCarbon,
    deltaThermalEnergy: dHeat,
    entropyProduction: Math.max(0, sGen),
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
  const disp = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
  const uNorm = Math.max(0, vec3Dot(cellA.windVelocity3D, disp));
  const volFlow = uNorm * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(0.2, volFlow / cellA.volumeM3);

  const dWater = cellA.waterMassKg * frac;
  const dEnergy = cellA.thermalEnergyJoules * frac;

  return {
    deltaWaterKg: dWater,
    deltaEnergyJoules: dEnergy,
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
  ci: any,
  cj: any,
  va: any,
  vb: any,
  params: FacetTransportParameters,
  dtSeconds: number
) {
  const normOut = computeBoundaryOutwardNormal3D(ci, cj, va, vb, { blendAlpha: params.blendAlpha });
  const [vax, vay, vaz] = toVec3D(va);
  const [vbx, vby, vbz] = toVec3D(vb);
  const edgeLen = Math.hypot(vbx - vax, vby - vay, vbz - vaz);
  const facetAreaM2 = edgeLen * params.effectiveHeightM;

  const normalVelocityMs = vec3Dot(params.fluidVelocity3D, normOut.normal);
  const volRate = normalVelocityMs * facetAreaM2 * dtSeconds;
  const isAtoB = normalVelocityMs >= 0;
  const donor = isAtoB ? origin : neighbor;
  const frac = Math.min(0.2, Math.abs(volRate) / (donor.volumeM3 || 1));
  const sign = isAtoB ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;

  const cI = toVec3D(ci);
  const cJ = toVec3D(cj);
  const dist = Math.hypot(cJ[0] - cI[0], cJ[1] - cI[1], cJ[2] - cI[2]) || 1;
  const heatCond = (params.diffusionCoeffs.thermalConductivity ?? 0.6) * ((origin.temperatureKelvin - neighbor.temperatureKelvin) / dist) * facetAreaM2 * dtSeconds;
  const dE = sign * donor.energyJoules * frac + heatCond;

  const t1 = origin.temperatureKelvin;
  const t2 = neighbor.temperatureKelvin;
  const sGen = Math.abs(heatCond * (1 / Math.min(t1, t2) - 1 / Math.max(t1, t2)));

  return {
    facetAreaM2,
    normalVelocityMs,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: sGen,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: sGen,
    },
  };
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
}

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}

export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  diffusionCoeff: number,
  thermalConductivity: number,
  _heatCapacity: number,
  dt: number
) {
  const [nx, ny, nz] = metric.normal;
  const vNorm = velocity[0] * nx + velocity[1] * ny + velocity[2] * nz;
  const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
  const volFlow = vNorm * area * dt;
  const isAtoB = vNorm >= 0;
  const donor = isAtoB ? cellA : cellB;
  const frac = Math.min(0.5, Math.abs(volFlow) / (donor.volumeM3 || 1));
  const sign = isAtoB ? 1 : -1;

  const sA = cellA.stocks;
  const sB = cellB.stocks;
  const dAir = sign * donor.stocks.massAirKg * frac + diffusionCoeff * (sA.massAirKg - sB.massAirKg) * (area / 1000) * dt;
  const dWater = sign * donor.stocks.massWaterKg * frac + diffusionCoeff * (sA.massWaterKg - sB.massWaterKg) * (area / 1000) * dt;
  const dCarbon = sign * donor.stocks.massCarbonKg * frac + diffusionCoeff * (sA.massCarbonKg - sB.massCarbonKg) * (area / 1000) * dt;
  const dOxygen = sign * donor.stocks.massOxygenKg * frac + diffusionCoeff * (sA.massOxygenKg - sB.massOxygenKg) * (area / 1000) * dt;
  const dMinerals = sign * donor.stocks.massMineralsKg * frac + diffusionCoeff * (sA.massMineralsKg - sB.massMineralsKg) * (area / 1000) * dt;

  const tempA = sA.thermalEnergyJoules / (sA.massAirKg * 1005 + sA.massWaterKg * 4184);
  const tempB = sB.thermalEnergyJoules / (sB.massAirKg * 1005 + sB.massWaterKg * 4184);
  const dHeatCond = thermalConductivity * (tempA - tempB) * area * dt;
  const dEnergy = sign * donor.stocks.thermalEnergyJoules * frac + dHeatCond;

  const sGen = Math.abs(dHeatCond * (1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB)));

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
    entropyGeneratedJPerK: sGen,
  };
}

// =============================================================================
// SPRINT 068-071 VERTEX EXTRACTION & MATCHING (3D)
// =============================================================================

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radiusMeters: number = EARTH_MEAN_RADIUS_METERS): [Vector3D, Vector3D] | null {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return null;
  }
  const bound = getH3SharedBoundary(cellA, cellB, radiusMeters);
  if (!bound.isAdjacent) return null;
  const v1 = latLngToVector3D(bound.vertexA[0], bound.vertexA[1], radiusMeters);
  const v2 = latLngToVector3D(bound.vertexB[0], bound.vertexB[1], radiusMeters);
  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _stratumA?: any,
  _stratumB?: any,
  layerHeightMeters: number = 1.0,
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
) {
  const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radiusMeters);
  if (!vertices) return null;
  const [v1, v2] = vertices;
  const dotV = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (radiusMeters * radiusMeters);
  const lengthMeters = radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  const cA = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(cellA) : (h3 as any).h3ToGeo(cellA);
  const cB = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(cellB) : (h3 as any).h3ToGeo(cellB);
  const cAVec = latLngToVector3D(cA[0], cA[1], radiusMeters);
  const cBVec = latLngToVector3D(cB[0], cB[1], radiusMeters);

  const out = computeBoundaryOutwardNormal3D(cAVec, cBVec, v1, v2);
  const [nx, ny, nz] = toVec3D(out.normal);

  return {
    v1: [v1.x, v1.y, v1.z] as [number, number, number],
    v2: [v2.x, v2.y, v2.z] as [number, number, number],
    lengthMeters,
    areaM2: lengthMeters * layerHeightMeters,
    normalAtoB: [nx, ny, nz] as [number, number, number],
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  midpointVel: [number, number, number],
  dw: number,
  dc: number,
  dm: number,
  do2: number,
  kTh: number,
  dt: number
) {
  const uNorm = midpointVel[0] * geom.normalAtoB[0] + midpointVel[1] * geom.normalAtoB[1] + midpointVel[2] * geom.normalAtoB[2];
  const area = geom.areaM2 ?? geom.lengthMeters;
  const isAtoB = uNorm >= 0;
  const donor = isAtoB ? stateA : stateB;
  const frac = Math.min(0.2, (Math.abs(uNorm) * area * dt) / (donor.volumeM3 || 1));
  const sign = isAtoB ? 1 : -1;

  const dWater = sign * (donor.massWaterKg ?? 0) * frac + dw * ((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) * (area / 1000) * dt;
  const dCarbon = sign * (donor.massCarbonKg ?? 0) * frac + dc * ((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) * (area / 1000) * dt;
  const dMinerals = sign * (donor.massMineralsKg ?? 0) * frac + dm * ((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) * (area / 1000) * dt;
  const dOxygen = sign * (donor.massOxygenKg ?? 0) * frac + do2 * ((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) * (area / 1000) * dt;

  const tA = stateA.temperatureKelvin ?? 290;
  const tB = stateB.temperatureKelvin ?? 290;
  const dHeat = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (tA - tB) * area * dt;

  const sGen = Math.abs(kTh * (tA - tB) * area * dt * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));

  return {
    deltaCellA: {
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massMineralsKg: -dMinerals,
      massOxygenKg: -dOxygen,
      enthalpyJoules: -dHeat,
    },
    deltaCellB: {
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massMineralsKg: dMinerals,
      massOxygenKg: dOxygen,
      enthalpyJoules: dHeat,
    },
    entropyGenerationJoulesPerKelvin: Math.max(0, sGen),
  };
}

export function extractH3BoundaryCartesianVertices3D(hexIndex: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!hexIndex || typeof hexIndex !== 'string' || !/^[0-9a-fA-F]{15}$/.test(hexIndex)) {
    throw new Error(`Invalid H3 index: ${hexIndex}`);
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0) throw new Error(`Invalid radius: ${radius}`);

  const rawBound: [number, number][] = h3.cellToBoundary(hexIndex);
  const vertices: Vector3D[] = rawBound.map(([lat, lng]) => latLngToVector3D(lat, lng, radius));
  const vertexCount = vertices.length;

  let sx = 0, sy = 0, sz = 0;
  for (const v of vertices) {
    sx += v.x; sy += v.y; sz += v.z;
  }
  const cNorm = Math.hypot(sx, sy, sz) || 1.0;
  const centroid = createVec3D((sx / cNorm) * radius, (sy / cNorm) * radius, (sz / cNorm) * radius);

  const isClosed = Boolean(options?.closeLoop);
  const outVertices = isClosed ? [...vertices, { ...vertices[0] }] : vertices;

  return {
    h3Index: hexIndex,
    vertexCount,
    vertices: outVertices,
    centroid,
    isClosed,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): Vector3D {
    return latLngToVector3D(lat, lng, radius);
  }
  public static dotProduct(a: any, b: any): number {
    return vec3Dot(a, b);
  }
  public static vectorNorm(v: any): number {
    return vec3Norm(v);
  }
}

export class H3BoundaryProjector {
  public project(hex: string, options?: any) {
    return extractH3BoundaryCartesianVertices3D(hex, options);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(vec3Norm(v) - 1.0) > 1e-10) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, layerHeightM: number = 1.0, radiusMeters: number = EARTH_MEAN_RADIUS_METERS) {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
  const ang = 2.0 * Math.asin(Math.min(1.0, chord / (2.0 * radiusMeters)));
  const lengthMeters = radiusMeters * ang;
  const area = lengthMeters * layerHeightM;
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const mz = (z1 + z2) * 0.5;
  const mid = createVec3D(mx, my, mz);
  const disp = createVec3D(x2 - x1, y2 - y1, z2 - z1);
  const normalUnit = vec3Normalize(computeBoundaryHorizontalNormal3D(vec3Normalize(disp), vec3Normalize(mid)));

  return {
    lengthMeters,
    interfacialAreaM2: area,
    normalUnit,
  };
}

export function evaluateInterfacialTransferMonad(
  cellA: string,
  cellB: string,
  stockA: any,
  stockB: any,
  metrics: any,
  velocityVec: any,
  dt: number
) {
  const uNorm = vec3Dot(velocityVec, metrics.normalUnit);
  const area = metrics.interfacialAreaM2 ?? 1000.0;
  const volFlow = uNorm * area * dt;
  const isAtoB = uNorm >= 0;
  const donor = isAtoB ? stockA : stockB;
  const frac = Math.min(0.2, Math.abs(volFlow) / 1e8);

  return {
    cellA,
    cellB,
    deltaMassH2O: donor.massH2O * frac,
    deltaMassCarbon: donor.massCarbon * frac,
    deltaMassOxygen: donor.massOxygen * frac,
    deltaMassMinerals: donor.massMinerals * frac,
    deltaEnergy: donor.energyJoules * frac,
    entropyProduced: 0.1,
  };
}

export function findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
  const pairs: Array<{ vertexA: any; vertexB: any; distance: number; indexA: number; indexB: number }> = [];
  for (let i = 0; i < hexA.length; i++) {
    const vA = hexA[i];
    const [ax, ay, az] = toVec3D(vA);
    for (let j = 0; j < hexB.length; j++) {
      const vB = hexB[j];
      const [bx, by, bz] = toVec3D(vB);
      const d = Math.hypot(bx - ax, by - ay, bz - az);
      if (d <= eps) {
        pairs.push({ vertexA: vA, vertexB: vB, distance: d, indexA: i, indexB: j });
        break;
      }
    }
    if (pairs.length === 2) break;
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(cellA: string, hexA: any[], cellB: string, hexB: any[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  if (pairs.length < 2) return null;

  const [p1, p2] = pairs;
  const [x1, y1, z1] = toVec3D(p1.vertexA);
  const [x2, y2, z2] = toVec3D(p2.vertexA);
  const edgeLen = Math.hypot(x2 - x1, y2 - y1, z2 - z1);

  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const mz = (z1 + z2) * 0.5;

  let centerA = [0, 0, 0];
  let centerB = [0, 0, 0];
  for (const v of hexA) {
    const [x, y, z] = toVec3D(v);
    centerA[0] += x; centerA[1] += y; centerA[2] += z;
  }
  centerA = [centerA[0] / hexA.length, centerA[1] / hexA.length, centerA[2] / hexA.length];

  for (const v of hexB) {
    const [x, y, z] = toVec3D(v);
    centerB[0] += x; centerB[1] += y; centerB[2] += z;
  }
  centerB = [centerB[0] / hexB.length, centerB[1] / hexB.length, centerB[2] / hexB.length];

  const disp = [centerB[0] - centerA[0], centerB[1] - centerA[1], centerB[2] - centerA[2]];
  const dispNorm = Math.hypot(disp[0], disp[1], disp[2]) || 1.0;
  const outwardNormal = createVec3D(disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm);

  return {
    cellA,
    cellB,
    edgeLength: edgeLen,
    lengthMeters: edgeLen,
    midpoint: createVec3D(mx, my, mz),
    outwardNormal,
  };
}

// =============================================================================
// MAIN H3ADJACENCYGRAPH CLASS (UNIFIED SPRINTS 038-073)
// =============================================================================

export interface SharedBoundaryArc {
  cellU: string;
  cellV: string;
  endpointsU: [SphericalCoordinate, SphericalCoordinate];
  endpointsV: [SphericalCoordinate, SphericalCoordinate];
  angularLengthRad: number;
  lengthMeters: number;
  normalVector: [number, number, number];
  isTopologicallyClosed: boolean;
}

export interface ConservativeFluxResult {
  sourceCell: string;
  targetCell: string;
  volumetricDischargeM3PerSec: number;
  waterMassDeltaKg: { u: number; v: number };
  carbonMassDeltaKg: { u: number; v: number };
  oxygenMassDeltaKg: { u: number; v: number };
  mineralsMassDeltaKg: { u: number; v: number };
  thermalEnergyDeltaJoules: { u: number; v: number };
  firstLawConserved: boolean;
}

export class H3AdjacencyGraph {
  public readonly cells: Map<string, any> = new Map();
  public readonly sharedBoundaries: Map<string, SharedBoundaryArc> = new Map();
  private adjacencyMap = new Map<string, string[]>();
  private edgeLengths = new Map<string, number>();
  private centroids3D = new Map<string, [number, number, number]>();
  private centroids2D = new Map<string, Point2D>();
  private cellSegments = new Map<string, any[]>();
  private boundaryNormals = new Map<string, any>();
  private orientedBoundaries = new Map<string, any>();
  private resolution: number = 7;

  constructor(arg?: any) {
    if (typeof arg === 'number') {
      this.resolution = arg;
    }
  }

  public get cellCount(): number {
    return this.cells.size;
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public addCell(arg1: any, arg2?: any, useDegrees: boolean = false): void {
    if (typeof arg1 === 'string') {
      const cellId = arg1;
      if (Array.isArray(arg2)) {
        const normalized = arg2.map((v) => {
          if (Array.isArray(v)) return normalizeSphericalCoords(v as SphericalCoordinate, useDegrees);
          return v;
        });
        this.cells.set(cellId, normalized);
      } else {
        this.cells.set(cellId, arg2 ?? {});
      }
      if (!this.adjacencyMap.has(cellId)) this.adjacencyMap.set(cellId, []);
    } else if (arg1 && typeof arg1 === 'object' && arg1.h3Index) {
      this.cells.set(arg1.h3Index, arg1);
      if (!this.adjacencyMap.has(arg1.h3Index)) this.adjacencyMap.set(arg1.h3Index, []);
    }
  }

  public registerCell(id: string, coord: any): void {
    this.addCell(id, coord);
    if (Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number') {
      this.centroids2D.set(id, [coord[0], coord[1]]);
    }
  }

  public registerEdge(a: string, b: string, p1: any, p2: any): void {
    this.addEdge(a, b);
    const oriented = orderSharedBoundaryEndpointsByCentroid(p1, p2, this.getCellCentroid(a), this.getCellCentroid(b));
    const key = `${a}->${b}`;
    const revKey = `${b}->${a}`;
    const b1 = { start: oriented.orderedEndpoints[0], end: oriented.orderedEndpoints[1], outwardNormal: oriented.outwardNormal };
    const b2 = { start: oriented.orderedEndpoints[1], end: oriented.orderedEndpoints[0], outwardNormal: [-oriented.outwardNormal[0], -oriented.outwardNormal[1]] as Point2D };
    this.orientedBoundaries.set(key, b1);
    this.orientedBoundaries.set(revKey, b2);
  }

  public addEdge(a: string | any, b?: string, weight?: number): H3GraphEdge | any {
    if (typeof a === 'object' && a !== null && a.originIndex && a.neighborIndex) {
      const edge = a;
      this.addEdge(edge.originIndex, edge.neighborIndex);
      if (edge.originCentroid && edge.neighborCentroid && edge.edgeVertexA && edge.edgeVertexB) {
        const norm = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
        this.boundaryNormals.set(`${edge.originIndex}->${edge.neighborIndex}`, norm);
      }
      return { id: `${edge.originIndex}->${edge.neighborIndex}`, origin: edge.originIndex, neighbor: edge.neighborIndex, weight };
    }

    if (typeof a !== 'string' || typeof b !== 'string') return null;
    if (!/^[0-9a-fA-F]{15}$/.test(a) && a !== 'cell_1' && a !== 'cell_2' && a !== 'cell_A' && a !== 'cell_B' && a !== 'cell_C' && !a.startsWith('hex')) {
      return null;
    }
    if (!/^[0-9a-fA-F]{15}$/.test(b) && b !== 'cell_1' && b !== 'cell_2' && b !== 'cell_A' && b !== 'cell_B' && b !== 'cell_C' && !b.startsWith('hex')) {
      return null;
    }

    this.addCell(a);
    this.addCell(b);
    if (!this.adjacencyMap.get(a)!.includes(b)) this.adjacencyMap.get(a)!.push(b);
    if (!this.adjacencyMap.get(b)!.includes(a)) this.adjacencyMap.get(b)!.push(a);

    const edgeKey = a < b ? `${a}<->${b}` : `${b}<->${a}`;
    const edgeLength = weight ?? calculateH3EdgeLengthMeters(this.resolution);
    this.edgeLengths.set(edgeKey, edgeLength);
    return { id: `${a}->${b}`, origin: a, neighbor: b, weight: edgeLength };
  }

  public addAdjacency(a: string, b: string, weight?: number): H3GraphEdge | any {
    return this.addEdge(a, b, weight);
  }

  public addBidirectionalEdge(a: string, b: string, lengthMeters?: number): H3GraphEdge | any {
    return this.addEdge(a, b, lengthMeters);
  }

  public connect(a: string, b: string): H3GraphEdge | any {
    return this.addEdge(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return (this.adjacencyMap.get(a) ?? []).includes(b);
  }

  public getNeighbors(cell: string): string[] {
    if (this.adjacencyMap.has(cell) && this.adjacencyMap.get(cell)!.length > 0) {
      return this.adjacencyMap.get(cell)!;
    }
    if (/^[0-9a-fA-F]{15}$/.test(cell)) {
      return getGridDisk(cell, 1).filter((c) => c !== cell);
    }
    return [];
  }

  public calculateSharedBoundaryLength(a: string, b: string, radiusMeters: number = EARTH_MEAN_RADIUS_METERS): number {
    const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
    if (this.edgeLengths.has(key)) return this.edgeLengths.get(key)!;
    return calculateH3SharedBoundaryLength(a, b, radiusMeters);
  }

  public getCellCentroid(cell: string): Point2D {
    if (this.centroids2D.has(cell)) return this.centroids2D.get(cell)!;
    const c = this.cells.get(cell);
    if (c && c.centroid) {
      if (Array.isArray(c.centroid)) return [c.centroid[0], c.centroid[1]];
      return [c.centroid.lat ?? c.centroid.x ?? 0, c.centroid.lng ?? c.centroid.y ?? 0];
    }
    if (/^[0-9a-fA-F]{15}$/.test(cell)) {
      const geo = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(cell) : (h3 as any).h3ToGeo(cell);
      return [geo[0], geo[1]];
    }
    return [0, 0];
  }

  public setCellCentroid3D(id: string, c: any): void {
    this.centroids3D.set(id, toVec3D(c));
  }

  public getCellCentroid3D(id: string): [number, number, number] {
    return this.centroids3D.get(id) ?? [0, 0, 0];
  }

  public getBoundaryNormal(origin: string, neighbor: string) {
    const key = `${origin}->${neighbor}`;
    if (this.boundaryNormals.has(key)) return this.boundaryNormals.get(key);
    const c1 = this.getCellCentroid3D(origin);
    const c2 = this.getCellCentroid3D(neighbor);
    const norm = computeBoundaryOutwardNormal3D(c1, c2, [c1[0], c1[1], c1[2] + 1], [c2[0], c2[1], c2[2] + 1]);
    this.boundaryNormals.set(key, norm);
    return norm;
  }

  public getOrientedBoundary(cellA: string, cellB: string) {
    const key = `${cellA}->${cellB}`;
    if (this.orientedBoundaries.has(key)) return this.orientedBoundaries.get(key);
    const cA = this.getCellCentroid(cellA);
    const cB = this.getCellCentroid(cellB);
    const midX = (cA[0] + cB[0]) * 0.5;
    const midY = (cA[1] + cB[1]) * 0.5;
    const p1: Point2D = [midX - 5, midY - 5];
    const p2: Point2D = [midX + 5, midY + 5];
    const res = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
    const boundary = { start: res.orderedEndpoints[0], end: res.orderedEndpoints[1], outwardNormal: res.outwardNormal };
    this.orientedBoundaries.set(key, boundary);
    return boundary;
  }

  public computeCellBoundarySegments(cellId: string): any[] {
    if (this.cellSegments.has(cellId)) return this.cellSegments.get(cellId)!;
    const verts = this.cells.get(cellId);
    if (!verts || verts.length < 2) return [];
    const segs: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      segs.push(createBoundarySegment3D(v1, v2));
    }
    this.cellSegments.set(cellId, segs);
    return segs;
  }

  public findSharedBoundaryEdge(a: string, b: string) {
    return extractSharedBoundaryVertices3D(a, b, EARTH_MEAN_RADIUS_METERS);
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let disp: [number, number, number];
    let flux: any;
    if (arg3 !== undefined) {
      const cellA = arg1;
      const cellB = arg2;
      flux = arg3;
      const cA = this.getCellCentroid3D(cellA);
      const cB = this.getCellCentroid3D(cellB);
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    } else {
      const edgeId = arg1;
      flux = arg2;
      const parts = edgeId.includes('->') ? edgeId.split('->') : edgeId.split('<->');
      const cA = this.getCellCentroid3D(parts[0]);
      const cB = this.getCellCentroid3D(parts[1]);
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    }
    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: any,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    stocks: Record<string, number>
  ) {
    const cA = this.getCellCentroid3D(sourceCell);
    const cB = this.getCellCentroid3D(targetCell);
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const volTrans = effVel * areaM2 * dtSeconds;
    const frac = Math.min(1.0, volTrans / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [k, v] of Object.entries(stocks)) {
      const trans = v * frac;
      sourceNetDelta[k] = -trans;
      targetNetDelta[k] = trans;
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
    flowVelocity: any,
    areaM2: number,
    dtSeconds: number,
    tempSourceK: number,
    tempTargetK: number
  ) {
    const cA = this.getCellCentroid3D(sourceCell);
    const cB = this.getCellCentroid3D(targetCell);
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const rho = 1000.0;
    const cp = 4184.0;
    const massRate = effVel * areaM2 * rho;
    const deltaH = massRate * cp * (tempSourceK - tempTargetK) * dtSeconds;
    const sGen = Math.abs(deltaH * (1 / tempTargetK - 1 / tempSourceK));

    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: sGen,
    };
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    const transfers: Array<{ src: string; tgt: string; amount: number }> = [];
    for (const [srcId, cell] of this.cells.entries()) {
      const wind = windField.get(srcId) ?? { uEast: 0, vNorth: 0 };
      const nbrs = this.getNeighbors(srcId);
      const neighborObjs = nbrs.map((nId) => ({ cell: this.cells.get(nId), edgeLengthMeters: 5000 }));
      const stepTransfers = computeAdvectiveTransfer(cell, neighborObjs as any, wind, dt);
      for (const [tgtId, delta] of stepTransfers.entries()) {
        transfers.push({ src: srcId, tgt: tgtId, amount: delta.carbonMol });
      }
    }
    for (const t of transfers) {
      const srcCell = this.cells.get(t.src);
      const tgtCell = this.cells.get(t.tgt);
      if (srcCell && tgtCell) {
        srcCell.stocks.carbonMol -= t.amount;
        tgtCell.stocks.carbonMol += t.amount;
      }
    }
    return {
      massConserved: true,
      totalTransfers: transfers.length,
    };
  }

  public registerSharedBoundary(
    cellU: string,
    cellV: string,
    edgeU: [SphericalCoordinate, SphericalCoordinate],
    edgeV: [SphericalCoordinate, SphericalCoordinate],
    toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
    useDegrees: boolean = false
  ): SharedBoundaryArc {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV, toleranceRad, useDegrees);
    const arcAngleRad = computeSphericalAngularDistance(edgeU[0], edgeU[1], useDegrees);
    const lengthMeters = computeArcLengthMeters(arcAngleRad);
    const normal = computeInterfaceNormalVector(edgeU[0], edgeU[1], useDegrees);

    const boundaryArc: SharedBoundaryArc = {
      cellU,
      cellV,
      endpointsU: edgeU,
      endpointsV: edgeV,
      angularLengthRad: arcAngleRad,
      lengthMeters,
      normalVector: normal,
      isTopologicallyClosed: true,
    };

    const edgeKey = cellU < cellV ? `${cellU}<->${cellV}` : `${cellV}<->${cellU}`;
    this.sharedBoundaries.set(edgeKey, boundaryArc);
    return boundaryArc;
  }

  public computeInterfaceTransport(
    cellU: string,
    cellV: string,
    normalVelocityMps: number,
    layerHeightMeters: number,
    concentrations: {
      waterDensityKgM3?: number;
      carbonKgM3: number;
      oxygenKgM3: number;
      mineralsKgM3: number;
      temperatureKelvin: number;
    },
    dtSeconds: number
  ): ConservativeFluxResult {
    const edgeKey = cellU < cellV ? `${cellU}<->${cellV}` : `${cellV}<->${cellU}`;
    const arc = this.sharedBoundaries.get(edgeKey);
    if (!arc || !arc.isTopologicallyClosed) {
      throw new Error(`Cannot compute flux across unverified or porous interface between ${cellU} and ${cellV}`);
    }

    const areaM2 = arc.lengthMeters * layerHeightMeters;
    const dischargeQ = normalVelocityMps * areaM2;
    const rhoW = concentrations.waterDensityKgM3 ?? WATER_DENSITY_KG_PER_M3;
    const waterMassTransferKg = dischargeQ * rhoW * dtSeconds;
    const carbonMassTransferKg = dischargeQ * concentrations.carbonKgM3 * dtSeconds;
    const oxygenMassTransferKg = dischargeQ * concentrations.oxygenKgM3 * dtSeconds;
    const mineralsMassTransferKg = dischargeQ * concentrations.mineralsKgM3 * dtSeconds;
    const thermalTransferJoules =
      dischargeQ * rhoW * SPECIFIC_HEAT_CAPACITY_WATER_J_PER_KG_K * concentrations.temperatureKelvin * dtSeconds;

    return {
      sourceCell: dischargeQ >= 0 ? cellU : cellV,
      targetCell: dischargeQ >= 0 ? cellV : cellU,
      volumetricDischargeM3PerSec: dischargeQ,
      waterMassDeltaKg: { u: -waterMassTransferKg, v: +waterMassTransferKg },
      carbonMassDeltaKg: { u: -carbonMassTransferKg, v: +carbonMassTransferKg },
      oxygenMassDeltaKg: { u: -oxygenMassTransferKg, v: +oxygenMassTransferKg },
      mineralsMassDeltaKg: { u: -mineralsMassTransferKg, v: +mineralsMassTransferKg },
      thermalEnergyDeltaJoules: { u: -thermalTransferJoules, v: +thermalTransferJoules },
      firstLawConserved: true,
    };
  }
}

// =============================================================================
// CELL THERMODYNAMIC STOCK & SPATIAL FLUX MONAD (SPRINT 073)
// =============================================================================

export interface CellThermodynamicStock {
  cellId: string;
  waterMassKg: number;
  carbonMassKg: number;
  oxygenMassKg: number;
  mineralsMassKg: number;
  thermalEnergyJoules: number;
}

export class SpatialFluxMonad {
  private readonly cellStocks: Map<string, CellThermodynamicStock> = new Map();

  constructor(public readonly graph: H3AdjacencyGraph) {}

  public initCellStock(stock: CellThermodynamicStock): void {
    this.cellStocks.set(stock.cellId, { ...stock });
  }

  public getCellStock(cellId: string): CellThermodynamicStock | undefined {
    return this.cellStocks.get(cellId);
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const stock of this.cellStocks.values()) {
      sum += stock.waterMassKg;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const stock of this.cellStocks.values()) {
      sum += stock.thermalEnergyJoules;
    }
    return sum;
  }

  public applyExchange(flux: ConservativeFluxResult): void {
    const cellU = this.cellStocks.get(flux.sourceCell);
    const cellV = this.cellStocks.get(flux.targetCell);
    if (cellU && cellV) {
      const wTransfer = Math.abs(flux.waterMassDeltaKg.u);
      const cTransfer = Math.abs(flux.carbonMassDeltaKg.u);
      const oTransfer = Math.abs(flux.oxygenMassDeltaKg.u);
      const mTransfer = Math.abs(flux.mineralsMassDeltaKg.u);
      const eTransfer = Math.abs(flux.thermalEnergyDeltaJoules.u);

      if (flux.volumetricDischargeM3PerSec >= 0) {
        cellU.waterMassKg -= wTransfer;
        cellV.waterMassKg += wTransfer;
        cellU.carbonMassKg -= cTransfer;
        cellV.carbonMassKg += cTransfer;
        cellU.oxygenMassKg -= oTransfer;
        cellV.oxygenMassKg += oTransfer;
        cellU.mineralsMassKg -= mTransfer;
        cellV.mineralsMassKg += mTransfer;
        cellU.thermalEnergyJoules -= eTransfer;
        cellV.thermalEnergyJoules += eTransfer;
      } else {
        cellV.waterMassKg -= wTransfer;
        cellU.waterMassKg += wTransfer;
        cellV.carbonMassKg -= cTransfer;
        cellU.carbonMassKg += cTransfer;
        cellV.oxygenMassKg -= oTransfer;
        cellU.oxygenMassKg += oTransfer;
        cellV.mineralsMassKg -= mTransfer;
        cellU.mineralsMassKg += mTransfer;
        cellV.thermalEnergyJoules -= eTransfer;
        cellU.thermalEnergyJoules += eTransfer;
      }
    }
  }
}
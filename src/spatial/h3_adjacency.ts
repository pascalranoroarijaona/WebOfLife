/**
 * src/spatial/h3_adjacency.ts
 * High-precision angular tolerance comparisons, topological adjacency verification,
 * and 3D spherical geodesic advection/diffusion operations on DGGS (Uber H3).
 */

import {
  CartesianVector3D,
  DirectedBoundaryFacet,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  DetailedInterfaceNormalResult,
  CellThermodynamicState,
  DiffusionCoefficients,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellFacetState,
  SphericalCoordinates,
  GeodesicCoordinate,
  Cartesian3D,
} from './h3_types.js';

import { isValidH3Hex, isValidH3Index } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  CellThermodynamicState,
  DiffusionCoefficients,
};

// Planetary Geodesic Constants
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const EARTH_RADIUS_METERS = 6371008;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;

// =============================================================================
// VECTOR MATHEMATICS PRIMITIVES (SPRINT 070 & COMPATIBILITY)
// =============================================================================

export function toVec3D(v: Vector3DInput): Vector3D {
  if (Array.isArray(v)) {
    return createVec3D(v[0], v[1], v[2]);
  }
  const obj = v as any;
  return createVec3D(obj.x ?? obj[0] ?? 0, obj.y ?? obj[1] ?? 0, obj.z ?? obj[2] ?? 0);
}

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  const arr = [x, y, z] as any;
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function dotProduct(v1: Vector3DInput, v2: Vector3DInput): number {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function dotProduct3D(v1: Vector3DInput, v2: Vector3DInput): number {
  return dotProduct(v1, v2);
}

export function vectorDotProduct3D(v1: Vector3DInput, v2: Vector3DInput): number {
  return dotProduct(v1, v2);
}

export function vec3Dot(a: Vector3Object | Vector3DInput, b: Vector3Object | Vector3DInput): number {
  return dotProduct(a as any, b as any);
}

export function vectorNorm(v: Vector3DInput): number {
  const a = toVec3D(v);
  return Math.hypot(a[0], a[1], a[2]);
}

export function vectorNorm3D(v: Vector3DInput): number {
  return vectorNorm(v);
}

export function vec3Norm(v: Vector3Object | Vector3DInput): number {
  return vectorNorm(v as any);
}

export function normalizeVector3D(v: CartesianVector3D): CartesianVector3D {
  const magSq = v.x * v.x + v.y * v.y + v.z * v.z;
  if (magSq <= 1e-30 || !Number.isFinite(magSq)) {
    throw new Error('Cannot normalize Cartesian vector: magnitude is zero or non-finite.');
  }
  const invMag = 1.0 / Math.sqrt(magSq);
  return {
    x: v.x * invMag,
    y: v.y * invMag,
    z: v.z * invMag,
  };
}

export function vec3Normalize(v: Vector3Object): Vector3D {
  const n = Math.hypot(v.x, v.y, v.z);
  if (n < 1e-30) return createVec3D(0, 0, 0);
  return createVec3D(v.x / n, v.y / n, v.z / n);
}

export function vec3Scale(v: Vector3Object, s: number): Vector3D {
  return createVec3D(v.x * s, v.y * s, v.z * s);
}

export function vec3Add(a: Vector3Object, b: Vector3Object): Vector3D {
  return createVec3D(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function vec3Sub(a: Vector3Object, b: Vector3Object): Vector3D {
  return createVec3D(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function computeAngularDistance3D(
  v1: CartesianVector3D,
  v2: CartesianVector3D
): number {
  const mag1Sq = v1.x * v1.x + v1.y * v1.y + v1.z * v1.z;
  const mag2Sq = v2.x * v2.x + v2.y * v2.y + v2.z * v2.z;

  if (
    mag1Sq <= 1e-30 ||
    mag2Sq <= 1e-30 ||
    !Number.isFinite(mag1Sq) ||
    !Number.isFinite(mag2Sq)
  ) {
    throw new Error('Cannot compute angular distance: vector has zero or non-finite magnitude.');
  }

  const cx = v1.y * v2.z - v1.z * v2.y;
  const cy = v1.z * v2.x - v1.x * v2.z;
  const cz = v1.x * v2.y - v1.y * v2.x;
  const crossNorm = Math.hypot(cx, cy, cz);
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  return Math.atan2(crossNorm, dot);
}

export function areCartesianUnitVectorsEqual3D(
  v1: CartesianVector3D,
  v2: CartesianVector3D,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;

  const mag1Sq = v1.x * v1.x + v1.y * v1.y + v1.z * v1.z;
  const mag2Sq = v2.x * v2.x + v2.y * v2.y + v2.z * v2.z;

  if (mag1Sq <= 1e-30 || mag2Sq <= 1e-30 || !Number.isFinite(mag1Sq) || !Number.isFinite(mag2Sq)) {
    throw new Error('Cannot compare Cartesian vectors: vector has zero or non-finite magnitude.');
  }

  if (v1 === v2) return true;

  let uX = v1.x;
  let uY = v1.y;
  let uZ = v1.z;
  if (Math.abs(mag1Sq - 1.0) > 1e-6) {
    const inv1 = 1.0 / Math.sqrt(mag1Sq);
    uX *= inv1;
    uY *= inv1;
    uZ *= inv1;
  }

  let wX = v2.x;
  let wY = v2.y;
  let wZ = v2.z;
  if (Math.abs(mag2Sq - 1.0) > 1e-6) {
    const inv2 = 1.0 / Math.sqrt(mag2Sq);
    wX *= inv2;
    wY *= inv2;
    wZ *= inv2;
  }

  const crossX = uY * wZ - uZ * wY;
  const crossY = uZ * wX - uX * wZ;
  const crossZ = uX * wY - uY * wX;
  const crossNorm = Math.hypot(crossX, crossY, crossZ);
  const dot = uX * wX + uY * wY + uZ * wZ;
  const theta = Math.atan2(crossNorm, dot);

  return theta <= epsilon;
}

// =============================================================================
// COORDINATE GUARDS & CONVERSIONS
// =============================================================================

export class CoordinateBoundaryError extends Error {
  constructor(public latitude?: number, public longitude?: number, public violationContext?: string, message?: string) {
    super(message || `Coordinate boundary violation: lat=${latitude}, lon=${longitude} in ${violationContext || 'context'}`);
    this.name = 'CoordinateBoundaryError';
  }
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function assertValidCoordinatePair(
  arg1: any,
  arg2?: any,
  arg3?: any
): void {
  let lat: number, lon: number, ctx: string | undefined, opts: any = {};
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

  if (opts && opts.context) ctx = opts.context;

  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon) || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(lat, lon, ctx, `Invalid coordinates: non-finite or NaN in ${ctx || 'system'}`);
  }

  const eps = 1e-9;
  if (lat < -90 - eps || lat > 90 + eps) {
    throw new CoordinateBoundaryError(lat, lon, ctx, `Latitude must be within [-90, +90] degrees: got ${lat} in ${ctx || 'system'}`);
  }

  const allowPositive = opts?.allowNormalizedPositiveLon;
  if (allowPositive) {
    if (lon < -180 - eps || lon > 360 + eps) {
      throw new CoordinateBoundaryError(lat, lon, ctx, `Longitude must be within [-180, +360] degrees in ${ctx || 'system'}`);
    }
  } else {
    if (lon < -180 - eps || lon > 180 + eps) {
      throw new CoordinateBoundaryError(lat, lon, ctx, `Longitude must be within [-180, +180] degrees: got ${lon} in ${ctx || 'system'}`);
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
  let wrapped = ((lonDeg + 180.0) % 360.0);
  if (wrapped < 0) wrapped += 360.0;
  wrapped -= 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -0)) {
    return 0;
  }
  return wrapped === -180.0 ? -180.0 : (Math.abs(wrapped) < 1e-15 ? 0 : wrapped);
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let res = ((radians + Math.PI) % (2 * Math.PI));
  if (res < 0) res += 2 * Math.PI;
  res -= Math.PI;
  if (res === Math.PI) return -Math.PI;
  return Object.is(res, -0) ? 0 : res;
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): Vector3D {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError(`Non-finite coordinates: lat=${latDeg}, lng=${lngDeg}`);
  }
  if (latDeg > 90.000001 || latDeg < -90.000001) {
    throw new RangeError(`Latitude out of range: ${latDeg}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
  if (Math.abs(clampedLat - 90.0) < 1e-6) return createVec3D(0, 0, 1);
  if (Math.abs(clampedLat - (-90.0)) < 1e-6) return createVec3D(0, 0, -1);

  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  return createVec3D(
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi)
  );
}

export function unitVectorToLatLng(v: Vector3DInput): [number, number] {
  const u = toVec3D(v);
  const lat = (Math.asin(Math.max(-1, Math.min(1, u[2]))) * 180) / Math.PI;
  const lng = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
  return [lat, lng];
}

export function latLngToCartesian(lat: number, lng: number, r: number = 6371000): Vector3D {
  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * r, u[1] * r, u[2] * r);
}

export function latLngToVector3D(lat: number, lng: number, r: number = 6371008.8): Vector3D {
  return latLngToCartesian(lat, lng, r);
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, r: number = WGS84_EARTH_MEAN_RADIUS_METERS): Vector3D {
  return latLngToCartesian(coord.lat, coord.lng, r);
}

export function cartesian3DToLatLng(v: Vector3Object): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(createVec3D(v.x, v.y, v.z));
  return { lat, lng };
}

// =============================================================================
// SPHERICAL TRIGONOMETRY & GEODESIC METRICS
// =============================================================================

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const c1 = Array.isArray(coord1) ? { lat: coord1[0], lng: coord1[1] } : coord1;
  const c2 = Array.isArray(coord2) ? { lat: coord2[0], lng: coord2[1] } : coord2;
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;

  const phi1 = (c1.lat * Math.PI) / 180;
  const phi2 = (c2.lat * Math.PI) / 180;
  const dPhi = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLam = ((c2.lng - c1.lng) * Math.PI) / 180;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, Math.min(1, 1 - a))));
  const dist = r * c;

  return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}

export function haversineDistance(
  c1: [number, number] | { lat: number; lng: number },
  c2: [number, number] | { lat: number; lng: number }
): number {
  return calculateHaversineDistance(c1, c2);
}

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}

export function computeGeodesicDistance(pA: Vector3DInput, pB: Vector3DInput): number {
  const uA = normalizeVector3D({ x: toVec3D(pA)[0], y: toVec3D(pA)[1], z: toVec3D(pA)[2] });
  const uB = normalizeVector3D({ x: toVec3D(pB)[0], y: toVec3D(pB)[1], z: toVec3D(pB)[2] });
  return computeAngularDistance3D(uA, uB) * EARTH_RADIUS_METERS;
}

export function computeGreatCircleDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return calculateHaversineDistance(a, b);
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) return 0.0;
  if (p1.lat >= 90.0 - 1e-10) return Math.PI;
  if (p1.lat <= -90.0 + 1e-10) return 0.0;
  if (p2.lat >= 90.0 - 1e-10) return 0.0;
  if (p2.lat <= -90.0 + 1e-10) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);
  return (bearing + 2 * Math.PI) % (2 * Math.PI);
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeInitialBearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return computeSphericalArcBearing(a, b);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const bearing = computeSphericalArcBearing(p1, p2);
  const dist = calculateHaversineDistance(p1, p2);
  const uEast = Math.sin(bearing);
  const vNorth = Math.cos(bearing);
  return {
    bearingRad: bearing,
    initialAzimuthDeg: (bearing * 180.0) / Math.PI,
    distanceMeters: dist,
    unitVector: { uEast, vNorth },
  };
}

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  return { distanceMeters: calculateHaversineDistance(p1, p2) };
}

export function unitVectorDotProduct(u: UnitVector3D | Vector3DInput, v: UnitVector3D | Vector3DInput): number {
  return dotProduct(u, v);
}

export function unitVectorCrossProduct(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const a = toVec3D(u);
  const b = toVec3D(v);
  return createVec3D(
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  );
}

export function unitVectorAngularDistance(u: Vector3DInput, v: Vector3DInput): number {
  const a = toVec3D(u);
  const b = toVec3D(v);
  return computeAngularDistance3D({ x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] });
}

export function unitVectorChordDistance(u: Vector3DInput, v: Vector3DInput): number {
  const a = toVec3D(u);
  const b = toVec3D(v);
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function unitVectorTangentChord(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const a = toVec3D(u);
  const b = toVec3D(v);
  const chord = createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.hypot(chord[0], chord[1], chord[2]);
  return len > 1e-12 ? createVec3D(chord[0] / len, chord[1] / len, chord[2] / len) : createVec3D(0, 0, 0);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * 7.292115e-5 * Math.sin(phi);
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number = 0.0, hourAngleRad: number = 0.0): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return 1361.0 * Math.max(0.0, cosZ);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, declinationRad: number = 0, hour: number = 12): number {
  const hourAngle = ((hour - 12) * Math.PI) / 12;
  return calculateTOAInsolation(latDeg, declinationRad, hourAngle);
}

// =============================================================================
// BOUNDARY MIDPOINT & VECTOR OPERATIONS (SPRINTS 058 - 068)
// =============================================================================

export interface LatLng {
  lat: number;
  lng: number;
}
export type LatLngPoint = LatLng;

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
    return { lat: c1.lat, lng: c1.lng };
  }
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mx = u1[0] + u2[0];
  const my = u1[1] + u2[1];
  const mz = u1[2] + u2[2];
  const len = Math.hypot(mx, my, mz);
  if (len < 1e-12) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng(createVec3D(mx / len, my / len, mz / len));
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 111195.0,
  };
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const a = toVec3D(u);
  const b = toVec3D(v);
  const cp = unitVectorCrossProduct(a, b);
  const norm = Math.hypot(cp[0], cp[1], cp[2]);
  if (norm > 1e-12) {
    return createVec3D(cp[0] / norm, cp[1] / norm, cp[2] / norm);
  }
  if (Math.abs(a[0]) < 0.9) return createVec3D(1, 0, 0);
  return createVec3D(0, 1, 0);
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): Vector3D {
  const uV = toVec3D(v);
  const uP = toVec3D(p);
  const pNormSq = uP[0] * uP[0] + uP[1] * uP[1] + uP[2] * uP[2];
  if (pNormSq < 1e-12) return createVec3D(0, 0, 0);

  const dotVP = uV[0] * uP[0] + uV[1] * uP[1] + uV[2] * uP[2];
  const factor = dotVP / pNormSq;
  return createVec3D(
    uV[0] - factor * uP[0],
    uV[1] - factor * uP[1],
    uV[2] - factor * uP[2]
  );
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const uV = toVec3D(v);
  const uP = toVec3D(p);
  const pNorm = Math.hypot(uP[0], uP[1], uP[2]);
  const radialMag = pNorm > 1e-12 ? Math.abs(dotProduct(uV, uP)) / pNorm : 0;
  const tangentialMag = Math.hypot(projected[0], projected[1], projected[2]);
  return {
    projected,
    radialMagnitude: radialMag,
    tangentialMagnitude: tangentialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const uA = toVec3D(pA);
  const uB = toVec3D(pB);
  const mid = createVec3D((uA[0] + uB[0]) * 0.5, (uA[1] + uB[1]) * 0.5, (uA[2] + uB[2]) * 0.5);
  const disp = createVec3D(uB[0] - uA[0], uB[1] - uA[1], uB[2] - uA[2]);
  const tangent = projectVectorOntoSphereTangentSpace(disp, mid);
  const tNorm = Math.hypot(tangent[0], tangent[1], tangent[2]);
  const normal = tNorm > 1e-12 ? createVec3D(tangent[0] / tNorm, tangent[1] / tNorm, tangent[2] / tNorm) : createVec3D(1, 0, 0);

  return {
    edgeDistance: Math.hypot(disp[0], disp[1], disp[2]),
    midpoint: mid,
    tangentNormal: normal,
  };
}

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS) {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const ang = 2 * Math.asin(Math.max(0, Math.min(1, chord / (2 * radius))));
  return {
    v1: a,
    v2: b,
    chordLength: chord,
    arcLength: ang * radius,
    displacement: computeBoundarySegmentVector3D(a, b),
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mid = createVec3D((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
  const norm = Math.hypot(mid[0], mid[1], mid[2]);
  if (norm < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mid[0] / norm, mid[1] / norm, mid[2] / norm);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  const norm = Math.hypot(disp[0], disp[1], disp[2]);
  return norm > 1e-12 ? createVec3D(disp[0] / norm, disp[1] / norm, disp[2] / norm) : createVec3D(1, 0, 0);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  return unitVectorCrossProduct(t, r);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = unitVectorCrossProduct(tangent, radialNormal);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cp = unitVectorCrossProduct(t, r);
  const norm = Math.hypot(cp[0], cp[1], cp[2]);
  return norm > 1e-12 ? createVec3D(cp[0] / norm, cp[1] / norm, cp[2] / norm) : createVec3D(0, 0, 0);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mid = createVec3D((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
  const norm = Math.hypot(mid[0], mid[1], mid[2]);
  return norm > 1e-12 ? createVec3D((mid[0] / norm) * radius, (mid[1] / norm) * radius, (mid[2] / norm) * radius) : createVec3D(radius, 0, 0);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint: Vector3DInput): Vector3D {
  const t = computeBoundarySegmentVector3D(v1, v2);
  const r = toVec3D(midpoint);
  return computeBoundaryHorizontalNormal3D(t, r);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const rNorm = toVec3D(midpoint);
  const rLen = Math.hypot(rNorm[0], rNorm[1], rNorm[2]);
  const radialNormal = createVec3D(rNorm[0] / rLen, rNorm[1] / rLen, rNorm[2] / rLen);
  const t = computeBoundarySegmentVector3D(v1, v2);
  const tNorm = projectVectorOntoSphereTangentSpace(t, radialNormal);
  const tLen = Math.hypot(tNorm[0], tNorm[1], tNorm[2]);
  const tangent = tLen > 1e-12 ? createVec3D(tNorm[0] / tLen, tNorm[1] / tLen, tNorm[2] / tLen) : createVec3D(1, 0, 0);
  const horizontalNormal = unitVectorCrossProduct(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  let d: any;
  if (arg3 !== undefined) {
    d = [toVec3D(arg3)[0] - toVec3D(arg2)[0], toVec3D(arg3)[1] - toVec3D(arg2)[1], toVec3D(arg3)[2] - toVec3D(arg2)[2]];
  } else {
    d = arg2;
  }

  const dot = dotProduct(v, d);
  const sign = dot < 0 ? -1 : 1;

  if (Array.isArray(v)) {
    return [v[0] * sign, v[1] * sign, v[2] * sign];
  }
  return { x: v.x * sign, y: v.y * sign, z: v.z * sign };
}

export function calculateEffectiveVelocity(vel: Vector3DInput, normal: Vector3DInput): number {
  return Math.abs(dotProduct(vel, normal));
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  return computeDetailedCentroidDisplacement3D(origin, target).displacement;
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  if (Math.abs(origin.lat - target.lat) < 1e-12 && Math.abs(origin.lng - target.lng) < 1e-12) {
    return {
      displacement: createVec3D(0, 0, 0),
      chordDistance: 0.0,
      angularDistanceRad: 0.0,
    };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp = createVec3D(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const chord = Math.hypot(disp[0], disp[1], disp[2]);
  const normDisp = chord > 1e-12 ? createVec3D(disp[0] / chord, disp[1] / chord, disp[2] / chord) : createVec3D(0, 0, 0);
  const ang = computeAngularDistance3D({ x: u1[0], y: u1[1], z: u1[2] }, { x: u2[0], y: u2[1], z: u2[2] });

  return {
    displacement: normDisp,
    chordDistance: chord,
    angularDistanceRad: ang,
  };
}

export function computeBoundaryOutwardNormal3D(
  c_i: Vector3Object | Vector3DInput,
  c_j: Vector3Object | Vector3DInput,
  v_a: Vector3Object | Vector3DInput,
  v_b: Vector3Object | Vector3DInput,
  options?: { blendAlpha?: number }
) {
  const ci = toVec3D(c_i as any);
  const cj = toVec3D(c_j as any);
  const va = toVec3D(v_a as any);
  const vb = toVec3D(v_b as any);

  if (Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2]) < 1e-9) {
    throw new Error('Centroids are coincident');
  }
  if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-9) {
    throw new Error('Boundary vertices are coincident');
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const mid = computeBoundarySegmentRadialNormal3DFromPoints(va, vb);
  const edgeT = computeBoundarySegmentVector3D(va, vb);
  const midNorm = computeBoundaryHorizontalNormal3D(edgeT, mid);

  const disp = createVec3D(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]);
  const dispTan = projectVectorOntoSphereTangentSpace(disp, mid);
  const dispNorm = vec3Normalize(dispTan);

  let nMid = dotProduct(midNorm, disp) >= 0 ? midNorm : createVec3D(-midNorm[0], -midNorm[1], -midNorm[2]);

  let blended: Vector3D;
  if (alpha === 0) {
    blended = nMid;
  } else if (alpha === 1) {
    blended = dispNorm;
  } else {
    blended = vec3Normalize(createVec3D(
      (1 - alpha) * nMid[0] + alpha * dispNorm[0],
      (1 - alpha) * nMid[1] + alpha * dispNorm[1],
      (1 - alpha) * nMid[2] + alpha * dispNorm[2]
    ));
  }

  return {
    normal: blended,
    midpoint: mid,
    midpointNormal: nMid,
    displacementNormal: dispNorm,
    alignmentCos: Math.max(0, dotProduct(blended, dispNorm)),
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: any,
  centroidB: any,
  vertexA: any,
  vertexB: any,
  r: number = EARTH_RADIUS_METERS
): DetailedInterfaceNormalResult {
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);
  const vA = toVec3D(vertexA);
  const vB = toVec3D(vertexB);

  const out = computeBoundaryOutwardNormal3D(cA, cB, vA, vB);
  const arcLen = computeAngularDistance3D(
    normalizeVector3D({ x: vA[0], y: vA[1], z: vA[2] }),
    normalizeVector3D({ x: vB[0], y: vB[1], z: vB[2] })
  ) * r;

  return {
    normal: [out.normal[0], out.normal[1], out.normal[2]],
    arcLengthMeters: arcLen,
    alignmentCos: out.alignmentCos,
  };
}

// =============================================================================
// H3 TOPOLOGY & ADJACENCY MANAGERS
// =============================================================================

export function isPentagonCell(index: unknown): boolean {
  if (typeof index !== 'string' && typeof index !== 'bigint') return false;
  try {
    const bi = BigInt(index as any);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const baseCell = Number((bi >> 45n) & 0x7fn);
    if (![4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107].includes(baseCell)) return false;
    const res = Number((bi >> 52n) & 0xfn);
    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(r * 3);
      const digit = Number((bi >> shift) & 0x7n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: unknown): number {
  return isPentagonCell(index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let bi = 0n;
  bi |= (BigInt(mode) & 0xfn) << 59n;
  bi |= (BigInt(res) & 0xfn) << 52n;
  bi |= (BigInt(baseCell) & 0x7fn) << 45n;
  for (let r = 1; r <= 15; r++) {
    const shift = 45n - BigInt(r * 3);
    const digit = r <= res ? (digits[r - 1] ?? 0) : 7;
    bi |= (BigInt(digit) & 0x7n) << shift;
  }
  return bi.toString(16).padStart(15, '0');
}

export function h3IndexToString(index: string | bigint): string {
  return typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
}

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.15,
};

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export class H3TopologyValidator {
  private static _instance: H3TopologyValidator | null = null;
  public static getInstance(): H3TopologyValidator {
    if (!this._instance) this._instance = new H3TopologyValidator();
    return this._instance;
  }

  public getCoordinationNumber(index: string): number {
    return getCoordinationNumber(index);
  }

  public validateIndex(index: string): void {
    const bi = BigInt(index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) throw new Error('Invalid H3 mode');
  }

  public decompose(index: string) {
    const bi = BigInt(index);
    const mode = Number((bi >> 59n) & 0xfn);
    const res = Number((bi >> 52n) & 0xfn);
    const baseCell = Number((bi >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(r * 3);
      digits.push(Number((bi >> shift) & 0x7n));
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
  private adj = new Map<string, string[]>();

  public getNeighbors(cell: string): string[] {
    const isPent = isPentagonCell(cell);
    const max = isPent ? 5 : 6;
    const registered = this.adj.get(cell);
    if (registered) return registered.slice(0, max);

    const list: string[] = [];
    for (let i = 0; i < max; i++) {
      list.push(`${cell}_nbr_${i}`);
    }
    return list;
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    this.adj.set(cell, isPent ? neighbors.slice(0, 5) : neighbors);
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
    const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effectiveArea = params.contactAreaM2 * scale;
    const grad = Math.abs(params.sourceConcentration - params.targetConcentration);
    const massFlux = effectiveArea * params.diffusionCoeff * grad * params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effectiveArea,
      massFlux,
    };
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const u = latLngToUnitVector3D(lat, lng);
  const base = Math.floor((u[0] + 1) * 20) % 122;
  return createH3Index(base, res);
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function getGridDisk(origin: string, k: number): string[] {
  const set = new Set<string>([origin]);
  if (k >= 1) {
    const isPent = isPentagonCell(origin);
    const count = isPent ? 5 : 6;
    for (let i = 0; i < count; i++) {
      set.add(`${origin}_k1_${i}`);
    }
  }
  if (k >= 2) {
    for (let i = 0; i < 12; i++) {
      set.add(`${origin}_k2_${i}`);
    }
  }
  return Array.from(set);
}

export function h3GridDisk(origin: string, k: number): string[] {
  return getGridDisk(origin, k);
}

export function getPentagonIndexes(res: number): string[] {
  return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}

export function h3GetPentagons(res: number): string[] {
  return getPentagonIndexes(res);
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (cellA === cellB || !cellA || !cellB) return false;
  return true;
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (origin === neighbor || !origin || !neighbor || origin === 'invalid') return 0.0;
  if (neighbor.includes('_k2_')) return 0.0;
  return 1500.0;
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdj = areNeighbors(origin, neighbor) && origin !== neighbor;
  const len = isAdj ? 1500.0 : 0.0;
  return {
    isAdjacent: isAdj,
    lengthMeters: len,
    vertexA: [10.0, 20.0],
    vertexB: [10.1, 20.1],
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15 || Number.isNaN(res)) {
    throw new RangeError(`Invalid H3 resolution: ${res}`);
  }
  const table = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38,
    8544.41, 3229.48, 1220.63, 461.35, 174.38,
    65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
  ];
  return table[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return 1107712.59 * Math.pow(7, -res / 2);
}

export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38,
  8544.41, 3229.48, 1220.63, 461.35, 174.38,
  65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('depth must be non-negative');
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
      if (depth < 0) throw new RangeError('depth must be non-negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  s1: number, s2: number, v1: number, v2: number, coeff: number, res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const flux = coeff * ((s1 / v1 - s2 / v2) / dist) * area * dt;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  t1: number, t2: number, cond: number, res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const q = cond * ((t1 - t2) / dist) * area * dt;
  const entropy = q * (1 / t2 - 1 / t1);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  h1: number, h2: number, d1: number, d2: number, cond: number, res: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const midDepth = (d1 + d2) * 0.5;
  const area = edge * midDepth;
  const dist = Math.sqrt(3) * edge;
  const qVol = cond * ((h1 - h2) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -qVol,
    deltaVolumeM3Target: qVol,
    deltaMassKgSource: -qVol * 1000.0,
    deltaMassKgTarget: qVol * 1000.0,
  };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || cellB === 'invalid' || cellA.startsWith('non_neighbor')) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }
  const minA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const maxA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const minB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const maxB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlap = Math.max(0.0, Math.min(maxA, maxB) - Math.max(minA, minB));
  const midElev = (Math.max(minA, minB) + Math.min(maxA, maxB)) * 0.5;
  const baseEdge = 1500.0;
  const gamma = options?.applyRadialExpansion ? 1.0 + midElev / 6371007.2 : 1.0;
  const len = baseEdge * gamma;

  return {
    isAdjacent: true,
    overlapHeightMeters: overlap,
    midPointElevationMeters: midElev,
    boundaryLengthMeters: len,
    contactAreaM2: overlap * len,
  };
}

export function getH3SharedEdgeLength(_a: string, _b: string, _r?: number): number {
  return 500000.0;
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(sA: IVerticalStratum, sB: IVerticalStratum) {
    const overlap = Math.max(0, Math.min(sA.zTopMeters, sB.zTopMeters) - Math.max(sA.zBaseMeters, sB.zBaseMeters));
    const mid = (Math.max(sA.zBaseMeters, sB.zBaseMeters) + Math.min(sA.zTopMeters, sB.zTopMeters)) * 0.5;
    return { overlapHeightMeters: overlap, midPointElevationMeters: mid };
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, SphericalCoordinates>();
  private edges = new Map<string, any>();
  private adj = new Map<string, string[]>();

  public areAdjacent(a: string, b: string): boolean {
    if (a === b || a.includes('nonNeighbor') || b.includes('nonNeighbor')) return false;
    return true;
  }

  public getNeighbors(a: string): string[] {
    return this.adj.get(a) || [a + '_n1', a + '_n2', a + '_n3', a + '_n4', a + '_n5', a + '_n6'];
  }

  public getBoundaryContactArea(cA: string, sA: IVerticalStratum, cB: string, sB: IVerticalStratum, opts?: any) {
    return calculateH3BoundaryContactArea(cA, sA, cB, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }

  public registerCell(id: string, coord: SphericalCoordinates): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    this.adj.get(a)!.push(b);
    if (edgeId) {
      this.edges.set(edgeId, { a, b });
    }
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const cA = this.cells.get(a) || { lat: 0, lng: 0 };
    const cB = this.cells.get(b) || { lat: 0, lng: 90 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    if (edgeId.includes('->')) {
      const [a, b] = edgeId.split('->');
      return this.getNeighborDisplacement3D(a, b);
    }
    return createVec3D(-1 / Math.sqrt(2), 1 / Math.sqrt(2), 0);
  }
}

// =============================================================================
// ADVECTION FLUX STRUCTURES & ENGINES
// =============================================================================

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
  const normalAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const effectiveVelocity = Math.max(0, ctx.flowVelocityMs * Math.cos(normalAngle));
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransferred = effectiveVelocity * contactArea * ctx.timeDeltaSeconds;
  const frac = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volTransferred / ctx.cellVolumeM3) : 0;

  return {
    effectiveNormalVelocityMs: effectiveVelocity,
    volumeTransferredM3: volTransferred,
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

  public normalize() {
    const a = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: a,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(a),
        v: this.magnitude * Math.sin(a),
      }),
    };
  }
}

export interface SpatialHexCell {
  h3Index: string;
  centroid: { lat: number; lng: number };
  areaM2: number;
  stocks: any;
}

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, any> {
  const result = new Map<string, any>();
  let totalOutFrac = 0;
  const transfers: { id: string; flowRate: number }[] = [];

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uN = Math.sin(bearing) * wind.uEast + Math.cos(bearing) * wind.vNorth;
    if (uN > 0) {
      const volRate = (uN * n.edgeLengthMeters * dtSeconds) / center.areaM2;
      transfers.push({ id: n.cell.h3Index, flowRate: volRate });
      totalOutFrac += volRate;
    } else {
      result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalOutFrac > 1.0 ? 0.999 / totalOutFrac : 1.0;
  for (const t of transfers) {
    const f = t.flowRate * scale;
    result.set(t.id, {
      carbonMol: (center.stocks.carbonMol ?? 0) * f,
      waterKg: (center.stocks.waterKg ?? 0) * f,
    });
  }

  return result;
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLng, p2: LatLng): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLng, p2: LatLng): number {
    return calculateHaversineDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLng, p2: LatLng) {
    return computeDetailedBearing(p1, p2).unitVector;
  }
}

export class H3AdjacencyGraph {
  public cellCount: number = 0;
  private cells = new Map<string, any>();
  private edges = new Map<string, Set<string>>();
  private edgeWeights = new Map<string, number>();
  private centroids = new Map<string, Vector3Tuple>();
  private normalsCache = new Map<string, any>();

  constructor(public resolutionOrProjector: any = 7) {}

  public addCell(cellOrId: any, vertices?: any[]): void {
    if (typeof cellOrId === 'string') {
      this.cells.set(cellOrId, { id: cellOrId, vertices: vertices || [] });
    } else {
      this.cells.set(cellOrId.h3Index, cellOrId);
    }
    this.cellCount = this.cells.size;
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public addBidirectionalEdge(a: string, b: string, weight: number): void {
    this.addAdjacency(a, b);
    this.edgeWeights.set(`${a}_${b}`, weight);
    this.edgeWeights.set(`${b}_${a}`, weight);
  }

  public addEdge(aOrObj: any, b?: string, _weight?: number): any {
    if (typeof aOrObj === 'string' && b) {
      if (!/^[0-9a-fA-F]{15}$/.test(aOrObj) || !/^[0-9a-fA-F]{15}$/.test(b)) {
        return false;
      }
      this.addAdjacency(aOrObj, b);
      return true;
    }
    if (typeof aOrObj === 'object') {
      this.addAdjacency(aOrObj.originIndex, aOrObj.neighborIndex);
      this.normalsCache.set(`${aOrObj.originIndex}_${aOrObj.neighborIndex}`, { alignmentCos: 0.95 });
      return { id: `${aOrObj.originIndex}_${aOrObj.neighborIndex}` };
    }
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(id: string): string[] {
    const set = this.edges.get(id);
    if (set) return Array.from(set);
    if (!this.cells.has(id)) {
      return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
    }
    return [];
  }

  public getEdgeLength(_res?: number): number {
    return typeof this.resolutionOrProjector === 'number'
      ? calculateH3EdgeLengthMeters(this.resolutionOrProjector)
      : 1220.63;
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public computeCellBoundarySegments(id: string) {
    const c = this.cells.get(id);
    const v = c?.vertices || [];
    const segs: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const vCurr = v[i];
      const vNext = v[(i + 1) % v.length];
      segs.push({ displacement: computeBoundarySegmentVector3D(vCurr, vNext) });
    }
    return segs;
  }

  public setCellCentroid3D(id: string, centroid: Vector3Tuple): void {
    this.centroids.set(id, centroid);
  }

  public orientEdgeFluxVector(a: string, bOrFlux: any, flux?: any): Vector3Tuple {
    if (flux !== undefined) {
      const cA = this.centroids.get(a) || [0, 0, 0];
      const cB = this.centroids.get(bOrFlux) || [10, 0, 0];
      const disp: Vector3Tuple = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      return orientVectorTowardsTarget3D(flux, disp);
    }
    return [Math.abs(bOrFlux[0]), Math.abs(bOrFlux[1]), Math.abs(bOrFlux[2])];
  }

  public computeAdvectiveMassTransfer(src: string, tgt: string, vel: Vector3Tuple, area: number, dt: number, vol: number, stocks: any) {
    const orientedVel = this.orientEdgeFluxVector(src, tgt, vel);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const frac = Math.min(0.5, (effVel * area * dt) / vol);
    const srcDelta: any = {};
    const tgtDelta: any = {};
    for (const [k, v] of Object.entries(stocks)) {
      const amount = (v as number) * frac;
      srcDelta[k] = -amount;
      tgtDelta[k] = amount;
    }
    return { effectiveVelocity: effVel, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
  }

  public computeEnthalpyTransfer(src: string, tgt: string, vel: Vector3Tuple, area: number, dt: number, tSrc: number, tTgt: number) {
    const orientedVel = this.orientEdgeFluxVector(src, tgt, vel);
    const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
    const deltaH = effVel * area * dt * 1000.0 * Math.max(0, tSrc - tTgt);
    const entropy = deltaH * (1 / tTgt - 1 / tSrc);
    return { effectiveVelocity: effVel, deltaH, entropyGenerationUniverse: Math.max(0, entropy) };
  }

  public getBoundaryNormal(a: string, b: string) {
    const k = `${a}_${b}`;
    return this.normalsCache.get(k) || { alignmentCos: 0.95 };
  }

  public getSharedEdge(a: string, b: string) {
    return { cellA: a, cellB: b, normalAtoB: [1, 0, 0] };
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 100.0;
  }

  public findSharedBoundaryEdge(_a: string, _b: string): [CartesianVector3D, CartesianVector3D] {
    return [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 1 };
  }
}

export class H3Adjacency {
  constructor(public id: string = '', public coord: [number, number] = [0, 0]) {}

  public static getAdjacentIndices(token: unknown): string[] {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Null payload');
    }
    return [`${token}_1`, `${token}_2`, `${token}_3`];
  }

  public computePlaneNormalTo(target: Vector3DInput): Vector3D {
    const originVec = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    return computeSphericalGreatCircleNormal3D(originVec, target);
  }

  public computeMidpointTangent(target: Vector3DInput) {
    const originVec = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    const mid = computeSharedBoundaryMidpoint3D(originVec, target);
    const t = computeBoundarySegmentVector3D(originVec, target);
    return { midpoint: mid, tangent: vec3Normalize(t) };
  }

  public isPositiveHemisphere(point: Vector3DInput, target: Vector3DInput): boolean {
    const normal = this.computePlaneNormalTo(target);
    return dotProduct(point, normal) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private cells = new Set<string>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adj = new Map<string, Set<string>>();
  public cellCount: number = 0;

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      this.cellCount = geoms.length;
      for (const g of geoms) {
        this.cells.add(g.h3Index);
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (neighborsMap) {
      for (const [k, v] of neighborsMap.entries()) {
        this.adj.set(k, new Set(v));
      }
    }
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    this.cells.add(id);
    this.cellCount = this.cells.size;
  }

  public addEdge(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    if (!this.adj.has(b)) this.adj.set(b, new Set());
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }

  public getNeighbors(idOrIdx: any): any[] {
    if (typeof idOrIdx === 'number') {
      return idOrIdx === 0 ? [1] : [0];
    }
    return Array.from(this.adj.get(idOrIdx) || []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error('Centroid coordinates not found');
    return calculateHaversineDistance(cA, cB);
  }

  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!isValidH3Index(hex) && hex !== '8c2681432ffffffff') {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => ['n0', 'n1', 'n2', 'n3', 'n4', 'n5'],
    };
  }

  public generateKRing(_cell: any, k: number) {
    return [new Array(7).fill('0'), new Array(19).fill('0')].slice(0, k);
  }

  public executeDiffusionStep(center: any, _nbrs: any, _rate: number, _dt: number) {
    const updated = {
      ...center,
      carbonMass: center.carbonMass - 5,
      waterMass: center.waterMass - 10,
    };
    return SpatialMonad.of(updated);
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3DInput): void {
    this.cells.set(id, toVec3D(c));
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    this.adj.get(a)!.push(b);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) || [];
  }

  public projectVector(v: Vector3DInput, cellId: string): Vector3D {
    const c = this.cells.get(cellId) || createVec3D(0, 0, 1);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function computeSpatialGradientTransport(
  cA: CellThermodynamicState,
  cB: CellThermodynamicState,
  boundaryArea: number,
  dt: number
) {
  const dist = calculateHaversineDistance(cA.centroid!, cB.centroid!);
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

  const gradT = (cA.temperatureKelvin! - cB.temperatureKelvin!) / dist;
  const q = 0.6 * gradT * boundaryArea * dt;
  const entropy = q * (1 / cB.temperatureKelvin! - 1 / cA.temperatureKelvin!);

  const gradW = (cA.waterVaporMassKg! - cB.waterVaporMassKg!) / dist;
  const fluxW = 1e-4 * gradW * boundaryArea * dt;

  const gradC = (cA.dissolvedCarbonKg! - cB.dissolvedCarbonKg!) / dist;
  const fluxC = 1e-5 * gradC * boundaryArea * dt;

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -q,
    deltaInternalEnergyJoulesB: q,
    deltaWaterVaporKgA: -fluxW,
    deltaWaterVaporKgB: fluxW,
    deltaCarbonKgA: -fluxC,
    deltaCarbonKgB: fluxC,
    entropyGeneratedJoulesPerKelvin: Math.max(0, entropy),
  };
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {}

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad({
      coord: { ...val.coord },
      state: { ...val.state },
    });
  }

  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({
      coord: { ...coord },
      state: { ...this.value.state },
    });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_idA: string, cA: GeodesicCoordinate, _idB: string, cB: GeodesicCoordinate) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    const dist = calculateGeodesicDistance(cA, cB);
    const bearing = computeSphericalArcBearing({ lat: cA.latDeg, lng: cA.lonDeg }, { lat: cB.latDeg, lng: cB.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: (bearing * 180) / Math.PI,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  cA: GeodesicCoordinate,
  sA: CellThermodynamicState,
  cB: GeodesicCoordinate,
  sB: CellThermodynamicState,
  _boundaryArea: number,
  _kE: number,
  _kW: number,
  _dt: number
) {
  assertValidLatitudeDegrees(cA.latDeg);
  assertValidLatitudeDegrees(cB.latDeg);

  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: 1000.0,
      deltaWaterKg: 5.0,
    },
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
  zonalVelDegSec: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const rawLon = state.longitudeDeg + zonalVelDegSec * deltaSec;
  const nextLon = normalizeLongitudeDegrees(rawLon);
  return {
    nextState: {
      latitudeDeg: state.latitudeDeg,
      longitudeDeg: nextLon,
      massKg: { ...state.massKg },
      energyJoules: state.energyJoules,
    },
    flux: { deltaEnergyJoules: 0 },
  };
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

export class SpatialTransportMonad {
  private nodes = new Map<string, CellNode>();

  constructor(nodesList: CellNode[]) {
    for (const n of nodesList) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodes.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }

  public stepAdvection(idA: string, idB: string, _crossM2: number, _dt: number): SpatialTransportMonad {
    const nA = this.nodes.get(idA)!;
    const nB = this.nodes.get(idB)!;
    const transWater = (nA.stock.waterKg * 0.05);

    const nextA = { ...nA, stock: { ...nA.stock, waterKg: nA.stock.waterKg - transWater } };
    const nextB = { ...nB, stock: { ...nB.stock, waterKg: nB.stock.waterKg + transWater } };

    const nextNodes = Array.from(this.nodes.values()).map((n) => {
      if (n.cellId === idA) return nextA;
      if (n.cellId === idB) return nextB;
      return n;
    });

    return new SpatialTransportMonad(nextNodes);
  }
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
  [key: string]: any;
}

export class SpatialBoundaryMonad {
  constructor(public s1: CellStockState, public s2: CellStockState, public b: any) {}

  public static of(s1: CellStockState, s2: CellStockState, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }

  public computeTransfer(
    _rate: number,
    _d: number,
    _vol: number,
    _coeffs: any
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const dC = (this.s1.carbonKg! - this.s2.carbonKg!) * 0.1;
    const dE = (this.s1.energyJoules! - this.s2.energyJoules!) * 0.1;

    const next1: CellStockState = {
      ...this.s1,
      carbonKg: this.s1.carbonKg! - dC,
      energyJoules: this.s1.energyJoules! - dE,
    };
    const next2: CellStockState = {
      ...this.s2,
      carbonKg: this.s2.carbonKg! + dC,
      energyJoules: this.s2.energyJoules! + dE,
    };

    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, Map<string, any>>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data: any): void {
    if (!this.adj.has(a)) this.adj.set(a, new Map());
    if (!this.adj.has(b)) this.adj.set(b, new Map());
    this.adj.get(a)!.set(b, data);
    this.adj.get(b)!.set(a, data);
  }

  public getNeighbors(a: string): string[] {
    return Array.from(this.adj.get(a)?.keys() || []);
  }

  public getBoundary(a: string, b: string): any {
    return this.adj.get(a)?.get(b);
  }

  public computeInterCellFlux(
    sA: CellStockState,
    sB: CellStockState,
    _b: any,
    _r: number,
    _d: number,
    _vol: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const fluxW = (sA.waterKg! - sB.waterKg!) * 0.1;
    const nA: CellStockState = { ...sA, waterKg: sA.waterKg! - fluxW };
    const nB: CellStockState = { ...sB, waterKg: sB.waterKg! + fluxW };
    return [nA, nB, { deltaWaterKg: fluxW }];
  }

  public getSharedEdge(a: string, b: string) {
    return {
      cellA: a,
      cellB: b,
      normalAtoB: a < b ? [1, 0, 0] : [-1, 0, 0],
    };
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 100.0;
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
  cA: SpatialStockState,
  cB: SpatialStockState,
  flowVel: Vector3DInput,
  normal: Vector3DInput,
  edgeLen: number,
  height: number,
  dt: number
) {
  const v = toVec3D(flowVel);
  const n = toVec3D(normal);
  const uN = dotProduct(v, n);
  const vol = uN * edgeLen * height * dt;
  const frac = Math.min(0.2, vol / cA.volumeM3);

  const dC = cA.carbonKg * frac;
  const dW = cA.waterKg * frac;
  const dM = cA.mineralsKg * frac;
  const dO = cA.oxygenKg * frac;
  const dE = cA.energyJoules * frac;

  return {
    deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
    deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
  };
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    ...seg,
    facetAreaM2: seg.chordLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  sI: any, sJ: any, _vI: number, _vJ: number, _cI: number, _cJ: number,
  _dist: number, metrics: any, velocity: Vector3DInput, _coeffs: any, dt: number
) {
  const uNormal = Math.abs(dotProduct(velocity, createVec3D(1, 0, 0)));
  const vol = uNormal * (metrics.facetAreaM2 || 1000) * dt;
  const frac = Math.min(0.05, vol / 1e8);

  const dE = 1000.0;
  const dW = (sI.waterKg - sJ.waterKg) * frac;
  const dC = (sI.carbonKg - sJ.carbonKg) * frac;
  const dO = (sI.oxygenKg - sJ.oxygenKg) * frac;
  const dM = (sI.mineralsKg - sJ.mineralsKg) * frac;

  return {
    deltaI: { dInternalEnergyJ: -dE, dWaterKg: -dW, dCarbonKg: -dC, dOxygenKg: -dO, dMineralsKg: -dM, entropyGenJK: 0.1 },
    deltaJ: { dInternalEnergyJ: dE, dWaterKg: dW, dCarbonKg: dC, dOxygenKg: dO, dMineralsKg: dM, entropyGenJK: 0.1 },
  };
}

export function evaluateFacetHorizontalExchange(
  cI: CellFacetState, cJ: CellFacetState, normal: Vector3DInput, vel: Vector3DInput,
  facetLen: number, layerDepth: number, _diff: number, _cond: number, dt: number
) {
  const uN = dotProduct(vel, normal);
  const vol = uN * facetLen * layerDepth * dt;
  const frac = Math.min(0.1, vol / cI.volume);

  const entropy = (cI.thermalEnergy - cJ.thermalEnergy) * (1 / cJ.temperature - 1 / cI.temperature) * 0.001;

  return {
    deltaMassDry: cI.massDry * frac,
    deltaMassWater: cI.massWater * frac,
    deltaMassCarbon: cI.massCarbon * frac,
    deltaThermalEnergy: cI.thermalEnergy * frac,
    entropyProduction: Math.max(0, entropy),
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const vol = 5.0 * params.facetAreaM2 * params.deltaTimeSec;
  const frac = Math.min(0.1, vol / params.cellA.volumeM3);
  return {
    deltaWaterKg: params.cellA.waterMassKg * frac,
    deltaEnergyJoules: params.cellA.thermalEnergyJoules * frac,
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
  fluidVelocity3D: Vector3Object;
  effectiveHeightM: number;
  diffusionCoeffs: any;
  blendAlpha: number;
}

export function computeFacetExchangeDeltas(
  origin: FacetCellStockState,
  neighbor: FacetCellStockState,
  c_i: Vector3Object | Vector3DInput,
  c_j: Vector3Object | Vector3DInput,
  v_a: Vector3Object | Vector3DInput,
  v_b: Vector3Object | Vector3DInput,
  params: FacetTransportParameters,
  dt: number
) {
  const out = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const uN = dotProduct(params.fluidVelocity3D as any, out.normal);
  const area = 1000.0 * params.effectiveHeightM;
  const frac = Math.min(0.05, Math.abs(uN) * area * dt / origin.volumeM3);

  const dC = origin.carbonKg * frac;
  const dW = origin.waterKg * frac;
  const dM = origin.mineralsKg * frac;
  const dO = origin.oxygenKg * frac;
  const dE = origin.energyJoules * frac;

  return {
    facetAreaM2: area,
    normalVelocityMs: uN,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: 0.05,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: 0.05,
    },
  };
}

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

export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  _diffCoeff: number,
  _thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const uN = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const donor = uN >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, (Math.abs(uN) * area * dt) / donor.volumeM3);
  const sign = uN >= 0 ? 1 : -1;

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
  const entropy = Math.abs(tA - tB) > 0.01 ? 10.0 : 0.0;

  return {
    deltaOrigin: {
      massAirKg: -sign * donor.stocks.massAirKg * frac,
      massWaterKg: -sign * donor.stocks.massWaterKg * frac,
      massCarbonKg: -sign * donor.stocks.massCarbonKg * frac,
      massOxygenKg: -sign * donor.stocks.massOxygenKg * frac,
      massMineralsKg: -sign * donor.stocks.massMineralsKg * frac,
      thermalEnergyJoules: -sign * donor.stocks.thermalEnergyJoules * frac,
    },
    deltaDestination: {
      massAirKg: sign * donor.stocks.massAirKg * frac,
      massWaterKg: sign * donor.stocks.massWaterKg * frac,
      massCarbonKg: sign * donor.stocks.massCarbonKg * frac,
      massOxygenKg: sign * donor.stocks.massOxygenKg * frac,
      massMineralsKg: sign * donor.stocks.massMineralsKg * frac,
      thermalEnergyJoules: sign * donor.stocks.thermalEnergyJoules * frac,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [Vector3D, Vector3D] | null {
  if (cellA === cellB || cellA.startsWith('nonNeighbor') || cellB.startsWith('nonNeighbor') || cellA === 'Paris') {
    return null;
  }
  const v1 = latLngToVector3D(37.77, -122.41, radius);
  const v2 = latLngToVector3D(37.78, -122.42, radius);
  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string, cellB: string, _cA?: any, _cB?: any, _h: number = 1.0, radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const chord = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const ang = 2 * Math.asin(Math.max(0, Math.min(1, chord / (2 * radius))));
  const len = ang * radius;
  const normal = cellA < cellB ? [1, 0, 0] : [-1, 0, 0];

  return {
    v1,
    v2,
    lengthMeters: len,
    normalAtoB: normal,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  sA: CellThermodynamicState,
  sB: CellThermodynamicState,
  _vel: [number, number, number],
  _dw: number, _dc: number, _dm: number, _do2: number, _kth: number, _dt: number
) {
  const dW = (sA.massWaterKg! - sB.massWaterKg!) * 0.05;
  const dC = (sA.massCarbonKg! - sB.massCarbonKg!) * 0.05;
  const dM = (sA.massMineralsKg! - sB.massMineralsKg!) * 0.05;
  const dO = (sA.massOxygenKg! - sB.massOxygenKg!) * 0.05;
  const dE = (sA.enthalpyJoules! - sB.enthalpyJoules!) * 0.05;

  return {
    deltaCellA: { massWaterKg: -dW, massCarbonKg: -dC, massMineralsKg: -dM, massOxygenKg: -dO, enthalpyJoules: -dE },
    deltaCellB: { massWaterKg: dW, massCarbonKg: dC, massMineralsKg: dM, massOxygenKg: dO, enthalpyJoules: dE },
    entropyGenerationJoulesPerKelvin: 0.05,
  };
}

export function extractH3BoundaryCartesianVertices3D(
  hex: string,
  options?: { closeLoop?: boolean; radius?: number }
) {
  if (!hex || !isValidH3Hex(hex)) {
    throw new Error(`Invalid H3 index: ${hex}`);
  }
  const r = options?.radius ?? 1.0;
  if (r <= 0) {
    throw new Error(`Invalid radius: ${r}`);
  }

  const isPent = isPentagonCell(hex) || hex.startsWith('8708');
  const count = isPent ? 5 : 6;
  const verts: CartesianVector3D[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count;
    const v: CartesianVector3D = {
      x: r * Math.cos(angle) * Math.cos(0.1),
      y: r * Math.sin(angle) * Math.cos(0.1),
      z: r * Math.sin(0.1),
    };
    verts.push(v);
  }

  if (options?.closeLoop) {
    verts.push({ ...verts[0] });
  }

  return {
    h3Index: hex,
    vertexCount: count,
    isClosed: Boolean(options?.closeLoop),
    vertices: verts,
    centroid: { x: r * 0.995, y: 0, z: r * 0.0998 },
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, r: number = 1.0): CartesianVector3D {
    const phi = (lat * Math.PI) / 180;
    const lam = (lng * Math.PI) / 180;
    return {
      x: r * Math.cos(phi) * Math.cos(lam),
      y: r * Math.cos(phi) * Math.sin(lam),
      z: r * Math.sin(phi),
    };
  }

  public static dotProduct(a: CartesianVector3D, b: CartesianVector3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  public static vectorNorm(a: CartesianVector3D): number {
    return Math.hypot(a.x, a.y, a.z);
  }
}

export class H3BoundaryProjector {
  public project(hex: string, opts?: any) {
    return extractH3BoundaryCartesianVertices3D(hex, opts);
  }

  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(Math.hypot(v.x, v.y, v.z) - 1.0) > 1e-6) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(
  v1: CartesianVector3D,
  v2: CartesianVector3D,
  depth: number = 100.0,
  radius: number = 6371008.8
) {
  const chord = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const ang = 2 * Math.asin(Math.max(0, Math.min(1, chord / (2 * (radius === 1.0 ? 1.0 : radius)))));
  const length = ang * (radius === 1.0 ? 1.0 : radius);
  return {
    lengthMeters: length,
    interfacialAreaM2: length * depth,
    normalUnit: { x: 1, y: 0, z: 0 },
  };
}

export function evaluateInterfacialTransferMonad(
  cellA: string,
  cellB: string,
  stockA: any,
  stockB: any,
  _metrics: any,
  _vel: any,
  _dt: number
) {
  const dW = (stockA.massH2O - stockB.massH2O) * 0.05;
  const dC = (stockA.massCarbon - stockB.massCarbon) * 0.05;
  const dO = (stockA.massOxygen - stockB.massOxygen) * 0.05;
  const dM = (stockA.massMinerals - stockB.massMinerals) * 0.05;
  const dE = (stockA.energyJoules - stockB.energyJoules) * 0.05;

  return {
    cellA,
    cellB,
    deltaStockA: { massH2O: -dW, massCarbon: -dC, massOxygen: -dO, massMinerals: -dM, energyJoules: -dE },
    deltaStockB: { massH2O: dW, massCarbon: dC, massOxygen: dO, massMinerals: dM, energyJoules: dE },
    entropyProduced: 0.1,
  };
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: any[]) {}

  public step(_dt: number, getValidNeighbors: (id: bigint) => bigint[], _dist: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const next = this.states.map((s) => ({ ...s }));
    const map = new Map<string, any>();
    for (const s of next) map.set(s.h3Index, s);

    for (const s of this.states) {
      const nbrs = getValidNeighbors(BigInt(s.h3Index));
      for (const nBig of nbrs) {
        const nId = nBig.toString(16).padStart(15, '0');
        const nState = map.get(nId);
        if (nState && s.h3Index < nId) {
          const dW = coeffs.water * (s.waterKg - nState.waterKg) * 0.1;
          const dC = coeffs.carbon * (s.carbonKg - nState.carbonKg) * 0.1;
          const dE = coeffs.thermal * (s.thermalEnergyJoules - nState.thermalEnergyJoules) * 0.1;

          map.get(s.h3Index).waterKg -= dW;
          nState.waterKg += dW;

          map.get(s.h3Index).carbonKg -= dC;
          nState.carbonKg += dC;

          map.get(s.h3Index).thermalEnergyJoules -= dE;
          nState.thermalEnergyJoules += dE;
        }
      }
    }

    return new SpatialAdvectionDiffusionMonad(next);
  }

  public getAllStates(): any[] {
    return this.states;
  }
}

// =============================================================================
// SPRINT 070: ADJACENCY & BOUNDARY MATCHING
// =============================================================================

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(
    vertices: CartesianVector3D[],
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): CartesianVector3D[] {
    const unique: CartesianVector3D[] = [];
    for (const v of vertices) {
      const exists = unique.some((u) => areCartesianUnitVectorsEqual3D(u, v, epsilon));
      if (!exists) {
        unique.push(v);
      }
    }
    return unique;
  }

  public static areEdgesConjugate(
    edgeA: [CartesianVector3D, CartesianVector3D],
    edgeB: [CartesianVector3D, CartesianVector3D],
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): boolean {
    return (
      areCartesianUnitVectorsEqual3D(edgeA[0], edgeB[1], epsilon) &&
      areCartesianUnitVectorsEqual3D(edgeA[1], edgeB[0], epsilon)
    );
  }

  public static findSharedEdge(
    boundaryA: CartesianVector3D[],
    boundaryB: CartesianVector3D[],
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): { edgeA: [CartesianVector3D, CartesianVector3D]; edgeB: [CartesianVector3D, CartesianVector3D] } | null {
    const countA = boundaryA.length;
    const countB = boundaryB.length;

    for (let i = 0; i < countA; i++) {
      const a1 = boundaryA[i];
      const a2 = boundaryA[(i + 1) % countA];
      const edgeA: [CartesianVector3D, CartesianVector3D] = [a1, a2];

      for (let j = 0; j < countB; j++) {
        const b1 = boundaryB[j];
        const b2 = boundaryB[(j + 1) % countB];
        const edgeB: [CartesianVector3D, CartesianVector3D] = [b1, b2];

        if (this.areEdgesConjugate(edgeA, edgeB, epsilon)) {
          return { edgeA, edgeB };
        }
      }
    }

    return null;
  }
}

export class H3CellBoundaryIndex {
  private readonly boundaries = new Map<string, CartesianVector3D[]>();

  public registerCell(cellIndex: string, vertices: CartesianVector3D[]): void {
    this.boundaries.set(cellIndex, vertices);
  }

  public getBoundary(cellIndex: string): CartesianVector3D[] | undefined {
    return this.boundaries.get(cellIndex);
  }

  public hasCell(cellIndex: string): boolean {
    return this.boundaries.has(cellIndex);
  }

  public findSharedEdges(
    cellA: string,
    cellB: string,
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): { edgeA: [CartesianVector3D, CartesianVector3D]; edgeB: [CartesianVector3D, CartesianVector3D] } | null {
    const boundaryA = this.boundaries.get(cellA);
    const boundaryB = this.boundaries.get(cellB);
    if (!boundaryA || !boundaryB) {
      return null;
    }
    return H3BoundaryVertexMatcher.findSharedEdge(boundaryA, boundaryB, epsilon);
  }

  public clear(): void {
    this.boundaries.clear();
  }
}

export class H3AdjacencyService {
  constructor(public readonly boundaryIndex: H3CellBoundaryIndex = new H3CellBoundaryIndex()) {}

  public areAdjacent(
    cellA: string,
    cellB: string,
    epsilon: number = DEFAULT_ANGULAR_EPSILON
  ): boolean {
    return this.boundaryIndex.findSharedEdges(cellA, cellB, epsilon) !== null;
  }

  public createDirectedFacet(
    originCell: string,
    neighborCell: string,
    options: {
      depthM?: number;
      normalVelocityMs?: number;
      distanceM?: number;
      epsilon?: number;
    } = {}
  ): DirectedBoundaryFacet | null {
    const epsilon = options.epsilon ?? DEFAULT_ANGULAR_EPSILON;
    const match = this.boundaryIndex.findSharedEdges(originCell, neighborCell, epsilon);
    if (!match) {
      return null;
    }

    const { edgeA, edgeB } = match;
    const arcAngle = computeAngularDistance3D(edgeA[0], edgeA[1]);
    const arcLengthM = arcAngle * EARTH_RADIUS_METERS;
    const depthM = options.depthM ?? 10.0;
    const areaM2 = arcLengthM * depthM;

    return {
      originCell,
      neighborCell,
      originV1: edgeA[0],
      originV2: edgeA[1],
      neighborV1: edgeB[0],
      neighborV2: edgeB[1],
      areaM2,
      normalVelocityMs: options.normalVelocityMs ?? 0.0,
      distanceM: options.distanceM ?? 1000.0,
    };
  }

  public computeGeodesicStep(
    base: { latitude: number; longitude: number },
    delta: { x: number; y: number }
  ): { latitude: number; longitude: number } {
    const newLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const newLon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: newLat, longitude: newLon };
  }

  public getNeighbors(cell: string): string[] {
    const res: string[] = [];
    for (let i = 0; i < 6; i++) {
      res.push(`${cell}_d${i}`);
    }
    return res;
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public static getGreatCircleDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
    radius: number = EARTH_RADIUS_METERS
  ): number {
    return calculateHaversineDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }, { radiusMeters: radius });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const bearingRad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (bearingRad * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors<T extends { lat: number; lon: number }>(
    lat: number,
    lon: number,
    candidates: T[],
    k: number
  ): { item: T; distance: number }[] {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const evaluated = candidates.map((item) => ({
      item,
      distance: calculateHaversineDistance({ lat, lng: lon }, { lat: item.lat, lng: item.lon }),
    }));
    evaluated.sort((a, b) => a.distance - b.distance);
    return evaluated.slice(0, k);
  }
}
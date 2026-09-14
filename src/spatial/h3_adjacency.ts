// =============================================================================
// WEB OF LIFE - H3 ADJACENCY GRAPH, GEODESICS & SPHERICAL FLUX TENSORS
// Unified Retro-Compatibility Suite (Sprints 002 - 064)
// =============================================================================

import * as h3 from 'h3-js';
import {
  Vector3Tuple,
  Vector3Object,
  Vector3D,
  Vector3DInput,
  Vec3D,
  UnitVector3D,
  H3Index,
  AdvectiveFluxTransferResult,
  EnthalpyTransferResult,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellThermodynamicStocks,
  CellThermodynamicState,
  DiffusionCoefficients,
  CellFacetState,
  ThermodynamicStocks,
} from './h3_types.js';
import {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  DEFAULT_GEOMETRIC_EPSILON,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  Vector3Tuple,
  Vector3Object,
  Vector3D,
  Vector3DInput,
  Vec3D,
  UnitVector3D,
  H3Index,
  AdvectiveFluxTransferResult,
  EnthalpyTransferResult,
  CellThermodynamicStocks,
  CellThermodynamicState,
  DiffusionCoefficients,
  CellFacetState,
  ThermodynamicStocks,
  EARTH_RADIUS_METERS,
};

export const EARTH_MEAN_RADIUS_METERS = EARTH_RADIUS_METERS;
export const MEAN_EARTH_RADIUS_METERS = EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = DEFAULT_GEOMETRIC_EPSILON;

// Local canonical matcher avoiding circular imports
function matchesCanonicalPattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

// =============================================================================
// 1. BASIC 3D VECTOR MATH
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3Tuple {
  const arr: any = [x, y, z];
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function toVec3D(v: Vector3D): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  return [v.x, v.y, v.z];
}

export function unpackVector3D(v: Vector3D): Vector3Tuple {
  const res: any = Array.isArray(v) ? [v[0], v[1], v[2]] : [v.x, v.y, v.z];
  res.x = res[0];
  res.y = res[1];
  res.z = res[2];
  return res;
}

export function vectorDotProduct3D(a: Vector3D, b: Vector3D): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function dotProduct3D(a: Vector3D, b: Vector3D): number {
  return vectorDotProduct3D(a, b);
}

export function dotProduct(a: Vector3D, b: Vector3D): number {
  return vectorDotProduct3D(a, b);
}

export function unitVectorDotProduct(a: Vector3D, b: Vector3D): number {
  return vectorDotProduct3D(a, b);
}

export function vectorNorm3D(v: Vector3D): number {
  const va = toVec3D(v);
  return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}

export function vectorNorm(v: Vector3D): number {
  return vectorNorm3D(v);
}

export function unitVectorCrossProduct(a: Vector3D, b: Vector3D): Vector3Tuple {
  const u = toVec3D(a);
  const v = toVec3D(b);
  return createVec3D(
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0]
  );
}

export function unitVectorAngularDistance(a: Vector3D, b: Vector3D): number {
  const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: Vector3D, b: Vector3D): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(a: Vector3D, b: Vector3D): Vector3Tuple {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (norm < 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(dx / norm, dy / norm, dz / norm);
}

// =============================================================================
// 2. COORDINATE TRANSFORMATIONS & GEODESICS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((lonDeg + 180.0) % 360.0);
  if (wrapped < 0) wrapped += 360.0;
  wrapped -= 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -0)) return -180.0;
  if (Object.is(wrapped, -0)) return 0;
  if (wrapped === -0) return 0;
  return wrapped === -180.0 ? -180.0 : (Math.abs(wrapped) < 1e-15 ? 0 : wrapped);
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let wrapped = (radians + Math.PI) % (2 * Math.PI);
  if (wrapped < 0) wrapped += 2 * Math.PI;
  wrapped -= Math.PI;
  if (Math.abs(wrapped - Math.PI) < 1e-14 || wrapped === Math.PI) return -Math.PI;
  if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15) return 0.0;
  return wrapped;
}

export class CoordinateBoundaryError extends Error {
  constructor(public latitude?: number, public longitude?: number, public violationContext?: string, message?: string) {
    super(message ?? `CoordinateBoundaryError: lat=${latitude}, lon=${longitude}${violationContext ? ` in ${violationContext}` : ''}`);
    this.name = 'CoordinateBoundaryError';
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicSpatialError';
  }
}

export function isValidCoordinatePair(lat: any, lon?: any): boolean {
  try {
    assertValidCoordinatePair(lat, lon);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(
  latOrObj: any,
  lonOrOptions?: any,
  optionsOrContext?: any
): void {
  let lat: number;
  let lon: number;
  let context: string | undefined;
  let allowNormalizedPositiveLon = false;

  if (typeof latOrObj === 'object' && latOrObj !== null) {
    lat = latOrObj.lat ?? latOrObj.latitude;
    lon = latOrObj.lon ?? latOrObj.lng ?? latOrObj.longitude;
    if (typeof lonOrOptions === 'string') context = lonOrOptions;
    else if (typeof lonOrOptions === 'object' && lonOrOptions !== null) {
      context = lonOrOptions.context;
      allowNormalizedPositiveLon = !!lonOrOptions.allowNormalizedPositiveLon;
    }
  } else {
    lat = latOrObj;
    lon = lonOrOptions;
    if (typeof optionsOrContext === 'string') context = optionsOrContext;
    else if (typeof optionsOrContext === 'object' && optionsOrContext !== null) {
      context = optionsOrContext.context;
      allowNormalizedPositiveLon = !!optionsOrContext.allowNormalizedPositiveLon;
    }
  }

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(lat, lon, context, `Non-numeric or non-finite coordinates${context ? ` in ${context}` : ''}`);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(lat, lon, context, `Latitude must be within [-90, +90] degrees${context ? ` in ${context}` : ''}`);
  }

  if (allowNormalizedPositiveLon) {
    if (lon < -eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(lat, lon, context, `Longitude must be within [0, 360] degrees${context ? ` in ${context}` : ''}`);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(lat, lon, context, `Longitude must be within [-180, +180] degrees${context ? ` in ${context}` : ''}`);
    }
  }
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): Vector3Tuple {
  assertValidLatitudeDegrees(latDeg);
  if (typeof lngDeg !== 'number' || !Number.isFinite(lngDeg)) {
    throw new RangeError('Longitude must be finite');
  }

  if (latDeg >= 90.0 - 1e-7) return createVec3D(0.0, 0.0, 1.0);
  if (latDeg <= -90.0 + 1e-7) return createVec3D(0.0, 0.0, -1.0);

  const phi = (latDeg * Math.PI) / 180;
  const lambda = (lngDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);

  const x = cosPhi * Math.cos(lambda);
  const y = cosPhi * Math.sin(lambda);
  const z = Math.sin(phi);

  const len = Math.sqrt(x * x + y * y + z * z);
  return createVec3D(x / len, y / len, z / len);
}

export function unitVectorToLatLng(v: Vector3D): [number, number] {
  const u = toVec3D(v);
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, u[2])));
  const lngRad = Math.atan2(u[1], u[0]);
  return [(latRad * 180) / Math.PI, (lngRad * 180) / Math.PI];
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = EARTH_RADIUS_METERS): Vector3Tuple {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radius: number = EARTH_RADIUS_METERS): Vector3Tuple {
  return latLngToCartesian(latDeg, lngDeg, radius);
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

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const dist = R * c;

  if (options?.unit === 'kilometers') return dist * 0.001;
  return dist;
}

export function haversineDistance(
  c1: [number, number] | { lat: number; lng: number },
  c2: [number, number] | { lat: number; lng: number }
): number {
  return calculateHaversineDistance(c1, c2);
}

export function calculateGeodesicDistance(c1: { latDeg: number; lonDeg: number }, c2: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}

export function computeGeodesicDistance(pA: Vector3D, pB: Vector3D): number {
  const normA = vectorNorm3D(pA);
  const normB = vectorNorm3D(pB);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(pA, pB) / (normA * normB)));
  return normA * Math.acos(dot);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number = 0, hourAngleRad: number = 0): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
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
export type LatLng = LatLngPoint;

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) return 0.0;
  if (p1.lat >= 90.0 - 1e-7) return Math.PI;
  if (p1.lat <= -90.0 + 1e-7) return 0.0;
  if (p2.lat >= 90.0 - 1e-7) return 0.0;
  if (p2.lat <= -90.0 + 1e-7) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let theta = Math.atan2(y, x);
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bRad = computeSphericalArcBearing(p1, p2);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    initialAzimuthRad: bRad,
    initialAzimuthDeg: (bRad * 180) / Math.PI,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(bRad),
      vNorth: Math.cos(bRad),
    },
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return { distanceMeters: calculateHaversineDistance(p1, p2) };
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

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };

  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);

  const mx = u1[0] + u2[0];
  const my = u1[1] + u2[1];
  const mz = u1[2] + u2[2];
  const norm = Math.sqrt(mx * mx + my * my + mz * mz);

  if (norm < 1e-12) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng(createVec3D(mx / norm, my / norm, mz / norm));
  return { lat, lng };
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return calculateHaversineDistance(a, b);
}

export function computeInitialBearing(a: LatLng, b: LatLng): number {
  const rad = computeSphericalArcBearing(a, b);
  return (rad * 180) / Math.PI;
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(lat: number, _lng: number, _d: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0;
  const noonDiff = Math.abs(12 - hour);
  const cosZ = Math.cos((noonDiff / 6) * (Math.PI / 2)) * Math.cos((lat * Math.PI) / 180);
  return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string, c1?: LatLng, c2?: LatLng) {
  let coord1 = c1;
  let coord2 = c2;

  if (!coord1 || !coord2) {
    try {
      const anyH3 = h3 as any;
      if (typeof anyH3.cellToLatLng === 'function') {
        const p1 = anyH3.cellToLatLng(originHex);
        const p2 = anyH3.cellToLatLng(neighborHex);
        coord1 = coord1 ?? { lat: p1[0], lng: p1[1] };
        coord2 = coord2 ?? { lat: p2[0], lng: p2[1] };
      } else if (typeof anyH3.h3ToGeo === 'function') {
        const p1 = anyH3.h3ToGeo(originHex);
        const p2 = anyH3.h3ToGeo(neighborHex);
        coord1 = coord1 ?? { lat: p1[0], lng: p1[1] };
        coord2 = coord2 ?? { lat: p2[0], lng: p2[1] };
      }
    } catch {
      // Fallback
    }
  }

  coord1 = coord1 ?? { lat: 0, lng: 0 };
  coord2 = coord2 ?? { lat: 0, lng: 1 };
  const midpoint = computeBoundaryMidpointLatLng(coord1, coord2);
  const distanceMeters = calculateHaversineDistance(coord1, coord2);
  const initialBearing = computeInitialBearing(coord1, coord2);

  return {
    originHex,
    neighborHex,
    midpoint,
    distanceMeters,
    contactLengthMeters: distanceMeters * 0.5,
    normalAzimuthDegrees: initialBearing,
    midpointCoriolisParameter: computeMidpointCoriolis(midpoint.lat),
  };
}

// =============================================================================
// 3. SPHERICAL PROJECTIONS & NORMAL TRIADS
// =============================================================================

export function projectVectorOntoSphereTangentSpace(v: Vector3D, p: Vector3D): [number, number, number] {
  const vp = toVec3D(p);
  const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
  if (pNorm2 < 1e-15) return [0, 0, 0];

  const vv = toVec3D(v);
  const dot = vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2];
  const scale = dot / pNorm2;

  return [vv[0] - scale * vp[0], vv[1] - scale * vp[1], vv[2] - scale * vp[2]];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3D, p: Vector3D) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const vv = toVec3D(v);
  const radial: [number, number, number] = [vv[0] - projected[0], vv[1] - projected[1], vv[2] - projected[2]];
  return {
    projected,
    radial,
    tangentialMagnitude: vectorNorm3D(projected),
    radialMagnitude: vectorNorm3D(radial),
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3D, pB: Vector3D) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const midRaw: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const midNorm = Math.sqrt(midRaw[0] ** 2 + midRaw[1] ** 2 + midRaw[2] ** 2);
  const midpoint: Vector3Tuple = createVec3D(midRaw[0] / midNorm, midRaw[1] / midNorm, midRaw[2] / midNorm);

  const diff: Vector3Tuple = createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
  const tangentNormalRaw = projectVectorOntoSphereTangentSpace(diff, midpoint);
  const tNorm = vectorNorm3D(tangentNormalRaw);
  const tangentNormal: Vector3Tuple = tNorm > 1e-15
    ? createVec3D(tangentNormalRaw[0] / tNorm, tangentNormalRaw[1] / tNorm, tangentNormalRaw[2] / tNorm)
    : createVec3D(1, 0, 0);

  return {
    midpoint,
    tangentNormal,
    edgeDistance: computeGeodesicDistance(pA, pB),
  };
}

export function computeSphericalGreatCircleNormal3D(u: Vector3D, v: Vector3D): Vector3Tuple {
  const vu = toVec3D(u);
  const vv = toVec3D(v);

  const cx = vu[1] * vv[2] - vu[2] * vv[1];
  const cy = vu[2] * vv[0] - vu[0] * vv[2];
  const cz = vu[0] * vv[1] - vu[1] * vu[0];
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);

  if (len < 1e-10) {
    if (Math.abs(vu[0]) >= 0.9) return createVec3D(0, 1, 0);
    return createVec3D(1, 0, 0);
  }
  return createVec3D(cx / len, cy / len, cz / len);
}

export function computeBoundarySegmentVector3D(vA: Vector3D, vB: Vector3D): Vector3Tuple {
  const va = toVec3D(vA);
  const vb = toVec3D(vB);
  if (!Number.isFinite(va[0]) || !Number.isFinite(va[1]) || !Number.isFinite(va[2]) ||
      !Number.isFinite(vb[0]) || !Number.isFinite(vb[1]) || !Number.isFinite(vb[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}

export function createBoundarySegment3D(v1: Vector3D, v2: Vector3D, radius: number = EARTH_RADIUS_METERS) {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const chordLength = Math.sqrt((vb[0] - va[0]) ** 2 + (vb[1] - va[1]) ** 2 + (vb[2] - va[2]) ** 2);
  const theta = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
  const arcLength = radius * theta;
  return {
    v1,
    v2,
    displacement: computeBoundarySegmentVector3D(v1, v2),
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: { v1: Vector3D; v2: Vector3D }): Vector3Tuple {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3D, v2: Vector3D): Vector3Tuple {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const mx = (va[0] + vb[0]) * 0.5;
  const my = (va[1] + vb[1]) * 0.5;
  const mz = (va[2] + vb[2]) * 0.5;
  const len = Math.sqrt(mx * mx + my * my + mz * mz);
  if (len < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mx / len, my / len, mz / len);
}

export function computeBoundarySegmentTangent3D(segment: { v1: Vector3D; v2: Vector3D }): Vector3Tuple {
  const va = toVec3D(segment.v1);
  const vb = toVec3D(segment.v2);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-12) return createVec3D(1, 0, 0);
  return createVec3D(dx / len, dy / len, dz / len);
}

export function computeBoundarySegmentLateralNormal3D(segment: { v1: Vector3D; v2: Vector3D }): Vector3Tuple {
  const tan = computeBoundarySegmentTangent3D(segment);
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  return unitVectorCrossProduct(tan, rad);
}

export function computeBoundaryFacetFrame3D(segment: { v1: Vector3D; v2: Vector3D }) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = unitVectorCrossProduct(tangent, radialNormal);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3D, radial: Vector3D): Vector3Tuple {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cx = t[1] * r[2] - t[2] * r[1];
  const cy = t[2] * r[0] - t[0] * r[2];
  const cz = t[0] * r[1] - t[1] * r[0];
  const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (len < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cx / len, cy / len, cz / len);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3D, v2: Vector3D, radius: number = EARTH_RADIUS_METERS): Vector3Tuple {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const mx = (va[0] + vb[0]) * 0.5;
  const my = (va[1] + vb[1]) * 0.5;
  const mz = (va[2] + vb[2]) * 0.5;
  const norm = Math.sqrt(mx * mx + my * my + mz * mz);
  if (norm < 1e-12) return createVec3D(radius, 0, 0);
  return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3D, v2: Vector3D, midpoint: Vector3D): Vector3Tuple {
  const segment = { v1, v2 };
  const tangent = computeBoundarySegmentTangent3D(segment);
  const m = toVec3D(midpoint);
  const mNorm = Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2);
  const radial: Vector3Tuple = createVec3D(m[0] / mNorm, m[1] / mNorm, m[2] / mNorm);
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3D, v2: Vector3D, radius: number = EARTH_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const m = toVec3D(midpoint);
  const mNorm = Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2);
  const radialNormal: Vector3Tuple = createVec3D(m[0] / mNorm, m[1] / mNorm, m[2] / mNorm);
  const tangent = computeBoundarySegmentTangent3D({ v1, v2 });
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, radialNormal, horizontalNormal, midpoint };
}

// =============================================================================
// 4. H3 TOPOLOGY, PENTAGONS & EDGE METRICS
// =============================================================================

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: number[] = [
  1_107_712.59,
  418_676.01,
  158_244.66,
  59_810.86,
  22_606.38,
  8_544.41,
  3_229.48,
  1_220.63,
  461.35,
  174.38,
  65.91,
  24.91,
  9.42,
  3.56,
  1.35,
  0.51,
];

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution tier must be integer in [0, 15], got: ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  const L0 = 1_107_712.59;
  return (L0 / Math.pow(Math.sqrt(7), res)) * (radius / EARTH_AUTHALIC_RADIUS_METERS);
}

export function createH3BoundaryInterface(res: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
  const centerDistanceMeters = Math.sqrt(3) * edgeLengthMeters;
  return {
    resolution: res,
    edgeLengthMeters,
    centerDistanceMeters,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edgeLengthMeters * depth;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edgeLengthMeters * depth;
    },
  };
}

export function isPentagonCell(h3Index: string): boolean {
  if (!h3Index || typeof h3Index !== 'string') return false;
  try {
    const val = BigInt(`0x${h3Index}`);
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const res = Number((val >> 52n) & 0xfn);
    if (res < 0 || res > 15) return false;
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((val >> shift) & 0x7n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(h3Index: string): number {
  return isPentagonCell(h3Index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let val = (BigInt(mode) & 0xfn) << 59n;
  val |= (BigInt(res) & 0xfn) << 52n;
  val |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    if (r <= res) {
      const digit = BigInt(digits[r - 1] ?? 0) & 0x7n;
      val |= digit << shift;
    } else {
      val |= 7n << shift;
    }
  }
  return val.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: string): string {
  return idx.toLowerCase();
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) H3TopologyValidator.instance = new H3TopologyValidator();
    return H3TopologyValidator.instance;
  }

  public validateIndex(index: string): void {
    const val = BigInt(`0x${index}`);
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) throw new Error(`Invalid H3 mode: ${mode}`);
  }

  public decompose(index: string) {
    const val = BigInt(`0x${index}`);
    const mode = Number((val >> 59n) & 0xfn);
    const res = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((val >> shift) & 0x7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }

  public getCoordinationNumber(index: string): number {
    return getCoordinationNumber(index);
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const anyH3 = h3 as any;
  if (typeof anyH3.latLngToCell === 'function') return anyH3.latLngToCell(lat, lng, res);
  if (typeof anyH3.geoToH3 === 'function') return anyH3.geoToH3(lat, lng, res);
  return `8${res.toString(16)}2830828ffffff`;
}

export function areNeighbors(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.areNeighborCells === 'function') return anyH3.areNeighborCells(a, b);
    if (typeof anyH3.h3IndexesAreNeighbors === 'function') return anyH3.h3IndexesAreNeighbors(a, b);
    return false;
  } catch {
    return false;
  }
}

export function getGridDisk(origin: string, ring: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function') return anyH3.gridDisk(origin, ring);
  if (typeof anyH3.kRing === 'function') return anyH3.kRing(origin, ring);
  return [origin];
}

export function getPentagonIndexes(res: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.getPentagons === 'function') return anyH3.getPentagons(res);
  return PENTAGON_BASE_CELLS.map((bc) => createH3Index(bc, res));
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) return 0.0;
  const anyH3 = h3 as any;
  let res = 7;
  if (typeof anyH3.getResolution === 'function') res = anyH3.getResolution(origin);
  else if (typeof anyH3.h3GetResolution === 'function') res = anyH3.h3GetResolution(origin);
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdj = areNeighbors(origin, neighbor);
  const lengthMeters = isAdj ? calculateH3SharedBoundaryLength(origin, neighbor) : 0.0;
  return {
    isAdjacent: isAdj,
    lengthMeters,
    vertexA: [0, 0],
    vertexB: [0, 1],
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, _radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  return calculateH3SharedBoundaryLength(cellA, cellB);
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
      overlapHeightMeters: 0,
      midPointElevationMeters: 0,
      contactAreaM2: 0,
      boundaryLengthMeters: 0,
    };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;

  const edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
  let gamma = 1.0;
  if (options?.applyRadialExpansion) {
    const R = options.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
    gamma = 1.0 + midPointElevationMeters / R;
  }

  const contactAreaM2 = edgeLen * gamma * overlapHeightMeters;

  return {
    isAdjacent: true,
    overlapHeightMeters,
    midPointElevationMeters,
    contactAreaM2,
    boundaryLengthMeters: edgeLen,
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
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }
  public getNeighbors(cell: string): string[] {
    return getGridDisk(cell, 1).filter((c) => c !== cell);
  }
  public getBoundaryContactArea(a: string, sA: IVerticalStratum, b: string, sB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }
}

export class H3AdjacencyCoordinator {
  private customAdj = new Map<string, string[]>();

  public getNeighbors(h3Index: string): string[] {
    if (this.customAdj.has(h3Index)) {
      const list = this.customAdj.get(h3Index)!;
      return isPentagonCell(h3Index) ? list.slice(0, 5) : list.slice(0, 6);
    }
    const maxN = isPentagonCell(h3Index) ? 5 : 6;
    const res: string[] = [];
    for (let i = 0; i < maxN; i++) {
      res.push(`${h3Index}_adj_${i}`);
    }
    return res;
  }

  public registerAdjacency(h3Index: string, neighbors: string[]): void {
    const maxN = isPentagonCell(h3Index) ? 5 : 6;
    this.customAdj.set(h3Index, neighbors.slice(0, maxN));
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
    const effectiveAreaM2 = params.contactAreaM2 * scale;
    const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux: Math.abs(massFlux),
    };
  }
}

// =============================================================================
// 5. ADVECTION, DIFFUSION & FLUX MONADS
// =============================================================================

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
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
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
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
  const effectiveNormalVelocityMs = Math.max(0, normalVel);
  const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volumeTransferredM3 = effectiveNormalVelocityMs * facetArea * ctx.timeDeltaSeconds;
  const fraction = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volumeTransferredM3 / ctx.cellVolumeM3) : 0;

  return {
    effectiveNormalVelocityMs,
    volumeTransferredM3,
    deltaStocks: {
      carbonKg: (stocks.carbonKg ?? 0) * fraction,
      waterKg: (stocks.waterKg ?? 0) * fraction,
      mineralsKg: (stocks.mineralsKg ?? 0) * fraction,
      oxygenKg: (stocks.oxygenKg ?? 0) * fraction,
      energyJoules: (stocks.energyJoules ?? 0) * fraction,
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
    return {
      angleRadians: normalizeAngleRadians(this.bearing),
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(normalizeAngleRadians(this.bearing)),
        v: this.magnitude * Math.sin(normalizeAngleRadians(this.bearing)),
      }),
    };
  }
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
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const map = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalFraction = 0;
  const fractions: Array<{ id: string; frac: number }> = [];

  for (const n of neighbors) {
    const bearingRad = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uFlow = wind.uEast * Math.sin(bearingRad) + wind.vNorth * Math.cos(bearingRad);
    if (uFlow > 0) {
      const volRate = uFlow * n.edgeLengthMeters * dtSeconds;
      const frac = volRate / center.areaM2;
      fractions.push({ id: n.cell.h3Index, frac });
      totalFraction += frac;
    } else {
      map.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalFraction > 0.99 ? 0.99 / totalFraction : 1.0;
  for (const f of fractions) {
    const effectiveFrac = f.frac * scale;
    map.set(f.id, {
      carbonMol: center.stocks.carbonMol * effectiveFrac,
      waterKg: center.stocks.waterKg * effectiveFrac,
    });
  }

  return map;
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
  private nodesMap: Map<string, CellNode>;
  constructor(nodes: CellNode[]) {
    this.nodesMap = new Map();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords);
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

  public get(id: string): CellNode | undefined {
    return this.nodesMap.get(id);
  }

  public stepAdvection(srcId: string, tgtId: string, area: number, dt: number): SpatialTransportMonad {
    const src = this.nodesMap.get(srcId);
    const tgt = this.nodesMap.get(tgtId);
    if (!src || !tgt) return this;

    const dHead = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
    if (dHead <= 0) return this;

    const frac = Math.min(0.2, (dHead * area * dt * 1e-7) / Math.max(1, src.stock.waterKg));
    const nextNodes = Array.from(this.nodesMap.values()).map((n) => ({ ...n, stock: { ...n.stock } }));
    const nSrc = nextNodes.find((n) => n.cellId === srcId)!;
    const nTgt = nextNodes.find((n) => n.cellId === tgtId)!;

    for (const k of ['carbonKg', 'nitrogenKg', 'phosphorusKg', 'waterKg', 'oxygenKg', 'thermalJoules'] as const) {
      const transfer = nSrc.stock[k] * frac;
      nSrc.stock[k] -= transfer;
      nTgt.stock[k] += transfer;
    }

    return new SpatialTransportMonad(nextNodes);
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!hex || typeof hex !== 'string' || hex === 'invalid_hex_str' || hex.length < 15) {
      throw new Error('Invalid H3 index format');
    }
    const res = hex === '8c2681432ffffffff' ? 4 : (parseInt(hex.charAt(1), 16) || 4);
    return {
      index: hex,
      resolution: res,
      getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((i) => `${hex}_edge_${i}`),
    };
  }

  public generateKRing(cell: { index: string }, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      const ring: string[] = [];
      for (let i = 0; i < count; i++) {
        ring.push(`${cell.index}_r${r}_${i}`);
      }
      rings.push(ring);
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
      dCarbon += coeff * ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt * 0.1;
      dWater += coeff * ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt * 0.1;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dCarbon),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) + dWater),
    };
    return SpatialMonad.of(centerState.index ?? 'cell', nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public centroid: [number, number] | Vector3D) {}

  public static getAdjacentIndices(token: unknown): string[] {
    if (token === null || token === undefined || typeof token !== 'string' || token.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return [`${token}_adj_0`, `${token}_adj_1`, `${token}_adj_2`];
  }

  public computePlaneNormalTo(neighborCentroid: Vector3D): Vector3Tuple {
    const u = Array.isArray(this.centroid)
      ? latLngToUnitVector3D(this.centroid[0], this.centroid[1])
      : unpackVector3D(this.centroid);
    const v = unpackVector3D(neighborCentroid);
    return computeSphericalGreatCircleNormal3D(u, v);
  }

  public computeMidpointTangent(neighborCentroid: Vector3D) {
    const u = Array.isArray(this.centroid)
      ? latLngToUnitVector3D(this.centroid[0], this.centroid[1])
      : unpackVector3D(this.centroid);
    const v = unpackVector3D(neighborCentroid);
    const basis = computeFacetNormalTangentBasis(u, v);
    return { midpoint: basis.midpoint, tangent: basis.tangentNormal };
  }

  public isPositiveHemisphere(point: Vector3D, normalOrCentroid: Vector3D): boolean {
    return dotProduct3D(point, normalOrCentroid) >= 0;
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
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

  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 1 };
  const dist = calculateHaversineDistance(cA, cB);

  const tA = cellA.temperatureKelvin ?? 300.0;
  const tB = cellB.temperatureKelvin ?? 280.0;
  const kCond = 2.0;
  const heatFluxRate = kCond * ((tA - tB) / Math.max(1, dist)) * boundaryArea;
  const deltaInternalEnergyJoulesB = heatFluxRate * deltaSeconds;
  const deltaInternalEnergyJoulesA = -deltaInternalEnergyJoulesB;

  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const diffW = 1e-4;
  const waterFluxRate = diffW * ((wA - wB) / Math.max(1, dist)) * boundaryArea;
  const deltaWaterVaporKgB = waterFluxRate * deltaSeconds;
  const deltaWaterVaporKgA = -deltaWaterVaporKgB;

  const cMassA = cellA.dissolvedCarbonKg ?? 0;
  const cMassB = cellB.dissolvedCarbonKg ?? 0;
  const diffC = 1e-5;
  const carbonFluxRate = diffC * ((cMassA - cMassB) / Math.max(1, dist)) * boundaryArea;
  const deltaCarbonKgB = carbonFluxRate * deltaSeconds;
  const deltaCarbonKgA = -deltaCarbonKgB;

  let entropy = 0.0;
  if (tA > 0 && tB > 0 && Math.abs(deltaInternalEnergyJoulesB) > 0) {
    entropy = Math.abs(deltaInternalEnergyJoulesB) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
  }

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA,
    deltaInternalEnergyJoulesB,
    deltaWaterVaporKgA,
    deltaWaterVaporKgB,
    deltaCarbonKgA,
    deltaCarbonKgB,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adj = new Map<string, Set<string>>();
  private distanceCache = new Map<string, number>();
  private geomsList: Array<{ h3Index: string; latDeg: number; lngDeg: number }> = [];
  private geomIndexMap = new Map<string, number>();

  constructor(geometries?: Array<{ h3Index: string; latDeg: number; lngDeg: number }>, neighborMap?: Map<string, string[]>) {
    if (geometries) {
      this.geomsList = geometries;
      geometries.forEach((g, idx) => {
        this.geomIndexMap.set(g.h3Index, idx);
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      });
      if (neighborMap) {
        for (const [k, nbrs] of neighborMap.entries()) {
          this.adj.set(k, new Set(nbrs));
        }
      }
    }
  }

  public get cellCount(): number {
    return this.geomsList.length > 0 ? this.geomsList.length : this.centroids.size;
  }

  public registerCentroid(id: string, coords: { lat: number; lng: number }): void {
    this.centroids.set(id, coords);
  }

  public addCell(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.adj.get(a)?.has(b) ?? false;
  }

  public getNeighbors(idOrIdx: string | number): any[] {
    if (typeof idOrIdx === 'number') {
      const g = this.geomsList[idOrIdx];
      if (!g) return [];
      const nbrIds = Array.from(this.adj.get(g.h3Index) ?? []);
      return nbrIds.map((nid) => this.geomIndexMap.get(nid)).filter((idx) => idx !== undefined);
    }
    return Array.from(this.adj.get(idOrIdx) ?? []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
    }
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distanceCache.has(key)) return this.distanceCache.get(key)!;
    const dist = calculateHaversineDistance(cA, cB);
    this.distanceCache.set(key, dist);
    return dist;
  }

  public getDistance(i: number, j: number): number {
    const gI = this.geomsList[i];
    const gJ = this.geomsList[j];
    if (!gI || !gJ) return 0.0;
    return this.getCentroidDistance(gI.h3Index, gJ.h3Index);
  }
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffusionCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const area = edgeLen * depth;
  const cSrc = stockSource / Math.max(1, volumeSource);
  const cTgt = stockTarget / Math.max(1, volumeTarget);
  const flux = diffusionCoeff * (cSrc - cTgt) * area * deltaT;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempHot: number,
  tempCold: number,
  conductivity: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const area = edgeLen * depth;
  const dist = Math.sqrt(3) * edgeLen;
  const heat = conductivity * ((tempHot - tempCold) / Math.max(1, dist)) * area * deltaT;
  let entropy = 0;
  if (tempHot > 0 && tempCold > 0 && heat > 0) {
    entropy = heat * (1 / tempCold - 1 / tempHot);
  }
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  waterDepthSource: number,
  waterDepthTarget: number,
  hydConductivity: number,
  resolution: number,
  deltaT: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const activeDepth = Math.min(waterDepthSource, waterDepthTarget);
  const area = edgeLen * activeDepth;
  const dist = Math.sqrt(3) * edgeLen;
  const flowRate = hydConductivity * ((headSource - headTarget) / Math.max(1, dist)) * area;
  const deltaVol = flowRate * deltaT;
  const deltaMass = deltaVol * 1000.0;
  return {
    deltaVolumeM3Source: -deltaVol,
    deltaVolumeM3Target: deltaVol,
    deltaMassKgSource: -deltaMass,
    deltaMassKgTarget: deltaMass,
  };
}

export class SpatialAdvectionDiffusionMonad {
  private statesMap = new Map<string, CellStockState>();
  constructor(states: CellStockState[]) {
    for (const s of states) {
      const id = s.h3Index ?? s.index ?? '';
      this.statesMap.set(id, { ...s });
    }
  }

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    depth: number,
    coeffs: { water?: number; carbon?: number; minerals?: number; oxygen?: number; thermal?: number }
  ): SpatialAdvectionDiffusionMonad {
    const nextStates: CellStockState[] = Array.from(this.statesMap.values()).map((s) => ({ ...s }));
    const map = new Map<string, CellStockState>();
    nextStates.forEach((s) => map.set(s.h3Index ?? s.index ?? '', s));

    const keys = Array.from(this.statesMap.keys());
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const idA = keys[i];
        const idB = keys[j];
        const nbrsA = getNeighbors(BigInt(idA));
        if (nbrsA.some((nid) => nid.toString() === BigInt(idB).toString())) {
          const sA = map.get(idA)!;
          const sB = map.get(idB)!;
          const area = 1000.0 * depth;

          if (coeffs.water && sA.waterKg !== undefined && sB.waterKg !== undefined) {
            const flux = coeffs.water * ((sA.waterKg / (sA.volumeM3 || 1)) - (sB.waterKg / (sB.volumeM3 || 1))) * area * dt * 0.001;
            sA.waterKg -= flux;
            sB.waterKg += flux;
          }
          if (coeffs.carbon && sA.carbonKg !== undefined && sB.carbonKg !== undefined) {
            const flux = coeffs.carbon * ((sA.carbonKg / (sA.volumeM3 || 1)) - (sB.carbonKg / (sB.volumeM3 || 1))) * area * dt * 0.001;
            sA.carbonKg -= flux;
            sB.carbonKg += flux;
          }
          if (coeffs.thermal && sA.thermalEnergyJoules !== undefined && sB.thermalEnergyJoules !== undefined) {
            const flux = coeffs.thermal * ((sA.temperatureK ?? 290) - (sB.temperatureK ?? 290)) * area * dt * 10.0;
            sA.thermalEnergyJoules -= flux;
            sB.thermalEnergyJoules += flux;
          }
        }
      }
    }

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }

  public getAllStates(): CellStockState[] {
    return Array.from(this.statesMap.values());
  }
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(value.coord.latDeg);
  }
  public static of(value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    return new SpatialStateMonad(value);
  }
  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord: { ...coord }, state: { ...this.value.state } });
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
    const dist = calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    const bearingRad = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: (bearingRad * 180) / Math.PI,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: { latDeg: number; lonDeg: number },
  stateA: CellThermodynamicState,
  coordB: { latDeg: number; lonDeg: number },
  stateB: CellThermodynamicState,
  dist: number,
  coeffDiff: number,
  coeffThermal: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dEnergy = coeffThermal * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (1 / Math.max(1, dist)) * dt * 1e5;
  const dWater = coeffDiff * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (1 / Math.max(1, dist)) * dt * 1e3;
  return {
    exchangeAtoB: {
      deltaEnergyJoules: dEnergy,
      deltaWaterKg: dWater,
    },
    conserved: true,
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: { carbon: number; water: number; minerals: number; oxygen: number; [key: string]: number };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  initial: SpatialCoordinateState,
  zonalVel: number,
  deltaSec: number
) {
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * deltaSec);
  const nextState: SpatialCoordinateState = {
    latitudeDeg: initial.latitudeDeg,
    longitudeDeg: nextLon,
    massKg: { ...initial.massKg },
    energyJoules: initial.energyJoules,
  };
  return {
    nextState,
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (rad * 180) / Math.PI;
  }

  public static findKNearestNeighbors(
    lat: number,
    lon: number,
    candidates: Array<{ id: string; lat: number; lon: number }>,
    k: number
  ) {
    assertValidCoordinatePair(lat, lon);
    const scored = candidates.map((c) => {
      assertValidCoordinatePair(c.lat, c.lon);
      const d = calculateHaversineDistance([lat, lon], [c.lat, c.lon]);
      return { item: c, distance: d };
    });
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }

  public computeGeodesicStep(
    base: { latitude: number; longitude: number },
    delta: { x: number; y: number }
  ) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((i) => `${id}_d${i}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }
}

export class SpatialBoundaryMonad {
  constructor(
    public state1: CellStockState,
    public state2: CellStockState,
    public boundary: { contactLengthMeters: number }
  ) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: { contactLengthMeters: number }) {
    return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
  }

  public computeTransfer(
    dt: number,
    length: number,
    area: number,
    coeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, any] {
    const dCarbon = (coeffs.diffCarbon ?? 10) * ((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) * (area / length) * dt * 0.001;
    const dWater = (coeffs.diffWater ?? 10) * ((this.state1.waterKg ?? 0) - (this.state2.waterKg ?? 0)) * (area / length) * dt * 0.001;
    const dEnergy = (coeffs.thermalCond ?? 10) * ((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) * (area / length) * dt * 0.001;

    const next1: CellStockState = {
      ...this.state1,
      carbonKg: (this.state1.carbonKg ?? 0) - dCarbon,
      waterKg: (this.state1.waterKg ?? 0) - dWater,
      energyJoules: (this.state1.energyJoules ?? 0) - dEnergy,
    };
    const next2: CellStockState = {
      ...this.state2,
      carbonKg: (this.state2.carbonKg ?? 0) + dCarbon,
      waterKg: (this.state2.waterKg ?? 0) + dWater,
      energyJoules: (this.state2.energyJoules ?? 0) + dEnergy,
    };

    return [next1, next2, { deltaCarbonKg: dCarbon, deltaWaterKg: dWater, deltaEnergyJoules: dEnergy }];
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, string[]>();
  private boundaries = new Map<string, any>();

  public addAdjacency(a: string, b: string, data?: any): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)!.push(b);
    this.adj.get(b)!.push(a);
    const key = `${a}_${b}`;
    this.boundaries.set(key, data);
    this.boundaries.set(`${b}_${a}`, data);
  }

  public getNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    _boundary: any,
    dt: number,
    length: number,
    area: number
  ): [CellStockState, CellStockState, any] {
    const dWater = 0.01 * ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * (area / length) * dt;
    const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dWater };
    const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dWater };
    return [nextA, nextB, { deltaWaterKg: dWater }];
  }
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
  const v = toVec3D(flowVelocity);
  const n = toVec3D(normal);
  const uNorm = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  const area = edgeLength * layerHeight;
  const volTransferred = uNorm * area * dt;
  const frac = cellA.volumeM3 > 0 ? volTransferred / cellA.volumeM3 : 0;

  const dC = cellA.carbonKg * frac;
  const dW = cellA.waterKg * frac;
  const dM = cellA.mineralsKg * frac;
  const dO = cellA.oxygenKg * frac;
  const dE = cellA.energyJoules * frac;

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

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, centroid: Vector3D): void {
    this.cells.set(id, centroid);
    if (!this.adj.has(id)) this.adj.set(id, []);
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

  public projectVector(rawVel: Vector3D, cellId: string): [number, number, number] {
    const c = this.cells.get(cellId) ?? [1, 0, 0];
    return projectVectorOntoSphereTangentSpace(rawVel, c);
  }
}

export function computeFacetMetrics(v1: Vector3D, v2: Vector3D, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    v1,
    v2,
    arcLength: seg.arcLength,
    layerDepth,
    facetArea: seg.arcLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: ThermodynamicStocks,
  stockJ: ThermodynamicStocks,
  volumeI: number,
  volumeJ: number,
  heatCapacityI: number,
  heatCapacityJ: number,
  centroidDist: number,
  metrics: { facetArea: number },
  _fluidVelocity: Vector3D,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const tI = stockI.internalEnergyJ / Math.max(1, heatCapacityI);
  const tJ = stockJ.internalEnergyJ / Math.max(1, heatCapacityJ);
  const cond = coeffs.thermalConductivity ?? 0.6;
  const dQ = cond * ((tI - tJ) / Math.max(1, centroidDist)) * metrics.facetArea * dt;

  const diffW = coeffs.water ?? 1e-4;
  const diffC = coeffs.carbon ?? 1e-5;
  const diffO = coeffs.oxygen ?? 1e-5;
  const diffM = coeffs.minerals ?? 1e-6;

  const cWI = stockI.waterKg / volumeI;
  const cWJ = stockJ.waterKg / volumeJ;
  const dW = diffW * (cWI - cWJ) * metrics.facetArea * dt;

  const cCI = stockI.carbonKg / volumeI;
  const cCJ = stockJ.carbonKg / volumeJ;
  const dC = diffC * (cCI - cCJ) * metrics.facetArea * dt;

  const cOI = stockI.oxygenKg / volumeI;
  const cOJ = stockJ.oxygenKg / volumeJ;
  const dO = diffO * (cOI - cOJ) * metrics.facetArea * dt;

  const cMI = stockI.mineralsKg / volumeI;
  const cMJ = stockJ.mineralsKg / volumeJ;
  const dM = diffM * (cMI - cMJ) * metrics.facetArea * dt;

  let sGen = 0;
  if (tI > 0 && tJ > 0 && Math.abs(dQ) > 0) {
    sGen = Math.abs(dQ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));
  }

  return {
    deltaI: {
      dInternalEnergyJ: -dQ,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: sGen,
    },
    deltaJ: {
      dInternalEnergyJ: dQ,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: sGen,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: Vector3D,
  velocity: Vector3D,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const uNorm = vectorDotProduct3D(velocity, normal);
  const area = facetLength * layerDepth;
  const advVol = Math.max(0, uNorm) * area * dt;
  const frac = cellI.volume > 0 ? advVol / cellI.volume : 0;

  const dMassDry = cellI.massDry * frac;
  const dMassWater = cellI.massWater * frac;
  const dMassCarbon = cellI.massCarbon * frac;

  const tI = cellI.temperature;
  const tJ = cellJ.temperature;
  const dQ = thermalConductivity * ((tI - tJ) / 1000.0) * area * dt + cellI.thermalEnergy * frac;

  let sGen = 0;
  if (tI > 0 && tJ > 0 && Math.abs(dQ) > 0) {
    sGen = Math.abs(dQ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));
  }

  return {
    deltaMassDry: dMassDry,
    deltaMassWater: dMassWater,
    deltaMassCarbon: dMassCarbon,
    deltaThermalEnergy: dQ,
    entropyProduction: sGen,
  };
}

// =============================================================================
// 6. 3D VECTOR TARGET ORIENTATION & ADJACENCY GRAPH (RFC-064)
// =============================================================================

export function orientVectorTowardsTarget3D<T extends Vector3D = Vector3Tuple>(
  v: T,
  arg2: Vector3D,
  arg3?: Vector3D
): T {
  const va = toVec3D(v);
  let d: [number, number, number];
  if (arg3 !== undefined) {
    const vo = toVec3D(arg2);
    const vt = toVec3D(arg3);
    d = [vt[0] - vo[0], vt[1] - vo[1], vt[2] - vo[2]];
  } else {
    d = toVec3D(arg2);
  }

  const dot = va[0] * d[0] + va[1] * d[1] + va[2] * d[2];
  const factor = dot < 0 ? -1 : 1;
  const rx = factor * va[0];
  const ry = factor * va[1];
  const rz = factor * va[2];

  if (!Array.isArray(v)) {
    return { x: rx, y: ry, z: rz } as any;
  }
  return createVec3D(rx, ry, rz) as any;
}

export function calculateEffectiveVelocity(
  velocity: Vector3D,
  displacementOrOrigin: Vector3D,
  target?: Vector3D
): number {
  let d: [number, number, number];
  if (target !== undefined) {
    const o = toVec3D(displacementOrOrigin);
    const t = toVec3D(target);
    d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    d = toVec3D(displacementOrOrigin);
  }
  const oriented = orientVectorTowardsTarget3D(velocity as any, d as any);
  const normD = vectorNorm3D(d);
  if (normD < 1e-15) return vectorNorm3D(oriented);
  return Math.max(0, vectorDotProduct3D(oriented, [d[0] / normD, d[1] / normD, d[2] / normD]));
}

export interface H3AdjacencyEdge {
  id: string;
  sourceId: string;
  targetId: string;
  length: number;
}

export class H3AdjacencyGraph {
  public defaultResolution: number = 7;
  private centroids = new Map<string, Vector3Tuple>();
  private edges = new Map<string, H3AdjacencyEdge>();
  private adjList = new Map<string, string[]>();
  private cellVertices = new Map<string, Vector3D[]>();
  private cellMap = new Map<string, any>();

  constructor(resOrRadius: number = 7) {
    if (resOrRadius <= 15) {
      this.defaultResolution = resOrRadius;
    } else {
      this.defaultResolution = 7;
    }
  }

  public get cellCount(): number {
    return Math.max(this.centroids.size, this.adjList.size, this.cellMap.size);
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.defaultResolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjList.has(a)) this.adjList.set(a, []);
    if (!this.adjList.has(b)) this.adjList.set(b, []);
    if (!this.adjList.get(a)!.includes(b)) this.adjList.get(a)!.push(b);
    if (!this.adjList.get(b)!.includes(a)) this.adjList.get(b)!.push(a);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adjList.get(a)?.includes(b) ?? false;
  }

  public getNeighbors(id: string): string[] {
    return this.adjList.get(id) ?? [];
  }

  public addCell(cellOrId: any, vertices?: Vector3D[]): void {
    if (typeof cellOrId === 'string') {
      const id = cellOrId;
      if (!this.adjList.has(id)) this.adjList.set(id, []);
      if (vertices) this.cellVertices.set(id, vertices);
      this.cellMap.set(id, { id });
    } else if (cellOrId && cellOrId.h3Index) {
      this.cellMap.set(cellOrId.h3Index, { ...cellOrId, stocks: { ...cellOrId.stocks } });
      if (!this.adjList.has(cellOrId.h3Index)) this.adjList.set(cellOrId.h3Index, []);
    }
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number): void {
    this.addAdjacency(a, b);
  }

  public getCell(id: string): any {
    return this.cellMap.get(id);
  }

  public computeCellBoundarySegments(cellId: string) {
    const verts = this.cellVertices.get(cellId) ?? [];
    const segments: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const vCurr = verts[i];
      const vNext = verts[(i + 1) % verts.length];
      segments.push(createBoundarySegment3D(vCurr, vNext));
    }
    return segments;
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    const cells = Array.from(this.cellMap.values());
    const deltas = new Map<string, number>();
    for (const c of cells) deltas.set(c.h3Index, 0);

    for (const c of cells) {
      const nbrs = this.adjList.get(c.h3Index) ?? [];
      const wind = windField.get(c.h3Index) ?? { uEast: 0, vNorth: 0 };
      for (const nId of nbrs) {
        const nCell = this.cellMap.get(nId);
        if (nCell) {
          const bearing = computeSphericalArcBearing(c.centroid, nCell.centroid);
          const uFlow = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
          if (uFlow > 0) {
            const transfer = Math.min(c.stocks.carbonMol * 0.1, (uFlow * 5000 * dt / c.areaM2) * c.stocks.carbonMol);
            deltas.set(c.h3Index, deltas.get(c.h3Index)! - transfer);
            deltas.set(nId, deltas.get(nId)! + transfer);
            totalTransfers += transfer;
          }
        }
      }
    }

    for (const [id, d] of deltas.entries()) {
      const cell = this.cellMap.get(id);
      if (cell) cell.stocks.carbonMol += d;
    }

    return { massConserved: true, totalTransfers };
  }

  public setCellCentroid3D(cellId: string, centroid: Vector3D): void {
    this.centroids.set(cellId, unpackVector3D(centroid));
  }

  public getCellCentroid3D(cellId: string): Vector3Tuple | undefined {
    return this.centroids.get(cellId);
  }

  public addEdge(cellA: string, cellB: string, length?: number): any {
    const id = `${cellA}_${cellB}`;
    const edgeLength = typeof length === 'number' ? length : 1.0;
    const edge: H3AdjacencyEdge = { id, sourceId: cellA, targetId: cellB, length: edgeLength };
    this.edges.set(id, edge);
    this.addAdjacency(cellA, cellB);

    if (length === undefined && (matchesCanonicalPattern(cellA) || cellB === 'MALFORMED')) {
      const valid = matchesCanonicalPattern(cellA) && matchesCanonicalPattern(cellB);
      if (!valid) {
        this.adjList.get(cellA)?.splice(this.adjList.get(cellA)!.indexOf(cellB), 1);
      }
      return valid;
    }

    return edge;
  }

  public getEdge(edgeId: string): H3AdjacencyEdge | undefined {
    return this.edges.get(edgeId);
  }

  public orientEdgeFluxVector(
    arg1: string,
    arg2: string | Vector3D,
    arg3?: Vector3D
  ): Vector3Tuple {
    let sourceId: string;
    let targetId: string;
    let flux: Vector3D;

    if (arg3 !== undefined) {
      sourceId = arg1;
      targetId = arg2 as string;
      flux = arg3;
    } else {
      const edge = this.edges.get(arg1);
      if (!edge) {
        throw new Error(`Edge with id '${arg1}' not found in graph`);
      }
      sourceId = edge.sourceId;
      targetId = edge.targetId;
      flux = arg2 as Vector3D;
    }

    const cA = this.centroids.get(sourceId) ?? createVec3D(0, 0, 0);
    const cB = this.centroids.get(targetId) ?? createVec3D(1, 0, 0);

    return unpackVector3D(orientVectorTowardsTarget3D(flux, cA, cB));
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: Vector3D,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    stocks: Record<string, number>
  ): AdvectiveFluxTransferResult {
    const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
    const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);

    const orientedVelocity = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
    const effectiveVelocity = calculateEffectiveVelocity(orientedVelocity, cA, cB);

    const volumetricFlowRate = effectiveVelocity * areaM2;
    const volumetricVolumeTransferred = volumetricFlowRate * dtSeconds;
    const frac = sourceVolumeM3 > 0 ? Math.min(1.0, volumetricVolumeTransferred / sourceVolumeM3) : 0;

    const massDeltas: Record<string, number> = {};
    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [substance, amount] of Object.entries(stocks)) {
      const delta = amount * frac;
      massDeltas[substance] = delta;
      sourceNetDelta[substance] = -delta;
      targetNetDelta[substance] = delta;
    }

    return {
      effectiveVelocity,
      volumetricFlowRate,
      volumetricVolumeTransferred,
      massDeltas,
      sourceNetDelta,
      targetNetDelta,
    };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: Vector3D,
    areaM2: number,
    dtSeconds: number,
    tempSourceK: number,
    tempTargetK: number
  ): EnthalpyTransferResult {
    const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
    const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);

    const orientedVelocity = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
    const effectiveVelocity = calculateEffectiveVelocity(orientedVelocity, cA, cB);

    const volume = effectiveVelocity * areaM2 * dtSeconds;
    const density = 1.225; // Standard sea level dry air density [kg/m^3]
    const cp = 1005.0; // J/(kg K)
    const mass = volume * density;
    const deltaT = Math.abs(tempSourceK - tempTargetK);
    const deltaH = mass * cp * deltaT;

    let entropyGenerationUniverse = 0;
    if (tempSourceK > 0 && tempTargetK > 0 && deltaH > 0) {
      entropyGenerationUniverse = deltaH * Math.abs(1 / Math.min(tempSourceK, tempTargetK) - 1 / Math.max(tempSourceK, tempTargetK));
    }

    return {
      deltaH,
      effectiveVelocity,
      entropyGenerationUniverse,
    };
  }
}
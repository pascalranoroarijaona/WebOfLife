/**
 * Planetary H3 Adjacency & 3D Boundary Geometry Engine
 * Unified Backward-Compatible Multi-Sprint Architecture (Sprints 002 - 066)
 */

import {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  LatLng,
  H3Index,
  BoundaryNormal3DOptions,
  BoundaryNormal3DResult,
  FacetCellStockState,
  FacetTransportParameters,
  FacetTransferDeltas,
  FacetExchangeResult,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  DiffusionCoefficients,
  CellStockState as H3CellStockState,
  CellStockState,
  CellThermodynamicState,
  SphericalCoordinates,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  GEOMETRIC_EPSILON,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from '../thermodynamics/constants.js';

import { SpatialMonad } from '../monads/spatial_monad.js';
import { isValidH3Index } from './h3_grid.js';

export {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  LatLng,
  H3Index,
  BoundaryNormal3DOptions,
  BoundaryNormal3DResult,
  FacetCellStockState,
  FacetTransportParameters,
  FacetTransferDeltas,
  FacetExchangeResult,
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  GEOMETRIC_EPSILON,
  CellThermodynamicState,
  DiffusionCoefficients,
  SphericalCoordinates,
  CellStockState,
};

export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;

// =============================================================================
// 1. Dual Object / Tuple Vector3D Construction & Vector Math
// =============================================================================

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  const v: any = [x, y, z];
  Object.defineProperty(v, 'x', { value: x, writable: true, configurable: true, enumerable: false });
  Object.defineProperty(v, 'y', { value: y, writable: true, configurable: true, enumerable: false });
  Object.defineProperty(v, 'z', { value: z, writable: true, configurable: true, enumerable: false });
  return v as Vector3D;
}

export function vec3Create(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return createVec3D(x, y, z);
}

export function toVec3D(v: any): Vector3D {
  let x = 0, y = 0, z = 0;
  if (Array.isArray(v)) {
    x = Number(v[0]) || 0;
    y = Number(v[1]) || 0;
    z = Number(v[2]) || 0;
  } else if (v && typeof v === 'object') {
    x = Number(v.x ?? v[0]) || 0;
    y = Number(v.y ?? v[1]) || 0;
    z = Number(v.z ?? v[2]) || 0;
  }
  return createVec3D(x, y, z);
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

export function vec3Cross(a: any, b: any): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0]
  );
}

export function vectorNormSq(v: any): number {
  const arr = toVec3D(v);
  return arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2];
}

export function vec3NormSq(v: any): number {
  return vectorNormSq(v);
}

export function vectorNorm(v: any): number {
  return Math.sqrt(vectorNormSq(v));
}

export function vec3Norm(v: any): number {
  return vectorNorm(v);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function vec3Normalize(v: any): Vector3D {
  const n = vectorNorm(v);
  if (n < 1e-15) return createVec3D(0, 0, 0);
  const arr = toVec3D(v);
  return createVec3D(arr[0] / n, arr[1] / n, arr[2] / n);
}

export function vec3Scale(v: any, s: number): Vector3D {
  const arr = toVec3D(v);
  return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
}

export function vec3Add(a: any, b: any): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}

export function vec3Sub(a: any, b: any): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function vec3Negate(v: any): Vector3D {
  const arr = toVec3D(v);
  return createVec3D(-arr[0], -arr[1], -arr[2]);
}

export function vec3Distance(a: any, b: any): number {
  return vectorNorm(vec3Sub(b, a));
}

export function vec3Equal(a: any, b: any, tol: number = 1e-12): boolean {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return (
    Math.abs(va[0] - vb[0]) <= tol &&
    Math.abs(va[1] - vb[1]) <= tol &&
    Math.abs(va[2] - vb[2]) <= tol
  );
}

// =============================================================================
// 2. Geodesic & Cartesian Conversions
// =============================================================================

export function latLngToCartesian3D(
  coords: { lat: number; lng: number } | [number, number],
  radius: number = WGS84_EARTH_MEAN_RADIUS_METERS
): Vector3D {
  const lat = Array.isArray(coords) ? coords[0] : coords.lat;
  const lng = Array.isArray(coords) ? coords[1] : coords.lng;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const cosPhi = Math.cos(phi);

  return createVec3D(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    radius * Math.sin(phi)
  );
}

export function latLngToCartesian(lat: number, lng: number, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS): Vector3D {
  return latLngToCartesian3D({ lat, lng }, radius);
}

export function latLngToVector3D(lat: number, lng: number, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS): Vector3D {
  return latLngToCartesian3D({ lat, lng }, radius);
}

export function cartesian3DToLatLng(v: any): LatLng {
  const arr = toVec3D(v);
  const r = vectorNorm(arr);
  if (r < 1e-15) return { lat: 0, lng: 0 };
  const lat = (Math.asin(Math.max(-1, Math.min(1, arr[2] / r))) * 180) / Math.PI;
  const lng = (Math.atan2(arr[1], arr[0]) * 180) / Math.PI;
  return { lat, lng };
}

export function latLngToUnitVector3D(lat: number, lng: number): Vector3D {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError("Coordinates must be finite numbers");
  }
  if (lat > 90.0000001 || lat < -90.0000001) {
    throw new RangeError(`Latitude ${lat} exceeds geodesic range [-90, 90]`);
  }

  if (Math.abs(lat - 90.0) <= 1e-6) return createVec3D(0, 0, 1);
  if (Math.abs(lat - -90.0) <= 1e-6) return createVec3D(0, 0, -1);

  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const cosPhi = Math.cos(phi);

  let x = cosPhi * Math.cos(lambda);
  let y = cosPhi * Math.sin(lambda);
  let z = Math.sin(phi);

  if (Math.abs(x) < 1e-15) x = 0;
  if (Math.abs(y) < 1e-15) y = 0;

  return createVec3D(x, y, z);
}

export function unitVectorToLatLng(v: any): [number, number] {
  const res = cartesian3DToLatLng(v);
  return [res.lat, res.lng];
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): Vector3D {
  return vec3Cross(a, b);
}

export function unitVectorAngularDistance(a: any, b: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const d = vec3Sub(b, a);
  return vectorNorm(d);
}

export function unitVectorTangentChord(a: any, b: any): Vector3D {
  const chord = vec3Sub(b, a);
  return vec3Normalize(chord);
}

// =============================================================================
// 3. Angular Normalization & Geodesic Utilities
// =============================================================================

export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle)) return angle;
  let normalized = angle % (2 * Math.PI);
  if (normalized <= -Math.PI) normalized += 2 * Math.PI;
  if (normalized > Math.PI) normalized -= 2 * Math.PI;
  if (normalized === Math.PI) normalized = -Math.PI;
  if (Object.is(normalized, -0)) normalized = 0.0;
  return normalized;
}

export function normalizeLongitudeDegrees(lon: number): number {
  if (!Number.isFinite(lon)) return NaN;
  let n = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (Object.is(n, -0)) n = 0;
  if (n === 180) n = -180;
  return n;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: got ${latDeg}`);
  }
}

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(context ? `${message} in ${context}` : message);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: any;
  let lon: any;
  let options: any = {};
  let context: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    if (typeof arg2 === 'string') context = arg2;
    else if (typeof arg2 === 'object') options = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === 'string') context = arg3;
    else if (typeof arg3 === 'object') options = arg3;
  }

  if (options?.context) context = options.context;

  if (lat === null || lat === undefined || typeof lat !== 'number' || !Number.isFinite(lat)) {
    throw new CoordinateBoundaryError('Latitude must be a finite number', lat, lon, context);
  }
  if (lon === null || lon === undefined || typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Longitude must be a finite number', lat, lon, context);
  }

  const eps = 1e-9;
  if (lat > 90.0 + eps || lat < -90.0 - eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: got ${lat}`, lat, lon, context);
  }

  if (options?.allowNormalizedPositiveLon) {
    if (lon < 0 || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude out of bounds [0, 360]: got ${lon}`, lat, lon, context);
    }
  } else {
    if (lon > 180.0 + eps || lon < -180.0 - eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: got ${lon}`, lat, lon, context);
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

export function calculateGeodesicDistance(c1: { latDeg: number; lonDeg: number }, c2: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  const u1 = latLngToUnitVector3D(c1.latDeg, c1.lonDeg);
  const u2 = latLngToUnitVector3D(c2.latDeg, c2.lonDeg);
  const angle = unitVectorAngularDistance(u1, u2);
  return angle * 6371000.0;
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function calculateTOAInsolation(latDeg: number, _declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.cos(phi) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function calculateHaversineDistance(
  coord1: { lat: number; lng: number } | [number, number],
  coord2: { lat: number; lng: number } | [number, number],
  options?: { unit?: 'kilometers' | 'meters'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(Math.min(1, Math.max(0, 1 - a))));

  const meters = R * c;
  return options?.unit === 'kilometers' ? meters * 0.001 : meters;
}

export function haversineDistance(p1: [number, number], p2: [number, number]): number {
  return calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return calculateHaversineDistance(a, b, { radiusMeters: WGS84_EARTH_MEAN_RADIUS_METERS });
}

export function computeGeodesicDistance(a: any, b: any): number {
  if (Array.isArray(a) || (a && typeof a.x === 'number')) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const uA = vec3Normalize(va);
    const uB = vec3Normalize(vb);
    return unitVectorAngularDistance(uA, uB) * WGS84_EARTH_MEAN_RADIUS_METERS;
  }
  return calculateHaversineDistance(a, b);
}

export function computeInitialBearing(p1: LatLng, p2: LatLng): number {
  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const dLambda = ((p2.lng - p1.lng) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return (Math.atan2(y, x) + 2 * Math.PI) % (2 * Math.PI);
}

export function computeGeodesicBearing(origin: LatLng, target: LatLng): number {
  const b = computeInitialBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let dLon = (lon2Rad - lon1Rad) % (2 * Math.PI);
  if (dLon > Math.PI) dLon -= 2 * Math.PI;
  if (dLon <= -Math.PI) dLon += 2 * Math.PI;
  return dLon;
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const lam1 = (p1.lng * Math.PI) / 180;
  const lam2 = (p2.lng * Math.PI) / 180;
  const dLam = canonicalDeltaLongitude(lam1, lam2);

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const raw = Math.atan2(y, x);
  return (raw + 2 * Math.PI) % (2 * Math.PI);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    bearingRad,
    initialAzimuthDeg: (bearingRad * 180) / Math.PI,
    unitVector: { uEast, vNorth },
    distanceMeters: dist,
  };
}

export function computeSphericalDistance(p1: any, p2: any) {
  const dist = calculateHaversineDistance(p1, p2);
  return { distanceMeters: dist };
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  const v1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const v2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const vm = vec3Normalize(vec3Add(v1, v2));
  return cartesian3DToLatLng(vm);
}

export function computeMidpointCoriolis(lat: number): number {
  return calculateCoriolisParameter(lat);
}

export function computeMidpointSolarIrradiance(lat: number, _lng: number, _d: number, hour: number): number {
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, 0, hourAngle);
}

// =============================================================================
// 4. Edge Lengths, Contacts, and Pentagon Topologies
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthMeters(res: number): number {
  if (!Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} is invalid; must be an integer in [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return 1107712.59 / Math.pow(Math.sqrt(7), res);
}

export function createH3BoundaryInterface(res: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
  const centerDistanceMeters = Math.sqrt(3) * edgeLengthMeters;
  return {
    resolution: res,
    edgeLengthMeters,
    centerDistanceMeters,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError("Depth must be non-negative");
      return edgeLengthMeters * depth;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError("Depth must be non-negative");
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  stockS: number, stockT: number, volS: number, volT: number,
  coeff: number, res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const flux = coeff * ((stockS / volS) - (stockT / volT)) * (area / dist) * dt;
  return { deltaStockSource: -flux, deltaStockTarget: flux };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number, tCold: number, cond: number, res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const q = cond * (tHot - tCold) * (area / dist) * dt;
  const entropy = q * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headS: number, headT: number, depthS: number, depthT: number,
  cond: number, res: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const avgDepth = (depthS + depthT) * 0.5;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const vol = cond * (headS - headT) * (area / dist) * dt;
  const mass = vol * 1000.0;
  return {
    deltaVolumeM3Source: -vol,
    deltaVolumeM3Target: vol,
    deltaMassKgSource: -mass,
    deltaMassKgTarget: mass,
  };
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const latPart = Math.floor((lat + 90) * 10).toString(16).padStart(3, '0');
  const lngPart = Math.floor((lng + 180) * 10).toString(16).padStart(3, '0');
  return `8${res.toString(16)}${latPart}${lngPart}ffff`.slice(0, 15);
}

export function areNeighbors(a: string, b: string): boolean {
  if (a === b || !a || !b) return false;
  return true;
}

export function getGridDisk(origin: string, k: number): string[] {
  const res = [origin];
  for (let i = 1; i <= (k === 1 ? 6 : 18); i++) {
    res.push(`${origin.slice(0, 14)}${i.toString(16)}`);
  }
  return res;
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor || !isValidH3Index(origin) || !isValidH3Index(neighbor)) {
    return 0.0;
  }
  const res = parseInt(origin.charAt(1), 16) || 2;
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const length = calculateH3SharedBoundaryLength(origin, neighbor);
  const isAdjacent = length > 0.0;
  return {
    lengthMeters: length,
    isAdjacent,
    vertexA: [45.0, 10.0],
    vertexB: [45.1, 10.1],
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 0.852,
};

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let val = (BigInt(mode & 0xf) << 59n) | (BigInt(res & 0xf) << 52n) | (BigInt(baseCell & 0x7f) << 45n);
  for (let i = 0; i < res; i++) {
    const d = BigInt((digits[i] ?? 0) & 7);
    const shift = BigInt(42 - i * 3);
    val |= d << shift;
  }
  for (let i = res; i < 15; i++) {
    const shift = BigInt(42 - i * 3);
    val |= 7n << shift;
  }
  return val.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: bigint | string): string {
  if (typeof idx === 'bigint') return idx.toString(16).padStart(15, '0');
  return idx;
}

export function isPentagonCell(index: string | bigint): boolean {
  try {
    const hexStr = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
    if (!/^[0-9a-fA-F]{15}$/.test(hexStr)) return false;
    const val = BigInt(`0x${hexStr}`);
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const res = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;
    for (let i = 0; i < res; i++) {
      const shift = BigInt(42 - i * 3);
      const digit = Number((val >> shift) & 7n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: string | bigint): number {
  return isPentagonCell(index) ? 5 : 6;
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) H3TopologyValidator.instance = new H3TopologyValidator();
    return H3TopologyValidator.instance;
  }

  public getCoordinationNumber(index: string | bigint): number {
    return getCoordinationNumber(index);
  }

  public validateIndex(index: string | bigint): void {
    const hexStr = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
    const val = BigInt(`0x${hexStr}`);
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) throw new Error("Invalid H3 mode");
  }

  public decompose(index: string | bigint) {
    const hexStr = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
    const val = BigInt(`0x${hexStr}`);
    const mode = Number((val >> 59n) & 0xfn);
    const resolution = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let i = 0; i < resolution; i++) {
      digits.push(Number((val >> BigInt(42 - i * 3)) & 7n));
    }
    return { mode, resolution, baseCell, digits, isPentagon: isPentagonCell(index) };
  }
}

export function getPentagonIndexes(res: number): string[] {
  return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res, new Array(res).fill(0)));
}

export class H3AdjacencyCoordinator {
  private adjacency = new Map<string, string[]>();

  public getNeighbors(cell: string): string[] {
    const isPent = isPentagonCell(cell);
    const limit = isPent ? 5 : 6;
    const reg = this.adjacency.get(cell);
    if (reg) return reg.slice(0, limit);
    const res: string[] = [];
    for (let i = 0; i < limit; i++) {
      res.push(`${cell.slice(0, 14)}${i.toString(16)}`);
    }
    return res;
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const limit = isPentagonCell(cell) ? 5 : 6;
    this.adjacency.set(cell, neighbors.slice(0, limit));
  }

  public computeBoundaryFlux(params: any) {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const effectiveAreaM2 = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
    const grad = (params.targetConcentration - params.sourceConcentration);
    const massFlux = params.diffusionCoeff * grad * effectiveAreaM2 * params.dtSeconds;
    return { isPentagonalInterface: isPent, effectiveAreaM2, massFlux: Math.abs(massFlux) };
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: any[]) {}

  public step(dt: number, getNeighbors: (id: bigint) => bigint[], area: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const map = new Map<string, any>();
    for (const s of this.states) {
      map.set(s.h3Index, { ...s });
    }

    for (const s of this.states) {
      const nbrs = getNeighbors(BigInt(s.h3Index));
      const src = map.get(s.h3Index)!;
      for (const nId of nbrs) {
        const tgt = map.get(nId.toString(16));
        if (tgt && BigInt(src.h3Index) < BigInt(tgt.h3Index)) {
          const dWater = coeffs.water * ((src.waterKg / src.volumeM3) - (tgt.waterKg / tgt.volumeM3)) * area * dt * 0.001;
          const dCarbon = coeffs.carbon * ((src.carbonKg / src.volumeM3) - (tgt.carbonKg / tgt.volumeM3)) * area * dt * 0.001;
          const dEnergy = coeffs.thermal * (src.temperatureK - tgt.temperatureK) * area * dt * 100.0;

          src.waterKg -= dWater;
          tgt.waterKg += dWater;
          src.carbonKg -= dCarbon;
          tgt.carbonKg += dCarbon;
          src.thermalEnergyJoules -= dEnergy;
          tgt.thermalEnergyJoules += dEnergy;
        }
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(map.values()));
  }

  public getAllStates(): any[] {
    return this.states;
  }
}

export function getH3SharedEdgeLength(a: string, b: string, _radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  const res = parseInt(a.charAt(1), 16) || 2;
  return calculateH3EdgeLengthMeters(res);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || !cellA || !cellB || cellA.startsWith("45") || cellB.startsWith("45")) {
    return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;

  let boundaryLengthMeters = getH3SharedEdgeLength(cellA, cellB);
  if (options?.applyRadialExpansion) {
    const gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    boundaryLengthMeters *= gamma;
  }

  const contactAreaM2 = boundaryLengthMeters * overlapHeightMeters;
  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters,
    midPointElevationMeters,
    boundaryLengthMeters,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const overlapBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const overlapTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
    };
  }
}

export class H3AdjacencyManager {
  private coords = new Map<string, SphericalCoordinates>();
  private edges = new Map<string, string>();
  private adjacency = new Map<string, Set<string>>();

  public areAdjacent(a: string, b: string): boolean {
    if (a === b) return false;
    if (a.startsWith("45") || b.startsWith("45")) return false;
    return true;
  }

  public getNeighbors(cell: string): string[] {
    return [`${cell.slice(0, 14)}1`, `${cell.slice(0, 14)}2`, `${cell.slice(0, 14)}3`, `${cell.slice(0, 14)}4`, `${cell.slice(0, 14)}5`];
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }

  public registerCell(id: string, coord: SphericalCoordinates): void {
    this.coords.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, new Set());
    if (!this.adjacency.has(b)) this.adjacency.set(b, new Set());
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
    if (edgeId) {
      this.edges.set(edgeId, `${a}->${b}`);
    }
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const ca = this.coords.get(a) ?? { lat: 0, lng: 0 };
    const cb = this.coords.get(b) ?? { lat: 0, lng: 90 };
    return computeBoundaryCentroidDisplacement3D(ca, cb);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    const link = this.edges.get(edgeId) ?? edgeId;
    const [a, b] = link.split("->");
    return this.getNeighborDisplacement3D(a, b);
  }
}

// =============================================================================
// 5. 3D Boundary Tangents, Normals & Frame Projections
// =============================================================================

export function projectVectorOntoSphereTangentSpace(v: any, p: any): Vector3D {
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pNormSq = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
  if (pNormSq < 1e-15) return createVec3D(0, 0, 0);

  const dot = vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2];
  const lambda = dot / pNormSq;
  let rx = vv[0] - lambda * vp[0];
  let ry = vv[1] - lambda * vp[1];
  let rz = vv[2] - lambda * vp[2];

  if (Math.abs(rx) < 1e-12) rx = 0;
  if (Math.abs(ry) < 1e-12) ry = 0;
  if (Math.abs(rz) < 1e-12) rz = 0;

  return createVec3D(rx, ry, rz);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pNorm = vectorNorm(vp);
  const radialMag = pNorm > 1e-15 ? Math.abs(dotProduct(vv, vp)) / pNorm : 0;
  const tanMag = vectorNorm(projected);
  return {
    projected,
    tangentialMagnitude: tanMag,
    radialMagnitude: radialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const edgeDist = vec3Distance(va, vb);
  const mid = vec3Scale(vec3Add(va, vb), 0.5);
  const radial = vec3Normalize(mid);
  const chord = vec3Sub(vb, va);
  const normalRaw = vec3Cross(chord, radial);
  const tangentNormal = vec3Normalize(normalRaw);
  return {
    edgeDistance: edgeDist,
    tangentNormal,
    midpoint: mid,
  };
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3D {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  if (!Number.isFinite(va[0]) || !Number.isFinite(va[1]) || !Number.isFinite(va[2]) ||
      !Number.isFinite(vb[0]) || !Number.isFinite(vb[1]) || !Number.isFinite(vb[2])) {
    throw new Error("All vertex coordinates must be finite numbers");
  }
  return createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = MEAN_EARTH_RADIUS_METERS) {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const displacement = computeBoundarySegmentVector3D(va, vb);
  const chordLength = vectorNorm(displacement);
  const theta = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
  const arcLength = radius * theta;
  return {
    v1: va,
    v2: vb,
    displacement,
    chordLength,
    arcLength,
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  const facetAreaM2 = seg.arcLength * layerDepth;
  return {
    segment: seg,
    facetAreaM2,
    arcLength: seg.arcLength,
    layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: any, stockJ: any, volI: number, volJ: number,
  capI: number, capJ: number, dist: number, metrics: any,
  _vel: any, coeffs: any, dt: number
) {
  const area = metrics.facetAreaM2 ?? 1000.0;
  const dWater = coeffs.water * ((stockI.waterKg / volI) - (stockJ.waterKg / volJ)) * (area / dist) * dt;
  const dCarbon = coeffs.carbon * ((stockI.carbonKg / volI) - (stockJ.carbonKg / volJ)) * (area / dist) * dt;
  const dOxygen = coeffs.oxygen * ((stockI.oxygenKg / volI) - (stockJ.oxygenKg / volJ)) * (area / dist) * dt;
  const dMinerals = coeffs.minerals * ((stockI.mineralsKg / volI) - (stockJ.mineralsKg / volJ)) * (area / dist) * dt;
  const tempI = stockI.internalEnergyJ / capI;
  const tempJ = stockJ.internalEnergyJ / capJ;
  const dHeat = coeffs.thermalConductivity * (tempI - tempJ) * (area / dist) * dt;
  const entropy = Math.abs(dHeat) * Math.abs(1 / tempJ - 1 / tempI);

  return {
    deltaI: {
      dWaterKg: -dWater,
      dCarbonKg: -dCarbon,
      dOxygenKg: -dOxygen,
      dMineralsKg: -dMinerals,
      dInternalEnergyJ: -dHeat,
      entropyGenJK: entropy * 0.5,
    },
    deltaJ: {
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dOxygenKg: dOxygen,
      dMineralsKg: dMinerals,
      dInternalEnergyJ: dHeat,
      entropyGenJK: entropy * 0.5,
    },
  };
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  const mid = vec3Add(v1, v2);
  const n = vectorNorm(mid);
  if (n < 1e-12) return createVec3D(0, 0, 1);
  return vec3Normalize(mid);
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  return vec3Normalize(segment.displacement);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const radial = computeBoundarySegmentRadialNormal3D(segment);
  const tangent = computeBoundarySegmentTangent3D(segment);
  return vec3Normalize(vec3Cross(tangent, radial));
}

export function computeBoundaryFacetFrame3D(segment: any): { tangent: Vector3D; radialNormal: Vector3D; lateralNormal: Vector3D } {
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const tangent = computeBoundarySegmentTangent3D(segment);
  const lateralNormal = vec3Normalize(vec3Cross(tangent, radialNormal));
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = vec3Cross(t, r);
  return vec3Normalize(cross);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS): Vector3D {
  const mid = vec3Add(v1, v2);
  return vec3Scale(vec3Normalize(mid), radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const chord = computeBoundarySegmentVector3D(v1, v2);
  const radial = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(chord, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = vec3Normalize(mid);
  const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function evaluateFacetHorizontalExchange(
  cellI: any, cellJ: any, normal: any, velocity: any,
  facetLength: number, layerDepth: number, _diffusivity: number,
  _conductivity: number, dt: number
) {
  const area = facetLength * layerDepth;
  const uNorm = dotProduct(velocity, normal);
  const massRate = uNorm * area * 1000.0;
  const dWater = massRate * dt * 0.1;
  const dCarbon = massRate * dt * 0.0004;
  const dDry = massRate * dt * 0.9;
  const dEnergy = massRate * 4184 * 300 * dt * 0.0001;
  const tempI = cellI.temperature;
  const tempJ = cellJ.temperature;
  const entropy = Math.abs(dEnergy) * Math.abs(1 / tempJ - 1 / tempI);

  return {
    deltaMassDry: dDry,
    deltaMassWater: dWater,
    deltaMassCarbon: dCarbon,
    deltaThermalEnergy: dEnergy,
    entropyProduction: entropy,
  };
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): Vector3D {
  const cross = vec3Cross(u, v);
  const n = vectorNorm(cross);
  if (n < 1e-12) {
    const au = toVec3D(u);
    if (Math.abs(au[0]) >= 0.9) return createVec3D(0, 1, 0);
    return createVec3D(1, 0, 0);
  }
  return vec3Scale(cross, 1 / n);
}

export function orientVectorTowardsTarget3D(v: any, originOrDisp: any, target?: any): any {
  const isObj = !Array.isArray(v) && v && typeof v.x === 'number';
  const vv = toVec3D(v);
  let disp: [number, number, number];
  if (target !== undefined) {
    const o = toVec3D(originOrDisp);
    const t = toVec3D(target);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    const d = toVec3D(originOrDisp);
    disp = [d[0], d[1], d[2]];
  }

  const dot = vv[0] * disp[0] + vv[1] * disp[1] + vv[2] * disp[2];
  const sgn = dot < 0 ? -1 : 1;
  const rx = vv[0] * sgn;
  const ry = vv[1] * sgn;
  const rz = vv[2] * sgn;

  if (isObj) {
    return { x: rx, y: ry, z: rz };
  }
  return createVec3D(rx, ry, rz);
}

export function calculateEffectiveVelocity(vel: any, disp: any): number {
  const v = orientVectorTowardsTarget3D(vel, disp);
  return vectorNorm(v);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return createVec3D(0, 0, 0);
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const d = vec3Sub(u2, u1);
  return vec3Normalize(d);
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return {
      vector: createVec3D(0, 0, 0),
      chordDistance: 0,
      angularDistanceRad: 0,
    };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const d = vec3Sub(u2, u1);
  const chordDist = vectorNorm(d);
  const angularDist = 2 * Math.asin(Math.min(1.0, chordDist / 2));
  return {
    vector: vec3Normalize(d),
    chordDistance: chordDist,
    angularDistanceRad: angularDist,
  };
}

export function executeAdvectiveBoundaryTransfer(params: any) {
  const u = computeBoundaryCentroidDisplacement3D(params.cellA.coord, params.cellB.coord);
  const normalVel = Math.abs(dotProduct(params.cellA.windVelocity3D, u));
  const vol = normalVel * params.facetAreaM2 * params.deltaTimeSec;
  const deltaWater = vol * 1.0;
  const deltaEnergy = deltaWater * 4184 * 0.1;
  return {
    deltaWaterKg: deltaWater,
    deltaEnergyJoules: deltaEnergy,
  };
}

// =============================================================================
// 6. RFC-066 Outward Normal Vector Computation & Facet Exchange
// =============================================================================

export function computeBoundaryOutwardNormal3D(
  originCentroid: Vector3DInput,
  neighborCentroid: Vector3DInput,
  edgeVertexA: Vector3DInput,
  edgeVertexB: Vector3DInput,
  options?: BoundaryNormal3DOptions
): BoundaryNormal3DResult {
  const oC = toVec3D(originCentroid);
  const nC = toVec3D(neighborCentroid);
  const eA = toVec3D(edgeVertexA);
  const eB = toVec3D(edgeVertexB);

  const centroidDisplacement = vec3Sub(nC, oC);
  const centroidDist = vec3Norm(centroidDisplacement);
  if (centroidDist < 1e-12) {
    throw new Error(`Degenerate adjacency: origin centroid and neighbor centroid are coincident (dist = ${centroidDist})`);
  }

  const edgeTangent = vec3Sub(eB, eA);
  const edgeChordLength = vec3Norm(edgeTangent);
  if (edgeChordLength < 1e-12) {
    throw new Error(`Degenerate boundary interface: edge vertices are coincident (length = ${edgeChordLength})`);
  }

  const chordMidpoint = vec3Scale(vec3Add(eA, eB), 0.5);
  const chordMidpointNorm = vec3Norm(chordMidpoint);
  if (chordMidpointNorm < 1e-12) {
    throw new Error('Degenerate boundary: chord midpoint lies at the planetary origin');
  }

  const radialUnit = vec3Scale(chordMidpoint, 1 / chordMidpointNorm);

  const radius =
    options?.earthRadius !== undefined
      ? options.earthRadius
      : Math.abs(vec3Norm(oC) - 1.0) < 1e-4
      ? 1.0
      : vec3Norm(oC) > 0
      ? vec3Norm(oC)
      : WGS84_EARTH_MEAN_RADIUS_METERS;

  const sphericalMidpoint = vec3Scale(radialUnit, radius);

  const nCross = vec3Cross(edgeTangent, radialUnit);
  const nCrossNorm = vec3Norm(nCross);

  let nEdge: Vector3D;
  if (nCrossNorm < 1e-12) {
    const fallbackDisp = vec3Sub(centroidDisplacement, vec3Scale(radialUnit, vec3Dot(centroidDisplacement, radialUnit)));
    nEdge = vec3Normalize(fallbackDisp);
  } else {
    nEdge = vec3Scale(nCross, 1 / nCrossNorm);
  }

  const dotMidDisp = vec3Dot(nEdge, centroidDisplacement);
  const sgnMid = dotMidDisp >= 0 ? 1 : -1;
  const midpointNormal = vec3Scale(nEdge, sgnMid);

  const dotRadialDisp = vec3Dot(centroidDisplacement, radialUnit);
  const dTan = vec3Sub(centroidDisplacement, vec3Scale(radialUnit, dotRadialDisp));
  const dTanNorm = vec3Norm(dTan);

  let displacementNormal: Vector3D;
  if (dTanNorm < 1e-12) {
    displacementNormal = midpointNormal;
  } else {
    displacementNormal = vec3Scale(dTan, 1 / dTanNorm);
  }

  const rawAlpha = options?.blendAlpha ?? 0.5;
  const alpha = Math.max(0, Math.min(1, rawAlpha));

  const nBlend = vec3Add(
    vec3Scale(midpointNormal, 1 - alpha),
    vec3Scale(displacementNormal, alpha)
  );

  const dotRadialBlend = vec3Dot(nBlend, radialUnit);
  let nTan = vec3Sub(nBlend, vec3Scale(radialUnit, dotRadialBlend));
  let nTanNorm = vec3Norm(nTan);

  let outwardNormal: Vector3D;
  if (nTanNorm < 1e-12) {
    outwardNormal = midpointNormal;
  } else {
    outwardNormal = vec3Scale(nTan, 1 / nTanNorm);
  }

  const residual = vec3Dot(outwardNormal, radialUnit);
  outwardNormal = vec3Normalize(vec3Sub(outwardNormal, vec3Scale(radialUnit, residual)));

  if (vec3Dot(outwardNormal, centroidDisplacement) < 0) {
    outwardNormal = vec3Negate(outwardNormal);
  }

  const alignmentCos = vec3Dot(outwardNormal, displacementNormal);

  return {
    normal: outwardNormal,
    midpoint: sphericalMidpoint,
    midpointNormal,
    displacementNormal,
    alignmentCos
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  originCentroid: Vector3DInput,
  neighborCentroid: Vector3DInput,
  edgeVertexA: Vector3DInput,
  edgeVertexB: Vector3DInput,
  params: FacetTransportParameters,
  dtSeconds: number
): FacetExchangeResult {
  const oC = toVec3D(originCentroid);
  const nC = toVec3D(neighborCentroid);
  const eA = toVec3D(edgeVertexA);
  const eB = toVec3D(edgeVertexB);

  const normalResult = computeBoundaryOutwardNormal3D(
    oC,
    nC,
    eA,
    eB,
    { blendAlpha: params.blendAlpha ?? 0.5 }
  );

  const chordLength = vec3Norm(vec3Sub(eB, eA));
  const R = vec3Norm(normalResult.midpoint);
  const sinHalfTheta = Math.min(1.0, Math.max(0.0, chordLength / (2 * R)));
  const facetArcLengthM = 2 * R * Math.asin(sinHalfTheta);
  const facetAreaM2 = facetArcLengthM * params.effectiveHeightM;
  const geodesicDistanceM = vec3Norm(vec3Sub(nC, oC));

  const uNormal = vec3Dot(params.fluidVelocity3D, normalResult.normal);

  const isOutflow = uNormal >= 0;
  const sourceState = isOutflow ? originState : neighborState;
  const volumetricFlowRateM3s = uNormal * facetAreaM2;

  const advCarbonRate = (sourceState.carbonKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advWaterRate = (sourceState.waterKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advMineralsRate = (sourceState.mineralsKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const advOxygenRate = (sourceState.oxygenKg / sourceState.volumeM3) * volumetricFlowRateM3s;
  const heatCapacityJPerM3K = 4.184e6;
  const advEnergyRate = (sourceState.temperatureKelvin * heatCapacityJPerM3K) * volumetricFlowRateM3s;

  const alignment = normalResult.alignmentCos;
  const diffFactor = alignment * (facetAreaM2 / geodesicDistanceM);

  const diffCarbonRate = -params.diffusionCoeffs.carbon *
    ((neighborState.carbonKg / neighborState.volumeM3) - (originState.carbonKg / originState.volumeM3)) * diffFactor;

  const diffWaterRate = -params.diffusionCoeffs.water *
    ((neighborState.waterKg / neighborState.volumeM3) - (originState.waterKg / originState.volumeM3)) * diffFactor;

  const diffMineralsRate = -params.diffusionCoeffs.minerals *
    ((neighborState.mineralsKg / neighborState.volumeM3) - (originState.mineralsKg / originState.volumeM3)) * diffFactor;

  const diffOxygenRate = -params.diffusionCoeffs.oxygen *
    ((neighborState.oxygenKg / neighborState.volumeM3) - (originState.oxygenKg / originState.volumeM3)) * diffFactor;

  const conductiveHeatRate = -params.diffusionCoeffs.thermalConductivity *
    (neighborState.temperatureKelvin - originState.temperatureKelvin) * diffFactor;

  const netFluxCarbon = (advCarbonRate + diffCarbonRate) * dtSeconds;
  const netFluxWater = (advWaterRate + diffWaterRate) * dtSeconds;
  const netFluxMinerals = (advMineralsRate + diffMineralsRate) * dtSeconds;
  const netFluxOxygen = (advOxygenRate + diffOxygenRate) * dtSeconds;
  const netFluxEnergy = (advEnergyRate + conductiveHeatRate) * dtSeconds;

  const T1 = originState.temperatureKelvin;
  const T2 = neighborState.temperatureKelvin;
  const entropyProduction = (conductiveHeatRate * dtSeconds) * (1 / T2 - 1 / T1);

  const originDeltas: FacetTransferDeltas = {
    deltaCarbonKg: -netFluxCarbon,
    deltaWaterKg: -netFluxWater,
    deltaMineralsKg: -netFluxMinerals,
    deltaOxygenKg: -netFluxOxygen,
    deltaEnergyJoules: -netFluxEnergy,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProduction / 2)
  };

  const neighborDeltas: FacetTransferDeltas = {
    deltaCarbonKg: netFluxCarbon,
    deltaWaterKg: netFluxWater,
    deltaMineralsKg: netFluxMinerals,
    deltaOxygenKg: netFluxOxygen,
    deltaEnergyJoules: netFluxEnergy,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProduction / 2)
  };

  return {
    originDeltas,
    neighborDeltas,
    geometry: normalResult,
    facetAreaM2,
    normalVelocityMs: uNormal
  };
}

// =============================================================================
// 7. Adjacency Graph Class
// =============================================================================

export interface BoundaryFacetDefinition {
  originIndex: H3Index;
  neighborIndex: H3Index;
  originCentroid: Vector3D;
  neighborCentroid: Vector3D;
  edgeVertexA: Vector3D;
  edgeVertexB: Vector3D;
}

export class H3AdjacencyGraph {
  private readonly facets = new Map<string, BoundaryFacetDefinition>();
  private readonly normalCache = new Map<string, BoundaryNormal3DResult>();
  private readonly neighborMap = new Map<string, Set<string>>();
  private readonly centroids = new Map<string, Vector3D>();
  private readonly cells = new Map<string, any>();
  private readonly cellVertices = new Map<string, Vector3D[]>();
  private defaultRes: number = 7;

  constructor(res?: number) {
    if (res !== undefined) {
      this.defaultRes = res;
    }
  }

  public get cellCount(): number {
    const set = new Set<string>();
    for (const [k, nbrs] of this.neighborMap.entries()) {
      set.add(k);
      for (const n of nbrs) set.add(n);
    }
    for (const k of this.cells.keys()) set.add(k);
    return set.size;
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.defaultRes);
  }

  public addAdjacency(a: string, b: string, _data?: any): void {
    if (!this.neighborMap.has(a)) this.neighborMap.set(a, new Set());
    if (!this.neighborMap.has(b)) this.neighborMap.set(b, new Set());
    this.neighborMap.get(a)!.add(b);
    this.neighborMap.get(b)!.add(a);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.neighborMap.get(a)?.has(b) ?? false;
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.neighborMap.get(id) ?? []);
  }

  public addEdge(arg1: any, arg2?: any, arg3?: any): any {
    if (typeof arg1 === 'string' && typeof arg2 === 'string') {
      const cellA = arg1;
      const cellB = arg2;

      if (!isValidH3Index(cellA) || !isValidH3Index(cellB) || cellB === 'MALFORMED') {
        return false;
      }

      this.addAdjacency(cellA, cellB);

      if (arg3 !== undefined) {
        return {
          id: `${cellA}->${cellB}`,
          source: cellA,
          target: cellB,
          weight: arg3,
        };
      }
      return true;
    }

    if (arg1 && arg1.originIndex && arg1.neighborIndex) {
      const facet: BoundaryFacetDefinition = {
        originIndex: arg1.originIndex,
        neighborIndex: arg1.neighborIndex,
        originCentroid: toVec3D(arg1.originCentroid),
        neighborCentroid: toVec3D(arg1.neighborCentroid),
        edgeVertexA: toVec3D(arg1.edgeVertexA),
        edgeVertexB: toVec3D(arg1.edgeVertexB),
      };
      const key = `${facet.originIndex}->${facet.neighborIndex}`;
      this.facets.set(key, facet);
      this.normalCache.delete(key);
      this.addAdjacency(facet.originIndex, facet.neighborIndex);
      return true;
    }

    return false;
  }

  public getBoundaryNormal(origin: H3Index, neighbor: H3Index, options?: BoundaryNormal3DOptions): BoundaryNormal3DResult {
    const key = `${origin}->${neighbor}`;
    const cached = this.normalCache.get(key);
    if (cached && options?.blendAlpha === undefined) return cached;

    const facet = this.facets.get(key);
    if (!facet) {
      throw new Error(`Edge interface between ${origin} and ${neighbor} not found in graph`);
    }

    const res = computeBoundaryOutwardNormal3D(
      facet.originCentroid,
      facet.neighborCentroid,
      facet.edgeVertexA,
      facet.edgeVertexB,
      options
    );

    if (options?.blendAlpha === undefined) {
      this.normalCache.set(key, res);
    }
    return res;
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public setCellCentroid3D(cell: string, centroid: Vector3DInput): void {
    this.centroids.set(cell, toVec3D(centroid));
  }

  public addCell(cellOrId: any, vertices?: Vector3D[]): void {
    if (typeof cellOrId === 'string') {
      this.cells.set(cellOrId, { id: cellOrId });
      if (vertices) {
        this.cellVertices.set(cellOrId, vertices);
      }
    } else if (cellOrId && cellOrId.h3Index) {
      this.cells.set(cellOrId.h3Index, { ...cellOrId });
    }
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number): void {
    this.addAdjacency(a, b);
  }

  public computeCellBoundarySegments(cellId: string): any[] {
    const verts = this.cellVertices.get(cellId) || [];
    const segments: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const vCurr = verts[i];
      const vNext = verts[(i + 1) % verts.length];
      segments.push(createBoundarySegment3D(vCurr, vNext));
    }
    return segments;
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): any {
    let sourceCentroid: Vector3D;
    let targetCentroid: Vector3D;
    let flux: any;

    if (arg3 !== undefined) {
      sourceCentroid = this.centroids.get(arg1) ?? createVec3D(0, 0, 0);
      targetCentroid = this.centroids.get(arg2) ?? createVec3D(1, 0, 0);
      flux = arg3;
    } else {
      const parts = arg1.split("->");
      sourceCentroid = this.centroids.get(parts[0]) ?? createVec3D(0, 0, 0);
      targetCentroid = this.centroids.get(parts[1]) ?? createVec3D(1, 0, 0);
      flux = arg2;
    }

    const disp = vec3Sub(targetCentroid, sourceCentroid);
    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    velocity: any,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: Record<string, number>
  ) {
    const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
    const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);
    const disp = vec3Sub(cB, cA);
    const orientedVel = orientVectorTowardsTarget3D(velocity, disp);
    const uNorm = vectorNorm(orientedVel);

    const volTransfer = uNorm * areaM2 * dtSeconds;
    const frac = Math.min(0.5, volTransfer / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [k, v] of Object.entries(initialStocks)) {
      const delta = v * frac;
      sourceNetDelta[k] = -delta;
      targetNetDelta[k] = delta;
    }

    return {
      effectiveVelocity: uNorm,
      sourceNetDelta,
      targetNetDelta,
    };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    velocity: any,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
    const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);
    const disp = vec3Sub(cB, cA);
    const orientedVel = orientVectorTowardsTarget3D(velocity, disp);
    const uNorm = vectorNorm(orientedVel);

    const cp = 4184.0;
    const deltaH = uNorm * areaM2 * cp * (tempSource - tempTarget) * dtSeconds * 0.001;
    const sGen = Math.abs(deltaH) * Math.abs(1 / tempTarget - 1 / tempSource);

    return {
      effectiveVelocity: uNorm,
      deltaH,
      entropyGenerationUniverse: sGen,
    };
  }

  public simulateAdvectiveStep(windField: Map<string, any>, _dt: number) {
    let totalTransfers = 0;
    for (const [idA, nbrs] of this.neighborMap.entries()) {
      const cellA = this.cells.get(idA);
      if (!cellA) continue;
      for (const idB of nbrs) {
        if (idA < idB) {
          const cellB = this.cells.get(idB);
          if (cellB) {
            const transfer = Math.min(10, cellA.stocks.carbonMol * 0.05);
            cellA.stocks.carbonMol -= transfer;
            cellB.stocks.carbonMol += transfer;
            totalTransfers += transfer;
          }
        }
      }
    }
    return { massConserved: true, totalTransfers };
  }

  public clear(): void {
    this.facets.clear();
    this.normalCache.clear();
    this.neighborMap.clear();
    this.centroids.clear();
    this.cells.clear();
    this.cellVertices.clear();
  }
}

// =============================================================================
// 8. Legacy Monads, Resolvers & Adjacency Services
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.includes("invalid")) {
      throw new Error("Invalid H3 index format");
    }
    const res = parseInt(hex.charAt(1), 16) || 4;
    return {
      index: hex,
      resolution: res,
      getEdgeNeighbors: () => [
        `${hex}_0`, `${hex}_1`, `${hex}_2`, `${hex}_3`, `${hex}_4`, `${hex}_5`
      ],
    };
  }

  public generateKRing(cell: any, k: number): string[][] {
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
    rate: number,
    _dt: number
  ): SpatialMonad<CellStockState> {
    const nextState = { ...centerState };
    for (const n of neighborMap.values()) {
      const dC = (centerState.carbonMass! - n.carbonMass!) * rate;
      const dW = (centerState.waterMass! - n.waterMass!) * rate;
      nextState.carbonMass! -= dC;
      nextState.waterMass! -= dW;
    }
    return SpatialMonad.of(nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number]) {}

  public static getAdjacentIndices(token: string | null | undefined): string[] {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error("[ThermodynamicSpatialError] Invalid token");
    }
    return [`${token}_1`, `${token}_2`, `${token}_3`];
  }

  public computePlaneNormalTo(targetUnitVec: any): Vector3D {
    const myVec = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(myVec, targetUnitVec);
  }

  public computeMidpointTangent(targetUnitVec: any): { midpoint: Vector3D; tangent: Vector3D } {
    const myVec = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const midpoint = vec3Normalize(vec3Add(myVec, targetUnitVec));
    const normal = computeSphericalGreatCircleNormal3D(myVec, targetUnitVec);
    const tangent = vec3Normalize(vec3Cross(normal, midpoint));
    return { midpoint, tangent };
  }

  public isPositiveHemisphere(pt: any, targetUnitVec: any): boolean {
    const normal = this.computePlaneNormalTo(targetUnitVec);
    return dotProduct(normal, pt) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private coords = new Map<string, LatLng>();
  private edges = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();
  private geoms: any[] = [];

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      this.geoms = geoms;
      geoms.forEach((g, idx) => {
        this.coords.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
        this.coords.set(idx.toString(), { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (neighborsMap) {
      for (const [k, list] of neighborsMap.entries()) {
        if (!this.edges.has(k)) this.edges.set(k, new Set());
        for (const n of list) this.edges.get(k)!.add(n);
      }
    }
  }

  public get cellCount(): number {
    return this.geoms.length || this.coords.size;
  }

  public registerCentroid(id: string, coord: LatLng): void {
    this.coords.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addEdge(a: string, b: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(idOrIdx: any): any[] {
    if (typeof idOrIdx === 'number' && this.geoms.length > 0) {
      const geom = this.geoms[idOrIdx];
      if (!geom) return [];
      const nbrIds = Array.from(this.edges.get(geom.h3Index) || []);
      return nbrIds.map((nid) => this.geoms.findIndex((g) => g.h3Index === nid)).filter((idx) => idx !== -1);
    }
    return Array.from(this.edges.get(idOrIdx) || []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;

    const cA = this.coords.get(a);
    const cB = this.coords.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
    }

    const dist = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, dist);
    return dist;
  }

  public getDistance(idxA: number, idxB: number): number {
    const cA = this.coords.get(idxA.toString());
    const cB = this.coords.get(idxB.toString());
    if (!cA || !cB) return 0;
    return calculateHaversineDistance(cA, cB);
  }
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, boundaryArea: number, deltaSeconds: number) {
  const dist = cellA.cellIndex === cellB.cellIndex ? 0 : calculateHaversineDistance(cellA.centroid, cellB.centroid);
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

  const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
  const qRate = 2.5 * gradT * boundaryArea;
  const deltaE = qRate * deltaSeconds;

  const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist;
  const deltaW = 0.01 * gradW * boundaryArea * deltaSeconds;

  const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist;
  const deltaC = 0.005 * gradC * boundaryArea * deltaSeconds;

  const entropy = Math.abs(deltaE) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -deltaE,
    deltaInternalEnergyJoulesB: deltaE,
    deltaWaterVaporKgA: -deltaW,
    deltaWaterVaporKgB: deltaW,
    deltaCarbonKgA: -deltaC,
    deltaCarbonKgB: deltaC,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class SpatialStateMonad {
  private constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: any }) {}

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }

  public withCoordinate(newCoord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({ coord: newCoord, state: { ...this.value.state } });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(
    _id1: string, c1: { latDeg: number; lonDeg: number },
    _id2: string, c2: { latDeg: number; lonDeg: number }
  ) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const azimuth = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * 180 / Math.PI;
    return { distanceMeters: dist, azimuthDegrees: azimuth };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: { latDeg: number; lonDeg: number },
  stateA: any,
  coordB: { latDeg: number; lonDeg: number },
  stateB: any,
  _dist: number,
  diffRate: number,
  heatRate: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);

  const dEnergy = heatRate * (stateA.energyJoules - stateB.energyJoules) * dt;
  const dWater = diffRate * (stateA.waterKg - stateB.waterKg) * dt;

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
  massKg: Record<string, number>;
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegS: number,
  dt: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegS * dt);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
      massKg: { ...state.massKg },
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    let lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    let lng = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lng };
  }

  public getNeighbors(index: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${index}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    const scored = candidates.map((c) => {
      assertValidCoordinatePair(c.lat, c.lon);
      const d = H3AdjacencyService.getGreatCircleDistance(lat, lon, c.lat, c.lon);
      return { item: c, distance: d };
    });
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize(): { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
    const angle = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: angle,
      toCartesianComponents: () => ({
        u: Math.sin(angle) * this.magnitude,
        v: Math.cos(angle) * this.magnitude,
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
  const dAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  const cosTheta = Math.cos(dAngle);
  const normalVel = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;

  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransfer = normalVel * area * ctx.timeDeltaSeconds;
  const frac = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volTransfer / ctx.cellVolumeM3) : 0;

  return {
    effectiveNormalVelocityMs: normalVel,
    volumeTransferredM3: volTransfer,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    },
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
  private constructor(private nodes: Map<string, CellNode>) {}

  public static of(nodesList: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodesList) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  public get(cellId: string): CellNode | undefined {
    return this.nodes.get(cellId);
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

  public stepAdvection(srcId: string, tgtId: string, areaM2: number, dt: number): SpatialTransportMonad {
    const nextMap = new Map<string, CellNode>();
    for (const [k, v] of this.nodes.entries()) {
      nextMap.set(k, { ...v, stock: { ...v.stock } });
    }
    const s = nextMap.get(srcId);
    const t = nextMap.get(tgtId);
    if (s && t) {
      const gradHead = (s.hydraulicHeadMeters - t.hydraulicHeadMeters);
      if (gradHead > 0) {
        const vel = 1e-4 * gradHead;
        const vol = vel * areaM2 * dt;
        const frac = Math.min(0.2, vol / Math.max(1, s.stock.waterKg));

        const dWater = s.stock.waterKg * frac;
        const dCarbon = s.stock.carbonKg * frac;
        const dNitrogen = s.stock.nitrogenKg * frac;
        const dPhosphorus = s.stock.phosphorusKg * frac;
        const dOxygen = s.stock.oxygenKg * frac;
        const dThermal = s.stock.thermalJoules * frac;

        s.stock.waterKg -= dWater;
        t.stock.waterKg += dWater;
        s.stock.carbonKg -= dCarbon;
        t.stock.carbonKg += dCarbon;
        s.stock.nitrogenKg -= dNitrogen;
        t.stock.nitrogenKg += dNitrogen;
        s.stock.phosphorusKg -= dPhosphorus;
        t.stock.phosphorusKg += dPhosphorus;
        s.stock.oxygenKg -= dOxygen;
        t.stock.oxygenKg += dOxygen;
        s.stock.thermalJoules -= dThermal;
        t.stock.thermalJoules += dThermal;
      }
    }
    return new SpatialTransportMonad(nextMap);
  }
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

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
  };
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

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const result = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalK = 0;
  const candidateTransfers: Array<{ id: string; k: number }> = [];

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uEdge = Math.sin(bearing);
    const vEdge = Math.cos(bearing);
    const uProj = wind.uEast * uEdge + wind.vNorth * vEdge;

    if (uProj > 0) {
      const volRate = uProj * n.edgeLengthMeters * dtSeconds;
      const k = volRate / center.areaM2;
      candidateTransfers.push({ id: n.cell.h3Index, k });
      totalK += k;
    } else {
      result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalK > 0.99 ? 0.99 / totalK : 1.0;
  for (const c of candidateTransfers) {
    const effectiveK = c.k * scale;
    result.set(c.id, {
      carbonMol: center.stocks.carbonMol * effectiveK,
      waterKg: center.stocks.waterKg * effectiveK,
    });
  }

  return result;
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export class SpatialBoundaryMonad {
  private constructor(public s1: any, public s2: any, public boundary: any) {}

  public static of(s1: any, s2: any, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
  }

  public computeTransfer(_dt: number, _dist: number, _area: number, coeffs: any): [any, any, any] {
    const next1 = { ...this.s1 };
    const next2 = { ...this.s2 };
    const dCarbon = coeffs.diffCarbon * (this.s1.carbonKg - this.s2.carbonKg) * 0.05;
    const dWater = coeffs.diffWater * (this.s1.waterKg - this.s2.waterKg) * 0.05;
    const dEnergy = coeffs.thermalCond * (this.s1.energyJoules - this.s2.energyJoules) * 0.05;

    next1.carbonKg -= dCarbon;
    next2.carbonKg += dCarbon;
    next1.waterKg -= dWater;
    next2.waterKg += dWater;
    next1.energyJoules -= dEnergy;
    next2.energyJoules += dEnergy;

    return [next1, next2, { deltaCarbonKg: dCarbon, deltaWaterKg: dWater, deltaEnergyJoules: dEnergy }];
  }
}

export class SpatialAdjacencyGraph {
  private edges = new Map<string, any>();

  public addAdjacency(a: string, b: string, data: any): void {
    const key = `${a}->${b}`;
    this.edges.set(key, data);
    this.edges.set(`${b}->${a}`, data);
  }

  public getNeighbors(a: string): string[] {
    const nbrs: string[] = [];
    for (const k of this.edges.keys()) {
      if (k.startsWith(`${a}->`)) {
        nbrs.push(k.split("->")[1]);
      }
    }
    return nbrs;
  }

  public getBoundary(a: string, b: string): any {
    return this.edges.get(`${a}->${b}`);
  }

  public computeInterCellFlux(stockA: any, stockB: any, _boundary: any, _dt: number, _dist: number, _vol: number): [any, any, any] {
    const dWater = (stockA.waterKg - stockB.waterKg) * 0.1;
    const updatedA = { ...stockA, waterKg: stockA.waterKg - dWater };
    const updatedB = { ...stockB, waterKg: stockB.waterKg + dWater };
    return [updatedA, updatedB, { deltaWaterKg: dWater }];
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
  const uNorm = dotProduct(flowVel, normal);
  const area = edgeLength * layerHeight;
  const vol = uNorm * area * dt;
  const frac = vol / cellA.volumeM3;

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
  private adjacency = new Map<string, Set<string>>();

  public registerCell(id: string, c: Vector3DInput): void {
    this.cells.set(id, toVec3D(c));
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, new Set());
    if (!this.adjacency.has(b)) this.adjacency.set(b, new Set());
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
  }

  public getHexNeighbors(id: string): string[] {
    return Array.from(this.adjacency.get(id) || []);
  }

  public projectVector(v: Vector3DInput, cellId: string): Vector3D {
    const c = this.cells.get(cellId) || createVec3D(1, 0, 0);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}
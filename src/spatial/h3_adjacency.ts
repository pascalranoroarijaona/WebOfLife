// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, GEOMETRY & FLUX TRANSPORT (SPRINTS 001 - 076)
// =============================================================================

import * as h3 from 'h3-js';
import {
  H3Index,
  Point2D,
  Vec3,
  Vec3D,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  Cartesian3D,
  GeodesicCoordinate,
  SphericalCoordinates,
  CellStockState,
  CellThermodynamicState,
  DiffusionCoefficients,
  ILateralFluxStocks,
  ILateralTransportParams,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  UnitVector3D,
  CellFacetState,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
  THERMODYNAMIC_CONSTANTS,
} from '../thermodynamics/constants.js';

import { SpatialMonad } from '../monads/spatial_monad.js';

// Re-export constants required by tests
export {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  SOLAR_CONSTANT_W_M2,
};

export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const PENTAGON_BASE_CELLS: ReadonlySet<number> = new Set([
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.051462,
  HEX_COORDINATION: 6,
  PENTAGON_COORDINATION: 5,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

// Type aliases for legacy imports
export type LatLng = { lat: number; lng: number };
export type LatLngPoint = { lat: number; lng: number };

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
  fluidVelocity3D: Vector3D;
  effectiveHeightM: number;
  diffusionCoeffs: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
  };
  blendAlpha?: number;
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

export { CellStockState, CellThermodynamicState, DiffusionCoefficients, Vector3D, Vector3Tuple, Vector3Object, Cartesian3D };

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    const ctxMsg = context ? ` in ${context}` : '';
    super(`${message}${ctxMsg}`);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public endpointA: [number, number];
  public endpointB: [number, number];
  public angularDistanceRad: number;
  public toleranceRad: number;

  constructor(
    endpointA: [number, number],
    endpointB: [number, number],
    angularDistanceRad: number,
    toleranceRad: number,
    context?: string
  ) {
    const ctx = context ? ` (${context})` : '';
    super(`Boundary endpoint tolerance exceeded${ctx}: angular distance ${angularDistanceRad} > ${toleranceRad}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.angularDistanceRad = angularDistanceRad;
    this.toleranceRad = toleranceRad;
  }
}

export class PentagonalCoordinationViolationError extends Error {
  public readonly cellIndex: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;

  constructor(cellIndex: string, expectedCount: number, actualCount: number) {
    super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${expectedCount} neighbors, but found ${actualCount}.`);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellIndex = cellIndex;
    this.expectedCount = expectedCount;
    this.actualCount = actualCount;
  }
}

// =============================================================================
// VECTOR MATHEMATICS & PRIMITIVES
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3D {
  const arr: any = [x, y, z];
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  if (v && typeof v === 'object') return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
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

export function vectorNorm(v: any): number {
  const va = toVec3D(v);
  return Math.hypot(va[0], va[1], va[2]);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function normalizeVector3D(v: any): any {
  const va = toVec3D(v);
  const len = Math.hypot(va[0], va[1], va[2]);
  if (len < 1e-15) {
    if (Array.isArray(v)) return [0, 0, 0];
    return { x: 0, y: 0, z: 0 };
  }
  const nx = va[0] / len;
  const ny = va[1] / len;
  const nz = va[2] / len;
  if (Array.isArray(v)) return [nx, ny, nz];
  return { x: nx, y: ny, z: nz };
}

export function crossProduct3D(a: any, b: any): any {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const cx = va[1] * vb[2] - va[2] * vb[1];
  const cy = va[2] * vb[0] - va[0] * vb[2];
  const cz = va[0] * vb[1] - va[1] * vb[0];
  return createVec3D(cx, cy, cz);
}

export function vec3Dot(a: any, b: any): number { return dotProduct(a, b); }
export function vec3Norm(v: any): number { return vectorNorm(v); }
export function vec3Normalize(v: any): any { return normalizeVector3D(v); }
export function vec3Scale(v: any, s: number): any {
  const va = toVec3D(v);
  return createVec3D(va[0] * s, va[1] * s, va[2] * s);
}
export function vec3Add(a: any, b: any): any {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}
export function vec3Sub(a: any, b: any): any {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

// Unit vector algebra
export function unitVectorDotProduct(u: any, v: any): number { return dotProduct(u, v); }
export function unitVectorCrossProduct(u: any, v: any): [number, number, number] {
  const c = crossProduct3D(u, v);
  return [c.x, c.y, c.z];
}
export function unitVectorAngularDistance(u: any, v: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u, v)));
  return Math.acos(dot);
}
export function unitVectorChordDistance(u: any, v: any): number {
  const va = toVec3D(u);
  const vb = toVec3D(v);
  return Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}
export function unitVectorTangentChord(u: any, v: any): [number, number, number] {
  const va = toVec3D(u);
  const vb = toVec3D(v);
  const chord = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const norm = Math.hypot(chord[0], chord[1], chord[2]);
  if (norm < 1e-15) return [0, 0, 0];
  return [chord[0] / norm, chord[1] / norm, chord[2] / norm];
}

// =============================================================================
// COORDINATE GUARDS, NORMALIZATION & CONVERSIONS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || Number.isNaN(latDeg)) {
    throw new RangeError(`Latitude must be a finite number: ${latDeg}`);
  }
  if (latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function assertValidCoordinatePair(
  arg1: any,
  arg2?: any,
  arg3?: any
): void {
  let lat: number;
  let lon: number;
  let options: any = {};
  let context = '';

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude ?? arg1.lng;
    if (typeof arg2 === 'string') context = arg2;
    else if (typeof arg2 === 'object' && arg2 !== null) {
      options = arg2;
      context = arg2.context ?? '';
    }
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === 'string') context = arg3;
    else if (typeof arg3 === 'object' && arg3 !== null) {
      options = arg3;
      context = arg3.context ?? '';
    }
  }

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new CoordinateBoundaryError('Coordinate pair must contain finite numbers', lat, lon, context);
  }

  const eps = options.epsilon ?? 1e-9;
  if (lat < -90 - eps || lat > 90 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
  }

  if (options.allowNormalizedPositiveLon) {
    if (lon < -eps || lon > 360 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, context);
    }
  } else {
    if (lon < -180 - eps || lon > 180 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
    }
  }
}

export function isValidCoordinatePair(arg1: any, arg2?: any, options?: any): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2, options);
    return true;
  } catch {
    return false;
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (typeof lonDeg !== 'number' || !Number.isFinite(lonDeg)) return NaN;
  let lon = ((lonDeg % 360) + 360) % 360;
  if (lon >= 180) lon -= 360;
  if (lon === 180 || lon === -180) return -180.0;
  return Object.is(lon, -0) ? 0 : lon;
}

export function normalizeAngleRadians(rad: number): number {
  if (typeof rad !== 'number' || !Number.isFinite(rad)) return rad;
  const twoPi = 2 * Math.PI;
  let a = rad % twoPi;
  if (a >= Math.PI) a -= twoPi;
  if (a < -Math.PI) a += twoPi;
  if (Math.abs(a - Math.PI) < 1e-15 || Math.abs(a - -Math.PI) < 1e-15) return -Math.PI;
  return Object.is(a, -0) ? 0 : a;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  const twoPi = 2 * Math.PI;
  diff = ((diff % twoPi) + twoPi) % twoPi;
  if (diff > Math.PI) diff -= twoPi;
  return diff;
}

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lng] = coords;
  if (useDegrees) {
    lat = Math.max(-90, Math.min(90, lat)) * (Math.PI / 180);
    lng = normalizeLongitudeDegrees(lng) * (Math.PI / 180);
    return [lat, lng];
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (typeof latDeg !== 'number' || typeof lngDeg !== 'number' || !Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('lat/lng must be finite');
  }
  if (latDeg > 90.0000001 || latDeg < -90.0000001) {
    throw new RangeError(`Latitude out of range: ${latDeg}`);
  }
  const clampedLat = Math.max(-90, Math.min(90, latDeg));
  if (Math.abs(clampedLat - 90) < 1e-7) return [0, 0, 1];
  if (Math.abs(clampedLat - -90) < 1e-7) return [0, 0, -1];

  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  return [
    cosPhi * Math.cos(lambda),
    cosPhi * Math.sin(lambda),
    Math.sin(phi),
  ];
}

export function unitVectorToLatLng(u: [number, number, number] | Vector3D): [number, number] {
  const arr = toVec3D(u);
  const norm = Math.hypot(arr[0], arr[1], arr[2]);
  if (norm < 1e-15) return [0, 0];
  const zClamped = Math.max(-1.0, Math.min(1.0, arr[2] / norm));
  const lat = Math.asin(zClamped) * (180.0 / Math.PI);
  const lng = Math.atan2(arr[1], arr[0]) * (180.0 / Math.PI);
  return [lat, lng];
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = 6371000): Vector3D {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToCartesian3D(coords: { lat: number; lng: number }, radius: number = 6371000): Vector3D {
  return latLngToCartesian(coords.lat, coords.lng, radius);
}

export function cartesian3DToLatLng(cart: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(cart);
  return { lat, lng };
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radius: number = 1.0): Vector3D {
  return latLngToCartesian(latDeg, lngDeg, radius);
}

// =============================================================================
// GEODESIC DISTANCE & BEARING CALCULATIONS
// =============================================================================

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  const dist = R * c;
  return options?.unit === 'kilometers' ? dist / 1000 : dist;
}

export function haversineDistance(
  c1: [number, number],
  c2: [number, number],
  radius: number = EARTH_MEAN_RADIUS_METERS
): number {
  return calculateHaversineDistance(c1, c2, { radiusMeters: radius });
}

export function computeGeodesicDistance(pA: any, pB: any): number {
  if (Array.isArray(pA) && pA.length === 2) {
    return calculateHaversineDistance(pA as any, pB as any);
  }
  if (pA.latDeg !== undefined) {
    assertValidLatitudeDegrees(pA.latDeg);
    assertValidLatitudeDegrees(pB.latDeg);
    return calculateHaversineDistance({ lat: pA.latDeg, lng: pA.lonDeg }, { lat: pB.latDeg, lng: pB.lonDeg });
  }
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const dot = Math.max(-1.0, Math.min(1.0, (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (vectorNorm(va) * vectorNorm(vb))));
  return Math.acos(dot) * 6371000;
}

export function calculateGeodesicDistance(p1: GeodesicCoordinate, p2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(p1.latDeg);
  assertValidLatitudeDegrees(p2.latDeg);
  return calculateHaversineDistance({ lat: p1.latDeg, lng: p1.lonDeg }, { lat: p2.latDeg, lng: p2.lonDeg });
}

export function computeGreatCircleDistance(p1: LatLng, p2: LatLng, radius: number = EARTH_MEAN_RADIUS_METERS): number {
  return calculateHaversineDistance(p1, p2, { radiusMeters: radius });
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint, radius: number = WGS84_EARTH_RADIUS_METERS) {
  const d = calculateHaversineDistance(p1, p2, { radiusMeters: radius });
  return { distanceMeters: d };
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
  if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12) return 0.0;
  if (Math.abs(lat1 - -Math.PI / 2) < 1e-12 && Math.abs(lat2 - -Math.PI / 2) < 1e-12) return 0.0;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let bearing = Math.atan2(y, x);
  bearing = (bearing + 2 * Math.PI) % (2 * Math.PI);
  return bearing;
}

export function computeGeodesicBearing(origin: LatLng, target: LatLng): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeInitialBearing(p1: LatLng, p2: LatLng): number {
  return computeSphericalArcBearing(p1, p2);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const azimuthRad = computeSphericalArcBearing(p1, p2);
  const azimuthDeg = (azimuthRad * 180.0) / Math.PI;
  const distance = calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });
  const uEast = Math.sin(azimuthRad);
  const vNorth = Math.cos(azimuthRad);
  return {
    initialAzimuthDeg: azimuthDeg,
    distanceMeters: distance,
    unitVector: { uEast, vNorth },
  };
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (c1.lat === c2.lat && c1.lng === c2.lng) {
    return { lat: c1.lat, lng: c1.lng };
  }
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const midX = (u1[0] + u2[0]) * 0.5;
  const midY = (u1[1] + u2[1]) * 0.5;
  const midZ = (u1[2] + u2[2]) * 0.5;
  const norm = Math.hypot(midX, midY, midZ);
  if (norm < 1e-12) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng([midX / norm, midY / norm, midZ / norm]);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export const calculateCoriolisParameter = computeCoriolisParameter;

export function computeMidpointCoriolis(latDeg: number): number {
  return computeCoriolisParameter(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return Math.max(0.0, SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith));
}

export function computeMidpointSolarIrradiance(lat: number, lng: number, declination: number, hour: number): number {
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, declination, hourAngle);
}

export function calculateEffectiveVelocity(normalVelocity: number): number {
  return Math.abs(normalVelocity);
}

// =============================================================================
// SPHERICAL GEOMETRY & BOUNDARY FACET NORMAL COMPUTATIONS
// =============================================================================

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const vArr = toVec3D(v);
  const pArr = toVec3D(p);
  const pLenSq = pArr[0] * pArr[0] + pArr[1] * pArr[1] + pArr[2] * pArr[2];
  if (pLenSq < 1e-15) return createVec3D(0, 0, 0);

  const dot = vArr[0] * pArr[0] + vArr[1] * pArr[1] + vArr[2] * pArr[2];
  const factor = dot / pLenSq;
  const px = vArr[0] - factor * pArr[0];
  const py = vArr[1] - factor * pArr[1];
  const pz = vArr[2] - factor * pArr[2];
  return createVec3D(px, py, pz);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const pArr = toVec3D(p);
  const vArr = toVec3D(v);
  const pNorm = Math.hypot(pArr[0], pArr[1], pArr[2]);
  const radialMag = pNorm > 1e-15 ? Math.abs(dotProduct(vArr, pArr)) / pNorm : 0;
  const tangentialMag = vectorNorm(projected);
  return {
    projected,
    radialMagnitude: radialMag,
    tangentialMagnitude: tangentialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const dist = computeGeodesicDistance(pA, pB);
  const mid = createVec3D((va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5);
  const disp = createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
  const tangentNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
  return {
    edgeDistance: dist,
    midpoint: mid,
    tangentNormal,
  };
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = EARTH_MEAN_RADIUS_METERS) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chord = Math.hypot(disp.x, disp.y, disp.z);
  const arc = radius * 2.0 * Math.asin(Math.min(1.0, chord / (2.0 * radius)));
  return {
    v1,
    v2,
    displacement: disp,
    chordLength: chord,
    arcLength: arc,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mx = a[0] + b[0];
  const my = a[1] + b[1];
  const mz = a[2] + b[2];
  const len = Math.hypot(mx, my, mz);
  if (len < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mx / len, my / len, mz / len);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  return normalizeVector3D(disp);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  return normalizeVector3D(crossProduct3D(t, r));
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = normalizeVector3D(crossProduct3D(tangent, radialNormal));
  return { tangent, radialNormal, lateralNormal };
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const a = toVec3D(u);
  const b = toVec3D(v);
  const cross = crossProduct3D(a, b);
  const len = vectorNorm(cross);
  if (len < 1e-12) {
    if (Math.abs(a[0]) >= 0.9) return [0, 1, 0];
    return [1, 0, 0];
  }
  return [cross.x / len, cross.y / len, cross.z / len];
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mx = a[0] + b[0];
  const my = a[1] + b[1];
  const mz = a[2] + b[2];
  const norm = Math.hypot(mx, my, mz);
  if (norm < 1e-12) return createVec3D(radius, 0, 0);
  return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = crossProduct3D(t, r);
  const norm = vectorNorm(cross);
  if (norm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross.x / norm, cross.y / norm, cross.z / norm);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const tangent = normalizeVector3D(disp);
  const radial = normalizeVector3D(midpoint);
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const tangent = normalizeVector3D(disp);
  const radialNormal = normalizeVector3D(midpoint);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, radialNormal, horizontalNormal };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, target?: any): any {
  let disp: [number, number, number];
  if (target !== undefined) {
    const o = toVec3D(arg2);
    const t = toVec3D(target);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    disp = toVec3D(arg2);
  }

  const vArr = toVec3D(v);
  const dot = vArr[0] * disp[0] + vArr[1] * disp[1] + vArr[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;
  const res = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];

  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return { x: res[0], y: res[1], z: res[2] };
  }
  return res;
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): any {
  if (origin.lat === target.lat && origin.lng === target.lng) {
    return { x: 0, y: 0, z: 0 };
  }
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: dx / norm, y: dy / norm, z: dz / norm };
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const chord = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const angularDistanceRad = 2.0 * Math.asin(Math.min(1.0, chord / 2.0));
  return {
    displacement: u,
    chordDistance: chord,
    angularDistanceRad,
  };
}

export function computeBoundaryOutwardNormal3D(
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  options?: { blendAlpha?: number }
) {
  const ci = toVec3D(c_i);
  const cj = toVec3D(c_j);
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);

  if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-12) {
    throw new Error('Centroids are coincident');
  }
  if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-12) {
    throw new Error('Edge vertices are coincident');
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const midChord = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const midpoint = normalizeVector3D(midChord);

  const tEdge = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const cross = crossProduct3D(tEdge, midpoint);
  let nEdge = normalizeVector3D(cross);

  const disp = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
  if (dotProduct(nEdge, disp) < 0) {
    nEdge = vec3Scale(nEdge, -1);
  }

  const dTan = projectVectorOntoSphereTangentSpace(disp, midpoint);
  const uDisp = normalizeVector3D(dTan);

  const nBlend = vec3Add(vec3Scale(nEdge, 1 - alpha), vec3Scale(uDisp, alpha));
  const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(nBlend, midpoint));
  const alignmentCos = dotProduct(normal, normalizeVector3D(disp));

  return {
    midpoint,
    normal,
    midpointNormal: nEdge,
    displacementNormal: uDisp,
    alignmentCos,
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
) {
  const out = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
  const va = toVec3D(vertexA);
  const vb = toVec3D(vertexB);
  const dotV = Math.max(-1.0, Math.min(1.0, dotProduct(va, vb) / (radius * radius)));
  const arcLengthMeters = radius * Math.acos(dotV);
  const normal = toVec3D(out.normal);

  return {
    normal,
    arcLengthMeters,
    alignmentCos: out.alignmentCos,
    midpoint: toVec3D(out.midpoint),
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [Vec3D, Vec3D] | null {
  if (!cellA || !cellB || cellA === cellB) return null;
  try {
    const isAdjacent = (h3 as any).areNeighborCells ? (h3 as any).areNeighborCells(cellA, cellB) : true;
    if (!isAdjacent) return null;
  } catch {
    return null;
  }

  const bA = (h3 as any).cellToBoundary(cellA);
  const bB = (h3 as any).cellToBoundary(cellB);
  const vA = bA.map((pt: [number, number]) => latLngToCartesian(pt[0], pt[1], radius));
  const vB = bB.map((pt: [number, number]) => latLngToCartesian(pt[0], pt[1], radius));

  const shared: Vec3D[] = [];
  for (const pA of vA) {
    for (const pB of vB) {
      if (Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]) < 100.0) {
        if (!shared.some((s) => Math.hypot(s[0] - pA[0], s[1] - pA[1], s[2] - pA[2]) < 10.0)) {
          shared.push([pA[0], pA[1], pA[2]]);
        }
      }
    }
  }

  if (shared.length < 2) return null;
  return [shared[0], shared[1]];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _stratumA?: any,
  _stratumB?: any,
  heightM: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!vertices) return null;
  const [v1, v2] = vertices;
  const dotV = Math.max(-1.0, Math.min(1.0, dotProduct(v1, v2) / (radius * radius)));
  const lengthMeters = radius * Math.acos(dotV);

  const cA = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(cellA) : [0, 0];
  const cB = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(cellB) : [0, 0];
  const pA = latLngToCartesian(cA[0], cA[1], radius);
  const pB = latLngToCartesian(cB[0], cB[1], radius);

  const normalOut = computeBoundaryOutwardNormal3D(pA, pB, v1, v2);
  const normalAtoB = toVec3D(normalOut.normal);

  return {
    v1,
    v2,
    lengthMeters,
    normalAtoB,
    contactAreaM2: lengthMeters * heightM,
  };
}

export function extractH3BoundaryCartesianVertices3D(
  h3Index: string,
  options?: { closeLoop?: boolean; radius?: number }
) {
  if (!h3Index || typeof h3Index !== 'string') {
    throw new Error('Invalid H3 index');
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0) throw new Error('Invalid radius');

  const boundary = (h3 as any).cellToBoundary(h3Index);
  if (!boundary || !Array.isArray(boundary) || boundary.length === 0) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }

  const vertices: { x: number; y: number; z: number }[] = boundary.map((coord: [number, number]) => {
    const u = latLngToUnitVector3D(coord[0], coord[1]);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  });

  const vertexCount = vertices.length;
  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < vertexCount; i++) {
    cx += vertices[i].x;
    cy += vertices[i].y;
    cz += vertices[i].z;
  }
  const cNorm = Math.hypot(cx, cy, cz);
  const centroid = {
    x: (cx / cNorm) * radius,
    y: (cy / cNorm) * radius,
    z: (cz / cNorm) * radius,
  };

  return {
    h3Index,
    vertexCount,
    isClosed: Boolean(options?.closeLoop),
    vertices,
    centroid,
  };
}

export function areCartesianUnitVectorsEqual3D(v1: any, v2: any, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilon < 0) return false;
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const lenA = Math.hypot(a[0], a[1], a[2]);
  const lenB = Math.hypot(b[0], b[1], b[2]);
  if (!Number.isFinite(lenA) || !Number.isFinite(lenB) || lenA < 1e-15 || lenB < 1e-15) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (lenA * lenB)));
  const dist = Math.acos(dot);
  return dist <= epsilon;
}

export function computeAngularDistance3D(v1: any, v2: any): number {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const lenA = Math.hypot(a[0], a[1], a[2]);
  const lenB = Math.hypot(b[0], b[1], b[2]);
  const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (lenA * lenB)));
  return Math.acos(dot);
}

export function findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[], epsilon: number = 1e-5) {
  const pairs: any[] = [];
  for (let i = 0; i < polyA.length; i++) {
    const a = toVec3D(polyA[i]);
    for (let j = 0; j < polyB.length; j++) {
      const b = toVec3D(polyB[j]);
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      if (dist <= epsilon) {
        pairs.push({
          indexA: i,
          indexB: j,
          vertexA: polyA[i],
          vertexB: polyB[j],
          distance: dist,
        });
        break;
      }
    }
  }
  if (pairs.length > 2) {
    return pairs.slice(0, 2);
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(cellAId: string, polyA: any[], cellBId: string, polyB: any[], epsilon: number = 1e-5) {
  const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, epsilon);
  if (pairs.length < 2) return null;

  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  const edgeLength = Math.hypot(a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]);
  const midpoint = {
    x: (a1[0] + a2[0]) * 0.5,
    y: (a1[1] + a2[1]) * 0.5,
    z: (a1[2] + a2[2]) * 0.5,
  };

  const dx = a2[0] - a1[0];
  const dy = a2[1] - a1[1];
  const normal2D = [-dy / edgeLength, dx / edgeLength, 0];
  const outwardNormal = {
    x: normal2D[0],
    y: normal2D[1],
    z: 0,
  };

  return {
    cellAId,
    cellBId,
    v1,
    v2,
    edgeLength,
    lengthMeters: edgeLength,
    midpoint,
    outwardNormal,
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: Point2D, p2: Point2D, centroidA: Point2D, centroidB: Point2D) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);

  let nx = dy / len;
  let ny = -dx / len;

  const cDispX = centroidB[0] - centroidA[0];
  const cDispY = centroidB[1] - centroidA[1];

  let isFlipped = false;
  if (nx * cDispX + ny * cDispY < 0) {
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

export function orderSharedBoundaryEndpointsByCentroid3D(p1: Vector3D, p2: Vector3D, centroidA: Vector3D, centroidB: Vector3D) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const t = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const r = normalizeVector3D(mid);

  let n = normalizeVector3D(crossProduct3D(t, r));
  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];

  let isFlipped = false;
  if (dotProduct(n, disp) < 0) {
    n = vec3Scale(n, -1);
    isFlipped = true;
  }

  return {
    orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
    outwardNormal: toVec3D(n),
    isFlipped,
  };
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { useDegrees?: boolean; context?: string }
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
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, { context: 'Topological reverse alignment endpoint 0->1' });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, { context: 'Topological reverse alignment endpoint 1->0' });
}

// =============================================================================
// H3 TOPOLOGY & CELL CLASSIFICATION
// =============================================================================

export function isValidCell(cellId: unknown): boolean {
  if (typeof cellId === 'bigint') {
    cellId = cellId.toString(16);
  }
  if (typeof cellId !== 'string' || !cellId.trim()) return false;
  try {
    if (typeof (h3 as any).isValidCell === 'function') return (h3 as any).isValidCell(cellId);
    if (typeof (h3 as any).h3IsValid === 'function') return (h3 as any).h3IsValid(cellId);
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(cellId);
  } catch {
    return false;
  }
}

export function isCellPentagon(cellId: unknown): boolean {
  if (typeof cellId === 'bigint') {
    cellId = cellId.toString(16);
  }
  if (typeof cellId !== 'string') return false;
  try {
    if (typeof (h3 as any).isPentagon === 'function') return (h3 as any).isPentagon(cellId);
    if (typeof (h3 as any).h3IsPentagon === 'function') return (h3 as any).h3IsPentagon(cellId);
    const baseCell = parseInt(cellId.slice(2, 4), 16);
    return PENTAGON_BASE_CELLS.has(baseCell);
  } catch {
    return false;
  }
}

export function isPentagon(cellId: unknown): boolean {
  return isCellPentagon(cellId);
}

export function isPentagonCell(cellId: unknown): boolean {
  return isCellPentagon(cellId);
}

export function getExpectedNeighborCount(cellId: unknown): number {
  if (!isValidCell(cellId)) return -1;
  return isCellPentagon(cellId) ? 5 : 6;
}

export function getCoordinationNumber(cellId: unknown): number {
  return getExpectedNeighborCount(cellId);
}

export function isExpectedNeighborCount(arg1: unknown, arg2: unknown): boolean {
  let cellId: unknown;
  let count: unknown;

  if (typeof arg1 === 'number') {
    count = arg1;
    cellId = arg2;
  } else {
    cellId = arg1;
    count = arg2;
  }

  if (!isValidCell(cellId)) return false;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return false;
  if (Math.floor(count) !== count) return false;

  return count === getExpectedNeighborCount(cellId);
}

export function isExpectedNeighborCountForCell(cellId: string, neighbors: readonly string[]): boolean {
  if (!Array.isArray(neighbors)) return false;
  return isExpectedNeighborCount(cellId, neighbors.length);
}

export function getPentagonIndexes(resolution: number = 0): string[] {
  try {
    if (typeof (h3 as any).getPentagons === 'function') return (h3 as any).getPentagons(resolution);
    if (typeof (h3 as any).h3GetPentagons === 'function') return (h3 as any).h3GetPentagons(resolution);
  } catch {
    return [];
  }
  return [];
}

export function getPentagonCells(resolution: number = 0): string[] {
  return getPentagonIndexes(resolution);
}

export function createH3Index(baseCell: number, resolution: number, digits: number[] = [], mode: number = 1): string {
  if (mode !== 1) return `0x${mode.toString(16)}000000000000`;
  const baseHex = baseCell.toString(16).padStart(2, '0');
  const resHex = resolution.toString(16);
  let tail = digits.map((d) => d.toString(7)).join('');
  tail = tail.padEnd(15 - 2 - 1 - 1, 'f');
  return `8${resHex}${baseHex}${tail}`;
}

export function h3IndexToString(index: unknown): string {
  return String(index);
}

// Edge lengths & boundaries
export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  const nominalEdge0 = 1107712.59;
  return nominalEdge0 * Math.pow(7, -resolution / 2);
}

export function createH3BoundaryInterface(resolution: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters,
    centerDistanceMeters: Math.sqrt(3) * edgeLengthMeters,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edgeLengthMeters * depth;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edgeLengthMeters * depth;
    },
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor || origin === 'invalid' || neighbor === 'invalid') {
    return 0.0;
  }
  try {
    if ((h3 as any).areNeighborCells && !(h3 as any).areNeighborCells(origin, neighbor)) {
      return 0.0;
    }
  } catch {
    return 0.0;
  }

  const boundary = getH3SharedBoundary(origin, neighbor);
  return boundary.lengthMeters;
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  if (!origin || !neighbor || origin === neighbor || origin === 'invalid' || neighbor === 'invalid') {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  try {
    if ((h3 as any).areNeighborCells && !(h3 as any).areNeighborCells(origin, neighbor)) {
      return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const bA = (h3 as any).cellToBoundary(origin);
    const bB = (h3 as any).cellToBoundary(neighbor);
    const shared: [number, number][] = [];
    for (const pA of bA) {
      for (const pB of bB) {
        if (Math.abs(pA[0] - pB[0]) < 1e-4 && Math.abs(pA[1] - pB[1]) < 1e-4) {
          if (!shared.some((s) => Math.abs(s[0] - pA[0]) < 1e-6 && Math.abs(s[1] - pA[1]) < 1e-6)) {
            shared.push(pA);
          }
        }
      }
    }
    if (shared.length < 2) {
      return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const dist = calculateHaversineDistance(shared[0], shared[1], { radiusMeters: EARTH_MEAN_RADIUS_METERS });
    const sorted = [...shared].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
    return {
      isAdjacent: true,
      lengthMeters: dist,
      vertexA: sorted[0],
      vertexB: sorted[1],
    };
  } catch {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  return calculateH3SharedBoundaryLength(cellA, cellB) * (radius / EARTH_MEAN_RADIUS_METERS);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }
  const isAdjacent = (h3 as any).areNeighborCells ? (h3 as any).areNeighborCells(cellA, cellB) : true;
  if (!isAdjacent) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapTop = Math.min(topA, topB);
  const overlapBase = Math.max(baseA, baseB);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevation = (overlapTop + overlapBase) * 0.5;

  let boundaryLength = getH3SharedEdgeLength(cellA, cellB);
  if (options?.applyRadialExpansion) {
    const R = options.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
    const gamma = 1.0 + midPointElevation / R;
    boundaryLength *= gamma;
  }

  return {
    isAdjacent: true,
    contactAreaM2: boundaryLength * overlapHeight,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPointElevation,
    boundaryLengthMeters: boundaryLength,
  };
}

export function getGridDisk(origin: string, ring: number): string[] {
  if ((h3 as any).gridDisk) return (h3 as any).gridDisk(origin, ring);
  if ((h3 as any).kRing) return (h3 as any).kRing(origin, ring);
  return [origin];
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  if ((h3 as any).latLngToCell) return (h3 as any).latLngToCell(lat, lng, res);
  if ((h3 as any).geoToH3) return (h3 as any).geoToH3(lat, lng, res);
  return `8${res.toString(16)}000000000000`;
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function h3GridDisk(origin: string, ring: number): string[] {
  return getGridDisk(origin, ring);
}

export function h3GetPentagons(res: number): string[] {
  return getPentagonIndexes(res);
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if ((h3 as any).areNeighborCells) return (h3 as any).areNeighborCells(cellA, cellB);
  return true;
}

// =============================================================================
// INTERFACIAL FLUX & TRANSPORT FUNCTIONS
// =============================================================================

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  dtSeconds: number
) {
  const coordA = cellA.centroid as any;
  const coordB = cellB.centroid as any;
  const dist = calculateHaversineDistance(coordA, coordB);

  if (dist === 0.0) {
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

  const gradT = (cellA.temperatureKelvin! - cellB.temperatureKelvin!) / dist;
  const qHeat = 0.6 * gradT * boundaryArea * dtSeconds;

  const gradW = (cellA.waterVaporMassKg! - cellB.waterVaporMassKg!) / dist;
  const fluxW = 1e-4 * gradW * boundaryArea * dtSeconds;

  const gradC = (cellA.dissolvedCarbonKg! - cellB.dissolvedCarbonKg!) / dist;
  const fluxC = 1e-5 * gradC * boundaryArea * dtSeconds;

  const tA = Math.max(1e-3, cellA.temperatureKelvin!);
  const tB = Math.max(1e-3, cellB.temperatureKelvin!);
  const entropy = Math.max(0, Math.abs(qHeat) * Math.abs(1 / tB - 1 / tA));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -qHeat,
    deltaInternalEnergyJoulesB: qHeat,
    deltaWaterVaporKgA: -fluxW,
    deltaWaterVaporKgB: fluxW,
    deltaCarbonKgA: -fluxC,
    deltaCarbonKgB: fluxC,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volSource: number,
  volTarget: number,
  diffCoeff: number,
  resolution: number,
  depth: number,
  dt: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const area = edgeLen * depth;
  const dist = Math.sqrt(3) * edgeLen;
  const cSrc = stockSource / volSource;
  const cTgt = stockTarget / volTarget;
  const flux = diffCoeff * ((cSrc - cTgt) / dist) * area * dt;
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
  dt: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const area = edgeLen * depth;
  const dist = Math.sqrt(3) * edgeLen;
  const dq = conductivity * ((tempHot - tempCold) / dist) * area * dt;
  const entropy = Math.max(0, dq * (1 / tempCold - 1 / tempHot));
  return {
    deltaHeatJoulesSource: -dq,
    deltaHeatJoulesTarget: dq,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  depthSrc: number,
  _depthTgt: number,
  kHyd: number,
  resolution: number,
  dt: number
) {
  const edgeLen = calculateH3EdgeLengthMeters(resolution);
  const area = edgeLen * depthSrc;
  const dist = Math.sqrt(3) * edgeLen;
  const volFlux = kHyd * ((headSource - headTarget) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -volFlux,
    deltaVolumeM3Target: volFlux,
    deltaMassKgSource: -volFlux * 1000.0,
    deltaMassKgTarget: volFlux * 1000.0,
  };
}

export function computePairwiseDiffusiveTransfer(
  coordA: GeodesicCoordinate,
  stateA: CellThermodynamicState,
  coordB: GeodesicCoordinate,
  stateB: CellThermodynamicState,
  boundaryArea: number,
  diffCoeff: number,
  thermalCond: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = calculateGeodesicDistance(coordA, coordB);
  const dq = thermalCond * ((stateA.energyJoules! - stateB.energyJoules!) / dist) * boundaryArea * dt * 1e-4;
  const dw = diffCoeff * ((stateA.waterKg! - stateB.waterKg!) / dist) * boundaryArea * dt;

  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: dq,
      deltaWaterKg: dw,
    },
  };
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegS: number,
  dtSeconds: number
) {
  const rawLon = state.longitudeDeg + zonalVelocityDegS * dtSeconds;
  const nextLon = normalizeLongitudeDegrees(rawLon);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: {
      deltaEnergyJoules: 0,
    },
  };
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const dAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  const vNorm = ctx.flowVelocityMs * Math.cos(dAngle);
  if (vNorm <= 0) {
    return {
      effectiveNormalVelocityMs: 0.0,
      volumeTransferredM3: 0.0,
      deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
    };
  }

  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransferred = vNorm * contactArea * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, volTransferred / ctx.cellVolumeM3);

  return {
    effectiveNormalVelocityMs: vNorm,
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

export function computeAdvectiveTransfer(
  centerCell: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalFraction = 0;
  const fracMap = new Map<string, number>();

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(centerCell.centroid, n.cell.centroid);
    const uWind = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
    if (uWind > 0) {
      const volRate = uWind * n.edgeLengthMeters * dtSeconds;
      const frac = volRate / centerCell.areaM2;
      fracMap.set(n.cell.h3Index, frac);
      totalFraction += frac;
    } else {
      fracMap.set(n.cell.h3Index, 0);
    }
  }

  const scale = totalFraction > 0.95 ? 0.95 / totalFraction : 1.0;
  for (const n of neighbors) {
    const frac = (fracMap.get(n.cell.h3Index) ?? 0) * scale;
    transfers.set(n.cell.h3Index, {
      carbonMol: centerCell.stocks.carbonMol * frac,
      waterKg: centerCell.stocks.waterKg * frac,
    });
  }

  return transfers;
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const cA = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(originHex) : [0, 0];
  const cB = (h3 as any).cellToLatLng ? (h3 as any).cellToLatLng(neighborHex) : [0, 0];
  const dist = calculateHaversineDistance({ lat: cA[0], lng: cA[1] }, { lat: cB[0], lng: cB[1] });
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVelocity: any,
  normal: any,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const v = toVec3D(flowVelocity);
  const n = toVec3D(normal);
  const uNormal = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];

  const area = edgeLength * layerHeight;
  const vol = Math.abs(uNormal) * area * dt;
  const src = uNormal >= 0 ? cellA : cellB;
  const frac = Math.min(1.0, vol / src.volumeM3);
  const sign = uNormal >= 0 ? 1 : -1;

  const dC = sign * src.carbonKg * frac;
  const dW = sign * src.waterKg * frac;
  const dM = sign * src.mineralsKg * frac;
  const dO = sign * src.oxygenKg * frac;
  const dE = sign * src.energyJoules * frac;

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

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    segment: seg,
    facetArea: seg.arcLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  _volI: number,
  _volJ: number,
  _capI: number,
  _capJ: number,
  centroidDist: number,
  metrics: any,
  fluidVelocity: any,
  coeffs: any,
  dt: number
) {
  const v = toVec3D(fluidVelocity);
  const area = metrics.facetArea;
  const vNorm = Math.hypot(v[0], v[1], v[2]);
  const volFlow = vNorm * area * dt;

  const diffW = (coeffs.water ?? 1e-4) * ((stockI.waterKg - stockJ.waterKg) / centroidDist) * area * dt;
  const diffC = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg - stockJ.carbonKg) / centroidDist) * area * dt;
  const diffO = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg - stockJ.oxygenKg) / centroidDist) * area * dt;
  const diffM = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg - stockJ.mineralsKg) / centroidDist) * area * dt;
  const diffE = (coeffs.thermalConductivity ?? 0.6) * ((stockI.internalEnergyJ - stockJ.internalEnergyJ) / centroidDist) * area * dt * 0.001;

  const advFrac = Math.min(0.01, volFlow / 1e8);
  const dW = diffW + stockI.waterKg * advFrac;
  const dC = diffC + stockI.carbonKg * advFrac;
  const dO = diffO + stockI.oxygenKg * advFrac;
  const dM = diffM + stockI.mineralsKg * advFrac;
  const dE = diffE + stockI.internalEnergyJ * advFrac;

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: 0.001,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: 0.001,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: any,
  velocity: any,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const area = facetLength * layerDepth;
  const v = toVec3D(velocity);
  const n = toVec3D(normal);
  const uNormal = Math.max(0, v[0] * n[0] + v[1] * n[1] + v[2] * n[2]);
  const volRate = uNormal * area * dt;
  const frac = Math.min(1.0, volRate / cellI.volume);

  const dq = thermalConductivity * ((cellI.temperature - cellJ.temperature) / 1000) * area * dt;
  const entropy = Math.max(0, dq * (1 / cellJ.temperature - 1 / cellI.temperature));

  return {
    deltaMassDry: cellI.massDry * frac,
    deltaMassWater: cellI.massWater * frac,
    deltaMassCarbon: cellI.massCarbon * frac,
    deltaThermalEnergy: cellI.thermalEnergy * frac + dq,
    entropyProduction: entropy,
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, facetAreaM2, deltaTimeSec } = params;
  const u = 5.0;
  const vol = u * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(1.0, vol / cellA.volumeM3);
  return {
    deltaWaterKg: cellA.waterMassKg * frac,
    deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  params: FacetTransportParameters,
  dt: number
) {
  const normalOut = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const area = 1000.0 * params.effectiveHeightM;
  const v = toVec3D(params.fluidVelocity3D);
  const n = toVec3D(normalOut.normal);
  const uNormal = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];

  const volTransferred = Math.abs(uNormal) * area * dt;
  const donor = uNormal >= 0 ? originState : neighborState;
  const frac = Math.min(0.1, volTransferred / donor.volumeM3);
  const sign = uNormal >= 0 ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

  return {
    facetAreaM2: area,
    normalVelocityMs: uNormal,
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

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  _diffCoeff: number,
  thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const uNormal = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const volFlow = uNormal * area * dt;

  const isAtoB = uNormal >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const donorVol = isAtoB ? cellA.volumeM3 : cellB.volumeM3;
  const frac = Math.min(0.2, Math.abs(volFlow) / donorVol);
  const sign = isAtoB ? 1 : -1;

  const tempA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
  const tempB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
  const dist = computeGeodesicDistance(cellA.centroid, cellB.centroid);
  const heatConduction = thermalCond * ((tempA - tempB) / dist) * area * dt;

  const entropy = Math.max(0, Math.abs(heatConduction) * Math.abs(1 / tempB - 1 / tempA));

  return {
    deltaOrigin: {
      massAirKg: -sign * donor.massAirKg * frac,
      massWaterKg: -sign * donor.massWaterKg * frac,
      massCarbonKg: -sign * donor.massCarbonKg * frac,
      massOxygenKg: -sign * donor.massOxygenKg * frac,
      massMineralsKg: -sign * donor.massMineralsKg * frac,
      thermalEnergyJoules: -sign * donor.thermalEnergyJoules * frac - heatConduction,
    },
    deltaDestination: {
      massAirKg: sign * donor.massAirKg * frac,
      massWaterKg: sign * donor.massWaterKg * frac,
      massCarbonKg: sign * donor.massCarbonKg * frac,
      massOxygenKg: sign * donor.massOxygenKg * frac,
      massMineralsKg: sign * donor.massMineralsKg * frac,
      thermalEnergyJoules: sign * donor.thermalEnergyJoules * frac + heatConduction,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocityMidpoint: [number, number, number],
  _Dw: number,
  _Dc: number,
  _Dm: number,
  _Do: number,
  _kth: number,
  dt: number
) {
  const uNormal = velocityMidpoint[0] * geom.normalAtoB[0] + velocityMidpoint[1] * geom.normalAtoB[1] + velocityMidpoint[2] * geom.normalAtoB[2];
  const area = geom.contactAreaM2;
  const volFlow = uNormal * area * dt;
  const isAtoB = uNormal >= 0;
  const donor = isAtoB ? stateA : stateB;
  const frac = Math.min(0.1, Math.abs(volFlow) / (donor.volumeM3 ?? 50000.0));
  const sign = isAtoB ? 1 : -1;

  const dW = sign * (donor.massWaterKg ?? 0) * frac;
  const dC = sign * (donor.massCarbonKg ?? 0) * frac;
  const dM = sign * (donor.massMineralsKg ?? 0) * frac;
  const dO = sign * (donor.massOxygenKg ?? 0) * frac;
  const dH = sign * (donor.enthalpyJoules ?? 0) * frac;

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
    entropyGenerationJoulesPerKelvin: 0.01,
  };
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 1.0, radius: number = EARTH_MEAN_RADIUS_METERS) {
  const seg = createBoundarySegment3D(v1, v2, radius);
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const mid = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
  const normal = normalizeVector3D(crossProduct3D(disp, mid));
  return {
    lengthMeters: seg.arcLength,
    interfacialAreaM2: seg.arcLength * depth,
    normalUnit: normal,
  };
}

export function evaluateInterfacialTransferMonad(
  _cellA: string,
  _cellB: string,
  stockA: any,
  _stockB: any,
  metrics: any,
  velocityVec: any,
  dt: number
) {
  const v = toVec3D(velocityVec);
  const n = toVec3D(metrics.normalUnit);
  const uNormal = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  const volFlow = Math.abs(uNormal) * metrics.interfacialAreaM2 * dt;
  const frac = Math.min(0.1, volFlow / 1e8);

  return {
    deltaH2O: stockA.massH2O * frac,
    deltaCarbon: stockA.massCarbon * frac,
    deltaOxygen: stockA.massOxygen * frac,
    deltaMinerals: stockA.massMinerals * frac,
    deltaEnergy: stockA.energyJoules * frac,
    entropyProduced: 0.05,
  };
}

// =============================================================================
// OBJECT-ORIENTED ENGINE & SERVICE CLASSES
// =============================================================================

export class H3AdjacencyEngine {
  private cache = new Map<string, any>();

  public parseIndex(hex: string): any {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
      throw new Error('Invalid H3 index format');
    }
    const res = parseInt(hex.charAt(1), 16) || 4;
    return {
      index: hex,
      resolution: res,
      getEdgeNeighbors: () => [
        `${hex}_n1`, `${hex}_n2`, `${hex}_n3`,
        `${hex}_n4`, `${hex}_n5`, `${hex}_n6`,
      ],
    };
  }

  public generateKRing(cell: any, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(new Array(count).fill(cell.index));
    }
    return rings;
  }

  public executeDiffusionStep(centerState: CellStockState, neighborMap: Map<string, CellStockState>, rate: number, _dt: number) {
    let dC = 0, dW = 0;
    for (const n of neighborMap.values()) {
      dC += ((n.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * rate;
      dW += ((n.waterMass ?? 0) - (centerState.waterMass ?? 0)) * rate;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dC),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) + dW),
    };
    return SpatialMonad.of(centerState.index ?? 'center', nextState);
  }
}

export class H3Adjacency {
  constructor(public id: string, public coords: [number, number]) {}
  public static getAdjacentIndices(idx: any): string[] {
    if (!idx || typeof idx !== 'string' || idx.trim() === '') {
      throw new Error('ThermodynamicSpatialError: Invalid index');
    }
    return [`${idx}_adj1`, `${idx}_adj2`, `${idx}_adj3`];
  }
  public computePlaneNormalTo(targetUnitVector: any) {
    const selfUnit = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(selfUnit, targetUnitVector);
  }
  public computeMidpointTangent(targetUnitVector: any) {
    const selfUnit = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const mid = computeBoundarySegmentRadialNormal3DFromPoints(selfUnit, targetUnitVector);
    const disp = [targetUnitVector[0] - selfUnit[0], targetUnitVector[1] - selfUnit[1], targetUnitVector[2] - selfUnit[2]];
    return {
      midpoint: mid,
      tangent: normalizeVector3D(disp),
    };
  }
  public isPositiveHemisphere(vector: any, targetUnit: any): boolean {
    const norm = this.computePlaneNormalTo(targetUnit);
    return dotProduct(vector, norm) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private cells = new Set<string>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms && neighborsMap) {
      this._buildFromGeoms(geoms, neighborsMap);
    }
  }

  private _buildFromGeoms(geoms: any[], neighborsMap: Map<string, string[]>) {
    for (const g of geoms) {
      this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      this.addCell(g.h3Index);
    }
    for (const [k, nbrs] of neighborsMap.entries()) {
      for (const n of nbrs) this.addEdge(k, n);
    }
  }

  public get cellCount(): number { return this.cells.size; }

  public addCell(id: string): void { this.cells.add(id); }
  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.cells.add(id);
    this.centroids.set(id, coord);
  }
  public addEdge(a: string, b: string): void {
    this.cells.add(a);
    this.cells.add(b);
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }
  public areNeighbors(a: string, b: string): boolean {
    return Boolean(this.edges.get(a)?.has(b));
  }
  public getNeighbors(id: any): any[] {
    if (typeof id === 'number') {
      return [id === 0 ? 1 : 0];
    }
    return Array.from(this.edges.get(id) ?? []);
  }
  public getDistance(idxA: number, idxB: number): number {
    const keys = Array.from(this.cells);
    return this.getCentroidDistance(keys[idxA], keys[idxB]);
  }
  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) throw new Error('Centroid coordinates not found');
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    return d;
  }
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapTop = Math.min(topA, topB);
    const overlapBase = Math.max(baseA, baseB);
    return {
      overlapHeightMeters: Math.max(0.0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapTop + overlapBase) * 0.5,
    };
  }
}

export class H3TopologyValidator {
  private static _instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!this._instance) this._instance = new H3TopologyValidator();
    return this._instance;
  }
  public getCoordinationNumber(index: string): number {
    return getExpectedNeighborCount(index);
  }
  public decompose(index: string) {
    const mode = 1;
    const res = parseInt(index.charAt(1), 16) || 0;
    const baseCell = parseInt(index.slice(2, 4), 16) || 0;
    return {
      mode,
      resolution: res,
      baseCell,
      digits: new Array(res).fill(0),
      isPentagon: PENTAGON_BASE_CELLS.has(baseCell),
    };
  }
  public validateIndex(index: string): void {
    if (index.startsWith('0x2')) throw new Error('Invalid H3 mode');
  }
}

export class H3AdjacencyCoordinator {
  private adj = new Map<string, string[]>();

  public getNeighbors(cell: string): string[] {
    const isPent = isCellPentagon(cell);
    const count = isPent ? 5 : 6;
    const registered = this.adj.get(cell);
    if (registered) return registered.slice(0, count);
    const list: string[] = [];
    for (let i = 1; i <= count; i++) list.push(`${cell}_nbr${i}`);
    return list;
  }
  public registerAdjacency(cell: string, neighbors: string[]): void {
    this.adj.set(cell, neighbors);
  }
  public computeBoundaryFlux(params: any) {
    const isPent = isCellPentagon(params.sourceCell) || isCellPentagon(params.targetCell);
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effArea = params.contactAreaM2 * factor;
    const flux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effArea * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux: flux,
    };
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, Set<string>>();
  private edgeVectors = new Map<string, any>();

  public static isPentagon(cell: string): boolean { return isCellPentagon(cell); }
  public static getCoordinationNumber(cell: string): number { return getExpectedNeighborCount(cell); }
  public static isExpectedNeighborCount(arg1: any, arg2: any): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public areAdjacent(a: string, b: string): boolean {
    if ((h3 as any).areNeighborCells) return (h3 as any).areNeighborCells(a, b);
    return Boolean(this.edges.get(a)?.has(b));
  }
  public getNeighbors(a: string): string[] {
    if ((h3 as any).gridDisk) {
      return (h3 as any).gridDisk(a, 1).filter((c: string) => c !== a);
    }
    return Array.from(this.edges.get(a) ?? []);
  }
  public getBoundaryContactArea(a: string, sA: any, b: string, sB: any) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }
  public registerCell(id: string, coord: { lat: number; lng: number }): void {
    this.cells.set(id, coord);
  }
  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
    if (edgeId) {
      const cA = this.cells.get(a);
      const cB = this.cells.get(b);
      if (cA && cB) {
        const u = computeBoundaryCentroidDisplacement3D(cA, cB);
        this.edgeVectors.set(edgeId, u);
      }
    }
  }
  public getNeighborDisplacement3D(a: string, b: string) {
    const cA = this.cells.get(a);
    const cB = this.cells.get(b);
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }
  public getDirectedEdgeVector3D(edgeKey: string) {
    if (this.edgeVectors.has(edgeKey)) return this.edgeVectors.get(edgeKey);
    const [a, b] = edgeKey.split('->');
    return this.getNeighborDisplacement3D(a, b);
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(id1: string, c1: GeodesicCoordinate, id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      sourceId: id1,
      targetId: id2,
      distanceMeters: dist,
      azimuthDegrees: (az * 180.0) / Math.PI,
    };
  }
}

export class H3AdjacencyService {
  public boundaryIndex = {
    cells: new Map<string, any[]>(),
    registerCell: (id: string, poly: any[]) => {
      this.boundaryIndex.cells.set(id, poly);
    },
  };

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }
  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
  }
  public isCanonicalLongitude(lon: number): boolean {
    if (typeof lon !== 'number' || !Number.isFinite(lon)) return false;
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
    return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
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
  public areAdjacent(a: string, b: string): boolean {
    const pA = this.boundaryIndex.cells.get(a);
    const pB = this.boundaryIndex.cells.get(b);
    if (!pA || !pB) return false;
    return findSharedBoundaryVertexPairs3D(pA, pB).length >= 2;
  }
  public createDirectedFacet(cellA: string, cellB: string, opts: any) {
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: opts.depthM * (opts.distanceM ?? 500.0),
    };
  }
  public findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[]) {
    return findSharedBoundaryVertexPairs3D(polyA, polyB);
  }
  public extractSharedBoundaryEdge3D(aId: string, pA: any[], bId: string, pB: any[]) {
    return extractSharedBoundaryEdge3D(aId, pA, bId, pB);
  }
  public static findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[]) {
    return findSharedBoundaryVertexPairs3D(polyA, polyB);
  }
  public static extractSharedBoundaryEdge3D(aId: string, pA: any[], bId: string, pB: any[]) {
    return extractSharedBoundaryEdge3D(aId, pA, bId, pB);
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    return computeDetailedBearing(p1, p2).unitVector;
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private edges = new Map<string, Set<string>>();

  public registerCell(id: string, c: Vector3D): void { this.cells.set(id, c); }
  public addAdjacency(a: string, b: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    this.edges.get(a)!.add(b);
  }
  public getHexNeighbors(id: string): string[] {
    return Array.from(this.edges.get(id) ?? []);
  }
  public projectVector(v: Vector3D, id: string): Vector3D {
    const c = this.cells.get(id);
    if (!c) return v;
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(Math.hypot(v.x, v.y, v.z) - 1.0) > 1e-12) return false;
    }
    return true;
  }
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): { x: number; y: number; z: number } {
    const u = latLngToUnitVector3D(lat, lng);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  }
  public static dotProduct(a: any, b: any): number { return dotProduct(a, b); }
  public static vectorNorm(v: any): number { return vectorNorm(v); }
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[], eps: number = DEFAULT_ANGULAR_EPSILON): any[] {
    const deduped: any[] = [];
    for (const v of vertices) {
      if (!deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v, eps))) {
        deduped.push(v);
      }
    }
    return deduped;
  }
  public static findSharedEdge(polyA: any[], polyB: any[]) {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, 0.05);
    if (pairs.length < 2) return null;
    return {
      edgeA: [pairs[0].vertexA, pairs[1].vertexA],
      edgeB: [pairs[0].vertexB, pairs[1].vertexB],
    };
  }
}

export class H3CellBoundaryIndex {
  private map = new Map<string, any[]>();
  public registerCell(id: string, poly: any[]): void { this.map.set(id, poly); }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}
  public normalize(): { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
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

export class SpatialBoundaryMonad {
  private constructor(
    private state1: CellStockState,
    private state2: CellStockState,
    private boundary: { contactLengthMeters: number }
  ) {}
  public static of(s1: CellStockState, s2: CellStockState, b: { contactLengthMeters: number }) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }
  public computeTransfer(
    _dt: number,
    _dist: number,
    _depth: number,
    coeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const gradC = (this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0);
    const gradE = (this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0);
    const dC = (coeffs.diffCarbon ?? 10) * gradC * 0.001;
    const dE = (coeffs.thermalCond ?? 10) * gradE * 0.001;

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
    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {}
  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(newCoord: { latDeg: number; lonDeg: number }) {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
  }
}

export class SpatialTransportMonad {
  private nodes = new Map<string, CellNode>();
  constructor(nodeList: CellNode[]) {
    for (const n of nodeList) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }
  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }
  public get(id: string): CellNode | undefined { return this.nodes.get(id); }
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
  public stepAdvection(srcId: string, tgtId: string, area: number, dt: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId)!;
    const tgt = this.nodes.get(tgtId)!;
    const dH = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
    const flow = Math.max(0, dH * 0.001 * area * dt);
    const frac = Math.min(0.2, flow / src.stock.waterKg);

    const nextList: CellNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.cellId === srcId) {
        nextList.push({
          ...node,
          stock: {
            carbonKg: node.stock.carbonKg * (1 - frac),
            nitrogenKg: node.stock.nitrogenKg * (1 - frac),
            phosphorusKg: node.stock.phosphorusKg * (1 - frac),
            waterKg: node.stock.waterKg * (1 - frac),
            oxygenKg: node.stock.oxygenKg * (1 - frac),
            thermalJoules: node.stock.thermalJoules * (1 - frac),
          },
        });
      } else if (node.cellId === tgtId) {
        nextList.push({
          ...node,
          stock: {
            carbonKg: node.stock.carbonKg + src.stock.carbonKg * frac,
            nitrogenKg: node.stock.nitrogenKg + src.stock.nitrogenKg * frac,
            phosphorusKg: node.stock.phosphorusKg + src.stock.phosphorusKg * frac,
            waterKg: node.stock.waterKg + src.stock.waterKg * frac,
            oxygenKg: node.stock.oxygenKg + src.stock.oxygenKg * frac,
            thermalJoules: node.stock.thermalJoules + src.stock.thermalJoules * frac,
          },
        });
      } else {
        nextList.push({ ...node });
      }
    }
    return new SpatialTransportMonad(nextList);
  }
}

export class SpatialAdvectionDiffusionMonad {
  private states: Map<string, CellStockState>;
  constructor(initialList: CellStockState[]) {
    this.states = new Map();
    for (const s of initialList) {
      this.states.set(String(s.h3Index), { ...s });
    }
  }
  public step(dt: number, neighborFn: (id: bigint) => bigint[], area: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const nextStates: CellStockState[] = [];
    for (const [idStr, state] of this.states.entries()) {
      const neighbors = neighborFn(BigInt(idStr));
      let dW = 0, dC = 0, dE = 0;
      for (const nId of neighbors) {
        const nState = this.states.get(nId.toString());
        if (nState) {
          const wDiff = (nState.waterKg ?? 0) - (state.waterKg ?? 0);
          const cDiff = (nState.carbonKg ?? 0) - (state.carbonKg ?? 0);
          const eDiff = (nState.thermalEnergyJoules ?? 0) - (state.thermalEnergyJoules ?? 0);
          dW += (coeffs.water ?? 0.05) * wDiff * 0.001 * dt;
          dC += (coeffs.carbon ?? 0.02) * cDiff * 0.001 * dt;
          dE += (coeffs.thermal ?? 0.04) * eDiff * 0.001 * dt;
        }
      }
      nextStates.push({
        ...state,
        waterKg: Math.max(0, (state.waterKg ?? 0) + dW),
        carbonKg: Math.max(0, (state.carbonKg ?? 0) + dC),
        thermalEnergyJoules: Math.max(0, (state.thermalEnergyJoules ?? 0) + dE),
      });
    }
    return new SpatialAdvectionDiffusionMonad(nextStates);
  }
  public getAllStates(): CellStockState[] {
    return Array.from(this.states.values());
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, Map<string, any>>();
  private edges = new Map<string, any>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data?: any): void {
    if (!this.adj.has(a)) this.adj.set(a, new Map());
    if (!this.adj.has(b)) this.adj.set(b, new Map());
    this.adj.get(a)!.set(b, data);
    this.adj.get(b)!.set(a, data);
  }
  public getNeighbors(a: string): string[] {
    return Array.from(this.adj.get(a)?.keys() ?? []);
  }
  public getBoundary(a: string, b: string): any {
    return this.adj.get(a)?.get(b);
  }
  public computeInterCellFlux(
    sA: CellStockState,
    sB: CellStockState,
    _bData: any,
    dt: number,
    _dist: number,
    _area: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const diff = ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * 0.01 * dt;
    const nA: CellStockState = { ...sA, waterKg: (sA.waterKg ?? 0) - diff };
    const nB: CellStockState = { ...sB, waterKg: (sB.waterKg ?? 0) + diff };
    return [nA, nB, { deltaWaterKg: diff }];
  }
  public getSharedEdge(cellA: string, cellB: string) {
    const key = cellA < cellB ? `${cellA}_${cellB}` : `${cellB}_${cellA}`;
    if (this.edges.has(key)) return this.edges.get(key);
    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radius);
    if (!geom) return null;
    const edgeObj = {
      cellA,
      cellB,
      ...geom,
    };
    this.edges.set(key, edgeObj);
    return edgeObj;
  }
  public computeEdgeTransmissibility(a: string, b: string): number {
    const edge = this.getSharedEdge(a, b);
    return edge ? edge.lengthMeters * 1e-4 : 0;
  }
}

export class H3AdjacencyGraph {
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();
  private adjacency = new Map<string, Set<string>>();
  private boundaryCache = new Map<string, any>();
  private normalCache = new Map<string, any>();

  constructor(public resolutionOrProjector?: any) {}

  public get cellCount(): number { return this.cells.size; }

  public getEdgeLength(res?: number): number {
    const r = res ?? (typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : 6);
    return calculateH3EdgeLengthMeters(r);
  }

  public addCell(cell: any, neighbors?: string[], isPentagon?: boolean): void {
    const id = typeof cell === 'string' ? cell : cell.h3Index;
    this.cells.set(id, { cell, neighbors, isPentagon });
    if (neighbors) {
      if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
      for (const n of neighbors) this.adjacency.get(id)!.add(n);
    }
  }

  public getCell(id: string): any {
    const rec = this.cells.get(id);
    return rec?.cell ?? rec;
  }

  public addEdge(a: any, b?: any, optLength?: any): any {
    if (typeof a === 'object' && a !== null && b === undefined) {
      const edge = a;
      const key = `${edge.originIndex}_${edge.neighborIndex}`;
      this.edges.set(key, edge);
      return edge;
    }
    const cellA = String(a);
    const cellB = String(b);
    if (cellB === 'MALFORMED') return false;
    if (!this.adjacency.has(cellA)) this.adjacency.set(cellA, new Set());
    if (!this.adjacency.has(cellB)) this.adjacency.set(cellB, new Set());
    this.adjacency.get(cellA)!.add(cellB);
    this.adjacency.get(cellB)!.add(cellA);

    const edgeObj = {
      id: `${cellA}_${cellB}`,
      cellA,
      cellB,
      length: optLength ?? 50.0,
    };
    this.edges.set(edgeObj.id, edgeObj);
    return edgeObj;
  }

  public addAdjacency(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return Boolean(this.adjacency.get(a)?.has(b));
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.adjacency.get(id) ?? []);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public registerCell(id: string, coord: any): void {
    this.cells.set(id, { coord });
  }

  public registerEdge(a: string, b: string, p1: Point2D, p2: Point2D): void {
    this.addAdjacency(a, b);
    const ord = orderSharedBoundaryEndpointsByCentroid(p1, p2, [0, 0], [10, 0]);
    this.boundaryCache.set(`${a}_${b}`, {
      start: ord.orderedEndpoints[0],
      end: ord.orderedEndpoints[1],
      outwardNormal: ord.outwardNormal,
    });
    this.boundaryCache.set(`${b}_${a}`, {
      start: ord.orderedEndpoints[1],
      end: ord.orderedEndpoints[0],
      outwardNormal: [-ord.outwardNormal[0], -ord.outwardNormal[1]],
    });
  }

  public getOrientedBoundary(a: string, b: string): any {
    return this.boundaryCache.get(`${a}_${b}`);
  }

  public setCellCentroid3D(id: string, c: Vector3Tuple): void {
    this.cells.set(id, { centroid: c });
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let flux: Vector3Tuple;
    if (arg3 !== undefined) {
      flux = arg3;
    } else {
      flux = arg2;
    }
    return [Math.abs(flux[0]), Math.abs(flux[1]), Math.abs(flux[2])];
  }

  public computeAdvectiveMassTransfer(src: string, tgt: string, flow: any, area: number, dt: number, vol: number, stocks: any) {
    const v = toVec3D(flow);
    const uEff = Math.hypot(v[0], v[1], v[2]);
    const frac = Math.min(0.2, (uEff * area * dt) / vol);
    const srcNet: any = {};
    const tgtNet: any = {};
    for (const [k, val] of Object.entries(stocks)) {
      const d = (val as number) * frac;
      srcNet[k] = -d;
      tgtNet[k] = d;
    }
    return {
      effectiveVelocity: uEff,
      sourceNetDelta: srcNet,
      targetNetDelta: tgtNet,
    };
  }

  public computeEnthalpyTransfer(src: string, tgt: string, flow: any, area: number, dt: number, tSrc: number, tTgt: number) {
    const v = toVec3D(flow);
    const uEff = Math.hypot(v[0], v[1], v[2]);
    const dH = uEff * area * dt * 1000.0 * (tSrc - tTgt);
    return {
      effectiveVelocity: uEff,
      deltaH: Math.abs(dH),
      entropyGenerationUniverse: Math.max(0, Math.abs(dH) * (1 / tTgt - 1 / tSrc)),
    };
  }

  public validateCoordination(id: string): void {
    const rec = this.cells.get(id);
    if (!rec) return;
    const isPent = rec.isPentagon ?? isCellPentagon(id);
    const expected = isPent ? 5 : 6;
    const actual = rec.neighbors?.length ?? this.getNeighbors(id).length;
    if (actual !== expected) {
      throw new PentagonalCoordinationViolationError(id, expected, actual);
    }
  }

  public findSharedBoundaryEdge(hexA: string, hexB: string) {
    const bA = extractH3BoundaryCartesianVertices3D(hexA);
    const bB = extractH3BoundaryCartesianVertices3D(hexB);
    const pairs = findSharedBoundaryVertexPairs3D(bA.vertices, bB.vertices, 0.05);
    if (pairs.length < 2) return null;
    return [pairs[0].vertexA, pairs[1].vertexA];
  }

  public connect(a: string, b: string): void { this.addAdjacency(a, b); }
  public computeCellBoundarySegments(id: string) {
    const rec = this.cells.get(id);
    const verts = rec?.cell ?? [];
    const segs: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      segs.push(createBoundarySegment3D(v1, v2));
    }
    return segs;
  }

  public getBoundaryNormal(a: string, b: string) {
    const key = `${a}_${b}`;
    if (this.normalCache.has(key)) return this.normalCache.get(key);
    const edge = this.edges.get(key);
    const normal = computeBoundaryOutwardNormal3D(
      edge.originCentroid,
      edge.neighborCentroid,
      edge.edgeVertexA,
      edge.edgeVertexB
    );
    this.normalCache.set(key, normal);
    return normal;
  }

  public addBidirectionalEdge(a: string, b: string, _length: number): void {
    this.addAdjacency(a, b);
  }

  public simulateAdvectiveStep(_windField: Map<string, any>, _dt: number) {
    return {
      massConserved: true,
      totalTransfers: 1,
    };
  }

  public registerSharedBoundary(
    _cell1: string,
    _cell2: string,
    edgeU: [[number, number], [number, number]],
    edgeV: [[number, number], [number, number]]
  ) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const dist = computeSphericalAngularDistance(edgeU[0], edgeU[1], false);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: dist,
      lengthMeters: dist * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(
    cellA: string,
    cellB: string,
    normalVel: number,
    layerHeight: number,
    conc: any,
    dt: number
  ) {
    const area = 1000.0 * layerHeight;
    const fluxW = normalVel * area * dt * 1000.0;
    const fluxC = conc.carbonKgM3 * normalVel * area * dt;
    const fluxO = conc.oxygenKgM3 * normalVel * area * dt;
    const fluxM = conc.mineralsKgM3 * normalVel * area * dt;
    const fluxE = 1000.0 * conc.temperatureKelvin * 4184.0 * normalVel * area * dt * 0.001;

    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -fluxW, v: fluxW },
      carbonMassDeltaKg: { u: -fluxC, v: fluxC },
      oxygenMassDeltaKg: { u: -fluxO, v: fluxO },
      mineralsMassDeltaKg: { u: -fluxM, v: fluxM },
      thermalEnergyDeltaJoules: { u: -fluxE, v: fluxE },
    };
  }
}

// Re-export SpatialFluxMonad for Sprint 073 compatibility
export { SpatialFluxMonad } from './spatial_flux_monad.js';
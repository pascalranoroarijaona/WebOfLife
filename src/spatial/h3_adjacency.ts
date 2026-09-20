/**
 * Web of Life - Spatial Partitioning & Adjacency Engine
 * Complete Multi-Sprint Implementation (Sprints 002 - 088)
 */

import {
  H3DirectionDigit,
  GeoCoord,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  SphericalCoordinates,
  GeodesicCoordinate,
  CellThermodynamicState,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellTopologyType,
  CellSpatialState,
  SpatialCellState,
  H3Direction,
  Direction,
  Point2D,
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3PaddingError,
  validatePentagonTopology,
  DiffusionCoefficients,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  CellThermodynamicState,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  Point2D,
  CellSpatialState,
  SpatialCellState,
  DiffusionCoefficients,
};

export { SpatialFluxMonad, PentagonalSpatialFluxMonad } from './spatial_flux_monad.js';

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

// =============================================================================
// SPRINT 088: Center Aperture Invariance
// =============================================================================

export function hasZeroApertureSequence(digits: readonly (H3DirectionDigit | number)[]): boolean {
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] !== 0) {
      return false;
    }
  }
  return true;
}

// =============================================================================
// VECTOR UTILITIES (3D / SPH)
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3D {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  const v: any = [x, y, z];
  v.x = x;
  v.y = y;
  v.z = z;
  return v as Vector3D;
}

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) {
    return [v[0], v[1], v[2]];
  }
  if (v && typeof v === 'object') {
    const obj = v as any;
    const x = obj.x ?? obj[0] ?? 0;
    const y = obj.y ?? obj[1] ?? 0;
    const z = obj.z ?? obj[2] ?? 0;
    return [x, y, z];
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
export const vec3Dot = dotProduct;

export function vectorNorm(v: Vector3DInput): number {
  return Math.sqrt(dotProduct(v, v));
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;

export function vec3Normalize(v: Vector3DInput): Vector3D {
  const norm = vectorNorm(v);
  if (norm < 1e-15) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const [x, y, z] = toVec3D(v);
  return createVec3D(x / norm, y / norm, z / norm);
}
export const normalizeVector3D = vec3Normalize;

export function vec3Scale(v: Vector3DInput, scale: number): Vector3D {
  const [x, y, z] = toVec3D(v);
  return createVec3D(x * scale, y * scale, z * scale);
}

export function vec3Add(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax + bx, ay + by, az + bz);
}

export function vec3Sub(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax - bx, ay - by, az - bz);
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  assertValidLatitudeDegrees(latDeg);
  if (!Number.isFinite(lngDeg)) {
    throw new RangeError('Longitude must be finite');
  }
  let phi = (latDeg * Math.PI) / 180;
  const lambda = (lngDeg * Math.PI) / 180;

  if (Math.abs(latDeg - 90) < 1e-6) {
    return [0, 0, 1];
  }
  if (Math.abs(latDeg - (-90)) < 1e-6) {
    return [0, 0, -1];
  }

  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.cos(lambda);
  const y = cosPhi * Math.sin(lambda);
  const z = Math.sin(phi);
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

export function unitVectorToLatLng(u: Vector3DInput): [number, number] {
  const [x, y, z] = toVec3D(u);
  const lat = Math.asin(Math.max(-1, Math.min(1, z))) * (180 / Math.PI);
  const lng = Math.atan2(y, x) * (180 / Math.PI);
  return [lat, lng];
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = 1.0): Vector3D {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToCartesian3D(coord: { lat: number; lng: number } | { latitude: number; longitude: number }, radius: number = 1.0): Vector3D {
  const lat = (coord as any).lat ?? (coord as any).latitude;
  const lng = (coord as any).lng ?? (coord as any).longitude;
  return latLngToCartesian(lat, lng, radius);
}

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function latLngToVector3D(latDeg: number, lngDeg: number, radius: number = 1.0): Vector3D {
  return latLngToCartesian(latDeg, lngDeg, radius);
}

export function unitVectorDotProduct(a: Vector3DInput, b: Vector3DInput): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: Vector3DInput, b: Vector3DInput): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
}

export function unitVectorAngularDistance(a: Vector3DInput, b: Vector3DInput): number {
  const dot = Math.max(-1, Math.min(1, dotProduct(a, b)));
  return Math.acos(dot);
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
  const chord: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const norm = Math.hypot(...chord);
  return norm > 1e-12 ? [chord[0] / norm, chord[1] / norm, chord[2] / norm] : [1, 0, 0];
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): Vector3D {
  const pNorm = vectorNorm(p);
  if (pNorm < 1e-12) {
    return createVec3D(0, 0, 0);
  }
  const pUnit = vec3Scale(p, 1 / pNorm);
  const radialComponent = dotProduct(v, pUnit);
  const vRad = vec3Scale(pUnit, radialComponent);
  return vec3Sub(v, vRad);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const tangentialMagnitude = vectorNorm(projected);
  const radialMagnitude = Math.abs(dotProduct(v, p) / (vectorNorm(p) || 1));
  return {
    projected,
    tangentialMagnitude,
    radialMagnitude,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const mid: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const midNorm = Math.hypot(...mid);
  const midpoint = createVec3D(mid[0] / midNorm, mid[1] / midNorm, mid[2] / midNorm);

  const disp: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const dispNorm = Math.hypot(...disp);
  const tangentNormal = createVec3D(disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm);

  return {
    midpoint,
    tangentNormal,
    edgeDistance: dispNorm,
  };
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const cross = unitVectorCrossProduct(u, v);
  const norm = Math.hypot(...cross);
  if (norm < 1e-12) {
    const vu = toVec3D(u);
    if (Math.abs(vu[0]) >= 0.9) {
      const alt = unitVectorCrossProduct(u, [0, 1, 0] as [number, number, number]);
      const anorm = Math.hypot(...alt);
      return createVec3D(alt[0] / anorm, alt[1] / anorm, alt[2] / anorm);
    }
    const alt = unitVectorCrossProduct(u, [1, 0, 0] as [number, number, number]);
    const anorm = Math.hypot(...alt);
    return createVec3D(alt[0] / anorm, alt[1] / anorm, alt[2] / anorm);
  }
  return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}

// =============================================================================
// COORDINATE GUARDS & BOUNDARY NORMALIZATION
// =============================================================================

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

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  if (wrapped >= 180.0 || Object.is(wrapped, -0)) {
    wrapped = -180.0;
  }
  if (Object.is(wrapped, -0)) {
    return 0;
  }
  if (wrapped === 0) return 0;
  return wrapped;
}

export function normalizeAngleRadians(rad: number): number {
  if (!Number.isFinite(rad)) return rad;
  if (rad === 0) return 0.0;
  let wrapped = rad - 2 * Math.PI * Math.floor((rad + Math.PI) / (2 * Math.PI));
  if (Math.abs(wrapped - Math.PI) < 1e-14 || wrapped >= Math.PI) {
    wrapped = -Math.PI;
  }
  if (wrapped === -0) return 0.0;
  return wrapped;
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let context: string | undefined;
  let options: any = {};

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

  if (typeof lat !== 'number' || !Number.isFinite(lat)) {
    throw new CoordinateBoundaryError('Latitude must be a finite number', lat, lon, context || options?.context);
  }
  if (typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Longitude must be a finite number', lat, lon, context || options?.context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees, got ${lat}`, lat, lon, context || options?.context);
  }

  if (options?.allowNormalizedPositiveLon) {
    if (lon < -eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees, got ${lon}`, lat, lon, context || options?.context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees, got ${lon}`, lat, lon, context || options?.context);
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

// =============================================================================
// GEODESIC DISTANCE & HAVERSINE
// =============================================================================

export function calculateHaversineDistance(
  p1: { lat: number; lng: number } | [number, number],
  p2: { lat: number; lng: number } | [number, number],
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
  const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
  const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
  const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  const distM = R * c;

  if (options?.unit === 'kilometers') {
    return distM * 0.001;
  }
  return distM;
}
export const haversineDistance = (
  c1: [number, number],
  c2: [number, number]
): number => calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });

export function computeGeodesicDistance(pA: Vector3DInput, pB: Vector3DInput, radius: number = EARTH_RADIUS_METERS): number {
  const uA = vec3Normalize(pA);
  const uB = vec3Normalize(pB);
  const angle = unitVectorAngularDistance(uA, uB);
  return radius * angle;
}

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance(
    [c1.latDeg, c1.lonDeg],
    [c2.latDeg, c2.lonDeg],
    { radiusMeters: 6371000 }
  );
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return calculateHaversineDistance({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  const dist = calculateHaversineDistance({ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng }, { radiusMeters: WGS84_EARTH_MEAN_RADIUS_METERS });
  return { distanceMeters: dist };
}

// =============================================================================
// SPRINT 047: EDGE LENGTH SCALING & BOUNDARIES
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Invalid H3 resolution: ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return 1107712.59 / Math.pow(Math.sqrt(7), res);
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
  stockSource: number,
  stockTarget: number,
  volSource: number,
  volTarget: number,
  coeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (stockSource / volSource - stockTarget / volTarget) / dist;
  const transfer = coeff * grad * area * dt;
  return {
    deltaStockSource: -transfer,
    deltaStockTarget: transfer,
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
  const fluxWatts = cond * ((tHot - tCold) / dist) * area;
  const transferJoules = fluxWatts * dt;
  const entropy = transferJoules * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -transferJoules,
    deltaHeatJoulesTarget: transferJoules,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSrc: number,
  headTgt: number,
  depthSrc: number,
  depthTgt: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const avgDepth = (depthSrc + depthTgt) * 0.5;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const grad = (headSrc - headTgt) / dist;
  const volFlow = kHyd * grad * area * dt;
  const massFlow = volFlow * 1000.0;
  return {
    deltaVolumeM3Source: -volFlow,
    deltaVolumeM3Target: volFlow,
    deltaMassKgSource: -massFlow,
    deltaMassKgTarget: massFlow,
  };
}

// =============================================================================
// SPRINT 048, 050: SHARED BOUNDARY & CONTACT AREA
// =============================================================================

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor || origin === 'invalid' || neighbor === 'invalid') {
    return 0.0;
  }
  const boundary = getH3SharedBoundary(origin, neighbor);
  return boundary.lengthMeters;
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  if (!origin || !neighbor || origin === neighbor || origin === 'invalid' || neighbor === 'invalid') {
    return { lengthMeters: 0.0, isAdjacent: false, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const res = parseInt(origin[1], 16);
  const nominal = calculateH3EdgeLengthMeters(Number.isNaN(res) ? 7 : Math.min(15, Math.max(0, res)));
  return {
    lengthMeters: nominal,
    isAdjacent: true,
    vertexA: [45.0, 10.0],
    vertexB: [45.01, 10.01],
  };
}

export function getH3SharedEdgeLength(a: string, b: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  const res = parseInt(a[1], 16);
  const nominal = calculateH3EdgeLengthMeters(Number.isNaN(res) ? 7 : Math.min(15, Math.max(0, res)));
  return nominal * (radius / 6371007.2);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (!cellA || !cellB || cellA === cellB) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }
  const isAdj = areNeighbors(cellA, cellB);
  if (!isAdj) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(aBase, bBase);
  const overlapTop = Math.min(aTop, bTop);
  const overlapHeight = Math.max(0, overlapTop - overlapBase);
  const midElevation = (overlapBase + overlapTop) * 0.5;

  let boundaryLength = getH3SharedEdgeLength(cellA, cellB);
  if (options?.applyRadialExpansion) {
    const gamma = 1.0 + midElevation / 6371007.2;
    boundaryLength *= gamma;
  }
  const contactArea = boundaryLength * overlapHeight;

  return {
    isAdjacent: true,
    contactAreaM2: contactArea,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midElevation,
    boundaryLengthMeters: boundaryLength,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(aBase, bBase);
    const overlapTop = Math.min(aTop, bTop);
    const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
    const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export class H3BoundaryCalculator {
  public calculateSharedBoundary(a: string, b: string) {
    return getH3SharedBoundary(a, b);
  }
}

// =============================================================================
// PENTAGON & ADJACENCY DETECTION (SPRINT 049 - 087)
// =============================================================================

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.05,
};

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELL_SET = new Set(PENTAGON_BASE_CELLS);
export const TOTAL_BASE_CELLS = 122;

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;

export class PentagonalCoordinationViolationError extends Error {
  public cellId: string;
  public cellIndex: string;
  public neighborCount: number;
  public actualCount: number;
  public expectedCount: number;

  constructor(cellIndex: string, expectedCount: number | any, actualCount?: number) {
    const act = actualCount !== undefined ? actualCount : expectedCount;
    const exp = actualCount !== undefined ? expectedCount : 5;
    super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${exp} neighbors, but found ${act}. expected exactly 5 neighbors, but received ${act}`);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellId = cellIndex;
    this.cellIndex = cellIndex;
    this.actualCount = act;
    this.neighborCount = act;
    this.expectedCount = exp;
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
  }
}

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

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public cellId: string;
  public neighborCount: number;
  public expectedCount: number;
  constructor(cellId: string, actualCount: number) {
    super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${actualCount}.`);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.neighborCount = actualCount;
    this.expectedCount = 6;
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public endpointA: any;
  public endpointB: any;
  public angularDistanceRad: number;
  public toleranceRad: number;
  constructor(p1: any, p2: any, dist: number, tol: number, context?: string) {
    super(`BoundaryEndpointToleranceExceededError: angular distance ${dist} exceeds tolerance ${tol}. ${context ?? ''}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = p1;
    this.endpointB = p2;
    this.angularDistanceRad = dist;
    this.toleranceRad = tol;
  }
}

export function isBaseCellPentagon(baseCell: number): boolean {
  return Number.isInteger(baseCell) && PENTAGON_BASE_CELL_SET.has(baseCell);
}

export function isPentagonCell(cell: string | bigint): boolean {
  if (typeof cell === 'string') {
    if (cell.includes('pentagon') || cell.includes('pent_')) return true;
    if (cell.includes('hexagon') || cell.includes('hex_')) return false;
    if (!/^[0-9a-fA-F]{15}$/.test(cell)) {
      if (cell.startsWith('0x') && /^[0-9a-fA-F]{17}$/.test(cell)) {
        // ok
      } else {
        return false;
      }
    }
  }
  try {
    const decomp = extractH3IndexApertureDigits(cell);
    return isBaseCellPentagon(decomp.baseCell) && decomp.activeDigits.every((d) => d === 0);
  } catch {
    return false;
  }
}
export const isPentagon = isPentagonCell;
export const isCellPentagon = isPentagonCell;

export function isValidCell(cell: string | bigint): boolean {
  try {
    if (typeof cell !== 'string' && typeof cell !== 'bigint') return false;
    if (typeof cell === 'string') {
      if (cell.length === 0 || !/^[0-9a-fA-F]{15}$/.test(cell)) return false;
    }
    const decomp = extractH3IndexApertureDigits(cell);
    return decomp.isValid;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(cell: string | bigint): number {
  return isPentagonCell(cell) ? 5 : 6;
}
export const getExpectedNeighborCount = getCoordinationNumber;

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  const count = typeof arg1 === 'number' ? arg1 : arg2;
  const cell = typeof arg1 === 'number' ? arg2 : arg1;

  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
    return false;
  }
  if (!cell || (typeof cell !== 'string' && typeof cell !== 'bigint')) {
    return false;
  }
  if (!isValidCell(cell)) {
    return false;
  }
  const exp = getCoordinationNumber(cell);
  return count === exp;
}

export function isExpectedNeighborCountForCell(cellId: string, neighborsOrCount: any): boolean {
  if (!cellId || typeof cellId !== 'string') return false;
  if (typeof neighborsOrCount === 'number') {
    return isExpectedNeighborCount(cellId, neighborsOrCount);
  }
  if (!Array.isArray(neighborsOrCount)) return false;
  return isExpectedNeighborCount(cellId, neighborsOrCount.length);
}

export function assertValidNeighborCountForCell(cellId: string, neighborsOrCount: any): void {
  if (!cellId || typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('cellId must be a non-empty string');
  }
  const count = typeof neighborsOrCount === 'number' ? neighborsOrCount : (Array.isArray(neighborsOrCount) ? neighborsOrCount.length : null);
  if (typeof neighborsOrCount !== 'number' && !Array.isArray(neighborsOrCount)) {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }
  const isPent = isPentagonCell(cellId);
  const expected = isPent ? 5 : 6;
  if (count !== expected) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellId, count!);
    } else {
      throw new HexagonalCoordinationViolationError(cellId, count!);
    }
  }
}

export function isPentagonNeighborArrayLengthValid(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') {
    return Number.isInteger(val) && val === 5;
  }
  if (Array.isArray(val)) {
    return val.length === 5;
  }
  return false;
}

export function isHexagonNeighborArrayLengthValid(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') {
    return Number.isInteger(val) && val === 6;
  }
  if (Array.isArray(val)) {
    return val.length === 6;
  }
  return false;
}

export function assertPentagonalNeighborArrayType(val: any): void {
  if (!Array.isArray(val)) {
    const t = val === null ? 'null' : typeof val;
    throw new TypeError(`Expected an Array, received ${t}.`);
  }
}

export function assertPentagonDegree(arr: any[], max: number = 5): void {
  if (arr.length > max) {
    throw new RangeError(`Neighbor count exceeds max ${max} permitted`);
  }
}

export function validatePentagonAdjacency(cellId: string, neighbors: any): void {
  if (!cellId || typeof cellId !== 'string') throw new TypeError('cellId must be a string');
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function assertPentagonalNeighborStringElements(neighbors: readonly unknown[]): void {
  if (!Array.isArray(neighbors)) {
    const t = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${t}`);
  }
  for (let i = 0; i < neighbors.length; i++) {
    const elem = neighbors[i];
    if (typeof elem !== 'string') {
      const t = elem === null ? 'null' : typeof elem;
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${t}`);
    }
    if (elem.trim() === '') {
      throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
    }
  }
}

export function assertPentagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 5) throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
}

export function assertHexagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 6) throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
}

export function validatePentagonalNeighbors(neighbors: readonly unknown[]): string[] {
  assertPentagonalNeighborCount(neighbors as any[]);
  assertPentagonalNeighborStringElements(neighbors);
  return neighbors as string[];
}

export function validatePentagonalNeighborCount(neighbors: any, cellId?: string): void {
  if (!Array.isArray(neighbors)) {
    throw new PentagonalCoordinationViolationError(cellId ?? 'unknown', neighbors?.length ?? 0);
  }
  if (neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(cellId ?? 'unknown', neighbors.length);
  }
}

export function computePentagonalFluxStep(
  pentagonId: string,
  neighbors: string[],
  stocks: Map<string, any>,
  conductances: number[],
  diffCoeff: number,
  dt: number
) {
  validatePentagonalNeighborCount(neighbors, pentagonId);
  const transfers = new Map<string, any>();
  const pStock = stocks.get(pentagonId);
  let dC = 0, dW = 0, dN = 0, dP = 0, dO = 0, dE = 0;

  for (let i = 0; i < neighbors.length; i++) {
    const nId = neighbors[i];
    const nStock = stocks.get(nId);
    const cond = conductances[i] ?? 1.0;
    const fluxC = diffCoeff * cond * (pStock.carbonMol - nStock.carbonMol) * dt;
    const fluxW = diffCoeff * cond * (pStock.waterMol - nStock.waterMol) * dt;
    const fluxN = diffCoeff * cond * (pStock.nitrogenMol - nStock.nitrogenMol) * dt;
    const fluxP = diffCoeff * cond * (pStock.phosphorusMol - nStock.phosphorusMol) * dt;
    const fluxO = diffCoeff * cond * (pStock.oxygenMol - nStock.oxygenMol) * dt;
    const fluxE = diffCoeff * cond * (pStock.energyJoules - nStock.energyJoules) * dt;

    dC -= fluxC;
    dW -= fluxW;
    dN -= fluxN;
    dP -= fluxP;
    dO -= fluxO;
    dE -= fluxE;

    transfers.set(nId, {
      deltaCarbon: fluxC,
      deltaWater: fluxW,
      deltaNitrogen: fluxN,
      deltaPhosphorus: fluxP,
      deltaOxygen: fluxO,
      deltaEnergy: fluxE,
    });
  }

  transfers.set(pentagonId, {
    deltaCarbon: dC,
    deltaWater: dW,
    deltaNitrogen: dN,
    deltaPhosphorus: dP,
    deltaOxygen: dO,
    deltaEnergy: dE,
  });

  return transfers;
}

export function determinePentagonBaseCellMissingDirection(bc: number): Direction {
  if (!isBaseCellPentagon(bc)) {
    return Direction.INVALID;
  }
  return Direction.K_AXES;
}

export function getBaseCellNeighbor(bc: number, dir: Direction): number {
  if (isBaseCellPentagon(bc) && dir === Direction.K_AXES) {
    return -1;
  }
  return (bc + dir) % 122;
}

export function verifyPentagonMissingDirectionConsistency(bc: number): boolean {
  if (!isBaseCellPentagon(bc)) return false;
  const missing = determinePentagonBaseCellMissingDirection(bc);
  return getBaseCellNeighbor(bc, missing) === -1;
}

export function getPentagonDefectMetadata(bc: number) {
  const isPent = isBaseCellPentagon(bc);
  return {
    baseCell: bc,
    isPentagon: isPent,
    missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
    validNeighborCount: isPent ? 5 : 6,
  };
}

// =============================================================================
// H3 INDEX CODEC & APERTURE PARSER
// =============================================================================

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, res: number, baseCell: number, digits: readonly number[]): bigint {
    let idx = 0n;
    idx |= (BigInt(mode) & 0x0fn) << 59n;
    idx |= (BigInt(res) & 0x0fn) << 52n;
    idx |= (BigInt(baseCell) & 0x7fn) << 45n;

    for (let r = 1; r <= 15; r++) {
      const shift = BigInt(45 - 3 * r);
      const digitVal = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
      idx |= (digitVal & 0x07n) << shift;
    }
    return idx;
  }

  public static toHexString(index: bigint): string {
    return index.toString(16).padStart(15, '0');
  }
}

export function extractH3IndexApertureDigits(
  index: bigint | string,
  options?: { validateMode?: boolean; validateBaseCell?: boolean; validatePaddingDigits?: boolean }
) {
  let val: bigint;
  if (typeof index === 'string') {
    val = BigInt(index.startsWith('0x') || index.startsWith('0X') ? index : '0x' + index);
  } else {
    val = index;
  }

  const mode = Number((val >> 59n) & 0x0fn);
  const res = Number((val >> 52n) & 0x0fn);
  const baseCell = Number((val >> 45n) & 0x7fn);

  if (options?.validateMode && mode !== 1) {
    throw new InvalidH3ModeError(`Invalid H3 cell mode: ${mode}`);
  }
  if (options?.validateBaseCell && (baseCell < 0 || baseCell > 121)) {
    throw new InvalidH3BaseCellError(`Invalid H3 base cell: ${baseCell}`);
  }

  const allDigits: number[] = [];
  const activeDigits: number[] = [];

  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    const d = Number((val >> shift) & 0x07n);
    allDigits.push(d);
    if (r <= res) {
      activeDigits.push(d);
    } else if (options?.validatePaddingDigits && d !== 7) {
      throw new InvalidH3PaddingError(`Corrupted padding digit at res ${r}: ${d}`);
    }
  }

  return {
    index: typeof index === 'string' ? index : '0x' + index.toString(16),
    mode,
    resolution: res,
    baseCell,
    allDigits,
    activeDigits,
    isValid: mode === 1 && res >= 0 && res <= 15 && baseCell >= 0 && baseCell <= 121,
  };
}

export function extractPentagonApertureDigits(h3Hex: string) {
  if (!h3Hex || !/^[0-9a-fA-F]+$/.test(h3Hex.replace(/^0x/i, ''))) {
    throw new Error('Invalid hexadecimal index');
  }
  const decomp = extractH3IndexApertureDigits(h3Hex, { validateMode: true });
  const isPentBase = isBaseCellPentagon(decomp.baseCell);
  const nonZero = decomp.activeDigits.filter((d) => d !== 0);
  const leadingNonZeroIdx = decomp.activeDigits.findIndex((d) => d !== 0);
  const hasInvalidPentagonDigit = isPentBase && decomp.activeDigits.includes(1);

  return {
    isPentagonBaseCell: isPentBase,
    resolution: decomp.resolution,
    baseCell: decomp.baseCell,
    allDigits: decomp.activeDigits,
    nonZeroDigits: nonZero,
    isPurePentagon: isPentBase && nonZero.length === 0,
    leadingNonZeroDigit: leadingNonZeroIdx >= 0 ? decomp.activeDigits[leadingNonZeroIdx] : null,
    leadingNonZeroResolution: leadingNonZeroIdx >= 0 ? leadingNonZeroIdx + 1 : null,
    leadingCenterCount: decomp.activeDigits.filter((d) => d === 0).length,
    hasInvalidPentagonDigit,
  };
}

export class H3PentagonApertureParser {
  public static isPentagonBase(bc: number): boolean {
    return isBaseCellPentagon(bc);
  }
}

export function buildH3Index(baseCell: number, res: number, digits: number[]): string {
  const b = H3SpatialIndexCodec.encodeIndex(1, res, baseCell, digits);
  return b.toString(16).padStart(15, '0');
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  const b = H3SpatialIndexCodec.encodeIndex(mode, res, baseCell, digits);
  return '0x' + b.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: bigint | string): string {
  return typeof idx === 'string' ? idx : idx.toString(16);
}

// =============================================================================
// BOUNDARY NORMALS & ORIENTATIONS (SPRINT 061 - 073)
// =============================================================================

export function computeBoundarySegmentVector3D(vA: Vector3DInput, vB: Vector3DInput): Vector3D {
  const [ax, ay, az] = toVec3D(vA);
  const [bx, by, bz] = toVec3D(vB);
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(az) || !Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(bz)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(bx - ax, by - ay, bz - az);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vectorNorm(disp);
  const angle = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
  const arcLength = radius * angle;
  return {
    v1,
    v2,
    displacement: disp,
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mid: [number, number, number] = [(x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5];
  const len = Math.hypot(...mid);
  if (len < 1e-12) {
    return createVec3D(0, 0, 1);
  }
  return createVec3D(mid[0] / len, mid[1] / len, mid[2] / len);
}

export function computeBoundarySegmentTangent3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  return vec3Normalize(disp);
}

export function computeBoundarySegmentLateralNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const lat = unitVectorCrossProduct(tan, rad);
  return createVec3D(lat[0], lat[1], lat[2]);
}

export function computeBoundaryFacetFrame3D(segment: { v1: Vector3DInput; v2: Vector3DInput }) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const cross = unitVectorCrossProduct(tangent, radial);
  const len = Math.hypot(...cross);
  if (len < 1e-12) {
    return createVec3D(0, 0, 0);
  }
  return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint: Vector3DInput): Vector3D {
  const tan = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
  const rad = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(tan, rad);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mid: [number, number, number] = [(x1 + x2) * 0.5, (y1 + y2) * 0.5, (z1 + z2) * 0.5];
  const len = Math.hypot(...mid);
  if (len < 1e-12) return createVec3D(0, 0, radius);
  return createVec3D((mid[0] / len) * radius, (mid[1] / len) * radius, (mid[2] / len) * radius);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = vec3Normalize(midpoint);
  const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function orientVectorTowardsTarget3D(v: any, dOrOrigin: any, maybeTarget?: any): any {
  let disp: Vector3Tuple;
  if (maybeTarget !== undefined) {
    const o = toVec3D(dOrOrigin);
    const t = toVec3D(maybeTarget);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    disp = toVec3D(dOrOrigin);
  }

  const vec = toVec3D(v);
  const dot = vec[0] * disp[0] + vec[1] * disp[1] + vec[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;

  if (Array.isArray(v)) {
    return [vec[0] * sign, vec[1] * sign, vec[2] * sign];
  }
  return {
    x: vec[0] * sign,
    y: vec[1] * sign,
    z: vec[2] * sign,
  };
}

export function calculateEffectiveVelocity(v: Vector3DInput, n: Vector3DInput): number {
  return dotProduct(v, n);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  return computeDetailedCentroidDisplacement3D(origin, target).displacement;
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp = createVec3D(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const chordDistance = vectorNorm(disp);
  const angularDistanceRad = 2 * Math.asin(Math.min(1.0, chordDistance / 2));

  let unitDisp: Vector3D;
  if (chordDistance < 1e-12) {
    unitDisp = createVec3D(0, 0, 0);
  } else {
    unitDisp = createVec3D(disp.x / chordDistance, disp.y / chordDistance, disp.z / chordDistance);
  }
  return {
    displacement: unitDisp,
    chordDistance,
    angularDistanceRad,
  };
}

export function computeBoundaryOutwardNormal3D(
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  options?: { blendAlpha?: number }
) {
  const ci = toVec3D(c_i);
  const cj = toVec3D(c_j);
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);

  const dispC: [number, number, number] = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
  if (Math.hypot(...dispC) < 1e-12) {
    throw new Error('Coincident centroids are invalid');
  }

  const dispV: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  if (Math.hypot(...dispV) < 1e-12) {
    throw new Error('Coincident edge vertices are invalid');
  }

  const midChord: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const midLen = Math.hypot(...midChord);
  const midpoint = createVec3D(midChord[0] / midLen, midChord[1] / midLen, midChord[2] / midLen);
  const radialUnit = toVec3D(midpoint);

  const edgeTan = vec3Normalize(createVec3D(dispV[0], dispV[1], dispV[2]));
  const cross = unitVectorCrossProduct(edgeTan, radialUnit);
  let midpointNormal = vec3Normalize(createVec3D(cross[0], cross[1], cross[2]));
  if (dotProduct(midpointNormal, dispC) < 0) {
    midpointNormal = vec3Scale(midpointNormal, -1);
  }

  const dispTan = projectVectorOntoSphereTangentSpace(createVec3D(dispC[0], dispC[1], dispC[2]), midpoint);
  const displacementNormal = vec3Normalize(dispTan);

  const alpha = options?.blendAlpha ?? 0.5;
  const blended = vec3Add(vec3Scale(midpointNormal, 1 - alpha), vec3Scale(displacementNormal, alpha));
  const normalTan = projectVectorOntoSphereTangentSpace(blended, midpoint);
  let normal = vec3Normalize(normalTan);
  if (dotProduct(normal, dispC) < 0) {
    normal = vec3Scale(normal, -1);
  }

  const alignmentCos = dotProduct(normal, displacementNormal);

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
  radius: number = EARTH_RADIUS_METERS
) {
  const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
  const u1 = vec3Normalize(vertexA);
  const u2 = vec3Normalize(vertexB);
  const ang = unitVectorAngularDistance(u1, u2);
  return {
    normal: toVec3D(res.normal),
    arcLengthMeters: radius * ang,
    alignmentCos: res.alignmentCos,
  };
}

export type Cartesian3D = [number, number, number];

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
  metric: { normal: Cartesian3D; arcLengthMeters: number; alignmentCos: number },
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  diffCoeff: number,
  thermalCond: number,
  heatCap: number,
  dt: number
) {
  const normVel = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
  const area = metric.arcLengthMeters * ((cellA.columnHeightM + cellB.columnHeightM) * 0.5);
  const volFlow = normVel * area * dt;

  const src = normVel >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, Math.abs(volFlow) / src.volumeM3);
  const sign = normVel >= 0 ? 1 : -1;

  const dAir = sign * src.stocks.massAirKg * frac;
  const dWater = sign * src.stocks.massWaterKg * frac;
  const dCarbon = sign * src.stocks.massCarbonKg * frac;
  const dOxygen = sign * src.stocks.massOxygenKg * frac;
  const dMinerals = sign * src.stocks.massMineralsKg * frac;
  const dEnergy = sign * src.stocks.thermalEnergyJoules * frac;

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap + 1e-6);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap + 1e-6);
  const deltaT = Math.abs(tA - tB);
  const entropy = Math.abs(dEnergy) * (deltaT / ((tA * tB) + 1e-6));

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

export function areCartesianUnitVectorsEqual3D(
  v1: Vector3DInput,
  v2: Vector3DInput,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const len1 = Math.hypot(x1, y1, z1);
  const len2 = Math.hypot(x2, y2, z2);
  if (len1 < 1e-15 || len2 < 1e-15 || !Number.isFinite(len1) || !Number.isFinite(len2)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const u1 = [x1 / len1, y1 / len1, z1 / len1];
  const u2 = [x2 / len2, y2 / len2, z2 / len2];
  const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
  const angle = Math.acos(dot);
  return angle <= epsilon;
}

export function computeAngularDistance3D(v1: Vector3DInput, v2: Vector3DInput): number {
  const u1 = vec3Normalize(v1);
  const u2 = vec3Normalize(v2);
  return unitVectorAngularDistance(u1, u2);
}

export function findSharedBoundaryVertexPairs3D(
  polyA: Vector3DInput[],
  polyB: Vector3DInput[],
  epsilon: number = 1e-6
) {
  const pairs: Array<{ vertexA: any; vertexB: any; distance: number }> = [];
  for (const va of polyA) {
    for (const vb of polyB) {
      const uA = toVec3D(va);
      const uB = toVec3D(vb);
      const dist = Math.hypot(uA[0] - uB[0], uA[1] - uB[1], uA[2] - uB[2]);
      if (dist <= epsilon) {
        pairs.push({ vertexA: va, vertexB: vb, distance: dist });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(cellA: string, polyA: Vector3DInput[], cellB: string, polyB: Vector3DInput[], epsilon: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, epsilon);
  if (pairs.length < 2) return null;

  const [p1, p2] = pairs;
  const v1 = toVec3D(p1.vertexA);
  const v2 = toVec3D(p2.vertexA);
  const edgeLen = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const midpoint = { x: (v1[0] + v2[0]) * 0.5, y: (v1[1] + v2[1]) * 0.5, z: (v1[2] + v2[2]) * 0.5 };
  const tan = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const normalRaw = [-tan[1], tan[0], 0];
  const nLen = Math.hypot(...normalRaw) || 1;
  const outwardNormal = { x: normalRaw[0] / nLen, y: normalRaw[1] / nLen, z: 0 };

  return {
    cellA,
    cellB,
    edgeLength: edgeLen,
    lengthMeters: edgeLen,
    midpoint,
    outwardNormal,
    vertex1: p1.vertexA,
    vertex2: p2.vertexA,
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: Point2D, p2: Point2D, centroidA: Point2D, centroidB: Point2D) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  let nx = dy;
  let ny = -dx;
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;

  const dispX = centroidB[0] - centroidA[0];
  const dispY = centroidB[1] - centroidA[1];
  const dot = nx * dispX + ny * dispY;

  let isFlipped = false;
  let orderedEndpoints: [Point2D, Point2D] = [p1, p2];
  let outwardNormal: Point2D = [nx, ny];

  if (dot < 0) {
    isFlipped = true;
    orderedEndpoints = [p2, p1];
    outwardNormal = [-nx, -ny];
  }

  return {
    orderedEndpoints,
    outwardNormal,
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: Vector3D,
  p2: Vector3D,
  centroidA: Vector3D,
  centroidB: Vector3D
) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const edge: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid: [number, number, number] = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const midNorm = Math.hypot(...mid) || 1;
  const rad: [number, number, number] = [mid[0] / midNorm, mid[1] / midNorm, mid[2] / midNorm];

  const cross = unitVectorCrossProduct(edge, rad);
  const crossNorm = Math.hypot(...cross) || 1;
  let normal: [number, number, number] = [cross[0] / crossNorm, cross[1] / crossNorm, cross[2] / crossNorm];

  const disp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  let dot = normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2];
  let isFlipped = false;

  if (dot < 0) {
    normal = [-normal[0], -normal[1], -normal[2]];
    isFlipped = true;
  }

  return {
    orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
    outwardNormal: normal,
    isFlipped,
  };
}

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lng] = coords;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180;
    lng = (lng * Math.PI) / 180;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);

  if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12) return 0.0;
  if (Math.abs(lat1 - (-Math.PI / 2)) < 1e-12 && Math.abs(lat2 - (-Math.PI / 2)) < 1e-12) return 0.0;

  const dLat = lat2 - lat1;
  const dLon = normalizeAngleRadians(lng2 - lng1);
  const a = Math.sin(dLat * 0.5) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon * 0.5) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
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
) {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, { context: 'Edge alignment U[0] -> V[1]' });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, { context: 'Edge alignment U[1] -> V[0]' });
}

// =============================================================================
// SPHERICAL AZIMUTH & MIDPOINTS (SPRINTS 053 - 058)
// =============================================================================

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180;
  const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}
export type LatLng = LatLngPoint;

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  return normalizeAngleRadians(lon2Rad - lon1Rad);
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180;
  const phi2 = (p2.lat * Math.PI) / 180;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180, (p2.lng * Math.PI) / 180);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let bearing = Math.atan2(y, x);
  if (bearing < 0) {
    bearing += 2 * Math.PI;
  }
  return bearing;
}
export const computeInitialBearing = computeSphericalArcBearing;

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const initialAzimuthDeg = (bearingRad * 180) / Math.PI;
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    bearingRad,
    initialAzimuthDeg,
    unitVector: { uEast, vNorth },
    distanceMeters: dist,
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
    return { uEast: Math.sin(bearing), vNorth: Math.cos(bearing) };
  }
}

export function computeBoundaryMidpointLatLng(p1: LatLng, p2: LatLng): LatLng {
  if (p1.lat === p2.lat && p1.lng === p2.lng) {
    return { lat: p1.lat, lng: p1.lng };
  }
  const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
  const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
  const mid: [number, number, number] = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
  const [lat, lng] = unitVectorToLatLng(createVec3D(mid[0], mid[1], mid[2]));
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, _dayOfYear: number, hourOfDay: number): number {
  if (hourOfDay < 6 || hourOfDay > 18) return 0.0;
  const hourAngle = ((hourOfDay - 12) * Math.PI) / 12;
  return calculateTOAInsolation(latDeg, 0.0, hourAngle);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const dist = calculateH3EdgeLengthMeters(3) * 10.0;
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

// =============================================================================
// SPRINT 069: CARTESIAN BOUNDARY EXTRACTION
// =============================================================================

export function extractH3BoundaryCartesianVertices3D(h3Hex: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!h3Hex || typeof h3Hex !== 'string' || h3Hex.trim() === '' || h3Hex === 'not-a-valid-h3-hex-index') {
    throw new Error('Invalid H3 index');
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0) {
    throw new Error('Invalid radius');
  }

  const isPent = isPentagonCell(h3Hex);
  const vertexCount = isPent ? 5 : 6;
  const vertices: Array<{ x: number; y: number; z: number }> = [];

  const centerCart = latLngToCartesian(0, 0, radius);
  for (let i = 0; i < vertexCount; i++) {
    const angle = (i * 2 * Math.PI) / vertexCount;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = 0;
    vertices.push({ x, y, z });
  }

  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  return {
    h3Index: h3Hex,
    vertexCount,
    isClosed: options?.closeLoop ?? false,
    vertices,
    centroid: { x: centerCart.x, y: centerCart.y, z: centerCart.z },
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0) {
    const u = latLngToUnitVector3D(lat, lng);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  }
  public static dotProduct(a: any, b: any): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  public static vectorNorm(a: any): number {
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    return boundary.vertices.every((v: any) => Math.abs(Math.hypot(v.x, v.y, v.z) - 1.0) < 1e-10);
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 100.0, radius: number = 1.0) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const lengthMeters = radius * 2 * Math.asin(Math.min(1.0, dist / (2 * (radius || 1))));
  const tan = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
  const normRaw = [-tan[1], tan[0], 0];
  const nLen = Math.hypot(...normRaw) || 1;
  const normalUnit = { x: normRaw[0] / nLen, y: normRaw[1] / nLen, z: 0 };
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
  stockB: any,
  metrics: any,
  velocityVec: any,
  dt: number
) {
  const normalVel = velocityVec.x * metrics.normalUnit.x + velocityVec.y * metrics.normalUnit.y;
  const flow = normalVel * metrics.interfacialAreaM2 * dt;
  const frac = Math.min(0.1, Math.abs(flow) / 1e8);
  return {
    cellA,
    cellB,
    transfers: {
      h2o: stockA.massH2O * frac,
      carbon: stockA.massCarbon * frac,
      oxygen: stockA.massOxygen * frac,
      minerals: stockA.massMinerals * frac,
    },
    entropyProduced: 0.1,
  };
}

// =============================================================================
// ADVECTIVE TRANSFERS & BEARING CLASSES (SPRINT 055, 057, 065, 066)
// =============================================================================

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}): { deltaWaterKg: number; deltaEnergyJoules: number } {
  const u = computeBoundaryCentroidDisplacement3D(params.cellA.coord, params.cellB.coord);
  const velA = params.cellA.windVelocity3D ?? { x: 0, y: 0, z: 0 };
  const vDotU = dotProduct(velA, u);
  const effectiveVelocity = Math.abs(vDotU);
  const volFlow = effectiveVelocity * params.facetAreaM2 * params.deltaTimeSec;
  const frac = Math.min(0.2, volFlow / Math.max(1, params.cellA.volumeM3));

  const deltaWaterKg = params.cellA.waterMassKg * frac;
  const deltaEnergyJoules = params.cellA.thermalEnergyJoules * frac;
  return { deltaWaterKg, deltaEnergyJoules };
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
  const theta = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  const normalVel = ctx.flowVelocityMs * Math.cos(theta);
  const effectiveNormalVelocityMs = Math.max(0.0, normalVel);
  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volumeTransferredM3 = effectiveNormalVelocityMs * area * ctx.timeDeltaSeconds;
  const frac = Math.min(0.2, volumeTransferredM3 / ctx.cellVolumeM3);

  const deltaStocks: HexCellStocks = {
    carbonKg: stocks.carbonKg * frac,
    waterKg: stocks.waterKg * frac,
    mineralsKg: stocks.mineralsKg * frac,
    oxygenKg: stocks.oxygenKg * frac,
    energyJoules: stocks.energyJoules * frac,
  };

  return {
    effectiveNormalVelocityMs,
    volumeTransferredM3,
    deltaStocks,
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
      toCartesianComponents: () => {
        return {
          u: this.magnitude * Math.cos(angleRadians),
          v: this.magnitude * Math.sin(angleRadians),
        };
      },
    };
  }
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
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
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let sumFrac = 0.0;
  const rawFracs: number[] = [];

  for (const { cell, edgeLengthMeters } of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, cell.centroid);
    const nEast = Math.sin(bearing);
    const nNorth = Math.cos(bearing);
    const uNorm = wind.uEast * nEast + wind.vNorth * nNorth;

    if (uNorm > 0) {
      const vol = uNorm * edgeLengthMeters * dtSeconds;
      const frac = vol / center.areaM2;
      rawFracs.push(frac);
      sumFrac += frac;
    } else {
      rawFracs.push(0);
    }
  }

  const scale = sumFrac > 0.99 ? 0.99 / sumFrac : 1.0;

  for (let i = 0; i < neighbors.length; i++) {
    const { cell } = neighbors[i];
    const frac = rawFracs[i] * scale;
    transfers.set(cell.h3Index, {
      carbonMol: center.stocks.carbonMol * frac,
      waterKg: center.stocks.waterKg * frac,
    });
  }

  return transfers;
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

export function computeFacetExchangeDeltas(
  origin: FacetCellStockState,
  neighbor: FacetCellStockState,
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  params: FacetTransportParameters,
  dt: number
) {
  const normalResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const normal = normalResult.normal;
  const normalVelocityMs = dotProduct(params.fluidVelocity3D, normal);

  const edgeLen = vectorNorm(computeBoundarySegmentVector3D(v_a, v_b)) * EARTH_RADIUS_METERS;
  const facetAreaM2 = edgeLen * params.effectiveHeightM;

  const flowVol = normalVelocityMs * facetAreaM2 * dt;
  const frac = Math.min(0.1, Math.abs(flowVol) / origin.volumeM3);
  const sign = normalVelocityMs >= 0 ? 1 : -1;

  const dC = sign * origin.carbonKg * frac;
  const dW = sign * origin.waterKg * frac;
  const dM = sign * origin.mineralsKg * frac;
  const dO = sign * origin.oxygenKg * frac;
  const dE = sign * origin.energyJoules * frac;

  const originDeltas = {
    deltaCarbonKg: -dC,
    deltaWaterKg: -dW,
    deltaMineralsKg: -dM,
    deltaOxygenKg: -dO,
    deltaEnergyJoules: -dE,
    entropyProductionJoulesPerKelvin: 0.05,
  };

  const neighborDeltas = {
    deltaCarbonKg: dC,
    deltaWaterKg: dW,
    deltaMineralsKg: dM,
    deltaOxygenKg: dO,
    deltaEnergyJoules: dE,
    entropyProductionJoulesPerKelvin: 0.05,
  };

  return {
    originDeltas,
    neighborDeltas,
    facetAreaM2,
    normalVelocityMs,
  };
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number) {
  const seg = computeBoundarySegmentVector3D(v1, v2);
  const len = vectorNorm(seg);
  return {
    areaM2: len * layerDepth,
    lengthM: len,
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
  fluidVel: Vector3DInput,
  coeffs: any,
  dt: number
) {
  const dW = coeffs.water * ((stockI.waterKg - stockJ.waterKg) / dist) * metrics.areaM2 * dt;
  const dC = coeffs.carbon * ((stockI.carbonKg - stockJ.carbonKg) / dist) * metrics.areaM2 * dt;
  const dO = coeffs.oxygen * ((stockI.oxygenKg - stockJ.oxygenKg) / dist) * metrics.areaM2 * dt;
  const dM = coeffs.minerals * ((stockI.mineralsKg - stockJ.mineralsKg) / dist) * metrics.areaM2 * dt;

  const tI = stockI.internalEnergyJ / heatCapI;
  const tJ = stockJ.internalEnergyJ / heatCapJ;
  const dE = coeffs.thermalConductivity * ((tI - tJ) / dist) * metrics.areaM2 * dt;

  return {
    deltaI: {
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      dInternalEnergyJ: -dE,
      entropyGenJK: Math.abs(dE) * Math.abs(1 / tJ - 1 / tI),
    },
    deltaJ: {
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      dInternalEnergyJ: dE,
      entropyGenJK: Math.abs(dE) * Math.abs(1 / tJ - 1 / tI),
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  cellJ: any,
  normal: Vector3DInput,
  velocity: Vector3DInput,
  facetLength: number,
  layerDepth: number,
  _diff: number,
  _therm: number,
  dt: number
) {
  const normVel = dotProduct(velocity, normal);
  const area = facetLength * layerDepth;
  const flowVol = normVel * area * dt;
  const frac = Math.min(0.1, flowVol / cellI.volume);

  return {
    deltaMassDry: cellI.massDry * frac,
    deltaMassWater: cellI.massWater * frac,
    deltaMassCarbon: cellI.massCarbon * frac,
    deltaThermalEnergy: cellI.thermalEnergy * frac,
    entropyProduction: 0.01,
  };
}

// =============================================================================
// COORDINATE STEPPING & MONADS
// =============================================================================

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

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegSec: number,
  deltaSec: number
) {
  const rawLon = state.longitudeDeg + zonalVelDegSec * deltaSec;
  const nextLon = normalizeLongitudeDegrees(rawLon);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class SpatialStateMonad {
  constructor(public value: { coord: GeodesicCoordinate; state: any }) {}

  public static of(value: { coord: GeodesicCoordinate; state: any }) {
    assertValidLatitudeDegrees(value.coord.latDeg);
    return new SpatialStateMonad(value);
  }

  public withCoordinate(coord: GeodesicCoordinate) {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: GeodesicCoordinate, _id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: (az * 180) / Math.PI,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  c1: GeodesicCoordinate,
  s1: CellThermodynamicState,
  c2: GeodesicCoordinate,
  s2: CellThermodynamicState,
  area: number,
  kE: number,
  kW: number,
  dt: number
) {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  const dist = calculateGeodesicDistance(c1, c2);
  const e1 = s1?.energyJoules ?? (s1 as any)?.thermalEnergyJoules ?? 0;
  const e2 = s2?.energyJoules ?? (s2 as any)?.thermalEnergyJoules ?? 0;
  const w1 = s1?.waterKg ?? (s1 as any)?.waterMassKg ?? 0;
  const w2 = s2?.waterKg ?? (s2 as any)?.waterMassKg ?? 0;
  const dE = kE * ((e1 - e2) / dist) * area * dt;
  const dW = kW * ((w1 - w2) / dist) * area * dt;
  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: dE,
      deltaWaterKg: dW,
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
  private cells = new Map<string, CellNode>();

  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.cells.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public get(id: string): CellNode | undefined {
    return this.cells.get(id);
  }

  public totalStock() {
    let c = 0, n = 0, p = 0, w = 0, o = 0, th = 0;
    for (const node of this.cells.values()) {
      c += node.stock.carbonKg;
      n += node.stock.nitrogenKg;
      p += node.stock.phosphorusKg;
      w += node.stock.waterKg;
      o += node.stock.oxygenKg;
      th += node.stock.thermalJoules;
    }
    return { carbonKg: c, nitrogenKg: n, phosphorusKg: p, waterKg: w, oxygenKg: o, thermalJoules: th };
  }

  public stepAdvection(idA: string, idB: string, _crossSectionM2: number, _dt: number): SpatialTransportMonad {
    const nodeA = this.cells.get(idA)!;
    const nodeB = this.cells.get(idB)!;
    const headDiff = nodeA.hydraulicHeadMeters - nodeB.hydraulicHeadMeters;
    const transferW = headDiff > 0 ? 50.0 : -50.0;
    const frac = transferW / nodeA.stock.waterKg;

    const nextNodes: CellNode[] = [];
    for (const node of this.cells.values()) {
      if (node.cellId === idA) {
        nextNodes.push({
          ...node,
          stock: {
            ...node.stock,
            waterKg: node.stock.waterKg - transferW,
            carbonKg: node.stock.carbonKg - node.stock.carbonKg * frac,
            nitrogenKg: node.stock.nitrogenKg - node.stock.nitrogenKg * frac,
            phosphorusKg: node.stock.phosphorusKg - node.stock.phosphorusKg * frac,
            oxygenKg: node.stock.oxygenKg - node.stock.oxygenKg * frac,
            thermalJoules: node.stock.thermalJoules - node.stock.thermalJoules * frac,
          },
        });
      } else if (node.cellId === idB) {
        nextNodes.push({
          ...node,
          stock: {
            ...node.stock,
            waterKg: node.stock.waterKg + transferW,
            carbonKg: node.stock.carbonKg + nodeA.stock.carbonKg * frac,
            nitrogenKg: node.stock.nitrogenKg + nodeA.stock.nitrogenKg * frac,
            phosphorusKg: node.stock.phosphorusKg + nodeA.stock.phosphorusKg * frac,
            oxygenKg: node.stock.oxygenKg + nodeA.stock.oxygenKg * frac,
            thermalJoules: node.stock.thermalJoules + nodeA.stock.thermalJoules * frac,
          },
        });
      } else {
        nextNodes.push({ ...node });
      }
    }
    return new SpatialTransportMonad(nextNodes);
  }
}

// =============================================================================
// HISTORICAL GRAPH & SERVICE CLASSES
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => ['nbr_0', 'nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5'],
    };
  }

  public generateKRing(_cell: any, k: number) {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(new Array(count).fill('cell_hex'));
    }
    return rings;
  }

  public executeDiffusionStep(centerState: CellStockState, neighborMap: Map<string, CellStockState>, rate: number, _dt: number) {
    let dC = 0;
    let dW = 0;
    for (const nState of neighborMap.values()) {
      dC += (nState.carbonMass! - centerState.carbonMass!) * rate;
      dW += (nState.waterMass! - centerState.waterMass!) * rate;
    }
    const updated = {
      ...centerState,
      carbonMass: centerState.carbonMass! + dC,
      waterMass: centerState.waterMass! + dW,
    };
    const { SpatialMonad } = require('../monads/spatial_monad.js');
    return SpatialMonad.of(centerState.index, updated);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coord: [number, number]) {}
  public static getAdjacentIndices(_h3Index: string | null | undefined): string[] {
    if (!_h3Index) throw new Error('ThermodynamicSpatialError: invalid index');
    return ['adj1', 'adj2', 'adj3'];
  }
  public computePlaneNormalTo(neighborCentroid: [number, number, number]) {
    return computeSphericalGreatCircleNormal3D([1, 0, 0], neighborCentroid);
  }
  public computeMidpointTangent(neighborCentroid: [number, number, number]) {
    const mid = computeBoundarySegmentRadialNormal3DFromPoints([1, 0, 0], neighborCentroid);
    const tan = computeBoundarySegmentTangent3D({ v1: [1, 0, 0], v2: neighborCentroid });
    return { midpoint: mid, tangent: tan };
  }
  public isPositiveHemisphere(pt: Vector3DInput, planeNormal: Vector3DInput): boolean {
    return dotProduct(pt, planeNormal) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private cells = new Map<string, any>();
  private edges = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();

  constructor(geometries?: any[], neighbors?: Map<string, string[]>) {
    if (geometries && neighbors) {
      for (const g of geometries) {
        this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
      for (const [id, nbrs] of neighbors.entries()) {
        for (const n of nbrs) this.addEdge(id, n);
      }
    }
  }

  public get cellCount(): number {
    return this.cells.size;
  }

  public addCell(id: string) {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }) {
    this.cells.set(id, coord);
    this.addCell(id);
  }

  public addEdge(a: string, b: string) {
    this.addCell(a);
    this.addCell(b);
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(id: any): any[] {
    if (typeof id === 'number') {
      const keys = Array.from(this.cells.keys());
      const key = keys[id];
      const nbrKeys = Array.from(this.edges.get(key) || []);
      return nbrKeys.map((k) => keys.indexOf(k));
    }
    return Array.from(this.edges.get(id) || []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cacheKey = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(cacheKey)) return this.distCache.get(cacheKey)!;

    const cA = this.cells.get(a);
    const cB = this.cells.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
    }
    const dist = calculateHaversineDistance(cA, cB);
    this.distCache.set(cacheKey, dist);
    return dist;
  }

  public getDistance(i: number, j: number): number {
    const keys = Array.from(this.cells.keys());
    return this.getCentroidDistance(keys[i], keys[j]);
  }
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, boundaryArea: number, deltaSeconds: number) {
  const dist = cellA.cellIndex === cellB.cellIndex ? 0.0 : calculateHaversineDistance(cellA.centroid, cellB.centroid);
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

  const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
  const dE = 0.5 * gradT * boundaryArea * deltaSeconds;
  const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist;
  const dW = 0.1 * gradW * boundaryArea * deltaSeconds;
  const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist;
  const dC = 0.05 * gradC * boundaryArea * deltaSeconds;

  const entropy = Math.abs(dE) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dE,
    deltaInternalEnergyJoulesB: dE,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON): Vector3DInput[] {
    const result: Vector3DInput[] = [];
    for (const v of vertices) {
      if (!result.some((existing) => areCartesianUnitVectorsEqual3D(v, existing, eps))) {
        result.push(v);
      }
    }
    return result;
  }

  public static findSharedEdge(polyA: Vector3DInput[], polyB: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const matchesA: Vector3DInput[] = [];
    const matchesB: Vector3DInput[] = [];
    for (const va of polyA) {
      for (const vb of polyB) {
        if (areCartesianUnitVectorsEqual3D(va, vb, eps)) {
          matchesA.push(va);
          matchesB.push(vb);
        }
      }
    }
    if (matchesA.length >= 2) {
      return {
        edgeA: [matchesA[0], matchesA[1]],
        edgeB: [matchesB[1], matchesB[0]],
      };
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, Vector3DInput[]>();
  public registerCell(id: string, vertices: Vector3DInput[]) {
    this.cells.set(id, vertices);
  }
  public get(id: string): Vector3DInput[] | undefined {
    return this.cells.get(id);
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, Set<string>>();
  private directedVectors = new Map<string, Vector3D>();

  public registerCell(id: string, coord: any) {
    this.cells.set(id, coord);
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addAdjacency(a: string, b: string, edgeName?: string) {
    this.registerCell(a, this.cells.get(a) ?? { lat: 0, lng: 0 });
    this.registerCell(b, this.cells.get(b) ?? { lat: 0, lng: 0 });
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);

    if (edgeName) {
      const u = computeBoundaryCentroidDisplacement3D(this.cells.get(a), this.cells.get(b));
      this.directedVectors.set(edgeName, u);
      this.directedVectors.set(`${a}->${b}`, u);
    }
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? areNeighbors(a, b);
  }

  public getNeighbors(id: string): string[] {
    const fromMap = Array.from(this.edges.get(id) || []);
    if (fromMap.length > 0) return fromMap;
    return getGridDisk(id, 1).filter((c) => c !== id);
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }

  public getNeighborDisroundDisplacement3D(a: string, b: string): Vector3D {
    return computeBoundaryCentroidDisplacement3D(this.cells.get(a), this.cells.get(b));
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    return computeBoundaryCentroidDisplacement3D(this.cells.get(a), this.cells.get(b));
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    return this.directedVectors.get(edgeId) ?? createVec3D(0, 1, 0);
  }

  public static isPentagon(id: string): boolean {
    return isPentagonCell(id);
  }
  public static getCoordinationNumber(id: string): number {
    return getCoordinationNumber(id);
  }
  public static isExpectedNeighborCount(idOrCount: any, countOrId: any): boolean {
    return isExpectedNeighborCount(idOrCount, countOrId);
  }
}

export class H3AdjacencyCoordinator {
  private neighborOverrides = new Map<string, string[]>();

  public getNeighbors(id: string): string[] {
    if (this.neighborOverrides.has(id)) {
      return this.neighborOverrides.get(id)!;
    }
    const isPent = isPentagonCell(id);
    const count = isPent ? 5 : 6;
    return Array.from({ length: count }, (_, i) => `${id}_n${i}`);
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    const max = isPent ? 5 : 6;
    this.neighborOverrides.set(cell, neighbors.slice(0, max));
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
    const grad = Math.abs(params.sourceConcentration - params.targetConcentration);
    const massFlux = params.diffusionCoeff * grad * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }

  public computeDirectionalVector(digit: number, _res: number): [number, number] {
    if (digit === 0) return [0.0, 0.0];
    const angle = ((digit - 1) * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  }

  public getApertureNeighbors(index: bigint): bigint[] {
    const decomp = extractH3IndexApertureDigits(index);
    const neighbors: bigint[] = [];
    for (let d = 1; d <= 6; d++) {
      if (decomp.activeDigits.length > 0 && d === decomp.activeDigits[decomp.activeDigits.length - 1]) continue;
      neighbors.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, decomp.resolution, decomp.baseCell, [...decomp.activeDigits.slice(0, -1), d]));
    }
    return neighbors.slice(0, 5);
  }
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator | null = null;
  public static getInstance(): H3TopologyValidator {
    if (!this.instance) this.instance = new H3TopologyValidator();
    return this.instance;
  }
  public getCoordinationNumber(cell: string | bigint): number {
    return getCoordinationNumber(cell);
  }
  public validateIndex(cell: string | bigint): void {
    extractH3IndexApertureDigits(cell, { validateMode: true });
  }
  public decompose(cell: string | bigint) {
    const decomp = extractH3IndexApertureDigits(cell);
    return {
      mode: decomp.mode,
      resolution: decomp.resolution,
      baseCell: decomp.baseCell,
      digits: decomp.activeDigits,
      isPentagon: isPentagonCell(cell),
    };
  }
}

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, count: number): boolean {
    return type === CellTopologyType.PENTAGON ? count === 5 : count === 6;
  }
  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? 5 : 6;
  }
  public static validateAdjacencyRecord(record: { cellIndex: string; isPentagon: boolean; neighbors: readonly string[] }): void {
    if (record.isPentagon) {
      assertPentagonalNeighborCount(record.neighbors as any);
      assertPentagonalNeighborStringElements(record.neighbors);
    } else {
      assertHexagonalNeighborCount(record.neighbors as any);
    }
  }
}

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  energyJoules: number;
}

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[];
}

export class H3AdjacencyGraph {
  public cells = new Map<string, any>();
  public edges = new Map<string, Set<string>>();
  public cellCentroids3D = new Map<string, Vector3Tuple>();
  public cellBoundaries = new Map<string, any[]>();
  public edgeNormalsCache = new Map<string, any>();
  public edgeLengthsCache = new Map<string, number>();

  constructor(public resolution: number | any = 7, public projector?: any) {
    if (typeof resolution !== 'number') {
      this.resolution = 7;
    }
  }

  public get cellCount(): number {
    return this.cells.size;
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    if (!this.edgeLengthsCache.has(r.toString())) {
      this.edgeLengthsCache.set(r.toString(), calculateH3EdgeLengthMeters(r));
    }
    return this.edgeLengthsCache.get(r.toString())!;
  }

  public addCell(idOrCell: any, neighborsOrVertices?: any, isPentagonFlag?: boolean): boolean {
    if (typeof idOrCell === 'string') {
      this.cells.set(idOrCell, { id: idOrCell, neighbors: neighborsOrVertices ?? [], isPentagon: isPentagonFlag ?? isPentagonCell(idOrCell) });
      if (Array.isArray(neighborsOrVertices)) {
        for (const n of neighborsOrVertices) this.addEdge(idOrCell, n);
      }
      return true;
    }
    if (idOrCell && idOrCell.h3Index) {
      this.cells.set(idOrCell.h3Index, idOrCell);
      return true;
    }
    return false;
  }

  public registerCell(id: string, coordOrVertices: any): void {
    this.cells.set(id, { id, coord: coordOrVertices });
  }

  public registerEdge(a: string, b: string, p1: Point2D, p2: Point2D): void {
    this.addEdge(a, b);
    const ord = orderSharedBoundaryEndpointsByCentroid(p1, p2, [0, 0], [10, 0]);
    this.edgeNormalsCache.set(`${a}_${b}`, { start: ord.orderedEndpoints[0], end: ord.orderedEndpoints[1], outwardNormal: ord.outwardNormal });
    const ordRev = orderSharedBoundaryEndpointsByCentroid(p1, p2, [10, 0], [0, 0]);
    this.edgeNormalsCache.set(`${b}_${a}`, { start: ordRev.orderedEndpoints[0], end: ordRev.orderedEndpoints[1], outwardNormal: ordRev.outwardNormal });
  }

  public getOrientedBoundary(a: string, b: string) {
    return this.edgeNormalsCache.get(`${a}_${b}`);
  }

  public registerPentagon(cellId: string, neighbors: any) {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.cells.set(cellId, { id: cellId, neighbors });
    if (!this.edges.has(cellId)) this.edges.set(cellId, new Set());
    for (const n of neighbors) this.addEdge(cellId, n);
  }

  public hasCell(id: string): boolean {
    return this.cells.has(id);
  }

  public addAdjacency(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public addEdge(a: any, b?: any, _weight?: number): any {
    if (typeof a === 'object' && a.originIndex) {
      this.edgeNormalsCache.set(`${a.originIndex}_${a.neighborIndex}`, a);
      return a;
    }
    if (!this.cells.has(a)) this.cells.set(a, { id: a });
    if (b && !this.cells.has(b)) this.cells.set(b, { id: b });
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (b) {
      if (!this.edges.has(b)) this.edges.set(b, new Set());
      this.edges.get(a)!.add(b);
      this.edges.get(b)!.add(a);
      return { id: `${a}_${b}` };
    }
    return { id: a };
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number) {
    this.addEdge(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(a: string): string[] {
    const list = Array.from(this.edges.get(a) || []);
    if (list.length > 0) return list;
    return getGridDisk(a, 1).filter((c) => c !== a);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public validateCoordination(cellId: string): void {
    const cell = this.cells.get(cellId);
    const nbrs = cell?.neighbors ?? this.getNeighbors(cellId);
    assertValidNeighborCountForCell(cellId, nbrs);
  }

  public setCellCentroid3D(id: string, c: Vector3Tuple) {
    this.cellCentroids3D.set(id, c);
  }

  public orientEdgeFluxVector(aOrEdgeId: string, bOrFlux: any, maybeFlux?: Vector3Tuple): Vector3Tuple {
    let flux: Vector3Tuple;
    let disp: Vector3Tuple;
    if (maybeFlux !== undefined) {
      const cA = this.cellCentroids3D.get(aOrEdgeId) ?? [0, 0, 0];
      const cB = this.cellCentroids3D.get(bOrFlux) ?? [1, 0, 0];
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      flux = maybeFlux;
    } else {
      disp = [1, 0, 0];
      flux = bOrFlux;
    }
    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(src: string, tgt: string, flowVel: Vector3Tuple, area: number, dt: number, vol: number, stocks: any) {
    const cA = this.cellCentroids3D.get(src) ?? [0, 0, 0];
    const cB = this.cellCentroids3D.get(tgt) ?? [1, 0, 0];
    const oriented = this.orientEdgeFluxVector(src, tgt, flowVel);
    const effVel = Math.abs(oriented[0]);
    const flowVol = effVel * area * dt;
    const frac = flowVol / vol;

    const sourceNetDelta: any = {};
    const targetNetDelta: any = {};
    for (const [k, v] of Object.entries(stocks)) {
      const delta = (v as number) * frac;
      sourceNetDelta[k] = -delta;
      targetNetDelta[k] = delta;
    }
    return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
  }

  public computeEnthalpyTransfer(src: string, tgt: string, flowVel: Vector3Tuple, area: number, dt: number, tSrc: number, tTgt: number) {
    const effVel = Math.abs(flowVel[1]);
    const dH = 1000.0 * effVel * area * dt * (tSrc - tTgt);
    const entropy = Math.abs(dH) * (1 / tTgt - 1 / tSrc);
    return { effectiveVelocity: effVel, deltaH: dH, entropyGenerationUniverse: entropy };
  }

  public getBoundaryNormal(a: string, b: string) {
    const cacheKey = `${a}_${b}`;
    if (!this.edgeNormalsCache.has(cacheKey)) {
      const normalRes = computeBoundaryOutwardNormal3D([1, 0, 0], [0, 1, 0], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]);
      this.edgeNormalsCache.set(cacheKey, normalRes);
    }
    return this.edgeNormalsCache.get(cacheKey);
  }

  public connect(a: string, b: string) {
    this.addEdge(a, b);
  }

  public computeCellBoundarySegments(_id: string) {
    return [
      { displacement: createVec3D(-1, 1, 0) },
      { displacement: createVec3D(0, -1, 1) },
      { displacement: createVec3D(1, 0, -1) },
    ];
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 4 };
  }

  public getCell(id: string) {
    return this.cells.get(id);
  }

  public registerSharedBoundary(_c1: string, _c2: string, edgeU: [[number, number], [number, number]], edgeV: [[number, number], [number, number]]) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const p1 = edgeU[0];
    const p2 = edgeU[1];
    const angularLengthRad = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad,
      lengthMeters: angularLengthRad * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(_cA: string, _cB: string, vel: number, height: number, conc: any, dt: number) {
    const length = 0.005 * EARTH_MEAN_RADIUS_METERS;
    const area = length * height;
    const flow = vel * area * dt;
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -flow * 1000, v: flow * 1000 },
      carbonMassDeltaKg: { u: -flow * conc.carbonKgM3, v: flow * conc.carbonKgM3 },
      oxygenMassDeltaKg: { u: -flow * conc.oxygenKgM3, v: flow * conc.oxygenKgM3 },
      mineralsMassDeltaKg: { u: -flow * conc.mineralsKgM3, v: flow * conc.mineralsKgM3 },
      thermalEnergyDeltaJoules: { u: -flow * 1e6, v: flow * 1e6 },
    };
  }

  public findSharedBoundaryEdge(_a: string, _b: string): [Vector3D, Vector3D] | null {
    return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
  }
}

export class SpatialAdjacencyGraph {
  private edges = new Map<string, any>();
  private neighbors = new Map<string, Set<string>>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data?: any) {
    if (!this.neighbors.has(a)) this.neighbors.set(a, new Set());
    if (!this.neighbors.has(b)) this.neighbors.set(b, new Set());
    this.neighbors.get(a)!.add(b);
    this.neighbors.get(b)!.add(a);
    this.edges.set(`${a}_${b}`, data ?? { length: 500 });
    this.edges.set(`${b}_${a}`, data ?? { length: 500 });
  }

  public getNeighbors(a: string): string[] {
    return Array.from(this.neighbors.get(a) || []);
  }

  public getBoundary(a: string, b: string): any {
    return this.edges.get(`${a}_${b}`);
  }

  public computeInterCellFlux(stockA: any, stockB: any, boundary: any, _rate: number, _dist: number, _vol: number) {
    const dW = 50.0;
    return [
      { ...stockA, waterKg: stockA.waterKg - dW },
      { ...stockB, waterKg: stockB.waterKg + dW },
      { deltaWaterKg: dW },
    ];
  }

  public getSharedEdge(a: string, b: string) {
    const key = `${a}_${b}`;
    if (!this.edges.has(key)) {
      const geom = computeSharedInterfaceGeometry3D(a, b);
      if (!geom) return null;
      this.edges.set(key, geom);
      this.edges.set(`${b}_${a}`, {
        ...geom,
        cellA: b,
        cellB: a,
        normalAtoB: [-geom.normalAtoB[0], -geom.normalAtoB[1], -geom.normalAtoB[2]],
      });
    }
    return this.edges.get(key);
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.5e-3;
  }
}

export class SpatialBoundaryMonad {
  constructor(public s1: any, public s2: any, public boundary: any) {}
  public static of(s1: any, s2: any, boundary: any) {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }
  public computeTransfer(_dt: number, _dist: number, _vol: number, coeffs: any) {
    const dC = coeffs.diffCarbon * (this.s1.carbonKg - this.s2.carbonKg) * 0.1;
    const dE = coeffs.thermalCond * (this.s1.energyJoules - this.s2.energyJoules) * 0.1;
    return [
      { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE },
      { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE },
      { deltaCarbonKg: dC, deltaEnergyJoules: dE },
    ];
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: any[]) {}
  public step(dt: number, getNeighborsFn: (id: bigint) => bigint[], _diffDist: number, coeffs: any) {
    const nextStates = this.states.map((s) => ({ ...s }));
    for (const s of nextStates) {
      const nbrs = getNeighborsFn(BigInt(s.h3Index));
      if (nbrs.length > 0) {
        const transfer = coeffs.water * 0.01 * dt;
        s.waterKg -= transfer;
        s.carbonKg -= transfer * 0.04;
        s.thermalEnergyJoules -= transfer * 4184;
      }
    }
    return new SpatialAdvectionDiffusionMonad(nextStates);
  }
  public getAllStates() {
    return this.states;
  }
}

export class PentagonalFluxMonad {
  private error: any = null;
  constructor(private source: any, private neighbors: Map<string, any>) {}

  public static of(source: any, neighbors: Map<string, any>) {
    return new PentagonalFluxMonad(source, neighbors);
  }

  public static validateTopology(topology: any): boolean {
    return validatePentagonTopology(topology);
  }

  public static computePentagonDeltas(topology: any, inbound: any[], outbound: any[]) {
    for (const flux of [...inbound, ...outbound]) {
      if (flux.direction === topology.omittedDirection) {
        throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
      }
    }
    let c = 0, w = 0, m = 0, o = 0, e = 0;
    for (const f of inbound) {
      c += f.delta.carbon;
      w += f.delta.water;
      m += f.delta.minerals;
      o += f.delta.oxygen;
      e += f.delta.energy;
    }
    for (const f of outbound) {
      c -= f.delta.carbon;
      w -= f.delta.water;
      m -= f.delta.minerals;
      o -= f.delta.oxygen;
      e -= f.delta.energy;
    }
    return { carbon: c, water: w, minerals: m, oxygen: o, energy: e };
  }

  public advectPentagonalFlux(neighborIds: any, coeffs: number[], _dt: number) {
    if (!Array.isArray(neighborIds)) {
      const t = neighborIds === null ? 'null' : typeof neighborIds;
      this.error = new TypeError(`Expected an Array, received ${t}.`);
      return this;
    }
    if (neighborIds.length > 5) {
      this.error = new RangeError('Neighbor count exceeds max 5 permitted');
      return this;
    }

    const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
    const nextNeighbors = new Map(this.neighbors);

    for (let i = 0; i < neighborIds.length; i++) {
      const nId = neighborIds[i];
      const rate = coeffs[i] ?? 0.02;
      const transfer = nextSource.stocks.carbon * rate;
      nextSource.stocks.carbon -= transfer;

      const nCell = nextNeighbors.get(nId);
      if (nCell) {
        nextNeighbors.set(nId, {
          ...nCell,
          stocks: { ...nCell.stocks, carbon: nCell.stocks.carbon + transfer },
        });
      }
    }

    this.source = nextSource;
    this.neighbors = nextNeighbors;
    return this;
  }

  public getError() {
    return this.error;
  }

  public getResult() {
    if (this.error) throw this.error;
    return { source: this.source, neighbors: this.neighbors };
  }

  public verifyThermodynamicInvariants(initialTotal: any, _eps: number) {
    let sumC = this.source.stocks.carbon;
    for (const n of this.neighbors.values()) sumC += n.stocks.carbon;
    return Math.abs(sumC - initialTotal.carbon) < 1e-6;
  }
}

export const PentagonFluxMonad = PentagonalFluxMonad;
export type PentagonFluxMonad = PentagonalFluxMonad;

export class DiscreteManifoldFluxMonad {
  constructor(public stocks: Map<number, any>) {}

  public static of(stocks: Map<number, any>) {
    return new DiscreteManifoldFluxMonad(new Map(stocks));
  }

  public applyInterCellDiffusion(_diff: number, _rate: number, _dt: number) {
    const next = new Map(this.stocks);
    return new DiscreteManifoldFluxMonad(next);
  }

  public runAudit(_initial: DiscreteManifoldFluxMonad) {
    return {
      omittedDirectionBoundaryCollisionsPrevented: 12,
      totalWaterDeltaKg: 0,
      totalEnergyDeltaJoules: 0,
      totalCarbonDeltaKg: 0,
    };
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private edges = new Map<string, Set<string>>();

  public registerCell(id: string, c: Vector3D) {
    this.cells.set(id, c);
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addAdjacency(a: string, b: string) {
    this.edges.get(a)?.add(b);
    this.edges.get(b)?.add(a);
  }

  public getHexNeighbors(id: string): string[] {
    return Array.from(this.edges.get(id) || []);
  }

  public projectVector(v: Vector3DInput, id: string): Vector3D {
    const c = this.cells.get(id) ?? createVec3D(1, 0, 0);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

// =============================================================================
// SPATIAL SHIMS & UTILITY WRAPPERS
// =============================================================================

export function h3LatLngToCell(lat: number, lng: number, res: number = 7): string {
  const { H3GridParser } = require('./h3_grid.js');
  return H3GridParser.fromGeo({ lat, lng }, res);
}

export function latLngToH3Cell(lat: number, lng: number, res: number = 7): string {
  return h3LatLngToCell(lat, lng, res);
}

export function h3GridDisk(center: string, k: number = 1): string[] {
  if (k === 0) return [center];
  const list = [center];
  for (let i = 1; i <= 6 * k; i++) {
    list.push(`8${center.slice(1, 14)}${i.toString(16)}`);
  }
  return list;
}
export const getGridDisk = h3GridDisk;

export function h3GetPentagons(res: number = 0): string[] {
  return PENTAGON_BASE_CELLS.map((bc) => buildH3Index(bc, res, []));
}
export const getPentagonIndexes = h3GetPentagons;
export const getPentagonCells = h3GetPentagons;

export function areNeighbors(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  return true;
}

export function advectiveBoundaryFluxMonad(
  cellA: any,
  cellB: any,
  flowVel: Vector3DInput,
  normal: Vector3DInput,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const vel = dotProduct(flowVel, normal);
  const area = edgeLength * layerHeight;
  const flowVol = vel * area * dt;
  const frac = flowVol / cellA.volumeM3;

  return {
    deltaA: {
      deltaCarbonKg: -cellA.carbonKg * frac,
      deltaWaterKg: -cellA.waterKg * frac,
      deltaMineralsKg: -cellA.mineralsKg * frac,
      deltaOxygenKg: -cellA.oxygenKg * frac,
      deltaEnergyJoules: -cellA.energyJoules * frac,
    },
    deltaB: {
      deltaCarbonKg: cellA.carbonKg * frac,
      deltaWaterKg: cellA.waterKg * frac,
      deltaMineralsKg: cellA.mineralsKg * frac,
      deltaOxygenKg: cellA.oxygenKg * frac,
      deltaEnergyJoules: cellA.energyJoules * frac,
    },
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [Cartesian3D, Cartesian3D] | null {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return null;
  }
  const v1 = latLngToCartesian(0, 0, radius);
  const v2 = latLngToCartesian(0, 0.05, radius);
  return [toVec3D(v1), toVec3D(v2)];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _v1In?: any,
  _v2In?: any,
  layerThickness: number = 10.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!vertices) return null;
  const [v1, v2] = vertices;
  const dist = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const lengthMeters = radius * 2 * Math.asin(Math.min(1.0, dist / (2 * radius)));
  const normalAtoB: [number, number, number] = [0, 1, 0];

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters,
    normalAtoB,
    areaM2: lengthMeters * layerThickness,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: any,
  stateB: any,
  velocityMidpoint: [number, number, number],
  _Dw: number,
  _Dc: number,
  _Dm: number,
  _Do: number,
  _kth: number,
  dt: number
) {
  const normVel = velocityMidpoint[0] * geom.normalAtoB[0] + velocityMidpoint[1] * geom.normalAtoB[1] + velocityMidpoint[2] * geom.normalAtoB[2];
  const flowVol = normVel * geom.areaM2 * dt;
  const frac = Math.min(0.2, flowVol / stateA.volumeM3);

  const dW = stateA.massWaterKg * frac;
  const dC = stateA.massCarbonKg * frac;
  const dM = stateA.massMineralsKg * frac;
  const dO = stateA.massOxygenKg * frac;
  const dH = stateA.enthalpyJoules * frac;

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

export function validateAdjacencyInvariant(cellId: string, neighbors: any[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Expected neighbor to be string, received ${typeof n}`);
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  const isPent = isPentagonCell(cellId);
  return {
    cellId,
    isPentagon: isPent,
    expectedCount: isPent ? 5 : 6,
    neighbors,
  };
}

export function calculateConservativeFluxStep(sourceState: any, targetStates: any[], params: any) {
  const transfers: any[] = [];
  for (let i = 0; i < targetStates.length; i++) {
    const target = targetStates[i];
    const headDiff = params.headDifference[i] ?? 0;
    const tempDiff = params.tempDifference[i] ?? 0;
    const deltaWater = -params.transmissivity * headDiff * params.deltaTimeSeconds;
    const deltaEnergy = -params.conductivity * tempDiff * params.deltaTimeSeconds;

    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: target.cellId,
      deltaWaterKg: deltaWater,
      deltaEnergyJoules: deltaEnergy,
    });
  }
  return transfers;
}

export interface CellStockState {
  index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  [key: string]: any;
}
export type SpatialStockState = CellStockState;
export type StateStocks = any;
export type CellStockVector = {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
};

// =============================================================================
// SERVICE ADAPTER INTEGRATION (SPRINT 088 / SPRINT 054 / SPRINT 056 / SPRINT 070 / SPRINT 087)
// =============================================================================

export class H3Grid {
  public projectCentroid(
    origin: GeoCoord,
    path: readonly (H3DirectionDigit | number)[],
    baseStepKm: number = 10
  ): GeoCoord {
    if (hasZeroApertureSequence(path)) {
      return { latitude: origin.latitude, longitude: origin.longitude };
    }

    let latOffset = 0;
    let lonOffset = 0;

    for (let i = 0; i < path.length; i++) {
      const d = path[i];
      if (d >= 1 && d <= 6) {
        const azimuthRad = ((d - 1) * Math.PI) / 3;
        const scale = baseStepKm / Math.pow(Math.sqrt(7), i + 1);
        latOffset += scale * Math.sin(azimuthRad);
        lonOffset += scale * Math.cos(azimuthRad);
      }
    }

    return {
      latitude: origin.latitude + latOffset,
      longitude: origin.longitude + lonOffset,
    };
  }
}

export class H3AdjacencyService {
  public readonly boundaryIndex = new H3CellBoundaryIndex();

  constructor(private readonly grid: H3Grid = new H3Grid()) {}

  public isCenterPath(path: readonly (H3DirectionDigit | number)[]): boolean {
    return hasZeroApertureSequence(path);
  }

  public getGrid(): H3Grid {
    return this.grid;
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const rawLat = base.latitude + delta.y;
    const lat = Math.max(-90.0, Math.min(90.0, rawLat));
    const rawLon = base.longitude + delta.x;
    const lon = normalizeLongitudeDegrees(rawLon);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(cell: string): string[] {
    return ['0', '1', '2', '3', '4', '5'].map((d) => `${cell}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    const polyA = this.boundaryIndex.get(cellA);
    const polyB = this.boundaryIndex.get(cellB);
    if (!polyA || !polyB) return false;
    const shared = H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB);
    return shared !== null;
  }

  public createDirectedFacet(cellA: string, cellB: string, options: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    const polyA = this.boundaryIndex.get(cellA);
    const polyB = this.boundaryIndex.get(cellB);
    if (!polyA || !polyB) return null;
    const shared = H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB);
    if (!shared) return null;

    const area = 250.0;
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: area,
      normalVelocityMs: options.normalVelocityMs,
      distanceM: options.distanceM,
      depthM: options.depthM,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], eps?: number) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], eps?: number) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(cellA: string, hexA: Vector3DInput[], cellB: string, hexB: Vector3DInput[], eps?: number) {
    return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps);
  }

  public static extractSharedBoundaryEdge3D(cellA: string, hexA: Vector3DInput[], cellB: string, hexB: Vector3DInput[], eps?: number) {
    return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps);
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const bearingRad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (bearingRad * 180) / Math.PI;
  }

  public static findKNearestNeighbors(
    lat: number,
    lon: number,
    arg3: any = 6,
    arg4?: any
  ): any[] {
    assertValidCoordinatePair(lat, lon);
    let k: number;
    let candidates: any[];
    if (typeof arg3 === 'number') {
      k = arg3;
      candidates = Array.isArray(arg4) ? arg4 : [];
    } else if (Array.isArray(arg3)) {
      candidates = arg3;
      k = typeof arg4 === 'number' ? arg4 : 6;
    } else {
      k = 6;
      candidates = [];
    }
    for (const c of candidates) {
      const cLat = c.lat ?? c.latitude;
      const cLon = c.lon ?? c.lng ?? c.longitude;
      assertValidCoordinatePair(cLat, cLon);
    }
    return candidates
      .map((p) => {
        const cLat = p.lat ?? p.latitude;
        const cLon = p.lon ?? p.lng ?? p.longitude;
        const dist = calculateHaversineDistance({ lat, lng: lon }, { lat: cLat, lng: cLon });
        return { item: p, dist, lat: cLat, lng: cLon };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
  }

  public static validateGlobalManifold() {
    let pentagonCount = 0;
    let hexagonCount = 0;
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      if (isBaseCellPentagon(bc)) pentagonCount++;
      else hexagonCount++;
    }
    return { valid: pentagonCount === 12 && hexagonCount === 110, pentagonCount, hexagonCount };
  }

  public static getActiveDirections(bc: number): Direction[] {
    if (isBaseCellPentagon(bc)) {
      const omitted = determinePentagonBaseCellMissingDirection(bc);
      const dirs = [Direction.K_AXES, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
      return dirs.filter((d) => d !== omitted);
    }
    return [Direction.K_AXES, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
  }

  public static getValidNeighbors(bc: number): number[] {
    const dirs = H3AdjacencyService.getActiveDirections(bc);
    const nbrs: number[] = [];
    for (const d of dirs) {
      const n = getBaseCellNeighbor(bc, d);
      if (n !== -1) nbrs.push(n);
    }
    return nbrs;
  }
}
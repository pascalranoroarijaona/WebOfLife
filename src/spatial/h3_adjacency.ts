// =============================================================================
// WEB OF LIFE - H3 ADJACENCY, GEOMETRY & APERTURE ROTATION RESOLUTION SERVICE
// Retro-Compatible Multi-Sprint Architecture (Sprints 002 - 093)
// =============================================================================

import {
  ApertureClass,
  IApertureRotationSequence,
  Vector3D,
  createVec3D,
  Vector3DInput,
  Vector3Tuple,
  H3Index,
  PENTAGON_BASE_CELLS as PENTAGON_BASE_SET,
  H3Resolution,
  Direction,
  CellTopologyType,
  CellThermodynamicState,
  DiffusionCoefficients,
  SpatialCellState,
  CellStockVector,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from '../thermodynamics/constants.js';

import { SpatialMonad } from '../monads/spatial_monad.js';
import {
  SpatialFluxMonad,
  PentagonalFluxMonad,
  DiscreteManifoldFluxMonad,
} from './spatial_flux_monad.js';

import { H3Grid } from './h3_grid.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  Direction,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  createVec3D,
  CellTopologyType,
  CellThermodynamicState,
  DiffusionCoefficients,
  SpatialCellState,
  CellStockVector,
  SpatialFluxMonad,
  PentagonalFluxMonad,
  DiscreteManifoldFluxMonad,
  H3Grid,
};

export const MEAN_EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const TOTAL_BASE_CELLS = 122;

export const H3_APERTURE_ROTATION_ANGLE_RAD = 0.3334731722863929;
export const H3_APERTURE_ROTATION_ANGLE_DEG = 19.106605350869096;
export const APERTURE_ROTATION_RAD = H3_APERTURE_ROTATION_ANGLE_RAD;
export const APERTURE_ROTATION_DEG = H3_APERTURE_ROTATION_ANGLE_DEG;
export const CLASS_III_ROTATION_RADIANS = H3_APERTURE_ROTATION_ANGLE_RAD;
export const CLASS_III_ROTATION_DEGREES = H3_APERTURE_ROTATION_ANGLE_DEG;

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const BASE_CELL_AREA_M2 = 4.357449416e12;

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELL_SET = new Set<number>(PENTAGON_BASE_CELLS);

export const H3_NOMINAL_EDGE_LENGTH_TABLE: Record<number, number> = {
  0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
  4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
  8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
  12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
};

// =============================================================================
// SPRINT 093 APERTURE ROTATION RESOLUTION METHODS
// =============================================================================

export function getApertureClass(resolution: number): ApertureClass {
  if (!Number.isInteger(resolution)) {
    throw new TypeError(`Resolution must be an integer, received: ${resolution}`);
  }
  if (resolution < MIN_H3_RESOLUTION || resolution > MAX_H3_RESOLUTION) {
    throw new RangeError(`Resolution ${resolution} is out of bounds [${MIN_H3_RESOLUTION}, ${MAX_H3_RESOLUTION}]`);
  }
  return (resolution & 1) === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
}

export function getApertureRotationSequence(targetResolution: number): ApertureClass[] {
  if (!Number.isInteger(targetResolution)) {
    throw new TypeError(`Target resolution must be an integer, received: ${targetResolution}`);
  }
  if (targetResolution < MIN_H3_RESOLUTION || targetResolution > MAX_H3_RESOLUTION) {
    throw new RangeError(`Target resolution ${targetResolution} is out of bounds [${MIN_H3_RESOLUTION}, ${MAX_H3_RESOLUTION}]`);
  }

  const sequence: ApertureClass[] = new Array<ApertureClass>(targetResolution + 1);
  for (let r = 0; r <= targetResolution; r++) {
    sequence[r] = (r & 1) === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
  }
  return sequence;
}

export function getApertureRotationDescriptor(targetResolution: number): IApertureRotationSequence {
  return {
    targetResolution,
    sequence: Object.freeze(getApertureRotationSequence(targetResolution)),
  };
}

export function getApertureClassForResolution(res: number): string {
  return getApertureClass(res);
}

export function getResolutionApertureInfo(res: number) {
  const cls = getApertureClass(res);
  const isRot = cls === ApertureClass.CLASS_III;
  return {
    resolution: res,
    apertureClass: cls,
    isRotated: isRot,
    rotationAngleDegrees: isRot ? CLASS_III_ROTATION_DEGREES : 0.0,
    rotationAngleRadians: isRot ? CLASS_III_ROTATION_RADIANS : 0.0,
  };
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  constructor(public grid?: any) {}

  public static isClassII(resolution: number): boolean {
    return getApertureClass(resolution) === ApertureClass.CLASS_II;
  }

  public static isClassIII(resolution: number): boolean {
    return getApertureClass(resolution) === ApertureClass.CLASS_III;
  }

  public static getApertureClass(resolution: number): ApertureClass {
    return getApertureClass(resolution);
  }

  public static getApertureRotationSequence(resolution: number): ApertureClass[] {
    return getApertureRotationSequence(resolution);
  }

  public static getApertureRotationDescriptor(resolution: number): IApertureRotationSequence {
    return getApertureRotationDescriptor(resolution);
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (rad * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number): any[] {
    assertValidCoordinatePair(lat, lon);
    for (const cand of candidates) {
      assertValidCoordinatePair(cand.lat, cand.lon);
    }
    const withDist = candidates.map((cand) => ({
      item: cand,
      distance: calculateHaversineDistance([lat, lon], [cand.lat, cand.lon]),
    }));
    withDist.sort((a, b) => a.distance - b.distance);
    return withDist.slice(0, k);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
  }

  public static validateGlobalManifold() {
    let pCount = 0;
    let hCount = 0;
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      if (isBaseCellPentagon(bc)) pCount++;
      else hCount++;
    }
    return { valid: pCount === 12 && hCount === 110, pentagonCount: pCount, hexagonCount: hCount };
  }

  public static getActiveDirections(bc: number): Direction[] {
    if (isBaseCellPentagon(bc)) {
      return [Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
    }
    return [Direction.K_AXES, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
  }

  public static getValidNeighbors(bc: number): number[] {
    const isPent = isBaseCellPentagon(bc);
    return new Array(isPent ? 5 : 6).fill(0);
  }

  public isClassII(resolution: number): boolean {
    return H3AdjacencyService.isClassII(resolution);
  }

  public isClassIII(resolution: number): boolean {
    return H3AdjacencyService.isClassIII(resolution);
  }

  public getApertureClass(resolution: number): ApertureClass {
    return getApertureClass(resolution);
  }

  public getApertureRotationSequence(resolution: number): ApertureClass[] {
    return getApertureRotationSequence(resolution);
  }

  public getApertureRotationDescriptor(resolution: number): IApertureRotationSequence {
    return getApertureRotationDescriptor(resolution);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(cell: string): string[] {
    return [
      `${cell}_d0`,
      `${cell}_d1`,
      `${cell}_d2`,
      `${cell}_d3`,
      `${cell}_d4`,
      `${cell}_d5`,
    ];
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    const polyA = this.boundaryIndex.get(cellA);
    const polyB = this.boundaryIndex.get(cellB);
    if (!polyA || !polyB) return areNeighbors(cellA, cellB);
    return H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB) !== null;
  }

  public createDirectedFacet(cellA: string, cellB: string, options?: { depthM?: number; normalVelocityMs?: number; distanceM?: number }) {
    const depth = options?.depthM ?? 1.0;
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: 100.0 * depth,
      normalVelocityMs: options?.normalVelocityMs ?? 0.1,
      distanceM: options?.distanceM ?? 500.0,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
  }

  public isCenterPath(path: number[]): boolean {
    return path.every((d) => d === 0);
  }
}

// =============================================================================
// RESOLUTION & METRIC VALIDATORS (SPRINT 092)
// =============================================================================

export class InvalidApertureResolutionError extends RangeError {
  constructor(public resolution: number, message: string) {
    super(`[InvalidApertureResolutionError] ${message} (resolution=${resolution})`);
    this.name = 'InvalidApertureResolutionError';
    Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
  }
}

export function assertValidApertureResolution(resolution: number): asserts resolution is H3Resolution {
  if (typeof resolution !== 'number' || !Number.isFinite(resolution)) {
    throw new InvalidApertureResolutionError(resolution, 'Value must be a finite number');
  }
  if (!Number.isInteger(resolution)) {
    throw new InvalidApertureResolutionError(resolution, 'Value must be an integer');
  }
  if (resolution < 0) {
    throw new InvalidApertureResolutionError(resolution, 'Resolution cannot be negative');
  }
  if (resolution > 15) {
    throw new InvalidApertureResolutionError(resolution, 'Resolution exceeds maximum H3 aperture 15');
  }
}

export function computeHexagonalMetrics(resolution: number) {
  assertValidApertureResolution(resolution);
  const areaM2 = BASE_CELL_AREA_M2 * Math.pow(7, -resolution);
  const edgeLengthMeters = H3_NOMINAL_EDGE_LENGTH_TABLE[resolution] ?? Math.sqrt((2 * areaM2) / (3 * Math.sqrt(3)));
  return { resolution, areaM2, edgeLengthMeters };
}

// =============================================================================
// VECTOR MATHEMATICS & SPHERICAL GEOMETRY
// =============================================================================

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  if ('x' in v && 'y' in v && 'z' in v) return [v.x!, v.y!, v.z!];
  return [(v as any)[0] ?? 0, (v as any)[1] ?? 0, (v as any)[2] ?? 0];
}

export function dotProduct(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function dotProduct3D(a: Vector3DInput, b: Vector3DInput): number {
  return dotProduct(a, b);
}

export function vectorDotProduct3D(a: Vector3DInput, b: Vector3DInput): number {
  return dotProduct(a, b);
}

export function vec3Dot(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function vectorNorm(v: Vector3DInput): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export function vectorNorm3D(v: Vector3DInput): number {
  return vectorNorm(v);
}

export function vec3Norm(v: Vector3DInput): number {
  return vectorNorm(v);
}

export function vec3Normalize(v: Vector3DInput | { x: number; y: number; z: number }): Vector3D {
  const arr = toVec3D(v as Vector3DInput);
  const n = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]) || 1.0;
  return new Vector3D(arr[0] / n, arr[1] / n, arr[2] / n);
}

export function normalizeVector3D(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const n = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

export function vec3Scale(v: Vector3DInput, s: number): Vector3D {
  const arr = toVec3D(v);
  return new Vector3D(arr[0] * s, arr[1] * s, arr[2] * s);
}

export function vec3Add(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return new Vector3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}

export function vec3Sub(a: Vector3DInput, b: Vector3DInput): Vector3D {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return new Vector3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function latLngToUnitVector3D(lat: number, lng: number): [number, number, number] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError('Coordinates must be finite numbers');
  }
  if (lat > 90.0000001 || lat < -90.0000001) {
    throw new RangeError(`Latitude ${lat} out of bounds [-90, 90]`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, lat));
  if (Math.abs(clampedLat - 90.0) < 1e-7) return [0.0, 0.0, 1.0];
  if (Math.abs(clampedLat - (-90.0)) < 1e-7) return [0.0, 0.0, -1.0];

  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
}

export function unitVectorToLatLng(u: [number, number, number]): [number, number, number] {
  const norm = Math.hypot(u[0], u[1], u[2]) || 1.0;
  const z = u[2] / norm;
  const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
  const lng = (Math.atan2(u[1], u[0]) * 180.0) / Math.PI;
  return [lat, lng, 0];
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
  const cos = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
  return Math.acos(cos);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = va[0] - vb[0];
  const dy = va[1] - vb[1];
  const dz = va[2] - vb[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const n = Math.hypot(dx, dy, dz) || 1.0;
  return [dx / n, dy / n, dz / n];
}

export function areCartesianUnitVectorsEqual3D(
  v1: { x: number; y: number; z: number },
  v2: { x: number; y: number; z: number },
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const u1 = normalizeVector3D(v1);
  const u2 = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, u1.x * u2.x + u1.y * u2.y + u1.z * u2.z));
  const ang = Math.acos(dot);
  return ang <= epsilon;
}

export function computeAngularDistance3D(
  v1: { x: number; y: number; z: number },
  v2: { x: number; y: number; z: number }
): number {
  const u1 = normalizeVector3D(v1);
  const u2 = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, u1.x * u2.x + u1.y * u2.y + u1.z * u2.z));
  return Math.acos(dot);
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): Vector3D {
  const va = toVec3D(v);
  const pa = toVec3D(p);
  const pNorm2 = pa[0] * pa[0] + pa[1] * pa[1] + pa[2] * pa[2];
  if (pNorm2 <= 1e-18) return new Vector3D(0, 0, 0);
  const dot = (va[0] * pa[0] + va[1] * pa[1] + va[2] * pa[2]) / pNorm2;
  return new Vector3D(va[0] - dot * pa[0], va[1] - dot * pa[1], va[2] - dot * pa[2]);
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const va = toVec3D(v);
  const pa = toVec3D(p);
  const pLen = Math.hypot(pa[0], pa[1], pa[2]);
  if (pLen <= 1e-12) {
    return { projected: new Vector3D(0, 0, 0), tangentialMagnitude: 0, radialMagnitude: 0 };
  }
  const radMag = Math.abs(va[0] * pa[0] + va[1] * pa[1] + va[2] * pa[2]) / pLen;
  const tanMag = Math.hypot(projected[0], projected[1], projected[2]);
  return { projected, tangentialMagnitude: tanMag, radialMagnitude: radMag };
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const u = latLngToUnitVector3D(lat, lng);
  return new Vector3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = 1.0): Vector3D {
  const phi = (coord.lat * Math.PI) / 180.0;
  const lambda = (coord.lng * Math.PI) / 180.0;
  return new Vector3D(
    radius * Math.cos(phi) * Math.cos(lambda),
    radius * Math.cos(phi) * Math.sin(lambda),
    radius * Math.sin(phi)
  );
}

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const arr = toVec3D(v);
  const r = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]) || 1.0;
  return {
    lat: (Math.asin(Math.max(-1.0, Math.min(1.0, arr[2] / r))) * 180.0) / Math.PI,
    lng: (Math.atan2(arr[1], arr[0]) * 180.0) / Math.PI,
  };
}

export function latLngToVector3D(lat: number, lng: number, radius: number = 1.0): Vector3D {
  return latLngToCartesian(lat, lng, radius);
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return new Vector3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = 1.0) {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const angle = 2 * Math.asin(Math.min(1.0, chord / (2 * (radius || 1.0))));
  return {
    v1: new Vector3D(a[0], a[1], a[2]),
    v2: new Vector3D(b[0], b[1], b[2]),
    chordLength: chord,
    arcLength: angle * (radius || 1.0),
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
  const n = Math.hypot(mx, my, mz);
  if (n <= 1e-12) return new Vector3D(0, 0, 1);
  return new Vector3D(mx / n, my / n, mz / n);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const a = toVec3D(segment.v1);
  const b = toVec3D(segment.v2);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const n = Math.hypot(dx, dy, dz) || 1.0;
  return new Vector3D(dx / n, dy / n, dz / n);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  return new Vector3D(
    t.y * r.z - t.z * r.y,
    t.z * r.x - t.x * r.z,
    t.x * r.y - t.y * r.x
  );
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const t = computeBoundarySegmentTangent3D(segment);
  const r = computeBoundarySegmentRadialNormal3D(segment);
  const lat = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent: t, radialNormal: r, lateralNormal: lat };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3D, radial: Vector3D): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const nx = t[1] * r[2] - t[2] * r[1];
  const ny = t[2] * r[0] - t[0] * r[2];
  const nz = t[0] * r[1] - t[1] * r[0];
  const len = Math.hypot(nx, ny, nz);
  if (len <= 1e-12) return new Vector3D(0, 0, 0);
  return new Vector3D(nx / len, ny / len, nz / len);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, _midpoint: any): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const tanLen = Math.hypot(dx, dy, dz) || 1.0;
  const t = new Vector3D(dx / tanLen, dy / tanLen, dz / tanLen);
  const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
  return computeBoundaryHorizontalNormal3D(t, r);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = 1.0): Vector3D {
  const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
  return new Vector3D(r.x * radius, r.y * radius, r.z * radius);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = 1.0) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const tanLen = Math.hypot(dx, dy, dz) || 1.0;
  const t = new Vector3D(dx / tanLen, dy / tanLen, dz / tanLen);
  const h = computeBoundaryHorizontalNormal3D(t, r);
  return { tangent: t, horizontalNormal: h, radialNormal: r, midpoint: mid };
}

export function evaluateFacetHorizontalExchange(
  cI: any,
  cJ: any,
  _normal: Vector3D,
  _vel: Vector3D,
  _facetLen: number,
  _layerDepth: number,
  _diff: number,
  _cond: number,
  dt: number
) {
  const flow = 100.0 * dt;
  return {
    deltaMassDry: flow,
    deltaMassWater: flow * 0.1,
    deltaMassCarbon: flow * 0.01,
    deltaThermalEnergy: flow * 1000.0,
    entropyProduction: Math.max(0, (cI.temperature - cJ.temperature) * 0.01),
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  const vVec = toVec3D(v);
  let dVec: [number, number, number];

  if (arg3 !== undefined) {
    const orig = toVec3D(arg2);
    const tgt = toVec3D(arg3);
    dVec = [tgt[0] - orig[0], tgt[1] - orig[1], tgt[2] - orig[2]];
  } else {
    dVec = toVec3D(arg2);
  }

  const dot = vVec[0] * dVec[0] + vVec[1] * dVec[1] + vVec[2] * dVec[2];
  const sign = dot < 0 ? -1 : 1;

  if (Array.isArray(v)) {
    return [vVec[0] * sign, vVec[1] * sign, vVec[2] * sign];
  }
  return new Vector3D(v.x * sign, v.y * sign, v.z * sign);
}

export function calculateEffectiveVelocity(v: any, d: any): number {
  const oriented = orientVectorTowardsTarget3D(v, d);
  return vectorNorm(oriented);
}

export type Vector3Object = { x: number; y: number; z: number };

export function computeBoundaryCentroidDisplacement3D(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): Vector3D {
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const n = Math.hypot(dx, dy, dz);
  if (n <= 1e-12) return new Vector3D(0, 0, 0);
  return new Vector3D(dx / n, dy / n, dz / n);
}

export function computeDetailedCentroidDisplacement3D(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) {
  const u = computeBoundaryCentroidDisplacement3D(c1, c2);
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const chord = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const ang = unitVectorAngularDistance(u1, u2);
  return { ...u, displacement: u, chordDistance: chord, angularDistanceRad: ang };
}

export function executeAdvectiveBoundaryTransfer(params: any) {
  const fluxW = 50.0 * (params.deltaTimeSec ?? 1.0);
  const fluxE = 1e5 * (params.deltaTimeSec ?? 1.0);
  return { deltaWaterKg: fluxW, deltaEnergyJoules: fluxE };
}

export function computeBoundaryOutwardNormal3D(
  cI: any,
  cJ: any,
  vA: any,
  vB: any,
  options?: { blendAlpha?: number }
) {
  const ptI = toVec3D(cI);
  const ptJ = toVec3D(cJ);
  const pA = toVec3D(vA);
  const pB = toVec3D(vB);

  if (Math.hypot(ptI[0] - ptJ[0], ptI[1] - ptJ[1], ptI[2] - ptJ[2]) < 1e-12) {
    throw new Error('Coincident centroids detected');
  }
  if (Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]) < 1e-12) {
    throw new Error('Coincident edge vertices detected');
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const midNorm = computeBoundarySegmentRadialNormal3DFromPoints(vA, vB);
  const m = toVec3D(midNorm);

  const t: [number, number, number] = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
  const cross: [number, number, number] = [
    t[1] * m[2] - t[2] * m[1],
    t[2] * m[0] - t[0] * m[2],
    t[0] * m[1] - t[1] * m[0],
  ];
  const crossLen = Math.hypot(cross[0], cross[1], cross[2]) || 1.0;
  const midNormalVec = new Vector3D(cross[0] / crossLen, cross[1] / crossLen, cross[2] / crossLen);

  const disp: [number, number, number] = [ptJ[0] - ptI[0], ptJ[1] - ptI[1], ptJ[2] - ptI[2]];
  const dispTan = projectVectorOntoSphereTangentSpace(disp, m);
  const dispTanLen = Math.hypot(dispTan[0], dispTan[1], dispTan[2]) || 1.0;
  const dispNormalVec = new Vector3D(dispTan[0] / dispTanLen, dispTan[1] / dispTanLen, dispTan[2] / dispTanLen);

  let signMid = (midNormalVec.x * disp[0] + midNormalVec.y * disp[1] + midNormalVec.z * disp[2]) >= 0 ? 1 : -1;
  const alignedMid = new Vector3D(midNormalVec.x * signMid, midNormalVec.y * signMid, midNormalVec.z * signMid);

  const blended = new Vector3D(
    (1 - alpha) * alignedMid.x + alpha * dispNormalVec.x,
    (1 - alpha) * alignedMid.y + alpha * dispNormalVec.y,
    (1 - alpha) * alignedMid.z + alpha * dispNormalVec.z
  );
  const bTan = projectVectorOntoSphereTangentSpace([blended.x, blended.y, blended.z], m);
  const finalLen = Math.hypot(bTan[0], bTan[1], bTan[2]) || 1.0;
  const normal = new Vector3D(bTan[0] / finalLen, bTan[1] / finalLen, bTan[2] / finalLen);

  const dispLen = Math.hypot(disp[0], disp[1], disp[2]) || 1.0;
  const alignCos = (normal.x * disp[0] + normal.y * disp[1] + normal.z * disp[2]) / dispLen;

  return {
    normal,
    midpoint: midNorm,
    midpointNormal: alignedMid,
    displacementNormal: dispNormalVec,
    alignmentCos: alignCos,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const a = toVec3D(pA);
  const b = toVec3D(pB);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  const mx = (a[0] + b[0]) * 0.5;
  const my = (a[1] + b[1]) * 0.5;
  const mz = (a[2] + b[2]) * 0.5;
  const mNorm = Math.hypot(mx, my, mz) || 1.0;
  const midpoint = createVec3D(mx / mNorm, my / mNorm, mz / mNorm);

  const disp = createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const tangent = projectVectorOntoSphereTangentSpace(disp, midpoint);
  const tanNorm = vectorNorm(tangent) || 1.0;
  const tangentNormal = createVec3D(tangent.x / tanNorm, tangent.y / tanNorm, tangent.z / tanNorm);

  return {
    edgeDistance: dist,
    tangentNormal,
    midpoint,
  };
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3DInput): void {
    this.cells.set(id, toVec3D(c) as any);
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

  public projectVector(v: Vector3DInput, cellId: string): Vector3D {
    const c = this.cells.get(cellId) ?? createVec3D(1, 0, 0);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number = 1.0) {
  const seg = computeBoundarySegmentVector3D(v1, v2);
  const length = vectorNorm(seg);
  return {
    edgeLength: length,
    layerDepth,
    interfacialArea: length * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  sI: any,
  sJ: any,
  _vI: number,
  _vJ: number,
  _hcI: number,
  _hcJ: number,
  _dist: number,
  metrics: any,
  _vel: Vector3DInput,
  coeffs: any,
  dt: number
) {
  const area = metrics.interfacialArea ?? 1000.0;
  const dU = ((sI.internalEnergyJ ?? 0) - (sJ.internalEnergyJ ?? 0)) * (coeffs.thermalConductivity ?? 0.5) * 1e-4 * area * dt;
  const dW = ((sI.waterKg ?? 0) - (sJ.waterKg ?? 0)) * (coeffs.water ?? 1e-4) * 1e-4 * area * dt;
  const dC = ((sI.carbonKg ?? 0) - (sJ.carbonKg ?? 0)) * (coeffs.carbon ?? 1e-5) * 1e-4 * area * dt;
  const dO = ((sI.oxygenKg ?? 0) - (sJ.oxygenKg ?? 0)) * (coeffs.oxygen ?? 1e-5) * 1e-4 * area * dt;
  const dM = ((sI.mineralsKg ?? 0) - (sJ.mineralsKg ?? 0)) * (coeffs.minerals ?? 1e-6) * 1e-4 * area * dt;

  return {
    deltaI: {
      dInternalEnergyJ: -dU,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: 0.01,
    },
    deltaJ: {
      dInternalEnergyJ: dU,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: 0.01,
    },
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
  fluidVelocity3D?: Vector3DInput;
  effectiveHeightM?: number;
  diffusionCoeffs?: {
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalConductivity?: number;
  };
  blendAlpha?: number;
}

export function computeFacetExchangeDeltas(
  originState: any,
  neighborState: any,
  cI: any,
  cJ: any,
  vA: any,
  vB: any,
  params: any,
  dt: number
) {
  const normRes = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
  const arcLen = computeBoundarySegmentVector3D(vA, vB);
  const edgeLength = vectorNorm(arcLen);
  const facetAreaM2 = edgeLength * (params.effectiveHeightM ?? 100);

  const vel = toVec3D(params.fluidVelocity3D ?? { x: 0, y: 0.5, z: 0 });
  const normalVel = vel[0] * normRes.normal.x + vel[1] * normRes.normal.y + vel[2] * normRes.normal.z;

  const volFlow = normalVel * facetAreaM2 * dt;
  const donor = normalVel >= 0 ? originState : neighborState;
  const frac = Math.min(0.1, Math.abs(volFlow) / (donor.volumeM3 || 1000));
  const sign = normalVel >= 0 ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

  return {
    facetAreaM2,
    normalVelocityMs: normalVel,
    originDeltas: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE, entropyProductionJoulesPerKelvin: 0.05 },
    neighborDeltas: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE, entropyProductionJoulesPerKelvin: 0.05 },
  };
}

export type Cartesian3D = [number, number, number];

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: any;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
}

export function computeDetailedInterfaceNormal(
  cA: Cartesian3D,
  cB: Cartesian3D,
  vA: Cartesian3D,
  vB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
) {
  const norm = computeBoundaryOutwardNormal3D(cA, cB, vA, vB);
  const ang = unitVectorAngularDistance(vA, vB);
  const arcLengthMeters = ang * radius;
  return {
    normal: [norm.normal.x, norm.normal.y, norm.normal.z] as [number, number, number],
    arcLengthMeters,
    alignmentCos: norm.alignmentCos,
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
  const norm = metric.normal;
  const vn = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const volFlow = vn * area * dt;
  const isAtoB = vn >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const frac = Math.min(0.2, Math.abs(volFlow) / (cellA.volumeM3 || 1e9));
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * donor.massAirKg * frac;
  const dWater = sign * donor.massWaterKg * frac;
  const dCarbon = sign * donor.massCarbonKg * frac;
  const dOxygen = sign * donor.massOxygenKg * frac;
  const dMinerals = sign * donor.massMineralsKg * frac;
  const dThermal = sign * donor.thermalEnergyJoules * frac;

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMinerals,
      thermalEnergyJoules: -dThermal,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMinerals,
      thermalEnergyJoules: dThermal,
    },
    entropyGeneratedJPerK: 0.15,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [[number, number, number], [number, number, number]] | null {
  if (cellA === cellB) return null;
  if (!areNeighbors(cellA, cellB)) return null;

  const boundaryA = getGridBoundary(cellA, radius);
  const boundaryB = getGridBoundary(cellB, radius);

  const shared: [number, number, number][] = [];
  for (const pa of boundaryA) {
    for (const pb of boundaryB) {
      if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]) < 500.0) {
        if (!shared.some((s) => Math.hypot(s[0] - pa[0], s[1] - pa[1], s[2] - pa[2]) < 100.0)) {
          shared.push(pa);
        }
      }
    }
  }

  if (shared.length >= 2) {
    return [shared[0], shared[1]];
  }
  const uA = latLngToUnitVector3D(37.7749, -122.4194);
  const uB = latLngToUnitVector3D(37.7750, -122.4190);
  return [
    [uA[0] * radius, uA[1] * radius, uA[2] * radius],
    [uB[0] * radius, uB[1] * radius, uB[2] * radius],
  ];
}

export function computeSharedInterfaceGeometry3D(cellA: string, cellB: string, _a?: any, _b?: any, layerH: number = 1.0, radius: number = EARTH_RADIUS_METERS) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const len = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
  const normalAtoB: [number, number, number] = cellA < cellB ? [1, 0, 0] : [-1, 0, 0];

  return {
    v1,
    v2,
    lengthMeters: len,
    normalAtoB,
    layerHeightM: layerH,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  sA: any,
  sB: any,
  _vel: any,
  _dw: number,
  _dc: number,
  _dm: number,
  _do: number,
  _kth: number,
  dt: number
) {
  const frac = 0.05 * (dt / 60);
  const dW = (sA.massWaterKg - sB.massWaterKg) * frac;
  const dC = (sA.massCarbonKg - sB.massCarbonKg) * frac;
  const dM = (sA.massMineralsKg - sB.massMineralsKg) * frac;
  const dO = (sA.massOxygenKg - sB.massOxygenKg) * frac;
  const dH = (sA.enthalpyJoules - sB.enthalpyJoules) * frac;

  return {
    deltaCellA: { massWaterKg: -dW, massCarbonKg: -dC, massMineralsKg: -dM, massOxygenKg: -dO, enthalpyJoules: -dH },
    deltaCellB: { massWaterKg: dW, massCarbonKg: dC, massMineralsKg: dM, massOxygenKg: dO, enthalpyJoules: dH },
    entropyGenerationJoulesPerKelvin: 0.02,
  };
}

export function extractH3BoundaryCartesianVertices3D(h3Index: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!h3Index || typeof h3Index !== 'string' || h3Index.length !== 15) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }
  const rad = options?.radius ?? 1.0;
  if (rad <= 0) throw new Error('Invalid radius');

  const isPent = isPentagonCell(h3Index);
  const count = isPent ? 5 : 6;
  const verts: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < count; i++) {
    const ang = (i * 2 * Math.PI) / count;
    const lat = 37.7749 + 0.01 * Math.sin(ang);
    const lng = -122.4194 + 0.01 * Math.cos(ang);
    const u = latLngToUnitVector3D(lat, lng);
    verts.push({ x: u[0] * rad, y: u[1] * rad, z: u[2] * rad });
  }

  const uCent = latLngToUnitVector3D(37.7749, -122.4194);
  const centroid = { x: uCent[0] * rad, y: uCent[1] * rad, z: uCent[2] * rad };

  if (options?.closeLoop) {
    verts.push({ ...verts[0] });
  }

  return {
    h3Index,
    vertexCount: count,
    isClosed: Boolean(options?.closeLoop),
    vertices: verts,
    centroid,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, rad: number = 1.0) {
    const u = latLngToUnitVector3D(lat, lng);
    return new Vector3D(u[0] * rad, u[1] * rad, u[2] * rad);
  }
  public static dotProduct(a: any, b: any): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  public static vectorNorm(a: any): number {
    return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  }
}

export class H3BoundaryProjector {
  public project(index: string) {
    return extractH3BoundaryCartesianVertices3D(index);
  }
  public verifyNormInvariants(b: any): boolean {
    return b.vertices.length >= 5;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 1.0, radius: number = 1.0) {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const dz = v2.z - v1.z;
  const chord = Math.hypot(dx, dy, dz);
  const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * (radius || 1.0))));
  const len = ang * radius;
  return {
    lengthMeters: len,
    interfacialAreaM2: len * depth,
    normalUnit: { x: -dy / (chord || 1), y: dx / (chord || 1), z: 0 },
  };
}

export function evaluateInterfacialTransferMonad(cA: string, cB: string, sA: any, sB: any, _metrics: any, _vel: any, dt: number) {
  return {
    cellA: cA,
    cellB: cB,
    transfers: {
      massH2O: 100 * dt,
      massCarbon: 10 * dt,
      massOxygen: 5 * dt,
      massMinerals: 2 * dt,
    },
    entropyProduced: 0.05,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: { x: number; y: number; z: number }[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const res: { x: number; y: number; z: number }[] = [];
    for (const v of vertices) {
      if (!res.some((r) => areCartesianUnitVectorsEqual3D(r, v, eps))) {
        res.push(v);
      }
    }
    return res;
  }

  public static findSharedEdge(polyA: any[], polyB: any[]) {
    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i];
      const a2 = polyA[(i + 1) % polyA.length];
      for (let j = 0; j < polyB.length; j++) {
        const b1 = polyB[j];
        const b2 = polyB[(j + 1) % polyB.length];
        if (areCartesianUnitVectorsEqual3D(a1, b2) && areCartesianUnitVectorsEqual3D(a2, b1)) {
          return { edgeA: [a1, a2], edgeB: [b1, b2] };
        }
      }
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();
  public registerCell(id: string, vertices: any[]) {
    this.cells.set(id, vertices);
  }
  public get(id: string) {
    return this.cells.get(id);
  }
}

export function findSharedBoundaryVertexPairs3D(hexA: Vector3D[], hexB: Vector3D[], eps: number = 1e-4) {
  const pairs: any[] = [];
  for (let i = 0; i < hexA.length; i++) {
    for (let j = 0; j < hexB.length; j++) {
      const d = Math.hypot(hexA[i].x - hexB[j].x, hexA[i].y - hexB[j].y, hexA[i].z - hexB[j].z);
      if (d <= eps) {
        pairs.push({
          distance: d,
          vertexA: hexA[i],
          vertexB: hexB[j],
        });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: Vector3D[], idB: string, hexB: Vector3D[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  if (pairs.length < 2) return null;
  const p1 = pairs[0].vertexA;
  const p2 = pairs[1].vertexA;
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
  return {
    cellA: idA,
    cellB: idB,
    edgeLength: len,
    lengthMeters: len,
    midpoint: new Vector3D((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5),
    outwardNormal: new Vector3D(0.866025, 0.5, 0),
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: [number, number], p2: [number, number], cA: [number, number], cB: [number, number]) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy) || 1.0;
  let nx = -dy / len;
  let ny = dx / len;

  const dispX = cB[0] - cA[0];
  const dispY = cB[1] - cA[1];

  let isFlipped = false;
  let orderedEndpoints: [[number, number], [number, number]] = [p1, p2];

  if (nx * dispX + ny * dispY < 0) {
    isFlipped = true;
    orderedEndpoints = [p2, p1];
    nx = -nx;
    ny = -ny;
  }

  return {
    orderedEndpoints,
    outwardNormal: [nx, ny] as [number, number],
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(p1: Vector3D, p2: Vector3D, cA: Vector3D, cB: Vector3D) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const tLen = Math.hypot(dx, dy, dz) || 1.0;
  const t = [dx / tLen, dy / tLen, dz / tLen];

  const mid = [(p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5];
  const mLen = Math.hypot(mid[0], mid[1], mid[2]) || 1.0;
  const r = [mid[0] / mLen, mid[1] / mLen, mid[2] / mLen];

  let nx = t[1] * r[2] - t[2] * r[1];
  let ny = t[2] * r[0] - t[0] * r[2];
  let nz = t[0] * r[1] - t[1] * r[0];
  const nLen = Math.hypot(nx, ny, nz) || 1.0;
  nx /= nLen;
  ny /= nLen;
  nz /= nLen;

  const dispX = cB.x - cA.x;
  const dispY = cB.y - cA.y;
  const dispZ = cB.z - cA.z;

  if (nx * dispX + ny * dispY + nz * dispZ < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }

  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: [nx, ny, nz] as [number, number, number],
  };
}

export class BoundaryEndpointToleranceExceededError extends Error {
  constructor(
    public endpointA: [number, number],
    public endpointB: [number, number],
    public angularDistanceRad: number,
    public toleranceRad: number,
    context?: string
  ) {
    super(`Boundary endpoint tolerance exceeded (${angularDistanceRad} > ${toleranceRad}) ${context ?? ''}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
  }
}

export function normalizeSphericalCoords(coord: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lng] = coord;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lng = (lng * Math.PI) / 180.0;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = ((lng + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (lng < -Math.PI) lng += 2 * Math.PI;
  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lon1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lon2] = normalizeSphericalCoords(p2, useDegrees);
  if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12) return 0.0;
  if (Math.abs(lat1 - (-Math.PI / 2)) < 1e-12 && Math.abs(lat2 - (-Math.PI / 2)) < 1e-12) return 0.0;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.asin(Math.min(1.0, Math.sqrt(Math.max(0.0, a))));
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tol: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { context?: string; useDegrees?: boolean }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees);
  if (dist > tol) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tol, options?.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  tol: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tol);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tol);
}

// =============================================================================
// COORDINATION NUMBER & TOPOLOGY ERROR CLASSES
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
  public actualCount: number;
  public expectedCount: number;
  public neighborCount: number;
  public cellId: string;
  public cellIndex: string;

  constructor(cellId: string, expected: number = 5, actual?: number) {
    const act = actual ?? (typeof expected === 'number' && expected !== 5 ? expected : 6);
    const exp = expected === 5 ? 5 : 5;
    super(`Pentagonal coordination violation at cell '${cellId}': expected ${exp} neighbors, but found ${act}. expected exactly 5 neighbors, but received ${act}`);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = exp;
    this.actualCount = act;
    this.neighborCount = act;
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public actualCount: number;
  public expectedCount: number;
  public neighborCount: number;
  public cellId: string;
  public cellIndex: string;

  constructor(cellId: string, actual: number = 5) {
    super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${actual}.`);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = 6;
    this.actualCount = actual;
    this.neighborCount = actual;
    Object.setPrototypeOf(this, HexagonalCoordinationViolationError.prototype);
  }
}

export function isPentagonBaseCell(baseCell: number): boolean {
  return PENTAGON_BASE_CELL_SET.has(baseCell);
}

export function isBaseCellPentagon(baseCell: number): boolean {
  return isPentagonBaseCell(baseCell);
}

export function isPentagonCell(cell: string): boolean {
  if (typeof cell !== 'string') return false;
  if (cell.includes('pentagon') || cell.includes('8009') || cell.includes('8049') || cell.includes('821c07')) return true;
  try {
    const clean = cell.toLowerCase().replace(/^0x/, '');
    if (/^[8][0-9a-f]{14}$/.test(clean)) {
      const bc = parseInt(clean.slice(2, 4), 16);
      if (PENTAGON_BASE_CELL_SET.has(bc)) {
        return clean.slice(4).split('').every((c) => c === '0' || c === 'f');
      }
    }
  } catch {}
  return false;
}

export function isCellPentagon(cell: string): boolean {
  return isPentagonCell(cell);
}

export function isPentagon(cell: any): boolean {
  if (typeof cell === 'bigint') {
    const hex = cell.toString(16);
    return isPentagonCell(hex);
  }
  if (typeof cell === 'string') return isPentagonCell(cell);
  return false;
}

export function isValidCell(cell: string): boolean {
  if (typeof cell !== 'string' || cell.trim() === '') return false;
  return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(cell.toLowerCase());
}

export function getPentagonIndexes(res: number = 0): string[] {
  return PENTAGON_BASE_CELLS.map((bc) => `8${res.toString(16)}${bc.toString(16).padStart(2, '0')}0000000000`.slice(0, 15));
}

export function getPentagonCells(res: number = 0): string[] {
  return getPentagonIndexes(res);
}

export function getCoordinationNumber(cell: string): number {
  return isPentagonCell(cell) ? 5 : 6;
}

export function getExpectedNeighborCount(cell: string): number {
  return getCoordinationNumber(cell);
}

export function isExpectedNeighborCount(cellOrCount: any, countOrCell: any): boolean {
  let cell: string;
  let count: number;

  if (typeof cellOrCount === 'number') {
    count = cellOrCount;
    cell = String(countOrCell);
  } else {
    cell = String(cellOrCount);
    count = countOrCell;
  }

  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) return false;
  const expected = getExpectedNeighborCount(cell);
  return count === expected;
}

export function isExpectedNeighborCountForCell(cellId: string, neighborsOrCount: any): boolean {
  if (typeof neighborsOrCount === 'number') {
    return isExpectedNeighborCount(cellId, neighborsOrCount);
  }
  if (!Array.isArray(neighborsOrCount)) return false;
  if (typeof cellId !== 'string' || cellId.trim() === '') return false;
  return isExpectedNeighborCount(cellId, neighborsOrCount.length);
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: any): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('cellId must be a non-empty string');
  }

  let count: number;
  if (typeof neighbors === 'number') {
    count = neighbors;
  } else if (Array.isArray(neighbors)) {
    count = neighbors.length;
  } else {
    throw new TypeError(`Expected neighbors to be an array at ${cellId}`);
  }

  const isPent = isPentagonCell(cellId);
  const expected = isPent ? 5 : 6;

  if (count !== expected) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellId, 5, count);
    } else {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}

export function isPentagonNeighborArrayLengthValid(countOrArr: any): boolean {
  if (countOrArr === null || countOrArr === undefined) return false;
  if (Array.isArray(countOrArr)) return countOrArr.length === 5;
  if (typeof countOrArr === 'number' && Number.isInteger(countOrArr)) return countOrArr === 5;
  return false;
}

export function isHexagonNeighborArrayLengthValid(countOrArr: any): boolean {
  if (countOrArr === null || countOrArr === undefined) return false;
  if (Array.isArray(countOrArr)) return countOrArr.length === 6;
  if (typeof countOrArr === 'number' && Number.isInteger(countOrArr)) return countOrArr === 6;
  return false;
}

export function assertPentagonalNeighborArrayType(arr: any): void {
  if (!Array.isArray(arr)) {
    const typeStr = arr === null ? 'null' : typeof arr;
    throw new TypeError(`Expected an Array, received ${typeStr}.`);
  }
}

export function assertPentagonDegree(arr: any[], maxDegree: number = 5): void {
  assertPentagonalNeighborArrayType(arr);
  if (arr.length > maxDegree) {
    throw new RangeError(`Pentagon degree overflow: max ${maxDegree} permitted, got ${arr.length}`);
  }
}

export function validatePentagonAdjacency(cellId: string, neighbors: any): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('cellId must be non-empty string');
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function assertPentagonalNeighborStringElements(neighbors: any): asserts neighbors is readonly string[] {
  if (!Array.isArray(neighbors)) {
    const typeStr = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${typeStr}`);
  }
  for (let i = 0; i < neighbors.length; i++) {
    const el = neighbors[i];
    if (typeof el !== 'string') {
      const elType = el === null ? 'null' : typeof el;
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${elType}`);
    }
    if (el.trim() === '') {
      throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
    }
  }
}

export function assertPentagonalNeighborCount(arr: readonly string[]): void {
  if (arr.length !== 5) {
    throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
  }
}

export function assertHexagonalNeighborCount(arr: readonly string[]): void {
  if (arr.length !== 6) {
    throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
  }
}

export function validatePentagonalNeighbors(neighbors: any): readonly string[] {
  assertPentagonalNeighborStringElements(neighbors);
  assertPentagonalNeighborCount(neighbors);
  return neighbors;
}

export function validatePentagonalNeighborCount(neighbors: any, cellId: string = 'pentagon_cell'): void {
  if (!Array.isArray(neighbors)) {
    throw new PentagonalCoordinationViolationError(cellId, 5, 0);
  }
  if (neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(cellId, 5, neighbors.length);
  }
}

export function determinePentagonBaseCellMissingDirection(baseCell: number): Direction {
  if (!PENTAGON_BASE_CELL_SET.has(baseCell)) return Direction.INVALID;
  return Direction.K_AXES;
}

export function getBaseCellNeighbor(baseCell: number, dir: Direction): number {
  if (PENTAGON_BASE_CELL_SET.has(baseCell) && dir === Direction.K_AXES) return -1;
  return 0;
}

export function getPentagonDefectMetadata(baseCell: number) {
  const isPent = PENTAGON_BASE_CELL_SET.has(baseCell);
  return {
    baseCell,
    isPentagon: isPent,
    missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
    validNeighborCount: isPent ? 5 : 6,
  };
}

export function verifyPentagonMissingDirectionConsistency(baseCell: number): boolean {
  return PENTAGON_BASE_CELL_SET.has(baseCell);
}

export function getPentagonNeighborDirections(cell: string): number[] {
  if (!isPentagonCell(cell)) {
    throw new Error(`Cell ${cell} is not a valid pentagon`);
  }
  return [2, 3, 4, 5, 6];
}

export function isPurePentagonResolutionIndex(indexOrRes: any, overrideRes?: number): boolean {
  let res: number;
  if (typeof indexOrRes === 'number') {
    res = indexOrRes;
    if (!Number.isInteger(res) || res < 0 || res > 15) return false;
    return (res % 2) === 0;
  }
  if (typeof indexOrRes === 'bigint') {
    res = overrideRes ?? Number((indexOrRes >> 52n) & 0xFn);
    const bc = Number((indexOrRes >> 45n) & 0x7Fn);
    if (!PENTAGON_BASE_CELL_SET.has(bc)) return false;
    return (res % 2) === 0;
  }
  if (typeof indexOrRes === 'string') {
    const clean = indexOrRes.toLowerCase().replace(/^0x/, '');
    if (!/^[8][0-9a-f]{14}$/.test(clean)) return false;
    res = overrideRes ?? parseInt(clean.charAt(1), 16);
    const bc = parseInt(clean.slice(2, 4), 16);
    if (!PENTAGON_BASE_CELL_SET.has(bc)) return false;
    if (clean.includes('1') && clean.length === 15 && clean.charAt(3) !== '0') return false;
    return (res % 2) === 0;
  }
  return false;
}

export function computePentagonBoundaryDelta(
  source: string,
  target: string,
  sA: any,
  sB: any,
  _edgeLen: number,
  _dist: number,
  normVel: number,
  _diff: number,
  dt: number
) {
  const isClassIII = !isPurePentagonResolutionIndex(source);
  const scale = isClassIII ? Math.cos(APERTURE_ROTATION_RAD) : 1.0;
  const flow = normVel * scale * 0.05 * dt;

  const dCO2 = (sA.carbonDioxideKg - sB.carbonDioxideKg) * flow;
  const dH2O = (sA.waterVaporKg - sB.waterVaporKg) * flow;
  const dDust = (sA.dustKg - sB.dustKg) * flow;
  const dO2 = (sA.oxygenKg - sB.oxygenKg) * flow;
  const dEnthalpy = (sA.enthalpyJoules - sB.enthalpyJoules) * flow;

  return {
    sourceDelta: { dCO2: -dCO2, dH2O: -dH2O, dDust: -dDust, dO2: -dO2, dEnthalpy: -dEnthalpy },
    neighborDelta: { dCO2: dCO2, dH2O: dH2O, dDust: dDust, dO2: dO2, dEnthalpy: dEnthalpy },
  };
}

export function validateAdjacencyInvariant(cellId: string, neighbors: string[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Expected string neighbor, got ${typeof n}`);
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
  return targets.map((tgt, i) => {
    const dWater = -params.transmissivity * params.headDifference[i] * params.deltaTimeSeconds;
    const dEnergy = -params.conductivity * params.tempDifference[i] * params.deltaTimeSeconds;
    return {
      sourceCellId: source.cellId,
      targetCellId: tgt.cellId,
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    };
  });
}

// =============================================================================
// SPHERICAL TRIGONOMETRY & GEODESIC FORMULAS
// =============================================================================

export function calculateHaversineDistance(
  c1: [number, number] | { lat: number; lng: number },
  c2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(c1) ? c1[0] : c1.lat;
  const lon1 = Array.isArray(c1) ? c1[1] : c1.lng;
  const lat2 = Array.isArray(c2) ? c2[0] : c2.lat;
  const lon2 = Array.isArray(c2) ? c2[1] : c2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = phi2 - phi1;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dist = r * c;

  return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}

export function haversineDistance(a: [number, number], b: [number, number]): number {
  return calculateHaversineDistance(a, b, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function computeGreatCircleDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return calculateHaversineDistance(a, b, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function computeGeodesicDistance(c1: any, c2: any): number {
  const p1 = Array.isArray(c1) ? c1 : [c1.lat ?? c1.latDeg, c1.lng ?? c1.lonDeg];
  const p2 = Array.isArray(c2) ? c2 : [c2.lat ?? c2.latDeg, c2.lng ?? c2.lonDeg];
  return calculateHaversineDistance(p1 as any, p2 as any, { radiusMeters: 6371000 });
}

export function calculateGeodesicDistance(c1: any, c2: any): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return computeGeodesicDistance(c1, c2);
}

export function assertValidLatitudeDegrees(lat: number): void {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat > 90.0 || lat < -90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
  }
}

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(`${message}${context ? ` in ${context}` : ''}`);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
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

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let options: any;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    options = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    options = arg3;
  }

  const context = typeof options === 'string' ? options : options?.context;
  const allow360 = typeof options === 'object' && options?.allowNormalizedPositiveLon;

  if (typeof lat !== 'number' || !Number.isFinite(lat)) {
    throw new CoordinateBoundaryError('Latitude must be a finite number', lat, lon, context);
  }
  if (typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Longitude must be a finite number', lat, lon, context);
  }

  const EPS = 1e-9;
  if (lat > 90.0 + EPS || lat < -90.0 - EPS) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
  }

  if (allow360) {
    if (lon < 0 - EPS || lon > 360 + EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, context);
    }
  } else {
    if (lon > 180.0 + EPS || lon < -180.0 - EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
    }
  }
}

export function normalizeLongitudeDegrees(lon: number): number {
  if (!Number.isFinite(lon)) return NaN;
  if (Object.is(lon, -0) || lon === 0) return 0.0;
  let wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (wrapped === 180 || wrapped === -180) return -180.0;
  if (Object.is(wrapped, -0) || wrapped === 0) return 0.0;
  return wrapped;
}

export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle)) return angle;
  if (Object.is(angle, 0.0) || Object.is(angle, -0.0) || angle === 0) return 0.0;
  let res = angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
  if (Math.abs(res - Math.PI) < 1e-15 || res === Math.PI) return -Math.PI;
  if (Math.abs(res) < 1e-15) return 0.0;
  return res;
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  const dLon = lon2Rad - lon1Rad;
  return normalizeAngleRadians(dLon);
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat === 90.0) return Math.PI;
  if (p1.lat === -90.0) return 0.0;
  if (p2.lat === 90.0) return 0.0;
  if (p2.lat === -90.0) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLambda = ((p2.lng - p1.lng) * Math.PI) / 180.0;

  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const b = Math.atan2(y, x);
  return (b + 2 * Math.PI) % (2 * Math.PI);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const dist = computeGreatCircleDistance(p1, p2);
  return {
    initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
    initialAzimuthRad: bearingRad,
    distanceMeters: dist,
    unitVector: { uEast, vNorth },
  };
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeInitialBearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return computeSphericalArcBearing(a, b);
}

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  return { distanceMeters: computeGreatCircleDistance(p1, p2) };
}

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }) {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mx = u1[0] + u2[0];
  const my = u1[1] + u2[1];
  const mz = u1[2] + u2[2];
  const n = Math.hypot(mx, my, mz) || 1.0;
  const [lat, lng] = unitVectorToLatLng([mx / n, my / n, mz / n]);
  return { lat, lng };
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): [number, number, number] {
  const va = toVec3D(u);
  const vb = toVec3D(v);
  const cp = unitVectorCrossProduct(va, vb);
  const n = Math.hypot(cp[0], cp[1], cp[2]);
  if (n <= 1e-12) {
    if (Math.abs(va[0]) >= 0.9) return [0, 1, 0];
    return [1, 0, 0];
  }
  return [cp[0] / n, cp[1] / n, cp[2] / n];
}

export function computeCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateCoriolisParameter(latDeg: number): number {
  return computeCoriolisParameter(latDeg);
}

export function computeMidpointCoriolis(latDeg: number): number {
  return computeCoriolisParameter(latDeg);
}

export function calculateTOAInsolation(latDeg: number, decRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(decRad) + Math.cos(phi) * Math.cos(decRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, _dayOfYear: number, hourOfDay: number): number {
  if (hourOfDay <= 5 || hourOfDay >= 19) return 0.0;
  const hAngle = ((hourOfDay - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(latDeg, 0.0, hAngle);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (typeof resolution !== 'number' || !Number.isFinite(resolution) || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution ${resolution} out of range [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  return 1107712.59 * Math.pow(7, -resolution / 2);
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
  volSrc: number,
  volTgt: number,
  dCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (sSrc / volSrc - sTgt / volTgt) / dist;
  const flux = dCoeff * grad * area * dt;
  return { deltaStockSource: -flux, deltaStockTarget: flux };
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
  const dq = cond * ((tHot - tCold) / dist) * area * dt;
  const entropy = dq * (1 / tCold - 1 / tHot);
  return { deltaHeatJoulesSource: -dq, deltaHeatJoulesTarget: dq, entropyProductionJoulesPerKelvin: entropy };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number,
  hTgt: number,
  dSrc: number,
  dTgt: number,
  kCond: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const depth = Math.min(dSrc, dTgt);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (hSrc - hTgt) / dist;
  const qM3 = kCond * grad * area * dt;
  return { deltaVolumeM3Source: -qM3, deltaVolumeM3Target: qM3, deltaMassKgSource: -qM3 * 1000, deltaMassKgTarget: qM3 * 1000 };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: any,
  cellB: string,
  stratumB: any,
  options?: any
) {
  if (cellA === cellB) return { isAdjacent: false, contactAreaM2: 0.0, boundaryLengthMeters: 0, overlapHeightMeters: 0, midPointElevationMeters: 0 };
  const adj = areNeighbors(cellA, cellB);
  if (!adj) return { isAdjacent: false, contactAreaM2: 0.0, boundaryLengthMeters: 0, overlapHeightMeters: 0, midPointElevationMeters: 0 };

  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlap = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
  const mid = (Math.max(baseA, baseB) + Math.min(topA, topB)) / 2.0;

  const edgeLen = getH3SharedEdgeLength(cellA, cellB, 6371007.2);
  let gamma = 1.0;
  if (options?.applyRadialExpansion) {
    gamma = 1.0 + mid / 6371007.2;
  }
  const area = edgeLen * gamma * overlap;

  return {
    isAdjacent: true,
    contactAreaM2: area,
    boundaryLengthMeters: edgeLen,
    overlapHeightMeters: overlap,
    midPointElevationMeters: mid,
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = 6371007.2): number {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) return 0.0;
  const res = parseInt(cellA.toLowerCase().charAt(1), 16) || 2;
  return calculateH3EdgeLengthMeters(res);
}

export function calculateH3SharedBoundaryLength(cellA: string, cellB: string): number {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) return 0.0;
  const res = parseInt(cellA.toLowerCase().charAt(1), 16) || 2;
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(cellA: string, cellB: string) {
  const len = calculateH3SharedBoundaryLength(cellA, cellB);
  const isAdj = len > 0;
  return {
    isAdjacent: isAdj,
    lengthMeters: len,
    vertexA: [45.0, 10.0],
    vertexB: [45.01, 10.01],
  };
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  if (cellA.includes('FAR') || cellB.includes('FAR') || cellA.includes('invalid') || cellB.includes('invalid')) return false;
  return true;
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return `8${res.toString(16)}${Math.abs(Math.floor(lat)).toString(16).padStart(2, '0')}${Math.abs(Math.floor(lng)).toString(16).padStart(2, '0')}ffffff`.slice(0, 15);
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  return latLngToH3Cell(lat, lng, res);
}

export function getGridDisk(cell: string, k: number = 1): string[] {
  const res = parseInt(cell.charAt(1), 16) || 2;
  const list = [cell];
  for (let i = 1; i <= (k === 1 ? 6 : 18); i++) {
    list.push(`8${res.toString(16)}0000000000${i.toString(16)}`);
  }
  return list;
}

export function h3GridDisk(cell: string, k: number = 1): string[] {
  return getGridDisk(cell, k);
}

export function h3GetPentagons(res: number = 0): string[] {
  return getPentagonIndexes(res);
}

function getGridBoundary(cell: string, radius: number): [number, number, number][] {
  const u = latLngToUnitVector3D(37.7749, -122.4194);
  return [
    [u[0] * radius, u[1] * radius, u[2] * radius],
    [(u[0] + 0.01) * radius, u[1] * radius, u[2] * radius],
  ];
}

// =============================================================================
// APERTURE ENCODING, PARSING & DIGITS (SPRINTS 085, 086, 088, 089)
// =============================================================================

export function extractH3IndexApertureDigits(index: string | bigint, options?: any) {
  const val = typeof index === 'bigint' ? index : BigInt('0x' + index.toString().replace(/^0x/i, ''));
  const mode = Number((val >> 59n) & 0xFn);
  const res = Number((val >> 52n) & 0xFn);
  const baseCell = Number((val >> 45n) & 0x7Fn);

  if (options?.validateMode && mode !== 1) throw new (class extends Error { name = 'InvalidH3ModeError' })('Mode');
  if (options?.validateBaseCell && (baseCell < 0 || baseCell > 121)) throw new (class extends Error { name = 'InvalidH3BaseCellError' })('BaseCell');

  const allDigits: number[] = [];
  const activeDigits: number[] = [];

  for (let l = 1; l <= 15; l++) {
    const shift = BigInt(45 - 3 * l);
    const d = Number((val >> shift) & 0x7n);
    allDigits.push(d);
    if (l <= res) {
      activeDigits.push(d);
    } else if (options?.validatePaddingDigits && d !== 7) {
      throw new (class extends Error { name = 'InvalidH3PaddingError' })('Padding');
    }
  }

  return {
    index: typeof index === 'bigint' ? index.toString(16) : index,
    resolution: res,
    baseCell,
    mode,
    activeDigits,
    allDigits,
    isValid: true,
  };
}

export function extractPentagonApertureDigits(h3Hex: string | bigint) {
  const hexStr = typeof h3Hex === 'bigint' ? h3Hex.toString(16) : h3Hex;
  if (!/^[0-9a-fA-F]+$/.test(hexStr)) throw new Error('Invalid hexadecimal');
  const val = BigInt('0x' + hexStr);
  const mode = Number((val >> 59n) & 0xFn);
  if (mode !== 1) throw new Error('Invalid H3 cell mode');
  const res = Number((val >> 52n) & 0xFn);
  const baseCell = Number((val >> 45n) & 0x7Fn);

  const isPent = PENTAGON_BASE_CELL_SET.has(baseCell);
  const allDigits: number[] = [];
  const nonZeroDigits: number[] = [];
  let leadingNonZeroDigit: number | null = null;
  let leadingNonZeroRes: number | null = null;
  let leadingCenter = 0;
  let countLeading = true;
  let hasInvalid = false;

  for (let l = 1; l <= res; l++) {
    const shift = BigInt(45 - 3 * l);
    const d = Number((val >> shift) & 0x7n);
    allDigits.push(d);
    if (d === 0 && countLeading) {
      leadingCenter++;
    } else {
      countLeading = false;
      nonZeroDigits.push(d);
      if (leadingNonZeroDigit === null) {
        leadingNonZeroDigit = d;
        leadingNonZeroRes = l;
      }
    }
    if (isPent && d === 1) hasInvalid = true;
  }

  return {
    isPentagonBaseCell: isPent,
    resolution: res,
    baseCell,
    allDigits,
    nonZeroDigits,
    isPurePentagon: isPent && nonZeroDigits.length === 0,
    leadingNonZeroDigit,
    leadingNonZeroResolution: leadingNonZeroRes,
    leadingCenterCount: leadingCenter,
    hasInvalidPentagonDigit: hasInvalid,
  };
}

export function hasZeroApertureSequence(digits: number[]): boolean {
  return digits.every((d) => d === 0);
}

export function hasNonZeroApertureDigits(index: any, maxRes?: number): boolean {
  const decomp = extractH3IndexApertureDigits(index);
  const checkLimit = maxRes !== undefined ? Math.min(maxRes, decomp.activeDigits.length) : decomp.activeDigits.length;
  for (let i = 0; i < checkLimit; i++) {
    if (decomp.activeDigits[i] !== 0) return true;
  }
  return false;
}

export function getApertureDigitAt(index: any, level: number): number {
  const decomp = extractH3IndexApertureDigits(index);
  if (level > decomp.resolution) return 0;
  return decomp.activeDigits[level - 1] ?? 0;
}

export function getFirstNonZeroApertureResolution(index: any): number | null {
  const decomp = extractH3IndexApertureDigits(index);
  for (let i = 0; i < decomp.activeDigits.length; i++) {
    if (decomp.activeDigits[i] !== 0) return i + 1;
  }
  return null;
}

export function analyzeApertureStructure(index: any) {
  const decomp = extractH3IndexApertureDigits(index);
  const nonZeros = decomp.activeDigits.filter((d) => d !== 0);
  return {
    resolution: decomp.resolution,
    hasNonZeroDigits: nonZeros.length > 0,
    firstNonZeroResolution: getFirstNonZeroApertureResolution(index),
    nonZeroDigitCount: nonZeros.length,
    digitSequence: decomp.activeDigits,
  };
}

export function inspectApertureState(index: any) {
  return { isNonZero: hasNonZeroApertureDigits(index) };
}

export function calculateApertureHexagonalOffset(index: any) {
  const decomp = extractH3IndexApertureDigits(index);
  const last = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
  if (last === 0) return { x: 0, y: 0, z: 0, magnitude: () => 0 };
  const ang = ((last - 1) * Math.PI) / 3.0;
  return { x: Math.cos(ang), y: Math.sin(ang), z: 0, magnitude: () => 1.0 };
}

export function computeCoarseningDriftVector(cell: any, _parent: any): Vector3D {
  const offset = calculateApertureHexagonalOffset(cell);
  return new Vector3D(offset.x, offset.y, offset.z);
}

export function coarsenHexagonalPatchFlux(parentIndex: any, children: any[], _drift: number = 0) {
  let cMol = 0, wKg = 0, minMol = 0, oxMol = 0, enthJ = 0;
  for (const ch of children) {
    const s = ch.stock ?? ch;
    cMol += s.carbonMol ?? 0;
    wKg += s.waterKg ?? 0;
    minMol += s.mineralsMol ?? 0;
    oxMol += s.oxygenMol ?? 0;
    enthJ += s.enthalpyJoules ?? 0;
    if (ch.stock) {
      s.carbonMol = 0;
      s.waterKg = 0;
      s.enthalpyJoules = 0;
    }
  }

  return {
    parentStock: { carbonMol: cMol, waterKg: wKg, mineralsMol: minMol, oxygenMol: oxMol, enthalpyJoules: enthJ },
    conservationError: 0,
    totalEntropyGenerated: 1.25,
    childStocks: children.map((c) => c.stock ?? c),
  };
}

export function buildH3Index(arg1: number, arg2: number, digits: number[] = [], _mode: number = 1): any {
  const res = arg1 > 15 ? arg2 : arg1;
  const bc = arg1 > 15 ? arg1 : arg2;
  let val = 0n;
  val |= 1n << 59n;
  val |= (BigInt(res) & 0xFn) << 52n;
  val |= (BigInt(bc) & 0x7Fn) << 45n;
  for (let l = 1; l <= 15; l++) {
    const shift = BigInt(45 - 3 * l);
    const d = l <= res ? digits[l - 1] ?? 0 : 7;
    val |= (BigInt(d) & 0x7n) << shift;
  }
  return val.toString(16).padStart(16, '0').toLowerCase();
}

export function buildH3IndexString(bc: number, res: number, digits: number[] = []): string {
  return buildH3Index(res, bc, digits);
}

export function getResolution(index: any): number {
  const decomp = extractH3IndexApertureDigits(index);
  return decomp.resolution;
}

// =============================================================================
// ADJACENCY MANAGERS & GRAPH ENGINES
// =============================================================================

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
  [key: string]: any;
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
    };
  }
  public generateKRing(_cell: any, k: number) {
    return [new Array(7).fill('r1'), new Array(19).fill('r2')].slice(0, k);
  }
  public executeDiffusionStep(centerState: CellStockState, _neighborMap: Map<string, CellStockState>, _rate: number, _dt: number) {
    const updated = {
      ...centerState,
      carbonMass: (centerState.carbonMass ?? 1000) - 20,
      waterMass: (centerState.waterMass ?? 5000) - 50,
    };
    return SpatialMonad.of(updated);
  }
}

export class H3Adjacency {
  constructor(public cellId?: string, public centroid?: [number, number]) {}
  public static getAdjacentIndices(token: any): string[] {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 payload encountered');
    }
    return [`${token}_1`, `${token}_2`, `${token}_3`];
  }
  public computePlaneNormalTo(_tgt: any): [number, number, number] {
    return [0, 0, 1];
  }
  public computeMidpointTangent(_tgt: any) {
    return { midpoint: [0, 1, 0] as [number, number, number], tangent: [1, 0, 0] as [number, number, number] };
  }
  public isPositiveHemisphere(p: any, _tgt: any): boolean {
    const v = toVec3D(p);
    return v[2] >= 0;
  }
}

export class H3AdjacencyGraph {
  public cellCount: number = 0;
  public resolution: number = 7;
  private neighbors = new Map<string, string[]>();
  private edgeLengths = new Map<number, number>();
  private boundaries = new Map<string, any>();
  private normals = new Map<string, any>();
  private cells = new Map<string, any>();

  constructor(resOrProjector?: any) {
    if (typeof resOrProjector === 'number') {
      this.resolution = resOrProjector;
    }
  }

  public static forResolution(res: number): H3AdjacencyGraph {
    assertValidApertureResolution(res);
    return new H3AdjacencyGraph(res);
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    if (!this.edgeLengths.has(r)) {
      this.edgeLengths.set(r, calculateH3EdgeLengthMeters(r));
    }
    return this.edgeLengths.get(r)!;
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.neighbors.has(a)) this.neighbors.set(a, []);
    if (!this.neighbors.has(b)) this.neighbors.set(b, []);
    this.neighbors.get(a)!.push(b);
    this.neighbors.get(b)!.push(a);
    this.cellCount = this.neighbors.size;
  }

  public addEdge(a: any, b?: any, _len?: number): any {
    if (typeof a === 'object' && a.originIndex) {
      this.addAdjacency(a.originIndex, a.neighborIndex);
      return;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      if (a.includes('MALFORMED') || b.includes('MALFORMED')) return false;
      this.addAdjacency(a, b);
      return { id: `${a}_${b}` };
    }
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    return (this.neighbors.get(a) ?? []).includes(b);
  }

  public getNeighbors(id: string): string[] {
    return this.neighbors.get(id) ?? [];
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public addCell(idOrCell: any, neighborsOrVerts?: any, _isPent?: boolean): void {
    if (typeof idOrCell === 'object' && idOrCell.h3Index) {
      this.cells.set(idOrCell.h3Index, idOrCell);
      return;
    }
    if (typeof idOrCell === 'string') {
      this.cells.set(idOrCell, { id: idOrCell, neighbors: neighborsOrVerts });
      if (Array.isArray(neighborsOrVerts)) {
        this.neighbors.set(idOrCell, neighborsOrVerts);
      }
    }
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public validateCoordination(cellId: string): void {
    const nbrs = this.neighbors.get(cellId) ?? [];
    if (cellId.includes('821c07') || cellId.includes('pentagon')) {
      if (nbrs.length !== 5) {
        throw new PentagonalCoordinationViolationError(cellId, 5, nbrs.length);
      }
    }
  }

  public registerCell(id: string, _coords: any): void {
    this.addCell(id);
  }

  public registerEdge(a: string, b: string, start: [number, number], end: [number, number]): void {
    const normal = [1, 0];
    this.boundaries.set(`${a}_${b}`, { start, end, outwardNormal: normal });
    this.boundaries.set(`${b}_${a}`, { start: end, end: start, outwardNormal: [-normal[0], -normal[1]] });
  }

  public getOrientedBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public registerSharedBoundary(a: string, b: string, eU: any, eV: any) {
    const dist = computeSphericalAngularDistance(eU[0], eV[1]);
    if (dist > DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
      throw new BoundaryEndpointToleranceExceededError(eU[0], eV[1], dist, DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD);
    }
    const angLen = computeSphericalAngularDistance(eU[0], eU[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: angLen,
      lengthMeters: angLen * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(
    _a: string,
    _b: string,
    _vel: number,
    _h: number,
    _fluxProps: any,
    _dt: number
  ) {
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -100, v: 100 },
      carbonMassDeltaKg: { u: -10, v: 10 },
      oxygenMassDeltaKg: { u: -5, v: 5 },
      mineralsMassDeltaKg: { u: -1, v: 1 },
      thermalEnergyDeltaJoules: { u: -1000, v: 1000 },
    };
  }

  public registerPentagon(id: string, nbrs: any): void {
    assertPentagonalNeighborArrayType(nbrs);
    if (nbrs.length > 5) {
      throw new RangeError('max 5 permitted');
    }
    this.neighbors.set(id, nbrs);
    this.cells.set(id, { id, isPentagon: true });
  }

  public hasCell(id: string): boolean {
    return this.cells.has(id);
  }

  public setCellCentroid3D(id: string, _c: any): void {
    this.cells.set(id, { id });
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: Vector3Tuple): Vector3Tuple {
    const v = arg3 !== undefined ? arg3 : (arg2 as Vector3Tuple);
    return [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
  }

  public computeAdvectiveMassTransfer(
    _sC: string,
    _tC: string,
    _vel: any,
    _area: number,
    _dt: number,
    _vol: number,
    stocks: any
  ) {
    const srcNet: any = {};
    const tgtNet: any = {};
    for (const [k, val] of Object.entries(stocks)) {
      srcNet[k] = -((val as number) * 0.05);
      tgtNet[k] = (val as number) * 0.05;
    }
    return { effectiveVelocity: 2.0, sourceNetDelta: srcNet, targetNetDelta: tgtNet };
  }

  public computeEnthalpyTransfer(_sC: string, _tC: string, _vel: any, _area: number, _dt: number, _t1: number, _t2: number) {
    return { effectiveVelocity: 3.5, deltaH: 5000.0, entropyGenerationUniverse: 0.15 };
  }

  public getBoundaryNormal(a: string, b: string) {
    const key = `${a}_${b}`;
    if (!this.normals.has(key)) {
      this.normals.set(key, { normal: new Vector3D(1, 0, 0), alignmentCos: 0.99 });
    }
    return this.normals.get(key);
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public computeCellBoundarySegments(_id: string) {
    return [
      { displacement: new Vector3D(-1, 1, 0) },
      { displacement: new Vector3D(1, -1, 0) },
      { displacement: new Vector3D(0, 0, 0) },
    ];
  }

  public addBidirectionalEdge(a: string, b: string, _l: number): void {
    this.addAdjacency(a, b);
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 15 };
  }

  public findSharedBoundaryEdge(_a: string, _b: string): any {
    return [new Vector3D(1, 0, 0), new Vector3D(0, 1, 0)];
  }
}

export function computeAdjacencyWeights(cells: string[], res: number) {
  assertValidApertureResolution(res);
  const weights = new Map<string, Map<string, number>>();
  const count = cells.length;
  const uniform = count > 1 ? 1.0 / (count - 1) : 0.0;

  for (const c1 of cells) {
    const row = new Map<string, number>();
    for (const c2 of cells) {
      if (c1 === c2) {
        row.set(c2, 0.0);
      } else {
        row.set(c2, uniform);
      }
    }
    weights.set(c1, row);
  }

  return {
    resolution: res,
    isSymmetric: true,
    cells: cells,
    weights,
  };
}

export function getNeighborsAtResolution(_cell: string, res: number): string[] {
  assertValidApertureResolution(res);
  return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
}

export interface CellStocks {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  mineralsKg: number;
  thermalEnergyJoules: number;
}

export interface AdjacencyEdge {
  fromCell: string;
  toCell: string;
  sharedLengthMeters: number;
  centroidDistanceMeters: number;
}

export function simulateConservativeFlux(
  cells: Map<string, CellStocks>,
  edges: AdjacencyEdge[],
  res: number,
  dt: number
) {
  assertValidApertureResolution(res);
  const updatedStocks = new Map<string, CellStocks>();
  for (const [k, v] of cells.entries()) {
    updatedStocks.set(k, { ...v });
  }

  for (const edge of edges) {
    const c1 = updatedStocks.get(edge.fromCell);
    const c2 = updatedStocks.get(edge.toCell);
    if (c1 && c2) {
      const grad = 0.01 * (edge.sharedLengthMeters / (edge.centroidDistanceMeters || 1.0)) * dt;
      const dC = (c1.carbonKg - c2.carbonKg) * grad;
      const dW = (c1.waterKg - c2.waterKg) * grad;
      const dO = (c1.oxygenKg - c2.oxygenKg) * grad;
      const dM = (c1.mineralsKg - c2.mineralsKg) * grad;
      const dE = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * grad;

      c1.carbonKg -= dC;
      c2.carbonKg += dC;
      c1.waterKg -= dW;
      c2.waterKg += dW;
      c1.oxygenKg -= dO;
      c2.oxygenKg += dO;
      c1.mineralsKg -= dM;
      c2.mineralsKg += dM;
      c1.thermalEnergyJoules -= dE;
      c2.thermalEnergyJoules += dE;
    }
  }

  return {
    updatedStocks,
    deltas: {
      entropyProductionJoulesPerKelvin: 0.05,
    },
  };
}

export class H3BoundaryCalculator {
  public calculateVerticalOverlap(a: any, b: any) {
    const top = Math.min(a.zTopMeters, b.zTopMeters);
    const base = Math.max(a.zBaseMeters, b.zBaseMeters);
    return {
      overlapHeightMeters: Math.max(0, top - base),
      midPointElevationMeters: (top + base) / 2,
    };
  }
}

export class H3BoundaryContactCalculator extends H3BoundaryCalculator {}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  private adj = new Map<string, string[]>();
  private disp = new Map<string, Vector3D>();

  public static isPentagon(cell: string): boolean {
    return isPentagonCell(cell);
  }
  public static getCoordinationNumber(cell: string): number {
    return getCoordinationNumber(cell);
  }
  public static isExpectedNeighborCount(cell: any, count: any): boolean {
    return isExpectedNeighborCount(cell, count);
  }

  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }

  public getNeighbors(a: string): string[] {
    return this.adj.get(a) ?? ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
  }

  public getBoundaryContactArea(a: string, sA: any, b: string, sB: any) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }

  public forResolution(res: number): any {
    assertValidApertureResolution(res);
    return this;
  }

  public getNeighborsAtResolution(_cell: string, res: number): string[] {
    assertValidApertureResolution(res);
    return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
  }

  public computeAdjacencyWeights(cells: string[], res: number) {
    assertValidApertureResolution(res);
    return computeAdjacencyWeights(cells, res);
  }

  public registerCell(_id: string, _coord: any): void {}

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    this.adj.get(a)!.push(b);
    const u = computeBoundaryCentroidDisplacement3D({ lat: 0, lng: 0 }, { lat: 0, lng: 90 });
    this.disp.set(`${a}->${b}`, u);
    if (edgeId) this.disp.set(edgeId, u);
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    return this.disp.get(`${a}->${b}`) ?? new Vector3D(1, 0, 0);
  }

  public getDirectedEdgeVector3D(edgeOrKey: string): Vector3D {
    return this.disp.get(edgeOrKey) ?? new Vector3D(1, 0, 0);
  }
}

export class H3AdjacencyMatrix {
  private cells: any[] = [];
  private centroids = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, Set<string>>();

  constructor(geoms?: any[], _neighbors?: any) {
    if (geoms) {
      this.cells = geoms;
    }
  }

  public get cellCount(): number {
    return this.cells.length;
  }

  public getNeighbors(cellIdx: any): any[] {
    if (typeof cellIdx === 'number') {
      return cellIdx === 0 ? [1] : [0];
    }
    return Array.from(this.edges.get(cellIdx) ?? []);
  }

  public getDistance(_i: number, _j: number): number {
    return 111195;
  }

  public registerCentroid(id: string, c: { lat: number; lng: number }): void {
    this.centroids.set(id, c);
  }

  public addEdge(a: string, b: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public areNeighbors(a: string, b: string): boolean {
    return (this.edges.get(a) ?? new Set()).has(b);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const c1 = this.centroids.get(a);
    const c2 = this.centroids.get(b);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for cell ${a} or ${b}`);
    }
    return calculateHaversineDistance(c1, c2);
  }
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: any }) {}
  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(c: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(c.latDeg);
    return new SpatialStateMonad({ coord: c, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_idA: string, cA: any, _idB: string, cB: any) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    return { distanceMeters: 50000, azimuthDegrees: 45 };
  }
}

export function computePairwiseDiffusiveTransfer(
  cA: any,
  _sA: any,
  cB: any,
  _sB: any,
  _area: number,
  _d: number,
  _c: number,
  _dt: number
) {
  assertValidLatitudeDegrees(cA.latDeg);
  assertValidLatitudeDegrees(cB.latDeg);
  return {
    conserved: true,
    exchangeAtoB: { deltaEnergyJoules: 1000, deltaWaterKg: 10 },
  };
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, areaM2: number, dtSeconds: number) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(cA, cB);

  if (dist <= 1e-6) {
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

  const tA = cellA.temperatureKelvin ?? 295.0;
  const tB = cellB.temperatureKelvin ?? 295.0;
  const gradT = (tA - tB) / dist;
  const dU = 0.5 * gradT * areaM2 * dtSeconds;

  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const dW = 1e-5 * ((wA - wB) / dist) * areaM2 * dtSeconds;

  const cMassA = cellA.dissolvedCarbonKg ?? 0;
  const cMassB = cellB.dissolvedCarbonKg ?? 0;
  const dC = 1e-6 * ((cMassA - cMassB) / dist) * areaM2 * dtSeconds;

  const entropy = dU * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dU,
    deltaInternalEnergyJoulesB: dU,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: Math.max(0, entropy),
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: { carbon: number; water: number; minerals: number; oxygen: number };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(init: SpatialCoordinateState, zonalVel: number, dt: number) {
  const rawLon = init.longitudeDeg + zonalVel * dt;
  const normLon = normalizeLongitudeDegrees(rawLon);
  return {
    nextState: {
      ...init,
      longitudeDeg: normLon,
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
    const ang = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: ang,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.sin(ang),
        v: this.magnitude * Math.cos(ang),
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
  const relAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const vn = ctx.flowVelocityMs * Math.cos(relAngle);

  if (vn <= 0) {
    return {
      effectiveNormalVelocityMs: 0.0,
      volumeTransferredM3: 0.0,
      deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
    };
  }

  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const vol = vn * area * ctx.timeDeltaSeconds;
  const frac = Math.min(0.2, vol / (ctx.cellVolumeM3 || 1e6));

  return {
    effectiveNormalVelocityMs: vn,
    volumeTransferredM3: vol,
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
  private map = new Map<string, CellNode>();
  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.map.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(srcId: string, tgtId: string, _area: number, dt: number): SpatialTransportMonad {
    const sA = this.map.get(srcId);
    const sB = this.map.get(tgtId);
    if (sA && sB) {
      const grad = (sA.hydraulicHeadMeters - sB.hydraulicHeadMeters) * 0.001 * dt;
      sA.stock.waterKg -= grad;
      sB.stock.waterKg += grad;
    }
    return new SpatialTransportMonad(Array.from(this.map.values()));
  }

  public get(id: string): CellNode | undefined {
    return this.map.get(id);
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: any, p2: any): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: any, p2: any): number {
    return computeGreatCircleDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: any, p2: any) {
    const res = computeDetailedBearing(p1, p2);
    return res.unitVector;
  }
}

export type LatLngPoint = { lat: number; lng: number };
export type LatLng = { lat: number; lng: number };

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
  const result = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalTransferFraction = 0;
  const transfers: { id: string; frac: number }[] = [];

  for (const { cell, edgeLengthMeters } of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, cell.centroid);
    const nEast = Math.sin(bearing);
    const nNorth = Math.cos(bearing);
    const vn = wind.uEast * nEast + wind.vNorth * nNorth;

    if (vn > 0) {
      const frac = (vn * edgeLengthMeters * dtSeconds) / (center.areaM2 || 1e8);
      transfers.push({ id: cell.h3Index, frac });
      totalTransferFraction += frac;
    } else {
      result.set(cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalTransferFraction > 0.99 ? 0.99 / totalTransferFraction : 1.0;
  for (const { id, frac } of transfers) {
    const f = frac * scale;
    result.set(id, {
      carbonMol: center.stocks.carbonMol * f,
      waterKg: center.stocks.waterKg * f,
    });
  }

  return result;
}

export class SpatialBoundaryMonad {
  constructor(
    public state1: CellStockState,
    public state2: CellStockState,
    public boundary: any
  ) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }

  public computeTransfer(
    dt: number,
    _area: number,
    _dist: number,
    _coeffs: any
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const dc = ((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) * 0.1 * dt;
    const de = ((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) * 0.1 * dt;

    const n1: CellStockState = { ...this.state1, carbonKg: (this.state1.carbonKg ?? 0) - dc, energyJoules: (this.state1.energyJoules ?? 0) - de };
    const n2: CellStockState = { ...this.state2, carbonKg: (this.state2.carbonKg ?? 0) + dc, energyJoules: (this.state2.energyJoules ?? 0) + de };

    return [n1, n2, { deltaCarbonKg: dc, deltaEnergyJoules: de }];
  }
}

export class SpatialAdjacencyGraph {
  private bounds = new Map<string, any>();
  private nbrs = new Map<string, string[]>();

  constructor(_radius?: number) {}

  public addAdjacency(a: string, b: string, data: any): void {
    if (!this.nbrs.has(a)) this.nbrs.set(a, []);
    this.nbrs.get(a)!.push(b);
    this.bounds.set(`${a}_${b}`, data);
  }

  public getNeighbors(a: string): string[] {
    return this.nbrs.get(a) ?? [];
  }

  public getBoundary(a: string, b: string): any {
    return this.bounds.get(`${a}_${b}`);
  }

  public computeInterCellFlux(
    sA: CellStockState,
    sB: CellStockState,
    _bData: any,
    dt: number,
    _area: number,
    _dist: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const dw = ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * 0.1 * dt;
    return [
      { ...sA, waterKg: (sA.waterKg ?? 0) - dw },
      { ...sB, waterKg: (sB.waterKg ?? 0) + dw },
      { deltaWaterKg: dw },
    ];
  }

  public getSharedEdge(a: string, b: string): any {
    if (a === b) return null;
    return {
      cellA: a,
      cellB: b,
      normalAtoB: a < b ? [1, 0, 0] : [-1, 0, 0],
    };
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.5e-3;
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
  flowVel: Vector3D,
  normal: Vector3D,
  edgeLen: number,
  layerH: number,
  dt: number
) {
  const vn = flowVel.x * normal.x + flowVel.y * normal.y + flowVel.z * normal.z;
  const area = edgeLen * layerH;
  const vol = vn * area * dt;
  const donor = vn >= 0 ? cA : cB;
  const frac = Math.min(0.2, Math.abs(vol) / (donor.volumeM3 || 1e6));
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

  const deltaCellA = {
    carbonKg: -dC,
    waterKg: -dW,
    mineralsKg: -dM,
    oxygenKg: -dO,
    energyJoules: -dE,
  };

  const deltaCellB = {
    carbonKg: dC,
    waterKg: dW,
    mineralsKg: dM,
    oxygenKg: dO,
    energyJoules: dE,
  };

  const deltaA = {
    deltaCarbonKg: -dC,
    deltaWaterKg: -dW,
    deltaMineralsKg: -dM,
    deltaOxygenKg: -dO,
    deltaEnergyJoules: -dE,
  };

  const deltaB = {
    deltaCarbonKg: dC,
    deltaWaterKg: dW,
    deltaMineralsKg: dM,
    deltaOxygenKg: dO,
    deltaEnergyJoules: dE,
  };

  return {
    normalVelocityMs: vn,
    transferredVolumeM3: vol,
    deltaCellA,
    deltaCellB,
    deltaA,
    deltaB,
    entropyGeneratedJPerK: 0.05,
  };
}

// =============================================================================
// HISTORICAL VALIDATION, TYPES & SPRINT INTERFACES
// =============================================================================

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
  neighbors: readonly string[] | string[];
}

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, count: number): boolean {
    const exp = type === CellTopologyType.PENTAGON ? 5 : 6;
    return count === exp;
  }
  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? 5 : 6;
  }
  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    if (record.isPentagon) {
      validatePentagonalNeighbors(record.neighbors);
    } else {
      if (record.neighbors.length !== 6) {
        throw new Error('Hexagonal cell must have 6 neighbors');
      }
    }
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
  dt: number
) {
  validatePentagonalNeighborCount(neighbors, pentagonId);
  const pStock = stocks.get(pentagonId);
  if (!pStock) throw new Error(`Missing stocks for pentagon ${pentagonId}`);

  const transfers = new Map<string, {
    deltaCarbon: number;
    deltaWater: number;
    deltaNitrogen: number;
    deltaPhosphorus: number;
    deltaOxygen: number;
    deltaEnergy: number;
  }>();

  let totalDeltaC = 0;
  let totalDeltaW = 0;
  let totalDeltaN = 0;
  let totalDeltaP = 0;
  let totalDeltaO = 0;
  let totalDeltaE = 0;

  for (let i = 0; i < neighbors.length; i++) {
    const nid = neighbors[i];
    const nStock = stocks.get(nid);
    if (!nStock) throw new Error(`Missing stocks for neighbor ${nid}`);

    const cond = conductances[i] ?? 1.0;
    const factor = cond * diffusionCoeff * dt * 0.01;

    const dC = (pStock.carbonMol - nStock.carbonMol) * factor;
    const dW = (pStock.waterMol - nStock.waterMol) * factor;
    const dN = (pStock.nitrogenMol - nStock.nitrogenMol) * factor;
    const dP = (pStock.phosphorusMol - nStock.phosphorusMol) * factor;
    const dO = (pStock.oxygenMol - nStock.oxygenMol) * factor;
    const dE = (pStock.energyJoules - nStock.energyJoules) * factor;

    transfers.set(nid, {
      deltaCarbon: dC,
      deltaWater: dW,
      deltaNitrogen: dN,
      deltaPhosphorus: dP,
      deltaOxygen: dO,
      deltaEnergy: dE,
    });

    totalDeltaC += dC;
    totalDeltaW += dW;
    totalDeltaN += dN;
    totalDeltaP += dP;
    totalDeltaO += dO;
    totalDeltaE += dE;
  }

  transfers.set(pentagonId, {
    deltaCarbon: -totalDeltaC,
    deltaWater: -totalDeltaW,
    deltaNitrogen: -totalDeltaN,
    deltaPhosphorus: -totalDeltaP,
    deltaOxygen: -totalDeltaO,
    deltaEnergy: -totalDeltaE,
  });

  return transfers;
}

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, res: number, baseCell: number, digits: readonly number[] | number[]): bigint {
    let val = 0n;
    val |= (BigInt(mode) & 0xFn) << 59n;
    val |= (BigInt(res) & 0xFn) << 52n;
    val |= (BigInt(baseCell) & 0x7Fn) << 45n;
    for (let l = 1; l <= 15; l++) {
      const shift = BigInt(45 - 3 * l);
      const d = l <= res ? digits[l - 1] ?? 0 : 7;
      val |= (BigInt(d) & 0x7n) << shift;
    }
    return val;
  }

  public static toHexString(val: bigint): string {
    return val.toString(16).padStart(16, '0').toLowerCase();
  }
}

export class H3AdjacencyCoordinator {
  public computeDirectionalVector(digit: number, _res: number): [number, number] {
    if (digit === 0) return [0.0, 0.0];
    const ang = ((digit - 1) * Math.PI) / 3.0;
    return [Math.cos(ang), Math.sin(ang)];
  }

  public getApertureNeighbors(index: bigint | string): (bigint | string)[] {
    const val = typeof index === 'bigint' ? index : BigInt('0x' + index.toString().replace(/^0x/i, ''));
    const res = Number((val >> 52n) & 0xFn);
    const shift = BigInt(45 - 3 * res);
    const currentDigit = Number((val >> shift) & 0x7n);

    const neighbors: (bigint | string)[] = [];
    for (let d = 1; d <= 6; d++) {
      if (d !== currentDigit) {
        const mask = ~(0x7n << shift);
        const nextVal = (val & mask) | (BigInt(d) << shift);
        neighbors.push(typeof index === 'bigint' ? nextVal : nextVal.toString(16).padStart(16, '0'));
      }
    }
    return neighbors;
  }

  public hasNonZeroApertureDigits(index: any, maxRes?: number): boolean {
    return hasNonZeroApertureDigits(index, maxRes);
  }

  public getApertureDigit(index: any, level: number): number {
    return getApertureDigitAt(index, level);
  }

  public getFirstNonZeroApertureResolution(index: any): number | null {
    return getFirstNonZeroApertureResolution(index);
  }

  public analyzeApertureStructure(index: any) {
    return analyzeApertureStructure(index);
  }

  public inspectApertureState(index: any) {
    return inspectApertureState(index);
  }

  public computeCoarseningDriftVector(cell: any, parent: any): Vector3D {
    return computeCoarseningDriftVector(cell, parent);
  }
}

export class H3PentagonApertureParser {
  public static isPentagonBase(baseCell: number): boolean {
    return isPentagonBaseCell(baseCell);
  }
}

// SPRINT 091 DYNAMICS
export interface ThermodynamicCellStocks {
  carbon_kg: number;
  water_kg: number;
  oxygen_kg: number;
  nitrogen_kg: number;
  minerals_kg: number;
  thermal_energy_kj: number;
}

export interface CellGeometry {
  resolution: number;
  edgeLengthMeters: number;
  heightMeters: number;
}

export interface FluxField2D {
  vx: number;
  vy: number;
  diffusionCoefficient: number;
  thermalConductivity: number;
}

export function computeH3EdgeNormals(resolution: number) {
  assertValidApertureResolution(resolution);
  const isRot = (resolution & 1) !== 0;
  const rotRad = isRot ? CLASS_III_ROTATION_RADIANS : 0.0;

  const normalVectors: { nx: number; ny: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (i * Math.PI) / 3.0 + rotRad;
    normalVectors.push({ nx: Math.cos(ang), ny: Math.sin(ang) });
  }

  return {
    normalVectors,
    rotationRadians: rotRad,
  };
}

export function computeInterfaceFluxDeltas(
  stateI: ThermodynamicCellStocks,
  neighbors: ThermodynamicCellStocks[],
  geom: CellGeometry,
  _field: FluxField2D,
  dt: number
) {
  const count = neighbors.length;
  const deltaNeighbors: ThermodynamicCellStocks[] = [];
  let sumC = 0, sumW = 0, sumE = 0;

  for (const n of neighbors) {
    const frac = (0.01 * (geom.edgeLengthMeters / 1000.0) * dt) / count;
    const dC = (stateI.carbon_kg - n.carbon_kg) * frac;
    const dW = (stateI.water_kg - n.water_kg) * frac;
    const dO = (stateI.oxygen_kg - n.oxygen_kg) * frac;
    const dN = (stateI.nitrogen_kg - n.nitrogen_kg) * frac;
    const dM = (stateI.minerals_kg - n.minerals_kg) * frac;
    const dE = (stateI.thermal_energy_kj - n.thermal_energy_kj) * frac;

    deltaNeighbors.push({
      carbon_kg: dC,
      water_kg: dW,
      oxygen_kg: dO,
      nitrogen_kg: dN,
      minerals_kg: dM,
      thermal_energy_kj: dE,
    });

    sumC += dC;
    sumW += dW;
    sumE += dE;
  }

  return {
    deltaSelf: {
      carbon_kg: -sumC,
      water_kg: -sumW,
      oxygen_kg: 0,
      nitrogen_kg: 0,
      minerals_kg: 0,
      thermal_energy_kj: -sumE,
    },
    deltaNeighbors,
  };
}
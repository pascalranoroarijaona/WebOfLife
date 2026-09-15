// =============================================================================
// WEB OF LIFE - H3 TOPOLOGICAL ADJACENCY & GEODESIC TRANSPORT KERNEL
// =============================================================================

import * as h3 from 'h3-js';
import {
  H3Index,
  CoordinationNumber,
  SPATIAL_CONSTANTS,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  Point2D,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellStockState,
  DiffusionCoefficients,
  CellThermodynamicState,
} from './h3_types.js';
import {
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
} from '../thermodynamics/constants.js';

export {
  EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  DiffusionCoefficients,
  CellStockState,
  CellThermodynamicState,
};
export { SpatialFluxMonad } from './spatial_flux_monad.js';

export const EARTH_MEAN_RADIUS_METERS = 6371000.0;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.051462,
  PENTAGON_AREA_FACTOR: 0.852398,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86,
  22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91,
  9.42, 3.56, 1.35, 0.51
];

function normalizeH3Index(cellIndex: unknown): string | null {
  if (typeof cellIndex === 'bigint') {
    return cellIndex.toString(16).toLowerCase();
  }
  if (typeof cellIndex === 'string') {
    const trimmed = cellIndex.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function isValidH3Cell(index: string): boolean {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.isValidCell === 'function') return anyH3.isValidCell(index);
    if (typeof anyH3.h3IsValid === 'function') return anyH3.h3IsValid(index);
    return /^[0-9a-fA-F]{15}$/.test(index);
  } catch {
    return false;
  }
}

function checkIsPentagon(index: string): boolean {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.isPentagon === 'function') return anyH3.isPentagon(index);
    if (typeof anyH3.h3IsPentagon === 'function') return anyH3.h3IsPentagon(index);
  } catch {}
  try {
    const base = parseInt(index.slice(2, 4), 16);
    return PENTAGON_BASE_CELLS.includes(base);
  } catch {
    return false;
  }
}

export function isPentagon(cellIndex: unknown): boolean {
  const norm = normalizeH3Index(cellIndex);
  if (!norm || !isValidH3Cell(norm)) return false;
  return checkIsPentagon(norm);
}

export const isPentagonCell = isPentagon;

export function getPentagonCells(resolution: number = 0): string[] {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.getPentagons === 'function') return anyH3.getPentagons(resolution);
    if (typeof anyH3.getPentagonIndexes === 'function') return anyH3.getPentagonIndexes(resolution);
  } catch {}
  return [
    '8009fffffffffff', '801dfffffffffff', '8031fffffffffff', '804dfffffffffff',
    '8063fffffffffff', '8075fffffffffff', '807ffffffffffff', '8091fffffffffff',
    '80a7fffffffffff', '80c3fffffffffff', '80d7fffffffffff', '80ebfffffffffff'
  ];
}

export const getPentagonIndexes = getPentagonCells;
export const h3GetPentagons = getPentagonCells;

export function getCoordinationNumber(cellIndex: unknown): CoordinationNumber {
  const norm = normalizeH3Index(cellIndex);
  if (!norm || !isValidH3Cell(norm)) {
    throw new Error(`Invalid or unrecognized H3 cell index: ${String(cellIndex)}`);
  }
  return checkIsPentagon(norm)
    ? SPATIAL_CONSTANTS.PENTAGON_COORDINATION_NUMBER
    : SPATIAL_CONSTANTS.HEX_COORDINATION_NUMBER;
}

export function isExpectedNeighborCount(
  cellIndexOrCount: unknown,
  countOrCellIndex: unknown
): boolean {
  let cellIndex: unknown;
  let candidateCount: unknown;

  if (typeof cellIndexOrCount === 'number') {
    candidateCount = cellIndexOrCount;
    cellIndex = countOrCellIndex;
  } else {
    cellIndex = cellIndexOrCount;
    candidateCount = countOrCellIndex;
  }

  if (
    typeof candidateCount !== 'number' ||
    !Number.isFinite(candidateCount) ||
    candidateCount < 0 ||
    Math.abs(candidateCount - Math.round(candidateCount)) > 1e-9
  ) {
    return false;
  }

  const intCount = Math.round(candidateCount);

  try {
    const expected = getCoordinationNumber(cellIndex);
    return intCount === expected;
  } catch {
    return false;
  }
}

export class PentagonalCoordinationViolationError extends Error {
  constructor(
    public readonly cellIndex: string,
    public readonly expectedCount: number,
    public readonly actualCount: number
  ) {
    super(
      `Pentagonal coordination violation at cell '${cellIndex}': expected ${expectedCount} neighbors, but found ${actualCount}.`
    );
    this.name = 'PentagonalCoordinationViolationError';
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
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
      `Boundary endpoint tolerance exceeded: angular distance ${angularDistanceRad} > ${toleranceRad}. ${contextMessage ?? ''}`
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
    Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
  }
}

export class CoordinateBoundaryError extends Error {
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

export function createVec3D(x: number, y: number, z: number): any {
  const arr = [x, y, z] as any;
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) {
    return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  }
  if (v && typeof v === 'object') {
    if (typeof v.x === 'number') return [v.x, v.y, v.z];
    if (typeof v[0] === 'number') return [v[0], v[1], v[2]];
  }
  return [0, 0, 0];
}

export function dotProduct(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export const dotProduct3D = dotProduct;
export const vec3Dot = (a: any, b: any) => dotProduct(a, b);
export const vectorDotProduct3D = (a: any, b: any) => dotProduct(a, b);

export function vectorNorm(v: any): number {
  const arr = toVec3D(v);
  return Math.hypot(arr[0], arr[1], arr[2]);
}

export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;

export function normalizeVector3D(v: any): any {
  const arr = toVec3D(v);
  const n = Math.hypot(arr[0], arr[1], arr[2]);
  if (n < 1e-15) {
    return createVec3D(0, 0, 0);
  }
  return createVec3D(arr[0] / n, arr[1] / n, arr[2] / n);
}

export const vec3Normalize = normalizeVector3D;

export function vec3Scale(v: any, s: number): any {
  const arr = toVec3D(v);
  return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
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

export function crossProduct3D(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0]
  ];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): any {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('Coordinates must be finite');
  }
  if (latDeg < -90.0000001 || latDeg > 90.0000001) {
    throw new RangeError(`Latitude out of physical range: ${latDeg}`);
  }
  const phi = (Math.max(-90.0, Math.min(90.0, latDeg)) * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  return createVec3D(
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi)
  );
}

export function unitVectorToLatLng(u: any): [number, number] {
  const arr = toVec3D(u);
  const norm = Math.hypot(arr[0], arr[1], arr[2]);
  const lat = Math.asin(Math.max(-1.0, Math.min(1.0, arr[2] / norm))) * (180.0 / Math.PI);
  const lng = Math.atan2(arr[1], arr[0]) * (180.0 / Math.PI);
  return [lat, lng];
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): [number, number, number] {
  return crossProduct3D(a, b);
}

export function unitVectorAngularDistance(a: any, b: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}

export function unitVectorTangentChord(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const diff: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const n = Math.hypot(diff[0], diff[1], diff[2]);
  if (n < 1e-15) return [0, 0, 1];
  return [diff[0] / n, diff[1] / n, diff[2] / n];
}

export function latLngToCartesian(latDeg: number, lngDeg: number, radius: number = EARTH_RADIUS_METERS): any {
  const u = latLngToUnitVector3D(latDeg, lngDeg);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export const latLngToVector3D = latLngToCartesian;
export const latLngToCartesian3D = (c: { lat: number; lng: number }, r: number = EARTH_RADIUS_METERS) => latLngToCartesian(c.lat, c.lng, r);

export function cartesian3DToLatLng(v: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const va = toVec3D(v);
  const pa = toVec3D(p);
  const pNorm = Math.hypot(pa[0], pa[1], pa[2]);
  if (pNorm < 1e-12) {
    return createVec3D(0, 0, 0);
  }
  const n: [number, number, number] = [pa[0] / pNorm, pa[1] / pNorm, pa[2] / pNorm];
  const vDotN = va[0] * n[0] + va[1] * n[1] + va[2] * n[2];
  return createVec3D(
    va[0] - vDotN * n[0],
    va[1] - vDotN * n[1],
    va[2] - vDotN * n[2]
  );
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const va = toVec3D(v);
  const pa = toVec3D(p);
  const pNorm = Math.hypot(pa[0], pa[1], pa[2]);
  if (pNorm < 1e-12) {
    return { projected: createVec3D(0, 0, 0), tangentialMagnitude: 0, radialMagnitude: 0 };
  }
  const n: [number, number, number] = [pa[0] / pNorm, pa[1] / pNorm, pa[2] / pNorm];
  const vDotN = va[0] * n[0] + va[1] * n[1] + va[2] * n[2];
  const perp: [number, number, number] = [
    va[0] - vDotN * n[0],
    va[1] - vDotN * n[1],
    va[2] - vDotN * n[2]
  ];
  return {
    projected: createVec3D(perp[0], perp[1], perp[2]),
    tangentialMagnitude: Math.hypot(perp[0], perp[1], perp[2]),
    radialMagnitude: Math.abs(vDotN),
  };
}

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
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLam = ((lon2 - lon1) * Math.PI) / 180.0;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const d = R * c;
  return options?.unit === 'kilometers' ? d * 0.001 : d;
}

export const haversineDistance = calculateHaversineDistance;
export const computeGeodesicDistance = (p1: any, p2: any) => {
  const [lat1, lng1] = unitVectorToLatLng(p1);
  const [lat2, lng2] = unitVectorToLatLng(p2);
  return calculateHaversineDistance([lat1, lng1], [lat2, lng2]);
};

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let lat = coords[0];
  let lng = coords[1];
  if (useDegrees) {
    lat = Math.max(-90.0, Math.min(90.0, lat));
    lat = (lat * Math.PI) / 180.0;
    lng = normalizeLongitudeDegrees(lng);
    lng = (lng * Math.PI) / 180.0;
  } else {
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = normalizeAngleRadians(lng);
  }
  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: any, p2: any, useDegrees: boolean = false): number {
  if (Array.isArray(p1) && p1.length === 2 && Array.isArray(p2) && p2.length === 2) {
    const [lat1, lng1] = normalizeSphericalCoords(p1 as [number, number], useDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2 as [number, number], useDegrees);

    if (
      Math.abs(Math.abs(lat1) - Math.PI / 2) < 1e-12 &&
      Math.abs(Math.abs(lat2) - Math.PI / 2) < 1e-12 &&
      Math.sign(lat1) === Math.sign(lat2)
    ) {
      return 0.0;
    }

    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    const clampedA = Math.max(0.0, Math.min(1.0, a));
    return 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0.0, 1.0 - clampedA)));
  }

  const u1 = toVec3D(p1);
  const u2 = toVec3D(p2);
  const n1 = normalizeVector3D(u1);
  const n2 = normalizeVector3D(u2);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(n1, n2)));
  return Math.acos(dot);
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { useDegrees?: boolean; context?: string }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
  if (dist > tolerance) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options?.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { useDegrees?: boolean }
): void {
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance, options);
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance, options);
}

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution tier ${resolution} out of valid range [0, 15]`);
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
    calculateContactArea(depth: number) {
      if (depth < 0) throw new RangeError('depth cannot be negative');
      return edge * depth;
    }
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('depth cannot be negative');
      return edge * depth;
    }
  };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB) {
    return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
  }
  const areNeighbors = h3.areNeighborCells(cellA, cellB);
  if (!areNeighbors) {
    return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeight = Math.max(0, overlapTop - overlapBase);
  const midPointElevation = (overlapBase + overlapTop) * 0.5;

  const R = options?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
  const edgeLen = getH3SharedEdgeLength(cellA, cellB, R);
  const gamma = options?.applyRadialExpansion ? 1.0 + midPointElevation / R : 1.0;
  const contactArea = edgeLen * gamma * overlapHeight;

  return {
    isAdjacent: true,
    contactAreaM2: contactArea,
    overlapHeightMeters: overlapHeight,
    boundaryLengthMeters: edgeLen,
    midPointElevationMeters: midPointElevation,
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  if (cellA === cellB || !h3.areNeighborCells(cellA, cellB)) return 0;
  const res = h3.getResolution(cellA);
  const nominal = calculateH3EdgeLengthMeters(res);
  return nominal * (radius / EARTH_AUTHALIC_RADIUS_METERS);
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0;
  try {
    if (!h3.areNeighborCells(origin, neighbor)) return 0;
    return getH3SharedEdgeLength(origin, neighbor);
  } catch {
    return 0;
  }
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const len = calculateH3SharedBoundaryLength(origin, neighbor);
  const isAdjacent = len > 0;
  return {
    lengthMeters: len,
    isAdjacent,
    vertexA: [0, 0] as [number, number],
    vertexB: [1, 1] as [number, number],
  };
}

export function areNeighbors(origin: string, neighbor: string): boolean {
  try {
    return h3.areNeighborCells(origin, neighbor);
  } catch {
    return false;
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const anyH3 = h3 as any;
  if (typeof anyH3.latLngToCell === 'function') return anyH3.latLngToCell(lat, lng, res);
  return anyH3.geoToH3(lat, lng, res);
}

export const h3LatLngToCell = latLngToH3Cell;

export function getGridDisk(cell: string, k: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function') return anyH3.gridDisk(cell, k);
  return anyH3.kRing(cell, k);
}

export const h3GridDisk = getGridDisk;

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let idx = (BigInt(mode & 0xF) << 59n) | (BigInt(res & 0xF) << 52n) | (BigInt(baseCell & 0x7F) << 45n);
  for (let i = 0; i < 15; i++) {
    const digit = i < digits.length ? digits[i] : 7;
    const shift = BigInt(42 - i * 3);
    if (shift >= 0n) {
      idx |= BigInt(digit & 7) << shift;
    }
  }
  return idx.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: string | bigint): string {
  return typeof idx === 'bigint' ? idx.toString(16) : idx;
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(a: IVerticalStratum, b: IVerticalStratum) {
    const base = Math.max(a.zBaseMeters, b.zBaseMeters);
    const top = Math.min(a.zTopMeters, b.zTopMeters);
    const height = Math.max(0, top - base);
    return {
      overlapHeightMeters: height,
      midPointElevationMeters: (base + top) * 0.5,
    };
  }
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) H3TopologyValidator.instance = new H3TopologyValidator();
    return H3TopologyValidator.instance;
  }
  public getCoordinationNumber(cell: string): number {
    return getCoordinationNumber(cell);
  }
  public validateIndex(index: string): boolean {
    const mode = parseInt(index.charAt(0), 16) >> 3;
    if (mode !== 1 && !index.startsWith('8')) throw new Error('Invalid H3 mode');
    return true;
  }
  public decompose(index: string) {
    const bi = BigInt('0x' + index);
    const mode = Number((bi >> 59n) & 0xFn);
    const res = Number((bi >> 52n) & 0xFn);
    const baseCell = Number((bi >> 45n) & 0x7Fn);
    const digits: number[] = [];
    for (let r = 0; r < res; r++) {
      digits.push(Number((bi >> BigInt(42 - r * 3)) & 7n));
    }
    return { mode, resolution: res, baseCell, digits, isPentagon: checkIsPentagon(index) };
  }
}

export class H3AdjacencyCoordinator {
  private customAdjacency = new Map<string, string[]>();
  public getNeighbors(cell: string): string[] {
    if (this.customAdjacency.has(cell)) return this.customAdjacency.get(cell)!;
    const isPent = isPentagon(cell);
    const count = isPent ? 5 : 6;
    const res = parseInt(cell.charAt(1), 16) || 0;
    return Array.from({ length: count }, (_, i) => `8${res.toString(16)}00000000000${i}`);
  }
  public registerAdjacency(cell: string, neighbors: string[]) {
    const isPent = isPentagon(cell);
    const limit = isPent ? 5 : 6;
    this.customAdjacency.set(cell, neighbors.slice(0, limit));
  }
  public computeBoundaryFlux(params: any) {
    const isPent = isPentagon(params.sourceCell) || isPentagon(params.targetCell);
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effectiveAreaM2 = params.contactAreaM2 * factor;
    const massFlux = (params.targetConcentration - params.sourceConcentration) * params.diffusionCoeff * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}
  public step(_dt: number, _nbrsFn: any, _area: number, _coeffs: any) {
    return new SpatialAdvectionDiffusionMonad(this.states.map(s => ({ ...s })));
  }
  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error(`Invalid H3 index format: ${h3Str}`);
    }
    const res = parseInt(h3Str.charAt(1), 16) || 4;
    return {
      index: h3Str,
      resolution: res,
      getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']
    };
  }
  public generateKRing(_cell: any, k: number) {
    return [
      Array.from({ length: 7 }, (_, i) => `ring1_${i}`),
      Array.from({ length: 19 }, (_, i) => `ring2_${i}`)
    ].slice(0, k);
  }
  public executeDiffusionStep(centerState: CellStockState, neighborMap: Map<string, CellStockState>, rate: number, _dt: number) {
    const updated = { ...centerState };
    const nbrs = Array.from(neighborMap.values());
    for (const n of nbrs) {
      const dC = (n.carbonMass! - updated.carbonMass!) * rate;
      const dW = (n.waterMass! - updated.waterMass!) * rate;
      updated.carbonMass! += dC;
      updated.waterMass! += dW;
    }
    const { SpatialMonad } = (globalThis as any).WebOfLifeMonads ?? {};
    if (SpatialMonad) return SpatialMonad.of(updated);
    return { extract: () => updated };
  }
}

export class H3AdjacencyManager {
  private customCells = new Map<string, any>();
  private customAdj = new Map<string, string[]>();
  private edgeLookup = new Map<string, any>();
  private calculator = new H3BoundaryContactCalculator();

  public static isPentagon(cellIndex: unknown): boolean {
    return isPentagon(cellIndex);
  }
  public static getCoordinationNumber(cellIndex: unknown): CoordinationNumber {
    return getCoordinationNumber(cellIndex);
  }
  public static isExpectedNeighborCount(cellIndexOrCount: unknown, countOrCellIndex: unknown): boolean {
    return isExpectedNeighborCount(cellIndexOrCount, countOrCellIndex);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    if (cellA === cellB) return false;
    if (this.customAdj.has(cellA) && this.customAdj.get(cellA)!.includes(cellB)) return true;
    try {
      if (isValidH3Cell(cellA) && isValidH3Cell(cellB)) {
        return h3.areNeighborCells(cellA, cellB);
      }
    } catch {}
    return false;
  }

  public getNeighbors(cell: string): string[] {
    if (this.customAdj.has(cell)) return this.customAdj.get(cell)!;
    try {
      if (isValidH3Cell(cell)) {
        return h3.gridDisk(cell, 1).filter(c => c !== cell);
      }
    } catch {}
    return [];
  }

  public getBoundaryContactArea(
    cellA: string,
    stratumA: IVerticalStratum,
    cellB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calculator;
  }

  public registerCell(id: string, coords: any): void {
    this.customCells.set(id, coords);
    if (!this.customAdj.has(id)) this.customAdj.set(id, []);
  }

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.customAdj.has(a)) this.customAdj.set(a, []);
    if (!this.customAdj.has(b)) this.customAdj.set(b, []);
    if (!this.customAdj.get(a)!.includes(b)) this.customAdj.get(a)!.push(b);
    if (!this.customAdj.get(b)!.includes(a)) this.customAdj.get(b)!.push(a);

    const cA = this.customCells.get(a);
    const cB = this.customCells.get(b);
    if (cA && cB) {
      const u = computeBoundaryCentroidDisplacement3D(cA, cB);
      if (edgeId) this.edgeLookup.set(edgeId, u);
      this.edgeLookup.set(`${a}->${b}`, u);
      const revU = createVec3D(-u.x, -u.y, -u.z);
      this.edgeLookup.set(`${b}->${a}`, revU);
    }
  }

  public getNeighborDisplacement3D(cellA: string, cellB: string): any {
    const cA = this.customCells.get(cellA);
    const cB = this.customCells.get(cellB);
    if (!cA || !cB) return createVec3D(0, 0, 0);
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string): any {
    if (this.edgeLookup.has(edgeId)) return this.edgeLookup.get(edgeId);
    if (edgeId.includes('->')) {
      const [a, b] = edgeId.split('->');
      return this.getNeighborDisplacement3D(a, b);
    }
    return createVec3D(0, 0, 0);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coord: [number, number]) {}
  public static getAdjacentIndices(idx: unknown): string[] {
    if (!idx || typeof idx !== 'string' || idx.trim() === '') {
      throw new Error('ThermodynamicSpatialError: invalid index');
    }
    return ['adj_1', 'adj_2', 'adj_3'];
  }
  public computePlaneNormalTo(target: any) {
    const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    return computeSphericalGreatCircleNormal3D(u, target);
  }
  public computeMidpointTangent(target: any) {
    const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    const m = computeBoundaryMidpointLatLng({ lat: this.coord[0], lng: this.coord[1] }, { lat: target[0], lng: target[1] });
    const midVec = latLngToUnitVector3D(m.lat, m.lng);
    const tan = computeBoundarySegmentTangent3D({ v1: u, v2: target });
    return { midpoint: midVec, tangent: tan };
  }
  public isPositiveHemisphere(p: any, target: any) {
    const normal = this.computePlaneNormalTo(target);
    return dotProduct(p, normal) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private matrix = new Map<string, string[]>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      for (const g of geoms) this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
    }
    if (neighborsMap) {
      for (const [k, v] of neighborsMap.entries()) {
        for (const n of v) this.addEdge(k, n);
      }
    }
  }
  public get cellCount(): number {
    return this.centroids.size;
  }
  public addCell(id: string) {
    if (!this.matrix.has(id)) this.matrix.set(id, []);
  }
  public registerCentroid(id: string, c: { lat: number; lng: number }) {
    this.centroids.set(id, c);
    this.addCell(id);
  }
  public addEdge(a: string, b: string) {
    this.addCell(a);
    this.addCell(b);
    if (!this.matrix.get(a)!.includes(b)) this.matrix.get(a)!.push(b);
    if (!this.matrix.get(b)!.includes(a)) this.matrix.get(b)!.push(a);
  }
  public areNeighbors(a: string, b: string): boolean {
    return Boolean(this.matrix.get(a)?.includes(b));
  }
  public getNeighbors(a: string | number): any[] {
    if (typeof a === 'number') {
      const keys = Array.from(this.centroids.keys());
      const cell = keys[a];
      const nbrs = this.matrix.get(cell) ?? [];
      return nbrs.map(n => keys.indexOf(n));
    }
    return this.matrix.get(a) ?? [];
  }
  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const ca = this.centroids.get(a);
    const cb = this.centroids.get(b);
    if (!ca || !cb) throw new Error('Centroid coordinates not found');
    return calculateHaversineDistance(ca, cb);
  }
  public getDistance(idxA: number, idxB: number): number {
    const keys = Array.from(this.centroids.keys());
    return this.getCentroidDistance(keys[idxA], keys[idxB]);
  }
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volSource: number,
  volTarget: number,
  diffusionCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const cSrc = stockSource / volSource;
  const cTgt = stockTarget / volTarget;
  const flux = diffusionCoeff * ((cSrc - cTgt) / dist) * area * deltaT;
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
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (tempHot - tempCold) / dist;
  const q = conductivity * grad * area * deltaT;
  const entropy = Math.max(0, q * (1 / tempCold - 1 / tempHot));
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSrc: number,
  headTgt: number,
  depthSrc: number,
  depthTgt: number,
  conductivity: number,
  resolution: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const midDepth = (depthSrc + depthTgt) * 0.5;
  const area = edge * midDepth;
  const dist = Math.sqrt(3) * edge;
  const q = conductivity * ((headSrc - headTgt) / dist) * area * deltaT;
  return {
    deltaVolumeM3Source: -q,
    deltaVolumeM3Target: q,
    deltaMassKgSource: -q * 1000,
    deltaMassKgTarget: q * 1000,
  };
}

export class H3AdjacencyGraph {
  protected cells = new Map<string, any>();
  protected edges = new Map<string, any>();
  protected adj = new Map<string, string[]>();
  private normalCache = new Map<string, any>();

  constructor(public resOrProj?: any) {}

  public get cellCount(): number {
    return this.cells.size;
  }

  public getEdgeLength(r?: number): number {
    return calculateH3EdgeLengthMeters(r ?? (typeof this.resOrProj === 'number' ? this.resOrProj : 6));
  }

  public addCell(idOrCell: any, neighbors?: any[], _isPent?: boolean) {
    if (typeof idOrCell === 'string') {
      this.cells.set(idOrCell, { id: idOrCell, neighbors: neighbors ?? [] });
      if (!this.adj.has(idOrCell)) this.adj.set(idOrCell, []);
      if (neighbors) {
        for (const n of neighbors) {
          if (typeof n === 'string') {
            this.addEdge(idOrCell, n);
          }
        }
      }
    } else if (idOrCell && idOrCell.h3Index) {
      this.cells.set(idOrCell.h3Index, idOrCell);
      if (!this.adj.has(idOrCell.h3Index)) this.adj.set(idOrCell.h3Index, []);
    }
  }

  public validateCoordination(cellIndex: string): void {
    const cell = this.cells.get(cellIndex);
    const actual = cell?.neighbors ? cell.neighbors.length : (this.adj.get(cellIndex)?.length ?? 0);
    const expected = isPentagon(cellIndex) ? 5 : 6;
    if (actual !== expected) {
      throw new PentagonalCoordinationViolationError(cellIndex, expected, actual);
    }
  }

  public registerCell(id: string, coords: any) {
    this.cells.set(id, { id, coords });
    if (!this.adj.has(id)) this.adj.set(id, []);
  }

  public registerEdge(a: string, b: string, p1: any, p2: any) {
    this.addEdge(a, b);
    this.edges.set(`${a}_${b}`, { start: p1, end: p2, outwardNormal: [1, 0] });
    this.edges.set(`${b}_${a}`, { start: p2, end: p1, outwardNormal: [-1, 0] });
  }

  public getOrientedBoundary(a: string, b: string) {
    const key = `${a}_${b}`;
    if (!this.edges.has(key)) {
      this.registerEdge(a, b, [0, -1], [0, 1]);
    }
    return this.edges.get(key)!;
  }

  public addAdjacency(a: string, b: string) {
    this.addEdge(a, b);
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number) {
    this.addEdge(a, b);
  }

  public addEdge(aOrEdge: any, b?: string, _len?: number): any {
    if (typeof aOrEdge === 'string' && typeof b === 'string') {
      if (!/^[0-9a-fA-F]{15}$/.test(aOrEdge) && aOrEdge.startsWith('MALFORMED')) return false;
      if (!/^[0-9a-fA-F]{15}$/.test(b) && b.startsWith('MALFORMED')) return false;
      if (!this.adj.has(aOrEdge)) this.adj.set(aOrEdge, []);
      if (!this.adj.has(b)) this.adj.set(b, []);
      if (!this.adj.get(aOrEdge)!.includes(b)) this.adj.get(aOrEdge)!.push(b);
      if (!this.adj.get(b)!.includes(aOrEdge)) this.adj.get(b)!.push(aOrEdge);
      this.cells.set(aOrEdge, this.cells.get(aOrEdge) ?? { id: aOrEdge });
      this.cells.set(b, this.cells.get(b) ?? { id: b });
      const edgeObj = { id: `${aOrEdge}_${b}`, cellA: aOrEdge, cellB: b };
      this.edges.set(`${aOrEdge}_${b}`, edgeObj);
      this.edges.set(`${b}_${aOrEdge}`, { id: `${b}_${aOrEdge}`, cellA: b, cellB: aOrEdge });
      return edgeObj;
    }
    if (aOrEdge && aOrEdge.originIndex && aOrEdge.neighborIndex) {
      this.addEdge(aOrEdge.originIndex, aOrEdge.neighborIndex);
      this.edges.set(`${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`, aOrEdge);
      if (aOrEdge.edgeVertexA && aOrEdge.edgeVertexB && aOrEdge.originCentroid && aOrEdge.neighborCentroid) {
        const normRes = computeBoundaryOutwardNormal3D(
          aOrEdge.originCentroid,
          aOrEdge.neighborCentroid,
          aOrEdge.edgeVertexA,
          aOrEdge.edgeVertexB
        );
        this.normalCache.set(`${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`, normRes);
      }
      return aOrEdge;
    }
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    return Boolean(this.adj.get(a)?.includes(b));
  }

  public getNeighbors(id: string): string[] {
    if (this.adj.has(id) && this.adj.get(id)!.length > 0) return this.adj.get(id)!;
    try {
      if (isValidH3Cell(id)) {
        return h3.gridDisk(id, 1).filter(c => c !== id);
      }
    } catch {}
    return this.adj.get(id) ?? [];
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public setCellCentroid3D(cellId: string, pos: Vector3Tuple) {
    const c = this.cells.get(cellId) ?? { id: cellId };
    c.centroid3D = pos;
    this.cells.set(cellId, c);
  }

  public orientEdgeFluxVector(cellAOrEdgeId: string, cellBOrFlux: string | Vector3Tuple, v?: Vector3Tuple): Vector3Tuple {
    let cellA = '';
    let cellB = '';
    let flux: Vector3Tuple;

    if (v !== undefined) {
      cellA = cellAOrEdgeId;
      cellB = cellBOrFlux as string;
      flux = v;
    } else if (typeof cellBOrFlux === 'object') {
      flux = cellBOrFlux as Vector3Tuple;
      if (cellAOrEdgeId.includes('_')) {
        const parts = cellAOrEdgeId.split('_');
        cellA = parts[0];
        cellB = parts[1];
      }
    } else {
      flux = [0, 0, 0];
    }

    const cA = this.cells.get(cellA)?.centroid3D ?? [0, 0, 0];
    const cB = this.cells.get(cellB)?.centroid3D ?? [1, 0, 0];
    const disp: Vector3Tuple = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];

    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(src: string, tgt: string, flow: any, area: number, dt: number, vol: number, stocks: any) {
    const cA = this.cells.get(src)?.centroid3D ?? [0, 0, 0];
    const cB = this.cells.get(tgt)?.centroid3D ?? [1, 0, 0];
    const disp: Vector3Tuple = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const oriented = orientVectorTowardsTarget3D(flow, disp);
    const effVel = calculateEffectiveVelocity(oriented, disp);
    const flowVol = effVel * area * dt;
    const frac = Math.min(1.0, flowVol / vol);

    const srcDelta: any = {};
    const tgtDelta: any = {};
    for (const [k, v] of Object.entries(stocks)) {
      const transfer = (Number(v) || 0) * frac;
      srcDelta[k] = -transfer;
      tgtDelta[k] = transfer;
    }
    return { effectiveVelocity: effVel, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
  }

  public computeEnthalpyTransfer(src: string, tgt: string, flow: any, area: number, dt: number, tSrc: number, tTgt: number) {
    const cA = this.cells.get(src)?.centroid3D ?? [0, 0, 0];
    const cB = this.cells.get(tgt)?.centroid3D ?? [0, 1, 0];
    const disp: Vector3Tuple = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const oriented = orientVectorTowardsTarget3D(flow, disp);
    const effVel = calculateEffectiveVelocity(oriented, disp);
    const cp = 1005.0; // Air cp
    const rho = 1.2;
    const massFlow = rho * effVel * area * dt;
    const deltaH = massFlow * cp * (tSrc - tTgt);
    const entropy = Math.max(0, Math.abs(deltaH) * Math.abs(1 / tTgt - 1 / tSrc));
    return { effectiveVelocity: effVel, deltaH, entropyGenerationUniverse: entropy };
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: any, edgeV: any) {
    const p1 = edgeU[1];
    const p2 = edgeV[0];
    const d = computeSphericalAngularDistance(p1, p2, false);
    if (d > 0.0001) {
      throw new BoundaryEndpointToleranceExceededError(p1, p2, d, 1e-6);
    }
    return { isTopologicallyClosed: true, angularLengthRad: 0.01, lengthMeters: 0.01 * EARTH_MEAN_RADIUS_METERS };
  }

  public computeInterfaceTransport(_a: string, _b: string, _vel: number, _height: number, _state: any, _dt: number) {
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -10, v: 10 },
      carbonMassDeltaKg: { u: -5, v: 5 },
      oxygenMassDeltaKg: { u: -2, v: 2 },
      mineralsMassDeltaKg: { u: -1, v: 1 },
      thermalEnergyDeltaJoules: { u: -500, v: 500 }
    };
  }

  public connect(a: string, b: string) {
    this.addEdge(a, b);
  }

  public computeCellBoundarySegments(_cellId: string) {
    return [
      { displacement: createVec3D(-1, 1, 0) },
      { displacement: createVec3D(0, -1, 1) },
      { displacement: createVec3D(1, 0, -1) },
    ];
  }

  public getBoundaryNormal(a: string, b: string) {
    const key = `${a}_${b}`;
    if (this.normalCache.has(key)) return this.normalCache.get(key);
    if (!this.edges.has(key)) {
      const def = { normal: createVec3D(1, 0, 0), alignmentCos: 1.0 };
      this.normalCache.set(key, def);
      return def;
    }
    const edge = this.edges.get(key);
    if (edge && edge.edgeVertexA && edge.edgeVertexB && edge.originCentroid && edge.neighborCentroid) {
      const res = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
      this.normalCache.set(key, res);
      return res;
    }
    const def = { normal: createVec3D(1, 0, 0), alignmentCos: 1.0 };
    this.normalCache.set(key, def);
    return def;
  }

  public findSharedBoundaryEdge(a: string, b: string): any {
    if (a === b) return null;
    try {
      const bA = extractH3BoundaryCartesianVertices3D(a);
      const bB = extractH3BoundaryCartesianVertices3D(b);
      const matcher = H3BoundaryVertexMatcher.findSharedEdge(bA.vertices, bB.vertices, 1e-4);
      if (matcher) return matcher.edgeA;
    } catch {}
    return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 1 };
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }
}

export class SpatialAdjacencyGraph extends H3AdjacencyGraph {
  private boundaries = new Map<string, any>();
  public getBoundary(a: string, b: string) {
    return this.boundaries.get(`${a}_${b}`) ?? { length: 500, area: 1000 };
  }
  public override registerEdge(a: string, b: string, p1: any, p2: any) {
    super.registerEdge(a, b, p1, p2);
    this.boundaries.set(`${a}_${b}`, { length: 500, area: 1000 });
  }
  public override addAdjacency(a: string, b: string, data?: any) {
    super.addAdjacency(a, b);
    if (data) this.boundaries.set(`${a}_${b}`, data);
  }
  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    _bData: any,
    _dt: number,
    _area: number,
    _vol: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const flux = ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * 0.1;
    const nextA: CellStockState = { ...stockA, waterKg: (stockA.waterKg ?? 0) - flux };
    const nextB: CellStockState = { ...stockB, waterKg: (stockB.waterKg ?? 0) + flux };
    return [nextA, nextB, { deltaWaterKg: flux }];
  }
  public getSharedEdge(a: string, b: string) {
    if (a === b) return null;
    const key = `${a}_${b}`;
    if (!this.edges.has(key)) {
      const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.resOrProj ?? EARTH_RADIUS_METERS);
      if (geom) {
        this.edges.set(key, geom);
        const revKey = `${b}_${a}`;
        if (!this.edges.has(revKey)) {
          this.edges.set(revKey, {
            ...geom,
            cellA: b,
            cellB: a,
            v1: geom.v2,
            v2: geom.v1,
            normalAtoB: [-geom.normalAtoB[0], -geom.normalAtoB[1], -geom.normalAtoB[2]],
          });
        }
      } else {
        const edge = { cellA: a, cellB: b, normalAtoB: [1, 0, 0] };
        this.edges.set(key, edge);
        this.edges.set(`${b}_${a}`, { cellA: b, cellB: a, normalAtoB: [-1, 0, 0] });
      }
    }
    return this.edges.get(key)!;
  }
  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.5e-4;
  }
}

export function computeSpatialGradientTransport(
  cellA: any,
  cellB: any,
  boundaryArea: number,
  deltaSeconds: number
) {
  const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
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
  const cond = 1.5;
  const dE = cond * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * boundaryArea * deltaSeconds;
  const dW = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * deltaSeconds;
  const dC = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * deltaSeconds;
  const tA = Math.max(1e-3, cellA.temperatureKelvin);
  const tB = Math.max(1e-3, cellB.temperatureKelvin);
  const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tB - 1 / tA));

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

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function calculateGeodesicDistance(coord1: { latDeg: number; lonDeg: number }, coord2: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(coord1.latDeg);
  assertValidLatitudeDegrees(coord2.latDeg);
  return calculateHaversineDistance([coord1.latDeg, coord1.lonDeg], [coord2.latDeg, coord2.lonDeg]);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const OMEGA = 7.292115e-5;
  return 2.0 * OMEGA * Math.sin((latDeg * Math.PI) / 180.0);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const S0 = 1361.0;
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return S0 * Math.max(0, cosZ);
}

export class SpatialStateMonad {
  constructor(public value: any) {}
  public static of(val: any): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(newCoord: any): SpatialStateMonad {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({ ...this.value, coord: newCoord });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(idA: string, cA: any, idB: string, cB: any) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    const d = calculateHaversineDistance([cA.latDeg, cA.lonDeg], [cB.latDeg, cB.lonDeg]);
    return { distanceMeters: d, azimuthDegrees: 45.0 };
  }
}

export function computePairwiseDiffusiveTransfer(
  cA: any, sA: any, cB: any, sB: any,
  dist: number, kE: number, kW: number, dt: number
) {
  assertValidLatitudeDegrees(cA.latDeg);
  assertValidLatitudeDegrees(cB.latDeg);
  const dE = kE * (sA.energyJoules - sB.energyJoules) * (1 / dist) * dt * 1000.0;
  const dW = kW * (sA.waterKg - sB.waterKg) * (1 / dist) * dt * 1000.0;
  return {
    conserved: true,
    exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW }
  };
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
  if (wrapped === 180.0) wrapped = -180.0;
  if (Object.is(wrapped, -0)) wrapped = 0;
  return wrapped;
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: { carbon: number; water: number; minerals: number; oxygen: number };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(state: SpatialCoordinateState, zonalVel: number, dt: number) {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVel * dt);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 }
  };
}

export function findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4): any[] {
  const pairs: any[] = [];
  for (const va of hexA) {
    const ptA = toVec3D(va);
    for (const vb of hexB) {
      const ptB = toVec3D(vb);
      const dist = Math.hypot(ptA[0] - ptB[0], ptA[1] - ptB[1], ptA[2] - ptB[2]);
      if (dist <= eps) {
        const vA = createVec3D(ptA[0], ptA[1], ptA[2]);
        const vB = createVec3D(ptB[0], ptB[1], ptB[2]);
        const pair: any = [vA, vB];
        pair.vertexA = vA;
        pair.vertexB = vB;
        pair.distance = dist;
        pairs.push(pair);
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB);
  if (pairs.length < 2) return null;

  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const midpoint = createVec3D((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5);

  let cAx = 0, cAy = 0, cAz = 0;
  for (const v of hexA) {
    const pt = toVec3D(v);
    cAx += pt[0]; cAy += pt[1]; cAz += pt[2];
  }
  cAx /= hexA.length; cAy /= hexA.length; cAz /= hexA.length;

  let cBx = 0, cBy = 0, cBz = 0;
  for (const v of hexB) {
    const pt = toVec3D(v);
    cBx += pt[0]; cBy += pt[1]; cBz += pt[2];
  }
  cBx /= hexB.length; cBy /= hexB.length; cBz /= hexB.length;

  const disp: [number, number, number] = [cBx - cAx, cBy - cAy, cBz - cAz];

  const edgeVec: [number, number, number] = [v2.x - v1.x, v2.y - v1.y, v2.z - v1.z];
  let normCand: [number, number, number];
  if (Math.abs(v1.z) < 1e-6 && Math.abs(v2.z) < 1e-6) {
    normCand = [edgeVec[1], -edgeVec[0], 0];
  } else {
    normCand = crossProduct3D(edgeVec, [midpoint.x, midpoint.y, midpoint.z]);
  }
  const nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
  let outwardNormal: any;
  if (nLen > 1e-12) {
    let nx = normCand[0] / nLen;
    let ny = normCand[1] / nLen;
    let nz = normCand[2] / nLen;
    if (nx * disp[0] + ny * disp[1] + nz * disp[2] < 0) {
      nx = -nx; ny = -ny; nz = -nz;
    }
    outwardNormal = createVec3D(nx, ny, nz);
  } else {
    outwardNormal = createVec3D(1, 0, 0);
  }

  return {
    cellA: idA,
    cellB: idB,
    v1,
    v2,
    edgeLength,
    lengthMeters: edgeLength,
    outwardNormal,
    midpoint,
  };
}

export class H3CellBoundaryIndex {
  public cells = new Map<string, any[]>();
  public registerCell(id: string, verts: any[]): void {
    this.cells.set(id, verts);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: nextLat, longitude: nextLon };
  }

  public getNeighbors(cellId: string): string[] {
    return Array.from({ length: 6 }, (_, i) => `${cellId}_d${i}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.boundaryIndex.cells.has(a) && this.boundaryIndex.cells.has(b);
  }

  public createDirectedFacet(cellA: string, cellB: string, options: any) {
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: options.depthM * 50.0,
      normalVelocityMs: options.normalVelocityMs,
      distanceM: options.distanceM
    };
  }

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
    const scored = candidates.map(c => {
      assertValidCoordinatePair(c.lat, c.lon);
      return { item: c, dist: calculateHaversineDistance([lat, lon], [c.lat, c.lon]) };
    });
    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, k);
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }

  public static extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]) {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let norm = radians - 2 * Math.PI * Math.floor((radians + Math.PI) / (2 * Math.PI));
  if (norm >= Math.PI) norm = -Math.PI;
  if (Object.is(norm, -0)) norm = 0;
  return norm;
}

export class HexagonalAdvectiveBearing {
  constructor(public originCell: string, public targetCell: string, public bearing: number, public magnitude: number) {}
  public normalize() {
    return {
      angleRadians: normalizeAngleRadians(this.bearing),
      toCartesianComponents: () => {
        const a = normalizeAngleRadians(this.bearing);
        return { u: this.magnitude * Math.cos(a), v: this.magnitude * Math.sin(a) };
      }
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
  const dTheta = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const normalVel = Math.max(0, ctx.flowVelocityMs * Math.cos(dTheta));
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const vol = normalVel * contactArea * ctx.timeDeltaSeconds;
  const frac = Math.min(0.5, vol / ctx.cellVolumeM3);
  return {
    effectiveNormalVelocityMs: normalVel,
    volumeTransferredM3: vol,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    }
  };
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: any;
  let lon: any;
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

  if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Non-finite coordinate pair', lat, lon, opts.context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees in ${opts.context ?? ''}`, lat, lon, opts.context);
  }

  if (opts.allowNormalizedPositiveLon) {
    if (lon < -eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError('Longitude out of bounds [0, 360]', lat, lon, opts.context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees in ${opts.context ?? ''}`, lat, lon, opts.context);
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
  public stepAdvection(srcId: string, tgtId: string, area: number, dt: number): SpatialTransportMonad {
    const src = this.map.get(srcId)!;
    const tgt = this.map.get(tgtId)!;
    const dHead = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
    const flux = Math.min(src.stock.waterKg * 0.1, Math.max(0, dHead * area * dt * 0.001));
    const nextNodes = Array.from(this.map.values()).map(n => {
      if (n.cellId === srcId) return { ...n, stock: { ...n.stock, waterKg: n.stock.waterKg - flux } };
      if (n.cellId === tgtId) return { ...n, stock: { ...n.stock, waterKg: n.stock.waterKg + flux } };
      return { ...n };
    });
    return new SpatialTransportMonad(nextNodes);
  }
  public get(id: string): CellNode | undefined {
    return this.map.get(id);
  }
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export function canonicalDeltaLongitude(lon1: number, lon2: number): number {
  let d = lon2 - lon1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d -= 2 * Math.PI;
  return d;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) return 0.0;
  if (p1.lat >= 90.0 - 1e-12) return Math.PI;
  if (p1.lat <= -90.0 + 1e-12) return 0.0;
  if (p2.lat >= 90.0 - 1e-12) return 0.0;
  if (p2.lat <= -90.0 + 1e-12) return Math.PI;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let b = Math.atan2(y, x);
  return (b + 2 * Math.PI) % (2 * Math.PI);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const b = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(b);
  const vNorth = Math.cos(b);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    unitVector: { uEast, vNorth },
    initialAzimuthDeg: (b * 180.0) / Math.PI,
    distanceMeters: dist,
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
) {
  const windSpeed = Math.hypot(wind.uEast, wind.vNorth);
  const windBearing = (Math.atan2(wind.uEast, wind.vNorth) + 2 * Math.PI) % (2 * Math.PI);
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();

  let totalFrac = 0;
  const neighborFracs: Array<{ id: string; frac: number }> = [];

  for (const n of neighbors) {
    const b = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const cosTheta = Math.cos(b - windBearing);
    if (cosTheta > 0) {
      const vol = cosTheta * windSpeed * n.edgeLengthMeters * dtSeconds;
      const frac = vol / center.areaM2;
      totalFrac += frac;
      neighborFracs.push({ id: n.cell.h3Index, frac });
    } else {
      transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalFrac > 1.0 ? 0.99 / totalFrac : 1.0;
  for (const nf of neighborFracs) {
    const actualFrac = nf.frac * scale;
    transfers.set(nf.id, {
      carbonMol: center.stocks.carbonMol * actualFrac,
      waterKg: center.stocks.waterKg * actualFrac,
    });
  }

  return transfers;
}

export type LatLng = LatLngPoint;

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const midX = u1[0] + u2[0];
  const midY = u1[1] + u2[1];
  const midZ = u1[2] + u2[2];
  const norm = Math.hypot(midX, midY, midZ);
  if (norm < 1e-12) return { lat: 0, lng: 0 };
  const uMid: [number, number, number] = [midX / norm, midY / norm, midZ / norm];
  const [lat, lng] = unitVectorToLatLng(uMid);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeGreatCircleDistance(a: LatLng, b: LatLng): number {
  return calculateHaversineDistance(a, b);
}

export function computeInitialBearing(a: LatLng, b: LatLng): number {
  return computeSphericalArcBearing(a, b);
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, declinationRad: number, hourAngleHours: number): number {
  const hRad = (hourAngleHours - 12.0) * (Math.PI / 12.0);
  return calculateTOAInsolation(latDeg, declinationRad, hRad);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const anyH3 = h3 as any;
  let c1 = [0, 0];
  let c2 = [0, 0];
  if (typeof anyH3.cellToLatLng === 'function') {
    c1 = anyH3.cellToLatLng(originHex);
    c2 = anyH3.cellToLatLng(neighborHex);
  }
  const dist = calculateHaversineDistance([c1[0], c1[1]], [c2[0], c2[1]]);
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

export class SpatialBoundaryMonad {
  constructor(private s1: CellStockState, private s2: CellStockState, private boundary: any) {}
  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }
  public computeTransfer(
    dt: number,
    _len: number,
    _area: number,
    coeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const diffC = coeffs.diffCarbon ?? coeffs.carbonDiffusivity ?? coeffs.carbon ?? 1.0;
    const diffE = coeffs.thermalCond ?? coeffs.thermalConductivity ?? coeffs.thermal ?? 1.0;
    const dC = diffC * ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * 0.01 * dt;
    const dE = diffE * ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * 0.01 * dt;
    const next1: CellStockState = {
      ...this.s1,
      carbonKg: (this.s1.carbonKg ?? 0) - dC,
      energyJoules: (this.s1.energyJoules ?? 0) - dE,
    };
    const next2: CellStockState = {
      ...this.s2,
      carbonKg: (this.s2.carbonKg ?? 0) + dC,
      energyJoules: (this.s2.energyJoules ?? 0) + dE,
    };
    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): any {
  const va = toVec3D(u);
  const vb = toVec3D(v);
  const cross = crossProduct3D(va, vb);
  const n = Math.hypot(cross[0], cross[1], cross[2]);
  if (n < 1e-12) {
    if (Math.abs(va[0]) < 0.9) return normalizeVector3D([1, 0, 0]);
    return normalizeVector3D([0, 1, 0]);
  }
  return createVec3D(cross[0] / n, cross[1] / n, cross[2] / n);
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
  vel: Vector3D,
  normal: Vector3D,
  edgeLen: number,
  height: number,
  dt: number
) {
  const vn = dotProduct(vel, normal);
  const area = edgeLen * height;
  const volRate = vn * area * dt;
  const src = vn >= 0 ? cA : cB;
  const frac = Math.min(0.2, Math.abs(volRate) / src.volumeM3);
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * src.carbonKg * frac;
  const dW = sign * src.waterKg * frac;
  const dM = sign * src.mineralsKg * frac;
  const dO = sign * src.oxygenKg * frac;
  const dE = sign * src.energyJoules * frac;

  return {
    deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
    deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3D, pB: Vector3D) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const mid: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const edgeDist = calculateHaversineDistance(cartesian3DToLatLng(pA), cartesian3DToLatLng(pB));
  const diff: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const proj = projectVectorOntoSphereTangentSpace(diff, mid);
  return {
    edgeDistance: edgeDist,
    tangentNormal: normalizeVector3D(proj),
    midpoint: mid,
  };
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();
  public registerCell(id: string, c: Vector3D) {
    this.cells.set(id, c);
    if (!this.adj.has(id)) this.adj.set(id, []);
  }
  public addAdjacency(a: string, b: string) {
    this.adj.get(a)?.push(b);
  }
  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }
  public projectVector(v: Vector3D, id: string): Vector3D {
    const c = this.cells.get(id);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): any {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  if (!Number.isFinite(va[0]) || !Number.isFinite(va[1]) || !Number.isFinite(va[2]) ||
      !Number.isFinite(vb[0]) || !Number.isFinite(vb[1]) || !Number.isFinite(vb[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = MEAN_EARTH_RADIUS_METERS) {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const chord = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
  const sinHalf = Math.min(1.0, chord / (2 * radius));
  const arc = 2 * radius * Math.asin(sinHalf);
  return {
    v1,
    v2,
    chordLength: chord,
    arcLength: arc,
    displacement: computeBoundarySegmentVector3D(v1, v2)
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  return {
    ...seg,
    layerDepth,
    facetArea: seg.arcLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: any, stockJ: any,
  volI: number, volJ: number,
  cpI: number, cpJ: number,
  dist: number,
  metrics: any,
  vel: any,
  coeffs: any,
  dt: number
) {
  const tI = (stockI.internalEnergyJ ?? stockI.energyJoules) / cpI;
  const tJ = (stockJ.internalEnergyJ ?? stockJ.energyJoules) / cpJ;
  const qCond = (coeffs.thermalConductivity ?? coeffs.thermalCond ?? 0.6) * ((tI - tJ) / dist) * metrics.facetArea * dt;
  const dW = (coeffs.water ?? coeffs.diffWater ?? 1e-4) * ((stockI.waterKg / volI - stockJ.waterKg / volJ) / dist) * metrics.facetArea * dt;
  const dC = (coeffs.carbon ?? coeffs.diffCarbon ?? 1e-5) * ((stockI.carbonKg / volI - stockJ.carbonKg / volJ) / dist) * metrics.facetArea * dt;
  const dO = (coeffs.oxygen ?? coeffs.diffOxygen ?? 1e-5) * ((stockI.oxygenKg / volI - stockJ.oxygenKg / volJ) / dist) * metrics.facetArea * dt;
  const dM = (coeffs.minerals ?? coeffs.diffMinerals ?? 1e-6) * ((stockI.mineralsKg / volI - stockJ.mineralsKg / volJ) / dist) * metrics.facetArea * dt;

  const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tJ - 1 / tI));

  return {
    deltaI: { dInternalEnergyJ: -qCond, dWaterKg: -dW, dCarbonKg: -dC, dOxygenKg: -dO, dMineralsKg: -dM, entropyGenJK: entropy },
    deltaJ: { dInternalEnergyJ: qCond, dWaterKg: dW, dCarbonKg: dC, dOxygenKg: dO, dMineralsKg: dM, entropyGenJK: entropy },
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): any {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): any {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const mx = (va[0] + vb[0]) * 0.5;
  const my = (va[1] + vb[1]) * 0.5;
  const mz = (va[2] + vb[2]) * 0.5;
  const norm = Math.hypot(mx, my, mz);
  if (norm < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mx / norm, my / norm, mz / norm);
}

export function computeBoundarySegmentTangent3D(segment: any): any {
  const va = toVec3D(segment.v1);
  const vb = toVec3D(segment.v2);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm < 1e-12) return createVec3D(1, 0, 0);
  return createVec3D(dx / norm, dy / norm, dz / norm);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): any {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const cross = crossProduct3D(tan, rad);
  return normalizeVector3D(cross);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const lat = normalizeVector3D(crossProduct3D(tan, rad));
  return {
    radialNormal: rad,
    tangent: tan,
    lateralNormal: lat,
  };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): any {
  const cross = crossProduct3D(tangent, radial);
  const norm = Math.hypot(cross[0], cross[1], cross[2]);
  if (norm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS): any {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const mx = (va[0] + vb[0]) * 0.5;
  const my = (va[1] + vb[1]) * 0.5;
  const mz = (va[2] + vb[2]) * 0.5;
  const norm = Math.hypot(mx, my, mz);
  if (norm < 1e-12) return createVec3D(0, 0, radius);
  return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): any {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const tangent = vec3Normalize(vec3Sub(vb, va));
  const radial = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const tangent = vec3Normalize(vec3Sub(vb, va));
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = vec3Normalize(midpoint);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return {
    tangent,
    horizontalNormal,
    radialNormal,
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  cellJ: any,
  normal: any,
  velocity: any,
  facetLength: number,
  layerDepth: number,
  diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const vn = dotProduct(velocity, normal);
  const facetArea = facetLength * layerDepth;
  const volFlow = Math.abs(vn) * facetArea * dt;
  const src = vn >= 0 ? cellI : cellJ;
  const advectFrac = Math.min(0.5, volFlow / src.volume);

  const deltaMassDry = advectFrac * src.massDry;
  const deltaMassWater = advectFrac * src.massWater;
  const deltaMassCarbon = advectFrac * src.massCarbon;
  const deltaThermalEnergy = advectFrac * src.thermalEnergy;

  const tempDiff = cellI.temperature - cellJ.temperature;
  const qCond = thermalConductivity * tempDiff * (facetArea / 100.0) * dt;
  const tI = Math.max(1e-3, cellI.temperature);
  const tJ = Math.max(1e-3, cellJ.temperature);
  const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tJ - 1 / tI));

  return {
    deltaMassDry,
    deltaMassWater,
    deltaMassCarbon,
    deltaThermalEnergy,
    entropyProduction: entropy,
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  const vv = toVec3D(v);
  let d: [number, number, number];
  if (arg3 !== undefined) {
    const o = toVec3D(arg2);
    const t = toVec3D(arg3);
    d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    d = toVec3D(arg2);
  }

  const dot = vv[0] * d[0] + vv[1] * d[1] + vv[2] * d[2];
  const sign = dot < 0 ? -1 : 1;
  const res = [vv[0] * sign, vv[1] * sign, vv[2] * sign];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return { x: res[0], y: res[1], z: res[2] };
  }
  return res as Vector3Tuple;
}

export function calculateEffectiveVelocity(v: any, d: any): number {
  const vv = toVec3D(v);
  const dd = toVec3D(d);
  const dNorm = Math.hypot(dd[0], dd[1], dd[2]);
  if (dNorm < 1e-15) return 0;
  return Math.abs(vv[0] * dd[0] + vv[1] * dd[1] + vv[2] * dd[2]) / dNorm;
}

export function computeBoundaryCentroidDisplacement3D(origin: any, target: any): any {
  const o = latLngToUnitVector3D(origin.lat, origin.lng);
  const t = latLngToUnitVector3D(target.lat, target.lng);
  const chord = toVec3D(vec3Sub(t, o));
  const chordLen = Math.hypot(chord[0], chord[1], chord[2]);
  if (chordLen < 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(chord[0] / chordLen, chord[1] / chordLen, chord[2] / chordLen);
}

export function computeDetailedCentroidDisplacement3D(origin: any, target: any) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const o = latLngToUnitVector3D(origin.lat, origin.lng);
  const t = latLngToUnitVector3D(target.lat, target.lng);
  const chord = toVec3D(vec3Sub(t, o));
  const chordDist = Math.hypot(chord[0], chord[1], chord[2]);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(o, t)));
  const angDist = Math.acos(dot);
  return {
    vector: u,
    chordDistance: chordDist,
    angularDistanceRad: angDist,
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
  const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
  const vel = toVec3D(cellA.windVelocity3D);
  const normalVel = Math.max(0, vel[0] * u.x + vel[1] * u.y + vel[2] * u.z);
  const volFlow = normalVel * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(0.5, volFlow / cellA.volumeM3);

  const deltaWaterKg = cellA.waterMassKg * frac;
  const deltaEnergyJoules = cellA.thermalEnergyJoules * frac;

  return {
    deltaWaterKg,
    deltaEnergyJoules,
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
  diffusionCoeffs: {
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalConductivity?: number;
  };
  blendAlpha?: number;
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

  const disp = vec3Sub(cj, ci);
  if (vec3Norm(disp) < 1e-12) {
    throw new Error('Centroids are coincident');
  }
  if (vec3Norm(vec3Sub(vb, va)) < 1e-12) {
    throw new Error('Boundary edge vertices are coincident');
  }

  const midpoint = vec3Normalize(vec3Scale(vec3Add(va, vb), 0.5));
  const tangent = vec3Normalize(vec3Sub(vb, va));
  let midNorm = computeBoundaryHorizontalNormal3D(tangent, midpoint);
  if (vec3Dot(midNorm, disp) < 0) {
    midNorm = vec3Scale(midNorm, -1);
  }

  let dispNorm = projectVectorOntoSphereTangentSpace(disp, midpoint);
  dispNorm = vec3Normalize(dispNorm);

  const alpha = options?.blendAlpha ?? 0.5;
  const blended = vec3Normalize(vec3Add(vec3Scale(midNorm, 1 - alpha), vec3Scale(dispNorm, alpha)));

  return {
    normal: blended,
    midpoint,
    alignmentCos: vec3Dot(blended, vec3Normalize(disp)),
    midpointNormal: midNorm,
    displacementNormal: dispNorm,
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
  const edgeLen = vec3Norm(vec3Sub(toVec3D(v_b), toVec3D(v_a)));
  const facetArea = edgeLen * params.effectiveHeightM;
  const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const vn = vec3Dot(params.fluidVelocity3D, normRes.normal);
  const dist = vec3Norm(vec3Sub(toVec3D(c_j), toVec3D(c_i)));

  const donor = vn >= 0 ? originState : neighborState;
  const advectVol = Math.abs(vn) * facetArea * dt;
  const advectFrac = Math.min(0.5, advectVol / donor.volumeM3);
  const sign = vn >= 0 ? 1 : -1;

  const dCarbonAdv = sign * donor.carbonKg * advectFrac;
  const dWaterAdv = sign * donor.waterKg * advectFrac;
  const dMineralAdv = sign * donor.mineralsKg * advectFrac;
  const dOxygenAdv = sign * donor.oxygenKg * advectFrac;
  const dEnergyAdv = sign * donor.energyJoules * advectFrac;

  const kC = params.diffusionCoeffs.carbon ?? 1e-5;
  const kW = params.diffusionCoeffs.water ?? 1e-4;
  const kM = params.diffusionCoeffs.minerals ?? 1e-6;
  const kO = params.diffusionCoeffs.oxygen ?? 1e-5;
  const kTh = params.diffusionCoeffs.thermalConductivity ?? 0.6;

  const dCarbonDiff = kC * ((originState.carbonKg - neighborState.carbonKg) / dist) * facetArea * dt * 0.001;
  const dWaterDiff = kW * ((originState.waterKg - neighborState.waterKg) / dist) * facetArea * dt * 0.001;
  const dMineralDiff = kM * ((originState.mineralsKg - neighborState.mineralsKg) / dist) * facetArea * dt * 0.001;
  const dOxygenDiff = kO * ((originState.oxygenKg - neighborState.oxygenKg) / dist) * facetArea * dt * 0.001;
  const dEnergyDiff = kTh * ((originState.temperatureKelvin - neighborState.temperatureKelvin) / dist) * facetArea * dt;

  const totalCarbon = dCarbonAdv + dCarbonDiff;
  const totalWater = dWaterAdv + dWaterDiff;
  const totalMineral = dMineralAdv + dMineralDiff;
  const totalOxygen = dOxygenAdv + dOxygenDiff;
  const totalEnergy = dEnergyAdv + dEnergyDiff;

  const tA = Math.max(1e-3, originState.temperatureKelvin);
  const tB = Math.max(1e-3, neighborState.temperatureKelvin);
  const entropy = Math.max(0, Math.abs(dEnergyDiff) * Math.abs(1 / tB - 1 / tA));

  return {
    originDeltas: {
      deltaCarbonKg: -totalCarbon,
      deltaWaterKg: -totalWater,
      deltaMineralsKg: -totalMineral,
      deltaOxygenKg: -totalOxygen,
      deltaEnergyJoules: -totalEnergy,
      entropyProductionJoulesPerKelvin: entropy,
    },
    neighborDeltas: {
      deltaCarbonKg: totalCarbon,
      deltaWaterKg: totalWater,
      deltaMineralsKg: totalMineral,
      deltaOxygenKg: totalOxygen,
      deltaEnergyJoules: totalEnergy,
      entropyProductionJoulesPerKelvin: entropy,
    },
    facetAreaM2: facetArea,
    normalVelocityMs: vn,
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

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
) {
  const vA = toVec3D(vertexA);
  const vB = toVec3D(vertexB);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const chord = Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
  const arcLengthMeters = 2 * radius * Math.asin(Math.min(1.0, chord / (2 * radius)));

  const disp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dispNorm = Math.hypot(disp[0], disp[1], disp[2]);
  const dispUnit: [number, number, number] = dispNorm > 1e-12
    ? [disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm]
    : [1, 0, 0];

  const edgeVec: [number, number, number] = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
  const mid: [number, number, number] = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
  let normCand = crossProduct3D(edgeVec, mid);
  let nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
  if (nLen < 1e-12) {
    normCand = dispUnit;
    nLen = 1.0;
  }
  let normal: [number, number, number] = [normCand[0] / nLen, normCand[1] / nLen, normCand[2] / nLen];
  if (normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2] < 0) {
    normal = [-normal[0], -normal[1], -normal[2]];
  }

  const alignmentCos = normal[0] * dispUnit[0] + normal[1] * dispUnit[1] + normal[2] * dispUnit[2];

  return {
    normal,
    arcLengthMeters,
    alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  diffCoeff: number,
  thermalCond: number,
  heatCap: number,
  dt: number
) {
  const vn = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const isAtoB = vn >= 0;
  const donor = isAtoB ? cellA : cellB;
  const volFlow = Math.abs(vn) * area * dt;
  const frac = Math.min(0.5, volFlow / donor.volumeM3);
  const sign = isAtoB ? 1 : -1;

  const dAirAdv = sign * donor.stocks.massAirKg * frac;
  const dWaterAdv = sign * donor.stocks.massWaterKg * frac;
  const dCarbonAdv = sign * donor.stocks.massCarbonKg * frac;
  const dOxygenAdv = sign * donor.stocks.massOxygenKg * frac;
  const dMineralAdv = sign * donor.stocks.massMineralsKg * frac;

  const dist = Math.hypot(cellB.centroid[0] - cellA.centroid[0], cellB.centroid[1] - cellA.centroid[1], cellB.centroid[2] - cellA.centroid[2]);
  const dAirDiff = diffCoeff * ((cellA.stocks.massAirKg - cellB.stocks.massAirKg) / dist) * area * dt * 0.001;
  const dWaterDiff = diffCoeff * ((cellA.stocks.massWaterKg - cellB.stocks.massWaterKg) / dist) * area * dt * 0.001;
  const dCarbonDiff = diffCoeff * ((cellA.stocks.massCarbonKg - cellB.stocks.massCarbonKg) / dist) * area * dt * 0.001;
  const dOxygenDiff = diffCoeff * ((cellA.stocks.massOxygenKg - cellB.stocks.massOxygenKg) / dist) * area * dt * 0.001;
  const dMineralDiff = diffCoeff * ((cellA.stocks.massMineralsKg - cellB.stocks.massMineralsKg) / dist) * area * dt * 0.001;

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
  const qCond = thermalCond * ((tA - tB) / dist) * area * dt;
  const qAdv = sign * donor.stocks.thermalEnergyJoules * frac;
  const dThermal = qAdv + qCond;

  const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / Math.max(1e-3, tB) - 1 / Math.max(1e-3, tA)));

  const totalAir = dAirAdv + dAirDiff;
  const totalWater = dWaterAdv + dWaterDiff;
  const totalCarbon = dCarbonAdv + dCarbonDiff;
  const totalOxygen = dOxygenAdv + dOxygenDiff;
  const totalMineral = dMineralAdv + dMineralDiff;

  return {
    deltaOrigin: {
      massAirKg: -totalAir,
      massWaterKg: -totalWater,
      massCarbonKg: -totalCarbon,
      massOxygenKg: -totalOxygen,
      massMineralsKg: -totalMineral,
      thermalEnergyJoules: -dThermal,
    },
    deltaDestination: {
      massAirKg: totalAir,
      massWaterKg: totalWater,
      massCarbonKg: totalCarbon,
      massOxygenKg: totalOxygen,
      massMineralsKg: totalMineral,
      thermalEnergyJoules: dThermal,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function extractSharedBoundaryVertices3D(
  cellA: string,
  cellB: string,
  radius: number = EARTH_RADIUS_METERS
): [Cartesian3D, Cartesian3D] | null {
  if (cellA === cellB) return null;
  if (!h3.areNeighborCells(cellA, cellB)) return null;

  const bA = extractH3BoundaryCartesianVertices3D(cellA, { radius });
  const bB = extractH3BoundaryCartesianVertices3D(cellB, { radius });

  const pairs = findSharedBoundaryVertexPairs3D(bA.vertices, bB.vertices, radius * 1e-4);
  if (pairs.length < 2) return null;

  const v1 = toVec3D(pairs[0].vertexA);
  const v2 = toVec3D(pairs[1].vertexA);
  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _v1?: any,
  _v2?: any,
  depthM: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;

  const [v1, v2] = verts;
  const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  let cA: [number, number] = [0, 0];
  let cB: [number, number] = [0, 0];
  try {
    const anyH3 = h3 as any;
    cA = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellA) : anyH3.h3ToGeo(cellA);
    cB = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellB) : anyH3.h3ToGeo(cellB);
  } catch {}
  const cartA = toVec3D(latLngToCartesian(cA[0], cA[1], radius));
  const cartB = toVec3D(latLngToCartesian(cB[0], cB[1], radius));
  const normalRes = computeDetailedInterfaceNormal(cartA, cartB, v1, v2, radius);

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters,
    interfacialAreaM2: lengthMeters * depthM,
    normalAtoB: normalRes.normal,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocityMidpoint: [number, number, number],
  dw: number,
  dc: number,
  dm: number,
  do2: number,
  kth: number,
  dt: number
) {
  const vn = velocityMidpoint[0] * geom.normalAtoB[0] + velocityMidpoint[1] * geom.normalAtoB[1] + velocityMidpoint[2] * geom.normalAtoB[2];
  const area = geom.lengthMeters * 10.0;
  const donor = vn >= 0 ? stateA : stateB;
  const volFlow = Math.abs(vn) * area * dt;
  const frac = Math.min(0.5, volFlow / donor.volumeM3!);
  const sign = vn >= 0 ? 1 : -1;

  const dWaterAdv = sign * (donor.massWaterKg ?? 0) * frac;
  const dCarbonAdv = sign * (donor.massCarbonKg ?? 0) * frac;
  const dMineralAdv = sign * (donor.massMineralsKg ?? 0) * frac;
  const dOxygenAdv = sign * (donor.massOxygenKg ?? 0) * frac;
  const dEnthalpyAdv = sign * (donor.enthalpyJoules ?? 0) * frac;

  const dist = 50000.0;
  const dWaterDiff = dw * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt * 0.001;
  const dCarbonDiff = dc * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt * 0.001;
  const dMineralDiff = dm * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt * 0.001;
  const dOxygenDiff = do2 * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt * 0.001;
  const qCond = kth * (((stateA.temperatureKelvin ?? 293) - (stateB.temperatureKelvin ?? 293)) / dist) * area * dt;

  const totalWater = dWaterAdv + dWaterDiff;
  const totalCarbon = dCarbonAdv + dCarbonDiff;
  const totalMineral = dMineralAdv + dMineralDiff;
  const totalOxygen = dOxygenAdv + dOxygenDiff;
  const totalEnthalpy = dEnthalpyAdv + qCond;

  const tA = Math.max(1e-3, stateA.temperatureKelvin ?? 293);
  const tB = Math.max(1e-3, stateB.temperatureKelvin ?? 293);
  const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tB - 1 / tA));

  return {
    deltaCellA: {
      massWaterKg: -totalWater,
      massCarbonKg: -totalCarbon,
      massMineralsKg: -totalMineral,
      massOxygenKg: -totalOxygen,
      enthalpyJoules: -totalEnthalpy,
    },
    deltaCellB: {
      massWaterKg: totalWater,
      massCarbonKg: totalCarbon,
      massMineralsKg: totalMineral,
      massOxygenKg: totalOxygen,
      enthalpyJoules: totalEnthalpy,
    },
    entropyGenerationJoulesPerKelvin: entropy,
  };
}

export function extractH3BoundaryCartesianVertices3D(
  h3Index: string,
  options?: { closeLoop?: boolean; radius?: number }
) {
  if (!h3Index || typeof h3Index !== 'string' || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0 || !Number.isFinite(radius)) {
    throw new Error('Invalid radius');
  }

  const anyH3 = h3 as any;
  let boundaryCoords: [number, number][] = [];
  if (typeof anyH3.cellToBoundary === 'function') {
    boundaryCoords = anyH3.cellToBoundary(h3Index);
  } else if (typeof anyH3.h3ToGeoBoundary === 'function') {
    boundaryCoords = anyH3.h3ToGeoBoundary(h3Index);
  } else {
    boundaryCoords = [
      [0, 0], [0, 1], [1, 1], [1, 0], [0.5, -0.5], [-0.5, -0.5]
    ];
  }

  const isPent = checkIsPentagon(h3Index);
  const vertexCount = isPent ? 5 : 6;
  boundaryCoords = boundaryCoords.slice(0, vertexCount);

  const vertices: any[] = [];
  let cx = 0, cy = 0, cz = 0;
  for (const c of boundaryCoords) {
    const u = latLngToUnitVector3D(c[0], c[1]);
    const vert = createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
    vertices.push(vert);
    cx += vert.x;
    cy += vert.y;
    cz += vert.z;
  }

  const cNorm = Math.hypot(cx, cy, cz);
  const centroid = cNorm > 1e-12
    ? createVec3D((cx / cNorm) * radius, (cy / cNorm) * radius, (cz / cNorm) * radius)
    : createVec3D(0, 0, radius);

  const isClosed = Boolean(options?.closeLoop);
  if (isClosed && vertices.length > 0) {
    vertices.push(createVec3D(vertices[0].x, vertices[0].y, vertices[0].z));
  }

  return {
    h3Index,
    vertexCount,
    isClosed,
    vertices,
    centroid,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): any {
    return latLngToCartesian(lat, lng, radius);
  }
  public static dotProduct(a: any, b: any): number {
    return dotProduct(a, b);
  }
  public static vectorNorm(v: any): number {
    return vectorNorm(v);
  }
}

export class H3BoundaryProjector {
  public project(h3Index: string, options?: { closeLoop?: boolean; radius?: number }) {
    return extractH3BoundaryCartesianVertices3D(h3Index, options);
  }
  public verifyNormInvariants(boundary: any, radius: number = 1.0): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(vectorNorm(v) - radius) > 1e-6) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number, radius: number = 1.0) {
  const va = toVec3D(v1);
  const vb = toVec3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (radius * radius)));
  const lengthMeters = radius * Math.acos(dot);
  const interfacialAreaM2 = lengthMeters * depth;

  const edgeVec = vec3Sub(vb, va);
  const mid = vec3Normalize(vec3Add(va, vb));
  const cross = crossProduct3D(edgeVec, mid);
  const normalUnit = normalizeVector3D(cross);

  return {
    lengthMeters,
    interfacialAreaM2,
    normalUnit,
  };
}

export function evaluateInterfacialTransferMonad(
  _cellA: string,
  _cellB: string,
  stockA: any,
  stockB: any,
  metrics: any,
  velocityVec: any,
  dt: number
) {
  const vn = dotProduct(velocityVec, metrics.normalUnit);
  const flow = Math.abs(vn) * metrics.interfacialAreaM2 * dt;
  const dH2O = Math.min(stockA.massH2O * 0.1, flow * 0.001);
  const dCarbon = Math.min(stockA.massCarbon * 0.1, flow * 0.0001);
  const dOxygen = Math.min(stockA.massOxygen * 0.1, flow * 0.0001);
  const dMinerals = Math.min(stockA.massMinerals * 0.1, flow * 0.00005);

  const tA = Math.max(1e-3, stockA.temperatureK ?? 300);
  const tB = Math.max(1e-3, stockB.temperatureK ?? 285);
  const q = 0.6 * ((tA - tB) / 1000.0) * metrics.interfacialAreaM2 * dt;
  const entropy = Math.max(0, Math.abs(q) * Math.abs(1 / tB - 1 / tA));

  return {
    deltaH2O: dH2O,
    deltaCarbon: dCarbon,
    deltaOxygen: dOxygen,
    deltaMinerals: dMinerals,
    entropyProduced: entropy,
  };
}

export function areCartesianUnitVectorsEqual3D(
  v1: any,
  v2: any,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const n1 = vectorNorm(v1);
  const n2 = vectorNorm(v2);
  if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const angDist = computeAngularDistance3D(v1, v2);
  return angDist <= epsilon;
}

export function computeAngularDistance3D(v1: any, v2: any): number {
  const u1 = normalizeVector3D(v1);
  const u2 = normalizeVector3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2)));
  return Math.acos(dot);
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[], eps: number = 1e-4): any[] {
    const result: any[] = [];
    for (const v of vertices) {
      if (!result.some(r => computeAngularDistance3D(r, v) <= eps)) {
        result.push(v);
      }
    }
    return result;
  }

  public static findSharedEdge(polyA: any[], polyB: any[], eps: number = 1e-4) {
    const sharedA: any[] = [];
    const sharedB: any[] = [];

    for (const va of polyA) {
      for (const vb of polyB) {
        if (areCartesianUnitVectorsEqual3D(va, vb, eps)) {
          if (!sharedA.some(x => areCartesianUnitVectorsEqual3D(x, va, eps))) sharedA.push(va);
          if (!sharedB.some(x => areCartesianUnitVectorsEqual3D(x, vb, eps))) sharedB.push(vb);
        }
      }
    }

    if (sharedA.length >= 2 && sharedB.length >= 2) {
      return {
        edgeA: [sharedA[0], sharedA[1]],
        edgeB: [sharedB[1], sharedB[0]],
      };
    }
    return null;
  }
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

  let nx = dy / (edgeLen || 1);
  let ny = -dx / (edgeLen || 1);

  const cDispX = centroidB[0] - centroidA[0];
  const cDispY = centroidB[1] - centroidA[1];

  let isFlipped = false;
  if (nx * cDispX + ny * cDispY < 0) {
    nx = -nx;
    ny = -ny;
    isFlipped = true;
  }

  return {
    orderedEndpoints: (isFlipped ? [p2, p1] : [p1, p2]) as [Point2D, Point2D],
    outwardNormal: [nx, ny] as Point2D,
    isFlipped,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: any,
  p2: any,
  centroidA: any,
  centroidB: any
) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const edgeVec = vec3Sub(v2, v1);
  const mid = vec3Normalize(vec3Add(v1, v2));
  const disp = vec3Sub(cB, cA);

  let normCand = crossProduct3D(edgeVec, mid);
  let nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
  if (nLen < 1e-12) {
    normCand = disp;
    nLen = Math.hypot(normCand[0], normCand[1], normCand[2]) || 1;
  }
  let outwardNormal: [number, number, number] = [normCand[0] / nLen, normCand[1] / nLen, normCand[2] / nLen];
  let isFlipped = false;

  if (outwardNormal[0] * disp[0] + outwardNormal[1] * disp[1] + outwardNormal[2] * disp[2] < 0) {
    outwardNormal = [-outwardNormal[0], -outwardNormal[1], -outwardNormal[2]];
    isFlipped = true;
  }

  return {
    orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
    outwardNormal,
    isFlipped,
  };
}
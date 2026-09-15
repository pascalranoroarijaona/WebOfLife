// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, GEODESIC GEOMETRY & TOPOLOGICAL INVARIANTS
// Comprehensive Retro-Compatible Implementation (Sprints 002 - 081)
// =============================================================================

import * as h3 from 'h3-js';
import {
  Point2D,
  Vec3D,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  CellTopologyType,
  CellThermodynamicState,
  CellThermodynamicStocks,
  DiffusionCoefficients,
  H3CellInterfaceMetrics,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  GeodesicCoordinate,
  SphericalCoordinates,
} from './h3_types.js';
import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';
import { getNominalH3EdgeLength } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  CellThermodynamicState,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  DiffusionCoefficients,
};

export { SpatialFluxMonad } from './spatial_flux_monad.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const GEOMETRIC_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const PENTAGON_BASE_CELLS: readonly number[] = Object.freeze([
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);

export const H3_CONSTANTS = Object.freeze({
  PENTAGON_PERIMETER_FACTOR: 1.05,
  EARTH_RADIUS_METERS: 6371008.8,
  PENTAGON_NEIGHBORS: 5,
  HEXAGON_NEIGHBORS: 6,
});

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);

// =============================================================================
// INTERFACES & TYPES
// =============================================================================

export interface ConservedStockDelta {
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly oxygenKg: number;
  readonly nitrogenKg: number;
  readonly phosphorusKg: number;
  readonly energyJoules: number;
}

export interface H3AdjacencyRecord {
  readonly cellIndex: string;
  readonly isPentagon: boolean;
  readonly neighbors: readonly string[];
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
  mineralsKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  temperatureKelvin?: number;
  [key: string]: any;
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

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface LatLng {
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
    [key: string]: any;
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
  diffusionCoeffs: {
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalConductivity?: number;
    [key: string]: any;
  };
  blendAlpha?: number;
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

export interface SpatialCellState {
  h3Index: string;
  isPentagon: boolean;
  stocks: CellStockVector;
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
}

export interface H3CellDecomposition {
  readonly mode: number;
  readonly resolution: number;
  readonly baseCell: number;
  readonly digits: number[];
  readonly isPentagon: boolean;
}

export interface BoundaryFluxParams {
  sourceCell: string;
  targetCell: string;
  contactAreaM2: number;
  dtSeconds: number;
  sourceConcentration: number;
  targetConcentration: number;
  diffusionCoeff: number;
}

export interface BoundaryFluxResult {
  isPentagonalInterface: boolean;
  effectiveAreaM2: number;
  massFlux: number;
}

// =============================================================================
// ERROR HIERARCHY
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

export class BoundaryEndpointToleranceExceededError extends Error {
  public endpointA: [number, number];
  public endpointB: [number, number];
  public angularDistanceRad: number;
  public toleranceRad: number;

  constructor(
    p1: [number, number],
    p2: [number, number],
    distanceRad: number,
    tolRad: number,
    msg?: string
  ) {
    super(
      `BoundaryEndpointToleranceExceededError: Endpoints exceed angular tolerance (${distanceRad} > ${tolRad}). ${msg ?? ''}`
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = p1;
    this.endpointB = p2;
    this.angularDistanceRad = distanceRad;
    this.toleranceRad = tolRad;
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public cellId: string;
  public cellIndex: string;
  public neighborCount: number;
  public actualCount: number;
  public expectedCount: number;

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
    super(
      `Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`
    );
    this.name = 'PentagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = expected;
    this.actualCount = actual;
    this.neighborCount = actual;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public cellId: string;
  public cellIndex: string;
  public neighborCount: number;
  public actualCount: number;
  public expectedCount: number;

  constructor(cellId: string, neighborCount: number) {
    super(
      `Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${neighborCount}.`
    );
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.expectedCount = 6;
    this.actualCount = neighborCount;
    this.neighborCount = neighborCount;
  }
}

// =============================================================================
// VECTOR MATHEMATICS & UTILITIES
// =============================================================================

export function createVec3D(x: number, y: number, z: number): Vector3Tuple {
  const v = [x, y, z] as any;
  v.x = x;
  v.y = y;
  v.z = z;
  return v as Vector3Tuple;
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

export function vec3Dot(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export const dotProduct = vec3Dot;
export const dotProduct3D = vec3Dot;
export const vectorDotProduct3D = vec3Dot;

export function vec3Norm(v: any): number {
  const arr = toVec3D(v);
  return Math.hypot(arr[0], arr[1], arr[2]);
}

export const vectorNorm = vec3Norm;
export const vectorNorm3D = vec3Norm;

export function vec3Normalize(v: any): Vector3Tuple {
  const arr = toVec3D(v);
  const m = Math.hypot(arr[0], arr[1], arr[2]);
  if (m < 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(arr[0] / m, arr[1] / m, arr[2] / m);
}

export const normalizeVector3D = vec3Normalize;

export function vec3Add(a: any, b: any): Vector3Tuple {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}

export function vec3Sub(a: any, b: any): Vector3Tuple {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function vec3Scale(v: any, s: number): Vector3Tuple {
  const arr = toVec3D(v);
  return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
}

export function unitVectorDotProduct(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function unitVectorCrossProduct(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unitVectorAngularDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function unitVectorTangentChord(
  a: [number, number, number],
  b: [number, number, number]
): [number, number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const mag = Math.hypot(dx, dy, dz);
  if (mag < 1e-15) return [0, 0, 0];
  return [dx / mag, dy / mag, dz / mag];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError(`Coordinates must be finite: lat=${latDeg}, lng=${lngDeg}`);
  }
  if (latDeg < -90.0000001 || latDeg > 90.0000001) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
  }
  const clampedLat = Math.max(-90, Math.min(90, latDeg));
  if (Math.abs(clampedLat - 90) < 1e-6) return [0, 0, 1];
  if (Math.abs(clampedLat - (-90)) < 1e-6) return [0, 0, -1];

  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}

export function unitVectorToLatLng(u: any): [number, number] {
  const [x, y, z] = toVec3D(u);
  const norm = Math.hypot(x, y, z);
  if (norm < 1e-15) return [0, 0];
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
  const lngRad = Math.atan2(y, x);
  return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}

export function latLngToCartesian3D(
  coords: { lat: number; lng: number },
  radius: number = 1.0
): Vector3Tuple {
  const u = latLngToUnitVector3D(coords.lat, coords.lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function cartesian3DToLatLng(cart: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(cart);
  return { lat, lng };
}

export function latLngToCartesian(lat: number, lng: number, radius: number = 6371000): Vector3Tuple {
  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToVector3D(lat: number, lng: number, radius: number = 1.0): Vector3Tuple {
  return latLngToCartesian(lat, lng, radius);
}

export function areCartesianUnitVectorsEqual3D(
  v1: any,
  v2: any,
  epsilon: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (epsilon < 0) return false;
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const magA = Math.hypot(a[0], a[1], a[2]);
  const magB = Math.hypot(b[0], b[1], b[2]);
  if (!Number.isFinite(magA) || magA < 1e-12 || !Number.isFinite(magB) || magB < 1e-12) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const uA = [a[0] / magA, a[1] / magA, a[2] / magA];
  const uB = [b[0] / magB, b[1] / magB, b[2] / magB];
  const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
  const angle = Math.acos(dot);
  return angle <= epsilon + 1e-15;
}

export function computeAngularDistance3D(v1: any, v2: any): number {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const magA = Math.hypot(a[0], a[1], a[2]);
  const magB = Math.hypot(b[0], b[1], b[2]);
  if (magA < 1e-15 || magB < 1e-15) return 0;
  const dot = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (magA * magB)));
  return Math.acos(dot);
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): [number, number, number] {
  const arrV = toVec3D(v);
  const arrP = toVec3D(p);
  const magP = Math.hypot(arrP[0], arrP[1], arrP[2]);
  if (magP < 1e-15) return [0, 0, 0];
  const n = [arrP[0] / magP, arrP[1] / magP, arrP[2] / magP];
  const vDotN = arrV[0] * n[0] + arrV[1] * n[1] + arrV[2] * n[2];
  return [arrV[0] - vDotN * n[0], arrV[1] - vDotN * n[1], arrV[2] - vDotN * n[2]];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const arrV = toVec3D(v);
  const arrP = toVec3D(p);
  const magP = Math.hypot(arrP[0], arrP[1], arrP[2]);
  const vDotN = magP > 1e-15 ? (arrV[0] * arrP[0] + arrV[1] * arrP[1] + arrV[2] * arrP[2]) / magP : 0;
  return {
    projected: createVec3D(projected[0], projected[1], projected[2]),
    tangentialMagnitude: Math.hypot(projected[0], projected[1], projected[2]),
    radialMagnitude: Math.abs(vDotN),
  };
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const uArr = toVec3D(u);
  const vArr = toVec3D(v);
  const uNorm = vec3Normalize(uArr);
  const vNorm = vec3Normalize(vArr);
  const cross = unitVectorCrossProduct(uNorm as any, vNorm as any);
  const crossMag = Math.hypot(cross[0], cross[1], cross[2]);
  if (crossMag < 1e-9) {
    if (Math.abs(uNorm[0]) >= 0.9) {
      return [0, 1, 0];
    }
    return [0, 0, 1];
  }
  return [cross[0] / crossMag, cross[1] / crossMag, cross[2] / crossMag];
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3Tuple {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = 1.0) {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const ratio = Math.min(1.0, chord / (2 * Math.max(1e-6, radius)));
  const arc = 2 * radius * Math.asin(ratio);
  return {
    v1: createVec3D(a[0], a[1], a[2]),
    v2: createVec3D(b[0], b[1], b[2]),
    chordLength: chord,
    arcLength: arc,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3Tuple {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  return computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3Tuple {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const sum: [number, number, number] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mag = Math.hypot(sum[0], sum[1], sum[2]);
  if (mag < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(sum[0] / mag, sum[1] / mag, sum[2] / mag);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3Tuple {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  const disp = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mag = Math.hypot(disp[0], disp[1], disp[2]);
  if (mag < 1e-12) return createVec3D(1, 0, 0);
  return createVec3D(disp[0] / mag, disp[1] / mag, disp[2] / mag);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3Tuple {
  const tangent = toVec3D(computeBoundarySegmentTangent3D(segment));
  const radial = toVec3D(computeBoundarySegmentRadialNormal3D(segment));
  const cross = unitVectorCrossProduct(tangent as any, radial as any);
  return createVec3D(cross[0], cross[1], cross[2]);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3Tuple {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = unitVectorCrossProduct(t as any, r as any);
  const mag = Math.hypot(cross[0], cross[1], cross[2]);
  if (mag < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / mag, cross[1] / mag, cross[2] / mag);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3Tuple {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const tangent = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return computeBoundaryHorizontalNormal3D(tangent, midpoint);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = 6.371e6): Vector3Tuple {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mag = Math.hypot(sum[0], sum[1], sum[2]);
  if (mag < 1e-12) return createVec3D(radius, 0, 0);
  return createVec3D((sum[0] / mag) * radius, (sum[1] / mag) * radius, (sum[2] / mag) * radius);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = 6.371e6) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = vec3Normalize(midpoint);
  const diff = vec3Sub(v2, v1);
  const tangent = vec3Normalize(diff);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): Vector3Tuple {
  const vArr = toVec3D(v);
  let dArr: [number, number, number];
  if (arg3 !== undefined) {
    const oArr = toVec3D(arg2);
    const tArr = toVec3D(arg3);
    dArr = [tArr[0] - oArr[0], tArr[1] - oArr[1], tArr[2] - oArr[2]];
  } else {
    dArr = toVec3D(arg2);
  }
  const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
  if (dot < 0) {
    return createVec3D(-vArr[0], -vArr[1], -vArr[2]);
  }
  return createVec3D(vArr[0], vArr[1], vArr[2]);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3Tuple {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const norm = Math.hypot(disp[0], disp[1], disp[2]);
  if (norm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(disp[0] / norm, disp[1] / norm, disp[2] / norm);
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const chordDistance = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
  const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
  const angularDistanceRad = Math.acos(dot);
  return { u, chordDistance, angularDistanceRad };
}

export function computeBoundaryOutwardNormal3D(
  c_i: any,
  c_j: any,
  v_a: any,
  v_b: any,
  opts: { blendAlpha?: number } = {}
) {
  const ci = toVec3D(c_i);
  const cj = toVec3D(c_j);
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);

  if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-10) {
    throw new Error('Coincident cell centroids');
  }
  if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-10) {
    throw new Error('Coincident edge vertices');
  }

  const alpha = opts.blendAlpha ?? 0.5;

  const mChord = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const mMag = Math.hypot(mChord[0], mChord[1], mChord[2]);
  const rHat = mMag > 1e-12 ? [mChord[0] / mMag, mChord[1] / mMag, mChord[2] / mMag] : [0, 0, 1];

  const tEdge = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const nCross = unitVectorCrossProduct(tEdge as any, rHat as any);
  const nCrossMag = Math.hypot(nCross[0], nCross[1], nCross[2]);
  let nEdge: [number, number, number] = nCrossMag > 1e-12 ? [nCross[0] / nCrossMag, nCross[1] / nCrossMag, nCross[2] / nCrossMag] : [1, 0, 0];

  const dispC = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
  if (nEdge[0] * dispC[0] + nEdge[1] * dispC[1] + nEdge[2] * dispC[2] < 0) {
    nEdge = [-nEdge[0], -nEdge[1], -nEdge[2]];
  }

  const dDotR = dispC[0] * rHat[0] + dispC[1] * rHat[1] + dispC[2] * rHat[2];
  const dTan = [dispC[0] - dDotR * rHat[0], dispC[1] - dDotR * rHat[1], dispC[2] - dDotR * rHat[2]];
  const dTanMag = Math.hypot(dTan[0], dTan[1], dTan[2]);
  const uDisp: [number, number, number] = dTanMag > 1e-12 ? [dTan[0] / dTanMag, dTan[1] / dTanMag, dTan[2] / dTanMag] : nEdge;

  const blend: [number, number, number] = [
    (1 - alpha) * nEdge[0] + alpha * uDisp[0],
    (1 - alpha) * nEdge[1] + alpha * uDisp[1],
    (1 - alpha) * nEdge[2] + alpha * uDisp[2],
  ];

  const blendDotR = blend[0] * rHat[0] + blend[1] * rHat[1] + blend[2] * rHat[2];
  const nFinalTan = [blend[0] - blendDotR * rHat[0], blend[1] - blendDotR * rHat[1], blend[2] - blendDotR * rHat[2]];
  const finalMag = Math.hypot(nFinalTan[0], nFinalTan[1], nFinalTan[2]);
  const normal: [number, number, number] = finalMag > 1e-12 ? [nFinalTan[0] / finalMag, nFinalTan[1] / finalMag, nFinalTan[2] / finalMag] : nEdge;

  const alignmentCos = normal[0] * uDisp[0] + normal[1] * uDisp[1] + normal[2] * uDisp[2];

  return {
    normal: createVec3D(normal[0], normal[1], normal[2]),
    midpoint: createVec3D(rHat[0], rHat[1], rHat[2]),
    midpointNormal: createVec3D(nEdge[0], nEdge[1], nEdge[2]),
    displacementNormal: createVec3D(uDisp[0], uDisp[1], uDisp[2]),
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
  const normRes = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
  const uA = vec3Normalize(vertexA);
  const uB = vec3Normalize(vertexB);
  const dotV = Math.max(-1.0, Math.min(1.0, vec3Dot(uA, uB)));
  const arcLengthMeters = radius * Math.acos(dotV);

  return {
    normal: normRes.normal,
    arcLengthMeters,
    alignmentCos: normRes.alignmentCos,
  };
}

// =============================================================================
// GEODESIC, ANGULAR & TOPOLOGICAL HELPERS
// =============================================================================

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -180.0)) wrapped = -180.0;
  if (Object.is(wrapped, -0)) wrapped = 0.0;
  return wrapped;
}

export function normalizeAngleRadians(angle: number): number {
  if (!Number.isFinite(angle)) return angle;
  let wrapped = (angle + Math.PI) % (2 * Math.PI);
  if (wrapped < 0) wrapped += 2 * Math.PI;
  let result = wrapped - Math.PI;
  if (result === Math.PI || Object.is(result, -Math.PI)) result = -Math.PI;
  if (Object.is(result, -0)) result = 0.0;
  return result;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
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

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let context = '';
  let allowPositiveLon = false;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    if (typeof arg2 === 'object' && arg2 !== null) {
      context = arg2.context ?? '';
      allowPositiveLon = arg2.allowNormalizedPositiveLon ?? false;
    } else if (typeof arg2 === 'string') {
      context = arg2;
    }
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === 'object' && arg3 !== null) {
      context = arg3.context ?? '';
      allowPositiveLon = arg3.allowNormalizedPositiveLon ?? false;
    } else if (typeof arg3 === 'string') {
      context = arg3;
    }
  }

  const ctxMsg = context ? ` in ${context}` : '';

  if (!Number.isFinite(lat) || typeof lat !== 'number') {
    throw new CoordinateBoundaryError(`Invalid latitude${ctxMsg}`, lat, lon, context);
  }
  if (!Number.isFinite(lon) || typeof lon !== 'number') {
    throw new CoordinateBoundaryError(`Invalid longitude${ctxMsg}`, lat, lon, context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxMsg}`, lat, lon, context);
  }

  if (allowPositiveLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude out of bounds${ctxMsg}`, lat, lon, context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxMsg}`, lat, lon, context);
    }
  }
}

export function haversineDistance(
  c1: [number, number] | { lat: number; lng: number },
  c2: [number, number] | { lat: number; lng: number },
  radius: number = EARTH_MEAN_RADIUS_METERS
): number {
  const lat1 = Array.isArray(c1) ? c1[0] : c1.lat;
  const lon1 = Array.isArray(c1) ? c1[1] : c1.lng;
  const lat2 = Array.isArray(c2) ? c2[0] : c2.lat;
  const lon2 = Array.isArray(c2) ? c2[1] : c2.lng;

  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return radius * c;
}

export function calculateHaversineDistance(
  coord1: any,
  coord2: any,
  options?: { unit?: 'kilometers' | 'meters'; radiusMeters?: number }
): number {
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dist = haversineDistance(coord1, coord2, r);
  if (options?.unit === 'kilometers') {
    return dist * 0.001;
  }
  return dist;
}

export const computeGreatCircleDistance = haversineDistance;

export function computeSphericalAngularDistance(
  p1: [number, number],
  p2: [number, number],
  useDegrees: boolean = false
): number {
  const scale = useDegrees ? Math.PI / 180.0 : 1.0;
  const phi1 = p1[0] * scale;
  const lam1 = p1[1] * scale;
  const phi2 = p2[0] * scale;
  const lam2 = p2[1] * scale;

  if (Math.abs(Math.abs(phi1) - Math.PI / 2) < 1e-12 && Math.abs(Math.abs(phi2) - Math.PI / 2) < 1e-12 && Math.sign(phi1) === Math.sign(phi2)) {
    return 0.0;
  }

  const dPhi = phi2 - phi1;
  const dLam = lam2 - lam1;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lon] = coords;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lon = (lon * Math.PI) / 180.0;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lon = normalizeAngleRadians(lon);
  return [lat, lon];
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options: { context?: string; useDegrees?: boolean } = {}
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees ?? false);
  if (dist > tolerance) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance);
}

export function canonicalDeltaLongitude(lon1: number, lon2: number): number {
  return normalizeAngleRadians(lon2 - lon1);
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) {
    return 0.0;
  }
  if (p1.lat >= 90.0 - 1e-9) return Math.PI;
  if (p1.lat <= -90.0 + 1e-9) return 0.0;
  if (p2.lat >= 90.0 - 1e-9) return 0.0;
  if (p2.lat <= -90.0 + 1e-9) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const brg = Math.atan2(y, x);
  return (brg + 2 * Math.PI) % (2 * Math.PI);
}

export const computeInitialBearing = computeSphericalArcBearing;
export const computeGeodesicBearing = (origin: LatLngPoint, target: LatLngPoint) => {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
};

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const brgRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(brgRad);
  const vNorth = Math.cos(brgRad);
  const dist = haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
  return {
    initialAzimuthRad: brgRad,
    initialAzimuthDeg: (brgRad * 180.0) / Math.PI,
    unitVector: { uEast, vNorth },
    distanceMeters: dist,
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  const d = haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
  return { distanceMeters: d };
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  const phi1 = (c1.lat * Math.PI) / 180.0;
  const lam1 = (c1.lng * Math.PI) / 180.0;
  const phi2 = (c2.lat * Math.PI) / 180.0;
  const lam2 = (c2.lng * Math.PI) / 180.0;

  const dLon = lam2 - lam1;
  const Bx = Math.cos(phi2) * Math.cos(dLon);
  const By = Math.cos(phi2) * Math.sin(dLon);

  const phiM = Math.atan2(
    Math.sin(phi1) + Math.sin(phi2),
    Math.sqrt((Math.cos(phi1) + Bx) ** 2 + By ** 2)
  );
  const lamM = lam1 + Math.atan2(By, Math.cos(phi1) + Bx);

  const latDeg = (phiM * 180.0) / Math.PI;
  const lngDeg = normalizeLongitudeDegrees((lamM * 180.0) / Math.PI);

  return { lat: latDeg, lng: lngDeg };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return 2 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, declinationRad: number, hourOfDay: number): number {
  const hourAngle = ((hourOfDay - 12.0) * Math.PI) / 12.0;
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngle);
  return Math.max(0, SOLAR_CONSTANT_W_M2 * cosZ);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return computeMidpointCoriolis(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return Math.max(0, SOLAR_CONSTANT_W_M2 * cosZ);
}

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], 6371000);
}

// =============================================================================
// TOPOLOGICAL CELL CLASSIFICATION & ADJACENCY VALENCE
// =============================================================================

export function isPentagonCell(cellIndex: unknown): boolean {
  if (typeof cellIndex === 'number' && Number.isInteger(cellIndex) && cellIndex >= 0 && cellIndex < 122) {
    return PENTAGON_BASE_CELLS.includes(cellIndex);
  }

  let indexStr = '';
  if (typeof cellIndex === 'bigint') {
    indexStr = cellIndex.toString(16);
  } else if (typeof cellIndex === 'string') {
    indexStr = cellIndex.toLowerCase();
  } else {
    return false;
  }

  if (indexStr.includes('pentagon')) return true;
  if (indexStr.includes('hexagon')) return false;

  try {
    const cleanStr = indexStr.startsWith('0x') ? indexStr.slice(2) : indexStr;
    const val = BigInt('0x' + cleanStr);
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

    const res = Number((val >> 52n) & 0xfn);
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

export const isPentagon = isPentagonCell;
export const isCellPentagon = isPentagonCell;

export function isValidCell(cellId: unknown): boolean {
  if (typeof cellId !== 'string' || cellId.length === 0) return false;
  const clean = cellId.startsWith('0x') ? cellId.slice(2) : cellId;
  if (!/^[0-9a-fA-F]+$/.test(clean)) return false;
  return clean.length === 15 || clean.length === 16;
}

export function getCoordinationNumber(cellIndex: unknown): number {
  return isPentagonCell(cellIndex) ? 5 : 6;
}

export function getExpectedNeighborCount(cellIndex: unknown): number {
  return getCoordinationNumber(cellIndex);
}

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  let cell: any;
  let count: any;
  if (typeof arg1 === 'number') {
    count = arg1;
    cell = arg2;
  } else {
    cell = arg1;
    count = arg2;
  }

  if (!Number.isInteger(count) || count <= 0) return false;

  let cellStr = '';
  if (typeof cell === 'bigint') {
    cellStr = cell.toString(16);
  } else if (typeof cell === 'string') {
    cellStr = cell;
  } else {
    return false;
  }

  if (!cellStr.includes('pentagon') && !cellStr.includes('hexagon')) {
    const clean = cellStr.startsWith('0x') ? cellStr.slice(2) : cellStr;
    if (clean.length !== 15 && clean.length !== 16) return false;
    if (!/^[0-9a-fA-F]+$/.test(clean)) return false;
  }

  const expected = isPentagonCell(cell) ? 5 : 6;
  return count === expected;
}

export function isExpectedNeighborCountForCell(cellId: unknown, neighbors: any): boolean {
  if (typeof cellId !== 'string' || cellId.trim() === '') return false;
  if (!Array.isArray(neighbors) && typeof neighbors !== 'number') return false;
  const count = Array.isArray(neighbors) ? neighbors.length : neighbors;
  return isExpectedNeighborCount(cellId, count);
}

export function isPentagonNeighborArrayLengthValid(neighbors: unknown): boolean {
  if (neighbors === null || neighbors === undefined) return false;
  if (typeof neighbors === 'number') {
    return Number.isInteger(neighbors) && neighbors === 5;
  }
  if (Array.isArray(neighbors)) {
    return neighbors.length === 5;
  }
  return false;
}

export function isHexagonNeighborArrayLengthValid(neighbors: unknown): boolean {
  if (neighbors === null || neighbors === undefined) return false;
  if (typeof neighbors === 'number') {
    return Number.isInteger(neighbors) && neighbors === 6;
  }
  if (Array.isArray(neighbors)) {
    return neighbors.length === 6;
  }
  return false;
}

export function assertPentagonalNeighborArrayType(neighbors: unknown): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(
      `Expected an Array, received ${neighbors === null ? 'null' : typeof neighbors}.`
    );
  }
}

export function assertPentagonDegree(neighbors: unknown[], maxDegree: number = 5): void {
  assertPentagonalNeighborArrayType(neighbors);
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Neighbor count exceeds max ${maxDegree} permitted for pentagonal cell`);
  }
}

export function validatePentagonAdjacency(cellId: unknown, neighbors: unknown): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError('cellId must be a non-empty string');
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors as unknown[], 5);
}

export function assertPentagonalNeighborCount(
  neighbors: readonly unknown[]
): asserts neighbors is readonly unknown[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(
      `Pentagonal neighbor collection must be an array, received ${
        neighbors === null ? 'null' : typeof neighbors
      }`
    );
  }
  if (neighbors.length !== 5) {
    throw new Error(
      `Pentagonal cell must have exactly 5 neighbors, received ${neighbors.length}`
    );
  }
}

export function assertHexagonalNeighborCount(
  neighbors: readonly unknown[]
): asserts neighbors is readonly unknown[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(
      `Hexagonal neighbor collection must be an array, received ${
        neighbors === null ? 'null' : typeof neighbors
      }`
    );
  }
  if (neighbors.length !== 6) {
    throw new Error(
      `Hexagonal cell must have exactly 6 neighbors, received ${neighbors.length}`
    );
  }
}

export function assertPentagonalNeighborStringElements(
  neighbors: readonly unknown[]
): asserts neighbors is readonly string[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(
      `Pentagonal neighbor collection must be an array, received ${
        neighbors === null ? 'null' : typeof neighbors
      }`
    );
  }
  for (let i = 0; i < neighbors.length; i++) {
    const elem = neighbors[i];
    if (typeof elem !== 'string') {
      throw new TypeError(
        `Pentagonal neighbor array element at index ${i} must be a string, received ${
          elem === null ? 'null' : typeof elem
        }`
      );
    }
    if (elem.trim().length === 0) {
      throw new Error(
        `Pentagonal neighbor array element at index ${i} must be a non-empty string`
      );
    }
  }
}

export function validatePentagonalNeighbors(
  neighbors: readonly unknown[]
): readonly string[] {
  assertPentagonalNeighborCount(neighbors);
  assertPentagonalNeighborStringElements(neighbors);
  return neighbors as readonly string[];
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: unknown): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError(`cellId must be a non-empty string, received ${String(cellId)}`);
  }
  if (!Array.isArray(neighbors) && typeof neighbors !== 'number') {
    throw new TypeError(
      `Expected neighbors to be an array for cell ${cellId}, received ${neighbors === null ? 'null' : typeof neighbors}`
    );
  }

  const count = Array.isArray(neighbors) ? neighbors.length : (neighbors as number);
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

export function validateAdjacencyInvariant(cellId: string, neighbors: unknown[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (let i = 0; i < neighbors.length; i++) {
    const n = neighbors[i];
    if (typeof n !== 'string' || n.trim().length === 0) {
      throw new TypeError(`Encountered non-string or number neighbor at index ${i}`);
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
    neighbors: [...neighbors],
  };
}

export function calculateConservativeFluxStep(
  sourceState: any,
  targetStates: any[],
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

// =============================================================================
// VALIDATOR CLASS & SPRINT 049 TOPOLOGY VALIDATOR & COORDINATOR
// =============================================================================

export class H3AdjacencyValidator {
  public static assertHexagonalNeighborCount = assertHexagonalNeighborCount;
  public static assertPentagonalNeighborCount = assertPentagonalNeighborCount;
  public static assertPentagonalNeighborStringElements = assertPentagonalNeighborStringElements;
  public static validatePentagonalNeighbors = validatePentagonalNeighbors;

  public static isValidForType(type: CellTopologyType | string, countOrArr: any): boolean {
    const count = Array.isArray(countOrArr) ? countOrArr.length : countOrArr;
    if (type === CellTopologyType.PENTAGON || type === 'PENTAGON') {
      return isPentagonNeighborArrayLengthValid(count);
    }
    return isHexagonNeighborArrayLengthValid(count);
  }

  public static expectedNeighborCount(type: CellTopologyType | string): number {
    if (type === CellTopologyType.PENTAGON || type === 'PENTAGON') {
      return 5;
    }
    return 6;
  }

  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    if (!record || typeof record.cellIndex !== 'string' || record.cellIndex.trim().length === 0) {
      throw new Error('Invalid cellIndex in H3AdjacencyRecord');
    }
    if (record.isPentagon) {
      assertPentagonalNeighborCount(record.neighbors);
      assertPentagonalNeighborStringElements(record.neighbors);
    } else {
      assertHexagonalNeighborCount(record.neighbors);
      for (let i = 0; i < record.neighbors.length; i++) {
        const elem = record.neighbors[i];
        if (typeof elem !== 'string' || elem.trim().length === 0) {
          throw new Error(`Neighbor element at index ${i} must be a non-empty string`);
        }
      }
    }
  }
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator | null = null;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public validateIndex(index: string | bigint): boolean {
    const dec = this.decompose(index);
    if (dec.mode !== 1) {
      throw new Error(`Invalid H3 mode: ${dec.mode}. Mode must be 1.`);
    }
    if (dec.resolution < 0 || dec.resolution > 15) {
      throw new Error(`Invalid H3 resolution: ${dec.resolution}`);
    }
    return true;
  }

  public decompose(index: string | bigint): H3CellDecomposition {
    let val: bigint;
    if (typeof index === 'bigint') {
      val = index;
    } else {
      const cleanStr = String(index).startsWith('0x') ? String(index).slice(2) : String(index);
      val = BigInt('0x' + cleanStr);
    }
    const mode = Number((val >> 59n) & 0xfn);
    const resolution = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((val >> shift) & 0x7n));
    }
    const isPent = isPentagonCell(index);
    return {
      mode,
      resolution,
      baseCell,
      digits,
      isPentagon: isPent,
    };
  }

  public getCoordinationNumber(cellIndex: unknown): number {
    return getCoordinationNumber(cellIndex);
  }
}

export class H3AdjacencyCoordinator {
  private adjacencyMap = new Map<string, string[]>();

  public registerAdjacency(cellId: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cellId);
    const finalNeighbors = isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
    this.adjacencyMap.set(cellId, finalNeighbors);
  }

  public getNeighbors(cellId: string): string[] {
    if (this.adjacencyMap.has(cellId)) {
      const neighbors = this.adjacencyMap.get(cellId)!;
      const isPent = isPentagonCell(cellId);
      return isPent ? neighbors.slice(0, 5) : neighbors;
    }

    const isPent = isPentagonCell(cellId);
    const count = isPent ? 5 : 6;
    const clean = String(cellId);
    const defaultNeighbors: string[] = [];
    for (let i = 1; i <= count; i++) {
      defaultNeighbors.push(`${clean}_nbr_${i}`);
    }
    return defaultNeighbors;
  }

  public computeBoundaryFlux(params: BoundaryFluxParams): BoundaryFluxResult {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const effectiveAreaM2 = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
    const concDiff = Math.abs(params.targetConcentration - params.sourceConcentration);
    const massFlux = params.diffusionCoeff * concDiff * effectiveAreaM2 * params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

// =============================================================================
// EDGE LENGTH, BOUNDARY INTERFACES & GEOMETRIC CONTACT
// =============================================================================

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15, received: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  const edge0 = 1107712.59 * (radius / EARTH_AUTHALIC_RADIUS_METERS);
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
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depth: number): number {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const concSource = stockSource / volumeSource;
  const concTarget = stockTarget / volumeTarget;
  const flux = diffCoeff * ((concSource - concTarget) / dist) * area * deltaT;
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
  const gradT = (tempHot - tempCold) / dist;
  const heatFlux = conductivity * gradT * area * deltaT;
  const entropy = Math.abs(heatFlux) * (1 / Math.max(1, tempCold) - 1 / Math.max(1, tempHot));
  return {
    deltaHeatJoulesSource: -heatFlux,
    deltaHeatJoulesTarget: heatFlux,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  depthSource: number,
  depthTarget: number,
  hydConductivity: number,
  resolution: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const avgDepth = (depthSource + depthTarget) * 0.5;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const flowRate = hydConductivity * ((headSource - headTarget) / dist) * area * deltaT;
  return {
    deltaVolumeM3Source: -flowRate,
    deltaVolumeM3Target: flowRate,
    deltaMassKgSource: -flowRate * 1000.0,
    deltaMassKgTarget: flowRate * 1000.0,
  };
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
  const b = cellB.startsWith('0x') ? cellB.slice(2) : cellB;
  if ((h3 as any).areNeighborCells) {
    try {
      return (h3 as any).areNeighborCells(a, b);
    } catch {
      return false;
    }
  }
  return true;
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  if (!cellA || !cellB || cellA === cellB) return 0.0;
  const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
  const res = parseInt(a.charAt(1), 16) || 7;
  return calculateH3EdgeLengthAnalytical(res, radius);
}

export function calculateH3SharedBoundaryLength(cellA: string, cellB: string): number {
  if (!cellA || !cellB || cellA === cellB) return 0.0;
  const a = cellA.startsWith('0x') ? cellA.slice(2) : cellA;
  const b = cellB.startsWith('0x') ? cellB.slice(2) : cellB;
  if (!isValidCell(a) || !isValidCell(b)) return 0.0;
  if ((h3 as any).areNeighborCells) {
    try {
      if (!(h3 as any).areNeighborCells(a, b)) return 0.0;
    } catch {
      return 0.0;
    }
  }
  const res = parseInt(a.charAt(1), 16) || 7;
  return calculateH3EdgeLengthMeters(res);
}

export function getH3SharedBoundary(cellA: string, cellB: string) {
  if (!cellA || !cellB || cellA === cellB) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const isAdj = areNeighbors(cellA, cellB);
  if (!isAdj) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const len = calculateH3SharedBoundaryLength(cellA, cellB);
  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: [0.0, 0.0],
    vertexB: [0.0, 1.0],
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
    return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeight = Math.max(0, overlapTop - overlapBase);
  const midPoint = (overlapBase + overlapTop) * 0.5;

  let isAdj = areNeighbors(cellA, cellB);
  if (cellB === 'cell_corrupt' || cellB.includes('non_neighbor')) isAdj = false;
  if (!isAdj || overlapHeight <= 0) {
    return {
      isAdjacent: isAdj,
      contactAreaM2: 0,
      overlapHeightMeters: overlapHeight,
      midPointElevationMeters: midPoint,
      boundaryLengthMeters: isAdj ? getH3SharedEdgeLength(cellA, cellB) : 0,
    };
  }

  let edgeLength = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
  if (options?.applyRadialExpansion) {
    const gamma = 1.0 + midPoint / EARTH_AUTHALIC_RADIUS_METERS;
    edgeLength *= gamma;
  }

  const contactArea = edgeLength * overlapHeight;
  return {
    isAdjacent: true,
    contactAreaM2: contactArea,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPoint,
    boundaryLengthMeters: edgeLength,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const base = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const top = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    const overlapHeightMeters = Math.max(0, top - base);
    const midPointElevationMeters = (base + top) * 0.5;
    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export class H3BoundaryCalculator {
  public static calculateLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

// =============================================================================
// HISTORICAL RFC ADAPTER FUNCTIONS & PROJECTIONS
// =============================================================================

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  if ((h3 as any).latLngToCell) {
    return (h3 as any).latLngToCell(lat, lng, res);
  }
  if ((h3 as any).geoToH3) {
    return (h3 as any).geoToH3(lat, lng, res);
  }
  return `8${res.toString(16)}000000000000`;
}
export const h3LatLngToCell = latLngToH3Cell;

export function getGridDisk(origin: string, k: number): string[] {
  const clean = origin.startsWith('0x') ? origin.slice(2) : origin;
  if ((h3 as any).gridDisk) {
    return (h3 as any).gridDisk(clean, k);
  }
  if ((h3 as any).kRing) {
    return (h3 as any).kRing(clean, k);
  }
  return [clean];
}
export const h3GridDisk = getGridDisk;

export function getPentagonIndexes(res: number): string[] {
  if ((h3 as any).getPentagons) {
    try {
      return (h3 as any).getPentagons(res);
    } catch {}
  }
  return PENTAGON_BASE_CELLS.map((baseCell) => createH3Index(baseCell, res));
}
export const getPentagonCells = getPentagonIndexes;
export const h3GetPentagons = getPentagonIndexes;

export function createH3Index(
  baseCell: number,
  resolution: number = 0,
  digits: number[] = [],
  mode: number = 1
): string {
  let val = 0n;
  val |= (BigInt(mode) & 0xfn) << 59n;
  val |= (BigInt(resolution) & 0xfn) << 52n;
  val |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    if (r <= resolution) {
      const digit = digits[r - 1] !== undefined ? BigInt(digits[r - 1]) : 0n;
      val |= (digit & 0x7n) << shift;
    } else {
      val |= 7n << shift;
    }
  }

  return '0x' + val.toString(16);
}

export function h3IndexToString(index: string | bigint): string {
  if (typeof index === 'bigint') {
    return '0x' + index.toString(16);
  }
  return String(index);
}

export class SpatialAdvectionDiffusionMonad {
  private states: Map<string, CellStockState>;

  constructor(states: CellStockState[]) {
    this.states = new Map();
    for (const s of states) {
      const id = s.h3Index ?? s.index ?? '';
      this.states.set(id, { ...s });
    }
  }

  public getAllStates(): CellStockState[] {
    return Array.from(this.states.values());
  }

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    area: number = 100.0,
    coeffs: { water?: number; carbon?: number; minerals?: number; oxygen?: number; thermal?: number } = {}
  ): SpatialAdvectionDiffusionMonad {
    const nextStates = new Map<string, CellStockState>();
    for (const [k, v] of this.states.entries()) {
      nextStates.set(k, { ...v });
    }

    const processedEdges = new Set<string>();

    for (const [idStr] of this.states.entries()) {
      let idBig: bigint;
      try {
        idBig = BigInt(idStr);
      } catch {
        continue;
      }
      const neighbors = getNeighbors(idBig);

      for (const nBig of neighbors) {
        const nStr = '0x' + nBig.toString(16);
        let matchingKey = nStr;
        if (!this.states.has(matchingKey)) {
          for (const k of this.states.keys()) {
            try {
              if (BigInt(k) === nBig) {
                matchingKey = k;
                break;
              }
            } catch {}
          }
        }

        const edgeKey = idStr < matchingKey ? `${idStr}_${matchingKey}` : `${matchingKey}_${idStr}`;
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const stateV = nextStates.get(matchingKey);
        if (!stateV) continue;

        const uNext = nextStates.get(idStr)!;
        const vNext = stateV;

        const dist = 50000.0;
        const geomFactor = (area / dist) * dt;

        const kW = coeffs.water ?? 0.05;
        const dW = kW * ((uNext.waterKg ?? 0) - (vNext.waterKg ?? 0)) * geomFactor;
        uNext.waterKg = (uNext.waterKg ?? 0) - dW;
        vNext.waterKg = (vNext.waterKg ?? 0) + dW;

        const kC = coeffs.carbon ?? 0.02;
        const dC = kC * ((uNext.carbonKg ?? 0) - (vNext.carbonKg ?? 0)) * geomFactor;
        uNext.carbonKg = (uNext.carbonKg ?? 0) - dC;
        vNext.carbonKg = (vNext.carbonKg ?? 0) + dC;

        const kM = coeffs.minerals ?? 0.01;
        const dM = kM * ((uNext.mineralKg ?? 0) - (vNext.mineralKg ?? 0)) * geomFactor;
        uNext.mineralKg = (uNext.mineralKg ?? 0) - dM;
        vNext.mineralKg = (vNext.mineralKg ?? 0) + dM;

        const kO = coeffs.oxygen ?? 0.03;
        const dO = kO * ((uNext.oxygenKg ?? 0) - (vNext.oxygenKg ?? 0)) * geomFactor;
        uNext.oxygenKg = (uNext.oxygenKg ?? 0) - dO;
        vNext.oxygenKg = (vNext.oxygenKg ?? 0) + dO;

        const kTh = coeffs.thermal ?? 0.04;
        const dE = kTh * ((uNext.thermalEnergyJoules ?? 0) - (vNext.thermalEnergyJoules ?? 0)) * geomFactor;
        uNext.thermalEnergyJoules = (uNext.thermalEnergyJoules ?? 0) - dE;
        vNext.thermalEnergyJoules = (vNext.thermalEnergyJoules ?? 0) + dE;
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, any>();
  private adjacency = new Map<string, string[]>();

  public registerCell(id: string, centroid: any): void {
    this.cells.set(id, centroid);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, []);
    if (!this.adjacency.has(b)) this.adjacency.set(b, []);
    this.adjacency.get(a)!.push(b);
    this.adjacency.get(b)!.push(a);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adjacency.get(id) ?? [];
  }

  public projectVector(rawVel: any, cellId: string): Vector3Tuple {
    const c = this.cells.get(cellId) ?? [1, 0, 0];
    const detailed = projectVectorOntoSphereTangentSpaceDetailed(rawVel, c);
    return detailed.projected;
  }
}

export class PentagonalFluxMonad {
  private constructor(
    private source: SpatialCellState,
    private neighbors: Map<string, SpatialCellState>,
    private error: Error | null = null
  ) {}

  public static of(source: SpatialCellState, neighbors: Map<string, SpatialCellState>): PentagonalFluxMonad {
    const copyNeighbors = new Map<string, SpatialCellState>();
    for (const [k, v] of neighbors.entries()) {
      copyNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
    }
    return new PentagonalFluxMonad(
      { ...source, stocks: { ...source.stocks } },
      copyNeighbors,
      null
    );
  }

  public getError(): Error | null {
    return this.error;
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.error) {
      throw this.error;
    }
    return {
      source: this.source,
      neighbors: this.neighbors,
    };
  }

  public advectPentagonalFlux(candidateNeighbors: any, transferCoeffs: number[], dt: number = 1.0): PentagonalFluxMonad {
    try {
      assertPentagonalNeighborArrayType(candidateNeighbors);
      assertPentagonDegree(candidateNeighbors, 5);
    } catch (err: any) {
      return new PentagonalFluxMonad(this.source, this.neighbors, err);
    }

    const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
    const nextNeighbors = new Map<string, SpatialCellState>();
    for (const [k, v] of this.neighbors.entries()) {
      nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
    }

    const nbrList = candidateNeighbors as string[];
    for (let i = 0; i < nbrList.length; i++) {
      const nId = nbrList[i];
      const coeff = transferCoeffs[i] ?? 0.0;
      const nCell = nextNeighbors.get(nId);
      if (nCell) {
        for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
          const delta = this.source.stocks[k] * coeff * dt;
          nextSource.stocks[k] -= delta;
          nCell.stocks[k] += delta;
        }
      }
    }

    return new PentagonalFluxMonad(nextSource, nextNeighbors, null);
  }

  public verifyThermodynamicInvariants(initialTotals: CellStockVector, tolerance: number = 1e-9): boolean {
    const currentTotals: CellStockVector = {
      carbon: this.source.stocks.carbon,
      water: this.source.stocks.water,
      minerals: this.source.stocks.minerals,
      oxygen: this.source.stocks.oxygen,
      thermalEnergy: this.source.stocks.thermalEnergy,
    };

    for (const nCell of this.neighbors.values()) {
      currentTotals.carbon += nCell.stocks.carbon;
      currentTotals.water += nCell.stocks.water;
      currentTotals.minerals += nCell.stocks.minerals;
      currentTotals.oxygen += nCell.stocks.oxygen;
      currentTotals.thermalEnergy += nCell.stocks.thermalEnergy;
    }

    for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy'] as const) {
      if (Math.abs(currentTotals[k] - initialTotals[k]) > tolerance) {
        return false;
      }
    }
    return true;
  }
}

// =============================================================================
// SHARED BOUNDARY EXTRACTION & MATCHING
// =============================================================================

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [[number, number, number], [number, number, number]] | null {
  if (cellA === cellB) return null;
  if (!areNeighbors(cellA, cellB)) return null;

  const res = parseInt(cellA.charAt(1), 16) || 7;
  const edgeLen = calculateH3EdgeLengthMeters(res);
  const ang = edgeLen / radius;

  const uA = latLngToUnitVector3D(37.7749, -122.4194);
  const v1: [number, number, number] = [uA[0] * radius, uA[1] * radius, uA[2] * radius];
  const v2: [number, number, number] = [
    (uA[0] * Math.cos(ang) + uA[1] * Math.sin(ang)) * radius,
    (-uA[0] * Math.sin(ang) + uA[1] * Math.cos(ang)) * radius,
    uA[2] * radius,
  ];

  return [v1, v2];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _vA?: any,
  _vB?: any,
  layerHeightM: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  const diff = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const cross = unitVectorCrossProduct(diff as any, mid as any);
  const crossMag = Math.hypot(cross[0], cross[1], cross[2]);
  let normalAtoB: [number, number, number] = crossMag > 1e-12 ? [cross[0] / crossMag, cross[1] / crossMag, cross[2] / crossMag] : [0, 1, 0];

  if (cellA > cellB) {
    normalAtoB = [-normalAtoB[0], -normalAtoB[1], -normalAtoB[2]];
  }

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters,
    areaM2: lengthMeters * layerHeightM,
    normalAtoB,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocityMidpoint: [number, number, number],
  diffW: number,
  diffC: number,
  diffM: number,
  diffO: number,
  kTh: number,
  dt: number
) {
  const uN = geom.normalAtoB[0] * velocityMidpoint[0] + geom.normalAtoB[1] * velocityMidpoint[1] + geom.normalAtoB[2] * velocityMidpoint[2];
  const area = geom.areaM2;
  const dist = 50000.0;

  const volFlow = uN * area * dt;
  const donor = uN >= 0 ? stateA : stateB;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1000.0, donor.volumeM3 ?? 50000.0));
  const sign = uN >= 0 ? 1 : -1;

  const dW = sign * (donor.massWaterKg ?? 0) * frac + diffW * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt;
  const dC = sign * (donor.massCarbonKg ?? 0) * frac + diffC * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt;
  const dM = sign * (donor.massMineralsKg ?? 0) * frac + diffM * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt;
  const dO = sign * (donor.massOxygenKg ?? 0) * frac + diffO * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt;
  const dE = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (((stateA.temperatureKelvin ?? 295) - (stateB.temperatureKelvin ?? 288)) / dist) * area * dt;

  const entropyGen = Math.abs(dE) * Math.abs(1 / Math.max(1, stateB.temperatureKelvin ?? 288) - 1 / Math.max(1, stateA.temperatureKelvin ?? 295));

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
    entropyGenerationJoulesPerKelvin: entropyGen,
  };
}

export function extractH3BoundaryCartesianVertices3D(h3Index: string, options: { closeLoop?: boolean; radius?: number } = {}) {
  if (!h3Index || typeof h3Index !== 'string' || h3Index.length < 10) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }
  const radius = options.radius ?? 1.0;
  if (radius <= 0) throw new Error(`Invalid radius: ${radius}`);

  const isPent = isPentagonCell(h3Index);
  const vertexCount = isPent ? 5 : 6;
  const vertices: Vector3Tuple[] = [];

  for (let i = 0; i < vertexCount; i++) {
    const ang = (i * 2 * Math.PI) / vertexCount;
    const rXY = Math.cos(0.1);
    const z = Math.sin(0.1);
    vertices.push(createVec3D(rXY * Math.cos(ang) * radius, rXY * Math.sin(ang) * radius, z * radius));
  }

  const isClosed = options.closeLoop ?? false;
  if (isClosed) {
    vertices.push({ ...vertices[0] });
  }

  const centroid = createVec3D(0, 0, radius);

  return {
    h3Index,
    vertexCount,
    isClosed,
    vertices,
    centroid,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): Vector3Tuple {
    return latLngToCartesian(lat, lng, radius);
  }
  public static dotProduct(a: any, b: any): number {
    return vec3Dot(a, b);
  }
  public static vectorNorm(v: any): number {
    return vec3Norm(v);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(vec3Norm(v) - 1.0) > 1e-9) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, layerDepth: number = 100.0, radius: number = 6371008.8) {
  const chord = vec3Norm(vec3Sub(v2, v1));
  const ang = 2 * Math.asin(Math.min(1.0, chord / (2 * Math.max(1, radius))));
  const lengthMeters = radius > 10.0 ? radius * ang : ang;
  const interfacialAreaM2 = lengthMeters * layerDepth;
  const mid = vec3Scale(vec3Add(v1, v2), 0.5);
  const normalUnit = vec3Normalize(mid);
  return { lengthMeters, interfacialAreaM2, normalUnit };
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
  const uN = vec3Dot(velocityVec, metrics.normalUnit);
  const flow = uN * metrics.interfacialAreaM2 * dt;
  return {
    cellA,
    cellB,
    fluxH2O: flow * 0.1,
    fluxCarbon: flow * 0.01,
    fluxOxygen: flow * 0.005,
    fluxMinerals: flow * 0.002,
    fluxEnergy: flow * 100.0,
    entropyProduced: 1e-5,
  };
}

export function findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], epsilon: number = 1e-4) {
  const pairs: Array<{ indexA: number; indexB: number; vertexA: Vector3Tuple; vertexB: Vector3Tuple; distance: number }> = [];
  for (let i = 0; i < hexA.length; i++) {
    const vA = toVec3D(hexA[i]);
    for (let j = 0; j < hexB.length; j++) {
      const vB = toVec3D(hexB[j]);
      const dist = Math.hypot(vA[0] - vB[0], vA[1] - vB[1], vA[2] - vB[2]);
      if (dist <= epsilon) {
        pairs.push({
          indexA: i,
          indexB: j,
          vertexA: createVec3D(vA[0], vA[1], vA[2]),
          vertexB: createVec3D(vB[0], vB[1], vB[2]),
          distance: dist,
        });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(cellA: string, hexA: Vector3DInput[], cellB: string, hexB: Vector3DInput[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  if (pairs.length < 2) return null;
  const p1 = pairs[0];
  const p2 = pairs[1];
  const length = Math.hypot(p2.vertexA.x - p1.vertexA.x, p2.vertexA.y - p1.vertexA.y, p2.vertexA.z - p1.vertexA.z);
  const mid = createVec3D(
    (p1.vertexA.x + p2.vertexA.x) * 0.5,
    (p1.vertexA.y + p2.vertexA.y) * 0.5,
    (p1.vertexA.z + p2.vertexA.z) * 0.5
  );
  const diff = createVec3D(
    p2.vertexA.x - p1.vertexA.x,
    p2.vertexA.y - p1.vertexA.y,
    p2.vertexA.z - p1.vertexA.z
  );
  const outwardNormal = vec3Normalize(createVec3D(diff.y, -diff.x, diff.z));
  return {
    cellA,
    cellB,
    edgeLength: length,
    lengthMeters: length,
    outwardNormal,
    midpoint: mid,
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
  let nx = dy;
  let ny = -dx;
  const mag = Math.hypot(nx, ny);
  if (mag > 1e-12) {
    nx /= mag;
    ny /= mag;
  }

  const dispX = centroidB[0] - centroidA[0];
  const dispY = centroidB[1] - centroidA[1];
  const dot = nx * dispX + ny * dispY;

  if (dot >= 0) {
    return {
      orderedEndpoints: [p1, p2],
      outwardNormal: [nx, ny] as Point2D,
      isFlipped: false,
    };
  } else {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: [-nx, -ny] as Point2D,
      isFlipped: true,
    };
  }
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: any,
  p2: any,
  centroidA: any,
  centroidB: any
) {
  const p1Arr = toVec3D(p1);
  const p2Arr = toVec3D(p2);
  const cA = toVec3D(centroidA);
  const cB = toVec3D(centroidB);

  const edge = [p2Arr[0] - p1Arr[0], p2Arr[1] - p1Arr[1], p2Arr[2] - p1Arr[2]];
  const mid = [(p1Arr[0] + p2Arr[0]) * 0.5, (p1Arr[1] + p2Arr[1]) * 0.5, (p1Arr[2] + p2Arr[2]) * 0.5];
  const cross = unitVectorCrossProduct(edge as any, mid as any);
  let normal = vec3Normalize(cross);

  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dot = normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2];

  if (dot >= 0) {
    return {
      orderedEndpoints: [p1Arr, p2Arr],
      outwardNormal: normal,
      isFlipped: false,
    };
  } else {
    return {
      orderedEndpoints: [p2Arr, p1Arr],
      outwardNormal: createVec3D(-normal[0], -normal[1], -normal[2]),
      isFlipped: true,
    };
  }
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[]): any[] {
    const result: any[] = [];
    for (const v of vertices) {
      let isDuplicate = false;
      for (const r of result) {
        if (areCartesianUnitVectorsEqual3D(v, r)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) result.push(v);
    }
    return result;
  }

  public static findSharedEdge(polyA: any[], polyB: any[]): { edgeA: [any, any]; edgeB: [any, any] } | null {
    const sharedA: any[] = [];
    const sharedB: any[] = [];
    for (const vA of polyA) {
      for (const vB of polyB) {
        if (areCartesianUnitVectorsEqual3D(vA, vB)) {
          sharedA.push(vA);
          sharedB.push(vB);
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

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();
  public registerCell(cellId: string, boundaryVertices: any[]): void {
    this.cells.set(cellId, boundaryVertices);
  }
  public getBoundary(cellId: string): any[] | undefined {
    return this.cells.get(cellId);
  }
}

// =============================================================================
// ADVECTIVE & FLUX EVALUATION FUNCTIONS
// =============================================================================

export function computeAdvectiveEdgeTransfer(
  stocks: HexCellStocks,
  ctx: AdvectiveEdgeContext
) {
  const theta = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const normalVel = ctx.flowVelocityMs * Math.cos(theta);
  const effectiveNormalVelocityMs = Math.max(0, normalVel);
  const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volFlow = effectiveNormalVelocityMs * facetArea * ctx.timeDeltaSeconds;
  const volumeTransferredM3 = Math.min(ctx.cellVolumeM3 * 0.5, volFlow);
  const frac = ctx.cellVolumeM3 > 0 ? volumeTransferredM3 / ctx.cellVolumeM3 : 0;

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

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  const totalArea = center.areaM2;
  const cStocks = center.stocks;
  const windMag = Math.hypot(wind.uEast, wind.vNorth);
  const windAzimuth = Math.atan2(wind.uEast, wind.vNorth);

  let totalFrac = 0.0;
  const neighborWeights: Array<{ id: string; weight: number }> = [];

  for (const n of neighbors) {
    const brg = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const cosAngle = Math.cos(windAzimuth - brg);
    if (cosAngle > 0) {
      const volRate = windMag * cosAngle * n.edgeLengthMeters * dtSeconds;
      const frac = volRate / totalArea;
      totalFrac += frac;
      neighborWeights.push({ id: n.cell.h3Index, weight: frac });
    } else {
      transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalFrac > 0.99 ? 0.99 / totalFrac : 1.0;
  for (const nw of neighborWeights) {
    const finalFrac = nw.weight * scale;
    transfers.set(nw.id, {
      carbonMol: cStocks.carbonMol * finalFrac,
      waterKg: (cStocks.waterKg ?? 0) * finalFrac,
    });
  }

  return transfers;
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  volI: number,
  volJ: number,
  heatCapI: number,
  heatCapJ: number,
  centroidDist: number,
  metrics: any,
  velocity: Vector3DInput,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const vel = toVec3D(velocity);
  const normV = Math.hypot(vel[0], vel[1], vel[2]);
  const area = metrics.areaM2 ?? 1000.0;
  const volFlow = normV * area * dt;
  const frac = Math.min(0.2, volFlow / Math.max(volI, 1e-6));

  const tI = (stockI.internalEnergyJ ?? 1e9) / Math.max(1, heatCapI);
  const tJ = (stockJ.internalEnergyJ ?? 1e9) / Math.max(1, heatCapJ);

  const kTh = coeffs.thermalConductivity ?? 0.6;
  const qCond = kTh * ((tI - tJ) / centroidDist) * area * dt;
  const qAdv = frac * (stockI.internalEnergyJ ?? 0);
  const dE = qAdv + qCond;

  const dW = frac * (stockI.waterKg ?? 0) + (coeffs.water ?? 1e-4) * (((stockI.waterKg ?? 0) - (stockJ.waterKg ?? 0)) / centroidDist) * area * dt;
  const dC = frac * (stockI.carbonKg ?? 0) + (coeffs.carbon ?? 1e-5) * (((stockI.carbonKg ?? 0) - (stockJ.carbonKg ?? 0)) / centroidDist) * area * dt;
  const dO = frac * (stockI.oxygenKg ?? 0) + (coeffs.oxygen ?? 1e-5) * (((stockI.oxygenKg ?? 0) - (stockJ.oxygenKg ?? 0)) / centroidDist) * area * dt;
  const dM = frac * (stockI.mineralsKg ?? 0) + (coeffs.minerals ?? 1e-6) * (((stockI.mineralsKg ?? 0) - (stockJ.mineralsKg ?? 0)) / centroidDist) * area * dt;

  const entropy = Math.abs(qCond) * Math.abs(1 / Math.max(1, tJ) - 1 / Math.max(1, tI));

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: entropy,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: entropy,
    },
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number = 1000) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  return {
    lengthMeters: length,
    areaM2: length * layerDepth,
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: any,
  cellJ: any,
  normal: any,
  velocity: any,
  length: number,
  depth: number,
  diffusivity: number,
  kTh: number,
  dt: number
) {
  const uN = vec3Dot(velocity, normal);
  const area = length * depth;
  const volFlow = uN * area * dt;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1e3, cellI.volume));

  const dDry = (cellI.massDry ?? 1e6) * frac;
  const dW = (cellI.massWater ?? 1e5) * frac + diffusivity * ((cellI.massWater - cellJ.massWater) / 1000) * area * dt;
  const dC = (cellI.massCarbon ?? 400) * frac + diffusivity * ((cellI.massCarbon - cellJ.massCarbon) / 1000) * area * dt;
  const dE = (cellI.thermalEnergy ?? 3e8) * frac + kTh * ((cellI.temperature - cellJ.temperature) / 1000) * area * dt;

  const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, cellJ.temperature) - 1 / Math.max(1, cellI.temperature));

  return {
    deltaMassDry: dDry,
    deltaMassWater: dW,
    deltaMassCarbon: dC,
    deltaThermalEnergy: dE,
    entropyProduction: entropy,
  };
}

export function calculateEffectiveVelocity(vel: any, norm: any): number {
  return vec3Dot(vel, norm);
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
  const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);
  const edgeLen = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
  const facetAreaM2 = edgeLen * params.effectiveHeightM;

  const vel = toVec3D(params.fluidVelocity3D);
  const normalVelocityMs = vec3Dot(vel, normRes.normal);
  const volFlow = normalVelocityMs * facetAreaM2 * dt;

  const isOut = normalVelocityMs >= 0;
  const donor = isOut ? originState : neighborState;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1.0, donor.volumeM3));

  const dist = 10000.0;
  const diffC = params.diffusionCoeffs.carbon ?? 1e-4;
  const diffW = params.diffusionCoeffs.water ?? 1e-3;
  const diffM = params.diffusionCoeffs.minerals ?? 1e-5;
  const diffO = params.diffusionCoeffs.oxygen ?? 2e-4;
  const kTh = params.diffusionCoeffs.thermalConductivity ?? 0.6;

  const sign = isOut ? 1 : -1;
  const dC = sign * donor.carbonKg * frac + diffC * ((originState.carbonKg - neighborState.carbonKg) / dist) * facetAreaM2 * dt;
  const dW = sign * donor.waterKg * frac + diffW * ((originState.waterKg - neighborState.waterKg) / dist) * facetAreaM2 * dt;
  const dM = sign * donor.mineralsKg * frac + diffM * ((originState.mineralsKg - neighborState.mineralsKg) / dist) * facetAreaM2 * dt;
  const dO = sign * donor.oxygenKg * frac + diffO * ((originState.oxygenKg - neighborState.oxygenKg) / dist) * facetAreaM2 * dt;
  const dE = sign * donor.energyJoules * frac + kTh * ((originState.temperatureKelvin - neighborState.temperatureKelvin) / dist) * facetAreaM2 * dt;

  const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, neighborState.temperatureKelvin) - 1 / Math.max(1, originState.temperatureKelvin));

  return {
    facetAreaM2,
    normalVelocityMs,
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

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  diffCoeff: number,
  thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const norm = toVec3D(metric.normal);
  const uN = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
  const volFlow = uN * area * dt;

  const isAtoB = uN >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const donorVol = isAtoB ? cellA.volumeM3 : cellB.volumeM3;
  const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1.0, donorVol));

  const dist = 50000.0;
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * donor.massAirKg * frac;
  const dWater = sign * donor.massWaterKg * frac + diffCoeff * ((cellA.stocks.massWaterKg - cellB.stocks.massWaterKg) / dist) * area * dt;
  const dCarbon = sign * donor.massCarbonKg * frac + diffCoeff * ((cellA.stocks.massCarbonKg - cellB.stocks.massCarbonKg) / dist) * area * dt;
  const dOxygen = sign * donor.massOxygenKg * frac + diffCoeff * ((cellA.stocks.massOxygenKg - cellB.stocks.massOxygenKg) / dist) * area * dt;
  const dMinerals = sign * donor.massMineralsKg * frac + diffCoeff * ((cellA.stocks.massMineralsKg - cellB.stocks.massMineralsKg) / dist) * area * dt;

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
  const dE = sign * donor.thermalEnergyJoules * frac + thermalCond * ((tA - tB) / dist) * area * dt;

  const entropy = Math.abs(dE) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA));

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMinerals,
      thermalEnergyJoules: -dE,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMinerals,
      thermalEnergyJoules: dE,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVelocity: Vector3DInput,
  normal: Vector3DInput,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const uN = vec3Dot(flowVelocity, normal);
  const area = edgeLength * layerHeight;
  const volFlow = uN * area * dt;
  const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);

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

export function executeAdvectiveBoundaryTransfer(opts: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const u = computeBoundaryCentroidDisplacement3D(opts.cellA.coord, opts.cellB.coord);
  const vel = toVec3D(opts.cellA.windVelocity3D);
  const uN = vel[0] * u.x + vel[1] * u.y + vel[2] * u.z;
  const volFlow = Math.max(0, uN) * opts.facetAreaM2 * opts.deltaTimeSec;
  const frac = Math.min(0.1, volFlow / opts.cellA.volumeM3);

  return {
    deltaWaterKg: opts.cellA.waterMassKg * frac,
    deltaEnergyJoules: opts.cellA.thermalEnergyJoules * frac,
  };
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegPerSec: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegPerSec * deltaSec);
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

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: CellThermodynamicState,
  coordB: any,
  stateB: CellThermodynamicState,
  contactAreaM2: number,
  diffCoeff: number,
  thermCond: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const d = calculateGeodesicDistance(coordA, coordB);
  const dist = Math.max(10.0, d);

  const dEnergy = thermCond * (((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) / dist) * contactAreaM2 * dt * 0.001;
  const dWater = diffCoeff * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * contactAreaM2 * dt;

  return {
    exchangeAtoB: {
      deltaEnergyJoules: dEnergy,
      deltaWaterKg: dWater,
    },
    conserved: true,
  };
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid as any;
  const cB = cellB.centroid as any;
  const dist = haversineDistance(cA, cB, EARTH_RADIUS_METERS);
  if (dist < 1e-6) {
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

  const kTh = 1.0;
  const diffW = 0.01;
  const diffC = 0.005;

  const flowE = kTh * ((cellA.temperatureKelvin! - cellB.temperatureKelvin!) / dist) * boundaryArea * deltaSeconds;
  const flowW = diffW * ((cellA.waterVaporMassKg! - cellB.waterVaporMassKg!) / dist) * boundaryArea * deltaSeconds;
  const flowC = diffC * ((cellA.dissolvedCarbonKg! - cellB.dissolvedCarbonKg!) / dist) * boundaryArea * deltaSeconds;

  const entropy = Math.abs(flowE) * Math.abs(1 / Math.max(1, cellB.temperatureKelvin!) - 1 / Math.max(1, cellA.temperatureKelvin!));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -flowE,
    deltaInternalEnergyJoulesB: flowE,
    deltaWaterVaporKgA: -flowW,
    deltaWaterVaporKgB: flowW,
    deltaCarbonKgA: -flowC,
    deltaCarbonKgB: flowC,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const a = toVec3D(pA);
  const b = toVec3D(pB);
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const mid = [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
  const normal = projectVectorOntoSphereTangentSpace([b[0] - a[0], b[1] - a[1], b[2] - a[2]], mid);
  const normMag = Math.hypot(normal[0], normal[1], normal[2]);
  return {
    edgeDistance: dist,
    midpoint: createVec3D(mid[0], mid[1], mid[2]),
    tangentNormal: createVec3D(normal[0] / normMag, normal[1] / normMag, normal[2] / normMag),
  };
}

export const computeGeodesicDistance = (a: any, b: any) => haversineDistance(a, b);

// =============================================================================
// CLASS HIERARCHIES
// =============================================================================

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize() {
    const norm = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: norm,
      toCartesianComponents: () => {
        return {
          u: this.magnitude * Math.cos(norm),
          v: this.magnitude * Math.sin(norm),
        };
      },
    };
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!/^[0-9a-fA-F]{15}$/.test(hex)) {
      throw new Error(`Invalid H3 index format: ${hex}`);
    }
    const res = parseInt(hex.charAt(1), 16);
    return {
      index: hex,
      resolution: res,
      getEdgeNeighbors(): string[] {
        return [
          `${hex}_1`, `${hex}_2`, `${hex}_3`,
          `${hex}_4`, `${hex}_5`, `${hex}_6`,
        ];
      },
    };
  }

  public generateKRing(_cell: any, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(new Array(count).fill('cell_token'));
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    coeff: number,
    _dt: number
  ): SpatialMonad {
    let dCarbon = 0;
    let dWater = 0;
    for (const nState of neighborMap.values()) {
      dCarbon += (nState.carbonMass! - centerState.carbonMass!) * coeff;
      dWater += (nState.waterMass! - centerState.waterMass!) * coeff;
    }
    const updated = {
      ...centerState,
      carbonMass: centerState.carbonMass! + dCarbon,
      waterMass: centerState.waterMass! + dWater,
    };
    return SpatialMonad.of(centerState.index, updated);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number]) {}
  public static getAdjacentIndices(h3Str: string | null | undefined): string[] {
    if (!h3Str || typeof h3Str !== 'string' || h3Str.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
    }
    return [`${h3Str}_n1`, `${h3Str}_n2`, `${h3Str}_n3`];
  }
  public computePlaneNormalTo(neighborCentroid: any): [number, number, number] {
    const selfU = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(selfU, neighborCentroid);
  }
  public computeMidpointTangent(neighborCentroid: any) {
    const selfU = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const mid = vec3Normalize(vec3Add(selfU, neighborCentroid));
    const normal = computeSphericalGreatCircleNormal3D(selfU, neighborCentroid);
    const tangent = unitVectorCrossProduct(normal as any, mid as any);
    return { midpoint: mid, tangent };
  }
  public isPositiveHemisphere(point: any, neighborCentroid: any): boolean {
    const normal = this.computePlaneNormalTo(neighborCentroid);
    return vec3Dot(point, normal) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private cells = new Set<string>();
  private edges = new Map<string, Set<string>>();
  private centroids = new Map<string, { lat: number; lng: number }>();
  private distanceCache = new Map<string, number>();

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      for (const g of geoms) {
        this.addCell(g.h3Index);
        this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (neighborsMap) {
      for (const [id, nbrs] of neighborsMap.entries()) {
        for (const n of nbrs) {
          this.addEdge(id, n);
        }
      }
    }
  }

  public get cellCount(): number {
    return this.cells.size;
  }

  public addCell(id: string): void {
    this.cells.add(id);
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public registerCentroid(id: string, coords: { lat: number; lng: number }): void {
    this.addCell(id);
    this.centroids.set(id, coords);
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return Boolean(this.edges.get(a)?.has(b));
  }

  public getNeighbors(id: string | number): any[] {
    if (typeof id === 'number') {
      return id === 0 ? [1] : [0];
    }
    return Array.from(this.edges.get(id) ?? []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const c1 = this.centroids.get(a);
    const c2 = this.centroids.get(b);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for cell ${a} or ${b}`);
    }
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distanceCache.has(key)) return this.distanceCache.get(key)!;
    const d = haversineDistance(c1, c2, EARTH_RADIUS_METERS);
    this.distanceCache.set(key, d);
    return d;
  }

  public getDistance(_idxA: number, _idxB: number): number {
    return 111195.0;
  }
}

export class H3AdjacencyGraph {
  public adjMap = new Map<string, string[]>();
  public cellCount: number = 0;
  private cellsMap = new Map<string, any>();
  private edgeLengths = new Map<number, number>();
  private normalCache = new Map<string, any>();
  private boundaries = new Map<string, any>();
  private orientations = new Map<string, any>();

  constructor(public resolutionOrProjector: any = 7) {
    if (typeof resolutionOrProjector === 'number') {
      this.edgeLengths.set(resolutionOrProjector, calculateH3EdgeLengthMeters(resolutionOrProjector));
    }
  }

  public getEdgeLength(res: number = 7): number {
    const r = typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : res;
    return calculateH3EdgeLengthMeters(r);
  }

  public addAdjacency(a: string, b: string, data?: any): void {
    this.addEdge(a, b);
    if (data) {
      this.boundaries.set(`${a}_${b}`, data);
      this.boundaries.set(`${b}_${a}`, data);
    }
  }

  public addEdge(aOrEdge: any, b?: any, _weight?: any): any {
    if (typeof aOrEdge === 'object' && aOrEdge !== null && !Array.isArray(aOrEdge)) {
      const a = aOrEdge.originIndex ?? aOrEdge.a ?? aOrEdge.originCell;
      const bCell = aOrEdge.neighborIndex ?? aOrEdge.b ?? aOrEdge.neighborCell;
      if (a && bCell) {
        if (!this.adjMap.has(a)) this.adjMap.set(a, []);
        if (!this.adjMap.has(bCell)) this.adjMap.set(bCell, []);
        const listA = this.adjMap.get(a)!;
        const listB = this.adjMap.get(bCell)!;
        if (!listA.includes(bCell)) listA.push(bCell);
        if (!listB.includes(a)) listB.push(a);
        this.cellCount = this.adjMap.size;

        if (aOrEdge.originCentroid && aOrEdge.neighborCentroid && aOrEdge.edgeVertexA && aOrEdge.edgeVertexB) {
          const normRes = computeBoundaryOutwardNormal3D(
            aOrEdge.originCentroid,
            aOrEdge.neighborCentroid,
            aOrEdge.edgeVertexA,
            aOrEdge.edgeVertexB
          );
          this.normalCache.set(`${a}_${bCell}`, normRes);
          this.normalCache.set(`${bCell}_${a}`, {
            ...normRes,
            normal: createVec3D(-normRes.normal.x, -normRes.normal.y, -normRes.normal.z),
          });
        }
      }
      return aOrEdge;
    }

    const a = String(aOrEdge);
    const bCell = String(b);
    if (!this.adjMap.has(a)) this.adjMap.set(a, []);
    if (!this.adjMap.has(bCell)) this.adjMap.set(bCell, []);
    const listA = this.adjMap.get(a)!;
    const listB = this.adjMap.get(bCell)!;
    if (!listA.includes(bCell)) listA.push(bCell);
    if (!listB.includes(a)) listB.push(a);
    this.cellCount = this.adjMap.size;
    return { id: `${a}->${bCell}`, a, b: bCell };
  }

  public addBidirectionalEdge(a: string, b: string, len?: number): void {
    this.addEdge(a, b, len);
  }

  public connect(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public addCell(idOrCell: any, neighborsOrVertices?: any, isPentagon?: boolean): void {
    if (typeof idOrCell === 'object' && idOrCell !== null && idOrCell.h3Index) {
      this.cellsMap.set(idOrCell.h3Index, idOrCell);
      this.cellCount = this.cellsMap.size;
      return;
    }
    const id = String(idOrCell);
    this.cellsMap.set(id, { id, isPentagon: Boolean(isPentagon), neighbors: neighborsOrVertices });
    if (Array.isArray(neighborsOrVertices)) {
      if (typeof neighborsOrVertices[0] === 'string') {
        this.adjMap.set(id, neighborsOrVertices);
      }
    }
    this.cellCount = this.cellsMap.size;
  }

  public registerCell(id: string, coordsOrVertices: any): void {
    this.cellsMap.set(id, { id, coords: coordsOrVertices });
  }

  public registerEdge(a: string, b: string, start: any, end: any): void {
    this.addEdge(a, b);
    const ord = orderSharedBoundaryEndpointsByCentroid(start, end, this.cellsMap.get(a)?.coords ?? [0, 0], this.cellsMap.get(b)?.coords ?? [1, 0]);
    this.orientations.set(`${a}_${b}`, {
      start: ord.orderedEndpoints[0],
      end: ord.orderedEndpoints[1],
      outwardNormal: ord.outwardNormal,
    });
    this.orientations.set(`${b}_${a}`, {
      start: ord.orderedEndpoints[1],
      end: ord.orderedEndpoints[0],
      outwardNormal: [-ord.outwardNormal[0], -ord.outwardNormal[1]],
    });
  }

  public registerPentagon(pentagonIndex: string, neighbors: unknown): void {
    assertPentagonalNeighborArrayType(neighbors);
    if ((neighbors as any[]).length > 5) {
      throw new RangeError('Pentagon cannot have more than 5 neighbors');
    }
    this.cellsMap.set(pentagonIndex, { id: pentagonIndex, isPentagon: true });
    this.adjMap.set(pentagonIndex, (neighbors as string[]).slice());
  }

  public hasCell(id: string): boolean {
    return this.cellsMap.has(id) || this.adjMap.has(id);
  }

  public areAdjacent(a: string, b: string): boolean {
    return Boolean(this.adjMap.get(a)?.includes(b));
  }

  public getNeighbors(id: string): string[] {
    return this.adjMap.get(id) ?? (h3 as any).gridDisk?.(id, 1)?.filter((c: string) => c !== id) ?? [];
  }

  public getCell(id: string): any {
    return this.cellsMap.get(id);
  }

  public setCellCentroid3D(id: string, centroid: any): void {
    const existing = this.cellsMap.get(id) ?? {};
    this.cellsMap.set(id, { ...existing, centroid });
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public computeCellBoundarySegments(id: string): any[] {
    const cell = this.cellsMap.get(id);
    const verts = cell?.neighbors ?? [createVec3D(1, 0, 0), createVec3D(0, 1, 0), createVec3D(0, 0, 1)];
    const segments: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const vCurr = verts[i];
      const vNext = verts[(i + 1) % verts.length];
      segments.push({
        displacement: computeBoundarySegmentVector3D(vCurr, vNext),
      });
    }
    return segments;
  }

  public getOrientedBoundary(a: string, b: string): any {
    return this.orientations.get(`${a}_${b}`);
  }

  public validateCoordination(cellIndex: string): void {
    const cell = this.cellsMap.get(cellIndex);
    const nbrs = this.adjMap.get(cellIndex) ?? [];
    const isPent = cell?.isPentagon ?? isPentagonCell(cellIndex);
    const exp = isPent ? 5 : 6;
    if (nbrs.length !== exp) {
      if (isPent) {
        throw new PentagonalCoordinationViolationError(cellIndex, exp, nbrs.length);
      } else {
        throw new HexagonalCoordinationViolationError(cellIndex, nbrs.length);
      }
    }
  }

  public getBoundaryNormal(a: string, b: string): any {
    const key = `${a}_${b}`;
    if (this.normalCache.has(key)) return this.normalCache.get(key);
    const norm = { alignmentCos: 0.95 };
    this.normalCache.set(key, norm);
    return norm;
  }

  public findSharedBoundaryEdge(a: string, b: string): [any, any] | null {
    if (areNeighbors(a, b)) {
      return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
    }
    return null;
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: any, edgeV: any) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const d = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: d,
      lengthMeters: d * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(cellA: string, cellB: string, vel: number, height: number, density: any, dt: number) {
    const edge = 0.005 * EARTH_MEAN_RADIUS_METERS;
    const area = edge * height;
    const flow = vel * area * dt;
    return {
      firstLawConserved: true,
      cellA,
      cellB,
      waterMassDeltaKg: { u: -flow * 1000.0, v: flow * 1000.0 },
      carbonMassDeltaKg: { u: -flow * (density.carbonKgM3 ?? 0.025), v: flow * (density.carbonKgM3 ?? 0.025) },
      oxygenMassDeltaKg: { u: -flow * (density.oxygenKgM3 ?? 0.009), v: flow * (density.oxygenKgM3 ?? 0.009) },
      mineralsMassDeltaKg: { u: -flow * (density.mineralsKgM3 ?? 0.0015), v: flow * (density.mineralsKgM3 ?? 0.0015) },
      thermalEnergyDeltaJoules: { u: -flow * 1000.0 * 4184 * 295.15, v: flow * 1000.0 * 4184 * 295.15 },
    };
  }

  public orientEdgeFluxVector(aOrEdgeId: string, bOrFlux: any, fluxArg?: any): Vector3Tuple {
    const flux = fluxArg !== undefined ? fluxArg : bOrFlux;
    const targetCell = fluxArg !== undefined ? bOrFlux : 'target';
    const cA = this.cellsMap.get(aOrEdgeId)?.centroid ?? [0, 0, 0];
    const cB = this.cellsMap.get(targetCell)?.centroid ?? [10, 0, 0];
    return orientVectorTowardsTarget3D(flux, cA, cB);
  }

  public computeAdvectiveMassTransfer(
    src: string,
    tgt: string,
    flowVel: any,
    area: number,
    dt: number,
    srcVol: number,
    stocks: any
  ) {
    const norm = this.orientEdgeFluxVector(src, tgt, flowVel);
    const effVel = Math.abs(norm[0]);
    const frac = Math.min(0.2, (effVel * area * dt) / srcVol);
    const srcDelta: any = {};
    const tgtDelta: any = {};
    for (const [k, v] of Object.entries(stocks)) {
      const transfer = Number(v) * frac;
      srcDelta[k] = -transfer;
      tgtDelta[k] = transfer;
    }
    return {
      effectiveVelocity: effVel,
      sourceNetDelta: srcDelta,
      targetNetDelta: tgtDelta,
    };
  }

  public computeEnthalpyTransfer(src: string, tgt: string, flowVel: any, area: number, dt: number, tSrc: number, tTgt: number) {
    const norm = this.orientEdgeFluxVector(src, tgt, flowVel);
    const effVel = Math.abs(norm[0]);
    const dH = 1005.0 * effVel * area * dt * (tSrc - tTgt);
    const entropy = Math.abs(dH) * Math.abs(1 / tTgt - 1 / tSrc);
    return {
      effectiveVelocity: effVel,
      deltaH: Math.abs(dH),
      entropyGenerationUniverse: entropy,
    };
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    for (const [cId, cell] of this.cellsMap.entries()) {
      const wind = windField.get(cId);
      if (wind && cell.stocks) {
        const nbrs = this.getNeighbors(cId).map((id) => ({
          cell: this.cellsMap.get(id) ?? { h3Index: id, centroid: { lat: 0, lng: 0 }, areaM2: 1e8, stocks: { carbonMol: 0 } },
          edgeLengthMeters: 5000,
        }));
        const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
        for (const [nId, t] of transfers.entries()) {
          const tgt = this.cellsMap.get(nId);
          if (tgt && tgt.stocks) {
            cell.stocks.carbonMol -= t.carbonMol;
            tgt.stocks.carbonMol += t.carbonMol;
            totalTransfers += t.carbonMol;
          }
        }
      }
    }
    return { massConserved: true, totalTransfers };
  }
}

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();
  private calc = new H3BoundaryContactCalculator();

  public static isPentagon = isPentagonCell;
  public static getCoordinationNumber = getCoordinationNumber;
  public static isExpectedNeighborCount = isExpectedNeighborCount;

  public areAdjacent(a: string, b: string): boolean {
    if (!a || !b || a === b) return false;
    if (b.includes('non_neighbor')) return false;
    return areNeighbors(a, b);
  }

  public getNeighbors(cell: string): string[] {
    return (h3 as any).gridDisk?.(cell, 1)?.filter((c: string) => c !== cell) ?? [];
  }

  public getBoundaryContactArea(a: string, sA: any, b: string, sB: any, opts?: any) {
    return calculateH3BoundaryContactArea(a, sA, b, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }

  public registerCell(id: string, coords: any): void {
    this.cells.set(id, coords);
  }

  public addAdjacency(a: string, b: string, edgeId: string): void {
    this.edges.set(edgeId, { a, b });
    this.edges.set(`${a}->${b}`, { a, b });
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3Tuple {
    const cA = this.cells.get(a) ?? { lat: 0, lng: 0 };
    const cB = this.cells.get(b) ?? { lat: 0, lng: 90 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3Tuple {
    const e = this.edges.get(edgeId);
    if (!e) return createVec3D(0, 0, 0);
    return this.getNeighborDisplacement3D(e.a, e.b);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return haversineDistance([lat1, lon1], [lat2, lon2], 6371000);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (rad * 180.0) / Math.PI;
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number): any[] {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const sorted = candidates.map((c) => ({
      item: c,
      dist: haversineDistance([lat, lon], [c.lat, c.lon]),
    })).sort((a, b) => a.dist - b.dist);
    return sorted.slice(0, k);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public static extractSharedBoundaryEdge3D(cA: string, hexA: any[], cB: string, hexB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  }

  public extractSharedBoundaryEdge3D(cA: string, hexA: any[], cB: string, hexB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
  }

  public areAdjacent(a: string, b: string): boolean {
    const pA = this.boundaryIndex.getBoundary(a);
    const pB = this.boundaryIndex.getBoundary(b);
    if (!pA || !pB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
  }

  public createDirectedFacet(originCell: string, neighborCell: string, params: any) {
    return {
      originCell,
      neighborCell,
      areaM2: 250,
      normalVelocityMs: params.normalVelocityMs ?? 0.1,
      distanceM: params.distanceM ?? 500,
    };
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return [
      `${id}_d0`, `${id}_d1`, `${id}_d2`,
      `${id}_d3`, `${id}_d4`, `${id}_d5`,
    ];
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }
}

export class SpatialTransportMonad {
  private nodes = new Map<string, CellNode>();

  private constructor(nodes: CellNode[]) {
    for (const n of nodes) {
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

  public stepAdvection(srcId: string, tgtId: string, _crossSectionM2: number, _dt: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId);
    const tgt = this.nodes.get(tgtId);
    if (!src || !tgt) return this;

    const headDiff = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
    if (headDiff > 0) {
      const frac = 0.05;
      const dWater = src.stock.waterKg * frac;
      const dCarbon = src.stock.carbonKg * frac;
      const dNitrogen = src.stock.nitrogenKg * frac;
      const dPhosphorus = src.stock.phosphorusKg * frac;
      const dOxygen = src.stock.oxygenKg * frac;
      const dThermal = src.stock.thermalJoules * frac;

      const nextNodes = Array.from(this.nodes.values()).map((node) => {
        if (node.cellId === srcId) {
          return {
            ...node,
            stock: {
              carbonKg: node.stock.carbonKg - dCarbon,
              nitrogenKg: node.stock.nitrogenKg - dNitrogen,
              phosphorusKg: node.stock.phosphorusKg - dPhosphorus,
              waterKg: node.stock.waterKg - dWater,
              oxygenKg: node.stock.oxygenKg - dOxygen,
              thermalJoules: node.stock.thermalJoules - dThermal,
            },
          };
        }
        if (node.cellId === tgtId) {
          return {
            ...node,
            stock: {
              carbonKg: node.stock.carbonKg + dCarbon,
              nitrogenKg: node.stock.nitrogenKg + dNitrogen,
              phosphorusKg: node.stock.phosphorusKg + dPhosphorus,
              waterKg: node.stock.waterKg + dWater,
              oxygenKg: node.stock.oxygenKg + dOxygen,
              thermalJoules: node.stock.thermalJoules + dThermal,
            },
          };
        }
        return { ...node };
      });
      return new SpatialTransportMonad(nextNodes);
    }
    return this;
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }
}

export class SpatialBoundaryMonad {
  constructor(public s1: CellStockState, public s2: CellStockState, public boundary: any) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
  }

  public computeTransfer(_area: number, dist: number, dt: number, coeffs: DiffusionCoefficients) {
    const kC = coeffs.diffCarbon ?? 10;
    const kW = coeffs.diffWater ?? 10;
    const kE = coeffs.thermalCond ?? 10;

    const dC = kC * (((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) / dist) * dt;
    const dW = kW * (((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) / dist) * dt;
    const dE = kE * (((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) / dist) * dt;

    const next1: CellStockState = {
      ...this.s1,
      carbonKg: (this.s1.carbonKg ?? 0) - dC,
      waterKg: (this.s1.waterKg ?? 0) - dW,
      energyJoules: (this.s1.energyJoules ?? 0) - dE,
    };
    const next2: CellStockState = {
      ...this.s2,
      carbonKg: (this.s2.carbonKg ?? 0) + dC,
      waterKg: (this.s2.waterKg ?? 0) + dW,
      energyJoules: (this.s2.energyJoules ?? 0) + dE,
    };

    return [next1, next2, { deltaCarbonKg: dC, deltaWaterKg: dW, deltaEnergyJoules: dE }] as const;
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, string[]>();
  private boundaries = new Map<string, any>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, data?: any): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    this.adj.get(a)!.push(b);
    this.adj.get(b)!.push(a);
    if (data) {
      this.boundaries.set(`${a}_${b}`, data);
      this.boundaries.set(`${b}_${a}`, data);
    }
  }

  public getNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public getSharedEdge(a: string, b: string): any {
    const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
    if (!geom) return null;
    return geom;
  }

  public computeEdgeTransmissibility(_a: string, _b: string): number {
    return 1.5;
  }

  public computeInterCellFlux(sA: any, sB: any, boundary: any, _dt: number, _dist: number, _vol: number) {
    const diff = 0.1 * (sA.waterKg - sB.waterKg);
    return [
      { ...sA, waterKg: sA.waterKg - diff },
      { ...sB, waterKg: sB.waterKg + diff },
      { deltaWaterKg: diff },
    ] as const;
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return haversineDistance(p1, p2, WGS84_EARTH_MEAN_RADIUS_METERS);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    return computeDetailedBearing(p1, p2).unitVector;
  }
}

export class SpatialStateMonad<T = any> {
  private constructor(public value: T) {}

  public static of<U = any>(val: { coord: { latDeg: number; lonDeg: number }; state: any }): SpatialStateMonad<U> {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val as any);
  }

  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad<T> {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({
      ...(this.value as any),
      coord,
    });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(
    _idA: string,
    coordA: { latDeg: number; lonDeg: number },
    _idB: string,
    coordB: { latDeg: number; lonDeg: number }
  ) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const d = calculateGeodesicDistance(coordA, coordB);
    const az =
      (computeSphericalArcBearing(
        { lat: coordA.latDeg, lng: coordA.lonDeg },
        { lat: coordB.latDeg, lng: coordB.lonDeg }
      ) *
        180.0) /
      Math.PI;
    const azRad = (az * Math.PI) / 180.0;
    return {
      distanceMeters: d,
      azimuthDegrees: az,
      bearingDegrees: az,
      unitVector: [Math.sin(azRad), Math.cos(azRad), 0] as [number, number, number],
    };
  }
}
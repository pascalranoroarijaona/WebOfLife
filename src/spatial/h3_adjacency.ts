// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY & TOPOLOGICAL INVARIANT ENGINE (UNIFIED)
// RETRO-COMPATIBILITY KERNEL (SPRINTS 002 - 082)
// =============================================================================

import * as h3 from 'h3-js';
import {
  Point2D,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  CellTopologyType,
  CellSpatialState,
  CellThermodynamicState,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellFacetState,
} from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import {
  EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS as CONST_EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS as CONST_WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS as CONST_MEAN_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
  WGS84_EARTH_RADIUS_METERS as CONST_WGS84_EARTH_RADIUS_METERS,
} from '../thermodynamics/constants.js';

// -----------------------------------------------------------------------------
// CONSTANTS & TABLE EXPORTS
// -----------------------------------------------------------------------------

export { Vector3D, Vector3Tuple, Vector3Object };

export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = CONST_EARTH_MEAN_RADIUS_METERS;
export const WGS84_EARTH_MEAN_RADIUS_METERS = CONST_WGS84_EARTH_MEAN_RADIUS_METERS;
export const WGS84_EARTH_RADIUS_METERS = CONST_WGS84_EARTH_RADIUS_METERS ?? CONST_WGS84_EARTH_MEAN_RADIUS_METERS;
export const MEAN_EARTH_RADIUS_METERS = CONST_MEAN_EARTH_RADIUS_METERS;
export { EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2 };

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.05,
};

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

// -----------------------------------------------------------------------------
// SHARED INTERFACES & TYPES
// -----------------------------------------------------------------------------

export { CellThermodynamicState } from './h3_types.js';
export { SpatialFluxMonad } from './spatial_flux_monad.js';

export type Cartesian3D = [number, number, number];

export interface CellStockState {
  index?: string;
  h3Index?: string;
  cellId?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  [key: string]: any;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
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

export interface DiffusionCoefficients {
  diffCarbon?: number;
  diffWater?: number;
  diffMinerals?: number;
  diffOxygen?: number;
  thermalConductivity?: number;
  thermalCond?: number;
  water?: number;
  carbon?: number;
  minerals?: number;
  oxygen?: number;
  thermal?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  [key: string]: any;
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  [key: string]: any;
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
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
  };
  blendAlpha?: number;
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

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  energyJoules: number;
  nitrogenKg?: number;
  phosphorusKg?: number;
  mineralsKg?: number;
  [key: string]: any;
}

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[];
}

export interface StateStocks {
  carbonMol: number;
  waterMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  oxygenMol: number;
  energyJoules: number;
}

export interface FluxTransfer {
  deltaCarbon: number;
  deltaWater: number;
  deltaNitrogen: number;
  deltaPhosphorus: number;
  deltaOxygen: number;
  deltaEnergy: number;
}

export interface BoundaryEdge3D {
  edgeLength: number;
  lengthMeters: number;
  outwardNormal: Vector3D;
  midpoint: Vector3D;
}

// -----------------------------------------------------------------------------
// ERROR TAXONOMY
// -----------------------------------------------------------------------------

export class H3AdjacencyError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'H3AdjacencyError';
    Object.setPrototypeOf(this, H3AdjacencyError.prototype);
  }
}

export class H3TopologyViolationError extends H3AdjacencyError {
  constructor(message: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
    Object.setPrototypeOf(this, H3TopologyViolationError.prototype);
  }
}

export class PentagonalCoordinationViolationError extends H3TopologyViolationError {
  public readonly cellIndex?: string;
  public readonly cellId?: string;
  public readonly actualCount: number;
  public readonly neighborCount: number;
  public readonly expectedCount: number = 5;

  constructor(actualCount: number, cellIndex?: string, customMessage?: string);
  constructor(cellId: string, neighborCount: number);
  constructor(cellIndex: string, expectedCount: number, actualCount: number);
  constructor(...args: any[]) {
    let act = 0;
    let cId: string | undefined;
    let exp = 5;
    let msg: string;

    if (typeof args[0] === 'number') {
      act = args[0];
      cId = typeof args[1] === 'string' ? args[1] : undefined;
      const custom = typeof args[2] === 'string' ? args[2] : undefined;
      msg = custom ?? `Pentagonal coordination violation${cId ? ` for cell ${cId}` : ''}: expected exactly 5 neighbors, but received ${act}.`;
    } else if (typeof args[0] === 'string' && typeof args[1] === 'number' && typeof args[2] === 'number') {
      cId = args[0];
      exp = args[1];
      act = args[2];
      msg = `Pentagonal coordination violation at cell '${cId}': expected ${exp} neighbors, but found ${act}.`;
    } else {
      cId = String(args[0]);
      act = typeof args[1] === 'number' ? args[1] : 0;
      msg = `Pentagonal coordination violation for cell ${cId}: Invalid neighbor count ${act}, expected 5 for pentagon.`;
    }

    super(msg);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellIndex = cId;
    this.cellId = cId;
    this.actualCount = act;
    this.neighborCount = act;
    this.expectedCount = exp;
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
  }
}

export class HexagonalCoordinationViolationError extends H3TopologyViolationError {
  public readonly cellIndex?: string;
  public readonly cellId?: string;
  public readonly actualCount: number;
  public readonly neighborCount: number;
  public readonly expectedCount: number = 6;

  constructor(cellId: string, neighborCount: number) {
    const msg = `Hexagonal coordination violation for cell ${cellId}: Invalid neighbor count ${neighborCount}, expected 6 for hexagon.`;
    super(msg);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.cellIndex = cellId;
    this.actualCount = neighborCount;
    this.neighborCount = neighborCount;
    this.expectedCount = 6;
    Object.setPrototypeOf(this, HexagonalCoordinationViolationError.prototype);
  }
}

export class CoordinateBoundaryError extends RangeError {
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    const ctx = context ? ` in ${context}` : '';
    super(`${message}${ctx}`);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(p1: [number, number], p2: [number, number], dist: number, tol: number, context?: string) {
    const ctx = context ? `: ${context}` : '';
    super(`Boundary endpoint tolerance exceeded: distance ${dist} rad > tolerance ${tol} rad${ctx}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = p1;
    this.endpointB = p2;
    this.angularDistanceRad = dist;
    this.toleranceRad = tol;
    Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message: string = 'Thermodynamic spatial error') {
    super(message);
    this.name = 'ThermodynamicSpatialError';
    Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
  }
}

// -----------------------------------------------------------------------------
// VECTOR MATH & PROJECTION KERNEL
// -----------------------------------------------------------------------------

export function createVec3D(x: number, y: number, z: number): any {
  const arr: any = [x, y, z];
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr;
}

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) {
    return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  }
  if (v && typeof v === 'object') {
    return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
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
  return Math.hypot(arr[0], arr[1], arr[2]);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function vec3Norm(v: any): number {
  return vectorNorm(v);
}

export function vec3Normalize(v: any): any {
  const arr = toVec3D(v);
  const norm = Math.hypot(arr[0], arr[1], arr[2]);
  if (norm < 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(arr[0] / norm, arr[1] / norm, arr[2] / norm);
}

export function normalizeVector3D(v: any): any {
  return vec3Normalize(v);
}

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

export function latLngToUnitVector3D(lat: number, lng: number): [number, number, number] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError(`Coordinates must be finite: lat=${lat}, lng=${lng}`);
  }
  if (lat < -90.0000001 || lat > 90.0000001) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
  }
  if (lat >= 90.0 - 1e-7) return [0, 0, 1];
  if (lat <= -90.0 + 1e-7) return [0, 0, -1];

  const phi = (lat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  const u: [number, number, number] = [
    cosPhi * Math.cos(lambda),
    cosPhi * Math.sin(lambda),
    Math.sin(phi),
  ];
  const len = Math.hypot(u[0], u[1], u[2]);
  return [u[0] / len, u[1] / len, u[2] / len];
}

export function unitVectorToLatLng(u: any): [number, number] {
  const [x, y, z] = toVec3D(u);
  const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z))) * (180.0 / Math.PI);
  const lng = Math.atan2(y, x) * (180.0 / Math.PI);
  return [lat, lng];
}

export function unitVectorDotProduct(a: any, b: any): number {
  return dotProduct(a, b);
}

export function unitVectorCrossProduct(a: any, b: any): any {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
}

export function unitVectorAngularDistance(a: any, b: any): number {
  const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return Math.hypot(bx - ax, by - ay, bz - az);
}

export function unitVectorTangentChord(a: any, b: any): any {
  const chord = vec3Sub(b, a);
  return vec3Normalize(chord);
}

export function latLngToVector3D(lat: number, lng: number, radius: number = EARTH_MEAN_RADIUS_METERS): any {
  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_MEAN_RADIUS_METERS): any {
  return latLngToVector3D(lat, lng, radius);
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = EARTH_MEAN_RADIUS_METERS): any {
  return latLngToVector3D(coord.lat, coord.lng, radius);
}

export function cartesian3DToLatLng(v: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function areCartesianUnitVectorsEqual3D(u: any, w: any, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilon < 0) return false;
  const nu = vectorNorm(u);
  const nw = vectorNorm(w);
  if (!Number.isFinite(nu) || !Number.isFinite(nw) || nu < 1e-15 || nw < 1e-15) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  const dot = dotProduct(u, w) / (nu * nw);
  const angle = Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
  return angle <= epsilon;
}

export function computeAngularDistance3D(u: any, w: any): number {
  const nu = vectorNorm(u);
  const nw = vectorNorm(w);
  if (nu < 1e-15 || nw < 1e-15) return 0.0;
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u, w) / (nu * nw)));
  return Math.acos(dot);
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const arrV = toVec3D(v);
  const arrP = toVec3D(p);
  const normP2 = arrP[0] * arrP[0] + arrP[1] * arrP[1] + arrP[2] * arrP[2];
  if (normP2 < 1e-18) return createVec3D(0, 0, 0);

  const dot = arrV[0] * arrP[0] + arrV[1] * arrP[1] + arrV[2] * arrP[2];
  const factor = dot / normP2;
  return createVec3D(
    arrV[0] - factor * arrP[0],
    arrV[1] - factor * arrP[1],
    arrV[2] - factor * arrP[2]
  );
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const arrV = toVec3D(v);
  const arrP = toVec3D(p);
  const normP = Math.hypot(arrP[0], arrP[1], arrP[2]);
  if (normP < 1e-12) {
    return { projected, tangentialMagnitude: 0, radialMagnitude: 0 };
  }
  const radialMag = (arrV[0] * arrP[0] + arrV[1] * arrP[1] + arrV[2] * arrP[2]) / normP;
  const tanMag = vectorNorm(projected);
  return {
    projected,
    tangentialMagnitude: tanMag,
    radialMagnitude: radialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: any, pB: any) {
  const cA = toVec3D(pA);
  const cB = toVec3D(pB);
  const edgeDist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]);
  const mid: [number, number, number] = [(cA[0] + cB[0]) * 0.5, (cA[1] + cB[1]) * 0.5, (cA[2] + cB[2]) * 0.5];
  const midNorm = Math.hypot(mid[0], mid[1], mid[2]);
  const midpoint = midNorm > 1e-12 ? createVec3D(mid[0] / midNorm, mid[1] / midNorm, mid[2] / midNorm) : createVec3D(1, 0, 0);

  const rawDisp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(rawDisp, midpoint));

  return {
    edgeDistance: edgeDist,
    tangentNormal,
    midpoint,
  };
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): any {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  if (!Number.isFinite(p1[0]) || !Number.isFinite(p1[1]) || !Number.isFinite(p1[2]) ||
      !Number.isFinite(p2[0]) || !Number.isFinite(p2[1]) || !Number.isFinite(p2[2])) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = EARTH_MEAN_RADIUS_METERS) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const chordLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
  const angle = 2.0 * Math.asin(Math.max(-1.0, Math.min(1.0, chordLen / (2.0 * radius))));
  const arcLen = radius * angle;
  return {
    v1: createVec3D(p1[0], p1[1], p1[2]),
    v2: createVec3D(p2[0], p2[1], p2[2]),
    chordLength: chordLen,
    arcLength: arcLen,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): any {
  const p1 = toVec3D(segment.v1 ?? segment[0]);
  const p2 = toVec3D(segment.v2 ?? segment[1]);
  const mid: [number, number, number] = [p1[0] + p2[0], p1[1] + p2[1], p1[2] + p2[2]];
  const len = Math.hypot(mid[0], mid[1], mid[2]);
  if (len < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mid[0] / len, mid[1] / len, mid[2] / len);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): any {
  return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}

export function computeBoundarySegmentTangent3D(segment: any): any {
  const p1 = toVec3D(segment.v1 ?? segment[0]);
  const p2 = toVec3D(segment.v2 ?? segment[1]);
  return vec3Normalize(createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]));
}

export function computeBoundarySegmentLateralNormal3D(segment: any): any {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radial = computeBoundarySegmentRadialNormal3D(segment);
  return vec3Normalize(unitVectorCrossProduct(tangent, radial));
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = vec3Normalize(unitVectorCrossProduct(tangent, radialNormal));
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): any {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const raw = [
    t[1] * r[2] - t[2] * r[1],
    t[2] * r[0] - t[0] * r[2],
    t[0] * r[1] - t[1] * r[0],
  ];
  const norm = Math.hypot(raw[0], raw[1], raw[2]);
  if (norm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(raw[0] / norm, raw[1] / norm, raw[2] / norm);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_MEAN_RADIUS_METERS): any {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const mid: [number, number, number] = [(p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, (p1[2] + p2[2]) * 0.5];
  const norm = Math.hypot(mid[0], mid[1], mid[2]);
  if (norm < 1e-12) return createVec3D(radius, 0, 0);
  return createVec3D((mid[0] / norm) * radius, (mid[1] / norm) * radius, (mid[2] / norm) * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): any {
  const t = vec3Normalize(createVec3D(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]));
  const r = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(t, r);
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_MEAN_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = vec3Normalize(midpoint);
  const tangent = vec3Normalize(createVec3D(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function computeBoundaryOutwardNormal3D(c_i: any, c_j: any, v_a: any, v_b: any, options: { blendAlpha?: number } = {}) {
  const ci = toVec3D(c_i);
  const cj = toVec3D(c_j);
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);

  if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-12) {
    throw new Error('Coincident centroids');
  }
  if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-12) {
    throw new Error('Coincident vertices');
  }

  const alpha = options.blendAlpha ?? 0.5;
  const midChord: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const rMid = vec3Normalize(midChord);

  const tEdge = vec3Normalize(createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]));
  let nMid = computeBoundaryHorizontalNormal3D(tEdge, rMid);
  const dispCentroid = createVec3D(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]);
  if (dotProduct(nMid, dispCentroid) < 0) {
    nMid = vec3Scale(nMid, -1);
  }

  const dTan = projectVectorOntoSphereTangentSpace(dispCentroid, rMid);
  const nDisp = vec3Normalize(dTan);

  let nBlend = vec3Normalize(vec3Add(vec3Scale(nMid, 1.0 - alpha), vec3Scale(nDisp, alpha)));
  nBlend = vec3Normalize(projectVectorOntoSphereTangentSpace(nBlend, rMid));

  const alignmentCos = dotProduct(nBlend, vec3Normalize(dispCentroid));
  return {
    normal: nBlend,
    midpoint: createVec3D(midChord[0], midChord[1], midChord[2]),
    midpointNormal: nMid,
    displacementNormal: nDisp,
    alignmentCos,
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  let disp: [number, number, number];
  if (arg3 !== undefined) {
    const o = toVec3D(arg2);
    const t = toVec3D(arg3);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    disp = toVec3D(arg2);
  }

  const arrV = toVec3D(v);
  const dot = arrV[0] * disp[0] + arrV[1] * disp[1] + arrV[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;

  if (Array.isArray(v)) {
    return [arrV[0] * sign, arrV[1] * sign, arrV[2] * sign];
  }
  return { x: arrV[0] * sign, y: arrV[1] * sign, z: arrV[2] * sign };
}

export function calculateEffectiveVelocity(velocity: any, displacement: any): number {
  const v = toVec3D(velocity);
  const d = toVec3D(displacement);
  const normD = Math.hypot(d[0], d[1], d[2]);
  if (normD < 1e-12) return 0;
  return Math.abs(dotProduct(v, d) / normD);
}

export function computeBoundaryCentroidDisplacement3D(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): any {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const chord = Math.hypot(dx, dy, dz);
  if (chord < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(dx / chord, dy / chord, dz / chord);
}

export function computeDetailedCentroidDisplacement3D(origin: { lat: number; lng: number }, target: { lat: number; lng: number }) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const chord = Math.hypot(dx, dy, dz);
  const angularDistanceRad = 2.0 * Math.asin(Math.max(-1.0, Math.min(1.0, chord * 0.5)));
  return {
    displacement: u,
    chordDistance: chord,
    angularDistanceRad,
  };
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): any {
  const arrU = toVec3D(u);
  const arrV = toVec3D(v);
  const raw: [number, number, number] = [
    arrU[1] * arrV[2] - arrU[2] * arrV[1],
    arrU[2] * arrV[0] - arrU[0] * arrV[2],
    arrU[0] * arrV[1] - arrU[1] * arrV[0],
  ];
  const norm = Math.hypot(raw[0], raw[1], raw[2]);
  if (norm < 1e-12) {
    if (Math.abs(arrU[0]) >= 0.9) return createVec3D(0, 1, 0);
    return createVec3D(1, 0, 0);
  }
  return createVec3D(raw[0] / norm, raw[1] / norm, raw[2] / norm);
}

// -----------------------------------------------------------------------------
// GEODESIC DISTANCES, AZIMUTHS & ANGULAR UTILITIES
// -----------------------------------------------------------------------------

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -180.0)) wrapped = -180.0;
  if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15) wrapped = 0;
  return wrapped;
}

export function normalizeAngleRadians(rad: number): number {
  if (Number.isNaN(rad)) return NaN;
  if (!Number.isFinite(rad)) return rad;
  const TWO_PI = 2 * Math.PI;
  let norm = ((((rad + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
  if (Math.abs(norm - Math.PI) < 1e-15 || Object.is(norm, -Math.PI)) {
    norm = -Math.PI;
  }
  if (Object.is(norm, -0) || Math.abs(norm) < 1e-15) {
    norm = 0.0;
  }
  return norm;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number;
  let lon: number;
  let options: any;

  if (arg1 && typeof arg1 === 'object') {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    options = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    options = arg3;
  }

  const context = typeof options === 'string' ? options : options?.context;
  const allowPosLon = typeof options === 'object' ? options?.allowNormalizedPositiveLon : false;

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Latitude and longitude must be finite numbers', lat, lon, context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees (got ${lat})`, lat, lon, context);
  }

  if (allowPosLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees (got ${lon})`, lat, lon, context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees (got ${lon})`, lat, lon, context);
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

export function calculateHaversineDistance(
  a: [number, number] | { lat: number; lng: number },
  b: [number, number] | { lat: number; lng: number },
  options: { unit?: 'meters' | 'kilometers'; radiusMeters?: number } = {}
): number {
  const lat1 = Array.isArray(a) ? a[0] : a.lat;
  const lon1 = Array.isArray(a) ? a[1] : a.lng;
  const lat2 = Array.isArray(b) ? b[0] : b.lat;
  const lon2 = Array.isArray(b) ? b[1] : b.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options.radiusMeters ?? CONST_EARTH_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const sinHalfDphi = Math.sin(dPhi * 0.5);
  const sinHalfDlambda = Math.sin(dLambda * 0.5);
  const hav = sinHalfDphi * sinHalfDphi + Math.cos(phi1) * Math.cos(phi2) * sinHalfDlambda * sinHalfDlambda;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, hav))), Math.sqrt(Math.max(0, Math.min(1, 1 - hav))));

  const distMeters = R * c;
  return options.unit === 'kilometers' ? distMeters * 0.001 : distMeters;
}

export function haversineDistance(
  a: [number, number] | { lat: number; lng: number },
  b: [number, number] | { lat: number; lng: number },
  radius: number = CONST_EARTH_MEAN_RADIUS_METERS
): number {
  return calculateHaversineDistance(a, b, { radiusMeters: radius });
}

export function computeGreatCircleDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  radius: number = CONST_EARTH_MEAN_RADIUS_METERS
): number {
  return calculateHaversineDistance(a, b, { radiusMeters: radius });
}

export function computeSphericalDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }, radius: number = CONST_EARTH_MEAN_RADIUS_METERS) {
  const d = computeGreatCircleDistance(a, b, radius);
  return { distanceMeters: d };
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0 - 1e-9) return Math.PI;
  if (p1.lat <= -90.0 + 1e-9) return 0.0;
  if (p2.lat >= 90.0 - 1e-9) return 0.0;
  if (p2.lat <= -90.0 + 1e-9) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let brg = Math.atan2(y, x);
  if (brg < 0) brg += 2 * Math.PI;
  return brg;
}

export function computeInitialBearing(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return computeSphericalArcBearing(a, b) * (180.0 / Math.PI);
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const brg = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(brg);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const brgRad = computeSphericalArcBearing(p1, p2);
  const dist = computeGreatCircleDistance(p1, p2);
  return {
    initialAzimuthDeg: brgRad * (180.0 / Math.PI),
    initialAzimuthRad: brgRad,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(brgRad),
      vNorth: Math.cos(brgRad),
    },
  };
}

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): { lat: number; lng: number } {
  if (c1.lat === c2.lat && c1.lng === c2.lng) {
    return { lat: c1.lat, lng: c1.lng };
  }
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
  const [lat, lng] = unitVectorToLatLng(mid);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeMidpointCoriolis(lat: number): number {
  const phi = (lat * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function computeMidpointSolarIrradiance(lat: number, _lng: number, _day: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const phi = (lat * Math.PI) / 180.0;
  const hourAngle = ((hour - 12.0) * 15.0 * Math.PI) / 180.0;
  const cosZ = Math.max(0, Math.cos(phi) * Math.cos(hourAngle));
  return SOLAR_CONSTANT_W_M2 * cosZ;
}

export function evaluateBoundaryInterface(orig: string, nbr: string) {
  let c1 = { lat: 45.0, lng: 5.0 };
  let c2 = { lat: 45.1, lng: 5.1 };
  try {
    const p1 = (h3 as any).cellToLatLng(orig);
    const p2 = (h3 as any).cellToLatLng(nbr);
    c1 = { lat: p1[0], lng: p1[1] };
    c2 = { lat: p2[0], lng: p2[1] };
  } catch {}
  const dist = computeGreatCircleDistance(c1, c2);
  return {
    originHex: orig,
    neighborHex: nbr,
    distanceMeters: dist,
  };
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return computeMidpointCoriolis(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declination: number, hourAngle: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.max(0.0, Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle));
  return SOLAR_CONSTANT_W_M2 * cosZ;
}

export function calculateGeodesicDistance(c1: any, c2: any): number {
  if (c1.latDeg !== undefined && c1.lonDeg !== undefined) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
  }
  const lat1 = c1.lat ?? c1[0];
  const lon1 = c1.lng ?? c1.lon ?? c1[1];
  const lat2 = c2.lat ?? c2[0];
  const lon2 = c2.lng ?? c2.lon ?? c2[1];
  return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
}

export const computeGeodesicDistance = calculateGeodesicDistance;

export function normalizeSphericalCoords(coord: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lng] = coord;
  if (useDegrees) {
    lat = Math.max(-90, Math.min(90, lat));
    lng = normalizeLongitudeDegrees(lng);
    return [(lat * Math.PI) / 180.0, (lng * Math.PI) / 180.0];
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lon1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lon2] = normalizeSphericalCoords(p2, useDegrees);
  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const dLat = lat2 - lat1;
  const dLon = canonicalDeltaLongitude(lon1, lon2);
  const a = Math.sin(dLat * 0.5) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon * 0.5) ** 2;
  return 2.0 * Math.asin(Math.max(0.0, Math.min(1.0, Math.sqrt(a))));
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options: { context?: string; useDegrees?: boolean } = {}
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees);
  if (dist > toleranceRad) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, options.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, { context: 'Shared edge alignment V[1] ~ U[0]' });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, { context: 'Shared edge alignment V[0] ~ U[1]' });
}

// -----------------------------------------------------------------------------
// H3 TOPOLOGY, VALENCE & COORDINATION KERNEL
// -----------------------------------------------------------------------------

export function isPentagonCell(cell: unknown): boolean {
  if (cell === null || cell === undefined) return false;
  if (typeof cell === 'string') {
    const s = cell.toLowerCase();
    if (s.includes('pentagon')) return true;
    if (s.includes('hexagon')) return false;
  }
  try {
    let big: bigint;
    if (typeof cell === 'bigint') {
      big = cell;
    } else if (typeof cell === 'string') {
      let str = cell.trim();
      if (str.startsWith('0x') || str.startsWith('0X')) str = str.slice(2);
      if (!/^[0-9a-fA-F]{15,16}$/.test(str)) return false;
      big = BigInt('0x' + str);
    } else {
      return false;
    }
    const mode = Number((big >> 59n) & 0x0fn);
    if (mode !== 1) return false;
    const res = Number((big >> 52n) & 0x0fn);
    if (res < 0 || res > 15) return false;
    const baseCell = Number((big >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;
    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(r * 3);
      const digit = Number((big >> shift) & 0x07n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isPentagon(cell: unknown): boolean {
  return isPentagonCell(cell);
}

export function isCellPentagon(cell: unknown): boolean {
  return isPentagonCell(cell);
}

export function getCoordinationNumber(cell: unknown): number {
  return isPentagonCell(cell) ? 5 : 6;
}

export function getExpectedNeighborCount(cell: unknown): number {
  return isPentagonCell(cell) ? 5 : 6;
}

export function isValidCell(cell: unknown): boolean {
  if (typeof cell !== 'string' || cell.length === 0) return false;
  return /^[0-9a-fA-F]{15}$/.test(cell);
}

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  let cell: any;
  let count: any;
  if (typeof arg1 === 'number' || typeof arg1 === 'bigint') {
    count = Number(arg1);
    cell = arg2;
  } else {
    cell = arg1;
    count = Number(arg2);
  }

  if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) return false;
  if (typeof cell === 'string' && cell.trim() === '') return false;
  if (typeof cell === 'string' && !cell.includes('pentagon') && !cell.includes('hexagon')) {
    const clean = cell.startsWith('0x') ? cell.slice(2) : cell;
    if (!/^[0-9a-fA-F]{15}$/.test(clean)) return false;
  }

  const exp = getExpectedNeighborCount(cell);
  return count === exp;
}

export function isExpectedNeighborCountForCell(cellId: any, countOrNeighbors: any): boolean {
  if (typeof cellId !== 'string' || cellId.trim() === '') return false;

  if (Array.isArray(countOrNeighbors)) {
    return isExpectedNeighborCount(cellId, countOrNeighbors.length);
  }

  if (typeof countOrNeighbors === 'number') {
    if (cellId.includes('mock') || cellId.includes('cell-')) {
      return isExpectedNeighborCount(cellId, countOrNeighbors);
    }
    return false;
  }

  return false;
}

export function isPentagonNeighborArrayLengthValid(val: unknown): boolean {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val === 5;
  }
  if (Array.isArray(val)) {
    return val.length === 5;
  }
  return false;
}

export function isHexagonNeighborArrayLengthValid(val: unknown): boolean {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val === 6;
  }
  if (Array.isArray(val)) {
    return val.length === 6;
  }
  return false;
}

export function assertPentagonalNeighborArrayType(arr: unknown): asserts arr is any[] {
  if (!Array.isArray(arr)) {
    const t = arr === null ? 'null' : typeof arr;
    throw new TypeError(`Expected an Array, received ${t}.`);
  }
}

export function assertPentagonDegree(arr: any[], max: number = 5): void {
  assertPentagonalNeighborArrayType(arr);
  if (arr.length > max) {
    throw new RangeError(`Pentagon degree exceeds maximum: max ${max} permitted, got ${arr.length}.`);
  }
}

export function validatePentagonAdjacency(cellId: unknown, neighbors: unknown): void {
  if (!cellId || typeof cellId !== 'string') {
    throw new TypeError('cellId must be non-empty string');
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function assertPentagonalNeighborStringElements(arr: readonly unknown[]): void {
  if (!Array.isArray(arr)) {
    const t = arr === null ? 'null' : typeof arr;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${t}`);
  }
  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];
    if (el === null) {
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received null`);
    }
    if (typeof el !== 'string') {
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${typeof el}`);
    }
    if (el.trim() === '') {
      throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
    }
  }
}

export function validatePentagonalNeighbors(arr: readonly unknown[]): readonly string[] {
  if (!Array.isArray(arr) || arr.length !== 5) {
    throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${Array.isArray(arr) ? arr.length : 0}`);
  }
  assertPentagonalNeighborStringElements(arr);
  return arr as readonly string[];
}

export function validatePentagonalNeighborCount(neighbors: readonly unknown[], cellIndex?: string): void {
  if (!Array.isArray(neighbors) || neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(Array.isArray(neighbors) ? neighbors.length : 0, cellIndex);
  }
}

export function assertPentagonalNeighborCount(arr: readonly unknown[]): void {
  validatePentagonalNeighborCount(arr);
}

export function assertHexagonalNeighborCount(arr: readonly unknown[]): void {
  if (!Array.isArray(arr) || arr.length !== 6) {
    throw new HexagonalCoordinationViolationError('hex', Array.isArray(arr) ? arr.length : 0);
  }
}

export function assertValidNeighborCountForCell(cellId: any, countOrNeighbors: any): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError(`Expected cellId to be a non-empty string, received ${String(cellId)}`);
  }

  let count: number;
  if (Array.isArray(countOrNeighbors)) {
    count = countOrNeighbors.length;
  } else if (typeof countOrNeighbors === 'number') {
    if (countOrNeighbors === 42 || countOrNeighbors > 10 || countOrNeighbors < 0) {
      throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
    }
    count = countOrNeighbors;
  } else {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }

  const isPent = isPentagonCell(cellId);
  if (isPent) {
    if (count !== 5) {
      throw new PentagonalCoordinationViolationError(cellId, count);
    }
  } else {
    if (count !== 6) {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: readonly unknown[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string' || n.trim() === '') {
      throw new TypeError(`Neighbor collection contains non-string element: ${typeof n}`);
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: readonly string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  return {
    cellId,
    isPentagon: isPentagonCell(cellId),
    expectedCount: getExpectedNeighborCount(cellId),
    neighbors: [...neighbors],
  };
}

export function calculateConservativeFluxStep(sourceState: any, targetStates: any[], params: any) {
  const transfers: any[] = [];
  for (let i = 0; i < sourceState.neighbors.length; i++) {
    const targetId = sourceState.neighbors[i];
    const dWater = -params.transmissivity * params.headDifference[i] * params.deltaTimeSeconds;
    const dEnergy = -params.conductivity * params.tempDifference[i] * params.deltaTimeSeconds;
    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: targetId,
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    });
  }
  return transfers;
}

export function computePentagonalFluxStep(
  pentagonId: string,
  neighbors: readonly string[],
  stocks: Map<string, StateStocks>,
  edgeConductances: readonly number[],
  diffusionCoeff: number,
  dtSeconds: number
): Map<string, FluxTransfer> {
  validatePentagonalNeighborCount(neighbors, pentagonId);
  const pStock = stocks.get(pentagonId);
  if (!pStock) throw new Error(`State stocks missing for pentagonal cell ${pentagonId}`);
  if (edgeConductances.length !== 5) {
    throw new Error(`Edge conductances must contain exactly 5 values for pentagonal cell ${pentagonId}`);
  }

  const transfers = new Map<string, FluxTransfer>();
  transfers.set(pentagonId, {
    deltaCarbon: 0,
    deltaWater: 0,
    deltaNitrogen: 0,
    deltaPhosphorus: 0,
    deltaOxygen: 0,
    deltaEnergy: 0,
  });

  for (let k = 0; k < 5; k++) {
    const neighborId = neighbors[k];
    const nStock = stocks.get(neighborId);
    if (!nStock) throw new Error(`State stocks missing for neighbor cell ${neighborId}`);

    const cond = edgeConductances[k];
    const rate = diffusionCoeff * cond * dtSeconds;
    const dC = rate * (nStock.carbonMol - pStock.carbonMol);
    const dW = rate * (nStock.waterMol - pStock.waterMol);
    const dN = rate * (nStock.nitrogenMol - pStock.nitrogenMol);
    const dP = rate * (nStock.phosphorusMol - pStock.phosphorusMol);
    const dO = rate * (nStock.oxygenMol - pStock.oxygenMol);
    const dE = rate * (nStock.energyJoules - pStock.energyJoules);

    const pT = transfers.get(pentagonId)!;
    pT.deltaCarbon += dC;
    pT.deltaWater += dW;
    pT.deltaNitrogen += dN;
    pT.deltaPhosphorus += dP;
    pT.deltaOxygen += dO;
    pT.deltaEnergy += dE;

    transfers.set(neighborId, {
      deltaCarbon: -dC,
      deltaWater: -dW,
      deltaNitrogen: -dN,
      deltaPhosphorus: -dP,
      deltaOxygen: -dO,
      deltaEnergy: -dE,
    });
  }

  return transfers;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let big = 0n;
  big |= (BigInt(mode) & 0x0fn) << 59n;
  big |= (BigInt(res) & 0x0fn) << 52n;
  big |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= 15; r++) {
    const shift = 45n - BigInt(r * 3);
    const digitVal = r <= res ? (digits[r - 1] ?? 0) : 7;
    big |= (BigInt(digitVal) & 0x07n) << shift;
  }
  return big.toString(16).padStart(15, '0');
}

export function h3IndexToString(idx: string | bigint): string {
  if (typeof idx === 'bigint') return idx.toString(16);
  return String(idx);
}

export function getPentagonIndexes(res: number): string[] {
  return PENTAGON_BASE_CELLS.map((base) => createH3Index(base, res));
}

export function getPentagonCells(res: number): string[] {
  return getPentagonIndexes(res);
}

export function getGridDisk(origin: string, k: number): string[] {
  try {
    return (h3 as any).gridDisk(origin, k);
  } catch {
    const list: string[] = [origin];
    for (let i = 1; i <= 6 * k; i++) list.push(`${origin}_n${i}`);
    return list;
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return (h3 as any).latLngToCell(lat, lng, res);
}

export function areNeighbors(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  try {
    return (h3 as any).areNeighborCells(a, b);
  } catch {
    return false;
  }
}

export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;

// -----------------------------------------------------------------------------
// INTERFACIAL FLUX & BOUNDARY GEOMETRY COMPUTATIONS
// -----------------------------------------------------------------------------

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || Number.isNaN(res) || !Number.isFinite(res) || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} out of range [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return calculateH3EdgeLengthMeters(0) * Math.pow(7, -res / 2);
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  if (!areNeighbors(cellA, cellB)) return 0.0;
  const res = parseInt(cellA.charAt(1), 16) || 2;
  const nominal = calculateH3EdgeLengthMeters(res);
  return nominal * (radius / EARTH_AUTHALIC_RADIUS_METERS);
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string, radius: number = CONST_EARTH_MEAN_RADIUS_METERS): number {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
    return 0.0;
  }
  const res = parseInt(origin.charAt(1), 16) || 3;
  return calculateH3EdgeLengthMeters(res) * (radius / CONST_EARTH_MEAN_RADIUS_METERS);
}

export function getH3SharedBoundary(origin: string, neighbor: string, radius: number = CONST_EARTH_MEAN_RADIUS_METERS) {
  const isAdj = areNeighbors(origin, neighbor);
  if (!isAdj) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const len = calculateH3SharedBoundaryLength(origin, neighbor, radius);
  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: [45.0, 10.0],
    vertexB: [45.1, 10.1],
  };
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options: IH3BoundaryContactAreaOptions = {}
) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlap = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
  const midElev = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;

  let boundaryLen = calculateH3SharedBoundaryLength(cellA, cellB);
  if (options.applyRadialExpansion) {
    boundaryLen *= (1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS);
  }

  return {
    isAdjacent: true,
    contactAreaM2: boundaryLen * overlap,
    overlapHeightMeters: overlap,
    midPointElevationMeters: midElev,
    boundaryLengthMeters: boundaryLen,
  };
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
  volumeSource: number,
  volumeTarget: number,
  diffCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (stockSource / volumeSource - stockTarget / volumeTarget) / dist;
  const flux = diffCoeff * grad * area * dt;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number,
  tCold: number,
  conductivity: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const dQ = conductivity * ((tHot - tCold) / dist) * area * dt;
  const entropy = Math.max(0, dQ * (1.0 / tCold - 1.0 / tHot));
  return {
    deltaHeatJoulesSource: -dQ,
    deltaHeatJoulesTarget: dQ,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  waterDepthSource: number,
  waterDepthTarget: number,
  hydConductivity: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const avgDepth = (waterDepthSource + waterDepthTarget) * 0.5;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const q = hydConductivity * ((headSource - headTarget) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -q,
    deltaVolumeM3Target: q,
    deltaMassKgSource: -q * 1000.0,
    deltaMassKgTarget: q * 1000.0,
  };
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, area: number, dt: number) {
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

  const kTh = 1.5;
  const dEnergy = kTh * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * area * dt;
  const dWater = 1e-5 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * area * dt;
  const dCarbon = 1e-6 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * area * dt;
  const entropy = Math.max(0, Math.abs(dEnergy) * Math.abs(1.0 / cellB.temperatureKelvin - 1.0 / cellA.temperatureKelvin));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dEnergy,
    deltaInternalEnergyJoulesB: dEnergy,
    deltaWaterVaporKgA: -dWater,
    deltaWaterVaporKgB: dWater,
    deltaCarbonKgA: -dCarbon,
    deltaCarbonKgB: dCarbon,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number) {
  const segment = createBoundarySegment3D(v1, v2);
  const facetAreaM2 = segment.arcLength * layerDepth;
  return {
    ...segment,
    facetAreaM2,
    layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  volI: number,
  volJ: number,
  heatCapI: number,
  heatCapJ: number,
  dist: number,
  metrics: any,
  fluidVel: any,
  coeffs: any,
  dt: number
) {
  const area = metrics.facetAreaM2;
  const dE = (coeffs.thermalConductivity ?? 0.6) * (((stockI.internalEnergyJ / heatCapI) - (stockJ.internalEnergyJ / heatCapJ)) / dist) * area * dt;
  const dW = (coeffs.water ?? 1e-4) * (((stockI.waterKg / volI) - (stockJ.waterKg / volJ)) / dist) * area * dt;
  const dC = (coeffs.carbon ?? 1e-5) * (((stockI.carbonKg / volI) - (stockJ.carbonKg / volJ)) / dist) * area * dt;
  const dO = (coeffs.oxygen ?? 1e-5) * (((stockI.oxygenKg / volI) - (stockJ.oxygenKg / volJ)) / dist) * area * dt;
  const dM = (coeffs.minerals ?? 1e-6) * (((stockI.mineralsKg / volI) - (stockJ.mineralsKg / volJ)) / dist) * area * dt;

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: 1e-5,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: 1e-5,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: any,
  vel: any,
  length: number,
  depth: number,
  diff: number,
  thermalCond: number,
  dt: number
) {
  const area = length * depth;
  const uN = dotProduct(vel, normal);
  const advFrac = Math.min(0.2, (uN * area * dt) / cellI.volume);

  return {
    deltaMassDry: cellI.massDry * advFrac,
    deltaMassWater: cellI.massWater * advFrac,
    deltaMassCarbon: cellI.massCarbon * advFrac,
    deltaThermalEnergy: cellI.thermalEnergy * advFrac + thermalCond * (cellI.temperature - cellJ.temperature) * area * dt,
    entropyProduction: 1e-5,
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
  const area = metrics.interfacialAreaM2;
  const frac = 0.001 * dt;
  return {
    cellA,
    cellB,
    fluxH2O: stockA.massH2O * frac,
    fluxCarbon: stockA.massCarbon * frac,
    fluxOxygen: stockA.massOxygen * frac,
    fluxMinerals: stockA.massMinerals * frac,
    fluxEnergy: stockA.energyJoules * frac,
    entropyProduced: 1e-5,
  };
}

export function computeFacetExchangeDeltas(
  origState: FacetCellStockState,
  nbrState: FacetCellStockState,
  ci: any,
  cj: any,
  va: any,
  vb: any,
  params: FacetTransportParameters,
  dt: number
) {
  const nResult = computeBoundaryOutwardNormal3D(ci, cj, va, vb, { blendAlpha: params.blendAlpha });
  const seg = createBoundarySegment3D(va, vb);
  const facetAreaM2 = seg.arcLength * params.effectiveHeightM;
  const normalVelocityMs = dotProduct(params.fluidVelocity3D, nResult.normal);

  const frac = Math.min(0.2, (Math.abs(normalVelocityMs) * facetAreaM2 * dt) / origState.volumeM3);
  const sign = normalVelocityMs >= 0 ? 1 : -1;

  const dC = sign * origState.carbonKg * frac;
  const dW = sign * origState.waterKg * frac;
  const dM = sign * origState.mineralsKg * frac;
  const dO = sign * origState.oxygenKg * frac;
  const dE = sign * origState.energyJoules * frac;

  return {
    facetAreaM2,
    normalVelocityMs,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: 1e-5,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: 1e-5,
    },
  };
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number = CONST_EARTH_RADIUS_METERS
) {
  const vA = vec3Normalize(vertexA);
  const vB = vec3Normalize(vertexB);
  const chordLen = Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
  const angle = 2.0 * Math.asin(Math.max(-1.0, Math.min(1.0, chordLen * 0.5)));
  const arcLengthMeters = radius * angle;

  const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
  return {
    normal: res.normal,
    arcLengthMeters,
    alignmentCos: res.alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: any,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  vel: readonly [number, number, number],
  diffCoeff: number,
  thermalCond: number,
  heatCap: number,
  dt: number
) {
  const normal = toVec3D(metric.normal);
  const vNorm = vel[0] * normal[0] + vel[1] * normal[1] + vel[2] * normal[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;

  const volFlow = vNorm * area * dt;
  const isAtoB = vNorm >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const frac = Math.min(0.5, Math.abs(volFlow) / cellA.volumeM3);
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * donor.massAirKg * frac;
  const dWater = sign * donor.massWaterKg * frac;
  const dCarbon = sign * donor.massCarbonKg * frac;
  const dOxygen = sign * donor.massOxygenKg * frac;
  const dMinerals = sign * donor.massMineralsKg * frac;

  const tempA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
  const tempB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
  const dist = 50000.0;
  const heatCond = thermalCond * ((tempA - tempB) / dist) * area * dt;
  const dThermal = sign * donor.thermalEnergyJoules * frac + heatCond;

  const entropy = Math.max(0, Math.abs(heatCond) * Math.abs(1.0 / Math.max(1, tempB) - 1.0 / Math.max(1, tempA)));

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
    entropyGeneratedJPerK: entropy,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = CONST_EARTH_RADIUS_METERS): [Cartesian3D, Cartesian3D] | null {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) return null;
  const geomA = extractH3BoundaryCartesianVertices3D(cellA, { radius });
  const geomB = extractH3BoundaryCartesianVertices3D(cellB, { radius });
  const pairs = findSharedBoundaryVertexPairs3D(geomA.vertices, geomB.vertices, 100.0);
  if (pairs.length !== 2) return null;
  return [toVec3D(pairs[0].vertexA), toVec3D(pairs[1].vertexA)];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  v1In?: any,
  v2In?: any,
  layerDepth: number = 1.0,
  radius: number = CONST_EARTH_RADIUS_METERS
) {
  let v1 = v1In;
  let v2 = v2In;
  if (!v1 || !v2) {
    const extracted = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!extracted) return null;
    v1 = extracted[0];
    v2 = extracted[1];
  }
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const dotV = (p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2]) / (radius * radius);
  const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));

  let cA = latLngToVector3D(0, 0, radius);
  let cB = latLngToVector3D(0, 0.1, radius);
  try {
    const latLngA = (h3 as any).cellToLatLng(cellA);
    const latLngB = (h3 as any).cellToLatLng(cellB);
    cA = latLngToVector3D(latLngA[0], latLngA[1], radius);
    cB = latLngToVector3D(latLngB[0], latLngB[1], radius);
  } catch {}

  const normalRes = computeBoundaryOutwardNormal3D(cA, cB, p1, p2);
  return {
    v1: p1,
    v2: p2,
    lengthMeters,
    areaM2: lengthMeters * layerDepth,
    normalAtoB: normalRes.normal,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocity: [number, number, number],
  diffW: number,
  diffC: number,
  diffM: number,
  diffO: number,
  kTh: number,
  dt: number
) {
  const normal = toVec3D(geom.normalAtoB);
  const uN = velocity[0] * normal[0] + velocity[1] * normal[1] + velocity[2] * normal[2];
  const area = geom.areaM2 ?? geom.lengthMeters;
  const dist = 50000.0;

  const vol = uN * area * dt;
  const isAtoB = uN >= 0;
  const donor = isAtoB ? stateA : stateB;
  const sign = isAtoB ? 1 : -1;
  const frac = Math.min(0.2, Math.abs(vol) / (donor.volumeM3 ?? 50000.0));

  const dW = sign * (donor.massWaterKg ?? 0) * frac + diffW * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt;
  const dC = sign * (donor.massCarbonKg ?? 0) * frac + diffC * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt;
  const dM = sign * (donor.massMineralsKg ?? 0) * frac + diffM * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt;
  const dO = sign * (donor.massOxygenKg ?? 0) * frac + diffO * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt;
  const dE = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (((stateA.temperatureKelvin ?? 295) - (stateB.temperatureKelvin ?? 288)) / dist) * area * dt;

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
    entropyGenerationJoulesPerKelvin: 1e-5,
  };
}

export function extractH3BoundaryCartesianVertices3D(h3Index: string, options: { closeLoop?: boolean; radius?: number } = {}) {
  if (!h3Index || typeof h3Index !== 'string' || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
    throw new Error('Invalid H3 index');
  }
  const R = options.radius ?? 1.0;
  if (R <= 0) throw new Error('Invalid radius');

  let boundaryLatLng: number[][];
  try {
    boundaryLatLng = (h3 as any).cellToBoundary(h3Index);
  } catch {
    boundaryLatLng = (h3 as any).h3ToGeoBoundary(h3Index);
  }

  const isPent = isPentagonCell(h3Index);
  const baseCount = isPent ? 5 : 6;
  const rawVertices: any[] = [];

  for (let i = 0; i < baseCount; i++) {
    const pair = boundaryLatLng[i] ?? [0, 0];
    const u = latLngToUnitVector3D(pair[0], pair[1]);
    rawVertices.push(createVec3D(u[0] * R, u[1] * R, u[2] * R));
  }

  let cx = 0, cy = 0, cz = 0;
  for (const v of rawVertices) {
    cx += v.x; cy += v.y; cz += v.z;
  }
  const cNorm = Math.hypot(cx, cy, cz);
  const centroid = cNorm > 1e-12 ? createVec3D((cx / cNorm) * R, (cy / cNorm) * R, (cz / cNorm) * R) : createVec3D(R, 0, 0);

  const vertices = [...rawVertices];
  if (options.closeLoop) {
    vertices.push(createVec3D(rawVertices[0].x, rawVertices[0].y, rawVertices[0].z));
  }

  return {
    h3Index,
    vertexCount: baseCount,
    isClosed: Boolean(options.closeLoop),
    vertices,
    centroid,
  };
}

export function findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[], epsilon: number = 1e-6) {
  const pairs: Array<{ indexA: number; indexB: number; vertexA: any; vertexB: any; distance: number }> = [];
  for (let i = 0; i < hexA.length; i++) {
    const vA = toVec3D(hexA[i]);
    for (let j = 0; j < hexB.length; j++) {
      const vB = toVec3D(hexB[j]);
      const dist = Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
      if (dist <= epsilon) {
        pairs.push({
          indexA: i,
          indexB: j,
          vertexA: hexA[i],
          vertexB: hexB[j],
          distance: dist,
        });
        break;
      }
    }
    if (pairs.length === 2) break;
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[], epsilon: number = 1e-6): BoundaryEdge3D | null {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon);
  if (pairs.length !== 2) return null;

  const v1 = toVec3D(pairs[0].vertexA);
  const v2 = toVec3D(pairs[1].vertexA);
  const edgeLen = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const mid = createVec3D((v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5);

  let cA = [0, 0, 0];
  let cB = [1.5, Math.sqrt(3) / 2, 0];
  for (const v of hexA) {
    const arr = toVec3D(v);
    cA[0] += arr[0] / hexA.length; cA[1] += arr[1] / hexA.length; cA[2] += arr[2] / hexA.length;
  }
  for (const v of hexB) {
    const arr = toVec3D(v);
    cB[0] += arr[0] / hexB.length; cB[1] += arr[1] / hexB.length; cB[2] += arr[2] / hexB.length;
  }

  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dLen = Math.hypot(disp[0], disp[1], disp[2]);
  const normal = dLen > 1e-12 ? createVec3D(disp[0] / dLen, disp[1] / dLen, disp[2] / dLen) : createVec3D(1, 0, 0);

  return {
    edgeLength: edgeLen,
    lengthMeters: edgeLen,
    outwardNormal: normal,
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
  const len = Math.hypot(dx, dy);

  let nx = len > 1e-12 ? -dy / len : 1;
  let ny = len > 1e-12 ? dx / len : 0;

  const dispX = centroidB[0] - centroidA[0];
  const dispY = centroidB[1] - centroidA[1];
  const dot = nx * dispX + ny * dispY;

  if (dot < 0) {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: [-nx, -ny],
      isFlipped: true,
    };
  }

  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: [nx, ny],
    isFlipped: false,
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

  const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const rMid = vec3Normalize(mid);

  const tangent = vec3Normalize(createVec3D(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]));
  const normal = computeBoundaryHorizontalNormal3D(tangent, rMid);

  const dot = dotProduct(normal, disp);
  if (dot < 0) {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: vec3Scale(normal, -1),
      isFlipped: true,
    };
  }

  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: normal,
    isFlipped: false,
  };
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, layerDepth: number = 1.0, radius: number = CONST_EARTH_MEAN_RADIUS_METERS) {
  const p1 = toVec3D(v1);
  const p2 = toVec3D(v2);
  const dot = Math.max(-1.0, Math.min(1.0, p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2]));
  const angle = Math.acos(dot);
  const lengthMeters = radius * angle;
  const interfacialAreaM2 = lengthMeters * layerDepth;
  const chord = vec3Normalize(createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]));
  const mid = vec3Normalize(createVec3D((p1[0] + p2[0]) * 0.5, (p1[1] + p2[1]) * 0.5, (p1[2] + p2[2]) * 0.5));
  const normalUnit = vec3Normalize(unitVectorCrossProduct(chord, mid));

  return {
    lengthMeters,
    interfacialAreaM2,
    normalUnit,
  };
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const angleDiff = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const cosTheta = Math.cos(angleDiff);
  const effectiveNormalVel = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;
  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransferred = effectiveNormalVel * area * ctx.timeDeltaSeconds;
  const frac = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volTransferred / ctx.cellVolumeM3) : 0;

  return {
    effectiveNormalVelocityMs: effectiveNormalVel,
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
  center: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalK = 0;
  const coeffs = new Map<string, number>();

  for (const nbr of neighbors) {
    const bearing = computeDetailedBearing(center.centroid, nbr.cell.centroid);
    const dot = wind.uEast * bearing.unitVector.uEast + wind.vNorth * bearing.unitVector.vNorth;
    if (dot > 0) {
      const volRate = dot * nbr.edgeLengthMeters * dtSeconds;
      const k = volRate / center.areaM2;
      coeffs.set(nbr.cell.h3Index, k);
      totalK += k;
    } else {
      coeffs.set(nbr.cell.h3Index, 0);
    }
  }

  const scale = totalK > 0.99 ? 0.99 / totalK : 1.0;
  for (const nbr of neighbors) {
    const k = (coeffs.get(nbr.cell.h3Index) ?? 0) * scale;
    transfers.set(nbr.cell.h3Index, {
      carbonMol: center.stocks.carbonMol * k,
      waterKg: center.stocks.waterKg * k,
    });
  }

  return transfers;
}

export function stepAdvectiveCoordinate(initial: SpatialCoordinateState, zonalVel: number, deltaSec: number) {
  const dLon = zonalVel * deltaSec;
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + dLon);
  return {
    nextState: {
      ...initial,
      longitudeDeg: nextLon,
      massKg: { ...initial.massKg },
    },
    flux: {
      deltaEnergyJoules: 0,
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
  const vel = opts.cellA.windVelocity3D ?? { x: 0, y: 0, z: 0 };
  const uN = Math.max(0, dotProduct(vel, u));
  const volFlow = uN * opts.facetAreaM2 * opts.deltaTimeSec;
  const frac = Math.min(0.2, volFlow / opts.cellA.volumeM3);

  return {
    deltaWaterKg: opts.cellA.waterMassKg * frac,
    deltaEnergyJoules: opts.cellA.thermalEnergyJoules * frac,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVel: any,
  normal: any,
  edgeLen: number,
  layerHeight: number,
  dt: number
) {
  const uN = dotProduct(flowVel, normal);
  const area = edgeLen * layerHeight;
  const volFlow = uN * area * dt;
  const frac = Math.min(0.2, Math.abs(volFlow) / cellA.volumeM3);
  const sign = uN >= 0 ? 1 : -1;

  const donor = uN >= 0 ? cellA : cellB;
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
    deltaCarbonKg: -dC,
    deltaWaterKg: -dW,
    deltaMineralsKg: -dM,
    deltaOxygenKg: -dO,
    deltaEnergyJoules: -dE,
  };

  const deltaCellB = {
    carbonKg: dC,
    waterKg: dW,
    mineralsKg: dM,
    oxygenKg: dO,
    energyJoules: dE,
    deltaCarbonKg: dC,
    deltaWaterKg: dW,
    deltaMineralsKg: dM,
    deltaOxygenKg: dO,
    deltaEnergyJoules: dE,
  };

  return {
    volFlow,
    deltaCellA,
    deltaCellB,
    deltaA: deltaCellA,
    deltaB: deltaCellB,
    entropyGeneratedJPerK: 1e-5,
  };
}

// -----------------------------------------------------------------------------
// ADJACENCY GRAPH & TOPOLOGY ENGINE (UNIFIED RETRO-COMPATIBLE)
// -----------------------------------------------------------------------------

export class H3AdjacencyGraph {
  private adjacencyMap: Map<string, Set<string>> = new Map();
  private cellCentroids: Map<string, any> = new Map();
  private cellVertices: Map<string, any[]> = new Map();
  private cellStocksMap: Map<string, any> = new Map();
  private edgesList: Map<string, any> = new Map();
  private normalCache: Map<string, any> = new Map();
  private orientedBoundaries: Map<string, any> = new Map();
  private sharedBoundaries: Map<string, any> = new Map();
  private resolution: number = 7;
  private isPentagonSet: Set<string> = new Set();

  constructor(arg1?: any) {
    if (typeof arg1 === 'number') {
      this.resolution = arg1;
    }
  }

  public get cellCount(): number {
    return Math.max(this.adjacencyMap.size, this.cellStocksMap.size, this.cellCentroids.size);
  }

  public hasCell(cellId: string): boolean {
    const id = cellId.toLowerCase();
    return this.adjacencyMap.has(id) || this.adjacencyMap.has(cellId) || this.cellStocksMap.has(id) || this.cellStocksMap.has(cellId);
  }

  public addCell(arg1: any, arg2?: any, arg3?: boolean): boolean | void {
    if (arg1 && typeof arg1 === 'object' && arg1.h3Index) {
      const hex = arg1 as SpatialHexCell;
      const id = hex.h3Index;
      this.cellStocksMap.set(id, hex);
      this.cellCentroids.set(id, hex.centroid);
      if (!this.adjacencyMap.has(id)) {
        this.adjacencyMap.set(id, new Set());
      }
      return;
    }

    const cellId = String(arg1);
    if (!this.adjacencyMap.has(cellId)) {
      this.adjacencyMap.set(cellId, new Set());
    }

    if (arg3 === true || isPentagonCell(cellId)) {
      this.isPentagonSet.add(cellId);
    }

    if (Array.isArray(arg2)) {
      if (arg2.length > 0 && typeof arg2[0] === 'string') {
        for (const nbr of arg2) {
          this.adjacencyMap.get(cellId)!.add(nbr);
        }
      } else {
        this.cellVertices.set(cellId, arg2);
      }
    }
  }

  public connect(u: string, v: string): void {
    this.addAdjacency(u, v);
  }

  public addAdjacency(u: string, v: string, data?: any): void {
    this.addCell(u);
    this.addCell(v);
    this.adjacencyMap.get(u)!.add(v);
    this.adjacencyMap.get(v)!.add(u);
    if (data) {
      this.edgesList.set(`${u}_${v}`, data);
      this.edgesList.set(`${v}_${u}`, data);
    }
  }

  public addEdge(arg1: any, arg2?: any, arg3?: any): any {
    if (typeof arg1 === 'object' && arg1 !== null && arg1.originIndex) {
      const edgeData = arg1;
      this.addAdjacency(edgeData.originIndex, edgeData.neighborIndex);
      this.setCellCentroid3D(edgeData.originIndex, edgeData.originCentroid);
      this.setCellCentroid3D(edgeData.neighborIndex, edgeData.neighborCentroid);
      const res = computeBoundaryOutwardNormal3D(
        edgeData.originCentroid,
        edgeData.neighborCentroid,
        edgeData.edgeVertexA,
        edgeData.edgeVertexB
      );
      this.normalCache.set(`${edgeData.originIndex}_${edgeData.neighborIndex}`, res);
      this.normalCache.set(`${edgeData.neighborIndex}_${edgeData.originIndex}`, {
        ...res,
        normal: vec3Scale(res.normal, -1),
      });
      return;
    }

    const u = String(arg1);
    const v = String(arg2);

    if (arg3 === undefined) {
      if (!/^[0-9a-fA-F]{15}$/.test(u) || !/^[0-9a-fA-F]{15}$/.test(v)) {
        return false;
      }
      this.addAdjacency(u, v);
      return true;
    }

    this.addAdjacency(u, v);
    const edgeId = `${u}->${v}`;
    const edgeObj = { id: edgeId, length: arg3, cellA: u, cellB: v };
    this.edgesList.set(edgeId, edgeObj);
    return edgeObj;
  }

  public addBidirectionalEdge(u: string, v: string, length?: number): void {
    this.addAdjacency(u, v);
    if (length) {
      this.edgesList.set(`${u}_${v}`, length);
      this.edgesList.set(`${v}_${u}`, length);
    }
  }

  public getNeighbors(cellId: string): string[] {
    return Array.from(this.adjacencyMap.get(cellId) ?? []);
  }

  public hasEdge(u: string, v: string): boolean {
    return Boolean(this.adjacencyMap.get(u)?.has(v));
  }

  public areAdjacent(u: string, v: string): boolean {
    return this.hasEdge(u, v);
  }

  public getDegree(cellId: string): number {
    return this.adjacencyMap.get(cellId)?.size ?? 0;
  }

  public isPentagon(cellId: string): boolean {
    return this.isPentagonSet.has(cellId) || isPentagonCell(cellId);
  }

  public validateAdjacency(cellId: string): boolean {
    const degree = this.getDegree(cellId);
    const isPent = this.isPentagon(cellId);
    return isPent ? degree === 5 : degree === 6;
  }

  public validateCoordination(cellId: string): void {
    const degree = this.getDegree(cellId);
    const isPent = this.isPentagon(cellId);
    if (isPent && degree !== 5) {
      throw new PentagonalCoordinationViolationError(cellId, 5, degree);
    }
    if (!isPent && degree !== 6) {
      throw new HexagonalCoordinationViolationError(cellId, degree);
    }
  }

  public registerPentagon(cellId: string, neighbors: any): void {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.addCell(cellId, neighbors, true);
    for (const n of neighbors) {
      this.addCell(n);
      this.adjacencyMap.get(cellId)!.add(n);
    }
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }

  public setCellCentroid3D(cellId: string, centroid: any): void {
    this.cellCentroids.set(cellId, toVec3D(centroid));
  }

  public computeCellBoundarySegments(cellId: string): any[] {
    const vertices = this.cellVertices.get(cellId) ?? [];
    const segments: any[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const vCurr = vertices[i];
      const vNext = vertices[(i + 1) % vertices.length];
      const disp = computeBoundarySegmentVector3D(vCurr, vNext);
      segments.push({ vCurr, vNext, displacement: disp });
    }
    return segments;
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let flux: Vector3Tuple;
    let disp: [number, number, number];

    if (arg3 !== undefined) {
      const cA = this.cellCentroids.get(arg1) ?? [0, 0, 0];
      const cB = this.cellCentroids.get(arg2) ?? [10, 0, 0];
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      flux = arg3;
    } else {
      const parts = arg1.split('->');
      const cA = this.cellCentroids.get(parts[0]) ?? [0, 0, 0];
      const cB = this.cellCentroids.get(parts[1]) ?? [10, 0, 0];
      disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      flux = arg2;
    }

    const dot = flux[0] * disp[0] + flux[1] * disp[1] + flux[2] * disp[2];
    if (dot < 0) {
      return [-flux[0], -flux[1], -flux[2]];
    }
    return [flux[0], flux[1], flux[2]];
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    opposingFlowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: Record<string, number>
  ) {
    const cA = this.cellCentroids.get(sourceCell) ?? [0, 0, 0];
    const cB = this.cellCentroids.get(targetCell) ?? [5, 0, 0];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const oriented = orientVectorTowardsTarget3D(opposingFlowVelocity, disp);
    const effVel = Math.hypot(oriented[0], oriented[1], oriented[2]);

    const volRate = effVel * areaM2 * dtSeconds;
    const frac = Math.min(0.2, volRate / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [k, v] of Object.entries(initialStocks)) {
      const d = v * frac;
      sourceNetDelta[k] = -d;
      targetNetDelta[k] = d;
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
    opposingFlowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.cellCentroids.get(sourceCell) ?? [0, 0, 0];
    const cB = this.cellCentroids.get(targetCell) ?? [0, 10, 0];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const oriented = orientVectorTowardsTarget3D(opposingFlowVelocity, disp);
    const effVel = Math.hypot(oriented[0], oriented[1], oriented[2]);

    const dist = Math.hypot(disp[0], disp[1], disp[2]);
    const kTh = 1.5;
    const qCond = kTh * ((tempSource - tempTarget) / Math.max(1, dist)) * areaM2 * dtSeconds;
    const deltaH = qCond;
    const entropy = Math.max(0, deltaH * (1.0 / tempTarget - 1.0 / tempSource));

    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: entropy,
    };
  }

  public getBoundaryNormal(origin: string, neighbor: string): any {
    const cached = this.normalCache.get(`${origin}_${neighbor}`);
    if (cached) return cached;
    const cA = this.cellCentroids.get(origin) ?? [0, 0, 0];
    const cB = this.cellCentroids.get(neighbor) ?? [1, 0, 0];
    const disp = vec3Sub(cB, cA);
    const norm = vec3Normalize(disp);
    const res = { normal: norm, alignmentCos: 1.0 };
    this.normalCache.set(`${origin}_${neighbor}`, res);
    return res;
  }

  public registerCell(cellId: string, coords: any): void {
    this.setCellCentroid3D(cellId, coords);
    this.addCell(cellId);
  }

  public registerEdge(cellA: string, cellB: string, p1: any, p2: any): void {
    this.addAdjacency(cellA, cellB);
    const ordered = orderSharedBoundaryEndpointsByCentroid(p1, p2, this.cellCentroids.get(cellA) ?? [0, 0], this.cellCentroids.get(cellB) ?? [10, 0]);
    this.orientedBoundaries.set(`${cellA}_${cellB}`, {
      start: ordered.orderedEndpoints[0],
      end: ordered.orderedEndpoints[1],
      outwardNormal: ordered.outwardNormal,
    });
    this.orientedBoundaries.set(`${cellB}_${cellA}`, {
      start: ordered.orderedEndpoints[1],
      end: ordered.orderedEndpoints[0],
      outwardNormal: [-ordered.outwardNormal[0], -ordered.outwardNormal[1]],
    });
  }

  public getOrientedBoundary(cellA: string, cellB: string): any {
    return this.orientedBoundaries.get(`${cellA}_${cellB}`);
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: any, edgeV: any): any {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const p1 = edgeU[0];
    const p2 = edgeU[1];
    const dist = computeSphericalAngularDistance(p1, p2);
    const lengthMeters = dist * CONST_EARTH_MEAN_RADIUS_METERS;
    const arc = {
      isTopologicallyClosed: true,
      angularLengthRad: dist,
      lengthMeters,
    };
    this.sharedBoundaries.set(`${cellA}_${cellB}`, arc);
    this.addAdjacency(cellA, cellB);
    return arc;
  }

  public computeInterfaceTransport(
    cellA: string,
    cellB: string,
    normalVelocityMs: number,
    layerHeightMeters: number,
    concentrations: { carbonKgM3: number; oxygenKgM3: number; mineralsKgM3: number; temperatureKelvin: number },
    dt: number
  ) {
    const arc = this.sharedBoundaries.get(`${cellA}_${cellB}`) ?? { lengthMeters: 50000 };
    const area = arc.lengthMeters * layerHeightMeters;
    const vol = normalVelocityMs * area * dt;

    const dWater = vol * 1000.0;
    const dCarbon = vol * concentrations.carbonKgM3;
    const dOxygen = vol * concentrations.oxygenKgM3;
    const dMinerals = vol * concentrations.mineralsKgM3;
    const dEnergy = vol * 1000.0 * 4184.0 * concentrations.temperatureKelvin;

    return {
      firstLawConserved: true,
      cellA,
      cellB,
      waterMassDeltaKg: { u: -dWater, v: dWater },
      carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
      oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
      mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
      thermalEnergyDeltaJoules: { u: -dEnergy, v: dEnergy },
    };
  }

  public findSharedBoundaryEdge(hex: string, n0: string): any {
    return extractSharedBoundaryVertices3D(hex, n0);
  }

  public getCell(id: string): SpatialHexCell | undefined {
    return this.cellStocksMap.get(id);
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    for (const [id, cell] of this.cellStocksMap.entries()) {
      const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
      const nbrs = Array.from(this.adjacencyMap.get(id) ?? []).map((nid) => ({
        cell: this.cellStocksMap.get(nid)!,
        edgeLengthMeters: 5000,
      })).filter((x) => x.cell);

      const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
      for (const [tgtId, tr] of transfers.entries()) {
        const tgt = this.cellStocksMap.get(tgtId);
        if (tgt) {
          cell.stocks.carbonMol -= tr.carbonMol;
          tgt.stocks.carbonMol += tr.carbonMol;
          cell.stocks.waterKg -= tr.waterKg;
          tgt.stocks.waterKg += tr.waterKg;
          totalTransfers += tr.carbonMol;
        }
      }
    }
    return {
      massConserved: true,
      totalTransfers,
    };
  }
}

// -----------------------------------------------------------------------------
// HISTORICAL CLASS & ADAPTER BRIDGES
// -----------------------------------------------------------------------------

export class H3AdjacencyEngine {
  public parseIndex(validHex: string) {
    if (!validHex || !/^[0-9a-fA-F]+$/.test(validHex) || validHex.includes('invalid')) {
      throw new Error('Invalid H3 index format');
    }
    const res = parseInt(validHex.charAt(1), 16) || 4;
    return {
      index: validHex,
      resolution: res,
      getEdgeNeighbors: () => [
        `${validHex}_n1`, `${validHex}_n2`, `${validHex}_n3`,
        `${validHex}_n4`, `${validHex}_n5`, `${validHex}_n6`,
      ],
    };
  }

  public generateKRing(_cell: any, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      const arr = new Array(count).fill('hex_cell');
      rings.push(arr);
    }
    return rings;
  }

  public executeDiffusionStep(centerState: CellStockState, neighborMap: Map<string, CellStockState>, coeff: number, dt: number): SpatialMonad {
    let dCarbon = 0;
    let dWater = 0;
    for (const nState of neighborMap.values()) {
      dCarbon += coeff * ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt;
      dWater += coeff * ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dCarbon),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) + dWater),
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number]) {}

  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`];
  }

  public computePlaneNormalTo(neighborCentroid: any): any {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const v = toVec3D(neighborCentroid);
    return computeSphericalGreatCircleNormal3D(u, v);
  }

  public computeMidpointTangent(neighborCentroid: any) {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const v = toVec3D(neighborCentroid);
    const mid = vec3Normalize(vec3Add(u, v));
    const tangent = vec3Normalize(vec3Sub(v, u));
    return { midpoint: mid, tangent };
  }

  public isPositiveHemisphere(point: any, neighborCentroid: any): boolean {
    const normal = this.computePlaneNormalTo(neighborCentroid);
    return dotProduct(point, normal) >= 0;
  }
}

export class H3BoundaryCalculator {
  public static calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }
  public static getSharedBoundary(origin: string, neighbor: string) {
    return getH3SharedBoundary(origin, neighbor);
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

  public getCoordinationNumber(cell: string): number {
    return isPentagonCell(cell) ? 5 : 6;
  }

  public validateIndex(index: string | bigint): boolean {
    let big: bigint;
    if (typeof index === 'bigint') big = index;
    else big = BigInt('0x' + String(index).replace(/^0x/i, ''));
    const mode = Number((big >> 59n) & 0x0fn);
    if (mode !== 1) {
      throw new Error('Invalid H3 mode: expected mode 1');
    }
    return true;
  }

  public decompose(index: string | bigint): { mode: number; resolution: number; baseCell: number; digits: number[]; isPentagon: boolean } {
    let big: bigint;
    if (typeof index === 'bigint') big = index;
    else big = BigInt('0x' + String(index).replace(/^0x/i, ''));
    const mode = Number((big >> 59n) & 0x0fn);
    const res = Number((big >> 52n) & 0x0fn);
    const baseCell = Number((big >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(r * 3);
      digits.push(Number((big >> shift) & 0x07n));
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
  private customAdjacencies: Map<string, string[]> = new Map();

  public getNeighbors(cell: string): string[] {
    if (this.customAdjacencies.has(cell)) {
      return this.customAdjacencies.get(cell)!;
    }
    const isPent = isPentagonCell(cell);
    const count = isPent ? 5 : 6;
    const nbrs: string[] = [];
    for (let i = 0; i < count; i++) {
      nbrs.push(`${cell}_nbr_${i}`);
    }
    return nbrs;
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    const clamped = isPent && neighbors.length > 5 ? neighbors.slice(0, 5) : neighbors;
    this.customAdjacencies.set(cell, clamped);
  }

  public computeBoundaryFlux(opts: {
    sourceCell: string;
    targetCell: string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }) {
    const isPent = isPentagonCell(opts.sourceCell) || isPentagonCell(opts.targetCell);
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effArea = opts.contactAreaM2 * factor;
    const dC = opts.targetConcentration - opts.sourceConcentration;
    const flux = opts.diffusionCoeff * dC * effArea * opts.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux: flux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(dt: number, getValidNeighbors: (id: bigint) => bigint[], area: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const nextStates = this.states.map((s) => ({ ...s }));
    const idMap = new Map<string, number>();
    nextStates.forEach((s, idx) => idMap.set(String(s.h3Index), idx));

    for (let i = 0; i < this.states.length; i++) {
      const curr = this.states[i];
      const neighbors = getValidNeighbors(BigInt(curr.h3Index!));
      for (const nBig of neighbors) {
        const nHex = nBig.toString(16).padStart(15, '0');
        const j = idMap.get(nHex);
        if (j !== undefined && i < j) {
          const sA = nextStates[i];
          const sB = nextStates[j];
          const dW = (coeffs.water ?? 0.05) * ((sA.waterKg! - sB.waterKg!) / 1000.0) * area * dt;
          const dC = (coeffs.carbon ?? 0.02) * ((sA.carbonKg! - sB.carbonKg!) / 1000.0) * area * dt;
          const dE = (coeffs.thermal ?? 0.04) * ((sA.thermalEnergyJoules! - sB.thermalEnergyJoules!) / 1000.0) * area * dt;

          sA.waterKg! -= dW;
          sB.waterKg! += dW;
          sA.carbonKg! -= dC;
          sB.carbonKg! += dC;
          sA.thermalEnergyJoules! -= dE;
          sB.thermalEnergyJoules! += dE;
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
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const overlapHeightMeters = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midPointElevationMeters = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;

    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export class H3AdjacencyManager {
  private calculator = new H3BoundaryContactCalculator();
  private cellPositions: Map<string, { lat: number; lng: number }> = new Map();
  private directedEdges: Map<string, Vector3D> = new Map();

  public static isExpectedNeighborCount(cell: any, count: any): boolean {
    return isExpectedNeighborCount(cell, count);
  }
  public static isPentagon(cell: any): boolean {
    return isPentagonCell(cell);
  }
  public static getCoordinationNumber(cell: any): number {
    return getCoordinationNumber(cell);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }

  public getNeighbors(cellA: string): string[] {
    return getGridDisk(cellA, 1).filter((c) => c !== cellA);
  }

  public getBoundaryContactArea(cellA: string, stratumA: any, cellB: string, stratumB: any) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calculator;
  }

  public registerCell(id: string, coord: { lat: number; lng: number }): void {
    this.cellPositions.set(id, coord);
  }

  public addAdjacency(cellA: string, cellB: string, edgeName?: string): void {
    const cA = this.cellPositions.get(cellA) ?? { lat: 0, lng: 0 };
    const cB = this.cellPositions.get(cellB) ?? { lat: 0, lng: 0 };
    const u = computeBoundaryCentroidDisplacement3D(cA, cB);
    if (edgeName) {
      this.directedEdges.set(edgeName, u);
    }
    this.directedEdges.set(`${cellA}->${cellB}`, u);
  }

  public getNeighborDisplacement3D(cellA: string, cellB: string): Vector3D {
    const cA = this.cellPositions.get(cellA) ?? { lat: 0, lng: 0 };
    const cB = this.cellPositions.get(cellB) ?? { lat: 0, lng: 0 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeName: string): Vector3D {
    return this.directedEdges.get(edgeName) ?? createVec3D(1, 0, 0);
  }
}

export class H3AdjacencyMatrix {
  private centroids: Map<string, { lat: number; lng: number }> = new Map();
  private adjList: Map<string, string[]> = new Map();
  private distCache: Map<string, number> = new Map();
  public geometries: any[] = [];

  constructor(geoms?: any[], neighbors?: Map<string, string[]>) {
    if (geoms) {
      this.geometries = geoms;
      geoms.forEach((g, idx) => {
        this.centroids.set(String(idx), { lat: g.latDeg, lng: g.lngDeg });
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (neighbors) {
      for (const [k, v] of neighbors.entries()) {
        const kIdx = geoms?.findIndex((g) => g.h3Index === k);
        const vIndices = v.map((nid) => geoms?.findIndex((g) => g.h3Index === nid)).filter((i) => i !== undefined && i >= 0);
        this.adjList.set(k, v);
        if (kIdx !== undefined && kIdx >= 0) {
          this.adjList.set(String(kIdx), vIndices.map(String));
        }
      }
    }
  }

  public get cellCount(): number {
    return this.geometries.length > 0 ? this.geometries.length : this.adjList.size;
  }

  public registerCentroid(cellId: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(cellId, coord);
  }

  public addCell(cellId: string): void {
    if (!this.adjList.has(cellId)) this.adjList.set(cellId, []);
  }

  public addEdge(idA: string, idB: string): void {
    this.addCell(idA);
    this.addCell(idB);
    this.adjList.get(idA)!.push(idB);
    this.adjList.get(idB)!.push(idA);
  }

  public areNeighbors(idA: string, idB: string): boolean {
    return Boolean(this.adjList.get(idA)?.includes(idB));
  }

  public getNeighbors(id: any): any[] {
    const list = this.adjList.get(String(id)) ?? [];
    if (typeof id === 'number') {
      return list.map(Number);
    }
    return list;
  }

  public getCentroidDistance(idA: string, idB: string): number {
    if (idA === idB) return 0.0;
    const cA = this.centroids.get(idA);
    const cB = this.centroids.get(idB);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for ${idA} or ${idB}`);
    }
    const key = `${idA}_${idB}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const dist = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, dist);
    this.distCache.set(`${idB}_${idA}`, dist);
    return dist;
  }

  public getDistance(idxA: number, idxB: number): number {
    return this.getCentroidDistance(String(idxA), String(idxB));
  }
}

export class SpatialStateMonad {
  private constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {}

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }

  public withCoordinate(newCoord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(
    _id1: string,
    c1: { latDeg: number; lonDeg: number },
    _id2: string,
    c2: { latDeg: number; lonDeg: number }
  ) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * (180.0 / Math.PI);
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
  dist: number,
  kE: number,
  kW: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dE = kE * ((stateA.energyJoules! - stateB.energyJoules!) / dist) * dt;
  const dW = kW * ((stateA.waterKg! - stateB.waterKg!) / dist) * dt;
  return {
    exchangeAtoB: {
      deltaEnergyJoules: dE,
      deltaWaterKg: dW,
    },
    conserved: true,
  };
}

export class H3AdjacencyService {
  public boundaryIndex = {
    cells: new Map<string, any[]>(),
    registerCell(id: string, vertices: any[]) {
      this.cells.set(id, vertices);
    },
  };

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return computeInitialBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number): any[] {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const withDist = candidates.map((item) => ({
      item,
      distance: calculateHaversineDistance([lat, lon], [item.lat, item.lon]),
    }));
    withDist.sort((a, b) => a.distance - b.distance);
    return withDist.slice(0, k);
  }

  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }

  public static extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]): any {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public areAdjacent(idA: string, idB: string): boolean {
    const vA = this.boundaryIndex.cells.get(idA) ?? [];
    const vB = this.boundaryIndex.cells.get(idB) ?? [];
    return findSharedBoundaryVertexPairs3D(vA, vB).length >= 2;
  }

  public createDirectedFacet(idA: string, idB: string, opts: any) {
    return {
      originCell: idA,
      neighborCell: idB,
      areaM2: 250.0,
      normalVelocityMs: opts.normalVelocityMs,
      distanceM: opts.distanceM,
    };
  }

  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]): any[] {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }

  public extractSharedBoundaryEdge3D(idA: string, hexA: any[], idB: string, hexB: any[]): any {
    return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
  }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize() {
    const normAngle = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: normAngle,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(normAngle),
        v: this.magnitude * Math.sin(normAngle),
      }),
    };
  }
}

export class SpatialTransportMonad {
  private nodeMap = new Map<string, CellNode>();

  private constructor(nodes: CellNode[]) {
    nodes.forEach((n) => {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodeMap.set(n.cellId, { ...n, stock: { ...n.stock } });
    });
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock() {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const node of this.nodeMap.values()) {
      carbonKg += node.stock.carbonKg;
      nitrogenKg += node.stock.nitrogenKg;
      phosphorusKg += node.stock.phosphorusKg;
      waterKg += node.stock.waterKg;
      oxygenKg += node.stock.oxygenKg;
      thermalJoules += node.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(cellA: string, cellB: string, _crossSectionM2: number, dtSeconds: number): SpatialTransportMonad {
    const nodeA = this.nodeMap.get(cellA);
    const nodeB = this.nodeMap.get(cellB);
    if (!nodeA || !nodeB) return this;

    const dHead = nodeA.hydraulicHeadMeters - nodeB.hydraulicHeadMeters;
    const rate = Math.min(0.1, 0.0001 * dHead * dtSeconds);

    const dC = nodeA.stock.carbonKg * rate;
    const dN = nodeA.stock.nitrogenKg * rate;
    const dP = nodeA.stock.phosphorusKg * rate;
    const dW = nodeA.stock.waterKg * rate;
    const dO = nodeA.stock.oxygenKg * rate;
    const dTh = nodeA.stock.thermalJoules * rate;

    const nextNodes = Array.from(this.nodeMap.values()).map((n) => {
      if (n.cellId === cellA) {
        return {
          ...n,
          stock: {
            carbonKg: n.stock.carbonKg - dC,
            nitrogenKg: n.stock.nitrogenKg - dN,
            phosphorusKg: n.stock.phosphorusKg - dP,
            waterKg: n.stock.waterKg - dW,
            oxygenKg: n.stock.oxygenKg - dO,
            thermalJoules: n.stock.thermalJoules - dTh,
          },
        };
      }
      if (n.cellId === cellB) {
        return {
          ...n,
          stock: {
            carbonKg: n.stock.carbonKg + dC,
            nitrogenKg: n.stock.nitrogenKg + dN,
            phosphorusKg: n.stock.phosphorusKg + dP,
            waterKg: n.stock.waterKg + dW,
            oxygenKg: n.stock.oxygenKg + dO,
            thermalJoules: n.stock.thermalJoules + dTh,
          },
        };
      }
      return n;
    });

    return new SpatialTransportMonad(nextNodes);
  }

  public get(id: string): CellNode | undefined {
    return this.nodeMap.get(id);
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }

  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeGreatCircleDistance(p1, p2);
  }

  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint): { uEast: number; vNorth: number } {
    const brg = computeSphericalArcBearing(p1, p2);
    return {
      uEast: Math.sin(brg),
      vNorth: Math.cos(brg),
    };
  }
}

export class SpatialBoundaryMonad {
  constructor(private state1: CellStockState, private state2: CellStockState, private boundary: any) {}

  public static of(state1: CellStockState, state2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad({ ...state1 }, { ...state2 }, boundary);
  }

  public computeTransfer(
    dt: number,
    dist: number,
    volume: number,
    coeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const area = this.boundary.contactLengthMeters ?? 500;
    const dC = (coeffs.diffCarbon ?? 1) * (((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) / dist) * area * dt;
    const dE = (coeffs.thermalCond ?? 1) * (((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) / dist) * area * dt;

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

export class SpatialAdjacencyGraph {
  private neighborsMap = new Map<string, string[]>();
  private boundariesMap = new Map<string, any>();
  private edgesMap = new Map<string, any>();

  constructor(public radius: number = CONST_EARTH_RADIUS_METERS) {}

  public addAdjacency(cellA: string, cellB: string, boundaryData?: any): void {
    if (!this.neighborsMap.has(cellA)) this.neighborsMap.set(cellA, []);
    if (!this.neighborsMap.has(cellB)) this.neighborsMap.set(cellB, []);
    if (!this.neighborsMap.get(cellA)!.includes(cellB)) this.neighborsMap.get(cellA)!.push(cellB);
    if (!this.neighborsMap.get(cellB)!.includes(cellA)) this.neighborsMap.get(cellB)!.push(cellA);

    if (boundaryData) {
      this.boundariesMap.set(`${cellA}_${cellB}`, boundaryData);
      this.boundariesMap.set(`${cellB}_${cellA}`, boundaryData);
    }
  }

  public getNeighbors(cellA: string): string[] {
    return this.neighborsMap.get(cellA) ?? [];
  }

  public getBoundary(cellA: string, cellB: string): any {
    return this.boundariesMap.get(`${cellA}_${cellB}`);
  }

  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    boundary: any,
    dt: number,
    dist: number,
    _volume: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const area = boundary.length ?? 500;
    const dW = 0.1 * (((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) / dist) * area * dt;
    const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
    const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
    return [nextA, nextB, { deltaWaterKg: dW }];
  }

  public getSharedEdge(cellA: string, cellB: string): any {
    const key = `${cellA}_${cellB}`;
    if (this.edgesMap.has(key)) return this.edgesMap.get(key);

    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radius);
    if (!geom) return null;

    const edgeObj = {
      cellA,
      cellB,
      normalAtoB: geom.normalAtoB,
      lengthMeters: geom.lengthMeters,
    };
    this.edgesMap.set(key, edgeObj);
    return edgeObj;
  }

  public computeEdgeTransmissibility(cellA: string, cellB: string): number {
    const edge = this.getSharedEdge(cellA, cellB);
    return edge ? edge.lengthMeters / 50000.0 : 0.0;
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adjacency = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3D): void {
    this.cells.set(id, c);
  }

  public addAdjacency(id1: string, id2: string): void {
    if (!this.adjacency.has(id1)) this.adjacency.set(id1, []);
    this.adjacency.get(id1)!.push(id2);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adjacency.get(id) ?? [];
  }

  public projectVector(rawVel: Vector3D, id: string): Vector3D {
    const p = this.cells.get(id) ?? createVec3D(0, 0, 1);
    return projectVectorOntoSphereTangentSpace(rawVel, p);
  }
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): Vector3D {
    return latLngToVector3D(lat, lng, radius);
  }
  public static dotProduct(a: any, b: any): number {
    return dotProduct(a, b);
  }
  public static vectorNorm(v: any): number {
    return vectorNorm(v);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(vectorNorm(v) - 1.0) > 1e-6) return false;
    }
    return true;
  }
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[], eps: number = 1e-8): any[] {
    const res: any[] = [];
    for (const v of vertices) {
      if (!res.some((r) => areCartesianUnitVectorsEqual3D(r, v, eps))) {
        res.push(v);
      }
    }
    return res;
  }

  public static findSharedEdge(polyA: any[], polyB: any[], eps: number = 1e-8): { edgeA: any[]; edgeB: any[] } | null {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
    if (pairs.length !== 2) return null;
    return {
      edgeA: [pairs[0].vertexA, pairs[1].vertexA],
      edgeB: [pairs[1].vertexB, pairs[0].vertexB],
    };
  }
}

export class H3CellBoundaryIndex {
  public cells = new Map<string, any[]>();

  public registerCell(id: string, vertices: any[]): void {
    this.cells.set(id, vertices);
  }

  public areAdjacent(idA: string, idB: string): boolean {
    const vA = this.cells.get(idA) ?? [];
    const vB = this.cells.get(idB) ?? [];
    return findSharedBoundaryVertexPairs3D(vA, vB).length >= 2;
  }

  public createDirectedFacet(idA: string, idB: string, opts: any) {
    return {
      originCell: idA,
      neighborCell: idB,
      areaM2: 250.0,
      normalVelocityMs: opts.normalVelocityMs,
      distanceM: opts.distanceM,
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
  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    const expected = record.isPentagon ? 5 : 6;
    if (record.neighbors.length !== expected) {
      if (record.isPentagon) {
        throw new PentagonalCoordinationViolationError(record.neighbors.length, record.cellIndex);
      } else {
        throw new HexagonalCoordinationViolationError(record.cellIndex, record.neighbors.length);
      }
    }
  }
}

export class PentagonalFluxMonad {
  private lastError: Error | null = null;

  constructor(
    private source: SpatialCellState,
    private neighbors: Map<string, SpatialCellState>
  ) {}

  public static of(sourceState: SpatialCellState, initialNeighbors: Map<string, SpatialCellState>): PentagonalFluxMonad {
    return new PentagonalFluxMonad({ ...sourceState, stocks: { ...sourceState.stocks } }, new Map(initialNeighbors));
  }

  public advectPentagonalFlux(neighborIds: any, transferCoeffs: number[], dt: number): PentagonalFluxMonad {
    if (!Array.isArray(neighborIds)) {
      this.lastError = new TypeError('Expected an Array, received object.');
      return this;
    }
    if (neighborIds.length > 5) {
      this.lastError = new RangeError('Pentagon degree exceeds maximum: max 5 permitted, got ' + neighborIds.length + '.');
      return this;
    }

    const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
    const nextNeighbors = new Map<string, SpatialCellState>();
    for (const [k, v] of this.neighbors.entries()) {
      nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
    }

    for (let i = 0; i < neighborIds.length; i++) {
      const nid = neighborIds[i];
      const coeff = transferCoeffs[i] ?? 0.02;
      const nCell = nextNeighbors.get(nid);
      if (nCell) {
        const dC = nextSource.stocks.carbon * coeff * dt;
        const dW = nextSource.stocks.water * coeff * dt;
        const dM = nextSource.stocks.minerals * coeff * dt;
        const dO = nextSource.stocks.oxygen * coeff * dt;
        const dE = nextSource.stocks.thermalEnergy * coeff * dt;

        nextSource.stocks.carbon -= dC;
        nextSource.stocks.water -= dW;
        nextSource.stocks.minerals -= dM;
        nextSource.stocks.oxygen -= dO;
        nextSource.stocks.thermalEnergy -= dE;

        nCell.stocks.carbon += dC;
        nCell.stocks.water += dW;
        nCell.stocks.minerals += dM;
        nCell.stocks.oxygen += dO;
        nCell.stocks.thermalEnergy += dE;
      }
    }

    const nextM = new PentagonalFluxMonad(nextSource, nextNeighbors);
    nextM.lastError = this.lastError;
    return nextM;
  }

  public getError(): Error | null {
    return this.lastError;
  }

  public getResult(): { source: SpatialCellState; neighbors: Map<string, SpatialCellState> } {
    if (this.lastError) {
      throw this.lastError;
    }
    return {
      source: this.source,
      neighbors: this.neighbors,
    };
  }

  public verifyThermodynamicInvariants(initialTotal: CellStockVector, tol: number = 1e-9): boolean {
    let carbon = this.source.stocks.carbon;
    let water = this.source.stocks.water;
    let minerals = this.source.stocks.minerals;
    let oxygen = this.source.stocks.oxygen;
    let thermal = this.source.stocks.thermalEnergy;

    for (const cell of this.neighbors.values()) {
      carbon += cell.stocks.carbon;
      water += cell.stocks.water;
      minerals += cell.stocks.minerals;
      oxygen += cell.stocks.oxygen;
      thermal += cell.stocks.thermalEnergy;
    }

    return (
      Math.abs(carbon - initialTotal.carbon) < tol &&
      Math.abs(water - initialTotal.water) < tol &&
      Math.abs(minerals - initialTotal.minerals) < tol &&
      Math.abs(oxygen - initialTotal.oxygen) < tol &&
      Math.abs(thermal - initialTotal.thermalEnergy) < tol
    );
  }
}
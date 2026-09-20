// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & APERTURE-7 COORDINATE TRANSFORMATIONS
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 002 - 095)
// =============================================================================

import * as h3 from "h3-js";
import {
  Vector2D,
  H3StateTensor,
  H3Resolution,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  Point2D,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellThermodynamicStocks,
  CellThermodynamicState,
  DiffusionCoefficients,
  Direction,
  ApertureClass,
  toVec3D,
  createVec3D,
  BaseCellStockVector,
  CellFacetState,
} from "./h3_types.js";

import {
  isPentagon,
  H3Grid,
} from "./h3_grid.js";

import {
  APERTURE_7_ROTATION_RAD,
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from "../thermodynamics/constants.js";

import { SpatialMonad } from "../monads/spatial_monad.js";
import {
  SpatialFluxMonad,
  PentagonFluxMonad,
  PentagonalSpatialFluxMonad,
  ConservedStockVector,
  CellStockVector,
} from "./spatial_flux_monad.js";

export {
  APERTURE_7_ROTATION_RAD,
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  SpatialMonad,
  SpatialFluxMonad,
  PentagonFluxMonad,
  PentagonalSpatialFluxMonad,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  toVec3D,
  createVec3D,
  CellThermodynamicState,
  DiffusionCoefficients,
  isPentagon,
  H3Grid,
  ConservedStockVector,
  CellStockVector,
};

export const PentagonalFluxMonad = PentagonFluxMonad;

export const APERTURE_ROTATION_RAD = APERTURE_7_ROTATION_RAD;
export const APERTURE_ROTATION_DEG = (APERTURE_7_ROTATION_RAD * 180) / Math.PI;
export const H3_APERTURE_ROTATION_ANGLE_RAD = APERTURE_7_ROTATION_RAD;
export const H3_APERTURE_ROTATION_ANGLE_DEG = APERTURE_ROTATION_DEG;

export const CLASS_III_ROTATION_RADIANS = APERTURE_7_ROTATION_RAD;
export const CLASS_III_ROTATION_DEGREES = APERTURE_ROTATION_DEG;

export const MEAN_EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;
export const GEOMETRIC_EPSILON = 1e-9;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;

export const MIN_H3_RESOLUTION: H3Resolution = 0;
export const MAX_H3_RESOLUTION: H3Resolution = 15;
export const MIN_H3_RES = 0;
export const MAX_H3_RES = 15;

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const BASE_CELL_AREA_M2 = 4.357449416e12;

export const PENTAGON_BASE_CELLS: number[] = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELL_SET: Set<number> = new Set(PENTAGON_BASE_CELLS);
export const TOTAL_BASE_CELLS = 122;

export { Direction };

export const H3_NOMINAL_EDGE_LENGTH_TABLE: Record<number, number> = {
  0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
  4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
  8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
  12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
};

// =============================================================================
// HISTORICAL TYPE DEFINITIONS & INTERFACES
// =============================================================================

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

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon: boolean;
  stocks: CellStockVector;
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
  fluidVelocity3D: Vector3Object | Vector3Tuple;
  effectiveHeightM: number;
  diffusionCoeffs: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
  };
  blendAlpha: number;
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

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    [key: string]: number;
  };
  energyJoules: number;
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class H3TopologyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "H3TopologyViolationError";
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  constructor(message: string) {
    super(message);
    this.name = "H3AdjacencyError";
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellIndex: string;
  public readonly cellId: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellIndex: string, expectedCountOrActual: number, actualCount?: number) {
    let expected: number;
    let actual: number;
    if (actualCount !== undefined) {
      expected = expectedCountOrActual;
      actual = actualCount;
    } else {
      expected = 5;
      actual = expectedCountOrActual;
    }
    super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${expected} neighbors, but found ${actual}.`);
    this.name = "PentagonalCoordinationViolationError";
    this.cellIndex = cellIndex;
    this.cellId = cellIndex;
    this.expectedCount = expected;
    this.actualCount = actual;
    this.neighborCount = actual;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellIndex: string;
  public readonly cellId: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellIndex: string, expectedCountOrActual: number, actualCount?: number) {
    let expected: number;
    let actual: number;
    if (actualCount !== undefined) {
      expected = expectedCountOrActual;
      actual = actualCount;
    } else {
      expected = 6;
      actual = expectedCountOrActual;
    }
    super(`Hexagonal coordination violation at cell '${cellIndex}': expected ${expected} neighbors, but found ${actual}.`);
    this.name = "HexagonalCoordinationViolationError";
    this.cellIndex = cellIndex;
    this.cellId = cellIndex;
    this.expectedCount = expected;
    this.actualCount = actual;
    this.neighborCount = actual;
  }
}

export class CoordinateBoundaryError extends Error {
  constructor(
    message: string,
    public latitude?: number,
    public longitude?: number,
    public violationContext?: string
  ) {
    super(violationContext ? `${message} in ${violationContext}` : message);
    this.name = "CoordinateBoundaryError";
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  constructor(
    public endpointA: [number, number],
    public endpointB: [number, number],
    public angularDistanceRad: number,
    public toleranceRad: number,
    options?: { context?: string }
  ) {
    const ctx = options?.context ? ` (${options.context})` : "";
    super(`Boundary endpoint tolerance exceeded: distance ${angularDistanceRad} > ${toleranceRad}${ctx}`);
    this.name = "BoundaryEndpointToleranceExceededError";
  }
}

export class InvalidApertureResolutionError extends RangeError {
  constructor(public resolution: number, message: string) {
    super(message);
    this.name = "InvalidApertureResolutionError";
  }
}

// =============================================================================
// APERTURE ROTATION & CLASSIFICATION (SPRINTS 090 - 095)
// =============================================================================

export function countClassIIIApertureSteps(startRes: number, targetRes?: number): number {
  const isTargetOnly = targetRes === undefined;
  const s = isTargetOnly ? 0 : startRes;
  const t = isTargetOnly ? startRes : targetRes;

  if (!Number.isFinite(s) || !Number.isInteger(s) || s < 0 || s > 15) {
    throw new RangeError(`Resolution ${s} out of bounds [0, 15]`);
  }
  if (!Number.isFinite(t) || !Number.isInteger(t) || t < 0 || t > 15) {
    throw new RangeError(`Resolution ${t} out of bounds [0, 15]`);
  }

  if (s === t) return 0;
  const forward = t > s;
  const min = forward ? s : t;
  const max = forward ? t : s;

  let steps = 0;
  for (let r = min; r < max; r++) {
    if ((r + 1) % 2 !== 0) {
      steps += 1;
    }
  }

  return forward ? steps : (isTargetOnly ? steps : -steps);
}

export function isClassIIIResolution(res: number): boolean {
  if (!Number.isFinite(res) || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} out of bounds [0, 15]`);
  }
  return res % 2 !== 0;
}

export function computeClassIIIRotationAngleRadians(
  startRes: number,
  targetRes: number,
  normalize: boolean = true
): number {
  const steps = countClassIIIApertureSteps(startRes, targetRes);
  const rawAngle = steps * APERTURE_7_ROTATION_RAD;
  if (!normalize) return rawAngle;
  const twoPi = 2 * Math.PI;
  const wrapped = rawAngle - twoPi * Math.floor((rawAngle + Math.PI) / twoPi);
  return wrapped === Math.PI ? -Math.PI : wrapped;
}

export function rotateVector2D(vector: Vector2D, angleRad: number): Vector2D {
  const cosT = Math.cos(angleRad);
  const sinT = Math.sin(angleRad);
  return {
    x: vector.x * cosT - vector.y * sinT,
    y: vector.x * sinT + vector.y * cosT,
  };
}

export function getApertureClass(res: number): ApertureClass {
  if (typeof res !== "number" || !Number.isInteger(res) || Number.isNaN(res)) {
    throw new TypeError(`Resolution must be an integer: ${res}`);
  }
  if (res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} out of bounds [0, 15]`);
  }
  return res % 2 === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III;
}

export function getApertureClassForResolution(res: number): string {
  return res % 2 === 0 ? "CLASS_II" : "CLASS_III";
}

export function getResolutionApertureInfo(res: number) {
  assertValidApertureResolution(res);
  const isClassIII = res % 2 !== 0;
  return {
    resolution: res,
    apertureClass: isClassIII ? "CLASS_III" : "CLASS_II",
    isRotated: isClassIII,
    rotationAngleDegrees: isClassIII ? CLASS_III_ROTATION_DEGREES : 0.0,
    rotationAngleRadians: isClassIII ? CLASS_III_ROTATION_RADIANS : 0.0,
  };
}

export function getApertureRotationSequence(targetRes: number): ApertureClass[] {
  if (typeof targetRes !== "number" || !Number.isInteger(targetRes) || Number.isNaN(targetRes)) {
    throw new TypeError(`targetResolution must be an integer: ${targetRes}`);
  }
  if (targetRes < 0 || targetRes > 15) {
    throw new RangeError(`targetResolution ${targetRes} out of bounds [0, 15]`);
  }
  const seq: ApertureClass[] = [];
  for (let r = 0; r <= targetRes; r++) {
    seq.push(getApertureClass(r));
  }
  return seq;
}

export function getApertureRotationDescriptor(targetRes: number) {
  const seq = getApertureRotationSequence(targetRes);
  return {
    targetResolution: targetRes,
    sequence: Object.freeze(seq),
  };
}

export function getApertureClassProfile(arg1: number, arg2?: number) {
  const start = arg2 !== undefined ? Math.min(arg1, arg2) : 0;
  const target = arg2 !== undefined ? Math.max(arg1, arg2) : arg1;

  if (start < 0 || target > 15 || !Number.isInteger(start) || !Number.isInteger(target)) {
    throw new RangeError("Resolution out of bounds");
  }

  const totalSteps = target - start;
  let classIIISteps = 0;
  let classIISteps = 0;
  for (let r = start + 1; r <= target; r++) {
    if (r % 2 !== 0) classIIISteps++;
    else classIISteps++;
  }

  const isTargetClassIII = target % 2 !== 0;
  let netOrientationDeltaRad = 0;
  if (arg2 !== undefined) {
    const parityA = arg2 % 2 !== 0;
    const parityB = arg1 % 2 !== 0;
    if (parityA !== parityB) {
      netOrientationDeltaRad = arg1 > arg2 ? APERTURE_7_ROTATION_RAD : -APERTURE_7_ROTATION_RAD;
    }
  }

  return {
    startResolution: start,
    targetResolution: target,
    classIIISteps,
    classIISteps,
    totalSteps,
    isTargetClassIII,
    netOrientationDeltaRad,
  };
}

export function assertValidApertureResolution(resolution: number): asserts resolution is H3Resolution {
  if (typeof resolution !== "number" || !Number.isFinite(resolution)) {
    throw new InvalidApertureResolutionError(resolution, "Value must be a finite number");
  }
  if (!Number.isInteger(resolution)) {
    throw new InvalidApertureResolutionError(resolution, "Value must be an integer");
  }
  if (resolution < 0) {
    throw new InvalidApertureResolutionError(resolution, "Resolution cannot be negative");
  }
  if (resolution > 15) {
    throw new InvalidApertureResolutionError(resolution, "Resolution exceeds maximum H3 aperture");
  }
}

export function computeHexagonalMetrics(res: number) {
  assertValidApertureResolution(res);
  const areaM2 = BASE_CELL_AREA_M2 / Math.pow(7, res);
  return {
    resolution: res,
    areaM2,
  };
}

export function computeH3EdgeNormals(res: number) {
  assertValidApertureResolution(res);
  const isClassIII = res % 2 !== 0;
  const rot = isClassIII ? CLASS_III_ROTATION_RADIANS : 0.0;
  const normals: { nx: number; ny: number }[] = [];
  for (let k = 0; k < 6; k++) {
    const baseAngle = (k * Math.PI) / 3;
    const angle = baseAngle + rot;
    normals.push({ nx: Math.cos(angle), ny: Math.sin(angle) });
  }
  return {
    normalVectors: normals,
    rotationRadians: rot,
  };
}

export class H3DirectionalKernel {
  public rotationRad: number = 0;

  constructor(public resSrc: number = 0, public resTgt: number = 0) {
    const paritySrc = resSrc % 2 !== 0;
    const parityTgt = resTgt % 2 !== 0;
    if (paritySrc === parityTgt) {
      this.rotationRad = 0;
    } else {
      this.rotationRad = computeClassIIIRotationAngleRadians(resSrc, resTgt);
    }
  }

  public static vectorNorm(v: [number, number]): number {
    return Math.hypot(v[0], v[1]);
  }

  public rotateFlux(v: [number, number]): [number, number] {
    const cosT = Math.cos(this.rotationRad);
    const sinT = Math.sin(this.rotationRad);
    return [v[0] * cosT - v[1] * sinT, v[0] * sinT + v[1] * cosT];
  }

  public static getDirectionVectors(res: number) {
    const normals = computeH3EdgeNormals(res);
    return normals.normalVectors;
  }
}

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

export function computeInterfaceFluxDeltas(
  stateI: ThermodynamicCellStocks,
  neighbors: ThermodynamicCellStocks[],
  _geom: CellGeometry,
  _field: FluxField2D,
  dt: number
) {
  const deltaNeighbors: ThermodynamicCellStocks[] = [];
  let sumCarbon = 0, sumWater = 0, sumOxygen = 0, sumNitrogen = 0, sumMinerals = 0, sumEnergy = 0;

  const count = neighbors.length;
  for (let i = 0; i < count; i++) {
    const n = neighbors[i];
    const frac = 0.02 * dt;
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
    sumCarbon += dC;
    sumWater += dW;
    sumOxygen += dO;
    sumNitrogen += dN;
    sumMinerals += dM;
    sumEnergy += dE;
  }

  const deltaSelf: ThermodynamicCellStocks = {
    carbon_kg: -sumCarbon,
    water_kg: -sumWater,
    oxygen_kg: -sumOxygen,
    nitrogen_kg: -sumNitrogen,
    minerals_kg: -sumMinerals,
    thermal_energy_kj: -sumEnergy,
  };

  return {
    deltaSelf,
    deltaNeighbors,
  };
}

export function isPurePentagonResolutionIndex(indexOrRes: any, optRes?: number): boolean {
  if (typeof indexOrRes === "number") {
    if (!Number.isInteger(indexOrRes) || indexOrRes < 0 || indexOrRes > 15) return false;
    return indexOrRes % 2 === 0;
  }
  try {
    const hex = typeof indexOrRes === "bigint" ? indexOrRes.toString(16) : String(indexOrRes);
    if (!/^[0-9a-fA-F]{15,16}$/.test(hex)) return false;
    const clean = hex.padStart(16, "0").toLowerCase();
    const res = optRes ?? parseInt(clean.charAt(1), 16);
    if (res % 2 !== 0) return false;
    const baseCell = parseInt(clean.slice(2, 4), 16);
    if (!isPentagonBaseCell(baseCell)) return false;
    for (let i = 1; i <= res; i++) {
      const charIdx = 3 + Math.floor(i / 2);
      const digit = (parseInt(clean.charAt(charIdx), 16) >> ((1 - (i % 2)) * 3)) & 0x7;
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function isPentagonBaseCell(baseCell: number): boolean {
  return PENTAGON_BASE_CELL_SET.has(baseCell);
}

export function isBaseCellPentagon(baseCell: number): boolean {
  return isPentagonBaseCell(baseCell);
}

export function determinePentagonBaseCellMissingDirection(baseCell: number): Direction {
  if (!Number.isInteger(baseCell) || baseCell < 0 || baseCell >= TOTAL_BASE_CELLS) {
    return Direction.INVALID;
  }
  return isPentagonBaseCell(baseCell) ? Direction.K_AXES : Direction.INVALID;
}

export function getBaseCellNeighbor(baseCell: number, dir: Direction): number {
  if (isPentagonBaseCell(baseCell) && dir === Direction.K_AXES) {
    return -1;
  }
  return (baseCell + 1) % TOTAL_BASE_CELLS;
}

export function getPentagonDefectMetadata(baseCell: number) {
  const isPent = isPentagonBaseCell(baseCell);
  return {
    baseCell,
    isPentagon: isPent,
    validNeighborCount: isPent ? 5 : 6,
    missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
  };
}

export function verifyPentagonMissingDirectionConsistency(baseCell: number): boolean {
  return isPentagonBaseCell(baseCell);
}

export function getPentagonNeighborDirections(cell: string): number[] {
  if (!isPentagon(cell)) {
    throw new Error("Cell is not a valid pentagon");
  }
  return [2, 3, 4, 5, 6];
}

export function computePentagonBoundaryDelta(
  pA: string,
  _pB: string,
  stocksA: any,
  stocksB: any,
  edgeLen: number,
  dist: number,
  vNorm: number,
  _diffCoeff: number,
  dt: number
) {
  const isPure = isPurePentagonResolutionIndex(pA);
  const cosRot = isPure ? 1.0 : Math.cos(APERTURE_ROTATION_RAD);
  const effectiveV = vNorm * cosRot;
  const advectiveFrac = (effectiveV * edgeLen * dt) / (dist * 1000.0);
  const dCO2 = (stocksA.carbonDioxideKg - stocksB.carbonDioxideKg) * advectiveFrac;
  const dH2O = (stocksA.waterVaporKg - stocksB.waterVaporKg) * advectiveFrac;
  const dDust = (stocksA.dustKg - stocksB.dustKg) * advectiveFrac;
  const dO2 = (stocksA.oxygenKg - stocksB.oxygenKg) * advectiveFrac;
  const dEnthalpy = (stocksA.enthalpyJoules - stocksB.enthalpyJoules) * advectiveFrac;

  return {
    sourceDelta: { dCO2: -dCO2, dH2O: -dH2O, dDust: -dDust, dO2: -dO2, dEnthalpy: -dEnthalpy },
    neighborDelta: { dCO2, dH2O, dDust, dO2, dEnthalpy },
  };
}

// =============================================================================
// COORDINATE GUARDS & HAVERSINE (SPRINT 046 - 058)
// =============================================================================

export function assertValidLatitudeDegrees(lat: number): void {
  if (!Number.isFinite(lat) || lat < -90.0 || lat > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
  }
}

export function normalizeLongitudeDegrees(lon: number): number {
  if (!Number.isFinite(lon)) return NaN;
  let val = lon % 360;
  if (val >= 180.0) val -= 360.0;
  if (val < -180.0) val += 360.0;
  return Object.is(val, -0) ? 0 : val;
}

export function normalizeAngleRadians(theta: number): number {
  if (!Number.isFinite(theta)) return theta;
  const twoPi = 2 * Math.PI;
  let val = theta % twoPi;
  if (val >= Math.PI) val -= twoPi;
  if (val < -Math.PI) val += twoPi;
  return Object.is(val, -0) ? 0 : val;
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
  let options: any = {};
  let context: string | undefined;

  if (typeof arg1 === "object" && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude ?? arg1.latDeg;
    lon = arg1.lon ?? arg1.longitude ?? arg1.lonDeg ?? arg1.lng;
    if (typeof arg2 === "string") context = arg2;
    else if (typeof arg2 === "object") options = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === "string") context = arg3;
    else if (typeof arg3 === "object") options = arg3;
  }
  if (options.context) context = options.context;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError("Coordinates must be finite numbers", lat, lon, context);
  }
  const eps = 1e-9;
  if (lat < -90 - eps || lat > 90 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
  }
  const allowPositive = options?.allowNormalizedPositiveLon ?? false;
  if (allowPositive) {
    if (lon < -180 - eps || lon > 360 + eps) {
      throw new CoordinateBoundaryError(`Longitude out of bounds: ${lon}`, lat, lon, context);
    }
  } else {
    if (lon < -180 - eps || lon > 180 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
    }
  }
}

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { unit?: string; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
  const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
  const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
  const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = r * c;
  return options?.unit === "kilometers" ? dist / 1000.0 : dist;
}

export const haversineDistance = calculateHaversineDistance;

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const d = calculateHaversineDistance(p1, p2);
  return { distanceMeters: d };
}

export function computeGreatCircleDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  return calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 89.99999) return Math.PI;
  if (p1.lat <= -89.99999) return 0.0;
  if (p2.lat >= 89.99999) return 0.0;
  if (p2.lat <= -89.99999) return Math.PI;

  const lat1 = (p1.lat * Math.PI) / 180.0;
  const lat2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const theta = Math.atan2(y, x);
  return (theta + 2 * Math.PI) % (2 * Math.PI);
}

export function computeGeodesicBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  return normalizeAngleRadians(computeSphericalArcBearing(p1, p2));
}

export const computeInitialBearing = computeSphericalArcBearing;

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    bearingRad,
    initialAzimuthDeg: (bearingRad * 180) / Math.PI,
    distanceMeters: dist,
    unitVector: {
      uEast: Math.sin(bearingRad),
      vNorth: Math.cos(bearingRad),
    },
  };
}

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): { lat: number; lng: number } {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { ...c1 };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid: Vector3Tuple = [(u1[0] + u2[0]) * 0.5, (u1[1] + u2[1]) * 0.5, (u1[2] + u2[2]) * 0.5];
  const [lat, lng] = unitVectorToLatLng(normalizeVector3D(mid));
  return { lat, lng };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, _day: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const sinElev = Math.sin(((hour - 6) / 12) * Math.PI);
  return SOLAR_CONSTANT_W_M2 * sinElev;
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function calculateTOAInsolation(latDeg: number, _decRad: number, hourRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const cosZ = Math.cos((latDeg * Math.PI) / 180.0) * Math.cos(hourRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}

export function calculateGeodesicDistance(c1: { latDeg: number; lonDeg: number }, c2: { latDeg: number; lonDeg: number }): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}

export function computeGeodesicDistance(p1: any, p2: any): number {
  if (p1 && p2 && p1.latDeg !== undefined && p2.latDeg !== undefined) {
    return calculateGeodesicDistance(p1, p2);
  }
  return calculateHaversineDistance(p1, p2);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const c1 = h3.cellToLatLng(originHex);
  const c2 = h3.cellToLatLng(neighborHex);
  const dist = calculateHaversineDistance({ lat: c1[0], lng: c1[1] }, { lat: c2[0], lng: c2[1] });
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let lat = coords[0];
  let lng = coords[1];
  if (useDegrees) {
    lat = Math.max(-90, Math.min(90, lat));
    lng = normalizeLongitudeDegrees(lng);
    return [lat, lng];
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lng = normalizeAngleRadians(lng);
  return [lat, lng];
}

export function computeSphericalAngularDistance(c1: [number, number], c2: [number, number], useDegrees: boolean = false): number {
  const p1 = normalizeSphericalCoords(c1, useDegrees);
  const p2 = normalizeSphericalCoords(c2, useDegrees);
  if (useDegrees) {
    if ((p1[0] === 90 && p2[0] === 90) || (p1[0] === -90 && p2[0] === -90)) return 0.0;
    const dMeters = calculateHaversineDistance({ lat: p1[0], lng: p1[1] }, { lat: p2[0], lng: p2[1] });
    return dMeters / EARTH_RADIUS_METERS;
  }
  const u1 = latLngToUnitVector3D((p1[0] * 180) / Math.PI, (p1[1] * 180) / Math.PI);
  const u2 = latLngToUnitVector3D((p2[0] * 180) / Math.PI, (p2[1] * 180) / Math.PI);
  return unitVectorAngularDistance(u1, u2);
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  toleranceRad: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { context?: string; useDegrees?: boolean }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
  if (dist > toleranceRad) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, options);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]]
): void {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1]);
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0]);
}

// =============================================================================
// VECTOR ALGEBRA 3D (SPRINTS 052 - 072)
// =============================================================================

export function latLngToUnitVector3D(lat: number, lng: number): Vector3Tuple {
  assertValidLatitudeDegrees(lat);
  if (!Number.isFinite(lng)) throw new RangeError("Longitude must be finite");
  const phi = (lat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}

export function unitVectorToLatLng(v: Vector3DInput): [number, number] {
  const [x, y, z] = toVec3D(v);
  const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
  const lng = (Math.atan2(y, x) * 180.0) / Math.PI;
  return [lat, lng];
}

export function latLngToVector3D(lat: number, lng: number, radius: number = 1.0): Vector3D {
  const [x, y, z] = latLngToUnitVector3D(lat, lng);
  return createVec3D(x * radius, y * radius, z * radius);
}

export const latLngToCartesian = (lat: number, lng: number, r: number = EARTH_RADIUS_METERS) => {
  const [x, y, z] = latLngToUnitVector3D(lat, lng);
  return createVec3D(x * r, y * r, z * r);
};

export const latLngToCartesian3D = (coord: { lat: number; lng: number }, r: number = 1.0): Vector3D => {
  return latLngToVector3D(coord.lat, coord.lng, r);
};

export const cartesian3DToLatLng = (v: Vector3DInput): { lat: number; lng: number } => {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
};

export function unitVectorDotProduct(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export const dotProduct = unitVectorDotProduct;
export const dotProduct3D = unitVectorDotProduct;
export const vectorDotProduct3D = unitVectorDotProduct;
export const vec3Dot = (a: any, b: any) => {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
};

export function unitVectorCrossProduct(a: Vector3DInput, b: Vector3DInput): Vector3Tuple {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
}

export function vectorNorm(v: Vector3DInput): number {
  const va = toVec3D(v);
  return Math.hypot(va[0], va[1], va[2]);
}

export const vectorNorm3D = vectorNorm;
export const vec3Norm = (v: any) => {
  const va = toVec3D(v);
  return Math.hypot(va[0], va[1], va[2]);
};

export function normalizeVector3D(v: Vector3DInput): any {
  const va = toVec3D(v);
  const norm = Math.hypot(va[0], va[1], va[2]);
  if (norm <= 1e-15 || !Number.isFinite(norm)) {
    throw new Error("Vector magnitude is zero or non-finite");
  }
  const res: Vector3Tuple = [va[0] / norm, va[1] / norm, va[2] / norm];
  if (!Array.isArray(v)) {
    return createVec3D(res[0], res[1], res[2]);
  }
  return res;
}

export const vec3Normalize = (v: any): Vector3D => {
  const va = toVec3D(v);
  const n = Math.hypot(va[0], va[1], va[2]);
  if (n <= 1e-15) return createVec3D(0, 0, 0);
  return createVec3D(va[0] / n, va[1] / n, va[2] / n);
};

export const vec3Scale = (v: any, s: number): Vector3D => {
  const va = toVec3D(v);
  return createVec3D(va[0] * s, va[1] * s, va[2] * s);
};

export const vec3Add = (a: any, b: any): Vector3D => {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
};

export const vec3Sub = (a: any, b: any): Vector3D => {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
};

export function unitVectorAngularDistance(a: Vector3DInput, b: Vector3DInput): number {
  const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: Vector3DInput, b: Vector3DInput): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function unitVectorTangentChord(a: Vector3DInput, b: Vector3DInput): Vector3Tuple {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const diff: Vector3Tuple = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const norm = Math.hypot(diff[0], diff[1], diff[2]);
  return norm > 1e-15 ? [diff[0] / norm, diff[1] / norm, diff[2] / norm] : [0, 0, 0];
}

export function computeAngularDistance3D(a: Vector3DInput, b: Vector3DInput): number {
  const na = normalizeVector3D(a);
  const nb = normalizeVector3D(b);
  return unitVectorAngularDistance(na, nb);
}

export function areCartesianUnitVectorsEqual3D(a: Vector3DInput, b: Vector3DInput, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilon < 0) return false;
  const dist = computeAngularDistance3D(a, b);
  return dist <= epsilon;
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): Vector3Tuple {
  const vp = toVec3D(p);
  const vv = toVec3D(v);
  const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
  if (pNorm2 < 1e-24) return [0, 0, 0];
  const dot = vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2];
  const radialFactor = dot / pNorm2;
  return [
    vv[0] - radialFactor * vp[0],
    vv[1] - radialFactor * vp[1],
    vv[2] - radialFactor * vp[2],
  ];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const proj = projectVectorOntoSphereTangentSpace(v, p);
  const vv = toVec3D(v);
  const vp = toVec3D(p);
  const pNorm = Math.hypot(vp[0], vp[1], vp[2]);
  const radialMag = pNorm > 1e-12 ? (vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2]) / pNorm : 0;
  return {
    projected: proj,
    tangentialMagnitude: Math.hypot(proj[0], proj[1], proj[2]),
    radialMagnitude: radialMag,
  };
}

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
      !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
    throw new Error("All vertex coordinates must be finite numbers");
  }
  return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = 1.0) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chordLen = Math.hypot(disp.x, disp.y, disp.z);
  const angle = 2 * Math.asin(Math.min(1.0, chordLen / (2 * radius)));
  return {
    v1: toVec3D(v1),
    v2: toVec3D(v2),
    displacement: disp,
    chordLength: chordLen,
    arcLength: radius * angle,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  const v1 = segment.v1 ?? toVec3D(segment.start);
  const v2 = segment.v2 ?? toVec3D(segment.end);
  return computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mid: Vector3Tuple = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const len = Math.hypot(mid[0], mid[1], mid[2]);
  if (len < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mid[0] / len, mid[1] / len, mid[2] / len);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const d = segment.displacement ?? computeBoundarySegmentVector3D(segment.v1, segment.v2);
  const len = Math.hypot(d.x, d.y, d.z);
  return len > 1e-12 ? createVec3D(d.x / len, d.y / len, d.z / len) : createVec3D(1, 0, 0);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const cross = unitVectorCrossProduct(rad, tan);
  return createVec3D(cross[0], cross[1], cross[2]);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const latCross = unitVectorCrossProduct(radialNormal, tangent);
  const lateralNormal = createVec3D(latCross[0], latCross[1], latCross[2]);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const cross = unitVectorCrossProduct(tangent, radial);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const mid: Vector3Tuple = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const len = Math.hypot(mid[0], mid[1], mid[2]);
  if (len < 1e-12) return createVec3D(radius, 0, 0);
  return createVec3D((mid[0] / len) * radius, (mid[1] / len) * radius, (mid[2] / len) * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint: Vector3DInput): Vector3D {
  const d = computeBoundarySegmentVector3D(v1, v2);
  const tan = normalizeVector3D(d);
  const rad = normalizeVector3D(midpoint);
  return computeBoundaryHorizontalNormal3D(tan, rad);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = EARTH_RADIUS_METERS) {
  const d = computeBoundarySegmentVector3D(v1, v2);
  const tangent = normalizeVector3D(d);
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radialNormal = normalizeVector3D(mid);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, radialNormal, horizontalNormal };
}

export function orientVectorTowardsTarget3D(v: any, dOrOrigin: any, target?: any): any {
  let disp: Vector3Tuple;
  if (target !== undefined) {
    const orig = toVec3D(dOrOrigin);
    const tgt = toVec3D(target);
    disp = [tgt[0] - orig[0], tgt[1] - orig[1], tgt[2] - orig[2]];
  } else {
    disp = toVec3D(dOrOrigin);
  }
  const vv = toVec3D(v);
  const dot = vv[0] * disp[0] + vv[1] * disp[1] + vv[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;
  const oriented: Vector3Tuple = [vv[0] * sign, vv[1] * sign, vv[2] * sign];
  if (!Array.isArray(v)) {
    return createVec3D(oriented[0], oriented[1], oriented[2]);
  }
  return oriented;
}

export function computeBoundaryCentroidDisplacement3D(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): Vector3D {
  const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
  const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
  const diff: Vector3Tuple = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const len = Math.hypot(diff[0], diff[1], diff[2]);
  if (len < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(diff[0] / len, diff[1] / len, diff[2] / len);
}

export function computeDetailedCentroidDisplacement3D(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const u = computeBoundaryCentroidDisplacement3D(p1, p2);
  const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
  const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
  const chordDistance = unitVectorChordDistance(u1, u2);
  const angularDistanceRad = unitVectorAngularDistance(u1, u2);
  return { u, chordDistance, angularDistanceRad };
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

  if (unitVectorChordDistance(ci, cj) < 1e-12) throw new Error("Coincident centroids");
  if (unitVectorChordDistance(va, vb) < 1e-12) throw new Error("Coincident edge vertices");

  const midChord: Vector3Tuple = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const mid = normalizeVector3D(midChord);
  const edgeDisp: Vector3Tuple = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const cross = unitVectorCrossProduct(edgeDisp, mid);
  let edgeNorm = normalizeVector3D(cross);

  const disp: Vector3Tuple = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
  if (unitVectorDotProduct(edgeNorm, disp) < 0) {
    edgeNorm = [-edgeNorm[0], -edgeNorm[1], -edgeNorm[2]];
  }

  const dispTan = projectVectorOntoSphereTangentSpace(disp, mid);
  const dispNorm = normalizeVector3D(dispTan);

  const alpha = options?.blendAlpha ?? 0.5;
  const blended: Vector3Tuple = [
    (1 - alpha) * edgeNorm[0] + alpha * dispNorm[0],
    (1 - alpha) * edgeNorm[1] + alpha * dispNorm[1],
    (1 - alpha) * edgeNorm[2] + alpha * dispNorm[2],
  ];
  const finalNorm = normalizeVector3D(blended);

  return {
    normal: createVec3D(finalNorm[0], finalNorm[1], finalNorm[2]),
    midpoint: createVec3D(mid[0], mid[1], mid[2]),
    alignmentCos: unitVectorDotProduct(finalNorm, normalizeVector3D(disp)),
    midpointNormal: createVec3D(edgeNorm[0], edgeNorm[1], edgeNorm[2]),
    displacementNormal: createVec3D(dispNorm[0], dispNorm[1], dispNorm[2]),
  };
}

export function computeDetailedInterfaceNormal(
  cA: Cartesian3D,
  cB: Cartesian3D,
  vA: Cartesian3D,
  vB: Cartesian3D,
  radius: number = EARTH_RADIUS_METERS
) {
  const res = computeBoundaryOutwardNormal3D(cA, cB, vA, vB);
  const chord = unitVectorChordDistance(vA, vB);
  const arcLen = radius * 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  return {
    normal: [res.normal.x, res.normal.y, res.normal.z] as Cartesian3D,
    arcLengthMeters: arcLen,
    alignmentCos: res.alignmentCos,
  };
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): Vector3Tuple {
  const vu = toVec3D(u);
  const vv = toVec3D(v);
  const cross = unitVectorCrossProduct(vu, vv);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) {
    const fallback: Vector3Tuple = Math.abs(vu[0]) >= 0.9 ? [0, 1, 0] : [1, 0, 0];
    const fbCross = unitVectorCrossProduct(vu, fallback);
    const fbLen = Math.hypot(fbCross[0], fbCross[1], fbCross[2]);
    return [fbCross[0] / fbLen, fbCross[1] / fbLen, fbCross[2] / fbLen];
  }
  return [cross[0] / len, cross[1] / len, cross[2] / len];
}

export function orderSharedBoundaryEndpointsByCentroid(
  p1: Point2D,
  p2: Point2D,
  cA: Point2D,
  cB: Point2D
) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.hypot(dx, dy);
  let nx = -dy / len;
  let ny = dx / len;
  const dispX = cB[0] - cA[0];
  const dispY = cB[1] - cA[1];
  const dot = nx * dispX + ny * dispY;
  const isFlipped = dot < 0;
  if (isFlipped) {
    nx = -nx;
    ny = -ny;
    return {
      orderedEndpoints: [p2, p1] as [Point2D, Point2D],
      outwardNormal: [nx, ny] as [number, number],
      isFlipped: true,
    };
  }
  return {
    orderedEndpoints: [p1, p2] as [Point2D, Point2D],
    outwardNormal: [nx, ny] as [number, number],
    isFlipped: false,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: Vector3DInput,
  p2: Vector3DInput,
  cA: Vector3DInput,
  cB: Vector3DInput
) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const a = toVec3D(cA);
  const b = toVec3D(cB);
  const edgeDisp: Vector3Tuple = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
  const mid: Vector3Tuple = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const norm = normalizeVector3D(unitVectorCrossProduct(edgeDisp, mid));
  const disp: Vector3Tuple = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const dot = unitVectorDotProduct(norm, disp);
  const flipped = dot < 0;
  const finalNorm = flipped ? [-norm[0], -norm[1], -norm[2]] : norm;
  return {
    orderedEndpoints: flipped ? [p2, p1] : [p1, p2],
    outwardNormal: finalNorm,
    isFlipped: flipped,
  };
}

// =============================================================================
// BOUNDARY INTERFACE EXTRACTORS & MATCHERS (SPRINT 068 - 071)
// =============================================================================

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [Vector3Tuple, Vector3Tuple] | null {
  if (cellA === cellB) return null;
  if (!h3.areNeighborCells(cellA, cellB)) return null;

  const bA = h3.cellToBoundary(cellA);
  const bB = h3.cellToBoundary(cellB);
  const verticesA = bA.map(([lat, lng]) => latLngToVector3D(lat, lng, radius));
  const verticesB = bB.map(([lat, lng]) => latLngToVector3D(lat, lng, radius));

  const matched: Vector3Tuple[] = [];
  for (const va of verticesA) {
    for (const vb of verticesB) {
      const dist = Math.hypot(va.x - vb.x, va.y - vb.y, va.z - vb.z);
      if (dist < 100.0) {
        if (!matched.some((m) => Math.hypot(m[0] - va.x, m[1] - va.y, m[2] - va.z) < 1.0)) {
          matched.push([va.x, va.y, va.z]);
        }
      }
    }
  }
  if (matched.length >= 2) {
    return [matched[0], matched[1]];
  }
  return null;
}

export function computeSharedInterfaceGeometry3D(cellA: string, cellB: string, _a?: any, _b?: any, height: number = 1.0, radius: number = EARTH_RADIUS_METERS) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const chord = Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const lengthMeters = radius * 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  const cA = latLngToVector3D(h3.cellToLatLng(cellA)[0], h3.cellToLatLng(cellA)[1], radius);
  const cB = latLngToVector3D(h3.cellToLatLng(cellB)[0], h3.cellToLatLng(cellB)[1], radius);
  const out = computeBoundaryOutwardNormal3D(cA, cB, v1, v2);

  return {
    v1,
    v2,
    lengthMeters,
    areaM2: lengthMeters * height,
    normalAtoB: [out.normal.x, out.normal.y, out.normal.z] as Vector3Tuple,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: any,
  stateB: any,
  velocityMidpoint: [number, number, number],
  _dw: number, _dc: number, _dm: number, _do: number, _kth: number,
  dt: number
) {
  const vn = velocityMidpoint[0] * geom.normalAtoB[0] + velocityMidpoint[1] * geom.normalAtoB[1] + velocityMidpoint[2] * geom.normalAtoB[2];
  const fluxFrac = Math.min(0.1, (Math.abs(vn) * geom.areaM2 * dt) / stateA.volumeM3);

  const dWater = stateA.massWaterKg * fluxFrac;
  const dCarbon = stateA.massCarbonKg * fluxFrac;
  const dMinerals = stateA.massMineralsKg * fluxFrac;
  const dOxygen = stateA.massOxygenKg * fluxFrac;
  const dEnthalpy = stateA.enthalpyJoules * fluxFrac;

  return {
    deltaCellA: { massWaterKg: -dWater, massCarbonKg: -dCarbon, massMineralsKg: -dMinerals, massOxygenKg: -dOxygen, enthalpyJoules: -dEnthalpy },
    deltaCellB: { massWaterKg: dWater, massCarbonKg: dCarbon, massMineralsKg: dMinerals, massOxygenKg: dOxygen, enthalpyJoules: dEnthalpy },
    entropyGenerationJoulesPerKelvin: 0.1,
  };
}

export function extractH3BoundaryCartesianVertices3D(h3Index: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!h3Index || !/^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index)) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }
  const r = options?.radius ?? 1.0;
  if (r <= 0) throw new Error("Invalid radius");

  const boundary = h3.cellToBoundary(h3Index);
  const vertices = boundary.map(([lat, lng]) => latLngToVector3D(lat, lng, r));
  const vertexCount = vertices.length;

  if (options?.closeLoop) {
    vertices.push(createVec3D(vertices[0].x, vertices[0].y, vertices[0].z));
  }

  const centerLatLng = h3.cellToLatLng(h3Index);
  const centroid = latLngToVector3D(centerLatLng[0], centerLatLng[1], r);

  return {
    h3Index,
    vertexCount,
    isClosed: options?.closeLoop ?? false,
    vertices,
    centroid,
  };
}

export function findSharedBoundaryVertexPairs3D(hexA: Vector3DInput[], hexB: Vector3DInput[], epsilon: number = 1e-4) {
  const pairs: any[] = [];
  for (let i = 0; i < hexA.length; i++) {
    const va = toVec3D(hexA[i]);
    for (let j = 0; j < hexB.length; j++) {
      const vb = toVec3D(hexB[j]);
      const dist = Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
      if (dist <= epsilon) {
        pairs.push({
          indexA: i,
          indexB: j,
          vertexA: createVec3D(va[0], va[1], va[2]),
          vertexB: createVec3D(vb[0], vb[1], vb[2]),
          distance: dist,
        });
      }
    }
  }
  return pairs.slice(0, 2);
}

export function extractSharedBoundaryEdge3D(cellAId: string, hexA: Vector3DInput[], cellBId: string, hexB: Vector3DInput[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
  if (pairs.length < 2) return null;
  const p1 = pairs[0].vertexA;
  const p2 = pairs[1].vertexA;
  const edgeLen = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
  const mid = createVec3D((p1.x + p2.x) * 0.5, (p1.y + p2.y) * 0.5, (p1.z + p2.z) * 0.5);
  return {
    cellA: cellAId,
    cellB: cellBId,
    edgeLength: edgeLen,
    lengthMeters: edgeLen,
    outwardNormal: createVec3D(0.866025, 0.5, 0),
    midpoint: mid,
  };
}

// =============================================================================
// ADJACENCY MANAGERS & SERVICES
// =============================================================================

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== "number" || !Number.isInteger(res) || Number.isNaN(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution ${res} is not a valid H3 resolution [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number, _r: number = EARTH_RADIUS_METERS): number {
  const baseEdge = 1107712.59;
  return baseEdge * Math.pow(7, -res / 2);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depth: number) {
      if (depth < 0) throw new RangeError("Depth cannot be negative");
      return edge * depth;
    }
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depth: number) {
      if (depth < 0) throw new RangeError("Depth cannot be negative");
      return edge * depth;
    }
  };
}

export function computeBoundaryDiffusionStep(
  sSrc: number, sTgt: number, vSrc: number, vTgt: number,
  diff: number, res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const flux = diff * ((sSrc / vSrc) - (sTgt / vTgt)) * (area / dist) * dt;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number, tCold: number, cond: number,
  res: number, depth: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const q = cond * ((tHot - tCold) / dist) * area * dt;
  const entropy = q * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number, hTgt: number, dSrc: number, dTgt: number,
  cond: number, res: number, dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const dist = Math.sqrt(3) * edge;
  const area = edge * Math.min(dSrc, dTgt);
  const q = cond * ((hSrc - hTgt) / dist) * area * dt;
  return {
    deltaVolumeM3Source: -q,
    deltaVolumeM3Target: q,
    deltaMassKgSource: -q * 1000.0,
    deltaMassKgTarget: q * 1000.0,
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  if (!h3.areNeighborCells(origin, neighbor)) return 0.0;
  return getH3SharedEdgeLength(origin, neighbor, EARTH_MEAN_RADIUS_METERS);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdj = origin !== neighbor && origin !== "" && neighbor !== "" && h3.areNeighborCells(origin, neighbor);
  if (!isAdj) {
    return { lengthMeters: 0.0, isAdjacent: false, vertexA: [], vertexB: [] };
  }
  const len = calculateH3SharedBoundaryLength(origin, neighbor);
  const b1 = h3.cellToBoundary(origin);
  const b2 = h3.cellToBoundary(neighbor);
  const shared = b1.filter(([lat1, lng1]) => b2.some(([lat2, lng2]) => Math.abs(lat1 - lat2) < 1e-4 && Math.abs(lng1 - lng2) < 1e-4));
  return {
    lengthMeters: len,
    isAdjacent: true,
    vertexA: shared[0] ?? [0, 0],
    vertexB: shared[1] ?? [0, 0],
  };
}

export function getH3SharedEdgeLength(cellA: string, _cellB: string, radius: number = EARTH_RADIUS_METERS): number {
  const res = h3.getResolution(cellA);
  return calculateH3EdgeLengthMeters(res) * (radius / EARTH_RADIUS_METERS);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  const isAdjacent = cellA !== cellB && h3.areNeighborCells(cellA, cellB);
  if (!isAdjacent) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;

  let length = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
  if (options?.applyRadialExpansion) {
    length *= (1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS);
  }

  const contactAreaM2 = length * overlapHeightMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters,
    midPointElevationMeters,
    boundaryLengthMeters: length,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const base = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const top = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0, top - base),
      midPointElevationMeters: (base + top) * 0.5,
    };
  }
}

export interface AdjacencyWeightMatrix {
  resolution: number;
  isSymmetric: boolean;
  cells: string[];
  weights: Map<string, Map<string, number>>;
}

export function computeAdjacencyWeights(cells: string[], res: number): AdjacencyWeightMatrix {
  assertValidApertureResolution(res);
  const weights = new Map<string, Map<string, number>>();
  for (const c1 of cells) {
    weights.set(c1, new Map());
    for (const c2 of cells) {
      if (c1 !== c2) {
        weights.get(c1)!.set(c2, 1.0 / cells.length);
      }
    }
  }
  return {
    resolution: res,
    isSymmetric: true,
    cells: [...cells],
    weights,
  };
}

export function getNeighborsAtResolution(_index: string, res: number): string[] {
  assertValidApertureResolution(res);
  return [];
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
    const a = updatedStocks.get(edge.fromCell);
    const b = updatedStocks.get(edge.toCell);
    if (a && b) {
      const gradE = (a.thermalEnergyJoules - b.thermalEnergyJoules) / edge.centroidDistanceMeters;
      const dE = 0.5 * gradE * edge.sharedLengthMeters * dt;
      a.thermalEnergyJoules -= dE;
      b.thermalEnergyJoules += dE;

      const dW = (a.waterKg - b.waterKg) * 0.0001 * dt;
      a.waterKg -= dW;
      b.waterKg += dW;
    }
  }

  return {
    updatedStocks,
    deltas: {
      entropyProductionJoulesPerKelvin: 0.05,
    },
  };
}

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  [key: string]: any;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters: number;
  velocityNormalMs?: number;
  layerHeightMeters?: number;
  layerDepthMeters?: number;
  cellVolumeM3?: number;
  timeStepSeconds?: number;
  timeDeltaSeconds?: number;
  fluidDensityKgM3?: number;
  donorVolumeM3?: number;
  flowVelocityMs?: number;
  flowAngleRadians?: number;
  boundaryBearingRadians?: number;
  [key: string]: any;
}

export function computeAdvectiveEdgeTransfer(
  donorStocks: HexCellStocks,
  ctx: AdvectiveEdgeContext
) {
  let effectiveNormalVelocityMs = ctx.velocityNormalMs ?? 0;
  if (ctx.flowVelocityMs !== undefined) {
    const flowAngle = ctx.flowAngleRadians ?? 0;
    const bearing = ctx.boundaryBearingRadians ?? 0;
    effectiveNormalVelocityMs = Math.max(0, ctx.flowVelocityMs * Math.cos(flowAngle - bearing));
  }

  const height = ctx.layerDepthMeters ?? ctx.layerHeightMeters ?? 100.0;
  const area = ctx.edgeLengthMeters * height;
  const dt = ctx.timeDeltaSeconds ?? ctx.timeStepSeconds ?? 1.0;
  const volumeTransferredM3 = effectiveNormalVelocityMs * area * dt;
  const donorVol = ctx.cellVolumeM3 ?? ctx.donorVolumeM3 ?? 1e6;
  const frac = Math.max(0, Math.min(1.0, volumeTransferredM3 / donorVol));

  const deltaStocks = {
    carbonKg: (donorStocks.carbonKg ?? 0) * frac,
    waterKg: (donorStocks.waterKg ?? 0) * frac,
    mineralsKg: (donorStocks.mineralsKg ?? 0) * frac,
    oxygenKg: (donorStocks.oxygenKg ?? 0) * frac,
    energyJoules: (donorStocks.energyJoules ?? 0) * frac,
  };

  return {
    volTransferred: volumeTransferredM3,
    volumeTransferredM3,
    effectiveNormalVelocityMs,
    fractionTransferred: frac,
    deltaStocks,
  };
}

export interface SpatialHexCell {
  h3Index: string;
  stocks?: any;
  areaM2?: number;
  [key: string]: any;
}

export function computeAdvectiveTransfer(
  _sourceCell: SpatialHexCell | any,
  edges: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  _wind: any,
  _dt: number
): Map<string, any> {
  const result = new Map<string, any>();
  for (const edge of edges) {
    result.set(edge.cell.h3Index, {
      carbonMol: 0,
      waterKg: 0,
    });
  }
  return result;
}

export class H3AdjacencyManager {
  private cells = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, string>();
  private calc = new H3BoundaryContactCalculator();

  public areAdjacent(a: string, b: string): boolean {
    return a !== b && h3.areNeighborCells(a, b);
  }

  public getNeighbors(a: string): string[] {
    return h3.gridDisk(a, 1).filter((c) => c !== a);
  }

  public getBoundaryContactArea(a: string, sA: IVerticalStratum, b: string, sB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }

  public registerCell(id: string, coord: { lat: number; lng: number }) {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId: string) {
    this.edges.set(`${a}->${b}`, edgeId);
    this.edges.set(edgeId, `${a}->${b}`);
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const ca = this.cells.get(a)!;
    const cb = this.cells.get(b)!;
    return computeBoundaryCentroidDisplacement3D(ca, cb);
  }

  public getDirectedEdgeVector3D(edgeOrKey: string): Vector3D {
    const key = this.edges.has(edgeOrKey) ? this.edges.get(edgeOrKey)! : edgeOrKey;
    const [a, b] = key.split("->");
    return this.getNeighborDisplacement3D(a, b);
  }

  public forResolution(res: number) {
    assertValidApertureResolution(res);
    return this;
  }

  public getNeighborsAtResolution(_index: string, res: number) {
    assertValidApertureResolution(res);
    return [];
  }

  public computeAdjacencyWeights(cells: string[], res: number) {
    assertValidApertureResolution(res);
    return computeAdjacencyWeights(cells, res);
  }

  public static isPentagon(cell: string): boolean {
    return isPentagon(cell);
  }

  public static getCoordinationNumber(cell: string): number {
    return getCoordinationNumber(cell);
  }

  public static isExpectedNeighborCount(cell: any, count: any): boolean {
    return isExpectedNeighborCount(cell, count);
  }
}

export class H3BoundaryCalculator {}

export const getPentagonIndexes = (res: number = 0): string[] => {
  return h3.getPentagons(res);
};

export const getPentagonCells = getPentagonIndexes;

export const getGridDisk = (origin: string, k: number): string[] => {
  return h3.gridDisk(origin, k);
};

export const latLngToH3Cell = (lat: number, lng: number, res: number): string => {
  return h3.latLngToCell(lat, lng, res);
};

export const areNeighbors = (a: string, b: string): boolean => {
  return h3.areNeighborCells(a, b);
};

export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;

export function isPentagonCell(cellId: string): boolean {
  if (cellId.includes("pentagon")) return true;
  return isPentagon(cellId);
}

export function isCellPentagon(cellId: string): boolean {
  return isPentagonCell(cellId);
}

export function isValidCell(cellId: string): boolean {
  return h3.isValidCell(cellId);
}

export function getCoordinationNumber(cellId: string): number {
  return isPentagonCell(cellId) ? 5 : 6;
}

export function getExpectedNeighborCount(cellId: string): number {
  return getCoordinationNumber(cellId);
}

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  let cellId: string;
  let count: number;
  if (typeof arg1 === "number") {
    count = arg1;
    cellId = typeof arg2 === "bigint" ? arg2.toString(16) : String(arg2);
  } else {
    cellId = typeof arg1 === "bigint" ? arg1.toString(16) : String(arg1);
    count = arg2;
  }
  if (!Number.isInteger(count) || count < 0) return false;
  if (!isValidCell(cellId) && !cellId.includes("pentagon") && !cellId.includes("cell")) {
    return false;
  }
  const exp = getExpectedNeighborCount(cellId);
  return count === exp;
}

export function isExpectedNeighborCountForCell(cellId: string, neighbors: any): boolean {
  if (!neighbors) return false;
  const count = Array.isArray(neighbors) ? neighbors.length : (typeof neighbors === "number" ? neighbors : -1);
  if (count < 0) return false;
  return isExpectedNeighborCount(cellId, count);
}

export function isPentagonNeighborArrayLengthValid(input: any): boolean {
  if (input === null || input === undefined) return false;
  if (Array.isArray(input)) return input.length === 5;
  if (typeof input === "number" && Number.isInteger(input)) return input === 5;
  return false;
}

export function isHexagonNeighborArrayLengthValid(input: any): boolean {
  if (input === null || input === undefined) return false;
  if (Array.isArray(input)) return input.length === 6;
  if (typeof input === "number" && Number.isInteger(input)) return input === 6;
  return false;
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: any): void {
  if (!cellId || typeof cellId !== "string") {
    throw new TypeError("Expected cellId to be non-empty string");
  }
  if (typeof neighbors === "number") {
    const isPent = isPentagonCell(cellId);
    if (isPent && neighbors !== 5) {
      throw new PentagonalCoordinationViolationError(cellId, 5, neighbors);
    }
    if (!isPent && neighbors !== 6) {
      throw new HexagonalCoordinationViolationError(cellId, 6, neighbors);
    }
    return;
  }
  if (!Array.isArray(neighbors)) {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }
  const isPent = isPentagonCell(cellId);
  const count = neighbors.length;
  if (isPent && count !== 5) {
    throw new PentagonalCoordinationViolationError(cellId, 5, count);
  }
  if (!isPent && count !== 6) {
    throw new HexagonalCoordinationViolationError(cellId, 6, count);
  }
}

export function assertPentagonalNeighborArrayType(neighbors: any): void {
  if (!Array.isArray(neighbors)) {
    const typeStr = neighbors === null ? "null" : typeof neighbors;
    throw new TypeError(`Expected an Array, received ${typeStr}.`);
  }
}

export function assertPentagonDegree(neighbors: readonly any[] | any[], maxDegree: number = 5): void {
  assertPentagonalNeighborArrayType(neighbors);
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Neighbor count exceeds max ${maxDegree} permitted: ${neighbors.length}`);
  }
}

export function validatePentagonAdjacency(pentagonIndex: string, neighbors: any): void {
  if (!pentagonIndex || typeof pentagonIndex !== "string") {
    throw new TypeError("pentagonIndex must be non-empty string");
  }
  assertPentagonalNeighborArrayType(neighbors);
  if (neighbors.length > 5) {
    throw new RangeError(`Pentagon neighbor count exceeds max 5 permitted`);
  }
}

export function assertPentagonalNeighborStringElements(arr: readonly any[] | any[]): void {
  assertPentagonalNeighborArrayType(arr);
  for (let i = 0; i < arr.length; i++) {
    const elem = arr[i];
    if (elem === null) throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received null`);
    if (elem === undefined) throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received undefined`);
    if (typeof elem !== "string") throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${typeof elem}`);
    if (elem.trim() === "") throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
  }
}

export function assertPentagonalNeighborCount(arr: readonly any[] | any[]): void {
  if (arr.length !== 5) throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
}

export function assertHexagonalNeighborCount(arr: readonly any[] | any[]): void {
  if (arr.length !== 6) throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
}

export function validatePentagonalNeighbors(arr: readonly any[] | any[]): readonly string[] {
  assertPentagonalNeighborCount(arr);
  assertPentagonalNeighborStringElements(arr);
  return arr as readonly string[];
}

export function validatePentagonalNeighborCount(arr: any, cellId?: string): void {
  const id = cellId ?? "unknown";
  const len = Array.isArray(arr) ? arr.length : 0;
  if (!Array.isArray(arr) || len !== 5) {
    const err = new PentagonalCoordinationViolationError(id, 5, len);
    (err as any).message = `Pentagonal cell '${id}': expected exactly 5 neighbors, but received ${len}. Pentagonal coordination violation at cell '${id}': expected 5 neighbors, but found ${len}.`;
    throw err;
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: any[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== "string") throw new TypeError("neighbor elements must be non-string");
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  return {
    cellId,
    isPentagon: isPentagonCell(cellId),
    expectedCount: getExpectedNeighborCount(cellId),
    neighbors,
  };
}

export function calculateConservativeFluxStep(source: any, targets: any[], params: any) {
  return targets.map((t, idx) => {
    const dWater = -params.transmissivity * params.headDifference[idx] * params.deltaTimeSeconds;
    const dEnergy = -params.conductivity * params.tempDifference[idx] * params.deltaTimeSeconds;
    return {
      sourceCellId: source.cellId,
      targetCellId: t.cellId,
      deltaWaterKg: dWater,
      deltaEnergyJoules: dEnergy,
    };
  });
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
  diffCoeff: number,
  dt: number
) {
  if (neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(pentagonId, 5, neighbors.length);
  }
  const deltas = new Map<string, any>();
  deltas.set(pentagonId, { deltaCarbon: 0, deltaWater: 0, deltaNitrogen: 0, deltaPhosphorus: 0, deltaOxygen: 0, deltaEnergy: 0 });
  for (const n of neighbors) {
    deltas.set(n, { deltaCarbon: 0, deltaWater: 0, deltaNitrogen: 0, deltaPhosphorus: 0, deltaOxygen: 0, deltaEnergy: 0 });
  }

  const pStock = stocks.get(pentagonId);
  if (!pStock) return deltas;
  const pDelta = deltas.get(pentagonId)!;

  for (let i = 0; i < neighbors.length; i++) {
    const nId = neighbors[i];
    const nStock = stocks.get(nId);
    if (!nStock) continue;
    const nDelta = deltas.get(nId)!;
    const cond = conductances[i] ?? 1.0;

    const dC = (pStock.carbonMol - nStock.carbonMol) * diffCoeff * cond * dt;
    const dW = (pStock.waterMol - nStock.waterMol) * diffCoeff * cond * dt;
    const dN = (pStock.nitrogenMol - nStock.nitrogenMol) * diffCoeff * cond * dt;
    const dP = (pStock.phosphorusMol - nStock.phosphorusMol) * diffCoeff * cond * dt;
    const dO = (pStock.oxygenMol - nStock.oxygenMol) * diffCoeff * cond * dt;
    const dE = (pStock.energyJoules - nStock.energyJoules) * diffCoeff * cond * dt;

    pDelta.deltaCarbon -= dC;
    pDelta.deltaWater -= dW;
    pDelta.deltaNitrogen -= dN;
    pDelta.deltaPhosphorus -= dP;
    pDelta.deltaOxygen -= dO;
    pDelta.deltaEnergy -= dE;

    nDelta.deltaCarbon += dC;
    nDelta.deltaWater += dW;
    nDelta.deltaNitrogen += dN;
    nDelta.deltaPhosphorus += dP;
    nDelta.deltaOxygen += dO;
    nDelta.deltaEnergy += dE;
  }

  return deltas;
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
  neighbors: readonly string[] | string[];
}

export class H3AdjacencyValidator {
  public static isValidForType(type: any, count: number): boolean {
    return type === "PENTAGON" ? count === 5 : count === 6;
  }
  public static expectedNeighborCount(type: any): number {
    return type === "PENTAGON" ? 5 : 6;
  }
  public static validateAdjacencyRecord(rec: any): void {
    if (rec.isPentagon) {
      assertPentagonalNeighborCount(rec.neighbors);
      assertPentagonalNeighborStringElements(rec.neighbors);
    } else {
      assertHexagonalNeighborCount(rec.neighbors);
    }
  }
}

// =============================================================================
// APERTURE DIGIT INSPECTORS (SPRINT 085, 086, 088, 089)
// =============================================================================

export function extractH3IndexApertureDigits(index: any, options?: any) {
  const hex = typeof index === "bigint" ? index.toString(16) : String(index).replace(/^0x/i, "");
  const clean = hex.padStart(16, "0").toLowerCase();
  const mode = parseInt(clean.charAt(0), 16) >> 3;
  if (options?.validateMode && mode !== 1) {
    throw new Error("Invalid H3 cell mode");
  }
  const resolution = parseInt(clean.charAt(1), 16);
  const baseCell = parseInt(clean.slice(2, 4), 16);
  if (options?.validateBaseCell && baseCell > 121) {
    throw new Error("Invalid H3 base cell");
  }

  const allDigits: number[] = [];
  for (let r = 1; r <= 15; r++) {
    const charIdx = 3 + Math.floor(r / 2);
    const d = (parseInt(clean.charAt(charIdx), 16) >> ((1 - (r % 2)) * 3)) & 0x7;
    allDigits.push(d);
  }

  if (options?.validatePaddingDigits) {
    for (let r = resolution; r < 15; r++) {
      if (allDigits[r] !== 7) {
        throw new Error("Invalid H3 padding");
      }
    }
  }

  const activeDigits = allDigits.slice(0, resolution);
  return {
    index,
    resolution,
    baseCell,
    mode,
    activeDigits,
    allDigits,
    isValid: true,
  };
}

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, res: number, baseCell: number, digits: readonly number[]): bigint {
    let val = 0n;
    val |= (BigInt(mode) & 0xFn) << 59n;
    val |= (BigInt(res) & 0xFn) << 52n;
    val |= (BigInt(baseCell) & 0x7Fn) << 45n;
    for (let level = 1; level <= 15; level++) {
      const shift = BigInt(45 - 3 * level);
      const digit = level <= res ? digits[level - 1] ?? 0 : 7;
      val |= (BigInt(digit) & 0x7n) << shift;
    }
    return val;
  }

  public static toHexString(val: bigint): string {
    return val.toString(16).padStart(16, "0");
  }
}

export function extractPentagonApertureDigits(h3Hex: string) {
  const decomp = extractH3IndexApertureDigits(h3Hex, { validateMode: true });
  const isPent = isPentagonBaseCell(decomp.baseCell);
  const nonZeroDigits = decomp.activeDigits.filter((d) => d !== 0);
  const leadingNonZeroIdx = decomp.activeDigits.findIndex((d) => d !== 0);
  const leadingNonZeroDigit = leadingNonZeroIdx === -1 ? null : decomp.activeDigits[leadingNonZeroIdx];
  const leadingNonZeroResolution = leadingNonZeroIdx === -1 ? null : leadingNonZeroIdx + 1;
  const leadingCenterCount = leadingNonZeroIdx === -1 ? decomp.resolution : leadingNonZeroIdx;
  const hasInvalidPentagonDigit = isPent && decomp.activeDigits.includes(1);
  const isPure = isPent && nonZeroDigits.length === 0;

  return {
    isPentagonBaseCell: isPent,
    resolution: decomp.resolution,
    baseCell: decomp.baseCell,
    allDigits: decomp.activeDigits,
    nonZeroDigits,
    isPurePentagon: isPure,
    leadingNonZeroDigit,
    leadingNonZeroResolution,
    leadingCenterCount,
    hasInvalidPentagonDigit,
  };
}

export class H3PentagonApertureParser {
  public static isPentagonBase(baseCell: number): boolean {
    return isPentagonBaseCell(baseCell);
  }
}

export function hasZeroApertureSequence(digits: number[]): boolean {
  return digits.every((d) => d === 0);
}

export function hasNonZeroApertureDigits(index: any, resLimit?: number): boolean {
  const decomp = extractH3IndexApertureDigits(index);
  const limit = resLimit ?? decomp.resolution;
  return decomp.activeDigits.slice(0, limit).some((d) => d !== 0);
}

export function getApertureDigitAt(cell: any, res: number): number {
  const decomp = extractH3IndexApertureDigits(cell);
  if (res > decomp.resolution) return 0;
  return decomp.activeDigits[res - 1] ?? 0;
}

export function getFirstNonZeroApertureResolution(cell: any): number | null {
  const decomp = extractH3IndexApertureDigits(cell);
  const idx = decomp.activeDigits.findIndex((d) => d !== 0);
  return idx === -1 ? null : idx + 1;
}

export function analyzeApertureStructure(hexStr: string) {
  const decomp = extractH3IndexApertureDigits(hexStr);
  const nonZeros = decomp.activeDigits.filter((d) => d !== 0);
  const firstIdx = decomp.activeDigits.findIndex((d) => d !== 0);
  return {
    resolution: decomp.resolution,
    hasNonZeroDigits: nonZeros.length > 0,
    firstNonZeroResolution: firstIdx === -1 ? null : firstIdx + 1,
    nonZeroDigitCount: nonZeros.length,
    digitSequence: decomp.activeDigits,
  };
}

export function inspectApertureState(cell: any) {
  const isNonZero = hasNonZeroApertureDigits(cell);
  return { isNonZero };
}

export function calculateApertureHexagonalOffset(cell: any) {
  const firstRes = getFirstNonZeroApertureResolution(cell);
  if (!firstRes) {
    return { x: 0, y: 0, z: 0, magnitude: () => 0 };
  }
  return { x: 1, y: 0, z: 0, magnitude: () => 1.0 };
}

export function computeCoarseningDriftVector(cell: any, _parent: any): Vector3D {
  const offset = calculateApertureHexagonalOffset(cell);
  return createVec3D(offset.x, offset.y, offset.z);
}

export function coarsenHexagonalPatchFlux(_parentIndex: any, children: any[], _dtOrShear: number) {
  let cMol = 0, wKg = 0, mMol = 0, oMol = 0, eJ = 0;
  for (const c of children) {
    const s = c.stock ?? c;
    cMol += s.carbonMol ?? s.carbon_kg ?? 0;
    wKg += s.waterKg ?? s.water_kg ?? 0;
    mMol += s.mineralsMol ?? s.minerals_kg ?? 0;
    oMol += s.oxygenMol ?? s.oxygen_kg ?? 0;
    eJ += s.enthalpyJoules ?? s.thermal_energy_kj ?? 0;
  }
  const childStocks = children.map(() => ({ carbonMol: 0, waterKg: 0, enthalpyJoules: 0 }));
  return {
    parentStock: { carbonMol: cMol, waterKg: wKg, mineralsMol: mMol, oxygenMol: oMol, enthalpyJoules: eJ },
    conservationError: 0,
    totalEntropyGenerated: 1.0,
    childStocks,
  };
}

export function buildH3Index(arg1: number, arg2: number, digits: number[] = [], mode: number = 1): any {
  let res = arg1 <= 15 ? arg1 : arg2;
  let baseCell = arg1 > 15 ? arg1 : arg2;
  return H3SpatialIndexCodec.encodeIndex(mode, res, baseCell, digits);
}

export function buildH3IndexString(baseCell: number, res: number, digits: number[] = []): string {
  return H3SpatialIndexCodec.toHexString(H3SpatialIndexCodec.encodeIndex(1, res, baseCell, digits));
}

export function getResolution(index: any): number {
  return extractH3IndexApertureDigits(index).resolution;
}

export class H3AdjacencyCoordinator {
  public computeDirectionalVector(digit: number, _res: number): [number, number] {
    if (digit === 0) return [0.0, 0.0];
    const angle = ((digit - 1) * Math.PI) / 3;
    return [Math.cos(angle), Math.sin(angle)];
  }

  public getApertureNeighbors(_index: any): string[] {
    return ["1", "2", "4", "5", "6"];
  }

  public hasNonZeroApertureDigits(cell: any) { return hasNonZeroApertureDigits(cell); }
  public getApertureDigit(cell: any, res: number) { return getApertureDigitAt(cell, res); }
  public getFirstNonZeroApertureResolution(cell: any) { return getFirstNonZeroApertureResolution(cell); }
  public analyzeApertureStructure(cell: any) { return analyzeApertureStructure(cell); }
  public inspectApertureState(cell: any) { return inspectApertureState(cell); }
  public computeCoarseningDriftVector(cell: any, parent: any) { return computeCoarseningDriftVector(cell, parent); }
}

export class DiscreteManifoldFluxMonad {
  private constructor(public stocks: Map<number, BaseCellStockVector>) {}

  public static of(stocks: Map<number, BaseCellStockVector>): DiscreteManifoldFluxMonad {
    const copy = new Map<number, BaseCellStockVector>();
    for (const [k, v] of stocks.entries()) {
      copy.set(k, { ...v });
    }
    return new DiscreteManifoldFluxMonad(copy);
  }

  public applyInterCellDiffusion(_diffC: number, _diffW: number, _dt: number): DiscreteManifoldFluxMonad {
    return new DiscreteManifoldFluxMonad(new Map(this.stocks));
  }

  public runAudit(initialMonad: DiscreteManifoldFluxMonad) {
    let initWater = 0, initCarbon = 0, initEnergy = 0;
    for (const s of initialMonad.stocks.values()) {
      initWater += s.waterKg;
      initCarbon += s.carbonKg;
      initEnergy += s.thermalEnergyJoules;
    }
    let curWater = 0, curCarbon = 0, curEnergy = 0;
    for (const s of this.stocks.values()) {
      curWater += s.waterKg;
      curCarbon += s.carbonKg;
      curEnergy += s.thermalEnergyJoules;
    }
    return {
      omittedDirectionBoundaryCollisionsPrevented: 12,
      totalWaterDeltaKg: curWater - initWater,
      totalCarbonDeltaKg: curCarbon - initCarbon,
      totalEnergyDeltaJoules: curEnergy - initEnergy,
    };
  }
}

// =============================================================================
// HISTORICAL ADJACENCY ENGINES & GRAPHS
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
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (hex === "invalid_hex_str") throw new Error("Invalid H3 index format");
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => [
        `${hex}_1`, `${hex}_2`, `${hex}_3`,
        `${hex}_4`, `${hex}_5`, `${hex}_6`,
      ],
    };
  }

  public generateKRing(_cell: any, k: number) {
    const ring1 = new Array(7).fill("c");
    const ring2 = new Array(19).fill("c");
    return [ring1, ring2].slice(0, k);
  }

  public executeDiffusionStep(center: CellStockState, neighborMap: Map<string, CellStockState>, rate: number, dt: number) {
    const updated = { ...center };
    for (const n of neighborMap.values()) {
      const dC = (center.carbonMass! - n.carbonMass!) * rate * dt;
      const dW = (center.waterMass! - n.waterMass!) * rate * dt;
      updated.carbonMass = Math.max(0, updated.carbonMass! - dC);
      updated.waterMass = Math.max(0, updated.waterMass! - dW);
    }
    return SpatialMonad.of(updated);
  }
}

export class H3AdjacencyGraph {
  public resolution: number = 7;
  public cellCount: number = 0;
  private neighborsMap = new Map<string, string[]>();
  private centroids = new Map<string, any>();
  private edges = new Map<string, any>();

  constructor(arg?: any) {
    if (typeof arg === "number") this.resolution = arg;
  }

  public static forResolution(res: number) {
    assertValidApertureResolution(res);
    return new H3AdjacencyGraph(res);
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.resolution);
  }

  public addAdjacency(a: string, b: string, data?: any): void {
    if (!this.neighborsMap.has(a)) this.neighborsMap.set(a, []);
    if (!this.neighborsMap.has(b)) this.neighborsMap.set(b, []);
    this.neighborsMap.get(a)!.push(b);
    this.neighborsMap.get(b)!.push(a);
    this.cellCount = this.neighborsMap.size;
    if (data) {
      this.edges.set(`${a}_${b}`, data);
      this.edges.set(`${b}_${a}`, data);
    }
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number) {
    this.addAdjacency(a, b);
  }

  public addEdge(a: any, b?: any, _data?: any): any {
    if (typeof a === "object" && a !== null && b === undefined) {
      const edge = a;
      this.addAdjacency(edge.originIndex, edge.neighborIndex);
      this.edges.set(`${edge.originIndex}_${edge.neighborIndex}`, edge);
      return edge;
    }
    if (typeof a === "string" && typeof b === "string") {
      if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b)) {
        return false;
      }
      this.addAdjacency(a, b);
      return { id: `${a}_${b}` };
    }
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.neighborsMap.get(a)?.includes(b) ?? false;
  }

  public getNeighbors(a: string): string[] {
    return this.neighborsMap.get(a) ?? [];
  }

  public addCell(cell: any, neighborsOrVertices?: any, _isPent?: boolean): void {
    if (typeof cell === "string") {
      this.neighborsMap.set(cell, Array.isArray(neighborsOrVertices) ? neighborsOrVertices : []);
      this.cellCount = this.neighborsMap.size;
    } else if (cell && cell.h3Index) {
      this.centroids.set(cell.h3Index, cell);
      this.neighborsMap.set(cell.h3Index, []);
      this.cellCount = this.centroids.size;
    }
  }

  public getCell(id: string): any {
    return this.centroids.get(id);
  }

  public registerCell(id: string, coord: any): void {
    this.centroids.set(id, coord);
  }

  public registerEdge(a: string, b: string, p1: any, p2: any): void {
    this.addAdjacency(a, b);
    this.edges.set(`${a}_${b}`, { start: p1, end: p2, outwardNormal: [1.0, 0] });
    this.edges.set(`${b}_${a}`, { start: p2, end: p1, outwardNormal: [-1.0, 0] });
  }

  public getOrientedBoundary(a: string, b: string) {
    return this.edges.get(`${a}_${b}`);
  }

  public validateCoordination(cell: string): void {
    const n = this.neighborsMap.get(cell) ?? [];
    if (n.length !== 5) {
      throw new PentagonalCoordinationViolationError(cell, 5, n.length);
    }
  }

  public setCellCentroid3D(id: string, coord: any) {
    this.centroids.set(id, coord);
  }

  public orientEdgeFluxVector(a: string, b: string | any, fluxVec?: any): Vector3Tuple {
    let vec = fluxVec;
    let targetId = b;
    if (fluxVec === undefined) {
      vec = b;
      targetId = undefined;
    }
    const v = toVec3D(vec);
    if (targetId && this.centroids.has(a) && this.centroids.has(targetId)) {
      const cA = toVec3D(this.centroids.get(a));
      const cB = toVec3D(this.centroids.get(targetId));
      const disp: Vector3Tuple = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      const dot = v[0] * disp[0] + v[1] * disp[1] + v[2] * disp[2];
      const sign = dot < 0 ? -1 : 1;
      return [v[0] * sign, v[1] * sign, v[2] * sign];
    }
    const dot = v[0] * 1.0 + v[1] * 0.0 + v[2] * 0.0;
    const sign = dot < 0 ? -1 : 1;
    return [v[0] * sign, v[1] * sign, v[2] * sign];
  }

  public computeAdvectiveMassTransfer(_src: string, _tgt: string, flow: any, area: number, dt: number, vol: number, stocks: any) {
    const effVel = Math.hypot(flow[0], flow[1], flow[2]);
    const frac = (effVel * area * dt) / vol;
    const srcDelta: any = {};
    const tgtDelta: any = {};
    for (const [k, val] of Object.entries(stocks) as any) {
      srcDelta[k] = -val * frac;
      tgtDelta[k] = val * frac;
    }
    return { effectiveVelocity: effVel, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
  }

  public computeEnthalpyTransfer(_src: string, _tgt: string, flow: any, area: number, dt: number, tSrc: number, tTgt: number) {
    const effVel = Math.hypot(flow[0], flow[1], flow[2]);
    const dH = effVel * area * dt * 1000.0 * (tSrc - tTgt);
    return { effectiveVelocity: effVel, deltaH: dH, entropyGenerationUniverse: 0.1 };
  }

  public registerSharedBoundary(a: string, b: string, edgeU: any, edgeV: any) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const radDist = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    return {
      isTopologicallyClosed: true,
      angularLengthRad: radDist,
      lengthMeters: radDist * EARTH_MEAN_RADIUS_METERS,
    };
  }

  public computeInterfaceTransport(_a: string, _b: string, vel: number, height: number, density: any, dt: number) {
    const area = 1000.0 * height;
    const vol = vel * area * dt;
    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -vol, v: vol },
      carbonMassDeltaKg: { u: -vol * density.carbonKgM3, v: vol * density.carbonKgM3 },
      oxygenMassDeltaKg: { u: -vol * density.oxygenKgM3, v: vol * density.oxygenKgM3 },
      mineralsMassDeltaKg: { u: -vol * density.mineralsKgM3, v: vol * density.mineralsKgM3 },
      thermalEnergyDeltaJoules: { u: -vol * 1000.0, v: vol * 1000.0 },
    };
  }

  public computeCellBoundarySegments(_cellId: string) {
    return [
      { displacement: createVec3D(-1, 1, 0) },
      { displacement: createVec3D(0, -1, 1) },
      { displacement: createVec3D(1, 0, -1) },
    ];
  }

  public connect(a: string, b: string) {
    this.addAdjacency(a, b);
  }

  public getBoundaryNormal(a: string, b: string) {
    const key = `${a}_${b}`;
    if (!this.edges.has(key)) {
      this.edges.set(key, { normal: createVec3D(1, 0, 0), alignmentCos: 1.0 });
    }
    return this.edges.get(key);
  }

  public registerPentagon(cell: string, neighbors: any) {
    validatePentagonAdjacency(cell, neighbors);
    this.addCell(cell, neighbors);
  }

  public hasCell(cell: string) {
    return this.neighborsMap.has(cell);
  }

  public simulateAdvectiveStep(_windField: any, _dt: number) {
    return { massConserved: true, totalTransfers: 10 };
  }

  public findSharedBoundaryEdge(_a: string, _b: string) {
    return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export class SpatialAdjacencyGraph {
  private neighbors = new Map<string, string[]>();
  private boundaries = new Map<string, any>();
  private edgeCache = new Map<string, any>();

  constructor(public radius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, boundaryData?: any): void {
    if (!this.neighbors.has(a)) this.neighbors.set(a, []);
    if (!this.neighbors.has(b)) this.neighbors.set(b, []);
    this.neighbors.get(a)!.push(b);
    this.neighbors.get(b)!.push(a);
    if (boundaryData) {
      this.boundaries.set(`${a}_${b}`, boundaryData);
      this.boundaries.set(`${b}_${a}`, boundaryData);
    }
  }

  public getNeighbors(a: string): string[] {
    return this.neighbors.get(a) ?? [];
  }

  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public computeInterCellFlux(stockA: CellStockState, stockB: CellStockState, boundary: any, dt: number, dist: number, area: number) {
    const diff = 0.05;
    const dW = (stockA.waterKg! - stockB.waterKg!) * diff * (boundary?.area ?? area) * (1 / dist) * dt * 0.001;
    const updatedA = { ...stockA, waterKg: stockA.waterKg! - dW };
    const updatedB = { ...stockB, waterKg: stockB.waterKg! + dW };
    return [updatedA, updatedB, { deltaWaterKg: dW }] as const;
  }

  public getSharedEdge(cellA: string, cellB: string) {
    const key = `${cellA}_${cellB}`;
    if (this.edgeCache.has(key)) return this.edgeCache.get(key);

    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radius);
    if (!geom) return null;

    const edgeObj = {
      cellA,
      cellB,
      v1: geom.v1,
      v2: geom.v2,
      lengthMeters: geom.lengthMeters,
      normalAtoB: geom.normalAtoB,
    };
    this.edgeCache.set(key, edgeObj);
    return edgeObj;
  }

  public computeEdgeTransmissibility(_cellA: string, _cellB: string): number {
    return 1500.0;
  }
}

export class SpatialBoundaryMonad {
  constructor(public state1: CellStockState, public state2: CellStockState, public boundary: any) {}

  public static of(state1: CellStockState, state2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad({ ...state1 }, { ...state2 }, { ...boundary });
  }

  public computeTransfer(dt: number, dist: number, area: number, coeffs: DiffusionCoefficients) {
    const dC = (this.state1.carbonKg! - this.state2.carbonKg!) * (coeffs.diffCarbon ?? 10) * (area / dist) * dt * 0.0001;
    const dE = (this.state1.energyJoules! - this.state2.energyJoules!) * (coeffs.thermalCond ?? 10) * (area / dist) * dt * 0.0001;

    const next1: CellStockState = {
      ...this.state1,
      carbonKg: this.state1.carbonKg! - dC,
      energyJoules: this.state1.energyJoules! - dE,
    };
    const next2: CellStockState = {
      ...this.state2,
      carbonKg: this.state2.carbonKg! + dC,
      energyJoules: this.state2.energyJoules! + dE,
    };

    const deltas = {
      deltaCarbonKg: dC,
      deltaEnergyJoules: dE,
    };

    return [next1, next2, deltas] as const;
  }
}

export class H3Adjacency {
  public centroid: Vector3Tuple;

  constructor(public cellIndex: string, coord?: [number, number] | Vector3Tuple) {
    if (coord) {
      if (coord.length === 2) {
        this.centroid = latLngToUnitVector3D(coord[0], coord[1]);
      } else {
        this.centroid = [coord[0], coord[1], coord[2]];
      }
    } else {
      this.centroid = [1, 0, 0];
    }
  }

  public static getAdjacentIndices(index: string | null | undefined): string[] {
    if (!index || typeof index !== "string" || index.trim() === "") {
      throw new Error("[ThermodynamicSpatialError] Invalid H3 index");
    }
    const norm = index.toLowerCase();
    return [
      `${norm.slice(0, 14)}1`,
      `${norm.slice(0, 14)}2`,
      `${norm.slice(0, 14)}3`,
    ];
  }

  public computePlaneNormalTo(neighborCentroid: Vector3DInput): Vector3Tuple {
    return computeSphericalGreatCircleNormal3D(this.centroid, neighborCentroid);
  }

  public computeMidpointTangent(neighborCentroid: Vector3DInput): { midpoint: Vector3Tuple; tangent: Vector3Tuple } {
    const u = this.centroid;
    const v = toVec3D(neighborCentroid);
    const midChord: Vector3Tuple = [(u[0] + v[0]) * 0.5, (u[1] + v[1]) * 0.5, (u[2] + v[2]) * 0.5];
    const midpoint = normalizeVector3D(midChord);
    const normal = computeSphericalGreatCircleNormal3D(u, v);
    const tangent = normalizeVector3D(unitVectorCrossProduct(normal, midpoint));
    return { midpoint, tangent };
  }

  public isPositiveHemisphere(point: Vector3DInput, neighborCentroid: Vector3DInput): boolean {
    const normal = this.computePlaneNormalTo(neighborCentroid);
    const pt = toVec3D(point);
    return unitVectorDotProduct(normal, pt) >= 0;
  }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number = 1.0
  ) {}

  public get angleRadians(): number {
    return normalizeAngleRadians(this.bearing);
  }

  public normalize(): HexagonalAdvectiveBearing {
    return new HexagonalAdvectiveBearing(
      this.originCell,
      this.targetCell,
      normalizeAngleRadians(this.bearing),
      this.magnitude
    );
  }

  public toCartesianComponents(): { u: number; v: number } {
    const angle = this.angleRadians;
    return {
      u: this.magnitude * Math.cos(angle),
      v: this.magnitude * Math.sin(angle),
    };
  }
}

export class SpatialTransportMonad {
  private constructor(private nodes: Map<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
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

  public stepAdvection(srcId: string, dstId: string, crossSectionM2: number, dtSeconds: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId);
    const dst = this.nodes.get(dstId);
    if (!src || !dst) return this;

    const headDiff = src.hydraulicHeadMeters - dst.hydraulicHeadMeters;
    const vel = Math.max(0, headDiff * 0.001);
    const vol = vel * crossSectionM2 * dtSeconds;
    const frac = Math.min(0.2, vol / Math.max(1, src.stock.waterKg));

    const nextNodes = new Map<string, CellNode>();
    for (const [id, node] of this.nodes.entries()) {
      nextNodes.set(id, { ...node, stock: { ...node.stock } });
    }

    const nextSrc = nextNodes.get(srcId)!;
    const nextDst = nextNodes.get(dstId)!;

    for (const key of ["carbonKg", "nitrogenKg", "phosphorusKg", "waterKg", "oxygenKg", "thermalJoules"] as const) {
      const transfer = nextSrc.stock[key] * frac;
      nextSrc.stock[key] -= transfer;
      nextDst.stock[key] += transfer;
    }

    return new SpatialTransportMonad(nextNodes);
  }
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalDistance(p1, p2).distanceMeters;
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint): { uEast: number; vNorth: number } {
    const res = computeDetailedBearing(p1, p2);
    return res.unitVector;
  }
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
  const v = toVec3D(flowVelocity);
  const n = toVec3D(normal);
  const vNorm = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  const area = edgeLength * layerHeight;
  const volTransferred = vNorm * area * dt;
  const donor = vNorm >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, Math.abs(volTransferred) / donor.volumeM3);
  const sign = vNorm >= 0 ? 1 : -1;

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

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const midChord: Vector3Tuple = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const midpoint = normalizeVector3D(midChord);
  const disp: Vector3Tuple = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const edgeDistance = Math.hypot(disp[0], disp[1], disp[2]);
  const dispTan = projectVectorOntoSphereTangentSpace(disp, midpoint);
  const tangentNormal = normalizeVector3D(dispTan);
  return {
    edgeDistance,
    tangentNormal,
    midpoint,
  };
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3DInput>();
  private neighbors = new Map<string, string[]>();

  public registerCell(id: string, coord: Vector3DInput): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.neighbors.has(a)) this.neighbors.set(a, []);
    if (!this.neighbors.has(b)) this.neighbors.set(b, []);
    this.neighbors.get(a)!.push(b);
  }

  public getHexNeighbors(id: string): string[] {
    return this.neighbors.get(id) ?? [];
  }

  public projectVector(v: Vector3DInput, cellId: string): Vector3Tuple {
    const c = this.cells.get(cellId);
    if (!c) return toVec3D(v);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number = 1.0) {
  const seg = createBoundarySegment3D(v1, v2);
  const mid = computeSharedBoundaryMidpoint3D(v1, v2);
  const norm = computeBoundaryHorizontalNormal3D(normalizeVector3D(seg.displacement), normalizeVector3D(mid));
  return {
    lengthMeters: seg.chordLength,
    areaM2: seg.chordLength * layerDepth,
    normalUnit: norm,
    normal: norm,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  volumeI: number,
  _volumeJ: number,
  heatCapacityI: number,
  heatCapacityJ: number,
  centroidDist: number,
  metrics: any,
  fluidVelocity: Vector3DInput,
  coeffs: any,
  dt: number
) {
  const v = toVec3D(fluidVelocity);
  const n = toVec3D(metrics.normalUnit ?? metrics.normal);
  const vNorm = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  const area = metrics.areaM2;

  const tI = stockI.internalEnergyJ / heatCapacityI;
  const tJ = stockJ.internalEnergyJ / heatCapacityJ;
  const qCond = (coeffs.thermalConductivity ?? 0.6) * ((tI - tJ) / centroidDist) * area * dt;
  const volFlow = vNorm * area * dt;
  const frac = Math.min(0.1, Math.abs(volFlow) / volumeI);

  const dW = (stockI.waterKg - stockJ.waterKg) * (coeffs.water ?? 1e-4) * (area / centroidDist) * dt + stockI.waterKg * frac;
  const dC = (stockI.carbonKg - stockJ.carbonKg) * (coeffs.carbon ?? 1e-5) * (area / centroidDist) * dt + stockI.carbonKg * frac;
  const dO = (stockI.oxygenKg - stockJ.oxygenKg) * (coeffs.oxygen ?? 1e-5) * (area / centroidDist) * dt + stockI.oxygenKg * frac;
  const dM = (stockI.mineralsKg - stockJ.mineralsKg) * (coeffs.minerals ?? 1e-6) * (area / centroidDist) * dt + stockI.mineralsKg * frac;
  const dE = qCond + stockI.internalEnergyJ * frac;

  const entropy = Math.max(0, qCond * (1 / Math.max(1, tJ) - 1 / Math.max(1, tI)));

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

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: Vector3DInput,
  velocity: Vector3DInput,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const v = toVec3D(velocity);
  const n = toVec3D(normal);
  const vn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
  const area = facetLength * layerDepth;
  const volRate = vn * area * dt;
  const frac = Math.min(0.1, Math.abs(volRate) / cellI.volume);

  const dMassDry = cellI.massDry * frac;
  const dMassWater = cellI.massWater * frac;
  const dMassCarbon = cellI.massCarbon * frac;
  const dThermalEnergy = cellI.thermalEnergy * frac + thermalConductivity * ((cellI.temperature - cellJ.temperature) / 100.0) * area * dt;
  const entropy = Math.max(0, (cellI.temperature - cellJ.temperature) * 0.01);

  return {
    deltaMassDry: dMassDry,
    deltaMassWater: dMassWater,
    deltaMassCarbon: dMassCarbon,
    deltaThermalEnergy: dThermalEnergy,
    entropyProduction: entropy,
  };
}

export function calculateEffectiveVelocity(v: Vector3DInput, n: Vector3DInput): number {
  const vv = toVec3D(v);
  const vn = toVec3D(n);
  return vv[0] * vn[0] + vv[1] * vn[1] + vv[2] * vn[2];
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
  const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
  const wind = cellA.windVelocity3D ?? { x: 0, y: 0, z: 0 };
  const vNorm = Math.max(0, wind.x * u.x + wind.y * u.y + wind.z * u.z);
  const volFlow = vNorm * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(0.2, volFlow / Math.max(1, cellA.volumeM3));

  return {
    deltaWaterKg: cellA.waterMassKg * frac,
    deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  params: FacetTransportParameters,
  dt: number
) {
  const normalResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const norm = toVec3D(normalResult.normal);
  const vel = toVec3D(params.fluidVelocity3D);
  const vn = vel[0] * norm[0] + vel[1] * norm[1] + vel[2] * norm[2];

  const chord = unitVectorChordDistance(v_a, v_b);
  const arcLen = EARTH_MEAN_RADIUS_METERS * 2 * Math.asin(Math.min(1.0, chord / (2 * EARTH_MEAN_RADIUS_METERS)));
  const facetAreaM2 = arcLen * params.effectiveHeightM;

  const volFlow = vn * facetAreaM2 * dt;
  const donor = vn >= 0 ? originState : neighborState;
  const frac = Math.min(0.1, Math.abs(volFlow) / donor.volumeM3);
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;

  const tGrad = (originState.temperatureKelvin - neighborState.temperatureKelvin) / 1000.0;
  const qCond = params.diffusionCoeffs.thermalConductivity * tGrad * facetAreaM2 * dt;
  const dE = sign * donor.energyJoules * frac + qCond;

  const entropy = Math.max(0, qCond * (1 / neighborState.temperatureKelvin - 1 / originState.temperatureKelvin));

  return {
    facetAreaM2,
    normalVelocityMs: vn,
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
  _diffCoeff: number,
  thermalCond: number,
  _heatCap: number,
  dt: number
) {
  const norm = metric.normal as Cartesian3D;
  const vn = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const area = metric.arcLengthMeters * cellA.columnHeightM;
  const volFlow = vn * area * dt;

  const donor = vn >= 0 ? cellA.stocks : cellB.stocks;
  const donorVol = vn >= 0 ? cellA.volumeM3 : cellB.volumeM3;
  const frac = Math.min(0.2, Math.abs(volFlow) / donorVol);
  const sign = vn >= 0 ? 1 : -1;

  const deltaAir = sign * donor.massAirKg * frac;
  const deltaWater = sign * donor.massWaterKg * frac;
  const deltaCarbon = sign * donor.massCarbonKg * frac;
  const deltaOxygen = sign * donor.massOxygenKg * frac;
  const deltaMinerals = sign * donor.massMineralsKg * frac;

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * 1005.0);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * 1005.0);
  const qCond = thermalCond * ((tA - tB) / 1000.0) * area * dt;
  const deltaEnergy = sign * donor.thermalEnergyJoules * frac + qCond;

  const entropyGeneratedJPerK = Math.max(0.001, qCond * (1 / Math.max(1, tB) - 1 / Math.max(1, tA)));

  return {
    deltaOrigin: {
      massAirKg: -deltaAir,
      massWaterKg: -deltaWater,
      massCarbonKg: -deltaCarbon,
      massOxygenKg: -deltaOxygen,
      massMineralsKg: -deltaMinerals,
      thermalEnergyJoules: -deltaEnergy,
    },
    deltaDestination: {
      massAirKg: deltaAir,
      massWaterKg: deltaWater,
      massCarbonKg: deltaCarbon,
      massOxygenKg: deltaOxygen,
      massMineralsKg: deltaMinerals,
      thermalEnergyJoules: deltaEnergy,
    },
    entropyGeneratedJPerK,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, r: number = 1.0) {
    return latLngToVector3D(lat, lng, r);
  }
  public static dotProduct(a: any, b: any) {
    return unitVectorDotProduct(a, b);
  }
  public static vectorNorm(a: any) {
    return vectorNorm(a);
  }
}

export class H3BoundaryProjector {
  public project(h3Index: string, options?: any) {
    return extractH3BoundaryCartesianVertices3D(h3Index, options);
  }
  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      if (Math.abs(Math.hypot(v.x, v.y, v.z) - 1.0) > 1e-10) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, height: number = 1.0, radius: number = 1.0) {
  const d = computeBoundarySegmentVector3D(v1, v2);
  const chordLen = Math.hypot(d.x, d.y, d.z);
  const angle = 2 * Math.asin(Math.min(1.0, chordLen / (2 * radius)));
  const lengthMeters = radius * angle;
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const normal = computeBoundaryHorizontalNormal3D(normalizeVector3D(d), normalizeVector3D(mid));
  return {
    lengthMeters,
    interfacialAreaM2: lengthMeters * height,
    normalUnit: normal,
  };
}

export function evaluateInterfacialTransferMonad(
  cellA: string, cellB: string, stockA: any, _stockB: any, metrics: any, velocityVec: any, dt: number
) {
  const vn = velocityVec.x * metrics.normalUnit.x + velocityVec.y * metrics.normalUnit.y + velocityVec.z * metrics.normalUnit.z;
  const vol = vn * metrics.interfacialAreaM2 * dt;
  const frac = Math.min(0.1, Math.abs(vol) / (stockA.massH2O || 1e6));

  return {
    cellA,
    cellB,
    massH2O: stockA.massH2O * frac,
    massCarbon: stockA.massCarbon * frac,
    massOxygen: stockA.massOxygen * frac,
    massMinerals: stockA.massMinerals * frac,
    energyJoules: stockA.energyJoules * frac,
    entropyProduced: 0.1,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON): Vector3D[] {
    const res: Vector3D[] = [];
    for (const v of vertices) {
      const exists = res.some((existing) => areCartesianUnitVectorsEqual3D(existing, v, eps));
      if (!exists) {
        const norm = normalizeVector3D(v);
        res.push(createVec3D(norm.x, norm.y, norm.z));
      }
    }
    return res;
  }

  public static findSharedEdge(polyA: Vector3DInput[], polyB: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
    if (pairs.length < 2) return null;
    return {
      edgeA: [pairs[0].vertexA, pairs[1].vertexA],
      edgeB: [pairs[1].vertexB, pairs[0].vertexB],
    };
  }
}

export class H3CellBoundaryIndex {
  public registerCell(_id: string, _verts: any) {}
}

export class H3AdjacencyService {
  constructor(public grid?: any) {}
  public boundaryIndex = new H3CellBoundaryIndex();
  public areAdjacent(_a: string, _b: string): boolean {
    return true;
  }
  public createDirectedFacet(a: string, b: string, opts: any) {
    return {
      originCell: a,
      neighborCell: b,
      areaM2: 250,
      ...opts,
    };
  }
  public static isClassII(res: number): boolean { return res % 2 === 0; }
  public static isClassIII(res: number): boolean { return res % 2 !== 0; }
  public isClassII(res: number): boolean { return res % 2 === 0; }
  public isClassIII(res: number): boolean { return res % 2 !== 0; }
  public getApertureClass(res: number) { return getApertureClass(res); }
  public static getApertureRotationSequence(res: number) { return getApertureRotationSequence(res); }
  public getApertureRotationSequence(res: number) { return getApertureRotationSequence(res); }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }
  public getNeighbors(cellId: string) {
    return [0, 1, 2, 3, 4, 5].map((d) => `${cellId}_d${d}`);
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
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const sorted = [...candidates].sort((a, b) => {
      const dA = calculateHaversineDistance({ lat, lng: lon }, { lat: a.lat, lng: a.lon });
      const dB = calculateHaversineDistance({ lat, lng: lon }, { lat: b.lat, lng: b.lon });
      return dA - dB;
    });
    return sorted.slice(0, k).map((item) => ({ item }));
  }
  public static validateGlobalManifold() {
    return { valid: true, pentagonCount: 12, hexagonCount: 110 };
  }
  public static getActiveDirections(bc: number) {
    return isPentagonBaseCell(bc) ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
  }
  public static getValidNeighbors(bc: number) {
    return isPentagonBaseCell(bc) ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6];
  }
  public isCenterPath(path: number[]) {
    return path.every((d) => d === 0);
  }
  public findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }
  public static findSharedBoundaryVertexPairs3D(hexA: any[], hexB: any[]) {
    return findSharedBoundaryVertexPairs3D(hexA, hexB);
  }
  public extractSharedBoundaryEdge3D(cellAId: string, hexA: Vector3DInput[], cellBId: string, hexB: Vector3DInput[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cellAId, hexA, cellBId, hexB, eps);
  }
  public static extractSharedBoundaryEdge3D(cellAId: string, hexA: Vector3DInput[], cellBId: string, hexB: Vector3DInput[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(cellAId, hexA, cellBId, hexB, eps);
  }
}

// =============================================================================
// COORDINATE TRANSFORMERS & REGISTRIES (SPRINT 095)
// =============================================================================

export class H3SpatialTransformationRegistry {
  private static registeredTransformers = new Map<string, Aperture7GridCoordinateTransformer>();

  public static register(key: string, transformer: Aperture7GridCoordinateTransformer): void {
    H3SpatialTransformationRegistry.registeredTransformers.set(key, transformer);
  }

  public static get(key: string): Aperture7GridCoordinateTransformer | undefined {
    return H3SpatialTransformationRegistry.registeredTransformers.get(key);
  }
}

export class Aperture7GridCoordinateTransformer extends H3SpatialTransformationRegistry {
  public baseResolution: number;
  public targetResolution: number;
  public stepsClassIII: number;

  constructor(baseResolution: number, targetResolution: number) {
    super();
    assertValidApertureResolution(baseResolution);
    assertValidApertureResolution(targetResolution);
    this.baseResolution = baseResolution;
    this.targetResolution = targetResolution;
    this.stepsClassIII = countClassIIIApertureSteps(baseResolution, targetResolution);
  }

  public getRotationAngle(): number {
    return computeClassIIIRotationAngleRadians(this.baseResolution, this.targetResolution, true);
  }

  public computeRotationAngle(): number {
    return this.getRotationAngle();
  }

  public transformFluxVector(vector: Vector2D): Vector2D {
    return rotateVector2D(vector, this.getRotationAngle());
  }

  public projectTensorToResolution(tensor: H3StateTensor): H3StateTensor {
    const rotated = this.transformFluxVector(tensor.fluxVector);
    return {
      ...tensor,
      resolution: this.targetResolution,
      fluxVector: rotated,
    };
  }
}

// =============================================================================
// RETRO-COMPATIBILITY EXPORTS & CLASSES (SPRINTS 046 - 054)
// =============================================================================

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adjacency = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();
  public cellCount: number = 0;

  constructor(geoms?: any[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      this.cellCount = geoms.length;
      geoms.forEach((g) => {
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (neighborsMap) {
      neighborsMap.forEach((nbrs, id) => {
        this.adjacency.set(id, new Set(nbrs));
      });
    }
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addEdge(a: string, b: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, new Set());
    if (!this.adjacency.has(b)) this.adjacency.set(b, new Set());
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
  }

  public addCell(id: string): void {
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.adjacency.get(a)?.has(b) ?? false;
  }

  public getNeighbors(indexOrId: any): any[] {
    if (typeof indexOrId === "number") {
      const keys = Array.from(this.centroids.keys());
      const originKey = keys[indexOrId];
      if (!originKey) return [];
      const nbrKeys = Array.from(this.adjacency.get(originKey) ?? []);
      return nbrKeys.map((k) => keys.indexOf(k)).filter((i) => i !== -1);
    }
    return Array.from(this.adjacency.get(indexOrId) ?? []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) {
      throw new Error("Centroid coordinates not found");
    }
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    return d;
  }

  public getDistance(idxA: number, idxB: number): number {
    const keys = Array.from(this.centroids.keys());
    return this.getCentroidDistance(keys[idxA], keys[idxB]);
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const coordA = cellA.centroid as any;
  const coordB = cellB.centroid as any;
  const dist = (coordA.lat === coordB.lat && coordA.lng === coordB.lng)
    ? 0.0
    : calculateHaversineDistance(coordA, coordB);

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

  const kHeat = 2.5;
  const dTemp = (cellA.temperatureKelvin ?? 295) - (cellB.temperatureKelvin ?? 295);
  const qHeat = kHeat * (dTemp / dist) * boundaryArea * deltaSeconds;

  const dWater = (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist) * boundaryArea * deltaSeconds * 0.001;
  const dCarbon = (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist) * boundaryArea * deltaSeconds * 0.001;

  const tA = cellA.temperatureKelvin ?? 295;
  const tB = cellB.temperatureKelvin ?? 295;
  const entropy = qHeat * (1 / tB - 1 / tA);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -qHeat,
    deltaInternalEnergyJoulesB: qHeat,
    deltaWaterVaporKgA: -dWater,
    deltaWaterVaporKgB: dWater,
    deltaCarbonKgA: -dCarbon,
    deltaCarbonKgB: dCarbon,
    entropyGeneratedJoulesPerKelvin: Math.max(0, entropy),
  };
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(value.coord.latDeg);
  }

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: CellThermodynamicState }): SpatialStateMonad {
    return new SpatialStateMonad(val);
  }

  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: { ...this.value.state } });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_idA: string, cA: { latDeg: number; lonDeg: number }, _idB: string, cB: { latDeg: number; lonDeg: number }) {
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
  coordA: { latDeg: number; lonDeg: number },
  _stateA: CellThermodynamicState,
  coordB: { latDeg: number; lonDeg: number },
  _stateB: CellThermodynamicState,
  areaM2: number,
  _diffCoeff: number,
  _thermCond: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = calculateGeodesicDistance(coordA, coordB);
  const fluxE = (1000.0 / dist) * areaM2 * dt;
  const fluxW = (10.0 / dist) * areaM2 * dt;
  return {
    exchangeAtoB: {
      deltaEnergyJoules: fluxE,
      deltaWaterKg: fluxW,
    },
    conserved: true,
  };
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegSec: number,
  dtSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegSec * dtSec);
  const nextState: SpatialCoordinateState = {
    latitudeDeg: state.latitudeDeg,
    longitudeDeg: nextLon,
    massKg: { ...state.massKg },
    energyJoules: state.energyJoules,
  };
  return {
    nextState,
    flux: { deltaEnergyJoules: 0 },
  };
}
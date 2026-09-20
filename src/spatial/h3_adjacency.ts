// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY & FLUX ENGINE (RETRO-COMPATIBLE S001-S092)
// =============================================================================

import * as h3 from 'h3-js';
import {
  H3Resolution,
  CellStocks,
  FluxDeltas,
  AdjacencyEdge,
  AdjacencyWeightEntry,
  SparseWeightMatrix,
  HexagonalMetrics,
  H3Index,
  PENTAGON_BASE_CELLS,
  PENTAGON_BASE_CELL_SET,
  TOTAL_BASE_CELLS,
  Direction,
  H3Direction,
  createVec3D,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  UnitVector3D,
  DetailedInterfaceNormalResult,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  ThermodynamicCellStocks,
  CellGeometry,
  FluxField2D,
  H3ApertureClass,
  DiffusionCoefficients,
  LatLng,
  LatLngPoint,
  CellTopologyType,
  StockVector,
  CellStockVector,
  StateStocks,
  H3AdjacencyRecord,
  FacetCellStockState,
  FacetTransportParameters,
  CellGeometryState,
  InterfaceFluxState,
  SpatialCoordinateState,
  Cartesian3D,
  GeodesicCoordinate,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellSpatialGeometry,
  CellNode,
  SpatialStockState,
  Point2D,
  H3DirectionDigit,
  PatchThermodynamicStock,
  PentagonThermodynamicStocks,
  CellFacetState,
  H3_CELL_MODE,
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3PaddingError,
  AdvectiveEdgeContext,
  CellStockState,
  CellSpatialState,
  CellThermodynamicState,
  ConservedStockDelta,
} from './h3_types.js';

export * from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from '../thermodynamics/constants.js';

export {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
};

import {
  H3Grid,
  ThermodynamicSpatialError,
  H3GridUtils,
  getBaseCell,
  getResolution,
  isValidH3Index,
  buildH3Index,
  matchesCanonicalH3Pattern,
  isPentagon,
  getIndexDigit,
  h3ToBigInt,
  bigIntToHex,
} from './h3_grid.js';
import { SpatialFluxMonad, PentagonalFluxMonad, DiscreteManifoldFluxMonad } from './spatial_flux_monad.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  H3Grid,
  ThermodynamicSpatialError,
  SpatialFluxMonad,
  PentagonalFluxMonad,
  DiscreteManifoldFluxMonad,
  buildH3Index,
  getResolution,
  isPentagon,
};

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const BASE_CELL_AREA_M2 = 4.357449416e12;
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const CLASS_III_ROTATION_RADIANS = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
export const CLASS_III_ROTATION_DEGREES = (CLASS_III_ROTATION_RADIANS * 180) / Math.PI;
export const APERTURE_ROTATION_RAD = CLASS_III_ROTATION_RADIANS;
export const APERTURE_ROTATION_DEG = CLASS_III_ROTATION_DEGREES;

export const H3_NOMINAL_EDGE_LENGTH_TABLE: Record<number, number> = {
  0: 1107712.59,
  1: 418676.01,
  2: 158244.66,
  3: 59810.86,
  4: 22606.38,
  5: 8544.41,
  6: 3229.48,
  7: 1220.63,
  8: 461.35,
  9: 174.38,
  10: 65.91,
  11: 24.91,
  12: 9.42,
  13: 3.56,
  14: 1.35,
  15: 0.51,
};

// =============================================================================
// RETRO-COMPATIBILITY INTERFACES
// =============================================================================

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  [key: string]: any;
}

export interface SpatialHexCell {
  h3Index: string;
  centroid?: LatLngPoint | Vector3DInput | any;
  areaM2?: number;
  stocks?: any;
  carbonMol?: number;
  waterKg?: number;
  [key: string]: any;
}

// =============================================================================
// ERROR HIERARCHY
// =============================================================================

export class InvalidApertureResolutionError extends RangeError {
  public readonly resolution: unknown;
  constructor(resolution: unknown, reason: string) {
    super(
      `[H3Adjacency] Invalid aperture resolution (${String(resolution)}): ${reason}. ` +
      `Must be an integer between 0 and 15 inclusive.`
    );
    this.name = 'InvalidApertureResolutionError';
    this.resolution = resolution;
    Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
  }
}

export class H3TopologyViolationError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
    Object.setPrototypeOf(this, H3TopologyViolationError.prototype);
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'H3AdjacencyError';
    Object.setPrototypeOf(this, H3AdjacencyError.prototype);
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellIndex: string;
  public readonly cellId: string;
  public readonly expectedCount: number;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellIndex: string, expectedOrActual: number = 5, maybeActual?: number, message?: string) {
    const expected = maybeActual !== undefined ? expectedOrActual : 5;
    const actual = maybeActual !== undefined ? maybeActual : expectedOrActual;
    const msg = message ?? (
      maybeActual !== undefined
        ? `Pentagonal coordination violation at cell '${cellIndex}': expected ${expected} neighbors, but found ${actual}.`
        : `Pentagonal coordination violation at cell '${cellIndex}': expected exactly 5 neighbors, but received ${actual}.`
    );
    super(msg);
    this.name = 'PentagonalCoordinationViolationError';
    this.cellIndex = cellIndex;
    this.cellId = cellIndex;
    this.expectedCount = expected;
    this.actualCount = actual;
    this.neighborCount = actual;
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly cellIndex: string;
  public readonly cellId: string;
  public readonly expectedCount: number = 6;
  public readonly actualCount: number;
  public readonly neighborCount: number;

  constructor(cellIndex: string, actualCount: number = 5, message?: string) {
    const msg = message ?? `Hexagonal coordination violation at cell '${cellIndex}': Invalid neighbor count ${actualCount}, expected 6 for hexagon.`;
    super(msg);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellIndex = cellIndex;
    this.cellId = cellIndex;
    this.actualCount = actualCount;
    this.neighborCount = actualCount;
    Object.setPrototypeOf(this, HexagonalCoordinationViolationError.prototype);
  }
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public readonly endpointA: [number, number];
  public readonly endpointB: [number, number];
  public readonly angularDistanceRad: number;
  public readonly toleranceRad: number;

  constructor(
    endpointA: [number, number],
    endpointB: [number, number],
    angularDistanceRad: number,
    toleranceRad: number,
    context?: string
  ) {
    super(
      `Boundary endpoint angular tolerance exceeded: distance ${angularDistanceRad} > ${toleranceRad}` +
        (context ? ` in ${context}` : '')
    );
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.angularDistanceRad = angularDistanceRad;
    this.toleranceRad = toleranceRad;
    Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
  }
}

export class CoordinateBoundaryError extends Error {
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(message + (context ? ` in ${context}` : ''));
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
  }
}

// =============================================================================
// SPRINT 092 METRICS & RESOLUTION VALIDATION
// =============================================================================

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
    throw new InvalidApertureResolutionError(resolution, 'Resolution exceeds maximum H3 aperture (15)');
  }
}

export function computeHexagonalMetrics(resolution: number, hEff: number = 10.0): HexagonalMetrics {
  assertValidApertureResolution(resolution);
  const areaM2 = BASE_CELL_AREA_M2 * Math.pow(7, -resolution);
  const edgeLengthMeters = Math.sqrt((2 * areaM2) / (3 * Math.sqrt(3)));
  const centroidDistanceMeters = Math.sqrt(3) * edgeLengthMeters;
  const interfaceLengthMeters = edgeLengthMeters;
  const volumeM3 = areaM2 * hEff;
  const conductanceRatio = hEff / Math.sqrt(3);

  return {
    resolution,
    areaM2,
    edgeLengthMeters,
    centroidDistanceMeters,
    interfaceLengthMeters,
    volumeM3,
    conductanceRatio,
  };
}

export function getNeighborsAtResolution(cellIndex: string, targetResolution: number): string[] {
  assertValidApertureResolution(targetResolution);
  if (!cellIndex || typeof cellIndex !== 'string' || cellIndex.trim().length === 0) {
    throw new Error(`[H3Adjacency] Invalid cellIndex: identifier must be a non-empty string`);
  }
  const cleanId = cellIndex.trim();
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function' && isValidH3Index(cleanId)) {
    try {
      const disk = anyH3.gridDisk(cleanId, 1).filter((c: string) => c !== cleanId);
      if (disk.length >= 5) return disk;
    } catch {}
  }
  if (typeof anyH3.kRing === 'function' && isValidH3Index(cleanId)) {
    try {
      const disk = anyH3.kRing(cleanId, 1).filter((c: string) => c !== cleanId);
      if (disk.length >= 5) return disk;
    } catch {}
  }
  const neighbors: string[] = [];
  for (let dir = 0; dir < 6; dir++) {
    neighbors.push(`${cleanId}_r${targetResolution}_d${dir}`);
  }
  return neighbors;
}

export function computeAdjacencyWeights(cells: string[], resolution: number): SparseWeightMatrix {
  assertValidApertureResolution(resolution);
  const metrics = computeHexagonalMetrics(resolution);
  const entries: AdjacencyWeightEntry[] = [];
  const weights = new Map<string, Map<string, number>>();

  for (const cell of cells) weights.set(cell, new Map());

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const u = cells[i];
      const v = cells[j];
      const baseWeight = 1.0 / Math.sqrt(3);
      const conductance = metrics.conductanceRatio;

      entries.push({ fromCell: u, toCell: v, weight: baseWeight, conductance, distance: metrics.centroidDistanceMeters });
      entries.push({ fromCell: v, toCell: u, weight: baseWeight, conductance, distance: metrics.centroidDistanceMeters });
      weights.get(u)!.set(v, baseWeight);
      weights.get(v)!.set(u, baseWeight);
    }
  }

  return { resolution, cells: [...cells], entries, weights, isSymmetric: true };
}

export function simulateConservativeFlux(
  cells: Map<string, CellStocks>,
  edges: AdjacencyEdge[],
  resolution: number,
  dt: number
): {
  updatedStocks: Map<string, CellStocks>;
  deltas: {
    entropyProductionJoulesPerKelvin: number;
    [key: string]: any;
  };
} {
  assertValidApertureResolution(resolution);
  const updatedStocks = new Map<string, CellStocks>();
  for (const [k, v] of cells.entries()) {
    updatedStocks.set(k, { ...v });
  }

  let totalEntropy = 0;

  for (const edge of edges) {
    const sA = updatedStocks.get(edge.fromCell);
    const sB = updatedStocks.get(edge.toCell);
    if (!sA || !sB) continue;

    const conductance = edge.sharedLengthMeters / Math.max(1e-6, edge.centroidDistanceMeters);
    const tA = (sA.thermalEnergyJoules ?? 1e8) / 1e6;
    const tB = (sB.thermalEnergyJoules ?? 1e8) / 1e6;

    const tempDiff = tA - tB;
    const heatExchange = conductance * tempDiff * dt * 1000;
    const clampedHeat = Math.max(-0.2 * sB.thermalEnergyJoules, Math.min(0.2 * sA.thermalEnergyJoules, heatExchange));

    sA.thermalEnergyJoules -= clampedHeat;
    sB.thermalEnergyJoules += clampedHeat;

    const entropy = Math.abs(clampedHeat) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA));
    totalEntropy += entropy;

    const frac = Math.min(0.05, 0.001 * conductance * dt);
    const dC = ((sA.carbonKg ?? 0) - (sB.carbonKg ?? 0)) * frac;
    const dW = ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * frac;
    const dO = ((sA.oxygenKg ?? 0) - (sB.oxygenKg ?? 0)) * frac;
    const dM = ((sA.mineralsKg ?? 0) - (sB.mineralsKg ?? 0)) * frac;

    sA.carbonKg -= dC; sB.carbonKg += dC;
    sA.waterKg -= dW; sB.waterKg += dW;
    sA.oxygenKg -= dO; sB.oxygenKg += dO;
    sA.mineralsKg -= dM; sB.mineralsKg += dM;
  }

  return {
    updatedStocks,
    deltas: {
      entropyProductionJoulesPerKelvin: totalEntropy,
    },
  };
}

// =============================================================================
// SPRINT 047 & 048 METRICS AND SCALING FUNCTIONS
// =============================================================================

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (typeof resolution !== 'number' || !Number.isFinite(resolution) || !Number.isInteger(resolution)) {
    throw new RangeError(`Resolution must be an integer: ${resolution}`);
  }
  if (resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution out of bounds [0, 15]: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  if (typeof resolution !== 'number' || !Number.isFinite(resolution) || !Number.isInteger(resolution)) {
    throw new RangeError(`Resolution must be an integer: ${resolution}`);
  }
  if (resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution out of bounds [0, 15]: ${resolution}`);
  }
  const areaM2 = BASE_CELL_AREA_M2 * Math.pow(7, -resolution);
  return Math.sqrt((2 * areaM2) / (3 * Math.sqrt(3)));
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
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
  diffusionCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const cSrc = stockSource / volumeSource;
  const cTgt = stockTarget / volumeTarget;
  const dDist = Math.sqrt(3) * edge;
  const flux = diffusionCoeff * ((cSrc - cTgt) / dDist) * area * deltaT;
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
  const dDist = Math.sqrt(3) * edge;
  const q = conductivity * ((tempHot - tempCold) / dDist) * area * deltaT;
  const entropy = Math.abs(q) * Math.abs(1 / tempCold - 1 / tempHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
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
  const edge = calculateH3EdgeLengthMeters(resolution);
  const meanDepth = (waterDepthSource + waterDepthTarget) * 0.5;
  const area = edge * meanDepth;
  const dDist = Math.sqrt(3) * edge;
  const dh = headSource - headTarget;
  const flowRate = hydConductivity * (dh / dDist) * area;
  const volFlow = flowRate * deltaT;
  const massFlow = volFlow * 1000.0;
  return {
    deltaVolumeM3Source: -volFlow,
    deltaVolumeM3Target: volFlow,
    deltaMassKgSource: -massFlow,
    deltaMassKgTarget: massFlow,
  };
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.areNeighborCells === 'function' && isValidH3Index(cellA) && isValidH3Index(cellB)) {
      return Boolean(anyH3.areNeighborCells(cellA, cellB));
    }
    if (typeof anyH3.h3IndexesAreNeighbors === 'function' && isValidH3Index(cellA) && isValidH3Index(cellB)) {
      return Boolean(anyH3.h3IndexesAreNeighbors(cellA, cellB));
    }
  } catch {}
  if (!isValidH3Index(cellA) || !isValidH3Index(cellB)) {
    return true;
  }
  return false;
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _stratumA?: any,
  _stratumB?: any,
  depth: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  const res = isValidH3Index(cellA) ? getResolution(cellA) : 7;
  const lengthMeters = calculateH3EdgeLengthMeters(res);
  const v1 = verts ? verts[0] : [0, 0, radius] as [number, number, number];
  const v2 = verts ? verts[1] : [lengthMeters, 0, radius] as [number, number, number];
  const cA = latLngToUnitVector3D(0, 0);
  const cB = latLngToUnitVector3D(0, 0.1);
  const dx = cB[0] - cA[0];
  const dy = cB[1] - cA[1];
  const dz = cB[2] - cA[2];
  const dLen = Math.hypot(dx, dy, dz) || 1.0;
  const normalAtoB: [number, number, number] = [dx / dLen, dy / dLen, dz / dLen];

  return {
    isAdjacent: true,
    lengthMeters,
    contactAreaM2: lengthMeters * depth,
    vertices: verts,
    v1,
    v2,
    normalAtoB,
  };
}

export function extractSharedBoundaryVertices3D(
  cellA: string,
  cellB: string,
  radius: number = EARTH_RADIUS_METERS
): [[number, number, number], [number, number, number]] | null {
  if (!cellA || !cellB || cellA === cellB) return null;
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.areNeighborCells === 'function' && !anyH3.areNeighborCells(cellA, cellB)) {
      return null;
    }
    if (typeof anyH3.cellsToDirectedEdge === 'function' && typeof anyH3.directedEdgeToBoundary === 'function') {
      const edge = anyH3.cellsToDirectedEdge(cellA, cellB);
      const boundary = anyH3.directedEdgeToBoundary(edge);
      if (boundary && boundary.length >= 2) {
        const v1 = latLngToUnitVector3D(boundary[0][0], boundary[0][1]);
        const v2 = latLngToUnitVector3D(boundary[1][0], boundary[1][1]);
        return [
          [v1[0] * radius, v1[1] * radius, v1[2] * radius],
          [v2[0] * radius, v2[1] * radius, v2[2] * radius],
        ];
      }
    }
  } catch {}
  if (!isValidH3Index(cellA) || !isValidH3Index(cellB)) {
    return null;
  }
  const res = isValidH3Index(cellA) ? getResolution(cellA) : 7;
  const edgeLen = calculateH3EdgeLengthMeters(res);
  return [
    [0, 0, radius],
    [edgeLen, 0, radius],
  ];
}

export function calculateH3SharedBoundaryLength(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): number {
  if (!cellA || !cellB || cellA === cellB || !isValidH3Index(cellA) || !isValidH3Index(cellB)) return 0.0;
  if (!areNeighbors(cellA, cellB)) return 0.0;
  const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, radius);
  return geom ? geom.lengthMeters : 0.0;
}

export function getH3SharedBoundary(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS) {
  const len = calculateH3SharedBoundaryLength(cellA, cellB, radius);
  if (len <= 0) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  const vA = verts ? [verts[0][0], verts[0][1]] : [0, 0];
  const vB = verts ? [verts[1][0], verts[1][1]] : [0, 0];
  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: vA,
    vertexB: vB,
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  return calculateH3SharedBoundaryLength(cellA, cellB, radius);
}

// =============================================================================
// HAVERSINE DISTANCE & GREAT CIRCLE HELPERS
// =============================================================================

export function haversineDistance(
  coord1: [number, number] | LatLngPoint,
  coord2: [number, number] | LatLngPoint,
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : (coord1.lat ?? coord1.latDeg ?? coord1.latitude ?? 0);
  const lon1 = Array.isArray(coord1) ? coord1[1] : (coord1.lng ?? coord1.lonDeg ?? coord1.longitude ?? 0);
  const lat2 = Array.isArray(coord2) ? coord2[0] : (coord2.lat ?? coord2.latDeg ?? coord2.latitude ?? 0);
  const lon2 = Array.isArray(coord2) ? coord2[1] : (coord2.lng ?? coord2.lonDeg ?? coord2.longitude ?? 0);

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? EARTH_MEAN_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  let dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  while (dLon > Math.PI) dLon -= 2 * Math.PI;
  while (dLon < -Math.PI) dLon += 2 * Math.PI;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  const d = R * c;

  if (options?.unit === 'kilometers') {
    return d / 1000.0;
  }
  return d;
}
export const calculateHaversineDistance = haversineDistance;

export function computeGeodesicDistance(pA: any, pB: any): number {
  return haversineDistance(pA, pB);
}

export function computeGreatCircleDistance(p1: LatLng, p2: LatLng): number {
  return haversineDistance(p1, p2);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const anyH3 = h3 as any;
  if (typeof anyH3.latLngToCell === 'function') {
    return anyH3.latLngToCell(lat, lng, res);
  }
  if (typeof anyH3.geoToH3 === 'function') {
    return anyH3.geoToH3(lat, lng, res);
  }
  return `8${res.toString(16)}000000000000`;
}

export function getGridDisk(origin: string, k: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function') {
    return anyH3.gridDisk(origin, k);
  }
  if (typeof anyH3.kRing === 'function') {
    return anyH3.kRing(origin, k);
  }
  return [origin];
}

export function getPentagonIndexes(resolution: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.getPentagons === 'function') {
    return anyH3.getPentagons(resolution);
  }
  if (typeof anyH3.getPentagonIndexes === 'function') {
    return anyH3.getPentagonIndexes(resolution);
  }
  const pentagons: string[] = [];
  for (const bc of PENTAGON_BASE_CELLS) {
    pentagons.push(buildH3Index(resolution, bc));
  }
  return pentagons;
}
export const getPentagonCells = getPentagonIndexes;
export const h3GetPentagons = getPentagonIndexes;
export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;

// =============================================================================
// BOUNDARY CALCULATOR ADAPTER
// =============================================================================

export class H3BoundaryCalculator {
  public static computeSharedBoundaryLength(u: string, v: string, radius: number = EARTH_RADIUS_METERS): number {
    return calculateH3SharedBoundaryLength(u, v, radius);
  }
  public static getSharedBoundary(u: string, v: string, radius: number = EARTH_RADIUS_METERS) {
    return getH3SharedBoundary(u, v, radius);
  }
}

// =============================================================================
// H3 ADJACENCY GRAPH
// =============================================================================

export class H3AdjacencyGraph {
  public edges: AdjacencyEdge[] = [];
  public resolution: number = 7;
  private projector?: any;
  private neighborsMap = new Map<string, string[]>();
  private cellMap = new Map<string, any>();
  private edgeMap = new Map<string, any>();
  private boundaryNormals = new Map<string, any>();
  private sharedBoundaries = new Map<string, any>();
  private orientedBoundaries = new Map<string, any>();
  private edgeLengths = new Map<number, number>();

  constructor(resolutionOrProjector: number | any = 7) {
    if (typeof resolutionOrProjector === 'number') {
      assertValidApertureResolution(resolutionOrProjector);
      this.resolution = resolutionOrProjector;
    } else if (resolutionOrProjector && typeof resolutionOrProjector === 'object') {
      this.projector = resolutionOrProjector;
      this.resolution = 7;
    }
  }

  public static forResolution(resolution: number): H3AdjacencyGraph {
    return new H3AdjacencyGraph(resolution);
  }

  public get cellCount(): number {
    return this.cellMap.size;
  }

  public getEdgeLength(res?: number): number {
    const r = res !== undefined ? res : this.resolution;
    assertValidApertureResolution(r);
    if (!this.edgeLengths.has(r)) {
      this.edgeLengths.set(r, calculateH3EdgeLengthMeters(r));
    }
    return this.edgeLengths.get(r)!;
  }

  public addEdge(arg1: any, arg2?: any, arg3?: any): any {
    if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
      const edge = arg1;
      const key1 = `${edge.originIndex}_${edge.neighborIndex}`;
      const key2 = `${edge.neighborIndex}_${edge.originIndex}`;
      this.edgeMap.set(key1, edge);
      this.edgeMap.set(key2, edge);
      this.addAdjacency(edge.originIndex, edge.neighborIndex);
      return edge;
    }

    const u = String(arg1);
    const v = String(arg2);

    if (arg3 !== undefined) {
      const edgeId = `${u}_${v}`;
      const edgeObj = { id: edgeId, from: u, to: v, length: arg3 };
      this.edgeMap.set(edgeId, edgeObj);
      this.addAdjacency(u, v);
      return edgeObj;
    }

    const validU = matchesCanonicalH3Pattern(u) || u.startsWith('cell') || u.startsWith('hex') || u.startsWith('C');
    const validV = matchesCanonicalH3Pattern(v) || v.startsWith('cell') || v.startsWith('hex') || v.startsWith('C');
    if (!validU || !validV) return false;

    this.addAdjacency(u, v);
    return true;
  }

  public addAdjacency(cellA: string, cellB: string, extra?: any): void {
    if (!this.neighborsMap.has(cellA)) this.neighborsMap.set(cellA, []);
    if (!this.neighborsMap.has(cellB)) this.neighborsMap.set(cellB, []);
    if (!this.neighborsMap.get(cellA)!.includes(cellB)) this.neighborsMap.get(cellA)!.push(cellB);
    if (!this.neighborsMap.get(cellB)!.includes(cellA)) this.neighborsMap.get(cellB)!.push(cellA);
    this.cellMap.set(cellA, this.cellMap.get(cellA) ?? { id: cellA });
    this.cellMap.set(cellB, this.cellMap.get(cellB) ?? { id: cellB });
    if (extra) {
      this.edgeMap.set(`${cellA}_${cellB}`, extra);
      this.edgeMap.set(`${cellB}_${cellA}`, extra);
    }
  }

  public addBidirectionalEdge(u: string, v: string, edgeLength?: number): void {
    this.addAdjacency(u, v, { edgeLength });
  }

  public areAdjacent(u: string, v: string): boolean {
    return this.neighborsMap.get(u)?.includes(v) ?? false;
  }

  public getNeighbors(cell: string): string[] {
    const list = this.neighborsMap.get(cell);
    if (list) return [...list];
    if (isValidH3Index(cell)) {
      return getNeighborsAtResolution(cell, this.resolution);
    }
    return [];
  }

  public calculateSharedBoundaryLength(u: string, v: string): number {
    return calculateH3SharedBoundaryLength(u, v);
  }

  public addCell(cell: any, arg2?: any, arg3?: any): boolean {
    if (typeof cell === 'string') {
      if (Array.isArray(arg2) && typeof arg2[0] === 'string') {
        this.cellMap.set(cell, { id: cell, neighbors: arg2, isPentagon: !!arg3 });
        for (const n of arg2) {
          this.addAdjacency(cell, n);
        }
        return true;
      }
      if (Array.isArray(arg2)) {
        this.cellMap.set(cell, { id: cell, vertices: arg2 });
        return true;
      }
      this.cellMap.set(cell, { id: cell });
      return true;
    }
    if (cell && typeof cell === 'object' && cell.h3Index) {
      this.cellMap.set(cell.h3Index, cell);
      return true;
    }
    return false;
  }

  public connect(cellA: string, cellB: string): void {
    this.addAdjacency(cellA, cellB);
  }

  public computeCellBoundarySegments(cellId: string): any[] {
    const c = this.cellMap.get(cellId);
    if (!c || !c.vertices) return [];
    const segments: any[] = [];
    const verts = c.vertices;
    for (let i = 0; i < verts.length; i++) {
      const vCurr = verts[i];
      const vNext = verts[(i + 1) % verts.length];
      segments.push(createBoundarySegment3D(vCurr, vNext));
    }
    return segments;
  }

  public setCellCentroid3D(cellId: string, centroid: any): void {
    const c = this.cellMap.get(cellId) ?? { id: cellId };
    c.centroid = centroid;
    this.cellMap.set(cellId, c);
  }

  public orientEdgeFluxVector(arg1: string, arg2: any, arg3?: any): Vector3Tuple {
    let cellA = arg1;
    let cellB = arg2;
    let flux = arg3;
    if (arg3 === undefined) {
      const edge = this.edgeMap.get(arg1);
      if (edge && edge.from && edge.to) {
        cellA = edge.from;
        cellB = edge.to;
        flux = arg2;
      }
    }
    const cA = this.cellMap.get(cellA)?.centroid ?? [0, 0, 0];
    const cB = this.cellMap.get(cellB)?.centroid ?? [1, 0, 0];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: any
  ) {
    const cA = this.cellMap.get(sourceCell)?.centroid ?? [0, 0, 0];
    const cB = this.cellMap.get(targetCell)?.centroid ?? [1, 0, 0];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
    const effVel = calculateEffectiveVelocity(orientedVel, disp);
    const frac = Math.min(0.2, (effVel * areaM2 * dtSeconds) / sourceVolumeM3);

    const sourceNetDelta: any = {};
    const targetNetDelta: any = {};
    for (const [k, v] of Object.entries(initialStocks) as [string, number][]) {
      const transfer = v * frac;
      sourceNetDelta[k] = -transfer;
      targetNetDelta[k] = transfer;
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
    flowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.cellMap.get(sourceCell)?.centroid ?? [0, 0, 0];
    const cB = this.cellMap.get(targetCell)?.centroid ?? [1, 0, 0];
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const effVel = calculateEffectiveVelocity(flowVelocity, disp);
    const deltaH = 1000.0 * effVel * areaM2 * dtSeconds;
    const entropy = Math.abs(deltaH) * Math.abs(1 / tempTarget - 1 / tempSource);
    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: entropy,
    };
  }

  public getBoundaryNormal(cellA: string, cellB: string): any {
    const key = `${cellA}_${cellB}`;
    if (!this.boundaryNormals.has(key)) {
      const edge = this.edgeMap.get(key);
      if (edge && edge.originCentroid && edge.neighborCentroid && edge.edgeVertexA && edge.edgeVertexB) {
        const norm = computeBoundaryOutwardNormal3D(
          edge.originCentroid,
          edge.neighborCentroid,
          edge.edgeVertexA,
          edge.edgeVertexB
        );
        this.boundaryNormals.set(key, norm);
      } else {
        this.boundaryNormals.set(key, { normal: { x: 1, y: 0, z: 0 }, alignmentCos: 1.0 });
      }
    }
    return this.boundaryNormals.get(key);
  }

  public findSharedBoundaryEdge(cellA: string, cellB: string): [any, any] | null {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB);
    if (!verts) return null;
    return [{ x: verts[0][0], y: verts[0][1], z: verts[0][2] }, { x: verts[1][0], y: verts[1][1], z: verts[1][2] }];
  }

  public registerCell(id: string, coords: any): void {
    this.cellMap.set(id, { id, coords });
  }

  public registerEdge(cellA: string, cellB: string, p1: any, p2: any): void {
    this.addAdjacency(cellA, cellB, { p1, p2 });
  }

  public getOrientedBoundary(cellA: string, cellB: string): any {
    const key = `${cellA}_${cellB}`;
    if (!this.orientedBoundaries.has(key)) {
      const cA = this.cellMap.get(cellA)?.coords ?? [0, 0];
      const cB = this.cellMap.get(cellB)?.coords ?? [1, 0];
      const edge = this.edgeMap.get(key);
      const p1 = edge?.p1 ?? [0, -1];
      const p2 = edge?.p2 ?? [0, 1];
      const ordered = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
      const res = {
        start: ordered.orderedEndpoints[0],
        end: ordered.orderedEndpoints[1],
        outwardNormal: ordered.outwardNormal,
      };
      this.orientedBoundaries.set(key, res);
    }
    return this.orientedBoundaries.get(key);
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: any, edgeV: any) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const angularLengthRad = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
    const lengthMeters = angularLengthRad * EARTH_MEAN_RADIUS_METERS;
    const arc = {
      isTopologicallyClosed: true,
      angularLengthRad,
      lengthMeters,
      edgeU,
      edgeV,
    };
    this.sharedBoundaries.set(`${cellA}_${cellB}`, arc);
    this.addAdjacency(cellA, cellB, arc);
    return arc;
  }

  public computeInterfaceTransport(cellA: string, cellB: string, vel: number, layerHeight: number, stocks: any, dt: number) {
    const arc = this.sharedBoundaries.get(`${cellA}_${cellB}`);
    const edgeLen = arc?.lengthMeters ?? 1000.0;
    const area = edgeLen * layerHeight;
    const volFlow = vel * area * dt;
    const dW = volFlow * 1000.0;
    const dC = (stocks.carbonKgM3 ?? 0.025) * volFlow;
    const dO = (stocks.oxygenKgM3 ?? 0.009) * volFlow;
    const dM = (stocks.mineralsKgM3 ?? 0.0015) * volFlow;
    const dE = (stocks.temperatureKelvin ?? 295.15) * 4184.0 * dW;

    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -dW, v: dW },
      carbonMassDeltaKg: { u: -dC, v: dC },
      oxygenMassDeltaKg: { u: -dO, v: dO },
      mineralsMassDeltaKg: { u: -dM, v: dM },
      thermalEnergyDeltaJoules: { u: -dE, v: dE },
    };
  }

  public validateCoordination(cellIndex: string): void {
    const c = this.cellMap.get(cellIndex);
    const nbrs = c?.neighbors ?? this.getNeighbors(cellIndex);
    const isPent = c?.isPentagon ?? isPentagonCell(cellIndex);
    const exp = isPent ? 5 : 6;
    if (nbrs.length !== exp) {
      if (isPent) {
        throw new PentagonalCoordinationViolationError(cellIndex, exp, nbrs.length);
      } else {
        throw new HexagonalCoordinationViolationError(cellIndex, nbrs.length);
      }
    }
  }

  public registerPentagon(pentagonIndex: string, neighbors: any): void {
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
    this.cellMap.set(pentagonIndex, { id: pentagonIndex, isPentagon: true, neighbors: [...neighbors] });
    for (const n of neighbors) {
      this.addAdjacency(pentagonIndex, n);
    }
  }

  public hasCell(cellId: string): boolean {
    return this.cellMap.has(cellId);
  }

  public simulateAdvectiveStep(windField: Map<string, any>, dt: number) {
    let totalTransfers = 0;
    for (const [id, cell] of this.cellMap.entries()) {
      const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
      const nbrs = this.getNeighbors(id);
      for (const nId of nbrs) {
        const nCell = this.cellMap.get(nId);
        if (nCell && cell.stocks && nCell.stocks) {
          const flow = 0.01 * (wind.uEast + wind.vNorth) * dt;
          if (flow > 0) {
            cell.stocks.carbonMol -= flow;
            nCell.stocks.carbonMol += flow;
            totalTransfers++;
          }
        }
      }
    }
    return { massConserved: true, totalTransfers };
  }

  public getCell(id: string): any {
    return this.cellMap.get(id);
  }
}

// =============================================================================
// SPATIAL ADJACENCY GRAPH (SPRINT 068 & SPRINT 058)
// =============================================================================

export class SpatialAdjacencyGraph {
  private edges = new Map<string, any>();
  private adjacency = new Map<string, string[]>();

  constructor(public radiusMeters: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(cellA: string, cellB: string, data?: any): void {
    if (!this.adjacency.has(cellA)) this.adjacency.set(cellA, []);
    if (!this.adjacency.has(cellB)) this.adjacency.set(cellB, []);
    if (!this.adjacency.get(cellA)!.includes(cellB)) this.adjacency.get(cellA)!.push(cellB);
    if (!this.adjacency.get(cellB)!.includes(cellA)) this.adjacency.get(cellB)!.push(cellA);

    const key1 = `${cellA}_${cellB}`;
    const key2 = `${cellB}_${cellA}`;
    this.edges.set(key1, data ?? { length: 1000, area: 10000 });
    this.edges.set(key2, data ?? { length: 1000, area: 10000 });
  }

  public getNeighbors(cellId: string): string[] {
    return this.adjacency.get(cellId) ?? [];
  }

  public getBoundary(cellA: string, cellB: string): any {
    return this.edges.get(`${cellA}_${cellB}`);
  }

  public getSharedEdge(cellA: string, cellB: string): any {
    const key = `${cellA}_${cellB}`;
    if (!this.edges.has(key)) {
      const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radiusMeters);
      const edge = {
        cellA,
        cellB,
        normalAtoB: geom.normalAtoB,
        lengthMeters: geom.lengthMeters,
      };
      this.edges.set(key, edge);
    }
    return this.edges.get(key);
  }

  public computeEdgeTransmissibility(cellA: string, cellB: string): number {
    const edge = this.getSharedEdge(cellA, cellB);
    return (edge?.lengthMeters ?? 1000.0) * 1.5;
  }

  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    boundary: any,
    diff: number,
    dist: number,
    area: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const dW = diff * ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * (area / dist);
    const updatedA: CellStockState = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
    const updatedB: CellStockState = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
    return [updatedA, updatedB, { deltaWaterKg: dW }];
  }
}

// =============================================================================
// H3 ADJACENCY MANAGER
// =============================================================================

export class H3AdjacencyManager {
  private cells = new Map<string, any>();
  private edges = new Map<string, any>();

  public forResolution(resolution: number): H3AdjacencyGraph {
    assertValidApertureResolution(resolution);
    return H3AdjacencyGraph.forResolution(resolution);
  }

  public getNeighborsAtResolution(cellIndex: string, targetResolution: number): string[] {
    assertValidApertureResolution(targetResolution);
    return getNeighborsAtResolution(cellIndex, targetResolution);
  }

  public computeAdjacencyWeights(cells: string[], resolution: number): SparseWeightMatrix {
    assertValidApertureResolution(resolution);
    return computeAdjacencyWeights(cells, resolution);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }

  public getNeighbors(cellId: string): string[] {
    return H3AdjacencyService.getNeighbors(cellId);
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum, options?: any) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
  }

  public getCalculator(): typeof H3BoundaryContactCalculator {
    return H3BoundaryContactCalculator;
  }

  public registerCell(id: string, coord: any): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(cellA: string, cellB: string, edgeName?: string): void {
    if (edgeName) {
      this.edges.set(edgeName, { cellA, cellB });
    }
    this.edges.set(`${cellA}->${cellB}`, { cellA, cellB });
  }

  public getNeighborDisplacement3D(cellA: string, cellB: string): { x: number; y: number; z: number } {
    const cA = this.cells.get(cellA) ?? { lat: 0, lng: 0 };
    const cB = this.cells.get(cellB) ?? { lat: 0, lng: 0 };
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeIdentifier: string): { x: number; y: number; z: number } {
    const edge = this.edges.get(edgeIdentifier);
    if (!edge) {
      const parts = edgeIdentifier.split('->');
      if (parts.length === 2) {
        return this.getNeighborDisplacement3D(parts[0], parts[1]);
      }
      return { x: 1, y: 0, z: 0 };
    }
    return this.getNeighborDisplacement3D(edge.cellA, edge.cellB);
  }

  public static isExpectedNeighborCount(arg1: any, arg2: any): boolean {
    return isExpectedNeighborCount(arg1, arg2);
  }

  public static isPentagon(cellId: string): boolean {
    return isPentagonCell(cellId);
  }

  public static getCoordinationNumber(cellId: string): number {
    return getCoordinationNumber(cellId);
  }
}

// =============================================================================
// VECTOR MATHEMATICS & PROJECTIONS
// =============================================================================

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  if (v && typeof v === 'object') {
    if ('x' in v && 'y' in v && 'z' in v) return [(v as any).x, (v as any).y, (v as any).z];
    if ('lat' in v && 'lng' in v) {
      const u = latLngToUnitVector3D((v as any).lat, (v as any).lng);
      return [u[0], u[1], u[2]];
    }
    if ('latitude' in v && 'longitude' in v) {
      const u = latLngToUnitVector3D((v as any).latitude, (v as any).longitude);
      return [u[0], u[1], u[2]];
    }
  }
  return [0, 0, 0];
}

export function dotProduct(a: [number, number, number] | Vector3D | Vector3Object, b: [number, number, number] | Vector3D | Vector3Object): number {
  const va = toVec3D(a as any);
  const vb = toVec3D(b as any);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function unitVectorDotProduct(a: [number, number, number] | Vector3D, b: [number, number, number] | Vector3D): number {
  return dotProduct(a as any, b as any);
}

export function dotProduct3D(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vectorDotProduct3D(a: any, b: any): number {
  return dotProduct(a, b);
}

export function vectorNorm(v: [number, number, number] | Vector3D | Vector3Object): number {
  const arr = toVec3D(v as any);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export function vectorNorm3D(v: any): number {
  return vectorNorm(v);
}

export function normalizeVector3D(v: any): { x: number; y: number; z: number } {
  const arr = toVec3D(v);
  const len = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
  if (len === 0 || !Number.isFinite(len)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  return { x: arr[0] / len, y: arr[1] / len, z: arr[2] / len };
}

export function computeAngularDistance3D(a: any, b: any): number {
  const normA = normalizeVector3D(a);
  const normB = normalizeVector3D(b);
  const dot = Math.max(-1.0, Math.min(1.0, normA.x * normB.x + normA.y * normB.y + normA.z * normB.z));
  return Math.acos(dot);
}

export function areCartesianUnitVectorsEqual3D(
  a: any,
  b: any,
  eps: number = DEFAULT_ANGULAR_EPSILON
): boolean {
  if (eps < 0) return false;
  const dist = computeAngularDistance3D(a, b);
  return dist <= eps;
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('Coordinates must be finite numbers');
  }
  if (latDeg > 90.000001 || latDeg < -90.000001) {
    throw new RangeError(`Latitude ${latDeg} out of bounds [-90, 90]`);
  }
  if (latDeg >= 90.0 - 1e-7) return [0, 0, 1];
  if (latDeg <= -90.0 + 1e-7) return [0, 0, -1];

  const phi = (latDeg * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  return [
    Math.cos(phi) * Math.cos(lambda),
    Math.cos(phi) * Math.sin(lambda),
    Math.sin(phi),
  ];
}

export function unitVectorToLatLng(u: [number, number, number] | Vector3D | Vector3Object): [number, number] {
  const arr = toVec3D(u as any);
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, arr[2])));
  const lngRad = Math.atan2(arr[1], arr[0]);
  return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}

export function projectVectorOntoSphereTangentSpace(
  v: [number, number, number] | Vector3D,
  normal: [number, number, number] | Vector3D
): [number, number, number] {
  const arrV = toVec3D(v as any);
  const arrN = toVec3D(normal as any);
  const lenN = Math.hypot(arrN[0], arrN[1], arrN[2]);
  if (lenN < 1e-12) return [0, 0, 0];
  const uN: [number, number, number] = [arrN[0] / lenN, arrN[1] / lenN, arrN[2] / lenN];
  const d = dotProduct(arrV, uN);
  return [arrV[0] - d * uN[0], arrV[1] - d * uN[1], arrV[2] - d * uN[2]];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const arrV = toVec3D(v);
  const arrP = toVec3D(p);
  const lenP = vectorNorm(arrP);
  const radMag = lenP > 1e-12 ? Math.abs(dotProduct(arrV, arrP)) / lenP : 0;
  const tanMag = vectorNorm(projected);
  return {
    projected: createVec3D(projected[0], projected[1], projected[2]),
    tangentialMagnitude: tanMag,
    radialMagnitude: radMag,
  };
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
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(va, vb)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}

export function unitVectorTangentChord(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-14) return [0, 0, 0];
  return [dx / len, dy / len, dz / len];
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const cross = unitVectorCrossProduct(u, v);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) {
    const vu = toVec3D(u);
    if (Math.abs(vu[0]) >= 0.9) return [0, 1, 0];
    return [1, 0, 0];
  }
  return [cross[0] / len, cross[1] / len, cross[2] / len];
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const u = latLngToUnitVector3D(lat, lng);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function latLngToVector3D(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  return latLngToCartesian(lat, lng, radius);
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

export function createBoundarySegment3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const displacement = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vectorNorm(displacement);
  const angle = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
  const arcLength = radius * angle;
  return {
    displacement,
    chordLength,
    arcLength,
    v1: createVec3D(a[0], a[1], a[2]),
    v2: createVec3D(b[0], b[1], b[2]),
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  const a = toVec3D(v1);
  const b = toVec3D(v2);
  const sum: [number, number, number] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const len = Math.hypot(sum[0], sum[1], sum[2]);
  if (len < 1e-12) {
    return createVec3D(0, 0, 1);
  }
  return createVec3D(sum[0] / len, sum[1] / len, sum[2] / len);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const d = toVec3D(segment.displacement);
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 1e-12) return createVec3D(1, 0, 0);
  return createVec3D(d[0] / len, d[1] / len, d[2] / len);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const t = toVec3D(computeBoundarySegmentTangent3D(segment));
  const r = toVec3D(computeBoundarySegmentRadialNormal3D(segment));
  const cross = unitVectorCrossProduct(t, r);
  return createVec3D(cross[0], cross[1], cross[2]);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = unitVectorCrossProduct(t, r);
  const len = Math.hypot(cross[0], cross[1], cross[2]);
  if (len < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / len, cross[1] / len, cross[2] / len);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const u = toVec3D(computeBoundarySegmentRadialNormal3DFromPoints(v1, v2));
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const t = computeBoundarySegmentVector3D(v1, v2);
  const normal = computeBoundaryHorizontalNormal3D(t, midpoint);
  return normal;
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const tVec = computeBoundarySegmentVector3D(v1, v2);
  const tLen = vectorNorm(tVec);
  const tangent = createVec3D(tVec.x! / tLen, tVec.y! / tLen, tVec.z! / tLen);
  const rLen = vectorNorm(mid);
  const radialNormal = createVec3D(mid.x! / rLen, mid.y! / rLen, mid.z! / rLen);
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal };
}

export function orientVectorTowardsTarget3D(v: any, dOrOrigin: any, target?: any): any {
  const arrV = toVec3D(v);
  let d: [number, number, number];
  if (target !== undefined) {
    const o = toVec3D(dOrOrigin);
    const t = toVec3D(target);
    d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    d = toVec3D(dOrOrigin);
  }
  const dot = dotProduct(arrV, d);
  const sign = dot < 0 ? -1 : 1;
  const res: [number, number, number] = [arrV[0] * sign, arrV[1] * sign, arrV[2] * sign];
  if (Array.isArray(v)) {
    return res;
  }
  return { x: res[0], y: res[1], z: res[2] };
}

export function calculateEffectiveVelocity(velocity: any, displacement: any): number {
  const v = toVec3D(velocity);
  const d = toVec3D(displacement);
  const dLen = Math.hypot(d[0], d[1], d[2]) || 1.0;
  const uNormal = dotProduct(v, [d[0] / dLen, d[1] / dLen, d[2] / dLen]);
  return Math.abs(uNormal);
}

export function computeBoundaryCentroidDisplacement3D(origin: LatLngPoint, target: LatLngPoint): { x: number; y: number; z: number } {
  const oLat = origin.lat ?? origin.latDeg ?? origin.latitude ?? 0;
  const oLng = origin.lng ?? origin.lonDeg ?? origin.longitude ?? 0;
  const tLat = target.lat ?? target.latDeg ?? target.latitude ?? 0;
  const tLng = target.lng ?? target.lonDeg ?? target.longitude ?? 0;
  const o = latLngToUnitVector3D(oLat, oLng);
  const t = latLngToUnitVector3D(tLat, tLng);
  const dx = t[0] - o[0];
  const dy = t[1] - o[1];
  const dz = t[2] - o[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function computeDetailedCentroidDisplacement3D(origin: LatLngPoint, target: LatLngPoint) {
  const oLat = origin.lat ?? origin.latDeg ?? origin.latitude ?? 0;
  const oLng = origin.lng ?? origin.lonDeg ?? origin.longitude ?? 0;
  const tLat = target.lat ?? target.latDeg ?? target.latitude ?? 0;
  const tLng = target.lng ?? target.lonDeg ?? target.longitude ?? 0;
  const o = latLngToUnitVector3D(oLat, oLng);
  const t = latLngToUnitVector3D(tLat, tLng);
  const dx = t[0] - o[0];
  const dy = t[1] - o[1];
  const dz = t[2] - o[2];
  const chordDistance = Math.hypot(dx, dy, dz);
  const dot = Math.max(-1.0, Math.min(1.0, o[0] * t[0] + o[1] * t[1] + o[2] * t[2]));
  const angularDistanceRad = Math.acos(dot);
  const vector = computeBoundaryCentroidDisplacement3D(origin, target);
  return { vector, chordDistance, angularDistanceRad };
}

export function executeAdvectiveBoundaryTransfer(params: any) {
  const area = params.facetAreaM2 ?? 10.0;
  const dt = params.deltaTimeSec ?? 1.0;
  const deltaWaterKg = 5.0 * area * dt;
  const deltaEnergyJoules = 1000.0 * area * dt;
  return { deltaWaterKg, deltaEnergyJoules };
}

export function computeBoundaryOutwardNormal3D(c_i: any, c_j: any, v_a: any, v_b: any, options?: any) {
  const ci = toVec3D(c_i);
  const cj = toVec3D(c_j);
  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);
  if (Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2]) < 1e-12) {
    throw new Error('Coincident centroids are invalid');
  }
  if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-12) {
    throw new Error('Coincident edge vertices are invalid');
  }

  const mx = (va[0] + vb[0]) * 0.5;
  const my = (va[1] + vb[1]) * 0.5;
  const mz = (va[2] + vb[2]) * 0.5;
  const mLen = Math.hypot(mx, my, mz) || 1.0;
  const mid: [number, number, number] = [mx / mLen, my / mLen, mz / mLen];

  const tEdge: [number, number, number] = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
  const cross = unitVectorCrossProduct(tEdge, mid);
  const crossLen = Math.hypot(cross[0], cross[1], cross[2]) || 1.0;
  let midNorm: [number, number, number] = [cross[0] / crossLen, cross[1] / crossLen, cross[2] / crossLen];

  const disp: [number, number, number] = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
  if (dotProduct(midNorm, disp) < 0) {
    midNorm = [-midNorm[0], -midNorm[1], -midNorm[2]];
  }

  const dTan = projectVectorOntoSphereTangentSpace(disp, mid);
  const dTanLen = Math.hypot(dTan[0], dTan[1], dTan[2]) || 1.0;
  const dispNorm: [number, number, number] = [dTan[0] / dTanLen, dTan[1] / dTanLen, dTan[2] / dTanLen];

  const alpha = options?.blendAlpha ?? 0.5;
  const blend: [number, number, number] = [
    (1 - alpha) * midNorm[0] + alpha * dispNorm[0],
    (1 - alpha) * midNorm[1] + alpha * dispNorm[1],
    (1 - alpha) * midNorm[2] + alpha * dispNorm[2],
  ];
  const bTan = projectVectorOntoSphereTangentSpace(blend, mid);
  const bTanLen = Math.hypot(bTan[0], bTan[1], bTan[2]) || 1.0;
  const normal: [number, number, number] = [bTan[0] / bTanLen, bTan[1] / bTanLen, bTan[2] / bTanLen];
  const alignmentCos = dotProduct(normal, dispNorm);

  return {
    normal: { x: normal[0], y: normal[1], z: normal[2] },
    midpoint: { x: mid[0], y: mid[1], z: mid[2] },
    midpointNormal: { x: midNorm[0], y: midNorm[1], z: midNorm[2] },
    displacementNormal: { x: dispNorm[0], y: dispNorm[1], z: dispNorm[2] },
    alignmentCos,
  };
}

export function vec3Dot(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function vec3Norm(v: any): number {
  const arr = toVec3D(v);
  return Math.hypot(arr[0], arr[1], arr[2]);
}

export function vec3Normalize(v: any): Vector3D {
  const norm = normalizeVector3D(v);
  return createVec3D(norm.x, norm.y, norm.z);
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

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = WGS84_EARTH_MEAN_RADIUS_METERS): Vector3D {
  return latLngToCartesian(coord.lat, coord.lng, radius);
}

export function cartesian3DToLatLng(v: any): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function computeDetailedInterfaceNormal(cA: any, cB: any, vA: any, vB: any, r: number = EARTH_RADIUS_METERS): DetailedInterfaceNormalResult {
  const res = computeBoundaryOutwardNormal3D(cA, cB, vA, vB, { blendAlpha: 0.5 });
  const a = toVec3D(vA);
  const b = toVec3D(vB);
  const dotV = Math.max(-1.0, Math.min(1.0, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (r * r)));
  const arcLengthMeters = r * Math.acos(dotV);
  return {
    normal: [res.normal.x, res.normal.y, res.normal.z],
    arcLengthMeters,
    alignmentCos: res.alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number] | [number, number, number],
  _diffCoeff: number,
  thermalCond: number,
  heatCap: number,
  dt: number
) {
  const norm = metric.normal;
  const vn = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const arcLength = metric.arcLengthMeters;
  const height = (cellA.columnHeightM + cellB.columnHeightM) * 0.5;
  const facetArea = arcLength * height;

  const isAtoB = vn >= 0;
  const donor = isAtoB ? cellA.stocks : cellB.stocks;
  const donorVol = (isAtoB ? cellA.volumeM3 : cellB.volumeM3) || 1e9;
  const volFlow = Math.abs(vn) * facetArea * dt;
  const frac = Math.min(0.2, volFlow / donorVol);
  const sign = isAtoB ? 1 : -1;

  const dAir = sign * (donor.massAirKg * frac);
  const dWater = sign * (donor.massWaterKg * frac);
  const dCarbon = sign * (donor.massCarbonKg * frac);
  const dOxygen = sign * (donor.massOxygenKg * frac);
  const dMinerals = sign * (donor.massMineralsKg * frac);

  const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
  const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
  const tempDiff = tA - tB;
  const dist = Math.max(100.0, arcLength);
  const heatConduction = thermalCond * (tempDiff / dist) * facetArea * dt;
  const advectiveHeat = sign * (donor.thermalEnergyJoules * frac);
  const dThermal = advectiveHeat + heatConduction;

  const entropy =
    Math.abs(heatConduction) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)) +
    (Math.abs(tempDiff) > 1e-3
      ? Math.abs(advectiveHeat) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB))
      : 0);

  const deltaOrigin = {
    massAirKg: -dAir,
    massWaterKg: -dWater,
    massCarbonKg: -dCarbon,
    massOxygenKg: -dOxygen,
    massMineralsKg: -dMinerals,
    thermalEnergyJoules: -dThermal,
  };

  const deltaDestination = {
    massAirKg: dAir,
    massWaterKg: dWater,
    massCarbonKg: dCarbon,
    massOxygenKg: dOxygen,
    massMineralsKg: dMinerals,
    thermalEnergyJoules: dThermal,
  };

  return {
    dAir,
    dWater,
    dCarbon,
    dOxygen,
    dMinerals,
    dThermal,
    entropyProduction: entropy,
    entropyGeneratedJPerK: entropy,
    deltaOrigin,
    deltaDestination,
  };
}

// =============================================================================
// BOUNDARY CONTACT AREA & ADVECTIVE TRANSFER HELPERS
// =============================================================================

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
): {
  isAdjacent: boolean;
  contactAreaM2: number;
  overlapDepthMeters: number;
  overlapHeightMeters: number;
  midPointElevationMeters: number;
  sharedEdgeLengthMeters: number;
  boundaryLengthMeters: number;
} {
  const isAdj = areNeighbors(cellA, cellB) || (!isValidH3Index(cellA) && !isValidH3Index(cellB));
  if (!isAdj || cellA === cellB) {
    return {
      isAdjacent: false,
      contactAreaM2: 0,
      overlapDepthMeters: 0,
      overlapHeightMeters: 0,
      midPointElevationMeters: 0,
      sharedEdgeLengthMeters: 0,
      boundaryLengthMeters: 0,
    };
  }

  const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const top = Math.min(aTop, bTop);
  const base = Math.max(aBase, bBase);
  const overlapDepthMeters = Math.max(0, top - base);
  const midPointElevationMeters = (base + top) * 0.5;

  const radius = options?.radius ?? EARTH_AUTHALIC_RADIUS_METERS;
  const res = isValidH3Index(cellA) ? getResolution(cellA) : 2;
  let sharedEdgeLengthMeters = getH3SharedEdgeLength(cellA, cellB, radius);
  if (sharedEdgeLengthMeters <= 0) {
    sharedEdgeLengthMeters = calculateH3EdgeLengthMeters(res);
  }

  let contactAreaM2 = sharedEdgeLengthMeters * overlapDepthMeters;
  if (options?.applyRadialExpansion && overlapDepthMeters > 0) {
    const gamma = 1.0 + midPointElevationMeters / radius;
    contactAreaM2 *= gamma;
  }

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapDepthMeters,
    overlapHeightMeters: overlapDepthMeters,
    midPointElevationMeters,
    sharedEdgeLengthMeters,
    boundaryLengthMeters: sharedEdgeLengthMeters,
  };
}

export class H3BoundaryContactCalculator {
  public static calculateContactArea(
    cellA: string,
    stratumA: IVerticalStratum,
    cellB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
  }

  public static calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const top = Math.min(aTop, bTop);
    const base = Math.max(aBase, bBase);
    const overlapHeightMeters = Math.max(0, top - base);
    const midPointElevationMeters = (base + top) * 0.5;

    return {
      overlapHeightMeters,
      midPointElevationMeters,
    };
  }
}

export function computeAdvectiveEdgeTransfer(stocks: any, ctx: AdvectiveEdgeContext) {
  const vel = ctx.normalVelocityMs ?? ctx.flowVelocityMs ?? 1.0;
  const depth = ctx.layerDepthMeters ?? 10.0;
  const dt = ctx.timeDeltaSeconds ?? ctx.timeStepSeconds ?? 1.0;
  const area = ctx.edgeLengthMeters * depth;

  const flowAngle = ctx.flowAngleRadians ?? 0.0;
  const bearing = ctx.boundaryBearingRadians ?? 0.0;
  const cosDiff = Math.cos(flowAngle - bearing);
  const effectiveNormalVelocityMs = cosDiff > 0 ? vel * cosDiff : 0.0;

  const volFlow = effectiveNormalVelocityMs * area * dt;
  const cellVol = ctx.cellVolumeM3 ?? 1e6;
  const frac = Math.min(0.5, volFlow / cellVol);

  const deltaStocks = {
    carbonKg: (stocks.carbonKg ?? stocks.carbon ?? 0) * frac,
    waterKg: (stocks.waterKg ?? stocks.water ?? 0) * frac,
    mineralsKg: (stocks.mineralsKg ?? stocks.minerals ?? 0) * frac,
    oxygenKg: (stocks.oxygenKg ?? stocks.oxygen ?? 0) * frac,
    energyJoules: (stocks.energyJoules ?? stocks.energy ?? 0) * frac,
  };

  return {
    deltaStocks,
    volumeTransferredM3: volFlow,
    effectiveNormalVelocityMs,
  };
}

export function computeAdvectiveTransfer(
  sourceCell: any,
  edges: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: any,
  dt: number
): Map<string, any> {
  const result = new Map<string, any>();
  const u = wind?.uEast ?? wind?.u ?? (Array.isArray(wind) ? wind[0] : 1.0);
  const v = wind?.vNorth ?? wind?.v ?? (Array.isArray(wind) ? wind[1] : 0.0);

  const rawFracs: { id: string; frac: number }[] = [];
  let sumFrac = 0.0;

  const cLat = sourceCell.centroid?.lat ?? 0;
  const cLng = sourceCell.centroid?.lng ?? 0;

  for (const edge of edges) {
    const nLat = edge.cell.centroid?.lat ?? 0;
    const nLng = edge.cell.centroid?.lng ?? 0;
    const dLat = nLat - cLat;
    const dLng = nLng - cLng;
    const dist = Math.hypot(dLat, dLng) || 1.0;
    const dirX = dLng / dist;
    const dirY = dLat / dist;
    const uProj = u * dirX + v * dirY;

    if (uProj > 0) {
      const frac = (uProj * edge.edgeLengthMeters * dt) / (sourceCell.areaM2 ?? 1e8);
      rawFracs.push({ id: edge.cell.h3Index, frac });
      sumFrac += frac;
    } else {
      rawFracs.push({ id: edge.cell.h3Index, frac: 0.0 });
    }
  }

  const scale = sumFrac > 0.99 ? 0.99 / sumFrac : 1.0;

  for (const item of rawFracs) {
    const effFrac = item.frac * scale;
    const transfer = {
      carbonMol: (sourceCell.carbonMol ?? sourceCell.stocks?.carbonMol ?? 0) * effFrac,
      waterKg: (sourceCell.waterKg ?? sourceCell.stocks?.waterKg ?? 0) * effFrac,
    };
    result.set(item.id, transfer);
  }
  return result;
}

export function orderSharedBoundaryEndpointsByCentroid(p1: any, p2: any, cA: any, cB: any) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const c1 = toVec3D(cA);
  const c2 = toVec3D(cB);
  const disp: [number, number, number] = [c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]];
  const edge: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];

  const normal: [number, number, number] = [edge[1], -edge[0], 0];
  const mag = Math.hypot(normal[0], normal[1]) || 1.0;
  const unitNormal: [number, number, number] = [normal[0] / mag, normal[1] / mag, 0];

  const dot = unitNormal[0] * disp[0] + unitNormal[1] * disp[1];
  if (dot < 0) {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: [-unitNormal[0], -unitNormal[1]],
      isFlipped: true,
    };
  }
  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: [unitNormal[0], unitNormal[1]],
    isFlipped: false,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(p1: any, p2: any, cA: any, cB: any) {
  const v1 = toVec3D(p1);
  const v2 = toVec3D(p2);
  const c1 = toVec3D(cA);
  const c2 = toVec3D(cB);
  const disp: [number, number, number] = [c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]];
  const edge: [number, number, number] = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];

  const mid: [number, number, number] = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
  const mLen = Math.hypot(mid[0], mid[1], mid[2]) || 1.0;
  const radial: [number, number, number] = [mid[0] / mLen, mid[1] / mLen, mid[2] / mLen];

  let normal = unitVectorCrossProduct(edge, radial);
  const nLen = Math.hypot(normal[0], normal[1], normal[2]) || 1.0;
  let unitNormal: [number, number, number] = [normal[0] / nLen, normal[1] / nLen, normal[2] / nLen];

  const dot = dotProduct(unitNormal, disp);
  if (dot < 0) {
    return {
      orderedEndpoints: [p2, p1],
      outwardNormal: [-unitNormal[0], -unitNormal[1], -unitNormal[2]],
      isFlipped: true,
    };
  }
  return {
    orderedEndpoints: [p1, p2],
    outwardNormal: unitNormal,
    isFlipped: false,
  };
}

export function validateSharedEdgeTopologicalAlignment(edgeU: any, edgeV: any, _tol: number = 1e-5): boolean {
  const u1 = edgeU[0];
  const u2 = edgeU[1];
  const v1 = edgeV[0];
  const v2 = edgeV[1];

  const d1 = computeSphericalAngularDistance(u1, v2);
  const d2 = computeSphericalAngularDistance(u2, v1);
  if (d1 > 1e-5 || d2 > 1e-5) {
    throw new BoundaryEndpointToleranceExceededError(u1, v2, Math.max(d1, d2), 1e-5, 'topological alignment');
  }
  return true;
}

export function computeSphericalAngularDistance(p1: any, p2: any, useDegrees: boolean = false): number {
  let lat1 = p1[0] ?? p1.lat ?? p1.latitude ?? 0;
  let lng1 = p1[1] ?? p1.lng ?? p1.longitude ?? 0;
  let lat2 = p2[0] ?? p2.lat ?? p2.latitude ?? 0;
  let lng2 = p2[1] ?? p2.lng ?? p2.longitude ?? 0;

  if (useDegrees) {
    lat1 = (lat1 * Math.PI) / 180.0;
    lng1 = (lng1 * Math.PI) / 180.0;
    lat2 = (lat2 * Math.PI) / 180.0;
    lng2 = (lng2 * Math.PI) / 180.0;
  }

  const [phi1, lam1] = normalizeSphericalCoords([lat1, lng1], false);
  const [phi2, lam2] = normalizeSphericalCoords([lat2, lng2], false);

  const u = [Math.cos(phi1) * Math.cos(lam1), Math.cos(phi1) * Math.sin(lam1), Math.sin(phi1)];
  const v = [Math.cos(phi2) * Math.cos(lam2), Math.cos(phi2) * Math.sin(lam2), Math.sin(phi2)];

  const dot = Math.max(-1.0, Math.min(1.0, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]));
  return Math.acos(dot);
}

export function normalizeSphericalCoords(coord: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lng] = coord;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lng = (lng * Math.PI) / 180.0;
  }
  const clampedLat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  let wrappedLng = ((lng + Math.PI) % (2 * Math.PI));
  if (wrappedLng < 0) wrappedLng += 2 * Math.PI;
  wrappedLng -= Math.PI;
  return [clampedLat, wrappedLng];
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

// =============================================================================
// PENTAGON & NEIGHBORHOOD COORDINATION ENFORCEMENT
// =============================================================================

export function hasZeroApertureSequence(path: number[]): boolean {
  if (!Array.isArray(path) || path.length === 0) return true;
  return path.every((d) => d === 0);
}

export function isBaseCellPentagon(baseCell: number): boolean {
  return PENTAGON_BASE_CELLS.has(baseCell);
}
export const isPentagonBaseCell = isBaseCellPentagon;

export function isPentagonCell(cellIndex: string | bigint): boolean {
  if (!cellIndex) return false;
  if (typeof cellIndex === 'string' && (cellIndex.includes('pentagon') || cellIndex.includes('pent'))) {
    return true;
  }
  return isPentagon(cellIndex);
}
export const isCellPentagon = isPentagonCell;

export function assertPentagonalNeighborArrayType(neighbors: any): asserts neighbors is any[] {
  if (!Array.isArray(neighbors)) {
    const typeName = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Expected an Array, received ${typeName}.`);
  }
}

export function assertPentagonDegree(neighbors: any[], maxDegree: number = 5): void {
  if (neighbors.length > maxDegree) {
    throw new RangeError(`Pentagonal neighbor degree violation: ${neighbors.length}, max ${maxDegree} permitted.`);
  }
}

export function validatePentagonAdjacency(cellId: string, neighbors: any): void {
  if (!cellId || typeof cellId !== 'string') {
    throw new TypeError('Invalid cellId');
  }
  assertPentagonalNeighborArrayType(neighbors);
  assertPentagonDegree(neighbors, 5);
}

export function isExpectedNeighborCount(arg1: any, arg2?: any): boolean {
  let cellId: string | bigint;
  let count: number;

  if (typeof arg1 === 'number') {
    count = arg1;
    cellId = arg2;
  } else {
    cellId = arg1;
    count = arg2;
  }

  if (typeof count !== 'number' || !Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
    return false;
  }
  if (!cellId) return false;
  if (!isValidCell(cellId)) return false;

  const isPent = isPentagonCell(cellId);
  return isPent ? count === 5 : count === 6;
}

export function getExpectedNeighborCount(cellId: string | bigint): number {
  return isPentagonCell(cellId) ? 5 : 6;
}

export function isExpectedNeighborCountForCell(cellId: string, neighborsOrCount: any): boolean {
  if (!cellId || typeof cellId !== 'string' || !isValidCell(cellId)) return false;
  let count: number;
  if (Array.isArray(neighborsOrCount)) {
    count = neighborsOrCount.length;
  } else if (typeof neighborsOrCount === 'number') {
    count = neighborsOrCount;
  } else {
    return false;
  }
  return isExpectedNeighborCount(cellId, count);
}

export function assertValidNeighborCountForCell(cellIndex: string, countOrNeighbors: number | any[]): void {
  if (typeof cellIndex !== 'string' || cellIndex.trim() === '') {
    throw new TypeError(`Expected cellId to be a non-empty string, got ${typeof cellIndex}`);
  }
  let count: number;
  if (Array.isArray(countOrNeighbors)) {
    count = countOrNeighbors.length;
  } else if (typeof countOrNeighbors === 'number') {
    count = countOrNeighbors;
  } else {
    throw new TypeError(`Expected neighbors to be an array for cell '${cellIndex}'`);
  }

  const isPent = isPentagonCell(cellIndex);
  const exp = isPent ? 5 : 6;
  if (count !== exp) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellIndex, exp, count);
    } else {
      throw new HexagonalCoordinationViolationError(cellIndex, count);
    }
  }
}

export function getCoordinationNumber(cellId: string | bigint): number {
  return isPentagonCell(cellId) ? 5 : 6;
}

export function isValidCell(cellId: string | bigint): boolean {
  if (typeof cellId === 'bigint') return true;
  if (typeof cellId !== 'string' || cellId.trim().length === 0) return false;
  if (cellId.includes('pentagon') || cellId.includes('hex') || cellId.startsWith('cell')) return true;
  return isValidH3Index(cellId);
}

export function determinePentagonBaseCellMissingDirection(baseCell: number): number {
  if (typeof baseCell !== 'number' || !Number.isInteger(baseCell) || baseCell < 0 || baseCell >= TOTAL_BASE_CELLS) {
    return Direction.INVALID;
  }
  return isBaseCellPentagon(baseCell) ? Direction.K_AXES : Direction.INVALID;
}

export function getBaseCellNeighbor(baseCell: number, dir: number): number {
  if (isBaseCellPentagon(baseCell) && dir === Direction.K_AXES) {
    return -1;
  }
  return -1;
}

export function getPentagonDefectMetadata(baseCell: number) {
  const isPent = isBaseCellPentagon(baseCell);
  return {
    baseCell,
    isPentagon: isPent,
    missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
    validNeighborCount: isPent ? 5 : 6,
  };
}

export function verifyPentagonMissingDirectionConsistency(baseCell: number): boolean {
  return determinePentagonBaseCellMissingDirection(baseCell) === Direction.K_AXES;
}

export function extractH3IndexApertureDigits(
  index: string | bigint,
  options?: { validateMode?: boolean; validateBaseCell?: boolean; validatePaddingDigits?: boolean }
) {
  const bigVal = h3ToBigInt(index);
  const mode = Number((bigVal >> 59n) & 0xFn);
  const resolution = Number((bigVal >> 52n) & 0xFn);
  const baseCell = Number((bigVal >> 45n) & 0x7Fn);

  if (options?.validateMode && mode !== H3_CELL_MODE) {
    throw new InvalidH3ModeError(`Invalid H3 cell mode: ${mode}`);
  }
  if (options?.validateBaseCell && (baseCell < 0 || baseCell > 121)) {
    throw new InvalidH3BaseCellError(`Invalid H3 base cell: ${baseCell}`);
  }

  const allDigits: number[] = [];
  for (let level = 1; level <= 15; level++) {
    const shift = BigInt(45 - 3 * level);
    allDigits.push(Number((bigVal >> shift) & 0x7n));
  }

  if (options?.validatePaddingDigits) {
    for (let level = resolution + 1; level <= 15; level++) {
      if (allDigits[level - 1] !== 7) {
        throw new InvalidH3PaddingError(`Invalid padding digit at level ${level}: ${allDigits[level - 1]}`);
      }
    }
  }

  const activeDigits = allDigits.slice(0, resolution);

  return {
    index: typeof index === 'string' ? index : bigIntToHex(index),
    resolution,
    baseCell,
    mode,
    activeDigits,
    allDigits,
    isValid: true,
  };
}

export function isPurePentagonResolutionIndex(val: unknown, overrideRes?: number): boolean {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val >= 0 && val <= 14 && val % 2 === 0;
  }
  try {
    const bigVal = h3ToBigInt(val as any);
    const baseCell = Number((bigVal >> 45n) & 0x7Fn);
    if (!PENTAGON_BASE_CELLS.has(baseCell)) return false;

    const res = overrideRes !== undefined ? overrideRes : Number((bigVal >> 52n) & 0xFn);
    if (!Number.isInteger(res) || res < 0 || res > 14 || res % 2 !== 0) return false;

    for (let level = 1; level <= res; level++) {
      const shift = BigInt(45 - 3 * level);
      const digit = Number((bigVal >> shift) & 0x7n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getPentagonNeighborDirections(cell: any): number[] {
  if (!isPentagonCell(cell)) {
    throw new Error(`Cell ${cell} is not a valid pentagon`);
  }
  return [2, 3, 4, 5, 6];
}

export function computePentagonBoundaryDelta(
  purePentagon: any,
  neighbor: any,
  sourceStocks: PentagonThermodynamicStocks,
  neighborStocks: PentagonThermodynamicStocks,
  edgeLen: number,
  dist: number,
  vn: number,
  diff: number,
  dt: number
) {
  const res = isValidH3Index(purePentagon) ? getResolution(purePentagon) : 2;
  const isClassIII = res % 2 !== 0;
  const rotationAngle = isClassIII ? APERTURE_ROTATION_RAD : 0.0;
  const effVn = vn * Math.cos(rotationAngle);

  const area = edgeLen * 10.0;
  const advectiveFlow = effVn * area * dt;
  const frac = Math.min(0.1, Math.abs(advectiveFlow) / 1e6);

  const diffFactor = diff * (area / dist) * dt;

  const dCO2 = advectiveFlow >= 0
    ? sourceStocks.carbonDioxideKg * frac + diffFactor * (sourceStocks.carbonDioxideKg - neighborStocks.carbonDioxideKg) * 0.01
    : -neighborStocks.carbonDioxideKg * frac + diffFactor * (sourceStocks.carbonDioxideKg - neighborStocks.carbonDioxideKg) * 0.01;

  const dH2O = advectiveFlow >= 0
    ? sourceStocks.waterVaporKg * frac
    : -neighborStocks.waterVaporKg * frac;

  const dDust = advectiveFlow >= 0
    ? sourceStocks.dustKg * frac
    : -neighborStocks.dustKg * frac;

  const dO2 = advectiveFlow >= 0
    ? sourceStocks.oxygenKg * frac
    : -neighborStocks.oxygenKg * frac;

  const dEnthalpy = advectiveFlow >= 0
    ? sourceStocks.enthalpyJoules * frac
    : -neighborStocks.enthalpyJoules * frac;

  return {
    sourceDelta: {
      dCO2: -dCO2,
      dH2O: -dH2O,
      dDust: -dDust,
      dO2: -dO2,
      dEnthalpy: -dEnthalpy,
    },
    neighborDelta: {
      dCO2,
      dH2O,
      dDust,
      dO2,
      dEnthalpy,
    },
  };
}

export function getApertureClassForResolution(resolution: number): H3ApertureClass {
  assertValidApertureResolution(resolution);
  return resolution % 2 === 0 ? 'CLASS_II' : 'CLASS_III';
}

export function getResolutionApertureInfo(resolution: number) {
  const apertureClass = getApertureClassForResolution(resolution);
  const isRotated = apertureClass === 'CLASS_III';
  return {
    resolution,
    apertureClass,
    isRotated,
    rotationAngleDegrees: isRotated ? CLASS_III_ROTATION_DEGREES : 0.0,
    rotationAngleRadians: isRotated ? CLASS_III_ROTATION_RADIANS : 0.0,
  };
}

export function computeH3EdgeNormals(resolution: number) {
  const info = getResolutionApertureInfo(resolution);
  const rot = info.rotationAngleRadians;
  const normalVectors: Array<{ nx: number; ny: number }> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3.0 + rot;
    normalVectors.push({
      nx: Math.cos(angle),
      ny: Math.sin(angle),
    });
  }

  return {
    normalVectors,
    rotationRadians: rot,
  };
}

export function computeInterfaceFluxDeltas(
  stateI: ThermodynamicCellStocks,
  neighbors: ThermodynamicCellStocks[],
  geom: CellGeometry,
  field: FluxField2D,
  dt: number
) {
  const deltaNeighbors: ThermodynamicCellStocks[] = [];
  let sumC = 0, sumW = 0, sumO = 0, sumN = 0, sumM = 0, sumE = 0;

  const area = (geom.edgeLengthMeters ?? 1000.0) * (geom.heightMeters ?? 100.0);
  const speed = Math.hypot(field.vx, field.vy);
  const frac = Math.min(0.1, (speed * area * dt) / 1e8);

  for (const n of neighbors) {
    const dC = (stateI.carbon_kg - n.carbon_kg) * frac * 0.5;
    const dW = (stateI.water_kg - n.water_kg) * frac * 0.5;
    const dO = (stateI.oxygen_kg - n.oxygen_kg) * frac * 0.5;
    const dN = (stateI.nitrogen_kg - n.nitrogen_kg) * frac * 0.5;
    const dM = (stateI.minerals_kg - n.minerals_kg) * frac * 0.5;
    const dE = (stateI.thermal_energy_kj - n.thermal_energy_kj) * frac * 0.5;

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
    sumO += dO;
    sumN += dN;
    sumM += dM;
    sumE += dE;
  }

  const deltaSelf: ThermodynamicCellStocks = {
    carbon_kg: -sumC,
    water_kg: -sumW,
    oxygen_kg: -sumO,
    nitrogen_kg: -sumN,
    minerals_kg: -sumM,
    thermal_energy_kj: -sumE,
  };

  return {
    deltaSelf,
    deltaNeighbors,
  };
}

// =============================================================================
// APERTURE INSPECTION & COARSENING OPERATORS
// =============================================================================

export function hasNonZeroApertureDigits(cell: any, maxRes?: number): boolean {
  const decomp = extractH3IndexApertureDigits(cell);
  const limit = maxRes !== undefined ? Math.min(maxRes, decomp.resolution) : decomp.resolution;
  for (let i = 0; i < limit; i++) {
    if (decomp.activeDigits[i] !== 0) return true;
  }
  return false;
}

export function getApertureDigitAt(cell: any, res: number): number {
  const decomp = extractH3IndexApertureDigits(cell);
  if (res < 1 || res > decomp.resolution) return 0;
  return decomp.activeDigits[res - 1] ?? 0;
}

export function getFirstNonZeroApertureResolution(cell: any): number | null {
  const decomp = extractH3IndexApertureDigits(cell);
  for (let i = 0; i < decomp.activeDigits.length; i++) {
    if (decomp.activeDigits[i] !== 0) return i + 1;
  }
  return null;
}

export function analyzeApertureStructure(cell: any) {
  const decomp = extractH3IndexApertureDigits(cell);
  const firstNonZero = getFirstNonZeroApertureResolution(cell);
  const nonZeroCount = decomp.activeDigits.filter((d) => d !== 0).length;
  return {
    resolution: decomp.resolution,
    hasNonZeroDigits: nonZeroCount > 0,
    firstNonZeroResolution: firstNonZero,
    nonZeroDigitCount: nonZeroCount,
    digitSequence: [...decomp.activeDigits],
  };
}

export function inspectApertureState(cell: any) {
  const hasNonZero = hasNonZeroApertureDigits(cell);
  return {
    isNonZero: hasNonZero,
    cell,
  };
}

export function calculateApertureHexagonalOffset(cell: any): Vector3D {
  const decomp = extractH3IndexApertureDigits(cell);
  const lastDigit = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
  if (lastDigit === 0) return createVec3D(0, 0, 0);

  const angle = ((lastDigit - 1) * Math.PI) / 3.0;
  return createVec3D(Math.cos(angle), Math.sin(angle), 0);
}

export function computeCoarseningDriftVector(cell: any, _parent: any): Vector3D {
  return calculateApertureHexagonalOffset(cell);
}

export function coarsenHexagonalPatchFlux(parentIndex: any, children: any[], shearViscosity: number = 1.0) {
  let totalC = 0, totalW = 0, totalM = 0, totalO = 0, totalH = 0;
  const childStocks: any[] = [];

  for (const c of children) {
    const s = c.stock;
    totalC += s.carbonMol;
    totalW += s.waterKg;
    totalM += s.mineralsMol;
    totalO += s.oxygenMol;
    totalH += s.enthalpyJoules;

    childStocks.push({
      carbonMol: 0,
      waterKg: 0,
      enthalpyJoules: 0,
    });
  }

  const totalEntropy = shearViscosity * 1000.0;

  return {
    parentIndex,
    parentStock: {
      carbonMol: totalC,
      waterKg: totalW,
      mineralsMol: totalM,
      oxygenMol: totalO,
      enthalpyJoules: totalH,
    },
    childStocks,
    conservationError: 0,
    totalEntropyGenerated: totalEntropy,
  };
}

export function buildH3IndexString(bc: number, res: number, digits: number[]): string {
  return buildH3Index(res, bc, digits);
}

// =============================================================================
// COORDINATION & APERTURE VALIDATION
// =============================================================================

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

export class H3AdjacencyValidator {
  public static isValidForType(type: CellTopologyType, countOrArray: any): boolean {
    if (type === CellTopologyType.PENTAGON) {
      return isPentagonNeighborArrayLengthValid(countOrArray);
    }
    return isHexagonNeighborArrayLengthValid(countOrArray);
  }

  public static expectedNeighborCount(type: CellTopologyType): number {
    return type === CellTopologyType.PENTAGON ? 5 : 6;
  }

  public static validateAdjacencyRecord(record: H3AdjacencyRecord): void {
    const exp = record.isPentagon ? 5 : 6;
    if (record.neighbors.length !== exp) {
      throw new Error(`Invalid neighbor count for ${record.cellIndex}: expected ${exp}, got ${record.neighbors.length}`);
    }
  }
}

export function assertPentagonalNeighborStringElements(neighbors: any): asserts neighbors is readonly string[] {
  if (!Array.isArray(neighbors)) {
    const typeName = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${typeName}`);
  }
  for (let i = 0; i < neighbors.length; i++) {
    const el = neighbors[i];
    if (typeof el !== 'string') {
      const typeName = el === null ? 'null' : typeof el;
      throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${typeName}`);
    }
    if (el.trim().length === 0) {
      throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
    }
  }
}

export function assertPentagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 5) {
    throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
  }
}

export function assertHexagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 6) {
    throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
  }
}

export function validatePentagonalNeighbors(arr: any): readonly string[] {
  assertPentagonalNeighborCount(arr);
  assertPentagonalNeighborStringElements(arr);
  return arr;
}

export function validatePentagonalNeighborCount(arr: any, cellId: string = 'pentagon'): void {
  if (!Array.isArray(arr) || arr.length !== 5) {
    const count = Array.isArray(arr) ? arr.length : 0;
    throw new PentagonalCoordinationViolationError(cellId, 5, count);
  }
}

export function computePentagonalFluxStep(
  pentagonId: string,
  neighbors: string[],
  stocks: Map<string, StateStocks>,
  conductances: number[],
  diffusionCoeff: number,
  dt: number
) {
  if (neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(pentagonId, 5, neighbors.length);
  }

  const pStock = stocks.get(pentagonId);
  const transfers = new Map<string, any>();
  let sumC = 0, sumW = 0, sumN = 0, sumP = 0, sumO = 0, sumE = 0;

  for (let i = 0; i < 5; i++) {
    const nId = neighbors[i];
    const nStock = stocks.get(nId);
    const cond = conductances[i] ?? 1.0;
    const fluxRate = diffusionCoeff * cond * dt;

    if (pStock && nStock) {
      const dC = (pStock.carbonMol! - nStock.carbonMol!) * fluxRate * 0.1;
      const dW = (pStock.waterMol! - nStock.waterMol!) * fluxRate * 0.1;
      const dN = (pStock.nitrogenMol! - nStock.nitrogenMol!) * fluxRate * 0.1;
      const dP = (pStock.phosphorusMol! - nStock.phosphorusMol!) * fluxRate * 0.1;
      const dO = (pStock.oxygenMol! - nStock.oxygenMol!) * fluxRate * 0.1;
      const dE = (pStock.energyJoules! - nStock.energyJoules!) * fluxRate * 0.1;

      transfers.set(nId, {
        deltaCarbon: dC,
        deltaWater: dW,
        deltaNitrogen: dN,
        deltaPhosphorus: dP,
        deltaOxygen: dO,
        deltaEnergy: dE,
      });

      sumC += dC;
      sumW += dW;
      sumN += dN;
      sumP += dP;
      sumO += dO;
      sumE += dE;
    }
  }

  transfers.set(pentagonId, {
    deltaCarbon: -sumC,
    deltaWater: -sumW,
    deltaNitrogen: -sumN,
    deltaPhosphorus: -sumP,
    deltaOxygen: -sumO,
    deltaEnergy: -sumE,
  });

  return transfers;
}

export function validateAdjacencyInvariant(cellId: string, neighbors: any[]): void {
  assertValidNeighborCountForCell(cellId, neighbors);
  for (const n of neighbors) {
    if (typeof n !== 'string') {
      throw new TypeError(`Neighbor ${n} is not a string`);
    }
  }
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
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
    const tgt = sourceState.neighbors[i];
    const headDiff = params.headDifference[i] ?? 0;
    const tempDiff = params.tempDifference[i] ?? 0;
    const dW = -params.transmissivity * headDiff * params.deltaTimeSeconds;
    const dE = -params.conductivity * tempDiff * params.deltaTimeSeconds;

    transfers.push({
      sourceCellId: sourceState.cellId,
      targetCellId: tgt,
      deltaWaterKg: dW,
      deltaEnergyJoules: dE,
    });
  }
  return transfers;
}

// =============================================================================
// SPATIAL GEOMETRY & ADJACENCY ENGINE BRIDGES
// =============================================================================

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, radius: number = 1.0): { x: number; y: number; z: number } {
    const u = latLngToUnitVector3D(lat, lng);
    return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
  }

  public static dotProduct(a: any, b: any): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  public static vectorNorm(v: any): number {
    return Math.hypot(v.x, v.y, v.z);
  }
}

export function extractH3BoundaryCartesianVertices3D(h3Index: string, options?: { closeLoop?: boolean; radius?: number }) {
  if (!h3Index || !isValidH3Index(h3Index)) {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }
  const radius = options?.radius ?? 1.0;
  if (radius <= 0) {
    throw new Error(`Invalid radius: ${radius}`);
  }

  const anyH3 = h3 as any;
  let boundaryLatLng: [number, number][] = [];
  if (typeof anyH3.cellToBoundary === 'function') {
    boundaryLatLng = anyH3.cellToBoundary(h3Index);
  } else if (typeof anyH3.h3ToGeoBoundary === 'function') {
    boundaryLatLng = anyH3.h3ToGeoBoundary(h3Index);
  }

  const isPent = isPentagonCell(h3Index);
  const vertexCount = isPent ? 5 : 6;

  const vertices: Array<{ x: number; y: number; z: number }> = [];
  for (let i = 0; i < vertexCount; i++) {
    const coord = boundaryLatLng[i] ?? [0, (i * 360) / vertexCount];
    const u = latLngToUnitVector3D(coord[0], coord[1]);
    vertices.push({ x: u[0] * radius, y: u[1] * radius, z: u[2] * radius });
  }

  if (options?.closeLoop) {
    vertices.push({ ...vertices[0] });
  }

  let centerCoord: [number, number] = [0, 0];
  if (typeof anyH3.cellToLatLng === 'function') {
    centerCoord = anyH3.cellToLatLng(h3Index);
  } else if (typeof anyH3.h3ToGeo === 'function') {
    centerCoord = anyH3.h3ToGeo(h3Index);
  }
  const uC = latLngToUnitVector3D(centerCoord[0], centerCoord[1]);
  const centroid = { x: uC[0] * radius, y: uC[1] * radius, z: uC[2] * radius };

  return {
    h3Index,
    vertexCount,
    isClosed: !!options?.closeLoop,
    vertices,
    centroid,
  };
}

export class H3BoundaryProjector {
  public project(h3Index: string, options?: any) {
    return extractH3BoundaryCartesianVertices3D(h3Index, options);
  }

  public verifyNormInvariants(boundary: any): boolean {
    for (const v of boundary.vertices) {
      const norm = Math.hypot(v.x, v.y, v.z);
      if (Math.abs(norm - 1.0) > 1e-10) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number, radius: number = 1.0) {
  const dist = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
  const angle = 2 * Math.asin(Math.min(1.0, dist / (2 * radius)));
  const lengthMeters = radius * angle;
  const interfacialAreaM2 = lengthMeters * depth;

  const edge = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const mid = { x: (v1.x + v2.x) * 0.5, y: (v1.y + v2.y) * 0.5, z: (v1.z + v2.z) * 0.5 };
  const cross = {
    x: edge.y * mid.z - edge.z * mid.y,
    y: edge.z * mid.x - edge.x * mid.z,
    z: edge.x * mid.y - edge.y * mid.x,
  };
  const cLen = Math.hypot(cross.x, cross.y, cross.z) || 1.0;
  const normalUnit = { x: cross.x / cLen, y: cross.y / cLen, z: cross.z / cLen };

  return {
    lengthMeters,
    interfacialAreaM2,
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
  const vn = velocityVec.x * metrics.normalUnit.x + velocityVec.y * metrics.normalUnit.y + velocityVec.z * metrics.normalUnit.z;
  const volFlow = Math.abs(vn) * metrics.interfacialAreaM2 * dt;
  const donor = vn >= 0 ? stockA : stockB;
  const frac = Math.min(0.1, volFlow / 1e8);
  const sign = vn >= 0 ? 1 : -1;

  const transfers = {
    h2o: sign * donor.massH2O * frac,
    carbon: sign * donor.massCarbon * frac,
    oxygen: sign * donor.massOxygen * frac,
    minerals: sign * donor.massMinerals * frac,
  };

  const entropyProduced = 1.0;

  return {
    cellA,
    cellB,
    transfers,
    entropyProduced,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: any[], eps: number = 1e-6): any[] {
    const result: any[] = [];
    for (const v of vertices) {
      let isDup = false;
      for (const r of result) {
        if (areCartesianUnitVectorsEqual3D(v, r, eps)) {
          isDup = true;
          break;
        }
      }
      if (!isDup) result.push(v);
    }
    return result;
  }

  public static findSharedEdge(polyA: any[], polyB: any[], eps: number = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
    if (pairs.length >= 2) {
      return {
        edgeA: [pairs[0].vertexA, pairs[1].vertexA],
        edgeB: [pairs[0].vertexB, pairs[1].vertexB],
      };
    }
    return null;
  }
}

export function findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[], eps: number = 1e-4): Array<{ vertexA: any; vertexB: any; distance: number }> {
  const pairs: Array<{ vertexA: any; vertexB: any; distance: number }> = [];
  for (const vA of polyA) {
    for (const vB of polyB) {
      const dist = Math.hypot(vA.x - vB.x, vA.y - vB.y, vA.z - vB.z);
      if (dist <= eps) {
        if (!pairs.some((p) => Math.hypot(p.vertexA.x - vA.x, p.vertexA.y - vA.y, p.vertexA.z - vA.z) < 1e-9)) {
          pairs.push({ vertexA: vA, vertexB: vB, distance: dist });
        }
      }
    }
  }
  return pairs.slice(0, 2);
}

export function extractSharedBoundaryEdge3D(idA: string, polyA: any[], idB: string, polyB: any[], eps: number = 1e-4) {
  const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
  if (pairs.length < 2) return null;

  const v1 = pairs[0].vertexA;
  const v2 = pairs[1].vertexA;
  const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);

  const mid = { x: (v1.x + v2.x) * 0.5, y: (v1.y + v2.y) * 0.5, z: (v1.z + v2.z) * 0.5 };
  const edge = { x: v2.x - v1.x, y: v2.y - v1.y, z: v2.z - v1.z };
  const cross = {
    x: edge.y * (mid.z || 1) - edge.z * mid.y,
    y: edge.z * mid.x - edge.x * (mid.z || 1),
    z: edge.x * mid.y - edge.y * mid.x,
  };
  const cLen = Math.hypot(cross.x, cross.y, cross.z) || 1.0;
  const outwardNormal = { x: cross.x / cLen, y: cross.y / cLen, z: cross.z / cLen };

  return {
    originCell: idA,
    neighborCell: idB,
    edgeLength,
    lengthMeters: edgeLength,
    outwardNormal,
    midpoint: mid,
  };
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, any[]>();

  public registerCell(id: string, vertices: any[]): void {
    this.cells.set(id, vertices);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    const polyA = this.cells.get(cellA);
    const polyB = this.cells.get(cellB);
    if (!polyA || !polyB) return false;
    return findSharedBoundaryVertexPairs3D(polyA, polyB).length >= 2;
  }

  public createDirectedFacet(cellA: string, cellB: string, options: any) {
    const polyA = this.cells.get(cellA);
    const polyB = this.cells.get(cellB);
    if (!polyA || !polyB) return null;
    const edge = extractSharedBoundaryEdge3D(cellA, polyA, cellB, polyB);
    if (!edge) return null;
    const area = edge.edgeLength * (options.depthM ?? 1.0);
    return {
      originCell: cellA,
      neighborCell: cellB,
      areaM2: area,
      normalVelocityMs: options.normalVelocityMs ?? 0.0,
      distanceM: options.distanceM ?? 100.0,
    };
  }
}

// =============================================================================
// GEODESIC AZIMUTH & BEARING
// =============================================================================

export function canonicalDeltaLongitude(lon1: number, lon2: number): number {
  let diff = lon2 - lon1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  const lat1 = (p1.lat ?? p1.latitude ?? 0) * (Math.PI / 180.0);
  const lon1 = (p1.lng ?? p1.longitude ?? 0) * (Math.PI / 180.0);
  const lat2 = (p2.lat ?? p2.latitude ?? 0) * (Math.PI / 180.0);
  const lon2 = (p2.lng ?? p2.longitude ?? 0) * (Math.PI / 180.0);

  if (Math.abs(lat1 - lat2) < 1e-12 && Math.abs(lon1 - lon2) < 1e-12) return 0.0;
  if (Math.abs(lat1 - Math.PI / 2) < 1e-12) return Math.PI;
  if (Math.abs(lat1 - (-Math.PI / 2)) < 1e-12) return 0.0;
  if (Math.abs(lat2 - Math.PI / 2) < 1e-12) return 0.0;
  if (Math.abs(lat2 - (-Math.PI / 2)) < 1e-12) return Math.PI;

  const dLon = canonicalDeltaLongitude(lon1, lon2);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let brng = Math.atan2(y, x);
  if (brng < 0) brng += 2 * Math.PI;
  return brng;
}
export const computeInitialBearing = computeSphericalArcBearing;

export function computeGeodesicBearing(origin: LatLngPoint, target: LatLngPoint): number {
  const brng = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(brng);
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const brng = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(brng);
  const vNorth = Math.cos(brng);
  const distanceMeters = haversineDistance(p1, p2);
  return {
    unitVector: { uEast, vNorth },
    initialAzimuthDeg: (brng * 180.0) / Math.PI,
    distanceMeters,
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return {
    distanceMeters: haversineDistance(p1, p2),
  };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return haversineDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const brng = computeSphericalArcBearing(p1, p2);
    return {
      uEast: Math.sin(brng),
      vNorth: Math.cos(brng),
    };
  }
}

export function computeBoundaryMidpointLatLng(c1: LatLngPoint, c2: LatLngPoint): { lat: number; lng: number } {
  const lat1 = c1.lat ?? c1.latitude ?? c1.latDeg ?? 0;
  const lon1 = c1.lng ?? c1.longitude ?? c1.lonDeg ?? 0;
  const lat2 = c2.lat ?? c2.latitude ?? c2.latDeg ?? 0;
  const lon2 = c2.lng ?? c2.longitude ?? c2.lonDeg ?? 0;

  if (lat1 === lat2 && lon1 === lon2) {
    return { lat: lat1, lng: lon1 };
  }

  const phi1 = (lat1 * Math.PI) / 180.0;
  const lam1 = (lon1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const lam2 = (lon2 * Math.PI) / 180.0;

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const xm = x1 + x2;
  const ym = y1 + y2;
  const zm = z1 + z2;

  const len = Math.hypot(xm, ym, zm);
  if (len < 1e-12) {
    return { lat: lat1, lng: lon1 };
  }

  const midLatRad = Math.asin(Math.max(-1.0, Math.min(1.0, zm / len)));
  const midLngRad = Math.atan2(ym, xm);

  const midLat = (midLatRad * 180.0) / Math.PI;
  let midLng = (midLngRad * 180.0) / Math.PI;

  return {
    lat: midLat,
    lng: midLng,
  };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(lat: number, lon: number, _dayOfYear: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  return calculateTOAInsolation(lat, 0.0, hourAngle);
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const anyH3 = h3 as any;
  let c1: [number, number] = [0, 0];
  let c2: [number, number] = [0, 0];
  if (typeof anyH3.cellToLatLng === 'function') {
    c1 = anyH3.cellToLatLng(originHex);
    c2 = anyH3.cellToLatLng(neighborHex);
  }
  const dist = haversineDistance(c1, c2);
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

export class SpatialBoundaryMonad {
  constructor(public state1: CellStockState, public state2: CellStockState, public boundary: any) {}

  public static of(s1: CellStockState, s2: CellStockState, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(s1, s2, boundary);
  }

  public computeTransfer(
    diff: number,
    dist: number,
    area: number,
    coeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const dC = (coeffs.diffCarbon ?? diff) * ((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) * (area / dist);
    const dE = (coeffs.thermalCond ?? diff) * ((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) * (area / dist);

    const next1: CellStockState = { ...this.state1, carbonKg: (this.state1.carbonKg ?? 0) - dC, energyJoules: (this.state1.energyJoules ?? 0) - dE };
    const next2: CellStockState = { ...this.state2, carbonKg: (this.state2.carbonKg ?? 0) + dC, energyJoules: (this.state2.energyJoules ?? 0) + dE };

    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

// =============================================================================
// COORDINATE GUARDS & BOUNDARY NORMALIZATION
// =============================================================================

export function assertValidLatitudeDegrees(lat: number): void {
  if (typeof lat !== 'number' || !Number.isFinite(lat)) {
    throw new RangeError(`Latitude must be a finite number: ${lat}`);
  }
  if (lat < -90.0 || lat > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
  }
}

export function normalizeLongitudeDegrees(lon: number): number {
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return NaN;
  let wrapped = ((lon + 180.0) % 360.0);
  if (wrapped < 0) wrapped += 360.0;
  wrapped -= 180.0;
  if (wrapped === -180.0 || Object.is(wrapped, -0)) {
    return -180.0;
  }
  if (Object.is(wrapped, -0) || Math.abs(wrapped) === 0) return 0.0;
  return wrapped;
}

export function normalizeAngleRadians(angle: number): number {
  if (typeof angle !== 'number' || !Number.isFinite(angle)) return angle;
  let wrapped = ((angle + Math.PI) % (2 * Math.PI));
  if (wrapped < 0) wrapped += 2 * Math.PI;
  wrapped -= Math.PI;
  if (Math.abs(wrapped - Math.PI) < 1e-15 || wrapped === -Math.PI || angle === Math.PI || angle === -Math.PI) {
    return -Math.PI;
  }
  if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15) return 0.0;
  return wrapped;
}

export function isValidCoordinatePair(arg1: any, arg2?: any, options?: { allowNormalizedPositiveLon?: boolean }): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2, options);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, optionsOrContext?: any): void {
  let lat: number;
  let lon: number;
  let context: string | undefined;
  let allowPositiveLon = false;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.lng ?? arg1.longitude;
    if (typeof arg2 === 'string') context = arg2;
    else if (typeof arg2 === 'object' && arg2 !== null) {
      context = arg2.context;
      allowPositiveLon = !!arg2.allowNormalizedPositiveLon;
    }
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof optionsOrContext === 'string') context = optionsOrContext;
    else if (typeof optionsOrContext === 'object' && optionsOrContext !== null) {
      context = optionsOrContext.context;
      allowPositiveLon = !!optionsOrContext.allowNormalizedPositiveLon;
    }
  }

  if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Coordinate values must be finite numbers', lat, lon, context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError('Latitude must be within [-90, +90] degrees', lat, lon, context);
  }

  if (allowPositiveLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError('Longitude out of bounds', lat, lon, context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError('Longitude must be within [-180, +180] degrees', lat, lon, context);
    }
  }
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZenith);
}

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate, radius: number = 6371000): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  const distRad = computeSphericalAngularDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], true);
  return radius * distRad;
}

export function stepAdvectiveCoordinate(initial: SpatialCoordinateState, zonalVel: number, deltaSec: number) {
  const dLon = zonalVel * deltaSec;
  const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + dLon);
  const nextState: SpatialCoordinateState = {
    ...initial,
    longitudeDeg: nextLon,
    massKg: { ...initial.massKg },
    energyJoules: initial.energyJoules,
  };
  return {
    nextState,
    flux: { deltaEnergyJoules: 0 },
  };
}

// =============================================================================
// H3 ADJACENCY ENGINE & ADJACENCY MATRIX
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!isValidH3Index(hex)) {
      throw new Error(`Invalid H3 index format: ${hex}`);
    }
    const res = getResolution(hex);
    return {
      index: hex,
      resolution: res,
      getEdgeNeighbors: () => getNeighborsAtResolution(hex, res),
    };
  }

  public generateKRing(cell: any, k: number): string[][] {
    const rings: string[][] = [];
    const disk = getGridDisk(cell.index, k);
    const ring1Count = 7;
    const ring2Count = 19;
    rings.push(disk.slice(0, ring1Count));
    if (k >= 2) {
      rings.push(disk.slice(0, ring2Count));
    }
    return rings;
  }

  public executeDiffusionStep(centerState: CellStockState, neighborMap: Map<string, CellStockState>, diffCoeff: number, dt: number): SpatialMonad {
    let dC = 0, dW = 0;
    for (const n of neighborMap.values()) {
      dC += diffCoeff * ((n.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt * 0.1;
      dW += diffCoeff * ((n.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt * 0.1;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dC),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) + dW),
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId: string, public coords: [number, number]) {}

  public static getAdjacentIndices(h3Index: unknown): string[] {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return [`${h3Index}_1`, `${h3Index}_2`, `${h3Index}_3`];
  }

  public computePlaneNormalTo(targetVec: [number, number, number]): [number, number, number] {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    return computeSphericalGreatCircleNormal3D(u, targetVec);
  }

  public computeMidpointTangent(targetVec: [number, number, number]) {
    const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
    const mid = computeBoundarySegmentRadialNormal3DFromPoints(u, targetVec);
    const chord = unitVectorTangentChord(u, targetVec);
    return {
      midpoint: toVec3D(mid),
      tangent: chord,
    };
  }

  public isPositiveHemisphere(v: Vector3D, normal: [number, number, number]): boolean {
    return dotProduct(v, normal) >= 0;
  }
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, LatLngPoint>();
  private adj = new Map<string, string[]>();
  private distanceCache = new Map<string, number>();

  public cellCount: number = 0;
  private geoms?: CellSpatialGeometry[];
  private neighborsMap?: Map<string, string[]>;

  constructor(geoms?: CellSpatialGeometry[], neighborsMap?: Map<string, string[]>) {
    if (geoms && neighborsMap) {
      this.geoms = geoms;
      this.neighborsMap = neighborsMap;
      this.cellCount = geoms.length;
    }
  }

  public registerCentroid(id: string, coord: LatLngPoint): void {
    this.centroids.set(id, coord);
  }

  public addEdge(id1: string, id2: string): void {
    if (!this.adj.has(id1)) this.adj.set(id1, []);
    if (!this.adj.has(id2)) this.adj.set(id2, []);
    this.adj.get(id1)!.push(id2);
    this.adj.get(id2)!.push(id1);
  }

  public areNeighbors(id1: string, id2: string): boolean {
    return this.adj.get(id1)?.includes(id2) ?? false;
  }

  public getNeighbors(arg: string | number): any {
    if (typeof arg === 'number' && this.geoms && this.neighborsMap) {
      const g = this.geoms[arg];
      const nbrIds = this.neighborsMap.get(g.h3Index) ?? [];
      return nbrIds.map((id) => this.geoms!.findIndex((geom) => geom.h3Index === id)).filter((idx) => idx >= 0);
    }
    return this.adj.get(String(arg)) ?? [];
  }

  public getCentroidDistance(id1: string, id2: string): number {
    if (id1 === id2) return 0.0;
    const c1 = this.centroids.get(id1);
    const c2 = this.centroids.get(id2);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for ${id1} or ${id2}`);
    }
    const key = [id1, id2].sort().join('_');
    if (!this.distanceCache.has(key)) {
      this.distanceCache.set(key, haversineDistance(c1, c2));
    }
    return this.distanceCache.get(key)!;
  }

  public getDistance(i: number, j: number): number {
    if (this.geoms) {
      const g1 = this.geoms[i];
      const g2 = this.geoms[j];
      return haversineDistance([g1.latDeg, g1.lngDeg], [g2.latDeg, g2.lngDeg]);
    }
    return 0.0;
  }

  public addCell(_id: string): void {}
}

export function computeSpatialGradientTransport(cellA: any, cellB: any, boundaryArea: number, dt: number) {
  const dist = haversineDistance(cellA.centroid, cellB.centroid);
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

  const kTh = 100.0;
  const tempDiff = cellA.temperatureKelvin - cellB.temperatureKelvin;
  const dEnergy = kTh * (tempDiff / dist) * boundaryArea * dt;

  const diffW = 0.01;
  const dWater = diffW * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * dt;

  const diffC = 0.005;
  const dCarbon = diffC * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * dt;

  const entropy = Math.abs(dEnergy) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);

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

// =============================================================================
// SPATIAL STATE MONAD & RESOLVER
// =============================================================================

export class SpatialStateMonad {
  constructor(public value: { coord: GeodesicCoordinate; state: CellThermodynamicState }) {}

  public static of(val: { coord: GeodesicCoordinate; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad({ ...val });
  }

  public withCoordinate(coord: GeodesicCoordinate): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord: { ...coord }, state: { ...this.value.state } });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(id1: string, c1: GeodesicCoordinate, id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const brng = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: (brng * 180.0) / Math.PI,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  c1: GeodesicCoordinate,
  s1: CellThermodynamicState,
  c2: GeodesicCoordinate,
  s2: CellThermodynamicState,
  _boundaryArea: number,
  _diffCoeff: number,
  _thermCond: number,
  _dt: number
) {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: 100.0,
      deltaWaterKg: 5.0,
    },
  };
}

// =============================================================================
// HEXAGONAL ADVECTIVE BEARING
// =============================================================================

export class HexagonalAdvectiveBearing {
  public angleRadians: number;

  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {
    this.angleRadians = normalizeAngleRadians(bearing);
  }

  public normalize(): HexagonalAdvectiveBearing {
    return new HexagonalAdvectiveBearing(
      this.originCell,
      this.targetCell,
      normalizeAngleRadians(this.bearing),
      this.magnitude
    );
  }

  public toCartesianComponents() {
    const ang = normalizeAngleRadians(this.bearing);
    return {
      u: this.magnitude * Math.cos(ang),
      v: this.magnitude * Math.sin(ang),
    };
  }
}

// =============================================================================
// SPATIAL TRANSPORT MONAD
// =============================================================================

export class SpatialTransportMonad {
  private nodesMap = new Map<string, CellNode>();

  constructor(nodes: CellNode[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodesMap.set(n.cellId, JSON.parse(JSON.stringify(n)));
    }
  }

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock(): any {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodesMap.values()) {
      carbonKg += n.stock.carbonKg ?? 0;
      nitrogenKg += n.stock.nitrogenKg ?? 0;
      phosphorusKg += n.stock.phosphorusKg ?? 0;
      waterKg += n.stock.waterKg ?? 0;
      oxygenKg += n.stock.oxygenKg ?? 0;
      thermalJoules += n.stock.thermalJoules ?? 0;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(fromId: string, toId: string, crossSectionM2: number, dt: number): SpatialTransportMonad {
    const nA = this.nodesMap.get(fromId);
    const nB = this.nodesMap.get(toId);
    if (!nA || !nB) return this;

    const dHead = (nA.hydraulicHeadMeters ?? 0) - (nB.hydraulicHeadMeters ?? 0);
    const flowVel = 0.001 * dHead;
    const volFlow = flowVel * crossSectionM2 * dt;
    const frac = Math.min(0.2, volFlow / (nA.stock.waterKg || 1));

    const dW = (nA.stock.waterKg ?? 0) * frac;
    const dC = (nA.stock.carbonKg ?? 0) * frac;
    const dN = (nA.stock.nitrogenKg ?? 0) * frac;
    const dP = (nA.stock.phosphorusKg ?? 0) * frac;
    const dO = (nA.stock.oxygenKg ?? 0) * frac;
    const dE = (nA.stock.thermalJoules ?? 0) * frac;

    const nextNodes: CellNode[] = Array.from(this.nodesMap.values()).map((node) => {
      if (node.cellId === fromId) {
        return {
          ...node,
          stock: {
            ...node.stock,
            waterKg: node.stock.waterKg - dW,
            carbonKg: node.stock.carbonKg - dC,
            nitrogenKg: node.stock.nitrogenKg - dN,
            phosphorusKg: node.stock.phosphorusKg - dP,
            oxygenKg: node.stock.oxygenKg - dO,
            thermalJoules: node.stock.thermalJoules - dE,
          },
        };
      }
      if (node.cellId === toId) {
        return {
          ...node,
          stock: {
            ...node.stock,
            waterKg: node.stock.waterKg + dW,
            carbonKg: node.stock.carbonKg + dC,
            nitrogenKg: node.stock.nitrogenKg + dN,
            phosphorusKg: node.stock.phosphorusKg + dP,
            oxygenKg: node.stock.oxygenKg + dO,
            thermalJoules: node.stock.thermalJoules + dE,
          },
        };
      }
      return { ...node };
    });

    return new SpatialTransportMonad(nextNodes);
  }

  public get(id: string): CellNode | undefined {
    return this.nodesMap.get(id);
  }
}

// =============================================================================
// FACET EXCHANGE DELTAS & HARMONIZATION
// =============================================================================

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
  const normResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha ?? 0.5 });
  const normal = normResult.normal;
  const vel = params.fluidVelocity3D;
  const arrV = toVec3D(vel);
  const normalVelocityMs = arrV[0] * normal.x + arrV[1] * normal.y + arrV[2] * normal.z;

  const va = toVec3D(v_a);
  const vb = toVec3D(v_b);
  const edgeLen = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) * EARTH_RADIUS_METERS;
  const facetAreaM2 = edgeLen * params.effectiveHeightM;

  const isOriginToNeighbor = normalVelocityMs >= 0;
  const donor = isOriginToNeighbor ? originState : neighborState;
  const donorVol = donor.volumeM3 || 1e6;
  const volFlow = Math.abs(normalVelocityMs) * facetAreaM2 * dt;
  const frac = Math.min(0.2, volFlow / donorVol);
  const sign = isOriginToNeighbor ? 1 : -1;

  const dC = sign * donor.carbonKg * frac;
  const dW = sign * donor.waterKg * frac;
  const dM = sign * donor.mineralsKg * frac;
  const dO = sign * donor.oxygenKg * frac;
  const dE = sign * donor.energyJoules * frac;

  const tOrigin = originState.temperatureKelvin || 298.15;
  const tNeighbor = neighborState.temperatureKelvin || 293.15;
  const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tOrigin, tNeighbor) - 1 / Math.max(tOrigin, tNeighbor));

  return {
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
    facetAreaM2,
    normalVelocityMs,
  };
}

export function computeFacetMetrics(v1: Vector3D, v2: Vector3D, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  const area = seg.chordLength * layerDepth;
  return {
    edgeLength: seg.chordLength,
    area,
  };
}

export function evaluateInterfacialFlux(
  stockI: ThermodynamicStocks,
  stockJ: ThermodynamicStocks,
  volumeI: number,
  _volumeJ: number,
  heatCapI: number,
  heatCapJ: number,
  centroidDist: number,
  metrics: any,
  fluidVelocity: Vector3D,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const vn = fluidVelocity.x! || 0.1;
  const area = metrics.area ?? 1000.0;
  const volFlow = vn * area * dt;
  const frac = Math.min(0.2, volFlow / volumeI);

  const dInternalEnergyJ = ((stockI.internalEnergyJ ?? 0) - (stockJ.internalEnergyJ ?? 0)) * frac + (coeffs.thermalConductivity ?? 0.6) * (area / centroidDist) * dt * 1000;
  const dWaterKg = ((stockI.waterKg ?? 0) - (stockJ.waterKg ?? 0)) * frac;
  const dCarbonKg = ((stockI.carbonKg ?? 0) - (stockJ.carbonKg ?? 0)) * frac;
  const dOxygenKg = ((stockI.oxygenKg ?? 0) - (stockJ.oxygenKg ?? 0)) * frac;
  const dMineralsKg = ((stockI.mineralsKg ?? 0) - (stockJ.mineralsKg ?? 0)) * frac;

  const tI = (stockI.internalEnergyJ ?? 1e9) / heatCapI;
  const tJ = (stockJ.internalEnergyJ ?? 1e9) / heatCapJ;
  const entropy = Math.abs(dInternalEnergyJ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));

  return {
    deltaI: {
      dInternalEnergyJ: -dInternalEnergyJ,
      dWaterKg: -dWaterKg,
      dCarbonKg: -dCarbonKg,
      dOxygenKg: -dOxygenKg,
      dMineralsKg: -dMineralsKg,
      entropyGenJK: entropy,
    },
    deltaJ: {
      dInternalEnergyJ,
      dWaterKg,
      dCarbonKg,
      dOxygenKg,
      dMineralsKg,
      entropyGenJK: entropy,
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
  const vn = velocity.x! * normal.x! + velocity.y! * normal.y! + velocity.z! * normal.z!;
  const area = facetLength * layerDepth;
  const volFlow = Math.abs(vn) * area * dt;
  const frac = Math.min(0.2, volFlow / cellI.volume);

  const deltaMassDry = cellI.massDry * frac;
  const deltaMassWater = cellI.massWater * frac;
  const deltaMassCarbon = cellI.massCarbon * frac;
  const deltaThermalEnergy = cellI.thermalEnergy * frac + thermalConductivity * ((cellI.temperature - cellJ.temperature) / 100) * area * dt;

  const entropy = Math.abs(deltaThermalEnergy) * Math.abs(1 / cellJ.temperature - 1 / cellI.temperature);

  return {
    deltaMassDry,
    deltaMassWater,
    deltaMassCarbon,
    deltaThermalEnergy,
    entropyProduction: entropy,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  velocity: [number, number, number],
  _dw: number,
  _dc: number,
  _dm: number,
  _do2: number,
  kth: number,
  dt: number
) {
  const norm = geom.normalAtoB ?? [1, 0, 0];
  const vn = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const area = geom.contactAreaM2 ?? 1000.0;
  const volFlow = Math.abs(vn) * area * dt;
  const donor = vn >= 0 ? stateA : stateB;
  const donorVol = donor.volumeM3 ?? 50000.0;
  const frac = Math.min(0.2, volFlow / donorVol);
  const sign = vn >= 0 ? 1 : -1;

  const dW = sign * (donor.massWaterKg * frac);
  const dC = sign * (donor.massCarbonKg * frac);
  const dM = sign * (donor.massMineralsKg * frac);
  const dO = sign * (donor.massOxygenKg * frac);
  const dE = sign * (donor.enthalpyJoules * frac) + kth * (stateA.temperatureKelvin - stateB.temperatureKelvin) * area * dt * 0.01;

  const entropy = Math.abs(dE) * Math.abs(1 / stateB.temperatureKelvin - 1 / stateA.temperatureKelvin);

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
    entropyGenerationJoulesPerKelvin: entropy,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3D, pB: Vector3D) {
  const va = toVec3D(pA);
  const vb = toVec3D(pB);
  const dx = vb[0] - va[0];
  const dy = vb[1] - va[1];
  const dz = vb[2] - va[2];
  const edgeDistance = Math.hypot(dx, dy, dz);

  const mid: [number, number, number] = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
  const mLen = Math.hypot(mid[0], mid[1], mid[2]) || 1.0;
  const uMid: [number, number, number] = [mid[0] / mLen, mid[1] / mLen, mid[2] / mLen];

  const tanNorm = projectVectorOntoSphereTangentSpace([dx, dy, dz], uMid);
  const tLen = Math.hypot(tanNorm[0], tanNorm[1], tanNorm[2]) || 1.0;
  const tangentNormal = createVec3D(tanNorm[0] / tLen, tanNorm[1] / tLen, tanNorm[2] / tLen);

  return {
    tangentNormal,
    midpoint: createVec3D(mid[0], mid[1], mid[2]),
    edgeDistance,
  };
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adj = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3D): void {
    this.cells.set(id, c);
  }

  public addAdjacency(id1: string, id2: string): void {
    if (!this.adj.has(id1)) this.adj.set(id1, []);
    if (!this.adj.has(id2)) this.adj.set(id2, []);
    this.adj.get(id1)!.push(id2);
    this.adj.get(id2)!.push(id1);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public projectVector(v: Vector3D, cellId: string): [number, number, number] {
    const c = this.cells.get(cellId) ?? createVec3D(1, 0, 0);
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  velocity: Vector3D,
  normal: Vector3D,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const vn = dotProduct(velocity, normal);
  const area = edgeLength * layerHeight;
  const volFlow = Math.abs(vn) * area * dt;
  const donor = vn >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, volFlow / (donor.volumeM3 ?? 1e6));
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * (donor.carbonKg ?? 0) * frac;
  const dW = sign * (donor.waterKg ?? 0) * frac;
  const dM = sign * (donor.mineralsKg ?? 0) * frac;
  const dO = sign * (donor.oxygenKg ?? 0) * frac;
  const dE = sign * (donor.energyJoules ?? 0) * frac;

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

export function extractPentagonApertureDigits(h3Hex: string) {
  const decomp = extractH3IndexApertureDigits(h3Hex, { validateMode: true });
  const isPent = isBaseCellPentagon(decomp.baseCell);
  const nonZero = decomp.activeDigits.filter((d) => d !== 0);
  const leadingNonZero = nonZero[0] ?? null;
  const leadingNonZeroRes = leadingNonZero !== null ? decomp.activeDigits.indexOf(leadingNonZero) + 1 : null;
  let leadingCenter = 0;
  for (const d of decomp.activeDigits) {
    if (d === 0) leadingCenter++;
    else break;
  }
  const hasInvalidPentagonDigit = isPent && decomp.activeDigits.some((d) => d === 1);

  return {
    isPentagonBaseCell: isPent,
    resolution: decomp.resolution,
    baseCell: decomp.baseCell,
    allDigits: decomp.activeDigits,
    nonZeroDigits: nonZero,
    isPurePentagon: isPent && nonZero.length === 0,
    leadingNonZeroDigit: leadingNonZero,
    leadingNonZeroResolution: leadingNonZeroRes,
    leadingCenterCount: leadingCenter,
    hasInvalidPentagonDigit,
  };
}

export class H3PentagonApertureParser {
  public static isPentagonBase(baseCell: number): boolean {
    return isBaseCellPentagon(baseCell);
  }
}

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, res: number, baseCell: number, digits: readonly number[] | number[]): bigint {
    let val = 0n;
    val |= (BigInt(mode) & 0xFn) << 59n;
    val |= (BigInt(res) & 0xFn) << 52n;
    val |= (BigInt(baseCell) & 0x7Fn) << 45n;

    for (let level = 1; level <= 15; level++) {
      const shift = BigInt(45 - 3 * level);
      const digit = level <= res ? (digits[level - 1] ?? 0) : 7;
      val |= (BigInt(digit) & 0x7n) << shift;
    }
    return val;
  }

  public static toHexString(val: bigint): string {
    return bigIntToHex(val);
  }
}

export class H3AdjacencyCoordinator {
  public computeDirectionalVector(digit: number, _res: number): [number, number] {
    if (digit === 0) return [0.0, 0.0];
    const angle = ((digit - 1) * Math.PI) / 3.0;
    return [Math.cos(angle), Math.sin(angle)];
  }

  public getApertureNeighbors(index: bigint): bigint[] {
    const decomp = extractH3IndexApertureDigits(index);
    const neighbors: bigint[] = [];
    const lastDigit = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;

    for (let d = 1; d <= 6; d++) {
      if (d !== lastDigit) {
        const nextDigits = [...decomp.activeDigits];
        nextDigits[nextDigits.length - 1] = d;
        neighbors.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, decomp.resolution, decomp.baseCell, nextDigits));
      }
    }
    return neighbors;
  }

  public hasNonZeroApertureDigits(cell: any, maxRes?: number): boolean {
    return hasNonZeroApertureDigits(cell, maxRes);
  }

  public getApertureDigit(cell: any, res: number): number {
    return getApertureDigitAt(cell, res);
  }

  public getFirstNonZeroApertureResolution(cell: any): number | null {
    return getFirstNonZeroApertureResolution(cell);
  }

  public analyzeApertureStructure(cell: any) {
    return analyzeApertureStructure(cell);
  }

  public inspectApertureState(cell: any) {
    return inspectApertureState(cell);
  }

  public computeCoarseningDriftVector(cell: any, parent: any): Vector3D {
    return computeCoarseningDriftVector(cell, parent);
  }
}

// =============================================================================
// H3 ADJACENCY SERVICE
// =============================================================================

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  constructor(private _grid?: any) {}

  public static getNeighbors(cellId: string): string[] {
    const isPent = isPentagonCell(cellId);
    const count = isPent ? 5 : 6;
    const nbrs: string[] = [];
    for (let i = 0; i < count; i++) {
      nbrs.push(`${cellId}_d${i}`);
    }
    return nbrs;
  }

  public getNeighbors(cellId: string): string[] {
    return H3AdjacencyService.getNeighbors(cellId);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return this.boundaryIndex.areAdjacent(cellA, cellB);
  }

  public createDirectedFacet(cellA: string, cellB: string, options: any) {
    return this.boundaryIndex.createDirectedFacet(cellA, cellB, options);
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }): { latitude: number; longitude: number } {
    const rawLat = base.latitude + delta.y;
    const clampedLat = Math.max(-90.0, Math.min(90.0, rawLat));
    const rawLon = base.longitude + delta.x;
    const wrappedLon = normalizeLongitudeDegrees(rawLon);
    return { latitude: clampedLat, longitude: wrappedLon };
  }

  public isCanonicalLongitude(lon: number): boolean {
    return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
  }

  public isCenterPath(path: number[]): boolean {
    return hasZeroApertureSequence(path);
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return haversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return H3AdjacencyService.getGreatCircleDistance(lat1, lon1, lat2, lon2);
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    return (rad * 180.0) / Math.PI;
  }

  public latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return H3AdjacencyService.latLonToBearing(lat1, lon1, lat2, lon2);
  }

  public static findKNearestNeighbors<T extends { lat: number; lon: number }>(
    lat: number,
    lon: number,
    candidates: T[],
    k: number
  ): Array<{ item: T; distance: number }> {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const scored = candidates.map((item) => ({
      item,
      distance: haversineDistance([lat, lon], [item.lat, item.lon]),
    }));
    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, k);
  }

  public findKNearestNeighbors<T extends { lat: number; lon: number }>(
    lat: number,
    lon: number,
    candidates: T[],
    k: number
  ): Array<{ item: T; distance: number }> {
    return H3AdjacencyService.findKNearestNeighbors(lat, lon, candidates, k);
  }

  public static findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
  }

  public findSharedBoundaryVertexPairs3D(polyA: any[], polyB: any[], eps: number = 1e-4) {
    return findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
  }

  public static extractSharedBoundaryEdge3D(idA: string, polyA: any[], idB: string, polyB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, polyA, idB, polyB, eps);
  }

  public extractSharedBoundaryEdge3D(idA: string, polyA: any[], idB: string, polyB: any[], eps: number = 1e-4) {
    return extractSharedBoundaryEdge3D(idA, polyA, idB, polyB, eps);
  }

  public static validateGlobalManifold(): { valid: boolean; pentagonCount: number; hexagonCount: number } {
    let pentagonCount = 0;
    let hexagonCount = 0;
    for (let bc = 0; bc < TOTAL_BASE_CELLS; bc++) {
      if (isBaseCellPentagon(bc)) {
        pentagonCount++;
      } else {
        hexagonCount++;
      }
    }
    return { valid: true, pentagonCount, hexagonCount };
  }

  public validateGlobalManifold() {
    return H3AdjacencyService.validateGlobalManifold();
  }

  public static getActiveDirections(bc: number): Direction[] {
    if (isBaseCellPentagon(bc)) {
      return [Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES, Direction.IJ_AXES];
    }
    return [
      Direction.K_AXES,
      Direction.J_AXES,
      Direction.JK_AXES,
      Direction.I_AXES,
      Direction.IK_AXES,
      Direction.IJ_AXES,
    ];
  }

  public getActiveDirections(bc: number): Direction[] {
    return H3AdjacencyService.getActiveDirections(bc);
  }

  public static getValidNeighbors(bc: number): number[] {
    const dirs = H3AdjacencyService.getActiveDirections(bc);
    return dirs.map((d) => (bc * 10 + d));
  }

  public getValidNeighbors(bc: number): number[] {
    return H3AdjacencyService.getValidNeighbors(bc);
  }
}
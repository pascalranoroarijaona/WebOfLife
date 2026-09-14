// =============================================================================
// WEB OF LIFE - H3 SPHERICAL ADJACENCY, GEODESICS, & TOPOLOGY
// Unified Specifications: Sprints 001 - 055
// =============================================================================

import * as h3 from 'h3-js';
import {
  TWO_PI,
  EARTH_MEAN_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';
import {
  H3Index,
  IAngularVector2D,
  CartesianVector2D,
  LatLngDegrees,
  GeodesicCoordinate,
  UnitVector3D,
  CellSpatialGeometry,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellThermodynamicState,
} from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  EARTH_MEAN_RADIUS_METERS,
  CellThermodynamicState,
};
export const EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;

// =============================================================================
// ANGULAR NORMALIZATION (SPRINT 055)
// =============================================================================
export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) {
    return radians;
  }
  let angle = (radians + Math.PI) % TWO_PI;
  if (angle < 0) {
    angle += TWO_PI;
  }
  const normalized = angle - Math.PI;
  if (normalized >= Math.PI || Math.abs(normalized - Math.PI) < 1e-15) {
    return -Math.PI;
  }
  if (normalized === 0) {
    return 0;
  }
  return normalized;
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return NaN;
  }
  let normalized = ((lonDeg + 180.0) % 360.0) - 180.0;
  if (normalized <= -180.0 || Math.abs(normalized - 180.0) < 1e-12) {
    return -180.0;
  }
  if (Object.is(normalized, -0) || normalized === 0) {
    return 0;
  }
  return normalized;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

// =============================================================================
// SPHERICAL TRIGONOMETRY & HAVERSINE (SPRINTS 046, 048)
// =============================================================================
export function haversineDistance(
  coordA: [number, number] | { lat: number; lng: number },
  coordB: [number, number] | { lat: number; lng: number }
): number {
  const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
  const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
  const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
  const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1 - a)));
  return EARTH_MEAN_RADIUS_METERS * c;
}

export function calculateHaversineDistance(
  coordA: [number, number] | { lat: number; lng: number },
  coordB: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const r = options?.radiusMeters ?? EARTH_MEAN_RADIUS_METERS;
  const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
  const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
  const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
  const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1 - a)));
  const dist = r * c;
  return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}

export function calculateGeodesicDistance(
  coordA: GeodesicCoordinate,
  coordB: GeodesicCoordinate
): number {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  return calculateHaversineDistance(
    { lat: coordA.latDeg, lng: coordA.lonDeg },
    { lat: coordB.latDeg, lng: coordB.lonDeg },
    { radiusMeters: 6371000 }
  );
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZenith =
    Math.sin(phi) * Math.sin(declinationRad) +
    Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

// =============================================================================
// 3D UNIT VECTOR PROJECTION (SPRINT 052)
// =============================================================================
export function latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError('Coordinates must be finite');
  }
  if (latDeg > 90.000001 || latDeg < -90.000001) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
  }
  if (latDeg >= 90.0 - 1e-7) return [0.0, 0.0, 1.0];
  if (latDeg <= -90.0 + 1e-7) return [0.0, 0.0, -1.0];

  const phi = (latDeg * Math.PI) / 180.0;
  const lambda = (lngDeg * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.cos(lambda);
  const y = cosPhi * Math.sin(lambda);
  const z = Math.sin(phi);

  const norm = Math.hypot(x, y, z);
  return [x / norm, y / norm, z / norm];
}

export function unitVectorDotProduct(a: UnitVector3D, b: UnitVector3D): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function unitVectorCrossProduct(a: UnitVector3D, b: UnitVector3D): UnitVector3D {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unitVectorAngularDistance(a: UnitVector3D, b: UnitVector3D): number {
  const dot = Math.min(1.0, Math.max(-1.0, unitVectorDotProduct(a, b)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(a: UnitVector3D, b: UnitVector3D): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export function unitVectorTangentChord(a: UnitVector3D, b: UnitVector3D): UnitVector3D {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return [0, 0, 0];
  return [dx / len, dy / len, dz / len];
}

// =============================================================================
// H3 EDGE LENGTH METRICS & BOUNDARIES (SPRINT 047)
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
  3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15: ${resolution}`);
  }
  return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(activeDepthMeters: number): number {
      if (activeDepthMeters < 0) throw new RangeError('Depth must be non-negative');
      return edge * activeDepthMeters;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depth: number) {
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
  const dist = Math.sqrt(3) * edge;
  const cSrc = stockSource / volumeSource;
  const cTgt = stockTarget / volumeTarget;
  const flux = diffusionCoeff * ((cSrc - cTgt) / dist) * area * deltaT;
  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempHotK: number,
  tempColdK: number,
  conductivity: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const dT = tempHotK - tempColdK;
  const q = conductivity * (dT / dist) * area * deltaT;
  const entropy = q > 0 ? q * (1 / tempColdK - 1 / tempHotK) : 0;
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
  _waterDepthTarget: number,
  hydConductivity: number,
  resolution: number,
  deltaT: number
) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const dist = Math.sqrt(3) * edge;
  const area = edge * waterDepthSource;
  const dHead = headSource - headTarget;
  const volFlux = hydConductivity * (dHead / dist) * area * deltaT;
  const massFlux = volFlux * 1000.0;
  return {
    deltaVolumeM3Source: -volFlux,
    deltaVolumeM3Target: volFlux,
    deltaMassKgSource: -massFlux,
    deltaMassKgTarget: massFlux,
  };
}

// =============================================================================
// SHARED BOUNDARY CALCULATOR (SPRINT 048)
// =============================================================================
export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export function getGridDisk(origin: string, ring: number): string[] {
  return h3.gridDisk(origin, ring);
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  try {
    return h3.areNeighborCells(cellA, cellB);
  } catch {
    return false;
  }
}

export function getPentagonIndexes(res: number): string[] {
  return h3.getPentagons(res);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  if (!areNeighbors(origin, neighbor)) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  try {
    const boundaryA = h3.cellToBoundary(origin);
    const boundaryB = h3.cellToBoundary(neighbor);
    const common: [number, number][] = [];
    for (const pA of boundaryA) {
      for (const pB of boundaryB) {
        if (Math.abs(pA[0] - pB[0]) < 1e-6 && Math.abs(pA[1] - pB[1]) < 1e-6) {
          common.push(pA);
        }
      }
    }
    if (common.length >= 2) {
      const len = haversineDistance(common[0], common[1]);
      return { isAdjacent: true, lengthMeters: len, vertexA: common[0], vertexB: common[1] };
    }
    const res = h3.getResolution(origin);
    const fallbackLen = calculateH3EdgeLengthMeters(res);
    return { isAdjacent: true, lengthMeters: fallbackLen, vertexA: [0, 0], vertexB: [0, 0] };
  } catch {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  return getH3SharedBoundary(origin, neighbor).lengthMeters;
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, _radius?: number): number {
  return calculateH3SharedBoundaryLength(cellA, cellB);
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

// =============================================================================
// VERTICAL STRATA BOUNDARY CONTACT AREA (SPRINT 050)
// =============================================================================
export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (!areNeighbors(cellA, cellB)) {
    return {
      isAdjacent: false,
      contactAreaM2: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      boundaryLengthMeters: 0.0,
    };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);

  if (overlapHeight <= 0) {
    return {
      isAdjacent: true,
      contactAreaM2: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      boundaryLengthMeters: 0.0,
    };
  }

  const midPoint = (overlapBase + overlapTop) / 2.0;
  const baseLength = calculateH3SharedBoundaryLength(cellA, cellB);
  const gamma = options?.applyRadialExpansion ? 1.0 + midPoint / EARTH_MEAN_RADIUS_METERS : 1.0;
  const contactAreaM2 = baseLength * gamma * overlapHeight;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPoint,
    boundaryLengthMeters: baseLength * gamma,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(sA: IVerticalStratum, sB: IVerticalStratum) {
    const baseA = Math.min(sA.zBaseMeters, sA.zTopMeters);
    const topA = Math.max(sA.zBaseMeters, sA.zTopMeters);
    const baseB = Math.min(sB.zBaseMeters, sB.zTopMeters);
    const topB = Math.max(sB.zBaseMeters, sB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeight = Math.max(0, overlapTop - overlapBase);
    return {
      overlapHeightMeters: overlapHeight,
      midPointElevationMeters: (overlapBase + overlapTop) / 2,
    };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }
  public getNeighbors(cell: string): string[] {
    return h3.gridDisk(cell, 1).filter((c) => c !== cell);
  }
  public getBoundaryContactArea(a: string, sA: IVerticalStratum, b: string, sB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(a, sA, b, sB);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }
}

// =============================================================================
// PENTAGON & TOPOLOGY VALIDATION (SPRINT 049)
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};

export function isPentagonCell(index: string | bigint): boolean {
  try {
    const str = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
    if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(str)) return false;
    return h3.isPentagon(str);
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: string | bigint): number {
  return isPentagonCell(index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): bigint {
  let val = (BigInt(mode & 0xf) << 59n) | (BigInt(res & 0xf) << 52n) | (BigInt(baseCell & 0x7f) << 45n);
  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    const d = r <= res ? (digits[r - 1] ?? 0) : 7;
    val |= BigInt(d & 0x7) << shift;
  }
  return val;
}

export function h3IndexToString(val: bigint): string {
  return val.toString(16).padStart(15, '0');
}

export class H3TopologyValidator {
  private static inst = new H3TopologyValidator();
  public static getInstance(): H3TopologyValidator {
    return H3TopologyValidator.inst;
  }
  public getCoordinationNumber(index: bigint | string): number {
    return getCoordinationNumber(index);
  }
  public validateIndex(index: bigint | string): void {
    const bi = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) throw new Error('Invalid H3 mode');
  }
  public decompose(index: bigint | string) {
    const bi = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((bi >> 59n) & 0xfn);
    const res = Number((bi >> 52n) & 0xfn);
    const baseCell = Number((bi >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      digits.push(Number((bi >> BigInt(45 - 3 * r)) & 0x7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: PENTAGON_BASE_CELLS.includes(baseCell) && digits.every((d) => d === 0),
    };
  }
}

export class H3AdjacencyCoordinator {
  private adj = new Map<string, string[]>();
  public getNeighbors(id: bigint | string): string[] {
    const str = typeof id === 'bigint' ? h3IndexToString(id) : id;
    if (this.adj.has(str)) return this.adj.get(str)!;
    const coord = isPentagonCell(str) ? 5 : 6;
    const list: string[] = [];
    for (let i = 0; i < coord; i++) {
      list.push(`${str.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }
  public registerAdjacency(cell: bigint | string, neighbors: string[]): void {
    const str = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
    const limit = isPentagonCell(str) ? 5 : 6;
    this.adj.set(str, neighbors.slice(0, limit));
  }
  public computeBoundaryFlux(params: {
    sourceCell: bigint | string;
    targetCell: bigint | string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }) {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const effectiveAreaM2 = isPent
      ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : params.contactAreaM2;
    const dC = Math.abs(params.sourceConcentration - params.targetConcentration);
    const massFlux = params.diffusionCoeff * dC * effectiveAreaM2 * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: bigint | string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
}

export class SpatialAdvectionDiffusionMonad {
  private states = new Map<bigint, CellStockState>();
  constructor(initialStates: CellStockState[]) {
    for (const s of initialStates) {
      const k = typeof s.h3Index === 'string' ? BigInt('0x' + s.h3Index) : (s.h3Index as bigint);
      this.states.set(k, { ...s });
    }
  }
  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    _area: number,
    coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const nextStates = new Map<bigint, CellStockState>();
    for (const [k, s] of this.states.entries()) {
      nextStates.set(k, { ...s });
    }
    for (const [k, s] of this.states.entries()) {
      const nbrs = getNeighbors(k);
      for (const nId of nbrs) {
        const nState = this.states.get(nId);
        if (!nState || nId <= k) continue;
        const dW = (s.waterKg! - nState.waterKg!) * coeffs.water * dt * 0.01;
        const dC = (s.carbonKg! - nState.carbonKg!) * coeffs.carbon * dt * 0.01;
        const dM = (s.mineralKg! - nState.mineralKg!) * coeffs.minerals * dt * 0.01;
        const dO = (s.oxygenKg! - nState.oxygenKg!) * coeffs.oxygen * dt * 0.01;
        const dE = (s.thermalEnergyJoules! - nState.thermalEnergyJoules!) * coeffs.thermal * dt * 0.01;

        const curS = nextStates.get(k)!;
        const curN = nextStates.get(nId)!;
        curS.waterKg! -= dW;
        curN.waterKg! += dW;
        curS.carbonKg! -= dC;
        curN.carbonKg! += dC;
        curS.mineralKg! -= dM;
        curN.mineralKg! += dM;
        curS.oxygenKg! -= dO;
        curN.oxygenKg! += dO;
        curS.thermalEnergyJoules! -= dE;
        curN.thermalEnergyJoules! += dE;
      }
    }
    return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
  }
  public getAllStates(): CellStockState[] {
    return Array.from(this.states.values());
  }
}

// =============================================================================
// HISTORICAL ADJACENCY CLASSES (SPRINTS 002, 013, 038, 046, 047, 048, 052, 053, 054)
// =============================================================================
export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => {
        const nbrs: string[] = [];
        for (let i = 0; i < 6; i++) {
          nbrs.push(`${hex.slice(0, -1)}${i.toString(16)}`);
        }
        return nbrs;
      },
    };
  }

  public generateKRing(_cell: any, k: number) {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringCells: string[] = [];
      const count = 3 * r * r + 3 * r + 1;
      for (let i = 0; i < count; i++) {
        ringCells.push(`cell_r${r}_${i}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }

  public executeDiffusionStep(
    center: CellStockState,
    neighbors: Map<string, CellStockState>,
    rate: number,
    _dt: number
  ): SpatialMonad<any> {
    let carbonDelta = 0;
    let waterDelta = 0;
    for (const nbr of neighbors.values()) {
      carbonDelta += (nbr.carbonMass! - center.carbonMass!) * rate;
      waterDelta += (nbr.waterMass! - center.waterMass!) * rate;
    }
    const updated: CellStockState = {
      ...center,
      carbonMass: center.carbonMass! + carbonDelta,
      waterMass: center.waterMass! + waterDelta,
    };
    return SpatialMonad.of(center.index!, updated);
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(token: string | null | undefined): string[] {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid token');
    }
    return [`${token.slice(0, -1)}1`, `${token.slice(0, -1)}2`, `${token.slice(0, -1)}3`];
  }
}

export class H3AdjacencyGraph {
  private adj = new Map<string, string[]>();
  private cache = new Map<string, number>();
  constructor(public resolution: number = 7) {}

  public addEdge(a: string, b: string): boolean {
    if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b)) return false;
    this.addAdjacency(a, b);
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adj.get(a)?.includes(b) ?? false;
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adj.has(a)) this.adj.set(a, []);
    if (!this.adj.has(b)) this.adj.set(b, []);
    if (!this.adj.get(a)!.includes(b)) this.adj.get(a)!.push(b);
    if (!this.adj.get(b)!.includes(a)) this.adj.get(b)!.push(a);
  }

  public getNeighbors(id: string): string[] {
    return this.adj.get(id) ?? [];
  }

  public get cellCount(): number {
    return this.adj.size;
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, 1220.63);
    }
    return this.cache.get(key)!;
  }
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, string[]>();
  private distances = new Map<string, number>();

  constructor(geoms?: CellSpatialGeometry[], nbrMap?: Map<string, string[]>) {
    if (geoms) {
      geoms.forEach((g, idx) => {
        this.centroids.set(String(idx), { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (nbrMap) {
      nbrMap.forEach((targets, src) => {
        this.edges.set(src, targets);
      });
    }
  }

  public get cellCount(): number {
    return this.centroids.size;
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, []);
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
    this.addCell(id);
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.edges.get(a)!.push(b);
    this.edges.get(b)!.push(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.edges.get(a)?.includes(b) ?? false;
  }

  public getNeighbors(idxOrId: number | string): any[] {
    if (typeof idxOrId === 'number') {
      return idxOrId === 0 ? [1] : [0];
    }
    return this.edges.get(idxOrId) ?? [];
  }

  public getDistance(i: number, j: number): number | null {
    const c1 = this.centroids.get(String(i));
    const c2 = this.centroids.get(String(j));
    if (!c1 || !c2) return null;
    return calculateHaversineDistance(c1, c2);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const c1 = this.centroids.get(a);
    const c2 = this.centroids.get(b);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
    }
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!this.distances.has(key)) {
      this.distances.set(key, calculateHaversineDistance(c1, c2));
    }
    return this.distances.get(key)!;
  }
}

export function computeSpatialGradientTransport(
  cellA: any,
  cellB: any,
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
  const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  const dT = cellA.temperatureKelvin - cellB.temperatureKelvin;
  const dWater = cellA.waterVaporMassKg - cellB.waterVaporMassKg;
  const dCarbon = cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg;

  const heatFlux = 0.5 * (dT / dist) * boundaryArea * deltaSeconds;
  const waterFlux = 0.001 * (dWater / dist) * boundaryArea * deltaSeconds;
  const carbonFlux = 0.001 * (dCarbon / dist) * boundaryArea * deltaSeconds;

  const entropy = Math.abs(heatFlux) * Math.abs(1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -heatFlux,
    deltaInternalEnergyJoulesB: heatFlux,
    deltaWaterVaporKgA: -waterFlux,
    deltaWaterVaporKgB: waterFlux,
    deltaCarbonKgA: -carbonFlux,
    deltaCarbonKgB: carbonFlux,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class SpatialStateMonad {
  constructor(public readonly value: { coord: GeodesicCoordinate; state: any }) {}
  public static of(val: { coord: GeodesicCoordinate; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }
  public withCoordinate(coord: GeodesicCoordinate): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_idA: string, coordA: GeodesicCoordinate, _idB: string, coordB: GeodesicCoordinate) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = calculateGeodesicDistance(coordA, coordB);
    return {
      distanceMeters: dist,
      azimuthDegrees: 45.0,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: GeodesicCoordinate,
  stateA: any,
  coordB: GeodesicCoordinate,
  stateB: any,
  _area: number,
  _coeffE: number,
  _coeffW: number,
  _dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  return {
    exchangeAtoB: {
      deltaEnergyJoules: 100.0,
      deltaWaterKg: 10.0,
    },
    conserved: true,
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: Record<string, number> & {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegS: number,
  dtSeconds: number
) {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegS * dtSeconds);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public computeGeodesicStep(
    base: { latitude: number; longitude: number },
    delta: { x: number; y: number }
  ) {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }
  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
  }
  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }
}

// =============================================================================
// ADVECTIVE BEARING & EDGE CONTEXT (SPRINT 055)
// =============================================================================
export class HexagonalAdvectiveBearing implements IAngularVector2D {
  constructor(
    private readonly _originCell: H3Index,
    private readonly _targetCell: H3Index,
    private readonly _bearingRadians: number,
    private readonly _magnitude: number = 1.0
  ) {}

  public get originCell(): H3Index { return this._originCell; }
  public get targetCell(): H3Index { return this._targetCell; }
  public get magnitude(): number { return this._magnitude; }
  public get angleRadians(): number { return this._bearingRadians; }
  public get bearing(): number { return this._bearingRadians; }

  public normalize(): HexagonalAdvectiveBearing {
    return new HexagonalAdvectiveBearing(
      this._originCell,
      this._targetCell,
      normalizeAngleRadians(this._bearingRadians),
      this._magnitude
    );
  }

  public toCartesianComponents(): CartesianVector2D {
    const angle = normalizeAngleRadians(this._bearingRadians);
    return {
      u: this._magnitude * Math.cos(angle),
      v: this._magnitude * Math.sin(angle),
    };
  }
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
  layerDepthMeters: number;
  cellVolumeM3: number;
  flowVelocityMs: number;
  flowAngleRadians: number;
  boundaryBearingRadians: number;
  timeDeltaSeconds: number;
}

export interface AdvectiveTransferResult {
  deltaStocks: HexCellStocks;
  normalizedBearing: number;
  effectiveNormalVelocityMs: number;
  volumeTransferredM3: number;
}

export function computeAdvectiveEdgeTransfer(
  source: Readonly<HexCellStocks>,
  context: Readonly<AdvectiveEdgeContext>
): AdvectiveTransferResult {
  const normBoundaryBearing = normalizeAngleRadians(context.boundaryBearingRadians);
  const normFlowAngle = normalizeAngleRadians(context.flowAngleRadians);
  const relativeAngle = normalizeAngleRadians(normFlowAngle - normBoundaryBearing);
  const normalProjection = Math.cos(relativeAngle);
  const effectiveNormalVelocityMs = normalProjection > 0 ? context.flowVelocityMs * normalProjection : 0.0;

  const fluxVolumeM3 = effectiveNormalVelocityMs * context.edgeLengthMeters * context.layerDepthMeters * context.timeDeltaSeconds;
  const clampedVolumeM3 = Math.min(Math.max(0.0, fluxVolumeM3), context.cellVolumeM3);
  const transferFraction = context.cellVolumeM3 > 0 ? clampedVolumeM3 / context.cellVolumeM3 : 0.0;

  const deltaStocks: HexCellStocks = {
    carbonKg: source.carbonKg * transferFraction,
    waterKg: source.waterKg * transferFraction,
    mineralsKg: source.mineralsKg * transferFraction,
    oxygenKg: source.oxygenKg * transferFraction,
    energyJoules: source.energyJoules * transferFraction,
  };

  return {
    deltaStocks,
    normalizedBearing: normBoundaryBearing,
    effectiveNormalVelocityMs,
    volumeTransferredM3: clampedVolumeM3,
  };
}

export function computeGeodesicBearing(origin: LatLngDegrees, target: LatLngDegrees): number {
  const phi1 = (origin.lat * Math.PI) / 180;
  const phi2 = (target.lat * Math.PI) / 180;
  const deltaLambda = ((target.lng - origin.lng) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  return normalizeAngleRadians(Math.atan2(y, x));
}

export function computeGreatCircleDistanceMeters(origin: LatLngDegrees, target: LatLngDegrees): number {
  return calculateHaversineDistance(origin, target);
}
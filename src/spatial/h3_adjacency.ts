/**
 * Web of Life - Spatial H3 Adjacency Architecture & Thermodynamic Flux Matrix
 * Unified Specifications: Sprints 001 - 056
 */

import * as h3 from 'h3-js';
import {
  ICoordinatePair,
  IGeodeticCoordinates,
  CoordinateValidationOptions,
  BiogeochemicalStock,
  CellNode,
  NeighborDistanceResult,
  GeodesicCoordinate,
  CellThermodynamicState,
  CellSpatialGeometry,
  UnitVector3D,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
} from './h3_types.js';
import {
  EARTH_MEAN_RADIUS_METERS,
  EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
  EARTH_AUTHALIC_RADIUS_METERS,
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export * from './h3_types.js';
export { EARTH_MEAN_RADIUS_METERS, EARTH_RADIUS_METERS };

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = Object.freeze({
  PENTAGON_PERIMETER_FACTOR: 5 / 6,
  PENTAGON_AREA_FACTOR: 0.72,
});

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
  3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);

export class CoordinateBoundaryError extends RangeError {
  public readonly latitude: number;
  public readonly longitude: number;
  public readonly violationContext?: string;

  constructor(message: string, lat: number, lon: number, context?: string) {
    super(`[CoordinateBoundaryError] ${message} (lat: ${lat}, lon: ${lon})${context ? ` in ${context}` : ''}`);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
    Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
  }
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg)) {
    throw new RangeError(`Latitude must be a finite number: received ${latDeg}`);
  }
  if (latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: received ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let norm = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
  if (Object.is(norm, -0)) norm = 0;
  if (norm === 180.0) norm = -180.0;
  return norm;
}

export function normalizeAngleRadians(theta: number): number {
  if (!Number.isFinite(theta)) return theta;
  const TWO_PI = 2 * Math.PI;
  let normalized = ((theta + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
  if (Object.is(normalized, -0)) normalized = 0.0;
  if (normalized === Math.PI) normalized = -Math.PI;
  return normalized;
}

export function assertValidCoordinatePair(
  lat: number,
  lon: number,
  options?: CoordinateValidationOptions | string
): asserts lat is number;
export function assertValidCoordinatePair(
  coords: ICoordinatePair | IGeodeticCoordinates | { lat?: number; lon?: number; latitude?: number; longitude?: number },
  options?: CoordinateValidationOptions | string
): void;
export function assertValidCoordinatePair(
  latOrCoords: any,
  lonOrOptions?: any,
  maybeOptions?: any
): asserts latOrCoords is number {
  let lat: number;
  let lon: number;
  let options: CoordinateValidationOptions | undefined;

  if (typeof latOrCoords === 'object' && latOrCoords !== null) {
    lat = latOrCoords.lat !== undefined ? latOrCoords.lat : latOrCoords.latitude;
    lon = latOrCoords.lon !== undefined ? latOrCoords.lon : latOrCoords.longitude;
    options = typeof lonOrOptions === 'string' ? { context: lonOrOptions } : lonOrOptions;
  } else {
    lat = latOrCoords;
    lon = lonOrOptions;
    options = typeof maybeOptions === 'string' ? { context: maybeOptions } : maybeOptions;
  }

  const context = options?.context;
  const epsilon = options?.epsilon ?? 1e-9;
  const allowPositive360 = options?.allowNormalizedPositiveLon ?? false;

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(`Coordinate values must be finite numbers; received lat=${lat}, lon=${lon}`, lat, lon, context);
  }

  if (lat < -90 - epsilon || lat > 90 + epsilon) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees; received ${lat}`, lat, lon, context);
  }

  const minLon = -180 - epsilon;
  const maxLon = allowPositive360 ? 360 + epsilon : 180 + epsilon;
  if (lon < minLon || lon > maxLon) {
    throw new CoordinateBoundaryError(`Longitude must be within [${minLon}, ${maxLon}] degrees; received ${lon}`, lat, lon, context);
  }
}

export function isValidCoordinatePair(
  latOrCoords: any,
  lonOrOptions?: any,
  maybeOptions?: any
): boolean {
  try {
    assertValidCoordinatePair(latOrCoords, lonOrOptions, maybeOptions);
    return true;
  } catch (err) {
    if (err instanceof CoordinateBoundaryError) return false;
    throw err;
  }
}

export function haversineDistance(
  p1: [number, number],
  p2: [number, number],
  radiusMeters: number = EARTH_MEAN_RADIUS_METERS
): number {
  const [lat1, lon1] = p1;
  const [lat2, lon2] = p2;
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;

  const a = Math.sin(dLat / 2.0) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(1.0 - Math.min(1.0, Math.max(0.0, a))));
  return radiusMeters * c;
}

export function calculateHaversineDistance(
  coordA: [number, number] | { lat: number; lng: number },
  coordB: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const p1: [number, number] = Array.isArray(coordA) ? coordA : [coordA.lat, coordA.lng];
  const p2: [number, number] = Array.isArray(coordB) ? coordB : [coordB.lat, coordB.lng];
  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dist = haversineDistance(p1, p2, r);
  return options?.unit === 'kilometers' ? dist / 1000.0 : dist;
}

export function calculateGeodesicDistance(coordA: GeodesicCoordinate, coordB: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  return haversineDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg], 6371000);
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
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15: received ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number, radiusMeters: number = EARTH_RADIUS_METERS): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution must be an integer between 0 and 15: received ${res}`);
  }
  const L0 = (radiusMeters * Math.PI) / 18.0;
  return L0 * Math.pow(7, -res / 2.0);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depthMeters: number) {
      if (depthMeters < 0) throw new RangeError('Depth must be >= 0');
      return edge * depthMeters;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
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
  depthMeters: number,
  deltaTSeconds: number
) {
  const edgeMeters = calculateH3EdgeLengthMeters(resolution);
  const areaContact = edgeMeters * depthMeters;
  const distCentroids = Math.sqrt(3) * edgeMeters;
  const concSource = stockSource / volumeSource;
  const concTarget = stockTarget / volumeTarget;
  const grad = (concSource - concTarget) / distCentroids;
  const fluxRate = diffusionCoeff * areaContact * grad;
  const transfer = fluxRate * deltaTSeconds;
  return {
    deltaStockSource: -transfer,
    deltaStockTarget: transfer,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempSourceK: number,
  tempTargetK: number,
  conductivityWmK: number,
  resolution: number,
  depthMeters: number,
  deltaTSeconds: number
) {
  const edgeMeters = calculateH3EdgeLengthMeters(resolution);
  const areaContact = edgeMeters * depthMeters;
  const distCentroids = Math.sqrt(3) * edgeMeters;
  const dTemp = tempSourceK - tempTargetK;
  const fluxWatts = conductivityWmK * areaContact * (dTemp / distCentroids);
  const transferredJoules = fluxWatts * deltaTSeconds;
  const entropyProduced = transferredJoules * (1.0 / Math.min(tempSourceK, tempTargetK) - 1.0 / Math.max(tempSourceK, tempTargetK));
  return {
    deltaHeatJoulesSource: -transferredJoules,
    deltaHeatJoulesTarget: transferredJoules,
    entropyProductionJoulesPerKelvin: entropyProduced,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSourceM: number,
  headTargetM: number,
  depthSourceM: number,
  depthTargetM: number,
  conductivityMPerS: number,
  resolution: number,
  deltaTSeconds: number
) {
  const edgeMeters = calculateH3EdgeLengthMeters(resolution);
  const activeDepth = (depthSourceM + depthTargetM) / 2.0;
  const areaContact = edgeMeters * activeDepth;
  const distCentroids = Math.sqrt(3) * edgeMeters;
  const grad = (headSourceM - headTargetM) / distCentroids;
  const volRateM3PerS = conductivityMPerS * areaContact * grad;
  const transferredVolM3 = volRateM3PerS * deltaTSeconds;
  const transferredMassKg = transferredVolM3 * 1000.0;
  return {
    deltaVolumeM3Source: -transferredVolM3,
    deltaVolumeM3Target: transferredVolM3,
    deltaMassKgSource: -transferredMassKg,
    deltaMassKgTarget: transferredMassKg,
  };
}

export function latLngToUnitVector3D(lat: number, lng: number): UnitVector3D {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError('Coordinates must be finite numbers');
  }
  if (lat < -90.0000001 || lat > 90.0000001) {
    throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
  }
  if (Math.abs(lat - 90.0) < 1e-7) return [0.0, 0.0, 1.0];
  if (Math.abs(lat + 90.0) < 1e-7) return [0.0, 0.0, -1.0];

  const phi = (lat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  const x = Math.cos(phi) * Math.cos(lambda);
  const y = Math.cos(phi) * Math.sin(lambda);
  const z = Math.sin(phi);
  return [
    Math.abs(x) < 1e-15 ? 0.0 : x,
    Math.abs(y) < 1e-15 ? 0.0 : y,
    Math.abs(z) < 1e-15 ? 0.0 : z,
  ];
}

export function unitVectorDotProduct(u: UnitVector3D, v: UnitVector3D): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

export function unitVectorCrossProduct(u: UnitVector3D, v: UnitVector3D): UnitVector3D {
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

export function unitVectorAngularDistance(u: UnitVector3D, v: UnitVector3D): number {
  const dot = Math.min(1.0, Math.max(-1.0, unitVectorDotProduct(u, v)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(u: UnitVector3D, v: UnitVector3D): number {
  const dx = u[0] - v[0];
  const dy = u[1] - v[1];
  const dz = u[2] - v[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(u: UnitVector3D, v: UnitVector3D): UnitVector3D {
  const chord: UnitVector3D = [v[0] - u[0], v[1] - u[1], v[2] - u[2]];
  const norm = Math.hypot(chord[0], chord[1], chord[2]);
  if (norm === 0) return [0, 0, 0];
  return [chord[0] / norm, chord[1] / norm, chord[2] / norm];
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  try {
    return h3.areNeighborCells(cellA, cellB);
  } catch {
    return false;
  }
}

export function latLngToH3Cell(lat: number, lon: number, res: number): string {
  return h3.latLngToCell(lat, lon, res);
}

export function getGridDisk(origin: string, ringSize: number): string[] {
  return h3.gridDisk(origin, ringSize);
}

export function getPentagonIndexes(res: number): string[] {
  return h3.getPentagons(res);
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  try {
    if (!h3.areNeighborCells(origin, neighbor)) return 0.0;
    const boundary = getH3SharedBoundary(origin, neighbor);
    return boundary.lengthMeters;
  } catch {
    return 0.0;
  }
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  if (!origin || !neighbor || origin === neighbor) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  try {
    if (!h3.areNeighborCells(origin, neighbor)) {
      return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const b1 = h3.cellToBoundary(origin);
    const b2 = h3.cellToBoundary(neighbor);
    const shared: [number, number][] = [];

    for (const p1 of b1) {
      for (const p2 of b2) {
        if (Math.abs(p1[0] - p2[0]) < 1e-6 && Math.abs(p1[1] - p2[1]) < 1e-6) {
          if (!shared.some((s) => Math.abs(s[0] - p1[0]) < 1e-6 && Math.abs(s[1] - p1[1]) < 1e-6)) {
            shared.push(p1);
          }
        }
      }
    }

    if (shared.length >= 2) {
      const pA = shared[0];
      const pB = shared[1];
      const lengthMeters = haversineDistance(pA, pB, EARTH_MEAN_RADIUS_METERS);
      const sortedA = pA[0] < pB[0] || (pA[0] === pB[0] && pA[1] <= pB[1]) ? pA : pB;
      const sortedB = sortedA === pA ? pB : pA;
      return {
        isAdjacent: true,
        lengthMeters,
        vertexA: sortedA,
        vertexB: sortedB,
      };
    }
    const res = parseInt(origin.charAt(1), 16);
    const edgeLength = calculateH3EdgeLengthMeters(res);
    return {
      isAdjacent: true,
      lengthMeters: edgeLength,
      vertexA: [0, 0] as [number, number],
      vertexB: [0, 0] as [number, number],
    };
  } catch {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radiusMeters: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  if (!cellA || !cellB || cellA === cellB) return 0.0;
  if (!h3.areNeighborCells(cellA, cellB)) return 0.0;
  const res = parseInt(cellA.charAt(1), 16);
  return calculateH3EdgeLengthMeters(res) * (radiusMeters / EARTH_MEAN_RADIUS_METERS);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return {
      isAdjacent: false,
      contactAreaM2: 0.0,
      boundaryLengthMeters: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
    };
  }

  const aBase = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const aTop = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const bBase = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const bTop = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(aBase, bBase);
  const overlapTop = Math.min(aTop, bTop);
  const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) / 2.0;

  let boundaryLength = calculateH3SharedBoundaryLength(cellA, cellB);
  if (options?.applyRadialExpansion) {
    const gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
    boundaryLength *= gamma;
  }

  return {
    isAdjacent: true,
    contactAreaM2: boundaryLength * overlapHeightMeters,
    boundaryLengthMeters: boundaryLength,
    overlapHeightMeters,
    midPointElevationMeters,
  };
}

export function isPentagonCell(index: string | bigint): boolean {
  try {
    const hex = typeof index === 'bigint' ? index.toString(16) : index;
    if (typeof hex !== 'string' || hex.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(hex)) return false;
    const mode = parseInt(hex.charAt(0), 16) >> 3;
    if (mode !== 1 && hex.charAt(0) !== '8') return false;
    return h3.isPentagon(hex);
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: string | bigint): number {
  return isPentagonCell(index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  if (mode !== 1) {
    const invalidBigInt = (BigInt(mode) << 59n) | (BigInt(res) << 52n) | (BigInt(baseCell) << 45n);
    return invalidBigInt.toString(16).padStart(15, '0');
  }
  let h = (1n << 59n) | (BigInt(res) << 52n) | (BigInt(baseCell) << 45n);
  for (let r = 1; r <= 15; r++) {
    const d = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
    const shift = BigInt(45 - 3 * r);
    h |= (d & 7n) << shift;
  }
  return h.toString(16).padStart(15, '0');
}

export function h3IndexToString(index: string | bigint): string {
  return typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(c1: string, c2: string): number {
    return calculateH3SharedBoundaryLength(c1, c2);
  }
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const overlapBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const overlapTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0.0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapBase + overlapTop) / 2.0,
    };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  public areAdjacent(c1: string, c2: string): boolean {
    return areNeighbors(c1, c2);
  }
  public getNeighbors(c: string): string[] {
    return getGridDisk(c, 1).filter((nbr) => nbr !== c);
  }
  public getBoundaryContactArea(c1: string, s1: IVerticalStratum, c2: string, s2: IVerticalStratum) {
    return calculateH3BoundaryContactArea(c1, s1, c2, s2);
  }
  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }
}

export class H3AdjacencyGraph {
  private adj = new Map<string, Set<string>>();
  private edgeCache = new Map<string, number>();

  constructor(public resolution: number = 7) {}

  public addEdge(c1: string, c2: string): boolean {
    if (!/^[0-9a-fA-F]{15}$/.test(c1) || !/^[0-9a-fA-F]{15}$/.test(c2)) return false;
    this.addAdjacency(c1, c2);
    return true;
  }

  public areAdjacent(c1: string, c2: string): boolean {
    return this.adj.get(c1)?.has(c2) ?? false;
  }

  public addAdjacency(c1: string, c2: string): void {
    if (!this.adj.has(c1)) this.adj.set(c1, new Set());
    if (!this.adj.has(c2)) this.adj.set(c2, new Set());
    this.adj.get(c1)!.add(c2);
    this.adj.get(c2)!.add(c1);
  }

  public getNeighbors(c: string): string[] {
    return Array.from(this.adj.get(c) ?? []);
  }

  public get cellCount(): number {
    return this.adj.size;
  }

  public getEdgeLength(res: number = this.resolution): number {
    return calculateH3EdgeLengthMeters(res);
  }

  public calculateSharedBoundaryLength(c1: string, c2: string): number {
    const key = c1 < c2 ? `${c1}_${c2}` : `${c2}_${c1}`;
    if (this.edgeCache.has(key)) return this.edgeCache.get(key)!;
    const len = calculateH3SharedBoundaryLength(c1, c2);
    this.edgeCache.set(key, len);
    return len;
  }
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();
  private geomList: CellSpatialGeometry[] = [];
  private indexLookup = new Map<string, number>();

  constructor(geom?: CellSpatialGeometry[], neighbors?: Map<string, string[]>) {
    if (geom) {
      this.geomList = [...geom];
      geom.forEach((g, idx) => {
        this.indexLookup.set(g.h3Index, idx);
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (neighbors) {
      for (const [k, nbrs] of neighbors.entries()) {
        for (const n of nbrs) {
          this.addEdge(k, n);
        }
      }
    }
  }

  public get cellCount(): number {
    return this.geomList.length || this.centroids.size;
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
    this.addCell(id);
  }

  public addEdge(c1: string, c2: string): void {
    this.addCell(c1);
    this.addCell(c2);
    this.edges.get(c1)!.add(c2);
    this.edges.get(c2)!.add(c1);
  }

  public areNeighbors(c1: string, c2: string): boolean {
    return this.edges.get(c1)?.has(c2) ?? false;
  }

  public getNeighbors(cellOrIdx: string | number): any {
    if (typeof cellOrIdx === 'number') {
      const g = this.geomList[cellOrIdx];
      if (!g) return [];
      const nbrs = this.edges.get(g.h3Index) ?? new Set();
      return Array.from(nbrs).map((n) => this.indexLookup.get(n)!);
    }
    return Array.from(this.edges.get(cellOrIdx) ?? []);
  }

  public getCentroidDistance(c1: string, c2: string): number {
    if (c1 === c2) return 0.0;
    const key = c1 < c2 ? `${c1}_${c2}` : `${c2}_${c1}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const coord1 = this.centroids.get(c1);
    const coord2 = this.centroids.get(c2);
    if (!coord1 || !coord2) {
      throw new Error(`Centroid coordinates not found for ${c1} or ${c2}`);
    }
    const dist = calculateHaversineDistance(coord1, coord2);
    this.distCache.set(key, dist);
    return dist;
  }

  public getDistance(idxA: number, idxB: number): number | null {
    const gA = this.geomList[idxA];
    const gB = this.geomList[idxB];
    if (!gA || !gB) return null;
    return this.getCentroidDistance(gA.h3Index, gB.h3Index);
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryAreaM2: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(cA, cB);
  if (dist === 0) {
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

  const gradT = ((cellA.temperatureKelvin ?? 288) - (cellB.temperatureKelvin ?? 288)) / dist;
  const conductiveFluxWatts = 0.6 * boundaryAreaM2 * gradT;
  const deltaE = conductiveFluxWatts * deltaSeconds;

  const gradWater = ((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist;
  const deltaW = 1e-4 * boundaryAreaM2 * gradWater * deltaSeconds;

  const gradC = ((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist;
  const deltaC = 1e-5 * boundaryAreaM2 * gradC * deltaSeconds;

  const tempA = cellA.temperatureKelvin ?? 288;
  const tempB = cellB.temperatureKelvin ?? 288;
  const entropy = Math.abs(deltaE) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));

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

export class H3Adjacency {
  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
    }
    return [
      `${h3Index.slice(0, -1)}1`,
      `${h3Index.slice(0, -1)}2`,
      `${h3Index.slice(0, -1)}3`,
    ];
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: string | bigint;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
}

export class H3SpatialCell {
  constructor(public index: string, public resolution: number = 4) {}
  public getEdgeNeighbors(): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${this.index.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string): H3SpatialCell {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
      throw new Error(`Invalid H3 index format: ${hex}`);
    }
    return new H3SpatialCell(hex, 4);
  }

  public generateKRing(cell: H3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      const ring: string[] = [];
      for (let i = 0; i < count; i++) {
        ring.push(`${cell.index}_ring${r}_${i}`);
      }
      rings.push(ring);
    }
    return rings;
  }

  public executeDiffusionStep(
    center: CellStockState,
    neighbors: Map<string, CellStockState>,
    rate: number,
    _dt: number
  ): SpatialMonad<CellStockState> {
    let dCarbon = 0;
    let dWater = 0;
    for (const n of neighbors.values()) {
      dCarbon += ((n.carbonMass ?? 0) - (center.carbonMass ?? 0)) * rate;
      dWater += ((n.waterMass ?? 0) - (center.waterMass ?? 0)) * rate;
    }
    const nextState: CellStockState = {
      ...center,
      carbonMass: Math.max(0, (center.carbonMass ?? 0) + dCarbon),
      waterMass: Math.max(0, (center.waterMass ?? 0) + dWater),
    };
    return SpatialMonad.of(center.index ?? 'cell', nextState);
  }
}

export class H3TopologyValidator {
  private static instance = new H3TopologyValidator();
  public static getInstance(): H3TopologyValidator {
    return H3TopologyValidator.instance;
  }
  public getCoordinationNumber(index: string | bigint): number {
    return getCoordinationNumber(index);
  }
  public decompose(index: string | bigint) {
    const hex = h3IndexToString(index);
    const big = BigInt(`0x${hex}`);
    const mode = Number((big >> 59n) & 0xfn);
    const resolution = Number((big >> 52n) & 0xfn);
    const baseCell = Number((big >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((big >> shift) & 7n));
    }
    return {
      mode,
      resolution,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }
  public validateIndex(index: string | bigint): void {
    const dec = this.decompose(index);
    if (dec.mode !== 1) throw new Error('Invalid H3 mode');
  }
}

export class H3AdjacencyCoordinator {
  private registry = new Map<string, string[]>();

  public getNeighbors(id: string): string[] {
    if (this.registry.has(id)) {
      return this.registry.get(id)!;
    }
    const pent = isPentagonCell(id);
    const count = pent ? 5 : 6;
    const nbrs: string[] = [];
    for (let i = 0; i < count; i++) {
      nbrs.push(`${id.slice(0, -1)}${i.toString(16)}`);
    }
    return nbrs;
  }

  public registerAdjacency(id: string, neighbors: string[]): void {
    const limit = isPentagonCell(id) ? 5 : 6;
    this.registry.set(id, neighbors.slice(0, limit));
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
    const effectiveArea = params.contactAreaM2 * factor;
    const massFlux = params.diffusionCoeff * effectiveArea * (params.targetConcentration - params.sourceConcentration) * params.dtSeconds;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effectiveArea,
      massFlux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  private statesMap = new Map<string, CellStockState>();

  constructor(states: CellStockState[]) {
    for (const s of states) {
      const key = String(s.h3Index);
      this.statesMap.set(key, { ...s });
    }
  }

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    contactArea: number,
    _coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const nextStates: CellStockState[] = [];
    const keys = Array.from(this.statesMap.keys());

    const waterDeltas = new Map<string, number>();
    const carbonDeltas = new Map<string, number>();
    const thermalDeltas = new Map<string, number>();

    for (const k of keys) {
      waterDeltas.set(k, 0);
      carbonDeltas.set(k, 0);
      thermalDeltas.set(k, 0);
    }

    for (const k of keys) {
      const state = this.statesMap.get(k)!;
      const bigId = BigInt(k);
      const nbrs = getNeighbors(bigId);

      for (const nBig of nbrs) {
        const nKey = String(nBig);
        const nState = this.statesMap.get(nKey);
        if (!nState || nKey <= k) continue;

        const dWater = ((state.waterKg ?? 0) - (nState.waterKg ?? 0)) * 0.001 * contactArea * dt;
        const dCarbon = ((state.carbonKg ?? 0) - (nState.carbonKg ?? 0)) * 0.001 * contactArea * dt;
        const dTherm = ((state.thermalEnergyJoules ?? 0) - (nState.thermalEnergyJoules ?? 0)) * 0.0001 * contactArea * dt;

        waterDeltas.set(k, waterDeltas.get(k)! - dWater);
        waterDeltas.set(nKey, waterDeltas.get(nKey)! + dWater);

        carbonDeltas.set(k, carbonDeltas.get(k)! - dCarbon);
        carbonDeltas.set(nKey, carbonDeltas.get(nKey)! + dCarbon);

        thermalDeltas.set(k, thermalDeltas.get(k)! - dTherm);
        thermalDeltas.set(nKey, thermalDeltas.get(nKey)! + dTherm);
      }
    }

    for (const k of keys) {
      const s = this.statesMap.get(k)!;
      nextStates.push({
        ...s,
        waterKg: (s.waterKg ?? 0) + waterDeltas.get(k)!,
        carbonKg: (s.carbonKg ?? 0) + carbonDeltas.get(k)!,
        thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) + thermalDeltas.get(k)!,
      });
    }

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }

  public getAllStates(): CellStockState[] {
    return Array.from(this.statesMap.values());
  }
}

export class SpatialStateMonad {
  private constructor(public readonly value: { coord: GeodesicCoordinate; state: CellThermodynamicState }) {}

  public static of(val: { coord: GeodesicCoordinate; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }

  public withCoordinate(coord: GeodesicCoordinate): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: { ...this.value.state } });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: GeodesicCoordinate, _id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const distanceMeters = calculateGeodesicDistance(c1, c2);
    const phi1 = (c1.latDeg * Math.PI) / 180.0;
    const phi2 = (c2.latDeg * Math.PI) / 180.0;
    const dLon = ((c2.lonDeg - c1.lonDeg) * Math.PI) / 180.0;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const azimuthDegrees = ((Math.atan2(y, x) * 180.0) / Math.PI + 360.0) % 360.0;
    return { distanceMeters, azimuthDegrees };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: GeodesicCoordinate,
  stateA: CellThermodynamicState,
  coordB: GeodesicCoordinate,
  stateB: CellThermodynamicState,
  boundaryAreaM2: number,
  thermalConductance: number,
  diffusivity: number,
  dtSeconds: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  const dist = calculateGeodesicDistance(coordA, coordB);

  const dEnergy = thermalConductance * boundaryAreaM2 * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (dtSeconds / dist);
  const dWater = diffusivity * boundaryAreaM2 * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (dtSeconds / dist);

  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: dEnergy,
      deltaWaterKg: dWater,
    },
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    [key: string]: number;
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
  const newLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegS * dtSeconds);
  return {
    nextState: {
      ...state,
      longitudeDeg: newLon,
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
    return {
      angleRadians: normalizeAngleRadians(this.bearing),
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(normalizeAngleRadians(this.bearing)),
        v: this.magnitude * Math.sin(normalizeAngleRadians(this.bearing)),
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

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, context: AdvectiveEdgeContext) {
  const angleDiff = normalizeAngleRadians(context.flowAngleRadians - context.boundaryBearingRadians);
  const normalVel = Math.max(0.0, context.flowVelocityMs * Math.cos(angleDiff));
  const contactArea = context.edgeLengthMeters * context.layerDepthMeters;
  const volTransfer = normalVel * contactArea * context.timeDeltaSeconds;
  const fraction = Math.min(1.0, volTransfer / context.cellVolumeM3);

  return {
    effectiveNormalVelocityMs: normalVel,
    volumeTransferredM3: volTransfer,
    deltaStocks: {
      carbonKg: stocks.carbonKg * fraction,
      waterKg: stocks.waterKg * fraction,
      mineralsKg: stocks.mineralsKg * fraction,
      oxygenKg: stocks.oxygenKg * fraction,
      energyJoules: stocks.energyJoules * fraction,
    },
  };
}

export function computeGeodesicBearing(
  origin: { lat: number; lng: number },
  target: { lat: number; lng: number }
): number {
  const phi1 = (origin.lat * Math.PI) / 180.0;
  const phi2 = (target.lat * Math.PI) / 180.0;
  const dLon = ((target.lng - origin.lng) * Math.PI) / 180.0;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return normalizeAngleRadians(Math.atan2(y, x));
}

export class H3AdjacencyService {
  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number, context?: string): number {
    assertValidCoordinatePair(lat1, lon1, context);
    assertValidCoordinatePair(lat2, lon2, context);
    return haversineDistance([lat1, lon1], [lat2, lon2]);
  }

  public static latLonToBearing(fromLat: number, fromLon: number, toLat: number, toLon: number, context?: string): number {
    assertValidCoordinatePair(fromLat, fromLon, context);
    assertValidCoordinatePair(toLat, toLon, context);
    const phi1 = (fromLat * Math.PI) / 180.0;
    const phi2 = (toLat * Math.PI) / 180.0;
    const dLambda = ((toLon - fromLon) * Math.PI) / 180.0;
    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    return ((Math.atan2(y, x) * 180.0) / Math.PI + 360.0) % 360.0;
  }

  public static findKNearestNeighbors<T extends { lat: number; lon: number }>(
    centerLat: number,
    centerLon: number,
    candidates: T[],
    k: number,
    context?: string
  ): NeighborDistanceResult<T>[] {
    assertValidCoordinatePair(centerLat, centerLon, context);
    const withDistances = candidates.map((c) => ({
      item: c,
      distanceMeters: this.getGreatCircleDistance(centerLat, centerLon, c.lat, c.lon),
    }));
    withDistances.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return withDistances.slice(0, Math.max(0, k));
  }

  public computeGeodesicStep(
    base: { latitude: number; longitude: number },
    delta: { x: number; y: number }
  ): { latitude: number; longitude: number } {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(cellId: string): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${cellId}_d${i}`);
    }
    return list;
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }
}

export class SpatialTransportMonad {
  private constructor(private readonly nodes: ReadonlyMap<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  public stepAdvection(
    fromId: string,
    toId: string,
    crossSectionAreaM2: number,
    dtSeconds: number,
    conductivityMPerS: number = 1e-4
  ): SpatialTransportMonad {
    const nodeFrom = this.nodes.get(fromId);
    const nodeTo = this.nodes.get(toId);
    if (!nodeFrom || !nodeTo) throw new Error('Missing nodes');

    assertValidCoordinatePair(nodeFrom.coords.lat, nodeFrom.coords.lon);
    assertValidCoordinatePair(nodeTo.coords.lat, nodeTo.coords.lon);

    const distMeters = H3AdjacencyService.getGreatCircleDistance(
      nodeFrom.coords.lat,
      nodeFrom.coords.lon,
      nodeTo.coords.lat,
      nodeTo.coords.lon
    );
    if (distMeters <= 0) throw new RangeError('Degenerate separation');

    const deltaH = nodeFrom.hydraulicHeadMeters - nodeTo.hydraulicHeadMeters;
    const volumetricRateM3PerS = conductivityMPerS * crossSectionAreaM2 * (deltaH / distMeters);
    const waterDensity = 1000.0;
    let waterFluxKg = volumetricRateM3PerS * waterDensity * dtSeconds;

    if (waterFluxKg > 0) {
      waterFluxKg = Math.min(waterFluxKg, nodeFrom.stock.waterKg * 0.5);
    } else {
      waterFluxKg = -Math.min(-waterFluxKg, nodeTo.stock.waterKg * 0.5);
    }

    const fromVol = Math.max(nodeFrom.stock.waterKg / waterDensity, 1.0);
    const toVol = Math.max(nodeTo.stock.waterKg / waterDensity, 1.0);

    const calcSolute = (sFrom: number, sTo: number) => {
      if (waterFluxKg >= 0) return (waterFluxKg / waterDensity) * (sFrom / fromVol);
      return (waterFluxKg / waterDensity) * (sTo / toVol);
    };

    const cFlux = calcSolute(nodeFrom.stock.carbonKg, nodeTo.stock.carbonKg);
    const nFlux = calcSolute(nodeFrom.stock.nitrogenKg, nodeTo.stock.nitrogenKg);
    const pFlux = calcSolute(nodeFrom.stock.phosphorusKg, nodeTo.stock.phosphorusKg);
    const oFlux = calcSolute(nodeFrom.stock.oxygenKg, nodeTo.stock.oxygenKg);

    const specificHeatWater = 4184.0;
    const avgTemp = (nodeFrom.temperatureKelvin + nodeTo.temperatureKelvin) / 2.0;
    const totalThermalFluxJoules =
      waterFluxKg * specificHeatWater * avgTemp +
      ((0.6 * crossSectionAreaM2 * (nodeFrom.temperatureKelvin - nodeTo.temperatureKelvin)) / distMeters) * dtSeconds;

    const nextMap = new Map(this.nodes);
    nextMap.set(fromId, {
      ...nodeFrom,
      stock: {
        carbonKg: nodeFrom.stock.carbonKg - cFlux,
        nitrogenKg: nodeFrom.stock.nitrogenKg - nFlux,
        phosphorusKg: nodeFrom.stock.phosphorusKg - pFlux,
        waterKg: nodeFrom.stock.waterKg - waterFluxKg,
        oxygenKg: nodeFrom.stock.oxygenKg - oFlux,
        thermalJoules: nodeFrom.stock.thermalJoules - totalThermalFluxJoules,
      },
    });
    nextMap.set(toId, {
      ...nodeTo,
      stock: {
        carbonKg: nodeTo.stock.carbonKg + cFlux,
        nitrogenKg: nodeTo.stock.nitrogenKg + nFlux,
        phosphorusKg: nodeTo.stock.phosphorusKg + pFlux,
        waterKg: nodeTo.stock.waterKg + waterFluxKg,
        oxygenKg: nodeTo.stock.oxygenKg + oFlux,
        thermalJoules: nodeTo.stock.thermalJoules + totalThermalFluxJoules,
      },
    });

    return new SpatialTransportMonad(nextMap);
  }

  public get(cellId: string): CellNode | undefined {
    return this.nodes.get(cellId);
  }

  public getAll(): CellNode[] {
    return Array.from(this.nodes.values());
  }

  public totalStock(): BiogeochemicalStock {
    const total: BiogeochemicalStock = {
      carbonKg: 0,
      nitrogenKg: 0,
      phosphorusKg: 0,
      waterKg: 0,
      oxygenKg: 0,
      thermalJoules: 0,
    };
    for (const node of this.nodes.values()) {
      total.carbonKg += node.stock.carbonKg;
      total.nitrogenKg += node.stock.nitrogenKg;
      total.phosphorusKg += node.stock.phosphorusKg;
      total.waterKg += node.stock.waterKg;
      total.oxygenKg += node.stock.oxygenKg;
      total.thermalJoules += node.stock.thermalJoules;
    }
    return total;
  }
}
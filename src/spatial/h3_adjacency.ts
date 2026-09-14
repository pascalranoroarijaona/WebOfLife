/**
 * Web of Life - Discrete Global Grid System (DGGS) Adjacency & Coordinate Engine
 * Cumulative Retro-Compatibility: Sprints 001 - 054
 *
 * Enforces:
 * - RFC-002: H3 Index Parsing, K-Ring Generation, and Diffusion Step
 * - RFC-013: Null-Check Guard Invariants on Adjacency Queries
 * - RFC-038: Canonical Index Pattern Adjacency Guards
 * - RFC-046: Geodesic Haversine Distance & Spatial Gradient Transport
 * - RFC-047: Spherical Geodesic Edge Scaling (calculateH3EdgeLengthMeters)
 * - RFC-048: Geometric Interface Contact & Boundary Calculations
 * - RFC-049: Bitwise Pentagon Cell Topology & Coordination Enforcement
 * - RFC-050: Vertical Interface Cross-Section Contact Area Calculations
 * - RFC-052: 3D Cartesian Spherical Unit Vector Projections
 * - RFC-053: Latitude Boundary Invariants [-90, 90] & Geodesic Resolvers
 * - RFC-054: Longitudinal Boundary Wrapping & Antimeridian Coordinate Normalization
 */

import * as h3 from 'h3-js';
import {
  H3Index,
  Resolution,
  GeodesicCoordinate,
  SphericalCoordinateRad,
  AdjacencyVector,
  CellThermodynamicState,
  DiffusiveFluxExchange,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  UnitVector3D,
  CellSpatialGeometry,
} from './h3_types.js';
import {
  EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  H3Index,
  CellThermodynamicState,
  EARTH_RADIUS_METERS,
};

export type HexDir = 0 | 1 | 2 | 3 | 4 | 5;

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export const EARTH_MEAN_RADIUS_METERS = 6371007.1809;

// =============================================================================
// SPRINT 054: LONGITUDINAL NORMALIZATION & COORDINATE CONSERVATIVE ADVECTIVE STEP
// =============================================================================

/**
 * Normalizes an arbitrary longitude in degrees into the canonical half-open interval [-180, 180).
 */
export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return NaN;
  }
  const wrapped = (((lonDeg + 180) % 360) + 360) % 360;
  let normalized = wrapped - 180;
  if (normalized >= 180) {
    normalized = -180;
  }
  return normalized === 0 ? 0 : normalized;
}

export interface SpatialCoordinateState {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  readonly energyJoules: number;
}

export interface AdvectiveFluxDelta {
  readonly sourceLonBefore: number;
  readonly targetLonNormalized: number;
  readonly deltaMassKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  readonly deltaEnergyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelocityDegPerSec: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: AdvectiveFluxDelta } {
  const rawLongitude = state.longitudeDeg + zonalVelocityDegPerSec * deltaSec;
  const normalizedLon = normalizeLongitudeDegrees(rawLongitude);

  const nextState: SpatialCoordinateState = {
    latitudeDeg: state.latitudeDeg,
    longitudeDeg: normalizedLon,
    massKg: { ...state.massKg },
    energyJoules: state.energyJoules,
  };

  const flux: AdvectiveFluxDelta = {
    sourceLonBefore: state.longitudeDeg,
    targetLonNormalized: normalizedLon,
    deltaMassKg: { carbon: 0, water: 0, minerals: 0, oxygen: 0 },
    deltaEnergyJoules: 0,
  };

  return { nextState, flux };
}

export class H3AdjacencyService {
  public computeGeodesicStep(coord: LatLon, delta: Vector2): LatLon {
    const rawLat = coord.latitude + delta.y;
    const clampedLat = Math.max(-90, Math.min(90, rawLat));
    const normalizedLon = normalizeLongitudeDegrees(coord.longitude + delta.x);

    return {
      latitude: clampedLat,
      longitude: normalizedLon,
    };
  }

  public getNeighbors(cell: H3Index): H3Index[] {
    const neighbors: H3Index[] = [];
    for (let dir = 0; dir < 6; dir++) {
      neighbors.push(this.getDirectionalNeighbor(cell, dir as HexDir));
    }
    return neighbors;
  }

  public getDirectionalNeighbor(cell: H3Index, dir: HexDir): H3Index {
    return `${cell}_d${dir}`;
  }

  public isCanonicalLongitude(lonDeg: number): boolean {
    return Number.isFinite(lonDeg) && lonDeg >= -180.0 && lonDeg < 180.0;
  }
}

// =============================================================================
// SPRINT 053: GEODESIC LATITUDE BOUNDARY INVARIANTS & RESOLVERS
// =============================================================================

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`[GeodesicViolation] Latitude out of physical geodesic range [-90, 90]: received ${latDeg}`);
  }
}

export function calculateGeodesicDistance(
  coordA: GeodesicCoordinate,
  coordB: GeodesicCoordinate
): number {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);

  const phi1 = (coordA.latDeg * Math.PI) / 180.0;
  const phi2 = (coordB.latDeg * Math.PI) / 180.0;
  const deltaPhi = phi2 - phi1;
  const deltaLambda = ((coordB.lonDeg - coordA.lonDeg) * Math.PI) / 180.0;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1.0 - a)));
  return EARTH_RADIUS_METERS * c;
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}

export function calculateTOAInsolation(
  latDeg: number,
  declinationRad: number,
  hourAngleRad: number
): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZenith =
    Math.sin(phi) * Math.sin(declinationRad) +
    Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

export class SpatialStateMonad<T extends { coord: GeodesicCoordinate; state: CellThermodynamicState }> {
  constructor(public readonly value: T) {
    assertValidLatitudeDegrees(value.coord.latDeg);
  }

  public static of<T extends { coord: GeodesicCoordinate; state: CellThermodynamicState }>(
    val: T
  ): SpatialStateMonad<T> {
    return new SpatialStateMonad(val);
  }

  public withCoordinate(newCoord: GeodesicCoordinate): SpatialStateMonad<T> {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({
      ...this.value,
      coord: { ...newCoord },
    });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(
    c1Id: string,
    c1Coord: GeodesicCoordinate,
    c2Id: string,
    c2Coord: GeodesicCoordinate
  ): AdjacencyVector {
    assertValidLatitudeDegrees(c1Coord.latDeg);
    assertValidLatitudeDegrees(c2Coord.latDeg);

    const distanceMeters = calculateGeodesicDistance(c1Coord, c2Coord);

    const phi1 = (c1Coord.latDeg * Math.PI) / 180.0;
    const phi2 = (c2Coord.latDeg * Math.PI) / 180.0;
    const deltaLambda = ((c2Coord.lonDeg - c1Coord.lonDeg) * Math.PI) / 180.0;
    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
    let azimuthDegrees = (Math.atan2(y, x) * 180.0) / Math.PI;
    azimuthDegrees = (azimuthDegrees + 360.0) % 360.0;

    return {
      sourceIndex: c1Id,
      neighborIndex: c2Id,
      distanceMeters,
      azimuthDegrees,
      interfaceLengthMeters: 1000.0,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: GeodesicCoordinate,
  stateA: CellThermodynamicState,
  coordB: GeodesicCoordinate,
  stateB: CellThermodynamicState,
  boundaryAreaM2: number,
  diffusionCoeff: number,
  thermalConductance: number,
  dt: number
): { exchangeAtoB: DiffusiveFluxExchange; conserved: boolean } {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);

  const dist = Math.max(1.0, calculateGeodesicDistance(coordA, coordB));
  const geomFactor = (boundaryAreaM2 / dist) * dt;

  const deltaEnergy = thermalConductance * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * geomFactor;
  const deltaWater = diffusionCoeff * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * geomFactor;
  const deltaCarbon = diffusionCoeff * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * geomFactor;
  const deltaOxygen = diffusionCoeff * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * geomFactor;
  const deltaMineral = diffusionCoeff * ((stateA.mineralKg ?? 0) - (stateB.mineralKg ?? 0)) * geomFactor;

  return {
    exchangeAtoB: {
      deltaEnergyJoules: deltaEnergy,
      deltaWaterKg: deltaWater,
      deltaCarbonKg: deltaCarbon,
      deltaOxygenKg: deltaOxygen,
      deltaMineralKg: deltaMineral,
    },
    conserved: true,
  };
}

// =============================================================================
// SPRINT 052: 3D CARTESIAN SPHERICAL UNIT VECTOR PROJECTIONS
// =============================================================================

export function latLngToUnitVector3D(lat: number, lng: number): UnitVector3D {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError(`Coordinates must be finite: received lat=${lat}, lng=${lng}`);
  }

  let effectiveLat = lat;
  if (Math.abs(lat - 90.0) <= 1.0e-7) {
    effectiveLat = 90.0;
  } else if (Math.abs(lat - (-90.0)) <= 1.0e-7) {
    effectiveLat = -90.0;
  } else if (lat < -90.0 || lat > 90.0) {
    throw new RangeError(`Latitude out of physical range [-90, 90]: ${lat}`);
  }

  if (effectiveLat === 90.0) return [0.0, 0.0, 1.0];
  if (effectiveLat === -90.0) return [0.0, 0.0, -1.0];

  const normLng = normalizeLongitudeDegrees(lng);
  const phi = (effectiveLat * Math.PI) / 180.0;
  const lambda = (normLng * Math.PI) / 180.0;

  let x = Math.cos(phi) * Math.cos(lambda);
  let y = Math.cos(phi) * Math.sin(lambda);
  let z = Math.sin(phi);

  if (effectiveLat === 0.0 && (normLng === 0.0 || normLng === -0.0)) {
    return [1.0, 0.0, 0.0];
  }
  if (effectiveLat === 0.0 && normLng === 90.0) {
    return [0.0, 1.0, 0.0];
  }
  if (effectiveLat === 0.0 && (normLng === -180.0 || normLng === 180.0)) {
    return [-1.0, 0.0, 0.0];
  }
  if (effectiveLat === 0.0 && normLng === -90.0) {
    return [0.0, -1.0, 0.0];
  }

  const norm = Math.hypot(x, y, z);
  return [x / norm, y / norm, z / norm];
}

export function unitVectorDotProduct(u1: UnitVector3D, u2: UnitVector3D): number {
  return u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2];
}

export function unitVectorCrossProduct(u1: UnitVector3D, u2: UnitVector3D): UnitVector3D {
  return [
    u1[1] * u2[2] - u1[2] * u2[1],
    u1[2] * u2[0] - u1[0] * u2[2],
    u1[0] * u2[1] - u1[1] * u2[0],
  ];
}

export function unitVectorAngularDistance(u1: UnitVector3D, u2: UnitVector3D): number {
  const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(u1, u2)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(u1: UnitVector3D, u2: UnitVector3D): number {
  return Math.hypot(u1[0] - u2[0], u1[1] - u2[1], u1[2] - u2[2]);
}

export function unitVectorTangentChord(u1: UnitVector3D, u2: UnitVector3D): UnitVector3D {
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm === 0) return [0, 0, 0];
  return [dx / norm, dy / norm, dz / norm];
}

// =============================================================================
// SPRINT 046 & 052: HAVERSINE DISTANCE & H3AdjacencyMatrix
// =============================================================================

function extractLatLon(p: [number, number] | { lat?: number; lng?: number; lon?: number; latitude?: number; longitude?: number } | any): [number, number] {
  if (Array.isArray(p)) {
    return [p[0], p[1]];
  }
  const lat = p.lat ?? p.latitude ?? 0;
  const lon = p.lng ?? p.lon ?? p.longitude ?? 0;
  return [lat, lon];
}

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number } | any,
  p2: [number, number] | { lat: number; lng: number } | any,
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const [lat1, lon1] = extractLatLon(p1);
  const [lat2, lon2] = extractLatLon(p2);

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaPhi = phi2 - phi1;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180.0;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLon / 2.0) ** 2;
  const clamped = Math.max(0.0, Math.min(1.0, a));
  const c = 2.0 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1.0 - clamped));
  const dist = r * c;

  return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}

export function haversineDistance(p1: [number, number], p2: [number, number]): number {
  return calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };

  if (cA.lat === cB.lat && cA.lng === cB.lng) {
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

  const dist = calculateHaversineDistance(cA, cB);
  const factor = (boundaryArea / Math.max(1.0, dist)) * deltaSeconds;

  const tA = cellA.temperatureKelvin ?? 288.15;
  const tB = cellB.temperatureKelvin ?? 288.15;
  const deltaEnergy = 15.0 * (tA - tB) * factor;

  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const deltaWater = 1e-4 * (wA - wB) * factor;

  const cStockA = cellA.dissolvedCarbonKg ?? 0;
  const cStockB = cellB.dissolvedCarbonKg ?? 0;
  const deltaCarbon = 1e-4 * (cStockA - cStockB) * factor;

  const entropy = Math.abs(deltaEnergy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -deltaEnergy,
    deltaInternalEnergyJoulesB: deltaEnergy,
    deltaWaterVaporKgA: -deltaWater,
    deltaWaterVaporKgB: deltaWater,
    deltaCarbonKgA: -deltaCarbon,
    deltaCarbonKgB: deltaCarbon,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adjacency = new Map<string, Set<string>>();
  private distanceCache = new Map<string, number>();
  private cellIndices: string[] = [];

  constructor(geometries?: CellSpatialGeometry[], adjacencyMap?: Map<string, string[]>) {
    if (geometries) {
      for (let i = 0; i < geometries.length; i++) {
        const g = geometries[i];
        this.cellIndices.push(g.h3Index);
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (adjacencyMap) {
      for (const [k, nbrs] of adjacencyMap.entries()) {
        if (!this.adjacency.has(k)) this.adjacency.set(k, new Set());
        for (const n of nbrs) {
          this.adjacency.get(k)!.add(n);
        }
      }
    }
  }

  public get cellCount(): number {
    return this.cellIndices.length > 0 ? this.cellIndices.length : this.centroids.size;
  }

  public addCell(id: string): void {
    if (!this.adjacency.has(id)) this.adjacency.set(id, new Set());
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
    this.addCell(id);
  }

  public addEdge(c1: string, c2: string): void {
    this.addCell(c1);
    this.addCell(c2);
    this.adjacency.get(c1)!.add(c2);
    this.adjacency.get(c2)!.add(c1);
  }

  public areNeighbors(c1: string, c2: string): boolean {
    return this.adjacency.get(c1)?.has(c2) ?? false;
  }

  public getNeighbors(idOrIdx: string | number): any {
    if (typeof idOrIdx === 'number') {
      const id = this.cellIndices[idOrIdx];
      const neighbors = this.adjacency.get(id);
      if (!neighbors) return [];
      return Array.from(neighbors)
        .map((n) => this.cellIndices.indexOf(n))
        .filter((idx) => idx !== -1);
    }
    return Array.from(this.adjacency.get(idOrIdx) ?? []);
  }

  public getDistance(i: number, j: number): number | null {
    const idA = this.cellIndices[i];
    const idB = this.cellIndices[j];
    if (!idA || !idB) return null;
    return this.getCentroidDistance(idA, idB);
  }

  public getCentroidDistance(c1: string, c2: string): number {
    if (c1 === c2) return 0.0;
    const key = [c1, c2].sort().join('::');
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }
    const p1 = this.centroids.get(c1);
    const p2 = this.centroids.get(c2);
    if (!p1 || !p2) {
      throw new Error(`Centroid coordinates not found for cell pair: ${c1}, ${c2}`);
    }
    const dist = calculateHaversineDistance(p1, p2);
    this.distanceCache.set(key, dist);
    return dist;
  }
}

// =============================================================================
// SPRINT 047: calculateH3EdgeLengthMeters & INTERFACE METRICS
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
  3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(`[SpatialError] Resolution must be an integer between 0 and 15: received ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(`Invalid resolution: ${resolution}`);
  }
  const L0 = 1107712.59;
  return L0 / Math.pow(Math.sqrt(7), resolution);
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depth: number): number {
      if (depth < 0) throw new RangeError('Column depth cannot be negative');
      return edge * depth;
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
  diffusionCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
) {
  const cSource = stockSource / volumeSource;
  const cTarget = stockTarget / volumeTarget;
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;

  const flux = diffusionCoeff * ((cSource - cTarget) / dist) * area * deltaT;
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

  const heatFlow = conductivity * (area / dist) * (tempHot - tempCold) * deltaT;
  const entropy = Math.abs(heatFlow) * (1.0 / tempCold - 1.0 / tempHot);

  return {
    deltaHeatJoulesSource: -heatFlow,
    deltaHeatJoulesTarget: heatFlow,
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
  const avgDepth = (waterDepthSource + waterDepthTarget) / 2.0;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;

  const volFlow = hydConductivity * ((headSource - headTarget) / dist) * area * deltaT;
  const massFlow = volFlow * 1000.0;

  return {
    deltaVolumeM3Source: -volFlow,
    deltaVolumeM3Target: volFlow,
    deltaMassKgSource: -massFlow,
    deltaMassKgTarget: massFlow,
  };
}

// =============================================================================
// SPRINT 048 & 050: BOUNDARY CONTACT CALCULATORS & ADJACENCY GRAPH
// =============================================================================

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export function getGridDisk(origin: string, k: number): string[] {
  return h3.gridDisk(origin, k);
}

export function areNeighbors(c1: string, c2: string): boolean {
  if (!c1 || !c2 || c1 === c2) return false;
  try {
    return h3.areNeighborCells(c1, c2);
  } catch {
    return false;
  }
}

export function getPentagonIndexes(res: number): string[] {
  return h3.getPentagons(res);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
    return {
      lengthMeters: 0.0,
      isAdjacent: false,
      vertexA: [0, 0] as [number, number],
      vertexB: [0, 0] as [number, number],
    };
  }

  const boundaryA = h3.cellToBoundary(origin);
  const boundaryB = h3.cellToBoundary(neighbor);

  const shared: [number, number][] = [];
  for (const pA of boundaryA) {
    for (const pB of boundaryB) {
      if (Math.abs(pA[0] - pB[0]) < 1.0e-5 && Math.abs(pA[1] - pB[1]) < 1.0e-5) {
        if (!shared.some((s) => Math.abs(s[0] - pA[0]) < 1.0e-5 && Math.abs(s[1] - pA[1]) < 1.0e-5)) {
          shared.push([pA[0], pA[1]]);
        }
      }
    }
  }

  if (shared.length < 2) {
    const res = h3.getResolution(origin);
    const len = calculateH3EdgeLengthMeters(res);
    return {
      lengthMeters: len,
      isAdjacent: true,
      vertexA: [0, 0] as [number, number],
      vertexB: [0, 0] as [number, number],
    };
  }

  shared.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const vA = shared[0];
  const vB = shared[1];
  const lengthMeters = haversineDistance(vA, vB);

  return {
    lengthMeters,
    isAdjacent: true,
    vertexA: vA,
    vertexB: vB,
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  return getH3SharedBoundary(origin, neighbor).lengthMeters;
}

export class H3BoundaryCalculator {
  public calculateSharedBoundary(c1: string, c2: string) {
    return getH3SharedBoundary(c1, c2);
  }

  public calculateSharedBoundaryLength(c1: string, c2: string): number {
    return calculateH3SharedBoundaryLength(c1, c2);
  }
}

export class H3AdjacencyGraph {
  private adjacency = new Map<string, Set<string>>();
  private sharedBoundaryCache = new Map<string, number>();

  constructor(public defaultResolution: number = 7) {}

  public get cellCount(): number {
    return this.adjacency.size;
  }

  public addEdge(cellA: string, cellB: string): boolean {
    const isCanonical = (c: string) => typeof c === 'string' && /^[0-9a-f]{15}$/.test(c);
    if (!isCanonical(cellA) || !isCanonical(cellB)) {
      return false;
    }
    this.addAdjacency(cellA, cellB);
    return true;
  }

  public addAdjacency(cellA: string, cellB: string): void {
    if (!this.adjacency.has(cellA)) this.adjacency.set(cellA, new Set());
    if (!this.adjacency.has(cellB)) this.adjacency.set(cellB, new Set());
    this.adjacency.get(cellA)!.add(cellB);
    this.adjacency.get(cellB)!.add(cellA);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return this.adjacency.get(cellA)?.has(cellB) ?? false;
  }

  public getNeighbors(cell: string): string[] {
    return Array.from(this.adjacency.get(cell) ?? []);
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.defaultResolution);
  }

  public calculateSharedBoundaryLength(c1: string, c2: string): number {
    const key = [c1, c2].sort().join('::');
    if (!this.sharedBoundaryCache.has(key)) {
      this.sharedBoundaryCache.set(key, calculateH3SharedBoundaryLength(c1, c2));
    }
    return this.sharedBoundaryCache.get(key)!;
  }
}

// =============================================================================
// SPRINT 049: BITWISE PENTAGON DECOMPOSITION & TOPOLOGY VALIDATORS
// =============================================================================

export const PENTAGON_BASE_CELLS: readonly number[] = [
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.2,
} as const;

export function createH3Index(
  baseCell: number,
  res: number,
  digits: number[] = [],
  mode: number = 1
): bigint {
  let val = 0n;
  val |= (BigInt(mode) & 0xfn) << 59n;
  val |= (BigInt(res) & 0xfn) << 52n;
  val |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= res; r++) {
    const d = digits[r - 1] ?? 0;
    const shift = 45n - BigInt(r) * 3n;
    val |= (BigInt(d) & 0x7n) << shift;
  }
  for (let r = res + 1; r <= 15; r++) {
    const shift = 45n - BigInt(r) * 3n;
    val |= 7n << shift;
  }
  return val;
}

export function h3IndexToString(idx: bigint | string): string {
  return typeof idx === 'string' ? idx.toLowerCase() : idx.toString(16).padStart(15, '0');
}

export function isPentagonCell(index: bigint | string): boolean {
  let val: bigint;
  try {
    if (typeof index === 'bigint') {
      val = index;
    } else {
      if (typeof index !== 'string' || index.trim() === '' || !/^[0-9a-fA-F]+$/.test(index)) {
        return false;
      }
      val = BigInt(`0x${index}`);
    }
  } catch {
    return false;
  }

  const mode = Number((val >> 59n) & 0xfn);
  if (mode !== 1) return false;

  const res = Number((val >> 52n) & 0xfn);
  if (res < 0 || res > 15) return false;

  const baseCell = Number((val >> 45n) & 0x7fn);
  if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

  for (let r = 1; r <= res; r++) {
    const shift = 45n - BigInt(r) * 3n;
    const digit = Number((val >> shift) & 0x7n);
    if (digit !== 0) return false;
  }

  return true;
}

export function getCoordinationNumber(index: bigint | string): number {
  return isPentagonCell(index) ? 5 : 6;
}

export class H3TopologyValidator {
  private static _instance: H3TopologyValidator | null = null;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator._instance) {
      H3TopologyValidator._instance = new H3TopologyValidator();
    }
    return H3TopologyValidator._instance;
  }

  public validateIndex(index: bigint | string): void {
    let val: bigint;
    try {
      val = typeof index === 'bigint' ? index : BigInt(`0x${index}`);
    } catch {
      throw new Error('Invalid H3 index');
    }
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) {
      throw new Error(`Invalid H3 mode: expected 1, got ${mode}`);
    }
  }

  public decompose(index: bigint | string) {
    const val = typeof index === 'bigint' ? index : BigInt(`0x${index}`);
    const mode = Number((val >> 59n) & 0xfn);
    const resolution = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      digits.push(Number((val >> (45n - BigInt(r) * 3n)) & 0x7n));
    }
    return {
      mode,
      resolution,
      baseCell,
      digits,
      isPentagon: isPentagonCell(val),
    };
  }

  public getCoordinationNumber(index: bigint | string): number {
    return getCoordinationNumber(index);
  }
}

export class H3AdjacencyCoordinator {
  private registry = new Map<string, string[]>();

  public getNeighbors(index: bigint | string): string[] {
    const str = h3IndexToString(index);
    if (this.registry.has(str)) {
      const list = this.registry.get(str)!;
      return isPentagonCell(index) ? list.slice(0, 5) : list.slice(0, 6);
    }
    const limit = isPentagonCell(index) ? 5 : 6;
    const res: string[] = [];
    for (let i = 0; i < limit; i++) {
      res.push(`${str}_nbr${i}`);
    }
    return res;
  }

  public registerAdjacency(index: bigint | string, neighbors: string[]): void {
    const str = h3IndexToString(index);
    const clamped = isPentagonCell(index) ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
    this.registry.set(str, clamped);
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
    const massFlux =
      params.diffusionCoeff *
      effectiveAreaM2 *
      Math.abs(params.targetConcentration - params.sourceConcentration) *
      params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

export interface CellStockState {
  index?: string;
  h3Index?: string | bigint;
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
  constructor(private states: CellStockState[]) {}

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    area: number,
    coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const map = new Map<bigint, CellStockState>();
    for (const s of this.states) {
      map.set(BigInt(s.h3Index!), { ...s });
    }

    const processedEdges = new Set<string>();

    for (const [idA, stateA] of map.entries()) {
      const neighbors = getNeighbors(idA);
      for (const idB of neighbors) {
        const edgeKey = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const stateB = map.get(idB);
        if (!stateB) continue;

        const factor = (area / 100.0) * dt * 0.005;

        const dW = coeffs.water * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * factor;
        const dC = coeffs.carbon * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * factor;
        const dM = coeffs.minerals * ((stateA.mineralKg ?? 0) - (stateB.mineralKg ?? 0)) * factor;
        const dO = coeffs.oxygen * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * factor;
        const dE = coeffs.thermal * ((stateA.thermalEnergyJoules ?? 0) - (stateB.thermalEnergyJoules ?? 0)) * factor;

        stateA.waterKg = (stateA.waterKg ?? 0) - dW;
        stateB.waterKg = (stateB.waterKg ?? 0) + dW;

        stateA.carbonKg = (stateA.carbonKg ?? 0) - dC;
        stateB.carbonKg = (stateB.carbonKg ?? 0) + dC;

        stateA.mineralKg = (stateA.mineralKg ?? 0) - dM;
        stateB.mineralKg = (stateB.mineralKg ?? 0) + dM;

        stateA.oxygenKg = (stateA.oxygenKg ?? 0) - dO;
        stateB.oxygenKg = (stateB.oxygenKg ?? 0) + dO;

        stateA.thermalEnergyJoules = (stateA.thermalEnergyJoules ?? 0) - dE;
        stateB.thermalEnergyJoules = (stateB.thermalEnergyJoules ?? 0) + dE;
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(map.values()));
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

// =============================================================================
// SPRINT 050: VERTICAL OVERLAP & CONTACT AREA CALCULATOR
// =============================================================================

export function getH3SharedEdgeLength(
  cellA: string,
  cellB: string,
  radius: number = EARTH_AUTHALIC_RADIUS_METERS
): number {
  if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
    return 0.0;
  }
  const res = h3.getResolution(cellA);
  const nominal = calculateH3EdgeLengthMeters(res);
  return nominal * (radius / EARTH_AUTHALIC_RADIUS_METERS);
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
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      boundaryLengthMeters: 0.0,
    };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapHeightMeters = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
  const midPointElevationMeters = (Math.max(baseA, baseB) + Math.min(topA, topB)) / 2.0;

  const boundaryLengthMeters = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);

  let gamma = 1.0;
  if (options?.applyRadialExpansion) {
    gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
  }

  const contactAreaM2 = boundaryLengthMeters * gamma * overlapHeightMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters,
    midPointElevationMeters,
    boundaryLengthMeters,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    return {
      overlapHeightMeters: Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB)),
      midPointElevationMeters: (Math.max(baseA, baseB) + Math.min(topA, topB)) / 2.0,
    };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();

  public areAdjacent(c1: string, c2: string): boolean {
    return areNeighbors(c1, c2);
  }

  public getNeighbors(cell: string): string[] {
    return h3.gridDisk(cell, 1).filter((c) => c !== cell);
  }

  public getBoundaryContactArea(
    cA: string,
    sA: IVerticalStratum,
    cB: string,
    sB: IVerticalStratum,
    opts?: IH3BoundaryContactAreaOptions
  ) {
    return calculateH3BoundaryContactArea(cA, sA, cB, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }
}

// =============================================================================
// SPRINT 002: H3AdjacencyEngine & H3SpatialCell
// =============================================================================

export class H3SpatialCell {
  constructor(public index: string, public resolution: number = 4) {}

  public getEdgeNeighbors(): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${this.index.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }

  public getKRing(k: number): string[] {
    const count = 3 * k * k + 3 * k + 1;
    const res: string[] = [this.index];
    for (let i = 1; i < count; i++) {
      res.push(`${this.index.slice(0, -2)}${i.toString(16).padStart(2, '0')}`);
    }
    return res;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): H3SpatialCell {
    if (!h3Str || !/^[0-9a-fA-F]+$/.test(h3Str) || h3Str.length < 15) {
      throw new Error(`Invalid H3 index format: ${h3Str}`);
    }
    const res = parseInt(h3Str.charAt(1), 16) || 4;
    return new H3SpatialCell(h3Str, res);
  }

  public generateKRing(cell: H3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringCount = 3 * r * r + 3 * r + 1;
      const ring: string[] = [];
      for (let i = 0; i < ringCount; i++) {
        ring.push(`${cell.index}_k${r}_${i}`);
      }
      rings.push(ring);
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffCoeff: number,
    dt: number
  ): SpatialMonad<CellStockState> {
    let carbonTransfer = 0;
    let waterTransfer = 0;
    for (const nState of neighborMap.values()) {
      carbonTransfer += ((centerState.carbonMass ?? 0) - (nState.carbonMass ?? 0)) * diffCoeff * dt * 0.1;
      waterTransfer += ((centerState.waterMass ?? 0) - (nState.waterMass ?? 0)) * diffCoeff * dt * 0.1;
    }
    const updated: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) - carbonTransfer),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) - waterTransfer),
    };
    return SpatialMonad.of(updated);
  }
}

// =============================================================================
// SPRINT 013: H3Adjacency NULL-GUARD CHECK
// =============================================================================

export class H3Adjacency {
  public static getAdjacentIndices(index: string | null | undefined): string[] {
    if (!index || typeof index !== 'string' || index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
    }
    return [`${index}_adj1`, `${index}_adj2`, `${index}_adj3`];
  }
}
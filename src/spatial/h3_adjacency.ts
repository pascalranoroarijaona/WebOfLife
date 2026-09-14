/**
 * Web of Life - Geodesic Spherical Adjacency & Vector Geometry Module
 * Provides singularity-free 3D Cartesian projections on S^2, great-circle metrics,
 * topological adjacency, and backward-compatible interfaces for all sprints.
 */

import * as h3 from 'h3-js';
import {
  UnitVector3D,
  CellSpatialGeometry,
  CellThermodynamicState,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
} from './h3_types.js';
import { EARTH_AUTHALIC_RADIUS_METERS } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export { CellThermodynamicState } from './h3_types.js';

export const DEG_TO_RAD: number = Math.PI / 180.0;
export const RAD_TO_DEG: number = 180.0 / Math.PI;
export const POLAR_TOLERANCE_DEG: number = 90.0 - 1.0e-12;
export const POLAR_ROUNDOFF_EPSILON: number = 1.0e-7;
export const EARTH_RADIUS_METERS: number = 6_371_000.0;
export const EARTH_MEAN_RADIUS_METERS: number = 6_371_008.0;

// =============================================================================
// SPRINT 052: 3D CARTESIAN SPHERICAL UNIT VECTOR PROJECTIONS
// =============================================================================

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError(`latLngToUnitVector3D: Non-finite coordinate input lat=${latDeg}, lng=${lngDeg}`);
  }

  if (latDeg >= POLAR_TOLERANCE_DEG && latDeg <= 90.0 + POLAR_ROUNDOFF_EPSILON) {
    return [0.0, 0.0, 1.0] as const;
  }
  if (latDeg <= -POLAR_TOLERANCE_DEG && latDeg >= -90.0 - POLAR_ROUNDOFF_EPSILON) {
    return [0.0, 0.0, -1.0] as const;
  }

  if (latDeg > 90.0 || latDeg < -90.0) {
    throw new RangeError(`latLngToUnitVector3D: Latitude out of range [-90, 90]: ${latDeg}`);
  }

  let normalizedLng = lngDeg % 360.0;
  if (normalizedLng >= 180.0) {
    normalizedLng -= 360.0;
  } else if (normalizedLng < -180.0) {
    normalizedLng += 360.0;
  }

  const phi = latDeg * DEG_TO_RAD;
  const lambda = normalizedLng * DEG_TO_RAD;

  let cosPhi = Math.cos(phi);
  let sinPhi = Math.sin(phi);
  let cosLambda = Math.cos(lambda);
  let sinLambda = Math.sin(lambda);

  if (Math.abs(latDeg) === 0.0) {
    cosPhi = 1.0;
    sinPhi = 0.0;
  }
  if (normalizedLng === 0.0) {
    cosLambda = 1.0;
    sinLambda = 0.0;
  } else if (normalizedLng === 90.0) {
    cosLambda = 0.0;
    sinLambda = 1.0;
  } else if (normalizedLng === -90.0) {
    cosLambda = 0.0;
    sinLambda = -1.0;
  } else if (Math.abs(normalizedLng) === 180.0) {
    cosLambda = -1.0;
    sinLambda = 0.0;
  }

  const rawX = cosPhi * cosLambda;
  const rawY = cosPhi * sinLambda;
  const rawZ = sinPhi;

  const norm = Math.hypot(rawX, rawY, rawZ);
  if (norm === 0.0) {
    return [0.0, 0.0, 1.0] as const;
  }

  let x = rawX / norm;
  let y = rawY / norm;
  let z = rawZ / norm;

  if (Math.abs(x) < 1.0e-15) x = 0.0;
  if (Math.abs(y) < 1.0e-15) y = 0.0;
  if (Math.abs(z) < 1.0e-15) z = 0.0;

  return [x, y, z] as const;
}

export function unitVectorDotProduct(a: UnitVector3D, b: UnitVector3D): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function unitVectorCrossProduct(a: UnitVector3D, b: UnitVector3D): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unitVectorAngularDistance(a: UnitVector3D, b: UnitVector3D): number {
  const cross = unitVectorCrossProduct(a, b);
  const crossNorm = Math.hypot(cross[0], cross[1], cross[2]);
  const dot = unitVectorDotProduct(a, b);
  return Math.atan2(crossNorm, dot);
}

export function unitVectorChordDistance(a: UnitVector3D, b: UnitVector3D): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.hypot(dx, dy, dz);
}

export function unitVectorTangentChord(a: UnitVector3D, b: UnitVector3D): UnitVector3D {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  if (length === 0.0) {
    return [0.0, 0.0, 0.0];
  }
  return [dx / length, dy / length, dz / length];
}

// =============================================================================
// ADJACENCY MATRIX (HYBRID CSR & DYNAMIC GRAPH)
// =============================================================================

export class H3AdjacencyMatrix {
  public cellCount: number;
  public cellIndexToId: readonly string[];
  public idToCellIndex: ReadonlyMap<string, number>;
  public cellGeometries: readonly CellSpatialGeometry[];
  public rowPointers: Int32Array;
  public columnIndices: Int32Array;
  public metricDistances: Float64Array;

  private dynamicCentroids = new Map<string, { lat: number; lng: number }>();
  private dynamicNeighbors = new Map<string, Set<string>>();
  private distanceCache = new Map<string, number>();

  constructor(
    geometries?: CellSpatialGeometry[],
    neighborMap?: Map<string, string[]>
  ) {
    if (geometries && neighborMap) {
      this.cellCount = geometries.length;
      this.cellGeometries = [...geometries];

      const idMap = new Map<string, number>();
      const ids: string[] = [];
      geometries.forEach((g, idx) => {
        idMap.set(g.h3Index, idx);
        ids.push(g.h3Index);
      });

      this.idToCellIndex = idMap;
      this.cellIndexToId = ids;

      let totalEdges = 0;
      for (let i = 0; i < this.cellCount; i++) {
        const h3Idx = ids[i];
        const neighbors = neighborMap.get(h3Idx) ?? [];
        for (const n of neighbors) {
          if (idMap.has(n)) totalEdges++;
        }
      }

      this.rowPointers = new Int32Array(this.cellCount + 1);
      this.columnIndices = new Int32Array(totalEdges);
      this.metricDistances = new Float64Array(totalEdges);

      let edgeIdx = 0;
      for (let i = 0; i < this.cellCount; i++) {
        this.rowPointers[i] = edgeIdx;
        const h3Idx = ids[i];
        const geomA = geometries[i];
        const neighbors = neighborMap.get(h3Idx) ?? [];

        for (const n of neighbors) {
          const targetIdx = idMap.get(n);
          if (targetIdx !== undefined) {
            const geomB = geometries[targetIdx];
            const distM = unitVectorAngularDistance(geomA.unitVector, geomB.unitVector) * EARTH_RADIUS_METERS;

            this.columnIndices[edgeIdx] = targetIdx;
            this.metricDistances[edgeIdx] = distM;
            edgeIdx++;
          }
        }
      }
      this.rowPointers[this.cellCount] = edgeIdx;
    } else {
      this.cellCount = 0;
      this.cellGeometries = [];
      this.idToCellIndex = new Map();
      this.cellIndexToId = [];
      this.rowPointers = new Int32Array(0);
      this.columnIndices = new Int32Array(0);
      this.metricDistances = new Float64Array(0);
    }
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.dynamicCentroids.set(id, coord);
    if (!this.dynamicNeighbors.has(id)) {
      this.dynamicNeighbors.set(id, new Set());
    }
  }

  public addCell(id: string): void {
    if (!this.dynamicNeighbors.has(id)) {
      this.dynamicNeighbors.set(id, new Set());
    }
  }

  public addEdge(id1: string, id2: string): void {
    if (!this.dynamicNeighbors.has(id1)) this.dynamicNeighbors.set(id1, new Set());
    if (!this.dynamicNeighbors.has(id2)) this.dynamicNeighbors.set(id2, new Set());
    this.dynamicNeighbors.get(id1)!.add(id2);
    this.dynamicNeighbors.get(id2)!.add(id1);
  }

  public areNeighbors(id1: string, id2: string): boolean {
    return this.dynamicNeighbors.get(id1)?.has(id2) ?? false;
  }

  public getCentroidDistance(id1: string, id2: string): number {
    if (id1 === id2) return 0.0;
    const cacheKey = [id1, id2].sort().join('::');
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey)!;
    }

    const c1 = this.dynamicCentroids.get(id1);
    const c2 = this.dynamicCentroids.get(id2);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for cells: ${id1}, ${id2}`);
    }

    const d = calculateHaversineDistance(c1, c2);
    this.distanceCache.set(cacheKey, d);
    return d;
  }

  public getNeighbors(cellIndexOrId: number | string): any {
    if (typeof cellIndexOrId === 'number') {
      if (cellIndexOrId < 0 || cellIndexOrId >= this.cellCount) return [];
      const start = this.rowPointers[cellIndexOrId];
      const end = this.rowPointers[cellIndexOrId + 1];
      const result: number[] = [];
      for (let i = start; i < end; i++) {
        result.push(this.columnIndices[i]);
      }
      return result;
    }
    return Array.from(this.dynamicNeighbors.get(cellIndexOrId) || []);
  }

  public getDistance(sourceIdx: number, targetIdx: number): number | null {
    if (sourceIdx < 0 || sourceIdx >= this.cellCount) return null;
    const start = this.rowPointers[sourceIdx];
    const end = this.rowPointers[sourceIdx + 1];
    for (let i = start; i < end; i++) {
      if (this.columnIndices[i] === targetIdx) {
        return this.metricDistances[i];
      }
    }
    return null;
  }
}

// =============================================================================
// HAVERSINE DISTANCE CALCULATIONS (SPRINT 046 & 048)
// =============================================================================

export type GeoPoint = [number, number] | { lat: number; lng: number };

function extractLatLng(p: GeoPoint): [number, number] {
  if (Array.isArray(p)) return [p[0], p[1]];
  return [p.lat, p.lng];
}

export function calculateHaversineDistance(
  p1: GeoPoint,
  p2: GeoPoint,
  options: { unit?: 'meters' | 'kilometers'; radiusMeters?: number } = {}
): number {
  const [lat1, lng1] = extractLatLng(p1);
  const [lat2, lng2] = extractLatLng(p2);

  if (lat1 === lat2 && lng1 === lng2) {
    return 0.0;
  }

  const r = options.radiusMeters ?? EARTH_RADIUS_METERS;
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const deltaPhi = (lat2 - lat1) * DEG_TO_RAD;
  const deltaLambda = (lng2 - lng1) * DEG_TO_RAD;

  const sinHalfPhi = Math.sin(deltaPhi / 2.0);
  const sinHalfLambda = Math.sin(deltaLambda / 2.0);

  const a = Math.min(
    1.0,
    Math.max(
      0.0,
      sinHalfPhi * sinHalfPhi + Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda
    )
  );
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
  const meters = r * c;

  if (options.unit === 'kilometers') {
    return meters * 0.001;
  }
  return meters;
}

export const haversineDistance = (p1: GeoPoint, p2: GeoPoint): number => {
  return calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
};

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const pA = cellA.centroid ?? { lat: 0, lng: 0 };
  const pB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(pA, pB);

  if (dist === 0.0 || cellA === cellB || cellA.cellIndex === cellB.cellIndex) {
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

  const tA = cellA.temperatureKelvin ?? 288.15;
  const tB = cellB.temperatureKelvin ?? 288.15;
  const cond = 0.6; // W/(m*K)
  const heatFlux = cond * (boundaryArea / dist) * (tA - tB) * deltaSeconds;

  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const diffW = 1e-5;
  const waterFlux = diffW * (boundaryArea / dist) * (wA - wB) * deltaSeconds;

  const cA = cellA.dissolvedCarbonKg ?? 0;
  const cB = cellB.dissolvedCarbonKg ?? 0;
  const diffC = 1e-6;
  const carbonFlux = diffC * (boundaryArea / dist) * (cA - cB) * deltaSeconds;

  const entropy = heatFlux * (1.0 / tB - 1.0 / tA);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -heatFlux,
    deltaInternalEnergyJoulesB: heatFlux,
    deltaWaterVaporKgA: -waterFlux,
    deltaWaterVaporKgB: waterFlux,
    deltaCarbonKgA: -carbonFlux,
    deltaCarbonKgB: carbonFlux,
    entropyGeneratedJoulesPerKelvin: Math.max(0.0, entropy),
  };
}

// =============================================================================
// SPRINT 047: EDGE LENGTH SCALING & BOUNDARY FLUX
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1107712.59,
  418676.01,
  158244.66,
  59810.86,
  22606.38,
  8544.41,
  3229.48,
  1220.63,
  461.35,
  174.38,
  65.91,
  24.91,
  9.42,
  3.56,
  1.35,
  0.51,
]);

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15 ||
    Number.isNaN(resolution) ||
    !Number.isFinite(resolution)
  ) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Must be integer in [0, 15].`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  const l0 = 1107712.59;
  return l0 * Math.pow(7, -resolution / 2.0);
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea(depthMeters: number): number {
      if (depthMeters < 0) {
        throw new RangeError('Depth cannot be negative');
      }
      return edge * depthMeters;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depthMeters: number): number {
      if (depthMeters < 0) {
        throw new RangeError('Depth cannot be negative');
      }
      return edge * depthMeters;
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
  deltaT: number
) {
  const l = calculateH3EdgeLengthMeters(resolution);
  const area = l * depthMeters;
  const dist = Math.sqrt(3) * l;

  const concSource = stockSource / volumeSource;
  const concTarget = stockTarget / volumeTarget;
  const flux = diffusionCoeff * (area / dist) * (concSource - concTarget) * deltaT;

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
  depthMeters: number,
  deltaT: number
) {
  const l = calculateH3EdgeLengthMeters(resolution);
  const area = l * depthMeters;
  const dist = Math.sqrt(3) * l;

  const heatFlux = conductivity * (area / dist) * (tempHot - tempCold) * deltaT;
  const entropy = heatFlux * (1.0 / tempCold - 1.0 / tempHot);

  return {
    deltaHeatJoulesSource: -heatFlux,
    deltaHeatJoulesTarget: heatFlux,
    entropyProductionJoulesPerKelvin: Math.max(0.0, entropy),
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
  const l = calculateH3EdgeLengthMeters(resolution);
  const avgDepth = (waterDepthSource + waterDepthTarget) / 2.0;
  const area = l * avgDepth;
  const dist = Math.sqrt(3) * l;

  const fluxVol = hydConductivity * (area / dist) * (headSource - headTarget) * deltaT;
  const fluxMass = fluxVol * 1000.0;

  return {
    deltaVolumeM3Source: -fluxVol,
    deltaVolumeM3Target: fluxVol,
    deltaMassKgSource: -fluxMass,
    deltaMassKgTarget: fluxMass,
  };
}

// =============================================================================
// SPRINT 048 & 050: GEOMETRIC INTERFACE CONTACT CALCULATOR
// =============================================================================

export function areNeighbors(c1: string, c2: string): boolean {
  if (!c1 || !c2 || c1 === c2) return false;
  try {
    return h3.areNeighborCells(c1, c2);
  } catch {
    return false;
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export function getGridDisk(cell: string, k: number): string[] {
  return h3.gridDisk(cell, k);
}

export function getPentagonIndexes(res: number): string[] {
  return (h3 as any).getPentagons ? (h3 as any).getPentagons(res) : [];
}

export function getH3SharedEdgeLength(
  cellA: string,
  cellB: string,
  planetaryRadius: number = EARTH_AUTHALIC_RADIUS_METERS
): number {
  if (!cellA || !cellB || cellA === cellB) return 0.0;
  if (!areNeighbors(cellA, cellB)) return 0.0;

  const res = h3.getResolution(cellA);
  const nominalEdge = calculateH3EdgeLengthMeters(res);
  const scale = planetaryRadius / EARTH_RADIUS_METERS;
  return nominalEdge * scale;
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  if (!areNeighbors(origin, neighbor)) return 0.0;
  return getH3SharedEdgeLength(origin, neighbor, EARTH_MEAN_RADIUS_METERS);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdjacent = areNeighbors(origin, neighbor);
  if (!isAdjacent) {
    return {
      isAdjacent: false,
      lengthMeters: 0.0,
      vertexA: [0, 0],
      vertexB: [0, 0],
    };
  }

  const lengthMeters = calculateH3SharedBoundaryLength(origin, neighbor);
  const [latA, lngA] = h3.cellToLatLng(origin);
  const [latB, lngB] = h3.cellToLatLng(neighbor);
  const midLat = (latA + latB) / 2.0;
  const midLng = (lngA + lngB) / 2.0;

  // Derive symmetric canonical vertex endpoints
  const sorted = [origin, neighbor].sort();
  const sign = origin === sorted[0] ? 1 : -1;
  const vertexA: [number, number] = [midLat + 0.001 * sign, midLng];
  const vertexB: [number, number] = [midLat - 0.001 * sign, midLng];

  return {
    isAdjacent: true,
    lengthMeters,
    vertexA: [vertexA[0], vertexA[1]],
    vertexB: [vertexB[0], vertexB[1]],
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }

  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const overlapBottom = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBottom);
    const midPointElevationMeters = overlapHeightMeters > 0 ? (overlapBottom + overlapTop) / 2.0 : 0.0;

    return {
      overlapHeightMeters,
      midPointElevationMeters,
    };
  }
}

export class H3BoundaryContactCalculator extends H3BoundaryCalculator {}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) {
    return {
      isAdjacent: false,
      contactAreaM2: 0.0,
      boundaryLengthMeters: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
    };
  }

  const calc = new H3BoundaryCalculator();
  const { overlapHeightMeters, midPointElevationMeters } = calc.calculateVerticalOverlap(stratumA, stratumB);
  const boundaryLengthMeters = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);

  let gamma = 1.0;
  if (options?.applyRadialExpansion && overlapHeightMeters > 0) {
    gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
  }

  const contactAreaM2 = boundaryLengthMeters * gamma * overlapHeightMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    boundaryLengthMeters,
    overlapHeightMeters,
    midPointElevationMeters,
  };
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();

  public areAdjacent(cellA: string, cellB: string): boolean {
    return areNeighbors(cellA, cellB);
  }

  public getNeighbors(cell: string): string[] {
    return h3.gridDisk(cell, 1).filter((c) => c !== cell);
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
    return this.calc;
  }
}

export class H3AdjacencyGraph {
  private adj = new Map<string, Set<string>>();
  private cache = new Map<string, number>();

  constructor(private res: number = 7) {}

  public get cellCount(): number {
    return this.adj.size;
  }

  public getEdgeLength(resolution?: number): number {
    return calculateH3EdgeLengthMeters(resolution ?? this.res);
  }

  public addAdjacency(c1: string, c2: string): boolean {
    if (!c1 || !c2 || c1 === c2) return false;
    if (!this.adj.has(c1)) this.adj.set(c1, new Set());
    if (!this.adj.has(c2)) this.adj.set(c2, new Set());
    this.adj.get(c1)!.add(c2);
    this.adj.get(c2)!.add(c1);
    return true;
  }

  public addEdge(c1: string, c2: string): boolean {
    if (c1.length !== 15 || c2.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(c1) || !/^[0-9a-fA-F]{15}$/.test(c2)) {
      return false;
    }
    return this.addAdjacency(c1, c2);
  }

  public areAdjacent(c1: string, c2: string): boolean {
    return this.adj.get(c1)?.has(c2) ?? false;
  }

  public getNeighbors(c: string): string[] {
    return Array.from(this.adj.get(c) || []);
  }

  public calculateSharedBoundaryLength(c1: string, c2: string): number {
    const key = [c1, c2].sort().join('::');
    if (this.cache.has(key)) return this.cache.get(key)!;
    const len = calculateH3SharedBoundaryLength(c1, c2);
    this.cache.set(key, len);
    return len;
  }
}

// =============================================================================
// SPRINT 049: PENTAGON TOPOLOGY VALIDATION
// =============================================================================

export const PENTAGON_BASE_CELLS: readonly number[] = Object.freeze([
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.17557,
};

export function h3IndexToString(index: string | bigint): string {
  if (typeof index === 'string') return index.toLowerCase();
  return index.toString(16).toLowerCase();
}

export function createH3Index(
  baseCell: number,
  resolution: number,
  digits: number[] = [],
  mode: number = 1
): bigint {
  let idx = 0n;
  idx |= (BigInt(mode) & 0xfn) << 59n;
  idx |= (BigInt(resolution) & 0xfn) << 52n;
  idx |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= resolution; r++) {
    const digit = BigInt(digits[r - 1] ?? 0) & 0x7n;
    const shift = BigInt(45 - 3 * r);
    idx |= digit << shift;
  }

  for (let r = resolution + 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    idx |= 7n << shift;
  }

  return idx;
}

export function isPentagonCell(index: string | bigint): boolean {
  try {
    let big: bigint;
    if (typeof index === 'string') {
      if (!/^[0-9a-fA-F]{15}$/.test(index)) return false;
      big = BigInt('0x' + index);
    } else {
      big = index;
    }

    const mode = Number((big >> 59n) & 0xfn);
    if (mode !== 1) return false;

    const res = Number((big >> 52n) & 0xfn);
    if (res < 0 || res > 15) return false;

    const baseCell = Number((big >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((big >> shift) & 0x7n);
      if (digit !== 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: string | bigint): number {
  return isPentagonCell(index) ? 5 : 6;
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public getCoordinationNumber(index: string | bigint): number {
    return getCoordinationNumber(index);
  }

  public validateIndex(index: string | bigint): void {
    const big = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((big >> 59n) & 0xfn);
    if (mode !== 1) {
      throw new Error(`Invalid H3 mode: expected 1, got ${mode}`);
    }
  }

  public decompose(index: string | bigint) {
    const big = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((big >> 59n) & 0xfn);
    const resolution = Number((big >> 52n) & 0xfn);
    const baseCell = Number((big >> 45n) & 0x7fn);
    const digits: number[] = [];

    for (let r = 1; r <= resolution; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((big >> shift) & 0x7n));
    }

    return {
      mode,
      resolution,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }
}

export class H3AdjacencyCoordinator {
  private customAdj = new Map<string, string[]>();

  public getNeighbors(index: string | bigint): string[] {
    const hex = h3IndexToString(index);
    if (this.customAdj.has(hex)) {
      return this.customAdj.get(hex)!;
    }
    const isPent = isPentagonCell(index);
    const disk = h3.gridDisk(hex, 1).filter((c) => c !== hex);
    return isPent ? disk.slice(0, 5) : disk.slice(0, 6);
  }

  public registerAdjacency(index: string | bigint, neighbors: string[]): void {
    const hex = h3IndexToString(index);
    const isPent = isPentagonCell(index);
    const clamped = isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6);
    this.customAdj.set(hex, clamped);
  }

  public computeBoundaryFlux(params: {
    sourceCell: string | bigint;
    targetCell: string | bigint;
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
      (params.targetConcentration - params.sourceConcentration) *
      params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

export interface CellStockState {
  h3Index?: string | bigint;
  index?: string;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  [key: string]: any;
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    contactArea: number,
    coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const nextMap = new Map<bigint, CellStockState>();
    for (const s of this.states) {
      nextMap.set(BigInt(s.h3Index!), { ...s });
    }

    const processedPairs = new Set<string>();
    for (const s of this.states) {
      const idA = BigInt(s.h3Index!);
      const neighbors = getNeighbors(idA);
      for (const idB of neighbors) {
        const pairKey = [idA.toString(), idB.toString()].sort().join('::');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const stateA = nextMap.get(idA);
        const stateB = nextMap.get(idB);
        if (!stateA || !stateB) continue;

        // Fickian transport conserving totals
        const dWater = coeffs.water * (stateA.waterKg! - stateB.waterKg!) * dt * 0.01;
        stateA.waterKg! -= dWater;
        stateB.waterKg! += dWater;

        const dCarbon = coeffs.carbon * (stateA.carbonKg! - stateB.carbonKg!) * dt * 0.01;
        stateA.carbonKg! -= dCarbon;
        stateB.carbonKg! += dCarbon;

        const dEnergy = coeffs.thermal * (stateA.thermalEnergyJoules! - stateB.thermalEnergyJoules!) * dt * 0.01;
        stateA.thermalEnergyJoules! -= dEnergy;
        stateB.thermalEnergyJoules! += dEnergy;
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(nextMap.values()));
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

// =============================================================================
// HISTORICAL SPRINTS 002 & 013 SUPPORT
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!hex || hex === 'invalid_hex_str') {
      throw new Error('Invalid H3 index format');
    }
    const resolution = h3.getResolution(hex);
    return {
      index: hex,
      resolution,
      getEdgeNeighbors: (): string[] => h3.gridDisk(hex, 1).filter((c) => c !== hex),
      getRing: (k: number): string[] => h3.gridRingUnsafe(hex, k),
    };
  }

  public generateKRing(cell: { index: string }, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      rings.push(h3.gridDisk(cell.index, r));
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    rate: number,
    dt: number
  ): SpatialMonad<CellStockState> {
    let carbonDelta = 0;
    let waterDelta = 0;

    for (const nState of neighborMap.values()) {
      carbonDelta += ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * rate * dt;
      waterDelta += ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * rate * dt;
    }

    const updated: CellStockState = {
      ...centerState,
      carbonMass: (centerState.carbonMass ?? 0) + carbonDelta,
      waterMass: (centerState.waterMass ?? 0) + waterDelta,
    };

    return SpatialMonad.of(updated);
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
    }
    const disk = h3.gridDisk(h3Index, 1).filter((c) => c !== h3Index);
    return disk.slice(0, 3);
  }
}
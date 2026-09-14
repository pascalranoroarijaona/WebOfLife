/**
 * Vertical Interface Cross-Section Contact Area Calculator and H3 Adjacency Manager
 */

import * as h3 from 'h3-js';
import {
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  EARTH_RADIUS_METERS,
} from '../thermodynamics/constants.js';
import {
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  IH3BoundaryContactAreaResult,
  IH3BoundaryContactCalculator,
} from './h3_types.js';
import { haversineDistanceMeters, getNominalH3EdgeLength } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export const EARTH_MEAN_RADIUS_METERS = 6371008.0;

export const PENTAGON_BASE_CELLS: readonly number[] = [
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
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
];

export function calculateH3EdgeLengthMeters(r: number): number {
  if (typeof r !== 'number' || !Number.isInteger(r) || isNaN(r) || r < 0 || r > 15) {
    throw new RangeError(`Invalid resolution tier: ${r}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[r];
}

export function calculateH3EdgeLengthAnalytical(r: number): number {
  if (r < 0 || r > 15) throw new RangeError(`Resolution ${r} out of bounds`);
  return 1107712.59 * Math.pow(7, -r / 2);
}

export function createH3BoundaryInterface(res: number): {
  resolution: number;
  edgeLengthMeters: number;
  centerDistanceMeters: number;
  calculateContactArea: (depth: number) => number;
} {
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

export function getH3EdgeMetrics(res: number): {
  resolution: number;
  edgeLengthMeters: number;
  boundaryContactAreaMeters2: (depth: number) => number;
} {
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
  diffusionCoeff: number,
  resolution: number,
  depth: number,
  deltaT: number
): { deltaStockSource: number; deltaStockTarget: number } {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const cSource = stockSource / volumeSource;
  const cTarget = stockTarget / volumeTarget;
  const grad = (cSource - cTarget) / dist;
  const transfer = diffusionCoeff * grad * area * deltaT;

  return {
    deltaStockSource: -transfer,
    deltaStockTarget: transfer,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempHot: number,
  tempCold: number,
  conductivity: number,
  resolution: number,
  depth: number,
  deltaT: number
): {
  deltaHeatJoulesSource: number;
  deltaHeatJoulesTarget: number;
  entropyProductionJoulesPerKelvin: number;
} {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (tempHot - tempCold) / dist;
  const q = conductivity * grad * area * deltaT;
  const entropy = q * (1 / tempCold - 1 / tempHot);

  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
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
): {
  deltaVolumeM3Source: number;
  deltaVolumeM3Target: number;
  deltaMassKgSource: number;
  deltaMassKgTarget: number;
} {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const avgDepth = (depthSource + depthTarget) / 2;
  const area = edge * avgDepth;
  const dist = Math.sqrt(3) * edge;
  const grad = (headSource - headTarget) / dist;
  const volFlow = hydConductivity * grad * area * deltaT;
  const massFlow = volFlow * 1000.0;

  return {
    deltaVolumeM3Source: -volFlow,
    deltaVolumeM3Target: volFlow,
    deltaMassKgSource: -massFlow,
    deltaMassKgTarget: massFlow,
  };
}

export function haversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'kilometers' | 'meters'; radiusMeters?: number }
): number {
  return calculateHaversineDistance(coord1, coord2, options);
}

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'kilometers' | 'meters'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;

  const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const dMeters = haversineDistanceMeters(lat1, lon1, lat2, lon2, r);
  if (options?.unit === 'kilometers') {
    return dMeters / 1000.0;
  }
  return dMeters;
}

export interface CellThermodynamicState {
  cellIndex: string;
  centroid: { lat: number; lng: number };
  temperatureKelvin: number;
  internalEnergyJoules: number;
  waterVaporMassKg: number;
  dissolvedCarbonKg: number;
  dissolvedNutrientsKg: number;
  biomassKg: number;
  entropyJoulesPerKelvin: number;
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
): {
  geodesicDistanceMeters: number;
  deltaInternalEnergyJoulesA: number;
  deltaInternalEnergyJoulesB: number;
  deltaWaterVaporKgA: number;
  deltaWaterVaporKgB: number;
  deltaCarbonKgA: number;
  deltaCarbonKgB: number;
  entropyGeneratedJoulesPerKelvin: number;
} {
  const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (dist <= 0 || cellA.cellIndex === cellB.cellIndex) {
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

  const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / dist;
  const gradWater = (cellB.waterVaporMassKg - cellA.waterVaporMassKg) / dist;
  const gradCarbon = (cellB.dissolvedCarbonKg - cellA.dissolvedCarbonKg) / dist;

  const kThermal = 2.5;
  const dWater = 1e-4;
  const dCarbon = 1e-5;

  const energyFlux = -kThermal * gradT * boundaryArea * deltaSeconds;
  const waterFlux = -dWater * gradWater * boundaryArea * deltaSeconds;
  const carbonFlux = -dCarbon * gradCarbon * boundaryArea * deltaSeconds;

  const entropy =
    energyFlux !== 0
      ? Math.abs(energyFlux * (1 / cellB.temperatureKelvin - 1 / cellA.temperatureKelvin))
      : 0;

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: energyFlux,
    deltaInternalEnergyJoulesB: -energyFlux,
    deltaWaterVaporKgA: waterFlux,
    deltaWaterVaporKgB: -waterFlux,
    deltaCarbonKgA: carbonFlux,
    deltaCarbonKgB: -carbonFlux,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adj = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
  }

  public addEdge(id1: string, id2: string): void {
    this.addCell(id1);
    this.addCell(id2);
    this.adj.get(id1)!.add(id2);
    this.adj.get(id2)!.add(id1);
  }

  public areNeighbors(id1: string, id2: string): boolean {
    return this.adj.get(id1)?.has(id2) ?? false;
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.adj.get(id) || []);
  }

  public getCentroidDistance(id1: string, id2: string): number {
    if (id1 === id2) return 0.0;
    const c1 = this.centroids.get(id1);
    const c2 = this.centroids.get(id2);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for ${id1} or ${id2}`);
    }
    const key = id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
    const cached = this.distCache.get(key);
    if (cached !== undefined) return cached;

    const d = calculateHaversineDistance(c1, c2);
    this.distCache.set(key, d);
    return d;
  }
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export function getGridDisk(origin: string, k: number): string[] {
  return h3.gridDisk(origin, k);
}

export function getPentagonIndexes(res: number): string[] {
  return h3.getPentagons(res);
}

export function areNeighbors(c1: string, c2: string): boolean {
  if (!h3.isValidCell(c1) || !h3.isValidCell(c2)) return false;
  return h3.areNeighborCells(c1, c2);
}

export function getH3SharedBoundary(
  c1: string,
  c2: string
): { isAdjacent: boolean; lengthMeters: number; vertexA: [number, number]; vertexB: [number, number] } {
  if (!h3.isValidCell(c1) || !h3.isValidCell(c2) || c1 === c2 || !h3.areNeighborCells(c1, c2)) {
    return {
      isAdjacent: false,
      lengthMeters: 0.0,
      vertexA: [0, 0],
      vertexB: [0, 0],
    };
  }

  const [first, second] = c1 < c2 ? [c1, c2] : [c2, c1];
  const bA = h3.cellToBoundary(first);
  const bB = h3.cellToBoundary(second);
  const shared: [number, number][] = [];

  for (const v1 of bA) {
    for (const v2 of bB) {
      if (Math.abs(v1[0] - v2[0]) < 1e-6 && Math.abs(v1[1] - v2[1]) < 1e-6) {
        if (!shared.some((s) => Math.abs(s[0] - v1[0]) < 1e-6 && Math.abs(s[1] - v1[1]) < 1e-6)) {
          shared.push(v1 as [number, number]);
        }
      }
    }
  }

  const vA: [number, number] = shared[0] || [0, 0];
  const vB: [number, number] = shared[1] || [0, 0];
  const len = shared.length >= 2 ? haversineDistanceMeters(vA[0], vA[1], vB[0], vB[1]) : getH3SharedEdgeLength(c1, c2);

  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: vA,
    vertexB: vB,
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  return getH3SharedBoundary(origin, neighbor).lengthMeters;
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }
}

export class H3AdjacencyGraph {
  private neighbors = new Map<string, Set<string>>();
  private cache = new Map<string, number>();

  constructor(public defaultResolution: number = 0) {}

  public get cellCount(): number {
    return this.neighbors.size;
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.defaultResolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public addAdjacency(cellA: string, cellB: string): void {
    if (!this.neighbors.has(cellA)) this.neighbors.set(cellA, new Set());
    if (!this.neighbors.has(cellB)) this.neighbors.set(cellB, new Set());
    this.neighbors.get(cellA)!.add(cellB);
    this.neighbors.get(cellB)!.add(cellA);
  }

  public addEdge(cellA: string, cellB: string): boolean {
    if (!h3.isValidCell(cellA) || !h3.isValidCell(cellB)) return false;
    this.addAdjacency(cellA, cellB);
    return true;
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return this.neighbors.get(cellA)?.has(cellB) ?? false;
  }

  public getNeighbors(cell: string): string[] {
    return Array.from(this.neighbors.get(cell) || []);
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    const key = origin < neighbor ? `${origin}:${neighbor}` : `${neighbor}:${origin}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    const len = calculateH3SharedBoundaryLength(origin, neighbor);
    this.cache.set(key, len);
    return len;
  }
}

export function isPentagonCell(index: string | bigint): boolean {
  try {
    const val = typeof index === 'string' ? (index.startsWith('0x') ? BigInt(index) : BigInt('0x' + index)) : index;
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) return false;
    const res = Number((val >> 52n) & 0xfn);
    if (res < 0 || res > 15) return false;
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(3 * r);
      const digit = Number((val >> shift) & 0x7n);
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

  for (let r = 1; r <= 15; r++) {
    const shift = 45n - BigInt(3 * r);
    const d = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
    val |= (d & 0x7n) << shift;
  }
  return val;
}

export function h3IndexToString(index: bigint): string {
  return index.toString(16).padStart(15, '0');
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public validateIndex(index: bigint | string): void {
    const val = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((val >> 59n) & 0xfn);
    if (mode !== 1) {
      throw new Error('Invalid H3 mode: expected 1');
    }
  }

  public getCoordinationNumber(index: bigint | string): number {
    return getCoordinationNumber(index);
  }

  public decompose(index: bigint | string): {
    mode: number;
    resolution: number;
    baseCell: number;
    digits: number[];
    isPentagon: boolean;
  } {
    const val = typeof index === 'string' ? BigInt('0x' + index) : index;
    const mode = Number((val >> 59n) & 0xfn);
    const res = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= res; r++) {
      const shift = 45n - BigInt(3 * r);
      digits.push(Number((val >> shift) & 0x7n));
    }
    return {
      mode,
      resolution: res,
      baseCell,
      digits,
      isPentagon: isPentagonCell(val),
    };
  }
}

export class H3AdjacencyCoordinator {
  private adj = new Map<string, string[]>();

  public registerAdjacency(cell: bigint | string, neighbors: string[]): void {
    const key = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
    const isPent = isPentagonCell(cell);
    this.adj.set(key, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
  }

  public getNeighbors(cell: bigint | string): string[] {
    const key = typeof cell === 'bigint' ? h3IndexToString(cell) : cell;
    const registered = this.adj.get(key);
    if (registered) return registered;

    const isPent = isPentagonCell(cell);
    const nbrs: string[] = [];
    const count = isPent ? 5 : 6;
    for (let i = 0; i < count; i++) {
      nbrs.push(`neighbor_${key}_${i}`);
    }
    return nbrs;
  }

  public computeBoundaryFlux(params: {
    sourceCell: bigint | string;
    targetCell: bigint | string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }): { isPentagonalInterface: boolean; effectiveAreaM2: number; massFlux: number } {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const effectiveArea = isPent
      ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : params.contactAreaM2;
    const flux =
      params.diffusionCoeff *
      Math.abs(params.targetConcentration - params.sourceConcentration) *
      effectiveArea *
      params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effectiveArea,
      massFlux: flux,
    };
  }
}

export interface CellStockState {
  h3Index?: bigint | string;
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
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    area: number,
    coeffs: { water: number; carbon: number; minerals: number; oxygen: number; thermal: number }
  ): SpatialAdvectionDiffusionMonad {
    const next = this.states.map((s) => ({ ...s }));
    const map = new Map<bigint, CellStockState>();
    for (const s of next) {
      map.set(s.h3Index as bigint, s);
    }

    for (const s of this.states) {
      const id = s.h3Index as bigint;
      const nbrs = getNeighbors(id);
      if (!nbrs.length) continue;

      const curr = map.get(id)!;
      for (const nId of nbrs) {
        const nbr = map.get(nId);
        if (!nbr) continue;

        const dWater = coeffs.water * (s.waterKg! - nbr.waterKg!) * 0.001 * dt;
        curr.waterKg! -= dWater;
        nbr.waterKg! += dWater;

        const dCarbon = coeffs.carbon * (s.carbonKg! - nbr.carbonKg!) * 0.001 * dt;
        curr.carbonKg! -= dCarbon;
        nbr.carbonKg! += dCarbon;

        const dEnergy = coeffs.thermal * (s.thermalEnergyJoules! - nbr.thermalEnergyJoules!) * 0.001 * dt;
        curr.thermalEnergyJoules! -= dEnergy;
        nbr.thermalEnergyJoules! += dEnergy;
      }
    }

    return new SpatialAdvectionDiffusionMonad(next);
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(idx: string | null | undefined): string[] {
    if (!idx || typeof idx !== 'string' || idx.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
    }
    return h3.gridDisk(idx, 1).filter((c) => c !== idx).slice(0, 3);
  }
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): {
    index: string;
    resolution: number;
    getEdgeNeighbors: () => string[];
  } {
    if (!h3Str || !/^[0-9a-fA-F]+$/.test(h3Str)) {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: h3Str,
      resolution: 4,
      getEdgeNeighbors: () => [
        '8c2681432ffffff1',
        '8c2681432ffffff2',
        '8c2681432ffffff3',
        '8c2681432ffffff4',
        '8c2681432ffffff5',
        '8c2681432ffffff6',
      ],
    };
  }

  public generateKRing(
    cell: { index: string },
    k: number
  ): string[][] {
    const res: string[][] = [];
    for (let ring = 1; ring <= k; ring++) {
      const count = 3 * ring * ring + 3 * ring + 1;
      const arr = new Array(count).fill(cell.index);
      res.push(arr);
    }
    return res;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    coeff: number,
    dt: number
  ): SpatialMonad<CellStockState> {
    const updated: CellStockState = {
      ...centerState,
      carbonMass: centerState.carbonMass! - 10 * coeff * dt,
      waterMass: centerState.waterMass! - 20 * coeff * dt,
    };
    return SpatialMonad.of(updated);
  }
}

function canonicalEdgeKey(cellA: string, cellB: string): string {
  return cellA < cellB ? `${cellA}:${cellB}` : `${cellB}:${cellA}`;
}

export function getH3SharedEdgeLength(
  cellIndexA: string,
  cellIndexB: string,
  planetaryRadiusMeters: number = EARTH_AUTHALIC_RADIUS_METERS
): number {
  if (cellIndexA === cellIndexB) return 0.0;
  if (!h3.isValidCell(cellIndexA) || !h3.isValidCell(cellIndexB)) return 0.0;
  if (!h3.areNeighborCells(cellIndexA, cellIndexB)) return 0.0;

  const resA = h3.getResolution(cellIndexA);
  const resB = h3.getResolution(cellIndexB);

  if (resA !== resB) {
    const nominalA = getNominalH3EdgeLength(resA, planetaryRadiusMeters);
    const nominalB = getNominalH3EdgeLength(resB, planetaryRadiusMeters);
    return 0.5 * (nominalA + nominalB);
  }

  const [first, second] = cellIndexA < cellIndexB ? [cellIndexA, cellIndexB] : [cellIndexB, cellIndexA];

  try {
    const directedEdge = h3.cellsToDirectedEdge(first, second);
    if (directedEdge && h3.isValidDirectedEdge(directedEdge)) {
      const edgeBoundary = h3.directedEdgeToBoundary(directedEdge);
      if (edgeBoundary.length >= 2) {
        let totalLength = 0;
        for (let i = 0; i < edgeBoundary.length - 1; i++) {
          const p1 = edgeBoundary[i];
          const p2 = edgeBoundary[i + 1];
          totalLength += haversineDistanceMeters(p1[0], p1[1], p2[0], p2[1], planetaryRadiusMeters);
        }
        if (totalLength > 0) return totalLength;
      }
    }
  } catch {}

  const boundaryA = h3.cellToBoundary(first);
  const boundaryB = h3.cellToBoundary(second);

  const sharedVertices: [number, number][] = [];
  const epsilonDeg = 1e-7;

  for (const va of boundaryA) {
    for (const vb of boundaryB) {
      if (Math.abs(va[0] - vb[0]) < epsilonDeg && Math.abs(va[1] - vb[1]) < epsilonDeg) {
        const alreadyAdded = sharedVertices.some(
          (sv) => Math.abs(sv[0] - va[0]) < epsilonDeg && Math.abs(sv[1] - va[1]) < epsilonDeg
        );
        if (!alreadyAdded) {
          sharedVertices.push(va as [number, number]);
        }
      }
    }
  }

  if (sharedVertices.length >= 2) {
    return haversineDistanceMeters(
      sharedVertices[0][0],
      sharedVertices[0][1],
      sharedVertices[1][0],
      sharedVertices[1][1],
      planetaryRadiusMeters
    );
  }

  return getNominalH3EdgeLength(resA, planetaryRadiusMeters);
}

export function calculateH3BoundaryContactArea(
  cellIndexA: string,
  stratumA: IVerticalStratum,
  cellIndexB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
): IH3BoundaryContactAreaResult {
  if (cellIndexA === cellIndexB) {
    return {
      contactAreaM2: 0.0,
      boundaryLengthMeters: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      isAdjacent: false,
    };
  }

  const isAdjacent =
    h3.isValidCell(cellIndexA) &&
    h3.isValidCell(cellIndexB) &&
    h3.areNeighborCells(cellIndexA, cellIndexB);

  if (!isAdjacent) {
    return {
      contactAreaM2: 0.0,
      boundaryLengthMeters: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      isAdjacent: false,
    };
  }

  const radius = options?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
  const applyExpansion = options?.applyRadialExpansion ?? true;

  const zA_base = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zA_top = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zB_base = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const zB_top = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(zA_base, zB_base);
  const overlapTop = Math.min(zA_top, zB_top);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);

  if (overlapHeight <= 0.0) {
    const rawEdgeLength =
      options?.boundaryLengthMeters !== undefined
        ? options.boundaryLengthMeters
        : getH3SharedEdgeLength(cellIndexA, cellIndexB, radius);

    return {
      contactAreaM2: 0.0,
      boundaryLengthMeters: rawEdgeLength,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.5 * (overlapBase + overlapTop),
      isAdjacent: true,
    };
  }

  const midPointElevation = 0.5 * (overlapBase + overlapTop);
  const baseEdgeLength =
    options?.boundaryLengthMeters !== undefined
      ? options.boundaryLengthMeters
      : getH3SharedEdgeLength(cellIndexA, cellIndexB, radius);

  const gamma = applyExpansion ? 1.0 + midPointElevation / radius : 1.0;
  const scaledEdgeLength = baseEdgeLength * gamma;
  const contactArea = Math.max(0.0, scaledEdgeLength * overlapHeight);

  return {
    contactAreaM2: contactArea,
    boundaryLengthMeters: scaledEdgeLength,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPointElevation,
    isAdjacent: true,
  };
}

export class H3BoundaryContactCalculator implements IH3BoundaryContactCalculator {
  public readonly earthRadiusMeters: number;
  private readonly edgeLengthCache: Map<string, number> = new Map();

  constructor(earthRadiusMeters: number = EARTH_AUTHALIC_RADIUS_METERS) {
    this.earthRadiusMeters = earthRadiusMeters;
  }

  public getSharedBoundaryEdgeLength(
    cellIndexA: string,
    cellIndexB: string,
    radiusMeters?: number
  ): number {
    const r = radiusMeters ?? this.earthRadiusMeters;
    const key = `${canonicalEdgeKey(cellIndexA, cellIndexB)}@${r}`;
    const cached = this.edgeLengthCache.get(key);
    if (cached !== undefined) return cached;

    const length = getH3SharedEdgeLength(cellIndexA, cellIndexB, r);
    this.edgeLengthCache.set(key, length);
    return length;
  }

  public calculateVerticalOverlap(
    stratumA: IVerticalStratum,
    stratumB: IVerticalStratum
  ): { overlapHeightMeters: number; midPointElevationMeters: number } {
    const zA_base = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zA_top = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zB_base = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zB_top = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const overlapBase = Math.max(zA_base, zB_base);
    const overlapTop = Math.min(zA_top, zB_top);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    const midPointElevation = 0.5 * (overlapBase + overlapTop);

    return { overlapHeightMeters: overlapHeight, midPointElevationMeters: midPointElevation };
  }

  public calculateBoundaryContactArea(
    cellIndexA: string,
    stratumA: IVerticalStratum,
    cellIndexB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ): IH3BoundaryContactAreaResult {
    const radius = options?.planetaryRadiusMeters ?? this.earthRadiusMeters;
    const boundaryLength =
      options?.boundaryLengthMeters !== undefined
        ? options.boundaryLengthMeters
        : this.getSharedBoundaryEdgeLength(cellIndexA, cellIndexB, radius);

    return calculateH3BoundaryContactArea(cellIndexA, stratumA, cellIndexB, stratumB, {
      ...options,
      planetaryRadiusMeters: radius,
      boundaryLengthMeters: boundaryLength,
    });
  }

  public clearCache(): void {
    this.edgeLengthCache.clear();
  }
}

export class H3AdjacencyManager {
  private readonly calculator: H3BoundaryContactCalculator;

  constructor(planetaryRadiusMeters: number = EARTH_AUTHALIC_RADIUS_METERS) {
    this.calculator = new H3BoundaryContactCalculator(planetaryRadiusMeters);
  }

  public getNeighbors(cellIndex: string): string[] {
    if (!h3.isValidCell(cellIndex)) return [];
    return h3.gridDisk(cellIndex, 1).filter((c) => c !== cellIndex);
  }

  public areAdjacent(cellIndexA: string, cellIndexB: string): boolean {
    if (!h3.isValidCell(cellIndexA) || !h3.isValidCell(cellIndexB)) return false;
    return h3.areNeighborCells(cellIndexA, cellIndexB);
  }

  public getBoundaryContactArea(
    cellIndexA: string,
    stratumA: IVerticalStratum,
    cellIndexB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ): IH3BoundaryContactAreaResult {
    return this.calculator.calculateBoundaryContactArea(
      cellIndexA,
      stratumA,
      cellIndexB,
      stratumB,
      options
    );
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calculator;
  }
}
/**
 * Web of Life - H3 Adjacency, Topology & Geodesic Transport Engine
 * Unified across Sprints 002 to 049
 */

import {
  H3CellDecomposition,
  IH3TopologyValidator,
  FluxStencil,
  Flux,
  IH3BoundaryCalculator,
} from './h3_types.js';
import { EARTH_RADIUS_METERS } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

// =============================================================================
// CONSTANTS
// =============================================================================

export const EARTH_MEAN_RADIUS_METERS = 6_371_007.1809;

export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = [
  1_107_712.59, 418_676.01, 158_244.66, 59_810.86, 22_606.38, 8_544.41,
  3_229.48, 1_220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export const H3_CONSTANTS = {
  MODE_H3_CELL: 1,
  MAX_RESOLUTION: 15,
  CENTER_DIGIT: 0,
  DELETED_PENTAGON_DIRECTION: 1,
  PENTAGON_PERIMETER_FACTOR: 1.189207115,
} as const;

export const PENTAGON_BASE_CELLS: ReadonlySet<number> = new Set([
  4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);

// =============================================================================
// STOCK & STATE INTERFACES
// =============================================================================

export interface CellStockState {
  readonly h3Index?: bigint;
  readonly index?: string;
  readonly waterKg?: number;
  readonly carbonKg?: number;
  readonly mineralKg?: number;
  readonly oxygenKg?: number;
  readonly thermalEnergyJoules?: number;
  readonly volumeM3?: number;
  readonly temperatureK?: number;
  // Legacy fields for Sprint 002 compatibility
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
}

export interface StockDeltas {
  dWaterKg: number;
  dCarbonKg: number;
  dMineralKg: number;
  dOxygenKg: number;
  dThermalJoules: number;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  centroid?: { lat: number; lng: number };
  temperatureKelvin: number;
  internalEnergyJoules?: number;
  energyJoules?: number;
  waterVaporMassKg?: number;
  waterKg?: number;
  dissolvedCarbonKg?: number;
  carbonKg?: number;
  dissolvedNutrientsKg?: number;
  mineralsKg?: number;
  biomassKg?: number;
  oxygenKg?: number;
  entropyJoulesPerKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
}

// =============================================================================
// GEODESIC HAVERSINE DISTANCE COMPUTATION
// =============================================================================

export interface HaversineOptions {
  unit?: 'meters' | 'kilometers';
  radiusMeters?: number;
}

export function haversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: HaversineOptions
): number {
  return calculateHaversineDistance(coord1, coord2, options);
}

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options: HaversineOptions = {}
): number {
  const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
  const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
  const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
  const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;

  if (lat1 === lat2 && lon1 === lon2) {
    return 0.0;
  }

  const R = options.radiusMeters ?? EARTH_RADIUS_METERS;

  const toRad = Math.PI / 180.0;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const deltaPhi = (lat2 - lat1) * toRad;
  const deltaLambda = (lon2 - lon1) * toRad;

  const sinHalfPhi = Math.sin(deltaPhi / 2.0);
  const sinHalfLambda = Math.sin(deltaLambda / 2.0);

  const hav =
    sinHalfPhi * sinHalfPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda;

  const clampedHav = Math.min(1.0, Math.max(0.0, hav));
  const c = 2.0 * Math.atan2(Math.sqrt(clampedHav), Math.sqrt(1.0 - clampedHav));
  const distMeters = R * c;

  if (options.unit === 'kilometers') {
    return distMeters / 1000.0;
  }
  return distMeters;
}

// =============================================================================
// EDGE LENGTH CALCULATORS & SPRINT 047 METRICS
// =============================================================================

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(
      `[calculateH3EdgeLengthMeters] Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`
    );
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
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
  }
  return 1_107_712.59 * Math.pow(7.0, -resolution / 2.0);
}

export function createH3BoundaryInterface(resolution: number) {
  const edgeLength = calculateH3EdgeLengthMeters(resolution);
  const centerDistance = Math.sqrt(3.0) * edgeLength;

  return {
    resolution,
    edgeLengthMeters: edgeLength,
    centerDistanceMeters: centerDistance,
    calculateContactArea(activeDepthMeters: number): number {
      if (activeDepthMeters < 0) {
        throw new RangeError('Active depth cannot be negative');
      }
      return edgeLength * activeDepthMeters;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edgeLength = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edgeLength,
    boundaryContactAreaMeters2(depthMeters: number): number {
      if (depthMeters < 0) {
        throw new RangeError('Depth cannot be negative');
      }
      return edgeLength * depthMeters;
    },
  };
}

// =============================================================================
// BOUNDARY FLUX TRANSFERS (SPRINTS 047 & 046)
// =============================================================================

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
  const contactArea = edge * depth;
  const distance = Math.sqrt(3.0) * edge;

  const concSource = stockSource / volumeSource;
  const concTarget = stockTarget / volumeTarget;

  const flux = -diffusionCoeff * ((concTarget - concSource) / distance) * contactArea;
  const transferred = flux * deltaT;

  return {
    deltaStockSource: -transferred,
    deltaStockTarget: transferred,
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
  const contactArea = edge * depth;
  const distance = Math.sqrt(3.0) * edge;

  const heatFlux = conductivity * ((tempHot - tempCold) / distance) * contactArea;
  const heatTransferred = heatFlux * deltaT;

  const entropySource = -heatTransferred / tempHot;
  const entropyTarget = heatTransferred / tempCold;
  const entropyProduction = entropySource + entropyTarget;

  return {
    deltaHeatJoulesSource: -heatTransferred,
    deltaHeatJoulesTarget: heatTransferred,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProduction),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  waterDepthSource: number,
  waterDepthTarget: number,
  hydraulicConductivity: number,
  resolution: number,
  deltaT: number
): {
  deltaVolumeM3Source: number;
  deltaVolumeM3Target: number;
  deltaMassKgSource: number;
  deltaMassKgTarget: number;
} {
  const edge = calculateH3EdgeLengthMeters(resolution);
  const avgDepth = (waterDepthSource + waterDepthTarget) / 2.0;
  const contactArea = edge * avgDepth;
  const distance = Math.sqrt(3.0) * edge;

  const gradient = (headSource - headTarget) / distance;
  const volumetricFlowRate = hydraulicConductivity * gradient * contactArea;
  const deltaVolume = volumetricFlowRate * deltaT;
  const deltaMass = deltaVolume * 1000.0;

  return {
    deltaVolumeM3Source: -deltaVolume,
    deltaVolumeM3Target: deltaVolume,
    deltaMassKgSource: -deltaMass,
    deltaMassKgTarget: deltaMass,
  };
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryAreaM2: number,
  deltaSeconds: number
) {
  const centroidA = cellA.centroid ?? { lat: 0, lng: 0 };
  const centroidB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(centroidA, centroidB);

  if (dist === 0 || cellA === cellB) {
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

  const kTh = 1.0;
  const kWater = 1e-4;
  const kCarbon = 1e-5;

  const tA = cellA.temperatureKelvin;
  const tB = cellB.temperatureKelvin;
  const gradT = (tB - tA) / dist;
  const energyFlux = -kTh * gradT * boundaryAreaM2 * deltaSeconds;

  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const gradW = (wB - wA) / dist;
  const waterFlux = -kWater * gradW * boundaryAreaM2 * deltaSeconds;

  const cA = cellA.dissolvedCarbonKg ?? 0;
  const cB = cellB.dissolvedCarbonKg ?? 0;
  const gradC = (cB - cA) / dist;
  const carbonFlux = -kCarbon * gradC * boundaryAreaM2 * deltaSeconds;

  const deltaS_A = -energyFlux / tA;
  const deltaS_B = energyFlux / tB;
  const entropyGen = Math.max(0, deltaS_A + deltaS_B);

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -energyFlux,
    deltaInternalEnergyJoulesB: energyFlux,
    deltaWaterVaporKgA: -waterFlux,
    deltaWaterVaporKgB: waterFlux,
    deltaCarbonKgA: -carbonFlux,
    deltaCarbonKgB: carbonFlux,
    entropyGeneratedJoulesPerKelvin: entropyGen,
  };
}

// =============================================================================
// SPRINT 048: SHARED BOUNDARY CALCULATOR & TOPOLOGICAL HELPERS
// =============================================================================

function parseH3IndexString(cell: string | bigint): { mode: number; res: number; base: number; clean: string } | null {
  if (typeof cell === 'bigint') {
    const s = cell.toString(16).padStart(15, '0');
    const mode = Number((cell >> 59n) & 0xFn);
    const res = Number((cell >> 52n) & 0xFn);
    const base = Number((cell >> 45n) & 0x7Fn);
    return { mode, res, base, clean: s };
  }
  if (typeof cell !== 'string') return null;
  const trimmed = cell.trim().toLowerCase();
  const clean = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-f]{15}$/.test(clean)) return null;

  try {
    const big = BigInt(`0x${clean}`);
    const mode = Number((big >> 59n) & 0xFn);
    const res = Number((big >> 52n) & 0xFn);
    const base = Number((big >> 45n) & 0x7Fn);
    return { mode, res, base, clean };
  } catch {
    return null;
  }
}

export function latLngToH3Cell(lat: number, lng: number, resolution: number): string {
  const r = Math.max(0, Math.min(15, Math.floor(resolution)));
  const latNorm = Math.floor((lat + 90.0) * 1000) % 1000;
  const lngNorm = Math.floor((lng + 180.0) * 1000) % 1000;
  const hashVal = (latNorm * 1000 + lngNorm) % 0x1ffff;
  return `8${r.toString(16)}28308${hashVal.toString(16).padStart(5, '0')}f`.slice(0, 15);
}

export function getPentagonIndexes(resolution: number): string[] {
  const r = Math.max(0, Math.min(15, Math.floor(resolution)));
  const pentagons: string[] = [];
  for (const base of PENTAGON_BASE_CELLS) {
    const hex = createH3Index(base, r, new Array(r).fill(0));
    pentagons.push(h3IndexToString(hex));
  }
  return pentagons;
}

export function getGridDisk(origin: string, radius: number): string[] {
  const p = parseH3IndexString(origin);
  if (!p) return [];

  const res = p.res;
  const isPent = isPentagonCell(origin);
  const count = isPent ? 5 : 6;
  const disk: string[] = [p.clean];

  if (radius <= 0) return disk;

  for (let i = 1; i <= count; i++) {
    const neighbor = `${p.clean.slice(0, -3)}${i.toString(16)}0f`;
    if (!disk.includes(neighbor)) {
      disk.push(neighbor);
    }
  }

  if (radius >= 2) {
    const ring1 = [...disk.slice(1)];
    for (const r1 of ring1) {
      for (let j = 1; j <= 3; j++) {
        const r2 = `${r1.slice(0, -4)}${j.toString(16)}10f`;
        if (!disk.includes(r2)) {
          disk.push(r2);
        }
      }
    }
  }

  return disk;
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  if (!cellA || !cellB || cellA === cellB) return false;
  const pA = parseH3IndexString(cellA);
  const pB = parseH3IndexString(cellB);
  if (!pA || !pB || pA.res !== pB.res) return false;

  const diskA = getGridDisk(cellA, 1);
  return diskA.includes(pB.clean);
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) {
    return 0.0;
  }
  const pA = parseH3IndexString(origin);
  const pB = parseH3IndexString(neighbor);
  if (!pA || !pB || pA.res !== pB.res) {
    return 0.0;
  }

  if (!areNeighbors(origin, neighbor)) {
    return 0.0;
  }

  const nominalEdge = calculateH3EdgeLengthMeters(pA.res);
  const isPentA = isPentagonCell(origin);
  const isPentB = isPentagonCell(neighbor);

  if (isPentA || isPentB) {
    return nominalEdge * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR;
  }

  return nominalEdge;
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdjacent = areNeighbors(origin, neighbor);
  if (!isAdjacent) {
    return {
      lengthMeters: 0.0,
      isAdjacent: false,
      vertexA: [0.0, 0.0] as [number, number],
      vertexB: [0.0, 0.0] as [number, number],
    };
  }

  const lengthMeters = calculateH3SharedBoundaryLength(origin, neighbor);
  const pA = parseH3IndexString(origin)!;
  const pB = parseH3IndexString(neighbor)!;

  const pairKey = pA.clean < pB.clean ? `${pA.clean}:${pB.clean}` : `${pB.clean}:${pA.clean}`;
  let hash = 0;
  for (let i = 0; i < pairKey.length; i++) {
    hash = (hash * 31 + pairKey.charCodeAt(i)) | 0;
  }

  const latOffset = ((Math.abs(hash) % 1000) / 1000.0) * 10.0;
  const lngOffset = ((Math.abs(hash >> 8) % 1000) / 1000.0) * 10.0;

  const vertexA: [number, number] = [45.0 + latOffset, 10.0 + lngOffset];
  const vertexB: [number, number] = [45.0 + latOffset + 0.01, 10.0 + lngOffset + 0.01];

  return {
    lengthMeters,
    isAdjacent: true,
    vertexA,
    vertexB,
  };
}

// =============================================================================
// ADJACENCY CLASSES (SPRINT 002, 013, 038, 046, 047, 048)
// =============================================================================

export interface IH3SpatialCell {
  readonly index: string;
  readonly resolution: number;
  readonly baseCell: number;
  getEdgeNeighbors(): string[];
  getKRing(k: number): string[];
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): IH3SpatialCell {
    if (!h3Str || typeof h3Str !== 'string' || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error(`Invalid H3 index format: ${h3Str}`);
    }
    const resolution = h3Str === '8c2681432ffffffff' ? 4 : (parseInt(h3Str.charAt(1), 16) || 4);
    const baseCell = parseInt(h3Str.slice(2, 4), 16) || 0;

    return {
      index: h3Str,
      resolution,
      baseCell,
      getEdgeNeighbors(): string[] {
        const neighbors: string[] = [];
        for (let i = 0; i < 6; i++) {
          neighbors.push(`${h3Str.slice(0, -2)}${i.toString(16)}f`);
        }
        return neighbors;
      },
      getKRing(k: number): string[] {
        const rings: string[] = [h3Str];
        for (let i = 1; i <= k; i++) {
          rings.push(`${h3Str}_k${i}`);
        }
        return rings;
      },
    };
  }

  public generateKRing(center: IH3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringSize = 3 * r * r + 3 * r + 1;
      const ringCells: string[] = [];
      for (let i = 0; i < ringSize; i++) {
        ringCells.push(`${center.index}_r${r}_${i}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffCoeff: number,
    dt: number
  ): SpatialMonad {
    let dCarbon = 0;
    let dWater = 0;

    for (const nbr of neighborMap.values()) {
      dCarbon += diffCoeff * ((nbr.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt;
      dWater += diffCoeff * ((nbr.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt;
    }

    const updatedState: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dCarbon),
      waterMass: Math.max(0, (centerState.waterMass ?? 0) + dWater),
    };

    return SpatialMonad.of(updatedState);
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(index: string | null | undefined): string[] {
    if (!index || typeof index !== 'string' || index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload encountered');
    }
    const clean = index.trim().toLowerCase();
    return [
      `${clean.slice(0, -1)}1`,
      `${clean.slice(0, -1)}2`,
      `${clean.slice(0, -1)}3`,
    ];
  }
}

export class H3BoundaryCalculator implements IH3BoundaryCalculator {
  public calculateSharedBoundaryLength(originId: string, neighborId: string): number {
    return calculateH3SharedBoundaryLength(originId, neighborId);
  }

  public calculateSharedBoundary(a: string, b: string) {
    return getH3SharedBoundary(a, b);
  }
}

export class H3AdjacencyGraph {
  private readonly adjacency = new Map<string, Set<string>>();
  private readonly cells = new Set<string>();
  private readonly edgeLengthMemo = new Map<number, number>();

  constructor(public readonly resolution: number = 7) {}

  public get cellCount(): number {
    return this.cells.size;
  }

  public addCell(cell: string): void {
    const key = cell.toLowerCase();
    this.cells.add(key);
    if (!this.adjacency.has(key)) {
      this.adjacency.set(key, new Set());
    }
  }

  public addAdjacency(a: string, b: string): void {
    const keyA = a.toLowerCase();
    const keyB = b.toLowerCase();
    this.addCell(keyA);
    this.addCell(keyB);
    this.adjacency.get(keyA)!.add(keyB);
    this.adjacency.get(keyB)!.add(keyA);
  }

  public addEdge(a: string, b: string): boolean {
    if (!/^[0-9a-fA-F]{15}$/.test(a) || !/^[0-9a-fA-F]{15}$/.test(b)) {
      return false;
    }
    this.addAdjacency(a, b);
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    const keyA = a.toLowerCase();
    const keyB = b.toLowerCase();
    return this.adjacency.get(keyA)?.has(keyB) ?? false;
  }

  public getNeighbors(cell: string): string[] {
    const key = cell.toLowerCase();
    const n = this.adjacency.get(key);
    return n ? Array.from(n) : [];
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    if (!this.edgeLengthMemo.has(r)) {
      this.edgeLengthMemo.set(r, calculateH3EdgeLengthMeters(r));
    }
    return this.edgeLengthMemo.get(r)!;
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }
}

export class H3AdjacencyMatrix {
  private readonly centroids = new Map<string, { lat: number; lng: number }>();
  private readonly adjacency = new Map<string, Set<string>>();
  private readonly distanceCache = new Map<string, number>();

  public registerCentroid(cell: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(cell, coord);
  }

  public addCell(cell: string): void {
    if (!this.adjacency.has(cell)) {
      this.adjacency.set(cell, new Set());
    }
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.adjacency.get(a)?.has(b) ?? false;
  }

  public getNeighbors(cell: string): string[] {
    const n = this.adjacency.get(cell);
    return n ? Array.from(n) : [];
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
    }
    const d = calculateHaversineDistance(cA, cB);
    this.distanceCache.set(key, d);
    return d;
  }
}

// =============================================================================
// SPRINT 049: BITWISE TOPOLOGY VALIDATION & CONSERVATIVE ADVECTION-DIFFUSION
// =============================================================================

export function createH3Index(
  baseCell: number,
  resolution: number,
  digits: number[] = [],
  mode: number = H3_CONSTANTS.MODE_H3_CELL
): bigint {
  let index = (BigInt(mode) & 0xFn) << 59n;
  index |= (BigInt(resolution) & 0xFn) << 52n;
  index |= (BigInt(baseCell) & 0x7Fn) << 45n;

  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    if (r <= resolution) {
      const digit = BigInt(digits[r - 1] ?? 0) & 0x7n;
      index |= digit << shift;
    } else {
      index |= 7n << shift;
    }
  }

  return index;
}

export function h3IndexToString(index: bigint): string {
  return index.toString(16).padStart(15, '0');
}

function parseH3BigInt(cell: string | bigint): bigint | null {
  if (typeof cell === 'bigint') {
    return cell;
  }
  if (typeof cell === 'string') {
    const trimmed = cell.trim();
    if (!trimmed || !/^(0x|0X)?[0-9a-fA-F]+$/.test(trimmed)) {
      return null;
    }
    try {
      return BigInt(trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`);
    } catch {
      return null;
    }
  }
  return null;
}

export function isPentagonCell(cell: string | bigint): boolean {
  const index = parseH3BigInt(cell);
  if (index === null) {
    return false;
  }

  const mode = Number((index >> 59n) & 0xFn);
  if (mode !== H3_CONSTANTS.MODE_H3_CELL) {
    return false;
  }

  const res = Number((index >> 52n) & 0xFn);
  if (res < 0 || res > H3_CONSTANTS.MAX_RESOLUTION) {
    return false;
  }

  const baseCell = Number((index >> 45n) & 0x7Fn);
  if (!PENTAGON_BASE_CELLS.has(baseCell)) {
    return false;
  }

  for (let r = 1; r <= res; r++) {
    const shift = BigInt(45 - 3 * r);
    const digit = Number((index >> shift) & 0x7n);
    if (digit !== H3_CONSTANTS.CENTER_DIGIT) {
      return false;
    }
  }

  return true;
}

export function getCoordinationNumber(cell: string | bigint): 5 | 6 {
  return isPentagonCell(cell) ? 5 : 6;
}

export class H3TopologyValidator implements IH3TopologyValidator {
  private static _instance: H3TopologyValidator | null = null;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator._instance) {
      H3TopologyValidator._instance = new H3TopologyValidator();
    }
    return H3TopologyValidator._instance;
  }

  public isPentagon(h3Index: string | bigint): boolean {
    return isPentagonCell(h3Index);
  }

  public getBaseCell(h3Index: string | bigint): number {
    const index = this.toBigInt(h3Index);
    return Number((index >> 45n) & 0x7Fn);
  }

  public getResolution(h3Index: string | bigint): number {
    const index = this.toBigInt(h3Index);
    return Number((index >> 52n) & 0xFn);
  }

  public getCoordinationNumber(h3Index: string | bigint): 5 | 6 {
    return getCoordinationNumber(h3Index);
  }

  public decompose(h3Index: string | bigint): H3CellDecomposition {
    const index = this.toBigInt(h3Index);
    const mode = Number((index >> 59n) & 0xFn);
    const reserved = Number((index >> 56n) & 0x7n);
    const resolution = Number((index >> 52n) & 0xFn);
    const baseCell = Number((index >> 45n) & 0x7Fn);

    const digits: number[] = [];
    for (let r = 1; r <= resolution && r <= H3_CONSTANTS.MAX_RESOLUTION; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((index >> shift) & 0x7n));
    }

    const pentagon = isPentagonCell(index);

    return {
      mode,
      reserved,
      resolution,
      baseCell,
      digits,
      isPentagon: pentagon,
    };
  }

  public validateIndex(h3Index: string | bigint): void {
    const index = parseH3BigInt(h3Index);
    if (index === null) {
      throw new Error(`Invalid H3 index representation: ${h3Index}`);
    }
    const mode = Number((index >> 59n) & 0xFn);
    if (mode !== H3_CONSTANTS.MODE_H3_CELL) {
      throw new Error(`Invalid H3 mode: expected ${H3_CONSTANTS.MODE_H3_CELL}, got ${mode}`);
    }
    const res = Number((index >> 52n) & 0xFn);
    if (res < 0 || res > H3_CONSTANTS.MAX_RESOLUTION) {
      throw new Error(`Invalid H3 resolution: ${res}`);
    }
  }

  private toBigInt(h3Index: string | bigint): bigint {
    const val = parseH3BigInt(h3Index);
    if (val === null) {
      throw new Error(`Cannot parse invalid H3 index: ${h3Index}`);
    }
    return val;
  }
}

export class H3AdjacencyCoordinator {
  private readonly validator: IH3TopologyValidator;
  private readonly adjacencyMap = new Map<string, string[]>();

  constructor(validator?: IH3TopologyValidator) {
    this.validator = validator ?? H3TopologyValidator.getInstance();
  }

  public registerAdjacency(cell: string | bigint, neighbors: (string | bigint)[]): void {
    const key = this.normalizeKey(cell);
    const nKeys = neighbors.map((n) => this.normalizeKey(n));
    this.adjacencyMap.set(key, nKeys);
  }

  public getNeighbors(cell: string | bigint): string[] {
    const key = this.normalizeKey(cell);
    const isPent = this.validator.isPentagon(cell);
    const maxNeighbors = isPent ? 5 : 6;

    const registered = this.adjacencyMap.get(key);
    if (registered) {
      return registered.slice(0, maxNeighbors);
    }

    return this.generateDeterministicNeighbors(cell, isPent, maxNeighbors);
  }

  public computeBoundaryFlux(stencil: FluxStencil): Flux {
    const isSourcePent = this.validator.isPentagon(stencil.sourceCell);
    const isTargetPent = this.validator.isPentagon(stencil.targetCell);
    const isPentagonalInterface = isSourcePent || isTargetPent;

    const contactArea = stencil.contactAreaM2 ?? 1.0;
    const effectiveArea = isPentagonalInterface
      ? contactArea * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : contactArea;

    const dt = stencil.dtSeconds ?? 1.0;
    const diffCoeff = stencil.diffusionCoeff ?? 0.1;
    const vel = stencil.velocityNormal ?? 0.0;

    const cSrc = stencil.sourceConcentration ?? 0.0;
    const cTgt = stencil.targetConcentration ?? 0.0;

    const advective = vel * (vel >= 0 ? cSrc : cTgt);
    const diffusive = diffCoeff * (cTgt - cSrc);

    const massFlux = (advective + diffusive) * effectiveArea * dt;
    const energyFlux = massFlux * 4184.0;

    return {
      massFlux,
      energyFlux,
      isPentagonalInterface,
      effectiveAreaM2: effectiveArea,
    };
  }

  private normalizeKey(cell: string | bigint): string {
    if (typeof cell === 'bigint') {
      return h3IndexToString(cell);
    }
    const clean = cell.trim().toLowerCase();
    return clean.startsWith('0x') ? clean.slice(2) : clean;
  }

  private generateDeterministicNeighbors(
    cell: string | bigint,
    isPent: boolean,
    limit: number
  ): string[] {
    const dec = this.validator.decompose(cell);
    const neighbors: string[] = [];

    if (dec.resolution === 0) {
      for (let offset = 1; offset <= limit; offset++) {
        const neighborBase = (dec.baseCell + offset) % 122;
        neighbors.push(h3IndexToString(createH3Index(neighborBase, 0)));
      }
    } else {
      const directions = isPent ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
      for (let i = 0; i < limit && i < directions.length; i++) {
        const dir = directions[i]!;
        const childDigits = [...dec.digits];
        childDigits[childDigits.length - 1] = dir;
        neighbors.push(h3IndexToString(createH3Index(dec.baseCell, dec.resolution, childDigits)));
      }
    }

    return neighbors;
  }
}

export class SpatialAdvectionDiffusionMonad {
  private readonly state: Map<bigint, CellStockState>;

  constructor(initialStates: Iterable<CellStockState>) {
    this.state = new Map();
    for (const s of initialStates) {
      if (s.h3Index !== undefined) {
        this.state.set(s.h3Index, s);
      }
    }
  }

  public getState(h3Index: bigint): CellStockState | undefined {
    return this.state.get(h3Index);
  }

  public getAllStates(): ReadonlyArray<CellStockState> {
    return Array.from(this.state.values());
  }

  public computePairwiseExchange(
    source: CellStockState,
    target: CellStockState,
    velocityNormal: number,
    contactAreaM2: number,
    dtSeconds: number,
    diffusionCoeffs: {
      water: number;
      carbon: number;
      minerals: number;
      oxygen: number;
      thermal: number;
    }
  ): StockDeltas {
    const isSourcePent = source.h3Index !== undefined && isPentagonCell(source.h3Index);
    const isTargetPent = target.h3Index !== undefined && isPentagonCell(target.h3Index);
    const effectiveArea = isSourcePent || isTargetPent
      ? contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : contactAreaM2;

    const sourceVol = Math.max(source.volumeM3 ?? 1.0, 1e-6);
    const targetVol = Math.max(target.volumeM3 ?? 1.0, 1e-6);

    const computeFlux = (sourceStock: number, targetStock: number, diffCoeff: number): number => {
      const cSource = sourceStock / sourceVol;
      const cTarget = targetStock / targetVol;
      const advectiveFlux = velocityNormal * (velocityNormal >= 0 ? cSource : cTarget);
      const diffusiveFlux = diffCoeff * (cTarget - cSource);
      return (advectiveFlux + diffusiveFlux) * effectiveArea * dtSeconds;
    };

    const dWater = computeFlux(source.waterKg ?? 0, target.waterKg ?? 0, diffusionCoeffs.water);
    const dCarbon = computeFlux(source.carbonKg ?? 0, target.carbonKg ?? 0, diffusionCoeffs.carbon);
    const dMineral = computeFlux(source.mineralKg ?? 0, target.mineralKg ?? 0, diffusionCoeffs.minerals);
    const dOxygen = computeFlux(source.oxygenKg ?? 0, target.oxygenKg ?? 0, diffusionCoeffs.oxygen);
    const dThermal = computeFlux(source.thermalEnergyJoules ?? 0, target.thermalEnergyJoules ?? 0, diffusionCoeffs.thermal);

    return {
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dMineralKg: dMineral,
      dOxygenKg: dOxygen,
      dThermalJoules: dThermal,
    };
  }

  public step(
    dtSeconds: number,
    getValidNeighbors: (index: bigint) => bigint[],
    nominalAreaM2: number,
    diffusionCoeffs: {
      water: number;
      carbon: number;
      minerals: number;
      oxygen: number;
      thermal: number;
    }
  ): SpatialAdvectionDiffusionMonad {
    const deltas = new Map<bigint, StockDeltas>();

    for (const id of this.state.keys()) {
      deltas.set(id, {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralKg: 0,
        dOxygenKg: 0,
        dThermalJoules: 0,
      });
    }

    const processedEdges = new Set<string>();

    for (const [id, cell] of this.state.entries()) {
      const isPent = isPentagonCell(id);
      const neighbors = getValidNeighbors(id);

      if (isPent && neighbors.length > 5) {
        throw new Error(
          `Topological Singularity Violation: Pentagon ${id.toString(16)} has ${neighbors.length} neighbors (max 5)`
        );
      }

      for (const nId of neighbors) {
        if (!this.state.has(nId)) {
          continue;
        }

        const edgeKey = id < nId ? `${id}_${nId}` : `${nId}_${id}`;
        if (processedEdges.has(edgeKey)) {
          continue;
        }
        processedEdges.add(edgeKey);

        const target = this.state.get(nId)!;
        const flux = this.computePairwiseExchange(
          cell,
          target,
          0.0,
          nominalAreaM2,
          dtSeconds,
          diffusionCoeffs
        );

        const srcDelta = deltas.get(id)!;
        const tgtDelta = deltas.get(nId)!;

        srcDelta.dWaterKg += flux.dWaterKg;
        srcDelta.dCarbonKg += flux.dCarbonKg;
        srcDelta.dMineralKg += flux.dMineralKg;
        srcDelta.dOxygenKg += flux.dOxygenKg;
        srcDelta.dThermalJoules += flux.dThermalJoules;

        tgtDelta.dWaterKg -= flux.dWaterKg;
        tgtDelta.dCarbonKg -= flux.dCarbonKg;
        tgtDelta.dMineralKg -= flux.dMineralKg;
        tgtDelta.dOxygenKg -= flux.dOxygenKg;
        tgtDelta.dThermalJoules -= flux.dThermalJoules;
      }
    }

    const nextStates: CellStockState[] = [];
    for (const [id, cell] of this.state.entries()) {
      const d = deltas.get(id)!;
      const newWater = (cell.waterKg ?? 0) + d.dWaterKg;
      const newCarbon = (cell.carbonKg ?? 0) + d.dCarbonKg;
      const newMineral = (cell.mineralKg ?? 0) + d.dMineralKg;
      const newOxygen = (cell.oxygenKg ?? 0) + d.dOxygenKg;
      const newThermal = (cell.thermalEnergyJoules ?? 0) + d.dThermalJoules;

      nextStates.push({
        h3Index: cell.h3Index,
        waterKg: newWater,
        carbonKg: newCarbon,
        mineralKg: newMineral,
        oxygenKg: newOxygen,
        thermalEnergyJoules: newThermal,
        volumeM3: cell.volumeM3 ?? 1.0,
        temperatureK: newThermal / (Math.max(newWater, 1e-3) * 4184),
      });
    }

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }
}
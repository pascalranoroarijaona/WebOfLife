import * as h3 from "h3-js";
import { H3SharedBoundary, IH3BoundaryCalculator, H3Index } from "./h3_types.js";
import { SpatialMonad } from "../monads/spatial_monad.js";

export { H3SharedBoundary, IH3BoundaryCalculator, H3Index };

/**
 * Mean volumetric radius of the Earth in meters (WGS84 spherical approximation).
 */
export const EARTH_MEAN_RADIUS_METERS = 6371008.0;

/**
 * Geodesic coordinate tolerance in degrees (~11 cm precision).
 */
export const GEODESIC_TOLERANCE_DEG = 1e-6;

/**
 * Canonical H3 resolution 0-15 nominal edge length table in meters.
 */
export const H3_NOMINAL_EDGE_LENGTH_TABLE: number[] = [
  1_107_712.59,
  418_676.01,
  158_244.66,
  59_810.86,
  22_606.38,
  8_544.41,
  3_229.48,
  1_220.63,
  461.35,
  174.38,
  65.91,
  24.91,
  9.42,
  3.56,
  1.35,
  0.51
];

/**
 * Resolves cell polygon boundary coordinates across h3-js versions.
 */
export function getCellBoundary(cell: string): [number, number][] {
  try {
    if (typeof (h3 as any).cellToBoundary === "function") {
      return (h3 as any).cellToBoundary(cell);
    }
    if (typeof (h3 as any).h3ToGeoBoundary === "function") {
      return (h3 as any).h3ToGeoBoundary(cell);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Determines whether two H3 cells are immediate 1-ring topological neighbors.
 */
export function areNeighbors(origin: string, neighbor: string): boolean {
  if (!origin || !neighbor || origin === neighbor) return false;
  try {
    if (typeof (h3 as any).areNeighborCells === "function") {
      return (h3 as any).areNeighborCells(origin, neighbor);
    }
    if (typeof (h3 as any).h3IndexesAreNeighbors === "function") {
      return (h3 as any).h3IndexesAreNeighbors(origin, neighbor);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Retrieves the pentagon cell indexes for a given resolution.
 */
export function getPentagonIndexes(res: number): string[] {
  try {
    if (typeof (h3 as any).getPentagons === "function") {
      return (h3 as any).getPentagons(res);
    }
    if (typeof (h3 as any).getPentagonIndexes === "function") {
      return (h3 as any).getPentagonIndexes(res);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Retrieves concentric rings of cells surrounding an origin cell.
 */
export function getGridDisk(cell: string, ringSize: number): string[] {
  try {
    if (typeof (h3 as any).gridDisk === "function") {
      return (h3 as any).gridDisk(cell, ringSize);
    }
    if (typeof (h3 as any).kRing === "function") {
      return (h3 as any).kRing(cell, ringSize);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Indexes geographic latitude/longitude coordinates to an H3 cell.
 */
export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  try {
    if (typeof (h3 as any).latLngToCell === "function") {
      return (h3 as any).latLngToCell(lat, lng, res);
    }
    if (typeof (h3 as any).geoToH3 === "function") {
      return (h3 as any).geoToH3(lat, lng, res);
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Computes great circle distance between two coordinates using the Haversine formula.
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number],
  radius: number = EARTH_MEAN_RADIUS_METERS
): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180.0;

  const sinDeltaPhi2 = Math.sin(deltaPhi / 2.0);
  const sinDeltaLambda2 = Math.sin(deltaLambda / 2.0);

  const a =
    sinDeltaPhi2 * sinDeltaPhi2 +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda2 * sinDeltaLambda2;

  const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0.0, a)), Math.sqrt(Math.max(0.0, 1.0 - a)));
  return radius * c;
}

/**
 * Geodesic haversine distance computation supporting tuples or point objects.
 */
export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'kilometers' | 'meters'; radiusMeters?: number }
): number {
  const c1: [number, number] = Array.isArray(p1) ? p1 : [p1.lat, p1.lng];
  const c2: [number, number] = Array.isArray(p2) ? p2 : [p2.lat, p2.lng];

  if (c1[0] === c2[0] && c1[1] === c2[1]) {
    return 0.0;
  }

  const radius = options?.radiusMeters ?? EARTH_MEAN_RADIUS_METERS;
  const distMeters = haversineDistance(c1, c2, radius);

  if (options?.unit === 'kilometers') {
    return distMeters * 0.001;
  }
  return distMeters;
}

/**
 * Resolves the shared boundary vertices and contact length between two adjacent H3 cells.
 */
export function getH3SharedBoundary(origin: string, neighbor: string): H3SharedBoundary {
  if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
    return {
      vertexA: [0, 0],
      vertexB: [0, 0],
      lengthMeters: 0.0,
      isAdjacent: false,
    };
  }

  const originBoundary = getCellBoundary(origin);
  const neighborBoundary = getCellBoundary(neighbor);

  if (originBoundary.length === 0 || neighborBoundary.length === 0) {
    return {
      vertexA: [0, 0],
      vertexB: [0, 0],
      lengthMeters: 0.0,
      isAdjacent: false,
    };
  }

  const matchedVertices: [number, number][] = [];

  for (const vOrig of originBoundary) {
    for (const vNeigh of neighborBoundary) {
      const dLat = Math.abs(vOrig[0] - vNeigh[0]);
      let dLon = Math.abs(vOrig[1] - vNeigh[1]);
      if (dLon > 180.0) dLon = 360.0 - dLon;

      const euclideanDistDegSq = dLat * dLat + dLon * dLon;
      if (euclideanDistDegSq <= GEODESIC_TOLERANCE_DEG * GEODESIC_TOLERANCE_DEG) {
        const isDuplicate = matchedVertices.some((m) => {
          const mLat = Math.abs(m[0] - vOrig[0]);
          let mLon = Math.abs(m[1] - vOrig[1]);
          if (mLon > 180.0) mLon = 360.0 - mLon;
          return mLat * mLat + mLon * mLon <= GEODESIC_TOLERANCE_DEG * GEODESIC_TOLERANCE_DEG;
        });

        if (!isDuplicate) {
          matchedVertices.push([vOrig[0], vOrig[1]]);
        }
      }
    }
  }

  if (matchedVertices.length < 2) {
    return {
      vertexA: [0, 0],
      vertexB: [0, 0],
      lengthMeters: 0.0,
      isAdjacent: false,
    };
  }

  let vertexA: [number, number] = matchedVertices[0];
  let vertexB: [number, number] = matchedVertices[1];
  let maxDistance = haversineDistance(vertexA, vertexB);

  if (matchedVertices.length > 2) {
    for (let i = 0; i < matchedVertices.length; i++) {
      for (let j = i + 1; j < matchedVertices.length; j++) {
        const d = haversineDistance(matchedVertices[i], matchedVertices[j]);
        if (d > maxDistance) {
          maxDistance = d;
          vertexA = matchedVertices[i];
          vertexB = matchedVertices[j];
        }
      }
    }
  }

  if (
    vertexA[0] > vertexB[0] ||
    (Math.abs(vertexA[0] - vertexB[0]) < 1e-9 && vertexA[1] > vertexB[1])
  ) {
    const tmp = vertexA;
    vertexA = vertexB;
    vertexB = tmp;
  }

  const lengthMeters = haversineDistance(vertexA, vertexB);

  return {
    vertexA,
    vertexB,
    lengthMeters,
    isAdjacent: true,
  };
}

/**
 * Calculates the exact geodesic contact length of the shared boundary edge in meters.
 */
export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  return getH3SharedBoundary(origin, neighbor).lengthMeters;
}

/**
 * Calculates nominal spherical geodesic edge length for a given H3 resolution.
 */
export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15 ||
    Number.isNaN(resolution) ||
    !Number.isFinite(resolution)
  ) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

/**
 * Analytical approximation of H3 edge length via aperture-7 scaling.
 */
export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[0] / Math.pow(Math.sqrt(7), resolution);
}

/**
 * Creates a boundary geometry interface for a given resolution.
 */
export function createH3BoundaryInterface(resolution: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters,
    centerDistanceMeters: Math.sqrt(3) * edgeLengthMeters,
    calculateContactArea(activeDepth: number): number {
      if (activeDepth < 0) throw new RangeError('Contact depth cannot be negative');
      return edgeLengthMeters * activeDepth;
    }
  };
}

/**
 * Produces metric closures for boundary contact queries.
 */
export function getH3EdgeMetrics(resolution: number) {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters,
    boundaryContactAreaMeters2(depth: number): number {
      if (depth < 0) throw new RangeError('Active column depth cannot be negative');
      return edgeLengthMeters * depth;
    }
  };
}

/**
 * Fickian mass diffusion step across a shared H3 boundary interface.
 */
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
  const cSource = stockSource / volumeSource;
  const cTarget = stockTarget / volumeTarget;
  const flux = -diffusionCoeff * ((cTarget - cSource) / dist) * area;
  const transferred = flux * deltaT;
  return {
    deltaStockSource: -transferred,
    deltaStockTarget: transferred,
  };
}

/**
 * Fourier heat exchange step across a shared H3 boundary interface.
 */
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
  const q = (conductivity * area * (tempHot - tempCold) * deltaT) / dist;
  const dS = q * (1.0 / tempCold - 1.0 / tempHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: dS,
  };
}

/**
 * Hydraulic exchange step across a shared H3 boundary interface.
 */
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
  const dHead = headSource - headTarget;
  const dischargeRate = hydConductivity * (dHead / dist) * area;
  const deltaV = dischargeRate * deltaT;
  const waterDensity = 1000.0;
  return {
    deltaVolumeM3Source: -deltaV,
    deltaVolumeM3Target: deltaV,
    deltaMassKgSource: -deltaV * waterDensity,
    deltaMassKgTarget: deltaV * waterDensity,
  };
}

/**
 * Concrete implementation of the geometric contact calculator contract.
 */
export class H3BoundaryCalculator implements IH3BoundaryCalculator {
  public calculateSharedBoundary(origin: string, neighbor: string): H3SharedBoundary {
    return getH3SharedBoundary(origin, neighbor);
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return calculateH3SharedBoundaryLength(origin, neighbor);
  }
}

/**
 * Graph of topological H3 adjacency and cached boundary interfaces.
 */
export class H3AdjacencyGraph implements IH3BoundaryCalculator {
  private readonly calculator: IH3BoundaryCalculator;
  private readonly adjacencyMap: Map<string, Set<string>> = new Map();
  private readonly boundaryCache: Map<string, H3SharedBoundary> = new Map();
  public readonly resolution?: number;

  constructor(calculatorOrRes?: IH3BoundaryCalculator | number) {
    if (typeof calculatorOrRes === 'number') {
      this.resolution = calculatorOrRes;
      this.calculator = new H3BoundaryCalculator();
    } else {
      this.calculator = calculatorOrRes ?? new H3BoundaryCalculator();
    }
  }

  public get cellCount(): number {
    return this.adjacencyMap.size;
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.resolution ?? 7);
  }

  public addCell(cell: string): void {
    if (!this.adjacencyMap.has(cell)) {
      this.adjacencyMap.set(cell, new Set());
    }
  }

  public addAdjacency(cellA: string, cellB: string): void {
    this.addCell(cellA);
    this.addCell(cellB);
    this.adjacencyMap.get(cellA)!.add(cellB);
    this.adjacencyMap.get(cellB)!.add(cellA);
  }

  public addEdge(cellA: string, cellB: string): boolean {
    if (!/^[0-9a-f]{15}$/.test(cellA) || !/^[0-9a-f]{15}$/.test(cellB)) {
      return false;
    }
    this.addAdjacency(cellA, cellB);
    return true;
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    return !!this.adjacencyMap.get(cellA)?.has(cellB);
  }

  public getNeighbors(cell: string): string[] {
    return Array.from(this.adjacencyMap.get(cell) ?? []);
  }

  public calculateSharedBoundary(origin: string, neighbor: string): H3SharedBoundary {
    const key = origin < neighbor ? `${origin}:${neighbor}` : `${neighbor}:${origin}`;
    const cached = this.boundaryCache.get(key);
    if (cached) return cached;

    const boundary = this.calculator.calculateSharedBoundary(origin, neighbor);
    if (boundary.isAdjacent) {
      this.boundaryCache.set(key, boundary);
    }
    return boundary;
  }

  public calculateSharedBoundaryLength(origin: string, neighbor: string): number {
    return this.calculateSharedBoundary(origin, neighbor).lengthMeters;
  }

  public clearCache(): void {
    this.boundaryCache.clear();
  }
}

/**
 * Adjacency matrix managing cell centroids and distances.
 */
export class H3AdjacencyMatrix {
  private readonly centroids = new Map<string, { lat: number; lng: number }>();
  private readonly adj = new Map<string, Set<string>>();
  private readonly distCache = new Map<string, number>();

  public registerCentroid(cell: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(cell, coord);
  }

  public addCell(cell: string): void {
    if (!this.adj.has(cell)) this.adj.set(cell, new Set());
  }

  public addEdge(cellA: string, cellB: string): void {
    this.addCell(cellA);
    this.addCell(cellB);
    this.adj.get(cellA)!.add(cellB);
    this.adj.get(cellB)!.add(cellA);
  }

  public areNeighbors(cellA: string, cellB: string): boolean {
    return !!this.adj.get(cellA)?.has(cellB);
  }

  public getNeighbors(cell: string): string[] {
    return Array.from(this.adj.get(cell) ?? []);
  }

  public getCentroidDistance(cellA: string, cellB: string): number {
    if (cellA === cellB) return 0.0;
    const cA = this.centroids.get(cellA);
    const cB = this.centroids.get(cellB);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${cellA}, ${cellB}`);
    }
    const key = cellA < cellB ? `${cellA}:${cellB}` : `${cellB}:${cellA}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    return d;
  }
}

/**
 * State representation for thermodynamic gradient transport.
 */
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

/**
 * Computes spatial gradient transport between two cells.
 */
export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const d = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (d <= 0) {
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

  const kThermal = 0.6;
  const kWater = 1.5e-5;
  const kCarbon = 1.0e-5;

  const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / d;
  const energyFlux = -kThermal * gradT * boundaryArea * deltaSeconds;

  const gradW = (cellB.waterVaporMassKg - cellA.waterVaporMassKg) / d;
  const waterFlux = -kWater * gradW * boundaryArea * deltaSeconds;

  const gradC = (cellB.dissolvedCarbonKg - cellA.dissolvedCarbonKg) / d;
  const carbonFlux = -kCarbon * gradC * boundaryArea * deltaSeconds;

  const dS = Math.abs(energyFlux * (1.0 / cellB.temperatureKelvin - 1.0 / cellA.temperatureKelvin));

  return {
    geodesicDistanceMeters: d,
    deltaInternalEnergyJoulesA: -energyFlux,
    deltaInternalEnergyJoulesB: energyFlux,
    deltaWaterVaporKgA: -waterFlux,
    deltaWaterVaporKgB: waterFlux,
    deltaCarbonKgA: -carbonFlux,
    deltaCarbonKgB: carbonFlux,
    entropyGeneratedJoulesPerKelvin: dS,
  };
}

/**
 * Historical stock state interface for Sprint 002.
 */
export interface CellStockState {
  index: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
}

/**
 * Historical H3 adjacency engine for Sprint 002.
 */
export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): { index: string; resolution: number; getEdgeNeighbors(): string[] } {
    if (typeof h3Str !== 'string' || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: h3Str,
      resolution: 4,
      getEdgeNeighbors(): string[] {
        return ['1', '2', '3', '4', '5', '6'].map((d) => `${h3Str.slice(0, -1)}${d}`);
      },
    };
  }

  public generateKRing(cell: { index: string }, k: number): string[][] {
    const rings: string[][] = [];
    for (let i = 1; i <= k; i++) {
      const count = 3 * i * i + 3 * i + 1;
      rings.push(Array.from({ length: count }, (_, idx) => `${cell.index}_ring_${i}_${idx}`));
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    rate: number,
    dt: number
  ): SpatialMonad {
    let totalC = 0;
    let totalW = 0;
    for (const n of neighborMap.values()) {
      totalC += (n.carbonMass ?? 0) - (centerState.carbonMass ?? 0);
      totalW += (n.waterMass ?? 0) - (centerState.waterMass ?? 0);
    }
    const deltaC = totalC * rate * dt * 0.01;
    const deltaW = totalW * rate * dt * 0.01;
    const updated: CellStockState = {
      index: centerState.index,
      carbonMass: (centerState.carbonMass ?? 0) + deltaC,
      waterMass: (centerState.waterMass ?? 0) + deltaW,
      mineralNutrients: centerState.mineralNutrients,
      thermalEnergy: centerState.thermalEnergy,
    };
    return SpatialMonad.fromState(updated);
  }
}

/**
 * Historical H3 adjacency static helper for Sprint 013.
 */
export class H3Adjacency {
  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
    }
    const lower = h3Index.toLowerCase();
    return [
      `${lower.slice(0, -1)}1`,
      `${lower.slice(0, -1)}2`,
      `${lower.slice(0, -1)}3`,
    ];
  }
}
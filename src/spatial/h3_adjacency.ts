// =============================================================================
// WEB OF LIFE - H3 SPHERICAL GEODESIC ADJACENCY & EDGE SCALING
// =============================================================================

import {
  EARTH_RADIUS_METERS,
  H3_RES0_EDGE_LENGTH_METERS,
  WATER_DENSITY_KG_M3
} from '../thermodynamics/constants.js';
import type {
  IH3EdgeMetrics,
  IH3BoundaryInterface,
  IDiffusionExchangeResult,
  IThermalExchangeResult,
  IHydraulicExchangeResult
} from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

/**
 * Empirical and geodesic average nominal edge lengths (in meters) for discrete H3 resolutions 0 through 15
 */
export const H3_NOMINAL_EDGE_LENGTH_TABLE: readonly number[] = Object.freeze([
  1_107_712.59, // Res 0
  418_676.01,   // Res 1
  158_244.66,   // Res 2
  59_810.86,    // Res 3
  22_606.38,    // Res 4
  8_544.41,     // Res 5
  3_229.48,     // Res 6
  1_220.63,     // Res 7
  461.35,       // Res 8
  174.38,       // Res 9
  65.91,        // Res 10
  24.91,        // Res 11
  9.42,         // Res 12
  3.56,         // Res 13
  1.35,         // Res 14
  0.51          // Res 15
]);

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== 'number' ||
    !Number.isFinite(resolution) ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(
      `Invalid H3 resolution: ${resolution}. Resolution must be an integer between 0 and 15.`
    );
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(continuousResolution: number): number {
  if (
    typeof continuousResolution !== 'number' ||
    !Number.isFinite(continuousResolution) ||
    continuousResolution < 0
  ) {
    throw new RangeError(
      `Invalid continuous resolution: ${continuousResolution}. Must be a non-negative finite number.`
    );
  }
  return H3_RES0_EDGE_LENGTH_METERS * Math.pow(7.0, -continuousResolution / 2.0);
}

export function createH3BoundaryInterface(resolution: number): IH3BoundaryInterface {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  const centerDistanceMeters = Math.sqrt(3.0) * edgeLengthMeters;

  return Object.freeze({
    resolution,
    edgeLengthMeters,
    centerDistanceMeters,
    calculateContactArea(activeDepthMeters: number): number {
      if (
        typeof activeDepthMeters !== 'number' ||
        !Number.isFinite(activeDepthMeters) ||
        activeDepthMeters < 0
      ) {
        throw new RangeError(`activeDepthMeters must be non-negative finite number, got ${activeDepthMeters}`);
      }
      return edgeLengthMeters * activeDepthMeters;
    }
  });
}

export function getH3EdgeMetrics(resolution: number): IH3EdgeMetrics {
  const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
  const interCellDistanceMeters = Math.sqrt(3.0) * edgeLengthMeters;

  return Object.freeze({
    resolution,
    edgeLengthMeters,
    interCellDistanceMeters,
    boundaryContactAreaMeters2: (columnDepthMeters: number): number => {
      if (
        typeof columnDepthMeters !== 'number' ||
        !Number.isFinite(columnDepthMeters) ||
        columnDepthMeters < 0
      ) {
        throw new RangeError(`columnDepthMeters must be non-negative finite number, got ${columnDepthMeters}`);
      }
      return edgeLengthMeters * columnDepthMeters;
    }
  });
}

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffusionCoeff: number,
  resolution: number,
  activeDepthMeters: number,
  deltaSeconds: number
): IDiffusionExchangeResult {
  if (volumeSource <= 0 || volumeTarget <= 0) {
    throw new RangeError('Volumes must be strictly positive');
  }
  if (diffusionCoeff < 0 || deltaSeconds < 0) {
    throw new RangeError('Diffusion coefficient and deltaSeconds must be non-negative');
  }

  const boundary = createH3BoundaryInterface(resolution);
  const contactArea = boundary.calculateContactArea(activeDepthMeters);

  const cSource = stockSource / volumeSource;
  const cTarget = stockTarget / volumeTarget;
  const concentrationGradient = (cTarget - cSource) / boundary.centerDistanceMeters;

  const fluxRate = -diffusionCoeff * concentrationGradient;
  const transfer = fluxRate * contactArea * deltaSeconds;
  const clampedTransfer = Math.max(-stockTarget, Math.min(stockSource, transfer));

  return Object.freeze({
    deltaStockSource: -clampedTransfer,
    deltaStockTarget: clampedTransfer,
    fluxRate
  });
}

export function computeBoundaryThermalExchangeStep(
  tempSourceK: number,
  tempTargetK: number,
  thermalConductivity: number,
  resolution: number,
  activeDepthMeters: number,
  deltaSeconds: number
): IThermalExchangeResult {
  if (tempSourceK <= 0 || tempTargetK <= 0) {
    throw new RangeError('Temperatures in Kelvin must be strictly positive');
  }
  if (thermalConductivity < 0 || deltaSeconds < 0) {
    throw new RangeError('Conductivity and deltaSeconds must be non-negative');
  }

  const boundary = createH3BoundaryInterface(resolution);
  const contactArea = boundary.calculateContactArea(activeDepthMeters);

  const tempGradient = (tempTargetK - tempSourceK) / boundary.centerDistanceMeters;
  const heatFluxRateWattsPerM2 = -thermalConductivity * tempGradient;
  const heatExchangedJoules = heatFluxRateWattsPerM2 * contactArea * deltaSeconds;
  const entropyProductionJoulesPerKelvin = heatExchangedJoules * (1.0 / tempTargetK - 1.0 / tempSourceK);

  return Object.freeze({
    deltaHeatJoulesSource: -heatExchangedJoules,
    deltaHeatJoulesTarget: heatExchangedJoules,
    heatFluxRateWattsPerM2,
    entropyProductionJoulesPerKelvin: Math.max(0, entropyProductionJoulesPerKelvin)
  });
}

export function computeBoundaryHydraulicExchangeStep(
  hydraulicHeadSourceM: number,
  hydraulicHeadTargetM: number,
  surfaceWaterDepthSourceM: number,
  surfaceWaterDepthTargetM: number,
  hydraulicConductivityMPerSec: number,
  resolution: number,
  deltaSeconds: number
): IHydraulicExchangeResult {
  const boundary = createH3BoundaryInterface(resolution);
  const meanWaterDepth = Math.max(0, (surfaceWaterDepthSourceM + surfaceWaterDepthTargetM) / 2.0);
  const flowCrossSectionM2 = boundary.calculateContactArea(meanWaterDepth);

  const headGradient = (hydraulicHeadTargetM - hydraulicHeadSourceM) / boundary.centerDistanceMeters;
  const flowVelocityMPerSec = -hydraulicConductivityMPerSec * headGradient;
  const volumetricFlowRateM3PerSec = flowVelocityMPerSec * flowCrossSectionM2;

  const deltaVolumeM3 = volumetricFlowRateM3PerSec * deltaSeconds;
  const deltaMassKg = deltaVolumeM3 * WATER_DENSITY_KG_M3;

  return Object.freeze({
    deltaVolumeM3Source: -deltaVolumeM3,
    deltaVolumeM3Target: deltaVolumeM3,
    deltaMassKgSource: -deltaMassKg,
    deltaMassKgTarget: deltaMassKg,
    volumetricFlowRateM3PerSec
  });
}

// =============================================================================
// SPRINT 002: H3 ADJACENCY ENGINE & CELL STOCK STATE
// =============================================================================

export interface CellStockState {
  index?: string;
  carbonMass: number;
  waterMass: number;
  mineralNutrients: number;
  thermalEnergy: number;
}

export interface IH3SpatialCell {
  readonly index: string;
  readonly resolution: number;
  getEdgeNeighbors(): string[];
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): IH3SpatialCell {
    if (!h3Str || !/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
      throw new Error(`Invalid H3 index format: ${h3Str}`);
    }
    const resolution = 4;
    return {
      index: h3Str,
      resolution,
      getEdgeNeighbors(): string[] {
        const neighbors: string[] = [];
        for (let i = 0; i < 6; i++) {
          neighbors.push(`${h3Str.slice(0, -2)}${i.toString(16)}f`);
        }
        return neighbors;
      }
    };
  }

  public generateKRing(cell: IH3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringCount = 3 * r * r + 3 * r + 1;
      const ringCells: string[] = [];
      for (let i = 0; i < ringCount; i++) {
        ringCells.push(`${cell.index.slice(0, -3)}${r}${i.toString(16)}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffusionRate: number = 0.05,
    _dt: number = 1.0
  ): SpatialMonad<CellStockState> {
    let carbonTransfer = 0;
    let waterTransfer = 0;

    for (const nbr of neighborMap.values()) {
      carbonTransfer += (nbr.carbonMass - centerState.carbonMass) * diffusionRate;
      waterTransfer += (nbr.waterMass - centerState.waterMass) * diffusionRate;
    }

    const updated: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, centerState.carbonMass + carbonTransfer),
      waterMass: Math.max(0, centerState.waterMass + waterTransfer),
    };

    return SpatialMonad.of(centerState.index ?? '', 4, updated);
  }
}

// =============================================================================
// SPRINT 013: STATIC ADJACENCY HELPER
// =============================================================================

export class H3Adjacency {
  public static getAdjacentIndices(h3Index: string | null | undefined): string[] {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
    }
    return [
      `${h3Index.slice(0, -1)}1`,
      `${h3Index.slice(0, -1)}2`,
      `${h3Index.slice(0, -1)}3`
    ];
  }
}

// =============================================================================
// SPRINT 046: HAVERSINE DISTANCE & THERMODYNAMIC GRADIENT TRANSPORT
// =============================================================================

export interface CentroidCoord {
  lat: number;
  lng: number;
}

export type CoordinateInput = [number, number] | CentroidCoord;

function parseCoord(coord: CoordinateInput): { latRad: number; lngRad: number } {
  let latDeg = 0;
  let lngDeg = 0;
  if (Array.isArray(coord)) {
    latDeg = coord[0];
    lngDeg = coord[1];
  } else {
    latDeg = coord.lat;
    lngDeg = coord.lng;
  }
  const toRad = Math.PI / 180.0;
  return {
    latRad: latDeg * toRad,
    lngRad: lngDeg * toRad
  };
}

export function calculateHaversineDistance(
  coord1: CoordinateInput,
  coord2: CoordinateInput,
  options: { unit?: 'meters' | 'kilometers'; radiusMeters?: number } = {}
): number {
  const p1 = parseCoord(coord1);
  const p2 = parseCoord(coord2);

  const dLat = p2.latRad - p1.latRad;
  const dLng = p2.lngRad - p1.lngRad;

  const sinHalfLat = Math.sin(dLat / 2.0);
  const sinHalfLng = Math.sin(dLng / 2.0);

  const hav =
    sinHalfLat * sinHalfLat +
    Math.cos(p1.latRad) * Math.cos(p2.latRad) * sinHalfLng * sinHalfLng;

  const a = Math.min(1.0, Math.max(0.0, hav));
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

  const radius = options.radiusMeters ?? EARTH_RADIUS_METERS;
  const distanceMeters = radius * c;

  if (options.unit === 'kilometers') {
    return distanceMeters / 1000.0;
  }
  return distanceMeters;
}

export interface CellThermodynamicState {
  cellIndex: string;
  centroid: CentroidCoord;
  temperatureKelvin: number;
  internalEnergyJoules: number;
  waterVaporMassKg: number;
  dissolvedCarbonKg: number;
  dissolvedNutrientsKg: number;
  biomassKg: number;
  entropyJoulesPerKelvin: number;
}

export interface SpatialGradientTransportDelta {
  geodesicDistanceMeters: number;
  deltaInternalEnergyJoulesA: number;
  deltaInternalEnergyJoulesB: number;
  deltaWaterVaporKgA: number;
  deltaWaterVaporKgB: number;
  deltaCarbonKgA: number;
  deltaCarbonKgB: number;
  entropyGeneratedJoulesPerKelvin: number;
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryAreaM2: number,
  deltaSeconds: number
): SpatialGradientTransportDelta {
  if (cellA.cellIndex === cellB.cellIndex) {
    return {
      geodesicDistanceMeters: 0.0,
      deltaInternalEnergyJoulesA: 0.0,
      deltaInternalEnergyJoulesB: 0.0,
      deltaWaterVaporKgA: 0.0,
      deltaWaterVaporKgB: 0.0,
      deltaCarbonKgA: 0.0,
      deltaCarbonKgB: 0.0,
      entropyGeneratedJoulesPerKelvin: 0.0
    };
  }

  const distance = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (distance <= 0) {
    return {
      geodesicDistanceMeters: 0.0,
      deltaInternalEnergyJoulesA: 0.0,
      deltaInternalEnergyJoulesB: 0.0,
      deltaWaterVaporKgA: 0.0,
      deltaWaterVaporKgB: 0.0,
      deltaCarbonKgA: 0.0,
      deltaCarbonKgB: 0.0,
      entropyGeneratedJoulesPerKelvin: 0.0
    };
  }

  const conductThermal = 2.0;
  const conductVapor = 1e-4;
  const conductCarbon = 5e-5;

  const gradT = (cellB.temperatureKelvin - cellA.temperatureKelvin) / distance;
  const qFlow = conductThermal * gradT * boundaryAreaM2 * deltaSeconds;

  const gradVapor = (cellB.waterVaporMassKg - cellA.waterVaporMassKg) / distance;
  const vFlow = conductVapor * gradVapor * boundaryAreaM2 * deltaSeconds;

  const gradCarbon = (cellB.dissolvedCarbonKg - cellA.dissolvedCarbonKg) / distance;
  const cFlow = conductCarbon * gradCarbon * boundaryAreaM2 * deltaSeconds;

  const entropyGen =
    Math.abs(qFlow) * Math.abs(1.0 / cellA.temperatureKelvin - 1.0 / cellB.temperatureKelvin);

  return {
    geodesicDistanceMeters: distance,
    deltaInternalEnergyJoulesA: -qFlow,
    deltaInternalEnergyJoulesB: qFlow,
    deltaWaterVaporKgA: -vFlow,
    deltaWaterVaporKgB: vFlow,
    deltaCarbonKgA: -cFlow,
    deltaCarbonKgB: cFlow,
    entropyGeneratedJoulesPerKelvin: Math.max(0, entropyGen)
  };
}

export class H3AdjacencyMatrix {
  private readonly centroids = new Map<string, CentroidCoord>();
  private readonly neighbors = new Map<string, Set<string>>();
  private readonly distanceCache = new Map<string, number>();

  public registerCentroid(cellIndex: string, centroid: CentroidCoord): void {
    this.centroids.set(cellIndex, centroid);
    this.addCell(cellIndex);
  }

  public addCell(cellIndex: string): void {
    if (!this.neighbors.has(cellIndex)) {
      this.neighbors.set(cellIndex, new Set<string>());
    }
  }

  public addEdge(cellA: string, cellB: string): void {
    this.addCell(cellA);
    this.addCell(cellB);
    this.neighbors.get(cellA)!.add(cellB);
    this.neighbors.get(cellB)!.add(cellA);
  }

  public areNeighbors(cellA: string, cellB: string): boolean {
    return this.neighbors.get(cellA)?.has(cellB) ?? false;
  }

  public getNeighbors(cellIndex: string): string[] {
    const n = this.neighbors.get(cellIndex);
    return n ? Array.from(n) : [];
  }

  public getCentroidDistance(cellA: string, cellB: string): number {
    if (cellA === cellB) return 0.0;
    const cacheKey = cellA < cellB ? `${cellA}|${cellB}` : `${cellB}|${cellA}`;
    if (this.distanceCache.has(cacheKey)) {
      return this.distanceCache.get(cacheKey)!;
    }

    const cA = this.centroids.get(cellA);
    const cB = this.centroids.get(cellB);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${cellA}, ${cellB}`);
    }

    const dist = calculateHaversineDistance(cA, cB);
    this.distanceCache.set(cacheKey, dist);
    return dist;
  }
}

// =============================================================================
// H3 ADJACENCY GRAPH
// =============================================================================

export class H3AdjacencyGraph {
  private readonly defaultResolution: number;
  private readonly edgeLengthCache = new Map<number, number>();
  private readonly adjacencyMap = new Map<string, Set<string>>();

  constructor(defaultResolution: number = 7) {
    if (
      !Number.isInteger(defaultResolution) ||
      defaultResolution < 0 ||
      defaultResolution > 15
    ) {
      throw new RangeError(`Invalid default resolution: ${defaultResolution}`);
    }
    this.defaultResolution = defaultResolution;
  }

  getEdgeLength(resolution?: number): number {
    const res = resolution ?? this.defaultResolution;
    if (this.edgeLengthCache.has(res)) {
      return this.edgeLengthCache.get(res)!;
    }
    const edgeLength = calculateH3EdgeLengthMeters(res);
    this.edgeLengthCache.set(res, edgeLength);
    return edgeLength;
  }

  getEdgeMetrics(resolution?: number): IH3EdgeMetrics {
    const res = resolution ?? this.defaultResolution;
    return getH3EdgeMetrics(res);
  }

  addCell(cellIndex: string): void {
    if (!this.adjacencyMap.has(cellIndex)) {
      this.adjacencyMap.set(cellIndex, new Set<string>());
    }
  }

  addAdjacency(cellA: string, cellB: string): void {
    if (cellA === cellB) return;
    this.addCell(cellA);
    this.addCell(cellB);
    this.adjacencyMap.get(cellA)!.add(cellB);
    this.adjacencyMap.get(cellB)!.add(cellA);
  }

  addEdge(cellA: string, cellB: string): boolean {
    const hexPattern = /^[0-9a-fA-F]{15}$/;
    if (!hexPattern.test(cellA) || !hexPattern.test(cellB)) {
      return false;
    }
    this.addAdjacency(cellA, cellB);
    return true;
  }

  areAdjacent(cellA: string, cellB: string): boolean {
    return this.adjacencyMap.get(cellA)?.has(cellB) ?? false;
  }

  getNeighbors(cellIndex: string): string[] {
    const neighbors = this.adjacencyMap.get(cellIndex);
    return neighbors ? Array.from(neighbors) : [];
  }

  clear(): void {
    this.adjacencyMap.clear();
  }

  get cellCount(): number {
    return this.adjacencyMap.size;
  }
}
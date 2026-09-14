// =============================================================================
// WEB OF LIFE - SPATIAL SUBSYSTEM: UNIFIED H3 TYPES & INTERFACE METRICS
// Cumulative Retro-Compatibility Engine (Sprint 001 - Sprint 051)
// =============================================================================

import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

export { THERMODYNAMIC_CONSTANTS };

// =============================================================================
// SPRINT 005: ERROR CODES & VALIDATION CONTRACTS
// =============================================================================

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export interface IH3GridService {
  validateIndex(h3Index: string): IH3ValidationResult;
  assertValidIndex(h3Index: string): void;
}

export interface H3ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
}

// =============================================================================
// SPRINT 021 - 028: RESOLUTION TIER CONSTRAINTS
// =============================================================================

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

export interface SpatialResolutionValidator {
  isValidResolution(resolution: number): resolution is H3Resolution;
  assertValidResolution(resolution: number): asserts resolution is H3Resolution;
}

export interface H3SpatialConstraint {
  resolution: H3Resolution;
  index: string;
}

// =============================================================================
// SPRINT 035: SPATIAL GUARD CLAUSE EXCEPTION
// =============================================================================

export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'Spatial guard clause violation') {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export interface IH3GuardContract {
  validatePayload(h3Index: string | null | undefined): asserts h3Index is string;
}

export interface IH3PayloadGuard {
  validate(payload: string | null | undefined): boolean;
}

export interface SpatialGuardContract {
  validateH3Index(payload: unknown): asserts payload is string;
}

export interface IH3PayloadValidator {
  isValidPayload(token: string): boolean;
  assertValidPayload(token: string): void;
}

// =============================================================================
// GEODETIC COORDINATES & CELL INFO
// =============================================================================

export type LatLngCoord = [number, number];

export interface IH3CellInfo {
  h3Index: string;
  resolution: number;
  centerLatLng: LatLngCoord;
  boundaryVertices: LatLngCoord[];
  isPentagon: boolean;
  areaM2: number;
}

// =============================================================================
// SPRINT 045: THERMODYNAMIC CHANNELS & OVERRIDES ENGINE
// =============================================================================

export enum ThermodynamicChannel {
  TEMPERATURE_KELVIN = 0,
  SENSIBLE_HEAT_JOULES = 1,
  WATER_MASS_KG = 2,
  SOIL_ORGANIC_CARBON_KG = 3,
  VEGETATION_BIOMASS_KG = 4,
  ATMOSPHERIC_CO2_KG = 5,
  MINERAL_NITROGEN_KG = 6,
  ALBEDO = 7,
  CHANNEL_COUNT = 8,
}

export interface CellThermodynamicOverride {
  temperatureKelvin?: number;
  sensibleHeatJoules?: number;
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  albedo?: number;
}

export interface CellThermodynamicDeltaRecord {
  h3Index: string;
  cellIndex: number;
  massDeltaKg: number;
  energyDeltaJoules: number;
  thermalEnergyDeltaJoules: number;
  chemicalEnergyDeltaJoules: number;
  overriddenFields: (keyof CellThermodynamicOverride)[];
}

export interface ThermodynamicOverrideReport {
  timestamp: number;
  cellCountModified: number;
  netMassDeltaKg: number;
  netEnergyDeltaJoules: number;
  netThermalEnergyDeltaJoules: number;
  netChemicalEnergyDeltaJoules: number;
  cellReports: CellThermodynamicDeltaRecord[];
}

export type H3ThermodynamicOverridesMap =
  | Map<string, CellThermodynamicOverride>
  | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

// =============================================================================
// SPRINT 050: VERTICAL STRATA & CONTACT AREA CALCULATOR
// =============================================================================

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  planetaryRadiusMeters?: number;
  applyRadialExpansion?: boolean;
  boundaryLengthMeters?: number;
}

export interface IH3BoundaryContactAreaResult {
  contactAreaM2: number;
  boundaryLengthMeters: number;
  overlapHeightMeters: number;
  midPointElevationMeters: number;
  isAdjacent: boolean;
}

export interface IH3BoundaryContactCalculator {
  readonly earthRadiusMeters: number;
  getSharedBoundaryEdgeLength(cellIndexA: string, cellIndexB: string, radiusMeters?: number): number;
  calculateVerticalOverlap(
    stratumA: IVerticalStratum,
    stratumB: IVerticalStratum
  ): { overlapHeightMeters: number; midPointElevationMeters: number };
  calculateBoundaryContactArea(
    cellIndexA: string,
    stratumA: IVerticalStratum,
    cellIndexB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ): IH3BoundaryContactAreaResult;
  clearCache(): void;
}

// =============================================================================
// SPRINT 051: H3 CELL INTERFACE METRICS & LATERAL BOUNDARY OPERATORS
// =============================================================================

/**
 * Metrics describing the shared physical and geometric interface 
 * between two topologically adjacent H3 cells.
 */
export interface H3CellInterfaceMetrics {
  /** Source cell H3 index */
  readonly originIndex: string;

  /** Destination/neighbor cell H3 index */
  readonly neighborIndex: string;

  /**
   * Geodesic length of the shared boundary edge in meters (m).
   * In spherical/ellipsoidal space, this is the length of the Voronoi edge.
   */
  readonly sharedEdgeLengthMeters: number;

  /**
   * Centroid-to-centroid geodesic distance between cells in meters (m).
   */
  readonly centroidDistanceMeters: number;

  /**
   * Azimuth / bearing from origin centroid to neighbor centroid in radians [0, 2π).
   * 0 radians points due North, π/2 East, π South, 3π/2 West.
   */
  readonly bearingRadians: number;

  /**
   * Unit normal vector in local tangent plane (East, North, Up) pointing from origin to neighbor.
   */
  readonly normalVector: readonly [number, number, number];

  /**
   * Effective cross-sectional area of contact for atmospheric boundary layer (m²).
   */
  readonly atmosphericContactAreaM2: number;

  /**
   * Effective cross-sectional area of contact for sub-surface hydrological / soil column (m²).
   */
  readonly subterraneanContactAreaM2: number;

  /**
   * Topographic slope across the interface: (elevation_neighbor - elevation_origin) / centroidDistance.
   * Positive indicates upward incline towards neighbor; negative indicates downward decline.
   */
  readonly topographicSlope: number;

  /**
   * Dimensionless geometric conductance factor: sharedEdgeLength / centroidDistance.
   * Standard scaling factor for 2D finite-volume Laplacian discretization.
   */
  readonly geometricConductance: number;
}

/**
 * Canonical edge key identifying a directed or undirected pair of neighboring H3 cells.
 * Format: `${origin}:${neighbor}`
 */
export type H3EdgeId = string;

/**
 * Immutable mapping of neighbor cell indices to their interface metrics.
 */
export type H3NeighborInterfaceMap = ReadonlyMap<string, H3CellInterfaceMetrics>;

/**
 * Thermodynamic state vector for a spatial cell used in cross-interface flux integration.
 */
export interface CellThermodynamicState {
  waterMassKg: number;
  carbonMassKg: number;
  mineralMassKg: number;
  dissolvedOxygenKg: number;
  enthalpyJoules: number;
  elevationMeters: number;
  temperatureKelvin: number;
  soilDepthMeters: number;
}

/**
 * Discrete flux quantities transferred across a shared interface over a time delta dt.
 */
export interface InterfaceFluxResult {
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnthalpyJoules: number;
  readonly entropyProducedJPerK: number;
}

/**
 * Physical transport parameters governing flux calculation across cell interfaces.
 */
export interface FluxComputationParams {
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
}

/**
 * Factory utility to create and validate an H3CellInterfaceMetrics structure.
 */
export function createH3CellInterfaceMetrics(params: {
  originIndex: string;
  neighborIndex: string;
  sharedEdgeLengthMeters: number;
  centroidDistanceMeters: number;
  bearingRadians: number;
  normalVector: readonly [number, number, number];
  atmosphericContactAreaM2: number;
  subterraneanContactAreaM2: number;
  topographicSlope: number;
  geometricConductance?: number;
}): H3CellInterfaceMetrics {
  if (params.originIndex === params.neighborIndex) {
    throw new Error(`Self-interface is invalid: origin and neighbor are identical (${params.originIndex}).`);
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new Error(`sharedEdgeLengthMeters must be strictly positive, received: ${params.sharedEdgeLengthMeters}`);
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new Error(`centroidDistanceMeters must be strictly positive, received: ${params.centroidDistanceMeters}`);
  }
  if (params.atmosphericContactAreaM2 < 0) {
    throw new Error(`atmosphericContactAreaM2 must be non-negative, received: ${params.atmosphericContactAreaM2}`);
  }
  if (params.subterraneanContactAreaM2 < 0) {
    throw new Error(`subterraneanContactAreaM2 must be non-negative, received: ${params.subterraneanContactAreaM2}`);
  }

  const geometricConductance =
    params.geometricConductance ?? (params.sharedEdgeLengthMeters / params.centroidDistanceMeters);

  return {
    originIndex: params.originIndex,
    neighborIndex: params.neighborIndex,
    sharedEdgeLengthMeters: params.sharedEdgeLengthMeters,
    centroidDistanceMeters: params.centroidDistanceMeters,
    bearingRadians: params.bearingRadians,
    normalVector: params.normalVector,
    atmosphericContactAreaM2: params.atmosphericContactAreaM2,
    subterraneanContactAreaM2: params.subterraneanContactAreaM2,
    topographicSlope: params.topographicSlope,
    geometricConductance,
  };
}

/**
 * Derives reciprocal interface metrics satisfying First and Second Law symmetry invariants:
 * L_ji = L_ij, d_ji = d_ij, n_ji = -n_ij, slope_ji = -slope_ij.
 */
export function createReciprocalInterfaceMetrics(
  metrics: H3CellInterfaceMetrics
): H3CellInterfaceMetrics {
  const reciprocalBearing = (metrics.bearingRadians + Math.PI) % (2.0 * Math.PI);
  const reciprocalNormal: readonly [number, number, number] = [
    -metrics.normalVector[0],
    -metrics.normalVector[1],
    -metrics.normalVector[2],
  ];

  return {
    originIndex: metrics.neighborIndex,
    neighborIndex: metrics.originIndex,
    sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
    centroidDistanceMeters: metrics.centroidDistanceMeters,
    bearingRadians: reciprocalBearing,
    normalVector: reciprocalNormal,
    atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
    subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
    topographicSlope: -metrics.topographicSlope,
    geometricConductance: metrics.geometricConductance,
  };
}

/**
 * Computes conservative interface flux from cell i to cell j across H3CellInterfaceMetrics.
 * Satisfies First-Law conservation and Second-Law non-negative entropy production.
 */
export function computeInterfaceFlux(
  origin: CellThermodynamicState,
  neighbor: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dtSeconds: number,
  params: FluxComputationParams
): InterfaceFluxResult {
  if (metrics.originIndex === metrics.neighborIndex) {
    throw new Error("Self-interface flux calculation is undefined.");
  }

  // 1. Subsurface flux (Darcy flow driven by hydraulic head and topographic slope)
  const hydraulicHeadOrigin = origin.elevationMeters;
  const hydraulicHeadNeighbor = neighbor.elevationMeters;
  const gradHead = (hydraulicHeadNeighbor - hydraulicHeadOrigin) / metrics.centroidDistanceMeters;

  // Downward gradient accelerates flow: q = -K * gradHead
  const qSub = -params.kSatPorous * gradHead;
  const subFlowRateKgPerS = 1000.0 * metrics.subterraneanContactAreaM2 * qSub; // water density 1000 kg/m³
  const deltaWaterSub = subFlowRateKgPerS * dtSeconds;

  // 2. Diffusive thermal flux across atmospheric boundary
  const conductanceArea = metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters;
  const conductiveHeatFlowWatts =
    -params.eddyDiffusivityHeat * conductanceArea * (neighbor.temperatureKelvin - origin.temperatureKelvin);
  const deltaEnthalpy = conductiveHeatFlowWatts * dtSeconds;

  // 3. Second law entropy production: sigma = J_heat * (1/T_neighbor - 1/T_origin) >= 0
  const entropyProduced =
    conductiveHeatFlowWatts *
    (1.0 / neighbor.temperatureKelvin - 1.0 / origin.temperatureKelvin) *
    dtSeconds;

  if (entropyProduced < -1e-9) {
    throw new Error(`Second law violation: negative entropy generated ${entropyProduced}`);
  }

  // 4. Upwind advective scalar concentration
  const netWaterFlux = deltaWaterSub;
  const originWater = Math.max(origin.waterMassKg, 1e-6);
  const neighborWater = Math.max(neighbor.waterMassKg, 1e-6);

  const docRatio = netWaterFlux >= 0
    ? origin.carbonMassKg / originWater
    : neighbor.carbonMassKg / neighborWater;

  const mineralRatio = netWaterFlux >= 0
    ? origin.mineralMassKg / originWater
    : neighbor.mineralMassKg / neighborWater;

  const doRatio = netWaterFlux >= 0
    ? origin.dissolvedOxygenKg / originWater
    : neighbor.dissolvedOxygenKg / neighborWater;

  const deltaCarbon = docRatio * netWaterFlux;
  const deltaMineral = mineralRatio * netWaterFlux;
  const deltaOxygen = doRatio * netWaterFlux;

  return {
    deltaWaterKg: netWaterFlux,
    deltaCarbonKg: deltaCarbon,
    deltaMineralKg: deltaMineral,
    deltaOxygenKg: deltaOxygen,
    deltaEnthalpyJoules: deltaEnthalpy,
    entropyProducedJPerK: Math.max(0, entropyProduced),
  };
}
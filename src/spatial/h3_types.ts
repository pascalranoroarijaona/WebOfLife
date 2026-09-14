/**
 * Spatial H3 Types & Interface Definitions
 * Defines vertical strata, boundary contact geometry, and planetary discretization schemas.
 */

import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

export { THERMODYNAMIC_CONSTANTS };

/**
 * Geometric definition of a vertical stratum for an H3 cell relative to Mean Sea Level (MSL).
 */
export interface IVerticalStratum {
  /** Altitude/elevation of stratum base relative to MSL (meters). */
  readonly zBaseMeters: number;
  /** Altitude/elevation of stratum top relative to MSL (meters). */
  readonly zTopMeters: number;
}

/**
 * Configuration options for calculating H3 boundary contact area.
 */
export interface IH3BoundaryContactAreaOptions {
  /** Custom planetary radius in meters (defaults to WGS84 authalic radius: 6,371,007.2 m). */
  readonly planetaryRadiusMeters?: number;
  /** Whether to apply radial expansion scaling (1 + z / R). Default: true. */
  readonly applyRadialExpansion?: boolean;
  /** Explicit boundary length override in meters (optional, bypasses geodesic lookup). */
  readonly boundaryLengthMeters?: number;
}

/**
 * Detailed output for vertical boundary cross-section calculation.
 */
export interface IH3BoundaryContactAreaResult {
  /** Effective vertical contact area in square meters (m^2). */
  readonly contactAreaM2: number;
  /** Shared lateral boundary length in meters (m). */
  readonly boundaryLengthMeters: number;
  /** Overlapping vertical depth/height in meters (m). */
  readonly overlapHeightMeters: number;
  /** Midpoint elevation of the overlapping interface relative to MSL (meters). */
  readonly midPointElevationMeters: number;
  /** Whether the cells are verified direct topological neighbors. */
  readonly isAdjacent: boolean;
}

/**
 * Interface contract for discrete H3 boundary cross-section calculators.
 */
export interface IH3BoundaryContactCalculator {
  calculateBoundaryContactArea(
    cellIndexA: string,
    stratumA: IVerticalStratum,
    cellIndexB: string,
    stratumB: IVerticalStratum,
    options?: IH3BoundaryContactAreaOptions
  ): IH3BoundaryContactAreaResult;

  getSharedBoundaryEdgeLength(
    cellIndexA: string,
    cellIndexB: string,
    radiusMeters?: number
  ): number;

  calculateVerticalOverlap(
    stratumA: IVerticalStratum,
    stratumB: IVerticalStratum
  ): { overlapHeightMeters: number; midPointElevationMeters: number };
}

/**
 * Coordinate pair representation [latitude, longitude] in degrees.
 */
export type LatLngCoord = [number, number];

/**
 * H3 Cell Surface Descriptor.
 */
export interface IH3CellInfo {
  readonly h3Index: string;
  readonly resolution: number;
  readonly centerLatLng: LatLngCoord;
  readonly boundaryVertices: LatLngCoord[];
  readonly isPentagon: boolean;
  readonly areaM2: number;
}

/**
 * State tensor channels for Float64 contiguous spatial layout
 */
export enum ThermodynamicChannel {
  WATER_MASS_KG = 0,
  SOIL_ORGANIC_CARBON_KG = 1,
  VEGETATION_BIOMASS_KG = 2,
  ATMOSPHERIC_CO2_KG = 3,
  MINERAL_NITROGEN_KG = 4,
  ALBEDO = 5,
  TEMPERATURE_KELVIN = 6,
  SENSIBLE_HEAT_JOULES = 7,
  CHANNEL_COUNT = 8,
}

/**
 * Partial override parameters for discrete H3 cells
 */
export interface CellThermodynamicOverride {
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  albedo?: number;
  temperatureKelvin?: number;
  sensibleHeatJoules?: number;
}

/**
 * Granular ledger record for overridden cells
 */
export interface CellThermodynamicDeltaRecord {
  h3Index: string;
  cellIndex: number;
  massDeltaKg: number;
  energyDeltaJoules: number;
  thermalEnergyDeltaJoules: number;
  chemicalEnergyDeltaJoules: number;
  overriddenFields: (keyof CellThermodynamicOverride)[];
}

/**
 * Report generated upon executing thermodynamic overrides
 */
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

export type H3ResolutionTier =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
}
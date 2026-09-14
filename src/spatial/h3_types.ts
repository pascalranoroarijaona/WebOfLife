// =============================================================================
// WEB OF LIFE - H3 DGGS SPATIAL TYPES
// =============================================================================

/**
 * Valid H3 discrete global grid resolutions (integers 0 to 15).
 */
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3ResolutionTier = H3Resolution;

/**
 * String identifier for an H3 index (hexadecimal representation).
 */
export type H3IndexString = string;

/**
 * Error codes for H3 string validation.
 */
export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
}

/**
 * Domain exception for spatial guard clause violations.
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

/**
 * Spherical coordinate representation.
 */
export interface ISphericalCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Formal metrics interface for an H3 cell edge interface.
 */
export interface IH3EdgeMetrics {
  readonly resolution: number;
  readonly edgeLengthMeters: number;
  readonly boundaryContactAreaMeters2: (columnDepthMeters: number) => number;
  readonly interCellDistanceMeters: number;
}

/**
 * Geometric boundary contact interface between two adjacent H3 cells.
 */
export interface IH3BoundaryInterface {
  readonly resolution: number;
  readonly edgeLengthMeters: number;
  readonly centerDistanceMeters: number;
  calculateContactArea(activeDepthMeters: number): number;
}

/**
 * Exchange delta pair satisfying pairwise anti-symmetry and First Law conservation.
 */
export interface IDiffusionExchangeResult {
  readonly deltaStockSource: number;
  readonly deltaStockTarget: number;
  readonly fluxRate: number;
}

/**
 * Fourier conductive thermal exchange result.
 */
export interface IThermalExchangeResult {
  readonly deltaHeatJoulesSource: number;
  readonly deltaHeatJoulesTarget: number;
  readonly heatFluxRateWattsPerM2: number;
  readonly entropyProductionJoulesPerKelvin: number;
}

/**
 * Hydraulic edge transfer result across adjacent columns.
 */
export interface IHydraulicExchangeResult {
  readonly deltaVolumeM3Source: number;
  readonly deltaVolumeM3Target: number;
  readonly deltaMassKgSource: number;
  readonly deltaMassKgTarget: number;
  readonly volumetricFlowRateM3PerSec: number;
}

// =============================================================================
// SPRINT 045: STATE TENSOR OVERRIDE TYPES & THERMODYNAMIC CHANNELS
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
  CHANNEL_COUNT = 8
}

export const THERMODYNAMIC_CONSTANTS = {
  DEFAULT_REGOLITH_MASS_KG: 50.0,
  MIN_TEMPERATURE_KELVIN: 2.7315,
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6
  }
} as const;

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
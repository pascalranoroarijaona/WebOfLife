// =============================================================================
// WEB OF LIFE - SPATIAL H3 & GEODESIC TYPE DEFINITIONS (UNIFIED RETRO-COMPATIBLE)
// =============================================================================

/**
 * Coordinate pair representing geographic position in decimal degrees.
 */
export interface LatLngCoord {
  readonly lat: number; // Latitude [-90, +90]
  readonly lng: number; // Longitude [-180, +180]
}

/**
 * Alternate coordinate pair supporting 'lon' key naming.
 */
export interface LatLonCoord {
  readonly lat: number; // Latitude [-90, +90]
  readonly lon: number; // Longitude [-180, +180]
}

/**
 * Centroid distance query configuration options.
 */
export interface GeodesicDistanceOptions {
  /**
   * Planetary reference radius in meters.
   * Defaults to EARTH_RADIUS_METERS (6,371,007 m).
   */
  readonly radiusMeters?: number;

  /**
   * Desired distance unit: 'meters' | 'kilometers'.
   * Defaults to 'meters'.
   */
  readonly unit?: 'meters' | 'kilometers';
}

/**
 * Geographic polygon representation of an H3 cell facet.
 */
export interface H3CellBoundary {
  readonly cellIndex: string;
  readonly vertices: LatLngCoord[];
}

/**
 * Canonical H3 index string identifier representation.
 */
export type H3Index = string;

/**
 * Structural descriptor for an active H3 cell.
 */
export interface H3Cell {
  readonly index: string;
  readonly resolution: number;
  readonly mode?: number;
}

/**
 * Contract for token extraction from unstructured payload text.
 */
export interface IH3TokenExtractor {
  extractTokens(text: string): string[];
}

/**
 * Enumeration of standardized H3 spatial validation error codes.
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
  ERR_H3_OUT_OF_RANGE = 0x06,
}

/**
 * Domain-specific exception thrown on spatial guard clause violations.
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

/**
 * H3 grid query configuration parameters.
 */
export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

/**
 * Cell metadata container for H3 grid engines.
 */
export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid?: { lat: number; lng: number };
  boundary?: Array<{ lat: number; lng: number }>;
  areaKm2?: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

/**
 * Structural validation result for H3 indices.
 */
export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string | H3ErrorCode;
  resolution?: number;
  baseCell?: number;
}

/**
 * Typed validation result contract.
 */
export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

/**
 * Resolution tier validation interface contract.
 */
export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): void;
}

/**
 * H3 valid resolution tier literal union type (0 through 15).
 */
export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * Type alias for H3 numerical resolution.
 */
export type H3Resolution = number;

/**
 * Contiguous channel layout definition for H3StateTensor.
 */
export enum ThermodynamicChannel {
  TEMPERATURE_KELVIN = 0,
  WATER_MASS_KG = 1,
  SOIL_ORGANIC_CARBON_KG = 2,
  VEGETATION_BIOMASS_KG = 3,
  ATMOSPHERIC_CO2_KG = 4,
  MINERAL_NITROGEN_KG = 5,
  ALBEDO = 6,
  SENSIBLE_HEAT_JOULES = 7,
  CHANNEL_COUNT = 8,
}

/**
 * Partial thermodynamic override payload per cell.
 */
export interface CellThermodynamicOverride {
  temperatureKelvin?: number;
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  albedo?: number;
  sensibleHeatJoules?: number;
}

/**
 * Individual cell delta report produced by applyThermodynamicOverrides.
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
 * Consolidated ledger report produced by applyThermodynamicOverrides.
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

/**
 * Key-value mapping of H3 indices to their respective partial overrides.
 */
export type H3ThermodynamicOverridesMap =
  | Map<string, CellThermodynamicOverride>
  | Record<string, CellThermodynamicOverride>;

/**
 * Execution options for partial thermodynamic override applications.
 */
export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

/**
 * Thermodynamic and specific heat constants for state tensor calculations.
 */
export const THERMODYNAMIC_CONSTANTS = {
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
  SPECIFIC_HEAT: {
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
    REGOLITH: 840.0,
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
    REGOLITH: 0.0,
  },
  STEFAN_BOLTZMANN: 5.670374419e-8,
  SOLAR_CONSTANT_TOA: 1361.0,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: 8.314462618,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
};
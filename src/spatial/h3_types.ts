/**
 * Web of Life - H3 Types and Unified Thermodynamic/DGGS Contracts
 * Retro-compatible across Sprints 001 - 049
 */

// =============================================================================
// SPRINT 005 & SPRINT 006: ERROR CODES
// =============================================================================

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

// =============================================================================
// SPRINT 035: GUARD CLAUSE EXCEPTIONS
// =============================================================================

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

// =============================================================================
// SPRINT 021 - 028: RESOLUTION TIERS
// =============================================================================

export type H3Resolution =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3ResolutionTier = H3Resolution;

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

// =============================================================================
// SPRINT 048: BOUNDARY CALCULATOR CONTRACT
// =============================================================================

export interface IH3BoundaryCalculator {
  calculateSharedBoundaryLength(originId: string, neighborId: string): number;
  calculateSharedBoundary?(a: string, b: string): any;
}

// =============================================================================
// SPRINT 045: THERMODYNAMIC CHANNELS & CONSTANTS
// =============================================================================

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

export const THERMODYNAMIC_CONSTANTS = {
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 10_000.0,
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
  },
} as const;

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
// SPRINT 049: TOPOLOGY & FLUX CONTRACTS
// =============================================================================

export interface H3CellDecomposition {
  readonly mode: number;
  readonly reserved: number;
  readonly resolution: number;
  readonly baseCell: number;
  readonly digits: readonly number[];
  readonly isPentagon: boolean;
}

export interface IH3TopologyValidator {
  isPentagon(h3Index: string | bigint): boolean;
  getBaseCell(h3Index: string | bigint): number;
  getResolution(h3Index: string | bigint): number;
  getCoordinationNumber(h3Index: string | bigint): 5 | 6;
  decompose(h3Index: string | bigint): H3CellDecomposition;
  validateIndex(h3Index: string | bigint): void;
}

export interface FluxStencil {
  readonly sourceCell: string | bigint;
  readonly targetCell: string | bigint;
  readonly contactAreaM2?: number;
  readonly dtSeconds?: number;
  readonly sourceConcentration?: number;
  readonly targetConcentration?: number;
  readonly diffusionCoeff?: number;
  readonly velocityNormal?: number;
}

export interface Flux {
  readonly massFlux: number;
  readonly energyFlux: number;
  readonly isPentagonalInterface: boolean;
  readonly effectiveAreaM2: number;
}
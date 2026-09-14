/**
 * Discrete Global Grid System (H3 DGGS) Type Definitions
 * Specification: RFC-044 & Historical Multi-Sprint Retro-Compatibility
 */

// =============================================================================
// HISTORICAL ERROR CODES & RESOLUTION TIERS (Sprints 001 - 041)
// =============================================================================

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'Spatial guard clause violation') {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;

export type H3Index = string;

export interface H3Cell {
  index: string;
  resolution: number;
  mode?: number;
}

export interface IH3TokenExtractor {
  extractTokens?(text: string): string[];
  parseTokens?(input: string): H3Index[];
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid?: { lat: number; lng: number };
  boundary?: Array<{ lat: number; lng: number }>;
  areaKm2?: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  code?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
}

export type IH3ValidationResult = H3ValidationResult;

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): void;
}

// =============================================================================
// SPRINT 043 & 044 DGGS SPECIFICATIONS
// =============================================================================

export interface IH3CellCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface IThermodynamicAtmosphereStock {
  readonly nitrogenMoles: number;    // N2
  readonly oxygenMoles: number;      // O2
  readonly co2Moles: number;         // CO2
  readonly waterVaporMoles: number;  // H2O (g)
  readonly surfacePressurePa: number; // Pa
}

export interface IThermodynamicHydrosphereStock {
  readonly liquidWaterKg: number;    // H2O (l)
  readonly iceKg: number;            // H2O (s)
  readonly salinityPsu: number;       // PSU
}

export interface IThermodynamicLithosphereStock {
  readonly soilOrganicCarbonKg: number;
  readonly inorganicMineralKg: number;
  readonly soilMoistureKg: number;
}

export interface IThermodynamicBiosphereStock {
  readonly autotrophBiomassKg: number;
  readonly heterotrophBiomassKg: number;
  readonly detritusKg: number;
}

export interface IH3CellThermodynamicState {
  // Common Temperature
  readonly temperatureKelvin: number;

  // Sprint 043 Properties
  cellIndex?: string;
  atmosphericCarbon?: number;
  organicCarbon?: number;
  biomassStocks?: Record<string, number>;
  waterMassKg?: number;
  enthalpyJoules?: number;

  // Sprint 044 Properties
  readonly h3Index?: string;
  readonly resolution?: number;
  readonly areaM2?: number;
  readonly atmosphere?: IThermodynamicAtmosphereStock;
  readonly hydrosphere?: IThermodynamicHydrosphereStock;
  readonly lithosphere?: IThermodynamicLithosphereStock;
  readonly biosphere?: IThermodynamicBiosphereStock;
  readonly internalEnergyJoules?: number;
  readonly entropyJoulesPerKelvin?: number;
}

export interface IH3CellStateOverrides {
  readonly temperatureKelvin?: number;
  readonly atmosphere?: Partial<IThermodynamicAtmosphereStock>;
  readonly hydrosphere?: Partial<IThermodynamicHydrosphereStock>;
  readonly lithosphere?: Partial<IThermodynamicLithosphereStock>;
  readonly biosphere?: Partial<IThermodynamicBiosphereStock>;
  readonly internalEnergyJoules?: number;
  readonly entropyJoulesPerKelvin?: number;
}

export interface ISpatialMonad<T> {
  readonly value: T;
  map<B>(fn: (state: T) => B): ISpatialMonad<B>;
  flatMap<B>(fn: (state: T) => ISpatialMonad<B>): ISpatialMonad<B>;
}
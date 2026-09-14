// =============================================================================
// WEB OF LIFE - H3 SPATIAL INDEXING & GEODESIC TYPES
// Cumulative Retro-Compatibility: Sprints 001 - 053
// =============================================================================

export type H3Index = string;
export type Resolution = number;
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export interface GeodesicCoordinate {
  readonly latDeg: number;
  readonly lonDeg: number;
}

export interface SphericalCoordinateRad {
  readonly phiRad: number;
  readonly lambdaRad: number;
}

export interface AdjacencyVector {
  readonly sourceIndex: H3Index;
  readonly neighborIndex: H3Index;
  readonly distanceMeters: number;
  readonly azimuthDegrees: number;
  readonly interfaceLengthMeters: number;
}

/**
 * Universal CellThermodynamicState accommodating both sprint_053 simple transport
 * and historical multi-layer state variables.
 */
export interface CellThermodynamicState {
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  temperatureKelvin?: number;
  conductivity?: number;
  heightColumnMeters?: number;
  h3Index?: string;
  mineralsKg?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
}

export interface DiffusiveFluxExchange {
  readonly deltaEnergyJoules: number;
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralKg: number;
}

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

export type UnitVector3D = [number, number, number];

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: UnitVector3D;
  surfaceAreaM2: number;
}

export interface CellBiophysicalState {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  areaM2: number;
  albedo: number;
  lai: number;
  tauAtm: number;
  stocks: {
    thermalEnergyJoules: number;
    carbonDioxideKg: number;
    biomassCarbonKg: number;
    atmosphericWaterKg: number;
    oxygenKg: number;
  };
}

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, CellBiophysicalState>;
}

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
  DEFAULT_REGOLITH_MASS_KG: 1000.0,
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
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

export interface H3CellInterfaceMetrics {
  originIndex: string;
  neighborIndex: string;
  sharedEdgeLengthMeters: number;
  centroidDistanceMeters: number;
  bearingRadians: number;
  normalVector: [number, number, number];
  atmosphericContactAreaM2: number;
  subterraneanContactAreaM2: number;
  topographicSlope: number;
  geometricConductance: number;
}

export function createH3CellInterfaceMetrics(params: {
  originIndex: string;
  neighborIndex: string;
  sharedEdgeLengthMeters: number;
  centroidDistanceMeters: number;
  bearingRadians: number;
  normalVector: [number, number, number];
  atmosphericContactAreaM2: number;
  subterraneanContactAreaM2: number;
  topographicSlope: number;
}): H3CellInterfaceMetrics {
  if (params.originIndex === params.neighborIndex) {
    throw new Error('Self-interface is invalid');
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new Error('sharedEdgeLengthMeters must be strictly positive');
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new Error('centroidDistanceMeters must be strictly positive');
  }
  return {
    ...params,
    geometricConductance: params.sharedEdgeLengthMeters / params.centroidDistanceMeters,
  };
}

export function createReciprocalInterfaceMetrics(metrics: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  return {
    originIndex: metrics.neighborIndex,
    neighborIndex: metrics.originIndex,
    sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
    centroidDistanceMeters: metrics.centroidDistanceMeters,
    bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
    normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
    atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
    subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
    topographicSlope: -metrics.topographicSlope,
    geometricConductance: metrics.geometricConductance,
  };
}

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
}

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const dist = metrics.centroidDistanceMeters;
  const areaSub = metrics.subterraneanContactAreaM2;
  const areaAtm = metrics.atmosphericContactAreaM2;

  const kSat = params.kSatPorous ?? 1e-4;
  const waterA = stateA.waterMassKg ?? stateA.waterKg ?? 0;
  const waterB = stateB.waterMassKg ?? stateB.waterKg ?? 0;
  const waterGrad = (waterA - waterB) / dist;
  const deltaWater = kSat * waterGrad * areaSub * dt * 0.01;

  const carbonA = stateA.carbonMassKg ?? stateA.carbonKg ?? 0;
  const carbonB = stateB.carbonMassKg ?? stateB.carbonKg ?? 0;
  const carbonGrad = (carbonA - carbonB) / dist;
  const deltaCarbon = kSat * carbonGrad * areaSub * dt * 0.01;

  const mineralA = stateA.mineralMassKg ?? stateA.mineralKg ?? stateA.mineralsKg ?? 0;
  const mineralB = stateB.mineralMassKg ?? stateB.mineralKg ?? stateB.mineralsKg ?? 0;
  const mineralGrad = (mineralA - mineralB) / dist;
  const deltaMineral = kSat * mineralGrad * areaSub * dt * 0.01;

  const tA = stateA.temperatureKelvin ?? 290.0;
  const tB = stateB.temperatureKelvin ?? 290.0;
  const heatCond = params.eddyDiffusivityHeat ?? 15.0;
  const deltaEnthalpy = heatCond * (areaAtm / dist) * (tA - tB) * dt;

  let entropyProduced = 0;
  if (tA > 0 && tB > 0 && Math.abs(deltaEnthalpy) > 0) {
    entropyProduced = Math.abs(deltaEnthalpy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
  }

  return {
    deltaWaterKg: -deltaWater,
    deltaCarbonKg: -deltaCarbon,
    deltaMineralKg: -deltaMineral,
    deltaEnthalpyJoules: -deltaEnthalpy,
    entropyProducedJPerK: entropyProduced,
  };
}
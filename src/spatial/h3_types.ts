/**
 * Web of Life - Spatial H3 Types & Cumulative Interfaces
 * Cumulative Specifications: Sprints 001 - 056
 */

export interface ICoordinatePair {
  lat: number;
  lon: number;
}

export interface IGeodeticCoordinates {
  latitude: number;
  longitude: number;
}

export type GeodesicCoordinate = {
  latDeg: number;
  lonDeg: number;
};

export interface SphericalCoordinateRad {
  phiRad: number;
  lambdaRad: number;
}

export type H3Index = string;
export type Resolution = number;

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export interface CoordinateValidationOptions {
  context?: string;
  allowNormalizedPositiveLon?: boolean;
  epsilon?: number;
}

export interface BiogeochemicalStock {
  carbonKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  waterKg: number;
  oxygenKg: number;
  thermalJoules: number;
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: BiogeochemicalStock;
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export interface NeighborDistanceResult<T = unknown> {
  item: T;
  distanceMeters: number;
}

export enum ThermodynamicChannel {
  WATER_MASS_KG = 0,
  SOIL_ORGANIC_CARBON_KG = 1,
  VEGETATION_BIOMASS_KG = 2,
  ATMOSPHERIC_CO2_KG = 3,
  MINERAL_NITROGEN_KG = 4,
  TEMPERATURE_KELVIN = 5,
  SENSIBLE_HEAT_JOULES = 6,
  ALBEDO = 7,
  CHANNEL_COUNT = 8,
}

export const THERMODYNAMIC_CONSTANTS = Object.freeze({
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
  SPECIFIC_HEAT: Object.freeze({
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
    REGOLITH: 840.0,
  }),
  SPECIFIC_ENTHALPY: Object.freeze({
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.5e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  }),
});

export interface CellThermodynamicOverride {
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  temperatureKelvin?: number;
  sensibleHeatJoules?: number;
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

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
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

export interface FluxComputationParams {
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
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

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
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

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const dElev = (stateB.elevationMeters ?? 0) - (stateA.elevationMeters ?? 0);
  const hydraulicGrad = dElev / metrics.centroidDistanceMeters + metrics.topographicSlope;

  const waterTransferRate = params.kSatPorous * metrics.subterraneanContactAreaM2 * hydraulicGrad;
  const deltaWaterKg = waterTransferRate * 1000.0 * dt;

  const waterA = Math.max(1, stateA.waterMassKg ?? 1);
  const carbonConcA = (stateA.carbonMassKg ?? 0) / waterA;
  const mineralConcA = (stateA.mineralMassKg ?? 0) / waterA;

  const deltaCarbonKg = deltaWaterKg * carbonConcA * 0.01;
  const deltaMineralKg = deltaWaterKg * mineralConcA * 0.01;

  const tempA = stateA.temperatureKelvin ?? 288.15;
  const tempB = stateB.temperatureKelvin ?? 288.15;
  const dTemp = tempB - tempA;
  const heatFluxWatts = params.eddyDiffusivityHeat * metrics.atmosphericContactAreaM2 * (dTemp / metrics.centroidDistanceMeters);
  const deltaEnthalpyJoules = heatFluxWatts * dt;

  const entropyProducedJPerK = Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));

  return {
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    deltaEnthalpyJoules,
    entropyProducedJPerK,
  };
}
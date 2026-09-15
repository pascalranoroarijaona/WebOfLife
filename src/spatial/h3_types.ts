// =============================================================================
// WEB OF LIFE - SPATIAL H3 TYPINGS & INTERFACE NORMAL SPECIFICATION
// Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 067)
// =============================================================================

import {
  EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS as CONST_MEAN_EARTH_RADIUS_METERS,
} from "../thermodynamics/constants.js";

export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const MEAN_EARTH_RADIUS_METERS = CONST_MEAN_EARTH_RADIUS_METERS;

export type H3Index = string;
export type Cartesian3D = readonly [number, number, number];

export type Vector3Tuple = [number, number, number] | readonly [number, number, number];
export type Vec3D = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  0: number;
  1: number;
  2: number;
  length: number;
  [index: number]: number;
}

export type Vector3DInput =
  | Vector3Object
  | Vector3Tuple
  | Vec3D
  | [number, number, number]
  | Vector3D
  | { x?: number; y?: number; z?: number; [index: number]: number | undefined }
  | Record<string, any>;

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = "Spatial Guard Clause Exception") {
    super(message);
    this.name = "SpatialGuardClauseException";
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;
export type Resolution = H3ResolutionTier;

export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  [key: string]: number | undefined;
}

export interface ThermodynamicStocks {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  carbon?: number;
  water?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  thermalEnergy?: number;
  [key: string]: number | undefined;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  [key: string]: number | undefined;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  temperatureKelvin?: number;
  temperatureK?: number;
  energyJoules?: number;
  internalEnergyJoules?: number;
  enthalpyJoules?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  [key: string]: any;
}

export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
}

export interface ILateralTransportParams {
  timeStepSeconds: number;
  normalVelocityMs: number;
  fluidDensityKgM3?: number;
  thermalConductivityWMK?: number;
  distanceCentroidsMeters?: number;
  temperatureKelvinA?: number;
  temperatureKelvinB?: number;
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
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

export const THERMODYNAMIC_CONSTANTS = {
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
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
    VEGETATION_BIOMASS: -17.5e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  },
};

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

export interface DiffusionCoefficients {
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  thermalConductivity?: number;
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
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
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
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
    throw new Error("Self-interface is invalid");
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new Error("sharedEdgeLengthMeters must be strictly positive");
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new Error("centroidDistanceMeters must be strictly positive");
  }

  const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;

  return {
    ...params,
    geometricConductance,
  };
}

export function createReciprocalInterfaceMetrics(metrics: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  return {
    originIndex: metrics.neighborIndex,
    neighborIndex: metrics.originIndex,
    sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
    centroidDistanceMeters: metrics.centroidDistanceMeters,
    bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
    normalVector: [
      -metrics.normalVector[0],
      -metrics.normalVector[1],
      -metrics.normalVector[2],
    ],
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
): {
  deltaWaterKg: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  deltaOxygenKg: number;
  deltaEnthalpyJoules: number;
  entropyProducedJPerK: number;
} {
  const dist = metrics.centroidDistanceMeters;
  const areaAtm = metrics.atmosphericContactAreaM2;
  const areaSub = metrics.subterraneanContactAreaM2;

  const slope = metrics.topographicSlope;
  const kSat = params.kSatPorous ?? 1e-4;
  const hydGrad = slope + ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0)) / (1000 * dist);
  const waterFlowRateKgS = 1000 * kSat * hydGrad * areaSub * 0.01;
  const deltaWaterKg = waterFlowRateKgS * dt;

  const cFracA = (stateA.carbonMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
  const cFracB = (stateB.carbonMassKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
  const upwindCFrac = deltaWaterKg >= 0 ? cFracA : cFracB;
  const deltaCarbonKg = deltaWaterKg * upwindCFrac;

  const mFracA = (stateA.mineralMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
  const mFracB = (stateB.mineralMassKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
  const upwindMFrac = deltaWaterKg >= 0 ? mFracA : mFracB;
  const deltaMineralKg = deltaWaterKg * upwindMFrac;

  const oFracA = (stateA.dissolvedOxygenKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
  const oFracB = (stateB.dissolvedOxygenKg ?? 0) / Math.max(1, stateB.waterMassKg ?? 1);
  const upwindOFrac = deltaWaterKg >= 0 ? oFracA : oFracB;
  const deltaOxygenKg = deltaWaterKg * upwindOFrac;

  const tempA = stateA.temperatureKelvin ?? 290.0;
  const tempB = stateB.temperatureKelvin ?? 290.0;
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;
  const heatFluxW = kHeat * ((tempA - tempB) / dist) * areaAtm;
  const deltaEnthalpyJoules = heatFluxW * dt + deltaWaterKg * 4184 * (deltaWaterKg >= 0 ? tempA : tempB);

  const deltaT = tempA - tempB;
  const entropyProducedJPerK = kHeat * areaAtm * ((deltaT * deltaT) / (tempA * tempB * dist)) * dt;

  return {
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    deltaOxygenKg,
    deltaEnthalpyJoules,
    entropyProducedJPerK: Math.max(0, entropyProducedJPerK),
  };
}

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: [number, number, number];
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

export interface CellFacetState {
  massDry: number;
  massWater: number;
  massCarbon: number;
  massOxygen: number;
  massMineral: number;
  thermalEnergy: number;
  temperature: number;
  volume: number;
  centroid: Vector3D;
}

// RFC-067 Declarations
export interface DetailedInterfaceNormalResult {
  readonly normal: readonly [number, number, number];
  readonly arcLengthMeters: number;
  readonly alignmentCos: number;
}

export interface CellMetric {
  readonly h3Index: H3Index;
  readonly resolution: number;
  readonly centroidLatLon: readonly [number, number];
  readonly centroidCartesian: Cartesian3D;
  readonly areaM2: number;
  readonly characteristicLengthM: number;
}

export interface SpatialFlux {
  readonly sourceIndex: H3Index;
  readonly targetIndex: H3Index;
  readonly interfaceNormal: DetailedInterfaceNormalResult;
  readonly massFluxKgPerS: number;
  readonly thermalFluxW: number;
}

export interface InterfaceFluxState {
  readonly massAirKg: number;
  readonly massWaterKg: number;
  readonly massCarbonKg: number;
  readonly massOxygenKg: number;
  readonly massMineralsKg: number;
  readonly thermalEnergyJoules: number;
}

export interface CellGeometryState {
  readonly centroid: Cartesian3D;
  readonly volumeM3: number;
  readonly columnHeightM: number;
  readonly stocks: InterfaceFluxState;
}

export interface InterfaceAdvectionTransferResult {
  readonly deltaOrigin: InterfaceFluxState;
  readonly deltaDestination: InterfaceFluxState;
  readonly entropyGeneratedJPerK: number;
}
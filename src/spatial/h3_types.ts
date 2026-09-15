// =============================================================================
// WEB OF LIFE - SPATIAL TOPOLOGY TYPES & MANIFOLD METRICS
// Unified Retro-Compatible Specifications (Sprints 002 - 068)
// =============================================================================

export type Vec3 = [number, number, number];
export type Vec3D = Vec3;

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  0: number;
  1: number;
  2: number;
  [index: number]: number;
  [key: string]: any;
}

export type Vector3DInput =
  | Vector3D
  | Vec3
  | [number, number, number]
  | { x: number; y: number; z: number }
  | { [key: string]: any };

export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface BoundaryEdge3D {
  readonly v1: Vec3;
  readonly v2: Vec3;
  readonly lengthMeters: number;
}

export interface SharedBoundaryEdge3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly v1: Vec3;
  readonly v2: Vec3;
  readonly midpoint: Vec3;
  readonly normalAtoB: Vec3;
  readonly lengthMeters: number;
}

export interface BoundaryGeometry3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly v1: Vec3;
  readonly v2: Vec3;
  readonly midpoint: Vec3;
  readonly lengthMeters: number;
  readonly normalAtoB: Vec3;
  readonly distanceMeters: number;
  readonly facetAreaMeters2: number;
}

export interface CellThermodynamicState {
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  enthalpyJoules?: number;
  temperatureKelvin?: number;
  volumeM3?: number;
  h3Index?: string;
  cellIndex?: string;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  conductivity?: number;
  heightColumnMeters?: number;
  centroid?: { lat: number; lng: number };
  [key: string]: any;
}

export interface BoundaryDeltaStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massMineralsKg: number;
  massOxygenKg: number;
  enthalpyJoules: number;
  temperatureKelvin: number;
  volumeM3: number;
  [key: string]: any;
}

export interface BoundaryFluxTransferResult {
  deltaCellA: BoundaryDeltaStocks;
  deltaCellB: BoundaryDeltaStocks;
  entropyGenerationJoulesPerKelvin: number;
}

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06,
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  [key: string]: any;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  [key: string]: any;
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

export type UnitVector3D = [number, number, number] | { x: number; y: number; z: number };

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
    [key: string]: any;
  };
}

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, any>;
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
    VEGETATION_BIOMASS: -17.50e6,
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
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

export interface InterfaceFluxResult {
  deltaWaterKg: number;
  deltaEnthalpyJoules: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  entropyProducedJPerK: number;
}

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams = {}
): InterfaceFluxResult {
  const dDist = Math.max(1e-3, metrics.centroidDistanceMeters);
  const diffK = params.eddyDiffusivityHeat ?? 15.0;

  const tempA = stateA.temperatureKelvin ?? 290.0;
  const tempB = stateB.temperatureKelvin ?? 290.0;
  const deltaT = tempB - tempA;

  const heatFluxWatts = diffK * (deltaT / dDist) * metrics.atmosphericContactAreaM2;
  const deltaEnthalpy = heatFluxWatts * dt;

  const waterHeadA = (stateA.waterMassKg ?? 0) / 1000.0;
  const waterHeadB = (stateB.waterMassKg ?? 0) / 1000.0;
  const headGrad = (waterHeadB - waterHeadA) / dDist + metrics.topographicSlope;
  const waterFluxKg = (params.kSatPorous ?? 1e-4) * headGrad * metrics.subterraneanContactAreaM2 * 1000.0 * dt;

  const carbonA = stateA.carbonMassKg ?? 0;
  const carbonB = stateB.carbonMassKg ?? 0;
  const carbonFluxKg = 1e-5 * ((carbonB - carbonA) / dDist) * metrics.atmosphericContactAreaM2 * dt;

  const mineralA = stateA.mineralMassKg ?? 0;
  const mineralB = stateB.mineralMassKg ?? 0;
  const mineralFluxKg = 1e-6 * ((mineralB - mineralA) / dDist) * metrics.subterraneanContactAreaM2 * dt;

  const tHigh = Math.max(tempA, tempB);
  const tLow = Math.max(1e-3, Math.min(tempA, tempB));
  const entropyProduced = Math.abs(deltaEnthalpy) * (1.0 / tLow - 1.0 / tHigh);

  return {
    deltaWaterKg: waterFluxKg,
    deltaEnthalpyJoules: deltaEnthalpy,
    deltaCarbonKg: carbonFluxKg,
    deltaMineralKg: mineralFluxKg,
    entropyProducedJPerK: entropyProduced,
  };
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

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  [key: string]: any;
}
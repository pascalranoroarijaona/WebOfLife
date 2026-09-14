// =============================================================================
// WEB OF LIFE - SPATIAL GEODESIC DISCRETE GLOBAL GRID SYSTEM (DGGS) TYPES
// Unified Retro-Compatibility Specification (Sprints 002 - 064)
// =============================================================================

export type Vector3Tuple = [number, number, number] & {
  x?: number;
  y?: number;
  z?: number;
};

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
  0?: number;
  1?: number;
  2?: number;
  [index: number]: number | undefined;
}

export type Vector3D = Vector3Tuple | Vector3Object;
export type Vec3D = [number, number, number];
export type Vector3DInput = Vector3D;
export type UnitVector3D = [number, number, number];

export type H3Index = string;
export type Resolution = number;
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3ResolutionTier = H3Resolution;

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

export interface CellSpatialState {
  h3Index: H3Index;
  centroid: Vector3Tuple;
  volumeM3?: number;
  temperatureK?: number;
  stocks?: Record<string, number>;
}

export interface AdvectiveFluxTransferResult {
  effectiveVelocity: number;
  volumetricFlowRate: number;
  volumetricVolumeTransferred: number;
  massDeltas: Record<string, number>;
  sourceNetDelta: Record<string, number>;
  targetNetDelta: Record<string, number>;
}

export interface EnthalpyTransferResult {
  deltaH: number;
  effectiveVelocity: number;
  entropyGenerationUniverse: number;
}

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  nitrogenKg?: number;
  phosphorusKg?: number;
  thermalEnergyJoules?: number;
  energyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  [key: string]: number | undefined;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  deltaNitrogenKg?: number;
  deltaPhosphorusKg?: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  temperatureK?: number;
  soilDepthMeters?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  energyJoules?: number;
  internalEnergyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  volumeM3?: number;
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
  fluidDensityKgM3: number;
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
  planetaryRadiusMeters?: number;
}

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, any>;
}

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

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
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
    throw new RangeError('sharedEdgeLengthMeters must be strictly positive');
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new RangeError('centroidDistanceMeters must be strictly positive');
  }

  const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
  return {
    ...params,
    geometricConductance,
  };
}

export function createReciprocalInterfaceMetrics(m: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  return {
    originIndex: m.neighborIndex,
    neighborIndex: m.originIndex,
    sharedEdgeLengthMeters: m.sharedEdgeLengthMeters,
    centroidDistanceMeters: m.centroidDistanceMeters,
    bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
    normalVector: [-m.normalVector[0], -m.normalVector[1], -m.normalVector[2]],
    atmosphericContactAreaM2: m.atmosphericContactAreaM2,
    subterraneanContactAreaM2: m.subterraneanContactAreaM2,
    topographicSlope: -m.topographicSlope,
    geometricConductance: m.geometricConductance,
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
  const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
  const slope = dElev / metrics.centroidDistanceMeters;

  const kSat = params.kSatPorous ?? 1e-4;
  const waterHeadDiff = (stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0);
  const waterFlowRate = kSat * (waterHeadDiff / metrics.centroidDistanceMeters + slope) * metrics.subterraneanContactAreaM2;
  const deltaWaterKg = waterFlowRate * dt;

  const carbonFrac = (stateA.carbonMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
  const deltaCarbonKg = deltaWaterKg * carbonFrac * 0.1;

  const mineralFrac = (stateA.mineralMassKg ?? 0) / Math.max(1, stateA.waterMassKg ?? 1);
  const deltaMineralKg = deltaWaterKg * mineralFrac * 0.1;

  const tempA = stateA.temperatureKelvin ?? 288.15;
  const tempB = stateB.temperatureKelvin ?? 288.15;
  const eddyK = params.eddyDiffusivityHeat ?? 15.0;
  const heatFlux = eddyK * ((tempA - tempB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2;
  const deltaEnthalpyJoules = heatFlux * dt;

  let entropyProducedJPerK = 0;
  if (tempA > 0 && tempB > 0 && Math.abs(deltaEnthalpyJoules) > 0) {
    entropyProducedJPerK = Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
  }

  return {
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    deltaEnthalpyJoules,
    entropyProducedJPerK,
  };
}

export interface ThermodynamicStocks {
  internalEnergyJ: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
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
  thermal?: number;
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
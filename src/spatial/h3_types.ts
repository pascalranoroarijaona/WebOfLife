// =============================================================================
// WEB OF LIFE - SPATIAL GEOMETRY & DGGS TOPOLOGY TYPES (SPRINTS 001 - 075)
// =============================================================================

import { THERMODYNAMIC_CONSTANTS as TC } from '../thermodynamics/constants.js';

export { TC as THERMODYNAMIC_CONSTANTS };

/**
 * 64-bit hexadecimal string representation of an canonical H3 cell index.
 */
export type H3Index = string;

/**
 * Valid topological coordination number on an icosahedral hexagonal geodesic grid.
 * 5 for pentagonal singularities (12 global), 6 for all regular hexagonal cells.
 */
export type CoordinationNumber = 5 | 6;

/**
 * Permissible H3 resolution tiers (0 through 15).
 */
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;
export type Resolution = number;

/**
 * 3D vector and coordinate representations.
 */
export type Vec3 = [number, number, number] | { x: number; y: number; z: number };
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number];
export type Point2D = [number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
  [key: string]: any;
  [index: number]: any;
}

export type Vector3D = any;
export type Vector3DInput = any;
export type Cartesian3D = any;

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

/**
 * Error hierarchy and codes for spatial validation.
 */
export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

/**
 * Extensive conservative thermodynamic stock vector S_i in R^5_>=0.
 */
export interface ThermodynamicStockVector {
  water: number;    // kg
  carbon: number;   // mol C
  oxygen: number;   // mol O2
  minerals: number; // kg NPK
  enthalpy: number; // J
}

export type ThermodynamicStockState = ThermodynamicStockVector;

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  energyJoules?: number;
}

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  joules?: number;
  entropy?: number;
  carbonStockKg?: number;
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
  biomassJoules?: number;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon?: boolean;
  centroid?: Vector3DInput | { lat: number; lng: number } | { x: number; y: number; z: number };
  volumeM3?: number;
  energyJoules?: number;
  internalEnergyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyMJ?: number;
  thermalEnergyJoules?: number;
  temperatureKelvin?: number;
  temperatureK?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  enthalpyJoules?: number;
  dissolvedOxygenKg?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
}

export interface SpatialFluxState {
  readonly cellIndex: H3Index;
  readonly stocks: Readonly<ThermodynamicStockVector>;
  readonly neighbors: ReadonlyArray<H3Index>;
}

export interface StockTransferMatrix {
  readonly targetCell: H3Index;
  readonly deltaWater: number;    // kg
  readonly deltaCarbon: number;   // mol C
  readonly deltaOxygen: number;   // mol O2
  readonly deltaMinerals: number; // kg
  readonly deltaEnthalpy: number; // J
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
  planetaryRadiusMeters?: number;
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

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: UnitVector3D;
  surfaceAreaM2: number;
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
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

export interface DiffusionCoefficients {
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  thermalConductivity?: number;
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  thermal?: number;
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
  const cond = metrics.geometricConductance;
  const tempDiff = (stateA.temperatureKelvin ?? 293.15) - (stateB.temperatureKelvin ?? 293.15);
  const eddy = params.eddyDiffusivityHeat ?? 15.0;
  const deltaEnthalpy = eddy * tempDiff * metrics.atmosphericContactAreaM2 * dt * 0.001;

  const waterDiff = (stateA.massWaterKg ?? stateA.waterMassKg ?? stateA.waterKg ?? 0) - (stateB.massWaterKg ?? stateB.waterMassKg ?? stateB.waterKg ?? 0);
  const kPorous = params.kSatPorous ?? 1e-4;
  const deltaWater = kPorous * waterDiff * metrics.subterraneanContactAreaM2 * dt * 0.001;

  const carbonDiff = (stateA.massCarbonKg ?? stateA.carbonMassKg ?? stateA.carbonKg ?? 0) - (stateB.massCarbonKg ?? stateB.carbonMassKg ?? stateB.carbonKg ?? 0);
  const deltaCarbon = 1e-5 * carbonDiff * cond * dt;

  const mineralDiff = (stateA.massMineralsKg ?? stateA.mineralMassKg ?? stateA.mineralsKg ?? stateA.mineralKg ?? 0) - (stateB.massMineralsKg ?? stateB.mineralMassKg ?? stateB.mineralsKg ?? stateB.mineralKg ?? 0);
  const deltaMineral = 1e-6 * mineralDiff * cond * dt;

  const tA = Math.max(1e-3, stateA.temperatureKelvin ?? 293.15);
  const tB = Math.max(1e-3, stateB.temperatureKelvin ?? 293.15);
  const entropyProduced = Math.max(0, Math.abs(deltaEnthalpy) * Math.abs(1 / tB - 1 / tA));

  return {
    deltaWaterKg: deltaWater,
    deltaEnthalpyJoules: deltaEnthalpy,
    deltaCarbonKg: deltaCarbon,
    deltaMineralKg: deltaMineral,
    entropyProducedJPerK: entropyProduced,
  };
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

export const SPATIAL_CONSTANTS = {
  HEX_COORDINATION_NUMBER: 6 as CoordinationNumber,
  PENTAGON_COORDINATION_NUMBER: 5 as CoordinationNumber,
  HEX_FACE_LENGTH_FACTOR: 1.000000,
  PENTAGON_FACE_LENGTH_FACTOR: 1.051462,
  CELL_AREA_FACTOR_HEX: 1.000000,
  CELL_AREA_FACTOR_PENTAGON: 0.852398,
  WATER_DIFFUSIVITY: 1.25e-3,
  CARBON_DIFFUSION: 2.10e-5,
  OXYGEN_DIFFUSION: 2.01e-5,
  MINERAL_DIFFUSION: 1.00e-5,
  THERMAL_CONDUCTIVITY: 0.58,
} as const;
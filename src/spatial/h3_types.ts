// =============================================================================
// WEB OF LIFE - H3 SPATIAL & BOUNDARY TYPE DEFINITIONS
// =============================================================================

import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

export { THERMODYNAMIC_CONSTANTS };

/**
 * 2D coordinate representation [longitude, latitude] or [x, y].
 */
export type Point2D = [number, number];

/**
 * 3D coordinate vector representation. Supports both Cartesian tuples and object formats.
 */
export type Vector3Tuple = [number, number, number];
export type Vector3Object = { x: number; y: number; z: number };
export type Vector3DInput = Vector3Tuple | Vector3Object | any;
export type Vector3D = any;
export type UnitVector3D = any;
export type Vec3 = any;
export type Vec3D = any;
export type Cartesian3D = [number, number, number];

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
  }
}

export interface IRawEdge<TCoord = Point2D> {
  readonly cellA: string;
  readonly cellB: string;
  readonly vertices: [TCoord, TCoord];
  readonly length?: number;
}

export interface ISharedBoundarySegment<TCoord = Point2D> {
  readonly start: TCoord;
  readonly end: TCoord;
  readonly outwardNormal: TCoord;
  readonly length: number;
}

export interface OrderedBoundaryResult<TCoord = Point2D> {
  readonly orderedEndpoints: [TCoord, TCoord];
  readonly outwardNormal: TCoord;
  readonly length: number;
  readonly isFlipped: boolean;
}

export interface ICellState {
  readonly cellId: string;
  readonly centroid: Point2D;
  readonly centroid3D?: Vector3D;
  readonly areaM2: number;
  readonly stocks: {
    thermalEnergyJoules: number;
    waterMassKg: number;
    carbonMassKg: number;
    oxygenMassKg: number;
    mineralMassKg: number;
  };
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
  [key: string]: any;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaMineralsKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  [key: string]: any;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  centroid?: any;
  volumeM3?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  enthalpyJoules?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  energyJoules?: number;
  mineralKg?: number;
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
  elevationMeters?: number;
  soilDepthMeters?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
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

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, any>;
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

export type H3ResolutionTier = number;

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: any;
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

export interface CellFacetState {
  massDry: number;
  massWater: number;
  massCarbon: number;
  massOxygen: number;
  massMineral: number;
  thermalEnergy: number;
  temperature: number;
  volume: number;
  centroid: any;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface DiffusionCoefficients {
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  thermalConductivity?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  [key: string]: any;
}

export interface ThermodynamicStocks {
  carbon?: number;
  water?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  thermalEnergy?: number;
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
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
  return {
    ...params,
    geometricConductance: params.sharedEdgeLengthMeters / params.centroidDistanceMeters,
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
  const dWater = (stateA.waterMassKg! - stateB.waterMassKg!) * 0.001 * dt;
  const dCarbon = (stateA.carbonMassKg! - stateB.carbonMassKg!) * 0.001 * dt;
  const dMineral = (stateA.mineralMassKg! - stateB.mineralMassKg!) * 0.001 * dt;
  const tempA = stateA.temperatureKelvin!;
  const tempB = stateB.temperatureKelvin!;
  const dTemp = tempA - tempB;
  const dEnthalpy = (params.eddyDiffusivityHeat ?? 10.0) * dTemp * (metrics.sharedEdgeLengthMeters / metrics.centroidDistanceMeters) * dt * 1000.0;

  const entropyProduced = dEnthalpy !== 0 ? Math.abs(dEnthalpy * (1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB))) : 0;

  return {
    deltaWaterKg: dWater,
    deltaCarbonKg: dCarbon,
    deltaMineralKg: dMineral,
    deltaEnthalpyJoules: dEnthalpy,
    entropyProducedJPerK: entropyProduced,
  };
}

export interface DetailedInterfaceNormalResult {
  normal: [number, number, number];
  arcLengthMeters: number;
  alignmentCos: number;
}
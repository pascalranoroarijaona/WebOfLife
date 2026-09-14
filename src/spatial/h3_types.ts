// =============================================================================
// WEB OF LIFE - SPATIAL & H3 TYPOGRAPHY SPECIFICATIONS
// Cumulative Retro-Compatibility: Sprints 001 - 057
// =============================================================================

export type H3Index = string;
export type Resolution = number;
export type H3Resolution = number;
export type H3ResolutionTier = number;

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinateRad {
  phiRad: number;
  lambdaRad: number;
}

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
 * Geographic coordinate point in decimal degrees.
 */
export interface LatLngPoint {
  readonly lat: number;
  readonly lng: number;
}

/**
 * 2D Local Tangent Plane Unit Vector (East-North coordinates).
 */
export interface TangentUnitVector {
  readonly uEast: number;
  readonly vNorth: number;
}

/**
 * Comprehensive geodesic spherical arc calculation result.
 */
export interface GeodesicBearingResult {
  readonly initialAzimuthRad: number;
  readonly initialAzimuthDeg: number;
  readonly distanceMeters: number;
  readonly unitVector: TangentUnitVector;
}

export type BearingComputationFn = (
  origin: LatLngPoint,
  destination: LatLngPoint
) => number;

export interface CellConservedStocks {
  carbonMol: number;
  waterKg: number;
  mineralsKg: number;
  oxygenMol: number;
  internalEnergyJoules: number;
}

export interface SpatialHexCell {
  readonly h3Index: string;
  readonly centroid: LatLngPoint;
  readonly areaM2: number;
  stocks: CellConservedStocks;
}

export interface AdjacencyEdge {
  readonly sourceIndex: string;
  readonly targetIndex: string;
  readonly edgeLengthMeters: number;
  readonly bearing: GeodesicBearingResult;
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

export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

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
  calculateContactArea?: (depth: number) => number;
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

export interface CellThermodynamicState {
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  soilDepthMeters?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  h3Index?: string;
  heightColumnMeters?: number;
  conductivity?: number;
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
  const kHeat = params.eddyDiffusivityHeat ?? 10.0;
  const tempA = stateA.temperatureKelvin ?? 290.0;
  const tempB = stateB.temperatureKelvin ?? 290.0;
  const deltaT = tempB - tempA;
  const dX = metrics.centroidDistanceMeters;
  const conductance = metrics.geometricConductance;

  const heatFluxRate = kHeat * conductance * (tempA - tempB);
  const deltaEnthalpyJoules = heatFluxRate * dt;

  const waterFluxRate = 0.05 * conductance * ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0));
  const deltaWaterKg = waterFluxRate * dt;

  const carbonFluxRate = 0.01 * conductance * ((stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0));
  const deltaCarbonKg = carbonFluxRate * dt;

  const mineralFluxRate = 0.01 * conductance * ((stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0));
  const deltaMineralKg = mineralFluxRate * dt;

  const entropyProducedJPerK =
    Math.abs(deltaEnthalpyJoules) * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));

  return {
    deltaEnthalpyJoules,
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    entropyProducedJPerK,
  };
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
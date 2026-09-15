/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL H3 TOPOLOGY, THERMODYNAMIC TYPES & INTERFACES
 * Cumulative Retro-Compatibility Specification (Sprints 002 - 083)
 * =============================================================================
 */

// -----------------------------------------------------------------------------
// CORE INDEX & RESOLUTION TYPES
// -----------------------------------------------------------------------------

export type H3Index = string;

export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3ResolutionTier = H3Resolution;

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_H3_DIRECTIONS: readonly H3Direction[] = Object.freeze([1, 2, 3, 4, 5, 6] as const);

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'Spatial guard clause exception') {
    super(message);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

// -----------------------------------------------------------------------------
// VECTOR & GEOMETRIC PRIMITIVES
// -----------------------------------------------------------------------------

export type Point2D = [number, number];

export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
}

export type Vector3D = any;
export type Vector3DInput = any;
export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
}

// -----------------------------------------------------------------------------
// SPRINT 083: PENTAGON DIRECTIONAL TOPOLOGY
// -----------------------------------------------------------------------------

export interface PentagonDirectionalTopology {
  readonly presentDirections: readonly H3Direction[];
  readonly omittedDirection: H3Direction;
}

export interface StockVector {
  readonly carbon: number;    // mol C
  readonly water: number;     // kg H2O
  readonly minerals: number;  // mol P/N
  readonly oxygen: number;    // mol O2
  readonly energy: number;    // Joules
}

export interface DirectionalFlux {
  readonly direction: H3Direction;
  readonly delta: StockVector;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) {
    return false;
  }
  if (topology.presentDirections.length !== 5) {
    return false;
  }
  const directionSet = new Set<H3Direction>(topology.presentDirections);
  if (directionSet.size !== 5) {
    return false;
  }
  if (directionSet.has(topology.omittedDirection)) {
    return false;
  }
  return ALL_H3_DIRECTIONS.every(
    (dir) => dir === topology.omittedDirection || directionSet.has(dir)
  );
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  if (!ALL_H3_DIRECTIONS.includes(omittedDirection)) {
    throw new Error(`Invalid omitted direction: ${omittedDirection}. Must be an H3Direction in 1..6.`);
  }
  const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return Object.freeze({
    presentDirections: Object.freeze(presentDirections),
    omittedDirection,
  });
}

// -----------------------------------------------------------------------------
// THERMODYNAMIC CHANNELS & CONSTANTS (SPRINTS 042 - 045)
// -----------------------------------------------------------------------------

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
    REGOLITH: 0.0,
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  },
};

export interface CellThermodynamicOverride {
  waterMassKg?: number;
  sensibleHeatJoules?: number;
  temperatureKelvin?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  albedo?: number;
  [key: string]: any;
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

// -----------------------------------------------------------------------------
// STOCKS, FLUXES & STRATA INTERFACES (SPRINTS 046 - 075)
// -----------------------------------------------------------------------------

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
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

export type ThermodynamicStocks = CellThermodynamicStocks;

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  [key: string]: any;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  isPentagon?: boolean;
  centroid?: any;
  volumeM3?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  enthalpyJoules?: number;
  energyJoules?: number;
  temperatureKelvin?: number;
  conductivity?: number;
  heightColumnMeters?: number;
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
  thermalEnergyMJ?: number;
  [key: string]: any;
}

export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
  [key: string]: any;
}

export interface ILateralTransportParams {
  timeStepSeconds: number;
  normalVelocityMs: number;
  fluidDensityKgM3?: number;
  thermalConductivityWMK?: number;
  distanceCentroidsMeters?: number;
  temperatureKelvinA?: number;
  temperatureKelvinB?: number;
  [key: string]: any;
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
  [key: string]: any;
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
  [key: string]: any;
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
  diffMinerals?: number;
  diffOxygen?: number;
  thermal?: number;
  [key: string]: any;
}

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: UnitVector3D;
  surfaceAreaM2: number;
  [key: string]: any;
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
  [key: string]: any;
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, CellBiophysicalState | any>;
  [key: string]: any;
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2?: number;
  elevationM?: number;
  stocks: {
    carbonMol?: number;
    waterKg?: number;
    mineralsMol?: number;
    oxygenMol?: number;
    thermalEnergyJ?: number;
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalEnergy?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: {
    water: number;
    carbon: number;
    oxygen: number;
    minerals: number;
    enthalpy: number;
    [key: string]: any;
  };
  neighbors: string[];
  [key: string]: any;
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
  [key: string]: any;
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
    ...m,
    originIndex: m.neighborIndex,
    neighborIndex: m.originIndex,
    normalVector: [-m.normalVector[0], -m.normalVector[1], -m.normalVector[2]],
    topographicSlope: -m.topographicSlope,
    bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
  };
}

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
  [key: string]: any;
}

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const dWater = ((stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0)) * 0.001 * dt;
  const dEnthalpy = ((stateA.enthalpyJoules ?? 0) - (stateB.enthalpyJoules ?? 0)) * 0.001 * dt;
  const dCarbon = ((stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0)) * 0.001 * dt;
  const dMineral = ((stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0)) * 0.001 * dt;

  const tA = stateA.temperatureKelvin ?? 295;
  const tB = stateB.temperatureKelvin ?? 288;
  const heatCond = (params.eddyDiffusivityHeat ?? 10) * ((tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;
  const entropy = Math.max(0, Math.abs(heatCond) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA)));

  return {
    deltaWaterKg: -dWater,
    deltaEnthalpyJoules: -dEnthalpy,
    deltaCarbonKg: -dCarbon,
    deltaMineralKg: -dMineral,
    entropyProducedJPerK: entropy,
  };
}
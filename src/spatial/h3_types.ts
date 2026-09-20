/**
 * Web of Life - Spatial Partitioning Engine
 * Core H3 Discrete Global Grid System & Thermodynamic Type Definitions
 * Sprints 001 - 088 Unified Specification
 */

// =============================================================================
// SPRINT 088: Aperture Directional Digits & Geometry
// =============================================================================

export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const H3_MIN_DIRECTION_DIGIT = 0;
export const H3_MAX_DIRECTION_DIGIT = 6;

export interface GeoCoord {
  readonly latitude: number;
  readonly longitude: number;
}

export interface SpatialBoundingBox {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLon: number;
  readonly maxLon: number;
}

// =============================================================================
// HISTORICAL SPATIAL & GEODESIC VECTOR DEFINITIONS
// =============================================================================

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number] | Vector3D;
export type Point2D = [number, number];

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  [index: number]: any;
  length?: number;
}

export type Vector3DInput = Vector3D | [number, number, number] | { x: number; y: number; z: number } | Vector3Tuple;

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

// =============================================================================
// ERROR CODES & EXCEPTIONS
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
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export class InvalidH3ModeError extends Error {
  constructor(message: string = 'Invalid H3 cell mode') {
    super(message);
    this.name = 'InvalidH3ModeError';
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(message: string = 'Invalid H3 base cell') {
    super(message);
    this.name = 'InvalidH3BaseCellError';
  }
}

export class InvalidH3PaddingError extends Error {
  constructor(message: string = 'Invalid H3 padding bits') {
    super(message);
    this.name = 'InvalidH3PaddingError';
  }
}

// =============================================================================
// RESOLUTION TIERS
// =============================================================================

export type H3ResolutionTier = number;
export type Resolution = number;
export type H3Index = string;

// =============================================================================
// THERMODYNAMIC STOCKS & INTERFACES
// =============================================================================

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: any;
}

export interface ThermodynamicStocks {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
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

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: any;
  temperatureKelvin?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  volumeM3?: number;
  enthalpyJoules?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
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
  isPentagon?: boolean;
  thermalEnergyMJ?: number;
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
  [key: string]: any;
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: any;
  cells: Map<string, any>;
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
  stocks: any;
}

export interface DiffusionCoefficients {
  water?: number;
  carbon?: number;
  minerals?: number;
  oxygen?: number;
  thermalConductivity?: number;
  thermal?: number;
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
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
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2: number;
  elevationM: number;
  stocks: any;
}

export interface SpatialCellState {
  cellIndex?: string;
  isPentagon?: boolean;
  areaM2?: number;
  elevationM?: number;
  stocks?: any;
  [key: string]: any;
}

export interface CellSpatialContext {
  h3Index: string;
  state: any;
  areaM2: number;
  temperatureK: number;
}

// =============================================================================
// SPRINT 045: STATE TENSOR OVERRIDES & CHANNELS
// =============================================================================

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
  DEFAULT_REGOLITH_MASS_KG: 10000.0,
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

// =============================================================================
// SPRINT 051: INTERFACE METRICS
// =============================================================================

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

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const gradT = ((stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290)) / metrics.centroidDistanceMeters;
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;
  const areaAtm = metrics.atmosphericContactAreaM2;
  const qHeatJoules = kHeat * gradT * areaAtm * dt;

  const gradHead = (((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters) + metrics.topographicSlope;
  const kWater = params.kSatPorous ?? 1e-4;
  const areaSub = metrics.subterraneanContactAreaM2;
  const qWaterKg = kWater * gradHead * areaSub * dt * 1000.0;

  const waterA = Math.max(1, stateA.waterMassKg ?? 10000);
  const carbonFrac = (stateA.carbonMassKg ?? 0) / waterA;
  const mineralFrac = (stateA.mineralMassKg ?? 0) / waterA;

  const deltaWater = qWaterKg;
  const deltaCarbon = qWaterKg * carbonFrac;
  const deltaMineral = qWaterKg * mineralFrac;
  const deltaEnthalpy = qHeatJoules + qWaterKg * 4184.0 * (stateA.temperatureKelvin ?? 290);

  const tWarm = Math.max(stateA.temperatureKelvin ?? 290, stateB.temperatureKelvin ?? 290);
  const tCold = Math.min(stateA.temperatureKelvin ?? 290, stateB.temperatureKelvin ?? 290);
  const deltaT = tWarm - tCold;
  const entropyProducedJPerK = Math.abs(qHeatJoules) * (deltaT / (tWarm * tCold + 1e-6));

  return {
    deltaWaterKg: -deltaWater,
    deltaEnthalpyJoules: -deltaEnthalpy,
    deltaCarbonKg: -deltaCarbon,
    deltaMineralKg: -deltaMineral,
    entropyProducedJPerK,
  };
}

// =============================================================================
// SPRINT 075 & 083 & 084 & 085 & 087: TOPOLOGY & DIRECTIONAL TYPES
// =============================================================================

export interface SpatialFluxState {
  cellIndex: string;
  stocks: {
    water?: number;
    carbon?: number;
    oxygen?: number;
    minerals?: number;
    enthalpy?: number;
    [key: string]: any;
  };
  neighbors: string[];
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6 | number;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6] as const;

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = [1, 2, 3, 4, 5, 6].filter((d) => d !== omittedDirection) as H3Direction[];
  return {
    presentDirections,
    omittedDirection,
  };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  const set = new Set(topology.presentDirections);
  if (set.size !== 5) return false;
  if (set.has(topology.omittedDirection)) return false;
  for (const d of topology.presentDirections) {
    if (d < 1 || d > 6) return false;
  }
  return true;
}

export interface StockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
}

export interface DirectionalFlux {
  direction: H3Direction;
  delta: StockVector;
}

export type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type DirectionBitmask = number;

export const H3DirectionBitmask = {
  NONE: 0,
  DIRECTION_0: 1 << 0,
  DIRECTION_1: 1 << 1,
  DIRECTION_2: 1 << 2,
  DIRECTION_3: 1 << 3,
  DIRECTION_4: 1 << 4,
  DIRECTION_5: 1 << 5,
  ALL: 63,
  BY_INDEX: [1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5],
  hasDirection(mask: DirectionBitmask, dir: number): boolean {
    return (mask & (1 << dir)) !== 0;
  },
  setDirection(mask: DirectionBitmask, dir: number): DirectionBitmask {
    return mask | (1 << dir);
  },
  clearDirection(mask: DirectionBitmask, dir: number): DirectionBitmask {
    return mask & ~(1 << dir);
  },
  oppositeDirection(dir: H3DirectionIndex): H3DirectionIndex {
    return ((dir + 3) % 6) as H3DirectionIndex;
  },
  invertMask(mask: DirectionBitmask): DirectionBitmask {
    let res = 0;
    for (let i = 0; i < 6; i++) {
      if ((mask & (1 << i)) !== 0) {
        res |= 1 << ((i + 3) % 6);
      }
    }
    return res;
  },
};

export interface DirectionalGeometry {
  edgeLengthM: number;
  layerHeightM: number;
  centroidDistanceM: number;
}

export interface CellStockTensor {
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  internalEnergyJoules?: number;
  volumeM3?: number;
  temperatureKelvin?: number;
  massH2O?: number;
  massCarbon?: number;
  massOxygen?: number;
  massMinerals?: number;
  energyJoules?: number;
  temperatureK?: number;
  [key: string]: any;
}

export class DirectionalFluxOperator {
  public static isChannelPermeable(
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    direction: number
  ): boolean {
    const opp = (direction + 3) % 6;
    return H3DirectionBitmask.hasDirection(srcMask, direction) && H3DirectionBitmask.hasDirection(tgtMask, opp);
  }

  public static computeEdgeTransfer(
    src: CellStockTensor,
    tgt: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    direction: number,
    velocityMs: number,
    diffCoeff: number,
    thermalCond: number,
    geometry: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, direction)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0,
      };
    }
    const area = geometry.edgeLengthM * geometry.layerHeightM;
    const flowVol = velocityMs * area * dt;
    const frac = Math.min(0.2, flowVol / Math.max(1, src.volumeM3 ?? 100));

    return {
      dWaterKg: (src.waterKg ?? 0) * frac,
      dCarbonKg: (src.carbonKg ?? 0) * frac,
      dMineralsKg: (src.mineralsKg ?? 0) * frac,
      dOxygenKg: (src.oxygenKg ?? 0) * frac,
      dEnergyJoules: (src.internalEnergyJoules ?? 0) * frac,
    };
  }
}

export interface BiophysicalStockVector {
  carbonKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  waterKg: number;
  oxygenKg: number;
  mineralKg: number;
  thermalJoules: number;
}

export enum Direction {
  CENTER = 0,
  K_AXES = 1,
  J_AXES = 2,
  JK_AXES = 3,
  I_AXES = 4,
  IK_AXES = 5,
  IJ_AXES = 6,
  INVALID = 7,
}

export interface BaseCellStockVector {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  thermalEnergyJoules: number;
}
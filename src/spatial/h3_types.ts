/**
 * Web of Life - H3 Discrete Global Grid System (DGGS) Type Definitions
 * Retro-Compatible Multi-Sprint Unified Implementation (Sprints 001 - 094)
 */

export const MIN_H3_RES = 0;
export const MAX_H3_RES = 15;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;

export const APERTURE_7_ROTATION_RAD = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
export const APERTURE_7_ROTATION_DEG = (APERTURE_7_ROTATION_RAD * 180) / Math.PI;

export type H3Resolution = number;
export type Resolution = number;
export type H3ResolutionTier = number;

export enum ApertureClass {
  CLASS_II = 'CLASS_II',
  CLASS_III = 'CLASS_III',
  ClassII = 'ClassII',
  ClassIII = 'ClassIII',
}

export interface ApertureStepOptions {
  readonly startResolution?: number;
}

export interface ApertureClassProfile {
  readonly startResolution: number;
  readonly targetResolution: number;
  readonly classIIISteps: number;
  readonly classIISteps: number;
  readonly totalSteps: number;
  readonly isTargetClassIII: boolean;
  readonly netOrientationDeltaRad: number;
}

export interface ConservedStockVector {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  mineralsKg: number;
  thermalEnergyMJ: number;
  biomassKg: number;
}

export interface ConservedStocks {
  carbonMol: number;
  waterMol: number;
  mineralsMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
}

export type Point2D = [number, number];

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export class Vector3D {
  [index: number]: number;
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this[0] = x;
    this[1] = y;
    this[2] = z;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  [Symbol.iterator](): Iterator<number> {
    return [this.x, this.y, this.z][Symbol.iterator]();
  }
}

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export type Vec3 = Vector3D;
export type Vec3D = [number, number, number] | Vector3D;
export type Vector3DInput = Vector3D | [number, number, number] | { x: number; y: number; z: number };
export type UnitVector3D = [number, number, number] | Vector3D;

export type FluxVector2D =
  | { jX: number; jY: number; 0?: number; 1?: number }
  | readonly [number, number]
  | [number, number];

export type Matrix2x2 = readonly [
  readonly [number, number],
  readonly [number, number]
];

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

export type H3Index = string | bigint;
export const H3_CELL_MODE = 1;
export const DIRECTION_CENTER = 0;

export const PENTAGON_BASE_CELLS_ARRAY = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117] as const;
export const PENTAGON_BASE_CELL_SET = new Set<number>(PENTAGON_BASE_CELLS_ARRAY);
export const PENTAGON_BASE_CELLS = Object.assign(
  new Set<number>(PENTAGON_BASE_CELLS_ARRAY),
  PENTAGON_BASE_CELLS_ARRAY
) as unknown as Set<number> & readonly number[];
export const TOTAL_BASE_CELLS = 122;

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
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
  energyJoules?: number;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  isPentagon?: boolean;
  energyJoules?: number;
  internalEnergyJoules?: number;
  waterKg?: number;
  massWaterKg?: number;
  waterMassKg?: number;
  waterVaporMassKg?: number;
  carbonKg?: number;
  massCarbonKg?: number;
  carbonMassKg?: number;
  dissolvedCarbonKg?: number;
  oxygenKg?: number;
  massOxygenKg?: number;
  dissolvedOxygenKg?: number;
  mineralsKg?: number;
  massMineralsKg?: number;
  mineralKg?: number;
  mineralMassKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  centroid?: { x?: number; y?: number; z?: number; lat?: number; lng?: number };
  volumeM3?: number;
  thermalEnergyMJ?: number;
  entropyJoulesPerKelvin?: number;
  soilDepthMeters?: number;
  elevationMeters?: number;
  enthalpyJoules?: number;
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: {
    water?: number;
    carbon?: number;
    oxygen?: number;
    minerals?: number;
    enthalpy?: number;
  };
  neighbors: (string | number)[];
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6];

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const present = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection) as H3Direction[];
  return { presentDirections: present, omittedDirection };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  const set = new Set(topology.presentDirections);
  if (set.size !== 5) return false;
  if (set.has(topology.omittedDirection)) return false;
  for (const d of topology.presentDirections) {
    if (!ALL_H3_DIRECTIONS.includes(d)) return false;
  }
  return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}

export interface StockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
}

export interface DirectionalFlux {
  direction: number;
  delta: StockVector;
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
}

export interface CellSpatialState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon: boolean;
  areaM2?: number;
  elevationM?: number;
  stocks: {
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalEnergy?: number;
    carbonMol?: number;
    waterKg?: number;
    mineralsMol?: number;
    oxygenMol?: number;
    thermalEnergyJ?: number;
  };
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
  BY_INDEX: [1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5] as const,
  hasDirection(mask: number, dir: number): boolean {
    return (mask & (1 << dir)) !== 0;
  },
  setDirection(mask: number, dir: number): number {
    return mask | (1 << dir);
  },
  clearDirection(mask: number, dir: number): number {
    return mask & ~(1 << dir);
  },
  oppositeDirection(dir: H3DirectionIndex): H3DirectionIndex {
    return ((dir + 3) % 6) as H3DirectionIndex;
  },
  invertMask(mask: number): number {
    let inv = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        inv |= 1 << ((d + 3) % 6);
      }
    }
    return inv;
  },
};

export interface DirectionalGeometry {
  edgeLengthM: number;
  layerHeightM: number;
  centroidDistanceM: number;
}

export class DirectionalFluxOperator {
  public static isChannelPermeable(srcMask: number, tgtMask: number, dir: number): boolean {
    const opp = (dir + 3) % 6;
    return (srcMask & (1 << dir)) !== 0 && (tgtMask & (1 << opp)) !== 0;
  }
  public static computeEdgeTransfer(
    stateI: any,
    _stateJ: any,
    srcMask: number,
    tgtMask: number,
    dir: number,
    velocity: number,
    _diffCoeff: number,
    _cond: number,
    geom: DirectionalGeometry,
    dt: number
  ) {
    if (!DirectionalFluxOperator.isChannelPermeable(srcMask, tgtMask, dir)) {
      return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
    }
    const area = geom.edgeLengthM * geom.layerHeightM;
    const volFlow = Math.abs(velocity) * area * dt;
    const frac = Math.min(0.1, volFlow / Math.max(stateI.volumeM3, 1.0));
    return {
      dWaterKg: stateI.waterKg * frac,
      dCarbonKg: stateI.carbonKg * frac,
      dMineralsKg: stateI.mineralsKg * frac,
      dOxygenKg: stateI.oxygenKg * frac,
      dEnergyJoules: stateI.internalEnergyJoules * frac,
    };
  }
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
}

export class InvalidH3ModeError extends Error {
  constructor(message: string = 'Invalid H3 mode') {
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
  constructor(message: string = 'Invalid H3 padding') {
    super(message);
    this.name = 'InvalidH3PaddingError';
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

export interface CellSpatialContext {
  h3Index: string;
  state: {
    carbonKg: number;
    waterKg: number;
    mineralsKg: number;
    oxygenKg: number;
    energyJoules: number;
  };
  areaM2: number;
  temperatureK: number;
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

export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PatchThermodynamicStock {
  carbonMol: number;
  waterKg: number;
  mineralsMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
  temperatureKelvin: number;
}

export interface PentagonThermodynamicStocks {
  carbonDioxideKg: number;
  waterVaporKg: number;
  dustKg: number;
  oxygenKg: number;
  enthalpyJoules: number;
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
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

export function createH3CellInterfaceMetrics(params: any): H3CellInterfaceMetrics {
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

export function createReciprocalInterfaceMetrics(metrics: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  return {
    ...metrics,
    originIndex: metrics.neighborIndex,
    neighborIndex: metrics.originIndex,
    normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
    topographicSlope: -metrics.topographicSlope,
    bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
  };
}

export interface FluxComputationParams {
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
}

export function computeInterfaceFlux(
  stateA: any,
  stateB: any,
  _metrics: H3CellInterfaceMetrics,
  dt: number,
  _params: FluxComputationParams
) {
  const dW = (stateA.waterMassKg - stateB.waterMassKg) * 0.001 * dt;
  const dC = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.001 * dt;
  const dM = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.001 * dt;
  const dE = (stateA.enthalpyJoules - stateB.enthalpyJoules) * 0.001 * dt;
  const tempA = stateA.temperatureKelvin;
  const tempB = stateB.temperatureKelvin;
  const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tempB - 1 / tempA));

  return {
    deltaWaterKg: -dW,
    deltaCarbonKg: -dC,
    deltaMineralKg: -dM,
    deltaEnthalpyJoules: -dE,
    entropyProducedJPerK: entropy,
  };
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

export interface DiffusionCoefficients {
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  thermalConductivity?: number;
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
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
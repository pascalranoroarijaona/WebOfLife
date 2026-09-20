// =============================================================================
// WEB OF LIFE - SPATIAL H3 HIERARCHY, APERTURE & THERMODYNAMIC TYPE SYSTEM
// Retro-Compatible Unified Specification (Sprints 002 - 093)
// =============================================================================

export type H3Index = string | bigint;

export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const DIRECTION_CENTER = 0;

export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3ResolutionTier = H3Resolution;
export type Resolution = number;

export const PENTAGON_BASE_CELLS = new Set<number>([
  4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);

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

export enum ApertureClass {
  CLASS_II = 'CLASS_II',
  CLASS_III = 'CLASS_III',
}

export type ApertureClassType = 'CLASS_II' | 'CLASS_III';

export interface IApertureRotationSequence {
  readonly targetResolution: number;
  readonly sequence: readonly ApertureClass[];
}

export interface ConservedStocks {
  readonly carbonMol: number;
  readonly waterMol: number;
  readonly mineralsMol: number;
  readonly oxygenMol: number;
  readonly enthalpyJoules: number;
}

export interface FluxVector2D {
  readonly jX: number;
  readonly jY: number;
}

export interface SpatialCellState {
  readonly cellId?: string;
  readonly h3Index?: string;
  readonly resolution?: number;
  readonly apertureClass?: ApertureClass;
  readonly isPentagon?: boolean;
  readonly areaM2?: number;
  readonly elevationM?: number;
  readonly stocks?: any;
}

export type Point2D = [number, number];

export class Vector3D {
  [index: number]: number;
  0: number;
  1: number;
  2: number;
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this[0] = x;
    this[1] = y;
    this[2] = z;
  }
}

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];

export type Vector3DInput =
  | Vector3D
  | [number, number, number]
  | { x?: number; y?: number; z?: number; [index: number]: number };

export type UnitVector3D = [number, number, number] | Vector3D;

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

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
  biomassJoules?: number;
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
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon?: boolean;
  centroid?: any;
  volumeM3?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  enthalpyJoules?: number;
  thermalEnergyJoules?: number;
  thermalEnergyMJ?: number;
  temperatureKelvin?: number;
  elevationMeters?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  soilDepthMeters?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
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

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
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
    [key: string]: any;
  };
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6];

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  const set = new Set(topology.presentDirections);
  if (set.size !== 5) return false;
  if (set.has(topology.omittedDirection)) return false;
  const union = new Set([...topology.presentDirections, topology.omittedDirection]);
  return union.size === 6 && ALL_H3_DIRECTIONS.every((d) => union.has(d));
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return { presentDirections, omittedDirection };
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
  DIRECTION_0: 1 << 0,
  DIRECTION_1: 1 << 1,
  DIRECTION_2: 1 << 2,
  DIRECTION_3: 1 << 3,
  DIRECTION_4: 1 << 4,
  DIRECTION_5: 1 << 5,
  NONE: 0,
  ALL: 0x3f,
  BY_INDEX: [1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5] as const,

  hasDirection(mask: DirectionBitmask, dir: H3DirectionIndex): boolean {
    return (mask & (1 << dir)) !== 0;
  },
  setDirection(mask: DirectionBitmask, dir: H3DirectionIndex): DirectionBitmask {
    return mask | (1 << dir);
  },
  clearDirection(mask: DirectionBitmask, dir: H3DirectionIndex): DirectionBitmask {
    return mask & ~(1 << dir);
  },
  oppositeDirection(dir: H3DirectionIndex): H3DirectionIndex {
    return ((dir + 3) % 6) as H3DirectionIndex;
  },
  invertMask(mask: DirectionBitmask): DirectionBitmask {
    let res = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        res |= 1 << ((d + 3) % 6);
      }
    }
    return res;
  },
};

export interface CellStockTensor {
  waterKg: number;
  carbonKg: number;
  mineralsKg: number;
  oxygenKg: number;
  internalEnergyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
}

export interface DirectionalGeometry {
  edgeLengthM: number;
  layerHeightM: number;
  centroidDistanceM: number;
}

export class DirectionalFluxOperator {
  public static isChannelPermeable(
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex
  ): boolean {
    const opp = H3DirectionBitmask.oppositeDirection(dir);
    return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
  }

  public static computeEdgeTransfer(
    sI: CellStockTensor,
    sJ: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex,
    velocity: number,
    diffCoeff: number,
    thermCond: number,
    geom: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
    }
    const area = geom.edgeLengthM * geom.layerHeightM;
    const volFlow = velocity * area * dt;
    const frac = Math.min(0.2, volFlow / (sI.volumeM3 || 100));

    return {
      dWaterKg: sI.waterKg * frac,
      dCarbonKg: sI.carbonKg * frac,
      dMineralsKg: sI.mineralsKg * frac,
      dOxygenKg: sI.oxygenKg * frac,
      dEnergyJoules: sI.internalEnergyJoules * frac,
    };
  }
}

export class InvalidH3ModeError extends Error {
  constructor(mode: number) {
    super(`Invalid H3 mode: ${mode}`);
    this.name = 'InvalidH3ModeError';
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(baseCell: number) {
    super(`Invalid H3 base cell: ${baseCell}`);
    this.name = 'InvalidH3BaseCellError';
  }
}

export class InvalidH3PaddingError extends Error {
  constructor() {
    super(`Invalid H3 padding bits`);
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
  sA: CellThermodynamicState,
  sB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  _params?: FluxComputationParams
) {
  const cond = metrics.geometricConductance;
  const tempA = sA.temperatureKelvin ?? 290.0;
  const tempB = sB.temperatureKelvin ?? 290.0;
  const dTemp = tempA - tempB;

  const heatFluxJ = cond * dTemp * 100.0 * dt;
  const dWaterKg = cond * ((sA.waterMassKg ?? 0) - (sB.waterMassKg ?? 0)) * 0.001 * dt;
  const dCarbonKg = cond * ((sA.carbonMassKg ?? 0) - (sB.carbonMassKg ?? 0)) * 0.001 * dt;
  const dMineralKg = cond * ((sA.mineralMassKg ?? 0) - (sB.mineralMassKg ?? 0)) * 0.001 * dt;

  const entropyProd = heatFluxJ > 0 ? heatFluxJ * (1 / tempB - 1 / tempA) : -heatFluxJ * (1 / tempA - 1 / tempB);

  return {
    deltaWaterKg: -dWaterKg,
    deltaEnthalpyJoules: -heatFluxJ,
    deltaCarbonKg: -dCarbonKg,
    deltaMineralKg: -dMineralKg,
    entropyProducedJPerK: Math.max(0, entropyProd),
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
// =============================================================================
// WEB OF LIFE - H3 SPATIAL TYPINGS & DATA CONTRACTS (RETRO-COMPATIBLE KERNEL)
// Unified Architecture: Sprints 002 through 091
// =============================================================================

export type H3Index = string | bigint;

export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;
export const DIRECTION_CENTER = 0;

export const PENTAGON_BASE_CELLS_SET = new Set<number>([
  4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);

export const PENTAGON_BASE_CELLS: number[] & { has: (val: number) => boolean } = Object.assign(
  [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117],
  { has: (val: number) => PENTAGON_BASE_CELLS_SET.has(val) }
);

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
  constructor(message: string = 'Invalid H3 padding bits') {
    super(message);
    this.name = 'InvalidH3PaddingError';
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;
export type Resolution = H3ResolutionTier;

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type Vector3Object = { x: number; y: number; z: number };

export class Vector3D {
  [index: number]: number;
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    Object.defineProperty(this, 0, {
      get: () => this.x,
      set: (v: number) => { this.x = v; },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(this, 1, {
      get: () => this.y,
      set: (v: number) => { this.y = v; },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(this, 2, {
      get: () => this.z,
      set: (v: number) => { this.z = v; },
      enumerable: true,
      configurable: true,
    });
  }

  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}

export function createVec3D(x: number, y: number, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export type Vector3DInput = Vector3D | Vector3Tuple | Vector3Object | { x?: number; y?: number; z?: number };
export type UnitVector3D = [number, number, number] | Vector3D;
export type Point2D = [number, number];

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
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
    [key: string]: number;
  };
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, CellBiophysicalState | any>;
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
  planetaryRadiusMeters?: number;
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

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  enthalpyJoules?: number;
  [key: string]: any;
}

export type ThermodynamicStocks = CellThermodynamicStocks & {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
};

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
  centroid?: any;
  volumeM3?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  dissolvedOxygenKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  energyJoules?: number;
  internalEnergyJoules?: number;
  temperatureKelvin?: number;
  temperatureK?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  thermalEnergyMJ?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  isPentagon?: boolean;
  mineralKg?: number;
  [key: string]: any;
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

export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

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

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  mineralsKg?: number;
  oxygenKg: number;
  nitrogenKg?: number;
  phosphorusKg?: number;
  energyJoules: number;
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon: boolean;
  stocks: CellStockVector;
  [key: string]: any;
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[] | string[];
}

export interface FacetCellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
  [key: string]: any;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3DInput;
  effectiveHeightM: number;
  diffusionCoeffs: {
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalConductivity?: number;
    [key: string]: any;
  };
  blendAlpha?: number;
}

export interface SpatialStockState {
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  volumeM3?: number;
  temperatureKelvin?: number;
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
    [key: string]: any;
  };
}

export enum CellTopologyType {
  HEXAGON = 'HEXAGON',
  PENTAGON = 'PENTAGON',
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
  params: FluxComputationParams
) {
  const dHead = (sA.elevationMeters ?? 0) - (sB.elevationMeters ?? 0);
  const kWater = params.kSatPorous ?? 1e-4;
  const waterFlow = kWater * (dHead / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt * 1000.0;

  const tA = sA.temperatureKelvin ?? 295.15;
  const tB = sB.temperatureKelvin ?? 295.15;
  const cond = params.eddyDiffusivityHeat ?? 15.0;
  const heatFlow = cond * ((tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const dC = (sA.carbonMassKg ?? 0) * 0.001 * (waterFlow > 0 ? 1 : -1);
  const dMin = (sA.mineralMassKg ?? 0) * 0.001 * (waterFlow > 0 ? 1 : -1);

  const entropyProducedJPerK = Math.abs(heatFlow) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaWaterKg: waterFlow,
    deltaEnthalpyJoules: heatFlow,
    deltaCarbonKg: dC,
    deltaMineralKg: dMin,
    entropyProducedJPerK,
  };
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
  thermal?: number;
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
  centroid: Vector3DInput;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: {
    water?: number;
    carbon?: number;
    oxygen?: number;
    minerals?: number;
    enthalpy?: number;
    energy?: number;
  };
  neighbors: string[];
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6] as const;

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  const dirSet = new Set(topology.presentDirections);
  if (dirSet.size !== 5) return false;
  if (dirSet.has(topology.omittedDirection)) return false;
  for (const d of topology.presentDirections) {
    if (!ALL_H3_DIRECTIONS.includes(d)) return false;
  }
  return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return {
    presentDirections,
    omittedDirection,
  };
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
        const opp = (d + 3) % 6;
        res |= 1 << opp;
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

export class DirectionalFluxOperator {
  public static isChannelPermeable(srcMask: DirectionBitmask, tgtMask: DirectionBitmask, dir: H3DirectionIndex): boolean {
    const opp = H3DirectionBitmask.oppositeDirection(dir);
    return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
  }

  public static computeEdgeTransfer(
    sI: CellStockTensor,
    sJ: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex,
    vel: number,
    _diff: number,
    _cond: number,
    geom: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0,
      };
    }
    const area = geom.edgeLengthM * geom.layerHeightM;
    const vol = vel * area * dt;
    const frac = Math.min(0.2, vol / (sI.volumeM3 ?? 100));
    return {
      dWaterKg: (sI.waterKg ?? 0) * frac,
      dCarbonKg: (sI.carbonKg ?? 0) * frac,
      dMineralsKg: (sI.mineralsKg ?? 0) * frac,
      dOxygenKg: (sI.oxygenKg ?? 0) * frac,
      dEnergyJoules: (sI.internalEnergyJoules ?? 0) * frac,
    };
  }
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

// SPRINT 091 ADDITIONS:
export type H3ApertureClass = 'CLASS_II' | 'CLASS_III';

export interface IH3ResolutionApertureInfo {
  readonly resolution: number;
  readonly apertureClass: H3ApertureClass;
  readonly rotationAngleDegrees: number;
  readonly isRotated: boolean;
}

export interface IH3EdgeNormal {
  readonly nx: number;
  readonly ny: number;
}

export interface IH3EdgeOrientation {
  readonly resolution: number;
  readonly apertureClass: H3ApertureClass;
  readonly rotationRadians: number;
  readonly normalVectors: ReadonlyArray<IH3EdgeNormal>;
}

export interface ThermodynamicCellStocks {
  carbon_kg: number;
  water_kg: number;
  oxygen_kg: number;
  nitrogen_kg: number;
  minerals_kg: number;
  thermal_energy_kj: number;
}

export interface FluxField2D {
  readonly vx: number;
  readonly vy: number;
  readonly diffusionCoefficient: number;
  readonly thermalConductivity: number;
}

export interface CellGeometry {
  readonly resolution: number;
  readonly edgeLengthMeters: number;
  readonly heightMeters: number;
}

export interface H3DirectedEdge {
  readonly origin: string;
  readonly destination: string;
  readonly directionIndex: number;
}
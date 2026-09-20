// =============================================================================
// WEB OF LIFE - H3 DISCRETE GLOBAL GRID SYSTEM TYPE DEFINITIONS
// Retro-Compatible Multi-Sprint Specification (Sprints 002 - 095)
// =============================================================================

export type H3Resolution =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type H3ResolutionTier = H3Resolution;
export type Resolution = H3Resolution;

export type H3Index = string | bigint;

export type H3ApertureClass = "ClassII" | "ClassIII";

export enum ApertureClass {
  CLASS_II = "CLASS_II",
  CLASS_III = "CLASS_III",
}

export const H3_MIN_RESOLUTION: H3Resolution = 0;
export const H3_MAX_RESOLUTION: H3Resolution = 15;
export const H3_CELL_MODE: number = 1;
export const DIRECTION_CENTER: number = 0;

export const PENTAGON_BASE_CELLS: Set<number> = new Set([
  4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117
]);

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = "Spatial guard clause violation") {
    super(message);
    this.name = "SpatialGuardClauseException";
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export class InvalidH3ModeError extends Error {
  constructor(message: string = "Invalid H3 cell mode") {
    super(message);
    this.name = "InvalidH3ModeError";
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(message: string = "Invalid H3 base cell") {
    super(message);
    this.name = "InvalidH3BaseCellError";
  }
}

export class InvalidH3PaddingError extends Error {
  constructor(message: string = "Invalid H3 padding bits") {
    super(message);
    this.name = "InvalidH3PaddingError";
  }
}

export type Point2D = [number, number];
export type Vector3Tuple = [number, number, number];
export type Vec3 = Vector3Tuple;
export type Vec3D = Vector3Tuple;

export interface Vector2D {
  readonly x: number;
  readonly y: number;
  [key: string]: any;
}

export interface FluxVector2D {
  jX: number;
  jY: number;
}

export class Vector3D {
  public x: number;
  public y: number;
  public z: number;
  [index: number]: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  get 0(): number {
    return this.x;
  }
  set 0(val: number) {
    this.x = val;
  }

  get 1(): number {
    return this.y;
  }
  set 1(val: number) {
    this.y = val;
  }

  get 2(): number {
    return this.z;
  }
  set 2(val: number) {
    this.z = val;
  }

  *[Symbol.iterator](): Iterator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3DInput = Vector3D | Vector3Tuple | Vector3Object | number[] | readonly number[];

export type UnitVector3D = Vector3Tuple;

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export function toVec3D(input: Vector3DInput): Vector3Tuple {
  if (Array.isArray(input)) {
    return [input[0] ?? 0, input[1] ?? 0, input[2] ?? 0];
  }
  const obj = input as any;
  return [obj.x ?? obj[0] ?? 0, obj.y ?? obj[1] ?? 0, obj.z ?? obj[2] ?? 0];
}

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
  };
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, any>;
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
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  [key: string]: any;
}

export interface ThermodynamicStocks {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  carbon?: number;
  water?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  thermalEnergy?: number;
  thermalEnergyJoules?: number;
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
  centroid?: Vector3DInput | { lat: number; lng: number } | { latDeg: number; lonDeg: number };
  volumeM3?: number;
  volume?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  enthalpyJoules?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  soilDepthMeters?: number;
  elevationMeters?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  dissolvedOxygenKg?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  isPentagon?: boolean;
  thermalEnergyMJ?: number;
  internalEnergyJoules?: number;
  carbon?: number;
  water?: number;
  minerals?: number;
  oxygen?: number;
  thermalEnergy?: number;
  [key: string]: any;
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
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

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

export interface H3CellInterfaceMetrics {
  originIndex: string;
  neighborIndex: string;
  sharedEdgeLengthMeters: number;
  centroidDistanceMeters: number;
  bearingRadians: number;
  normalVector: Vector3Tuple;
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
  normalVector: Vector3Tuple;
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
  const cond = metrics.geometricConductance;
  const kHeat = params.eddyDiffusivityHeat ?? 10.0;
  const tA = stateA.temperatureKelvin ?? 295.15;
  const tB = stateB.temperatureKelvin ?? 295.15;
  const dTemp = tA - tB;
  const heatFluxJoules = cond * kHeat * dTemp * dt * 1000.0;

  const wA = stateA.waterMassKg ?? 1000.0;
  const wB = stateB.waterMassKg ?? 1000.0;
  const waterFluxKg = cond * (wA - wB) * 0.001 * dt;

  const cA = stateA.carbonMassKg ?? 100.0;
  const cB = stateB.carbonMassKg ?? 100.0;
  const carbonFluxKg = cond * (cA - cB) * 0.001 * dt;

  const mA = stateA.mineralMassKg ?? 50.0;
  const mB = stateB.mineralMassKg ?? 50.0;
  const mineralFluxKg = cond * (mA - mB) * 0.001 * dt;

  const entropyProducedJPerK = heatFluxJoules > 0
    ? heatFluxJoules * (1 / Math.max(1, tB) - 1 / Math.max(1, tA))
    : -heatFluxJoules * (1 / Math.max(1, tA) - 1 / Math.max(1, tB));

  return {
    deltaWaterKg: waterFluxKg,
    deltaEnthalpyJoules: heatFluxJoules,
    deltaCarbonKg: carbonFluxKg,
    deltaMineralKg: mineralFluxKg,
    entropyProducedJPerK: Math.max(0, entropyProducedJPerK),
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
  minerals?: number;
  oxygen?: number;
  thermal?: number;
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
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
  centroid: Vector3DInput;
}

export enum CellTopologyType {
  PENTAGON = "PENTAGON",
  HEXAGON = "HEXAGON"
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2: number;
  elevationM: number;
  stocks: {
    carbonMol?: number;
    waterKg?: number;
    mineralsMol?: number;
    oxygenMol?: number;
    thermalEnergyJ?: number;
    [key: string]: any;
  };
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
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6] as const;

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omitted: H3Direction): PentagonDirectionalTopology {
  return {
    presentDirections: ALL_H3_DIRECTIONS.filter((d) => d !== omitted) as H3Direction[],
    omittedDirection: omitted,
  };
}

export function validatePentagonTopology(topo: PentagonDirectionalTopology): boolean {
  if (!topo || !Array.isArray(topo.presentDirections)) return false;
  if (topo.presentDirections.length !== 5) return false;
  const set = new Set(topo.presentDirections);
  if (set.size !== 5) return false;
  if (set.has(topo.omittedDirection)) return false;
  for (const d of topo.presentDirections) {
    if (!ALL_H3_DIRECTIONS.includes(d)) return false;
  }
  return ALL_H3_DIRECTIONS.includes(topo.omittedDirection);
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
    let result = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        result |= (1 << ((d + 3) % 6));
      }
    }
    return result;
  }
};

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
    stateI: CellStockTensor,
    _stateJ: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex,
    velocity: number,
    _diffCoeff: number,
    _thermCond: number,
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
    const volFlow = velocity * area * dt;
    const frac = Math.min(0.2, volFlow / Math.max(1, stateI.volumeM3 ?? 1000));
    return {
      dWaterKg: (stateI.waterKg ?? 0) * frac,
      dCarbonKg: (stateI.carbonKg ?? 0) * frac,
      dMineralsKg: (stateI.mineralsKg ?? 0) * frac,
      dOxygenKg: (stateI.oxygenKg ?? 0) * frac,
      dEnergyJoules: (stateI.internalEnergyJoules ?? 0) * frac,
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
  INVALID = 7
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

export interface ConservedStocks {
  carbonMol: number;
  waterMol: number;
  mineralsMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
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

export interface H3StateTensor {
  readonly cellIndex: string;
  readonly resolution: number;
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly internalEnergyJoules: number;
  readonly fluxVector: Vector2D;
}
// =============================================================================
// WEB OF LIFE - SPATIAL DGGS H3 TYPES, ENUMS & INTERFACES
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 001 - 090)
// =============================================================================

export type H3Index = string | bigint;

/** Mode 1 represents standard hexagonal/pentagonal discrete cell indexes */
export const H3_CELL_MODE = 1;

/** Mode 2 represents directed edge indexes */
export const H3_DIRECTED_EDGE_MODE = 2;

export const H3_MIN_RESOLUTION = 0;
export const H3_MAX_RESOLUTION = 15;

/** Directional digits along aperture-7 hierarchy */
export const DIRECTION_CENTER = 0;
export const DIRECTION_K_AXES = 1;
export const DIRECTION_J_AXES = 2;
export const DIRECTION_JK_AXES = 3;
export const DIRECTION_I_AXES = 4;
export const DIRECTION_IK_AXES = 5;
export const DIRECTION_IJ_AXES = 6;
export const DIRECTION_INVALID = 7;

/**
 * 12 Canonical icosahedral pentagonal base cell IDs in H3 DGGS.
 * Encapsulated as an array supporting both .length, .size, and .has().
 */
const pentagonBaseCellArray = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117] as any;
const pentagonBaseCellSet = new Set<number>(pentagonBaseCellArray);
pentagonBaseCellArray.has = (val: number) => pentagonBaseCellSet.has(val);
pentagonBaseCellArray.size = 12;

export const PENTAGON_BASE_CELLS: any = pentagonBaseCellArray;
export const PENTAGON_BASE_CELL_SET: ReadonlySet<number> = pentagonBaseCellSet;

// =============================================================================
// 3D VECTOR & COORDINATE TYPES
// =============================================================================

export class Vector3D extends Array<number> {
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    super(x, y, z);
    Object.setPrototypeOf(this, Vector3D.prototype);
  }

  get x(): number {
    return this[0] ?? 0;
  }
  set x(v: number) {
    this[0] = v;
  }

  get y(): number {
    return this[1] ?? 0;
  }
  set y(v: number) {
    this[1] = v;
  }

  get z(): number {
    return this[2] ?? 0;
  }
  set z(v: number) {
    this[2] = v;
  }

  public magnitude(): number {
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
  }
}

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export type Vector3DInput = Vector3D | [number, number, number] | { x: number; y: number; z: number };
export type Vector3Tuple = [number, number, number];
export type Vector3Object = { x: number; y: number; z: number };
export type Vec3D = Vector3D | [number, number, number];
export type Vec3 = Vec3D;
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

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type LatLng = LatLngPoint;

export type Cartesian3D = [number, number, number] | Vector3D;

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
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06,
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
  constructor(message: string = 'Invalid H3 padding digits') {
    super(message);
    this.name = 'InvalidH3PaddingError';
  }
}

// =============================================================================
// THERMODYNAMIC STOCKS & OVERRIDES CONTRACTS
// =============================================================================

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

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
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
  centroid?: { x: number; y: number; z: number } | { lat: number; lng: number };
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  oxygenMassKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  internalEnergyJoules?: number;
  enthalpyJoules?: number;
  energyJoules?: number;
  temperatureKelvin?: number;
  volumeM3?: number;
  heightColumnMeters?: number;
  soilDepthMeters?: number;
  conductivity?: number;
  elevationMeters?: number;
  dissolvedOxygenKg?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  isPentagon?: boolean;
  thermalEnergyMJ?: number;
  [key: string]: any;
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  [key: string]: any;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon?: boolean;
  stocks: any;
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

export interface PentagonThermodynamicStocks {
  carbonDioxideKg: number;
  waterVaporKg: number;
  dustKg: number;
  oxygenKg: number;
  enthalpyJoules: number;
}

export interface FluxTransferDeltas {
  dCO2: number;
  dH2O: number;
  dDust: number;
  dO2: number;
  dEnthalpy: number;
}

export interface PatchThermodynamicStock {
  carbonMol: number;
  waterKg: number;
  mineralsMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
  temperatureKelvin: number;
}

export interface BaseCellStockVector {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  thermalEnergyJoules: number;
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

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  energyJoules: number;
  [key: string]: any;
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2?: number;
  elevationM?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  stocks?: any;
}

export interface CellSpatialContext {
  h3Index: string;
  state: {
    carbonKg: number;
    waterKg: number;
    mineralsKg: number;
    oxygenKg: number;
    energyJoules: number;
    [key: string]: any;
  };
  areaM2?: number;
  temperatureK?: number;
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

export interface CellFacetState {
  massDry?: number;
  massWater?: number;
  massCarbon?: number;
  massOxygen?: number;
  massMineral?: number;
  thermalEnergy?: number;
  temperature?: number;
  volume?: number;
  centroid?: Vector3DInput;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: any;
  neighbors: (string | bigint)[];
}

export interface ThermodynamicStocks {
  carbon?: number;
  water?: number;
  minerals?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  thermalEnergy?: number;
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
}

export interface DiffusionCoefficients {
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  thermalConductivity?: number;
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface StateStocks {
  carbonMol: number;
  waterMol: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol: number;
  energyJoules: number;
  [key: string]: any;
}

export interface H3AdjacencyRecord {
  cellIndex: string;
  isPentagon: boolean;
  neighbors: readonly string[] | string[];
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    [key: string]: any;
  };
  energyJoules: number;
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: {
    carbonKg: number;
    nitrogenKg: number;
    phosphorusKg: number;
    waterKg: number;
    oxygenKg: number;
    thermalJoules: number;
    [key: string]: any;
  };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
  [key: string]: any;
}

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState | any;
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
  diffusionCoeffs: any;
  blendAlpha?: number;
}

// =============================================================================
// DIRECTIONAL TOPOLOGY & BITMASK CONTRACTS
// =============================================================================

export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;

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

export const ALL_H3_DIRECTIONS: readonly H3Direction[] = Object.freeze([1, 2, 3, 4, 5, 6]);

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;

  const validDirs = new Set<H3Direction>(ALL_H3_DIRECTIONS);
  if (!validDirs.has(topology.omittedDirection)) return false;

  const presentSet = new Set<H3Direction>(topology.presentDirections);
  if (presentSet.size !== 5) return false;

  for (const d of topology.presentDirections) {
    if (!validDirs.has(d)) return false;
  }
  return true;
}

export function createPentagonTopology(omitted: H3Direction): PentagonDirectionalTopology {
  const present = ALL_H3_DIRECTIONS.filter((d) => d !== omitted);
  return {
    presentDirections: present,
    omittedDirection: omitted,
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
  direction: number;
  delta: StockVector;
}

export type DirectionBitmask = number;
export type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const H3DirectionBitmask = {
  DIRECTION_0: 1 << 0,
  DIRECTION_1: 1 << 1,
  DIRECTION_2: 1 << 2,
  DIRECTION_3: 1 << 3,
  DIRECTION_4: 1 << 4,
  DIRECTION_5: 1 << 5,
  NONE: 0,
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
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        res |= 1 << ((d + 3) % 6);
      }
    }
    return res;
  },
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
  public static isChannelPermeable(
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: number
  ): boolean {
    const opp = (dir + 3) % 6;
    return (srcMask & (1 << dir)) !== 0 && (tgtMask & (1 << opp)) !== 0;
  }

  public static computeEdgeTransfer(
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: number,
    vel: number,
    _diff: number,
    _cond: number,
    geom: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
    }
    const area = geom.edgeLengthM * geom.layerHeightM;
    const fluxRate = vel * area * dt;
    const donor = vel >= 0 ? stateI : stateJ;
    const frac = Math.min(0.2, Math.abs(fluxRate) / (donor.volumeM3 ?? 100));
    return {
      dWaterKg: (donor.waterKg ?? 0) * frac,
      dCarbonKg: (donor.carbonKg ?? 0) * frac,
      dMineralsKg: (donor.mineralsKg ?? 0) * frac,
      dOxygenKg: (donor.oxygenKg ?? 0) * frac,
      dEnergyJoules: (donor.internalEnergyJoules ?? 0) * frac,
    };
  }
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
}

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;
export type Resolution = number;

export interface SpatialGridConstraints {
  minResolution: number;
  maxResolution: number;
}

// =============================================================================
// SPRINT 051: H3CellInterfaceMetrics
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

export function createH3CellInterfaceMetrics(
  params: Omit<H3CellInterfaceMetrics, 'geometricConductance'> & { geometricConductance?: number }
): H3CellInterfaceMetrics {
  if (params.originIndex === params.neighborIndex) {
    throw new Error('Self-interface is invalid');
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new Error('sharedEdgeLengthMeters must be strictly positive');
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new Error('centroidDistanceMeters must be strictly positive');
  }

  const geometricConductance =
    params.geometricConductance ?? params.sharedEdgeLengthMeters / params.centroidDistanceMeters;

  return {
    ...params,
    geometricConductance,
  };
}

export function createReciprocalInterfaceMetrics(m: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  return createH3CellInterfaceMetrics({
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
  });
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
  params: FluxComputationParams = {}
) {
  const diffT = (stateA.temperatureKelvin ?? 295.15) - (stateB.temperatureKelvin ?? 295.15);
  const eddy = params.eddyDiffusivityHeat ?? 15.0;
  const qHeat = eddy * (diffT / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const diffW = (stateA.waterMassKg ?? 100000) - (stateB.waterMassKg ?? 100000);
  const qWater = 0.001 * (diffW / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;

  const diffC = (stateA.carbonMassKg ?? 500) - (stateB.carbonMassKg ?? 500);
  const qCarbon = 0.0001 * (diffC / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;

  const diffM = (stateA.mineralMassKg ?? 150) - (stateB.mineralMassKg ?? 150);
  const qMineral = 0.0001 * (diffM / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt;

  const tA = Math.max(1, stateA.temperatureKelvin ?? 295.15);
  const tB = Math.max(1, stateB.temperatureKelvin ?? 295.15);
  const entropyProduced = Math.abs(qHeat) * Math.abs(1 / tB - 1 / tA);

  return {
    deltaWaterKg: -qWater,
    deltaEnthalpyJoules: -qHeat,
    deltaCarbonKg: -qCarbon,
    deltaMineralKg: -qMineral,
    entropyProducedJPerK: entropyProduced,
  };
}
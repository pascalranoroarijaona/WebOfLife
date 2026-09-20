// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & THERMODYNAMIC TYPES (RETRO-COMPATIBLE ENGINE)
// Sprints 002 - 092 Unified Specification
// =============================================================================

export type H3Index = string | bigint;

/**
 * Valid discrete aperture-7 hierarchical resolution levels in H3 DGGS.
 * Resolution 0 represents base icosahedral cells (~4.357e6 km²),
 * while resolution 15 represents sub-meter tessellations (~0.895 m²).
 */
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type Resolution = H3Resolution;
export type H3ResolutionTier = H3Resolution;
export type H3ApertureClass = 'CLASS_II' | 'CLASS_III';

export const H3_CELL_MODE = 1;
export const H3_MIN_RESOLUTION: H3Resolution = 0;
export const H3_MAX_RESOLUTION: H3Resolution = 15;
export const DIRECTION_CENTER = 0;

const PENTAGON_BASE_ARRAY = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELLS: number[] & { has(val: number): boolean } = Object.assign(
  PENTAGON_BASE_ARRAY,
  {
    has(val: number): boolean {
      return PENTAGON_BASE_ARRAY.includes(val);
    },
  }
);
export const PENTAGON_BASE_CELL_SET = new Set<number>(PENTAGON_BASE_CELLS);
export const TOTAL_BASE_CELLS = 122;

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'H3 Index cannot be null, undefined, or empty.') {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export class InvalidH3ModeError extends Error {
  constructor(message: string = 'Invalid H3 cell mode') {
    super(message);
    this.name = 'InvalidH3ModeError';
    Object.setPrototypeOf(this, InvalidH3ModeError.prototype);
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(message: string = 'Invalid H3 base cell') {
    super(message);
    this.name = 'InvalidH3BaseCellError';
    Object.setPrototypeOf(this, InvalidH3BaseCellError.prototype);
  }
}

export class InvalidH3PaddingError extends Error {
  constructor(message: string = 'Invalid H3 padding digits') {
    super(message);
    this.name = 'InvalidH3PaddingError';
    Object.setPrototypeOf(this, InvalidH3PaddingError.prototype);
  }
}

export interface CellStocks {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  mineralsKg: number;
  thermalEnergyJoules: number;
  [key: string]: any;
}

export interface FluxDeltas {
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaOxygenKg: number;
  deltaMineralsKg: number;
  deltaThermalEnergyJoules: number;
  entropyProductionJoulesPerKelvin: number;
}

export interface AdjacencyEdge {
  id?: string;
  fromCell: string;
  toCell: string;
  sharedLengthMeters: number;
  centroidDistanceMeters: number;
  [key: string]: any;
}

export interface AdjacencyWeightEntry {
  fromCell: string;
  toCell: string;
  weight: number;
  conductance: number;
  distance: number;
}

export interface SparseWeightMatrix {
  resolution: H3Resolution;
  cells: string[];
  entries: AdjacencyWeightEntry[];
  weights: Map<string, Map<string, number>>;
  isSymmetric: boolean;
}

export interface HexagonalMetrics {
  resolution: H3Resolution;
  areaM2: number;
  edgeLengthMeters: number;
  centroidDistanceMeters: number;
  interfaceLengthMeters: number;
  volumeM3: number;
  conductanceRatio: number;
}

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number];
export type Point2D = [number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export class Vector3D {
  [index: number]: number;
  constructor(public x: number = 0, public y: number = 0, public z: number = 0) {
    this[0] = x;
    this[1] = y;
    this[2] = z;
  }
  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  *[Symbol.iterator](): Iterator<number> {
    yield this.x;
    yield this.y;
    yield this.z;
  }
}

export type Vector3DInput = Vector3D | Vector3Tuple | Vector3Object | LatLngPoint | { lat: number; lng: number } | [number, number, number];

export function createVec3D(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return new Vector3D(x, y, z);
}

export interface LatLngPoint {
  lat?: number;
  lng?: number;
  latDeg?: number;
  lonDeg?: number;
  latitude?: number;
  longitude?: number;
}
export type LatLng = LatLngPoint;
export type SphericalCoordinates = LatLngPoint;

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export type Cartesian3D = [number, number, number];

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

export interface ThermodynamicStocks {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  [key: string]: any;
}

export interface ThermodynamicCellStocks {
  carbon_kg: number;
  water_kg: number;
  oxygen_kg: number;
  nitrogen_kg: number;
  minerals_kg: number;
  thermal_energy_kj: number;
  [key: string]: any;
}

export interface CellGeometry {
  resolution?: number;
  edgeLengthMeters?: number;
  heightMeters?: number;
  cellId?: string;
  neighbors?: string[];
  volumeM3?: number;
  interfaceAreasM2?: number[];
  centroidDistancesM?: number[];
  [key: string]: any;
}

export interface FluxField2D {
  vx: number;
  vy: number;
  diffusionCoefficient: number;
  thermalConductivity: number;
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
  radius?: number;
  [key: string]: any;
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, any>;
  [key: string]: any;
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
  stocks: any;
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
  SPECIFIC_HEAT: {
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
    REGOLITH: 840.0,
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  },
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 1e5,
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

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6 | number;
export const ALL_H3_DIRECTIONS: H3Direction[] = [1, 2, 3, 4, 5, 6];

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

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const present = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return {
    presentDirections: present,
    omittedDirection,
  };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;
  const unique = new Set(topology.presentDirections);
  if (unique.size !== 5) return false;
  for (const d of topology.presentDirections) {
    if (d < 1 || d > 6) return false;
  }
  return topology.omittedDirection >= 1 && topology.omittedDirection <= 6;
}

export interface StockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy?: number;
  thermalEnergy?: number;
  [key: string]: any;
}
export type CellStockVector = StockVector;

export interface StateStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  energyJoules?: number;
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
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
    [key: string]: any;
  };
  blendAlpha?: number;
}

export interface CellGeometryState {
  centroid: Cartesian3D | Vector3DInput;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
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
  ALL: 63,
  BY_INDEX: [1, 2, 4, 8, 16, 32],
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

export const DirectionalFluxOperator = {
  isChannelPermeable(srcMask: number, tgtMask: number, dir: number): boolean {
    const opp = (dir + 3) % 6;
    return H3DirectionBitmask.hasDirection(srcMask, dir) && H3DirectionBitmask.hasDirection(tgtMask, opp);
  },
  computeEdgeTransfer(
    stateI: any,
    stateJ: any,
    srcMask: number,
    tgtMask: number,
    dir: number,
    vel: number,
    _diff: number,
    _cond: number,
    geom: any,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
    }
    const area = (geom.edgeLengthM ?? 1000) * (geom.layerHeightM ?? 10);
    const frac = Math.min(0.2, (vel * area * dt) / (stateI.volumeM3 ?? 100));
    return {
      dWaterKg: stateI.waterKg * frac,
      dCarbonKg: stateI.carbonKg * frac,
      dMineralsKg: stateI.mineralsKg * frac,
      dOxygenKg: stateI.oxygenKg * frac,
      dEnergyJoules: stateI.internalEnergyJoules * frac,
    };
  },
};

export interface DirectionalGeometry {
  edgeLengthM: number;
  layerHeightM: number;
  centroidDistanceM: number;
}

export type H3DirectionDigit = number;

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
  state: any;
  areaM2: number;
  temperatureK?: number;
}

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg?: number;
  phosphorusKg?: number;
  energyJoules: number;
  [key: string]: any;
}

export interface CellStockState {
  index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  [key: string]: any;
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2: number;
  elevationM: number;
  stocks: any;
  [key: string]: any;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon?: boolean;
  stocks: any;
  [key: string]: any;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: any;
  neighbors: readonly string[] | string[];
}

export interface CellStockTensor {
  [key: string]: any;
}

export interface BaseCellStockVector {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  thermalEnergyJoules: number;
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
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

export interface DiffusionCoefficients {
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

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
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

export function computeInterfaceFlux(
  stateA: any,
  stateB: any,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params?: FluxComputationParams
) {
  const cond = (params?.eddyDiffusivityHeat ?? 15.0) * metrics.geometricConductance;
  const tempDiff = stateA.temperatureKelvin - stateB.temperatureKelvin;
  const dEnthalpy = cond * tempDiff * dt;

  const kSat = params?.kSatPorous ?? 1e-4;
  const dWater = kSat * (stateA.waterMassKg - stateB.waterMassKg) * metrics.geometricConductance * 0.1 * dt;
  const dCarbon = 0.001 * dWater * (stateA.carbonMassKg / (stateA.waterMassKg || 1));
  const dMineral = 0.0005 * dWater * (stateA.mineralMassKg / (stateA.waterMassKg || 1));

  const tA = Math.max(stateA.temperatureKelvin, 1);
  const tB = Math.max(stateB.temperatureKelvin, 1);
  const entropy = Math.abs(dEnthalpy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaWaterKg: -dWater,
    deltaEnthalpyJoules: -dEnthalpy,
    deltaCarbonKg: -dCarbon,
    deltaMineralKg: -dMineral,
    entropyProducedJPerK: entropy,
  };
}

export interface DetailedInterfaceNormalResult {
  normal: [number, number, number];
  arcLengthMeters: number;
  alignmentCos: number;
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

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: any;
  hydraulicHeadMeters?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}
export const CellNode = class {};

export interface SpatialStockState {
  carbonKg?: number;
  waterKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  energyJoules?: number;
  volumeM3?: number;
  [key: string]: any;
}
export const SpatialStockState = class {};

export interface AdvectiveEdgeContext {
  normalVelocityMs?: number;
  edgeLengthMeters: number;
  layerDepthMeters?: number;
  cellVolumeM3?: number;
  flowVelocityMs?: number;
  flowAngleRadians?: number;
  boundaryBearingRadians?: number;
  timeDeltaSeconds?: number;
  timeStepSeconds?: number;
  [key: string]: any;
}
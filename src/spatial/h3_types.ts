// =============================================================================
// WEB OF LIFE - SPATIAL KINEMATICS & H3 DGGS TYPE DEFINITIONS (RETRO-COMPATIBLE)
// Unified Architecture: Sprints 002 - 089
// =============================================================================

export type Point2D = [number, number];

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3DInput = Vector3Tuple | Vector3Object | Vector3D | number[] | readonly number[];

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type UnitVector3D = [number, number, number];

/**
 * 3D Vector primitive supporting both property access (x, y, z)
 * and index-based component access ([0], [1], [2]).
 */
export class Vector3D {
  [index: number]: number;
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;

  public static readonly ZERO: Vector3D = new Vector3D(0, 0, 0);

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this[0] = x;
    this[1] = y;
    this[2] = z;
  }

  public add(other: Vector3DInput): Vector3D {
    const o = toVec3Tuple(other);
    return new Vector3D(this.x + o[0], this.y + o[1], this.z + o[2]);
  }

  public subtract(other: Vector3DInput): Vector3D {
    const o = toVec3Tuple(other);
    return new Vector3D(this.x - o[0], this.y - o[1], this.z - o[2]);
  }

  public scale(factor: number): Vector3D {
    return new Vector3D(this.x * factor, this.y * factor, this.z * factor);
  }

  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  public equals(other: Vector3DInput, epsilon: number = 1e-12): boolean {
    const o = toVec3Tuple(other);
    return (
      Math.abs(this.x - o[0]) <= epsilon &&
      Math.abs(this.y - o[1]) <= epsilon &&
      Math.abs(this.z - o[2]) <= epsilon
    );
  }
}

function toVec3Tuple(v: Vector3DInput): [number, number, number] {
  if (Array.isArray(v)) return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
  if (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v) return [v.x, v.y, v.z];
  return [0, 0, 0];
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
  }
}

export class InvalidH3ModeError extends Error {
  constructor(message?: string) {
    super(message ?? 'Invalid H3 cell mode: expected mode 1 (standard hexagonal cell)');
    this.name = 'InvalidH3ModeError';
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(message?: string) {
    super(message ?? 'Invalid H3 base cell: must be between 0 and 121 inclusive');
    this.name = 'InvalidH3BaseCellError';
  }
}

export class InvalidH3PaddingError extends Error {
  constructor(message?: string) {
    super(message ?? 'Invalid H3 padding: unused resolution digits must be padded with 7s');
    this.name = 'InvalidH3PaddingError';
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

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

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6] as const;

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return {
    presentDirections,
    omittedDirection
  };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;
  const unique = new Set(topology.presentDirections);
  if (unique.size !== 5) return false;
  return topology.presentDirections.every((d) => d >= 1 && d <= 6) &&
         topology.omittedDirection >= 1 && topology.omittedDirection <= 6;
}

export type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type DirectionBitmask = number;

export class H3DirectionBitmask {
  public static readonly DIRECTION_0: DirectionBitmask = 1 << 0;
  public static readonly DIRECTION_1: DirectionBitmask = 1 << 1;
  public static readonly DIRECTION_2: DirectionBitmask = 1 << 2;
  public static readonly DIRECTION_3: DirectionBitmask = 1 << 3;
  public static readonly DIRECTION_4: DirectionBitmask = 1 << 4;
  public static readonly DIRECTION_5: DirectionBitmask = 1 << 5;

  public static readonly NONE: DirectionBitmask = 0;
  public static readonly ALL: DirectionBitmask = 63;

  public static readonly BY_INDEX: readonly DirectionBitmask[] = [
    1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5
  ];

  public static hasDirection(mask: DirectionBitmask, dir: number): boolean {
    return (mask & (1 << dir)) !== 0;
  }

  public static setDirection(mask: DirectionBitmask, dir: number): DirectionBitmask {
    return mask | (1 << dir);
  }

  public static clearDirection(mask: DirectionBitmask, dir: number): DirectionBitmask {
    return mask & ~(1 << dir);
  }

  public static oppositeDirection(dir: H3DirectionIndex): H3DirectionIndex {
    return ((dir + 3) % 6) as H3DirectionIndex;
  }

  public static invertMask(mask: DirectionBitmask): DirectionBitmask {
    let inv: DirectionBitmask = 0;
    for (let i = 0; i < 6; i++) {
      if ((mask & (1 << i)) !== 0) {
        inv |= 1 << ((i + 3) % 6);
      }
    }
    return inv;
  }
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
    return H3DirectionBitmask.hasDirection(srcMask, dir) &&
           H3DirectionBitmask.hasDirection(tgtMask, opp);
  }

  public static computeEdgeTransfer(
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    maskI: DirectionBitmask,
    maskJ: DirectionBitmask,
    dir: number,
    velocityMs: number,
    diffusivity: number,
    thermalCond: number,
    geometry: DirectionalGeometry,
    dtSeconds: number
  ) {
    if (!this.isChannelPermeable(maskI, maskJ, dir)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0
      };
    }

    const contactArea = geometry.edgeLengthM * geometry.layerHeightM;
    const volFlow = velocityMs * contactArea * dtSeconds;
    const donor = volFlow >= 0 ? stateI : stateJ;
    const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 || 100));

    return {
      dWaterKg: (donor.waterKg ?? 0) * frac,
      dCarbonKg: (donor.carbonKg ?? 0) * frac,
      dMineralsKg: (donor.mineralsKg ?? 0) * frac,
      dOxygenKg: (donor.oxygenKg ?? 0) * frac,
      dEnergyJoules: (donor.internalEnergyJoules || 0) * frac
    };
  }
}

export enum CellTopologyType {
  PENTAGON = "PENTAGON",
  HEXAGON = "HEXAGON"
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

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: any;
}

export type ThermodynamicStocks = CellThermodynamicStocks;

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaMineralsKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  deltaNitrogenKg?: number;
  deltaPhosphorusKg?: number;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon?: boolean;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  internalEnergyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  soilDepthMeters?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  centroid?: any;
  conductivity?: number;
  heightColumnMeters?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  volumeM3?: number;
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
  subsolarVector: UnitVector3D;
  cells: Map<string, any>;
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

export interface CellSpatialState {
  cellIndex: string;
  isPentagon?: boolean;
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
  [key: string]: any;
}

export interface CellSpatialContext {
  h3Index: string | bigint;
  state: {
    carbonKg: number;
    waterKg: number;
    mineralsKg: number;
    oxygenKg: number;
    energyJoules: number;
    [key: string]: any;
  };
  areaM2: number;
  temperatureK: number;
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

export interface BaseCellStockVector {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  thermalEnergyJoules: number;
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
  [key: string]: any;
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

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
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

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const gradT = ((stateA.temperatureKelvin ?? 295.15) - (stateB.temperatureKelvin ?? 288.15)) / metrics.centroidDistanceMeters;
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;
  const qHeat = kHeat * gradT * metrics.atmosphericContactAreaM2 * dt;

  const gradHead = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters + metrics.topographicSlope;
  const kSat = params.kSatPorous ?? 1e-4;
  const waterFlux = kSat * gradHead * metrics.subterraneanContactAreaM2 * 1000 * dt;

  const frac = 0.001 * (waterFlux / Math.max(1, stateA.waterMassKg ?? 100000));
  const cFlux = (stateA.carbonMassKg ?? 0) * frac;
  const mFlux = (stateA.mineralMassKg ?? 0) * frac;

  const tA = Math.max(1, stateA.temperatureKelvin ?? 295.15);
  const tB = Math.max(1, stateB.temperatureKelvin ?? 288.15);
  const entropy = Math.abs(qHeat) * Math.abs(1 / tB - 1 / tA);

  return {
    deltaWaterKg: waterFlux,
    deltaEnthalpyJoules: qHeat,
    deltaCarbonKg: cFlux,
    deltaMineralKg: mFlux,
    entropyProducedJPerK: entropy,
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
  CHANNEL_COUNT = 8
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

export const THERMODYNAMIC_CONSTANTS = {
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6
  }
};

// Sprint 089 Aperture Hierarchy Additions
export interface ApertureAnalysisResult {
  readonly index: string;
  readonly resolution: number;
  readonly hasNonZeroDigits: boolean;
  readonly firstNonZeroResolution: number | null;
  readonly nonZeroDigitCount: number;
  readonly digitSequence: readonly number[];
}

export interface IH3ApertureInspector {
  hasNonZeroApertureDigits(index: bigint | string, resolution?: number): boolean;
  getFirstNonZeroApertureResolution(index: bigint | string): number | null;
  getApertureDigit(index: bigint | string, resolution: number): number;
  analyzeApertureStructure(index: bigint | string): ApertureAnalysisResult;
}

export interface PatchThermodynamicStock {
  carbonMol: number;
  waterKg: number;
  mineralsMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
  temperatureKelvin: number;
}

export interface CoarseningTransferResult {
  parentStock: PatchThermodynamicStock;
  childStocks: PatchThermodynamicStock[];
  totalEntropyGenerated: number;
  conservationError: number;
}

export interface ApertureInspectionTelemetry {
  readonly isNonZero: boolean;
  readonly deltaMass: Readonly<Record<string, number>>;
  readonly deltaEnthalpy: number;
  readonly entropyGenerated: number;
}
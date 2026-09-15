/**
 * Web of Life - H3 Types and Thermodynamic State Definitions
 * Comprehensive Multi-Sprint Unified Interface (Sprints 002 - 087)
 */

// =============================================================================
// SPRINT 087 ICOSAHEDRAL BASE CELL DIRECTIONS & DEFECT TYPINGS
// =============================================================================

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

export type BaseCellIndex = number;

export interface IPentagonDefectMetadata {
  readonly baseCell: number;
  readonly isPentagon: boolean;
  readonly missingDirection: Direction;
  readonly validNeighborCount: 5 | 6;
}

export interface BaseCellStockVector {
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly oxygenKg: number;
  readonly nitrogenKg: number;
  readonly phosphorusKg: number;
  readonly thermalEnergyJoules: number;
}

export interface DirectionalStockFlux {
  readonly carbonFluxKg: number;
  readonly waterFluxKg: number;
  readonly oxygenFluxKg: number;
  readonly nitrogenFluxKg: number;
  readonly phosphorusFluxKg: number;
  readonly heatFluxJoules: number;
}

export interface RedistributionResult {
  readonly updatedStocks: ReadonlyMap<number, BaseCellStockVector>;
  readonly totalCarbonDeltaKg: number;
  readonly totalWaterDeltaKg: number;
  readonly totalEnergyDeltaJoules: number;
  readonly omittedDirectionBoundaryCollisionsPrevented: number;
}

// =============================================================================
// SPATIAL ERROR CODES & EXCEPTIONS
// =============================================================================

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
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
  constructor(message: string = 'Invalid H3 padding digits') {
    super(message);
    this.name = 'InvalidH3PaddingError';
  }
}

// =============================================================================
// VECTOR & GEOMETRIC TYPINGS
// =============================================================================

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  0: number;
  1: number;
  2: number;
  x: number;
  y: number;
  z: number;
  length?: number;
  [key: string]: any;
}

export type Vector3DInput = Vector3D | [number, number, number] | Vector3Object | any;
export type Vector3Input = Vector3DInput;
export type Cartesian3D = [number, number, number] | Vector3D | Vector3Object;

export type Point2D = [number, number];

export type UnitVector3D = [number, number, number] | Vector3Object | Vector3D;

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg?: number;
  lonDeg?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

// =============================================================================
// RESOLUTION & DIRECTION APERTURE TYPINGS
// =============================================================================

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6 | number;

export const ALL_H3_DIRECTIONS: readonly H3Direction[] = Object.freeze([1, 2, 3, 4, 5, 6]);

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = ALL_H3_DIRECTIONS.filter(d => d !== omittedDirection) as H3Direction[];
  return {
    presentDirections,
    omittedDirection,
  };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;
  const set = new Set(topology.presentDirections);
  if (set.size !== 5) return false;
  for (const d of topology.presentDirections) {
    if (!ALL_H3_DIRECTIONS.includes(d)) return false;
  }
  return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}

// SPRINT 084 DIRECTION BITMASKS
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
    stateI: any,
    stateJ: any,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex,
    velocity: number,
    _diffusivity: number,
    _conductivity: number,
    geometry: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0
      };
    }
    const area = geometry.edgeLengthM * geometry.layerHeightM;
    const volFlow = velocity * area * dt;
    const frac = Math.min(0.2, volFlow / (stateI.volumeM3 || 100));
    return {
      dWaterKg: (stateI.waterKg ?? 0) * frac,
      dCarbonKg: (stateI.carbonKg ?? 0) * frac,
      dMineralsKg: (stateI.mineralsKg ?? 0) * frac,
      dOxygenKg: (stateI.oxygenKg ?? 0) * frac,
      dEnergyJoules: (stateI.internalEnergyJoules ?? 0) * frac
    };
  }
}

// =============================================================================
// THERMODYNAMIC STOCKS & STATES
// =============================================================================

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
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

export interface ConservedStockDelta {
  carbonKg: number;
  waterKg: number;
  oxygenKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  energyJoules: number;
  [key: string]: number;
}

export interface StockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
}

export interface CellStockVector {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface DirectionalFlux {
  direction: H3Direction;
  delta: StockVector;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: any;
  temperatureKelvin?: number;
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  volumeM3?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
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

export interface BoundaryContactResult {
  isAdjacent: boolean;
  contactAreaM2: number;
  edgeLengthMeters: number;
  radialOverhangMeters: number;
  overlapHeightMeters?: number;
  midPointElevationMeters?: number;
  boundaryLengthMeters?: number;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters?: number;
  contactAreaM2?: number;
  normalVelocity?: number;
  dt?: number;
  layerDepthMeters?: number;
  cellVolumeM3?: number;
  flowVelocityMs?: number;
  flowAngleRadians?: number;
  boundaryBearingRadians?: number;
  timeDeltaSeconds?: number;
  [key: string]: any;
}

export interface SpatialHexCell {
  h3Index: string;
  centroid?: any;
  areaM2?: number;
  stocks?: any;
  [key: string]: any;
}

export interface InterfaceFluxState {
  massAirKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massOxygenKg?: number;
  massMineralsKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: any;
}

export interface CellGeometryState {
  centroid: any;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
  [key: string]: any;
}

export interface SpatialCellState {
  h3Index: string;
  isPentagon: boolean;
  stocks: CellStockVector | any;
  [key: string]: any;
}

export interface StateStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  energyJoules?: number;
  [key: string]: any;
}

// =============================================================================
// CELL MESH & TOPOLOGICAL STATES
// =============================================================================

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: [number, number, number];
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
    [key: string]: any;
  };
}

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, CellBiophysicalState>;
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
}

export interface CellSpatialState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon?: boolean;
  areaM2?: number;
  elevationM?: number;
  stocks?: CellStockVector | any;
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

export interface CellMassEnergyState {
  readonly carbonKg: number;
  readonly waterKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly energyJoules: number;
}

export interface FluxTransferVector {
  readonly deltaCarbonKg: number;
  readonly deltaWaterKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnergyJoules: number;
}

export interface CellSpatialContext {
  readonly h3Index: string;
  readonly state: CellMassEnergyState;
  readonly areaM2: number;
  readonly temperatureK: number;
}

export interface PentagonalFluxExchangeResult {
  readonly sourceIndex: string;
  readonly neighborIndex: string;
  readonly apertureDirection: number;
  readonly transfer: FluxTransferVector;
  readonly entropyGeneratedJPerK: number;
}

export interface PentagonApertureResult {
  readonly isPentagonBaseCell: boolean;
  readonly resolution: number;
  readonly baseCell: number;
  readonly allDigits: readonly number[];
  readonly nonZeroDigits: readonly number[];
  readonly isPurePentagon: boolean;
  readonly leadingNonZeroDigit: number | null;
  readonly leadingNonZeroResolution: number | null;
  readonly leadingCenterCount: number;
  readonly hasInvalidPentagonDigit: boolean;
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

export interface CellStockTensor {
  massH2O?: number;
  massCarbon?: number;
  massOxygen?: number;
  massMinerals?: number;
  energyJoules?: number;
  temperatureK?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  internalEnergyJoules?: number;
  volumeM3?: number;
  temperatureKelvin?: number;
  [key: string]: any;
}

// =============================================================================
// INTERFACE METRICS (SPRINT 051)
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
  const geometricConductance = params.geometricConductance ?? (params.sharedEdgeLengthMeters / params.centroidDistanceMeters);
  return {
    ...params,
    geometricConductance
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
    geometricConductance: metrics.geometricConductance
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
  const gradT = (stateA.temperatureKelvin! - stateB.temperatureKelvin!) / metrics.centroidDistanceMeters;
  const eddyK = params.eddyDiffusivityHeat ?? 15.0;
  const dEnthalpy = eddyK * gradT * metrics.atmosphericContactAreaM2 * dt;

  const gradH = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) / metrics.centroidDistanceMeters + metrics.topographicSlope;
  const kSat = params.kSatPorous ?? 1e-4;
  const dWater = kSat * gradH * metrics.subterraneanContactAreaM2 * dt * 1000.0;

  const dCarbon = dWater * 0.005;
  const dMineral = dWater * 0.0015;

  const invTA = 1.0 / (stateA.temperatureKelvin ?? 295.15);
  const invTB = 1.0 / (stateB.temperatureKelvin ?? 288.15);
  const entropy = Math.abs(dEnthalpy * (invTB - invTA));

  return {
    deltaWaterKg: -dWater,
    deltaEnthalpyJoules: -dEnthalpy,
    deltaCarbonKg: -dCarbon,
    deltaMineralKg: -dMineral,
    entropyProducedJPerK: entropy
  };
}

// =============================================================================
// DIFFUSION & THERMODYNAMIC CHANNELS (SPRINTS 045, 047)
// =============================================================================

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
  diffWater?: number;
  diffCarbon?: number;
  diffMinerals?: number;
  diffOxygen?: number;
  thermalCond?: number;
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
// =============================================================================
// WEB OF LIFE - UNIFIED H3 SPATIAL TOPOLOGY & THERMODYNAMIC TYPES (SPRINTS 001-086)
// =============================================================================

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type Point2D = [number, number];

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  [index: number]: number;
}

export type Vector3DInput = Vector3D | Vec3D | [number, number, number] | { x?: number; y?: number; z?: number; [index: number]: number };

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type UnitVector3D = [number, number, number];

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
  }
}

export class InvalidH3ModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidH3ModeError';
  }
}

export class InvalidH3BaseCellError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidH3BaseCellError';
  }
}

export class InvalidH3ResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidH3ResolutionError';
  }
}

export class InvalidH3PaddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidH3PaddingError';
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;
export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CellThermodynamicStocks {
  carbonKg?: number;
  carbonMol?: number;
  waterKg?: number;
  waterMol?: number;
  mineralKg?: number;
  mineralsKg?: number;
  nitrogenKg?: number;
  nitrogenMol?: number;
  phosphorusKg?: number;
  phosphorusMol?: number;
  oxygenKg?: number;
  oxygenMol?: number;
  thermalEnergyJoules?: number;
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

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaMineralsKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  [key: string]: any;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  centroid?: any;
  temperatureKelvin?: number;
  internalEnergyJoules?: number;
  enthalpyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  volumeM3?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  isPentagon?: boolean;
  thermalEnergyMJ?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  energyJoules?: number;
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
    [key: string]: any;
  };
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
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
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
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

export enum CellTopologyType {
  HEXAGON = 'HEXAGON',
  PENTAGON = 'PENTAGON',
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

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = Object.freeze([1, 2, 3, 4, 5, 6]);

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  const set = new Set<H3Direction>(topology.presentDirections);
  if (set.size !== 5) return false;
  if (set.has(topology.omittedDirection)) return false;
  for (const dir of ALL_H3_DIRECTIONS) {
    if (!set.has(dir) && dir !== topology.omittedDirection) return false;
  }
  return true;
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

export class H3DirectionBitmask {
  public static readonly DIRECTION_0 = 1 << 0;
  public static readonly DIRECTION_1 = 1 << 1;
  public static readonly DIRECTION_2 = 1 << 2;
  public static readonly DIRECTION_3 = 1 << 3;
  public static readonly DIRECTION_4 = 1 << 4;
  public static readonly DIRECTION_5 = 1 << 5;
  public static readonly NONE = 0;
  public static readonly ALL = 63;

  public static readonly BY_INDEX: readonly DirectionBitmask[] = Object.freeze([
    1 << 0,
    1 << 1,
    1 << 2,
    1 << 3,
    1 << 4,
    1 << 5,
  ]);

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
    let result = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        result |= 1 << ((d + 3) % 6);
      }
    }
    return result;
  }
}

export interface DirectionalGeometry {
  edgeLengthM: number;
  layerHeightM: number;
  centroidDistanceM: number;
}

export interface CellStockTensor {
  waterKg: number;
  carbonKg: number;
  mineralsKg: number;
  oxygenKg: number;
  internalEnergyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
  massH2O?: number;
  massCarbon?: number;
  massOxygen?: number;
  massMinerals?: number;
  energyJoules?: number;
  temperatureK?: number;
}

export class DirectionalFluxOperator {
  public static isChannelPermeable(
    sourceMask: DirectionBitmask,
    targetMask: DirectionBitmask,
    dir: H3DirectionIndex
  ): boolean {
    const opp = H3DirectionBitmask.oppositeDirection(dir);
    return H3DirectionBitmask.hasDirection(sourceMask, dir) && H3DirectionBitmask.hasDirection(targetMask, opp);
  }

  public static computeEdgeTransfer(
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    maskI: DirectionBitmask,
    maskJ: DirectionBitmask,
    direction: H3DirectionIndex,
    velocity: number,
    diffusivity: number,
    thermalConductivity: number,
    geometry: DirectionalGeometry,
    dt: number
  ) {
    if (!DirectionalFluxOperator.isChannelPermeable(maskI, maskJ, direction)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0,
      };
    }

    const area = geometry.edgeLengthM * geometry.layerHeightM;
    const vol = velocity * area * dt;
    const frac = Math.min(0.2, Math.abs(vol) / (stateI.volumeM3 || 100));

    const dWater = stateI.waterKg * frac;
    const dCarbon = stateI.carbonKg * frac;
    const dMinerals = stateI.mineralsKg * frac;
    const dOxygen = stateI.oxygenKg * frac;
    const dEnergy = stateI.internalEnergyJoules * frac;

    return {
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dMineralsKg: dMinerals,
      dOxygenKg: dOxygen,
      dEnergyJoules: dEnergy,
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
  const tA = stateA.temperatureKelvin ?? 295.15;
  const tB = stateB.temperatureKelvin ?? 288.15;
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;
  const heatFlux = (kHeat * (tA - tB) / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const dWater = 10.0 * dt * metrics.geometricConductance;
  const dCarbon = 0.05 * dt * metrics.geometricConductance;
  const dMineral = 0.01 * dt * metrics.geometricConductance;

  let entropy = 0;
  if (tA !== tB) {
    const q = Math.abs(heatFlux);
    entropy = q * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
  }

  return {
    deltaWaterKg: dWater,
    deltaEnthalpyJoules: heatFlux,
    deltaCarbonKg: dCarbon,
    deltaMineralKg: dMineral,
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

// SPRINT 086 INTERFACES
export interface PentagonApertureResult {
  readonly h3Index: string;
  readonly resolution: number;
  readonly baseCell: number;
  readonly isPentagonBaseCell: boolean;
  readonly isPurePentagon: boolean;
  readonly allDigits: readonly number[];
  readonly nonZeroDigits: readonly number[];
  readonly leadingNonZeroDigit: number | null;
  readonly leadingNonZeroResolution: number | null;
  readonly leadingCenterCount: number;
  readonly hasInvalidPentagonDigit: boolean;
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
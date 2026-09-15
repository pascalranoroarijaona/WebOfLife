/**
 * Web of Life - H3 Spatial Discrete Global Grid System Types
 * Unified Retro-Compatible Type Engine (Sprints 001 - 085)
 */

export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;
export type Resolution = H3ResolutionTier;
export type H3Index = string;

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number];
export type Cartesian3D = [number, number, number];
export type Point2D = [number, number];

export interface Vector3D {
  x?: number;
  y?: number;
  z?: number;
  [key: string]: any;
}

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export interface LatLngPoint {
  readonly lat: number;
  readonly lng: number;
}

export type Vector3DInput = Vector3D | Vector3Tuple | Vec3D | { x: number; y: number; z: number };

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

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export function isPentagonCell(index: unknown): boolean {
  if (typeof index !== 'string' && typeof index !== 'bigint') return false;
  const str = typeof index === 'bigint' ? index.toString(16) : String(index).toLowerCase();
  if (str.includes('pentagon')) return true;
  try {
    let big: bigint;
    if (typeof index === 'bigint') {
      big = BigInt.asUintN(64, index);
    } else {
      const cleanHex = str.replace(/^0x/, '');
      if (!cleanHex || !/^[0-9a-fA-F]{1,16}$/.test(cleanHex)) return false;
      big = BigInt.asUintN(64, BigInt('0x' + cleanHex));
    }
    const mode = Number((big >> 59n) & 0x0Fn);
    if (mode !== 1) return false;
    const res = Number((big >> 52n) & 0x0Fn);
    const baseCell = Number((big >> 45n) & 0x7Fn);
    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;
    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((big >> shift) & 0x07n);
      if (digit !== 0) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export class H3TopologyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'H3AdjacencyError';
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public actualCount?: number;
  public expectedCount?: number;
  public cellIndex?: string;
  public cellId?: string;
  public neighborCount?: number;

  constructor(arg1?: any, arg2?: any, arg3?: any) {
    let msg = 'Pentagonal coordination violation';
    let cellId: string | undefined;
    let expected = 5;
    let actual: number | undefined;

    if (typeof arg1 === 'number') {
      actual = arg1;
      cellId = arg2;
      msg = arg3 ?? (cellId ? `Pentagonal coordination violation for cell ${cellId}: expected exactly 5 neighbors, but received ${actual}.` : `Pentagonal coordination violation: expected exactly 5 neighbors, but received ${actual}.`);
    } else if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'number') {
      cellId = arg1;
      expected = arg2;
      actual = arg3;
      msg = `Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`;
    } else if (typeof arg1 === 'string' && typeof arg2 === 'number') {
      cellId = arg1;
      actual = arg2;
      msg = `Pentagonal coordination violation: cell ${cellId} expected 5 neighbors, received ${actual}`;
    }

    super(msg);
    this.name = 'PentagonalCoordinationViolationError';
    this.actualCount = actual;
    this.neighborCount = actual;
    this.expectedCount = expected;
    this.cellIndex = cellId;
    this.cellId = cellId;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public cellId: string;
  public neighborCount: number;
  public expectedCount: number = 6;
  constructor(cellId: string, count: number) {
    super(`Hexagonal coordination violation for cell ${cellId}: expected 6 neighbors, got ${count}`);
    this.name = 'HexagonalCoordinationViolationError';
    this.cellId = cellId;
    this.neighborCount = count;
  }
}

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
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
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  volumeM3?: number;
  centroid?: Vector3DInput;
  enthalpyJoules?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  dissolvedOxygenKg?: number;
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

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, any>;
  [key: string]: any;
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

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = Object.freeze([1, 2, 3, 4, 5, 6]);

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (typeof topology.omittedDirection !== 'number') return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;
  const set = new Set(topology.presentDirections);
  if (set.size !== 5) return false;
  for (const d of topology.presentDirections) {
    if (!ALL_H3_DIRECTIONS.includes(d)) return false;
  }
  return ALL_H3_DIRECTIONS.includes(topology.omittedDirection);
}

export function createPentagonTopology(omitted: H3Direction): PentagonDirectionalTopology {
  const present = ALL_H3_DIRECTIONS.filter((d) => d !== omitted) as H3Direction[];
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
  BY_INDEX: Object.freeze([1 << 0, 1 << 1, 1 << 2, 1 << 3, 1 << 4, 1 << 5]),

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
    let inverted = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        inverted |= 1 << ((d + 3) % 6);
      }
    }
    return inverted;
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
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    srcMask: DirectionBitmask,
    tgtMask: DirectionBitmask,
    dir: H3DirectionIndex,
    velocity: number,
    diffCoeff: number,
    thermalCond: number,
    geom: DirectionalGeometry,
    dt: number
  ) {
    if (!this.isChannelPermeable(srcMask, tgtMask, dir)) {
      return { dWaterKg: 0, dCarbonKg: 0, dMineralsKg: 0, dOxygenKg: 0, dEnergyJoules: 0 };
    }

    const area = geom.edgeLengthM * geom.layerHeightM;
    const volFlow = velocity * area * dt;
    const frac = Math.min(0.5, volFlow / Math.max(stateI.volumeM3, 1e-6));

    const dWaterKg = stateI.waterKg * frac;
    const dCarbonKg = stateI.carbonKg * frac;
    const dMineralsKg = stateI.mineralsKg * frac;
    const dOxygenKg = stateI.oxygenKg * frac;
    const dEnergyJoules = stateI.internalEnergyJoules * frac;

    return { dWaterKg, dCarbonKg, dMineralsKg, dOxygenKg, dEnergyJoules };
  }
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
  water?: number;
  carbon?: number;
  minerals?: number;
  oxygen?: number;
  thermal?: number;
  thermalConductivity?: number;
  diffWater?: number;
  diffCarbon?: number;
  diffMinerals?: number;
  diffOxygen?: number;
  thermalCond?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  [key: string]: any;
}

export interface ThermodynamicStocks {
  carbon?: number;
  water?: number;
  minerals?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  energy?: number;
  thermalEnergy?: number;
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
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

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface SpatialFluxState {
  cellIndex: string;
  stocks: Record<string, number>;
  neighbors: string[];
}

export enum CellTopologyType {
  PENTAGON = 'PENTAGON',
  HEXAGON = 'HEXAGON',
}

export interface CellSpatialState {
  cellIndex: string;
  isPentagon: boolean;
  areaM2?: number;
  elevationM?: number;
  stocks: Record<string, number>;
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
  centroid: Cartesian3D | Vector3D | [number, number, number];
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
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
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
}

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
  const hydraulicHead = dElev / metrics.centroidDistanceMeters + metrics.topographicSlope;

  const waterFlux = params.kSatPorous * hydraulicHead * metrics.subterraneanContactAreaM2 * dt;
  const deltaWaterKg = waterFlux * 1000.0;

  const dTemp = (stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290);
  const heatFlux = params.eddyDiffusivityHeat * (dTemp / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const fracWater = stateA.waterMassKg && stateA.waterMassKg > 0 ? Math.abs(deltaWaterKg) / stateA.waterMassKg : 0;
  const deltaCarbonKg = (deltaWaterKg >= 0 ? 1 : -1) * (stateA.carbonMassKg ?? 0) * fracWater * 0.1;
  const deltaMineralKg = (deltaWaterKg >= 0 ? 1 : -1) * (stateA.mineralMassKg ?? 0) * fracWater * 0.1;

  const entropyProducedJPerK = Math.abs(heatFlux) * Math.abs(1 / (stateB.temperatureKelvin ?? 290) - 1 / (stateA.temperatureKelvin ?? 290));

  return {
    deltaWaterKg,
    deltaEnthalpyJoules: heatFlux,
    deltaCarbonKg,
    deltaMineralKg,
    entropyProducedJPerK,
  };
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

export interface H3ApertureDecomposition {
  readonly index: bigint;
  readonly indexHex: string;
  readonly resolution: number;
  readonly baseCell: number;
  readonly mode: number;
  readonly activeDigits: readonly H3DirectionDigit[];
  readonly allDigits: readonly H3DirectionDigit[];
  readonly isValid: boolean;
}

export interface H3ApertureParseOptions {
  readonly validateMode?: boolean;
  readonly validateBaseCell?: boolean;
  readonly validatePaddingDigits?: boolean;
  readonly validateActiveDigits?: boolean;
}

export interface BiophysicalStockVector {
  readonly carbonKg: number;
  readonly nitrogenKg: number;
  readonly phosphorusKg: number;
  readonly waterKg: number;
  readonly oxygenKg: number;
  readonly mineralKg: number;
  readonly thermalJoules: number;
}

export interface FluxTransferRecord {
  readonly sourceIndex: bigint;
  readonly targetIndex: bigint;
  readonly transferredStocks: BiophysicalStockVector;
  readonly apertureDigitUsed: number;
  readonly entropyProducedJoulesPerKelvin: number;
}

export interface ChildPartitionStock {
  readonly childDigit: H3DirectionDigit;
  readonly childStocks: BiophysicalStockVector;
}

export class InvalidH3IndexError extends Error {
  constructor(message: string) {
    super(`[H3IndexError] ${message}`);
    this.name = 'InvalidH3IndexError';
  }
}

export class InvalidH3ModeError extends InvalidH3IndexError {
  constructor(mode: number) {
    super(`Invalid H3 cell mode: expected mode 1 (H3_CELL_MODE), encountered ${mode}`);
    this.name = 'InvalidH3ModeError';
  }
}

export class InvalidH3BaseCellError extends InvalidH3IndexError {
  constructor(baseCell: number) {
    super(`Invalid H3 base cell: expected 0 <= baseCell <= 121, encountered ${baseCell}`);
    this.name = 'InvalidH3BaseCellError';
  }
}

export class InvalidH3ResolutionError extends InvalidH3IndexError {
  constructor(res: number) {
    super(`Invalid H3 resolution: expected 0 <= resolution <= 15, encountered ${res}`);
    this.name = 'InvalidH3ResolutionError';
  }
}

export class InvalidH3PaddingError extends InvalidH3IndexError {
  constructor(resolution: number, digitPosition: number, digitValue: number) {
    super(
      `Corrupt H3 padding digit at resolution position ${digitPosition} for cell of resolution ${resolution}: expected 7 (0b111), encountered ${digitValue}`
    );
    this.name = 'InvalidH3PaddingError';
  }
}

export class InvalidH3ActiveDigitError extends InvalidH3IndexError {
  constructor(digitPosition: number, digitValue: number) {
    super(
      `Corrupt active H3 aperture digit at resolution position ${digitPosition}: expected in range [0, 6], encountered ${digitValue}`
    );
    this.name = 'InvalidH3ActiveDigitError';
  }
}
/**
 * @file h3_types.ts
 * @module spatial/h3_types
 * @description Unified DGGS types, coordinate vectors, thermodynamic stocks,
 * directional bitmasks, and topological invariant helpers (Sprints 005 - 084).
 */

// =============================================================================
// DGGS INDEX & RESOLUTION FOUNDATIONS
// =============================================================================

export type H3Index = string;
export type H3Resolution = number;
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface HexCoordinate {
  lat: number;
  lng: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

// =============================================================================
// COORDINATE & VECTOR DEFINITIONS
// =============================================================================

export type Point2D = [number, number];
export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3D = any;
export type Vector3DInput = any;
export type Vec3D = [number, number, number];
export type Vec3 = Vector3D;
export type UnitVector3D = [number, number, number];

// =============================================================================
// ERROR CODES & EXCEPTIONS
// =============================================================================

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

// =============================================================================
// TOPOLOGICAL CELL CLASSIFICATION & PENTAGON ORIENTATION
// =============================================================================

export enum CellTopologyType {
  HEXAGON = 'HEXAGON',
  PENTAGON = 'PENTAGON',
}

export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;
export const ALL_H3_DIRECTIONS: readonly H3Direction[] = [1, 2, 3, 4, 5, 6] as const;

export interface PentagonDirectionalTopology {
  presentDirections: H3Direction[];
  omittedDirection: H3Direction;
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

export function createPentagonTopology(omittedDirection: H3Direction): PentagonDirectionalTopology {
  const presentDirections = ALL_H3_DIRECTIONS.filter((d) => d !== omittedDirection);
  return {
    presentDirections,
    omittedDirection,
  };
}

export function validatePentagonTopology(topology: PentagonDirectionalTopology): boolean {
  if (!topology || !Array.isArray(topology.presentDirections)) return false;
  if (topology.presentDirections.length !== 5) return false;
  if (!ALL_H3_DIRECTIONS.includes(topology.omittedDirection)) return false;
  if (topology.presentDirections.includes(topology.omittedDirection)) return false;
  const unique = new Set(topology.presentDirections);
  if (unique.size !== 5) return false;
  return topology.presentDirections.every((d) => ALL_H3_DIRECTIONS.includes(d));
}

// =============================================================================
// CELL STOCKS & THERMODYNAMIC STATES
// =============================================================================

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  nitrogenKg?: number;
  phosphorusKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  enthalpyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
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
  [key: string]: any;
}

export interface CellThermodynamicState {
  h3Index?: string;
  centroid?: any;
  volumeM3?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  temperatureKelvin?: number;
  energyJoules?: number;
  conductivity?: number;
  heightColumnMeters?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
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
    carbon?: number;
    water?: number;
    minerals?: number;
    oxygen?: number;
    thermalEnergy?: number;
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

export interface CellFacetState {
  massDry: number;
  massWater: number;
  massCarbon: number;
  massOxygen: number;
  massMineral: number;
  thermalEnergy: number;
  temperature: number;
  volume: number;
  centroid?: any;
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
  diffMinerals?: number;
  diffOxygen?: number;
  thermalCond?: number;
  thermal?: number;
  [key: string]: any;
}

// =============================================================================
// VERTICAL STRATA & LATERAL TRANSPORT PARAMETERS
// =============================================================================

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
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

// =============================================================================
// PLANETARY GRID & GEOMETRY
// =============================================================================

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

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, CellBiophysicalState | any>;
}

// =============================================================================
// H3 CELL INTERFACE METRICS (SPRINT 051)
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

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const kSat = params.kSatPorous ?? 1e-4;
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;

  const wA = stateA.waterMassKg ?? 0;
  const wB = stateB.waterMassKg ?? 0;
  const cA = stateA.carbonMassKg ?? 0;
  const cB = stateB.carbonMassKg ?? 0;
  const mA = stateA.mineralMassKg ?? 0;
  const mB = stateB.mineralMassKg ?? 0;

  const geomFactor = metrics.subterraneanContactAreaM2 / metrics.centroidDistanceMeters;
  const dWater = kSat * (wA - wB) * geomFactor * dt;
  const dCarbon = 1e-4 * (cA - cB) * geomFactor * dt;
  const dMineral = 1e-4 * (mA - mB) * geomFactor * dt;

  const tA = stateA.temperatureKelvin ?? 295.15;
  const tB = stateB.temperatureKelvin ?? 288.15;
  const heatFactor = metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters;
  const dEnthalpy = kHeat * (tA - tB) * heatFactor * dt;

  const entropy = Math.max(
    0,
    Math.abs(dEnthalpy) * Math.abs(1.0 / Math.max(1, Math.min(tA, tB)) - 1.0 / Math.max(1, Math.max(tA, tB)))
  );

  return {
    deltaWaterKg: -dWater,
    deltaEnthalpyJoules: -dEnthalpy,
    deltaCarbonKg: -dCarbon,
    deltaMineralKg: -dMineral,
    entropyProducedJPerK: entropy,
  };
}

// =============================================================================
// THERMODYNAMIC TENSOR OVERRIDES & CHANNELS (SPRINT 045)
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
  DEFAULT_REGOLITH_MASS_KG: 50.0,
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
} as const;

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

// =============================================================================
// DIRECTION BITMASK & CONSERVATIVE FLUX OPERATOR (SPRINT 084)
// =============================================================================

export type DirectionBitmask = number;
export type H3DirectionIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const H3DirectionBitmask = {
  DIRECTION_0: 1 << 0, // 1
  DIRECTION_1: 1 << 1, // 2
  DIRECTION_2: 1 << 2, // 4
  DIRECTION_3: 1 << 3, // 8
  DIRECTION_4: 1 << 4, // 16
  DIRECTION_5: 1 << 5, // 32

  NONE: 0,
  ALL: (1 << 6) - 1, // 63

  BY_INDEX: [
    1 << 0,
    1 << 1,
    1 << 2,
    1 << 3,
    1 << 4,
    1 << 5,
  ] as const,

  hasDirection(mask: DirectionBitmask, direction: H3DirectionIndex): boolean {
    return (mask & (1 << direction)) !== 0;
  },

  setDirection(mask: DirectionBitmask, direction: H3DirectionIndex): DirectionBitmask {
    return mask | (1 << direction);
  },

  clearDirection(mask: DirectionBitmask, direction: H3DirectionIndex): DirectionBitmask {
    return mask & ~(1 << direction);
  },

  oppositeDirection(direction: H3DirectionIndex): H3DirectionIndex {
    return ((direction + 3) % 6) as H3DirectionIndex;
  },

  invertMask(mask: DirectionBitmask): DirectionBitmask {
    let inverted = 0;
    for (let d = 0; d < 6; d++) {
      if ((mask & (1 << d)) !== 0) {
        inverted |= (1 << ((d + 3) % 6));
      }
    }
    return inverted;
  },
} as const;

export interface CellStockTensor {
  readonly waterKg: number;
  readonly carbonKg: number;
  readonly mineralsKg: number;
  readonly oxygenKg: number;
  readonly internalEnergyJoules: number;
  readonly volumeM3: number;
  readonly temperatureKelvin: number;
}

export interface DirectionalGeometry {
  readonly edgeLengthM: number;
  readonly layerHeightM: number;
  readonly centroidDistanceM: number;
}

export interface FacetDeltas {
  dWaterKg: number;
  dCarbonKg: number;
  dMineralsKg: number;
  dOxygenKg: number;
  dEnergyJoules: number;
}

export class DirectionalFluxOperator {
  public static isChannelPermeable(
    sourceMask: number,
    targetMask: number,
    direction: H3DirectionIndex
  ): boolean {
    const forwardOpen = (sourceMask & (1 << direction)) !== 0;
    const oppositeDir = H3DirectionBitmask.oppositeDirection(direction);
    const backwardOpen = (targetMask & (1 << oppositeDir)) !== 0;
    return forwardOpen && backwardOpen;
  }

  public static computeEdgeTransfer(
    stateI: CellStockTensor,
    stateJ: CellStockTensor,
    sourceMask: number,
    targetMask: number,
    direction: H3DirectionIndex,
    normalVelocityMps: number,
    diffusionCoeffM2ps: number,
    thermalConductivityWpmK: number,
    geometry: DirectionalGeometry,
    dtSeconds: number
  ): FacetDeltas {
    if (!this.isChannelPermeable(sourceMask, targetMask, direction)) {
      return {
        dWaterKg: 0,
        dCarbonKg: 0,
        dMineralsKg: 0,
        dOxygenKg: 0,
        dEnergyJoules: 0,
      };
    }

    const facetArea = geometry.edgeLengthM * geometry.layerHeightM;
    const invDx = 1.0 / geometry.centroidDistanceM;

    const isForward = normalVelocityMps >= 0;
    const cW = isForward ? stateI.waterKg / stateI.volumeM3 : stateJ.waterKg / stateJ.volumeM3;
    const cC = isForward ? stateI.carbonKg / stateI.volumeM3 : stateJ.carbonKg / stateJ.volumeM3;
    const cM = isForward ? stateI.mineralsKg / stateI.volumeM3 : stateJ.mineralsKg / stateJ.volumeM3;
    const cO = isForward ? stateI.oxygenKg / stateI.volumeM3 : stateJ.oxygenKg / stateJ.volumeM3;
    const cU = isForward ? stateI.internalEnergyJoules / stateI.volumeM3 : stateJ.internalEnergyJoules / stateJ.volumeM3;

    const advVolRate = normalVelocityMps * facetArea;
    const advW = advVolRate * cW;
    const advC = advVolRate * cC;
    const advM = advVolRate * cM;
    const advO = advVolRate * cO;
    const advU = advVolRate * cU;

    const diffW = -diffusionCoeffM2ps * facetArea * ((stateJ.waterKg / stateJ.volumeM3) - (stateI.waterKg / stateI.volumeM3)) * invDx;
    const diffC = -diffusionCoeffM2ps * facetArea * ((stateJ.carbonKg / stateJ.volumeM3) - (stateI.carbonKg / stateI.volumeM3)) * invDx;
    const diffM = -diffusionCoeffM2ps * facetArea * ((stateJ.mineralsKg / stateJ.volumeM3) - (stateI.mineralsKg / stateI.volumeM3)) * invDx;
    const diffO = -diffusionCoeffM2ps * facetArea * ((stateJ.oxygenKg / stateJ.volumeM3) - (stateI.oxygenKg / stateI.volumeM3)) * invDx;
    const condU = -thermalConductivityWpmK * facetArea * (stateJ.temperatureKelvin - stateI.temperatureKelvin) * invDx;

    return {
      dWaterKg: (advW + diffW) * dtSeconds,
      dCarbonKg: (advC + diffC) * dtSeconds,
      dMineralsKg: (advM + diffM) * dtSeconds,
      dOxygenKg: (advO + diffO) * dtSeconds,
      dEnergyJoules: (advU + condU) * dtSeconds,
    };
  }
}
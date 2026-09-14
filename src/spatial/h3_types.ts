// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & THERMODYNAMIC TYPES
// Cumulative Retro-Compatibility Suite: Sprints 001 - 061
// =============================================================================

import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export { THERMODYNAMIC_CONSTANTS };

/**
 * Polymorphic representation of a 3D Cartesian vector or point in planetary coordinate space.
 * Supports tuple [x, y, z], Cartesian object { x, y, z }, and hybrid vector structures.
 */
export type Vector3D = any;
export type UnitVector3D = [number, number, number];

/**
 * Directed boundary segment between two spherical vertices.
 */
export interface BoundarySegment3D {
  readonly start: Vector3D;
  readonly end: Vector3D;
  readonly displacement: Vector3D;
  readonly chordLength: number;
  readonly arcLength: number;
}

/**
 * Geometric and topological metrics of an oriented facet interface between finite volumes.
 */
export interface FacetMetrics {
  readonly segmentVector: Vector3D;
  readonly chordLength: number;
  readonly arcLength: number;
  readonly normalAreaVector: Vector3D;
  readonly facetArea: number;
  readonly unitNormal: Vector3D;
}

/**
 * Extensive thermodynamic stock state vector for a spatial finite-volume cell monad.
 */
export interface ThermodynamicStocks {
  internalEnergyJ: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
}

/**
 * Thermodynamic flux exchange deltas across an interface over time step dt.
 */
export interface ThermodynamicDeltas {
  dInternalEnergyJ: number;
  dWaterKg: number;
  dCarbonKg: number;
  dOxygenKg: number;
  dMineralsKg: number;
  entropyGenJK: number;
}

/**
 * Material transport coefficients for diffusion and conduction.
 */
export interface DiffusionCoefficients {
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  thermalConductivity?: number;
  thermal?: number;
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
}

/**
 * Canonical H3 Error Codes mapping validation failures.
 */
export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

/**
 * Exception raised when spatial inputs violate strict guard clauses.
 */
export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGuardClauseException';
  }
}

/**
 * Resolution tier type alias for H3 hierarchy levels [0, 15].
 */
export type H3ResolutionTier = number;

/**
 * Channel indices for continuous thermodynamic tensor slices.
 */
export enum ThermodynamicChannel {
  WATER_MASS_KG = 0,
  SOIL_ORGANIC_CARBON_KG = 1,
  VEGETATION_BIOMASS_KG = 2,
  ATMOSPHERIC_CO2_KG = 3,
  MINERAL_NITROGEN_KG = 4,
  TEMPERATURE_KELVIN = 5,
  SENSIBLE_HEAT_JOULES = 6,
  ALBEDO = 7,
  CHANNEL_COUNT = 8
}

/**
 * Partial thermodynamic state override structure.
 */
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

/**
 * Delta log record generated during cell state mutations.
 */
export interface CellThermodynamicDeltaRecord {
  h3Index: string;
  cellIndex: number;
  massDeltaKg: number;
  energyDeltaJoules: number;
  thermalEnergyDeltaJoules: number;
  chemicalEnergyDeltaJoules: number;
  overriddenFields: (keyof CellThermodynamicOverride)[];
}

/**
 * Aggregate summary report returned after applying state overrides.
 */
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

/**
 * Vertical stratum height definition for column modeling.
 */
export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

/**
 * Interface representing physical metrics of shared boundaries between adjacent cells.
 */
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
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  centroid?: { lat: number; lng: number };
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  internalEnergyJoules?: number;
}

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
}

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
  };
}

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: [number, number, number];
  cells: Map<string, CellBiophysicalState>;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface H3BoundaryInterface {
  resolution: number;
  edgeLengthMeters: number;
  centerDistanceMeters: number;
  calculateContactArea(depth: number): number;
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
): {
  deltaWaterKg: number;
  deltaEnthalpyJoules: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  entropyProducedJPerK: number;
} {
  const tA = stateA.temperatureKelvin ?? 290.0;
  const tB = stateB.temperatureKelvin ?? 290.0;
  const deltaT = tA - tB;
  const eddy = params.eddyDiffusivityHeat ?? 15.0;
  const heatFlux = deltaT * metrics.geometricConductance * eddy * dt * 100.0;

  const wA = stateA.waterMassKg ?? 0;
  const wB = stateB.waterMassKg ?? 0;
  const waterFlux = (wA - wB) * 1e-4 * metrics.geometricConductance * dt;

  const cA = stateA.carbonMassKg ?? 0;
  const cB = stateB.carbonMassKg ?? 0;
  const carbonFlux = (cA - cB) * 1e-4 * metrics.geometricConductance * dt;

  const mA = stateA.mineralMassKg ?? 0;
  const mB = stateB.mineralMassKg ?? 0;
  const mineralFlux = (mA - mB) * 1e-4 * metrics.geometricConductance * dt;

  const entropyGen = deltaT !== 0
    ? Math.abs(heatFlux * (1.0 / Math.min(tA, tB) - 1.0 / Math.max(tA, tB)))
    : 0.0;

  return {
    deltaWaterKg: -waterFlux,
    deltaEnthalpyJoules: -heatFlux,
    deltaCarbonKg: -carbonFlux,
    deltaMineralKg: -mineralFlux,
    entropyProducedJPerK: entropyGen,
  };
}
/**
 * Web of Life - Discrete Global Grid System (DGGS) Types
 * Unified contract preserving all historical invariants across Sprints 001-052.
 */

import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

export { THERMODYNAMIC_CONSTANTS };

/**
 * Immutable 3D Cartesian Unit Vector [x, y, z] on the unit sphere S^2.
 * Invariant: Math.abs(x*x + y*y + z*z - 1.0) < 1e-12
 */
export type UnitVector3D = readonly [x: number, y: number, z: number];

/**
 * Mutable or readable Cartesian 3D point representation.
 */
export interface CartesianPoint3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Complete spatial metric descriptor for a single H3 DGGS cell.
 */
export interface CellSpatialGeometry {
  readonly h3Index: string;
  readonly latDeg: number;
  readonly lngDeg: number;
  readonly unitVector: UnitVector3D;
  readonly surfaceAreaM2: number;
}

/**
 * Advective directional exchange edge between adjacent H3 cells.
 */
export interface AdvectiveEdgeFlux {
  readonly sourceH3: string;
  readonly targetH3: string;
  readonly chordLengthM: number;
  readonly normalUnitVector: UnitVector3D;
  readonly massFluxKgPerSec: number;
  readonly heatFluxWatts: number;
}

/**
 * Physical stock state of a biophysical cell.
 */
export interface BiophysicalStocks {
  readonly thermalEnergyJoules: number;
  readonly carbonDioxideKg: number;
  readonly biomassCarbonKg: number;
  readonly atmosphericWaterKg: number;
  readonly oxygenKg: number;
}

/**
 * Comprehensive per-cell state incorporating geometry and thermodynamic stocks.
 */
export interface CellBiophysicalState {
  readonly h3Index: string;
  readonly latDeg: number;
  readonly lngDeg: number;
  readonly areaM2: number;
  readonly albedo: number;
  readonly lai: number;
  readonly tauAtm: number;
  readonly stocks: BiophysicalStocks;
}

/**
 * Planetary grid simulation state encompassing all discrete cells and stellar forcing.
 */
export interface PlanetaryGridState {
  readonly timeStepSeconds: number;
  readonly subsolarVector: UnitVector3D;
  readonly cells: ReadonlyMap<string, CellBiophysicalState>;
}

// =============================================================================
// HISTORICAL RFC CONSTANTS, ENUMS & INTERFACES (SPRINTS 001 - 051)
// =============================================================================

export type LatLngCoord = [number, number];

export interface IH3CellInfo {
  h3Index: string;
  resolution: number;
  centerLatLng: LatLngCoord;
  boundaryVertices: LatLngCoord[];
  isPentagon: boolean;
  areaM2: number;
}

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX'
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export enum ThermodynamicChannel {
  WATER_MASS_KG = 0,
  SOIL_ORGANIC_CARBON_KG = 1,
  VEGETATION_BIOMASS_KG = 2,
  ATMOSPHERIC_CO2_KG = 3,
  MINERAL_NITROGEN_KG = 4,
  SENSIBLE_HEAT_JOULES = 5,
  TEMPERATURE_KELVIN = 6,
  ALBEDO = 7,
  CHANNEL_COUNT = 8,
}

export interface CellThermodynamicOverride {
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
  sensibleHeatJoules?: number;
  temperatureKelvin?: number;
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

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
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

export function createH3CellInterfaceMetrics(
  params: Omit<H3CellInterfaceMetrics, 'geometricConductance'>
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
  const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;
  return {
    ...params,
    geometricConductance,
  };
}

export function createReciprocalInterfaceMetrics(
  metrics: H3CellInterfaceMetrics
): H3CellInterfaceMetrics {
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

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  centroid?: { lat: number; lng: number };
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  soilDepthMeters?: number;
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  volumeM3?: number;
  temperatureK?: number;
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
): {
  deltaWaterKg: number;
  deltaEnthalpyJoules: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  entropyProducedJPerK: number;
} {
  const tA = stateA.temperatureKelvin ?? 288.15;
  const tB = stateB.temperatureKelvin ?? 288.15;
  const deltaT = tA - tB;
  const eddyHeat = params.eddyDiffusivityHeat ?? 15.0;

  const heatFluxWatts = eddyHeat * (metrics.atmosphericContactAreaM2 / metrics.centroidDistanceMeters) * deltaT;
  const deltaEnthalpy = heatFluxWatts * dt;

  const elevA = stateA.elevationMeters ?? 0;
  const elevB = stateB.elevationMeters ?? 0;
  const headDiff = elevA - elevB;
  const kSat = params.kSatPorous ?? 1e-4;
  const waterFlowRate = kSat * (metrics.subterraneanContactAreaM2 / metrics.centroidDistanceMeters) * headDiff * 1000;
  const deltaWater = waterFlowRate * dt;

  const concCarbon = ((stateA.carbonMassKg ?? 0) + (stateB.carbonMassKg ?? 0)) / ((stateA.waterMassKg ?? 1) + (stateB.waterMassKg ?? 1));
  const concMineral = ((stateA.mineralMassKg ?? 0) + (stateB.mineralMassKg ?? 0)) / ((stateA.waterMassKg ?? 1) + (stateB.waterMassKg ?? 1));
  const deltaCarbon = deltaWater * concCarbon * 0.1;
  const deltaMineral = deltaWater * concMineral * 0.1;

  const entropyProduced = deltaEnthalpy * (1 / tB - 1 / tA);

  return {
    deltaWaterKg: deltaWater,
    deltaEnthalpyJoules: deltaEnthalpy,
    deltaCarbonKg: deltaCarbon,
    deltaMineralKg: deltaMineral,
    entropyProducedJPerK: Math.max(0, entropyProduced),
  };
}
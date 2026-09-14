/**
 * Web of Life - Planetary Geodesic Grid & Thermodynamic Types
 * Retro-Compatible Multi-Sprint Type Manifest (Sprints 002 - 063)
 */

import {
  SOLAR_CONSTANT_W_M2,
  STEFAN_BOLTZMANN_CONSTANT,
  STP_CONSTANTS,
  THERMODYNAMIC_CONSTANTS,
} from '../thermodynamics/constants.js';

export {
  SOLAR_CONSTANT_W_M2,
  STEFAN_BOLTZMANN_CONSTANT,
  STP_CONSTANTS,
  THERMODYNAMIC_CONSTANTS,
};

// =============================================================================
// 1. 3D VECTOR GEOMETRY PRIMITIVES
// =============================================================================

export interface Vector3DObject {
  x: number;
  y: number;
  z: number;
  0?: number;
  1?: number;
  2?: number;
  [index: number]: any;
}

export type Vector3DTuple = [number, number, number] & {
  x?: number;
  y?: number;
  z?: number;
};

export type Vector3D = [number, number, number] & {
  x?: number;
  y?: number;
  z?: number;
  [index: number]: number;
};

export type Vec3D = [number, number, number];
export type Vector3DInput = [number, number, number] | { x: number; y: number; z: number } | Vector3D;
export type UnitVector3D = [number, number, number];

export interface BoundaryDarbouxFrame3D {
  tangent: Vector3D;
  horizontalNormal: Vector3D;
  radialNormal: Vector3D;
}

export interface CellFacetState {
  massDry: number;        // kg
  massWater: number;      // kg
  massCarbon: number;     // kg
  massOxygen: number;     // kg
  massMineral: number;    // kg
  thermalEnergy: number;  // J
  temperature: number;    // K
  volume: number;         // m^3
  centroid: Vector3DInput;
}

export interface FacetExchangeDelta {
  deltaMassDry: number;
  deltaMassWater: number;
  deltaMassCarbon: number;
  deltaMassOxygen: number;
  deltaMassMineral: number;
  deltaThermalEnergy: number;
  entropyProduction: number; // J/K
}

// =============================================================================
// 2. ERROR CODES & EXCEPTION HIERARCHIES
// =============================================================================

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

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type H3Resolution = H3ResolutionTier;

// =============================================================================
// 3. THERMODYNAMIC CHANNELS & OVERRIDES (SPRINTS 042 - 045)
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
// 4. BIOGEOCHEMICAL & SPATIAL STOCKS (SPRINTS 046 - 053)
// =============================================================================

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: any;
}

export interface ThermodynamicStocks {
  internalEnergyJ: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  soilDepthMeters?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
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
  fluidDensityKgM3: number;
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
  timeStepSeconds: number;
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

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface DiffusionCoefficients {
  water?: number;
  carbon?: number;
  oxygen?: number;
  minerals?: number;
  thermalConductivity?: number;
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
}

// =============================================================================
// 5. CELL INTERFACE METRICS (SPRINT 051)
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
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
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
    throw new Error('Self-interface is invalid for pairwise cell boundary metrics');
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new RangeError('sharedEdgeLengthMeters must be strictly positive');
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
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dt: number,
  params: FluxComputationParams
) {
  const dElev = (stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0);
  const hydraulicHeadGrad = dElev / metrics.centroidDistanceMeters;
  const hydraulicSlope = hydraulicHeadGrad + metrics.topographicSlope;

  const waterFluxRateKgPerS =
    params.kSatPorous *
    metrics.subterraneanContactAreaM2 *
    hydraulicSlope *
    1000.0 * 0.5;

  const deltaWater = waterFluxRateKgPerS * dt;
  const deltaCarbon = deltaWater * 0.005;
  const deltaMineral = deltaWater * 0.0015;

  const tempA = stateA.temperatureKelvin ?? 290.0;
  const tempB = stateB.temperatureKelvin ?? 290.0;
  const deltaT = tempA - tempB;

  const thermalCondRateW =
    params.eddyDiffusivityHeat *
    metrics.atmosphericContactAreaM2 *
    (deltaT / metrics.centroidDistanceMeters);

  const deltaEnthalpy = thermalCondRateW * dt;

  const tWarm = Math.max(tempA, tempB);
  const tCold = Math.max(1.0, Math.min(tempA, tempB));
  const heatExchangeMagnitude = Math.abs(thermalCondRateW * dt);
  const entropyProduced = heatExchangeMagnitude * (1.0 / tCold - 1.0 / tWarm);

  return {
    deltaWaterKg: deltaWater,
    deltaEnthalpyJoules: deltaEnthalpy,
    deltaCarbonKg: deltaCarbon,
    deltaMineralKg: deltaMineral,
    entropyProducedJPerK: entropyProduced,
  };
}
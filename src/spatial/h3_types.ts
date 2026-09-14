// =============================================================================
// WEB OF LIFE - H3 SPATIAL GEODESIC TYPES & INTERFACES
// Unified Specifications: Sprints 001 - 055
// =============================================================================

export type H3Index = string;
export type Resolution = number;
export type H3Resolution = number;
export type H3ResolutionTier = number;

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

export interface GeodeticCoordinate {
  latitudeRadians: number;
  longitudeRadians: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinateRad {
  phiRad: number;
  lambdaRad: number;
}

export interface LatLngDegrees {
  lat: number;
  lng: number;
}

export interface IAngularVector2D {
  readonly magnitude: number;
  readonly angleRadians: number;
}

export interface CartesianVector2D {
  readonly u: number;
  readonly v: number;
}

export interface HexagonalAdjacencyEdge {
  readonly origin: H3Index;
  readonly neighbor: H3Index;
  readonly rawBearingRadians: number;
  readonly normalizedBearingRadians: number;
  readonly distanceMeters: number;
}

export type UnitVector3D = [number, number, number];

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

export interface PlanetaryGridState {
  timeStepSeconds: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, CellBiophysicalState>;
}

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

export interface CellThermodynamicState {
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  temperatureKelvin?: number;
  soilDepthMeters?: number;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  heightColumnMeters?: number;
  conductivity?: number;
}

export interface FluxComputationParams {
  kSatPorous?: number;
  manningN?: number;
  eddyDiffusivityHeat?: number;
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
    throw new RangeError('sharedEdgeLengthMeters must be strictly positive');
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new RangeError('centroidDistanceMeters must be strictly positive');
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
  dtSeconds: number,
  params: FluxComputationParams
) {
  const kHeat = params.eddyDiffusivityHeat ?? 15.0;
  const tempA = stateA.temperatureKelvin ?? 288.15;
  const tempB = stateB.temperatureKelvin ?? 288.15;
  const dT = tempA - tempB;
  const heatFluxWatts = kHeat * metrics.geometricConductance * dT * 1000.0;
  const deltaEnthalpyJoules = heatFluxWatts * dtSeconds;

  const waterA = stateA.waterMassKg ?? 0;
  const waterB = stateB.waterMassKg ?? 0;
  const waterFluxRate = 0.001 * (waterA - waterB) * metrics.geometricConductance;
  const deltaWaterKg = waterFluxRate * dtSeconds;

  const carbonA = stateA.carbonMassKg ?? 0;
  const carbonB = stateB.carbonMassKg ?? 0;
  const deltaCarbonKg = 0.001 * (carbonA - carbonB) * metrics.geometricConductance * dtSeconds;

  const mineralA = stateA.mineralMassKg ?? 0;
  const mineralB = stateB.mineralMassKg ?? 0;
  const deltaMineralKg = 0.001 * (mineralA - mineralB) * metrics.geometricConductance * dtSeconds;

  let entropyProduced = 0;
  if (tempA > 0 && tempB > 0 && deltaEnthalpyJoules !== 0) {
    const deltaQ = Math.abs(deltaEnthalpyJoules);
    const minT = Math.min(tempA, tempB);
    const maxT = Math.max(tempA, tempB);
    entropyProduced = deltaQ * (1 / minT - 1 / maxT);
  }

  return {
    deltaWaterKg,
    deltaEnthalpyJoules,
    deltaCarbonKg,
    deltaMineralKg,
    entropyProducedJPerK: entropyProduced,
  };
}

// =============================================================================
// SPRINT 045: H3 STATE TENSOR OVERRIDES & CHANNELS
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

export const THERMODYNAMIC_CONSTANTS = Object.freeze({
  DEFAULT_REGOLITH_MASS_KG: 5.0e7,
  MIN_TEMPERATURE_KELVIN: 2.7315,
  SPECIFIC_HEAT: Object.freeze({
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
  }),
  SPECIFIC_ENTHALPY: Object.freeze({
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  }),
});

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
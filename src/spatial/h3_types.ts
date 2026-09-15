/**
 * src/spatial/h3_types.ts
 * Type contracts and interfaces for 3D Cartesian coordinates, discrete global grids,
 * and thermodynamic state tensors across all sprints.
 */

// =============================================================================
// CARTESIAN & VECTOR GEOMETRY TYPES
// =============================================================================

export interface CartesianVector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type Vector3Tuple = [number, number, number];
export type Vec3D = [number, number, number];
export type Vec3 = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3D = [number, number, number] & { x: number; y: number; z: number };
export type Vector3DInput = [number, number, number] | Vector3Object | { x?: number; y?: number; z?: number; [index: number]: number };
export type Cartesian3D = [number, number, number] | CartesianVector3D;

export interface GeoCoord {
  readonly lat: number;
  readonly lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

// =============================================================================
// H3 TOPOLOGY & ERROR CODE CONTRACTS
// =============================================================================

export type H3Index = string;
export type Resolution = number;
export type H3ResolutionTier = number;
export type H3Resolution = number;

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
  ERR_H3_OUT_OF_RANGE = 0x06,
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string) {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = 'SpatialGuardClauseException';
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

// =============================================================================
// THERMODYNAMIC OVERRIDES & CHANNELS (SPRINT 045)
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
    WATER: -1.587e7,
    SOIL_ORGANIC_CARBON: -3.279e7,
    VEGETATION_BIOMASS: -1.75e7,
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
// CELL STOCKS & BOUNDARY INTERFACE METRICS
// =============================================================================

export interface CellBiogeochemicalStock {
  readonly cellIndex: string;
  readonly carbonMol: number;
  readonly nitrogenMol: number;
  readonly phosphorusMol: number;
  readonly waterMol: number;
  readonly oxygenMol: number;
  readonly thermalEnergyJoules: number;
  readonly volumeM3: number;
  readonly centroid: CartesianVector3D;
}

export interface DirectedBoundaryFacet {
  readonly originCell: string;
  readonly neighborCell: string;
  readonly originV1: CartesianVector3D;
  readonly originV2: CartesianVector3D;
  readonly neighborV1: CartesianVector3D;
  readonly neighborV2: CartesianVector3D;
  readonly areaM2: number;
  readonly normalVelocityMs: number;
  readonly distanceM: number;
}

export interface StockTransferDelta {
  readonly deltaCarbonMol?: number;
  readonly deltaNitrogenMol?: number;
  readonly deltaPhosphorusMol?: number;
  readonly deltaWaterMol?: number;
  readonly deltaOxygenMol?: number;
  readonly deltaThermalEnergyJoules?: number;
  readonly deltaWaterKg?: number;
  readonly deltaCarbonKg?: number;
  readonly deltaMineralKg?: number;
  readonly deltaMineralsKg?: number;
  readonly deltaOxygenKg?: number;
  readonly deltaEnergyJoules?: number;
  readonly deltaEnthalpyJoules?: number;
}

export interface ConjugateFacetTransferDelta extends StockTransferDelta {
  readonly deltaCarbonMol: number;
  readonly deltaNitrogenMol: number;
  readonly deltaPhosphorusMol: number;
  readonly deltaWaterMol: number;
  readonly deltaOxygenMol: number;
  readonly deltaThermalEnergyJoules: number;
}

export interface BoundaryTransferResult {
  readonly isValidConjugate: boolean;
  readonly originDelta: ConjugateFacetTransferDelta;
  readonly neighborDelta: ConjugateFacetTransferDelta;
  readonly entropyProductionJPerK: number;
}

export interface H3CellBoundary {
  readonly cellIndex: string;
  readonly centroid: CartesianVector3D;
  readonly vertices: CartesianVector3D[];
}

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
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
  carbon?: number;
  water?: number;
  nitrogen?: number;
  phosphorus?: number;
  oxygen?: number;
  thermalEnergy?: number;
  internalEnergyJ?: number;
  [key: string]: any;
}

export type ThermodynamicStocks = CellThermodynamicStocks;

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  centroid?: { lat: number; lng: number };
  temperatureKelvin?: number;
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
  mineralsKg?: number;
  mineralKg?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  volumeM3?: number;
  [key: string]: any;
}

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
  timeStepSeconds?: number;
  subsolarVector: UnitVector3D;
  cells: Map<string, any>;
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
  const tA = stateA.temperatureKelvin ?? 290;
  const tB = stateB.temperatureKelvin ?? 290;
  const deltaT = tA - tB;
  const condHeat = (params.eddyDiffusivityHeat ?? 15.0) * metrics.geometricConductance * deltaT * dt * 1000.0;

  const wA = stateA.waterMassKg ?? 0;
  const wB = stateB.waterMassKg ?? 0;
  const deltaW = 0.001 * (wA - wB) * metrics.geometricConductance * dt;

  const cA = stateA.carbonMassKg ?? 0;
  const cB = stateB.carbonMassKg ?? 0;
  const deltaC = 0.001 * (cA - cB) * metrics.geometricConductance * dt;

  const mA = stateA.mineralMassKg ?? 0;
  const mB = stateB.mineralMassKg ?? 0;
  const deltaM = 0.001 * (mA - mB) * metrics.geometricConductance * dt;

  const entropyProduced = condHeat * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaWaterKg: deltaW,
    deltaCarbonKg: deltaC,
    deltaMineralKg: deltaM,
    deltaEnthalpyJoules: condHeat,
    entropyProducedJPerK: Math.max(0, entropyProduced),
  };
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
  thermal?: number;
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

export interface DetailedInterfaceNormalResult {
  normal: [number, number, number];
  arcLengthMeters: number;
  alignmentCos: number;
}
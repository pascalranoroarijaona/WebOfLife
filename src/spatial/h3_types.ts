/**
 * Planetary Spatial & Thermodynamic Type Definitions
 * Unified Retro-Compatible Interface across Sprints 001 - 069
 */

// Vector representations
export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3D = [number, number, number] & {
  x: number;
  y: number;
  z: number;
  [key: string | number]: any;
};

export type Vector3DInput = [number, number, number] | Vector3Object | {
  x?: number;
  y?: number;
  z?: number;
  0?: number;
  1?: number;
  2?: number;
  [key: string | number]: any;
};

/**
 * 3D Cartesian representation supporting object { x, y, z }, tuple [x, y, z], and Vector3D
 */
export type Cartesian3D = [number, number, number] | {
  x: number;
  y: number;
  z: number;
  0?: number;
  1?: number;
  2?: number;
  [key: string | number]: any;
};

export interface H3BoundaryCartesian3D {
  readonly h3Index: string;
  readonly vertexCount: number;
  readonly vertices: readonly Vector3D[];
  readonly isClosed: boolean;
  readonly centroid: Vector3D;
}

export interface CartesianBoundaryOptions {
  readonly closeLoop?: boolean;
  readonly radius?: number;
}

export interface EdgeCartesianMetrics {
  readonly v1: Cartesian3D;
  readonly v2: Cartesian3D;
  readonly lengthMeters: number;
  readonly normalUnit: Vector3D;
  readonly midpointUnit: Vector3D;
  readonly interfacialAreaM2: number;
}

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
}

export interface InterfacialFluxDelta {
  readonly edgeId: string;
  readonly donorCell: string;
  readonly receiverCell: string;
  readonly deltaH2O: number;
  readonly deltaCarbon: number;
  readonly deltaOxygen: number;
  readonly deltaMinerals: number;
  readonly deltaEnergy: number;
  readonly entropyProduced: number;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type LatLng = LatLngPoint;

// Resolution types
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;
export type Resolution = H3ResolutionTier;

// Error definitions
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
  }
}

// Thermodynamic Stock Contracts
export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
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

export interface StockTransferDelta {
  deltaCarbonMol?: number;
  deltaWaterMol?: number;
  deltaNitrogenMol?: number;
  deltaPhosphorusMol?: number;
  deltaOxygenMol?: number;
  deltaEnthalpyJoules?: number;
  deltaCarbonKg?: number;
  deltaWaterKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  temperatureKelvin?: number;
  internalEnergyJoules?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  mineralsKg?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  volumeM3?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
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
  diffCarbon?: number;
  diffWater?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  thermal?: number;
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
    throw new Error("Self-interface is invalid");
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new Error("sharedEdgeLengthMeters must be strictly positive");
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
): {
  deltaWaterKg: number;
  deltaEnthalpyJoules: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  entropyProducedJPerK: number;
} {
  const dWater = params.kSatPorous * metrics.topographicSlope * metrics.subterraneanContactAreaM2 * dt * 1000.0;
  const tempDiff = (stateA.temperatureKelvin ?? 290) - (stateB.temperatureKelvin ?? 290);
  const dHeat = params.eddyDiffusivityHeat * (tempDiff / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const tA = Math.max(1, stateA.temperatureKelvin ?? 290);
  const tB = Math.max(1, stateB.temperatureKelvin ?? 290);
  const entropyProduced = Math.max(0, Math.abs(dHeat) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));

  const cFraction = (stateA.carbonMassKg ?? 100) / Math.max(1, stateA.waterMassKg ?? 1000);
  const mFraction = (stateA.mineralMassKg ?? 10) / Math.max(1, stateA.waterMassKg ?? 1000);

  return {
    deltaWaterKg: dWater,
    deltaEnthalpyJoules: dHeat,
    deltaCarbonKg: dWater * cFraction * 0.01,
    deltaMineralKg: dWater * mFraction * 0.01,
    entropyProducedJPerK: entropyProduced,
  };
}

// Sprint 045: Continuous Float64 State Tensor Types
export enum ThermodynamicChannel {
  TEMPERATURE_KELVIN = 0,
  SENSIBLE_HEAT_JOULES = 1,
  WATER_MASS_KG = 2,
  SOIL_ORGANIC_CARBON_KG = 3,
  VEGETATION_BIOMASS_KG = 4,
  ATMOSPHERIC_CO2_KG = 5,
  MINERAL_NITROGEN_KG = 6,
  ALBEDO = 7,
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
  temperatureKelvin?: number;
  sensibleHeatJoules?: number;
  waterMassKg?: number;
  soilOrganicCarbonKg?: number;
  vegetationBiomassKg?: number;
  atmosphericCo2Kg?: number;
  mineralNitrogenKg?: number;
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

// Sprint 067 Types
export interface DetailedInterfaceNormalResult {
  normal: [number, number, number];
  arcLengthMeters: number;
  alignmentCos: number;
  midpoint?: [number, number, number];
}

export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}

export interface InterfaceFluxState {
  massAirKg: number;
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  thermalEnergyJoules: number;
}
// =============================================================================
// WEB OF LIFE - SPATIAL H3 DISCRETE GLOBAL GRID MANIFOLD TYPES
// Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 071)
// =============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  [index: number]: number;
  [key: string]: any;
}

export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type Vector3Tuple = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3DInput =
  | Vector3D
  | Vector3Object
  | Vector3Tuple
  | number[]
  | { x: number; y: number; z: number };

export interface CartesianVector3D {
  x: number;
  y: number;
  z: number;
}

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
  [key: string]: any;
}

export interface SphericalCoordinates {
  lat: number;
  lng: number;
  [key: string]: any;
}

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type H3Resolution = H3ResolutionTier;

export class SpatialGuardClauseException extends Error {
  constructor(message: string = "Spatial guard clause exception") {
    super(message);
    this.name = "SpatialGuardClauseException";
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

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

export interface CellThermodynamicState {
  h3Index?: string;
  centroid?: Vector3D | { lat: number; lng: number; x?: number; y?: number; z?: number; [key: string]: any };
  volumeM3?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  enthalpyJoules?: number;
  temperatureKelvin?: number;
  // Retro-compatibility legacy fields
  cellIndex?: string;
  energyJoules?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  conductivity?: number;
  heightColumnMeters?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  mineralKg?: number;
  [key: string]: any;
}

export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
  [key: string]: any;
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
  [key: string]: any;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
  [key: string]: any;
}

export interface PlanetaryGridState {
  timeStepSeconds?: number;
  subsolarVector?: UnitVector3D;
  cells: Map<string, any>;
  [key: string]: any;
}

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: UnitVector3D | Vector3D;
  surfaceAreaM2: number;
  [key: string]: any;
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
  [key: string]: any;
}

export interface BoundaryVertexPair3D {
  readonly indexA: number;
  readonly indexB: number;
  readonly vertexA: Vector3D;
  readonly vertexB: Vector3D;
  readonly distance: number;
}

export interface BoundaryEdge3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly pair1: BoundaryVertexPair3D;
  readonly pair2: BoundaryVertexPair3D;
  readonly pairs: [BoundaryVertexPair3D, BoundaryVertexPair3D];
  readonly edgeLength: number;
  readonly lengthMeters: number;
  readonly midpoint: Vector3D;
  readonly outwardNormal: Vector3D;
}

export interface BoundaryFluxDelta {
  readonly edge: BoundaryEdge3D;
  readonly deltaWaterKg: number;
  readonly deltaCarbonKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaEnthalpyJoules: number;
  readonly entropyProducedJPerK: number;
}

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
  diffWater?: number;
  diffCarbon?: number;
  diffOxygen?: number;
  diffMinerals?: number;
  thermalCond?: number;
  thermal?: number;
  [key: string]: any;
}

export interface H3StateTensor {
  readonly cells?: ReadonlyMap<string, CellThermodynamicState> | Map<string, CellThermodynamicState>;
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
  DEFAULT_REGOLITH_MASS_KG: 1000.0,
  SPECIFIC_HEAT: {
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
    REGOLITH: 840.0,
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
  [key: string]: any;
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
  if (params.centroidDistanceMeters <= 0) {
    throw new Error('centroidDistanceMeters must be strictly positive');
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
): {
  deltaWaterKg: number;
  deltaEnthalpyJoules: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  entropyProducedJPerK: number;
} {
  const waterA = stateA.waterMassKg ?? stateA.waterKg ?? 0;
  const waterB = stateB.waterMassKg ?? stateB.waterKg ?? 0;
  const carbonA = stateA.carbonMassKg ?? stateA.carbonKg ?? 0;
  const carbonB = stateB.carbonMassKg ?? stateB.carbonKg ?? 0;
  const mineralA = stateA.mineralMassKg ?? stateA.mineralsKg ?? 0;
  const mineralB = stateB.mineralMassKg ?? stateB.mineralsKg ?? 0;

  const kSat = params.kSatPorous ?? 1e-4;
  const slope = metrics.topographicSlope;
  const headGrad = (waterA - waterB) / metrics.centroidDistanceMeters + slope;
  const waterFluxRate = kSat * metrics.subterraneanContactAreaM2 * headGrad;
  const deltaWaterKg = waterFluxRate * dt;

  const eddyHeat = params.eddyDiffusivityHeat ?? 15.0;
  const tempA = stateA.temperatureKelvin ?? 290;
  const tempB = stateB.temperatureKelvin ?? 290;
  const tempGrad = (tempA - tempB) / metrics.centroidDistanceMeters;
  const heatFluxRate = eddyHeat * metrics.atmosphericContactAreaM2 * tempGrad;
  const deltaEnthalpyJoules = heatFluxRate * dt;

  const diffRate = metrics.geometricConductance * 1e-4;
  const deltaCarbonKg = diffRate * (carbonA - carbonB) * dt;
  const deltaMineralKg = diffRate * (mineralA - mineralB) * dt;

  const tA = Math.max(0.1, tempA);
  const tB = Math.max(0.1, tempB);
  const entropyProducedJPerK = Math.abs(deltaEnthalpyJoules * (1 / tB - 1 / tA));

  return {
    deltaWaterKg,
    deltaEnthalpyJoules,
    deltaCarbonKg,
    deltaMineralKg,
    entropyProducedJPerK,
  };
}
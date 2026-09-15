// =============================================================================
// WEB OF LIFE - H3 SPATIAL TOPOLOGY & THERMODYNAMIC TYPES (UNIFIED)
// =============================================================================

export type IH3CellIndex = string;
export type H3Index = string;
export type Resolution = number;

export type Point2D = [number, number];
export type Vec3 = [number, number, number];
export type Vec3D = [number, number, number];
export type UnitVector3D = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
  [index: number]: any;
}

export type Vector3Tuple = [number, number, number] & {
  x?: number;
  y?: number;
  z?: number;
};

export type Vector3D = any;

export type Vector3DInput = Vector3Object | Vector3Tuple | [number, number, number] | any;

export type H3ResolutionTier =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export enum CellTopologyType {
  HEXAGON = 'HEXAGON',
  PENTAGON = 'PENTAGON',
}

export enum H3Direction {
  CENTER = 0,
  AXIS_K = 1,
  AXIS_J = 2,
  AXIS_JK = 3,
  AXIS_I = 4,
  AXIS_IK = 5,
  AXIS_IJ = 6,
}

export enum H3ErrorCode {
  SUCCESS = 'H3_SUCCESS',
  INVALID_LENGTH = 'H3_ERR_INVALID_LENGTH',
  INVALID_CHARACTER = 'H3_ERR_INVALID_CHARACTER',
  INVALID_RESOLUTION = 'H3_ERR_INVALID_RESOLUTION',
  INVALID_BASE_CELL = 'H3_ERR_INVALID_BASE_CELL',
  NULL_INDEX = 'H3_ERR_NULL_INDEX',
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = 'Spatial guard clause violation') {
    super(message);
    this.name = 'SpatialGuardClauseException';
  }
}

export interface ConservedStockVector {
  readonly carbonMol: number;
  readonly waterKg: number;
  readonly mineralsMol: number;
  readonly oxygenMol: number;
  readonly thermalEnergyJ: number;
}

export interface CellSpatialState {
  readonly cellIndex: IH3CellIndex;
  readonly isPentagon: boolean;
  readonly areaM2: number;
  readonly elevationM: number;
  readonly stocks: ConservedStockVector;
}

export interface AdjacencyFluxDelta {
  readonly targetIndex: IH3CellIndex;
  readonly sourceIndex: IH3CellIndex;
  readonly deltas: ConservedStockVector;
}

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  joules?: number;
  entropy?: number;
  [key: string]: any;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

export interface CellThermodynamicState {
  cellIndex?: string;
  h3Index?: string;
  isPentagon?: boolean;
  waterKg?: number;
  carbonKg?: number;
  mineralsKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  enthalpyJoules?: number;
  thermalEnergyJoules?: number;
  thermalEnergyMJ?: number;
  temperatureKelvin?: number;
  volumeM3?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  energyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  centroid?: { lat: number; lng: number } | { x: number; y: number; z: number };
  soilDepthMeters?: number;
  elevationMeters?: number;
  dissolvedOxygenKg?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massMineralsKg?: number;
  massOxygenKg?: number;
  massAirKg?: number;
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

export interface SphericalCoordinates {
  lat: number;
  lng: number;
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

export interface DiffusionCoefficients {
  diffCarbon?: number;
  diffWater?: number;
  diffMinerals?: number;
  diffOxygen?: number;
  thermalConductivity?: number;
  water?: number;
  carbon?: number;
  minerals?: number;
  oxygen?: number;
  thermal?: number;
  waterDiffusivity?: number;
  carbonDiffusivity?: number;
  mineralDiffusivity?: number;
  oxygenDiffusivity?: number;
  thermalCond?: number;
  [key: string]: any;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
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
  data: Omit<H3CellInterfaceMetrics, 'geometricConductance'> & { geometricConductance?: number }
): H3CellInterfaceMetrics {
  if (data.originIndex === data.neighborIndex) {
    throw new Error('Self-interface is invalid');
  }
  if (data.sharedEdgeLengthMeters <= 0) {
    throw new Error('sharedEdgeLengthMeters must be strictly positive');
  }
  const geometricConductance =
    data.geometricConductance ?? data.sharedEdgeLengthMeters / data.centroidDistanceMeters;
  return {
    ...data,
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
) {
  const dHead = ((stateA.elevationMeters ?? 0) - (stateB.elevationMeters ?? 0)) + metrics.topographicSlope * metrics.centroidDistanceMeters;
  const kSat = params.kSatPorous ?? 1e-4;
  const flowWater = kSat * (dHead / metrics.centroidDistanceMeters) * metrics.subterraneanContactAreaM2 * dt * 1000.0;

  const dTemp = (stateA.temperatureKelvin ?? 295) - (stateB.temperatureKelvin ?? 295);
  const eddyK = params.eddyDiffusivityHeat ?? 15.0;
  const flowHeat = eddyK * (dTemp / metrics.centroidDistanceMeters) * metrics.atmosphericContactAreaM2 * dt;

  const fracWater = stateA.waterMassKg && stateA.waterMassKg > 0 ? flowWater / stateA.waterMassKg : 0;
  const flowCarbon = (stateA.carbonMassKg ?? 0) * fracWater * 0.1;
  const flowMineral = (stateA.mineralMassKg ?? 0) * fracWater * 0.1;

  const entropyProduced = Math.abs(flowHeat) * Math.abs(1 / Math.max(1, stateB.temperatureKelvin ?? 295) - 1 / Math.max(1, stateA.temperatureKelvin ?? 295));

  return {
    deltaWaterKg: flowWater,
    deltaEnthalpyJoules: flowHeat,
    deltaCarbonKg: flowCarbon,
    deltaMineralKg: flowMineral,
    entropyProducedJPerK: entropyProduced,
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
  MIN_TEMPERATURE_KELVIN: 2.7315,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
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

export const SPATIAL_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 1.05,
  EARTH_RADIUS_METERS: 6371008.8,
};
// =============================================================================
// WEB OF LIFE - SPATIAL DGGS & 3D CARTESIAN VECTOR TYPES
// =============================================================================

export type Vector3D = any;
export type Vec3D = [number, number, number];
export type Vector3DInput = any;
export type UnitVector3D = [number, number, number] | any;

export interface BoundarySegment3D {
  readonly v1: Vector3D;
  readonly v2: Vector3D;
  readonly chordLength: number;
  readonly arcLength: number;
}

export interface DirectedEdge3D extends BoundarySegment3D {
  readonly edgeIndex: number;
  readonly originCellId: string;
  readonly destinationCellId: string;
  readonly lengthMeters?: number;
}

export interface BoundaryFacetFrame3D {
  readonly tangent: Vector3D;
  readonly lateralNormal: Vector3D;
  readonly radialNormal: Vector3D;
  readonly midpoint: Vector3D;
}

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

export type H3ResolutionTier = number;

export interface ThermodynamicStocks {
  internalEnergyJ: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
  [key: string]: any;
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
  [key: string]: any;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaMineralsKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
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
  normalVelocityMs: number;
  fluidDensityKgM3: number;
  timeStepSeconds: number;
  [key: string]: any;
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

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
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
  params: Omit<H3CellInterfaceMetrics, 'geometricConductance'>
): H3CellInterfaceMetrics {
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

export function createReciprocalInterfaceMetrics(
  m: H3CellInterfaceMetrics
): H3CellInterfaceMetrics {
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

export interface CellThermodynamicState {
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
  mineralsKg?: number;
  cellIndex?: string;
  centroid?: { lat: number; lng: number };
  internalEnergyJoules?: number;
  waterVaporMassKg?: number;
  dissolvedCarbonKg?: number;
  dissolvedNutrientsKg?: number;
  biomassKg?: number;
  entropyJoulesPerKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  specificHumidity?: number;
  dicConcentration?: number;
  [key: string]: any;
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
): any {
  const gradT =
    ((stateB.temperatureKelvin ?? 288.15) - (stateA.temperatureKelvin ?? 288.15)) /
    metrics.centroidDistanceMeters;
  const heatConductance =
    (params.eddyDiffusivityHeat ?? 10.0) * metrics.atmosphericContactAreaM2;
  const dEnthalpy = heatConductance * gradT * dt;

  const gradWater =
    ((stateB.waterMassKg ?? 0) - (stateA.waterMassKg ?? 0)) / metrics.centroidDistanceMeters;
  const waterCond = (params.kSatPorous ?? 1e-4) * metrics.subterraneanContactAreaM2;
  const dWater = waterCond * gradWater * dt;

  const dCarbon = 0.005 * dWater;
  const dMineral = 0.001 * dWater;

  const tA = stateA.temperatureKelvin ?? 288.15;
  const tB = stateB.temperatureKelvin ?? 288.15;
  const entropyProduced =
    Math.abs(dEnthalpy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaEnthalpyJoules: dEnthalpy,
    deltaWaterKg: dWater,
    deltaCarbonKg: dCarbon,
    deltaMineralKg: dMineral,
    entropyProducedJPerK: entropyProduced,
  };
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
  unitVector?: [number, number, number];
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

export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
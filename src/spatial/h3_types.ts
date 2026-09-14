// =============================================================================
// WEB OF LIFE - H3 SPATIAL TYPES & THERMODYNAMIC INTERFACES
// Cumulative Retro-Compatibility: Sprints 001 - 058
// =============================================================================

export type H3Index = string;
export type Resolution = number;
export type H3Resolution = number;
export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

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

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface SphericalCoordinateRad {
  phiRad: number;
  lambdaRad: number;
}

export type UnitVector3D = [number, number, number];

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: UnitVector3D;
  surfaceAreaM2: number;
}

export interface CellConservedStocks {
  carbonMol: number;
  waterKg: number;
  mineralsKg: number;
  oxygenMol: number;
  internalEnergyJoules: number;
}

export interface SpatialHexCell {
  h3Index: string;
  centroid: LatLngPoint;
  areaM2: number;
  stocks: CellConservedStocks;
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

export interface CellThermodynamicState {
  cellIndex?: string;
  centroid?: LatLng;
  temperatureKelvin?: number;
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
  mineralKg?: number;
  mineralsKg?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  h3Index?: string;
}

export interface H3BoundaryInterface {
  readonly originHex: string;
  readonly neighborHex: string;
  readonly midpoint: LatLng;
  readonly distanceMeters: number;
  readonly contactLengthMeters: number;
  readonly normalAzimuthDegrees: number;
  readonly midpointCoriolisParameter: number;
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  mineralKg?: number;
  energyJoules?: number;
  thermalEnergyJoules?: number;
  temperatureKelvin?: number;
  temperatureK?: number;
  specificHumidity?: number;
  dicConcentration?: number;
  volumeM3?: number;
  heightColumnMeters?: number;
  conductivity?: number;
}

export interface InterfacialFluxDeltas {
  readonly deltaCarbonKg: number;
  readonly deltaWaterKg: number;
  readonly deltaOxygenKg: number;
  readonly deltaMineralsKg: number;
  readonly deltaEnergyJoules: number;
}

export interface DiffusionCoefficients {
  readonly diffWater: number;
  readonly diffCarbon: number;
  readonly diffOxygen: number;
  readonly diffMinerals: number;
  readonly thermalCond: number;
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

export type H3ThermodynamicOverridesMap = Map<string, CellThermodynamicOverride> | Record<string, CellThermodynamicOverride>;

export interface OverrideOptions {
  strictThermodynamicBounds?: boolean;
  minTemperatureKelvin?: number;
  recomputeSensibleHeat?: boolean;
  regolithMassKg?: number;
  includeChemicalEnthalpy?: boolean;
  allowMassDestruction?: boolean;
}

export { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';

export interface IVerticalStratum {
  zBaseMeters: number;
  zTopMeters: number;
}

export interface IH3BoundaryContactAreaOptions {
  applyRadialExpansion?: boolean;
}

export interface H3CellInterfaceMetrics {
  readonly originIndex: string;
  readonly neighborIndex: string;
  readonly sharedEdgeLengthMeters: number;
  readonly centroidDistanceMeters: number;
  readonly bearingRadians: number;
  readonly normalVector: [number, number, number];
  readonly atmosphericContactAreaM2: number;
  readonly subterraneanContactAreaM2: number;
  readonly topographicSlope: number;
  readonly geometricConductance: number;
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
  return createH3CellInterfaceMetrics({
    originIndex: metrics.neighborIndex,
    neighborIndex: metrics.originIndex,
    sharedEdgeLengthMeters: metrics.sharedEdgeLengthMeters,
    centroidDistanceMeters: metrics.centroidDistanceMeters,
    bearingRadians: (metrics.bearingRadians + Math.PI) % (2 * Math.PI),
    normalVector: [-metrics.normalVector[0], -metrics.normalVector[1], -metrics.normalVector[2]],
    atmosphericContactAreaM2: metrics.atmosphericContactAreaM2,
    subterraneanContactAreaM2: metrics.subterraneanContactAreaM2,
    topographicSlope: -metrics.topographicSlope,
  });
}

export interface FluxComputationParams {
  kSatPorous: number;
  manningN: number;
  eddyDiffusivityHeat: number;
}

export function computeInterfaceFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  metrics: H3CellInterfaceMetrics,
  dtSeconds: number,
  params: FluxComputationParams
) {
  const dist = Math.max(1.0, metrics.centroidDistanceMeters);
  const areaSub = metrics.subterraneanContactAreaM2;

  const headA = (stateA.elevationMeters ?? 0) + (stateA.waterMassKg ?? 0) / (areaSub * 1000.0);
  const headB = (stateB.elevationMeters ?? 0) + (stateB.waterMassKg ?? 0) / (areaSub * 1000.0);
  const gradHead = (headB - headA) / dist;

  const qWater = -params.kSatPorous * gradHead * areaSub * dtSeconds * 1000.0;
  const deltaWaterKg = qWater;

  const fracWater = stateA.waterMassKg ? deltaWaterKg / stateA.waterMassKg : 0;
  const deltaCarbonKg = (stateA.carbonMassKg ?? 0) * fracWater;
  const deltaMineralKg = (stateA.mineralMassKg ?? stateA.mineralsKg ?? 0) * fracWater;

  const tempA = stateA.temperatureKelvin ?? 290.0;
  const tempB = stateB.temperatureKelvin ?? 290.0;
  const qHeat = -params.eddyDiffusivityHeat * ((tempB - tempA) / dist) * metrics.atmosphericContactAreaM2 * dtSeconds;
  const deltaEnthalpyJoules = qHeat;

  let entropyProducedJPerK = 0;
  if (tempA > 0 && tempB > 0 && tempA !== tempB) {
    const qDiff = Math.abs(qHeat);
    entropyProducedJPerK = qDiff * Math.abs(1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB));
  }

  return {
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    deltaEnthalpyJoules,
    entropyProducedJPerK,
  };
}
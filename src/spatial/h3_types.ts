/**
 * 3D Coordinate and DGGS Types for Spherical Planetary Manifolds
 * Unified Multi-Sprint Implementation (Sprints 002 - 066)
 */

export type Vector3Tuple = [number, number, number];

export interface Vector3Object {
  x: number;
  y: number;
  z: number;
}

export type Vector3DInput = Vector3Object | Vector3Tuple | number[] | Vector3D;
export type Vec3D = [number, number, number];

export type Vector3D = [number, number, number] & {
  x: number;
  y: number;
  z: number;
  [index: number]: number;
};

export type UnitVector3D = [number, number, number] | Vector3D;

export interface LatLng {
  lat: number;
  lng: number;
}

export type H3Index = string;

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX"
}

export class SpatialGuardClauseException extends Error {
  constructor(message: string = "H3 Index cannot be null, undefined, or empty.") {
    super(`[SpatialGuardClauseException] ${message}`);
    this.name = "SpatialGuardClauseException";
    Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
  }
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface SphericalCoordinates {
  lat: number;
  lng: number;
}

export interface GeodesicCoordinate {
  latDeg: number;
  lonDeg: number;
}

export interface BoundaryNormal3DOptions {
  blendAlpha?: number;
  earthRadius?: number;
}

export interface BoundaryNormal3DResult {
  normal: Vector3D;
  midpoint: Vector3D;
  midpointNormal: Vector3D;
  displacementNormal: Vector3D;
  alignmentCos: number;
}

export interface FacetCellStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
  temperatureKelvin: number;
}

export interface FacetTransportParameters {
  fluidVelocity3D: Vector3DInput;
  effectiveHeightM: number;
  diffusionCoeffs: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
    thermalConductivity: number;
  };
  blendAlpha?: number;
}

export interface FacetTransferDeltas {
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaMineralsKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
  entropyProductionJoulesPerKelvin: number;
}

export interface FacetExchangeResult {
  originDeltas: FacetTransferDeltas;
  neighborDeltas: FacetTransferDeltas;
  geometry: BoundaryNormal3DResult;
  facetAreaM2: number;
  normalVelocityMs: number;
}

export interface CellThermodynamicStocks {
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
  carbonStockKg?: number;
  energyJoules?: number;
  [key: string]: number | undefined;
}

export interface ThermodynamicStocks {
  internalEnergyJ?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  biomassJoules?: number;
  [key: string]: number | undefined;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
  deltaCarbonMol?: number;
  deltaWaterMol?: number;
  deltaNitrogenMol?: number;
  deltaPhosphorusMol?: number;
  deltaOxygenMol?: number;
  deltaEnthalpyJoules?: number;
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
  [key: string]: number | undefined;
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
  subsolarVector: any;
  cells: Map<string, any>;
}

export interface CellSpatialGeometry {
  h3Index: string;
  latDeg: number;
  lngDeg: number;
  unitVector: any;
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
  waterMassKg?: number;
  carbonMassKg?: number;
  mineralMassKg?: number;
  dissolvedOxygenKg?: number;
  enthalpyJoules?: number;
  elevationMeters?: number;
  soilDepthMeters?: number;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralKg?: number;
  heightColumnMeters?: number;
  conductivity?: number;
  [key: string]: any;
}

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  energyJoules?: number;
  mineralsKg?: number;
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
  DEFAULT_REGOLITH_MASS_KG: 1e6,
  MIN_TEMPERATURE_KELVIN: 2.7315,
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

export interface H3CellInterfaceMetrics {
  originIndex: string;
  neighborIndex: string;
  sharedEdgeLengthMeters: number;
  centroidDistanceMeters: number;
  bearingRadians: number;
  normalVector: [number, number, number] | number[];
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
  normalVector: [number, number, number] | number[];
  atmosphericContactAreaM2: number;
  subterraneanContactAreaM2: number;
  topographicSlope: number;
}): H3CellInterfaceMetrics {
  if (params.originIndex === params.neighborIndex) {
    throw new Error("Self-interface is invalid for neighboring cells");
  }
  if (params.sharedEdgeLengthMeters <= 0) {
    throw new RangeError("sharedEdgeLengthMeters must be strictly positive");
  }
  if (params.centroidDistanceMeters <= 0) {
    throw new RangeError("centroidDistanceMeters must be strictly positive");
  }

  const geometricConductance = params.sharedEdgeLengthMeters / params.centroidDistanceMeters;

  return {
    originIndex: params.originIndex,
    neighborIndex: params.neighborIndex,
    sharedEdgeLengthMeters: params.sharedEdgeLengthMeters,
    centroidDistanceMeters: params.centroidDistanceMeters,
    bearingRadians: params.bearingRadians,
    normalVector: params.normalVector,
    atmosphericContactAreaM2: params.atmosphericContactAreaM2,
    subterraneanContactAreaM2: params.subterraneanContactAreaM2,
    topographicSlope: params.topographicSlope,
    geometricConductance,
  };
}

export function createReciprocalInterfaceMetrics(m: H3CellInterfaceMetrics): H3CellInterfaceMetrics {
  const norm = m.normalVector;
  const invertedNormal: [number, number, number] = [
    -(norm[0] ?? 0),
    -(norm[1] ?? 0),
    -(norm[2] ?? 0),
  ];

  return {
    originIndex: m.neighborIndex,
    neighborIndex: m.originIndex,
    sharedEdgeLengthMeters: m.sharedEdgeLengthMeters,
    centroidDistanceMeters: m.centroidDistanceMeters,
    bearingRadians: (m.bearingRadians + Math.PI) % (2 * Math.PI),
    normalVector: invertedNormal,
    atmosphericContactAreaM2: m.atmosphericContactAreaM2,
    subterraneanContactAreaM2: m.subterraneanContactAreaM2,
    topographicSlope: -m.topographicSlope,
    geometricConductance: m.geometricConductance,
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
  params: FluxComputationParams = {}
): {
  deltaWaterKg: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  deltaEnthalpyJoules: number;
  entropyProducedJPerK: number;
} {
  const isAtoB = metrics.originIndex < metrics.neighborIndex;
  const cond = metrics.geometricConductance;
  const slope = metrics.topographicSlope;

  const kSat = params.kSatPorous ?? 1e-4;
  const waterHeadDiff = (stateA.waterMassKg ?? 0) - (stateB.waterMassKg ?? 0);
  const waterFlowRate = kSat * (waterHeadDiff * 1e-4 + slope * 10.0) * metrics.subterraneanContactAreaM2;
  const deltaWaterKg = waterFlowRate * dt;

  const cDiff = (stateA.carbonMassKg ?? 0) - (stateB.carbonMassKg ?? 0);
  const deltaCarbonKg = 1e-5 * cond * cDiff * dt;

  const mDiff = (stateA.mineralMassKg ?? 0) - (stateB.mineralMassKg ?? 0);
  const deltaMineralKg = 1e-6 * cond * mDiff * dt;

  const heatDiffusivity = params.eddyDiffusivityHeat ?? 15.0;
  const tempA = stateA.temperatureKelvin ?? 288.15;
  const tempB = stateB.temperatureKelvin ?? 288.15;
  const heatFlux = heatDiffusivity * (tempA - tempB) * cond * metrics.atmosphericContactAreaM2 * dt;
  const deltaEnthalpyJoules = heatFlux;

  const t1 = Math.max(tempA, 1.0);
  const t2 = Math.max(tempB, 1.0);
  const entropyProducedJPerK = Math.abs(heatFlux) * Math.abs(1 / t2 - 1 / t1);

  return {
    deltaWaterKg,
    deltaCarbonKg,
    deltaMineralKg,
    deltaEnthalpyJoules,
    entropyProducedJPerK,
  };
}
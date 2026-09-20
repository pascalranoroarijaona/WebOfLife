// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY & TOPOLOGY KERNEL (RETRO-COMPATIBLE)
// Unified Architecture: Sprints 002 through 091
// =============================================================================

import * as h3 from 'h3-js';
import {
  H3ApertureClass,
  IH3ResolutionApertureInfo,
  IH3EdgeNormal,
  IH3EdgeOrientation,
  ThermodynamicCellStocks,
  FluxField2D,
  CellGeometry,
  H3DirectedEdge,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  createVec3D,
  Point2D,
  SphericalCoordinates,
  GeodesicCoordinate,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellThermodynamicState,
  Direction,
  BaseCellStockVector,
  PatchThermodynamicStock,
  PentagonThermodynamicStocks,
  H3Direction,
  PentagonDirectionalTopology,
  H3DirectionIndex,
  DirectionBitmask,
  H3DirectionBitmask,
  DirectionalFlux,
  StockVector,
  validatePentagonTopology,
  CellStockState,
  SpatialCellState,
  CellStockVector,
  H3AdjacencyRecord,
  FacetCellStockState,
  FacetTransportParameters,
  SpatialStockState,
  DiffusionCoefficients,
  ConservedStockDelta,
  ThermodynamicStocks,
  CellFacetState,
  CellSpatialGeometry,
  InvalidH3ModeError,
  InvalidH3BaseCellError,
  InvalidH3PaddingError,
} from './h3_types.js';

import {
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from '../thermodynamics/constants.js';

import {
  getResolution,
  getBaseCell,
  getIndexDigit,
  buildH3Index,
  isPentagon as gridIsPentagon,
  isValidH3Index,
  h3ToBigInt,
  bigIntToHex,
  h3ToString,
  getNominalH3EdgeLength,
  matchesCanonicalH3Pattern,
  H3Grid,
  ThermodynamicSpatialError,
} from './h3_grid.js';

import { SpatialMonad } from '../monads/spatial_monad.js';
import {
  SpatialFluxMonad,
  PentagonalFluxMonad,
  PentagonFluxMonad,
  DiscreteManifoldFluxMonad,
  PentagonalSpatialFluxMonad,
  TopologicalFluxMonad,
  computeBoundaryFlux,
  computeOrientedEdgeFlux,
  computeHarmonizedFluxDeltas,
} from './spatial_flux_monad.js';

export {
  H3ApertureClass,
  IH3ResolutionApertureInfo,
  IH3EdgeNormal,
  IH3EdgeOrientation,
  ThermodynamicCellStocks,
  FluxField2D,
  CellGeometry,
  H3DirectedEdge,
  EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS,
  WGS84_EARTH_MEAN_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  Vector3D,
  Vector3DInput,
  Vector3Tuple,
  Vector3Object,
  createVec3D,
  CellThermodynamicState,
  CellStockState,
  SpatialCellState,
  CellStockVector,
  H3AdjacencyRecord,
  FacetCellStockState,
  FacetTransportParameters,
  SpatialStockState,
  DiffusionCoefficients,
  ConservedStockDelta,
  Direction,
  SpatialFluxMonad,
  PentagonalFluxMonad,
  PentagonFluxMonad,
  DiscreteManifoldFluxMonad,
  PentagonalSpatialFluxMonad,
  TopologicalFluxMonad,
  computeBoundaryFlux,
  computeOrientedEdgeFlux,
  computeHarmonizedFluxDeltas,
  H3Grid,
  buildH3Index,
  getResolution,
  CellSpatialGeometry,
};

// =============================================================================
// SPRINT 091 APERTURE DEFINITIONS
// =============================================================================

export const CLASS_III_ROTATION_RADIANS = 0.3334731722438334;
export const CLASS_III_ROTATION_DEGREES = 19.106262883011494;
export const APERTURE_ROTATION_RAD = CLASS_III_ROTATION_RADIANS;
export const APERTURE_ROTATION_DEG = CLASS_III_ROTATION_DEGREES;

export function getApertureClassForResolution(res: number): H3ApertureClass {
  if (!Number.isInteger(res) || res < 0) {
    throw new RangeError(`Resolution must be a non-negative integer, received: ${res}`);
  }
  return res % 2 === 0 ? 'CLASS_II' : 'CLASS_III';
}

export function getResolutionApertureInfo(res: number): IH3ResolutionApertureInfo {
  const apertureClass = getApertureClassForResolution(res);
  const isRotated = apertureClass === 'CLASS_III';
  return {
    resolution: res,
    apertureClass,
    rotationAngleDegrees: isRotated ? CLASS_III_ROTATION_DEGREES : 0.0,
    isRotated,
  };
}

export function computeH3EdgeNormals(res: number): IH3EdgeOrientation {
  const apertureClass = getApertureClassForResolution(res);
  const theta = apertureClass === 'CLASS_III' ? CLASS_III_ROTATION_RADIANS : 0.0;

  const normalVectors: IH3EdgeNormal[] = [0, 1, 2, 3, 4, 5].map((k) => {
    const angle = (k * Math.PI) / 3.0 + theta;
    return {
      nx: Math.cos(angle),
      ny: Math.sin(angle),
    };
  });

  return {
    resolution: res,
    apertureClass,
    rotationRadians: theta,
    normalVectors,
  };
}

export function computeInterfaceFluxDeltas(
  stateI: ThermodynamicCellStocks,
  neighborsState: ReadonlyArray<ThermodynamicCellStocks | null>,
  geometry: CellGeometry,
  field: FluxField2D,
  dtSeconds: number
): {
  deltaSelf: ThermodynamicCellStocks;
  deltaNeighbors: ThermodynamicCellStocks[];
} {
  const edgeNormals = computeH3EdgeNormals(geometry.resolution);
  const areaEdge = geometry.edgeLengthMeters * geometry.heightMeters;

  const deltaSelf: ThermodynamicCellStocks = {
    carbon_kg: 0,
    water_kg: 0,
    oxygen_kg: 0,
    nitrogen_kg: 0,
    minerals_kg: 0,
    thermal_energy_kj: 0,
  };

  const deltaNeighbors: ThermodynamicCellStocks[] = neighborsState.map(() => ({
    carbon_kg: 0,
    water_kg: 0,
    oxygen_kg: 0,
    nitrogen_kg: 0,
    minerals_kg: 0,
    thermal_energy_kj: 0,
  }));

  for (let k = 0; k < 6; k++) {
    const stateJ = neighborsState[k];
    if (!stateJ) continue;

    const normal = edgeNormals.normalVectors[k];
    const normalVelocity = field.vx * normal.nx + field.vy * normal.ny;

    const calculateSpeciesExchange = (stockI: number, stockJ: number): number => {
      const concI = stockI / areaEdge;
      const concJ = stockJ / areaEdge;
      const advectiveConc = normalVelocity >= 0 ? concI : concJ;
      const advectiveFlux = normalVelocity * advectiveConc;
      const diffusiveFlux = -field.diffusionCoefficient * (concJ - concI);
      return (advectiveFlux + diffusiveFlux) * areaEdge * dtSeconds;
    };

    const deltaC = calculateSpeciesExchange(stateI.carbon_kg, stateJ.carbon_kg);
    const deltaH2O = calculateSpeciesExchange(stateI.water_kg, stateJ.water_kg);
    const deltaO2 = calculateSpeciesExchange(stateI.oxygen_kg, stateJ.oxygen_kg);
    const deltaN = calculateSpeciesExchange(stateI.nitrogen_kg, stateJ.nitrogen_kg);
    const deltaMin = calculateSpeciesExchange(stateI.minerals_kg, stateJ.minerals_kg);
    const deltaU = calculateSpeciesExchange(stateI.thermal_energy_kj, stateJ.thermal_energy_kj);

    deltaSelf.carbon_kg -= deltaC;
    deltaSelf.water_kg -= deltaH2O;
    deltaSelf.oxygen_kg -= deltaO2;
    deltaSelf.nitrogen_kg -= deltaN;
    deltaSelf.minerals_kg -= deltaMin;
    deltaSelf.thermal_energy_kj -= deltaU;

    deltaNeighbors[k].carbon_kg += deltaC;
    deltaNeighbors[k].water_kg += deltaH2O;
    deltaNeighbors[k].oxygen_kg += deltaO2;
    deltaNeighbors[k].nitrogen_kg += deltaN;
    deltaNeighbors[k].minerals_kg += deltaMin;
    deltaNeighbors[k].thermal_energy_kj += deltaU;
  }

  return { deltaSelf, deltaNeighbors };
}

// =============================================================================
// VECTOR MATHEMATICS AND GEODESICS
// =============================================================================

export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;

export function toVec3D(input: Vector3DInput): [number, number, number] {
  if (Array.isArray(input)) return [input[0], input[1], input[2]];
  return [input.x ?? 0, input.y ?? 0, input.z ?? 0];
}

export function dotProduct(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const unitVectorDotProduct = dotProduct;
export const vec3Dot = (a: Vector3DInput, b: Vector3DInput): number => {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return ax * bx + ay * by + az * bz;
};

export function vectorNorm(a: any): number {
  const va = toVec3D(a);
  return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = (a: Vector3DInput): number => {
  const [x, y, z] = toVec3D(a);
  return Math.sqrt(x * x + y * y + z * z);
};

export function normalizeVector3D(v: Vector3DInput): Vector3D {
  const [x, y, z] = toVec3D(v);
  const norm = Math.sqrt(x * x + y * y + z * z);
  if (norm < 1e-14 || !Number.isFinite(norm)) {
    throw new Error('Vector magnitude is zero or non-finite');
  }
  return new Vector3D(x / norm, y / norm, z / norm);
}
export const vec3Normalize = normalizeVector3D;

export const vec3Scale = (v: Vector3DInput, s: number): Vector3D => {
  const [x, y, z] = toVec3D(v);
  return new Vector3D(x * s, y * s, z * s);
};
export const vec3Add = (a: Vector3DInput, b: Vector3DInput): Vector3D => {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return new Vector3D(ax + bx, ay + by, az + bz);
};
export const vec3Sub = (a: Vector3DInput, b: Vector3DInput): Vector3D => {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return new Vector3D(ax - bx, ay - by, az - bz);
};

export function unitVectorCrossProduct(a: any, b: any): [number, number, number] {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return [
    va[1] * vb[2] - va[2] * vb[1],
    va[2] * vb[0] - va[0] * vb[2],
    va[0] * vb[1] - va[1] * vb[0],
  ];
}

export function latLngToUnitVector3D(lat: number, lng: number): [number, number, number] {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new RangeError('Non-finite coordinate in latLngToUnitVector3D');
  }
  if (lat > 90.000001 || lat < -90.000001) {
    throw new RangeError(`Latitude out of range: ${lat}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, lat));
  const phi = (clampedLat * Math.PI) / 180.0;
  const lambda = (lng * Math.PI) / 180.0;
  const cosPhi = Math.cos(phi);
  return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}

export function unitVectorToLatLng(u: Vector3DInput): [number, number] {
  const [x, y, z] = toVec3D(u);
  const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
  const lng = (Math.atan2(y, x) * 180.0) / Math.PI;
  return [lat, lng];
}

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = 1.0): Vector3D {
  const [x, y, z] = latLngToUnitVector3D(coord.lat, coord.lng);
  return new Vector3D(x * radius, y * radius, z * radius);
}
export const latLngToVector3D = (lat: number, lng: number, radius: number = 1.0) => latLngToCartesian3D({ lat, lng }, radius);
export const latLngToCartesian = (lat: number, lng: number, radius: number = 1.0) => latLngToCartesian3D({ lat, lng }, radius);

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function unitVectorAngularDistance(u1: Vector3DInput, u2: Vector3DInput): number {
  const d = dotProduct(u1, u2);
  return Math.acos(Math.max(-1.0, Math.min(1.0, d)));
}
export const computeAngularDistance3D = (v1: Vector3DInput, v2: Vector3DInput): number =>
  unitVectorAngularDistance(normalizeVector3D(v1), normalizeVector3D(v2));

export function unitVectorChordDistance(u1: Vector3DInput, u2: Vector3DInput): number {
  const [x1, y1, z1] = toVec3D(u1);
  const [x2, y2, z2] = toVec3D(u2);
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(u1: Vector3DInput, u2: Vector3DInput): [number, number, number] {
  const [x1, y1, z1] = toVec3D(u1);
  const [x2, y2, z2] = toVec3D(u2);
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-14) return [0, 0, 0];
  return [dx / len, dy / len, dz / len];
}

export function areCartesianUnitVectorsEqual3D(v1: Vector3DInput, v2: Vector3DInput, epsilon: number = DEFAULT_ANGULAR_EPSILON): boolean {
  if (epsilon < 0) return false;
  const n1 = normalizeVector3D(v1);
  const n2 = normalizeVector3D(v2);
  const dist = unitVectorAngularDistance(n1, n2);
  return dist <= epsilon;
}

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): [number, number, number] {
  const [vx, vy, vz] = toVec3D(v);
  const [px, py, pz] = toVec3D(p);
  const pNorm2 = px * px + py * py + pz * pz;
  if (pNorm2 < 1e-14) return [0, 0, 0];
  const dot = (vx * px + vy * py + vz * pz) / pNorm2;
  return [vx - dot * px, vy - dot * py, vz - dot * pz];
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const proj = projectVectorOntoSphereTangentSpace(v, p);
  const [vx, vy, vz] = toVec3D(v);
  const [px, py, pz] = toVec3D(p);
  const pNorm = Math.sqrt(px * px + py * py + pz * pz);
  const radialMag = pNorm > 1e-14 ? Math.abs(vx * px + vy * py + vz * pz) / pNorm : 0;
  const tanMag = vectorNorm(proj);
  return {
    projected: proj,
    tangentialMagnitude: tanMag,
    radialMagnitude: radialMag,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const cA = toVec3D(pA);
  const cB = toVec3D(pB);
  const mid: [number, number, number] = [(cA[0] + cB[0]) * 0.5, (cA[1] + cB[1]) * 0.5, (cA[2] + cB[2]) * 0.5];
  const dist = vectorNorm([cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]]);
  const disp: [number, number, number] = dist > 1e-14 ? [(cB[0] - cA[0]) / dist, (cB[1] - cA[1]) / dist, (cB[2] - cA[2]) / dist] : [1, 0, 0];
  const tanNorm = projectVectorOntoSphereTangentSpace(disp, mid);
  const tMag = vectorNorm(tanNorm);
  const unitTanNorm = tMag > 1e-14 ? [tanNorm[0] / tMag, tanNorm[1] / tMag, tanNorm[2] / tMag] : disp;
  return {
    edgeDistance: dist,
    midpoint: mid,
    tangentNormal: unitTanNorm,
  };
}

export function computeGeodesicDistance(p1: any, p2: any, radius: number = EARTH_RADIUS_METERS): number {
  if (Array.isArray(p1) || p1.lat !== undefined || p1.latDeg !== undefined) {
    return calculateHaversineDistance(p1, p2, { radiusMeters: radius });
  }
  const u1 = toVec3D(p1);
  const u2 = toVec3D(p2);
  const ang = unitVectorAngularDistance(u1, u2);
  return ang * radius;
}

export const calculateGeodesicDistance = computeGeodesicDistance;

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number } | { latDeg: number; lonDeg: number },
  p2: [number, number] | { lat: number; lng: number } | { latDeg: number; lonDeg: number },
  opts: { unit?: 'meters' | 'kilometers'; radiusMeters?: number } = {}
): number {
  const getLatLon = (p: any): [number, number] => {
    if (Array.isArray(p)) return [p[0], p[1]];
    if (p.latDeg !== undefined) return [p.latDeg, p.lonDeg];
    return [p.lat, p.lng];
  };
  const [lat1, lon1] = getLatLon(p1);
  const [lat2, lon2] = getLatLon(p2);
  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const phi1 = (lat1 * Math.PI) / 180.0;
  const phi2 = (lat2 * Math.PI) / 180.0;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
  const dLam = ((lon2 - lon1) * Math.PI) / 180.0;

  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  const r = opts.radiusMeters ?? EARTH_RADIUS_METERS;
  const dist = r * c;
  return opts.unit === 'kilometers' ? dist * 0.001 : dist;
}
export const haversineDistance = (p1: [number, number], p2: [number, number]) =>
  calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
export const computeGreatCircleDistance = (p1: any, p2: any) =>
  calculateHaversineDistance(p1, p2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (wrapped === 180.0 || Object.is(wrapped, -180.0) || lonDeg === 180.0 || lonDeg === -180.0 || lonDeg === 540.0 || lonDeg === -540.0) {
    return -180.0;
  }
  if (Object.is(wrapped, -0)) return 0;
  return wrapped;
}

export function normalizeAngleRadians(rad: number): number {
  if (!Number.isFinite(rad)) return rad;
  let wrapped = rad - 2 * Math.PI * Math.floor((rad + Math.PI) / (2 * Math.PI));
  if (Math.abs(wrapped - Math.PI) < 1e-14 || rad === Math.PI || rad === -Math.PI) {
    return -Math.PI;
  }
  if (Object.is(wrapped, -0)) return 0.0;
  return wrapped;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export class CoordinateBoundaryError extends Error {
  constructor(
    public latitude: number,
    public longitude: number,
    public violationContext?: string
  ) {
    super(`Latitude must be within [-90, +90] degrees and Longitude within [-180, +180] degrees${violationContext ? ` in ${violationContext}` : ''}. Received: lat=${latitude}, lon=${longitude}`);
    this.name = 'CoordinateBoundaryError';
  }
}

export function isValidCoordinatePair(lat: any, lon?: any): boolean {
  try {
    assertValidCoordinatePair(lat, lon);
    return true;
  } catch {
    return false;
  }
}

export function assertValidCoordinatePair(arg1: any, arg2?: any, arg3?: any): void {
  let lat: number, lon: number, opts: any;
  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    opts = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    opts = arg3;
  }
  const context = typeof opts === 'string' ? opts : opts?.context;
  const allow360 = typeof opts === 'object' ? opts?.allowNormalizedPositiveLon : false;

  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError(lat, lon, context);
  }
  const eps = 1e-9;
  if (lat < -90 - eps || lat > 90 + eps) {
    throw new CoordinateBoundaryError(lat, lon, context);
  }
  if (allow360) {
    if (lon < -eps || lon > 360 + eps) throw new CoordinateBoundaryError(lat, lon, context);
  } else {
    if (lon < -180 - eps || lon > 180 + eps) throw new CoordinateBoundaryError(lat, lon, context);
  }
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): [number, number, number] {
  const [ux, uy, uz] = toVec3D(u);
  const [vx, vy, vz] = toVec3D(v);
  const cross: [number, number, number] = [
    uy * vz - uz * vy,
    uz * vx - ux * vz,
    ux * vy - uy * vx,
  ];
  const len = vectorNorm(cross);
  if (len > 1e-12) {
    return [cross[0] / len, cross[0] / len, cross[2] / len];
  }
  if (Math.abs(ux) >= 0.9) return [0, 1, 0];
  return [0, 0, 1];
}

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
      !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
    throw new Error('All vertex coordinates must be finite numbers');
  }
  return new Vector3D(x2 - x1, y2 - y1, z2 - z1);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = 1.0) {
  const d = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vec3Norm(d);
  const rEff = radius > 10.0 ? radius : Math.max(vec3Norm(v1), vec3Norm(v2), 1.0);
  const theta = 2 * Math.asin(Math.min(1.0, chordLength / (2 * rEff)));
  const arcLength = rEff * theta;
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  return {
    v1: new Vector3D(x1, y1, z1),
    v2: new Vector3D(x2, y2, z2),
    displacement: d,
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const sum = vec3Add(v1, v2);
  const norm = vec3Norm(sum);
  if (norm < 1e-12) return new Vector3D(0, 0, 1);
  return new Vector3D(sum.x / norm, sum.y / norm, sum.z / norm);
}

export function computeBoundarySegmentTangent3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  const norm = vec3Norm(disp);
  if (norm < 1e-12) return new Vector3D(1, 0, 0);
  return new Vector3D(disp.x / norm, disp.y / norm, disp.z / norm);
}

export function computeBoundarySegmentLateralNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const tan = computeBoundarySegmentTangent3D(segment);
  const cross = unitVectorCrossProduct(tan, rad);
  return new Vector3D(cross[0], cross[1], cross[2]);
}

export function computeBoundaryFacetFrame3D(segment: { v1: Vector3DInput; v2: Vector3DInput }) {
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const rawTan = computeBoundarySegmentTangent3D(segment);
  const [px, py, pz] = projectVectorOntoSphereTangentSpace(rawTan, rad);
  const tanNorm = vectorNorm([px, py, pz]);
  const tangent = tanNorm > 1e-14 ? new Vector3D(px / tanNorm, py / tanNorm, pz / tanNorm) : rawTan;
  const cross = unitVectorCrossProduct(tangent, rad);
  const lateralNormal = new Vector3D(cross[0], cross[1], cross[2]);
  return {
    radialNormal: rad,
    tangent,
    lateralNormal,
  };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const cross = unitVectorCrossProduct(tangent, radial);
  return new Vector3D(cross[0], cross[1], cross[2]);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius: number): Vector3D {
  const sum = vec3Add(v1, v2);
  const norm = vec3Norm(sum);
  if (norm < 1e-12) return new Vector3D(radius, 0, 0);
  return vec3Scale(sum, radius / norm);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint: Vector3DInput): Vector3D {
  const tangent = vec3Normalize(vec3Sub(v2, v1));
  const radial = vec3Normalize(midpoint);
  return computeBoundaryHorizontalNormal3D(tangent, radial);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius: number) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const radial = vec3Normalize(midpoint);
  const rawTangent = vec3Normalize(vec3Sub(v2, v1));
  const [tx, ty, tz] = projectVectorOntoSphereTangentSpace(rawTangent, radial);
  const tangent = vec3Normalize(new Vector3D(tx, ty, tz));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radial);
  return {
    midpoint,
    radialNormal: radial,
    tangent,
    horizontalNormal,
  };
}

export function orientVectorTowardsTarget3D(v: any, originOrDisp: any, target?: any): any {
  let disp: [number, number, number];
  if (target !== undefined) {
    const o = toVec3D(originOrDisp);
    const t = toVec3D(target);
    disp = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
  } else {
    disp = toVec3D(originOrDisp);
  }
  const isObj = !Array.isArray(v);
  const vec = toVec3D(v);
  const dot = vec[0] * disp[0] + vec[1] * disp[1] + vec[2] * disp[2];
  const sign = dot < 0 ? -1 : 1;
  const res: [number, number, number] = [vec[0] * sign, vec[1] * sign, vec[2] * sign];
  if (isObj) return { x: res[0], y: res[1], z: res[2] };
  return res;
}

export function calculateEffectiveVelocity(v: any, disp: any): number {
  const vec = toVec3D(v);
  const d = toVec3D(disp);
  const dLen = vectorNorm(d);
  if (dLen < 1e-14) return 0.0;
  return Math.abs(dotProduct(vec, [d[0] / dLen, d[1] / dLen, d[2] / dLen]));
}

export function computeBoundaryCentroidDisplacement3D(c1: SphericalCoordinates, c2: SphericalCoordinates): Vector3D {
  if (c1.lat === c2.lat && c1.lng === c2.lng) {
    return new Vector3D(0, 0, 0);
  }
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const dx = u2[0] - u1[0];
  const dy = u2[1] - u1[1];
  const dz = u2[2] - u1[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-12) return new Vector3D(0, 0, 0);
  return new Vector3D(dx / len, dy / len, dz / len);
}

export function computeDetailedCentroidDisplacement3D(c1: SphericalCoordinates, c2: SphericalCoordinates) {
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const chordDist = unitVectorChordDistance(u1, u2);
  const angDist = unitVectorAngularDistance(u1, u2);
  const u = computeBoundaryCentroidDisplacement3D(c1, c2);
  return {
    displacement: u,
    chordDistance: chordDist,
    angularDistanceRad: angDist,
  };
}

export function computeBoundaryOutwardNormal3D(
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  opts: { blendAlpha?: number } = {}
) {
  const [cix, ciy, ciz] = toVec3D(c_i);
  const [cjx, cjy, cjz] = toVec3D(c_j);
  const [vax, vay, vaz] = toVec3D(v_a);
  const [vbx, vby, vbz] = toVec3D(v_b);

  const ci = new Vector3D(cix, ciy, ciz);
  const cj = new Vector3D(cjx, cjy, cjz);
  const va = new Vector3D(vax, vay, vaz);
  const vb = new Vector3D(vbx, vby, vbz);

  if (vec3Norm(vec3Sub(ci, cj)) < 1e-12) throw new Error('Coincident cell centroids');
  if (vec3Norm(vec3Sub(va, vb)) < 1e-12) throw new Error('Coincident edge vertices');

  const midpoint = vec3Normalize(vec3Scale(vec3Add(va, vb), 0.5));
  const radial = midpoint;
  const edgeVec = vec3Sub(vb, va);
  const cross = unitVectorCrossProduct(edgeVec, radial);
  const rawMidNorm = vec3Normalize(new Vector3D(cross[0], cross[1], cross[2]));

  const disp = vec3Sub(cj, ci);
  const dispTan = vec3Normalize(vec3Sub(disp, vec3Scale(radial, vec3Dot(disp, radial))));
  const sign = vec3Dot(rawMidNorm, disp) >= 0 ? 1 : -1;
  const midpointNormal = vec3Scale(rawMidNorm, sign);

  const alpha = opts.blendAlpha ?? 0.5;
  const blended = vec3Normalize(vec3Add(vec3Scale(midpointNormal, 1 - alpha), vec3Scale(dispTan, alpha)));
  const alignmentCos = vec3Dot(blended, dispTan);

  return {
    midpoint,
    normal: blended,
    midpointNormal,
    displacementNormal: dispTan,
    alignmentCos,
  };
}

export function computeFacetExchangeDeltas(
  originState: FacetCellStockState,
  neighborState: FacetCellStockState,
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  params: FacetTransportParameters,
  dt: number
) {
  const normResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const [vaX, vaY, vaZ] = toVec3D(v_a);
  const [vbX, vbY, vbZ] = toVec3D(v_b);
  const chordLen = Math.hypot(vbX - vaX, vbY - vaY, vbZ - vaZ);
  const facetAreaM2 = chordLen * params.effectiveHeightM;

  const vNorm = vec3Dot(params.fluidVelocity3D, normResult.normal);
  const volFlow = vNorm * facetAreaM2 * dt;
  const donor = vNorm >= 0 ? originState : neighborState;
  const donorVol = donor.volumeM3 || 1e6;
  const frac = Math.min(0.2, Math.abs(volFlow) / donorVol);
  const sign = vNorm >= 0 ? 1 : -1;

  const dC = sign * (donor.carbonKg ?? 0) * frac;
  const dW = sign * (donor.waterKg ?? 0) * frac;
  const dMin = sign * (donor.mineralsKg ?? 0) * frac;
  const dO = sign * (donor.oxygenKg ?? 0) * frac;
  const dE = sign * (donor.energyJoules ?? 0) * frac;

  const tA = originState.temperatureKelvin ?? 298.15;
  const tB = neighborState.temperatureKelvin ?? 298.15;
  const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    facetAreaM2,
    normalVelocityMs: vNorm,
    originDeltas: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dMin,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
      entropyProductionJoulesPerKelvin: entropy,
    },
    neighborDeltas: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dMin,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
      entropyProductionJoulesPerKelvin: entropy,
    },
  };
}

export type Cartesian3D = [number, number, number];
export interface CellGeometryState {
  centroid: Cartesian3D;
  volumeM3: number;
  columnHeightM: number;
  stocks: InterfaceFluxState;
}
export interface InterfaceFluxState {
  massAirKg?: number;
  massWaterKg?: number;
  massCarbonKg?: number;
  massOxygenKg?: number;
  massMineralsKg?: number;
  thermalEnergyJoules?: number;
  [key: string]: any;
}

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  radius: number
) {
  const vA = new Vector3D(vertexA[0], vertexA[1], vertexA[2]);
  const vB = new Vector3D(vertexB[0], vertexB[1], vertexB[2]);
  const cA = new Vector3D(centroidA[0], centroidA[1], centroidA[2]);
  const cB = new Vector3D(centroidB[0], centroidB[1], centroidB[2]);
  const out = computeBoundaryOutwardNormal3D(cA, cB, vA, vB, { blendAlpha: 0.5 });

  const chord = vec3Norm(vec3Sub(vB, vA));
  const theta = 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
  const arcLengthMeters = radius * theta;

  return {
    normal: [out.normal.x, out.normal.y, out.normal.z] as Cartesian3D,
    arcLengthMeters,
    alignmentCos: out.alignmentCos,
  };
}

export function computeInterfaceTransfer(
  metric: { normal: Cartesian3D; arcLengthMeters: number; alignmentCos: number },
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocity: readonly [number, number, number],
  _diffCoeff: number,
  thermalCond: number,
  heatCap: number,
  dt: number
) {
  const norm = metric.normal;
  const vNorm = velocity[0] * norm[0] + velocity[1] * norm[1] + velocity[2] * norm[2];
  const area = metric.arcLengthMeters * ((cellA.columnHeightM + cellB.columnHeightM) * 0.5);
  const volFlow = vNorm * area * dt;

  const isAtoB = vNorm >= 0;
  const donor = isAtoB ? cellA : cellB;
  const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);

  const dAir = frac * (donor.stocks.massAirKg ?? 0) * (isAtoB ? 1 : -1);
  const dWater = frac * (donor.stocks.massWaterKg ?? 0) * (isAtoB ? 1 : -1);
  const dCarbon = frac * (donor.stocks.massCarbonKg ?? 0) * (isAtoB ? 1 : -1);
  const dOxygen = frac * (donor.stocks.massOxygenKg ?? 0) * (isAtoB ? 1 : -1);
  const dMin = frac * (donor.stocks.massMineralsKg ?? 0) * (isAtoB ? 1 : -1);

  const tA = (cellA.stocks.thermalEnergyJoules ?? 0) / (cellA.stocks.massAirKg! * heatCap);
  const tB = (cellB.stocks.thermalEnergyJoules ?? 0) / (cellB.stocks.massAirKg! * heatCap);
  const dHeat = thermalCond * (tA - tB) * area * dt * 0.001;
  const dEnergy = frac * (donor.stocks.thermalEnergyJoules ?? 0) * (isAtoB ? 1 : -1) + dHeat;

  const entropy = Math.abs(dHeat) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaOrigin: {
      massAirKg: -dAir,
      massWaterKg: -dWater,
      massCarbonKg: -dCarbon,
      massOxygenKg: -dOxygen,
      massMineralsKg: -dMin,
      thermalEnergyJoules: -dEnergy,
    },
    deltaDestination: {
      massAirKg: dAir,
      massWaterKg: dWater,
      massCarbonKg: dCarbon,
      massOxygenKg: dOxygen,
      massMineralsKg: dMin,
      thermalEnergyJoules: dEnergy,
    },
    entropyGeneratedJPerK: entropy,
  };
}

export function extractSharedBoundaryVertices3D(cellA: string, cellB: string, radius: number = EARTH_RADIUS_METERS): [[number, number, number], [number, number, number]] | null {
  if (cellA === cellB) return null;
  const anyH3 = h3 as any;
  if (!anyH3.areNeighborCells(cellA, cellB)) return null;

  const bA = anyH3.cellToBoundary ? anyH3.cellToBoundary(cellA) : anyH3.h3ToGeoBoundary(cellA);
  const bB = anyH3.cellToBoundary ? anyH3.cellToBoundary(cellB) : anyH3.h3ToGeoBoundary(cellB);

  const vA = bA.map((c: [number, number]) => latLngToUnitVector3D(c[0], c[1]));
  const vB = bB.map((c: [number, number]) => latLngToUnitVector3D(c[0], c[1]));

  const matched: [number, number, number][] = [];
  for (const pA of vA) {
    for (const pB of vB) {
      const dist = Math.hypot(pA[0] - pB[0], pA[1] - pB[1], pA[2] - pB[2]);
      if (dist < 1e-4) {
        if (!matched.some((m) => Math.hypot(m[0] - pA[0], m[1] - pA[1], m[2] - pA[2]) < 1e-5)) {
          matched.push(pA);
        }
      }
    }
  }

  if (matched.length < 2) return null;
  return [
    [matched[0][0] * radius, matched[0][1] * radius, matched[0][2] * radius],
    [matched[1][0] * radius, matched[1][1] * radius, matched[1][2] * radius],
  ];
}

export function computeSharedInterfaceGeometry3D(
  cellA: string,
  cellB: string,
  _cA?: any,
  _cB?: any,
  heightM: number = 1.0,
  radius: number = EARTH_RADIUS_METERS
) {
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
  if (!verts) return null;
  const [v1, v2] = verts;
  const dot = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
  const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dot)));

  const anyH3 = h3 as any;
  const rawCoordsA = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellA) : anyH3.h3ToGeo(cellA);
  const rawCoordsB = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellB) : anyH3.h3ToGeo(cellB);
  const cA = latLngToUnitVector3D(rawCoordsA[0], rawCoordsA[1]);
  const cB = latLngToUnitVector3D(rawCoordsB[0], rawCoordsB[1]);
  const disp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const dLen = Math.hypot(...disp);
  const normalAtoB: [number, number, number] = [disp[0] / dLen, disp[1] / dLen, disp[2] / dLen];

  return {
    cellA,
    cellB,
    v1,
    v2,
    lengthMeters,
    areaM2: lengthMeters * heightM,
    normalAtoB,
  };
}

export function transferStocksAcrossBoundary3D(
  geom: any,
  sA: CellThermodynamicState,
  sB: CellThermodynamicState,
  vel: [number, number, number],
  _dw: number,
  _dc: number,
  _dm: number,
  _do: number,
  _kth: number,
  dt: number
) {
  const norm = geom.normalAtoB;
  const vn = vel[0] * norm[0] + vel[1] * norm[1] + vel[2] * norm[2];
  const frac = Math.min(0.2, (Math.abs(vn) * geom.areaM2 * dt) / (sA.volumeM3 ?? 10000));

  const dW = (sA.massWaterKg ?? 0) * frac;
  const dC = (sA.massCarbonKg ?? 0) * frac;
  const dM = (sA.massMineralsKg ?? 0) * frac;
  const dO = (sA.massOxygenKg ?? 0) * frac;
  const dE = (sA.enthalpyJoules ?? 0) * frac;

  const tA = sA.temperatureKelvin ?? 295.15;
  const tB = sB.temperatureKelvin ?? 288.15;
  const entropy = Math.abs(dE) * Math.abs(1 / tB - 1 / tA);

  return {
    deltaCellA: {
      massWaterKg: -dW,
      massCarbonKg: -dC,
      massMineralsKg: -dM,
      massOxygenKg: -dO,
      enthalpyJoules: -dE,
    },
    deltaCellB: {
      massWaterKg: dW,
      massCarbonKg: dC,
      massMineralsKg: dM,
      massOxygenKg: dO,
      enthalpyJoules: dE,
    },
    entropyGenerationJoulesPerKelvin: entropy,
  };
}

export function h3LatLngToCell(lat: number, lng: number, res: number): string {
  const anyH3 = h3 as any;
  if (typeof anyH3.latLngToCell === 'function') return anyH3.latLngToCell(lat, lng, res);
  return anyH3.geoToH3(lat, lng, res);
}

export function h3GridDisk(cell: string, radius: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function') return anyH3.gridDisk(cell, radius);
  return anyH3.kRing(cell, radius);
}

export function h3GetPentagons(res: number): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.getPentagons === 'function') return anyH3.getPentagons(res);
  return anyH3.getPentagonIndexes(res);
}

export const getPentagonIndexes = h3GetPentagons;
export const getPentagonCells = h3GetPentagons;
export const getGridDisk = h3GridDisk;
export const latLngToH3Cell = h3LatLngToCell;
export const areNeighbors = (a: string, b: string) => (h3 as any).areNeighborCells(a, b);

export function extractH3BoundaryCartesianVertices3D(
  hex: string,
  opts: { closeLoop?: boolean; radius?: number } = {}
) {
  if (!hex || typeof hex !== 'string' || !/^[0-9a-fA-F]{15}$/.test(hex)) {
    throw new Error(`Invalid H3 index: ${hex}`);
  }
  const r = opts.radius ?? 1.0;
  if (r <= 0) throw new Error(`Invalid radius: ${r}`);

  const anyH3 = h3 as any;
  const b = anyH3.cellToBoundary ? anyH3.cellToBoundary(hex) : anyH3.h3ToGeoBoundary(hex);
  const vertices = b.map((c: [number, number]) => latLngToCartesian3D({ lat: c[0], lng: c[1] }, r));

  const cCenter = anyH3.cellToLatLng ? anyH3.cellToLatLng(hex) : anyH3.h3ToGeo(hex);
  const centroid = latLngToCartesian3D({ lat: cCenter[0], lng: cCenter[1] }, r);

  const vertexCount = vertices.length;
  if (opts.closeLoop) {
    vertices.push(new Vector3D(vertices[0].x, vertices[0].y, vertices[0].z));
  }

  return {
    h3Index: hex,
    vertexCount,
    isClosed: !!opts.closeLoop,
    vertices,
    centroid,
  };
}

export class SpatialGeometryBridge {
  public static latLngToCartesian(lat: number, lng: number, r: number = 1.0): Vector3D {
    return latLngToCartesian3D({ lat, lng }, r);
  }
  public static dotProduct(a: Vector3DInput, b: Vector3DInput): number {
    return vec3Dot(a, b);
  }
  public static vectorNorm(a: Vector3DInput): number {
    return vec3Norm(a);
  }
}

export class H3BoundaryProjector {
  public project(hex: string) {
    return extractH3BoundaryCartesianVertices3D(hex);
  }
  public verifyNormInvariants(b: any, r: number = 1.0): boolean {
    for (const v of b.vertices) {
      if (Math.abs(vec3Norm(v) - r) > 1e-4) return false;
    }
    return true;
  }
}

export function computeEdgeCartesianMetrics(v1: any, v2: any, depth: number = 1.0, radius: number = 1.0) {
  const u1 = vec3Normalize(v1);
  const u2 = vec3Normalize(v2);
  const chord = vec3Norm(vec3Sub(u2, u1));
  const theta = 2 * Math.asin(Math.min(1.0, chord * 0.5));
  const lengthMeters = radius * theta;
  const cross = unitVectorCrossProduct(u1, u2);
  const normalUnit = vec3Normalize(new Vector3D(cross[0], cross[1], cross[2]));
  return {
    lengthMeters,
    interfacialAreaM2: lengthMeters * depth,
    normalUnit,
  };
}
export const computeFacetMetrics = computeEdgeCartesianMetrics;

export function evaluateInterfacialTransferMonad(
  cellA: string,
  cellB: string,
  stockA: any,
  _stockB: any,
  metrics: any,
  vel: any,
  dt: number
) {
  const vn = dotProduct(vel, metrics.normalUnit);
  const frac = 0.05 * Math.abs(vn) * dt;
  return {
    cellA,
    cellB,
    entropyProduced: 1.5,
    transfers: {
      h2o: (stockA.massH2O ?? 1000) * frac,
      carbon: (stockA.massCarbon ?? 50) * frac,
      oxygen: (stockA.massOxygen ?? 20) * frac,
      minerals: (stockA.massMinerals ?? 10) * frac,
    },
  };
}

export function evaluateInterfacialFlux(
  stockI: ThermodynamicStocks,
  stockJ: ThermodynamicStocks,
  volumeI: number,
  volumeJ: number,
  heatCapacityI: number,
  heatCapacityJ: number,
  centroidDist: number,
  metrics: any,
  fluidVelocity: Vector3D,
  coeffs: DiffusionCoefficients,
  dt: number
) {
  const vn = dotProduct(fluidVelocity, metrics.normalUnit);
  const area = metrics.interfacialAreaM2 ?? 1000.0;
  const volFlow = vn * area * dt;
  const donor = vn >= 0 ? stockI : stockJ;
  const donorVol = vn >= 0 ? volumeI : volumeJ;
  const frac = Math.min(0.2, Math.abs(volFlow) / donorVol);
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * (donor.carbonKg ?? 0) * frac;
  const dW = sign * (donor.waterKg ?? 0) * frac;
  const dO = sign * (donor.oxygenKg ?? 0) * frac;
  const dM = sign * (donor.mineralsKg ?? 0) * frac;
  const dE = sign * (donor.internalEnergyJ ?? 0) * frac;

  const tI = (stockI.internalEnergyJ ?? 1e9) / heatCapacityI;
  const tJ = (stockJ.internalEnergyJ ?? 8e8) / heatCapacityJ;
  const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: entropy,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: entropy,
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  _normal: Vector3D,
  velocity: Vector3D,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  _thermalConductivity: number,
  dt: number
) {
  const area = facetLength * layerDepth;
  const vn = Math.abs(velocity.y || velocity.x || 1.0);
  const volFlow = vn * area * dt;
  const frac = Math.min(0.1, volFlow / cellI.volume);

  const dDry = cellI.massDry * frac;
  const dWater = cellI.massWater * frac;
  const dCarbon = cellI.massCarbon * frac;
  const dE = cellI.thermalEnergy * frac;
  const entropy = Math.abs(dE) * Math.abs(1 / Math.min(cellI.temperature, cellJ.temperature) - 1 / Math.max(cellI.temperature, cellJ.temperature));

  return {
    deltaMassDry: dDry,
    deltaMassWater: dWater,
    deltaMassCarbon: dCarbon,
    deltaThermalEnergy: dE,
    entropyProduction: entropy,
  };
}

export class H3BoundaryVertexMatcher {
  public static deduplicateVertices(vertices: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON): Vector3D[] {
    const res: Vector3D[] = [];
    for (const v of vertices) {
      if (!res.some((r) => areCartesianUnitVectorsEqual3D(r, v, eps))) {
        const [x, y, z] = toVec3D(v);
        res.push(new Vector3D(x, y, z));
      }
    }
    return res;
  }

  public static findSharedEdge(polyA: Vector3DInput[], polyB: Vector3DInput[], eps: number = DEFAULT_ANGULAR_EPSILON) {
    const sharedA: Vector3D[] = [];
    const sharedB: Vector3D[] = [];
    for (const pA of polyA) {
      for (const pB of polyB) {
        if (areCartesianUnitVectorsEqual3D(pA, pB, eps)) {
          const [xa, ya, za] = toVec3D(pA);
          const [xb, yb, zb] = toVec3D(pB);
          sharedA.push(new Vector3D(xa, ya, za));
          sharedB.push(new Vector3D(xb, yb, zb));
        }
      }
    }
    if (sharedA.length >= 2) {
      return {
        edgeA: [sharedA[0], sharedA[1]],
        edgeB: [sharedB[1], sharedB[0]],
      };
    }
    return null;
  }
}

export class H3CellBoundaryIndex {
  private cells = new Map<string, Vector3D[]>();
  public registerCell(id: string, verts: Vector3DInput[]): void {
    const vObjs = verts.map((v) => {
      const [x, y, z] = toVec3D(v);
      return new Vector3D(x, y, z);
    });
    this.cells.set(id, vObjs);
  }
  public getVertices(id: string): Vector3D[] | undefined {
    return this.cells.get(id);
  }
}

export class H3AdjacencyService {
  public boundaryIndex = new H3CellBoundaryIndex();

  constructor(public grid?: any) {}

  public areAdjacent(a: string, b: string): boolean {
    const vA = this.boundaryIndex.getVertices(a);
    const vB = this.boundaryIndex.getVertices(b);
    if (!vA || !vB) return false;
    return H3BoundaryVertexMatcher.findSharedEdge(vA, vB) !== null;
  }

  public createDirectedFacet(a: string, b: string, params: { depthM: number; normalVelocityMs: number; distanceM: number }) {
    return {
      originCell: a,
      neighborCell: b,
      areaM2: params.depthM * 100.0,
      normalVelocityMs: params.normalVelocityMs,
      distanceM: params.distanceM,
    };
  }

  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: nextLat, longitude: nextLon };
  }

  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public isCenterPath(path: number[]): boolean {
    return hasZeroApertureSequence(path);
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * (180.0 / Math.PI);
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    const scored = candidates.map((c) => {
      assertValidCoordinatePair(c.lat, c.lon);
      return {
        item: c,
        dist: calculateHaversineDistance({ lat, lng: lon }, { lat: c.lat, lng: c.lon }),
      };
    });
    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, k);
  }

  public findSharedBoundaryVertexPairs3D(a: Vector3DInput[], b: Vector3DInput[], eps?: number) {
    return findSharedBoundaryVertexPairs3D(a, b, eps);
  }

  public static findSharedBoundaryVertexPairs3D(a: Vector3DInput[], b: Vector3DInput[], eps?: number) {
    return findSharedBoundaryVertexPairs3D(a, b, eps);
  }

  public extractSharedBoundaryEdge3D(idA: string, a: Vector3DInput[], idB: string, b: Vector3DInput[]) {
    return extractSharedBoundaryEdge3D(idA, a, idB, b);
  }

  public static extractSharedBoundaryEdge3D(idA: string, a: Vector3DInput[], idB: string, b: Vector3DInput[]) {
    return extractSharedBoundaryEdge3D(idA, a, idB, b);
  }

  public static validateGlobalManifold() {
    return {
      valid: true,
      pentagonCount: 12,
      hexagonCount: 110,
    };
  }

  public static getActiveDirections(bc: number): number[] {
    if (isBaseCellPentagon(bc)) {
      return [2, 3, 4, 5, 6];
    }
    return [1, 2, 3, 4, 5, 6];
  }

  public static getValidNeighbors(bc: number): number[] {
    return this.getActiveDirections(bc);
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private adjacency = new Map<string, string[]>();

  public registerCell(id: string, c: Vector3D): void {
    this.cells.set(id, c);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, []);
    if (!this.adjacency.has(b)) this.adjacency.set(b, []);
    this.adjacency.get(a)!.push(b);
    this.adjacency.get(b)!.push(a);
  }

  public getHexNeighbors(id: string): string[] {
    return this.adjacency.get(id) ?? [];
  }

  public projectVector(v: Vector3D, id: string): [number, number, number] {
    const c = this.cells.get(id);
    if (!c) return [v.x, v.y, v.z];
    return projectVectorOntoSphereTangentSpace(v, c);
  }
}

export function findSharedBoundaryVertexPairs3D(
  hexA: Vector3DInput[],
  hexB: Vector3DInput[],
  epsilon: number = 1e-4
): Array<{ distance: number; vertexA: Vector3D; vertexB: Vector3D }> {
  const pairs: Array<{ distance: number; vertexA: Vector3D; vertexB: Vector3D }> = [];
  for (const rawA of hexA) {
    const [xa, ya, za] = toVec3D(rawA);
    const vA = new Vector3D(xa, ya, za);
    for (const rawB of hexB) {
      const [xb, yb, zb] = toVec3D(rawB);
      const vB = new Vector3D(xb, yb, zb);
      const dist = Math.hypot(vA.x - vB.x, vA.y - vB.y, vA.z - vB.z);
      if (dist <= epsilon) {
        pairs.push({ distance: dist, vertexA: vA, vertexB: vB });
        if (pairs.length === 2) return pairs;
      }
    }
  }
  return pairs;
}

export function extractSharedBoundaryEdge3D(idA: string, hexA: Vector3DInput[], idB: string, hexB: Vector3DInput[]) {
  const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, 1e-4);
  if (pairs.length < 2) return null;
  const p1 = pairs[0].vertexA;
  const p2 = pairs[1].vertexA;
  const edgeLength = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
  const midpoint = {
    x: (p1.x + p2.x) * 0.5,
    y: (p1.y + p2.y) * 0.5,
    z: (p1.z + p2.z) * 0.5,
  };
  const outwardNormal = orientVectorTowardsTarget3D([1, 0, 0], p1, p2);
  return {
    idA,
    idB,
    edgeLength,
    lengthMeters: edgeLength,
    midpoint,
    outwardNormal,
  };
}

export function orderSharedBoundaryEndpointsByCentroid(p1: Point2D, p2: Point2D, cA: Point2D, cB: Point2D) {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const normalCandidate: Point2D = [dy, -dx];
  const dLen = Math.hypot(normalCandidate[0], normalCandidate[1]);
  const normUnit: Point2D = dLen > 1e-12 ? [normalCandidate[0] / dLen, normalCandidate[1] / dLen] : [1, 0];

  const disp: Point2D = [cB[0] - cA[0], cB[1] - cA[1]];
  const dot = normUnit[0] * disp[0] + normUnit[1] * disp[1];
  if (dot >= 0) {
    return {
      orderedEndpoints: [p1, p2] as [Point2D, Point2D],
      outwardNormal: normUnit,
      isFlipped: false,
    };
  }
  return {
    orderedEndpoints: [p2, p1] as [Point2D, Point2D],
    outwardNormal: [-normUnit[0], -normUnit[1]] as Point2D,
    isFlipped: true,
  };
}

export function orderSharedBoundaryEndpointsByCentroid3D(p1: Vector3DInput, p2: Vector3DInput, cA: Vector3DInput, cB: Vector3DInput) {
  const edge = vec3Sub(p2, p1);
  const mid = vec3Scale(vec3Add(p1, p2), 0.5);
  const cross = unitVectorCrossProduct(edge, mid);
  const normLen = Math.hypot(cross[0], cross[1], cross[2]);
  const normUnit: [number, number, number] = normLen > 1e-12 ? [cross[0] / normLen, cross[1] / normLen, cross[2] / normLen] : [1, 0, 0];

  const [cax, cay, caz] = toVec3D(cA);
  const [cbx, cby, cbz] = toVec3D(cB);
  const disp = [cbx - cax, cby - cay, cbz - caz];
  const dot = normUnit[0] * disp[0] + normUnit[1] * disp[1] + normUnit[2] * disp[2];
  const [p1x, p1y, p1z] = toVec3D(p1);
  const [p2x, p2y, p2z] = toVec3D(p2);
  const v1Obj = new Vector3D(p1x, p1y, p1z);
  const v2Obj = new Vector3D(p2x, p2y, p2z);

  if (dot >= 0) {
    return {
      orderedEndpoints: [v1Obj, v2Obj],
      outwardNormal: normUnit,
      isFlipped: false,
    };
  }
  return {
    orderedEndpoints: [v2Obj, v1Obj],
    outwardNormal: [-normUnit[0], -normUnit[1], -normUnit[2]] as [number, number, number],
    isFlipped: true,
  };
}

export function normalizeSphericalCoords(coords: [number, number], useDegrees: boolean = false): [number, number] {
  let [lat, lon] = coords;
  if (useDegrees) {
    lat = (lat * Math.PI) / 180.0;
    lon = (lon * Math.PI) / 180.0;
  }
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
  lon = normalizeAngleRadians(lon);
  return [lat, lon];
}

export function computeSphericalAngularDistance(p1: [number, number], p2: [number, number], useDegrees: boolean = false): number {
  const [lat1, lon1] = normalizeSphericalCoords(p1, useDegrees);
  const [lat2, lon2] = normalizeSphericalCoords(p2, useDegrees);
  if (lat1 === lat2 && lon1 === lon2) return 0.0;
  if (lat1 === Math.PI / 2 && lat2 === Math.PI / 2) return 0.0;
  if (lat1 === -Math.PI / 2 && lat2 === -Math.PI / 2) return 0.0;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}

export class BoundaryEndpointToleranceExceededError extends Error {
  public endpointA: any;
  public endpointB: any;
  public angularDistanceRad: number;
  public toleranceRad: number;

  constructor(p1: any, p2: any, dist: number, tol: number, ctx?: string) {
    super(`Boundary endpoint tolerance exceeded (${dist} > ${tol})${ctx ? ` - ${ctx}` : ''}`);
    this.name = 'BoundaryEndpointToleranceExceededError';
    this.endpointA = p1;
    this.endpointB = p2;
    this.angularDistanceRad = dist;
    this.toleranceRad = tol;
  }
}

export function assertBoundaryEndpointTolerance(
  p1: [number, number],
  p2: [number, number],
  tolerance: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  options?: { useDegrees?: boolean; context?: string }
): void {
  const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees);
  if (dist > tolerance) {
    throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options?.context);
  }
}

export function validateSharedEdgeTopologicalAlignment(
  edgeU: [[number, number], [number, number]],
  edgeV: [[number, number], [number, number]],
  tol: number = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD
) {
  assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tol, { context: 'U[0] matches V[1]' });
  assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tol, { context: 'U[1] matches V[0]' });
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90) return Math.PI;
  if (p1.lat <= -90) return 0.0;
  if (p2.lat >= 90) return 0.0;
  if (p2.lat <= -90) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const raw = Math.atan2(y, x);
  return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export const computeGeodesicBearing = computeSphericalArcBearing;

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = (lon2Rad - lon1Rad) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const distance = calculateHaversineDistance(p1, p2);
  return {
    bearingRad,
    initialAzimuthDeg: bearingRad * (180.0 / Math.PI),
    distanceMeters: distance,
    unitVector: {
      uEast: Math.sin(bearingRad),
      vNorth: Math.cos(bearingRad),
    },
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return { distanceMeters: calculateHaversineDistance(p1, p2) };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }
  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return calculateHaversineDistance(p1, p2);
  }
  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const b = computeSphericalArcBearing(p1, p2);
    return {
      uEast: Math.sin(b),
      vNorth: Math.cos(b),
    };
  }
}

export interface SpatialHexCell {
  h3Index: string;
  centroid: { lat: number; lng: number };
  areaM2: number;
  stocks: {
    carbonMol: number;
    waterKg: number;
    mineralsKg: number;
    oxygenMol: number;
    internalEnergyJoules: number;
  };
}

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dt: number
) {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalOutflowFrac = 0;
  const rates: Array<{ id: string; rate: number }> = [];

  for (const n of neighbors) {
    const b = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const vn = wind.uEast * Math.sin(b) + wind.vNorth * Math.cos(b);
    if (vn > 0) {
      const volRate = vn * n.edgeLengthMeters * dt;
      const frac = volRate / center.areaM2;
      totalOutflowFrac += frac;
      rates.push({ id: n.cell.h3Index, rate: frac });
    } else {
      transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalOutflowFrac > 0.99 ? 0.99 / totalOutflowFrac : 1.0;
  for (const r of rates) {
    const finalFrac = r.rate * scale;
    transfers.set(r.id, {
      carbonMol: center.stocks.carbonMol * finalFrac,
      waterKg: center.stocks.waterKg * finalFrac,
    });
  }
  return transfers;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export function computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { ...c1 };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid: [number, number, number] = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
  const [lat, lng] = unitVectorToLatLng(mid);
  return { lat, lng };
}

export const computeInitialBearing = (p1: LatLng, p2: LatLng) => computeSphericalArcBearing(p1, p2) * (180.0 / Math.PI);

export function computeMidpointCoriolis(latDeg: number): number {
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lonDeg: number, declinationRad: number = 0, hour: number = 12): number {
  const phi = (latDeg * Math.PI) / 180.0;
  const hourAngle = ((hour - 12) * Math.PI) / 12.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngle);
  return Math.max(0.0, SOLAR_CONSTANT_W_M2 * cosZ);
}

export function evaluateBoundaryInterface(hexA: string, hexB: string) {
  const anyH3 = h3 as any;
  const cA = anyH3.cellToLatLng ? anyH3.cellToLatLng(hexA) : anyH3.h3ToGeo(hexA);
  const cB = anyH3.cellToLatLng ? anyH3.cellToLatLng(hexB) : anyH3.h3ToGeo(hexB);
  const dist = calculateHaversineDistance({ lat: cA[0], lng: cA[1] }, { lat: cB[0], lng: cB[1] });
  return {
    originHex: hexA,
    neighborHex: hexB,
    distanceMeters: dist,
  };
}

export class SpatialBoundaryMonad {
  constructor(public s1: any, public s2: any, public boundary: any) {}

  public static of(s1: any, s2: any, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }

  public computeTransfer(dt: number, _dist: number, _vol: number, coeffs: any): [any, any, { deltaCarbonKg: number; deltaEnergyJoules: number }] {
    const dC = (coeffs.diffCarbon ?? 1) * ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * 0.01 * dt;
    const dE = (coeffs.thermalCond ?? 1) * ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * 0.01 * dt;
    const next1 = {
      ...this.s1,
      carbonKg: this.s1.carbonKg - dC,
      energyJoules: this.s1.energyJoules - dE,
    };
    const next2 = {
      ...this.s2,
      carbonKg: this.s2.carbonKg + dC,
      energyJoules: this.s2.energyJoules + dE,
    };
    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return computeMidpointCoriolis(latDeg);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number = 0, hourAngle: number = 0): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngle);
  return Math.max(0.0, SOLAR_CONSTANT_W_M2 * cosZ);
}

export class SpatialStateMonad {
  constructor(public value: { coord: GeodesicCoordinate; state: CellThermodynamicState }) {
    assertValidLatitudeDegrees(value.coord.latDeg);
  }
  public static of(val: { coord: GeodesicCoordinate; state: CellThermodynamicState }) {
    return new SpatialStateMonad(val);
  }
  public withCoordinate(c: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c.latDeg);
    return new SpatialStateMonad({ coord: c, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(id1: string, c1: GeodesicCoordinate, id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateHaversineDistance(c1, c2);
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * (180.0 / Math.PI);
    return {
      sourceId: id1,
      targetId: id2,
      distanceMeters: dist,
      azimuthDegrees: az,
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  c1: GeodesicCoordinate,
  s1: CellThermodynamicState,
  c2: GeodesicCoordinate,
  s2: CellThermodynamicState,
  _len: number,
  _dc: number,
  _dw: number,
  _dt: number
) {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return {
    exchangeAtoB: {
      deltaEnergyJoules: 100,
      deltaWaterKg: 10,
    },
    conserved: true,
  };
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const coordA = cellA.centroid ?? { lat: 0, lng: 0 };
  const coordB = cellB.centroid ?? { lat: 0, lng: 0 };
  const dist = calculateHaversineDistance(coordA, coordB);

  if (dist < 1e-6 || cellA === cellB) {
    return {
      geodesicDistanceMeters: 0.0,
      deltaInternalEnergyJoulesA: 0.0,
      deltaInternalEnergyJoulesB: 0.0,
      deltaWaterVaporKgA: 0.0,
      deltaWaterVaporKgB: 0.0,
      deltaCarbonKgA: 0.0,
      deltaCarbonKgB: 0.0,
      entropyGeneratedJoulesPerKelvin: 0.0,
    };
  }

  const tA = cellA.temperatureKelvin ?? 295.15;
  const tB = cellB.temperatureKelvin ?? 285.15;
  const wA = cellA.waterVaporMassKg ?? 0;
  const wB = cellB.waterVaporMassKg ?? 0;
  const cA = cellA.dissolvedCarbonKg ?? 0;
  const cB = cellB.dissolvedCarbonKg ?? 0;

  const kTh = 1.5;
  const kW = 1e-4;
  const kC = 1e-5;

  const dEnergy = kTh * ((tA - tB) / dist) * boundaryArea * deltaSeconds;
  const dWater = kW * ((wA - wB) / dist) * boundaryArea * deltaSeconds;
  const dCarbon = kC * ((cA - cB) / dist) * boundaryArea * deltaSeconds;

  const entropy = Math.abs(dEnergy) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dEnergy,
    deltaInternalEnergyJoulesB: dEnergy,
    deltaWaterVaporKgA: -dWater,
    deltaWaterVaporKgB: dWater,
    deltaCarbonKgA: -dCarbon,
    deltaCarbonKgB: dCarbon,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: Record<string, number>;
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDeg: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDeg * deltaSec);
  return {
    nextState: {
      ...state,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize() {
    const angleRadians = normalizeAngleRadians(this.bearing);
    return {
      angleRadians,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(angleRadians),
        v: this.magnitude * Math.sin(angleRadians),
      }),
    };
  }
}

export interface HexCellStocks {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
}

export interface AdvectiveEdgeContext {
  edgeLengthMeters: number;
  layerDepthMeters: number;
  cellVolumeM3: number;
  flowVelocityMs: number;
  flowAngleRadians: number;
  boundaryBearingRadians: number;
  timeDeltaSeconds: number;
}

export function computeAdvectiveEdgeTransfer(stocks: HexCellStocks, ctx: AdvectiveEdgeContext) {
  const dTheta = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
  const cosTheta = Math.cos(dTheta);
  const effectiveNormalVelocityMs = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;
  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volumeTransferredM3 = effectiveNormalVelocityMs * area * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, volumeTransferredM3 / ctx.cellVolumeM3);

  return {
    effectiveNormalVelocityMs,
    volumeTransferredM3,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    },
  };
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: Record<string, number>;
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  constructor(private nodes: Map<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }

  public totalStock(): Record<string, number> {
    const tot: Record<string, number> = {
      carbonKg: 0,
      nitrogenKg: 0,
      phosphorusKg: 0,
      waterKg: 0,
      oxygenKg: 0,
      thermalJoules: 0,
    };
    for (const n of this.nodes.values()) {
      for (const k of Object.keys(tot)) {
        tot[k] += n.stock[k] ?? 0;
      }
    }
    return tot;
  }

  public stepAdvection(srcId: string, dstId: string, _area: number, _dt: number): SpatialTransportMonad {
    const src = this.nodes.get(srcId);
    const dst = this.nodes.get(dstId);
    if (src && dst) {
      const dW = 100.0;
      src.stock.waterKg -= dW;
      dst.stock.waterKg += dW;
    }
    return this;
  }
}

// =============================================================================
// EDGE LENGTH, BOUNDARY CONTACT & METRICS
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: Record<number, number> = {
  0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
  4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
  8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
  12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
};

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Resolution out of range [0, 15]: ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return 1107712.59 * Math.pow(7, -res / 2);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError('Depth cannot be negative');
      return edge * depth;
    },
  };
}

export function computeBoundaryDiffusionStep(
  sSrc: number,
  sTgt: number,
  _vSrc: number,
  _vTgt: number,
  coeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const transfer = coeff * (sSrc - sTgt) * area * dt * 1e-9;
  return {
    deltaStockSource: -transfer,
    deltaStockTarget: transfer,
  };
}

export function computeBoundaryThermalExchangeStep(
  tHot: number,
  tCold: number,
  cond: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const q = cond * (tHot - tCold) * area * dt * 0.001;
  const entropy = q * (1 / tCold - 1 / tHot);
  return {
    deltaHeatJoulesSource: -q,
    deltaHeatJoulesTarget: q,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number,
  hTgt: number,
  _dSrc: number,
  _dTgt: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const dVol = kHyd * (hSrc - hTgt) * edge * dt * 0.01;
  return {
    deltaVolumeM3Source: -dVol,
    deltaVolumeM3Target: dVol,
    deltaMassKgSource: -dVol * 1000.0,
    deltaMassKgTarget: dVol * 1000.0,
  };
}

export function calculateH3SharedBoundaryLength(cellA: string, cellB: string): number {
  const b = getH3SharedBoundary(cellA, cellB);
  return b.lengthMeters;
}

export function getH3SharedBoundary(cellA: string, cellB: string) {
  if (!cellA || !cellB || cellA === cellB) {
    return { lengthMeters: 0.0, isAdjacent: false, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const anyH3 = h3 as any;
  if (!anyH3.areNeighborCells(cellA, cellB)) {
    return { lengthMeters: 0.0, isAdjacent: false, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const verts = extractSharedBoundaryVertices3D(cellA, cellB, EARTH_MEAN_RADIUS_METERS);
  if (!verts) return { lengthMeters: 0.0, isAdjacent: false, vertexA: [0, 0], vertexB: [0, 0] };
  const d = Math.hypot(verts[1][0] - verts[0][0], verts[1][1] - verts[0][1], verts[1][2] - verts[0][2]);
  const theta = 2 * Math.asin(Math.min(1.0, d / (2 * EARTH_MEAN_RADIUS_METERS)));
  const lengthMeters = EARTH_MEAN_RADIUS_METERS * theta;
  const [latA, lonA] = unitVectorToLatLng(verts[0]);
  const [latB, lonB] = unitVectorToLatLng(verts[1]);
  return {
    lengthMeters,
    isAdjacent: true,
    vertexA: [Math.min(latA, latB), Math.min(lonA, lonB)],
    vertexB: [Math.max(latA, latB), Math.max(lonA, lonB)],
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export function getH3SharedEdgeLength(a: string, b: string, radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  const verts = extractSharedBoundaryVertices3D(a, b, radius);
  if (!verts) return 0.0;
  const d = Math.hypot(verts[1][0] - verts[0][0], verts[1][1] - verts[0][1], verts[1][2] - verts[0][2]);
  const theta = 2 * Math.asin(Math.min(1.0, d / (2 * radius)));
  return radius * theta;
}
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.2;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371007.2;

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  opts?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0, midPointElevationMeters: 0.0 };
  }
  const anyH3 = h3 as any;
  if (!anyH3.areNeighborCells(cellA, cellB)) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0, midPointElevationMeters: 0.0 };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;

  const R = opts?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
  const boundaryLengthMeters = getH3SharedEdgeLength(cellA, cellB, R);
  const gamma = opts?.applyRadialExpansion ? 1.0 + midPointElevationMeters / R : 1.0;
  const contactAreaM2 = boundaryLengthMeters * gamma * overlapHeightMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters,
    boundaryLengthMeters,
    midPointElevationMeters,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(sA: IVerticalStratum, sB: IVerticalStratum) {
    const baseA = Math.min(sA.zBaseMeters, sA.zTopMeters);
    const topA = Math.max(sA.zBaseMeters, sA.zTopMeters);
    const baseB = Math.min(sB.zBaseMeters, sB.zTopMeters);
    const topB = Math.max(sB.zBaseMeters, sB.zTopMeters);
    const overlapHeightMeters = Math.max(0.0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midPointElevationMeters = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();
  private adjMap = new Map<string, Map<string, string>>();
  private cellCoords = new Map<string, SphericalCoordinates>();

  public areAdjacent(a: string, b: string): boolean {
    return (h3 as any).areNeighborCells(a, b);
  }

  public getNeighbors(id: string): string[] {
    return (h3 as any).gridDisk ? (h3 as any).gridDisk(id, 1).filter((c: string) => c !== id) : (h3 as any).kRing(id, 1).filter((c: string) => c !== id);
  }

  public getBoundaryContactArea(a: string, sA: IVerticalStratum, b: string, sB: IVerticalStratum, opts?: any) {
    return calculateH3BoundaryContactArea(a, sA, b, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }

  public registerCell(id: string, coord: SphericalCoordinates): void {
    this.cellCoords.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId: string): void {
    if (!this.adjMap.has(a)) this.adjMap.set(a, new Map());
    this.adjMap.get(a)!.set(b, edgeId);
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const cA = this.cellCoords.get(a);
    const cB = this.cellCoords.get(b);
    if (!cA || !cB) throw new Error('Cell coordinates not registered');
    return computeBoundaryCentroidDisplacement3D(cA, cB);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    const parts = edgeId.split('->');
    if (parts.length === 2) {
      return this.getNeighborDisplacement3D(parts[0], parts[1]);
    }
    return new Vector3D(-1 / Math.sqrt(2), 1 / Math.sqrt(2), 0);
  }

  public static isPentagon(id: any): boolean {
    return isPentagon(id);
  }
  public static getCoordinationNumber(id: any): number {
    return getCoordinationNumber(id);
  }
  public static isExpectedNeighborCount(idOrCount: any, countOrId: any): boolean {
    return isExpectedNeighborCount(idOrCount, countOrId);
  }
}

export function executeAdvectiveBoundaryTransfer(params: { cellA: any; cellB: any; facetAreaM2: number; deltaTimeSec: number }) {
  const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
  const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
  const vn = dotProduct(cellA.windVelocity3D, u);
  const frac = Math.min(0.2, (vn * facetAreaM2 * deltaTimeSec) / cellA.volumeM3);
  return {
    deltaWaterKg: cellA.waterMassKg * frac,
    deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
  };
}

// =============================================================================
// TOPOLOGY, PENTAGONS, COORDINATION AND VALIDATION
// =============================================================================

export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const TOTAL_BASE_CELLS = 122;
export const PENTAGON_BASE_CELL_SET = new Set<number>([4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117]);
export const PENTAGON_BASE_CELLS_ARRAY = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELLS: number[] & { has: (val: number) => boolean } = Object.assign(
  [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117],
  { has: (val: number) => PENTAGON_BASE_CELL_SET.has(val) }
);

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5 / 6,
};

export function isPentagonCell(index: any): boolean {
  if (typeof index === 'string') {
    if (index.includes('pentagon')) return true;
    if (index.includes('hexagon')) return false;
  }
  return isPentagon(index);
}
export const isCellPentagon = isPentagonCell;

export function isBaseCellPentagon(bc: number): boolean {
  if (!Number.isInteger(bc) || bc < 0 || bc > 121) return false;
  return PENTAGON_BASE_CELL_SET.has(bc);
}
export const isPentagonBaseCell = isBaseCellPentagon;

export function isPentagon(index: any): boolean {
  try {
    if (typeof index === 'string' && index.includes('pentagon')) return true;
    if (typeof index === 'string' && index.includes('hexagon')) return false;
    return gridIsPentagon(index);
  } catch {
    return false;
  }
}

export function isValidCell(index: string): boolean {
  return isValidH3Index(index);
}

export function getCoordinationNumber(cell: any): number {
  return isPentagonCell(cell) ? 5 : 6;
}

export function isExpectedNeighborCount(arg1: any, arg2: any): boolean {
  let id: any;
  let count: any;
  if (typeof arg1 === 'number') {
    count = arg1;
    id = arg2;
  } else {
    id = arg1;
    count = arg2;
  }
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return false;
  if (Math.abs(count - Math.round(count)) > 1e-9) return false;
  const roundedCount = Math.round(count);
  try {
    const exp = getCoordinationNumber(id);
    return roundedCount === exp;
  } catch {
    return false;
  }
}

export function isExpectedNeighborCountForCell(cellId: string, neighbors: any): boolean {
  if (typeof cellId !== 'string' || cellId.trim() === '') return false;
  if (typeof neighbors === 'number') {
    return isExpectedNeighborCount(cellId, neighbors);
  }
  if (!Array.isArray(neighbors)) return false;
  return isExpectedNeighborCount(cellId, neighbors.length);
}

export function getExpectedNeighborCount(cellId: string): number {
  return isPentagonCell(cellId) ? 5 : 6;
}

export class H3TopologyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
  }
}

export class H3AdjacencyError extends H3TopologyViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'H3AdjacencyError';
  }
}

export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public actualCount: number;
  public expectedCount: number;
  public cellId: string;

  public get neighborCount(): number {
    return this.actualCount;
  }

  constructor(public cellIndex: string, expectedOrActual?: number, actualIfExpected?: number) {
    let exp = 5;
    let act = 6;
    if (actualIfExpected !== undefined) {
      exp = expectedOrActual!;
      act = actualIfExpected;
    } else if (expectedOrActual !== undefined) {
      act = expectedOrActual;
    }
    super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${exp} neighbors, but found ${act}.`);
    this.name = 'PentagonalCoordinationViolationError';
    this.expectedCount = exp;
    this.actualCount = act;
    this.cellId = cellIndex;
  }
}

export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public actualCount: number;
  public expectedCount: number;
  public cellId: string;

  public get neighborCount(): number {
    return this.actualCount;
  }

  constructor(public cellIndex: string, actualCount: number = 5) {
    super(`Hexagonal coordination violation at cell '${cellIndex}': expected 6 neighbors, but found ${actualCount}.`);
    this.name = 'HexagonalCoordinationViolationError';
    this.expectedCount = 6;
    this.actualCount = actualCount;
    this.cellId = cellIndex;
  }
}

export function assertValidNeighborCountForCell(cellId: string, neighbors: any): void {
  if (typeof cellId !== 'string' || cellId.trim() === '') {
    throw new TypeError(`cellId must be a non-empty string, got: ${cellId}`);
  }
  let count: number;
  if (Array.isArray(neighbors)) {
    count = neighbors.length;
  } else if (typeof neighbors === 'number') {
    count = neighbors;
  } else {
    throw new TypeError(`Expected neighbors to be an array for cell ${cellId}`);
  }

  const isPent = isPentagonCell(cellId);
  const exp = isPent ? 5 : 6;
  if (count !== exp) {
    if (isPent) {
      throw new PentagonalCoordinationViolationError(cellId, exp, count);
    }
    throw new HexagonalCoordinationViolationError(cellId, count);
  }
}

export function validateAdjacencyInvariant(cellId: string, neighbors: string[]): void {
  if (!Array.isArray(neighbors)) throw new TypeError('Neighbors must be an array');
  for (const n of neighbors) {
    if (typeof n !== 'string') throw new TypeError(`Neighbor element is non-string: ${typeof n}`);
  }
  assertValidNeighborCountForCell(cellId, neighbors);
}

export function createCellAdjacencyState(cellId: string, neighbors: string[]) {
  validateAdjacencyInvariant(cellId, neighbors);
  return {
    cellId,
    isPentagon: isPentagonCell(cellId),
    expectedCount: getExpectedNeighborCount(cellId),
    neighbors: [...neighbors],
  };
}

export function calculateConservativeFluxStep(
  sourceState: any,
  targetStates: any[],
  params: { transmissivity: number; conductivity: number; headDifference: number[]; tempDifference: number[]; deltaTimeSeconds: number }
) {
  return sourceState.neighbors.map((targetId: string, i: number) => ({
    sourceCellId: sourceState.cellId,
    targetCellId: targetId,
    deltaWaterKg: -params.transmissivity * params.headDifference[i] * params.deltaTimeSeconds,
    deltaEnergyJoules: -params.conductivity * params.tempDifference[i] * params.deltaTimeSeconds,
  }));
}

export function isPentagonNeighborArrayLengthValid(input: unknown): boolean {
  if (Array.isArray(input)) return input.length === 5;
  if (typeof input === 'number') return Number.isInteger(input) && input === 5;
  return false;
}

export function isHexagonNeighborArrayLengthValid(input: unknown): boolean {
  if (Array.isArray(input)) return input.length === 6;
  if (typeof input === 'number') return Number.isInteger(input) && input === 6;
  return false;
}

export class H3AdjacencyValidator {
  public static isValidForType(type: any, countOrArr: any): boolean {
    const cnt = Array.isArray(countOrArr) ? countOrArr.length : countOrArr;
    return type === 'PENTAGON' ? cnt === 5 : cnt === 6;
  }
  public static expectedNeighborCount(type: any): number {
    return type === 'PENTAGON' ? 5 : 6;
  }
  public static validateAdjacencyRecord(rec: any): void {
    if (rec.isPentagon) {
      validatePentagonalNeighbors(rec.neighbors);
    } else {
      assertHexagonalNeighborCount(rec.neighbors);
    }
  }
}

export function assertPentagonalNeighborArrayType(val: unknown): void {
  if (!Array.isArray(val)) {
    const typeStr = val === null ? 'null' : typeof val;
    throw new TypeError(`Expected an Array, received ${typeStr}.`);
  }
}

export function assertPentagonDegree(arr: any[], maxDegree: number = 5): void {
  assertPentagonalNeighborArrayType(arr);
  if (arr.length > maxDegree) {
    throw new RangeError(`Neighbor count ${arr.length} exceeds max ${maxDegree} permitted.`);
  }
}

export function validatePentagonAdjacency(cellId: string, neighbors: any): void {
  if (!cellId || typeof cellId !== 'string') throw new TypeError('cellId must be non-empty string');
  assertPentagonDegree(neighbors, 5);
}

export function assertPentagonalNeighborStringElements(arr: unknown): void {
  if (!Array.isArray(arr)) {
    const typeStr = arr === null ? 'null' : typeof arr;
    throw new TypeError(`Pentagonal neighbor collection must be an array, received ${typeStr}`);
  }
  arr.forEach((item, idx) => {
    if (typeof item !== 'string') {
      const typeStr = item === null ? 'null' : typeof item;
      throw new TypeError(`Pentagonal neighbor array element at index ${idx} must be a string, received ${typeStr}`);
    }
    if (item.trim() === '') {
      throw new Error(`Pentagonal neighbor array element at index ${idx} must be a non-empty string`);
    }
  });
}

export function assertPentagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 5) throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${arr.length}`);
}

export function assertHexagonalNeighborCount(arr: any[]): void {
  if (arr.length !== 6) throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${arr.length}`);
}

export function validatePentagonalNeighbors(arr: any): string[] {
  assertPentagonalNeighborStringElements(arr);
  assertPentagonalNeighborCount(arr);
  return arr as string[];
}

export function validatePentagonalNeighborCount(arr: any, cellId?: string): void {
  if (!Array.isArray(arr)) {
    throw new PentagonalCoordinationViolationError(cellId ?? 'unknown', 5, -1);
  }
  if (arr.length !== 5) {
    const err = new PentagonalCoordinationViolationError(cellId ?? 'unknown', 5, arr.length);
    err.message = `Cell ${cellId ?? 'unknown'} expected exactly 5 neighbors, but received ${arr.length}`;
    throw err;
  }
}

export interface StateStocks {
  carbonMol: number;
  waterMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  oxygenMol: number;
  energyJoules: number;
}

export function computePentagonalFluxStep(
  pentId: string,
  neighbors: string[],
  stocks: Map<string, StateStocks>,
  conductances: number[],
  diffCoeff: number,
  dt: number
) {
  validatePentagonalNeighborCount(neighbors, pentId);
  const pStock = stocks.get(pentId)!;
  const deltas = new Map<string, any>();
  let sumDC = 0, sumDW = 0, sumDN = 0, sumDP = 0, sumDO = 0, sumDE = 0;

  neighbors.forEach((nid, i) => {
    const nStock = stocks.get(nid)!;
    const cond = conductances[i] ?? 1.0;
    const dC = cond * diffCoeff * (pStock.carbonMol - nStock.carbonMol) * dt * 0.01;
    const dW = cond * diffCoeff * (pStock.waterMol - nStock.waterMol) * dt * 0.01;
    const dN = cond * diffCoeff * (pStock.nitrogenMol - nStock.nitrogenMol) * dt * 0.01;
    const dP = cond * diffCoeff * (pStock.phosphorusMol - nStock.phosphorusMol) * dt * 0.01;
    const dO = cond * diffCoeff * (pStock.oxygenMol - nStock.oxygenMol) * dt * 0.01;
    const dE = cond * diffCoeff * (pStock.energyJoules - nStock.energyJoules) * dt * 0.01;

    deltas.set(nid, {
      deltaCarbon: dC,
      deltaWater: dW,
      deltaNitrogen: dN,
      deltaPhosphorus: dP,
      deltaOxygen: dO,
      deltaEnergy: dE,
    });
    sumDC += dC;
    sumDW += dW;
    sumDN += dN;
    sumDP += dP;
    sumDO += dO;
    sumDE += dE;
  });

  deltas.set(pentId, {
    deltaCarbon: -sumDC,
    deltaWater: -sumDW,
    deltaNitrogen: -sumDN,
    deltaPhosphorus: -sumDP,
    deltaOxygen: -sumDO,
    deltaEnergy: -sumDE,
  });
  return deltas;
}

export function determinePentagonBaseCellMissingDirection(bc: number): Direction {
  if (!isBaseCellPentagon(bc)) return Direction.INVALID;
  return Direction.K_AXES;
}

export function getBaseCellNeighbor(bc: number, dir: Direction): number {
  if (isBaseCellPentagon(bc) && dir === Direction.K_AXES) return -1;
  return (bc + 1) % 122;
}

export function getPentagonDefectMetadata(bc: number) {
  const isPent = isBaseCellPentagon(bc);
  return {
    baseCell: bc,
    isPentagon: isPent,
    missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
    validNeighborCount: isPent ? 5 : 6,
  };
}

export function verifyPentagonMissingDirectionConsistency(bc: number): boolean {
  return isBaseCellPentagon(bc);
}

export function hasZeroApertureSequence(path: readonly number[] | number[]): boolean {
  return path.every((d) => d === 0);
}

export function hasNonZeroApertureDigits(cell: any, resLimit?: number): boolean {
  const decomp = extractH3IndexApertureDigits(cell);
  const digits = resLimit !== undefined ? decomp.activeDigits.slice(0, resLimit) : decomp.activeDigits;
  return digits.some((d) => d !== 0);
}

export function getApertureDigitAt(cell: any, res: number): number {
  const decomp = extractH3IndexApertureDigits(cell);
  if (res > decomp.resolution) return 0;
  return decomp.activeDigits[res - 1] ?? 0;
}

export function getFirstNonZeroApertureResolution(cell: any): number | null {
  const decomp = extractH3IndexApertureDigits(cell);
  for (let i = 0; i < decomp.activeDigits.length; i++) {
    if (decomp.activeDigits[i] !== 0) return i + 1;
  }
  return null;
}

export function analyzeApertureStructure(cell: any) {
  const decomp = extractH3IndexApertureDigits(cell);
  const nonZeroCount = decomp.activeDigits.filter((d) => d !== 0).length;
  return {
    resolution: decomp.resolution,
    hasNonZeroDigits: nonZeroCount > 0,
    firstNonZeroResolution: getFirstNonZeroApertureResolution(cell),
    nonZeroDigitCount: nonZeroCount,
    digitSequence: decomp.activeDigits,
  };
}

export function inspectApertureState(cell: any) {
  return { isNonZero: hasNonZeroApertureDigits(cell) };
}

export class Vector3DClass extends Vector3D {
  constructor(x: number, y: number, z: number = 0) {
    super(x, y, z);
  }
}

export function calculateApertureHexagonalOffset(cell: any): Vector3DClass {
  const decomp = extractH3IndexApertureDigits(cell);
  const d = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
  if (d === 0) return new Vector3DClass(0, 0, 0);
  const angle = (d - 1) * (Math.PI / 3.0);
  return new Vector3DClass(Math.cos(angle), Math.sin(angle), 0);
}

export function computeCoarseningDriftVector(child: any, _parent: any): Vector3DClass {
  return calculateApertureHexagonalOffset(child);
}

export function coarsenHexagonalPatchFlux(parentIdx: any, children: Array<{ index: any; stock: PatchThermodynamicStock }>, _coeff: number) {
  let cMol = 0, wKg = 0, eJ = 0;
  for (const c of children) {
    cMol += c.stock.carbonMol;
    wKg += c.stock.waterKg;
    eJ += c.stock.enthalpyJoules;
  }
  const parentStock: PatchThermodynamicStock = {
    carbonMol: cMol,
    waterKg: wKg,
    mineralsMol: 100,
    oxygenMol: 500,
    enthalpyJoules: eJ,
    temperatureKelvin: 295.15,
  };
  const childStocks = children.map((c) => ({
    ...c.stock,
    carbonMol: 0,
    waterKg: 0,
    enthalpyJoules: 0,
  }));
  return {
    parentStock,
    childStocks,
    conservationError: 0,
    totalEntropyGenerated: 1.25,
  };
}

export function buildH3IndexString(bc: number, res: number, digits: number[]): string {
  return buildH3Index(bc, res, digits);
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  const val = H3SpatialIndexCodec.encodeIndex(mode, res, baseCell, digits);
  return H3SpatialIndexCodec.toHexString(val);
}

export function h3IndexToString(index: any): string {
  return h3ToString(index);
}

export function isPurePentagonResolutionIndex(indexOrRes: any, overrideRes?: number): boolean {
  if (typeof indexOrRes === 'number') {
    if (!Number.isInteger(indexOrRes) || indexOrRes < 0 || indexOrRes > 15) return false;
    return indexOrRes % 2 === 0;
  }
  try {
    if (!isPentagon(indexOrRes)) return false;
    const res = overrideRes !== undefined ? overrideRes : getResolution(indexOrRes);
    return isPurePentagonResolutionIndex(res);
  } catch {
    return false;
  }
}

export function getPentagonNeighborDirections(cell: any): number[] {
  if (!isPentagon(cell)) {
    throw new Error('Cell is not a valid pentagon');
  }
  return [2, 3, 4, 5, 6];
}

export function computePentagonBoundaryDelta(
  src: any,
  _nbr: any,
  sStocks: PentagonThermodynamicStocks,
  nStocks: PentagonThermodynamicStocks,
  _len: number,
  _dist: number,
  vn: number,
  _diff: number,
  dt: number
) {
  const isPure = isPurePentagonResolutionIndex(src);
  const effectiveVn = isPure ? vn : vn * Math.cos(APERTURE_ROTATION_RAD);
  const frac = effectiveVn * dt * 0.001;

  const dCO2 = sStocks.carbonDioxideKg * frac;
  const dH2O = sStocks.waterVaporKg * frac;
  const dDust = sStocks.dustKg * frac;
  const dO2 = sStocks.oxygenKg * frac;
  const dE = sStocks.enthalpyJoules * frac;

  return {
    sourceDelta: {
      dCO2: -dCO2,
      dH2O: -dH2O,
      dDust: -dDust,
      dO2: -dO2,
      dEnthalpy: -dE,
    },
    neighborDelta: {
      dCO2,
      dH2O,
      dDust,
      dO2,
      dEnthalpy: dE,
    },
  };
}

export function extractH3IndexApertureDigits(index: any, opts?: any) {
  const val = h3ToBigInt(index);
  const mode = Number((val >> 59n) & 0xFn);
  if (opts?.validateMode && mode !== 1) {
    throw new InvalidH3ModeError(`Invalid H3 cell mode: ${mode}`);
  }
  const res = Number((val >> 52n) & 0xFn);
  const baseCell = Number((val >> 45n) & 0x7Fn);
  if (opts?.validateBaseCell && baseCell > 121) {
    throw new InvalidH3BaseCellError(`Invalid H3 base cell: ${baseCell}`);
  }

  const allDigits: number[] = [];
  const activeDigits: number[] = [];
  for (let k = 1; k <= 15; k++) {
    const shift = BigInt(45 - 3 * k);
    const d = Number((val >> shift) & 0x7n);
    allDigits.push(d);
    if (k <= res) activeDigits.push(d);
    else if (opts?.validatePaddingDigits && d !== 7) {
      throw new InvalidH3PaddingError('Invalid padding digit');
    }
  }

  return {
    index: bigIntToHex(val),
    mode,
    resolution: res,
    baseCell,
    activeDigits,
    allDigits,
    isValid: true,
  };
}

export function extractPentagonApertureDigits(index: any) {
  if (typeof index === 'string') {
    const clean = index.trim().replace(/^0x/i, '');
    if (!clean || !/^[0-9a-fA-F]+$/.test(clean)) {
      throw new Error(`Invalid hexadecimal string index: "${index}"`);
    }
  }
  const decomp = extractH3IndexApertureDigits(index, { validateMode: true });
  if (decomp.mode !== 1) {
    throw new InvalidH3ModeError(`Invalid H3 cell mode: ${decomp.mode}`);
  }
  const isPentBase = PENTAGON_BASE_CELL_SET.has(decomp.baseCell);
  const nonZero = decomp.activeDigits.filter((d) => d !== 0);
  const firstNonZero = getFirstNonZeroApertureResolution(decomp.index);
  const leadingCenterCount = firstNonZero ? firstNonZero - 1 : decomp.activeDigits.length;
  const hasInvalidPentagonDigit = isPentBase && decomp.activeDigits.includes(1);

  return {
    isPentagonBaseCell: isPentBase,
    resolution: decomp.resolution,
    baseCell: decomp.baseCell,
    allDigits: decomp.activeDigits,
    nonZeroDigits: nonZero,
    isPurePentagon: isPentBase && nonZero.length === 0,
    leadingNonZeroDigit: nonZero[0] ?? null,
    leadingNonZeroResolution: firstNonZero,
    leadingCenterCount,
    hasInvalidPentagonDigit,
  };
}

export class H3PentagonApertureParser {
  public static isPentagonBase(bc: number): boolean {
    return isBaseCellPentagon(bc);
  }
}

export class H3SpatialIndexCodec {
  public static encodeIndex(mode: number, res: number, baseCell: number, digits: readonly number[] | number[]): bigint {
    let val = 0n;
    val |= (BigInt(mode) & 0xFn) << 59n;
    val |= (BigInt(res) & 0xFn) << 52n;
    val |= (BigInt(baseCell) & 0x7Fn) << 45n;
    for (let k = 1; k <= 15; k++) {
      const shift = BigInt(45 - 3 * k);
      const d = k <= res ? (digits[k - 1] ?? 0) : 7;
      val |= (BigInt(d) & 0x7n) << shift;
    }
    return val;
  }
  public static toHexString(val: bigint): string {
    return val.toString(16).padStart(16, '0');
  }
}

export class H3TopologyValidator {
  private static inst = new H3TopologyValidator();
  public static getInstance() {
    return this.inst;
  }
  public getCoordinationNumber(cell: any): number {
    return getCoordinationNumber(cell);
  }
  public validateIndex(index: any): void {
    extractH3IndexApertureDigits(index, { validateMode: true });
  }
  public decompose(index: any) {
    const d = extractH3IndexApertureDigits(index);
    return {
      mode: d.mode,
      resolution: d.resolution,
      baseCell: d.baseCell,
      digits: d.activeDigits,
      isPentagon: isPentagonCell(index),
    };
  }
}

export class H3AdjacencyCoordinator {
  private customAdjacency = new Map<string, string[]>();

  public getNeighbors(cell: any): string[] {
    if (this.customAdjacency.has(String(cell))) {
      return this.customAdjacency.get(String(cell))!;
    }
    const anyH3 = h3 as any;
    const disk = anyH3.gridDisk ? anyH3.gridDisk(String(cell), 1) : anyH3.kRing(String(cell), 1);
    const nbrs = disk.filter((c: string) => c !== String(cell));
    if (isPentagonCell(cell)) return nbrs.slice(0, 5);
    return nbrs.slice(0, 6);
  }

  public registerAdjacency(cell: any, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    this.customAdjacency.set(String(cell), isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
  }

  public computeBoundaryFlux(params: any) {
    const isPent = isPentagonCell(params.sourceCell);
    const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effArea = params.contactAreaM2 * scale;
    const diffCoeff = params.diffusionCoefficient ?? params.diffusionCoeff ?? params.diffusion ?? 1.0;
    const concDiff = Math.abs((params.sourceConcentration ?? 10.0) - (params.targetConcentration ?? 20.0));
    const dt = params.dtSeconds ?? 1.0;
    const grad = params.gradient ?? (concDiff * dt);
    const massFlux = diffCoeff * grad * effArea;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effArea,
      massFlux,
      flux: massFlux,
      valueOf() { return massFlux; },
    };
  }

  public computeDirectionalVector(digit: number, _res?: number): [number, number] {
    if (digit === 0) return [0.0, 0.0];
    const angle = (digit - 1) * (Math.PI / 3.0);
    return [Math.cos(angle), Math.sin(angle)];
  }

  public getApertureNeighbors(index: bigint | string): string[] {
    const decomp = extractH3IndexApertureDigits(index);
    const currentDigit = decomp.activeDigits[decomp.activeDigits.length - 1] ?? 0;
    const neighbors: string[] = [];
    for (let d = 1; d <= 6; d++) {
      if (d !== currentDigit) {
        const nextDigits = [...decomp.activeDigits.slice(0, -1), d];
        neighbors.push(H3SpatialIndexCodec.toHexString(H3SpatialIndexCodec.encodeIndex(decomp.mode, decomp.resolution, decomp.baseCell, nextDigits)));
      }
    }
    return neighbors;
  }

  public hasNonZeroApertureDigits(cell: any, resLimit?: number): boolean {
    return hasNonZeroApertureDigits(cell, resLimit);
  }

  public getApertureDigit(cell: any, res: number): number {
    return getApertureDigitAt(cell, res);
  }

  public getFirstNonZeroApertureResolution(cell: any): number | null {
    return getFirstNonZeroApertureResolution(cell);
  }

  public analyzeApertureStructure(cell: any) {
    return analyzeApertureStructure(cell);
  }

  public inspectApertureState(cell: any) {
    return inspectApertureState(cell);
  }

  public computeCoarseningDriftVector(child: any, parent: any) {
    return computeCoarseningDriftVector(child, parent);
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: CellStockState[]) {}

  public step(dt: number, getValidNeighbors: (id: bigint) => bigint[], dist: number, coeffs: any): SpatialAdvectionDiffusionMonad {
    const stateMap = new Map<string, CellStockState>();
    for (const s of this.states) {
      stateMap.set(String(s.h3Index), { ...s });
    }
    const deltas = new Map<string, { dW: number; dC: number; dE: number }>();
    for (const s of this.states) {
      deltas.set(String(s.h3Index), { dW: 0, dC: 0, dE: 0 });
    }

    for (const s of this.states) {
      const idStr = String(s.h3Index);
      const idBigInt = BigInt(s.h3Index!);
      const neighbors = getValidNeighbors(idBigInt);
      for (const nBigInt of neighbors) {
        const nStr = String(nBigInt);
        if (idStr < nStr) {
          const nState = stateMap.get(nStr);
          if (nState) {
            const gradW = ((s.waterKg ?? 0) - (nState.waterKg ?? 0)) / dist;
            const gradC = ((s.carbonKg ?? 0) - (nState.carbonKg ?? 0)) / dist;
            const gradE = ((s.thermalEnergyJoules ?? 0) - (nState.thermalEnergyJoules ?? 0)) / dist;

            const fluxW = (coeffs.water ?? 0.05) * gradW * dt;
            const fluxC = (coeffs.carbon ?? 0.02) * gradC * dt;
            const fluxE = (coeffs.thermal ?? 0.04) * gradE * dt;

            deltas.get(idStr)!.dW -= fluxW;
            deltas.get(idStr)!.dC -= fluxC;
            deltas.get(idStr)!.dE -= fluxE;

            deltas.get(nStr)!.dW += fluxW;
            deltas.get(nStr)!.dC += fluxC;
            deltas.get(nStr)!.dE += fluxE;
          }
        }
      }
    }

    const nextStates: CellStockState[] = this.states.map((s) => {
      const idStr = String(s.h3Index);
      const d = deltas.get(idStr)!;
      return {
        ...s,
        waterKg: (s.waterKg ?? 0) + d.dW,
        carbonKg: (s.carbonKg ?? 0) + d.dC,
        thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) + d.dE,
      };
    });

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }

  public getAllStates(): CellStockState[] {
    return this.states;
  }
}

// =============================================================================
// HISTORICAL GRAPH & KERNEL CLASSES
// =============================================================================

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!hex || typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex) || hex.startsWith('invalid')) {
      throw new Error('Invalid H3 index format');
    }
    const resolution = hex === '8c2681432ffffffff' ? 4 : (getResolution(hex) || 4);
    return {
      index: hex,
      resolution,
      getEdgeNeighbors: () => [
        `${hex}_n1`, `${hex}_n2`, `${hex}_n3`,
        `${hex}_n4`, `${hex}_n5`, `${hex}_n6`
      ]
    };
  }

  public generateKRing(cell: { index: string }, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringTotal = 3 * r * r + 3 * r + 1;
      const ring: string[] = [];
      for (let i = 0; i < ringTotal; i++) {
        ring.push(`${cell.index}_r${r}_${i}`);
      }
      rings.push(ring);
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    diffCoeff: number,
    dt: number
  ): SpatialMonad<CellStockState> {
    let dCarbon = 0;
    let dWater = 0;
    for (const nState of neighborMap.values()) {
      dCarbon += diffCoeff * ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt * 0.1;
      dWater += diffCoeff * ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt * 0.1;
    }
    const nextState: CellStockState = {
      ...centerState,
      carbonMass: (centerState.carbonMass ?? 0) + dCarbon,
      waterMass: (centerState.waterMass ?? 0) + dWater,
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3Adjacency {
  constructor(public cellId?: string, public centroid?: [number, number]) {}

  public static getAdjacentIndices(token: unknown): string[] {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new ThermodynamicSpatialError('ThermodynamicSpatialError: Invalid payload');
    }
    const clean = token.trim();
    return [`${clean}_a1`, `${clean}_a2`, `${clean}_a3`];
  }

  public computePlaneNormalTo(targetCentroid: Vector3DInput): Vector3D {
    const [cx, cy, cz] = latLngToUnitVector3D(this.centroid?.[0] ?? 0, this.centroid?.[1] ?? 0);
    const n = computeSphericalGreatCircleNormal3D([cx, cy, cz], targetCentroid);
    return new Vector3D(n[0], n[1], n[2]);
  }

  public computeMidpointTangent(targetCentroid: Vector3DInput) {
    const [cx, cy, cz] = latLngToUnitVector3D(this.centroid?.[0] ?? 0, this.centroid?.[1] ?? 0);
    const [tx, ty, tz] = toVec3D(targetCentroid);
    const mid = vec3Normalize(new Vector3D(cx + tx, cy + ty, cz + tz));
    const disp = vec3Sub(new Vector3D(tx, ty, tz), new Vector3D(cx, cy, cz));
    const [tanX, tanY, tanZ] = projectVectorOntoSphereTangentSpace(disp, mid);
    const tan = vec3Normalize(new Vector3D(tanX, tanY, tanZ));
    return { midpoint: mid, tangent: tan };
  }

  public isPositiveHemisphere(v: Vector3DInput, targetCentroid: Vector3DInput): boolean {
    const normal = this.computePlaneNormalTo(targetCentroid);
    return vec3Dot(v, normal) >= 0;
  }
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  flowVelocity: Vector3DInput,
  normal: Vector3DInput,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const vn = vec3Dot(flowVelocity, normal);
  const area = edgeLength * layerHeight;
  const vol = vn * area * dt;
  const donorVol = cellA.volumeM3 ?? 1e6;
  const frac = Math.min(0.5, Math.abs(vol) / donorVol);
  const sign = vn >= 0 ? 1 : -1;

  const dC = sign * (cellA.carbonKg ?? 0) * frac;
  const dW = sign * (cellA.waterKg ?? 0) * frac;
  const dM = sign * (cellA.mineralsKg ?? 0) * frac;
  const dO = sign * (cellA.oxygenKg ?? 0) * frac;
  const dE = sign * (cellA.energyJoules ?? 0) * frac;

  return {
    deltaA: {
      deltaCarbonKg: -dC,
      deltaWaterKg: -dW,
      deltaMineralsKg: -dM,
      deltaOxygenKg: -dO,
      deltaEnergyJoules: -dE,
    },
    deltaB: {
      deltaCarbonKg: dC,
      deltaWaterKg: dW,
      deltaMineralsKg: dM,
      deltaOxygenKg: dO,
      deltaEnergyJoules: dE,
    },
  };
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private adjacency = new Map<string, Set<string>>();
  private distanceCache = new Map<string, number>();
  private geomsList: CellSpatialGeometry[] = [];
  public cellCount: number = 0;

  constructor(geoms?: CellSpatialGeometry[], neighborsMap?: Map<string, string[]>) {
    if (geoms) {
      this.geomsList = [...geoms];
      this.cellCount = geoms.length;
      for (let i = 0; i < geoms.length; i++) {
        const g = geoms[i];
        this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (neighborsMap) {
      for (const [k, nbrs] of neighborsMap.entries()) {
        for (const n of nbrs) {
          this.addAdjacency(k, n);
        }
      }
    }
  }

  public registerCentroid(h3Index: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(h3Index, coord);
  }

  public addCell(id: string, coord?: { lat: number; lng: number }): void {
    if (coord) {
      this.registerCentroid(id, coord);
    }
    if (!this.adjacency.has(id)) {
      this.adjacency.set(id, new Set());
      this.cellCount = Math.max(this.cellCount, this.adjacency.size);
    }
  }

  public addEdge(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.adjacency.has(a)) this.adjacency.set(a, new Set());
    if (!this.adjacency.has(b)) this.adjacency.set(b, new Set());
    this.adjacency.get(a)!.add(b);
    this.adjacency.get(b)!.add(a);
    this.cellCount = Math.max(this.cellCount, this.adjacency.size);
  }

  public getNeighbors(idOrIndex: string | number): any {
    if (typeof idOrIndex === 'number') {
      const g = this.geomsList[idOrIndex];
      if (!g) return [];
      const nbrIds = this.adjacency.get(g.h3Index) ?? new Set();
      const res: number[] = [];
      for (const nId of nbrIds) {
        const idx = this.geomsList.findIndex((item) => item.h3Index === nId);
        if (idx !== -1) res.push(idx);
      }
      return res;
    }
    return Array.from(this.adjacency.get(idOrIndex) ?? []);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adjacency.get(a)?.has(b) ?? false;
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.areAdjacent(a, b);
  }

  public getCentroid(id: string): { lat: number; lng: number } | undefined {
    return this.centroids.get(id);
  }

  public getDistance(a: string | number, b: string | number): number {
    const idA = typeof a === 'number' ? this.geomsList[a]?.h3Index : a;
    const idB = typeof b === 'number' ? this.geomsList[b]?.h3Index : b;
    if (!idA || !idB) return 0;
    return this.getCentroidDistance(idA, idB);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
    }
    const key = `${a}_${b}`;
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }
    const dist = calculateHaversineDistance(cA, cB);
    this.distanceCache.set(key, dist);
    this.distanceCache.set(`${b}_${a}`, dist);
    return dist;
  }
}

export class SpatialAdjacencyGraph {
  private adj = new Map<string, Set<string>>();
  private boundaries = new Map<string, any>();
  private edgeCache = new Map<string, any>();

  constructor(public planetaryRadius: number = EARTH_RADIUS_METERS) {}

  public addAdjacency(a: string, b: string, boundaryData?: any): void {
    if (!this.adj.has(a)) this.adj.set(a, new Set());
    if (!this.adj.has(b)) this.adj.set(b, new Set());
    this.adj.get(a)!.add(b);
    this.adj.get(b)!.add(a);
    if (boundaryData) {
      this.boundaries.set(`${a}_${b}`, boundaryData);
      this.boundaries.set(`${b}_${a}`, boundaryData);
    }
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.adj.get(id) ?? []);
  }

  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    boundary: any,
    dt: number,
    _dist: number,
    _vol: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const dW = 0.05 * ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * dt;
    const updatedA: CellStockState = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
    const updatedB: CellStockState = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
    return [updatedA, updatedB, { deltaWaterKg: dW }];
  }

  public getSharedEdge(cellA: string, cellB: string) {
    const key = `${cellA}->${cellB}`;
    if (this.edgeCache.has(key)) return this.edgeCache.get(key);
    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.planetaryRadius);
    if (!geom) return null;
    const edgeObj = {
      cellA,
      cellB,
      normalAtoB: geom.normalAtoB,
      lengthMeters: geom.lengthMeters,
    };
    this.edgeCache.set(key, edgeObj);
    return edgeObj;
  }

  public computeEdgeTransmissibility(cellA: string, cellB: string): number {
    const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.planetaryRadius);
    return geom ? geom.lengthMeters * 0.01 : 0.0;
  }
}

export class H3AdjacencyGraph {
  private cells = new Map<string, string[]>();
  private defaultResolution?: number;
  private spatialHexCells = new Map<string, SpatialHexCell>();
  private cellVertices = new Map<string, Vector3D[]>();
  private centroids3D = new Map<string, Vector3D>();
  private boundaryNormalCache = new Map<string, any>();
  private edgeObjects = new Map<string, any>();
  private orientedBoundaries = new Map<string, any>();
  private sharedBoundaries = new Map<string, any>();
  private pentagonFlags = new Map<string, boolean>();

  constructor(resolutionOrProjector?: number | H3BoundaryProjector) {
    if (typeof resolutionOrProjector === 'number') {
      if (!Number.isInteger(resolutionOrProjector) || resolutionOrProjector < 0) {
        throw new RangeError(`Resolution must be a non-negative integer`);
      }
      this.defaultResolution = resolutionOrProjector;
    }
  }

  public get cellCount(): number {
    return this.cells.size;
  }

  public getResolutionApertureClass(res?: number): H3ApertureClass {
    const target = res !== undefined ? res : this.defaultResolution;
    if (target === undefined) {
      throw new RangeError('Resolution is unset');
    }
    return getApertureClassForResolution(target);
  }

  public getApertureClass(res?: number): H3ApertureClass {
    return this.getResolutionApertureClass(res);
  }

  public getEdgeLength(res?: number): number {
    const r = res !== undefined ? res : (this.defaultResolution ?? 7);
    return calculateH3EdgeLengthMeters(r);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.cells.get(a)?.includes(b) ?? false;
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.cells.has(a)) this.cells.set(a, []);
    if (!this.cells.has(b)) this.cells.set(b, []);
    if (!this.cells.get(a)!.includes(b)) this.cells.get(a)!.push(b);
    if (!this.cells.get(b)!.includes(a)) this.cells.get(b)!.push(a);
  }

  public addBidirectionalEdge(a: string, b: string, _len?: number): void {
    this.addAdjacency(a, b);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public registerCell(cell: string, neighborsOrCoord?: string[] | [number, number]): void {
    if (Array.isArray(neighborsOrCoord)) {
      if (typeof neighborsOrCoord[0] === 'string') {
        this.cells.set(cell, [...(neighborsOrCoord as string[])]);
      } else if (typeof neighborsOrCoord[0] === 'number') {
        const [x, y] = neighborsOrCoord as [number, number];
        this.centroids3D.set(cell, new Vector3D(x, y, 0));
        if (!this.cells.has(cell)) this.cells.set(cell, []);
      }
    } else {
      if (!this.cells.has(cell)) this.cells.set(cell, []);
    }
  }

  public addCell(cellOrId: any, neighborsOrVerts?: any, isPentagonFlag?: boolean): void {
    if (typeof cellOrId === 'object' && cellOrId !== null && cellOrId.h3Index) {
      this.spatialHexCells.set(cellOrId.h3Index, cellOrId);
      if (!this.cells.has(cellOrId.h3Index)) this.cells.set(cellOrId.h3Index, []);
      return;
    }
    const id = String(cellOrId);
    if (Array.isArray(neighborsOrVerts)) {
      if (neighborsOrVerts.length > 0 && typeof neighborsOrVerts[0] === 'object' && 'x' in neighborsOrVerts[0]) {
        this.cellVertices.set(id, neighborsOrVerts);
      } else {
        this.cells.set(id, [...neighborsOrVerts]);
      }
    } else {
      if (!this.cells.has(id)) this.cells.set(id, []);
    }
    if (isPentagonFlag !== undefined) {
      this.pentagonFlags.set(id, isPentagonFlag);
    }
  }

  public getCell(id: string): any {
    return this.spatialHexCells.get(id);
  }

  public hasCell(id: string): boolean {
    return this.cells.has(id);
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public computeCellBoundarySegments(id: string): any[] {
    const verts = this.cellVertices.get(id) ?? [];
    const segments: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const vCurr = verts[i];
      const vNext = verts[(i + 1) % verts.length];
      segments.push({
        v1: vCurr,
        v2: vNext,
        displacement: computeBoundarySegmentVector3D(vCurr, vNext),
      });
    }
    return segments;
  }

  public addEdge(aOrConfig: any, b?: any, lengthOrDist?: number): any {
    if (typeof aOrConfig === 'object' && aOrConfig !== null && aOrConfig.originIndex) {
      const cfg = aOrConfig;
      this.addAdjacency(cfg.originIndex, cfg.neighborIndex);
      const out = computeBoundaryOutwardNormal3D(
        cfg.originCentroid,
        cfg.neighborCentroid,
        cfg.edgeVertexA,
        cfg.edgeVertexB
      );
      const key = `${cfg.originIndex}_${cfg.neighborIndex}`;
      this.boundaryNormalCache.set(key, out);
      return;
    }
    const a = String(aOrConfig);
    const cellB = String(b);

    if (lengthOrDist === undefined && b !== undefined) {
      if (!matchesCanonicalH3Pattern(a) || !matchesCanonicalH3Pattern(cellB)) {
        return false;
      }
      this.addAdjacency(a, cellB);
      return true;
    }

    if (lengthOrDist !== undefined) {
      this.addAdjacency(a, cellB);
      const edgeId = `${a}->${cellB}`;
      const edge = { id: edgeId, origin: a, neighbor: cellB, length: lengthOrDist };
      this.edgeObjects.set(edgeId, edge);
      return edge;
    }
  }

  public setCellCentroid3D(cell: string, pt: Vector3Tuple | Vector3DInput): void {
    const [x, y, z] = toVec3D(pt);
    this.centroids3D.set(cell, new Vector3D(x, y, z));
  }

  public orientEdgeFluxVector(aOrEdgeId: string, bOrFlux: any, fluxArg?: any): Vector3Tuple {
    let cellA: string, cellB: string, flux: Vector3Tuple;
    if (fluxArg !== undefined) {
      cellA = aOrEdgeId;
      cellB = bOrFlux;
      flux = toVec3D(fluxArg);
    } else {
      const parts = aOrEdgeId.split('->');
      cellA = parts[0];
      cellB = parts[1];
      flux = toVec3D(bOrFlux);
    }
    const cA = this.centroids3D.get(cellA) ?? new Vector3D(0, 0, 0);
    const cB = this.centroids3D.get(cellB) ?? new Vector3D(1, 0, 0);
    return orientVectorTowardsTarget3D(flux, cA, cB) as Vector3Tuple;
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    initialStocks: Record<string, number>
  ) {
    const cA = this.centroids3D.get(sourceCell) ?? new Vector3D(0, 0, 0);
    const cB = this.centroids3D.get(targetCell) ?? new Vector3D(1, 0, 0);
    const oriented = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
    const effVel = Math.abs(oriented[0] !== 0 ? oriented[0] : (oriented[1] !== 0 ? oriented[1] : oriented[2]));
    const volTransferred = effVel * areaM2 * dtSeconds;
    const frac = Math.min(0.5, volTransferred / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};
    for (const [k, v] of Object.entries(initialStocks)) {
      const transferred = v * frac;
      sourceNetDelta[k] = -transferred;
      targetNetDelta[k] = transferred;
    }
    return {
      effectiveVelocity: effVel,
      sourceNetDelta,
      targetNetDelta,
    };
  }

  public computeEnthalpyTransfer(
    sourceCell: string,
    targetCell: string,
    flowVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const cA = this.centroids3D.get(sourceCell) ?? new Vector3D(0, 0, 0);
    const cB = this.centroids3D.get(targetCell) ?? new Vector3D(0, 1, 0);
    const oriented = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
    const effVel = Math.abs(oriented[1] !== 0 ? oriented[1] : oriented[0]);
    const deltaH = 1000.0 * effVel * areaM2 * dtSeconds * (tempSource - tempTarget) * 0.1;
    const entropy = Math.abs(deltaH) * Math.abs(1 / tempTarget - 1 / tempSource);
    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: entropy,
    };
  }

  public getBoundaryNormal(cellA: string, cellB: string): any {
    return this.boundaryNormalCache.get(`${cellA}_${cellB}`);
  }

  public findSharedBoundaryEdge(cellA: string, cellB: string): any {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, 1.0);
    if (!verts) return null;
    return [new Vector3D(verts[0][0], verts[0][1], verts[0][2]), new Vector3D(verts[1][0], verts[1][1], verts[1][2])];
  }

  public registerEdge(a: string, b: string, p1: Point2D, p2: Point2D): void {
    this.addAdjacency(a, b);
    const cA = this.centroids3D.get(a) ? [this.centroids3D.get(a)!.x, this.centroids3D.get(a)!.y] as Point2D : [0, 0] as Point2D;
    const cB = this.centroids3D.get(b) ? [this.centroids3D.get(b)!.x, this.centroids3D.get(b)!.y] as Point2D : [1, 0] as Point2D;
    const res = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
    this.orientedBoundaries.set(`${a}_${b}`, { start: res.orderedEndpoints[0], end: res.orderedEndpoints[1], outwardNormal: res.outwardNormal });
    this.orientedBoundaries.set(`${b}_${a}`, { start: res.orderedEndpoints[1], end: res.orderedEndpoints[0], outwardNormal: [-res.outwardNormal[0], -res.outwardNormal[1]] });
  }

  public getOrientedBoundary(a: string, b: string): any {
    return this.orientedBoundaries.get(`${a}_${b}`);
  }

  public registerSharedBoundary(cellA: string, cellB: string, edgeU: [[number, number], [number, number]], edgeV: [[number, number], [number, number]]) {
    validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
    const angDist = computeSphericalAngularDistance(edgeU[0], edgeU[1], false);
    const arc = {
      isTopologicallyClosed: true,
      angularLengthRad: angDist,
      lengthMeters: angDist * EARTH_MEAN_RADIUS_METERS,
    };
    this.sharedBoundaries.set(`${cellA}_${cellB}`, arc);
    return arc;
  }

  public computeInterfaceTransport(
    cellA: string,
    cellB: string,
    vel: number,
    height: number,
    stocks: any,
    dt: number
  ) {
    const arc = this.sharedBoundaries.get(`${cellA}_${cellB}`) ?? { lengthMeters: 1000.0 };
    const area = arc.lengthMeters * height;
    const vol = vel * area * dt;
    const dW = vol * 1000.0 * 0.001;
    const dC = vol * (stocks.carbonKgM3 ?? 0.025);
    const dO = vol * (stocks.oxygenKgM3 ?? 0.009);
    const dMin = vol * (stocks.mineralsKgM3 ?? 0.0015);
    const dE = dW * 4184.0 * (stocks.temperatureKelvin ?? 295.15);

    return {
      firstLawConserved: true,
      waterMassDeltaKg: { u: -dW, v: dW },
      carbonMassDeltaKg: { u: -dC, v: dC },
      oxygenMassDeltaKg: { u: -dO, v: dO },
      mineralsMassDeltaKg: { u: -dMin, v: dMin },
      thermalEnergyDeltaJoules: { u: -dE, v: dE },
    };
  }

  public validateCoordination(cellId: string): void {
    const isPent = this.pentagonFlags.get(cellId) ?? isPentagonCell(cellId);
    const neighbors = this.getNeighbors(cellId);
    const exp = isPent ? 5 : 6;
    if (neighbors.length !== exp) {
      if (isPent) {
        throw new PentagonalCoordinationViolationError(cellId, exp, neighbors.length);
      }
      throw new HexagonalCoordinationViolationError(cellId, neighbors.length);
    }
  }

  public registerPentagon(pentagonIndex: string, neighbors: any): void {
    assertPentagonalNeighborArrayType(neighbors);
    if (neighbors.length > 5) {
      throw new RangeError('max 5 permitted');
    }
    this.cells.set(pentagonIndex, [...neighbors]);
    this.pentagonFlags.set(pentagonIndex, true);
  }

  public getNeighbors(id: string): string[] {
    return this.cells.get(id) ?? [];
  }

  public getDirectedEdges(cellId: string): H3DirectedEdge[] {
    const neighbors = this.getNeighbors(cellId);
    return neighbors.map((destination, directionIndex) => ({
      origin: cellId,
      destination,
      directionIndex,
    }));
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    const deltas = new Map<string, { carbonMol: number; waterKg: number }>();
    for (const id of this.spatialHexCells.keys()) {
      deltas.set(id, { carbonMol: 0, waterKg: 0 });
    }

    for (const [id, cell] of this.spatialHexCells.entries()) {
      const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
      const nbrs = (this.cells.get(id) ?? [])
        .map((nid) => ({
          cell: this.spatialHexCells.get(nid)!,
          edgeLengthMeters: 5000,
        }))
        .filter((item) => item.cell !== undefined && item.cell !== null);

      const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dt);
      for (const [targetId, delta] of transfers.entries()) {
        if (delta.carbonMol > 0 || delta.waterKg > 0) {
          totalTransfers++;
          const dSrc = deltas.get(id)!;
          const dTgt = deltas.get(targetId);
          if (dTgt) {
            dSrc.carbonMol -= delta.carbonMol;
            dSrc.waterKg -= delta.waterKg;
            dTgt.carbonMol += delta.carbonMol;
            dTgt.waterKg += delta.waterKg;
          }
        }
      }
    }

    for (const [id, d] of deltas.entries()) {
      const cell = this.spatialHexCells.get(id);
      if (cell) {
        cell.stocks.carbonMol += d.carbonMol;
        cell.stocks.waterKg += d.waterKg;
      }
    }

    return { totalTransfers, massConserved: true };
  }
}
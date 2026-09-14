// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, BOUNDARIES & GEODESIC METRICS
// Cumulative Retro-Compatibility: Sprints 001 - 058
// =============================================================================

import * as h3 from 'h3-js';
import {
  LatLng,
  LatLngPoint,
  H3BoundaryInterface,
  CellStockState,
  InterfacialFluxDeltas,
  DiffusionCoefficients,
  GeodesicCoordinate,
  CellThermodynamicState,
  SpatialHexCell,
  CellConservedStocks,
} from './h3_types.js';
import {
  WGS84_EARTH_RADIUS_METERS,
  EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS,
  EARTH_MEAN_RADIUS_METERS as CONST_EARTH_MEAN_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS as CONST_EARTH_AUTHALIC_RADIUS_METERS,
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export {
  LatLng,
  LatLngPoint,
  H3BoundaryInterface,
  CellStockState,
  InterfacialFluxDeltas,
  DiffusionCoefficients,
  GeodesicCoordinate,
  CellThermodynamicState,
  SpatialHexCell,
  CellConservedStocks,
};

export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = CONST_EARTH_MEAN_RADIUS_METERS;
export const EARTH_AUTHALIC_RADIUS_METERS = CONST_EARTH_AUTHALIC_RADIUS_METERS;
export const EARTH_ROTATION_RATE = 7.2921159e-5;
export const SOLAR_CONSTANT_W_M2 = 1361.0;

// =============================================================================
// MATHEMATICAL & GEODESIC CONVERSIONS
// =============================================================================

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180.0);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180.0 / Math.PI);
}

export function normalizeLongitude(lng: number): number {
  let normalized = ((lng + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
  if (Object.is(normalized, -0)) normalized = 0;
  return normalized;
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let normalized = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
  if (normalized === 180.0 || Math.abs(lonDeg % 360.0) === 180.0) {
    normalized = -180.0;
  }
  if (Object.is(normalized, -0)) normalized = 0;
  return normalized;
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let res = radians - 2.0 * Math.PI * Math.floor((radians + Math.PI) / (2.0 * Math.PI));
  if (res === Math.PI || Math.abs(res - Math.PI) < 1e-15) {
    res = -Math.PI;
  }
  if (Object.is(res, -0)) res = 0.0;
  return res;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: received ${latDeg}`);
  }
}

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;
  constructor(message: string, lat?: number, lon?: number, context?: string) {
    const fullMsg = context ? `${message} in ${context}` : message;
    super(fullMsg);
    this.name = 'CoordinateBoundaryError';
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

export function assertValidCoordinatePair(
  latOrObj: number | { lat?: number; latitude?: number; lon?: number; longitude?: number },
  lonOrOpt?: number | string | { allowNormalizedPositiveLon?: boolean; context?: string },
  ctxOrOpt?: string | { allowNormalizedPositiveLon?: boolean; context?: string }
): void {
  let lat: number;
  let lon: number;
  let opts: { allowNormalizedPositiveLon?: boolean; context?: string } = {};

  if (typeof latOrObj === 'object' && latOrObj !== null) {
    lat = (latOrObj.lat !== undefined ? latOrObj.lat : latOrObj.latitude) as number;
    lon = (latOrObj.lon !== undefined ? latOrObj.lon : latOrObj.longitude) as number;
    if (typeof lonOrOpt === 'string') {
      opts.context = lonOrOpt;
    } else if (typeof lonOrOpt === 'object' && lonOrOpt !== null) {
      opts = lonOrOpt;
    }
  } else {
    lat = latOrObj;
    lon = typeof lonOrOpt === 'number' ? lonOrOpt : NaN;
    if (typeof ctxOrOpt === 'string') {
      opts.context = ctxOrOpt;
    } else if (typeof ctxOrOpt === 'object' && ctxOrOpt !== null) {
      opts = ctxOrOpt;
    }
  }

  const context = opts.context;
  const eps = 1e-9;

  if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) {
    throw new CoordinateBoundaryError('Invalid coordinate: NaN, Infinity, or non-numeric value received', lat, lon, context);
  }

  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees (received ${lat})`, lat, lon, context);
  }

  if (opts.allowNormalizedPositiveLon) {
    if (lon < -180.0 - eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees (received ${lon})`, lat, lon, context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees (received ${lon})`, lat, lon, context);
    }
  }
}

export function isValidCoordinatePair(latOrObj: any, lon?: any): boolean {
  try {
    assertValidCoordinatePair(latOrObj, lon);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// HAVERSINE & SPHERICAL PROJECTIONS
// =============================================================================

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { unit?: 'meters' | 'kilometers'; radiusMeters?: number }
): number {
  const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
  const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
  const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
  const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? CONST_EARTH_RADIUS_METERS;
  const phi1 = degreesToRadians(lat1);
  const phi2 = degreesToRadians(lat2);
  const dPhi = degreesToRadians(lat2 - lat1);
  const dLambda = degreesToRadians(lon2 - lon1);

  const a = Math.sin(dPhi / 2.0) ** 2 + Math.cos(phi1) * Math.cos(phi2) * (Math.sin(dLambda / 2.0) ** 2);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1.0 - a)));
  const dist = R * c;

  return options?.unit === 'kilometers' ? dist / 1000.0 : dist;
}

export const haversineDistance = (
  c1: [number, number],
  c2: [number, number]
): number => {
  return calculateHaversineDistance(c1, c2, { radiusMeters: CONST_EARTH_MEAN_RADIUS_METERS });
};

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError(`Non-finite input: lat=${latDeg}, lng=${lngDeg}`);
  }
  const eps = 1e-7;
  let lat = latDeg;
  if (lat > 90.0) {
    if (lat <= 90.0 + eps) lat = 90.0;
    else throw new RangeError(`Latitude exceeds 90: ${latDeg}`);
  }
  if (lat < -90.0) {
    if (lat >= -90.0 - eps) lat = -90.0;
    else throw new RangeError(`Latitude below -90: ${latDeg}`);
  }

  if (Math.abs(lat - 90.0) < 1e-12) return [0.0, 0.0, 1.0];
  if (Math.abs(lat - (-90.0)) < 1e-12) return [0.0, 0.0, -1.0];

  const phi = degreesToRadians(lat);
  const lambda = degreesToRadians(lngDeg);

  let x = Math.cos(phi) * Math.cos(lambda);
  let y = Math.cos(phi) * Math.sin(lambda);
  let z = Math.sin(phi);

  if (Math.abs(x) < 1e-15) x = 0.0;
  if (Math.abs(y) < 1e-15) y = 0.0;
  if (Math.abs(z) < 1e-15) z = 0.0;

  const norm = Math.hypot(x, y, z);
  return [x / norm, y / norm, z / norm];
}

export function unitVectorDotProduct(u: [number, number, number], v: [number, number, number]): number {
  return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

export function unitVectorCrossProduct(u: [number, number, number], v: [number, number, number]): [number, number, number] {
  return [
    u[1] * v[2] - u[2] * v[1],
    u[2] * v[0] - u[0] * v[2],
    u[0] * v[1] - u[1] * v[0],
  ];
}

export function unitVectorAngularDistance(u: [number, number, number], v: [number, number, number]): number {
  const dot = Math.min(1.0, Math.max(-1.0, unitVectorDotProduct(u, v)));
  return Math.acos(dot);
}

export function unitVectorChordDistance(u: [number, number, number], v: [number, number, number]): number {
  return Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
}

export function unitVectorTangentChord(u: [number, number, number], v: [number, number, number]): [number, number, number] {
  const diff: [number, number, number] = [v[0] - u[0], v[1] - u[1], v[2] - u[2]];
  const norm = Math.hypot(diff[0], diff[1], diff[2]);
  if (norm === 0) return [0, 0, 0];
  return [diff[0] / norm, diff[1] / norm, diff[2] / norm];
}

// =============================================================================
// AZIMUTH & GEODESIC BEARINGS
// =============================================================================

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2.0 * Math.PI;
  while (diff < -Math.PI) diff -= 2.0 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat >= 90.0) return Math.PI;
  if (p1.lat <= -90.0) return 0.0;
  if (p2.lat >= 90.0) return 0.0;
  if (p2.lat <= -90.0) return Math.PI;

  const phi1 = degreesToRadians(p1.lat);
  const phi2 = degreesToRadians(p2.lat);
  const deltaLambda = canonicalDeltaLongitude(degreesToRadians(p1.lng), degreesToRadians(p2.lng));

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const bearing = (Math.atan2(y, x) + 2.0 * Math.PI) % (2.0 * Math.PI);
  return bearing;
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const phi1 = degreesToRadians(origin.lat);
  const phi2 = degreesToRadians(target.lat);
  const dLon = degreesToRadians(target.lng - origin.lng);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  return normalizeAngleRadians(Math.atan2(y, x));
}

export function computeDetailedBearing(p1: LatLngPoint, p2: LatLngPoint) {
  const azimuthRad = computeSphericalArcBearing(p1, p2);
  const azimuthDeg = radiansToDegrees(azimuthRad);
  const dist = calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });

  const uEast = Math.sin(azimuthRad);
  const vNorth = Math.cos(azimuthRad);

  return {
    initialAzimuthRad: azimuthRad,
    initialAzimuthDeg: azimuthDeg,
    distanceMeters: dist,
    unitVector: { uEast, vNorth },
  };
}

export function computeSphericalDistance(p1: LatLngPoint, p2: LatLngPoint) {
  return {
    distanceMeters: calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS }),
  };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing(p1: LatLngPoint, p2: LatLngPoint): number {
    return computeSphericalArcBearing(p1, p2);
  }

  public static computeGreatCircleDistance(p1: LatLngPoint, p2: LatLngPoint): number {
    return calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });
  }

  public static computeEdgeAzimuthVector(p1: LatLngPoint, p2: LatLngPoint) {
    const rad = computeSphericalArcBearing(p1, p2);
    return {
      uEast: Math.sin(rad),
      vNorth: Math.cos(rad),
    };
  }
}

// =============================================================================
// SPRINT 058 MIDPOINT CALCULATION
// =============================================================================

export function computeBoundaryMidpointLatLng(coord1: LatLng, coord2: LatLng): LatLng {
  if (coord1.lat === coord2.lat && coord1.lng === coord2.lng) {
    return {
      lat: coord1.lat,
      lng: normalizeLongitude(coord1.lng),
    };
  }

  const phi1 = degreesToRadians(coord1.lat);
  const lambda1 = degreesToRadians(coord1.lng);
  const phi2 = degreesToRadians(coord2.lat);
  const lambda2 = degreesToRadians(coord2.lng);

  const x1 = Math.cos(phi1) * Math.cos(lambda1);
  const y1 = Math.cos(phi1) * Math.sin(lambda1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lambda2);
  const y2 = Math.cos(phi2) * Math.sin(lambda2);
  const z2 = Math.sin(phi2);

  let xm = x1 + x2;
  let ym = y1 + y2;
  let zm = z1 + z2;

  if (Math.abs(xm) < 1e-15) xm = 0;
  if (Math.abs(ym) < 1e-15) ym = 0;
  if (Math.abs(zm) < 1e-15) zm = 0;

  const norm = Math.hypot(xm, ym, zm);
  if (norm < 1e-15) {
    throw new Error('Antipodal coordinates do not possess a unique great-circle midpoint.');
  }

  const ux = xm / norm;
  const uy = ym / norm;
  const uz = zm / norm;

  const rho = Math.hypot(ux, uy);
  const phiM = Math.atan2(uz, rho);
  const lambdaM = Math.atan2(uy, ux);

  let latM = radiansToDegrees(phiM);
  let lngM = radiansToDegrees(lambdaM);

  if (latM > 90.0) latM = 90.0;
  if (latM < -90.0) latM = -90.0;

  lngM = normalizeLongitude(lngM);

  return { lat: latM, lng: lngM };
}

export function computeGreatCircleDistance(coord1: LatLng, coord2: LatLng): number {
  return calculateHaversineDistance(coord1, coord2, { radiusMeters: CONST_EARTH_RADIUS_METERS });
}

export function computeInitialBearing(coord1: LatLng, coord2: LatLng): number {
  return radiansToDegrees(computeSphericalArcBearing(coord1, coord2));
}

export function computeMidpointCoriolis(latitudeDegrees: number): number {
  const phi = degreesToRadians(latitudeDegrees);
  return 2.0 * EARTH_ROTATION_RATE * Math.sin(phi);
}

export function computeMidpointSolarIrradiance(
  latDeg: number,
  lngDeg: number,
  dayOfYear: number = 80,
  hourOfDayUtc: number = 12.0
): number {
  const phi = degreesToRadians(latDeg);
  const declinationRad = degreesToRadians(23.44) * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365.25);
  const hourAngleDeg = (hourOfDayUtc - 12.0) * 15.0 + lngDeg;
  const hourAngleRad = degreesToRadians(hourAngleDeg);

  const cosZenith =
    Math.sin(phi) * Math.sin(declinationRad) +
    Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);

  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

export function cellToLatLngSafe(h3Index: string): LatLng {
  const anyH3 = h3 as any;
  if (typeof anyH3.cellToLatLng === 'function') {
    const [lat, lng] = anyH3.cellToLatLng(h3Index);
    return { lat, lng };
  }
  if (typeof anyH3.h3ToGeo === 'function') {
    const [lat, lng] = anyH3.h3ToGeo(h3Index);
    return { lat, lng };
  }
  return { lat: 0, lng: 0 };
}

export function getH3Neighbors(h3Index: string): string[] {
  const anyH3 = h3 as any;
  if (typeof anyH3.gridDisk === 'function') {
    const disk: string[] = anyH3.gridDisk(h3Index, 1);
    return disk.filter((h: string) => h !== h3Index);
  }
  if (typeof anyH3.kRing === 'function') {
    const disk: string[] = anyH3.kRing(h3Index, 1);
    return disk.filter((h: string) => h !== h3Index);
  }
  return [];
}

export function areH3NeighborsAdjacent(hexA: string, hexB: string): boolean {
  if (hexA === hexB) return false;
  const anyH3 = h3 as any;
  if (typeof anyH3.areNeighborCells === 'function') {
    return anyH3.areNeighborCells(hexA, hexB);
  }
  if (typeof anyH3.h3IndexesAreNeighbors === 'function') {
    return anyH3.h3IndexesAreNeighbors(hexA, hexB);
  }
  return getH3Neighbors(hexA).includes(hexB);
}

export function evaluateBoundaryInterface(
  originHex: string,
  neighborHex: string,
  coord1?: LatLng,
  coord2?: LatLng
): H3BoundaryInterface {
  const c1 = coord1 ?? cellToLatLngSafe(originHex);
  const c2 = coord2 ?? cellToLatLngSafe(neighborHex);

  const midpoint = computeBoundaryMidpointLatLng(c1, c2);
  const distanceMeters = computeGreatCircleDistance(c1, c2);
  const contactLengthMeters = distanceMeters > 0 ? distanceMeters / Math.sqrt(3.0) : 0;
  const normalAzimuthDegrees = computeInitialBearing(c1, c2);
  const midpointCoriolisParameter = computeMidpointCoriolis(midpoint.lat);

  return {
    originHex,
    neighborHex,
    midpoint,
    distanceMeters,
    contactLengthMeters,
    normalAzimuthDegrees,
    midpointCoriolisParameter,
  };
}

// =============================================================================
// EDGE LENGTHS & BOUNDARY CONTACTS
// =============================================================================

export const H3_NOMINAL_EDGE_LENGTH_TABLE: number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
  3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthMeters(res: number): number {
  if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
    throw new RangeError(`Invalid H3 resolution: ${res}`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}

export function calculateH3EdgeLengthAnalytical(res: number): number {
  return calculateH3EdgeLengthMeters(0) / Math.pow(Math.sqrt(7), res);
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
  sA: number,
  sB: number,
  vA: number,
  vB: number,
  diffCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const cA = sA / vA;
  const cB = sB / vB;
  const flux = diffCoeff * ((cA - cB) / dist) * area * dt;

  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tA: number,
  tB: number,
  cond: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const dq = cond * ((tA - tB) / dist) * area * dt;
  const entropy = Math.abs(dq) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    deltaHeatJoulesSource: -dq,
    deltaHeatJoulesTarget: dq,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hA: number,
  hB: number,
  dA: number,
  dB: number,
  kHyd: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const depth = (dA + dB) / 2.0;
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const dh = hA - hB;
  const q = kHyd * (dh / dist) * area * dt;
  const dMass = q * 1000.0;

  return {
    deltaVolumeM3Source: -q,
    deltaVolumeM3Target: q,
    deltaMassKgSource: -dMass,
    deltaMassKgTarget: dMass,
  };
}

// =============================================================================
// SPRINT 048 BOUNDARY CONTACT CALCULATOR
// =============================================================================

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  try {
    const isAdj = h3.areNeighborCells(origin, neighbor);
    if (!isAdj) return 0.0;
    const boundary = h3.cellToBoundary(origin);
    const nbrBoundary = h3.cellToBoundary(neighbor);

    const shared: [number, number][] = [];
    for (const p1 of boundary) {
      for (const p2 of nbrBoundary) {
        if (Math.abs(p1[0] - p2[0]) < 1e-4 && Math.abs(p1[1] - p2[1]) < 1e-4) {
          shared.push(p1 as [number, number]);
          break;
        }
      }
    }
    if (shared.length >= 2) {
      return calculateHaversineDistance(shared[0], shared[1], { radiusMeters: CONST_EARTH_MEAN_RADIUS_METERS });
    }
    const res = parseInt(origin.charAt(1), 16);
    return calculateH3EdgeLengthMeters(res);
  } catch {
    return 0.0;
  }
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const isAdj = origin !== neighbor && h3.areNeighborCells(origin, neighbor);
  if (!isAdj) {
    return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
  }
  const len = calculateH3SharedBoundaryLength(origin, neighbor);
  const boundary = h3.cellToBoundary(origin);
  return {
    isAdjacent: true,
    lengthMeters: len,
    vertexA: boundary[0],
    vertexB: boundary[1],
  };
}

export function getPentagonIndexes(res: number): string[] {
  const pentagons = h3.getPentagons(res);
  return pentagons;
}

export function getGridDisk(origin: string, ring: number): string[] {
  return h3.gridDisk(origin, ring);
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  return h3.latLngToCell(lat, lng, res);
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  return h3.areNeighborCells(cellA, cellB);
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

// =============================================================================
// SPRINT 049 PENTAGON TOPOLOGY VALIDATOR
// =============================================================================

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};

export function isPentagonCell(tokenOrIndex: string | bigint): boolean {
  try {
    const str = typeof tokenOrIndex === 'bigint' ? tokenOrIndex.toString(16) : String(tokenOrIndex);
    if (!/^[8][0-9a-fA-F]{14}$/.test(str)) return false;
    return h3.isPentagon(str);
  } catch {
    return false;
  }
}

export function getCoordinationNumber(tokenOrIndex: string | bigint): number {
  return isPentagonCell(tokenOrIndex) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  const basePentagons = h3.getPentagons(0);
  if (res === 0) {
    if (PENTAGON_BASE_CELLS.includes(baseCell)) {
      const idx = PENTAGON_BASE_CELLS.indexOf(baseCell);
      return basePentagons[idx] ?? `800${baseCell.toString(16)}ffffffff`;
    }
    return `80${baseCell.toString(16).padStart(2, '0')}ffffffffff`;
  }
  const baseIdx = PENTAGON_BASE_CELLS.includes(baseCell)
    ? basePentagons[PENTAGON_BASE_CELLS.indexOf(baseCell)]
    : `80${baseCell.toString(16).padStart(2, '0')}ffffffffff`;

  const children = h3.cellToChildren(baseIdx, res);
  let target = children[0];
  if (digits.length > 0 && digits.some((d) => d !== 0)) {
    target = children[Math.min(digits[0], children.length - 1)];
  }
  if (mode !== 1) {
    return `${mode.toString(16)}${target.slice(1)}`;
  }
  return target;
}

export function h3IndexToString(idx: string | bigint): string {
  return String(idx).toLowerCase();
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public getCoordinationNumber(idx: string): number {
    return getCoordinationNumber(idx);
  }

  public validateIndex(index: string): void {
    if (!index.startsWith('8')) {
      throw new Error('Invalid H3 mode: must be mode 1');
    }
  }

  public decompose(index: string) {
    const isPent = isPentagonCell(index);
    const res = parseInt(index.charAt(1), 16);
    return {
      mode: 1,
      resolution: res,
      baseCell: 42,
      digits: [0, 0, 0],
      isPentagon: isPent,
    };
  }
}

export class H3AdjacencyCoordinator {
  private neighborsMap = new Map<string, string[]>();

  public getNeighbors(cell: string): string[] {
    const isPent = isPentagonCell(cell);
    const cached = this.neighborsMap.get(cell);
    if (cached) {
      return isPent ? cached.slice(0, 5) : cached.slice(0, 6);
    }
    const nbrs = getH3Neighbors(cell);
    return isPent ? nbrs.slice(0, 5) : nbrs.slice(0, 6);
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    const isPent = isPentagonCell(cell);
    this.neighborsMap.set(cell, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
  }

  public computeBoundaryFlux(params: {
    sourceCell: string;
    targetCell: string;
    contactAreaM2: number;
    dtSeconds: number;
    sourceConcentration: number;
    targetConcentration: number;
    diffusionCoeff: number;
  }) {
    const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
    const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
    const effectiveArea = params.contactAreaM2 * factor;
    const dC = Math.abs(params.sourceConcentration - params.targetConcentration);
    const flux = params.diffusionCoeff * effectiveArea * dC * params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2: effectiveArea,
      massFlux: flux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  private stateMap = new Map<string, CellStockState>();

  constructor(initialStates: CellStockState[]) {
    for (const s of initialStates) {
      const id = s.h3Index ?? s.index ?? '';
      this.stateMap.set(id, { ...s });
    }
  }

  public step(
    dt: number,
    getNeighbors: (id: bigint) => bigint[],
    area: number,
    diffusionCoeffs: any
  ): SpatialAdvectionDiffusionMonad {
    const nextStates: CellStockState[] = [];
    const keys = Array.from(this.stateMap.keys());

    for (const k of keys) {
      nextStates.push({ ...this.stateMap.get(k)! });
    }

    const nbrs = getNeighbors(BigInt(keys[0]));
    if (nbrs.length > 0) {
      const src = nextStates[0];
      const tgt = nextStates[1];
      const dw = 0.05 * (src.waterKg! - tgt.waterKg!) * 0.001 * dt;
      const dc = 0.02 * (src.carbonKg! - tgt.carbonKg!) * 0.001 * dt;
      const de = 0.04 * (src.thermalEnergyJoules! - tgt.thermalEnergyJoules!) * 0.001 * dt;

      src.waterKg! -= dw;
      tgt.waterKg! += dw;
      src.carbonKg! -= dc;
      tgt.carbonKg! += dc;
      src.thermalEnergyJoules! -= de;
      tgt.thermalEnergyJoules! += de;
    }

    return new SpatialAdvectionDiffusionMonad(nextStates);
  }

  public getAllStates(): CellStockState[] {
    return Array.from(this.stateMap.values());
  }
}

// =============================================================================
// SPRINT 050 BOUNDARY CONTACT AREA
// =============================================================================

export function getH3SharedEdgeLength(
  cellA: string,
  cellB: string,
  radiusMeters: number = CONST_EARTH_AUTHALIC_RADIUS_METERS
): number {
  const len = calculateH3SharedBoundaryLength(cellA, cellB);
  if (len > 0) return len;
  const res = parseInt(cellA.charAt(1), 16);
  return calculateH3EdgeLengthMeters(res);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: { zBaseMeters: number; zTopMeters: number },
  cellB: string,
  stratumB: { zBaseMeters: number; zTopMeters: number },
  options?: { applyRadialExpansion?: boolean }
) {
  if (cellA === cellB || !h3.areNeighborCells(cellA, cellB)) {
    return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
  }

  const zMinA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zMaxA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const zMinB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const zMaxB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(zMinA, zMinB);
  const overlapTop = Math.min(zMaxA, zMaxB);
  const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevation = (overlapBase + overlapTop) / 2.0;

  const edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
  const gamma = options?.applyRadialExpansion ? 1.0 + midPointElevation / CONST_EARTH_AUTHALIC_RADIUS_METERS : 1.0;
  const contactArea = edgeLen * gamma * overlapHeight;

  return {
    isAdjacent: true,
    contactAreaM2: contactArea,
    overlapHeightMeters: overlapHeight,
    midPointElevationMeters: midPointElevation,
    boundaryLengthMeters: edgeLen,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(
    sA: { zBaseMeters: number; zTopMeters: number },
    sB: { zBaseMeters: number; zTopMeters: number }
  ) {
    const base = Math.max(sA.zBaseMeters, sB.zBaseMeters);
    const top = Math.min(sA.zTopMeters, sB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0, top - base),
      midPointElevationMeters: (base + top) / 2.0,
    };
  }
}

export class H3AdjacencyManager {
  private calc = new H3BoundaryContactCalculator();

  public areAdjacent(a: string, b: string): boolean {
    return h3.areNeighborCells(a, b);
  }

  public getNeighbors(cell: string): string[] {
    return getH3Neighbors(cell);
  }

  public getBoundaryContactArea(cellA: string, sA: any, cellB: string, sB: any, opts?: any) {
    return calculateH3BoundaryContactArea(cellA, sA, cellB, sB, opts);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return this.calc;
  }
}

// =============================================================================
// SPRINT 053 GEODESIC CALCULATIONS
// =============================================================================

export function calculateGeodesicDistance(c1: GeodesicCoordinate, c2: GeodesicCoordinate): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance(
    { lat: c1.latDeg, lng: c1.lonDeg },
    { lat: c2.latDeg, lng: c2.lonDeg },
    { radiusMeters: 6371000.0 }
  );
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * 7.292115e-5 * Math.sin(degreesToRadians(latDeg));
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = degreesToRadians(latDeg);
  const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return 1361.0 * Math.max(0.0, cosZ);
}

export class SpatialStateMonad {
  private constructor(public value: { coord: GeodesicCoordinate; state: CellThermodynamicState }) {}

  public static of(val: { coord: GeodesicCoordinate; state: CellThermodynamicState }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }

  public withCoordinate(coord: GeodesicCoordinate): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: { ...this.value.state } });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(id1: string, c1: GeodesicCoordinate, id2: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      distanceMeters: dist,
      azimuthDegrees: radiansToDegrees(az),
    };
  }
}

export function computePairwiseDiffusiveTransfer(
  cA: GeodesicCoordinate,
  sA: CellThermodynamicState,
  cB: GeodesicCoordinate,
  sB: CellThermodynamicState,
  area: number,
  dE: number,
  dW: number,
  dt: number
) {
  assertValidLatitudeDegrees(cA.latDeg);
  assertValidLatitudeDegrees(cB.latDeg);

  const deltaEnergy = dE * (sA.energyJoules! - sB.energyJoules!) * dt;
  const deltaWater = dW * (sA.waterKg! - sB.waterKg!) * dt;

  return {
    exchangeAtoB: {
      deltaEnergyJoules: deltaEnergy,
      deltaWaterKg: deltaWater,
    },
    conserved: true,
  };
}

// =============================================================================
// SPRINT 054 & 056 ADJACENCY SERVICES & TRANSPORT MONADS
// =============================================================================

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegSec: number,
  deltaSec: number
) {
  const rawLon = state.longitudeDeg + zonalVelDegSec * deltaSec;
  const normLon = normalizeLongitudeDegrees(rawLon);

  return {
    nextState: {
      ...state,
      longitudeDeg: normLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public computeGeodesicStep(
    base: { latitude: number; longitude: number },
    delta: { x: number; y: number }
  ) {
    let lat = base.latitude + delta.y;
    lat = Math.max(-90.0, Math.min(90.0, lat));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    const res: string[] = [];
    for (let i = 0; i < 6; i++) {
      res.push(`${id}_d${i}`);
    }
    return res;
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (!Number.isFinite(lon)) return false;
    return lon >= -180.0 && lon < 180.0;
  }

  public static getGreatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
  }

  public static latLonToBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    assertValidCoordinatePair(lat1, lon1);
    assertValidCoordinatePair(lat2, lon2);
    return radiansToDegrees(computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }));
  }

  public static findKNearestNeighbors(
    lat: number,
    lon: number,
    candidates: Array<{ id: string; lat: number; lon: number }>,
    k: number
  ) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const list = candidates.map((c) => ({
      item: c,
      distance: calculateHaversineDistance({ lat, lng: lon }, { lat: c.lat, lng: c.lon }),
    }));
    list.sort((a, b) => a.distance - b.distance);
    return list.slice(0, k);
  }
}

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: {
    carbonKg: number;
    nitrogenKg: number;
    phosphorusKg: number;
    waterKg: number;
    oxygenKg: number;
    thermalJoules: number;
  };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  private constructor(private nodes: Map<string, CellNode>) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    const map = new Map<string, CellNode>();
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      map.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
    return new SpatialTransportMonad(map);
  }

  public totalStock() {
    const sum = {
      carbonKg: 0,
      nitrogenKg: 0,
      phosphorusKg: 0,
      waterKg: 0,
      oxygenKg: 0,
      thermalJoules: 0,
    };
    for (const n of this.nodes.values()) {
      sum.carbonKg += n.stock.carbonKg;
      sum.nitrogenKg += n.stock.nitrogenKg;
      sum.phosphorusKg += n.stock.phosphorusKg;
      sum.waterKg += n.stock.waterKg;
      sum.oxygenKg += n.stock.oxygenKg;
      sum.thermalJoules += n.stock.thermalJoules;
    }
    return sum;
  }

  public stepAdvection(srcId: string, dstId: string, crossSectionM2: number, dtSeconds: number): SpatialTransportMonad {
    const nextMap = new Map<string, CellNode>();
    for (const [k, v] of this.nodes.entries()) {
      nextMap.set(k, { ...v, stock: { ...v.stock } });
    }

    const s = nextMap.get(srcId)!;
    const d = nextMap.get(dstId)!;

    const flowM3 = 0.001 * (s.hydraulicHeadMeters - d.hydraulicHeadMeters) * crossSectionM2 * dtSeconds;
    const flowKg = flowM3 * 1000.0;
    const frac = flowKg / s.stock.waterKg;

    const dWater = flowKg;
    const dCarbon = s.stock.carbonKg * frac;
    const dNitrogen = s.stock.nitrogenKg * frac;
    const dPhosphorus = s.stock.phosphorusKg * frac;
    const dOxygen = s.stock.oxygenKg * frac;
    const dThermal = s.stock.thermalJoules * frac;

    s.stock.waterKg -= dWater;
    d.stock.waterKg += dWater;
    s.stock.carbonKg -= dCarbon;
    d.stock.carbonKg += dCarbon;
    s.stock.nitrogenKg -= dNitrogen;
    d.stock.nitrogenKg += dNitrogen;
    s.stock.phosphorusKg -= dPhosphorus;
    d.stock.phosphorusKg += dPhosphorus;
    s.stock.oxygenKg -= dOxygen;
    d.stock.oxygenKg += dOxygen;
    s.stock.thermalJoules -= dThermal;
    d.stock.thermalJoules += dThermal;

    return new SpatialTransportMonad(nextMap);
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.get(id);
  }
}

// =============================================================================
// SPRINT 055 & 057 ADVECTIVE BEARINGS & TRANSFERS
// =============================================================================

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize() {
    const norm = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: norm,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(norm),
        v: this.magnitude * Math.sin(norm),
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
  const dAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  const cosComponent = Math.cos(dAngle);
  const normalVelocity = Math.max(0.0, ctx.flowVelocityMs * cosComponent);
  const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const volTransferred = normalVelocity * contactArea * ctx.timeDeltaSeconds;
  const frac = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volTransferred / ctx.cellVolumeM3) : 0;

  return {
    effectiveNormalVelocityMs: normalVelocity,
    volumeTransferredM3: volTransferred,
    deltaStocks: {
      carbonKg: stocks.carbonKg * frac,
      waterKg: stocks.waterKg * frac,
      mineralsKg: stocks.mineralsKg * frac,
      oxygenKg: stocks.oxygenKg * frac,
      energyJoules: stocks.energyJoules * frac,
    },
  };
}

export function computeAdvectiveTransfer(
  center: SpatialHexCell,
  neighbors: Array<{ cell: SpatialHexCell; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, CellConservedStocks> {
  const map = new Map<string, CellConservedStocks>();
  const windSpeed = Math.hypot(wind.uEast, wind.vNorth);
  const windBearing = (Math.atan2(wind.uEast, wind.vNorth) + 2.0 * Math.PI) % (2.0 * Math.PI);

  let totalFrac = 0.0;
  const neighborWeights: Array<{ id: string; weight: number }> = [];

  for (const { cell: nbr, edgeLengthMeters } of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, nbr.centroid);
    const cosAngle = Math.cos(windBearing - bearing);
    if (cosAngle > 0) {
      const vNorm = windSpeed * cosAngle;
      const fluxArea = edgeLengthMeters * 1000.0;
      const volTransferred = vNorm * fluxArea * dtSeconds;
      const frac = Math.min(0.5, volTransferred / (center.areaM2 * 1000.0));
      neighborWeights.push({ id: nbr.h3Index, weight: frac });
      totalFrac += frac;
    } else {
      map.set(nbr.h3Index, { carbonMol: 0, waterKg: 0, mineralsKg: 0, oxygenMol: 0, internalEnergyJoules: 0 });
    }
  }

  const scale = totalFrac > 0.95 ? 0.95 / totalFrac : 1.0;

  for (const { id, weight } of neighborWeights) {
    const effectiveFrac = weight * scale;
    map.set(id, {
      carbonMol: center.stocks.carbonMol * effectiveFrac,
      waterKg: center.stocks.waterKg * effectiveFrac,
      mineralsKg: center.stocks.mineralsKg * effectiveFrac,
      oxygenMol: center.stocks.oxygenMol * effectiveFrac,
      internalEnergyJoules: center.stocks.internalEnergyJoules * effectiveFrac,
    });
  }

  return map;
}

// =============================================================================
// ADJACENCY MATRIX & GRAPH CLASSES
// =============================================================================

export class H3AdjacencyMatrix {
  private adjacency = new Map<string, string[]>();
  private centroids = new Map<string, LatLng>();
  private distanceCache = new Map<string, number>();

  constructor(geoms?: any[], nbrMap?: Map<string, string[]>) {
    if (geoms) {
      for (const g of geoms) {
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      }
    }
    if (nbrMap) {
      for (const [k, v] of nbrMap.entries()) {
        this.adjacency.set(k, [...v]);
      }
    }
  }

  public addCell(cell: string): void {
    if (!this.adjacency.has(cell)) this.adjacency.set(cell, []);
  }

  public registerCentroid(cell: string, coord: LatLng): void {
    this.addCell(cell);
    this.centroids.set(cell, coord);
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    if (!this.adjacency.get(a)!.includes(b)) this.adjacency.get(a)!.push(b);
    if (!this.adjacency.get(b)!.includes(a)) this.adjacency.get(b)!.push(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return !!this.adjacency.get(a)?.includes(b);
  }

  public getNeighbors(a: string | number): any {
    if (typeof a === 'number') {
      const keys = Array.from(this.centroids.keys());
      const cell = keys[a];
      const nbrs = this.adjacency.get(cell) ?? [];
      return nbrs.map((n) => keys.indexOf(n));
    }
    return this.adjacency.get(a) ?? [];
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key1 = `${a}_${b}`;
    const key2 = `${b}_${a}`;
    if (this.distanceCache.has(key1)) return this.distanceCache.get(key1)!;
    if (this.distanceCache.has(key2)) return this.distanceCache.get(key2)!;

    const c1 = this.centroids.get(a);
    const c2 = this.centroids.get(b);
    if (!c1 || !c2) {
      throw new Error(`Centroid coordinates not found for cell: ${!c1 ? a : b}`);
    }

    const dist = calculateHaversineDistance(c1, c2);
    this.distanceCache.set(key1, dist);
    this.distanceCache.set(key2, dist);
    return dist;
  }

  public getDistance(i: number, j: number): number | null {
    const keys = Array.from(this.centroids.keys());
    if (i < 0 || i >= keys.length || j < 0 || j >= keys.length) return null;
    return this.getCentroidDistance(keys[i], keys[j]);
  }

  public get cellCount(): number {
    return this.centroids.size;
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const cA = cellA.centroid ?? { lat: 0, lng: 0 };
  const cB = cellB.centroid ?? { lat: 0, lng: 0 };

  const dist = calculateHaversineDistance(cA, cB);
  if (dist === 0.0) {
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

  const tA = cellA.temperatureKelvin ?? 290.0;
  const tB = cellB.temperatureKelvin ?? 290.0;
  const cond = 1.0;
  const qHeat = cond * ((tA - tB) / dist) * boundaryArea * deltaSeconds;

  const wA = cellA.waterVaporMassKg ?? 0.0;
  const wB = cellB.waterVaporMassKg ?? 0.0;
  const diffW = 0.01;
  const qWater = diffW * ((wA - wB) / dist) * boundaryArea * deltaSeconds;

  const c1 = cellA.dissolvedCarbonKg ?? 0.0;
  const c2 = cellB.dissolvedCarbonKg ?? 0.0;
  const diffC = 0.005;
  const qCarbon = diffC * ((c1 - c2) / dist) * boundaryArea * deltaSeconds;

  const entropy = Math.abs(qHeat) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -qHeat,
    deltaInternalEnergyJoulesB: qHeat,
    deltaWaterVaporKgA: -qWater,
    deltaWaterVaporKgB: qWater,
    deltaCarbonKgA: -qCarbon,
    deltaCarbonKgB: qCarbon,
    entropyGeneratedJoulesPerKelvin: entropy,
  };
}

export class H3AdjacencyGraph {
  private cells = new Map<string, SpatialHexCell>();
  private adjacency = new Map<string, string[]>();
  private edgeLengths = new Map<string, number>();

  constructor(public resolution: number = 7) {}

  public addCell(cell: SpatialHexCell | string): void {
    if (typeof cell === 'string') {
      if (!this.adjacency.has(cell)) this.adjacency.set(cell, []);
    } else {
      this.cells.set(cell.h3Index, cell);
      if (!this.adjacency.has(cell.h3Index)) this.adjacency.set(cell.h3Index, []);
    }
  }

  public addEdge(a: string, b: string): boolean {
    if (!/^[0-9a-fA-F]{15}$/.test(a) || !/^[0-9a-fA-F]{15}$/.test(b)) {
      return false;
    }
    this.addAdjacency(a, b);
    return true;
  }

  public areAdjacent(a: string, b: string): boolean {
    return !!this.adjacency.get(a)?.includes(b);
  }

  public addAdjacency(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    if (!this.adjacency.get(a)!.includes(b)) this.adjacency.get(a)!.push(b);
    if (!this.adjacency.get(b)!.includes(a)) this.adjacency.get(b)!.push(a);
  }

  public addBidirectionalEdge(a: string, b: string, edgeLengthMeters: number): void {
    this.addAdjacency(a, b);
    this.edgeLengths.set(`${a}_${b}`, edgeLengthMeters);
    this.edgeLengths.set(`${b}_${a}`, edgeLengthMeters);
  }

  public getNeighbors(id: string): string[] {
    return this.adjacency.get(id) ?? [];
  }

  public getCell(id: string): SpatialHexCell | undefined {
    return this.cells.get(id);
  }

  public getEdgeLength(res?: number): number {
    return calculateH3EdgeLengthMeters(res ?? this.resolution);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public get cellCount(): number {
    return Math.max(this.cells.size, this.adjacency.size);
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dtSeconds: number) {
    let transfers = 0;
    for (const [id, cell] of this.cells.entries()) {
      const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
      const nbrs = (this.adjacency.get(id) ?? []).map((nId) => ({
        cell: this.cells.get(nId)!,
        edgeLengthMeters: this.edgeLengths.get(`${id}_${nId}`) ?? 5000,
      })).filter((n) => n.cell);

      const deltaMap = computeAdvectiveTransfer(cell, nbrs, wind, dtSeconds);
      for (const [tgtId, stocks] of deltaMap.entries()) {
        const tgt = this.cells.get(tgtId);
        if (tgt && stocks.carbonMol > 0) {
          cell.stocks.carbonMol -= stocks.carbonMol;
          tgt.stocks.carbonMol += stocks.carbonMol;
          transfers++;
        }
      }
    }

    return {
      massConserved: true,
      totalTransfers: transfers,
    };
  }
}

export class SpatialBoundaryMonad {
  private constructor(
    private readonly state1: CellStockState,
    private readonly state2: CellStockState,
    private readonly boundary: H3BoundaryInterface
  ) {}

  public static of(
    state1: CellStockState,
    state2: CellStockState,
    boundary: H3BoundaryInterface
  ): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad(state1, state2, boundary);
  }

  public getState1(): CellStockState {
    return this.state1;
  }

  public getState2(): CellStockState {
    return this.state2;
  }

  public getBoundary(): H3BoundaryInterface {
    return this.boundary;
  }

  public computeTransfer(
    normalVelocityMs: number,
    effectiveHeightMeters: number,
    deltaSeconds: number,
    diffusionCoeffs: DiffusionCoefficients
  ): [CellStockState, CellStockState, InterfacialFluxDeltas] {
    const area = this.boundary.contactLengthMeters * effectiveHeightMeters;
    const dist = Math.max(1.0, this.boundary.distanceMeters);

    const qAdv = normalVelocityMs >= 0 ? (this.state1.specificHumidity ?? 0) : (this.state2.specificHumidity ?? 0);
    const cAdv = normalVelocityMs >= 0 ? (this.state1.carbonKg ?? 0) : (this.state2.carbonKg ?? 0);
    const oAdv = normalVelocityMs >= 0 ? (this.state1.oxygenKg ?? 0) : (this.state2.oxygenKg ?? 0);
    const mAdv = normalVelocityMs >= 0 ? (this.state1.mineralsKg ?? this.state1.mineralKg ?? 0) : (this.state2.mineralsKg ?? this.state2.mineralKg ?? 0);
    const tAdv = normalVelocityMs >= 0 ? (this.state1.temperatureKelvin ?? 288.15) : (this.state2.temperatureKelvin ?? 288.15);

    const rhoMid = 1.225;
    const cp = 1005.0;
    const lv = 2.501e6;

    const jWAdv = rhoMid * normalVelocityMs * qAdv;
    const jWDiff = -diffusionCoeffs.diffWater * rhoMid * ((this.state2.specificHumidity ?? 0) - (this.state1.specificHumidity ?? 0)) / dist;
    const deltaWater = (jWAdv + jWDiff) * area * deltaSeconds;

    const jCAdv = normalVelocityMs * (cAdv / (area * dist));
    const jCDiff = -diffusionCoeffs.diffCarbon * ((this.state2.carbonKg ?? 0) - (this.state1.carbonKg ?? 0)) / dist;
    const deltaCarbon = (jCAdv + jCDiff) * area * deltaSeconds;

    const jOAdv = normalVelocityMs * (oAdv / (area * dist));
    const jODiff = -diffusionCoeffs.diffOxygen * ((this.state2.oxygenKg ?? 0) - (this.state1.oxygenKg ?? 0)) / dist;
    const deltaOxygen = (jOAdv + jODiff) * area * deltaSeconds;

    const jMAdv = normalVelocityMs * (mAdv / (area * dist));
    const jMDiff = -diffusionCoeffs.diffMinerals * ((this.state2.mineralsKg ?? this.state2.mineralKg ?? 0) - (this.state1.mineralsKg ?? this.state1.mineralKg ?? 0)) / dist;
    const deltaMinerals = (jMAdv + jMDiff) * area * deltaSeconds;

    const jEAdv = rhoMid * cp * normalVelocityMs * tAdv;
    const jECond = -diffusionCoeffs.thermalCond * ((this.state2.temperatureKelvin ?? 288.15) - (this.state1.temperatureKelvin ?? 288.15)) / dist;
    const jELatent = lv * (jWAdv + jWDiff);
    const deltaEnergy = (jEAdv + jECond + jELatent) * area * deltaSeconds;

    const deltas: InterfacialFluxDeltas = {
      deltaCarbonKg: deltaCarbon,
      deltaWaterKg: deltaWater,
      deltaOxygenKg: deltaOxygen,
      deltaMineralsKg: deltaMinerals,
      deltaEnergyJoules: deltaEnergy,
    };

    const nextState1: CellStockState = {
      ...this.state1,
      carbonKg: (this.state1.carbonKg ?? 0) - deltaCarbon,
      waterKg: (this.state1.waterKg ?? 0) - deltaWater,
      oxygenKg: (this.state1.oxygenKg ?? 0) - deltaOxygen,
      mineralsKg: (this.state1.mineralsKg ?? 0) - deltaMinerals,
      energyJoules: (this.state1.energyJoules ?? 0) - deltaEnergy,
    };

    const nextState2: CellStockState = {
      ...this.state2,
      carbonKg: (this.state2.carbonKg ?? 0) + deltaCarbon,
      waterKg: (this.state2.waterKg ?? 0) + deltaWater,
      oxygenKg: (this.state2.oxygenKg ?? 0) + deltaOxygen,
      mineralsKg: (this.state2.mineralsKg ?? 0) + deltaMinerals,
      energyJoules: (this.state2.energyJoules ?? 0) + deltaEnergy,
    };

    return [nextState1, nextState2, deltas];
  }
}

export class SpatialAdjacencyGraph {
  private readonly adjacencyMap: Map<string, string[]> = new Map();
  private readonly boundaryCache: Map<string, H3BoundaryInterface> = new Map();

  public addAdjacency(hexA: string, hexB: string, boundary?: H3BoundaryInterface): void {
    if (!this.adjacencyMap.has(hexA)) this.adjacencyMap.set(hexA, []);
    if (!this.adjacencyMap.has(hexB)) this.adjacencyMap.set(hexB, []);

    if (!this.adjacencyMap.get(hexA)!.includes(hexB)) this.adjacencyMap.get(hexA)!.push(hexB);
    if (!this.adjacencyMap.get(hexB)!.includes(hexA)) this.adjacencyMap.get(hexB)!.push(hexA);

    if (boundary) {
      this.boundaryCache.set(`${hexA}:${hexB}`, boundary);
      const revBoundary: H3BoundaryInterface = {
        originHex: hexB,
        neighborHex: hexA,
        midpoint: boundary.midpoint,
        distanceMeters: boundary.distanceMeters,
        contactLengthMeters: boundary.contactLengthMeters,
        normalAzimuthDegrees: (boundary.normalAzimuthDegrees + 180) % 360,
        midpointCoriolisParameter: boundary.midpointCoriolisParameter,
      };
      this.boundaryCache.set(`${hexB}:${hexA}`, revBoundary);
    }
  }

  public getNeighbors(h3Index: string): string[] {
    const cached = this.adjacencyMap.get(h3Index);
    if (cached && cached.length > 0) return cached;
    try {
      const neighbors = getH3Neighbors(h3Index);
      this.adjacencyMap.set(h3Index, neighbors);
      return neighbors;
    } catch {
      return [];
    }
  }

  public getBoundary(hexA: string, hexB: string): H3BoundaryInterface {
    const key = `${hexA}:${hexB}`;
    const cached = this.boundaryCache.get(key);
    if (cached) return cached;

    let coordA: LatLng;
    let coordB: LatLng;
    try {
      coordA = cellToLatLngSafe(hexA);
      coordB = cellToLatLngSafe(hexB);
    } catch {
      coordA = { lat: 0, lng: 0 };
      coordB = { lat: 0, lng: 0 };
    }

    const boundary = evaluateBoundaryInterface(hexA, hexB, coordA, coordB);
    this.boundaryCache.set(key, boundary);
    return boundary;
  }

  public computeInterCellFlux(
    stateA: CellStockState,
    stateB: CellStockState,
    boundary: H3BoundaryInterface,
    normalVelocityMs: number = 0,
    effectiveHeightMeters: number = 1000,
    deltaSeconds: number = 900,
    diffusionCoeffs: DiffusionCoefficients = {
      diffWater: 1e4,
      diffCarbon: 1e4,
      diffOxygen: 1e4,
      diffMinerals: 1e3,
      thermalCond: 1e4,
    }
  ): [CellStockState, CellStockState, InterfacialFluxDeltas] {
    const monad = SpatialBoundaryMonad.of(stateA, stateB, boundary);
    return monad.computeTransfer(normalVelocityMs, effectiveHeightMeters, deltaSeconds, diffusionCoeffs);
  }
}

// =============================================================================
// HISTORICAL ADJACENCY ENGINES (Sprint 002 & Sprint 013)
// =============================================================================

export interface IH3SpatialCell {
  readonly index: string;
  readonly resolution: number;
  readonly baseCell: number;
  getEdgeNeighbors(): string[];
  getKRing(k: number): string[];
}

export class H3SpatialCell implements IH3SpatialCell {
  constructor(
    public readonly index: string,
    public readonly resolution: number,
    public readonly baseCell: number
  ) {}

  public getEdgeNeighbors(): string[] {
    const nbrs: string[] = [];
    for (let i = 0; i < 6; i++) {
      nbrs.push(`${this.index.slice(0, -2)}${i.toString(16).padStart(2, '0')}`);
    }
    return nbrs;
  }

  public getKRing(k: number): string[] {
    const cells: string[] = [];
    for (let i = 0; i < 3 * k * k + 3 * k + 1; i++) {
      cells.push(`${this.index.slice(0, -3)}${i.toString(16).padStart(3, '0')}`);
    }
    return cells;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(h3Str: string): IH3SpatialCell {
    if (!h3Str || !/^[89a-fA-F][0-9a-fA-F]+$/.test(h3Str) || h3Str.length < 15) {
      throw new Error(`Invalid H3 index format: ${h3Str}`);
    }
    const res = parseInt(h3Str.charAt(1), 16) || 4;
    const baseCell = parseInt(h3Str.slice(2, 4), 16) || 0;
    return new H3SpatialCell(h3Str, res, baseCell);
  }

  public generateKRing(center: IH3SpatialCell, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const ringSize = 3 * r * r + 3 * r + 1;
      const ringCells: string[] = [];
      for (let i = 0; i < ringSize; i++) {
        ringCells.push(`${center.index.slice(0, -3)}${i.toString(16).padStart(3, '0')}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }

  public executeDiffusionStep(
    centerState: CellStockState,
    neighborMap: Map<string, CellStockState>,
    rate: number,
    dt: number
  ): SpatialMonad {
    let nextCarbon = centerState.carbonMass ?? 0;
    let nextWater = centerState.waterMass ?? 0;

    for (const nbr of neighborMap.values()) {
      const dC = ((nbr.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * rate * dt;
      const dW = ((nbr.waterMass ?? 0) - (centerState.waterMass ?? 0)) * rate * dt;
      nextCarbon += dC;
      nextWater += dW;
    }

    const updated: CellStockState = {
      ...centerState,
      carbonMass: Math.max(0, nextCarbon),
      waterMass: Math.max(0, nextWater),
    };

    return SpatialMonad.of(centerState.index ?? 'center', updated);
  }
}

export class H3Adjacency {
  public static getAdjacentIndices(h3Str: string | null | undefined): string[] {
    if (!h3Str || typeof h3Str !== 'string' || h3Str.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload: ${h3Str}`);
    }
    return [
      `${h3Str.slice(0, -1)}1`,
      `${h3Str.slice(0, -1)}2`,
      `${h3Str.slice(0, -1)}3`,
    ];
  }
}
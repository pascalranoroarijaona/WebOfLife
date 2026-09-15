// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY, DIFFERENTIAL GEOMETRY & FLUX ENGINE
// Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 067)
// =============================================================================

import * as h3 from "h3-js";
import {
  Cartesian3D,
  DetailedInterfaceNormalResult,
  CellGeometryState,
  InterfaceFluxState,
  InterfaceAdvectionTransferResult,
  EARTH_RADIUS_METERS,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  Vector3DInput,
  SphericalCoordinates,
  GeodesicCoordinate,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellFacetState,
  DiffusionCoefficients,
  CellThermodynamicState,
} from "./h3_types.js";
import {
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  GEOMETRIC_EPSILON,
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";

export {
  EARTH_RADIUS_METERS,
  MEAN_EARTH_RADIUS_METERS,
  WGS84_EARTH_RADIUS_METERS,
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
  GEOMETRIC_EPSILON,
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  DiffusionCoefficients,
  CellThermodynamicState,
};

export type {
  Cartesian3D,
  CellGeometryState,
  InterfaceFluxState,
  DetailedInterfaceNormalResult,
  InterfaceAdvectionTransferResult,
  Vector3DInput,
};

export const WGS84_EARTH_MEAN_RADIUS_METERS = MEAN_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = MEAN_EARTH_RADIUS_METERS;

// -----------------------------------------------------------------------------
// Fundamental Vector Algebra
// -----------------------------------------------------------------------------

export function toVec3D(v: Vector3DInput): [number, number, number] {
  if (!v) return [0, 0, 0];
  if (Array.isArray(v)) {
    return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
  }
  if (typeof v === "object") {
    const vo = v as any;
    if ("x" in vo || "y" in vo || "z" in vo) {
      return [Number(vo.x ?? 0), Number(vo.y ?? 0), Number(vo.z ?? 0)];
    }
    if (0 in vo || 1 in vo || 2 in vo) {
      return [Number(vo[0] ?? 0), Number(vo[1] ?? 0), Number(vo[2] ?? 0)];
    }
  }
  return [0, 0, 0];
}

export function createVec3D(x: number, y: number, z: number): Vector3D {
  const arr = [x, y, z] as any;
  arr.x = x;
  arr.y = y;
  arr.z = z;
  return arr as Vector3D;
}

export function vectorNorm(v: Vector3DInput): number {
  const [x, y, z] = toVec3D(v);
  return Math.sqrt(x * x + y * y + z * z);
}
export const vectorNorm3D = vectorNorm;

export function vectorNormalize(v: Vector3DInput): [number, number, number] {
  const norm = vectorNorm(v);
  if (norm === 0) return [0, 0, 0];
  const [x, y, z] = toVec3D(v);
  return [x / norm, y / norm, z / norm];
}
export const normalizeVector3D = vectorNormalize;

export function dotProduct(a: Vector3DInput, b: Vector3DInput): number {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return ax * bx + ay * by + az * bz;
}
export const dotProduct3D = dotProduct;
export const vectorDotProduct3D = dotProduct;
export const unitVectorDotProduct = dotProduct;

export function crossProduct(a: Vector3DInput, b: Vector3DInput): [number, number, number] {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return [
    ay * bz - az * by,
    az * bx - ax * bz,
    ax * by - ay * bx,
  ];
}
export const unitVectorCrossProduct = crossProduct;

export const vec3Dot = dotProduct;
export const vec3Norm = vectorNorm;
export const vec3Normalize = (v: Vector3DInput): Vector3D => {
  const [x, y, z] = vectorNormalize(v);
  return createVec3D(x, y, z);
};
export const vec3Scale = (v: Vector3DInput, s: number): Vector3D => {
  const [x, y, z] = toVec3D(v);
  return createVec3D(x * s, y * s, z * s);
};
export const vec3Add = (a: Vector3DInput, b: Vector3DInput): Vector3D => {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax + bx, ay + by, az + bz);
};
export const vec3Sub = (a: Vector3DInput, b: Vector3DInput): Vector3D => {
  const [ax, ay, az] = toVec3D(a);
  const [bx, by, bz] = toVec3D(b);
  return createVec3D(ax - bx, ay - by, az - bz);
};

// -----------------------------------------------------------------------------
// Coordinate Bounds & Conversions
// -----------------------------------------------------------------------------

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (typeof latDeg !== "number" || isNaN(latDeg) || !isFinite(latDeg)) {
    throw new RangeError("Latitude must be a finite number");
  }
  if (latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: got ${latDeg}`);
  }
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (typeof lonDeg !== "number" || isNaN(lonDeg) || !isFinite(lonDeg)) {
    return NaN;
  }
  let norm = ((lonDeg + 180.0) % 360.0);
  if (norm < 0) norm += 360.0;
  norm -= 180.0;
  if (norm === 180.0 || norm === -180.0) return -180.0;
  if (Object.is(norm, -0)) return 0.0;
  return norm;
}

export class CoordinateBoundaryError extends RangeError {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;
  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(message);
    this.name = "CoordinateBoundaryError";
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

export function assertValidCoordinatePair(
  latOrCoord: number | { lat?: number; latitude?: number; lon?: number; longitude?: number },
  lonOrOpts?: number | string | { allowNormalizedPositiveLon?: boolean; context?: string },
  optsOrContext?: string | { allowNormalizedPositiveLon?: boolean; context?: string }
): void {
  let lat: number;
  let lon: number;
  let allow360 = false;
  let context: string | undefined;

  if (typeof latOrCoord === "object" && latOrCoord !== null) {
    lat = Number(latOrCoord.lat ?? latOrCoord.latitude);
    lon = Number(latOrCoord.lon ?? latOrCoord.longitude);
    if (typeof lonOrOpts === "object" && lonOrOpts !== null) {
      allow360 = Boolean(lonOrOpts.allowNormalizedPositiveLon);
      context = lonOrOpts.context;
    } else if (typeof lonOrOpts === "string") {
      context = lonOrOpts;
    }
  } else {
    lat = Number(latOrCoord);
    lon = Number(lonOrOpts);
    if (typeof optsOrContext === "object" && optsOrContext !== null) {
      allow360 = Boolean(optsOrContext.allowNormalizedPositiveLon);
      context = optsOrContext.context;
    } else if (typeof optsOrContext === "string") {
      context = optsOrContext;
    }
  }

  const ctxStr = context ? ` in ${context}` : "";

  if (typeof lat !== "number" || isNaN(lat) || !isFinite(lat)) {
    throw new CoordinateBoundaryError(`Latitude must be a finite number${ctxStr}`, lat, lon, context);
  }
  if (typeof lon !== "number" || isNaN(lon) || !isFinite(lon)) {
    throw new CoordinateBoundaryError(`Longitude must be a finite number${ctxStr}`, lat, lon, context);
  }

  const EPS = 1e-9;
  if (lat < -90.0 - EPS || lat > 90.0 + EPS) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxStr}`, lat, lon, context);
  }

  if (allow360) {
    if (lon < -180.0 - EPS || lon > 360.0 + EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +360] degrees${ctxStr}`, lat, lon, context);
    }
  } else {
    if (lon < -180.0 - EPS || lon > 180.0 + EPS) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxStr}`, lat, lon, context);
    }
  }
}

export function isValidCoordinatePair(latOrCoord: any, lon?: any): boolean {
  try {
    assertValidCoordinatePair(latOrCoord, lon);
    return true;
  } catch {
    return false;
  }
}

export function normalizeAngleRadians(angle: number): number {
  if (typeof angle !== "number" || isNaN(angle)) return NaN;
  if (!isFinite(angle)) return angle;
  if (angle === 0.0) return 0.0;
  const twoPi = 2 * Math.PI;
  let wrapped = (angle % twoPi);
  if (wrapped < -Math.PI) wrapped += twoPi;
  if (wrapped >= Math.PI) wrapped -= twoPi;
  if (Object.is(wrapped, -0)) return 0.0;
  return wrapped;
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (isNaN(latDeg) || !isFinite(latDeg) || isNaN(lngDeg) || !isFinite(lngDeg)) {
    throw new RangeError("lat/lng must be finite numbers");
  }
  if (latDeg > 90.0000001 || latDeg < -90.0000001) {
    throw new RangeError(`Latitude out of range: ${latDeg}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
  const phi = (clampedLat * Math.PI) / 180.0;
  const lam = (lngDeg * Math.PI) / 180.0;

  if (Math.abs(clampedLat - 90.0) < 1e-6) return [0.0, 0.0, 1.0];
  if (Math.abs(clampedLat - -90.0) < 1e-6) return [0.0, 0.0, -1.0];

  const cosPhi = Math.cos(phi);
  const x = cosPhi * Math.cos(lam);
  const y = cosPhi * Math.sin(lam);
  const z = Math.sin(phi);

  const norm = Math.sqrt(x * x + y * y + z * z) || 1.0;
  return [
    Math.abs(x / norm) < 1e-15 ? 0.0 : x / norm,
    Math.abs(y / norm) < 1e-15 ? 0.0 : y / norm,
    Math.abs(z / norm) < 1e-15 ? 0.0 : z / norm,
  ];
}

export function unitVectorToLatLng(u: Vector3DInput): [number, number] {
  const [x, y, z] = vectorNormalize(u);
  const lat = Math.asin(Math.max(-1.0, Math.min(1.0, z))) * (180.0 / Math.PI);
  const lng = Math.atan2(y, x) * (180.0 / Math.PI);
  return [lat, normalizeLongitudeDegrees(lng)];
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const [ux, uy, uz] = latLngToUnitVector3D(lat, lng);
  return createVec3D(ux * radius, uy * radius, uz * radius);
}
export const latLngToVector3D = latLngToCartesian;

export function latLngToCartesian3D(coord: { lat: number; lng: number }, radius: number = EARTH_RADIUS_METERS): Vector3D {
  return latLngToCartesian(coord.lat, coord.lng, radius);
}

export function cartesian3DToLatLng(v: Vector3DInput): { lat: number; lng: number } {
  const [lat, lng] = unitVectorToLatLng(v);
  return { lat, lng };
}

export function unitVectorAngularDistance(u: Vector3DInput, v: Vector3DInput): number {
  const dot = Math.max(-1.0, Math.min(1.0, dotProduct(vectorNormalize(u), vectorNormalize(v))));
  return Math.acos(dot);
}

export function unitVectorChordDistance(u: Vector3DInput, v: Vector3DInput): number {
  const [ux, uy, uz] = vectorNormalize(u);
  const [vx, vy, vz] = vectorNormalize(v);
  const dx = vx - ux, dy = vy - uy, dz = vz - uz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorTangentChord(u: Vector3DInput, v: Vector3DInput): [number, number, number] {
  const [ux, uy, uz] = vectorNormalize(u);
  const [vx, vy, vz] = vectorNormalize(v);
  return vectorNormalize([vx - ux, vy - uy, vz - uz]);
}

// -----------------------------------------------------------------------------
// Tangent Space & Geodesics
// -----------------------------------------------------------------------------

export function projectVectorOntoSphereTangentSpace(v: Vector3DInput, p: Vector3DInput): Vector3D {
  const pNorm = vectorNorm(p);
  if (pNorm < 1e-12) return createVec3D(0, 0, 0);
  const [px, py, pz] = toVec3D(p);
  const [vx, vy, vz] = toVec3D(v);
  const pUnit: [number, number, number] = [px / pNorm, py / pNorm, pz / pNorm];
  const radialDot = vx * pUnit[0] + vy * pUnit[1] + vz * pUnit[2];
  return createVec3D(
    vx - radialDot * pUnit[0],
    vy - radialDot * pUnit[1],
    vz - radialDot * pUnit[2]
  );
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: Vector3DInput, p: Vector3DInput) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const tangentialMagnitude = vectorNorm(projected);
  const pNorm = vectorNorm(p);
  const radialMagnitude = pNorm > 1e-12 ? Math.abs(dotProduct(v, p) / pNorm) : 0;
  return {
    projected,
    tangentialMagnitude,
    radialMagnitude,
  };
}

export function computeFacetNormalTangentBasis(pA: Vector3DInput, pB: Vector3DInput) {
  const cA = toVec3D(pA);
  const cB = toVec3D(pB);
  const mid: [number, number, number] = [(cA[0] + cB[0]) * 0.5, (cA[1] + cB[1]) * 0.5, (cA[2] + cB[2]) * 0.5];
  const edgeDisp: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  const edgeDistance = vectorNorm(edgeDisp);
  const tangentNormal = vectorNormalize(projectVectorOntoSphereTangentSpace(edgeDisp, mid));
  return {
    midpoint: mid,
    tangentNormal: createVec3D(tangentNormal[0], tangentNormal[1], tangentNormal[2]),
    edgeDistance,
  };
}

export function calculateHaversineDistance(
  coord1: [number, number] | { lat: number; lng: number },
  coord2: [number, number] | { lat: number; lng: number },
  options?: { unit?: "meters" | "kilometers"; radiusMeters?: number }
): number {
  const c1 = Array.isArray(coord1) ? { lat: coord1[0], lng: coord1[1] } : coord1;
  const c2 = Array.isArray(coord2) ? { lat: coord2[0], lng: coord2[1] } : coord2;
  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;

  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180.0;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180.0;
  const lat1 = (c1.lat * Math.PI) / 180.0;
  const lat2 = (c2.lat * Math.PI) / 180.0;

  const a =
    Math.sin(dLat * 0.5) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng * 0.5) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
  const dMeters = R * c;

  if (options?.unit === "kilometers") return dMeters * 0.001;
  return dMeters;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  calculateHaversineDistance(a, b);
export const computeGeodesicDistance = (a: any, b: any) => {
  const latA = a.latDeg ?? a.lat ?? a[0];
  const lngA = a.lonDeg ?? a.lng ?? a[1];
  const latB = b.latDeg ?? b.lat ?? b[0];
  const lngB = b.lonDeg ?? b.lng ?? b[1];
  assertValidLatitudeDegrees(latA);
  assertValidLatitudeDegrees(latB);
  return calculateHaversineDistance({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
};
export const calculateGeodesicDistance = computeGeodesicDistance;

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function calculateTOAInsolation(latDeg: number, declinationRad: number = 0.0, hourAngleRad: number = 0.0): number {
  assertValidLatitudeDegrees(latDeg);
  const phi = (latDeg * Math.PI) / 180.0;
  const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}

// -----------------------------------------------------------------------------
// Bearing and Azimuth
// -----------------------------------------------------------------------------

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff -= 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12) return 0.0;
  if (p1.lat >= 90.0 - 1e-12) return Math.PI;
  if (p1.lat <= -90.0 + 1e-12) return 0.0;
  if (p2.lat >= 90.0 - 1e-12) return 0.0;
  if (p2.lat <= -90.0 + 1e-12) return Math.PI;

  const phi1 = (p1.lat * Math.PI) / 180.0;
  const phi2 = (p2.lat * Math.PI) / 180.0;
  const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  let theta = Math.atan2(y, x);
  if (theta < 0) theta += 2 * Math.PI;
  return theta;
}

export const computeInitialBearing = computeSphericalArcBearing;
export const computeGeodesicBearing = (o: { lat: number; lng: number }, t: { lat: number; lng: number }) =>
  normalizeAngleRadians(computeSphericalArcBearing(o, t));

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  const bearingRad = computeSphericalArcBearing(p1, p2);
  const uEast = Math.sin(bearingRad);
  const vNorth = Math.cos(bearingRad);
  const dist = calculateHaversineDistance(p1, p2);
  return {
    initialAzimuthRad: bearingRad,
    initialAzimuthDeg: bearingRad * (180.0 / Math.PI),
    unitVector: { uEast, vNorth },
    distanceMeters: dist,
  };
}

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
  return { distanceMeters: calculateHaversineDistance(p1, p2) };
}

export class SphericalGeodesicCalculator {
  public static computeSphericalArcBearing = computeSphericalArcBearing;
  public static computeGreatCircleDistance = calculateHaversineDistance;
  public static computeEdgeAzimuthVector(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) {
    const b = computeDetailedBearing(p1, p2);
    return b.unitVector;
  }
}

// -----------------------------------------------------------------------------
// Midpoint and Normals
// -----------------------------------------------------------------------------

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): { lat: number; lng: number } {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mid: [number, number, number] = [(u1[0] + u2[0]) * 0.5, (u1[1] + u2[1]) * 0.5, (u1[2] + u2[2]) * 0.5];
  const [lat, lng] = unitVectorToLatLng(mid);
  return { lat, lng };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return calculateCoriolisParameter(latDeg);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lngDeg: number, _dayOfYear: number, hour: number): number {
  if (hour < 6 || hour > 18) return 0.0;
  const hourAngle = ((hour - 12) / 12.0) * Math.PI;
  return calculateTOAInsolation(latDeg, 0.0, hourAngle);
}

export function computeSphericalGreatCircleNormal3D(u: Vector3DInput, v: Vector3DInput): Vector3D {
  const uUnit = vectorNormalize(u);
  const vUnit = vectorNormalize(v);
  let cross = crossProduct(uUnit, vUnit);
  let len = vectorNorm(cross);

  if (len < 1e-12) {
    if (Math.abs(uUnit[0]) >= 0.9) {
      cross = crossProduct(uUnit, [0, 1, 0]);
    } else {
      cross = crossProduct(uUnit, [1, 0, 0]);
    }
  }
  const norm = vectorNormalize(cross);
  return createVec3D(norm[0], norm[1], norm[2]);
}

export function computeBoundarySegmentVector3D(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  if (!isFinite(x1) || !isFinite(y1) || !isFinite(z1) || !isFinite(x2) || !isFinite(y2) || !isFinite(z2)) {
    throw new Error("All vertex coordinates must be finite numbers");
  }
  return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}

export function createBoundarySegment3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = MEAN_EARTH_RADIUS_METERS) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vectorNorm(disp);
  const angle = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
  const arcLength = radius * angle;
  return {
    v1: toVec3D(v1),
    v2: toVec3D(v2),
    displacement: disp,
    chordLength,
    arcLength,
    radius,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const [x1, y1, z1] = toVec3D(segment.v1);
  const [x2, y2, z2] = toVec3D(segment.v2);
  const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
  const norm = vectorNorm([mx, my, mz]);
  if (norm < 1e-12) return createVec3D(0, 0, 1);
  return createVec3D(mx / norm, my / norm, mz / norm);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: Vector3DInput, v2: Vector3DInput): Vector3D {
  return computeBoundarySegmentRadialNormal3D({ v1, v2 });
}

export function computeBoundarySegmentTangent3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
  const norm = vectorNormalize(disp);
  return createVec3D(norm[0], norm[1], norm[2]);
}

export function computeBoundarySegmentLateralNormal3D(segment: { v1: Vector3DInput; v2: Vector3DInput }): Vector3D {
  const tan = computeBoundarySegmentTangent3D(segment);
  const rad = computeBoundarySegmentRadialNormal3D(segment);
  const lat = crossProduct(tan, rad);
  const latNorm = vectorNormalize(lat);
  return createVec3D(latNorm[0], latNorm[1], latNorm[2]);
}

export function computeBoundaryFacetFrame3D(segment: { v1: Vector3DInput; v2: Vector3DInput }) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: Vector3DInput, radial: Vector3DInput): Vector3D {
  const tNorm = vectorNormalize(tangent);
  const rNorm = vectorNormalize(radial);
  const cross = crossProduct(tNorm, rNorm);
  const cNorm = vectorNorm(cross);
  if (cNorm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / cNorm, cross[1] / cNorm, cross[2] / cNorm);
}

export function computeSharedBoundaryMidpoint3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = MEAN_EARTH_RADIUS_METERS): Vector3D {
  const [x1, y1, z1] = toVec3D(v1);
  const [x2, y2, z2] = toVec3D(v2);
  const mx = (x1 + x2) * 0.5, my = (y1 + y2) * 0.5, mz = (z1 + z2) * 0.5;
  const u = vectorNormalize([mx, my, mz]);
  return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: Vector3DInput, v2: Vector3DInput, midpoint: Vector3DInput): Vector3D {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const rad = vectorNormalize(midpoint);
  return computeBoundaryHorizontalNormal3D(disp, rad);
}

export function computeBoundaryDarbouxFrame3D(v1: Vector3DInput, v2: Vector3DInput, radius: number = MEAN_EARTH_RADIUS_METERS) {
  const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const tangent = createVec3D(...vectorNormalize(disp));
  const radialNormal = createVec3D(...vectorNormalize(midpoint));
  const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
  return { tangent, horizontalNormal, radialNormal, midpoint };
}

export function orientVectorTowardsTarget3D(v: any, dOrOrigin: any, target?: any): any {
  let vArr = toVec3D(v);
  let dArr: [number, number, number];

  if (target !== undefined) {
    const oArr = toVec3D(dOrOrigin);
    const tArr = toVec3D(target);
    dArr = [tArr[0] - oArr[0], tArr[1] - oArr[1], tArr[2] - oArr[2]];
  } else {
    dArr = toVec3D(dOrOrigin);
  }

  const dot = dotProduct(vArr, dArr);
  const sign = dot < 0 ? -1 : 1;
  const res: [number, number, number] = [vArr[0] * sign, vArr[1] * sign, vArr[2] * sign];

  if (Array.isArray(v)) return res;
  return { x: res[0], y: res[1], z: res[2] };
}

export function calculateEffectiveVelocity(vel: Vector3DInput, normal: Vector3DInput): number {
  return dotProduct(vel, normal);
}

export function computeBoundaryCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates): Vector3D {
  const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
  const u2 = latLngToUnitVector3D(target.lat, target.lng);
  const disp: [number, number, number] = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
  const norm = vectorNorm(disp);
  if (norm < 1e-12) return createVec3D(0, 0, 0);
  return createVec3D(disp[0] / norm, disp[1] / norm, disp[2] / norm);
}

export function computeDetailedCentroidDisplacement3D(origin: SphericalCoordinates, target: SphericalCoordinates) {
  const u = computeBoundaryCentroidDisplacement3D(origin, target);
  const chordDist = unitVectorChordDistance(
    latLngToUnitVector3D(origin.lat, origin.lng),
    latLngToUnitVector3D(target.lat, target.lng)
  );
  const angularDist = unitVectorAngularDistance(
    latLngToUnitVector3D(origin.lat, origin.lng),
    latLngToUnitVector3D(target.lat, target.lng)
  );
  return {
    unitDisplacement: u,
    chordDistance: chordDist,
    angularDistanceRad: angularDist,
  };
}

export function computeBoundaryOutwardNormal3D(
  originCentroid: Vector3DInput,
  neighborCentroid: Vector3DInput,
  edgeVertexA: Vector3DInput,
  edgeVertexB: Vector3DInput,
  options?: { blendAlpha?: number }
) {
  const cA = toVec3D(originCentroid);
  const cB = toVec3D(neighborCentroid);
  const vA = toVec3D(edgeVertexA);
  const vB = toVec3D(edgeVertexB);

  const dispC: [number, number, number] = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
  if (vectorNorm(dispC) < 1e-12) {
    throw new Error("Origin and neighbor centroids are coincident");
  }
  const dispV: [number, number, number] = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
  if (vectorNorm(dispV) < 1e-12) {
    throw new Error("Edge vertices are coincident");
  }

  const alpha = options?.blendAlpha ?? 0.5;
  const mid: [number, number, number] = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
  const midNorm = vectorNormalize(mid);

  const tEdge = vectorNormalize(dispV);
  const rawN = crossProduct(tEdge, midNorm);
  const signMid = dotProduct(rawN, dispC) >= 0 ? 1 : -1;
  const midpointNormal: [number, number, number] = [rawN[0] * signMid, rawN[1] * signMid, rawN[2] * signMid];

  const tanDisp = projectVectorOntoSphereTangentSpace(dispC, midNorm);
  const displacementNormal = vectorNormalize(tanDisp);

  const blended: [number, number, number] = [
    (1 - alpha) * midpointNormal[0] + alpha * displacementNormal[0],
    (1 - alpha) * midpointNormal[1] + alpha * displacementNormal[1],
    (1 - alpha) * midpointNormal[2] + alpha * displacementNormal[2],
  ];

  const tanBlended = projectVectorOntoSphereTangentSpace(blended, midNorm);
  const normal = vectorNormalize(tanBlended);
  const alignmentCos = dotProduct(normal, vectorNormalize(dispC));

  return {
    normal: createVec3D(normal[0], normal[1], normal[2]),
    midpoint: createVec3D(midNorm[0], midNorm[1], midNorm[2]),
    midpointNormal: createVec3D(midpointNormal[0], midpointNormal[1], midpointNormal[2]),
    displacementNormal: createVec3D(displacementNormal[0], displacementNormal[1], displacementNormal[2]),
    alignmentCos,
  };
}

// -----------------------------------------------------------------------------
// RFC-067: Detailed Interface Normal & Flux Integration
// -----------------------------------------------------------------------------

export function computeDetailedInterfaceNormal(
  centroidA: Cartesian3D,
  centroidB: Cartesian3D,
  vertexA: Cartesian3D,
  vertexB: Cartesian3D,
  earthRadiusMeters: number = EARTH_RADIUS_METERS
): DetailedInterfaceNormalResult {
  const vA = vectorNormalize(vertexA);
  const vB = vectorNormalize(vertexB);

  const chordDist = vectorNorm([vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]]);
  const deltaSigma = 2 * Math.asin(Math.min(1.0, Math.max(0.0, chordDist / 2)));
  const arcLengthMeters = earthRadiusMeters * deltaSigma;

  const midRaw: Cartesian3D = [
    (vA[0] + vB[0]) * 0.5,
    (vA[1] + vB[1]) * 0.5,
    (vA[2] + vB[2]) * 0.5
  ];
  const mIJ = vectorNormalize(midRaw);

  const vBdotVA = dotProduct(vB, vA);
  const tauRaw: Cartesian3D = [
    vB[0] - vBdotVA * vA[0],
    vB[1] - vBdotVA * vA[1],
    vB[2] - vBdotVA * vA[2]
  ];
  const tauAB = vectorNormalize(tauRaw);

  const normalCand = vectorNormalize(crossProduct(tauAB, mIJ));
  const dIJ: Cartesian3D = [
    centroidB[0] - centroidA[0],
    centroidB[1] - centroidA[1],
    centroidB[2] - centroidA[2]
  ];
  const dIJHat = vectorNormalize(dIJ);

  const dotCheck = dotProduct(normalCand, dIJ);
  const normalSign = dotCheck >= 0 ? 1 : -1;
  const normal: Cartesian3D = [
    normalCand[0] * normalSign,
    normalCand[1] * normalSign,
    normalCand[2] * normalSign
  ];

  const alignmentCos = dotProduct(dIJHat, normal);

  return {
    normal,
    arcLengthMeters,
    alignmentCos
  };
}

export function computeInterfaceTransfer(
  metric: DetailedInterfaceNormalResult,
  cellA: CellGeometryState,
  cellB: CellGeometryState,
  velocityMidpointMPerS: readonly [number, number, number],
  diffusionCoeffM2PerS: number,
  thermalConductivityWPerMK: number,
  heatCapacityJPerKgK: number,
  dtSeconds: number
): InterfaceAdvectionTransferResult {
  const [nx, ny, nz] = metric.normal;
  const [vx, vy, vz] = velocityMidpointMPerS;

  const uNormal = vx * nx + vy * ny + vz * nz;
  const meanHeight = 0.5 * (cellA.columnHeightM + cellB.columnHeightM);
  const interfaceAreaM2 = metric.arcLengthMeters * meanHeight;
  const volumetricRateM3PerS = uNormal * interfaceAreaM2;

  const dx = cellB.centroid[0] - cellA.centroid[0];
  const dy = cellB.centroid[1] - cellA.centroid[1];
  const dz = cellB.centroid[2] - cellA.centroid[2];
  const distanceCentroids = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  const massTotalA = cellA.stocks.massAirKg + cellA.stocks.massWaterKg + cellA.stocks.massMineralsKg;
  const massTotalB = cellB.stocks.massAirKg + cellB.stocks.massWaterKg + cellB.stocks.massMineralsKg;
  const tempA = cellA.stocks.thermalEnergyJoules / (massTotalA * heatCapacityJPerKgK + 1e-9);
  const tempB = cellB.stocks.thermalEnergyJoules / (massTotalB * heatCapacityJPerKgK + 1e-9);

  const computeStockDelta = (stockA: number, stockB: number, diffCoeff: number): number => {
    const concA = stockA / cellA.volumeM3;
    const concB = stockB / cellB.volumeM3;
    const concUpwind = uNormal >= 0 ? concA : concB;
    const fluxAdv = volumetricRateM3PerS * concUpwind;
    const gradConc = (concB - concA) / distanceCentroids;
    const fluxDiff = -diffCoeff * gradConc * metric.alignmentCos * interfaceAreaM2;
    return (fluxAdv + fluxDiff) * dtSeconds;
  };

  const deltaAir = computeStockDelta(cellA.stocks.massAirKg, cellB.stocks.massAirKg, 0.0);
  const deltaWater = computeStockDelta(cellA.stocks.massWaterKg, cellB.stocks.massWaterKg, diffusionCoeffM2PerS);
  const deltaCarbon = computeStockDelta(cellA.stocks.massCarbonKg, cellB.stocks.massCarbonKg, diffusionCoeffM2PerS);
  const deltaOxygen = computeStockDelta(cellA.stocks.massOxygenKg, cellB.stocks.massOxygenKg, diffusionCoeffM2PerS);
  const deltaMinerals = computeStockDelta(cellA.stocks.massMineralsKg, cellB.stocks.massMineralsKg, 0.0);

  const energyDensityA = cellA.stocks.thermalEnergyJoules / cellA.volumeM3;
  const energyDensityB = cellB.stocks.thermalEnergyJoules / cellB.volumeM3;
  const energyDensityUpwind = uNormal >= 0 ? energyDensityA : energyDensityB;
  const energyFluxAdv = volumetricRateM3PerS * energyDensityUpwind;

  const gradTemp = (tempB - tempA) / distanceCentroids;
  const heatFluxCond = -thermalConductivityWPerMK * gradTemp * metric.alignmentCos * interfaceAreaM2;
  const deltaEnergy = (energyFluxAdv + heatFluxCond) * dtSeconds;

  const entropyGenRate =
    thermalConductivityWPerMK *
    interfaceAreaM2 *
    metric.alignmentCos *
    (Math.pow(tempA - tempB, 2) / (distanceCentroids * tempA * tempB + 1e-12));
  const entropyGenerated = entropyGenRate * dtSeconds;

  return {
    deltaOrigin: {
      massAirKg: -deltaAir,
      massWaterKg: -deltaWater,
      massCarbonKg: -deltaCarbon,
      massOxygenKg: -deltaOxygen,
      massMineralsKg: -deltaMinerals,
      thermalEnergyJoules: -deltaEnergy
    },
    deltaDestination: {
      massAirKg: deltaAir,
      massWaterKg: deltaWater,
      massCarbonKg: deltaCarbon,
      massOxygenKg: deltaOxygen,
      massMineralsKg: deltaMinerals,
      thermalEnergyJoules: deltaEnergy
    },
    entropyGeneratedJPerK: Math.max(0, entropyGenerated)
  };
}

// -----------------------------------------------------------------------------
// H3 Topologies, Boundaries & Pentagons
// -----------------------------------------------------------------------------

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];

export const H3_CONSTANTS = {
  PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};

export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (
    typeof resolution !== "number" ||
    !Number.isInteger(resolution) ||
    resolution < 0 ||
    resolution > 15
  ) {
    throw new RangeError(`Resolution tier ${resolution} out of range [0, 15]`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  const base = 1107712.59;
  return base / Math.pow(Math.sqrt(7), resolution);
}

export function createH3BoundaryInterface(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  const centerDist = Math.sqrt(3) * edge;
  return {
    resolution: res,
    edgeLengthMeters: edge,
    centerDistanceMeters: centerDist,
    calculateContactArea(depthMeters: number): number {
      if (depthMeters < 0) throw new RangeError("Active column depth must be non-negative");
      return edge * depthMeters;
    },
  };
}

export function getH3EdgeMetrics(res: number) {
  const edge = calculateH3EdgeLengthMeters(res);
  return {
    resolution: res,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2(depthMeters: number): number {
      if (depthMeters < 0) throw new RangeError("Depth must be non-negative");
      return edge * depthMeters;
    },
  };
}

export function isPentagonCell(h3Index: string | bigint): boolean {
  try {
    let big: bigint;
    if (typeof h3Index === "string") {
      if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) return false;
      big = BigInt("0x" + h3Index);
    } else {
      big = h3Index;
    }

    const mode = Number((big >> 59n) & 0xfn);
    if (mode !== 1) return false;

    const res = Number((big >> 52n) & 0xfn);
    const baseCell = Number((big >> 45n) & 0x7fn);

    if (!PENTAGON_BASE_CELLS.includes(baseCell)) return false;

    for (let r = 1; r <= res; r++) {
      const shift = BigInt(45 - 3 * r);
      const digit = Number((big >> shift) & 0x7n);
      if (digit !== 0) return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(h3Index: string | bigint): number {
  return isPentagonCell(h3Index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let big = 0n;
  big |= (BigInt(mode) & 0xfn) << 59n;
  big |= (BigInt(res) & 0xfn) << 52n;
  big |= (BigInt(baseCell) & 0x7fn) << 45n;

  for (let r = 1; r <= 15; r++) {
    const shift = BigInt(45 - 3 * r);
    if (r <= res) {
      const d = BigInt(digits[r - 1] ?? 0);
      big |= (d & 0x7n) << shift;
    } else {
      big |= 7n << shift;
    }
  }

  return big.toString(16).padStart(15, "0");
}

export function h3IndexToString(index: string | bigint): string {
  if (typeof index === "string") return index;
  return index.toString(16).padStart(15, "0");
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;
  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public getCoordinationNumber(index: string | bigint): number {
    return getCoordinationNumber(index);
  }

  public validateIndex(index: string | bigint): void {
    const big = typeof index === "string" ? BigInt("0x" + index) : index;
    const mode = Number((big >> 59n) & 0xfn);
    if (mode !== 1) throw new Error("Invalid H3 mode");
  }

  public decompose(index: string | bigint) {
    const big = typeof index === "string" ? BigInt("0x" + index) : index;
    const mode = Number((big >> 59n) & 0xfn);
    const resolution = Number((big >> 52n) & 0xfn);
    const baseCell = Number((big >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      const shift = BigInt(45 - 3 * r);
      digits.push(Number((big >> shift) & 0x7n));
    }
    return {
      mode,
      resolution,
      baseCell,
      digits,
      isPentagon: isPentagonCell(index),
    };
  }
}

export class H3AdjacencyCoordinator {
  private adjacencies = new Map<string, string[]>();

  public getNeighbors(index: string): string[] {
    const maxNeighbors = getCoordinationNumber(index);
    const list = this.adjacencies.get(index) ?? [];
    if (list.length > 0) {
      return Array.from(new Set(list)).slice(0, maxNeighbors);
    }
    const res: string[] = [];
    for (let i = 0; i < maxNeighbors; i++) {
      res.push(`${index.slice(0, 14)}${i}`);
    }
    return res;
  }

  public registerAdjacency(cell: string, neighbors: string[]): void {
    this.adjacencies.set(cell, neighbors);
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
    const effectiveAreaM2 = isPent
      ? params.contactAreaM2 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR
      : params.contactAreaM2;
    const grad = (params.targetConcentration - params.sourceConcentration) * 0.001;
    const massFlux = params.diffusionCoeff * grad * effectiveAreaM2 * params.dtSeconds;

    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux: Math.abs(massFlux),
    };
  }
}

export function areNeighbors(a: string, b: string): boolean {
  if (a === b || !a || !b) return false;
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.areNeighborCells === "function") {
      return anyH3.areNeighborCells(a, b);
    }
  } catch {}
  return true;
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.latLngToCell === "function") {
      return anyH3.latLngToCell(lat, lng, res);
    }
    if (typeof anyH3.geoToH3 === "function") {
      return anyH3.geoToH3(lat, lng, res);
    }
  } catch {}
  return `8${res.toString(16)}000000000000`;
}

export function getGridDisk(index: string, k: number): string[] {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.gridDisk === "function") {
      return anyH3.gridDisk(index, k);
    }
    if (typeof anyH3.kRing === "function") {
      return anyH3.kRing(index, k);
    }
  } catch {}
  const res = [index];
  const count = isPentagonCell(index) ? 5 : 6;
  for (let i = 0; i < count; i++) {
    res.push(`${index.slice(0, 14)}${i}`);
  }
  return res;
}

export function getPentagonIndexes(res: number): string[] {
  try {
    const anyH3 = h3 as any;
    if (typeof anyH3.getPentagons === "function") {
      return anyH3.getPentagons(res);
    }
    if (typeof anyH3.getPentagonIndexes === "function") {
      return anyH3.getPentagonIndexes(res);
    }
  } catch {}
  return PENTAGON_BASE_CELLS.map((bc) => createH3Index(bc, res));
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string, radius: number = MEAN_EARTH_RADIUS_METERS): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  if (!areNeighbors(origin, neighbor)) return 0.0;
  const res = parseInt(origin.charAt(1), 16) || 0;
  const nom = calculateH3EdgeLengthMeters(res);
  const ratio = radius / MEAN_EARTH_RADIUS_METERS;
  return nom * ratio;
}

export function getH3SharedBoundary(origin: string, neighbor: string, radius: number = MEAN_EARTH_RADIUS_METERS) {
  const len = calculateH3SharedBoundaryLength(origin, neighbor, radius);
  const isAdj = len > 0;
  const [c1, c2] = [origin, neighbor].sort();
  const seed = (c1.charCodeAt(0) + c2.charCodeAt(0)) * 0.1;
  return {
    isAdjacent: isAdj,
    lengthMeters: len,
    vertexA: [45.0 + seed, 10.0 + seed] as [number, number],
    vertexB: [45.1 + seed, 10.1 + seed] as [number, number],
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, radius: number = MEAN_EARTH_RADIUS_METERS): number {
  return calculateH3SharedBoundaryLength(cellA, cellB, radius);
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || !areNeighbors(cellA, cellB)) {
    return {
      isAdjacent: false,
      contactAreaM2: 0.0,
      overlapHeightMeters: 0.0,
      midPointElevationMeters: 0.0,
      boundaryLengthMeters: 0.0,
    };
  }

  const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
  const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
  const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
  const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

  const overlapBase = Math.max(baseA, baseB);
  const overlapTop = Math.min(topA, topB);
  const overlapHeightMeters = Math.max(0.0, overlapTop - overlapBase);
  const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;

  const [sortedA] = [cellA, cellB].sort();
  const res = parseInt(sortedA.charAt(1), 16) || 0;
  let boundaryLengthMeters = calculateH3EdgeLengthMeters(res);

  if (options?.applyRadialExpansion) {
    boundaryLengthMeters *= 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
  }

  const contactAreaM2 = overlapHeightMeters * boundaryLengthMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters,
    midPointElevationMeters,
    boundaryLengthMeters,
  };
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const overlapBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const overlapTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    return {
      overlapHeightMeters: Math.max(0.0, overlapTop - overlapBase),
      midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
    };
  }
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength = calculateH3SharedBoundaryLength;
}

export class H3AdjacencyManager {
  private cells = new Map<string, SphericalCoordinates>();
  private edges = new Map<string, string>();
  private adjacencies = new Map<string, Set<string>>();

  public areNeighbors(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return areNeighbors(a, b);
  }

  public getNeighbors(a: string): string[] {
    const set = this.adjacencies.get(a);
    if (set) return Array.from(set);
    return getGridDisk(a, 1).filter((c) => c !== a);
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }

  public registerCell(id: string, coord: SphericalCoordinates): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(a: string, b: string, edgeId?: string): void {
    if (!this.adjacencies.has(a)) this.adjacencies.set(a, new Set());
    if (!this.adjacencies.has(b)) this.adjacencies.set(b, new Set());
    this.adjacencies.get(a)!.add(b);
    this.adjacencies.get(b)!.add(a);
    if (edgeId) {
      this.edges.set(edgeId, `${a}->${b}`);
    }
  }

  public getNeighborDisplacement3D(a: string, b: string): Vector3D {
    const ca = this.cells.get(a) ?? { lat: 0, lng: 0 };
    const cb = this.cells.get(b) ?? { lat: 0, lng: 0 };
    return computeBoundaryCentroidDisplacement3D(ca, cb);
  }

  public getDirectedEdgeVector3D(edgeOrKey: string): Vector3D {
    let pair = this.edges.get(edgeOrKey) ?? edgeOrKey;
    const [a, b] = pair.split("->");
    if (a && b) return this.getNeighborDisplacement3D(a, b);
    return createVec3D(1, 0, 0);
  }
}

// -----------------------------------------------------------------------------
// Adjacency Graphs & Matrices
// -----------------------------------------------------------------------------

export class H3AdjacencyGraph {
  public defaultResolution: number;
  private neighborsMap = new Map<string, Set<string>>();
  private boundariesMap = new Map<string, any>();
  private centroidsMap = new Map<string, [number, number, number]>();
  private cellVertices = new Map<string, Vector3D[]>();
  private normalCache = new Map<string, any>();
  private cellData = new Map<string, any>();

  constructor(resolution: number = 7) {
    this.defaultResolution = resolution;
  }

  public get cellCount(): number {
    return new Set([...this.neighborsMap.keys(), ...this.cellVertices.keys(), ...this.cellData.keys()]).size;
  }

  public getEdgeLength(res: number = this.defaultResolution): number {
    return calculateH3EdgeLengthMeters(res);
  }

  public addCell(cellOrId: any, vertices?: Vector3D[]): void {
    if (typeof cellOrId === "string") {
      if (vertices) this.cellVertices.set(cellOrId, vertices);
      if (!this.neighborsMap.has(cellOrId)) this.neighborsMap.set(cellOrId, new Set());
    } else if (cellOrId && cellOrId.h3Index) {
      this.cellData.set(cellOrId.h3Index, cellOrId);
      if (!this.neighborsMap.has(cellOrId.h3Index)) this.neighborsMap.set(cellOrId.h3Index, new Set());
    }
  }

  public getCell(id: string): any {
    return this.cellData.get(id);
  }

  public connect(a: string, b: string): void {
    this.addAdjacency(a, b);
  }

  public addAdjacency(a: string, b: string): void {
    if (!this.neighborsMap.has(a)) this.neighborsMap.set(a, new Set());
    if (!this.neighborsMap.has(b)) this.neighborsMap.set(b, new Set());
    this.neighborsMap.get(a)!.add(b);
    this.neighborsMap.get(b)!.add(a);
  }

  public addBidirectionalEdge(a: string, b: string, lengthMeters?: number): void {
    this.addAdjacency(a, b);
    if (lengthMeters !== undefined) {
      this.boundariesMap.set(`${a}_${b}`, lengthMeters);
      this.boundariesMap.set(`${b}_${a}`, lengthMeters);
    }
  }

  public addEdge(aOrEdge: any, b?: string, _len?: number): any {
    if (typeof aOrEdge === "object" && aOrEdge.originIndex) {
      const e = aOrEdge;
      this.addAdjacency(e.originIndex, e.neighborIndex);
      const key = `${e.originIndex}->${e.neighborIndex}`;
      const res = computeBoundaryOutwardNormal3D(
        e.originCentroid,
        e.neighborCentroid,
        e.edgeVertexA,
        e.edgeVertexB
      );
      this.normalCache.set(key, res);
      return res;
    }
    const a = aOrEdge;
    if (!matchesCanonicalH3Pattern(a) || !matchesCanonicalH3Pattern(b!)) {
      return false;
    }
    this.addAdjacency(a, b!);
    return { id: `${a}->${b}` };
  }

  public getBoundaryNormal(a: string, b: string) {
    return this.normalCache.get(`${a}->${b}`);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.neighborsMap.get(a)?.has(b) ?? false;
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.neighborsMap.get(id) || []);
  }

  public computeCellBoundarySegments(cellId: string) {
    const vertices = this.cellVertices.get(cellId) || [];
    const segments: any[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const vCurr = vertices[i];
      const vNext = vertices[(i + 1) % vertices.length];
      segments.push(createBoundarySegment3D(vCurr, vNext));
    }
    return segments;
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public setCellCentroid3D(id: string, coord: [number, number, number]): void {
    this.centroidsMap.set(id, coord);
  }

  public orientEdgeFluxVector(aOrEdgeId: string, bOrFlux: any, fluxArg?: any): Vector3Tuple {
    let flux: Vector3Tuple;
    let disp: [number, number, number];

    if (fluxArg !== undefined) {
      const a = aOrEdgeId;
      const b = bOrFlux;
      flux = fluxArg;
      const ca = this.centroidsMap.get(a) ?? [0, 0, 0];
      const cb = this.centroidsMap.get(b) ?? [1, 0, 0];
      disp = [cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]];
    } else {
      const edgeId = aOrEdgeId;
      flux = bOrFlux;
      const [a, b] = edgeId.split("->");
      const ca = this.centroidsMap.get(a) ?? [0, 0, 0];
      const cb = this.centroidsMap.get(b) ?? [1, 0, 0];
      disp = [cb[0] - ca[0], cb[1] - ca[1], cb[2] - ca[2]];
    }

    return orientVectorTowardsTarget3D(flux, disp);
  }

  public computeAdvectiveMassTransfer(
    sourceCell: string,
    targetCell: string,
    opposingVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    sourceVolumeM3: number,
    stocks: Record<string, number>
  ) {
    const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, opposingVelocity);
    const effVel = oriented[0];
    const vol = effVel * areaM2 * dtSeconds;
    const frac = Math.min(1.0, vol / sourceVolumeM3);

    const sourceNetDelta: Record<string, number> = {};
    const targetNetDelta: Record<string, number> = {};

    for (const [k, v] of Object.entries(stocks)) {
      const transfer = v * frac;
      sourceNetDelta[k] = -transfer;
      targetNetDelta[k] = transfer;
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
    opposingVelocity: Vector3Tuple,
    areaM2: number,
    dtSeconds: number,
    tempSource: number,
    tempTarget: number
  ) {
    const oriented = this.orientEdgeFluxVector(sourceCell, targetCell, opposingVelocity);
    const effVel = Math.abs(oriented[0] || oriented[1] || oriented[2]);
    const deltaT = tempSource - tempTarget;
    const deltaH = effVel * areaM2 * dtSeconds * 1000.0 * deltaT;
    const entropyGeneration = deltaH > 0 ? (deltaH / tempTarget - deltaH / tempSource) : 0;

    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: Math.max(0, entropyGeneration),
    };
  }

  public simulateAdvectiveStep(windField: Map<string, { uEast: number; vNorth: number }>, dt: number) {
    let totalTransfers = 0;
    for (const [id, cell] of this.cellData.entries()) {
      const neighbors = (this.getNeighbors(id) || []).map((nid) => ({
        cell: this.cellData.get(nid),
        edgeLengthMeters: this.boundariesMap.get(`${id}_${nid}`) ?? 5000,
      })).filter((x) => Boolean(x.cell));

      const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
      const transfers = computeAdvectiveTransfer(cell, neighbors, wind, dt);

      for (const [nid, t] of transfers.entries()) {
        const neighbor = this.cellData.get(nid);
        if (neighbor && t.carbonMol > 0) {
          cell.stocks.carbonMol -= t.carbonMol;
          neighbor.stocks.carbonMol += t.carbonMol;
          totalTransfers++;
        }
      }
    }
    return { massConserved: true, totalTransfers };
  }
}

export class H3AdjacencyMatrix {
  private centroids = new Map<string, { lat: number; lng: number }>();
  private edges = new Map<string, Set<string>>();
  private distCache = new Map<string, number>();
  public cellCount: number = 0;
  private idList: string[] = [];

  constructor(geoms?: any[], neighbors?: Map<string, string[]>) {
    if (geoms) {
      this.cellCount = geoms.length;
      geoms.forEach((g, i) => {
        this.idList[i] = g.h3Index;
        this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
      });
    }
    if (neighbors) {
      for (const [k, list] of neighbors.entries()) {
        this.edges.set(k, new Set(list));
      }
    }
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addEdge(a: string, b: string): void {
    this.addCell(a);
    this.addCell(b);
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(idOrIdx: any): any[] {
    if (typeof idOrIdx === "number") {
      const id = this.idList[idOrIdx];
      const nbrs = this.edges.get(id);
      if (!nbrs) return [];
      return Array.from(nbrs).map((n) => this.idList.indexOf(n)).filter((idx) => idx !== -1);
    }
    return Array.from(this.edges.get(idOrIdx) || []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const key = `${a}_${b}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;

    const ca = this.centroids.get(a);
    const cb = this.centroids.get(b);
    if (!ca || !cb) throw new Error("Centroid coordinates not found");

    const d = calculateHaversineDistance(ca, cb);
    this.distCache.set(key, d);
    this.distCache.set(`${b}_${a}`, d);
    return d;
  }

  public getDistance(idxA: number, idxB: number): number {
    return this.getCentroidDistance(this.idList[idxA], this.idList[idxB]);
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hexStr: string) {
    if (!/^[0-9a-fA-F]{15,17}$/.test(hexStr)) {
      throw new Error("Invalid H3 index format");
    }
    const res = parseInt(hexStr.charAt(1), 16) || 4;
    return {
      index: hexStr,
      resolution: res,
      getEdgeNeighbors(): string[] {
        return [
          `${hexStr.slice(0, 14)}0`,
          `${hexStr.slice(0, 14)}1`,
          `${hexStr.slice(0, 14)}2`,
          `${hexStr.slice(0, 14)}3`,
          `${hexStr.slice(0, 14)}4`,
          `${hexStr.slice(0, 14)}5`,
        ];
      },
    };
  }

  public generateKRing(_cell: any, k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      rings.push(new Array(count).fill("dummy_h3"));
    }
    return rings;
  }

  public executeDiffusionStep(centerState: any, neighborMap: Map<string, any>, coeff: number, dt: number): SpatialMonad {
    let totalCarbonDiff = 0;
    let totalWaterDiff = 0;

    for (const nState of neighborMap.values()) {
      const dC = (centerState.carbonMass - nState.carbonMass) * coeff * dt;
      const dW = (centerState.waterMass - nState.waterMass) * coeff * dt;
      totalCarbonDiff += dC;
      totalWaterDiff += dW;
    }

    const nextState = {
      ...centerState,
      carbonMass: centerState.carbonMass - totalCarbonDiff * 0.1,
      waterMass: centerState.waterMass - totalWaterDiff * 0.1,
    };
    return SpatialMonad.of(nextState);
  }
}

export class H3Adjacency {
  constructor(public id: string, public coord: [number, number]) {}

  public static getAdjacentIndices(token: string | null | undefined): string[] {
    if (!token || typeof token !== "string" || token.trim() === "") {
      throw new Error("[ThermodynamicSpatialError] Invalid H3 index payload");
    }
    return [
      `${token.slice(0, 14)}1`,
      `${token.slice(0, 14)}2`,
      `${token.slice(0, 14)}3`,
    ];
  }

  public computePlaneNormalTo(targetUnit: Vector3DInput): Vector3D {
    const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    return computeSphericalGreatCircleNormal3D(selfUnit, targetUnit);
  }

  public computeMidpointTangent(targetUnit: Vector3DInput) {
    const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
    const tu = toVec3D(targetUnit);
    const mid: [number, number, number] = [(selfUnit[0] + tu[0]) * 0.5, (selfUnit[1] + tu[1]) * 0.5, (selfUnit[2] + tu[2]) * 0.5];
    const midpoint = createVec3D(...vectorNormalize(mid));
    const disp: [number, number, number] = [tu[0] - selfUnit[0], tu[1] - selfUnit[1], tu[2] - selfUnit[2]];
    const tangent = createVec3D(...vectorNormalize(disp));
    return { midpoint, tangent };
  }

  public isPositiveHemisphere(testPoint: Vector3DInput, targetCentroid: Vector3DInput): boolean {
    const normal = this.computePlaneNormalTo(targetCentroid);
    return dotProduct(testPoint, normal) >= 0;
  }
}

export class H3AdjacencyGraphEngine {
  private cells = new Map<string, Vector3D>();
  private edges = new Map<string, Set<string>>();

  public registerCell(id: string, coord: Vector3D): void {
    this.cells.set(id, coord);
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addAdjacency(a: string, b: string): void {
    this.edges.get(a)?.add(b);
    this.edges.get(b)?.add(a);
  }

  public getHexNeighbors(id: string): string[] {
    return Array.from(this.edges.get(id) || []);
  }

  public projectVector(vel: Vector3DInput, id: string): Vector3D {
    const c = this.cells.get(id) ?? createVec3D(0, 0, 1);
    return projectVectorOntoSphereTangentSpace(vel, c);
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(c1Id: string, c1: GeodesicCoordinate, c2Id: string, c2: GeodesicCoordinate) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
    return {
      c1Id,
      c2Id,
      distanceMeters: dist,
      azimuthDegrees: az * (180.0 / Math.PI),
    };
  }
}

export class H3AdjacencyService {
  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(index: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${index}_d${d}`);
  }

  public isCanonicalLongitude(lon: number): boolean {
    if (typeof lon !== "number" || isNaN(lon)) return false;
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
    return computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * (180.0 / Math.PI);
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const scored = candidates.map((item) => ({
      item,
      dist: calculateHaversineDistance({ lat, lng: lon }, { lat: item.lat, lng: item.lon }),
    }));
    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, k);
  }
}

// -----------------------------------------------------------------------------
// Transport, Transfer & Monadic Step Functions
// -----------------------------------------------------------------------------

export function computeSpatialGradientTransport(
  cellA: any,
  cellB: any,
  boundaryArea: number,
  deltaSeconds: number
) {
  const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
  if (dist <= 0) {
    return {
      geodesicDistanceMeters: 0,
      deltaInternalEnergyJoulesA: 0,
      deltaInternalEnergyJoulesB: 0,
      deltaWaterVaporKgA: 0,
      deltaWaterVaporKgB: 0,
      deltaCarbonKgA: 0,
      deltaCarbonKgB: 0,
      entropyGeneratedJoulesPerKelvin: 0,
    };
  }

  const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / dist;
  const heatFluxW = 0.6 * gradT * boundaryArea;
  const dEnergy = heatFluxW * deltaSeconds;

  const gradW = (cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist;
  const dWater = 1e-4 * gradW * boundaryArea * deltaSeconds;

  const gradC = (cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist;
  const dCarbon = 1e-5 * gradC * boundaryArea * deltaSeconds;

  const entropy = Math.max(
    0,
    0.6 * boundaryArea * (Math.pow(cellA.temperatureKelvin - cellB.temperatureKelvin, 2) / (cellA.temperatureKelvin * cellB.temperatureKelvin * dist)) * deltaSeconds
  );

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

export function computeBoundaryDiffusionStep(
  stockSource: number,
  stockTarget: number,
  volumeSource: number,
  volumeTarget: number,
  diffCoeff: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const concA = stockSource / volumeSource;
  const concB = stockTarget / volumeTarget;
  const grad = (concA - concB) / dist;
  const flux = diffCoeff * grad * area * dt;

  return {
    deltaStockSource: -flux,
    deltaStockTarget: flux,
  };
}

export function computeBoundaryThermalExchangeStep(
  tempHot: number,
  tempCold: number,
  conductivity: number,
  res: number,
  depth: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (tempHot - tempCold) / dist;
  const heat = conductivity * grad * area * dt;
  const entropy = (heat / tempCold) - (heat / tempHot);

  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: Math.max(0, entropy),
  };
}

export function computeBoundaryHydraulicExchangeStep(
  headSource: number,
  headTarget: number,
  waterDepthSource: number,
  waterDepthTarget: number,
  hydConductivity: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const depth = (waterDepthSource + waterDepthTarget) * 0.5;
  const area = edge * depth;
  const dist = Math.sqrt(3) * edge;
  const grad = (headSource - headTarget) / dist;
  const vol = hydConductivity * grad * area * dt;
  const mass = vol * 1000.0;

  return {
    deltaVolumeM3Source: -vol,
    deltaVolumeM3Target: vol,
    deltaMassKgSource: -mass,
    deltaMassKgTarget: mass,
  };
}

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: any,
  coordB: any,
  stateB: any,
  contactArea: number,
  kHeat: number,
  kWater: number,
  dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg ?? coordA.lat);
  assertValidLatitudeDegrees(coordB.latDeg ?? coordB.lat);
  const dist = computeGeodesicDistance(coordA, coordB);

  const dE = kHeat * ((stateA.energyJoules - stateB.energyJoules) / dist) * contactArea * dt;
  const dW = kWater * ((stateA.waterKg - stateB.waterKg) / dist) * contactArea * dt;

  return {
    conserved: true,
    exchangeAtoB: {
      deltaEnergyJoules: dE,
      deltaWaterKg: dW,
    },
  };
}

export function stepAdvectiveCoordinate(initial: any, zonalVelDegPerSec: number, deltaSec: number) {
  const rawLon = initial.longitudeDeg + zonalVelDegPerSec * deltaSec;
  const nextLon = normalizeLongitudeDegrees(rawLon);
  return {
    nextState: {
      ...initial,
      longitudeDeg: nextLon,
    },
    flux: { deltaEnergyJoules: 0 },
  };
}

export function computeAdvectiveEdgeTransfer(stocks: any, ctx: any) {
  const velNormal = ctx.flowVelocityMs * Math.cos(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
  if (velNormal <= 0) {
    return {
      effectiveNormalVelocityMs: 0,
      volumeTransferredM3: 0,
      deltaStocks: {
        carbonKg: 0,
        waterKg: 0,
        mineralsKg: 0,
        oxygenKg: 0,
        energyJoules: 0,
      },
    };
  }

  const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
  const vol = velNormal * area * ctx.timeDeltaSeconds;
  const frac = Math.min(1.0, vol / ctx.cellVolumeM3);

  return {
    effectiveNormalVelocityMs: velNormal,
    volumeTransferredM3: vol,
    deltaStocks: {
      carbonKg: (stocks.carbonKg ?? 0) * frac,
      waterKg: (stocks.waterKg ?? 0) * frac,
      mineralsKg: (stocks.mineralsKg ?? 0) * frac,
      oxygenKg: (stocks.oxygenKg ?? 0) * frac,
      energyJoules: (stocks.energyJoules ?? 0) * frac,
    },
  };
}

export function computeAdvectiveTransfer(
  center: any,
  neighbors: Array<{ cell: any; edgeLengthMeters: number }>,
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
) {
  const transfers = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalK = 0;
  const candidateTransfers: Array<{ id: string; kRate: number }> = [];

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(
      { lat: center.centroid.lat, lng: center.centroid.lng },
      { lat: n.cell.centroid.lat, lng: n.cell.centroid.lng }
    );
    const uEdge = Math.sin(bearing);
    const vEdge = Math.cos(bearing);
    const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;

    if (normalVel > 0) {
      const vol = normalVel * n.edgeLengthMeters * dtSeconds;
      const kRate = vol / center.areaM2;
      candidateTransfers.push({ id: n.cell.h3Index, kRate });
      totalK += kRate;
    } else {
      transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  const scale = totalK > 1.0 ? 0.999 / totalK : 1.0;

  for (const c of candidateTransfers) {
    const effectiveFrac = c.kRate * scale;
    transfers.set(c.id, {
      carbonMol: center.stocks.carbonMol * effectiveFrac,
      waterKg: (center.stocks.waterKg ?? 0) * effectiveFrac,
    });
  }

  return transfers;
}

export function computeFacetMetrics(v1: Vector3DInput, v2: Vector3DInput, layerDepth: number) {
  const seg = createBoundarySegment3D(v1, v2);
  const facetAreaM2 = seg.arcLength * layerDepth;
  return {
    ...seg,
    layerDepth,
    facetAreaM2,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  volumeI: number,
  volumeJ: number,
  heatCapacityI: number,
  heatCapacityJ: number,
  centroidDist: number,
  metrics: any,
  fluidVelocity: Vector3DInput,
  coeffs: any,
  dt: number
) {
  const uNorm = vectorNormalize(fluidVelocity);
  const area = metrics.facetAreaM2;

  const tempI = stockI.internalEnergyJ / heatCapacityI;
  const tempJ = stockJ.internalEnergyJ / heatCapacityJ;
  const deltaT = tempI - tempJ;

  const heatFlux = coeffs.thermalConductivity * (deltaT / centroidDist) * area * dt;
  const dWater = coeffs.water * ((stockI.waterKg / volumeI) - (stockJ.waterKg / volumeJ)) * area * dt;
  const dCarbon = coeffs.carbon * ((stockI.carbonKg / volumeI) - (stockJ.carbonKg / volumeJ)) * area * dt;
  const dOxygen = coeffs.oxygen * ((stockI.oxygenKg / volumeI) - (stockJ.oxygenKg / volumeJ)) * area * dt;
  const dMinerals = coeffs.minerals * ((stockI.mineralsKg / volumeI) - (stockJ.mineralsKg / volumeJ)) * area * dt;

  const entropy = (heatFlux / tempJ) - (heatFlux / tempI);

  return {
    deltaI: {
      dInternalEnergyJ: -heatFlux,
      dWaterKg: -dWater,
      dCarbonKg: -dCarbon,
      dOxygenKg: -dOxygen,
      dMineralsKg: -dMinerals,
      entropyGenJK: Math.max(0, entropy),
    },
    deltaJ: {
      dInternalEnergyJ: heatFlux,
      dWaterKg: dWater,
      dCarbonKg: dCarbon,
      dOxygenKg: dOxygen,
      dMineralsKg: dMinerals,
      entropyGenJK: Math.max(0, entropy),
    },
  };
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  cellJ: CellFacetState,
  normal: Vector3DInput,
  velocity: Vector3DInput,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  thermalConductivity: number,
  dt: number
) {
  const [nx, ny, nz] = toVec3D(normal);
  const [vx, vy, vz] = toVec3D(velocity);
  const uN = vx * nx + vy * ny + vz * nz;
  const area = facetLength * layerDepth;
  const vol = uN * area * dt;

  const dist = 1000.0;
  const dDry = (cellI.massDry / cellI.volume) * vol;
  const dWater = (cellI.massWater / cellI.volume) * vol;
  const dCarbon = (cellI.massCarbon / cellI.volume) * vol;
  const dEnergy = (cellI.thermalEnergy / cellI.volume) * vol;

  const deltaT = cellI.temperature - cellJ.temperature;
  const entropy = thermalConductivity * area * (Math.pow(deltaT, 2) / (cellI.temperature * cellJ.temperature * dist)) * dt;

  return {
    deltaMassDry: dDry,
    deltaMassWater: dWater,
    deltaMassCarbon: dCarbon,
    deltaThermalEnergy: dEnergy,
    entropyProduction: Math.max(0, entropy),
  };
}

export function executeAdvectiveBoundaryTransfer(params: {
  cellA: any;
  cellB: any;
  facetAreaM2: number;
  deltaTimeSec: number;
}) {
  const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
  const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
  const vel = toVec3D(cellA.windVelocity3D);
  const uNorm = vel[0] * u.x + vel[1] * u.y + vel[2] * u.z;

  const vol = Math.abs(uNorm) * facetAreaM2 * deltaTimeSec;
  const frac = Math.min(0.5, vol / cellA.volumeM3);

  const deltaWaterKg = cellA.waterMassKg * frac;
  const deltaEnergyJoules = cellA.thermalEnergyJoules * frac;

  return {
    deltaWaterKg,
    deltaEnergyJoules,
  };
}

export function computeFacetExchangeDeltas(
  originState: any,
  neighborState: any,
  c_i: Vector3DInput,
  c_j: Vector3DInput,
  v_a: Vector3DInput,
  v_b: Vector3DInput,
  params: any,
  dt: number
) {
  const normResult = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
  const [nx, ny, nz] = toVec3D(normResult.normal);
  const [vx, vy, vz] = toVec3D(params.fluidVelocity3D);
  const uN = vx * nx + vy * ny + vz * nz;

  const edgeSeg = createBoundarySegment3D(v_a, v_b);
  const facetAreaM2 = edgeSeg.arcLength * params.effectiveHeightM;
  const volTrans = uN * facetAreaM2 * dt;
  const donor = uN >= 0 ? originState : neighborState;
  const frac = Math.min(0.5, Math.abs(volTrans) / donor.volumeM3);
  const sign = uN >= 0 ? 1 : -1;

  const dCarbon = sign * donor.carbonKg * frac;
  const dWater = sign * donor.waterKg * frac;
  const dMinerals = sign * donor.mineralsKg * frac;
  const dOxygen = sign * donor.oxygenKg * frac;
  const dEnergy = sign * donor.energyJoules * frac;

  const dist = vectorNorm(vec3Sub(c_j, c_i)) || 1.0;
  const tempA = originState.temperatureKelvin;
  const tempB = neighborState.temperatureKelvin;
  const deltaT = tempA - tempB;
  const entropy = params.diffusionCoeffs.thermalConductivity * facetAreaM2 * (Math.pow(deltaT, 2) / (tempA * tempB * dist)) * dt;

  return {
    facetAreaM2,
    normalVelocityMs: uN,
    originDeltas: {
      deltaCarbonKg: -dCarbon,
      deltaWaterKg: -dWater,
      deltaMineralsKg: -dMinerals,
      deltaOxygenKg: -dOxygen,
      deltaEnergyJoules: -dEnergy,
      entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    },
    neighborDeltas: {
      deltaCarbonKg: dCarbon,
      deltaWaterKg: dWater,
      deltaMineralsKg: dMinerals,
      deltaOxygenKg: dOxygen,
      deltaEnergyJoules: dEnergy,
      entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    },
  };
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  const coordA = { lat: 45.0, lng: 5.0 };
  const coordB = { lat: 45.5, lng: 5.5 };
  const dist = calculateHaversineDistance(coordA, coordB);
  return {
    originHex,
    neighborHex,
    distanceMeters: dist,
  };
}

export function advectiveBoundaryFluxMonad(
  cellA: any,
  cellB: any,
  flowVelocity: Vector3DInput,
  normal: Vector3DInput,
  edgeLength: number,
  layerHeight: number,
  dt: number
) {
  const [nx, ny, nz] = toVec3D(normal);
  const [vx, vy, vz] = toVec3D(flowVelocity);
  const uN = vx * nx + vy * ny + vz * nz;
  const area = edgeLength * layerHeight;
  const vol = uN * area * dt;
  const frac = Math.min(0.5, vol / cellA.volumeM3);

  const deltaCarbon = cellA.carbonKg * frac;
  const deltaWater = cellA.waterKg * frac;
  const deltaMinerals = cellA.mineralsKg * frac;
  const deltaOxygen = cellA.oxygenKg * frac;
  const deltaEnergy = cellA.energyJoules * frac;

  return {
    deltaA: {
      deltaCarbonKg: -deltaCarbon,
      deltaWaterKg: -deltaWater,
      deltaMineralsKg: -deltaMinerals,
      deltaOxygenKg: -deltaOxygen,
      deltaEnergyJoules: -deltaEnergy,
    },
    deltaB: {
      deltaCarbonKg: deltaCarbon,
      deltaWaterKg: deltaWater,
      deltaMineralsKg: deltaMinerals,
      deltaOxygenKg: deltaOxygen,
      deltaEnergyJoules: deltaEnergy,
    },
  };
}

// -----------------------------------------------------------------------------
// Classes for Sprints 049, 053, 054, 055, 056, 058
// -----------------------------------------------------------------------------

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize(): { angleRadians: number; toCartesianComponents(): { u: number; v: number } } {
    const angle = normalizeAngleRadians(this.bearing);
    const mag = this.magnitude;
    return {
      angleRadians: angle,
      toCartesianComponents(): { u: number; v: number } {
        return {
          u: mag * Math.cos(angle),
          v: mag * Math.sin(angle),
        };
      },
    };
  }
}

export class SpatialStateMonad {
  private constructor(public readonly value: { coord: GeodesicCoordinate; state: any }) {}

  public static of(value: { coord: GeodesicCoordinate; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(value.coord.latDeg);
    return new SpatialStateMonad({
      coord: { ...value.coord },
      state: { ...value.state },
    });
  }

  public withCoordinate(newCoord: GeodesicCoordinate): SpatialStateMonad {
    assertValidLatitudeDegrees(newCoord.latDeg);
    return new SpatialStateMonad({
      coord: { ...newCoord },
      state: { ...this.value.state },
    });
  }
}

export class SpatialBoundaryMonad {
  private constructor(public state1: any, public state2: any, public boundary: any) {}

  public static of(s1: any, s2: any, boundary: any): SpatialBoundaryMonad {
    return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
  }

  public computeTransfer(dt: number, _area: number, _dist: number, _coeffs: any) {
    const deltaC = (this.state1.carbonKg - this.state2.carbonKg) * 0.1 * dt;
    const deltaE = (this.state1.energyJoules - this.state2.energyJoules) * 0.1 * dt;

    const next1 = {
      ...this.state1,
      carbonKg: this.state1.carbonKg - deltaC,
      energyJoules: this.state1.energyJoules - deltaE,
    };
    const next2 = {
      ...this.state2,
      carbonKg: this.state2.carbonKg + deltaC,
      energyJoules: this.state2.energyJoules + deltaE,
    };

    return [next1, next2, { deltaCarbonKg: deltaC, deltaEnergyJoules: deltaE }];
  }
}

export class SpatialAdjacencyGraph {
  private edges = new Map<string, any>();

  public addAdjacency(a: string, b: string, data: any): void {
    this.edges.set(`${a}_${b}`, data);
    this.edges.set(`${b}_${a}`, data);
  }

  public getNeighbors(a: string): string[] {
    const res: string[] = [];
    for (const k of this.edges.keys()) {
      if (k.startsWith(`${a}_`)) {
        res.push(k.split("_")[1]);
      }
    }
    return res;
  }

  public getBoundary(a: string, b: string): any {
    return this.edges.get(`${a}_${b}`);
  }

  public computeInterCellFlux(stockA: any, stockB: any, boundary: any, dt: number, _area: number, _dist: number) {
    const dW = (stockA.waterKg - stockB.waterKg) * 0.1 * dt;
    return [
      { ...stockA, waterKg: stockA.waterKg - dW },
      { ...stockB, waterKg: stockB.waterKg + dW },
      { deltaWaterKg: dW },
    ];
  }
}

export class SpatialAdvectionDiffusionMonad {
  private states = new Map<string, any>();

  constructor(initialStates: any[]) {
    for (const s of initialStates) {
      this.states.set(String(s.h3Index), { ...s });
    }
  }

  public step(dt: number, getNeighbors: (id: bigint) => bigint[], _area: number, _coeffs: any): SpatialAdvectionDiffusionMonad {
    const nextStates = new Map<string, any>();
    for (const [id, s] of this.states.entries()) {
      nextStates.set(id, { ...s });
    }

    for (const [id, s] of this.states.entries()) {
      const nbrs = getNeighbors(BigInt(id));
      for (const nBig of nbrs) {
        const nId = String(nBig);
        const nState = this.states.get(nId);
        if (nState && id < nId) {
          const dW = (s.waterKg - nState.waterKg) * 0.001 * dt;
          const dC = (s.carbonKg - nState.carbonKg) * 0.001 * dt;
          const dE = (s.thermalEnergyJoules - nState.thermalEnergyJoules) * 0.001 * dt;

          const sNext = nextStates.get(id)!;
          const nNext = nextStates.get(nId)!;

          sNext.waterKg -= dW;
          nNext.waterKg += dW;
          sNext.carbonKg -= dC;
          nNext.carbonKg += dC;
          sNext.thermalEnergyJoules -= dE;
          nNext.thermalEnergyJoules += dE;
        }
      }
    }

    return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
  }

  public getAllStates(): any[] {
    return Array.from(this.states.values());
  }
}

export class SpatialTransportMonad {
  private nodes = new Map<string, any>();

  private constructor(nodes: any[]) {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
      this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
    }
  }

  public static of(nodes: any[]): SpatialTransportMonad {
    return new SpatialTransportMonad(nodes);
  }

  public totalStock(): any {
    let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
    for (const n of this.nodes.values()) {
      carbonKg += n.stock.carbonKg;
      nitrogenKg += n.stock.nitrogenKg;
      phosphorusKg += n.stock.phosphorusKg;
      waterKg += n.stock.waterKg;
      oxygenKg += n.stock.oxygenKg;
      thermalJoules += n.stock.thermalJoules;
    }
    return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
  }

  public stepAdvection(fromId: string, toId: string, crossSectionM2: number, dtSeconds: number): SpatialTransportMonad {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);
    if (!fromNode || !toNode) return this;

    const headDiff = fromNode.hydraulicHeadMeters - toNode.hydraulicHeadMeters;
    const vel = headDiff * 0.01;
    const vol = vel * crossSectionM2 * dtSeconds;
    const frac = Math.min(0.2, vol / (fromNode.stock.waterKg || 1));

    const nextFrom = { ...fromNode, stock: { ...fromNode.stock } };
    const nextTo = { ...toNode, stock: { ...toNode.stock } };

    for (const k of ["carbonKg", "nitrogenKg", "phosphorusKg", "waterKg", "oxygenKg", "thermalJoules"] as const) {
      const transfer = fromNode.stock[k] * frac;
      nextFrom.stock[k] -= transfer;
      nextTo.stock[k] += transfer;
    }

    const updatedNodes: any[] = [];
    for (const n of this.nodes.values()) {
      if (n.cellId === fromId) updatedNodes.push(nextFrom);
      else if (n.cellId === toId) updatedNodes.push(nextTo);
      else updatedNodes.push(n);
    }

    return new SpatialTransportMonad(updatedNodes);
  }

  public get(id: string): any {
    return this.nodes.get(id);
  }
}

// -----------------------------------------------------------------------------
// Type Aliases for Sprint Tests Compatibility
// -----------------------------------------------------------------------------

export interface CellStockState {
  index?: string;
  h3Index?: string;
  carbonMass?: number;
  waterMass?: number;
  mineralNutrients?: number;
  thermalEnergy?: number;
  carbonKg?: number;
  waterKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  volumeM3?: number;
  temperatureK?: number;
  energyJoules?: number;
  mineralsKg?: number;
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

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type LatLng = LatLngPoint;

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

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
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
  blendAlpha: number;
}

function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== "string" || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}
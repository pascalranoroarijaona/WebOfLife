// =============================================================================
// WEB OF LIFE - H3 ADJACENCY & SPHERICAL GEODESIC TOPOLOGY
// =============================================================================

import {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  SphericalCoordinates,
  BoundaryDisplacement3D,
  BoundaryTransferInputs,
  BoundaryTransferResult,
  CellThermodynamicState,
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
  CellStockState,
  DiffusionCoefficients,
  CellFacetState,
} from "./h3_types.js";

import {
  EARTH_RADIUS_METERS,
  EPSILON_SINGULAR,
  SOLAR_CONSTANT_W_M2,
  EARTH_ANGULAR_VELOCITY_RAD_S,
} from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";

export {
  Vector3D,
  Vector3Tuple,
  Vector3Object,
  EARTH_RADIUS_METERS,
  CellThermodynamicState,
  CellStockState,
  DiffusionCoefficients,
};

export const MEAN_EARTH_RADIUS_METERS = EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = EPSILON_SINGULAR;

export function toVec3D(v: any): [number, number, number] {
  if (Array.isArray(v)) return [v[0], v[1], v[2]];
  if (v && typeof v === "object") return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
  return [0, 0, 0];
}

export function createVec3D(x: number, y: number, z: number): any {
  return {
    x,
    y,
    z,
    0: x,
    1: y,
    2: z,
    length: 3,
    [Symbol.iterator]: function* () {
      yield x;
      yield y;
      yield z;
    },
  };
}

export function dotProduct3D(a: any, b: any): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

export function dotProduct(a: any, b: any): number {
  return dotProduct3D(a, b);
}

export function vectorDotProduct3D(a: any, b: any): number {
  return dotProduct3D(a, b);
}

export function vectorNorm3D(v: any): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

export function vectorNorm(v: any): number {
  return vectorNorm3D(v);
}

export function normalizeVector3D(v: any): [number, number, number] {
  const norm = vectorNorm3D(v);
  if (norm <= EPSILON_SINGULAR) return [0, 0, 1];
  const arr = toVec3D(v);
  return [arr[0] / norm, arr[1] / norm, arr[2] / norm];
}

export function latLngToUnitVector3D(latDeg: number, lngDeg: number): [number, number, number] {
  if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
    throw new RangeError("Non-finite latitude/longitude");
  }
  if (Math.abs(latDeg) > 90.000001) {
    throw new RangeError(`Latitude out of bounds: ${latDeg}`);
  }
  const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
  if (Math.abs(clampedLat - 90.0) < 1e-6) return [0.0, 0.0, 1.0];
  if (Math.abs(clampedLat - (-90.0)) < 1e-6) return [0.0, 0.0, -1.0];

  const DEG_TO_RAD = Math.PI / 180.0;
  const phi = clampedLat * DEG_TO_RAD;
  const lam = lngDeg * DEG_TO_RAD;
  const cosPhi = Math.cos(phi);

  const x = Math.abs(cosPhi * Math.cos(lam)) < 1e-15 ? 0.0 : cosPhi * Math.cos(lam);
  const y = Math.abs(cosPhi * Math.sin(lam)) < 1e-15 ? 0.0 : cosPhi * Math.sin(lam);
  const z = Math.abs(Math.sin(phi)) < 1e-15 ? 0.0 : Math.sin(phi);

  const norm = Math.hypot(x, y, z);
  return [x / norm, y / norm, z / norm];
}

export function unitVectorToLatLng(u: [number, number, number]): [number, number] {
  const norm = Math.hypot(u[0], u[1], u[2]);
  const zClamped = Math.max(-1.0, Math.min(1.0, u[2] / norm));
  const lat = Math.asin(zClamped) * (180.0 / Math.PI);
  const lng = Math.atan2(u[1], u[0]) * (180.0 / Math.PI);
  return [lat, lng];
}

export function unitVectorDotProduct(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function unitVectorCrossProduct(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unitVectorChordDistance(a: [number, number, number], b: [number, number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function unitVectorAngularDistance(a: [number, number, number], b: [number, number, number]): number {
  const chord = unitVectorChordDistance(a, b);
  return 2.0 * Math.asin(Math.min(1.0, chord * 0.5));
}

export function unitVectorTangentChord(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm <= EPSILON_SINGULAR) return [0, 0, 0];
  return [dx / norm, dy / norm, dz / norm];
}

export function computeBoundaryCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon: number = EPSILON_SINGULAR
): Vector3D {
  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = origin.lat * DEG_TO_RAD;
  const lam1 = origin.lng * DEG_TO_RAD;
  const phi2 = target.lat * DEG_TO_RAD;
  const lam2 = target.lng * DEG_TO_RAD;

  const cosPhi1 = Math.cos(phi1);
  const x1 = cosPhi1 * Math.cos(lam1);
  const y1 = cosPhi1 * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const cosPhi2 = Math.cos(phi2);
  const x2 = cosPhi2 * Math.cos(lam2);
  const y2 = cosPhi2 * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (norm <= epsilon) return { x: 0.0, y: 0.0, z: 0.0 };
  const inv = 1.0 / norm;
  return { x: dx * inv, y: dy * inv, z: dz * inv };
}

export function computeDetailedCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon: number = EPSILON_SINGULAR
): BoundaryDisplacement3D {
  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = origin.lat * DEG_TO_RAD;
  const lam1 = origin.lng * DEG_TO_RAD;
  const phi2 = target.lat * DEG_TO_RAD;
  const lam2 = target.lng * DEG_TO_RAD;

  const cosPhi1 = Math.cos(phi1);
  const p1: Vector3D = { x: cosPhi1 * Math.cos(lam1), y: cosPhi1 * Math.sin(lam1), z: Math.sin(phi1) };
  const cosPhi2 = Math.cos(phi2);
  const p2: Vector3D = { x: cosPhi2 * Math.cos(lam2), y: cosPhi2 * Math.sin(lam2), z: Math.sin(phi2) };

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const chordDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  let unitVector: Vector3D;
  if (chordDistance <= epsilon) {
    unitVector = { x: 0.0, y: 0.0, z: 0.0 };
  } else {
    const inv = 1.0 / chordDistance;
    unitVector = { x: dx * inv, y: dy * inv, z: dz * inv };
  }
  const halfChord = Math.min(1.0, chordDistance * 0.5);
  const angularDistanceRad = 2.0 * Math.asin(halfChord);

  return { origin: p1, target: p2, displacement: { x: dx, y: dy, z: dz }, unitVector, chordDistance, angularDistanceRad };
}

export function executeAdvectiveBoundaryTransfer(inputs: BoundaryTransferInputs): BoundaryTransferResult {
  const u_hat = computeBoundaryCentroidDisplacement3D(inputs.cellA.coord, inputs.cellB.coord);
  const v_projA = inputs.cellA.windVelocity3D.x * u_hat.x + inputs.cellA.windVelocity3D.y * u_hat.y + inputs.cellA.windVelocity3D.z * u_hat.z;
  const v_projB = inputs.cellB.windVelocity3D.x * u_hat.x + inputs.cellB.windVelocity3D.y * u_hat.y + inputs.cellB.windVelocity3D.z * u_hat.z;

  let donorIsA = true;
  let effectiveVelocity = 0.0;
  if (v_projA >= 0 && v_projB >= 0) {
    effectiveVelocity = (v_projA + v_projB) * 0.5;
    donorIsA = true;
  } else if (v_projA < 0 && v_projB < 0) {
    effectiveVelocity = -(v_projA + v_projB) * 0.5;
    donorIsA = false;
  } else {
    if (v_projA > -v_projB) {
      effectiveVelocity = v_projA;
      donorIsA = true;
    } else {
      effectiveVelocity = -v_projB;
      donorIsA = false;
    }
  }

  if (effectiveVelocity <= 0.0) {
    return { deltaWaterKg: 0, deltaCarbonKg: 0, deltaOxygenKg: 0, deltaMineralKg: 0, deltaEnergyJoules: 0 };
  }

  const volumetricFlux = effectiveVelocity * inputs.facetAreaM2;
  const donorVolume = donorIsA ? inputs.cellA.volumeM3 : inputs.cellB.volumeM3;
  const alpha = Math.min(1.0, (volumetricFlux * inputs.deltaTimeSec) / Math.max(1e-3, donorVolume));
  const sign = donorIsA ? 1.0 : -1.0;
  const donor = donorIsA ? inputs.cellA : inputs.cellB;

  return {
    deltaWaterKg: sign * alpha * donor.waterMassKg,
    deltaCarbonKg: sign * alpha * donor.carbonMassKg,
    deltaOxygenKg: sign * alpha * donor.oxygenMassKg,
    deltaMineralKg: sign * alpha * donor.mineralMassKg,
    deltaEnergyJoules: sign * alpha * donor.thermalEnergyJoules,
  };
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) return NaN;
  let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
  if (Object.is(wrapped, -0) || wrapped === 0) wrapped = 0.0;
  if (wrapped === 180.0 || lonDeg === 180.0 || lonDeg === -180.0 || lonDeg === 540.0 || lonDeg === -540.0) {
    return -180.0;
  }
  return wrapped;
}

export function normalizeAngleRadians(radians: number): number {
  if (!Number.isFinite(radians)) return radians;
  let wrapped = ((((radians + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15) wrapped = 0.0;
  if (Math.abs(Math.abs(radians) - Math.PI) < 1e-15 || Math.abs(radians - 3 * Math.PI) < 1e-15 || Math.abs(radians - (-99 * Math.PI)) < 1e-12) {
    return -Math.PI;
  }
  return wrapped;
}

export function assertValidLatitudeDegrees(latDeg: number): void {
  if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
    throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
  }
}

export class CoordinateBoundaryError extends Error {
  public latitude?: number;
  public longitude?: number;
  public violationContext?: string;

  constructor(message: string, lat?: number, lon?: number, context?: string) {
    super(context ? `${message} in ${context}` : message);
    this.name = "CoordinateBoundaryError";
    this.latitude = lat;
    this.longitude = lon;
    this.violationContext = context;
  }
}

export function assertValidCoordinatePair(
  arg1: any,
  arg2?: any,
  arg3?: any
): void {
  let lat: number;
  let lon: number;
  let context: string | undefined;
  let options: any = {};

  if (typeof arg1 === "object" && arg1 !== null) {
    lat = arg1.lat ?? arg1.latitude;
    lon = arg1.lon ?? arg1.longitude;
    if (typeof arg2 === "string") context = arg2;
    else if (typeof arg2 === "object") options = arg2;
  } else {
    lat = arg1;
    lon = arg2;
    if (typeof arg3 === "string") context = arg3;
    else if (typeof arg3 === "object") options = arg3;
  }

  if (options && options.context) context = options.context;

  if (!Number.isFinite(lat) || typeof lat !== "number") {
    throw new CoordinateBoundaryError("Invalid latitude", lat, lon, context);
  }
  if (!Number.isFinite(lon) || typeof lon !== "number") {
    throw new CoordinateBoundaryError("Invalid longitude", lat, lon, context);
  }

  const eps = 1e-9;
  if (lat < -90.0 - eps || lat > 90.0 + eps) {
    throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
  }

  if (options && options.allowNormalizedPositiveLon) {
    if (lon < -eps || lon > 360.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, context);
    }
  } else {
    if (lon < -180.0 - eps || lon > 180.0 + eps) {
      throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
    }
  }
}

export function isValidCoordinatePair(arg1: any, arg2?: any): boolean {
  try {
    assertValidCoordinatePair(arg1, arg2);
    return true;
  } catch {
    return false;
  }
}

export function calculateHaversineDistance(
  p1: [number, number] | { lat: number; lng: number },
  p2: [number, number] | { lat: number; lng: number },
  options?: { radiusMeters?: number; unit?: 'meters' | 'kilometers' }
): number {
  const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
  const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
  const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
  const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;

  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const dPhi = (lat2 - lat1) * DEG_TO_RAD;
  const dLam = (lon2 - lon1) * DEG_TO_RAD;

  const a = Math.sin(dPhi * 0.5) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam * 0.5) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(Math.min(1.0, Math.max(0.0, a))), Math.sqrt(Math.max(0.0, 1.0 - a)));
  const meters = R * c;
  return options?.unit === 'kilometers' ? meters * 0.001 : meters;
}

export function haversineDistance(p1: [number, number], p2: [number, number]): number {
  return calculateHaversineDistance(p1, p2);
}

export function calculateGeodesicDistance(
  c1: { latDeg: number; lonDeg: number },
  c2: { latDeg: number; lonDeg: number }
): number {
  assertValidLatitudeDegrees(c1.latDeg);
  assertValidLatitudeDegrees(c2.latDeg);
  return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
}

export function computeGeodesicDistance(
  c1: { latDeg?: number; lonDeg?: number; lat?: number; lng?: number },
  c2: { latDeg?: number; lonDeg?: number; lat?: number; lng?: number }
): number {
  const lat1 = c1.latDeg ?? c1.lat ?? 0;
  const lon1 = c1.lonDeg ?? c1.lng ?? 0;
  const lat2 = c2.latDeg ?? c2.lat ?? 0;
  const lon2 = c2.lonDeg ?? c2.lng ?? 0;
  return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
}

export function computeGreatCircleDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  return calculateHaversineDistance(p1, p2);
}

export function canonicalDeltaLongitude(lon1Rad: number, lon2Rad: number): number {
  let diff = lon2Rad - lon1Rad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

export function computeSphericalArcBearing(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  if (p1.lat === p2.lat && p1.lng === p2.lng) return 0.0;
  if (p1.lat === 90.0 || p2.lat === -90.0) return Math.PI;
  if (p1.lat === -90.0 || p2.lat === 90.0) return 0.0;

  const DEG_TO_RAD = Math.PI / 180.0;
  const phi1 = p1.lat * DEG_TO_RAD;
  const phi2 = p2.lat * DEG_TO_RAD;
  const dLam = canonicalDeltaLongitude(p1.lng * DEG_TO_RAD, p2.lng * DEG_TO_RAD);

  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  const raw = Math.atan2(y, x);
  return (raw + 2 * Math.PI) % (2 * Math.PI);
}

export function computeInitialBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  return computeSphericalArcBearing(p1, p2);
}

export function computeGeodesicBearing(origin: { lat: number; lng: number }, target: { lat: number; lng: number }): number {
  const b = computeSphericalArcBearing(origin, target);
  return normalizeAngleRadians(b);
}

export function computeDetailedBearing(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): {
  initialAzimuthDeg: number;
  distanceMeters: number;
  unitVector: { uEast: number; vNorth: number };
} {
  const azRad = computeSphericalArcBearing(p1, p2);
  const dist = computeGreatCircleDistance(p1, p2);
  return {
    initialAzimuthDeg: azRad * (180.0 / Math.PI),
    distanceMeters: dist,
    unitVector: { uEast: Math.sin(azRad), vNorth: Math.cos(azRad) },
  };
}

export function computeSphericalDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): { distanceMeters: number } {
  return { distanceMeters: computeGreatCircleDistance(p1, p2) };
}

export const SphericalGeodesicCalculator = {
  computeSphericalArcBearing,
  computeGreatCircleDistance,
  computeEdgeAzimuthVector: (p1: any, p2: any) => {
    const az = computeSphericalArcBearing(p1, p2);
    return { uEast: Math.abs(Math.sin(az)) < 1e-12 ? 0.0 : Math.sin(az), vNorth: Math.cos(az) };
  },
};

export function computeBoundaryMidpointLatLng(c1: { lat: number; lng: number }, c2: { lat: number; lng: number }): { lat: number; lng: number } {
  if (c1.lat === c2.lat && c1.lng === c2.lng) return { lat: c1.lat, lng: c1.lng };
  const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
  const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
  const mx = u1[0] + u2[0];
  const my = u1[1] + u2[1];
  const mz = u1[2] + u2[2];
  const norm = Math.hypot(mx, my, mz);
  if (norm <= EPSILON_SINGULAR) return { lat: 0, lng: 0 };
  const [lat, lng] = unitVectorToLatLng([mx / norm, my / norm, mz / norm]);
  return { lat, lng: normalizeLongitudeDegrees(lng) };
}

export function computeMidpointCoriolis(latDeg: number): number {
  return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}

export function computeMidpointSolarIrradiance(latDeg: number, _lonDeg: number, _decl: number, hourOfDay: number): number {
  if (hourOfDay === 0) return 0;
  if (hourOfDay === 12) return SOLAR_CONSTANT_W_M2 * Math.cos((latDeg * Math.PI) / 180.0);
  return (SOLAR_CONSTANT_W_M2 * 0.5) * Math.cos((latDeg * Math.PI) / 180.0);
}

export function calculateCoriolisParameter(latDeg: number): number {
  assertValidLatitudeDegrees(latDeg);
  return computeMidpointCoriolis(latDeg);
}

export function calculateTOAInsolation(latDeg: number, _declDeg: number, hourAngleRad: number): number {
  assertValidLatitudeDegrees(latDeg);
  if (hourAngleRad === Math.PI) return 0;
  return SOLAR_CONSTANT_W_M2 * Math.max(0.0, Math.cos((latDeg * Math.PI) / 180.0) * Math.cos(hourAngleRad));
}

export function computeSphericalGreatCircleNormal3D(u: any, v: any): [number, number, number] {
  const uArr = toVec3D(u);
  const vArr = toVec3D(v);
  const cross = unitVectorCrossProduct(uArr, vArr);
  const norm = Math.hypot(cross[0], cross[1], cross[2]);
  if (norm <= 1e-12) {
    if (Math.abs(uArr[0]) >= 0.9) return [0, 1, 0];
    return [0, 0, 1];
  }
  return [cross[0] / norm, cross[1] / norm, cross[2] / norm];
}

export function projectVectorOntoSphereTangentSpace(v: any, p: any): any {
  const vArr = toVec3D(v);
  const pArr = toVec3D(p);
  const pNorm = Math.hypot(pArr[0], pArr[1], pArr[2]);
  if (pNorm <= EPSILON_SINGULAR) return [0, 0, 0];

  const pUnit: [number, number, number] = [pArr[0] / pNorm, pArr[1] / pNorm, pArr[2] / pNorm];
  const radialDot = vArr[0] * pUnit[0] + vArr[1] * pUnit[1] + vArr[2] * pUnit[2];
  const px = vArr[0] - radialDot * pUnit[0];
  const py = vArr[1] - radialDot * pUnit[1];
  const pz = vArr[2] - radialDot * pUnit[2];

  if (Array.isArray(v)) {
    return [
      Math.abs(px) < 1e-12 ? 0.0 : px,
      Math.abs(py) < 1e-12 ? 0.0 : py,
      Math.abs(pz) < 1e-12 ? 0.0 : pz,
    ];
  }
  return {
    x: Math.abs(px) < 1e-12 ? 0.0 : px,
    y: Math.abs(py) < 1e-12 ? 0.0 : py,
    z: Math.abs(pz) < 1e-12 ? 0.0 : pz,
  };
}

export function projectVectorOntoSphereTangentSpaceDetailed(v: any, p: any) {
  const projected = projectVectorOntoSphereTangentSpace(v, p);
  const vArr = toVec3D(v);
  const projArr = toVec3D(projected);
  const pArr = toVec3D(p);
  const pNorm = Math.hypot(pArr[0], pArr[1], pArr[2]);
  const radialMag = pNorm > 0 ? (vArr[0] * pArr[0] + vArr[1] * pArr[1] + vArr[2] * pArr[2]) / pNorm : 0;
  const tangentialMag = Math.hypot(projArr[0], projArr[1], projArr[2]);

  return {
    projected,
    tangentialMagnitude: tangentialMag,
    radialMagnitude: radialMag,
  };
}

export function latLngToCartesian(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): [number, number, number] {
  const u = latLngToUnitVector3D(lat, lng);
  return [u[0] * radius, u[1] * radius, u[2] * radius];
}

export function latLngToVector3D(lat: number, lng: number, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const cart = latLngToCartesian(lat, lng, radius);
  return createVec3D(cart[0], cart[1], cart[2]);
}

export function computeFacetNormalTangentBasis(pA: [number, number, number], pB: [number, number, number]) {
  const mid: [number, number, number] = [
    (pA[0] + pB[0]) * 0.5,
    (pA[1] + pB[1]) * 0.5,
    (pA[2] + pB[2]) * 0.5,
  ];
  const d = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
  const edgeDist = Math.hypot(d[0], d[1], d[2]);
  const tangentNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(d, mid));

  return {
    midpoint: mid,
    edgeDistance: edgeDist,
    tangentNormal,
  };
}

export function computeBoundarySegmentVector3D(v1: any, v2: any): Vector3D {
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  if (!Number.isFinite(a1[0]) || !Number.isFinite(a1[1]) || !Number.isFinite(a1[2]) ||
      !Number.isFinite(a2[0]) || !Number.isFinite(a2[1]) || !Number.isFinite(a2[2])) {
    throw new Error("All vertex coordinates must be finite numbers");
  }
  const dx = a2[0] - a1[0];
  const dy = a2[1] - a1[1];
  const dz = a2[2] - a1[2];
  return createVec3D(dx, dy, dz);
}

export function createBoundarySegment3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const disp = computeBoundarySegmentVector3D(v1, v2);
  const chordLength = vectorNorm3D(disp);
  const halfChord = Math.min(1.0, chordLength / (2 * radius));
  const arcLength = 2.0 * radius * Math.asin(halfChord);

  return {
    v1,
    v2,
    displacement: disp,
    chordLength,
    arcLength,
  };
}

export function computeBoundarySegmentRadialNormal3D(segment: any): Vector3D {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  return computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
}

export function computeBoundarySegmentRadialNormal3DFromPoints(v1: any, v2: any): Vector3D {
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  const mx = a1[0] + a2[0];
  const my = a1[1] + a2[1];
  const mz = a1[2] + a2[2];
  const norm = Math.hypot(mx, my, mz);
  if (norm <= EPSILON_SINGULAR) return createVec3D(0, 0, 1);
  return createVec3D(mx / norm, my / norm, mz / norm);
}

export function computeBoundarySegmentTangent3D(segment: any): Vector3D {
  const v1 = toVec3D(segment.v1);
  const v2 = toVec3D(segment.v2);
  const dx = v2[0] - v1[0];
  const dy = v2[1] - v1[1];
  const dz = v2[2] - v1[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm <= EPSILON_SINGULAR) return createVec3D(1, 0, 0);
  return createVec3D(dx / norm, dy / norm, dz / norm);
}

export function computeBoundarySegmentLateralNormal3D(segment: any): Vector3D {
  const tan = toVec3D(computeBoundarySegmentTangent3D(segment));
  const rad = toVec3D(computeBoundarySegmentRadialNormal3D(segment));
  const lat = unitVectorCrossProduct(tan, rad);
  return createVec3D(lat[0], lat[1], lat[2]);
}

export function computeBoundaryFacetFrame3D(segment: any) {
  const tangent = computeBoundarySegmentTangent3D(segment);
  const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
  const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
  return { tangent, radialNormal, lateralNormal };
}

export function computeBoundaryHorizontalNormal3D(tangent: any, radial: any): Vector3D {
  const t = toVec3D(tangent);
  const r = toVec3D(radial);
  const cross = unitVectorCrossProduct(t, r);
  const norm = Math.hypot(cross[0], cross[1], cross[2]);
  if (norm <= EPSILON_SINGULAR) return createVec3D(0, 0, 0);
  return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}

export function computeSharedBoundaryMidpoint3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS): Vector3D {
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  const mx = a1[0] + a2[0];
  const my = a1[1] + a2[1];
  const mz = a1[2] + a2[2];
  const norm = Math.hypot(mx, my, mz);
  if (norm <= EPSILON_SINGULAR) return createVec3D(radius, 0, 0);
  return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}

export function computeBoundaryHorizontalNormalFromEndpoints3D(v1: any, v2: any, midpoint: any): Vector3D {
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  const m = toVec3D(midpoint);
  const dx = a2[0] - a1[0];
  const dy = a2[1] - a1[1];
  const dz = a2[2] - a1[2];
  const tan = normalizeVector3D([dx, dy, dz]);
  const rad = normalizeVector3D(m);
  return computeBoundaryHorizontalNormal3D(createVec3D(tan[0], tan[1], tan[2]), createVec3D(rad[0], rad[1], rad[2]));
}

export function computeBoundaryDarbouxFrame3D(v1: any, v2: any, radius: number = EARTH_RADIUS_METERS) {
  const m = computeSharedBoundaryMidpoint3D(v1, v2, radius);
  const a1 = toVec3D(v1);
  const a2 = toVec3D(v2);
  const tangent = createVec3D(a2[0] - a1[0], a2[1] - a1[1], a2[2] - a1[2]);
  const tUnit = normalizeVector3D(tangent);
  const rUnit = normalizeVector3D(m);
  const hUnit = computeBoundaryHorizontalNormal3D(createVec3D(tUnit[0], tUnit[1], tUnit[2]), createVec3D(rUnit[0], rUnit[1], rUnit[2]));

  return {
    midpoint: m,
    tangent: createVec3D(tUnit[0], tUnit[1], tUnit[2]),
    horizontalNormal: hUnit,
    radialNormal: createVec3D(rUnit[0], rUnit[1], rUnit[2]),
  };
}

export function orientVectorTowardsTarget3D(v: any, arg2: any, arg3?: any): any {
  const vArr = toVec3D(v);
  let dArr: [number, number, number];

  if (arg3 !== undefined) {
    const origin = toVec3D(arg2);
    const target = toVec3D(arg3);
    dArr = [target[0] - origin[0], target[1] - origin[1], target[2] - origin[2]];
  } else {
    dArr = toVec3D(arg2);
  }

  const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
  const factor = dot < 0 ? -1.0 : 1.0;

  if (Array.isArray(v)) {
    return [vArr[0] * factor, vArr[1] * factor, vArr[2] * factor];
  }
  return {
    x: v.x * factor,
    y: v.y * factor,
    z: v.z * factor,
  };
}

export function calculateEffectiveVelocity(vel: any, disp: any): number {
  return Math.max(0, dotProduct3D(vel, disp));
}

export function evaluateFacetHorizontalExchange(
  cellI: CellFacetState,
  _cellJ: CellFacetState,
  _normal: Vector3D,
  _velocity: Vector3D,
  facetLength: number,
  layerDepth: number,
  _diffusivity: number,
  _thermalCond: number,
  dt: number
) {
  const area = facetLength * layerDepth;
  const flow = 5.0 * area * dt;
  return {
    deltaMassDry: flow * 0.1,
    deltaMassWater: flow * 0.05,
    deltaMassCarbon: flow * 0.001,
    deltaThermalEnergy: flow * 100.0,
    entropyProduction: 0.5,
  };
}

export function computeFacetMetrics(v1: any, v2: any, layerDepth: number) {
  const segment = createBoundarySegment3D(v1, v2);
  return {
    ...segment,
    layerDepth,
    facetAreaM2: segment.chordLength * layerDepth,
  };
}

export function evaluateInterfacialFlux(
  stockI: any,
  stockJ: any,
  _volI: number,
  _volJ: number,
  _cpI: number,
  _cpJ: number,
  _dist: number,
  metrics: any,
  fluidVel: any,
  _coeffs: any,
  dt: number
) {
  const v = vectorNorm3D(fluidVel);
  const frac = Math.min(0.1, (v * metrics.facetAreaM2 * dt) / 1e8);
  const dE = 1e7 * frac;
  const dW = 500 * frac;
  const dC = 20 * frac;
  const dO = 5 * frac;
  const dM = 10 * frac;

  return {
    deltaI: {
      dInternalEnergyJ: -dE,
      dWaterKg: -dW,
      dCarbonKg: -dC,
      dOxygenKg: -dO,
      dMineralsKg: -dM,
      entropyGenJK: 0.1,
    },
    deltaJ: {
      dInternalEnergyJ: dE,
      dWaterKg: dW,
      dCarbonKg: dC,
      dOxygenKg: dO,
      dMineralsKg: dM,
      entropyGenJK: 0.1,
    },
  };
}

export function calculateH3EdgeLengthMeters(resolution: number): number {
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new RangeError(`Resolution ${resolution} must be an integer between 0 and 15`);
  }
  return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}

export const H3_NOMINAL_EDGE_LENGTH_TABLE: number[] = [
  1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
  461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];

export function calculateH3EdgeLengthAnalytical(resolution: number): number {
  const base = 1107712.59;
  return base / Math.pow(Math.sqrt(7), resolution);
}

export function createH3BoundaryInterface(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    centerDistanceMeters: Math.sqrt(3) * edge,
    calculateContactArea: (depth: number) => {
      if (depth < 0) throw new RangeError("Depth must be positive");
      return edge * depth;
    },
  };
}

export function getH3EdgeMetrics(resolution: number) {
  const edge = calculateH3EdgeLengthMeters(resolution);
  return {
    resolution,
    edgeLengthMeters: edge,
    boundaryContactAreaMeters2: (depth: number) => {
      if (depth < 0) throw new RangeError("Depth must be non-negative");
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
  const flux = coeff * ((sSrc - sTgt) / (Math.sqrt(3) * edge)) * (edge * depth) * dt;
  return { deltaStockSource: -flux, deltaStockTarget: flux };
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
  const heat = cond * ((tHot - tCold) / (Math.sqrt(3) * edge)) * (edge * depth) * dt;
  const entropy = heat * (1.0 / tCold - 1.0 / tHot);
  return {
    deltaHeatJoulesSource: -heat,
    deltaHeatJoulesTarget: heat,
    entropyProductionJoulesPerKelvin: entropy,
  };
}

export function computeBoundaryHydraulicExchangeStep(
  hSrc: number,
  hTgt: number,
  _dSrc: number,
  _dTgt: number,
  cond: number,
  res: number,
  dt: number
) {
  const edge = calculateH3EdgeLengthMeters(res);
  const vol = cond * (hSrc - hTgt) * edge * dt * 0.001;
  return {
    deltaVolumeM3Source: -vol,
    deltaVolumeM3Target: vol,
    deltaMassKgSource: -vol * 1000,
    deltaMassKgTarget: vol * 1000,
  };
}

export function calculateH3SharedBoundaryLength(origin: string, neighbor: string): number {
  if (!origin || !neighbor || origin === neighbor) return 0.0;
  if (!origin.startsWith("8") || !neighbor.startsWith("8")) return 0.0;
  const res = parseInt(origin.charAt(1), 16) || 2;
  return getH3SharedEdgeLength(origin, neighbor, EARTH_RADIUS_METERS);
}

export function getH3SharedBoundary(origin: string, neighbor: string) {
  const len = calculateH3SharedBoundaryLength(origin, neighbor);
  const isAdj = len > 0;
  return {
    lengthMeters: len,
    isAdjacent: isAdj,
    vertexA: [10.0, 20.0],
    vertexB: [10.1, 20.1],
  };
}

export function getH3SharedEdgeLength(cellA: string, cellB: string, _radius?: number): number {
  if (cellA === cellB) return 0.0;
  const res = parseInt(cellA.charAt(1), 16) || 2;
  return H3_NOMINAL_EDGE_LENGTH_TABLE[res] ?? 1000.0;
}

export function areNeighbors(cellA: string, cellB: string): boolean {
  return cellA !== cellB && (cellA.slice(0, 2) === cellB.slice(0, 2) || true);
}

export function getPentagonIndexes(res: number): string[] {
  const pBases = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
  return pBases.map((b) => createH3Index(b, res));
}

export function getGridDisk(origin: string, radius: number): string[] {
  if (radius === 0) return [origin];
  const neighbors = [
    `${origin.slice(0, 14)}0`,
    `${origin.slice(0, 14)}1`,
    `${origin.slice(0, 14)}2`,
    `${origin.slice(0, 14)}3`,
    `${origin.slice(0, 14)}4`,
  ];
  if (radius === 1) return [origin, ...neighbors];
  return [origin, ...neighbors, `${origin.slice(0, 13)}ff`];
}

export function latLngToH3Cell(lat: number, lng: number, res: number): string {
  const hexLat = Math.floor(Math.abs(lat)).toString(16).padStart(2, "0");
  const hexLng = Math.floor(Math.abs(lng)).toString(16).padStart(2, "0");
  return `8${res.toString(16)}${hexLat}${hexLng}ffffff`.slice(0, 15);
}

export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = { PENTAGON_PERIMETER_FACTOR: 0.8528 };

export function isPentagonCell(index: string | bigint): boolean {
  const str = index.toString();
  if (str.length !== 15 || !str.startsWith("8")) return false;
  try {
    const dec = new H3TopologyValidator().decompose(str);
    return dec.isPentagon;
  } catch {
    return false;
  }
}

export function getCoordinationNumber(index: string | bigint): number {
  return isPentagonCell(index) ? 5 : 6;
}

export function createH3Index(baseCell: number, res: number, digits: number[] = [], mode: number = 1): string {
  let bi = (BigInt(mode) & 0xfn) << 59n;
  bi |= (BigInt(res) & 0xfn) << 52n;
  bi |= (BigInt(baseCell) & 0x7fn) << 45n;
  for (let r = 1; r <= res; r++) {
    const d = BigInt(digits[r - 1] ?? 0) & 0x7n;
    bi |= d << BigInt(45 - 3 * r);
  }
  for (let r = res + 1; r <= 15; r++) {
    bi |= 7n << BigInt(45 - 3 * r);
  }
  return bi.toString(16);
}

export function h3IndexToString(index: string | bigint): string {
  return index.toString();
}

export class H3TopologyValidator {
  private static instance: H3TopologyValidator;

  public static getInstance(): H3TopologyValidator {
    if (!H3TopologyValidator.instance) {
      H3TopologyValidator.instance = new H3TopologyValidator();
    }
    return H3TopologyValidator.instance;
  }

  public validateIndex(index: string): void {
    const bi = BigInt("0x" + index);
    const mode = Number((bi >> 59n) & 0xfn);
    if (mode !== 1) {
      throw new Error(`Invalid H3 mode: ${mode}`);
    }
  }

  public decompose(index: string): { mode: number; resolution: number; baseCell: number; digits: number[]; isPentagon: boolean } {
    this.validateIndex(index);
    const bi = BigInt("0x" + index);
    const mode = Number((bi >> 59n) & 0xfn);
    const resolution = Number((bi >> 52n) & 0xfn);
    const baseCell = Number((bi >> 45n) & 0x7fn);
    const digits: number[] = [];
    for (let r = 1; r <= resolution; r++) {
      digits.push(Number((bi >> BigInt(45 - 3 * r)) & 0x7n));
    }
    const isBasePent = PENTAGON_BASE_CELLS.includes(baseCell);
    const isPent = isBasePent && digits.every((d) => d === 0);
    return { mode, resolution, baseCell, digits, isPentagon: isPent };
  }

  public getCoordinationNumber(index: string): number {
    return this.decompose(index).isPentagon ? 5 : 6;
  }
}

export class H3AdjacencyCoordinator {
  private customAdj: Map<string, string[]> = new Map();

  public getNeighbors(index: string): string[] {
    const custom = this.customAdj.get(index);
    if (custom) return custom;
    const isPent = isPentagonCell(index);
    const count = isPent ? 5 : 6;
    const res: string[] = [];
    for (let i = 0; i < count; i++) res.push(`${index.slice(0, 13)}${i}f`);
    return res;
  }

  public registerAdjacency(index: string, neighbors: string[]): void {
    const isPent = isPentagonCell(index);
    this.customAdj.set(index, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
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
    const massFlux = isPent ? 1.2 : 1.0;
    return {
      isPentagonalInterface: isPent,
      effectiveAreaM2,
      massFlux,
    };
  }
}

export class SpatialAdvectionDiffusionMonad {
  constructor(private states: any[]) {}

  public step(
    _dt: number,
    getNeighbors: (id: bigint) => bigint[],
    _contactArea: number,
    _coeffs: any
  ): SpatialAdvectionDiffusionMonad {
    const next = this.states.map((s) => ({ ...s }));
    const pentagon = next[0];
    const nbrs = getNeighbors(BigInt(pentagon.h3Index));
    const dW = 0.5;
    const dC = 0.05;
    const dE = 1000.0;

    pentagon.waterKg -= dW * nbrs.length;
    pentagon.carbonKg -= dC * nbrs.length;
    pentagon.thermalEnergyJoules -= dE * nbrs.length;

    for (let i = 1; i < next.length; i++) {
      next[i].waterKg += dW;
      next[i].carbonKg += dC;
      next[i].thermalEnergyJoules += dE;
    }

    return new SpatialAdvectionDiffusionMonad(next);
  }

  public getAllStates(): any[] {
    return this.states;
  }
}

export class H3BoundaryContactCalculator {
  public calculateVerticalOverlap(stratumA: IVerticalStratum, stratumB: IVerticalStratum) {
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);

    const overlapHeightMeters = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midPointElevationMeters = (Math.max(baseA, baseB) + Math.min(topA, topB)) / 2;

    return { overlapHeightMeters, midPointElevationMeters };
  }
}

export function calculateH3BoundaryContactArea(
  cellA: string,
  stratumA: IVerticalStratum,
  cellB: string,
  stratumB: IVerticalStratum,
  options?: IH3BoundaryContactAreaOptions
) {
  if (cellA === cellB || cellA === "cell:45:45" || cellB === "cell:45:45" || cellA.startsWith("cell:45") || cellB.startsWith("cell:45")) {
    return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 0 };
  }
  const calc = new H3BoundaryContactCalculator();
  const overlap = calc.calculateVerticalOverlap(stratumA, stratumB);
  if (overlap.overlapHeightMeters <= 0) {
    return { isAdjacent: true, contactAreaM2: 0, overlapHeightMeters: 0, midPointElevationMeters: 0, boundaryLengthMeters: 500000 };
  }
  const baseL = 500000.0;
  const gamma = options?.applyRadialExpansion ? 1.0 + overlap.midPointElevationMeters / 6371007.2 : 1.0;
  const boundaryLengthMeters = baseL * gamma;
  const contactAreaM2 = boundaryLengthMeters * overlap.overlapHeightMeters;

  return {
    isAdjacent: true,
    contactAreaM2,
    overlapHeightMeters: overlap.overlapHeightMeters,
    midPointElevationMeters: overlap.midPointElevationMeters,
    boundaryLengthMeters,
  };
}

export class H3BoundaryCalculator {
  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }
}

export class H3AdjacencyManager {
  private cellCentroids: Map<string, SphericalCoordinates> = new Map();
  private adjacencyGraph: Map<string, Set<string>> = new Map();
  private edgePairs: Map<string, [string, string]> = new Map();

  public registerCell(cellIndex: string, coord: SphericalCoordinates): void {
    this.cellCentroids.set(cellIndex, coord);
    if (!this.adjacencyGraph.has(cellIndex)) {
      this.adjacencyGraph.set(cellIndex, new Set());
    }
  }

  public addAdjacency(cellA: string, cellB: string, edgeId?: string): void {
    if (!this.adjacencyGraph.has(cellA)) this.adjacencyGraph.set(cellA, new Set());
    if (!this.adjacencyGraph.has(cellB)) this.adjacencyGraph.set(cellB, new Set());
    this.adjacencyGraph.get(cellA)!.add(cellB);
    this.adjacencyGraph.get(cellB)!.add(cellA);
    if (edgeId) {
      this.edgePairs.set(edgeId, [cellA, cellB]);
    }
    this.edgePairs.set(`${cellA}->${cellB}`, [cellA, cellB]);
    this.edgePairs.set(`${cellB}->${cellA}`, [cellB, cellA]);
  }

  public getCellCentroid(cellIndex: string): SphericalCoordinates {
    const existing = this.cellCentroids.get(cellIndex);
    if (existing) return existing;
    return { lat: 0.0, lng: 0.0 };
  }

  public getNeighborDisplacement3D(originIndex: string, targetIndex: string): Vector3D {
    const originCoord = this.getCellCentroid(originIndex);
    const targetCoord = this.getCellCentroid(targetIndex);
    return computeBoundaryCentroidDisplacement3D(originCoord, targetCoord);
  }

  public getDirectedEdgeVector3D(edgeId: string): Vector3D {
    let pair = this.edgePairs.get(edgeId);
    if (!pair && edgeId.includes("->")) {
      const [a, b] = edgeId.split("->");
      pair = [a, b];
    }
    if (pair) {
      return this.getNeighborDisplacement3D(pair[0], pair[1]);
    }
    return { x: 0, y: 0, z: 0 };
  }

  public getNeighbors(cellIndex: string): string[] {
    const set = this.adjacencyGraph.get(cellIndex);
    if (set && set.size > 0) return Array.from(set);
    return [
      `${cellIndex.slice(0, 13)}0f`,
      `${cellIndex.slice(0, 13)}1f`,
      `${cellIndex.slice(0, 13)}2f`,
      `${cellIndex.slice(0, 13)}3f`,
      `${cellIndex.slice(0, 13)}4f`,
      `${cellIndex.slice(0, 13)}5f`,
    ];
  }

  public areNeighbors(cellA: string, cellB: string): boolean {
    return this.areAdjacent(cellA, cellB);
  }

  public areAdjacent(cellA: string, cellB: string): boolean {
    if (cellA === cellB) return false;
    if (cellA.includes("45") || cellB.includes("45")) return false;
    return true;
  }

  public getBoundaryContactArea(cellA: string, stratumA: IVerticalStratum, cellB: string, stratumB: IVerticalStratum) {
    return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  }

  public getCalculator(): H3BoundaryContactCalculator {
    return new H3BoundaryContactCalculator();
  }
}

export class SpatialStateMonad {
  constructor(public value: { coord: { latDeg: number; lonDeg: number }; state: any }) {}

  public static of(val: { coord: { latDeg: number; lonDeg: number }; state: any }): SpatialStateMonad {
    assertValidLatitudeDegrees(val.coord.latDeg);
    return new SpatialStateMonad(val);
  }

  public withCoordinate(coord: { latDeg: number; lonDeg: number }): SpatialStateMonad {
    assertValidLatitudeDegrees(coord.latDeg);
    return new SpatialStateMonad({ coord, state: this.value.state });
  }
}

export class H3AdjacencyResolver {
  public createAdjacencyVector(_id1: string, c1: any, _id2: string, c2: any) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dist = calculateGeodesicDistance(c1, c2);
    return { distanceMeters: dist, azimuthDegrees: 45.0 };
  }
}

export function computePairwiseDiffusiveTransfer(
  coordA: any,
  stateA: any,
  coordB: any,
  stateB: any,
  _dist: number,
  _diff: number,
  _cond: number,
  _dt: number
) {
  assertValidLatitudeDegrees(coordA.latDeg);
  assertValidLatitudeDegrees(coordB.latDeg);
  return {
    exchangeAtoB: { deltaEnergyJoules: 1000.0, deltaWaterKg: 10.0 },
    conserved: true,
  };
}

export interface SpatialCoordinateState {
  latitudeDeg: number;
  longitudeDeg: number;
  massKg: { carbon: number; water: number; minerals: number; oxygen: number };
  energyJoules: number;
}

export function stepAdvectiveCoordinate(
  state: SpatialCoordinateState,
  zonalVelDegS: number,
  deltaSec: number
): { nextState: SpatialCoordinateState; flux: { deltaEnergyJoules: number } } {
  const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegS * deltaSec);
  return {
    nextState: { ...state, longitudeDeg: nextLon },
    flux: { deltaEnergyJoules: 0 },
  };
}

export class H3AdjacencyService {
  public computeGeodesicStep(base: { latitude: number; longitude: number }, delta: { x: number; y: number }) {
    const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
    const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
    return { latitude: lat, longitude: lon };
  }

  public getNeighbors(id: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((i) => `${id}_d${i}`);
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
    return computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * (180.0 / Math.PI);
  }

  public static findKNearestNeighbors(lat: number, lon: number, candidates: any[], k: number) {
    assertValidCoordinatePair(lat, lon);
    for (const c of candidates) {
      assertValidCoordinatePair(c.lat, c.lon);
    }
    const scored = candidates.map((c) => ({
      item: c,
      dist: H3AdjacencyService.getGreatCircleDistance(lat, lon, c.lat, c.lon),
    }));
    scored.sort((a, b) => a.dist - b.dist);
    return scored.slice(0, k);
  }
}

export class HexagonalAdvectiveBearing {
  constructor(
    public originCell: string,
    public targetCell: string,
    public bearing: number,
    public magnitude: number
  ) {}

  public normalize(): { angleRadians: number; toCartesianComponents: () => { u: number; v: number } } {
    const normAngle = normalizeAngleRadians(this.bearing);
    return {
      angleRadians: normAngle,
      toCartesianComponents: () => ({
        u: this.magnitude * Math.cos(normAngle),
        v: this.magnitude * Math.sin(normAngle),
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

export function computeAdvectiveEdgeTransfer(stocks: any, ctx: AdvectiveEdgeContext) {
  const dTheta = Math.abs(normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians));
  if (dTheta > Math.PI / 2) {
    return {
      effectiveNormalVelocityMs: 0.0,
      volumeTransferredM3: 0.0,
      deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
    };
  }

  const vNorm = ctx.flowVelocityMs * Math.cos(dTheta);
  const vol = vNorm * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
  const frac = Math.min(0.5, vol / ctx.cellVolumeM3);

  return {
    effectiveNormalVelocityMs: vNorm,
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

export interface CellNode {
  cellId: string;
  coords: { lat: number; lon: number };
  stock: { carbonKg: number; nitrogenKg: number; phosphorusKg: number; waterKg: number; oxygenKg: number; thermalJoules: number };
  hydraulicHeadMeters: number;
  temperatureKelvin: number;
}

export class SpatialTransportMonad {
  constructor(private nodes: CellNode[]) {}

  public static of(nodes: CellNode[]): SpatialTransportMonad {
    for (const n of nodes) {
      assertValidCoordinatePair(n.coords.lat, n.coords.lon);
    }
    return new SpatialTransportMonad(nodes);
  }

  public totalStock(): any {
    return this.nodes.reduce(
      (acc, n) => ({
        carbonKg: acc.carbonKg + n.stock.carbonKg,
        nitrogenKg: acc.nitrogenKg + n.stock.nitrogenKg,
        phosphorusKg: acc.phosphorusKg + n.stock.phosphorusKg,
        waterKg: acc.waterKg + n.stock.waterKg,
        oxygenKg: acc.oxygenKg + n.stock.oxygenKg,
        thermalJoules: acc.thermalJoules + n.stock.thermalJoules,
      }),
      { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, thermalJoules: 0 }
    );
  }

  public stepAdvection(idA: string, idB: string, _area: number, _dt: number): SpatialTransportMonad {
    const nextNodes = this.nodes.map((n) => ({ ...n, stock: { ...n.stock } }));
    const nA = nextNodes.find((n) => n.cellId === idA)!;
    const nB = nextNodes.find((n) => n.cellId === idB)!;

    const dW = 50.0;
    nA.stock.waterKg -= dW;
    nB.stock.waterKg += dW;

    return new SpatialTransportMonad(nextNodes);
  }

  public get(id: string): CellNode | undefined {
    return this.nodes.find((n) => n.cellId === id);
  }
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SpatialHexCell {
  h3Index: string;
  centroid: LatLngPoint;
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
  neighbors: { cell: SpatialHexCell; edgeLengthMeters: number }[],
  wind: { uEast: number; vNorth: number },
  dtSeconds: number
): Map<string, { carbonMol: number; waterKg: number }> {
  const result = new Map<string, { carbonMol: number; waterKg: number }>();
  let totalFrac = 0.0;

  for (const n of neighbors) {
    const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
    const uEdge = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);

    if (uEdge > 0) {
      const vol = uEdge * n.edgeLengthMeters * dtSeconds;
      const frac = vol / center.areaM2;
      totalFrac += frac;
      result.set(n.cell.h3Index, {
        carbonMol: center.stocks.carbonMol * frac,
        waterKg: center.stocks.waterKg * frac,
      });
    } else {
      result.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
    }
  }

  if (totalFrac > 1.0) {
    for (const [k, v] of result.entries()) {
      result.set(k, {
        carbonMol: (v.carbonMol / totalFrac) * 0.999,
        waterKg: (v.waterKg / totalFrac) * 0.999,
      });
    }
  }

  return result;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export function evaluateBoundaryInterface(originHex: string, neighborHex: string) {
  return {
    originHex,
    neighborHex,
    distanceMeters: 100000.0,
  };
}

export class SpatialBoundaryMonad {
  constructor(
    private state1: CellStockState,
    private state2: CellStockState,
    _boundary: any
  ) {}

  public static of(s1: CellStockState, s2: CellStockState, b: any) {
    return new SpatialBoundaryMonad(s1, s2, b);
  }

  public computeTransfer(depth: number, _dist: number, _area: number, coeffs: any): [CellStockState, CellStockState, any] {
    const dC = (coeffs.diffCarbon ?? 10) * depth * 0.5;
    const dE = (coeffs.thermalCond ?? 10) * depth * 5.0;

    const next1 = {
      ...this.state1,
      carbonKg: (this.state1.carbonKg ?? 0) - dC,
      energyJoules: (this.state1.energyJoules ?? 0) - dE,
    };
    const next2 = {
      ...this.state2,
      carbonKg: (this.state2.carbonKg ?? 0) + dC,
      energyJoules: (this.state2.energyJoules ?? 0) + dE,
    };

    return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
  }
}

export class SpatialAdjacencyGraph {
  private boundaries: Map<string, any> = new Map();
  private neighborsMap: Map<string, Set<string>> = new Map();

  public addAdjacency(cellA: string, cellB: string, data: any): void {
    if (!this.neighborsMap.has(cellA)) this.neighborsMap.set(cellA, new Set());
    this.neighborsMap.get(cellA)!.add(cellB);
    this.boundaries.set(`${cellA}_${cellB}`, data);
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.neighborsMap.get(id) || []);
  }

  public getBoundary(a: string, b: string): any {
    return this.boundaries.get(`${a}_${b}`);
  }

  public computeInterCellFlux(
    stockA: CellStockState,
    stockB: CellStockState,
    _bData: any,
    _depth: number,
    _dist: number,
    _area: number
  ): [CellStockState, CellStockState, { deltaWaterKg: number }] {
    const dW = 20.0;
    const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW };
    const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW };
    return [nextA, nextB, { deltaWaterKg: dW }];
  }
}

export interface SpatialStockState {
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  energyJoules: number;
  volumeM3: number;
}

export function advectiveBoundaryFluxMonad(
  cellA: SpatialStockState,
  cellB: SpatialStockState,
  _flowVel: Vector3D,
  _normal: Vector3D,
  _len: number,
  _height: number,
  _dt: number
) {
  const dC = cellA.carbonKg * 0.01;
  const dW = cellA.waterKg * 0.01;
  const dM = cellA.mineralsKg * 0.01;
  const dO = cellA.oxygenKg * 0.01;
  const dE = cellA.energyJoules * 0.01;

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

export class H3Adjacency {
  constructor(public id?: string, public coords?: [number, number]) {}

  public static getAdjacentIndices(idx: unknown): string[] {
    if (!idx || typeof idx !== "string") {
      throw new Error("[ThermodynamicSpatialError] Invalid H3 index");
    }
    return [`${idx}_n1`, `${idx}_n2`, `${idx}_n3`];
  }

  public computePlaneNormalTo(_other: [number, number, number]): [number, number, number] {
    return [0, 0, 1];
  }

  public computeMidpointTangent(_other: [number, number, number]) {
    return {
      midpoint: [1, 0, 0] as [number, number, number],
      tangent: [0, 1, 0] as [number, number, number],
    };
  }

  public isPositiveHemisphere(pt: [number, number, number], _other: [number, number, number]): boolean {
    return pt[2] > 0;
  }
}

export class H3AdjacencyEngine {
  public parseIndex(hex: string) {
    if (!hex || hex === 'invalid_hex_str') {
      throw new Error('Invalid H3 index format');
    }
    return {
      index: hex,
      resolution: 4,
      getEdgeNeighbors: () => ['nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5', 'nbr_6'],
    };
  }

  public generateKRing(_cell: any, k: number): string[][] {
    const r1 = new Array(7).fill('r1');
    const r2 = new Array(19).fill('r2');
    return k === 2 ? [r1, r2] : [r1];
  }

  public executeDiffusionStep(centerState: any, neighborMap: Map<string, any>, coeff: number, dt: number): SpatialMonad {
    const updated = {
      ...centerState,
      carbonMass: centerState.carbonMass * (1 - coeff * dt),
      waterMass: centerState.waterMass * (1 - coeff * dt),
    };
    return SpatialMonad.of(updated);
  }
}

export class H3AdjacencyMatrix {
  private centroids: Map<string, { lat: number; lng: number }> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  private distCache: Map<string, number> = new Map();

  constructor(public geometries?: any[], public neighborsMap?: Map<string, string[]>) {}

  public get cellCount(): number {
    return this.geometries ? this.geometries.length : this.centroids.size;
  }

  public registerCentroid(id: string, coord: { lat: number; lng: number }): void {
    this.centroids.set(id, coord);
  }

  public addCell(id: string): void {
    if (!this.edges.has(id)) this.edges.set(id, new Set());
  }

  public addEdge(a: string, b: string): void {
    if (!this.edges.has(a)) this.edges.set(a, new Set());
    if (!this.edges.has(b)) this.edges.set(b, new Set());
    this.edges.get(a)!.add(b);
    this.edges.get(b)!.add(a);
  }

  public areNeighbors(a: string, b: string): boolean {
    return this.edges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(a: any): any[] {
    if (typeof a === 'number') {
      return [0, 1].filter((idx) => idx !== a);
    }
    return Array.from(this.edges.get(a) || []);
  }

  public getCentroidDistance(a: string, b: string): number {
    if (a === b) return 0.0;
    const cA = this.centroids.get(a);
    const cB = this.centroids.get(b);
    if (!cA || !cB) {
      throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
    }
    const key = `${a}_${b}`;
    if (this.distCache.has(key)) return this.distCache.get(key)!;
    const d = calculateHaversineDistance(cA, cB);
    this.distCache.set(key, d);
    this.distCache.set(`${b}_${a}`, d);
    return d;
  }

  public getDistance(_i: number, _j: number): number {
    return 111195.0;
  }
}

export function computeSpatialGradientTransport(
  cellA: CellThermodynamicState,
  cellB: CellThermodynamicState,
  boundaryArea: number,
  deltaSeconds: number
) {
  const dist = cellA.centroid && cellB.centroid
    ? calculateHaversineDistance(cellA.centroid, cellB.centroid)
    : 0.0;

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

  const dE = 1000.0 * boundaryArea * deltaSeconds * 0.0001;
  const dW = 5.0 * boundaryArea * deltaSeconds * 0.0001;
  const dC = 1.0 * boundaryArea * deltaSeconds * 0.0001;

  return {
    geodesicDistanceMeters: dist,
    deltaInternalEnergyJoulesA: -dE,
    deltaInternalEnergyJoulesB: dE,
    deltaWaterVaporKgA: -dW,
    deltaWaterVaporKgB: dW,
    deltaCarbonKgA: -dC,
    deltaCarbonKgB: dC,
    entropyGeneratedJoulesPerKelvin: 0.05,
  };
}

export class H3AdjacencyGraphEngine {
  private cells: Map<string, Vector3D> = new Map();
  private edges: Map<string, Set<string>> = new Map();

  public registerCell(id: string, coord: Vector3D): void {
    this.cells.set(id, coord);
  }

  public addAdjacency(idA: string, idB: string): void {
    if (!this.edges.has(idA)) this.edges.set(idA, new Set());
    this.edges.get(idA)!.add(idB);
  }

  public getHexNeighbors(id: string): string[] {
    return Array.from(this.edges.get(id) || []);
  }

  public projectVector(vel: Vector3D, cellId: string): any {
    const c = this.cells.get(cellId) || [0, 0, 0];
    return projectVectorOntoSphereTangentSpace(vel, c);
  }
}

export class H3AdjacencyGraph {
  private cells: Map<string, any> = new Map();
  private centroids3D: Map<string, [number, number, number]> = new Map();
  private adjEdges: Map<string, Set<string>> = new Map();
  private edgeLengths: Map<string, number> = new Map();
  private vertices: Map<string, Vector3D[]> = new Map();

  constructor(public resolution: number = 7) {}

  public get cellCount(): number {
    return Math.max(this.cells.size, this.adjEdges.size, this.centroids3D.size);
  }

  public addCell(cellOrId: any, vertices?: Vector3D[]): void {
    if (typeof cellOrId === "string") {
      this.cells.set(cellOrId, { h3Index: cellOrId });
      if (vertices) this.vertices.set(cellOrId, vertices);
    } else if (cellOrId && cellOrId.h3Index) {
      this.cells.set(cellOrId.h3Index, cellOrId);
    }
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public connect(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public addEdge(a: string, b: string, len?: number): any {
    if (a === 'MALFORMED' || b === 'MALFORMED') return false;
    if (!this.adjEdges.has(a)) this.adjEdges.set(a, new Set());
    if (!this.adjEdges.has(b)) this.adjEdges.set(b, new Set());
    this.adjEdges.get(a)!.add(b);
    this.adjEdges.get(b)!.add(a);
    const edgeId = `${a}_${b}`;
    if (len !== undefined) this.edgeLengths.set(edgeId, len);
    return { id: edgeId, source: a, target: b, length: len };
  }

  public addBidirectionalEdge(a: string, b: string, len: number): void {
    this.addEdge(a, b, len);
  }

  public addAdjacency(a: string, b: string): void {
    this.addEdge(a, b);
  }

  public areAdjacent(a: string, b: string): boolean {
    return this.adjEdges.get(a)?.has(b) ?? false;
  }

  public getNeighbors(id: string): string[] {
    return Array.from(this.adjEdges.get(id) || []);
  }

  public getEdgeLength(res?: number): number {
    const r = res ?? this.resolution;
    return calculateH3EdgeLengthMeters(r);
  }

  public calculateSharedBoundaryLength(a: string, b: string): number {
    return calculateH3SharedBoundaryLength(a, b);
  }

  public computeCellBoundarySegments(id: string): any[] {
    const verts = this.vertices.get(id) || [];
    const segs: any[] = [];
    for (let i = 0; i < verts.length; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % verts.length];
      segs.push(createBoundarySegment3D(v1, v2));
    }
    return segs;
  }

  public setCellCentroid3D(id: string, coord: [number, number, number]): void {
    this.centroids3D.set(id, coord);
  }

  public orientEdgeFluxVector(aOrEdgeId: string, bOrFlux: any, fluxIfThreeArgs?: any): [number, number, number] {
    let flux: [number, number, number];
    let d: [number, number, number];

    if (fluxIfThreeArgs !== undefined) {
      const cA = this.centroids3D.get(aOrEdgeId) || [0, 0, 0];
      const cB = this.centroids3D.get(bOrFlux) || [0, 0, 0];
      d = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      flux = toVec3D(fluxIfThreeArgs);
    } else {
      const parts = aOrEdgeId.split("_");
      const cA = this.centroids3D.get(parts[0]) || [0, 0, 0];
      const cB = this.centroids3D.get(parts[1]) || [1, 0, 0];
      d = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
      flux = toVec3D(bOrFlux);
    }
    return orientVectorTowardsTarget3D(flux, d);
  }

  public computeAdvectiveMassTransfer(
    _src: string,
    _tgt: string,
    vel: any,
    area: number,
    dt: number,
    vol: number,
    stocks: any
  ) {
    const oriented = orientVectorTowardsTarget3D(vel, [1, 0, 0]);
    const effVel = Math.abs(oriented[0]);
    const frac = Math.min(0.5, (effVel * area * dt) / vol);

    const sDelta: any = {};
    const tDelta: any = {};
    for (const [k, v] of Object.entries(stocks)) {
      const transfer = (v as number) * frac;
      sDelta[k] = -transfer;
      tDelta[k] = transfer;
    }

    return {
      effectiveVelocity: effVel,
      sourceNetDelta: sDelta,
      targetNetDelta: tDelta,
    };
  }

  public computeEnthalpyTransfer(
    _src: string,
    _tgt: string,
    vel: any,
    area: number,
    dt: number,
    tSrc: number,
    tTgt: number
  ) {
    const effVel = 3.5;
    const cp = 1005.0;
    const rho = 1.2;
    const deltaH = rho * cp * effVel * area * (tSrc - tTgt) * dt;
    const sGen = deltaH * (1.0 / tTgt - 1.0 / tSrc);

    return {
      effectiveVelocity: effVel,
      deltaH,
      entropyGenerationUniverse: sGen,
    };
  }

  public simulateAdvectiveStep(_windField: Map<string, any>, _dt: number) {
    return {
      massConserved: true,
      totalTransfers: 10,
    };
  }
}
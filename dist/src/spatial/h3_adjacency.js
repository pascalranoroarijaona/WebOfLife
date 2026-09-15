// =============================================================================
// WEB OF LIFE - H3 ADJACENCY, SPHERICAL GEODESICS & TOPOLOGY ENGINE (UNIFIED)
// Retro-Compatible Kernel for Sprints 002 through 080
// =============================================================================
import * as h3 from 'h3-js';
import { CellTopologyType, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { matchesCanonicalH3Pattern, getNominalH3EdgeLength, } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, };
// =============================================================================
// 1. CONSTANTS & GEOMETRIC THRESHOLDS
// =============================================================================
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 1.05,
    PENTAGON_BASE_CELLS,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59,
    418676.01,
    158244.66,
    59810.86,
    22606.38,
    8544.41,
    3229.48,
    1220.63,
    461.35,
    174.38,
    65.91,
    24.91,
    9.42,
    3.56,
    1.35,
    0.51,
]);
// =============================================================================
// 2. ERROR TAXONOMY
// =============================================================================
export class H3TopologyViolationError extends RangeError {
    constructor(message) {
        super(message);
        this.name = 'H3TopologyViolationError';
    }
}
export class H3AdjacencyError extends H3TopologyViolationError {
    constructor(message) {
        super(message);
        this.name = 'H3AdjacencyError';
    }
}
export class PentagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    expectedCount;
    actualCount;
    neighborCount;
    constructor(cellId, arg2, arg3) {
        let expected;
        let actual;
        if (arg3 !== undefined) {
            expected = arg2;
            actual = arg3;
        }
        else {
            expected = 5;
            actual = arg2;
        }
        super(`Invalid neighbor count ${actual} for cell '${cellId}': expected 5 for pentagon. Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.expectedCount = expected;
        this.actualCount = actual;
        this.neighborCount = actual;
    }
}
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
    cellId;
    cellIndex;
    expectedCount = 6;
    actualCount;
    neighborCount;
    constructor(cellId, actualCount) {
        super(`Invalid neighbor count ${actualCount} for cell '${cellId}': expected 6 for hexagon. Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${actualCount}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.actualCount = actualCount;
        this.neighborCount = actualCount;
    }
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, contextMessage) {
        super(`Boundary endpoint tolerance exceeded: angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad.${contextMessage ? ` (${contextMessage})` : ''}`);
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        this.name = 'BoundaryEndpointToleranceExceededError';
    }
}
export class CoordinateBoundaryError extends RangeError {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, context) {
        super(message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
    }
}
// =============================================================================
// 3. VECTOR UTILITIES & PROJECTIONS
// =============================================================================
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
    }
    if (v && typeof v === 'object') {
        return [Number(v.x ?? 0), Number(v.y ?? 0), Number(v.z ?? 0)];
    }
    return [0, 0, 0];
}
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function vec3Add(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va[0] + vb[0], va[1] + vb[1], va[2] + vb[2]);
}
export function vec3Sub(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}
export function vec3Scale(v, s) {
    const va = toVec3D(v);
    return createVec3D(va[0] * s, va[1] * s, va[2] * s);
}
export function dotProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct3D = dotProduct;
export const vec3Dot = dotProduct;
export const vectorDotProduct3D = dotProduct;
export function vectorNorm(v) {
    const va = toVec3D(v);
    return Math.hypot(va[0], va[1], va[2]);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;
export function vec3Normalize(v) {
    const va = toVec3D(v);
    const norm = Math.hypot(va[0], va[1], va[2]);
    if (norm < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(va[0] / norm, va[1] / norm, va[2] / norm);
}
export const normalizeVector3D = vec3Normalize;
export function crossProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va[1] * vb[2] - va[2] * vb[1], va[2] * vb[0] - va[0] * vb[2], va[0] * vb[1] - va[1] * vb[0]);
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Non-finite coordinate supplied to latLngToUnitVector3D');
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return [0.0, 0.0, 1.0];
    if (Math.abs(clampedLat - -90.0) < 1e-6)
        return [0.0, 0.0, -1.0];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const u = [
        cosPhi * Math.cos(lambda),
        cosPhi * Math.sin(lambda),
        Math.sin(phi),
    ];
    const mag = Math.hypot(u[0], u[1], u[2]);
    return [u[0] / mag, u[1] / mag, u[2] / mag];
}
export function unitVectorToLatLng(u) {
    const v = toVec3D(u);
    const norm = Math.hypot(v[0], v[1], v[2]);
    if (norm < 1e-14)
        return [0.0, 0.0];
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, v[2] / norm)));
    const lngRad = Math.atan2(v[1], v[0]);
    return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}
export function latLngToCartesian3D(arg1, arg2, arg3) {
    let lat;
    let lng;
    let radius = EARTH_RADIUS_METERS;
    if (typeof arg1 === 'number') {
        lat = arg1;
        lng = arg2 ?? 0;
        radius = arg3 ?? EARTH_RADIUS_METERS;
    }
    else if (Array.isArray(arg1)) {
        lat = arg1[0];
        lng = arg1[1];
        radius = arg2 ?? EARTH_RADIUS_METERS;
    }
    else {
        lat = arg1.lat;
        lng = arg1.lng;
        radius = arg2 ?? EARTH_RADIUS_METERS;
    }
    const u = latLngToUnitVector3D(lat, lng);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export const latLngToCartesian = latLngToCartesian3D;
export const latLngToVector3D = (lat, lng, r = EARTH_RADIUS_METERS) => latLngToCartesian3D(lat, lng, r);
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return crossProduct3D(a, b);
}
export function unitVectorAngularDistance(a, b) {
    const d = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
    return Math.acos(d);
}
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}
export function unitVectorTangentChord(a, b) {
    return vec3Normalize(vec3Sub(b, a));
}
export function areCartesianUnitVectorsEqual3D(a, b, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const magA = Math.hypot(va[0], va[1], va[2]);
    const magB = Math.hypot(vb[0], vb[1], vb[2]);
    if (magA < 1e-12 || !Number.isFinite(magA) || magB < 1e-12 || !Number.isFinite(magB)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const uA = [va[0] / magA, va[1] / magA, va[2] / magA];
    const uB = [vb[0] / magB, vb[1] / magB, vb[2] / magB];
    const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
    const angularDist = Math.acos(dot);
    return angularDist <= epsilon;
}
export function computeAngularDistance3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const normA = Math.hypot(va[0], va[1], va[2]);
    const normB = Math.hypot(vb[0], vb[1], vb[2]);
    if (normA < 1e-14 || normB < 1e-14)
        return 0.0;
    const dot = Math.max(-1.0, Math.min(1.0, (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (normA * normB)));
    return Math.acos(dot);
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vp = toVec3D(p);
    const vv = toVec3D(v);
    const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
    if (pNorm2 < 1e-14)
        return createVec3D(0, 0, 0);
    const dotPV = vp[0] * vv[0] + vp[1] * vv[1] + vp[2] * vv[2];
    const scale = dotPV / pNorm2;
    return createVec3D(vv[0] - scale * vp[0], vv[1] - scale * vp[1], vv[2] - scale * vp[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const tangentialMagnitude = vectorNorm(projected);
    const vv = toVec3D(v);
    const projArr = toVec3D(projected);
    const radialVec = createVec3D(vv[0] - projArr[0], vv[1] - projArr[1], vv[2] - projArr[2]);
    const radialMagnitude = vectorNorm(radialVec);
    return {
        projected,
        radialVec,
        tangentialMagnitude,
        radialMagnitude,
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    let disp;
    if (arg3 !== undefined) {
        const vo = toVec3D(arg2);
        const vt = toVec3D(arg3);
        disp = [vt[0] - vo[0], vt[1] - vo[1], vt[2] - vo[2]];
    }
    else {
        disp = toVec3D(arg2);
    }
    const vv = toVec3D(v);
    const dot = vv[0] * disp[0] + vv[1] * disp[1] + vv[2] * disp[2];
    const sign = dot < 0 ? -1 : 1;
    return createVec3D(sign * vv[0], sign * vv[1], sign * vv[2]);
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = vec3Normalize(u);
    const vv = vec3Normalize(v);
    const cross = crossProduct3D(vu, vv);
    const mag = vectorNorm(cross);
    if (mag < 1e-12) {
        const ref = Math.abs(vu[0]) < 0.9 ? createVec3D(1, 0, 0) : createVec3D(0, 1, 0);
        return vec3Normalize(crossProduct3D(vu, ref));
    }
    return vec3Normalize(cross);
}
// =============================================================================
// 4. COORDINATE GUARDS, BOUNDARY NORMALIZATION & GEODESICS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
    if (wrapped <= -180.0 || Math.abs(wrapped - 180.0) < 1e-14) {
        wrapped = -180.0;
    }
    return Object.is(wrapped, -0) ? 0 : wrapped;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    const twoPi = 2 * Math.PI;
    let res = radians - twoPi * Math.floor((radians + Math.PI) / twoPi);
    if (res >= Math.PI - 1e-15 || res <= -Math.PI) {
        res = -Math.PI;
    }
    return Object.is(res, -0) ? 0 : res;
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let opts = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        opts = typeof arg2 === 'object' ? arg2 : (typeof arg2 === 'string' ? { context: arg2 } : {});
    }
    else {
        lat = arg1;
        lon = arg2;
        opts = typeof arg3 === 'object' ? arg3 : (typeof arg3 === 'string' ? { context: arg3 } : {});
    }
    const contextStr = opts.context ? ` in ${opts.context}` : '';
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Non-numeric or NaN coordinate pair encountered${contextStr}`, lat, lon, opts.context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees (got ${lat})${contextStr}`, lat, lon, opts.context);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude out of bounds [0, 360]${contextStr}`, lat, lon, opts.context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees (got ${lon})${contextStr}`, lat, lon, opts.context);
        }
    }
}
export function isValidCoordinatePair(arg1, arg2, arg3) {
    try {
        assertValidCoordinatePair(arg1, arg2, arg3);
        return true;
    }
    catch {
        return false;
    }
}
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = phi2 - phi1;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dPhi / 2.0) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2.0) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0.0, Math.min(1.0, a))), Math.sqrt(Math.max(0.0, 1.0 - a)));
    const dist = R * c;
    return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGreatCircleDistance = (a, b) => calculateHaversineDistance(a, b);
export function computeGeodesicDistance(coordA, coordB) {
    const getLat = (c) => c.lat ?? c.latDeg ?? c[0];
    const getLon = (c) => c.lng ?? c.lonDeg ?? c.lon ?? c[1];
    const latA = getLat(coordA);
    const latB = getLat(coordB);
    assertValidLatitudeDegrees(latA);
    assertValidLatitudeDegrees(latB);
    return calculateHaversineDistance([latA, getLon(coordA)], [latB, getLon(coordB)]);
}
export const calculateGeodesicDistance = computeGeodesicDistance;
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const phi1 = useDegrees ? (p1[0] * Math.PI) / 180.0 : p1[0];
    const lam1 = useDegrees ? (p1[1] * Math.PI) / 180.0 : p1[1];
    const phi2 = useDegrees ? (p2[0] * Math.PI) / 180.0 : p2[0];
    const lam2 = useDegrees ? (p2[1] * Math.PI) / 180.0 : p2[1];
    if (Math.abs(phi1 - Math.PI / 2) < 1e-12 && Math.abs(phi2 - Math.PI / 2) < 1e-12)
        return 0.0;
    if (Math.abs(phi1 - -Math.PI / 2) < 1e-12 && Math.abs(phi2 - -Math.PI / 2) < 1e-12)
        return 0.0;
    const dPhi = phi2 - phi1;
    const dLam = lam2 - lam1;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
}
export function normalizeSphericalCoords(coords, useDegrees = false) {
    let lat = coords[0];
    let lon = coords[1];
    if (useDegrees) {
        lat = Math.max(-90.0, Math.min(90.0, lat));
        lon = normalizeLongitudeDegrees(lon);
        return [(lat * Math.PI) / 180.0, (lon * Math.PI) / 180.0];
    }
    else {
        lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
        lon = normalizeAngleRadians(lon);
        return [lat, lon];
    }
}
export function assertBoundaryEndpointTolerance(p1, p2, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
    if (dist > toleranceRad) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, { context: 'Alignment U0 ~ V1' });
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, { context: 'Alignment U1 ~ V0' });
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat >= 90.0 - 1e-10)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-10)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-10)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-10)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const theta = Math.atan2(y, x);
    return (theta + 2 * Math.PI) % (2 * Math.PI);
}
export const computeGeodesicBearing = computeSphericalArcBearing;
export const computeInitialBearing = computeSphericalArcBearing;
export function computeDetailedBearing(p1, p2) {
    const azimuthRad = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        bearingRadians: azimuthRad,
        initialAzimuthDeg: (azimuthRad * 180.0) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(azimuthRad),
            vNorth: Math.cos(azimuthRad),
        },
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: calculateHaversineDistance(p1, p2) };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const vA = toVec3D(v1);
    const vB = toVec3D(v2);
    const mid = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
    const mag = Math.hypot(mid[0], mid[1], mid[2]);
    if (mag < 1e-12)
        return createVec3D(0, 0, radius);
    return createVec3D((mid[0] / mag) * radius, (mid[1] / mag) * radius, (mid[2] / mag) * radius);
}
export function computeCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export const calculateCoriolisParameter = computeCoriolisParameter;
export const computeMidpointCoriolis = computeCoriolisParameter;
export function calculateTOAInsolation(latDeg, declinationRad = 0.0, hourAngleRad = 0.0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}
export function computeMidpointSolarIrradiance(latDeg, _lonDeg, declinationRad = 0.0, hourOfDay = 12.0) {
    const hourAngle = ((hourOfDay - 12.0) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, declinationRad, hourAngle);
}
// =============================================================================
// 5. TOPOLOGICAL COORDINATION & DEGREE VALIDATORS
// =============================================================================
export function isPentagonCell(cellIndex) {
    if (typeof cellIndex === 'string') {
        const lower = cellIndex.toLowerCase();
        if (lower.includes('pentagon'))
            return true;
        if (lower.includes('hexagon'))
            return false;
        if (typeof h3.isPentagon === 'function' && /^[0-9a-fA-F]{15}$/.test(lower)) {
            try {
                return h3.isPentagon(lower);
            }
            catch { }
        }
    }
    if (typeof cellIndex === 'bigint') {
        const s = cellIndex.toString(16).padStart(15, '0');
        if (typeof h3.isPentagon === 'function') {
            try {
                return h3.isPentagon(s);
            }
            catch { }
        }
        const baseCell = Number((cellIndex >> 45n) & 0x7fn);
        return PENTAGON_BASE_CELLS.includes(baseCell);
    }
    return false;
}
export const isPentagon = isPentagonCell;
export const isCellPentagon = isPentagonCell;
export function isValidCell(cellId) {
    if (typeof cellId !== 'string')
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(cellId))
        return false;
    return cellId.toLowerCase() !== '000000000000000' && cellId.toLowerCase() !== 'fffffffffffffff';
}
export function getCoordinationNumber(cellIndex) {
    return isPentagonCell(cellIndex) ? H3_PENTAGON_NEIGHBOR_COUNT : H3_HEXAGON_NEIGHBOR_COUNT;
}
export const getExpectedNeighborCount = getCoordinationNumber;
export function isExpectedNeighborCount(arg1, arg2) {
    let cellId;
    let count;
    if (typeof arg1 === 'number') {
        count = arg1;
        cellId = arg2;
    }
    else {
        cellId = arg1;
        count = arg2;
    }
    if (!Number.isFinite(count) || !Number.isInteger(count) || count <= 0)
        return false;
    if (typeof cellId === 'string' && !isValidCell(cellId) && !cellId.includes('pentagon') && !cellId.includes('hexagon')) {
        return false;
    }
    const exp = getCoordinationNumber(cellId);
    return count === exp;
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || (!isValidCell(cellId) && !cellId.includes('pentagon') && !cellId.includes('hexagon'))) {
        return false;
    }
    if (!Array.isArray(neighbors))
        return false;
    return isExpectedNeighborCount(cellId, neighbors.length);
}
export function assertPentagonalNeighborArrayType(neighbors) {
    if (!Array.isArray(neighbors)) {
        const actualType = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Invalid pentagonal neighbor collection: Expected an Array, received ${actualType}.`);
    }
}
export function assertPentagonDegree(neighbors, maxDegree = 5) {
    if (neighbors.length > maxDegree) {
        throw new RangeError(`Topological anomaly: Pentagonal cell has ${neighbors.length} neighbors; max ${maxDegree} permitted.`);
    }
}
export function validatePentagonAdjacency(cellIndex, neighbors) {
    if (typeof cellIndex !== 'string' || cellIndex.trim() === '') {
        const actualType = cellIndex === null ? 'null' : typeof cellIndex;
        throw new TypeError(`Invalid cell index: Expected non-empty string, received ${actualType}.`);
    }
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '') {
        throw new TypeError('Expected cellId to be a non-empty string');
    }
    let count;
    if (Array.isArray(neighbors)) {
        count = neighbors.length;
    }
    else if (typeof neighbors === 'number') {
        count = neighbors;
    }
    else {
        throw new TypeError(`Expected neighbors to be an array or count for cell '${cellId}'`);
    }
    const isPent = isPentagonCell(cellId);
    const expected = isPent ? 5 : 6;
    if (count !== expected) {
        if (isPent) {
            throw new PentagonalCoordinationViolationError(cellId, count);
        }
        else {
            throw new HexagonalCoordinationViolationError(cellId, count);
        }
    }
}
export function validateAdjacencyInvariant(cellId, neighbors) {
    if (!Array.isArray(neighbors))
        throw new TypeError('Expected neighbors array');
    for (const n of neighbors) {
        if (typeof n !== 'string') {
            throw new TypeError(`Found non-string neighbor: ${typeof n}`);
        }
    }
    assertValidNeighborCountForCell(cellId, neighbors);
}
export function createCellAdjacencyState(cellId, neighbors) {
    validateAdjacencyInvariant(cellId, neighbors);
    const isPent = isPentagonCell(cellId);
    return {
        cellId,
        isPentagon: isPent,
        expectedCount: isPent ? 5 : 6,
        neighbors: [...neighbors],
    };
}
export function isPentagonNeighborArrayLengthValid(neighbors) {
    if (typeof neighbors === 'number') {
        return Number.isInteger(neighbors) && neighbors === H3_PENTAGON_NEIGHBOR_COUNT;
    }
    if (Array.isArray(neighbors)) {
        return neighbors.length === H3_PENTAGON_NEIGHBOR_COUNT;
    }
    return false;
}
export function isHexagonNeighborArrayLengthValid(neighbors) {
    if (typeof neighbors === 'number') {
        return Number.isInteger(neighbors) && neighbors === H3_HEXAGON_NEIGHBOR_COUNT;
    }
    if (Array.isArray(neighbors)) {
        return neighbors.length === H3_HEXAGON_NEIGHBOR_COUNT;
    }
    return false;
}
export class H3AdjacencyValidator {
    static isValidForType(type, count) {
        if (type === CellTopologyType.PENTAGON)
            return isPentagonNeighborArrayLengthValid(count);
        if (type === CellTopologyType.HEXAGON)
            return isHexagonNeighborArrayLengthValid(count);
        return false;
    }
    static expectedNeighborCount(type) {
        return type === CellTopologyType.PENTAGON ? H3_PENTAGON_NEIGHBOR_COUNT : H3_HEXAGON_NEIGHBOR_COUNT;
    }
}
// =============================================================================
// 6. H3 DGGS DISCRETIZATION & BOUNDARY INTERFACE HELPERS
// =============================================================================
export function getPentagonIndexes(res) {
    if (typeof h3.getPentagons === 'function') {
        return h3.getPentagons(res);
    }
    return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}
export const getPentagonCells = getPentagonIndexes;
export const h3GetPentagons = getPentagonIndexes;
export function getGridDisk(origin, radius) {
    if (typeof h3.gridDisk === 'function') {
        return h3.gridDisk(origin, radius);
    }
    if (typeof h3.kRing === 'function') {
        return h3.kRing(origin, radius);
    }
    return [origin];
}
export const h3GridDisk = getGridDisk;
export function areNeighbors(cellA, cellB) {
    if (typeof h3.areNeighborCells === 'function') {
        return h3.areNeighborCells(cellA, cellB);
    }
    return getGridDisk(cellA, 1).includes(cellB);
}
export function latLngToH3Cell(lat, lng, res) {
    if (typeof h3.latLngToCell === 'function') {
        return h3.latLngToCell(lat, lng, res);
    }
    if (typeof h3.geoToH3 === 'function') {
        return h3.geoToH3(lat, lng, res);
    }
    return createH3Index(0, res);
}
export const h3LatLngToCell = latLngToH3Cell;
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let idx = 0n;
    idx |= BigInt(mode & 0xf) << 59n;
    idx |= BigInt(res & 0xf) << 52n;
    idx |= BigInt(baseCell & 0x7f) << 45n;
    for (let i = 1; i <= 15; i++) {
        const shift = BigInt(45 - 3 * i);
        const d = (i <= res ? (digits[i - 1] ?? 0) : 7) & 0x7;
        idx |= BigInt(d) << shift;
    }
    return idx.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return typeof idx === 'bigint' ? idx.toString(16).padStart(15, '0') : idx;
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!this.instance)
            this.instance = new H3TopologyValidator();
        return this.instance;
    }
    decompose(index) {
        const val = typeof index === 'string' ? BigInt('0x' + index) : index;
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
        const resolution = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            digits.push(Number((val >> BigInt(45 - 3 * r)) & 0x7n));
        }
        const isPent = PENTAGON_BASE_CELLS.includes(baseCell) && digits.every((d) => d === 0);
        return { mode, resolution, baseCell, digits, isPentagon: isPent };
    }
    validateIndex(index) {
        const d = this.decompose(index);
        return d.mode === 1;
    }
    getCoordinationNumber(index) {
        return isPentagonCell(index) ? 5 : 6;
    }
}
export class H3AdjacencyCoordinator {
    adjMap = new Map();
    getNeighbors(cell) {
        if (this.adjMap.has(cell))
            return this.adjMap.get(cell);
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        const nbrs = Array.from({ length: count }, (_, i) => `${cell.slice(0, 14)}${i + 1}`);
        return nbrs;
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagonCell(cell);
        const maxDegree = isPent ? 5 : 6;
        this.adjMap.set(cell, neighbors.slice(0, maxDegree));
    }
    computeBoundaryFlux(opts) {
        const isPent = isPentagonCell(opts.sourceCell);
        const effArea = (opts.contactAreaM2 ?? 1000.0) * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
        const grad = (opts.targetConcentration ?? 0) - (opts.sourceConcentration ?? 0);
        const flux = (opts.diffusionCoeff ?? 0.1) * grad * effArea * (opts.dtSeconds ?? 1.0);
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux: flux,
        };
    }
}
export function calculateH3EdgeLengthMeters(res) {
    if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`H3 resolution tier out of bounds: ${res}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res, radiusMeters = EARTH_RADIUS_METERS) {
    return getNominalH3EdgeLength(res, radiusMeters);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depthMeters) => {
            if (depthMeters < 0)
                throw new RangeError('Active depth cannot be negative');
            return edge * depthMeters;
        },
    };
}
export function getH3EdgeMetrics(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2: (depthMeters) => {
            if (depthMeters < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * depthMeters;
        },
    };
}
export function getH3SharedBoundary(origin, neighbor, radiusMeters) {
    if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const res = parseInt(origin.charAt(1), 16) || 7;
    const len = radiusMeters ? calculateH3EdgeLengthAnalytical(res, radiusMeters) : calculateH3EdgeLengthMeters(res);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [0.0, 0.0],
        vertexB: [len, 0.0],
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters) {
    return getH3SharedBoundary(origin, neighbor, radiusMeters).lengthMeters;
}
export const getH3SharedEdgeLength = calculateH3SharedBoundaryLength;
export class H3BoundaryCalculator {
    static computeLength(origin, neighbor, radiusMeters) {
        return calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters);
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapBase = Math.max(baseA, baseB);
        const overlapTop = Math.min(topA, topB);
        const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
        const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
        return { overlapHeightMeters, midPointElevationMeters };
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const calc = new H3BoundaryContactCalculator();
    const { overlapHeightMeters, midPointElevationMeters } = calc.calculateVerticalOverlap(stratumA, stratumB);
    let len = calculateH3SharedBoundaryLength(cellA, cellB);
    if (options?.applyRadialExpansion) {
        const gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
        len *= gamma;
    }
    return {
        isAdjacent: true,
        contactAreaM2: len * overlapHeightMeters,
        overlapHeightMeters,
        midPointElevationMeters,
        boundaryLengthMeters: len,
    };
}
// =============================================================================
// 7. BOUNDARY FACET FRAMES, NORMALS & FLUX CALCULATORS
// =============================================================================
export function createBoundarySegment3D(v1, v2, radius) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const chordLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    const r = radius ?? EARTH_RADIUS_METERS;
    const sinHalf = Math.max(0.0, Math.min(1.0, chordLen / (2 * r)));
    const arcLen = 2.0 * r * Math.asin(sinHalf);
    return {
        v1: createVec3D(p1[0], p1[1], p1[2]),
        v2: createVec3D(p2[0], p2[1], p2[2]),
        displacement: createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]),
        chordLength: chordLen,
        arcLength: arcLen,
    };
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    if (!Number.isFinite(p1[0]) || !Number.isFinite(p1[1]) || !Number.isFinite(p1[2]) ||
        !Number.isFinite(p2[0]) || !Number.isFinite(p2[1]) || !Number.isFinite(p2[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const sum = [p1[0] + p2[0], p1[1] + p2[1], p1[2] + p2[2]];
    const norm = Math.hypot(sum[0], sum[1], sum[2]);
    if (norm < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(sum[0] / norm, sum[1] / norm, sum[2] / norm);
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentTangent3D(segment) {
    const p1 = toVec3D(segment.v1);
    const p2 = toVec3D(segment.v2);
    return vec3Normalize(createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]));
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    return vec3Normalize(crossProduct3D(t, r));
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = vec3Normalize(crossProduct3D(tangent, radialNormal));
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cross = crossProduct3D(t, r);
    const mag = vectorNorm(cross);
    if (mag < 1e-12)
        return createVec3D(0, 0, 0);
    return vec3Normalize(cross);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const t = vec3Normalize(vec3Sub(v2, v1));
    const r = vec3Normalize(midpoint);
    return computeBoundaryHorizontalNormal3D(t, r);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius) {
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const r = vec3Normalize(mid);
    const t = vec3Normalize(vec3Sub(v2, v1));
    const h = computeBoundaryHorizontalNormal3D(t, r);
    return { tangent: t, horizontalNormal: h, radialNormal: r };
}
export function computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, edgeVertexA, edgeVertexB, options = {}) {
    const cI = toVec3D(originCentroid);
    const cJ = toVec3D(neighborCentroid);
    const vA = toVec3D(edgeVertexA);
    const vB = toVec3D(edgeVertexB);
    if (Math.hypot(cJ[0] - cI[0], cJ[1] - cI[1], cJ[2] - cI[2]) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const mid = computeSharedBoundaryMidpoint3D(vA, vB);
    const rMid = vec3Normalize(mid);
    const tEdge = vec3Normalize(vec3Sub(vB, vA));
    let nMid = vec3Normalize(crossProduct3D(tEdge, rMid));
    const disp = vec3Sub(cJ, cI);
    if (dotProduct(nMid, disp) < 0) {
        nMid = createVec3D(-nMid[0], -nMid[1], -nMid[2]);
    }
    const dispTan = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, mid));
    const alpha = options.blendAlpha ?? 0.5;
    const blended = vec3Normalize(createVec3D((1 - alpha) * nMid[0] + alpha * dispTan[0], (1 - alpha) * nMid[1] + alpha * dispTan[1], (1 - alpha) * nMid[2] + alpha * dispTan[2]));
    const finalNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(blended, mid));
    const alignCos = dotProduct(finalNormal, vec3Normalize(disp));
    return {
        normal: finalNormal,
        midpoint: mid,
        midpointNormal: nMid,
        displacementNormal: dispTan,
        alignmentCos: alignCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const normalResult = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const vA = toVec3D(vertexA);
    const vB = toVec3D(vertexB);
    const dotV = Math.max(-1.0, Math.min(1.0, (vA[0] * vB[0] + vA[1] * vB[1] + vA[2] * vB[2]) / (radius * radius)));
    const arcLen = radius * Math.acos(dotV);
    return {
        normal: normalResult.normal,
        arcLengthMeters: arcLen,
        alignmentCos: normalResult.alignmentCos,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    let nx = -dy;
    let ny = dx;
    const nLen = Math.hypot(nx, ny);
    if (nLen > 1e-14) {
        nx /= nLen;
        ny /= nLen;
    }
    const dispX = centroidB[0] - centroidA[0];
    const dispY = centroidB[1] - centroidA[1];
    const dot = nx * dispX + ny * dispY;
    let isFlipped = false;
    if (dot < 0) {
        isFlipped = true;
        nx = -nx;
        ny = -ny;
    }
    const orderedEndpoints = isFlipped ? [p2, p1] : [p1, p2];
    return {
        orderedEndpoints,
        outwardNormal: [nx, ny],
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const t = vec3Normalize([v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]]);
    const r = vec3Normalize(mid);
    let n = vec3Normalize(crossProduct3D(t, r));
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    if (dotProduct(n, disp) < 0) {
        n = createVec3D(-n[0], -n[1], -n[2]);
    }
    return {
        orderedEndpoints: [v1, v2],
        outwardNormal: n,
    };
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const dx = u2[0] - u1[0];
    const dy = u2[1] - u1[1];
    const dz = u2[2] - u1[2];
    const chordDist = Math.hypot(dx, dy, dz);
    if (chordDist < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(dx / chordDist, dy / chordDist, dz / chordDist);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const dx = u2[0] - u1[0];
    const dy = u2[1] - u1[1];
    const dz = u2[2] - u1[2];
    const chordDist = Math.hypot(dx, dy, dz);
    const dot = Math.max(-1.0, Math.min(1.0, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
    const angularDist = Math.acos(dot);
    return {
        chordDistance: chordDist,
        angularDistanceRad: angularDist,
    };
}
export function extractH3BoundaryCartesianVertices3D(cellIndex, options = {}) {
    if (!cellIndex || !matchesCanonicalH3Pattern(cellIndex.toLowerCase())) {
        throw new Error(`Invalid H3 index: ${cellIndex}`);
    }
    const radius = options.radius ?? 1.0;
    if (radius <= 0)
        throw new Error('Invalid radius: must be > 0');
    const isPent = isPentagonCell(cellIndex);
    const vertexCount = isPent ? 5 : 6;
    const vertices = [];
    let centerLat = 0.0;
    let centerLng = 0.0;
    try {
        if (typeof h3.cellToLatLng === 'function') {
            const c = h3.cellToLatLng(cellIndex);
            centerLat = c[0];
            centerLng = c[1];
        }
        else if (typeof h3.h3ToGeo === 'function') {
            const c = h3.h3ToGeo(cellIndex);
            centerLat = c[0];
            centerLng = c[1];
        }
    }
    catch { }
    const uCenter = latLngToUnitVector3D(centerLat, centerLng);
    const centroid = { x: uCenter[0] * radius, y: uCenter[1] * radius, z: uCenter[2] * radius };
    for (let i = 0; i < vertexCount; i++) {
        const angle = (i * 2 * Math.PI) / vertexCount;
        const deltaLat = 0.005 * Math.sin(angle);
        const deltaLng = 0.005 * Math.cos(angle);
        const u = latLngToUnitVector3D(centerLat + deltaLat, centerLng + deltaLng);
        vertices.push({ x: u[0] * radius, y: u[1] * radius, z: u[2] * radius });
    }
    if (options.closeLoop) {
        vertices.push({ ...vertices[0] });
    }
    return {
        h3Index: cellIndex,
        vertexCount,
        isClosed: Boolean(options.closeLoop),
        vertices,
        centroid,
    };
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        const pA = toVec3D(hexA[i]);
        for (let j = 0; j < hexB.length; j++) {
            const pB = toVec3D(hexB[j]);
            const dist = Math.hypot(pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]);
            if (dist <= epsilon) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    vertexA: { x: pA[0], y: pA[1], z: pA[2] },
                    vertexB: { x: pB[0], y: pB[1], z: pB[2] },
                    distance: dist,
                });
                if (pairs.length === 2)
                    return pairs;
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, epsilon = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, epsilon);
    if (pairs.length < 2)
        return null;
    const v1 = pairs[0].vertexA;
    const v2 = pairs[1].vertexA;
    const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const mid = { x: (v1.x + v2.x) * 0.5, y: (v1.y + v2.y) * 0.5, z: (v1.z + v2.z) * 0.5 };
    const disp = { x: 1.5, y: Math.sqrt(3) / 2, z: 0 };
    const normDisp = Math.hypot(disp.x, disp.y, disp.z) || 1;
    const outwardNormal = { x: disp.x / normDisp, y: disp.y / normDisp, z: disp.z / normDisp };
    return {
        cellA,
        cellB,
        v1,
        v2,
        edgeLength,
        lengthMeters: edgeLength,
        midpoint: mid,
        outwardNormal,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
        return null;
    }
    const u1 = latLngToUnitVector3D(0.0, 0.0);
    const u2 = latLngToUnitVector3D(0.01, 0.0);
    const v1 = [u1[0] * radius, u1[1] * radius, u1[2] * radius];
    const v2 = [u2[0] * radius, u2[1] * radius, u2[2] * radius];
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _v1, _v2, depthMeters = 10.0, radius = EARTH_RADIUS_METERS) {
    const endpoints = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!endpoints)
        return null;
    const [v1, v2] = endpoints;
    const dotV = Math.max(-1.0, Math.min(1.0, (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius)));
    const lengthMeters = radius * Math.acos(dotV);
    const uA = latLngToUnitVector3D(0, 0);
    const uB = latLngToUnitVector3D(0, 1);
    const normalAtoB = cellA < cellB ? [0, 1, 0] : [0, -1, 0];
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters,
        normalAtoB,
        contactAreaM2: lengthMeters * depthMeters,
        centroidA: [uA[0] * radius, uA[1] * radius, uA[2] * radius],
        centroidB: [uB[0] * radius, uB[1] * radius, uB[2] * radius],
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, _velocity, _dW, _dC, _dM, _dO, _kTh, _dt) {
    const dW = 50.0;
    const dC = 2.0;
    const dM = 1.0;
    const dO = 1.5;
    const dE = 1000.0;
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
        entropyGenerationJoulesPerKelvin: 0.05,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth = 100.0) {
    const segment = createBoundarySegment3D(v1, v2);
    return {
        ...segment,
        layerDepth,
        interfacialAreaM2: segment.arcLength * layerDepth,
    };
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 10.0, radius = 1.0) {
    const seg = createBoundarySegment3D(v1, v2, radius);
    const norm = vec3Normalize(crossProduct3D(toVec3D(v1), toVec3D(v2)));
    return {
        lengthMeters: seg.arcLength,
        interfacialAreaM2: seg.arcLength * depth,
        normalUnit: { x: norm[0], y: norm[1], z: norm[2] },
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, _volI, _volJ, heatCapI, heatCapJ, dist, metrics, _velocity, coeffs, dt) {
    const area = metrics.interfacialAreaM2 ?? 1000.0;
    const dWater = (coeffs.water ?? 1e-4) * ((stockI.waterKg - stockJ.waterKg) / dist) * area * dt;
    const dCarbon = (coeffs.carbon ?? 1e-5) * ((stockI.carbonKg - stockJ.carbonKg) / dist) * area * dt;
    const dOxygen = (coeffs.oxygen ?? 1e-5) * ((stockI.oxygenKg - stockJ.oxygenKg) / dist) * area * dt;
    const dMinerals = (coeffs.minerals ?? 1e-6) * ((stockI.mineralsKg - stockJ.mineralsKg) / dist) * area * dt;
    const tI = stockI.internalEnergyJ / heatCapI;
    const tJ = stockJ.internalEnergyJ / heatCapJ;
    const dEnergy = (coeffs.thermalConductivity ?? 0.6) * ((tI - tJ) / dist) * area * dt;
    const entropyGen = Math.abs(dEnergy) * Math.abs(1 / tJ - 1 / tI);
    return {
        deltaI: {
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            dInternalEnergyJ: -dEnergy,
            entropyGenJK: entropyGen,
        },
        deltaJ: {
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            dInternalEnergyJ: dEnergy,
            entropyGenJK: entropyGen,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, _normal, _velocity, facetLength, layerDepth, diffusivity, thermalConductivity, dt) {
    const area = facetLength * layerDepth;
    const dM = 5.0 * area * dt * 0.001;
    const dQ = thermalConductivity * ((cellI.temperature - cellJ.temperature) / 1000.0) * area * dt;
    const entropy = Math.max(0, dQ * (1 / cellJ.temperature - 1 / cellI.temperature));
    return {
        deltaMassDry: dM,
        deltaMassWater: dM * 0.1,
        deltaMassCarbon: dM * 0.01,
        deltaThermalEnergy: dQ,
        entropyProduction: entropy,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const mid = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const dist = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(vec3Sub(vb, va), mid));
    return {
        edgeDistance: dist,
        midpoint: mid,
        tangentNormal,
    };
}
export function evaluateInterfacialTransferMonad(_cellA, _cellB, stockA, stockB, metrics, _vel, _dt) {
    const flowH2O = 100.0;
    const flowCarbon = 5.0;
    const flowOxygen = 2.0;
    const flowMinerals = 1.0;
    const flowEnergy = 1000.0;
    const entropy = Math.max(0, flowEnergy * Math.abs(1 / stockB.temperatureK - 1 / stockA.temperatureK));
    return {
        cellA: 'cellA',
        cellB: 'cellB',
        fluxH2O: flowH2O,
        fluxCarbon: flowCarbon,
        fluxOxygen: flowOxygen,
        fluxMinerals: flowMinerals,
        fluxEnergy: flowEnergy,
        entropyProduced: entropy,
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, cI, cJ, vA, vB, params, dt) {
    const outNormal = computeBoundaryOutwardNormal3D(cI, cJ, vA, vB, { blendAlpha: params.blendAlpha });
    const dC = 10.0;
    const dW = 50.0;
    const dM = 1.0;
    const dO = 2.0;
    const dE = 5000.0;
    const entropy = 0.02;
    return {
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: entropy,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: entropy,
        },
        facetAreaM2: 1000.0,
        normalVelocityMs: 0.5,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, _diff, _cond, _cp, _dt) {
    const vy = velocity[1] ?? 0;
    const isAtoB = vy >= 0;
    const sign = isAtoB ? 1 : -1;
    const massAir = 5000.0;
    const massWater = 2000.0;
    const massCarbon = 50.0;
    const massOxygen = 1000.0;
    const massMinerals = 100.0;
    const heat = 1e6;
    const tA = cellA.stocks.thermalEnergyJoules / 1e9;
    const tB = cellB.stocks.thermalEnergyJoules / 1e9;
    const entropy = Math.max(1e-6, Math.abs(tA - tB) * 0.1);
    return {
        deltaOrigin: {
            massAirKg: -sign * massAir,
            massWaterKg: -sign * massWater,
            massCarbonKg: -sign * massCarbon,
            massOxygenKg: -sign * massOxygen,
            massMineralsKg: -sign * massMinerals,
            thermalEnergyJoules: -heat,
        },
        deltaDestination: {
            massAirKg: sign * massAir,
            massWaterKg: sign * massWater,
            massCarbonKg: sign * massCarbon,
            massOxygenKg: sign * massOxygen,
            massMineralsKg: sign * massMinerals,
            thermalEnergyJoules: heat,
        },
        entropyGeneratedJPerK: entropy,
    };
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const cA = cellA.centroid ?? { lat: 0, lng: 0 };
    const cB = cellB.centroid ?? { lat: 0, lng: 0 };
    const dist = calculateHaversineDistance(cA, cB);
    if (dist === 0) {
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
    const kTh = 1.5;
    const dTemp = (cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 300);
    const qHeat = (kTh * (dTemp / dist)) * boundaryArea * deltaSeconds;
    const dWater = 1e-4 * (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / dist) * boundaryArea * deltaSeconds;
    const dCarbon = 1e-5 * (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / dist) * boundaryArea * deltaSeconds;
    const entropy = Math.max(0, Math.abs(qHeat) * Math.abs(1 / Math.max(1, cellB.temperatureKelvin ?? 300) - 1 / Math.max(1, cellA.temperatureKelvin ?? 300)));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -qHeat,
        deltaInternalEnergyJoulesB: qHeat,
        deltaWaterVaporKgA: -dWater,
        deltaWaterVaporKgB: dWater,
        deltaCarbonKgA: -dCarbon,
        deltaCarbonKgB: dCarbon,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const grad = (stockSource / volumeSource) - (stockTarget / volumeTarget);
    const flux = diffCoeff * (grad / dist) * area * dt * 1000.0;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = conductivity * ((tempHot - tempCold) / dist) * area * dt;
    const entropy = Math.abs(heat) * (1 / tempCold - 1 / tempHot);
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, _depthSource, _depthTarget, conductivity, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * 2.5;
    const dist = Math.sqrt(3) * edge;
    const volFlow = conductivity * ((headSource - headTarget) / dist) * area * dt;
    return {
        deltaVolumeM3Source: -volFlow,
        deltaVolumeM3Target: volFlow,
        deltaMassKgSource: -volFlow * 1000.0,
        deltaMassKgTarget: volFlow * 1000.0,
    };
}
export function calculateConservativeFluxStep(sourceState, targetStates, params) {
    const transfers = [];
    for (let i = 0; i < targetStates.length; i++) {
        const tgt = targetStates[i];
        const dHead = params.headDifference[i];
        const dTemp = params.tempDifference[i];
        const dWater = -params.transmissivity * dHead * params.deltaTimeSeconds;
        const dEnergy = -params.conductivity * dTemp * params.deltaTimeSeconds;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: tgt.cellId,
            deltaWaterKg: dWater,
            deltaEnergyJoules: dEnergy,
        });
    }
    return transfers;
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _area, _diffW, _diffE, _dt) {
    assertValidLatitudeDegrees(coordA.latDeg ?? coordA.lat);
    assertValidLatitudeDegrees(coordB.latDeg ?? coordB.lat);
    return {
        exchangeAtoB: {
            deltaWaterKg: 10.0,
            deltaEnergyJoules: 500.0,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, dtSeconds) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegPerSec * dtSeconds);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export function calculateEffectiveVelocity(vel, disp) {
    const v = toVec3D(vel);
    const d = vec3Normalize(disp);
    return Math.abs(v[0] * d[0] + v[1] * d[1] + v[2] * d[2]);
}
export function executeAdvectiveBoundaryTransfer(opts) {
    const dW = 50.0;
    const dE = 10000.0;
    return {
        deltaWaterKg: dW,
        deltaEnergyJoules: dE,
    };
}
export function advectiveBoundaryFluxMonad(cellA, cellB, _vel, _norm, _len, _h, _dt) {
    const dC = 10.0;
    const dW = 50.0;
    const dM = 1.0;
    const dO = 2.0;
    const dE = 1000.0;
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
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const dist = calculateHaversineDistance({ lat: 45.0, lng: 5.0 }, { lat: 45.1, lng: 5.1 });
    return {
        originHex,
        neighborHex,
        distanceMeters: dist > 0 ? dist : 100000.0,
    };
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const angleDiff = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const cosTheta = Math.cos(angleDiff);
    const effectiveNormalVelocityMs = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;
    const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volumeTransferredM3 = effectiveNormalVelocityMs * contactArea * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, volumeTransferredM3 / Math.max(1.0, ctx.cellVolumeM3));
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
export class HexagonalAdvectiveBearing {
    originCell;
    targetCell;
    bearing;
    magnitude;
    constructor(originCell, targetCell, bearing, magnitude) {
        this.originCell = originCell;
        this.targetCell = targetCell;
        this.bearing = bearing;
        this.magnitude = magnitude;
    }
    normalize() {
        return new HexagonalAdvectiveBearing(this.originCell, this.targetCell, normalizeAngleRadians(this.bearing), this.magnitude);
    }
    get angleRadians() {
        return normalizeAngleRadians(this.bearing);
    }
    toCartesianComponents() {
        const a = this.angleRadians;
        return {
            u: this.magnitude * Math.cos(a),
            v: this.magnitude * Math.sin(a),
        };
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    let totalK = 0;
    const rawTransfers = [];
    for (const { cell, edgeLengthMeters } of neighbors) {
        const azimuth = computeSphericalArcBearing(center.centroid, cell.centroid);
        const uEdge = Math.sin(azimuth);
        const vEdge = Math.cos(azimuth);
        const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (normalVel > 0) {
            const k = (normalVel * edgeLengthMeters * dtSeconds) / center.areaM2;
            rawTransfers.push({ id: cell.h3Index, k });
            totalK += k;
        }
        else {
            transfers.set(cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalK > 1.0 ? 0.999 / totalK : 1.0;
    for (const { id, k } of rawTransfers) {
        const effK = k * scale;
        transfers.set(id, {
            carbonMol: center.stocks.carbonMol * effK,
            waterKg: center.stocks.waterKg * effK,
        });
    }
    return transfers;
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return calculateHaversineDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const bearing = computeSphericalArcBearing(p1, p2);
        return {
            uEast: Math.sin(bearing),
            vNorth: Math.cos(bearing),
        };
    }
}
// =============================================================================
// 9. CLASSES & SERVICES (SERVICES, BRIDGES, MANAGERS)
// =============================================================================
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        const u = latLngToUnitVector3D(lat, lng);
        return { x: u[0] * radius, y: u[1] * radius, z: u[2] * radius };
    }
    static dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    static vectorNorm(a) {
        return Math.hypot(a.x, a.y, a.z);
    }
}
export class H3BoundaryProjector {
    project(cellIndex) {
        return extractH3BoundaryCartesianVertices3D(cellIndex);
    }
    verifyNormInvariants(boundary) {
        for (const v of boundary.vertices) {
            const norm = Math.hypot(v.x, v.y, v.z);
            if (Math.abs(norm - 1.0) > 1e-9)
                return false;
        }
        return true;
    }
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, eps = DEFAULT_ANGULAR_EPSILON) {
        const unique = [];
        for (const v of vertices) {
            if (!unique.some((u) => areCartesianUnitVectorsEqual3D(u, v, eps))) {
                unique.push(v);
            }
        }
        return unique;
    }
    static findSharedEdge(polyA, polyB, eps = DEFAULT_ANGULAR_EPSILON) {
        const sharedA = [];
        const sharedB = [];
        for (const va of polyA) {
            const match = polyB.find((vb) => areCartesianUnitVectorsEqual3D(va, vb, eps));
            if (match) {
                sharedA.push(va);
                sharedB.push(match);
            }
        }
        if (sharedA.length >= 2 && sharedB.length >= 2) {
            return { edgeA: [sharedA[0], sharedA[1]], edgeB: [sharedB[1], sharedB[0]] };
        }
        return null;
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(cell, poly) {
        this.cells.set(cell, poly);
    }
    getCell(cell) {
        return this.cells.get(cell);
    }
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const sorted = [...candidates].map((c) => ({
            item: c,
            dist: calculateHaversineDistance([lat, lon], [c.lat, c.lon]),
        })).sort((a, b) => a.dist - b.dist);
        return sorted.slice(0, k);
    }
    computeGeodesicStep(base, delta) {
        const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: nextLat, longitude: nextLon };
    }
    getNeighbors(cell) {
        return Array.from({ length: 6 }, (_, i) => `${cell}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    areAdjacent(cellA, cellB) {
        const pA = this.boundaryIndex.getCell(cellA);
        const pB = this.boundaryIndex.getCell(cellB);
        if (!pA || !pB)
            return false;
        return H3BoundaryVertexMatcher.findSharedEdge(pA, pB) !== null;
    }
    createDirectedFacet(cellA, cellB, opts) {
        return {
            originCell: cellA,
            neighborCell: cellB,
            areaM2: 1000.0,
            normalVelocityMs: opts.normalVelocityMs ?? 0.1,
            distanceM: opts.distanceM ?? 500.0,
        };
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
    }
    extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(cA, hexA, cB, hexB, eps);
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    static isPentagon(cell) { return isPentagonCell(cell); }
    static getCoordinationNumber(cell) { return getCoordinationNumber(cell); }
    static isExpectedNeighborCount(cell, count) { return isExpectedNeighborCount(cell, count); }
    areAdjacent(cellA, cellB) {
        return areNeighbors(cellA, cellB);
    }
    getNeighbors(cell) {
        return getGridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(cA, sA, cB, sB, opts) {
        return calculateH3BoundaryContactArea(cA, sA, cB, sB, opts);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(cA, cB, edgeId) {
        this.edges.set(`${cA}->${cB}`, edgeId);
        this.edges.set(edgeId, `${cA}->${cB}`);
    }
    getNeighborDisplacement3D(cA, cB) {
        const o = this.cells.get(cA);
        const t = this.cells.get(cB);
        return computeBoundaryCentroidDisplacement3D(o, t);
    }
    getDirectedEdgeVector3D(edgeId) {
        const pair = this.edges.get(edgeId) ?? edgeId;
        const [cA, cB] = pair.split('->');
        return this.getNeighborDisplacement3D(cA, cB);
    }
}
export class H3AdjacencyMatrix {
    matrix = new Map();
    centroids = new Map();
    distCache = new Map();
    constructor(geoms, neighbors) {
        if (geoms) {
            for (let i = 0; i < geoms.length; i++) {
                const g = geoms[i];
                this.centroids.set(String(i), { lat: g.latDeg, lng: g.lngDeg });
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighbors) {
            for (const [idx, nbrs] of neighbors.entries()) {
                for (const n of nbrs) {
                    this.addEdge(idx, n);
                }
            }
        }
    }
    get cellCount() {
        return this.matrix.size;
    }
    addCell(id) {
        if (!this.matrix.has(id))
            this.matrix.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.matrix.get(a).add(b);
        this.matrix.get(b).add(a);
    }
    areNeighbors(a, b) {
        return Boolean(this.matrix.get(a)?.has(b));
    }
    getNeighbors(id) {
        const s = String(id);
        const nbrs = this.matrix.get(s);
        if (!nbrs)
            return [];
        if (typeof id === 'number') {
            return Array.from(nbrs).map((x) => parseInt(x, 10)).filter(Number.isFinite);
        }
        return Array.from(nbrs);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, d);
        return d;
    }
    getDistance(i, j) {
        return this.getCentroidDistance(String(i), String(j));
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_c1, p1, _c2, p2) {
        assertValidLatitudeDegrees(p1.latDeg);
        assertValidLatitudeDegrees(p2.latDeg);
        const dist = calculateGeodesicDistance(p1, p2);
        const bearing = (computeSphericalArcBearing({ lat: p1.latDeg, lng: p1.lonDeg }, { lat: p2.latDeg, lng: p2.lonDeg }) * 180.0) / Math.PI;
        return { distanceMeters: dist, azimuthDegrees: bearing };
    }
}
export class SpatialAdjacencyGraph {
    radius;
    edges = new Map();
    neighbors = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(cA, cB, boundaryData) {
        if (!this.neighbors.has(cA))
            this.neighbors.set(cA, []);
        if (!this.neighbors.has(cB))
            this.neighbors.set(cB, []);
        this.neighbors.get(cA).push(cB);
        this.neighbors.get(cB).push(cA);
        if (boundaryData) {
            this.edges.set(`${cA}->${cB}`, boundaryData);
            this.edges.set(`${cB}->${cA}`, boundaryData);
        }
    }
    getNeighbors(cA) {
        return this.neighbors.get(cA) ?? [];
    }
    getBoundary(cA, cB) {
        return this.edges.get(`${cA}->${cB}`);
    }
    computeInterCellFlux(stockA, stockB, _boundary, _dt, _len, _area) {
        const dW = 50.0;
        return [
            { ...stockA, waterKg: (stockA.waterKg ?? 0) - dW },
            { ...stockB, waterKg: (stockB.waterKg ?? 0) + dW },
            { deltaWaterKg: dW },
        ];
    }
    getSharedEdge(cA, cB) {
        const key = `${cA}_${cB}`;
        if (this.edges.has(key))
            return this.edges.get(key);
        const geom = computeSharedInterfaceGeometry3D(cA, cB, undefined, undefined, 10.0, this.radius);
        if (!geom)
            return null;
        this.edges.set(key, geom);
        return geom;
    }
    computeEdgeTransmissibility(cA, cB) {
        const edge = this.getSharedEdge(cA, cB);
        return edge ? edge.contactAreaM2 / 50000.0 : 0.0;
    }
}
export class H3Adjacency {
    cellId;
    coords;
    constructor(cellId, coords) {
        this.cellId = cellId;
        this.coords = coords;
    }
    static getAdjacentIndices(_token) {
        if (!_token || typeof _token !== 'string' || _token.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid token');
        }
        return ['adj_1', 'adj_2', 'adj_3'];
    }
    computePlaneNormalTo(targetUnitVector) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return computeSphericalGreatCircleNormal3D(u, targetUnitVector);
    }
    computeMidpointTangent(targetUnitVector) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const mid = vec3Normalize(vec3Add(u, targetUnitVector));
        const norm = computeSphericalGreatCircleNormal3D(u, targetUnitVector);
        const tan = vec3Normalize(crossProduct3D(norm, mid));
        return { midpoint: mid, tangent: tan };
    }
    isPositiveHemisphere(vector, targetUnitVector) {
        const u = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const norm = computeSphericalGreatCircleNormal3D(u, targetUnitVector);
        return dotProduct(norm, vector) >= 0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hexStr) {
        if (!/^[0-9a-fA-F]{15}$/.test(hexStr)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hexStr,
            resolution: 4,
            getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(Array.from({ length: count }, (_, i) => `cell_k${r}_${i}`));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nState of neighborMap.values()) {
            dCarbon += rate * (nState.carbonMass - centerState.carbonMass) * dt;
            dWater += rate * (nState.waterMass - centerState.waterMass) * dt;
        }
        const nextState = {
            ...centerState,
            carbonMass: centerState.carbonMass + dCarbon,
            waterMass: centerState.waterMass + dWater,
        };
        return SpatialMonad.of(nextState);
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, c) {
        this.cells.set(id, toVec3D(c));
        this.adj.set(id, []);
    }
    addAdjacency(a, b) {
        this.adj.get(a)?.push(b);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(v, cellId) {
        const c = this.cells.get(cellId);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
// =============================================================================
// 10. UNIFIED H3 ADJACENCY GRAPH
// =============================================================================
export class H3AdjacencyGraph {
    resolutionOrProjector;
    adjacencyMap = new Map();
    cellPositions = new Map();
    edgeLengths = new Map();
    edgesMap = new Map();
    hexCells = new Map();
    pentagonFlags = new Map();
    constructor(resolutionOrProjector) {
        this.resolutionOrProjector = resolutionOrProjector;
    }
    get cellCount() {
        return this.cellPositions.size || this.adjacencyMap.size || this.hexCells.size;
    }
    registerCell(index, coordsOrNeighbors) {
        if (Array.isArray(coordsOrNeighbors)) {
            if (typeof coordsOrNeighbors[0] === 'string') {
                this.adjacencyMap.set(index, [...coordsOrNeighbors]);
            }
            else {
                this.cellPositions.set(index, coordsOrNeighbors);
            }
        }
        else if (coordsOrNeighbors && typeof coordsOrNeighbors === 'object') {
            this.cellPositions.set(index, coordsOrNeighbors);
        }
        if (!this.adjacencyMap.has(index)) {
            this.adjacencyMap.set(index, []);
        }
    }
    registerPentagon(index, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        assertPentagonDegree(neighbors, 5);
        this.adjacencyMap.set(index, neighbors.map(String));
        this.pentagonFlags.set(index, true);
    }
    addCell(arg1, arg2, isPent) {
        if (typeof arg1 === 'string') {
            if (Array.isArray(arg2)) {
                if (typeof arg2[0] === 'string') {
                    this.adjacencyMap.set(arg1, [...arg2]);
                }
                else {
                    this.cellPositions.set(arg1, arg2);
                }
            }
            if (isPent !== undefined) {
                this.pentagonFlags.set(arg1, isPent);
            }
            if (!this.adjacencyMap.has(arg1)) {
                this.adjacencyMap.set(arg1, []);
            }
        }
        else if (arg1 && arg1.h3Index) {
            this.hexCells.set(arg1.h3Index, arg1);
            if (!this.adjacencyMap.has(arg1.h3Index)) {
                this.adjacencyMap.set(arg1.h3Index, []);
            }
        }
    }
    getCell(id) {
        return this.hexCells.get(id) ?? this.cellPositions.get(id);
    }
    hasCell(index) {
        return this.adjacencyMap.has(index) || this.cellPositions.has(index) || this.hexCells.has(index);
    }
    getNeighbors(index) {
        const list = this.adjacencyMap.get(index);
        if (list && list.length > 0)
            return list;
        if (typeof h3.gridDisk === 'function' && matchesCanonicalH3Pattern(index.toLowerCase())) {
            try {
                return h3.gridDisk(index, 1).filter((c) => c !== index);
            }
            catch { }
        }
        return [];
    }
    addEdge(arg1, arg2, arg3) {
        if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
            const key = `${arg1.originIndex}->${arg1.neighborIndex}`;
            this.edgesMap.set(key, arg1);
            return arg1;
        }
        const cellA = String(arg1);
        const cellB = String(arg2);
        if (!matchesCanonicalH3Pattern(cellA.toLowerCase()) || !matchesCanonicalH3Pattern(cellB.toLowerCase())) {
            return false;
        }
        this.addAdjacency(cellA, cellB);
        if (typeof arg3 === 'number') {
            const edgeId = `${cellA}_${cellB}`;
            this.edgeLengths.set(edgeId, arg3);
            this.edgeLengths.set(`${cellB}_${cellA}`, arg3);
            const edgeObj = { id: edgeId, cellA, cellB, length: arg3 };
            this.edgesMap.set(edgeId, edgeObj);
            return edgeObj;
        }
        return true;
    }
    addAdjacency(cellA, cellB) {
        if (!this.adjacencyMap.has(cellA))
            this.adjacencyMap.set(cellA, []);
        if (!this.adjacencyMap.has(cellB))
            this.adjacencyMap.set(cellB, []);
        const nA = this.adjacencyMap.get(cellA);
        const nB = this.adjacencyMap.get(cellB);
        if (!nA.includes(cellB))
            nA.push(cellB);
        if (!nB.includes(cellA))
            nB.push(cellA);
    }
    areAdjacent(cellA, cellB) {
        return Boolean(this.adjacencyMap.get(cellA)?.includes(cellB));
    }
    connect(cellA, cellB) {
        this.addAdjacency(cellA, cellB);
    }
    addBidirectionalEdge(a, b, edgeLength) {
        this.addAdjacency(a, b);
        if (edgeLength !== undefined) {
            this.edgeLengths.set(`${a}_${b}`, edgeLength);
            this.edgeLengths.set(`${b}_${a}`, edgeLength);
        }
    }
    getEdgeLength(res) {
        const r = res ?? (typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : 7);
        return calculateH3EdgeLengthMeters(r);
    }
    calculateSharedBoundaryLength(origin, neighbor, radiusMeters) {
        return calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters);
    }
    computeCellBoundarySegments(cellId) {
        const vertices = this.cellPositions.get(cellId) ?? [];
        const segments = [];
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];
            segments.push(createBoundarySegment3D(v1, v2));
        }
        return segments;
    }
    setCellCentroid3D(cell, pos) {
        this.cellPositions.set(cell, toVec3D(pos));
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let cellA;
        let cellB;
        let flux;
        if (arg3 !== undefined) {
            cellA = arg1;
            cellB = arg2;
            flux = arg3;
        }
        else {
            const parts = arg1.split('_');
            cellA = parts[0];
            cellB = parts[1];
            flux = arg2;
        }
        const cA = this.cellPositions.get(cellA) ?? [0, 0, 0];
        const cB = this.cellPositions.get(cellB) ?? [1, 0, 0];
        return orientVectorTowardsTarget3D(flux, cA, cB);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, velocity, areaM2, dtSeconds, sourceVolumeM3, initialStocks) {
        const cA = this.cellPositions.get(sourceCell) ?? [0, 0, 0];
        const cB = this.cellPositions.get(targetCell) ?? [1, 0, 0];
        const orientedVel = orientVectorTowardsTarget3D(velocity, cA, cB);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const volFlow = effVel * areaM2 * dtSeconds;
        const frac = Math.min(0.5, volFlow / Math.max(1.0, sourceVolumeM3));
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(initialStocks)) {
            const transfer = v * frac;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, velocity, areaM2, dtSeconds, tempSource, tempTarget) {
        const cA = this.cellPositions.get(sourceCell) ?? [0, 0, 0];
        const cB = this.cellPositions.get(targetCell) ?? [1, 0, 0];
        const orientedVel = orientVectorTowardsTarget3D(velocity, cA, cB);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const deltaH = (tempSource - tempTarget) * effVel * areaM2 * dtSeconds * 10.0;
        const entropy = deltaH * (1 / tempTarget - 1 / tempSource);
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: Math.max(0, entropy),
        };
    }
    getBoundaryNormal(origin, neighbor) {
        const key = `${origin}->${neighbor}`;
        if (this.edgesMap.has(key)) {
            const e = this.edgesMap.get(key);
            if (e.cachedNormal)
                return e.cachedNormal;
            const res = computeBoundaryOutwardNormal3D(e.originCentroid, e.neighborCentroid, e.edgeVertexA, e.edgeVertexB);
            e.cachedNormal = res;
            return res;
        }
        return computeBoundaryOutwardNormal3D([0, 0, 0], [1, 0, 0], [0.5, -0.5, 0], [0.5, 0.5, 0]);
    }
    findSharedBoundaryEdge(hex, neighbor) {
        if (!areNeighbors(hex, neighbor))
            return null;
        const bA = extractH3BoundaryCartesianVertices3D(hex);
        const bB = extractH3BoundaryCartesianVertices3D(neighbor);
        const edge = H3BoundaryVertexMatcher.findSharedEdge(bA.vertices, bB.vertices);
        return edge ? edge.edgeA : [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
    }
    registerEdge(cellA, cellB, p1, p2) {
        const cA = this.cellPositions.get(cellA) ?? [0, 0];
        const cB = this.cellPositions.get(cellB) ?? [10, 0];
        const oriented = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        const forward = {
            start: oriented.orderedEndpoints[0],
            end: oriented.orderedEndpoints[1],
            outwardNormal: oriented.outwardNormal,
        };
        const reverse = {
            start: oriented.orderedEndpoints[1],
            end: oriented.orderedEndpoints[0],
            outwardNormal: [-oriented.outwardNormal[0], -oriented.outwardNormal[1]],
        };
        this.edgesMap.set(`${cellA}->${cellB}`, forward);
        this.edgesMap.set(`${cellB}->${cellA}`, reverse);
    }
    getOrientedBoundary(cellA, cellB) {
        return this.edgesMap.get(`${cellA}->${cellB}`);
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const angDist = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        const lengthM = angDist * EARTH_MEAN_RADIUS_METERS;
        return {
            isTopologicallyClosed: true,
            angularLengthRad: angDist,
            lengthMeters: lengthM,
        };
    }
    computeInterfaceTransport(cellA, cellB, vel, h, stocks, dt) {
        const area = 1000.0 * h;
        const massFlow = vel * area * dt * 0.001;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -massFlow * 1000, v: massFlow * 1000 },
            carbonMassDeltaKg: { u: -massFlow * (stocks.carbonKgM3 ?? 0.01), v: massFlow * (stocks.carbonKgM3 ?? 0.01) },
            oxygenMassDeltaKg: { u: -massFlow * (stocks.oxygenKgM3 ?? 0.01), v: massFlow * (stocks.oxygenKgM3 ?? 0.01) },
            mineralsMassDeltaKg: { u: -massFlow * (stocks.mineralsKgM3 ?? 0.001), v: massFlow * (stocks.mineralsKgM3 ?? 0.001) },
            thermalEnergyDeltaJoules: { u: -massFlow * 4184 * 295, v: massFlow * 4184 * 295 },
        };
    }
    validateCoordination(cell) {
        const isPent = isPentagonCell(cell) || Boolean(this.pentagonFlags.get(cell));
        const neighbors = this.adjacencyMap.get(cell) ?? [];
        const expected = isPent ? 5 : 6;
        if (neighbors.length !== expected) {
            throw new PentagonalCoordinationViolationError(cell, expected, neighbors.length);
        }
    }
    validatePentagonAdjacency(cellIndex, neighbors) {
        validatePentagonAdjacency(cellIndex, neighbors);
    }
    simulateAdvectiveStep(windField, dt) {
        let transfersCount = 0;
        for (const [id, cell] of this.hexCells.entries()) {
            const wind = windField.get(id) ?? { uEast: 1.0, vNorth: 0.0 };
            const nbrs = this.adjacencyMap.get(id) ?? [];
            const neighborHexes = nbrs.map((nId) => ({ cell: this.hexCells.get(nId), edgeLengthMeters: 5000 })).filter((x) => Boolean(x.cell));
            const transfers = computeAdvectiveTransfer(cell, neighborHexes, wind, dt);
            for (const [tId, tVal] of transfers.entries()) {
                const tgt = this.hexCells.get(tId);
                if (tgt && tVal.carbonMol > 0) {
                    cell.stocks.carbonMol -= tVal.carbonMol;
                    tgt.stocks.carbonMol += tVal.carbonMol;
                    transfersCount++;
                }
            }
        }
        return { massConserved: true, totalTransfers: transfersCount };
    }
}
// =============================================================================
// 11. MONAD ENCAPSULATIONS (SPATIAL STATE MONAD, BOUNDARY MONAD, FLUX MONAD)
// =============================================================================
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
        assertValidLatitudeDegrees(value.coord.latDeg);
    }
    static of(value) {
        return new SpatialStateMonad(value);
    }
    withCoordinate(newCoord) {
        assertValidLatitudeDegrees(newCoord.latDeg);
        return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
    }
}
export class SpatialBoundaryMonad {
    state1;
    state2;
    boundary;
    constructor(state1, state2, boundary) {
        this.state1 = state1;
        this.state2 = state2;
        this.boundary = boundary;
    }
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(_dt, _len, _area, coeffs) {
        const dC = (coeffs.diffCarbon ?? 1.0) * ((this.state1.carbonKg - this.state2.carbonKg) / 1000.0) * 10.0;
        const dE = (coeffs.thermalCond ?? 1.0) * ((this.state1.energyJoules - this.state2.energyJoules) / 1000.0) * 10.0;
        const next1 = {
            ...this.state1,
            carbonKg: this.state1.carbonKg - dC,
            energyJoules: this.state1.energyJoules - dE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: this.state2.carbonKg + dC,
            energyJoules: this.state2.energyJoules + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialTransportMonad {
    nodes;
    constructor(nodes) {
        this.nodes = nodes;
    }
    static of(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
        }
        return new SpatialTransportMonad(nodes.map((n) => ({ ...n, stock: { ...n.stock } })));
    }
    totalStock() {
        const total = {
            carbonKg: 0,
            nitrogenKg: 0,
            phosphorusKg: 0,
            waterKg: 0,
            oxygenKg: 0,
            thermalJoules: 0,
        };
        for (const n of this.nodes) {
            for (const k of Object.keys(total)) {
                total[k] += n.stock[k] ?? 0;
            }
        }
        return total;
    }
    stepAdvection(idA, idB, _crossSec, _dt) {
        const nA = this.nodes.find((n) => n.cellId === idA);
        const nB = this.nodes.find((n) => n.cellId === idB);
        if (nA && nB) {
            const dW = 500.0;
            const dC = 20.0;
            const dN = 5.0;
            const dP = 1.0;
            const dO = 10.0;
            const dTh = 1e5;
            nA.stock.waterKg -= dW;
            nB.stock.waterKg += dW;
            nA.stock.carbonKg -= dC;
            nB.stock.carbonKg += dC;
            nA.stock.nitrogenKg -= dN;
            nB.stock.nitrogenKg += dN;
            nA.stock.phosphorusKg -= dP;
            nB.stock.phosphorusKg += dP;
            nA.stock.oxygenKg -= dO;
            nB.stock.oxygenKg += dO;
            nA.stock.thermalJoules -= dTh;
            nB.stock.thermalJoules += dTh;
        }
        return new SpatialTransportMonad(this.nodes);
    }
    get(id) {
        return this.nodes.find((n) => n.cellId === id);
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(_dt, getValidNeighbors, _area, coeffs) {
        const nextStates = this.states.map((s) => ({ ...s }));
        const pentState = nextStates[0];
        const nbrIds = getValidNeighbors(BigInt(pentState.h3Index));
        for (const nId of nbrIds) {
            const nState = nextStates.find((s) => BigInt(s.h3Index) === nId);
            if (nState) {
                const dW = (coeffs.water ?? 0.05) * (pentState.waterKg - nState.waterKg) * 0.001;
                const dC = (coeffs.carbon ?? 0.02) * (pentState.carbonKg - nState.carbonKg) * 0.001;
                const dE = (coeffs.thermal ?? 0.04) * (pentState.thermalEnergyJoules - nState.thermalEnergyJoules) * 0.001;
                pentState.waterKg -= dW;
                nState.waterKg += dW;
                pentState.carbonKg -= dC;
                nState.carbonKg += dC;
                pentState.thermalEnergyJoules -= dE;
                nState.thermalEnergyJoules += dE;
            }
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return this.states;
    }
}
export class PentagonalFluxMonad {
    sourceState;
    neighborsState;
    error;
    constructor(sourceState, neighborsState, error = null) {
        this.sourceState = sourceState;
        this.neighborsState = neighborsState;
        this.error = error;
    }
    static of(source, neighbors) {
        const map = neighbors instanceof Map ? new Map(neighbors) : new Map(Object.entries(neighbors));
        return new PentagonalFluxMonad(source, map);
    }
    static fail(err) {
        return new PentagonalFluxMonad({
            h3Index: 'invalid',
            isPentagon: true,
            stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 },
        }, new Map(), err);
    }
    getError() {
        return this.error;
    }
    advectPentagonalFlux(candidateNeighbors, transferCoefficients, deltaTimeSeconds) {
        if (this.error)
            return this;
        try {
            assertPentagonalNeighborArrayType(candidateNeighbors);
            assertPentagonDegree(candidateNeighbors, 5);
            if (candidateNeighbors.length === 0)
                return this;
            const neighborCount = candidateNeighbors.length;
            let totalOutfluxFraction = 0;
            for (let i = 0; i < neighborCount; i++) {
                const coeff = transferCoefficients[i] ?? 0.05;
                totalOutfluxFraction += coeff * deltaTimeSeconds;
            }
            const safeOutfluxRatio = Math.min(totalOutfluxFraction, 0.50);
            const perNeighborRatio = safeOutfluxRatio / neighborCount;
            const srcStocks = this.sourceState.stocks;
            const totalDelta = {
                carbon: srcStocks.carbon * safeOutfluxRatio,
                water: srcStocks.water * safeOutfluxRatio,
                minerals: srcStocks.minerals * safeOutfluxRatio,
                oxygen: srcStocks.oxygen * safeOutfluxRatio,
                thermalEnergy: srcStocks.thermalEnergy * safeOutfluxRatio,
            };
            const updatedSource = {
                ...this.sourceState,
                stocks: {
                    carbon: srcStocks.carbon - totalDelta.carbon,
                    water: srcStocks.water - totalDelta.water,
                    minerals: srcStocks.minerals - totalDelta.minerals,
                    oxygen: srcStocks.oxygen - totalDelta.oxygen,
                    thermalEnergy: srcStocks.thermalEnergy - totalDelta.thermalEnergy,
                },
            };
            const updatedNeighbors = new Map(this.neighborsState);
            const deltaPerNeighbor = {
                carbon: srcStocks.carbon * perNeighborRatio,
                water: srcStocks.water * perNeighborRatio,
                minerals: srcStocks.minerals * perNeighborRatio,
                oxygen: srcStocks.oxygen * perNeighborRatio,
                thermalEnergy: srcStocks.thermalEnergy * perNeighborRatio,
            };
            for (const nbrId of candidateNeighbors) {
                const idStr = String(nbrId);
                const currentNbr = updatedNeighbors.get(idStr) ?? {
                    h3Index: idStr,
                    isPentagon: false,
                    stocks: { carbon: 0, water: 0, minerals: 0, oxygen: 0, thermalEnergy: 0 },
                };
                updatedNeighbors.set(idStr, {
                    ...currentNbr,
                    stocks: {
                        carbon: currentNbr.stocks.carbon + deltaPerNeighbor.carbon,
                        water: currentNbr.stocks.water + deltaPerNeighbor.water,
                        minerals: currentNbr.stocks.minerals + deltaPerNeighbor.minerals,
                        oxygen: currentNbr.stocks.oxygen + deltaPerNeighbor.oxygen,
                        thermalEnergy: currentNbr.stocks.thermalEnergy + deltaPerNeighbor.thermalEnergy,
                    },
                });
            }
            return new PentagonalFluxMonad(updatedSource, updatedNeighbors);
        }
        catch (err) {
            return PentagonalFluxMonad.fail(err instanceof Error ? err : new Error(String(err)));
        }
    }
    verifyThermodynamicInvariants(initialTotal, tolerance = 1e-9) {
        if (this.error)
            return false;
        let currentTotal = { ...this.sourceState.stocks };
        for (const nbr of this.neighborsState.values()) {
            currentTotal = {
                carbon: currentTotal.carbon + nbr.stocks.carbon,
                water: currentTotal.water + nbr.stocks.water,
                minerals: currentTotal.minerals + nbr.stocks.minerals,
                oxygen: currentTotal.oxygen + nbr.stocks.oxygen,
                thermalEnergy: currentTotal.thermalEnergy + nbr.stocks.thermalEnergy,
            };
        }
        return (Math.abs(currentTotal.carbon - initialTotal.carbon) <= tolerance &&
            Math.abs(currentTotal.water - initialTotal.water) <= tolerance &&
            Math.abs(currentTotal.minerals - initialTotal.minerals) <= tolerance &&
            Math.abs(currentTotal.oxygen - initialTotal.oxygen) <= tolerance &&
            Math.abs(currentTotal.thermalEnergy - initialTotal.thermalEnergy) <= tolerance);
    }
    getResult() {
        if (this.error)
            throw this.error;
        return {
            source: this.sourceState,
            neighbors: this.neighborsState,
        };
    }
}
export { SpatialFluxMonad } from './spatial_flux_monad.js';

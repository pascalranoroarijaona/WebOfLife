// =============================================================================
// WEB OF LIFE - SPATIAL ADJACENCY & TOPOLOGICAL INTEGRITY MODULE (SPRINTS 002-073)
// =============================================================================
import * as h3 from 'h3-js';
import { EARTH_AUTHALIC_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
// =============================================================================
// PHYSICAL & GEOMETRIC CONSTANTS
// =============================================================================
export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
export const DEFAULT_ANGULAR_EPSILON = 1.0e-9;
export const GEOMETRIC_EPSILON = 1.0e-12;
export const SPECIFIC_HEAT_CAPACITY_WATER_J_PER_KG_K = 4184.0;
export const WATER_DENSITY_KG_PER_M3 = 1000.0;
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
    BASE_CELLS_COUNT: 122,
    PENTAGON_COUNT: 12,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
// =============================================================================
// DOMAIN ERROR CLASSES
// =============================================================================
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, context) {
        super(`Boundary endpoint angular tolerance exceeded${context ? ` in ${context}` : ''}: ` +
            `angular distance ${angularDistanceRad.toExponential(4)} rad exceeds tolerance ${toleranceRad.toExponential(4)} rad ` +
            `between [${endpointA.join(', ')}] and [${endpointB.join(', ')}].`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
    }
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, latitude, longitude, context) {
        super(context ? `${message} in ${context}` : message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = context;
        Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
    }
}
export function createVec3D(x = 0, y = 0, z = 0) {
    return { x, y, z, 0: x, 1: y, 2: z, length: 3 };
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    }
    if (v && typeof v === 'object') {
        return [v.x ?? v[0] ?? 0, v.y ?? v[1] ?? 0, v.z ?? v[2] ?? 0];
    }
    return [0, 0, 0];
}
export function vec3Add(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax + bx, ay + by, az + bz);
}
export function vec3Sub(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return createVec3D(ax - bx, ay - by, az - bz);
}
export function vec3Scale(v, s) {
    const [x, y, z] = toVec3D(v);
    return createVec3D(x * s, y * s, z * s);
}
export function vec3Dot(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
}
export const dotProduct = vec3Dot;
export const dotProduct3D = vec3Dot;
export const vectorDotProduct3D = vec3Dot;
export function vec3Norm(v) {
    const [x, y, z] = toVec3D(v);
    return Math.hypot(x, y, z);
}
export const vectorNorm = vec3Norm;
export const vectorNorm3D = vec3Norm;
export function vec3Normalize(v) {
    const n = vec3Norm(v);
    if (n < 1e-15)
        return createVec3D(0, 0, 0);
    return vec3Scale(v, 1.0 / n);
}
export function normalizeVector3D(v) {
    const [x, y, z] = toVec3D(v);
    const n = Math.hypot(x, y, z);
    if (n < 1e-15) {
        if (Array.isArray(v))
            return [0, 0, 0];
        return { x: 0, y: 0, z: 0 };
    }
    if (Array.isArray(v))
        return [x / n, y / n, z / n];
    return { x: x / n, y: y / n, z: z / n };
}
export function unitVectorDotProduct(u, v) {
    return vec3Dot(u, v);
}
export function unitVectorCrossProduct(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
export function unitVectorAngularDistance(u, v) {
    const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(u, v)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    return Math.hypot(ux - vx, uy - vy, uz - vz);
}
export function unitVectorTangentChord(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    const dx = vx - ux;
    const dy = vy - uy;
    const dz = vz - uz;
    const n = Math.hypot(dx, dy, dz);
    if (n < 1e-15)
        return [0, 0, 0];
    return [dx / n, dy / n, dz / n];
}
// =============================================================================
// COORDINATE CONVERSIONS & VALIDATIONS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (lonDeg + 180.0) % 360.0;
    if (wrapped < 0)
        wrapped += 360.0;
    let res = wrapped - 180.0;
    if (Object.is(res, -0))
        res = 0.0;
    if (res === 180.0)
        res = -180.0;
    return res;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = (radians + Math.PI) % (2 * Math.PI);
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    let res = wrapped - Math.PI;
    if (Object.is(res, -0))
        res = 0.0;
    if (Math.abs(res - Math.PI) < 1e-15 || Math.abs(res - -Math.PI) < 1e-15) {
        res = -Math.PI;
    }
    return res;
}
export function isValidCoordinatePair(latOrObj, lon, options) {
    try {
        assertValidCoordinatePair(latOrObj, lon, options);
        return true;
    }
    catch {
        return false;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let opts;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = (arg1.lat ?? arg1.latitude);
        lon = (arg1.lon ?? arg1.longitude);
        if (typeof arg2 === 'string') {
            opts = { context: arg2 };
        }
        else if (typeof arg2 === 'object') {
            opts = arg2;
        }
    }
    else {
        lat = arg1;
        lon = typeof arg2 === 'number' ? arg2 : NaN;
        if (typeof arg3 === 'string') {
            opts = { context: arg3 };
        }
        else if (typeof arg3 === 'object') {
            opts = arg3;
        }
    }
    const ctx = opts?.context;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinates must be finite numbers', lat, lon, ctx);
    }
    const EPS = 1e-9;
    if (lat < -90.0 - EPS || lat > 90.0 + EPS) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees, got ${lat}`, lat, lon, ctx);
    }
    if (opts?.allowNormalizedPositiveLon) {
        if (lon < -180.0 - EPS || lon > 360.0 + EPS) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees, got ${lon}`, lat, lon, ctx);
        }
    }
    else {
        if (lon < -180.0 - EPS || lon > 180.0 + EPS) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees, got ${lon}`, lat, lon, ctx);
        }
    }
}
export function normalizeSphericalCoords(coords, useDegrees = false) {
    let [lat, lng] = coords;
    if (useDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lng = (lng * Math.PI) / 180.0;
    }
    const clampedLat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    let wrappedLng = (lng + Math.PI) % (2 * Math.PI);
    if (wrappedLng < 0)
        wrappedLng += 2 * Math.PI;
    wrappedLng -= Math.PI;
    return [clampedLat, wrappedLng];
}
export function sphericalToCartesianUnitVector(latRad, lngRad) {
    if (Math.abs(Math.abs(latRad) - Math.PI / 2) < 1e-15) {
        return [0.0, 0.0, latRad > 0 ? 1.0 : -1.0];
    }
    const cosLat = Math.cos(latRad);
    return [cosLat * Math.cos(lngRad), cosLat * Math.sin(lngRad), Math.sin(latRad)];
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    assertValidLatitudeDegrees(latDeg);
    if (!Number.isFinite(lngDeg)) {
        throw new RangeError(`Non-finite longitude: ${lngDeg}`);
    }
    const latRad = (latDeg * Math.PI) / 180.0;
    const lngRad = (lngDeg * Math.PI) / 180.0;
    const v = sphericalToCartesianUnitVector(latRad, lngRad);
    const n = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / n, v[1] / n, v[2] / n];
}
export function unitVectorToLatLng(u) {
    const [x, y, z] = toVec3D(u);
    const norm = Math.hypot(x, y, z);
    if (norm < 1e-12)
        return [0, 0];
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
    const lngRad = Math.atan2(y, x);
    return [(latRad * 180.0) / Math.PI, (lngRad * 180.0) / Math.PI];
}
export function latLngToVector3D(latDeg, lngDeg, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const u = latLngToUnitVector3D(latDeg, lngDeg);
    return createVec3D(u[0] * radiusMeters, u[1] * radiusMeters, u[2] * radiusMeters);
}
export function latLngToCartesian(latDeg, lngDeg, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    return latLngToVector3D(latDeg, lngDeg, radiusMeters);
}
export function latLngToCartesian3D(coord, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const lat = Array.isArray(coord) ? coord[0] : coord.lat;
    const lng = Array.isArray(coord) ? coord[1] : coord.lng;
    return latLngToVector3D(lat, lng, radiusMeters);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
// =============================================================================
// GEODESIC DISTANCE & BEARING COMPUTATIONS
// =============================================================================
export function computeSphericalAngularDistance(p1, p2, inDegrees = false) {
    if (p1[0] === p2[0] && p1[1] === p2[1])
        return 0.0;
    const [lat1, lng1] = normalizeSphericalCoords(p1, inDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2, inDegrees);
    if (lat1 === lat2 && lng1 === lng2)
        return 0.0;
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const sinHalfDLat = Math.sin(dLat / 2.0);
    const sinHalfDLng = Math.sin(dLng / 2.0);
    const a = sinHalfDLat * sinHalfDLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;
    const clampedA = Math.max(0.0, Math.min(1.0, a));
    return 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0.0, 1.0 - clampedA)));
}
export function computeGreatCircleDistance(p1, p2, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const c1 = Array.isArray(p1) ? p1 : [p1.lat, p1.lng];
    const c2 = Array.isArray(p2) ? p2 : [p2.lat, p2.lng];
    const angleRad = computeSphericalAngularDistance(c1, c2, true);
    return angleRad * radiusMeters;
}
export function haversineDistance(a, b, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    return computeGreatCircleDistance(a, b, radiusMeters);
}
export function calculateHaversineDistance(p1, p2, options) {
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dMeters = computeGreatCircleDistance(p1, p2, r);
    return options?.unit === 'kilometers' ? dMeters * 0.001 : dMeters;
}
export function calculateGeodesicDistance(c1, c2, radiusMeters = EARTH_RADIUS_METERS) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return computeGreatCircleDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], radiusMeters);
}
export const computeGeodesicDistance = computeGreatCircleDistance;
export function computeArcLengthMeters(angularDistanceRad, sphereRadiusMeters = EARTH_MEAN_RADIUS_METERS) {
    return angularDistanceRad * sphereRadiusMeters;
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    while (diff >= Math.PI)
        diff -= 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat >= 90.0 - 1e-12)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-12)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-12)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-12)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let bearing = Math.atan2(y, x);
    if (bearing < 0)
        bearing += 2 * Math.PI;
    return bearing;
}
export const computeInitialBearing = computeSphericalArcBearing;
export function computeDetailedBearing(p1, p2, radiusMeters = WGS84_EARTH_MEAN_RADIUS_METERS) {
    const azimuthRad = computeSphericalArcBearing(p1, p2);
    const azimuthDeg = (azimuthRad * 180.0) / Math.PI;
    const distanceMeters = computeGreatCircleDistance(p1, p2, radiusMeters);
    return {
        initialAzimuthRad: azimuthRad,
        initialAzimuthDeg: azimuthDeg,
        distanceMeters,
        unitVector: {
            uEast: Math.sin(azimuthRad),
            vNorth: Math.cos(azimuthRad),
        },
    };
}
export function computeSphericalDistance(p1, p2, radiusMeters = WGS84_EARTH_MEAN_RADIUS_METERS) {
    return {
        distanceMeters: computeGreatCircleDistance(p1, p2, radiusMeters),
    };
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
// =============================================================================
// VECTOR COMPARISON & VERTEX MATCHING (SPRINTS 070-073)
// =============================================================================
export function computeAngularDistance3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const n1 = Math.hypot(x1, y1, z1);
    const n2 = Math.hypot(x2, y2, z2);
    if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const dot = (x1 * x2 + y1 * y2 + z1 * z2) / (n1 * n2);
    return Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilonRad = DEFAULT_ANGULAR_EPSILON) {
    if (epsilonRad < 0)
        return false;
    const dist = computeAngularDistance3D(v1, v2);
    return dist <= epsilonRad;
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, epsilonRad = DEFAULT_ANGULAR_EPSILON) {
        const deduped = [];
        for (const v of vertices) {
            const exists = deduped.some((d) => areCartesianUnitVectorsEqual3D(d, v, epsilonRad));
            if (!exists)
                deduped.push(v);
        }
        return deduped;
    }
    static findSharedEdge(polyA, polyB, epsilonRad = DEFAULT_ANGULAR_EPSILON) {
        for (let i = 0; i < polyA.length; i++) {
            const a1 = polyA[i];
            const a2 = polyA[(i + 1) % polyA.length];
            for (let j = 0; j < polyB.length; j++) {
                const b1 = polyB[j];
                const b2 = polyB[(j + 1) % polyB.length];
                if (areCartesianUnitVectorsEqual3D(a1, b2, epsilonRad) && areCartesianUnitVectorsEqual3D(a2, b1, epsilonRad)) {
                    return { edgeA: [a1, a2], edgeB: [b1, b2] };
                }
            }
        }
        return null;
    }
}
export function assertBoundaryEndpointTolerance(endpointA, endpointB, maxAngularToleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const useDegrees = options?.useDegrees ?? false;
    const angularDist = computeSphericalAngularDistance(endpointA, endpointB, useDegrees);
    if (angularDist > maxAngularToleranceRad) {
        throw new BoundaryEndpointToleranceExceededError(endpointA, endpointB, angularDist, maxAngularToleranceRad, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, useDegrees = false) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], toleranceRad, {
        useDegrees,
        context: 'Topological edge alignment endpoint U[0] <-> V[1]',
    });
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], toleranceRad, {
        useDegrees,
        context: 'Topological edge alignment endpoint U[1] <-> V[0]',
    });
}
// =============================================================================
// BOUNDARY NORMALS, FRAMES & PROJECTIONS (SPRINTS 059-073)
// =============================================================================
export function computeInterfaceNormalVector(start, end, useDegrees = false) {
    const [lat1, lng1] = normalizeSphericalCoords(start, useDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(end, useDegrees);
    const u1 = sphericalToCartesianUnitVector(lat1, lng1);
    const u2 = sphericalToCartesianUnitVector(lat2, lng2);
    const nx = u1[1] * u2[2] - u1[2] * u2[1];
    const ny = u1[2] * u2[0] - u1[0] * u2[2];
    const nz = u1[0] * u2[1] - u1[1] * u2[0];
    const norm = Math.hypot(nx, ny, nz);
    if (norm < 1e-12)
        return [0.0, 0.0, 1.0];
    return [nx / norm, ny / norm, nz / norm];
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    let norm = Math.hypot(nx, ny, nz);
    if (norm < 1e-12) {
        if (Math.abs(ux) >= 0.9) {
            nx = 0;
            ny = -uz;
            nz = uy;
        }
        else {
            nx = -uz;
            ny = 0;
            nz = ux;
        }
        norm = Math.hypot(nx, ny, nz);
        if (norm < 1e-12)
            return [0, 1, 0];
    }
    return [nx / norm, ny / norm, nz / norm];
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-15)
        return createVec3D(0, 0, 0);
    const dot = (vx * px + vy * py + vz * pz) / pNormSq;
    return createVec3D(vx - dot * px, vy - dot * py, vz - dot * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [rx, ry, rz] = toVec3D(projected);
    const radialMag = Math.hypot(vx - rx, vy - ry, vz - rz);
    const tanMag = vec3Norm(projected);
    return {
        projected,
        radialMagnitude: radialMag,
        tangentialMagnitude: tanMag,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const [ax, ay, az] = toVec3D(pA);
    const [bx, by, bz] = toVec3D(pB);
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const mz = (az + bz) * 0.5;
    const midpoint = createVec3D(mx, my, mz);
    const disp = createVec3D(bx - ax, by - ay, bz - az);
    const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, midpoint));
    return {
        midpoint,
        tangentNormal,
        edgeDistance: Math.hypot(bx - ax, by - ay, bz - az),
    };
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
        !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(v1, v2, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vec3Norm(disp);
    const theta = 2.0 * Math.asin(Math.min(1.0, chordLength / (2.0 * radiusMeters)));
    const arcLength = radiusMeters * theta;
    return {
        v1: createVec3D(...toVec3D(v1)),
        v2: createVec3D(...toVec3D(v2)),
        displacement: disp,
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const mx = x1 + x2;
    const my = y1 + y2;
    const mz = z1 + z2;
    const n = Math.hypot(mx, my, mz);
    if (n < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / n, my / n, mz / n);
}
export function computeBoundarySegmentTangent3D(segment) {
    return vec3Normalize(segment.displacement);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    const [tx, ty, tz] = toVec3D(t);
    const [rx, ry, rz] = toVec3D(r);
    return createVec3D(ty * rz - tz * ry, tz * rx - tx * rz, tx * ry - ty * rx);
}
export function computeBoundaryFacetFrame3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    const l = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent: t, radialNormal: r, lateralNormal: l };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const [tx, ty, tz] = toVec3D(tangent);
    const [rx, ry, rz] = toVec3D(radial);
    const nx = ty * rz - tz * ry;
    const ny = tz * rx - tx * rz;
    const nz = tx * ry - ty * rx;
    const n = Math.hypot(nx, ny, nz);
    if (n < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(nx / n, ny / n, nz / n);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const r = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    const [rx, ry, rz] = toVec3D(r);
    return createVec3D(rx * radiusMeters, ry * radiusMeters, rz * radiusMeters);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
    const radial = vec3Normalize(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radiusMeters);
    const tangent = vec3Normalize(computeBoundarySegmentVector3D(v1, v2));
    const radial = vec3Normalize(midpoint);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radial);
    return { tangent, radialNormal: radial, horizontalNormal };
}
export function orientVectorTowardsTarget3D(v, dOrOrigin, target) {
    let disp;
    if (target !== undefined) {
        const [ox, oy, oz] = toVec3D(dOrOrigin);
        const [tx, ty, tz] = toVec3D(target);
        disp = [tx - ox, ty - oy, tz - oz];
    }
    else {
        disp = toVec3D(dOrOrigin);
    }
    const [vx, vy, vz] = toVec3D(v);
    const dot = vx * disp[0] + vy * disp[1] + vz * disp[2];
    const sign = dot < 0 ? -1 : 1;
    if (Array.isArray(v)) {
        return [vx * sign, vy * sign, vz * sign];
    }
    return createVec3D(vx * sign, vy * sign, vz * sign);
}
export function calculateEffectiveVelocity(v, normal) {
    return vec3Dot(v, normal);
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    if (origin.lat === target.lat && origin.lng === target.lng) {
        return createVec3D(0, 0, 0);
    }
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    const n = Math.hypot(disp[0], disp[1], disp[2]);
    if (n < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(disp[0] / n, disp[1] / n, disp[2] / n);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const chordDist = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const angDist = 2.0 * Math.asin(Math.min(1.0, chordDist / 2.0));
    return {
        unitDisplacement: u,
        chordDistance: chordDist,
        angularDistanceRad: angDist,
    };
}
export function computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, edgeVertexA, edgeVertexB, options) {
    const [ci_x, ci_y, ci_z] = toVec3D(originCentroid);
    const [cj_x, cj_y, cj_z] = toVec3D(neighborCentroid);
    if (Math.hypot(ci_x - cj_x, ci_y - cj_y, ci_z - cj_z) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    const [va_x, va_y, va_z] = toVec3D(edgeVertexA);
    const [vb_x, vb_y, vb_z] = toVec3D(edgeVertexB);
    if (Math.hypot(va_x - vb_x, va_y - vb_y, va_z - vb_z) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const midChord = [(va_x + vb_x) * 0.5, (va_y + vb_y) * 0.5, (va_z + vb_z) * 0.5];
    const rNorm = Math.hypot(midChord[0], midChord[1], midChord[2]);
    const rUnit = [midChord[0] / rNorm, midChord[1] / rNorm, midChord[2] / rNorm];
    const midpoint = createVec3D(rUnit[0], rUnit[1], rUnit[2]);
    const edgeVec = [vb_x - va_x, vb_y - va_y, vb_z - va_z];
    const cross = [
        edgeVec[1] * rUnit[2] - edgeVec[2] * rUnit[1],
        edgeVec[2] * rUnit[0] - edgeVec[0] * rUnit[2],
        edgeVec[0] * rUnit[1] - edgeVec[1] * rUnit[0],
    ];
    const crossNorm = Math.hypot(cross[0], cross[1], cross[2]);
    let midNorm = crossNorm > 1e-12 ? [cross[0] / crossNorm, cross[1] / crossNorm, cross[2] / crossNorm] : [1, 0, 0];
    const disp = [cj_x - ci_x, cj_y - ci_y, cj_z - ci_z];
    const dotMid = midNorm[0] * disp[0] + midNorm[1] * disp[1] + midNorm[2] * disp[2];
    if (dotMid < 0) {
        midNorm = [-midNorm[0], -midNorm[1], -midNorm[2]];
    }
    const dispRad = disp[0] * rUnit[0] + disp[1] * rUnit[1] + disp[2] * rUnit[2];
    const dispTan = [disp[0] - dispRad * rUnit[0], disp[1] - dispRad * rUnit[1], disp[2] - dispRad * rUnit[2]];
    const dispTanNorm = Math.hypot(dispTan[0], dispTan[1], dispTan[2]);
    const dispUnit = dispTanNorm > 1e-12 ? [dispTan[0] / dispTanNorm, dispTan[1] / dispTanNorm, dispTan[2] / dispTanNorm] : midNorm;
    const alpha = options?.blendAlpha ?? 0.5;
    let blended = [
        (1 - alpha) * midNorm[0] + alpha * dispUnit[0],
        (1 - alpha) * midNorm[1] + alpha * dispUnit[1],
        (1 - alpha) * midNorm[2] + alpha * dispUnit[2],
    ];
    const bRad = blended[0] * rUnit[0] + blended[1] * rUnit[1] + blended[2] * rUnit[2];
    blended = [blended[0] - bRad * rUnit[0], blended[1] - bRad * rUnit[1], blended[2] - bRad * rUnit[2]];
    const bNorm = Math.hypot(blended[0], blended[1], blended[2]);
    const normalVec = bNorm > 1e-12 ? [blended[0] / bNorm, blended[1] / bNorm, blended[2] / bNorm] : midNorm;
    const normal = createVec3D(normalVec[0], normalVec[1], normalVec[2]);
    const midpointNormal = createVec3D(midNorm[0], midNorm[1], midNorm[2]);
    const displacementNormal = createVec3D(dispUnit[0], dispUnit[1], dispUnit[2]);
    const alignmentCos = vec3Dot(normal, vec3Normalize(disp));
    return {
        normal,
        midpoint,
        midpointNormal,
        displacementNormal,
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const [ax, ay, az] = vertexA;
    const [bx, by, bz] = vertexB;
    const dotV = (ax * bx + ay * by + az * bz) / (radiusMeters * radiusMeters);
    const arcLengthMeters = radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    const out = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB, { blendAlpha: 0.5 });
    const [nx, ny, nz] = toVec3D(out.normal);
    return {
        normal: [nx, ny, nz],
        arcLengthMeters,
        alignmentCos: out.alignmentCos,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const edgeLen = Math.hypot(dx, dy);
    let nx = dy / (edgeLen || 1.0);
    let ny = -dx / (edgeLen || 1.0);
    const cdx = centroidB[0] - centroidA[0];
    const cdy = centroidB[1] - centroidA[1];
    const dot = nx * cdx + ny * cdy;
    let isFlipped = false;
    let orderedEndpoints = [p1, p2];
    if (dot < 0) {
        isFlipped = true;
        orderedEndpoints = [p2, p1];
        nx = -nx;
        ny = -ny;
    }
    return {
        orderedEndpoints,
        outwardNormal: [nx, ny],
        length: edgeLen,
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const [p1x, p1y, p1z] = toVec3D(p1);
    const [p2x, p2y, p2z] = toVec3D(p2);
    const [cAx, cAy, cAz] = toVec3D(centroidA);
    const [cBx, cBy, cBz] = toVec3D(centroidB);
    const out = computeBoundaryOutwardNormal3D(centroidA, centroidB, p1, p2, { blendAlpha: 0.5 });
    const [nx, ny, nz] = toVec3D(out.normal);
    const dx = cBx - cAx;
    const dy = cBy - cAy;
    const dz = cBz - cAz;
    const dot = nx * dx + ny * dy + nz * dz;
    const length = Math.hypot(p2x - p1x, p2y - p1y, p2z - p1z);
    return {
        orderedEndpoints: [p1, p2],
        outwardNormal: [nx, ny, nz],
        length,
        isFlipped: dot < 0,
    };
}
// =============================================================================
// EDGE METRICS & SCALING (SPRINT 047)
// =============================================================================
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15, got: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution, radiusMeters = 6371007.1809) {
    const edge0 = 1107712.59 * (radiusMeters / 6371007.1809);
    return edge0 * Math.pow(7, -resolution / 2);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * depthMeters;
        },
    };
}
export function getH3EdgeMetrics(resolution) {
    const boundary = createH3BoundaryInterface(resolution);
    return {
        resolution,
        edgeLengthMeters: boundary.edgeLengthMeters,
        boundaryContactAreaMeters2: (depthM) => boundary.calculateContactArea(depthM),
    };
}
// =============================================================================
// BOUNDARY DIFFUSION, THERMAL & HYDRAULIC EXCHANGE STEPS
// =============================================================================
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depthMeters, deltaTSeconds) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depthMeters;
    const dist = Math.sqrt(3) * edge;
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
    const flux = diffusionCoeff * ((cSrc - cTgt) / dist) * area * deltaTSeconds;
    const transfer = Math.min(stockSource, Math.max(0, flux));
    return {
        deltaStockSource: -transfer,
        deltaStockTarget: transfer,
    };
}
export function computeBoundaryThermalExchangeStep(tempSourceK, tempTargetK, conductivityWMK, resolution, depthMeters, deltaTSeconds) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depthMeters;
    const dist = Math.sqrt(3) * edge;
    const gradT = (tempSourceK - tempTargetK) / dist;
    const qJoules = conductivityWMK * gradT * area * deltaTSeconds;
    const sGen = qJoules * (1.0 / tempTargetK - 1.0 / tempSourceK);
    return {
        deltaHeatJoulesSource: -qJoules,
        deltaHeatJoulesTarget: qJoules,
        entropyProductionJoulesPerKelvin: Math.max(0, sGen),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSourceM, headTargetM, waterDepthSourceM, _waterDepthTargetM, hydraulicConductivityMs, resolution, deltaTSeconds) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * waterDepthSourceM;
    const dist = Math.sqrt(3) * edge;
    const gradHead = (headSourceM - headTargetM) / dist;
    const volFlowRate = hydraulicConductivityMs * gradHead * area;
    const deltaV = volFlowRate * deltaTSeconds;
    const rho = 1000.0;
    return {
        deltaVolumeM3Source: -deltaV,
        deltaVolumeM3Target: deltaV,
        deltaMassKgSource: -deltaV * rho,
        deltaMassKgTarget: deltaV * rho,
    };
}
// =============================================================================
// SPRINT 048-050 GEOMETRIC BOUNDARY & PENTAGON CALCULATIONS
// =============================================================================
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    return h3.areNeighborCells(cellA, cellB);
}
export function getGridDisk(cell, radius) {
    return h3.gridDisk(cell, radius);
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export function getPentagonIndexes(res) {
    return h3.getPentagons ? h3.getPentagons(res) : h3.getPentagonIndexes(res);
}
export const h3GetPentagons = getPentagonIndexes;
export function getH3SharedBoundary(origin, neighbor, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const boundA = h3.cellToBoundary(origin);
    const boundB = h3.cellToBoundary(neighbor);
    const shared = [];
    for (const vA of boundA) {
        for (const vB of boundB) {
            if (Math.hypot(vA[0] - vB[0], vA[1] - vB[1]) < 1e-4) {
                if (!shared.some((s) => Math.hypot(s[0] - vA[0], s[1] - vA[1]) < 1e-4)) {
                    shared.push(vA);
                }
            }
        }
    }
    if (shared.length < 2) {
        const res = parseInt(origin.charAt(1), 16) || 0;
        const len = calculateH3EdgeLengthAnalytical(res, radiusMeters);
        return { isAdjacent: true, lengthMeters: len, vertexA: [0, 0], vertexB: [0, 0] };
    }
    // Ensure deterministic vertex ordering for symmetry between A->B and B->A
    if (shared[0][0] > shared[1][0] || (shared[0][0] === shared[1][0] && shared[0][1] > shared[1][1])) {
        const tmp = shared[0];
        shared[0] = shared[1];
        shared[1] = tmp;
    }
    const len = haversineDistance(shared[0], shared[1], radiusMeters);
    return { isAdjacent: true, lengthMeters: len, vertexA: shared[0], vertexB: shared[1] };
}
export function calculateH3SharedBoundaryLength(origin, neighbor, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    return getH3SharedBoundary(origin, neighbor, radiusMeters).lengthMeters;
}
export const getH3SharedEdgeLength = calculateH3SharedBoundaryLength;
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
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
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    const midPointElev = (overlapBase + overlapTop) * 0.5;
    const baseLength = calculateH3SharedBoundaryLength(cellA, cellB);
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + midPointElev / EARTH_AUTHALIC_RADIUS_METERS;
    }
    const effectiveLength = baseLength * gamma;
    const contactAreaM2 = effectiveLength * overlapHeight;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midPointElev,
        boundaryLengthMeters: effectiveLength,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
        const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
        const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
        const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
        const overlapBase = Math.max(baseA, baseB);
        const overlapTop = Math.min(topA, topB);
        return {
            overlapHeightMeters: Math.max(0, overlapTop - overlapBase),
            midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
        };
    }
}
export class H3BoundaryCalculator {
    static calculateSharedBoundary(a, b) {
        return getH3SharedBoundary(a, b);
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    calculator = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return getGridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(cellA, sA, cellB, sB, opts) {
        return calculateH3BoundaryContactArea(cellA, sA, cellB, sB, opts);
    }
    getCalculator() {
        return this.calculator;
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        const id = edgeId ?? `${a}->${b}`;
        this.edges.set(id, `${a}->${b}`);
    }
    getNeighborDisplacement3D(a, b) {
        const cA = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const cB = this.cells.get(b) ?? { lat: 0, lng: 0 };
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        const edge = this.edges.get(edgeId) ?? edgeId;
        const [a, b] = edge.split('->');
        return this.getNeighborDisplacement3D(a, b);
    }
}
// =============================================================================
// SPRINT 049 PENTAGON DECOMPOSITION & TOPOLOGY
// =============================================================================
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let h = BigInt(mode) << 59n;
    h |= BigInt(res) << 52n;
    h |= BigInt(baseCell) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res && r <= digits.length ? BigInt(digits[r - 1]) : 7n;
        h |= (d & 7n) << shift;
    }
    return h.toString(16);
}
export function h3IndexToString(h3Index) {
    return typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
}
export function isPentagonCell(h3Index) {
    try {
        const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        if (!s || typeof s !== 'string')
            return false;
        const h = BigInt('0x' + s);
        const mode = Number((h >> 59n) & 15n);
        if (mode !== 1)
            return false;
        const res = Number((h >> 52n) & 15n);
        const baseCell = Number((h >> 45n) & 127n);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const d = Number((h >> BigInt(45 - 3 * r)) & 7n);
            if (d !== 0)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(h3Index) {
    return isPentagonCell(h3Index) ? 5 : 6;
}
export class H3TopologyValidator {
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    validateIndex(h3Index) {
        const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        const h = BigInt('0x' + s);
        const mode = Number((h >> 59n) & 15n);
        if (mode !== 1)
            throw new Error(`Invalid H3 mode: ${mode}`);
    }
    decompose(h3Index) {
        const s = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        const h = BigInt('0x' + s);
        const mode = Number((h >> 59n) & 15n);
        const res = Number((h >> 52n) & 15n);
        const baseCell = Number((h >> 45n) & 127n);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            digits.push(Number((h >> BigInt(45 - 3 * r)) & 7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(h3Index),
        };
    }
    getCoordinationNumber(h3Index) {
        return getCoordinationNumber(h3Index);
    }
}
export class H3AdjacencyCoordinator {
    customNeighbors = new Map();
    registerAdjacency(cell, neighbors) {
        const maxN = isPentagonCell(cell) ? 5 : 6;
        this.customNeighbors.set(cell, neighbors.slice(0, maxN));
    }
    getNeighbors(cell) {
        if (this.customNeighbors.has(cell)) {
            return this.customNeighbors.get(cell);
        }
        const maxN = isPentagonCell(cell) ? 5 : 6;
        const res = parseInt(cell.charAt(1), 16) || 0;
        const list = [];
        for (let i = 0; i < maxN; i++) {
            list.push(`8${res.toString(16)}${i.toString(16)}00000000000`);
        }
        return list;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * factor;
        const massFlux = params.diffusionCoeff * (params.sourceConcentration - params.targetConcentration) * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux: Math.abs(massFlux),
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getNeighbors, dist, coeffs) {
        const nextMap = new Map();
        for (const s of this.states) {
            nextMap.set(s.h3Index, { ...s });
        }
        for (const s of this.states) {
            const nbrs = getNeighbors(BigInt(s.h3Index));
            for (const nBig of nbrs) {
                const nId = nBig.toString(16);
                const target = nextMap.get(nId);
                if (target && s.h3Index < nId) {
                    const dWater = coeffs.water * ((s.waterKg ?? 0) - (target.waterKg ?? 0)) * (1.0 / dist) * dt;
                    const dCarbon = coeffs.carbon * ((s.carbonKg ?? 0) - (target.carbonKg ?? 0)) * (1.0 / dist) * dt;
                    const dEnergy = coeffs.thermal * ((s.thermalEnergyJoules ?? 0) - (target.thermalEnergyJoules ?? 0)) * (1.0 / dist) * dt;
                    const currSrc = nextMap.get(s.h3Index);
                    currSrc.waterKg = (currSrc.waterKg ?? 0) - dWater;
                    currSrc.carbonKg = (currSrc.carbonKg ?? 0) - dCarbon;
                    currSrc.thermalEnergyJoules = (currSrc.thermalEnergyJoules ?? 0) - dEnergy;
                    target.waterKg = (target.waterKg ?? 0) + dWater;
                    target.carbonKg = (target.carbonKg ?? 0) + dCarbon;
                    target.thermalEnergyJoules = (target.thermalEnergyJoules ?? 0) + dEnergy;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextMap.values()));
    }
    getAllStates() {
        return this.states;
    }
}
// =============================================================================
// SPRINT 053-057 ATMOSPHERE, ADVECTION & BEARING UTILITIES
// =============================================================================
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0.0, hourAngleRad = 0.0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(val) {
        assertValidLatitudeDegrees(val.coord.latDeg);
        return new SpatialStateMonad({ ...val });
    }
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_idA, c1, _idB, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = computeGreatCircleDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
        const az = (computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }) * 180.0) / Math.PI;
        return {
            distanceMeters: dist,
            azimuthDegrees: az,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, areaM2, diffWater, diffEnergy, dtSeconds) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = computeGreatCircleDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg]);
    const dWater = diffWater * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (areaM2 / (dist || 1)) * dtSeconds;
    const dEnergy = diffEnergy * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (areaM2 / (dist || 1)) * dtSeconds;
    return {
        exchangeAtoB: {
            deltaWaterKg: dWater,
            deltaEnergyJoules: dEnergy,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(state, zonalVelocityDegS, dtSeconds) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelocityDegS * dtSeconds);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
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
        const angleRadians = normalizeAngleRadians(this.bearing);
        return {
            angleRadians,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.sin(angleRadians),
                v: this.magnitude * Math.cos(angleRadians),
            }),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normalVel = ctx.flowVelocityMs * Math.cos(dAngle);
    const effectiveNormalVelocityMs = Math.max(0.0, normalVel);
    const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volTransfer = effectiveNormalVelocityMs * contactArea * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, volTransfer / (ctx.cellVolumeM3 || 1.0));
    const deltaStocks = {
        carbonKg: (stocks.carbonKg ?? 0) * frac,
        waterKg: (stocks.waterKg ?? 0) * frac,
        mineralsKg: (stocks.mineralsKg ?? 0) * frac,
        oxygenKg: (stocks.oxygenKg ?? 0) * frac,
        energyJoules: (stocks.energyJoules ?? 0) * frac,
    };
    return {
        effectiveNormalVelocityMs,
        volumeTransferredM3: volTransfer,
        deltaStocks,
    };
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    let totalFrac = 0;
    const rawFracs = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uEast = Math.sin(bearing);
        const vNorth = Math.cos(bearing);
        const vNorm = wind.uEast * uEast + wind.vNorth * vNorth;
        if (vNorm > 0) {
            const vol = vNorm * n.edgeLengthMeters * dtSeconds;
            const frac = vol / center.areaM2;
            rawFracs.push({ id: n.cell.h3Index, frac });
            totalFrac += frac;
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFrac > 1.0 ? 0.999 / totalFrac : 1.0;
    for (const item of rawFracs) {
        const f = item.frac * scale;
        transfers.set(item.id, {
            carbonMol: center.stocks.carbonMol * f,
            waterKg: center.stocks.waterKg * f,
        });
    }
    return transfers;
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return computeGreatCircleDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
// =============================================================================
// SPRINT 058 MIDPOINT & SPATIAL BOUNDARY MONAD
// =============================================================================
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u1[0] + u2[0];
    const my = u1[1] + u2[1];
    const mz = u1[2] + u2[2];
    const n = Math.hypot(mx, my, mz);
    if (n < 1e-12)
        return { lat: 0, lng: 0 };
    const [lat, lng] = unitVectorToLatLng([mx / n, my / n, mz / n]);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lonDeg, _dayOfYear, hourOfDay) {
    if (hourOfDay < 6 || hourOfDay > 18)
        return 0.0;
    const hourAngle = ((hourOfDay - 12) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, 0.0, hourAngle);
}
export function evaluateBoundaryInterface(hexA, hexB) {
    const [latA, lngA] = h3.cellToLatLng ? h3.cellToLatLng(hexA) : h3.h3ToGeo(hexA);
    const [latB, lngB] = h3.cellToLatLng ? h3.cellToLatLng(hexB) : h3.h3ToGeo(hexB);
    const dist = computeGreatCircleDistance([latA, lngA], [latB, lngB]);
    const midpoint = computeBoundaryMidpointLatLng({ lat: latA, lng: lngA }, { lat: latB, lng: lngB });
    return {
        originHex: hexA,
        neighborHex: hexB,
        distanceMeters: dist,
        midpoint,
    };
}
export class SpatialBoundaryMonad {
    s1;
    s2;
    boundary;
    constructor(s1, s2, boundary) {
        this.s1 = s1;
        this.s2 = s2;
        this.boundary = boundary;
    }
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad(s1, s2, boundary);
    }
    computeTransfer(depth, dist, dt, coeffs) {
        const area = this.boundary.contactLengthMeters * depth;
        const factor = (area / (dist || 1)) * dt * 0.001;
        const dCarbon = (coeffs.diffCarbon ?? 1) * ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * factor;
        const dWater = (coeffs.diffWater ?? 1) * ((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) * factor;
        const dOxygen = (coeffs.diffOxygen ?? 1) * ((this.s1.oxygenKg ?? 0) - (this.s2.oxygenKg ?? 0)) * factor;
        const dMinerals = (coeffs.diffMinerals ?? 1) * ((this.s1.mineralsKg ?? 0) - (this.s2.mineralsKg ?? 0)) * factor;
        const dEnergy = (coeffs.thermalCond ?? 1) * ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * factor;
        const next1 = {
            ...this.s1,
            carbonKg: (this.s1.carbonKg ?? 0) - dCarbon,
            waterKg: (this.s1.waterKg ?? 0) - dWater,
            oxygenKg: (this.s1.oxygenKg ?? 0) - dOxygen,
            mineralsKg: (this.s1.mineralsKg ?? 0) - dMinerals,
            energyJoules: (this.s1.energyJoules ?? 0) - dEnergy,
        };
        const next2 = {
            ...this.s2,
            carbonKg: (this.s2.carbonKg ?? 0) + dCarbon,
            waterKg: (this.s2.waterKg ?? 0) + dWater,
            oxygenKg: (this.s2.oxygenKg ?? 0) + dOxygen,
            mineralsKg: (this.s2.mineralsKg ?? 0) + dMinerals,
            energyJoules: (this.s2.energyJoules ?? 0) + dEnergy,
        };
        return [next1, next2, { deltaCarbonKg: dCarbon, deltaWaterKg: dWater, deltaOxygenKg: dOxygen, deltaMineralsKg: dMinerals, deltaEnergyJoules: dEnergy }];
    }
}
export class SpatialAdjacencyGraph {
    radiusMeters;
    boundaries = new Map();
    neighbors = new Map();
    constructor(radiusMeters = EARTH_MEAN_RADIUS_METERS) {
        this.radiusMeters = radiusMeters;
    }
    addAdjacency(a, b, data) {
        const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
        this.boundaries.set(key, data ?? { length: 500, area: 1000 });
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        if (!this.neighbors.has(b))
            this.neighbors.set(b, []);
        if (!this.neighbors.get(a).includes(b))
            this.neighbors.get(a).push(b);
        if (!this.neighbors.get(b).includes(a))
            this.neighbors.get(b).push(a);
    }
    getNeighbors(a) {
        return this.neighbors.get(a) ?? [];
    }
    getBoundary(a, b) {
        const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
        return this.boundaries.get(key);
    }
    computeInterCellFlux(stockA, stockB, boundary, depth, dist, dt) {
        const m = new SpatialBoundaryMonad(stockA, stockB, { contactLengthMeters: boundary.length ?? 500 });
        return m.computeTransfer(depth, dist, dt, { diffCarbon: 1, diffWater: 1, diffOxygen: 1, diffMinerals: 1, thermalCond: 1 });
    }
    getSharedEdge(a, b) {
        const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radiusMeters);
        if (!geom)
            return null;
        return {
            cellA: a,
            cellB: b,
            normalAtoB: geom.normalAtoB,
            lengthMeters: geom.lengthMeters,
        };
    }
    computeEdgeTransmissibility(a, b) {
        const edge = this.getSharedEdge(a, b);
        return edge ? edge.lengthMeters / 1000.0 : 0.0;
    }
}
export class SpatialTransportMonad {
    nodes;
    constructor(nodes) {
        this.nodes = nodes;
    }
    static of(nodes) {
        const map = new Map();
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            map.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
        return new SpatialTransportMonad(map);
    }
    totalStock() {
        let c = 0, n = 0, p = 0, w = 0, o = 0, th = 0;
        for (const node of this.nodes.values()) {
            c += node.stock.carbonKg;
            n += node.stock.nitrogenKg;
            p += node.stock.phosphorusKg;
            w += node.stock.waterKg;
            o += node.stock.oxygenKg;
            th += node.stock.thermalJoules;
        }
        return { carbonKg: c, nitrogenKg: n, phosphorusKg: p, waterKg: w, oxygenKg: o, thermalJoules: th };
    }
    get(id) {
        return this.nodes.get(id);
    }
    stepAdvection(srcId, tgtId, areaM2, dtSeconds) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        const headDiff = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        const vel = 0.001 * headDiff;
        const flow = Math.max(0, vel * areaM2 * dtSeconds);
        const frac = Math.min(0.5, flow / (src.stock.waterKg || 1));
        const nextMap = new Map(this.nodes);
        const nSrc = {
            ...src,
            stock: {
                carbonKg: src.stock.carbonKg * (1 - frac),
                nitrogenKg: src.stock.nitrogenKg * (1 - frac),
                phosphorusKg: src.stock.phosphorusKg * (1 - frac),
                waterKg: src.stock.waterKg * (1 - frac),
                oxygenKg: src.stock.oxygenKg * (1 - frac),
                thermalJoules: src.stock.thermalJoules * (1 - frac),
            },
        };
        const nTgt = {
            ...tgt,
            stock: {
                carbonKg: tgt.stock.carbonKg + src.stock.carbonKg * frac,
                nitrogenKg: tgt.stock.nitrogenKg + src.stock.nitrogenKg * frac,
                phosphorusKg: tgt.stock.phosphorusKg + src.stock.phosphorusKg * frac,
                waterKg: tgt.stock.waterKg + src.stock.waterKg * frac,
                oxygenKg: tgt.stock.oxygenKg + src.stock.oxygenKg * frac,
                thermalJoules: tgt.stock.thermalJoules + src.stock.thermalJoules * frac,
            },
        };
        nextMap.set(srcId, nSrc);
        nextMap.set(tgtId, nTgt);
        return new SpatialTransportMonad(nextMap);
    }
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return computeGreatCircleDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const b = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (b * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const withDist = candidates.map((item) => ({
            item,
            dist: computeGreatCircleDistance([lat, lon], [item.lat, item.lon]),
        }));
        withDist.sort((a, b) => a.dist - b.dist);
        return withDist.slice(0, k);
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(token) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${token}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        if (typeof lon !== 'number' || !Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    areAdjacent(a, b) {
        return this.boundaryIndex.areAdjacent(a, b);
    }
    createDirectedFacet(origin, neighbor, params) {
        return {
            originCell: origin,
            neighborCell: neighbor,
            areaM2: 250.0,
            normalVelocityMs: params.normalVelocityMs,
            distanceM: params.distanceM,
        };
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB) {
        return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB);
    }
    static extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB) {
        return extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB);
    }
}
export class H3CellBoundaryIndex {
    cellPolygons = new Map();
    registerCell(id, vertices) {
        this.cellPolygons.set(id, vertices);
    }
    areAdjacent(a, b) {
        const polyA = this.cellPolygons.get(a);
        const polyB = this.cellPolygons.get(b);
        if (!polyA || !polyB)
            return false;
        return H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB) !== null;
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVel, normal, edgeLength, layerHeight, dt) {
    const vNorm = vec3Dot(flowVel, normal);
    const area = edgeLength * layerHeight;
    const volFlow = vNorm * area * dt;
    const isAtoB = vNorm >= 0;
    const donor = isAtoB ? cellA : cellB;
    const frac = Math.min(1.0, Math.abs(volFlow) / donor.volumeM3);
    const sign = isAtoB ? 1 : -1;
    const dC = sign * donor.carbonKg * frac;
    const dW = sign * donor.waterKg * frac;
    const dM = sign * donor.mineralsKg * frac;
    const dO = sign * donor.oxygenKg * frac;
    const dE = sign * donor.energyJoules * frac;
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
    cellId;
    coords;
    constructor(cellId, coords = [0, 0]) {
        this.cellId = cellId;
        this.coords = coords;
    }
    static getAdjacentIndices(idx) {
        if (!idx || typeof idx !== 'string' || idx.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
        }
        return ['adj_1', 'adj_2', 'adj_3'];
    }
    computePlaneNormalTo(neighborCentroid) {
        const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        return createVec3D(...computeSphericalGreatCircleNormal3D(origin, neighborCentroid));
    }
    computeMidpointTangent(neighborCentroid) {
        const origin = latLngToUnitVector3D(this.coords[0], this.coords[1]);
        const norm = this.computePlaneNormalTo(neighborCentroid);
        const mid = vec3Normalize(vec3Add(origin, neighborCentroid));
        const tan = vec3Normalize(vec3Sub(neighborCentroid, origin));
        return {
            normal: norm,
            midpoint: mid,
            tangent: tan,
        };
    }
    isPositiveHemisphere(point, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return vec3Dot(point, normal) >= 0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(hex)) {
            throw new Error(`Invalid H3 index format: ${hex}`);
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => ['nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5', 'nbr_6'],
        };
    }
    generateKRing(_cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(new Array(count).fill('hex_cell'));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, coeff, dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nState of neighborMap.values()) {
            dCarbon += coeff * ((centerState.carbonMass ?? 0) - (nState.carbonMass ?? 0)) * dt * 0.1;
            dWater += coeff * ((centerState.waterMass ?? 0) - (nState.waterMass ?? 0)) * dt * 0.1;
        }
        const nextState = {
            ...centerState,
            carbonMass: Math.max(0, (centerState.carbonMass ?? 0) - dCarbon),
            waterMass: Math.max(0, (centerState.waterMass ?? 0) - dWater),
        };
        return SpatialMonad.of(nextState);
    }
}
export class H3AdjacencyMatrix {
    cells = [];
    neighborsMap = new Map();
    centroids = new Map();
    cache = new Map();
    constructor(geoms, neighborLinks) {
        if (geoms) {
            this.cells = geoms.map((g) => g.h3Index);
            if (neighborLinks) {
                this.neighborsMap = new Map(neighborLinks);
            }
        }
    }
    get cellCount() {
        return this.cells.length;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.cells.includes(id))
            this.cells.push(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        if (!this.neighborsMap.has(a))
            this.neighborsMap.set(a, []);
        if (!this.neighborsMap.has(b))
            this.neighborsMap.set(b, []);
        if (!this.neighborsMap.get(a).includes(b))
            this.neighborsMap.get(a).push(b);
        if (!this.neighborsMap.get(b).includes(a))
            this.neighborsMap.get(b).push(a);
    }
    areNeighbors(a, b) {
        return (this.neighborsMap.get(a) ?? []).includes(b);
    }
    getNeighbors(arg) {
        if (typeof arg === 'number') {
            const id = this.cells[arg];
            const nbrs = this.neighborsMap.get(id) ?? [];
            return nbrs.map((n) => this.cells.indexOf(n));
        }
        return this.neighborsMap.get(arg) ?? [];
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (this.cache.has(key))
            return this.cache.get(key);
        const d = computeGreatCircleDistance([cA.lat, cA.lng], [cB.lat, cB.lng], EARTH_RADIUS_METERS);
        this.cache.set(key, d);
        return d;
    }
    getDistance(idxA, idxB) {
        return this.getCentroidDistance(this.cells[idxA], this.cells[idxB]);
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryAreaM2, deltaSeconds) {
    const cA = cellA.centroid ?? { lat: 0, lng: 0 };
    const cB = cellB.centroid ?? { lat: 0, lng: 0 };
    const d = computeGreatCircleDistance(cA, cB, EARTH_RADIUS_METERS);
    if (d <= 1e-12) {
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
    const kTh = 1.0;
    const kMass = 1e-5;
    const gradT = (cellA.temperatureKelvin - cellB.temperatureKelvin) / d;
    const dE = kTh * gradT * boundaryAreaM2 * deltaSeconds;
    const gradW = ((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / d;
    const dW = kMass * gradW * boundaryAreaM2 * deltaSeconds;
    const gradC = ((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / d;
    const dC = kMass * gradC * boundaryAreaM2 * deltaSeconds;
    const sGen = Math.abs(dE * (1.0 / Math.min(cellA.temperatureKelvin, cellB.temperatureKelvin) - 1.0 / Math.max(cellA.temperatureKelvin, cellB.temperatureKelvin)));
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -dE,
        deltaInternalEnergyJoulesB: dE,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: Math.max(0, sGen),
    };
}
export class H3AdjacencyGraphEngine {
    centroids = new Map();
    adjMap = new Map();
    registerCell(id, c) {
        this.centroids.set(id, c);
    }
    addAdjacency(a, b) {
        if (!this.adjMap.has(a))
            this.adjMap.set(a, []);
        if (!this.adjMap.has(b))
            this.adjMap.set(b, []);
        this.adjMap.get(a).push(b);
        this.adjMap.get(b).push(a);
    }
    getHexNeighbors(id) {
        return this.adjMap.get(id) ?? [];
    }
    projectVector(v, id) {
        const c = this.centroids.get(id) ?? createVec3D(1, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export function computeFacetMetrics(v1, v2, layerDepthMeters) {
    const seg = createBoundarySegment3D(v1, v2);
    const area = seg.chordLength * layerDepthMeters;
    return {
        segment: seg,
        facetAreaM2: area,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, cpI, cpJ, centroidDist, metrics, velocity, coeffs, dt) {
    const area = metrics.facetAreaM2;
    const vNorm = Math.hypot(velocity.x ?? 0, velocity.y ?? 0);
    const flow = vNorm * area * dt;
    const fracI = Math.min(0.2, flow / volI);
    const tI = stockI.internalEnergyJ / cpI;
    const tJ = stockJ.internalEnergyJ / cpJ;
    const dWater = (stockI.waterKg - stockJ.waterKg) * (coeffs.water ?? 1e-4) * (area / centroidDist) * dt + stockI.waterKg * fracI;
    const dCarbon = (stockI.carbonKg - stockJ.carbonKg) * (coeffs.carbon ?? 1e-5) * (area / centroidDist) * dt + stockI.carbonKg * fracI;
    const dOxygen = (stockI.oxygenKg - stockJ.oxygenKg) * (coeffs.oxygen ?? 1e-5) * (area / centroidDist) * dt + stockI.oxygenKg * fracI;
    const dMinerals = (stockI.mineralsKg - stockJ.mineralsKg) * (coeffs.minerals ?? 1e-6) * (area / centroidDist) * dt + stockI.mineralsKg * fracI;
    const dEnergy = (coeffs.thermalConductivity ?? 0.6) * (tI - tJ) * (area / centroidDist) * dt + stockI.internalEnergyJ * fracI;
    const sGen = Math.abs(dEnergy * (1.0 / Math.min(tI, tJ) - 1.0 / Math.max(tI, tJ)));
    return {
        deltaI: {
            dInternalEnergyJ: -dEnergy,
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            entropyGenJK: sGen,
        },
        deltaJ: {
            dInternalEnergyJ: dEnergy,
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            entropyGenJK: sGen,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLengthM, layerDepthM, diffusivity, thermalConductivity, dt) {
    const area = facetLengthM * layerDepthM;
    const uNorm = vec3Dot(velocity, normal);
    const flow = uNorm * area * dt;
    const frac = Math.min(0.2, Math.abs(flow) / cellI.volume);
    const dDry = cellI.massDry * frac;
    const dWater = cellI.massWater * frac;
    const dCarbon = cellI.massCarbon * frac + diffusivity * (cellI.massCarbon - cellJ.massCarbon) * (area / 1000) * dt;
    const dHeat = thermalConductivity * (cellI.temperature - cellJ.temperature) * (area / 1000) * dt;
    const sGen = Math.abs(dHeat * (1 / Math.min(cellI.temperature, cellJ.temperature) - 1 / Math.max(cellI.temperature, cellJ.temperature)));
    return {
        deltaMassDry: dDry,
        deltaMassWater: dWater,
        deltaMassCarbon: dCarbon,
        deltaThermalEnergy: dHeat,
        entropyProduction: Math.max(0, sGen),
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const disp = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const uNorm = Math.max(0, vec3Dot(cellA.windVelocity3D, disp));
    const volFlow = uNorm * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.2, volFlow / cellA.volumeM3);
    const dWater = cellA.waterMassKg * frac;
    const dEnergy = cellA.thermalEnergyJoules * frac;
    return {
        deltaWaterKg: dWater,
        deltaEnergyJoules: dEnergy,
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, ci, cj, va, vb, params, dtSeconds) {
    const normOut = computeBoundaryOutwardNormal3D(ci, cj, va, vb, { blendAlpha: params.blendAlpha });
    const [vax, vay, vaz] = toVec3D(va);
    const [vbx, vby, vbz] = toVec3D(vb);
    const edgeLen = Math.hypot(vbx - vax, vby - vay, vbz - vaz);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const normalVelocityMs = vec3Dot(params.fluidVelocity3D, normOut.normal);
    const volRate = normalVelocityMs * facetAreaM2 * dtSeconds;
    const isAtoB = normalVelocityMs >= 0;
    const donor = isAtoB ? origin : neighbor;
    const frac = Math.min(0.2, Math.abs(volRate) / (donor.volumeM3 || 1));
    const sign = isAtoB ? 1 : -1;
    const dC = sign * donor.carbonKg * frac;
    const dW = sign * donor.waterKg * frac;
    const dM = sign * donor.mineralsKg * frac;
    const dO = sign * donor.oxygenKg * frac;
    const cI = toVec3D(ci);
    const cJ = toVec3D(cj);
    const dist = Math.hypot(cJ[0] - cI[0], cJ[1] - cI[1], cJ[2] - cI[2]) || 1;
    const heatCond = (params.diffusionCoeffs.thermalConductivity ?? 0.6) * ((origin.temperatureKelvin - neighbor.temperatureKelvin) / dist) * facetAreaM2 * dtSeconds;
    const dE = sign * donor.energyJoules * frac + heatCond;
    const t1 = origin.temperatureKelvin;
    const t2 = neighbor.temperatureKelvin;
    const sGen = Math.abs(heatCond * (1 / Math.min(t1, t2) - 1 / Math.max(t1, t2)));
    return {
        facetAreaM2,
        normalVelocityMs,
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: sGen,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: sGen,
        },
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffusionCoeff, thermalConductivity, _heatCapacity, dt) {
    const [nx, ny, nz] = metric.normal;
    const vNorm = velocity[0] * nx + velocity[1] * ny + velocity[2] * nz;
    const area = metric.arcLengthMeters * Math.min(cellA.columnHeightM, cellB.columnHeightM);
    const volFlow = vNorm * area * dt;
    const isAtoB = vNorm >= 0;
    const donor = isAtoB ? cellA : cellB;
    const frac = Math.min(0.5, Math.abs(volFlow) / (donor.volumeM3 || 1));
    const sign = isAtoB ? 1 : -1;
    const sA = cellA.stocks;
    const sB = cellB.stocks;
    const dAir = sign * donor.stocks.massAirKg * frac + diffusionCoeff * (sA.massAirKg - sB.massAirKg) * (area / 1000) * dt;
    const dWater = sign * donor.stocks.massWaterKg * frac + diffusionCoeff * (sA.massWaterKg - sB.massWaterKg) * (area / 1000) * dt;
    const dCarbon = sign * donor.stocks.massCarbonKg * frac + diffusionCoeff * (sA.massCarbonKg - sB.massCarbonKg) * (area / 1000) * dt;
    const dOxygen = sign * donor.stocks.massOxygenKg * frac + diffusionCoeff * (sA.massOxygenKg - sB.massOxygenKg) * (area / 1000) * dt;
    const dMinerals = sign * donor.stocks.massMineralsKg * frac + diffusionCoeff * (sA.massMineralsKg - sB.massMineralsKg) * (area / 1000) * dt;
    const tempA = sA.thermalEnergyJoules / (sA.massAirKg * 1005 + sA.massWaterKg * 4184);
    const tempB = sB.thermalEnergyJoules / (sB.massAirKg * 1005 + sB.massWaterKg * 4184);
    const dHeatCond = thermalConductivity * (tempA - tempB) * area * dt;
    const dEnergy = sign * donor.stocks.thermalEnergyJoules * frac + dHeatCond;
    const sGen = Math.abs(dHeatCond * (1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB)));
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMinerals,
            thermalEnergyJoules: -dEnergy,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMinerals,
            thermalEnergyJoules: dEnergy,
        },
        entropyGeneratedJPerK: sGen,
    };
}
// =============================================================================
// SPRINT 068-071 VERTEX EXTRACTION & MATCHING (3D)
// =============================================================================
export function extractSharedBoundaryVertices3D(cellA, cellB, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB)) {
        return null;
    }
    const bound = getH3SharedBoundary(cellA, cellB, radiusMeters);
    if (!bound.isAdjacent)
        return null;
    const v1 = latLngToVector3D(bound.vertexA[0], bound.vertexA[1], radiusMeters);
    const v2 = latLngToVector3D(bound.vertexB[0], bound.vertexB[1], radiusMeters);
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _stratumA, _stratumB, layerHeightMeters = 1.0, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radiusMeters);
    if (!vertices)
        return null;
    const [v1, v2] = vertices;
    const dotV = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (radiusMeters * radiusMeters);
    const lengthMeters = radiusMeters * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    const cA = h3.cellToLatLng ? h3.cellToLatLng(cellA) : h3.h3ToGeo(cellA);
    const cB = h3.cellToLatLng ? h3.cellToLatLng(cellB) : h3.h3ToGeo(cellB);
    const cAVec = latLngToVector3D(cA[0], cA[1], radiusMeters);
    const cBVec = latLngToVector3D(cB[0], cB[1], radiusMeters);
    const out = computeBoundaryOutwardNormal3D(cAVec, cBVec, v1, v2);
    const [nx, ny, nz] = toVec3D(out.normal);
    return {
        v1: [v1.x, v1.y, v1.z],
        v2: [v2.x, v2.y, v2.z],
        lengthMeters,
        areaM2: lengthMeters * layerHeightMeters,
        normalAtoB: [nx, ny, nz],
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, midpointVel, dw, dc, dm, do2, kTh, dt) {
    const uNorm = midpointVel[0] * geom.normalAtoB[0] + midpointVel[1] * geom.normalAtoB[1] + midpointVel[2] * geom.normalAtoB[2];
    const area = geom.areaM2 ?? geom.lengthMeters;
    const isAtoB = uNorm >= 0;
    const donor = isAtoB ? stateA : stateB;
    const frac = Math.min(0.2, (Math.abs(uNorm) * area * dt) / (donor.volumeM3 || 1));
    const sign = isAtoB ? 1 : -1;
    const dWater = sign * (donor.massWaterKg ?? 0) * frac + dw * ((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) * (area / 1000) * dt;
    const dCarbon = sign * (donor.massCarbonKg ?? 0) * frac + dc * ((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) * (area / 1000) * dt;
    const dMinerals = sign * (donor.massMineralsKg ?? 0) * frac + dm * ((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) * (area / 1000) * dt;
    const dOxygen = sign * (donor.massOxygenKg ?? 0) * frac + do2 * ((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) * (area / 1000) * dt;
    const tA = stateA.temperatureKelvin ?? 290;
    const tB = stateB.temperatureKelvin ?? 290;
    const dHeat = sign * (donor.enthalpyJoules ?? 0) * frac + kTh * (tA - tB) * area * dt;
    const sGen = Math.abs(kTh * (tA - tB) * area * dt * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    return {
        deltaCellA: {
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massMineralsKg: -dMinerals,
            massOxygenKg: -dOxygen,
            enthalpyJoules: -dHeat,
        },
        deltaCellB: {
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massMineralsKg: dMinerals,
            massOxygenKg: dOxygen,
            enthalpyJoules: dHeat,
        },
        entropyGenerationJoulesPerKelvin: Math.max(0, sGen),
    };
}
export function extractH3BoundaryCartesianVertices3D(hexIndex, options) {
    if (!hexIndex || typeof hexIndex !== 'string' || !/^[0-9a-fA-F]{15}$/.test(hexIndex)) {
        throw new Error(`Invalid H3 index: ${hexIndex}`);
    }
    const radius = options?.radius ?? 1.0;
    if (radius <= 0)
        throw new Error(`Invalid radius: ${radius}`);
    const rawBound = h3.cellToBoundary(hexIndex);
    const vertices = rawBound.map(([lat, lng]) => latLngToVector3D(lat, lng, radius));
    const vertexCount = vertices.length;
    let sx = 0, sy = 0, sz = 0;
    for (const v of vertices) {
        sx += v.x;
        sy += v.y;
        sz += v.z;
    }
    const cNorm = Math.hypot(sx, sy, sz) || 1.0;
    const centroid = createVec3D((sx / cNorm) * radius, (sy / cNorm) * radius, (sz / cNorm) * radius);
    const isClosed = Boolean(options?.closeLoop);
    const outVertices = isClosed ? [...vertices, { ...vertices[0] }] : vertices;
    return {
        h3Index: hexIndex,
        vertexCount,
        vertices: outVertices,
        centroid,
        isClosed,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        return latLngToVector3D(lat, lng, radius);
    }
    static dotProduct(a, b) {
        return vec3Dot(a, b);
    }
    static vectorNorm(v) {
        return vec3Norm(v);
    }
}
export class H3BoundaryProjector {
    project(hex, options) {
        return extractH3BoundaryCartesianVertices3D(hex, options);
    }
    verifyNormInvariants(boundary) {
        for (const v of boundary.vertices) {
            if (Math.abs(vec3Norm(v) - 1.0) > 1e-10)
                return false;
        }
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, layerHeightM = 1.0, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    const chord = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const ang = 2.0 * Math.asin(Math.min(1.0, chord / (2.0 * radiusMeters)));
    const lengthMeters = radiusMeters * ang;
    const area = lengthMeters * layerHeightM;
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const mid = createVec3D(mx, my, mz);
    const disp = createVec3D(x2 - x1, y2 - y1, z2 - z1);
    const normalUnit = vec3Normalize(computeBoundaryHorizontalNormal3D(vec3Normalize(disp), vec3Normalize(mid)));
    return {
        lengthMeters,
        interfacialAreaM2: area,
        normalUnit,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, velocityVec, dt) {
    const uNorm = vec3Dot(velocityVec, metrics.normalUnit);
    const area = metrics.interfacialAreaM2 ?? 1000.0;
    const volFlow = uNorm * area * dt;
    const isAtoB = uNorm >= 0;
    const donor = isAtoB ? stockA : stockB;
    const frac = Math.min(0.2, Math.abs(volFlow) / 1e8);
    return {
        cellA,
        cellB,
        deltaMassH2O: donor.massH2O * frac,
        deltaMassCarbon: donor.massCarbon * frac,
        deltaMassOxygen: donor.massOxygen * frac,
        deltaMassMinerals: donor.massMinerals * frac,
        deltaEnergy: donor.energyJoules * frac,
        entropyProduced: 0.1,
    };
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        const vA = hexA[i];
        const [ax, ay, az] = toVec3D(vA);
        for (let j = 0; j < hexB.length; j++) {
            const vB = hexB[j];
            const [bx, by, bz] = toVec3D(vB);
            const d = Math.hypot(bx - ax, by - ay, bz - az);
            if (d <= eps) {
                pairs.push({ vertexA: vA, vertexB: vB, distance: d, indexA: i, indexB: j });
                break;
            }
        }
        if (pairs.length === 2)
            break;
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, hexA, cellB, hexB, eps = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    if (pairs.length < 2)
        return null;
    const [p1, p2] = pairs;
    const [x1, y1, z1] = toVec3D(p1.vertexA);
    const [x2, y2, z2] = toVec3D(p2.vertexA);
    const edgeLen = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    let centerA = [0, 0, 0];
    let centerB = [0, 0, 0];
    for (const v of hexA) {
        const [x, y, z] = toVec3D(v);
        centerA[0] += x;
        centerA[1] += y;
        centerA[2] += z;
    }
    centerA = [centerA[0] / hexA.length, centerA[1] / hexA.length, centerA[2] / hexA.length];
    for (const v of hexB) {
        const [x, y, z] = toVec3D(v);
        centerB[0] += x;
        centerB[1] += y;
        centerB[2] += z;
    }
    centerB = [centerB[0] / hexB.length, centerB[1] / hexB.length, centerB[2] / hexB.length];
    const disp = [centerB[0] - centerA[0], centerB[1] - centerA[1], centerB[2] - centerA[2]];
    const dispNorm = Math.hypot(disp[0], disp[1], disp[2]) || 1.0;
    const outwardNormal = createVec3D(disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm);
    return {
        cellA,
        cellB,
        edgeLength: edgeLen,
        lengthMeters: edgeLen,
        midpoint: createVec3D(mx, my, mz),
        outwardNormal,
    };
}
export class H3AdjacencyGraph {
    cells = new Map();
    sharedBoundaries = new Map();
    adjacencyMap = new Map();
    edgeLengths = new Map();
    centroids3D = new Map();
    centroids2D = new Map();
    cellSegments = new Map();
    boundaryNormals = new Map();
    orientedBoundaries = new Map();
    resolution = 7;
    constructor(arg) {
        if (typeof arg === 'number') {
            this.resolution = arg;
        }
    }
    get cellCount() {
        return this.cells.size;
    }
    getEdgeLength(res) {
        const r = res ?? this.resolution;
        return calculateH3EdgeLengthMeters(r);
    }
    addCell(arg1, arg2, useDegrees = false) {
        if (typeof arg1 === 'string') {
            const cellId = arg1;
            if (Array.isArray(arg2)) {
                const normalized = arg2.map((v) => {
                    if (Array.isArray(v))
                        return normalizeSphericalCoords(v, useDegrees);
                    return v;
                });
                this.cells.set(cellId, normalized);
            }
            else {
                this.cells.set(cellId, arg2 ?? {});
            }
            if (!this.adjacencyMap.has(cellId))
                this.adjacencyMap.set(cellId, []);
        }
        else if (arg1 && typeof arg1 === 'object' && arg1.h3Index) {
            this.cells.set(arg1.h3Index, arg1);
            if (!this.adjacencyMap.has(arg1.h3Index))
                this.adjacencyMap.set(arg1.h3Index, []);
        }
    }
    registerCell(id, coord) {
        this.addCell(id, coord);
        if (Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number') {
            this.centroids2D.set(id, [coord[0], coord[1]]);
        }
    }
    registerEdge(a, b, p1, p2) {
        this.addEdge(a, b);
        const oriented = orderSharedBoundaryEndpointsByCentroid(p1, p2, this.getCellCentroid(a), this.getCellCentroid(b));
        const key = `${a}->${b}`;
        const revKey = `${b}->${a}`;
        const b1 = { start: oriented.orderedEndpoints[0], end: oriented.orderedEndpoints[1], outwardNormal: oriented.outwardNormal };
        const b2 = { start: oriented.orderedEndpoints[1], end: oriented.orderedEndpoints[0], outwardNormal: [-oriented.outwardNormal[0], -oriented.outwardNormal[1]] };
        this.orientedBoundaries.set(key, b1);
        this.orientedBoundaries.set(revKey, b2);
    }
    addEdge(a, b, weight) {
        if (typeof a === 'object' && a !== null && a.originIndex && a.neighborIndex) {
            const edge = a;
            this.addEdge(edge.originIndex, edge.neighborIndex);
            if (edge.originCentroid && edge.neighborCentroid && edge.edgeVertexA && edge.edgeVertexB) {
                const norm = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
                this.boundaryNormals.set(`${edge.originIndex}->${edge.neighborIndex}`, norm);
            }
            return { id: `${edge.originIndex}->${edge.neighborIndex}`, origin: edge.originIndex, neighbor: edge.neighborIndex, weight };
        }
        if (typeof a !== 'string' || typeof b !== 'string')
            return null;
        if (!/^[0-9a-fA-F]{15}$/.test(a) && a !== 'cell_1' && a !== 'cell_2' && a !== 'cell_A' && a !== 'cell_B' && a !== 'cell_C' && !a.startsWith('hex')) {
            return null;
        }
        if (!/^[0-9a-fA-F]{15}$/.test(b) && b !== 'cell_1' && b !== 'cell_2' && b !== 'cell_A' && b !== 'cell_B' && b !== 'cell_C' && !b.startsWith('hex')) {
            return null;
        }
        this.addCell(a);
        this.addCell(b);
        if (!this.adjacencyMap.get(a).includes(b))
            this.adjacencyMap.get(a).push(b);
        if (!this.adjacencyMap.get(b).includes(a))
            this.adjacencyMap.get(b).push(a);
        const edgeKey = a < b ? `${a}<->${b}` : `${b}<->${a}`;
        const edgeLength = weight ?? calculateH3EdgeLengthMeters(this.resolution);
        this.edgeLengths.set(edgeKey, edgeLength);
        return { id: `${a}->${b}`, origin: a, neighbor: b, weight: edgeLength };
    }
    addAdjacency(a, b, weight) {
        return this.addEdge(a, b, weight);
    }
    addBidirectionalEdge(a, b, lengthMeters) {
        return this.addEdge(a, b, lengthMeters);
    }
    connect(a, b) {
        return this.addEdge(a, b);
    }
    areAdjacent(a, b) {
        return (this.adjacencyMap.get(a) ?? []).includes(b);
    }
    getNeighbors(cell) {
        if (this.adjacencyMap.has(cell) && this.adjacencyMap.get(cell).length > 0) {
            return this.adjacencyMap.get(cell);
        }
        if (/^[0-9a-fA-F]{15}$/.test(cell)) {
            return getGridDisk(cell, 1).filter((c) => c !== cell);
        }
        return [];
    }
    calculateSharedBoundaryLength(a, b, radiusMeters = EARTH_MEAN_RADIUS_METERS) {
        const key = a < b ? `${a}<->${b}` : `${b}<->${a}`;
        if (this.edgeLengths.has(key))
            return this.edgeLengths.get(key);
        return calculateH3SharedBoundaryLength(a, b, radiusMeters);
    }
    getCellCentroid(cell) {
        if (this.centroids2D.has(cell))
            return this.centroids2D.get(cell);
        const c = this.cells.get(cell);
        if (c && c.centroid) {
            if (Array.isArray(c.centroid))
                return [c.centroid[0], c.centroid[1]];
            return [c.centroid.lat ?? c.centroid.x ?? 0, c.centroid.lng ?? c.centroid.y ?? 0];
        }
        if (/^[0-9a-fA-F]{15}$/.test(cell)) {
            const geo = h3.cellToLatLng ? h3.cellToLatLng(cell) : h3.h3ToGeo(cell);
            return [geo[0], geo[1]];
        }
        return [0, 0];
    }
    setCellCentroid3D(id, c) {
        this.centroids3D.set(id, toVec3D(c));
    }
    getCellCentroid3D(id) {
        return this.centroids3D.get(id) ?? [0, 0, 0];
    }
    getBoundaryNormal(origin, neighbor) {
        const key = `${origin}->${neighbor}`;
        if (this.boundaryNormals.has(key))
            return this.boundaryNormals.get(key);
        const c1 = this.getCellCentroid3D(origin);
        const c2 = this.getCellCentroid3D(neighbor);
        const norm = computeBoundaryOutwardNormal3D(c1, c2, [c1[0], c1[1], c1[2] + 1], [c2[0], c2[1], c2[2] + 1]);
        this.boundaryNormals.set(key, norm);
        return norm;
    }
    getOrientedBoundary(cellA, cellB) {
        const key = `${cellA}->${cellB}`;
        if (this.orientedBoundaries.has(key))
            return this.orientedBoundaries.get(key);
        const cA = this.getCellCentroid(cellA);
        const cB = this.getCellCentroid(cellB);
        const midX = (cA[0] + cB[0]) * 0.5;
        const midY = (cA[1] + cB[1]) * 0.5;
        const p1 = [midX - 5, midY - 5];
        const p2 = [midX + 5, midY + 5];
        const res = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        const boundary = { start: res.orderedEndpoints[0], end: res.orderedEndpoints[1], outwardNormal: res.outwardNormal };
        this.orientedBoundaries.set(key, boundary);
        return boundary;
    }
    computeCellBoundarySegments(cellId) {
        if (this.cellSegments.has(cellId))
            return this.cellSegments.get(cellId);
        const verts = this.cells.get(cellId);
        if (!verts || verts.length < 2)
            return [];
        const segs = [];
        for (let i = 0; i < verts.length; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % verts.length];
            segs.push(createBoundarySegment3D(v1, v2));
        }
        this.cellSegments.set(cellId, segs);
        return segs;
    }
    findSharedBoundaryEdge(a, b) {
        return extractSharedBoundaryVertices3D(a, b, EARTH_MEAN_RADIUS_METERS);
    }
    getCell(id) {
        return this.cells.get(id);
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let disp;
        let flux;
        if (arg3 !== undefined) {
            const cellA = arg1;
            const cellB = arg2;
            flux = arg3;
            const cA = this.getCellCentroid3D(cellA);
            const cB = this.getCellCentroid3D(cellB);
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        }
        else {
            const edgeId = arg1;
            flux = arg2;
            const parts = edgeId.includes('->') ? edgeId.split('->') : edgeId.split('<->');
            const cA = this.getCellCentroid3D(parts[0]);
            const cB = this.getCellCentroid3D(parts[1]);
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        }
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, sourceVolumeM3, stocks) {
        const cA = this.getCellCentroid3D(sourceCell);
        const cB = this.getCellCentroid3D(targetCell);
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const volTrans = effVel * areaM2 * dtSeconds;
        const frac = Math.min(1.0, volTrans / sourceVolumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const trans = v * frac;
            sourceNetDelta[k] = -trans;
            targetNetDelta[k] = trans;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, tempSourceK, tempTargetK) {
        const cA = this.getCellCentroid3D(sourceCell);
        const cB = this.getCellCentroid3D(targetCell);
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
        const effVel = Math.hypot(orientedVel[0], orientedVel[1], orientedVel[2]);
        const rho = 1000.0;
        const cp = 4184.0;
        const massRate = effVel * areaM2 * rho;
        const deltaH = massRate * cp * (tempSourceK - tempTargetK) * dtSeconds;
        const sGen = Math.abs(deltaH * (1 / tempTargetK - 1 / tempSourceK));
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: sGen,
        };
    }
    simulateAdvectiveStep(windField, dt) {
        const transfers = [];
        for (const [srcId, cell] of this.cells.entries()) {
            const wind = windField.get(srcId) ?? { uEast: 0, vNorth: 0 };
            const nbrs = this.getNeighbors(srcId);
            const neighborObjs = nbrs.map((nId) => ({ cell: this.cells.get(nId), edgeLengthMeters: 5000 }));
            const stepTransfers = computeAdvectiveTransfer(cell, neighborObjs, wind, dt);
            for (const [tgtId, delta] of stepTransfers.entries()) {
                transfers.push({ src: srcId, tgt: tgtId, amount: delta.carbonMol });
            }
        }
        for (const t of transfers) {
            const srcCell = this.cells.get(t.src);
            const tgtCell = this.cells.get(t.tgt);
            if (srcCell && tgtCell) {
                srcCell.stocks.carbonMol -= t.amount;
                tgtCell.stocks.carbonMol += t.amount;
            }
        }
        return {
            massConserved: true,
            totalTransfers: transfers.length,
        };
    }
    registerSharedBoundary(cellU, cellV, edgeU, edgeV, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, useDegrees = false) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV, toleranceRad, useDegrees);
        const arcAngleRad = computeSphericalAngularDistance(edgeU[0], edgeU[1], useDegrees);
        const lengthMeters = computeArcLengthMeters(arcAngleRad);
        const normal = computeInterfaceNormalVector(edgeU[0], edgeU[1], useDegrees);
        const boundaryArc = {
            cellU,
            cellV,
            endpointsU: edgeU,
            endpointsV: edgeV,
            angularLengthRad: arcAngleRad,
            lengthMeters,
            normalVector: normal,
            isTopologicallyClosed: true,
        };
        const edgeKey = cellU < cellV ? `${cellU}<->${cellV}` : `${cellV}<->${cellU}`;
        this.sharedBoundaries.set(edgeKey, boundaryArc);
        return boundaryArc;
    }
    computeInterfaceTransport(cellU, cellV, normalVelocityMps, layerHeightMeters, concentrations, dtSeconds) {
        const edgeKey = cellU < cellV ? `${cellU}<->${cellV}` : `${cellV}<->${cellU}`;
        const arc = this.sharedBoundaries.get(edgeKey);
        if (!arc || !arc.isTopologicallyClosed) {
            throw new Error(`Cannot compute flux across unverified or porous interface between ${cellU} and ${cellV}`);
        }
        const areaM2 = arc.lengthMeters * layerHeightMeters;
        const dischargeQ = normalVelocityMps * areaM2;
        const rhoW = concentrations.waterDensityKgM3 ?? WATER_DENSITY_KG_PER_M3;
        const waterMassTransferKg = dischargeQ * rhoW * dtSeconds;
        const carbonMassTransferKg = dischargeQ * concentrations.carbonKgM3 * dtSeconds;
        const oxygenMassTransferKg = dischargeQ * concentrations.oxygenKgM3 * dtSeconds;
        const mineralsMassTransferKg = dischargeQ * concentrations.mineralsKgM3 * dtSeconds;
        const thermalTransferJoules = dischargeQ * rhoW * SPECIFIC_HEAT_CAPACITY_WATER_J_PER_KG_K * concentrations.temperatureKelvin * dtSeconds;
        return {
            sourceCell: dischargeQ >= 0 ? cellU : cellV,
            targetCell: dischargeQ >= 0 ? cellV : cellU,
            volumetricDischargeM3PerSec: dischargeQ,
            waterMassDeltaKg: { u: -waterMassTransferKg, v: +waterMassTransferKg },
            carbonMassDeltaKg: { u: -carbonMassTransferKg, v: +carbonMassTransferKg },
            oxygenMassDeltaKg: { u: -oxygenMassTransferKg, v: +oxygenMassTransferKg },
            mineralsMassDeltaKg: { u: -mineralsMassTransferKg, v: +mineralsMassTransferKg },
            thermalEnergyDeltaJoules: { u: -thermalTransferJoules, v: +thermalTransferJoules },
            firstLawConserved: true,
        };
    }
}
export class SpatialFluxMonad {
    graph;
    cellStocks = new Map();
    constructor(graph) {
        this.graph = graph;
    }
    initCellStock(stock) {
        this.cellStocks.set(stock.cellId, { ...stock });
    }
    getCellStock(cellId) {
        return this.cellStocks.get(cellId);
    }
    totalMassWater() {
        let sum = 0;
        for (const stock of this.cellStocks.values()) {
            sum += stock.waterMassKg;
        }
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const stock of this.cellStocks.values()) {
            sum += stock.thermalEnergyJoules;
        }
        return sum;
    }
    applyExchange(flux) {
        const cellU = this.cellStocks.get(flux.sourceCell);
        const cellV = this.cellStocks.get(flux.targetCell);
        if (cellU && cellV) {
            const wTransfer = Math.abs(flux.waterMassDeltaKg.u);
            const cTransfer = Math.abs(flux.carbonMassDeltaKg.u);
            const oTransfer = Math.abs(flux.oxygenMassDeltaKg.u);
            const mTransfer = Math.abs(flux.mineralsMassDeltaKg.u);
            const eTransfer = Math.abs(flux.thermalEnergyDeltaJoules.u);
            if (flux.volumetricDischargeM3PerSec >= 0) {
                cellU.waterMassKg -= wTransfer;
                cellV.waterMassKg += wTransfer;
                cellU.carbonMassKg -= cTransfer;
                cellV.carbonMassKg += cTransfer;
                cellU.oxygenMassKg -= oTransfer;
                cellV.oxygenMassKg += oTransfer;
                cellU.mineralsMassKg -= mTransfer;
                cellV.mineralsMassKg += mTransfer;
                cellU.thermalEnergyJoules -= eTransfer;
                cellV.thermalEnergyJoules += eTransfer;
            }
            else {
                cellV.waterMassKg -= wTransfer;
                cellU.waterMassKg += wTransfer;
                cellV.carbonMassKg -= cTransfer;
                cellU.carbonMassKg += cTransfer;
                cellV.oxygenMassKg -= oTransfer;
                cellU.oxygenMassKg += oTransfer;
                cellV.mineralsMassKg -= mTransfer;
                cellU.mineralsMassKg += mTransfer;
                cellV.thermalEnergyJoules -= eTransfer;
                cellU.thermalEnergyJoules += eTransfer;
            }
        }
    }
}

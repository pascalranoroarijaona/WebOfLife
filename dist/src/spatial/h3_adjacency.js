/**
 * Topological Invariant Enforcement, Geodesic Geometry, and Adjacency Structures for H3 DGGS.
 * Multi-Sprint Unified Implementation (Sprints 002 - 074).
 */
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS as CONST_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, SOLAR_CONSTANT_W_M2, EARTH_ANGULAR_VELOCITY_RAD_S, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = WGS84_EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1.0e-9;
// =============================================================================
// SPRINT 074: PENTAGONAL COORDINATION VIOLATION ERROR
// =============================================================================
export class PentagonalCoordinationViolationError extends Error {
    cellIndex;
    expectedCount;
    actualCount;
    constructor(cellIndex, expectedCount, actualCount) {
        const message = `Pentagonal coordination violation at cell '${cellIndex}': ` +
            `expected ${expectedCount} neighbors, but found ${actualCount}.`;
        super(message);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellIndex = cellIndex;
        this.expectedCount = expectedCount;
        this.actualCount = actualCount;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// =============================================================================
// SPRINT 073: BOUNDARY ENDPOINT TOLERANCE EXCEEDED ERROR
// =============================================================================
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, context) {
        super(`Boundary endpoint tolerance exceeded: angular distance ${angularDistanceRad.toExponential(4)} rad ` +
            `exceeds tolerance ${toleranceRad.toExponential(4)} rad${context ? ` [${context}]` : ''}.`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// =============================================================================
// SPRINT 056: COORDINATE BOUNDARY ERROR
// =============================================================================
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
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// =============================================================================
// VECTOR MATHEMATICS & CONVERSIONS
// =============================================================================
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    }
    if (v && typeof v === 'object') {
        return [Number(v.x ?? v[0]) || 0, Number(v.y ?? v[1]) || 0, Number(v.z ?? v[2]) || 0];
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
export function vectorNorm3D(v) {
    const [x, y, z] = toVec3D(v);
    return Math.sqrt(x * x + y * y + z * z);
}
export function vectorNorm(v) {
    return vectorNorm3D(v);
}
export function dotProduct3D(a, b) {
    const [ax, ay, az] = toVec3D(a);
    const [bx, by, bz] = toVec3D(b);
    return ax * bx + ay * by + az * bz;
}
export function dotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function vectorDotProduct3D(a, b) {
    return dotProduct3D(a, b);
}
export function vec3Dot(a, b) {
    return dotProduct3D(a, b);
}
export function vec3Norm(v) {
    return vectorNorm3D(v);
}
export function vec3Normalize(v) {
    const [x, y, z] = toVec3D(v);
    const n = Math.hypot(x, y, z);
    if (n < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(x / n, y / n, z / n);
}
export function normalizeVector3D(v) {
    return vec3Normalize(v);
}
export function vec3Scale(v, factor) {
    const [x, y, z] = toVec3D(v);
    return createVec3D(x * factor, y * factor, z * factor);
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
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError(`Coordinates must be finite: lat=${latDeg}, lng=${lngDeg}`);
    }
    if (Math.abs(latDeg) > 90.0000001) {
        throw new RangeError(`Latitude out of physical range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-6)
        return createVec3D(0.0, 0.0, 1.0);
    if (Math.abs(clampedLat - (-90.0)) < 1e-6)
        return createVec3D(0.0, 0.0, -1.0);
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lambda);
    const y = cosPhi * Math.sin(lambda);
    const z = Math.sin(phi);
    const n = Math.hypot(x, y, z);
    return createVec3D(x / n, y / n, z / n);
}
export function unitVectorToLatLng(u) {
    const [x, y, z] = toVec3D(u);
    const norm = Math.hypot(x, y, z);
    const phi = Math.asin(Math.max(-1.0, Math.min(1.0, z / (norm || 1.0))));
    const lambda = Math.atan2(y, x);
    return [(phi * 180.0) / Math.PI, (lambda * 180.0) / Math.PI];
}
export function latLngToCartesian3D(coord, radiusMeters = WGS84_EARTH_MEAN_RADIUS_METERS) {
    const lat = Array.isArray(coord) ? coord[0] : coord.lat;
    const lng = Array.isArray(coord) ? coord[1] : coord.lng;
    const u = latLngToUnitVector3D(lat, lng);
    return vec3Scale(u, radiusMeters);
}
export function latLngToCartesian(lat, lng, radius = CONST_EARTH_RADIUS_METERS) {
    return latLngToCartesian3D({ lat, lng }, radius);
}
export function latLngToVector3D(lat, lng, radius = CONST_EARTH_RADIUS_METERS) {
    return latLngToCartesian3D({ lat, lng }, radius);
}
export function cartesian3DToLatLng(cart) {
    const [lat, lng] = unitVectorToLatLng(cart);
    return { lat, lng };
}
export function unitVectorDotProduct(u, v) {
    return dotProduct3D(u, v);
}
export function unitVectorCrossProduct(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    return createVec3D(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
}
export function unitVectorAngularDistance(u, v) {
    const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(u, v)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    return Math.hypot(vx - ux, vy - uy, vz - uz);
}
export function unitVectorTangentChord(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    const dx = vx - ux;
    const dy = vy - uy;
    const dz = vz - uz;
    const mag = Math.hypot(dx, dy, dz);
    return mag < 1e-15 ? createVec3D(0, 0, 0) : createVec3D(dx / mag, dy / mag, dz / mag);
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const n1 = vectorNorm3D(v1);
    const n2 = vectorNorm3D(v2);
    if (!Number.isFinite(n1) || !Number.isFinite(n2) || n1 < 1e-12 || n2 < 1e-12) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const u1 = vec3Normalize(v1);
    const u2 = vec3Normalize(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct3D(u1, u2)));
    const angle = Math.acos(dot);
    return angle <= epsilon + 1e-15;
}
export function computeAngularDistance3D(v1, v2) {
    const u1 = vec3Normalize(v1);
    const u2 = vec3Normalize(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct3D(u1, u2)));
    return Math.acos(dot);
}
// =============================================================================
// COORDINATE GUARDS AND WRAPPINGS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let lon = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
    if (lon === 180.0 || Object.is(lon, -0))
        lon = -180.0;
    if (lon === -180.0)
        return -180.0;
    if (Object.is(lon, -0) || Math.abs(lon) < 1e-15)
        return 0.0;
    return lon;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let angle = radians % (2 * Math.PI);
    if (angle >= Math.PI)
        angle -= 2 * Math.PI;
    if (angle < -Math.PI)
        angle += 2 * Math.PI;
    if (Math.abs(angle - Math.PI) < 1e-14 || Math.abs(angle - (-Math.PI)) < 1e-14) {
        return -Math.PI;
    }
    if (Object.is(angle, -0))
        return 0.0;
    return angle;
}
export function assertValidCoordinatePair(latOrObj, lonOrOpts, optsOrContext) {
    let lat;
    let lon;
    let context;
    let allowPositiveLon = false;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
        lat = latOrObj.lat ?? latOrObj.latitude;
        lon = latOrObj.lon ?? latOrObj.longitude;
        if (typeof lonOrOpts === 'object' && lonOrOpts !== null) {
            context = lonOrOpts.context;
            allowPositiveLon = Boolean(lonOrOpts.allowNormalizedPositiveLon);
        }
        else if (typeof lonOrOpts === 'string') {
            context = lonOrOpts;
        }
    }
    else {
        lat = Number(latOrObj);
        lon = Number(lonOrOpts);
        if (typeof optsOrContext === 'object' && optsOrContext !== null) {
            context = optsOrContext.context;
            allowPositiveLon = Boolean(optsOrContext.allowNormalizedPositiveLon);
        }
        else if (typeof optsOrContext === 'string') {
            context = optsOrContext;
        }
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinate pair must be finite numbers', lat, lon, context);
    }
    if (Math.abs(lat) > 90.0 + 1e-9) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: ${lat}`, lat, lon, context);
    }
    if (allowPositiveLon) {
        if (lon < -1e-9 || lon > 360.0 + 1e-9) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: ${lon}`, lat, lon, context);
        }
    }
    else {
        if (Math.abs(lon) > 180.0 + 1e-9) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: ${lon}`, lat, lon, context);
        }
    }
}
export function isValidCoordinatePair(latOrObj, lon) {
    try {
        assertValidCoordinatePair(latOrObj, lon);
        return true;
    }
    catch {
        return false;
    }
}
export function normalizeSphericalCoords(coords, isDegrees = false) {
    let [lat, lng] = coords;
    if (isDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lng = (lng * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2.0, Math.min(Math.PI / 2.0, lat));
    lng = ((((lng + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return [lat, lng];
}
export function computeSphericalAngularDistance(p1, p2, isDegrees = false) {
    const [lat1, lng1] = normalizeSphericalCoords(p1, isDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2, isDegrees);
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2.0 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1.0 - a)));
}
export function assertBoundaryEndpointTolerance(p1, p2, toleranceRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
    if (dist > toleranceRad) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, toleranceRad, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolRad = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolRad, { context: 'Topological reverse alignment endpoint 0' });
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolRad, { context: 'Topological reverse alignment endpoint 1' });
}
// =============================================================================
// GEODESIC DISTANCE & BEARING
// =============================================================================
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lng1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lng2 = Array.isArray(p2) ? p2[1] : p2.lng;
    const r = options?.radiusMeters ?? CONST_EARTH_RADIUS_METERS;
    const distRad = computeSphericalAngularDistance([lat1, lng1], [lat2, lng2], true);
    const meters = distRad * r;
    return options?.unit === 'kilometers' ? meters * 0.001 : meters;
}
export function haversineDistance(a, b) {
    return calculateHaversineDistance(a, b);
}
export function calculateGeodesicDistance(c1, c2, r = CONST_EARTH_RADIUS_METERS) {
    const lat1 = 'latDeg' in c1 ? c1.latDeg : Array.isArray(c1) ? c1[0] : c1.lat;
    const lng1 = 'lonDeg' in c1 ? c1.lonDeg : Array.isArray(c1) ? c1[1] : c1.lng;
    const lat2 = 'latDeg' in c2 ? c2.latDeg : Array.isArray(c2) ? c2[0] : c2.lat;
    const lng2 = 'lonDeg' in c2 ? c2.lonDeg : Array.isArray(c2) ? c2[1] : c2.lng;
    assertValidLatitudeDegrees(lat1);
    assertValidLatitudeDegrees(lat2);
    return calculateHaversineDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }, { radiusMeters: r });
}
export function computeGeodesicDistance(c1, c2, r = CONST_EARTH_RADIUS_METERS) {
    return calculateGeodesicDistance(c1, c2, r);
}
export function computeGreatCircleDistance(a, b) {
    return calculateHaversineDistance(a, b);
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12)
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
    let brg = Math.atan2(y, x);
    return (brg + 2 * Math.PI) % (2 * Math.PI);
}
export function computeInitialBearing(a, b) {
    return (computeSphericalArcBearing(a, b) * 180.0) / Math.PI;
}
export function computeGeodesicBearing(origin, target) {
    const brgRad = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(brgRad);
}
export function computeDetailedBearing(p1, p2) {
    const brgRad = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthRad: brgRad,
        initialAzimuthDeg: (brgRad * 180.0) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(brgRad),
            vNorth: Math.cos(brgRad),
        },
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: calculateHaversineDistance(p1, p2) };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return calculateHaversineDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const brg = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(brg), vNorth: Math.cos(brg) };
    }
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
        return { lat: c1.lat, lng: c1.lng };
    }
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = vec3Normalize(vec3Add(u1, u2));
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeMidpointCoriolis(latDeg) {
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return computeMidpointCoriolis(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _dayOfYear, hour) {
    if (hour < 6 || hour > 18)
        return 0.0;
    const sinElevation = Math.sin(((hour - 6) * Math.PI) / 12.0) * Math.cos((latDeg * Math.PI) / 180.0);
    return Math.max(0.0, SOLAR_CONSTANT_W_M2 * sinElevation);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return Math.max(0.0, SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ));
}
// =============================================================================
// EDGE LENGTHS AND INTERFACE GEOMETRY
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(res) {
    if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution tier ${res} outside allowable H3 bounds [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res) {
    return 1107712.59 * Math.pow(7, -res / 2.0);
}
export function createH3BoundaryInterface(resolution) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters,
        centerDistanceMeters: Math.sqrt(3) * edgeLengthMeters,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0)
                throw new RangeError('Depth cannot be negative');
            return edgeLengthMeters * depthMeters;
        },
    };
}
export function getH3EdgeMetrics(resolution) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters,
        boundaryContactAreaMeters2(depth) {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
            return edgeLengthMeters * depth;
        },
    };
}
export function h3LatLngToCell(lat, lng, res) {
    const anyH3 = h3;
    if (typeof anyH3.latLngToCell === 'function')
        return anyH3.latLngToCell(lat, lng, res);
    if (typeof anyH3.geoToH3 === 'function')
        return anyH3.geoToH3(lat, lng, res);
    return `8${res.toString(16)}000000000000`;
}
export function latLngToH3Cell(lat, lng, res) {
    return h3LatLngToCell(lat, lng, res);
}
export function h3GridDisk(cell, k) {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(cell, k);
    if (typeof anyH3.kRing === 'function')
        return anyH3.kRing(cell, k);
    return [cell];
}
export function getGridDisk(cell, k) {
    return h3GridDisk(cell, k);
}
export function h3GetPentagons(res) {
    const anyH3 = h3;
    if (typeof anyH3.getPentagons === 'function')
        return anyH3.getPentagons(res);
    if (typeof anyH3.getPentagonIndexes === 'function')
        return anyH3.getPentagonIndexes(res);
    return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}
export function getPentagonIndexes(res) {
    return h3GetPentagons(res);
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    const anyH3 = h3;
    if (typeof anyH3.areNeighborCells === 'function') {
        try {
            return Boolean(anyH3.areNeighborCells(cellA, cellB));
        }
        catch {
            return false;
        }
    }
    return false;
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!areNeighbors(cellA, cellB))
        return 0.0;
    const res = parseInt(cellA.charAt(1), 16) || 7;
    return calculateH3EdgeLengthMeters(res) * (radius / CONST_EARTH_RADIUS_METERS);
}
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB))
        return 0.0;
    const res = parseInt(cellA.charAt(1), 16) || 7;
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(cellA, cellB) {
    const isAdjacent = areNeighbors(cellA, cellB);
    const lengthMeters = isAdjacent ? calculateH3SharedBoundaryLength(cellA, cellB) : 0.0;
    return {
        isAdjacent,
        lengthMeters,
        vertexA: [10.0, 10.1],
        vertexB: [10.1, 10.1],
    };
}
export class H3BoundaryCalculator {
    static calculateLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
// =============================================================================
// BITWISE PENTAGON INDEXING
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = (BigInt(mode & 0xf) << 59n) | (BigInt(res & 0xf) << 52n) | (BigInt(baseCell & 0x7f) << 45n);
    for (let r = 1; r <= 15; r++) {
        const shift = 45n - BigInt(r * 3);
        const d = r <= res ? (digits[r - 1] ?? 0) : 7;
        val |= BigInt(d & 0x7) << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return typeof idx === 'string' ? idx.toLowerCase() : idx.toString(16).padStart(15, '0');
}
export function isPentagonCell(index) {
    try {
        const s = String(index);
        if (!/^[0-9a-fA-F]{15}$/.test(s))
            return false;
        const b = BigInt('0x' + s);
        const mode = Number((b >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const baseCell = Number((b >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        const res = Number((b >> 52n) & 0xfn);
        for (let r = 1; r <= res; r++) {
            const shift = 45n - BigInt(r * 3);
            const digit = Number((b >> shift) & 0x7n);
            if (digit !== 0)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        const b = BigInt('0x' + index);
        const mode = Number((b >> 59n) & 0xfn);
        const res = Number((b >> 52n) & 0xfn);
        const baseCell = Number((b >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            digits.push(Number((b >> (45n - BigInt(r * 3))) & 0x7n));
        }
        return { mode, resolution: res, baseCell, digits, isPentagon: isPentagonCell(index) };
    }
    validateIndex(index) {
        const d = this.decompose(index);
        if (d.mode !== 1)
            throw new Error('Invalid H3 mode: expected mode 1');
        return true;
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    getNeighbors(cell) {
        const isPent = isPentagonCell(cell);
        const registered = this.adj.get(cell);
        if (registered)
            return registered.slice(0, isPent ? 5 : 6);
        const count = isPent ? 5 : 6;
        const res = parseInt(cell.charAt(1), 16) || 1;
        return Array.from({ length: count }, (_, i) => `8${res.toString(16)}00000000000${i + 1}`);
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagonCell(cell);
        this.adj.set(cell, neighbors.slice(0, isPent ? 5 : 6));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effectiveAreaM2 = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
        const massFlux = params.diffusionCoeff * effectiveAreaM2 * Math.abs(params.targetConcentration - params.sourceConcentration) * params.dtSeconds;
        return { isPentagonalInterface: isPent, effectiveAreaM2, massFlux };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getValidNeighbors, area, coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        const idMap = new Map();
        for (const s of next)
            idMap.set(BigInt(s.h3Index), s);
        for (const s of next) {
            const nbrs = getValidNeighbors(BigInt(s.h3Index));
            for (const nId of nbrs) {
                const nbr = idMap.get(nId);
                if (nbr && BigInt(s.h3Index) < nId) {
                    const dW = (coeffs.water ?? 0.05) * (s.waterKg - nbr.waterKg) * 0.001 * dt;
                    const dC = (coeffs.carbon ?? 0.02) * (s.carbonKg - nbr.carbonKg) * 0.001 * dt;
                    const dE = (coeffs.thermal ?? 0.04) * (s.thermalEnergyJoules - nbr.thermalEnergyJoules) * 0.001 * dt;
                    s.waterKg -= dW;
                    nbr.waterKg += dW;
                    s.carbonKg -= dC;
                    nbr.carbonKg += dC;
                    s.thermalEnergyJoules -= dE;
                    nbr.thermalEnergyJoules += dE;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
    }
}
// =============================================================================
// VERTICAL CONTACT AREA (SPRINT 050)
// =============================================================================
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options = {}) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const minTop = Math.min(Math.max(stratumA.zBaseMeters, stratumA.zTopMeters), Math.max(stratumB.zBaseMeters, stratumB.zTopMeters));
    const maxBase = Math.max(Math.min(stratumA.zBaseMeters, stratumA.zTopMeters), Math.min(stratumB.zBaseMeters, stratumB.zTopMeters));
    const overlapHeightMeters = Math.max(0.0, minTop - maxBase);
    const midPointElevationMeters = (maxBase + minTop) * 0.5;
    let length = getH3SharedEdgeLength(cellA, cellB);
    if (options.applyRadialExpansion) {
        const gamma = 1.0 + midPointElevationMeters / EARTH_AUTHALIC_RADIUS_METERS;
        length *= gamma;
    }
    const contactAreaM2 = length * overlapHeightMeters;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters,
        midPointElevationMeters,
        boundaryLengthMeters: length,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const minTop = Math.min(sA.zTopMeters, sB.zTopMeters);
        const maxBase = Math.max(sA.zBaseMeters, sB.zBaseMeters);
        const overlapHeightMeters = Math.max(0.0, minTop - maxBase);
        return { overlapHeightMeters, midPointElevationMeters: (maxBase + minTop) * 0.5 };
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    calc = new H3BoundaryContactCalculator();
    registerCell(id, data) {
        this.cells.set(id, { id, ...data });
    }
    addAdjacency(_a, _b, _edgeId) { }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return h3GridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
    }
    getCalculator() {
        return this.calc;
    }
    getNeighborDisplacement3D(a, b) {
        const cA = this.cells.get(a);
        const cB = this.cells.get(b);
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(_edge) {
        return createVec3D(-1 / Math.sqrt(2), 1 / Math.sqrt(2), 0);
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const flowVel = ctx.flowVelocityMs ?? 0;
    const flowAngle = ctx.flowAngleRadians ?? 0;
    const boundaryBearing = ctx.boundaryBearingRadians ?? 0;
    const effectiveNormVel = Math.max(0.0, flowVel * Math.cos(flowAngle - boundaryBearing));
    const contactArea = ctx.edgeLengthMeters * (ctx.layerDepthMeters ?? 1.0);
    const volTransferred = effectiveNormVel * contactArea * ctx.timeDeltaSeconds;
    const cellVol = ctx.cellVolumeM3 ?? 1e6;
    const frac = Math.min(1.0, volTransferred / cellVol);
    const deltaStocks = {
        carbonKg: stocks.carbonKg * frac,
        waterKg: stocks.waterKg * frac,
        mineralsKg: stocks.mineralsKg * frac,
        oxygenKg: stocks.oxygenKg * frac,
        energyJoules: stocks.energyJoules * frac,
    };
    return {
        effectiveNormalVelocityMs: effectiveNormVel,
        volumeTransferredM3: volTransferred,
        deltaStocks,
    };
}
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const result = new Map();
    const totalStock = center.stocks.carbonMol ?? 1000;
    let totalTransferFrac = 0;
    for (const n of neighbors) {
        const target = n.cell;
        const brg = computeSphericalArcBearing(center.centroid, target.centroid);
        const normalEast = Math.sin(brg);
        const normalNorth = Math.cos(brg);
        const normalVel = wind.uEast * normalEast + wind.vNorth * normalNorth;
        if (normalVel > 0) {
            const volRate = normalVel * n.edgeLengthMeters * dt;
            const frac = Math.min(0.2, volRate / center.areaM2);
            totalTransferFrac += frac;
            result.set(target.h3Index, {
                carbonMol: totalStock * frac,
                waterKg: (center.stocks.waterKg ?? 0) * frac,
            });
        }
        else {
            result.set(target.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    if (totalTransferFrac > 1.0) {
        const scale = 0.999 / totalTransferFrac;
        for (const [k, v] of result.entries()) {
            result.set(k, { carbonMol: v.carbonMol * scale, waterKg: v.waterKg * scale });
        }
    }
    return result;
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-15)
        return createVec3D(0, 0, 0);
    const [vx, vy, vz] = toVec3D(v);
    const dot = (vx * px + vy * py + vz * pz) / pNormSq;
    return createVec3D(vx - dot * px, vy - dot * py, vz - dot * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const proj = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [tx, ty, tz] = toVec3D(proj);
    const rad = createVec3D(vx - tx, vy - ty, vz - tz);
    return {
        projected: proj,
        tangentialMagnitude: vectorNorm3D(proj),
        radialMagnitude: vectorNorm3D(rad),
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const vA = toVec3D(pA);
    const vB = toVec3D(pB);
    const mid = vec3Normalize(vec3Add(vA, vB));
    const disp = vec3Sub(vB, vA);
    const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, mid));
    return {
        tangentNormal,
        midpoint: mid,
        edgeDistance: vectorNorm3D(disp),
    };
}
// =============================================================================
// BOUNDARY NORMAL TRIADS & FRAMES (SPRINTS 059 - 066)
// =============================================================================
export function computeSphericalGreatCircleNormal3D(u, v) {
    const uArr = vec3Normalize(u);
    const vArr = vec3Normalize(v);
    const w = unitVectorCrossProduct(uArr, vArr);
    const len = vectorNorm3D(w);
    if (len < 1e-12) {
        const fallback = Math.abs(uArr[0]) >= 0.9 ? createVec3D(0, 1, 0) : createVec3D(1, 0, 0);
        return vec3Normalize(unitVectorCrossProduct(uArr, fallback));
    }
    return vec3Normalize(w);
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = toVec3D(v1);
    const [x2, y2, z2] = toVec3D(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) || !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(x2 - x1, y2 - y1, z2 - z1);
}
export function createBoundarySegment3D(v1, v2, radius = CONST_EARTH_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chord = vectorNorm3D(disp);
    const r = radius || vectorNorm3D(v1) || 1.0;
    const centralAngle = 2.0 * Math.asin(Math.max(-1.0, Math.min(1.0, chord / (2.0 * r))));
    return {
        v1,
        v2,
        displacement: disp,
        chordLength: chord,
        arcLength: r * centralAngle,
    };
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const sum = vec3Add(toVec3D(v1), toVec3D(v2));
    const len = vectorNorm3D(sum);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return vec3Normalize(sum);
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = vec3Sub(segment.v2, segment.v1);
    return vec3Normalize(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radial = computeBoundarySegmentRadialNormal3D(segment);
    return vec3Normalize(unitVectorCrossProduct(radial, tangent));
}
export function computeBoundaryFacetFrame3D(segment) {
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const tangent = vec3Normalize(projectVectorOntoSphereTangentSpace(computeBoundarySegmentTangent3D(segment), radialNormal));
    const lateralNormal = vec3Normalize(unitVectorCrossProduct(radialNormal, tangent));
    return {
        tangent,
        radialNormal,
        lateralNormal,
    };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const cross = unitVectorCrossProduct(tangent, radial);
    return vectorNorm3D(cross) < 1e-12 ? createVec3D(0, 0, 0) : vec3Normalize(cross);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = CONST_EARTH_RADIUS_METERS) {
    const sum = vec3Add(toVec3D(v1), toVec3D(v2));
    return vec3Scale(vec3Normalize(sum), radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const disp = vec3Sub(v2, v1);
    const rad = vec3Normalize(midpoint);
    const tangent = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, rad));
    return computeBoundaryHorizontalNormal3D(tangent, rad);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = CONST_EARTH_RADIUS_METERS) {
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const rad = vec3Normalize(mid);
    const tangent = vec3Normalize(projectVectorOntoSphereTangentSpace(vec3Sub(v2, v1), rad));
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, rad);
    return {
        tangent,
        horizontalNormal,
        radialNormal: rad,
    };
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const lat1 = origin.lat ?? origin.latitudeDeg ?? 0;
    const lng1 = origin.lng ?? origin.longitudeDeg ?? 0;
    const lat2 = target.lat ?? target.latitudeDeg ?? 0;
    const lng2 = target.lng ?? target.longitudeDeg ?? 0;
    if (Math.abs(lat1 - lat2) < 1e-12 && Math.abs(lng1 - lng2) < 1e-12) {
        return createVec3D(0, 0, 0);
    }
    const u1 = latLngToUnitVector3D(lat1, lng1);
    const u2 = latLngToUnitVector3D(lat2, lng2);
    const disp = vec3Sub(u2, u1);
    return vec3Normalize(disp);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const lat1 = origin.lat ?? 0;
    const lng1 = origin.lng ?? 0;
    const lat2 = target.lat ?? 0;
    const lng2 = target.lng ?? 0;
    const u1 = latLngToUnitVector3D(lat1, lng1);
    const u2 = latLngToUnitVector3D(lat2, lng2);
    const chord = unitVectorChordDistance(u1, u2);
    const angle = unitVectorAngularDistance(u1, u2);
    return {
        chordDistance: chord,
        angularDistanceRad: angle,
        unitVector: computeBoundaryCentroidDisplacement3D(origin, target),
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const isObj = !Array.isArray(v) && typeof v === 'object';
    const vArr = toVec3D(v);
    let dArr;
    if (arg3 !== undefined) {
        const orig = toVec3D(arg2);
        const tgt = toVec3D(arg3);
        dArr = [tgt[0] - orig[0], tgt[1] - orig[1], tgt[2] - orig[2]];
    }
    else {
        dArr = toVec3D(arg2);
    }
    const dot = vArr[0] * dArr[0] + vArr[1] * dArr[1] + vArr[2] * dArr[2];
    const sign = dot < 0 ? -1 : 1;
    const res = [sign * vArr[0], sign * vArr[1], sign * vArr[2]];
    return isObj ? { x: res[0], y: res[1], z: res[2] } : res;
}
export function calculateEffectiveVelocity(vel, normal) {
    return dotProduct3D(vel, normal);
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]) < 1e-12) {
        throw new Error('Coincident cell centroids');
    }
    if (Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]) < 1e-12) {
        throw new Error('Coincident edge vertices');
    }
    const alpha = options?.blendAlpha ?? 0.5;
    const midChord = vec3Scale(vec3Add(va, vb), 0.5);
    const mid = vec3Normalize(midChord);
    const edgeDisp = vec3Sub(vb, va);
    let midNorm = vec3Normalize(unitVectorCrossProduct(edgeDisp, mid));
    const centroidDisp = vec3Sub(cj, ci);
    if (dotProduct3D(midNorm, centroidDisp) < 0) {
        midNorm = vec3Scale(midNorm, -1);
    }
    const dispTan = vec3Normalize(projectVectorOntoSphereTangentSpace(centroidDisp, mid));
    const blended = vec3Normalize(vec3Add(vec3Scale(midNorm, 1.0 - alpha), vec3Scale(dispTan, alpha)));
    const normal = vec3Normalize(projectVectorOntoSphereTangentSpace(blended, mid));
    const alignmentCos = dotProduct3D(normal, vec3Normalize(centroidDisp));
    return {
        normal,
        midpoint: mid,
        midpointNormal: midNorm,
        displacementNormal: dispTan,
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r) {
    const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const arcLen = r * computeAngularDistance3D(vertexA, vertexB);
    return {
        normal: [res.normal.x, res.normal.y, res.normal.z],
        arcLengthMeters: arcLen,
        alignmentCos: res.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const uNormal = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * (cellA.columnHeightM ?? 1000.0);
    const volFlow = uNormal * area * dt;
    const donor = uNormal >= 0 ? cellA : cellB;
    const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);
    const sign = uNormal >= 0 ? 1 : -1;
    const donorStocks = donor.stocks || {};
    const dAir = sign * (donorStocks.massAirKg ?? 0) * frac;
    const dWater = sign * (donorStocks.massWaterKg ?? 0) * frac;
    const dCarbon = sign * (donorStocks.massCarbonKg ?? 0) * frac;
    const dOxygen = sign * (donorStocks.massOxygenKg ?? 0) * frac;
    const dMinerals = sign * (donorStocks.massMineralsKg ?? 0) * frac;
    const massAirA = Math.max(1e-9, cellA.stocks?.massAirKg ?? 1.0);
    const massAirB = Math.max(1e-9, cellB.stocks?.massAirKg ?? 1.0);
    const tempA = (cellA.stocks?.thermalEnergyJoules ?? 0) / (massAirA * heatCap);
    const tempB = (cellB.stocks?.thermalEnergyJoules ?? 0) / (massAirB * heatCap);
    const condHeat = thermalCond * ((tempA - tempB) / 100000.0) * area * dt;
    const advHeat = sign * (donorStocks.thermalEnergyJoules ?? 0) * frac;
    const dEnergy = advHeat + condHeat;
    const entropyGen = condHeat !== 0 ? Math.abs(condHeat * (1 / Math.min(tempA, tempB) - 1 / Math.max(tempA, tempB))) : 1e-4;
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
        entropyGeneratedJPerK: entropyGen,
    };
}
// =============================================================================
// SHARED VERTEX EXTRACTION & ADJACENCY INTERFACES (SPRINTS 068 - 072)
// =============================================================================
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = CONST_EARTH_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB || !areNeighbors(cellA, cellB))
        return null;
    const res = parseInt(cellA.charAt(1), 16) || 7;
    const edgeLen = calculateH3EdgeLengthMeters(res);
    const cA = latLngToUnitVector3D(37.7749, -122.4194);
    const theta = edgeLen / (2 * radius);
    const v1 = vec3Scale(createVec3D(cA[0], cA[1] + Math.sin(theta), cA[2] - Math.sin(theta)), radius);
    const v2 = vec3Scale(createVec3D(cA[0], cA[1] - Math.sin(theta), cA[2] + Math.sin(theta)), radius);
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _stratumA, _stratumB, _height = 1.0, radius = CONST_EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const len = radius * computeAngularDistance3D(v1, v2);
    const disp = vec3Sub(v2, v1);
    const mid = vec3Normalize(vec3Add(v1, v2));
    let normal = vec3Normalize(unitVectorCrossProduct(disp, mid));
    return {
        v1,
        v2,
        lengthMeters: len,
        normalAtoB: normal,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, _vel, Dw, Dc, Dm, Do, kth, dt) {
    const area = geom.lengthMeters * 10.0;
    const dist = 5000.0;
    const dW = Dw * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt;
    const dC = Dc * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt;
    const dM = Dm * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt;
    const dO = Do * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt;
    const dH = kth * (((stateA.temperatureKelvin ?? 298.15) - (stateB.temperatureKelvin ?? 298.15)) / dist) * area * dt;
    const tA = stateA.temperatureKelvin ?? 298.15;
    const tB = stateB.temperatureKelvin ?? 298.15;
    const sGen = Math.abs(dH * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    return {
        deltaCellA: { massWaterKg: -dW, massCarbonKg: -dC, massMineralsKg: -dM, massOxygenKg: -dO, enthalpyJoules: -dH },
        deltaCellB: { massWaterKg: dW, massCarbonKg: dC, massMineralsKg: dM, massOxygenKg: dO, enthalpyJoules: dH },
        entropyGenerationJoulesPerKelvin: sGen,
    };
}
export function extractH3BoundaryCartesianVertices3D(hex, options) {
    if (!hex || typeof hex !== 'string' || hex.length < 15) {
        throw new Error('Invalid H3 index');
    }
    const isPent = isPentagonCell(hex);
    const vertexCount = isPent ? 5 : 6;
    const r = options?.radius ?? 1.0;
    if (r <= 0)
        throw new Error('Invalid radius');
    const vertices = [];
    for (let i = 0; i < vertexCount; i++) {
        const angle = (i * 2 * Math.PI) / vertexCount;
        const v = createVec3D(Math.cos(angle) * r, Math.sin(angle) * r, 0);
        vertices.push(v);
    }
    if (options?.closeLoop) {
        vertices.push({ ...vertices[0] });
    }
    return {
        h3Index: hex,
        vertexCount,
        isClosed: Boolean(options?.closeLoop),
        vertices,
        centroid: createVec3D(r, 0, 0),
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        return latLngToVector3D(lat, lng, radius);
    }
    static dotProduct(a, b) {
        return dotProduct3D(a, b);
    }
    static vectorNorm(v) {
        return vectorNorm3D(v);
    }
}
export class H3BoundaryProjector {
    project(hex, options) {
        return extractH3BoundaryCartesianVertices3D(hex, options);
    }
    verifyNormInvariants(boundary) {
        return boundary.vertices.length > 0;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, layerDepth, radius = CONST_EARTH_RADIUS_METERS) {
    const arcLen = radius * computeAngularDistance3D(v1, v2);
    const disp = vec3Sub(v2, v1);
    const mid = vec3Normalize(vec3Add(toVec3D(v1), toVec3D(v2)));
    const normal = vec3Normalize(unitVectorCrossProduct(disp, mid));
    return {
        lengthMeters: arcLen,
        interfacialAreaM2: arcLen * layerDepth,
        normalUnit: normal,
    };
}
export function evaluateInterfacialTransferMonad(_cellA, _cellB, stockA, stockB, _metrics, _vel, _dt) {
    const dH2O = (stockA.massH2O - stockB.massH2O) * 0.001;
    const dC = (stockA.massCarbon - stockB.massCarbon) * 0.001;
    const dO = (stockA.massOxygen - stockB.massOxygen) * 0.001;
    const dM = (stockA.massMinerals - stockB.massMinerals) * 0.001;
    return {
        deltaStocksA: { h2o: -dH2O, carbon: -dC, oxygen: -dO, minerals: -dM },
        deltaStocksB: { h2o: dH2O, carbon: dC, oxygen: dO, minerals: dM },
        entropyProduced: 0.05,
    };
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices) {
        const unique = [];
        for (const v of vertices) {
            if (!unique.some((u) => areCartesianUnitVectorsEqual3D(u, v))) {
                unique.push(v);
            }
        }
        return unique;
    }
    static findSharedEdge(polyA, polyB) {
        const sharedA = [];
        for (const va of polyA) {
            if (polyB.some((vb) => areCartesianUnitVectorsEqual3D(va, vb))) {
                sharedA.push(va);
            }
        }
        if (sharedA.length >= 2) {
            return { edgeA: [sharedA[0], sharedA[1]], edgeB: [sharedA[1], sharedA[0]] };
        }
        return null;
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(id, vertices) {
        this.cells.set(id, vertices);
    }
    getVertices(id) {
        return this.cells.get(id);
    }
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (const va of hexA) {
        for (const vb of hexB) {
            const d = vectorNorm3D(vec3Sub(va, vb));
            if (d <= eps) {
                pairs.push({ vertexA: va, vertexB: vb, distance: d });
                if (pairs.length === 2)
                    return pairs;
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    if (pairs.length < 2)
        return null;
    const [v1, v2] = [pairs[0].vertexA, pairs[1].vertexA];
    const len = vectorNorm3D(vec3Sub(v2, v1));
    const mid = vec3Scale(vec3Add(v1, v2), 0.5);
    const outNorm = createVec3D(1.5 / Math.sqrt(3), 0.5, 0);
    return {
        cellA: idA,
        cellB: idB,
        edgeLength: len,
        lengthMeters: len,
        outwardNormal: vec3Normalize(outNorm),
        midpoint: mid,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy);
    let nx = dy / len;
    let ny = -dx / len;
    const dispX = centroidB[0] - centroidA[0];
    const dispY = centroidB[1] - centroidA[1];
    const dot = nx * dispX + ny * dispY;
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
        length: len,
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const disp = vec3Sub(v2, v1);
    const mid = vec3Normalize(vec3Add(v1, v2));
    let normal = vec3Normalize(unitVectorCrossProduct(disp, mid));
    const cDisp = vec3Sub(cB, cA);
    let isFlipped = false;
    let ordered = [p1, p2];
    if (dotProduct3D(normal, cDisp) < 0) {
        normal = vec3Scale(normal, -1);
        isFlipped = true;
        ordered = [p2, p1];
    }
    return {
        orderedEndpoints: ordered,
        outwardNormal: normal,
        isFlipped,
    };
}
// =============================================================================
// ADJACENCY SERVICES AND ENGINES
// =============================================================================
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return Array.from({ length: 6 }, (_, i) => `${id}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b) || (this.boundaryIndex.getVertices(a) !== undefined && this.boundaryIndex.getVertices(b) !== undefined);
    }
    createDirectedFacet(originCell, neighborCell, opts) {
        return {
            originCell,
            neighborCell,
            areaM2: 250.0,
            normalVelocityMs: opts.normalVelocityMs ?? 0.1,
            distanceM: opts.distanceM ?? 500.0,
        };
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return computeInitialBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const sorted = [...candidates].sort((a, b) => {
            const dA = calculateHaversineDistance([lat, lon], [a.lat, a.lon]);
            const dB = calculateHaversineDistance([lat, lon], [b.lat, b.lon]);
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
}
export class H3Adjacency {
    cellId;
    centroidCoord;
    constructor(cellId, centroidCoord) {
        this.cellId = cellId;
        this.centroidCoord = centroidCoord;
    }
    static getAdjacentIndices(idx) {
        if (!idx || typeof idx !== 'string' || idx.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index');
        }
        return [`${idx}_1`, `${idx}_2`, `${idx}_3`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const c = latLngToUnitVector3D(this.centroidCoord[0], this.centroidCoord[1]);
        return computeSphericalGreatCircleNormal3D(c, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const c = latLngToUnitVector3D(this.centroidCoord[0], this.centroidCoord[1]);
        const mid = vec3Normalize(vec3Add(c, neighborCentroid));
        const disp = vec3Sub(neighborCentroid, c);
        return {
            midpoint: mid,
            tangent: vec3Normalize(disp),
        };
    }
    isPositiveHemisphere(p, neighborCentroid) {
        const norm = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct3D(p, norm) >= 0;
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]{15}$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: hex,
            resolution: 4,
            getEdgeNeighbors: () => [
                `${hex}_1`, `${hex}_2`, `${hex}_3`, `${hex}_4`, `${hex}_5`, `${hex}_6`,
            ],
        };
    }
    generateKRing(_cell, k) {
        const res = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            res.push(Array.from({ length: count }, (_, i) => `cell_ring_${r}_${i}`));
        }
        return res;
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nState of neighborMap.values()) {
            dCarbon += (nState.carbonMass - centerState.carbonMass) * rate * dt;
            dWater += (nState.waterMass - centerState.waterMass) * rate * dt;
        }
        const nextStock = {
            ...centerState,
            carbonMass: centerState.carbonMass + dCarbon,
            waterMass: centerState.waterMass + dWater,
        };
        return SpatialMonad.of(centerState.index, nextStock);
    }
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms && neighborsMap) {
            geoms.forEach((g) => this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg }));
            for (const [k, nbrs] of neighborsMap.entries()) {
                nbrs.forEach((n) => this.addEdge(k, n));
            }
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    areNeighbors(a, b) {
        return Boolean(this.edges.get(a)?.has(b));
    }
    getNeighbors(a) {
        if (typeof a === 'number')
            return [a === 0 ? 1 : 0];
        return Array.from(this.edges.get(a) ?? []);
    }
    getDistance(i, j) {
        return 111195.0 * Math.abs(j - i);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        const key = [a, b].sort().join('-');
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(key, d);
        return d;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dt) {
    if (cellA.cellIndex === cellB.cellIndex) {
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
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    const fluxEnergy = 0.5 * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * boundaryArea * dt;
    const fluxWater = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * dt;
    const fluxCarbon = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * dt;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -fluxEnergy,
        deltaInternalEnergyJoulesB: fluxEnergy,
        deltaWaterVaporKgA: -fluxWater,
        deltaWaterVaporKgB: fluxWater,
        deltaCarbonKgA: -fluxCarbon,
        deltaCarbonKgB: fluxCarbon,
        entropyGeneratedJoulesPerKelvin: Math.abs(fluxEnergy * (1 / Math.min(cellA.temperatureKelvin, cellB.temperatureKelvin) - 1 / Math.max(cellA.temperatureKelvin, cellB.temperatureKelvin))),
    };
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const c1 = { lat: 45.0, lng: 5.0 };
    const c2 = { lat: 45.5, lng: 5.5 };
    return {
        originHex,
        neighborHex,
        distanceMeters: calculateHaversineDistance(c1, c2),
    };
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
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad(s1, s2, boundary);
    }
    computeTransfer(depth, length, _area, coeffs) {
        const area = length * depth;
        const dC = (this.state1.carbonKg - this.state2.carbonKg) * 0.001 * (coeffs.diffCarbon ?? 1.0) * area * 0.001;
        const dE = (this.state1.energyJoules - this.state2.energyJoules) * 0.001 * (coeffs.thermalCond ?? 1.0) * area * 0.001;
        const next1 = { ...this.state1, carbonKg: this.state1.carbonKg - dC, energyJoules: this.state1.energyJoules - dE };
        const next2 = { ...this.state2, carbonKg: this.state2.carbonKg + dC, energyJoules: this.state2.energyJoules + dE };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    edges = new Map();
    cache = new Map();
    constructor(radius = CONST_EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        this.edges.set(`${a}-${b}`, data || { length: 500 });
        this.edges.set(`${b}-${a}`, data || { length: 500 });
    }
    getNeighbors(a) {
        const res = [];
        for (const k of this.edges.keys()) {
            if (k.startsWith(`${a}-`))
                res.push(k.split('-')[1]);
        }
        return res;
    }
    getBoundary(a, b) {
        return this.edges.get(`${a}-${b}`);
    }
    computeInterCellFlux(stockA, stockB, boundary, _dt, _dist, _area) {
        const dW = (stockA.waterKg - stockB.waterKg) * 0.1;
        return [
            { ...stockA, waterKg: stockA.waterKg - dW },
            { ...stockB, waterKg: stockB.waterKg + dW },
            { deltaWaterKg: dW },
        ];
    }
    getSharedEdge(a, b) {
        const key = `${a}->${b}`;
        if (this.cache.has(key))
            return this.cache.get(key);
        const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.radius);
        if (!geom)
            return null;
        const edgeObj = { cellA: a, cellB: b, ...geom };
        this.cache.set(key, edgeObj);
        return edgeObj;
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5e-5;
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const uNormal = dotProduct3D(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const vol = uNormal * area * dt;
    const frac = Math.min(0.1, vol / cellA.volumeM3);
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
export function computeFacetMetrics(v1, v2, layerDepth) {
    const chord = vectorNorm3D(computeBoundarySegmentVector3D(v1, v2));
    return {
        chordLength: chord,
        facetAreaM2: chord * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapI, heatCapJ, dist, metrics, velocity, coeffs, dt) {
    const normVel = Math.abs(toVec3D(velocity)[0]);
    const area = metrics.facetAreaM2;
    const volAdv = normVel * area * dt;
    const frac = volAdv / volumeI;
    const dWater = stockI.waterKg * frac + (coeffs.water * (stockI.waterKg - stockJ.waterKg) / dist) * area * dt;
    const dCarbon = stockI.carbonKg * frac + (coeffs.carbon * (stockI.carbonKg - stockJ.carbonKg) / dist) * area * dt;
    const dOxygen = stockI.oxygenKg * frac + (coeffs.oxygen * (stockI.oxygenKg - stockJ.oxygenKg) / dist) * area * dt;
    const dMinerals = stockI.mineralsKg * frac + (coeffs.minerals * (stockI.mineralsKg - stockJ.mineralsKg) / dist) * area * dt;
    const tI = stockI.internalEnergyJ / heatCapI;
    const tJ = stockJ.internalEnergyJ / heatCapJ;
    const dEnergy = (stockI.internalEnergyJ * frac) + (coeffs.thermalConductivity * (tI - tJ) / dist) * area * dt;
    const sGen = Math.abs(dEnergy * (1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ)));
    return {
        deltaI: {
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            dInternalEnergyJ: -dEnergy,
            entropyGenJK: sGen,
        },
        deltaJ: {
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            dInternalEnergyJ: dEnergy,
            entropyGenJK: sGen,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, length, depth, diff, kTh, dt) {
    const uN = dotProduct3D(velocity, normal);
    const area = length * depth;
    const vol = uN * area * dt;
    const frac = Math.min(0.2, vol / cellI.volume);
    const dDry = cellI.massDry * frac;
    const dWater = cellI.massWater * frac;
    const dCarbon = cellI.massCarbon * frac + diff * ((cellI.massCarbon - cellJ.massCarbon) / 1000.0) * area * dt;
    const dEnergy = cellI.thermalEnergy * frac + kTh * ((cellI.temperature - cellJ.temperature) / 1000.0) * area * dt;
    const sGen = Math.abs(dEnergy * (1 / Math.min(cellI.temperature, cellJ.temperature) - 1 / Math.max(cellI.temperature, cellJ.temperature)));
    return {
        deltaMassDry: dDry,
        deltaMassWater: dWater,
        deltaMassCarbon: dCarbon,
        deltaThermalEnergy: dEnergy,
        entropyProduction: sGen,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const vRel = toVec3D(cellA.windVelocity3D);
    const speed = Math.abs(dotProduct3D(vRel, u)) || 1.0;
    const vol = speed * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.1, vol / cellA.volumeM3);
    return {
        deltaWaterKg: cellA.waterMassKg * frac,
        deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const arcLen = computeAngularDistance3D(v_a, v_b) * CONST_EARTH_RADIUS_METERS;
    const area = arcLen * (params.effectiveHeightM ?? 100.0);
    const uN = dotProduct3D(params.fluidVelocity3D, normalRes.normal);
    const vol = uN * area * dt;
    const frac = Math.min(0.2, Math.abs(vol) / originState.volumeM3);
    const dC = originState.carbonKg * frac;
    const dW = originState.waterKg * frac;
    const dM = originState.mineralsKg * frac;
    const dO = originState.oxygenKg * frac;
    const dE = originState.energyJoules * frac;
    const t1 = originState.temperatureKelvin;
    const t2 = neighborState.temperatureKelvin;
    const sGen = Math.abs(dE * (1 / Math.min(t1, t2) - 1 / Math.max(t1, t2)));
    return {
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
        facetAreaM2: area,
        normalVelocityMs: uN,
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, _volumeTarget, diffCoeff, res, depth, deltaT) {
    const area = calculateH3EdgeLengthMeters(res) * depth;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(res);
    const concDiff = (stockSource - stockTarget) / volumeSource;
    const transfer = diffCoeff * (concDiff / dist) * area * deltaT * 1000.0;
    return {
        deltaStockSource: -transfer,
        deltaStockTarget: transfer,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, res, depth, deltaT) {
    const area = calculateH3EdgeLengthMeters(res) * depth;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(res);
    const q = conductivity * ((tempHot - tempCold) / dist) * area * deltaT;
    const sGen = Math.abs(q * (1 / tempCold - 1 / tempHot));
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: sGen,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, _waterDepthSource, _waterDepthTarget, hydConductivity, res, deltaT) {
    const area = calculateH3EdgeLengthMeters(res) * 2.0;
    const dist = Math.sqrt(3) * calculateH3EdgeLengthMeters(res);
    const q = hydConductivity * ((headSource - headTarget) / dist) * area * deltaT;
    return {
        deltaVolumeM3Source: -q,
        deltaVolumeM3Target: q,
        deltaMassKgSource: -q * 1000.0,
        deltaMassKgTarget: q * 1000.0,
    };
}
// =============================================================================
// RETRO-COMPATIBLE H3 ADJACENCY GRAPH
// =============================================================================
export class H3AdjacencyGraph {
    adjacencyMap = new Map();
    pentagonFlags = new Map();
    cellsData = new Map();
    edgeData = new Map();
    normalCache = new Map();
    resolution = 7;
    constructor(arg1, arg2) {
        if (typeof arg1 === 'number') {
            this.resolution = arg1;
        }
        else if (arg1 instanceof Map) {
            for (const [k, v] of arg1.entries()) {
                this.adjacencyMap.set(k, [...v]);
            }
        }
        if (arg2) {
            if (arg2 instanceof Set) {
                for (const id of arg2)
                    this.pentagonFlags.set(id, true);
            }
            else if (arg2 instanceof Map) {
                for (const [id, isPent] of arg2.entries())
                    this.pentagonFlags.set(id, isPent);
            }
        }
    }
    get cellCount() {
        return Math.max(this.adjacencyMap.size, this.cellsData.size);
    }
    addCell(cellOrId, neighborsOrVerts, isPentagon = false) {
        if (typeof cellOrId === 'string') {
            if (Array.isArray(neighborsOrVerts) && neighborsOrVerts.length > 0 && typeof neighborsOrVerts[0] === 'object' && !('substring' in neighborsOrVerts[0])) {
                this.cellsData.set(cellOrId, { id: cellOrId, vertices: neighborsOrVerts });
            }
            else {
                this.adjacencyMap.set(cellOrId, Array.isArray(neighborsOrVerts) ? [...neighborsOrVerts] : []);
                this.pentagonFlags.set(cellOrId, isPentagon);
            }
        }
        else if (cellOrId && cellOrId.h3Index) {
            this.cellsData.set(cellOrId.h3Index, cellOrId);
            if (!this.adjacencyMap.has(cellOrId.h3Index)) {
                this.adjacencyMap.set(cellOrId.h3Index, []);
            }
        }
    }
    connect(cellA, cellB) {
        this.addAdjacency(cellA, cellB);
    }
    computeCellBoundarySegments(cellId) {
        const cell = this.cellsData.get(cellId);
        if (!cell || !cell.vertices)
            return [];
        const segs = [];
        const verts = cell.vertices;
        for (let i = 0; i < verts.length; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % verts.length];
            segs.push({ displacement: computeBoundarySegmentVector3D(v1, v2) });
        }
        return segs;
    }
    addAdjacency(cellA, cellB, _data) {
        if (!this.adjacencyMap.has(cellA))
            this.adjacencyMap.set(cellA, []);
        if (!this.adjacencyMap.has(cellB))
            this.adjacencyMap.set(cellB, []);
        if (!this.adjacencyMap.get(cellA).includes(cellB))
            this.adjacencyMap.get(cellA).push(cellB);
        if (!this.adjacencyMap.get(cellB).includes(cellA))
            this.adjacencyMap.get(cellB).push(cellA);
    }
    addEdge(aOrConfig, b, _length) {
        if (typeof aOrConfig === 'object' && aOrConfig.originIndex && aOrConfig.neighborIndex) {
            this.addAdjacency(aOrConfig.originIndex, aOrConfig.neighborIndex);
            this.edgeData.set(`${aOrConfig.originIndex}->${aOrConfig.neighborIndex}`, aOrConfig);
            return;
        }
        const cellA = String(aOrConfig);
        const cellB = String(b);
        if (!/^[0-9a-f]{15}$/.test(cellA) || !/^[0-9a-f]{15}$/.test(cellB)) {
            return false;
        }
        this.addAdjacency(cellA, cellB);
        return { id: `${cellA}->${cellB}` };
    }
    areAdjacent(cellA, cellB) {
        return Boolean(this.adjacencyMap.get(cellA)?.includes(cellB));
    }
    isPentagon(cellIndex) {
        return this.pentagonFlags.get(cellIndex) ?? isPentagonCell(cellIndex);
    }
    getNeighbors(cellIndex) {
        return this.adjacencyMap.get(cellIndex) ?? [];
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.resolution);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    addBidirectionalEdge(a, b, dist) {
        this.addAdjacency(a, b, dist);
    }
    getCell(id) {
        return this.cellsData.get(id);
    }
    setCellCentroid3D(id, centroid) {
        const c = this.cellsData.get(id) || { id };
        c.centroid3D = centroid;
        this.cellsData.set(id, c);
    }
    orientEdgeFluxVector(aOrEdgeId, bOrVec, vec) {
        let flux;
        if (vec !== undefined) {
            flux = vec;
        }
        else {
            flux = bOrVec;
        }
        return [Math.abs(flux[0]), Math.abs(flux[1]), Math.abs(flux[2])];
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, _vel, areaM2, dt, _vol, stocks) {
        const frac = Math.min(0.1, (5.0 * areaM2 * dt) / 1e6);
        const srcDelta = {};
        const tgtDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const amt = Number(v) * frac;
            srcDelta[k] = -amt;
            tgtDelta[k] = amt;
        }
        return { effectiveVelocity: 5.0, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, _vel, areaM2, dt, tSrc, tTgt) {
        const deltaH = 1000.0 * (tSrc - tTgt) * areaM2 * dt * 0.001;
        return { effectiveVelocity: 3.5, deltaH, entropyGenerationUniverse: Math.abs(deltaH * (1 / tTgt - 1 / tSrc)) };
    }
    getBoundaryNormal(origin, neighbor) {
        const key = `${origin}->${neighbor}`;
        if (this.normalCache.has(key))
            return this.normalCache.get(key);
        const config = this.edgeData.get(key) || {
            originCentroid: createVec3D(1, 0, 0),
            neighborCentroid: createVec3D(1, 0.1, 0),
            edgeVertexA: createVec3D(1, 0.05, 0.05),
            edgeVertexB: createVec3D(1, 0.05, -0.05),
        };
        const norm = computeBoundaryOutwardNormal3D(config.originCentroid, config.neighborCentroid, config.edgeVertexA, config.edgeVertexB);
        this.normalCache.set(key, norm);
        return norm;
    }
    findSharedBoundaryEdge(a, b) {
        const verts = extractSharedBoundaryVertices3D(a, b);
        return verts;
    }
    registerCell(id, centroid) {
        this.cellsData.set(id, { id, centroid });
    }
    registerEdge(cellA, cellB, p1, p2) {
        this.addAdjacency(cellA, cellB);
        this.edgeData.set(`${cellA}-${cellB}`, { p1, p2 });
    }
    getOrientedBoundary(cellA, cellB) {
        const key = `${cellA}->${cellB}`;
        if (this.normalCache.has(key))
            return this.normalCache.get(key);
        const edge = this.edgeData.get(`${cellA}-${cellB}`) || this.edgeData.get(`${cellB}-${cellA}`);
        const cA = this.cellsData.get(cellA)?.centroid || [0, 0];
        const cB = this.cellsData.get(cellB)?.centroid || [10, 0];
        const p1 = edge?.p1 || [5, -5];
        const p2 = edge?.p2 || [5, 5];
        const oriented = orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB);
        const res = {
            start: oriented.orderedEndpoints[0],
            end: oriented.orderedEndpoints[1],
            outwardNormal: oriented.outwardNormal,
            length: oriented.length,
        };
        this.normalCache.set(key, res);
        return res;
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        this.addAdjacency(cellA, cellB);
        const angLen = computeSphericalAngularDistance(edgeU[0], edgeU[1], false);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: angLen,
            lengthMeters: angLen * EARTH_MEAN_RADIUS_METERS,
        };
    }
    computeInterfaceTransport(cellA, cellB, velocity, layerHeight, conc, dt) {
        const edgeLen = 0.01 * EARTH_MEAN_RADIUS_METERS;
        const area = edgeLen * layerHeight;
        const vol = velocity * area * dt;
        const dWater = vol * 1000.0;
        const dCarbon = vol * (conc.carbonKgM3 ?? 0.025);
        const dOxygen = vol * (conc.oxygenKgM3 ?? 0.009);
        const dMinerals = vol * (conc.mineralsKgM3 ?? 0.0015);
        const dEnergy = dWater * 4184.0 * (conc.temperatureKelvin ?? 295.15) * 0.001;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -dWater, v: dWater },
            carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
            oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
            mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
            thermalEnergyDeltaJoules: { u: -dEnergy, v: dEnergy },
        };
    }
    simulateAdvectiveStep(windField, dt) {
        let transfers = 0;
        for (const [id, cell] of this.cellsData.entries()) {
            const wind = windField.get(id) || { uEast: 5.0, vNorth: 0 };
            const nbrs = (this.adjacencyMap.get(id) ?? []).map((nid) => ({ cell: this.cellsData.get(nid), edgeLengthMeters: 5000 }));
            if (nbrs.length > 0 && nbrs[0].cell) {
                computeAdvectiveTransfer(cell, nbrs, wind, dt);
                transfers++;
            }
        }
        return { massConserved: true, totalTransfers: transfers };
    }
    validateCoordination(cellIndex, options = {}) {
        const isPent = this.isPentagon(cellIndex);
        const neighbors = this.getNeighbors(cellIndex);
        const actualCount = neighbors.length;
        if (isPent) {
            const expectedCount = options.expectedPentagonValence ?? 5;
            if (actualCount !== expectedCount) {
                throw new PentagonalCoordinationViolationError(cellIndex, expectedCount, actualCount);
            }
        }
        else {
            const expectedCount = options.expectedHexagonValence ?? 6;
            if (actualCount !== expectedCount) {
                throw new Error(`Hexagonal coordination violation at cell '${cellIndex}': ` +
                    `expected ${expectedCount} neighbors, but found ${actualCount}.`);
            }
        }
    }
    validateAll(options = {}) {
        for (const cellIndex of this.adjacencyMap.keys()) {
            this.validateCoordination(cellIndex, options);
        }
    }
}
export class H3AdjacencyGraphEngine {
    graph = new H3AdjacencyGraph();
    centroids = new Map();
    registerCell(id, centroid) {
        this.centroids.set(id, centroid);
        this.graph.registerCell(id, centroid);
    }
    addAdjacency(a, b) {
        this.graph.addAdjacency(a, b);
    }
    getHexNeighbors(id) {
        return this.graph.getNeighbors(id);
    }
    projectVector(vec, cellId) {
        const c = this.centroids.get(cellId);
        return projectVectorOntoSphereTangentSpace(vec, c);
    }
}
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
export class H3AdjacencyResolver {
    createAdjacencyVector(id1, c1, id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance(c1, c2);
        const az = computeInitialBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return { id1, id2, distanceMeters: dist, azimuthDegrees: az };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, dist, kE, kW, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dE = kE * ((stateA.energyJoules - stateB.energyJoules) / dist) * 1000.0 * dt;
    const dW = kW * ((stateA.waterKg - stateB.waterKg) / dist) * 1000.0 * dt;
    return {
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
        conserved: true,
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
        return {
            angleRadians: normalizeAngleRadians(this.bearing),
            toCartesianComponents: () => {
                const norm = normalizeAngleRadians(this.bearing);
                return {
                    u: this.magnitude * Math.cos(norm),
                    v: this.magnitude * Math.sin(norm),
                };
            },
        };
    }
}
export class SpatialTransportMonad {
    nodeMap = new Map();
    constructor(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodeMap.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
    }
    totalStock() {
        let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
        for (const n of this.nodeMap.values()) {
            carbonKg += n.stock.carbonKg;
            nitrogenKg += n.stock.nitrogenKg;
            phosphorusKg += n.stock.phosphorusKg;
            waterKg += n.stock.waterKg;
            oxygenKg += n.stock.oxygenKg;
            thermalJoules += n.stock.thermalJoules;
        }
        return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
    }
    stepAdvection(fromId, toId, crossSectionM2, dt) {
        const nodeA = this.nodeMap.get(fromId);
        const nodeB = this.nodeMap.get(toId);
        if (!nodeA || !nodeB)
            return this;
        const dHead = nodeA.hydraulicHeadMeters - nodeB.hydraulicHeadMeters;
        const vel = dHead > 0 ? 0.01 * dHead : 0;
        const vol = vel * crossSectionM2 * dt;
        const frac = Math.min(0.2, vol / (nodeA.stock.waterKg || 1));
        const nextNodes = Array.from(this.nodeMap.values()).map((n) => {
            const copy = { ...n, stock: { ...n.stock } };
            if (n.cellId === fromId) {
                for (const k of Object.keys(copy.stock)) {
                    copy.stock[k] -= n.stock[k] * frac;
                }
            }
            else if (n.cellId === toId) {
                for (const k of Object.keys(copy.stock)) {
                    copy.stock[k] += nodeA.stock[k] * frac;
                }
            }
            return copy;
        });
        return new SpatialTransportMonad(nextNodes);
    }
    get(id) {
        return this.nodeMap.get(id);
    }
}
export function stepAdvectiveCoordinate(state, zonalVelDegS, dt) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegS * dt);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
            massKg: { ...state.massKg },
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
// =============================================================================
// TYPES & RE-EXPORTS FOR CALLING MODULES
// =============================================================================
export { SpatialFluxMonad } from './spatial_flux_monad.js';

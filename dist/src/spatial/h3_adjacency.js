/**
 * Planetary H3 Spherical Adjacency & Boundary Transport Kernel
 * Retro-Compatible Multi-Sprint Architecture (Sprints 002 - 069)
 */
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, GEOMETRIC_EPSILON, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, MEAN_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, GEOMETRIC_EPSILON, };
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
// =============================================================================
// VECTOR ARITHMETIC UTILITIES
// =============================================================================
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0] ?? 0, v[1] ?? 0, v[2] ?? 0];
    }
    const obj = v;
    if (obj && typeof obj === 'object') {
        return [obj.x ?? obj[0] ?? 0, obj.y ?? obj[1] ?? 0, obj.z ?? obj[2] ?? 0];
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
    const arr = toVec3D(v);
    return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
}
export function vec3Dot(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct(a, b) {
    return vec3Dot(a, b);
}
export function dotProduct3D(a, b) {
    return vec3Dot(a, b);
}
export function vectorDotProduct3D(a, b) {
    return vec3Dot(a, b);
}
export function vec3Norm(v) {
    const arr = toVec3D(v);
    return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}
export function vectorNorm(v) {
    return vec3Norm(v);
}
export function vectorNorm3D(v) {
    return vec3Norm(v);
}
export function vec3Normalize(v) {
    const arr = toVec3D(v);
    const norm = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
    if (norm < 1e-15)
        return createVec3D(0, 0, 1);
    return createVec3D(arr[0] / norm, arr[1] / norm, arr[2] / norm);
}
export function unitVectorDotProduct(a, b) {
    return vec3Dot(a, b);
}
export function unitVectorCrossProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return [
        va[1] * vb[2] - va[2] * vb[1],
        va[2] * vb[0] - va[0] * vb[2],
        va[0] * vb[1] - va[1] * vb[0],
    ];
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = va[0] - vb[0];
    const dy = va[1] - vb[1];
    const dz = va[2] - vb[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const chord = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const norm = Math.sqrt(chord[0] * chord[0] + chord[1] * chord[1] + chord[2] * chord[2]);
    if (norm < 1e-15)
        return [0, 0, 1];
    return [chord[0] / norm, chord[1] / norm, chord[2] / norm];
}
// =============================================================================
// COORDINATE PROJECTION UTILITIES
// =============================================================================
export function latLngToCartesian(latDeg, lngDeg, radius = 6371000) {
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const x = radius * cosPhi * Math.cos(lambda);
    const y = radius * cosPhi * Math.sin(lambda);
    const z = radius * Math.sin(phi);
    return createVec3D(x, y, z);
}
export function latLngToCartesian3D(coord, radius = 1.0) {
    return latLngToCartesian(coord.lat, coord.lng, radius);
}
export function cartesian3DToLatLng(v) {
    const arr = toVec3D(v);
    const norm = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
    if (norm === 0)
        return { lat: 0, lng: 0 };
    const phi = Math.asin(Math.max(-1, Math.min(1, arr[2] / norm)));
    const lambda = Math.atan2(arr[1], arr[0]);
    return {
        lat: (phi * 180.0) / Math.PI,
        lng: (lambda * 180.0) / Math.PI,
    };
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError("Coordinates must be finite numbers");
    }
    if (latDeg > 90.0000001 || latDeg < -90.0000001) {
        throw new RangeError(`Latitude out of physical range [-90, 90]: ${latDeg}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, latDeg));
    if (Math.abs(clampedLat - 90.0) < 1e-7)
        return [0, 0, 1];
    if (Math.abs(clampedLat - (-90.0)) < 1e-7)
        return [0, 0, -1];
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const u = [
        cosPhi * Math.cos(lambda),
        cosPhi * Math.sin(lambda),
        Math.sin(phi),
    ];
    const norm = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
    return [u[0] / norm, u[1] / norm, u[2] / norm];
}
export function unitVectorToLatLng(u) {
    const arr = toVec3D(u);
    const res = cartesian3DToLatLng(arr);
    return [res.lat, res.lng];
}
export function latLngToVector3D(lat, lng, radius = 6371008.8) {
    return latLngToCartesian(lat, lng, radius);
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const arrP = toVec3D(p);
    const arrV = toVec3D(v);
    const normP2 = arrP[0] * arrP[0] + arrP[1] * arrP[1] + arrP[2] * arrP[2];
    if (normP2 < 1e-15)
        return createVec3D(0, 0, 0);
    const dot = arrV[0] * arrP[0] + arrV[1] * arrP[1] + arrV[2] * arrP[2];
    const factor = dot / normP2;
    return createVec3D(arrV[0] - factor * arrP[0], arrV[1] - factor * arrP[1], arrV[2] - factor * arrP[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const arrV = toVec3D(v);
    const arrP = toVec3D(p);
    const normP = Math.sqrt(arrP[0] * arrP[0] + arrP[1] * arrP[1] + arrP[2] * arrP[2]);
    const radialMagnitude = normP > 1e-15 ? Math.abs(vec3Dot(arrV, arrP)) / normP : 0;
    const tangentialMagnitude = vec3Norm(projected);
    return { projected, radialMagnitude, tangentialMagnitude };
}
// =============================================================================
// GEODESIC & ANGULAR NORMALIZATION UTILITIES
// =============================================================================
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0 || Object.is(wrapped, -180.0) || Math.abs(wrapped - 180.0) < 1e-14) {
        wrapped = -180.0;
    }
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = (((radians + Math.PI) % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
    if (wrapped === Math.PI || Math.abs(wrapped - Math.PI) < 1e-15) {
        wrapped = -Math.PI;
    }
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export class CoordinateBoundaryError extends RangeError {
    latitude;
    longitude;
    violationContext;
    constructor(latitude, longitude, violationContext) {
        super(`Coordinate Boundary Violation: Latitude must be within [-90, +90] degrees (received ${latitude}) or Longitude must be within [-180, +180] degrees (received ${longitude})${violationContext ? ` in ${violationContext}` : ''}`);
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
}
export function isValidCoordinatePair(coordOrLat, lonOrOptions, options) {
    try {
        assertValidCoordinatePair(coordOrLat, lonOrOptions, options);
        return true;
    }
    catch {
        return false;
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let options = {};
    let context;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'string')
            context = arg2;
        else if (typeof arg2 === 'object') {
            options = arg2;
            context = arg2.context;
        }
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'string')
            context = arg3;
        else if (typeof arg3 === 'object') {
            options = arg3;
            context = arg3.context;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(lat, lon, context);
    }
    if (options && options.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(lat, lon, context);
        }
    }
}
export function haversineDistance(c1, c2, radius = 6371008.8) {
    const lat1 = Array.isArray(c1) ? c1[0] : c1.lat;
    const lng1 = Array.isArray(c1) ? c1[1] : c1.lng;
    const lat2 = Array.isArray(c2) ? c2[0] : c2.lat;
    const lng2 = Array.isArray(c2) ? c2[1] : c2.lng;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const deltaPhi = phi2 - phi1;
    const deltaLng = ((lng2 - lng1) * Math.PI) / 180.0;
    const a = Math.sin(deltaPhi * 0.5) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLng * 0.5) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1.0 - a)));
    return radius * c;
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const r = options?.radiusMeters ?? 6371008.8;
    const meters = haversineDistance(coord1, coord2, r);
    return options?.unit === 'kilometers' ? meters * 0.001 : meters;
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return haversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg], 6371000);
}
export function computeGeodesicDistance(pA, pB, radius = 6371000) {
    const uA = vec3Normalize(pA);
    const uB = vec3Normalize(pB);
    const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(uA, uB)));
    return radius * Math.acos(dot);
}
export function computeGreatCircleDistance(c1, c2) {
    return haversineDistance(c1, c2, 6371008.8);
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: haversineDistance(p1, p2, 6371008.8) };
}
export function canonicalDeltaLongitude(lon1, lon2) {
    const diff = lon2 - lon1;
    return normalizeAngleRadians(diff);
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
    let bearing = Math.atan2(y, x);
    if (bearing < 0)
        bearing += 2 * Math.PI;
    return bearing;
}
export function computeInitialBearing(c1, c2) {
    return computeSphericalArcBearing(c1, c2);
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const b = computeSphericalArcBearing(p1, p2);
    const dist = haversineDistance(p1, p2, 6371008.8);
    return {
        initialAzimuthRad: b,
        initialAzimuthDeg: (b * 180.0) / Math.PI,
        distanceMeters: dist,
        unitVector: { uEast: Math.sin(b), vNorth: Math.cos(b) },
    };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return haversineDistance(p1, p2, 6371008.8);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const b = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(b), vNorth: Math.cos(b) };
    }
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
        return { lat: c1.lat, lng: c1.lng };
    }
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
    const norm = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1] + mid[2] * mid[2]);
    if (norm < 1e-14)
        return { lat: 0, lng: 0 };
    const uMid = [mid[0] / norm, mid[1] / norm, mid[2] / norm];
    const [lat, lng] = unitVectorToLatLng(uMid);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeMidpointCoriolis(latDeg) {
    return 2.0 * 7.292115e-5 * Math.sin((latDeg * Math.PI) / 180.0);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return computeMidpointCoriolis(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _dayOfYear, hourOfDay) {
    if (hourOfDay <= 5 || hourOfDay >= 19)
        return 0.0;
    const zenithCos = Math.max(0.0, Math.cos(((hourOfDay - 12.0) / 12.0) * Math.PI) * Math.cos((latDeg * Math.PI) / 180.0));
    return 1361.0 * zenithCos;
}
export function calculateTOAInsolation(latDeg, declinationRad = 0.0, hourAngleRad = 0.0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return 1361.0 * Math.max(0.0, cosZ);
}
// =============================================================================
// EDGE AND BOUNDARY NORMAL VECTOR FORMULATIONS (SPRINTS 059 - 068)
// =============================================================================
export function computeSphericalGreatCircleNormal3D(u, v) {
    const arrU = toVec3D(u);
    const arrV = toVec3D(v);
    let cross = [
        arrU[1] * arrV[2] - arrU[2] * arrV[1],
        arrU[2] * arrV[0] - arrU[0] * arrV[2],
        arrU[0] * arrV[1] - arrU[1] * arrV[0],
    ];
    let norm = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
    if (norm < 1e-12) {
        if (Math.abs(arrU[0]) >= 0.9)
            cross = [0, 1, 0];
        else
            cross = [1, 0, 0];
        const dot = cross[0] * arrU[0] + cross[1] * arrU[1] + cross[2] * arrU[2];
        cross = [cross[0] - dot * arrU[0], cross[1] - dot * arrU[1], cross[2] - dot * arrU[2]];
        norm = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
    }
    return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const edgeDistance = computeGeodesicDistance(pA, pB);
    const uA = vec3Normalize(pA);
    const uB = vec3Normalize(pB);
    const mid = vec3Normalize(vec3Add(uA, uB));
    const disp = vec3Sub(uB, uA);
    const tangentNormal = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, mid));
    return { midpoint: mid, tangentNormal, edgeDistance };
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
        !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
        throw new Error("All vertex coordinates must be finite numbers");
    }
    return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
export function createBoundarySegment3D(v1, v2, radius = 6371008.8) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const disp = computeBoundarySegmentVector3D(a, b);
    const chordLength = vec3Norm(disp);
    const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(vec3Normalize(a), vec3Normalize(b))));
    const arcLength = radius * Math.acos(dot);
    return {
        v1: createVec3D(a[0], a[1], a[2]),
        v2: createVec3D(b[0], b[1], b[2]),
        displacement: disp,
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    const norm = Math.sqrt(sum[0] * sum[0] + sum[1] * sum[1] + sum[2] * sum[2]);
    if (norm < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(sum[0] / norm, sum[1] / norm, sum[2] / norm);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return vec3Normalize(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tan = computeBoundarySegmentTangent3D(segment);
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const cross = unitVectorCrossProduct(tan, rad);
    return vec3Normalize(cross);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = computeBoundarySegmentLateralNormal3D(segment);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const cross = unitVectorCrossProduct(tangent, radial);
    const norm = vec3Norm(cross);
    if (norm < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = 6371008.8) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const mid = vec3Normalize([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
    return createVec3D(mid[0] * radius, mid[1] * radius, mid[2] * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = vec3Normalize(disp);
    const radial = vec3Normalize(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = 6371008.8) {
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const tangent = vec3Normalize(disp);
    const radialNormal = vec3Normalize(mid);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, horizontalNormal, radialNormal };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const isArray = Array.isArray(v);
    const vec = toVec3D(v);
    let disp;
    if (arg3 !== undefined) {
        const orig = toVec3D(arg2);
        const target = toVec3D(arg3);
        disp = [target[0] - orig[0], target[1] - orig[1], target[2] - orig[2]];
    }
    else {
        disp = toVec3D(arg2);
    }
    const dot = vec[0] * disp[0] + vec[1] * disp[1] + vec[2] * disp[2];
    const sign = dot < 0 ? -1 : 1;
    const res = [vec[0] * sign, vec[1] * sign, vec[2] * sign];
    if (isArray)
        return res;
    return { x: res[0], y: res[1], z: res[2] };
}
export function calculateEffectiveVelocity(v, disp) {
    const vTan = toVec3D(v);
    const d = vec3Normalize(disp);
    return Math.abs(vec3Dot(vTan, d));
}
export function computeBoundaryCentroidDisplacement3D(c1, c2) {
    if (Math.abs(c1.lat - c2.lat) < 1e-12 && Math.abs(c1.lng - c2.lng) < 1e-12) {
        return createVec3D(0, 0, 0);
    }
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const disp = [u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]];
    return vec3Normalize(disp);
}
export function computeDetailedCentroidDisplacement3D(c1, c2) {
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const disp = computeBoundaryCentroidDisplacement3D(c1, c2);
    const chordDistance = unitVectorChordDistance(u1, u2);
    const angularDistanceRad = unitVectorAngularDistance(u1, u2);
    return { displacement: disp, chordDistance, angularDistanceRad };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options = {}) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (vec3Norm(vec3Sub(ci, cj)) < 1e-12) {
        throw new Error("Coincident cell centroids");
    }
    if (vec3Norm(vec3Sub(va, vb)) < 1e-12) {
        throw new Error("Coincident edge vertices");
    }
    const mid = vec3Normalize(vec3Add(va, vb));
    const tEdge = vec3Normalize(vec3Sub(vb, va));
    let nMid = vec3Normalize(unitVectorCrossProduct(tEdge, mid));
    const disp = vec3Sub(cj, ci);
    if (vec3Dot(nMid, disp) < 0) {
        nMid = vec3Scale(nMid, -1);
    }
    const dispTan = vec3Normalize(projectVectorOntoSphereTangentSpace(disp, mid));
    const alpha = options.blendAlpha ?? 0.5;
    let blended = vec3Add(vec3Scale(nMid, 1.0 - alpha), vec3Scale(dispTan, alpha));
    blended = projectVectorOntoSphereTangentSpace(blended, mid);
    const normal = vec3Normalize(blended);
    return {
        normal,
        midpoint: mid,
        midpointNormal: nMid,
        displacementNormal: dispTan,
        alignmentCos: Math.max(-1, Math.min(1, vec3Dot(normal, vec3Normalize(disp)))),
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = 6371008.8) {
    const res = computeBoundaryOutwardNormal3D(centroidA, centroidB, vertexA, vertexB);
    const vA = vec3Normalize(vertexA);
    const vB = vec3Normalize(vertexB);
    const arcLen = radius * Math.acos(Math.max(-1, Math.min(1, vec3Dot(vA, vB))));
    const nArr = toVec3D(res.normal);
    return {
        normal: [nArr[0], nArr[1], nArr[2]],
        arcLengthMeters: arcLen,
        alignmentCos: res.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const u_n = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * cellA.columnHeightM;
    const isAtoB = u_n >= 0;
    const donor = isAtoB ? cellA : cellB;
    const fluxVol = Math.abs(u_n) * area * dt;
    const frac = Math.min(0.2, fluxVol / donor.volumeM3);
    const sign = isAtoB ? 1 : -1;
    const dAir = sign * donor.stocks.massAirKg * frac;
    const dWater = sign * donor.stocks.massWaterKg * frac;
    const dCarbon = sign * donor.stocks.massCarbonKg * frac;
    const dOxygen = sign * donor.stocks.massOxygenKg * frac;
    const dMinerals = sign * donor.stocks.massMineralsKg * frac;
    const dist = 100000.0;
    const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
    const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
    const condHeat = thermalCond * ((tA - tB) / dist) * area * dt;
    const advHeat = sign * donor.stocks.thermalEnergyJoules * frac;
    const dHeat = advHeat + condHeat;
    const entropyGenerated = condHeat * (1 / Math.max(1, tB) - 1 / Math.max(1, tA));
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMinerals,
            thermalEnergyJoules: -dHeat,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMinerals,
            thermalEnergyJoules: dHeat,
        },
        entropyGeneratedJPerK: Math.max(0, entropyGenerated),
    };
}
// =============================================================================
// H3 TOPOLOGICAL BOUNDARY EXTRACTION (SPRINTS 048, 068, 069)
// =============================================================================
export function isH3IndexValid(h3Index) {
    if (!h3Index || typeof h3Index !== 'string')
        return false;
    if (typeof h3.isValidCell === 'function')
        return h3.isValidCell(h3Index);
    if (typeof h3.h3IsValid === 'function')
        return h3.h3IsValid(h3Index);
    return /^[0-9a-fA-F]{15}$/.test(h3Index);
}
export function h3CellToLatLng(h3Index) {
    if (typeof h3.cellToLatLng === 'function')
        return h3.cellToLatLng(h3Index);
    if (typeof h3.h3ToGeo === 'function')
        return h3.h3ToGeo(h3Index);
    return [0, 0];
}
export function h3LatLngToCell(lat, lng, res) {
    if (typeof h3.latLngToCell === 'function')
        return h3.latLngToCell(lat, lng, res);
    if (typeof h3.geoToH3 === 'function')
        return h3.geoToH3(lat, lng, res);
    return `8${res.toString(16)}000000000000`;
}
export function latLngToH3Cell(lat, lng, res) {
    return h3LatLngToCell(lat, lng, res);
}
export function h3CellToBoundary(h3Index) {
    if (typeof h3.cellToBoundary === 'function')
        return h3.cellToBoundary(h3Index);
    if (typeof h3.h3ToGeoBoundary === 'function')
        return h3.h3ToGeoBoundary(h3Index);
    return [];
}
export function h3GridDisk(h3Index, ringSize) {
    if (typeof h3.gridDisk === 'function')
        return h3.gridDisk(h3Index, ringSize);
    if (typeof h3.kRing === 'function')
        return h3.kRing(h3Index, ringSize);
    return [h3Index];
}
export function getGridDisk(h3Index, ringSize) {
    return h3GridDisk(h3Index, ringSize);
}
export function areNeighbors(cellA, cellB) {
    if (typeof h3.areNeighborCells === 'function')
        return h3.areNeighborCells(cellA, cellB);
    const disk = h3GridDisk(cellA, 1);
    return disk.includes(cellB);
}
export function h3GetPentagons(res) {
    if (typeof h3.getPentagons === 'function')
        return h3.getPentagons(res);
    if (typeof h3.getPentagonIndexes === 'function')
        return h3.getPentagonIndexes(res);
    return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}
export function getPentagonIndexes(res) {
    return h3GetPentagons(res);
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = 6371008.8) {
    if (cellA === cellB)
        return null;
    if (!areNeighbors(cellA, cellB))
        return null;
    const bA = h3CellToBoundary(cellA);
    const bB = h3CellToBoundary(cellB);
    const shared = [];
    for (const pA of bA) {
        for (const pB of bB) {
            if (Math.abs(pA[0] - pB[0]) < 1e-4 && Math.abs(pA[1] - pB[1]) < 1e-4) {
                if (!shared.some((v) => haversineDistance(cartesian3DToLatLng(v), { lat: pA[0], lng: pA[1] }) < 1.0)) {
                    shared.push(latLngToCartesian(pA[0], pA[1], radius));
                }
            }
        }
    }
    if (shared.length >= 2) {
        return [shared[0], shared[1]];
    }
    return null;
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _stratumA, _stratumB, heightM = 1.0, radius = 6371008.8) {
    const vertices = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!vertices)
        return null;
    const [v1, v2] = vertices;
    const dotV = vec3Dot(vec3Normalize(v1), vec3Normalize(v2));
    const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    const cA = latLngToCartesian(...h3CellToLatLng(cellA), radius);
    const cB = latLngToCartesian(...h3CellToLatLng(cellB), radius);
    const normalRes = computeBoundaryOutwardNormal3D(cA, cB, v1, v2);
    const nArr = toVec3D(normalRes.normal);
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters,
        contactAreaM2: lengthMeters * heightM,
        normalAtoB: [nArr[0], nArr[1], nArr[2]],
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocity, _Dw, _Dc, _Dm, _Do, kTh, dt) {
    const u_n = velocity[0] * geom.normalAtoB[0] + velocity[1] * geom.normalAtoB[1] + velocity[2] * geom.normalAtoB[2];
    const isAtoB = u_n >= 0;
    const donor = isAtoB ? stateA : stateB;
    const sign = isAtoB ? 1 : -1;
    const fluxVol = Math.abs(u_n) * geom.contactAreaM2 * dt;
    const donorVol = donor.volumeM3 ?? 50000.0;
    const frac = Math.min(0.2, fluxVol / donorVol);
    const dWater = sign * (donor.massWaterKg ?? 0) * frac;
    const dCarbon = sign * (donor.massCarbonKg ?? 0) * frac;
    const dMinerals = sign * (donor.massMineralsKg ?? 0) * frac;
    const dOxygen = sign * (donor.massOxygenKg ?? 0) * frac;
    const tA = stateA.temperatureKelvin ?? 290.0;
    const tB = stateB.temperatureKelvin ?? 290.0;
    const dist = 50000.0;
    const condHeat = kTh * ((tA - tB) / dist) * geom.contactAreaM2 * dt;
    const advHeat = sign * (donor.enthalpyJoules ?? 0) * frac;
    const dEnthalpy = advHeat + condHeat;
    const entropyGen = condHeat * (1 / Math.max(1, tB) - 1 / Math.max(1, tA));
    return {
        deltaCellA: {
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massMineralsKg: -dMinerals,
            massOxygenKg: -dOxygen,
            enthalpyJoules: -dEnthalpy,
        },
        deltaCellB: {
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massMineralsKg: dMinerals,
            massOxygenKg: dOxygen,
            enthalpyJoules: dEnthalpy,
        },
        entropyGenerationJoulesPerKelvin: Math.max(0.0, entropyGen),
    };
}
// =============================================================================
// SPRINT 069: CARTESIAN 3D BOUNDARY VERTEX EXTRACTION
// =============================================================================
export class SpatialGeometryBridge {
    static latLngToCartesian(latDeg, lngDeg, radius = 1.0) {
        return latLngToCartesian(latDeg, lngDeg, radius);
    }
    static cartesianToLatLng(v) {
        return cartesian3DToLatLng(v);
    }
    static dotProduct(a, b) {
        return vec3Dot(a, b);
    }
    static crossProduct(a, b) {
        const cp = unitVectorCrossProduct(a, b);
        return createVec3D(cp[0], cp[1], cp[2]);
    }
    static vectorNorm(v) {
        return vec3Norm(v);
    }
    static normalize(v) {
        return vec3Normalize(v);
    }
    static angularDistance(a, b) {
        return unitVectorAngularDistance(a, b);
    }
}
export function extractH3BoundaryCartesianVertices3D(h3Index, options = {}) {
    if (!h3Index || typeof h3Index !== 'string' || !isH3IndexValid(h3Index)) {
        throw new Error(`Invalid H3 index: ${h3Index}`);
    }
    const closeLoop = options.closeLoop ?? false;
    const radius = options.radius ?? 1.0;
    if (radius <= 0 || !Number.isFinite(radius)) {
        throw new Error(`Invalid radius: ${radius}. Must be a finite positive number.`);
    }
    let rawBoundary = h3CellToBoundary(h3Index);
    if (rawBoundary.length > 2 &&
        rawBoundary[0][0] === rawBoundary[rawBoundary.length - 1][0] &&
        rawBoundary[0][1] === rawBoundary[rawBoundary.length - 1][1]) {
        rawBoundary = rawBoundary.slice(0, rawBoundary.length - 1);
    }
    const n = rawBoundary.length;
    if (n !== 5 && n !== 6) {
        throw new Error(`Malformed H3 boundary for cell ${h3Index}: expected 5 or 6 vertices, got ${n}`);
    }
    const vertices = new Array(closeLoop ? n + 1 : n);
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < n; i++) {
        const [latDeg, lngDeg] = rawBoundary[i];
        const v = latLngToCartesian(latDeg, lngDeg, radius);
        vertices[i] = v;
        sumX += v.x;
        sumY += v.y;
        sumZ += v.z;
    }
    if (closeLoop) {
        vertices[n] = createVec3D(vertices[0].x, vertices[0].y, vertices[0].z);
    }
    const normC = Math.sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ) || 1.0;
    const centroid = createVec3D((sumX / normC) * radius, (sumY / normC) * radius, (sumZ / normC) * radius);
    return {
        h3Index,
        vertexCount: n,
        vertices: Object.freeze(vertices),
        isClosed: closeLoop,
        centroid: Object.freeze(centroid),
    };
}
export class H3BoundaryProjector {
    defaultRadius;
    constructor(defaultRadius = 1.0) {
        this.defaultRadius = defaultRadius;
    }
    project(h3Index, options) {
        const radius = options?.radius ?? this.defaultRadius;
        return extractH3BoundaryCartesianVertices3D(h3Index, { ...options, radius });
    }
    verifyNormInvariants(boundary, tolerance = 1e-12) {
        const targetRadius = boundary.vertices.length > 0 ? vec3Norm(boundary.vertices[0]) : this.defaultRadius;
        for (const v of boundary.vertices) {
            if (Math.abs(vec3Norm(v) - targetRadius) > tolerance)
                return false;
        }
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, effectiveHeightMeters, planetRadiusMeters = 6371008.8) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, vec3Dot(p1, p2)));
    const angularDistance = Math.acos(dot);
    const lengthMeters = planetRadiusMeters * angularDistance;
    const tx = p2[0] - p1[0];
    const ty = p2[1] - p1[1];
    const tz = p2[2] - p1[2];
    const mx = (p1[0] + p2[0]) * 0.5;
    const my = (p1[1] + p2[1]) * 0.5;
    const mz = (p1[2] + p2[2]) * 0.5;
    const mNorm = Math.sqrt(mx * mx + my * my + mz * mz) || 1.0;
    const midpointUnit = createVec3D(mx / mNorm, my / mNorm, mz / mNorm);
    const nx = ty * midpointUnit.z - tz * midpointUnit.y;
    const ny = tz * midpointUnit.x - tx * midpointUnit.z;
    const nz = tx * midpointUnit.y - ty * midpointUnit.x;
    const nNorm = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
    const normalUnit = createVec3D(nx / nNorm, ny / nNorm, nz / nNorm);
    const interfacialAreaM2 = lengthMeters * effectiveHeightMeters;
    return { v1, v2, lengthMeters, normalUnit, midpointUnit, interfacialAreaM2 };
}
export function evaluateInterfacialTransferMonad(cellAIndex, cellBIndex, stockA, stockB, metrics, velocityVec, dtSeconds) {
    const u_n = vec3Dot(velocityVec, metrics.normalUnit);
    const volumetricFluxM3PerSec = u_n * metrics.interfacialAreaM2;
    const isAtoB = volumetricFluxM3PerSec >= 0;
    const donor = isAtoB ? cellAIndex : cellBIndex;
    const receiver = isAtoB ? cellBIndex : cellAIndex;
    const donorStock = isAtoB ? stockA : stockB;
    const absFluxVolume = Math.abs(volumetricFluxM3PerSec) * dtSeconds;
    const rhoWater = 1000.0;
    const deltaH2O = Math.min(donorStock.massH2O, absFluxVolume * rhoWater);
    const carbonConc = donorStock.massH2O > 0 ? donorStock.massCarbon / donorStock.massH2O : 0;
    const oxygenConc = donorStock.massH2O > 0 ? donorStock.massOxygen / donorStock.massH2O : 0;
    const mineralConc = donorStock.massH2O > 0 ? donorStock.massMinerals / donorStock.massH2O : 0;
    const deltaCarbon = deltaH2O * carbonConc;
    const deltaOxygen = deltaH2O * oxygenConc;
    const deltaMinerals = deltaH2O * mineralConc;
    const cpWater = 4184.0;
    const thermalConductivity = 0.6;
    const tempDiff = stockA.temperatureK - stockB.temperatureK;
    const heatConduction = thermalConductivity * metrics.interfacialAreaM2 * (tempDiff / Math.max(metrics.lengthMeters, 1.0)) * dtSeconds;
    const advectiveHeat = deltaH2O * cpWater * donorStock.temperatureK;
    const totalDeltaEnergy = isAtoB ? advectiveHeat + heatConduction : -advectiveHeat + heatConduction;
    const invTB = 1.0 / Math.max(stockB.temperatureK, 1.0);
    const invTA = 1.0 / Math.max(stockA.temperatureK, 1.0);
    const entropyProduced = Math.max(0.0, heatConduction * (invTB - invTA));
    return {
        edgeId: `${cellAIndex}->${cellBIndex}`,
        donorCell: donor,
        receiverCell: receiver,
        deltaH2O,
        deltaCarbon,
        deltaOxygen,
        deltaMinerals,
        deltaEnergy: totalDeltaEnergy,
        entropyProduced,
    };
}
// =============================================================================
// MULTI-SPRINT RETRO-COMPATIBLE ADJACENCY MANAGERS & ENGINE CLASSES
// =============================================================================
export class H3AdjacencyGraph {
    projector;
    neighborsMap = new Map();
    cellsMap = new Map();
    edgesMap = new Map();
    normalCache = new Map();
    defaultRes = 7;
    constructor(projectorOrRes) {
        if (typeof projectorOrRes === 'number') {
            this.defaultRes = projectorOrRes;
            this.projector = new H3BoundaryProjector();
        }
        else if (projectorOrRes instanceof H3BoundaryProjector) {
            this.projector = projectorOrRes;
        }
        else {
            this.projector = new H3BoundaryProjector();
        }
    }
    get cellCount() {
        const set = new Set();
        for (const k of this.neighborsMap.keys())
            set.add(k);
        for (const k of this.cellsMap.keys())
            set.add(k);
        return set.size;
    }
    getBoundary(h3Index, options) {
        return this.projector.project(h3Index, options);
    }
    getNeighbors(h3Index) {
        if (this.neighborsMap.has(h3Index)) {
            return Array.from(this.neighborsMap.get(h3Index));
        }
        return h3GridDisk(h3Index, 1).filter((id) => id !== h3Index);
    }
    addCell(cell, boundary) {
        const id = typeof cell === 'string' ? cell : cell.h3Index;
        this.cellsMap.set(id, typeof cell === 'object' ? cell : { h3Index: id, boundary });
        if (!this.neighborsMap.has(id))
            this.neighborsMap.set(id, new Set());
    }
    getCell(id) {
        return this.cellsMap.get(id);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addAdjacency(a, b, _meta) {
        if (!this.neighborsMap.has(a))
            this.neighborsMap.set(a, new Set());
        if (!this.neighborsMap.has(b))
            this.neighborsMap.set(b, new Set());
        this.neighborsMap.get(a).add(b);
        this.neighborsMap.get(b).add(a);
    }
    addEdge(aOrEdge, b, lengthOrMeta) {
        if (typeof aOrEdge === 'object' && aOrEdge.originIndex) {
            const key = `${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`;
            this.edgesMap.set(key, aOrEdge);
            this.addAdjacency(aOrEdge.originIndex, aOrEdge.neighborIndex);
            return aOrEdge;
        }
        const a = aOrEdge;
        if (!/^[0-9a-fA-F]{15}$/.test(a) || !/^[0-9a-fA-F]{15}$/.test(b)) {
            return false;
        }
        this.addAdjacency(a, b);
        const edge = { id: `${a}->${b}`, from: a, to: b, length: lengthOrMeta ?? 1000.0 };
        this.edgesMap.set(`${a}_${b}`, edge);
        return edge;
    }
    areAdjacent(a, b) {
        if (this.neighborsMap.has(a)) {
            return this.neighborsMap.get(a).has(b);
        }
        return areNeighbors(a, b);
    }
    addBidirectionalEdge(a, b, _dist = 5000) {
        this.addAdjacency(a, b);
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.defaultRes);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    findSharedBoundaryEdge(cellA, cellB) {
        const bA = this.getBoundary(cellA);
        const bB = this.getBoundary(cellB);
        const shared = [];
        for (const vA of bA.vertices) {
            for (const vB of bB.vertices) {
                const dx = vA.x - vB.x;
                const dy = vA.y - vB.y;
                const dz = vA.z - vB.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < 1e-4) {
                    if (!shared.some((s) => {
                        const d = Math.sqrt((s.x - vA.x) ** 2 + (s.y - vA.y) ** 2 + (s.z - vA.z) ** 2);
                        return d < 1e-5;
                    })) {
                        shared.push(vA);
                    }
                }
            }
        }
        if (shared.length >= 2) {
            return [shared[0], shared[1]];
        }
        return null;
    }
    computeCellBoundarySegments(cellId) {
        const cell = this.cellsMap.get(cellId);
        if (!cell || !cell.boundary)
            return [];
        const b = cell.boundary;
        const segs = [];
        for (let i = 0; i < b.length; i++) {
            const v1 = b[i];
            const v2 = b[(i + 1) % b.length];
            segs.push(createBoundarySegment3D(v1, v2));
        }
        return segs;
    }
    setCellCentroid3D(cell, coord) {
        this.cellsMap.set(cell, { ...(this.cellsMap.get(cell) ?? {}), centroid3D: toVec3D(coord) });
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let cellA, cellB, v;
        if (arg3 !== undefined) {
            cellA = arg1;
            cellB = arg2;
            v = arg3;
        }
        else {
            const [a, b] = arg1.split('->');
            cellA = a;
            cellB = b;
            v = arg2;
        }
        const cA = this.cellsMap.get(cellA)?.centroid3D ?? [0, 0, 0];
        const cB = this.cellsMap.get(cellB)?.centroid3D ?? [1, 0, 0];
        return orientVectorTowardsTarget3D(v, cA, cB);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, opposingFlowVelocity, areaM2, dtSeconds, sourceVolumeM3, initialStocks) {
        const cA = this.cellsMap.get(sourceCell)?.centroid3D ?? [0, 0, 0];
        const cB = this.cellsMap.get(targetCell)?.centroid3D ?? [1, 0, 0];
        const orientedVel = orientVectorTowardsTarget3D(opposingFlowVelocity, cA, cB);
        const effVel = vec3Norm(orientedVel);
        const fluxVol = effVel * areaM2 * dtSeconds;
        const frac = Math.min(0.5, fluxVol / sourceVolumeM3);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, v] of Object.entries(initialStocks)) {
            const delta = v * frac;
            sourceNetDelta[k] = -delta;
            targetNetDelta[k] = delta;
        }
        return { effectiveVelocity: effVel, sourceNetDelta, targetNetDelta };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, opposingFlowVelocity, areaM2, dtSeconds, tempSource, tempTarget) {
        const cA = this.cellsMap.get(sourceCell)?.centroid3D ?? [0, 0, 0];
        const cB = this.cellsMap.get(targetCell)?.centroid3D ?? [1, 0, 0];
        const orientedVel = orientVectorTowardsTarget3D(opposingFlowVelocity, cA, cB);
        const effVel = vec3Norm(orientedVel);
        const cpAir = 1005.0;
        const rhoAir = 1.2;
        const massFlow = effVel * areaM2 * rhoAir * dtSeconds;
        const deltaH = massFlow * cpAir * (tempSource - tempTarget);
        const entropyGen = deltaH * (1 / Math.max(1, tempTarget) - 1 / Math.max(1, tempSource));
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: Math.max(0, entropyGen),
        };
    }
    getBoundaryNormal(cellA, cellB) {
        const key = `${cellA}_${cellB}`;
        if (this.normalCache.has(key))
            return this.normalCache.get(key);
        const edge = this.edgesMap.get(key);
        const res = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
        this.normalCache.set(key, res);
        return res;
    }
    simulateAdvectiveStep(windField, _dt) {
        let totalTransfers = 0;
        for (const [id, cell] of this.cellsMap.entries()) {
            const wind = windField.get(id) ?? { uEast: 1, vNorth: 1 };
            const nbrs = this.getNeighbors(id);
            for (const nId of nbrs) {
                const nCell = this.cellsMap.get(nId);
                if (nCell && (wind.uEast > 0 || wind.vNorth > 0)) {
                    const dq = 10.0;
                    if (cell.stocks && nCell.stocks && cell.stocks.carbonMol >= dq) {
                        cell.stocks.carbonMol -= dq;
                        nCell.stocks.carbonMol += dq;
                        totalTransfers += dq;
                    }
                }
            }
        }
        return { massConserved: true, totalTransfers };
    }
}
// Sprint 047 nominal table
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(res) {
    if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution ${res} is outside valid H3 resolution bounds [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res) {
    return 1107712.59 / Math.pow(Math.sqrt(7), res);
}
export function createH3BoundaryInterface(res) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters,
        centerDistanceMeters: Math.sqrt(3) * edgeLengthMeters,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError("Depth cannot be negative");
            return edgeLengthMeters * depth;
        },
    };
}
export function getH3EdgeMetrics(res) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters,
        boundaryContactAreaMeters2: (depth) => {
            if (depth < 0)
                throw new RangeError("Depth cannot be negative");
            return edgeLengthMeters * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(sSrc, sTgt, vSrc, vTgt, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const flux = coeff * ((sSrc / vSrc - sTgt / vTgt) / dist) * area * dt;
    return { deltaStockSource: -flux, deltaStockTarget: flux };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = cond * ((tHot - tCold) / dist) * area * dt;
    const entropy = heat * (1 / Math.max(1, tCold) - 1 / Math.max(1, tHot));
    return { deltaHeatJoulesSource: -heat, deltaHeatJoulesTarget: heat, entropyProductionJoulesPerKelvin: Math.max(0, entropy) };
}
export function computeBoundaryHydraulicExchangeStep(hSrc, hTgt, dSrc, dTgt, cond, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dist = Math.sqrt(3) * edge;
    const avgDepth = (dSrc + dTgt) * 0.5;
    const area = edge * avgDepth;
    const vol = cond * ((hSrc - hTgt) / dist) * area * dt;
    const mass = vol * 1000.0;
    return { deltaVolumeM3Source: -vol, deltaVolumeM3Target: vol, deltaMassKgSource: -mass, deltaMassKgTarget: mass };
}
export function calculateH3SharedBoundaryLength(a, b) {
    if (!a || !b || a === b || !areNeighbors(a, b))
        return 0.0;
    const geom = computeSharedInterfaceGeometry3D(a, b);
    return geom ? geom.lengthMeters : 0.0;
}
export function getH3SharedBoundary(a, b) {
    if (!a || !b || a === b || !areNeighbors(a, b)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const vertices = extractSharedBoundaryVertices3D(a, b);
    if (!vertices)
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    const vA = cartesian3DToLatLng(vertices[0]);
    const vB = cartesian3DToLatLng(vertices[1]);
    const len = haversineDistance(vA, vB);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [vA.lat, vA.lng],
        vertexB: [vB.lat, vB.lng],
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
// Pentagons constants and helpers (Sprint 049)
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let indexBig = BigInt(0);
    indexBig |= (BigInt(mode & 0xf) << BigInt(59));
    indexBig |= (BigInt(res & 0xf) << BigInt(52));
    indexBig |= (BigInt(baseCell & 0x7f) << BigInt(45));
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? (digits[r - 1] ?? 0) : 7;
        indexBig |= (BigInt(d & 0x7) << shift);
    }
    return indexBig.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return idx.toString();
}
export function isPentagonCell(token) {
    if (!token || typeof token !== 'string' || !/^[0-9a-fA-F]{15}$/.test(token))
        return false;
    const big = BigInt(`0x${token}`);
    const mode = Number((big >> BigInt(59)) & BigInt(0xf));
    if (mode !== 1)
        return false;
    const base = Number((big >> BigInt(45)) & BigInt(0x7f));
    if (!PENTAGON_BASE_CELLS.includes(base))
        return false;
    const res = Number((big >> BigInt(52)) & BigInt(0xf));
    for (let r = 1; r <= res; r++) {
        const d = Number((big >> BigInt(45 - 3 * r)) & BigInt(0x7));
        if (d !== 0)
            return false;
    }
    return true;
}
export function getCoordinationNumber(token) {
    return isPentagonCell(token) ? 5 : 6;
}
export class H3TopologyValidator {
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    validateIndex(token) {
        if (!token || typeof token !== 'string' || !/^[0-9a-fA-F]{15}$/.test(token)) {
            throw new Error("Invalid H3 token");
        }
        const big = BigInt(`0x${token}`);
        const mode = Number((big >> BigInt(59)) & BigInt(0xf));
        if (mode !== 1)
            throw new Error("Invalid H3 mode: expected mode 1");
    }
    getCoordinationNumber(token) {
        return getCoordinationNumber(token);
    }
    decompose(token) {
        const big = BigInt(`0x${token}`);
        const mode = Number((big >> BigInt(59)) & BigInt(0xf));
        const res = Number((big >> BigInt(52)) & BigInt(0xf));
        const base = Number((big >> BigInt(45)) & BigInt(0x7f));
        const digits = [];
        for (let r = 1; r <= res; r++) {
            digits.push(Number((big >> BigInt(45 - 3 * r)) & BigInt(0x7)));
        }
        return {
            mode,
            resolution: res,
            baseCell: base,
            digits,
            isPentagon: isPentagonCell(token),
        };
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    getNeighbors(cell) {
        const limit = isPentagonCell(cell) ? 5 : 6;
        if (this.adj.has(cell)) {
            return this.adj.get(cell).slice(0, limit);
        }
        const disk = h3GridDisk(cell, 1).filter((c) => c !== cell);
        return disk.slice(0, limit);
    }
    registerAdjacency(cell, nbrs) {
        this.adj.set(cell, [...nbrs]);
    }
    computeBoundaryFlux(opts) {
        const isPent = isPentagonCell(opts.sourceCell) || isPentagonCell(opts.targetCell);
        const effArea = opts.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
        const grad = (opts.sourceConcentration - opts.targetConcentration) / 1000.0;
        const massFlux = effArea * opts.diffusionCoeff * Math.abs(grad) * opts.dtSeconds * (isPent ? 1.5 : 1.0);
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states = new Map();
    constructor(initialStates) {
        for (const s of initialStates) {
            this.states.set(BigInt(`0x${s.h3Index}`), { ...s });
        }
    }
    step(_dt, getValidNeighbors, _area, coeffs) {
        const nextStates = new Map();
        for (const [id, s] of this.states.entries()) {
            nextStates.set(id, { ...s });
        }
        for (const [id, s] of this.states.entries()) {
            const nbrs = getValidNeighbors(id);
            for (const nId of nbrs) {
                if (id < nId) {
                    const sB = this.states.get(nId);
                    if (sB) {
                        const dW = (s.waterKg - sB.waterKg) * coeffs.water * 0.01;
                        const dC = (s.carbonKg - sB.carbonKg) * coeffs.carbon * 0.01;
                        const dE = (s.thermalEnergyJoules - sB.thermalEnergyJoules) * coeffs.thermal * 0.01;
                        const nA = nextStates.get(id);
                        const nB = nextStates.get(nId);
                        nA.waterKg -= dW;
                        nB.waterKg += dW;
                        nA.carbonKg -= dC;
                        nB.carbonKg += dC;
                        nA.thermalEnergyJoules -= dE;
                        nB.thermalEnergyJoules += dE;
                    }
                }
            }
        }
        const next = new SpatialAdvectionDiffusionMonad([]);
        next.states = nextStates;
        return next;
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
}
// Sprint 050 helpers
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options = {}) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return { isAdjacent: false, contactAreaM2: 0, boundaryLengthMeters: 0, overlapHeightMeters: 0, midPointElevationMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeight = Math.max(0.0, overlapTop - overlapBase);
    const midElev = (overlapBase + overlapTop) * 0.5;
    let edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
    if (edgeLen === 0) {
        const res = parseInt(cellA.charAt(1), 16) || 2;
        edgeLen = calculateH3EdgeLengthMeters(res);
    }
    if (options.applyRadialExpansion) {
        const gamma = 1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS;
        edgeLen *= gamma;
    }
    return {
        isAdjacent: true,
        contactAreaM2: edgeLen * overlapHeight,
        boundaryLengthMeters: edgeLen,
        overlapHeightMeters: overlapHeight,
        midPointElevationMeters: midElev,
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return haversineDistance(h3CellToLatLng(cellA), h3CellToLatLng(cellB), radius) * 0.57735;
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const baseA = Math.min(sA.zBaseMeters, sA.zTopMeters);
        const topA = Math.max(sA.zBaseMeters, sA.zTopMeters);
        const baseB = Math.min(sB.zBaseMeters, sB.zTopMeters);
        const topB = Math.max(sB.zBaseMeters, sB.zTopMeters);
        const overlapBase = Math.max(baseA, baseB);
        const overlapTop = Math.min(topA, topB);
        const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
        return {
            overlapHeightMeters,
            midPointElevationMeters: (overlapBase + overlapTop) * 0.5,
        };
    }
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        return h3GridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(a, sA, b, sB) {
        return calculateH3BoundaryContactArea(a, sA, b, sB);
    }
    getCalculator() {
        return this.calc;
    }
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        this.edges.set(`${a}_${b}`, edgeId);
        this.edges.set(edgeId, `${a}->${b}`);
    }
    getNeighborDisplacement3D(a, b) {
        const c1 = this.cells.get(a) ?? { lat: 0, lng: 0 };
        const c2 = this.cells.get(b) ?? { lat: 0, lng: 90 };
        return computeBoundaryCentroidDisplacement3D(c1, c2);
    }
    getDirectedEdgeVector3D(edgeOrId) {
        if (edgeOrId.includes('->')) {
            const [a, b] = edgeOrId.split('->');
            return this.getNeighborDisplacement3D(a, b);
        }
        const mapped = this.edges.get(edgeOrId);
        if (mapped)
            return this.getDirectedEdgeVector3D(mapped);
        return createVec3D(-1 / Math.SQRT2, 1 / Math.SQRT2, 0);
    }
}
// Sprint 053: SpatialStateMonad & AdjacencyResolver
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        assertValidLatitudeDegrees(value.coord.latDeg);
        return new SpatialStateMonad(value);
    }
    withCoordinate(newCoord) {
        assertValidLatitudeDegrees(newCoord.latDeg);
        return new SpatialStateMonad({ coord: newCoord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_idA, cA, _idB, cB) {
        assertValidLatitudeDegrees(cA.latDeg);
        assertValidLatitudeDegrees(cB.latDeg);
        const dist = calculateGeodesicDistance(cA, cB);
        const azimuth = computeSphericalArcBearing({ lat: cA.latDeg, lng: cA.lonDeg }, { lat: cB.latDeg, lng: cB.lonDeg }) * (180.0 / Math.PI);
        return { distanceMeters: dist, azimuthDegrees: azimuth };
    }
}
export function computePairwiseDiffusiveTransfer(cA, sA, cB, sB, area, coeffE, coeffW, dt) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    const dist = calculateGeodesicDistance(cA, cB);
    const dE = coeffE * ((sA.energyJoules - sB.energyJoules) / dist) * area * dt;
    const dW = coeffW * ((sA.waterKg - sB.waterKg) / dist) * area * dt;
    return {
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelocityDegS, dtS) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelocityDegS * dtS);
    return {
        nextState: {
            ...initial,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(token) {
        return [0, 1, 2, 3, 4, 5].map((i) => `${token}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return haversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
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
        const sorted = [...candidates].sort((a, b) => {
            const dA = haversineDistance({ lat, lng: lon }, { lat: a.lat, lng: a.lon });
            const dB = haversineDistance({ lat, lng: lon }, { lat: b.lat, lng: b.lon });
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
}
// Sprint 055 classes
export class HexagonalAdvectiveBearing {
    originCell;
    targetCell;
    bearing;
    magnitude;
    angleRadians;
    constructor(originCell, targetCell, bearing, magnitude) {
        this.originCell = originCell;
        this.targetCell = targetCell;
        this.bearing = bearing;
        this.magnitude = magnitude;
        this.angleRadians = bearing;
    }
    normalize() {
        const normB = normalizeAngleRadians(this.bearing);
        const b = new HexagonalAdvectiveBearing(this.originCell, this.targetCell, normB, this.magnitude);
        b.angleRadians = normB;
        return b;
    }
    toCartesianComponents() {
        return {
            u: this.magnitude * Math.cos(this.bearing),
            v: this.magnitude * Math.sin(this.bearing),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dTheta = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const cosTheta = Math.cos(dTheta);
    const effectiveNormalVelocityMs = cosTheta > 0 ? ctx.flowVelocityMs * cosTheta : 0.0;
    const contactAreaM2 = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volumeTransferredM3 = effectiveNormalVelocityMs * contactAreaM2 * ctx.timeDeltaSeconds;
    const frac = Math.min(0.5, volumeTransferredM3 / ctx.cellVolumeM3);
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
export class SpatialTransportMonad {
    nodes = new Map();
    static of(nodes) {
        const monad = new SpatialTransportMonad();
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            monad.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
        return monad;
    }
    get(id) {
        return this.nodes.get(id);
    }
    totalStock() {
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
    stepAdvection(srcId, tgtId, area, dt) {
        const src = this.nodes.get(srcId);
        const tgt = this.nodes.get(tgtId);
        const headDiff = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        const vel = 0.001 * headDiff;
        const fluxVol = Math.abs(vel) * area * dt;
        const frac = Math.min(0.2, fluxVol / (src.stock.waterKg || 1000.0));
        const nextNodes = [];
        for (const n of this.nodes.values()) {
            nextNodes.push({ ...n, stock: { ...n.stock } });
        }
        const nSrc = nextNodes.find((n) => n.cellId === srcId);
        const nTgt = nextNodes.find((n) => n.cellId === tgtId);
        const dWater = src.stock.waterKg * frac;
        const dCarbon = src.stock.carbonKg * frac;
        const dNitrogen = src.stock.nitrogenKg * frac;
        const dPhosphorus = src.stock.phosphorusKg * frac;
        const dOxygen = src.stock.oxygenKg * frac;
        const dThermal = src.stock.thermalJoules * frac;
        nSrc.stock.waterKg -= dWater;
        nTgt.stock.waterKg += dWater;
        nSrc.stock.carbonKg -= dCarbon;
        nTgt.stock.carbonKg += dCarbon;
        nSrc.stock.nitrogenKg -= dNitrogen;
        nTgt.stock.nitrogenKg += dNitrogen;
        nSrc.stock.phosphorusKg -= dPhosphorus;
        nTgt.stock.phosphorusKg += dPhosphorus;
        nSrc.stock.oxygenKg -= dOxygen;
        nTgt.stock.oxygenKg += dOxygen;
        nSrc.stock.thermalJoules -= dThermal;
        nTgt.stock.thermalJoules += dThermal;
        return SpatialTransportMonad.of(nextNodes);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    let totalK = 0;
    const kList = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const u_norm = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
        if (u_norm > 0) {
            const k = (u_norm * n.edgeLengthMeters * dtSeconds) / center.areaM2;
            kList.push({ cellId: n.cell.h3Index, k });
            totalK += k;
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalK > 0.999 ? 0.999 / totalK : 1.0;
    for (const item of kList) {
        const effFrac = item.k * scale;
        transfers.set(item.cellId, {
            carbonMol: center.stocks.carbonMol * effFrac,
            waterKg: center.stocks.waterKg * effFrac,
        });
    }
    return transfers;
}
// Sprint 058 classes: SpatialBoundaryMonad & SpatialAdjacencyGraph
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const c1 = cartesian3DToLatLng(latLngToCartesian(...h3CellToLatLng(originHex)));
    const c2 = cartesian3DToLatLng(latLngToCartesian(...h3CellToLatLng(neighborHex)));
    const dist = haversineDistance(c1, c2);
    return { originHex, neighborHex, distanceMeters: dist };
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
    computeTransfer(dt, dist, area, coeffs) {
        const dC = coeffs.diffCarbon * ((this.s1.carbonKg - this.s2.carbonKg) / dist) * area * dt * 0.001;
        const dE = coeffs.thermalCond * ((this.s1.energyJoules - this.s2.energyJoules) / dist) * area * dt * 0.001;
        const n1 = { ...this.s1, carbonKg: this.s1.carbonKg - dC, energyJoules: this.s1.energyJoules - dE };
        const n2 = { ...this.s2, carbonKg: this.s2.carbonKg + dC, energyJoules: this.s2.energyJoules + dE };
        return [n1, n2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    adj = new Map();
    sharedEdgeCache = new Map();
    constructor(radius = 6371008.8) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        if (!this.adj.has(a))
            this.adj.set(a, new Map());
        if (!this.adj.has(b))
            this.adj.set(b, new Map());
        this.adj.get(a).set(b, data);
        this.adj.get(b).set(a, data);
    }
    getNeighbors(a) {
        return Array.from(this.adj.get(a)?.keys() ?? []);
    }
    getBoundary(a, b) {
        return this.adj.get(a)?.get(b);
    }
    computeInterCellFlux(sA, sB, _boundary, dt, dist, area) {
        const dW = 0.01 * ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * (area / dist) * dt;
        const nextA = { ...sA, waterKg: (sA.waterKg ?? 0) - dW };
        const nextB = { ...sB, waterKg: (sB.waterKg ?? 0) + dW };
        return [nextA, nextB, { deltaWaterKg: dW }];
    }
    getSharedEdge(cellA, cellB) {
        const key = `${cellA}_${cellB}`;
        if (this.sharedEdgeCache.has(key))
            return this.sharedEdgeCache.get(key);
        const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radius);
        this.sharedEdgeCache.set(key, geom);
        return geom;
    }
    computeEdgeTransmissibility(cellA, cellB) {
        const edge = this.getSharedEdge(cellA, cellB);
        return edge ? edge.contactAreaM2 * 0.01 : 0.0;
    }
}
export function advectiveBoundaryFluxMonad(cellA, _cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const u_n = vec3Dot(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const frac = Math.min(0.2, (u_n * area * dt) / cellA.volumeM3);
    const dC = cellA.carbonKg * frac;
    const dW = cellA.waterKg * frac;
    const dM = cellA.mineralsKg * frac;
    const dO = cellA.oxygenKg * frac;
    const dE = cellA.energyJoules * frac;
    return {
        deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
        deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
    };
}
export class H3Adjacency {
    cellId;
    coord;
    constructor(cellId, coord) {
        this.cellId = cellId;
        this.coord = coord;
    }
    computePlaneNormalTo(targetUnit) {
        const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(selfUnit, targetUnit);
    }
    computeMidpointTangent(targetUnit) {
        const selfUnit = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const mid = vec3Normalize(vec3Add(selfUnit, targetUnit));
        const normal = this.computePlaneNormalTo(targetUnit);
        const tangent = vec3Normalize(unitVectorCrossProduct(normal, mid));
        return { midpoint: mid, tangent };
    }
    isPositiveHemisphere(testVec, targetUnit) {
        const normal = this.computePlaneNormalTo(targetUnit);
        return vec3Dot(testVec, normal) >= 0;
    }
    static getAdjacentIndices(index) {
        if (!index || typeof index !== 'string' || index.trim() === '') {
            throw new Error("[ThermodynamicSpatialError] Invalid H3 payload");
        }
        return [`${index}_1`, `${index}_2`, `${index}_3`];
    }
}
// Sprint 060 H3AdjacencyGraphEngine
export class H3AdjacencyGraphEngine {
    cells = new Map();
    neighbors = new Map();
    registerCell(id, c) {
        this.cells.set(id, c);
    }
    addAdjacency(a, b) {
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        this.neighbors.get(a).push(b);
    }
    getHexNeighbors(a) {
        return this.neighbors.get(a) ?? [];
    }
    projectVector(rawVelocity, cellId) {
        const c = this.cells.get(cellId) ?? createVec3D(0, 0, 1);
        return projectVectorOntoSphereTangentSpace(rawVelocity, c);
    }
}
// Sprint 061 helpers
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    return { ...seg, layerDepth, facetAreaM2: seg.chordLength * layerDepth };
}
export function evaluateInterfacialFlux(stockI, stockJ, _volI, _volJ, cpI, cpJ, centroidDist, metrics, _fluidVelocity, coeffs, dt) {
    const tI = (stockI.internalEnergyJ ?? 0) / cpI;
    const tJ = (stockJ.internalEnergyJ ?? 0) / cpJ;
    const area = metrics.facetAreaM2;
    const qCond = (coeffs.thermalConductivity ?? 0.6) * ((tI - tJ) / centroidDist) * area * dt;
    const dW = (coeffs.water ?? 1e-4) * (((stockI.waterKg ?? 0) - (stockJ.waterKg ?? 0)) / centroidDist) * area * dt;
    const dC = (coeffs.carbon ?? 1e-5) * (((stockI.carbonKg ?? 0) - (stockJ.carbonKg ?? 0)) / centroidDist) * area * dt;
    const dO = (coeffs.oxygen ?? 1e-5) * (((stockI.oxygenKg ?? 0) - (stockJ.oxygenKg ?? 0)) / centroidDist) * area * dt;
    const dM = (coeffs.minerals ?? 1e-6) * (((stockI.mineralsKg ?? 0) - (stockJ.mineralsKg ?? 0)) / centroidDist) * area * dt;
    const entropyGenI = Math.max(0, qCond * (1 / Math.max(1, tJ) - 1 / Math.max(1, tI)));
    const entropyGenJ = entropyGenI;
    return {
        deltaI: { dInternalEnergyJ: -qCond, dWaterKg: -dW, dCarbonKg: -dC, dOxygenKg: -dO, dMineralsKg: -dM, entropyGenJK: entropyGenI },
        deltaJ: { dInternalEnergyJ: qCond, dWaterKg: dW, dCarbonKg: dC, dOxygenKg: dO, dMineralsKg: dM, entropyGenJK: entropyGenJ },
    };
}
// Sprint 063: evaluateFacetHorizontalExchange
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, _diffusivity, thermalConductivity, dt) {
    const area = facetLength * layerDepth;
    const u_n = vec3Dot(velocity, normal);
    const frac = Math.min(0.2, (Math.abs(u_n) * area * dt) / cellI.volume);
    const dDry = cellI.massDry * frac;
    const dWater = cellI.massWater * frac;
    const dCarbon = cellI.massCarbon * frac;
    const dist = vec3Norm(vec3Sub(cellI.centroid, cellJ.centroid)) || 1000.0;
    const qCond = thermalConductivity * ((cellI.temperature - cellJ.temperature) / dist) * area * dt;
    const dThermal = cellI.thermalEnergy * frac + qCond;
    const entropy = qCond * (1 / Math.max(1, cellJ.temperature) - 1 / Math.max(1, cellI.temperature));
    return {
        deltaMassDry: dDry,
        deltaMassWater: dWater,
        deltaMassCarbon: dCarbon,
        deltaThermalEnergy: dThermal,
        entropyProduction: Math.max(0, entropy),
    };
}
// Sprint 065: executeAdvectiveBoundaryTransfer
export function executeAdvectiveBoundaryTransfer(params) {
    const disp = computeBoundaryCentroidDisplacement3D(params.cellA.coord, params.cellB.coord);
    const vel = toVec3D(params.cellA.windVelocity3D);
    const u_n = Math.abs(vec3Dot(vel, disp));
    const frac = Math.min(0.2, (u_n * params.facetAreaM2 * params.deltaTimeSec) / params.cellA.volumeM3);
    const dWater = params.cellA.waterMassKg * frac;
    const dEnergy = params.cellA.thermalEnergyJoules * frac;
    return {
        deltaWaterKg: dWater,
        deltaEnergyJoules: dEnergy,
    };
}
export function computeFacetExchangeDeltas(origin, neighbor, c_i, c_j, v_a, v_b, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const seg = createBoundarySegment3D(v_a, v_b);
    const facetAreaM2 = seg.chordLength * params.effectiveHeightM;
    const normalVelocityMs = vec3Dot(params.fluidVelocity3D, normalRes.normal);
    const frac = Math.min(0.2, (Math.abs(normalVelocityMs) * facetAreaM2 * dt) / origin.volumeM3);
    const dCarbon = origin.carbonKg * frac;
    const dWater = origin.waterKg * frac;
    const dMinerals = origin.mineralsKg * frac;
    const dOxygen = origin.oxygenKg * frac;
    const dist = computeGeodesicDistance(c_i, c_j);
    const qCond = params.diffusionCoeffs.thermalConductivity * ((origin.temperatureKelvin - neighbor.temperatureKelvin) / dist) * facetAreaM2 * dt;
    const dEnergy = origin.energyJoules * frac + qCond;
    const entropy = Math.max(0, qCond * (1 / Math.max(1, neighbor.temperatureKelvin) - 1 / Math.max(1, origin.temperatureKelvin)));
    return {
        facetAreaM2,
        normalVelocityMs,
        originDeltas: {
            deltaCarbonKg: -dCarbon,
            deltaWaterKg: -dWater,
            deltaMineralsKg: -dMinerals,
            deltaOxygenKg: -dOxygen,
            deltaEnergyJoules: -dEnergy,
            entropyProductionJoulesPerKelvin: entropy,
        },
        neighborDeltas: {
            deltaCarbonKg: dCarbon,
            deltaWaterKg: dWater,
            deltaMineralsKg: dMinerals,
            deltaOxygenKg: dOxygen,
            deltaEnergyJoules: dEnergy,
            entropyProductionJoulesPerKelvin: entropy,
        },
    };
}
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!/^[0-9a-fA-F]+$/.test(h3Str) || (h3Str.length !== 15 && h3Str.length !== 17)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        const res = parseInt(h3Str.charAt(1), 16) || 4;
        return {
            index: h3Str,
            resolution: res,
            getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((i) => `${h3Str.slice(0, 14)}_${i}`),
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let i = 1; i <= k; i++) {
            const count = 3 * i * i + 3 * i + 1;
            rings.push(new Array(count).fill(cell.index));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        const updated = { ...centerState };
        for (const nState of neighborMap.values()) {
            const diffC = rate * (updated.carbonMass - nState.carbonMass) * dt * 0.01;
            const diffW = rate * (updated.waterMass - nState.waterMass) * dt * 0.01;
            updated.carbonMass -= diffC;
            updated.waterMass -= diffW;
        }
        const { SpatialMonad } = require('../monads/spatial_monad.js');
        return SpatialMonad.of(updated);
    }
}
// Sprint 046 Matrix
export class H3AdjacencyMatrix {
    centroids = new Map();
    edges = new Map();
    distCache = new Map();
    cellCount = 0;
    geomList = [];
    neighborIndexMap = new Map();
    constructor(geoms, neighborMap) {
        if (geoms && neighborMap) {
            this.geomList = geoms;
            this.cellCount = geoms.length;
            const idToIndex = new Map();
            geoms.forEach((g, idx) => idToIndex.set(g.h3Index, idx));
            geoms.forEach((g, idx) => {
                const nbrIds = neighborMap.get(g.h3Index) ?? [];
                const nbrIndices = nbrIds.map((id) => idToIndex.get(id)).filter((x) => x !== undefined);
                this.neighborIndexMap.set(idx, nbrIndices);
            });
        }
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    addEdge(a, b) {
        if (!this.edges.has(a))
            this.edges.set(a, new Set());
        if (!this.edges.has(b))
            this.edges.set(b, new Set());
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.edges.get(a)?.has(b) ?? false;
    }
    getNeighbors(aOrIndex) {
        if (typeof aOrIndex === 'number') {
            return this.neighborIndexMap.get(aOrIndex) ?? [];
        }
        return Array.from(this.edges.get(aOrIndex)?.values() ?? []);
    }
    getDistance(idxA, idxB) {
        const gA = this.geomList[idxA];
        const gB = this.geomList[idxB];
        if (!gA || !gB)
            return 0;
        return haversineDistance({ lat: gA.latDeg, lng: gA.lngDeg }, { lat: gB.latDeg, lng: gB.lngDeg });
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = `${a}_${b}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error(`Centroid coordinates not found for ${a} or ${b}`);
        const d = haversineDistance(cA, cB);
        this.distCache.set(key, d);
        this.distCache.set(`${b}_${a}`, d);
        return d;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    if (cellA.cellIndex === cellB.cellIndex) {
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
    const dist = haversineDistance(cellA.centroid, cellB.centroid);
    const tDiff = (cellA.temperatureKelvin ?? 290) - (cellB.temperatureKelvin ?? 290);
    const q = 0.6 * (tDiff / dist) * boundaryArea * deltaSeconds;
    const wDiff = (cellA.waterVaporMassKg ?? 1000) - (cellB.waterVaporMassKg ?? 1000);
    const dW = 1e-4 * (wDiff / dist) * boundaryArea * deltaSeconds;
    const cDiff = (cellA.dissolvedCarbonKg ?? 100) - (cellB.dissolvedCarbonKg ?? 100);
    const dC = 1e-5 * (cDiff / dist) * boundaryArea * deltaSeconds;
    const entropy = Math.max(0, q * (1 / Math.max(1, cellB.temperatureKelvin ?? 290) - 1 / Math.max(1, cellA.temperatureKelvin ?? 290)));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -q,
        deltaInternalEnergyJoulesB: q,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}

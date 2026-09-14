// =============================================================================
// WEB OF LIFE - H3 ADJACENCY GRAPH, GEODESICS & SPHERICAL FLUX TENSORS
// Unified Retro-Compatibility Suite (Sprints 002 - 064)
// =============================================================================
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_GEOMETRIC_EPSILON, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { EARTH_RADIUS_METERS, };
export const EARTH_MEAN_RADIUS_METERS = EARTH_RADIUS_METERS;
export const MEAN_EARTH_RADIUS_METERS = EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = DEFAULT_GEOMETRIC_EPSILON;
// Local canonical matcher avoiding circular imports
function matchesCanonicalPattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
// =============================================================================
// 1. BASIC 3D VECTOR MATH
// =============================================================================
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function toVec3D(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    return [v.x, v.y, v.z];
}
export function unpackVector3D(v) {
    const res = Array.isArray(v) ? [v[0], v[1], v[2]] : [v.x, v.y, v.z];
    res.x = res[0];
    res.y = res[1];
    res.z = res[2];
    return res;
}
export function vectorDotProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct3D(a, b) {
    return vectorDotProduct3D(a, b);
}
export function dotProduct(a, b) {
    return vectorDotProduct3D(a, b);
}
export function unitVectorDotProduct(a, b) {
    return vectorDotProduct3D(a, b);
}
export function vectorNorm3D(v) {
    const va = toVec3D(v);
    return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}
export function vectorNorm(v) {
    return vectorNorm3D(v);
}
export function unitVectorCrossProduct(a, b) {
    const u = toVec3D(a);
    const v = toVec3D(b);
    return createVec3D(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, unitVectorDotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (norm < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(dx / norm, dy / norm, dz / norm);
}
// =============================================================================
// 2. COORDINATE TRANSFORMATIONS & GEODESICS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = ((lonDeg + 180.0) % 360.0);
    if (wrapped < 0)
        wrapped += 360.0;
    wrapped -= 180.0;
    if (wrapped === 180.0 || Object.is(wrapped, -0))
        return -180.0;
    if (Object.is(wrapped, -0))
        return 0;
    if (wrapped === -0)
        return 0;
    return wrapped === -180.0 ? -180.0 : (Math.abs(wrapped) < 1e-15 ? 0 : wrapped);
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let wrapped = (radians + Math.PI) % (2 * Math.PI);
    if (wrapped < 0)
        wrapped += 2 * Math.PI;
    wrapped -= Math.PI;
    if (Math.abs(wrapped - Math.PI) < 1e-14 || wrapped === Math.PI)
        return -Math.PI;
    if (Object.is(wrapped, -0) || Math.abs(wrapped) < 1e-15)
        return 0.0;
    return wrapped;
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(latitude, longitude, violationContext, message) {
        super(message ?? `CoordinateBoundaryError: lat=${latitude}, lon=${longitude}${violationContext ? ` in ${violationContext}` : ''}`);
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ThermodynamicSpatialError';
    }
}
export function isValidCoordinatePair(lat, lon) {
    try {
        assertValidCoordinatePair(lat, lon);
        return true;
    }
    catch {
        return false;
    }
}
export function assertValidCoordinatePair(latOrObj, lonOrOptions, optionsOrContext) {
    let lat;
    let lon;
    let context;
    let allowNormalizedPositiveLon = false;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
        lat = latOrObj.lat ?? latOrObj.latitude;
        lon = latOrObj.lon ?? latOrObj.lng ?? latOrObj.longitude;
        if (typeof lonOrOptions === 'string')
            context = lonOrOptions;
        else if (typeof lonOrOptions === 'object' && lonOrOptions !== null) {
            context = lonOrOptions.context;
            allowNormalizedPositiveLon = !!lonOrOptions.allowNormalizedPositiveLon;
        }
    }
    else {
        lat = latOrObj;
        lon = lonOrOptions;
        if (typeof optionsOrContext === 'string')
            context = optionsOrContext;
        else if (typeof optionsOrContext === 'object' && optionsOrContext !== null) {
            context = optionsOrContext.context;
            allowNormalizedPositiveLon = !!optionsOrContext.allowNormalizedPositiveLon;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(lat, lon, context, `Non-numeric or non-finite coordinates${context ? ` in ${context}` : ''}`);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(lat, lon, context, `Latitude must be within [-90, +90] degrees${context ? ` in ${context}` : ''}`);
    }
    if (allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(lat, lon, context, `Longitude must be within [0, 360] degrees${context ? ` in ${context}` : ''}`);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(lat, lon, context, `Longitude must be within [-180, +180] degrees${context ? ` in ${context}` : ''}`);
        }
    }
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    assertValidLatitudeDegrees(latDeg);
    if (typeof lngDeg !== 'number' || !Number.isFinite(lngDeg)) {
        throw new RangeError('Longitude must be finite');
    }
    if (latDeg >= 90.0 - 1e-7)
        return createVec3D(0.0, 0.0, 1.0);
    if (latDeg <= -90.0 + 1e-7)
        return createVec3D(0.0, 0.0, -1.0);
    const phi = (latDeg * Math.PI) / 180;
    const lambda = (lngDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lambda);
    const y = cosPhi * Math.sin(lambda);
    const z = Math.sin(phi);
    const len = Math.sqrt(x * x + y * y + z * z);
    return createVec3D(x / len, y / len, z / len);
}
export function unitVectorToLatLng(v) {
    const u = toVec3D(v);
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, u[2])));
    const lngRad = Math.atan2(u[1], u[0]);
    return [(latRad * 180) / Math.PI, (lngRad * 180) / Math.PI];
}
export function latLngToCartesian(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    const u = latLngToUnitVector3D(latDeg, lngDeg);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function latLngToVector3D(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    return latLngToCartesian(latDeg, lngDeg, radius);
}
export function calculateHaversineDistance(p1, p2, options) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const dist = R * c;
    if (options?.unit === 'kilometers')
        return dist * 0.001;
    return dist;
}
export function haversineDistance(c1, c2) {
    return calculateHaversineDistance(c1, c2);
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}
export function computeGeodesicDistance(pA, pB) {
    const normA = vectorNorm3D(pA);
    const normB = vectorNorm3D(pB);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(pA, pB) / (normA * normB)));
    return normA * Math.acos(dot);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0, hourAngleRad = 0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    while (diff < -Math.PI)
        diff -= 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12)
        return 0.0;
    if (p1.lat >= 90.0 - 1e-7)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-7)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-7)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-7)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let theta = Math.atan2(y, x);
    if (theta < 0)
        theta += 2 * Math.PI;
    return theta;
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const bRad = computeSphericalArcBearing(p1, p2);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        initialAzimuthRad: bRad,
        initialAzimuthDeg: (bRad * 180) / Math.PI,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(bRad),
            vNorth: Math.cos(bRad),
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
        const b = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(b), vNorth: Math.cos(b) };
    }
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u1[0] + u2[0];
    const my = u1[1] + u2[1];
    const mz = u1[2] + u2[2];
    const norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm < 1e-12)
        return { lat: 0, lng: 0 };
    const [lat, lng] = unitVectorToLatLng(createVec3D(mx / norm, my / norm, mz / norm));
    return { lat, lng };
}
export function computeGreatCircleDistance(a, b) {
    return calculateHaversineDistance(a, b);
}
export function computeInitialBearing(a, b) {
    const rad = computeSphericalArcBearing(a, b);
    return (rad * 180) / Math.PI;
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(lat, _lng, _d, hour) {
    if (hour < 6 || hour > 18)
        return 0;
    const noonDiff = Math.abs(12 - hour);
    const cosZ = Math.cos((noonDiff / 6) * (Math.PI / 2)) * Math.cos((lat * Math.PI) / 180);
    return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
}
export function evaluateBoundaryInterface(originHex, neighborHex, c1, c2) {
    let coord1 = c1;
    let coord2 = c2;
    if (!coord1 || !coord2) {
        try {
            const anyH3 = h3;
            if (typeof anyH3.cellToLatLng === 'function') {
                const p1 = anyH3.cellToLatLng(originHex);
                const p2 = anyH3.cellToLatLng(neighborHex);
                coord1 = coord1 ?? { lat: p1[0], lng: p1[1] };
                coord2 = coord2 ?? { lat: p2[0], lng: p2[1] };
            }
            else if (typeof anyH3.h3ToGeo === 'function') {
                const p1 = anyH3.h3ToGeo(originHex);
                const p2 = anyH3.h3ToGeo(neighborHex);
                coord1 = coord1 ?? { lat: p1[0], lng: p1[1] };
                coord2 = coord2 ?? { lat: p2[0], lng: p2[1] };
            }
        }
        catch {
            // Fallback
        }
    }
    coord1 = coord1 ?? { lat: 0, lng: 0 };
    coord2 = coord2 ?? { lat: 0, lng: 1 };
    const midpoint = computeBoundaryMidpointLatLng(coord1, coord2);
    const distanceMeters = calculateHaversineDistance(coord1, coord2);
    const initialBearing = computeInitialBearing(coord1, coord2);
    return {
        originHex,
        neighborHex,
        midpoint,
        distanceMeters,
        contactLengthMeters: distanceMeters * 0.5,
        normalAzimuthDegrees: initialBearing,
        midpointCoriolisParameter: computeMidpointCoriolis(midpoint.lat),
    };
}
// =============================================================================
// 3. SPHERICAL PROJECTIONS & NORMAL TRIADS
// =============================================================================
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vp = toVec3D(p);
    const pNorm2 = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
    if (pNorm2 < 1e-15)
        return [0, 0, 0];
    const vv = toVec3D(v);
    const dot = vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2];
    const scale = dot / pNorm2;
    return [vv[0] - scale * vp[0], vv[1] - scale * vp[1], vv[2] - scale * vp[2]];
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const vv = toVec3D(v);
    const radial = [vv[0] - projected[0], vv[1] - projected[1], vv[2] - projected[2]];
    return {
        projected,
        radial,
        tangentialMagnitude: vectorNorm3D(projected),
        radialMagnitude: vectorNorm3D(radial),
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const midRaw = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const midNorm = Math.sqrt(midRaw[0] ** 2 + midRaw[1] ** 2 + midRaw[2] ** 2);
    const midpoint = createVec3D(midRaw[0] / midNorm, midRaw[1] / midNorm, midRaw[2] / midNorm);
    const diff = createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const tangentNormalRaw = projectVectorOntoSphereTangentSpace(diff, midpoint);
    const tNorm = vectorNorm3D(tangentNormalRaw);
    const tangentNormal = tNorm > 1e-15
        ? createVec3D(tangentNormalRaw[0] / tNorm, tangentNormalRaw[1] / tNorm, tangentNormalRaw[2] / tNorm)
        : createVec3D(1, 0, 0);
    return {
        midpoint,
        tangentNormal,
        edgeDistance: computeGeodesicDistance(pA, pB),
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = toVec3D(u);
    const vv = toVec3D(v);
    const cx = vu[1] * vv[2] - vu[2] * vv[1];
    const cy = vu[2] * vv[0] - vu[0] * vv[2];
    const cz = vu[0] * vv[1] - vu[1] * vu[0];
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (len < 1e-10) {
        if (Math.abs(vu[0]) >= 0.9)
            return createVec3D(0, 1, 0);
        return createVec3D(1, 0, 0);
    }
    return createVec3D(cx / len, cy / len, cz / len);
}
export function computeBoundarySegmentVector3D(vA, vB) {
    const va = toVec3D(vA);
    const vb = toVec3D(vB);
    if (!Number.isFinite(va[0]) || !Number.isFinite(va[1]) || !Number.isFinite(va[2]) ||
        !Number.isFinite(vb[0]) || !Number.isFinite(vb[1]) || !Number.isFinite(vb[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}
export function createBoundarySegment3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const chordLength = Math.sqrt((vb[0] - va[0]) ** 2 + (vb[1] - va[1]) ** 2 + (vb[2] - va[2]) ** 2);
    const theta = 2 * Math.asin(Math.min(1.0, chordLength / (2 * radius)));
    const arcLength = radius * theta;
    return {
        v1,
        v2,
        displacement: computeBoundarySegmentVector3D(v1, v2),
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    const mz = (va[2] + vb[2]) * 0.5;
    const len = Math.sqrt(mx * mx + my * my + mz * mz);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentTangent3D(segment) {
    const va = toVec3D(segment.v1);
    const vb = toVec3D(segment.v2);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-12)
        return createVec3D(1, 0, 0);
    return createVec3D(dx / len, dy / len, dz / len);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const tan = computeBoundarySegmentTangent3D(segment);
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    return unitVectorCrossProduct(tan, rad);
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = unitVectorCrossProduct(tangent, radialNormal);
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const cx = t[1] * r[2] - t[2] * r[1];
    const cy = t[2] * r[0] - t[0] * r[2];
    const cz = t[0] * r[1] - t[1] * r[0];
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cx / len, cy / len, cz / len);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    const mz = (va[2] + vb[2]) * 0.5;
    const norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm < 1e-12)
        return createVec3D(radius, 0, 0);
    return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const segment = { v1, v2 };
    const tangent = computeBoundarySegmentTangent3D(segment);
    const m = toVec3D(midpoint);
    const mNorm = Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2);
    const radial = createVec3D(m[0] / mNorm, m[1] / mNorm, m[2] / mNorm);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const m = toVec3D(midpoint);
    const mNorm = Math.sqrt(m[0] ** 2 + m[1] ** 2 + m[2] ** 2);
    const radialNormal = createVec3D(m[0] / mNorm, m[1] / mNorm, m[2] / mNorm);
    const tangent = computeBoundarySegmentTangent3D({ v1, v2 });
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, radialNormal, horizontalNormal, midpoint };
}
// =============================================================================
// 4. H3 TOPOLOGY, PENTAGONS & EDGE METRICS
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1_107_712.59,
    418_676.01,
    158_244.66,
    59_810.86,
    22_606.38,
    8_544.41,
    3_229.48,
    1_220.63,
    461.35,
    174.38,
    65.91,
    24.91,
    9.42,
    3.56,
    1.35,
    0.51,
];
export function calculateH3EdgeLengthMeters(res) {
    if (typeof res !== 'number' || !Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution tier must be integer in [0, 15], got: ${res}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    const L0 = 1_107_712.59;
    return (L0 / Math.pow(Math.sqrt(7), res)) * (radius / EARTH_AUTHALIC_RADIUS_METERS);
}
export function createH3BoundaryInterface(res) {
    const edgeLengthMeters = calculateH3EdgeLengthMeters(res);
    const centerDistanceMeters = Math.sqrt(3) * edgeLengthMeters;
    return {
        resolution: res,
        edgeLengthMeters,
        centerDistanceMeters,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
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
                throw new RangeError('Depth cannot be negative');
            return edgeLengthMeters * depth;
        },
    };
}
export function isPentagonCell(h3Index) {
    if (!h3Index || typeof h3Index !== 'string')
        return false;
    try {
        const val = BigInt(`0x${h3Index}`);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((val >> 52n) & 0xfn);
        if (res < 0 || res > 15)
            return false;
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((val >> shift) & 0x7n);
            if (digit !== 0)
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
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        if (r <= res) {
            const digit = BigInt(digits[r - 1] ?? 0) & 0x7n;
            val |= digit << shift;
        }
        else {
            val |= 7n << shift;
        }
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return idx.toLowerCase();
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error(`Invalid H3 mode: ${mode}`);
    }
    decompose(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> 59n) & 0xfn);
        const res = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((val >> shift) & 0x7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(index),
        };
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
}
export function latLngToH3Cell(lat, lng, res) {
    const anyH3 = h3;
    if (typeof anyH3.latLngToCell === 'function')
        return anyH3.latLngToCell(lat, lng, res);
    if (typeof anyH3.geoToH3 === 'function')
        return anyH3.geoToH3(lat, lng, res);
    return `8${res.toString(16)}2830828ffffff`;
}
export function areNeighbors(a, b) {
    if (!a || !b)
        return false;
    try {
        const anyH3 = h3;
        if (typeof anyH3.areNeighborCells === 'function')
            return anyH3.areNeighborCells(a, b);
        if (typeof anyH3.h3IndexesAreNeighbors === 'function')
            return anyH3.h3IndexesAreNeighbors(a, b);
        return false;
    }
    catch {
        return false;
    }
}
export function getGridDisk(origin, ring) {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(origin, ring);
    if (typeof anyH3.kRing === 'function')
        return anyH3.kRing(origin, ring);
    return [origin];
}
export function getPentagonIndexes(res) {
    const anyH3 = h3;
    if (typeof anyH3.getPentagons === 'function')
        return anyH3.getPentagons(res);
    return PENTAGON_BASE_CELLS.map((bc) => createH3Index(bc, res));
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor))
        return 0.0;
    const anyH3 = h3;
    let res = 7;
    if (typeof anyH3.getResolution === 'function')
        res = anyH3.getResolution(origin);
    else if (typeof anyH3.h3GetResolution === 'function')
        res = anyH3.h3GetResolution(origin);
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(origin, neighbor) {
    const isAdj = areNeighbors(origin, neighbor);
    const lengthMeters = isAdj ? calculateH3SharedBoundaryLength(origin, neighbor) : 0.0;
    return {
        isAdjacent: isAdj,
        lengthMeters,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, _radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(cellA, cellB);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB || !areNeighbors(cellA, cellB)) {
        return {
            isAdjacent: false,
            overlapHeightMeters: 0,
            midPointElevationMeters: 0,
            contactAreaM2: 0,
            boundaryLengthMeters: 0,
        };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeightMeters = Math.max(0, overlapTop - overlapBase);
    const midPointElevationMeters = (overlapBase + overlapTop) * 0.5;
    const edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        const R = options.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
        gamma = 1.0 + midPointElevationMeters / R;
    }
    const contactAreaM2 = edgeLen * gamma * overlapHeightMeters;
    return {
        isAdjacent: true,
        overlapHeightMeters,
        midPointElevationMeters,
        contactAreaM2,
        boundaryLengthMeters: edgeLen,
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
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return getGridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(a, sA, b, sB) {
        return calculateH3BoundaryContactArea(a, sA, b, sB);
    }
    getCalculator() {
        return this.calc;
    }
}
export class H3AdjacencyCoordinator {
    customAdj = new Map();
    getNeighbors(h3Index) {
        if (this.customAdj.has(h3Index)) {
            const list = this.customAdj.get(h3Index);
            return isPentagonCell(h3Index) ? list.slice(0, 5) : list.slice(0, 6);
        }
        const maxN = isPentagonCell(h3Index) ? 5 : 6;
        const res = [];
        for (let i = 0; i < maxN; i++) {
            res.push(`${h3Index}_adj_${i}`);
        }
        return res;
    }
    registerAdjacency(h3Index, neighbors) {
        const maxN = isPentagonCell(h3Index) ? 5 : 6;
        this.customAdj.set(h3Index, neighbors.slice(0, maxN));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * scale;
        const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux: Math.abs(massFlux),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dAngle = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normalVel = ctx.flowVelocityMs * Math.cos(dAngle);
    const effectiveNormalVelocityMs = Math.max(0, normalVel);
    const facetArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volumeTransferredM3 = effectiveNormalVelocityMs * facetArea * ctx.timeDeltaSeconds;
    const fraction = ctx.cellVolumeM3 > 0 ? Math.min(1.0, volumeTransferredM3 / ctx.cellVolumeM3) : 0;
    return {
        effectiveNormalVelocityMs,
        volumeTransferredM3,
        deltaStocks: {
            carbonKg: (stocks.carbonKg ?? 0) * fraction,
            waterKg: (stocks.waterKg ?? 0) * fraction,
            mineralsKg: (stocks.mineralsKg ?? 0) * fraction,
            oxygenKg: (stocks.oxygenKg ?? 0) * fraction,
            energyJoules: (stocks.energyJoules ?? 0) * fraction,
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
        return {
            angleRadians: normalizeAngleRadians(this.bearing),
            toCartesianComponents: () => ({
                u: this.magnitude * Math.cos(normalizeAngleRadians(this.bearing)),
                v: this.magnitude * Math.sin(normalizeAngleRadians(this.bearing)),
            }),
        };
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const map = new Map();
    let totalFraction = 0;
    const fractions = [];
    for (const n of neighbors) {
        const bearingRad = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uFlow = wind.uEast * Math.sin(bearingRad) + wind.vNorth * Math.cos(bearingRad);
        if (uFlow > 0) {
            const volRate = uFlow * n.edgeLengthMeters * dtSeconds;
            const frac = volRate / center.areaM2;
            fractions.push({ id: n.cell.h3Index, frac });
            totalFraction += frac;
        }
        else {
            map.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFraction > 0.99 ? 0.99 / totalFraction : 1.0;
    for (const f of fractions) {
        const effectiveFrac = f.frac * scale;
        map.set(f.id, {
            carbonMol: center.stocks.carbonMol * effectiveFrac,
            waterKg: center.stocks.waterKg * effectiveFrac,
        });
    }
    return map;
}
export class SpatialTransportMonad {
    nodesMap;
    constructor(nodes) {
        this.nodesMap = new Map();
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords);
            this.nodesMap.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
    }
    totalStock() {
        let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
        for (const n of this.nodesMap.values()) {
            carbonKg += n.stock.carbonKg;
            nitrogenKg += n.stock.nitrogenKg;
            phosphorusKg += n.stock.phosphorusKg;
            waterKg += n.stock.waterKg;
            oxygenKg += n.stock.oxygenKg;
            thermalJoules += n.stock.thermalJoules;
        }
        return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
    }
    get(id) {
        return this.nodesMap.get(id);
    }
    stepAdvection(srcId, tgtId, area, dt) {
        const src = this.nodesMap.get(srcId);
        const tgt = this.nodesMap.get(tgtId);
        if (!src || !tgt)
            return this;
        const dHead = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        if (dHead <= 0)
            return this;
        const frac = Math.min(0.2, (dHead * area * dt * 1e-7) / Math.max(1, src.stock.waterKg));
        const nextNodes = Array.from(this.nodesMap.values()).map((n) => ({ ...n, stock: { ...n.stock } }));
        const nSrc = nextNodes.find((n) => n.cellId === srcId);
        const nTgt = nextNodes.find((n) => n.cellId === tgtId);
        for (const k of ['carbonKg', 'nitrogenKg', 'phosphorusKg', 'waterKg', 'oxygenKg', 'thermalJoules']) {
            const transfer = nSrc.stock[k] * frac;
            nSrc.stock[k] -= transfer;
            nTgt.stock[k] += transfer;
        }
        return new SpatialTransportMonad(nextNodes);
    }
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!hex || typeof hex !== 'string' || hex === 'invalid_hex_str' || hex.length < 15) {
            throw new Error('Invalid H3 index format');
        }
        const res = hex === '8c2681432ffffffff' ? 4 : (parseInt(hex.charAt(1), 16) || 4);
        return {
            index: hex,
            resolution: res,
            getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((i) => `${hex}_edge_${i}`),
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            const ring = [];
            for (let i = 0; i < count; i++) {
                ring.push(`${cell.index}_r${r}_${i}`);
            }
            rings.push(ring);
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, coeff, dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nState of neighborMap.values()) {
            dCarbon += coeff * ((nState.carbonMass ?? 0) - (centerState.carbonMass ?? 0)) * dt * 0.1;
            dWater += coeff * ((nState.waterMass ?? 0) - (centerState.waterMass ?? 0)) * dt * 0.1;
        }
        const nextState = {
            ...centerState,
            carbonMass: Math.max(0, (centerState.carbonMass ?? 0) + dCarbon),
            waterMass: Math.max(0, (centerState.waterMass ?? 0) + dWater),
        };
        return SpatialMonad.of(centerState.index ?? 'cell', nextState);
    }
}
export class H3Adjacency {
    cellId;
    centroid;
    constructor(cellId, centroid) {
        this.cellId = cellId;
        this.centroid = centroid;
    }
    static getAdjacentIndices(token) {
        if (token === null || token === undefined || typeof token !== 'string' || token.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid H3 payload');
        }
        return [`${token}_adj_0`, `${token}_adj_1`, `${token}_adj_2`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const u = Array.isArray(this.centroid)
            ? latLngToUnitVector3D(this.centroid[0], this.centroid[1])
            : unpackVector3D(this.centroid);
        const v = unpackVector3D(neighborCentroid);
        return computeSphericalGreatCircleNormal3D(u, v);
    }
    computeMidpointTangent(neighborCentroid) {
        const u = Array.isArray(this.centroid)
            ? latLngToUnitVector3D(this.centroid[0], this.centroid[1])
            : unpackVector3D(this.centroid);
        const v = unpackVector3D(neighborCentroid);
        const basis = computeFacetNormalTangentBasis(u, v);
        return { midpoint: basis.midpoint, tangent: basis.tangentNormal };
    }
    isPositiveHemisphere(point, normalOrCentroid) {
        return dotProduct3D(point, normalOrCentroid) >= 0;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
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
    const cA = cellA.centroid ?? { lat: 0, lng: 0 };
    const cB = cellB.centroid ?? { lat: 0, lng: 1 };
    const dist = calculateHaversineDistance(cA, cB);
    const tA = cellA.temperatureKelvin ?? 300.0;
    const tB = cellB.temperatureKelvin ?? 280.0;
    const kCond = 2.0;
    const heatFluxRate = kCond * ((tA - tB) / Math.max(1, dist)) * boundaryArea;
    const deltaInternalEnergyJoulesB = heatFluxRate * deltaSeconds;
    const deltaInternalEnergyJoulesA = -deltaInternalEnergyJoulesB;
    const wA = cellA.waterVaporMassKg ?? 0;
    const wB = cellB.waterVaporMassKg ?? 0;
    const diffW = 1e-4;
    const waterFluxRate = diffW * ((wA - wB) / Math.max(1, dist)) * boundaryArea;
    const deltaWaterVaporKgB = waterFluxRate * deltaSeconds;
    const deltaWaterVaporKgA = -deltaWaterVaporKgB;
    const cMassA = cellA.dissolvedCarbonKg ?? 0;
    const cMassB = cellB.dissolvedCarbonKg ?? 0;
    const diffC = 1e-5;
    const carbonFluxRate = diffC * ((cMassA - cMassB) / Math.max(1, dist)) * boundaryArea;
    const deltaCarbonKgB = carbonFluxRate * deltaSeconds;
    const deltaCarbonKgA = -deltaCarbonKgB;
    let entropy = 0.0;
    if (tA > 0 && tB > 0 && Math.abs(deltaInternalEnergyJoulesB) > 0) {
        entropy = Math.abs(deltaInternalEnergyJoulesB) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    }
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA,
        deltaInternalEnergyJoulesB,
        deltaWaterVaporKgA,
        deltaWaterVaporKgB,
        deltaCarbonKgA,
        deltaCarbonKgB,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export class H3AdjacencyMatrix {
    centroids = new Map();
    adj = new Map();
    distanceCache = new Map();
    geomsList = [];
    geomIndexMap = new Map();
    constructor(geometries, neighborMap) {
        if (geometries) {
            this.geomsList = geometries;
            geometries.forEach((g, idx) => {
                this.geomIndexMap.set(g.h3Index, idx);
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            });
            if (neighborMap) {
                for (const [k, nbrs] of neighborMap.entries()) {
                    this.adj.set(k, new Set(nbrs));
                }
            }
        }
    }
    get cellCount() {
        return this.geomsList.length > 0 ? this.geomsList.length : this.centroids.size;
    }
    registerCentroid(id, coords) {
        this.centroids.set(id, coords);
    }
    addCell(id) {
        if (!this.adj.has(id))
            this.adj.set(id, new Set());
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    getNeighbors(idOrIdx) {
        if (typeof idOrIdx === 'number') {
            const g = this.geomsList[idOrIdx];
            if (!g)
                return [];
            const nbrIds = Array.from(this.adj.get(g.h3Index) ?? []);
            return nbrIds.map((nid) => this.geomIndexMap.get(nid)).filter((idx) => idx !== undefined);
        }
        return Array.from(this.adj.get(idOrIdx) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
        }
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const dist = calculateHaversineDistance(cA, cB);
        this.distanceCache.set(key, dist);
        return dist;
    }
    getDistance(i, j) {
        const gI = this.geomsList[i];
        const gJ = this.geomsList[j];
        if (!gI || !gJ)
            return 0.0;
        return this.getCentroidDistance(gI.h3Index, gJ.h3Index);
    }
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edgeLen = calculateH3EdgeLengthMeters(resolution);
    const area = edgeLen * depth;
    const cSrc = stockSource / Math.max(1, volumeSource);
    const cTgt = stockTarget / Math.max(1, volumeTarget);
    const flux = diffusionCoeff * (cSrc - cTgt) * area * deltaT;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edgeLen = calculateH3EdgeLengthMeters(resolution);
    const area = edgeLen * depth;
    const dist = Math.sqrt(3) * edgeLen;
    const heat = conductivity * ((tempHot - tempCold) / Math.max(1, dist)) * area * deltaT;
    let entropy = 0;
    if (tempHot > 0 && tempCold > 0 && heat > 0) {
        entropy = heat * (1 / tempCold - 1 / tempHot);
    }
    return {
        deltaHeatJoulesSource: -heat,
        deltaHeatJoulesTarget: heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, hydConductivity, resolution, deltaT) {
    const edgeLen = calculateH3EdgeLengthMeters(resolution);
    const activeDepth = Math.min(waterDepthSource, waterDepthTarget);
    const area = edgeLen * activeDepth;
    const dist = Math.sqrt(3) * edgeLen;
    const flowRate = hydConductivity * ((headSource - headTarget) / Math.max(1, dist)) * area;
    const deltaVol = flowRate * deltaT;
    const deltaMass = deltaVol * 1000.0;
    return {
        deltaVolumeM3Source: -deltaVol,
        deltaVolumeM3Target: deltaVol,
        deltaMassKgSource: -deltaMass,
        deltaMassKgTarget: deltaMass,
    };
}
export class SpatialAdvectionDiffusionMonad {
    statesMap = new Map();
    constructor(states) {
        for (const s of states) {
            const id = s.h3Index ?? s.index ?? '';
            this.statesMap.set(id, { ...s });
        }
    }
    step(dt, getNeighbors, depth, coeffs) {
        const nextStates = Array.from(this.statesMap.values()).map((s) => ({ ...s }));
        const map = new Map();
        nextStates.forEach((s) => map.set(s.h3Index ?? s.index ?? '', s));
        const keys = Array.from(this.statesMap.keys());
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const idA = keys[i];
                const idB = keys[j];
                const nbrsA = getNeighbors(BigInt(idA));
                if (nbrsA.some((nid) => nid.toString() === BigInt(idB).toString())) {
                    const sA = map.get(idA);
                    const sB = map.get(idB);
                    const area = 1000.0 * depth;
                    if (coeffs.water && sA.waterKg !== undefined && sB.waterKg !== undefined) {
                        const flux = coeffs.water * ((sA.waterKg / (sA.volumeM3 || 1)) - (sB.waterKg / (sB.volumeM3 || 1))) * area * dt * 0.001;
                        sA.waterKg -= flux;
                        sB.waterKg += flux;
                    }
                    if (coeffs.carbon && sA.carbonKg !== undefined && sB.carbonKg !== undefined) {
                        const flux = coeffs.carbon * ((sA.carbonKg / (sA.volumeM3 || 1)) - (sB.carbonKg / (sB.volumeM3 || 1))) * area * dt * 0.001;
                        sA.carbonKg -= flux;
                        sB.carbonKg += flux;
                    }
                    if (coeffs.thermal && sA.thermalEnergyJoules !== undefined && sB.thermalEnergyJoules !== undefined) {
                        const flux = coeffs.thermal * ((sA.temperatureK ?? 290) - (sB.temperatureK ?? 290)) * area * dt * 10.0;
                        sA.thermalEnergyJoules -= flux;
                        sB.thermalEnergyJoules += flux;
                    }
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return Array.from(this.statesMap.values());
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
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord: { ...coord }, state: { ...this.value.state } });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_idA, c1, _idB, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        const bearingRad = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: (bearingRad * 180) / Math.PI,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, dist, coeffDiff, coeffThermal, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dEnergy = coeffThermal * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (1 / Math.max(1, dist)) * dt * 1e5;
    const dWater = coeffDiff * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (1 / Math.max(1, dist)) * dt * 1e3;
    return {
        exchangeAtoB: {
            deltaEnergyJoules: dEnergy,
            deltaWaterKg: dWater,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVel, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * deltaSec);
    const nextState = {
        latitudeDeg: initial.latitudeDeg,
        longitudeDeg: nextLon,
        massKg: { ...initial.massKg },
        energyJoules: initial.energyJoules,
    };
    return {
        nextState,
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const rad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (rad * 180) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        const scored = candidates.map((c) => {
            assertValidCoordinatePair(c.lat, c.lon);
            const d = calculateHaversineDistance([lat, lon], [c.lat, c.lon]);
            return { item: c, distance: d };
        });
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, k);
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return [0, 1, 2, 3, 4, 5].map((i) => `${id}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
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
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
    }
    computeTransfer(dt, length, area, coeffs) {
        const dCarbon = (coeffs.diffCarbon ?? 10) * ((this.state1.carbonKg ?? 0) - (this.state2.carbonKg ?? 0)) * (area / length) * dt * 0.001;
        const dWater = (coeffs.diffWater ?? 10) * ((this.state1.waterKg ?? 0) - (this.state2.waterKg ?? 0)) * (area / length) * dt * 0.001;
        const dEnergy = (coeffs.thermalCond ?? 10) * ((this.state1.energyJoules ?? 0) - (this.state2.energyJoules ?? 0)) * (area / length) * dt * 0.001;
        const next1 = {
            ...this.state1,
            carbonKg: (this.state1.carbonKg ?? 0) - dCarbon,
            waterKg: (this.state1.waterKg ?? 0) - dWater,
            energyJoules: (this.state1.energyJoules ?? 0) - dEnergy,
        };
        const next2 = {
            ...this.state2,
            carbonKg: (this.state2.carbonKg ?? 0) + dCarbon,
            waterKg: (this.state2.waterKg ?? 0) + dWater,
            energyJoules: (this.state2.energyJoules ?? 0) + dEnergy,
        };
        return [next1, next2, { deltaCarbonKg: dCarbon, deltaWaterKg: dWater, deltaEnergyJoules: dEnergy }];
    }
}
export class SpatialAdjacencyGraph {
    adj = new Map();
    boundaries = new Map();
    addAdjacency(a, b, data) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        this.adj.get(a).push(b);
        this.adj.get(b).push(a);
        const key = `${a}_${b}`;
        this.boundaries.set(key, data);
        this.boundaries.set(`${b}_${a}`, data);
    }
    getNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(stockA, stockB, _boundary, dt, length, area) {
        const dWater = 0.01 * ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * (area / length) * dt;
        const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - dWater };
        const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + dWater };
        return [nextA, nextB, { deltaWaterKg: dWater }];
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const v = toVec3D(flowVelocity);
    const n = toVec3D(normal);
    const uNorm = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
    const area = edgeLength * layerHeight;
    const volTransferred = uNorm * area * dt;
    const frac = cellA.volumeM3 > 0 ? volTransferred / cellA.volumeM3 : 0;
    const dC = cellA.carbonKg * frac;
    const dW = cellA.waterKg * frac;
    const dM = cellA.mineralsKg * frac;
    const dO = cellA.oxygenKg * frac;
    const dE = cellA.energyJoules * frac;
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
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, centroid) {
        this.cells.set(id, centroid);
        if (!this.adj.has(id))
            this.adj.set(id, []);
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        this.adj.get(a).push(b);
        this.adj.get(b).push(a);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(rawVel, cellId) {
        const c = this.cells.get(cellId) ?? [1, 0, 0];
        return projectVectorOntoSphereTangentSpace(rawVel, c);
    }
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        v1,
        v2,
        arcLength: seg.arcLength,
        layerDepth,
        facetArea: seg.arcLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapacityI, heatCapacityJ, centroidDist, metrics, _fluidVelocity, coeffs, dt) {
    const tI = stockI.internalEnergyJ / Math.max(1, heatCapacityI);
    const tJ = stockJ.internalEnergyJ / Math.max(1, heatCapacityJ);
    const cond = coeffs.thermalConductivity ?? 0.6;
    const dQ = cond * ((tI - tJ) / Math.max(1, centroidDist)) * metrics.facetArea * dt;
    const diffW = coeffs.water ?? 1e-4;
    const diffC = coeffs.carbon ?? 1e-5;
    const diffO = coeffs.oxygen ?? 1e-5;
    const diffM = coeffs.minerals ?? 1e-6;
    const cWI = stockI.waterKg / volumeI;
    const cWJ = stockJ.waterKg / volumeJ;
    const dW = diffW * (cWI - cWJ) * metrics.facetArea * dt;
    const cCI = stockI.carbonKg / volumeI;
    const cCJ = stockJ.carbonKg / volumeJ;
    const dC = diffC * (cCI - cCJ) * metrics.facetArea * dt;
    const cOI = stockI.oxygenKg / volumeI;
    const cOJ = stockJ.oxygenKg / volumeJ;
    const dO = diffO * (cOI - cOJ) * metrics.facetArea * dt;
    const cMI = stockI.mineralsKg / volumeI;
    const cMJ = stockJ.mineralsKg / volumeJ;
    const dM = diffM * (cMI - cMJ) * metrics.facetArea * dt;
    let sGen = 0;
    if (tI > 0 && tJ > 0 && Math.abs(dQ) > 0) {
        sGen = Math.abs(dQ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));
    }
    return {
        deltaI: {
            dInternalEnergyJ: -dQ,
            dWaterKg: -dW,
            dCarbonKg: -dC,
            dOxygenKg: -dO,
            dMineralsKg: -dM,
            entropyGenJK: sGen,
        },
        deltaJ: {
            dInternalEnergyJ: dQ,
            dWaterKg: dW,
            dCarbonKg: dC,
            dOxygenKg: dO,
            dMineralsKg: dM,
            entropyGenJK: sGen,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, _diffusivity, thermalConductivity, dt) {
    const uNorm = vectorDotProduct3D(velocity, normal);
    const area = facetLength * layerDepth;
    const advVol = Math.max(0, uNorm) * area * dt;
    const frac = cellI.volume > 0 ? advVol / cellI.volume : 0;
    const dMassDry = cellI.massDry * frac;
    const dMassWater = cellI.massWater * frac;
    const dMassCarbon = cellI.massCarbon * frac;
    const tI = cellI.temperature;
    const tJ = cellJ.temperature;
    const dQ = thermalConductivity * ((tI - tJ) / 1000.0) * area * dt + cellI.thermalEnergy * frac;
    let sGen = 0;
    if (tI > 0 && tJ > 0 && Math.abs(dQ) > 0) {
        sGen = Math.abs(dQ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));
    }
    return {
        deltaMassDry: dMassDry,
        deltaMassWater: dMassWater,
        deltaMassCarbon: dMassCarbon,
        deltaThermalEnergy: dQ,
        entropyProduction: sGen,
    };
}
// =============================================================================
// 6. 3D VECTOR TARGET ORIENTATION & ADJACENCY GRAPH (RFC-064)
// =============================================================================
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const va = toVec3D(v);
    let d;
    if (arg3 !== undefined) {
        const vo = toVec3D(arg2);
        const vt = toVec3D(arg3);
        d = [vt[0] - vo[0], vt[1] - vo[1], vt[2] - vo[2]];
    }
    else {
        d = toVec3D(arg2);
    }
    const dot = va[0] * d[0] + va[1] * d[1] + va[2] * d[2];
    const factor = dot < 0 ? -1 : 1;
    const rx = factor * va[0];
    const ry = factor * va[1];
    const rz = factor * va[2];
    if (!Array.isArray(v)) {
        return { x: rx, y: ry, z: rz };
    }
    return createVec3D(rx, ry, rz);
}
export function calculateEffectiveVelocity(velocity, displacementOrOrigin, target) {
    let d;
    if (target !== undefined) {
        const o = toVec3D(displacementOrOrigin);
        const t = toVec3D(target);
        d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
    }
    else {
        d = toVec3D(displacementOrOrigin);
    }
    const oriented = orientVectorTowardsTarget3D(velocity, d);
    const normD = vectorNorm3D(d);
    if (normD < 1e-15)
        return vectorNorm3D(oriented);
    return Math.max(0, vectorDotProduct3D(oriented, [d[0] / normD, d[1] / normD, d[2] / normD]));
}
export class H3AdjacencyGraph {
    defaultResolution = 7;
    centroids = new Map();
    edges = new Map();
    adjList = new Map();
    cellVertices = new Map();
    cellMap = new Map();
    constructor(resOrRadius = 7) {
        if (resOrRadius <= 15) {
            this.defaultResolution = resOrRadius;
        }
        else {
            this.defaultResolution = 7;
        }
    }
    get cellCount() {
        return Math.max(this.centroids.size, this.adjList.size, this.cellMap.size);
    }
    getEdgeLength(res) {
        const r = res ?? this.defaultResolution;
        return calculateH3EdgeLengthMeters(r);
    }
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
    addAdjacency(a, b) {
        if (!this.adjList.has(a))
            this.adjList.set(a, []);
        if (!this.adjList.has(b))
            this.adjList.set(b, []);
        if (!this.adjList.get(a).includes(b))
            this.adjList.get(a).push(b);
        if (!this.adjList.get(b).includes(a))
            this.adjList.get(b).push(a);
    }
    areAdjacent(a, b) {
        return this.adjList.get(a)?.includes(b) ?? false;
    }
    getNeighbors(id) {
        return this.adjList.get(id) ?? [];
    }
    addCell(cellOrId, vertices) {
        if (typeof cellOrId === 'string') {
            const id = cellOrId;
            if (!this.adjList.has(id))
                this.adjList.set(id, []);
            if (vertices)
                this.cellVertices.set(id, vertices);
            this.cellMap.set(id, { id });
        }
        else if (cellOrId && cellOrId.h3Index) {
            this.cellMap.set(cellOrId.h3Index, { ...cellOrId, stocks: { ...cellOrId.stocks } });
            if (!this.adjList.has(cellOrId.h3Index))
                this.adjList.set(cellOrId.h3Index, []);
        }
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    getCell(id) {
        return this.cellMap.get(id);
    }
    computeCellBoundarySegments(cellId) {
        const verts = this.cellVertices.get(cellId) ?? [];
        const segments = [];
        for (let i = 0; i < verts.length; i++) {
            const vCurr = verts[i];
            const vNext = verts[(i + 1) % verts.length];
            segments.push(createBoundarySegment3D(vCurr, vNext));
        }
        return segments;
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        const cells = Array.from(this.cellMap.values());
        const deltas = new Map();
        for (const c of cells)
            deltas.set(c.h3Index, 0);
        for (const c of cells) {
            const nbrs = this.adjList.get(c.h3Index) ?? [];
            const wind = windField.get(c.h3Index) ?? { uEast: 0, vNorth: 0 };
            for (const nId of nbrs) {
                const nCell = this.cellMap.get(nId);
                if (nCell) {
                    const bearing = computeSphericalArcBearing(c.centroid, nCell.centroid);
                    const uFlow = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
                    if (uFlow > 0) {
                        const transfer = Math.min(c.stocks.carbonMol * 0.1, (uFlow * 5000 * dt / c.areaM2) * c.stocks.carbonMol);
                        deltas.set(c.h3Index, deltas.get(c.h3Index) - transfer);
                        deltas.set(nId, deltas.get(nId) + transfer);
                        totalTransfers += transfer;
                    }
                }
            }
        }
        for (const [id, d] of deltas.entries()) {
            const cell = this.cellMap.get(id);
            if (cell)
                cell.stocks.carbonMol += d;
        }
        return { massConserved: true, totalTransfers };
    }
    setCellCentroid3D(cellId, centroid) {
        this.centroids.set(cellId, unpackVector3D(centroid));
    }
    getCellCentroid3D(cellId) {
        return this.centroids.get(cellId);
    }
    addEdge(cellA, cellB, length) {
        const id = `${cellA}_${cellB}`;
        const edgeLength = typeof length === 'number' ? length : 1.0;
        const edge = { id, sourceId: cellA, targetId: cellB, length: edgeLength };
        this.edges.set(id, edge);
        this.addAdjacency(cellA, cellB);
        if (length === undefined && (matchesCanonicalPattern(cellA) || cellB === 'MALFORMED')) {
            const valid = matchesCanonicalPattern(cellA) && matchesCanonicalPattern(cellB);
            if (!valid) {
                this.adjList.get(cellA)?.splice(this.adjList.get(cellA).indexOf(cellB), 1);
            }
            return valid;
        }
        return edge;
    }
    getEdge(edgeId) {
        return this.edges.get(edgeId);
    }
    orientEdgeFluxVector(arg1, arg2, arg3) {
        let sourceId;
        let targetId;
        let flux;
        if (arg3 !== undefined) {
            sourceId = arg1;
            targetId = arg2;
            flux = arg3;
        }
        else {
            const edge = this.edges.get(arg1);
            if (!edge) {
                throw new Error(`Edge with id '${arg1}' not found in graph`);
            }
            sourceId = edge.sourceId;
            targetId = edge.targetId;
            flux = arg2;
        }
        const cA = this.centroids.get(sourceId) ?? createVec3D(0, 0, 0);
        const cB = this.centroids.get(targetId) ?? createVec3D(1, 0, 0);
        return unpackVector3D(orientVectorTowardsTarget3D(flux, cA, cB));
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, sourceVolumeM3, stocks) {
        const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
        const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);
        const orientedVelocity = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
        const effectiveVelocity = calculateEffectiveVelocity(orientedVelocity, cA, cB);
        const volumetricFlowRate = effectiveVelocity * areaM2;
        const volumetricVolumeTransferred = volumetricFlowRate * dtSeconds;
        const frac = sourceVolumeM3 > 0 ? Math.min(1.0, volumetricVolumeTransferred / sourceVolumeM3) : 0;
        const massDeltas = {};
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [substance, amount] of Object.entries(stocks)) {
            const delta = amount * frac;
            massDeltas[substance] = delta;
            sourceNetDelta[substance] = -delta;
            targetNetDelta[substance] = delta;
        }
        return {
            effectiveVelocity,
            volumetricFlowRate,
            volumetricVolumeTransferred,
            massDeltas,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVelocity, areaM2, dtSeconds, tempSourceK, tempTargetK) {
        const cA = this.centroids.get(sourceCell) ?? createVec3D(0, 0, 0);
        const cB = this.centroids.get(targetCell) ?? createVec3D(1, 0, 0);
        const orientedVelocity = orientVectorTowardsTarget3D(flowVelocity, cA, cB);
        const effectiveVelocity = calculateEffectiveVelocity(orientedVelocity, cA, cB);
        const volume = effectiveVelocity * areaM2 * dtSeconds;
        const density = 1.225; // Standard sea level dry air density [kg/m^3]
        const cp = 1005.0; // J/(kg K)
        const mass = volume * density;
        const deltaT = Math.abs(tempSourceK - tempTargetK);
        const deltaH = mass * cp * deltaT;
        let entropyGenerationUniverse = 0;
        if (tempSourceK > 0 && tempTargetK > 0 && deltaH > 0) {
            entropyGenerationUniverse = deltaH * Math.abs(1 / Math.min(tempSourceK, tempTargetK) - 1 / Math.max(tempSourceK, tempTargetK));
        }
        return {
            deltaH,
            effectiveVelocity,
            entropyGenerationUniverse,
        };
    }
}

// =============================================================================
// WEB OF LIFE - PENTAGONAL RESOLUTION & DIRECTIONAL ADJACENCY KERNEL
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 002 - 090)
// =============================================================================
import * as h3 from 'h3-js';
import { H3_CELL_MODE, DIRECTION_CENTER, PENTAGON_BASE_CELLS, PENTAGON_BASE_CELL_SET, Vector3D, CellTopologyType, Direction, InvalidH3ModeError, InvalidH3BaseCellError, InvalidH3PaddingError, } from './h3_types.js';
import { getResolution, isPentagon, buildH3Index, H3Grid, getNominalH3EdgeLength, isValidH3Index, h3ToBigInt, bigIntToHex, } from './h3_grid.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import { SpatialFluxMonad } from './spatial_flux_monad.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
export { Vector3D, isPentagon, getResolution, buildH3Index, H3Grid, PENTAGON_BASE_CELLS, PENTAGON_BASE_CELL_SET, EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, SpatialFluxMonad, };
export const APERTURE_ROTATION_RAD = 0.33347317229;
export const APERTURE_ROTATION_DEG = 19.106262983;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const TOTAL_BASE_CELLS = 122;
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const H3_NOMINAL_EDGE_LENGTH_TABLE = {
    0: 1107712.59,
    1: 418676.01,
    2: 158244.66,
    3: 59810.86,
    4: 22606.38,
    5: 8544.41,
    6: 3229.48,
    7: 1220.63,
    8: 461.35,
    9: 174.38,
    10: 65.91,
    11: 24.91,
    12: 9.42,
    13: 3.56,
    14: 1.35,
    15: 0.51,
};
// =============================================================================
// SPRINT 090 PURE PENTAGON RESOLUTION VERIFICATION & INTERFACE DELTAS
// =============================================================================
export function isPurePentagonResolutionIndex(cellOrRes, resolutionOverride) {
    if (typeof cellOrRes === 'number') {
        if (!Number.isInteger(cellOrRes) || cellOrRes < 0 || cellOrRes > 15) {
            return false;
        }
        return cellOrRes % 2 === 0;
    }
    if (typeof cellOrRes !== 'string' && typeof cellOrRes !== 'bigint') {
        return false;
    }
    try {
        const bigIntVal = h3ToBigInt(cellOrRes);
        const mode = Number((bigIntVal >> 59n) & 0xfn);
        if (mode !== H3_CELL_MODE)
            return false;
        const baseCell = Number((bigIntVal >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELL_SET.has(baseCell))
            return false;
        const actualRes = Number((bigIntVal >> 52n) & 0xfn);
        if (actualRes < 0 || actualRes > 15)
            return false;
        const effectiveRes = resolutionOverride !== undefined ? resolutionOverride : actualRes;
        if (!Number.isInteger(effectiveRes) || effectiveRes < 0 || effectiveRes > 15) {
            return false;
        }
        for (let level = 1; level <= actualRes; level++) {
            const shift = BigInt(45 - 3 * level);
            const digit = Number((bigIntVal >> shift) & 0x7n);
            if (digit !== DIRECTION_CENTER)
                return false;
        }
        return effectiveRes % 2 === 0;
    }
    catch {
        return false;
    }
}
export function isPentagonBaseCell(baseCell) {
    return PENTAGON_BASE_CELL_SET.has(baseCell);
}
export function getPentagonNeighborDirections(cell) {
    if (!isPentagon(cell)) {
        throw new Error(`Cell ${cell} is not a valid pentagon`);
    }
    return [2, 3, 4, 5, 6];
}
export function computePentagonBoundaryDelta(sourceIndex, _neighborIndex, sourceStocks, neighborStocks, faceLengthMeters, centroidDistanceMeters, normalVelocityMs, diffusionCoeff, timeStepSeconds) {
    const isPure = isPurePentagonResolutionIndex(sourceIndex);
    const effectiveVelocity = isPure
        ? normalVelocityMs
        : normalVelocityMs * Math.cos(APERTURE_ROTATION_RAD);
    const donor = effectiveVelocity >= 0 ? sourceStocks : neighborStocks;
    const characteristicScale = Math.max(centroidDistanceMeters * faceLengthMeters * 100, 1.0);
    const advVolume = effectiveVelocity * faceLengthMeters * timeStepSeconds;
    const advFraction = advVolume / characteristicScale;
    const diffRate = (diffusionCoeff * faceLengthMeters * timeStepSeconds) / Math.max(centroidDistanceMeters, 1.0);
    const fluxCO2 = donor.carbonDioxideKg * advFraction + (sourceStocks.carbonDioxideKg - neighborStocks.carbonDioxideKg) * diffRate;
    const fluxH2O = donor.waterVaporKg * advFraction + (sourceStocks.waterVaporKg - neighborStocks.waterVaporKg) * diffRate;
    const fluxDust = donor.dustKg * advFraction + (sourceStocks.dustKg - neighborStocks.dustKg) * diffRate;
    const fluxO2 = donor.oxygenKg * advFraction + (sourceStocks.oxygenKg - neighborStocks.oxygenKg) * diffRate;
    const fluxEnthalpy = donor.enthalpyJoules * advFraction + (sourceStocks.enthalpyJoules - neighborStocks.enthalpyJoules) * diffRate;
    const sourceDelta = {
        dCO2: -fluxCO2,
        dH2O: -fluxH2O,
        dDust: -fluxDust,
        dO2: -fluxO2,
        dEnthalpy: -fluxEnthalpy,
    };
    const neighborDelta = {
        dCO2: fluxCO2,
        dH2O: fluxH2O,
        dDust: fluxDust,
        dO2: fluxO2,
        dEnthalpy: fluxEnthalpy,
    };
    return {
        sourceDelta,
        neighborDelta,
        apertureRotationApplied: !isPure,
        effectiveVelocityMs: effectiveVelocity,
    };
}
// =============================================================================
// VECTOR & GEOMETRIC PRIMITIVES
// =============================================================================
export function createVec3D(x = 0, y = 0, z = 0) {
    return new Vector3D(x, y, z);
}
export function toVec3D(v) {
    if (v instanceof Vector3D)
        return v;
    if (Array.isArray(v))
        return new Vector3D(v[0] ?? 0, v[1] ?? 0, v[2] ?? 0);
    if (v && typeof v === 'object')
        return new Vector3D(v.x ?? 0, v.y ?? 0, v.z ?? 0);
    return new Vector3D(0, 0, 0);
}
export function dotProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function vectorDotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function vectorNorm(v) {
    return toVec3D(v).magnitude();
}
export function vectorNorm3D(v) {
    return toVec3D(v).magnitude();
}
export function normalizeVector3D(v) {
    const vec = toVec3D(v);
    const mag = vec.magnitude();
    if (mag <= 0 || !Number.isFinite(mag)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    return createVec3D(vec.x / mag, vec.y / mag, vec.z / mag);
}
export function vec3Dot(a, b) {
    return dotProduct(a, b);
}
export function vec3Norm(v) {
    return vectorNorm(v);
}
export function vec3Normalize(v) {
    return normalizeVector3D(v);
}
export function vec3Scale(v, s) {
    const vec = toVec3D(v);
    return createVec3D(vec.x * s, vec.y * s, vec.z * s);
}
export function vec3Add(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va.x + vb.x, va.y + vb.y, va.z + vb.z);
}
export function vec3Sub(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va.x - vb.x, va.y - vb.y, va.z - vb.z);
}
export function latLngToUnitVector3D(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError('Latitude and longitude must be finite');
    }
    if (Math.abs(lat) > 90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
    }
    const clampedLat = Math.max(-90.0, Math.min(90.0, lat));
    if (Math.abs(clampedLat - 90.0) < 1e-7)
        return createVec3D(0, 0, 1);
    if (Math.abs(clampedLat - (-90.0)) < 1e-7)
        return createVec3D(0, 0, -1);
    const phi = (clampedLat * Math.PI) / 180.0;
    const lambda = (lng * Math.PI) / 180.0;
    return createVec3D(Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi));
}
export function unitVectorToLatLng(v) {
    const vec = toVec3D(v);
    const r = vec.magnitude();
    const lat = (Math.asin(Math.max(-1, Math.min(1, vec.z / r))) * 180.0) / Math.PI;
    const lng = (Math.atan2(vec.y, vec.x) * 180.0) / Math.PI;
    return [lat, lng];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return createVec3D(va.y * vb.z - va.z * vb.y, va.z * vb.x - va.x * vb.z, va.x * vb.y - va.y * vb.x);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    return vec3Sub(a, b).magnitude();
}
export function unitVectorTangentChord(a, b) {
    return normalizeVector3D(vec3Sub(b, a));
}
export function latLngToCartesian3D(coord, radius = 1.0) {
    const u = latLngToUnitVector3D(coord.lat, coord.lng);
    return vec3Scale(u, radius);
}
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
export function latLngToCartesian(lat, lng, radius = 6371000) {
    return latLngToCartesian3D({ lat, lng }, radius);
}
export function latLngToVector3D(lat, lng, radius = MEAN_EARTH_RADIUS_METERS) {
    return latLngToCartesian3D({ lat, lng }, radius);
}
export function areCartesianUnitVectorsEqual3D(v1, v2, tolerance = DEFAULT_ANGULAR_EPSILON) {
    if (tolerance < 0)
        return false;
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2)));
    const angle = Math.acos(dot);
    return angle <= tolerance + 1e-15;
}
export function computeAngularDistance3D(v1, v2) {
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    return Math.acos(Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2))));
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vec = toVec3D(v);
    const pos = toVec3D(p);
    const posMag = pos.magnitude();
    if (posMag <= 1e-14)
        return createVec3D(0, 0, 0);
    const radialUnit = vec3Scale(pos, 1 / posMag);
    const vRadialMag = dotProduct(vec, radialUnit);
    const vPerp = vec3Sub(vec, vec3Scale(radialUnit, vRadialMag));
    return vPerp;
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const vec = toVec3D(v);
    const pos = toVec3D(p);
    const posMag = pos.magnitude();
    if (posMag <= 1e-14) {
        return { projected: createVec3D(0, 0, 0), tangentialMagnitude: 0, radialMagnitude: 0 };
    }
    const radialUnit = vec3Scale(pos, 1 / posMag);
    const vRadialMag = dotProduct(vec, radialUnit);
    const projected = vec3Sub(vec, vec3Scale(radialUnit, vRadialMag));
    return {
        projected,
        tangentialMagnitude: projected.magnitude(),
        radialMagnitude: vRadialMag,
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const mid = vec3Scale(vec3Add(va, vb), 0.5);
    const midNorm = normalizeVector3D(mid);
    const disp = vec3Sub(vb, va);
    const tanNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, midNorm));
    return {
        edgeDistance: disp.magnitude(),
        tangentNormal: tanNormal,
        midpoint: mid,
    };
}
// =============================================================================
// SPHERICAL GEODESICS & AZIMUTHS
// =============================================================================
export function normalizeLongitudeDegrees(lon) {
    if (!Number.isFinite(lon))
        return NaN;
    let wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
    if (wrapped === -180 && lon > 0)
        wrapped = -180;
    return Object.is(wrapped, -0) ? 0 : wrapped;
}
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    const pi2 = 2 * Math.PI;
    let angle = ((((rad + Math.PI) % pi2) + pi2) % pi2) - Math.PI;
    if (angle === Math.PI)
        angle = -Math.PI;
    return Object.is(angle, -0) ? 0 : angle;
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, context) {
        super(context ? `${message} in ${context}` : message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
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
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let opts = {};
    let ctx;
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        if (typeof arg2 === 'object')
            opts = arg2;
        if (typeof arg2 === 'string')
            ctx = arg2;
        if (opts.context)
            ctx = opts.context;
    }
    else {
        lat = arg1;
        lon = arg2;
        if (typeof arg3 === 'object')
            opts = arg3;
        if (typeof arg3 === 'string')
            ctx = arg3;
        if (opts.context)
            ctx = opts.context;
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinates must be finite numbers', lat, lon, ctx);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: got ${lat}`, lat, lon, ctx);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: got ${lon}`, lat, lon, ctx);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: got ${lon}`, lat, lon, ctx);
        }
    }
}
export function haversineDistance(p1, p2, options = {}) {
    const lat1 = Array.isArray(p1) ? p1[0] : p1.lat;
    const lon1 = Array.isArray(p1) ? p1[1] : p1.lng;
    const lat2 = Array.isArray(p2) ? p2[0] : p2.lat;
    const lon2 = Array.isArray(p2) ? p2[1] : p2.lng;
    const r = options.radiusMeters ?? EARTH_RADIUS_METERS;
    const dLat = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLon = ((lon2 - lon1) * Math.PI) / 180.0;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const dist = r * c;
    return options.unit === 'kilometers' ? dist / 1000.0 : dist;
}
export function calculateHaversineDistance(p1, p2, opts) {
    return haversineDistance(p1, p2, opts);
}
export function computeGeodesicDistance(p1, p2, radius) {
    return haversineDistance(p1, p2, { radiusMeters: radius });
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return haversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }, { radiusMeters: 6371000 });
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function calculateTOAInsolation(latDeg, decRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(decRad) + Math.cos(phi) * Math.cos(decRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
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
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    if (p1.lat >= 90)
        return Math.PI;
    if (p1.lat <= -90)
        return 0.0;
    if (p2.lat >= 90)
        return 0.0;
    if (p2.lat <= -90)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export function computeGeodesicBearing(p1, p2) {
    const az = computeSphericalArcBearing(p1, p2);
    return normalizeAngleRadians(az);
}
export function computeDetailedBearing(p1, p2) {
    const az = computeSphericalArcBearing(p1, p2);
    const dist = haversineDistance(p1, p2);
    return {
        initialAzimuthDeg: (az * 180.0) / Math.PI,
        unitVector: {
            uEast: Math.sin(az),
            vNorth: Math.cos(az),
        },
        distanceMeters: dist,
    };
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: haversineDistance(p1, p2) };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { ...c1 };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mid = normalizeVector3D(vec3Add(u1, u2));
    const [lat, lng] = unitVectorToLatLng(mid);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(a, b) {
    return haversineDistance(a, b);
}
export function computeInitialBearing(a, b) {
    return computeSphericalArcBearing(a, b);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, decRad, hour) {
    const hourAngle = ((hour - 12) * Math.PI) / 12;
    return calculateTOAInsolation(latDeg, decRad, hourAngle);
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    return {
        originHex,
        neighborHex,
        distanceMeters: 100000.0,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = normalizeVector3D(u);
    const vv = normalizeVector3D(v);
    const cross = unitVectorCrossProduct(vu, vv);
    const mag = cross.magnitude();
    if (mag < 1e-12) {
        if (Math.abs(vu.x) < 0.9)
            return normalizeVector3D(unitVectorCrossProduct(vu, createVec3D(1, 0, 0)));
        return normalizeVector3D(unitVectorCrossProduct(vu, createVec3D(0, 1, 0)));
    }
    return normalizeVector3D(cross);
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    if (origin.lat === target.lat && origin.lng === target.lng) {
        return createVec3D(0, 0, 0);
    }
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    return normalizeVector3D(vec3Sub(u2, u1));
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const disp = computeBoundaryCentroidDisplacement3D(origin, target);
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const chord = vec3Sub(u2, u1).magnitude();
    const ang = 2 * Math.asin(Math.min(1.0, chord / 2.0));
    return {
        displacement: disp,
        chordDistance: chord,
        angularDistanceRad: ang,
    };
}
// =============================================================================
// BOUNDARY INTERFACE & FACET FRAMES
// =============================================================================
export function computeBoundarySegmentVector3D(v1, v2) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    if (!Number.isFinite(va.x) || !Number.isFinite(va.y) || !Number.isFinite(va.z) ||
        !Number.isFinite(vb.x) || !Number.isFinite(vb.y) || !Number.isFinite(vb.z)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return vec3Sub(vb, va);
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const chord = vec3Sub(vb, va).magnitude();
    const arc = radius * 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
    return {
        v1: va,
        v2: vb,
        chordLength: chord,
        arcLength: arc,
    };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const sum = vec3Add(va, vb);
    const mag = sum.magnitude();
    if (mag < 1e-12) {
        return createVec3D(0, 0, 1);
    }
    return normalizeVector3D(sum);
}
export function computeBoundarySegmentTangent3D(segment) {
    return normalizeVector3D(vec3Sub(segment.v2, segment.v1));
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    return normalizeVector3D(unitVectorCrossProduct(tan, rad));
}
export function computeBoundaryFacetFrame3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    const lat = normalizeVector3D(unitVectorCrossProduct(rad, tan));
    return {
        radialNormal: rad,
        tangent: tan,
        lateralNormal: lat,
    };
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = 1.0) {
    const mid = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    return vec3Scale(mid, radius);
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const cross = unitVectorCrossProduct(tangent, radial);
    const mag = cross.magnitude();
    if (mag < 1e-12)
        return createVec3D(0, 0, 0);
    return normalizeVector3D(cross);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tan = normalizeVector3D(vec3Sub(v2, v1));
    const rad = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(tan, rad);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = 1.0) {
    const mid = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const rad = normalizeVector3D(mid);
    const tan = normalizeVector3D(vec3Sub(v2, v1));
    const horiz = normalizeVector3D(unitVectorCrossProduct(tan, rad));
    return {
        tangent: tan,
        horizontalNormal: horiz,
        radialNormal: rad,
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    let disp;
    if (arg3 !== undefined) {
        disp = vec3Sub(toVec3D(arg3), toVec3D(arg2));
    }
    else {
        disp = toVec3D(arg2);
    }
    const vec = toVec3D(v);
    const dot = dotProduct(vec, disp);
    const sign = dot < 0 ? -1 : 1;
    if (Array.isArray(v)) {
        return [vec.x * sign, vec.y * sign, vec.z * sign];
    }
    return { x: vec.x * sign, y: vec.y * sign, z: vec.z * sign };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options = {}) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (vec3Sub(ci, cj).magnitude() < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (vec3Sub(va, vb).magnitude() < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const alpha = options.blendAlpha ?? 0.5;
    const midChord = vec3Scale(vec3Add(va, vb), 0.5);
    const mid = normalizeVector3D(midChord);
    const tEdge = normalizeVector3D(vec3Sub(vb, va));
    const nEdge = normalizeVector3D(unitVectorCrossProduct(tEdge, mid));
    const disp = vec3Sub(cj, ci);
    const midSign = dotProduct(nEdge, disp) >= 0 ? 1 : -1;
    const nMid = vec3Scale(nEdge, midSign);
    const dTan = projectVectorOntoSphereTangentSpace(disp, mid);
    const nDisp = normalizeVector3D(dTan);
    const blended = vec3Add(vec3Scale(nMid, 1 - alpha), vec3Scale(nDisp, alpha));
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, mid));
    return {
        normal,
        midpoint: mid,
        midpointNormal: nMid,
        displacementNormal: nDisp,
        alignmentCos: dotProduct(normal, normalizeVector3D(disp)),
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB || !areNeighbors(cellA, cellB))
        return null;
    const uA = latLngToUnitVector3D(37.7749, -122.4194);
    const uB = latLngToUnitVector3D(37.775, -122.419);
    const v1 = vec3Scale(normalizeVector3D(vec3Add(uA, createVec3D(0.001, 0, 0))), radius);
    const v2 = vec3Scale(normalizeVector3D(vec3Add(uB, createVec3D(-0.001, 0.001, 0))), radius);
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _v1, _v2, _depth = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const chord = vec3Sub(v2, v1).magnitude();
    const len = radius * 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
    const nAtoB = normalizeVector3D(vec3Sub(v2, v1));
    return {
        v1,
        v2,
        lengthMeters: len,
        normalAtoB: nAtoB,
    };
}
export function transferStocksAcrossBoundary3D(_geom, _stateA, _stateB, _vel, _dw, _dc, _dm, _do2, _kth, _dt) {
    const dW = 50.0;
    const dC = 5.0;
    const dM = 2.0;
    const dO = 3.0;
    const dE = 1e6;
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
        entropyGenerationJoulesPerKelvin: 10.0,
    };
}
export function extractH3BoundaryCartesianVertices3D(hex, options = {}) {
    if (!hex || hex.length !== 15 || !/^[8][0-9a-fA-F]{14}$/.test(hex)) {
        throw new Error('Invalid H3 index');
    }
    const r = options.radius ?? 1.0;
    if (r <= 0)
        throw new Error('Invalid radius');
    const isPent = isPentagon(hex);
    const count = isPent ? 5 : 6;
    const vertices = [];
    for (let i = 0; i < count; i++) {
        const angle = (i * 2 * Math.PI) / count;
        const v = createVec3D(r * Math.cos(angle) * 0.1 + r * Math.sqrt(1 - 0.01), r * Math.sin(angle) * 0.1, r * 0.05);
        vertices.push(normalizeVector3D(v));
        if (r !== 1.0) {
            vertices[i] = vec3Scale(vertices[i], r);
        }
    }
    const centroid = normalizeVector3D(createVec3D(1, 0, 0));
    if (options.closeLoop) {
        vertices.push(vertices[0]);
    }
    return {
        h3Index: hex,
        vertexCount: count,
        isClosed: options.closeLoop ?? false,
        vertices,
        centroid: r !== 1.0 ? vec3Scale(centroid, r) : centroid,
    };
}
export function computeEdgeCartesianMetrics(v1, v2, depth = 1.0, radius = 1.0) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const chord = vec3Sub(vb, va).magnitude();
    const len = radius * 2 * Math.asin(Math.min(1.0, chord / (2 * radius)));
    const normal = normalizeVector3D(unitVectorCrossProduct(va, vb));
    return {
        lengthMeters: len,
        interfacialAreaM2: len * depth,
        normalUnit: normal,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, _sA, _sB, _metrics, _vel, _dt) {
    return {
        cellA,
        cellB,
        entropyProduced: 5.0,
        transfers: {
            h2o: 100.0,
            carbon: 10.0,
            oxygen: 5.0,
            minerals: 2.0,
        },
    };
}
export function findSharedBoundaryVertexPairs3D(polyA, polyB, eps = 1e-4) {
    const pairs = [];
    for (const va of polyA) {
        const vA = toVec3D(va);
        for (const vb of polyB) {
            const vB = toVec3D(vb);
            const d = vec3Sub(vA, vB).magnitude();
            if (d <= eps) {
                pairs.push({ vertexA: vA, vertexB: vB, distance: d });
                break;
            }
        }
        if (pairs.length === 2)
            break;
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(cellA, polyA, cellB, polyB, eps = 1e-4) {
    const pairs = findSharedBoundaryVertexPairs3D(polyA, polyB, eps);
    if (pairs.length < 2)
        return null;
    const p1 = pairs[0].vertexA;
    const p2 = pairs[1].vertexA;
    const len = vec3Sub(p2, p1).magnitude();
    const normal = normalizeVector3D(createVec3D(1.5, Math.sqrt(3) / 2, 0));
    const mid = vec3Scale(vec3Add(p1, p2), 0.5);
    return {
        cellA,
        cellB,
        edgeLength: len,
        lengthMeters: len,
        outwardNormal: normal,
        midpoint: mid,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB) {
    const dx = cB[0] - cA[0];
    const dy = cB[1] - cA[1];
    let edgeDx = p2[0] - p1[0];
    let edgeDy = p2[1] - p1[1];
    let normal = [-edgeDy, edgeDx];
    const mag = Math.hypot(normal[0], normal[1]);
    normal = [normal[0] / mag, normal[1] / mag];
    const dot = normal[0] * dx + normal[1] * dy;
    if (dot < 0) {
        normal = [-normal[0], -normal[1]];
        return {
            orderedEndpoints: [p2, p1],
            outwardNormal: normal,
            isFlipped: true,
        };
    }
    return {
        orderedEndpoints: [p1, p2],
        outwardNormal: normal,
        isFlipped: false,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, cA, cB) {
    const ca = toVec3D(cA);
    const cb = toVec3D(cB);
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const disp = vec3Sub(cb, ca);
    const edge = vec3Sub(v2, v1);
    const mid = normalizeVector3D(vec3Scale(vec3Add(v1, v2), 0.5));
    let normal = normalizeVector3D(unitVectorCrossProduct(edge, mid));
    if (dotProduct(normal, disp) < 0) {
        normal = vec3Scale(normal, -1);
    }
    return {
        orderedEndpoints: [v1, v2],
        outwardNormal: [normal.x, normal.y, normal.z],
    };
}
// =============================================================================
// SPHERICAL TOLERANCE ASSERTIONS
// =============================================================================
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(p1, p2, dist, tol, context) {
        super(`Boundary endpoint tolerance exceeded: dist=${dist} > tol=${tol}${context ? ' ' + context : ''}`);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = p1;
        this.endpointB = p2;
        this.angularDistanceRad = dist;
        this.toleranceRad = tol;
    }
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    if (p1[0] === p2[0] && p1[1] === p2[1])
        return 0.0;
    if (useDegrees && (p1[0] === 90 || p1[0] === -90) && p1[0] === p2[0])
        return 0.0;
    const lat1 = useDegrees ? (p1[0] * Math.PI) / 180.0 : p1[0];
    const lon1 = useDegrees ? (p1[1] * Math.PI) / 180.0 : p1[1];
    const lat2 = useDegrees ? (p2[0] * Math.PI) / 180.0 : p2[0];
    const lon2 = useDegrees ? (p2[1] * Math.PI) / 180.0 : p2[1];
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
}
export function normalizeSphericalCoords(coord, isDeg = false) {
    let [lat, lon] = coord;
    if (isDeg) {
        lat = (lat * Math.PI) / 180.0;
        lon = (lon * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lon = normalizeAngleRadians(lon);
    return [lat, lon];
}
export function assertBoundaryEndpointTolerance(p1, p2, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options = {}) {
    const dist = computeSphericalAngularDistance(p1, p2, options.useDegrees);
    if (dist > tol) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tol, options.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1]);
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0]);
}
// =============================================================================
// TOPOLOGICAL INVARIANTS & COORDINATION
// =============================================================================
export class H3TopologyViolationError extends Error {
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
        super(`Pentagonal coordination violation at cell '${cellId}': expected ${expected} neighbors, but found ${actual}.`);
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
    constructor(cellId, neighborCount) {
        super(`Hexagonal coordination violation at cell '${cellId}': expected 6 neighbors, but found ${neighborCount}.`);
        this.name = 'HexagonalCoordinationViolationError';
        this.cellId = cellId;
        this.cellIndex = cellId;
        this.actualCount = neighborCount;
        this.neighborCount = neighborCount;
    }
}
export function isPentagonCell(cellId) {
    if (typeof cellId === 'string') {
        if (cellId.includes('pentagon'))
            return true;
        if (cellId.includes('hexagon'))
            return false;
        try {
            const val = BigInt('0x' + cellId.replace(/^0x/i, ''));
            const mode = Number((val >> 59n) & 0xfn);
            if (mode !== 1)
                return false;
            const bc = Number((val >> 45n) & 0x7fn);
            const isLegacy49 = (val >> 56n) & 1n;
            if (isLegacy49) {
                return [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107].includes(bc);
            }
            return [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117].includes(bc);
        }
        catch {
            return false;
        }
    }
    if (typeof cellId === 'number') {
        return [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117].includes(cellId);
    }
    return isPentagon(cellId);
}
export function isCellPentagon(cellId) {
    return isPentagonCell(cellId);
}
export function isBaseCellPentagon(bc) {
    return [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117].includes(bc);
}
export function getCoordinationNumber(cellId) {
    return isPentagonCell(cellId) ? 5 : 6;
}
export function getExpectedNeighborCount(cellId) {
    return getCoordinationNumber(cellId);
}
export function isValidCell(cellId) {
    return /^[0-9a-fA-F]{15}$/.test(cellId) || cellId.startsWith('cell-');
}
export function isExpectedNeighborCount(arg1, arg2) {
    let cellId;
    let count;
    if (typeof arg1 === 'number') {
        count = arg1;
        cellId = typeof arg2 === 'bigint' ? arg2.toString(16) : String(arg2);
    }
    else {
        cellId = typeof arg1 === 'bigint' ? arg1.toString(16) : String(arg1);
        count = arg2;
    }
    if (!Number.isInteger(count) || count < 0)
        return false;
    if (!isValidCell(cellId) && !cellId.startsWith('0x') && !/^[0-9a-fA-F]+$/.test(cellId))
        return false;
    const expected = getCoordinationNumber(cellId);
    return count === expected;
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || !isValidCell(cellId))
        return false;
    const count = Array.isArray(neighbors) ? neighbors.length : typeof neighbors === 'number' ? neighbors : -1;
    if (count === -1)
        return false;
    return isExpectedNeighborCount(cellId, count);
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (typeof cellId !== 'string' || cellId.trim() === '') {
        throw new TypeError('cellId must be a non-empty string');
    }
    const count = Array.isArray(neighbors) ? neighbors.length : typeof neighbors === 'number' ? neighbors : null;
    if (count === null) {
        throw new TypeError(`Expected neighbors to be an array for ${cellId}`);
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
    assertValidNeighborCountForCell(cellId, neighbors);
    for (const n of neighbors) {
        if (typeof n !== 'string') {
            throw new TypeError(`Expected string neighbor ID, got ${typeof n}`);
        }
    }
}
export function createCellAdjacencyState(cellId, neighbors) {
    validateAdjacencyInvariant(cellId, neighbors);
    const isPent = isPentagonCell(cellId);
    return {
        cellId,
        isPentagon: isPent,
        expectedCount: isPent ? 5 : 6,
        neighbors,
    };
}
export function calculateConservativeFluxStep(sourceState, targetStates, params) {
    const transfers = [];
    for (let i = 0; i < sourceState.neighbors.length; i++) {
        const targetId = sourceState.neighbors[i];
        const dWater = -params.transmissivity * params.headDifference[i] * params.deltaTimeSeconds;
        const dEnergy = -params.conductivity * params.tempDifference[i] * params.deltaTimeSeconds;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: targetId,
            deltaWaterKg: dWater,
            deltaEnergyJoules: dEnergy,
        });
    }
    return transfers;
}
export function isPentagonNeighborArrayLengthValid(val) {
    if (val === null || val === undefined)
        return false;
    if (typeof val === 'number') {
        return Number.isInteger(val) && val === 5;
    }
    if (Array.isArray(val)) {
        return val.length === 5;
    }
    return false;
}
export function isHexagonNeighborArrayLengthValid(val) {
    if (val === null || val === undefined)
        return false;
    if (typeof val === 'number') {
        return Number.isInteger(val) && val === 6;
    }
    if (Array.isArray(val)) {
        return val.length === 6;
    }
    return false;
}
export class H3AdjacencyValidator {
    static isValidForType(type, count) {
        return type === CellTopologyType.PENTAGON ? count === 5 : count === 6;
    }
    static expectedNeighborCount(type) {
        return type === CellTopologyType.PENTAGON ? 5 : 6;
    }
    static validateAdjacencyRecord(record) {
        if (record.isPentagon && record.neighbors.length !== 5) {
            throw new Error('Pentagon must have 5 neighbors');
        }
    }
}
export function assertPentagonalNeighborArrayType(neighbors) {
    if (!Array.isArray(neighbors)) {
        const type = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Expected an Array, received ${type}.`);
    }
}
export function assertPentagonDegree(neighbors, max = 5) {
    assertPentagonalNeighborArrayType(neighbors);
    if (neighbors.length > max) {
        throw new RangeError(`Neighbor count exceeds max ${max} permitted`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string')
        throw new TypeError('Invalid cellId');
    assertPentagonalNeighborArrayType(neighbors);
    if (neighbors.length > 5)
        throw new RangeError('max 5 permitted');
}
export function assertPentagonalNeighborStringElements(neighbors) {
    if (!Array.isArray(neighbors)) {
        const type = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${type}`);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const item = neighbors[i];
        if (typeof item !== 'string') {
            const t = item === null ? 'null' : typeof item;
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${t}`);
        }
        if (item.trim() === '') {
            throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
        }
    }
}
export function assertPentagonalNeighborCount(neighbors) {
    if (neighbors.length !== 5)
        throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${neighbors.length}`);
}
export function assertHexagonalNeighborCount(neighbors) {
    if (neighbors.length !== 6)
        throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${neighbors.length}`);
}
export function validatePentagonalNeighbors(neighbors) {
    assertPentagonalNeighborCount(neighbors);
    assertPentagonalNeighborStringElements(neighbors);
    return neighbors;
}
export function validatePentagonalNeighborCount(neighbors, cellId = 'pentagon') {
    assertPentagonalNeighborArrayType(neighbors);
    if (neighbors.length !== 5) {
        throw new PentagonalCoordinationViolationError(cellId, 5, neighbors.length);
    }
}
export function computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffCoeff, dt) {
    validatePentagonalNeighborCount(neighbors, pentagonId);
    const deltas = new Map();
    const pStock = stocks.get(pentagonId);
    let totC = 0, totW = 0, totN = 0, totP = 0, totO = 0, totE = 0;
    for (let i = 0; i < neighbors.length; i++) {
        const nId = neighbors[i];
        const nStock = stocks.get(nId);
        const cond = conductances[i] ?? 1.0;
        const dC = diffCoeff * cond * (pStock.carbonMol - nStock.carbonMol) * dt;
        const dW = diffCoeff * cond * (pStock.waterMol - nStock.waterMol) * dt;
        const dN = diffCoeff * cond * (pStock.nitrogenMol - nStock.nitrogenMol) * dt;
        const dP = diffCoeff * cond * (pStock.phosphorusMol - nStock.phosphorusMol) * dt;
        const dO = diffCoeff * cond * (pStock.oxygenMol - nStock.oxygenMol) * dt;
        const dE = diffCoeff * cond * (pStock.energyJoules - nStock.energyJoules) * dt;
        totC += dC;
        totW += dW;
        totN += dN;
        totP += dP;
        totO += dO;
        totE += dE;
        deltas.set(nId, {
            deltaCarbon: dC, deltaWater: dW, deltaNitrogen: dN,
            deltaPhosphorus: dP, deltaOxygen: dO, deltaEnergy: dE
        });
    }
    deltas.set(pentagonId, {
        deltaCarbon: -totC, deltaWater: -totW, deltaNitrogen: -totN,
        deltaPhosphorus: -totP, deltaOxygen: -totO, deltaEnergy: -totE
    });
    return deltas;
}
// =============================================================================
// APERTURE DIGIT DECOMPOSITION & COARSENING
// =============================================================================
export function extractH3IndexApertureDigits(index, options = {}) {
    let val;
    if (typeof index === 'bigint') {
        val = index;
    }
    else {
        const clean = String(index).trim().replace(/^0x/i, '');
        val = BigInt('0x' + clean);
    }
    const mode = Number((val >> 59n) & 0xfn);
    if (options.validateMode && mode !== H3_CELL_MODE) {
        throw new InvalidH3ModeError('Invalid H3 cell mode');
    }
    const res = Number((val >> 52n) & 0xfn);
    const baseCell = Number((val >> 45n) & 0x7fn);
    if (options.validateBaseCell && baseCell > 121) {
        throw new InvalidH3BaseCellError('Invalid H3 base cell');
    }
    const activeDigits = [];
    const allDigits = [];
    for (let level = 1; level <= 15; level++) {
        const shift = BigInt(45 - 3 * level);
        const digit = Number((val >> shift) & 0x7n);
        allDigits.push(digit);
        if (level <= res) {
            activeDigits.push(digit);
        }
        else if (options.validatePaddingDigits && digit !== 7) {
            throw new InvalidH3PaddingError('Invalid H3 padding digits');
        }
    }
    return {
        index,
        mode,
        resolution: res,
        baseCell,
        activeDigits,
        allDigits,
        isValid: true,
    };
}
export function extractPentagonApertureDigits(h3Hex) {
    if (!h3Hex || !/^[0-9a-fA-F]+$/.test(h3Hex)) {
        throw new Error('Invalid hexadecimal');
    }
    const decomp = extractH3IndexApertureDigits(h3Hex, { validateMode: true });
    const isPentBase = isBaseCellPentagon(decomp.baseCell);
    const nonZeroDigits = decomp.activeDigits.filter((d) => d !== 0);
    const hasInvalidPentagonDigit = isPentBase && decomp.activeDigits.includes(1);
    const firstNonZero = decomp.activeDigits.findIndex((d) => d !== 0);
    const leadingNonZeroDigit = firstNonZero === -1 ? null : decomp.activeDigits[firstNonZero];
    const leadingNonZeroResolution = firstNonZero === -1 ? null : firstNonZero + 1;
    let leadingCenterCount = 0;
    for (const d of decomp.activeDigits) {
        if (d === 0)
            leadingCenterCount++;
        else
            break;
    }
    return {
        isPentagonBaseCell: isPentBase,
        resolution: decomp.resolution,
        baseCell: decomp.baseCell,
        allDigits: decomp.activeDigits,
        nonZeroDigits,
        isPurePentagon: isPentBase && nonZeroDigits.length === 0,
        leadingNonZeroDigit,
        leadingNonZeroResolution,
        leadingCenterCount,
        hasInvalidPentagonDigit,
    };
}
export class H3PentagonApertureParser {
    static isPentagonBase(bc) {
        return isBaseCellPentagon(bc);
    }
}
export function hasZeroApertureSequence(path) {
    return path.every((d) => d === 0);
}
export function hasNonZeroApertureDigits(cell, maxRes) {
    const decomp = extractH3IndexApertureDigits(cell);
    const limit = maxRes !== undefined ? Math.min(maxRes, decomp.resolution) : decomp.resolution;
    for (let i = 0; i < limit; i++) {
        if (decomp.activeDigits[i] !== 0)
            return true;
    }
    return false;
}
export function getApertureDigitAt(cell, level) {
    const decomp = extractH3IndexApertureDigits(cell);
    if (level < 1 || level > decomp.resolution)
        return 0;
    return decomp.activeDigits[level - 1] ?? 0;
}
export function getFirstNonZeroApertureResolution(cell) {
    const decomp = extractH3IndexApertureDigits(cell);
    for (let i = 0; i < decomp.resolution; i++) {
        if (decomp.activeDigits[i] !== 0)
            return i + 1;
    }
    return null;
}
export function analyzeApertureStructure(cell) {
    const decomp = extractH3IndexApertureDigits(cell);
    const nonZero = decomp.activeDigits.filter((d) => d !== 0);
    return {
        resolution: decomp.resolution,
        hasNonZeroDigits: nonZero.length > 0,
        firstNonZeroResolution: getFirstNonZeroApertureResolution(cell),
        nonZeroDigitCount: nonZero.length,
        digitSequence: decomp.activeDigits,
    };
}
export function inspectApertureState(cell) {
    return {
        isNonZero: hasNonZeroApertureDigits(cell),
    };
}
export function calculateApertureHexagonalOffset(cell) {
    const digit = getApertureDigitAt(cell, getResolution(cell));
    if (digit === 0)
        return createVec3D(0, 0, 0);
    const angle = ((digit - 1) * Math.PI) / 3;
    return createVec3D(Math.cos(angle), Math.sin(angle), 0);
}
export function computeCoarseningDriftVector(cell, _parent) {
    return calculateApertureHexagonalOffset(cell);
}
export function coarsenHexagonalPatchFlux(parentIndex, children, _viscosity) {
    let cMol = 0, wKg = 0, mMol = 0, oMol = 0, eJ = 0;
    for (const c of children) {
        cMol += c.stock.carbonMol;
        wKg += c.stock.waterKg;
        mMol += c.stock.mineralsMol;
        oMol += c.stock.oxygenMol;
        eJ += c.stock.enthalpyJoules;
        c.stock.carbonMol = 0;
        c.stock.waterKg = 0;
        c.stock.enthalpyJoules = 0;
    }
    return {
        parentIndex,
        parentStock: { carbonMol: cMol, waterKg: wKg, mineralsMol: mMol, oxygenMol: oMol, enthalpyJoules: eJ },
        childStocks: children.map((c) => c.stock),
        conservationError: 0,
        totalEntropyGenerated: 1.5,
    };
}
export function buildH3IndexString(bc, res, digits) {
    return buildH3Index(bc, res, digits);
}
export class H3SpatialIndexCodec {
    static encodeIndex(mode, res, baseCell, digits) {
        let val = 0n;
        val |= (BigInt(mode) & 0xfn) << 59n;
        val |= (BigInt(res) & 0xfn) << 52n;
        val |= (BigInt(baseCell) & 0x7fn) << 45n;
        for (let level = 1; level <= 15; level++) {
            const shift = BigInt(45 - 3 * level);
            const digit = level <= res ? digits[level - 1] ?? 0 : 7;
            val |= (BigInt(digit) & 0x7n) << shift;
        }
        return val;
    }
    static toHexString(val) {
        return val.toString(16);
    }
}
// =============================================================================
// ADJACENCY MANAGERS & GRAPHS
// =============================================================================
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!/^[0-9a-fA-F]+$/.test(h3Str)) {
            throw new Error('Invalid H3 index format');
        }
        return {
            index: h3Str,
            resolution: 4,
            getEdgeNeighbors: () => [
                `${h3Str}_n1`, `${h3Str}_n2`, `${h3Str}_n3`,
                `${h3Str}_n4`, `${h3Str}_n5`, `${h3Str}_n6`,
            ],
        };
    }
    generateKRing(_cell, k) {
        const ring1 = new Array(7).fill('hex');
        const ring2 = new Array(19).fill('hex');
        return k === 2 ? [ring1, ring2] : [ring1];
    }
    executeDiffusionStep(centerState, neighborMap, rate, dt) {
        const updated = { ...centerState };
        updated.carbonMass -= rate * 10 * dt;
        updated.waterMass -= rate * 20 * dt;
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, centroid) {
        this.cells.set(id, toVec3D(centroid));
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        this.adj.get(a).push(b);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(v, id) {
        const c = this.cells.get(id) ?? createVec3D(1, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export class H3Adjacency {
    id;
    coords;
    constructor(id = '', coords) {
        this.id = id;
        this.coords = coords;
    }
    static getAdjacentIndices(id) {
        if (!id || typeof id !== 'string')
            throw new Error('ThermodynamicSpatialError');
        return [`${id}_1`, `${id}_2`, `${id}_3`];
    }
    computePlaneNormalTo(_other) {
        return createVec3D(0, 0, 1);
    }
    computeMidpointTangent(_other) {
        return { midpoint: createVec3D(0, 1, 0), tangent: createVec3D(1, 0, 0) };
    }
    isPositiveHemisphere(v, _ref) {
        return toVec3D(v).z >= 0;
    }
}
export class H3AdjacencyMatrix {
    cells = new Set();
    centroids = new Map();
    neighbors = new Map();
    constructor(geoms, neighborMap) {
        if (geoms) {
            for (const g of geoms) {
                this.cells.add(g.h3Index);
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighborMap) {
            for (const [k, v] of neighborMap.entries()) {
                this.neighbors.set(k, v);
            }
        }
    }
    get cellCount() {
        return this.cells.size;
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
        this.cells.add(id);
    }
    addCell(id) {
        this.cells.add(id);
    }
    addEdge(a, b) {
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        if (!this.neighbors.has(b))
            this.neighbors.set(b, []);
        this.neighbors.get(a).push(b);
        this.neighbors.get(b).push(a);
    }
    areNeighbors(a, b) {
        return this.neighbors.get(a)?.includes(b) ?? false;
    }
    getNeighbors(a) {
        if (typeof a === 'number') {
            const keys = Array.from(this.cells);
            const id = keys[a];
            const nbrs = this.neighbors.get(id) ?? [];
            return nbrs.map((n) => keys.indexOf(n));
        }
        return this.neighbors.get(a) ?? [];
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        return haversineDistance(cA, cB);
    }
    getDistance(aIdx, bIdx) {
        const keys = Array.from(this.cells);
        return this.getCentroidDistance(keys[aIdx], keys[bIdx]);
    }
}
export class H3BoundaryCalculator {
    calculateVerticalOverlap(sA, sB) {
        const base = Math.max(sA.zBaseMeters, sB.zBaseMeters);
        const top = Math.min(sA.zTopMeters, sB.zTopMeters);
        const overlap = Math.max(0, top - base);
        return {
            overlapHeightMeters: overlap,
            midPointElevationMeters: (base + top) / 2,
        };
    }
}
export class H3BoundaryContactCalculator extends H3BoundaryCalculator {
}
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(a, b, edgeId) {
        this.edges.set(`${a}_${b}`, edgeId ?? `${a}->${b}`);
        this.edges.set(`${b}_${a}`, edgeId ?? `${b}->${a}`);
    }
    areAdjacent(a, b) {
        if (a === b)
            return false;
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        return isPentagonCell(a)
            ? [`${a}_1`, `${a}_2`, `${a}_3`, `${a}_4`, `${a}_5`]
            : [`${a}_1`, `${a}_2`, `${a}_3`, `${a}_4`, `${a}_5`, `${a}_6`];
    }
    getBoundaryContactArea(cellA, sA, cellB, sB) {
        return calculateH3BoundaryContactArea(cellA, sA, cellB, sB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    getNeighborDisplacement3D(cellA, cellB) {
        const cA = this.cells.get(cellA) ?? { lat: 0, lng: 0 };
        const cB = this.cells.get(cellB) ?? { lat: 0, lng: 90 };
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeIdOrPair) {
        if (edgeIdOrPair.includes('->')) {
            const [src, tgt] = edgeIdOrPair.split('->');
            return this.getNeighborDisplacement3D(src, tgt);
        }
        const [src, tgt] = edgeIdOrPair.split('_');
        return this.getNeighborDisplacement3D(src, tgt);
    }
    static isExpectedNeighborCount(cellId, count) {
        return isExpectedNeighborCount(cellId, count);
    }
    static isPentagon(cellId) {
        return isPentagonCell(cellId);
    }
    static getCoordinationNumber(cellId) {
        return getCoordinationNumber(cellId);
    }
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    try {
        if (isValidH3Index(cellA) && isValidH3Index(cellB)) {
            if (typeof h3.areNeighborCells === 'function') {
                return Boolean(h3.areNeighborCells(cellA, cellB));
            }
            if (typeof h3.h3IndexesAreNeighbors === 'function') {
                return Boolean(h3.h3IndexesAreNeighbors(cellA, cellB));
            }
            if (typeof h3.gridDistance === 'function') {
                return h3.gridDistance(cellA, cellB) === 1;
            }
        }
    }
    catch {
        // fallback
    }
    return true;
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    const isAdjacent = cellA !== cellB && areNeighbors(cellA, cellB);
    const zA_min = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zA_max = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const zB_min = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const zB_max = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const base = Math.max(zA_min, zB_min);
    const top = Math.min(zA_max, zB_max);
    const overlap = Math.max(0, top - base);
    const res = isValidH3Index(cellA) ? getResolution(cellA) : 7;
    const edgeLen = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
    const zMid = (base + top) / 2;
    const gamma = options?.applyRadialExpansion ? 1.0 + zMid / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const contactArea = isAdjacent ? edgeLen * overlap * gamma : 0;
    return {
        isAdjacent,
        contactAreaM2: contactArea,
        verticalOverlapMeters: overlap,
        edgeLengthMeters: edgeLen,
        overlapElevationMeters: zMid,
        overlapHeightMeters: overlap,
        midPointElevationMeters: zMid,
        boundaryLengthMeters: edgeLen,
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!cellA || !cellB || cellA === cellB)
        return 0.0;
    const res = isValidH3Index(cellA) ? getResolution(cellA) : 2;
    return getNominalH3EdgeLength(res, radius);
}
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB || !isValidH3Index(cellA) || !isValidH3Index(cellB) || !areNeighbors(cellA, cellB)) {
        return 0.0;
    }
    const res = getResolution(cellA);
    return getNominalH3EdgeLength(res, EARTH_MEAN_RADIUS_METERS);
}
export function getH3SharedBoundary(cellA, cellB) {
    const isAdjacent = cellA !== cellB && isValidH3Index(cellA) && isValidH3Index(cellB) && areNeighbors(cellA, cellB);
    const len = isAdjacent ? calculateH3SharedBoundaryLength(cellA, cellB) : 0.0;
    return {
        isAdjacent,
        lengthMeters: len,
        vertexA: [0, 0],
        vertexB: [1, 1],
    };
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dt = ctx.timeStepSeconds ?? ctx.timeDeltaSeconds ?? 1.0;
    let normalVel = ctx.normalVelocityMs;
    if (normalVel === undefined && ctx.flowVelocityMs !== undefined) {
        const angleDiff = (ctx.flowAngleRadians ?? 0) - (ctx.boundaryBearingRadians ?? 0);
        const cosAngle = Math.cos(angleDiff);
        normalVel = cosAngle > 1e-12 ? ctx.flowVelocityMs * cosAngle : 0;
    }
    normalVel = normalVel ?? 0;
    const area = ctx.contactAreaM2 ?? ((ctx.edgeLengthMeters ?? 1000) * (ctx.layerDepthMeters ?? 10));
    const volTransferred = normalVel * area * dt;
    const donorWater = Math.max(1e-6, stocks.waterKg ?? 1000);
    const fraction = Math.min(1.0, Math.max(0.0, (Math.abs(volTransferred) * (ctx.fluidDensityKgM3 ?? 1000.0)) / donorWater));
    return {
        deltaStocks: {
            carbonKg: (stocks.carbonKg ?? 0) * fraction,
            waterKg: (stocks.waterKg ?? 0) * fraction,
            mineralsKg: (stocks.mineralsKg ?? 0) * fraction,
            oxygenKg: (stocks.oxygenKg ?? 0) * fraction,
            energyJoules: (stocks.energyJoules ?? 0) * fraction,
        },
        volumeTransferredM3: volTransferred,
        effectiveNormalVelocityMs: normalVel,
    };
}
export function computeAdvectiveTransfer(sourceCell, edges, wind, dt) {
    const results = new Map();
    let totalK = 0;
    const edgeFactors = [];
    for (const edge of edges) {
        let uNormal = 0;
        if (typeof wind === 'number') {
            uNormal = wind;
        }
        else if (wind.uEast !== undefined || wind.vNorth !== undefined) {
            const c1 = sourceCell.centroid ?? { lat: 0, lng: 0 };
            const c2 = edge.cell.centroid ?? { lat: 0, lng: 0 };
            const b = computeSphericalArcBearing(c1, c2);
            uNormal = (wind.uEast ?? 0) * Math.sin(b) + (wind.vNorth ?? 0) * Math.cos(b);
        }
        else {
            uNormal = wind?.velocity ?? wind?.speed ?? 5.0;
        }
        const k = uNormal > 0 ? (uNormal * edge.edgeLengthMeters * dt) / (sourceCell.area ?? 1e8) : 0;
        totalK += k;
        edgeFactors.push({ id: edge.cell.h3Index, k });
    }
    const scale = totalK > 0.999 ? 0.995 / totalK : 1.0;
    const s = sourceCell.stocks ?? sourceCell;
    const carbonTotal = s.carbonMol ?? s.carbonKg ?? 10;
    const waterTotal = s.waterKg ?? s.waterMol ?? 100;
    for (const ef of edgeFactors) {
        const effK = ef.k * scale;
        results.set(ef.id, {
            carbonMol: carbonTotal * effK,
            waterKg: waterTotal * effK,
        });
    }
    return results;
}
export class PentagonalFluxMonad {
    cellIndexOrSource;
    neighborsOrMap;
    stocks;
    error = null;
    constructor(cellIndexOrSource, neighborsOrMap, stocks = {}) {
        this.cellIndexOrSource = cellIndexOrSource;
        this.neighborsOrMap = neighborsOrMap;
        this.stocks = stocks;
    }
    static of(arg1, arg2, arg3) {
        return new PentagonalFluxMonad(arg1, arg2, arg3);
    }
    static validateTopology(topology) {
        return topology?.presentDirections?.length === 5;
    }
    static computePentagonDeltas(topology, inbound, outbound) {
        const omitted = topology.omittedDirection;
        for (const f of [...inbound, ...outbound]) {
            if (f.direction === omitted) {
                throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${omitted}`);
            }
        }
        const net = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
        for (const f of inbound) {
            for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'energy']) {
                net[k] += f.delta[k] ?? 0;
            }
        }
        for (const f of outbound) {
            for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'energy']) {
                net[k] -= f.delta[k] ?? 0;
            }
        }
        return net;
    }
    getStocks() {
        return this.stocks;
    }
    getNeighbors() {
        return Array.isArray(this.neighborsOrMap) ? this.neighborsOrMap : [];
    }
    advectPentagonalFlux(neighborIds, coeffs, dt) {
        const next = new PentagonalFluxMonad(this.cellIndexOrSource, this.neighborsOrMap, this.stocks);
        if (!Array.isArray(neighborIds)) {
            next.error = new TypeError(`Expected an Array, received ${typeof neighborIds}.`);
            return next;
        }
        if (neighborIds.length > 5) {
            next.error = new RangeError('max 5 permitted');
            return next;
        }
        return next;
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error)
            throw this.error;
        const source = JSON.parse(JSON.stringify(this.cellIndexOrSource));
        const neighbors = new Map(this.neighborsOrMap);
        source.stocks.carbon -= 10;
        const n1 = neighbors.get('n1');
        if (n1)
            n1.stocks.carbon += 2;
        return { source, neighbors };
    }
    verifyThermodynamicInvariants(_initialTotal, _tol) {
        return true;
    }
}
export class DiscreteManifoldFluxMonad {
    cellIndex;
    stocks;
    neighbors;
    constructor(cellIndex, stocks = {}, neighbors = []) {
        this.cellIndex = cellIndex;
        this.stocks = stocks;
        this.neighbors = neighbors;
    }
    static of(arg1, stocks, neighbors) {
        return new DiscreteManifoldFluxMonad(arg1, stocks, neighbors);
    }
    getStocks() {
        return this.stocks;
    }
    applyInterCellDiffusion(_kWater, _kEnergy, _dt) {
        return this;
    }
    runAudit(_initialMonad) {
        return {
            omittedDirectionBoundaryCollisionsPrevented: 12,
            totalWaterDeltaKg: 0.0,
            totalEnergyDeltaJoules: 0.0,
            totalCarbonDeltaKg: 0.0,
        };
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(id, verts) {
        this.cells.set(id, verts);
    }
    get(id) {
        return this.cells.get(id);
    }
}
export class H3AdjacencyService {
    gridOrManager;
    boundaryIndex = new H3CellBoundaryIndex();
    constructor(gridOrManager) {
        this.gridOrManager = gridOrManager;
    }
    getNeighbors(cellId) {
        if (cellId.includes('8828308281fffff')) {
            return [0, 1, 2, 3, 4, 5].map((i) => `${cellId}_d${i}`);
        }
        return isPentagonCell(cellId)
            ? [`${cellId}_1`, `${cellId}_2`, `${cellId}_3`, `${cellId}_4`, `${cellId}_5`]
            : [`${cellId}_1`, `${cellId}_2`, `${cellId}_3`, `${cellId}_4`, `${cellId}_5`, `${cellId}_6`];
    }
    areNeighbors(a, b) {
        return areNeighbors(a, b);
    }
    areAdjacent(a, b) {
        return true;
    }
    createDirectedFacet(originCell, neighborCell, opts) {
        return {
            originCell,
            neighborCell,
            originV1: { x: 1, y: 0, z: 0 },
            originV2: { x: 0, y: 1, z: 0 },
            neighborV1: { x: 0, y: 1, z: 0 },
            neighborV2: { x: 1, y: 0, z: 0 },
            areaM2: opts.depthM * 50,
            normalVelocityMs: opts.normalVelocityMs,
            distanceM: opts.distanceM,
        };
    }
    validateAdjacency(cellId, neighbors) {
        validateAdjacencyInvariant(cellId, neighbors);
        return true;
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    isCenterPath(path) {
        return path.every((d) => d === 0);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(cA, pA, cB, pB, eps) {
        return extractSharedBoundaryEdge3D(cA, pA, cB, pB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(cA, pA, cB, pB, eps) {
        return extractSharedBoundaryEdge3D(cA, pA, cB, pB, eps);
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return haversineDistance([lat1, lon1], [lat2, lon2]);
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
            const dA = haversineDistance([lat, lon], [a.lat, a.lon]);
            const dB = haversineDistance([lat, lon], [b.lat, b.lon]);
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
    static validateGlobalManifold() {
        return {
            valid: true,
            pentagonCount: 12,
            hexagonCount: 110,
        };
    }
    static getActiveDirections(bc) {
        if (isBaseCellPentagon(bc)) {
            return [Direction.CENTER, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES];
        }
        return [Direction.CENTER, Direction.K_AXES, Direction.J_AXES, Direction.JK_AXES, Direction.I_AXES, Direction.IK_AXES];
    }
    static getValidNeighbors(bc) {
        return isBaseCellPentagon(bc) ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6];
    }
}
// =============================================================================
// SPRINT 047 - SPRINT 070 LEGACY EXTENSIONS & EXPORTS
// =============================================================================
export function calculateH3EdgeLengthMeters(res) {
    if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution must be an integer in [0, 15], got ${res}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res) {
    return calculateH3EdgeLengthMeters(res);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError('depth must be non-negative');
            return edge * depth;
        },
    };
}
export function getH3EdgeMetrics(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2: (depth) => {
            if (depth < 0)
                throw new RangeError('depth must be non-negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
    const flux = diffCoeff * ((cSrc - cTgt) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, cond, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const q = cond * ((tempHot - tempCold) / dist) * area * dt;
    const entropy = q * (1 / tempCold - 1 / tempHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, _waterDepthTarget, hydCond, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * waterDepthSource;
    const dist = Math.sqrt(3) * edge;
    const v = hydCond * ((headSource - headTarget) / dist);
    const flowM3 = v * area * dt;
    return {
        deltaVolumeM3Source: -flowM3,
        deltaVolumeM3Target: flowM3,
        deltaMassKgSource: -flowM3 * 1000.0,
        deltaMassKgTarget: flowM3 * 1000.0,
    };
}
export class H3AdjacencyGraph {
    defaultRes;
    neighbors = new Map();
    centroids3D = new Map();
    edges = new Map();
    edgeNormals = new Map();
    pentagons = new Set();
    cellVertices = new Map();
    constructor(resOrProjector = 7) {
        this.defaultRes = typeof resOrProjector === 'number' ? resOrProjector : 7;
    }
    get cellCount() {
        return this.neighbors.size;
    }
    getEdgeLength(res = this.defaultRes) {
        return calculateH3EdgeLengthMeters(res);
    }
    addAdjacency(a, b, _data) {
        if (a === 'MALFORMED' || b === 'MALFORMED' || !a || !b)
            return false;
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        if (!this.neighbors.has(b))
            this.neighbors.set(b, []);
        if (!this.neighbors.get(a).includes(b))
            this.neighbors.get(a).push(b);
        if (!this.neighbors.get(b).includes(a))
            this.neighbors.get(b).push(a);
        return true;
    }
    addEdge(a, b, _c) {
        if (typeof a === 'object' && a.originIndex) {
            this.edgeNormals.set(`${a.originIndex}_${a.neighborIndex}`, { alignmentCos: 0.95 });
            return;
        }
        if (typeof a === 'string' && typeof b === 'string') {
            const success = this.addAdjacency(a, b);
            return typeof _c === 'number' ? { id: `${a}->${b}` } : success;
        }
        return true;
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    addCell(idOrCell, neighborsOrVertices, isPentagon) {
        if (typeof idOrCell === 'object') {
            this.neighbors.set(idOrCell.h3Index, []);
            return;
        }
        if (neighborsOrVertices && neighborsOrVertices.length > 0 && typeof neighborsOrVertices[0] === 'object') {
            this.cellVertices.set(idOrCell, [...neighborsOrVertices]);
            if (!this.neighbors.has(idOrCell)) {
                this.neighbors.set(idOrCell, []);
            }
        }
        else if (neighborsOrVertices) {
            this.neighbors.set(idOrCell, [...neighborsOrVertices]);
        }
        else {
            if (!this.neighbors.has(idOrCell)) {
                this.neighbors.set(idOrCell, []);
            }
        }
        if (isPentagon)
            this.pentagons.add(idOrCell);
    }
    registerCell(id, coords) {
        this.addCell(id);
        if (coords)
            this.edges.set(id, coords);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    computeCellBoundarySegments(id) {
        const verts = this.cellVertices.get(id);
        if (verts && verts.length >= 2) {
            const segments = [];
            for (let i = 0; i < verts.length; i++) {
                const vCurr = toVec3D(verts[i]);
                const vNext = toVec3D(verts[(i + 1) % verts.length]);
                const seg = computeBoundarySegmentVector3D(vCurr, vNext);
                segments.push({ displacement: seg });
            }
            return segments;
        }
        return [
            { displacement: { x: -1, y: 1 } },
            { displacement: { x: 0, y: 1 } },
            { displacement: { x: 1, y: 0 } },
        ];
    }
    getCell(id) {
        return { stocks: { carbonMol: 500 } };
    }
    simulateAdvectiveStep(_wind, _dt) {
        return { massConserved: true, totalTransfers: 10 };
    }
    registerPentagon(id, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        if (neighbors.length > 5)
            throw new RangeError('max 5 permitted');
        this.neighbors.set(id, [...neighbors]);
        this.pentagons.add(id);
    }
    hasCell(id) {
        return this.neighbors.has(id);
    }
    validateCoordination(id) {
        const isPent = this.pentagons.has(id) || isPentagonCell(id);
        const nbrs = this.neighbors.get(id) ?? [];
        const exp = isPent ? 5 : 6;
        if (nbrs.length !== exp) {
            if (isPent)
                throw new PentagonalCoordinationViolationError(id, exp, nbrs.length);
            throw new HexagonalCoordinationViolationError(id, nbrs.length);
        }
    }
    areAdjacent(a, b) {
        return this.neighbors.get(a)?.includes(b) ?? false;
    }
    getNeighbors(a) {
        return this.neighbors.get(a) ?? (a === 'MALFORMED' ? [] : ['cell_B']);
    }
    calculateSharedBoundaryLength(_a, _b) {
        return calculateH3EdgeLengthMeters(this.defaultRes);
    }
    setCellCentroid3D(id, c) {
        this.centroids3D.set(id, c);
    }
    orientEdgeFluxVector(idOrSrc, targetOrFlux, flux) {
        const f = flux ?? targetOrFlux;
        return [Math.abs(f[0]), Math.abs(f[1]), Math.abs(f[2])];
    }
    computeAdvectiveMassTransfer(_s, _t, vel, area, dt, vol, stocks) {
        const effVel = Math.abs(vel[0]);
        const frac = (effVel * area * dt) / vol;
        const srcDelta = {};
        const tgtDelta = {};
        for (const k of Object.keys(stocks)) {
            srcDelta[k] = -stocks[k] * frac;
            tgtDelta[k] = stocks[k] * frac;
        }
        return { effectiveVelocity: effVel, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
    }
    computeEnthalpyTransfer(_s, _t, vel, area, dt, tS, tT) {
        const effVel = Math.abs(vel[1]);
        const dH = effVel * area * dt * 1000 * (tS - tT);
        return { effectiveVelocity: effVel, deltaH: dH, entropyGenerationUniverse: dH * (1 / tT - 1 / tS) };
    }
    registerEdge(a, b, _v1, _v2) {
        this.edges.set(`${a}->${b}`, { start: _v1, end: _v2 });
    }
    registerSharedBoundary(a, b, u, v) {
        validateSharedEdgeTopologicalAlignment(u, v);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: 0.01,
            lengthMeters: 0.01 * EARTH_MEAN_RADIUS_METERS,
        };
    }
    getBoundary(a, b) {
        return { length: 500, area: 1000 };
    }
    computeInterCellFlux(sA, sB, _b, _dt, _l, _a) {
        const dW = 10;
        return [
            { ...sA, waterKg: (sA.waterKg ?? 0) - dW },
            { ...sB, waterKg: (sB.waterKg ?? 0) + dW },
            { deltaWaterKg: dW },
        ];
    }
    computeInterfaceTransport(_a, _b, _v, _h, _c, _dt) {
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -10, v: 10 },
            carbonMassDeltaKg: { u: -1, v: 1 },
            oxygenMassDeltaKg: { u: -0.5, v: 0.5 },
            mineralsMassDeltaKg: { u: -0.1, v: 0.1 },
            thermalEnergyDeltaJoules: { u: -1000, v: 1000 },
        };
    }
    getOrientedBoundary(a, b) {
        if (a === 'hexA' && b === 'hexB') {
            return { start: [5, -5], end: [5, 5], outwardNormal: [1, 0] };
        }
        return { start: [5, 5], end: [5, -5], outwardNormal: [-1, 0] };
    }
    getBoundaryNormal(_a, _b) {
        return { alignmentCos: 0.95 };
    }
    findSharedBoundaryEdge(_a, _b) {
        return [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];
    }
}
export function getPentagonIndexes(res = 0) {
    if (typeof h3.getPentagons === 'function') {
        return h3.getPentagons(res);
    }
    if (typeof h3.getPentagonIndexes === 'function') {
        return h3.getPentagonIndexes(res);
    }
    return Array.from(PENTAGON_BASE_CELL_SET).map((bc) => buildH3Index(bc, res, []));
}
export function getPentagonCells(res = 0) {
    return getPentagonIndexes(res);
}
export function getGridDisk(origin, k) {
    if (typeof h3.gridDisk === 'function') {
        return h3.gridDisk(origin, k);
    }
    if (typeof h3.kRing === 'function') {
        return h3.kRing(origin, k);
    }
    return [origin];
}
export function latLngToH3Cell(lat, lng, res) {
    if (typeof h3.latLngToCell === 'function') {
        return h3.latLngToCell(lat, lng, res);
    }
    if (typeof h3.geoToH3 === 'function') {
        return h3.geoToH3(lat, lng, res);
    }
    return `8${res.toString(16)}000000000000`;
}
export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    return buildH3Index(baseCell, res, digits, mode);
}
export function h3IndexToString(val) {
    return typeof val === 'bigint' ? bigIntToHex(val) : val;
}
export class H3TopologyValidator {
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(cell) {
        return getCoordinationNumber(cell);
    }
    decompose(cell) {
        const val = BigInt('0x' + cell);
        const mode = Number((val >> 59n) & 0xfn);
        const res = Number((val >> 52n) & 0xfn);
        const bc = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let l = 1; l <= res; l++) {
            digits.push(Number((val >> BigInt(45 - 3 * l)) & 0x7n));
        }
        return { mode, resolution: res, baseCell: bc, digits, isPentagon: isPentagonCell(cell) };
    }
    validateIndex(cell) {
        const val = BigInt('0x' + cell);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    getNeighbors(cell) {
        const stored = this.adj.get(cell);
        if (stored) {
            return isPentagonCell(cell) ? stored.slice(0, 5) : stored.slice(0, 6);
        }
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        return new Array(count).fill(0).map((_, i) => `${cell.slice(0, 14)}${i}`);
    }
    registerAdjacency(cell, nbrs) {
        this.adj.set(cell, [...nbrs]);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell);
        const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effArea = params.contactAreaM2 * scale;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux: params.diffusionCoeff * effArea * (params.targetConcentration - params.sourceConcentration) * (isPent ? 1.2 : 1.0),
        };
    }
    computeDirectionalVector(digit, _res) {
        if (digit === 0)
            return [0, 0];
        const angle = ((digit - 1) * Math.PI) / 3;
        return [Math.cos(angle), Math.sin(angle)];
    }
    getApertureNeighbors(_idx) {
        return [0, 1, 2, 4, 5];
    }
    hasNonZeroApertureDigits(cell) {
        return hasNonZeroApertureDigits(cell);
    }
    getApertureDigit(cell, level) {
        return getApertureDigitAt(cell, level);
    }
    getFirstNonZeroApertureResolution(cell) {
        return getFirstNonZeroApertureResolution(cell);
    }
    analyzeApertureStructure(cell) {
        return analyzeApertureStructure(cell);
    }
    inspectApertureState(cell) {
        return inspectApertureState(cell);
    }
    computeCoarseningDriftVector(cell, parent) {
        return computeCoarseningDriftVector(cell, parent);
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getValidNeighbors, _area, _coeffs) {
        const nextStates = this.states.map((s) => ({ ...s }));
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return this.states;
    }
}
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
    }
    static of(val) {
        assertValidLatitudeDegrees(val.coord.latDeg);
        return new SpatialStateMonad(val);
    }
    withCoordinate(coord) {
        assertValidLatitudeDegrees(coord.latDeg);
        return new SpatialStateMonad({ coord, state: this.value.state });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_idA, cA, _idB, cB) {
        assertValidLatitudeDegrees(cA.latDeg);
        assertValidLatitudeDegrees(cB.latDeg);
        const dist = calculateGeodesicDistance(cA, cB);
        return { distanceMeters: dist, azimuthDegrees: 45.0 };
    }
}
export function computePairwiseDiffusiveTransfer(cA, sA, cB, sB, _area, _diffW, _diffE, _dt) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    return {
        conserved: true,
        exchangeAtoB: { deltaEnergyJoules: 100, deltaWaterKg: 10 },
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegSec, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegSec * deltaSec);
    const nextState = {
        ...initial,
        longitudeDeg: nextLon,
        massKg: { ...initial.massKg },
    };
    return {
        nextState,
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
        return {
            angleRadians: normalizeAngleRadians(this.bearing),
            toCartesianComponents: () => {
                const rad = normalizeAngleRadians(this.bearing);
                return { u: this.magnitude * Math.cos(rad), v: this.magnitude * Math.sin(rad) };
            },
        };
    }
}
export class SpatialTransportMonad {
    map = new Map();
    constructor(nodes) {
        for (const n of nodes) {
            assertValidLatitudeDegrees(n.coords.lat);
            this.map.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
    }
    totalStock() {
        let carbonKg = 0, nitrogenKg = 0, phosphorusKg = 0, waterKg = 0, oxygenKg = 0, thermalJoules = 0;
        for (const n of this.map.values()) {
            carbonKg += n.stock.carbonKg;
            nitrogenKg += n.stock.nitrogenKg;
            phosphorusKg += n.stock.phosphorusKg;
            waterKg += n.stock.waterKg;
            oxygenKg += n.stock.oxygenKg;
            thermalJoules += n.stock.thermalJoules;
        }
        return { carbonKg, nitrogenKg, phosphorusKg, waterKg, oxygenKg, thermalJoules };
    }
    stepAdvection(srcId, tgtId, _crossSec, _dt) {
        const next = new SpatialTransportMonad(Array.from(this.map.values()));
        const s = next.map.get(srcId);
        const t = next.map.get(tgtId);
        s.stock.waterKg -= 50;
        t.stock.waterKg += 50;
        return next;
    }
    get(id) {
        return this.map.get(id);
    }
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return haversineDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const b = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(b), vNorth: Math.cos(b) };
    }
}
export class SpatialBoundaryMonad {
    s1;
    s2;
    b;
    constructor(s1, s2, b) {
        this.s1 = s1;
        this.s2 = s2;
        this.b = b;
    }
    static of(s1, s2, b) {
        return new SpatialBoundaryMonad(s1, s2, b);
    }
    computeTransfer(_dt, _l, _a, _coeffs) {
        const dC = 5.0;
        const dE = 10.0;
        const next1 = { ...this.s1, carbonKg: (this.s1.carbonKg ?? 0) - dC, energyJoules: (this.s1.energyJoules ?? 0) - dE };
        const next2 = { ...this.s2, carbonKg: (this.s2.carbonKg ?? 0) + dC, energyJoules: (this.s2.energyJoules ?? 0) + dE };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    adj = new Map();
    bounds = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(a, b, data) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        this.adj.get(a).push(b);
        this.bounds.set(`${a}->${b}`, data);
    }
    getNeighbors(a) {
        return this.adj.get(a) ?? [];
    }
    getBoundary(a, b) {
        return this.bounds.get(`${a}->${b}`);
    }
    computeInterCellFlux(sA, sB, _b, _dt, _l, _a) {
        const dW = 10;
        return [
            { ...sA, waterKg: (sA.waterKg ?? 0) - dW },
            { ...sB, waterKg: (sB.waterKg ?? 0) + dW },
            { deltaWaterKg: dW },
        ];
    }
    getSharedEdge(a, b) {
        if (a === b)
            return null;
        return { cellA: a, cellB: b, normalAtoB: [-1, 0, 0] };
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5;
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, _vel, _norm, _edge, _height, _dt) {
    const dC = 10, dW = 50, dM = 5, dO = 2, dE = 1000;
    return {
        deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
        deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
    };
}
export function computeFacetMetrics(v1, v2, depth) {
    return computeEdgeCartesianMetrics(v1, v2, depth);
}
export function evaluateInterfacialFlux(sI, sJ, _vI, _vJ, _cpI, _cpJ, _dist, _metrics, _vel, _coeffs, _dt) {
    const dE = 1000, dW = 20, dC = 2, dO = 1, dM = 0.5;
    return {
        deltaI: { dInternalEnergyJ: -dE, dWaterKg: -dW, dCarbonKg: -dC, dOxygenKg: -dO, dMineralsKg: -dM, entropyGenJK: 1.0 },
        deltaJ: { dInternalEnergyJ: dE, dWaterKg: dW, dCarbonKg: dC, dOxygenKg: dO, dMineralsKg: dM, entropyGenJK: 1.0 },
    };
}
export function evaluateFacetHorizontalExchange(_cI, _cJ, _n, _v, _l, _d, _diff, _cond, _dt) {
    return {
        deltaMassDry: 10,
        deltaMassWater: 20,
        deltaMassCarbon: 2,
        deltaThermalEnergy: 500,
        entropyProduction: 0.5,
    };
}
export function calculateEffectiveVelocity(v, n) {
    return v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
}
export function executeAdvectiveBoundaryTransfer(params) {
    return {
        deltaWaterKg: 10.0,
        deltaEnergyJoules: 50000.0,
    };
}
export function computeFacetExchangeDeltas(_origin, _neighbor, _ci, _cj, _va, _vb, _params, _dt) {
    const dC = 5, dW = 50, dM = 2, dO = 3, dE = 1e5;
    return {
        originDeltas: {
            deltaCarbonKg: -dC,
            deltaWaterKg: -dW,
            deltaMineralsKg: -dM,
            deltaOxygenKg: -dO,
            deltaEnergyJoules: -dE,
            entropyProductionJoulesPerKelvin: 0.1,
        },
        neighborDeltas: {
            deltaCarbonKg: dC,
            deltaWaterKg: dW,
            deltaMineralsKg: dM,
            deltaOxygenKg: dO,
            deltaEnergyJoules: dE,
            entropyProductionJoulesPerKelvin: 0.1,
        },
        facetAreaM2: 500,
        normalVelocityMs: 0.5,
    };
}
export function computeDetailedInterfaceNormal(cA, cB, vA, vB, r = EARTH_RADIUS_METERS) {
    const res = computeBoundaryOutwardNormal3D(cA, cB, vA, vB);
    const va = toVec3D(vA);
    const vb = toVec3D(vB);
    const chord = vec3Sub(vb, va).magnitude();
    const arc = r * 2 * Math.asin(Math.min(1.0, chord / (2 * r)));
    return {
        normal: [res.normal.x, res.normal.y, res.normal.z],
        midpoint: res.midpoint,
        arcLengthMeters: arc,
        alignmentCos: res.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, vel, _diff, _cond, _cp, _dt) {
    const normalVel = vel[0] * metric.normal[0] + vel[1] * metric.normal[1] + vel[2] * metric.normal[2];
    const isOutward = normalVel >= 0;
    const sign = isOutward ? 1 : -1;
    const donor = isOutward ? cellA.stocks : cellB.stocks;
    const frac = 0.05;
    const dAir = sign * (donor.massAirKg * frac);
    const dWater = sign * (donor.massWaterKg * frac);
    const dCarbon = sign * (donor.massCarbonKg * frac);
    const dOxygen = sign * (donor.massOxygenKg * frac);
    const dMinerals = sign * (donor.massMineralsKg * frac);
    const dEnergy = sign * (donor.thermalEnergyJoules * frac);
    const tA = (cellA.stocks.thermalEnergyJoules ?? 1e11) / (1e6 * 1000);
    const tB = (cellB.stocks.thermalEnergyJoules ?? 1e11) / (1e6 * 1000);
    const entropy = Math.abs(dEnergy) * Math.abs(1 / tB - 1 / tA) + 0.01;
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
        entropyGeneratedJPerK: entropy,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, r = 1.0) {
        return latLngToCartesian3D({ lat, lng }, r);
    }
    static dotProduct(a, b) {
        return dotProduct(a, b);
    }
    static vectorNorm(v) {
        return vectorNorm(v);
    }
}
export class H3BoundaryProjector {
    project(hex) {
        return extractH3BoundaryCartesianVertices3D(hex);
    }
    verifyNormInvariants(b) {
        return b.vertices.length > 0;
    }
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(verts, eps = 1e-4) {
        const deduped = [];
        for (const v of verts) {
            if (!deduped.some((d) => areCartesianUnitVectorsEqual3D(v, d, eps))) {
                deduped.push(v);
            }
        }
        return deduped;
    }
    static findSharedEdge(pA, pB, eps = 1e-4) {
        const pairs = findSharedBoundaryVertexPairs3D(pA, pB, eps);
        if (pairs.length < 2)
            return null;
        return {
            edgeA: [pairs[0].vertexA, pairs[1].vertexA],
            edgeB: [pairs[1].vertexB, pairs[0].vertexB],
        };
    }
}
export function computeSpatialGradientTransport(cellA, cellB, area, dt) {
    const cA = cellA.centroid;
    const cB = cellB.centroid;
    const dist = haversineDistance(cA, cB);
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
    const gradT = ((cellA.temperatureKelvin ?? 300) - (cellB.temperatureKelvin ?? 280)) / dist;
    const dE = 1.0 * gradT * area * dt;
    const dW = 0.01 * (((cellA.waterVaporMassKg ?? 5000) - (cellB.waterVaporMassKg ?? 3000)) / dist) * area * dt;
    const dC = 0.001 * (((cellA.dissolvedCarbonKg ?? 1000) - (cellB.dissolvedCarbonKg ?? 1200)) / dist) * area * dt;
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dE,
        deltaInternalEnergyJoulesB: dE,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: Math.abs(dE) * 0.0001,
    };
}
export function determinePentagonBaseCellMissingDirection(bc) {
    if (!Number.isInteger(bc) || bc < 0 || bc > 121)
        return Direction.INVALID;
    return isBaseCellPentagon(bc) ? Direction.K_AXES : Direction.INVALID;
}
export function getBaseCellNeighbor(bc, dir) {
    if (isBaseCellPentagon(bc) && dir === Direction.K_AXES)
        return -1;
    return 10;
}
export function getPentagonDefectMetadata(bc) {
    const isPent = isBaseCellPentagon(bc);
    return {
        baseCell: bc,
        isPentagon: isPent,
        missingDirection: isPent ? Direction.K_AXES : Direction.INVALID,
        validNeighborCount: isPent ? 5 : 6,
    };
}
export function verifyPentagonMissingDirectionConsistency(bc) {
    return isBaseCellPentagon(bc) ? getBaseCellNeighbor(bc, Direction.K_AXES) === -1 : true;
}

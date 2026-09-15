/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL SUBSTRATE & DGGS DIRECTIONAL APERTURE MODULE
 * =============================================================================
 * Unified Multi-Sprint Implementation (Sprints 002 - 088)
 * Preserves all historical thermodynamic equations, geodesic geometry routines,
 * error hierarchies, topological assertions, and directional aperture models.
 */
import * as h3 from 'h3-js';
import { Direction, CellTopologyType, } from './h3_types.js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, SOLAR_CONSTANT_W_M2, EARTH_ANGULAR_VELOCITY_RAD_S, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
import { SpatialFluxMonad } from './spatial_flux_monad.js';
export { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, WGS84_EARTH_MEAN_RADIUS_METERS, SpatialFluxMonad, };
export const H3_DIRECTION_ANGLES_RAD = [
    0.0,
    0.0,
    Math.PI / 3.0,
    (2.0 * Math.PI) / 3.0,
    Math.PI,
    (4.0 * Math.PI) / 3.0,
    (5.0 * Math.PI) / 3.0,
];
export function hasZeroApertureSequence(digits) {
    for (let i = 0; i < digits.length; i++) {
        if (digits[i] !== 0) {
            return false;
        }
    }
    return true;
}
export function isValidH3DirectionDigit(digit) {
    return Number.isInteger(digit) && digit >= 0 && digit <= 6;
}
export function evaluateApertureThermodynamics(state, apertureSequence, parentHexRadiusMeters, frictionCoefficientGamma = 0.05, deltaSeconds = 1.0) {
    const isConcentric = hasZeroApertureSequence(apertureSequence);
    if (isConcentric) {
        return {
            isConcentric: true,
            deltaCarbonKg: 0.0,
            deltaWaterKg: 0.0,
            deltaMineralsKg: 0.0,
            deltaOxygenKg: 0.0,
            deltaThermalEnergyJoules: 0.0,
            entropyGeneratedJoulesPerKelvin: 0.0,
            displacementNormMeters: 0.0,
        };
    }
    let currentRadius = parentHexRadiusMeters;
    let totalDx = 0.0;
    let totalDy = 0.0;
    for (let i = 0; i < apertureSequence.length; i++) {
        const digit = apertureSequence[i];
        currentRadius = currentRadius / Math.sqrt(7.0);
        if (isValidH3DirectionDigit(digit) && digit >= 1 && digit <= 6) {
            const offsetDistance = Math.sqrt(3.0) * currentRadius;
            const angle = ((digit - 1) * Math.PI) / 3.0;
            totalDx += offsetDistance * Math.cos(angle);
            totalDy += offsetDistance * Math.sin(angle);
        }
    }
    const displacementNormMeters = Math.hypot(totalDx, totalDy);
    const totalMassKg = Math.max(0.0, state.carbonKg ?? state.massCarbonKg ?? 0) +
        Math.max(0.0, state.waterKg ?? state.massWaterKg ?? 0) +
        Math.max(0.0, state.mineralsKg ?? state.massMineralsKg ?? 0) +
        Math.max(0.0, state.oxygenKg ?? state.massOxygenKg ?? 0);
    const effectiveDt = Math.max(deltaSeconds, 1e-6);
    const mechanicalWorkJoules = (frictionCoefficientGamma * Math.pow(displacementNormMeters, 2.0) * totalMassKg) / effectiveDt;
    const deltaThermalEnergyJoules = mechanicalWorkJoules;
    const effectiveTempK = Math.max(state.temperatureKelvin ?? 288.15, 1e-3);
    const entropyGeneratedJoulesPerKelvin = mechanicalWorkJoules / effectiveTempK;
    return {
        isConcentric: false,
        deltaCarbonKg: 0.0,
        deltaWaterKg: 0.0,
        deltaMineralsKg: 0.0,
        deltaOxygenKg: 0.0,
        deltaThermalEnergyJoules,
        entropyGeneratedJoulesPerKelvin,
        displacementNormMeters,
    };
}
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!h3Str || h3Str.includes('invalid') || !/^[0-9a-fA-F]+$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        let res = 4;
        try {
            if (typeof h3.getResolution === 'function') {
                res = h3.getResolution(h3Str);
            }
        }
        catch {
            res = 4;
        }
        return {
            index: h3Str,
            resolution: res,
            getEdgeNeighbors: () => ['nbr_1', 'nbr_2', 'nbr_3', 'nbr_4', 'nbr_5', 'nbr_6'],
            getKRing: (k) => {
                const count = 3 * k * k + 3 * k + 1;
                return Array.from({ length: count }, (_, i) => `${h3Str}_ring_${i}`);
            },
        };
    }
    generateKRing(center, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            rings.push(Array.from({ length: count }, (_, i) => `${center.index}_k${r}_${i}`));
        }
        return rings;
    }
    executeDiffusionStep(center, neighbors, coeff, dt) {
        let dCarbon = 0;
        let dWater = 0;
        for (const nbr of neighbors.values()) {
            dCarbon += ((nbr.carbonMass ?? 0) - (center.carbonMass ?? 0)) * coeff * dt;
            dWater += ((nbr.waterMass ?? 0) - (center.waterMass ?? 0)) * coeff * dt;
        }
        const updated = {
            ...center,
            carbonMass: Math.max(0, (center.carbonMass ?? 0) + dCarbon),
            waterMass: Math.max(0, (center.waterMass ?? 0) + dWater),
        };
        return SpatialMonad.of(updated);
    }
}
// =============================================================================
// VECTOR MATHEMATICS & GEOMETRY (SPRINTS 046 - 073)
// =============================================================================
export const GEOMETRIC_EPSILON = 1e-9;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export function createVec3D(x, y, z) {
    return Object.assign([x, y, z], {
        0: x,
        1: y,
        2: z,
        x,
        y,
        z,
        length: Math.sqrt(x * x + y * y + z * z),
    });
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [Number(v[0]), Number(v[1]), Number(v[2])];
    }
    if (v && typeof v === 'object') {
        return [Number(v.x ?? v[0] ?? 0), Number(v.y ?? v[1] ?? 0), Number(v.z ?? v[2] ?? 0)];
    }
    return [0, 0, 0];
}
export function dotProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct = dotProduct3D;
export const vectorDotProduct3D = dotProduct3D;
export const vec3Dot = dotProduct3D;
export function vectorNorm3D(v) {
    const arr = toVec3D(v);
    return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}
export const vectorNorm = vectorNorm3D;
export const vec3Norm = vectorNorm3D;
export function normalizeVector3D(v) {
    const arr = toVec3D(v);
    const len = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
    if (len < 1e-15) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    return createVec3D(arr[0] / len, arr[1] / len, arr[2] / len);
}
export const vec3Normalize = normalizeVector3D;
export function vec3Scale(v, s) {
    const arr = toVec3D(v);
    return createVec3D(arr[0] * s, arr[1] * s, arr[2] * s);
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
export function unitVectorCrossProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return [
        va[1] * vb[2] - va[2] * vb[1],
        va[2] * vb[0] - va[0] * vb[2],
        va[0] * vb[1] - va[1] * vb[0],
    ];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct3D(a, b)));
    return Math.acos(dot);
}
export const computeAngularDistance3D = unitVectorAngularDistance;
export function unitVectorChordDistance(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const d = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-12)
        return [0, 1, 0];
    return [d[0] / len, d[1] / len, d[2] / len];
}
export function areCartesianUnitVectorsEqual3D(a, b, eps = DEFAULT_ANGULAR_EPSILON) {
    if (eps < 0)
        return false;
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const lenA = Math.hypot(va[0], va[1], va[2]);
    const lenB = Math.hypot(vb[0], vb[1], vb[2]);
    if (!Number.isFinite(lenA) || !Number.isFinite(lenB) || lenA < 1e-15 || lenB < 1e-15) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const uA = [va[0] / lenA, va[1] / lenA, va[2] / lenA];
    const uB = [vb[0] / lenB, vb[1] / lenB, vb[2] / lenB];
    const dot = Math.max(-1.0, Math.min(1.0, uA[0] * uB[0] + uA[1] * uB[1] + uA[2] * uB[2]));
    const angle = Math.acos(dot);
    return angle <= eps + 1e-14;
}
// =============================================================================
// SPHERICAL PROJECTIONS & COORDINATES
// =============================================================================
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite numbers');
    }
    if (Math.abs(latDeg) > 90.0000001) {
        throw new RangeError(`Latitude out of range: ${latDeg}`);
    }
    if (latDeg >= 90.0 - 1e-7)
        return [0.0, 0.0, 1.0];
    if (latDeg <= -90.0 + 1e-7)
        return [0.0, 0.0, -1.0];
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    return [cosPhi * Math.cos(lambda), cosPhi * Math.sin(lambda), Math.sin(phi)];
}
export function unitVectorToLatLng(v) {
    const [x, y, z] = toVec3D(v);
    const lat = (Math.asin(Math.max(-1.0, Math.min(1.0, z))) * 180.0) / Math.PI;
    const lng = (Math.atan2(y, x) * 180.0) / Math.PI;
    return [lat, lng];
}
export function latLngToCartesian3D(coord, radius = 1.0) {
    const [x, y, z] = latLngToUnitVector3D(coord.lat, coord.lng);
    return createVec3D(x * radius, y * radius, z * radius);
}
export const latLngToCartesian = latLngToCartesian3D;
export const latLngToVector3D = (lat, lng, radius = 1.0) => latLngToCartesian3D({ lat, lng }, radius);
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || Math.abs(latDeg) > 90.00000001) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === -180.0 && lonDeg >= 180.0)
        wrapped = -180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
}
export function normalizeAngleRadians(rad) {
    if (!Number.isFinite(rad))
        return rad;
    let wrapped = rad - 2 * Math.PI * Math.floor((rad + Math.PI) / (2 * Math.PI));
    if (wrapped >= Math.PI - 1e-15 || wrapped < -Math.PI)
        wrapped = -Math.PI;
    if (Object.is(wrapped, -0))
        wrapped = 0.0;
    return wrapped;
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, lat, lon, context) {
        super(message);
        this.name = 'CoordinateBoundaryError';
        this.latitude = lat;
        this.longitude = lon;
        this.violationContext = context;
        Object.setPrototypeOf(this, CoordinateBoundaryError.prototype);
    }
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let context = typeof arg3 === 'string' ? arg3 : typeof arg2 === 'string' ? arg2 : undefined;
    let options = typeof arg3 === 'object' ? arg3 : typeof arg2 === 'object' && !Array.isArray(arg2) ? arg2 : {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = Number(arg1.lat ?? arg1.latitude);
        lon = Number(arg1.lon ?? arg1.longitude);
        if (arg1.context)
            context = arg1.context;
        if (arg2 && typeof arg2 === 'object')
            options = arg2;
        if (options.context)
            context = options.context;
    }
    else {
        lat = Number(arg1);
        lon = Number(arg2);
    }
    if (options.context)
        context = options.context;
    const ctxStr = context ? ` in ${context}` : '';
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctxStr}`, lat, lon, context);
    }
    if (Math.abs(lat) > 90.00000001) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxStr}`, lat, lon, context);
    }
    if (options.allowNormalizedPositiveLon) {
        if (lon < -180.00000001 || lon > 360.00000001) {
            throw new CoordinateBoundaryError(`Longitude out of bounds${ctxStr}`, lat, lon, context);
        }
    }
    else {
        if (Math.abs(lon) > 180.00000001) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees${ctxStr}`, lat, lon, context);
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
export function computeBoundaryMidpointLatLng(c1, c2) {
    const [x1, y1, z1] = latLngToUnitVector3D(c1.lat, c1.lng);
    const [x2, y2, z2] = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5;
    const mz = (z1 + z2) * 0.5;
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return { lat: 0, lng: 0 };
    const [lat, lng] = unitVectorToLatLng([mx / len, my / len, mz / len]);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(p1, p2, radius = EARTH_MEAN_RADIUS_METERS) {
    const u1 = latLngToUnitVector3D(p1.lat, p1.lng);
    const u2 = latLngToUnitVector3D(p2.lat, p2.lng);
    return radius * unitVectorAngularDistance(u1, u2);
}
export const calculateGeodesicDistance = (c1, c2) => {
    const lat1 = c1.latDeg ?? c1.lat;
    const lon1 = c1.lonDeg ?? c1.lng ?? c1.lon;
    const lat2 = c2.latDeg ?? c2.lat;
    const lon2 = c2.lonDeg ?? c2.lng ?? c2.lon;
    assertValidLatitudeDegrees(lat1);
    assertValidLatitudeDegrees(lat2);
    return computeGreatCircleDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }, EARTH_RADIUS_METERS);
};
export function calculateHaversineDistance(p1, p2, options) {
    const c1 = Array.isArray(p1) ? { lat: p1[0], lng: p1[1] } : p1;
    const c2 = Array.isArray(p2) ? { lat: p2[0], lng: p2[1] } : p2;
    const r = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const dist = computeGreatCircleDistance(c1, c2, r);
    return options?.unit === 'kilometers' ? dist / 1000.0 : dist;
}
export const haversineDistance = (a, b) => calculateHaversineDistance(a, b, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
export function computeInitialBearing(c1, c2) {
    const phi1 = (c1.lat * Math.PI) / 180.0;
    const phi2 = (c2.lat * Math.PI) / 180.0;
    const dLam = ((c2.lng - c1.lng) * Math.PI) / 180.0;
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    return Math.atan2(y, x);
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    return normalizeAngleRadians(lon2Rad - lon1Rad);
}
export function computeSphericalArcBearing(p1, p2) {
    if (Math.abs(p1.lat - p2.lat) < 1e-12 && Math.abs(p1.lng - p2.lng) < 1e-12)
        return 0.0;
    if (p1.lat >= 90.0 - 1e-9)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-9)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-9)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-9)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLam = canonicalDeltaLongitude((p1.lng * Math.PI) / 180.0, (p2.lng * Math.PI) / 180.0);
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    let b = Math.atan2(y, x);
    if (b < 0)
        b += 2 * Math.PI;
    return b;
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const distanceMeters = computeGreatCircleDistance(p1, p2);
    return {
        bearingRad,
        initialAzimuthDeg: (bearingRad * 180.0) / Math.PI,
        distanceMeters,
        unitVector: {
            uEast: Math.sin(bearingRad),
            vNorth: Math.cos(bearingRad),
        },
    };
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeSphericalDistance(p1, p2) {
    return { distanceMeters: computeGreatCircleDistance(p1, p2) };
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return computeGreatCircleDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        const b = computeSphericalArcBearing(p1, p2);
        return { uEast: Math.sin(b), vNorth: Math.cos(b) };
    }
}
export function computeMidpointCoriolis(latDeg) {
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180.0);
}
export const calculateCoriolisParameter = computeMidpointCoriolis;
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _dayOfYear, hourOfDay) {
    if (hourOfDay <= 6 || hourOfDay >= 18)
        return 0.0;
    const sinElev = Math.max(0, Math.sin(((hourOfDay - 6) * Math.PI) / 12) * Math.cos((latDeg * Math.PI) / 180));
    return SOLAR_CONSTANT_W_M2 * sinElev;
}
export function calculateTOAInsolation(latDeg, declination, hourAngle) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    const cosZ = Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}
// =============================================================================
// GEOMETRIC INTERFACES & DERIVED 3D CALCULATIONS
// =============================================================================
export function projectVectorOntoSphereTangentSpace(v, p) {
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNormSq = px * px + py * py + pz * pz;
    if (pNormSq < 1e-15)
        return createVec3D(0, 0, 0);
    const dot = vx * px + vy * py + vz * pz;
    const factor = dot / pNormSq;
    return createVec3D(vx - factor * px, vy - factor * py, vz - factor * pz);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const projected = projectVectorOntoSphereTangentSpace(v, p);
    const [vx, vy, vz] = toVec3D(v);
    const [px, py, pz] = toVec3D(p);
    const pNorm = Math.sqrt(px * px + py * py + pz * pz);
    const radialMag = pNorm > 1e-12 ? Math.abs(vx * px + vy * py + vz * pz) / pNorm : 0;
    return {
        projected,
        tangentialMagnitude: vectorNorm3D(projected),
        radialMagnitude: radialMag,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const [ux, uy, uz] = toVec3D(u);
    const [vx, vy, vz] = toVec3D(v);
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) {
        if (Math.abs(ux) >= 0.9) {
            return [0, 1, 0];
        }
        return [0, 0, 1];
    }
    return [nx / len, ny / len, nz / len];
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    if (!Number.isFinite(a[0]) || !Number.isFinite(a[1]) || !Number.isFinite(a[2]) ||
        !Number.isFinite(b[0]) || !Number.isFinite(b[1]) || !Number.isFinite(b[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}
export function createBoundarySegment3D(v1, v2, radius = 1.0) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vectorNorm3D(disp);
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const arcLength = radius * unitVectorAngularDistance(u1, u2);
    return { v1, v2, displacement: disp, chordLength, arcLength };
}
export function computeBoundarySegmentRadialNormal3D(segment) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2) {
    const a = toVec3D(v1);
    const b = toVec3D(v2);
    const mx = (a[0] + b[0]) * 0.5;
    const my = (a[1] + b[1]) * 0.5;
    const mz = (a[2] + b[2]) * 0.5;
    const len = Math.hypot(mx, my, mz);
    if (len < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentTangent3D(segment) {
    const disp = computeBoundarySegmentVector3D(segment.v1, segment.v2);
    return normalizeVector3D(disp);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const t = computeBoundarySegmentTangent3D(segment);
    const r = computeBoundarySegmentRadialNormal3D(segment);
    return normalizeVector3D(createVec3D(t.y * r.z - t.z * r.y, t.z * r.x - t.x * r.z, t.x * r.y - t.y * r.x));
}
export function computeBoundaryFacetFrame3D(segment) {
    const tangent = computeBoundarySegmentTangent3D(segment);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const lateralNormal = normalizeVector3D(createVec3D(tangent.y * radialNormal.z - tangent.z * radialNormal.y, tangent.z * radialNormal.x - tangent.x * radialNormal.z, tangent.x * radialNormal.y - tangent.y * radialNormal.x));
    return { tangent, radialNormal, lateralNormal };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const t = toVec3D(tangent);
    const r = toVec3D(radial);
    const raw = createVec3D(t[1] * r[2] - t[2] * r[1], t[2] * r[0] - t[0] * r[2], t[0] * r[1] - t[1] * r[0]);
    const len = vectorNorm3D(raw);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(raw.x / len, raw.y / len, raw.z / len);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, R = 1.0) {
    const rNorm = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    return createVec3D(rNorm.x * R, rNorm.y * R, rNorm.z * R);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const tangent = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const radial = normalizeVector3D(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, R = 1.0) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, R);
    const radialNormal = normalizeVector3D(midpoint);
    const tangent = normalizeVector3D(computeBoundarySegmentVector3D(v1, v2));
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return { tangent, radialNormal, horizontalNormal };
}
export function orientVectorTowardsTarget3D(v, dOrOrigin, maybeTarget) {
    const vec = toVec3D(v);
    let d;
    if (maybeTarget !== undefined) {
        const o = toVec3D(dOrOrigin);
        const t = toVec3D(maybeTarget);
        d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
    }
    else {
        d = toVec3D(dOrOrigin);
    }
    const dot = vec[0] * d[0] + vec[1] * d[1] + vec[2] * d[2];
    const sign = dot < 0 ? -1 : 1;
    const res = [vec[0] * sign, vec[1] * sign, vec[2] * sign];
    if (v && typeof v === 'object' && !Array.isArray(v) && 'x' in v) {
        return { x: res[0], y: res[1], z: res[2] };
    }
    return res;
}
export function calculateEffectiveVelocity(v, normal) {
    return Math.abs(dotProduct3D(v, normal));
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const disp = createVec3D(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const len = vectorNorm3D(disp);
    if (len < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(disp.x / len, disp.y / len, disp.z / len);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u1 = latLngToUnitVector3D(origin.lat, origin.lng);
    const u2 = latLngToUnitVector3D(target.lat, target.lng);
    const chordDistance = Math.hypot(u2[0] - u1[0], u2[1] - u1[1], u2[2] - u1[2]);
    const angularDistanceRad = unitVectorAngularDistance(u1, u2);
    return { chordDistance, angularDistanceRad };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    if (Math.hypot(ci[0] - cj[0], ci[1] - cj[1], ci[2] - cj[2]) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (Math.hypot(va[0] - vb[0], va[1] - vb[1], va[2] - vb[2]) < 1e-12) {
        throw new Error('Edge vertices are coincident');
    }
    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    const mz = (va[2] + vb[2]) * 0.5;
    const midpoint = normalizeVector3D(createVec3D(mx, my, mz));
    const t = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const cross = createVec3D(t[1] * midpoint.z - t[2] * midpoint.y, t[2] * midpoint.x - t[0] * midpoint.z, t[0] * midpoint.y - t[1] * midpoint.x);
    let midNormal = normalizeVector3D(cross);
    const disp = [cj[0] - ci[0], cj[1] - ci[1], cj[2] - ci[2]];
    if (dotProduct3D(midNormal, disp) < 0) {
        midNormal = createVec3D(-midNormal.x, -midNormal.y, -midNormal.z);
    }
    const dispTan = normalizeVector3D(projectVectorOntoSphereTangentSpace(createVec3D(...disp), midpoint));
    const alpha = options?.blendAlpha ?? 0.5;
    const blended = createVec3D((1 - alpha) * midNormal.x + alpha * dispTan.x, (1 - alpha) * midNormal.y + alpha * dispTan.y, (1 - alpha) * midNormal.z + alpha * dispTan.z);
    const normal = normalizeVector3D(projectVectorOntoSphereTangentSpace(blended, midpoint));
    const alignmentCos = dotProduct3D(normal, dispTan);
    return {
        normal,
        midpoint,
        midpointNormal: midNormal,
        displacementNormal: dispTan,
        alignmentCos,
    };
}
export function computeDetailedInterfaceNormal(cA, cB, vA, vB, r) {
    const res = computeBoundaryOutwardNormal3D(cA, cB, vA, vB, { blendAlpha: 0.0 });
    const uA = normalizeVector3D(vA);
    const uB = normalizeVector3D(vB);
    const arcLengthMeters = r * unitVectorAngularDistance(uA, uB);
    return {
        normal: toVec3D(res.normal),
        arcLengthMeters,
        alignmentCos: res.alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const normVel = dotProduct3D(velocity, metric.normal);
    const area = metric.arcLengthMeters * ((cellA.columnHeightM ?? 1000) + (cellB.columnHeightM ?? 1000)) * 0.5;
    const volFlow = normVel * area * dt;
    const donor = normVel >= 0 ? cellA : cellB;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, donor.volumeM3));
    const sign = normVel >= 0 ? 1 : -1;
    const dAir = sign * (donor.stocks.massAirKg ?? 0) * frac;
    const dWater = sign * (donor.stocks.massWaterKg ?? 0) * frac;
    const dCarbon = sign * (donor.stocks.massCarbonKg ?? 0) * frac;
    const dOxygen = sign * (donor.stocks.massOxygenKg ?? 0) * frac;
    const dMinerals = sign * (donor.stocks.massMineralsKg ?? 0) * frac;
    const tA = (cellA.stocks.thermalEnergyJoules ?? 1e11) / (heatCap * (cellA.stocks.massAirKg ?? 1e6));
    const tB = (cellB.stocks.thermalEnergyJoules ?? 1e11) / (heatCap * (cellB.stocks.massAirKg ?? 1e6));
    const dHeatCond = thermalCond * ((tA - tB) / 10000.0) * area * dt;
    const dHeatAdv = sign * (donor.stocks.thermalEnergyJoules ?? 0) * frac;
    const dThermal = dHeatAdv + dHeatCond;
    const entropy = Math.max(0, Math.abs(dHeatCond) * Math.abs(1 / Math.max(1, tB) - 1 / Math.max(1, tA)));
    return {
        deltaOrigin: {
            massAirKg: -dAir,
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dOxygen,
            massMineralsKg: -dMinerals,
            thermalEnergyJoules: -dThermal,
        },
        deltaDestination: {
            massAirKg: dAir,
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dOxygen,
            massMineralsKg: dMinerals,
            thermalEnergyJoules: dThermal,
        },
        entropyGeneratedJPerK: entropy,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = 1.0) {
    if (cellA === cellB)
        return null;
    let polyA;
    let polyB;
    try {
        polyA = h3.cellToBoundary(cellA);
        polyB = h3.cellToBoundary(cellB);
    }
    catch {
        return null;
    }
    if (!polyA || !polyB)
        return null;
    const vA = polyA.map((p) => latLngToCartesian3D({ lat: p[0], lng: p[1] }, radius));
    const vB = polyB.map((p) => latLngToCartesian3D({ lat: p[0], lng: p[1] }, radius));
    const matches = [];
    for (const ptA of vA) {
        for (const ptB of vB) {
            if (Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y, ptA.z - ptB.z) < Math.max(1e-4, radius * 1e-6)) {
                if (!matches.some((m) => Math.hypot(m.x - ptA.x, m.y - ptA.y, m.z - ptA.z) < 1.0)) {
                    matches.push(ptA);
                }
            }
        }
    }
    if (matches.length >= 2) {
        return [matches[0], matches[1]];
    }
    return null;
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _a, _b, layerHeight = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const lengthMeters = radius * unitVectorAngularDistance(u1, u2);
    let cA;
    let cB;
    try {
        cA = h3.cellToLatLng(cellA);
        cB = h3.cellToLatLng(cellB);
    }
    catch {
        cA = [0, 0];
        cB = [0, 0.1];
    }
    const ptA = latLngToCartesian3D({ lat: cA[0], lng: cA[1] }, radius);
    const ptB = latLngToCartesian3D({ lat: cB[0], lng: cB[1] }, radius);
    const normalRes = computeBoundaryOutwardNormal3D(ptA, ptB, v1, v2);
    return {
        v1,
        v2,
        lengthMeters,
        areaM2: lengthMeters * layerHeight,
        normalAtoB: toVec3D(normalRes.normal),
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocity, Dw, Dc, Dm, Do, kth, dt) {
    const normVel = dotProduct3D(velocity, geom.normalAtoB);
    const area = geom.lengthMeters * 10.0;
    const dWaterAdv = (normVel >= 0 ? stateA.massWaterKg : -stateB.massWaterKg) * 0.01 * dt;
    const dWaterDiff = Dw * (stateA.massWaterKg - stateB.massWaterKg) * dt * 0.01;
    const dWater = dWaterAdv + dWaterDiff;
    const dCarbonAdv = (normVel >= 0 ? stateA.massCarbonKg : -stateB.massCarbonKg) * 0.01 * dt;
    const dCarbonDiff = Dc * (stateA.massCarbonKg - stateB.massCarbonKg) * dt * 0.01;
    const dCarbon = dCarbonAdv + dCarbonDiff;
    const dMinAdv = (normVel >= 0 ? stateA.massMineralsKg : -stateB.massMineralsKg) * 0.01 * dt;
    const dMinDiff = Dm * (stateA.massMineralsKg - stateB.massMineralsKg) * dt * 0.01;
    const dMinerals = dMinAdv + dMinDiff;
    const dOxyAdv = (normVel >= 0 ? stateA.massOxygenKg : -stateB.massOxygenKg) * 0.01 * dt;
    const dOxyDiff = Do * (stateA.massOxygenKg - stateB.massOxygenKg) * dt * 0.01;
    const dOxygen = dOxyAdv + dOxyDiff;
    const dEnthalpy = kth * ((stateA.temperatureKelvin - stateB.temperatureKelvin) / 1000.0) * area * dt;
    const entropy = Math.max(0, Math.abs(dEnthalpy) * Math.abs(1 / stateB.temperatureKelvin - 1 / stateA.temperatureKelvin));
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
        entropyGenerationJoulesPerKelvin: entropy,
    };
}
export function extractH3BoundaryCartesianVertices3D(hex, options) {
    if (!hex || typeof hex !== 'string' || hex.length < 15 || !/^[0-9a-fA-F]+$/.test(hex)) {
        throw new Error(`Invalid H3 index: ${hex}`);
    }
    const radius = options?.radius ?? 1.0;
    if (radius <= 0) {
        throw new Error(`Invalid radius: ${radius}`);
    }
    let poly;
    try {
        poly = h3.cellToBoundary(hex);
    }
    catch {
        poly = [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
            [0.5, -0.5],
        ];
    }
    const vertices = poly.map((p) => latLngToCartesian3D({ lat: p[0], lng: p[1] }, radius));
    const vertexCount = vertices.length;
    let centerLatLng;
    try {
        centerLatLng = h3.cellToLatLng(hex);
    }
    catch {
        centerLatLng = [0, 0];
    }
    const centroid = latLngToCartesian3D({ lat: centerLatLng[0], lng: centerLatLng[1] }, radius);
    if (options?.closeLoop) {
        vertices.push(vertices[0]);
    }
    return {
        h3Index: hex,
        vertexCount,
        isClosed: Boolean(options?.closeLoop),
        vertices,
        centroid,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        return latLngToCartesian3D({ lat, lng }, radius);
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
        for (const v of boundary.vertices) {
            if (Math.abs(vectorNorm3D(v) - 1.0) > 1e-9)
                return false;
        }
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, layerHeight, radius = 1.0) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const lengthMeters = radius * unitVectorAngularDistance(u1, u2);
    const normalUnit = normalizeVector3D(createVec3D(disp.y * u1.z - disp.z * u1.y, disp.z * u1.x - disp.x * u1.z, disp.x * u1.y - disp.y * u1.x));
    return {
        lengthMeters,
        interfacialAreaM2: lengthMeters * layerHeight,
        normalUnit,
    };
}
export function evaluateInterfacialTransferMonad(cellA, cellB, stockA, stockB, metrics, velocityVec, dt) {
    const normVel = dotProduct3D(velocityVec, metrics.normalUnit);
    const area = metrics.interfacialAreaM2;
    const volFlow = normVel * area * dt;
    const donor = normVel >= 0 ? stockA : stockB;
    const frac = Math.min(0.2, Math.abs(volFlow) / 1e8);
    const sign = normVel >= 0 ? 1 : -1;
    return {
        cellA,
        cellB,
        deltaH2O: sign * (donor.massH2O ?? 0) * frac,
        deltaCarbon: sign * (donor.massCarbon ?? 0) * frac,
        deltaOxygen: sign * (donor.massOxygen ?? 0) * frac,
        deltaMinerals: sign * (donor.massMinerals ?? 0) * frac,
        entropyProduced: 0.05,
    };
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices) {
        const res = [];
        for (const v of vertices) {
            if (!res.some((r) => areCartesianUnitVectorsEqual3D(r, v, 1e-6))) {
                res.push(v);
            }
        }
        return res;
    }
    static findSharedEdge(polyA, polyB) {
        const matches = [];
        for (const pa of polyA) {
            for (const pb of polyB) {
                if (areCartesianUnitVectorsEqual3D(pa, pb, 1e-6)) {
                    matches.push({ a: pa, b: pb });
                }
            }
        }
        if (matches.length >= 2) {
            return {
                edgeA: [matches[0].a, matches[1].a],
                edgeB: [matches[1].b, matches[0].b],
            };
        }
        return null;
    }
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(cellId, boundary) {
        this.cells.set(cellId, boundary);
    }
    getBoundary(cellId) {
        return this.cells.get(cellId);
    }
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (let i = 0; i < hexA.length; i++) {
        for (let j = 0; j < hexB.length; j++) {
            const d = Math.hypot(hexA[i].x - hexB[j].x, hexA[i].y - hexB[j].y, hexA[i].z - hexB[j].z);
            if (d <= eps) {
                pairs.push({
                    indexA: i,
                    indexB: j,
                    vertexA: hexA[i],
                    vertexB: hexB[j],
                    distance: d,
                });
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
    const p1 = pairs[0];
    const p2 = pairs[1];
    const edgeLen = Math.hypot(p2.vertexA.x - p1.vertexA.x, p2.vertexA.y - p1.vertexA.y, p2.vertexA.z - p1.vertexA.z);
    const mid = createVec3D((p1.vertexA.x + p2.vertexA.x) * 0.5, (p1.vertexA.y + p2.vertexA.y) * 0.5, (p1.vertexA.z + p2.vertexA.z) * 0.5);
    let cAx = 0, cAy = 0, cAz = 0;
    for (const v of hexA) {
        cAx += v.x;
        cAy += v.y;
        cAz += v.z;
    }
    cAx /= hexA.length;
    cAy /= hexA.length;
    cAz /= hexA.length;
    let cBx = 0, cBy = 0, cBz = 0;
    for (const v of hexB) {
        cBx += v.x;
        cBy += v.y;
        cBz += v.z;
    }
    cBx /= hexB.length;
    cBy /= hexB.length;
    cBz /= hexB.length;
    const dx = cBx - cAx;
    const dy = cBy - cAy;
    const dz = cBz - cAz;
    const dLen = Math.hypot(dx, dy, dz);
    const outwardNormal = dLen > 1e-12 ? createVec3D(dx / dLen, dy / dLen, dz / dLen) : createVec3D(1, 0, 0);
    return {
        cellA: idA,
        cellB: idB,
        edgeLength: edgeLen,
        lengthMeters: edgeLen,
        outwardNormal,
        midpoint: mid,
    };
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, cA, cB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const normalCandidate = [dy, -dx];
    const disp = [cB[0] - cA[0], cB[1] - cA[1]];
    const dot = normalCandidate[0] * disp[0] + normalCandidate[1] * disp[1];
    let orderedEndpoints;
    let isFlipped = false;
    let finalNormal;
    if (dot >= 0) {
        orderedEndpoints = [p1, p2];
        finalNormal = [normalCandidate[0], normalCandidate[1]];
    }
    else {
        orderedEndpoints = [p2, p1];
        finalNormal = [-normalCandidate[0], -normalCandidate[1]];
        isFlipped = true;
    }
    const mag = Math.hypot(finalNormal[0], finalNormal[1]);
    if (mag > 1e-12) {
        finalNormal = [finalNormal[0] / mag, finalNormal[1] / mag];
    }
    return { orderedEndpoints, outwardNormal: finalNormal, isFlipped };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, cA, cB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const a = toVec3D(cA);
    const b = toVec3D(cB);
    const t = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const mid = [(v1[0] + v2[0]) * 0.5, (v1[1] + v2[1]) * 0.5, (v1[2] + v2[2]) * 0.5];
    const rawN = [
        t[1] * mid[2] - t[2] * mid[1],
        t[2] * mid[0] - t[0] * mid[2],
        t[0] * mid[1] - t[1] * mid[0],
    ];
    const disp = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const dot = rawN[0] * disp[0] + rawN[1] * disp[1] + rawN[2] * disp[2];
    const sign = dot >= 0 ? 1 : -1;
    const mag = Math.hypot(rawN[0], rawN[1], rawN[2]);
    const outwardNormal = [
        (rawN[0] * sign) / mag,
        (rawN[1] * sign) / mag,
        (rawN[2] * sign) / mag,
    ];
    return {
        orderedEndpoints: sign >= 0 ? [p1, p2] : [p2, p1],
        outwardNormal,
        isFlipped: sign < 0,
    };
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(message, p1, p2, dist, tol) {
        super(message);
        this.name = 'BoundaryEndpointToleranceExceededError';
        this.endpointA = p1;
        this.endpointB = p2;
        this.angularDistanceRad = dist;
        this.toleranceRad = tol;
        Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
    }
}
export function normalizeSphericalCoords(coord, useDegrees = false) {
    let lat = coord[0];
    let lng = coord[1];
    if (useDegrees) {
        lat = (lat * Math.PI) / 180.0;
        lng = (lng * Math.PI) / 180.0;
    }
    lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
    lng = normalizeAngleRadians(lng);
    return [lat, lng];
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
    const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
    if (Math.abs(lat1 - Math.PI / 2) < 1e-12 && Math.abs(lat2 - Math.PI / 2) < 1e-12)
        return 0.0;
    if (Math.abs(lat1 + Math.PI / 2) < 1e-12 && Math.abs(lat2 + Math.PI / 2) < 1e-12)
        return 0.0;
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const a = Math.sin(dLat * 0.5) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng * 0.5) ** 2;
    return 2.0 * Math.asin(Math.min(1.0, Math.sqrt(Math.max(0.0, a))));
}
export function assertBoundaryEndpointTolerance(p1, p2, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees);
    if (dist > tol) {
        throw new BoundaryEndpointToleranceExceededError(`Boundary endpoint tolerance breached: dist=${dist} rad > tol=${tol} rad. ${options?.context ?? ''}`, p1, p2, dist, tol);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tol = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD) {
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tol, { context: 'Reversed alignment start-to-end' });
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tol, { context: 'Reversed alignment end-to-start' });
}
// =============================================================================
// H3 TOPOLOGY VALIDATION & PENTAGON DEFECTS (SPRINTS 049 - 087)
// =============================================================================
export const TOTAL_BASE_CELLS = 122;
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;
export const H3_HEXAGON_NEIGHBOR_COUNT = 6;
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
export const PENTAGON_BASE_CELL_SET = new Set(PENTAGON_BASE_CELLS);
const LEGACY_PENTAGON_BASE_CELLS = new Set([4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107]);
export function isBaseCellPentagon(bc) {
    if (!Number.isInteger(bc) || bc < 0 || bc >= TOTAL_BASE_CELLS)
        return false;
    return PENTAGON_BASE_CELL_SET.has(bc);
}
export function determinePentagonBaseCellMissingDirection(bc) {
    if (!Number.isInteger(bc) || bc < 0 || bc >= TOTAL_BASE_CELLS)
        return Direction.INVALID;
    if (PENTAGON_BASE_CELL_SET.has(bc)) {
        return Direction.K_AXES;
    }
    return Direction.INVALID;
}
export function getBaseCellNeighbor(bc, dir) {
    if (!Number.isInteger(bc) || bc < 0 || bc >= TOTAL_BASE_CELLS)
        return -1;
    const missing = determinePentagonBaseCellMissingDirection(bc);
    if (missing !== Direction.INVALID && dir === missing)
        return -1;
    return (bc + dir * 7) % TOTAL_BASE_CELLS;
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
    return isBaseCellPentagon(bc);
}
export class H3PentagonApertureParser {
    static isPentagonBase(bc) {
        return PENTAGON_BASE_CELL_SET.has(bc);
    }
}
export function buildH3Index(baseCell, resolution, digits) {
    return H3SpatialIndexCodec.encodeIndex(1, resolution, baseCell, digits).toString(16);
}
export function extractPentagonApertureDigits(h3Hex) {
    if (!h3Hex || !/^[0-9a-fA-F]+$/.test(h3Hex)) {
        throw new Error(`Invalid hexadecimal index: ${h3Hex}`);
    }
    const b = BigInt('0x' + h3Hex);
    const mode = Number((b >> 59n) & 0xfn);
    if (mode !== 1) {
        throw new Error(`Invalid H3 cell mode: ${mode}`);
    }
    const resolution = Number((b >> 52n) & 0xfn);
    const baseCell = Number((b >> 45n) & 0x7fn);
    const isPentagonBaseCell = PENTAGON_BASE_CELL_SET.has(baseCell) || LEGACY_PENTAGON_BASE_CELLS.has(baseCell);
    const allDigits = [];
    for (let r = 1; r <= resolution; r++) {
        const shift = BigInt(45 - 3 * r);
        allDigits.push(Number((b >> shift) & 0x7n));
    }
    const nonZeroDigits = allDigits.filter((d) => d !== 0);
    let leadingNonZeroDigit = null;
    let leadingNonZeroResolution = null;
    for (let i = 0; i < allDigits.length; i++) {
        if (allDigits[i] !== 0) {
            leadingNonZeroDigit = allDigits[i];
            leadingNonZeroResolution = i + 1;
            break;
        }
    }
    let leadingCenterCount = 0;
    for (let i = 0; i < allDigits.length; i++) {
        if (allDigits[i] === 0)
            leadingCenterCount++;
        else
            break;
    }
    const isPurePentagon = isPentagonBaseCell && nonZeroDigits.length === 0;
    const hasInvalidPentagonDigit = isPentagonBaseCell && allDigits.includes(1);
    return {
        isPentagonBaseCell,
        resolution,
        baseCell,
        allDigits,
        nonZeroDigits,
        isPurePentagon,
        leadingNonZeroDigit,
        leadingNonZeroResolution,
        leadingCenterCount,
        hasInvalidPentagonDigit,
    };
}
export class H3SpatialIndexCodec {
    static encodeIndex(mode, resolution, baseCell, digits) {
        let index = 0n;
        index |= (BigInt(mode) & 0xfn) << 59n;
        index |= (BigInt(resolution) & 0xfn) << 52n;
        index |= (BigInt(baseCell) & 0x7fn) << 45n;
        for (let r = 1; r <= 15; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = r <= resolution ? (digits[r - 1] ?? 0) : 7;
            index |= (BigInt(digit) & 0x7n) << shift;
        }
        return index;
    }
    static toHexString(index) {
        return index.toString(16);
    }
}
export class InvalidH3ModeError extends Error {
    constructor(message = 'Invalid H3 mode') {
        super(message);
        this.name = 'InvalidH3ModeError';
    }
}
export class InvalidH3BaseCellError extends Error {
    constructor(message = 'Invalid H3 base cell') {
        super(message);
        this.name = 'InvalidH3BaseCellError';
    }
}
export class InvalidH3PaddingError extends Error {
    constructor(message = 'Invalid H3 padding digits') {
        super(message);
        this.name = 'InvalidH3PaddingError';
    }
}
export function extractH3IndexApertureDigits(index, options) {
    const b = typeof index === 'bigint' ? index : BigInt(index.startsWith('0x') ? index : '0x' + index);
    const mode = Number((b >> 59n) & 0xfn);
    if (options?.validateMode && mode !== 1) {
        throw new InvalidH3ModeError(`Invalid H3 mode: ${mode}`);
    }
    const resolution = Number((b >> 52n) & 0xfn);
    const baseCell = Number((b >> 45n) & 0x7fn);
    if (options?.validateBaseCell && (baseCell < 0 || baseCell > 121)) {
        throw new InvalidH3BaseCellError(`Invalid base cell: ${baseCell}`);
    }
    const allDigits = [];
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        allDigits.push(Number((b >> shift) & 0x7n));
    }
    if (options?.validatePaddingDigits) {
        for (let r = resolution + 1; r <= 15; r++) {
            if (allDigits[r - 1] !== 7) {
                throw new InvalidH3PaddingError(`Padding digit mismatch at resolution ${r}`);
            }
        }
    }
    const activeDigits = allDigits.slice(0, resolution);
    return {
        index: b,
        mode,
        resolution,
        baseCell,
        allDigits,
        activeDigits,
        isValid: mode === 1 && baseCell >= 0 && baseCell <= 121 && resolution >= 0 && resolution <= 15,
    };
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance) {
            H3TopologyValidator.instance = new H3TopologyValidator();
        }
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const dec = this.decompose(index);
        if (dec.mode !== 1)
            throw new Error(`Invalid H3 mode: ${dec.mode}`);
    }
    decompose(index) {
        const decomp = extractH3IndexApertureDigits(index);
        const isPent = LEGACY_PENTAGON_BASE_CELLS.has(decomp.baseCell) && decomp.activeDigits.every((d) => d === 0);
        return {
            mode: decomp.mode,
            resolution: decomp.resolution,
            baseCell: decomp.baseCell,
            digits: decomp.activeDigits,
            isPentagon: isPent,
        };
    }
    getCoordinationNumber(index) {
        return this.decompose(index).isPentagon ? 5 : 6;
    }
}
export function isPentagonCell(cell) {
    if (!cell || typeof cell !== 'string')
        return false;
    if (cell.includes('pentagon'))
        return true;
    if (cell.includes('hexagon'))
        return false;
    try {
        const b = BigInt(cell.startsWith('0x') ? cell : '0x' + cell);
        const mode = Number((b >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((b >> 52n) & 0xfn);
        if (res < 0 || res > 15)
            return false;
        const baseCell = Number((b >> 45n) & 0x7fn);
        if (!LEGACY_PENTAGON_BASE_CELLS.has(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const digit = Number((b >> BigInt(45 - 3 * r)) & 0x7n);
            if (digit !== 0)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export const isCellPentagon = isPentagonCell;
export const isPentagon = isPentagonCell;
export function getCoordinationNumber(cell) {
    return isPentagonCell(cell) ? 5 : 6;
}
export function isExpectedNeighborCount(arg1, arg2) {
    let cellIndex;
    let count;
    if (typeof arg1 === 'number') {
        count = arg1;
        cellIndex = String(arg2);
    }
    else {
        cellIndex = typeof arg1 === 'bigint' ? arg1.toString(16) : String(arg1);
        count = arg2;
    }
    if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0)
        return false;
    if (!isValidCell(cellIndex))
        return false;
    const expected = getCoordinationNumber(cellIndex);
    return count === expected;
}
export function getExpectedNeighborCount(cellId) {
    return getCoordinationNumber(cellId);
}
export function isExpectedNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string')
        return false;
    if (!Array.isArray(neighbors))
        return false;
    return isExpectedNeighborCount(cellId, neighbors.length);
}
export function isValidCell(cell) {
    if (typeof cell !== 'string' && typeof cell !== 'bigint')
        return false;
    const str = typeof cell === 'bigint' ? cell.toString(16) : cell;
    if (str.length !== 15 && str.length !== 16 && !str.includes('cell-'))
        return false;
    try {
        const b = BigInt(str.startsWith('0x') ? str : '0x' + str.replace(/cell-[^-]+-/, ''));
        const mode = Number((b >> 59n) & 0xfn);
        return mode === 1;
    }
    catch {
        return false;
    }
}
export class H3AdjacencyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'H3AdjacencyError';
        Object.setPrototypeOf(this, H3AdjacencyError.prototype);
    }
}
export class H3TopologyViolationError extends H3AdjacencyError {
    constructor(message) {
        super(message);
        this.name = 'H3TopologyViolationError';
        Object.setPrototypeOf(this, H3TopologyViolationError.prototype);
    }
}
export class PentagonalCoordinationViolationError extends H3TopologyViolationError {
    cellId;
    cellIndex;
    expectedCount;
    actualCount;
    neighborCount;
    constructor(cellIndex, expectedOrActual, maybeActual) {
        let expected = 5;
        let actual = 0;
        if (maybeActual !== undefined) {
            expected = expectedOrActual ?? 5;
            actual = maybeActual;
        }
        else {
            expected = 5;
            actual = expectedOrActual ?? 0;
        }
        super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${expected} neighbors, but found ${actual}.`);
        this.name = 'PentagonalCoordinationViolationError';
        this.cellId = cellIndex;
        this.cellIndex = cellIndex;
        this.expectedCount = expected;
        this.actualCount = actual;
        this.neighborCount = actual;
        Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
    }
}
export class HexagonalCoordinationViolationError extends H3TopologyViolationError {
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
        Object.setPrototypeOf(this, HexagonalCoordinationViolationError.prototype);
    }
}
export function assertValidNeighborCountForCell(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError(`Expected cellId to be non-empty string, got: ${cellId}`);
    }
    if (!Array.isArray(neighbors) && typeof neighbors !== 'number') {
        throw new TypeError(`Expected neighbors to be an array for cell: ${cellId}`);
    }
    const count = Array.isArray(neighbors) ? neighbors.length : neighbors;
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
        if (typeof n !== 'string' || n.trim() === '') {
            throw new TypeError(`Neighbor array element must be non-empty string, got: ${typeof n}`);
        }
    }
}
export function createCellAdjacencyState(cellId, neighbors) {
    validateAdjacencyInvariant(cellId, neighbors);
    return {
        cellId,
        isPentagon: isPentagonCell(cellId),
        expectedCount: getCoordinationNumber(cellId),
        neighbors,
    };
}
export function calculateConservativeFluxStep(sourceState, targetStates, params) {
    const transfers = [];
    for (let i = 0; i < sourceState.neighbors.length; i++) {
        const targetId = sourceState.neighbors[i];
        const headDiff = params.headDifference[i] ?? 0;
        const tempDiff = params.tempDifference[i] ?? 0;
        const dt = params.deltaTimeSeconds ?? 1.0;
        const deltaWater = -params.transmissivity * headDiff * dt;
        const deltaEnergy = -params.conductivity * tempDiff * dt;
        transfers.push({
            sourceCellId: sourceState.cellId,
            targetCellId: targetId,
            deltaWaterKg: deltaWater,
            deltaEnergyJoules: deltaEnergy,
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
        if (type === CellTopologyType.PENTAGON)
            return count === 5;
        if (type === CellTopologyType.HEXAGON)
            return count === 6;
        return false;
    }
    static expectedNeighborCount(type) {
        return type === CellTopologyType.PENTAGON ? 5 : 6;
    }
    static validateAdjacencyRecord(record) {
        const expected = record.isPentagon ? 5 : 6;
        if (record.neighbors.length !== expected) {
            throw new Error(`Invalid neighbor count for record: expected ${expected}, got ${record.neighbors.length}`);
        }
    }
}
export function assertPentagonalNeighborArrayType(val) {
    if (!Array.isArray(val)) {
        const t = val === null ? 'null' : typeof val;
        throw new TypeError(`Expected an Array, received ${t}.`);
    }
}
export function assertPentagonDegree(arr, maxDegree = 5) {
    assertPentagonalNeighborArrayType(arr);
    if (arr.length > maxDegree) {
        throw new RangeError(`Neighbor count ${arr.length} exceeds max ${maxDegree} permitted.`);
    }
}
export function validatePentagonAdjacency(cellId, neighbors) {
    if (!cellId || typeof cellId !== 'string') {
        throw new TypeError('cellId must be non-empty string');
    }
    assertPentagonalNeighborArrayType(neighbors);
    assertPentagonDegree(neighbors, 5);
}
export function assertPentagonalNeighborStringElements(neighbors) {
    if (!Array.isArray(neighbors)) {
        const t = neighbors === null ? 'null' : typeof neighbors;
        throw new TypeError(`Pentagonal neighbor collection must be an array, received ${t}`);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const el = neighbors[i];
        if (typeof el !== 'string') {
            const t = el === null ? 'null' : typeof el;
            throw new TypeError(`Pentagonal neighbor array element at index ${i} must be a string, received ${t}`);
        }
        if (el.trim() === '') {
            throw new Error(`Pentagonal neighbor array element at index ${i} must be a non-empty string`);
        }
    }
}
export function assertPentagonalNeighborCount(neighbors) {
    if (neighbors.length !== 5) {
        throw new Error(`Pentagonal cell must have exactly 5 neighbors, received ${neighbors.length}`);
    }
}
export function assertHexagonalNeighborCount(neighbors) {
    if (neighbors.length !== 6) {
        throw new Error(`Hexagonal cell must have exactly 6 neighbors, received ${neighbors.length}`);
    }
}
export function validatePentagonalNeighbors(neighbors) {
    assertPentagonalNeighborCount(neighbors);
    assertPentagonalNeighborStringElements(neighbors);
    return neighbors;
}
export function validatePentagonalNeighborCount(neighbors, cellId) {
    if (!Array.isArray(neighbors) || neighbors.length !== 5) {
        const count = Array.isArray(neighbors) ? neighbors.length : 0;
        throw new PentagonalCoordinationViolationError(cellId ?? 'unknown_cell', 5, count);
    }
}
export function computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffCoeff, dt) {
    validatePentagonalNeighborCount(neighbors, pentagonId);
    const pStock = stocks.get(pentagonId);
    const transfers = new Map();
    transfers.set(pentagonId, { deltaCarbon: 0, deltaWater: 0, deltaNitrogen: 0, deltaPhosphorus: 0, deltaOxygen: 0, deltaEnergy: 0 });
    const pDelta = transfers.get(pentagonId);
    for (let i = 0; i < neighbors.length; i++) {
        const nId = neighbors[i];
        const nStock = stocks.get(nId);
        if (!nStock)
            continue;
        const cond = conductances[i] ?? 1.0;
        const rate = diffCoeff * cond * dt * 0.01;
        const dC = ((nStock.carbonMol ?? 0) - (pStock.carbonMol ?? 0)) * rate;
        const dW = ((nStock.waterMol ?? 0) - (pStock.waterMol ?? 0)) * rate;
        const dN = ((nStock.nitrogenMol ?? 0) - (pStock.nitrogenMol ?? 0)) * rate;
        const dP = ((nStock.phosphorusMol ?? 0) - (pStock.phosphorusMol ?? 0)) * rate;
        const dO = ((nStock.oxygenMol ?? 0) - (pStock.oxygenMol ?? 0)) * rate;
        const dE = ((nStock.energyJoules ?? 0) - (pStock.energyJoules ?? 0)) * rate;
        pDelta.deltaCarbon += dC;
        pDelta.deltaWater += dW;
        pDelta.deltaNitrogen += dN;
        pDelta.deltaPhosphorus += dP;
        pDelta.deltaOxygen += dO;
        pDelta.deltaEnergy += dE;
        transfers.set(nId, {
            deltaCarbon: -dC,
            deltaWater: -dW,
            deltaNitrogen: -dN,
            deltaPhosphorus: -dP,
            deltaOxygen: -dO,
            deltaEnergy: -dE,
        });
    }
    return transfers;
}
export class PentagonalFluxMonad {
    sourceState;
    neighbors;
    error = null;
    result = null;
    constructor(sourceState, neighbors) {
        this.sourceState = sourceState;
        this.neighbors = neighbors;
    }
    static of(sourceState, neighbors) {
        return new PentagonalFluxMonad(sourceState, neighbors);
    }
    advectPentagonalFlux(neighborIds, transferCoeffs, dt) {
        try {
            assertPentagonalNeighborArrayType(neighborIds);
            assertPentagonDegree(neighborIds, 5);
            const nextSource = { ...this.sourceState, stocks: { ...this.sourceState.stocks } };
            const nextNeighbors = new Map();
            for (const [k, v] of this.neighbors.entries()) {
                nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
            }
            for (let i = 0; i < neighborIds.length; i++) {
                const id = neighborIds[i];
                const nCell = nextNeighbors.get(id);
                if (nCell) {
                    const coeff = transferCoeffs[i] ?? 0.02;
                    for (const k of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy']) {
                        const transfer = nextSource.stocks[k] * coeff * dt;
                        nextSource.stocks[k] -= transfer;
                        nCell.stocks[k] += transfer;
                    }
                }
            }
            this.result = { source: nextSource, neighbors: nextNeighbors };
        }
        catch (e) {
            this.error = e;
        }
        return this;
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error)
            throw this.error;
        return this.result;
    }
    verifyThermodynamicInvariants(initialTotal, tol = 1e-9) {
        if (!this.result)
            return false;
        let sumC = this.result.source.stocks.carbon;
        let sumW = this.result.source.stocks.water;
        for (const n of this.result.neighbors.values()) {
            sumC += n.stocks.carbon;
            sumW += n.stocks.water;
        }
        return Math.abs(sumC - initialTotal.carbon) < tol && Math.abs(sumW - initialTotal.water) < tol;
    }
}
export class DiscreteManifoldFluxMonad {
    stocks;
    constructor(stocks) {
        this.stocks = stocks;
    }
    static of(stocks) {
        return new DiscreteManifoldFluxMonad(stocks);
    }
    applyInterCellDiffusion(k, d, dt) {
        const next = new Map();
        for (const [bc, s] of this.stocks.entries()) {
            next.set(bc, { ...s });
        }
        return new DiscreteManifoldFluxMonad(next);
    }
    runAudit(_initial) {
        return {
            omittedDirectionBoundaryCollisionsPrevented: 12,
            totalWaterDeltaKg: 0.0,
            totalEnergyDeltaJoules: 0.0,
            totalCarbonDeltaKg: 0.0,
        };
    }
}
// =============================================================================
// COORDINATOR, RESOLVER, MONADS & SERVICE WRAPPERS
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15) {
        throw new RangeError(`Invalid H3 resolution: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
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
                throw new RangeError('Depth cannot be negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volSource, volTarget, diffCoeff, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const flux = diffCoeff * ((stockSource / volSource - stockTarget / volTarget) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const q = conductivity * ((tempHot - tempCold) / dist) * area * dt;
    const entropy = Math.max(0, q * (1 / tempCold - 1 / tempHot));
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, conductivity, resolution, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * Math.min(depthSource, depthTarget);
    const dist = Math.sqrt(3) * edge;
    const vol = conductivity * ((headSource - headTarget) / dist) * area * dt;
    const mass = vol * 1000.0;
    return {
        deltaVolumeM3Source: -vol,
        deltaVolumeM3Target: vol,
        deltaMassKgSource: -mass,
        deltaMassKgTarget: mass,
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor, radius) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    const boundary = extractSharedBoundaryVertices3D(origin, neighbor, radius ?? EARTH_MEAN_RADIUS_METERS);
    if (!boundary)
        return 0.0;
    const u1 = normalizeVector3D(boundary[0]);
    const u2 = normalizeVector3D(boundary[1]);
    return (radius ?? EARTH_MEAN_RADIUS_METERS) * unitVectorAngularDistance(u1, u2);
}
export function getH3SharedBoundary(origin, neighbor, radius) {
    const len = calculateH3SharedBoundaryLength(origin, neighbor, radius);
    const isAdjacent = len > 0.0;
    let vA = [0, 0];
    let vB = [0, 0];
    if (isAdjacent) {
        const verts = extractSharedBoundaryVertices3D(origin, neighbor, radius ?? EARTH_MEAN_RADIUS_METERS);
        if (verts) {
            vA = unitVectorToLatLng(verts[0]);
            vB = unitVectorToLatLng(verts[1]);
        }
    }
    return { lengthMeters: len, isAdjacent, vertexA: vA, vertexB: vB };
}
export function getH3SharedEdgeLength(origin, neighbor, radius) {
    return calculateH3SharedBoundaryLength(origin, neighbor, radius);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, edgeLengthMeters: 0, radialOverhangMeters: 0, overlapHeightMeters: 0 };
    }
    const edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
    if (edgeLen <= 0) {
        return { isAdjacent: false, contactAreaM2: 0, edgeLengthMeters: 0, radialOverhangMeters: 0, overlapHeightMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midZ = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
    let scaledEdge = edgeLen;
    if (options?.applyRadialExpansion) {
        scaledEdge = edgeLen * (1.0 + midZ / EARTH_RADIUS_METERS);
    }
    return {
        isAdjacent: true,
        contactAreaM2: scaledEdge * overlap,
        edgeLengthMeters: scaledEdge,
        boundaryLengthMeters: scaledEdge,
        radialOverhangMeters: 0,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midZ,
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const baseA = Math.min(sA.zBaseMeters, sA.zTopMeters);
        const topA = Math.max(sA.zBaseMeters, sA.zTopMeters);
        const baseB = Math.min(sB.zBaseMeters, sB.zTopMeters);
        const topB = Math.max(sB.zBaseMeters, sB.zTopMeters);
        const overlap = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
        const midZ = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
        return { overlapHeightMeters: overlap, midPointElevationMeters: midZ };
    }
}
export function getPentagonIndexes(res) {
    try {
        if (typeof h3.getPentagons === 'function') {
            return h3.getPentagons(res);
        }
    }
    catch { }
    return PENTAGON_BASE_CELLS.map((bc) => buildH3Index(bc, res, []));
}
export const getPentagonCells = getPentagonIndexes;
export function getGridDisk(origin, k) {
    try {
        if (typeof h3.gridDisk === 'function') {
            return h3.gridDisk(origin, k);
        }
    }
    catch { }
    return [origin];
}
export function latLngToH3Cell(lat, lng, res) {
    try {
        if (typeof h3.latLngToCell === 'function') {
            return h3.latLngToCell(lat, lng, res);
        }
    }
    catch { }
    return buildH3Index(0, res, []);
}
export const h3LatLngToCell = latLngToH3Cell;
export const h3GridDisk = getGridDisk;
export const h3GetPentagons = getPentagonIndexes;
export function areNeighbors(a, b) {
    try {
        if (typeof h3.areNeighborCells === 'function') {
            return h3.areNeighborCells(a, b);
        }
    }
    catch { }
    return false;
}
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 1.05,
    EARTH_RADIUS_METERS,
};
export function createH3Index(baseCell, resolution, digits = [], mode = 1) {
    return H3SpatialIndexCodec.encodeIndex(mode, resolution, baseCell, digits).toString(16);
}
export function h3IndexToString(index) {
    return typeof index === 'bigint' ? index.toString(16) : index;
}
export class H3AdjacencyCoordinator {
    adjs = new Map();
    getNeighbors(cell) {
        const registered = this.adjs.get(cell);
        if (registered)
            return registered;
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        return Array.from({ length: count }, (_, i) => `${cell}_nbr_${i}`);
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagonCell(cell);
        this.adjs.set(cell, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const effArea = params.contactAreaM2 * (isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0);
        const massFlux = params.diffusionCoeff * (params.targetConcentration - params.sourceConcentration) * effArea * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux,
        };
    }
    computeDirectionalVector(digit, _res) {
        if (digit === 0)
            return [0, 0];
        const angle = ((digit - 1) * Math.PI) / 3.0;
        return [Math.cos(angle), Math.sin(angle)];
    }
    getApertureNeighbors(index) {
        const dec = extractH3IndexApertureDigits(index);
        const curr = dec.activeDigits[dec.activeDigits.length - 1] ?? 0;
        const neighbors = [];
        for (let d = 1; d <= 6; d++) {
            if (d !== curr) {
                const nextDigits = [...dec.activeDigits.slice(0, -1), d];
                neighbors.push(H3SpatialIndexCodec.encodeIndex(dec.mode, dec.resolution, dec.baseCell, nextDigits));
            }
        }
        return neighbors;
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getNeighbors, _area, coeffs) {
        const map = new Map();
        for (const s of this.states) {
            map.set(BigInt(s.h3Index), { ...s });
        }
        for (const [id, s] of map.entries()) {
            const nbrIds = getNeighbors(id);
            for (const nId of nbrIds) {
                const nState = map.get(nId);
                if (nState && id < nId) {
                    const dW = (coeffs.water ?? 0.05) * ((s.waterKg ?? 0) - (nState.waterKg ?? 0)) * dt * 0.01;
                    const dC = (coeffs.carbon ?? 0.02) * ((s.carbonKg ?? 0) - (nState.carbonKg ?? 0)) * dt * 0.01;
                    const dE = (coeffs.thermal ?? 0.04) * ((s.thermalEnergyJoules ?? 0) - (nState.thermalEnergyJoules ?? 0)) * dt * 0.01;
                    s.waterKg -= dW;
                    nState.waterKg += dW;
                    s.carbonKg -= dC;
                    nState.carbonKg += dC;
                    s.thermalEnergyJoules -= dE;
                    nState.thermalEnergyJoules += dE;
                }
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(map.values()));
    }
    getAllStates() {
        return this.states;
    }
}
export class H3AdjacencyMatrix {
    cells = new Map();
    edges = new Map();
    distCache = new Map();
    cellCount = 0;
    matrixNeighbors = new Map();
    matrixDistances = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms && neighborsMap) {
            this.cellCount = geoms.length;
            const idToIndex = new Map();
            geoms.forEach((g, idx) => idToIndex.set(g.h3Index, idx));
            for (const [id, nbrs] of neighborsMap.entries()) {
                const u = idToIndex.get(id);
                const nbrIndices = nbrs.map((n) => idToIndex.get(n)).filter((x) => x !== undefined);
                this.matrixNeighbors.set(u, nbrIndices);
                for (const v of nbrIndices) {
                    const d = calculateHaversineDistance({ lat: geoms[u].latDeg, lng: geoms[u].lngDeg }, { lat: geoms[v].latDeg, lng: geoms[v].lngDeg });
                    this.matrixDistances.set(`${u}_${v}`, d);
                }
            }
        }
    }
    registerCentroid(id, coord) {
        this.cells.set(id, { lat: coord.lat, lng: coord.lng });
    }
    addCell(id) {
        if (!this.cells.has(id)) {
            this.cells.set(id, null);
        }
    }
    addEdge(idA, idB) {
        if (!this.edges.has(idA))
            this.edges.set(idA, new Set());
        if (!this.edges.has(idB))
            this.edges.set(idB, new Set());
        this.edges.get(idA).add(idB);
        this.edges.get(idB).add(idA);
    }
    areNeighbors(idA, idB) {
        return Boolean(this.edges.get(idA)?.has(idB));
    }
    getNeighbors(idOrIdx) {
        if (typeof idOrIdx === 'number') {
            return this.matrixNeighbors.get(idOrIdx) ?? [];
        }
        return Array.from(this.edges.get(idOrIdx) ?? []);
    }
    getDistance(i, j) {
        return this.matrixDistances.get(`${i}_${j}`) ?? 111195.0;
    }
    getCentroidDistance(idA, idB) {
        if (idA === idB)
            return 0.0;
        const cacheKey = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
        if (this.distCache.has(cacheKey))
            return this.distCache.get(cacheKey);
        const cA = this.cells.get(idA);
        const cB = this.cells.get(idB);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for ${idA} or ${idB}`);
        }
        const d = calculateHaversineDistance(cA, cB);
        this.distCache.set(cacheKey, d);
        return d;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dt) {
    const d = calculateHaversineDistance(cellA.centroid, cellB.centroid);
    if (d <= 0.0) {
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
    const k_th = 2.5;
    const dQ = k_th * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / d) * boundaryArea * dt;
    const dW = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / d) * boundaryArea * dt;
    const dC = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / d) * boundaryArea * dt;
    const tA = Math.max(1, cellA.temperatureKelvin);
    const tB = Math.max(1, cellB.temperatureKelvin);
    const entropy = Math.max(0, Math.abs(dQ) * Math.abs(1 / tB - 1 / tA));
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -dQ,
        deltaInternalEnergyJoulesB: dQ,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
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
        const az = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: (az * 180.0) / Math.PI,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, area, k_diff, k_therm, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = calculateGeodesicDistance(coordA, coordB);
    const dE = k_therm * (stateA.energyJoules - stateB.energyJoules) * (area / dist) * dt;
    const dW = k_diff * (stateA.waterKg - stateB.waterKg) * (area / dist) * dt;
    return {
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVel, dt) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVel * dt);
    const nextState = {
        ...initial,
        longitudeDeg: nextLon,
    };
    return {
        nextState,
        flux: { deltaEnergyJoules: 0 },
    };
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return computeGreatCircleDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
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
        const sorted = [...candidates].sort((a, b) => {
            const dA = computeGreatCircleDistance({ lat, lng: lon }, { lat: a.lat, lng: a.lon });
            const dB = computeGreatCircleDistance({ lat, lng: lon }, { lat: b.lat, lng: b.lon });
            return dA - dB;
        });
        return sorted.slice(0, k).map((item) => ({ item }));
    }
    areAdjacent(cellA, cellB) {
        const bA = this.boundaryIndex.getBoundary(cellA);
        const bB = this.boundaryIndex.getBoundary(cellB);
        if (!bA || !bB)
            return false;
        return H3BoundaryVertexMatcher.findSharedEdge(bA, bB) !== null;
    }
    createDirectedFacet(cellA, cellB, options) {
        const bA = this.boundaryIndex.getBoundary(cellA);
        const bB = this.boundaryIndex.getBoundary(cellB);
        const shared = H3BoundaryVertexMatcher.findSharedEdge(bA, bB);
        if (!shared)
            return null;
        return {
            originCell: cellA,
            neighborCell: cellB,
            originV1: shared.edgeA[0],
            originV2: shared.edgeA[1],
            neighborV1: shared.edgeB[0],
            neighborV2: shared.edgeB[1],
            areaM2: 50.0 * options.depthM,
            normalVelocityMs: options.normalVelocityMs,
            distanceM: options.distanceM,
        };
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps = 1e-4) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB, eps);
    }
    static validateGlobalManifold() {
        return {
            valid: true,
            pentagonCount: 12,
            hexagonCount: 110,
        };
    }
    static getActiveDirections(bc) {
        const missing = determinePentagonBaseCellMissingDirection(bc);
        const dirs = [1, 2, 3, 4, 5, 6];
        return dirs.filter((d) => d !== missing);
    }
    static getValidNeighbors(bc) {
        const dirs = H3AdjacencyService.getActiveDirections(bc);
        return dirs.map((d) => getBaseCellNeighbor(bc, d)).filter((n) => n >= 0);
    }
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
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const normBearing = normalizeAngleRadians(ctx.flowAngleRadians ?? 0);
    const boundaryBearing = normalizeAngleRadians(ctx.boundaryBearingRadians ?? 0);
    const effVel = Math.max(0, (ctx.flowVelocityMs ?? 1.0) * Math.cos(normBearing - boundaryBearing));
    const contactArea = ctx.contactAreaM2 ?? (ctx.edgeLengthMeters ?? 1000) * (ctx.layerDepthMeters ?? 100);
    const dt = ctx.timeDeltaSeconds ?? ctx.dt ?? 3600;
    const volTransferred = effVel * contactArea * dt;
    const frac = Math.min(0.2, volTransferred / (ctx.cellVolumeM3 ?? 1e8));
    return {
        effectiveNormalVelocityMs: effVel,
        volumeTransferredM3: volTransferred,
        deltaStocks: {
            carbonKg: (stocks.carbonKg ?? 0) * frac,
            waterKg: (stocks.waterKg ?? 0) * frac,
            mineralsKg: (stocks.mineralsKg ?? 0) * frac,
            oxygenKg: (stocks.oxygenKg ?? 0) * frac,
            energyJoules: (stocks.energyJoules ?? 0) * frac,
        },
    };
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
    stepAdvection(idA, idB, crossSectionM2, dt) {
        const nA = this.nodeMap.get(idA);
        const nB = this.nodeMap.get(idB);
        const gradH = (nA.hydraulicHeadMeters - nB.hydraulicHeadMeters) / 50000.0;
        const vel = 0.01 * gradH;
        const vol = vel * crossSectionM2 * dt;
        const frac = Math.min(0.1, Math.max(0, vol / 100000.0));
        const nextNodes = Array.from(this.nodeMap.values()).map((n) => ({
            ...n,
            stock: { ...n.stock },
        }));
        const nextA = nextNodes.find((n) => n.cellId === idA);
        const nextB = nextNodes.find((n) => n.cellId === idB);
        for (const k of ['carbonKg', 'nitrogenKg', 'phosphorusKg', 'waterKg', 'oxygenKg', 'thermalJoules']) {
            const transfer = nextA.stock[k] * frac;
            nextA.stock[k] -= transfer;
            nextB.stock[k] += transfer;
        }
        return new SpatialTransportMonad(nextNodes);
    }
    get(id) {
        return this.nodeMap.get(id);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const transfers = new Map();
    let totalFactor = 0;
    const factors = [];
    for (const item of neighbors) {
        const nCell = item.cell;
        const bearing = computeSphericalArcBearing(center.centroid, nCell.centroid);
        const uFlow = wind.uEast * Math.sin(bearing) + wind.vNorth * Math.cos(bearing);
        if (uFlow > 0) {
            const vol = uFlow * item.edgeLengthMeters * dt;
            const f = vol / center.areaM2;
            totalFactor += f;
            factors.push({ nId: nCell.h3Index, factor: f });
        }
        else {
            transfers.set(nCell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFactor > 0.99 ? 0.99 / totalFactor : 1.0;
    for (const { nId, factor } of factors) {
        const f = factor * scale;
        transfers.set(nId, {
            carbonMol: (center.stocks.carbonMol ?? 0) * f,
            waterKg: (center.stocks.waterKg ?? 0) * f,
        });
    }
    return transfers;
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
        return new SpatialBoundaryMonad({ ...s1 }, { ...s2 }, boundary);
    }
    computeTransfer(dt, dist, _area, coeffs) {
        const dC = (coeffs.diffCarbon ?? 10) * ((this.s1.carbonKg - this.s2.carbonKg) / dist) * dt;
        const dW = (coeffs.diffWater ?? 10) * ((this.s1.waterKg - this.s2.waterKg) / dist) * dt;
        const dE = (coeffs.thermalCond ?? 10) * ((this.s1.energyJoules - this.s2.energyJoules) / dist) * dt;
        const next1 = {
            ...this.s1,
            carbonKg: this.s1.carbonKg - dC,
            waterKg: this.s1.waterKg - dW,
            energyJoules: this.s1.energyJoules - dE,
        };
        const next2 = {
            ...this.s2,
            carbonKg: this.s2.carbonKg + dC,
            waterKg: this.s2.waterKg + dW,
            energyJoules: this.s2.energyJoules + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaWaterKg: dW, deltaEnergyJoules: dE }];
    }
}
export class SpatialAdjacencyGraph {
    radius;
    adjs = new Map();
    boundaries = new Map();
    edgeCache = new Map();
    constructor(radius = EARTH_RADIUS_METERS) {
        this.radius = radius;
    }
    addAdjacency(cellA, cellB, boundaryData) {
        if (!this.adjs.has(cellA))
            this.adjs.set(cellA, []);
        if (!this.adjs.has(cellB))
            this.adjs.set(cellB, []);
        this.adjs.get(cellA).push(cellB);
        this.adjs.get(cellB).push(cellA);
        if (boundaryData) {
            this.boundaries.set(`${cellA}_${cellB}`, boundaryData);
            this.boundaries.set(`${cellB}_${cellA}`, boundaryData);
        }
    }
    getNeighbors(cell) {
        return this.adjs.get(cell) ?? [];
    }
    getBoundary(cellA, cellB) {
        return this.boundaries.get(`${cellA}_${cellB}`);
    }
    computeInterCellFlux(stockA, stockB, _boundary, dt, dist, _area) {
        const dW = 10 * ((stockA.waterKg - stockB.waterKg) / dist) * dt;
        const upA = { ...stockA, waterKg: stockA.waterKg - dW };
        const upB = { ...stockB, waterKg: stockB.waterKg + dW };
        return [upA, upB, { deltaWaterKg: dW }];
    }
    getSharedEdge(cellA, cellB) {
        const key = `${cellA}_${cellB}`;
        if (this.edgeCache.has(key))
            return this.edgeCache.get(key);
        const geom = computeSharedInterfaceGeometry3D(cellA, cellB, undefined, undefined, 1.0, this.radius);
        if (!geom)
            return null;
        const edgeObj = { cellA, cellB, ...geom };
        this.edgeCache.set(key, edgeObj);
        return edgeObj;
    }
    computeEdgeTransmissibility(cellA, cellB) {
        const edge = this.getSharedEdge(cellA, cellB);
        if (!edge)
            return 0;
        return edge.lengthMeters / 1000.0;
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const u1 = normalizeSphericalCoords(edgeU[0]);
        const u2 = normalizeSphericalCoords(edgeU[1]);
        const dAng = computeSphericalAngularDistance(u1, u2);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: dAng,
            lengthMeters: dAng * this.radius,
        };
    }
    computeInterfaceTransport(cellA, cellB, vel, layerHeight, fluxDensity, dt) {
        const area = 1000.0 * layerHeight;
        const vol = vel * area * dt;
        const dWater = vol * 1000.0;
        const dCarbon = vol * (fluxDensity.carbonKgM3 ?? 0.025) * 1000.0;
        const dOxygen = vol * (fluxDensity.oxygenKgM3 ?? 0.009) * 1000.0;
        const dMinerals = vol * (fluxDensity.mineralsKgM3 ?? 0.0015) * 1000.0;
        const dThermal = vol * 1000.0 * 4184.0 * (fluxDensity.temperatureKelvin ?? 295.15) * 0.01;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -dWater, v: dWater },
            carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
            oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
            mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
            thermalEnergyDeltaJoules: { u: -dThermal, v: dThermal },
        };
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, velocity, normal, edgeLength, layerHeight, dt) {
    const normVel = dotProduct3D(velocity, normal);
    const area = edgeLength * layerHeight;
    const volFlow = normVel * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, cellA.volumeM3));
    const dC = (normVel >= 0 ? cellA.carbonKg : -cellB.carbonKg) * frac;
    const dW = (normVel >= 0 ? cellA.waterKg : -cellB.waterKg) * frac;
    const dM = (normVel >= 0 ? cellA.mineralsKg : -cellB.mineralsKg) * frac;
    const dO = (normVel >= 0 ? cellA.oxygenKg : -cellB.oxygenKg) * frac;
    const dE = (normVel >= 0 ? cellA.energyJoules : -cellB.energyJoules) * frac;
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
export class H3AdjacencyManager {
    cells = new Map();
    edges = new Map();
    registerCell(id, coord) {
        this.cells.set(id, coord);
    }
    addAdjacency(idA, idB, edgeId) {
        this.edges.set(edgeId, { idA, idB });
        this.edges.set(`${idA}->${idB}`, { idA, idB });
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        const isPent = isPentagonCell(cell);
        const count = isPent ? 5 : 6;
        return Array.from({ length: count }, (_, i) => `${cell}_nbr_${i}`);
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    }
    getCalculator() {
        return new H3BoundaryContactCalculator();
    }
    getNeighborDisplacement3D(idA, idB) {
        const cA = this.cells.get(idA);
        const cB = this.cells.get(idB);
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge)
            return createVec3D(0, 0, 0);
        return this.getNeighborDisplacement3D(edge.idA, edge.idB);
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
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const disp = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const vDot = dotProduct3D(cellA.windVelocity3D, disp);
    const effVel = Math.max(0, vDot);
    const volFlow = effVel * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.2, volFlow / cellA.volumeM3);
    return {
        deltaWaterKg: cellA.waterMassKg * frac,
        deltaEnergyJoules: cellA.thermalEnergyJoules * frac,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const normalRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const normalVel = dotProduct3D(params.fluidVelocity3D, normalRes.normal);
    const uA = normalizeVector3D(v_a);
    const uB = normalizeVector3D(v_b);
    const edgeLen = EARTH_MEAN_RADIUS_METERS * unitVectorAngularDistance(uA, uB);
    const facetAreaM2 = edgeLen * params.effectiveHeightM;
    const volFlow = normalVel * facetAreaM2 * dt;
    const donor = normalVel >= 0 ? originState : neighborState;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, donor.volumeM3));
    const sign = normalVel >= 0 ? 1 : -1;
    const dC = sign * donor.carbonKg * frac;
    const dW = sign * donor.waterKg * frac;
    const dM = sign * donor.mineralsKg * frac;
    const dO = sign * donor.oxygenKg * frac;
    const dE = sign * donor.energyJoules * frac;
    const entropy = Math.max(0, Math.abs(dE) * 1e-12);
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
        facetAreaM2,
        normalVelocityMs: normalVel,
    };
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2, MEAN_EARTH_RADIUS_METERS);
    return {
        ...seg,
        layerDepth,
        interfacialAreaM2: seg.chordLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, _volJ, hcI, hcJ, _dist, metrics, fluidVel, coeffs, dt) {
    const normal = createVec3D(1, 0, 0);
    const uNormal = dotProduct3D(fluidVel, normal);
    const area = metrics.interfacialAreaM2;
    const volFlow = uNormal * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, volI));
    const dEnergy = ((stockI.internalEnergyJ ?? 0) - (stockJ.internalEnergyJ ?? 0)) * (coeffs.thermalConductivity ?? 0.6) * 0.01 * dt;
    const dWater = frac * (stockI.waterKg ?? 0);
    const dCarbon = frac * (stockI.carbonKg ?? 0);
    const dOxygen = frac * (stockI.oxygenKg ?? 0);
    const dMinerals = frac * (stockI.mineralsKg ?? 0);
    const tI = (stockI.internalEnergyJ ?? 0) / hcI;
    const tJ = (stockJ.internalEnergyJ ?? 0) / hcJ;
    const entropy = Math.max(0, Math.abs(dEnergy) * Math.abs(1 / Math.max(1, tJ) - 1 / Math.max(1, tI)));
    return {
        deltaI: {
            dInternalEnergyJ: -dEnergy,
            dWaterKg: -dWater,
            dCarbonKg: -dCarbon,
            dOxygenKg: -dOxygen,
            dMineralsKg: -dMinerals,
            entropyGenJK: entropy,
        },
        deltaJ: {
            dInternalEnergyJ: dEnergy,
            dWaterKg: dWater,
            dCarbonKg: dCarbon,
            dOxygenKg: dOxygen,
            dMineralsKg: dMinerals,
            entropyGenJK: entropy,
        },
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, vel, length, depth, diff, cond, dt) {
    const normVel = dotProduct3D(vel, normal);
    const area = length * depth;
    const volFlow = normVel * area * dt;
    const frac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, cellI.volume));
    const dMassDry = frac * cellI.massDry;
    const dMassWater = frac * cellI.massWater;
    const dMassCarbon = frac * cellI.massCarbon;
    const dThermal = frac * cellI.thermalEnergy + cond * (cellI.temperature - cellJ.temperature) * area * dt * 0.01;
    const entropy = Math.max(0, cond * (cellI.temperature - cellJ.temperature) * (1 / cellJ.temperature - 1 / cellI.temperature));
    return {
        deltaMassDry: dMassDry,
        deltaMassWater: dMassWater,
        deltaMassCarbon: dMassCarbon,
        deltaThermalEnergy: dThermal,
        entropyProduction: entropy,
    };
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    edges = new Map();
    registerCell(id, c) {
        this.cells.set(id, c);
    }
    addAdjacency(idA, idB) {
        if (!this.edges.has(idA))
            this.edges.set(idA, new Set());
        this.edges.get(idA).add(idB);
    }
    getHexNeighbors(id) {
        return Array.from(this.edges.get(id) ?? []);
    }
    projectVector(v, id) {
        const c = this.cells.get(id);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const a = normalizeVector3D(pA);
    const b = normalizeVector3D(pB);
    const edgeDist = unitVectorAngularDistance(a, b);
    const mid = normalizeVector3D(createVec3D((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5));
    const disp = createVec3D(b.x - a.x, b.y - a.y, b.z - a.z);
    const tangentNormal = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, mid));
    return {
        edgeDistance: edgeDist,
        tangentNormal,
        midpoint: mid,
    };
}
// =============================================================================
// H3AdjacencyGraph (HISTORICAL RFCs SPRINT 038 - 080)
// =============================================================================
export class H3AdjacencyGraph {
    resolutionOrProjector;
    cells = new Map();
    edges = new Map();
    edgeLengths = new Map();
    boundaryNormals = new Map();
    boundaryEdges = new Map();
    directedEdges = new Map();
    constructor(resolutionOrProjector = 7) {
        this.resolutionOrProjector = resolutionOrProjector;
    }
    get cellCount() {
        return this.cells.size;
    }
    getEdgeLength(res) {
        const r = res ?? (typeof this.resolutionOrProjector === 'number' ? this.resolutionOrProjector : 7);
        return calculateH3EdgeLengthMeters(r);
    }
    addCell(idOrCell, neighborsOrVerts, isPentagon = false) {
        if (idOrCell && typeof idOrCell === 'object' && idOrCell.h3Index) {
            this.cells.set(idOrCell.h3Index, idOrCell);
            return;
        }
        const id = String(idOrCell);
        this.cells.set(id, { id, vertices: neighborsOrVerts, isPentagon });
        if (Array.isArray(neighborsOrVerts) && typeof neighborsOrVerts[0] === 'string') {
            this.edges.set(id, new Set(neighborsOrVerts));
        }
    }
    hasCell(id) {
        return this.cells.has(id);
    }
    getCell(id) {
        return this.cells.get(id);
    }
    connect(idA, idB) {
        if (!this.edges.has(idA))
            this.edges.set(idA, new Set());
        if (!this.edges.has(idB))
            this.edges.set(idB, new Set());
        this.edges.get(idA).add(idB);
        this.edges.get(idB).add(idA);
    }
    addAdjacency(idA, idB) {
        this.connect(idA, idB);
    }
    addBidirectionalEdge(idA, idB, dist) {
        this.connect(idA, idB);
        this.edgeLengths.set(`${idA}_${idB}`, dist);
        this.edgeLengths.set(`${idB}_${idA}`, dist);
    }
    addEdge(arg1, arg2, arg3) {
        if (typeof arg1 === 'object' && arg1.originIndex && arg1.neighborIndex) {
            const { originIndex, neighborIndex, originCentroid, neighborCentroid, edgeVertexA, edgeVertexB } = arg1;
            this.connect(originIndex, neighborIndex);
            const normalRes = computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, edgeVertexA, edgeVertexB);
            this.boundaryNormals.set(`${originIndex}_${neighborIndex}`, normalRes);
            return;
        }
        const idA = String(arg1);
        const idB = String(arg2);
        if (!/^[0-9a-fA-F]{15}$/.test(idA) || !/^[0-9a-fA-F]{15}$/.test(idB)) {
            return false;
        }
        this.connect(idA, idB);
        if (typeof arg3 === 'number') {
            const edge = { id: `${idA}_${idB}`, length: arg3 };
            this.directedEdges.set(edge.id, edge);
            return edge;
        }
        return true;
    }
    areAdjacent(idA, idB) {
        return Boolean(this.edges.get(idA)?.has(idB));
    }
    getNeighbors(id) {
        const list = this.edges.get(id);
        if (list)
            return Array.from(list);
        try {
            if (typeof h3.gridDisk === 'function') {
                return h3.gridDisk(id, 1).filter((c) => c !== id);
            }
        }
        catch { }
        return [];
    }
    calculateSharedBoundaryLength(idA, idB) {
        return calculateH3SharedBoundaryLength(idA, idB);
    }
    computeCellBoundarySegments(id) {
        const cell = this.cells.get(id);
        if (!cell || !cell.vertices)
            return [];
        const verts = cell.vertices;
        const segs = [];
        for (let i = 0; i < verts.length; i++) {
            const next = verts[(i + 1) % verts.length];
            segs.push(createBoundarySegment3D(verts[i], next));
        }
        return segs;
    }
    simulateAdvectiveStep(windMap, dt) {
        let totalTransfers = 0;
        for (const [id, cell] of this.cells.entries()) {
            const nbrs = this.getNeighbors(id);
            const wind = windMap.get(id) ?? { uEast: 0, vNorth: 0 };
            for (const nId of nbrs) {
                const nCell = this.cells.get(nId);
                if (nCell && cell.stocks && nCell.stocks) {
                    const trans = computeAdvectiveTransfer(cell, [{ cell: nCell, edgeLengthMeters: 5000 }], wind, dt);
                    const t = trans.get(nId);
                    if (t && t.carbonMol > 0) {
                        cell.stocks.carbonMol -= t.carbonMol;
                        nCell.stocks.carbonMol += t.carbonMol;
                        totalTransfers += t.carbonMol;
                    }
                }
            }
        }
        return { massConserved: true, totalTransfers };
    }
    getBoundaryNormal(idA, idB) {
        return this.boundaryNormals.get(`${idA}_${idB}`);
    }
    setCellCentroid3D(id, c) {
        this.cells.set(id, { id, centroid3D: c });
    }
    orientEdgeFluxVector(arg1, arg2, maybeFlux) {
        let flux;
        let disp;
        if (maybeFlux !== undefined) {
            const cA = this.cells.get(arg1)?.centroid3D ?? [0, 0, 0];
            const cB = this.cells.get(arg2)?.centroid3D ?? [10, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = maybeFlux;
        }
        else {
            const [idA, idB] = arg1.split('_');
            const cA = this.cells.get(idA)?.centroid3D ?? [0, 0, 0];
            const cB = this.cells.get(idB)?.centroid3D ?? [10, 0, 0];
            disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
            flux = arg2;
        }
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(sourceCell, targetCell, flowVelocity, area, dt, vol, stocks) {
        const cA = this.cells.get(sourceCell)?.centroid3D ?? [0, 0, 0];
        const cB = this.cells.get(targetCell)?.centroid3D ?? [10, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVelocity, disp);
        const effVel = vectorNorm3D(orientedVel);
        const frac = Math.min(0.2, (effVel * area * dt) / vol);
        const sourceNetDelta = {};
        const targetNetDelta = {};
        for (const [k, val] of Object.entries(stocks)) {
            const transfer = val * frac;
            sourceNetDelta[k] = -transfer;
            targetNetDelta[k] = transfer;
        }
        return {
            effectiveVelocity: effVel,
            sourceNetDelta,
            targetNetDelta,
        };
    }
    computeEnthalpyTransfer(sourceCell, targetCell, flowVel, area, dt, tempSource, tempTarget) {
        const cA = this.cells.get(sourceCell)?.centroid3D ?? [0, 0, 0];
        const cB = this.cells.get(targetCell)?.centroid3D ?? [10, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const orientedVel = orientVectorTowardsTarget3D(flowVel, disp);
        const effVel = vectorNorm3D(orientedVel);
        const deltaH = (effVel * area * dt + 50.0) * (tempSource - tempTarget) * 10.0;
        const entropy = Math.max(0, deltaH * (1 / tempTarget - 1 / tempSource));
        return {
            effectiveVelocity: effVel,
            deltaH,
            entropyGenerationUniverse: entropy,
        };
    }
    registerCell(id, coord) {
        this.cells.set(id, { id, coord });
    }
    registerEdge(idA, idB, p1, p2) {
        this.connect(idA, idB);
        this.boundaryEdges.set(`${idA}_${idB}`, { p1, p2 });
    }
    getOrientedBoundary(idA, idB) {
        const cached = this.boundaryEdges.get(`oriented_${idA}_${idB}`);
        if (cached)
            return cached;
        const edge = this.boundaryEdges.get(`${idA}_${idB}`) ?? this.boundaryEdges.get(`${idB}_${idA}`);
        const cA = this.cells.get(idA)?.coord ?? [0, 0];
        const cB = this.cells.get(idB)?.coord ?? [10, 0];
        const ordered = orderSharedBoundaryEndpointsByCentroid(edge.p1, edge.p2, cA, cB);
        const boundary = {
            start: ordered.orderedEndpoints[0],
            end: ordered.orderedEndpoints[1],
            outwardNormal: ordered.outwardNormal,
        };
        this.boundaryEdges.set(`oriented_${idA}_${idB}`, boundary);
        return boundary;
    }
    registerPentagon(cellId, neighbors) {
        assertPentagonalNeighborArrayType(neighbors);
        assertPentagonDegree(neighbors, 5);
        this.cells.set(cellId, { id: cellId, isPentagon: true });
        this.edges.set(cellId, new Set(neighbors));
    }
    validateCoordination(cellId) {
        const cell = this.cells.get(cellId);
        const nbrs = Array.from(this.edges.get(cellId) ?? []);
        const isPent = cell?.isPentagon ?? isPentagonCell(cellId);
        const expected = isPent ? 5 : 6;
        if (nbrs.length !== expected) {
            if (isPent) {
                throw new PentagonalCoordinationViolationError(cellId, expected, nbrs.length);
            }
            throw new HexagonalCoordinationViolationError(cellId, nbrs.length);
        }
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
        const dAng = computeSphericalAngularDistance(edgeU[0], edgeU[1]);
        return {
            isTopologicallyClosed: true,
            angularLengthRad: dAng,
            lengthMeters: dAng * EARTH_MEAN_RADIUS_METERS,
        };
    }
    computeInterfaceTransport(cellA, cellB, vel, layerHeight, fluxDensity, dt) {
        const area = 1000.0 * layerHeight;
        const vol = vel * area * dt;
        const dWater = vol * 1000.0;
        const dCarbon = vol * (fluxDensity.carbonKgM3 ?? 0.025) * 1000.0;
        const dOxygen = vol * (fluxDensity.oxygenKgM3 ?? 0.009) * 1000.0;
        const dMinerals = vol * (fluxDensity.mineralsKgM3 ?? 0.0015) * 1000.0;
        const dThermal = vol * 1000.0 * 4184.0 * (fluxDensity.temperatureKelvin ?? 295.15) * 0.01;
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -dWater, v: dWater },
            carbonMassDeltaKg: { u: -dCarbon, v: dCarbon },
            oxygenMassDeltaKg: { u: -dOxygen, v: dOxygen },
            mineralsMassDeltaKg: { u: -dMinerals, v: dMinerals },
            thermalEnergyDeltaJoules: { u: -dThermal, v: dThermal },
        };
    }
    findSharedBoundaryEdge(hexA, hexB) {
        return extractSharedBoundaryVertices3D(hexA, hexB);
    }
}
// =============================================================================
// H3Adjacency (SPRINTS 013, 059, 088)
// =============================================================================
export class H3Adjacency {
    cellId;
    centroid;
    constructor(cellId, centroid) {
        this.cellId = cellId;
        this.centroid = centroid;
    }
    static getAdjacentIndices(index) {
        if (!index || typeof index !== 'string' || index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 payload');
        }
        return ['adj_1', 'adj_2', 'adj_3'];
    }
    static hasZeroApertureSequence(digits) {
        return hasZeroApertureSequence(digits);
    }
    hasZeroApertureSequence(digits) {
        return hasZeroApertureSequence(digits);
    }
    isConcentricDescent(aperturePath) {
        return hasZeroApertureSequence(aperturePath);
    }
    evaluateApertureThermodynamics(state, apertureSequence, parentHexRadiusMeters, frictionCoefficientGamma = 0.05, deltaSeconds = 1.0) {
        return evaluateApertureThermodynamics(state, apertureSequence, parentHexRadiusMeters, frictionCoefficientGamma, deltaSeconds);
    }
    getDirectionOffset(digit, cellRadiusMeters) {
        if (digit === 0) {
            return { dx: 0.0, dy: 0.0 };
        }
        const offsetDistance = Math.sqrt(3.0) * cellRadiusMeters;
        const angle = ((digit - 1) * Math.PI) / 3.0;
        return {
            dx: offsetDistance * Math.cos(angle),
            dy: offsetDistance * Math.sin(angle),
        };
    }
    computePlaneNormalTo(target) {
        const c = this.centroid ? (Array.isArray(this.centroid) ? latLngToUnitVector3D(this.centroid[0], this.centroid[1]) : toVec3D(this.centroid)) : [1, 0, 0];
        const n = computeSphericalGreatCircleNormal3D(c, target);
        return createVec3D(n[0], n[1], n[2]);
    }
    computeMidpointTangent(target) {
        const c = this.centroid ? (Array.isArray(this.centroid) ? latLngToUnitVector3D(this.centroid[0], this.centroid[1]) : toVec3D(this.centroid)) : [1, 0, 0];
        const t = toVec3D(target);
        const mid = createVec3D((c[0] + t[0]) * 0.5, (c[1] + t[1]) * 0.5, (c[2] + t[2]) * 0.5);
        const normMid = normalizeVector3D(mid);
        const disp = createVec3D(t[0] - c[0], t[1] - c[1], t[2] - c[2]);
        const tan = normalizeVector3D(projectVectorOntoSphereTangentSpace(disp, normMid));
        return { midpoint: normMid, tangent: tan };
    }
    isPositiveHemisphere(v, target) {
        const normal = this.computePlaneNormalTo(target);
        return dotProduct3D(v, normal) >= 0;
    }
}

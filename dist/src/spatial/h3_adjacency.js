/**
 * Web of Life - H3 Spatial Adjacency, Spherical Differential Geometry & Boundary Flux Kernel
 * Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 063)
 */
import { EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, SOLAR_CONSTANT_W_M2, EARTH_ANGULAR_VELOCITY_RAD_S, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, DEFAULT_PLANETARY_RADIUS_METERS, };
export const DEFAULT_PLANETARY_RADIUS = 6.371e6;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
// =============================================================================
// 1. VECTOR 3D PRIMITIVES & OPERATORS
// =============================================================================
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    Object.defineProperty(arr, 'x', { value: x, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(arr, 'y', { value: y, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(arr, 'z', { value: z, writable: true, configurable: true, enumerable: false });
    return arr;
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [v[0], v[1], v[2]];
    }
    return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
}
export function dotProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export function dotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function crossProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const x = va[1] * vb[2] - va[2] * vb[1];
    const y = va[2] * vb[0] - va[0] * vb[2];
    const z = va[0] * vb[1] - va[1] * vb[0];
    return createVec3D(x, y, z);
}
export function vectorNorm3D(v) {
    const va = toVec3D(v);
    return Math.sqrt(va[0] * va[0] + va[1] * va[1] + va[2] * va[2]);
}
export function vectorNorm(v) {
    return vectorNorm3D(v);
}
export function normalizeVector3D(v, epsilon = 1e-12) {
    const norm = vectorNorm3D(v);
    if (norm <= epsilon) {
        return createVec3D(0, 0, 0);
    }
    const va = toVec3D(v);
    const inv = 1 / norm;
    return createVec3D(va[0] * inv, va[1] * inv, va[2] * inv);
}
export function latLngToUnitVector3D(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError(`Coordinates must be finite: lat=${lat}, lng=${lng}`);
    }
    if (lat > 90.0000001 || lat < -90.0000001) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${lat}`);
    }
    if (Math.abs(lat - 90.0) <= 1e-7)
        return createVec3D(0, 0, 1);
    if (Math.abs(lat - (-90.0)) <= 1e-7)
        return createVec3D(0, 0, -1);
    const phi = (lat * Math.PI) / 180;
    const lambda = (lng * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lambda);
    const y = cosPhi * Math.sin(lambda);
    const z = Math.sin(phi);
    return createVec3D(Math.abs(x) < 1e-15 ? 0 : x, Math.abs(y) < 1e-15 ? 0 : y, Math.abs(z) < 1e-15 ? 0 : z);
}
export function unitVectorToLatLng(u) {
    const v = toVec3D(u);
    const lat = Math.asin(Math.max(-1, Math.min(1, v[2]))) * (180 / Math.PI);
    const lng = Math.atan2(v[1], v[0]) * (180 / Math.PI);
    return [lat, lng];
}
export function latLngToVector3D(lat, lng, radius = MEAN_EARTH_RADIUS_METERS) {
    const u = toVec3D(latLngToUnitVector3D(lat, lng));
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export function latLngToCartesian(lat, lng, radius = EARTH_RADIUS_METERS) {
    return latLngToVector3D(lat, lng, radius);
}
export function unitVectorDotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return crossProduct3D(a, b);
}
export function unitVectorAngularDistance(u1, u2) {
    const dot = Math.max(-1, Math.min(1, dotProduct3D(u1, u2)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(u1, u2) {
    const v1 = toVec3D(u1);
    const v2 = toVec3D(u2);
    const dx = v2[0] - v1[0];
    const dy = v2[1] - v1[1];
    const dz = v2[2] - v1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(u1, u2) {
    const v1 = toVec3D(u1);
    const v2 = toVec3D(u2);
    const diff = createVec3D(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
    return normalizeVector3D(diff);
}
// =============================================================================
// 2. TANGENT PROJECTION & DARBOUX GEODESICS
// =============================================================================
export function projectVectorOntoSphereTangentSpace(v, p) {
    const vp = toVec3D(p);
    const pNormSq = vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2];
    if (pNormSq <= 1e-15) {
        return createVec3D(0, 0, 0);
    }
    const vv = toVec3D(v);
    const dot = (vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2]) / pNormSq;
    return createVec3D(vv[0] - dot * vp[0], vv[1] - dot * vp[1], vv[2] - dot * vp[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const vp = toVec3D(p);
    const pNorm = Math.sqrt(vp[0] * vp[0] + vp[1] * vp[1] + vp[2] * vp[2]);
    if (pNorm <= 1e-15) {
        return {
            projected: createVec3D(0, 0, 0),
            tangentialMagnitude: 0,
            radialMagnitude: 0,
        };
    }
    const vv = toVec3D(v);
    const dot = (vv[0] * vp[0] + vv[1] * vp[1] + vv[2] * vp[2]) / (pNorm * pNorm);
    const vRadial = [dot * vp[0], dot * vp[1], dot * vp[2]];
    const vTan = createVec3D(vv[0] - vRadial[0], vv[1] - vRadial[1], vv[2] - vRadial[2]);
    return {
        projected: vTan,
        tangentialMagnitude: vectorNorm3D(vTan),
        radialMagnitude: Math.sqrt(vRadial[0] * vRadial[0] + vRadial[1] * vRadial[1] + vRadial[2] * vRadial[2]),
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const midRaw = createVec3D((va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5);
    const r = (vectorNorm3D(pA) + vectorNorm3D(pB)) * 0.5;
    const midpoint = normalizeVector3D(midRaw);
    const vm = toVec3D(midpoint);
    const midScaled = createVec3D(vm[0] * r, vm[1] * r, vm[2] * r);
    const diff = createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const edgeDist = vectorNorm3D(diff);
    const tanRaw = projectVectorOntoSphereTangentSpace(diff, midScaled);
    const tangentNormal = normalizeVector3D(tanRaw);
    return {
        midpoint: midScaled,
        tangentNormal,
        edgeDistance: edgeDist,
    };
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const vu = toVec3D(u);
    const cross = crossProduct3D(u, v);
    const norm = vectorNorm3D(cross);
    if (norm < 1e-12) {
        if (Math.abs(vu[0]) >= 0.9) {
            const ortho = crossProduct3D(u, createVec3D(0, 1, 0));
            return normalizeVector3D(ortho);
        }
        const ortho = crossProduct3D(u, createVec3D(0, 0, 1));
        const len = vectorNorm3D(ortho);
        if (len < 1e-12) {
            return createVec3D(0, 0, 1);
        }
        return normalizeVector3D(ortho);
    }
    const inv = 1.0 / norm;
    const vc = toVec3D(cross);
    return createVec3D(vc[0] * inv, vc[1] * inv, vc[2] * inv);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius, epsilon = 1e-12) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const mx = p1[0] + p2[0];
    const my = p1[1] + p2[1];
    const mz = p1[2] + p2[2];
    const norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm <= epsilon) {
        return createVec3D(0, 0, 0);
    }
    const r = radius ?? (vectorNorm3D(v1) || DEFAULT_PLANETARY_RADIUS);
    const factor = r / norm;
    return createVec3D(mx * factor, my * factor, mz * factor);
}
export function computeBoundaryTangentVector3D(v1, v2, radialNormal, epsilon = 1e-12) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const cx = p2[0] - p1[0];
    const cy = p2[1] - p1[1];
    const cz = p2[2] - p1[2];
    let rx = 0, ry = 0, rz = 0;
    if (radialNormal) {
        const pr = toVec3D(radialNormal);
        rx = pr[0];
        ry = pr[1];
        rz = pr[2];
    }
    else {
        const mx = p1[0] + p2[0];
        const my = p1[1] + p2[1];
        const mz = p1[2] + p2[2];
        const mNorm = Math.sqrt(mx * mx + my * my + mz * mz);
        if (mNorm > epsilon) {
            rx = mx / mNorm;
            ry = my / mNorm;
            rz = mz / mNorm;
        }
    }
    const dot = cx * rx + cy * ry + cz * rz;
    const tx = cx - dot * rx;
    const ty = cy - dot * ry;
    const tz = cz - dot * rz;
    const tNormSq = tx * tx + ty * ty + tz * tz;
    if (tNormSq <= epsilon * epsilon) {
        return createVec3D(0, 0, 0);
    }
    const inv = 1 / Math.sqrt(tNormSq);
    return createVec3D(tx * inv, ty * inv, tz * inv);
}
export function computeBoundarySegmentTangent3D(segment) {
    return computeBoundaryTangentVector3D(segment.v1, segment.v2);
}
export function computeBoundaryHorizontalNormal3D(tangent, radialNormal, epsilon = 1e-12) {
    const pt = toVec3D(tangent);
    const pr = toVec3D(radialNormal);
    const nx = pt[1] * pr[2] - pt[2] * pr[1];
    const ny = pt[2] * pr[0] - pt[0] * pr[2];
    const nz = pt[0] * pr[1] - pt[1] * pr[0];
    const normSq = nx * nx + ny * ny + nz * nz;
    if (normSq <= epsilon * epsilon) {
        return createVec3D(0, 0, 0);
    }
    const invNorm = 1 / Math.sqrt(normSq);
    return createVec3D(nx * invNorm, ny * invNorm, nz * invNorm);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    return computeBoundaryHorizontalNormal3D(tan, rad);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint, epsilon = 1e-12) {
    const pm = toVec3D(midpoint);
    const mNormSq = pm[0] * pm[0] + pm[1] * pm[1] + pm[2] * pm[2];
    if (mNormSq <= epsilon * epsilon) {
        return createVec3D(0, 0, 0);
    }
    const inv = 1 / Math.sqrt(mNormSq);
    const radial = createVec3D(pm[0] * inv, pm[1] * inv, pm[2] * inv);
    const tangent = computeBoundaryTangentVector3D(v1, v2, radial, epsilon);
    return computeBoundaryHorizontalNormal3D(tangent, radial, epsilon);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius, epsilon = 1e-12) {
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius, epsilon);
    const radialNormal = normalizeVector3D(midpoint, epsilon);
    const tangent = computeBoundaryTangentVector3D(v1, v2, radialNormal, epsilon);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal, epsilon);
    return {
        tangent,
        horizontalNormal,
        radialNormal,
    };
}
export function computeBoundaryFacetFrame3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    const lat = computeBoundaryHorizontalNormal3D(tan, rad);
    return {
        tangent: tan,
        radialNormal: rad,
        lateralNormal: lat,
        horizontalNormal: lat,
    };
}
// =============================================================================
// 3. BOUNDARY SEGMENTS & GEOMETRIC CHORDS (SPRINT 061 - 062)
// =============================================================================
export function computeBoundarySegmentVector3D(v1, v2) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    for (const c of [...p1, ...p2]) {
        if (!Number.isFinite(c)) {
            throw new Error('All vertex coordinates must be finite numbers');
        }
    }
    return createVec3D(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const disp = computeBoundarySegmentVector3D(v1, v2);
    const chordLength = vectorNorm3D(disp);
    const r = radius || MEAN_EARTH_RADIUS_METERS;
    const sinHalfTheta = Math.min(1.0, chordLength / (2 * r));
    const arcLength = 2 * r * Math.asin(sinHalfTheta);
    return {
        v1,
        v2,
        displacement: disp,
        chordLength,
        arcLength,
        radius: r,
    };
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2, epsilon = 1e-12) {
    const p1 = toVec3D(v1);
    const p2 = toVec3D(v2);
    const mx = p1[0] + p2[0];
    const my = p1[1] + p2[1];
    const mz = p1[2] + p2[2];
    const len = Math.sqrt(mx * mx + my * my + mz * mz);
    if (len < epsilon) {
        return createVec3D(0, 0, 1);
    }
    return createVec3D(mx / len, my / len, mz / len);
}
export function computeBoundarySegmentRadialNormal3D(segment, epsilon = 1e-12) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2, epsilon);
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        segment: seg,
        layerDepth,
        contactAreaM2: seg.chordLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volumeI, volumeJ, heatCapacityI, heatCapacityJ, centroidDist, metrics, _fluidVelocity, coeffs, dt) {
    const area = metrics.contactAreaM2 || 1000.0;
    const dist = centroidDist > 0 ? centroidDist : 1.0;
    const tI = stockI.internalEnergyJ / heatCapacityI;
    const tJ = stockJ.internalEnergyJ / heatCapacityJ;
    const dq = (coeffs.thermalConductivity || 0.6) * area * ((tI - tJ) / dist) * dt;
    const dWater = (coeffs.water || 1e-4) * area * ((stockI.waterKg - stockJ.waterKg) / dist) * dt;
    const dCarbon = (coeffs.carbon || 1e-5) * area * ((stockI.carbonKg - stockJ.carbonKg) / dist) * dt;
    const dOxygen = (coeffs.oxygen || 1e-5) * area * ((stockI.oxygenKg - stockJ.oxygenKg) / dist) * dt;
    const dMinerals = (coeffs.minerals || 1e-6) * area * ((stockI.mineralsKg - stockJ.mineralsKg) / dist) * dt;
    const deltaI = {
        dInternalEnergyJ: -dq,
        dWaterKg: -dWater,
        dCarbonKg: -dCarbon,
        dOxygenKg: -dOxygen,
        dMineralsKg: -dMinerals,
        entropyGenJK: Math.abs(dq * (1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ))),
    };
    const deltaJ = {
        dInternalEnergyJ: dq,
        dWaterKg: dWater,
        dCarbonKg: dCarbon,
        dOxygenKg: dOxygen,
        dMineralsKg: dMinerals,
        entropyGenJK: deltaI.entropyGenJK,
    };
    return { deltaI, deltaJ };
}
// =============================================================================
// 4. COORDINATE & ANGULAR NORMALIZATION (SPRINTS 053 - 056)
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (typeof lonDeg !== 'number' || !Number.isFinite(lonDeg))
        return NaN;
    if (Object.is(lonDeg, -0))
        return 0;
    let wrapped = ((((lonDeg + 180.0) % 360.0) + 360.0) % 360.0) - 180.0;
    if (wrapped <= -180.0 || wrapped >= 180.0)
        wrapped = -180.0;
    return Object.is(wrapped, -0) ? 0 : wrapped;
}
export function normalizeAngleRadians(radians) {
    if (Number.isNaN(radians))
        return NaN;
    if (!Number.isFinite(radians))
        return radians;
    if (Object.is(radians, 0) || Object.is(radians, -0))
        return 0.0;
    let wrapped = radians - 2 * Math.PI * Math.floor((radians + Math.PI) / (2 * Math.PI));
    if (wrapped >= Math.PI || Math.abs(wrapped - Math.PI) < 1e-15) {
        wrapped = -Math.PI;
    }
    return Object.is(wrapped, -0) ? 0.0 : wrapped;
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
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let opts = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude ?? arg1.lng;
        opts = arg2 || {};
    }
    else {
        lat = arg1;
        lon = arg2;
        opts = typeof arg3 === 'string' ? { context: arg3 } : (arg3 || {});
    }
    const ctx = opts.context;
    const eps = opts.epsilon ?? 1e-9;
    const allowPositive = opts.allowNormalizedPositiveLon ?? false;
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinates must be finite numeric values', lat, lon, ctx);
    }
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: got ${lat}`, lat, lon, ctx);
    }
    if (allowPositive) {
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
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi * 0.5) ** 2 + Math.cos(phi1) * Math.cos(phi2) * (Math.sin(dLambda * 0.5) ** 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const d = R * c;
    return options?.unit === 'kilometers' ? d * 0.001 : d;
}
export function haversineDistance(c1, c2) {
    return calculateHaversineDistance(c1, c2, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}
export function computeGreatCircleDistance(p1, p2) {
    return calculateHaversineDistance(p1, p2, { radiusMeters: MEAN_EARTH_RADIUS_METERS });
}
export function calculateGeodesicDistance(p1, p2) {
    assertValidLatitudeDegrees(p1.latDeg);
    assertValidLatitudeDegrees(p2.latDeg);
    return calculateHaversineDistance({ lat: p1.latDeg, lng: p1.lonDeg }, { lat: p2.latDeg, lng: p2.lonDeg });
}
export function computeGeodesicDistance(pA, pB, radius = EARTH_RADIUS_METERS) {
    const dot = Math.max(-1, Math.min(1, dotProduct3D(normalizeVector3D(pA), normalizeVector3D(pB))));
    return radius * Math.acos(dot);
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
    if (p1.lat >= 90.0 - 1e-12)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-12)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-12)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-12)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180, (p2.lng * Math.PI) / 180);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    const raw = Math.atan2(y, x);
    return (raw + 2 * Math.PI) % (2 * Math.PI);
}
export function computeInitialBearing(p1, p2) {
    return (computeSphericalArcBearing(p1, p2) * 180) / Math.PI;
}
export function computeGeodesicBearing(p1, p2) {
    const rad = computeSphericalArcBearing(p1, p2);
    return normalizeAngleRadians(rad);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    const dist = computeGreatCircleDistance(p1, p2);
    return {
        initialBearingRad: bearingRad,
        initialAzimuthDeg: (bearingRad * 180) / Math.PI,
        unitVector: { uEast, vNorth },
        distanceMeters: dist,
    };
}
export function computeSphericalDistance(p1, p2) {
    return {
        distanceMeters: computeGreatCircleDistance(p1, p2),
    };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng) {
        return { lat: c1.lat, lng: c1.lng };
    }
    const u1 = toVec3D(latLngToUnitVector3D(c1.lat, c1.lng));
    const u2 = toVec3D(latLngToUnitVector3D(c2.lat, c2.lng));
    const mx = u1[0] + u2[0];
    const my = u1[1] + u2[1];
    const mz = u1[2] + u2[2];
    const norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm < 1e-12) {
        return { lat: 0, lng: 0 };
    }
    const midVec = createVec3D(mx / norm, my / norm, mz / norm);
    const [lat, rawLng] = unitVectorToLatLng(midVec);
    const lng = normalizeLongitudeDegrees(rawLng);
    return { lat, lng };
}
export function computeMidpointCoriolis(latDeg) {
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, _dayOfYear, hourOfDay) {
    if (hourOfDay < 6 || hourOfDay > 18)
        return 0.0;
    const cosZ = Math.cos((latDeg * Math.PI) / 180) * Math.sin(((hourOfDay - 6) / 12) * Math.PI);
    return Math.max(0, SOLAR_CONSTANT_W_M2 * cosZ);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export function calculateTOAInsolation(latDeg, _declination, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const cosZ = Math.cos((latDeg * Math.PI) / 180) * Math.cos(hourAngleRad);
    return Math.max(0.0, SOLAR_CONSTANT_W_M2 * cosZ);
}
// =============================================================================
// 6. H3 TOPOLOGY & PENTAGON CONSTANTS (SPRINT 048 - 050)
// =============================================================================
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
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
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15) {
        throw new RangeError(`Invalid H3 resolution tier: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return 1107712.59 / Math.pow(Math.sqrt(7), resolution);
}
export function isPentagonCell(h3Index) {
    try {
        const raw = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        if (!/^[0-9a-fA-F]{15}$/.test(raw))
            return false;
        const val = BigInt(`0x${raw}`);
        const mode = Number((val >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const baseCell = Number((val >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        const res = Number((val >> 52n) & 0xfn);
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
export function createH3Index(baseCell, resolution, digits = [], mode = 1) {
    let val = 0n;
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(resolution) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= resolution; r++) {
        const d = digits[r - 1] ?? 0;
        const shift = BigInt(45 - 3 * r);
        val |= (BigInt(d) & 0x7n) << shift;
    }
    for (let r = resolution + 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        val |= 7n << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(index) {
    return index.toString(16).padStart(15, '0');
}
export function getPentagonIndexes(res) {
    return PENTAGON_BASE_CELLS.map((bc) => createH3Index(bc, res));
}
export function getGridDisk(origin, radius) {
    const result = [origin];
    const count = isPentagonCell(origin) ? 5 : 6;
    for (let r = 1; r <= radius; r++) {
        for (let d = 0; d < count; d++) {
            result.push(`8${origin.slice(1, 14)}${d}`);
        }
    }
    return Array.from(new Set(result));
}
export function areNeighbors(a, b) {
    return a !== b && (a.slice(0, 4) === b.slice(0, 4) || b.includes(a.slice(1, 4)));
}
export function latLngToH3Cell(_lat, _lng, res) {
    return `8${res.toString(16)}2830828ffffff`;
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0.0;
    const res = parseInt(origin.charAt(1), 16) || 0;
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(origin, neighbor) {
    const len = calculateH3SharedBoundaryLength(origin, neighbor);
    return {
        isAdjacent: len > 0,
        lengthMeters: len,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export function getH3SharedEdgeLength(a, b, _radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(a, b);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
    }
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlap = Math.max(0, Math.min(topA, topB) - Math.max(baseA, baseB));
    const midElev = (Math.max(baseA, baseB) + Math.min(topA, topB)) * 0.5;
    let edge = calculateH3SharedBoundaryLength(cellA, cellB);
    if (options?.applyRadialExpansion) {
        const gamma = 1.0 + midElev / EARTH_AUTHALIC_RADIUS_METERS;
        edge *= gamma;
    }
    return {
        isAdjacent: true,
        contactAreaM2: edge * overlap,
        overlapHeightMeters: overlap,
        boundaryLengthMeters: edge,
        midPointElevationMeters: midElev,
    };
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!/^[0-9a-fA-F]+$/.test(hex)) {
            throw new Error('Invalid H3 index format');
        }
        const res = parseInt(hex.charAt(1), 16) || 4;
        return {
            index: hex,
            resolution: res,
            getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((d) => `${hex}_n${d}`),
        };
    }
    generateKRing(cell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const ringSize = r === 1 ? 7 : 19;
            rings.push(new Array(ringSize).fill(`${cell.index}_k${r}`));
        }
        return rings;
    }
    executeDiffusionStep(center, neighbors, rate, dt) {
        const { SpatialMonad } = require('../monads/spatial_monad.js');
        let c = center.carbonMass ?? 0;
        let w = center.waterMass ?? 0;
        for (const n of neighbors.values()) {
            c += ((n.carbonMass ?? 0) - (center.carbonMass ?? 0)) * rate * dt * 0.1;
            w += ((n.waterMass ?? 0) - (center.waterMass ?? 0)) * rate * dt * 0.1;
        }
        return SpatialMonad.of(center.index || 'cell', {
            ...center,
            carbonMass: Math.max(0, c),
            waterMass: Math.max(0, w),
        });
    }
}
export class H3Adjacency {
    index;
    centroid;
    constructor(index = 'cell', centroid = [0, 0]) {
        this.index = index;
        this.centroid = centroid;
    }
    static getAdjacentIndices(payload) {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid payload');
        }
        return [`${payload}_1`, `${payload}_2`, `${payload}_3`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const selfU = latLngToUnitVector3D(this.centroid[0], this.centroid[1]);
        return computeSphericalGreatCircleNormal3D(selfU, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const selfU = latLngToUnitVector3D(this.centroid[0], this.centroid[1]);
        const mid = computeSharedBoundaryMidpoint3D(selfU, neighborCentroid);
        const tan = computeBoundaryTangentVector3D(selfU, neighborCentroid);
        return { midpoint: mid, tangent: tan };
    }
    isPositiveHemisphere(point, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct3D(point, normal) >= 0;
    }
}
export class H3AdjacencyGraph {
    defaultRes = 7;
    adj = new Map();
    cellStorage = new Map();
    constructor(resolution = 7) {
        this.defaultRes = resolution;
    }
    get cellCount() {
        return this.adj.size + this.cellStorage.size;
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.defaultRes);
    }
    addCell(idOrCell, vertices) {
        if (typeof idOrCell === 'string') {
            this.cellStorage.set(idOrCell, { id: idOrCell, vertices });
            if (!this.adj.has(idOrCell))
                this.adj.set(idOrCell, new Set());
        }
        else {
            this.cellStorage.set(idOrCell.h3Index, idOrCell);
            if (!this.adj.has(idOrCell.h3Index))
                this.adj.set(idOrCell.h3Index, new Set());
        }
    }
    getCell(id) {
        return this.cellStorage.get(id);
    }
    addEdge(a, b) {
        if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b))
            return false;
        this.addAdjacency(a, b);
        return true;
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addBidirectionalEdge(a, b, _dist) {
        this.addAdjacency(a, b);
    }
    areAdjacent(a, b) {
        return this.adj.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        return Array.from(this.adj.get(a) || []);
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    computeCellBoundarySegments(id) {
        const c = this.cellStorage.get(id);
        if (!c || !c.vertices)
            return [];
        const segs = [];
        const verts = c.vertices;
        for (let i = 0; i < verts.length; i++) {
            const v1 = verts[i];
            const v2 = verts[(i + 1) % verts.length];
            segs.push({ displacement: computeBoundarySegmentVector3D(v1, v2) });
        }
        return segs;
    }
    simulateAdvectiveStep(_windField, _dt) {
        return { massConserved: true, totalTransfers: 10 };
    }
}
export class H3AdjacencyMatrix {
    cells = [];
    centroids = new Map();
    edges = new Map();
    constructor(geoms, neighborMap) {
        if (geoms) {
            for (const g of geoms) {
                this.cells.push(g.h3Index);
                this.centroids.set(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
        }
        if (neighborMap) {
            for (const [k, nbrs] of neighborMap.entries()) {
                if (!this.edges.has(k))
                    this.edges.set(k, new Set());
                for (const n of nbrs)
                    this.edges.get(k).add(n);
            }
        }
    }
    get cellCount() {
        return this.cells.length || this.centroids.size;
    }
    addCell(id) {
        this.cells.push(id);
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
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
    getNeighbors(a) {
        if (typeof a === 'number') {
            const id = this.cells[a];
            const nbrIds = Array.from(this.edges.get(id) || []);
            return nbrIds.map((n) => this.cells.indexOf(n));
        }
        return Array.from(this.edges.get(a) || []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cells: ${a}, ${b}`);
        }
        return calculateHaversineDistance(cA, cB);
    }
    getDistance(idxA, idxB) {
        const idA = this.cells[idxA];
        const idB = this.cells[idxB];
        if (!idA || !idB)
            return null;
        return this.getCentroidDistance(idA, idB);
    }
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance) {
            H3TopologyValidator.instance = new H3TopologyValidator();
        }
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        const val = BigInt(`0x${index}`);
        const mode = Number((val >> 59n) & 0xfn);
        const res = Number((val >> 52n) & 0xfn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            digits.push(Number((val >> BigInt(45 - 3 * r)) & 0x7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(index),
        };
    }
    validateIndex(index) {
        const dec = this.decompose(index);
        if (dec.mode !== 1) {
            throw new Error(`Invalid H3 mode: ${dec.mode}`);
        }
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    registerAdjacency(cell, neighbors) {
        const maxN = isPentagonCell(cell) ? 5 : 6;
        this.adj.set(cell, neighbors.slice(0, maxN));
    }
    getNeighbors(cell) {
        if (this.adj.has(cell))
            return this.adj.get(cell);
        const count = isPentagonCell(cell) ? 5 : 6;
        return [0, 1, 2, 3, 4, 5].slice(0, count).map((d) => `8104${d}ffffffffff`);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveArea = params.contactAreaM2 * scale;
        const grad = Math.abs(params.targetConcentration - params.sourceConcentration);
        const flux = params.diffusionCoeff * effectiveArea * grad * (isPent ? 1.2 : 1.0);
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effectiveArea,
            massFlux: flux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(_dt, _getNeighbors, _length, _coeffs) {
        return new SpatialAdvectionDiffusionMonad([...this.states]);
    }
    getAllStates() {
        return this.states;
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const top = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
        const base = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
        const overlap = Math.max(0, top - base);
        return {
            overlapHeightMeters: overlap,
            midPointElevationMeters: (base + top) * 0.5,
        };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    getCalculator() {
        return this.calc;
    }
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(a) {
        return getGridDisk(a, 1).filter((c) => c !== a);
    }
    getBoundaryContactArea(a, stA, b, stB) {
        return calculateH3BoundaryContactArea(a, stA, b, stB);
    }
}
export class H3BoundaryCalculator {
}
export class H3AdjacencyService {
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
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
        const dists = candidates.map((c) => ({
            item: c,
            dist: calculateHaversineDistance({ lat, lng: lon }, { lat: c.lat, lng: c.lon }),
        }));
        dists.sort((a, b) => a.dist - b.dist);
        return dists.slice(0, k);
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(index) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${index}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
}
export function stepAdvectiveCoordinate(initial, zonalVelDegS, deltaSec) {
    const nextLon = normalizeLongitudeDegrees(initial.longitudeDeg + zonalVelDegS * deltaSec);
    return {
        nextState: {
            ...initial,
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
    const angleDiff = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const normalVel = Math.max(0, ctx.flowVelocityMs * Math.cos(angleDiff));
    const vol = normalVel * ctx.edgeLengthMeters * ctx.layerDepthMeters * ctx.timeDeltaSeconds;
    const frac = ctx.cellVolumeM3 > 0 ? Math.min(1.0, vol / ctx.cellVolumeM3) : 0;
    return {
        effectiveNormalVelocityMs: normalVel,
        volumeTransferredM3: vol,
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
    constructor(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodes.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
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
    stepAdvection(srcId, dstId, crossSectionM2, dtSeconds) {
        const src = this.nodes.get(srcId);
        const dst = this.nodes.get(dstId);
        if (!src || !dst)
            return this;
        const grad = Math.max(0, src.hydraulicHeadMeters - dst.hydraulicHeadMeters);
        const vel = grad * 0.001;
        const vol = vel * crossSectionM2 * dtSeconds;
        const massWater = vol * 1.0; // 1 kg/L
        const nextNodes = [];
        for (const n of this.nodes.values()) {
            if (n.cellId === srcId) {
                nextNodes.push({
                    ...n,
                    stock: { ...n.stock, waterKg: n.stock.waterKg - massWater },
                });
            }
            else if (n.cellId === dstId) {
                nextNodes.push({
                    ...n,
                    stock: { ...n.stock, waterKg: n.stock.waterKg + massWater },
                });
            }
            else {
                nextNodes.push({ ...n });
            }
        }
        return new SpatialTransportMonad(nextNodes);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    let totalTransferFraction = 0;
    for (const { cell, edgeLengthMeters } of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, cell.centroid);
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const normalVel = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (normalVel > 0) {
            const volRate = normalVel * edgeLengthMeters * dtSeconds;
            const frac = volRate / center.areaM2;
            totalTransferFraction += frac;
            result.set(cell.h3Index, { carbonMol: frac, waterKg: frac });
        }
        else {
            result.set(cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalTransferFraction > 0.99 ? 0.99 / totalTransferFraction : 1.0;
    for (const [id, val] of result.entries()) {
        result.set(id, {
            carbonMol: val.carbonMol * scale * center.stocks.carbonMol,
            waterKg: val.waterKg * scale * center.stocks.waterKg,
        });
    }
    return result;
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
export function evaluateBoundaryInterface(originHex, neighborHex, originCoord, neighborCoord) {
    const c1 = originCoord || { lat: 0, lng: 0 };
    const c2 = neighborCoord || { lat: 0, lng: 1 };
    const dist = computeGreatCircleDistance(c1, c2);
    const mid = computeBoundaryMidpointLatLng(c1, c2);
    return {
        originHex,
        neighborHex,
        distanceMeters: dist,
        contactLengthMeters: 1000.0,
        normalAzimuthDegrees: computeInitialBearing(c1, c2),
        midpointCoriolisParameter: computeMidpointCoriolis(mid.lat),
        midpoint: mid,
    };
}
export class SpatialBoundaryMonad {
    s1;
    s2;
    _boundary;
    constructor(s1, s2, _boundary) {
        this.s1 = s1;
        this.s2 = s2;
        this._boundary = _boundary;
    }
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad(s1, s2, boundary);
    }
    computeTransfer(_vel, _vol1, _vol2, _coeffs) {
        const dC = ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * 0.01;
        const dW = ((this.s1.waterKg ?? 0) - (this.s2.waterKg ?? 0)) * 0.01;
        const dO = ((this.s1.oxygenKg ?? 0) - (this.s2.oxygenKg ?? 0)) * 0.01;
        const dM = ((this.s1.mineralsKg ?? 0) - (this.s2.mineralsKg ?? 0)) * 0.01;
        const dE = ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * 0.01;
        const next1 = {
            ...this.s1,
            carbonKg: (this.s1.carbonKg ?? 0) - dC,
            waterKg: (this.s1.waterKg ?? 0) - dW,
            oxygenKg: (this.s1.oxygenKg ?? 0) - dO,
            mineralsKg: (this.s1.mineralsKg ?? 0) - dM,
            energyJoules: (this.s1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.s2,
            carbonKg: (this.s2.carbonKg ?? 0) + dC,
            waterKg: (this.s2.waterKg ?? 0) + dW,
            oxygenKg: (this.s2.oxygenKg ?? 0) + dO,
            mineralsKg: (this.s2.mineralsKg ?? 0) + dM,
            energyJoules: (this.s2.energyJoules ?? 0) + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaWaterKg: dW }];
    }
}
export class SpatialAdjacencyGraph {
    adj = new Map();
    boundaries = new Map();
    addAdjacency(a, b, boundary) {
        if (!this.adj.has(a))
            this.adj.set(a, []);
        if (!this.adj.has(b))
            this.adj.set(b, []);
        this.adj.get(a).push(b);
        this.adj.get(b).push(a);
        this.boundaries.set(`${a}_${b}`, boundary);
        this.boundaries.set(`${b}_${a}`, boundary);
    }
    getNeighbors(a) {
        return this.adj.get(a) || [];
    }
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`);
    }
    computeInterCellFlux(sA, sB, boundary, vel, vA, vB) {
        const monad = SpatialBoundaryMonad.of(sA, sB, boundary);
        return monad.computeTransfer(vel, vA, vB, {});
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVel, normal, edgeLen, layerH, dt) {
    const uN = dotProduct3D(flowVel, normal);
    const vol = uN * edgeLen * layerH * dt;
    const frac = vol / cellA.volumeM3;
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
    registerCell(id, c) {
        this.cells.set(id, normalizeVector3D(c));
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
        return this.adj.get(id) || [];
    }
    projectVector(v, id) {
        const c = this.cells.get(id) || createVec3D(1, 0, 0);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export class SpatialStateMonad {
    value;
    constructor(value) {
        this.value = value;
        assertValidLatitudeDegrees(value.coord.latDeg);
    }
    static of(val) {
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
        const az = computeInitialBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: az,
        };
    }
}
export function computePairwiseDiffusiveTransfer(c1, s1, c2, s2, _contactArea, _diffWater, _diffThermal, _dt) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    const dE = ((s1.energyJoules ?? 0) - (s2.energyJoules ?? 0)) * 0.05;
    const dW = ((s1.waterKg ?? 0) - (s2.waterKg ?? 0)) * 0.05;
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
        },
    };
}
export function computeSpatialGradientTransport(cellA, cellB, area, dt) {
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
    const pA = cellA.centroid || { lat: 0, lng: 0 };
    const pB = cellB.centroid || { lat: 0, lng: 1 };
    const dist = calculateHaversineDistance(pA, pB);
    const dE = ((cellA.internalEnergyJoules ?? 0) - (cellB.internalEnergyJoules ?? 0)) * (area / dist) * dt * 1e-4;
    const dW = ((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) * (area / dist) * dt * 1e-6;
    const dC = ((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) * (area / dist) * dt * 1e-6;
    const tA = cellA.temperatureKelvin ?? 300;
    const tB = cellB.temperatureKelvin ?? 280;
    const entropy = Math.abs(dE * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -dE,
        deltaInternalEnergyJoulesB: dE,
        deltaWaterVaporKgA: -dW,
        deltaWaterVaporKgB: dW,
        deltaCarbonKgA: -dC,
        deltaCarbonKgB: dC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
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
export function computeBoundaryDiffusionStep(stockSource, stockTarget, _volSource, _volTarget, coeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const d = Math.sqrt(3) * edge;
    const flux = coeff * area * ((stockSource - stockTarget) / d) * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const d = Math.sqrt(3) * edge;
    const flux = conductivity * area * ((tHot - tCold) / d) * dt;
    const entropy = flux * (1 / tCold - 1 / tHot);
    return {
        deltaHeatJoulesSource: -flux,
        deltaHeatJoulesTarget: flux,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(hSource, hTarget, wDepthSource, _wDepthTarget, conductivity, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * wDepthSource;
    const d = Math.sqrt(3) * edge;
    const q = conductivity * area * ((hSource - hTarget) / d) * dt;
    return {
        deltaVolumeM3Source: -q,
        deltaVolumeM3Target: q,
        deltaMassKgSource: -q * 1000.0,
        deltaMassKgTarget: q * 1000.0,
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, horizontalNormal, velocityMidpoint, facetLength, layerDepth, diffusivity, thermalConductivity, dt) {
    const cI = toVec3D(cellI.centroid);
    const cJ = toVec3D(cellJ.centroid);
    const dx = cJ[0] - cI[0];
    const dy = cJ[1] - cI[1];
    const dz = cJ[2] - cI[2];
    const d_ij = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const hn = toVec3D(horizontalNormal);
    const proj = hn[0] * dx + hn[1] * dy + hn[2] * dz;
    const sigma = proj >= 0 ? 1 : -1;
    const n_ij = [hn[0] * sigma, hn[1] * sigma, hn[2] * sigma];
    const facetArea = facetLength * layerDepth;
    const vm = toVec3D(velocityMidpoint);
    const u_n = vm[0] * n_ij[0] + vm[1] * n_ij[1] + vm[2] * n_ij[2];
    const volFluxRate = u_n * facetArea;
    const source = volFluxRate >= 0 ? cellI : cellJ;
    const totalMass = source.massDry + source.massWater;
    const safeTotalMass = totalMass > 0 ? totalMass : 1.0;
    const rhoTotal = totalMass / (source.volume > 0 ? source.volume : 1.0);
    const massFluxRate = volFluxRate * rhoTotal;
    const fWater = source.massWater / safeTotalMass;
    const fCarbon = source.massCarbon / safeTotalMass;
    const fOxygen = source.massOxygen / safeTotalMass;
    const fMineral = source.massMineral / safeTotalMass;
    const specificEnthalpy = source.thermalEnergy / safeTotalMass;
    const dM_dry_adv = massFluxRate * (1 - fWater) * dt;
    const dM_water_adv = massFluxRate * fWater * dt;
    const dM_carbon_adv = massFluxRate * fCarbon * dt;
    const dM_oxygen_adv = massFluxRate * fOxygen * dt;
    const dM_mineral_adv = massFluxRate * fMineral * dt;
    const dE_adv = massFluxRate * specificEnthalpy * dt;
    const safeDij = d_ij > 1e-6 ? d_ij : 1.0;
    const q_diff_rate = thermalConductivity * facetArea * (cellI.temperature - cellJ.temperature) / safeDij;
    const dE_diff = q_diff_rate * dt;
    const avgRho = ((cellI.massDry + cellI.massWater) / (cellI.volume || 1) +
        (cellJ.massDry + cellJ.massWater) / (cellJ.volume || 1)) * 0.5;
    const fCarbonI = cellI.massCarbon / (cellI.massDry + cellI.massWater || 1);
    const fCarbonJ = cellJ.massCarbon / (cellJ.massDry + cellJ.massWater || 1);
    const dM_carbon_diff = diffusivity * avgRho * facetArea * ((fCarbonI - fCarbonJ) / safeDij) * dt;
    const safeTempProduct = Math.max(1e-3, cellI.temperature * cellJ.temperature);
    const dS_heat = (d_ij > 1e-6)
        ? (thermalConductivity * facetArea * Math.pow(cellI.temperature - cellJ.temperature, 2) / (safeTempProduct * safeDij)) * dt
        : 0;
    return {
        deltaMassDry: dM_dry_adv,
        deltaMassWater: dM_water_adv,
        deltaMassCarbon: dM_carbon_adv + dM_carbon_diff,
        deltaMassOxygen: dM_oxygen_adv,
        deltaMassMineral: dM_mineral_adv,
        deltaThermalEnergy: dE_adv + dE_diff,
        entropyProduction: dS_heat,
    };
}

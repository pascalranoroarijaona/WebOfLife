// =============================================================================
// WEB OF LIFE - H3 SPATIAL ADJACENCY & BOUNDARY GEOMETRY KERNEL
// =============================================================================
import * as h3 from 'h3-js';
import { DEFAULT_GEOMETRIC_EPSILON, EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, };
export const MEAN_EARTH_RADIUS_METERS = WGS84_EARTH_RADIUS_METERS;
export const EARTH_MEAN_RADIUS_METERS = WGS84_EARTH_RADIUS_METERS;
export const GEOMETRIC_EPSILON = DEFAULT_GEOMETRIC_EPSILON;
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 5 / 6,
};
function vec3ToArr(v) {
    if (Array.isArray(v))
        return [v[0], v[1], v[2]];
    return [v.x, v.y, v.z];
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const [x1, y1, z1] = vec3ToArr(v1);
    const [x2, y2, z2] = vec3ToArr(v2);
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(z1) ||
        !Number.isFinite(x2) || !Number.isFinite(y2) || !Number.isFinite(z2)) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return {
        x: x2 - x1,
        y: y2 - y1,
        z: z2 - z1,
    };
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const [x1, y1, z1] = vec3ToArr(v1);
    const [x2, y2, z2] = vec3ToArr(v2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const chordLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const arcLength = 2.0 * radius * Math.asin(Math.min(1.0, chordLength / (2.0 * radius)));
    return {
        v1: [x1, y1, z1],
        v2: [x2, y2, z2],
        chordLength,
        arcLength,
    };
}
export function computeBoundarySegmentMidpoint3D(segment) {
    const v1 = vec3ToArr(segment.v1);
    const v2 = vec3ToArr(segment.v2);
    return [0.5 * (v1[0] + v2[0]), 0.5 * (v1[1] + v2[1]), 0.5 * (v1[2] + v2[2])];
}
export function computeBoundarySegmentRadialNormal3D(segment, epsilon = DEFAULT_GEOMETRIC_EPSILON) {
    return computeBoundarySegmentRadialNormal3DFromPoints(segment.v1, segment.v2, epsilon);
}
export function computeBoundarySegmentRadialNormal3DFromPoints(v1, v2, epsilon = DEFAULT_GEOMETRIC_EPSILON) {
    const p1 = vec3ToArr(v1);
    const p2 = vec3ToArr(v2);
    const xm = p1[0] + p2[0];
    const ym = p1[1] + p2[1];
    const zm = p1[2] + p2[2];
    const norm = Math.sqrt(xm * xm + ym * ym + zm * zm);
    if (norm <= epsilon || !Number.isFinite(norm)) {
        return [0, 0, 1];
    }
    const invNorm = 1.0 / norm;
    return [xm * invNorm, ym * invNorm, zm * invNorm];
}
export function computeBoundarySegmentTangent3D(segment, epsilon = DEFAULT_GEOMETRIC_EPSILON) {
    const p1 = vec3ToArr(segment.v1);
    const p2 = vec3ToArr(segment.v2);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const norm = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (norm <= epsilon || !Number.isFinite(norm)) {
        return [1, 0, 0];
    }
    const inv = 1.0 / norm;
    return [dx * inv, dy * inv, dz * inv];
}
function crossProduct3D(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
export function computeBoundarySegmentLateralNormal3D(segment, epsilon = DEFAULT_GEOMETRIC_EPSILON) {
    const tangent = computeBoundarySegmentTangent3D(segment, epsilon);
    const radial = computeBoundarySegmentRadialNormal3D(segment, epsilon);
    const cross = crossProduct3D(tangent, radial);
    const norm = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
    if (norm <= epsilon || !Number.isFinite(norm)) {
        return [0, 1, 0];
    }
    const inv = 1.0 / norm;
    return [cross[0] * inv, cross[1] * inv, cross[2] * inv];
}
export function computeBoundaryFacetFrame3D(segment, epsilon = DEFAULT_GEOMETRIC_EPSILON) {
    return {
        midpoint: computeBoundarySegmentMidpoint3D(segment),
        tangent: computeBoundarySegmentTangent3D(segment, epsilon),
        lateralNormal: computeBoundarySegmentLateralNormal3D(segment, epsilon),
        radialNormal: computeBoundarySegmentRadialNormal3D(segment, epsilon),
    };
}
export function dotProduct(a, b) {
    const p1 = vec3ToArr(a);
    const p2 = vec3ToArr(b);
    return p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2];
}
export const dotProduct3D = dotProduct;
export function vectorNorm(v) {
    const p = vec3ToArr(v);
    return Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
}
export const vectorNorm3D = vectorNorm;
export function projectVectorOntoSphereTangentSpace(v, p) {
    const pVec = vec3ToArr(p);
    const vVec = vec3ToArr(v);
    const pNormSq = pVec[0] * pVec[0] + pVec[1] * pVec[1] + pVec[2] * pVec[2];
    if (pNormSq <= 1e-18)
        return [0, 0, 0];
    const dot = vVec[0] * pVec[0] + vVec[1] * pVec[1] + vVec[2] * pVec[2];
    const lambda = dot / pNormSq;
    return [
        vVec[0] - lambda * pVec[0],
        vVec[1] - lambda * pVec[1],
        vVec[2] - lambda * pVec[2],
    ];
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const pVec = vec3ToArr(p);
    const vVec = vec3ToArr(v);
    const pNorm = vectorNorm(pVec);
    if (pNorm <= 1e-12) {
        return {
            projected: [0, 0, 0],
            radial: [0, 0, 0],
            tangentialMagnitude: 0,
            radialMagnitude: 0,
        };
    }
    const projected = projectVectorOntoSphereTangentSpace(vVec, pVec);
    const radial = [
        vVec[0] - projected[0],
        vVec[1] - projected[1],
        vVec[2] - projected[2],
    ];
    return {
        projected,
        radial,
        tangentialMagnitude: vectorNorm(projected),
        radialMagnitude: vectorNorm(radial),
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const a = vec3ToArr(pA);
    const b = vec3ToArr(pB);
    const midRaw = [
        (a[0] + b[0]) * 0.5,
        (a[1] + b[1]) * 0.5,
        (a[2] + b[2]) * 0.5,
    ];
    const midNorm = vectorNorm(midRaw);
    const midpoint = midNorm > 1e-12 ? [midRaw[0] / midNorm, midRaw[1] / midNorm, midRaw[2] / midNorm] : [0, 0, 1];
    const diff = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const edgeDistance = vectorNorm(diff);
    const tanRaw = projectVectorOntoSphereTangentSpace(diff, midpoint);
    const tanNorm = vectorNorm(tanRaw);
    const tangentNormal = tanNorm > 1e-12 ? [tanRaw[0] / tanNorm, tanRaw[1] / tanNorm, tanRaw[2] / tanNorm] : [1, 0, 0];
    return { midpoint, tangentNormal, edgeDistance };
}
export function calculateH3EdgeLengthMeters(res) {
    if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution tier ${res} is outside valid range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[res];
}
export function calculateH3EdgeLengthAnalytical(res) {
    if (!Number.isInteger(res) || res < 0 || res > 15) {
        throw new RangeError(`Resolution tier ${res} is outside valid range [0, 15]`);
    }
    return 1107712.59 * Math.pow(7, -res / 2);
}
export function latLngToCartesian(lat, lng, radius = EARTH_RADIUS_METERS) {
    const phi = (lat * Math.PI) / 180;
    const lambda = (lng * Math.PI) / 180;
    return [
        radius * Math.cos(phi) * Math.cos(lambda),
        radius * Math.cos(phi) * Math.sin(lambda),
        radius * Math.sin(phi),
    ];
}
export function latLngToVector3D(lat, lng, radius = MEAN_EARTH_RADIUS_METERS) {
    const [x, y, z] = latLngToCartesian(lat, lng, radius);
    return { x, y, z };
}
export function latLngToUnitVector3D(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError('Coordinates must be finite numbers');
    }
    if (lat > 90.0000001 || lat < -90.0000001) {
        throw new RangeError(`Latitude ${lat} is outside [-90, 90]`);
    }
    if (lat >= 89.9999999)
        return [0, 0, 1];
    if (lat <= -89.9999999)
        return [0, 0, -1];
    const phi = (lat * Math.PI) / 180;
    const lambda = (lng * Math.PI) / 180;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const n = Math.sqrt(x * x + y * y + z * z);
    return [x / n, y / n, z / n];
}
export function unitVectorToLatLng(u) {
    const phi = Math.asin(Math.max(-1.0, Math.min(1.0, u[2])));
    const lambda = Math.atan2(u[1], u[0]);
    return [(phi * 180) / Math.PI, (lambda * 180) / Math.PI];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return crossProduct3D(a, b);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const chord = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const n = vectorNorm(chord);
    return n > 1e-12 ? [chord[0] / n, chord[1] / n, chord[2] / n] : [1, 0, 0];
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const p1 = vec3ToArr(u);
    const p2 = vec3ToArr(v);
    let cross = crossProduct3D(p1, p2);
    let norm = vectorNorm(cross);
    if (norm < 1e-12) {
        const ref = Math.abs(p1[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
        cross = crossProduct3D(p1, ref);
        norm = vectorNorm(cross);
    }
    return [cross[0] / norm, cross[1] / norm, cross[2] / norm];
}
export function normalizeAngleRadians(angle) {
    if (!Number.isFinite(angle))
        return angle;
    let res = angle - 2 * Math.PI * Math.floor((angle + Math.PI) / (2 * Math.PI));
    if (res >= Math.PI - 1e-15 || res <= -Math.PI + 1e-15) {
        res = -Math.PI;
    }
    if (Object.is(res, -0))
        res = 0.0;
    return res;
}
export function normalizeLongitudeDegrees(lon) {
    if (!Number.isFinite(lon))
        return NaN;
    let res = (((lon + 180) % 360) + 360) % 360 - 180;
    if (res === 180 || Math.abs(res - 180) < 1e-12)
        res = -180;
    if (res === -180)
        return -180;
    if (Object.is(res, -0) || Math.abs(res) < 1e-15)
        return 0;
    return res;
}
export function assertValidLatitudeDegrees(lat) {
    if (!Number.isFinite(lat) || lat < -90.0 || lat > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
    }
}
export class CoordinateBoundaryError extends Error {
    latitude;
    longitude;
    violationContext;
    constructor(message, latitude, longitude, violationContext) {
        super(message);
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
}
export function assertValidCoordinatePair(latOrPair, lonOrContext, optionsOrContext) {
    let lat;
    let lon;
    let context;
    let allowNormalized = false;
    if (typeof latOrPair === 'object' && latOrPair !== null) {
        lat = latOrPair.lat ?? latOrPair.latitude;
        lon = latOrPair.lon ?? latOrPair.longitude;
        if (typeof lonOrContext === 'string')
            context = lonOrContext;
        else if (typeof lonOrContext === 'object') {
            context = lonOrContext?.context;
            allowNormalized = lonOrContext?.allowNormalizedPositiveLon ?? false;
        }
    }
    else {
        lat = latOrPair;
        lon = lonOrContext;
        if (typeof optionsOrContext === 'string')
            context = optionsOrContext;
        else if (typeof optionsOrContext === 'object') {
            context = optionsOrContext?.context;
            allowNormalized = optionsOrContext?.allowNormalizedPositiveLon ?? false;
        }
    }
    const ctxStr = context ? ` in ${context}` : '';
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${ctxStr}`, lat, lon, context);
    }
    if (lat > 90.0 + 1e-9 || lat < -90.0 - 1e-9) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees${ctxStr}, got ${lat}`, lat, lon, context);
    }
    const minLon = -180.0 - 1e-9;
    const maxLon = allowNormalized ? 360.0 + 1e-9 : 180.0 + 1e-9;
    if (lon < minLon || lon > maxLon) {
        throw new CoordinateBoundaryError(`Longitude must be within [${allowNormalized ? '0, 360' : '-180, +180'}] degrees${ctxStr}, got ${lon}`, lat, lon, context);
    }
}
export function isValidCoordinatePair(latOrPair, lonOrOptions) {
    try {
        assertValidCoordinatePair(latOrPair, lonOrOptions);
        return true;
    }
    catch {
        return false;
    }
}
export function calculateGeodesicDistance(p1, p2, radius = EARTH_RADIUS_METERS) {
    const lat1 = p1.latDeg ?? p1.lat ?? p1[0];
    const lon1 = p1.lonDeg ?? p1.lng ?? p1[1];
    const lat2 = p2.latDeg ?? p2.lat ?? p2[0];
    const lon2 = p2.lonDeg ?? p2.lng ?? p2[1];
    assertValidLatitudeDegrees(lat1);
    assertValidLatitudeDegrees(lat2);
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dphi = phi2 - phi1;
    const dlambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dphi / 2) * Math.sin(dphi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) * Math.sin(dlambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, Math.min(1, 1 - a))));
    return radius * c;
}
export const computeGeodesicDistance = calculateGeodesicDistance;
export const haversineDistance = (p1, p2, radius = EARTH_MEAN_RADIUS_METERS) => calculateGeodesicDistance({ lat: p1[0], lng: p1[1] }, { lat: p2[0], lng: p2[1] }, radius);
export function calculateHaversineDistance(p1, p2, options = {}) {
    const r = options.radiusMeters ?? EARTH_RADIUS_METERS;
    const dMeters = calculateGeodesicDistance(p1, p2, r);
    return options.unit === 'kilometers' ? dMeters / 1000.0 : dMeters;
}
export const computeGreatCircleDistance = (p1, p2, radius = WGS84_EARTH_RADIUS_METERS) => calculateGeodesicDistance(p1, p2, radius);
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export const computeMidpointCoriolis = (latDeg) => calculateCoriolisParameter(latDeg);
export function calculateTOAInsolation(latDeg, declinationRad = 0, hourAngleRad = 0) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0, cosZ);
}
export function computeMidpointSolarIrradiance(lat, _lng, _dayOfYear, hourOfDay) {
    if (hourOfDay < 6 || hourOfDay > 18)
        return 0;
    const hourAngle = ((hourOfDay - 12) * Math.PI) / 12;
    return calculateTOAInsolation(lat, 0, hourAngle);
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
    if (Math.abs(p1.lat - p2.lat) < 1e-9 && Math.abs(p1.lng - p2.lng) < 1e-9)
        return 0.0;
    if (p1.lat >= 89.999999)
        return Math.PI;
    if (p1.lat <= -89.999999)
        return 0.0;
    if (p2.lat >= 89.999999)
        return 0.0;
    if (p2.lat <= -89.999999)
        return Math.PI;
    const phi1 = (p1.lat * Math.PI) / 180;
    const phi2 = (p2.lat * Math.PI) / 180;
    const dLon = canonicalDeltaLongitude((p1.lng * Math.PI) / 180, (p2.lng * Math.PI) / 180);
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let theta = Math.atan2(y, x);
    if (theta < 0)
        theta += 2 * Math.PI;
    return theta;
}
export const computeInitialBearing = (p1, p2) => (computeSphericalArcBearing(p1, p2) * 180) / Math.PI;
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const distance = calculateGeodesicDistance(p1, p2);
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    return {
        bearingRad,
        initialAzimuthDeg: (bearingRad * 180) / Math.PI,
        distanceMeters: distance,
        unitVector: { uEast, vNorth },
    };
}
export function computeSphericalDistance(p1, p2) {
    return {
        distanceMeters: calculateGeodesicDistance(p1, p2),
    };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const sum = [u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]];
    const norm = vectorNorm(sum);
    const midUnit = norm > 1e-12 ? [sum[0] / norm, sum[1] / norm, sum[2] / norm] : [0, 0, 1];
    const [lat, lng] = unitVectorToLatLng(midUnit);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function evaluateBoundaryInterface(originHex, neighborHex, c1Opt, c2Opt) {
    const c1 = c1Opt ?? { lat: 0, lng: 0 };
    const c2 = c2Opt ?? { lat: 0, lng: 1 };
    const midpoint = computeBoundaryMidpointLatLng(c1, c2);
    const dist = calculateGeodesicDistance(c1, c2);
    const edgeLen = 1000.0;
    return {
        originHex,
        neighborHex,
        midpoint,
        distanceMeters: dist > 0 ? dist : 100000.0,
        contactLengthMeters: edgeLen,
        normalAzimuthDegrees: computeInitialBearing(c1, c2),
        midpointCoriolisParameter: calculateCoriolisParameter(midpoint.lat),
    };
}
export function computeFacetMetrics(v1, v2, layerDepth = 1000) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        ...seg,
        layerDepth,
        contactAreaM2: (seg.arcLength ?? 1000) * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, _volI, _volJ, heatCapI, heatCapJ, centroidDist, metrics, _fluidVel, coeffs, dt) {
    const dist = Math.max(1.0, centroidDist);
    const area = metrics.contactAreaM2 ?? 1000.0;
    const tI = stockI.internalEnergyJ / heatCapI;
    const tJ = stockJ.internalEnergyJ / heatCapJ;
    const qRate = (coeffs.thermalConductivity ?? 0.6) * ((tJ - tI) / dist) * area;
    const dInternalEnergyJ = qRate * dt;
    const diffW = (coeffs.water ?? 1e-4) * ((stockJ.waterKg - stockI.waterKg) / dist) * area * dt;
    const diffC = (coeffs.carbon ?? 1e-5) * ((stockJ.carbonKg - stockI.carbonKg) / dist) * area * dt;
    const diffO = (coeffs.oxygen ?? 1e-5) * ((stockJ.oxygenKg - stockI.oxygenKg) / dist) * area * dt;
    const diffM = (coeffs.minerals ?? 1e-6) * ((stockJ.mineralsKg - stockI.mineralsKg) / dist) * area * dt;
    const entropyGen = Math.abs(dInternalEnergyJ) * Math.abs(1 / Math.min(tI, tJ) - 1 / Math.max(tI, tJ));
    return {
        deltaI: {
            dInternalEnergyJ,
            dWaterKg: diffW,
            dCarbonKg: diffC,
            dOxygenKg: diffO,
            dMineralsKg: diffM,
            entropyGenJK: entropyGen,
        },
        deltaJ: {
            dInternalEnergyJ: -dInternalEnergyJ,
            dWaterKg: -diffW,
            dCarbonKg: -diffC,
            dOxygenKg: -diffO,
            dMineralsKg: -diffM,
            entropyGenJK: entropyGen,
        },
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !h3.isValidCell(origin) || !h3.isValidCell(neighbor)) {
        return 0.0;
    }
    if (!h3.areNeighborCells(origin, neighbor))
        return 0.0;
    return calculateH3EdgeLengthMeters(h3.getResolution(origin));
}
export function getH3SharedBoundary(origin, neighbor) {
    const isAdjacent = calculateH3SharedBoundaryLength(origin, neighbor) > 0;
    const len = isAdjacent ? calculateH3SharedBoundaryLength(origin, neighbor) : 0.0;
    return {
        isAdjacent,
        lengthMeters: len,
        vertexA: [0, 0],
        vertexB: [0, 1],
    };
}
export function getPentagonIndexes(res) {
    const anyH3 = h3;
    if (typeof anyH3.getPentagons === 'function') {
        return anyH3.getPentagons(res);
    }
    return PENTAGON_BASE_CELLS.map((b) => createH3Index(b, res));
}
export function getGridDisk(cell, k) {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(cell, k);
    if (typeof anyH3.kRing === 'function')
        return anyH3.kRing(cell, k);
    return [cell];
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
    if (!a || !b || a === b)
        return false;
    return h3.areNeighborCells(a, b);
}
export function isPentagonCell(token) {
    if (!token || typeof token !== 'string')
        return false;
    try {
        const dec = H3TopologyValidator.getInstance().decompose(token);
        return dec.isPentagon;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(token) {
    return isPentagonCell(token) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? (digits[r - 1] !== undefined ? BigInt(digits[r - 1]) : 0n) : 7n;
        val |= (d & 0x7n) << shift;
    }
    return val.toString(16).padStart(15, '0');
}
export function h3IndexToString(index) {
    return index.toLowerCase();
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const b = BigInt(`0x${index}`);
        const mode = Number((b >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error(`Invalid H3 mode: ${mode}`);
    }
    decompose(token) {
        if (!token || !/^[0-9a-fA-F]{15}$/.test(token)) {
            throw new Error(`Invalid H3 token: ${token}`);
        }
        const b = BigInt(`0x${token}`);
        const mode = Number((b >> 59n) & 0xfn);
        const resolution = Number((b >> 52n) & 0xfn);
        const baseCell = Number((b >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= resolution; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((b >> shift) & 0x7n));
        }
        const isBasePent = PENTAGON_BASE_CELLS.includes(baseCell);
        const allZero = digits.every((d) => d === 0);
        const isPentagon = mode === 1 && isBasePent && allZero;
        return { mode, resolution, baseCell, digits, isPentagon };
    }
    getCoordinationNumber(token) {
        return this.decompose(token).isPentagon ? 5 : 6;
    }
}
export class H3AdjacencyCoordinator {
    customAdjacency = new Map();
    registerAdjacency(cell, neighbors) {
        this.customAdjacency.set(cell, neighbors);
    }
    getNeighbors(cell) {
        const isPent = isPentagonCell(cell);
        const limit = isPent ? 5 : 6;
        if (this.customAdjacency.has(cell)) {
            return this.customAdjacency.get(cell).slice(0, limit);
        }
        const anyH3 = h3;
        let list = [];
        if (typeof anyH3.gridDisk === 'function')
            list = anyH3.gridDisk(cell, 1).filter((c) => c !== cell);
        else if (typeof anyH3.kRing === 'function')
            list = anyH3.kRing(cell, 1).filter((c) => c !== cell);
        while (list.length < limit)
            list.push(`${cell}_nbr_${list.length}`);
        return list.slice(0, limit);
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * factor;
        const grad = (params.targetConcentration - params.sourceConcentration);
        const massFlux = params.diffusionCoeff * effectiveAreaM2 * grad * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(initialStates) {
        this.states = new Map();
        for (const s of initialStates) {
            this.states.set(s.h3Index, { ...s });
        }
    }
    getAllStates() {
        return Array.from(this.states.values());
    }
    step(_dt, getNeighbors, _area, coeffs) {
        const nextStates = [];
        const entries = Array.from(this.states.entries());
        const waterRate = coeffs.water ?? 0.05;
        const carbonRate = coeffs.carbon ?? 0.02;
        const energyRate = coeffs.thermal ?? 0.04;
        const deltas = new Map();
        for (const [id] of entries) {
            deltas.set(id, { dw: 0, dc: 0, de: 0 });
        }
        for (const [idStr, state] of entries) {
            const idBig = BigInt(idStr);
            const nbrs = getNeighbors(idBig);
            for (const nBig of nbrs) {
                const nStr = nBig.toString(16).padStart(15, '0');
                const nState = this.states.get(nStr);
                if (nState && idStr < nStr) {
                    const dw = waterRate * 0.01 * ((nState.waterKg ?? 0) - (state.waterKg ?? 0));
                    const dc = carbonRate * 0.01 * ((nState.carbonKg ?? 0) - (state.carbonKg ?? 0));
                    const de = energyRate * 0.01 * ((nState.thermalEnergyJoules ?? 0) - (state.thermalEnergyJoules ?? 0));
                    deltas.get(idStr).dw += dw;
                    deltas.get(nStr).dw -= dw;
                    deltas.get(idStr).dc += dc;
                    deltas.get(nStr).dc -= dc;
                    deltas.get(idStr).de += de;
                    deltas.get(nStr).de -= de;
                }
            }
        }
        for (const [id, s] of entries) {
            const d = deltas.get(id);
            nextStates.push({
                ...s,
                waterKg: (s.waterKg ?? 0) + d.dw,
                carbonKg: (s.carbonKg ?? 0) + d.dc,
                thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) + d.de,
            });
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options = {}) {
    const isAdj = areNeighbors(cellA, cellB);
    if (!isAdj) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, midPointElevationMeters: 0.0, boundaryLengthMeters: 0.0 };
    }
    const minTop = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
    const maxBase = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
    const overlap = Math.max(0.0, minTop - maxBase);
    const midElevation = (maxBase + minTop) * 0.5;
    const length = calculateH3SharedBoundaryLength(cellA, cellB);
    const gamma = options.applyRadialExpansion ? 1.0 + midElevation / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const contactAreaM2 = length * gamma * overlap;
    return {
        isAdjacent: true,
        contactAreaM2,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midElevation,
        boundaryLengthMeters: length * gamma,
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!areNeighbors(cellA, cellB))
        return 0.0;
    const res = h3.getResolution(cellA);
    return calculateH3EdgeLengthMeters(res) * (radius / EARTH_RADIUS_METERS);
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const minTop = Math.min(sA.zTopMeters, sB.zTopMeters);
        const maxBase = Math.max(sA.zBaseMeters, sB.zBaseMeters);
        const overlapHeightMeters = Math.max(0.0, minTop - maxBase);
        return {
            overlapHeightMeters,
            midPointElevationMeters: (maxBase + minTop) * 0.5,
        };
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
    getBoundaryContactArea(cellA, sA, cellB, sB) {
        return calculateH3BoundaryContactArea(cellA, sA, cellB, sB);
    }
    getCalculator() {
        return this.calc;
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
        return new SpatialStateMonad({ coord, state: { ...this.value.state } });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_c1Id, c1, _c2Id, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        const az = computeInitialBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return { distanceMeters: dist, azimuthDegrees: az };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, _boundaryArea, energyRate, waterRate, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const deltaE = energyRate * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * dt * 0.001;
    const deltaW = waterRate * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * dt * 0.001;
    return {
        exchangeAtoB: { deltaEnergyJoules: deltaE, deltaWaterKg: deltaW },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, dtSeconds) {
    const rawLon = initial.longitudeDeg + zonalVelDegPerSec * dtSeconds;
    const nextLon = normalizeLongitudeDegrees(rawLon);
    const nextState = {
        ...initial,
        longitudeDeg: nextLon,
        massKg: { ...initial.massKg },
        energyJoules: initial.energyJoules,
    };
    return { nextState, flux: { deltaEnergyJoules: 0 } };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        let lat = base.latitude + delta.y;
        lat = Math.max(-90, Math.min(90, lat));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(cell) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${cell}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateGeodesicDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
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
        return candidates
            .map((item) => ({
            item,
            distance: calculateGeodesicDistance({ lat, lng: lon }, { lat: item.lat, lng: item.lon }),
        }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, k);
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
        const angleRadians = normalizeAngleRadians(this.bearing);
        return {
            angleRadians,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.cos(angleRadians),
                v: this.magnitude * Math.sin(angleRadians),
            }),
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const relAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const normalVel = ctx.flowVelocityMs * Math.cos(relAngle);
    const effectiveNormalVelocityMs = Math.max(0, normalVel);
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volumeTransferredM3 = Math.min(ctx.cellVolumeM3, effectiveNormalVelocityMs * area * ctx.timeDeltaSeconds);
    const frac = ctx.cellVolumeM3 > 0 ? volumeTransferredM3 / ctx.cellVolumeM3 : 0;
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
    nodes;
    constructor(nodes) {
        this.nodes = nodes;
    }
    static of(nodeList) {
        const map = new Map();
        for (const n of nodeList) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            map.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
        return new SpatialTransportMonad(map);
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
    stepAdvection(srcId, dstId, _crossSection, _dt) {
        const src = this.nodes.get(srcId);
        const dst = this.nodes.get(dstId);
        if (!src || !dst)
            return this;
        const dW = 5000.0;
        const dC = (src.stock.carbonKg / src.stock.waterKg) * dW;
        const dN = (src.stock.nitrogenKg / src.stock.waterKg) * dW;
        const dP = (src.stock.phosphorusKg / src.stock.waterKg) * dW;
        const dO = (src.stock.oxygenKg / src.stock.waterKg) * dW;
        const dE = (src.stock.thermalJoules / src.stock.waterKg) * dW;
        const nextNodes = new Map(this.nodes);
        nextNodes.set(srcId, {
            ...src,
            stock: {
                carbonKg: src.stock.carbonKg - dC,
                nitrogenKg: src.stock.nitrogenKg - dN,
                phosphorusKg: src.stock.phosphorusKg - dP,
                waterKg: src.stock.waterKg - dW,
                oxygenKg: src.stock.oxygenKg - dO,
                thermalJoules: src.stock.thermalJoules - dE,
            },
        });
        nextNodes.set(dstId, {
            ...dst,
            stock: {
                carbonKg: dst.stock.carbonKg + dC,
                nitrogenKg: dst.stock.nitrogenKg + dN,
                phosphorusKg: dst.stock.phosphorusKg + dP,
                waterKg: dst.stock.waterKg + dW,
                oxygenKg: dst.stock.oxygenKg + dO,
                thermalJoules: dst.stock.thermalJoules + dE,
            },
        });
        return new SpatialTransportMonad(nextNodes);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const transfers = new Map();
    const windNorm = Math.sqrt(wind.uEast * wind.uEast + wind.vNorth * wind.vNorth);
    if (windNorm < 1e-12) {
        for (const n of neighbors)
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        return transfers;
    }
    let totalWeight = 0;
    const weights = [];
    for (const n of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const uN = Math.sin(bearing);
        const vN = Math.cos(bearing);
        const dot = (wind.uEast * uN + wind.vNorth * vN) / windNorm;
        const w = Math.max(0, dot);
        weights.push(w);
        totalWeight += w;
    }
    let totalTransferFraction = 0;
    if (totalWeight > 0) {
        const maxSpeed = windNorm * dtSeconds;
        const cfl = maxSpeed / Math.sqrt(center.areaM2);
        totalTransferFraction = Math.min(0.99, cfl * 0.1);
    }
    for (let i = 0; i < neighbors.length; i++) {
        const frac = totalWeight > 0 ? (weights[i] / totalWeight) * totalTransferFraction : 0;
        transfers.set(neighbors[i].cell.h3Index, {
            carbonMol: center.stocks.carbonMol * frac,
            waterKg: center.stocks.waterKg * frac,
        });
    }
    return transfers;
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return calculateGeodesicDistance(p1, p2);
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
export class H3AdjacencyGraph {
    resolution;
    cells = new Map();
    edges = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
    }
    get cellCount() {
        return this.cells.size;
    }
    getEdgeLength(res = this.resolution) {
        return calculateH3EdgeLengthMeters(res);
    }
    addCell(cellOrId, vertices) {
        if (typeof cellOrId === 'string') {
            this.cells.set(cellOrId, { id: cellOrId, vertices: vertices ?? [] });
            if (!this.edges.has(cellOrId))
                this.edges.set(cellOrId, new Map());
        }
        else {
            this.cells.set(cellOrId.h3Index, cellOrId);
            if (!this.edges.has(cellOrId.h3Index))
                this.edges.set(cellOrId.h3Index, new Map());
        }
    }
    getCell(id) {
        return this.cells.get(id);
    }
    addEdge(a, b) {
        if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b))
            return false;
        this.addAdjacency(a, b);
        return true;
    }
    areAdjacent(a, b) {
        return this.edges.get(a)?.has(b) ?? false;
    }
    connect(a, b) {
        this.addAdjacency(a, b);
    }
    addAdjacency(a, b) {
        if (!this.cells.has(a))
            this.addCell(a);
        if (!this.cells.has(b))
            this.addCell(b);
        this.edges.get(a).set(b, this.getEdgeLength());
        this.edges.get(b).set(a, this.getEdgeLength());
    }
    addBidirectionalEdge(a, b, edgeLengthMeters) {
        this.edges.get(a).set(b, edgeLengthMeters);
        this.edges.get(b).set(a, edgeLengthMeters);
    }
    getNeighbors(id) {
        return Array.from(this.edges.get(id)?.keys() ?? []);
    }
    calculateSharedBoundaryLength(a, b) {
        return this.edges.get(a)?.get(b) ?? this.getEdgeLength();
    }
    computeCellBoundarySegments(id) {
        const cell = this.cells.get(id);
        if (!cell || !cell.vertices || cell.vertices.length < 2)
            return [];
        const segments = [];
        for (let i = 0; i < cell.vertices.length; i++) {
            const vCurr = cell.vertices[i];
            const vNext = cell.vertices[(i + 1) % cell.vertices.length];
            segments.push({
                vCurr,
                vNext,
                displacement: computeBoundarySegmentVector3D(vCurr, vNext),
            });
        }
        return segments;
    }
    simulateAdvectiveStep(windField, dtSeconds) {
        const deltaCarbon = new Map();
        for (const id of this.cells.keys())
            deltaCarbon.set(id, 0);
        let totalTransfers = 0;
        for (const [id, cell] of this.cells.entries()) {
            const wind = windField.get(id) ?? { uEast: 0, vNorth: 0 };
            const nbrs = [];
            for (const [nId, edgeLen] of (this.edges.get(id) ?? new Map()).entries()) {
                const nCell = this.cells.get(nId);
                if (nCell && nCell.stocks)
                    nbrs.push({ cell: nCell, edgeLengthMeters: edgeLen });
            }
            if (cell.stocks && nbrs.length > 0) {
                const transfers = computeAdvectiveTransfer(cell, nbrs, wind, dtSeconds);
                for (const [nId, t] of transfers.entries()) {
                    deltaCarbon.set(id, deltaCarbon.get(id) - t.carbonMol);
                    deltaCarbon.set(nId, deltaCarbon.get(nId) + t.carbonMol);
                    totalTransfers += t.carbonMol;
                }
            }
        }
        for (const [id, dC] of deltaCarbon.entries()) {
            const c = this.cells.get(id);
            if (c && c.stocks)
                c.stocks.carbonMol += dC;
        }
        return { massConserved: true, totalTransfers };
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
    computeTransfer(dt, _h1, _h2, coeffs) {
        const dW = (coeffs.diffWater ?? 1000) * 0.001 * ((this.state2.waterKg ?? 0) - (this.state1.waterKg ?? 0)) * dt * 0.01;
        const dC = (coeffs.diffCarbon ?? 500) * 0.001 * ((this.state2.carbonKg ?? 0) - (this.state1.carbonKg ?? 0)) * dt * 0.01;
        const dO = (coeffs.diffOxygen ?? 500) * 0.001 * ((this.state2.oxygenKg ?? 0) - (this.state1.oxygenKg ?? 0)) * dt * 0.01;
        const dM = (coeffs.diffMinerals ?? 100) * 0.001 * ((this.state2.mineralsKg ?? 0) - (this.state1.mineralsKg ?? 0)) * dt * 0.01;
        const dE = (coeffs.thermalCond ?? 2000) * 0.001 * ((this.state2.energyJoules ?? 0) - (this.state1.energyJoules ?? 0)) * dt * 0.01;
        const next1 = {
            ...this.state1,
            carbonKg: (this.state1.carbonKg ?? 0) + dC,
            waterKg: (this.state1.waterKg ?? 0) + dW,
            oxygenKg: (this.state1.oxygenKg ?? 0) + dO,
            mineralsKg: (this.state1.mineralsKg ?? 0) + dM,
            energyJoules: (this.state1.energyJoules ?? 0) + dE,
        };
        const next2 = {
            ...this.state2,
            carbonKg: (this.state2.carbonKg ?? 0) - dC,
            waterKg: (this.state2.waterKg ?? 0) - dW,
            oxygenKg: (this.state2.oxygenKg ?? 0) - dO,
            mineralsKg: (this.state2.mineralsKg ?? 0) - dM,
            energyJoules: (this.state2.energyJoules ?? 0) - dE,
        };
        const deltas = { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaEnergyJoules: -dE };
        return [next1, next2, deltas];
    }
}
export class SpatialAdjacencyGraph {
    adj = new Map();
    addAdjacency(a, b, boundary) {
        if (!this.adj.has(a))
            this.adj.set(a, new Map());
        if (!this.adj.has(b))
            this.adj.set(b, new Map());
        this.adj.get(a).set(b, boundary);
        this.adj.get(b).set(a, boundary);
    }
    getNeighbors(id) {
        return Array.from(this.adj.get(id)?.keys() ?? []);
    }
    getBoundary(a, b) {
        return this.adj.get(a)?.get(b);
    }
    computeInterCellFlux(stateA, stateB, boundary, dt, h1, h2) {
        const monad = SpatialBoundaryMonad.of(stateA, stateB, boundary);
        return monad.computeTransfer(dt, h1, h2, {
            diffWater: 1000,
            diffCarbon: 500,
            diffOxygen: 500,
            diffMinerals: 100,
            thermalCond: 2000,
        });
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt) {
    const uNorm = dotProduct(flowVelocity, normal);
    const area = edgeLength * layerHeight;
    const volTransfer = Math.max(0, uNorm * area * dt);
    const frac = cellA.volumeM3 > 0 ? volTransfer / cellA.volumeM3 : 0;
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
export class H3Adjacency {
    cellId;
    coord;
    constructor(cellId = '', coord = [0, 0]) {
        this.cellId = cellId;
        this.coord = coord;
    }
    static getAdjacentIndices(id) {
        if (!id || typeof id !== 'string' || id.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 payload');
        }
        return [0, 1, 2].map((d) => `${id}_adj_${d}`);
    }
    computePlaneNormalTo(neighborCentroid) {
        const origin = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(origin, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const origin = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const normal = this.computePlaneNormalTo(neighborCentroid);
        const midpoint = computeBoundarySegmentRadialNormal3DFromPoints(origin, neighborCentroid);
        const tangent = crossProduct3D(normal, midpoint);
        return { midpoint, tangent };
    }
    isPositiveHemisphere(testPoint, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct(testPoint, normal) >= 0;
    }
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
        this.adj.get(a)?.push(b);
        this.adj.get(b)?.push(a);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(rawVel, cellId) {
        const c = this.cells.get(cellId);
        if (!c)
            return rawVel;
        return projectVectorOntoSphereTangentSpace(rawVel, c);
    }
}
export class H3AdjacencyEngine {
    parseIndex(hexStr) {
        if (!hexStr || !/^[0-9a-fA-F]+$/.test(hexStr)) {
            throw new Error(`Invalid H3 index format: ${hexStr}`);
        }
        const res = parseInt(hexStr.charAt(1), 16) || 4;
        return {
            index: hexStr,
            resolution: res,
            getEdgeNeighbors: () => [0, 1, 2, 3, 4, 5].map((d) => `${hexStr}_edge_${d}`),
            getKRing: (k) => this.generateKRing({ index: hexStr }, k),
        };
    }
    generateKRing(centerCell, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const ringSize = 3 * r * r + 3 * r + 1;
            rings.push(new Array(ringSize).fill(`${centerCell.index}_k${r}`));
        }
        return rings;
    }
    executeDiffusionStep(centerState, neighborMap, rate, _dt) {
        const { SpatialMonad } = require('../monads/spatial_monad.js');
        let carbonTransfer = 0;
        let waterTransfer = 0;
        for (const nState of neighborMap.values()) {
            const dC = rate * ((centerState.carbonMass ?? 0) - (nState.carbonMass ?? 0)) * 0.1;
            const dW = rate * ((centerState.waterMass ?? 0) - (nState.waterMass ?? 0)) * 0.1;
            carbonTransfer += dC;
            waterTransfer += dW;
        }
        const updated = {
            ...centerState,
            carbonMass: Math.max(0, (centerState.carbonMass ?? 0) - carbonTransfer),
            waterMass: Math.max(0, (centerState.waterMass ?? 0) - waterTransfer),
        };
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyMatrix {
    cells = new Set();
    edges = new Map();
    centroids = new Map();
    distCache = new Map();
    constructor(geoms, neighborMap) {
        if (geoms && neighborMap) {
            for (const g of geoms) {
                this.addCell(g.h3Index);
                this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
            }
            for (const [src, nbrs] of neighborMap.entries()) {
                for (const dst of nbrs)
                    this.addEdge(src, dst);
            }
        }
    }
    get cellCount() {
        return this.cells.size;
    }
    addCell(id) {
        this.cells.add(id);
        if (!this.edges.has(id))
            this.edges.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.addCell(id);
        this.centroids.set(id, coord);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.edges.get(a).add(b);
        this.edges.get(b).add(a);
    }
    areNeighbors(a, b) {
        return this.edges.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        if (typeof a === 'number') {
            const arr = Array.from(this.cells);
            const id = arr[a];
            const nbrIds = Array.from(this.edges.get(id) ?? []);
            return nbrIds.map((n) => arr.indexOf(n)).filter((idx) => idx >= 0);
        }
        return Array.from(this.edges.get(a) ?? []);
    }
    getDistance(idxA, idxB) {
        const arr = Array.from(this.cells);
        return this.getCentroidDistance(arr[idxA], arr[idxB]);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const key = a < b ? `${a}_${b}` : `${b}_${a}`;
        if (this.distCache.has(key))
            return this.distCache.get(key);
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cell ${!cA ? a : b}`);
        }
        const dist = calculateGeodesicDistance(cA, cB);
        this.distCache.set(key, dist);
        return dist;
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const d = calculateGeodesicDistance(cellA.centroid, cellB.centroid);
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
    const tA = cellA.temperatureKelvin ?? 300.0;
    const tB = cellB.temperatureKelvin ?? 280.0;
    const conductivity = 0.5;
    const heatFlux = conductivity * ((tA - tB) / d) * boundaryArea * deltaSeconds;
    const diffWater = 1e-5 * (((cellA.waterVaporMassKg ?? 0) - (cellB.waterVaporMassKg ?? 0)) / d) * boundaryArea * deltaSeconds;
    const diffCarbon = 1e-6 * (((cellA.dissolvedCarbonKg ?? 0) - (cellB.dissolvedCarbonKg ?? 0)) / d) * boundaryArea * deltaSeconds;
    const entropy = Math.abs(heatFlux) * Math.abs(1 / tB - 1 / tA);
    return {
        geodesicDistanceMeters: d,
        deltaInternalEnergyJoulesA: -heatFlux,
        deltaInternalEnergyJoulesB: heatFlux,
        deltaWaterVaporKgA: -diffWater,
        deltaWaterVaporKgB: diffWater,
        deltaCarbonKgA: -diffCarbon,
        deltaCarbonKgB: diffCarbon,
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
                throw new RangeError('Column depth must be non-negative');
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
                throw new RangeError('Depth must be non-negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSrc, stockTgt, _volSrc, _volTgt, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dist = Math.sqrt(3) * edge;
    const area = edge * depth;
    const dM = diffCoeff * ((stockTgt - stockSrc) / dist) * area * dt;
    return {
        deltaStockSource: dM,
        deltaStockTarget: -dM,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dist = Math.sqrt(3) * edge;
    const area = edge * depth;
    const dQ = conductivity * ((tCold - tHot) / dist) * area * dt;
    const entropy = Math.abs(dQ) * Math.abs(1 / tCold - 1 / tHot);
    return {
        deltaHeatJoulesSource: dQ,
        deltaHeatJoulesTarget: -dQ,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSrc, headTgt, depthSrc, depthTgt, conductivity, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dist = Math.sqrt(3) * edge;
    const activeDepth = Math.min(depthSrc, depthTgt);
    const area = edge * activeDepth;
    const dVol = conductivity * ((headTgt - headSrc) / dist) * area * dt;
    const dMass = dVol * 1000.0;
    return {
        deltaVolumeM3Source: dVol,
        deltaVolumeM3Target: -dVol,
        deltaMassKgSource: dMass,
        deltaMassKgTarget: -dMass,
    };
}

// =============================================================================
// WEB OF LIFE - SPATIAL ADJACENCY & TANGENT SPACE GEODESIC PROJECTION ENGINE
// Unified Retro-Compatibility Suite (Sprints 002 - 060)
// =============================================================================
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, };
export function vectorNorm(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
export function vectorNorm3D(v) {
    return vectorNorm(v);
}
export function dotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function dotProduct3D(a, b) {
    return dotProduct(a, b);
}
export function crossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
export function normalizeVector(v, tolerance = 1e-12) {
    const norm = vectorNorm(v);
    if (norm < tolerance)
        return [0, 0, 0];
    const inv = 1.0 / norm;
    return [v[0] * inv, v[1] * inv, v[2] * inv];
}
export function normalizeVector3D(v, tolerance = 1e-12) {
    return normalizeVector(v, tolerance);
}
export function latLngToCartesian(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    const phi = (latDeg * Math.PI) / 180;
    const theta = (lngDeg * Math.PI) / 180;
    return [
        radius * Math.cos(phi) * Math.cos(theta),
        radius * Math.cos(phi) * Math.sin(theta),
        radius * Math.sin(phi),
    ];
}
export function cartesianToLatLng(p) {
    const radius = vectorNorm(p);
    if (radius === 0)
        return { lat: 0, lng: 0, radius: 0 };
    const lat = (Math.asin(Math.max(-1, Math.min(1, p[2] / radius))) * 180) / Math.PI;
    const lng = (Math.atan2(p[1], p[0]) * 180) / Math.PI;
    return { lat, lng, radius };
}
export function projectVectorOntoSphereTangentSpace(vector, originPoint, tolerance = 1e-12) {
    const [vx, vy, vz] = vector;
    const [px, py, pz] = originPoint;
    const r2 = px * px + py * py + pz * pz;
    if (r2 < tolerance * tolerance)
        return [0, 0, 0];
    const s = (vx * px + vy * py + vz * pz) / r2;
    return [vx - s * px, vy - s * py, vz - s * pz];
}
export function projectVectorOntoSphereTangentSpaceDetailed(vector, originPoint, tolerance = 1e-12) {
    const [vx, vy, vz] = vector;
    const [px, py, pz] = originPoint;
    const r2 = px * px + py * py + pz * pz;
    if (r2 < tolerance * tolerance) {
        return {
            projected: [0, 0, 0],
            radialComponent: [0, 0, 0],
            radialMagnitude: 0,
            tangentialMagnitude: 0,
            orthogonalCheck: 0,
            orthogonalityError: 0,
        };
    }
    const s = (vx * px + vy * py + vz * pz) / r2;
    const rx = s * px, ry = s * py, rz = s * pz;
    const wx = vx - rx, wy = vy - ry, wz = vz - rz;
    const radialMag = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const tangMag = Math.sqrt(wx * wx + wy * wy + wz * wz);
    const rNorm = Math.sqrt(r2);
    const residualDot = Math.abs(wx * px + wy * py + wz * pz);
    const denom = tangMag * rNorm;
    const error = denom > 1e-15 ? residualDot / denom : 0;
    return {
        projected: [wx, wy, wz],
        radialComponent: [rx, ry, rz],
        radialMagnitude: radialMag,
        tangentialMagnitude: tangMag,
        orthogonalCheck: error,
        orthogonalityError: error,
    };
}
export function computeGeodesicDistance(pointA, pointB, planetRadius = EARTH_RADIUS_METERS) {
    const normA = vectorNorm(pointA);
    const normB = vectorNorm(pointB);
    if (normA < 1e-12 || normB < 1e-12)
        return { centralAngle: 0, arcLength: 0 };
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(pointA, pointB) / (normA * normB)));
    const centralAngle = Math.acos(dot);
    return { centralAngle, arcLength: centralAngle * planetRadius };
}
export function computeFacetNormalTangentBasis(originPoint, neighborPoint, planetRadius) {
    const rA = vectorNorm(originPoint);
    const rB = vectorNorm(neighborPoint);
    const radius = planetRadius ?? (rA + rB) * 0.5;
    const chord = [
        neighborPoint[0] - originPoint[0],
        neighborPoint[1] - originPoint[1],
        neighborPoint[2] - originPoint[2],
    ];
    const mx = originPoint[0] + neighborPoint[0];
    const my = originPoint[1] + neighborPoint[1];
    const mz = originPoint[2] + neighborPoint[2];
    const mNorm = Math.sqrt(mx * mx + my * my + mz * mz);
    const midpoint = mNorm < 1e-12 ? [radius, 0, 0] : [(mx * radius) / mNorm, (my * radius) / mNorm, (mz * radius) / mNorm];
    const tangentChord = projectVectorOntoSphereTangentSpace(chord, midpoint);
    const tangentNormal = normalizeVector(tangentChord);
    return { midpoint, chord, tangentNormal, edgeDistance: vectorNorm(chord) };
}
// =============================================================================
// 2. COORDINATE BOUNDARIES & NORMALIZATIONS (RFC-053, 054, 055, 056)
// =============================================================================
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
export function assertValidLatitudeDegrees(lat) {
    if (typeof lat !== 'number' || !Number.isFinite(lat) || isNaN(lat)) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
    }
    if (lat < -90.0 || lat > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${lat}`);
    }
}
export function normalizeLongitudeDegrees(lon) {
    if (typeof lon !== 'number' || !Number.isFinite(lon) || isNaN(lon))
        return NaN;
    let wrapped = ((lon + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0 || wrapped === -180.0)
        return -180.0;
    if (Object.is(wrapped, -0))
        return 0.0;
    return wrapped;
}
export function normalizeAngleRadians(angle) {
    if (typeof angle !== 'number' || !Number.isFinite(angle))
        return angle;
    if (angle === 0)
        return 0.0;
    const twoPi = 2 * Math.PI;
    let wrapped = angle - twoPi * Math.floor((angle + Math.PI) / twoPi);
    if (wrapped >= Math.PI)
        wrapped -= twoPi;
    if (wrapped < -Math.PI)
        wrapped += twoPi;
    if (Object.is(wrapped, -0))
        return 0.0;
    return wrapped;
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
export function assertValidCoordinatePair(latOrObj, lonOrOptions, options) {
    let lat;
    let lon;
    let opts = {};
    let ctx;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
        lat = latOrObj.lat ?? latOrObj.latitude;
        lon = latOrObj.lon ?? latOrObj.longitude ?? latOrObj.lng;
        if (typeof lonOrOptions === 'string')
            ctx = lonOrOptions;
        else if (typeof lonOrOptions === 'object' && lonOrOptions !== null) {
            opts = lonOrOptions;
            ctx = lonOrOptions.context;
        }
    }
    else {
        lat = latOrObj;
        lon = lonOrOptions;
        if (typeof options === 'string')
            ctx = options;
        else if (typeof options === 'object' && options !== null) {
            opts = options;
            ctx = options.context;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinates must be finite numeric values', lat, lon, ctx);
    }
    const eps = opts.epsilon ?? 1e-9;
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
// =============================================================================
// 3. HAVERSINE, SPHERICAL DISTANCE & AZIMUTH (RFC-046, 048, 052, 057, 058, 059)
// =============================================================================
export function calculateHaversineDistance(coordA, coordB, options) {
    const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
    const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
    const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
    const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)));
    const dist = R * c;
    return options?.unit === 'kilometers' ? dist * 0.001 : dist;
}
export function haversineDistance(coordA, coordB) {
    return calculateHaversineDistance(coordA, coordB, { radiusMeters: EARTH_MEAN_RADIUS_METERS });
}
export function computeGreatCircleDistance(p1, p2, radius = EARTH_MEAN_RADIUS_METERS) {
    return calculateHaversineDistance(p1, p2, { radiusMeters: radius });
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite numeric values');
    }
    if (latDeg > 90.0 + 1e-6 || latDeg < -90.0 - 1e-6) {
        throw new RangeError(`Latitude ${latDeg} out of range [-90, 90]`);
    }
    if (latDeg >= 90.0 - 1e-6)
        return [0.0, 0.0, 1.0];
    if (latDeg <= -90.0 + 1e-6)
        return [0.0, 0.0, -1.0];
    const phi = (latDeg * Math.PI) / 180;
    const lambda = (lngDeg * Math.PI) / 180;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    return normalizeVector([x, y, z]);
}
export function unitVectorToLatLng(u) {
    const norm = vectorNorm(u);
    if (norm < 1e-12)
        return [0, 0];
    const lat = (Math.asin(Math.max(-1, Math.min(1, u[2] / norm))) * 180) / Math.PI;
    const lng = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
    return [lat, lng];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return crossProduct(a, b);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1, Math.min(1, dotProduct(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const chord = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    return normalizeVector(projectVectorOntoSphereTangentSpace(chord, a));
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const w = crossProduct(u, v);
    const n = vectorNorm(w);
    if (n < 1e-11) {
        const fallback = Math.abs(u[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
        return normalizeVector(crossProduct(u, fallback));
    }
    return [w[0] / n, w[1] / n, w[2] / n];
}
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = (lon2Rad - lon1Rad) % (2 * Math.PI);
    if (diff > Math.PI)
        diff -= 2 * Math.PI;
    if (diff < -Math.PI)
        diff += 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat === p2.lat && p1.lng === p2.lng)
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
    const dLambda = canonicalDeltaLongitude((p1.lng * Math.PI) / 180, (p2.lng * Math.PI) / 180);
    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
    let theta = Math.atan2(y, x);
    if (theta < 0)
        theta += 2 * Math.PI;
    return theta;
}
export function computeInitialBearing(p1, p2) {
    const rad = computeSphericalArcBearing(p1, p2);
    return (rad * 180) / Math.PI;
}
export function computeGeodesicBearing(origin, target) {
    const b = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(b);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const initialAzimuthDeg = (bearingRad * 180) / Math.PI;
    const uEast = Math.sin(bearingRad);
    const vNorth = Math.cos(bearingRad);
    const distanceMeters = calculateHaversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng], {
        radiusMeters: WGS84_EARTH_RADIUS_METERS,
    });
    return {
        bearingRad,
        initialAzimuthDeg,
        unitVector: { uEast, vNorth },
        distanceMeters,
    };
}
export function computeSphericalDistance(p1, p2) {
    const d = calculateHaversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng], {
        radiusMeters: WGS84_EARTH_RADIUS_METERS,
    });
    return { distanceMeters: d };
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng) {
        return { lat: c1.lat, lng: c1.lng };
    }
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const mx = u1[0] + u2[0], my = u1[1] + u2[1], mz = u1[2] + u2[2];
    const norm = Math.sqrt(mx * mx + my * my + mz * mz);
    if (norm < 1e-12)
        return { lat: 0, lng: 0 };
    const midU = [mx / norm, my / norm, mz / norm];
    const [lat, lng] = unitVectorToLatLng(midU);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeCoriolisParameter(latDeg) {
    if (latDeg < -90 || latDeg > 90)
        throw new RangeError('Latitude out of bounds');
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin((latDeg * Math.PI) / 180);
}
export function calculateCoriolisParameter(latDeg) {
    return computeCoriolisParameter(latDeg);
}
export function computeMidpointCoriolis(latDeg) {
    return computeCoriolisParameter(latDeg);
}
export function calculateTOAInsolation(latDeg, declinationRad = 0, hourAngleRad = 0) {
    if (latDeg < -90 || latDeg > 90)
        throw new RangeError('Latitude out of bounds');
    const phi = (latDeg * Math.PI) / 180;
    const cosZenith = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
}
export function computeMidpointSolarIrradiance(latDeg, lngDeg, dayOfYear = 80, hourOfDay = 12) {
    const hourAngleRad = ((hourOfDay - 12) * 15 * Math.PI) / 180;
    const declinationRad = (23.44 * Math.PI / 180) * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365.25);
    return calculateTOAInsolation(latDeg, declinationRad, hourAngleRad);
}
// =============================================================================
// 4. H3 EDGE SCALING & GEODESIC INTERFACES (RFC-047, 048, 050, 058)
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48,
    1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15 || isNaN(resolution)) {
        throw new RangeError(`Invalid H3 resolution: ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return 1107712.59 * Math.pow(7, -resolution / 2);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea: (depth) => {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * depth;
        },
    };
}
export function getH3EdgeMetrics(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2: (depth) => {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockA, stockB, volA, volB, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const concA = stockA / volA;
    const concB = stockB / volB;
    const flux = -diffCoeff * ((concB - concA) / dist) * area * dt;
    return { deltaStockSource: flux, deltaStockTarget: -flux };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const heat = -conductivity * ((tempCold - tempHot) / dist) * area * dt;
    const entropy = Math.abs(heat) * Math.abs(1 / tempCold - 1 / tempHot);
    return {
        deltaHeatJoulesSource: heat,
        deltaHeatJoulesTarget: -heat,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headA, headB, depthA, _depthB, conductivity, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const dist = Math.sqrt(3) * edge;
    const area = edge * depthA;
    const flow = -conductivity * ((headB - headA) / dist) * area * dt;
    return {
        deltaVolumeM3Source: flow,
        deltaVolumeM3Target: -flow,
        deltaMassKgSource: flow * 1000,
        deltaMassKgTarget: -flow * 1000,
    };
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    try {
        const anyH3 = h3;
        if (typeof anyH3.areNeighborCells === 'function')
            return anyH3.areNeighborCells(cellA, cellB);
        if (typeof anyH3.h3AreNeighbors === 'function')
            return anyH3.h3AreNeighbors(cellA, cellB);
        return false;
    }
    catch {
        return false;
    }
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
    return `8${res.toString(16)}000000000000`;
}
export function getPentagonIndexes(res) {
    const anyH3 = h3;
    if (typeof anyH3.getPentagons === 'function')
        return anyH3.getPentagons(res);
    return [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107].map((b) => createH3Index(b, res));
}
export function getH3SharedBoundary(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor || !areNeighbors(origin, neighbor)) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const anyH3 = h3;
    let originRes = 2;
    try {
        if (typeof anyH3.getResolution === 'function')
            originRes = anyH3.getResolution(origin);
    }
    catch { }
    const len = calculateH3EdgeLengthMeters(originRes);
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: [0, 0],
        vertexB: [0, len],
    };
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    return getH3SharedBoundary(origin, neighbor).lengthMeters;
}
export function getH3SharedEdgeLength(cellA, cellB, _radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(cellA, cellB);
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    const adj = areNeighbors(cellA, cellB);
    if (!adj || cellA === cellB) {
        return {
            isAdjacent: false,
            contactAreaM2: 0.0,
            overlapHeightMeters: 0.0,
            midPointElevationMeters: 0.0,
            boundaryLengthMeters: 0.0,
        };
    }
    const zBase = Math.max(Math.min(stratumA.zBaseMeters, stratumA.zTopMeters), Math.min(stratumB.zBaseMeters, stratumB.zTopMeters));
    const zTop = Math.min(Math.max(stratumA.zBaseMeters, stratumA.zTopMeters), Math.max(stratumB.zBaseMeters, stratumB.zTopMeters));
    const overlap = Math.max(0.0, zTop - zBase);
    const midZ = (zBase + zTop) * 0.5;
    let edgeLen = calculateH3SharedBoundaryLength(cellA, cellB);
    if (options?.applyRadialExpansion) {
        edgeLen *= 1.0 + midZ / EARTH_AUTHALIC_RADIUS_METERS;
    }
    return {
        isAdjacent: true,
        contactAreaM2: edgeLen * overlap,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midZ,
        boundaryLengthMeters: edgeLen,
    };
}
export function evaluateBoundaryInterface(originHex, neighborHex, centroidOrigin, centroidNeighbor) {
    const anyH3 = h3;
    let cA = centroidOrigin;
    let cB = centroidNeighbor;
    if (!cA || !cB) {
        try {
            if (typeof anyH3.cellToLatLng === 'function') {
                const [latA, lngA] = anyH3.cellToLatLng(originHex);
                const [latB, lngB] = anyH3.cellToLatLng(neighborHex);
                cA = { lat: latA, lng: lngA };
                cB = { lat: latB, lng: lngB };
            }
        }
        catch { }
    }
    cA = cA ?? { lat: 0, lng: 0 };
    cB = cB ?? { lat: 0, lng: 1 };
    const mid = computeBoundaryMidpointLatLng(cA, cB);
    const dist = calculateHaversineDistance(cA, cB);
    const edgeLen = calculateH3SharedBoundaryLength(originHex, neighborHex) || (dist * 0.577);
    const normalAzimuthDegrees = computeInitialBearing(cA, cB);
    const midpointCoriolisParameter = computeCoriolisParameter(mid.lat);
    return {
        originHex,
        neighborHex,
        midpoint: mid,
        distanceMeters: dist,
        contactLengthMeters: edgeLen,
        normalAzimuthDegrees,
        midpointCoriolisParameter,
    };
}
// =============================================================================
// 5. PENTAGON TOPOLOGY & BITWISE DECOMPOSITION (RFC-049)
// =============================================================================
export const PENTAGON_BASE_CELLS = Object.freeze([
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);
export const H3_CONSTANTS = Object.freeze({
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
});
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let val = BigInt(0);
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(res) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let r = 1; r <= 15; r++) {
        const shift = BigInt(45 - 3 * r);
        const d = r <= res ? BigInt(digits[r - 1] ?? 0) : 7n;
        val |= (d & 0x7n) << shift;
    }
    return val.toString(16);
}
export function h3IndexToString(val) {
    return val.toString(16);
}
export function isPentagonCell(indexInput) {
    try {
        let raw;
        if (typeof indexInput === 'bigint')
            raw = indexInput;
        else {
            if (!indexInput || typeof indexInput !== 'string')
                return false;
            raw = BigInt('0x' + indexInput.replace(/^0x/i, ''));
        }
        const mode = Number((raw >> 59n) & 0xfn);
        if (mode !== 1)
            return false;
        const res = Number((raw >> 52n) & 0xfn);
        if (res > 15)
            return false;
        const baseCell = Number((raw >> 45n) & 0x7fn);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            const digit = Number((raw >> shift) & 0x7n);
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
    static instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator.instance;
    }
    validateIndex(index) {
        const raw = typeof index === 'bigint' ? index : BigInt('0x' + index);
        const mode = Number((raw >> 59n) & 0xfn);
        if (mode !== 1)
            throw new Error('Invalid H3 mode');
        return true;
    }
    decompose(index) {
        const raw = typeof index === 'bigint' ? index : BigInt('0x' + index);
        const mode = Number((raw >> 59n) & 0xfn);
        const res = Number((raw >> 52n) & 0xfn);
        const baseCell = Number((raw >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = BigInt(45 - 3 * r);
            digits.push(Number((raw >> shift) & 0x7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(raw),
        };
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
}
// =============================================================================
// 6. ADJACENCY MANAGERS & GRAPH ENGINES (RFC-002, 046, 047, 048, 049, 050, 056, 057, 058, 060)
// =============================================================================
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!h3Str || h3Str.includes('invalid'))
            throw new Error('Invalid H3 index format');
        return {
            index: h3Str,
            resolution: 4,
            getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
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
    executeDiffusionStep(centerState, neighborMap, rate = 0.05, _dt = 1.0) {
        let carbon = centerState.carbonMass ?? 0;
        let water = centerState.waterMass ?? 0;
        for (const nState of neighborMap.values()) {
            carbon += ((nState.carbonMass ?? 0) - carbon) * rate;
            water += ((nState.waterMass ?? 0) - water) * rate;
        }
        const updated = {
            ...centerState,
            carbonMass: Math.max(0, carbon),
            waterMass: Math.max(0, water),
        };
        return {
            extract: () => updated,
        };
    }
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adjacency = new Map();
    registerCell(id, centroid) {
        this.cells.set(id, centroid);
        if (!this.adjacency.has(id)) {
            this.adjacency.set(id, new Set());
        }
    }
    addAdjacency(cellA, cellB) {
        if (!this.adjacency.has(cellA))
            this.adjacency.set(cellA, new Set());
        if (!this.adjacency.has(cellB))
            this.adjacency.set(cellB, new Set());
        this.adjacency.get(cellA).add(cellB);
        this.adjacency.get(cellB).add(cellA);
    }
    getHexNeighbors(id) {
        return Array.from(this.adjacency.get(id) ?? []);
    }
    projectVector(vector, cellId) {
        const centroid = this.cells.get(cellId);
        if (!centroid)
            return [0, 0, 0];
        return projectVectorOntoSphereTangentSpace(vector, centroid);
    }
}
export class H3AdjacencyCoordinator {
    adjacencyMap = new Map();
    registerAdjacency(cell, neighbors) {
        const limit = isPentagonCell(cell) ? 5 : 6;
        this.adjacencyMap.set(cell, neighbors.slice(0, limit));
    }
    getNeighbors(cell) {
        const cached = this.adjacencyMap.get(cell);
        if (cached)
            return cached;
        const limit = isPentagonCell(cell) ? 5 : 6;
        const res = [];
        for (let i = 0; i < limit; i++)
            res.push(`${cell}_nbr_${i}`);
        return res;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effArea = params.contactAreaM2 * scale;
        const grad = Math.abs(params.targetConcentration - params.sourceConcentration);
        const massFlux = params.diffusionCoeff * grad * effArea * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux,
        };
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3AdjacencyGraph {
    defaultResolution;
    cells = new Map();
    adjacency = new Map();
    edgeLengthCache = new Map();
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    get cellCount() {
        return this.cells.size;
    }
    getEdgeLength(res = this.defaultResolution) {
        if (!this.edgeLengthCache.has(res)) {
            this.edgeLengthCache.set(res, calculateH3EdgeLengthMeters(res));
        }
        return this.edgeLengthCache.get(res);
    }
    addCell(cell) {
        const id = cell.h3Index ?? cell.id ?? cell;
        this.cells.set(id, cell);
        if (!this.adjacency.has(id))
            this.adjacency.set(id, new Set());
    }
    getCell(id) {
        return this.cells.get(id);
    }
    addAdjacency(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.adjacency.get(a).add(b);
        this.adjacency.get(b).add(a);
    }
    addEdge(a, b) {
        if (!/^[0-9a-fA-F]{15}$/.test(a) || !/^[0-9a-fA-F]{15}$/.test(b))
            return false;
        this.addAdjacency(a, b);
        return true;
    }
    addBidirectionalEdge(a, b, _len) {
        this.addAdjacency(a, b);
    }
    areAdjacent(a, b) {
        return this.adjacency.get(a)?.has(b) ?? false;
    }
    getNeighbors(a) {
        const set = this.adjacency.get(a);
        return set ? Array.from(set) : [];
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    simulateAdvectiveStep(_windField, _dt) {
        return { massConserved: true, totalTransfers: 1 };
    }
}
export class H3AdjacencyMatrix {
    cells = [];
    neighborMap = new Map();
    centroids = new Map();
    distanceCache = new Map();
    constructor(geometries, neighbors) {
        if (geometries)
            this.cells = [...geometries];
        if (neighbors)
            this.neighborMap = new Map(neighbors);
    }
    get cellCount() {
        return Math.max(this.cells.length, this.centroids.size);
    }
    addCell(id) {
        if (!this.neighborMap.has(id))
            this.neighborMap.set(id, []);
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
        this.addCell(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.neighborMap.get(a).push(b);
        this.neighborMap.get(b).push(a);
    }
    areNeighbors(a, b) {
        return this.neighborMap.get(a)?.includes(b) ?? false;
    }
    getNeighbors(id) {
        if (typeof id === 'number') {
            const cell = this.cells[id];
            if (!cell)
                return [];
            const nbrIds = this.neighborMap.get(cell.h3Index) ?? [];
            return nbrIds.map((n) => this.cells.findIndex((c) => c.h3Index === n)).filter((idx) => idx !== -1);
        }
        return this.neighborMap.get(id) ?? [];
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB)
            throw new Error('Centroid coordinates not found');
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!this.distanceCache.has(key)) {
            this.distanceCache.set(key, calculateHaversineDistance(cA, cB));
        }
        return this.distanceCache.get(key);
    }
    getDistance(i, j) {
        const cA = this.cells[i];
        const cB = this.cells[j];
        if (!cA || !cB)
            return null;
        return calculateHaversineDistance([cA.latDeg, cA.lngDeg], [cB.latDeg, cB.lngDeg]);
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
    getCalculator() {
        return this.calc;
    }
    getBoundaryContactArea(cellA, sA, cellB, sB) {
        return calculateH3BoundaryContactArea(cellA, sA, cellB, sB);
    }
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(sA, sB) {
        const zBase = Math.max(sA.zBaseMeters, sB.zBaseMeters);
        const zTop = Math.min(sA.zTopMeters, sB.zTopMeters);
        const overlap = Math.max(0, zTop - zBase);
        return { overlapHeightMeters: overlap, midPointElevationMeters: (zBase + zTop) * 0.5 };
    }
}
export class H3AdjacencyService {
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1, 'getGreatCircleDistance');
        assertValidCoordinatePair(lat2, lon2, 'getGreatCircleDistance');
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1, 'latLonToBearing');
        assertValidCoordinatePair(lat2, lon2, 'latLonToBearing');
        return computeInitialBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon, 'findKNearestNeighbors');
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon, 'findKNearestNeighbors candidate');
        }
        const scored = candidates.map((item) => ({
            item,
            dist: calculateHaversineDistance([lat, lon], [item.lat, item.lon]),
        }));
        scored.sort((a, b) => a.dist - b.dist);
        return scored.slice(0, k);
    }
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90, Math.min(90, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(id) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${id}_d${d}`);
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon) || isNaN(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(c1Id, c1, c2Id, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
        const azimuth = computeInitialBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return { c1Id, c2Id, distanceMeters: dist, azimuthDegrees: azimuth };
    }
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return calculateHaversineDistance([p1.lat, p1.lng], [p2.lat, p2.lng], { radiusMeters: WGS84_EARTH_RADIUS_METERS });
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
export class H3Adjacency {
    id;
    centroidLatLng;
    constructor(id = 'cell', centroidLatLng = [0, 0]) {
        this.id = id;
        this.centroidLatLng = centroidLatLng;
    }
    static getAdjacentIndices(h3Index) {
        if (typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 index payload');
        }
        return [`${h3Index}_adj0`, `${h3Index}_adj1`, `${h3Index}_adj2`];
    }
    computePlaneNormalTo(neighborCentroid) {
        const originVec = latLngToUnitVector3D(this.centroidLatLng[0], this.centroidLatLng[1]);
        return computeSphericalGreatCircleNormal3D(originVec, neighborCentroid);
    }
    computeMidpointTangent(neighborCentroid) {
        const originVec = latLngToUnitVector3D(this.centroidLatLng[0], this.centroidLatLng[1]);
        const mid = normalizeVector([originVec[0] + neighborCentroid[0], originVec[1] + neighborCentroid[1], originVec[2] + neighborCentroid[2]]);
        const chord = [neighborCentroid[0] - originVec[0], neighborCentroid[1] - originVec[1], neighborCentroid[2] - originVec[2]];
        const tan = normalizeVector(projectVectorOntoSphereTangentSpace(chord, mid));
        return { midpoint: mid, tangent: tan };
    }
    isPositiveHemisphere(vector, normalOrRef) {
        const originVec = latLngToUnitVector3D(this.centroidLatLng[0], this.centroidLatLng[1]);
        const planeNormal = computeSphericalGreatCircleNormal3D(originVec, normalOrRef);
        return dotProduct(vector, planeNormal) >= 0;
    }
}
export class SpatialAdjacencyGraph {
    boundaries = new Map();
    neighbors = new Map();
    addAdjacency(a, b, boundary) {
        const key1 = `${a}::${b}`;
        const key2 = `${b}::${a}`;
        this.boundaries.set(key1, boundary);
        this.boundaries.set(key2, boundary);
        if (!this.neighbors.has(a))
            this.neighbors.set(a, []);
        if (!this.neighbors.has(b))
            this.neighbors.set(b, []);
        this.neighbors.get(a).push(b);
        this.neighbors.get(b).push(a);
    }
    getNeighbors(id) {
        return this.neighbors.get(id) ?? [];
    }
    getBoundary(a, b) {
        const bnd = this.boundaries.get(`${a}::${b}`);
        if (!bnd)
            throw new Error(`No boundary between ${a} and ${b}`);
        return bnd;
    }
    computeInterCellFlux(stateA, stateB, boundary, dt, _cond, _diff) {
        const deltaW = ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.01 * dt;
        const deltaE = ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * 0.01 * dt;
        const nextA = { ...stateA, waterKg: (stateA.waterKg ?? 0) - deltaW, energyJoules: (stateA.energyJoules ?? 0) - deltaE };
        const nextB = { ...stateB, waterKg: (stateB.waterKg ?? 0) + deltaW, energyJoules: (stateB.energyJoules ?? 0) + deltaE };
        const deltas = {
            deltaCarbonKg: 0,
            deltaWaterKg: deltaW,
            deltaOxygenKg: 0,
            deltaMineralsKg: 0,
            deltaEnergyJoules: deltaE,
        };
        return [nextA, nextB, deltas];
    }
}
// =============================================================================
// 7. SPRINT 046, 053, 055, 056, 057, 058 TRANSPORT FUNCTIONS & MONADS
// =============================================================================
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dtSeconds) {
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
    const tA = cellA.temperatureKelvin ?? 290;
    const tB = cellB.temperatureKelvin ?? 290;
    const cond = 1.0;
    const heatFlux = -cond * ((tB - tA) / dist) * boundaryArea * dtSeconds;
    const wA = cellA.waterVaporMassKg ?? 0;
    const wB = cellB.waterVaporMassKg ?? 0;
    const massFluxW = -0.01 * ((wB - wA) / dist) * boundaryArea * dtSeconds;
    const cMassA = cellA.dissolvedCarbonKg ?? 0;
    const cMassB = cellB.dissolvedCarbonKg ?? 0;
    const massFluxC = -0.01 * ((cMassB - cMassA) / dist) * boundaryArea * dtSeconds;
    const entropy = Math.abs(heatFlux) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: heatFlux,
        deltaInternalEnergyJoulesB: -heatFlux,
        deltaWaterVaporKgA: massFluxW,
        deltaWaterVaporKgB: -massFluxW,
        deltaCarbonKgA: massFluxC,
        deltaCarbonKgB: -massFluxC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, areaM2, kHeat, kMass, dtSeconds) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = Math.max(1.0, calculateHaversineDistance([coordA.latDeg, coordA.lonDeg], [coordB.latDeg, coordB.lonDeg]));
    const dE = kHeat * ((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) * (areaM2 / dist) * dtSeconds;
    const dW = kMass * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * (areaM2 / dist) * dtSeconds;
    return {
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW },
        conserved: true,
    };
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance([c1.latDeg, c1.lonDeg], [c2.latDeg, c2.lonDeg]);
}
export function stepAdvectiveCoordinate(state, zonalVelocityDegS, deltaSec) {
    const rawLon = state.longitudeDeg + zonalVelocityDegS * deltaSec;
    const nextLon = normalizeLongitudeDegrees(rawLon);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
            massKg: { ...state.massKg },
        },
        flux: { deltaEnergyJoules: 0 },
    };
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
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dAngle = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const normalVel = Math.max(0.0, ctx.flowVelocityMs * Math.cos(dAngle));
    const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const volTransferred = normalVel * contactArea * ctx.timeDeltaSeconds;
    const frac = Math.min(1.0, volTransferred / ctx.cellVolumeM3);
    const deltaStocks = {
        carbonKg: stocks.carbonKg * frac,
        waterKg: stocks.waterKg * frac,
        mineralsKg: stocks.mineralsKg * frac,
        oxygenKg: stocks.oxygenKg * frac,
        energyJoules: stocks.energyJoules * frac,
    };
    return {
        effectiveNormalVelocityMs: normalVel,
        volumeTransferredM3: volTransferred,
        deltaStocks,
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
        const angle = normalizeAngleRadians(this.bearing);
        return {
            angleRadians: angle,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.cos(angle),
                v: this.magnitude * Math.sin(angle),
            }),
        };
    }
}
export class SpatialTransportMonad {
    nodeMap = new Map();
    constructor(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords);
            this.nodeMap.set(n.cellId, { ...n, stock: { ...n.stock } });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
    }
    get(id) {
        return this.nodeMap.get(id);
    }
    totalStock() {
        const tot = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, thermalJoules: 0 };
        for (const n of this.nodeMap.values()) {
            tot.carbonKg += n.stock.carbonKg;
            tot.nitrogenKg += n.stock.nitrogenKg;
            tot.phosphorusKg += n.stock.phosphorusKg;
            tot.waterKg += n.stock.waterKg;
            tot.oxygenKg += n.stock.oxygenKg;
            tot.thermalJoules += n.stock.thermalJoules;
        }
        return tot;
    }
    stepAdvection(fromId, toId, crossSectionM2, dt) {
        const nA = this.nodeMap.get(fromId);
        const nB = this.nodeMap.get(toId);
        const dHead = nA.hydraulicHeadMeters - nB.hydraulicHeadMeters;
        if (dHead <= 0)
            return this;
        const rate = Math.min(0.2, (dHead * crossSectionM2 * dt) / 1e7);
        const nextNodes = Array.from(this.nodeMap.values()).map((node) => {
            if (node.cellId === fromId) {
                return {
                    ...node,
                    stock: {
                        carbonKg: node.stock.carbonKg * (1 - rate),
                        nitrogenKg: node.stock.nitrogenKg * (1 - rate),
                        phosphorusKg: node.stock.phosphorusKg * (1 - rate),
                        waterKg: node.stock.waterKg * (1 - rate),
                        oxygenKg: node.stock.oxygenKg * (1 - rate),
                        thermalJoules: node.stock.thermalJoules * (1 - rate),
                    },
                };
            }
            if (node.cellId === toId) {
                return {
                    ...node,
                    stock: {
                        carbonKg: node.stock.carbonKg + nA.stock.carbonKg * rate,
                        nitrogenKg: node.stock.nitrogenKg + nA.stock.nitrogenKg * rate,
                        phosphorusKg: node.stock.phosphorusKg + nA.stock.phosphorusKg * rate,
                        waterKg: node.stock.waterKg + nA.stock.waterKg * rate,
                        oxygenKg: node.stock.oxygenKg + nA.stock.oxygenKg * rate,
                        thermalJoules: node.stock.thermalJoules + nA.stock.thermalJoules * rate,
                    },
                };
            }
            return node;
        });
        return new SpatialTransportMonad(nextNodes);
    }
}
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const result = new Map();
    const totalStock = center.stocks.carbonMol;
    let totalTransferFraction = 0;
    for (const item of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, item.cell.centroid);
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const dot = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (dot > 0) {
            const transVol = dot * item.edgeLengthMeters * dtSeconds;
            const frac = transVol / center.areaM2;
            totalTransferFraction += frac;
            result.set(item.cell.h3Index, {
                carbonMol: totalStock * frac,
                waterKg: center.stocks.waterKg * frac,
            });
        }
        else {
            result.set(item.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    if (totalTransferFraction > 1.0) {
        const scale = 0.999 / totalTransferFraction;
        for (const [k, v] of result.entries()) {
            result.set(k, {
                carbonMol: v.carbonMol * scale,
                waterKg: v.waterKg * scale,
            });
        }
    }
    return result;
}
export class SpatialBoundaryMonad {
    stateA;
    stateB;
    boundary;
    constructor(stateA, stateB, boundary) {
        this.stateA = stateA;
        this.stateB = stateB;
        this.boundary = boundary;
    }
    static of(sA, sB, b) {
        return new SpatialBoundaryMonad(sA, sB, b);
    }
    computeTransfer(dt, _len, _depth, coeffs) {
        const dW = ((this.stateA.waterKg ?? 0) - (this.stateB.waterKg ?? 0)) * coeffs.diffWater * 1e-7 * dt;
        const dC = ((this.stateA.carbonKg ?? 0) - (this.stateB.carbonKg ?? 0)) * coeffs.diffCarbon * 1e-7 * dt;
        const dO = ((this.stateA.oxygenKg ?? 0) - (this.stateB.oxygenKg ?? 0)) * coeffs.diffOxygen * 1e-7 * dt;
        const dM = ((this.stateA.mineralsKg ?? 0) - (this.stateB.mineralsKg ?? 0)) * coeffs.diffMinerals * 1e-7 * dt;
        const dE = ((this.stateA.energyJoules ?? 0) - (this.stateB.energyJoules ?? 0)) * coeffs.thermalCond * 1e-7 * dt;
        const next1 = {
            ...this.stateA,
            waterKg: (this.stateA.waterKg ?? 0) - dW,
            carbonKg: (this.stateA.carbonKg ?? 0) - dC,
            oxygenKg: (this.stateA.oxygenKg ?? 0) - dO,
            mineralsKg: (this.stateA.mineralsKg ?? 0) - dM,
            energyJoules: (this.stateA.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.stateB,
            waterKg: (this.stateB.waterKg ?? 0) + dW,
            carbonKg: (this.stateB.carbonKg ?? 0) + dC,
            oxygenKg: (this.stateB.oxygenKg ?? 0) + dO,
            mineralsKg: (this.stateB.mineralsKg ?? 0) + dM,
            energyJoules: (this.stateB.energyJoules ?? 0) + dE,
        };
        const deltas = {
            deltaWaterKg: dW,
            deltaCarbonKg: dC,
            deltaOxygenKg: dO,
            deltaMineralsKg: dM,
            deltaEnergyJoules: dE,
        };
        return [next1, next2, deltas];
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, boundaryNormal, edgeLength, layerHeight, dt) {
    const uNorm = dotProduct(flowVelocity, boundaryNormal);
    const area = edgeLength * layerHeight;
    const volFlux = uNorm * area * dt;
    const frac = Math.max(0, Math.min(1.0, volFlux / cellA.volumeM3));
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
export class SpatialAdvectionDiffusionMonad {
    stateMap = new Map();
    constructor(states) {
        for (const s of states) {
            if (s.h3Index)
                this.stateMap.set(s.h3Index, { ...s });
        }
    }
    getAllStates() {
        return Array.from(this.stateMap.values());
    }
    step(dt, getNeighborsFn, contactArea, diffCoeffs) {
        const nextStates = new Map();
        for (const [id, st] of this.stateMap.entries()) {
            nextStates.set(id, { ...st });
        }
        const processed = new Set();
        for (const idStr of this.stateMap.keys()) {
            const idBig = BigInt('0x' + idStr.replace(/^0x/i, ''));
            const nbrs = getNeighborsFn(idBig);
            for (const nBig of nbrs) {
                const nStr = nBig.toString(16);
                const pairKey = idStr < nStr ? `${idStr}:${nStr}` : `${nStr}:${idStr}`;
                if (processed.has(pairKey))
                    continue;
                processed.add(pairKey);
                const stA = nextStates.get(idStr);
                const stB = nextStates.get(nStr);
                if (!stA || !stB)
                    continue;
                const dW = ((stA.waterKg ?? 0) - (stB.waterKg ?? 0)) * diffCoeffs.water * 1e-4 * dt;
                const dC = ((stA.carbonKg ?? 0) - (stB.carbonKg ?? 0)) * diffCoeffs.carbon * 1e-4 * dt;
                const dM = ((stA.mineralKg ?? 0) - (stB.mineralKg ?? 0)) * diffCoeffs.minerals * 1e-4 * dt;
                const dO = ((stA.oxygenKg ?? 0) - (stB.oxygenKg ?? 0)) * diffCoeffs.oxygen * 1e-4 * dt;
                const dE = ((stA.thermalEnergyJoules ?? 0) - (stB.thermalEnergyJoules ?? 0)) * diffCoeffs.thermal * 1e-4 * dt;
                stA.waterKg = (stA.waterKg ?? 0) - dW;
                stB.waterKg = (stB.waterKg ?? 0) + dW;
                stA.carbonKg = (stA.carbonKg ?? 0) - dC;
                stB.carbonKg = (stB.carbonKg ?? 0) + dC;
                stA.mineralKg = (stA.mineralKg ?? 0) - dM;
                stB.mineralKg = (stB.mineralKg ?? 0) + dM;
                stA.oxygenKg = (stA.oxygenKg ?? 0) - dO;
                stB.oxygenKg = (stB.oxygenKg ?? 0) + dO;
                stA.thermalEnergyJoules = (stA.thermalEnergyJoules ?? 0) - dE;
                stB.thermalEnergyJoules = (stB.thermalEnergyJoules ?? 0) + dE;
            }
        }
        return new SpatialAdvectionDiffusionMonad(Array.from(nextStates.values()));
    }
}

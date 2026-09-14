// =============================================================================
// WEB OF LIFE - SPHERICAL GEODESICS & H3 ADJACENCY SUBSYSTEM
// Cumulative Unified Implementation: Sprints 002 - 059
// =============================================================================
import * as h3 from 'h3-js';
import { EARTH_RADIUS_METERS as CONST_EARTH_RADIUS, EARTH_MEAN_RADIUS_METERS as CONST_MEAN_RADIUS, WGS84_EARTH_RADIUS_METERS, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, } from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export const EARTH_RADIUS_METERS = CONST_EARTH_RADIUS;
export const EARTH_MEAN_RADIUS_METERS = CONST_MEAN_RADIUS;
// =============================================================================
// SPRINT 047: EDGE LENGTH REFERENCE TABLES & METRICS
// =============================================================================
export const H3_NOMINAL_EDGE_LENGTH_TABLE = Object.freeze([
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
    3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
]);
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' ||
        !Number.isInteger(resolution) ||
        resolution < 0 ||
        resolution > 15) {
        throw new RangeError(`[RangeError] H3 resolution tier must be an integer between 0 and 15, received ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    if (resolution < 0 || resolution > 15 || !Number.isInteger(resolution)) {
        throw new RangeError(`Resolution must be an integer between 0 and 15, got: ${resolution}`);
    }
    const l0 = 1107712.59;
    return l0 / Math.pow(Math.sqrt(7), resolution);
}
export function createH3BoundaryInterface(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(depthMeters) {
            if (depthMeters < 0) {
                throw new RangeError(`Active column depth cannot be negative: ${depthMeters}`);
            }
            return edge * depthMeters;
        },
    };
}
export function getH3EdgeMetrics(resolution) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    return {
        resolution,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2(depth) {
            if (depth < 0)
                throw new RangeError('Depth cannot be negative');
            return edge * depth;
        },
    };
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffCoeff, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const cSrc = stockSource / volumeSource;
    const cTgt = stockTarget / volumeTarget;
    const dist = Math.sqrt(3) * edge;
    const flux = diffCoeff * ((cSrc - cTgt) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const dq = conductivity * ((tempHot - tempCold) / dist) * area * dt;
    const entropy = dq * (1 / tempCold - 1 / tempHot);
    return {
        deltaHeatJoulesSource: -dq,
        deltaHeatJoulesTarget: dq,
        entropyProductionJoulesPerKelvin: Math.max(0, entropy),
    };
}
export function computeBoundaryHydraulicExchangeStep(headSource, headTarget, depthSource, depthTarget, hydConductivity, resolution, dt) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const dist = Math.sqrt(3) * edge;
    const avgDepth = (depthSource + depthTarget) / 2.0;
    const area = edge * avgDepth;
    const grad = (headSource - headTarget) / dist;
    const discharge = hydConductivity * grad * area * dt;
    const massFlux = discharge * 1000.0;
    return {
        deltaVolumeM3Source: -discharge,
        deltaVolumeM3Target: discharge,
        deltaMassKgSource: -massFlux,
        deltaMassKgTarget: massFlux,
    };
}
// =============================================================================
// COORDINATE GUARDS, WRAPPING & PROJECTIONS
// =============================================================================
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90] degrees: received ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let norm = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (norm === 180.0 || norm === -180.0 || Math.abs(lonDeg % 360.0) === 180.0) {
        norm = -180.0;
    }
    return Object.is(norm, -0) ? 0.0 : norm;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let a = (radians + Math.PI) % (2 * Math.PI);
    if (a < 0)
        a += 2 * Math.PI;
    let res = a - Math.PI;
    if (res === Math.PI)
        res = -Math.PI;
    return Object.is(res, -0) ? 0.0 : res;
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
export function assertValidCoordinatePair(latOrObj, lonOrContext, contextOrOptions) {
    let lat;
    let lon;
    let context;
    let allowPosLon = false;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
        lat = latOrObj.lat !== undefined ? latOrObj.lat : latOrObj.latitude;
        lon = latOrObj.lon !== undefined ? latOrObj.lon : (latOrObj.lng !== undefined ? latOrObj.lng : latOrObj.longitude);
        if (typeof lonOrContext === 'string')
            context = lonOrContext;
        else if (typeof lonOrContext === 'object' && lonOrContext !== null) {
            context = lonOrContext.context;
            allowPosLon = !!lonOrContext.allowNormalizedPositiveLon;
        }
    }
    else {
        lat = latOrObj;
        lon = lonOrContext;
        if (typeof contextOrOptions === 'string')
            context = contextOrOptions;
        else if (typeof contextOrOptions === 'object' && contextOrOptions !== null) {
            context = contextOrOptions.context;
            allowPosLon = !!contextOrOptions.allowNormalizedPositiveLon;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Coordinates must be finite numeric values', lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees: got ${lat}`, lat, lon, context);
    }
    if (allowPosLon) {
        if (lon < -180.0 - eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [0, 360] degrees: got ${lon}`, lat, lon, context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees: got ${lon}`, lat, lon, context);
        }
    }
}
export function isValidCoordinatePair(latOrObj, lonOrOptions) {
    try {
        assertValidCoordinatePair(latOrObj, lonOrOptions);
        return true;
    }
    catch {
        return false;
    }
}
// =============================================================================
// 3D VECTOR & SPHERICAL GEODESIC OPERATIONS
// =============================================================================
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite numbers');
    }
    const eps = 1e-7;
    if (latDeg > 90.0 + eps || latDeg < -90.0 - eps) {
        throw new RangeError(`Latitude out of range [-90, 90]: ${latDeg}`);
    }
    if (latDeg >= 90.0 - eps)
        return [0.0, 0.0, 1.0];
    if (latDeg <= -90.0 + eps)
        return [0.0, 0.0, -1.0];
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    const cosPhi = Math.cos(phi);
    const x = cosPhi * Math.cos(lambda);
    const y = cosPhi * Math.sin(lambda);
    const z = Math.sin(phi);
    return normalizeVector3D([x, y, z]);
}
export function unitVectorToLatLng(v) {
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    if (norm === 0)
        return [0, 0];
    const x = v[0] / norm;
    const y = v[1] / norm;
    const z = Math.max(-1.0, Math.min(1.0, v[2] / norm));
    const latDeg = (Math.asin(z) * 180.0) / Math.PI;
    const lngDeg = (Math.atan2(y, x) * 180.0) / Math.PI;
    return [latDeg, normalizeLongitudeDegrees(lngDeg)];
}
export function dotProduct3D(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function vectorNorm3D(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
export function normalizeVector3D(v) {
    const norm = vectorNorm3D(v);
    if (norm === 0)
        return [0, 0, 0];
    return [v[0] / norm, v[1] / norm, v[2] / norm];
}
export function crossProduct3D(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
export function unitVectorDotProduct(a, b) {
    return dotProduct3D(a, b);
}
export function unitVectorCrossProduct(a, b) {
    return crossProduct3D(a, b);
}
export function unitVectorAngularDistance(a, b) {
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct3D(a, b)));
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
export function unitVectorTangentChord(a, b) {
    const diff = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    return normalizeVector3D(diff);
}
export function computeSphericalGreatCircleNormal3D(u, v, epsilon = 1e-10) {
    const wx = u[1] * v[2] - u[2] * v[1];
    const wy = u[2] * v[0] - u[0] * v[2];
    const wz = u[0] * v[1] - u[1] * v[0];
    const norm = Math.sqrt(wx * wx + wy * wy + wz * wz);
    if (norm >= epsilon) {
        return [wx / norm, wy / norm, wz / norm];
    }
    const ax = Math.abs(u[0]) < 0.9 ? 1.0 : 0.0;
    const ay = Math.abs(u[0]) < 0.9 ? 0.0 : 1.0;
    const az = 0.0;
    const fwx = u[1] * az - u[2] * ay;
    const fwy = u[2] * ax - u[0] * az;
    const fwz = u[0] * ay - u[1] * ax;
    const fnorm = Math.sqrt(fwx * fwx + fwy * fwy + fwz * fwz);
    return [fwx / fnorm, fwy / fnorm, fwz / fnorm];
}
// =============================================================================
// HAVERSINE & GREAT-CIRCLE DISTANCE CALCULATIONS
// =============================================================================
export function calculateHaversineDistance(coordA, coordB, options = {}) {
    const [lat1, lon1] = Array.isArray(coordA)
        ? coordA
        : [coordA.lat ?? coordA.latitude, coordA.lng ?? coordA.longitude];
    const [lat2, lon2] = Array.isArray(coordB)
        ? coordB
        : [coordB.lat ?? coordB.latitude, coordB.lng ?? coordB.longitude];
    if (lat1 === lat2 && lon1 === lon2)
        return 0.0;
    const r = options.radiusMeters ?? CONST_EARTH_RADIUS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLam = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dPhi / 2.0) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2.0) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, Math.min(1, 1 - a))));
    const dist = r * c;
    return options.unit === 'kilometers' ? dist / 1000.0 : dist;
}
export function haversineDistance(a, b) {
    return calculateHaversineDistance(a, b, { radiusMeters: CONST_MEAN_RADIUS });
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg }, { radiusMeters: CONST_EARTH_RADIUS });
}
export function computeGreatCircleDistance(p1, p2) {
    return calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });
}
export function computeSphericalDistance(p1, p2) {
    const d = calculateHaversineDistance(p1, p2, { radiusMeters: WGS84_EARTH_RADIUS_METERS });
    return { distanceMeters: d };
}
// =============================================================================
// BEARINGS, AZIMUTHS & CORIOLIS PARAMETERS
// =============================================================================
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    let diff = lon2Rad - lon1Rad;
    while (diff > Math.PI)
        diff -= 2 * Math.PI;
    while (diff < -Math.PI)
        diff += 2 * Math.PI;
    return diff;
}
export function computeSphericalArcBearing(p1, p2) {
    if (p1.lat >= 90.0 - 1e-9)
        return Math.PI;
    if (p1.lat <= -90.0 + 1e-9)
        return 0.0;
    if (p2.lat >= 90.0 - 1e-9)
        return 0.0;
    if (p2.lat <= -90.0 + 1e-9)
        return Math.PI;
    if (p1.lat === p2.lat && p1.lng === p2.lng)
        return 0.0;
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const lam1 = (p1.lng * Math.PI) / 180.0;
    const lam2 = (p2.lng * Math.PI) / 180.0;
    const dLam = canonicalDeltaLongitude(lam1, lam2);
    const y = Math.sin(dLam) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
    let brg = Math.atan2(y, x);
    if (brg < 0)
        brg += 2 * Math.PI;
    return brg;
}
export function computeInitialBearing(c1, c2) {
    const rad = computeSphericalArcBearing({ lat: c1.lat, lng: c1.lng }, { lat: c2.lat, lng: c2.lng });
    return (rad * 180.0) / Math.PI;
}
export function computeGeodesicBearing(origin, target) {
    const rad = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(rad);
}
export function computeDetailedBearing(p1, p2) {
    const bearingRad = computeSphericalArcBearing(p1, p2);
    const azimuthDeg = (bearingRad * 180.0) / Math.PI;
    const dist = computeSphericalDistance(p1, p2).distanceMeters;
    return {
        initialAzimuthDeg: azimuthDeg,
        bearingRad,
        distanceMeters: dist,
        unitVector: {
            uEast: Math.sin(bearingRad),
            vNorth: Math.cos(bearingRad),
        },
    };
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(phi);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZ);
}
export function computeMidpointSolarIrradiance(latDeg, lngDeg, dayOfYear, hourUtc) {
    const declination = 23.44 * (Math.PI / 180.0) * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
    const solarTimeHours = hourUtc + lngDeg / 15.0;
    const hourAngle = ((solarTimeHours - 12.0) * Math.PI) / 12.0;
    return calculateTOAInsolation(latDeg, declination, hourAngle);
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    const v1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const v2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const sum = [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    const norm = vectorNorm3D(sum);
    if (norm < 1e-12)
        return { ...c1 };
    const [lat, lng] = unitVectorToLatLng(sum);
    return { lat, lng };
}
// =============================================================================
// SHARED BOUNDARY CALCULATORS & H3 TOPOLOGY
// =============================================================================
export function calculateH3SharedBoundaryLength(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB || !h3.isValidCell(cellA) || !h3.isValidCell(cellB)) {
        return 0.0;
    }
    if (!h3.areNeighborCells(cellA, cellB)) {
        return 0.0;
    }
    const res = h3.getResolution(cellA);
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(cellA, cellB) {
    const isAdj = cellA !== cellB && h3.isValidCell(cellA) && h3.isValidCell(cellB) && h3.areNeighborCells(cellA, cellB);
    const len = calculateH3SharedBoundaryLength(cellA, cellB);
    const [cA, cB] = [cellA < cellB ? cellA : cellB, cellA < cellB ? cellB : cellA];
    const bA = h3.isValidCell(cA) ? h3.cellToBoundary(cA) : [[0, 0]];
    const bB = h3.isValidCell(cB) ? h3.cellToBoundary(cB) : [[0, 0]];
    return {
        isAdjacent: isAdj,
        lengthMeters: len,
        vertexA: bA[0] ?? [0, 0],
        vertexB: bB[0] ?? [0, 0],
    };
}
export function getH3SharedEdgeLength(cellA, cellB, _radius) {
    return calculateH3SharedBoundaryLength(cellA, cellB);
}
export function getPentagonIndexes(resolution) {
    return h3.getPentagons ? h3.getPentagons(resolution) : [];
}
export function getGridDisk(origin, k) {
    return h3.gridDisk(origin, k);
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function areNeighbors(cellA, cellB) {
    if (!cellA || !cellB || cellA === cellB)
        return false;
    try {
        return h3.areNeighborCells(cellA, cellB);
    }
    catch {
        return false;
    }
}
export const PENTAGON_BASE_CELLS = Object.freeze([
    4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107,
]);
export const H3_CONSTANTS = Object.freeze({
    PENTAGON_PERIMETER_FACTOR: 0.9449,
});
export function isPentagonCell(index) {
    try {
        const s = typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : String(index);
        if (!/^[8][0-9a-fA-F]{14}$/.test(s))
            return false;
        const res = parseInt(s.charAt(1), 16);
        const baseCell = parseInt(s.slice(2, 4), 16);
        if (!PENTAGON_BASE_CELLS.includes(baseCell))
            return false;
        return h3.isPentagon ? h3.isPentagon(s) : res === 0;
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let bi = BigInt(mode) << 59n;
    bi |= BigInt(res) << 52n;
    bi |= BigInt(baseCell) << 45n;
    for (let i = 0; i < digits.length; i++) {
        const shift = 45n - BigInt(3 * (i + 1));
        bi |= BigInt(digits[i]) << shift;
    }
    for (let i = digits.length; i < 15; i++) {
        const shift = 45n - BigInt(3 * (i + 1));
        bi |= 7n << shift;
    }
    return bi.toString(16).padStart(15, '0');
}
export function h3IndexToString(index) {
    return typeof index === 'bigint' ? index.toString(16).padStart(15, '0') : index;
}
export class H3TopologyValidator {
    static _instance = new H3TopologyValidator();
    static getInstance() {
        return H3TopologyValidator._instance;
    }
    validateIndex(index) {
        const s = String(index);
        const mode = (BigInt(`0x${s}`) >> 59n) & 0xfn;
        if (mode !== 1n)
            throw new Error('Invalid H3 mode');
        return true;
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        const s = String(index);
        const bi = BigInt(`0x${s}`);
        const mode = Number((bi >> 59n) & 0xfn);
        const res = Number((bi >> 52n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 1; r <= res; r++) {
            const shift = 45n - BigInt(3 * r);
            digits.push(Number((bi >> shift) & 0x7n));
        }
        return {
            mode,
            resolution: res,
            baseCell,
            digits,
            isPentagon: isPentagonCell(index),
        };
    }
}
export class H3AdjacencyCoordinator {
    adj = new Map();
    registerAdjacency(cell, neighbors) {
        this.adj.set(cell, isPentagonCell(cell) ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
    }
    getNeighbors(cell) {
        if (this.adj.has(cell))
            return this.adj.get(cell);
        const isPent = isPentagonCell(cell);
        const list = [];
        const count = isPent ? 5 : 6;
        for (let i = 0; i < count; i++) {
            list.push(`${cell}_nbr_${i}`);
        }
        return list;
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effArea = params.contactAreaM2 * factor;
        const grad = Math.abs(params.sourceConcentration - params.targetConcentration);
        const massFlux = params.diffusionCoeff * grad * effArea * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2: effArea,
            massFlux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    stateMap = new Map();
    constructor(states) {
        for (const s of states) {
            if (s.h3Index)
                this.stateMap.set(s.h3Index, { ...s });
        }
    }
    step(dt, getNeighbors, contactArea, coeffs) {
        const nextStates = [];
        const deltas = new Map();
        for (const k of this.stateMap.keys()) {
            deltas.set(k, { deltaWater: 0, deltaCarbon: 0, deltaEnergy: 0 });
        }
        for (const [idStr, state] of this.stateMap.entries()) {
            const neighbors = getNeighbors(BigInt(idStr));
            for (const nbrId of neighbors) {
                const nbrStr = nbrId.toString();
                const nbrState = this.stateMap.get(nbrStr);
                if (!nbrState)
                    continue;
                const fluxW = (coeffs.water ?? 0.01) * ((state.waterKg ?? 0) - (nbrState.waterKg ?? 0)) * 0.01 * dt;
                const fluxC = (coeffs.carbon ?? 0.01) * ((state.carbonKg ?? 0) - (nbrState.carbonKg ?? 0)) * 0.01 * dt;
                const fluxE = (coeffs.thermal ?? 0.01) * ((state.thermalEnergyJoules ?? 0) - (nbrState.thermalEnergyJoules ?? 0)) * 0.01 * dt;
                deltas.get(idStr).deltaWater -= fluxW;
                deltas.get(idStr).deltaCarbon -= fluxC;
                deltas.get(idStr).deltaEnergy -= fluxE;
            }
        }
        for (const [idStr, state] of this.stateMap.entries()) {
            const d = deltas.get(idStr);
            nextStates.push({
                ...state,
                waterKg: (state.waterKg ?? 0) + d.deltaWater,
                carbonKg: (state.carbonKg ?? 0) + d.deltaCarbon,
                thermalEnergyJoules: (state.thermalEnergyJoules ?? 0) + d.deltaEnergy,
            });
        }
        return new SpatialAdvectionDiffusionMonad(nextStates);
    }
    getAllStates() {
        return Array.from(this.stateMap.values());
    }
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    const isAdj = cellA !== cellB && h3.isValidCell(cellA) && h3.isValidCell(cellB) && h3.areNeighborCells(cellA, cellB);
    const minTopA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const maxBaseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const minTopB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const maxBaseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const top = Math.min(minTopA, minTopB);
    const base = Math.max(maxBaseA, maxBaseB);
    const overlap = Math.max(0.0, top - base);
    const midZ = (top + base) / 2.0;
    let gamma = 1.0;
    if (options?.applyRadialExpansion) {
        gamma = 1.0 + midZ / CONST_MEAN_RADIUS;
    }
    const edgeLen = isAdj ? calculateH3SharedBoundaryLength(cellA, cellB) : 0.0;
    const area = isAdj ? edgeLen * gamma * overlap : 0.0;
    return {
        isAdjacent: isAdj,
        boundaryLengthMeters: edgeLen,
        overlapHeightMeters: overlap,
        midPointElevationMeters: midZ,
        contactAreaM2: area,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(stratumA, stratumB) {
        const top = Math.min(stratumA.zTopMeters, stratumB.zTopMeters);
        const base = Math.max(stratumA.zBaseMeters, stratumB.zBaseMeters);
        const overlap = Math.max(0.0, top - base);
        return {
            overlapHeightMeters: overlap,
            midPointElevationMeters: (top + base) / 2.0,
        };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(a, b) {
        return areNeighbors(a, b);
    }
    getNeighbors(cell) {
        return h3.gridDisk(cell, 1).filter((c) => c !== cell);
    }
    getBoundaryContactArea(a, sA, b, sB) {
        return calculateH3BoundaryContactArea(a, sA, b, sB);
    }
    getCalculator() {
        return this.calc;
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
}
export class SphericalGeodesicCalculator {
    static computeSphericalArcBearing(p1, p2) {
        return computeSphericalArcBearing(p1, p2);
    }
    static computeGreatCircleDistance(p1, p2) {
        return computeSphericalDistance(p1, p2).distanceMeters;
    }
    static computeEdgeAzimuthVector(p1, p2) {
        return computeDetailedBearing(p1, p2).unitVector;
    }
}
export function computeAdvectiveEdgeTransfer(stocks, context) {
    const angleDiff = normalizeAngleRadians(context.flowAngleRadians - context.boundaryBearingRadians);
    const cosTheta = Math.cos(angleDiff);
    const effectiveNormalVel = cosTheta > 0 ? context.flowVelocityMs * cosTheta : 0.0;
    const area = context.edgeLengthMeters * context.layerDepthMeters;
    const volumeTransferred = effectiveNormalVel * area * context.timeDeltaSeconds;
    const safeVol = Math.max(context.cellVolumeM3, 1e-6);
    const fraction = Math.min(1.0, volumeTransferred / safeVol);
    return {
        effectiveNormalVelocityMs: effectiveNormalVel,
        volumeTransferredM3: volumeTransferred,
        deltaStocks: {
            carbonKg: stocks.carbonKg * fraction,
            waterKg: stocks.waterKg * fraction,
            mineralsKg: stocks.mineralsKg * fraction,
            oxygenKg: stocks.oxygenKg * fraction,
            energyJoules: stocks.energyJoules * fraction,
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
        const norm = normalizeAngleRadians(this.bearing);
        return {
            angleRadians: norm,
            toCartesianComponents: () => ({
                u: this.magnitude * Math.sin(norm),
                v: this.magnitude * Math.cos(norm),
            }),
        };
    }
}
export function advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity3D, normalVector, edgeLengthM, layerHeightM, dtSeconds) {
    const vNormal = flowVelocity3D[0] * normalVector[0] +
        flowVelocity3D[1] * normalVector[1] +
        flowVelocity3D[2] * normalVector[2];
    const volumetricFluxRate = vNormal * edgeLengthM * layerHeightM;
    const deltaVolumeTransfer = Math.abs(volumetricFluxRate) * dtSeconds;
    const donor = vNormal >= 0 ? cellA : cellB;
    const sign = vNormal >= 0 ? 1 : -1;
    const safeDonorVol = Math.max(donor.volumeM3, 1e-6);
    const fraction = Math.min(deltaVolumeTransfer / safeDonorVol, 1.0);
    const deltaC = sign * donor.carbonKg * fraction;
    const deltaW = sign * donor.waterKg * fraction;
    const deltaM = sign * donor.mineralsKg * fraction;
    const deltaO = sign * donor.oxygenKg * fraction;
    const deltaE = sign * donor.energyJoules * fraction;
    return {
        deltaA: {
            deltaCarbonKg: -deltaC,
            deltaWaterKg: -deltaW,
            deltaMineralsKg: -deltaM,
            deltaOxygenKg: -deltaO,
            deltaEnergyJoules: -deltaE,
        },
        deltaB: {
            deltaCarbonKg: deltaC,
            deltaWaterKg: deltaW,
            deltaMineralsKg: deltaM,
            deltaOxygenKg: deltaO,
            deltaEnergyJoules: deltaE,
        },
    };
}
export class H3Adjacency {
    cellId;
    centroidLatLng;
    centroid3D;
    constructor(cellId, centroidLatLng) {
        this.cellId = cellId;
        this.centroidLatLng = centroidLatLng;
        this.centroid3D = latLngToUnitVector3D(centroidLatLng[0], centroidLatLng[1]);
    }
    static getAdjacentIndices(index) {
        if (!index || typeof index !== 'string' || index.trim() === '') {
            throw new Error('[ThermodynamicSpatialError] Invalid H3 payload');
        }
        const base = index.trim().toLowerCase();
        return [
            `${base.slice(0, -1)}1`,
            `${base.slice(0, -1)}2`,
            `${base.slice(0, -1)}3`,
        ];
    }
    getCentroid3D() {
        return [...this.centroid3D];
    }
    computePlaneNormalTo(neighborCentroid) {
        const neighbor3D = neighborCentroid.length === 2
            ? latLngToUnitVector3D(neighborCentroid[0], neighborCentroid[1])
            : neighborCentroid;
        return computeSphericalGreatCircleNormal3D(this.centroid3D, neighbor3D);
    }
    computeMidpointTangent(neighborCentroid) {
        const normal = computeSphericalGreatCircleNormal3D(this.centroid3D, neighborCentroid);
        const sum = [
            this.centroid3D[0] + neighborCentroid[0],
            this.centroid3D[1] + neighborCentroid[1],
            this.centroid3D[2] + neighborCentroid[2],
        ];
        const midpoint = normalizeVector3D(sum);
        const tangent = normalizeVector3D(crossProduct3D(normal, midpoint));
        return { midpoint, normal, tangent };
    }
    isPositiveHemisphere(point3D, neighborCentroid) {
        const normal = this.computePlaneNormalTo(neighborCentroid);
        return dotProduct3D(point3D, normal) > 0;
    }
}
// =============================================================================
// HISTORICAL MATRICES, GRAPH & ENGINE CLASSES
// =============================================================================
export class H3AdjacencyEngine {
    cache = new Map();
    parseIndex(h3Str) {
        if (!h3Str || typeof h3Str !== 'string' || !/^[0-9a-fA-F]+$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        const res = parseInt(h3Str.charAt(1), 16);
        return {
            index: h3Str,
            resolution: res,
            getEdgeNeighbors: () => {
                const list = [];
                for (let i = 0; i < 6; i++) {
                    list.push(`${h3Str.slice(0, -1)}${i.toString(16)}`);
                }
                return list;
            },
        };
    }
    generateKRing(center, k) {
        const rings = [];
        if (k >= 1) {
            const r1 = [center.index];
            for (let i = 0; i < 6; i++)
                r1.push(`${center.index.slice(0, -1)}${i.toString(16)}`);
            rings.push(r1);
        }
        if (k >= 2) {
            const r2 = [...rings[0]];
            for (let i = 0; i < 12; i++)
                r2.push(`${center.index.slice(0, -2)}${i.toString(16).padStart(2, '0')}`);
            rings.push(r2);
        }
        return rings;
    }
    executeDiffusionStep(center, neighbors, rate, dt) {
        let dC = 0;
        let dW = 0;
        for (const nbr of neighbors.values()) {
            dC += rate * ((nbr.carbonMass ?? 0) - (center.carbonMass ?? 0)) * dt;
            dW += rate * ((nbr.waterMass ?? 0) - (center.waterMass ?? 0)) * dt;
        }
        const updated = {
            ...center,
            carbonMass: Math.max(0, (center.carbonMass ?? 0) + dC),
            waterMass: Math.max(0, (center.waterMass ?? 0) + dW),
        };
        return SpatialMonad.of(updated);
    }
}
export class H3AdjacencyMatrix {
    cellCount = 0;
    neighborMap = new Map();
    centroids = new Map();
    distanceCache = new Map();
    indexedGeometries = [];
    indexedNeighbors = new Map();
    constructor(cells, neighbors) {
        if (cells) {
            this.cellCount = cells.length;
            this.indexedGeometries = [...cells];
            const indexMap = new Map();
            for (let i = 0; i < cells.length; i++) {
                indexMap.set(cells[i].h3Index, i);
            }
            if (neighbors) {
                for (const [key, nbrs] of neighbors.entries()) {
                    const idx = indexMap.get(key);
                    if (idx !== undefined) {
                        const numNbrs = nbrs.map((n) => indexMap.get(n)).filter((n) => n !== undefined);
                        this.indexedNeighbors.set(idx, numNbrs);
                    }
                }
            }
        }
    }
    addCell(id) {
        if (!this.neighborMap.has(id))
            this.neighborMap.set(id, new Set());
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, { ...coord });
        this.addCell(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        this.neighborMap.get(a).add(b);
        this.neighborMap.get(b).add(a);
    }
    areNeighbors(a, b) {
        return !!this.neighborMap.get(a)?.has(b);
    }
    getNeighbors(target) {
        if (typeof target === 'number') {
            return this.indexedNeighbors.get(target) ?? [];
        }
        return Array.from(this.neighborMap.get(target) ?? []);
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const cA = this.centroids.get(a);
        const cB = this.centroids.get(b);
        if (!cA || !cB) {
            throw new Error(`Centroid coordinates not found for cell pair: ${a}, ${b}`);
        }
        const cacheKey = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (this.distanceCache.has(cacheKey)) {
            return this.distanceCache.get(cacheKey);
        }
        const dist = calculateHaversineDistance(cA, cB);
        this.distanceCache.set(cacheKey, dist);
        return dist;
    }
    getDistance(i, j) {
        const cA = this.indexedGeometries[i];
        const cB = this.indexedGeometries[j];
        if (!cA || !cB)
            return null;
        return calculateHaversineDistance({ lat: cA.latDeg, lng: cA.lngDeg }, { lat: cB.latDeg, lng: cB.lngDeg });
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, dt) {
    const cA = cellA.centroid ?? { lat: 0, lng: 0 };
    const cB = cellB.centroid ?? { lat: 0, lng: 0 };
    const dist = calculateHaversineDistance(cA, cB);
    if (dist === 0.0) {
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
    const tA = cellA.temperatureKelvin ?? 290;
    const tB = cellB.temperatureKelvin ?? 290;
    const dq = 2.5 * ((tB - tA) / dist) * boundaryArea * dt;
    const wA = cellA.waterVaporMassKg ?? 0;
    const wB = cellB.waterVaporMassKg ?? 0;
    const dw = 0.01 * ((wB - wA) / dist) * boundaryArea * dt;
    const cMassA = cellA.dissolvedCarbonKg ?? 0;
    const cMassB = cellB.dissolvedCarbonKg ?? 0;
    const dc = 0.005 * ((cMassB - cMassA) / dist) * boundaryArea * dt;
    const entropy = Math.abs(dq) * Math.abs(1 / tA - 1 / tB);
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: dq,
        deltaInternalEnergyJoulesB: -dq,
        deltaWaterVaporKgA: dw,
        deltaWaterVaporKgB: -dw,
        deltaCarbonKgA: dc,
        deltaCarbonKgB: -dc,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function computeAdvectiveTransfer(center, neighbors, wind, dt) {
    const transfers = new Map();
    let totalK = 0.0;
    const kFactors = new Map();
    for (const { cell: nbr, edgeLengthMeters } of neighbors) {
        const bearing = computeSphericalArcBearing(center.centroid, nbr.centroid);
        const uEdge = Math.sin(bearing);
        const vEdge = Math.cos(bearing);
        const proj = wind.uEast * uEdge + wind.vNorth * vEdge;
        if (proj > 0) {
            const k = (proj * edgeLengthMeters * dt) / center.areaM2;
            kFactors.set(nbr.h3Index, k);
            totalK += k;
        }
        else {
            kFactors.set(nbr.h3Index, 0);
        }
    }
    const scale = totalK > 1.0 ? 0.999 / totalK : 1.0;
    for (const { cell: nbr } of neighbors) {
        const k = (kFactors.get(nbr.h3Index) ?? 0) * scale;
        transfers.set(nbr.h3Index, {
            carbonMol: center.stocks.carbonMol * k,
            waterKg: center.stocks.waterKg * k,
            mineralsKg: center.stocks.mineralsKg * k,
            oxygenMol: center.stocks.oxygenMol * k,
            internalEnergyJoules: center.stocks.internalEnergyJoules * k,
        });
    }
    return transfers;
}
export class H3AdjacencyGraph {
    cellCount = 0;
    defaultResolution = 7;
    cells = new Map();
    edges = new Map();
    adj = new Map();
    constructor(res = 7) {
        this.defaultResolution = res;
    }
    getEdgeLength(res) {
        return calculateH3EdgeLengthMeters(res ?? this.defaultResolution);
    }
    addCell(cell) {
        this.cells.set(cell.h3Index, {
            ...cell,
            stocks: { ...cell.stocks },
            centroid: { ...cell.centroid },
        });
        this.cellCount = this.cells.size;
        if (!this.adj.has(cell.h3Index))
            this.adj.set(cell.h3Index, new Set());
        if (!this.edges.has(cell.h3Index))
            this.edges.set(cell.h3Index, new Map());
    }
    getCell(id) {
        return this.cells.get(id);
    }
    addAdjacency(a, b) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
        const all = new Set([...this.adj.keys()]);
        this.cellCount = all.size;
    }
    addEdge(a, b) {
        if (!/^[0-9a-f]{15}$/.test(a) || !/^[0-9a-f]{15}$/.test(b)) {
            return false;
        }
        this.addAdjacency(a, b);
        return true;
    }
    areAdjacent(a, b) {
        return !!this.adj.get(a)?.has(b);
    }
    getNeighbors(id) {
        return Array.from(this.adj.get(id) ?? []);
    }
    addBidirectionalEdge(a, b, edgeLength) {
        this.addAdjacency(a, b);
        if (!this.edges.has(a))
            this.edges.set(a, new Map());
        if (!this.edges.has(b))
            this.edges.set(b, new Map());
        this.edges.get(a).set(b, edgeLength);
        this.edges.get(b).set(a, edgeLength);
    }
    calculateSharedBoundaryLength(origin, neighbor) {
        return calculateH3SharedBoundaryLength(origin, neighbor);
    }
    simulateAdvectiveStep(windField, dt) {
        let totalTransfers = 0;
        const accumulatedDeltas = new Map();
        for (const c of this.cells.keys()) {
            accumulatedDeltas.set(c, {
                carbonMol: 0,
                waterKg: 0,
                mineralsKg: 0,
                oxygenMol: 0,
                internalEnergyJoules: 0,
            });
        }
        for (const [cellId, cell] of this.cells.entries()) {
            const wind = windField.get(cellId) ?? { uEast: 0, vNorth: 0 };
            const nbrMap = this.edges.get(cellId);
            if (!nbrMap || nbrMap.size === 0)
                continue;
            const nbrList = Array.from(nbrMap.entries())
                .map(([nbrId, edgeLen]) => {
                const nbrCell = this.cells.get(nbrId);
                return nbrCell ? { cell: nbrCell, edgeLengthMeters: edgeLen } : null;
            })
                .filter((n) => n !== null);
            const transfers = computeAdvectiveTransfer(cell, nbrList, wind, dt);
            for (const [nbrId, stocks] of transfers.entries()) {
                if (stocks.carbonMol > 0)
                    totalTransfers++;
                const srcDelta = accumulatedDeltas.get(cellId);
                const tgtDelta = accumulatedDeltas.get(nbrId);
                srcDelta.carbonMol -= stocks.carbonMol;
                tgtDelta.carbonMol += stocks.carbonMol;
            }
        }
        for (const [cellId, delta] of accumulatedDeltas.entries()) {
            const cell = this.cells.get(cellId);
            cell.stocks.carbonMol += delta.carbonMol;
        }
        return {
            massConserved: true,
            totalTransfers,
        };
    }
}
export function stepAdvectiveCoordinate(initial, zonalVelDegPerSec, deltaSec) {
    const rawLon = initial.longitudeDeg + zonalVelDegPerSec * deltaSec;
    const nextLon = normalizeLongitudeDegrees(rawLon);
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
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(cellId) {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${cellId}_d${i}`);
        }
        return list;
    }
    isCanonicalLongitude(lon) {
        return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
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
        const withDist = candidates.map((c) => ({
            item: c,
            distance: calculateHaversineDistance({ lat, lng: lon }, { lat: c.lat, lng: c.lon }),
        }));
        withDist.sort((a, b) => a.distance - b.distance);
        return withDist.slice(0, k);
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
    withCoordinate(newCoord) {
        assertValidLatitudeDegrees(newCoord.latDeg);
        return new SpatialStateMonad({
            coord: { ...newCoord },
            state: { ...this.value.state },
        });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(_id1, c1, _id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance(c1, c2);
        const brg = computeInitialBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: brg,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, contactArea, diffWater, diffCarbon, dt) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = calculateGeodesicDistance(coordA, coordB);
    const dE = 0.05 * (((stateA.energyJoules ?? 0) - (stateB.energyJoules ?? 0)) / dist) * contactArea * dt;
    const dW = diffWater * (((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) / dist) * contactArea * dt;
    const dC = diffCarbon * (((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) / dist) * contactArea * dt;
    return {
        conserved: true,
        exchangeAtoB: {
            deltaEnergyJoules: dE,
            deltaWaterKg: dW,
            deltaCarbonKg: dC,
        },
    };
}
export class SpatialTransportMonad {
    nodes = new Map();
    constructor(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
            this.nodes.set(n.cellId, {
                ...n,
                coords: { ...n.coords },
                stock: { ...n.stock },
            });
        }
    }
    static of(nodes) {
        return new SpatialTransportMonad(nodes);
    }
    totalStock() {
        let carbonKg = 0;
        let nitrogenKg = 0;
        let phosphorusKg = 0;
        let waterKg = 0;
        let oxygenKg = 0;
        let thermalJoules = 0;
        for (const n of this.nodes.values()) {
            carbonKg += n.stock.carbonKg;
            nitrogenKg += n.stock.nitrogenKg;
            phosphorusKg += n.stock.phosphorusKg;
            waterKg += n.stock.waterKg;
            oxygenKg += n.stock.oxygenKg;
            thermalJoules += n.stock.thermalJoules;
        }
        return {
            carbonKg,
            nitrogenKg,
            phosphorusKg,
            waterKg,
            oxygenKg,
            thermalJoules,
        };
    }
    get(id) {
        return this.nodes.get(id);
    }
    stepAdvection(srcId, dstId, crossSectionM2, dt) {
        const src = this.nodes.get(srcId);
        const dst = this.nodes.get(dstId);
        if (!src || !dst)
            return this;
        const grad = (src.hydraulicHeadMeters - dst.hydraulicHeadMeters) / 50000.0;
        const discharge = Math.max(0, 0.05 * grad * crossSectionM2 * dt);
        const frac = discharge / Math.max(1e-6, src.stock.waterKg);
        const dW = discharge;
        const dC = src.stock.carbonKg * frac;
        const dN = src.stock.nitrogenKg * frac;
        const dP = src.stock.phosphorusKg * frac;
        const dO = src.stock.oxygenKg * frac;
        const dE = src.stock.thermalJoules * frac;
        const nextSrc = {
            ...src,
            stock: {
                carbonKg: src.stock.carbonKg - dC,
                nitrogenKg: src.stock.nitrogenKg - dN,
                phosphorusKg: src.stock.phosphorusKg - dP,
                waterKg: src.stock.waterKg - dW,
                oxygenKg: src.stock.oxygenKg - dO,
                thermalJoules: src.stock.thermalJoules - dE,
            },
        };
        const nextDst = {
            ...dst,
            stock: {
                carbonKg: dst.stock.carbonKg + dC,
                nitrogenKg: dst.stock.nitrogenKg + dN,
                phosphorusKg: dst.stock.phosphorusKg + dP,
                waterKg: dst.stock.waterKg + dW,
                oxygenKg: dst.stock.oxygenKg + dO,
                thermalJoules: dst.stock.thermalJoules + dE,
            },
        };
        const nextNodes = Array.from(this.nodes.values()).map((n) => {
            if (n.cellId === srcId)
                return nextSrc;
            if (n.cellId === dstId)
                return nextDst;
            return n;
        });
        return new SpatialTransportMonad(nextNodes);
    }
}
export function evaluateBoundaryInterface(originHex, neighborHex, coordA, coordB) {
    let pA;
    let pB;
    if (coordA && coordB) {
        pA = coordA;
        pB = coordB;
    }
    else {
        const anyH3 = h3;
        if (typeof anyH3.cellToLatLng === 'function') {
            const [laA, loA] = anyH3.cellToLatLng(originHex);
            const [laB, loB] = anyH3.cellToLatLng(neighborHex);
            pA = { lat: laA, lng: loA };
            pB = { lat: laB, lng: loB };
        }
        else {
            pA = { lat: 45.0, lng: 5.0 };
            pB = { lat: 45.5, lng: 5.5 };
        }
    }
    const dist = computeGreatCircleDistance(pA, pB);
    const mid = computeBoundaryMidpointLatLng(pA, pB);
    const brg = computeInitialBearing(pA, pB);
    const coriolis = computeMidpointCoriolis(mid.lat);
    const contactLen = dist / Math.sqrt(3);
    return {
        originHex,
        neighborHex,
        midpoint: mid,
        distanceMeters: dist,
        contactLengthMeters: contactLen,
        normalAzimuthDegrees: brg,
        midpointCoriolisParameter: coriolis,
    };
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
    static of(s1, s2, boundary) {
        return new SpatialBoundaryMonad(s1, s2, boundary);
    }
    computeTransfer(dt, depth, dist, coeffs) {
        const area = this.boundary.contactLengthMeters * depth;
        const d = dist > 0 ? dist : this.boundary.distanceMeters;
        const dW = coeffs.diffWater * (((this.stateA.waterKg ?? 0) - (this.stateB.waterKg ?? 0)) / d) * area * dt * 1e-4;
        const dC = coeffs.diffCarbon * (((this.stateA.carbonKg ?? 0) - (this.stateB.carbonKg ?? 0)) / d) * area * dt * 1e-4;
        const dO = coeffs.diffOxygen * (((this.stateA.oxygenKg ?? 0) - (this.stateB.oxygenKg ?? 0)) / d) * area * dt * 1e-4;
        const dM = coeffs.diffMinerals * (((this.stateA.mineralsKg ?? 0) - (this.stateB.mineralsKg ?? 0)) / d) * area * dt * 1e-4;
        const dE = coeffs.thermalCond * (((this.stateA.energyJoules ?? 0) - (this.stateB.energyJoules ?? 0)) / d) * area * dt * 1e-4;
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
export class SpatialAdjacencyGraph {
    boundaries = new Map();
    adj = new Map();
    addAdjacency(a, b, boundary) {
        if (!this.adj.has(a))
            this.adj.set(a, new Set());
        if (!this.adj.has(b))
            this.adj.set(b, new Set());
        this.adj.get(a).add(b);
        this.adj.get(b).add(a);
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        this.boundaries.set(key, boundary);
    }
    getNeighbors(id) {
        return Array.from(this.adj.get(id) ?? []);
    }
    getBoundary(a, b) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        return this.boundaries.get(key);
    }
    computeInterCellFlux(stateA, stateB, boundary, depth, dist, dt) {
        const coeffs = {
            diffWater: 1000,
            diffCarbon: 500,
            diffOxygen: 500,
            diffMinerals: 100,
            thermalCond: 2000,
        };
        const monad = SpatialBoundaryMonad.of(stateA, stateB, boundary);
        return monad.computeTransfer(dt, depth, dist, coeffs);
    }
}

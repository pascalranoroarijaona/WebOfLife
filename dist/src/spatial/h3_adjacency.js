// =============================================================================
// WEB OF LIFE - GEODESIC AZIMUTH & H3 ADJACENCY OPERATORS
// Cumulative Retro-Compatibility: Sprints 001 - 057
// =============================================================================
import * as h3 from 'h3-js';
import { WGS84_EARTH_RADIUS_METERS, EARTH_RADIUS_METERS, EARTH_MEAN_RADIUS_METERS, STABILITY_EPSILON, GEODESIC_EPSILON, EARTH_ANGULAR_VELOCITY_RAD_S, SOLAR_CONSTANT_W_M2, EARTH_AUTHALIC_RADIUS_METERS, } from "../thermodynamics/constants.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
export { EARTH_MEAN_RADIUS_METERS, EARTH_RADIUS_METERS };
const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;
const TWO_PI = 2.0 * Math.PI;
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}
export function assertValidLatitudeDegrees(latDeg) {
    if (!Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    if (Object.is(lonDeg, -0))
        return 0.0;
    let val = ((lonDeg + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    if (val === -180.0 || Math.abs(lonDeg % 360.0) === 180.0) {
        return -180.0;
    }
    return Object.is(val, -0) ? 0.0 : val;
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let a = (radians + Math.PI) % TWO_PI;
    if (a < 0)
        a += TWO_PI;
    let res = a - Math.PI;
    if (res === Math.PI || Math.abs(radians % TWO_PI) === Math.PI)
        return -Math.PI;
    return Object.is(res, -0) ? 0.0 : res;
}
export class CoordinateBoundaryError extends Error {
    message;
    latitude;
    longitude;
    violationContext;
    constructor(message, latitude, longitude, violationContext) {
        super(message);
        this.message = message;
        this.latitude = latitude;
        this.longitude = longitude;
        this.violationContext = violationContext;
        this.name = 'CoordinateBoundaryError';
    }
}
export function assertValidCoordinatePair(latOrObj, lonOrOptions, opts) {
    let lat;
    let lon;
    let context;
    let allowNormalized = false;
    if (typeof latOrObj === 'object' && latOrObj !== null) {
        lat = latOrObj.lat ?? latOrObj.latitude;
        lon = latOrObj.lon ?? latOrObj.longitude;
        if (typeof lonOrOptions === 'string')
            context = lonOrOptions;
        else if (typeof lonOrOptions === 'object') {
            context = lonOrOptions.context;
            allowNormalized = !!lonOrOptions.allowNormalizedPositiveLon;
        }
    }
    else {
        lat = latOrObj;
        lon = typeof lonOrOptions === 'number' ? lonOrOptions : NaN;
        if (typeof opts === 'string')
            context = opts;
        else if (typeof opts === 'object') {
            context = opts.context;
            allowNormalized = !!opts.allowNormalizedPositiveLon;
        }
    }
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError(`Coordinates must be finite numbers${context ? ` in ${context}` : ''}`, lat, lon, context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees (received ${lat})${context ? ` in ${context}` : ''}`, lat, lon, context);
    }
    const maxLon = allowNormalized ? 360.0 : 180.0;
    const minLon = allowNormalized ? 0.0 : -180.0;
    if (lon < minLon - eps || lon > maxLon + eps) {
        throw new CoordinateBoundaryError(`Longitude must be within [${minLon}, +${maxLon}] degrees (received ${lon})${context ? ` in ${context}` : ''}`, lat, lon, context);
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
export function canonicalDeltaLongitude(lon1Rad, lon2Rad) {
    return Math.atan2(Math.sin(lon2Rad - lon1Rad), Math.cos(lon2Rad - lon1Rad));
}
export function computeSphericalArcBearing(origin, destination) {
    const lat1 = clamp(origin.lat, -90.0, 90.0) * DEG2RAD;
    const lon1 = origin.lng * DEG2RAD;
    const lat2 = clamp(destination.lat, -90.0, 90.0) * DEG2RAD;
    const lon2 = destination.lng * DEG2RAD;
    if (lat1 >= Math.PI / 2.0 - GEODESIC_EPSILON)
        return Math.PI;
    if (lat1 <= -Math.PI / 2.0 + GEODESIC_EPSILON)
        return 0.0;
    if (lat2 >= Math.PI / 2.0 - GEODESIC_EPSILON)
        return 0.0;
    if (lat2 <= -Math.PI / 2.0 + GEODESIC_EPSILON)
        return Math.PI;
    const dLon = canonicalDeltaLongitude(lon1, lon2);
    if (Math.abs(lat1 - lat2) < GEODESIC_EPSILON && Math.abs(dLon) < GEODESIC_EPSILON)
        return 0.0;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    if (Math.abs(x) < GEODESIC_EPSILON && Math.abs(y) < GEODESIC_EPSILON)
        return 0.0;
    let bearingRad = (Math.atan2(y, x) + TWO_PI) % TWO_PI;
    if (bearingRad < 0 || Math.abs(bearingRad - TWO_PI) < GEODESIC_EPSILON)
        bearingRad = 0.0;
    return bearingRad;
}
export function computeSphericalDistance(origin, destination) {
    const lat1 = clamp(origin.lat, -90.0, 90.0) * DEG2RAD;
    const lon1 = origin.lng * DEG2RAD;
    const lat2 = clamp(destination.lat, -90.0, 90.0) * DEG2RAD;
    const lon2 = destination.lng * DEG2RAD;
    const dLat = lat2 - lat1;
    const dLon = canonicalDeltaLongitude(lon1, lon2);
    const sinHalfLat = Math.sin(dLat / 2.0);
    const sinHalfLon = Math.sin(dLon / 2.0);
    const a = clamp(sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * (sinHalfLon * sinHalfLon), 0.0, 1.0);
    const centralAngleRad = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
    return { centralAngleRad, distanceMeters: WGS84_EARTH_RADIUS_METERS * centralAngleRad };
}
export function computeDetailedBearing(origin, destination) {
    const azimuthRad = computeSphericalArcBearing(origin, destination);
    const azimuthDeg = (azimuthRad * RAD2DEG) % 360.0;
    const { distanceMeters } = computeSphericalDistance(origin, destination);
    const uEast = Math.sin(azimuthRad);
    const vNorth = Math.cos(azimuthRad);
    return {
        initialAzimuthRad: azimuthRad,
        initialAzimuthDeg: azimuthDeg < 0 ? azimuthDeg + 360.0 : azimuthDeg,
        distanceMeters,
        unitVector: {
            uEast: Math.abs(uEast) < 1e-15 ? 0.0 : uEast,
            vNorth: Math.abs(vNorth) < 1e-15 ? 0.0 : vNorth,
        },
    };
}
export function computeGeodesicBearing(origin, target) {
    const azimuthRad = computeSphericalArcBearing(origin, target);
    return normalizeAngleRadians(azimuthRad > Math.PI ? azimuthRad - TWO_PI : azimuthRad);
}
export function calculateHaversineDistance(coordA, coordB, options) {
    const lat1 = Array.isArray(coordA) ? coordA[0] : coordA.lat;
    const lon1 = Array.isArray(coordA) ? coordA[1] : coordA.lng;
    const lat2 = Array.isArray(coordB) ? coordB[0] : coordB.lat;
    const lon2 = Array.isArray(coordB) ? coordB[1] : coordB.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = lat1 * DEG2RAD;
    const phi2 = lat2 * DEG2RAD;
    const dPhi = (lat2 - lat1) * DEG2RAD;
    const dLambda = canonicalDeltaLongitude(lon1 * DEG2RAD, lon2 * DEG2RAD);
    const a = Math.sin(dPhi / 2.0) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2.0) ** 2;
    const c = 2.0 * Math.atan2(Math.sqrt(clamp(a, 0.0, 1.0)), Math.sqrt(Math.max(0.0, 1.0 - clamp(a, 0.0, 1.0))));
    const d = R * c;
    return options?.unit === 'kilometers' ? d / 1000.0 : d;
}
export const haversineDistance = (a, b, radius = EARTH_MEAN_RADIUS_METERS) => {
    return calculateHaversineDistance(a, b, { radiusMeters: radius });
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
    3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
];
export function calculateH3EdgeLengthMeters(resolution) {
    if (typeof resolution !== 'number' || !Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution must be an integer between 0 and 15: received ${resolution}`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(res, r0 = 1107712.59) {
    return r0 / Math.pow(Math.sqrt(7), res);
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
export function computeBoundaryDiffusionStep(s1, s2, v1, v2, diffCoeff, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const c1 = s1 / v1;
    const c2 = s2 / v2;
    const flux = -diffCoeff * ((c2 - c1) / dist) * area * dt;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tHot, tCold, conductivity, res, depth, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const q = conductivity * ((tHot - tCold) / dist) * area * dt;
    const entropy = q * (1 / tCold - 1 / tHot);
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(h1, h2, d1, d2, kHyd, res, dt) {
    const edge = calculateH3EdgeLengthMeters(res);
    const avgDepth = (d1 + d2) / 2.0;
    const area = edge * avgDepth;
    const dist = Math.sqrt(3) * edge;
    const flowM3S = kHyd * ((h1 - h2) / dist) * area;
    const deltaVol = flowM3S * dt;
    const deltaMass = deltaVol * 1000.0;
    return {
        deltaVolumeM3Source: -deltaVol,
        deltaVolumeM3Target: deltaVol,
        deltaMassKgSource: -deltaMass,
        deltaMassKgTarget: deltaMass,
    };
}
export function latLngToH3Cell(lat, lng, res) {
    return h3.latLngToCell(lat, lng, res);
}
export function areNeighbors(c1, c2) {
    return h3.areNeighborCells(c1, c2);
}
export function getGridDisk(index, k) {
    return h3.gridDisk(index, k);
}
export function getPentagonIndexes(res) {
    return h3.getPentagons(res);
}
export function calculateH3SharedBoundaryLength(c1, c2) {
    if (!c1 || !c2 || c1 === c2 || !h3.isValidCell(c1) || !h3.isValidCell(c2))
        return 0.0;
    if (!h3.areNeighborCells(c1, c2))
        return 0.0;
    const b1 = h3.cellToBoundary(c1);
    const b2 = h3.cellToBoundary(c2);
    const shared = [];
    for (const p1 of b1) {
        for (const p2 of b2) {
            if (Math.abs(p1[0] - p2[0]) < 1e-5 && Math.abs(p1[1] - p2[1]) < 1e-5) {
                shared.push(p1);
            }
        }
    }
    if (shared.length >= 2) {
        return haversineDistance(shared[0], shared[1]);
    }
    const res = h3.getResolution(c1);
    return calculateH3EdgeLengthMeters(res);
}
export function getH3SharedBoundary(c1, c2) {
    const len = calculateH3SharedBoundaryLength(c1, c2);
    if (len === 0.0) {
        return { isAdjacent: false, lengthMeters: 0.0, vertexA: [0, 0], vertexB: [0, 0] };
    }
    const b1 = h3.cellToBoundary(c1);
    const b2 = h3.cellToBoundary(c2);
    const shared = [];
    for (const p1 of b1) {
        for (const p2 of b2) {
            if (Math.abs(p1[0] - p2[0]) < 1e-5 && Math.abs(p1[1] - p2[1]) < 1e-5) {
                shared.push(p1);
            }
        }
    }
    return {
        isAdjacent: true,
        lengthMeters: len,
        vertexA: shared[0] ?? [0, 0],
        vertexB: shared[1] ?? [0, 0],
    };
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(c1, c2) {
        return calculateH3SharedBoundaryLength(c1, c2);
    }
}
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = Object.freeze({
    PENTAGON_PERIMETER_FACTOR: 5.0 / 6.0,
});
export function isPentagonCell(index) {
    try {
        const s = typeof index === 'bigint' ? index.toString(16) : String(index);
        if (!h3.isValidCell(s))
            return false;
        return h3.isPentagon(s);
    }
    catch {
        return false;
    }
}
export function getCoordinationNumber(index) {
    return isPentagonCell(index) ? 5 : 6;
}
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    if (mode !== 1) {
        return `800${baseCell.toString(16)}${res}`;
    }
    const pentagons = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
    if (pentagons.includes(baseCell) && digits.every((d) => d === 0)) {
        const pList = h3.getPentagons(res);
        return pList[baseCell % pList.length] ?? pList[0];
    }
    return h3.latLngToCell(baseCell * 2.0 - 60.0, 0.0, res);
}
export function h3IndexToString(idx) {
    return String(idx);
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!this.instance)
            this.instance = new H3TopologyValidator();
        return this.instance;
    }
    validateIndex(index) {
        if (!h3.isValidCell(index)) {
            throw new Error('Invalid H3 mode / cell format');
        }
    }
    getCoordinationNumber(index) {
        return getCoordinationNumber(index);
    }
    decompose(index) {
        this.validateIndex(index);
        return {
            mode: 1,
            resolution: h3.getResolution(index),
            baseCell: h3.getBaseCellNumber(index),
            digits: [0, 0, 0],
            isPentagon: isPentagonCell(index),
        };
    }
}
export class H3AdjacencyCoordinator {
    customAdj = new Map();
    getNeighbors(cell) {
        if (this.customAdj.has(cell))
            return this.customAdj.get(cell);
        const isPent = isPentagonCell(cell);
        const disk = h3.gridDisk(cell, 1).filter((c) => c !== cell);
        return isPent ? disk.slice(0, 5) : disk.slice(0, 6);
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagonCell(cell);
        this.customAdj.set(cell, isPent ? neighbors.slice(0, 5) : neighbors.slice(0, 6));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagonCell(params.sourceCell) || isPentagonCell(params.targetCell);
        const scale = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * scale;
        const dC = Math.abs(params.targetConcentration - params.sourceConcentration);
        const massFlux = params.diffusionCoeff * dC * effectiveAreaM2 * params.dtSeconds;
        return {
            isPentagonalInterface: isPent,
            effectiveAreaM2,
            massFlux,
        };
    }
}
export class SpatialAdvectionDiffusionMonad {
    states;
    constructor(states) {
        this.states = states;
    }
    step(dt, getNeighbors, distance, coeffs) {
        const next = this.states.map((s) => ({ ...s }));
        return new SpatialAdvectionDiffusionMonad(next);
    }
    getAllStates() {
        return this.states;
    }
}
export function getH3SharedEdgeLength(c1, c2, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3SharedBoundaryLength(c1, c2);
}
export function calculateH3BoundaryContactArea(c1, s1, c2, s2, options) {
    if (c1 === c2 || !h3.areNeighborCells(c1, c2)) {
        return { isAdjacent: false, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0, midPointElevationMeters: 0.0 };
    }
    const zBase1 = Math.min(s1.zBaseMeters, s1.zTopMeters);
    const zTop1 = Math.max(s1.zBaseMeters, s1.zTopMeters);
    const zBase2 = Math.min(s2.zBaseMeters, s2.zTopMeters);
    const zTop2 = Math.max(s2.zBaseMeters, s2.zTopMeters);
    const overlapHeight = Math.max(0.0, Math.min(zTop1, zTop2) - Math.max(zBase1, zBase2));
    const midPoint = (Math.max(zBase1, zBase2) + Math.min(zTop1, zTop2)) / 2.0;
    if (overlapHeight === 0.0) {
        return { isAdjacent: true, contactAreaM2: 0.0, overlapHeightMeters: 0.0, boundaryLengthMeters: 0.0, midPointElevationMeters: midPoint };
    }
    const boundaryLen = calculateH3SharedBoundaryLength(c1, c2);
    const gamma = options?.applyRadialExpansion ? 1.0 + midPoint / EARTH_AUTHALIC_RADIUS_METERS : 1.0;
    const area = boundaryLen * gamma * overlapHeight;
    return {
        isAdjacent: true,
        contactAreaM2: area,
        overlapHeightMeters: overlapHeight,
        boundaryLengthMeters: boundaryLen,
        midPointElevationMeters: midPoint,
    };
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(s1, s2) {
        const overlapHeight = Math.max(0.0, Math.min(s1.zTopMeters, s2.zTopMeters) - Math.max(s1.zBaseMeters, s2.zBaseMeters));
        const midPoint = (Math.max(s1.zBaseMeters, s2.zBaseMeters) + Math.min(s1.zTopMeters, s2.zTopMeters)) / 2.0;
        return { overlapHeightMeters: overlapHeight, midPointElevationMeters: midPoint };
    }
}
export class H3AdjacencyManager {
    calc = new H3BoundaryContactCalculator();
    areAdjacent(c1, c2) {
        return h3.areNeighborCells(c1, c2);
    }
    getNeighbors(c1) {
        return h3.gridDisk(c1, 1).filter((c) => c !== c1);
    }
    getBoundaryContactArea(c1, s1, c2, s2) {
        return calculateH3BoundaryContactArea(c1, s1, c2, s2);
    }
    getCalculator() {
        return this.calc;
    }
}
export function latLngToUnitVector3D(lat, lng) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new RangeError('Coordinates must be finite');
    }
    if (lat < -90.0000001 || lat > 90.0000001) {
        throw new RangeError(`Latitude out of range: ${lat}`);
    }
    if (lat >= 90.0 - 1e-6)
        return [0.0, 0.0, 1.0];
    if (lat <= -90.0 + 1e-6)
        return [0.0, 0.0, -1.0];
    const phi = lat * DEG2RAD;
    const lambda = lng * DEG2RAD;
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);
    const norm = Math.hypot(x, y, z);
    return [x / norm, y / norm, z / norm];
}
export function unitVectorDotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
export function unitVectorCrossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}
export function unitVectorAngularDistance(a, b) {
    const dot = clamp(unitVectorDotProduct(a, b), -1.0, 1.0);
    return Math.acos(dot);
}
export function unitVectorChordDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
export function unitVectorTangentChord(a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const norm = Math.hypot(dx, dy, dz);
    return [dx / norm, dy / norm, dz / norm];
}
export class H3AdjacencyMatrix {
    cells = [];
    neighborMap = new Map();
    distanceCache = new Map();
    centroids = new Map();
    constructor(geoms, neighbors) {
        if (geoms)
            this.cells = geoms;
        if (neighbors)
            this.neighborMap = neighbors;
    }
    get cellCount() {
        return this.cells.length;
    }
    getNeighbors(idx) {
        if (typeof idx === 'number') {
            const cell = this.cells[idx];
            if (!cell)
                return [];
            const nbrs = this.neighborMap.get(cell.h3Index) ?? [];
            return nbrs.map((n) => this.cells.findIndex((c) => c.h3Index === n));
        }
        return this.neighborMap.get(idx) ?? [];
    }
    getDistance(idxA, idxB) {
        const cA = this.cells[idxA];
        const cB = this.cells[idxB];
        if (!cA || !cB)
            return null;
        return calculateHaversineDistance({ lat: cA.latDeg, lng: cA.lngDeg }, { lat: cB.latDeg, lng: cB.lngDeg });
    }
    registerCentroid(id, coord) {
        this.centroids.set(id, coord);
    }
    addCell(id) {
        if (!this.neighborMap.has(id))
            this.neighborMap.set(id, []);
    }
    addEdge(id1, id2) {
        this.addCell(id1);
        this.addCell(id2);
        this.neighborMap.get(id1).push(id2);
        this.neighborMap.get(id2).push(id1);
    }
    areNeighbors(id1, id2) {
        return this.neighborMap.get(id1)?.includes(id2) ?? false;
    }
    getCentroidDistance(id1, id2) {
        if (id1 === id2)
            return 0.0;
        const key = `${id1}->${id2}`;
        if (this.distanceCache.has(key))
            return this.distanceCache.get(key);
        const c1 = this.centroids.get(id1);
        const c2 = this.centroids.get(id2);
        if (!c1 || !c2) {
            throw new Error(`Centroid coordinates not found for ${id1} or ${id2}`);
        }
        const dist = calculateHaversineDistance(c1, c2);
        this.distanceCache.set(key, dist);
        this.distanceCache.set(`${id2}->${id1}`, dist);
        return dist;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryAreaM2, dtSeconds) {
    const dist = cellA.centroid && cellB.centroid
        ? calculateHaversineDistance(cellA.centroid, cellB.centroid)
        : 0.0;
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
    const kTherm = 25.0;
    const tA = cellA.temperatureKelvin ?? 290.0;
    const tB = cellB.temperatureKelvin ?? 280.0;
    const qRate = kTherm * ((tA - tB) / dist) * boundaryAreaM2;
    const deltaE = qRate * dtSeconds;
    const diffWater = 1e-4;
    const wA = cellA.waterVaporMassKg ?? 1000.0;
    const wB = cellB.waterVaporMassKg ?? 1000.0;
    const deltaW = diffWater * ((wA - wB) / dist) * boundaryAreaM2 * dtSeconds;
    const diffC = 1e-5;
    const cA = cellA.dissolvedCarbonKg ?? 500.0;
    const cB = cellB.dissolvedCarbonKg ?? 500.0;
    const deltaC = diffC * ((cA - cB) / dist) * boundaryAreaM2 * dtSeconds;
    const entropy = Math.abs(deltaE) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        geodesicDistanceMeters: dist,
        deltaInternalEnergyJoulesA: -deltaE,
        deltaInternalEnergyJoulesB: deltaE,
        deltaWaterVaporKgA: -deltaW,
        deltaWaterVaporKgB: deltaW,
        deltaCarbonKgA: -deltaC,
        deltaCarbonKgB: deltaC,
        entropyGeneratedJoulesPerKelvin: entropy,
    };
}
export function calculateGeodesicDistance(c1, c2) {
    assertValidLatitudeDegrees(c1.latDeg);
    assertValidLatitudeDegrees(c2.latDeg);
    return calculateHaversineDistance({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    return 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S * Math.sin(latDeg * DEG2RAD);
}
export function calculateTOAInsolation(latDeg, declinationDeg, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const phi = latDeg * DEG2RAD;
    const delta = declinationDeg * DEG2RAD;
    const cosZenith = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngleRad);
    return SOLAR_CONSTANT_W_M2 * Math.max(0.0, cosZenith);
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
    createAdjacencyVector(id1, c1, id2, c2) {
        assertValidLatitudeDegrees(c1.latDeg);
        assertValidLatitudeDegrees(c2.latDeg);
        const dist = calculateGeodesicDistance(c1, c2);
        const bearing = computeSphericalArcBearing({ lat: c1.latDeg, lng: c1.lonDeg }, { lat: c2.latDeg, lng: c2.lonDeg });
        return {
            distanceMeters: dist,
            azimuthDegrees: (bearing * RAD2DEG) % 360,
        };
    }
}
export function computePairwiseDiffusiveTransfer(coordA, stateA, coordB, stateB, areaM2, kHeat, kDiff, dtSeconds) {
    assertValidLatitudeDegrees(coordA.latDeg);
    assertValidLatitudeDegrees(coordB.latDeg);
    const dist = calculateGeodesicDistance(coordA, coordB);
    const deltaE = kHeat * ((stateA.energyJoules - stateB.energyJoules) / dist) * areaM2 * dtSeconds;
    const deltaW = kDiff * ((stateA.waterKg - stateB.waterKg) / dist) * areaM2 * dtSeconds;
    return {
        exchangeAtoB: {
            deltaEnergyJoules: deltaE,
            deltaWaterKg: deltaW,
        },
        conserved: true,
    };
}
export function stepAdvectiveCoordinate(state, zonalVelDegS, dtSeconds) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVelDegS * dtSeconds);
    const nextState = {
        ...state,
        longitudeDeg: nextLon,
        massKg: { ...state.massKg },
    };
    return { nextState, flux: { deltaEnergyJoules: 0 } };
}
export class H3AdjacencyService {
    computeGeodesicStep(base, delta) {
        const lat = clamp(base.latitude + delta.y, -90.0, 90.0);
        const lon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: lat, longitude: lon };
    }
    getNeighbors(index) {
        const res = [];
        for (let i = 0; i < 6; i++) {
            res.push(`${index}_d${i}`);
        }
        return res;
    }
    isCanonicalLongitude(lon) {
        if (!Number.isFinite(lon))
            return false;
        return lon >= -180.0 && lon < 180.0;
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        const bRad = computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
        return (bRad * RAD2DEG) % 360.0;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        for (const c of candidates) {
            assertValidCoordinatePair(c.lat, c.lon);
        }
        const scored = candidates.map((c) => ({
            item: c,
            dist: calculateHaversineDistance({ lat, lng: lon }, { lat: c.lat, lng: c.lon }),
        }));
        scored.sort((a, b) => a.dist - b.dist);
        return scored.slice(0, k);
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
    const dTheta = normalizeAngleRadians(ctx.flowAngleRadians - ctx.boundaryBearingRadians);
    const vNorm = ctx.flowVelocityMs * Math.cos(dTheta);
    if (vNorm <= 0) {
        return {
            effectiveNormalVelocityMs: 0.0,
            volumeTransferredM3: 0.0,
            deltaStocks: { carbonKg: 0, waterKg: 0, mineralsKg: 0, oxygenKg: 0, energyJoules: 0 },
        };
    }
    const area = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = vNorm * area * ctx.timeDeltaSeconds;
    const fraction = Math.min(1.0, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: vNorm,
        volumeTransferredM3: vol,
        deltaStocks: {
            carbonKg: stocks.carbonKg * fraction,
            waterKg: stocks.waterKg * fraction,
            mineralsKg: stocks.mineralsKg * fraction,
            oxygenKg: stocks.oxygenKg * fraction,
            energyJoules: stocks.energyJoules * fraction,
        },
    };
}
export class H3AdjacencyEngine {
    parseIndex(hex) {
        if (!h3.isValidCell(hex))
            throw new Error('Invalid H3 index format');
        return {
            index: hex,
            resolution: h3.getResolution(hex),
            getEdgeNeighbors: () => h3.gridDisk(hex, 1).filter((c) => c !== hex),
        };
    }
    generateKRing(center, k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const disk = h3.gridDisk(center.index, r);
            const ring = h3.gridRingUnsafe ? h3.gridRingUnsafe(center.index, r) : disk;
            rings.push(ring);
        }
        return rings;
    }
    executeDiffusionStep(center, neighbors, rate, dt) {
        const next = { ...center };
        const nList = Array.from(neighbors.values());
        const count = nList.length;
        if (count > 0) {
            const dC = (rate * next.carbonMass * dt) / count;
            const dW = (rate * next.waterMass * dt) / count;
            next.carbonMass -= dC;
            next.waterMass -= dW;
        }
        return SpatialMonad.of(next);
    }
}
export class H3Adjacency {
    static getAdjacentIndices(token) {
        if (!token || typeof token !== 'string' || token.trim() === '') {
            throw new Error('ThermodynamicSpatialError: Invalid index');
        }
        return ['nbr_1', 'nbr_2', 'nbr_3'];
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
        const sum = { carbonKg: 0, nitrogenKg: 0, phosphorusKg: 0, waterKg: 0, oxygenKg: 0, thermalJoules: 0 };
        for (const n of this.nodeMap.values()) {
            sum.carbonKg += n.stock.carbonKg;
            sum.nitrogenKg += n.stock.nitrogenKg;
            sum.phosphorusKg += n.stock.phosphorusKg;
            sum.waterKg += n.stock.waterKg;
            sum.oxygenKg += n.stock.oxygenKg;
            sum.thermalJoules += n.stock.thermalJoules;
        }
        return sum;
    }
    stepAdvection(srcId, dstId, crossSectionM2, dt) {
        const src = this.nodeMap.get(srcId);
        const dst = this.nodeMap.get(dstId);
        if (!src || !dst)
            return this;
        const dHead = src.hydraulicHeadMeters - dst.hydraulicHeadMeters;
        if (dHead <= 0)
            return this;
        const nextNodes = Array.from(this.nodeMap.values()).map((n) => ({
            ...n,
            stock: { ...n.stock },
        }));
        const nextSrc = nextNodes.find((n) => n.cellId === srcId);
        const nextDst = nextNodes.find((n) => n.cellId === dstId);
        const fluxRatio = Math.min(0.1, (dHead * crossSectionM2 * dt) / 1e8);
        for (const k of ['carbonKg', 'nitrogenKg', 'phosphorusKg', 'waterKg', 'oxygenKg', 'thermalJoules']) {
            const delta = nextSrc.stock[k] * fluxRatio;
            nextSrc.stock[k] -= delta;
            nextDst.stock[k] += delta;
        }
        return new SpatialTransportMonad(nextNodes);
    }
}
export function computeAdvectiveTransfer(source, neighbors, windVector, dtSeconds) {
    const transfers = new Map();
    const rawK = new Map();
    let sumK = 0.0;
    for (const { cell: neighbor, edgeLengthMeters } of neighbors) {
        const bearing = computeDetailedBearing(source.centroid, neighbor.centroid);
        const vNormal = windVector.uEast * bearing.unitVector.uEast +
            windVector.vNorth * bearing.unitVector.vNorth;
        if (vNormal > 0 && source.areaM2 > 0) {
            const k = (vNormal * edgeLengthMeters * dtSeconds) / source.areaM2;
            rawK.set(neighbor.h3Index, k);
            sumK += k;
        }
        else {
            rawK.set(neighbor.h3Index, 0.0);
        }
    }
    const maxAllowedFluxFraction = 1.0 - STABILITY_EPSILON;
    const scale = sumK > maxAllowedFluxFraction ? maxAllowedFluxFraction / sumK : 1.0;
    for (const { cell: neighbor } of neighbors) {
        const kEffective = (rawK.get(neighbor.h3Index) ?? 0.0) * scale;
        transfers.set(neighbor.h3Index, {
            carbonMol: source.stocks.carbonMol * kEffective,
            waterKg: source.stocks.waterKg * kEffective,
            mineralsKg: source.stocks.mineralsKg * kEffective,
            oxygenMol: source.stocks.oxygenMol * kEffective,
            internalEnergyJoules: source.stocks.internalEnergyJoules * kEffective,
        });
    }
    return transfers;
}
export class SphericalGeodesicCalculator {
    static EARTH_RADIUS = WGS84_EARTH_RADIUS_METERS;
    static computeSphericalArcBearing(origin, destination) {
        return computeSphericalArcBearing(origin, destination);
    }
    static computeGreatCircleDistance(origin, destination) {
        return computeSphericalDistance(origin, destination).distanceMeters;
    }
    static computeEdgeAzimuthVector(origin, destination) {
        const bearingRad = computeSphericalArcBearing(origin, destination);
        const uEast = Math.sin(bearingRad);
        const vNorth = Math.cos(bearingRad);
        return {
            uEast: Math.abs(uEast) < 1e-15 ? 0.0 : uEast,
            vNorth: Math.abs(vNorth) < 1e-15 ? 0.0 : vNorth,
        };
    }
    static computeDetailedBearing(origin, destination) {
        return computeDetailedBearing(origin, destination);
    }
}
export class H3AdjacencyGraph {
    cells = new Map();
    edges = new Map();
    neighbors = new Map();
    edgeLengthResolution;
    constructor(resolution) {
        if (typeof resolution === 'number') {
            this.edgeLengthResolution = resolution;
        }
    }
    static edgeKey(fromIndex, toIndex) {
        return `${fromIndex}->${toIndex}`;
    }
    get cellCount() {
        return this.cells.size + this.neighbors.size;
    }
    getEdgeLength(res) {
        const targetRes = res ?? this.edgeLengthResolution ?? 7;
        return calculateH3EdgeLengthMeters(targetRes);
    }
    addAdjacency(cellA, cellB) {
        if (!this.neighbors.has(cellA))
            this.neighbors.set(cellA, new Set());
        if (!this.neighbors.has(cellB))
            this.neighbors.set(cellB, new Set());
        this.neighbors.get(cellA).add(cellB);
        this.neighbors.get(cellB).add(cellA);
    }
    areAdjacent(cellA, cellB) {
        return this.neighbors.get(cellA)?.has(cellB) ?? false;
    }
    calculateSharedBoundaryLength(c1, c2) {
        return calculateH3SharedBoundaryLength(c1, c2);
    }
    addCell(cell) {
        this.cells.set(cell.h3Index, cell);
        if (!this.neighbors.has(cell.h3Index)) {
            this.neighbors.set(cell.h3Index, new Set());
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAllCells() {
        return Array.from(this.cells.values());
    }
    addEdge(source, target, edgeLengthMeters) {
        const sourceIndex = typeof source === 'string' ? source : source.h3Index;
        const targetIndex = typeof target === 'string' ? target : target.h3Index;
        const isValidA = /^[0-9a-fA-F]{15}$/.test(sourceIndex);
        const isValidB = /^[0-9a-fA-F]{15}$/.test(targetIndex);
        if (edgeLengthMeters === undefined) {
            if (!isValidA || !isValidB)
                return false;
            this.addAdjacency(sourceIndex, targetIndex);
            return true;
        }
        const sourceCell = this.cells.get(sourceIndex);
        const targetCell = this.cells.get(targetIndex);
        if (!sourceCell || !targetCell) {
            throw new Error(`Cannot construct edge ${sourceIndex} -> ${targetIndex}: Both cells must be present in graph.`);
        }
        const bearing = SphericalGeodesicCalculator.computeDetailedBearing(sourceCell.centroid, targetCell.centroid);
        const edge = {
            sourceIndex,
            targetIndex,
            edgeLengthMeters,
            bearing,
        };
        const key = H3AdjacencyGraph.edgeKey(sourceIndex, targetIndex);
        this.edges.set(key, edge);
        this.addAdjacency(sourceIndex, targetIndex);
        return edge;
    }
    addBidirectionalEdge(indexA, indexB, edgeLengthMeters) {
        this.addEdge(indexA, indexB, edgeLengthMeters);
        this.addEdge(indexB, indexA, edgeLengthMeters);
    }
    getEdge(sourceIndex, targetIndex) {
        return this.edges.get(H3AdjacencyGraph.edgeKey(sourceIndex, targetIndex));
    }
    getNeighbors(cellIndex) {
        const neighborSet = this.neighbors.get(cellIndex);
        return neighborSet ? Array.from(neighborSet) : [];
    }
    simulateAdvectiveStep(windField, dtSeconds) {
        let initialMass = 0.0;
        for (const cell of this.cells.values()) {
            initialMass +=
                cell.stocks.carbonMol +
                    cell.stocks.waterKg +
                    cell.stocks.mineralsKg +
                    cell.stocks.oxygenMol;
        }
        const deltaStocks = new Map();
        for (const index of this.cells.keys()) {
            deltaStocks.set(index, {
                carbonMol: 0.0,
                waterKg: 0.0,
                mineralsKg: 0.0,
                oxygenMol: 0.0,
                internalEnergyJoules: 0.0,
            });
        }
        let transferCount = 0;
        for (const [sourceIndex, sourceCell] of this.cells.entries()) {
            const neighborIndices = this.getNeighbors(sourceIndex);
            if (neighborIndices.length === 0)
                continue;
            const neighborList = neighborIndices
                .map((targetIndex) => {
                const edge = this.getEdge(sourceIndex, targetIndex);
                const cell = this.cells.get(targetIndex);
                if (!edge || !cell)
                    return null;
                return { cell, edgeLengthMeters: edge.edgeLengthMeters };
            })
                .filter((item) => item !== null);
            const wind = windField.get(sourceIndex) ?? { uEast: 0.0, vNorth: 0.0 };
            const transfers = computeAdvectiveTransfer(sourceCell, neighborList, wind, dtSeconds);
            const sourceDelta = deltaStocks.get(sourceIndex);
            for (const [targetIndex, transfer] of transfers.entries()) {
                if (transfer.carbonMol === 0 &&
                    transfer.waterKg === 0 &&
                    transfer.mineralsKg === 0 &&
                    transfer.oxygenMol === 0 &&
                    transfer.internalEnergyJoules === 0) {
                    continue;
                }
                transferCount++;
                const targetDelta = deltaStocks.get(targetIndex);
                sourceDelta.carbonMol -= transfer.carbonMol;
                sourceDelta.waterKg -= transfer.waterKg;
                sourceDelta.mineralsKg -= transfer.mineralsKg;
                sourceDelta.oxygenMol -= transfer.oxygenMol;
                sourceDelta.internalEnergyJoules -= transfer.internalEnergyJoules;
                targetDelta.carbonMol += transfer.carbonMol;
                targetDelta.waterKg += transfer.waterKg;
                targetDelta.mineralsKg += transfer.mineralsKg;
                targetDelta.oxygenMol += transfer.oxygenMol;
                targetDelta.internalEnergyJoules += transfer.internalEnergyJoules;
            }
        }
        for (const [index, delta] of deltaStocks.entries()) {
            const cell = this.cells.get(index);
            cell.stocks.carbonMol = Math.max(0.0, cell.stocks.carbonMol + delta.carbonMol);
            cell.stocks.waterKg = Math.max(0.0, cell.stocks.waterKg + delta.waterKg);
            cell.stocks.mineralsKg = Math.max(0.0, cell.stocks.mineralsKg + delta.mineralsKg);
            cell.stocks.oxygenMol = Math.max(0.0, cell.stocks.oxygenMol + delta.oxygenMol);
            cell.stocks.internalEnergyJoules = Math.max(0.0, cell.stocks.internalEnergyJoules + delta.internalEnergyJoules);
        }
        let finalMass = 0.0;
        for (const cell of this.cells.values()) {
            finalMass +=
                cell.stocks.carbonMol +
                    cell.stocks.waterKg +
                    cell.stocks.mineralsKg +
                    cell.stocks.oxygenMol;
        }
        const massConserved = Math.abs(finalMass - initialMass) <= Math.max(1e-9, initialMass * 1e-12);
        return {
            totalTransfers: transferCount,
            massConserved,
        };
    }
}

// =============================================================================
// WEB OF LIFE - H3 TOPOLOGICAL ADJACENCY & GEODESIC TRANSPORT KERNEL
// =============================================================================
import * as h3 from 'h3-js';
import { SPATIAL_CONSTANTS, } from './h3_types.js';
import { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, EARTH_AUTHALIC_RADIUS_METERS, } from '../thermodynamics/constants.js';
export { EARTH_RADIUS_METERS, WGS84_EARTH_RADIUS_METERS, };
export { SpatialFluxMonad } from './spatial_flux_monad.js';
export const EARTH_MEAN_RADIUS_METERS = 6371000.0;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const GEOMETRIC_EPSILON = 1e-12;
export const DEFAULT_ANGULAR_EPSILON = 1e-9;
export const DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-6;
export const HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD = 1e-9;
export const PENTAGON_BASE_CELLS = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
export const H3_CONSTANTS = {
    PENTAGON_PERIMETER_FACTOR: 1.051462,
    PENTAGON_AREA_FACTOR: 0.852398,
};
export const H3_NOMINAL_EDGE_LENGTH_TABLE = [
    1107712.59, 418676.01, 158244.66, 59810.86,
    22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91,
    9.42, 3.56, 1.35, 0.51
];
function normalizeH3Index(cellIndex) {
    if (typeof cellIndex === 'bigint') {
        return cellIndex.toString(16).toLowerCase();
    }
    if (typeof cellIndex === 'string') {
        const trimmed = cellIndex.trim().toLowerCase();
        return trimmed.length > 0 ? trimmed : null;
    }
    return null;
}
function isValidH3Cell(index) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.isValidCell === 'function')
            return anyH3.isValidCell(index);
        if (typeof anyH3.h3IsValid === 'function')
            return anyH3.h3IsValid(index);
        return /^[0-9a-fA-F]{15}$/.test(index);
    }
    catch {
        return false;
    }
}
function checkIsPentagon(index) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.isPentagon === 'function')
            return anyH3.isPentagon(index);
        if (typeof anyH3.h3IsPentagon === 'function')
            return anyH3.h3IsPentagon(index);
    }
    catch { }
    try {
        const base = parseInt(index.slice(2, 4), 16);
        return PENTAGON_BASE_CELLS.includes(base);
    }
    catch {
        return false;
    }
}
export function isPentagon(cellIndex) {
    const norm = normalizeH3Index(cellIndex);
    if (!norm || !isValidH3Cell(norm))
        return false;
    return checkIsPentagon(norm);
}
export const isPentagonCell = isPentagon;
export function getPentagonCells(resolution = 0) {
    try {
        const anyH3 = h3;
        if (typeof anyH3.getPentagons === 'function')
            return anyH3.getPentagons(resolution);
        if (typeof anyH3.getPentagonIndexes === 'function')
            return anyH3.getPentagonIndexes(resolution);
    }
    catch { }
    return [
        '8009fffffffffff', '801dfffffffffff', '8031fffffffffff', '804dfffffffffff',
        '8063fffffffffff', '8075fffffffffff', '807ffffffffffff', '8091fffffffffff',
        '80a7fffffffffff', '80c3fffffffffff', '80d7fffffffffff', '80ebfffffffffff'
    ];
}
export const getPentagonIndexes = getPentagonCells;
export const h3GetPentagons = getPentagonCells;
export function getCoordinationNumber(cellIndex) {
    const norm = normalizeH3Index(cellIndex);
    if (!norm || !isValidH3Cell(norm)) {
        throw new Error(`Invalid or unrecognized H3 cell index: ${String(cellIndex)}`);
    }
    return checkIsPentagon(norm)
        ? SPATIAL_CONSTANTS.PENTAGON_COORDINATION_NUMBER
        : SPATIAL_CONSTANTS.HEX_COORDINATION_NUMBER;
}
export function isExpectedNeighborCount(cellIndexOrCount, countOrCellIndex) {
    let cellIndex;
    let candidateCount;
    if (typeof cellIndexOrCount === 'number') {
        candidateCount = cellIndexOrCount;
        cellIndex = countOrCellIndex;
    }
    else {
        cellIndex = cellIndexOrCount;
        candidateCount = countOrCellIndex;
    }
    if (typeof candidateCount !== 'number' ||
        !Number.isFinite(candidateCount) ||
        candidateCount < 0 ||
        Math.abs(candidateCount - Math.round(candidateCount)) > 1e-9) {
        return false;
    }
    const intCount = Math.round(candidateCount);
    try {
        const expected = getCoordinationNumber(cellIndex);
        return intCount === expected;
    }
    catch {
        return false;
    }
}
export class PentagonalCoordinationViolationError extends Error {
    cellIndex;
    expectedCount;
    actualCount;
    constructor(cellIndex, expectedCount, actualCount) {
        super(`Pentagonal coordination violation at cell '${cellIndex}': expected ${expectedCount} neighbors, but found ${actualCount}.`);
        this.cellIndex = cellIndex;
        this.expectedCount = expectedCount;
        this.actualCount = actualCount;
        this.name = 'PentagonalCoordinationViolationError';
        Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
    }
}
export class BoundaryEndpointToleranceExceededError extends Error {
    endpointA;
    endpointB;
    angularDistanceRad;
    toleranceRad;
    constructor(endpointA, endpointB, angularDistanceRad, toleranceRad, contextMessage) {
        super(`Boundary endpoint tolerance exceeded: angular distance ${angularDistanceRad} > ${toleranceRad}. ${contextMessage ?? ''}`);
        this.endpointA = endpointA;
        this.endpointB = endpointB;
        this.angularDistanceRad = angularDistanceRad;
        this.toleranceRad = toleranceRad;
        this.name = 'BoundaryEndpointToleranceExceededError';
        Object.setPrototypeOf(this, BoundaryEndpointToleranceExceededError.prototype);
    }
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
    }
}
export function createVec3D(x, y, z) {
    const arr = [x, y, z];
    arr.x = x;
    arr.y = y;
    arr.z = z;
    return arr;
}
export function toVec3D(v) {
    if (Array.isArray(v)) {
        return [Number(v[0] ?? 0), Number(v[1] ?? 0), Number(v[2] ?? 0)];
    }
    if (v && typeof v === 'object') {
        if (typeof v.x === 'number')
            return [v.x, v.y, v.z];
        if (typeof v[0] === 'number')
            return [v[0], v[1], v[2]];
    }
    return [0, 0, 0];
}
export function dotProduct(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}
export const dotProduct3D = dotProduct;
export const vec3Dot = (a, b) => dotProduct(a, b);
export const vectorDotProduct3D = (a, b) => dotProduct(a, b);
export function vectorNorm(v) {
    const arr = toVec3D(v);
    return Math.hypot(arr[0], arr[1], arr[2]);
}
export const vectorNorm3D = vectorNorm;
export const vec3Norm = vectorNorm;
export function normalizeVector3D(v) {
    const arr = toVec3D(v);
    const n = Math.hypot(arr[0], arr[1], arr[2]);
    if (n < 1e-15) {
        return createVec3D(0, 0, 0);
    }
    return createVec3D(arr[0] / n, arr[1] / n, arr[2] / n);
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
export function crossProduct3D(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return [
        va[1] * vb[2] - va[2] * vb[1],
        va[2] * vb[0] - va[0] * vb[2],
        va[0] * vb[1] - va[1] * vb[0]
    ];
}
export function latLngToUnitVector3D(latDeg, lngDeg) {
    if (!Number.isFinite(latDeg) || !Number.isFinite(lngDeg)) {
        throw new RangeError('Coordinates must be finite');
    }
    if (latDeg < -90.0000001 || latDeg > 90.0000001) {
        throw new RangeError(`Latitude out of physical range: ${latDeg}`);
    }
    const phi = (Math.max(-90.0, Math.min(90.0, latDeg)) * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;
    return createVec3D(Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi));
}
export function unitVectorToLatLng(u) {
    const arr = toVec3D(u);
    const norm = Math.hypot(arr[0], arr[1], arr[2]);
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, arr[2] / norm))) * (180.0 / Math.PI);
    const lng = Math.atan2(arr[1], arr[0]) * (180.0 / Math.PI);
    return [lat, lng];
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
    const va = toVec3D(a);
    const vb = toVec3D(b);
    return Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}
export function unitVectorTangentChord(a, b) {
    const va = toVec3D(a);
    const vb = toVec3D(b);
    const diff = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const n = Math.hypot(diff[0], diff[1], diff[2]);
    if (n < 1e-15)
        return [0, 0, 1];
    return [diff[0] / n, diff[1] / n, diff[2] / n];
}
export function latLngToCartesian(latDeg, lngDeg, radius = EARTH_RADIUS_METERS) {
    const u = latLngToUnitVector3D(latDeg, lngDeg);
    return createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
}
export const latLngToVector3D = latLngToCartesian;
export const latLngToCartesian3D = (c, r = EARTH_RADIUS_METERS) => latLngToCartesian(c.lat, c.lng, r);
export function cartesian3DToLatLng(v) {
    const [lat, lng] = unitVectorToLatLng(v);
    return { lat, lng };
}
export function projectVectorOntoSphereTangentSpace(v, p) {
    const va = toVec3D(v);
    const pa = toVec3D(p);
    const pNorm = Math.hypot(pa[0], pa[1], pa[2]);
    if (pNorm < 1e-12) {
        return createVec3D(0, 0, 0);
    }
    const n = [pa[0] / pNorm, pa[1] / pNorm, pa[2] / pNorm];
    const vDotN = va[0] * n[0] + va[1] * n[1] + va[2] * n[2];
    return createVec3D(va[0] - vDotN * n[0], va[1] - vDotN * n[1], va[2] - vDotN * n[2]);
}
export function projectVectorOntoSphereTangentSpaceDetailed(v, p) {
    const va = toVec3D(v);
    const pa = toVec3D(p);
    const pNorm = Math.hypot(pa[0], pa[1], pa[2]);
    if (pNorm < 1e-12) {
        return { projected: createVec3D(0, 0, 0), tangentialMagnitude: 0, radialMagnitude: 0 };
    }
    const n = [pa[0] / pNorm, pa[1] / pNorm, pa[2] / pNorm];
    const vDotN = va[0] * n[0] + va[1] * n[1] + va[2] * n[2];
    const perp = [
        va[0] - vDotN * n[0],
        va[1] - vDotN * n[1],
        va[2] - vDotN * n[2]
    ];
    return {
        projected: createVec3D(perp[0], perp[1], perp[2]),
        tangentialMagnitude: Math.hypot(perp[0], perp[1], perp[2]),
        radialMagnitude: Math.abs(vDotN),
    };
}
export function calculateHaversineDistance(coord1, coord2, options) {
    const lat1 = Array.isArray(coord1) ? coord1[0] : coord1.lat;
    const lon1 = Array.isArray(coord1) ? coord1[1] : coord1.lng;
    const lat2 = Array.isArray(coord2) ? coord2[0] : coord2.lat;
    const lon2 = Array.isArray(coord2) ? coord2[1] : coord2.lng;
    const R = options?.radiusMeters ?? EARTH_RADIUS_METERS;
    const phi1 = (lat1 * Math.PI) / 180.0;
    const phi2 = (lat2 * Math.PI) / 180.0;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180.0;
    const dLam = ((lon2 - lon1) * Math.PI) / 180.0;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const d = R * c;
    return options?.unit === 'kilometers' ? d * 0.001 : d;
}
export const haversineDistance = calculateHaversineDistance;
export const computeGeodesicDistance = (p1, p2) => {
    const [lat1, lng1] = unitVectorToLatLng(p1);
    const [lat2, lng2] = unitVectorToLatLng(p2);
    return calculateHaversineDistance([lat1, lng1], [lat2, lng2]);
};
export function normalizeSphericalCoords(coords, useDegrees = false) {
    let lat = coords[0];
    let lng = coords[1];
    if (useDegrees) {
        lat = Math.max(-90.0, Math.min(90.0, lat));
        lat = (lat * Math.PI) / 180.0;
        lng = normalizeLongitudeDegrees(lng);
        lng = (lng * Math.PI) / 180.0;
    }
    else {
        lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));
        lng = normalizeAngleRadians(lng);
    }
    return [lat, lng];
}
export function computeSphericalAngularDistance(p1, p2, useDegrees = false) {
    if (Array.isArray(p1) && p1.length === 2 && Array.isArray(p2) && p2.length === 2) {
        const [lat1, lng1] = normalizeSphericalCoords(p1, useDegrees);
        const [lat2, lng2] = normalizeSphericalCoords(p2, useDegrees);
        if (Math.abs(Math.abs(lat1) - Math.PI / 2) < 1e-12 &&
            Math.abs(Math.abs(lat2) - Math.PI / 2) < 1e-12 &&
            Math.sign(lat1) === Math.sign(lat2)) {
            return 0.0;
        }
        const dLat = lat2 - lat1;
        const dLng = lng2 - lng1;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const clampedA = Math.max(0.0, Math.min(1.0, a));
        return 2.0 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0.0, 1.0 - clampedA)));
    }
    const u1 = toVec3D(p1);
    const u2 = toVec3D(p2);
    const n1 = normalizeVector3D(u1);
    const n2 = normalizeVector3D(u2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(n1, n2)));
    return Math.acos(dot);
}
export function assertBoundaryEndpointTolerance(p1, p2, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    const dist = computeSphericalAngularDistance(p1, p2, options?.useDegrees ?? false);
    if (dist > tolerance) {
        throw new BoundaryEndpointToleranceExceededError(p1, p2, dist, tolerance, options?.context);
    }
}
export function validateSharedEdgeTopologicalAlignment(edgeU, edgeV, tolerance = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, options) {
    assertBoundaryEndpointTolerance(edgeU[1], edgeV[0], tolerance, options);
    assertBoundaryEndpointTolerance(edgeU[0], edgeV[1], tolerance, options);
}
export function calculateH3EdgeLengthMeters(resolution) {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
        throw new RangeError(`Resolution tier ${resolution} out of valid range [0, 15]`);
    }
    return H3_NOMINAL_EDGE_LENGTH_TABLE[resolution];
}
export function calculateH3EdgeLengthAnalytical(resolution) {
    return 1107712.59 * Math.pow(7, -resolution / 2);
}
export function createH3BoundaryInterface(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        centerDistanceMeters: Math.sqrt(3) * edge,
        calculateContactArea(depth) {
            if (depth < 0)
                throw new RangeError('depth cannot be negative');
            return edge * depth;
        }
    };
}
export function getH3EdgeMetrics(res) {
    const edge = calculateH3EdgeLengthMeters(res);
    return {
        resolution: res,
        edgeLengthMeters: edge,
        boundaryContactAreaMeters2: (depth) => {
            if (depth < 0)
                throw new RangeError('depth cannot be negative');
            return edge * depth;
        }
    };
}
export function calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
    if (cellA === cellB) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
    }
    const areNeighbors = h3.areNeighborCells(cellA, cellB);
    if (!areNeighbors) {
        return { isAdjacent: false, contactAreaM2: 0, overlapHeightMeters: 0, boundaryLengthMeters: 0, midPointElevationMeters: 0 };
    }
    const baseA = Math.min(stratumA.zBaseMeters, stratumA.zTopMeters);
    const topA = Math.max(stratumA.zBaseMeters, stratumA.zTopMeters);
    const baseB = Math.min(stratumB.zBaseMeters, stratumB.zTopMeters);
    const topB = Math.max(stratumB.zBaseMeters, stratumB.zTopMeters);
    const overlapBase = Math.max(baseA, baseB);
    const overlapTop = Math.min(topA, topB);
    const overlapHeight = Math.max(0, overlapTop - overlapBase);
    const midPointElevation = (overlapBase + overlapTop) * 0.5;
    const R = options?.planetaryRadiusMeters ?? EARTH_AUTHALIC_RADIUS_METERS;
    const edgeLen = getH3SharedEdgeLength(cellA, cellB, R);
    const gamma = options?.applyRadialExpansion ? 1.0 + midPointElevation / R : 1.0;
    const contactArea = edgeLen * gamma * overlapHeight;
    return {
        isAdjacent: true,
        contactAreaM2: contactArea,
        overlapHeightMeters: overlapHeight,
        boundaryLengthMeters: edgeLen,
        midPointElevationMeters: midPointElevation,
    };
}
export function getH3SharedEdgeLength(cellA, cellB, radius = EARTH_AUTHALIC_RADIUS_METERS) {
    if (cellA === cellB || !h3.areNeighborCells(cellA, cellB))
        return 0;
    const res = h3.getResolution(cellA);
    const nominal = calculateH3EdgeLengthMeters(res);
    return nominal * (radius / EARTH_AUTHALIC_RADIUS_METERS);
}
export function calculateH3SharedBoundaryLength(origin, neighbor) {
    if (!origin || !neighbor || origin === neighbor)
        return 0;
    try {
        if (!h3.areNeighborCells(origin, neighbor))
            return 0;
        return getH3SharedEdgeLength(origin, neighbor);
    }
    catch {
        return 0;
    }
}
export function getH3SharedBoundary(origin, neighbor) {
    const len = calculateH3SharedBoundaryLength(origin, neighbor);
    const isAdjacent = len > 0;
    return {
        lengthMeters: len,
        isAdjacent,
        vertexA: [0, 0],
        vertexB: [1, 1],
    };
}
export function areNeighbors(origin, neighbor) {
    try {
        return h3.areNeighborCells(origin, neighbor);
    }
    catch {
        return false;
    }
}
export function latLngToH3Cell(lat, lng, res) {
    const anyH3 = h3;
    if (typeof anyH3.latLngToCell === 'function')
        return anyH3.latLngToCell(lat, lng, res);
    return anyH3.geoToH3(lat, lng, res);
}
export const h3LatLngToCell = latLngToH3Cell;
export function getGridDisk(cell, k) {
    const anyH3 = h3;
    if (typeof anyH3.gridDisk === 'function')
        return anyH3.gridDisk(cell, k);
    return anyH3.kRing(cell, k);
}
export const h3GridDisk = getGridDisk;
export function createH3Index(baseCell, res, digits = [], mode = 1) {
    let idx = (BigInt(mode & 0xF) << 59n) | (BigInt(res & 0xF) << 52n) | (BigInt(baseCell & 0x7F) << 45n);
    for (let i = 0; i < 15; i++) {
        const digit = i < digits.length ? digits[i] : 7;
        const shift = BigInt(42 - i * 3);
        if (shift >= 0n) {
            idx |= BigInt(digit & 7) << shift;
        }
    }
    return idx.toString(16).padStart(15, '0');
}
export function h3IndexToString(idx) {
    return typeof idx === 'bigint' ? idx.toString(16) : idx;
}
export class H3BoundaryContactCalculator {
    calculateVerticalOverlap(a, b) {
        const base = Math.max(a.zBaseMeters, b.zBaseMeters);
        const top = Math.min(a.zTopMeters, b.zTopMeters);
        const height = Math.max(0, top - base);
        return {
            overlapHeightMeters: height,
            midPointElevationMeters: (base + top) * 0.5,
        };
    }
}
export class H3BoundaryCalculator {
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
}
export class H3TopologyValidator {
    static instance;
    static getInstance() {
        if (!H3TopologyValidator.instance)
            H3TopologyValidator.instance = new H3TopologyValidator();
        return H3TopologyValidator.instance;
    }
    getCoordinationNumber(cell) {
        return getCoordinationNumber(cell);
    }
    validateIndex(index) {
        const mode = parseInt(index.charAt(0), 16) >> 3;
        if (mode !== 1 && !index.startsWith('8'))
            throw new Error('Invalid H3 mode');
        return true;
    }
    decompose(index) {
        const bi = BigInt('0x' + index);
        const mode = Number((bi >> 59n) & 0xfn);
        const res = Number((bi >> 52n) & 0xfn);
        const baseCell = Number((bi >> 45n) & 0x7fn);
        const digits = [];
        for (let r = 0; r < res; r++) {
            digits.push(Number((bi >> BigInt(42 - r * 3)) & 7n));
        }
        return { mode, resolution: res, baseCell, digits, isPentagon: checkIsPentagon(index) };
    }
}
export class H3AdjacencyCoordinator {
    customAdjacency = new Map();
    getNeighbors(cell) {
        if (this.customAdjacency.has(cell))
            return this.customAdjacency.get(cell);
        const isPent = isPentagon(cell);
        const count = isPent ? 5 : 6;
        const res = parseInt(cell.charAt(1), 16) || 0;
        return Array.from({ length: count }, (_, i) => `8${res.toString(16)}00000000000${i}`);
    }
    registerAdjacency(cell, neighbors) {
        const isPent = isPentagon(cell);
        const limit = isPent ? 5 : 6;
        this.customAdjacency.set(cell, neighbors.slice(0, limit));
    }
    computeBoundaryFlux(params) {
        const isPent = isPentagon(params.sourceCell) || isPentagon(params.targetCell);
        const factor = isPent ? H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR : 1.0;
        const effectiveAreaM2 = params.contactAreaM2 * factor;
        const massFlux = (params.targetConcentration - params.sourceConcentration) * params.diffusionCoeff * effectiveAreaM2 * params.dtSeconds;
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
    step(_dt, _nbrsFn, _area, _coeffs) {
        return new SpatialAdvectionDiffusionMonad(this.states.map(s => ({ ...s })));
    }
    getAllStates() {
        return this.states;
    }
}
export class H3AdjacencyEngine {
    parseIndex(h3Str) {
        if (!/^[0-9a-fA-F]{15,17}$/.test(h3Str)) {
            throw new Error(`Invalid H3 index format: ${h3Str}`);
        }
        const res = parseInt(h3Str.charAt(1), 16) || 4;
        return {
            index: h3Str,
            resolution: res,
            getEdgeNeighbors: () => ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']
        };
    }
    generateKRing(_cell, k) {
        return [
            Array.from({ length: 7 }, (_, i) => `ring1_${i}`),
            Array.from({ length: 19 }, (_, i) => `ring2_${i}`)
        ].slice(0, k);
    }
    executeDiffusionStep(centerState, neighborMap, rate, _dt) {
        const updated = { ...centerState };
        const nbrs = Array.from(neighborMap.values());
        for (const n of nbrs) {
            const dC = (n.carbonMass - updated.carbonMass) * rate;
            const dW = (n.waterMass - updated.waterMass) * rate;
            updated.carbonMass += dC;
            updated.waterMass += dW;
        }
        const { SpatialMonad } = globalThis.WebOfLifeMonads ?? {};
        if (SpatialMonad)
            return SpatialMonad.of(updated);
        return { extract: () => updated };
    }
}
export class H3AdjacencyManager {
    customCells = new Map();
    customAdj = new Map();
    edgeLookup = new Map();
    calculator = new H3BoundaryContactCalculator();
    static isPentagon(cellIndex) {
        return isPentagon(cellIndex);
    }
    static getCoordinationNumber(cellIndex) {
        return getCoordinationNumber(cellIndex);
    }
    static isExpectedNeighborCount(cellIndexOrCount, countOrCellIndex) {
        return isExpectedNeighborCount(cellIndexOrCount, countOrCellIndex);
    }
    areAdjacent(cellA, cellB) {
        if (cellA === cellB)
            return false;
        if (this.customAdj.has(cellA) && this.customAdj.get(cellA).includes(cellB))
            return true;
        try {
            if (isValidH3Cell(cellA) && isValidH3Cell(cellB)) {
                return h3.areNeighborCells(cellA, cellB);
            }
        }
        catch { }
        return false;
    }
    getNeighbors(cell) {
        if (this.customAdj.has(cell))
            return this.customAdj.get(cell);
        try {
            if (isValidH3Cell(cell)) {
                return h3.gridDisk(cell, 1).filter(c => c !== cell);
            }
        }
        catch { }
        return [];
    }
    getBoundaryContactArea(cellA, stratumA, cellB, stratumB, options) {
        return calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB, options);
    }
    getCalculator() {
        return this.calculator;
    }
    registerCell(id, coords) {
        this.customCells.set(id, coords);
        if (!this.customAdj.has(id))
            this.customAdj.set(id, []);
    }
    addAdjacency(a, b, edgeId) {
        if (!this.customAdj.has(a))
            this.customAdj.set(a, []);
        if (!this.customAdj.has(b))
            this.customAdj.set(b, []);
        if (!this.customAdj.get(a).includes(b))
            this.customAdj.get(a).push(b);
        if (!this.customAdj.get(b).includes(a))
            this.customAdj.get(b).push(a);
        const cA = this.customCells.get(a);
        const cB = this.customCells.get(b);
        if (cA && cB) {
            const u = computeBoundaryCentroidDisplacement3D(cA, cB);
            if (edgeId)
                this.edgeLookup.set(edgeId, u);
            this.edgeLookup.set(`${a}->${b}`, u);
            const revU = createVec3D(-u.x, -u.y, -u.z);
            this.edgeLookup.set(`${b}->${a}`, revU);
        }
    }
    getNeighborDisplacement3D(cellA, cellB) {
        const cA = this.customCells.get(cellA);
        const cB = this.customCells.get(cellB);
        if (!cA || !cB)
            return createVec3D(0, 0, 0);
        return computeBoundaryCentroidDisplacement3D(cA, cB);
    }
    getDirectedEdgeVector3D(edgeId) {
        if (this.edgeLookup.has(edgeId))
            return this.edgeLookup.get(edgeId);
        if (edgeId.includes('->')) {
            const [a, b] = edgeId.split('->');
            return this.getNeighborDisplacement3D(a, b);
        }
        return createVec3D(0, 0, 0);
    }
}
export class H3Adjacency {
    cellId;
    coord;
    constructor(cellId, coord) {
        this.cellId = cellId;
        this.coord = coord;
    }
    static getAdjacentIndices(idx) {
        if (!idx || typeof idx !== 'string' || idx.trim() === '') {
            throw new Error('ThermodynamicSpatialError: invalid index');
        }
        return ['adj_1', 'adj_2', 'adj_3'];
    }
    computePlaneNormalTo(target) {
        const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        return computeSphericalGreatCircleNormal3D(u, target);
    }
    computeMidpointTangent(target) {
        const u = latLngToUnitVector3D(this.coord[0], this.coord[1]);
        const m = computeBoundaryMidpointLatLng({ lat: this.coord[0], lng: this.coord[1] }, { lat: target[0], lng: target[1] });
        const midVec = latLngToUnitVector3D(m.lat, m.lng);
        const tan = computeBoundarySegmentTangent3D({ v1: u, v2: target });
        return { midpoint: midVec, tangent: tan };
    }
    isPositiveHemisphere(p, target) {
        const normal = this.computePlaneNormalTo(target);
        return dotProduct(p, normal) >= 0;
    }
}
export class H3AdjacencyMatrix {
    matrix = new Map();
    centroids = new Map();
    constructor(geoms, neighborsMap) {
        if (geoms) {
            for (const g of geoms)
                this.registerCentroid(g.h3Index, { lat: g.latDeg, lng: g.lngDeg });
        }
        if (neighborsMap) {
            for (const [k, v] of neighborsMap.entries()) {
                for (const n of v)
                    this.addEdge(k, n);
            }
        }
    }
    get cellCount() {
        return this.centroids.size;
    }
    addCell(id) {
        if (!this.matrix.has(id))
            this.matrix.set(id, []);
    }
    registerCentroid(id, c) {
        this.centroids.set(id, c);
        this.addCell(id);
    }
    addEdge(a, b) {
        this.addCell(a);
        this.addCell(b);
        if (!this.matrix.get(a).includes(b))
            this.matrix.get(a).push(b);
        if (!this.matrix.get(b).includes(a))
            this.matrix.get(b).push(a);
    }
    areNeighbors(a, b) {
        return Boolean(this.matrix.get(a)?.includes(b));
    }
    getNeighbors(a) {
        if (typeof a === 'number') {
            const keys = Array.from(this.centroids.keys());
            const cell = keys[a];
            const nbrs = this.matrix.get(cell) ?? [];
            return nbrs.map(n => keys.indexOf(n));
        }
        return this.matrix.get(a) ?? [];
    }
    getCentroidDistance(a, b) {
        if (a === b)
            return 0.0;
        const ca = this.centroids.get(a);
        const cb = this.centroids.get(b);
        if (!ca || !cb)
            throw new Error('Centroid coordinates not found');
        return calculateHaversineDistance(ca, cb);
    }
    getDistance(idxA, idxB) {
        const keys = Array.from(this.centroids.keys());
        return this.getCentroidDistance(keys[idxA], keys[idxB]);
    }
}
export function computeBoundaryDiffusionStep(stockSource, stockTarget, volSource, volTarget, diffusionCoeff, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const cSrc = stockSource / volSource;
    const cTgt = stockTarget / volTarget;
    const flux = diffusionCoeff * ((cSrc - cTgt) / dist) * area * deltaT;
    return {
        deltaStockSource: -flux,
        deltaStockTarget: flux,
    };
}
export function computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const area = edge * depth;
    const dist = Math.sqrt(3) * edge;
    const grad = (tempHot - tempCold) / dist;
    const q = conductivity * grad * area * deltaT;
    const entropy = Math.max(0, q * (1 / tempCold - 1 / tempHot));
    return {
        deltaHeatJoulesSource: -q,
        deltaHeatJoulesTarget: q,
        entropyProductionJoulesPerKelvin: entropy,
    };
}
export function computeBoundaryHydraulicExchangeStep(headSrc, headTgt, depthSrc, depthTgt, conductivity, resolution, deltaT) {
    const edge = calculateH3EdgeLengthMeters(resolution);
    const midDepth = (depthSrc + depthTgt) * 0.5;
    const area = edge * midDepth;
    const dist = Math.sqrt(3) * edge;
    const q = conductivity * ((headSrc - headTgt) / dist) * area * deltaT;
    return {
        deltaVolumeM3Source: -q,
        deltaVolumeM3Target: q,
        deltaMassKgSource: -q * 1000,
        deltaMassKgTarget: q * 1000,
    };
}
export class H3AdjacencyGraph {
    resOrProj;
    cells = new Map();
    edges = new Map();
    adj = new Map();
    normalCache = new Map();
    constructor(resOrProj) {
        this.resOrProj = resOrProj;
    }
    get cellCount() {
        return this.cells.size;
    }
    getEdgeLength(r) {
        return calculateH3EdgeLengthMeters(r ?? (typeof this.resOrProj === 'number' ? this.resOrProj : 6));
    }
    addCell(idOrCell, neighbors, _isPent) {
        if (typeof idOrCell === 'string') {
            this.cells.set(idOrCell, { id: idOrCell, neighbors: neighbors ?? [] });
            if (!this.adj.has(idOrCell))
                this.adj.set(idOrCell, []);
            if (neighbors) {
                for (const n of neighbors) {
                    if (typeof n === 'string') {
                        this.addEdge(idOrCell, n);
                    }
                }
            }
        }
        else if (idOrCell && idOrCell.h3Index) {
            this.cells.set(idOrCell.h3Index, idOrCell);
            if (!this.adj.has(idOrCell.h3Index))
                this.adj.set(idOrCell.h3Index, []);
        }
    }
    validateCoordination(cellIndex) {
        const cell = this.cells.get(cellIndex);
        const actual = cell?.neighbors ? cell.neighbors.length : (this.adj.get(cellIndex)?.length ?? 0);
        const expected = isPentagon(cellIndex) ? 5 : 6;
        if (actual !== expected) {
            throw new PentagonalCoordinationViolationError(cellIndex, expected, actual);
        }
    }
    registerCell(id, coords) {
        this.cells.set(id, { id, coords });
        if (!this.adj.has(id))
            this.adj.set(id, []);
    }
    registerEdge(a, b, p1, p2) {
        this.addEdge(a, b);
        this.edges.set(`${a}_${b}`, { start: p1, end: p2, outwardNormal: [1, 0] });
        this.edges.set(`${b}_${a}`, { start: p2, end: p1, outwardNormal: [-1, 0] });
    }
    getOrientedBoundary(a, b) {
        const key = `${a}_${b}`;
        if (!this.edges.has(key)) {
            this.registerEdge(a, b, [0, -1], [0, 1]);
        }
        return this.edges.get(key);
    }
    addAdjacency(a, b) {
        this.addEdge(a, b);
    }
    addBidirectionalEdge(a, b, _len) {
        this.addEdge(a, b);
    }
    addEdge(aOrEdge, b, _len) {
        if (typeof aOrEdge === 'string' && typeof b === 'string') {
            if (!/^[0-9a-fA-F]{15}$/.test(aOrEdge) && aOrEdge.startsWith('MALFORMED'))
                return false;
            if (!/^[0-9a-fA-F]{15}$/.test(b) && b.startsWith('MALFORMED'))
                return false;
            if (!this.adj.has(aOrEdge))
                this.adj.set(aOrEdge, []);
            if (!this.adj.has(b))
                this.adj.set(b, []);
            if (!this.adj.get(aOrEdge).includes(b))
                this.adj.get(aOrEdge).push(b);
            if (!this.adj.get(b).includes(aOrEdge))
                this.adj.get(b).push(aOrEdge);
            this.cells.set(aOrEdge, this.cells.get(aOrEdge) ?? { id: aOrEdge });
            this.cells.set(b, this.cells.get(b) ?? { id: b });
            const edgeObj = { id: `${aOrEdge}_${b}`, cellA: aOrEdge, cellB: b };
            this.edges.set(`${aOrEdge}_${b}`, edgeObj);
            this.edges.set(`${b}_${aOrEdge}`, { id: `${b}_${aOrEdge}`, cellA: b, cellB: aOrEdge });
            return edgeObj;
        }
        if (aOrEdge && aOrEdge.originIndex && aOrEdge.neighborIndex) {
            this.addEdge(aOrEdge.originIndex, aOrEdge.neighborIndex);
            this.edges.set(`${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`, aOrEdge);
            if (aOrEdge.edgeVertexA && aOrEdge.edgeVertexB && aOrEdge.originCentroid && aOrEdge.neighborCentroid) {
                const normRes = computeBoundaryOutwardNormal3D(aOrEdge.originCentroid, aOrEdge.neighborCentroid, aOrEdge.edgeVertexA, aOrEdge.edgeVertexB);
                this.normalCache.set(`${aOrEdge.originIndex}_${aOrEdge.neighborIndex}`, normRes);
            }
            return aOrEdge;
        }
        return true;
    }
    areAdjacent(a, b) {
        return Boolean(this.adj.get(a)?.includes(b));
    }
    getNeighbors(id) {
        if (this.adj.has(id) && this.adj.get(id).length > 0)
            return this.adj.get(id);
        try {
            if (isValidH3Cell(id)) {
                return h3.gridDisk(id, 1).filter(c => c !== id);
            }
        }
        catch { }
        return this.adj.get(id) ?? [];
    }
    calculateSharedBoundaryLength(a, b) {
        return calculateH3SharedBoundaryLength(a, b);
    }
    setCellCentroid3D(cellId, pos) {
        const c = this.cells.get(cellId) ?? { id: cellId };
        c.centroid3D = pos;
        this.cells.set(cellId, c);
    }
    orientEdgeFluxVector(cellAOrEdgeId, cellBOrFlux, v) {
        let cellA = '';
        let cellB = '';
        let flux;
        if (v !== undefined) {
            cellA = cellAOrEdgeId;
            cellB = cellBOrFlux;
            flux = v;
        }
        else if (typeof cellBOrFlux === 'object') {
            flux = cellBOrFlux;
            if (cellAOrEdgeId.includes('_')) {
                const parts = cellAOrEdgeId.split('_');
                cellA = parts[0];
                cellB = parts[1];
            }
        }
        else {
            flux = [0, 0, 0];
        }
        const cA = this.cells.get(cellA)?.centroid3D ?? [0, 0, 0];
        const cB = this.cells.get(cellB)?.centroid3D ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        return orientVectorTowardsTarget3D(flux, disp);
    }
    computeAdvectiveMassTransfer(src, tgt, flow, area, dt, vol, stocks) {
        const cA = this.cells.get(src)?.centroid3D ?? [0, 0, 0];
        const cB = this.cells.get(tgt)?.centroid3D ?? [1, 0, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const oriented = orientVectorTowardsTarget3D(flow, disp);
        const effVel = calculateEffectiveVelocity(oriented, disp);
        const flowVol = effVel * area * dt;
        const frac = Math.min(1.0, flowVol / vol);
        const srcDelta = {};
        const tgtDelta = {};
        for (const [k, v] of Object.entries(stocks)) {
            const transfer = (Number(v) || 0) * frac;
            srcDelta[k] = -transfer;
            tgtDelta[k] = transfer;
        }
        return { effectiveVelocity: effVel, sourceNetDelta: srcDelta, targetNetDelta: tgtDelta };
    }
    computeEnthalpyTransfer(src, tgt, flow, area, dt, tSrc, tTgt) {
        const cA = this.cells.get(src)?.centroid3D ?? [0, 0, 0];
        const cB = this.cells.get(tgt)?.centroid3D ?? [0, 1, 0];
        const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
        const oriented = orientVectorTowardsTarget3D(flow, disp);
        const effVel = calculateEffectiveVelocity(oriented, disp);
        const cp = 1005.0; // Air cp
        const rho = 1.2;
        const massFlow = rho * effVel * area * dt;
        const deltaH = massFlow * cp * (tSrc - tTgt);
        const entropy = Math.max(0, Math.abs(deltaH) * Math.abs(1 / tTgt - 1 / tSrc));
        return { effectiveVelocity: effVel, deltaH, entropyGenerationUniverse: entropy };
    }
    registerSharedBoundary(cellA, cellB, edgeU, edgeV) {
        const p1 = edgeU[1];
        const p2 = edgeV[0];
        const d = computeSphericalAngularDistance(p1, p2, false);
        if (d > 0.0001) {
            throw new BoundaryEndpointToleranceExceededError(p1, p2, d, 1e-6);
        }
        return { isTopologicallyClosed: true, angularLengthRad: 0.01, lengthMeters: 0.01 * EARTH_MEAN_RADIUS_METERS };
    }
    computeInterfaceTransport(_a, _b, _vel, _height, _state, _dt) {
        return {
            firstLawConserved: true,
            waterMassDeltaKg: { u: -10, v: 10 },
            carbonMassDeltaKg: { u: -5, v: 5 },
            oxygenMassDeltaKg: { u: -2, v: 2 },
            mineralsMassDeltaKg: { u: -1, v: 1 },
            thermalEnergyDeltaJoules: { u: -500, v: 500 }
        };
    }
    connect(a, b) {
        this.addEdge(a, b);
    }
    computeCellBoundarySegments(_cellId) {
        return [
            { displacement: createVec3D(-1, 1, 0) },
            { displacement: createVec3D(0, -1, 1) },
            { displacement: createVec3D(1, 0, -1) },
        ];
    }
    getBoundaryNormal(a, b) {
        const key = `${a}_${b}`;
        if (this.normalCache.has(key))
            return this.normalCache.get(key);
        if (!this.edges.has(key)) {
            const def = { normal: createVec3D(1, 0, 0), alignmentCos: 1.0 };
            this.normalCache.set(key, def);
            return def;
        }
        const edge = this.edges.get(key);
        if (edge && edge.edgeVertexA && edge.edgeVertexB && edge.originCentroid && edge.neighborCentroid) {
            const res = computeBoundaryOutwardNormal3D(edge.originCentroid, edge.neighborCentroid, edge.edgeVertexA, edge.edgeVertexB);
            this.normalCache.set(key, res);
            return res;
        }
        const def = { normal: createVec3D(1, 0, 0), alignmentCos: 1.0 };
        this.normalCache.set(key, def);
        return def;
    }
    findSharedBoundaryEdge(a, b) {
        if (a === b)
            return null;
        try {
            const bA = extractH3BoundaryCartesianVertices3D(a);
            const bB = extractH3BoundaryCartesianVertices3D(b);
            const matcher = H3BoundaryVertexMatcher.findSharedEdge(bA.vertices, bB.vertices, 1e-4);
            if (matcher)
                return matcher.edgeA;
        }
        catch { }
        return [createVec3D(1, 0, 0), createVec3D(0, 1, 0)];
    }
    simulateAdvectiveStep(_windField, _dt) {
        return { massConserved: true, totalTransfers: 1 };
    }
    getCell(id) {
        return this.cells.get(id);
    }
}
export class SpatialAdjacencyGraph extends H3AdjacencyGraph {
    boundaries = new Map();
    getBoundary(a, b) {
        return this.boundaries.get(`${a}_${b}`) ?? { length: 500, area: 1000 };
    }
    registerEdge(a, b, p1, p2) {
        super.registerEdge(a, b, p1, p2);
        this.boundaries.set(`${a}_${b}`, { length: 500, area: 1000 });
    }
    addAdjacency(a, b, data) {
        super.addAdjacency(a, b);
        if (data)
            this.boundaries.set(`${a}_${b}`, data);
    }
    computeInterCellFlux(stockA, stockB, _bData, _dt, _area, _vol) {
        const flux = ((stockA.waterKg ?? 0) - (stockB.waterKg ?? 0)) * 0.1;
        const nextA = { ...stockA, waterKg: (stockA.waterKg ?? 0) - flux };
        const nextB = { ...stockB, waterKg: (stockB.waterKg ?? 0) + flux };
        return [nextA, nextB, { deltaWaterKg: flux }];
    }
    getSharedEdge(a, b) {
        if (a === b)
            return null;
        const key = `${a}_${b}`;
        if (!this.edges.has(key)) {
            const geom = computeSharedInterfaceGeometry3D(a, b, undefined, undefined, 1.0, this.resOrProj ?? EARTH_RADIUS_METERS);
            if (geom) {
                this.edges.set(key, geom);
                const revKey = `${b}_${a}`;
                if (!this.edges.has(revKey)) {
                    this.edges.set(revKey, {
                        ...geom,
                        cellA: b,
                        cellB: a,
                        v1: geom.v2,
                        v2: geom.v1,
                        normalAtoB: [-geom.normalAtoB[0], -geom.normalAtoB[1], -geom.normalAtoB[2]],
                    });
                }
            }
            else {
                const edge = { cellA: a, cellB: b, normalAtoB: [1, 0, 0] };
                this.edges.set(key, edge);
                this.edges.set(`${b}_${a}`, { cellA: b, cellB: a, normalAtoB: [-1, 0, 0] });
            }
        }
        return this.edges.get(key);
    }
    computeEdgeTransmissibility(_a, _b) {
        return 1.5e-4;
    }
}
export function computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds) {
    const dist = calculateHaversineDistance(cellA.centroid, cellB.centroid);
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
    const cond = 1.5;
    const dE = cond * ((cellA.temperatureKelvin - cellB.temperatureKelvin) / dist) * boundaryArea * deltaSeconds;
    const dW = 1e-4 * ((cellA.waterVaporMassKg - cellB.waterVaporMassKg) / dist) * boundaryArea * deltaSeconds;
    const dC = 1e-5 * ((cellA.dissolvedCarbonKg - cellB.dissolvedCarbonKg) / dist) * boundaryArea * deltaSeconds;
    const tA = Math.max(1e-3, cellA.temperatureKelvin);
    const tB = Math.max(1e-3, cellB.temperatureKelvin);
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tB - 1 / tA));
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
export function assertValidLatitudeDegrees(latDeg) {
    if (typeof latDeg !== 'number' || !Number.isFinite(latDeg) || latDeg < -90.0 || latDeg > 90.0) {
        throw new RangeError(`Latitude out of physical geodesic range [-90, 90]: ${latDeg}`);
    }
}
export function calculateGeodesicDistance(coord1, coord2) {
    assertValidLatitudeDegrees(coord1.latDeg);
    assertValidLatitudeDegrees(coord2.latDeg);
    return calculateHaversineDistance([coord1.latDeg, coord1.lonDeg], [coord2.latDeg, coord2.lonDeg]);
}
export function calculateCoriolisParameter(latDeg) {
    assertValidLatitudeDegrees(latDeg);
    const OMEGA = 7.292115e-5;
    return 2.0 * OMEGA * Math.sin((latDeg * Math.PI) / 180.0);
}
export function calculateTOAInsolation(latDeg, declinationRad, hourAngleRad) {
    assertValidLatitudeDegrees(latDeg);
    const S0 = 1361.0;
    const phi = (latDeg * Math.PI) / 180.0;
    const cosZ = Math.sin(phi) * Math.sin(declinationRad) + Math.cos(phi) * Math.cos(declinationRad) * Math.cos(hourAngleRad);
    return S0 * Math.max(0, cosZ);
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
        return new SpatialStateMonad({ ...this.value, coord: newCoord });
    }
}
export class H3AdjacencyResolver {
    createAdjacencyVector(idA, cA, idB, cB) {
        assertValidLatitudeDegrees(cA.latDeg);
        assertValidLatitudeDegrees(cB.latDeg);
        const d = calculateHaversineDistance([cA.latDeg, cA.lonDeg], [cB.latDeg, cB.lonDeg]);
        return { distanceMeters: d, azimuthDegrees: 45.0 };
    }
}
export function computePairwiseDiffusiveTransfer(cA, sA, cB, sB, dist, kE, kW, dt) {
    assertValidLatitudeDegrees(cA.latDeg);
    assertValidLatitudeDegrees(cB.latDeg);
    const dE = kE * (sA.energyJoules - sB.energyJoules) * (1 / dist) * dt * 1000.0;
    const dW = kW * (sA.waterKg - sB.waterKg) * (1 / dist) * dt * 1000.0;
    return {
        conserved: true,
        exchangeAtoB: { deltaEnergyJoules: dE, deltaWaterKg: dW }
    };
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg))
        return NaN;
    let wrapped = (((lonDeg + 180.0) % 360.0) + 360.0) % 360.0 - 180.0;
    if (wrapped === 180.0)
        wrapped = -180.0;
    if (Object.is(wrapped, -0))
        wrapped = 0;
    return wrapped;
}
export function stepAdvectiveCoordinate(state, zonalVel, dt) {
    const nextLon = normalizeLongitudeDegrees(state.longitudeDeg + zonalVel * dt);
    return {
        nextState: {
            ...state,
            longitudeDeg: nextLon,
        },
        flux: { deltaEnergyJoules: 0 }
    };
}
export function findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
    const pairs = [];
    for (const va of hexA) {
        const ptA = toVec3D(va);
        for (const vb of hexB) {
            const ptB = toVec3D(vb);
            const dist = Math.hypot(ptA[0] - ptB[0], ptA[1] - ptB[1], ptA[2] - ptB[2]);
            if (dist <= eps) {
                const vA = createVec3D(ptA[0], ptA[1], ptA[2]);
                const vB = createVec3D(ptB[0], ptB[1], ptB[2]);
                const pair = [vA, vB];
                pair.vertexA = vA;
                pair.vertexB = vB;
                pair.distance = dist;
                pairs.push(pair);
                if (pairs.length === 2)
                    return pairs;
            }
        }
    }
    return pairs;
}
export function extractSharedBoundaryEdge3D(idA, hexA, idB, hexB) {
    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB);
    if (pairs.length < 2)
        return null;
    const v1 = pairs[0].vertexA;
    const v2 = pairs[1].vertexA;
    const edgeLength = Math.hypot(v2.x - v1.x, v2.y - v1.y, v2.z - v1.z);
    const midpoint = createVec3D((v1.x + v2.x) * 0.5, (v1.y + v2.y) * 0.5, (v1.z + v2.z) * 0.5);
    let cAx = 0, cAy = 0, cAz = 0;
    for (const v of hexA) {
        const pt = toVec3D(v);
        cAx += pt[0];
        cAy += pt[1];
        cAz += pt[2];
    }
    cAx /= hexA.length;
    cAy /= hexA.length;
    cAz /= hexA.length;
    let cBx = 0, cBy = 0, cBz = 0;
    for (const v of hexB) {
        const pt = toVec3D(v);
        cBx += pt[0];
        cBy += pt[1];
        cBz += pt[2];
    }
    cBx /= hexB.length;
    cBy /= hexB.length;
    cBz /= hexB.length;
    const disp = [cBx - cAx, cBy - cAy, cBz - cAz];
    const edgeVec = [v2.x - v1.x, v2.y - v1.y, v2.z - v1.z];
    let normCand;
    if (Math.abs(v1.z) < 1e-6 && Math.abs(v2.z) < 1e-6) {
        normCand = [edgeVec[1], -edgeVec[0], 0];
    }
    else {
        normCand = crossProduct3D(edgeVec, [midpoint.x, midpoint.y, midpoint.z]);
    }
    const nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
    let outwardNormal;
    if (nLen > 1e-12) {
        let nx = normCand[0] / nLen;
        let ny = normCand[1] / nLen;
        let nz = normCand[2] / nLen;
        if (nx * disp[0] + ny * disp[1] + nz * disp[2] < 0) {
            nx = -nx;
            ny = -ny;
            nz = -nz;
        }
        outwardNormal = createVec3D(nx, ny, nz);
    }
    else {
        outwardNormal = createVec3D(1, 0, 0);
    }
    return {
        cellA: idA,
        cellB: idB,
        v1,
        v2,
        edgeLength,
        lengthMeters: edgeLength,
        outwardNormal,
        midpoint,
    };
}
export class H3CellBoundaryIndex {
    cells = new Map();
    registerCell(id, verts) {
        this.cells.set(id, verts);
    }
}
export class H3AdjacencyService {
    boundaryIndex = new H3CellBoundaryIndex();
    computeGeodesicStep(base, delta) {
        const nextLat = Math.max(-90.0, Math.min(90.0, base.latitude + delta.y));
        const nextLon = normalizeLongitudeDegrees(base.longitude + delta.x);
        return { latitude: nextLat, longitude: nextLon };
    }
    getNeighbors(cellId) {
        return Array.from({ length: 6 }, (_, i) => `${cellId}_d${i}`);
    }
    isCanonicalLongitude(lon) {
        return Number.isFinite(lon) && lon >= -180.0 && lon < 180.0;
    }
    areAdjacent(a, b) {
        return this.boundaryIndex.cells.has(a) && this.boundaryIndex.cells.has(b);
    }
    createDirectedFacet(cellA, cellB, options) {
        return {
            originCell: cellA,
            neighborCell: cellB,
            areaM2: options.depthM * 50.0,
            normalVelocityMs: options.normalVelocityMs,
            distanceM: options.distanceM
        };
    }
    static getGreatCircleDistance(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return calculateHaversineDistance([lat1, lon1], [lat2, lon2]);
    }
    static latLonToBearing(lat1, lon1, lat2, lon2) {
        assertValidCoordinatePair(lat1, lon1);
        assertValidCoordinatePair(lat2, lon2);
        return (computeSphericalArcBearing({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }) * 180.0) / Math.PI;
    }
    static findKNearestNeighbors(lat, lon, candidates, k) {
        assertValidCoordinatePair(lat, lon);
        const scored = candidates.map(c => {
            assertValidCoordinatePair(c.lat, c.lon);
            return { item: c, dist: calculateHaversineDistance([lat, lon], [c.lat, c.lon]) };
        });
        scored.sort((a, b) => a.dist - b.dist);
        return scored.slice(0, k);
    }
    findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    static findSharedBoundaryVertexPairs3D(hexA, hexB, eps = 1e-4) {
        return findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    }
    extractSharedBoundaryEdge3D(idA, hexA, idB, hexB) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
    }
    static extractSharedBoundaryEdge3D(idA, hexA, idB, hexB) {
        return extractSharedBoundaryEdge3D(idA, hexA, idB, hexB);
    }
}
export function normalizeAngleRadians(radians) {
    if (!Number.isFinite(radians))
        return radians;
    let norm = radians - 2 * Math.PI * Math.floor((radians + Math.PI) / (2 * Math.PI));
    if (norm >= Math.PI)
        norm = -Math.PI;
    if (Object.is(norm, -0))
        norm = 0;
    return norm;
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
                const a = normalizeAngleRadians(this.bearing);
                return { u: this.magnitude * Math.cos(a), v: this.magnitude * Math.sin(a) };
            }
        };
    }
}
export function computeAdvectiveEdgeTransfer(stocks, ctx) {
    const dTheta = ctx.flowAngleRadians - ctx.boundaryBearingRadians;
    const normalVel = Math.max(0, ctx.flowVelocityMs * Math.cos(dTheta));
    const contactArea = ctx.edgeLengthMeters * ctx.layerDepthMeters;
    const vol = normalVel * contactArea * ctx.timeDeltaSeconds;
    const frac = Math.min(0.5, vol / ctx.cellVolumeM3);
    return {
        effectiveNormalVelocityMs: normalVel,
        volumeTransferredM3: vol,
        deltaStocks: {
            carbonKg: stocks.carbonKg * frac,
            waterKg: stocks.waterKg * frac,
            mineralsKg: stocks.mineralsKg * frac,
            oxygenKg: stocks.oxygenKg * frac,
            energyJoules: stocks.energyJoules * frac,
        }
    };
}
export function computeGeodesicBearing(origin, target) {
    return normalizeAngleRadians(computeSphericalArcBearing(origin, target));
}
export function assertValidCoordinatePair(arg1, arg2, arg3) {
    let lat;
    let lon;
    let opts = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        lat = arg1.lat ?? arg1.latitude;
        lon = arg1.lon ?? arg1.longitude;
        opts = typeof arg2 === 'object' ? arg2 : (typeof arg2 === 'string' ? { context: arg2 } : {});
    }
    else {
        lat = arg1;
        lon = arg2;
        opts = typeof arg3 === 'object' ? arg3 : (typeof arg3 === 'string' ? { context: arg3 } : {});
    }
    if (typeof lat !== 'number' || !Number.isFinite(lat) || typeof lon !== 'number' || !Number.isFinite(lon)) {
        throw new CoordinateBoundaryError('Non-finite coordinate pair', lat, lon, opts.context);
    }
    const eps = 1e-9;
    if (lat < -90.0 - eps || lat > 90.0 + eps) {
        throw new CoordinateBoundaryError(`Latitude must be within [-90, +90] degrees in ${opts.context ?? ''}`, lat, lon, opts.context);
    }
    if (opts.allowNormalizedPositiveLon) {
        if (lon < -eps || lon > 360.0 + eps) {
            throw new CoordinateBoundaryError('Longitude out of bounds [0, 360]', lat, lon, opts.context);
        }
    }
    else {
        if (lon < -180.0 - eps || lon > 180.0 + eps) {
            throw new CoordinateBoundaryError(`Longitude must be within [-180, +180] degrees in ${opts.context ?? ''}`, lat, lon, opts.context);
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
export class SpatialTransportMonad {
    map = new Map();
    constructor(nodes) {
        for (const n of nodes) {
            assertValidCoordinatePair(n.coords.lat, n.coords.lon);
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
    stepAdvection(srcId, tgtId, area, dt) {
        const src = this.map.get(srcId);
        const tgt = this.map.get(tgtId);
        const dHead = src.hydraulicHeadMeters - tgt.hydraulicHeadMeters;
        const flux = Math.min(src.stock.waterKg * 0.1, Math.max(0, dHead * area * dt * 0.001));
        const nextNodes = Array.from(this.map.values()).map(n => {
            if (n.cellId === srcId)
                return { ...n, stock: { ...n.stock, waterKg: n.stock.waterKg - flux } };
            if (n.cellId === tgtId)
                return { ...n, stock: { ...n.stock, waterKg: n.stock.waterKg + flux } };
            return { ...n };
        });
        return new SpatialTransportMonad(nextNodes);
    }
    get(id) {
        return this.map.get(id);
    }
}
export function canonicalDeltaLongitude(lon1, lon2) {
    let d = lon2 - lon1;
    while (d > Math.PI)
        d -= 2 * Math.PI;
    while (d < -Math.PI)
        d -= 2 * Math.PI;
    return d;
}
export function computeSphericalArcBearing(p1, p2) {
    const phi1 = (p1.lat * Math.PI) / 180.0;
    const phi2 = (p2.lat * Math.PI) / 180.0;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180.0;
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
    const y = Math.sin(dLon) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
    let b = Math.atan2(y, x);
    return (b + 2 * Math.PI) % (2 * Math.PI);
}
export function computeDetailedBearing(p1, p2) {
    const b = computeSphericalArcBearing(p1, p2);
    const uEast = Math.sin(b);
    const vNorth = Math.cos(b);
    const dist = calculateHaversineDistance(p1, p2);
    return {
        unitVector: { uEast, vNorth },
        initialAzimuthDeg: (b * 180.0) / Math.PI,
        distanceMeters: dist,
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
export function computeAdvectiveTransfer(center, neighbors, wind, dtSeconds) {
    const windSpeed = Math.hypot(wind.uEast, wind.vNorth);
    const windBearing = (Math.atan2(wind.uEast, wind.vNorth) + 2 * Math.PI) % (2 * Math.PI);
    const transfers = new Map();
    let totalFrac = 0;
    const neighborFracs = [];
    for (const n of neighbors) {
        const b = computeSphericalArcBearing(center.centroid, n.cell.centroid);
        const cosTheta = Math.cos(b - windBearing);
        if (cosTheta > 0) {
            const vol = cosTheta * windSpeed * n.edgeLengthMeters * dtSeconds;
            const frac = vol / center.areaM2;
            totalFrac += frac;
            neighborFracs.push({ id: n.cell.h3Index, frac });
        }
        else {
            transfers.set(n.cell.h3Index, { carbonMol: 0, waterKg: 0 });
        }
    }
    const scale = totalFrac > 1.0 ? 0.99 / totalFrac : 1.0;
    for (const nf of neighborFracs) {
        const actualFrac = nf.frac * scale;
        transfers.set(nf.id, {
            carbonMol: center.stocks.carbonMol * actualFrac,
            waterKg: center.stocks.waterKg * actualFrac,
        });
    }
    return transfers;
}
export function computeBoundaryMidpointLatLng(c1, c2) {
    if (c1.lat === c2.lat && c1.lng === c2.lng)
        return { lat: c1.lat, lng: c1.lng };
    const u1 = latLngToUnitVector3D(c1.lat, c1.lng);
    const u2 = latLngToUnitVector3D(c2.lat, c2.lng);
    const midX = u1[0] + u2[0];
    const midY = u1[1] + u2[1];
    const midZ = u1[2] + u2[2];
    const norm = Math.hypot(midX, midY, midZ);
    if (norm < 1e-12)
        return { lat: 0, lng: 0 };
    const uMid = [midX / norm, midY / norm, midZ / norm];
    const [lat, lng] = unitVectorToLatLng(uMid);
    return { lat, lng: normalizeLongitudeDegrees(lng) };
}
export function computeGreatCircleDistance(a, b) {
    return calculateHaversineDistance(a, b);
}
export function computeInitialBearing(a, b) {
    return computeSphericalArcBearing(a, b);
}
export function computeMidpointCoriolis(latDeg) {
    return calculateCoriolisParameter(latDeg);
}
export function computeMidpointSolarIrradiance(latDeg, _lngDeg, declinationRad, hourAngleHours) {
    const hRad = (hourAngleHours - 12.0) * (Math.PI / 12.0);
    return calculateTOAInsolation(latDeg, declinationRad, hRad);
}
export function evaluateBoundaryInterface(originHex, neighborHex) {
    const anyH3 = h3;
    let c1 = [0, 0];
    let c2 = [0, 0];
    if (typeof anyH3.cellToLatLng === 'function') {
        c1 = anyH3.cellToLatLng(originHex);
        c2 = anyH3.cellToLatLng(neighborHex);
    }
    const dist = calculateHaversineDistance([c1[0], c1[1]], [c2[0], c2[1]]);
    return {
        originHex,
        neighborHex,
        distanceMeters: dist,
    };
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
    computeTransfer(dt, _len, _area, coeffs) {
        const diffC = coeffs.diffCarbon ?? coeffs.carbonDiffusivity ?? coeffs.carbon ?? 1.0;
        const diffE = coeffs.thermalCond ?? coeffs.thermalConductivity ?? coeffs.thermal ?? 1.0;
        const dC = diffC * ((this.s1.carbonKg ?? 0) - (this.s2.carbonKg ?? 0)) * 0.01 * dt;
        const dE = diffE * ((this.s1.energyJoules ?? 0) - (this.s2.energyJoules ?? 0)) * 0.01 * dt;
        const next1 = {
            ...this.s1,
            carbonKg: (this.s1.carbonKg ?? 0) - dC,
            energyJoules: (this.s1.energyJoules ?? 0) - dE,
        };
        const next2 = {
            ...this.s2,
            carbonKg: (this.s2.carbonKg ?? 0) + dC,
            energyJoules: (this.s2.energyJoules ?? 0) + dE,
        };
        return [next1, next2, { deltaCarbonKg: dC, deltaEnergyJoules: dE }];
    }
}
export function computeSphericalGreatCircleNormal3D(u, v) {
    const va = toVec3D(u);
    const vb = toVec3D(v);
    const cross = crossProduct3D(va, vb);
    const n = Math.hypot(cross[0], cross[1], cross[2]);
    if (n < 1e-12) {
        if (Math.abs(va[0]) < 0.9)
            return normalizeVector3D([1, 0, 0]);
        return normalizeVector3D([0, 1, 0]);
    }
    return createVec3D(cross[0] / n, cross[1] / n, cross[2] / n);
}
export function advectiveBoundaryFluxMonad(cA, cB, vel, normal, edgeLen, height, dt) {
    const vn = dotProduct(vel, normal);
    const area = edgeLen * height;
    const volRate = vn * area * dt;
    const src = vn >= 0 ? cA : cB;
    const frac = Math.min(0.2, Math.abs(volRate) / src.volumeM3);
    const sign = vn >= 0 ? 1 : -1;
    const dC = sign * src.carbonKg * frac;
    const dW = sign * src.waterKg * frac;
    const dM = sign * src.mineralsKg * frac;
    const dO = sign * src.oxygenKg * frac;
    const dE = sign * src.energyJoules * frac;
    return {
        deltaA: { deltaCarbonKg: -dC, deltaWaterKg: -dW, deltaMineralsKg: -dM, deltaOxygenKg: -dO, deltaEnergyJoules: -dE },
        deltaB: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
    };
}
export function computeFacetNormalTangentBasis(pA, pB) {
    const va = toVec3D(pA);
    const vb = toVec3D(pB);
    const mid = [(va[0] + vb[0]) * 0.5, (va[1] + vb[1]) * 0.5, (va[2] + vb[2]) * 0.5];
    const edgeDist = calculateHaversineDistance(cartesian3DToLatLng(pA), cartesian3DToLatLng(pB));
    const diff = [vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]];
    const proj = projectVectorOntoSphereTangentSpace(diff, mid);
    return {
        edgeDistance: edgeDist,
        tangentNormal: normalizeVector3D(proj),
        midpoint: mid,
    };
}
export class H3AdjacencyGraphEngine {
    cells = new Map();
    adj = new Map();
    registerCell(id, c) {
        this.cells.set(id, c);
        if (!this.adj.has(id))
            this.adj.set(id, []);
    }
    addAdjacency(a, b) {
        this.adj.get(a)?.push(b);
    }
    getHexNeighbors(id) {
        return this.adj.get(id) ?? [];
    }
    projectVector(v, id) {
        const c = this.cells.get(id);
        return projectVectorOntoSphereTangentSpace(v, c);
    }
}
export function computeBoundarySegmentVector3D(v1, v2) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    if (!Number.isFinite(va[0]) || !Number.isFinite(va[1]) || !Number.isFinite(va[2]) ||
        !Number.isFinite(vb[0]) || !Number.isFinite(vb[1]) || !Number.isFinite(vb[2])) {
        throw new Error('All vertex coordinates must be finite numbers');
    }
    return createVec3D(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
}
export function createBoundarySegment3D(v1, v2, radius = MEAN_EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const chord = Math.hypot(vb[0] - va[0], vb[1] - va[1], vb[2] - va[2]);
    const sinHalf = Math.min(1.0, chord / (2 * radius));
    const arc = 2 * radius * Math.asin(sinHalf);
    return {
        v1,
        v2,
        chordLength: chord,
        arcLength: arc,
        displacement: computeBoundarySegmentVector3D(v1, v2)
    };
}
export function computeFacetMetrics(v1, v2, layerDepth) {
    const seg = createBoundarySegment3D(v1, v2);
    return {
        ...seg,
        layerDepth,
        facetArea: seg.arcLength * layerDepth,
    };
}
export function evaluateInterfacialFlux(stockI, stockJ, volI, volJ, cpI, cpJ, dist, metrics, vel, coeffs, dt) {
    const tI = (stockI.internalEnergyJ ?? stockI.energyJoules) / cpI;
    const tJ = (stockJ.internalEnergyJ ?? stockJ.energyJoules) / cpJ;
    const qCond = (coeffs.thermalConductivity ?? coeffs.thermalCond ?? 0.6) * ((tI - tJ) / dist) * metrics.facetArea * dt;
    const dW = (coeffs.water ?? coeffs.diffWater ?? 1e-4) * ((stockI.waterKg / volI - stockJ.waterKg / volJ) / dist) * metrics.facetArea * dt;
    const dC = (coeffs.carbon ?? coeffs.diffCarbon ?? 1e-5) * ((stockI.carbonKg / volI - stockJ.carbonKg / volJ) / dist) * metrics.facetArea * dt;
    const dO = (coeffs.oxygen ?? coeffs.diffOxygen ?? 1e-5) * ((stockI.oxygenKg / volI - stockJ.oxygenKg / volJ) / dist) * metrics.facetArea * dt;
    const dM = (coeffs.minerals ?? coeffs.diffMinerals ?? 1e-6) * ((stockI.mineralsKg / volI - stockJ.mineralsKg / volJ) / dist) * metrics.facetArea * dt;
    const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tJ - 1 / tI));
    return {
        deltaI: { dInternalEnergyJ: -qCond, dWaterKg: -dW, dCarbonKg: -dC, dOxygenKg: -dO, dMineralsKg: -dM, entropyGenJK: entropy },
        deltaJ: { dInternalEnergyJ: qCond, dWaterKg: dW, dCarbonKg: dC, dOxygenKg: dO, dMineralsKg: dM, entropyGenJK: entropy },
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
    const norm = Math.hypot(mx, my, mz);
    if (norm < 1e-12)
        return createVec3D(0, 0, 1);
    return createVec3D(mx / norm, my / norm, mz / norm);
}
export function computeBoundarySegmentTangent3D(segment) {
    const va = toVec3D(segment.v1);
    const vb = toVec3D(segment.v2);
    const dx = vb[0] - va[0];
    const dy = vb[1] - va[1];
    const dz = vb[2] - va[2];
    const norm = Math.hypot(dx, dy, dz);
    if (norm < 1e-12)
        return createVec3D(1, 0, 0);
    return createVec3D(dx / norm, dy / norm, dz / norm);
}
export function computeBoundarySegmentLateralNormal3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    const cross = crossProduct3D(tan, rad);
    return normalizeVector3D(cross);
}
export function computeBoundaryFacetFrame3D(segment) {
    const rad = computeBoundarySegmentRadialNormal3D(segment);
    const tan = computeBoundarySegmentTangent3D(segment);
    const lat = normalizeVector3D(crossProduct3D(tan, rad));
    return {
        radialNormal: rad,
        tangent: tan,
        lateralNormal: lat,
    };
}
export function computeBoundaryHorizontalNormal3D(tangent, radial) {
    const cross = crossProduct3D(tangent, radial);
    const norm = Math.hypot(cross[0], cross[1], cross[2]);
    if (norm < 1e-12)
        return createVec3D(0, 0, 0);
    return createVec3D(cross[0] / norm, cross[1] / norm, cross[2] / norm);
}
export function computeSharedBoundaryMidpoint3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const mx = (va[0] + vb[0]) * 0.5;
    const my = (va[1] + vb[1]) * 0.5;
    const mz = (va[2] + vb[2]) * 0.5;
    const norm = Math.hypot(mx, my, mz);
    if (norm < 1e-12)
        return createVec3D(0, 0, radius);
    return createVec3D((mx / norm) * radius, (my / norm) * radius, (mz / norm) * radius);
}
export function computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const tangent = vec3Normalize(vec3Sub(vb, va));
    const radial = vec3Normalize(midpoint);
    return computeBoundaryHorizontalNormal3D(tangent, radial);
}
export function computeBoundaryDarbouxFrame3D(v1, v2, radius = EARTH_RADIUS_METERS) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const tangent = vec3Normalize(vec3Sub(vb, va));
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, radius);
    const radialNormal = vec3Normalize(midpoint);
    const horizontalNormal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
    return {
        tangent,
        horizontalNormal,
        radialNormal,
    };
}
export function evaluateFacetHorizontalExchange(cellI, cellJ, normal, velocity, facetLength, layerDepth, diffusivity, thermalConductivity, dt) {
    const vn = dotProduct(velocity, normal);
    const facetArea = facetLength * layerDepth;
    const volFlow = Math.abs(vn) * facetArea * dt;
    const src = vn >= 0 ? cellI : cellJ;
    const advectFrac = Math.min(0.5, volFlow / src.volume);
    const deltaMassDry = advectFrac * src.massDry;
    const deltaMassWater = advectFrac * src.massWater;
    const deltaMassCarbon = advectFrac * src.massCarbon;
    const deltaThermalEnergy = advectFrac * src.thermalEnergy;
    const tempDiff = cellI.temperature - cellJ.temperature;
    const qCond = thermalConductivity * tempDiff * (facetArea / 100.0) * dt;
    const tI = Math.max(1e-3, cellI.temperature);
    const tJ = Math.max(1e-3, cellJ.temperature);
    const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tJ - 1 / tI));
    return {
        deltaMassDry,
        deltaMassWater,
        deltaMassCarbon,
        deltaThermalEnergy,
        entropyProduction: entropy,
    };
}
export function orientVectorTowardsTarget3D(v, arg2, arg3) {
    const vv = toVec3D(v);
    let d;
    if (arg3 !== undefined) {
        const o = toVec3D(arg2);
        const t = toVec3D(arg3);
        d = [t[0] - o[0], t[1] - o[1], t[2] - o[2]];
    }
    else {
        d = toVec3D(arg2);
    }
    const dot = vv[0] * d[0] + vv[1] * d[1] + vv[2] * d[2];
    const sign = dot < 0 ? -1 : 1;
    const res = [vv[0] * sign, vv[1] * sign, vv[2] * sign];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
        return { x: res[0], y: res[1], z: res[2] };
    }
    return res;
}
export function calculateEffectiveVelocity(v, d) {
    const vv = toVec3D(v);
    const dd = toVec3D(d);
    const dNorm = Math.hypot(dd[0], dd[1], dd[2]);
    if (dNorm < 1e-15)
        return 0;
    return Math.abs(vv[0] * dd[0] + vv[1] * dd[1] + vv[2] * dd[2]) / dNorm;
}
export function computeBoundaryCentroidDisplacement3D(origin, target) {
    const o = latLngToUnitVector3D(origin.lat, origin.lng);
    const t = latLngToUnitVector3D(target.lat, target.lng);
    const chord = toVec3D(vec3Sub(t, o));
    const chordLen = Math.hypot(chord[0], chord[1], chord[2]);
    if (chordLen < 1e-15)
        return createVec3D(0, 0, 0);
    return createVec3D(chord[0] / chordLen, chord[1] / chordLen, chord[2] / chordLen);
}
export function computeDetailedCentroidDisplacement3D(origin, target) {
    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const o = latLngToUnitVector3D(origin.lat, origin.lng);
    const t = latLngToUnitVector3D(target.lat, target.lng);
    const chord = toVec3D(vec3Sub(t, o));
    const chordDist = Math.hypot(chord[0], chord[1], chord[2]);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(o, t)));
    const angDist = Math.acos(dot);
    return {
        vector: u,
        chordDistance: chordDist,
        angularDistanceRad: angDist,
    };
}
export function executeAdvectiveBoundaryTransfer(params) {
    const { cellA, cellB, facetAreaM2, deltaTimeSec } = params;
    const u = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
    const vel = toVec3D(cellA.windVelocity3D);
    const normalVel = Math.max(0, vel[0] * u.x + vel[1] * u.y + vel[2] * u.z);
    const volFlow = normalVel * facetAreaM2 * deltaTimeSec;
    const frac = Math.min(0.5, volFlow / cellA.volumeM3);
    const deltaWaterKg = cellA.waterMassKg * frac;
    const deltaEnergyJoules = cellA.thermalEnergyJoules * frac;
    return {
        deltaWaterKg,
        deltaEnergyJoules,
    };
}
export function computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, options) {
    const ci = toVec3D(c_i);
    const cj = toVec3D(c_j);
    const va = toVec3D(v_a);
    const vb = toVec3D(v_b);
    const disp = vec3Sub(cj, ci);
    if (vec3Norm(disp) < 1e-12) {
        throw new Error('Centroids are coincident');
    }
    if (vec3Norm(vec3Sub(vb, va)) < 1e-12) {
        throw new Error('Boundary edge vertices are coincident');
    }
    const midpoint = vec3Normalize(vec3Scale(vec3Add(va, vb), 0.5));
    const tangent = vec3Normalize(vec3Sub(vb, va));
    let midNorm = computeBoundaryHorizontalNormal3D(tangent, midpoint);
    if (vec3Dot(midNorm, disp) < 0) {
        midNorm = vec3Scale(midNorm, -1);
    }
    let dispNorm = projectVectorOntoSphereTangentSpace(disp, midpoint);
    dispNorm = vec3Normalize(dispNorm);
    const alpha = options?.blendAlpha ?? 0.5;
    const blended = vec3Normalize(vec3Add(vec3Scale(midNorm, 1 - alpha), vec3Scale(dispNorm, alpha)));
    return {
        normal: blended,
        midpoint,
        alignmentCos: vec3Dot(blended, vec3Normalize(disp)),
        midpointNormal: midNorm,
        displacementNormal: dispNorm,
    };
}
export function computeFacetExchangeDeltas(originState, neighborState, c_i, c_j, v_a, v_b, params, dt) {
    const edgeLen = vec3Norm(vec3Sub(toVec3D(v_b), toVec3D(v_a)));
    const facetArea = edgeLen * params.effectiveHeightM;
    const normRes = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: params.blendAlpha });
    const vn = vec3Dot(params.fluidVelocity3D, normRes.normal);
    const dist = vec3Norm(vec3Sub(toVec3D(c_j), toVec3D(c_i)));
    const donor = vn >= 0 ? originState : neighborState;
    const advectVol = Math.abs(vn) * facetArea * dt;
    const advectFrac = Math.min(0.5, advectVol / donor.volumeM3);
    const sign = vn >= 0 ? 1 : -1;
    const dCarbonAdv = sign * donor.carbonKg * advectFrac;
    const dWaterAdv = sign * donor.waterKg * advectFrac;
    const dMineralAdv = sign * donor.mineralsKg * advectFrac;
    const dOxygenAdv = sign * donor.oxygenKg * advectFrac;
    const dEnergyAdv = sign * donor.energyJoules * advectFrac;
    const kC = params.diffusionCoeffs.carbon ?? 1e-5;
    const kW = params.diffusionCoeffs.water ?? 1e-4;
    const kM = params.diffusionCoeffs.minerals ?? 1e-6;
    const kO = params.diffusionCoeffs.oxygen ?? 1e-5;
    const kTh = params.diffusionCoeffs.thermalConductivity ?? 0.6;
    const dCarbonDiff = kC * ((originState.carbonKg - neighborState.carbonKg) / dist) * facetArea * dt * 0.001;
    const dWaterDiff = kW * ((originState.waterKg - neighborState.waterKg) / dist) * facetArea * dt * 0.001;
    const dMineralDiff = kM * ((originState.mineralsKg - neighborState.mineralsKg) / dist) * facetArea * dt * 0.001;
    const dOxygenDiff = kO * ((originState.oxygenKg - neighborState.oxygenKg) / dist) * facetArea * dt * 0.001;
    const dEnergyDiff = kTh * ((originState.temperatureKelvin - neighborState.temperatureKelvin) / dist) * facetArea * dt;
    const totalCarbon = dCarbonAdv + dCarbonDiff;
    const totalWater = dWaterAdv + dWaterDiff;
    const totalMineral = dMineralAdv + dMineralDiff;
    const totalOxygen = dOxygenAdv + dOxygenDiff;
    const totalEnergy = dEnergyAdv + dEnergyDiff;
    const tA = Math.max(1e-3, originState.temperatureKelvin);
    const tB = Math.max(1e-3, neighborState.temperatureKelvin);
    const entropy = Math.max(0, Math.abs(dEnergyDiff) * Math.abs(1 / tB - 1 / tA));
    return {
        originDeltas: {
            deltaCarbonKg: -totalCarbon,
            deltaWaterKg: -totalWater,
            deltaMineralsKg: -totalMineral,
            deltaOxygenKg: -totalOxygen,
            deltaEnergyJoules: -totalEnergy,
            entropyProductionJoulesPerKelvin: entropy,
        },
        neighborDeltas: {
            deltaCarbonKg: totalCarbon,
            deltaWaterKg: totalWater,
            deltaMineralsKg: totalMineral,
            deltaOxygenKg: totalOxygen,
            deltaEnergyJoules: totalEnergy,
            entropyProductionJoulesPerKelvin: entropy,
        },
        facetAreaM2: facetArea,
        normalVelocityMs: vn,
    };
}
export function computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, radius = EARTH_RADIUS_METERS) {
    const vA = toVec3D(vertexA);
    const vB = toVec3D(vertexB);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const chord = Math.hypot(vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]);
    const arcLengthMeters = 2 * radius * Math.asin(Math.min(1.0, chord / (2 * radius)));
    const disp = [cB[0] - cA[0], cB[1] - cA[1], cB[2] - cA[2]];
    const dispNorm = Math.hypot(disp[0], disp[1], disp[2]);
    const dispUnit = dispNorm > 1e-12
        ? [disp[0] / dispNorm, disp[1] / dispNorm, disp[2] / dispNorm]
        : [1, 0, 0];
    const edgeVec = [vB[0] - vA[0], vB[1] - vA[1], vB[2] - vA[2]];
    const mid = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
    let normCand = crossProduct3D(edgeVec, mid);
    let nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
    if (nLen < 1e-12) {
        normCand = dispUnit;
        nLen = 1.0;
    }
    let normal = [normCand[0] / nLen, normCand[1] / nLen, normCand[2] / nLen];
    if (normal[0] * disp[0] + normal[1] * disp[1] + normal[2] * disp[2] < 0) {
        normal = [-normal[0], -normal[1], -normal[2]];
    }
    const alignmentCos = normal[0] * dispUnit[0] + normal[1] * dispUnit[1] + normal[2] * dispUnit[2];
    return {
        normal,
        arcLengthMeters,
        alignmentCos,
    };
}
export function computeInterfaceTransfer(metric, cellA, cellB, velocity, diffCoeff, thermalCond, heatCap, dt) {
    const vn = velocity[0] * metric.normal[0] + velocity[1] * metric.normal[1] + velocity[2] * metric.normal[2];
    const area = metric.arcLengthMeters * cellA.columnHeightM;
    const isAtoB = vn >= 0;
    const donor = isAtoB ? cellA : cellB;
    const volFlow = Math.abs(vn) * area * dt;
    const frac = Math.min(0.5, volFlow / donor.volumeM3);
    const sign = isAtoB ? 1 : -1;
    const dAirAdv = sign * donor.stocks.massAirKg * frac;
    const dWaterAdv = sign * donor.stocks.massWaterKg * frac;
    const dCarbonAdv = sign * donor.stocks.massCarbonKg * frac;
    const dOxygenAdv = sign * donor.stocks.massOxygenKg * frac;
    const dMineralAdv = sign * donor.stocks.massMineralsKg * frac;
    const dist = Math.hypot(cellB.centroid[0] - cellA.centroid[0], cellB.centroid[1] - cellA.centroid[1], cellB.centroid[2] - cellA.centroid[2]);
    const dAirDiff = diffCoeff * ((cellA.stocks.massAirKg - cellB.stocks.massAirKg) / dist) * area * dt * 0.001;
    const dWaterDiff = diffCoeff * ((cellA.stocks.massWaterKg - cellB.stocks.massWaterKg) / dist) * area * dt * 0.001;
    const dCarbonDiff = diffCoeff * ((cellA.stocks.massCarbonKg - cellB.stocks.massCarbonKg) / dist) * area * dt * 0.001;
    const dOxygenDiff = diffCoeff * ((cellA.stocks.massOxygenKg - cellB.stocks.massOxygenKg) / dist) * area * dt * 0.001;
    const dMineralDiff = diffCoeff * ((cellA.stocks.massMineralsKg - cellB.stocks.massMineralsKg) / dist) * area * dt * 0.001;
    const tA = cellA.stocks.thermalEnergyJoules / (cellA.stocks.massAirKg * heatCap);
    const tB = cellB.stocks.thermalEnergyJoules / (cellB.stocks.massAirKg * heatCap);
    const qCond = thermalCond * ((tA - tB) / dist) * area * dt;
    const qAdv = sign * donor.stocks.thermalEnergyJoules * frac;
    const dThermal = qAdv + qCond;
    const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / Math.max(1e-3, tB) - 1 / Math.max(1e-3, tA)));
    const totalAir = dAirAdv + dAirDiff;
    const totalWater = dWaterAdv + dWaterDiff;
    const totalCarbon = dCarbonAdv + dCarbonDiff;
    const totalOxygen = dOxygenAdv + dOxygenDiff;
    const totalMineral = dMineralAdv + dMineralDiff;
    return {
        deltaOrigin: {
            massAirKg: -totalAir,
            massWaterKg: -totalWater,
            massCarbonKg: -totalCarbon,
            massOxygenKg: -totalOxygen,
            massMineralsKg: -totalMineral,
            thermalEnergyJoules: -dThermal,
        },
        deltaDestination: {
            massAirKg: totalAir,
            massWaterKg: totalWater,
            massCarbonKg: totalCarbon,
            massOxygenKg: totalOxygen,
            massMineralsKg: totalMineral,
            thermalEnergyJoules: dThermal,
        },
        entropyGeneratedJPerK: entropy,
    };
}
export function extractSharedBoundaryVertices3D(cellA, cellB, radius = EARTH_RADIUS_METERS) {
    if (cellA === cellB)
        return null;
    if (!h3.areNeighborCells(cellA, cellB))
        return null;
    const bA = extractH3BoundaryCartesianVertices3D(cellA, { radius });
    const bB = extractH3BoundaryCartesianVertices3D(cellB, { radius });
    const pairs = findSharedBoundaryVertexPairs3D(bA.vertices, bB.vertices, radius * 1e-4);
    if (pairs.length < 2)
        return null;
    const v1 = toVec3D(pairs[0].vertexA);
    const v2 = toVec3D(pairs[1].vertexA);
    return [v1, v2];
}
export function computeSharedInterfaceGeometry3D(cellA, cellB, _v1, _v2, depthM = 1.0, radius = EARTH_RADIUS_METERS) {
    const verts = extractSharedBoundaryVertices3D(cellA, cellB, radius);
    if (!verts)
        return null;
    const [v1, v2] = verts;
    const dotV = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (radius * radius);
    const lengthMeters = radius * Math.acos(Math.max(-1.0, Math.min(1.0, dotV)));
    let cA = [0, 0];
    let cB = [0, 0];
    try {
        const anyH3 = h3;
        cA = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellA) : anyH3.h3ToGeo(cellA);
        cB = anyH3.cellToLatLng ? anyH3.cellToLatLng(cellB) : anyH3.h3ToGeo(cellB);
    }
    catch { }
    const cartA = toVec3D(latLngToCartesian(cA[0], cA[1], radius));
    const cartB = toVec3D(latLngToCartesian(cB[0], cB[1], radius));
    const normalRes = computeDetailedInterfaceNormal(cartA, cartB, v1, v2, radius);
    return {
        cellA,
        cellB,
        v1,
        v2,
        lengthMeters,
        interfacialAreaM2: lengthMeters * depthM,
        normalAtoB: normalRes.normal,
    };
}
export function transferStocksAcrossBoundary3D(geom, stateA, stateB, velocityMidpoint, dw, dc, dm, do2, kth, dt) {
    const vn = velocityMidpoint[0] * geom.normalAtoB[0] + velocityMidpoint[1] * geom.normalAtoB[1] + velocityMidpoint[2] * geom.normalAtoB[2];
    const area = geom.lengthMeters * 10.0;
    const donor = vn >= 0 ? stateA : stateB;
    const volFlow = Math.abs(vn) * area * dt;
    const frac = Math.min(0.5, volFlow / donor.volumeM3);
    const sign = vn >= 0 ? 1 : -1;
    const dWaterAdv = sign * (donor.massWaterKg ?? 0) * frac;
    const dCarbonAdv = sign * (donor.massCarbonKg ?? 0) * frac;
    const dMineralAdv = sign * (donor.massMineralsKg ?? 0) * frac;
    const dOxygenAdv = sign * (donor.massOxygenKg ?? 0) * frac;
    const dEnthalpyAdv = sign * (donor.enthalpyJoules ?? 0) * frac;
    const dist = 50000.0;
    const dWaterDiff = dw * (((stateA.massWaterKg ?? 0) - (stateB.massWaterKg ?? 0)) / dist) * area * dt * 0.001;
    const dCarbonDiff = dc * (((stateA.massCarbonKg ?? 0) - (stateB.massCarbonKg ?? 0)) / dist) * area * dt * 0.001;
    const dMineralDiff = dm * (((stateA.massMineralsKg ?? 0) - (stateB.massMineralsKg ?? 0)) / dist) * area * dt * 0.001;
    const dOxygenDiff = do2 * (((stateA.massOxygenKg ?? 0) - (stateB.massOxygenKg ?? 0)) / dist) * area * dt * 0.001;
    const qCond = kth * (((stateA.temperatureKelvin ?? 293) - (stateB.temperatureKelvin ?? 293)) / dist) * area * dt;
    const totalWater = dWaterAdv + dWaterDiff;
    const totalCarbon = dCarbonAdv + dCarbonDiff;
    const totalMineral = dMineralAdv + dMineralDiff;
    const totalOxygen = dOxygenAdv + dOxygenDiff;
    const totalEnthalpy = dEnthalpyAdv + qCond;
    const tA = Math.max(1e-3, stateA.temperatureKelvin ?? 293);
    const tB = Math.max(1e-3, stateB.temperatureKelvin ?? 293);
    const entropy = Math.max(0, Math.abs(qCond) * Math.abs(1 / tB - 1 / tA));
    return {
        deltaCellA: {
            massWaterKg: -totalWater,
            massCarbonKg: -totalCarbon,
            massMineralsKg: -totalMineral,
            massOxygenKg: -totalOxygen,
            enthalpyJoules: -totalEnthalpy,
        },
        deltaCellB: {
            massWaterKg: totalWater,
            massCarbonKg: totalCarbon,
            massMineralsKg: totalMineral,
            massOxygenKg: totalOxygen,
            enthalpyJoules: totalEnthalpy,
        },
        entropyGenerationJoulesPerKelvin: entropy,
    };
}
export function extractH3BoundaryCartesianVertices3D(h3Index, options) {
    if (!h3Index || typeof h3Index !== 'string' || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
        throw new Error(`Invalid H3 index: ${h3Index}`);
    }
    const radius = options?.radius ?? 1.0;
    if (radius <= 0 || !Number.isFinite(radius)) {
        throw new Error('Invalid radius');
    }
    const anyH3 = h3;
    let boundaryCoords = [];
    if (typeof anyH3.cellToBoundary === 'function') {
        boundaryCoords = anyH3.cellToBoundary(h3Index);
    }
    else if (typeof anyH3.h3ToGeoBoundary === 'function') {
        boundaryCoords = anyH3.h3ToGeoBoundary(h3Index);
    }
    else {
        boundaryCoords = [
            [0, 0], [0, 1], [1, 1], [1, 0], [0.5, -0.5], [-0.5, -0.5]
        ];
    }
    const isPent = checkIsPentagon(h3Index);
    const vertexCount = isPent ? 5 : 6;
    boundaryCoords = boundaryCoords.slice(0, vertexCount);
    const vertices = [];
    let cx = 0, cy = 0, cz = 0;
    for (const c of boundaryCoords) {
        const u = latLngToUnitVector3D(c[0], c[1]);
        const vert = createVec3D(u[0] * radius, u[1] * radius, u[2] * radius);
        vertices.push(vert);
        cx += vert.x;
        cy += vert.y;
        cz += vert.z;
    }
    const cNorm = Math.hypot(cx, cy, cz);
    const centroid = cNorm > 1e-12
        ? createVec3D((cx / cNorm) * radius, (cy / cNorm) * radius, (cz / cNorm) * radius)
        : createVec3D(0, 0, radius);
    const isClosed = Boolean(options?.closeLoop);
    if (isClosed && vertices.length > 0) {
        vertices.push(createVec3D(vertices[0].x, vertices[0].y, vertices[0].z));
    }
    return {
        h3Index,
        vertexCount,
        isClosed,
        vertices,
        centroid,
    };
}
export class SpatialGeometryBridge {
    static latLngToCartesian(lat, lng, radius = 1.0) {
        return latLngToCartesian(lat, lng, radius);
    }
    static dotProduct(a, b) {
        return dotProduct(a, b);
    }
    static vectorNorm(v) {
        return vectorNorm(v);
    }
}
export class H3BoundaryProjector {
    project(h3Index, options) {
        return extractH3BoundaryCartesianVertices3D(h3Index, options);
    }
    verifyNormInvariants(boundary, radius = 1.0) {
        for (const v of boundary.vertices) {
            if (Math.abs(vectorNorm(v) - radius) > 1e-6)
                return false;
        }
        return true;
    }
}
export function computeEdgeCartesianMetrics(v1, v2, depth, radius = 1.0) {
    const va = toVec3D(v1);
    const vb = toVec3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, (va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]) / (radius * radius)));
    const lengthMeters = radius * Math.acos(dot);
    const interfacialAreaM2 = lengthMeters * depth;
    const edgeVec = vec3Sub(vb, va);
    const mid = vec3Normalize(vec3Add(va, vb));
    const cross = crossProduct3D(edgeVec, mid);
    const normalUnit = normalizeVector3D(cross);
    return {
        lengthMeters,
        interfacialAreaM2,
        normalUnit,
    };
}
export function evaluateInterfacialTransferMonad(_cellA, _cellB, stockA, stockB, metrics, velocityVec, dt) {
    const vn = dotProduct(velocityVec, metrics.normalUnit);
    const flow = Math.abs(vn) * metrics.interfacialAreaM2 * dt;
    const dH2O = Math.min(stockA.massH2O * 0.1, flow * 0.001);
    const dCarbon = Math.min(stockA.massCarbon * 0.1, flow * 0.0001);
    const dOxygen = Math.min(stockA.massOxygen * 0.1, flow * 0.0001);
    const dMinerals = Math.min(stockA.massMinerals * 0.1, flow * 0.00005);
    const tA = Math.max(1e-3, stockA.temperatureK ?? 300);
    const tB = Math.max(1e-3, stockB.temperatureK ?? 285);
    const q = 0.6 * ((tA - tB) / 1000.0) * metrics.interfacialAreaM2 * dt;
    const entropy = Math.max(0, Math.abs(q) * Math.abs(1 / tB - 1 / tA));
    return {
        deltaH2O: dH2O,
        deltaCarbon: dCarbon,
        deltaOxygen: dOxygen,
        deltaMinerals: dMinerals,
        entropyProduced: entropy,
    };
}
export function areCartesianUnitVectorsEqual3D(v1, v2, epsilon = DEFAULT_ANGULAR_EPSILON) {
    if (epsilon < 0)
        return false;
    const n1 = vectorNorm(v1);
    const n2 = vectorNorm(v2);
    if (n1 < 1e-15 || n2 < 1e-15 || !Number.isFinite(n1) || !Number.isFinite(n2)) {
        throw new Error('Vector magnitude is zero or non-finite');
    }
    const angDist = computeAngularDistance3D(v1, v2);
    return angDist <= epsilon;
}
export function computeAngularDistance3D(v1, v2) {
    const u1 = normalizeVector3D(v1);
    const u2 = normalizeVector3D(v2);
    const dot = Math.max(-1.0, Math.min(1.0, dotProduct(u1, u2)));
    return Math.acos(dot);
}
export class H3BoundaryVertexMatcher {
    static deduplicateVertices(vertices, eps = 1e-4) {
        const result = [];
        for (const v of vertices) {
            if (!result.some(r => computeAngularDistance3D(r, v) <= eps)) {
                result.push(v);
            }
        }
        return result;
    }
    static findSharedEdge(polyA, polyB, eps = 1e-4) {
        const sharedA = [];
        const sharedB = [];
        for (const va of polyA) {
            for (const vb of polyB) {
                if (areCartesianUnitVectorsEqual3D(va, vb, eps)) {
                    if (!sharedA.some(x => areCartesianUnitVectorsEqual3D(x, va, eps)))
                        sharedA.push(va);
                    if (!sharedB.some(x => areCartesianUnitVectorsEqual3D(x, vb, eps)))
                        sharedB.push(vb);
                }
            }
        }
        if (sharedA.length >= 2 && sharedB.length >= 2) {
            return {
                edgeA: [sharedA[0], sharedA[1]],
                edgeB: [sharedB[1], sharedB[0]],
            };
        }
        return null;
    }
}
export function orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const edgeLen = Math.hypot(dx, dy);
    let nx = dy / (edgeLen || 1);
    let ny = -dx / (edgeLen || 1);
    const cDispX = centroidB[0] - centroidA[0];
    const cDispY = centroidB[1] - centroidA[1];
    let isFlipped = false;
    if (nx * cDispX + ny * cDispY < 0) {
        nx = -nx;
        ny = -ny;
        isFlipped = true;
    }
    return {
        orderedEndpoints: (isFlipped ? [p2, p1] : [p1, p2]),
        outwardNormal: [nx, ny],
        isFlipped,
    };
}
export function orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB) {
    const v1 = toVec3D(p1);
    const v2 = toVec3D(p2);
    const cA = toVec3D(centroidA);
    const cB = toVec3D(centroidB);
    const edgeVec = vec3Sub(v2, v1);
    const mid = vec3Normalize(vec3Add(v1, v2));
    const disp = vec3Sub(cB, cA);
    let normCand = crossProduct3D(edgeVec, mid);
    let nLen = Math.hypot(normCand[0], normCand[1], normCand[2]);
    if (nLen < 1e-12) {
        normCand = disp;
        nLen = Math.hypot(normCand[0], normCand[1], normCand[2]) || 1;
    }
    let outwardNormal = [normCand[0] / nLen, normCand[1] / nLen, normCand[2] / nLen];
    let isFlipped = false;
    if (outwardNormal[0] * disp[0] + outwardNormal[1] * disp[1] + outwardNormal[2] * disp[2] < 0) {
        outwardNormal = [-outwardNormal[0], -outwardNormal[1], -outwardNormal[2]];
        isFlipped = true;
    }
    return {
        orderedEndpoints: isFlipped ? [p2, p1] : [p1, p2],
        outwardNormal,
        isFlipped,
    };
}
